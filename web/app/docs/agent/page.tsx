import type { Metadata } from 'next'
import { Code } from '@/components/code'
import { Callout } from '@/components/steps'

export const metadata: Metadata = { title: 'Agent loop' }

const ts = `import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

const graft = new Client({ name: 'my-agent', version: '1.0.0' })
await graft.connect(new StdioClientTransport({
  command: 'npm',
  args: ['--silent', '--prefix', '/path/to/graft', 'run', 'gateway'],
  env: { ...process.env, GRAFT_SESSION: 'support-42' },
}))

const call = async (name: string, args: object) => {
  const r = await graft.callTool({ name, arguments: args })
  return JSON.parse((r.content as { text: string }[])[0].text)
}

// 1. ask for the tools this task needs
const found = await call('find_tools', {
  task: 'refund the last charge for jane@acme.com and tell her in an email',
  have: ['email'],
})

// 2. give the model only found.tools, and found.known as context.
//    when it picks a tool, run it through graft:
const result = await call('call_tool', {
  name: 'stripe_search_customers',
  args: { query: 'email:"jane@acme.com"' },
  lookup: found.lookup,
})

// 3. when the task is done, report what was used
await call('report_outcome', { lookup: found.lookup, success: true })`

export default function Agent() {
  return (
    <>
      <h1>Agent loop</h1>
      <p className="lead">If you write the agent yourself, graft fits in three calls: before the task, for each tool, and after.</p>

      <h2>The loop</h2>
      <ol>
        <li><strong>Before the task</strong>, call <code>find_tools</code>. Put only the returned <code>tools</code> in front of the model, and the <code>known</code> entities in its context.</li>
        <li><strong>For each tool the model picks</strong>, run it with <code>call_tool</code> and the lookup id. Results become session memory.</li>
        <li><strong>After the task</strong>, call <code>report_outcome</code>. If the model needed a tool graft did not return, list it in <code>used</code>.</li>
        <li><strong>When the task changes</strong> mid-conversation, call <code>find_tools</code> again. It is cheap, about 4 graph queries.</li>
      </ol>

      <h2>TypeScript, with the MCP SDK</h2>
      <Code label="agent.ts">{ts}</Code>

      <h2>Any language, over HTTP</h2>
      <Code label="python">{`import requests

API = "http://localhost:7700"
found = requests.post(f"{API}/find_tools", json={
    "task": "refund the last charge for jane@acme.com",
    "have": ["email"],
    "session": "support-42",
}).json()

tools = found["tools"]          # hand these to your model
known = found["known"]          # and these as context`}</Code>

      <Callout tone="tip">
        Keep <code>k</code> small (6 to 10). graft orders each matched tool before the lookups it needs, so a small budget keeps whole chains rather than
        many unrelated tools.
      </Callout>
    </>
  )
}
