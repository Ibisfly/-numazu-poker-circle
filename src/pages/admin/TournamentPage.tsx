import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { subscribeAllUsers, addPointLog } from '@/lib/firebase/firestore'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/lib/hooks/useAuth'
import type { User } from '@/types'
import { ChevronLeft, Plus, X, FeatherPtIcon } from '@/components/ui/Icons'

interface ParticipantEntry {
  uid: string
  rank: string
  points: string
}

export const TournamentPage = () => {
  const { user: adminUser } = useAuth()
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [title, setTitle] = useState('')
  const [entries, setEntries] = useState<ParticipantEntry[]>([{ uid: '', rank: '', points: '' }])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    return subscribeAllUsers(setAllUsers)
  }, [])

  const activeUsers = allUsers.filter((u) => u.status === 'active')

  const addEntry = () => setEntries([...entries, { uid: '', rank: '', points: '' }])
  const removeEntry = (i: number) => setEntries(entries.filter((_, idx) => idx !== i))
  const updateEntry = (i: number, field: keyof ParticipantEntry, value: string) => {
    setEntries(entries.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminUser || !title.trim()) return
    setMsg('')
    const validEntries = entries.filter((en) => en.uid && en.rank && en.points)
    if (validEntries.length === 0) { setMsg('参加者を1名以上入力してください'); return }

    setSaving(true)
    try {
      await addDoc(collection(db, 'tournaments'), {
        title: title.trim(),
        participants: validEntries.map((en) => ({
          uid: en.uid,
          rank: parseInt(en.rank),
          points: parseInt(en.points),
        })),
        createdBy: adminUser.uid,
        createdAt: serverTimestamp(),
      })

      for (const en of validEntries) {
        await addPointLog(
          en.uid,
          parseInt(en.points),
          'tournament',
          `${title} ${en.rank}位 ポイント`,
          adminUser.uid
        )
      }

      setTitle('')
      setEntries([{ uid: '', rank: '', points: '' }])
      setMsg('トーナメント結果を登録しました！')
    } catch {
      setMsg('登録に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (!adminUser) return null

  return (
    <AdminShell title="トーナメント結果入力">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-swan-sub block mb-1">大会名</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="例: 第5回NUMAZU POKERトーナメント"
              className="w-full bg-swan-card border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-swan-sub">参加者 / 順位 / 付与pt</label>
              <button type="button" onClick={addEntry} className="text-xs text-swan-accent flex items-center gap-1">
                <Plus size={12} /> 追加
              </button>
            </div>
            {entries.map((entry, i) => (
              <div key={i} className="flex gap-2 items-center">
                <select
                  value={entry.uid}
                  onChange={(e) => updateEntry(i, 'uid', e.target.value)}
                  className="flex-1 bg-swan-card border border-swan-border rounded-lg px-2 py-2 text-xs text-swan-text focus:outline-none min-w-0"
                >
                  <option value="">-- 選択 --</option>
                  {activeUsers.map((u) => (
                    <option key={u.uid} value={u.uid}>{u.playerName}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={entry.rank}
                  onChange={(e) => updateEntry(i, 'rank', e.target.value)}
                  min="1"
                  placeholder="順位"
                  className="w-14 bg-swan-card border border-swan-border rounded-lg px-2 py-2 text-xs text-swan-text focus:outline-none"
                />
                <div className="relative w-16">
                  <input
                    type="number"
                    value={entry.points}
                    onChange={(e) => updateEntry(i, 'points', e.target.value)}
                    min="0"
                    placeholder="pt"
                    className="w-full bg-swan-card border border-swan-border rounded-lg px-2 py-2 text-xs text-swan-text focus:outline-none"
                  />
                </div>
                {entries.length > 1 && (
                  <button type="button" onClick={() => removeEntry(i)} className="text-swan-sub hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {msg && (
            <p className={`text-sm ${msg.includes('失敗') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>
          )}

          <button type="submit" disabled={saving} className="w-full bg-swan-accent text-black font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
            <FeatherPtIcon size={16} />
            {saving ? '登録中...' : 'ポイント一括付与'}
          </button>
        </form>
      </div>
    </AdminShell>
  )
}
