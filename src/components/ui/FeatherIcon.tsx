import { FeatherPtIcon } from './Icons'

interface FeatherIconProps {
  className?: string
  size?: number
}

export const FeatherIcon = ({ className = '', size = 14 }: FeatherIconProps) => (
  <FeatherPtIcon size={size} className={`inline-block text-swan-accent ${className}`} />
)
