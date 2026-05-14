import { useEffect, useState } from 'react'
import { AdminShell } from './AdminDashboardPage'
import { TitleBadge, type TitleTier } from '@/components/ui/TitleBadge'
import { Plus, Trash2, Gift, X, ChevronDown } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeAdminTitles,
  createAdminTitle,
  deleteAdminTitle,
  grantTitleToUser,
  subscribeActiveUsers,
} from '@/lib/firebase/firestore'
import type { AdminTitle, User } from '@/types'

const TIER_OPTIONS: { value: TitleTier; label: string; color: string }[] = [
  { value: 'common', label: 'COMMON', color: 'text-gray-400' },
  { value: 'rare', label: 'RARE', color: 'text-blue-400' },
  { value: 'elite', label: 'ELITE', color: 'text-purple-400' },
  { value: 'prime', label: 'PRIME', color: 'text-yellow-400' },
]

export const TitlesAdminPage = () => {
  const { user: admin } = useAuth()
  const [titles, setTitles] = useState<AdminTitle[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTier, setNewTier] = useState<TitleTier>('common')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const [grantingTitle, setGrantingTitle] = useState<AdminTitle | null>(null)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [granting, setGranting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const u1 = subscribeAdminTitles(setTitles)
    const u2 = subscribeActiveUsers(setUsers)
    return () => { u1(); u2() }
  }, [])

  const handleCreate = async () => {
    if (!admin || !newTitle.trim()) return
    setCreating(true)
    try {
      await createAdminTitle({
        title: newTitle.trim(),
        tier: newTier,
        description: newDescription.trim(),
        createdBy: admin.uid,
      })
      setNewTitle('')
      setNewTier('common')
      setNewDescription('')
      setShowCreateForm(false)
    } catch (e) {
      console.error(e)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この称号テンプレートを削除しますか？')) return
    await deleteAdminTitle(id)
  }

  const handleGrant = async () => {
    if (!admin || !grantingTitle || !selectedUserId) return
    setGranting(true)
    setMessage('')
    try {
      await grantTitleToUser(
        selectedUserId,
        grantingTitle.title,
        grantingTitle.tier,
        admin.uid
      )
      const targetUser = users.find(u => u.uid === selectedUserId)
      setMessage(`${targetUser?.playerName} に称号を付与しました！`)
      setTimeout(() => {
        setGrantingTitle(null)
        setSelectedUserId('')
        setMessage('')
      }, 2000)
    } catch (e) {
      setMessage('付与に失敗しました')
    } finally {
      setGranting(false)
    }
  }

  return (
    <AdminShell title="称号管理">
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-swan-sub">非売品称号を作成してメンバーに付与できます</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 text-sm bg-swan-accent text-black px-3 py-1.5 rounded-lg font-semibold"
          >
            <Plus size={16} /> 作成
          </button>
        </div>

        {showCreateForm && (
          <div className="bg-swan-card border border-swan-accent/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">新規称号作成</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-swan-sub">
                <X size={18} />
              </button>
            </div>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="称号名（例: 初代チャンピオン）"
              maxLength={30}
              className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-swan-accent"
            />
            <div>
              <p className="text-xs text-swan-sub mb-1">レアリティ</p>
              <div className="flex gap-2">
                {TIER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setNewTier(opt.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      newTier === opt.value
                        ? 'border-swan-accent bg-swan-accent/10 ' + opt.color
                        : 'border-swan-border text-swan-sub'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="説明（任意）"
              rows={2}
              className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-swan-accent resize-none"
            />
            {newTitle && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-swan-sub">プレビュー:</span>
                <TitleBadge title={newTitle} tier={newTier} />
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="w-full bg-swan-accent text-black font-semibold py-2 rounded-lg disabled:opacity-50"
            >
              {creating ? '作成中...' : '作成する'}
            </button>
          </div>
        )}

        {titles.length === 0 ? (
          <div className="text-center py-8 bg-swan-card border border-swan-border rounded-xl">
            <p className="text-swan-sub text-sm">作成済みの称号はありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {titles.map((t) => (
              <div
                key={t.id}
                className="bg-swan-card border border-swan-border rounded-xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <TitleBadge title={t.title} tier={t.tier} />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setGrantingTitle(t)}
                      className="text-swan-accent hover:bg-swan-accent/10 p-1.5 rounded-lg transition-colors"
                      title="メンバーに付与"
                    >
                      <Gift size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-400 hover:bg-red-400/10 p-1.5 rounded-lg transition-colors"
                      title="削除"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                {t.description && (
                  <p className="text-xs text-swan-sub">{t.description}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {grantingTitle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="bg-swan-card border border-swan-border rounded-2xl p-5 w-full max-w-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">称号を付与</h3>
                <button onClick={() => setGrantingTitle(null)} className="text-swan-sub">
                  <X size={20} />
                </button>
              </div>

              <div className="text-center py-2">
                <TitleBadge title={grantingTitle.title} tier={grantingTitle.tier} />
              </div>

              <div className="relative">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2.5 text-sm appearance-none focus:outline-none focus:border-swan-accent"
                >
                  <option value="">メンバーを選択...</option>
                  {users.map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.playerName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-swan-sub pointer-events-none" />
              </div>

              {message && (
                <p className={`text-sm text-center ${message.includes('失敗') ? 'text-red-400' : 'text-green-400'}`}>
                  {message}
                </p>
              )}

              <button
                onClick={handleGrant}
                disabled={granting || !selectedUserId}
                className="w-full bg-swan-accent text-black font-semibold py-2.5 rounded-lg disabled:opacity-50"
              >
                {granting ? '付与中...' : '付与する'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
