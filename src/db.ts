// hydradb over its typed http query api. one keep-alive connection pool,
// bookmarks chained so every read sees this process's earlier writes.
import { Agent, setGlobalDispatcher } from 'undici'

const base = process.env.HYDRA_HTTP_URL ?? 'http://127.0.0.1:8443'
const token = process.env.HYDRA_TOKEN ?? 'local-development-token-32-bytes'
const graph = process.env.HYDRA_GRAPH ?? 'default'
const cell = process.env.HYDRA_CELL ?? 'cell-0'
const endpoint = `${base}/v1/graphs/${graph}/query`

setGlobalDispatcher(new Agent({ connections: Number(process.env.HYDRA_POOL ?? 32), keepAliveTimeout: 30_000 }))

export type Row = Record<string, unknown>
export type PathValue = {
  nodes: { id: number; labels: string[]; properties: Row }[]
  relationships: { type: string; src: number; dst: number; properties: Row }[]
}

// stats are kept per process so the bench can report graph round trips
export const stats = { queries: 0, ms: 0 }

let bookmark: string | undefined

// json has no int/float distinction, and hydradb reads 1 as an integer.
// float(x) always goes over the wire with a decimal point.
const FLOAT = Symbol('float')
type Float = { [FLOAT]: number }
export const float = (n: number): Float => ({ [FLOAT]: n })
const FMARK = '\u0000f:'

function encode(params: Row): string {
  const json = JSON.stringify(params, (_k, v) => {
    if (v && typeof v === 'object' && FLOAT in v) {
      const n = (v as Float)[FLOAT]
      return FMARK + (Number.isInteger(n) ? n.toFixed(1) : String(n))
    }
    return v
  })
  return json.replace(/"\\u0000f:([^"]+)"/g, '$1')
}

type Cell = { type: string; value?: unknown }

function decode(c: Cell): unknown {
  switch (c.type) {
    case 'null': return null
    case 'list': return (c.value as Cell[]).map(decode)
    case 'map': return Object.fromEntries(Object.entries(c.value as Record<string, Cell>).map(([k, v]) => [k, decode(v)]))
    case 'path': return decodePath(c.value as RawPath)
    default: return c.value
  }
}

type RawPath = {
  nodes: { id: number; labels: string[]; properties: Record<string, Record<string, unknown>> }[]
  relationships: { edge_type: string; src: number; dst: number; properties: Record<string, Record<string, unknown>> }[]
}

// path properties are tagged with a capitalised type name: {"String": "x"}
const untag = (props: Record<string, Record<string, unknown>>) =>
  Object.fromEntries(Object.entries(props ?? {}).map(([k, v]) => [k, Object.values(v)[0]]))

function decodePath(p: RawPath): PathValue {
  return {
    nodes: p.nodes.map((n) => ({ id: n.id, labels: n.labels, properties: untag(n.properties) })),
    relationships: p.relationships.map((r) => ({ type: r.edge_type, src: r.src, dst: r.dst, properties: untag(r.properties) })),
  }
}

export class HydraError extends Error {
  constructor(message: string, public status: number, public query: string) {
    super(message)
  }
}

type Response = { columns: string[]; rows: Cell[][]; next_cursor: unknown; query_id: string; bookmark?: string }

async function post(body: Row, query: string): Promise<Response> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-graph-namespace': 'default' },
    body: encode(body),
  })
  const text = await res.text()
  if (!res.ok) {
    let msg = text
    try {
      msg = JSON.parse(text).error?.message ?? text
    } catch {}
    throw new HydraError(msg, res.status, query)
  }
  return JSON.parse(text) as Response
}

export async function run(query: string, params: Row = {}): Promise<Row[]> {
  const t0 = performance.now()
  try {
    const req: Row = { cell_id: cell, query, parameters: params, page_size: 4096 }
    if (bookmark) req.bookmark = bookmark
    const out: Row[] = []
    let res = await post(req, query)
    for (;;) {
      if (res.bookmark) bookmark = res.bookmark
      for (const r of res.rows) {
        const row: Row = {}
        res.columns.forEach((c, i) => (row[c] = decode(r[i]!)))
        out.push(row)
      }
      if (res.next_cursor == null) break
      res = await post({ ...req, cursor: res.next_cursor, query_id: res.query_id }, query)
    }
    return out
  } finally {
    stats.queries++
    stats.ms += performance.now() - t0
  }
}

// hydradb caps UNWIND input at 1024 rows
export async function batch(query: string, rows: Row[], size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await run(query, { rows: rows.slice(i, i + size) })
  }
}

export async function close() {}
