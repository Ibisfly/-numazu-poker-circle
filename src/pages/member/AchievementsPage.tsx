import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Lock } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeUserAchievements } from '@/lib/firebase/firestore'
import type { UserAchievement } from '@/types'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { AchievementIcon } from '@/components/ui/AchievementIcons'

export const AchievementsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])

  useEffect(() => {
    if (!user) return
    return subscribeUserAchievements(user.uid, setUserAchievements)
  }, [user])

  const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))
  const unlockedCount = userAchievements.length

  return (
    <AppShell title="実績" showBack onBack={() => navigate('/profile')}>
      <div className="py-4">
        <p className="text-swan-sub text-sm mb-5">
          {unlockedCount} / {ACHIEVEMENTS.length} 解除済み
        </p>
        <div className="space-y-3">
          {ACHIEVEMENTS.map((ach) => {
            const unlocked = unlockedMap.get(ach.id)
            const isSecret = ach.isSecret ?? false
            const isLocked = !unlocked

            // シークレット実績は未解除時に名前・説明を隠す
            const displayName = isSecret && isLocked ? '???' : ach.name
            const displayDesc = isSecret && isLocked ? 'シークレット実績' : ach.description

            return (
              <div
                key={ach.id}
                className={`bg-swan-card border rounded-xl px-4 py-4 flex items-center gap-4 transition-opacity ${
                  unlocked
                    ? 'border-swan-accent/40'
                    : isSecret
                    ? 'border-purple-500/20 opacity-35'
                    : 'border-swan-border opacity-50'
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {unlocked ? (
                    <AchievementIcon achievementId={ach.id} size={36} />
                  ) : (
                    <Lock size={22} className={isSecret ? 'text-purple-400/50' : 'text-swan-muted'} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-semibold truncate ${unlocked ? 'text-swan-text' : 'text-swan-sub'}`}>
                      {displayName}
                    </p>
                    {isSecret && !unlocked && (
                      <span className="text-xs text-purple-400/60 border border-purple-400/30 px-1.5 py-0.5 rounded-full shrink-0">
                        SECRET
                      </span>
                    )}
                    {isSecret && unlocked && (
                      <span className="text-xs text-purple-400 border border-purple-400/40 px-1.5 py-0.5 rounded-full shrink-0">
                        SECRET
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-swan-sub mt-0.5">{displayDesc}</p>
                  {unlocked && (
                    <p className="text-xs text-swan-accent mt-1">
                      解除日: {unlocked.unlockedAt?.toDate().toLocaleDateString('ja-JP')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
