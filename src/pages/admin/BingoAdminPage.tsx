import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { AdminShell } from '@/pages/admin/AdminDashboardPage'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { Plus, Pencil, X, Star, Shuffle, Check, ChevronLeft } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeBingoCards,
  createBingoCard,
  updateBingoCard,
  deleteBingoCard,
  getBingoStampCode,
  setBingoStampCode,
  subscribeBingoMissionTemplates,
  createBingoMissionTemplate,
  updateBingoMissionTemplate,
  deleteBingoMissionTemplate,
  getRandomBingoMissions,
} from '@/lib/firebase/firestore'
import type { BingoCard, BingoMission, BingoMissionTemplate } from '@/types'

const DEFAULT_MISSIONS: BingoMission[] = Array.from({ length: 25 }, (_, i) => ({
  cellIndex: i,
  text: i === 12 ? 'FREE' : '',
}))

type EditMode = 'create' | 'edit' | null
type TabMode = 'cards' | 'missions'

const generateCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export const BingoAdminPage = () => {
  const { user } = useAuth()
  const [cards, setCards] = useState<BingoCard[]>([])
  const [missionTemplates, setMissionTemplates] = useState<BingoMissionTemplate[]>([])
  const [tabMode, setTabMode] = useState<TabMode>('cards')
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [editingCard, setEditingCard] = useState<BingoCard | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [pointsPerCell, setPointsPerCell] = useState(2)
  const [pointsPerBingo, setPointsPerBingo] = useState(20)
  const [pointsForCompletion, setPointsForCompletion] = useState(50)
  const [missions, setMissions] = useState<BingoMission[]>(DEFAULT_MISSIONS)
  const [isAvailable, setIsAvailable] = useState(true)
  const [saving, setSaving] = useState(false)

  const [stampCode, setStampCode] = useState<string | null>(null)
  const [loadingCode, setLoadingCode] = useState(true)

  const [newMissionText, setNewMissionText] = useState('')
  const [missionSaving, setMissionSaving] = useState(false)

  useEffect(() => {
    return subscribeBingoCards(setCards)
  }, [])

  useEffect(() => {
    return subscribeBingoMissionTemplates(setMissionTemplates)
  }, [])

  useEffect(() => {
    getBingoStampCode().then((code) => {
      setStampCode(code)
      setLoadingCode(false)
    })
  }, [])

  const resetForm = () => {
    setName('')
    setDescription('')
    setPointsPerCell(10)
    setPointsPerBingo(100)
    setPointsForCompletion(200)
    setMissions(DEFAULT_MISSIONS)
    setIsAvailable(true)
    setEditMode(null)
    setEditingCard(null)
  }

  const openCreate = () => {
    resetForm()
    setEditMode('create')
  }

  const openEdit = (card: BingoCard) => {
    setName(card.name)
    setDescription(card.description)
    setPointsPerCell(card.pointsPerCell)
    setPointsPerBingo(card.pointsPerBingo)
    setPointsForCompletion(card.pointsForCompletion ?? 200)
    setMissions(card.missions.length === 25 ? card.missions : DEFAULT_MISSIONS)
    setIsAvailable(card.isAvailable)
    setEditingCard(card)
    setEditMode('edit')
  }

  const handleRandomMissions = async () => {
    try {
      const randomTexts = await getRandomBingoMissions()
      setMissions(
        missions.map((m, i) => ({
          ...m,
          text: i === 12 ? 'FREE' : randomTexts[i < 12 ? i : i - 1] ?? '',
        }))
      )
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました')
    }
  }

  const updateMissionText = (index: number, text: string) => {
    setMissions((prev) =>
      prev.map((m) => (m.cellIndex === index ? { ...m, text } : m))
    )
  }

  const handleSave = async () => {
    if (!user || !name.trim()) return
    setSaving(true)
    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        pointsPerCell,
        pointsPerBingo,
        pointsForCompletion,
        missions,
        isAvailable,
        createdBy: user.uid,
      }

      if (editMode === 'create') {
        await createBingoCard(data)
      } else if (editMode === 'edit' && editingCard) {
        await updateBingoCard(editingCard.id, data)
      }
      resetForm()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cardId: string) => {
    if (!confirm('このビンゴカードを削除しますか？')) return
    await deleteBingoCard(cardId)
  }

  const handleGenerateCode = async () => {
    const newCode = generateCode()
    await setBingoStampCode(newCode)
    setStampCode(newCode)
  }

  const handleAddMissionTemplate = async () => {
    if (!user || !newMissionText.trim()) return
    setMissionSaving(true)
    try {
      await createBingoMissionTemplate({
        text: newMissionText.trim(),
        isActive: true,
        createdBy: user.uid,
      })
      setNewMissionText('')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setMissionSaving(false)
    }
  }

  const handleToggleMissionActive = async (template: BingoMissionTemplate) => {
    await updateBingoMissionTemplate(template.id, { isActive: !template.isActive })
  }

  const handleDeleteMissionTemplate = async (id: string) => {
    if (!confirm('このミッションテンプレートを削除しますか？')) return
    await deleteBingoMissionTemplate(id)
  }

  const activeTemplateCount = missionTemplates.filter((t) => t.isActive).length

  return (
    <AdminShell title="ビンゴカード管理">
      <div className="py-4 space-y-6">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        {/* タブ切り替え */}
        <div className="flex gap-2 bg-swan-dark rounded-xl p-1">
          <button
            onClick={() => setTabMode('cards')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tabMode === 'cards'
                ? 'bg-swan-accent text-black'
                : 'text-swan-sub hover:text-swan-text'
            }`}
          >
            カード管理
          </button>
          <button
            onClick={() => setTabMode('missions')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tabMode === 'missions'
                ? 'bg-swan-accent text-black'
                : 'text-swan-sub hover:text-swan-text'
            }`}
          >
            ミッションプール
          </button>
        </div>

        {tabMode === 'cards' && (
          <>
            {/* スタンプ用QRコード */}
            <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-4">
              <h3 className="font-bold text-swan-text">スタンプ用QRコード</h3>
              <p className="text-xs text-swan-sub">
                このQRコードをテーブルに設置してください。
                ユーザーがスキャンすると1マスだけスタンプを押せます。
              </p>

              {loadingCode ? (
                <div className="text-center py-8 text-swan-sub">読み込み中...</div>
              ) : stampCode ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="bg-white p-4 rounded-xl">
                    <QRCodeSVG value={`BINGO:${stampCode}`} size={180} />
                  </div>
                  <p className="text-xs text-swan-muted font-mono">コード: {stampCode}</p>
                  <p className="text-xs text-swan-sub text-center">
                    印刷してラミネートし、テーブルに設置してください
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <button
                    onClick={handleGenerateCode}
                    className="bg-swan-accent text-black font-semibold px-6 py-2 rounded-xl"
                  >
                    QRコードを生成
                  </button>
                </div>
              )}
            </div>

            {/* 作成ボタン */}
            {!editMode && (
              <button
                onClick={openCreate}
                className="w-full flex items-center justify-center gap-2 bg-swan-accent text-black font-semibold py-3 rounded-xl"
              >
                <Plus size={20} />
                新規ビンゴカード作成
              </button>
            )}

            {/* 編集フォーム */}
            {editMode && (
              <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-swan-text">
                    {editMode === 'create' ? '新規作成' : '編集'}
                  </h3>
                  <button onClick={resetForm} className="text-swan-sub">
                    <X size={20} />
                  </button>
                </div>

                {/* 基本情報 */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-swan-sub">カード名</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                      placeholder="今週のビンゴ"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-swan-sub">説明</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                      placeholder="5/14イベント用"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-swan-sub">1マス達成pt</label>
                      <input
                        type="number"
                        value={pointsPerCell}
                        onChange={(e) => setPointsPerCell(Number(e.target.value))}
                        className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-swan-sub">初BINGO pt</label>
                      <input
                        type="number"
                        value={pointsPerBingo}
                        onChange={(e) => setPointsPerBingo(Number(e.target.value))}
                        className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-swan-sub">全埋めpt</label>
                      <input
                        type="number"
                        value={pointsForCompletion}
                        onChange={(e) => setPointsForCompletion(Number(e.target.value))}
                        className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm text-swan-text">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="rounded"
                    />
                    配布可能（イベントで選択可能）
                  </label>
                </div>

                {/* ミッション編集 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-swan-sub">ミッション (5×5)</label>
                    <button
                      onClick={handleRandomMissions}
                      className="text-xs text-swan-accent flex items-center gap-1"
                    >
                      <Shuffle size={12} />
                      ランダム生成
                    </button>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {missions.map((m, i) => (
                      <div key={i} className="relative">
                        {i === 12 ? (
                          <div className="aspect-square bg-swan-accent/20 rounded-lg flex items-center justify-center">
                            <Star size={16} className="text-swan-accent" />
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={m.text}
                            onChange={(e) => updateMissionText(i, e.target.value)}
                            className="w-full aspect-square bg-swan-dark border border-swan-border rounded-lg text-[9px] text-swan-text text-center p-0.5"
                            placeholder={String(i + 1)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {activeTemplateCount < 24 && (
                    <p className="text-xs text-orange-400 mt-2">
                      ⚠ ランダム生成には24個以上のアクティブなミッションが必要です（現在: {activeTemplateCount}個）
                    </p>
                  )}
                </div>

                {/* 保存ボタン */}
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="w-full bg-swan-accent text-black font-semibold py-3 rounded-xl disabled:opacity-50"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            )}

            {/* カード一覧 */}
            {!editMode && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-swan-sub uppercase tracking-wide">
                  ビンゴカード一覧
                </h3>
                {cards.length === 0 ? (
                  <p className="text-swan-sub text-center py-8">
                    ビンゴカードがありません
                  </p>
                ) : (
                  cards.map((card) => (
                    <div
                      key={card.id}
                      className="bg-swan-card border border-swan-border rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-swan-text flex items-center gap-1.5">
                            {card.name}
                            {!card.isAvailable && (
                              <span className="text-xs text-swan-muted">(非公開)</span>
                            )}
                          </p>
                          <p className="text-xs text-swan-sub">{card.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEdit(card)}
                            className="text-swan-sub hover:text-swan-accent"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(card.id)}
                            className="text-swan-sub hover:text-red-400"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-swan-sub">
                        <span>マス: +{card.pointsPerCell} <FeatherIcon size={10} /></span>
                        <span>BINGO: +{card.pointsPerBingo} <FeatherIcon size={10} /></span>
                        <span>全埋め: +{card.pointsForCompletion} <FeatherIcon size={10} /></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {tabMode === 'missions' && (
          <div className="space-y-6">
            {/* ミッション追加 */}
            <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-3">
              <h3 className="font-bold text-swan-text">ミッションテンプレート追加</h3>
              <p className="text-xs text-swan-sub">
                ビンゴカード作成時に、ここで登録したミッションからランダムに24個が選ばれます。
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMissionText}
                  onChange={(e) => setNewMissionText(e.target.value)}
                  className="flex-1 bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                  placeholder="ミッション内容（例: 3betする）"
                />
                <button
                  onClick={handleAddMissionTemplate}
                  disabled={missionSaving || !newMissionText.trim()}
                  className="bg-swan-accent text-black font-semibold px-4 rounded-lg disabled:opacity-50"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* ミッション一覧 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-swan-sub uppercase tracking-wide">
                  登録済みミッション
                </h3>
                <span className="text-xs text-swan-sub">
                  アクティブ: <span className="text-swan-accent font-bold">{activeTemplateCount}</span> / {missionTemplates.length}
                </span>
              </div>
              {missionTemplates.length === 0 ? (
                <p className="text-swan-sub text-center py-8">
                  ミッションテンプレートがありません
                </p>
              ) : (
                missionTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`bg-swan-card border rounded-xl px-4 py-3 flex items-center justify-between ${
                      template.isActive ? 'border-swan-accent/30' : 'border-swan-border opacity-60'
                    }`}
                  >
                    <span className="text-sm text-swan-text">{template.text}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleToggleMissionActive(template)}
                        className={`p-1.5 rounded ${
                          template.isActive
                            ? 'text-green-400 hover:bg-green-400/10'
                            : 'text-swan-sub hover:text-green-400'
                        }`}
                        title={template.isActive ? '非アクティブにする' : 'アクティブにする'}
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteMissionTemplate(template.id)}
                        className="text-swan-sub hover:text-red-400 p-1.5"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  )
}
