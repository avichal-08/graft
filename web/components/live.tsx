'use client'
import { useEffect, useState, type FormEvent } from 'react'

type Plan = { tool: string; key: string; kind: string; why: string }
type Result = {
  plan: Plan[]
  tokens: number
  graph_queries: number
  trace: { clauses: string[]; anchors: string[]; edges: [string, string, string][] }
}

const examples: [string, string][] = [
  ['the linear issue ENG-412 was reported by a customer, refund their last payment in stripe', 'linear.issue'],
  ['refund the last charge for jane@acme.com and tell her in an email', 'email'],
  ['post in the #incidents slack channel that checkout is down and page whoever is on call', ''],
  ['zendesk ticket 9912 asks where their shopify order is, look up the order and reply with the tracking link', 'zendesk.ticket'],
]

// type a task, see what find_tools returns and the graph walk that got there
export function Live() {
  const [task, setTask] = useState(examples[0]![0])
  const [have, setHave] = useState(examples[0]![1])
  const [res, setRes] = useState<{ r: Result; ms: number } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(t = task, h = have) {
    setBusy(true)
    setErr(null)
    try {
      const t0 = performance.now()
      const out = await fetch('/api/find_tools', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task: t, have: h.split(',').map((s) => s.trim()).filter(Boolean), lean: true, k: 12 }),
      })
      const body = await out.json()
      if (!out.ok) throw new Error(body.error ?? 'request failed')
      setRes({ r: body as Result, ms: Math.round(performance.now() - t0) })
    } catch (e) {
      setErr((e as Error).message)
      setRes(null)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void run()
    // run the first example once on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    void run()
  }

  return (
    <>
      <form className="live" onSubmit={submit}>
        <input value={task} onChange={(e) => setTask(e.target.value)} aria-label="task" />
        <input className="have" value={have} onChange={(e) => setHave(e.target.value)} placeholder="have, e.g. email" aria-label="entity types the agent already holds" />
        <button type="submit" disabled={busy}>{busy ? 'walking…' : 'find tools'}</button>
      </form>
      <div className="chips">
        {examples.map(([t, h]) => (
          <button key={t} type="button" className="chip" onClick={() => { setTask(t); setHave(h); void run(t, h) }}>
            {t.length > 48 ? `${t.slice(0, 47)}…` : t}
          </button>
        ))}
      </div>
      {err && <p className="meta err">{err}</p>}
      {res && (
        <>
          <p className="meta">{res.r.plan.length} tools, {res.r.tokens} tokens of schema, {res.r.graph_queries} graph queries, {res.ms} ms</p>
          <div className="legend">
            <span><i style={{ background: 'var(--s1)' }} />matched from the task text</span>
            <span><i style={{ background: 'var(--surface)', border: '1px solid var(--axis)' }} />reached by walking the graph, labelled with the entity it provides</span>
          </div>
          <div className="scroll"><Walk r={res.r} /></div>
          <ul className="plan">
            {res.r.plan.map((p) => (
              <li key={p.tool}><code>{p.tool}</code><span className="why">{p.why}</span></li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

// anchors in the first column, then one column per hop, edges labelled by entity type
function Walk({ r }: { r: Result }) {
  const depth = new Map<string, number>()
  for (const a of r.trace.anchors) depth.set(a, 0)
  for (const [c, , p] of r.trace.edges) if (!depth.has(p)) depth.set(p, (depth.get(c) ?? 0) + 1)
  const cols: string[][] = []
  for (const [k, d] of depth) (cols[d] ??= []).push(k)
  const boxW = 170, gap = 110, rowH = 48, boxH = 32
  const colW = boxW + gap
  const W = cols.length * colW - gap + 8
  const H = Math.max(1, ...cols.map((c) => c.length)) * rowH + 8
  const pos = new Map<string, { x: number; y: number }>()
  cols.forEach((c, i) => c.forEach((k, j) => pos.set(k, { x: i * colW + 4, y: j * rowH + 4 })))
  // drawn at natural size; the card scrolls sideways when the walk is deep
  return (
    <svg className="walk" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label="graph walk" style={{ width: W, maxWidth: 'none' }}>
      {r.trace.edges.map(([c, , p], i) => {
        const a = pos.get(c), b = pos.get(p)
        if (!a || !b) return null
        const x1 = a.x + boxW, y1 = a.y + boxH / 2, x2 = b.x, y2 = b.y + boxH / 2
        return <path key={i} d={`M${x1},${y1} C${x1 + 40},${y1} ${x2 - 40},${y2} ${x2},${y2}`} fill="none" stroke="var(--axis)" strokeWidth={1.5} />
      })}
      {r.trace.edges.map(([c, type, p], i) => {
        const a = pos.get(c), b = pos.get(p)
        if (!a || !b) return null
        const mx = b.x - gap / 2, my = b.y + boxH / 2
        const w = Math.min(gap - 6, type.length * 6.2 + 10)
        return (
          <g key={`l${i}`}>
            <rect x={mx - w / 2} y={my - 9} width={w} height={18} rx={9} fill="var(--page)" stroke="var(--grid)" />
            <text x={mx} y={my + 4} textAnchor="middle" style={{ fontSize: 11 }}>{type.length > 16 ? `${type.slice(0, 15)}…` : type}</text>
          </g>
        )
      })}
      {[...pos].map(([k, { x, y }]) => {
        const anchor = depth.get(k) === 0
        return (
          <g key={k}>
            <rect x={x} y={y} width={boxW} height={boxH} rx={6} fill={anchor ? 'var(--s1)' : 'var(--surface)'} stroke={anchor ? 'none' : 'var(--axis)'} />
            <text x={x + 10} y={y + 20} style={{ fill: anchor ? '#fff' : 'var(--ink)' }}>{k.length > 24 ? `${k.slice(0, 23)}…` : k}</text>
          </g>
        )
      })}
    </svg>
  )
}
