import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { SwanAvatar, DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { BeginnerIcon, Trophy, Award } from '@/components/ui/Icons'
import { GoldMedalIcon, BronzeMedalIcon } from '@/components/ui/Icons'
import { AchievementIcon } from '@/components/ui/AchievementIcons'
import {
  getUser,
  subscribePointLogs,
  subscribeUserAchievements,
} from '@/lib/firebase/firestore'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { User, PointLog, UserAchievement } from '@/types'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { TitleBadge } from '@/components/ui/TitleBadge'

interface TournamentStats { entries: number; wins: number; placements: number }
interface RingStats      { entries: number; netProfit: number }

export const MemberProfilePage = () => {
  const { uid } = useParams<{ uid: string }>()
  const navigate  = useNavigate()
  const [member, setMember]       = useState<User | null>(null)
  const [pointLogs, setPointLogs] = useState<PointLog[]>([])
  const [achievements, setAchievements] = useState<UserAchievement[]>([])
  const [tournamentStats, setTournamentStats] = useState<TournamentStats>({ entries: 0, wins: 0, placements: 0 })
  const [ringStats, setRingStats]             = useState<RingStats>({ entries: 0, netProfit: 0 })

  useEffect(() => {
    if (!uid) return
    getUser(uid).then(setMember)
    const u1 = subscribePointLogs(uid, setPointLogs)
    const u2 = subscribeUserAchievements(uid, setAchievements)

    // トーナメント＆リング戦績を取得
    ;(async () => {
      const [matchesSnap, resultsSnap] = await Promise.all([
        getDocs(collection(db, 'matches')),
        getDocs(collection(db, 'matchResults')),
      ])

      const matchMap = new Map(
        matchesSnap.docs.map((d) => [d.id, d.data()])
      )

      const tourn: TournamentStats = { entries: 0, wins: 0, placements: 0 }
      const ring:  RingStats       = { entries: 0, netProfit: 0 }

      for (const doc of resultsSnap.docs) {
        const result = doc.data()
        const match  = matchMap.get(result.matchId)
        if (!match) continue

        if (match.matchCategory === 'ring') {
          // プレミアリング
          const cashbacks: { uid: string; amount: number }[] = result.cashbacks ?? []
          const entry = cashbacks.find((c) => c.uid === uid)
          if (entry) {
            ring.entries++
            ring.netProfit += entry.amount - (match.entryFee ?? 0)
          }
        } else {
          // トーナメント（デフォルト）
          const rankings: { uid: string; rank: number; earnedPoints: number }[] = result.rankings ?? []
          const entry = rankings.find((r) => r.uid === uid)
          if (entry) {
            tourn.entries++
            if (entry.rank === 1) tourn.wins++
            if (entry.earnedPoints > 0) tourn.placements++  // 入賞 = ポイント獲得順位
          }
        }
      }

      setTournamentStats(tourn)
      setRingStats(ring)
    })()

    return () => { u1(); u2() }
  }, [uid])

  if (!member) {
    return (
      <AppShell title="プロフィール" showBack onBack={() => navigate('/members')}>
        <div className="py-12 text-center text-swan-sub text-sm">読み込み中...</div>
      </AppShell>
    )
  }

  const unlockedAchievements = achievements.map((ua) => ({
    ...ua,
    def: ACHIEVEMENTS.find((a) => a.id === ua.achievementId),
  }))

  const attendanceLogs = pointLogs.filter((l) => l.type === 'attendance').length

  return (
    <AppShell title={member.playerName} showBack onBack={() => navigate('/members')}>
      <div className="py-4 space-y-5">

        {/* ヘッダー */}
        <div className="flex items-center gap-4 bg-swan-card border border-swan-border rounded-xl p-4">
          <SwanAvatar
            color={member.avatarColor ?? DEFAULT_AVATAR_COLOR}
            size={72}
            frame={member.equippedFrame}
          />
          <div className="flex-1">
            <h2 className="text-xl font-bold flex items-center gap-2 flex-wrap">
              {member.playerName}
              {member.isBeginner && <BeginnerIcon size={18} />}
            </h2>
            {member.equippedTitle && (
              <div className="mt-1">
                <TitleBadge title={member.equippedTitle} tier={member.equippedTitleTier ?? 'common'} />
              </div>
            )}
            {member.bio && <p className="text-swan-sub text-sm mt-1">{member.bio}</p>}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div>
                <p className="text-xs text-swan-sub">累計</p>
                <p className="font-bold text-sm flex items-center gap-0.5 text-swan-accent">
                  <FeatherIcon size={11} />{member.totalPoints.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-5 bg-swan-border" />
              <div>
                <p className="text-xs text-swan-sub">年間</p>
                <p className="font-bold text-sm flex items-center gap-0.5">
                  <FeatherIcon size={11} />{member.yearPoints.toLocaleString()}
                </p>
              </div>
              <div className="w-px h-5 bg-swan-border" />
              <div>
                <p className="text-xs text-swan-sub">保有</p>
                <p className="font-bold text-sm flex items-center gap-0.5">
                  <FeatherIcon size={11} />{(member.ownedPoints ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 戦績サマリー */}
        <div>
          <h3 className="text-xs font-semibold text-swan-sub uppercase tracking-wide mb-2">戦績</h3>
          <div className="grid grid-cols-2 gap-2">

            {/* トーナメント */}
            <div className="bg-swan-card border border-purple-500/20 rounded-xl p-3 col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={14} className="text-purple-400" />
                <p className="text-xs font-semibold text-purple-400">トーナメント</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold">{tournamentStats.entries}</p>
                  <p className="text-[10px] text-swan-sub">参加</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <GoldMedalIcon size={16} />
                    <p className="text-xl font-bold">{tournamentStats.wins}</p>
                  </div>
                  <p className="text-[10px] text-swan-sub">優勝</p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1">
                    <BronzeMedalIcon size={16} />
                    <p className="text-xl font-bold">{tournamentStats.placements}</p>
                  </div>
                  <p className="text-[10px] text-swan-sub">入賞</p>
                </div>
              </div>
            </div>

            {/* プレミアリング */}
            <div className="bg-swan-card border border-cyan-500/20 rounded-xl p-3 col-span-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-cyan-400">♠ プレミアリング</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-xl font-bold">{ringStats.entries}</p>
                  <p className="text-[10px] text-swan-sub">参加</p>
                </div>
                <div>
                  <p className={`text-xl font-bold ${
                    ringStats.netProfit > 0 ? 'text-green-400'
                    : ringStats.netProfit < 0 ? 'text-red-400'
                    : 'text-swan-sub'
                  }`}>
                    {ringStats.netProfit > 0 ? '+' : ''}{ringStats.netProfit.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-swan-sub">収支 (pt)</p>
                </div>
              </div>
            </div>

            {/* 来店 & 実績 */}
            <div className="bg-swan-card border border-swan-border rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <FeatherIcon size={11} />
                <p className="text-xs text-swan-sub">来店回数</p>
              </div>
              <p className="text-xl font-bold">{attendanceLogs}</p>
            </div>
            <div className="bg-swan-card border border-swan-border rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <Award size={12} className="text-swan-accent" />
                <p className="text-xs text-swan-sub">実績</p>
              </div>
              <p className="text-xl font-bold">
                {achievements.length}
                <span className="text-sm text-swan-sub font-normal ml-1">/ {ACHIEVEMENTS.length}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 解除済み実績 */}
        {unlockedAchievements.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-swan-sub uppercase tracking-wide mb-2">解除済み実績</h3>
            <div className="flex flex-wrap gap-2">
              {unlockedAchievements.map((ua) => (
                <div key={ua.id}
                  className="bg-swan-card border border-swan-accent/30 rounded-lg px-3 py-2 text-xs flex items-center gap-1"
                  title={ua.def?.description}
                >
                  <AchievementIcon achievementId={ua.achievementId} size={18} />
                  {ua.def?.name ?? ua.achievementId}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  )
}
