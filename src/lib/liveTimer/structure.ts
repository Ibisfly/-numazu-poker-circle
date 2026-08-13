import type { TimerLevel } from '@/types'

/**
 * ストラクチャーに関する純粋関数群。
 * Firestore にも React にも依存させないことで、後からテストを追加できるようにしている。
 */

export const emptyLevel = (): TimerLevel => ({ sb: 100, bb: 200, ante: 0, minutes: 15, isBreak: false })

export const breakLevel = (minutes = 10): TimerLevel => ({
  sb: 0, bb: 0, ante: 0, minutes, isBreak: true, note: '休憩',
})

/** レベル配列の総所要時間（分） */
export const totalMinutes = (levels: TimerLevel[]) =>
  levels.reduce((sum, l) => sum + l.minutes, 0)

/** 指定レベル開始までの経過時間（分）— 「◯◯時開始予定」の算出に使う */
export const minutesUntilLevel = (levels: TimerLevel[], index: number) =>
  levels.slice(0, Math.max(0, index)).reduce((sum, l) => sum + l.minutes, 0)

/** 休憩を除いた実プレイレベルの通し番号（休憩は 0 を返す） */
export const playLevelNumber = (levels: TimerLevel[], index: number) => {
  if (!levels[index] || levels[index].isBreak) return 0
  let n = 0
  for (let i = 0; i <= index; i++) if (!levels[i].isBreak) n++
  return n
}

/** 次に来る「休憩でない」レベル。無ければ null */
export const nextPlayLevel = (levels: TimerLevel[], index: number): TimerLevel | null => {
  for (let i = index + 1; i < levels.length; i++) if (!levels[i].isBreak) return levels[i]
  return null
}

/** 平均スタック（生存者ゼロなら 0） */
export const averageStack = (startingStack: number, entryCount: number, remainingCount: number) => {
  if (remainingCount <= 0) return 0
  return Math.round((startingStack * Math.max(entryCount, remainingCount)) / remainingCount)
}

/** BB 単位の平均スタック — 「あと何BB」が分かるとプレイヤーが喜ぶ */
export const averageBB = (avgStack: number, bb: number) => (bb > 0 ? Math.round(avgStack / bb) : 0)

const HHMM = (totalMin: number) => {
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}時間${m > 0 ? `${m}分` : ''}` : `${m}分`
}
export const formatDuration = HHMM

/** mm:ss（1時間超は h:mm:ss） */
export const formatClock = (ms: number) => {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(h > 0 ? m : m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/**
 * 等比的にブラインドを上げるストラクチャーを生成する。
 * 手入力は運用に耐えないので、生成 → 微修正のワークフローを前提にしている。
 */
export const generateStructure = (opts: {
  levelCount: number
  minutes: number
  startSb: number
  growth: number          // 1レベルあたりの倍率（1.3 〜 1.6 が実用域）
  anteFromLevel: number   // 0 ならアンティなし。n 以上のレベルで BB アンティを付与
  breakEvery: number      // 0 なら休憩なし
  breakMinutes: number
}): TimerLevel[] => {
  const { levelCount, minutes, startSb, growth, anteFromLevel, breakEvery, breakMinutes } = opts
  const levels: TimerLevel[] = []
  let sb = startSb
  for (let i = 1; i <= levelCount; i++) {
    const rounded = roundBlind(sb)
    levels.push({
      sb: rounded,
      bb: rounded * 2,
      ante: anteFromLevel > 0 && i >= anteFromLevel ? rounded * 2 : 0,
      minutes,
      isBreak: false,
    })
    if (breakEvery > 0 && i % breakEvery === 0 && i !== levelCount) {
      levels.push(breakLevel(breakMinutes))
    }
    sb = sb * growth
  }
  return levels
}

/** チップの実在単位に丸める（25 / 100 / 500 刻み） */
export const roundBlind = (v: number) => {
  if (v < 200) return Math.max(25, Math.round(v / 25) * 25)
  if (v < 2000) return Math.round(v / 50) * 50
  if (v < 20000) return Math.round(v / 500) * 500
  return Math.round(v / 5000) * 5000
}

/**
 * 走行中のレベルと残り時間を「レベル終了時刻」から投影する。
 *
 * 操作端末がスリープしていても閲覧側だけで正しいレベルに追いつけるようにするため、
 * 0 を割り込んだ分を次レベルへ繰り越しながら前進させる。
 * Firestore への書き戻しは操作権を持つ端末だけが行う（書き込みの衝突を避ける）。
 */
export const projectRunning = (
  levels: TimerLevel[],
  startIndex: number,
  endsAtMs: number,
  nowMs: number
): { index: number; remainingMs: number; advanced: boolean; ended: boolean } => {
  let index = Math.max(0, Math.min(levels.length - 1, startIndex))
  let remaining = endsAtMs - nowMs
  let advanced = false

  while (remaining <= 0 && index < levels.length - 1) {
    index += 1
    remaining += (levels[index]?.minutes ?? 0) * 60_000
    advanced = true
  }

  return {
    index,
    remainingMs: Math.max(0, remaining),
    advanced,
    ended: remaining <= 0 && index >= levels.length - 1,
  }
}

export interface BuiltInPreset {
  name: string
  description: string
  startingStack: number
  levels: TimerLevel[]
}

/** 毎回ゼロから組ませないための組み込みプリセット */
export const BUILT_IN_PRESETS: BuiltInPreset[] = [
  {
    name: 'レギュラー 20分',
    description: '15レベル・4レベルごとに休憩。標準的な平日開催向け',
    startingStack: 20000,
    levels: generateStructure({
      levelCount: 15, minutes: 20, startSb: 100, growth: 1.4,
      anteFromLevel: 4, breakEvery: 4, breakMinutes: 10,
    }),
  },
  {
    name: 'ターボ 10分',
    description: '12レベル・短時間決着。2次会・サテライト向け',
    startingStack: 15000,
    levels: generateStructure({
      levelCount: 12, minutes: 10, startSb: 100, growth: 1.5,
      anteFromLevel: 3, breakEvery: 6, breakMinutes: 5,
    }),
  },
  {
    name: 'ディープ 25分',
    description: '18レベル・ゆるやか上昇。メインイベント向け',
    startingStack: 30000,
    levels: generateStructure({
      levelCount: 18, minutes: 25, startSb: 100, growth: 1.3,
      anteFromLevel: 5, breakEvery: 5, breakMinutes: 15,
    }),
  },
  {
    name: 'ヘッズアップ 8分',
    description: '10レベル・休憩なし。1on1トーナメント向け',
    startingStack: 10000,
    levels: generateStructure({
      levelCount: 10, minutes: 8, startSb: 50, growth: 1.5,
      anteFromLevel: 0, breakEvery: 0, breakMinutes: 0,
    }),
  },
  {
    name: 'ハイパー 5分',
    description: '10レベル・急上昇。3on3のリレー戦向け',
    startingStack: 8000,
    levels: generateStructure({
      levelCount: 10, minutes: 5, startSb: 100, growth: 1.6,
      anteFromLevel: 2, breakEvery: 0, breakMinutes: 0,
    }),
  },
]
