import { useEffect, useState } from 'react'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { AchievementIcon } from './AchievementIcons'

interface Props {
  achievementId: string
  onClose: () => void
}

export const AchievementUnlockModal = ({ achievementId, onClose }: Props) => {
  const ach = ACHIEVEMENTS.find((a) => a.id === achievementId)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // フェードイン
    const t1 = setTimeout(() => setVisible(true), 50)
    // 5秒後に自動クローズ
    const t2 = setTimeout(() => { setVisible(false); setTimeout(onClose, 400) }, 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 pointer-events-none"
      style={{ transition: 'opacity 0.4s', opacity: visible ? 1 : 0 }}
    >
      {/* 背景ブラー */}
      <div className="absolute inset-0 bg-black/60 pointer-events-auto" onClick={() => { setVisible(false); setTimeout(onClose, 400) }} />

      <div
        className="relative z-10 pointer-events-auto"
        style={{
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s',
          transform: visible ? 'scale(1)' : 'scale(0.7)',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* パーティクルキラキラ（CSS のみ） */}
        <div className="absolute inset-0 pointer-events-none overflow-visible">
          {[...Array(12)].map((_, i) => {
            const angle = (i / 12) * 360
            const rad   = (angle * Math.PI) / 180
            const dist  = 120 + Math.random() * 40
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 4 + Math.random() * 4,
                  height: 4 + Math.random() * 4,
                  background: ['#ffd700','#ff6b6b','#4ecdc4','#fff','#a8edea'][i % 5],
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%,-50%) translate(${Math.cos(rad)*dist}px,${Math.sin(rad)*dist}px)`,
                  opacity: 0,
                  animation: `sparkle 0.8s ${i * 0.06}s ease-out forwards`,
                }}
              />
            )
          })}
        </div>

        {/* カード本体 */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-yellow-500/50 rounded-2xl px-8 py-8 text-center shadow-2xl min-w-[260px]"
          style={{ boxShadow: '0 0 40px rgba(255,215,0,0.3)' }}>
          {/* アイコン */}
          <div className="flex justify-center mb-3" style={{ animation: 'primePulse 1.5s ease-in-out infinite' }}>
            <AchievementIcon achievementId={achievementId} size={56} />
          </div>

          <p className="text-xs text-yellow-400/70 uppercase tracking-widest mb-1">Achievement Unlocked</p>
          <h2 className="text-xl font-bold text-white mb-2">{ach?.name ?? achievementId}</h2>
          <p className="text-sm text-slate-400">{ach?.description}</p>

          <button
            onClick={() => { setVisible(false); setTimeout(onClose, 400) }}
            className="mt-5 text-xs text-slate-500 border border-slate-600 px-4 py-1.5 rounded-full hover:border-slate-400 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  )
}
