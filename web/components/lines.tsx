'use client'
import { useState } from 'react'
import { pct, useTip } from './tip'

export type Series = { name: string; color: string; points: number[] }

// line chart with a crosshair tooltip and direct end labels
export function Lines({ series, rounds, ymin = 0.5, ymax = 1 }: { series: Series[]; rounds: number; ymin?: number; ymax?: number }) {
  const { node, show, hide } = useTip()
  const [at, setAt] = useState<number | null>(null)
  const W = 480, H = 240, l = 40, r = 96, t = 10, b = 28
  const x = (i: number) => l + (i / rounds) * (W - l - r)
  const y = (v: number) => t + (1 - (v - ymin) / (ymax - ymin)) * (H - t - b)
  const ticks: number[] = []
  for (let v = ymin; v <= ymax + 1e-9; v += 0.1) ticks.push(Math.round(v * 100) / 100)
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="tasks fully covered per feedback round">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={l} x2={W - r} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={l - 6} y={y(v) + 4} textAnchor="end">{Math.round(v * 100)}%</text>
          </g>
        ))}
        {Array.from({ length: rounds + 1 }, (_, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle">{i}</text>
        ))}
        <text x={W - r + 8} y={H - 8}>round</text>
        {at !== null && <line x1={x(at)} x2={x(at)} y1={t} y2={H - b} stroke="var(--axis)" />}
        {series.map((s) => (
          <g key={s.name}>
            <path d={s.points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
            {s.points.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(p)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />
            ))}
            <text x={x(s.points.length - 1) + 10} y={y(s.points.at(-1)!) + 4} className="ink2">{s.name}</text>
          </g>
        ))}
        <rect
          x={l} y={t} width={W - l - r} height={H - t - b} fill="transparent"
          onMouseMove={(e) => {
            const box = e.currentTarget.ownerSVGElement!.getBoundingClientRect()
            const px = ((e.clientX - box.left) / box.width) * W
            const i = Math.max(0, Math.min(rounds, Math.round(((px - l) / (W - l - r)) * rounds)))
            setAt(i)
            show(e, <><b>round {i}</b>{series.map((s) => <div key={s.name}><span className="sw" style={{ background: s.color }} />{s.name}: {pct(s.points[i]!)}</div>)}</>)
          }}
          onMouseLeave={() => { setAt(null); hide() }}
        />
      </svg>
      {node}
    </>
  )
}
