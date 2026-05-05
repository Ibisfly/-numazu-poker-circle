import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { CheckCircle2, FeatherPtIcon, Award, SpadeIcon, Trophy } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/firebase/firestore'
import type { Notification } from '@/types'

const TypeIcon = ({ type }: { type: string }) => {
  const cls = 'shrink-0 mt-0.5'
  if (type === 'approval') return <CheckCircle2 size={20} className={`${cls} text-green-400`} />
  if (type === 'point_awarded') return <FeatherPtIcon size={20} className={`${cls} text-swan-accent`} />
  if (type === 'achievement') return <Award size={20} className={`${cls} text-yellow-400`} />
  if (type === 'match_started') return <SpadeIcon size={20} className={`${cls} text-swan-sub`} />
  if (type === 'match_result') return <Trophy size={20} className={`${cls} text-swan-accent`} />
  return <CheckCircle2 size={20} className={`${cls} text-swan-sub`} />
}

export const NotificationsPage = () => {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!user) return
    return subscribeNotifications(user.uid, setNotifications)
  }, [user])

  const handleMarkAll = async () => {
    if (!user) return
    await markAllNotificationsRead(user.uid)
  }

  const handleRead = async (notif: Notification) => {
    if (notif.isRead) return
    await markNotificationRead(notif.id)
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <AppShell title="通知">
      <div className="py-4">
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="text-xs text-swan-accent mb-4 block ml-auto">
            すべて既読にする
          </button>
        )}
        {notifications.length === 0 ? (
          <p className="text-center text-swan-sub py-12">通知はありません</p>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleRead(notif)}
                className={`bg-swan-card border rounded-xl px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${
                  notif.isRead ? 'border-swan-border' : 'border-swan-accent/40 bg-swan-accent/5'
                }`}
              >
                <TypeIcon type={notif.type} />
                <div className="flex-1">
                  <p className={`text-sm ${notif.isRead ? 'text-swan-sub' : 'text-swan-text'}`}>
                    {notif.message}
                  </p>
                  <p className="text-xs text-swan-sub mt-1">
                    {notif.createdAt?.toDate().toLocaleString('ja-JP')}
                  </p>
                </div>
                {!notif.isRead && (
                  <div className="w-2 h-2 bg-swan-accent rounded-full shrink-0 mt-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
