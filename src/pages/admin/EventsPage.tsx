import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { subscribeEvents, createEvent } from '@/lib/firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Event } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { ChevronLeft, Plus, FeatherPtIcon } from '@/components/ui/Icons'

export const EventsPage = () => {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [attendancePoint, setAttendancePoint] = useState('50')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return subscribeEvents(setEvents)
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim() || !date) return
    setSaving(true)
    try {
      await createEvent({
        title: title.trim(),
        date: Timestamp.fromDate(new Date(date)),
        attendancePoint: parseInt(attendancePoint, 10),
        createdBy: user.uid,
      })
      setTitle('')
      setDate('')
      setAttendancePoint('50')
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminShell title="イベント管理">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full bg-swan-accent text-black font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          {showForm ? 'キャンセル' : '新規イベント作成'}
        </button>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-swan-card border border-swan-border rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs text-swan-sub block mb-1">イベント名</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
              />
            </div>
            <div>
              <label className="text-xs text-swan-sub block mb-1">開催日</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
              />
            </div>
            <div>
              <label className="text-xs text-swan-sub block mb-1 flex items-center gap-1">
                来店ポイント付与数 <FeatherPtIcon size={12} className="text-swan-accent" />
              </label>
              <input
                type="number"
                value={attendancePoint}
                onChange={(e) => setAttendancePoint(e.target.value)}
                min="1"
                required
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
              />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-swan-accent text-black font-bold py-2 rounded-lg text-sm disabled:opacity-50">
              {saving ? '作成中...' : '作成する'}
            </button>
          </form>
        )}

        <div className="space-y-2">
          {events.map((ev) => (
            <div key={ev.id} className="bg-swan-card border border-swan-border rounded-xl px-4 py-3">
              <p className="font-medium">{ev.title}</p>
              <div className="flex items-center gap-3 text-xs text-swan-sub mt-1">
                <span>{ev.date?.toDate().toLocaleDateString('ja-JP')}</span>
                <span className="flex items-center gap-1">
                  付与: <FeatherPtIcon size={11} className="text-swan-accent" /> {ev.attendancePoint}
                </span>
              </div>
            </div>
          ))}
          {events.length === 0 && <p className="text-center text-swan-sub py-8">イベントはありません</p>}
        </div>
      </div>
    </AdminShell>
  )
}
