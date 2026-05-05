import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeMatch, subscribeAllUsers } from '@/lib/firebase/firestore'
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

  const isEntered = match.participants.includes(user.uid)
  const isFull = match.participants.length >= match.capacity
  const totalPool = match.entryFee * match.participants.length

  const handleEntry = async () => {
    if (!matchId) return
    setError('')
    if ((user.ownedPoints ?? 0) < match.entryFee) {
      setError('ポイント残高が不足しています')
      return
    }
    setLoading(true)
    try {
      const batch = writeBatch(db)
      batch.update(doc(db, 'matches', matchId), {
        participants: [...match.participants, user.uid],
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
      // エントリー費はリスクなので累計・年間・保有すべてから減算
      batch.update(doc(db, 'users', user.uid), {
        totalPoints: increment(-match.entryFee),
        yearPoints:  increment(-match.entryFee),
        ownedPoints: increment(-match.entryFee),
      })
      await batch.commit()
    } catch {
      setError('エントリーに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title={match.title} showBack onBack={() => navigate('/matches')}>
      <div className="py-4 space-y-5">
        {/* カテゴリ＋ステータスバッジ */}
        <div className="flex items-center gap-2 flex-wrap">
          {(match.matchCategory ?? 'tournament') === 'tournament' ? (
            <span className="text-xs font-bold text-purple-400 bg-purple-400/10 border border-purple-400/30 px-2 py-1 rounded-full">トーナメント</span>
          ) : (
            <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 border border-cyan-400/30 px-2 py-1 rounded-full">リングゲーム</span>
          )}
          {match.hasReentry && <span className="text-xs text-purple-400 border border-purple-400/30 px-2 py-1 rounded-full">リエントリー可</span>}
          {match.hasBounty  && <span className="text-xs text-orange-400 border border-orange-400/30 px-2 py-1 rounded-full">バウンティ</span>}
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
        </div>

        {/* 分配率（トーナメントのみ） */}
        {(match.matchCategory ?? 'tournament') === 'tournament' && match.distributionRules.length > 0 && (
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
        {(match.matchCategory ?? 'tournament') === 'ring' && (
          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
            <p className="text-xs text-cyan-400">精算時に管理者がキャッシュバック額を入力します</p>
          </div>
        )}

        {/* 参加者リスト */}
        {match.participants.length > 0 && (
          <div className="bg-swan-card border border-swan-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 text-swan-sub">エントリー済み ({match.participants.length}名)</h3>
            <div className="space-y-1">
              {match.participants.map((uid) => (
                <div key={uid} className={`text-sm py-1 ${uid === user.uid ? 'text-swan-accent font-medium' : 'text-swan-sub'}`}>
                  {getName(uid)}{uid === user.uid && '（自分）'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* エントリーボタン */}
        {match.status === 'recruiting' && (
          <div className="space-y-2">
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            {isEntered ? (
              <div className="w-full bg-swan-muted text-swan-sub font-medium py-3 rounded-xl text-center text-sm">
                エントリー済み（キャンセル不可）
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
        {/* タイマーアプリリンク（登録済みの場合のみ表示）*/}
        {match.timerAppUrl && match.status === 'ongoing' && (
          <a
            href={match.timerAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full border border-cyan-400/40 text-cyan-400 bg-cyan-400/10 py-3 rounded-xl text-sm font-medium hover:bg-cyan-400/20 transition-colors"
          >
            タイマーアプリで観戦・参加 ↗
          </a>
        )}

      </div>
    </AppShell>
  )
}
