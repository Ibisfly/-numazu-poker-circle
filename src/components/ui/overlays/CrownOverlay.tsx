// 王冠 オーバーレイ
// アイコン上部に被せる
export const CrownOverlay = ({ size }: { size: number }) => {
  const w = size * 0.70
  const h = size * 0.42
  return (
    <div
      style={{
        position: 'absolute',
        top: `-${size * 0.28}px`,
        left: `${size * 0.15}px`,
        width: w,
        height: h,
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 70 42" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
        {/* 王冠本体 */}
        <path
          d="M4,38 L4,14 L18,26 L35,4 L52,26 L66,14 L66,38 Z"
          fill="#ffd700"
          stroke="#b8860b"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* ベースバンド */}
        <rect x="4" y="34" width="62" height="5" fill="#ffc300" stroke="#b8860b" strokeWidth="1" rx="1.5" />
        {/* 中央宝石（ルビー） */}
        <circle cx="35" cy="24" r="5" fill="#ff1a4a" stroke="#cc0035" strokeWidth="1" />
        <circle cx="35" cy="23" r="2.5" fill="#ff6688" fillOpacity="0.5" />
        {/* 左宝石（サファイア） */}
        <circle cx="14" cy="29" r="3.5" fill="#1a4aff" stroke="#0033cc" strokeWidth="0.8" />
        <circle cx="14" cy="28" r="1.5" fill="#6688ff" fillOpacity="0.5" />
        {/* 右宝石（エメラルド） */}
        <circle cx="56" cy="29" r="3.5" fill="#00cc55" stroke="#009933" strokeWidth="0.8" />
        <circle cx="56" cy="28" r="1.5" fill="#44ff88" fillOpacity="0.5" />
        {/* 光沢 */}
        <path d="M8,18 L11,22" stroke="#ffe880" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <path d="M28,8 L31,12" stroke="#ffe880" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <path d="M61,18 L58,22" stroke="#ffe880" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      </svg>
    </div>
  )
}
