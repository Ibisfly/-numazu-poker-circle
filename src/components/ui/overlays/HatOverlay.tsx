// トップハット オーバーレイ
// 黒鳥の頭部（アイコン左上〜上部）に被さるよう配置
export const HatOverlay = ({ size }: { size: number }) => {
  const w = size * 0.78
  const h = size * 0.48
  return (
    <div
      style={{
        position: 'absolute',
        top: `-${size * 0.22}px`,
        left: `${size * 0.06}px`,
        width: w,
        height: h,
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 78 48" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
        {/* ブリム（つば） */}
        <ellipse cx="39" cy="41" rx="36" ry="7" fill="#1a1a1a" />
        <ellipse cx="39" cy="40" rx="34" ry="5.5" fill="#2a2a2a" />
        {/* クラウン（帽子本体） */}
        <rect x="18" y="6" width="42" height="35" fill="#111111" rx="2" />
        {/* ハットバンド */}
        <rect x="18" y="33" width="42" height="6" fill="#1f1f1f" rx="1" />
        {/* リボン */}
        <rect x="18" y="33" width="42" height="2.5" fill="#cc0000" />
        {/* 光沢ハイライト */}
        <path d="M22,10 Q26,7 30,10" stroke="#444" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M22,16 Q25,14 28,16" stroke="#383838" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* 帽子の上面エッジ */}
        <rect x="18" y="6" width="42" height="3" fill="#1a1a1a" rx="1" />
      </svg>
    </div>
  )
}
