import type { Metadata } from 'next'
import { Code } from '@/components/code'

export const metadata: Metadata = { title: 'HTTP API' }

export default function Http() {
  return (
    <>
      <h1>HTTP API</h1>
      <p className="lead">
        The same operations as the MCP tools, as JSON over HTTP, for agents and services that do not speak MCP. Start it with <code>npm run serve</code>; it
        listens on port 7700.
      </p>

      <table>
        <thead><tr><th>endpoint</th><th>body</th></tr></thead>
        <tbody>
          <tr><td><code>POST /find_tools</code></td><td><code>task</code>, <code>session?</code>, <code>have?</code>, <code>k?</code>, <code>budget?</code> (max schema tokens, default 4000), <code>lean?</code> (graph picks only, no fill)</td></tr>
          <tr><td><code>POST /call_tool</code></td><td><code>name</code>, <code>args?</code>, <code>session?</code>, <code>lookup?</code></td></tr>
          <tr><td><code>POST /recall_entities</code></td><td><code>session?</code>, <code>type?</code></td></tr>
          <tr><td><code>POST /report_outcome</code></td><td><code>lookup</code>, <code>success</code>, <code>used?</code></td></tr>
          <tr><td><code>GET /health</code></td><td>returns <code>{'{ ok, tools }'}</code></td></tr>
        </tbody>
      </table>
      <p>Over HTTP the session is a field in the body rather than an environment variable. Responses have the same shape as in the <a href="/docs/tools">tool reference</a>.</p>

      <h2>A whole task with curl</h2>
      <Code label="shell">{`# 1. what does this task need?
curl -s localhost:7700/find_tools -H 'content-type: application/json' -d '{
  "task": "refund the last charge for jane@acme.com",
  "have": ["email"],
  "session": "support-42"
}'

# 2. run the plan, passing the lookup id along
curl -s localhost:7700/call_tool -H 'content-type: application/json' -d '{
  "name": "stripe_search_customers",
  "args": { "query": "email:\\"jane@acme.com\\"" },
  "session": "support-42",
  "lookup": "<lookup from step 1>"
}'

# 3. say how it went
curl -s localhost:7700/report_outcome -H 'content-type: application/json' -d '{
  "lookup": "<lookup from step 1>",
  "success": true,
  "used": ["stripe_search_customers", "stripe_list_charges", "stripe_create_refund"]
}'`}</Code>

      <h2>Errors</h2>
      <p>Failures return status 400 with <code>{'{ "error": "..." }'}</code>, for example an unknown tool name or an expired lookup id. Lookup ids are kept for an hour.</p>
    </>
  )
}
