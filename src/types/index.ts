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
  equippedPointIcon?: string  // POINT_ICON_DEFS のキー（デフォルト: feather）
  avatarVariant?: string  // アバターイラストのバリエーション（デフォルト: 'default'）
  luckyHand?: string      // 今日のラッキーハンド（例: "AKs", "77"）
  luckyHandExpiry?: Timestamp  // ラッキーハンドの有効期限（その日の終わり）
  createdAt: Timestamp
}

export type EventStatus = 'scheduled' | 'active' | 'finished'

export interface Event {
  id: string
  title: string
  date: Timestamp
  attendancePoint: number
  bingoCardId?: string       // このイベントで配布するビンゴカードID
  status: EventStatus        // scheduled → active → finished
  finishedAt?: Timestamp     // 終了日時
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
  matchCategory: MatchCategory  // トーナメント or プレミアリング
  entryFee: number
  capacity: number
  status: MatchStatus
  distributionRules: DistributionRule[]  // tournament のみ使用
  participants: string[]
  scheduledAt: Timestamp
  createdBy: string
  createdAt: Timestamp
  // イベント紐付け
  eventId?: string              // 紐付けイベントID（未設定は野良マッチ）
  // トーナメントオプション
  hasReentry?: boolean
  reentryFee?: number  // リエントリー費用（未設定時はentryFeeと同額）
  reentries?: Record<string, number>  // uid → リエントリー回数
  // プレミアリングオプション
  hasRebuy?: boolean
  rebuyFee?: number    // リバイ費用（未設定時はentryFeeと同額）
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
  achievementId?: string  // 実績由来の場合
  grantedBy?: string      // 管理者付与の場合
  acquiredAt: Timestamp
}

// 管理者が作成する非売品称号テンプレート
export interface AdminTitle {
  id: string
  title: string
  tier: 'common' | 'rare' | 'elite' | 'prime'
  description: string
  createdBy: string
  createdAt: Timestamp
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
  itemSubtype?: 'title' | 'avatar_color' | 'avatar_decoration' | 'avatar_variant' | 'point_icon' | 'custom_hand_title'
  decorationType?: 'frame' | 'overlay'  // avatar_decoration の下位分類
  frameStyle?: string    // FRAME_DEFS のキー
  overlayId?:  string    // OVERLAY_DEFS のキー
  pointIconId?: string   // POINT_ICON_DEFS のキー
  avatarVariant?: string  // アバターバリエーションID
  titleTier?: 'common' | 'rare' | 'elite' | 'prime'  // 称号レアリティ
  allowMultiplePurchase?: boolean  // 複数購入可能か（custom_hand_title用）
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
  customValue?: string  // カスタムハンド称号の入力値（例: "98s", "TT"）
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
  | 'match_ready'

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

// ── Ring de BINGO ─────────────────────────────────────────────────────────────

export interface BingoMission {
  cellIndex: number  // 0-24 (5x5グリッド、中央12はFREE)
  text: string
}

export interface BingoMissionTemplate {
  id: string
  text: string
  isActive: boolean
  createdBy: string
  createdAt: Timestamp
}

export interface BingoCard {
  id: string
  name: string
  description: string
  missions: BingoMission[]
  pointsPerCell: number       // 1マス達成ごとのポイント
  pointsPerBingo: number      // 初回ビンゴ達成ポイント
  pointsForCompletion: number // 全マス完了ボーナス
  isAvailable: boolean
  createdBy: string
  createdAt: Timestamp
}

export interface UserBingoCard {
  id: string
  uid: string
  bingoCardId: string
  bingoCardName: string
  eventId: string             // 配布元イベントID
  missions: BingoMission[]
  completedCells: number[]    // 完了したセルのインデックス配列
  claimedBingoLines: number[] // ポイント受取済みのビンゴラインインデックス
  pointsPerCell: number
  pointsPerBingo: number
  pointsForCompletion: number // 全マス完了ボーナス
  assignedAt: Timestamp       // 配布日時
  completedAt?: Timestamp     // 全マス完了時（廃止予定、finishedAtに移行）
  finishedAt?: Timestamp      // ビンゴ終了日時（ユーザーが「終了する」を押した日時）
  firstBingoClaimed?: boolean // 初回ビンゴポイント受取済みフラグ（廃止予定）
}

// ── イベントサマリー ─────────────────────────────────────────────────────────────

export interface TournamentResultSummary {
  matchId: string
  title: string
  rank: number
  earnedPoints: number
}

export interface RingResultSummary {
  matchId: string
  title: string
  entryFee: number
  cashback: number
  netPoints: number  // cashback - entryFee - rebuyFees
}

export interface BingoResultSummary {
  bingoCardId: string
  name: string
  completedCells: number
  bingoCount: number
  earnedPoints: number
}

export interface EventParticipantSummary {
  id: string
  eventId: string
  eventTitle: string
  uid: string
  attendancePoints: number
  tournamentResults: TournamentResultSummary[]
  ringResults: RingResultSummary[]
  bingoResults: BingoResultSummary[]
  totalEarnedPoints: number
  isRead: boolean
  createdAt: Timestamp
}

// ── プレイヤーメモ（個人用）─────────────────────────────────────────────────────
export interface PlayerNote {
  id: string
  ownerUid: string     // メモを書いた人
  targetUid: string    // メモ対象のプレイヤー
  content: string      // メモ内容
  updatedAt: Timestamp
}

// ── ハンド履歴 ─────────────────────────────────────────────────────────────────

export type PokerAction = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'
export type PokerPosition = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'MP+1' | 'CO' | string

export interface HandAction {
  uid: string | null
  displayName: string
  action: PokerAction
  amount?: number
  isAllIn?: boolean
}

export interface HandPlayer {
  uid: string | null          // circlesユーザー（ゲストはnull）
  displayName: string
  seatNumber: number
  position: PokerPosition
  startingStack: number
  holeCards: [string, string] // 'As', 'Kh' 等
}

export interface HandWinner {
  uid: string | null
  displayName: string
  amount: number
  hand?: string               // "Two Pair, Aces and Kings"
}

export interface HandHistory {
  id: string
  handNumber: number
  playedAt: Timestamp

  // ブラインド構造
  blinds: { sb: number; bb: number; ante?: number }

  // プレイヤー（シート順）
  players: HandPlayer[]

  // ストリート別アクション
  actions: {
    preflop: HandAction[]
    flop?: HandAction[]
    turn?: HandAction[]
    river?: HandAction[]
  }

  // ボード
  board: {
    flop?: [string, string, string]
    turn?: string
    river?: string
  }

  // 結果
  pot: number
  winners: HandWinner[]

  // メタ
  importedAt: Timestamp
  importedBy: string
}

