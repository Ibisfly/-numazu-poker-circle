import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 会場運用のためのブラウザ API ラッパー。
 * どれも失敗しても致命的ではないので、非対応環境では黙って無効化する。
 */

// ── 効果音 ───────────────────────────────────────────────────────────────────
// モバイルは「ユーザー操作なしに音を鳴らせない」ため、最初のタップで AudioContext を作る。

let ctx: AudioContext | null = null

const audioCtx = (): AudioContext | null => {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    ctx = new Ctor()
    return ctx
  } catch (e) {
    console.error('AudioContext init failed:', e)
    return null
  }
}

/** 最初のユーザー操作でオーディオを解錠する。以降どこからでも鳴らせる */
export const unlockAudio = () => {
  const c = audioCtx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

const tone = (freq: number, startAt: number, durSec: number, peak: number) => {
  const c = audioCtx()
  if (!c) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  // 正弦波だけだと聞き取りづらいので三角波で倍音を少し乗せる
  osc.type = 'triangle'
  osc.frequency.value = freq
  const t = c.currentTime + startAt
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(peak, t + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durSec)
  osc.connect(gain).connect(c.destination)
  osc.start(t)
  osc.stop(t + durSec + 0.02)
}

/** 残り10秒からの秒読み */
export const beepTick = () => tone(880, 0, 0.09, 0.16)

/** レベルアップ。上がっていく3音 */
export const chimeLevelUp = () => {
  tone(659.25, 0, 0.34, 0.2)
  tone(830.61, 0.16, 0.34, 0.2)
  tone(1108.73, 0.32, 0.62, 0.22)
}

/** 休憩開始。落ち着いた下降2音 */
export const chimeBreak = () => {
  tone(587.33, 0, 0.5, 0.18)
  tone(392, 0.22, 0.8, 0.18)
}

/** 終了 */
export const chimeFinish = () => {
  tone(523.25, 0, 0.4, 0.2)
  tone(659.25, 0.18, 0.4, 0.2)
  tone(783.99, 0.36, 0.4, 0.2)
  tone(1046.5, 0.54, 0.9, 0.22)
}

// ── 画面スリープ防止 ────────────────────────────────────────────────────────

interface WakeLockSentinelLike { release: () => Promise<void> }

export const useWakeLock = (active: boolean) => {
  const ref = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> }
    }
    if (!active || !nav.wakeLock) return

    let cancelled = false
    const acquire = () => {
      nav.wakeLock!.request('screen')
        .then((s) => {
          if (cancelled) return s.release().catch(() => {})
          ref.current = s
        })
        .catch(() => {}) // タブが非表示だと必ず失敗する。無視して可視化時に再取得する
    }
    acquire()

    // タブに戻ってきたら取り直す（visibilitychange で自動解放されるため）
    const onVisible = () => { if (document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      ref.current?.release().catch(() => {})
      ref.current = null
    }
  }, [active])
}

// ── 全画面 ─────────────────────────────────────────────────────────────────

export const useFullscreen = () => {
  const [isFull, setIsFull] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggle = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
  }, [])

  return { isFull, toggle }
}

// ── 一定間隔の再描画 ────────────────────────────────────────────────────────

/** 表示のための tick。Firestore には書かない */
export const useTicker = (intervalMs = 200) => {
  const [, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((n) => n + 1), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
}

// ── クリップボード ──────────────────────────────────────────────────────────

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 非 HTTPS や古い Safari 向けのフォールバック
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}
