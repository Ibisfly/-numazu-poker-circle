/**
 * 順位の表示ラベル。
 * バブルラインより下の参加者は順位づけしないため rank = 0 で保存し、
 * 画面上は「Busted」と表記する（NaN位 のような表示を避ける）。
 */
export const formatRank = (rank: number | null | undefined): string =>
  typeof rank === 'number' && Number.isInteger(rank) && rank >= 1 ? `${rank}位` : 'Busted'

/** 順位づけされている（入賞〜バブル）か */
export const isRanked = (rank: number | null | undefined): boolean =>
  typeof rank === 'number' && Number.isInteger(rank) && rank >= 1
