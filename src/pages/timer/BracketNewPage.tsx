import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { BracketMode, LiveTheme } from '@/types'
import { GitFork, Plus, X, ChevronRight, Shuffle, Users } from '@/components/ui/Icons'
import { TimerShell, TimerTopBar, ThemePicker, CopyField } from './shared'
import { bracketSize, makeEntrant, roundCount } from '@/lib/liveTimer/bracket'
import { createLiveBracket, warmUpAuth } from '@/lib/liveTimer/firestore'
import { controlUrl, viewerUrl } from '@/lib/liveTimer/access'
import { saveRoom } from '@/lib/liveTimer/presets'

interface DraftEntrant {
  name: string
  members: string[]
}

const emptyDraft = (mode: BracketMode): DraftEntrant =>
  mode === 'team' ? { name: '', members: ['', '', ''] } : { name: '', members: [] }

export const BracketNewPage = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const matchId = params.get('matchId') ?? undefined

  const [mode, setMode] = useState<BracketMode>('headsup')
  const [title, setTitle] = useState(params.get('title') ?? 'ヘッズアップトーナメント')
  const [winsNeeded, setWinsNeeded] = useState(1)
  const [theme, setTheme] = useState<LiveTheme>('ivory')
  const [drafts, setDrafts] = useState<DraftEntrant[]>([
    emptyDraft('headsup'), emptyDraft('headsup'), emptyDraft('headsup'), emptyDraft('headsup'),
  ])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; controlKey: string } | null>(null)

  useEffect(() => { warmUpAuth() }, [])

  const switchMode = (next: BracketMode) => {
    setMode(next)
    setWinsNeeded(next === 'team' ? 2 : 1)
    setTitle(next === 'team' ? '3on3 チームトーナメント' : 'ヘッズアップトーナメント')
    // チーム戦は3枠の入力欄が必要なので、名前だけ引き継いで作り直す
    setDrafts((prev) => prev.map((d) => ({
      name: d.name,
      members: next === 'team' ? [d.members[0] ?? '', d.members[1] ?? '', d.members[2] ?? ''] : [],
    })))
  }

  const filled = drafts.filter((d) => d.name.trim())
  const size = bracketSize(Math.max(2, filled.length))
  const byes = size - filled.length

  const shuffle = () => {
    // Fisher-Yates。抽選でシードを決めたいときのため
    const next = [...drafts]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    setDrafts(next)
  }

  const handleCreate = async () => {
    if (filled.length < 2 || !title.trim()) return
    setCreating(true)
    setError(null)
    try {
      const entrants = filled.map((d, i) =>
        makeEntrant(d.name.trim(), i + 1, d.members.map((m) => m.trim()).filter(Boolean))
      )
      const res = await createLiveBracket({
        title: title.trim(), mode, entrants, winsNeeded, theme, matchId,
      })
      saveRoom({ kind: 'bracket', id: res.id, title: title.trim(), controlKey: res.controlKey })
      setCreated(res)
    } catch (e: unknown) {
      console.error('createLiveBracket error:', e)
      setError(e instanceof Error ? `作成に失敗しました：${e.message}` : '作成に失敗しました。もう一度お試しください。')
    } finally {
      setCreating(false)
    }
  }

  if (created) {
    return (
      <TimerShell theme="ivory">
        <div className="tm-wrap">
          <TimerTopBar />
          <div className="tm-sec tm-stack" style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="tm-center">
              <p className="tm-eyebrow">READY</p>
              <h1 className="tm-h" style={{ margin: '6px 0' }}>トーナメント表を作成しました</h1>
              <hr className="tm-rule" style={{ maxWidth: 180, margin: '14px auto' }} />
            </div>
            <div className="tm-card tm-frame tm-stack">
              <CopyField label="参加者に配るリンク（閲覧専用）" value={viewerUrl('bracket', created.id)} />
              <p className="tm-note">勝ち上がりがリアルタイムで反映されます。</p>
            </div>
            <div className="tm-card tm-stack" style={{ borderColor: 'var(--bordeaux)' }}>
              <CopyField label="操作用リンク（勝者を入力できる）" value={controlUrl('bracket', created.id, created.controlKey)} />
            </div>
            <button className="tm-btn tm-btn--gold tm-btn--wide" onClick={() => navigate(`/timer/b/${created.id}`)}>
              トーナメント表を開く <ChevronRight size={15} />
            </button>
            <Link to="/timer" className="tm-btn tm-btn--ghost tm-btn--wide" style={{ textDecoration: 'none' }}>
              トップへ戻る
            </Link>
          </div>
        </div>
      </TimerShell>
    )
  }

  return (
    <TimerShell theme="ivory">
      <div className="tm-wrap">
        <TimerTopBar title="トーナメント表を作成" />

        <div className="tm-sec tm-stack" style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* 形式 */}
          <div className="tm-card tm-stack">
            <p className="tm-eyebrow">FORMAT</p>
            <div className="tm-grid" data-cols="2">
              <ModeCard
                active={mode === 'headsup'}
                onClick={() => switchMode('headsup')}
                title="ヘッズアップ"
                desc="個人 1on1 の勝ち抜き"
                icon={<GitFork size={18} />}
              />
              <ModeCard
                active={mode === 'team'}
                onClick={() => switchMode('team')}
                title="3on3 / タッグ"
                desc="チーム対抗の勝ち抜き"
                icon={<Users size={18} />}
              />
            </div>
            <label className="tm-field">
              <span>タイトル</span>
              <input className="tm-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
            </label>
            <label className="tm-field">
              <span>1試合の先取数</span>
              <select className="tm-select" value={winsNeeded} onChange={(e) => setWinsNeeded(Number(e.target.value))}>
                <option value={1}>1本勝負（勝者をタップ）</option>
                <option value={2}>2本先取（3試合まで）</option>
                <option value={3}>3本先取（5試合まで）</option>
              </select>
            </label>
            <label className="tm-field">
              <span>画面テーマ</span>
              <ThemePicker value={theme} onChange={setTheme} />
            </label>
          </div>

          {/* 参加者 */}
          <div className="tm-card tm-stack">
            <div className="tm-spread">
              <div>
                <p className="tm-eyebrow">ENTRANTS</p>
                <p className="tm-note" style={{ marginTop: 4 }}>
                  {filled.length} {mode === 'team' ? 'チーム' : '名'} ／ {size}人枠
                  {byes > 0 && ` ・ 不戦勝 ${byes}`} ・ {roundCount(Math.max(2, filled.length))} 回戦
                </p>
              </div>
              <button type="button" className="tm-btn tm-btn--sm tm-btn--ghost" onClick={shuffle}>
                <Shuffle size={13} /> 抽選
              </button>
            </div>

            <div className="tm-stack" style={{ gap: 8 }}>
              {drafts.map((d, i) => (
                <div key={i} style={{ animation: `tm-rise 400ms ${i * 30}ms cubic-bezier(.16,1,.3,1) backwards` }}>
                  <div className="tm-row" style={{ flexWrap: 'nowrap' }}>
                    <span style={{
                      fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: 12,
                      color: 'var(--fg-faint)', width: 22, textAlign: 'center', flex: '0 0 22px',
                    }}>
                      {i + 1}
                    </span>
                    <input
                      className="tm-input"
                      placeholder={mode === 'team' ? `チーム名 ${i + 1}` : `プレイヤー名 ${i + 1}`}
                      value={d.name}
                      onChange={(e) => setDrafts(drafts.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x))}
                      maxLength={24}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="tm-btn tm-btn--sm tm-btn--ghost"
                      onClick={() => setDrafts(drafts.filter((_, idx) => idx !== i))}
                      disabled={drafts.length <= 2}
                      style={{ flex: '0 0 auto' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                  {mode === 'team' && (
                    <div className="tm-row" style={{ gap: 6, marginTop: 5, paddingLeft: 30 }}>
                      {d.members.map((m, mi) => (
                        <input
                          key={mi}
                          className="tm-input"
                          placeholder={`メンバー${mi + 1}`}
                          value={m}
                          maxLength={16}
                          onChange={(e) => setDrafts(drafts.map((x, idx) =>
                            idx === i ? { ...x, members: x.members.map((y, yi) => yi === mi ? e.target.value : y) } : x
                          ))}
                          style={{ flex: '1 1 90px', fontSize: 12, padding: '6px 8px' }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button type="button" className="tm-btn tm-btn--wide"
              onClick={() => setDrafts([...drafts, emptyDraft(mode)])} disabled={drafts.length >= 32}>
              <Plus size={14} /> {mode === 'team' ? 'チーム' : 'プレイヤー'}を追加
            </button>
          </div>

          {error && <p className="tm-error">{error}</p>}

          <button
            className="tm-btn tm-btn--gold tm-btn--wide"
            disabled={creating || filled.length < 2 || !title.trim()}
            onClick={handleCreate}
          >
            <GitFork size={15} /> {creating ? '作成中…' : '表を作成してリンクを発行'}
          </button>
          {filled.length < 2 && <p className="tm-note tm-center">2組以上の名前を入れてください</p>}
        </div>
      </div>
    </TimerShell>
  )
}

const ModeCard = ({
  active, onClick, title, desc, icon,
}: {
  active: boolean
  onClick: () => void
  title: string
  desc: string
  icon: React.ReactNode
}) => (
  <button
    type="button"
    onClick={onClick}
    className="tm-btn"
    style={{
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 4,
      padding: '14px 15px',
      borderColor: active ? 'var(--bordeaux)' : undefined,
      background: active ? 'var(--surface-2)' : undefined,
      opacity: active ? 1 : 0.66,
      textAlign: 'left',
    }}
  >
    <span style={{ color: 'var(--bordeaux)' }}>{icon}</span>
    <span style={{ fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: 16, letterSpacing: '.02em' }}>{title}</span>
    <span style={{ fontSize: 10.5, color: 'var(--fg-faint)', letterSpacing: '.04em', fontWeight: 400 }}>{desc}</span>
  </button>
)
