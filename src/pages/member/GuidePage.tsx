import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { ChevronRight } from '@/components/ui/Icons'
import { POKER_TERMS } from '@/lib/glossary'

type Section = 'toc' | 'hand' | 'flow' | 'position' | 'action' | 'terms'

type CardSuit = 'spade' | 'heart' | 'diamond' | 'club'
type CardData = { rank: string; suit: CardSuit }

const SUIT_COLORS: Record<CardSuit, string> = {
  spade: 'text-gray-800',
  heart: 'text-red-500',
  diamond: 'text-blue-500',
  club: 'text-green-600',
}

const SUIT_SYMBOLS: Record<CardSuit, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
}

const PlayingCard = ({ rank, suit }: CardData) => (
  <div className={`w-9 h-12 bg-white rounded-md border border-gray-300 flex flex-col items-center justify-center shadow-sm ${SUIT_COLORS[suit]}`}>
    <span className="text-sm font-bold leading-none">{rank}</span>
    <span className="text-base leading-none">{SUIT_SYMBOLS[suit]}</span>
  </div>
)

const CardHand = ({ cards }: { cards: CardData[] }) => (
  <div className="flex gap-1 justify-center py-2">
    {cards.map((c, i) => (
      <PlayingCard key={i} {...c} />
    ))}
  </div>
)

const HAND_RANKINGS: { name: string; desc: string; cards: CardData[]; isRare: boolean }[] = [
  { name: 'ロイヤルフラッシュ', desc: '同じスートのA-K-Q-J-10', cards: [
    { rank: 'A', suit: 'spade' }, { rank: 'K', suit: 'spade' }, { rank: 'Q', suit: 'spade' }, { rank: 'J', suit: 'spade' }, { rank: '10', suit: 'spade' }
  ], isRare: true },
  { name: 'ストレートフラッシュ', desc: '同じスートの5枚連続', cards: [
    { rank: '9', suit: 'heart' }, { rank: '8', suit: 'heart' }, { rank: '7', suit: 'heart' }, { rank: '6', suit: 'heart' }, { rank: '5', suit: 'heart' }
  ], isRare: true },
  { name: 'フォーカード', desc: '同じランク4枚', cards: [
    { rank: 'K', suit: 'spade' }, { rank: 'K', suit: 'heart' }, { rank: 'K', suit: 'diamond' }, { rank: 'K', suit: 'club' }, { rank: '2', suit: 'spade' }
  ], isRare: true },
  { name: 'フルハウス', desc: '3枚＋2枚の同ランク', cards: [
    { rank: 'Q', suit: 'spade' }, { rank: 'Q', suit: 'heart' }, { rank: 'Q', suit: 'diamond' }, { rank: '7', suit: 'club' }, { rank: '7', suit: 'heart' }
  ], isRare: false },
  { name: 'フラッシュ', desc: '同じスート5枚', cards: [
    { rank: 'A', suit: 'diamond' }, { rank: 'J', suit: 'diamond' }, { rank: '8', suit: 'diamond' }, { rank: '6', suit: 'diamond' }, { rank: '2', suit: 'diamond' }
  ], isRare: false },
  { name: 'ストレート', desc: '5枚連続（スート不問）', cards: [
    { rank: '10', suit: 'spade' }, { rank: '9', suit: 'heart' }, { rank: '8', suit: 'club' }, { rank: '7', suit: 'diamond' }, { rank: '6', suit: 'spade' }
  ], isRare: false },
  { name: 'スリーカード', desc: '同じランク3枚', cards: [
    { rank: '8', suit: 'spade' }, { rank: '8', suit: 'heart' }, { rank: '8', suit: 'diamond' }, { rank: 'K', suit: 'club' }, { rank: '4', suit: 'spade' }
  ], isRare: false },
  { name: 'ツーペア', desc: '2枚ペア×2組', cards: [
    { rank: 'J', suit: 'spade' }, { rank: 'J', suit: 'heart' }, { rank: '5', suit: 'diamond' }, { rank: '5', suit: 'club' }, { rank: '9', suit: 'spade' }
  ], isRare: false },
  { name: 'ワンペア', desc: '2枚の同ランク', cards: [
    { rank: '10', suit: 'spade' }, { rank: '10', suit: 'heart' }, { rank: 'A', suit: 'diamond' }, { rank: '7', suit: 'club' }, { rank: '3', suit: 'spade' }
  ], isRare: false },
  { name: 'ハイカード', desc: '役なし（最も高いカード）', cards: [
    { rank: 'A', suit: 'spade' }, { rank: 'K', suit: 'heart' }, { rank: '9', suit: 'diamond' }, { rank: '6', suit: 'club' }, { rank: '2', suit: 'spade' }
  ], isRare: false },
]

const TERMS = POKER_TERMS

const TOC_ITEMS = [
  { id: 'hand', label: '役の強さ', desc: '役とハンドレンジを覚えよう' },
  { id: 'flow', label: 'ゲームの進行', desc: '1ハンドの流れを理解' },
  { id: 'position', label: 'ポジション', desc: '席順と有利不利' },
  { id: 'action', label: 'アクション', desc: 'ベット・レイズ・フォールド' },
  { id: 'terms', label: '用語集', desc: '困ったらここを検索' },
]

const PokerTable = ({ highlight }: { highlight?: string }) => (
  <div className="relative w-full aspect-[2/1] max-w-xs mx-auto">
    {/* テーブル */}
    <div className="absolute inset-4 bg-green-800 rounded-full border-4 border-amber-900" />
    {/* ポジション */}
    {[
      { pos: 'BTN', x: '85%', y: '50%', desc: 'ボタン' },
      { pos: 'SB', x: '70%', y: '15%', desc: 'スモールブラインド' },
      { pos: 'BB', x: '30%', y: '15%', desc: 'ビッグブラインド' },
      { pos: 'UTG', x: '10%', y: '35%', desc: 'アンダーザガン' },
      { pos: 'MP', x: '10%', y: '65%', desc: 'ミドル' },
      { pos: 'CO', x: '70%', y: '85%', desc: 'カットオフ' },
    ].map(({ pos, x, y }) => (
      <div
        key={pos}
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
          highlight === pos
            ? 'bg-swan-accent text-black scale-125 ring-2 ring-yellow-300'
            : 'bg-swan-card text-swan-text border border-swan-border'
        }`}
        style={{ left: x, top: y }}
      >
        {pos}
      </div>
    ))}
    {/* ディーラーボタン */}
    <div className="absolute left-[75%] top-[50%] transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full text-[8px] font-bold text-black flex items-center justify-center">
      D
    </div>
  </div>
)

const GameFlowDiagram = ({ step }: { step: number }) => {
  const steps = ['配布', 'プリフロップ', 'フロップ', 'ターン', 'リバー', 'ショーダウン']
  return (
    <div className="flex items-center justify-between gap-1 py-2 overflow-x-auto">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div
            className={`shrink-0 w-12 h-12 rounded-full flex flex-col items-center justify-center text-[9px] font-medium transition-all ${
              i + 1 === step
                ? 'bg-swan-accent text-black scale-110'
                : i + 1 < step
                ? 'bg-green-600 text-white'
                : 'bg-swan-card text-swan-sub border border-swan-border'
            }`}
          >
            <span className="font-bold">{i + 1}</span>
            <span>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-2 h-0.5 ${i + 1 < step ? 'bg-green-600' : 'bg-swan-border'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

const SAMPLE_BOARD: CardData[] = [
  { rank: 'K', suit: 'heart' },
  { rank: '9', suit: 'spade' },
  { rank: '4', suit: 'diamond' },
  { rank: '2', suit: 'club' },
  { rank: 'J', suit: 'heart' },
]

const CommunityCards = ({ count }: { count: number }) => (
  <div className="flex justify-center gap-1 py-2">
    {SAMPLE_BOARD.slice(0, 5).map((card, i) => (
      i < count ? (
        <PlayingCard key={i} {...card} />
      ) : (
        <div key={i} className="w-9 h-12 rounded-md border-2 border-swan-border bg-swan-card flex items-center justify-center text-swan-muted text-lg">
          ?
        </div>
      )
    ))}
  </div>
)

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

const getHandColor = (row: number, col: number): string => {
  const r1 = RANKS[row]
  const r2 = RANKS[col]

  if (row === col) {
    const pair = r1 + r1
    if (['AA', 'KK', 'QQ'].includes(pair)) return 'bg-blue-900 text-white'
    if (['JJ', 'TT', '99'].includes(pair)) return 'bg-red-500 text-white'
    if (['88', '77', '66'].includes(pair)) return 'bg-yellow-400 text-black'
    if (['55', '44'].includes(pair)) return 'bg-green-500 text-white'
    if (['33', '22'].includes(pair)) return 'bg-cyan-400 text-black'
  }

  if (row < col) {
    const suited = r1 + r2 + 's'
    if (suited === 'AKs') return 'bg-blue-900 text-white'
    if (['AQs', 'AJs', 'ATs', 'KQs'].includes(suited)) return 'bg-red-500 text-white'
    if (['KJs', 'QJs', 'JTs', 'A9s', 'A8s', 'A5s', 'KTs', 'K9s', 'QTs'].includes(suited)) return 'bg-yellow-400 text-black'
    if (['A7s', 'A6s', 'A4s', 'A3s', 'A2s', 'Q9s', 'J9s', 'T9s', 'T8s', '98s', 'K8s', 'Q8s', 'K7s'].includes(suited)) return 'bg-green-500 text-white'
    if (['K6s', 'K5s', 'K4s', 'K3s', 'K2s', 'Q7s', 'Q6s', 'Q5s', 'Q4s', 'Q3s', 'J8s', 'J7s', 'J6s', 'T7s', '97s', '87s', '76s', '65s', '54s'].includes(suited)) return 'bg-cyan-400 text-black'
    if (['Q2s', 'J5s', 'J4s', 'J3s', 'J2s', 'T6s', 'T5s', 'T4s', 'T3s', 'T2s', '96s', '95s', '86s', '85s', '75s', '74s', '64s', '53s', '43s'].includes(suited)) return 'bg-white text-black'
    return 'bg-gray-600 text-gray-300'
  }

  if (row > col) {
    const offsuit = r2 + r1 + 'o'
    if (offsuit === 'AKo') return 'bg-blue-900 text-white'
    if (['AQo', 'KQo'].includes(offsuit)) return 'bg-red-500 text-white'
    if (['AJo', 'KJo', 'ATo'].includes(offsuit)) return 'bg-yellow-400 text-black'
    if (['QJo', 'KTo', 'A9o'].includes(offsuit)) return 'bg-green-500 text-white'
    if (['JTo', 'A8o', 'A7o', 'A6o', 'K9o', 'QTo', 'Q9o', 'J9o', 'T9o'].includes(offsuit)) return 'bg-cyan-400 text-black'
    if (['A2o', 'A3o', 'A4o', 'A5o', 'K8o', 'K7o', 'K6o', 'K5o', 'Q8o', 'Q7o', 'J8o', 'T8o', '97o', '87o', '98o'].includes(offsuit)) return 'bg-white text-black'
    return 'bg-gray-600 text-gray-300'
  }

  return 'bg-gray-600 text-gray-300'
}

const HandRangeGrid = () => (
  <div className="space-y-3">
    <div className="overflow-x-auto">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `auto repeat(13, minmax(22px, 1fr))` }}>
        <div />
        {RANKS.map((r) => (
          <div key={`h-${r}`} className="text-center text-[9px] font-bold text-swan-sub py-0.5">{r}</div>
        ))}
        {RANKS.map((r1, row) => (
          <>
            <div key={`v-${r1}`} className="text-center text-[9px] font-bold text-swan-sub pr-0.5 flex items-center justify-center">{r1}</div>
            {RANKS.map((r2, col) => {
              const hand = row === col ? r1 + r1 : row < col ? r1 + r2 + 's' : r2 + r1 + 'o'
              return (
                <div
                  key={`${row}-${col}`}
                  className={`aspect-square flex items-center justify-center text-[7px] font-medium rounded-sm ${getHandColor(row, col)}`}
                >
                  {hand.replace('s', '').replace('o', '')}
                </div>
              )
            })}
          </>
        ))}
      </div>
    </div>
    <div className="flex items-center gap-2 text-[10px] text-swan-sub">
      <span>強い</span>
      <div className="flex-1 flex h-3 rounded overflow-hidden">
        <div className="flex-1 bg-blue-900" />
        <div className="flex-1 bg-red-500" />
        <div className="flex-1 bg-yellow-400" />
        <div className="flex-1 bg-green-500" />
        <div className="flex-1 bg-cyan-400" />
        <div className="flex-1 bg-white border-y border-swan-border" />
        <div className="flex-1 bg-gray-600" />
      </div>
      <span>弱い</span>
    </div>
    <p className="text-[9px] text-swan-muted">
      上三角 = suited（同スート）/ 下三角 = offsuit（別スート）/ 対角線 = ペア
    </p>
  </div>
)

export const GuidePage = () => {
  const [searchParams] = useSearchParams()
  const [section, setSection] = useState<Section>('toc')
  const [termSearch, setTermSearch] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)
  const [highlightedTerm, setHighlightedTerm] = useState<string | null>(null)

  useEffect(() => {
    const sectionParam = searchParams.get('section')
    const termParam = searchParams.get('term')

    if (sectionParam && ['toc', 'hand', 'flow', 'position', 'action', 'terms'].includes(sectionParam)) {
      setSection(sectionParam as Section)
    }

    if (termParam) {
      setSection('terms')
      setHighlightedTerm(termParam)
      setTimeout(() => {
        const termElement = document.getElementById(`term-${termParam}`)
        if (termElement) {
          termElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => setHighlightedTerm(null), 2000)
        }
      }, 200)
    }
  }, [searchParams])

  const scrollToSection = (id: string) => {
    setSection(id as Section)
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const filteredTerms = TERMS.filter(
    (t) =>
      t.term.toLowerCase().includes(termSearch.toLowerCase()) ||
      t.desc.toLowerCase().includes(termSearch.toLowerCase())
  )

  const groupedTerms = filteredTerms.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {} as Record<string, typeof TERMS>)

  return (
    <AppShell title="ガイドブック">
      <div className="py-4" ref={contentRef}>
        {/* セクションタブ */}
        <div className="flex gap-1 overflow-x-auto pb-3 mb-4">
          {[
            { key: 'toc', label: '目次' },
            { key: 'hand', label: 'ハンド' },
            { key: 'flow', label: '進行' },
            { key: 'position', label: 'ポジション' },
            { key: 'action', label: 'アクション' },
            { key: 'terms', label: '用語集' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSection(key as Section)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                section === key
                  ? 'bg-swan-accent text-black'
                  : 'bg-swan-card text-swan-sub border border-swan-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 目次 */}
        {section === 'toc' && (
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-green-500/20 to-yellow-500/20 rounded-xl p-4 border border-green-500/30">
              <h2 className="font-bold text-swan-text mb-1">📖 ポーカーガイドブック</h2>
              <p className="text-xs text-swan-sub">
                テキサスホールデムの基本を学ぼう！
                困ったときは用語集で検索してね。
              </p>
            </div>

            {TOC_ITEMS.map(({ id, label, desc }) => (
              <button
                key={id}
                onClick={() => scrollToSection(id)}
                className="w-full flex items-center justify-between bg-swan-card border border-swan-border rounded-xl px-4 py-3 hover:border-swan-accent transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-swan-text">{label}</p>
                  <p className="text-xs text-swan-sub">{desc}</p>
                </div>
                <ChevronRight size={20} className="text-swan-sub" />
              </button>
            ))}
          </div>
        )}

        {/* ハンドランキング */}
        {section === 'hand' && (
          <div className="space-y-4" id="hand">
            <div className="bg-swan-card border border-swan-border rounded-xl p-4">
              <h3 className="font-bold text-swan-text mb-3">🃏 役の強さ</h3>
              <p className="text-xs text-swan-sub mb-4">
                上から順に強い。5枚のカードで最も強い役を作ろう！
              </p>
              <div className="space-y-3">
                {HAND_RANKINGS.map((h, i) => (
                  <div
                    key={h.name}
                    className={`p-3 rounded-lg ${
                      h.isRare ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-swan-dark'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                        h.isRare ? 'bg-yellow-500 text-black' : 'bg-swan-muted text-swan-text'
                      }`}>
                        {i + 1}
                      </span>
                      <p className="font-semibold text-swan-text text-sm">{h.name}</p>
                      {h.isRare && (
                        <span className="text-[10px] text-yellow-400 bg-yellow-500/20 px-1.5 rounded">
                          超激レア！
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-swan-sub mb-2">{h.desc}</p>
                    <CardHand cards={h.cards} />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-swan-card border border-swan-border rounded-xl p-4">
              <h3 className="font-bold text-swan-text mb-3">📊 ハンドレンジ表</h3>
              <p className="text-xs text-swan-sub mb-4">
                最初の2枚（ホールカード）で参加するかの目安。色が濃いほど強いハンド。
              </p>
              <HandRangeGrid />
            </div>
          </div>
        )}

        {/* ゲーム進行 */}
        {section === 'flow' && (
          <div className="space-y-4" id="flow">
            <div className="bg-swan-card border border-swan-border rounded-xl p-4">
              <h3 className="font-bold text-swan-text mb-3">🎯 ゲームの進行</h3>
              <p className="text-xs text-swan-sub mb-4">
                1ハンドは6つのステップで進行します。
              </p>
              <GameFlowDiagram step={0} />
            </div>

            {[
              { step: 1, title: '① カード配布', desc: '各プレイヤーに2枚のホールカード（手札）を配る。この2枚は自分だけが見れる。', cards: 0 },
              { step: 2, title: '② プリフロップ', desc: 'BBの左（UTG）から順にアクション。コール/レイズ/フォールドを選択。', cards: 0 },
              { step: 3, title: '③ フロップ', desc: 'コミュニティカード3枚をオープン。SBから順にアクション。', cards: 3 },
              { step: 4, title: '④ ターン', desc: '4枚目のコミュニティカードをオープン。', cards: 4 },
              { step: 5, title: '⑤ リバー', desc: '5枚目（最後）のコミュニティカードをオープン。', cards: 5 },
              { step: 6, title: '⑥ ショーダウン', desc: '残ったプレイヤーでハンドを比較。最強の役が勝利！', cards: 5 },
            ].map(({ step, title, desc, cards }) => (
              <div key={step} className="bg-swan-card border border-swan-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-swan-accent text-black font-bold flex items-center justify-center text-sm">
                    {step}
                  </div>
                  <h4 className="font-semibold text-swan-text">{title}</h4>
                </div>
                <p className="text-sm text-swan-sub mb-3">{desc}</p>
                {cards > 0 && (
                  <>
                    <p className="text-xs text-swan-muted mb-1">コミュニティカード:</p>
                    <CommunityCards count={cards} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ポジション */}
        {section === 'position' && (
          <div className="space-y-4" id="position">
            <div className="bg-swan-card border border-swan-border rounded-xl p-4">
              <h3 className="font-bold text-swan-text mb-3">🪑 ポジション</h3>
              <p className="text-xs text-swan-sub mb-4">
                席順によって有利・不利がある。後ろのポジションほど情報が多く有利！
              </p>
              <PokerTable />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { pos: 'BTN', name: 'ボタン', desc: '最も有利。最後にアクションできる。', color: 'green' },
                { pos: 'CO', name: 'カットオフ', desc: '2番目に有利。BTNがフォールドすれば最後。', color: 'green' },
                { pos: 'MP', name: 'ミドル', desc: '中間。状況に応じてプレイ。', color: 'yellow' },
                { pos: 'UTG', name: 'アンダーザガン', desc: '最初にアクション。最も不利。', color: 'red' },
                { pos: 'SB', name: 'スモールブラインド', desc: 'ポストフロップで最初。強制ベットあり。', color: 'red' },
                { pos: 'BB', name: 'ビッグブラインド', desc: 'プリフロップは最後。強制ベットあり。', color: 'yellow' },
              ].map(({ pos, name, desc, color }) => (
                <div
                  key={pos}
                  className={`bg-swan-card border rounded-xl p-3 ${
                    color === 'green' ? 'border-green-500/30' :
                    color === 'yellow' ? 'border-yellow-500/30' :
                    'border-red-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      color === 'green' ? 'bg-green-500 text-black' :
                      color === 'yellow' ? 'bg-yellow-500 text-black' :
                      'bg-red-500 text-white'
                    }`}>
                      {pos}
                    </span>
                    <span className="font-semibold text-swan-text text-sm">{name}</span>
                  </div>
                  <p className="text-[10px] text-swan-sub">{desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-swan-dark border border-swan-border rounded-xl p-4">
              <h4 className="font-semibold text-swan-text mb-2 text-sm">アクション順序</h4>
              <div className="flex items-center gap-1 flex-wrap">
                {['UTG', '→', 'MP', '→', 'CO', '→', 'BTN', '→', 'SB', '→', 'BB'].map((item, i) => (
                  item === '→' ? (
                    <span key={i} className="text-swan-muted text-xs">→</span>
                  ) : (
                    <span key={i} className="px-2 py-1 bg-swan-card rounded text-xs font-medium text-swan-text">
                      {item}
                    </span>
                  )
                ))}
              </div>
              <p className="text-[10px] text-swan-muted mt-2">
                プリフロップはUTGから、ポストフロップはSBから順にアクション
              </p>
            </div>
          </div>
        )}

        {/* アクション */}
        {section === 'action' && (
          <div className="space-y-4" id="action">
            <div className="bg-swan-card border border-swan-border rounded-xl p-4">
              <h3 className="font-bold text-swan-text mb-3">🎬 アクション</h3>
              <p className="text-xs text-swan-sub mb-4">
                自分の番でできる行動。状況に応じて選択しよう。
              </p>
            </div>

            {[
              { name: 'フォールド', icon: '🏳️', desc: '降りる。カードを捨ててそのハンドから撤退。', when: 'ハンドが弱い/相手が強そうな時' },
              { name: 'チェック', icon: '✋', desc: 'パス。ベットせずに次の人へ。', when: '誰もベットしていない時のみ可能' },
              { name: 'コール', icon: '📞', desc: '前のベットと同額を出す。', when: '参加したいがレイズするほどでもない時' },
              { name: 'ベット', icon: '💰', desc: 'そのラウンド最初に賭ける。', when: '強いハンド/ブラフしたい時' },
              { name: 'レイズ', icon: '📈', desc: '前のベットに上乗せする。', when: '強いハンド/相手を降ろしたい時' },
              { name: 'オールイン', icon: '🔥', desc: '全チップを賭ける。', when: '絶対の自信/後がない時' },
            ].map(({ name, icon, desc, when }) => (
              <div key={name} className="bg-swan-card border border-swan-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{icon}</span>
                  <span className="font-semibold text-swan-text">{name}</span>
                </div>
                <p className="text-sm text-swan-sub mb-2">{desc}</p>
                <p className="text-xs text-swan-muted">使うタイミング: {when}</p>
              </div>
            ))}

            <div className="bg-gradient-to-br from-swan-accent/10 to-yellow-500/10 border border-swan-accent/30 rounded-xl p-4 space-y-4">
              <h3 className="font-bold text-swan-accent flex items-center gap-2">
                📐 ベットサイズの目安
              </h3>

              <div className="space-y-3">
                <div className="bg-swan-card/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">1</span>
                    <span className="font-semibold text-swan-text">プリフロップ</span>
                  </div>
                  <p className="text-sm text-swan-sub mb-2">
                    基本的に<span className="text-swan-accent font-semibold">レイズして参加</span>しよう！
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-swan-dark rounded px-2 py-1.5">
                      <span className="text-swan-muted">オープン</span>
                      <span className="block text-swan-accent font-mono font-bold">BB × 2〜3倍</span>
                    </div>
                    <div className="bg-swan-dark rounded px-2 py-1.5">
                      <span className="text-swan-muted">3bet</span>
                      <span className="block text-swan-accent font-mono font-bold">相手の 3〜4倍</span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-swan-sub flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-cyan-400"></span>
                      オープンは<span className="text-cyan-400 font-semibold">水色</span>以上が目安
                    </p>
                    <p className="text-[10px] text-swan-sub flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-yellow-400"></span>
                      3betは<span className="text-yellow-400 font-semibold">黄色</span>以上が目安
                    </p>
                  </div>
                  <button
                    onClick={() => setSection('hand')}
                    className="mt-2 text-[10px] text-swan-accent underline underline-offset-2"
                  >
                    → ハンドレンジ表を見る
                  </button>
                </div>

                <div className="bg-swan-card/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">2</span>
                    <span className="font-semibold text-swan-text">ポストフロップのベット</span>
                  </div>
                  <p className="text-sm text-swan-sub mb-2">
                    ポットの<span className="text-swan-accent font-semibold">33%〜100%</span>を目安に！
                  </p>
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="bg-swan-dark rounded px-2 py-1.5 text-center">
                      <span className="text-swan-muted block">小</span>
                      <span className="text-green-400 font-mono font-bold">33%</span>
                    </div>
                    <div className="bg-swan-dark rounded px-2 py-1.5 text-center">
                      <span className="text-swan-muted block">中</span>
                      <span className="text-yellow-400 font-mono font-bold">50〜75%</span>
                    </div>
                    <div className="bg-swan-dark rounded px-2 py-1.5 text-center">
                      <span className="text-swan-muted block">大</span>
                      <span className="text-red-400 font-mono font-bold">100%~</span>
                    </div>
                  </div>
                </div>

                <div className="bg-swan-card/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">3</span>
                    <span className="font-semibold text-swan-text">オールイン</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 font-bold shrink-0">▸</span>
                      <p className="text-swan-sub">
                        プリフロップで<span className="text-red-400 font-semibold">10BB以下</span>なら即オールイン！
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 font-bold shrink-0">▸</span>
                      <p className="text-swan-sub">
                        フロップ以降、スタックが<span className="text-red-400 font-semibold">ポットの半分以下</span>ならオールイン！
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-swan-sub mt-2 flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm bg-green-500"></span>
                    オールインは<span className="text-green-400 font-semibold">緑</span>以上が目安
                  </p>
                  <button
                    onClick={() => setSection('hand')}
                    className="mt-1 text-[10px] text-swan-accent underline underline-offset-2"
                  >
                    → ハンドレンジ表を見る
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 用語集 */}
        {section === 'terms' && (
          <div className="space-y-4" id="terms">
            <div className="bg-swan-card border border-swan-border rounded-xl p-4">
              <h3 className="font-bold text-swan-text mb-3">📚 用語集</h3>
              <input
                type="text"
                value={termSearch}
                onChange={(e) => setTermSearch(e.target.value)}
                placeholder="用語を検索..."
                className="w-full bg-swan-dark border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text placeholder-swan-muted"
              />
            </div>

            {Object.entries(groupedTerms).map(([category, terms]) => (
              <div key={category}>
                <h4 className="text-xs font-semibold text-swan-accent mb-2 uppercase tracking-wide">
                  {category}
                </h4>
                <div className="space-y-1">
                  {terms.map((t) => (
                    <div
                      key={t.term}
                      id={`term-${t.term}`}
                      className={`bg-swan-card border rounded-lg px-3 py-2 transition-all scroll-mt-24 ${
                        highlightedTerm === t.term
                          ? 'border-swan-accent ring-2 ring-swan-accent/50'
                          : 'border-swan-border'
                      }`}
                    >
                      <p className="font-semibold text-swan-text text-sm">{t.term}</p>
                      <p className="text-xs text-swan-sub">{t.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredTerms.length === 0 && (
              <p className="text-center text-swan-sub py-8">
                「{termSearch}」に一致する用語が見つかりません
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}
