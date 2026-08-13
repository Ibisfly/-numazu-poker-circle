import type { TimerLevel } from '@/types'
import { BUILT_IN_PRESETS } from './structure'

/**
 * プリセットと「自分が作った部屋」の保存先。
 * ログイン不要が要件なので、アカウントに紐付けず端末の localStorage に置く。
 * 端末を移す手段としてエクスポート / インポート用のコードを用意している。
 */

const PRESET_KEY = 'numazu.liveTimer.presets.v1'
const ROOM_KEY   = 'numazu.liveTimer.rooms.v1'

export interface StoredPreset {
  id: string
  name: string
  startingStack: number
  levels: TimerLevel[]
  updatedAt: number
}

export interface StoredRoom {
  kind: 'timer' | 'bracket'
  id: string
  title: string
  controlKey: string
  savedAt: number
}

const read = <T>(key: string): T[] => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error('localStorage read failed:', e)
    return []
  }
}

const write = <T>(key: string, value: T[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('localStorage write failed:', e)
  }
}

// ── プリセット ───────────────────────────────────────────────────────────────

export const loadPresets = (): StoredPreset[] =>
  read<StoredPreset>(PRESET_KEY).sort((a, b) => b.updatedAt - a.updatedAt)

export const savePreset = (preset: Omit<StoredPreset, 'id' | 'updatedAt'> & { id?: string }): StoredPreset => {
  const list = read<StoredPreset>(PRESET_KEY)
  const id = preset.id ?? `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const entry: StoredPreset = {
    id,
    name: preset.name,
    startingStack: preset.startingStack,
    levels: preset.levels,
    updatedAt: Date.now(),
  }
  const idx = list.findIndex((p) => p.id === id)
  if (idx >= 0) list[idx] = entry
  else list.push(entry)
  write(PRESET_KEY, list)
  return entry
}

export const deletePreset = (id: string) =>
  write(PRESET_KEY, read<StoredPreset>(PRESET_KEY).filter((p) => p.id !== id))

/** 組み込みプリセットを「自分のプリセット」として複製する */
export const seedBuiltInPresets = () => {
  if (read<StoredPreset>(PRESET_KEY).length > 0) return
  for (const p of BUILT_IN_PRESETS) {
    savePreset({ name: p.name, startingStack: p.startingStack, levels: p.levels })
  }
}

// ── エクスポート / インポート ─────────────────────────────────────────────────

/** 別端末へ移すためのコード。JSON を Base64 にして貼り付けやすくしている */
export const exportPresetCode = (preset: StoredPreset): string => {
  const payload = { n: preset.name, s: preset.startingStack, l: preset.levels }
  // btoa は非 ASCII を扱えないため UTF-8 → パーセントエスケープ経由で変換する
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
}

export const importPresetCode = (code: string): StoredPreset => {
  const json = decodeURIComponent(escape(atob(code.trim())))
  const parsed = JSON.parse(json) as { n?: string; s?: number; l?: TimerLevel[] }
  if (!parsed.l || !Array.isArray(parsed.l) || parsed.l.length === 0) {
    throw new Error('コードの形式が正しくありません')
  }
  return savePreset({
    name: parsed.n || 'インポートしたストラクチャー',
    startingStack: parsed.s || 20000,
    levels: parsed.l,
  })
}

// ── 自分が作った部屋（操作キーの保管）────────────────────────────────────────

export const loadRooms = (): StoredRoom[] =>
  read<StoredRoom>(ROOM_KEY).sort((a, b) => b.savedAt - a.savedAt)

export const saveRoom = (room: Omit<StoredRoom, 'savedAt'>) => {
  const list = read<StoredRoom>(ROOM_KEY).filter((r) => !(r.id === room.id && r.kind === room.kind))
  list.unshift({ ...room, savedAt: Date.now() })
  // 履歴が無限に増えないよう直近30件で打ち切る
  write(ROOM_KEY, list.slice(0, 30))
}

export const findRoom = (kind: 'timer' | 'bracket', id: string): StoredRoom | undefined =>
  read<StoredRoom>(ROOM_KEY).find((r) => r.kind === kind && r.id === id)

export const deleteRoom = (kind: 'timer' | 'bracket', id: string) =>
  write(ROOM_KEY, read<StoredRoom>(ROOM_KEY).filter((r) => !(r.kind === kind && r.id === id)))
