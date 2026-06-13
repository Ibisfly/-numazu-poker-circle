import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { SwanAvatar, DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, BeginnerIcon } from '@/components/ui/Icons'
import { TitleBadge } from '@/components/ui/TitleBadge'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeRanking, getMatchPointsTotals } from '@/lib/firebase/firestore'
import type { User } from '@/types'

type Tab = 'total' | 'year' | 'tournament' | 'ring'

const TAB_LABELS: Record<Tab, string> = {
  total: '累計',
  year: '年間',
  tournament: 'トナメ',
  ring: 'リング',
}

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <GoldMedalIcon size={36} />
  if (rank === 2) return <SilverMedalIcon size={36} />
  if (rank === 3) return <BronzeMedalIcon size={36} />
  return (
    <div className="w-9 h-9 flex items-center justify-center rounded-full bg-swan-card border border-swan-border">
      <span className="text-swan-sub font-bold text-sm">{rank}</span>
    </div>
  )
}

const getRankGradient = (rank: number) => {
  if (rank === 1) return 'from-yellow-500/20 via-amber-400/10 to-transparent'
  if (rank === 2) return 'from-gray-300/20 via-slate-400/10 to-transparent'
  if (rank === 3) return 'from-amber-600/20 via-orange-400/10 to-transparent'
  return ''
}

const getRankBorder = (rank: number, isMe: boolean) => {
  if (isMe) return 'border-swan-accent'
  if (rank === 1) return 'border-yellow-500/50'
  if (rank === 2) return 'border-gray-400/50'
  if (rank === 3) return 'border-amber-600/50'
  return 'border-swan-border'
}

export const RankingPage = () => {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('total')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [matchTotals, setMatchTotals] = useState<{
    tournamentEarnings: Map<string, number>
    ringNet: Map<string, number>
  } | null>(null)

  useEffect(() => {
    // 全タブでアクティブユーザー一覧が必要（マッチ系タブは集計値と突き合わせる）
    const field = tab === 'year' ? 'yearPoints' : 'totalPoints'
    return subscribeRanking(field, setAllUsers)
  }, [tab])

  useEffect(() => {
    if (tab !== 'tournament' && tab !== 'ring') return
    getMatchPointsTotals().then(setMatchTotals).catch(() => setMatchTotals(null))
  }, [tab])

  // 管理者もランキングに表示する
  const rankedEntries: { user: User; value: number }[] = (() => {
    if (tab === 'total' || tab === 'year') {
      return allUsers
        .map((u) => ({ user: u, value: tab === 'total' ? u.totalPoints : u.yearPoints }))
        .slice(0, 5)
    }
    if (!matchTotals) return []
    const totals = tab === 'tournament' ? matchTotals.tournamentEarnings : matchTotals.ringNet
    return allUsers
      .filter((u) => totals.has(u.uid))
      .map((u) => ({ user: u, value: totals.get(u.uid) ?? 0 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  })()

  const rankedUsers = rankedEntries.map((e) => e.user)

  return (
    <AppShell title="ランキング">
      <div className="py-4">
        {/* タブ */}
        <div className="flex bg-swan-card rounded-xl p-1 mb-2">
          {(['total', 'year', 'tournament', 'ring'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors ${
                tab === t ? 'bg-swan-accent text-black' : 'text-swan-sub'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
        <p className="text-xs text-swan-muted text-center mb-6">
          {tab === 'total' && '獲得ポイントの累計ランキング'}
          {tab === 'year' && '今年の獲得ポイントランキング'}
          {tab === 'tournament' && 'トーナメント賞金の合計ランキング'}
          {tab === 'ring' && 'プレミアリングの収支ランキング'}
        </p>

        {/* トップ3 ポディウム */}
        {rankedUsers.length >= 3 && (
          <div className="flex items-end justify-center gap-2 mb-6 px-2">
            {/* 2位 */}
            <div className="flex-1 flex flex-col items-center">
              <SwanAvatar
                color={rankedUsers[1].avatarColor ?? DEFAULT_AVATAR_COLOR}
                size={48}
                frame={rankedUsers[1].equippedFrame}
                variant={rankedUsers[1].avatarVariant}
              />
              <p className="text-xs font-semibold text-swan-text mt-1 truncate max-w-full text-center">
                {rankedUsers[1].playerName}
              </p>
              <div className="w-full bg-gradient-to-t from-gray-400/30 to-gray-300/10 rounded-t-lg mt-2 h-16 flex items-end justify-center pb-2">
                <SilverMedalIcon size={28} />
              </div>
            </div>

            {/* 1位 */}
            <div className="flex-1 flex flex-col items-center">
              <SwanAvatar
                color={rankedUsers[0].avatarColor ?? DEFAULT_AVATAR_COLOR}
                size={56}
                frame={rankedUsers[0].equippedFrame}
                variant={rankedUsers[0].avatarVariant}
              />
              <p className="text-xs font-bold text-swan-accent mt-1 truncate max-w-full text-center">
                {rankedUsers[0].playerName}
              </p>
              <div className="w-full bg-gradient-to-t from-yellow-500/30 to-amber-400/10 rounded-t-lg mt-2 h-24 flex items-end justify-center pb-2">
                <GoldMedalIcon size={32} />
              </div>
            </div>

            {/* 3位 */}
            <div className="flex-1 flex flex-col items-center">
              <SwanAvatar
                color={rankedUsers[2].avatarColor ?? DEFAULT_AVATAR_COLOR}
                size={44}
                frame={rankedUsers[2].equippedFrame}
                variant={rankedUsers[2].avatarVariant}
              />
              <p className="text-xs font-semibold text-swan-text mt-1 truncate max-w-full text-center">
                {rankedUsers[2].playerName}
              </p>
              <div className="w-full bg-gradient-to-t from-amber-600/30 to-orange-400/10 rounded-t-lg mt-2 h-12 flex items-end justify-center pb-2">
                <BronzeMedalIcon size={24} />
              </div>
            </div>
          </div>
        )}

        {/* ランキングリスト */}
        <div className="space-y-3">
          {rankedEntries.map(({ user: u, value: points }, i) => {
            const rank = i + 1
            const isMe = u.uid === user?.uid
            const gradient = getRankGradient(rank)
            const borderColor = getRankBorder(rank, isMe)

            return (
              <div
                key={u.uid}
                className={`relative overflow-hidden flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all ${borderColor} ${
                  isMe ? 'bg-swan-accent/10' : 'bg-swan-card'
                } ${rank <= 3 ? 'shadow-lg' : ''}`}
              >
                {gradient && (
                  <div className={`absolute inset-0 bg-gradient-to-r ${gradient} pointer-events-none`} />
                )}
                <div className="relative z-10 flex items-center gap-3 flex-1 min-w-0">
                  <RankBadge rank={rank} />
                  <SwanAvatar
                    color={u.avatarColor ?? DEFAULT_AVATAR_COLOR}
                    size={40}
                    frame={u.equippedFrame}
                    variant={u.avatarVariant}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`font-bold truncate ${rank === 1 ? 'text-yellow-400' : isMe ? 'text-swan-accent' : 'text-swan-text'}`}>
                        {u.playerName}
                      </p>
                      {u.isBeginner && <BeginnerIcon size={14} />}
                      {u.role === 'admin' && (
                        <span className="text-[10px] text-swan-sub border border-swan-border px-1 py-0.5 rounded shrink-0">運営</span>
                      )}
                      {isMe && <span className="text-xs text-swan-accent shrink-0">(自分)</span>}
                    </div>
                    {u.equippedTitle && (
                      <div className="mt-0.5">
                        <TitleBadge title={u.equippedTitle} tier={u.equippedTitleTier ?? 'common'} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative z-10 text-right shrink-0">
                  <p className={`font-bold text-lg flex items-center gap-1 justify-end ${
                    points < 0 ? 'text-red-400' : rank === 1 ? 'text-yellow-400' : 'text-swan-accent'
                  }`}>
                    <FeatherIcon size={16} />
                    {tab === 'ring' && points > 0 ? '+' : ''}{points.toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })}
          {rankedUsers.length === 0 && (
            <p className="text-center text-swan-sub py-12">データがありません</p>
          )}
        </div>

        {/* 注釈 */}
        <p className="text-xs text-swan-muted text-center mt-6">
          上位5名を表示しています
        </p>
      </div>
    </AppShell>
  )
}
