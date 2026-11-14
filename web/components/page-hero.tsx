import type { ReactNode } from 'react'
import { Scene } from './scene'

// short painted banner that opens the product pages
export function PageHero({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <section className="page-hero">
      <Scene id={`ph-${kicker.toLowerCase()}`} land={false} />
      <div className="wrap">
        <span className="glass"><b>{kicker}</b></span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
    </section>
  )
}
