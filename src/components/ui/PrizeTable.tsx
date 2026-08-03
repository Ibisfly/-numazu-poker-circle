import { FeatherIcon } from './FeatherIcon'
import type { PrizeDistributionResult } from '@/lib/prizeDistribution'

interface PrizeTableProps {
  result: PrizeDistributionResult
  /** 表の上に出す補足（暫定である旨など） */
  note?: string
  /** 入賞人数が多いときに折りたたむ閾値 */
  collapseOver?: number
}

const SummaryCell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="bg-swan-black/40 border border-swan-border/60 rounded-lg px-2 py-1.5">
    <p className="text-[10px] text-swan-sub">{label}</p>
    <p className="text-sm font-bold text-swan-text flex items-center gap-0.5">{children}</p>
  </div>
)

/** 自動配分の結果（賞金プール・入賞人数・順位別賞金）を表示する */
export const PrizeTable = ({ result, note, collapseOver = 12 }: PrizeTableProps) => {
  if (!result.ok) {
    return (
      <p className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
        {result.reason}
      </p>
    )
  }

  const rows = result.prizes.map((prize, i) => (
    <div
      key={i}
      className="flex items-center justify-between py-1 border-b border-swan-border/50 last:border-0"
    >
      <span className={`text-sm ${i === 0 ? 'text-swan-accent font-bold' : 'text-swan-text'}`}>
        {i + 1}位
      </span>
      <span className="text-sm flex items-center gap-1 text-swan-accent">
        <FeatherIcon />
        {prize.toLocaleString()}
      </span>
    </div>
  ))

  return (
    <div className="space-y-2">
      {note && <p className="text-[11px] text-swan-sub">{note}</p>}

      <div className="grid grid-cols-3 gap-1.5">
        <SummaryCell label="賞金プール">
          <FeatherIcon />
          {result.pool.toLocaleString()}
        </SummaryCell>
        <SummaryCell label="入賞">
          {result.itmCount}名
          <span className="text-[10px] text-swan-sub font-normal ml-1">
            {(result.itmRate * 100).toFixed(1)}%
          </span>
        </SummaryCell>
        <SummaryCell label="最低入賞額">
          <FeatherIcon />
          {result.minPrize.toLocaleString()}
        </SummaryCell>
      </div>

      {result.itmCountReduced && (
        <p className="text-[11px] text-yellow-400">
          ※ エントリー数が少なく規定の{result.formulaItmCount}名分の条件を満たせないため、
          入賞{result.itmCount}名に調整しています
        </p>
      )}

      {result.prizes.length > collapseOver ? (
        <details className="bg-swan-black/30 border border-swan-border/60 rounded-lg px-3 py-2">
          <summary className="text-xs text-swan-accent cursor-pointer">
            順位別プライズを表示（{result.itmCount}名）
          </summary>
          <div className="mt-2">{rows}</div>
        </details>
      ) : (
        <div>{rows}</div>
      )}
    </div>
  )
}
