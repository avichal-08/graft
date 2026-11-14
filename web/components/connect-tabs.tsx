'use client'
import { useState } from 'react'
import { Code } from './code'
import { clients, PATH } from '@/lib/clients'

// pick a client, set where graft lives, copy the config
export function ConnectTabs({ compact = false }: { compact?: boolean }) {
  const [id, setId] = useState(clients[0]!.id)
  const [path, setPath] = useState(PATH)
  const c = clients.find((x) => x.id === id)!
  return (
    <div className="connect">
      <div className="tabs" role="tablist">
        {clients.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={x.id === id} className={x.id === id ? 'tab on' : 'tab'} onClick={() => setId(x.id)}>
            {x.name}
          </button>
        ))}
      </div>
      {!compact && (
        <label className="path">
          <span>graft is cloned at</span>
          <input value={path} onChange={(e) => setPath(e.target.value || PATH)} spellCheck={false} />
        </label>
      )}
      <Code label={c.where}>{c.snippet(path)}</Code>
      {c.note && <p className="hint">{c.note}</p>}
    </div>
  )
}
