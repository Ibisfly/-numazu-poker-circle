import { signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import {
  doc, setDoc, deleteDoc, getDocFromServer, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'

/**
 * ライブタイマー / トーナメント表のアクセス制御。
 *
 * 設計意図：会員アカウントを持たない外部ディーラーにも使わせたいので Google 認証を要求しない。
 * 代わりに以下のモデルを取る。
 *   - 閲覧: 誰でも可（firestore.rules で read 公開）
 *   - 操作: 「操作キー」を知っている端末のみ
 *
 * 操作キーの検証はクライアントでは行わない。キーは読み取り禁止の secret/control に置き、
 * `admins/{uid}` を作成するときだけ firestore.rules 側の get() で照合する。
 * ルール内の get() はセキュリティルールを迂回して読めるため、キー本体は誰にも漏れない。
 */

export const CONTROL_KEY_PARAM = 'k'

/** URLに載せても読みにくくならない長さ・文字種でキーを作る */
export const generateControlKey = () => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 24)
}

export const generateDocId = () => {
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 10)
}

let authPromise: Promise<string | null> | null = null

/**
 * uid を確保する。既にログイン済み（会員／ゲスト）ならそのまま使い、
 * 未ログインなら匿名サインインする。画面上にログインUIは一切出さない。
 *
 * 呼ぶのは「部屋を作る」「操作キーで操作権を得る」ときだけ。
 * 単に閲覧するだけの人にアカウントを作らせないため、閲覧経路からは呼ばない
 * （会員アプリ側で匿名ユーザーは未登録ゲスト扱いになり、登録画面へ流れてしまう）。
 *
 * 匿名プロバイダが無効な場合は失敗するため、null を返して
 * 「閲覧はできるが操作はできない」状態に退避する。
 */
export const ensureAuthUid = (): Promise<string | null> => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser.uid)
  if (authPromise) return authPromise

  authPromise = new Promise<string | null>((resolve) => {
    // onAuthStateChanged の初回発火を待たずに signInAnonymously すると
    // 復元済みセッションを上書きしてしまうため、必ず初回発火を待つ
    const unsub = onAuthStateChanged(auth, async (u) => {
      unsub()
      if (u) return resolve(u.uid)
      try {
        const cred = await signInAnonymously(auth)
        resolve(cred.user.uid)
      } catch (e) {
        console.error('anonymous sign-in failed:', e)
        resolve(null)
      }
    })
  })
  return authPromise
}

// ── サーバー時刻オフセット ───────────────────────────────────────────────────
// 残り時間は「レベル終了時刻」からの逆算で表示するため、操作端末の時計がずれていると
// 全員の残り時間がずれる。操作する端末では1ページロードにつき1回だけ実測しておく。
//
// 閲覧専用の端末（未ログイン）では計測しない。アカウントを作らせないためであり、
// レベル終了時刻自体はサーバー時刻基準で保存されているので、
// 閲覧側は端末時計（実用上 NTP 同期済み）で十分な精度が出る。

let cachedOffset: number | null = null
let offsetPromise: Promise<number> | null = null

export const getServerTimeOffset = (): Promise<number> => {
  if (cachedOffset !== null) return Promise.resolve(cachedOffset)
  if (offsetPromise) return offsetPromise

  offsetPromise = (async () => {
    try {
      const uid = auth.currentUser?.uid
      if (!uid) return 0
      const ref = doc(db, 'clockPings', uid)
      const t0 = Date.now()
      await setDoc(ref, { t: serverTimestamp() })
      const snap = await getDocFromServer(ref)
      const t1 = Date.now()
      const server = snap.data()?.t?.toMillis?.()
      if (typeof server !== 'number') return 0
      // 往復時間の中点を「サーバー時刻を観測した瞬間のローカル時刻」とみなす
      cachedOffset = server - (t0 + t1) / 2
      return cachedOffset
    } catch (e) {
      console.error('clock sync failed, falling back to local clock:', e)
      cachedOffset = 0
      return 0
    } finally {
      offsetPromise = null
    }
  })()
  return offsetPromise
}

/** 補正済みの「今」 */
export const serverNow = () => Date.now() + (cachedOffset ?? 0)

// ── 操作権限 ─────────────────────────────────────────────────────────────────

export type LiveCollection = 'liveTimers' | 'liveBrackets'

/** セッション作成時に呼ぶ。secret → admins の順に書く必要がある（下の注記参照） */
export const initControl = async (coll: LiveCollection, id: string, key: string) => {
  const uid = await ensureAuthUid()
  if (!uid) throw new Error('端末の初期化に失敗しました。通信環境を確認してもう一度お試しください。')
  // writeBatch を使わないのは、admins の作成ルールが secret/control の存在を
  // get() で参照するため。バッチ内の書き込みはコミット前の状態で評価されるので順序が必要。
  await setDoc(doc(db, coll, id, 'secret', 'control'), { key })
  await setDoc(doc(db, coll, id, 'admins', uid), { controlKey: key, grantedAt: serverTimestamp() })
  return uid
}

/** 操作キー付きURLを踏んだときに呼ぶ。キーが正しければ以後この端末は操作可になる */
export const claimControl = async (coll: LiveCollection, id: string, key: string) => {
  const uid = await ensureAuthUid()
  if (!uid) throw new Error('端末の初期化に失敗しました。通信環境を確認してもう一度お試しください。')
  await setDoc(doc(db, coll, id, 'admins', uid), { controlKey: key, grantedAt: serverTimestamp() })
  return uid
}

export const releaseControl = async (coll: LiveCollection, id: string) => {
  const uid = auth.currentUser?.uid
  if (!uid) return
  await deleteDoc(doc(db, coll, id, 'admins', uid))
}

/**
 * この端末が操作権を持っているかを購読する。
 *
 * ここでは絶対にサインインを起こさない（閲覧者にアカウントを作らせない）。
 * 代わりに認証状態を監視し、claimControl で uid が生えたタイミングで購読を張り直す。
 */
export const subscribeControl = (
  coll: LiveCollection,
  id: string,
  cb: (canControl: boolean) => void
) => {
  let unsubDoc: (() => void) | null = null

  const unsubAuth = onAuthStateChanged(auth, (u) => {
    if (unsubDoc) {
      unsubDoc()
      unsubDoc = null
    }
    if (!u) return cb(false)
    unsubDoc = onSnapshot(
      doc(db, coll, id, 'admins', u.uid),
      (snap) => cb(snap.exists()),
      () => cb(false)
    )
  })

  return () => {
    unsubAuth()
    if (unsubDoc) unsubDoc()
  }
}

// ── URL 生成 ─────────────────────────────────────────────────────────────────

const origin = () => (typeof window === 'undefined' ? '' : window.location.origin)

export const viewerUrl = (kind: 'timer' | 'bracket', id: string) =>
  `${origin()}/timer/${kind === 'timer' ? 't' : 'b'}/${id}`

/** 操作キーはハッシュに載せる（サーバーログやリファラに残らない） */
export const controlUrl = (kind: 'timer' | 'bracket', id: string, key: string) =>
  `${viewerUrl(kind, id)}#${CONTROL_KEY_PARAM}=${key}`

/** URL ハッシュから操作キーを取り出す。取り出したらハッシュは即座に消す */
export const takeControlKeyFromHash = (): string | null => {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return null
  const key = new URLSearchParams(hash).get(CONTROL_KEY_PARAM)
  if (!key) return null
  // 画面共有やスクショで操作キーが漏れるのを防ぐ
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
  return key
}
