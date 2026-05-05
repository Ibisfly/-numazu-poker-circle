import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { CreditCard, ShoppingBag, BeginnerIcon } from '@/components/ui/Icons'
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

        {/* ② クイックリンク（会員証・ショップ） */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/card"
            className="bg-swan-card border border-swan-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-swan-accent transition-colors"
          >
            <CreditCard size={28} className="text-swan-accent" />
            <p className="text-xs text-swan-sub">会員証</p>
          </Link>
          <Link
            to="/shop"
            className="bg-swan-card border border-swan-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-swan-accent transition-colors"
          >
            <ShoppingBag size={28} className="text-swan-accent" />
            <p className="text-xs text-swan-sub">ショップ</p>
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
