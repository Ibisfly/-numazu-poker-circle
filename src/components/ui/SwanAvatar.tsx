import type { CSSProperties, ReactNode } from 'react'

// ── 型定義 ────────────────────────────────────────────────────────────────
export interface FrameDef {
  name:        string
  description: string
  // シンプルフレーム: アバター円に直接適用する CSS
  style?:      CSSProperties
  cssClass?:   string
  // リッチフレーム: アバター全体を包む React コンポーネント
  Wrapper?:    React.FC<{ size: number; color: string; children: ReactNode }>
}

// ── ゴールドフレーム ───────────────────────────────────────────────────────
const GoldWrapper: React.FC<{ size: number; color: string; children: ReactNode }> = ({ size, color, children }) => {
  const r   = size / 2
  const ext = size * 0.22   // フレームとスパークルの拡張幅
  const total = size + ext * 2

  // スパークル配置（8方向）
  const sparks = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
    const rad = (deg * Math.PI) / 180
    const dist = r + ext * 0.55
    return {
      x: r + ext + Math.cos(rad) * dist - 5,
      y: r + ext + Math.sin(rad) * dist - 5,
      delay: `${i * 0.18}s`,
      scale: i % 2 === 0 ? 1 : 0.7,
    }
  })

  return (
    <div style={{ position: 'relative', width: total, height: total }}>
      {/* 回転グラデーションリング */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: `conic-gradient(
          #ffd700 0%, #fffaaa 15%, #b8860b 30%,
          #ffd700 45%, #fff8a0 60%, #c8940c 75%,
          #ffd700 90%, #ffe080 100%
        )`,
        animation: 'goldSpin 4s linear infinite',
        padding: ext * 0.35,
      }} />
      {/* 内側の不透明円（ロゴを隠さないため） */}
      <div style={{
        position: 'absolute',
        top: ext * 0.35,
        left: ext * 0.35,
        width: total - ext * 0.7,
        height: total - ext * 0.7,
        borderRadius: '50%',
        background: color,
        boxShadow: '0 0 0 1px rgba(255,215,0,0.8), 0 0 12px 4px rgba(255,200,0,0.4)',
      }} />
      {/* アバター本体 */}
      <div style={{
        position: 'absolute',
        top: ext,
        left: ext,
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {children}
      </div>
      {/* スパークル */}
      {sparks.map((s, i) => (
        <svg
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: 10,
            height: 10,
            animation: `sparkle 1.4s ${s.delay} ease-in-out infinite`,
            transformOrigin: '5px 5px',
          }}
          viewBox="0 0 10 10"
        >
          <path
            d="M5,0 L5.8,3.5 L9.5,5 L5.8,6.5 L5,10 L4.2,6.5 L0.5,5 L4.2,3.5 Z"
            fill="#ffe060"
            transform={`scale(${s.scale})`}
            style={{ transformOrigin: '5px 5px' }}
          />
        </svg>
      ))}
    </div>
  )
}

// ── メタリックフレーム ─────────────────────────────────────────────────────
const MetallicWrapper: React.FC<{ size: number; color: string; children: ReactNode }> = ({ size, color, children }) => {
  const ext = size * 0.18
  const total = size + ext * 2

  return (
    <div style={{ position: 'relative', width: total, height: total }}>
      {/* 外側リング: コニック回転でクロームっぽく */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        background: `conic-gradient(
          #606060 0%, #e8e8e8 8%, #f0f0f0 12%, #c0c0c0 20%,
          #808080 35%, #d8d8d8 40%, #f8f8f8 45%, #b0b0b0 55%,
          #606060 70%, #e0e0e0 78%, #f0f0f0 82%, #a0a0a0 92%,
          #606060 100%
        )`,
        animation: 'metallicScan 3s linear infinite',
        padding: ext * 0.3,
      }} />
      {/* 中間リング */}
      <div style={{
        position: 'absolute',
        top: ext * 0.3,
        left: ext * 0.3,
        width: total - ext * 0.6,
        height: total - ext * 0.6,
        borderRadius: '50%',
        background: `conic-gradient(
          #404040 0%, #b8b8b8 10%, #f0f0f0 18%, #909090 28%,
          #505050 45%, #c8c8c8 55%, #e8e8e8 62%, #808080 72%,
          #404040 100%
        )`,
        animation: 'metallicScan 2.2s linear infinite reverse',
        padding: ext * 0.15,
      }} />
      {/* 内側ダーク */}
      <div style={{
        position: 'absolute',
        top: ext * 0.45,
        left: ext * 0.45,
        width: total - ext * 0.9,
        height: total - ext * 0.9,
        borderRadius: '50%',
        background: color,
        boxShadow: '0 0 0 1px #606060, 0 0 8px 2px rgba(150,150,150,0.5)',
      }} />
      {/* アバター */}
      <div style={{
        position: 'absolute',
        top: ext,
        left: ext,
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {children}
      </div>
      {/* 静的ハイライトドット（4方向） */}
      {[0, 90, 180, 270].map((deg, i) => {
        const rad  = ((deg - 45) * Math.PI) / 180
        const dist = (total / 2) * 0.88
        return (
          <div key={i} style={{
            position: 'absolute',
            width: 4, height: 4,
            borderRadius: '50%',
            background: '#ffffff',
            left: total / 2 + Math.cos(rad) * dist - 2,
            top:  total / 2 + Math.sin(rad) * dist - 2,
            opacity: 0.85,
            boxShadow: '0 0 3px 2px rgba(255,255,255,0.6)',
          }} />
        )
      })}
    </div>
  )
}

// ── 炎フレーム ─────────────────────────────────────────────────────────────
// アイコン周囲に実際の炎SVGを描画

// 炎1本のSVGパス（viewBox内で上向き、原点が炎の根本）
const FlameShape = ({
  x, y, w, h, delay, hue,
}: { x: number; y: number; w: number; h: number; delay: string; hue: number }) => (
  <g style={{
    transformOrigin: `${x + w / 2}px ${y + h}px`,
    animation: `flameBase 0.55s ${delay} ease-in-out infinite`,
  }}>
    {/* 外炎 */}
    <path
      d={`M${x + w / 2},${y + h}
          C${x + w * 0.1},${y + h * 0.75} ${x + w * 0.0},${y + h * 0.45} ${x + w / 2},${y}
          C${x + w * 1.0},${y + h * 0.45} ${x + w * 0.9},${y + h * 0.75} ${x + w / 2},${y + h} Z`}
      fill={`hsl(${hue + 10},100%,50%)`}
      opacity="0.92"
    />
    {/* 内炎（芯） */}
    <path
      d={`M${x + w / 2},${y + h * 0.9}
          C${x + w * 0.3},${y + h * 0.7} ${x + w * 0.25},${y + h * 0.5} ${x + w / 2},${y + h * 0.25}
          C${x + w * 0.75},${y + h * 0.5} ${x + w * 0.7},${y + h * 0.7} ${x + w / 2},${y + h * 0.9} Z`}
      fill={`hsl(${hue + 40},100%,75%)`}
      style={{
        transformOrigin: `${x + w / 2}px ${y + h * 0.9}px`,
        animation: `flameTip 0.4s ${delay} ease-in-out infinite`,
      }}
      opacity="0.85"
    />
  </g>
)

const FlameWrapper: React.FC<{ size: number; color: string; children: ReactNode }> = ({ size, color, children }) => {
  const ext   = size * 0.55
  const total = size + ext * 2
  const cx    = total / 2
  const cy    = total / 2
  const r     = size / 2 + ext * 0.05

  // 炎の配置: 円周上に8本、角度・サイズ・色相に変化
  const flames = [
    { angle: -90, w: size * 0.32, h: size * 0.58, hue: 15,  delay: '0s'     },
    { angle: -45, w: size * 0.26, h: size * 0.44, hue: 25,  delay: '0.1s'   },
    { angle:   0, w: size * 0.28, h: size * 0.48, hue: 10,  delay: '0.18s'  },
    { angle:  45, w: size * 0.24, h: size * 0.40, hue: 20,  delay: '0.07s'  },
    { angle:  90, w: size * 0.30, h: size * 0.52, hue: 15,  delay: '0.22s'  },
    { angle: 135, w: size * 0.24, h: size * 0.40, hue: 25,  delay: '0.13s'  },
    { angle: 180, w: size * 0.28, h: size * 0.46, hue: 10,  delay: '0.05s'  },
    { angle: 225, w: size * 0.22, h: size * 0.38, hue: 20,  delay: '0.16s'  },
  ]

  return (
    <div style={{ position: 'relative', width: total, height: total }}>
      {/* 炎SVGレイヤー */}
      <svg
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
        width={total}
        height={total}
        viewBox={`0 0 ${total} ${total}`}
      >
        <defs>
          <radialGradient id="flameGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ff6600" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* 外周グロー */}
        <circle cx={cx} cy={cy} r={r + ext * 0.4} fill="url(#flameGlow)" />
        {/* 炎本体 */}
        {flames.map((f, i) => {
          const rad  = (f.angle * Math.PI) / 180
          const bx   = cx + Math.cos(rad) * r - f.w / 2
          const by   = cy + Math.sin(rad) * r - f.h
          // 炎の「先」が円から外に向くよう回転
          const rot  = f.angle + 90
          return (
            <g key={i} style={{
              transformOrigin: `${cx + Math.cos(rad) * r}px ${cy + Math.sin(rad) * r}px`,
              transform: `rotate(${rot}deg)`,
            }}>
              <FlameShape x={bx} y={by} w={f.w} h={f.h} delay={f.delay} hue={f.hue} />
            </g>
          )
        })}
      </svg>

      {/* グロー */}
      <div style={{
        position: 'absolute',
        top: ext - 2, left: ext - 2,
        width: size + 4, height: size + 4,
        borderRadius: '50%',
        animation: 'flameGlow 0.7s ease-in-out infinite',
      }} />

      {/* アバター本体 */}
      <div style={{
        position: 'absolute',
        top: ext, left: ext,
        width: size, height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        background: color,
        zIndex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {children}
      </div>
    </div>
  )
}

// ── チップスタイルフレーム ─────────────────────────────────────────────────
// NUMAZU POKER オリジナルチップデザインを再現（4方向のストライプエッジマーク）
const createChipWrapper = (
  primaryColor: string,
  secondaryColor: string,
  stripeColor1: string,
  stripeColor2: string,
  outerBorderColor?: string,
): React.FC<{ size: number; color: string; children: ReactNode }> => {
  return function ChipWrapper({ size, color, children }) {
    const ext = size * 0.18
    const total = size + ext * 2
    const outerR = total / 2 - 1
    const mainR = total / 2 - 3
    const innerR = size / 2 + 1

    return (
      <div style={{ position: 'relative', width: total, height: total }}>
        <svg
          width={total}
          height={total}
          viewBox={`0 0 ${total} ${total}`}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          {/* 外側の境界線（暗い背景対策） */}
          {outerBorderColor && (
            <circle
              cx={total / 2}
              cy={total / 2}
              r={outerR}
              fill="none"
              stroke={outerBorderColor}
              strokeWidth={1.5}
            />
          )}
          {/* メインリング（チップの縁） */}
          <circle
            cx={total / 2}
            cy={total / 2}
            r={mainR}
            fill="none"
            stroke={primaryColor}
            strokeWidth={ext * 0.9}
          />
          {/* 4方向のエッジストライプ（実物チップのデザインを再現） */}
          {[0, 90, 180, 270].map((baseDeg) => {
            const stripeWidth = size * 0.05
            const stripeGap = size * 0.03
            const stripeLen = ext * 0.95
            return [-1, 0, 1].map((offset) => {
              const angle = baseDeg * (Math.PI / 180)
              const perpAngle = angle + Math.PI / 2
              const offsetDist = offset * (stripeWidth + stripeGap)
              const cx = total / 2 + Math.cos(angle) * mainR + Math.cos(perpAngle) * offsetDist
              const cy = total / 2 + Math.sin(angle) * mainR + Math.sin(perpAngle) * offsetDist
              const x1 = cx - Math.cos(angle) * stripeLen / 2
              const y1 = cy - Math.sin(angle) * stripeLen / 2
              const x2 = cx + Math.cos(angle) * stripeLen / 2
              const y2 = cy + Math.sin(angle) * stripeLen / 2
              const stripeCol = offset === 0 ? stripeColor1 : stripeColor2
              return (
                <line
                  key={`${baseDeg}-${offset}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stripeCol}
                  strokeWidth={stripeWidth}
                  strokeLinecap="butt"
                />
              )
            })
          })}
          {/* 内側の縁 */}
          <circle
            cx={total / 2}
            cy={total / 2}
            r={innerR}
            fill="none"
            stroke={secondaryColor}
            strokeWidth={1.5}
          />
        </svg>

        {/* アバター本体 */}
        <div
          style={{
            position: 'absolute',
            top: ext,
            left: ext,
            width: size,
            height: size,
            borderRadius: '50%',
            overflow: 'hidden',
            background: color,
            boxShadow: `0 0 0 1px ${secondaryColor}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {children}
        </div>
      </div>
    )
  }
}

// 6色のチップフレーム（実物チップの配色を再現）
// primaryColor: チップ縁の色, secondaryColor: 内側縁, stripeColor1: 中央ストライプ, stripeColor2: 両脇ストライプ
const ChipBlackWrapper = createChipWrapper('#1a1a2e', '#c0c0c0', '#ffd700', '#c0c0c0', '#4a4a5a')
const ChipPurpleWrapper = createChipWrapper('#6b21a8', '#ffffff', '#ffd700', '#9ca3af')
const ChipYellowWrapper = createChipWrapper('#ca8a04', '#ffffff', '#1a1a2e', '#6b7280')
const ChipCyanWrapper = createChipWrapper('#0891b2', '#ffffff', '#1a1a2e', '#6b7280')
const ChipPinkWrapper = createChipWrapper('#db2777', '#ffffff', '#ffd700', '#9ca3af')
const ChipWhiteWrapper = createChipWrapper('#e2e8f0', '#1a1a2e', '#db2777', '#9ca3af', '#d1d5db')

// ── FRAME_DEFS ─────────────────────────────────────────────────────────────
export const FRAME_DEFS: Record<string, FrameDef> = {
  gold: {
    name:        'ロイヤルゴールド',
    description: '回転する金環＋8方向スパークル',
    Wrapper:     GoldWrapper,
  },
  metallic: {
    name:        'クロームリング',
    description: '2重回転クロームグラデーション',
    Wrapper:     MetallicWrapper,
  },
  flame: {
    name:        'インフェルノ',
    description: '8本の炎がアイコンを包む',
    Wrapper:     FlameWrapper,
  },
  // チップスタイルフレーム（6色）
  chip_black: {
    name:        'チップフレーム（ブラック）',
    description: 'NUMAZU POKER オリジナルチップデザイン・ブラック',
    Wrapper:     ChipBlackWrapper,
  },
  chip_purple: {
    name:        'チップフレーム（パープル）',
    description: 'NUMAZU POKER オリジナルチップデザイン・パープル',
    Wrapper:     ChipPurpleWrapper,
  },
  chip_yellow: {
    name:        'チップフレーム（イエロー）',
    description: 'NUMAZU POKER オリジナルチップデザイン・イエロー',
    Wrapper:     ChipYellowWrapper,
  },
  chip_cyan: {
    name:        'チップフレーム（シアン）',
    description: 'NUMAZU POKER オリジナルチップデザイン・シアン',
    Wrapper:     ChipCyanWrapper,
  },
  chip_pink: {
    name:        'チップフレーム（ピンク）',
    description: 'NUMAZU POKER オリジナルチップデザイン・ピンク',
    Wrapper:     ChipPinkWrapper,
  },
  chip_white: {
    name:        'チップフレーム（ホワイト）',
    description: 'NUMAZU POKER オリジナルチップデザイン・ホワイト',
    Wrapper:     ChipWhiteWrapper,
  },
}

// ── オーバーレイ（現在廃止） ───────────────────────────────────────────────
// 将来拡張用にエクスポートのみ維持
export const OVERLAY_DEFS: Record<string, { name: string; description: string; component: React.FC<{ size: number }> }> = {}

// ── アバターバリエーション定義 ─────────────────────────────────────────────
export interface AvatarVariantDef {
  id: string
  name: string
  description: string
  imagePath: string
}

export const AVATAR_VARIANT_DEFS: Record<string, AvatarVariantDef> = {
  default: {
    id: 'default',
    name: 'オリジナル',
    description: 'デフォルトの黒鳥アイコン',
    imagePath: '/logo.svg',
  },
  variant2: {
    id: 'variant2',
    name: 'バリエーション2',
    description: '別デザインの黒鳥アイコン',
    imagePath: '/logo3.svg',
  },
}

// ── SwanAvatar コンポーネント ──────────────────────────────────────────────
interface SwanAvatarProps {
  color?:    string
  size?:     number
  showCard?: boolean  // 互換性維持
  frame?:    string
  overlay?:  string   // 互換性維持（現在は無効）
  variant?:  string   // アバターバリエーション
  className?: string
}

export const DEFAULT_AVATAR_COLOR = '#fce7f3'

export const SwanAvatar = ({
  color   = DEFAULT_AVATAR_COLOR,
  size    = 48,
  frame,
  variant = 'default',
  className = '',
}: SwanAvatarProps) => {
  const frameDef = frame ? FRAME_DEFS[frame] : undefined
  // 定義済みキー以外は画像URL/パスとして扱う（ショップ管理からアップロードした追加アイコン）
  const imagePath =
    AVATAR_VARIANT_DEFS[variant]?.imagePath ??
    (variant.includes('/') ? variant : AVATAR_VARIANT_DEFS.default.imagePath)

  const avatarContent = (
    <img
      src={imagePath}
      alt="NUMAZU POKER CIRCLE"
      style={{ width: '80%', height: '80%', objectFit: 'contain', display: 'block' }}
      draggable={false}
    />
  )

  // リッチフレーム（Wrapper コンポーネント）がある場合
  // 外側のコンテナはsize x sizeで、フレームは中央からoverflow
  if (frameDef?.Wrapper) {
    return (
      <div
        className={`shrink-0 ${className}`}
        style={{
          position: 'relative',
          width: size,
          height: size,
          overflow: 'visible',
        }}
      >
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <frameDef.Wrapper size={size} color={color}>
            {avatarContent}
          </frameDef.Wrapper>
        </div>
      </div>
    )
  }

  // シンプルフレーム（CSS のみ）
  return (
    <div
      className={`rounded-full flex items-center justify-center overflow-hidden shrink-0 ${frameDef?.cssClass ?? ''} ${className}`}
      style={{
        width: size,
        height: size,
        background: color,
        ...frameDef?.style,
      }}
    >
      {avatarContent}
    </div>
  )
}

// サイズプリセット
export const SwanAvatarSm  = (p: Omit<SwanAvatarProps, 'size'>) => <SwanAvatar size={32} {...p} />
export const SwanAvatarMd  = (p: Omit<SwanAvatarProps, 'size'>) => <SwanAvatar size={48} {...p} />
export const SwanAvatarLg  = (p: Omit<SwanAvatarProps, 'size'>) => <SwanAvatar size={80} {...p} />

// ショップカラーバリエーション
export const AVATAR_COLORS: { id: string; name: string; color: string; price: number }[] = [
  { id: 'color_gold',   name: 'シャンパン',    color: '#fef9c3', price: 300 },
  { id: 'color_mint',   name: 'ミント',         color: '#d1fae5', price: 200 },
  { id: 'color_sky',    name: 'スカイブルー',   color: '#e0f2fe', price: 200 },
  { id: 'color_purple', name: 'ラベンダー',     color: '#f3e8ff', price: 200 },
  { id: 'color_rose',   name: 'ローズ',         color: '#fee2e2', price: 200 },
  { id: 'color_white',  name: 'ピュアホワイト', color: '#f8fafc', price: 150 },
  { id: 'color_night',  name: 'ナイトブルー',   color: '#0f172a', price: 500 },
]

// ── ポイントアイコン定義 ───────────────────────────────────────────────────────
export interface PointIconDef {
  id: string
  name: string
  description: string
  // SVGコンポーネントまたは画像パス
  Component?: React.FC<{ size?: number; className?: string }>
  imagePath?: string
}

// 羽アイコン（デフォルト）
const FeatherPointIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
    <line x1="16" y1="8" x2="2" y2="22" />
    <line x1="17.5" y1="15" x2="9" y2="15" />
  </svg>
)

// チップアイコン（chips.svg）
const ChipsPointIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className }) => (
  <img
    src="/chips.svg"
    alt="chips"
    width={size}
    height={size}
    className={className}
    style={{ objectFit: 'contain' }}
  />
)

export const POINT_ICON_DEFS: Record<string, PointIconDef> = {
  feather: {
    id: 'feather',
    name: '羽',
    description: 'デフォルトの羽アイコン',
    Component: FeatherPointIcon,
  },
  chips: {
    id: 'chips',
    name: 'ポーカーチップ',
    description: 'NUMAZU POKER オリジナルチップ',
    Component: ChipsPointIcon,
  },
}

// 動的ポイントアイコンコンポーネント
export const DynamicPointIcon: React.FC<{
  iconId?: string
  size?: number
  className?: string
}> = ({ iconId = 'feather', size = 16, className }) => {
  const def = POINT_ICON_DEFS[iconId] ?? POINT_ICON_DEFS.feather
  if (def.Component) {
    return <def.Component size={size} className={className} />
  }
  if (def.imagePath) {
    return <img src={def.imagePath} alt={def.name} width={size} height={size} className={className} />
  }
  return <FeatherPointIcon size={size} className={className} />
}
