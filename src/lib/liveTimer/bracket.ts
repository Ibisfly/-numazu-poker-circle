import type { BracketEntrant, BracketMatch, BracketMode } from '@/types'

/**
 * シングルエリミネーションのトーナメント表を組む純粋関数群。
 * ヘッズアップ（個人1on1）と 3on3（チーム戦）で同じ構造を使い、
 * 違いは entrant が個人かチームか・1マッチの先取数だけにしている。
 */

/** 参加者数を超える最小の2のべき乗（最低2） */
export const bracketSize = (n: number) => {
  let size = 2
  while (size < n) size *= 2
  return size
}

export const roundCount = (n: number) => Math.log2(bracketSize(n))

/**
 * 標準シード順（1-8 なら 1,8,5,4,3,6,7,2）。
 * 上位シードが early round で当たらないようにする定番アルゴリズム。
 */
export const seedOrder = (size: number): number[] => {
  let order = [1, 2]
  while (order.length < size) {
    const next: number[] = []
    const sum = order.length * 2 + 1
    for (const s of order) {
      next.push(s)
      next.push(sum - s)
    }
    order = next
  }
  return order
}

export const roundLabel = (round: number, total: number) => {
  const fromFinal = total - round - 1
  if (fromFinal === 0) return 'FINAL'
  if (fromFinal === 1) return 'SEMI FINAL'
  if (fromFinal === 2) return 'QUARTER FINAL'
  return `ROUND ${round + 1}`
}

export const makeEntrant = (name: string, seed: number, members: string[] = []): BracketEntrant => ({
  id: `e${seed}-${Math.random().toString(36).slice(2, 7)}`,
  name,
  members,
  seed,
})

/**
 * 参加者リストからマッチ配列を生成する。
 * 不足分は bye（null）になり、bye 相手のマッチは即座に勝者確定させる。
 */
export const buildMatches = (entrants: BracketEntrant[]): BracketMatch[] => {
  const size = bracketSize(entrants.length)
  const rounds = Math.log2(size)
  const order = seedOrder(size)
  const bySeed = new Map(entrants.map((e) => [e.seed, e]))

  const matches: BracketMatch[] = []

  // Firestore は undefined を受け付けないため、決勝では nextId のキー自体を持たせない
  const withNext = (m: BracketMatch, nextId: string | null): BracketMatch =>
    nextId ? { ...m, nextId } : m

  // 1回戦：シード順に2人ずつ割り当てる
  for (let i = 0; i < size / 2; i++) {
    const a = bySeed.get(order[i * 2]) ?? null
    const b = bySeed.get(order[i * 2 + 1]) ?? null
    matches.push(withNext({
      id: `r0m${i}`,
      round: 0,
      index: i,
      aId: a?.id ?? null,
      bId: b?.id ?? null,
      // 相手が bye なら不戦勝
      winnerId: a && !b ? a.id : !a && b ? b.id : null,
      scoreA: 0,
      scoreB: 0,
    }, rounds > 1 ? `r1m${Math.floor(i / 2)}` : null))
  }

  // 2回戦以降は空のマッチを並べる
  for (let r = 1; r < rounds; r++) {
    const count = size / Math.pow(2, r + 1)
    for (let i = 0; i < count; i++) {
      matches.push(withNext({
        id: `r${r}m${i}`,
        round: r,
        index: i,
        aId: null,
        bId: null,
        winnerId: null,
        scoreA: 0,
        scoreB: 0,
      }, r < rounds - 1 ? `r${r + 1}m${Math.floor(i / 2)}` : null))
    }
  }

  return propagate(matches)
}

/**
 * 確定した勝者を次のマッチへ流し込む。
 * 勝者を付け替えたときに下流が矛盾しないよう、毎回全体を再計算する方式にしている。
 */
export const propagate = (matches: BracketMatch[]): BracketMatch[] => {
  const byId = new Map(matches.map((m) => [m.id, { ...m }]))
  const sorted = [...byId.values()].sort((a, b) => a.round - b.round || a.index - b.index)

  // 2回戦以降のスロットを一度クリアしてから流し直す
  for (const m of sorted) {
    if (m.round > 0) {
      m.aId = null
      m.bId = null
    }
  }

  for (const m of sorted) {
    if (!m.nextId) continue
    const next = byId.get(m.nextId)
    if (!next) continue
    // 偶数インデックスの勝者が上（A）、奇数が下（B）に入る
    if (m.index % 2 === 0) next.aId = m.winnerId
    else next.bId = m.winnerId
  }

  // 流し込みでスロットが消えたマッチの勝者・スコアは無効化する
  for (const m of sorted) {
    if (m.winnerId && m.winnerId !== m.aId && m.winnerId !== m.bId) {
      m.winnerId = null
      m.scoreA = 0
      m.scoreB = 0
    }
    // bye は自動で不戦勝
    if (!m.winnerId && m.round === 0) {
      if (m.aId && !m.bId) m.winnerId = m.aId
      if (!m.aId && m.bId) m.winnerId = m.bId
    }
  }

  return sorted
}

/** スコア加算 → 先取数に達したら勝者確定 */
export const applyScore = (
  matches: BracketMatch[],
  matchId: string,
  side: 'a' | 'b',
  delta: number,
  winsNeeded: number
): BracketMatch[] => {
  const updated = matches.map((m) => {
    if (m.id !== matchId) return m
    const scoreA = side === 'a' ? Math.max(0, m.scoreA + delta) : m.scoreA
    const scoreB = side === 'b' ? Math.max(0, m.scoreB + delta) : m.scoreB
    let winnerId: string | null = null
    if (scoreA >= winsNeeded && m.aId) winnerId = m.aId
    else if (scoreB >= winsNeeded && m.bId) winnerId = m.bId
    return { ...m, scoreA, scoreB, winnerId }
  })
  return propagate(updated)
}

/** スコアを使わず勝者を直接指定する（ヘッズアップの1本勝負用） */
export const setWinner = (
  matches: BracketMatch[],
  matchId: string,
  winnerId: string | null
): BracketMatch[] =>
  propagate(matches.map((m) => (m.id === matchId ? { ...m, winnerId } : m)))

export const championId = (matches: BracketMatch[]): string | null => {
  const final = matches.find((m) => !m.nextId)
  return final?.winnerId ?? null
}

/** 表示用: ラウンドごとにグループ化 */
export const groupByRound = (matches: BracketMatch[]): BracketMatch[][] => {
  const rounds: BracketMatch[][] = []
  for (const m of matches) {
    if (!rounds[m.round]) rounds[m.round] = []
    rounds[m.round].push(m)
  }
  return rounds.map((r) => r.sort((a, b) => a.index - b.index))
}

export const defaultWinsNeeded = (mode: BracketMode) => (mode === 'team' ? 2 : 1)
