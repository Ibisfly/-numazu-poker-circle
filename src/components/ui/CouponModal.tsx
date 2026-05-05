import { useState } from 'react'
import { markItemUsed } from '@/lib/firebase/firestore'
import type { UserItem, Item } from '@/types'

interface CouponModalProps {
  ui: UserItem
  item?: Item
  playerName: string
  onClose: () => void
}

// クーポンコード生成（userItem.id → XXXX-XXXX 形式）
const formatCode = (id: string) =>
  `${id.slice(0, 4).toUpperCase()}-${id.slice(4, 8).toUpperCase()}`

export const CouponModal = ({ ui, item, playerName, onClose }: CouponModalProps) => {
  const [confirming, setConfirming] = useState(false)
  const [marking, setMarking] = useState(false)

  const handleMarkUsed = async () => {
    setMarking(true)
    try {
      await markItemUsed(ui.id)
      onClose()
    } catch {
      setMarking(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs bg-white text-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="bg-[#ec4899] px-6 py-4 text-white text-center">
          <p className="text-xs font-medium opacity-80">NUMAZU POKER CIRCLE</p>
          <p className="text-lg font-bold mt-0.5">特典クーポン</p>
        </div>

        {/* ミシン目 */}
        <Perforated />

        {/* 本文 */}
        <div className="px-6 py-5 text-center space-y-3">
          <p className="text-xl font-bold text-gray-900">{item?.name ?? '特典'}</p>
          {item?.description && (
            <p className="text-sm text-gray-500">{item.description}</p>
          )}

          {/* クーポンコード */}
          <div className="bg-gray-100 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 mb-1">クーポンコード</p>
            <p className="text-2xl font-mono font-bold tracking-widest text-gray-800">
              {formatCode(ui.id)}
            </p>
          </div>

          <div className="text-xs text-gray-400 space-y-0.5">
            <p>使用者: {playerName}</p>
            <p>購入日: {ui.purchasedAt?.toDate().toLocaleDateString('ja-JP')}</p>
          </div>
        </div>

        {/* ミシン目 */}
        <Perforated />

        {/* アクションエリア */}
        <div className="px-6 py-5 space-y-3">
          {!confirming ? (
            <>
              <p className="text-xs text-gray-400 text-center">
                特典を利用したら「使用済みにする」を押してください。
              </p>
              <button
                onClick={() => setConfirming(true)}
                className="w-full bg-[#ec4899] text-white font-bold py-3 rounded-xl text-sm hover:opacity-90"
              >
                使用済みにする
              </button>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 text-gray-500 font-medium py-2 rounded-xl text-sm"
              >
                閉じる
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-gray-800 text-center">本当に使用しますか？</p>
              <p className="text-xs text-gray-400 text-center">
                この操作は取り消せません。<br />クーポンコード: <span className="font-mono font-bold">{formatCode(ui.id)}</span>
              </p>
              <button
                onClick={handleMarkUsed}
                disabled={marking}
                className="w-full bg-red-500 text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-50"
              >
                {marking ? '処理中...' : '使用済みにする（取消不可）'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="w-full bg-gray-100 text-gray-500 font-medium py-2 rounded-xl text-sm"
              >
                キャンセル
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const Perforated = () => (
  <div className="flex items-center px-4 py-1">
    <div className="flex-1 border-t-2 border-dashed border-gray-200" />
    <div className="mx-2 text-gray-300 text-sm">✂</div>
    <div className="flex-1 border-t-2 border-dashed border-gray-200" />
  </div>
)
