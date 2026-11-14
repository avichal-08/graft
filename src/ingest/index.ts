// loads the tool catalog into hydradb. idempotent: nodes are merged by id,
// edge batches dedupe on (src, dst, type).
import { batch, close, run, type Row } from '../db.js'
import { servers, tools, tokens, entityTypes, isFree, definition } from '../catalog/index.js'
import { skills } from '../catalog/skills.js'
import { RANGE, REL } from '../graph/schema.js'

export function ids() {
  const server = new Map(servers.map((s, i) => [s.name, RANGE.Server + i]))
  const tool = new Map(tools.map((t, i) => [t.key, RANGE.Tool + i]))
  const caps = [...new Set(tools.flatMap((t) => t.caps))].sort()
  const capability = new Map(caps.map((c, i) => [c, RANGE.Capability + i]))
  const entity = new Map(entityTypes().map((e, i) => [e, RANGE.EntityType + i]))
  const skill = new Map(skills.map((s, i) => [s.key, RANGE.Skill + i]))
  return { server, tool, capability, entity, skill }
}

const get = (m: Map<string, number>, k: string) => {
  const v = m.get(k)
  if (v === undefined) throw new Error(`unknown key ${k}`)
  return v
}

async function nodes(label: string, rows: Row[], props: string[]) {
  const set = [`n:${label}`, ...props.map((p) => `n.${p} = row.${p}`)].join(', ')
  await batch(`UNWIND $rows AS row MERGE (n {id: row.id}) SET ${set}`, rows)
}

async function edges(type: string, rows: { src: number; dst: number }[]) {
  await batch(`UNWIND $rows AS row CREATE (a {id: row.src})-[:${type}]->(b {id: row.dst})`, rows)
}

export async function ingest(log = console.log) {
  const id = ids()
  const t0 = performance.now()

  await nodes('Server', servers.map((s) => ({ id: get(id.server, s.name), key: s.name, title: s.title, description: s.description })), ['key', 'title', 'description'])
  await nodes('Tool', tools.map((t) => ({
    id: get(id.tool, t.key),
    key: t.key,
    name: t.name,
    server: t.server,
    description: t.description,
    definition: JSON.stringify(definition(t)),
    tokens: tokens(t),
  })), ['key', 'name', 'server', 'description', 'definition', 'tokens'])
  await nodes('Capability', [...id.capability].map(([key, i]) => ({ id: i, key })), ['key'])
  await nodes('EntityType', [...id.entity].map(([key, i]) => ({ id: i, key, free: isFree(key) })), ['key', 'free'])
  await nodes('Skill', skills.map((s) => ({ id: get(id.skill, s.key), key: s.key, description: s.description, steps: s.steps.join(' > ') })), ['key', 'description', 'steps'])

  const e = {
    provided: tools.map((t) => ({ src: get(id.tool, t.key), dst: get(id.server, t.server) })),
    satisfied: tools.flatMap((t) => t.caps.map((c) => ({ src: get(id.capability, c), dst: get(id.tool, t.key) }))),
    consumes: tools.flatMap((t) => t.needs.map((n) => ({ src: get(id.tool, t.key), dst: get(id.entity, n) }))),
    // free types are authored by the agent, so they never pull in a producer
    produced: tools.flatMap((t) => t.gives.filter((g) => !isFree(g)).map((g) => ({ src: get(id.entity, g), dst: get(id.tool, t.key) }))),
    uses: skills.flatMap((s) => s.steps.map((k) => ({ src: get(id.skill, s.key), dst: get(id.tool, k) }))),
  }
  await edges(REL.PROVIDED_BY, e.provided)
  await edges(REL.SATISFIED_BY, e.satisfied)
  await edges(REL.CONSUMES, e.consumes)
  await edges(REL.PRODUCED_BY, e.produced)
  await edges(REL.USES, e.uses)

  const n = servers.length + tools.length + id.capability.size + id.entity.size + skills.length
  const m = Object.values(e).reduce((s, x) => s + x.length, 0)
  log(`ingested ${n} nodes and ${m} edges in ${Math.round(performance.now() - t0)} ms`)
  return { nodes: n, edges: m }
}

export async function wipe() {
  for (const label of ['Run', 'Entity', 'Session', 'Skill', 'EntityType', 'Capability', 'Tool', 'Server']) {
    const rows = await run(`MATCH (n:${label}) RETURN n.id AS id`)
    await batch('UNWIND $rows AS row MATCH (n {id: row.id}) DETACH DELETE n', rows)
  }
}

if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`) {
  if (process.argv.includes('--wipe')) await wipe()
  await ingest()
  const counts = await run(
    'MATCH (n:Tool) RETURN count(*) AS c UNION ALL MATCH (n:Capability) RETURN count(*) AS c UNION ALL MATCH (n:EntityType) RETURN count(*) AS c',
  )
  console.log('tools, capabilities, entity types in graph:', counts.map((r) => r.c).join(', '))
  await close()
}
