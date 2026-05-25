import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import jsQR from 'jsqr'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { Star, Camera, X, ChevronDown, ChevronUp } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeUserBingoCards,
  deleteUserBingoCard,
  selfStampBingoCell,
} from '@/lib/firebase/firestore'
import { GLOSSARY_TERM_NAMES } from '@/lib/glossary'
import type { UserBingoCard } from '@/types'

const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightTerms = (text: string): React.ReactNode => {
  if (!text) return text
  const escapedTerms = GLOSSARY_TERM_NAMES.map(escapeRegex)
  const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'g')
  const parts = text.split(pattern)
  return parts.map((part, i) => {
    if (GLOSSARY_TERM_NAMES.includes(part)) {
      return (
        <Link
          key={i}
          to={`/guide?section=terms&term=${encodeURIComponent(part)}`}
          className="underline decoration-swan-accent/50 hover:text-swan-accent"
        >
          {part}
        </Link>
      )
    }
    return part
  })
}

type Mode = 'view' | 'scan' | 'stamp' | 'stamped'

const ConfettiEffect = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000)
    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {Array.from({ length: 50 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            backgroundColor: ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'][i % 6],
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${2 + Math.random()}s`,
          }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-black/80 px-8 py-6 rounded-2xl text-center animate-bounce-in">
          <p className="text-4xl mb-2">🎉</p>
          <p className="text-2xl font-bold text-yellow-400">BINGO!</p>
        </div>
      </div>
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        @keyframes bounce-in {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .animate-confetti { animation: confetti 2.5s ease-out forwards; }
        .animate-bounce-in { animation: bounce-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  )
}

const StampOverlay = ({ show }: { show: boolean }) => {
  if (!show) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-8 h-8 rounded-full bg-red-500/70 border-2 border-red-700 flex items-center justify-center animate-stamp">
        <span className="text-white text-xs font-bold">済</span>
      </div>
      <style>{`
        @keyframes stamp {
          0% { transform: scale(2) rotate(-20deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(10deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-stamp { animation: stamp 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}

type MissionDetail = {
  cellIndex: number
  text: string
  isCompleted: boolean
}

const MissionDetailModal = ({
  mission,
  onClose,
}: {
  mission: MissionDetail
  onClose: () => void
}) => {
  const cellNumber = mission.cellIndex < 12 ? mission.cellIndex + 1 : mission.cellIndex

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-swan-card border border-swan-border rounded-2xl p-5 max-w-sm w-full space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold ${
              mission.isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-swan-dark text-swan-sub'
            }`}>
              {cellNumber}
            </span>
            <span className="text-sm text-swan-sub">
              {mission.isCompleted ? '達成済み' : '未達成'}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-swan-sub hover:text-swan-text">
            <X size={20} />
          </button>
        </div>

        <div className={`text-swan-text leading-relaxed ${mission.isCompleted ? 'opacity-60' : ''}`}>
          {highlightTerms(mission.text)}
        </div>

        {mission.isCompleted && (
          <div className="flex items-center justify-center gap-2 py-2 bg-green-500/10 rounded-lg">
            <span className="text-green-400">✓</span>
            <span className="text-sm text-green-400">クリア！</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-swan-dark text-swan-text rounded-xl font-medium"
        >
          閉じる
        </button>
      </div>
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  )
}

const BingoGrid = ({
  userCard,
  onCellClick,
  onCellTap,
  selectable,
  stampingCell,
}: {
  userCard: UserBingoCard
  onCellClick?: (index: number) => void
  onCellTap?: (index: number) => void
  selectable?: boolean
  stampingCell?: number | null
}) => {
  const completedSet = new Set(userCard.completedCells)

  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 25 }).map((_, i) => {
        const mission = userCard.missions.find((m) => m.cellIndex === i)
        const isCompleted = completedSet.has(i)
        const isFree = i === 12
        const canSelect = selectable && !isCompleted && !isFree
        const isStamping = stampingCell === i

        const handleClick = () => {
          if (canSelect && onCellClick) {
            onCellClick(i)
          } else if (!isFree && onCellTap) {
            onCellTap(i)
          }
        }

        return (
          <button
            key={i}
            onClick={handleClick}
            className={`relative aspect-square rounded-lg flex items-center justify-center text-center p-1 text-[10px] leading-tight transition-all ${
              isFree
                ? 'bg-swan-accent/20 border border-swan-accent/50'
                : canSelect
                ? 'bg-swan-dark border border-swan-border text-swan-sub hover:border-swan-accent active:scale-95'
                : 'bg-swan-card border border-swan-border text-swan-sub hover:bg-swan-dark active:scale-95'
            }`}
          >
            {isFree ? (
              <Star size={16} className="text-swan-accent" />
            ) : (
              <span className={`line-clamp-3 ${isCompleted ? 'opacity-50' : ''}`}>
                {mission?.text ?? ''}
              </span>
            )}
            {isCompleted && !isFree && <StampOverlay show={true} />}
            {isStamping && <StampOverlay show={true} />}
          </button>
        )
      })}
    </div>
  )
}

const MissionList = ({ userCard }: { userCard: UserBingoCard }) => {
  const [expanded, setExpanded] = useState(false)
  const completedSet = new Set(userCard.completedCells)

  const sortedMissions = [...userCard.missions]
    .filter(m => m.cellIndex !== 12)
    .sort((a, b) => a.cellIndex - b.cellIndex)
    .map((m, idx) => ({ ...m, number: idx + 1 }))

  return (
    <div className="border-t border-swan-border pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm text-swan-sub hover:text-swan-text transition-colors"
      >
        <span>ミッション一覧</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
          {sortedMissions.map((m) => {
            const isCompleted = completedSet.has(m.cellIndex)
            return (
              <div
                key={m.cellIndex}
                className={`flex items-start gap-2 text-xs ${isCompleted ? 'opacity-50' : ''}`}
              >
                <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-swan-dark text-swan-sub'
                }`}>
                  {m.number}
                </span>
                <span className={`flex-1 ${isCompleted ? 'line-through' : ''}`}>
                  {highlightTerms(m.text)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const BingoCardDetail = ({
  userCard,
  onDelete,
  onScan,
}: {
  userCard: UserBingoCard
  onDelete: () => void
  onScan: () => void
}) => {
  const completedCount = userCard.completedCells.length
  const bingoCount = userCard.claimedBingoLines.length
  const progress = Math.round((completedCount / 25) * 100)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedMission, setSelectedMission] = useState<MissionDetail | null>(null)
  const completedSet = new Set(userCard.completedCells)

  const handleDelete = () => {
    onDelete()
    setShowDeleteConfirm(false)
  }

  const handleCellTap = (cellIndex: number) => {
    const mission = userCard.missions.find((m) => m.cellIndex === cellIndex)
    if (mission) {
      setSelectedMission({
        cellIndex,
        text: mission.text,
        isCompleted: completedSet.has(cellIndex),
      })
    }
  }

  return (
    <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-swan-text">{userCard.bingoCardName}</h3>
          <p className="text-xs text-swan-sub mt-0.5">
            {completedCount}/25マス完了 ・ {bingoCount}ビンゴ
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-swan-sub">進捗</p>
          <p className="font-bold text-swan-accent">{progress}%</p>
        </div>
      </div>

      <div className="h-2 bg-swan-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-swan-accent to-yellow-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <BingoGrid userCard={userCard} onCellTap={handleCellTap} />

      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
        />
      )}

      <MissionList userCard={userCard} />

      <div className="flex justify-around text-center pt-2 border-t border-swan-border">
        <div>
          <p className="text-xs text-swan-sub">1マス達成</p>
          <p className="font-semibold text-swan-text flex items-center justify-center gap-0.5">
            +{userCard.pointsPerCell} <FeatherIcon size={12} />
          </p>
        </div>
        <div>
          <p className="text-xs text-swan-sub">初BINGO</p>
          <p className="font-semibold text-swan-accent flex items-center justify-center gap-0.5">
            +{userCard.pointsPerBingo} <FeatherIcon size={12} />
          </p>
        </div>
        <div>
          <p className="text-xs text-swan-sub">全埋め</p>
          <p className="font-semibold text-purple-400 flex items-center justify-center gap-0.5">
            +{userCard.pointsForCompletion} <FeatherIcon size={12} />
          </p>
        </div>
      </div>

      {userCard.completedAt ? (
        <div className="text-center py-2 bg-swan-accent/20 rounded-lg">
          <p className="text-swan-accent font-bold">🎉 コンプリート！</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onScan}
            className="flex-1 bg-swan-accent text-black font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            スタンプを押す
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2.5 rounded-xl border border-swan-border text-swan-sub hover:border-red-500 hover:text-red-400 transition-colors"
          >
            破棄
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
          <p className="text-sm text-red-400 text-center">
            このビンゴカードを破棄しますか？<br />
            進行状況は失われます。
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 bg-swan-dark text-swan-text py-2 rounded-lg"
            >
              キャンセル
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 bg-red-500 text-white py-2 rounded-lg font-semibold"
            >
              破棄する
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export const BingoPage = () => {
  const { user } = useAuth()
  const [userCards, setUserCards] = useState<UserBingoCard[]>([])
  const [mode, setMode] = useState<Mode>('view')
  const [selectedCard, setSelectedCard] = useState<UserBingoCard | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [stamping, setStamping] = useState(false)
  const [stampingCell, setStampingCell] = useState<number | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (!user) return
    return subscribeUserBingoCards(user.uid, setUserCards)
  }, [user])

  const activeCards = userCards.filter((c) => !c.completedAt)
  const completedCards = userCards.filter((c) => c.completedAt)

  const handleDelete = async (cardId: string) => {
    await deleteUserBingoCard(cardId)
  }

  const startScan = (card: UserBingoCard) => {
    setSelectedCard(card)
    setMode('scan')
    setMessage('')
    setScannedCode(null)
    startCamera()
  }

  const analyzeFrame = useCallback(() => {
    if (processingRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(analyzeFrame)
      return
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code?.data && code.data.startsWith('BINGO:')) {
      processingRef.current = true
      const stampCode = code.data.replace('BINGO:', '')
      setScannedCode(stampCode)
      stopCamera()
      setMode('stamp')
    }
    rafRef.current = requestAnimationFrame(analyzeFrame)
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        rafRef.current = requestAnimationFrame(analyzeFrame)
      }
    } catch (e) {
      console.error('カメラエラー:', e)
      setMessage('カメラの起動に失敗しました')
      setMode('view')
    }
  }

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    processingRef.current = false
  }

  const cancelScan = () => {
    stopCamera()
    setMode('view')
    setSelectedCard(null)
    setScannedCode(null)
  }

  const handleStamp = async (cellIndex: number) => {
    if (!selectedCard || !scannedCode || stamping) return

    setStamping(true)
    setStampingCell(cellIndex)
    setMode('stamped')
    setMessage('')

    try {
      const result = await selfStampBingoCell(selectedCard.id, cellIndex, scannedCode)
      let msg = `✅ スタンプ完了！ +${result.cellPoints}pt`
      if (result.isFirstBingo) {
        msg += ` 🎉 初BINGO達成！ +${result.totalBingoPoints}pt`
        setShowConfetti(true)
      }
      if (result.isFullCompletion && result.completionPoints > 0) {
        msg += ` 🏆 全埋め完了！ +${result.completionPoints}pt`
      }
      setMessage(msg)

      setTimeout(() => {
        setMode('view')
        setSelectedCard(null)
        setScannedCode(null)
        setStampingCell(null)
        setMessage('')
        setStamping(false)
      }, result.isFirstBingo ? 3500 : 2000)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'エラーが発生しました')
      setStamping(false)
      setStampingCell(null)
      setMode('stamp')
    }
  }

  return (
    <AppShell title="Ring de BINGO">
      {showConfetti && <ConfettiEffect onComplete={() => setShowConfetti(false)} />}

      <div className="py-4 space-y-6">
        {mode === 'view' && (
          <>
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
              <h3 className="font-bold text-swan-text mb-1">🎯 Ring de BINGOとは？</h3>
              <p className="text-xs text-swan-sub">
                プレミアリング中にミッションをクリアしてビンゴを目指そう！
                テーブルのQRをスキャンして、達成したマスにスタンプを押そう。
              </p>
            </div>

            {activeCards.length > 0 ? (
              <div>
                <h2 className="text-sm font-semibold text-swan-sub mb-3 uppercase tracking-wide">
                  今日のビンゴ
                </h2>
                <div className="space-y-4">
                  {activeCards.map((card) => (
                    <BingoCardDetail
                      key={card.id}
                      userCard={card}
                      onDelete={() => handleDelete(card.id)}
                      onScan={() => startScan(card)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-swan-card border border-swan-border rounded-xl">
                <p className="text-4xl mb-3">🎰</p>
                <p className="text-swan-sub mb-2">ビンゴカードを持っていません</p>
                <p className="text-xs text-swan-muted">
                  来店時に配布されます
                </p>
              </div>
            )}

            {completedCards.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-swan-sub mb-3 uppercase tracking-wide">
                  コンプリート済み
                </h2>
                <div className="space-y-4">
                  {completedCards.map((card) => (
                    <BingoCardDetail
                      key={card.id}
                      userCard={card}
                      onDelete={() => handleDelete(card.id)}
                      onScan={() => {}}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'scan' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-swan-text">QRコードをスキャン</h2>
              <button onClick={cancelScan} className="text-swan-sub hover:text-swan-accent">
                <X size={24} />
              </button>
            </div>

            <p className="text-xs text-swan-sub">
              テーブルに設置されているビンゴスタンプ用のQRコードをスキャンしてください。
            </p>

            <div className="relative aspect-square rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-4 border-swan-accent/50 rounded-xl pointer-events-none" />
            </div>

            {message && (
              <p className="text-center text-red-400 text-sm">{message}</p>
            )}
          </div>
        )}

        {(mode === 'stamp' || mode === 'stamped') && selectedCard && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-swan-text">
                {mode === 'stamped' ? 'スタンプ完了！' : 'スタンプを押すマスを選択'}
              </h2>
              {mode === 'stamp' && (
                <button onClick={cancelScan} className="text-swan-sub hover:text-swan-accent">
                  <X size={24} />
                </button>
              )}
            </div>

            {mode === 'stamp' && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                <p className="text-green-400 text-sm text-center">
                  ✓ QRコード認証OK！1マスだけスタンプを押せます
                </p>
              </div>
            )}

            <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-swan-text">{selectedCard.bingoCardName}</h3>

              {mode === 'stamp' && (
                <p className="text-xs text-swan-sub">
                  達成したミッションのマスをタップしてください
                </p>
              )}

              <BingoGrid
                userCard={selectedCard}
                onCellClick={mode === 'stamp' ? handleStamp : undefined}
                selectable={mode === 'stamp' && !stamping}
                stampingCell={stampingCell}
              />

              {message && (
                <div className={`text-center py-2 rounded-lg text-sm ${
                  message.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
