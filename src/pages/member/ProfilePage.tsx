import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { Shield, LogOut, Pencil, X, Check, BeginnerIcon, CreditCard, ChevronDown, ChevronUp } from '@/components/ui/Icons'
import { SwanAvatar, AVATAR_COLORS, DEFAULT_AVATAR_COLOR, AVATAR_VARIANT_DEFS } from '@/components/ui/SwanAvatar'
import { TitleBadge, type TitleTier } from '@/components/ui/TitleBadge'
import { AchievementIcon } from '@/components/ui/AchievementIcons'
import { CouponModal } from '@/components/ui/CouponModal'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribePointLogs,
  subscribeUserAchievements,
  subscribeUserItems,
  subscribeUserTitles,
  updateUser,
  isPlayerNameTaken,
  equipAvatarColor,
  equipTitle,
  unequipTitle,
  equipFrame,
  equipOverlay,
  equipPointIcon,
  equipAvatarVariant,
  subscribeItems,
} from '@/lib/firebase/firestore'
import { FRAME_DEFS, POINT_ICON_DEFS, DynamicPointIcon } from '@/components/ui/SwanAvatar'
import { logOut } from '@/lib/firebase/auth'
import type { PointLog, UserAchievement, UserItem, Item, UserTitle } from '@/types'
import { ACHIEVEMENTS } from '@/lib/achievements'

function generateProfilePuzzlePath(
  top: 'flat' | 'in' | 'out',
  right: 'flat' | 'in' | 'out',
  bottom: 'flat' | 'in' | 'out',
  left: 'flat' | 'in' | 'out'
): string {
  const tabSize = 12
  const tabOffset = 35
  let d = 'M 10 10 '
  if (top === 'flat') d += 'L 90 10 '
  else if (top === 'out') d += `L ${tabOffset} 10 Q ${tabOffset} ${10 - tabSize} 50 ${10 - tabSize} Q ${100 - tabOffset} ${10 - tabSize} ${100 - tabOffset} 10 L 90 10 `
  else d += `L ${tabOffset} 10 Q ${tabOffset} ${10 + tabSize} 50 ${10 + tabSize} Q ${100 - tabOffset} ${10 + tabSize} ${100 - tabOffset} 10 L 90 10 `
  if (right === 'flat') d += 'L 90 90 '
  else if (right === 'out') d += `L 90 ${tabOffset} Q ${90 + tabSize} ${tabOffset} ${90 + tabSize} 50 Q ${90 + tabSize} ${100 - tabOffset} 90 ${100 - tabOffset} L 90 90 `
  else d += `L 90 ${tabOffset} Q ${90 - tabSize} ${tabOffset} ${90 - tabSize} 50 Q ${90 - tabSize} ${100 - tabOffset} 90 ${100 - tabOffset} L 90 90 `
  if (bottom === 'flat') d += 'L 10 90 '
  else if (bottom === 'out') d += `L ${100 - tabOffset} 90 Q ${100 - tabOffset} ${90 + tabSize} 50 ${90 + tabSize} Q ${tabOffset} ${90 + tabSize} ${tabOffset} 90 L 10 90 `
  else d += `L ${100 - tabOffset} 90 Q ${100 - tabOffset} ${90 - tabSize} 50 ${90 - tabSize} Q ${tabOffset} ${90 - tabSize} ${tabOffset} 90 L 10 90 `
  if (left === 'flat') d += 'L 10 10'
  else if (left === 'out') d += `L 10 ${100 - tabOffset} Q ${10 - tabSize} ${100 - tabOffset} ${10 - tabSize} 50 Q ${10 - tabSize} ${tabOffset} 10 ${tabOffset} L 10 10`
  else d += `L 10 ${100 - tabOffset} Q ${10 + tabSize} ${100 - tabOffset} ${10 + tabSize} 50 Q ${10 + tabSize} ${tabOffset} 10 ${tabOffset} L 10 10`
  return d + ' Z'
}

// 装飾選択UI 共通コンポーネント
const DecoSection = ({
  label, noneLabel, current, options, onSelect, renderPreview,
}: {
  label: string
  noneLabel: string
  current: string | null
  options: [string, { name: string }][]
  onSelect: (key: string | null) => void
  renderPreview: (key: string) => React.ReactNode
}) => {
  // 重複除去
  const unique = [...new Map(options).entries()]
  if (unique.length === 0) return null
  return (
    <div>
      <p className="text-xs text-swan-sub mb-2 font-medium">{label}</p>
      <div className="space-y-1.5">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
            current === null ? 'border-swan-accent bg-swan-accent/10 text-swan-accent' : 'border-swan-border text-swan-sub'
          }`}
        >
          {noneLabel}
        </button>
        {unique.map(([key, def]) => (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
              current === key ? 'border-swan-accent bg-swan-accent/10' : 'border-swan-border'
            }`}
          >
            {renderPreview(key)}
            <span className="text-sm">{def.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export const ProfilePage = () => {
  const { user } = useAuth()
  const [pointLogs, setPointLogs] = useState<PointLog[]>([])
  const [achievements, setAchievements] = useState<UserAchievement[]>([])
  const [userItems, setUserItems] = useState<UserItem[]>([])
  const [allItems, setAllItems] = useState<Item[]>([])
  const [userTitles, setUserTitles] = useState<UserTitle[]>([])

  // 編集フォーム状態
  const [editing, setEditing] = useState(false)
  const [playerName, setPlayerName] = useState('')
  const [bio, setBio] = useState('')
  const [isBeginner, setIsBeginner] = useState(false)
  const [editColor, setEditColor] = useState(DEFAULT_AVATAR_COLOR)
  const [editTitle, setEditTitle] = useState<string | null>(null)
  const [editTitleTier, setEditTitleTier] = useState<TitleTier>('common')
  const [editFrame, setEditFrame] = useState<string | null>(null)
  const [editOverlay, setEditOverlay] = useState<string | null>(null)
  const [editPointIcon, setEditPointIcon] = useState<string>('feather')
  const [editVariant, setEditVariant] = useState<string>('default')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [presentingItem, setPresentingItem] = useState<{ ui: UserItem; item?: Item } | null>(null)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  useEffect(() => {
    if (!user) return
    const u1 = subscribePointLogs(user.uid, setPointLogs)
    const u2 = subscribeUserAchievements(user.uid, setAchievements)
    const u3 = subscribeUserItems(user.uid, setUserItems)
    const u4 = subscribeItems(setAllItems)
    const u5 = subscribeUserTitles(user.uid, setUserTitles)
    return () => { u1(); u2(); u3(); u4(); u5() }
  }, [user])

  const openEdit = () => {
    if (!user) return
    setPlayerName(user.playerName)
    setBio(user.bio)
    setIsBeginner(user.isBeginner)
    setEditColor(user.avatarColor ?? DEFAULT_AVATAR_COLOR)
    setEditTitle(user.equippedTitle ?? null)
    setEditTitleTier(user.equippedTitleTier ?? 'common')
    setEditFrame(user.equippedFrame ?? null)
    setEditOverlay(user.equippedOverlay ?? null)
    setEditPointIcon(user.equippedPointIcon ?? 'feather')
    setEditVariant(user.avatarVariant ?? 'default')
    setSaveError('')
    setEditing(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaveError('')
    const trimmed = playerName.trim()
    if (!trimmed) { setSaveError('プレイヤーネームを入力してください'); return }
    if (trimmed !== user.playerName) {
      const taken = await isPlayerNameTaken(trimmed)
      if (taken) { setSaveError('このプレイヤーネームは既に使用されています'); return }
    }
    setSaving(true)
    try {
      await updateUser(user.uid, { playerName: trimmed, bio: bio.slice(0, 100), isBeginner })
      if (editColor !== user.avatarColor) await equipAvatarColor(user.uid, editColor)
      if (editTitle !== (user.equippedTitle ?? null) || editTitleTier !== (user.equippedTitleTier ?? 'common')) {
        if (editTitle) await equipTitle(user.uid, editTitle, editTitleTier)
        else await unequipTitle(user.uid)
      }
      if (editFrame !== (user.equippedFrame ?? null)) await equipFrame(user.uid, editFrame)
      if (editOverlay !== (user.equippedOverlay ?? null)) await equipOverlay(user.uid, editOverlay)
      if (editPointIcon !== (user.equippedPointIcon ?? 'feather')) {
        await equipPointIcon(user.uid, editPointIcon === 'feather' ? null : editPointIcon)
      }
      if (editVariant !== (user.avatarVariant ?? 'default')) {
        await equipAvatarVariant(user.uid, editVariant === 'default' ? null : editVariant)
      }
      setEditing(false)
    } catch {
      setSaveError('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 未使用の特典のみ（itemId ごとにグループ化して枚数表示）
  const unusedBenefitItems = userItems.filter((ui) => ui.category === 'benefit' && !ui.usedAt)
  // itemId → 未使用枚数の map
  const benefitCountMap = unusedBenefitItems.reduce<Record<string, number>>((acc, ui) => {
    acc[ui.itemId] = (acc[ui.itemId] ?? 0) + 1
    return acc
  }, {})
  // 重複なしの itemId 一覧
  const uniqueBenefitItemIds = [...new Set(unusedBenefitItems.map((ui) => ui.itemId))]
  // 購入済みアイテムを Firestore item と突き合わせる
  const purchasedItems = userItems
    .map((ui) => allItems.find((i) => i.id === ui.itemId))
    .filter(Boolean) as typeof allItems

  // ③ カラー：avatarColor HEX値で照合（item.id ≠ AVATAR_COLORS[].id なので HEX照合が正しい）
  const ownedColorHexes = new Set(
    purchasedItems.filter((i) => i.itemSubtype === 'avatar_color' && i.avatarColor).map((i) => i.avatarColor!)
  )
  const availableColors = [
    { id: 'default', name: 'デフォルト（ピンク）', color: DEFAULT_AVATAR_COLOR, owned: true },
    ...AVATAR_COLORS.map((c) => ({ ...c, owned: ownedColorHexes.has(c.color) })),
    // ショップに追加されたカスタムカラーも表示（AVATAR_COLORS にない色）
    ...purchasedItems
      .filter((i) => i.itemSubtype === 'avatar_color' && i.avatarColor && !AVATAR_COLORS.some((ac) => ac.color === i.avatarColor))
      .map((i) => ({ id: i.id, name: i.name, color: i.avatarColor!, owned: true })),
  ]

  // ② フレーム：decorationType === 'frame' のアイテムで照合
  const ownedFrameKeys = [...new Set(
    purchasedItems.filter((i) => i.decorationType === 'frame' && i.frameStyle).map((i) => i.frameStyle!)
  )].filter((k) => FRAME_DEFS[k])

  // ポイントアイコン：購入済みアイコンID一覧
  const ownedPointIconIds = [...new Set(
    purchasedItems.filter((i) => i.itemSubtype === 'point_icon' && i.pointIconId).map((i) => i.pointIconId!)
  )].filter((k) => POINT_ICON_DEFS[k])

  // アバターバリエーション：購入済みバリエーションID一覧
  const ownedVariantIds = [...new Set(
    purchasedItems.filter((i) => i.itemSubtype === 'avatar_variant' && i.avatarVariant).map((i) => i.avatarVariant!)
  )].filter((k) => AVATAR_VARIANT_DEFS[k])

  // カスタムハンド称号：userItems の customValue を持つものを取得
  const customHandTitles = userItems
    .filter((ui) => {
      const item = allItems.find((i) => i.id === ui.itemId)
      return item?.itemSubtype === 'custom_hand_title' && ui.customValue
    })
    .map((ui) => {
      const item = allItems.find((i) => i.id === ui.itemId)
      return {
        key: `custom-${ui.id}`,
        title: `マイハンドは"${ui.customValue}"`,
        tier: (item?.titleTier ?? 'common') as TitleTier,
        source: 'shop' as const,
      }
    })

  // 称号：ショップ購入 + 実績報酬 + カスタムハンド称号をまとめる
  const ownedTitleItems = purchasedItems.filter((i) => i.itemSubtype === 'title')
  // 全所持称号リスト（重複タイトルテキストは除去）
  const allOwnedTitles: { key: string; title: string; tier: TitleTier; source: 'shop' | 'achievement' }[] = [
    ...ownedTitleItems.map((i) => ({
      key: `shop-${i.id}`,
      title: i.name,
      tier: (i.titleTier ?? 'common') as TitleTier,
      source: 'shop' as const,
    })),
    ...userTitles.map((t) => ({
      key: `ach-${t.id}`,
      title: t.title,
      tier: t.tier as TitleTier,
      source: 'achievement' as const,
    })),
    ...customHandTitles,
  ]
  // 同じタイトルテキストの重複を除去
  const dedupedTitles = allOwnedTitles.filter(
    (t, i, arr) => arr.findIndex((x) => x.title === t.title) === i
  )
  // 現在装備中の称号がリストにない場合（旧コードで直接書き込まれた場合）も選択肢に追加
  if (user?.equippedTitle && !dedupedTitles.some((t) => t.title === user.equippedTitle)) {
    dedupedTitles.push({
      key: 'equipped-legacy',
      title: user.equippedTitle,
      tier: (user.equippedTitleTier ?? 'common') as TitleTier,
      source: 'achievement',
    })
  }

  if (!user) return null

  const currentColor = user.avatarColor ?? DEFAULT_AVATAR_COLOR

  return (
    <AppShell title="マイページ">
      <div className="py-4 space-y-5">

        {/* ── プロフィールカード ── */}
        {!editing ? (
          <div className="bg-swan-card border border-swan-border rounded-xl p-4">
            <div className="flex items-center gap-4 mb-3">
              <SwanAvatar color={currentColor} size={64} frame={user.equippedFrame} variant={user.avatarVariant} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h2 className="text-lg font-bold flex items-center gap-2 truncate">
                    {user.playerName}
                    {user.isBeginner && <BeginnerIcon size={16} />}
                  </h2>
                  <button
                    onClick={openEdit}
                    className="shrink-0 text-swan-accent border border-swan-accent/30 px-3 py-1 rounded-lg flex items-center gap-1 text-xs"
                  >
                    <Pencil size={12} /> 編集
                  </button>
                </div>
                {/* 称号 */}
                {user.equippedTitle && (
                  <div className="mb-1">
                    <TitleBadge title={user.equippedTitle} tier={user.equippedTitleTier ?? 'common'} />
                  </div>
                )}
                {user.bio && <p className="text-swan-sub text-xs truncate">{user.bio}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 pt-3 border-t border-swan-border">
              <div>
                <p className="text-xs text-swan-sub">累計</p>
                <p className="font-bold text-sm flex items-center gap-0.5"><FeatherIcon size={11} />{user.totalPoints.toLocaleString()}</p>
              </div>
              <div className="w-px h-5 bg-swan-border" />
              <div>
                <p className="text-xs text-swan-sub">年間</p>
                <p className="font-bold text-sm flex items-center gap-0.5"><FeatherIcon size={11} />{user.yearPoints.toLocaleString()}</p>
              </div>
              <div className="w-px h-5 bg-swan-border" />
              <div>
                <p className="text-xs text-swan-sub">保有</p>
                <p className="font-bold text-sm flex items-center gap-0.5 text-swan-accent"><FeatherIcon size={11} />{(user.ownedPoints ?? 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ) : (
          /* ── 編集フォーム ── */
          <div className="bg-swan-card border border-swan-accent/40 rounded-xl p-4 space-y-4">
            <h3 className="font-semibold text-sm text-swan-accent">プロフィール編集</h3>

            {/* 基本情報 */}
            <div className="space-y-2">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                placeholder="プレイヤーネーム"
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-swan-text focus:outline-none focus:border-swan-accent text-sm"
              />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={100}
                rows={2}
                placeholder="ひとこと（100文字以内）"
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-swan-text focus:outline-none focus:border-swan-accent text-sm resize-none"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setIsBeginner(!isBeginner)}
                  className={`w-10 h-5 rounded-full transition-colors relative ${isBeginner ? 'bg-swan-accent' : 'bg-swan-muted'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isBeginner ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-xs">初心者マーク</span>
              </label>
            </div>

            {/* アイコンカラー */}
            <div>
              <p className="text-xs text-swan-sub mb-2 font-medium">アイコンカラー</p>
              {/* プレビュー */}
              <div className="flex items-center gap-3 mb-2">
                <SwanAvatar color={editColor} size={52} frame={editFrame ?? undefined} variant={editVariant} />
                <span className="text-xs text-swan-sub">プレビュー</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {availableColors.filter((c) => c.owned).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setEditColor(c.color)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border transition-colors ${
                      editColor === c.color
                        ? 'border-swan-accent bg-swan-accent/10'
                        : 'border-swan-border bg-swan-black hover:border-swan-accent/50'
                    }`}
                  >
                    <SwanAvatar color={c.color} size={32} showCard={false} />
                    <span className="text-[9px] text-swan-sub leading-tight text-center">{c.name}</span>
                  </button>
                ))}
              </div>
              {availableColors.filter((c) => c.owned).length < availableColors.length && (
                <Link to="/shop" onClick={() => setEditing(false)} className="text-xs text-swan-accent mt-1 block">
                  ショップでカラーを追加 →
                </Link>
              )}
            </div>

            {/* 称号 */}
            <div>
              <p className="text-xs text-swan-sub mb-2 font-medium">称号</p>
              {dedupedTitles.length === 0 ? (
                <p className="text-xs text-swan-sub">まだ称号を所持していません</p>
              ) : (
                <div className="space-y-1.5">
                  <button
                    onClick={() => setEditTitle(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                      editTitle === null
                        ? 'border-swan-accent bg-swan-accent/10 text-swan-text'
                        : 'border-swan-border text-swan-sub'
                    }`}
                  >
                    称号なし
                  </button>
                  {dedupedTitles.map((t) => {
                    const active = editTitle === t.title
                    return (
                      <button
                        key={t.key}
                        onClick={() => { setEditTitle(t.title); setEditTitleTier(t.tier) }}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between ${
                          active ? 'border-swan-accent bg-swan-accent/10' : 'border-swan-border'
                        }`}
                      >
                        <TitleBadge title={t.title} tier={t.tier} />
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          <span className="text-xs text-swan-sub">{t.tier.toUpperCase()}</span>
                          {t.source === 'achievement' && (
                            <span className="text-[9px] text-purple-400 border border-purple-400/40 px-1 py-0.5 rounded">実績</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ② フレーム選択（購入済みフレームのみ表示） */}
            {ownedFrameKeys.length > 0 && (
              <DecoSection
                label="フレーム"
                noneLabel="フレームなし"
                current={editFrame}
                options={ownedFrameKeys.map((k) => [k, FRAME_DEFS[k]] as [string, typeof FRAME_DEFS[string]])}
                onSelect={setEditFrame}
                renderPreview={(key) => (
                  <SwanAvatar color={editColor} size={36} frame={key} />
                )}
              />
            )}

            {/* ポイントアイコン選択（購入済みアイコンのみ表示） */}
            {ownedPointIconIds.length > 0 && (
              <div>
                <p className="text-xs text-swan-sub mb-2 font-medium">ポイントアイコン</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setEditPointIcon('feather')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                      editPointIcon === 'feather' ? 'border-swan-accent bg-swan-accent/10' : 'border-swan-border'
                    }`}
                  >
                    <DynamicPointIcon iconId="feather" size={20} />
                    <span className="text-sm">羽（デフォルト）</span>
                  </button>
                  {ownedPointIconIds.map((iconId) => {
                    const def = POINT_ICON_DEFS[iconId]
                    return (
                      <button
                        key={iconId}
                        onClick={() => setEditPointIcon(iconId)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                          editPointIcon === iconId ? 'border-swan-accent bg-swan-accent/10' : 'border-swan-border'
                        }`}
                      >
                        <DynamicPointIcon iconId={iconId} size={20} />
                        <span className="text-sm">{def.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* アバターバリエーション選択（購入済みバリエーションのみ表示） */}
            {ownedVariantIds.length > 0 && (
              <div>
                <p className="text-xs text-swan-sub mb-2 font-medium">アイコンイラスト</p>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setEditVariant('default')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                      editVariant === 'default' ? 'border-swan-accent bg-swan-accent/10' : 'border-swan-border'
                    }`}
                  >
                    <SwanAvatar color={editColor} size={32} variant="default" />
                    <span className="text-sm">オリジナル（デフォルト）</span>
                  </button>
                  {ownedVariantIds.map((variantId) => {
                    const def = AVATAR_VARIANT_DEFS[variantId]
                    return (
                      <button
                        key={variantId}
                        onClick={() => setEditVariant(variantId)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                          editVariant === variantId ? 'border-swan-accent bg-swan-accent/10' : 'border-swan-border'
                        }`}
                      >
                        <SwanAvatar color={editColor} size={32} variant={variantId} />
                        <span className="text-sm">{def.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-swan-accent text-black font-bold py-2.5 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-1"
              >
                <Check size={14} /> {saving ? '保存中...' : '保存する'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 bg-swan-muted text-swan-sub py-2.5 rounded-xl text-sm flex items-center justify-center gap-1"
              >
                <X size={14} /> キャンセル
              </button>
            </div>
          </div>
        )}

        {/* 所持特典（未使用のみ・itemIdごとにまとめて枚数表示） */}
        {uniqueBenefitItemIds.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-swan-sub mb-2">所持中の特典</h3>
            <div className="space-y-2">
              {uniqueBenefitItemIds.map((itemId) => {
                const item = allItems.find((i) => i.id === itemId)
                const count = benefitCountMap[itemId] ?? 0
                // 使用するためにその itemId の未使用 userItem を1つ取得
                const unusedUi = unusedBenefitItems.find((ui) => ui.itemId === itemId)!
                return (
                  <div key={itemId} className="bg-swan-card border border-swan-border rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium flex items-center gap-2">
                          {item?.name ?? itemId}
                          <span className="text-xs font-bold text-swan-accent bg-swan-accent/10 border border-swan-accent/30 px-1.5 py-0.5 rounded-full">
                            {count}枚
                          </span>
                        </p>
                        {item?.description && <p className="text-xs text-swan-sub mt-0.5">{item.description}</p>}
                      </div>
                      <button
                        onClick={() => setPresentingItem({ ui: unusedUi, item })}
                        className="ml-3 shrink-0 text-xs font-bold bg-swan-accent text-black px-3 py-1.5 rounded-lg hover:opacity-90"
                      >
                        使用する
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 特典クーポンモーダル */}
        {presentingItem && (
          <CouponModal
            ui={presentingItem.ui}
            item={presentingItem.item}
            playerName={user.playerName}
            onClose={() => setPresentingItem(null)}
          />
        )}

        {/* 実績パズル */}
        <div className="bg-swan-card border border-swan-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-swan-sub">実績 ({achievements.length}/{ACHIEVEMENTS.length})</h3>
            <Link to="/achievements" className="text-xs text-swan-accent">すべて見る</Link>
          </div>
          <div className="grid grid-cols-5 gap-0" style={{ margin: '-4px' }}>
            {ACHIEVEMENTS.slice(0, 20).map((def, index) => {
              const unlocked = achievements.find((ua) => ua.achievementId === def.id)
              const row = Math.floor(index / 5)
              const col = index % 5
              const hasTop = row > 0
              const hasBottom = row < 3
              const hasLeft = col > 0
              const hasRight = col < 4
              const topType = hasTop ? ((row + col + 1) % 2 === 0 ? 'in' : 'out') : 'flat'
              const bottomType = hasBottom ? ((row + col) % 2 === 0 ? 'out' : 'in') : 'flat'
              const leftType = hasLeft ? ((row + col + 1) % 2 === 0 ? 'in' : 'out') : 'flat'
              const rightType = hasRight ? ((row + col) % 2 === 0 ? 'out' : 'in') : 'flat'
              const PUZZLE_COLORS = ['#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6', '#f97316']
              const color = PUZZLE_COLORS[index % PUZZLE_COLORS.length]
              return (
                <div
                  key={def.id}
                  className="relative aspect-square"
                  title={unlocked ? def.name : '???'}
                  style={{ filter: !unlocked ? 'grayscale(100%) brightness(0.4)' : 'none' }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <defs>
                      <clipPath id={`profile-puzzle-${index}`}>
                        <path d={generateProfilePuzzlePath(topType, rightType, bottomType, leftType)} />
                      </clipPath>
                    </defs>
                    <rect x="0" y="0" width="100" height="100" fill={unlocked ? color : '#374151'} clipPath={`url(#profile-puzzle-${index})`} />
                    <path d={generateProfilePuzzlePath(topType, rightType, bottomType, leftType)} fill="none" stroke={unlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'} strokeWidth="2" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {unlocked ? (
                      <AchievementIcon achievementId={def.id} size={18} />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-swan-border/50" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-swan-muted mt-2 text-center">
            {achievements.length === 0 ? '実績を解除してパズルを埋めよう！' : `あと${ACHIEVEMENTS.length - achievements.length}個で全解除！`}
          </p>
        </div>

        {/* ポイント履歴（折りたたみ） */}
        <div className="bg-swan-card border border-swan-border rounded-xl overflow-hidden">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-swan-dark/50 transition-colors"
          >
            <span className="text-sm font-semibold text-swan-sub">
              ポイント履歴 {pointLogs.length > 0 && `(${pointLogs.length}件)`}
            </span>
            {historyExpanded ? (
              <ChevronUp size={18} className="text-swan-sub" />
            ) : (
              <ChevronDown size={18} className="text-swan-sub" />
            )}
          </button>
          {historyExpanded && (
            <div className="border-t border-swan-border">
              {pointLogs.length === 0 ? (
                <p className="text-swan-sub text-sm px-4 py-3">履歴はありません</p>
              ) : (
                <div className="divide-y divide-swan-border">
                  {pointLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-center px-4 py-3">
                      <div>
                        <p className="text-sm">{log.description}</p>
                        <p className="text-xs text-swan-sub">{log.createdAt?.toDate().toLocaleDateString('ja-JP')}</p>
                      </div>
                      <p className={`font-bold text-sm flex items-center gap-1 ${log.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {log.amount >= 0 ? '+' : ''}{log.amount.toLocaleString()} <FeatherIcon />
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 会員証へのリンク */}
        <Link
          to="/card"
          className="flex items-center justify-center gap-2 w-full border border-swan-border text-swan-sub py-3 rounded-xl text-sm hover:border-swan-accent hover:text-swan-accent transition-colors"
        >
          <CreditCard size={16} />
          会員証を表示
        </Link>

        {/* 管理パネル（管理者のみ） */}
        {user.role === 'admin' && (
          <Link
            to="/admin"
            className="flex items-center justify-center gap-2 w-full border border-red-500/40 text-red-400 bg-red-500/10 py-3 rounded-xl text-sm font-medium hover:bg-red-500/20 transition-colors"
          >
            <Shield size={16} /> 管理パネルへ
          </Link>
        )}

        <button
          onClick={() => logOut()}
          className="w-full border border-swan-border text-swan-sub py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:border-red-400 hover:text-red-400 transition-colors"
        >
          <LogOut size={15} /> ログアウト
        </button>
      </div>
    </AppShell>
  )
}
