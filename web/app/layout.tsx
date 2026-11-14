import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Nav, Footer } from '@/components/chrome'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'graft: the tools a task needs, nothing else', template: '%s · graft' },
  description: 'An MCP gateway that keeps your agent’s tools and resolved entities in a HydraDB graph and returns only what each task needs.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  )
}
