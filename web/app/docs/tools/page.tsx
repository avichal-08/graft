import type { Metadata } from 'next'
import { Code } from '@/components/code'

export const metadata: Metadata = { title: 'Tool reference' }

const findResponse = `{
  "lookup": "fa04185b-c299-4fc4-88f2-a09827246252",
  "tools": [
    {
      "name": "stripe_create_refund",
      "description": "Refund a charge or payment intent, fully or partially. ...",
      "inputSchema": { "type": "object", "properties": { "charge": { "type": "string" }, ... } }
    }
  ],
  "plan": [
    { "tool": "stripe_create_refund", "key": "stripe.create_refund", "kind": "anchor", "why": "matches the task" },
    { "tool": "stripe_list_charges", "key": "stripe.list_charges", "kind": "producer", "why": "provides stripe.charge", "step": 1 },
    { "tool": "stripe_search_customers", "key": "stripe.search_customers", "kind": "producer", "why": "provides stripe.customer", "step": 2 }
  ],
  "known": [
    { "type": "stripe.customer", "value": "cus_773200cc", "tool": "stripe.search_customers" }
  ],
  "tokens": 475,
  "graph_queries": 6,
  "trace": {
    "clauses": ["refund the last charge for jane@acme.com"],
    "anchors": ["stripe.create_refund", "..."],
    "edges": [["stripe.create_refund", "stripe.charge", "stripe.list_charges"], ["stripe.list_charges", "stripe.customer", "stripe.search_customers"]]
  }
}`

export default function Tools() {
  return (
    <>
      <h1>Tool reference</h1>
      <p className="lead">The four tools graft exposes to the agent. The same operations are available over <a href="/docs/http">HTTP</a>.</p>

      <h2 id="find_tools">find_tools</h2>
      <p>Describe the task and get back only the tools for it, with the order to use them in.</p>
      <table>
        <thead><tr><th>input</th><th>type</th><th></th></tr></thead>
        <tbody>
          <tr><td><code>task</code></td><td>string</td><td>The task in plain words. Several intents are fine: “refund jane, then email her”.</td></tr>
          <tr><td><code>have</code></td><td>string[]</td><td>Entity types the agent already holds, like <code>email</code> or <code>linear.issue</code>. Lookups for these are skipped.</td></tr>
          <tr><td><code>k</code></td><td>number</td><td>Most tools to return, 1 to 30. Default 10.</td></tr>
        </tbody>
      </table>
      <Code label="response">{findResponse}</Code>
      <ul>
        <li><strong>tools</strong>: MCP tool definitions, ready to show the model or to call.</li>
        <li><strong>plan</strong>: the same tools in order. <code>anchor</code> matched the task text; <code>producer</code> was reached through the graph to provide an input; <code>fill</code> is a related match added to reach <code>k</code>.</li>
        <li><strong>known</strong>: entities this session already resolved that the plan&apos;s tools need. Use these values instead of looking them up.</li>
        <li><strong>lookup</strong>: pass it to <code>call_tool</code> and <code>report_outcome</code> so graft can learn from the result.</li>
        <li><strong>trace</strong>: how the walk got there, as <code>[consumer, entity type, producer]</code> edges.</li>
      </ul>

      <h2 id="call_tool">call_tool</h2>
      <p>Run a tool returned by <code>find_tools</code>. Entities in the result are stored in the session.</p>
      <table>
        <thead><tr><th>input</th><th>type</th><th></th></tr></thead>
        <tbody>
          <tr><td><code>name</code></td><td>string</td><td>Tool name exactly as returned, e.g. <code>stripe_search_customers</code>.</td></tr>
          <tr><td><code>args</code></td><td>object</td><td>Arguments matching the tool&apos;s input schema.</td></tr>
          <tr><td><code>lookup</code></td><td>string</td><td>The lookup id from the find_tools call this came from.</td></tr>
        </tbody>
      </table>
      <Code label="response">{`{
  "ok": true,
  "result": { "tool": "stripe.search_customers", "customer": "cus_773200cc" },
  "entities": [{ "type": "stripe.customer", "value": "cus_773200cc" }],
  "ms": 270
}`}</Code>

      <h2 id="recall_entities">recall_entities</h2>
      <p>List what this session has already resolved. Optional <code>type</code> narrows it, e.g. <code>stripe.customer</code>.</p>
      <Code label="response">{`[{ "type": "stripe.customer", "value": "cus_773200cc", "tool": "stripe.search_customers" }]`}</Code>

      <h2 id="report_outcome">report_outcome</h2>
      <p>Say whether the task worked. This is how graft learns.</p>
      <table>
        <thead><tr><th>input</th><th>type</th><th></th></tr></thead>
        <tbody>
          <tr><td><code>lookup</code></td><td>string</td><td>The lookup id from find_tools.</td></tr>
          <tr><td><code>success</code></td><td>boolean</td><td>Whether the task was completed.</td></tr>
          <tr><td><code>used</code></td><td>string[]</td><td>Tools you used, including any you found another way. Those are the strongest signal.</td></tr>
        </tbody>
      </table>
      <Code label="response">{`{ "updated": 14, "hints": 212 }`}</Code>
    </>
  )
}
