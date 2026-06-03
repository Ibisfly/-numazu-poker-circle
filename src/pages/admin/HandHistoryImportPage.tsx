import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AdminShell } from './AdminDashboardPage'
import { ChevronLeft, Upload, Check, AlertCircle } from '@/components/ui/Icons'
import { useAuth } from '@/lib/hooks/useAuth'
import { importHandHistories } from '@/lib/firebase/firestore'
import { Timestamp } from 'firebase/firestore'
import type { HandHistory, HandPlayer, HandAction, HandWinner } from '@/types'

interface ImportHandJson {
  handNumber: number
  playedAt?: string
  timestamp?: string
  blinds: { sb: number; bb: number; ante?: number }
  players: {
    uid: string | null
    displayName: string
    seatNumber: number
    position: string
    startingStack: number
    holeCards: [string, string]
  }[]
  actions: {
    preflop: { uid: string | null; displayName: string; action: string; amount?: number; isAllIn?: boolean }[]
    flop?: { uid: string | null; displayName: string; action: string; amount?: number; isAllIn?: boolean }[]
    turn?: { uid: string | null; displayName: string; action: string; amount?: number; isAllIn?: boolean }[]
    river?: { uid: string | null; displayName: string; action: string; amount?: number; isAllIn?: boolean }[]
  }
  board: {
    flop?: [string, string, string]
    turn?: string
    river?: string
  }
  pot: number
  winners: { uid: string | null; displayName: string; amount: number; hand?: string }[]
}

interface ImportJson {
  hands: ImportHandJson[]
}

const validateAction = (action: string): action is HandAction['action'] =>
  ['fold', 'check', 'call', 'bet', 'raise', 'all-in'].includes(action)

const parseHandJson = (json: ImportJson): Omit<HandHistory, 'id' | 'importedAt'>[] => {
  return json.hands.map((h) => {
    const playedAtStr = h.playedAt || h.timestamp || new Date().toISOString()
    return {
      handNumber: h.handNumber,
      playedAt: Timestamp.fromDate(new Date(playedAtStr)),
      blinds: h.blinds,
      players: h.players.map((p): HandPlayer => ({
        uid: p.uid,
        displayName: p.displayName,
        seatNumber: p.seatNumber,
        position: p.position,
        startingStack: p.startingStack,
        holeCards: p.holeCards,
      })),
      actions: {
        preflop: h.actions.preflop.map((a): HandAction => ({
          uid: a.uid,
          displayName: a.displayName,
          action: validateAction(a.action) ? a.action : 'fold',
          amount: a.amount,
          isAllIn: a.isAllIn,
        })),
        flop: h.actions.flop?.map((a): HandAction => ({
          uid: a.uid,
          displayName: a.displayName,
          action: validateAction(a.action) ? a.action : 'fold',
          amount: a.amount,
          isAllIn: a.isAllIn,
        })),
        turn: h.actions.turn?.map((a): HandAction => ({
          uid: a.uid,
          displayName: a.displayName,
          action: validateAction(a.action) ? a.action : 'fold',
          amount: a.amount,
          isAllIn: a.isAllIn,
        })),
        river: h.actions.river?.map((a): HandAction => ({
          uid: a.uid,
          displayName: a.displayName,
          action: validateAction(a.action) ? a.action : 'fold',
          amount: a.amount,
          isAllIn: a.isAllIn,
        })),
      },
      board: h.board,
      pot: h.pot,
      winners: h.winners.map((w): HandWinner => ({
        uid: w.uid,
        displayName: w.displayName,
        amount: w.amount,
        hand: w.hand,
      })),
      importedBy: '',
    }
  })
}

export const HandHistoryImportPage = () => {
  const { user } = useAuth()
  const [jsonInput, setJsonInput] = useState('')
  const [preview, setPreview] = useState<Omit<HandHistory, 'id' | 'importedAt'>[] | null>(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null)

  const handleParse = () => {
    setError('')
    setPreview(null)
    setResult(null)
    try {
      const json = JSON.parse(jsonInput) as ImportJson
      if (!json.hands || !Array.isArray(json.hands)) {
        throw new Error('JSONに "hands" 配列が必要です')
      }
      const parsed = parseHandJson(json)
      setPreview(parsed)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'JSONのパースに失敗しました')
    }
  }

  const handleImport = async () => {
    if (!preview || !user) return
    setImporting(true)
    setError('')
    try {
      const count = await importHandHistories(preview, user.uid)
      setResult({ success: true, count })
      setPreview(null)
      setJsonInput('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'インポートに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  if (!user) return null

  return (
    <AdminShell title="ハンド履歴インポート">
      <div className="py-4 space-y-4">
        <Link to="/admin" className="text-xs text-swan-accent flex items-center gap-1">
          <ChevronLeft size={14} /> ダッシュボード
        </Link>

        <div className="bg-swan-card border border-swan-border rounded-xl p-4 space-y-3">
          <div>
            <label className="text-xs text-swan-sub block mb-1">JSON入力</label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"hands": [...]}'
              className="w-full bg-swan-black border border-swan-border rounded-lg px-3 py-2 text-sm text-swan-text font-mono focus:outline-none focus:border-swan-accent resize-none"
              rows={12}
            />
          </div>

          <button
            onClick={handleParse}
            disabled={!jsonInput.trim()}
            className="w-full bg-swan-accent/20 text-swan-accent border border-swan-accent/40 font-bold py-2 rounded-xl text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            プレビュー
          </button>

          {error && (
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 border border-red-400/30 rounded-lg p-3">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && result.success && (
            <div className="flex items-center gap-2 text-green-400 text-sm bg-green-400/10 border border-green-400/30 rounded-lg p-3">
              <Check size={16} />
              <span>{result.count}件のハンドをインポートしました</span>
            </div>
          )}
        </div>

        {preview && preview.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-swan-accent">
              プレビュー ({preview.length}件)
            </h3>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {preview.map((hand, idx) => (
                <div key={idx} className="bg-swan-card border border-swan-border rounded-xl p-3 text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">Hand #{hand.handNumber}</span>
                    <span className="text-swan-sub text-xs">
                      {hand.blinds.sb}/{hand.blinds.bb}
                      {hand.blinds.ante ? ` (ante ${hand.blinds.ante})` : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {hand.players.map((p, i) => (
                      <span
                        key={i}
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          p.uid ? 'bg-swan-accent/20 text-swan-accent' : 'bg-swan-muted text-swan-sub'
                        }`}
                      >
                        {p.displayName} ({p.position})
                        <span className="ml-1 opacity-60">{p.holeCards.join('')}</span>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-swan-sub">
                    <span>Board:</span>
                    {hand.board.flop && <span className="font-mono">{hand.board.flop.join(' ')}</span>}
                    {hand.board.turn && <span className="font-mono">{hand.board.turn}</span>}
                    {hand.board.river && <span className="font-mono">{hand.board.river}</span>}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-swan-border">
                    <span className="text-swan-sub">Pot: {hand.pot}</span>
                    <span className="text-green-400">
                      Winner: {hand.winners.map((w) => w.displayName).join(', ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-swan-accent text-black font-bold py-3 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            >
              <Upload size={16} />
              {importing ? 'インポート中...' : `${preview.length}件をインポート`}
            </button>
          </div>
        )}

        <div className="bg-swan-dark border border-swan-border rounded-xl p-4">
          <h4 className="text-xs font-semibold text-swan-sub mb-2">JSONフォーマット例</h4>
          <pre className="text-[10px] text-swan-muted overflow-x-auto whitespace-pre-wrap font-mono">
{`{
  "hands": [{
    "handNumber": 15,
    "playedAt": "2026-06-04T19:30:00",
    "blinds": { "sb": 25, "bb": 50 },
    "players": [
      { "uid": "abc123", "displayName": "たろう",
        "seatNumber": 1, "position": "BTN",
        "startingStack": 5000,
        "holeCards": ["As", "Kh"] }
    ],
    "actions": {
      "preflop": [
        { "uid": "abc123", "displayName": "たろう",
          "action": "raise", "amount": 150 }
      ],
      "flop": [...],
      "turn": [...],
      "river": [...]
    },
    "board": {
      "flop": ["Ah", "7c", "2d"],
      "turn": "Ks",
      "river": "3h"
    },
    "pot": 700,
    "winners": [
      { "uid": "def456", "displayName": "みすず",
        "amount": 700 }
    ]
  }]
}`}
          </pre>
        </div>
      </div>
    </AdminShell>
  )
}
