'use client'
import { barPath, pct, useTip } from './tip'

export type BarRow = { label: string; value: number; detail: string[] }

// horizontal bars for one measure; the highlighted row carries the accent
export function Bars({ rows, highlight }: { rows: BarRow[]; highlight: string }) {
  const { node, show, hide } = useTip()
  const W = 640, rowH = 34, left = 110, right = 60
  const H = rows.length * rowH + 8
  const x = (v: number) => left + v * (W - left - right)
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="share of tasks fully covered per approach">
        {[0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={x(t)} x2={x(t)} y1={0} y2={rows.length * rowH} stroke="var(--grid)" />
        ))}
        <line x1={x(0)} x2={x(0)} y1={0} y2={rows.length * rowH} stroke="var(--axis)" />
        {rows.map((r, i) => {
          const y = i * rowH + 7
          const hl = r.label === highlight
          const w = Math.max(2, x(r.value) - x(0))
          return (
            <g key={r.label}>
              <text x={left - 10} y={y + 15} textAnchor="end" className={hl ? 'ink' : 'ink2'}>{r.label}</text>
              <path d={barPath(x(0), y + 3, w, 18, 4)} fill={hl ? 'var(--s1)' : 'var(--dim)'} />
              <text x={x(0) + w + 8} y={y + 16} className={hl ? 'ink' : 'ink2'}>{pct(r.value)}</text>
              <rect
                x={0} y={y - 4} width={W} height={rowH} fill="transparent"
                onMouseMove={(e) => show(e, <><b>{r.label}</b>{r.detail.map((d) => <div key={d}>{d}</div>)}</>)}
                onMouseLeave={hide}
              />
            </g>
          )
        })}
      </svg>
      {node}
    </>
  )
}
