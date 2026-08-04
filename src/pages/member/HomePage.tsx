import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { CreditCard, ShoppingBag, BeginnerIcon, BookOpen, Layers, Star, Trophy, X, ChevronDown, ChevronUp } from '@/components/ui/Icons'
import { FlyingSwanProgress } from '@/components/ui/FlyingSwanProgress'
import { DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeMatches, subscribeRecentEventSummaries, markEventSummaryAsRead,
  subscribeUnreadMatchAnnouncements, markMatchAnnouncementRead,
} from '@/lib/firebase/firestore'
import { formatRank } from '@/lib/rankLabel'
import type { Match, EventParticipantSummary, MatchResultAnnouncement } from '@/types'

const SUIT_COLORS: Record<string, string> = {
  s: 'text-gray-800',
  h: 'text-red-500',
  d: 'text-blue-500',
  c: 'text-green-600',
}
const SUIT_SYMBOLS: Record<string, string> = {
  s: '♠', h: '♥', d: '♦', c: '♣',
}

const LuckyHandCard = ({ rank, suit }: { rank: string; suit: string }) => (
  <div className={`w-10 h-14 bg-white rounded-md border border-gray-300 flex flex-col items-center justify-center shadow-sm ${SUIT_COLORS[suit]}`}>
    <span className="text-sm font-bold leading-none">{rank}</span>
    <span className="text-lg leading-none">{SUIT_SYMBOLS[suit]}</span>
  </div>
)

const parseLuckyHand = (hand: string): { rank1: string; rank2: string; suited: boolean } | null => {
  if (!hand || hand.length < 2) return null
  const rank1 = hand[0]
  const rank2 = hand[1]
  const suited = hand.endsWith('s')
  return { rank1, rank2, suited }
}

const getScoreGradient = (points: number): string => {
  if (points >= 1000) return 'from-yellow-500/30 via-amber-400/20 to-yellow-600/30 border-yellow-400/60'
  if (points >= 500) return 'from-purple-500/25 via-pink-400/15 to-purple-600/25 border-purple-400/50'
  if (points >= 200) return 'from-cyan-500/20 via-blue-400/10 to-cyan-600/20 border-cyan-400/40'
  if (points > 0) return 'from-green-500/15 via-emerald-400/10 to-green-600/15 border-green-400/30'
  if (points === 0) return 'from-swan-card to-swan-dark border-swan-border'
  if (points > -200) return 'from-orange-500/15 via-red-400/10 to-orange-600/15 border-orange-400/30'
  return 'from-red-500/20 via-rose-400/15 to-red-600/20 border-red-400/40'
}

const getScoreLabel = (points: number): { text: string; color: string } | null => {
  if (points >= 1000) return { text: 'LEGENDARY', color: 'text-yellow-400' }
  if (points >= 500) return { text: 'EXCELLENT', color: 'text-purple-400' }
  if (points >= 200) return { text: 'GREAT', color: 'text-cyan-400' }
  return null
}

// ── トーナメントリザルト発表オーバーレイ ──────────────────────────────────
const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const TournamentResultOverlay = ({
  announcement,
  onClose,
}: {
  announcement: MatchResultAnnouncement
  onClose: () => void
}) => {
  const winner = announcement.podium.find((p) => p.rank === 1)
  const others = announcement.podium.filter((p) => p.rank !== 1)
  const isWinner = announcement.myRank === 1
  const isPodium = announcement.myRank >= 1 && announcement.myRank <= 3

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center px-5 overflow-y-auto">
      <div className={`w-full max-w-sm rounded-3xl border-2 p-6 my-8 space-y-5 text-center bg-gradient-to-b ${
        isWinner
          ? 'from-yellow-500/30 via-swan-dark to-swan-black border-yellow-400/70'
          : 'from-purple-500/20 via-swan-dark to-swan-black border-swan-accent/50'
      }`}>
        {/* ヘッダー */}
        <div>
          <p className="text-3xl animate-bounce">🏆</p>
          <p className="text-xs tracking-[0.3em] text-swan-accent font-bold mt-1">TOURNAMENT RESULT</p>
          <h2 className="text-lg font-bold text-swan-text mt-1">{announcement.matchTitle}</h2>
        </div>

        {/* 優勝者発表 */}
        {winner && (
          <div className="bg-gradient-to-r from-yellow-500/20 via-amber-400/30 to-yellow-500/20 border border-yellow-400/60 rounded-2xl py-4 px-3">
            <p className="text-[10px] tracking-widest text-yellow-400 font-bold animate-pulse">CHAMPION</p>
            <p className="text-2xl font-bold text-yellow-300 mt-1">👑 {winner.playerName}</p>
            <p className="text-sm text-yellow-400/90 mt-1 flex items-center justify-center gap-1">
              <FeatherIcon size={13} />{winner.points.toLocaleString()}
              {winner.itemName && <span className="ml-1">＋🎁{winner.itemName}</span>}
            </p>
          </div>
        )}

        {/* 2位・3位 */}
        {others.length > 0 && (
          <div className="space-y-1.5">
            {others.map((p) => (
              <div key={p.rank} className="flex items-center justify-between bg-swan-card/80 border border-swan-border rounded-xl px-4 py-2">
                <span className="text-sm font-bold text-swan-text">
                  {RANK_MEDALS[p.rank] ?? `${p.rank}位`} {p.playerName}
                </span>
                <span className="text-sm text-swan-accent flex items-center gap-1">
                  <FeatherIcon size={12} />{p.points.toLocaleString()}
                  {p.itemName && <span className="text-xs">＋🎁</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 自分の成績 */}
        <div className={`rounded-xl px-4 py-3 border ${
          isPodium ? 'bg-swan-accent/10 border-swan-accent/50' : 'bg-swan-card border-swan-border'
        }`}>
          <p className="text-xs text-swan-sub">あなたの成績</p>
          <p className="text-lg font-bold text-swan-text mt-0.5">
            {RANK_MEDALS[announcement.myRank] ?? ''} {formatRank(announcement.myRank)}
            {announcement.myPoints > 0 && (
              <span className="text-swan-accent ml-2 text-base">
                +{announcement.myPoints.toLocaleString()} 🪶
              </span>
            )}
          </p>
          {announcement.myItemName && (
            <p className="text-xs text-pink-400 mt-1">特典「{announcement.myItemName}」を獲得しました！</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-swan-accent text-black font-bold py-3 rounded-xl text-sm active:scale-[0.98] transition-transform"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

export const HomePage = () => {
  const { user } = useAuth()
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null)
  const [eventSummaries, setEventSummaries] = useState<EventParticipantSummary[]>([])
  const [expandedSummary, setExpandedSummary] = useState<string | null>(null)
  const [announcements, setAnnouncements] = useState<MatchResultAnnouncement[]>([])

  useEffect(() => {
    return subscribeMatches((matches) => {
      const recruiting = matches.find((m) => m.status === 'recruiting')
      setUpcomingMatch(recruiting ?? null)
    })
  }, [])

  useEffect(() => {
    if (!user) return
    return subscribeRecentEventSummaries(user.uid, (summaries) => {
      setEventSummaries(summaries)
      // 未読のものを既読にする
      summaries.filter((s) => !s.isRead).forEach((s) => markEventSummaryAsRead(s.id))
    })
  }, [user])

  // トーナメントのリザルト発表（未読のみ。閉じるまで既読にしない）
  useEffect(() => {
    if (!user) return
    return subscribeUnreadMatchAnnouncements(user.uid, setAnnouncements)
  }, [user])

  if (!user) return null

  const currentAnnouncement = announcements[0] ?? null

  return (
    <AppShell>
      {/* トーナメントリザルト発表（未読がある場合、1件ずつ表示） */}
      {currentAnnouncement && (
        <TournamentResultOverlay
          announcement={currentAnnouncement}
          onClose={() => markMatchAnnouncementRead(currentAnnouncement.id)}
        />
      )}
      <div className="py-6 space-y-5">

        {/* ① こんにちは + 保有ポイント */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-swan-sub text-sm">こんにちは</p>
            <h2 className="text-xl font-bold text-swan-text flex items-center gap-2">
              {user.playerName}
              {user.isBeginner && <BeginnerIcon size={18} />}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-swan-sub text-xs">保有ポイント</p>
            <p className="text-lg font-bold text-swan-accent flex items-center gap-1 justify-end">
              <FeatherIcon size={16} />
              {(user.ownedPoints ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        {/* イベントサマリー */}
        {eventSummaries.map((summary) => {
          const gradient = getScoreGradient(summary.totalEarnedPoints)
          const label = getScoreLabel(summary.totalEarnedPoints)
          const isExpanded = expandedSummary === summary.id
          return (
          <div key={summary.id} className={`bg-gradient-to-br ${gradient} border rounded-xl overflow-hidden transition-all`}>
            <div
              className="p-4 cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => setExpandedSummary(isExpanded ? null : summary.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy size={20} className={summary.totalEarnedPoints >= 500 ? 'text-yellow-400' : 'text-swan-accent'} />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-swan-accent font-semibold">成績</p>
                      {label && (
                        <span className={`text-[10px] font-bold ${label.color} tracking-wider animate-pulse`}>
                          {label.text}
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-swan-text">{summary.eventTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-swan-sub">獲得</p>
                    <p className={`text-xl font-bold flex items-center gap-1 justify-end ${
                      summary.totalEarnedPoints >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {summary.totalEarnedPoints >= 0 ? '+' : ''}
                      {summary.totalEarnedPoints.toLocaleString()}
                      <FeatherIcon size={14} />
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp size={16} className="text-swan-sub" /> : <ChevronDown size={16} className="text-swan-sub" />}
                </div>
              </div>
            </div>

            {expandedSummary === summary.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-swan-border/50 pt-3">
                {/* 来店ポイント */}
                <div className="flex justify-between text-sm">
                  <span className="text-swan-sub">来店ポイント</span>
                  <span className="text-swan-text">+{summary.attendancePoints}</span>
                </div>

                {/* トーナメント */}
                {summary.tournamentResults.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-purple-400 font-semibold">トーナメント</p>
                    {summary.tournamentResults.map((r) => (
                      <div key={r.matchId} className="flex justify-between text-sm pl-2">
                        <span className="text-swan-sub">{r.title} ({formatRank(r.rank)})</span>
                        <span className={r.earnedPoints >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {r.earnedPoints >= 0 ? '+' : ''}{r.earnedPoints}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* リング */}
                {summary.ringResults.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-cyan-400 font-semibold">プレミアリング</p>
                    {summary.ringResults.map((r) => (
                      <div key={r.matchId} className="flex justify-between text-sm pl-2">
                        <span className="text-swan-sub">{r.title}</span>
                        <span className={r.netPoints >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {r.netPoints >= 0 ? '+' : ''}{r.netPoints}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ビンゴ */}
                {summary.bingoResults.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-yellow-400 font-semibold">ビンゴ</p>
                    {summary.bingoResults.map((r) => (
                      <div key={r.bingoCardId} className="flex justify-between text-sm pl-2">
                        <span className="text-swan-sub">{r.name} ({r.completedCells}マス/{r.bingoCount}ビンゴ)</span>
                        <span className="text-green-400">+{r.earnedPoints}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setEventSummaries((prev) => prev.filter((s) => s.id !== summary.id))
                  }}
                  className="w-full mt-2 py-2 text-xs text-swan-sub border border-swan-border/50 rounded-lg hover:bg-swan-dark/50 flex items-center justify-center gap-1 active:scale-[0.98] transition-transform"
                >
                  <X size={12} />
                  非表示
                </button>
              </div>
            )}
          </div>
        )})}


        {/* ② 初心者向けガイドブック誘導 */}
        {user.isBeginner && (
          <Link
            to="/guide"
            className="relative block bg-gradient-to-r from-green-500/20 via-yellow-500/20 to-green-500/20 border-2 border-green-400/50 rounded-xl p-3 hover:opacity-90 transition-all"
          >
            <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-400 rounded-full flex items-center justify-center animate-bounce">
              <span className="text-xs font-bold text-black">!</span>
            </div>
            <div className="flex items-center gap-3">
              <BeginnerIcon size={24} />
              <div className="flex-1">
                <p className="font-bold text-green-400 text-sm">初心者の方へ</p>
                <p className="text-xs text-swan-sub">まずはガイドブックをチェック！</p>
              </div>
            </div>
          </Link>
        )}

        {/* ラッキーハンド（有効期限内のみ表示） */}
        {(() => {
          const expiry = user.luckyHandExpiry?.toDate()
          const isValid = expiry && expiry > new Date()
          const parsed = isValid ? parseLuckyHand(user.luckyHand ?? '') : null
          if (!parsed) return null
          return (
            <div className="bg-gradient-to-r from-yellow-500/20 via-amber-500/20 to-yellow-500/20 border border-yellow-500/40 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <Star size={20} className="text-yellow-400" />
                <div className="flex-1">
                  <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide">Today's Lucky Hand</p>
                  <p className="text-swan-sub text-[10px]">今日のラッキーハンド</p>
                </div>
                <div className="flex gap-1">
                  <LuckyHandCard rank={parsed.rank1} suit={parsed.suited ? 'h' : 's'} />
                  <LuckyHandCard rank={parsed.rank2} suit={parsed.suited ? 'h' : 'd'} />
                </div>
              </div>
              <p className="text-[9px] text-swan-muted mt-2 text-center">
                ※ {parsed.suited ? 'スーテッドであればスートは不問' : 'ポケットペアのスートは不問'}
              </p>
            </div>
          )
        })()}

        {/* ③ クイックリンク */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/card"
            className="bg-swan-card border border-swan-border rounded-xl p-4 flex items-center gap-3 hover:border-swan-accent transition-colors"
          >
            <CreditCard size={28} className="text-swan-accent" />
            <span className="text-sm font-medium text-swan-text">会員証</span>
          </Link>
          <Link
            to="/guide"
            className="bg-swan-card border border-swan-border rounded-xl p-4 flex items-center gap-3 hover:border-swan-accent transition-colors"
          >
            <BookOpen size={28} className="text-green-400" />
            <span className="text-sm font-medium text-swan-text">ガイド</span>
          </Link>
          <Link
            to="/bingo"
            className="bg-swan-card border border-swan-border rounded-xl p-4 flex items-center gap-3 hover:border-swan-accent transition-colors"
          >
            <Layers size={28} className="text-purple-400" />
            <span className="text-sm font-medium text-swan-text">ビンゴ</span>
          </Link>
          <Link
            to="/shop"
            className="bg-swan-card border border-swan-border rounded-xl p-4 flex items-center gap-3 hover:border-swan-accent transition-colors"
          >
            <ShoppingBag size={28} className="text-swan-accent" />
            <span className="text-sm font-medium text-swan-text">ショップ</span>
          </Link>
        </div>

        {/* ③ Cygne Noir 進行度 */}
        <div>
          <p className="text-xs text-swan-sub mb-2 uppercase tracking-widest font-semibold">
            Cygne Noir
          </p>
          <FlyingSwanProgress
            totalPoints={user.totalPoints}
            color={user.avatarColor ?? DEFAULT_AVATAR_COLOR}
          />
        </div>

        {/* ④ 受付中のマッチ */}
        {upcomingMatch && (
          <Link
            to={`/matches/${upcomingMatch.id}`}
            className="block bg-swan-card border border-swan-border rounded-xl p-4 hover:border-swan-accent transition-colors"
          >
            <p className="text-xs text-swan-accent mb-1 font-medium">エントリー受付中</p>
            <p className="font-semibold text-swan-text">{upcomingMatch.title}</p>
            <p className="text-sm text-swan-sub mt-1 flex items-center gap-1">
              エントリー費 <FeatherIcon /> {upcomingMatch.entryFee.toLocaleString()} ・定員 {upcomingMatch.capacity}名
            </p>
          </Link>
        )}

      </div>
    </AppShell>
  )
}
