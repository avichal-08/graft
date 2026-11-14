// npm run cache: what the session's entity memory saves on follow-up tasks.
// an agent runs task A, then a follow-up B about the same things. B is run in
// a fresh session and in A's session; lookups whose outputs the session
// already holds don't need to be called again.
import { writeFileSync, mkdirSync } from 'node:fs'
import { Gateway } from '../src/gateway/core.js'
import { tasks } from './tasks.js'
import { isRead } from '../src/retrieve/graft.js'

type Pair = { first: string; task: string; have: string[]; gold: string[] }

const pairs: Pair[] = [
  { first: 'refund-by-email', task: 'cancel the stripe subscription for jane@acme.com too', have: ['email'], gold: ['stripe.search_customers', 'stripe.list_subscriptions', 'stripe.cancel_subscription'] },
  { first: 'upgrade-plan', task: 'send ops@hooli.com their latest stripe invoice', have: ['email'], gold: ['stripe.search_customers', 'stripe.list_invoices', 'stripe.send_invoice'] },
  { first: 'incident-page', task: 'post an all clear in the #incidents slack channel', have: [], gold: ['slack.find_channel', 'slack.post_message'] },
  { first: 'dm-by-email', task: 'send priya@acme.com another slack dm with the release notes link', have: ['email'], gold: ['slack.lookup_user_by_email', 'slack.open_dm', 'slack.post_message'] },
  { first: 'ci-failure', task: 'rerun the failed workflow run on acme/api main', have: ['github.repo'], gold: ['github.list_workflow_runs', 'github.rerun_workflow'] },
  { first: 'rollback-vercel', task: 'show the build logs of that vercel deployment', have: [], gold: ['vercel.list_projects', 'vercel.list_deployments', 'vercel.get_deployment_logs'] },
  { first: 'jira-assign-by-name', task: 'also assign jira issue OPS-92 to maria lopez', have: ['jira.issue'], gold: ['jira.search_users', 'jira.assign_issue'] },
  { first: 'ticket-order-status', task: 'cancel that shopify order and restock the items', have: [], gold: ['shopify.search_orders', 'shopify.cancel_order'] },
  { first: 'cw-logs', task: 'run the same cloudwatch logs query for 4xx errors', have: [], gold: ['aws.logs_describe_groups', 'aws.logs_query'] },
  { first: 'linear-refund', task: 'email the customer from linear issue ENG-412 that the refund is on its way', have: ['linear.issue'], gold: ['linear.get_issue', 'linear.get_user', 'gmail.send_email'] },
  { first: 'mute-monitor', task: 'unmute that datadog monitor and show its current state', have: [], gold: ['datadog.list_monitors', 'datadog.get_monitor'] },
  { first: 'notion-roadmap', task: 'add a comment on the q4 roadmap page in notion asking for review', have: [], gold: ['notion.search', 'notion.add_comment'] },
]

const gw = await Gateway.open()
const run = `cache-${Date.now()}`

// a lookup can be skipped when it only reads and everything it gives is already known
function required(gold: string[], known: Set<string>) {
  return gold.filter((key) => {
    const t = gw.tool(key)!
    const gives = [...(gw.cat.givesOf.get(t.id) ?? [])]
    return !(isRead(t) && gives.length && gives.every((g) => known.has(g)))
  })
}

type Side = { calls: number; tokens: number; complete: boolean; returned: number }
const rows: { pair: string; cold: Side; warm: Side; skipped: string[] }[] = []

for (const [i, p] of pairs.entries()) {
  const first = tasks.find((t) => t.id === p.first)!
  for (const g of [...first.gold, ...p.gold]) if (!gw.tool(g)) throw new Error(`unknown tool ${g}`)
  const session = `${run}-${i}`

  // task A: the agent runs its chain, which writes entities into the session
  for (const key of first.gold) await gw.callTool({ name: key, args: { from: first.id }, session })

  const side = async (sessionName: string | undefined): Promise<Side> => {
    const known = new Set(sessionName ? (await gw.recall(sessionName)).map((e) => e.type) : [])
    const need = required(p.gold, new Set([...known, ...p.have]))
    const r = await gw.findTools({ task: p.task, have: p.have, session: sessionName, k: 10 })
    const got = new Set(r.plan.map((x) => gw.tool(x.tool)!.key))
    return { calls: need.length, tokens: r.tokens, complete: need.every((g) => got.has(g)), returned: r.plan.length }
  }
  const cold = await side(undefined)
  const warm = await side(session)
  const known = new Set((await gw.recall(session)).map((e) => e.type))
  rows.push({ pair: `${p.first} -> ${p.task}`, cold, warm, skipped: p.gold.filter((g) => !required([g], new Set([...known, ...p.have])).length) })
}

const sum = (f: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + f(r), 0)
console.log(`\n${rows.length} follow-up tasks\n`)
for (const r of rows) {
  console.log(`${r.cold.calls} -> ${r.warm.calls} calls  ${r.warm.complete ? 'ok ' : 'MISS'}  ${r.pair}${r.skipped.length ? `   (skips ${r.skipped.join(', ')})` : ''}`)
}
const coldCalls = sum((r) => r.cold.calls), warmCalls = sum((r) => r.warm.calls)
console.log(`\ntool calls for the follow-ups: ${coldCalls} cold, ${warmCalls} with session memory (${Math.round((1 - warmCalls / coldCalls) * 100)}% fewer)`)
console.log(`find_tools returned everything still needed: cold ${sum((r) => +r.cold.complete)}/${rows.length}, warm ${sum((r) => +r.warm.complete)}/${rows.length}`)
console.log(`avg tokens per find_tools: cold ${Math.round(sum((r) => r.cold.tokens) / rows.length)}, warm ${Math.round(sum((r) => r.warm.tokens) / rows.length)}`)

mkdirSync('bench/results', { recursive: true })
writeFileSync('bench/results/cache.json', JSON.stringify({ rows, coldCalls, warmCalls }, null, 2))
