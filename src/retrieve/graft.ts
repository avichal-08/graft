// find_tools: anchor one or two tools per intent in the task, then walk the
// dependency graph in hydradb to pull in whatever produces the entities
// those anchors need and the agent doesn't already have.
import { run, type Row } from '../db.js'
import type { GraphCatalog, ToolNode } from './catalog.js'

export type FindOpts = {
  have?: string[] // entity types the agent already holds (from the task or the session)
  k?: number // max tools returned
  budget?: number // max schema tokens returned
  depth?: number // dependency hops
  anchors?: number // max anchor tools seeded from the text
  fill?: boolean // top up to k with the next best text matches
}

export type Pick = { tool: ToolNode; score: number; why: 'anchor' | 'producer' | 'fill'; for?: string; depth: number; chain: Set<string> }

export type FindResult = {
  picks: Pick[]
  tokens: number
  queries: number
  trace: { clauses: string[]; anchors: string[]; edges: [string, string, string][] }
}

const hop = (rel: string) => `UNWIND $rows AS row MATCH (a {id: row.id})-[:${rel}]->(b) RETURN row.id AS src, b.id AS dst`

async function expand(rel: string, ids: Iterable<number>): Promise<Map<number, number[]>> {
  const rows = [...new Set(ids)].map((id) => ({ id }))
  const out = new Map<number, number[]>()
  if (!rows.length) return out
  for (const r of (await run(hop(rel), { rows })) as { src: number; dst: number }[]) {
    out.set(r.src, [...(out.get(r.src) ?? []), r.dst])
  }
  return out
}

function orIds(alias: string, ids: number[]) {
  const params: Row = {}
  const where = ids.map((id, i) => ((params[`i${i}`] = id), `${alias}.id = $i${i}`)).join(' OR ')
  return { where, params }
}

// "refund jane, then email her and post in #billing" -> three intents
export function clauses(task: string): string[] {
  const parts = task
    .split(/\s*(?:,|;|\bthen\b|\band then\b|\band\b|\balso\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const p of parts) {
    // fragments too short to carry an intent stick to the previous clause
    if (out.length && p.split(/\s+/).length < 3) out[out.length - 1] += ` ${p}`
    else out.push(p)
  }
  return out.length ? out : [task]
}

// lookups are how an agent gets hold of something that already exists;
// anything that writes is a poor way to obtain an input
const READS: Record<string, number> = { get: 1, find: 1, search: 1, lookup: 1, query: 1, read: 1, describe: 1, check: 1, list: 0.6 }
const verb = (t: ToolNode) => {
  const v = t.name.slice(t.server.length + 1).split('_')[0]!
  return READS[v] ?? (v === 'open' ? 0 : -1)
}

export async function findTools(cat: GraphCatalog, task: string, opts: FindOpts = {}): Promise<FindResult> {
  const { k = 10, budget = 4000, depth = 4, anchors: maxAnchors = 5 } = opts
  let queries = 0
  const have = new Set(opts.have ?? [])
  const taskServers = cat.mentionedServers(task)
  const edges: FindResult['trace']['edges'] = []
  const parts = clauses(task)

  // 1. per clause text scores, and the capabilities each clause hits
  const perClause = parts.map((c) => {
    const tool = cat.toolIndex.scores(c)
    const cap = [...cat.capIndex.scores(c).entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 4)
    const servers = cat.mentionedServers(c)
    return { text: c, tool, cap, servers }
  })

  // 2. capability -> tool edges for every clause in one round trip, with learned weights
  const wholeCaps = [...cat.capIndex.scores(task).entries()].filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const capIds = [...new Set([...perClause.flatMap((c) => c.cap), ...wholeCaps].map(([i]) => cat.caps[i]!.id))]
  const sat = new Map<number, { t: number; w: number }[]>()
  if (capIds.length) {
    const { where, params } = orIds('c', capIds)
    const rows = await run(`MATCH (c:Capability)-[r:SATISFIED_BY]->(t:Tool) WHERE ${where} RETURN c.id AS c, t.id AS t, r.w AS w`, params)
    queries++
    for (const r of rows as { c: number; t: number; w: number | null }[]) {
      sat.set(r.c, [...(sat.get(r.c) ?? []), { t: r.t, w: r.w ?? 1 }])
    }
  }

  const rank = (toolText: Float64Array, caps: [number, number][], servers: Set<string>, strong: boolean) => {
    const boost = (t: ToolNode) => (!servers.size ? 1 : servers.has(t.server) ? (strong ? 1.8 : 1.3) : 0.75)
    const score = new Map<number, number>()
    cat.toolList.forEach((t, i) => {
      if (toolText[i]! > 0) score.set(t.id, toolText[i]!)
    })
    for (const [ci, s] of caps) {
      for (const { t, w } of sat.get(cat.caps[ci]!.id) ?? []) score.set(t, (score.get(t) ?? 0) + s * w)
    }
    return [...score.entries()].map(([id, s]) => [id, s * boost(cat.tools.get(id)!)] as const).sort((a, b) => b[1] - a[1])
  }

  const picks = new Map<number, Pick>()
  const anchorIds: number[] = []
  const addAnchor = (id: number, s: number) => {
    if (picks.has(id)) return
    picks.set(id, { tool: cat.tools.get(id)!, score: s, why: 'anchor', depth: 0, chain: new Set() })
    anchorIds.push(id)
  }
  // two tools on one server that share a capability are usually the same intent
  const redundant = (id: number) => anchorIds.some((a) => cat.tools.get(a)!.server === cat.tools.get(id)!.server && overlaps(cat, a, id))

  // each clause gets its best tool, plus a near tie from another server (stripe vs shopify refunds)
  for (const c of perClause) {
    const ranked = rank(c.tool, c.cap, c.servers.size ? c.servers : taskServers, c.servers.size > 0)
    const best = ranked[0]
    if (!best) continue
    addAnchor(best[0], best[1])
    const bestServer = cat.tools.get(best[0])!.server
    const second = ranked.slice(1).find(([id]) => cat.tools.get(id)!.server !== bestServer && overlaps(cat, id, best[0]))
    if (second && second[1] >= best[1] * 0.85) addAnchor(second[0], second[1])
  }

  // then the strongest tools for the task as a whole, which catches intents inside one clause
  const textScore = cat.toolIndex.scores(task)
  const whole = rank(textScore, wholeCaps, taskServers, false)
  const top = whole[0]?.[1] ?? 0
  for (const [id, s] of whole) {
    if (anchorIds.length >= maxAnchors || s < top * 0.5) break
    if (!redundant(id)) addAnchor(id, s)
  }

  // 3. walk needs -> producers, pruning on what the agent already has
  let frontier = anchorIds
  const produced = new Set<string>()
  for (let d = 1; d <= depth && frontier.length; d++) {
    const consumes = await expand('CONSUMES', frontier)
    queries++
    const missing = new Map<number, number[]>() // entity type id -> consumers
    for (const [tid, ets] of consumes) {
      for (const et of ets) {
        const type = cat.types.get(et)
        if (!type || type.free || have.has(type.key) || produced.has(type.key)) continue
        missing.set(et, [...(missing.get(et) ?? []), tid])
      }
    }
    if (!missing.size) break

    const producers = await expand('PRODUCED_BY', missing.keys())
    queries++
    const candidates = [...new Set([...producers.values()].flat())].filter((id) => !picks.has(id))
    const candNeeds = await expand('CONSUMES', candidates)
    queries++

    const next: number[] = []
    for (const [et, consumers] of missing) {
      const type = cat.types.get(et)!
      // types further up this branch: a producer needing any of them would be a cycle
      const chain = new Set([type.key, ...consumers.flatMap((c) => [...(picks.get(c)?.chain ?? [])])])
      const options = (producers.get(et) ?? [])
        .filter((pid) => !consumers.includes(pid))
        .filter((pid) => picks.has(pid) || !(candNeeds.get(pid) ?? []).some((x) => chain.has(cat.types.get(x)?.key ?? '')))
        .map((pid) => {
          if (picks.has(pid)) return { pid, s: 100 }
          const p = cat.tools.get(pid)!
          const unmet = (candNeeds.get(pid) ?? []).filter((x) => {
            const t = cat.types.get(x)
            return t && !t.free && !have.has(t.key) && !produced.has(t.key)
          }).length
          const sameServer = consumers.some((c) => cat.tools.get(c)!.server === p.server)
          // the tool is about this entity: find_channel for a channel, search_customers for a customer
          const noun = type.key.split('.').pop()!
          const named = p.name.includes(noun) ? 1.5 : 0
          // fewer outputs means a more targeted lookup
          const specific = 1 / Math.max(1, cat.givesOf.get(pid)?.size ?? 1)
          // starting from something the task already handed over keeps the chain short
          const grounded = [...(cat.needsOf.get(pid) ?? [])].some((e) => have.has(e)) ? 1 : 0
          const s = 1 + verb(p) + (sameServer ? 2 : 0) + (taskServers.has(p.server) ? 1.5 : 0) + named + specific + grounded
            + Math.min(1, 0.1 * (textScore[cat.toolPos.get(pid)!] ?? 0)) - 0.8 * unmet
          return { pid, s }
        })
        .sort((a, b) => b.s - a.s)

      const best = options[0]
      if (!best) continue
      produced.add(type.key)
      edges.push([cat.tools.get(consumers[0]!)!.key, type.key, cat.tools.get(best.pid)!.key])
      if (!picks.has(best.pid)) {
        picks.set(best.pid, { tool: cat.tools.get(best.pid)!, score: best.s, why: 'producer', for: type.key, depth: d, chain })
        next.push(best.pid)
      }
    }
    frontier = next
  }

  // 4. order: anchors in clause order, then producers nearest first; cut to k and budget
  const ordered = [...picks.values()].sort((a, b) => a.depth - b.depth || (a.why === 'anchor' ? 0 : b.score - a.score))
  const out: Pick[] = []
  let tokens = 0
  for (const p of ordered) {
    if (out.length >= k || tokens + p.tool.tokens > budget) continue
    out.push(p)
    tokens += p.tool.tokens
  }
  if (opts.fill) {
    for (const [id, s] of whole) {
      if (out.length >= k) break
      const tool = cat.tools.get(id)!
      if (picks.has(id) || tokens + tool.tokens > budget) continue
      out.push({ tool, score: s, why: 'fill', depth: depth + 1, chain: new Set() })
      tokens += tool.tokens
    }
  }
  return {
    picks: out,
    tokens,
    queries,
    trace: { clauses: parts, anchors: anchorIds.map((id) => cat.tools.get(id)!.key), edges },
  }
}

function overlaps(cat: GraphCatalog, a: number, b: number) {
  const ca = cat.capsOf.get(a)
  const cb = cat.capsOf.get(b)
  if (!ca || !cb) return false
  for (const x of ca) if (cb.has(x)) return true
  return false
}
