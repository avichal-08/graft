'use client'
import { useState } from 'react'

export function Code({ children, label }: { children: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {}
  }
  return (
    <div className="code">
      <div className="bar">
        <span>{label ?? ''}</span>
        <button type="button" onClick={copy}>{copied ? 'copied' : 'copy'}</button>
      </div>
      <pre><code>{children}</code></pre>
    </div>
  )
}
