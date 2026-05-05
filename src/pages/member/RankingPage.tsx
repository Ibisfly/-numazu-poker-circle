import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon, BeginnerIcon } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeRanking } from '@/lib/firebase/firestore'
import type { User } from '@/types'

type Tab = 'total' | 'year'

const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) return <GoldMedalIcon size={28} />
  if (rank === 2) return <SilverMedalIcon size={28} />
  if (rank === 3) return <BronzeMedalIcon size={28} />
  return <span className="text-swan-sub font-mono text-sm w-7 text-center">{rank}</span>
}

export const RankingPage = () => {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('total')
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const field = tab === 'total' ? 'totalPoints' : 'yearPoints'
    return subscribeRanking(field, setUsers)
  }, [tab])

  return (
    <AppShell title="ランキング">
      <div className="py-4">
        {/* タブ */}
        <div className="flex bg-swan-card rounded-xl p-1 mb-5">
          {(['total', 'year'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                tab === t ? 'bg-swan-accent text-black' : 'text-swan-sub'
              }`}
            >
              {t === 'total' ? '累計' : '年間'}
            </button>
          ))}
        </div>

        {/* ランキングリスト */}
        <div className="space-y-2">
          {users.map((u, i) => {
            const rank = i + 1
            const isMe = u.uid === user?.uid
            const points = tab === 'total' ? u.totalPoints : u.yearPoints
            return (
              <div
                key={u.uid}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isMe
                    ? 'bg-swan-accent/10 border-swan-accent'
                    : 'bg-swan-card border-swan-border'
                }`}
              >
                <div className="w-8 flex justify-center shrink-0">
                  <RankBadge rank={rank} />
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <p className={`font-semibold truncate ${isMe ? 'text-swan-accent' : 'text-swan-text'}`}>
                    {u.playerName}
                  </p>
                  {u.isBeginner && <BeginnerIcon size={14} />}
                  {isMe && <span className="text-xs text-swan-accent shrink-0">(自分)</span>}
                </div>
                <p className="font-bold text-sm flex items-center gap-1 shrink-0">
                  <FeatherIcon />
                  {points.toLocaleString()}
                </p>
              </div>
            )
          })}
          {users.length === 0 && (
            <p className="text-center text-swan-sub py-12">データがありません</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
