import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Lock } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import { subscribeUserAchievements } from '@/lib/firebase/firestore'
import type { UserAchievement } from '@/types'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { AchievementIcon } from '@/components/ui/AchievementIcons'

const PUZZLE_COLORS = [
  '#f59e0b', // amber
  '#ef4444', // red
  '#22c55e', // green
  '#3b82f6', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
]

const PuzzlePiece = ({
  achievement,
  unlocked,
  index,
  gridCols,
  onSelect,
  isNew,
}: {
  achievement: typeof ACHIEVEMENTS[0]
  unlocked: UserAchievement | undefined
  index: number
  gridCols: number
  onSelect: () => void
  isNew: boolean
}) => {
  const isSecret = achievement.isSecret ?? false
  const isLocked = !unlocked
  const row = Math.floor(index / gridCols)
  const col = index % gridCols

  const hasTop = row > 0
  const hasBottom = row < Math.ceil(ACHIEVEMENTS.length / gridCols) - 1
  const hasLeft = col > 0
  const hasRight = col < gridCols - 1 && index < ACHIEVEMENTS.length - 1

  const topType = hasTop ? ((row + col) % 2 === 0 ? 'out' : 'in') : 'flat'
  const bottomType = hasBottom ? ((row + col + 1) % 2 === 0 ? 'out' : 'in') : 'flat'
  const leftType = hasLeft ? ((row + col) % 2 === 1 ? 'out' : 'in') : 'flat'
  const rightType = hasRight ? ((row + col + 1) % 2 === 1 ? 'out' : 'in') : 'flat'

  const color = PUZZLE_COLORS[index % PUZZLE_COLORS.length]

  return (
    <button
      onClick={onSelect}
      className={`relative aspect-square transition-all duration-300 ${
        isNew ? 'animate-puzzle-snap' : ''
      } ${
        isLocked ? 'hover:scale-105' : 'hover:scale-105 hover:z-10'
      }`}
      style={{
        filter: isLocked ? 'grayscale(100%) brightness(0.4)' : 'none',
      }}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        <defs>
          <clipPath id={`puzzle-${index}`}>
            <path d={generatePuzzlePath(topType, rightType, bottomType, leftType)} />
          </clipPath>
        </defs>
        <rect
          x="0"
          y="0"
          width="100"
          height="100"
          fill={unlocked ? color : '#374151'}
          clipPath={`url(#puzzle-${index})`}
        />
        <path
          d={generatePuzzlePath(topType, rightType, bottomType, leftType)}
          fill="none"
          stroke={unlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}
          strokeWidth="2"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {unlocked ? (
          <AchievementIcon achievementId={achievement.id} size={28} />
        ) : (
          <Lock
            size={20}
            className={isSecret ? 'text-purple-400/50' : 'text-gray-500/70'}
          />
        )}
      </div>
      {isSecret && !unlocked && (
        <div className="absolute top-1 right-1">
          <span className="text-[8px] text-purple-400/60 font-bold">?</span>
        </div>
      )}
    </button>
  )
}

function generatePuzzlePath(
  top: 'flat' | 'in' | 'out',
  right: 'flat' | 'in' | 'out',
  bottom: 'flat' | 'in' | 'out',
  left: 'flat' | 'in' | 'out'
): string {
  const tabSize = 12
  const tabOffset = 35

  let d = 'M 10 10 '

  if (top === 'flat') {
    d += 'L 90 10 '
  } else if (top === 'out') {
    d += `L ${tabOffset} 10 Q ${tabOffset} ${10 - tabSize} 50 ${10 - tabSize} Q ${100 - tabOffset} ${10 - tabSize} ${100 - tabOffset} 10 L 90 10 `
  } else {
    d += `L ${tabOffset} 10 Q ${tabOffset} ${10 + tabSize} 50 ${10 + tabSize} Q ${100 - tabOffset} ${10 + tabSize} ${100 - tabOffset} 10 L 90 10 `
  }

  if (right === 'flat') {
    d += 'L 90 90 '
  } else if (right === 'out') {
    d += `L 90 ${tabOffset} Q ${90 + tabSize} ${tabOffset} ${90 + tabSize} 50 Q ${90 + tabSize} ${100 - tabOffset} 90 ${100 - tabOffset} L 90 90 `
  } else {
    d += `L 90 ${tabOffset} Q ${90 - tabSize} ${tabOffset} ${90 - tabSize} 50 Q ${90 - tabSize} ${100 - tabOffset} 90 ${100 - tabOffset} L 90 90 `
  }

  if (bottom === 'flat') {
    d += 'L 10 90 '
  } else if (bottom === 'out') {
    d += `L ${100 - tabOffset} 90 Q ${100 - tabOffset} ${90 + tabSize} 50 ${90 + tabSize} Q ${tabOffset} ${90 + tabSize} ${tabOffset} 90 L 10 90 `
  } else {
    d += `L ${100 - tabOffset} 90 Q ${100 - tabOffset} ${90 - tabSize} 50 ${90 - tabSize} Q ${tabOffset} ${90 - tabSize} ${tabOffset} 90 L 10 90 `
  }

  if (left === 'flat') {
    d += 'L 10 10'
  } else if (left === 'out') {
    d += `L 10 ${100 - tabOffset} Q ${10 - tabSize} ${100 - tabOffset} ${10 - tabSize} 50 Q ${10 - tabSize} ${tabOffset} 10 ${tabOffset} L 10 10`
  } else {
    d += `L 10 ${100 - tabOffset} Q ${10 + tabSize} ${100 - tabOffset} ${10 + tabSize} 50 Q ${10 + tabSize} ${tabOffset} 10 ${tabOffset} L 10 10`
  }

  d += ' Z'
  return d
}

export const AchievementsPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([])
  const [selectedAch, setSelectedAch] = useState<typeof ACHIEVEMENTS[0] | null>(null)
  const [newlyUnlocked, setNewlyUnlocked] = useState<Set<string>>(new Set())
  const prevUnlockedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user) return
    return subscribeUserAchievements(user.uid, (achievements) => {
      const currentIds = new Set(achievements.map((a) => a.achievementId))
      const newIds = new Set<string>()
      currentIds.forEach((id) => {
        if (!prevUnlockedRef.current.has(id)) {
          newIds.add(id)
        }
      })
      if (newIds.size > 0) {
        setNewlyUnlocked(newIds)
        setTimeout(() => setNewlyUnlocked(new Set()), 1000)
      }
      prevUnlockedRef.current = currentIds
      setUserAchievements(achievements)
    })
  }, [user])

  const unlockedMap = new Map(userAchievements.map((ua) => [ua.achievementId, ua]))
  const unlockedCount = userAchievements.length
  const gridCols = 5

  const selectedUnlocked = selectedAch ? unlockedMap.get(selectedAch.id) : undefined
  const isSelectedSecret = selectedAch?.isSecret ?? false
  const isSelectedLocked = selectedAch && !selectedUnlocked

  return (
    <AppShell title="実績" showBack onBack={() => navigate('/profile')}>
      <div className="py-4 space-y-4">
        {/* 進捗 */}
        <div className="bg-swan-card border border-swan-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-swan-sub text-sm">実績コンプリート</span>
            <span className="text-swan-accent font-bold">
              {unlockedCount} / {ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="h-2 bg-swan-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-swan-accent to-yellow-400 transition-all duration-500"
              style={{ width: `${(unlockedCount / ACHIEVEMENTS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* パズルグリッド */}
        <div
          className="grid gap-1"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {ACHIEVEMENTS.map((ach, i) => (
            <PuzzlePiece
              key={ach.id}
              achievement={ach}
              unlocked={unlockedMap.get(ach.id)}
              index={i}
              gridCols={gridCols}
              onSelect={() => setSelectedAch(ach)}
              isNew={newlyUnlocked.has(ach.id)}
            />
          ))}
        </div>

        {/* 選択された実績の詳細 */}
        {selectedAch && (
          <div
            className={`bg-swan-card border rounded-xl p-4 transition-all ${
              selectedUnlocked
                ? 'border-swan-accent/50'
                : isSelectedSecret
                ? 'border-purple-500/30'
                : 'border-swan-border'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 flex items-center justify-center shrink-0">
                {selectedUnlocked ? (
                  <AchievementIcon achievementId={selectedAch.id} size={48} />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-swan-dark flex items-center justify-center">
                    <Lock
                      size={24}
                      className={isSelectedSecret ? 'text-purple-400/50' : 'text-swan-muted'}
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`font-bold ${selectedUnlocked ? 'text-swan-text' : 'text-swan-sub'}`}>
                    {isSelectedSecret && isSelectedLocked ? '???' : selectedAch.name}
                  </h3>
                  {isSelectedSecret && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full border ${
                        selectedUnlocked
                          ? 'text-purple-400 border-purple-400/40'
                          : 'text-purple-400/60 border-purple-400/30'
                      }`}
                    >
                      SECRET
                    </span>
                  )}
                </div>
                <p className="text-sm text-swan-sub mt-1">
                  {isSelectedSecret && isSelectedLocked
                    ? 'シークレット実績'
                    : selectedAch.description}
                </p>
                {selectedUnlocked && (
                  <p className="text-xs text-swan-accent mt-2">
                    解除日: {selectedUnlocked.unlockedAt?.toDate().toLocaleDateString('ja-JP')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedAch(null)}
              className="w-full mt-4 py-2 text-swan-sub text-sm bg-swan-dark rounded-lg hover:bg-swan-border transition-colors"
            >
              閉じる
            </button>
          </div>
        )}

        {/* CSS アニメーション */}
        <style>{`
          @keyframes puzzle-snap {
            0% {
              transform: scale(1.5) rotate(-15deg);
              opacity: 0;
            }
            50% {
              transform: scale(1.1) rotate(5deg);
              opacity: 1;
            }
            100% {
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }
          .animate-puzzle-snap {
            animation: puzzle-snap 0.6s ease-out forwards;
          }
        `}</style>
      </div>
    </AppShell>
  )
}
