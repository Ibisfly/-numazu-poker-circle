import { FeatherPtIcon } from './Icons'
import { DynamicPointIcon } from './SwanAvatar'

interface FeatherIconProps {
  className?: string
  size?: number
  iconId?: string
}

// デフォルトの羽アイコン（従来互換）
export const FeatherIcon = ({ className = '', size = 14 }: FeatherIconProps) => (
  <FeatherPtIcon size={size} className={`inline-block text-swan-accent ${className}`} />
)

// ユーザー設定に応じた動的アイコン
export const PointIcon = ({ className = '', size = 14, iconId = 'feather' }: FeatherIconProps) => (
  <span className={`inline-flex items-center justify-center text-swan-accent ${className}`}>
    <DynamicPointIcon iconId={iconId} size={size} />
  </span>
)
