'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// "on this page": reads the article's h2s, gives them ids, follows the reader
export function Toc() {
  const path = usePathname()
  const [items, setItems] = useState<{ id: string; text: string }[]>([])
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    const hs = [...document.querySelectorAll<HTMLHeadingElement>('.prose h2')]
    for (const h of hs) if (!h.id) h.id = slug(h.textContent ?? '')
    setItems(hs.map((h) => ({ id: h.id, text: h.textContent ?? '' })))
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        const first = hs.find((h) => seen.get(h.id))
        if (first) setActive(first.id)
      },
      { rootMargin: '-80px 0px -60% 0px' },
    )
    hs.forEach((h) => io.observe(h))
    return () => io.disconnect()
  }, [path])

  if (items.length < 2) return <aside className="toc" />
  return (
    <aside className="toc">
      <h4>On this page</h4>
      {items.map((it) => (
        <a key={it.id} href={`#${it.id}`} className={it.id === active ? 'on' : undefined}>{it.text}</a>
      ))}
    </aside>
  )
}
