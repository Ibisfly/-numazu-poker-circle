import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeUserAchievements } from '@/lib/firebase/firestore'
import { AchievementUnlockModal } from '@/components/ui/AchievementUnlockModal'

const AchievementContext = createContext<null>(null)

export const AchievementProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth()
  const [queue, setQueue]             = useState<string[]>([])
  const [prevIds, setPrevIds]         = useState<Set<string> | null>(null)

  useEffect(() => {
    if (!user) return
    return subscribeUserAchievements(user.uid, (achievements) => {
      const currentIds = new Set(achievements.map((a) => a.achievementId))

      if (prevIds === null) {
        // 初回ロード: 既存実績をベースとして記録（祝福しない）
        setPrevIds(currentIds)
        return
      }

      // 新規解除を検出
      const newlyUnlocked = [...currentIds].filter((id) => !prevIds.has(id))
      if (newlyUnlocked.length > 0) {
        setQueue((q) => [...q, ...newlyUnlocked])
      }
      setPrevIds(currentIds)
    })
  }, [user?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const dismissFirst = () => setQueue((q) => q.slice(1))

  return (
    <AchievementContext.Provider value={null}>
      {children}
      {queue[0] && (
        <AchievementUnlockModal
          key={queue[0]}
          achievementId={queue[0]}
          onClose={dismissFirst}
        />
      )}
    </AchievementContext.Provider>
  )
}

export const useAchievement = () => useContext(AchievementContext)
