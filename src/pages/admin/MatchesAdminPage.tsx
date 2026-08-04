import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import {
  subscribeMatches, createMatch, updateMatch, deleteMatch, setMatchEvent,
  settleMatch, settleRingGame, subscribeAllUsers, checkAndUnlockAchievements,
  getTimerProvisionalRankings, getTimerSessionState, subscribeActiveEvents, subscribeItems,
} from '@/lib/firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Match, MatchStatus, User, DistributionRule, MatchCategory, Event, Item } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { ChevronLeft, Plus, FeatherPtIcon, Pencil } from '@/components/ui/Icons'
import { PrizeTable } from '@/components/ui/PrizeTable'
import { computePrizeDistribution, computeMatchPrizes } from '@/lib/prizeDistribution'

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

  // タイマーアプリのベースURL
  const timerAppBase = 'https://timer-black-swan.web.app'

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
      プレミアリング
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

// ── 精算入力 ────────────────────────────────────────────────────────────────

/** インマネ人数（賞金が出る順位数） */
const itmCountOf = (match: Match): number => {
  if ((match.prizeMode ?? 'manual') === 'auto') {
    const dist = computeMatchPrizes(match)
    return dist.ok ? dist.itmCount : 0
  }
  return match.distributionRules.filter((r) => r.points > 0).length
}

/**
 * 精算で順位入力が必要な行数。
 * インマネ圏＋バブル（その直下1名）までは称号・順位報酬に関わるため必須とし、
 * それ以下は順位づけしない（Busted）。
 */
const settleRowCount = (match: Match): number =>
  Math.min(itmCountOf(match) + 1, match.participants.length)

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
  const [activeEvents, setActiveEvents] = useState<Event[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [settleError, setSettleError] = useState('')

  // 作成フォーム
  const [formCat, setFormCat] = useState<MatchCategory>('tournament')
  const [formTitle, setFormTitle] = useState('')
  const [formFee, setFormFee] = useState('0')
  const [formEventId, setFormEventId] = useState('')

  const handleCategoryChange = (cat: MatchCategory) => {
    setFormCat(cat)
    setFormFee(cat === 'tournament' ? '0' : '100')
  }
  const [formCapacity, setFormCapacity] = useState('8')
  const [formDate, setFormDate] = useState('')
  const [formDist, setFormDist] = useState<DistributionRule[]>(DEFAULT_DIST)
  // 既定は自動配分。チェックしたときだけ手動プライズを入力する
  const [formManualPrize, setFormManualPrize] = useState(false)
  const [formReentry, setFormReentry] = useState(false)
  const [formReentryFee, setFormReentryFee] = useState('')
  const [formRebuy, setFormRebuy] = useState(false)
  const [formRebuyFee, setFormRebuyFee] = useState('')
  const [saving, setSaving] = useState(false)

  // マッチ編集
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [editCapacity, setEditCapacity] = useState('')
  const [editError, setEditError] = useState('')

  // トーナメント精算
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)
  const [settlingMatch, setSettlingMatch] = useState<Match | null>(null)
  // 順位 → uid の割り当て（index 0 が1位）。バブルラインまでを入力する
  const [rankAssign, setRankAssign] = useState<string[]>([])
  // 精算時に付与する特典アイテム（uid → itemId）
  const [settlePerks, setSettlePerks] = useState<Record<string, string>>({})

  // リング精算
  const [settlingRing, setSettlingRing] = useState<Match | null>(null)
  const [cashbacks, setCashbacks] = useState<{ uid: string; amount: string }[]>([])

  useEffect(() => {
    const u1 = subscribeMatches(setMatches)
    const u2 = subscribeAllUsers(setAllUsers)
    const u3 = subscribeActiveEvents(setActiveEvents)
    const u4 = subscribeItems(setItems)
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  const benefitItems = items.filter((i) => i.category === 'benefit')

  const getUserName = (uid: string) =>
    allUsers.find((u) => u.uid === uid)?.playerName ?? uid.slice(0, 8)

  // ── マッチ作成 ────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminUser) return
    setSaving(true)
    setFormError('')
    try {
      // undefined のフィールドは含めない（Firestore は undefined を書き込めない）
      await createMatch({
        title: formTitle.trim(),
        matchCategory: formCat,
        entryFee: parseInt(formFee) || 0,
        capacity: parseInt(formCapacity) || 0,
        status: 'recruiting',
        ...(formCat === 'tournament' && { prizeMode: formManualPrize ? 'manual' as const : 'auto' as const }),
        // 自動配分の賞金は精算時にエントリー数から確定するため、作成時は空にする
        distributionRules: formCat === 'tournament' && formManualPrize
          ? formDist.map(({ rank, points }) => ({ rank, points }))
          : [],
        participants: [],
        scheduledAt: Timestamp.fromDate(new Date(formDate)),
        createdBy: adminUser.uid,
        ...(formEventId && { eventId: formEventId }),
        ...(formCat === 'tournament' && {
          hasReentry: formReentry,
          ...(formReentry && { reentryFee: parseInt(formReentryFee) || parseInt(formFee) || 0 }),
        }),
        ...(formCat === 'ring' && {
          hasRebuy: formRebuy,
          ...(formRebuy && { rebuyFee: parseInt(formRebuyFee) || parseInt(formFee) || 0 }),
        }),
      })
      setShowForm(false)
      setFormTitle(''); setFormCat('tournament'); setFormReentry(false); setFormReentryFee(''); setFormRebuy(false); setFormRebuyFee(''); setFormEventId('')
      setFormDist(DEFAULT_DIST); setFormManualPrize(false)
    } catch (err) {
      console.error('マッチ作成に失敗:', err)
      setFormError('マッチの作成に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  // ── マッチ編集保存 ──────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingMatch) return
    const capacity = parseInt(editCapacity)
    if (!Number.isInteger(capacity) || capacity < 2) {
      setEditError('定員は2名以上で入力してください')
      return
    }
    if (capacity < editingMatch.participants.length) {
      setEditError(`すでに${editingMatch.participants.length}名がエントリーしています`)
      return
    }
    setSaving(true)
    setEditError('')
    try {
      await setMatchEvent(editingMatch.id, formEventId || null)
      if (capacity !== editingMatch.capacity) {
        await updateMatch(editingMatch.id, { capacity })
      }
      setEditingMatch(null)
    } catch (err) {
      console.error('マッチ編集に失敗:', err)
      setEditError('保存に失敗しました。もう一度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (match: Match) => {
    setFormEventId(match.eventId ?? '')
    setEditCapacity(String(match.capacity))
    setEditError('')
    setEditingMatch(match)
  }

  // ── トーナメント精算開始 ──────────────────────────────────────────────────
  const startTournamentSettle = async (match: Match) => {
    setSettleError('')
    setSettlePerks({})
    setSettlingMatch(match)

    const rowCount = settleRowCount(match)
    const assign = new Array<string>(rowCount).fill('')

    // タイマーセッションがあれば暫定順位を初期値として流し込む
    if (match.timerSessionId) {
      try {
        const provisionalRankings = await getTimerProvisionalRankings(match.timerSessionId)
        for (const r of provisionalRankings) {
          if (!r.uid || !match.participants.includes(r.uid)) continue
          if (r.rank >= 1 && r.rank <= rowCount) assign[r.rank - 1] = r.uid
        }
      } catch (err) {
        console.error('暫定順位の取得に失敗:', err)
      }
    }
    setRankAssign(assign)
  }

  const handleTournamentSettle = async () => {
    if (!adminUser || !settlingMatch) return
    setSettleError('')
    // バブルラインまでは称号・順位報酬に関わるため必須
    const missing = rankAssign.findIndex((uid) => !uid)
    if (missing >= 0) {
      setSettleError(`${missing + 1}位の参加者が未選択です`)
      return
    }
    // 順位づけしなかった参加者は Busted（rank: 0）として記録する
    const busted = settlingMatch.participants.filter((uid) => !rankAssign.includes(uid))
    const parsed = [
      ...rankAssign.map((uid, i) => ({ uid, rank: i + 1 })),
      ...busted.map((uid) => ({ uid, rank: 0 })),
    ]
    setSaving(true)
    try {
      const playerNames = Object.fromEntries(allUsers.map((u) => [u.uid, u.playerName]))
      const perks: Record<string, { itemId: string; itemName: string }> = {}
      for (const [uid, itemId] of Object.entries(settlePerks)) {
        const item = benefitItems.find((it) => it.id === itemId)
        // 空選択も「付与しない」という明示指定として渡す
        perks[uid] = item ? { itemId: item.id, itemName: item.name } : { itemId: '', itemName: '' }
      }
      await settleMatch(settlingMatch, parsed, adminUser.uid, playerNames, perks)
      settlingMatch.participants.forEach((uid) => checkAndUnlockAchievements(uid).catch(() => {}))
      setSettlingMatch(null)
    } catch (err) {
      console.error('精算に失敗:', err)
      setSettleError(err instanceof Error && err.message.includes('自動配分')
        ? err.message
        : '精算に失敗しました。もう一度お試しください。')
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

  // ── 精算モーダル用の賞金表 ──────────────────────────────────────────────
  // 自動配分は精算時点のエントリー数（リエントリー込み）で確定させる
  const settleDist =
    settlingMatch && (settlingMatch.prizeMode ?? 'manual') === 'auto'
      ? computeMatchPrizes(settlingMatch)
      : null
  const settleEntries = settlingMatch
    ? settlingMatch.participants.length +
      Object.values(settlingMatch.reentries ?? {}).reduce((s, n) => s + n, 0)
    : 0
  const settlePrizeForRank = (rank: number): number => {
    if (settleDist) return settleDist.ok ? settleDist.prizes[rank - 1] ?? 0 : 0
    return settlingMatch?.distributionRules.find((r) => r.rank === rank)?.points ?? 0
  }
  const settleItm = settlingMatch ? itmCountOf(settlingMatch) : 0
  const settleBusted = settlingMatch
    ? settlingMatch.participants.filter((uid) => !rankAssign.includes(uid))
    : []

  if (!adminUser) return null

  return (
    <AdminShell title="マッチ管理">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-swan-accent text-black font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
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
                    onClick={() => handleCategoryChange(c)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                      formCat === c
                        ? c === 'tournament'
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                          : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                        : 'border-swan-border text-swan-sub'
                    }`}
                  >
                    {c === 'tournament' ? '🏆 トーナメント' : '♠ プレミアリング'}
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

            {/* イベント紐付け */}
            <div>
              <label className="text-xs text-swan-sub mb-1 block">イベント紐付け</label>
              <select
                value={formEventId}
                onChange={(e) => setFormEventId(e.target.value)}
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none"
              >
                <option value="">紐付けなし（野良マッチ）</option>
                {activeEvents.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.date?.toDate().toLocaleDateString('ja-JP')})
                  </option>
                ))}
              </select>
              {activeEvents.length === 0 && (
                <p className="text-xs text-swan-muted mt-1">開催中のイベントがありません</p>
              )}
            </div>

            {/* トーナメント専用 */}
            {formCat === 'tournament' && (
              <>
                {/* プライズ設定（既定は自動配分） */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={formManualPrize}
                      onChange={(e) => setFormManualPrize(e.target.checked)}
                      className="accent-swan-accent"
                    />
                    プライズを手動設定する
                  </label>

                  {formManualPrize ? (
                    <div>
                      <label className="text-xs text-swan-sub mb-1 block flex items-center gap-1">
                        順位別プライズ <FeatherPtIcon size={10} className="text-swan-accent" />
                      </label>
                      {formDist.map((rule, i) => (
                        <div key={i} className="flex items-center gap-2 mb-2">
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
                  ) : (
                    <div className="bg-swan-black/40 border border-swan-border rounded-lg p-3">
                      <p className="text-xs text-purple-400 mb-2">
                        エントリー数に応じてプライズを自動配分します
                      </p>
                      <PrizeTable
                        result={computePrizeDistribution({
                          entries: parseInt(formCapacity) || 0,
                          entryFee: parseInt(formFee) || 0,
                        })}
                        note={`定員 ${parseInt(formCapacity) || 0}名が満席になった場合の想定配分（実際はエントリー数・リエントリー数で変動します）`}
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={formReentry} onChange={(e) => setFormReentry(e.target.checked)}
                      className="accent-swan-accent" />
                    リエントリー可
                  </label>
                  {formReentry && (
                    <div className="ml-6">
                      <label className="text-xs text-swan-sub flex items-center gap-1 mb-1">
                        リエントリー費 <FeatherPtIcon size={10} className="text-swan-accent" />
                        <span className="text-swan-muted">（空欄でエントリー費と同額）</span>
                      </label>
                      <input
                        type="number"
                        value={formReentryFee}
                        onChange={(e) => setFormReentryFee(e.target.value)}
                        min="0"
                        placeholder={formFee || '0'}
                        className="w-32 bg-swan-black border border-swan-border rounded-lg px-3 py-1.5 text-sm text-swan-text focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            {/* プレミアリング専用 */}
            {formCat === 'ring' && (
              <div className="space-y-3">
                <p className="text-xs text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-lg px-3 py-2">
                  精算時に参加者ごとのキャッシュバック額を入力します
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" checked={formRebuy} onChange={(e) => setFormRebuy(e.target.checked)}
                      className="accent-swan-accent" />
                    リバイ可
                  </label>
                  {formRebuy && (
                    <div className="ml-6">
                      <label className="text-xs text-swan-sub flex items-center gap-1 mb-1">
                        リバイ費 <FeatherPtIcon size={10} className="text-swan-accent" />
                        <span className="text-swan-muted">（空欄でエントリー費と同額）</span>
                      </label>
                      <input
                        type="number"
                        value={formRebuyFee}
                        onChange={(e) => setFormRebuyFee(e.target.value)}
                        min="0"
                        placeholder={formFee || '100'}
                        className="w-32 bg-swan-black border border-swan-border rounded-lg px-3 py-1.5 text-sm text-swan-text focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {formError && <p className="text-red-400 text-sm text-center">{formError}</p>}
            <button type="submit" disabled={saving}
              className="w-full bg-swan-accent text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
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

        {/* ── マッチ編集モーダル ── */}
        {editingMatch && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
            <div className="bg-swan-dark border border-swan-border rounded-2xl p-6 w-full max-w-xs space-y-4">
              <p className="font-bold">マッチ編集：{editingMatch.title}</p>
              <div>
                <label className="text-xs text-swan-sub mb-1 block">イベント紐付け</label>
                <select
                  value={formEventId}
                  onChange={(e) => setFormEventId(e.target.value)}
                  className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none"
                >
                  <option value="">紐付けなし（野良マッチ）</option>
                  {activeEvents.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.date?.toDate().toLocaleDateString('ja-JP')})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-swan-sub mb-1 block">定員</label>
                <input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  min={Math.max(2, editingMatch.participants.length)}
                  className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none"
                />
                <p className="text-xs text-swan-muted mt-1">
                  現在 {editingMatch.participants.length}名エントリー済み
                </p>
              </div>
              {editError && <p className="text-red-400 text-xs">{editError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-1 bg-swan-accent text-black font-bold py-2 rounded-xl text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
                <button
                  onClick={() => setEditingMatch(null)}
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
            <div className="bg-swan-dark border-t border-swan-border w-full max-w-md mx-auto rounded-t-2xl p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <h3 className="font-bold">精算：{settlingMatch.title}</h3>

              {/* 確定プライズ（自動配分はこの時点のエントリー数で確定する） */}
              {settleDist ? (
                <div className="bg-swan-black/40 border border-swan-border rounded-lg p-3">
                  <p className="text-xs text-purple-400 mb-2">自動配分プライズ（確定）</p>
                  <PrizeTable
                    result={settleDist}
                    note={`エントリー ${settleEntries}名（リエントリー込み）で確定します`}
                    collapseOver={8}
                  />
                </div>
              ) : (
                <p className="text-xs text-swan-sub">
                  手動設定のプライズ（
                  {settlingMatch.distributionRules.filter((r) => r.points > 0).length}順位）を適用します
                </p>
              )}

              <p className="text-xs text-swan-sub">
                インマネ圏（{settleItm}名）とバブルの{Math.min(settleItm + 1, settlingMatch.participants.length)}位までを選択してください。
                選ばれなかった参加者は Busted（順位なし）として記録されます。
              </p>

              {/* 順位ごとに参加者を選ぶ */}
              {rankAssign.map((uid, i) => {
                const rank = i + 1
                const prize = settlePrizeForRank(rank)
                const isBubble = rank > settleItm
                return (
                  <div key={rank} className="space-y-1 border-b border-swan-border/40 pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold w-14 shrink-0 ${isBubble ? 'text-swan-sub' : 'text-swan-accent'}`}>
                        {rank}位
                      </span>
                      <select
                        value={uid}
                        onChange={(e) => setRankAssign(rankAssign.map((v, idx) => (idx === i ? e.target.value : v)))}
                        className="flex-1 min-w-0 bg-swan-black border border-swan-border rounded px-2 py-1 text-sm text-swan-text"
                      >
                        <option value="">選択してください</option>
                        {settlingMatch.participants
                          // 他の順位で選択済みの参加者は候補から外す（重複防止）
                          .filter((p) => p === uid || !rankAssign.includes(p))
                          .map((p) => (
                            <option key={p} value={p}>{getUserName(p)}</option>
                          ))}
                      </select>
                      <span className={`text-xs shrink-0 flex items-center gap-0.5 ${prize > 0 ? 'text-swan-accent' : 'text-swan-muted'}`}>
                        <FeatherPtIcon size={10} />{prize.toLocaleString()}
                      </span>
                    </div>
                    {isBubble && <p className="text-[10px] text-swan-muted pl-16">バブル（賞金なし）</p>}
                    {benefitItems.length > 0 && uid && (
                      <select
                        value={settlePerks[uid] ?? ''}
                        onChange={(e) => setSettlePerks({ ...settlePerks, [uid]: e.target.value })}
                        className="w-full bg-swan-black border border-swan-border rounded px-2 py-1 text-xs text-swan-text"
                      >
                        <option value="">特典なし</option>
                        {benefitItems.map((it) => (
                          <option key={it.id} value={it.id}>🎁 {it.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}

              {/* 順位づけしない参加者 */}
              {settleBusted.length > 0 && (
                <div className="bg-swan-black/40 border border-swan-border rounded-lg p-3">
                  <p className="text-xs text-swan-sub mb-1">Busted（順位なし・{settleBusted.length}名）</p>
                  <p className="text-xs text-swan-muted leading-relaxed">
                    {settleBusted.map(getUserName).join('、')}
                  </p>
                </div>
              )}

              {settleError && <p className="text-red-400 text-xs text-center">{settleError}</p>}
              <div className="flex gap-2">
                <button onClick={handleTournamentSettle} disabled={saving || (settleDist !== null && !settleDist.ok)}
                  className="flex-1 bg-swan-accent text-black font-bold py-2 rounded-lg text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
                  {saving ? '精算中...' : '精算実行'}
                </button>
                <button onClick={() => { setSettlingMatch(null); setSettleError('') }}
                  className="flex-1 bg-swan-muted text-swan-sub py-2 rounded-lg text-sm">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── プレミアリング精算モーダル ── */}
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
            const linkedEvent = activeEvents.find((e) => e.id === match.eventId)
            return (
              <div key={match.id} className="bg-swan-card border border-swan-border rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <CategoryBadge cat={cat} />
                      <StatusLabel status={match.status} />
                      {linkedEvent && (
                        <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/30 px-1.5 py-0.5 rounded">
                          {linkedEvent.title}
                        </span>
                      )}
                      {!match.eventId && (
                        <span className="text-xs text-swan-muted">野良</span>
                      )}
                      {cat === 'tournament' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${
                          (match.prizeMode ?? 'manual') === 'auto'
                            ? 'text-purple-300 border-purple-400/30 bg-purple-400/10'
                            : 'text-swan-sub border-swan-border'
                        }`}>
                          {(match.prizeMode ?? 'manual') === 'auto' ? '自動プライズ' : '手動プライズ'}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold truncate">{match.title}</p>
                    <p className="text-xs text-swan-sub mt-0.5 flex items-center gap-1 flex-wrap">
                      {match.participants.length}/{match.capacity}名
                      <FeatherPtIcon size={10} className="text-swan-accent ml-1" />
                      {match.entryFee}
                      {match.hasReentry && (
                        <span className="ml-1 text-purple-400">
                          リエントリー可{match.reentryFee && match.reentryFee !== match.entryFee ? ` (${match.reentryFee}pt)` : ''}
                        </span>
                      )}
                      {match.hasRebuy && (
                        <span className="ml-1 text-cyan-400">
                          リバイ可{match.rebuyFee && match.rebuyFee !== match.entryFee ? ` (${match.rebuyFee}pt)` : ''}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(match)}
                    className="p-1.5 text-swan-accent hover:bg-swan-accent/10 rounded-lg transition-colors shrink-0"
                    title="編集"
                  >
                    <Pencil size={14} />
                  </button>
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
                  {match.status !== 'ongoing' && (
                    <button
                      onClick={() => setDeletingMatchId(match.id)}
                      className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg ml-auto"
                    >
                      削除
                    </button>
                  )}
                </div>

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
