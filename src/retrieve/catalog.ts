// the gateway's view of the graph: id <-> key maps and text indexes, all
// loaded from hydradb at boot. nothing here reads the source catalog files.
import { run } from '../db.js'
import { BM25 } from './bm25.js'

export type ToolNode = { id: number; key: string; name: string; server: string; description: string; definition: string; tokens: number; w: number }
export type TypeNode = { id: number; key: string; free: boolean }
export type CapNode = { id: number; key: string }

export class GraphCatalog {
  tools = new Map<number, ToolNode>()
  toolByKey = new Map<string, ToolNode>()
  types = new Map<number, TypeNode>()
  typeByKey = new Map<string, TypeNode>()
  caps: CapNode[] = []
  servers: { key: string; title: string }[] = []
  toolList: ToolNode[] = []
  toolIndex!: BM25
  toolDocs: string[] = [] // text each tool is indexed under, in toolList order
  capIndex!: BM25
  toolPos = new Map<number, number>()
  capsOf = new Map<number, Set<number>>() // tool id -> capability ids
  needsOf = new Map<number, Set<string>>() // tool id -> entity type keys it consumes
  givesOf = new Map<number, Set<string>>() // tool id -> non-free entity type keys it produces

  static async load() {
    const c = new GraphCatalog()
    const [tools, types, caps, servers, sat, cons, prod] = await Promise.all([
      run('MATCH (t:Tool) RETURN t.id AS id, t.key AS key, t.name AS name, t.server AS server, t.description AS description, t.definition AS definition, t.tokens AS tokens, t.w AS w'),
      run('MATCH (e:EntityType) RETURN e.id AS id, e.key AS key, e.free AS free'),
      run('MATCH (c:Capability) RETURN c.id AS id, c.key AS key'),
      run('MATCH (s:Server) RETURN s.key AS key, s.title AS title'),
      run('MATCH (c:Capability)-[:SATISFIED_BY]->(t:Tool) RETURN c.id AS c, t.id AS t'),
      run('MATCH (t:Tool)-[:CONSUMES]->(e:EntityType) RETURN t.id AS t, e.key AS e'),
      run('MATCH (e:EntityType)-[:PRODUCED_BY]->(t:Tool) RETURN t.id AS t, e.key AS e'),
    ])
    for (const r of prod as { t: number; e: string }[]) {
      if (!c.givesOf.has(r.t)) c.givesOf.set(r.t, new Set())
      c.givesOf.get(r.t)!.add(r.e)
    }
    for (const r of cons as { t: number; e: string }[]) {
      if (!c.needsOf.has(r.t)) c.needsOf.set(r.t, new Set())
      c.needsOf.get(r.t)!.add(r.e)
    }
    for (const r of sat as { c: number; t: number }[]) {
      if (!c.capsOf.has(r.t)) c.capsOf.set(r.t, new Set())
      c.capsOf.get(r.t)!.add(r.c)
    }
    for (const r of tools as ToolNode[]) {
      r.w ??= 1 // learned from feedback, 1 until a tool has history
      c.tools.set(r.id, r)
      c.toolByKey.set(r.key, r)
    }
    for (const r of types as TypeNode[]) {
      c.types.set(r.id, r)
      c.typeByKey.set(r.key, r)
    }
    c.caps = caps as CapNode[]
    c.servers = servers as { key: string; title: string }[]
    c.toolList = [...c.tools.values()].sort((a, b) => a.id - b.id)
    c.toolList.forEach((t, i) => c.toolPos.set(t.id, i))
    const capKey = new Map(c.caps.map((x) => [x.id, x.key]))
    c.toolDocs = c.toolList.map((t) => {
      const caps = [...(c.capsOf.get(t.id) ?? [])].map((id) => capKey.get(id)).join(', ')
      return `${t.name.replace(/_/g, ' ')}. ${t.description} (${t.server}) ${caps}`
    })
    c.toolIndex = new BM25(c.toolDocs)
    c.capIndex = new BM25(c.caps.map((x) => x.key))
    return c
  }

  // servers the task names explicitly ("post it in slack", "linear issue")
  mentionedServers(task: string): Set<string> {
    const low = task.toLowerCase()
    const out = new Set<string>()
    for (const s of this.servers) {
      if (low.includes(s.key) || low.includes(s.title.toLowerCase())) out.add(s.key)
    }
    if (/\bci\b|pull request|\bpr\b|\brepo\b/.test(low)) out.add('github')
    if (/\bcalendar\b|\bmeeting\b|\binvite\b/.test(low)) out.add('gcal')
    return out
  }
}
