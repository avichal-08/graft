import type { Metadata } from 'next'
import { ConnectTabs } from '@/components/connect-tabs'
import { Code } from '@/components/code'
import { agentInstructions } from '@/lib/clients'

export const metadata: Metadata = { title: 'Connect a client' }

export default function Mcp() {
  return (
    <>
      <h1>Connect a client</h1>
      <p className="lead">graft speaks MCP over stdio. Any client that can start an MCP server can use it.</p>

      <h2>Add the server</h2>
      <p>Replace the servers you would otherwise load with this one entry.</p>
      <ConnectTabs />

      <h2>Sessions</h2>
      <p>
        <code>GRAFT_SESSION</code> names the session the agent works in. Entities it resolves (customer ids, channels, pull requests) are stored under that
        session in the graph, and later <code>find_tools</code> calls in the same session skip the lookups that would produce them again. Use one session
        per user, per conversation or per project, whichever matches how your work repeats. It defaults to <code>default</code>.
      </p>

      <h2>Instructions for the agent</h2>
      <p>Models use a router better when told to. Put this in the system prompt or your rules file:</p>
      <Code label="instructions">{agentInstructions}</Code>

      <h2>Troubleshooting</h2>
      <table>
        <thead><tr><th>symptom</th><th>cause</th></tr></thead>
        <tbody>
          <tr><td>client shows the server as failed</td><td>HydraDB is not reachable. Check <code>bash hydra/up.sh</code> and <code>npm run probe</code>.</td></tr>
          <tr><td>garbled output or a JSON parse error</td><td>Something wrote to stdout. Keep <code>--silent</code> in the npm args.</td></tr>
          <tr><td><code>spawn npm ENOENT</code> on Windows</td><td>Use <code>npm.cmd</code> as the command.</td></tr>
          <tr><td>find_tools returns nothing useful</td><td>The catalog is not loaded. Run <code>npm run ingest</code>.</td></tr>
        </tbody>
      </table>
    </>
  )
}
