import { useEffect, useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import jsQR from 'jsqr'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { BeginnerIcon, Star, Check, Camera, X } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeUserBingoCards,
  subscribeBingoCards,
  deleteUserBingoCard,
  selfStampBingoCell,
} from '@/lib/firebase/firestore'
import type { UserBingoCard, BingoCard } from '@/types'

type Mode = 'view' | 'scan' | 'stamp'

const BingoGrid = ({
  userCard,
  onCellClick,
  selectable,
}: {
  userCard: UserBingoCard
  onCellClick?: (index: number) => void
  selectable?: boolean
}) => {
  const completedSet = new Set(userCard.completedCells)

  return (
    <div className="grid grid-cols-5 gap-1">
      {Array.from({ length: 25 }).map((_, i) => {
        const mission = userCard.missions.find((m) => m.cellIndex === i)
        const isCompleted = completedSet.has(i)
        const isFree = i === 12
        const canSelect = selectable && !isCompleted && !isFree

        return (
          <button
            key={i}
            onClick={() => canSelect && onCellClick?.(i)}
            disabled={!canSelect}
            className={`aspect-square rounded-lg flex items-center justify-center text-center p-1 text-[10px] leading-tight transition-all ${
              isCompleted
                ? 'bg-swan-accent text-black font-semibold'
                : canSelect
                ? 'bg-swan-dark border border-swan-border text-swan-sub hover:border-swan-accent active:scale-95'
                : 'bg-swan-card border border-swan-border text-swan-sub'
            }`}
          >
            {isFree ? (
              <Star size={16} className={isCompleted ? 'text-black' : 'text-swan-accent'} />
            ) : isCompleted ? (
              <Check size={14} />
            ) : (
              <span className="line-clamp-3">{mission?.text ?? ''}</span>
            )}
          </button>
        )
      })}
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

  const handleDelete = () => {
    onDelete()
    setShowDeleteConfirm(false)
  }

  return (
    <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-swan-text">{userCard.bingoCardName}</h3>
            {userCard.bingoCardLevel === 'beginner' && <BeginnerIcon size={14} />}
          </div>
          <p className="text-xs text-swan-sub mt-0.5">
            {completedCount}/25マス完了 ・ {bingoCount}ビンゴ
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-swan-sub">進捗</p>
          <p className="font-bold text-swan-accent">{progress}%</p>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="h-2 bg-swan-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-swan-accent to-yellow-400 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ビンゴグリッド */}
      <BingoGrid userCard={userCard} />

      {/* 報酬情報 */}
      <div className="flex justify-around text-center pt-2 border-t border-swan-border">
        <div>
          <p className="text-xs text-swan-sub">1マス達成</p>
          <p className="font-semibold text-swan-text flex items-center justify-center gap-0.5">
            +{userCard.pointsPerCell} <FeatherIcon size={12} />
          </p>
        </div>
        <div>
          <p className="text-xs text-swan-sub">BINGO達成</p>
          <p className="font-semibold text-swan-accent flex items-center justify-center gap-0.5">
            +{userCard.pointsPerBingo} <FeatherIcon size={12} />
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

      {/* 破棄確認 */}
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
  const [availableCards, setAvailableCards] = useState<BingoCard[]>([])
  const [mode, setMode] = useState<Mode>('view')
  const [selectedCard, setSelectedCard] = useState<UserBingoCard | null>(null)
  const [scannedCode, setScannedCode] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [stamping, setStamping] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    if (!user) return
    return subscribeUserBingoCards(user.uid, setUserCards)
  }, [user])

  useEffect(() => {
    return subscribeBingoCards((cards) =>
      setAvailableCards(cards.filter((c) => c.isAvailable))
    )
  }, [])

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
    setMessage('')
    try {
      const result = await selfStampBingoCell(selectedCard.id, cellIndex, scannedCode)
      let msg = `✅ スタンプ完了！ +${result.cellPoints}pt`
      if (result.newBingoLines > 0) {
        msg += ` 🎉 BINGO ${result.newBingoLines}ライン達成！ +${result.totalBingoPoints}pt`
      }
      setMessage(msg)
      setTimeout(() => {
        setMode('view')
        setSelectedCard(null)
        setScannedCode(null)
        setMessage('')
      }, 2000)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setStamping(false)
    }
  }

  return (
    <AppShell title="Ring de BINGO">
      <div className="py-4 space-y-6">
        {/* 通常表示モード */}
        {mode === 'view' && (
          <>
            {/* 説明 */}
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-500/30">
              <h3 className="font-bold text-swan-text mb-1">🎯 Ring de BINGOとは？</h3>
              <p className="text-xs text-swan-sub">
                リングゲーム中にミッションをクリアしてビンゴを目指そう！
                テーブルのQRをスキャンして、達成したマスにスタンプを押そう。
              </p>
            </div>

            {/* 進行中のカード */}
            {activeCards.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-swan-sub mb-3 uppercase tracking-wide">
                  進行中のビンゴ
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
            )}

            {/* ショップへの誘導 */}
            {activeCards.length === 0 && (
              <div className="text-center py-8">
                <p className="text-swan-sub mb-4">ビンゴカードを持っていません</p>
                <Link
                  to="/shop"
                  className="inline-block bg-swan-accent text-black font-semibold px-6 py-3 rounded-xl"
                >
                  ショップで購入する
                </Link>
              </div>
            )}

            {/* 購入可能なカード一覧 */}
            {availableCards.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-swan-sub mb-3 uppercase tracking-wide">
                  購入可能なビンゴカード
                </h2>
                <div className="space-y-2">
                  {availableCards.map((card) => (
                    <Link
                      key={card.id}
                      to="/shop"
                      className="flex items-center justify-between bg-swan-card border border-swan-border rounded-xl px-4 py-3 hover:border-swan-accent transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🎰</span>
                        <div>
                          <p className="font-semibold text-swan-text flex items-center gap-1.5">
                            {card.name}
                            {card.level === 'beginner' && <BeginnerIcon size={12} />}
                          </p>
                          <p className="text-xs text-swan-sub">{card.description}</p>
                        </div>
                      </div>
                      <p className="font-bold text-swan-accent flex items-center gap-1">
                        {card.cost.toLocaleString()} <FeatherIcon size={12} />
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 完了したカード */}
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

        {/* スキャンモード */}
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

        {/* スタンプ選択モード */}
        {mode === 'stamp' && selectedCard && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-swan-text">スタンプを押すマスを選択</h2>
              <button onClick={cancelScan} className="text-swan-sub hover:text-swan-accent">
                <X size={24} />
              </button>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3">
              <p className="text-green-400 text-sm text-center">
                ✓ QRコード認証OK！1マスだけスタンプを押せます
              </p>
            </div>

            <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-swan-text">{selectedCard.bingoCardName}</h3>
                {selectedCard.bingoCardLevel === 'beginner' && <BeginnerIcon size={14} />}
              </div>

              <p className="text-xs text-swan-sub">
                達成したミッションのマスをタップしてください
              </p>

              <BingoGrid
                userCard={selectedCard}
                onCellClick={handleStamp}
                selectable={!stamping}
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
