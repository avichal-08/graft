import type { ReactNode } from 'react'
import { DocsNav, Pager, Crumb } from '@/components/docs-nav'
import { Toc } from '@/components/toc'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="wrap docs">
      <DocsNav />
      <article className="prose">
        <Crumb />
        {children}
        <Pager />
      </article>
      <Toc />
    </main>
  )
}
