import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { subscribeAllUsers, addPointLog } from '@/lib/firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import type { User } from '@/types'
import { ChevronLeft, FeatherPtIcon, Plus, Minus } from '@/components/ui/Icons'

export const PointsPage = () => {
  const { user: adminUser } = useAuth()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [selectedUid, setSelectedUid] = useState('')
  const [type, setType] = useState<'add' | 'subtract'>('add')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    return subscribeAllUsers((users) => {
      setAllUsers(users.filter((u) => u.status === 'active'))
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminUser || !selectedUid || !amount || !reason.trim()) return
    setMsg('')
    const delta = type === 'add' ? parseInt(amount) : -parseInt(amount)
    if (type === 'subtract') {
      const target = allUsers.find((u) => u.uid === selectedUid)
      if (target && (target.ownedPoints ?? 0) < parseInt(amount)) {
        setMsg('残高不足: 対象メンバーのポイントが不足しています')
        return
      }
    }
    setSaving(true)
    try {
      await addPointLog(selectedUid, delta, 'manual', reason.trim(), adminUser.uid)
      setMsg(`${delta > 0 ? '+' : ''}${delta}pt を付与しました`)
      setAmount('')
      setReason('')
    } catch {
      setMsg('操作に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (!adminUser) return null

  return (
    <AdminShell title="手動ポイント調整">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-swan-sub block mb-1">対象メンバー</label>
            <select
              value={selectedUid}
              onChange={(e) => setSelectedUid(e.target.value)}
              required
              className="w-full bg-swan-card border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none"
            >
              <option value="">-- メンバーを選択 --</option>
              {allUsers.map((u) => (
                <option key={u.uid} value={u.uid}>
                  {u.playerName} (現在: {u.totalPoints.toLocaleString()}pt)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-swan-sub block mb-1">操作</label>
            <div className="flex gap-2">
              {(['add', 'subtract'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-1 ${
                    type === t
                      ? t === 'add'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-red-500/20 text-red-400 border-red-500/30'
                      : 'bg-swan-card text-swan-sub border-swan-border'
                  }`}
                >
                  {t === 'add' ? <Plus size={14} /> : <Minus size={14} />}
                  {t === 'add' ? '加算' : '減算'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-swan-sub block mb-1 flex items-center gap-1">
              ポイント数 <FeatherPtIcon size={12} className="text-swan-accent" />
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
              placeholder="0"
              className="w-full bg-swan-card border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
            />
          </div>

          <div>
            <label className="text-xs text-swan-sub block mb-1">
              理由 <span className="text-red-400">*必須</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={2}
              placeholder="理由を入力してください（例: 誤付与の訂正）"
              className="w-full bg-swan-card border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent resize-none"
            />
          </div>

          {msg && (
            <p className={`text-sm ${msg.includes('失敗') || msg.includes('不足') ? 'text-red-400' : 'text-green-400'}`}>
              {msg}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-swan-accent text-black font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <FeatherPtIcon size={16} />
            {saving ? '処理中...' : `${type === 'add' ? '加算' : '減算'}する`}
          </button>
        </form>
      </div>
    </AdminShell>
  )
}
