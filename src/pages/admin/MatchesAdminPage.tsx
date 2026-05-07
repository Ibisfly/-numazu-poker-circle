import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import {
  subscribeMatches, createMatch, updateMatch, deleteMatch,
  settleMatch, settleRingGame, subscribeAllUsers, checkAndUnlockAchievements,
  getTimerProvisionalRankings, getTimerSessionState,
} from '@/lib/firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Match, MatchStatus, User, DistributionRule, MatchCategory } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { ChevronLeft, Plus, FeatherPtIcon } from '@/components/ui/Icons'

// ── タイマーアプリ連携セクション ──────────────────────────────────────────
const TimerAppSection = ({ match }: { match: Match }) => {
  const [editing, setEditing] = useState(false)
  const [url, setUrl] = useState(match.timerAppUrl ?? '')
  const [timerState, setTimerState] = useState<{
    state: string
    currentLevel: number
    remainingPlayers: number
    totalPlayers: number
  } | null>(null)

  // タイマーセッションの状態を取得
  useEffect(() => {
    if (!match.timerSessionId) return
    getTimerSessionState(match.timerSessionId).then(setTimerState)
  }, [match.timerSessionId])

  const save = () => {
    updateMatch(match.id, { timerAppUrl: url.trim() || undefined })
    setEditing(false)
  }

  // タイマーアプリのベースURL（環境変数または相対パス）
  const timerAppBase = '/timer'  // 同一ドメイン想定、将来は環境変数化

  return (
    <div className="border-t border-swan-border/50 pt-2 mt-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-swan-sub">タイマーアプリ</span>
        <div className="flex items-center gap-2">
          {match.timerSessionId ? (
            <>
              <a
                href={`${timerAppBase}/session/${match.timerSessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-400 border border-green-400/30 px-2 py-1 rounded-lg hover:bg-green-400/10"
              >
                タイマー管理 ↗
              </a>
              {timerState && (
                <span className="text-xs text-swan-sub">
                  {timerState.state === 'finished' ? '終了' :
                   timerState.state === 'running' ? `Lv${timerState.currentLevel} (${timerState.remainingPlayers}/${timerState.totalPlayers})` :
                   timerState.state}
                </span>
              )}
            </>
          ) : match.timerAppUrl ? (
            <>
              <a
                href={match.timerAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded-lg hover:bg-cyan-400/10"
              >
                外部タイマー ↗
              </a>
              <button onClick={() => setEditing(!editing)} className="text-xs text-swan-sub">
                {editing ? '閉じる' : 'URL変更'}
              </button>
            </>
          ) : (
            <>
              <a
                href={`${timerAppBase}/new?matchId=${match.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-swan-accent border border-swan-accent/30 px-2 py-1 rounded-lg hover:bg-swan-accent/10"
              >
                セッション作成 ↗
              </a>
              <button onClick={() => setEditing(!editing)} className="text-xs text-swan-sub">
                外部URL
              </button>
            </>
          )}
        </div>
      </div>
      {editing && (
        <div className="flex gap-2 mt-1.5">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 bg-swan-black border border-swan-border rounded px-2 py-1 text-xs text-swan-text focus:outline-none focus:border-swan-accent"
          />
          <button onClick={save} className="text-xs bg-swan-accent text-black font-bold px-3 py-1 rounded">保存</button>
        </div>
      )}
    </div>
  )
}

// ── カテゴリバッジ ──────────────────────────────────────────────────────────
const CategoryBadge = ({ cat }: { cat: MatchCategory }) =>
  cat === 'tournament' ? (
    <span className="text-xs font-bold text-purple-400 bg-purple-400/10 border border-purple-400/30 px-2 py-0.5 rounded-full">
      トーナメント
    </span>
  ) : (
    <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-2 py-0.5 rounded-full">
      リングゲーム
    </span>
  )

const StatusLabel = ({ status }: { status: MatchStatus }) => {
  const map = {
    recruiting: { text: '受付中',  cls: 'text-green-400' },
    ongoing:    { text: '開催中',  cls: 'text-yellow-400' },
    finished:   { text: '終了',    cls: 'text-swan-sub' },
  }
  const { text, cls } = map[status]
  return <span className={`text-xs font-medium ${cls}`}>{text}</span>
}

// ── フォームの初期値 ───────────────────────────────────────────────────────
const DEFAULT_DIST: DistributionRule[] = [
  { rank: 1, points: 0 },
  { rank: 2, points: 0 },
  { rank: 3, points: 0 },
]

export const MatchesAdminPage = () => {
  const { user: adminUser } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)

  // 作成フォーム
  const [formCat, setFormCat] = useState<MatchCategory>('tournament')
  const [formTitle, setFormTitle] = useState('')
  const [formFee, setFormFee] = useState('100')
  const [formCapacity, setFormCapacity] = useState('8')
  const [formDate, setFormDate] = useState('')
  const [formDist, setFormDist] = useState<DistributionRule[]>(DEFAULT_DIST)
  const [formReentry, setFormReentry] = useState(false)
  const [formBounty, setFormBounty] = useState(false)
  const [formRebuy, setFormRebuy] = useState(false)
  const [saving, setSaving] = useState(false)

  // トーナメント精算
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)
  const [settlingMatch, setSettlingMatch] = useState<Match | null>(null)
  const [rankings, setRankings] = useState<{ uid: string; rank: string }[]>([])

  // リング精算
  const [settlingRing, setSettlingRing] = useState<Match | null>(null)
  const [cashbacks, setCashbacks] = useState<{ uid: string; amount: string }[]>([])

  useEffect(() => {
    const u1 = subscribeMatches(setMatches)
    const u2 = subscribeAllUsers(setAllUsers)
    return () => { u1(); u2() }
  }, [])

  const getUserName = (uid: string) =>
    allUsers.find((u) => u.uid === uid)?.playerName ?? uid.slice(0, 8)

  // ── マッチ作成 ────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminUser) return
    setSaving(true)
    try {
      await createMatch({
        title: formTitle.trim(),
        matchCategory: formCat,
        entryFee: parseInt(formFee),
        capacity: parseInt(formCapacity),
        status: 'recruiting',
        distributionRules: formCat === 'tournament' ? formDist : [],
        participants: [],
        scheduledAt: Timestamp.fromDate(new Date(formDate)),
        createdBy: adminUser.uid,
        ...(formCat === 'tournament' && { hasReentry: formReentry, hasBounty: formBounty }),
        ...(formCat === 'ring' && { hasRebuy: formRebuy }),
      })
      setShowForm(false)
      setFormTitle(''); setFormCat('tournament'); setFormReentry(false); setFormBounty(false); setFormRebuy(false)
      setFormDist(DEFAULT_DIST)
    } finally {
      setSaving(false)
    }
  }

  // ── トーナメント精算開始 ──────────────────────────────────────────────────
  const startTournamentSettle = async (match: Match) => {
    setSettlingMatch(match)

    // タイマーセッションがあれば暫定順位を取得
    if (match.timerSessionId) {
      try {
        const provisionalRankings = await getTimerProvisionalRankings(match.timerSessionId)
        if (provisionalRankings.length > 0) {
          // 暫定順位をマッチの参加者と紐付け
          const rankMap = new Map(
            provisionalRankings
              .filter(r => r.uid)
              .map(r => [r.uid!, r.rank])
          )
          setRankings(
            match.participants.map(uid => ({
              uid,
              rank: String(rankMap.get(uid) ?? match.participants.indexOf(uid) + 1),
            }))
          )
          return
        }
      } catch (err) {
        console.error('暫定順位の取得に失敗:', err)
      }
    }

    // フォールバック: 参加順に仮の順位を設定
    setRankings(match.participants.map((uid, i) => ({ uid, rank: String(i + 1) })))
  }

  const handleTournamentSettle = async () => {
    if (!adminUser || !settlingMatch) return
    setSaving(true)
    try {
      await settleMatch(
        settlingMatch,
        rankings.map((r) => ({ uid: r.uid, rank: parseInt(r.rank) })),
        adminUser.uid
      )
      settlingMatch.participants.forEach((uid) => checkAndUnlockAchievements(uid).catch(() => {}))
      setSettlingMatch(null)
    } finally { setSaving(false) }
  }

  // ── リング精算開始 ────────────────────────────────────────────────────────
  const startRingSettle = (match: Match) => {
    setSettlingRing(match)
    setCashbacks(match.participants.map((uid) => ({ uid, amount: String(match.entryFee) })))
  }

  const handleRingSettle = async () => {
    if (!adminUser || !settlingRing) return
    setSaving(true)
    try {
      await settleRingGame(
        settlingRing,
        cashbacks.map((c) => ({ uid: c.uid, amount: parseInt(c.amount) || 0 })),
        adminUser.uid
      )
      settlingRing.participants.forEach((uid) => checkAndUnlockAchievements(uid).catch(() => {}))
      setSettlingRing(null)
    } finally { setSaving(false) }
  }

  if (!adminUser) return null

  return (
    <AdminShell title="マッチ管理">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-swan-accent text-black font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          {showForm ? 'キャンセル' : '新規マッチ作成'}
        </button>

        {/* ── 作成フォーム ── */}
        {showForm && (
          <form onSubmit={handleCreate} className="bg-swan-card border border-swan-border rounded-xl p-4 space-y-4">

            {/* カテゴリ選択 */}
            <div>
              <label className="text-xs text-swan-sub block mb-1">カテゴリ</label>
              <div className="flex gap-2">
                {(['tournament', 'ring'] as MatchCategory[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormCat(c)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                      formCat === c
                        ? c === 'tournament'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                        : 'border-swan-border text-swan-sub'
                    }`}
                  >
                    {c === 'tournament' ? '🏆 トーナメント' : '♠ リングゲーム'}
                  </button>
                ))}
              </div>
            </div>

            {/* 共通フィールド */}
            <input
              type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
              placeholder="タイトル" required
              className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-swan-sub flex items-center gap-1 mb-1">
                  エントリー費 <FeatherPtIcon size={10} className="text-swan-accent" />
                </label>
                <input type="number" value={formFee} onChange={(e) => setFormFee(e.target.value)} min="0"
                  className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-swan-sub mb-1 block">定員</label>
                <input type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} min="2"
                  className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-swan-sub mb-1 block">開催日時</label>
              <input type="datetime-local" value={formDate} onChange={(e) => setFormDate(e.target.value)} required
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none" />
            </div>

            {/* トーナメント専用 */}
            {formCat === 'tournament' && (
              <>
                <div>
                  <label className="text-xs text-swan-sub mb-1 block flex items-center gap-1">
                    順位別褒章 <FeatherPtIcon size={10} className="text-swan-accent" />
                  </label>
                  {formDist.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-swan-sub w-8">{rule.rank}位</span>
                      <input
                        type="number" value={rule.points} min="0"
                        onChange={(e) => setFormDist(formDist.map((r, idx) =>
                          idx === i ? { ...r, points: parseInt(e.target.value) || 0 } : r
                        ))}
                        placeholder="0"
                        className="flex-1 bg-swan-black border border-swan-border rounded px-2 py-1 text-xs text-swan-text"
                      />
                      <span className="text-xs text-swan-sub">pt</span>
                      {formDist.length > 1 && (
                        <button type="button" onClick={() => setFormDist(formDist.filter((_, idx) => idx !== i))}
                          className="text-xs text-red-400">×</button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => setFormDist([...formDist, { rank: formDist.length + 1, points: 0 }])}
                    className="text-xs text-swan-accent mt-1">+ 順位追加</button>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={formReentry} onChange={(e) => setFormReentry(e.target.checked)}
                      className="accent-swan-accent" />
                    リエントリー可
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={formBounty} onChange={(e) => setFormBounty(e.target.checked)}
                      className="accent-swan-accent" />
                    バウンティあり
                  </label>
                </div>
              </>
            )}

            {/* リングゲーム専用 */}
            {formCat === 'ring' && (
              <div>
                <p className="text-xs text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-lg px-3 py-2 mb-3">
                  精算時に参加者ごとのキャッシュバック額を入力します
                </p>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={formRebuy} onChange={(e) => setFormRebuy(e.target.checked)}
                    className="accent-swan-accent" />
                  リバイ可
                </label>
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full bg-swan-accent text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50">
              {saving ? '作成中...' : 'マッチを作成'}
            </button>
          </form>
        )}

        {/* ── 削除確認ダイアログ ── */}
        {deletingMatchId && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
            <div className="bg-swan-dark border border-red-500/30 rounded-2xl p-6 w-full max-w-xs text-center space-y-4">
              <p className="font-bold text-red-400">マッチを削除しますか？</p>
              <p className="text-xs text-swan-sub">この操作は取り消せません。</p>
              <div className="flex gap-2">
                <button
                  onClick={async () => { await deleteMatch(deletingMatchId); setDeletingMatchId(null) }}
                  className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 rounded-xl text-sm"
                >
                  削除する
                </button>
                <button
                  onClick={() => setDeletingMatchId(null)}
                  className="flex-1 bg-swan-muted text-swan-sub py-2 rounded-xl text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── トーナメント精算モーダル ── */}
        {settlingMatch && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
            <div className="bg-swan-dark border-t border-swan-border w-full max-w-md mx-auto rounded-t-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <h3 className="font-bold">精算：{settlingMatch.title}</h3>
              <p className="text-xs text-swan-sub">各参加者の順位を入力してください</p>
              {rankings.map((r, i) => (
                <div key={r.uid} className="flex items-center gap-3">
                  <span className="text-sm text-swan-text w-28 truncate">{getUserName(r.uid)}</span>
                  <input
                    type="number" value={r.rank}
                    onChange={(e) => setRankings(rankings.map((rk, idx) =>
                      idx === i ? { ...rk, rank: e.target.value } : rk
                    ))}
                    min="1"
                    className="w-16 bg-swan-black border border-swan-border rounded px-2 py-1 text-sm text-swan-text"
                  />
                  <span className="text-xs text-swan-sub">位</span>
                </div>
              ))}
              <div className="flex gap-2">
                <button onClick={handleTournamentSettle} disabled={saving}
                  className="flex-1 bg-swan-accent text-black font-bold py-2 rounded-lg text-sm disabled:opacity-50">
                  {saving ? '精算中...' : '精算実行'}
                </button>
                <button onClick={() => setSettlingMatch(null)}
                  className="flex-1 bg-swan-muted text-swan-sub py-2 rounded-lg text-sm">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── リングゲーム精算モーダル ── */}
        {settlingRing && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
            <div className="bg-swan-dark border-t border-cyan-500/30 w-full max-w-md mx-auto rounded-t-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <h3 className="font-bold">精算：{settlingRing.title}</h3>
                <p className="text-xs text-swan-sub mt-1">
                  参加者ごとのキャッシュバック額を入力
                  （エントリー費 <span className="text-cyan-400">{settlingRing.entryFee}pt</span>、
                  プール {settlingRing.entryFee * (
                    settlingRing.participants.length +
                    Object.values(settlingRing.rebuys ?? {}).reduce((s, n) => s + n, 0)
                  )}pt）
                </p>
              </div>
              <div className="space-y-2">
                {cashbacks.map((c, i) => {
                  const diff = parseInt(c.amount || '0') - settlingRing.entryFee
                  return (
                    <div key={c.uid} className="flex items-center gap-2">
                      <span className="text-sm text-swan-text w-24 truncate shrink-0">{getUserName(c.uid)}</span>
                      <input
                        type="number" value={c.amount}
                        onChange={(e) => setCashbacks(cashbacks.map((cb, idx) =>
                          idx === i ? { ...cb, amount: e.target.value } : cb
                        ))}
                        min="0"
                        className="flex-1 bg-swan-black border border-swan-border rounded px-2 py-1.5 text-sm text-swan-text"
                        placeholder="0"
                      />
                      <span className="text-xs text-swan-sub shrink-0">pt</span>
                      <span className={`text-xs w-14 text-right shrink-0 ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-swan-sub'}`}>
                        {diff > 0 ? `+${diff}` : diff !== 0 ? String(diff) : '±0'}
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="text-xs text-swan-sub text-right">
                合計支払: {cashbacks.reduce((s, c) => s + (parseInt(c.amount || '0') || 0), 0).toLocaleString()}pt
              </div>
              <div className="flex gap-2">
                <button onClick={handleRingSettle} disabled={saving}
                  className="flex-1 bg-cyan-500 text-black font-bold py-2 rounded-lg text-sm disabled:opacity-50">
                  {saving ? '精算中...' : '精算実行'}
                </button>
                <button onClick={() => setSettlingRing(null)}
                  className="flex-1 bg-swan-muted text-swan-sub py-2 rounded-lg text-sm">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── マッチ一覧 ── */}
        <div className="space-y-3">
          {matches.map((match) => {
            const cat = match.matchCategory ?? 'tournament'
            return (
              <div key={match.id} className="bg-swan-card border border-swan-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CategoryBadge cat={cat} />
                      <StatusLabel status={match.status} />
                    </div>
                    <p className="font-semibold truncate">{match.title}</p>
                    <p className="text-xs text-swan-sub mt-0.5 flex items-center gap-1">
                      {match.participants.length}/{match.capacity}名
                      <FeatherPtIcon size={10} className="text-swan-accent ml-1" />
                      {match.entryFee}
                      {/* フラグ表示 */}
                      {match.hasReentry && <span className="ml-1 text-purple-400">リエントリー可</span>}
                      {match.hasBounty  && <span className="ml-1 text-orange-400">バウンティ</span>}
                      {match.hasRebuy   && <span className="ml-1 text-cyan-400">リバイ可</span>}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {match.status === 'recruiting' && (
                    <button onClick={() => updateMatch(match.id, { status: 'ongoing' })}
                      className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-lg">
                      開始する
                    </button>
                  )}
                  {match.status === 'ongoing' && cat === 'tournament' && (
                    <button onClick={() => startTournamentSettle(match)}
                      className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-3 py-1.5 rounded-lg">
                      終了・精算（順位）
                    </button>
                  )}
                  {match.status === 'ongoing' && cat === 'ring' && (
                    <button onClick={() => startRingSettle(match)}
                      className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg">
                      終了・精算（キャッシュバック）
                    </button>
                  )}
                  {/* 削除（受付中 or 終了のみ） */}
                  {match.status !== 'ongoing' && (
                    <button
                      onClick={() => setDeletingMatchId(match.id)}
                      className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg ml-auto"
                    >
                      削除
                    </button>
                  )}
                </div>

                {/* タイマーアプリ連携（将来拡張ポイント）*/}
                <TimerAppSection match={match} />
              </div>
            )
          })}
          {matches.length === 0 && (
            <p className="text-center text-swan-sub py-8">マッチはありません</p>
          )}
        </div>
      </div>
    </AdminShell>
  )
}
