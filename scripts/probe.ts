// checks the cypher features graft depends on against a live node.
// uses a throwaway id range and cleans up after itself.
import { run, close, type PathValue } from '../src/db.js'

const base = 900_000_000
const id = (n: number) => base + n

const checks: [string, string, Record<string, unknown>?][] = [
  ['node batch merge+set', 'UNWIND $rows AS row MERGE (n {id: row.id}) SET n:Probe, n.key = row.key', {
    rows: [1, 2, 3, 4, 5].map((n) => ({ id: id(n), key: `k${n}` })),
  }],
  ['edge batch', 'UNWIND $rows AS row CREATE (a {id: row.src})-[:P_NEXT]->(b {id: row.dst})', {
    rows: [[1, 2], [2, 3], [3, 4]].map(([s, d]) => ({ src: id(s!), dst: id(d!) })),
  }],
  ['second rel type', 'MERGE (a {id: $a})-[:P_ALT {w: 0.5}]->(b {id: $b})', { a: id(4), b: id(5) }],
  ['label read', 'MATCH (n:Probe) WHERE n.id >= $lo RETURN n.id AS id, n.key AS key ORDER BY id', { lo: id(0) }],
  ['var-length', 'MATCH (a:Probe {id: $a})-[:P_NEXT*1..3]->(b:Probe) RETURN b.id AS id, b.key AS key ORDER BY id', { a: id(1) }],
  ['rel prop read', 'MATCH (a:Probe {id: $a})-[r:P_ALT]->(b:Probe) RETURN b.id AS id, r.w AS w', { a: id(4) }],
  ['rel prop set', 'MATCH (a {id: $a})-[r:P_ALT]->(b {id: $b}) SET r.w = 0.9', { a: id(4), b: id(5) }],
  ['rel prop reread', 'MATCH (a:Probe {id: $a})-[r:P_ALT]->(b:Probe) RETURN r.w AS w', { a: id(4) }],
  ['incoming via reversed pattern', 'MATCH (a:Probe)-[:P_NEXT]->(b:Probe {id: $b}) RETURN a.id AS id', { b: id(3) }],
  ['batched read', 'UNWIND $rows AS row MATCH (a {id: row.id})-[:P_NEXT]->(b) RETURN row.id AS src, b.id AS dst', {
    rows: [{ id: id(1) }, { id: id(2) }],
  }],
  ['union', 'MATCH (a:Probe {id: $a}) RETURN a.key AS key UNION MATCH (b:Probe {id: $b}) RETURN b.key AS key', { a: id(1), b: id(2) }],
  ['collect', 'MATCH (a:Probe {id: $a})-[:P_NEXT*1..3]->(b:Probe) RETURN collect(b.key) AS keys', { a: id(1) }],
  ['sspaths multi-type', "CALL algo.SSpaths({sourceNode: $a, relTypes: ['P_NEXT', 'P_ALT'], relDirection: 'outgoing', maxLen: 4}) YIELD path RETURN path", { a: id(1) }],
  ['sppaths', "CALL algo.SPpaths({sourceNode: $a, targetNode: $b, relTypes: ['P_NEXT', 'P_ALT'], relDirection: 'outgoing', maxLen: 4, pathCount: 1}) YIELD path, pathWeight RETURN path, pathWeight", { a: id(1), b: id(5) }],
  ['optional match', 'MATCH (a:Probe {id: $a}) OPTIONAL MATCH (a)-[:P_ALT]->(b) RETURN a.id AS a, b.id AS b', { a: id(1) }],
  ['count', 'MATCH (n:Probe) RETURN count(*) AS c'],
]

for (const [name, q, p] of checks) {
  try {
    const rows = await run(q, p ?? {})
    const shown = JSON.stringify(rows, (_k, v) => (v && typeof v === 'object' && 'relationships' in v ? summarizePath(v) : v))
    console.log(`ok   ${name.padEnd(30)} ${shown.slice(0, 220)}`)
  } catch (e) {
    console.log(`FAIL ${name.padEnd(30)} ${(e as Error).message.split('\n')[0]}`)
  }
}

try {
  await run('UNWIND $rows AS row MATCH (n {id: row.id}) DETACH DELETE n', {
    rows: [1, 2, 3, 4, 5].map((n) => ({ id: id(n) })),
  })
  console.log('cleanup ok')
} catch (e) {
  console.log('cleanup FAIL', (e as Error).message)
}
await close()

function summarizePath(p: PathValue) {
  return [p.nodes[0]?.id, ...p.relationships.flatMap((r) => [r.type, r.dst])].join(' ')
}
