import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { LiveTheme, TimerLevel } from '@/types'
import { Timer, Save, ChevronRight, Check } from '@/components/ui/Icons'
import { TimerShell, TimerTopBar, ThemePicker, CopyField } from './shared'
import { NumField, StructureEditor } from './StructureEditor'
import { loadPresets, savePreset, saveRoom } from '@/lib/liveTimer/presets'
import { BUILT_IN_PRESETS, formatDuration, totalMinutes } from '@/lib/liveTimer/structure'
import { createLiveTimer, warmUpAuth } from '@/lib/liveTimer/firestore'
import { controlUrl, viewerUrl } from '@/lib/liveTimer/access'

export const TimerNewPage = () => {
  const navigate = useNavigate()
  const location = useLocation() as { state?: { presetId?: string } }
  const [params] = useSearchParams()

  // 会員アプリのマッチ管理から ?title=&entries=&matchId= で流し込める
  const initialTitle = params.get('title') ?? ''
  const matchId = params.get('matchId') ?? undefined

  const initial = useMemo(() => {
    const presetId = location.state?.presetId
    const preset = presetId ? loadPresets().find((p) => p.id === presetId) : undefined
    const fallback = BUILT_IN_PRESETS[0]
    return {
      levels: preset?.levels ?? fallback.levels,
      startingStack: preset?.startingStack ?? fallback.startingStack,
    }
  }, [location.state])

  const [title, setTitle] = useState(initialTitle || `${new Date().getMonth() + 1}/${new Date().getDate()} トーナメント`)
  const [levels, setLevels] = useState<TimerLevel[]>(initial.levels)
  const [startingStack, setStartingStack] = useState(initial.startingStack)
  const [entryCount, setEntryCount] = useState(Number(params.get('entries')) || 12)
  const [prizeNote, setPrizeNote] = useState('')
  const [theme, setTheme] = useState<LiveTheme>('felt')

  const [presetName, setPresetName] = useState('')
  const [presetSaved, setPresetSaved] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; controlKey: string } | null>(null)

  useEffect(() => { warmUpAuth() }, [])

  const handleCreate = async () => {
    if (!title.trim() || levels.length === 0) return
    setCreating(true)
    setError(null)
    try {
      const res = await createLiveTimer({
        title: title.trim(),
        levels,
        startingStack,
        entryCount,
        prizeNote: prizeNote.trim(),
        theme,
        matchId,
      })
      saveRoom({ kind: 'timer', id: res.id, title: title.trim(), controlKey: res.controlKey })
      setCreated(res)
    } catch (e: unknown) {
      console.error('createLiveTimer error:', e)
      setError(
        e instanceof Error
          ? `作成に失敗しました：${e.message}`
          : '作成に失敗しました。もう一度お試しください。'
      )
    } finally {
      setCreating(false)
    }
  }

  const handleSavePreset = () => {
    savePreset({ name: presetName.trim() || title.trim() || 'マイストラクチャー', startingStack, levels })
    setPresetSaved(true)
    window.setTimeout(() => setPresetSaved(false), 2200)
  }

  // ── 作成完了 ──────────────────────────────────────────────────────────────
  if (created) {
    return (
      <TimerShell theme="ivory">
        <div className="tm-wrap">
          <TimerTopBar />
          <div className="tm-sec tm-stack" style={{ maxWidth: 520, margin: '0 auto' }}>
            <div className="tm-center">
              <p className="tm-eyebrow">READY</p>
              <h1 className="tm-h" style={{ margin: '6px 0' }}>タイマーを作成しました</h1>
              <hr className="tm-rule" style={{ maxWidth: 180, margin: '14px auto' }} />
            </div>

            <div className="tm-card tm-frame tm-stack">
              <CopyField label="参加者に配るリンク（閲覧専用）" value={viewerUrl('timer', created.id)} />
              <p className="tm-note">残り時間・レベル・ブラインドが全員に同じように見えます。ログインは不要です。</p>
            </div>

            <div className="tm-card tm-stack" style={{ borderColor: 'var(--bordeaux)' }}>
              <CopyField label="操作用リンク（自分だけが持つ）" value={controlUrl('timer', created.id, created.controlKey)} />
              <p className="tm-note">
                <b>このリンクを渡した人も操作できます。</b>ディーラー交代時だけ共有してください。
                この端末には自動保存されているので、無くしても「作成した部屋」から開けます。
              </p>
            </div>

            <button
              type="button"
              className="tm-btn tm-btn--gold tm-btn--wide"
              onClick={() => navigate(`/timer/t/${created.id}`)}
            >
              タイマーを開く <ChevronRight size={15} />
            </button>
            <Link to="/timer" className="tm-btn tm-btn--ghost tm-btn--wide" style={{ textDecoration: 'none' }}>
              トップへ戻る
            </Link>
          </div>
        </div>
      </TimerShell>
    )
  }

  // ── 作成フォーム ──────────────────────────────────────────────────────────
  return (
    <TimerShell theme="ivory">
      <div className="tm-wrap">
        <TimerTopBar title="タイマーを作成" />

        <div className="tm-sec tm-stack" style={{ maxWidth: 720, margin: '0 auto' }}>
          <div className="tm-card tm-stack">
            <p className="tm-eyebrow">TOURNAMENT</p>
            <label className="tm-field">
              <span>タイトル</span>
              <input className="tm-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
            </label>
            <div className="tm-grid" data-cols="3">
              <NumField label="初期スタック" value={startingStack} min={100} step={1000}
                onChange={setStartingStack} />
              <NumField label="エントリー数" value={entryCount} min={0} onChange={setEntryCount} suffix="人" />
            </div>
            <label className="tm-field">
              <span>プライズ表記（任意）</span>
              <input className="tm-input" value={prizeNote} onChange={(e) => setPrizeNote(e.target.value)}
                placeholder="例: 1位 5,000🪶 / 2位 3,000🪶" maxLength={80} />
            </label>
            <label className="tm-field">
              <span>画面テーマ</span>
              <ThemePicker value={theme} onChange={setTheme} />
            </label>
          </div>

          <StructureEditor levels={levels} onChange={setLevels} />

          {/* プリセット保存 */}
          <div className="tm-card">
            <p className="tm-eyebrow" style={{ marginBottom: 8 }}>SAVE AS PRESET</p>
            <div className="tm-row">
              <input
                className="tm-input"
                placeholder="プリセット名（空ならタイトルを使用）"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                style={{ flex: '1 1 190px' }}
              />
              <button type="button" className="tm-btn" onClick={handleSavePreset} disabled={levels.length === 0}>
                {presetSaved ? <Check size={14} /> : <Save size={14} />}
                {presetSaved ? '保存しました' : 'この構成を保存'}
              </button>
            </div>
            <p className="tm-note" style={{ marginTop: 8 }}>
              保存先はこの端末です。次回は「これで作成」からすぐ呼び出せます。
            </p>
          </div>

          {error && <p className="tm-error">{error}</p>}

          <div className="tm-card" style={{ position: 'sticky', bottom: 12 }}>
            <div className="tm-spread" style={{ marginBottom: 10 }}>
              <p className="tm-note">
                {levels.filter((l) => !l.isBreak).length} レベル ／ 所要 {formatDuration(totalMinutes(levels))}
              </p>
              <p className="tm-note">{entryCount} 人エントリー</p>
            </div>
            <button
              type="button"
              className="tm-btn tm-btn--gold tm-btn--wide"
              disabled={creating || levels.length === 0 || !title.trim()}
              onClick={handleCreate}
            >
              <Timer size={15} /> {creating ? '作成中…' : 'タイマーを作成してリンクを発行'}
            </button>
          </div>
        </div>
      </div>
    </TimerShell>
  )
}
