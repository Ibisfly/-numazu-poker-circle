import { NavLink } from 'react-router-dom'
import { Home, BarChart2, Users, User } from '@/components/ui/Icons'
import { SpadeIcon } from '@/components/ui/Icons'

const navItems = [
  { to: '/', icon: Home, label: 'ホーム', exact: true },
  { to: '/ranking', icon: BarChart2, label: 'ランキング' },
  { to: '/members', icon: Users, label: '名簿' },
  { to: '/matches', icon: SpadeIcon, label: 'マッチ' },
  { to: '/profile', icon: User, label: 'マイページ' },
]

export const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 z-50 bg-swan-dark border-t border-swan-border max-w-md mx-auto">
    <div className="flex justify-around items-center h-16">
      {navItems.map(({ to, icon: Icon, label, exact }) => (
        <NavLink
          key={to}
          to={to}
          end={exact}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-3 py-2 text-xs transition-colors ${
              isActive ? 'text-swan-accent' : 'text-swan-sub'
            }`
          }
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  </nav>
)
