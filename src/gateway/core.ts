// the gateway an agent talks to. three verbs: find_tools, call_tool and
// recall_entities, plus feedback. everything it knows lives in hydradb.
import { randomUUID } from 'node:crypto'
import { batch, run } from '../db.js'
import { RANGE, REL } from '../graph/schema.js'
import { GraphCatalog, type ToolNode } from '../retrieve/catalog.js'
import { findTools, type Pick } from '../retrieve/graft.js'
import { execute } from './executor.js'
import { typeTerm, wordTerms } from '../learn/hints.js'

export type Known = { type: string; value: string; tool: string }
type Lookup = { task: string; have: Set<string>; picks: Map<number, Pick>; called: Set<number>; at: number }

// multiplicative updates to hint weights, fixed up front rather than tuned on the benchmark
const LR = { hit: 1.15, missed: 1.6, ignored: 0.9, producerHit: 1.2, producerMissed: 1.6, producerWrong: 0.7, failed: 0.9 }

export class Gateway {
  private sessions = new Map<string, number>()
  private known = new Map<number, Map<string, Known>>() // session -> type:value -> entity
  private lookups = new Map<string, Lookup>()
  private next = { session: 0, entity: 0, run: 0 }

  private constructor(public cat: GraphCatalog) {}

  static async open() {
    const g = new Gateway(await GraphCatalog.load())
    const top = async (label: string, base: number) => {
      const rows = await run(`MATCH (n:${label}) RETURN n.id AS id ORDER BY id DESC LIMIT 1`)
      return ((rows[0]?.id as number | undefined) ?? base - 1) + 1
    }
    g.next.session = await top('Session', RANGE.Session)
    g.next.entity = await top('Entity', RANGE.Entity)
    g.next.run = await top('Run', RANGE.Run)
    return g
  }

  tool(nameOrKey: string): ToolNode | undefined {
    return this.cat.toolByKey.get(nameOrKey) ?? this.cat.toolList.find((t) => t.name === nameOrKey)
  }

  async session(name: string): Promise<number> {
    const cached = this.sessions.get(name)
    if (cached !== undefined) return cached
    const rows = await run('MATCH (s:Session) WHERE s.name = $name RETURN s.id AS id', { name })
    let id = rows[0]?.id as number | undefined
    if (id === undefined) {
      id = this.next.session++
      await run('UNWIND $rows AS row MERGE (n {id: row.id}) SET n:Session, n.name = row.name', { rows: [{ id, name }] })
    }
    this.sessions.set(name, id)
    return id
  }

  // entities this session has already resolved, read back from the graph
  async recall(sessionName: string, type?: string): Promise<Known[]> {
    const sid = await this.session(sessionName)
    let mem = this.known.get(sid)
    if (!mem) {
      mem = new Map()
      const rows = await run(
        'MATCH (s:Session {id: $sid})-[:RESOLVED]->(e:Entity) RETURN e.type AS type, e.value AS value, e.tool AS tool',
        { sid },
      )
      for (const r of rows as Known[]) mem.set(`${r.type}:${r.value}`, r)
      this.known.set(sid, mem)
    }
    const all = [...mem.values()]
    return type ? all.filter((e) => e.type === type) : all
  }

  async findTools(input: { task: string; session?: string; have?: string[]; k?: number; budget?: number; lean?: boolean }) {
    const known = input.session ? await this.recall(input.session) : []
    const have = [...new Set([...(input.have ?? []), ...known.map((e) => e.type)])]
    const r = await findTools(this.cat, input.task, { have, k: input.k, budget: input.budget, fill: !input.lean })
    const lookup = randomUUID()
    this.lookups.set(lookup, { task: input.task, have: new Set(have), picks: new Map(r.picks.map((p) => [p.tool.id, p])), called: new Set(), at: Date.now() })
    this.gc()
    return {
      lookup,
      tools: r.picks.map((p) => JSON.parse(p.tool.definition) as { name: string; description: string; inputSchema: unknown }),
      plan: r.picks.map((p) => describe(p)),
      known: known.filter((e) => r.picks.some((p) => this.cat.needsOf.get(p.tool.id)?.has(e.type))),
      tokens: r.tokens,
      graph_queries: r.queries,
      // how the walk got there: anchors, and consumer -> entity type -> producer edges
      trace: { clauses: r.trace.clauses, anchors: r.trace.anchors, edges: r.trace.edges },
    }
  }

  async callTool(input: { name: string; args?: Record<string, unknown>; session?: string; lookup?: string }) {
    const tool = this.tool(input.name)
    if (!tool) throw new Error(`unknown tool ${input.name}`)
    const t0 = performance.now()
    const out = execute({ key: tool.key, gives: [...(this.cat.givesOf.get(tool.id) ?? [])] }, input.args ?? {})
    const runId = this.next.run++
    const writes: Promise<unknown>[] = [
      run('UNWIND $rows AS row MERGE (n {id: row.id}) SET n:Run, n.tool = row.tool, n.ok = row.ok, n.at = row.at', {
        rows: [{ id: runId, tool: tool.key, ok: out.ok, at: Date.now() }],
      }).then(() => run(`UNWIND $rows AS row CREATE (a {id: row.src})-[:${REL.CALLED}]->(b {id: row.dst})`, { rows: [{ src: runId, dst: tool.id }] })),
    ]
    if (input.session && out.entities.length) writes.push(this.remember(input.session, tool, out.entities))
    await Promise.all(writes)
    if (input.lookup) this.lookups.get(input.lookup)?.called.add(tool.id)
    return { ...out, ms: Math.round(performance.now() - t0) }
  }

  private async remember(sessionName: string, tool: ToolNode, produced: { type: string; value: string }[]) {
    const sid = await this.session(sessionName)
    const mem = (await this.recall(sessionName), this.known.get(sid)!)
    const fresh = produced.filter((e) => !mem.has(`${e.type}:${e.value}`))
    if (!fresh.length) return
    const rows = fresh.map((e) => ({ id: this.next.entity++, type: e.type, value: e.value, tool: tool.key, session: sid }))
    await batch('UNWIND $rows AS row MERGE (n {id: row.id}) SET n:Entity, n.type = row.type, n.value = row.value, n.tool = row.tool, n.session = row.session', rows)
    const edge = (rel: string, pairs: { src: number; dst: number }[]) =>
      batch(`UNWIND $rows AS row CREATE (a {id: row.src})-[:${rel}]->(b {id: row.dst})`, pairs)
    await Promise.all([
      edge(REL.RESOLVED, rows.map((r) => ({ src: sid, dst: r.id }))),
      edge(REL.INSTANCE_OF, rows.filter((r) => this.cat.typeByKey.has(r.type)).map((r) => ({ src: r.id, dst: this.cat.typeByKey.get(r.type)!.id }))),
      edge(REL.RESOLVED_BY, rows.map((r) => ({ src: r.id, dst: tool.id }))),
    ])
    for (const r of rows) mem.set(`${r.type}:${r.value}`, { type: r.type, value: r.value, tool: r.tool })
  }

  // the agent says whether the task worked and what it used. word hints learn
  // which tools a phrasing needs, type hints learn which producer to trust for
  // an entity. a tool it needed that graft missed is the strongest signal.
  async feedback(input: { lookup: string; success: boolean; used?: string[] }) {
    const l = this.lookups.get(input.lookup)
    if (!l) throw new Error(`unknown or expired lookup ${input.lookup}`)
    const used = new Set([...l.called, ...(input.used ?? []).map((n) => this.tool(n)?.id).filter((x): x is number => x !== undefined)])
    const terms = wordTerms(l.task)
    const changes: { term: string; tool: number; factor: number }[] = []
    const words = (tool: number, factor: number) => terms.forEach((term) => changes.push({ term, tool, factor }))

    if (!input.success) {
      for (const id of used) if (l.picks.has(id)) words(id, LR.failed)
    } else {
      const needed = new Set<string>()
      for (const id of [...l.picks.keys(), ...used]) for (const e of this.cat.needsOf.get(id) ?? []) if (!l.have.has(e)) needed.add(e)
      const producerFor = new Map<string, number>()
      for (const p of l.picks.values()) if (p.why === 'producer' && p.for) producerFor.set(p.for, p.tool.id)

      for (const id of used) {
        const pick = l.picks.get(id)
        if (pick) {
          words(id, LR.hit)
          if (pick.why === 'producer' && pick.for) changes.push({ term: typeTerm(pick.for), tool: id, factor: LR.producerHit })
          continue
        }
        words(id, LR.missed)
        for (const type of this.cat.givesOf.get(id) ?? []) {
          if (!needed.has(type)) continue
          changes.push({ term: typeTerm(type), tool: id, factor: LR.producerMissed })
          const wrong = producerFor.get(type)
          if (wrong !== undefined && !used.has(wrong)) changes.push({ term: typeTerm(type), tool: wrong, factor: LR.producerWrong })
        }
      }
      for (const [id, p] of l.picks) {
        if (used.has(id)) continue
        // ignored anchors keep their word hints: those words show up in unrelated tasks too
        if (p.why === 'producer' && p.for) changes.push({ term: typeTerm(p.for), tool: id, factor: LR.ignored })
      }
    }
    const updated = await this.cat.hints.update(changes)
    this.lookups.delete(input.lookup)
    return { updated, hints: this.cat.hints.size }
  }

  // forget everything learned from feedback
  async resetLearning() {
    await this.cat.hints.reset()
  }

  private gc() {
    const cutoff = Date.now() - 60 * 60_000
    for (const [k, l] of this.lookups) if (l.at < cutoff) this.lookups.delete(k)
  }
}

function describe(p: Pick) {
  const base = { tool: p.tool.name, key: p.tool.key, kind: p.why }
  if (p.why === 'producer') return { ...base, why: `provides ${p.for}`, step: p.depth }
  if (p.why === 'fill') return { ...base, why: 'related match' }
  return { ...base, why: 'matches the task' }
}
