import { useEffect, useState } from 'react'
import { DEFAULT_AVATAR_COLOR } from './SwanAvatar'

interface Props {
  totalPoints: number
  color?: string
}

const MILESTONE = 10000

// ── 時間帯定義 ─────────────────────────────────────────────────────────────
type TimeOfDay = 'night' | 'dawn' | 'day' | 'dusk'

interface TimeConfig {
  sky: string
  horizonColor: string
  waterTop: string
  waterBot: string
  waveColor1: string
  waveColor2: string
  showStars: boolean
  showMoon: boolean
  sunColor?: string
  sunPos?: { bottom: string; left: string }
  mountainFill: string
  shoreFill: string
}

const TIME_CONFIG: Record<TimeOfDay, TimeConfig> = {
  night: {
    sky:         'linear-gradient(180deg,#03040d 0%,#08102a 40%,#0d1a38 70%,#0f2040 100%)',
    horizonColor:'#0f2040',
    waterTop:    '#0d2a4a',
    waterBot:    '#091a30',
    waveColor1:  'rgba(255,255,255,0.07)',
    waveColor2:  'rgba(255,255,255,0.04)',
    showStars:   true,
    showMoon:    true,
    mountainFill:'#060c1c',
    shoreFill:   '#050a16',
  },
  dawn: {
    sky:         'linear-gradient(180deg,#1a0530 0%,#6b1a4a 25%,#d44a10 60%,#f59a30 90%,#ffd060 100%)',
    horizonColor:'#f59a30',
    waterTop:    '#5a1a10',
    waterBot:    '#3a0d08',
    waveColor1:  'rgba(255,160,80,0.12)',
    waveColor2:  'rgba(255,120,60,0.07)',
    showStars:   false,
    showMoon:    false,
    sunColor:    '#ffb830',
    sunPos:      { bottom: '32%', left: '18%' },
    mountainFill:'#2a0a10',
    shoreFill:   '#1a0608',
  },
  day: {
    sky:         'linear-gradient(180deg,#1a6aaa 0%,#3a9fd8 35%,#70c8f0 65%,#b0e4fa 100%)',
    horizonColor:'#b0e4fa',
    waterTop:    '#1a6a8a',
    waterBot:    '#0d4a6a',
    waveColor1:  'rgba(120,210,255,0.15)',
    waveColor2:  'rgba(80,190,240,0.08)',
    showStars:   false,
    showMoon:    false,
    sunColor:    '#fff7a0',
    sunPos:      { bottom: '60%', left: '72%' },
    mountainFill:'#0a3a50',
    shoreFill:   '#083040',
  },
  dusk: {
    sky:         'linear-gradient(180deg,#0a0520 0%,#3a0845 20%,#aa2808 55%,#e06818 80%,#f5b040 100%)',
    horizonColor:'#e06818',
    waterTop:    '#4a1808',
    waterBot:    '#2a0c06',
    waveColor1:  'rgba(255,120,40,0.12)',
    waveColor2:  'rgba(200,80,20,0.07)',
    showStars:   false,
    showMoon:    false,
    sunColor:    '#ff6820',
    sunPos:      { bottom: '28%', left: '80%' },
    mountainFill:'#200808',
    shoreFill:   '#150505',
  },
}

// 0〜1 のループ進捗から時間帯を決定
const getTimeOfDay = (p: number): TimeOfDay => {
  if (p < 0.20) return 'night'
  if (p < 0.40) return 'dawn'
  if (p < 0.60) return 'day'
  if (p < 0.80) return 'dusk'
  return 'night'
}

// 波パス
const WAVE_PATH_1 = 'M0,8 C25,2 50,14 75,8 C100,2 125,14 150,8 C175,2 200,14 200,8 L200,30 L0,30 Z'
const WAVE_PATH_2 = 'M0,12 C30,4 60,18 90,12 C120,4 150,18 200,12 L200,30 L0,30 Z'

const STARS = [
  { x: 8,  y: 10, s: 1.2, d: 0    },
  { x: 20, y: 5,  s: 1.8, d: 0.4  },
  { x: 35, y: 14, s: 1,   d: 1.1  },
  { x: 52, y: 7,  s: 2,   d: 0.7  },
  { x: 68, y: 12, s: 1.2, d: 1.5  },
  { x: 82, y: 4,  s: 1.5, d: 0.3  },
  { x: 92, y: 16, s: 1,   d: 0.9  },
]

const waterLineY = 62  // 水面Y位置(%)
const iconSize   = 40

export const FlyingSwanProgress = ({ totalPoints, color = DEFAULT_AVATAR_COLOR }: Props) => {
  const inLapPts    = totalPoints % MILESTONE
  const inLapProg   = inLapPts / MILESTONE          // 0〜1 (ループ内進捗)
  const laps        = Math.floor(totalPoints / MILESTONE)
  const inLapPct    = Math.round(inLapProg * 100)
  const timeOfDay   = getTimeOfDay(inLapProg)
  const cfg         = TIME_CONFIG[timeOfDay]

  // 画面戻りで0→現在ラップ内の位置へアニメーション
  // progress（全体）ではなく inLapProg（現ラップ内）を使うことで
  // 10,000pt ごとに池から再スタートするサイクルを正しく表現する
  const [t, setT] = useState(0)
  useEffect(() => {
    setT(0)
    const id = setTimeout(() => setT(inLapProg), 200)
    return () => clearTimeout(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const xPct = 8 + t * 76

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl select-none"
      style={{ height: 110, transition: 'background 1.5s ease' }}
    >
      {/* ── 空 ── */}
      <div
        className="absolute inset-0"
        style={{ background: cfg.sky, transition: 'background 2s ease' }}
      />

      {/* ── 星（夜のみ）── */}
      {cfg.showStars && STARS.map((s, i) => (
        <div key={i} className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`, top: `${s.y}%`,
            width: s.s, height: s.s, opacity: 0.45,
            animation: `starTwinkle ${1.6 + i * 0.28}s ${s.d}s ease-in-out infinite`,
          }}
        />
      ))}

      {/* ── 月（夜のみ）── */}
      {cfg.showMoon && (
        <div className="absolute rounded-full"
          style={{
            right: '7%', top: '8%', width: 13, height: 13,
            background: 'radial-gradient(circle at 35% 35%, #f5e8a0, #c4a840)',
            boxShadow: '0 0 12px 4px rgba(200,168,60,0.2)',
          }}
        />
      )}

      {/* ── 太陽（昼・朝・夕）── */}
      {cfg.sunColor && cfg.sunPos && (
        <div className="absolute rounded-full"
          style={{
            left: cfg.sunPos.left,
            bottom: cfg.sunPos.bottom,
            width: 16, height: 16,
            background: `radial-gradient(circle at 40% 40%, #ffffff, ${cfg.sunColor})`,
            boxShadow: `0 0 18px 6px ${cfg.sunColor}80`,
            transition: 'left 2s ease, bottom 2s ease',
          }}
        />
      )}

      {/* ── 山シルエット ── */}
      <svg className="absolute w-full" style={{ bottom: `${100 - waterLineY}%`, left: 0 }}
        viewBox="0 0 400 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,40 L60,8 L120,28 L180,2 L240,22 L300,6 L360,20 L400,12 L400,40 Z"
          fill={cfg.mountainFill} style={{ transition: 'fill 2s ease' }} />
        <path d="M0,40 L0,28 L15,20 L20,28 L35,18 L42,28 L60,24 L70,40 Z"
          fill={cfg.shoreFill} />
        <path d="M330,40 L330,22 L340,14 L348,22 L358,16 L368,24 L380,20 L400,24 L400,40 Z"
          fill={cfg.shoreFill} />
      </svg>

      {/* ── 湖（水面）── */}
      <div className="absolute left-0 right-0 bottom-0"
        style={{
          top: `${waterLineY}%`,
          background: `linear-gradient(180deg, ${cfg.waterTop} 0%, ${cfg.waterBot} 100%)`,
          transition: 'background 2s ease',
        }}
      />

      {/* ── 波レイヤー1 ── */}
      <div className="absolute left-0 right-0" style={{ top: `${waterLineY - 2}%`, height: 30, overflow: 'hidden' }}>
        <svg viewBox="0 0 200 30" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '200%', height: '100%', animation: 'waveFlow1 3.5s linear infinite', display: 'block' }}>
          <path d={WAVE_PATH_1} fill={cfg.waveColor1} />
        </svg>
      </div>

      {/* ── 波レイヤー2 ── */}
      <div className="absolute left-0 right-0" style={{ top: `${waterLineY}%`, height: 24, overflow: 'hidden' }}>
        <svg viewBox="0 0 200 30" xmlns="http://www.w3.org/2000/svg"
          style={{ width: '200%', height: '100%', animation: 'waveFlow2 5.5s linear infinite', display: 'block' }}>
          <path d={WAVE_PATH_2} fill={cfg.waveColor2} />
        </svg>
      </div>

      {/* ── スワン ── */}
      <div className="absolute"
        style={{
          left: `${xPct}%`,
          top: `${waterLineY - 30}%`,
          transition: 'left 2.2s cubic-bezier(0.4,0,0.2,1)',
          animation: 'swanSway 3.2s ease-in-out infinite',
          willChange: 'left',
        }}
      >
        <img src="/logo.svg" alt=""
          style={{
            width: iconSize, height: iconSize, objectFit: 'contain',
            filter: [
              'drop-shadow(0 0 6px rgba(255,255,255,0.85))',
              'drop-shadow(0 0 3px rgba(255,255,255,0.60))',
              'drop-shadow(0 2px 4px rgba(0,0,0,0.7))',
            ].join(' '),
          }}
          draggable={false}
        />
        {[0, 0.65, 1.3].map((delay, i) => (
          <div key={i} className="absolute rounded-full border border-white/25"
            style={{
              width: iconSize * 1.1, height: iconSize * 0.28,
              left: '50%', top: '82%',
              marginLeft: `-${(iconSize * 1.1) / 2}px`,
              animation: `swanRipple 2.2s ease-out ${delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* ── 時間帯ラベル ── */}
      <div className="absolute top-2 left-3">
        <span className="text-[9px] text-white/40 uppercase tracking-widest">
          {timeOfDay === 'night' ? '🌙 Night' : timeOfDay === 'dawn' ? '🌅 Dawn' : timeOfDay === 'day' ? '☀️ Day' : '🌇 Dusk'}
        </span>
      </div>

      {/* ── 進捗テキスト ── */}
      <div className="absolute bottom-2 right-3 text-right leading-snug z-10">
        {laps > 0 && (
          <p className="text-[11px] font-bold" style={{ color }}>
            {laps} 周達成！
          </p>
        )}
        <p className="text-xs font-mono text-white/60">{totalPoints.toLocaleString()} pt</p>
        <p className="text-[9px] text-white/30">{inLapPct}% / {MILESTONE.toLocaleString()}pt</p>
      </div>
    </div>
  )
}
