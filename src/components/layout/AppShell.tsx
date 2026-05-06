import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronLeft } from '@/components/ui/Icons'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeNotifications, subscribeUserAchievements } from '@/lib/firebase/firestore'
import type { Notification } from '@/types'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { AchievementCutIn, type CutInItem } from '@/components/ui/AchievementCutIn'

interface AppShellProps {
  children: ReactNode
  title?: string
  showBack?: boolean
  onBack?: () => void
}

export const AppShell = ({ children, title, showBack, onBack }: AppShellProps) => {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [cutInQueue, setCutInQueue] = useState<CutInItem[]>([])

  // セッション開始時に既存の実績IDを記録し、新規解除のみカットインを表示
  const seenIds = useRef<Set<string>>(new Set())
  const initialized = useRef(false)

  useEffect(() => {
    if (!user) return
    return subscribeNotifications(user.uid, (notifs: Notification[]) => {
      setUnreadCount(notifs.filter((n) => !n.isRead).length)
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeUserAchievements(user.uid, (achievements) => {
      if (!initialized.current) {
        // 初回ロード：既存の実績は既読扱い（カットイン不要）
        achievements.forEach((a) => seenIds.current.add(a.achievementId))
        initialized.current = true
        return
      }
      // セッション中に新たに追加されたもののみ
      const newOnes = achievements.filter((a) => !seenIds.current.has(a.achievementId))
      if (newOnes.length > 0) {
        newOnes.forEach((a) => seenIds.current.add(a.achievementId))
        setCutInQueue((prev) => [
          ...prev,
          ...newOnes.map((a) => ({
            achievementId: a.achievementId,
            name: ACHIEVEMENTS.find((ach) => ach.id === a.achievementId)?.name ?? '実績解除！',
          })),
        ])
      }
    })
  }, [user])

  const dismissCutIn = () => setCutInQueue((prev) => prev.slice(1))

  return (
    <div className="min-h-screen bg-swan-black text-swan-text flex flex-col max-w-md mx-auto relative">
      <header className="sticky top-0 z-40 bg-swan-dark border-b border-swan-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={onBack}
              className="text-swan-sub hover:text-swan-text transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {title ? (
            <h1 className="text-base font-semibold">{title}</h1>
          ) : (
            <span className="font-bold tracking-widest text-swan-accent text-sm">
              NUMAZU POKER
            </span>
          )}
        </div>
        <Link to="/notifications" className="relative p-2">
          <Bell size={20} className="text-swan-sub" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>
      </header>

      {/* 実績解除カットイン */}
      <AchievementCutIn queue={cutInQueue} onDismiss={dismissCutIn} />

      <main className="flex-1 overflow-y-auto pb-20 px-4">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
