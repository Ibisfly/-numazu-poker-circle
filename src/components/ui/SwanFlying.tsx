interface SwanFlyingProps {
  color?: string
  size?: number
}

// 飛翔中の黒鳥 — 羽ばたきアニメーション付き
export const SwanFlying = ({ color = '#ec4899', size = 56 }: SwanFlyingProps) => (
  <svg
    viewBox="0 0 90 52"
    width={size}
    height={Math.round(size * 52 / 90)}
    xmlns="http://www.w3.org/2000/svg"
    className="swan-float"
    style={{ overflow: 'visible' }}
  >
    {/* ── 胴体（静止）── */}
    <ellipse cx="48" cy="30" rx="19" ry="8" fill={color} />

    {/* ── 首・頭・くちばし（静止）── */}
    <path
      fill={color}
      d="M 30,26 C 22,21 14,17 8,14 C 5,12 6,10 8,10 C 12,11 20,15 28,22 Z"
    />
    <circle cx="7" cy="11" r="6" fill={color} />
    <path fill={color} d="M 1,10 L 10,10 L 10,13 L 1,12 Z" />

    {/* ── 翼（羽ばたき）── */}
    <g className="swan-wing">
      {/* 上面翼 */}
      <path
        fill={color}
        d="M 44,23 C 54,14 68,8 82,10 C 76,16 61,21 44,23 Z"
        opacity="0.95"
      />
      {/* 下面翼 */}
      <path
        fill={color}
        d="M 44,37 C 54,46 68,50 82,48 C 76,42 61,39 44,37 Z"
        opacity="0.7"
      />
    </g>

    {/* ── 尾羽（静止）── */}
    <path
      fill={color}
      d="M 65,27 C 74,24 82,22 84,26 C 82,30 74,30 65,33 Z"
    />
  </svg>
)
