// npx tsx scripts/why.ts <task-id ...>: shows how graft got to its picks
import { GraphCatalog } from '../src/retrieve/catalog.js'
import { findTools } from '../src/retrieve/graft.js'
import { tasks } from '../bench/tasks.js'

const cat = await GraphCatalog.load()
const ids = process.argv.slice(2)
for (const t of tasks.filter((x) => !ids.length || ids.includes(x.id))) {
  const r = await findTools(cat, t.task, { have: t.have })
  const got = new Set(r.picks.map((p) => p.tool.key))
  console.log(`\n# ${t.id}: ${t.task}`)
  console.log(`  clauses: ${r.trace.clauses.map((c) => `[${c}]`).join(' ')}`)
  console.log(`  anchors: ${r.trace.anchors.join(', ')}`)
  for (const [c, e, p] of r.trace.edges) console.log(`  ${c} needs ${e} <- ${p}`)
  console.log(`  missing: ${t.gold.filter((g) => !got.has(g)).join(', ') || '-'}   extra: ${[...got].filter((g) => !t.gold.includes(g)).join(', ') || '-'}`)
}
