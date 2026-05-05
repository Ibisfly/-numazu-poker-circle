import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { SwanAvatar, DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeItems, subscribeUserItems,
  purchaseItem, purchaseBenefitItem, equipAvatarColor, equipFrame, equipOverlay,
} from '@/lib/firebase/firestore'
import type { Item, UserItem } from '@/types'
import { Plus, Minus } from '@/components/ui/Icons'

type Tab = 'cosmetic' | 'benefit'
type CosmeticSub = 'avatar_color' | 'avatar_decoration' | 'title'

const COSMETIC_SUBS: { value: CosmeticSub; label: string }[] = [
  { value: 'avatar_color',      label: 'アイコン(背景)' },
  { value: 'avatar_decoration', label: 'アイコン(装飾)' },
  { value: 'title',             label: '称号' },
]

export const ShopPage = () => {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('cosmetic')
  const [cosmeticSub, setCosmeticSub] = useState<CosmeticSub>('avatar_color')
  const [items, setItems] = useState<Item[]>([])
  const [userItems, setUserItems] = useState<UserItem[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  // 特典の購入数 map { itemId: number }
  const [qty, setQty] = useState<Record<string, number>>({})

  useEffect(() => { return subscribeItems(setItems) }, [])
  useEffect(() => {
    if (!user) return
    return subscribeUserItems(user.uid, setUserItems)
  }, [user])

  const filteredItems = items
    .filter((i) => {
      if (!i.isAvailable) return false
      if (tab === 'benefit') return i.category === 'benefit'
      if (i.category !== 'cosmetic') return false
      if (cosmeticSub === 'avatar_color')      return i.itemSubtype === 'avatar_color'
      if (cosmeticSub === 'avatar_decoration') return i.itemSubtype === 'avatar_decoration'
      if (cosmeticSub === 'title')             return i.itemSubtype === 'title'
      return false
    })
    .sort((a, b) => a.cost - b.cost)  // 値段の安い順
  const currentColor = user?.avatarColor ?? DEFAULT_AVATAR_COLOR

  // 装飾品：購入済み（使用済み含む）かどうか
  const cosmeticOwnedIds = new Set(
    userItems.filter((ui) => ui.category === 'cosmetic').map((ui) => ui.itemId)
  )

  // 特典：未使用の所持数 map
  const benefitUnusedCount = (itemId: string) =>
    userItems.filter((ui) => ui.category === 'benefit' && ui.itemId === itemId && !ui.usedAt).length

  const getQty = (itemId: string) => qty[itemId] ?? 1
  const setItemQty = (itemId: string, val: number) =>
    setQty((prev) => ({ ...prev, [itemId]: Math.max(1, Math.min(99, val)) }))

  const handleCosmeticPurchase = async (item: Item) => {
    if (!user) return
    setLoading(item.id)
    setMsg('')
    try {
      await purchaseItem(user.uid, item, user.ownedPoints ?? 0)
      if (item.avatarColor)  await equipAvatarColor(user.uid, item.avatarColor)
      if (item.decorationType === 'frame'   && item.frameStyle) await equipFrame(user.uid, item.frameStyle)
      if (item.decorationType === 'overlay' && item.overlayId)  await equipOverlay(user.uid, item.overlayId)
      setMsg(`「${item.name}」を購入しました！`)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '購入に失敗しました')
    } finally { setLoading(null) }
  }

  const handleBenefitPurchase = async (item: Item) => {
    if (!user) return
    const count = getQty(item.id)
    setLoading(item.id)
    setMsg('')
    try {
      await purchaseBenefitItem(user.uid, item, count, user.ownedPoints ?? 0)
      setMsg(`「${item.name}」を${count}枚購入しました！`)
      setItemQty(item.id, 1)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '購入に失敗しました')
    } finally { setLoading(null) }
  }

  const handleEquipCosmetic = async (item: Item) => {
    if (!user) return
    if (item.avatarColor)  await equipAvatarColor(user.uid, item.avatarColor)
    if (item.decorationType === 'frame'   && item.frameStyle) await equipFrame(user.uid, item.frameStyle)
    if (item.decorationType === 'overlay' && item.overlayId)  await equipOverlay(user.uid, item.overlayId)
    setMsg(`「${item.name}」を装備しました`)
  }

  if (!user) return null

  return (
    <AppShell title="ショップ">
      <div className="py-4 space-y-4">
        {/* 残高 */}
        <div className="bg-swan-card border border-swan-border rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-swan-sub text-sm">残高（保有）</span>
          <span className="font-bold flex items-center gap-1 text-swan-accent">
            <FeatherIcon />{(user.ownedPoints ?? 0).toLocaleString()}
          </span>
        </div>

        {/* タブ */}
        <div className="flex bg-swan-card rounded-xl p-1">
          {(['cosmetic', 'benefit'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                tab === t ? 'bg-swan-accent text-black' : 'text-swan-sub'
              }`}>
              {t === 'cosmetic' ? '装飾品' : '特典'}
            </button>
          ))}
        </div>

        {/* 装飾品サブタブ */}
        {tab === 'cosmetic' && (
          <div className="flex gap-1">
            {COSMETIC_SUBS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCosmeticSub(value)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  cosmeticSub === value
                    ? 'bg-swan-accent/20 text-swan-accent border-swan-accent/40'
                    : 'bg-swan-card text-swan-sub border-swan-border'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {msg && (
          <p className={`text-sm text-center px-4 py-2 rounded-lg ${
            msg.includes('失敗') || msg.includes('不足')
              ? 'text-red-400 bg-red-400/10'
              : 'text-green-400 bg-green-400/10'
          }`}>{msg}</p>
        )}

        {/* ── 装飾品リスト ── */}
        {tab === 'cosmetic' && (
          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <p className="text-center text-swan-sub py-12">アイテムはありません</p>
            )}
            {filteredItems.map((item) => {
              const owned = cosmeticOwnedIds.has(item.id)
              const canAfford = (user.ownedPoints ?? 0) >= item.cost
              const isColorItem = !!item.avatarColor
              const isEquipped = isColorItem && currentColor === item.avatarColor

              return (
                <div key={item.id} className={`bg-swan-card border rounded-xl overflow-hidden transition-colors ${
                  isEquipped ? 'border-swan-accent' : 'border-swan-border'
                }`}>
                  {item.imageUrl && (
                    <div className="w-full aspect-video bg-swan-muted overflow-hidden">
                      <img src={item.imageUrl} alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}
                  <div className="p-4">
                    {/* プレビュー */}
                    {(isColorItem || item.decorationType === 'frame' || item.decorationType === 'overlay') && (
                      <div className="flex justify-center mb-4 py-2">
                        <SwanAvatar
                          color={isColorItem ? item.avatarColor! : currentColor}
                          size={64}
                          frame={item.decorationType === 'frame' ? (item.frameStyle ?? undefined) : undefined}
                          overlay={item.decorationType === 'overlay' ? (item.overlayId ?? undefined) : undefined}
                        />
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-swan-text">{item.name}</h3>
                        {item.description && <p className="text-xs text-swan-sub mt-0.5">{item.description}</p>}
                        {isEquipped && (
                          <span className="inline-block text-xs text-swan-accent border border-swan-accent/30 px-2 py-0.5 rounded-full mt-1">装備中</span>
                        )}
                      </div>
                      <p className="font-bold text-swan-accent flex items-center gap-1 shrink-0 ml-3">
                        <FeatherIcon />{item.cost.toLocaleString()}
                      </p>
                    </div>
                    {owned ? (
                      isColorItem ? (
                        <button onClick={() => handleEquipCosmetic(item)} disabled={isEquipped}
                          className={`w-full py-2 rounded-lg text-sm font-medium ${
                            isEquipped ? 'bg-swan-muted text-swan-sub cursor-default'
                            : 'bg-swan-accent/20 text-swan-accent border border-swan-accent/40 hover:bg-swan-accent/30'
                          }`}>
                          {isEquipped ? '装備中' : '装備する'}
                        </button>
                      ) : (
                        <div className="text-xs text-swan-sub border border-swan-border rounded-lg px-3 py-2 text-center">
                          所持済み（永続）
                        </div>
                      )
                    ) : (
                      <button onClick={() => handleCosmeticPurchase(item)}
                        disabled={loading === item.id || !canAfford}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-opacity ${
                          canAfford ? 'bg-swan-accent text-black hover:opacity-90'
                          : 'bg-swan-muted text-swan-sub cursor-not-allowed'
                        } disabled:opacity-50`}>
                        {loading === item.id ? '処理中...' : canAfford ? '購入する' : 'ポイント不足'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── 特典リスト ── */}
        {tab === 'benefit' && (
          <div className="space-y-3">
            {filteredItems.length === 0 && (
              <p className="text-center text-swan-sub py-12">特典はありません</p>
            )}
            {filteredItems.map((item) => {
              const unusedCount = benefitUnusedCount(item.id)
              const count = getQty(item.id)
              const totalCost = item.cost * count
              const canAfford = (user.ownedPoints ?? 0) >= totalCost

              return (
                <div key={item.id} className="bg-swan-card border border-swan-border rounded-xl overflow-hidden">
                  {item.imageUrl && (
                    <div className="w-full aspect-video bg-swan-muted overflow-hidden">
                      <img src={item.imageUrl} alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-swan-text">{item.name}</h3>
                        {item.description && <p className="text-xs text-swan-sub mt-0.5">{item.description}</p>}
                      </div>
                      <p className="font-bold text-swan-accent flex items-center gap-1 shrink-0 ml-3">
                        <FeatherIcon />{item.cost.toLocaleString()} / 枚
                      </p>
                    </div>

                    {/* 所持枚数バッジ */}
                    {unusedCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                          {unusedCount}枚所持中
                        </span>
                      </div>
                    )}

                    {/* 数量セレクター + 購入ボタン */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setItemQty(item.id, count - 1)}
                        className="w-8 h-8 rounded-lg bg-swan-muted text-swan-sub flex items-center justify-center hover:bg-swan-border transition-colors">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-swan-text">{count}</span>
                      <button onClick={() => setItemQty(item.id, count + 1)}
                        className="w-8 h-8 rounded-lg bg-swan-muted text-swan-sub flex items-center justify-center hover:bg-swan-border transition-colors">
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => handleBenefitPurchase(item)}
                        disabled={loading === item.id || !canAfford}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-opacity ${
                          canAfford ? 'bg-swan-accent text-black hover:opacity-90'
                          : 'bg-swan-muted text-swan-sub cursor-not-allowed'
                        } disabled:opacity-50`}>
                        {loading === item.id
                          ? '処理中...'
                          : canAfford
                          ? `${count}枚購入（${totalCost.toLocaleString()}pt）`
                          : 'ポイント不足'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
