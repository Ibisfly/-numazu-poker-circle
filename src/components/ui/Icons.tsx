// lucide-react の re-export + カスタムSVGアイコン

export {
  Home,
  BarChart2,
  CreditCard,
  User,
  Bell,
  ShoppingBag,
  Shield,
  Camera,
  CalendarDays,
  Trophy,
  Users,
  ChevronLeft,
  ArrowRight,
  Lock,
  CheckCircle2,
  Award,
  Medal,
  Feather,
  Zap,
  Gem,
  Pencil,
  X,
  Plus,
  LogOut,
  Eye,
  EyeOff,
  Swords,
  Star,
  Settings,
  AlertCircle,
  Check,
  RotateCcw,
  Coins,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Minus,
  BookOpen,
  Shuffle,
} from 'lucide-react'

import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

// ── BLACK SWAN ロゴ用スワンシルエット ────────────────────────────────────────
export const SwanIcon = ({ size = 24, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M20 6c-1.1 0-2 .4-2.7 1L14 10.2V8c0-2.2-1.8-4-4-4C7.8 4 6 5.8 6 8v2.5C4.8 11.3 4 12.6 4 14c0 2.2 1.8 4 4 4h1v1a1 1 0 0 0 2 0v-1h1c2.2 0 4-1.8 4-4 0-.5-.1-1-.3-1.4L18.7 10c.4-.6 1-.9 1.3-.9.6 0 1-.4 1-1s-.4-1.1-1-1.1zM10 16H8c-1.1 0-2-.9-2-2s.9-2 2-2h2v4zm4 0h-2v-4h2c1.1 0 2 .9 2 2s-.9 2-2 2z" />
  </svg>
)

// ── 羽（ポイント通貨）アイコン ───────────────────────────────────────────────
export const FeatherPtIcon = ({ size = 16, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
    <line x1="16" y1="8" x2="2" y2="22" />
    <line x1="17.5" y1="15" x2="9" y2="15" />
  </svg>
)

// ── スペード（マッチ）アイコン ────────────────────────────────────────────────
export const SpadeIcon = ({ size = 24, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 2L4.5 9.5C3.5 10.6 3 12 3 13.5 3 16.5 5.5 19 8.5 19c1 0 2-.3 2.8-.8L10 21h4l-1.3-2.8c.8.5 1.8.8 2.8.8 3 0 5.5-2.5 5.5-5.5 0-1.5-.5-2.9-1.5-4L12 2z" />
  </svg>
)

// ── 初心者マーク ──────────────────────────────────────────────────────────────
export const BeginnerIcon = ({ size = 16, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 22 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* 若葉マーク — 左半分（黄緑） */}
    <path
      d="M11,26 C11,26 1,15 1,9 C1,4.5 5.5,1 11,1 Z"
      fill="#82c600"
    />
    {/* 若葉マーク — 右半分（黄） */}
    <path
      d="M11,26 C11,26 21,15 21,9 C21,4.5 16.5,1 11,1 Z"
      fill="#ffd000"
    />
    {/* 中央の境界線（細く） */}
    <line x1="11" y1="1" x2="11" y2="26" stroke="white" strokeWidth="0.6" strokeOpacity="0.5" />
  </svg>
)

// ── ランキングメダル（1〜3位）────────────────────────────────────────────────
export const GoldMedalIcon = ({ size = 24, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="14" r="7" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" />
    <circle cx="12" cy="14" r="4.5" fill="#fde68a" />
    <text x="12" y="18" textAnchor="middle" fontSize="7" fill="#92400e" fontWeight="bold">1</text>
    <path d="M9 7.5L8 4h8l-1 3.5" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const SilverMedalIcon = ({ size = 24, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="14" r="7" fill="#94a3b8" stroke="#64748b" strokeWidth="1.5" />
    <circle cx="12" cy="14" r="4.5" fill="#e2e8f0" />
    <text x="12" y="18" textAnchor="middle" fontSize="7" fill="#334155" fontWeight="bold">2</text>
    <path d="M9 7.5L8 4h8l-1 3.5" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

export const BronzeMedalIcon = ({ size = 24, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <circle cx="12" cy="14" r="7" fill="#c2712f" stroke="#9a5420" strokeWidth="1.5" />
    <circle cx="12" cy="14" r="4.5" fill="#fed7aa" />
    <text x="12" y="18" textAnchor="middle" fontSize="7" fill="#7c2d12" fontWeight="bold">3</text>
    <path d="M9 7.5L8 4h8l-1 3.5" stroke="#9a5420" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)
