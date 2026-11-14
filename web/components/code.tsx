'use client'
import { useState } from 'react'
import { highlight, guessLang, type Lang } from '@/lib/highlight'

const LANG_NAME: Record<Lang, string> = { json: 'JSON', shell: 'Shell', ts: 'TypeScript', python: 'Python', toml: 'TOML', text: 'Text' }

export function Code({ children, label, lang }: { children: string; label?: string; lang?: Lang }) {
  const [copied, setCopied] = useState(false)
  const l = lang ?? guessLang(label, children)
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
        <span className="file">{label && label !== l ? label : LANG_NAME[l]}</span>
        <span className="lang">{label && label !== l ? LANG_NAME[l] : ''}</span>
        <button type="button" onClick={copy} aria-label="copy">
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></svg>
          )}
        </button>
      </div>
      <pre><code dangerouslySetInnerHTML={{ __html: highlight(children, l) }} /></pre>
    </div>
  )
}
