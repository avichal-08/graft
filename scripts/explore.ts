// prints what find_tools picks for a few tasks, with the dependency edges it followed
import { GraphCatalog } from '../src/retrieve/catalog.js'
import { findTools } from '../src/retrieve/graft.js'
import { stats } from '../src/db.js'

const tasks: [string, string[]][] = [
  ['refund the last charge for jane@acme.com and tell her in an email', ['email']],
  ['post in the #incidents slack channel that checkout is down and page whoever is on call', []],
  ['the linear issue ENG-412 was reported by a customer, refund them in stripe', ['linear.issue']],
  ['find the sentry error behind the checkout crash and open a fix pull request', []],
  ['schedule a 30 minute meeting with dana@acme.com next week', ['email']],
]

const cat = await GraphCatalog.load()
for (const [task, have] of tasks) {
  const q0 = stats.queries
  const t0 = performance.now()
  const r = await findTools(cat, task, { have })
  const ms = Math.round(performance.now() - t0)
  console.log(`\n${task}  [have: ${have.join(', ') || '-'}]`)
  console.log(`  ${r.picks.length} tools, ${r.tokens} tok, ${stats.queries - q0} graph queries, ${ms} ms`)
  for (const p of r.picks) console.log(`  ${p.why.padEnd(8)} d${p.depth} ${p.tool.key}${p.for ? `  <- for ${p.for}` : ''}`)
}
