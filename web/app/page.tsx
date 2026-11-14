import Link from 'next/link'
import { Scene } from '@/components/scene'
import { Live } from '@/components/live'
import { ConnectTabs } from '@/components/connect-tabs'
import { results, pct } from '@/lib/results'

export const dynamic = 'force-dynamic'

const plan: [string, string, string][] = [
  ['stripe_create_refund', 'matches the task', 'var(--butter)'],
  ['stripe_list_charges', 'provides stripe.charge', 'var(--sky)'],
  ['stripe_search_customers', 'provides stripe.customer', 'var(--rose)'],
  ['linear_get_user', 'provides email', 'var(--mint)'],
  ['linear_get_issue', 'provides linear.user', 'var(--lavender)'],
]

export default async function Home() {
  const { test, cache, load, learning } = await results()
  const by = Object.fromEntries((test?.results ?? []).map((r) => [r.arm, r]))
  const g = by['graft'], all = by['all tools'], dense = by['dense top-k']
  const one = load?.results.find((r) => r.connections === 1)
  const rec = learning?.curves.recurring.map((p) => p.complete)
  const ratio = g && all ? Math.round(all.tokens / g.tokens) : null

  const stats: [string, string][] = []
  if (ratio && all) stats.push([`${ratio}×`, `fewer tokens of tool schemas than loading all ${Math.round(all.tools)} tools`])
  if (g && dense) stats.push([pct(g.complete), `of unseen tasks get every tool they need, vs ${pct(dense.complete)} with embedding search`])
  if (cache) stats.push([`${Math.round((1 - cache.warmCalls / cache.coldCalls) * 100)}%`, 'fewer tool calls on follow-up tasks, from session memory'])
  if (one) stats.push([`${one.p50} ms`, 'median lookup, walking the graph on every call'])

  return (
    <>
      <section className="scene-hero">
        <Scene />
        <div className="wrap inner">
          <span className="glass"><b>MCP</b> The context layer for agents, built on HydraDB</span>
          <h1 className="hero-title">Give your agent the tools the task needs. Nothing else.</h1>
          <p className="hero-sub">
            graft sits between your agent and its MCP servers. It walks a graph of every tool, what each one needs and what the agent already knows, and
            hands back only the handful this task depends on, including the lookups nobody asked for.
          </p>
          <div className="cta">
            <Link className="btn white" href="/connect">Connect an agent</Link>
            <Link className="btn black" href="/playground">Try the playground</Link>
          </div>
          <div className="on-scene">
            <span>Works with</span>
            {['Claude Code', 'Claude Desktop', 'Cursor', 'Codex', 'Windsurf', 'any MCP client'].map((c) => <b key={c}>{c}</b>)}
          </div>

          <div className="window">
            <div className="top"><i /><i /><i /><span>graft · find_tools</span></div>
            <div className="grid">
              <div className="pane">
                <div className="label">Task</div>
                <div className="ask">Refund the customer who opened linear issue ENG-412, and let them know.</div>
                <div className="chips">
                  <span className="chip">have: linear.issue</span>
                  <span className="chip">session: support-42</span>
                </div>
                <div className="stat-row">
                  <span><b>5 of 284</b>tools returned</span>
                  {ratio && <span><b>{ratio}× less</b>schema in context</span>}
                  {one && <span><b>{one.p50} ms</b>median lookup</span>}
                </div>
              </div>
              <div className="pane">
                <div className="label">Plan</div>
                <ol className="steps-list">
                  {plan.map(([tool, why, c], i) => (
                    <li key={tool}>
                      <span className="n" style={{ background: c }}>{i + 1}</span>
                      <code>{tool}</code>
                      <span className="why">{why}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="wrap">
        {stats.length > 0 && (
          <section className="stats">
            {stats.map(([v, l]) => (
              <div className="stat" key={l}><div className="v">{v}</div><div className="l">{l}</div></div>
            ))}
          </section>
        )}

        <section className="section">
          <div className="section-head">
            <span className="kicker">What it does</span>
            <h2>Less to read. Fewer wrong turns.</h2>
            <p>Past a dozen MCP servers the tool list becomes the problem. graft makes it a lookup.</p>
          </div>
          <div className="features">
            <div className="feature">
              <h3>Finds the steps nobody named</h3>
              <p>Every tool in the graph says what it consumes and produces. graft follows those edges from the action to every lookup that feeds it.</p>
              <div className="mock">
                {plan.slice(0, 4).map(([tool, why, c]) => (
                  <div className="row2" key={tool}><code>{tool}</code><span className="tag" style={{ background: c }}>{why.replace('provides ', '')}</span></div>
                ))}
              </div>
            </div>
            <div className="feature">
              <h3>Remembers what the agent found</h3>
              <p>Results are stored in the session as entities. The next task about the same customer skips the search and starts with the id.</p>
              <div className="mock">
                <div className="row2"><span><code>stripe.customer</code> <span className="dim">cus_773200cc</span></span><span className="dim">from search_customers</span></div>
                <div className="row2"><span><code>stripe.charge</code> <span className="dim">ch_79506b5d</span></span><span className="dim">from list_charges</span></div>
                <div className="row2"><span><code>slack.channel</code> <span className="dim">C0a41f9e2</span></span><span className="dim">from find_channel</span></div>
                {cache && <div className="row2"><span className="dim">tool calls on {cache.rows.length} follow-ups</span><b>{cache.coldCalls} → {cache.warmCalls}</b></div>}
              </div>
            </div>
            <div className="feature">
              <h3>Gets sharper on the work you repeat</h3>
              <p>Agents report what they actually used. Tools graft missed become hints in the graph, so recurring tasks converge fast.</p>
              <div className="mock">
                {rec && <Spark points={rec} />}
                {rec && <div className="row2"><span className="dim">recurring tasks fully covered</span><b>{pct(rec[0]!)} → {pct(rec.at(-1)!)}</b></div>}
              </div>
            </div>
            <div className="feature">
              <h3>One server instead of twenty-four</h3>
              <p>Swap the servers in your client config for graft. Four tools: find, call, recall and report.</p>
              <div className="mock" style={{ fontFamily: 'var(--mono)', fontSize: 12.5, lineHeight: 1.7 }}>
                <span className="dim">{'{'} &quot;mcpServers&quot;: {'{'}</span><br />
                &nbsp;&nbsp;<span>&quot;graft&quot;</span><span className="dim">: {'{'} &quot;command&quot;: &quot;npm&quot;,</span><br />
                &nbsp;&nbsp;&nbsp;&nbsp;<span className="dim">&quot;args&quot;: [&quot;--silent&quot;, &quot;--prefix&quot;, &quot;…/graft&quot;,</span><br />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="dim">&quot;run&quot;, &quot;gateway&quot;] {'}'}</span><br />
                <span className="dim">{'}'} {'}'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <span className="kicker">How it works</span>
            <h2>Ask for the task, not the tool.</h2>
          </div>
          <div className="flow">
            <div><span className="num">01</span><h3>Describe the task</h3><p>The agent calls find_tools with what it is trying to do and anything it already holds, like an email or an issue key.</p></div>
            <div><span className="num">02</span><h3>graft walks the graph</h3><p>From the tools the words point to, it follows needs → entity → produced by in HydraDB until every input is covered or already known.</p></div>
            <div><span className="num">03</span><h3>Remember and learn</h3><p>call_tool stores what came back for the session; report_outcome teaches graft which tools the task really needed.</p></div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <span className="kicker">Live</span>
            <h2>Watch the walk.</h2>
            <p>This runs against the gateway. Filled boxes come from the words in the task; outlined ones were reached through the graph.</p>
          </div>
          <div className="window" style={{ marginTop: 0 }}>
            <div className="top"><i /><i /><i /><span>graft · playground</span></div>
            <div className="pane"><Live /></div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <span className="kicker">Who it is for</span>
            <h2>Agents that talk to many systems.</h2>
          </div>
          <div className="fit">
            <div style={{ ['--c' as string]: 'var(--peach)' }}><h3>Support agents</h3><p>Zendesk, Stripe, Shopify and email in one conversation, without paying for every schema on every turn.</p></div>
            <div style={{ ['--c' as string]: 'var(--sky)' }}><h3>Ops and engineering</h3><p>GitHub, PagerDuty, Datadog, Sentry and Slack, where finding the right lookup matters more than the wording.</p></div>
            <div style={{ ['--c' as string]: 'var(--lavender)' }}><h3>Agent platforms</h3><p>Let customers connect their own MCP servers, then route each task to the handful it needs.</p></div>
          </div>
        </section>

        <section className="section">
          <div className="section-head">
            <span className="kicker">Connect</span>
            <h2>One entry in your config.</h2>
            <p>Full setup, including the instructions to give the agent, is on the <Link href="/connect">connect page</Link>.</p>
          </div>
          <ConnectTabs compact />
        </section>

        <section className="closing">
          <Scene id="closing" land={false} />
          <div>
            <h2>Give your agent less to read.</h2>
            <p>Open source. Self-hosted on your own HydraDB.</p>
          </div>
          <div className="cta">
            <Link className="btn white" href="/docs">Read the docs</Link>
            <Link className="btn black" href="/benchmarks">See the benchmarks</Link>
          </div>
        </section>
      </main>
    </>
  )
}

function Spark({ points }: { points: number[] }) {
  const W = 420, H = 96, pad = 8
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2)
  const y = (v: number) => H - pad - ((v - 0.5) / 0.5) * (H - pad * 2)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 6 }} role="img" aria-label="recurring tasks fully covered by round">
      <path d={`${d} L${x(points.length - 1)},${H} L${x(0)},${H} Z`} fill="var(--s1)" opacity="0.14" />
      <path d={d} fill="none" stroke="var(--s1)" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r="3.5" fill="var(--s1)" stroke="var(--raised)" strokeWidth="2" />)}
    </svg>
  )
}
