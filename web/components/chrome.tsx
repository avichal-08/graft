'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const REPO = 'https://github.com/avichal-08/graft'

// a small graph: one node branching into two, the graft
export function Mark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="7" fill="#f4f3f1" />
      <path d="M7 7.5 L12 12 M12 12 L17 8 M12 12 L12 17" stroke="#0a0a0b" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="7" cy="7.5" r="2.1" fill="#1f4fd6" />
      <circle cx="17" cy="8" r="2.1" fill="#0a0a0b" />
      <circle cx="12" cy="17.2" r="2.1" fill="#0a0a0b" />
    </svg>
  )
}

const links = [
  ['/connect', 'Connect'],
  ['/playground', 'Playground'],
  ['/benchmarks', 'Benchmarks'],
  ['/docs', 'Docs'],
] as const

export function Nav() {
  const path = usePathname()
  return (
    <nav className="nav">
      <div className="wrap">
        <Link href="/" className="brand"><Mark />graft</Link>
        <div className="nav-links">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={path === href || path.startsWith(`${href}/`) ? 'on' : undefined}>{label}</Link>
          ))}
        </div>
        <div className="nav-end">
          <a className="icon-btn hide-sm" href={REPO} target="_blank" rel="noreferrer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a10.9 10.9 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" /></svg>
            GitHub
          </a>
          <Link className="btn white sm" href="/connect">Get started</Link>
        </div>
      </div>
    </nav>
  )
}

export function Footer() {
  return (
    <footer className="site">
      <div className="wrap">
        <span>graft · the context layer for agents, on a HydraDB graph · MIT</span>
        <span>
          <Link href="/docs">Docs</Link>
          <Link href="/connect">Connect</Link>
          <Link href="/benchmarks">Benchmarks</Link>
          <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
        </span>
      </div>
    </footer>
  )
}
