import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Lock } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeUserAchievements, subscribeAchievementStats } from '@/lib/firebase/firestore'
import type { UserAchievement } from '@/types'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { AchievementIcon } from '@/components/ui/AchievementIcons'

const RarityBadge = ({ percent }: { percent: number }) => {
  let color = 'text-swan-sub'
  let label = ''

  if (percent <= 5) {
    color = 'text-yellow-400'
    label = 'レア'
  } else if (percent <= 15) {
    color = 'text-purple-400'
    label = '希少'
  } else if (percent <= 30) {
    color = 'text-cyan-400'
    label = ''
  }

  return (
    <span className={`text-[10px] ${color}`}>
      {percent.toFixed(1)}%{label && ` ${label}`}
    </span>
  )
}

export const AchievementsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [achievementStats, setAchievementStats] = useState<Map<string, { count: number; total: number }>>(new Map())

  useEffect(() => {
    if (!user) return
    return subscribeUserAchievements(user.uid, setUserAchievements)
  }, [user])

  useEffect(() => {
    return subscribeAchievementStats(setAchievementStats)
  }, [])

  const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))
  const unlockedCount = userAchievements.length

  return (
    <AppShell title="実績" showBack onBack={() => navigate('/profile')}>
      <div className="py-4 space-y-4">
        {/* 進捗 */}
        <div className="bg-swan-card border border-swan-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-swan-sub text-sm">実績コンプリート</span>
            <span className="text-swan-accent font-bold">
              {unlockedCount} / {ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="h-2 bg-swan-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-swan-accent to-yellow-400 transition-all duration-500"
              style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 実績リスト */}
        <div className="space-y-2">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedMap.get(ach.id)
            const isSecret = ach.isSecret ?? false
            const isLocked = !unlocked
            const stats = achievementStats.get(ach.id)
            const percent = stats && stats.total > 0 ? (stats.count / stats.total) * 100 : 0

            return (
              <div
                key={ach.id}
                className={`bg-swan-card border rounded-xl p-4 transition-all ${
                  unlocked
                    ? 'border-swan-accent/50'
                    : isSecret
                    ? 'border-purple-500/30'
                    : 'border-swan-border'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 flex items-center justify-center shrink-0">
                    {unlocked ? (
                      <AchievementIcon achievementId={ach.id} size={40} />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-swan-dark flex items-center justify-center">
                        <Lock
                          size={20}
                          className={isSecret ? 'text-purple-400/50' : 'text-swan-muted'}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-bold text-sm ${unlocked ? 'text-swan-text' : 'text-swan-sub'}`}>
                          {isSecret && isLocked ? '???' : ach.name}
                        </h3>
                        {isSecret && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                              unlocked
                                ? 'text-purple-400 border-purple-400/40'
                                : 'text-purple-400/60 border-purple-400/30'
                            }`}
                          >
                            SECRET
                          </span>
                        )}
                      </div>
                      {stats && stats.total > 0 && (
                        <RarityBadge percent={percent} />
                      )}
                    </div>
                    <p className="text-xs text-swan-sub mt-1">
                      {isSecret && isLocked ? 'シークレット実績' : ach.description}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      {unlocked ? (
                        <p className="text-[10px] text-swan-accent">
                          解除: {unlocked.unlockedAt?.toDate().toLocaleDateString('ja-JP')}
                        </p>
                      ) : (
                        <span />
                      )}
                      {stats && stats.total > 0 && (
                        <p className="text-[10px] text-swan-muted">
                          {stats.count}/{stats.total}人が取得
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
