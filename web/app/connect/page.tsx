import type { Metadata } from 'next'
import Link from 'next/link'
import { ConnectTabs } from '@/components/connect-tabs'
import { Code } from '@/components/code'
import { agentInstructions } from '@/lib/clients'
import { PageHero } from '@/components/page-hero'
import { Steps, Step } from '@/components/steps'

export const metadata: Metadata = { title: 'Connect an agent' }

export default function Connect() {
  return (
    <>
      <PageHero kicker="Connect" title="Connect your agent in a minute.">
        graft is one MCP server. Add it in place of the servers your client would otherwise load, give the agent three lines of instructions, and it
        asks for tools instead of carrying all of them.
      </PageHero>
      <main className="wrap page-body">
        <div className="prose connect-steps">
          <Steps>
            <Step title="Add graft to your client">
              <p>Pick your client and set where graft is cloned. Each session name keeps its own memory of what the agent resolved.</p>
              <ConnectTabs />
            </Step>
            <Step title="Tell the agent how to use it">
              <p>Paste into your system prompt, CLAUDE.md, AGENTS.md or rules file.</p>
              <Code label="instructions">{agentInstructions}</Code>
            </Step>
            <Step title="Try a task that needs a hidden lookup">
              <p>The agent should call find_tools first and follow the plan, including steps you never mentioned.</p>
              <Code label="prompt" lang="text">{'refund the last charge for jane@acme.com and tell her in an email'}</Code>
              <p>
                Graph not running yet? Start with the <Link href="/docs">quickstart</Link>. Want to see the walk first? Open the <Link href="/playground">playground</Link>.
              </p>
            </Step>
          </Steps>
        </div>
      </main>
    </>
  )
}
