import type { ReactNode } from 'react'

// numbered setup steps joined by a line
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="tl">{children}</ol>
}

export function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li>
      <h3>{title}</h3>
      {children}
    </li>
  )
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'tip' | 'warn'; title?: string; children: ReactNode }) {
  return (
    <div className={`callout ${tone}`}>
      <span className="ico" aria-hidden="true">{tone === 'warn' ? '!' : tone === 'tip' ? '✓' : 'i'}</span>
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  )
}
