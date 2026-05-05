export type TitleTier = 'common' | 'rare' | 'elite' | 'prime'

interface TitleBadgeProps {
  title: string
  tier?: TitleTier
}

export const TIER_LABELS: Record<TitleTier, string> = {
  common: 'Common',
  rare:   'Rare',
  elite:  'Elite',
  prime:  'Prime',
}

export const TitleBadge = ({ title, tier = 'common' }: TitleBadgeProps) => {
  // Common：グレー文字・装飾なし
  if (tier === 'common') {
    return (
      <span className="text-xs text-slate-400">
        {title}
      </span>
    )
  }

  // Rare：ゴールド文字・静的・装飾なし
  if (tier === 'rare') {
    return (
      <span className="text-xs font-semibold text-yellow-400">
        {title}
      </span>
    )
  }

  // Elite：ゴールドシマーアニメーション（旧Prime）
  if (tier === 'elite') {
    return (
      <span className="title-elite-text text-xs">
        ✦ {title} ✦
      </span>
    )
  }

  // Prime：虹色グロー全開
  if (tier === 'prime') {
    return (
      <span
        className="inline-block"
        style={{ animation: 'primeGlowCycle 3s linear infinite, primePulse 2s ease-in-out infinite' }}
      >
        <span className="title-prime-text text-xs">
          ✦✦ {title} ✦✦
        </span>
      </span>
    )
  }

  return null
}

// ティアの選択肢（管理画面用）
export const TIER_OPTIONS: { value: TitleTier; label: string; description: string }[] = [
  { value: 'common', label: 'Common', description: 'グレー文字・装飾なし' },
  { value: 'rare',   label: 'Rare',   description: 'ゴールド文字・静的' },
  { value: 'elite',  label: 'Elite',  description: 'ゴールドシマーアニメ＋セリフ体' },
  { value: 'prime',  label: 'Prime',  description: '虹色グロー全開・脳汁確定' },
]
