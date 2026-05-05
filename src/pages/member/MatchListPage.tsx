import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { SpadeIcon } from '@/components/ui/Icons'
import { subscribeMatches } from '@/lib/firebase/firestore'
import type { Match, MatchStatus } from '@/types'

const STATUS_CONFIG: Record<MatchStatus, { label: string; color: string }> = {
  recruiting: { label: '受付中', color: 'text-green-400' },
  ongoing: { label: '開催中', color: 'text-yellow-400' },
  finished: { label: '終了', color: 'text-swan-sub' },
}

export const MatchListPage = () => {
  const [matches, setMatches] = useState<Match[]>([])

  useEffect(() => {
    return subscribeMatches(setMatches)
  }, [])

  return (
    <AppShell title="ポイントマッチ">
      <div className="py-4 space-y-3">
        {matches.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-swan-sub">
            <SpadeIcon size={40} className="opacity-30" />
            <p className="text-sm">マッチはまだありません</p>
          </div>
        )}
        {matches.map((match) => {
          const { label, color } = STATUS_CONFIG[match.status]
          return (
            <Link
              key={match.id}
              to={`/matches/${match.id}`}
              className="block bg-swan-card border border-swan-border rounded-xl px-4 py-4 hover:border-swan-accent transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {(match.matchCategory ?? 'tournament') === 'tournament' ? (
                      <span className="text-xs font-bold text-purple-400 bg-purple-400/10 border border-purple-400/30 px-1.5 py-0.5 rounded-full">トーナメント</span>
                    ) : (
                      <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-1.5 py-0.5 rounded-full">リングゲーム</span>
                    )}
                    {match.hasReentry && <span className="text-xs text-purple-400">リエントリー可</span>}
                    {match.hasBounty  && <span className="text-xs text-orange-400">バウンティ</span>}
                    {match.hasRebuy   && <span className="text-xs text-cyan-400">リバイ可</span>}
                  </div>
                  <h3 className="font-semibold text-swan-text">{match.title}</h3>
                </div>
                <span className={`text-xs font-medium shrink-0 ml-2 ${color}`}>{label}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-swan-sub">
                <span className="flex items-center gap-1">
                  <FeatherIcon /> {match.entryFee.toLocaleString()} entry
                </span>
                <span>定員 {match.capacity}名</span>
                <span>{match.participants.length}名エントリー</span>
              </div>
            </Link>
          )
        })}
      </div>
    </AppShell>
  )
}
