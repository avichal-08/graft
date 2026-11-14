'use client'
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Code } from './code'

type Tool = { name: string; description: string; inputSchema: { properties?: Record<string, { type?: string; description?: string; enum?: string[] }>; required?: string[] } }
type PlanRow = { tool: string; key: string; kind: 'anchor' | 'producer' | 'fill'; why: string; step?: number }
type Result = {
  lookup: string
  tools: Tool[]
  plan: PlanRow[]
  known: { type: string; value: string; tool: string }[]
  tokens: number
  graph_queries: number
  trace: { clauses: string[]; anchors: string[]; edges: [string, string, string][] }
}

const examples: { title: string; task: string; have: string[] }[] = [
  { title: 'Refund from a bug report', task: 'the linear issue ENG-412 was reported by a customer, refund their last payment in stripe', have: ['linear.issue'] },
  { title: 'Refund and notify', task: 'refund the last charge for jane@acme.com and tell her in an email', have: ['email'] },
  { title: 'Incident kickoff', task: 'post in the #incidents slack channel that checkout is down and page whoever is on call', have: [] },
  { title: 'Order status from a ticket', task: 'zendesk ticket 9912 asks where their shopify order is, look up the order and reply with the tracking link', have: ['zendesk.ticket'] },
  { title: 'Ping a deal owner', task: 'tell the owner of the acme deal in hubspot on slack that legal approved it', have: [] },
]
const TYPES = ['email', 'linear.issue', 'github.repo', 'github.pr', 'zendesk.ticket', 'jira.issue', 'shopify.order', 'pagerduty.incident', 'stripe.customer', 'slack.channel']
const KIND_COLOR = { anchor: 'var(--butter)', producer: 'var(--sky)', fill: 'var(--line)' } as const
const DEPTH_COLOR = ['var(--butter)', 'var(--sky)', 'var(--mint)', 'var(--lavender)', 'var(--rose)']

export function Playground({ compact = false }: { compact?: boolean }) {
  const [task, setTask] = useState(examples[0]!.task)
  const [have, setHave] = useState<string[]>(examples[0]!.have)
  const [draft, setDraft] = useState('')
  const [k, setK] = useState(10)
  const [fill, setFill] = useState(false)
  const [res, setRes] = useState<{ r: Result; ms: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'walk' | 'plan' | 'json'>('walk')

  async function run(t = task, h = have) {
    setBusy(true)
    setErr(null)
    try {
      const t0 = performance.now()
      const out = await fetch('/api/find_tools', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task: t, have: h, k, lean: !fill }),
      })
      const body = await out.json()
      if (!out.ok) throw new Error(body.error ?? 'request failed')
      setRes({ r: body as Result, ms: Math.round(performance.now() - t0) })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void run()
    // first example runs once on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addHave = (v: string) => {
    const x = v.trim().replace(/,$/, '')
    if (x && !have.includes(x)) setHave([...have, x])
    setDraft('')
  }
  const onDraftKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addHave(draft)
    } else if (e.key === 'Backspace' && !draft && have.length) setHave(have.slice(0, -1))
  }
  const onTaskKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void run()
  }

  return (
    <div className={compact ? 'pg compact' : 'pg'}>
      <div className="pg-side">
        <label className="fld">
          <span>Task</span>
          <textarea rows={4} value={task} onChange={(e) => setTask(e.target.value)} onKeyDown={onTaskKey} />
        </label>
        <div className="fld">
          <span>Already have</span>
          <div className="tokens">
            {have.map((h) => (
              <button type="button" key={h} className="token" onClick={() => setHave(have.filter((x) => x !== h))} title="remove">
                {h} <i>×</i>
              </button>
            ))}
            <input list="pg-types" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={onDraftKey} onBlur={() => draft && addHave(draft)} placeholder={have.length ? '' : 'email, linear.issue…'} />
            <datalist id="pg-types">{TYPES.map((t) => <option key={t} value={t} />)}</datalist>
          </div>
        </div>
        <div className="fld row-fld">
          <label className="range">
            <span>Max tools <b>{k}</b></span>
            <input type="range" min={4} max={16} value={k} onChange={(e) => setK(Number(e.target.value))} />
          </label>
          <label className="switch">
            <input type="checkbox" checked={fill} onChange={(e) => setFill(e.target.checked)} />
            <span className="track" /> Fill to max
          </label>
        </div>
        <button type="button" className="btn white run" onClick={() => void run()} disabled={busy}>
          {busy ? 'Walking the graph…' : 'Find tools'} <kbd>Ctrl ↵</kbd>
        </button>
        {!compact && (
          <div className="examples">
            <span className="sub-label">Examples</span>
            {examples.map((ex) => (
              <button type="button" key={ex.title} className="example" onClick={() => { setTask(ex.task); setHave(ex.have); void run(ex.task, ex.have) }}>
                <b>{ex.title}</b>
                <span>{ex.task}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pg-main">
        {err ? (
          <div className="pg-empty">
            <b>Couldn&apos;t reach the gateway</b>
            <p>{err}</p>
            <Code label="shell">{'npm run serve   # starts the http api on :7700'}</Code>
          </div>
        ) : !res ? (
          <div className="pg-empty"><div className="skeleton" /><div className="skeleton short" /><div className="skeleton" /></div>
        ) : (
          <>
            <div className="pg-stats">
              <div><b>{res.r.plan.length}</b><span>of 284 tools</span></div>
              <div><b>{res.r.tokens.toLocaleString()}</b><span>schema tokens</span></div>
              <div><b>{res.r.graph_queries}</b><span>graph queries</span></div>
              <div><b>{res.ms} ms</b><span>round trip</span></div>
            </div>
            <div className="pg-tabs" role="tablist">
              {(['walk', 'plan', 'json'] as const).map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'on' : undefined} onClick={() => setTab(t)}>
                  {t === 'walk' ? 'Walk' : t === 'plan' ? 'Plan' : 'Response'}
                </button>
              ))}
              {res.r.known.length > 0 && <span className="known">{res.r.known.length} known from session</span>}
            </div>
            <div className={busy ? 'pg-body busy' : 'pg-body'}>
              {tab === 'walk' && <Walk r={res.r} />}
              {tab === 'plan' && <Plan r={res.r} />}
              {tab === 'json' && <Code label="response">{JSON.stringify(res.r, null, 2)}</Code>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Plan({ r }: { r: Result }) {
  const [open, setOpen] = useState<string | null>(null)
  const byName = new Map(r.tools.map((t) => [t.name, t]))
  return (
    <ol className="plan2">
      {r.plan.map((p, i) => {
        const t = byName.get(p.tool)
        const props = Object.entries(t?.inputSchema.properties ?? {})
        const req = new Set(t?.inputSchema.required ?? [])
        const isOpen = open === p.tool
        return (
          <li key={p.tool} className={isOpen ? 'open' : undefined}>
            <button type="button" onClick={() => setOpen(isOpen ? null : p.tool)}>
              <span className="n">{i + 1}</span>
              <code>{p.tool}</code>
              <span className="kind" style={{ background: KIND_COLOR[p.kind] }}>{p.kind === 'anchor' ? 'from task' : p.kind === 'producer' ? p.why.replace('provides ', '') : 'related'}</span>
              <span className="chev">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && t && (
              <div className="detail">
                <p>{t.description}</p>
                <table>
                  <tbody>
                    {props.map(([name, s]) => (
                      <tr key={name}>
                        <td><code>{name}</code>{req.has(name) && <em>required</em>}</td>
                        <td className="ty">{s.enum ? s.enum.join(' | ') : s.type}</td>
                        <td>{s.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// top-down walk that fits its container: anchors first, each row one hop further
function Walk({ r }: { r: Result }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(el.clientWidth))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const depth = new Map<string, number>()
  for (const a of r.trace.anchors) if (r.plan.some((p) => p.key === a)) depth.set(a, 0)
  for (const [c, , p] of r.trace.edges) if (!depth.has(p) && depth.has(c)) depth.set(p, depth.get(c)! + 1)
  const rows: string[][] = []
  for (const [k, d] of depth) (rows[d] ??= []).push(k)
  const rowH = 104, nodeH = 36, top = 18
  const H = rows.length * rowH - (rowH - nodeH) + top * 2
  const pos = new Map<string, { x: number; y: number; w: number }>()
  rows.forEach((row, d) =>
    row.forEach((k, i) => {
      const w = Math.min(width / row.length - 16, k.length * 7.4 + 30)
      pos.set(k, { x: (width * (i + 1)) / (row.length + 1), y: top + d * rowH, w })
    }),
  )
  const label = (k: string, w: number) => {
    const max = Math.floor((w - 24) / 7.4)
    return k.length > max ? `${k.slice(0, max - 1)}…` : k
  }

  return (
    <div className="walk2" ref={ref}>
      <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label="graph walk">
        <defs>
          <marker id="wk-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M1,1 L9,5 L1,9 Z" fill="#5a5964" />
          </marker>
        </defs>
        {r.trace.edges.map(([c, type, p], i) => {
          const a = pos.get(c), b = pos.get(p)
          if (!a || !b) return null
          const x1 = a.x, y1 = a.y + nodeH, x2 = b.x, y2 = b.y - 3
          const my = (y1 + y2) / 2, mx = (x1 + x2) / 2
          const lw = type.length * 6.3 + 16
          return (
            <g key={i}>
              <path d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`} fill="none" stroke="#3d3c45" strokeWidth="1.6" markerEnd="url(#wk-head)" />
              <rect x={mx - lw / 2} y={my - 10} width={lw} height={20} rx={10} fill="#16161a" stroke="#2c2b32" />
              <text x={mx} y={my + 4} textAnchor="middle" className="edge">{type}</text>
            </g>
          )
        })}
        {[...pos].map(([k, { x, y, w }]) => {
          const d = depth.get(k)!
          return (
            <g key={k}>
              <rect x={x - w / 2} y={y} width={w} height={nodeH} rx={nodeH / 2} fill={DEPTH_COLOR[Math.min(d, 3)]} />
              <text x={x} y={y + 22.5} textAnchor="middle" className="node">{label(k, w)}</text>
            </g>
          )
        })}
      </svg>
      <div className="legend">
        <span><i style={{ background: 'var(--butter)' }} />from the task text</span>
        <span><i style={{ background: 'var(--sky)' }} />1 hop</span>
        <span><i style={{ background: 'var(--mint)' }} />2 hops</span>
        <span><i style={{ background: 'var(--lavender)' }} />3+ hops</span>
        <span className="dim">edges are labelled with the entity passed along</span>
      </div>
    </div>
  )
}
