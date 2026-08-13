import { useState } from 'react'
import type { TimerLevel } from '@/types'
import {
  Plus, X, Coffee, Wand2, ChevronUp, ChevronDown, Copy,
} from '@/components/ui/Icons'
import {
  breakLevel, emptyLevel, formatDuration, generateStructure, minutesUntilLevel,
  playLevelNumber, roundBlind, totalMinutes,
} from '@/lib/liveTimer/structure'

/**
 * ストラクチャー編集。
 * 「1行ずつ手入力」は運用に耐えないので、自動生成 → 部分修正を主動線にしている。
 */
export const StructureEditor = ({
  levels,
  onChange,
  currentIndex,
}: {
  levels: TimerLevel[]
  onChange: (levels: TimerLevel[]) => void
  currentIndex?: number
}) => {
  const [genOpen, setGenOpen] = useState(levels.length === 0)
  const [gen, setGen] = useState({
    levelCount: 15, minutes: 20, startSb: 100, growth: 1.4,
    anteFromLevel: 4, breakEvery: 4, breakMinutes: 10,
  })

  const patch = (i: number, next: Partial<TimerLevel>) =>
    onChange(levels.map((l, idx) => (idx === i ? { ...l, ...next } : l)))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= levels.length) return
    const next = [...levels]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  const remove = (i: number) => onChange(levels.filter((_, idx) => idx !== i))

  const duplicate = (i: number) =>
    onChange([...levels.slice(0, i + 1), { ...levels[i] }, ...levels.slice(i + 1)])

  /** 追加時は直前レベルの続きになる値を初期値にする（毎回入力させない） */
  const addLevel = () => {
    const lastPlay = [...levels].reverse().find((l) => !l.isBreak)
    const base = lastPlay
      ? { ...lastPlay, sb: roundBlind(lastPlay.sb * 1.4), bb: roundBlind(lastPlay.sb * 1.4) * 2 }
      : emptyLevel()
    onChange([...levels, base])
  }

  const total = totalMinutes(levels)

  return (
    <div className="tm-stack">
      {/* ── 自動生成 ── */}
      <div className="tm-card tm-frame">
        <div className="tm-spread" style={{ marginBottom: genOpen ? 14 : 0 }}>
          <div>
            <p className="tm-eyebrow">GENERATOR</p>
            <p className="tm-note" style={{ marginTop: 4 }}>条件を入れて一括生成 → 気になる行だけ直す</p>
          </div>
          <button type="button" className="tm-btn tm-btn--sm" onClick={() => setGenOpen((v) => !v)}>
            <Wand2 size={13} /> {genOpen ? '閉じる' : '開く'}
          </button>
        </div>

        {genOpen && (
          <>
            <div className="tm-grid" data-cols="3">
              <NumField label="レベル数" value={gen.levelCount} min={2} max={40}
                onChange={(v) => setGen({ ...gen, levelCount: v })} />
              <NumField label="1レベルの分数" value={gen.minutes} min={1} max={90}
                onChange={(v) => setGen({ ...gen, minutes: v })} />
              <NumField label="開始SB" value={gen.startSb} min={5} step={25}
                onChange={(v) => setGen({ ...gen, startSb: v })} />
              <label className="tm-field">
                <span>上昇率</span>
                <select className="tm-select" value={gen.growth}
                  onChange={(e) => setGen({ ...gen, growth: Number(e.target.value) })}>
                  <option value={1.25}>ゆるやか (×1.25)</option>
                  <option value={1.4}>標準 (×1.4)</option>
                  <option value={1.5}>速い (×1.5)</option>
                  <option value={1.65}>ハイパー (×1.65)</option>
                </select>
              </label>
              <NumField label="アンティ開始Lv (0=なし)" value={gen.anteFromLevel} min={0} max={40}
                onChange={(v) => setGen({ ...gen, anteFromLevel: v })} />
              <NumField label="休憩間隔 (0=なし)" value={gen.breakEvery} min={0} max={20}
                onChange={(v) => setGen({ ...gen, breakEvery: v })} />
              <NumField label="休憩の分数" value={gen.breakMinutes} min={1} max={60}
                onChange={(v) => setGen({ ...gen, breakMinutes: v })} />
            </div>
            <button
              type="button"
              className="tm-btn tm-btn--gold tm-btn--wide"
              style={{ marginTop: 14 }}
              onClick={() => { onChange(generateStructure(gen)); setGenOpen(false) }}
            >
              <Wand2 size={14} /> このストラクチャーを生成する
            </button>
            {levels.length > 0 && (
              <p className="tm-note" style={{ marginTop: 8 }}>※ 生成すると現在の {levels.length} レベルは置き換わります</p>
            )}
          </>
        )}
      </div>

      {/* ── レベル表 ── */}
      <div className="tm-card">
        <div className="tm-spread" style={{ marginBottom: 12 }}>
          <p className="tm-eyebrow">STRUCTURE</p>
          <p className="tm-note">
            {levels.filter((l) => !l.isBreak).length} レベル ／ 所要 {formatDuration(total)}
          </p>
        </div>

        {levels.length === 0 ? (
          <p className="tm-note tm-center" style={{ padding: '22px 0' }}>
            レベルがありません。上の GENERATOR から生成してください。
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="tm-table">
              <thead>
                <tr>
                  <th style={{ width: 52 }}>Lv</th>
                  <th>SB</th>
                  <th>BB</th>
                  <th>Ante</th>
                  <th style={{ width: 62 }}>分</th>
                  <th style={{ width: 58 }}>開始</th>
                  <th style={{ width: 118 }} />
                </tr>
              </thead>
              <tbody>
                {levels.map((l, i) => (
                  <tr
                    key={i}
                    data-break={l.isBreak ? 'true' : 'false'}
                    data-now={currentIndex === i ? 'true' : 'false'}
                    style={{ animationDelay: `${Math.min(i * 22, 420)}ms` }}
                  >
                    <td style={{ textAlign: 'left' }}>
                      {l.isBreak ? <Coffee size={13} style={{ verticalAlign: -2 }} /> : playLevelNumber(levels, i)}
                    </td>
                    {l.isBreak ? (
                      <td colSpan={3} style={{ textAlign: 'left' }}>
                        <input
                          className="tm-input"
                          value={l.note ?? '休憩'}
                          onChange={(e) => patch(i, { note: e.target.value })}
                          placeholder="休憩・チップカラーアップ 等"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                        />
                      </td>
                    ) : (
                      <>
                        <td>
                          <CellNum value={l.sb} onChange={(v) => patch(i, { sb: v, bb: v * 2 })} />
                        </td>
                        <td>
                          <CellNum value={l.bb} onChange={(v) => patch(i, { bb: v })} />
                        </td>
                        <td>
                          <CellNum value={l.ante} onChange={(v) => patch(i, { ante: v })} />
                        </td>
                      </>
                    )}
                    <td>
                      <CellNum value={l.minutes} onChange={(v) => patch(i, { minutes: Math.max(1, v) })} />
                    </td>
                    <td style={{ color: 'var(--fg-faint)', fontSize: 11 }}>
                      +{minutesUntilLevel(levels, i)}分
                    </td>
                    <td>
                      <span className="tm-row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap', gap: 3 }}>
                        <IconBtn label="上へ" onClick={() => move(i, -1)}><ChevronUp size={13} /></IconBtn>
                        <IconBtn label="下へ" onClick={() => move(i, 1)}><ChevronDown size={13} /></IconBtn>
                        <IconBtn label="複製" onClick={() => duplicate(i)}><Copy size={12} /></IconBtn>
                        <IconBtn label="削除" onClick={() => remove(i)}><X size={13} /></IconBtn>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="tm-row" style={{ marginTop: 14 }}>
          <button type="button" className="tm-btn tm-btn--sm" onClick={addLevel}>
            <Plus size={13} /> レベル追加
          </button>
          <button type="button" className="tm-btn tm-btn--sm" onClick={() => onChange([...levels, breakLevel()])}>
            <Coffee size={13} /> 休憩追加
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 小物 ─────────────────────────────────────────────────────────────────────

const CellNum = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <input
    className="tm-input"
    data-num="true"
    type="number"
    value={value}
    onChange={(e) => onChange(Number(e.target.value) || 0)}
    style={{ padding: '4px 6px', fontSize: 13, textAlign: 'right', minWidth: 62 }}
  />
)

const IconBtn = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick} title={label} aria-label={label}
    className="tm-btn tm-btn--ghost" style={{ padding: 4, width: 24, height: 24 }}>
    {children}
  </button>
)

export const NumField = ({
  label, value, onChange, min, max, step, suffix,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}) => (
  <label className="tm-field">
    <span>{label}</span>
    <span style={{ position: 'relative', display: 'block' }}>
      <input
        className="tm-input"
        data-num="true"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
      {suffix && (
        <i style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, letterSpacing: '.14em', color: 'var(--fg-faint)', fontStyle: 'normal',
        }}>{suffix}</i>
      )}
    </span>
  </label>
)
