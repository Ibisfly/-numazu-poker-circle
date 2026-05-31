import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { subscribeAllUsers, addPointLog, resetYearlyPoints } from '@/lib/firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import type { User } from '@/types'
import { ChevronLeft, FeatherPtIcon, Plus, Minus } from '@/components/ui/Icons'

export const PointsPage = () => {
  const { user: adminUser } = useAuth()
  const [allUsers, setAllUsers] = useState<User[]>([])

  // 手動調整
  const [selectedUid, setSelectedUid] = useState('')
  const [type, setType] = useState<'add' | 'subtract'>('add')
  const [target, setTarget] = useState<'both' | 'owned' | 'total'>('both')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // 年間リセット
  const [resetYear, setResetYear] = useState(new Date().getFullYear())
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

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
      await addPointLog(selectedUid, delta, 'manual', reason.trim(), adminUser.uid, undefined, target)
      const targetLabel = target === 'both' ? '保有+累積' : target === 'owned' ? '保有のみ' : '累積のみ'
      setMsg(`${delta > 0 ? '+' : ''}${delta}pt（${targetLabel}）を反映しました`)
      setAmount('')
      setReason('')
    } catch {
      setMsg('操作に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleYearReset = async () => {
    if (!adminUser) return
    setResetting(true)
    setResetMsg('')
    try {
      const result = await resetYearlyPoints(adminUser.uid, resetYear)
      if (result) {
        setResetMsg(
          `${resetYear}年のランキングを確定しました。年間1位：${result.winner.playerName}（${result.winner.yearPoints.toLocaleString()}pt）/ 対象 ${result.totalParticipants}名をリセット`
        )
      } else {
        setResetMsg('アクティブメンバーがいないためリセットできませんでした')
      }
      setShowResetConfirm(false)
    } catch (e) {
      setResetMsg('リセットに失敗しました: ' + (e instanceof Error ? e.message : 'エラー'))
    } finally {
      setResetting(false)
    }
  }

  if (!adminUser) return null

  return (
    <AdminShell title="手動ポイント調整">
      <div className="py-4 space-y-6">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        {/* ── 手動調整フォーム ── */}
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
            <label className="text-xs text-swan-sub block mb-1">対象</label>
            <div className="flex gap-2">
              {([
                { key: 'both', label: '保有+累積' },
                { key: 'owned', label: '保有のみ' },
                { key: 'total', label: '累積のみ' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTarget(key)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    target === key
                      ? 'bg-swan-accent/20 text-swan-accent border-swan-accent/50'
                      : 'bg-swan-card text-swan-sub border-swan-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-swan-muted mt-1">
              {target === 'both' && '保有ポイントと累計ポイントの両方を変更'}
              {target === 'owned' && '保有ポイントのみ変更（ランキングに影響しない）'}
              {target === 'total' && '累計ポイントのみ変更（残高に影響しない）'}
            </p>
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

        {/* ── 年間ランキング確定・リセット ── */}
        <div className="border-t border-swan-border pt-5 space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-swan-text">年間ランキング確定・リセット</h3>
            <p className="text-xs text-swan-sub mt-1">
              対象年のランキングを Firestore に保存し、全メンバーの年間ポイントを0にリセットします。
              年間1位のメンバーに「年間王者」実績が付与されます。
            </p>
          </div>

          <div>
            <label className="text-xs text-swan-sub block mb-1">対象年度</label>
            <input
              type="number"
              value={resetYear}
              onChange={(e) => setResetYear(parseInt(e.target.value))}
              min="2024"
              max="2099"
              className="w-32 bg-swan-card border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-red-400"
            />
          </div>

          {resetMsg && (
            <p className={`text-sm ${resetMsg.includes('失敗') || resetMsg.includes('できません') ? 'text-red-400' : 'text-green-400'}`}>
              {resetMsg}
            </p>
          )}

          <button
            onClick={() => setShowResetConfirm(true)}
            disabled={resetting}
            className="w-full bg-red-500/10 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl text-sm disabled:opacity-50"
          >
            {resetting ? 'リセット中...' : `${resetYear}年のランキングを確定してリセット`}
          </button>
        </div>

        {/* 確認ダイアログ */}
        {showResetConfirm && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
            <div className="bg-swan-dark border border-red-500/30 rounded-2xl p-6 w-full max-w-xs text-center space-y-4">
              <p className="font-bold text-red-400">年間リセットを実行しますか？</p>
              <div className="text-xs text-swan-sub text-left space-y-1">
                <p>・{resetYear}年のランキングスナップショットを保存</p>
                <p>・年間1位に「年間王者」実績を付与</p>
                <p>・全メンバーの年間ポイントを0にリセット</p>
                <p className="text-red-400 mt-2">この操作は取り消せません。</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleYearReset}
                  disabled={resetting}
                  className="flex-1 bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2 rounded-xl text-sm disabled:opacity-50"
                >
                  {resetting ? '処理中...' : '実行する'}
                </button>
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 bg-swan-muted text-swan-sub py-2 rounded-xl text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
