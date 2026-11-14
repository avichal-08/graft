// npm run bench -- [--split dev|test|all] [--k 10] [--verbose]
import { writeFileSync, mkdirSync } from 'node:fs'
import { GraphCatalog } from '../src/retrieve/catalog.js'
import { all, flat, dense, lean, graft, type Arm } from './arms.js'
import { tasks, dev, test, type Task } from './tasks.js'

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1]! : def
}
const split = arg('split', 'all')
const k = Number(arg('k', '10'))
const verbose = process.argv.includes('--verbose')
const set: Task[] = split === 'dev' ? dev : split === 'test' ? test : tasks

const cat = await GraphCatalog.load()
for (const t of tasks) for (const g of t.gold) if (!cat.toolByKey.has(g)) throw new Error(`${t.id}: unknown gold tool ${g}`)

type Result = { arm: string; recall: number; complete: number; tokens: number; tools: number; precision: number; queries: number; ms: number }
const results: Result[] = []
const perTask: Record<string, Record<string, { recall: number; missing: string[] }>> = {}

for (const arm of [all, flat, dense, lean, graft] as Arm[]) {
  let recall = 0, complete = 0, tokens = 0, tools = 0, hits = 0, queries = 0, ms = 0
  for (const t of set) {
    const t0 = performance.now()
    const sel = await arm.select(cat, t, k)
    ms += performance.now() - t0
    const keys = new Set(sel.tools.map((x) => x.key))
    const got = t.gold.filter((g) => keys.has(g))
    const missing = t.gold.filter((g) => !keys.has(g))
    recall += got.length / t.gold.length
    complete += missing.length ? 0 : 1
    tokens += sel.tools.reduce((s, x) => s + x.tokens, 0)
    tools += sel.tools.length
    hits += got.length
    queries += sel.queries
    ;(perTask[t.id] ??= {})[arm.name] = { recall: got.length / t.gold.length, missing }
  }
  const n = set.length
  results.push({ arm: arm.name, recall: recall / n, complete: complete / n, tokens: tokens / n, tools: tools / n, precision: tools ? hits / tools : 0, queries: queries / n, ms: ms / n })
}

const pct = (x: number) => `${(x * 100).toFixed(1)}%`
console.log(`\n${set.length} tasks (${split}), k=${k}, catalog ${cat.toolList.length} tools\n`)
console.log('arm          recall   complete  precision  tools  tokens   graph q  ms')
for (const r of results) {
  console.log(`${r.arm.padEnd(12)} ${pct(r.recall).padStart(6)}  ${pct(r.complete).padStart(8)}  ${pct(r.precision).padStart(9)}  ${r.tools.toFixed(1).padStart(5)}  ${Math.round(r.tokens).toString().padStart(6)}  ${r.queries.toFixed(1).padStart(7)}  ${r.ms.toFixed(0).padStart(3)}`)
}

if (verbose) {
  console.log('\nmisses (graft):')
  for (const t of set) {
    const m = perTask[t.id]!['graft']!
    if (m.missing.length) console.log(`  ${t.id.padEnd(22)} ${m.missing.join(', ')}`)
  }
}

mkdirSync('bench/results', { recursive: true })
writeFileSync(`bench/results/${split}-k${k}.json`, JSON.stringify({ split, k, tasks: set.length, results, perTask }, null, 2))
