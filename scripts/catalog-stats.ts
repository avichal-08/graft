import { servers, tools, tokens, entityTypes, isFree } from '../src/catalog/index.js'

const total = tools.reduce((s, t) => s + tokens(t), 0)
console.log(`${servers.length} servers, ${tools.length} tools, ${total} tokens if all preloaded (avg ${Math.round(total / tools.length)})`)
for (const s of servers) {
  console.log(`  ${s.name.padEnd(12)} ${String(s.tools.length).padStart(3)} tools  ${s.tools.reduce((a, t) => a + tokens(t), 0)} tok`)
}

const producers = new Map<string, string[]>()
for (const t of tools) for (const g of t.gives) producers.set(g, [...(producers.get(g) ?? []), t.key])

const types = entityTypes()
const orphans = types.filter((e) => !isFree(e) && !producers.has(e))
console.log(`\n${types.length} entity types, ${orphans.length} with no producer: ${orphans.join(', ') || '-'}`)

const keys = new Set<string>()
for (const t of tools) {
  if (keys.has(t.key)) console.log('duplicate key', t.key)
  keys.add(t.key)
}
const caps = new Set(tools.flatMap((t) => t.caps))
console.log(`${caps.size} capabilities`)
const noCaps = tools.filter((t) => !t.caps.length).map((t) => t.key)
if (noCaps.length) console.log('tools without caps:', noCaps.join(', '))
