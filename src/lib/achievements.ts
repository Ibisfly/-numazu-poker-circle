import type { Achievement } from '@/types'

export const ACHIEVEMENTS: Achievement[] = [
  // ── 来店 ──────────────────────────────────────────────────────────────────
  {
    id: 'first_attendance',
    name: 'はじめの一歩',
    description: '初回来店',
    condition: 'attendance_count >= 1',
  },
  {
    id: 'regular_5',
    name: '常連メンバー',
    description: '来店回数5回',
    condition: 'attendance_count >= 5',
  },
  {
    id: 'legend_20',
    name: 'いつもこの場所で',
    description: '来店回数20回',
    condition: 'attendance_count >= 20',
  },
  // ── トーナメント ──────────────────────────────────────────────────────────
  {
    id: 'tournament_first',
    name: 'フライトビギナー',
    description: 'トーナメント初参加',
    condition: 'tournament_entries >= 1',
  },
  {
    id: 'podium',
    name: '表彰台',
    description: 'トーナメントで初入賞（ポイント獲得圏内）',
    condition: 'tournament_top >= 1',
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'トーナメントで初優勝',
    condition: 'tournament_wins >= 1',
  },
  {
    id: 'trophy_collector',
    name: 'トロフィーコレクター',
    description: 'トーナメント優勝3回（累計）',
    condition: 'tournament_wins >= 3',
  },
  {
    id: 'tournament_points_10k',
    name: '爆噴き',
    description: 'トーナメントでの獲得ポイント累計10,000到達',
    condition: 'tournament_total_points >= 10000',
  },
  // ── プレミアリング ────────────────────────────────────────────────────────
  {
    id: 'ring_debut',
    name: 'リングイン',
    description: 'プレミアリング初参加',
    condition: 'ring_entries >= 1',
  },
  {
    id: 'ring_earnings_200',
    name: '勝利の鐘',
    description: 'プレミアリングでの累計獲得ポイント200到達',
    condition: 'ring_earned_total >= 200',
  },
  {
    id: 'ring_earnings_2k',
    name: '大喰らい',
    description: 'プレミアリングでの累計獲得ポイント1,000到達',
    condition: 'ring_earned_total >= 1000',
  },
  {
    id: 'ring_earnings_10k',
    name: '羽も積もれば山となる',
    description: 'プレミアリングでの累計獲得ポイント5,000到達',
    condition: 'ring_earned_total >= 5000',
  },
  {
    id: 'ring_big_win',
    name: '総てを手に入れた',
    description: 'プレミアリング1試合での収支が+500超え',
    condition: 'ring_single_net > 500',
  },
  // ── ショップ ──────────────────────────────────────────────────────────────
  {
    id: 'shopper',
    name: '買い物上手',
    description: '特典・装飾・称号合わせて5つ以上購入',
    condition: 'shop_purchases >= 5',
  },
  // ── 累計ポイント ──────────────────────────────────────────────────────────
  {
    id: 'saver',
    name: '貯金好き',
    description: '累計獲得ポイント2,000超過',
    condition: 'total_points >= 2000',
  },
  {
    id: 'vault',
    name: '金庫番',
    description: '累計獲得ポイント20,000超過',
    condition: 'total_points >= 20000',
  },
  // ── シークレット ──────────────────────────────────────────────────────────
  {
    id: 'near_miss',
    name: '泡沫の夢',
    description: 'トーナメントでポイントがもらえる1つ下の順位で終了',
    condition: 'tournament_near_miss',
    isSecret: true,
  },
  {
    id: 'fish',
    name: 'フィッシュ！',
    description: 'プレミアリングで1度に200ポイント以上のマイナス',
    condition: 'ring_big_loss >= 200',
    isSecret: true,
  },
  {
    id: 'count_stop',
    name: 'カウントストップ',
    description: '累計獲得ポイントが99,999を超過',
    condition: 'total_points > 99999',
    isSecret: true,
  },
  {
    id: 'annual_champion',
    name: '年間王者',
    description: '年間ランキング1位（年間リセット時に確定）',
    condition: 'annual_rank == 1',
    isSecret: true,
  },
]
