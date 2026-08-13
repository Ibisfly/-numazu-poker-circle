import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { BracketMatch, LiveBracket, LiveTheme } from '@/types'
import {
  Trophy, Settings, X, Maximize2, Minimize2, Check, Minus, Plus, Trash2, Shuffle, RotateCcw,
} from '@/components/ui/Icons'
import { TimerShell, TimerTopBar, CopyField, Loading, NotFound, ThemePicker } from './shared'
import {
  deleteLiveBracket, rebuildBracket, subscribeLiveBracket, updateBracketMatches, updateBracketMeta,
} from '@/lib/liveTimer/firestore'
import {
  claimControl, controlUrl, subscribeControl, takeControlKeyFromHash, viewerUrl,
} from '@/lib/liveTimer/access'
import {
  applyScore, championId, groupByRound, roundLabel, setWinner,
} from '@/lib/liveTimer/bracket'
import { useFullscreen } from '@/lib/liveTimer/runtime'
import { findRoom, saveRoom } from '@/lib/liveTimer/presets'

export const BracketLivePage = () => {
  const { id = '' } = useParams()
  const [bracket, setBracket] = useState<LiveBracket | null>(null)
  const [missing, setMissing] = useState(false)
  const [canControl, setCanControl] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [panel, setPanel] = useState<'none' | 'settings' | 'share'>('none')
  const [actionError, setActionError] = useState<string | null>(null)
  const { isFull, toggle: toggleFullscreen } = useFullscreen()

  useEffect(() => {
    if (!id) return
    const fromHash = takeControlKeyFromHash()
    const key = fromHash ?? findRoom('bracket', id)?.controlKey
    if (key) {
      claimControl('liveBrackets', id, key)
        .then(() => { if (fromHash) setPendingKey(fromHash) })
        .catch((e) => {
          console.error('claimControl failed:', e)
          setActionError('操作キーが無効です。閲覧のみ可能です。')
        })
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeLiveBracket(id, (b) => (b ? setBracket(b) : setMissing(true)))
  }, [id])

  useEffect(() => {
    if (!id) return
    return subscribeControl('liveBrackets', id, setCanControl)
  }, [id])

  useEffect(() => {
    if (pendingKey && bracket) {
      saveRoom({ kind: 'bracket', id: bracket.id, title: bracket.title, controlKey: pendingKey })
      setPendingKey(null)
    }
  }, [pendingKey, bracket])

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setActionError(null)
    try {
      await fn()
    } catch (e: unknown) {
      console.error('bracket control error:', e)
      setActionError(
        e instanceof Error && e.message.includes('permission')
          ? '操作権限がありません。操作用リンクから開いてください。'
          : '操作に失敗しました。もう一度お試しください。'
      )
    }
  }, [])

  if (missing) return <NotFound message="このトーナメント表は見つかりませんでした" />
  if (!bracket) return <Loading label="トーナメント表を読み込み中" />

  const rounds = groupByRound(bracket.matches)
  const champId = championId(bracket.matches)
  const champ = bracket.entrants.find((e) => e.id === champId)
  const nameOf = (eid: string | null) => bracket.entrants.find((e) => e.id === eid)?.name ?? null

  return (
    <TimerShell theme={bracket.theme} focus={isFull}>
      <div className="tm-wrap">
        <TimerTopBar
          title={bracket.title}
          right={
            <>
              <span className="tm-chip" data-live={!champId ? 'true' : undefined}>
                {!champId && <b />}
                {champId ? 'FINISHED' : bracket.mode === 'team' ? '3ON3' : 'HEADS UP'}
              </span>
              <button className="tm-btn tm-btn--icon tm-btn--ghost" title="全画面" onClick={toggleFullscreen}>
                {isFull ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
              <button className="tm-btn tm-btn--icon tm-btn--ghost" title="リンク"
                onClick={() => setPanel((p) => (p === 'share' ? 'none' : 'share'))}>
                <Trophy size={15} />
              </button>
              {canControl && (
                <button className="tm-btn tm-btn--icon tm-btn--ghost" title="設定"
                  onClick={() => setPanel((p) => (p === 'settings' ? 'none' : 'settings'))}>
                  {panel === 'settings' ? <X size={15} /> : <Settings size={15} />}
                </button>
              )}
            </>
          }
        />

        {/* ── 優勝者 ── */}
        {champ && (
          <div className="tm-sec" style={{ paddingBottom: 6 }}>
            <div className="tm-champ">
              <p className="tm-eyebrow">CHAMPION</p>
              <p className="nm">{champ.name}</p>
              {champ.members.length > 0 && (
                <p className="tm-note" style={{ letterSpacing: '.1em' }}>{champ.members.join('　・　')}</p>
              )}
            </div>
          </div>
        )}

        {actionError && <p className="tm-error" style={{ marginTop: 14 }}>{actionError}</p>}

        {!canControl && !champId && (
          <p className="tm-note tm-center" style={{ marginTop: 14 }}>
            閲覧モードです。結果は主催者の端末から入力されます。
          </p>
        )}

        {/* ── 表 ── */}
        <BracketBoard
          bracket={bracket}
          rounds={rounds}
          canControl={canControl}
          nameOf={nameOf}
          onSetWinner={(matchId, winnerId) =>
            run(() => updateBracketMatches(bracket.id, setWinner(bracket.matches, matchId, winnerId)))
          }
          onScore={(matchId, side, delta) =>
            run(() => updateBracketMatches(
              bracket.id,
              applyScore(bracket.matches, matchId, side, delta, bracket.winsNeeded)
            ))
          }
        />

        {panel === 'share' && (
          <div className="tm-sec tm-stack" style={{ maxWidth: 520 }}>
            <CopyField label="閲覧リンク（全員に配る）" value={viewerUrl('bracket', bracket.id)} />
            {canControl && findRoom('bracket', bracket.id) && (
              <CopyField
                label="操作用リンク（結果を入力できる）"
                value={controlUrl('bracket', bracket.id, findRoom('bracket', bracket.id)!.controlKey)}
              />
            )}
            <p className="tm-note">部屋ID: <b>{bracket.id}</b></p>
          </div>
        )}

        {canControl && panel === 'settings' && (
          <BracketSettings bracket={bracket} onRun={run} onClose={() => setPanel('none')} />
        )}

        <div style={{ height: 30 }} />
      </div>
    </TimerShell>
  )
}

// ── 表の描画 ─────────────────────────────────────────────────────────────────

interface Conn { d: string; len: number }

const BracketBoard = ({
  bracket, rounds, canControl, nameOf, onSetWinner, onScore,
}: {
  bracket: LiveBracket
  rounds: BracketMatch[][]
  canControl: boolean
  nameOf: (id: string | null) => string | null
  onSetWinner: (matchId: string, winnerId: string | null) => void
  onScore: (matchId: string, side: 'a' | 'b', delta: number) => void
}) => {
  const boardRef = useRef<HTMLDivElement | null>(null)
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [conns, setConns] = useState<Conn[]>([])
  const [size, setSize] = useState({ w: 0, h: 0 })

  /** 各マッチの実寸から接続線を引き直す。CSS だけでは崩れやすいので実測する */
  const measure = useCallback(() => {
    const board = boardRef.current
    if (!board) return
    const next: Conn[] = []
    for (const m of bracket.matches) {
      if (!m.nextId) continue
      const from = cellRefs.current.get(m.id)
      const to = cellRefs.current.get(m.nextId)
      if (!from || !to) continue
      const x1 = from.offsetLeft + from.offsetWidth
      const y1 = from.offsetTop + from.offsetHeight / 2
      const x2 = to.offsetLeft
      const y2 = to.offsetTop + to.offsetHeight / 2
      const mid = x1 + (x2 - x1) / 2
      next.push({
        d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
        len: Math.abs(x2 - x1) + Math.abs(y2 - y1) + 40,
      })
    }
    setConns(next)
    setSize({ w: board.scrollWidth, h: board.scrollHeight })
  }, [bracket.matches])

  useLayoutEffect(() => {
    measure()
    const ro = new ResizeObserver(measure)
    if (boardRef.current) ro.observe(boardRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const total = rounds.length

  return (
    <div className="tm-sec" style={{ paddingTop: 14 }}>
      <div className="tm-bracket" ref={boardRef} style={{ position: 'relative' }}>
        <svg className="tm-link" width={size.w} height={size.h} aria-hidden
          style={{ position: 'absolute', left: 0, top: 0, zIndex: 0 }}>
          {conns.map((c, i) => (
            <path key={i} d={c.d} style={{ ['--len' as string]: c.len, animationDelay: `${180 + i * 40}ms` }} />
          ))}
        </svg>

        {/* ラウンド列には position を付けない。各マッチの offsetLeft/offsetTop を
            盤面（.tm-bracket）基準で測って接続線を引くため。
            z-index は flex アイテムなら position なしでも効く */}
        {rounds.map((ms, r) => (
          <div className="tm-round" key={r} style={{ zIndex: 1 }}>
            <p className="tm-round-head">{roundLabel(r, total)}</p>
            <div className="tm-round-body">
            {ms.map((m, i) => (
              <div
                key={m.id}
                className="tm-seat"
                ref={(el) => {
                  if (el) cellRefs.current.set(m.id, el)
                  else cellRefs.current.delete(m.id)
                }}
                style={{ animationDelay: `${r * 90 + i * 40}ms` }}
              >
                <Side
                  match={m} side="a" name={nameOf(m.aId)} entrantId={m.aId}
                  bracket={bracket} canControl={canControl}
                  onSetWinner={onSetWinner} onScore={onScore}
                />
                <Side
                  match={m} side="b" name={nameOf(m.bId)} entrantId={m.bId}
                  bracket={bracket} canControl={canControl}
                  onSetWinner={onSetWinner} onScore={onScore}
                />
              </div>
            ))}
            </div>
          </div>
        ))}
      </div>
      <p className="tm-note" style={{ marginTop: 4 }}>
        {canControl
          ? bracket.winsNeeded > 1
            ? `＋ボタンで勝ち数を加算。${bracket.winsNeeded}本先取で勝ち上がりが確定します。`
            : '名前をタップすると勝者になります。もう一度タップで取り消し。'
          : '横にスクロールして全ラウンドを見られます。'}
      </p>
    </div>
  )
}

const Side = ({
  match, side, name, entrantId, bracket, canControl, onSetWinner, onScore,
}: {
  match: BracketMatch
  side: 'a' | 'b'
  name: string | null
  entrantId: string | null
  bracket: LiveBracket
  canControl: boolean
  onSetWinner: (matchId: string, winnerId: string | null) => void
  onScore: (matchId: string, side: 'a' | 'b', delta: number) => void
}) => {
  const entrant = bracket.entrants.find((e) => e.id === entrantId)
  const isWin = !!match.winnerId && match.winnerId === entrantId
  const isLose = !!match.winnerId && !!entrantId && match.winnerId !== entrantId
  const score = side === 'a' ? match.scoreA : match.scoreB
  const useScore = bracket.winsNeeded > 1
  const interactive = canControl && !!entrantId

  const onClick = () => {
    if (!interactive || useScore) return
    onSetWinner(match.id, isWin ? null : entrantId)
  }

  return (
    <div
      className="tm-side"
      data-win={isWin ? 'true' : 'false'}
      data-lose={isLose ? 'true' : 'false'}
      data-tbd={!entrantId ? 'true' : 'false'}
      onClick={onClick}
      role={interactive && !useScore ? 'button' : undefined}
      tabIndex={interactive && !useScore ? 0 : undefined}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      style={{ cursor: interactive && !useScore ? 'pointer' : 'default' }}
    >
      <span className="seed">{entrant ? entrant.seed : '–'}</span>
      <span className="nm">
        {name ?? '未確定'}
        {entrant && entrant.members.length > 0 && (
          <em className="mem" style={{ fontStyle: 'normal' }}>{entrant.members.join(' / ')}</em>
        )}
      </span>

      {useScore ? (
        <>
          <span className="sc">{score}</span>
          {interactive && (
            <span className="tm-row" style={{ gap: 2, flexWrap: 'nowrap' }}>
              <button className="tm-btn tm-btn--ghost" style={{ padding: 2, width: 20, height: 20 }}
                title="勝ち数 −1" onClick={(e) => { e.stopPropagation(); onScore(match.id, side, -1) }}>
                <Minus size={11} />
              </button>
              <button className="tm-btn tm-btn--ghost" style={{ padding: 2, width: 20, height: 20 }}
                title="勝ち数 +1" onClick={(e) => { e.stopPropagation(); onScore(match.id, side, 1) }}>
                <Plus size={11} />
              </button>
            </span>
          )}
        </>
      ) : (
        isWin && <Check size={14} style={{ color: 'var(--accent)', flex: '0 0 auto' }} />
      )}
    </div>
  )
}

// ── 設定 ─────────────────────────────────────────────────────────────────────

const BracketSettings = ({
  bracket, onRun, onClose,
}: {
  bracket: LiveBracket
  onRun: (fn: () => Promise<unknown>) => Promise<void>
  onClose: () => void
}) => {
  const [title, setTitle] = useState(bracket.title)
  const [winsNeeded, setWinsNeeded] = useState(bracket.winsNeeded)
  const [names, setNames] = useState(bracket.entrants.map((e) => e.name).join('\n'))
  const [confirmRebuild, setConfirmRebuild] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className="tm-sec tm-stack" style={{ maxWidth: 560 }}>
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
          <span>1試合の先取数</span>
          <select className="tm-select" value={winsNeeded} onChange={(e) => setWinsNeeded(Number(e.target.value))}>
            <option value={1}>1本勝負</option>
            <option value={2}>2本先取</option>
            <option value={3}>3本先取</option>
          </select>
        </label>
        <label className="tm-field">
          <span>画面テーマ</span>
          <ThemePicker value={bracket.theme} onChange={(t: LiveTheme) => onRun(() => updateBracketMeta(bracket.id, { theme: t }))} />
        </label>
        <button className="tm-btn tm-btn--gold tm-btn--wide"
          onClick={() => onRun(() => updateBracketMeta(bracket.id, { title: title.trim() || bracket.title, winsNeeded }))}>
          <Check size={14} /> 保存する
        </button>
      </div>

      <div className="tm-card tm-stack">
        <p className="tm-eyebrow">RE-DRAW</p>
        <label className="tm-field">
          <span>参加者（1行1組・上から第1シード）</span>
          <textarea className="tm-input" rows={6} value={names} onChange={(e) => setNames(e.target.value)}
            style={{ resize: 'vertical', fontSize: 13 }} />
        </label>
        {!confirmRebuild ? (
          <button className="tm-btn tm-btn--sm" onClick={() => setConfirmRebuild(true)}>
            <Shuffle size={13} /> この名簿で組み直す
          </button>
        ) : (
          <div className="tm-stack">
            <p className="tm-note" style={{ color: 'var(--terracotta)' }}>
              組み直すと入力済みの勝敗はすべて消えます。
            </p>
            <div className="tm-row">
              <button
                className="tm-btn tm-btn--sm tm-btn--danger"
                onClick={async () => {
                  const list = names.split('\n').map((s) => s.trim()).filter(Boolean)
                  if (list.length < 2) return
                  const entrants = list.map((n, i) => {
                    const prev = bracket.entrants.find((e) => e.name === n)
                    return {
                      id: prev?.id ?? `e${i + 1}-${Math.random().toString(36).slice(2, 7)}`,
                      name: n,
                      members: prev?.members ?? [],
                      seed: i + 1,
                    }
                  })
                  await onRun(() => rebuildBracket(bracket.id, entrants))
                  setConfirmRebuild(false)
                }}
              >
                <RotateCcw size={13} /> 組み直す
              </button>
              <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => setConfirmRebuild(false)}>
                やめる
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="tm-card tm-stack">
        <p className="tm-eyebrow">DANGER ZONE</p>
        {!confirmDelete ? (
          <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={13} /> この表を削除
          </button>
        ) : (
          <div className="tm-row">
            <button className="tm-btn tm-btn--sm tm-btn--danger" onClick={() => onRun(() => deleteLiveBracket(bracket.id))}>
              本当に削除する
            </button>
            <button className="tm-btn tm-btn--sm tm-btn--ghost" onClick={() => setConfirmDelete(false)}>やめる</button>
          </div>
        )}
      </div>

      <Link to="/timer" className="tm-link-a tm-center">タイマーのトップへ</Link>
    </div>
  )
}
