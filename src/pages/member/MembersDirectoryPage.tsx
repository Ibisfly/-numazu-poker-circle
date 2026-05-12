import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { SwanAvatar } from '@/components/ui/SwanAvatar'
import { BeginnerIcon } from '@/components/ui/Icons'
import { DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { subscribeAllUsers } from '@/lib/firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import type { User } from '@/types'
import { TitleBadge } from '@/components/ui/TitleBadge'

export const MembersDirectoryPage = () => {
  const { user: me } = useAuth()
  const [members, setMembers] = useState<User[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    return subscribeAllUsers((users) =>
      setMembers(users.filter((u) => u.status === 'active'))
    )
  }, [])

  const filtered = members.filter((u) =>
    u.playerName.toLowerCase().includes(search.toLowerCase())
  )

  // ポイント降順でソート
  const sorted = [...filtered].sort((a, b) => b.totalPoints - a.totalPoints)

  return (
    <AppShell title="メンバー">
      <div className="py-4 space-y-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="プレイヤーネームで検索..."
          className="w-full bg-swan-card border border-swan-border rounded-lg px-4 py-2.5 text-sm text-swan-text placeholder-swan-sub focus:outline-none focus:border-swan-accent"
        />

        <p className="text-xs text-swan-sub">{sorted.length} 名</p>

        <div className="space-y-2">
          {sorted.map((u) => {
            const isMe = u.uid === me?.uid
            return (
              <Link
                key={u.uid}
                to={`/members/${u.uid}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isMe
                    ? 'bg-swan-accent/10 border-swan-accent'
                    : 'bg-swan-card border-swan-border hover:border-swan-accent'
                }`}
              >
                <SwanAvatar
                  color={u.avatarColor ?? DEFAULT_AVATAR_COLOR}
                  size={36}
                  showCard={false}
                  frame={u.equippedFrame}
                />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate flex items-center gap-1.5 ${isMe ? 'text-swan-accent' : 'text-swan-text'}`}>
                    {u.playerName}
                    {u.isBeginner && <BeginnerIcon size={14} />}
                    {isMe && <span className="text-xs text-swan-accent">(自分)</span>}
                  </p>
                  {u.equippedTitle ? (
                    <div className="mt-0.5 truncate">
                      <TitleBadge title={u.equippedTitle} tier={u.equippedTitleTier ?? 'common'} />
                    </div>
                  ) : u.bio ? (
                    <p className="text-xs text-swan-sub truncate">{u.bio}</p>
                  ) : (
                    <p className="text-xs text-swan-muted">—</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm flex items-center gap-1 justify-end text-swan-accent">
                    <FeatherIcon size={12} />
                    {u.totalPoints.toLocaleString()}
                  </p>
                  <p className="text-xs text-swan-sub">累計pt</p>
                </div>
              </Link>
            )
          })}
          {sorted.length === 0 && (
            <p className="text-center text-swan-sub py-12">メンバーが見つかりません</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
