import { useState, useRef } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { ChevronDown, ChevronRight } from '@/components/ui/Icons'

type Section = 'toc' | 'hand' | 'flow' | 'position' | 'action' | 'terms'

const HAND_RANKINGS = [
  { name: 'ロイヤルフラッシュ', desc: '同じスートのA-K-Q-J-10', example: 'A♠ K♠ Q♠ J♠ 10♠', rarity: '超激レア' },
  { name: 'ストレートフラッシュ', desc: '同じスートの5枚連続', example: '9♥ 8♥ 7♥ 6♥ 5♥', rarity: '激レア' },
  { name: 'フォーカード', desc: '同じランク4枚', example: 'K♠ K♥ K♦ K♣ 2♠', rarity: 'レア' },
  { name: 'フルハウス', desc: '3枚＋2枚の同ランク', example: 'Q♠ Q♥ Q♦ 7♣ 7♥', rarity: '' },
  { name: 'フラッシュ', desc: '同じスート5枚', example: 'A♦ J♦ 8♦ 6♦ 2♦', rarity: '' },
  { name: 'ストレート', desc: '5枚連続（スート不問）', example: '10♠ 9♥ 8♣ 7♦ 6♠', rarity: '' },
  { name: 'スリーカード', desc: '同じランク3枚', example: '8♠ 8♥ 8♦ K♣ 4♠', rarity: '' },
  { name: 'ツーペア', desc: '2枚ペア×2組', example: 'J♠ J♥ 5♦ 5♣ 9♠', rarity: '' },
  { name: 'ワンペア', desc: '2枚の同ランク', example: '10♠ 10♥ A♦ 7♣ 3♠', rarity: '' },
  { name: 'ハイカード', desc: '役なし（最も高いカード）', example: 'A♠ K♥ 9♦ 6♣ 2♠', rarity: '' },
]

const PREFLOP_RANGE = {
  premium: ['AA', 'KK', 'QQ', 'AKs', 'AKo'],
  strong: ['JJ', 'TT', 'AQs', 'AQo', 'AJs', 'KQs'],
  playable: ['99', '88', '77', 'ATs', 'AJo', 'KJs', 'QJs', 'JTs'],
  speculative: ['66', '55', '44', '33', '22', 'KTs', 'QTs', 'J9s', 'T9s', '98s', '87s', '76s', 'A5s-A2s'],
}

const TERMS: { term: string; desc: string; category: string }[] = [
  { term: 'ブラインド', desc: '強制ベット。SB（スモールブラインド）とBB（ビッグブラインド）がある。', category: '基本' },
  { term: 'ポジション', desc: 'テーブルでの席順。後ろのポジションほど有利（情報が多い）。', category: '基本' },
  { term: 'UTG', desc: 'Under The Gun。BBの左、最初にアクションする最も不利なポジション。', category: 'ポジション' },
  { term: 'BTN', desc: 'ボタン。ディーラーポジション。ポストフロップで最後にアクションできる最も有利な席。', category: 'ポジション' },
  { term: 'CO', desc: 'カットオフ。ボタンの1つ右。2番目に有利なポジション。', category: 'ポジション' },
  { term: 'MP', desc: 'ミドルポジション。UTGとCOの間。', category: 'ポジション' },
  { term: 'SB', desc: 'スモールブラインド。BTNの左隣。', category: 'ポジション' },
  { term: 'BB', desc: 'ビッグブラインド。SBの左隣。', category: 'ポジション' },
  { term: 'レイズ', desc: '前のベットに上乗せして賭ける。', category: 'アクション' },
  { term: '3bet', desc: 'オープンレイズに対するリレイズ。', category: 'アクション' },
  { term: '4bet', desc: '3betに対するさらなるリレイズ。', category: 'アクション' },
  { term: 'コンティニュエーションベット', desc: 'Cbet。プリフロップでレイズした人がフロップでもベットすること。', category: 'アクション' },
  { term: 'チェックレイズ', desc: 'チェックした後、相手のベットに対してレイズすること。', category: 'アクション' },
  { term: 'ドンクベット', desc: 'プリフロップアグレッサーより先にベットすること。', category: 'アクション' },
  { term: 'ポットオッズ', desc: 'コール額に対するポットの比率。コールすべきかの判断材料。', category: '戦略' },
  { term: 'アウツ', desc: '自分のハンドを完成させるカードの枚数。', category: '戦略' },
  { term: 'エクイティ', desc: '現時点でポットを獲得する確率。', category: '戦略' },
  { term: 'ドロー', desc: 'あと1枚でフラッシュやストレートが完成する状態。', category: 'ハンド' },
  { term: 'セット', desc: 'ポケットペアとボードで作るスリーカード。', category: 'ハンド' },
  { term: 'トリップス', desc: 'ボードのペアと手札で作るスリーカード。', category: 'ハンド' },
  { term: 'ナッツ', desc: 'その状況で可能な最強のハンド。', category: 'ハンド' },
  { term: 'セミブラフ', desc: 'まだ完成していないが改善の可能性があるハンドでブラフすること。', category: '戦略' },
  { term: 'バリュー', desc: '勝っている時に相手からチップを引き出すベット。', category: '戦略' },
  { term: 'ティルト', desc: '感情的になってプレイが乱れている状態。', category: 'その他' },
  { term: 'リバイ', desc: 'リングゲームでチップを追加購入すること。', category: 'その他' },
  { term: 'リエントリー', desc: 'トーナメントで飛んだ後、再度参加すること（許可されている場合）。', category: 'その他' },
]

const TOC_ITEMS = [
  { id: 'hand', label: 'ハンドランキング', desc: '役の強さを覚えよう' },
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

const CommunityCards = ({ count }: { count: number }) => (
  <div className="flex justify-center gap-1 py-2">
    {[0, 1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className={`w-8 h-11 rounded border-2 flex items-center justify-center text-lg ${
          i < count
            ? 'bg-white border-gray-300 text-black'
            : 'bg-swan-card border-swan-border text-swan-muted'
        }`}
      >
        {i < count ? '🂠' : '?'}
      </div>
    ))}
  </div>
)

const Accordion = ({ title, children, defaultOpen = false, id }: { title: string; children: React.ReactNode; defaultOpen?: boolean; id?: string }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div id={id} className="border border-swan-border rounded-xl overflow-hidden scroll-mt-20">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-swan-card text-left"
      >
        <span className="font-semibold text-swan-text">{title}</span>
        {open ? <ChevronDown size={20} className="text-swan-sub" /> : <ChevronRight size={20} className="text-swan-sub" />}
      </button>
      {open && <div className="px-4 py-3 bg-swan-dark">{children}</div>}
    </div>
  )
}

export const GuidePage = () => {
  const [section, setSection] = useState<Section>('toc')
  const [termSearch, setTermSearch] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

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
              <h3 className="font-bold text-swan-text mb-3">🃏 ハンドランキング（役の強さ）</h3>
              <p className="text-xs text-swan-sub mb-4">
                上から順に強い。5枚のカードで最も強い役を作ろう！
              </p>
              <div className="space-y-2">
                {HAND_RANKINGS.map((h, i) => (
                  <div
                    key={h.name}
                    className={`flex items-center gap-2 p-2 rounded-lg ${
                      i < 3 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-swan-dark'
                    }`}
                  >
                    <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0 ${
                      i < 3 ? 'bg-yellow-500 text-black' : 'bg-swan-muted text-swan-text'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-swan-text text-sm">{h.name}</p>
                        {h.rarity && (
                          <span className="text-[10px] text-yellow-400 bg-yellow-500/20 px-1.5 rounded">
                            {h.rarity}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-swan-sub">{h.desc}</p>
                    </div>
                    <p className="text-[10px] text-swan-muted font-mono shrink-0">{h.example}</p>
                  </div>
                ))}
              </div>
            </div>

            <Accordion title="プリフロップハンドレンジ（参考）">
              <div className="space-y-3">
                <p className="text-xs text-swan-sub">
                  最初の2枚（ホールカード）で参加するかの目安。ポジションが後ろほど広く参加できる。
                </p>
                <div className="space-y-2">
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                    <p className="text-xs text-yellow-400 font-semibold mb-1">🔥 プレミアム（どこからでもレイズ）</p>
                    <p className="text-sm text-swan-text font-mono">{PREFLOP_RANGE.premium.join(' ')}</p>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2">
                    <p className="text-xs text-orange-400 font-semibold mb-1">💪 ストロング</p>
                    <p className="text-sm text-swan-text font-mono">{PREFLOP_RANGE.strong.join(' ')}</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2">
                    <p className="text-xs text-green-400 font-semibold mb-1">👍 プレイアブル（中〜後ろポジション）</p>
                    <p className="text-sm text-swan-text font-mono">{PREFLOP_RANGE.playable.join(' ')}</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2">
                    <p className="text-xs text-blue-400 font-semibold mb-1">🎲 投機的（後ろ/安く見れる時）</p>
                    <p className="text-sm text-swan-text font-mono">{PREFLOP_RANGE.speculative.join(' ')}</p>
                  </div>
                </div>
                <p className="text-[10px] text-swan-muted">
                  s = suited（同スート）、o = offsuit（別スート）
                </p>
              </div>
            </Accordion>
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

            <Accordion title="ベットサイズの目安">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-swan-border">
                  <span className="text-swan-text">プリフロップオープン</span>
                  <span className="text-swan-accent font-mono">2.5〜3BB</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-swan-border">
                  <span className="text-swan-text">3bet</span>
                  <span className="text-swan-accent font-mono">3〜4倍</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-swan-border">
                  <span className="text-swan-text">Cbet（フロップ）</span>
                  <span className="text-swan-accent font-mono">ポットの1/3〜2/3</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-swan-text">バリューベット</span>
                  <span className="text-swan-accent font-mono">ポットの1/2〜3/4</span>
                </div>
              </div>
            </Accordion>
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
                    <div key={t.term} className="bg-swan-card border border-swan-border rounded-lg px-3 py-2">
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
