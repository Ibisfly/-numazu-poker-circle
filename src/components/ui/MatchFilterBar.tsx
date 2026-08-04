import {
  CATEGORY_FILTER_LABELS, STATUS_FILTER_LABELS, PERIOD_FILTER_LABELS,
  type MatchFilters, type CategoryFilter, type StatusFilter, type PeriodFilter,
} from '@/lib/matchFilter'

interface MatchFilterBarProps {
  filters: MatchFilters
  onChange: (filters: MatchFilters) => void
  /** 絞り込み後の件数（全件中の何件か） */
  shown: number
  total: number
}

const Chip = ({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
      active
        ? 'bg-swan-accent text-black border-swan-accent'
        : 'border-swan-border text-swan-sub hover:border-swan-accent/50'
    }`}
  >
    {children}
  </button>
)

/** マッチ一覧の絞り込みバー（カテゴリ・状態・期間） */
export const MatchFilterBar = ({ filters, onChange, shown, total }: MatchFilterBarProps) => (
  <div className="space-y-2 pb-1">
    <div className="flex flex-wrap gap-1.5">
      {(['all', 'tournament', 'ring'] as CategoryFilter[]).map((c) => (
        <Chip key={c} active={filters.category === c} onClick={() => onChange({ ...filters, category: c })}>
          {CATEGORY_FILTER_LABELS[c]}
        </Chip>
      ))}
    </div>
    <div className="flex flex-wrap gap-1.5">
      {(['all', 'open', 'finished'] as StatusFilter[]).map((s) => (
        <Chip key={s} active={filters.status === s} onClick={() => onChange({ ...filters, status: s })}>
          {STATUS_FILTER_LABELS[s]}
        </Chip>
      ))}
    </div>
    <div className="flex items-center justify-between gap-2">
      <div className="flex flex-wrap gap-1.5">
        {(['recent', 'all'] as PeriodFilter[]).map((p) => (
          <Chip key={p} active={filters.period === p} onClick={() => onChange({ ...filters, period: p })}>
            {PERIOD_FILTER_LABELS[p]}
          </Chip>
        ))}
      </div>
      <span className="text-[11px] text-swan-muted shrink-0">
        {shown} / {total} 件
      </span>
    </div>
  </div>
)
