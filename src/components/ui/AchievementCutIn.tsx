import { useEffect, useState } from 'react'
import { AchievementIcon } from './AchievementIcons'

export interface CutInItem {
  achievementId: string
  name: string
}

interface Props {
  queue: CutInItem[]
  onDismiss: () => void
}

export const AchievementCutIn = ({ queue, onDismiss }: Props) => {
  const [visible, setVisible] = useState(false)
  const current = queue[0]

  useEffect(() => {
    if (!current) return
    // 少し遅らせてマウント後にアニメーション開始
    const showTimer = setTimeout(() => setVisible(true), 50)
    const hideTimer = setTimeout(() => {
      setVisible(false)
      // フェードアウト後に次のキューへ
      setTimeout(onDismiss, 500)
    }, 3500)
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer) }
  }, [current?.achievementId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null

  return (
    <div
      className={`fixed top-16 left-1/2 z-[100] w-[88%] max-w-sm transition-all duration-500 pointer-events-none ${
        visible
          ? 'opacity-100 -translate-x-1/2 translate-y-0'
          : 'opacity-0 -translate-x-1/2 -translate-y-3'
      }`}
    >
      <div className="bg-gradient-to-r from-amber-950/95 to-yellow-900/95 border border-swan-accent/70 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-sm flex items-center gap-3">
        {/* アイコン */}
        <div className="w-12 h-12 flex items-center justify-center shrink-0 bg-swan-accent/20 rounded-xl border border-swan-accent/30">
          <AchievementIcon achievementId={current.achievementId} size={38} />
        </div>
        {/* テキスト */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-widest text-swan-accent uppercase mb-0.5">
            ★ Achievement Unlocked
          </p>
          <p className="text-sm font-bold text-swan-text truncate">{current.name}</p>
        </div>
        {/* 輝きエフェクト（CSS only） */}
        <div className="w-6 h-6 shrink-0 flex items-center justify-center text-swan-accent text-lg animate-pulse">
          ✦
        </div>
      </div>
    </div>
  )
}
