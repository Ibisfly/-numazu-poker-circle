import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Copy, Check } from '@/components/ui/Icons'
import type { LiveTheme } from '@/types'
import { copyText, unlockAudio } from '@/lib/liveTimer/runtime'
import '@/styles/timer.css'

/** 画面全体のテーマ・フェーズを司るラッパー */
export const TimerShell = ({
  theme = 'felt',
  phase,
  focus = false,
  children,
}: {
  theme?: LiveTheme
  phase?: 'normal' | 'break' | 'urgent' | 'finished'
  focus?: boolean
  children: ReactNode
}) => {
  // どこを触っても音を解錠しておく（モバイルの自動再生制約対策）
  useEffect(() => {
    const handler = () => unlockAudio()
    window.addEventListener('pointerdown', handler, { once: true })
    return () => window.removeEventListener('pointerdown', handler)
  }, [])

  return (
    <div
      className="tm"
      data-tm-theme={theme}
      data-tm-phase={phase ?? 'normal'}
      data-tm-focus={focus ? 'true' : 'false'}
    >
      {children}
    </div>
  )
}

export const TimerTopBar = ({
  title,
  right,
  backTo = '/timer',
}: {
  title?: string
  right?: ReactNode
  backTo?: string | null
}) => (
  <div className="tm-bar tm-hide-on-focus">
    {backTo ? (
      <Link to={backTo} className="tm-mark" style={{ textDecoration: 'none' }}>
        NUMAZU
        <small>POKER CIRCLE</small>
      </Link>
    ) : (
      <span className="tm-mark">
        NUMAZU
        <small>POKER CIRCLE</small>
      </span>
    )}
    {title !== undefined && <h1 className="tm-title">{title}</h1>}
    <div className="tm-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
      {right}
    </div>
  </div>
)

/** URL・コードのコピー欄 */
export const CopyField = ({ value, label }: { value: string; label?: string }) => {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    const ok = await copyText(value)
    setCopied(ok)
    if (!ok) window.prompt('コピーできませんでした。手動でコピーしてください', value)
    if (ok) window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <label className="tm-field">
      {label && <span>{label}</span>}
      <span className="tm-copyfield">
        <code>{value}</code>
        <button type="button" onClick={onCopy} className="tm-btn tm-btn--sm" style={{ flex: '0 0 auto' }}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'コピー済' : 'コピー'}
        </button>
      </span>
    </label>
  )
}

export const ThemePicker = ({
  value,
  onChange,
}: {
  value: LiveTheme
  onChange: (t: LiveTheme) => void
}) => {
  const options: { key: LiveTheme; label: string; swatch: string }[] = [
    { key: 'felt', label: 'フェルト', swatch: 'linear-gradient(135deg,#106b53,#073a2d)' },
    { key: 'ivory', label: 'アイボリー', swatch: 'linear-gradient(135deg,#fffaf0,#efe4cd)' },
    { key: 'bordeaux', label: 'ボルドー', swatch: 'linear-gradient(135deg,#8d2745,#47101f)' },
  ]
  return (
    <div className="tm-row">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className="tm-btn tm-btn--sm"
          style={{
            borderColor: value === o.key ? 'var(--accent)' : undefined,
            opacity: value === o.key ? 1 : 0.62,
          }}
        >
          <i
            aria-hidden
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              display: 'inline-block',
              background: o.swatch,
              border: '1px solid rgba(255,255,255,.25)',
            }}
          />
          {o.label}
        </button>
      ))}
    </div>
  )
}

export const Loading = ({ label = '読み込み中' }: { label?: string }) => (
  <TimerShell>
    <div className="tm-wrap" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>
      <p className="tm-eyebrow" style={{ animation: 'tm-fade-breathe 1.8s ease-in-out infinite' }}>
        {label}
      </p>
    </div>
  </TimerShell>
)

export const NotFound = ({ message }: { message: string }) => (
  <TimerShell theme="ivory">
    <div className="tm-wrap">
      <TimerTopBar />
      <div className="tm-sec tm-center tm-stack" style={{ justifyItems: 'center' }}>
        <p className="tm-eyebrow">NOT FOUND</p>
        <h2 className="tm-h">{message}</h2>
        <Link to="/timer" className="tm-btn tm-btn--gold" style={{ textDecoration: 'none' }}>
          タイマーのトップへ
        </Link>
      </div>
    </div>
  </TimerShell>
)
