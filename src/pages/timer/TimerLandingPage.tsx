import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Timer, GitFork, ChevronRight, Trash2, Download, Upload, Layers, X,
} from '@/components/ui/Icons'
import { TimerShell, TimerTopBar, CopyField } from './shared'
import {
  loadPresets, deletePreset, seedBuiltInPresets, exportPresetCode, importPresetCode,
  loadRooms, deleteRoom, type StoredPreset, type StoredRoom,
} from '@/lib/liveTimer/presets'
import { controlUrl } from '@/lib/liveTimer/access'
import { formatDuration, totalMinutes } from '@/lib/liveTimer/structure'
import { warmUpAuth } from '@/lib/liveTimer/firestore'

export const TimerLandingPage = () => {
  const navigate = useNavigate()
  const [presets, setPresets] = useState<StoredPreset[]>([])
  const [rooms, setRooms] = useState<StoredRoom[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [importCode, setImportCode] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [exportTarget, setExportTarget] = useState<StoredPreset | null>(null)
  const [joinId, setJoinId] = useState('')

  useEffect(() => {
    seedBuiltInPresets()
    setPresets(loadPresets())
    setRooms(loadRooms())
    // 作成時に待たされないよう、匿名 uid と時刻補正を先に温めておく
    warmUpAuth()
  }, [])

  const handleImport = () => {
    setImportError(null)
    try {
      importPresetCode(importCode)
      setPresets(loadPresets())
      setImportCode('')
      setImportOpen(false)
    } catch (e: unknown) {
      console.error('preset import failed:', e)
      setImportError(e instanceof Error ? e.message : 'インポートに失敗しました')
    }
  }

  return (
    <TimerShell theme="ivory">
      <div className="tm-wrap">
        <TimerTopBar backTo={null} right={<Link to="/" className="tm-link-a">会員アプリ →</Link>} />

        {/* ── ヒーロー ── */}
        <header className="tm-sec tm-center">
          <p className="tm-eyebrow" style={{ animation: 'tm-rise 700ms cubic-bezier(.16,1,.3,1) backwards' }}>
            TOURNAMENT CLOCK &amp; BRACKET
          </p>
          <h1
            style={{
              fontFamily: "'Bodoni Moda', Georgia, serif",
              fontSize: 'clamp(38px, 9vw, 88px)',
              lineHeight: 1.02,
              letterSpacing: '0.01em',
              margin: '10px 0 6px',
              animation: 'tm-rise 700ms 80ms cubic-bezier(.16,1,.3,1) backwards',
            }}
          >
            ALL IN<br />
            <span style={{ fontStyle: 'italic', color: 'var(--bordeaux)' }}>CLOCK</span>
          </h1>
          <hr className="tm-rule" style={{ maxWidth: 220, margin: '18px auto' }} />
          <p className="tm-note" style={{ maxWidth: 430, margin: '0 auto', animation: 'tm-rise 700ms 160ms cubic-bezier(.16,1,.3,1) backwards' }}>
            ログイン不要。ストラクチャーを組んでリンクを配れば、
            全員が同じ残り時間を見られます。操作できるのはリンクを作った人だけ。
          </p>
        </header>

        {/* ── 作る ── */}
        <div className="tm-grid" data-cols="2" style={{ paddingBottom: 8 }}>
          <BigAction
            icon={<Timer size={22} />}
            label="TIMER"
            title="トーナメントタイマー"
            desc="ブラインド進行・休憩・残り人数を全員にライブ配信"
            onClick={() => navigate('/timer/new')}
            delay={0}
          />
          <BigAction
            icon={<GitFork size={22} />}
            label="BRACKET"
            title="トーナメント表"
            desc="ヘッズアップ・3on3 のシングルエリミネーション"
            onClick={() => navigate('/timer/new-bracket')}
            delay={70}
          />
        </div>

        {/* ── 自分が作った部屋 ── */}
        {rooms.length > 0 && (
          <section className="tm-sec">
            <SectionHead label="YOUR ROOMS" title="作成した部屋" note="この端末に操作キーが保存されています" />
            <div className="tm-stack">
              {rooms.map((r, i) => (
                <div key={`${r.kind}-${r.id}`} className="tm-card" style={{ animation: `tm-rise 500ms ${i * 50}ms cubic-bezier(.16,1,.3,1) backwards` }}>
                  <div className="tm-spread">
                    <div style={{ minWidth: 0 }}>
                      <span className="tm-chip">{r.kind === 'timer' ? 'TIMER' : 'BRACKET'}</span>
                      <p style={{ fontWeight: 700, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.title}
                      </p>
                      <p className="tm-note" style={{ fontSize: 10.5 }}>
                        {new Date(r.savedAt).toLocaleString('ja-JP')}
                      </p>
                    </div>
                    <div className="tm-row" style={{ flexWrap: 'nowrap' }}>
                      <Link
                        to={`/timer/${r.kind === 'timer' ? 't' : 'b'}/${r.id}`}
                        className="tm-btn tm-btn--sm"
                        style={{ textDecoration: 'none' }}
                      >
                        開く <ChevronRight size={13} />
                      </Link>
                      <button
                        type="button"
                        className="tm-btn tm-btn--sm tm-btn--ghost"
                        title="この端末の履歴から削除"
                        onClick={() => { deleteRoom(r.kind, r.id); setRooms(loadRooms()) }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <CopyField label="操作用リンク（自分だけが持つ）" value={controlUrl(r.kind, r.id, r.controlKey)} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── 見に行く ── */}
        <section className="tm-sec">
          <SectionHead label="JOIN" title="IDで見に行く" note="リンクが分からないときは部屋IDから" />
          <div className="tm-card">
            <div className="tm-row">
              <input
                className="tm-input"
                placeholder="部屋ID（例: 3f9a2b1c）"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.trim())}
                style={{ flex: '1 1 180px' }}
              />
              <button
                type="button"
                className="tm-btn"
                disabled={!joinId}
                onClick={() => navigate(`/timer/t/${joinId}`)}
              >
                タイマー
              </button>
              <button
                type="button"
                className="tm-btn"
                disabled={!joinId}
                onClick={() => navigate(`/timer/b/${joinId}`)}
              >
                表
              </button>
            </div>
          </div>
        </section>

        {/* ── プリセット ── */}
        <section className="tm-sec">
          <SectionHead
            label="PRESETS"
            title="ストラクチャー・プリセット"
            note="この端末に保存されます。コードで別端末へ移せます"
          />

          <div className="tm-stack">
            {presets.map((p, i) => (
              <div key={p.id} className="tm-card" style={{ animation: `tm-rise 480ms ${i * 40}ms cubic-bezier(.16,1,.3,1) backwards` }}>
                <div className="tm-spread">
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 700 }}>{p.name}</p>
                    <p className="tm-note" style={{ fontSize: 11 }}>
                      {p.levels.filter((l) => !l.isBreak).length} レベル ・ 所要 {formatDuration(totalMinutes(p.levels))}
                      ・ 初期 {p.startingStack.toLocaleString()}
                    </p>
                  </div>
                  <div className="tm-row" style={{ flexWrap: 'nowrap' }}>
                    <button
                      type="button"
                      className="tm-btn tm-btn--sm"
                      onClick={() => navigate('/timer/new', { state: { presetId: p.id } })}
                    >
                      これで作成
                    </button>
                    <button type="button" className="tm-btn tm-btn--sm tm-btn--ghost" title="コードを書き出す"
                      onClick={() => setExportTarget(p)}>
                      <Download size={13} />
                    </button>
                    <button type="button" className="tm-btn tm-btn--sm tm-btn--ghost" title="削除"
                      onClick={() => { deletePreset(p.id); setPresets(loadPresets()) }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                {exportTarget?.id === p.id && (
                  <div style={{ marginTop: 10 }}>
                    <CopyField label="このコードを別端末で読み込む" value={exportPresetCode(p)} />
                  </div>
                )}
              </div>
            ))}

            {!importOpen ? (
              <button type="button" className="tm-btn tm-btn--wide" onClick={() => setImportOpen(true)}>
                <Upload size={14} /> コードからインポート
              </button>
            ) : (
              <div className="tm-card tm-stack">
                <label className="tm-field">
                  <span>PRESET CODE</span>
                  <textarea
                    className="tm-input"
                    rows={3}
                    value={importCode}
                    onChange={(e) => setImportCode(e.target.value)}
                    placeholder="別端末で書き出したコードを貼り付け"
                    style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: 11 }}
                  />
                </label>
                {importError && <p className="tm-error">{importError}</p>}
                <div className="tm-row">
                  <button type="button" className="tm-btn tm-btn--gold" disabled={!importCode.trim()} onClick={handleImport}>
                    <Layers size={13} /> 取り込む
                  </button>
                  <button type="button" className="tm-btn tm-btn--ghost"
                    onClick={() => { setImportOpen(false); setImportError(null) }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="tm-sec tm-center">
          <hr className="tm-rule" style={{ maxWidth: 160, margin: '0 auto 14px' }} />
          <p className="tm-note" style={{ fontSize: 10.5, letterSpacing: '.2em' }}>
            NUMAZU POKER CIRCLE
          </p>
        </footer>
      </div>
    </TimerShell>
  )
}

// ── パーツ ───────────────────────────────────────────────────────────────────

const SectionHead = ({ label, title, note }: { label: string; title: string; note?: string }) => (
  <div style={{ marginBottom: 14 }}>
    <p className="tm-eyebrow">{label}</p>
    <h2 className="tm-h" style={{ margin: '4px 0 2px' }}>{title}</h2>
    {note && <p className="tm-note">{note}</p>}
    <hr className="tm-rule" style={{ marginTop: 12 }} />
  </div>
)

const BigAction = ({
  icon, label, title, desc, onClick, delay,
}: {
  icon: React.ReactNode
  label: string
  title: string
  desc: string
  onClick: () => void
  delay: number
}) => (
  <button
    type="button"
    onClick={onClick}
    className="tm-card tm-frame"
    style={{
      textAlign: 'left',
      cursor: 'pointer',
      display: 'grid',
      gap: 8,
      animation: `tm-rise 640ms ${delay}ms cubic-bezier(.16,1,.3,1) backwards`,
      transition: 'transform 180ms ease, border-color 180ms ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.borderColor = 'var(--bordeaux)' }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '' }}
  >
    <span className="tm-spread">
      <span style={{ color: 'var(--bordeaux)' }}>{icon}</span>
      <span className="tm-eyebrow">{label}</span>
    </span>
    <span style={{ fontFamily: "'Bodoni Moda', Georgia, serif", fontSize: 21, letterSpacing: '.02em' }}>{title}</span>
    <span className="tm-note">{desc}</span>
    <span className="tm-row" style={{ color: 'var(--bordeaux)', fontSize: 11, letterSpacing: '.18em', marginTop: 2 }}>
      作成する <ChevronRight size={13} />
    </span>
  </button>
)
