// drives the graft mcp server over stdio like an agent would
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ['--import', 'tsx', 'src/gateway/mcp.ts'],
  env: { ...process.env, GRAFT_SESSION: `smoke-${Date.now()}` } as Record<string, string>,
})
const client = new Client({ name: 'smoke', version: '0.0.0' })
await client.connect(transport)

const call = async (name: string, args: Record<string, unknown>) => {
  const r = await client.callTool({ name, arguments: args })
  return JSON.parse((r.content as { text: string }[])[0]!.text)
}

console.log('tools exposed:', (await client.listTools()).tools.map((t) => t.name).join(', '))

const a = await call('find_tools', { task: 'refund the last charge for jane@acme.com', have: ['email'], k: 6 })
console.log('\n1st find_tools:', a.plan.map((p: { tool: string; why: string }) => `${p.tool} (${p.why})`).join(' | '))
console.log('  tokens', a.tokens, 'graph queries', a.graph_queries)

for (const name of ['stripe_search_customers', 'stripe_list_charges', 'stripe_create_refund']) {
  const r = await call('call_tool', { name, args: { query: 'email:"jane@acme.com"' }, lookup: a.lookup })
  console.log('  called', name, '->', JSON.stringify(r.result))
}
console.log('  outcome', await call('report_outcome', { lookup: a.lookup, success: true }))

console.log('\nrecall_entities:', (await call('recall_entities', {})).map((e: { type: string; value: string }) => `${e.type}=${e.value}`).join(', '))

const b = await call('find_tools', { task: 'cancel the stripe subscription for jane@acme.com', have: ['email'], k: 6 })
console.log('\n2nd find_tools:', b.plan.map((p: { tool: string; why: string }) => `${p.tool} (${p.why})`).join(' | '))
console.log('  known:', b.known.map((e: { type: string; value: string }) => `${e.type}=${e.value}`).join(', '))

await client.close()
