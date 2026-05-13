import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import jsQR from 'jsqr'
import { AdminShell } from './AdminDashboardPage'
import { subscribeEvents, getUser, recordAttendance, checkAndUnlockAchievements, assignBingoCardOnAttendance } from '@/lib/firebase/firestore'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Event } from '@/types'
import { ChevronLeft, Camera, X } from '@/components/ui/Icons'

export const ScanPage = () => {
  const { user: adminUser } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [scanStatus, setScanStatus] = useState<'scanning' | 'detected' | 'processing'>('scanning')

  const videoRef   = useRef<HTMLVideoElement>(null)
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const rafRef     = useRef<number | null>(null)
  const processingRef = useRef(false)

  useEffect(() => {
    return subscribeEvents((evs) => {
      setEvents(evs)
      if (evs.length > 0 && !selectedEventId) setSelectedEventId(evs[0].id)
    })
  }, [])

  const selectedEvent = events.find((e) => e.id === selectedEventId)

  // ── QRコードをフレームごとに解析 ────────────────────────────────────────
  const analyzeFrame = useCallback(async () => {
    if (processingRef.current) return
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(analyzeFrame)
      return
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })
    if (code?.data) {
      processingRef.current = true
      setScanStatus('detected')
      await handleQrResult(code.data)
    } else {
      rafRef.current = requestAnimationFrame(analyzeFrame)
    }
  }, [selectedEvent, adminUser]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── カメラ起動（ビデオ要素が描画された後に srcObject をセット）─────────
  useEffect(() => {
    if (!scanning) return
    const video = videoRef.current
    if (!video || !streamRef.current) return
    video.srcObject = streamRef.current
    video.play().then(() => {
      rafRef.current = requestAnimationFrame(analyzeFrame)
    }).catch(() => {})
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [scanning, analyzeFrame])

  const startScan = async () => {
    setResult(null)
    setScanStatus('scanning')
    processingRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      setScanning(true)  // ← 描画後に useEffect で srcObject をセット
    } catch {
      setResult({ success: false, message: 'カメラへのアクセスを許可してください（ブラウザの設定を確認）' })
    }
  }

  const stopScan = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    processingRef.current = false
    setScanning(false)
    setScanStatus('scanning')
  }

  // ── QRコード結果を処理 ───────────────────────────────────────────────────
  const handleQrResult = async (uid: string) => {
    if (!adminUser || !selectedEvent) {
      processingRef.current = false
      rafRef.current = requestAnimationFrame(analyzeFrame)
      return
    }
    setScanStatus('processing')
    try {
      const targetUser = await getUser(uid.trim())
      if (!targetUser) throw new Error('ユーザーが見つかりません')
      if (targetUser.status !== 'active') throw new Error(`${targetUser.playerName} は有効なメンバーではありません`)
      await recordAttendance(selectedEvent.id, targetUser.uid, selectedEvent.attendancePoint, adminUser.uid)
      setResult({ success: true, message: `✓ ${targetUser.playerName} に ${selectedEvent.attendancePoint}pt 付与しました` })
      checkAndUnlockAchievements(targetUser.uid).catch(() => {})
      assignBingoCardOnAttendance(targetUser.uid, selectedEvent.id).catch(() => {})
      stopScan()
    } catch (e: unknown) {
      setResult({ success: false, message: e instanceof Error ? e.message : 'エラーが発生しました' })
      // 失敗時は1秒後に再スキャン再開
      setTimeout(() => {
        processingRef.current = false
        setScanStatus('scanning')
        rafRef.current = requestAnimationFrame(analyzeFrame)
      }, 1500)
    }
  }

  // ── 手動入力 ────────────────────────────────────────────────────────────
  const [manualUid, setManualUid] = useState('')

  const handleManualScan = async () => {
    if (!adminUser || !selectedEvent || !manualUid.trim()) return
    setResult(null)
    try {
      const targetUser = await getUser(manualUid.trim())
      if (!targetUser) throw new Error('ユーザーが見つかりません')
      if (targetUser.status !== 'active') throw new Error('有効なメンバーではありません')
      await recordAttendance(selectedEvent.id, targetUser.uid, selectedEvent.attendancePoint, adminUser.uid)
      checkAndUnlockAchievements(targetUser.uid).catch(() => {})
      assignBingoCardOnAttendance(targetUser.uid, selectedEvent.id).catch(() => {})
      setResult({ success: true, message: `✓ ${targetUser.playerName} に ${selectedEvent.attendancePoint}pt 付与しました` })
      setManualUid('')
    } catch (e: unknown) {
      setResult({ success: false, message: e instanceof Error ? e.message : 'エラーが発生しました' })
    }
  }

  if (!adminUser) return null

  return (
    <AdminShell title="来店スキャン">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        {/* イベント選択 */}
        <div>
          <label className="block text-xs text-swan-sub mb-1">イベント選択</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full bg-swan-card border border-swan-border rounded-lg px-3 py-2 text-swan-text focus:outline-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title} ({ev.attendancePoint}pt)
              </option>
            ))}
          </select>
          {events.length === 0 && (
            <p className="text-xs text-swan-sub mt-1">イベントを先に作成してください</p>
          )}
        </div>

        {/* カメラビュー */}
        {scanning ? (
          <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
              />
              {/* QRスキャン枠 */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-48 h-48 rounded-xl border-2 transition-colors ${
                  scanStatus === 'detected' ? 'border-green-400' :
                  scanStatus === 'processing' ? 'border-yellow-400' :
                  'border-white/60'
                }`}>
                  {/* 四隅マーカー */}
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <div key={i} className={`absolute w-5 h-5 border-2 ${
                      scanStatus === 'detected' ? 'border-green-400' : 'border-white'
                    } ${pos} ${i < 2 ? 'border-b-0' : 'border-t-0'} ${i % 2 === 0 ? 'border-r-0' : 'border-l-0'}`} />
                  ))}
                </div>
              </div>
              {/* スキャン状態 */}
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className={`text-xs px-3 py-1 rounded-full ${
                  scanStatus === 'processing' ? 'bg-yellow-500/80 text-black' :
                  scanStatus === 'detected'   ? 'bg-green-500/80 text-white' :
                  'bg-black/60 text-white'
                }`}>
                  {scanStatus === 'processing' ? '処理中...' :
                   scanStatus === 'detected'   ? 'QRコード検出！' :
                   '会員証QRコードを枠内に合わせてください'}
                </span>
              </div>
            </div>
            {/* 非表示キャンバス（解析用） */}
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={stopScan}
              className="w-full bg-swan-muted text-swan-sub py-2 rounded-xl text-sm flex items-center justify-center gap-2"
            >
              <X size={14} /> スキャン停止
            </button>
          </div>
        ) : (
          <button
            onClick={startScan}
            disabled={!selectedEventId}
            className="w-full bg-swan-accent text-black font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Camera size={18} />
            カメラでQRスキャン開始
          </button>
        )}

        {/* 結果表示 */}
        {result && (
          <div className={`rounded-xl p-4 text-sm font-medium ${
            result.success
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {result.message}
          </div>
        )}

        {/* 手動入力（フォールバック） */}
        <div className="border-t border-swan-border pt-4">
          <p className="text-xs text-swan-sub mb-2">手動入力（フォールバック）</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualUid}
              onChange={(e) => setManualUid(e.target.value)}
              placeholder="メンバーUID"
              className="flex-1 bg-swan-card border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
            />
            <button
              onClick={handleManualScan}
              disabled={!manualUid.trim() || !selectedEventId}
              className="bg-swan-accent text-black font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              付与
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  )
}
