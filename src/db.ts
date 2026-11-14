import neo4j, { type Driver, type Record as Neo4jRecord } from 'neo4j-driver'

// the driver captures a stack on every run(); with tsx source maps on, node
// throws while decoding some of our maps. plain stacks are fine here.
process.setSourceMapsEnabled(false)

const url = process.env.HYDRA_BOLT_URL ?? 'bolt://127.0.0.1:7687'
const token = process.env.HYDRA_TOKEN ?? 'local-development-token-32-bytes'
const database = process.env.HYDRA_GRAPH ?? 'default'

let driver: Driver | undefined
// one bookmark manager for the process so every read sees this process's writes
const bookmarkManager = neo4j.bookmarkManager()

export function db(): Driver {
  driver ??= neo4j.driver(url, neo4j.auth.basic('neo4j', token), {
    maxConnectionPoolSize: Number(process.env.HYDRA_POOL ?? 32),
    disableLosslessIntegers: true,
  })
  return driver
}

export async function close() {
  await driver?.close()
  driver = undefined
}

export type Row = Record<string, unknown>

// stats are kept per process so the bench can report graph round trips
export const stats = { queries: 0, ms: 0 }

// js numbers go over bolt as floats, but hydradb ids must be ints.
// integers are sent as bolt ints unless wrapped with float().
const FLOAT = Symbol('float')
type Float = { [FLOAT]: number }
export const float = (n: number): Float => ({ [FLOAT]: n })

function encode(v: unknown): unknown {
  if (typeof v === 'number') return Number.isInteger(v) ? neo4j.int(v) : v
  if (Array.isArray(v)) return v.map(encode)
  if (v && typeof v === 'object') {
    if (FLOAT in v) return (v as Float)[FLOAT]
    const out: Row = {}
    for (const [k, x] of Object.entries(v)) out[k] = encode(x)
    return out
  }
  return v
}

export async function run(query: string, params: Row = {}): Promise<Row[]> {
  const t0 = performance.now()
  const session = db().session({ database, bookmarkManager })
  try {
    const res = await session.run(query, encode(params) as Row)
    return res.records.map(toRow)
  } finally {
    await session.close()
    stats.queries++
    stats.ms += performance.now() - t0
  }
}

// batch helper: hydradb caps UNWIND input at 1024 rows
export async function batch(query: string, rows: Row[], size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await run(query, { rows: rows.slice(i, i + size) })
  }
}

function toRow(r: Neo4jRecord): Row {
  const out: Row = {}
  for (const k of r.keys) out[k as string] = r.get(k)
  return out
}
