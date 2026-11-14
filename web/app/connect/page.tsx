import type { Metadata } from 'next'
import Link from 'next/link'
import { ConnectTabs } from '@/components/connect-tabs'
import { Code } from '@/components/code'
import { agentInstructions } from '@/lib/clients'

export const metadata: Metadata = { title: 'Connect an agent' }

export default function Connect() {
  return (
    <main className="wrap">
      <div className="dash-head">
        <h1>Connect an agent</h1>
        <p>
          graft is one MCP server. Add it to your client in place of the servers you would otherwise load, give the agent the short instructions
          below, and it will ask for tools instead of carrying all of them.
        </p>
      </div>

      <section className="card" style={{ marginTop: 24 }}>
        <h2>1. Add graft to your client</h2>
        <p className="note">Pick your client and set where graft is cloned. Each session name keeps its own memory of resolved entities.</p>
        <ConnectTabs />
      </section>

      <section className="card">
        <h2>2. Tell the agent how to use it</h2>
        <p className="note">Paste into your system prompt, CLAUDE.md, AGENTS.md or rules file.</p>
        <Code label="instructions">{agentInstructions}</Code>
      </section>

      <section className="card">
        <h2>3. Check it works</h2>
        <p className="note">Ask the agent for something that needs a lookup it would not think to name. It should call find_tools first and follow the plan.</p>
        <Code label="try">{'refund the last charge for jane@acme.com and tell her in an email'}</Code>
        <p className="note" style={{ margin: 0 }}>
          Graph not running yet? Start with the <Link href="/docs">quickstart</Link>. Want to see the walk first? Open the <Link href="/playground">playground</Link>.
        </p>
      </section>
    </main>
  )
}
