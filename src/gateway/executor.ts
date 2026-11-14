// stands in for the real upstream mcp servers: deterministic, realistic
// looking results so the gateway, cache and benchmarks run without accounts.
import { createHash } from 'node:crypto'

const PREFIX: Record<string, string> = {
  'stripe.customer': 'cus_', 'stripe.charge': 'ch_', 'stripe.payment_intent': 'pi_', 'stripe.refund': 're_',
  'stripe.subscription': 'sub_', 'stripe.invoice': 'in_', 'stripe.price': 'price_', 'stripe.product': 'prod_', 'stripe.dispute': 'dp_',
  'slack.channel': 'C0', 'slack.user': 'U0', 'slack.message': '17', 'linear.issue': 'ENG-', 'jira.issue': 'OPS-',
  'github.pr': '', 'github.issue': '', 'github.workflow_run': '', 'zendesk.ticket': '', 'pagerduty.incident': 'P',
}

const hash = (s: string, n = 8) => createHash('sha1').update(s).digest('hex').slice(0, n)

export type Produced = { type: string; value: string; label?: string }
export type Execution = { ok: boolean; result: Record<string, unknown>; entities: Produced[] }

export function execute(tool: { key: string; gives: string[] }, args: Record<string, unknown>): Execution {
  const seed = `${tool.key}:${JSON.stringify(args)}`
  const entities: Produced[] = []
  for (const type of tool.gives) {
    if (type === 'email') {
      const given = Object.values(args).find((v) => typeof v === 'string' && v.includes('@')) as string | undefined
      entities.push({ type, value: given ?? `user.${hash(seed, 4)}@example.com` })
      continue
    }
    const prefix = PREFIX[type] ?? `${type.split('.').pop()}_`
    const numeric = prefix === '' || /-$|^17$/.test(prefix)
    const value = numeric ? `${prefix}${parseInt(hash(seed + type, 6), 16) % 100000}` : `${prefix}${hash(seed + type)}`
    entities.push({ type, value })
  }
  const result: Record<string, unknown> = { tool: tool.key }
  for (const e of entities) result[e.type.split('.').pop()!] = e.value
  return { ok: true, result, entities }
}
