'use client'
import { barPath, useTip } from './tip'

export type PairRow = { label: string; full: string; cold: number; warm: number; skipped: string[] }

// calls per follow-up task: fresh session on top, with session memory below
export function Pairs({ rows }: { rows: PairRow[] }) {
  const { node, show, hide } = useTip()
  const W = 480, rowH = 30, l = 8, r = 52, labelW = 150
  const max = Math.max(...rows.map((x) => x.cold))
  const unit = (W - l - r - labelW) / max
  const x0 = l + labelW
  return (
    <>
      <svg viewBox={`0 0 ${W} ${rows.length * rowH + 4}`} role="img" aria-label="tool calls per follow-up task">
        {rows.map((row, i) => {
          const y = i * rowH + 4
          return (
            <g key={row.full}>
              <text x={l} y={y + 15} className="ink2">{row.label.length > 22 ? `${row.label.slice(0, 21)}…` : row.label}</text>
              <path d={barPath(x0, y + 2, row.cold * unit, 9, 3)} fill="var(--dim)" />
              <path d={barPath(x0, y + 13, Math.max(2, row.warm * unit), 9, 3)} fill="var(--s1)" />
              <text x={x0 + row.cold * unit + 6} y={y + 18}>{row.cold} → {row.warm}</text>
              <rect
                x={0} y={y} width={W} height={rowH} fill="transparent"
                onMouseMove={(e) => show(e, <><b>{row.full}</b><div>calls: {row.cold} fresh, {row.warm} with session memory</div>{row.skipped.length > 0 && <div>skips {row.skipped.join(', ')}</div>}</>)}
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
