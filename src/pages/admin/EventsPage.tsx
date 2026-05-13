import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { subscribeEvents, createEvent, updateEvent, deleteEvent, subscribeBingoCards } from '@/lib/firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Event, BingoCard } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { ChevronLeft, Plus, Pencil, X, Layers } from '@/components/ui/Icons'
import { FeatherPtIcon } from '@/components/ui/Icons'

// フォームの初期値
const EMPTY = { title: '', date: '', attendancePoint: '50', bingoCardId: '' }

export const EventsPage = () => {
  const { user } = useAuth()
  const [events, setEvents]     = useState<Event[]>([])
  const [bingoCards, setBingoCards] = useState<BingoCard[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)  // 編集中のイベントID（nullなら新規）
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { return subscribeEvents(setEvents) }, [])
  useEffect(() => { return subscribeBingoCards(setBingoCards) }, [])

  const openCreate = () => {
    setForm(EMPTY)
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (ev: Event) => {
    setForm({
      title:           ev.title,
      date:            ev.date?.toDate().toISOString().slice(0, 10) ?? '',
      attendancePoint: String(ev.attendancePoint),
      bingoCardId:     ev.bingoCardId ?? '',
    })
    setEditingId(ev.id)
    setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !form.title.trim() || !form.date) return
    setSaving(true)
    try {
      const payload = {
        title:           form.title.trim(),
        date:            Timestamp.fromDate(new Date(form.date)),
        attendancePoint: parseInt(form.attendancePoint, 10),
        bingoCardId:     form.bingoCardId || undefined,
      }
      if (editingId) {
        await updateEvent(editingId, payload)
      } else {
        await createEvent({ ...payload, createdBy: user.uid })
      }
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  const availableBingoCards = bingoCards.filter((c) => c.isAvailable)

  const handleDelete = async (id: string) => {
    await deleteEvent(id)
    setDeletingId(null)
  }

  if (!user) return null

  return (
    <AdminShell title="イベント管理">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        {!showForm && (
          <button
            onClick={openCreate}
            className="w-full bg-swan-accent text-black font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} /> 新規イベント作成
          </button>
        )}

        {/* 作成 / 編集フォーム */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-swan-card border border-swan-accent/40 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-swan-accent">
              {editingId ? 'イベントを編集' : '新規イベント作成'}
            </h3>
            <div>
              <label className="text-xs text-swan-sub block mb-1">イベント名</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
              />
            </div>
            <div>
              <label className="text-xs text-swan-sub block mb-1">開催日</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
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
                value={form.attendancePoint}
                onChange={(e) => setForm({ ...form, attendancePoint: e.target.value })}
                min="1"
                required
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
              />
            </div>
            <div>
              <label className="text-xs text-swan-sub block mb-1">配布するビンゴカード</label>
              <select
                value={form.bingoCardId}
                onChange={(e) => setForm({ ...form, bingoCardId: e.target.value })}
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
              >
                <option value="">配布しない</option>
                {availableBingoCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-swan-sub mt-1">
                来店スキャン時に自動でビンゴカードを配布します
              </p>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-swan-accent text-black font-bold py-2 rounded-lg text-sm disabled:opacity-50">
                {saving ? '保存中...' : editingId ? '保存する' : '作成する'}
              </button>
              <button type="button" onClick={closeForm}
                className="flex-1 bg-swan-muted text-swan-sub py-2 rounded-lg text-sm">
                キャンセル
              </button>
            </div>
          </form>
        )}

        {/* 削除確認 */}
        {deletingId && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
            <div className="bg-swan-dark border border-red-500/30 rounded-2xl p-6 w-full max-w-xs text-center space-y-4">
              <p className="font-bold text-red-400">このイベントを削除しますか？</p>
              <p className="text-xs text-swan-sub">来店スキャン履歴は残りますが、イベント自体は削除されます。</p>
              <div className="flex gap-2">
                <button onClick={() => handleDelete(deletingId)}
                  className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 rounded-xl text-sm">
                  削除する
                </button>
                <button onClick={() => setDeletingId(null)}
                  className="flex-1 bg-swan-muted text-swan-sub py-2 rounded-xl text-sm">
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

        {/* イベント一覧 */}
        <div className="space-y-2">
          {events.length === 0 && (
            <p className="text-center text-swan-sub py-8">イベントはありません</p>
          )}
          {events.map((ev) => {
            const bingoCard = bingoCards.find((c) => c.id === ev.bingoCardId)
            return (
            <div key={ev.id} className="bg-swan-card border border-swan-border rounded-xl px-4 py-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{ev.title}</p>
                  <div className="flex items-center gap-3 text-xs text-swan-sub mt-1">
                    <span>{ev.date?.toDate().toLocaleDateString('ja-JP')}</span>
                    <span className="flex items-center gap-1">
                      付与: <FeatherPtIcon size={11} className="text-swan-accent" /> {ev.attendancePoint}
                    </span>
                    {bingoCard && (
                      <span className="flex items-center gap-1 text-purple-400">
                        <Layers size={11} /> {bingoCard.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => openEdit(ev)}
                    className="p-1.5 text-swan-accent hover:bg-swan-accent/10 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setDeletingId(ev.id)}
                    className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </AdminShell>
  )
}
