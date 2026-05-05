import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeAllUsers, approveUser, rejectUser, disableUser, changeUserRole } from '@/lib/firebase/firestore'
import type { User } from '@/types'
import { ChevronLeft, BeginnerIcon } from '@/components/ui/Icons'

const STATUS_LABEL = { pending: '承認待ち', active: '有効', rejected: '拒否', disabled: '無効' }

export const MembersPage = () => {
  const { user: adminUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')

  useEffect(() => {
    return subscribeAllUsers(setUsers)
  }, [])

  const displayed = filter === 'pending' ? users.filter((u) => u.status === 'pending') : users

  if (!adminUser) return null

  return (
    <AdminShell title="メンバー管理">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <div className="flex bg-swan-card rounded-xl p-1">
          {(['pending', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                filter === f ? 'bg-swan-accent text-black' : 'text-swan-sub'
              }`}
            >
              {f === 'pending' ? `承認待ち (${users.filter((u) => u.status === 'pending').length})` : '全員'}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {displayed.length === 0 && (
            <p className="text-center text-swan-sub py-8">
              {filter === 'pending' ? '承認待ちはいません' : 'メンバーはいません'}
            </p>
          )}
          {displayed.map((u) => (
            <div key={u.uid} className="bg-swan-card border border-swan-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    {u.playerName}
                    {u.isBeginner && <BeginnerIcon size={16} />}
                    {u.role === 'admin' && (
                      <span className="text-xs text-red-400 border border-red-400/30 px-1.5 py-0.5 rounded">Admin</span>
                    )}
                  </p>
                  <p className="text-xs text-swan-sub mt-0.5">{STATUS_LABEL[u.status]} · {u.uid.slice(0, 8)}</p>
                </div>
              </div>

              {u.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => approveUser(u.uid, adminUser.uid)}
                    className="flex-1 bg-green-500/20 text-green-400 border border-green-500/30 py-2 rounded-lg text-sm font-medium"
                  >
                    承認
                  </button>
                  <button
                    onClick={() => rejectUser(u.uid)}
                    className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 py-2 rounded-lg text-sm font-medium"
                  >
                    拒否
                  </button>
                </div>
              )}

              {u.status === 'active' && u.uid !== adminUser.uid && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => changeUserRole(u.uid, u.role === 'admin' ? 'member' : 'admin')}
                    className="text-xs bg-swan-muted text-swan-sub border border-swan-border px-3 py-1.5 rounded-lg"
                  >
                    {u.role === 'admin' ? '権限降格' : '管理者昇格'}
                  </button>
                  <button
                    onClick={() => disableUser(u.uid)}
                    className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg"
                  >
                    退会処理
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  )
}
