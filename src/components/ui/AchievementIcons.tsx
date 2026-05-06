import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

const base = (size = 28) => ({ width: size, height: size, viewBox: '0 0 28 28', fill: 'none' } as const)

// ── はじめの一歩：羽根 ───────────────────────────────────────────────────
export const IcoFirstAttendance = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M20 4C15 4 8 8 6 16L10 14C9 17 9 20 10 22C13 18 17 16 20 4Z"
      fill="#ec4899" stroke="#be185d" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M10 22L6 26" stroke="#be185d" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M10 14C11 13 13 12 15 12" stroke="#fce7f3" strokeWidth="1" strokeLinecap="round" />
    <path d="M9 17C10 16 12 15 14 15" stroke="#fce7f3" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

// ── 常連メンバー：翼 ─────────────────────────────────────────────────────
export const IcoRegular5 = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 18C14 18 8 14 4 8C6 8 9 10 11 12C9 9 9 5 12 4C12 8 13 13 14 18Z"
      fill="#818cf8" stroke="#4f46e5" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M14 18C14 18 20 14 24 8C22 8 19 10 17 12C19 9 19 5 16 4C16 8 15 13 14 18Z"
      fill="#818cf8" stroke="#4f46e5" strokeWidth="0.8" strokeLinejoin="round" />
    <circle cx="14" cy="20" r="2.5" fill="#4f46e5" />
  </svg>
)

// ── いつもこの場所で：スワン＋星 ─────────────────────────────────────────
export const IcoLegend20 = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <ellipse cx="15" cy="18" rx="8" ry="5" fill="#0f172a" stroke="#475569" strokeWidth="1" />
    <path d="M15 18C12 15 8 12 8 8C10 7 12 9 14 11C12 8 13 4 16 4C16 8 16 14 15 18Z"
      fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
    <path d="M4 8L5.5 5.5L7 8L4.5 6.5Z" fill="#fbbf24" />
    <path d="M22 5L23 3L24 5L22 4Z" fill="#fbbf24" />
    <path d="M20 10L21 8L22 10L20 9Z" fill="#fbbf24" />
    <circle cx="14" cy="6" r="1" fill="#fbbf24" />
  </svg>
)

// ── フライトビギナー：フラッグ ─────────────────────────────────────────
export const IcoTournamentFirst = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <line x1="7" y1="4" x2="7" y2="24" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M7 4L20 8L7 13Z" fill="#22d3ee" stroke="#0891b2" strokeWidth="0.8" />
    <circle cx="7" cy="24" r="1.5" fill="#64748b" />
  </svg>
)

// ── 表彰台 ────────────────────────────────────────────────────────────────
export const IcoPodium = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="16" width="7" height="8" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="0.8" />
    <text x="6.5" y="22" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">2</text>
    <rect x="10.5" y="12" width="7" height="12" rx="1" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
    <text x="14" y="20" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">1</text>
    <rect x="18" y="18" width="7" height="6" rx="1" fill="#cd7c3a" stroke="#92400e" strokeWidth="0.8" />
    <text x="21.5" y="23" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">3</text>
    <path d="M11 12L12.5 9L14 11L15.5 9L17 12Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
  </svg>
)

// ── Champion：トロフィー ─────────────────────────────────────────────────
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

// ── トロフィーコレクター：3杯 ────────────────────────────────────────────
export const IcoTrophyCollector = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    {/* 左：銀 */}
    <path d="M2 9H8V13C8 14.5 6.5 15.5 5 16C3.5 15.5 2 14.5 2 13V9Z" fill="#94a3b8" stroke="#64748b" strokeWidth="0.7" />
    <path d="M2 10.5C1 10.5 0.5 11.2 0.5 12C0.5 12.8 1 13.3 2 13.5" stroke="#64748b" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    <path d="M8 10.5C9 10.5 9.5 11.2 9.5 12C9.5 12.8 9 13.3 8 13.5" stroke="#64748b" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    <rect x="4" y="16" width="2" height="1.5" rx="0.4" fill="#64748b" />
    <rect x="3" y="17.5" width="4" height="1" rx="0.5" fill="#64748b" />
    {/* 中央：金（大） */}
    <path d="M9 5H19V12C19 15 17 17 14 18C11 17 9 15 9 12V5Z" fill="#fbbf24" stroke="#d97706" strokeWidth="0.9" />
    <path d="M9 7.5C7.5 7.5 6.5 8.5 6.5 10C6.5 11 7.5 12 9 12" stroke="#d97706" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <path d="M19 7.5C20.5 7.5 21.5 8.5 21.5 10C21.5 11 20.5 12 19 12" stroke="#d97706" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    <rect x="12" y="18" width="4" height="2" rx="0.5" fill="#d97706" />
    <rect x="10" y="20" width="8" height="1.2" rx="0.6" fill="#d97706" />
    <path d="M12 9.5L13.5 11L17 8" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    {/* 右：銅 */}
    <path d="M20 9H26V13C26 14.5 24.5 15.5 23 16C21.5 15.5 20 14.5 20 13V9Z" fill="#cd7c3a" stroke="#92400e" strokeWidth="0.7" />
    <path d="M20 10.5C19 10.5 18.5 11.2 18.5 12C18.5 12.8 19 13.3 20 13.5" stroke="#92400e" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    <path d="M26 10.5C27 10.5 27.5 11.2 27.5 12C27.5 12.8 27 13.3 26 13.5" stroke="#92400e" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    <rect x="22" y="16" width="2" height="1.5" rx="0.4" fill="#92400e" />
    <rect x="21" y="17.5" width="4" height="1" rx="0.5" fill="#92400e" />
  </svg>
)

// ── 爆噴き：炎 ───────────────────────────────────────────────────────────
export const IcoTournamentPoints10k = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 3C11 7 9 10 8 14C7 18 9.5 23 14 24C18.5 23 21 18 20 14C19 10 17 7 14 3Z"
      fill="#f97316" stroke="#c2410c" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M14 10C12.5 13 11.5 15 11.5 17.5C11.5 20 12.5 22.5 14 24C15.5 22.5 16.5 20 16.5 17.5C16.5 15 15.5 13 14 10Z"
      fill="#fbbf24" stroke="#d97706" strokeWidth="0.6" />
    <path d="M14 17C13.3 18.5 13.3 21 14 23C14.7 21 14.7 18.5 14 17Z"
      fill="#fff7ed" strokeWidth="0" />
    <path d="M7 9L8.5 7.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M21 9L19.5 7.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5 15L3.5 15" stroke="#f97316" strokeWidth="1" strokeLinecap="round" />
    <path d="M23 15L24.5 15" stroke="#f97316" strokeWidth="1" strokeLinecap="round" />
  </svg>
)

// ── リングイン：スペード ──────────────────────────────────────────────────
export const IcoRingDebut = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 4C14 4 5 11 5 17C5 20 8 22 11 21C10 22 9 24 8 24H20C19 24 18 22 17 21C20 22 23 20 23 17C23 11 14 4 14 4Z"
      fill="#1e293b" stroke="#475569" strokeWidth="0.8" />
  </svg>
)

// ── 勝利の鐘：ベル ───────────────────────────────────────────────────────
export const IcoRingEarnings200 = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 5C10.5 5 8 8 8 12V18H20V12C20 8 17.5 5 14 5Z"
      fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
    <rect x="6" y="17" width="16" height="2" rx="1" fill="#d97706" />
    <circle cx="14" cy="21.5" r="2" fill="#d97706" stroke="#92400e" strokeWidth="0.6" />
    <path d="M10 9C10 9 9 11 9 13.5" stroke="#fde68a" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M2.5 10C1.5 12 1.5 14 2.5 16" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" fill="none" />
    <path d="M25.5 10C26.5 12 26.5 14 25.5 16" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" fill="none" />
  </svg>
)

// ── 大喰らい：コインの山 ─────────────────────────────────────────────────
export const IcoRingEarnings2k = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    {/* コイン積み */}
    <ellipse cx="14" cy="22" rx="9" ry="2.5" fill="#d97706" stroke="#92400e" strokeWidth="0.8" />
    <ellipse cx="14" cy="19" rx="9" ry="2.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
    <ellipse cx="14" cy="16" rx="9" ry="2.5" fill="#fde68a" stroke="#d97706" strokeWidth="0.8" />
    <ellipse cx="14" cy="13" rx="9" ry="2.5" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
    {/* 口（貪欲） */}
    <path d="M8 8C8 5.5 10 4 14 4C18 4 20 5.5 20 8" stroke="#f97316" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <path d="M10 8C10 6.5 11.5 6 14 6C16.5 6 18 6.5 18 8" fill="#f97316" />
    <path d="M10 8L11 9.5L14 8.5L17 9.5L18 8" stroke="#c2410c" strokeWidth="0.6" fill="none" />
  </svg>
)

// ── 羽も積もれば山となる：山 ─────────────────────────────────────────────
export const IcoRingEarnings10k = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M2 25L11 7L20 25Z" fill="#475569" stroke="#334155" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M10 25L19 4L28 25Z" fill="#1e293b" stroke="#334155" strokeWidth="0.8" strokeLinejoin="round" />
    <path d="M19 4L16 13L22 13Z" fill="white" stroke="#94a3b8" strokeWidth="0.5" />
    {/* 羽根 */}
    <path d="M6 14C5.5 15 5.3 16.5 6 17C6.8 16.5 7.5 15.5 7.5 14.2C7 14.8 6.5 15.3 6 15.8"
      fill="#ec4899" stroke="#be185d" strokeWidth="0.5" />
    <path d="M4 7L4.4 5.8L4.8 7L3.8 6.4L4.8 5.8Z" fill="#fbbf24" />
    <path d="M24 6L24.3 5L24.6 6L23.7 5.5L24.3 5Z" fill="#fbbf24" />
  </svg>
)

// ── 総てを手に入れた：溢れる金袋 ────────────────────────────────────────
export const IcoRingBigWin = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M10 13C10 11 11.5 9 14 9C16.5 9 18 11 18 13V21C18 23 16 25 14 25C12 25 10 23 10 21V13Z"
      fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
    <path d="M12 9C12 7 12.5 6 14 5C15.5 6 16 7 16 9" fill="#d97706" stroke="#92400e" strokeWidth="0.8" />
    <text x="14" y="19.5" textAnchor="middle" fontSize="7" fill="#92400e" fontWeight="bold">¥</text>
    {/* 飛び出すコイン */}
    <circle cx="21" cy="11" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.7" />
    <circle cx="23.5" cy="6.5" r="1.5" fill="#fde68a" stroke="#d97706" strokeWidth="0.6" />
    <circle cx="7" cy="9" r="2" fill="#fbbf24" stroke="#d97706" strokeWidth="0.7" />
    <circle cx="4.5" cy="5" r="1.5" fill="#fde68a" stroke="#d97706" strokeWidth="0.6" />
    <circle cx="25" cy="14" r="1.3" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
  </svg>
)

// ── 買い物上手：ショッピングバッグ ──────────────────────────────────────
export const IcoShopper = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="5" y="11" width="18" height="14" rx="2" fill="#818cf8" stroke="#4f46e5" strokeWidth="1" />
    <path d="M10 11V8C10 5.8 11.8 4 14 4C16.2 4 18 5.8 18 8V11" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <polygon points="14,14 15.5,17 13,17" fill="#fbbf24" stroke="#d97706" strokeWidth="0.5" />
    <polygon points="9,16 10.5,19 8,19" fill="#f472b6" stroke="#db2777" strokeWidth="0.5" />
    <polygon points="19,14 20.5,17 18,17" fill="#34d399" stroke="#059669" strokeWidth="0.5" />
    <polygon points="14,19 15.5,22 13,22" fill="#fb923c" stroke="#ea580c" strokeWidth="0.5" />
  </svg>
)

// ── 貯金好き：ダイヤモンド ───────────────────────────────────────────────
export const IcoSaver = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M14 4L22 11L14 26L6 11Z" fill="#67e8f9" stroke="#0e7490" strokeWidth="1" strokeLinejoin="round" />
    <path d="M6 11H22" stroke="#0e7490" strokeWidth="0.8" />
    <path d="M10 5L8 11L14 4L20 11L18 5" stroke="#0e7490" strokeWidth="0.8" strokeLinejoin="round" fill="none" />
    <path d="M14 4L14 26" stroke="#a5f3fc" strokeWidth="0.5" strokeOpacity="0.6" />
    <path d="M10 9L12 12" stroke="white" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.6" />
  </svg>
)

// ── 金庫が足りない！：金庫扉 ─────────────────────────────────────────────
export const IcoVault = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <rect x="3" y="3" width="22" height="22" rx="3" fill="#334155" stroke="#475569" strokeWidth="1.5" />
    <circle cx="13" cy="14" r="7" fill="#1e293b" stroke="#64748b" strokeWidth="1.2" />
    <circle cx="13" cy="14" r="5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
    <line x1="13" y1="9.5" x2="13" y2="11.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="13" y1="16.5" x2="13" y2="18.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8.5" y1="14" x2="10.5" y2="14" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="15.5" y1="14" x2="17.5" y2="14" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="13" cy="14" r="1.5" fill="#fbbf24" />
    <line x1="13" y1="14" x2="13" y2="10.5" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
    {/* ハンドル */}
    <circle cx="22" cy="14" r="2.5" fill="#475569" stroke="#64748b" strokeWidth="0.8" />
    <circle cx="22" cy="14" r="1" fill="#64748b" />
  </svg>
)

// ── 泡沫の夢（シークレット）：割れるシャボン玉 ──────────────────────────
export const IcoNearMiss = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="14" cy="13" r="9" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeOpacity="0.7" />
    <path d="M14 4L11.5 8.5L15.5 11" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 13L18.5 12L17.5 16" stroke="#60a5fa" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 9C10 8 12 8 13 9" stroke="#bfdbfe" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.8" />
    <path d="M7 21L9.5 19.5L11.5 22" stroke="#93c5fd" strokeWidth="0.8" strokeOpacity="0.6" fill="none" strokeLinecap="round" />
    <path d="M16.5 22L18.5 20L20.5 22.5" stroke="#93c5fd" strokeWidth="0.8" strokeOpacity="0.6" fill="none" strokeLinecap="round" />
    <path d="M5 16L5.4 14.5L5.8 16L4.8 15.3L5.8 15Z" fill="#93c5fd" fillOpacity="0.5" />
    <path d="M22 8L22.4 6.5L22.8 8L21.8 7.3L22.8 7Z" fill="#93c5fd" fillOpacity="0.5" />
  </svg>
)

// ── フィッシュ！（シークレット）：魚 ────────────────────────────────────
export const IcoFish = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <ellipse cx="13" cy="14" rx="8" ry="5" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.9" />
    <path d="M21 14L26.5 10L26.5 18Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="0.8" strokeLinejoin="round" />
    <circle cx="7" cy="13" r="1.8" fill="white" stroke="#0284c7" strokeWidth="0.5" />
    <circle cx="7" cy="13" r="0.8" fill="#1e293b" />
    <path d="M4 15.5C5 16.5 6.5 16.5 7.5 15.5" stroke="#0284c7" strokeWidth="0.8" strokeLinecap="round" fill="none" />
    <path d="M13 9C12 7 15.5 7 14.5 9" fill="#7dd3fc" stroke="#0284c7" strokeWidth="0.5" />
    <path d="M10 12.5C11 11.5 12 12.5 11 13.5" stroke="#0284c7" strokeWidth="0.5" fill="none" />
    <path d="M14 12.5C15 11.5 16 12.5 15 13.5" stroke="#0284c7" strokeWidth="0.5" fill="none" />
    <circle cx="2.5" cy="10" r="1" fill="none" stroke="#38bdf8" strokeWidth="0.7" />
    <circle cx="1.5" cy="7" r="0.7" fill="none" stroke="#38bdf8" strokeWidth="0.7" />
  </svg>
)

// ── カウントストップ（シークレット）：MAXカウンター ─────────────────────
export const IcoCountStop = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <circle cx="14" cy="13" r="11" fill="#1e1b4b" stroke="#6d28d9" strokeWidth="1.2" />
    <text x="14" y="11.5" textAnchor="middle" fontSize="6.5" fill="#c4b5fd" fontWeight="bold" letterSpacing="0.5">MAX</text>
    <rect x="4.5" y="14.5" width="19" height="6" rx="1.5" fill="#0f172a" stroke="#6d28d9" strokeWidth="0.6" />
    <text x="14" y="19.5" textAnchor="middle" fontSize="5.5" fill="#a78bfa" fontFamily="monospace" letterSpacing="0">99999</text>
    <path d="M3.5 8L4 6.5L4.5 8L3.2 7.2L4.5 6.8Z" fill="#818cf8" fillOpacity="0.7" />
    <path d="M24 8L24.5 6.5L25 8L23.7 7.2L25 6.8Z" fill="#818cf8" fillOpacity="0.7" />
    <path d="M14 2.5L14.3 1.5L14.6 2.5L13.7 2L14.3 1.8Z" fill="#a78bfa" />
  </svg>
)

// ── 年間王者（シークレット）：年間クラウン ──────────────────────────────
export const IcoAnnualChampion = ({ size = 28, ...p }: P) => (
  <svg {...base(size)} {...p}>
    <path d="M3 21L5 10L9.5 16L14 5L18.5 16L23 10L25 21Z"
      fill="#fbbf24" stroke="#d97706" strokeWidth="1" strokeLinejoin="round" />
    <rect x="3" y="21" width="22" height="3" rx="1" fill="#d97706" />
    <circle cx="14" cy="7.5" r="2" fill="#f472b6" stroke="#db2777" strokeWidth="0.5" />
    <circle cx="6.5" cy="15" r="1.5" fill="#34d399" stroke="#059669" strokeWidth="0.5" />
    <circle cx="21.5" cy="15" r="1.5" fill="#60a5fa" stroke="#2563eb" strokeWidth="0.5" />
    <path d="M8 5.5L8.4 4.2L8.8 5.5L7.8 4.8L8.8 4.4Z" fill="#fbbf24" />
    <path d="M20 5.5L20.4 4.2L20.8 5.5L19.8 4.8L20.8 4.4Z" fill="#fbbf24" />
    <path d="M14 2L14.3 1L14.6 2L13.7 1.5L14.3 1.2Z" fill="#fbbf24" />
  </svg>
)

// ── ID → コンポーネント マップ ───────────────────────────────────────────
export const ACHIEVEMENT_ICON_MAP: Record<string, React.FC<P>> = {
  first_attendance:      IcoFirstAttendance,
  regular_5:             IcoRegular5,
  legend_20:             IcoLegend20,
  tournament_first:      IcoTournamentFirst,
  podium:                IcoPodium,
  champion:              IcoChampion,
  trophy_collector:      IcoTrophyCollector,
  tournament_points_10k: IcoTournamentPoints10k,
  ring_debut:            IcoRingDebut,
  ring_earnings_200:     IcoRingEarnings200,
  ring_earnings_2k:      IcoRingEarnings2k,
  ring_earnings_10k:     IcoRingEarnings10k,
  ring_big_win:          IcoRingBigWin,
  shopper:               IcoShopper,
  saver:                 IcoSaver,
  vault:                 IcoVault,
  near_miss:             IcoNearMiss,
  fish:                  IcoFish,
  count_stop:            IcoCountStop,
  annual_champion:       IcoAnnualChampion,
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
