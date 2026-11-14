'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const sections: { title: string; pages: [string, string][] }[] = [
  { title: 'Start', pages: [['/docs', 'Quickstart'], ['/docs/mcp', 'Connect a client']] },
  { title: 'Use', pages: [['/docs/tools', 'Tool reference'], ['/docs/http', 'HTTP API'], ['/docs/agent', 'Agent loop']] },
  { title: 'Understand', pages: [['/docs/concepts', 'Concepts'], ['/docs/catalog', 'Adding tools'], ['/docs/config', 'Configuration']] },
]
const flat = sections.flatMap((s) => s.pages)

export function DocsNav() {
  const path = usePathname()
  return (
    <aside className="side">
      {sections.map((s) => (
        <div key={s.title} style={{ display: 'contents' }}>
          <h4>{s.title}</h4>
          {s.pages.map(([href, label]) => (
            <Link key={href} href={href} className={path === href ? 'on' : undefined}>{label}</Link>
          ))}
        </div>
      ))}
    </aside>
  )
}

export function Pager() {
  const path = usePathname()
  const i = flat.findIndex(([h]) => h === path)
  const prev = i > 0 ? flat[i - 1] : undefined
  const next = i >= 0 && i < flat.length - 1 ? flat[i + 1] : undefined
  return (
    <div className="pager">
      {prev ? <Link href={prev[0]}><span>previous</span>{prev[1]}</Link> : <i />}
      {next ? <Link href={next[0]} style={{ textAlign: 'right' }}><span>next</span>{next[1]}</Link> : <i />}
    </div>
  )
}
