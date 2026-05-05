import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribePendingUsers, subscribeMatches } from '@/lib/firebase/firestore'
import type { User, Match } from '@/types'
import {
  Users, Camera, CalendarDays, Trophy, SpadeIcon, ShoppingBag,
  FeatherPtIcon, ChevronRight, Home,
} from '@/components/ui/Icons'
import type { LucideIcon } from 'lucide-react'
import type { SVGProps } from 'react'

type IconComponent = LucideIcon | ((props: SVGProps<SVGSVGElement> & { size?: number }) => JSX.Element)

export const AdminShell = ({ children, title }: { children: React.ReactNode; title: string }) => {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-swan-black text-swan-text flex flex-col max-w-md mx-auto">
      <header className="sticky top-0 z-40 bg-swan-dark border-b border-swan-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded px-2 py-0.5 font-medium">ADMIN</span>
          <h1 className="text-sm font-semibold">{title}</h1>
        </div>
        <span className="text-xs text-swan-sub">{user?.playerName}</span>
      </header>
      <main className="flex-1 overflow-y-auto pb-6 px-4">{children}</main>
    </div>
  )
}

export { AdminShell as default }

export const AdminDashboardPage = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [ongoingMatches, setOngoingMatches] = useState<Match[]>([])

  useEffect(() => {
    const u1 = subscribePendingUsers(setPendingUsers)
    const u2 = subscribeMatches((matches) => setOngoingMatches(matches.filter((m) => m.status === 'ongoing')))
    return () => { u1(); u2() }
  }, [])

  const adminLinks: { to: string; icon: IconComponent; label: string; badge?: number }[] = [
    { to: '/admin/members', icon: Users, label: 'メンバー管理', badge: pendingUsers.length },
    { to: '/admin/scan', icon: Camera, label: '来店スキャン' },
    { to: '/admin/events', icon: CalendarDays, label: 'イベント管理' },
    { to: '/admin/tournament', icon: Trophy, label: 'トーナメント結果' },
    { to: '/admin/matches', icon: SpadeIcon, label: 'マッチ管理', badge: ongoingMatches.length },
    { to: '/admin/shop', icon: ShoppingBag, label: 'ショップ管理' },
    { to: '/admin/points', icon: FeatherPtIcon, label: 'ポイント調整' },
  ]

  return (
    <AdminShell title="管理ダッシュボード">
      <div className="py-4 space-y-4">
        {/* サマリー */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-swan-card border border-swan-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{pendingUsers.length}</p>
            <p className="text-xs text-swan-sub mt-1">承認待ち</p>
          </div>
          <div className="bg-swan-card border border-swan-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{ongoingMatches.length}</p>
            <p className="text-xs text-swan-sub mt-1">開催中マッチ</p>
          </div>
        </div>

        {/* メニュー */}
        <div className="space-y-2">
          {adminLinks.map(({ to, icon: Icon, label, badge }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center justify-between bg-swan-card border border-swan-border rounded-xl px-4 py-4 hover:border-swan-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className="text-swan-accent" />
                <span className="font-medium text-sm">{label}</span>
              </div>
              <div className="flex items-center gap-2">
                {badge !== undefined && badge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                    {badge}
                  </span>
                )}
                <ChevronRight size={16} className="text-swan-sub" />
              </div>
            </Link>
          ))}
        </div>

        <Link to="/" className="flex items-center justify-center gap-2 text-sm text-swan-sub hover:text-swan-text transition-colors mt-2">
          <Home size={14} />
          一般画面へ戻る
        </Link>
      </div>
    </AdminShell>
  )
}
