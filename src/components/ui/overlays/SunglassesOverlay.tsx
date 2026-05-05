// サングラス オーバーレイ
// 黒鳥の顔（アイコン左〜上部）に掛かるよう配置
export const SunglassesOverlay = ({ size }: { size: number }) => {
  const w = size * 0.85
  const h = size * 0.38
  return (
    <div
      style={{
        position: 'absolute',
        top: `${size * 0.16}px`,
        left: `${size * 0.02}px`,
        width: w,
        height: h,
        pointerEvents: 'none',
      }}
    >
      <svg viewBox="0 0 85 38" width={w} height={h} xmlns="http://www.w3.org/2000/svg">
        {/* 左テンプル（つる）*/}
        <line x1="4" y1="17" x2="0" y2="14" stroke="#666" strokeWidth="2" strokeLinecap="round" />
        {/* 左レンズ */}
        <rect x="4" y="5" width="30" height="24" rx="7" fill="#0a0a0a" fillOpacity="0.92" stroke="#555" strokeWidth="1.5" />
        {/* 左レンズ光沢 */}
        <path d="M9,9 Q15,7 18,11" stroke="#444" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
        {/* ブリッジ（鼻パッド） */}
        <path d="M34,17 Q42.5,14 51,17" stroke="#888" strokeWidth="2" fill="none" strokeLinecap="round" />
        {/* 右レンズ */}
        <rect x="51" y="5" width="30" height="24" rx="7" fill="#0a0a0a" fillOpacity="0.92" stroke="#555" strokeWidth="1.5" />
        {/* 右レンズ光沢 */}
        <path d="M56,9 Q62,7 65,11" stroke="#444" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.8" />
        {/* 右テンプル */}
        <line x1="81" y1="17" x2="85" y2="14" stroke="#666" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  )
}
