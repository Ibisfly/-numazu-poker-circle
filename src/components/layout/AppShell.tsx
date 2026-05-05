import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, ChevronLeft } from '@/components/ui/Icons'
import { BottomNav } from './BottomNav'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeNotifications } from '@/lib/firebase/firestore'
import type { Notification } from '@/types'

interface AppShellProps {
  children: ReactNode
  title?: string
  showBack?: boolean
  onBack?: () => void
}

export const AppShell = ({ children, title, showBack, onBack }: AppShellProps) => {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    return subscribeNotifications(user.uid, (notifs: Notification[]) => {
      setUnreadCount(notifs.filter((n) => !n.isRead).length)
    })
  }, [user])

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

      <main className="flex-1 overflow-y-auto pb-20 px-4">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
