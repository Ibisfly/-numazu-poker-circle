import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  subscribeAchievementConfigs, saveAchievementConfig,
  subscribeItems, type AchievementReward,
} from '@/lib/firebase/firestore'
import { ACHIEVEMENTS } from '@/lib/achievements'
import type { Item } from '@/types'
import { ChevronLeft } from '@/components/ui/Icons'
import type { TitleTier } from '@/components/ui/TitleBadge'
import { TitleBadge } from '@/components/ui/TitleBadge'

export const AchievementsAdminPage = () => {
  const { user: adminUser } = useAuth()
  const [configs, setConfigs]   = useState<AchievementReward[]>([])
  const [items, setItems]       = useState<Item[]>([])
  const [editing, setEditing]   = useState<string | null>(null)  // achievementId
  const [saving, setSaving]     = useState(false)

  // 編集フォーム状態
  const [rewardType, setRewardType]     = useState<'none' | 'title' | 'item'>('none')
  const [titleText, setTitleText]       = useState('')
  const [titleTier, setTitleTier]       = useState<TitleTier>('common')
  const [rewardItemId, setRewardItemId] = useState('')

  useEffect(() => {
    const u1 = subscribeAchievementConfigs(setConfigs)
    const u2 = subscribeItems(setItems)
    return () => { u1(); u2() }
  }, [])

  const configMap = new Map(configs.map((c) => [c.achievementId, c]))

  const openEdit = (achId: string) => {
    const cfg = configMap.get(achId)
    setRewardType((cfg?.rewardType as 'title' | 'item') ?? 'none')
    setTitleText(cfg?.rewardTitleText ?? '')
    setTitleTier((cfg?.rewardTitleTier as TitleTier) ?? 'common')
    setRewardItemId(cfg?.rewardItemId ?? '')
    setEditing(achId)
  }

  const handleSave = async () => {
    if (!adminUser || !editing) return
    setSaving(true)
    try {
      await saveAchievementConfig({
        achievementId: editing,
        rewardType: rewardType === 'none' ? undefined : rewardType,
        rewardTitleText: rewardType === 'title' ? titleText : undefined,
        rewardTitleTier: rewardType === 'title' ? titleTier : undefined,
        rewardItemId: rewardType === 'item' ? rewardItemId : undefined,
      }, adminUser.uid)
      setEditing(null)
    } finally { setSaving(false) }
  }

  if (!adminUser) return null

  const cosmeticItems = items.filter((i) => i.category === 'cosmetic' && i.isAvailable)

  return (
    <AdminShell title="実績管理">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <p className="text-xs text-swan-sub">
          各実績に解除報酬（称号・アイテム）を設定できます。<br />
          解除条件は自動で判定されます。
        </p>

        <div className="space-y-3">
          {ACHIEVEMENTS.map((ach) => {
            const cfg = configMap.get(ach.id)
            const isEditing = editing === ach.id

            return (
              <div key={ach.id} className="bg-swan-card border border-swan-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{ach.iconUrl}</span>
                    <div>
                      <p className="font-semibold text-sm">{ach.name}</p>
                      <p className="text-xs text-swan-sub">{ach.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => isEditing ? setEditing(null) : openEdit(ach.id)}
                    className="text-xs text-swan-accent border border-swan-accent/30 px-2 py-1 rounded-lg shrink-0"
                  >
                    {isEditing ? '閉じる' : '報酬設定'}
                  </button>
                </div>

                {/* 現在の報酬表示 */}
                {!isEditing && cfg?.rewardType && (
                  <div className="text-xs text-swan-sub bg-swan-black rounded-lg px-3 py-2">
                    報酬：{cfg.rewardType === 'title'
                      ? <><TitleBadge title={cfg.rewardTitleText ?? ''} tier={(cfg.rewardTitleTier as TitleTier) ?? 'common'} /></>
                      : `アイテム (${items.find((i) => i.id === cfg.rewardItemId)?.name ?? cfg.rewardItemId})`
                    }
                  </div>
                )}

                {/* 編集フォーム */}
                {isEditing && (
                  <div className="mt-3 space-y-3 border-t border-swan-border pt-3">
                    <div>
                      <label className="text-xs text-swan-sub block mb-1">報酬タイプ</label>
                      <div className="flex gap-2">
                        {(['none', 'title', 'item'] as const).map((t) => (
                          <button key={t} type="button" onClick={() => setRewardType(t)}
                            className={`flex-1 py-1.5 rounded-lg text-xs border transition-colors ${
                              rewardType === t ? 'border-swan-accent bg-swan-accent/10 text-swan-accent' : 'border-swan-border text-swan-sub'
                            }`}>
                            {t === 'none' ? 'なし' : t === 'title' ? '称号' : 'アイテム'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {rewardType === 'title' && (
                      <div className="space-y-2">
                        <input type="text" value={titleText} onChange={(e) => setTitleText(e.target.value)}
                          placeholder="称号テキスト（例: ポーカーマスター）"
                          className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text focus:outline-none focus:border-swan-accent" />
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['common','rare','elite','prime'] as TitleTier[]).map((t) => (
                            <button key={t} type="button" onClick={() => setTitleTier(t)}
                              className={`py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                titleTier === t ? 'border-swan-accent bg-swan-accent/10 text-swan-accent' : 'border-swan-border text-swan-sub'
                              }`}>
                              {t.toUpperCase()}
                            </button>
                          ))}
                        </div>
                        {titleText && (
                          <div className="px-3 py-2 bg-swan-black rounded-lg">
                            <TitleBadge title={titleText} tier={titleTier} />
                          </div>
                        )}
                      </div>
                    )}

                    {rewardType === 'item' && (
                      <div>
                        <label className="text-xs text-swan-sub block mb-1">付与アイテム</label>
                        <select value={rewardItemId} onChange={(e) => setRewardItemId(e.target.value)}
                          className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text">
                          <option value="">-- 選択 --</option>
                          {cosmeticItems.map((i) => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <button onClick={handleSave} disabled={saving}
                      className="w-full bg-swan-accent text-black font-bold py-2 rounded-xl text-sm disabled:opacity-50">
                      {saving ? '保存中...' : '保存'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AdminShell>
  )
}
