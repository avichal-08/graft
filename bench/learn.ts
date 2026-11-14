// npm run learn -- [--rounds 6] [--k 10]
// heldout: feedback from dev tasks only, scored on the untouched test split.
// recurring: the same test tasks come back each round and report outcomes,
// which is what a team running the same workflows every day looks like.
import { writeFileSync, mkdirSync } from 'node:fs'
import { Gateway } from '../src/gateway/core.js'
import { dev, test, type Task } from './tasks.js'

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1]! : def
}
const rounds = Number(arg('rounds', '6'))
const k = Number(arg('k', '10'))
// --tune trains on half of dev and scores the other half, so test stays untouched while iterating
const tune = process.argv.includes('--tune')
const train = tune ? dev.filter((_, i) => i % 2 === 0) : dev
const evalSet = tune ? dev.filter((_, i) => i % 2 === 1) : test

const gw = await Gateway.open()

async function score(set: Task[]) {
  let recall = 0, complete = 0, tokens = 0
  for (const t of set) {
    const r = await gw.findTools({ task: t.task, have: t.have, k })
    const got = new Set(r.plan.map((p) => gw.tool(p.tool)!.key))
    const hit = t.gold.filter((g) => got.has(g)).length
    recall += hit / t.gold.length
    complete += hit === t.gold.length ? 1 : 0
    tokens += r.tokens
  }
  return { recall: recall / set.length, complete: complete / set.length, tokens: Math.round(tokens / set.length) }
}

// an agent working through the tasks: it uses the gold chain (finding any
// missing tool on its own) and reports success with what it used
async function practice(set: Task[]) {
  for (const t of set) {
    const r = await gw.findTools({ task: t.task, have: t.have, k })
    await gw.feedback({ lookup: r.lookup, success: true, used: t.gold })
  }
}

type Point = { round: number; recall: number; complete: number; tokens: number }
const curves: Record<string, Point[]> = { heldout: [], recurring: [] }
const pct = (x: number) => `${(x * 100).toFixed(1)}%`

for (const mode of ['heldout', 'recurring'] as const) {
  await gw.resetLearning()
  console.log(`\n${mode}${tune ? ' (tune: dev halves)' : ''}: ${mode === 'heldout' ? 'feedback on train tasks, scored on unseen ones' : 'the scored tasks repeat with feedback'}`)
  console.log('round  recall   complete  tokens')
  for (let round = 0; round <= rounds; round++) {
    if (round > 0) await practice(mode === 'heldout' ? train : evalSet)
    const s = await score(evalSet)
    curves[mode]!.push({ round, ...s })
    console.log(`${String(round).padStart(5)}  ${pct(s.recall).padStart(6)}  ${pct(s.complete).padStart(8)}  ${String(s.tokens).padStart(6)}`)
  }
}

await gw.resetLearning()
mkdirSync('bench/results', { recursive: true })
if (!tune) writeFileSync('bench/results/learning.json', JSON.stringify({ k, rounds, curves }, null, 2))
