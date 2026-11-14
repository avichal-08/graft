// benchmark outputs written by the scripts in ../bench, read on the server
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export type Arm = { arm: string; recall: number; complete: number; tokens: number; tools: number; precision: number; queries: number; ms: number }
export type Bench = { split: string; k: number; tasks: number; results: Arm[] }
export type Point = { round: number; recall: number; complete: number; tokens: number }
export type Learning = { k: number; rounds: number; curves: { heldout: Point[]; recurring: Point[] } }
type Side = { calls: number; tokens: number; complete: boolean; returned: number }
export type Cache = { rows: { pair: string; cold: Side; warm: Side; skipped: string[] }[]; coldCalls: number; warmCalls: number }
export type LoadLevel = { connections: number; rps: number; p50: number; p95: number; p99: number; errors: number; non2xx: number; requests: number }
export type Load = { duration: number; results: LoadLevel[] }

const dir = process.env.GRAFT_RESULTS ?? join(process.cwd(), '..', 'bench', 'results')

async function read<T>(name: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(join(dir, name), 'utf8')) as T
  } catch {
    return null
  }
}

export async function results() {
  const [test, learning, cache, load] = await Promise.all([
    read<Bench>('test-k10.json'),
    read<Learning>('learning.json'),
    read<Cache>('cache.json'),
    read<Load>('load.json'),
  ])
  return { test, learning, cache, load }
}

export const pct = (x: number) => `${(x * 100).toFixed(1)}%`
