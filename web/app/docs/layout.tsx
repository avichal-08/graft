import type { ReactNode } from 'react'
import { DocsNav, Pager } from '@/components/docs-nav'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="wrap docs">
      <DocsNav />
      <article className="prose">
        {children}
        <Pager />
      </article>
    </main>
  )
}
