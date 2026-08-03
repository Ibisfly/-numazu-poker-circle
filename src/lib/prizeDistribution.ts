/**
 * トーナメント賞金の自動配分アルゴリズム（倍率カーブ型・決定論的）
 *
 * 賞金プール P を、エントリー数 N から決まる入賞人数 K 名へ配分する。
 * 乱数・現在時刻を使わないため、同一入力からは常に同一結果を返す。
 *
 * 制約（すべて満たせない候補は不採用）:
 *   - 賞金総額 = P（余りも超過も許さない）
 *   - Prize_1 > 3E（優勝はエントリー費の3倍超）
 *   - Prize_K > E（最低入賞額はエントリー費超）
 *   - Prize_i / Prize_(i+1) < 1.7（隣接順位の倍率上限）
 *   - 同額賞金の連続人数 <= L = max(1, ceil(K / 4) - 1)
 */

const SQRT2 = Math.SQRT2

export interface PrizeDistributionSuccess {
  ok: true
  /** 計算に使ったエントリー数（リエントリー込み） */
  entries: number
  entryFee: number
  /** 賞金プール総額 */
  pool: number
  /** 賞金の刻み単位（10pt または 1pt） */
  unit: number
  /** 入賞人数 */
  itmCount: number
  /** 入賞率 */
  itmRate: number
  /** 適用された人数帯の説明 */
  bracket: string
  /** 採用された傾斜パラメータ */
  gamma: number
  /** 1位から K 位までの賞金 */
  prizes: number[]
  /** 最低入賞額の目標値（1.25 × E を単位で切り上げ） */
  minPrizeTarget: number
  minPrize: number
  /** 目標より低い最低入賞額で成立した場合 true */
  minPrizeAdjusted: boolean
  /** 実績の 1位÷2位 倍率（K = 1 のときは null） */
  topRatio: number | null
  /** 最大の隣接倍率 */
  maxAdjacentRatio: number
  /** 同額賞金の最大連続人数 */
  maxTieRun: number
  /** 人数帯の式が示す本来の入賞人数 */
  formulaItmCount: number
  /** 制約が両立せず入賞人数を縮小した場合 true */
  itmCountReduced: boolean
}

export interface PrizeDistributionFailure {
  ok: false
  reason: string
}

export type PrizeDistributionResult = PrizeDistributionSuccess | PrizeDistributionFailure

// ── 入賞人数 K の決定 ───────────────────────────────────────────────────────

export const itmCountByFormula = (n: number): { k: number; bracket: string } => {
  if (n < 40) return { k: Math.max(2, Math.floor(0.5 * n)), bracket: '40名未満（上位50%）' }
  if (n <= 100) return { k: Math.max(2, Math.round(n / 3)), bracket: '40〜100名（上位1/3）' }
  if (n <= 1000) return { k: Math.max(2, Math.floor(0.25 * n)), bracket: '101〜1000名（上位25%）' }
  return { k: Math.max(2, Math.floor(0.15 * n)), bracket: '1001名以上（上位15%）' }
}

/** 同額賞金の連続許容人数（ITM人数の25%未満） */
const tieLimit = (k: number) => Math.max(1, Math.ceil(k / 4) - 1)

// ── 連続モデル（倍率カーブ）─────────────────────────────────────────────────

/**
 * 隣接倍率 r_i = 1 + (√2 - 1) × ((K - i) / (K - 1))^γ から重み w を作る。
 * K が大きいと w の直接乗算が溢れるため log 空間で累積する。
 */
const weights = (k: number, gamma: number): number[] => {
  const logW = new Array<number>(k).fill(0)
  for (let i = k - 2; i >= 0; i--) {
    const rank = i + 1
    const base = (k - rank) / (k - 1)
    const r = 1 + (SQRT2 - 1) * Math.pow(base, gamma)
    logW[i] = logW[i + 1] + Math.log(r)
  }
  const maxLog = logW[0]
  return logW.map((l) => Math.exp(l - maxLog))
}

/** 連続モデルの賞金列（合計 = pool、単位は呼び出し側の単位系） */
const continuousPrizes = (pool: number, k: number, gamma: number): number[] => {
  const w = weights(k, gamma)
  const sum = w.reduce((s, x) => s + x, 0)
  return w.map((x) => (pool * x) / sum)
}

/**
 * 連続モデルの最低賞金 q_K が target になる γ を二分探索する。
 * q_K は γ に対して単調増加（γ が大きいほど下位の倍率が1へ近づく）。
 */
const solveGamma = (pool: number, k: number, target: number): number | null => {
  const minPrize = (g: number) => continuousPrizes(pool, k, g)[k - 1]

  const lo0 = 0.001
  if (minPrize(lo0) >= target) return lo0  // 最も急な傾斜でも目標に届いている

  let lo = lo0
  let hi = 1
  while (minPrize(hi) < target) {
    hi *= 2
    if (hi > 100000) return null  // どれだけ平坦にしても到達できない
  }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2
    if (minPrize(mid) < target) lo = mid
    else hi = mid
  }
  return hi
}

// ── 整数配分（単位系は「1 = unit pt」）──────────────────────────────────────

/** 単調非増加・隣接倍率1.7未満・同額連続L以下 を満たすか */
const isStructurallyValid = (a: number[], l: number): boolean => {
  let run = 1
  for (let i = 0; i < a.length; i++) {
    if (i > 0) {
      if (a[i] > a[i - 1]) return false
      // 整数演算で 1.7 未満を判定（浮動小数の誤差を避ける）
      if (a[i - 1] * 10 >= a[i] * 17) return false
      run = a[i] === a[i - 1] ? run + 1 : 1
      if (run > l) return false
    }
    if (a[i] <= 0) return false
  }
  return true
}

/** i を中心とする同額の連続人数（配列は制約を満たしている前提で、走査は短く済む） */
const runLengthAround = (a: number[], i: number): number => {
  const v = a[i]
  let len = 1
  for (let j = i - 1; j >= 0 && a[j] === v; j--) len++
  for (let j = i + 1; j < a.length && a[j] === v; j++) len++
  return len
}

/**
 * a[i] を delta（±1単位）動かしても制約を保てるかを局所判定する。
 * 全体走査を避けることで、入賞人数が多い場合でも配分が高速に収束する。
 */
const canAdjust = (a: number[], i: number, delta: number, l: number): boolean => {
  const v = a[i] + delta
  if (v <= 0) return false
  if (i > 0 && v > a[i - 1]) return false
  if (i < a.length - 1 && v < a[i + 1]) return false
  if (i > 0 && a[i - 1] * 10 >= v * 17) return false
  if (i < a.length - 1 && v * 10 >= a[i + 1] * 17) return false
  const original = a[i]
  a[i] = v
  const run = runLengthAround(a, i)
  a[i] = original
  return run <= l
}

const maxTieRunOf = (a: number[]): number => {
  let run = 1
  let max = 1
  for (let i = 1; i < a.length; i++) {
    run = a[i] === a[i - 1] ? run + 1 : 1
    if (run > max) max = run
  }
  return max
}

/**
 * 下位から積み上げて整数配分の下限形を作る。
 * 連続賞金の floor を基本とし、単調性・同額人数制限を壊す場合だけ最小限に引き上げる。
 * これにより「丸め後に同額帯を分割する」修正が構造的に不要になる。
 */
const buildStaircase = (q: number[], k: number, minUnits: number, l: number): number[] => {
  const a = new Array<number>(k)
  a[k - 1] = Math.max(minUnits, Math.floor(q[k - 1]))
  let run = 1
  for (let i = k - 2; i >= 0; i--) {
    let v = Math.max(minUnits, Math.floor(q[i]))
    if (v < a[i + 1]) v = a[i + 1]
    // 同額が L 人続いた直後は必ず 1 単位上げて階段にする
    if (v === a[i + 1] && run >= l) v = a[i + 1] + 1
    run = v === a[i + 1] ? run + 1 : 1
    a[i] = v
  }
  return a
}

/**
 * 余りを 1 単位ずつ配る。
 * 候補は制約を壊さない順位に限り、連続賞金との不足量が最大の順位を優先する。
 */
const distributeRemainder = (a: number[], q: number[], remainder: number, l: number): boolean => {
  let left = remainder
  while (left > 0) {
    let best = -1
    let bestDeficit = -Infinity
    let bestTopGap = Infinity
    for (let i = 0; i < a.length; i++) {
      if (!canAdjust(a, i, 1, l)) continue

      const deficit = q[i] - (a[i] + 1)
      // 1位÷2位が √2 から離れないことを次点の基準にする
      const topGap = a.length > 1
        ? Math.abs((i === 0 ? a[0] + 1 : a[0]) / (i === 1 ? a[1] + 1 : a[1]) - SQRT2)
        : 0
      if (
        deficit > bestDeficit + 1e-9 ||
        (Math.abs(deficit - bestDeficit) <= 1e-9 && topGap < bestTopGap - 1e-9)
      ) {
        best = i
        bestDeficit = deficit
        bestTopGap = topGap
      }
    }
    if (best < 0) return false  // これ以上どこにも配れない
    a[best] += 1
    left -= 1
  }
  return true
}

/**
 * 同額帯の分割で総額を超えた分を、上位賞金から 1 単位ずつ回収する。
 * 連続賞金 q から最も上振れしている順位を優先し、
 * 1位・2位の減額は（√2 の倍率を保つため）最後の手段にする。
 */
const reclaimExcess = (a: number[], q: number[], excess: number, l: number): boolean => {
  let left = excess
  while (left > 0) {
    let best = -1
    let bestScore = -Infinity
    for (let i = 0; i < a.length; i++) {
      if (!canAdjust(a, i, -1, l)) continue
      // 上振れが大きいほど優先。上位2順位は強いペナルティを与えて後回しにする
      const score = a[i] - 1 - q[i] - (i <= 1 ? 1e6 : 0)
      if (score > bestScore + 1e-9) {
        best = i
        bestScore = score
      }
    }
    if (best < 0) return false
    a[best] -= 1
    left -= 1
  }
  return true
}

/** 最終検証（賞金総額・優勝3倍超・最低入賞額・倍率・同額人数） */
const validate = (a: number[], poolUnits: number, feeUnits: number, l: number): boolean => {
  if (a.reduce((s, x) => s + x, 0) !== poolUnits) return false
  if (a[0] <= 3 * feeUnits) return false
  if (a[a.length - 1] <= feeUnits) return false
  return isStructurallyValid(a, l)
}

/** 指定した K で成立する配分を探す（B を目標値から 1 単位ずつ下げて試す） */
const solveForK = (
  poolUnits: number,
  feeUnits: number,
  k: number,
  targetUnits: number
): { prizes: number[]; gamma: number; minUnits: number } | null => {
  const l = tieLimit(k)

  if (k === 1) {
    // 総取り。制約（3倍超・倍率）は入賞1名では意味を持たないため検証しない
    return { prizes: [poolUnits], gamma: 0, minUnits: poolUnits }
  }

  for (let b = targetUnits; b >= feeUnits + 1; b--) {
    const gamma = solveGamma(poolUnits, k, b)
    if (gamma === null) continue

    const q = continuousPrizes(poolUnits, k, gamma)
    const a = buildStaircase(q, k, b, l)
    if (!isStructurallyValid(a, l)) continue

    const sum = a.reduce((s, x) => s + x, 0)
    if (sum > poolUnits) {
      // 同額帯を階段化した増額分を上位から回収して総額を合わせる
      if (!reclaimExcess(a, q, sum - poolUnits, l)) continue
    } else if (sum < poolUnits) {
      if (!distributeRemainder(a, q, poolUnits - sum, l)) continue
    }
    if (!validate(a, poolUnits, feeUnits, l)) continue

    return { prizes: a, gamma, minUnits: b }
  }
  return null
}

// ── 公開 API ────────────────────────────────────────────────────────────────

export interface PrizeDistributionInput {
  /** エントリー数（リエントリーを含む延べ人数） */
  entries: number
  /** エントリー費 */
  entryFee: number
  /** 賞金プール（省略時は entries × entryFee） */
  pool?: number
}

/**
 * エントリー数とエントリー費から賞金配分を算出する。
 *
 * 人数帯の式が示す K で全制約を満たせない場合（少人数など）は、
 * 賞金総額を必ず配り切るため K を 1 名ずつ減らして再探索し、
 * 縮小した事実を itmCountReduced で返す。
 */
export const computePrizeDistribution = (input: PrizeDistributionInput): PrizeDistributionResult => {
  const entries = Math.floor(input.entries)
  const entryFee = Math.floor(input.entryFee)
  const pool = Math.floor(input.pool ?? entries * entryFee)

  if (entries < 1) return { ok: false, reason: 'エントリーがありません' }
  if (entryFee <= 0) return { ok: false, reason: 'エントリー費が 0 のため賞金を配分できません' }
  if (pool <= 0) return { ok: false, reason: '賞金プールがありません' }

  // 原則は 10pt 刻み。10pt 刻みでは条件が両立しない場合のみ 1pt 刻みへ落とす
  const units = entryFee % 10 === 0 && pool % 10 === 0 ? [10, 1] : [1]

  const { k: formulaK, bracket } = itmCountByFormula(entries)

  // 入賞人数を保つことを優先し、同じ K の中で刻みの粗い順に試す
  const maxK = Math.min(formulaK, entries)
  for (let k = maxK; k >= 1; k--) {
    for (const unit of units) {
      const targetUnits = Math.ceil((1.25 * entryFee) / unit)
      const solved = solveForK(pool / unit, entryFee / unit, k, targetUnits)
      if (!solved) continue

      const prizes = solved.prizes.map((x) => x * unit)
      const ratios: number[] = []
      for (let i = 0; i < prizes.length - 1; i++) ratios.push(prizes[i] / prizes[i + 1])

      return {
        ok: true,
        entries,
        entryFee,
        pool,
        unit,
        itmCount: k,
        itmRate: k / entries,
        bracket,
        gamma: solved.gamma,
        prizes,
        minPrizeTarget: targetUnits * unit,
        minPrize: prizes[prizes.length - 1],
        minPrizeAdjusted: solved.minUnits * unit < targetUnits * unit,
        topRatio: ratios.length > 0 ? ratios[0] : null,
        maxAdjacentRatio: ratios.length > 0 ? Math.max(...ratios) : 1,
        maxTieRun: maxTieRunOf(prizes),
        formulaItmCount: formulaK,
        itmCountReduced: k < formulaK,
      }
    }
  }

  return {
    ok: false,
    reason: '賞金プールが小さく、条件を満たす配分を作れません',
  }
}

/** 賞金配列を DistributionRule と同じ形へ変換する */
export const toDistributionRules = (prizes: number[]): { rank: number; points: number }[] =>
  prizes.map((points, i) => ({ rank: i + 1, points }))

// ── マッチからの算出ヘルパー ────────────────────────────────────────────────

export interface MatchPrizeSource {
  entryFee: number
  participants: string[]
  reentryFee?: number
  reentries?: Record<string, number>
}

/**
 * マッチの現在のエントリー状況から賞金配分を算出する。
 * リエントリー費がエントリー費と異なる場合もプール総額へ正しく反映する。
 */
export const computeMatchPrizes = (match: MatchPrizeSource): PrizeDistributionResult => {
  const reentries = Object.values(match.reentries ?? {}).reduce((s, n) => s + n, 0)
  const reentryFee = match.reentryFee ?? match.entryFee
  const entries = match.participants.length + reentries
  const pool = match.entryFee * match.participants.length + reentryFee * reentries
  return computePrizeDistribution({ entries, entryFee: match.entryFee, pool })
}
