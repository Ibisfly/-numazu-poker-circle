import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { Shield, LogOut, Pencil, X, Check, Award, BeginnerIcon, CreditCard } from '@/components/ui/Icons'
import { SwanAvatar, AVATAR_COLORS, DEFAULT_AVATAR_COLOR } from '@/components/ui/SwanAvatar'
import { TitleBadge, type TitleTier } from '@/components/ui/TitleBadge'
import { CouponModal } from '@/components/ui/CouponModal'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribePointLogs,
  subscribeUserAchievements,
  subscribeUserItems,
  updateUser,
  isPlayerNameTaken,
  equipAvatarColor,
  equipTitle,
  unequipTitle,
  equipFrame,
  equipOverlay,
} from '@/lib/firebase/firestore'
import { FRAME_DEFS, OVERLAY_DEFS } from '@/components/ui/SwanAvatar'
import { logOut } from '@/lib/firebase/auth'
import type { PointLog, UserAchievement, UserItem, Item } from '@/types'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { subscribeItems } from '@/lib/firebase/firestore'

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
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [presentingItem, setPresentingItem] = useState<{ ui: UserItem; item?: Item } | null>(null)

  useEffect(() => {
    if (!user) return
    const u1 = subscribePointLogs(user.uid, setPointLogs)
    const u2 = subscribeUserAchievements(user.uid, setAchievements)
    const u3 = subscribeUserItems(user.uid, setUserItems)
    const u4 = subscribeItems(setAllItems)
    return () => { u1(); u2(); u3(); u4() }
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
  const ownedItemIds = new Set(userItems.map((ui) => ui.itemId))

  // 購入済みカラーアイテム
  const availableColors = [
    { id: 'default', name: 'デフォルト（ピンク）', color: DEFAULT_AVATAR_COLOR, owned: true },
    ...AVATAR_COLORS.map((c) => ({ ...c, owned: ownedItemIds.has(c.id) })),
  ]

  // 購入済み称号アイテム
  const ownedTitleItems = allItems.filter(
    (i) => i.itemSubtype === 'title' && ownedItemIds.has(i.id)
  )

  if (!user) return null

  const currentColor = user.avatarColor ?? DEFAULT_AVATAR_COLOR

  return (
    <AppShell title="マイページ">
      <div className="py-4 space-y-5">

        {/* ── プロフィールカード ── */}
        {!editing ? (
          <div className="bg-swan-card border border-swan-border rounded-xl p-4">
            <div className="flex items-center gap-4 mb-3">
              <SwanAvatar color={currentColor} size={64} showCard />
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
                <SwanAvatar color={editColor} size={52} frame={editFrame ?? undefined} overlay={editOverlay ?? undefined} />
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
              {ownedTitleItems.length === 0 ? (
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
                  {ownedTitleItems.map((item) => {
                    const tier = (item.titleTier ?? 'common') as TitleTier
                    const active = editTitle === item.name
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setEditTitle(item.name); setEditTitleTier(tier) }}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center justify-between ${
                          active
                            ? 'border-swan-accent bg-swan-accent/10'
                            : 'border-swan-border'
                        }`}
                      >
                        <TitleBadge title={item.name} tier={tier} />
                        <span className="text-xs text-swan-sub ml-2 shrink-0">{tier.toUpperCase()}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* フレーム選択 */}
            <DecoSection
              label="フレーム"
              noneLabel="フレームなし"
              current={editFrame}
              options={Object.entries(FRAME_DEFS)
                .filter(([key]) => ownedItemIds.has(`frame_${key}`) || ownedTitleItems.some(i => i.name === key))
                .concat(
                  userItems
                    .filter(ui => {
                      const item = allItems.find(i => i.id === ui.itemId)
                      return item?.decorationType === 'frame'
                    })
                    .map(ui => {
                      const item = allItems.find(i => i.id === ui.itemId)!
                      const key = item.frameStyle ?? ''
                      return [key, FRAME_DEFS[key] ?? { name: item.name, description: '' }] as [string, typeof FRAME_DEFS[string]]
                    })
                    .filter(([k]) => k && FRAME_DEFS[k])
                )
                .filter(([, def]) => def)}
              onSelect={setEditFrame}
              renderPreview={(key) => (
                <SwanAvatar color={editColor} size={36} frame={key} />
              )}
            />

            {/* オーバーレイ選択 */}
            <DecoSection
              label="装飾"
              noneLabel="装飾なし"
              current={editOverlay}
              options={userItems
                .filter(ui => {
                  const item = allItems.find(i => i.id === ui.itemId)
                  return item?.decorationType === 'overlay'
                })
                .map(ui => {
                  const item = allItems.find(i => i.id === ui.itemId)!
                  const key = item.overlayId ?? ''
                  return [key, OVERLAY_DEFS[key] ?? { name: item.name, description: '', component: () => null }] as [string, typeof OVERLAY_DEFS[string]]
                })
                .filter(([k]) => k && OVERLAY_DEFS[k])}
              onSelect={setEditOverlay}
              renderPreview={(key) => (
                <SwanAvatar color={editColor} size={36} overlay={key} />
              )}
            />

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

        {/* 解除済み実績 */}
        {achievements.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-swan-sub">実績 ({achievements.length})</h3>
              <Link to="/achievements" className="text-xs text-swan-accent">すべて見る</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {achievements.slice(0, 6).map((ua) => {
                const def = ACHIEVEMENTS.find((a) => a.id === ua.achievementId)
                return (
                  <div key={ua.id} className="bg-swan-card border border-swan-accent/30 rounded-lg px-3 py-2 text-xs flex items-center gap-1">
                    <span>{def?.iconUrl ?? ''}</span>
                    {def?.name ?? ua.achievementId}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {achievements.length === 0 && (
          <Link to="/achievements" className="flex items-center gap-2 text-swan-sub text-sm">
            <Award size={16} /> 実績を確認する
          </Link>
        )}

        {/* ポイント履歴 */}
        <div>
          <h3 className="text-sm font-semibold text-swan-sub mb-2">ポイント履歴</h3>
          {pointLogs.length === 0 ? (
            <p className="text-swan-sub text-sm">履歴はありません</p>
          ) : (
            <div className="space-y-2">
              {pointLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-center bg-swan-card rounded-lg px-4 py-3">
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
