import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { CreditCard, ShoppingBag, BeginnerIcon, BookOpen, Layers, Star } from '@/components/ui/Icons'
import { FlyingSwanProgress } from '@/components/ui/FlyingSwanProgress'
import { DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeMatches } from '@/lib/firebase/firestore'
import type { Match } from '@/types'

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

export const HomePage = () => {
  const { user } = useAuth()
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null)

  useEffect(() => {
    return subscribeMatches((matches) => {
      const recruiting = matches.find((m) => m.status === 'recruiting')
      setUpcomingMatch(recruiting ?? null)
    })
  }, [])

  if (!user) return null

  return (
    <AppShell>
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
