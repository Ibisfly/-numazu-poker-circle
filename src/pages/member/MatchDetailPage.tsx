import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeMatch, subscribeAllUsers, performRebuy, performReentry, cancelMatchEntry, notifyAdminsMatchReady } from '@/lib/firebase/firestore'
import type { Match, User } from '@/types'
import { writeBatch, doc, collection, increment, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export const MatchDetailPage = () => {
  const { matchId } = useParams<{ matchId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // リバイ / リエントリー用
  const [confirmAction, setConfirmAction] = useState<'rebuy' | 'reentry' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  // キャンセル用
  const [cancelLoading, setCancelLoading] = useState(false)

  useEffect(() => {
    if (!matchId) return
    return subscribeMatch(matchId, setMatch)
  }, [matchId])

  useEffect(() => {
    return subscribeAllUsers(setAllUsers)
  }, [])

  const getName = (uid: string) =>
    allUsers.find((u) => u.uid === uid)?.playerName ?? uid.slice(0, 8) + '...'

  if (!user || !match) return null

  const cat = match.matchCategory ?? 'tournament'
  const isEntered = match.participants.includes(user.uid)
  const isFull = match.participants.length >= match.capacity
  const isOngoing = match.status === 'ongoing'

  // プール計算（リバイ・リエントリーを含む）
  const totalRebuys = Object.values(match.rebuys ?? {}).reduce((s, n) => s + n, 0)
  const totalReentries = Object.values(match.reentries ?? {}).reduce((s, n) => s + n, 0)
  const extraEntries = cat === 'ring' ? totalRebuys : totalReentries
  const totalPool = match.entryFee * (match.participants.length + extraEntries)

  const handleEntry = async () => {
    if (!matchId) return
    setError('')
    if ((user.ownedPoints ?? 0) < match.entryFee) {
      setError('ポイント残高が不足しています')
      return
    }
    setLoading(true)
    try {
      const newParticipants = [...match.participants, user.uid]
      const batch = writeBatch(db)
      batch.update(doc(db, 'matches', matchId), {
        participants: newParticipants,
      })
      const logRef = doc(collection(db, 'pointLogs'))
      batch.set(logRef, {
        uid: user.uid,
        type: 'match',
        amount: -match.entryFee,
        description: `${match.title} エントリー費`,
        relatedId: matchId,
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      })
      batch.update(doc(db, 'users', user.uid), {
        ownedPoints: increment(-match.entryFee),
      })
      await batch.commit()

      // 3人目のエントリーで管理者に通知
      if (newParticipants.length === 3) {
        await notifyAdminsMatchReady({ ...match, participants: newParticipants })
      }
    } catch {
      setError('エントリーに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!match) return
    setCancelLoading(true)
    setError('')
    try {
      await cancelMatchEntry(match, user.uid)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'キャンセルに失敗しました')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleExtraEntry = async () => {
    if (!match) return
    setActionMsg('')
    if ((user.ownedPoints ?? 0) < match.entryFee) {
      setActionMsg('ポイント残高が不足しています')
      setConfirmAction(null)
      return
    }
    setActionLoading(true)
    try {
      if (confirmAction === 'rebuy') {
        await performRebuy(match, user.uid)
        setActionMsg('リバイしました')
      } else {
        await performReentry(match, user.uid)
        setActionMsg('リエントリーしました')
      }
    } catch {
      setActionMsg('処理に失敗しました')
    } finally {
      setActionLoading(false)
      setConfirmAction(null)
    }
  }

  // 各参加者の追加エントリー数
  const getExtraCount = (uid: string) =>
    cat === 'ring'
      ? (match.rebuys ?? {})[uid] ?? 0
      : (match.reentries ?? {})[uid] ?? 0

  const extraLabel = cat === 'ring' ? 'リバイ' : 'リエントリー'
  const canExtraEntry = isEntered && isOngoing && (cat === 'ring' ? match.hasRebuy : match.hasReentry)

  return (
    <AppShell title={match.title} showBack onBack={() => navigate('/matches')}>
      <div className="py-4 space-y-5">

        {/* カテゴリ＋ステータスバッジ */}
        <div className="flex items-center gap-2 flex-wrap">
          {cat === 'tournament' ? (
            <span className="text-xs font-bold text-purple-400 bg-purple-400/10 border border-purple-400/30 px-2 py-1 rounded-full">トーナメント</span>
          ) : (
            <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-2 py-1 rounded-full">プレミアリング</span>
          )}
          {match.hasReentry && <span className="text-xs text-purple-400 border border-purple-400/30 px-2 py-1 rounded-full">リエントリー可</span>}
          {match.hasRebuy   && <span className="text-xs text-cyan-400 border border-cyan-400/30 px-2 py-1 rounded-full">リバイ可</span>}
          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${
            match.status === 'recruiting' ? 'text-green-400 border-green-400/30 bg-green-400/10' :
            match.status === 'ongoing' ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' :
            'text-swan-sub border-swan-border'
          }`}>
            {match.status === 'recruiting' ? '受付中' : match.status === 'ongoing' ? '開催中' : '終了'}
          </span>
        </div>

        {/* 基本情報 */}
        <div className="bg-swan-card border border-swan-border rounded-xl p-4 space-y-3">
          <div className="flex justify-between">
            <span className="text-swan-sub text-sm">エントリー費</span>
            <span className="font-bold flex items-center gap-1"><FeatherIcon />{match.entryFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-swan-sub text-sm">定員</span>
            <span className="font-medium">{match.participants.length} / {match.capacity} 名</span>
          </div>
          <div className="flex justify-between">
            <span className="text-swan-sub text-sm">賞金プール</span>
            <span className="font-bold text-swan-accent flex items-center gap-1"><FeatherIcon />{totalPool.toLocaleString()}</span>
          </div>
          {extraEntries > 0 && (
            <div className="flex justify-between text-xs text-swan-sub">
              <span>{extraLabel}追加分</span>
              <span>+{extraEntries}回</span>
            </div>
          )}
        </div>

        {/* 分配率（トーナメントのみ） */}
        {cat === 'tournament' && match.distributionRules.length > 0 && (
          <div className="bg-swan-card border border-swan-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-swan-sub">褒章</h3>
            {match.distributionRules.map((rule) => (
              <div key={rule.rank} className="flex justify-between py-1 border-b border-swan-border last:border-0">
                <span className="text-sm">{rule.rank}位</span>
                <span className="text-sm text-swan-accent flex items-center gap-1">
                  <FeatherIcon />{rule.points.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
        {cat === 'ring' && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
            <p className="text-xs text-cyan-400">精算時に管理者がキャッシュバック額を入力します</p>
          </div>
        )}

        {/* 参加者リスト（追加エントリー数付き） */}
        {match.participants.length > 0 && (
          <div className="bg-swan-card border border-swan-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-swan-sub">
              エントリー済み ({match.participants.length}名)
            </h3>
            <div className="space-y-1.5">
              {match.participants.map((uid) => {
                const extra = getExtraCount(uid)
                const isMe = uid === user.uid
                return (
                  <div key={uid} className="flex items-center justify-between">
                    <Link
                      to={`/members/${uid}`}
                      className={`text-sm hover:underline ${isMe ? 'text-swan-accent font-medium' : 'text-swan-sub hover:text-swan-text'}`}
                    >
                      {getName(uid)}{isMe && '（自分）'}
                    </Link>
                    {extra > 0 && (
                      <span className="text-xs text-swan-sub border border-swan-border px-1.5 py-0.5 rounded-full">
                        {extraLabel} ×{extra}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* エントリーボタン（受付中のみ） */}
        {match.status === 'recruiting' && (
          <div className="space-y-2">
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {isEntered ? (
              <div className="space-y-2">
                <div className="w-full bg-green-500/10 border border-green-500/30 text-green-400 font-medium py-3 rounded-xl text-center text-sm">
                  ✓ エントリー済み
                </div>
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="w-full border border-red-500/40 text-red-400 font-medium py-2 rounded-xl text-sm hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                >
                  {cancelLoading ? 'キャンセル中...' : 'キャンセルする（返金されます）'}
                </button>
              </div>
            ) : isFull ? (
              <div className="w-full bg-swan-muted text-swan-sub font-medium py-3 rounded-xl text-center">
                定員に達しています
              </div>
            ) : (
              <button
                onClick={handleEntry}
                disabled={loading}
                className="w-full bg-swan-accent text-black font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? '処理中...' : `エントリーする（🪶${match.entryFee.toLocaleString()}）`}
              </button>
            )}
          </div>
        )}

        {/* 開催中のエントリー済み表示（キャンセル不可） */}
        {match.status === 'ongoing' && isEntered && (
          <div className="w-full bg-swan-muted text-swan-sub font-medium py-3 rounded-xl text-center text-sm">
            参加中（キャンセル不可）
          </div>
        )}

        {/* リバイ / リエントリーボタン（開催中 + 対応フラグあり + エントリー済み） */}
        {canExtraEntry && (
          <div className="space-y-2">
            {actionMsg && (
              <p className={`text-sm text-center ${actionMsg.includes('失敗') || actionMsg.includes('不足') ? 'text-red-400' : 'text-green-400'}`}>
                {actionMsg}
              </p>
            )}
            <button
              onClick={() => setConfirmAction(cat === 'ring' ? 'rebuy' : 'reentry')}
              className={`w-full font-bold py-3 rounded-xl transition-opacity ${
                cat === 'ring'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30'
                  : 'bg-purple-500/20 text-purple-400 border border-purple-500/40 hover:bg-purple-500/30'
              }`}
            >
              {extraLabel}する（🪶{match.entryFee.toLocaleString()}）
            </button>
          </div>
        )}

        {/* タイマーアプリリンク */}
        {isOngoing && (match.timerSessionId || match.timerAppUrl) && (
          <a
            href={match.timerSessionId
              ? `https://timer-black-swan.web.app/live/${match.timerSessionId}?uid=${user.uid}`
              : match.timerAppUrl!
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full border border-green-400/40 text-green-400 bg-green-400/10 py-3 rounded-xl text-sm font-medium hover:bg-green-400/20 transition-colors"
          >
            タイマーで観戦・自分の席を確認 ↗
          </a>
        )}
      </div>

      {/* リバイ / リエントリー確認ダイアログ */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
          <div className={`bg-swan-dark border rounded-2xl p-6 w-full max-w-xs text-center space-y-4 ${
            confirmAction === 'rebuy' ? 'border-cyan-500/30' : 'border-purple-500/30'
          }`}>
            <p className={`font-bold text-lg ${confirmAction === 'rebuy' ? 'text-cyan-400' : 'text-purple-400'}`}>
              {confirmAction === 'rebuy' ? 'リバイしますか？' : 'リエントリーしますか？'}
            </p>
            <p className="text-sm text-swan-sub">
              🪶{match.entryFee.toLocaleString()} を消費します
            </p>
            <p className="text-xs text-swan-sub">
              現在の保有ポイント: 🪶{(user.ownedPoints ?? 0).toLocaleString()}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 bg-swan-muted text-swan-sub py-2.5 rounded-xl text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleExtraEntry}
                disabled={actionLoading}
                className={`flex-1 font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 ${
                  confirmAction === 'rebuy'
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                }`}
              >
                {actionLoading ? '処理中...' : '確定する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
