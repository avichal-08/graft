'use client'
import { useState, type ReactNode, type MouseEvent } from 'react'

// one floating tooltip per chart, following the pointer
export function useTip() {
  const [tip, setTip] = useState<{ x: number; y: number; body: ReactNode } | null>(null)
  const show = (e: MouseEvent, body: ReactNode) => setTip({ x: e.clientX + 12, y: e.clientY + 12, body })
  const hide = () => setTip(null)
  const node = tip ? (
    <div className="tip" style={{ left: tip.x, top: tip.y }}>
      {tip.body}
    </div>
  ) : null
  return { node, show, hide }
}

// rounded data end, square on the baseline
export function barPath(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w, h / 2)
  return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`
}

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`
