import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  linkWithPopup,
  linkWithRedirect,
  signOut,
  type UserCredential,
} from 'firebase/auth'
import { auth } from './config'

const googleProvider = new GoogleAuthProvider()

/**
 * ポップアップが使えない環境ではリダイレクト方式を使う。
 * iOS Safari はポップアップ制限が厳しく、ホーム画面から起動した PWA（standalone）では
 * window.open が別プロセスの Safari になるため認証結果が元の画面に戻ってこない。
 */
const needsRedirect = (): boolean => {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)  // iPadOS
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return isIOS || isStandalone
}

// ポップアップ自体が使えなかった場合だけリダイレクトへ切り替える
// （ユーザーが自分で閉じた場合は再試行しない）
const POPUP_FALLBACK_CODES = [
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]

const isPopupFallback = (e: unknown) =>
  POPUP_FALLBACK_CODES.includes((e as { code?: string }).code ?? '')

export const signInWithGoogle = async (): Promise<UserCredential | void> => {
  if (needsRedirect()) return signInWithRedirect(auth, googleProvider)
  try {
    return await signInWithPopup(auth, googleProvider)
  } catch (e) {
    if (isPopupFallback(e)) return signInWithRedirect(auth, googleProvider)
    throw e
  }
}

/** ゲスト（匿名）ログイン。Google アカウントを持たない人向け */
export const signInAsGuest = () => signInAnonymously(auth)

/**
 * ゲストアカウントを Google アカウントへ昇格する。
 * uid が変わらないため、ポイント・実績・戦績はそのまま引き継がれる。
 */
export const linkGoogleAccount = async (): Promise<UserCredential | void> => {
  const current = auth.currentUser
  if (!current) throw new Error('ログインしていません')
  if (needsRedirect()) return linkWithRedirect(current, googleProvider)
  try {
    return await linkWithPopup(current, googleProvider)
  } catch (e) {
    if (isPopupFallback(e)) return linkWithRedirect(current, googleProvider)
    throw e
  }
}

/** リダイレクトから戻ったときの結果を受け取る（エラー表示用） */
export const consumeRedirectResult = () => getRedirectResult(auth)

/** 認証エラーを日本語メッセージにする */
export const authErrorMessage = (e: unknown): string => {
  const code = (e as { code?: string }).code ?? ''
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''  // ユーザー操作によるキャンセルなので何も出さない
    case 'auth/operation-not-allowed':
      return 'この方法でのログインは現在利用できません。管理者にお問い合わせください。'
    case 'auth/credential-already-in-use':
    case 'auth/email-already-in-use':
      return 'この Google アカウントは既に別のアカウントで使われています。管理者にお問い合わせください。'
    case 'auth/network-request-failed':
      return '通信に失敗しました。電波状況を確認してもう一度お試しください。'
    case 'auth/unauthorized-domain':
      return 'このドメインからのログインが許可されていません。管理者にお問い合わせください。'
    default:
      return 'ログインに失敗しました。もう一度お試しください。'
  }
}

export const logOut = () => signOut(auth)
