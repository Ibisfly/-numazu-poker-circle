import {
  doc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type {
  LiveTimer, LiveBracket, TimerLevel, LiveTheme, BracketEntrant, BracketMatch, BracketMode,
} from '@/types'
import {
  ensureAuthUid, generateControlKey, generateDocId, getServerTimeOffset, initControl, serverNow,
} from './access'
import { buildMatches, defaultWinsNeeded } from './bracket'

/**
 * ライブタイマー / トーナメント表の Firestore 操作。
 *
 * 秒単位のカウントダウンは書き込まない。「レベル終了時刻」だけを持たせ、
 * 各クライアントがローカルで残り時間を計算する（書き込みは状態変化時のみ）。
 */

// ── タイマー ─────────────────────────────────────────────────────────────────

export interface CreateTimerInput {
  title: string
  levels: TimerLevel[]
  startingStack: number
  entryCount: number
  prizeNote: string
  theme: LiveTheme
  matchId?: string
}

export const createLiveTimer = async (input: CreateTimerInput) => {
  const id = generateDocId()
  const key = generateControlKey()
  const uid = await initControl('liveTimers', id, key)

  const payload: Record<string, unknown> = {
    title: input.title,
    levels: input.levels,
    state: 'idle',
    levelIndex: 0,
    levelEndsAt: null,
    remainingMs: (input.levels[0]?.minutes ?? 0) * 60_000,
    entryCount: input.entryCount,
    remainingCount: input.entryCount,
    startingStack: input.startingStack,
    prizeNote: input.prizeNote,
    theme: input.theme,
    chimeEnabled: true,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (input.matchId) payload.matchId = input.matchId

  await setDoc(doc(db, 'liveTimers', id), payload)
  return { id, controlKey: key }
}

export const subscribeLiveTimer = (
  id: string,
  cb: (timer: LiveTimer | null) => void,
  onError?: (e: Error) => void
) =>
  onSnapshot(
    doc(db, 'liveTimers', id),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as LiveTimer) : null),
    (e) => {
      console.error('subscribeLiveTimer error:', e)
      onError?.(e)
    }
  )

const touch = () => ({ updatedAt: serverTimestamp() })

/** 開始 / 一時停止からの再開 */
export const startTimer = async (timer: LiveTimer) => {
  await getServerTimeOffset()
  const remaining = timer.remainingMs > 0
    ? timer.remainingMs
    : (timer.levels[timer.levelIndex]?.minutes ?? 0) * 60_000
  await updateDoc(doc(db, 'liveTimers', timer.id), {
    state: 'running',
    levelEndsAt: Timestamp.fromMillis(serverNow() + remaining),
    remainingMs: remaining,
    ...touch(),
  })
}

export const pauseTimer = async (timer: LiveTimer) => {
  await getServerTimeOffset()
  const remaining = timer.levelEndsAt
    ? Math.max(0, timer.levelEndsAt.toMillis() - serverNow())
    : timer.remainingMs
  await updateDoc(doc(db, 'liveTimers', timer.id), {
    state: 'paused',
    levelEndsAt: null,
    remainingMs: remaining,
    ...touch(),
  })
}

/**
 * レベル移動。走行中なら移動先のレベルを満タンから走らせ直す。
 * 自動レベルアップもこの関数を通す（どのクライアントが叩いても同じ結果になる）。
 */
export const gotoLevel = async (timer: LiveTimer, index: number, keepRunning?: boolean) => {
  const clamped = Math.max(0, Math.min(timer.levels.length - 1, index))
  const full = (timer.levels[clamped]?.minutes ?? 0) * 60_000
  const running = keepRunning ?? timer.state === 'running'
  if (running) await getServerTimeOffset()
  await updateDoc(doc(db, 'liveTimers', timer.id), {
    levelIndex: clamped,
    state: running ? 'running' : timer.state === 'finished' ? 'paused' : timer.state,
    levelEndsAt: running ? Timestamp.fromMillis(serverNow() + full) : null,
    remainingMs: full,
    ...touch(),
  })
}

/** 残り時間の ±調整（秒） */
export const adjustRemaining = async (timer: LiveTimer, deltaSec: number) => {
  await getServerTimeOffset()
  if (timer.state === 'running' && timer.levelEndsAt) {
    const next = Math.max(1000, timer.levelEndsAt.toMillis() + deltaSec * 1000 - serverNow())
    await updateDoc(doc(db, 'liveTimers', timer.id), {
      levelEndsAt: Timestamp.fromMillis(serverNow() + next),
      remainingMs: next,
      ...touch(),
    })
    return
  }
  await updateDoc(doc(db, 'liveTimers', timer.id), {
    remainingMs: Math.max(0, timer.remainingMs + deltaSec * 1000),
    ...touch(),
  })
}

/**
 * 終了させる。
 * ストラクチャーを走り切って終わる場合は、表示が途中のレベルで止まらないよう
 * 到達済みのレベル（levelIndex）を渡す。管理者が途中で打ち切る場合は省略する。
 */
export const finishTimer = async (timer: LiveTimer, levelIndex?: number) => {
  await updateDoc(doc(db, 'liveTimers', timer.id), {
    state: 'finished',
    levelEndsAt: null,
    remainingMs: 0,
    ...(levelIndex !== undefined ? { levelIndex } : {}),
    ...touch(),
  })
}

/** レベル1・未スタートに戻す */
export const resetTimer = async (timer: LiveTimer) => {
  await updateDoc(doc(db, 'liveTimers', timer.id), {
    state: 'idle',
    levelIndex: 0,
    levelEndsAt: null,
    remainingMs: (timer.levels[0]?.minutes ?? 0) * 60_000,
    ...touch(),
  })
}

export const updateTimerLevels = async (id: string, levels: TimerLevel[], remainingMs?: number) =>
  updateDoc(doc(db, 'liveTimers', id), {
    levels,
    ...(remainingMs !== undefined ? { remainingMs } : {}),
    ...touch(),
  })

export const updateTimerMeta = async (
  id: string,
  meta: Partial<Pick<LiveTimer, 'title' | 'entryCount' | 'remainingCount' | 'startingStack' | 'prizeNote' | 'theme' | 'chimeEnabled'>>
) => updateDoc(doc(db, 'liveTimers', id), { ...meta, ...touch() })

export const deleteLiveTimer = async (id: string) => deleteDoc(doc(db, 'liveTimers', id))

// ── トーナメント表 ───────────────────────────────────────────────────────────

export interface CreateBracketInput {
  title: string
  mode: BracketMode
  entrants: BracketEntrant[]
  winsNeeded?: number
  theme: LiveTheme
  matchId?: string
}

export const createLiveBracket = async (input: CreateBracketInput) => {
  const id = generateDocId()
  const key = generateControlKey()
  const uid = await initControl('liveBrackets', id, key)

  const payload: Record<string, unknown> = {
    title: input.title,
    mode: input.mode,
    winsNeeded: input.winsNeeded ?? defaultWinsNeeded(input.mode),
    entrants: input.entrants,
    matches: buildMatches(input.entrants),
    theme: input.theme,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
  if (input.matchId) payload.matchId = input.matchId

  await setDoc(doc(db, 'liveBrackets', id), payload)
  return { id, controlKey: key }
}

export const subscribeLiveBracket = (
  id: string,
  cb: (bracket: LiveBracket | null) => void,
  onError?: (e: Error) => void
) =>
  onSnapshot(
    doc(db, 'liveBrackets', id),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as LiveBracket) : null),
    (e) => {
      console.error('subscribeLiveBracket error:', e)
      onError?.(e)
    }
  )

export const updateBracketMatches = async (id: string, matches: BracketMatch[]) =>
  updateDoc(doc(db, 'liveBrackets', id), { matches, ...touch() })

/** 参加者の入れ替えは組み合わせを作り直す（進行済みの結果は失われる） */
export const rebuildBracket = async (id: string, entrants: BracketEntrant[]) =>
  updateDoc(doc(db, 'liveBrackets', id), {
    entrants,
    matches: buildMatches(entrants),
    ...touch(),
  })

export const updateBracketMeta = async (
  id: string,
  meta: Partial<Pick<LiveBracket, 'title' | 'winsNeeded' | 'theme'>>
) => updateDoc(doc(db, 'liveBrackets', id), { ...meta, ...touch() })

export const deleteLiveBracket = async (id: string) => deleteDoc(doc(db, 'liveBrackets', id))

/** 作成前に uid を用意しておくためのユーティリティ（作成画面のマウント時に呼ぶ） */
export const warmUpAuth = () => {
  ensureAuthUid().then(() => getServerTimeOffset())
}
