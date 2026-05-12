import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { AdminShell } from '@/pages/admin/AdminDashboardPage'
import { FeatherIcon } from '@/components/ui/FeatherIcon'
import { Plus, Pencil, X, BeginnerIcon, Star, RotateCcw } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeBingoCards,
  createBingoCard,
  updateBingoCard,
  deleteBingoCard,
  getBingoStampCode,
  setBingoStampCode,
} from '@/lib/firebase/firestore'
import type { BingoCard, BingoMission, BingoCardLevel } from '@/types'

const DEFAULT_MISSIONS: BingoMission[] = Array.from({ length: 25 }, (_, i) => ({
  cellIndex: i,
  text: i === 12 ? 'FREE' : '',
}))

const BEGINNER_SAMPLE_MISSIONS = [
  '3betする', 'ストレート完成', 'フラッシュ完成', 'フルハウス完成', 'ブラフで勝つ',
  'Cbet成功', 'チェックレイズ', 'オールイン勝利', 'ポケットペアで勝つ', 'リバーで逆転',
  'FREE', 'セットを作る', 'ドローヒット', 'バリューベット成功', 'ポット獲得3回',
  'スーテッドで勝つ', 'ヘッズアップ勝利', 'マルチウェイ勝利', 'ブラインド防衛成功', 'スチール成功',
  'ツーペア完成', 'トップペアで勝つ', 'ナッツで勝つ', 'リレイズ成功',
]

const ADVANCED_SAMPLE_MISSIONS = [
  '4bet成功', 'クワッズ完成', 'ストレートフラッシュ', 'ブラフキャッチ', 'オーバーベット成功',
  'チェックバック利益', 'ドンクベット成功', 'スロープレイ成功', 'マージナルハンド勝利', '5betオールイン勝利',
  'FREE', 'バックドア完成', 'フロートプレイ成功', 'スクイーズ成功', 'コールダウン正解',
  'リバーブラフ成功', 'シンバリュー成功', 'ポラライズベット', 'エクスプロイト成功', 'GTO風プレイ',
  'ヒーローコール成功', 'トラップ成功', 'レンジアドバンテージ活用', 'ポジション活用勝利',
]

type EditMode = 'create' | 'edit' | null

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
  const [editMode, setEditMode] = useState<EditMode>(null)
  const [editingCard, setEditingCard] = useState<BingoCard | null>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [level, setLevel] = useState<BingoCardLevel>('beginner')
  const [cost, setCost] = useState(100)
  const [pointsPerCell, setPointsPerCell] = useState(10)
  const [pointsPerBingo, setPointsPerBingo] = useState(100)
  const [missions, setMissions] = useState<BingoMission[]>(DEFAULT_MISSIONS)
  const [isAvailable, setIsAvailable] = useState(true)
  const [saving, setSaving] = useState(false)

  const [stampCode, setStampCode] = useState<string | null>(null)
  const [loadingCode, setLoadingCode] = useState(true)

  useEffect(() => {
    return subscribeBingoCards(setCards)
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
    setLevel('beginner')
    setCost(100)
    setPointsPerCell(10)
    setPointsPerBingo(100)
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
    setLevel(card.level)
    setCost(card.cost)
    setPointsPerCell(card.pointsPerCell)
    setPointsPerBingo(card.pointsPerBingo)
    setMissions(card.missions.length === 25 ? card.missions : DEFAULT_MISSIONS)
    setIsAvailable(card.isAvailable)
    setEditingCard(card)
    setEditMode('edit')
  }

  const applySampleMissions = () => {
    const samples = level === 'beginner' ? BEGINNER_SAMPLE_MISSIONS : ADVANCED_SAMPLE_MISSIONS
    setMissions(
      missions.map((m, i) => ({
        ...m,
        text: i === 12 ? 'FREE' : samples[i < 12 ? i : i - 1] ?? '',
      }))
    )
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
        level,
        cost,
        pointsPerCell,
        pointsPerBingo,
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

  return (
    <AdminShell title="ビンゴカード管理">
      <div className="py-4 space-y-6">
        {/* スタンプ用QRコード */}
        <div className="bg-swan-card border border-swan-border rounded-2xl p-4 space-y-4">
          <h3 className="font-bold text-swan-text">📱 スタンプ用QRコード</h3>
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
              <button
                onClick={handleGenerateCode}
                className="flex items-center gap-2 text-sm text-swan-accent hover:underline"
              >
                <RotateCcw size={14} />
                新しいコードを生成
              </button>
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
                  placeholder="初心者ビンゴ"
                />
              </div>

              <div>
                <label className="text-xs text-swan-sub">説明</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                  placeholder="初心者向けの簡単なミッション"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-swan-sub">レベル</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as BingoCardLevel)}
                    className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                  >
                    <option value="beginner">初心者向け</option>
                    <option value="advanced">上級者向け</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-swan-sub">価格</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-swan-text"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-xs text-swan-sub">BINGO達成pt</label>
                  <input
                    type="number"
                    value={pointsPerBingo}
                    onChange={(e) => setPointsPerBingo(Number(e.target.value))}
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
                ショップで販売中
              </label>
            </div>

            {/* ミッション編集 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-swan-sub">ミッション (5×5)</label>
                <button
                  onClick={applySampleMissions}
                  className="text-xs text-swan-accent"
                >
                  サンプルを適用
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
                        {card.level === 'beginner' && <BeginnerIcon size={12} />}
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
                    <span>価格: {card.cost} <FeatherIcon size={10} /></span>
                    <span>マス: +{card.pointsPerCell}pt / BINGO: +{card.pointsPerBingo}pt</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
