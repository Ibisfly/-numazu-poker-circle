import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { LiveTimer, LiveTheme, TimerLevel } from '@/types'
import {
  Play, Pause, SkipForward, SkipBack, Maximize2, Minimize2, Settings, X,
  Volume2, VolumeX, RotateCcw, Check, Users, Coffee, Minus, Plus, MonitorPlay, Trash2,
} from '@/components/ui/Icons'
import { TimerShell, TimerTopBar, CopyField, Loading, NotFound, ThemePicker } from './shared'
import { StructureEditor } from './StructureEditor'
import {
  adjustRemaining, deleteLiveTimer, finishTimer, gotoLevel, pauseTimer, resetTimer,
  startTimer, subscribeLiveTimer, updateTimerLevels, updateTimerMeta,
} from '@/lib/liveTimer/firestore'
import {
  claimControl, controlUrl, getServerTimeOffset, serverNow, subscribeControl,
  takeControlKeyFromHash, viewerUrl,
} from '@/lib/liveTimer/access'
import {
  averageBB, averageStack, formatClock, formatDuration, minutesUntilLevel,
  nextPlayLevel, playLevelNumber, projectRunning, totalMinutes,
} from '@/lib/liveTimer/structure'
import {
  beepTick, chimeBreak, chimeFinish, chimeLevelUp, useFullscreen, useTicker, useWakeLock,
} from '@/lib/liveTimer/runtime'
import { findRoom, saveRoom } from '@/lib/liveTimer/presets'

const RING_R = 92
const RING_C = 2 * Math.PI * RING_R

export const TimerLivePage = () => {
  const { id = '' } = useParams()
  const [timer, setTimer] = useState<LiveTimer | null>(null)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [canControl, setCanControl] = useState(false)
  const [clockReady, setClockReady] = useState(false)
  const [panel, setPanel] = useState<'none' | 'settings' | 'structure' | 'share'>('none')
  const [focusMode, setFocusMode] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [announce, setAnnounce] = useState<TimerLevel | null>(null)
  const [pendingKey, setPendingKey] = useState<string | null>(null)

  const { isFull, toggle: toggleFullscreen } = useFullscreen()
  useTicker(200)
  useWakeLock(timer?.state === 'running')

  // ── 操作キーの受け取り ──────────────────────────────────────────────────
  // URL ハッシュのキーは読み取り直後に消える（画面共有での漏洩防止）ため、
  // ここで localStorage に退避しておく。以後この端末は操作用リンクなしで操作できる。
  useEffect(() => {
    if (!id) return
    const fromHash = takeControlKeyFromHash()
    const key = fromHash ?? findRoom('timer', id)?.controlKey
    if (!key) {
      // 閲覧のみ。匿名アカウントを作らずローカル時計で表示する
      setClockReady(true)
      return
    }
    claimControl('liveTimers', id, key)
      .then(() => {
        if (fromHash) setPendingKey(fromHash)
        // 操作端末では時計ズレを実測する（レベル終了時刻を書き込む側なので精度が要る）
        return getServerTimeOffset()
      })
      .catch((e) => {
        console.error('claimControl failed:', e)
        setActionError('操作キーが無効です。閲覧のみ可能です。')
      })
      .finally(() => setClockReady(true))
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeLiveTimer(
      id,
      (t) => {
        if (!t) return setMissing(true)
        setTimer(t)
      },
      (e) => setLoadError(e.message)
    )
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeControl('liveTimers', id, setCanControl)
  }, [id])

  // 操作権を得た端末では、あとで操作用リンクなしで戻れるように部屋を記録しておく
  useEffect(() => {
    if (pendingKey && timer) {
      saveRoom({ kind: 'timer', id: timer.id, title: timer.title, controlKey: pendingKey })
      setPendingKey(null)
    }
  }, [pendingKey, timer])

  // ── 進行の投影 ──────────────────────────────────────────────────────────
  // useTicker で 200ms ごとに再描画されるため、毎レンダーで素直に計算する。
  // clockReady は「時刻補正が入った直後にも計算し直される」ことを保証するための参照。
  void clockReady
  const projected = timer
    ? timer.state === 'running' && timer.levelEndsAt
      ? projectRunning(timer.levels, timer.levelIndex, timer.levelEndsAt.toMillis(), serverNow())
      : {
          index: timer.levelIndex,
          remainingMs: timer.state === 'finished' ? 0 : timer.remainingMs,
          advanced: false,
          ended: timer.state === 'finished',
        }
    : null

  // ── レベル自動送り（操作端末のみが書き込む）────────────────────────────
  const advancing = useRef(false)
  useEffect(() => {
    if (!timer || !projected || !canControl || advancing.current) return
    if (timer.state !== 'running') return

    if (projected.ended) {
      advancing.current = true
      // 走り切った場合は到達レベル（最終レベル）で止める
      finishTimer(timer, projected.index).finally(() => { advancing.current = false })
      return
    }
    if (projected.index !== timer.levelIndex) {
      advancing.current = true
      // 投影した残り時間をそのまま採用し、端末間で表示がずれないようにする
      gotoLevel(timer, projected.index, true).finally(() => { advancing.current = false })
    }
  }, [timer, projected, canControl])

  // ── 音とレベルアップ告知 ────────────────────────────────────────────────
  const prevIndex = useRef<number | null>(null)
  const prevSecond = useRef<number>(-1)

  const level = timer?.levels[projected?.index ?? 0]
  const remainingMs = projected?.remainingMs ?? 0

  useEffect(() => {
    if (!timer || !level || !projected) return
    const idx = projected.index
    const changed = prevIndex.current !== null && prevIndex.current !== idx
    prevIndex.current = idx
    if (!changed) return

    if (timer.chimeEnabled) (level.isBreak ? chimeBreak : chimeLevelUp)()
    setAnnounce(level)
    const timeoutId = window.setTimeout(() => setAnnounce(null), 4200)
    return () => window.clearTimeout(timeoutId)
    // レベルが変わった瞬間だけ発火させたいので index を主依存にしている
  }, [projected?.index, timer?.chimeEnabled])

  useEffect(() => {
    if (!timer?.chimeEnabled || timer.state !== 'running' || !level || level.isBreak) return
    const sec = Math.ceil(remainingMs / 1000)
    if (sec === prevSecond.current) return
    prevSecond.current = sec
    if (sec > 0 && sec <= 10) beepTick()
  }, [remainingMs, timer?.chimeEnabled, timer?.state, level])

  useEffect(() => {
    if (timer?.state === 'finished' && timer.chimeEnabled) chimeFinish()
  }, [timer?.state])

  // ── 操作 ────────────────────────────────────────────────────────────────
  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await fn()
    } catch (e: unknown) {
      console.error('timer control error:', e)
      setActionError(
        e instanceof Error && e.message.includes('permission')
          ? '操作権限がありません。操作用リンクから開いてください。'
          : '操作に失敗しました。通信環境を確認してもう一度お試しください。'
      )
    }
  }, [])

  if (missing) return <NotFound message="このタイマーは見つかりませんでした" />
  if (loadError) return <NotFound message="タイマーを読み込めませんでした" />
  if (!timer || !level || !projected) return <Loading label="タイマーを読み込み中" />

  // ── 表示値 ──────────────────────────────────────────────────────────────
  const fullMs = level.minutes * 60_000
  const progress = fullMs > 0 ? Math.max(0, Math.min(1, remainingMs / fullMs)) : 0
  const seconds = Math.ceil(remainingMs / 1000)
  const isUrgent = timer.state === 'running' && !level.isBreak && seconds <= 60
  const phase = timer.state === 'finished' ? 'finished' : level.isBreak ? 'break' : isUrgent ? 'urgent' : 'normal'

  const next = nextPlayLevel(timer.levels, projected.index)
  const avg = averageStack(timer.startingStack, timer.entryCount, timer.remainingCount)
  const nextBreakIn = timer.levels.findIndex((l, i) => i > projected.index && l.isBreak)

  return (
    <TimerShell theme={timer.theme} phase={phase} focus={focusMode || isFull}>
      {announce && <AnnounceOverlay level={announce} levels={timer.levels} index={projected.index} />}

      <div className="tm-wrap">
        <TimerTopBar
          title={timer.title}
          right={
            <>
              {!canControl && (
                <span className="tm-chip" data-live={timer.state === 'running' ? 'true' : undefined}>
                  {timer.state === 'running' && <b />}
                  {timer.state === 'running' ? 'LIVE' : timer.state === 'paused' ? 'PAUSED' : timer.state === 'finished' ? 'FINISHED' : 'READY'}
                </span>
              )}
              <button className="tm-btn tm-btn--icon tm-btn--ghost" title="全画面" onClick={toggleFullscreen}>
                {isFull ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button
                className="tm-btn tm-btn--icon tm-btn--ghost"
                title="モニタ表示（情報を隠す）"
                onClick={() => setFocusMode((v) => !v)}
              >
                <MonitorPlay size={15} />
              </button>
              {canControl && (
                <button
                  className="tm-btn tm-btn--icon tm-btn--ghost"
                  title="設定"
                  onClick={() => setPanel((p) => (p === 'settings' ? 'none' : 'settings'))}
                >
                  {panel === 'settings' ? <X size={15} /> : <Settings size={15} />}
                </button>
              )}
            </>
          }
        />

        {/* 全体進行レール */}
        <div className="tm-rail" aria-hidden>
          {timer.levels.map((l, i) => (
            <i
              key={i}
              data-done={i < projected.index ? 'true' : 'false'}
              data-now={i === projected.index ? 'true' : 'false'}
              data-break={l.isBreak && i !== projected.index ? 'true' : 'false'}
            />
          ))}
        </div>

        {/* ── 時計 ── */}
        <div className="tm-stage">
          <div className="tm-dial">
            <div className="tm-dial-sheen" aria-hidden />
            <svg viewBox="0 0 200 200" aria-hidden>
              <circle className="tm-dial-track" cx="100" cy="100" r={RING_R} />
              <circle
                className="tm-dial-arc"
                cx="100" cy="100" r={RING_R}
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - progress)}
              />
            </svg>
            <div className="tm-center" style={{ position: 'relative' }}>
              <p className="tm-level-tag">
                {level.isBreak ? 'BREAK' : `LEVEL ${playLevelNumber(timer.levels, projected.index)}`}
              </p>
              <p className="tm-clock" data-paused={timer.state === 'paused' ? 'true' : 'false'}>
                {timer.state === 'finished' ? '00:00' : formatClock(remainingMs)}
              </p>
              {timer.state === 'idle' && <p className="tm-eyebrow" style={{ marginTop: 6 }}>NOT STARTED</p>}
              {timer.state === 'paused' && <p className="tm-eyebrow" style={{ marginTop: 6 }}>PAUSED</p>}
              {timer.state === 'finished' && <p className="tm-eyebrow" style={{ marginTop: 6 }}>FINISHED</p>}
            </div>
          </div>
        </div>

        {/* ── ブラインド ── */}
        <div className="tm-center">
          {level.isBreak ? (
            <>
              <p className="tm-break-word">Break</p>
              {level.note && <p className="tm-note" style={{ marginTop: 6, fontSize: 13 }}>{level.note}</p>}
            </>
          ) : (
            <>
              <div className="tm-blinds">
                <span>{level.sb.toLocaleString()}</span>
                <span className="sep">/</span>
                <span>{level.bb.toLocaleString()}</span>
                {level.ante > 0 && (
                  <span className="ante"><em>ANTE</em> {level.ante.toLocaleString()}</span>
                )}
              </div>
              <div className="tm-next">
                {next ? (
                  <span>
                    NEXT&nbsp;&nbsp;<b>{next.sb.toLocaleString()} / {next.bb.toLocaleString()}</b>
                    {next.ante > 0 && <> (ante <b>{next.ante.toLocaleString()}</b>)</>}
                  </span>
                ) : (
                  <span>最終レベル</span>
                )}
                {nextBreakIn > 0 && (
                  <span>
                    <Coffee size={11} style={{ verticalAlign: -1, marginRight: 4 }} />
                    休憩まで <b>{minutesUntilLevel(timer.levels, nextBreakIn) - minutesUntilLevel(timer.levels, projected.index)}</b> 分
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── スタット ── */}
        <dl className="tm-stats tm-hide-on-focus">
          <div className="tm-stat">
            <dt>Players</dt>
            <dd>{timer.remainingCount}<s>/{timer.entryCount}</s></dd>
          </div>
          <div className="tm-stat">
            <dt>Avg Stack</dt>
            <dd>{avg >= 10000 ? `${Math.round(avg / 1000)}k` : avg.toLocaleString()}</dd>
          </div>
          <div className="tm-stat">
            <dt>Avg BB</dt>
            <dd>{level.isBreak ? '—' : averageBB(avg, level.bb)}<s>bb</s></dd>
          </div>
          <div className="tm-stat">
            <dt>Elapsed</dt>
            <dd style={{ fontSize: 18 }}>
              {formatDuration(minutesUntilLevel(timer.levels, projected.index))}
              <s>/{formatDuration(totalMinutes(timer.levels))}</s>
            </dd>
          </div>
        </dl>

        {timer.prizeNote && (
          <p className="tm-note tm-center tm-hide-on-focus" style={{ marginTop: 12, letterSpacing: '.06em' }}>
            {timer.prizeNote}
          </p>
        )}

        {actionError && (
          <p className="tm-error tm-hide-on-focus" style={{ marginTop: 14 }}>{actionError}</p>
        )}

        {/* ── 操作 ── */}
        {canControl ? (
          <div className="tm-hide-on-focus">
            <div className="tm-controls">
              <button
                className="tm-btn tm-btn--sm"
                onClick={() => run(() => gotoLevel(timer, projected.index - 1))}
                disabled={projected.index === 0}
                title="前のレベル"
              >
                <SkipBack size={14} /> 前Lv
              </button>

              {timer.state === 'running' ? (
                <button className="tm-btn tm-btn--gold grow" onClick={() => run(() => pauseTimer(timer))}>
                  <Pause size={16} /> 一時停止
                </button>
              ) : (
                <button
                  className="tm-btn tm-btn--gold grow"
                  onClick={() => run(() => startTimer(timer))}
                  disabled={timer.state === 'finished'}
                >
                  <Play size={16} /> {timer.state === 'idle' ? 'スタート' : '再開'}
                </button>
              )}

              <button
                className="tm-btn tm-btn--sm"
                onClick={() => run(() => gotoLevel(timer, projected.index + 1))}
                disabled={projected.index >= timer.levels.length - 1}
                title="次のレベル"
              >
                次Lv <SkipForward size={14} />
              </button>
            </div>

            <div className="tm-controls" style={{ borderTop: 0, paddingTop: 4 }}>
              <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => run(() => adjustRemaining(timer, -60))}>
                <Minus size={12} /> 1分
              </button>
              <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => run(() => adjustRemaining(timer, 60))}>
                <Plus size={12} /> 1分
              </button>
              <span style={{ width: 1, background: 'var(--line)', alignSelf: 'stretch' }} aria-hidden />
              <button
                className="tm-btn tm-btn--sm tm-btn--ghost"
                onClick={() => run(() => updateTimerMeta(timer.id, { remainingCount: Math.max(0, timer.remainingCount - 1) }))}
              >
                <Users size={12} /> 1人バスト
              </button>
              <button
                className="tm-btn tm-btn--sm tm-btn--ghost"
                onClick={() => run(() => updateTimerMeta(timer.id, {
                  entryCount: timer.entryCount + 1,
                  remainingCount: timer.remainingCount + 1,
                }))}
              >
                <Plus size={12} /> エントリー
              </button>
            </div>

            <div className="tm-row" style={{ justifyContent: 'center', marginTop: 10 }}>
              <button className="tm-btn tm-btn--sm tm-btn--ghost"
                onClick={() => setPanel((p) => (p === 'structure' ? 'none' : 'structure'))}>
                ストラクチャー
              </button>
              <button className="tm-btn tm-btn--sm tm-btn--ghost"
                onClick={() => setPanel((p) => (p === 'share' ? 'none' : 'share'))}>
                リンクを配る
              </button>
              <button className="tm-btn tm-btn--sm tm-btn--ghost"
                onClick={() => run(() => updateTimerMeta(timer.id, { chimeEnabled: !timer.chimeEnabled }))}>
                {timer.chimeEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                {timer.chimeEnabled ? '音あり' : '音なし'}
              </button>
            </div>
          </div>
        ) : (
          <p className="tm-note tm-center tm-hide-on-focus" style={{ marginTop: 18 }}>
            閲覧モードです。操作は主催者の端末から行われます。
          </p>
        )}

        {/* ── パネル ── */}
        {canControl && panel === 'settings' && (
          <SettingsPanel timer={timer} onRun={run} onClose={() => setPanel('none')} />
        )}

        {canControl && panel === 'structure' && (
          <div className="tm-sec tm-hide-on-focus">
            <StructureEditor
              levels={timer.levels}
              currentIndex={projected.index}
              onChange={(levels) => run(() => updateTimerLevels(timer.id, levels))}
            />
          </div>
        )}

        {panel === 'share' && (
          <div className="tm-sec tm-hide-on-focus tm-stack" style={{ maxWidth: 520 }}>
            <CopyField label="閲覧リンク（全員に配る）" value={viewerUrl('timer', timer.id)} />
            {canControl && <ControlLinkField id={timer.id} />}
            <p className="tm-note">部屋ID: <b>{timer.id}</b></p>
          </div>
        )}

        {/* 閲覧者向けのストラクチャー表 */}
        {!canControl && (
          <div className="tm-sec tm-hide-on-focus">
            <p className="tm-eyebrow" style={{ marginBottom: 10 }}>STRUCTURE</p>
            <hr className="tm-rule" style={{ marginBottom: 10 }} />
            <div style={{ overflowX: 'auto' }}>
              <table className="tm-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}>Lv</th>
                    <th>SB / BB</th>
                    <th>Ante</th>
                    <th style={{ width: 54 }}>分</th>
                  </tr>
                </thead>
                <tbody>
                  {timer.levels.map((l, i) => (
                    <tr key={i}
                      data-break={l.isBreak ? 'true' : 'false'}
                      data-now={i === projected.index ? 'true' : 'false'}
                      data-past={i < projected.index ? 'true' : 'false'}
                      style={{ animationDelay: `${Math.min(i * 18, 360)}ms` }}
                    >
                      <td style={{ textAlign: 'left' }}>
                        {l.isBreak ? <Coffee size={12} style={{ verticalAlign: -2 }} /> : playLevelNumber(timer.levels, i)}
                      </td>
                      {l.isBreak ? (
                        <td colSpan={2} style={{ textAlign: 'left' }}>{l.note ?? '休憩'}</td>
                      ) : (
                        <>
                          <td>{l.sb.toLocaleString()} / {l.bb.toLocaleString()}</td>
                          <td>{l.ante > 0 ? l.ante.toLocaleString() : '—'}</td>
                        </>
                      )}
                      <td>{l.minutes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ height: 30 }} />
      </div>
    </TimerShell>
  )
}

// ── レベルアップ告知 ─────────────────────────────────────────────────────────

const AnnounceOverlay = ({
  level, levels, index,
}: {
  level: TimerLevel
  levels: TimerLevel[]
  index: number
}) => (
  <div className="tm-announce" role="status">
    <div className="tm-announce-card">
      <p className="lbl">{level.isBreak ? 'Break Time' : `Level ${playLevelNumber(levels, index)}`}</p>
      <p className="big">
        {level.isBreak
          ? `${level.minutes}:00`
          : `${level.sb.toLocaleString()} / ${level.bb.toLocaleString()}`}
      </p>
      <p className="sub">
        {level.isBreak
          ? (level.note ?? '休憩')
          : level.ante > 0
            ? `ANTE ${level.ante.toLocaleString()}　・　${level.minutes} MIN`
            : `${level.minutes} MIN`}
      </p>
    </div>
  </div>
)

// ── 設定パネル ───────────────────────────────────────────────────────────────

const SettingsPanel = ({
  timer, onRun, onClose,
}: {
  timer: LiveTimer
  onRun: (fn: () => Promise<unknown>) => Promise<void>
  onClose: () => void
}) => {
  const [title, setTitle] = useState(timer.title)
  const [prizeNote, setPrizeNote] = useState(timer.prizeNote)
  const [entryCount, setEntryCount] = useState(timer.entryCount)
  const [remainingCount, setRemainingCount] = useState(timer.remainingCount)
  const [startingStack, setStartingStack] = useState(timer.startingStack)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async () => {
    await onRun(() => updateTimerMeta(timer.id, {
      title: title.trim() || timer.title,
      prizeNote: prizeNote.trim(),
      entryCount,
      remainingCount,
      startingStack,
    }))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="tm-sec tm-hide-on-focus tm-stack" style={{ maxWidth: 560 }}>
      <div className="tm-card tm-stack">
        <div className="tm-spread">
          <p className="tm-eyebrow">SETTINGS</p>
          <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={onClose}><X size={13} /></button>
        </div>
        <label className="tm-field">
          <span>タイトル</span>
          <input className="tm-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} />
        </label>
        <label className="tm-field">
          <span>プライズ表記</span>
          <input className="tm-input" value={prizeNote} onChange={(e) => setPrizeNote(e.target.value)} maxLength={80} />
        </label>
        <div className="tm-grid" data-cols="3">
          <label className="tm-field">
            <span>エントリー数</span>
            <input className="tm-input" data-num="true" type="number" value={entryCount} min={0}
              onChange={(e) => setEntryCount(Number(e.target.value) || 0)} />
          </label>
          <label className="tm-field">
            <span>残り人数</span>
            <input className="tm-input" data-num="true" type="number" value={remainingCount} min={0}
              onChange={(e) => setRemainingCount(Number(e.target.value) || 0)} />
          </label>
          <label className="tm-field">
            <span>初期スタック</span>
            <input className="tm-input" data-num="true" type="number" value={startingStack} min={0} step={1000}
              onChange={(e) => setStartingStack(Number(e.target.value) || 0)} />
          </label>
        </div>
        <label className="tm-field">
          <span>画面テーマ</span>
          <ThemePicker value={timer.theme} onChange={(t: LiveTheme) => onRun(() => updateTimerMeta(timer.id, { theme: t }))} />
        </label>
        <button className="tm-btn tm-btn--gold tm-btn--wide" onClick={save}>
          {saved ? <Check size={14} /> : null} {saved ? '保存しました' : '保存する'}
        </button>
      </div>

      <div className="tm-card tm-stack">
        <p className="tm-eyebrow">DANGER ZONE</p>
        <div className="tm-row">
          <button className="tm-btn tm-btn--sm" onClick={() => onRun(() => resetTimer(timer))}>
            <RotateCcw size={13} /> レベル1に戻す
          </button>
          <button className="tm-btn tm-btn--sm" onClick={() => onRun(() => finishTimer(timer))}
            disabled={timer.state === 'finished'}>
            <Check size={13} /> 終了にする
          </button>
        </div>
        {!confirmDelete ? (
          <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} /> この部屋を削除
          </button>
        ) : (
          <div className="tm-row">
            <button className="tm-btn tm-btn--sm tm-btn--danger"
              onClick={() => onRun(() => deleteLiveTimer(timer.id))}>
              本当に削除する
            </button>
            <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => setConfirmDelete(false)}>
              やめる
            </button>
          </div>
        )}
        <p className="tm-note">削除すると閲覧リンクも無効になります。</p>
      </div>

      <Link to="/timer" className="tm-link-a tm-center">タイマーのトップへ</Link>
    </div>
  )
}

/** 操作用リンクは localStorage に持っている鍵からのみ再構成できる */
const ControlLinkField = ({ id }: { id: string }) => {
  const room = findRoom('timer', id)
  if (!room) return null
  return <CopyField label="操作用リンク（渡した人も操作可）" value={controlUrl('timer', id, room.controlKey)} />
}
