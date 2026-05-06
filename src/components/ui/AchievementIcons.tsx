import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const base = (size = 28) => ({ width: size, height: size, viewBox: '0 0 28 28', fill: 'none' } as const)

// ── はじめの一羽：羽根（フェザー）───────────────────────────────────────
export const IcoFirstAttendance = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 4C15 4 8 8 6 16L10 14C9 17 9 20 10 22C13 18 17 16 20 4Z"
      fill="#ec4899" stroke="#be185d" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M10 22L6 26" stroke="#be185d" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 14C11 13 13 12 15 12" stroke="#fce7f3" strokeWidth="1" strokeLinecap="round" />
    <path d="M9 17C10 16 12 15 14 15" stroke="#fce7f3" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

// ── 常連の翼：翼を広げた形 ───────────────────────────────────────────────
export const IcoRegular10 = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 18C14 18 8 14 4 8C6 8 9 10 11 12C9 9 9 5 12 4C12 8 13 13 14 18Z"
      fill="#818cf8" stroke="#4f46e5" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M14 18C14 18 20 14 24 8C22 8 19 10 17 12C19 9 19 5 16 4C16 8 15 13 14 18Z"
      fill="#818cf8" stroke="#4f46e5" strokeWidth="0.8" strokeLinejoin="round" />
    <circle cx="14" cy="20" r="2.5" fill="#4f46e5" />
  </svg>
)

// ── 伝説の黒鳥：スワン＋星 ──────────────────────────────────────────────
export const IcoLegend30 = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <ellipse cx="15" cy="18" rx="8" ry="5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
    <path d="M15 18C12 15 8 12 8 8C10 7 12 9 14 11C12 8 13 4 16 4C16 8 16 14 15 18Z"
      fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
    <path d="M4 8 L5.5 5.5 L7 8 L4.5 6.5 Z" fill="#fbbf24" />
    <path d="M22 5 L23 3 L24 5 L22 4 Z" fill="#fbbf24" />
    <path d="M20 10 L21 8 L22 10 L20 9 Z" fill="#fbbf24" />
    <circle cx="14" cy="6" r="1" fill="#fbbf24" />
  </svg>
)

// ── フライトビギナー：フラッグ ──────────────────────────────────────────
export const IcoTournamentFirst = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <line x1="7" y1="4" x2="7" y2="24" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 4L20 8L7 13Z" fill="#22d3ee" stroke="#0891b2" strokeWidth="0.8" />
    <circle cx="7" cy="24" r="1.5" fill="#64748b" />
  </svg>
)

// ── 表彰台：3段の表彰台 ────────────────────────────────────────────────
export const IcoPodium = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    {/* 2位 */}
    <rect x="3" y="16" width="7" height="8" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
    <text x="6.5" y="22" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">2</text>
    {/* 1位 */}
    <rect x="10.5" y="12" width="7" height="12" rx="1" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
    <text x="14" y="20" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">1</text>
    {/* 3位 */}
    <rect x="18" y="18" width="7" height="6" rx="1" fill="#cd7c3a" stroke="#92400e" strokeWidth="0.8" />
    <text x="21.5" y="23" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">3</text>
    {/* 王冠（1位の上） */}
    <path d="M11 12L12.5 9L14 11L15.5 9L17 12Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
  </svg>
)

// ── 王者の羽：トロフィー ────────────────────────────────────────────────
export const IcoChampion = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M8 4H20V14C20 18 17 21 14 22C11 21 8 18 8 14V4Z"
      fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
    <path d="M8 7C6 7 4 8 4 11C4 13 6 14 8 14" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M20 7C22 7 24 8 24 11C24 13 22 14 20 14" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <rect x="11" y="22" width="6" height="2" rx="1" fill="#d97706" />
    <rect x="9" y="24" width="10" height="1.5" rx="0.75" fill="#d97706" />
    <path d="M11 10L13 12L17 8" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ── 連覇の飛翔：2重の稲妻 ──────────────────────────────────────────────
export const IcoConsecutiveWin = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M9 4L5 14H10L7 24L16 11H11L15 4Z" fill="#facc15" stroke="#ca8a04" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M17 8L14 16H18L16 24L23 13H19L22 8Z" fill="#fb923c" stroke="#c2410c" strokeWidth="0.8" strokeLinejoin="round" />
  </svg>
)

// ── マッチデビュー：スペードマーク ─────────────────────────────────────
export const IcoMatchDebut = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 4C14 4 5 11 5 17C5 20 8 22 11 21C10 22 9 24 8 24H20C19 24 18 22 17 21C20 22 23 20 23 17C23 11 14 4 14 4Z"
      fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
  </svg>
)

// ── ハンター：メダル ────────────────────────────────────────────────────
export const IcoMatchHunter = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <line x1="14" y1="4" x2="14" y2="10" stroke="#64748b" strokeWidth="1.5" />
    <path d="M10 4H18" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="14" cy="18" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
    <circle cx="14" cy="18" r="5.5" fill="#fde68a" stroke="#d97706" strokeWidth="0.5" />
    <path d="M11 18L13 20L17 16" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// ── コレクター：宝石5つ ────────────────────────────────────────────────
export const IcoCollector = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    {/* 中央 */}
    <polygon points="14,8 16,11 14,14 12,11" fill="#818cf8" stroke="#4f46e5" strokeWidth="0.7" />
    {/* 上 */}
    <polygon points="14,3 15.5,6 14,8 12.5,6" fill="#f472b6" stroke="#db2777" strokeWidth="0.7" />
    {/* 左 */}
    <polygon points="8,10 11,9 12,11 9,13" fill="#34d399" stroke="#059669" strokeWidth="0.7" />
    {/* 右 */}
    <polygon points="20,10 17,9 16,11 19,13" fill="#fb923c" stroke="#ea580c" strokeWidth="0.7" />
    {/* 下 */}
    <polygon points="14,14 16,17 14,21 12,17" fill="#facc15" stroke="#ca8a04" strokeWidth="0.7" />
  </svg>
)

// ── 大富豪の羽：ダイヤモンド ────────────────────────────────────────────
export const IcoMillionaire = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 4L22 11L14 26L6 11Z" fill="#67e8f9" stroke="#0e7490" strokeWidth="1" strokeLinejoin="round" />
    <path d="M6 11H22" stroke="#0e7490" strokeWidth="0.8" />
    <path d="M10 5L8 11L14 4L20 11L18 5" stroke="#0e7490" strokeWidth="0.8" strokeLinejoin="round" fill="none" />
    <path d="M14 4L14 26" stroke="#a5f3fc" strokeWidth="0.5" strokeOpacity="0.6" />
    {/* 光沢 */}
    <path d="M10 9L12 12" stroke="white" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
  </svg>
)

// ── ID → コンポーネント マップ ───────────────────────────────────────────
export const ACHIEVEMENT_ICON_MAP: Record<string, React.FC<P>> = {
  first_attendance: IcoFirstAttendance,
  regular_10:       IcoRegular10,
  legend_30:        IcoLegend30,
  tournament_first: IcoTournamentFirst,
  podium:           IcoPodium,
  champion:         IcoChampion,
  consecutive_win:  IcoConsecutiveWin,
  match_debut:      IcoMatchDebut,
  match_hunter:     IcoMatchHunter,
  collector:        IcoCollector,
  millionaire:      IcoMillionaire,
}

// ── 汎用コンポーネント ────────────────────────────────────────────────────
export const AchievementIcon = ({
  achievementId,
  size = 28,
  className = '',
}: {
  achievementId: string
  size?: number
  className?: string
}) => {
  const Icon = ACHIEVEMENT_ICON_MAP[achievementId]
  if (!Icon) return <span className={className} style={{ fontSize: size * 0.85 }}>🏅</span>
  return <Icon size={size} className={className} />
}
