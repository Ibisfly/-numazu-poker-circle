import { useEffect, useState, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import { AdminShell } from '@/pages/admin/AdminDashboardPage'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { Camera, Check, Star, BeginnerIcon, X } from '@/components/ui/Icons'
import { SwanAvatar, DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeAllUsers,
  subscribeUserBingoCards,
  stampBingoCell,
} from '@/lib/firebase/firestore'
import type { User, UserBingoCard } from '@/types'

type Mode = 'select' | 'stamp'

export const BingoStampPage = () => {
  const { user: admin } = useAuth()
  const [mode, setMode] = useState<Mode>('select')
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userCards, setUserCards] = useState<UserBingoCard[]>([])
  const [selectedCard, setSelectedCard] = useState<UserBingoCard | null>(null)
  const [stamping, setStamping] = useState(false)
  const [message, setMessage] = useState('')
  const [scanning, setScanning] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    return subscribeAllUsers((u) => setUsers(u.filter((x) => x.status === 'active')))
  }, [])

  useEffect(() => {
    if (!selectedUser) {
      setUserCards([])
      setSelectedCard(null)
      return
    }
    return subscribeUserBingoCards(selectedUser.uid, (cards) => {
      const active = cards.filter((c) => !c.completedAt)
      setUserCards(active)
      if (active.length === 1) setSelectedCard(active[0])
    })
  }, [selectedUser])

  const filteredUsers = users.filter(
    (u) =>
      u.playerName.toLowerCase().includes(search.toLowerCase()) &&
      u.role !== 'admin'
  )

  const selectUser = (u: User) => {
    setSelectedUser(u)
    setMode('stamp')
    setSearch('')
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

    if (code?.data) {
      processingRef.current = true
      const uid = code.data
      const found = users.find((u) => u.uid === uid)
      if (found) {
        selectUser(found)
        stopScan()
      } else {
        processingRef.current = false
      }
    }
    rafRef.current = requestAnimationFrame(analyzeFrame)
  }, [users])

  const startScan = async () => {
    setScanning(true)
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
      setScanning(false)
    }
  }

  const stopScan = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    processingRef.current = false
    setScanning(false)
  }

  const handleStamp = async (cellIndex: number) => {
    if (!admin || !selectedCard || stamping) return
    if (selectedCard.completedCells.includes(cellIndex)) {
      setMessage('このマスは既にスタンプ済みです')
      return
    }
    if (cellIndex === 12) return

    setStamping(true)
    setMessage('')
    try {
      const result = await stampBingoCell(selectedCard.id, cellIndex, admin.uid)
      let msg = `✅ スタンプ完了！ +${result.cellPoints}pt`
      if (result.newBingoLines > 0) {
        msg += ` 🎉 BINGO ${result.newBingoLines}ライン達成！ +${result.totalBingoPoints}pt`
      }
      setMessage(msg)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setStamping(false)
    }
  }

  const reset = () => {
    setSelectedUser(null)
    setSelectedCard(null)
    setMode('select')
    setMessage('')
  }

  return (
    <AdminShell title="ビンゴスタンプ">
      <div className="py-4 space-y-4">
        {/* ユーザー選択モード */}
        {mode === 'select' && (
          <>
            {/* QRスキャン */}
            <div className="bg-swan-card border border-swan-border rounded-xl p-4">
              {scanning ? (
                <div className="space-y-3">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  <button
                    onClick={stopScan}
                    className="w-full bg-swan-dark text-swan-text py-2 rounded-lg"
                  >
                    キャンセル
                  </button>
                </div>
              ) : (
                <button
                  onClick={startScan}
                  className="w-full flex items-center justify-center gap-2 bg-swan-accent text-black font-semibold py-3 rounded-xl"
                >
                  <Camera size={20} />
                  QRコードをスキャン
                </button>
              )}
            </div>

            {/* 名前検索 */}
            <div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="プレイヤーネームで検索..."
                className="w-full bg-swan-card border border-swan-border rounded-lg px-4 py-2.5 text-sm text-swan-text placeholder-swan-sub"
              />
            </div>

            {/* ユーザー一覧 */}
            <div className="space-y-2">
              {filteredUsers.slice(0, 20).map((u) => (
                <button
                  key={u.uid}
                  onClick={() => selectUser(u)}
                  className="w-full flex items-center gap-3 bg-swan-card border border-swan-border rounded-xl px-4 py-3 hover:border-swan-accent transition-colors text-left"
                >
                  <SwanAvatar
                    color={u.avatarColor ?? DEFAULT_AVATAR_COLOR}
                    size={36}
                    showCard={false}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-swan-text truncate flex items-center gap-1.5">
                      {u.playerName}
                      {u.isBeginner && <BeginnerIcon size={12} />}
                    </p>
                  </div>
                </button>
              ))}
              {filteredUsers.length === 0 && search && (
                <p className="text-swan-sub text-center py-4">見つかりません</p>
              )}
            </div>
          </>
        )}

        {/* スタンプモード */}
        {mode === 'stamp' && selectedUser && (
          <>
            {/* 選択中のユーザー */}
            <div className="flex items-center justify-between bg-swan-card border border-swan-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <SwanAvatar
                  color={selectedUser.avatarColor ?? DEFAULT_AVATAR_COLOR}
                  size={40}
                  showCard={false}
                />
                <div>
                  <p className="font-semibold text-swan-text flex items-center gap-1.5">
                    {selectedUser.playerName}
                    {selectedUser.isBeginner && <BeginnerIcon size={12} />}
                  </p>
                  <p className="text-xs text-swan-sub flex items-center gap-1">
                    保有: {selectedUser.ownedPoints.toLocaleString()} <FeatherIcon size={10} />
                  </p>
                </div>
              </div>
              <button onClick={reset} className="text-swan-sub hover:text-swan-accent">
                <X size={20} />
              </button>
            </div>

            {/* カード選択 */}
            {userCards.length === 0 ? (
              <div className="text-center py-8 text-swan-sub">
                <p>進行中のビンゴカードがありません</p>
                <button
                  onClick={reset}
                  className="mt-4 text-swan-accent underline"
                >
                  別のユーザーを選択
                </button>
              </div>
            ) : (
              <>
                {userCards.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {userCards.map((card) => (
                      <button
                        key={card.id}
                        onClick={() => setSelectedCard(card)}
                        className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedCard?.id === card.id
                            ? 'bg-swan-accent text-black'
                            : 'bg-swan-card border border-swan-border text-swan-sub'
                        }`}
                      >
                        {card.bingoCardName}
                      </button>
                    ))}
                  </div>
                )}

                {selectedCard && (
                  <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-swan-text flex items-center gap-1.5">
                          {selectedCard.bingoCardName}
                          {selectedCard.bingoCardLevel === 'beginner' && <BeginnerIcon size={12} />}
                        </p>
                        <p className="text-xs text-swan-sub">
                          {selectedCard.completedCells.length}/25マス完了
                        </p>
                      </div>
                      <div className="text-right text-xs text-swan-sub">
                        <p>マス: +{selectedCard.pointsPerCell}pt</p>
                        <p>BINGO: +{selectedCard.pointsPerBingo}pt</p>
                      </div>
                    </div>

                    {/* ビンゴグリッド */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {Array.from({ length: 25 }).map((_, i) => {
                        const mission = selectedCard.missions.find((m) => m.cellIndex === i)
                        const isCompleted = selectedCard.completedCells.includes(i)
                        const isFree = i === 12

                        return (
                          <button
                            key={i}
                            onClick={() => handleStamp(i)}
                            disabled={isCompleted || isFree || stamping}
                            className={`aspect-square rounded-lg flex items-center justify-center text-center p-1 text-[10px] leading-tight transition-all ${
                              isCompleted
                                ? 'bg-swan-accent text-black font-semibold'
                                : 'bg-swan-dark border border-swan-border text-swan-sub hover:border-swan-accent active:scale-95'
                            } ${stamping ? 'opacity-50' : ''}`}
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

                    {/* メッセージ */}
                    {message && (
                      <div className={`text-center py-2 rounded-lg text-sm ${
                        message.includes('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {message}
                      </div>
                    )}

                    <p className="text-xs text-swan-muted text-center">
                      タップでスタンプを押します
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AdminShell>
  )
}
