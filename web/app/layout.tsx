import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'graft',
  description: 'Tool and context routing for agents, backed by a HydraDB graph.',
}

// apply a saved theme before paint so the toggle never flashes
const themeScript = `try{var t=localStorage.getItem('graft-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
