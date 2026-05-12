import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { CreditCard, ShoppingBag, BeginnerIcon, BookOpen, Layers } from '@/components/ui/Icons'
import { FlyingSwanProgress } from '@/components/ui/FlyingSwanProgress'
import { DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribePointLogs, subscribeMatches } from '@/lib/firebase/firestore'
import type { PointLog, Match } from '@/types'

export const HomePage = () => {
  const { user } = useAuth()
  const [recentLogs, setRecentLogs] = useState<PointLog[]>([])
  const [upcomingMatch, setUpcomingMatch] = useState<Match | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribePointLogs(user.uid, (logs) => setRecentLogs(logs.slice(0, 3)))
  }, [user])

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

        {/* ③ クイックリンク */}
        <div className="grid grid-cols-4 gap-2">
          <Link
            to="/card"
            className="bg-swan-card border border-swan-border rounded-xl p-2.5 flex flex-col items-center gap-1 hover:border-swan-accent transition-colors"
          >
            <CreditCard size={22} className="text-swan-accent" />
            <p className="text-[9px] text-swan-sub">会員証</p>
          </Link>
          <Link
            to="/guide"
            className="bg-swan-card border border-swan-border rounded-xl p-2.5 flex flex-col items-center gap-1 hover:border-swan-accent transition-colors"
          >
            <BookOpen size={22} className="text-green-400" />
            <p className="text-[9px] text-swan-sub">ガイド</p>
          </Link>
          <Link
            to="/bingo"
            className="bg-swan-card border border-swan-border rounded-xl p-2.5 flex flex-col items-center gap-1 hover:border-swan-accent transition-colors"
          >
            <Layers size={22} className="text-purple-400" />
            <p className="text-[9px] text-swan-sub">ビンゴ</p>
          </Link>
          <Link
            to="/shop"
            className="bg-swan-card border border-swan-border rounded-xl p-2.5 flex flex-col items-center gap-1 hover:border-swan-accent transition-colors"
          >
            <ShoppingBag size={22} className="text-swan-accent" />
            <p className="text-[9px] text-swan-sub">ショップ</p>
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

        {/* ⑤ ポイント履歴 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-swan-sub uppercase tracking-wide">最近の履歴</h3>
            <Link to="/profile" className="text-xs text-swan-accent">すべて見る</Link>
          </div>
          {recentLogs.length === 0 ? (
            <p className="text-swan-sub text-sm">まだポイント履歴はありません</p>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between bg-swan-card rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-swan-text">{log.description}</p>
                    <p className="text-xs text-swan-sub">
                      {log.createdAt?.toDate().toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <p className={`font-bold text-sm flex items-center gap-1 ${log.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {log.amount >= 0 ? '+' : ''}{log.amount.toLocaleString()}
                    <FeatherIcon />
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  )
}
