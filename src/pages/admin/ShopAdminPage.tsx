import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { subscribeItems, createItem, updateItem, deleteItem, markItemUsed, subscribeAllUsers, grantBenefitItem } from '@/lib/firebase/firestore'
import { uploadShopImage } from '@/lib/firebase/storage'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { useAuth } from '@/lib/hooks/useAuth'
import type { Item, UserItem, ItemCategory, User } from '@/types'
import { ChevronLeft, Plus, Eye, EyeOff, Pencil, FeatherPtIcon, X } from '@/components/ui/Icons'
import { SwanAvatar, AVATAR_VARIANT_DEFS } from '@/components/ui/SwanAvatar'

const formatCode = (id: string) =>
  `${id.slice(0, 4).toUpperCase()}-${id.slice(4, 8).toUpperCase()}`

export const ShopAdminPage = () => {
  const { user: adminUser } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [allUserItems, setAllUserItems] = useState<UserItem[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [codeSearch, setCodeSearch] = useState('')
  const [benefitFilter, setBenefitFilter] = useState<'all' | 'unused' | 'used'>('all')
  const [tab, setTab] = useState<'items' | 'benefits'>('items')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)

  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState<ItemCategory>('cosmetic')
  const [formCost, setFormCost] = useState('100')
  const [formDesc, setFormDesc] = useState('')
  const [formImageUrl, setFormImageUrl] = useState('')
  const [formAvatarColor, setFormAvatarColor] = useState('')
  const [formSubtype, setFormSubtype] = useState<'none' | 'title' | 'avatar_color' | 'avatar_decoration' | 'point_icon' | 'custom_hand_title' | 'avatar_variant'>('none')
  const [formPointIconId, setFormPointIconId] = useState('')
  const [formAvatarVariant, setFormAvatarVariant] = useState('')
  const [formTitleTier, setFormTitleTier] = useState<'common' | 'rare' | 'elite' | 'prime'>('common')
  const [formDecoType, setFormDecoType] = useState<'frame' | 'overlay' | ''>('')
  const [formFrameStyle, setFormFrameStyle] = useState('')
  const [formOverlayId, setFormOverlayId] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 特典の管理者付与
  const [grantUid, setGrantUid] = useState('')
  const [grantItemId, setGrantItemId] = useState('')
  const [grantQty, setGrantQty] = useState('1')
  const [granting, setGranting] = useState(false)
  const [grantMsg, setGrantMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const handleGrant = async () => {
    if (!adminUser) return
    setGrantMsg(null)
    const item = items.find((i) => i.id === grantItemId)
    const member = allUsers.find((u) => u.uid === grantUid)
    const qty = parseInt(grantQty)
    if (!item || !member) {
      setGrantMsg({ text: 'メンバーと特典を選択してください', ok: false })
      return
    }
    if (!Number.isInteger(qty) || qty < 1) {
      setGrantMsg({ text: '数量は1以上を指定してください', ok: false })
      return
    }
    setGranting(true)
    try {
      await grantBenefitItem(grantUid, item, qty, adminUser.uid)
      setGrantMsg({ text: `${member.playerName} さんに「${item.name}」×${qty} を付与しました`, ok: true })
      setGrantUid(''); setGrantItemId(''); setGrantQty('1')
    } catch (e: unknown) {
      setGrantMsg({ text: e instanceof Error ? e.message : '付与に失敗しました。もう一度お試しください。', ok: false })
    } finally {
      setGranting(false)
    }
  }

  useEffect(() => {
    const u1 = subscribeItems(setItems)
    const u2 = onSnapshot(
      query(collection(db, 'userItems')),
      (snap) => setAllUserItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserItem)))
    )
    const u3 = subscribeAllUsers(setAllUsers)
    return () => { u1(); u2(); u3() }
  }, [])

  const openForm = (item?: Item) => {
    if (item) {
      setEditItem(item)
      setFormName(item.name)
      setFormCategory(item.category)
      setFormCost(String(item.cost))
      setFormDesc(item.description)
      setFormImageUrl(item.imageUrl ?? '')
      setFormAvatarColor(item.avatarColor ?? '')
      setFormSubtype(item.itemSubtype ?? 'none')
      setFormTitleTier(item.titleTier ?? 'common')
      setFormDecoType((item.decorationType ?? '') as 'frame' | 'overlay' | '')
      setFormFrameStyle(item.frameStyle ?? '')
      setFormOverlayId(item.overlayId ?? '')
      setFormPointIconId(item.pointIconId ?? '')
      setFormAvatarVariant(item.avatarVariant ?? '')
    } else {
      setEditItem(null)
      setFormName('')
      setFormCategory('cosmetic')
      setFormCost('100')
      setFormDesc('')
      setFormImageUrl('')
      setFormAvatarColor('')
      setFormSubtype('none')
      setFormTitleTier('common')
      setFormDecoType('')
      setFormFrameStyle('')
      setFormOverlayId('')
      setFormPointIconId('')
      setFormAvatarVariant('')
    }
    setUploadProgress(null)
    setShowForm(true)
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadProgress(0)
    try {
      const url = await uploadShopImage(file, setUploadProgress)
      setFormImageUrl(url)
    } catch {
      alert('画像のアップロードに失敗しました')
    } finally {
      setUploadProgress(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminUser) return
    setSaving(true)
    try {
      const data: Omit<Item, 'id' | 'createdAt'> = {
        name: formName.trim(),
        category: formCategory,
        cost: parseInt(formCost),
        description: formDesc.trim(),
        isAvailable: editItem?.isAvailable ?? true,
        createdBy: adminUser.uid,
        ...(formImageUrl.trim() && { imageUrl: formImageUrl.trim() }),
        ...(formAvatarColor.trim() && { avatarColor: formAvatarColor.trim() }),
        ...(formSubtype !== 'none' && { itemSubtype: formSubtype }),
        ...(formSubtype === 'title' && { titleTier: formTitleTier }),
        ...(formSubtype === 'avatar_decoration' && formDecoType && { decorationType: formDecoType }),
        ...(formSubtype === 'avatar_decoration' && formDecoType === 'frame'   && formFrameStyle && { frameStyle: formFrameStyle }),
        ...(formSubtype === 'avatar_decoration' && formDecoType === 'overlay' && formOverlayId  && { overlayId:  formOverlayId }),
        ...(formSubtype === 'point_icon' && formPointIconId && { pointIconId: formPointIconId }),
        ...(formSubtype === 'avatar_variant' && formAvatarVariant && { avatarVariant: formAvatarVariant }),
        ...(formSubtype === 'custom_hand_title' && { allowMultiplePurchase: true, titleTier: 'rare' as const }),
      }
      if (editItem) {
        await updateItem(editItem.id, data)
      } else {
        await createItem(data)
      }
      setShowForm(false)
    } finally {
      setSaving(false)
    }
  }

  if (!adminUser) return null

  return (
    <AdminShell title="ショップ管理">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <div className="flex bg-swan-card rounded-xl p-1">
          {(['items', 'benefits'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm rounded-lg font-medium transition-colors ${tab === t ? 'bg-swan-accent text-black' : 'text-swan-sub'}`}>
              {t === 'items' ? 'アイテム' : '特典保有状況'}
            </button>
          ))}
        </div>

        {tab === 'items' && (
          <>
            <button onClick={() => openForm()} className="w-full bg-swan-accent text-black font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Plus size={16} />
              アイテム追加
            </button>

            {showForm && (
              <form onSubmit={handleSave} className="bg-swan-card border border-swan-border rounded-xl p-4 space-y-3">
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="アイテム名"
                  required
                  className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
                />
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ItemCategory)}
                  className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text"
                >
                  <option value="cosmetic">装飾品</option>
                  <option value="benefit">特典</option>
                </select>
                <div className="relative">
                  <input
                    type="number"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    min="1"
                    placeholder="コスト"
                    required
                    className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent"
                  />
                  <FeatherPtIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-swan-accent pointer-events-none" />
                </div>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="説明"
                  rows={2}
                  className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent resize-none"
                />

                {/* 商品画像 */}
                <div>
                  <label className="text-xs text-swan-sub block mb-1">商品画像（任意）</label>

                  {/* ファイル選択ボタン */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadProgress !== null}
                    className="w-full border border-dashed border-swan-border rounded-lg px-3 py-3 text-sm text-swan-sub hover:border-swan-accent hover:text-swan-accent transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Plus size={14} />
                    {uploadProgress !== null
                      ? `アップロード中… ${uploadProgress}%`
                      : formImageUrl
                      ? '画像を変更する'
                      : '端末から画像を選択'}
                  </button>

                  {/* アップロード進捗バー */}
                  {uploadProgress !== null && (
                    <div className="mt-2 w-full bg-swan-muted rounded-full h-1.5">
                      <div
                        className="bg-swan-accent h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  {/* プレビュー */}
                  {formImageUrl && uploadProgress === null && (
                    <div className="mt-2 relative">
                      <img
                        src={formImageUrl}
                        alt="preview"
                        className="w-full aspect-video object-cover rounded-lg"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 装飾品サブタイプ */}
                {formCategory === 'cosmetic' && (
                  <div>
                    <label className="text-xs text-swan-sub block mb-1">種別</label>
                    <select
                      value={formSubtype}
                      onChange={(e) => setFormSubtype(e.target.value as 'none' | 'title' | 'avatar_color' | 'avatar_decoration' | 'point_icon' | 'custom_hand_title' | 'avatar_variant')}
                      className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text"
                    >
                      <option value="none">種別なし（非表示）</option>
                      <option value="avatar_color">アイコン(背景)</option>
                      <option value="avatar_decoration">アイコン(装飾)</option>
                      <option value="avatar_variant">アイコン(イラスト)</option>
                      <option value="point_icon">ポイントアイコン</option>
                      <option value="title">称号</option>
                      <option value="custom_hand_title">ハンド称号（複数購入可）</option>
                    </select>
                    {/* アイコン(装飾) サブ設定 */}
                    {formSubtype === 'avatar_decoration' && (
                      <div className="space-y-2 p-3 bg-swan-black rounded-lg border border-swan-border">
                        <label className="text-xs text-swan-sub block">装飾タイプ</label>
                        <div className="flex gap-2">
                          {(['frame', 'overlay'] as const).map((t) => (
                            <button key={t} type="button" onClick={() => setFormDecoType(t)}
                              className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${
                                formDecoType === t ? 'border-swan-accent bg-swan-accent/10 text-swan-accent' : 'border-swan-border text-swan-sub'
                              }`}>
                              {t === 'frame' ? 'フレーム' : 'オーバーレイ'}
                            </button>
                          ))}
                        </div>
                        {formDecoType === 'frame' && (
                          <div>
                            <label className="text-xs text-swan-sub block mb-1">
                              frameStyle キー
                              <span className="ml-2 text-swan-muted font-mono">gold / flame / metallic / (カスタム)</span>
                            </label>
                            <input type="text" value={formFrameStyle} onChange={(e) => setFormFrameStyle(e.target.value)}
                              placeholder="gold"
                              className="w-full bg-swan-card border border-swan-border rounded px-2 py-1.5 text-xs text-swan-text font-mono focus:outline-none" />
                          </div>
                        )}
                        {formDecoType === 'overlay' && (
                          <div>
                            <label className="text-xs text-swan-sub block mb-1">
                              overlayId キー
                              <span className="ml-2 text-swan-muted font-mono">hat / sunglasses / crown / (カスタム)</span>
                            </label>
                            <input type="text" value={formOverlayId} onChange={(e) => setFormOverlayId(e.target.value)}
                              placeholder="hat"
                              className="w-full bg-swan-card border border-swan-border rounded px-2 py-1.5 text-xs text-swan-text font-mono focus:outline-none" />
                          </div>
                        )}
                      </div>
                    )}

                    {formSubtype === 'title' && (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-xs text-swan-sub">※ アイテム名が称号テキストとして表示されます</p>
                        <label className="text-xs text-swan-sub block">レアリティ</label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['common','rare','elite','prime'] as const).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setFormTitleTier(t)}
                              className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                                formTitleTier === t
                                  ? 'border-swan-accent bg-swan-accent/10 text-swan-accent'
                                  : 'border-swan-border text-swan-sub'
                              }`}
                            >
                              {t.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        <p className="text-xs text-swan-sub">
                          {formTitleTier === 'common' && 'グレー文字・装飾なし'}
                          {formTitleTier === 'rare'   && 'ゴールド文字・装飾なし'}
                          {formTitleTier === 'elite'  && 'ゴールド文字＋装飾枠'}
                          {formTitleTier === 'prime'  && 'シマーアニメ＋セリフ体フォント'}
                        </p>
                      </div>
                    )}

                    {formSubtype === 'point_icon' && (
                      <div className="mt-2 space-y-1.5 p-3 bg-swan-black rounded-lg border border-swan-border">
                        <label className="text-xs text-swan-sub block">
                          ポイントアイコンID
                          <span className="ml-2 text-swan-muted font-mono">feather / chips</span>
                        </label>
                        <input
                          type="text"
                          value={formPointIconId}
                          onChange={(e) => setFormPointIconId(e.target.value)}
                          placeholder="chips"
                          className="w-full bg-swan-card border border-swan-border rounded px-2 py-1.5 text-xs text-swan-text font-mono focus:outline-none"
                        />
                        <p className="text-xs text-swan-sub">
                          羽アイコンの代わりに表示されるポイントアイコン
                        </p>
                      </div>
                    )}

                    {formSubtype === 'avatar_variant' && (
                      <div className="mt-2 space-y-1.5 p-3 bg-swan-black rounded-lg border border-swan-border">
                        <label className="text-xs text-swan-sub block">
                          アバターバリエーションID
                        </label>
                        <select
                          value={formAvatarVariant}
                          onChange={(e) => setFormAvatarVariant(e.target.value)}
                          className="w-full bg-swan-card border border-swan-border rounded px-2 py-1.5 text-xs text-swan-text focus:outline-none"
                        >
                          <option value="">選択してください</option>
                          {Object.entries(AVATAR_VARIANT_DEFS)
                            .filter(([k]) => k !== 'default')
                            .map(([key, def]) => (
                              <option key={key} value={key}>{def.name}</option>
                            ))}
                        </select>
                        {formAvatarVariant && (
                          <div className="flex items-center gap-3 mt-2">
                            <SwanAvatar size={40} variant={formAvatarVariant} />
                            <span className="text-xs text-swan-sub">プレビュー</span>
                          </div>
                        )}
                        <p className="text-xs text-swan-sub">
                          黒鳥アイコンのイラストを変更できるアイテム
                        </p>
                      </div>
                    )}

                    {formSubtype === 'custom_hand_title' && (
                      <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <p className="text-xs text-amber-400">
                          ※ ハンド称号は購入ごとにユーザーが好きなハンドを入力できます<br />
                          ※ 同じアイテムを複数回購入可能（コレクション向け）<br />
                          ※ レアリティは自動的に RARE が適用されます
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* アバターカラー設定（avatar_colorのみ） */}
                {formCategory === 'cosmetic' && formSubtype === 'avatar_color' && (
                  <div>
                    <label className="text-xs text-swan-sub block mb-1">
                      アバターカラー（カラーアイテムの場合のみ）
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={formAvatarColor}
                        onChange={(e) => setFormAvatarColor(e.target.value)}
                        placeholder="#ec4899"
                        className="flex-1 bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent font-mono"
                      />
                      <input
                        type="color"
                        value={formAvatarColor || '#ec4899'}
                        onChange={(e) => setFormAvatarColor(e.target.value)}
                        className="w-10 h-10 rounded-lg border border-swan-border bg-swan-black cursor-pointer"
                      />
                    </div>
                    {formAvatarColor && (
                      <div className="mt-2 flex items-center gap-2">
                        <SwanAvatar color={formAvatarColor} size={40} showCard={false} />
                        <span className="text-xs text-swan-sub">プレビュー</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="flex-1 bg-swan-accent text-black font-bold py-2 rounded-lg text-sm disabled:opacity-50 active:scale-[0.98] transition-transform">
                    {saving ? '保存中...' : '保存'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-swan-muted text-swan-sub py-2 rounded-lg text-sm">
                    キャンセル
                  </button>
                </div>
              </form>
            )}

            {/* ジャンル別ソート + 値段順 */}
            {(() => {
              const GENRE_ORDER: Record<string, number> = {
                avatar_color: 0, avatar_decoration: 1, point_icon: 2, title: 3, custom_hand_title: 4, benefit: 5,
              }
              const sorted = [...items].sort((a, b) => {
                const ga = GENRE_ORDER[a.itemSubtype ?? a.category] ?? 9
                const gb = GENRE_ORDER[b.itemSubtype ?? b.category] ?? 9
                return ga !== gb ? ga - gb : a.cost - b.cost
              })

              let lastGenre = ''
              return (
                <div className="space-y-1">
                  {sorted.map((item) => {
                    const genre = item.category === 'benefit'  ? '特典'
                      : item.itemSubtype === 'avatar_color'      ? 'アイコン(背景)'
                      : item.itemSubtype === 'avatar_decoration' ? 'アイコン(装飾)'
                      : item.itemSubtype === 'avatar_variant'    ? 'アイコン(イラスト)'
                      : item.itemSubtype === 'point_icon'        ? 'ポイントアイコン'
                      : item.itemSubtype === 'title'             ? '称号'
                      : item.itemSubtype === 'custom_hand_title' ? 'ハンド称号'
                      : '装飾品'
                    const showHeader = genre !== lastGenre
                    lastGenre = genre
                    return (
                      <div key={item.id}>
                        {showHeader && (
                          <p className="text-xs text-swan-sub font-semibold mt-3 mb-1 px-1">{genre}</p>
                        )}
                        <div className="bg-swan-card border border-swan-border rounded-xl overflow-hidden">
                          {item.imageUrl && (
                            <img src={item.imageUrl} alt={item.name}
                              className="w-full aspect-video object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                          )}
                          <div className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 min-w-0">
                              {item.avatarColor && <SwanAvatar color={item.avatarColor} size={28} frame={item.frameStyle} />}
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{item.name}</p>
                                <p className="text-xs text-swan-sub flex items-center gap-1">
                                  <FeatherPtIcon size={10} className="text-swan-accent" />{item.cost}
                                  {!item.isAvailable && <span className="text-red-400 ml-1">非公開</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => updateItem(item.id, { isAvailable: !item.isAvailable })}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded border ${item.isAvailable ? 'text-green-400 border-green-400/30' : 'text-swan-sub border-swan-border'}`}>
                                {item.isAvailable ? <Eye size={11} /> : <EyeOff size={11} />}
                              </button>
                              <button onClick={() => openForm(item)} className="text-swan-accent p-1">
                                <Pencil size={14} />
                              </button>
                              <button onClick={() => {
                                if (confirm(`「${item.name}」を削除しますか？`)) deleteItem(item.id)
                              }} className="text-red-400/70 hover:text-red-400 p-1">
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </>
        )}

        {tab === 'benefits' && (
          <div className="space-y-3">
            {/* 特典の手動付与 */}
            <div className="bg-swan-card border border-swan-accent/30 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-swan-accent">特典を付与する</p>
              <select
                value={grantUid}
                onChange={(e) => setGrantUid(e.target.value)}
                className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text"
              >
                <option value="">メンバーを選択</option>
                {allUsers
                  .filter((u) => u.status === 'active')
                  .sort((a, b) => a.playerName.localeCompare(b.playerName, 'ja'))
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>{u.playerName}</option>
                  ))}
              </select>
              <div className="flex gap-2">
                <select
                  value={grantItemId}
                  onChange={(e) => setGrantItemId(e.target.value)}
                  className="flex-1 bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text"
                >
                  <option value="">特典を選択</option>
                  {items.filter((i) => i.category === 'benefit').map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={grantQty}
                  onChange={(e) => setGrantQty(e.target.value)}
                  min="1"
                  className="w-16 bg-swan-black border border-swan-border rounded-lg px-2 py-2 text-sm text-swan-text text-center"
                />
                <span className="text-xs text-swan-sub self-center">枚</span>
              </div>
              {grantMsg && (
                <p className={`text-xs text-center ${grantMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {grantMsg.text}
                </p>
              )}
              <button
                onClick={handleGrant}
                disabled={granting}
                className="w-full bg-swan-accent text-black font-bold py-2 rounded-lg text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
              >
                {granting ? '付与中...' : '付与する'}
              </button>
              <p className="text-xs text-swan-muted">※ ポイントは消費されません（運営からのプレゼント扱い）</p>
            </div>

            {/* 検索・フィルタ */}
            <input
              type="text"
              value={codeSearch}
              onChange={(e) => setCodeSearch(e.target.value)}
              placeholder="クーポンコードで検索（例: AB12-CD34）"
              className="w-full bg-swan-card border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent font-mono"
            />
            <div className="flex gap-1">
              {(['all', 'unused', 'used'] as const).map((f) => (
                <button key={f} onClick={() => setBenefitFilter(f)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    benefitFilter === f ? 'bg-swan-accent text-black' : 'bg-swan-card text-swan-sub border border-swan-border'
                  }`}>
                  {f === 'all' ? '全て' : f === 'unused' ? '未使用' : '使用済み'}
                </button>
              ))}
            </div>

            {/* 一覧 */}
            {(() => {
              const filtered = allUserItems
                .filter((ui) => ui.category === 'benefit')
                .filter((ui) => {
                  if (benefitFilter === 'unused') return !ui.usedAt
                  if (benefitFilter === 'used') return !!ui.usedAt
                  return true
                })
                .filter((ui) => {
                  if (!codeSearch.trim()) return true
                  const code = formatCode(ui.id)
                  return code.includes(codeSearch.trim().toUpperCase())
                })
                .sort((a, b) => {
                  // 使用済みを下に、その中で新しい順
                  if (!!a.usedAt !== !!b.usedAt) return a.usedAt ? 1 : -1
                  return 0
                })

              if (filtered.length === 0) {
                return <p className="text-center text-swan-sub py-8">該当する特典はありません</p>
              }

              return filtered.map((ui) => {
                const memberName = allUsers.find((u) => u.uid === ui.uid)?.playerName ?? ui.uid.slice(0, 8)
                const itemName = items.find((i) => i.id === ui.itemId)?.name ?? ui.itemId
                return (
                  <div key={ui.id} className={`bg-swan-card border rounded-xl px-4 py-3 space-y-2 ${
                    ui.usedAt ? 'border-swan-border opacity-60' : 'border-swan-border'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{itemName}</p>
                        <p className="text-xs text-swan-sub">{memberName}</p>
                      </div>
                      {!ui.usedAt ? (
                        <button onClick={() => markItemUsed(ui.id)}
                          className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg shrink-0">
                          使用済みに
                        </button>
                      ) : (
                        <span className="text-xs text-swan-sub border border-swan-border px-2 py-1 rounded shrink-0">使用済み</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-swan-accent tracking-widest">
                        {formatCode(ui.id)}
                      </span>
                      <div className="text-right text-xs text-swan-sub">
                        <p>購入: {ui.purchasedAt?.toDate().toLocaleDateString('ja-JP')}</p>
                        {ui.usedAt && <p className="text-red-400/70">使用: {ui.usedAt.toDate().toLocaleDateString('ja-JP')}</p>}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
