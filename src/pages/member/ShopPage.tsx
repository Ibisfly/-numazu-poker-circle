import { useEffect, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { SwanAvatar, DEFAULT_AVATAR_COLOR, DynamicPointIcon } from '@/components/ui/SwanAvatar'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeItems, subscribeUserItems,
  purchaseItem, purchaseBenefitItem, equipAvatarColor, equipFrame, equipOverlay,
  equipPointIcon, equipAvatarVariant, purchaseCustomHandTitle,
} from '@/lib/firebase/firestore'
import type { Item, UserItem } from '@/types'
import { Plus, Minus } from '@/components/ui/Icons'

type Tab = 'cosmetic' | 'benefit'
type CosmeticSub = 'avatar_color' | 'avatar_decoration' | 'avatar_variant' | 'title' | 'custom_hand_title'

const COSMETIC_SUBS: { value: CosmeticSub; label: string }[] = [
  { value: 'avatar_color',      label: '背景' },
  { value: 'avatar_decoration', label: '装飾' },
  { value: 'avatar_variant',    label: 'アイコン' },
  { value: 'title',             label: '称号' },
  { value: 'custom_hand_title', label: 'ハンド称号' },
]

export const ShopPage = () => {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('cosmetic')
  const [cosmeticSub, setCosmeticSub] = useState<CosmeticSub>('avatar_color')
  const [items, setItems] = useState<Item[]>([])
  const [userItems, setUserItems] = useState<UserItem[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const [qty, setQty] = useState<Record<string, number>>({})
  const [handTitleItem, setHandTitleItem] = useState<Item | null>(null)
  const [handInput, setHandInput] = useState('')

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
      if (cosmeticSub === 'avatar_variant')    return i.itemSubtype === 'avatar_variant'
      if (cosmeticSub === 'title')             return i.itemSubtype === 'title'
      if (cosmeticSub === 'custom_hand_title') return i.itemSubtype === 'custom_hand_title'
      return false
    })
    .sort((a, b) => a.cost - b.cost)
  const currentColor = user?.avatarColor ?? DEFAULT_AVATAR_COLOR
  const currentPointIcon = user?.equippedPointIcon ?? 'feather'

  const ownedHandTitles = userItems.filter(
    (ui) => ui.category === 'cosmetic' && ui.customValue
  )

  const cosmeticOwnedIds = new Set(
    userItems.filter((ui) => ui.category === 'cosmetic').map((ui) => ui.itemId)
  )

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
      if (item.itemSubtype === 'point_icon' && item.pointIconId) await equipPointIcon(user.uid, item.pointIconId)
      if (item.itemSubtype === 'avatar_variant' && item.avatarVariant) await equipAvatarVariant(user.uid, item.avatarVariant)
      setMsg(`「${item.name}」を購入しました！`)
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : '購入に失敗しました')
    } finally { setLoading(null) }
  }

  const handleCustomHandPurchase = async () => {
    if (!user || !handTitleItem) return
    setLoading(handTitleItem.id)
    setMsg('')
    try {
      await purchaseCustomHandTitle(user.uid, handTitleItem, handInput, user.ownedPoints ?? 0)
      setMsg(`マイハンドは"${handInput.toUpperCase()}" を購入しました！`)
      setHandTitleItem(null)
      setHandInput('')
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
    if (item.itemSubtype === 'point_icon' && item.pointIconId) await equipPointIcon(user.uid, item.pointIconId)
    if (item.itemSubtype === 'avatar_variant' && item.avatarVariant) await equipAvatarVariant(user.uid, item.avatarVariant)
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
          {([
            { key: 'cosmetic', label: '装飾品' },
            { key: 'benefit', label: '特典' },
          ] as { key: Tab; label: string }[]).map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${
                tab === key ? 'bg-swan-accent text-black' : 'text-swan-sub'
              }`}>
              {label}
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
            {cosmeticSub === 'custom_hand_title' && ownedHandTitles.length > 0 && (
              <div className="bg-swan-card border border-green-500/30 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-green-400 mb-2">所持中のハンド称号</h3>
                <div className="flex flex-wrap gap-2">
                  {ownedHandTitles.map((ui) => (
                    <span key={ui.id} className="text-sm bg-green-500/10 text-green-400 border border-green-500/30 px-3 py-1 rounded-full">
                      マイハンドは"{ui.customValue}"
                    </span>
                  ))}
                </div>
              </div>
            )}

            {filteredItems.length === 0 && (
              <p className="text-center text-swan-sub py-12">アイテムはありません</p>
            )}
            {filteredItems.map((item) => {
              const owned = cosmeticOwnedIds.has(item.id)
              const canAfford = (user.ownedPoints ?? 0) >= item.cost
              const isColorItem = !!item.avatarColor
              const isPointIconItem = item.itemSubtype === 'point_icon'
              const isFrameItem = item.decorationType === 'frame'
              const isCustomHandItem = item.itemSubtype === 'custom_hand_title'
              const isVariantItem = item.itemSubtype === 'avatar_variant' && !!item.avatarVariant
              const isEquippedColor = isColorItem && currentColor === item.avatarColor
              const isEquippedIcon = isPointIconItem && item.pointIconId === currentPointIcon
              const isEquippedFrame = isFrameItem && item.frameStyle === user?.equippedFrame
              const isEquippedVariant = isVariantItem && item.avatarVariant === (user?.avatarVariant ?? 'default')
              const isEquipped = isEquippedColor || isEquippedIcon || isEquippedFrame || isEquippedVariant
              const canEquip = isColorItem || isPointIconItem || isFrameItem || isVariantItem

              return (
                <div key={item.id} className={`bg-swan-card border rounded-xl overflow-hidden transition-colors ${
                  isEquipped ? 'border-swan-accent' : 'border-swan-border'
                }`}>
                  {/* アイコンイラスト商品は下のアバタープレビューで見せるためバナーは出さない */}
                  {item.imageUrl && !isVariantItem && (
                    <div className="w-full aspect-video bg-swan-muted overflow-hidden">
                      <img src={item.imageUrl} alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>
                  )}
                  <div className="p-4">
                    {(isColorItem || isFrameItem || item.decorationType === 'overlay') && (
                      <div className="flex justify-center mb-4 py-2">
                        <SwanAvatar
                          color={isColorItem ? item.avatarColor! : currentColor}
                          size={64}
                          frame={isFrameItem ? (item.frameStyle ?? undefined) : undefined}
                          overlay={item.decorationType === 'overlay' ? (item.overlayId ?? undefined) : undefined}
                        />
                      </div>
                    )}
                    {isVariantItem && (
                      <div className="flex justify-center mb-4 py-2">
                        <SwanAvatar color={currentColor} size={64} variant={item.avatarVariant!} />
                      </div>
                    )}
                    {isPointIconItem && item.pointIconId && (
                      <div className="flex justify-center mb-4 py-2">
                        <div className="bg-swan-dark rounded-full p-4 inline-flex items-center gap-2">
                          <DynamicPointIcon iconId={item.pointIconId} size={32} />
                          <span className="text-swan-accent font-bold text-xl">1,000</span>
                        </div>
                      </div>
                    )}
                    {isCustomHandItem && (
                      <div className="flex justify-center mb-4 py-2">
                        <div className="text-lg font-medium text-amber-400">
                          マイハンドは"<span className="font-bold">AA</span>"
                        </div>
                      </div>
                    )}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-swan-text">{item.name}</h3>
                        {item.description && <p className="text-xs text-swan-sub mt-0.5">{item.description}</p>}
                        {isEquipped && (
                          <span className="inline-block text-xs text-swan-accent border border-swan-accent/30 px-2 py-0.5 rounded-full mt-1">装備中</span>
                        )}
                        {isCustomHandItem && (
                          <p className="text-xs text-amber-400 mt-1">※ 購入ごとに好きなハンドを設定可能</p>
                        )}
                      </div>
                      <p className="font-bold text-swan-accent flex items-center gap-1 shrink-0 ml-3">
                        <FeatherIcon />{item.cost.toLocaleString()}
                      </p>
                    </div>
                    {isCustomHandItem ? (
                      <button
                        onClick={() => { setHandTitleItem(item); setHandInput('') }}
                        disabled={loading === item.id || !canAfford}
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-opacity ${
                          canAfford ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-swan-muted text-swan-sub cursor-not-allowed'
                        } disabled:opacity-50`}>
                        {loading === item.id ? '処理中...' : canAfford ? 'ハンドを選んで購入' : 'ポイント不足'}
                      </button>
                    ) : owned ? (
                      canEquip ? (
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

                    {unusedCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                          {unusedCount}枚所持中
                        </span>
                      </div>
                    )}

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

      {/* カスタムハンド称号入力ダイアログ */}
      {handTitleItem && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-6">
          <div className="bg-swan-dark border border-amber-500/30 rounded-2xl p-6 w-full max-w-xs space-y-4">
            <h3 className="font-bold text-amber-400 text-center">マイハンドを入力</h3>
            <p className="text-xs text-swan-sub text-center">
              好きなポーカーハンドを入力してください<br />
              例: AA, KQs, T9o, 87s
            </p>
            <input
              type="text"
              value={handInput}
              onChange={(e) => setHandInput(e.target.value.toUpperCase())}
              placeholder="例: AA"
              maxLength={5}
              className="w-full bg-swan-card border border-swan-border rounded-lg px-4 py-3 text-center text-xl font-bold text-swan-text tracking-widest focus:outline-none focus:border-amber-500"
              autoFocus
            />
            {handInput && (
              <div className="text-center py-2">
                <span className="text-amber-400 font-medium">
                  マイハンドは"<span className="font-bold">{handInput}</span>"
                </span>
              </div>
            )}
            <p className="text-xs text-swan-sub text-center flex items-center justify-center gap-1">
              価格: <FeatherIcon />{handTitleItem.cost.toLocaleString()}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setHandTitleItem(null); setHandInput('') }}
                className="flex-1 bg-swan-muted text-swan-sub py-2.5 rounded-xl text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={handleCustomHandPurchase}
                disabled={loading === handTitleItem.id || !handInput.trim()}
                className="flex-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 font-medium py-2.5 rounded-xl text-sm disabled:opacity-50"
              >
                {loading === handTitleItem.id ? '処理中...' : '購入する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
