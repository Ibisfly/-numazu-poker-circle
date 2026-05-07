import { Timestamp } from 'firebase/firestore'

export type UserRole = 'admin' | 'member'
export type UserStatus = 'pending' | 'active' | 'rejected' | 'disabled'
export type MatchStatus = 'recruiting' | 'ongoing' | 'finished'
export type ItemCategory = 'cosmetic' | 'benefit'
export type PointLogType = 'attendance' | 'tournament' | 'match' | 'shop' | 'manual'

export interface User {
  uid: string
  playerName: string
  bio: string
  isBeginner: boolean
  role: UserRole
  status: UserStatus
  totalPoints: number    // 累計（獲得のみ、消費で減らない）
  yearPoints: number     // 年間（獲得のみ、年次リセット）
  ownedPoints: number    // 保有（現在の残高、消費で減る）
  avatarColor?: string    // 背景色 default '#fce7f3'
  equippedTitle?: string
  equippedTitleTier?: 'common' | 'rare' | 'elite' | 'prime'
  equippedFrame?: string  // FRAME_DEFS のキー
  equippedOverlay?: string  // OVERLAY_DEFS のキー
  createdAt: Timestamp
}

export interface Event {
  id: string
  title: string
  date: Timestamp
  attendancePoint: number
  createdBy: string
  createdAt: Timestamp
}

export interface Attendance {
  id: string
  eventId: string
  uid: string
  pointAwarded: number
  scannedAt: Timestamp
}

export interface PointLog {
  id: string
  uid: string
  type: PointLogType
  amount: number
  description: string
  relatedId?: string
  createdAt: Timestamp
  createdBy: string
}

export interface DistributionRule {
  rank: number
  points: number  // 付与ポイント実数値
}

export type MatchCategory = 'tournament' | 'ring'

export interface Match {
  id: string
  title: string
  matchCategory: MatchCategory  // トーナメント or リングゲーム
  entryFee: number
  capacity: number
  status: MatchStatus
  distributionRules: DistributionRule[]  // tournament のみ使用
  participants: string[]
  scheduledAt: Timestamp
  createdBy: string
  createdAt: Timestamp
  // トーナメントオプション
  hasReentry?: boolean
  hasBounty?: boolean
  reentries?: Record<string, number>  // uid → リエントリー回数
  // リングゲームオプション
  hasRebuy?: boolean
  rebuys?: Record<string, number>     // uid → リバイ回数
  // 外部タイマーアプリ連携
  timerAppUrl?: string          // 外部タイマーアプリのURL（レガシー）
  timerSessionId?: string       // タイマーアプリのセッションID
}

export interface UserTitle {
  id: string
  uid: string
  title: string
  tier: 'common' | 'rare' | 'elite' | 'prime'
  achievementId: string
  acquiredAt: Timestamp
}

export interface MatchRanking {
  uid: string
  rank: number
  earnedPoints: number
}

export interface MatchResult {
  id: string
  matchId: string
  rankings: MatchRanking[]
  settledAt: Timestamp
}

export interface TournamentParticipant {
  uid: string
  rank: number
  points: number
}

export interface Tournament {
  id: string
  eventId: string
  title: string
  participants: TournamentParticipant[]
  createdBy: string
  createdAt: Timestamp
}

export interface Item {
  id: string
  name: string
  category: ItemCategory
  cost: number
  description: string
  isAvailable: boolean
  imageUrl?: string        // 商品画像URL（任意）
  avatarColor?: string     // アバターカラー用アイテムの場合の色コード
  itemSubtype?: 'title' | 'avatar_color' | 'avatar_decoration'
  decorationType?: 'frame' | 'overlay'  // avatar_decoration の下位分類
  frameStyle?: string    // FRAME_DEFS のキー
  overlayId?:  string    // OVERLAY_DEFS のキー
  titleTier?: 'common' | 'rare' | 'elite' | 'prime'  // 称号レアリティ
  createdBy: string
  createdAt: Timestamp
}

export interface UserItem {
  id: string
  uid: string
  itemId: string
  category: ItemCategory
  purchasedAt: Timestamp
  usedAt?: Timestamp
  equipped?: boolean
}

export interface Achievement {
  id: string
  name: string
  description: string
  condition: string
  iconUrl?: string
  isSecret?: boolean
}

export interface YearlyRankingEntry {
  rank: number
  uid: string
  playerName: string
  yearPoints: number
}

export interface YearlyRankingSnapshot {
  year: number
  rankings: YearlyRankingEntry[]
  settledBy: string
  settledAt: Timestamp
}

export interface UserAchievement {
  id: string
  uid: string
  achievementId: string
  unlockedAt: Timestamp
}

export type NotificationType =
  | 'approval'
  | 'point_awarded'
  | 'achievement'
  | 'match_started'
  | 'match_result'

export interface Notification {
  id: string
  uid: string
  type: NotificationType
  message: string
  isRead: boolean
  createdAt: Timestamp
}

// タイマーアプリからの暫定順位
export interface TimerProvisionalRanking {
  rank: number
  uid: string | null
  displayName: string
  bustOrder: number | null
}
