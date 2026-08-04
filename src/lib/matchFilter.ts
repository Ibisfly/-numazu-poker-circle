import type { Match, MatchCategory } from '@/types'

/** すべて / トーナメント / プレミアリング */
export type CategoryFilter = 'all' | MatchCategory
/** すべて / 開催前・開催中 / 終了 */
export type StatusFilter = 'all' | 'open' | 'finished'
/** 半年以内 / すべての期間 */
export type PeriodFilter = 'recent' | 'all'

export interface MatchFilters {
  category: CategoryFilter
  status: StatusFilter
  period: PeriodFilter
}

export const DEFAULT_MATCH_FILTERS: MatchFilters = {
  category: 'all',
  status: 'all',
  period: 'recent',
}

const HALF_YEAR_MONTHS = 6

/** 半年前の日時（境界は開催日時 scheduledAt で判定する） */
export const halfYearAgo = (now: Date = new Date()): Date => {
  const d = new Date(now)
  d.setMonth(d.getMonth() - HALF_YEAR_MONTHS)
  return d
}

export const filterMatches = (
  matches: Match[],
  filters: MatchFilters,
  now: Date = new Date()
): Match[] => {
  const since = halfYearAgo(now)
  return matches.filter((m) => {
    if (filters.category !== 'all' && (m.matchCategory ?? 'tournament') !== filters.category) {
      return false
    }
    if (filters.status === 'open' && m.status === 'finished') return false
    if (filters.status === 'finished' && m.status !== 'finished') return false
    if (filters.period === 'recent') {
      // 日時未設定の古いデータは期間で除外しない（消えると探せなくなるため）
      const scheduled = m.scheduledAt?.toDate?.()
      if (scheduled && scheduled < since) return false
    }
    return true
  })
}

export const CATEGORY_FILTER_LABELS: Record<CategoryFilter, string> = {
  all: 'すべて',
  tournament: 'トナメ',
  ring: 'リング',
}

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'すべて',
  open: '開催前・開催中',
  finished: '終了',
}

export const PERIOD_FILTER_LABELS: Record<PeriodFilter, string> = {
  recent: '半年以内',
  all: '全期間',
}
