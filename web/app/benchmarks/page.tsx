import type { Metadata } from 'next'
import { Bars } from '@/components/bars'
import { Lines } from '@/components/lines'
import { Pairs } from '@/components/pairs'
import { results, pct } from '@/lib/results'
import { PageHero } from '@/components/page-hero'

export const metadata: Metadata = { title: 'Benchmarks' }
export const dynamic = 'force-dynamic'

const order = ['graft', 'dense top-k', 'flat top-k', 'graft lean']

export default async function Benchmarks() {
  const { test, learning, cache, load } = await results()
  const by = Object.fromEntries((test?.results ?? []).map((r) => [r.arm, r]))
  const g = by['graft'], all = by['all tools'], dense = by['dense top-k'], flat = by['flat top-k']
  const rival = dense && flat ? (dense.complete >= flat.complete ? dense : flat) : (dense ?? flat)

  const tiles: [string, string][] = []
  if (g && all) tiles.push([`${Math.round(all.tokens / g.tokens)}×`, `fewer tokens than preloading all ${Math.round(all.tools)} tools`])
  if (g && rival) tiles.push([pct(g.complete), `of held-out tasks fully covered, vs ${pct(rival.complete)} for ${rival.arm.replace(' top-k', '')} retrieval`])
  if (cache) tiles.push([`${Math.round((1 - cache.warmCalls / cache.coldCalls) * 100)}%`, 'fewer tool calls on follow-up tasks with session memory'])
  const one = load?.results.find((r) => r.connections === 1)
  if (load && one) tiles.push([`${one.p50} ms`, `median find_tools latency, ${load.results.reduce((s, r) => s + r.errors + r.non2xx, 0)} errors across all load levels`])

  return (
    <>
    <PageHero kicker="Benchmarks" title="Measured, not claimed.">
      Every number comes from the scripts in bench/ and is committed with the code. Tool selection is scored without a model: each task lists the
      tools an agent needs to finish it, including the lookups it never names.
    </PageHero>
    <main className="wrap page-body">

      <section className="tiles">
        {tiles.map(([v, l]) => (
          <div className="tile" key={l}><div className="v">{v}</div><div className="l">{l}</div></div>
        ))}
      </section>

      <section className="card">
        <h2>Tasks where the agent got every tool it needed</h2>
        {test && g ? (
          <>
            <p className="note">
              {test.tasks} held-out tasks, at most {test.k} tools, about {Math.round(g.tokens)} tokens per task. Another {test.tasks} tasks were used for tuning
              and are not counted here.
            </p>
            <div className="chart">
              <Bars
                highlight="graft"
                rows={order.filter((a) => by[a]).map((a) => ({
                  label: a,
                  value: by[a]!.complete,
                  detail: [`fully covered ${pct(by[a]!.complete)}`, `tool recall ${pct(by[a]!.recall)}`, `${by[a]!.tools.toFixed(1)} tools, ${Math.round(by[a]!.tokens)} tokens`],
                }))}
              />
            </div>
            <details>
              <summary>table view</summary>
              <div className="scroll">
                <table className="data">
                  <thead><tr><th>approach</th><th>tool recall</th><th>fully covered</th><th>precision</th><th>tools</th><th>tokens</th><th>graph queries</th></tr></thead>
                  <tbody>
                    {test.results.map((r) => (
                      <tr key={r.arm} className={r.arm === 'graft' ? 'hl' : undefined}>
                        <td>{r.arm}</td><td>{pct(r.recall)}</td><td>{pct(r.complete)}</td><td>{pct(r.precision)}</td>
                        <td>{r.tools.toFixed(1)}</td><td>{Math.round(r.tokens)}</td><td>{r.queries.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        ) : (
          <p className="empty">No results yet. Run <code>npm run bench -- --split test</code>.</p>
        )}
      </section>

      <div className="row">
        <section className="card">
          <h2>Learning from outcomes</h2>
          {learning ? (
            <>
              <p className="note">Share of tasks fully covered after each round of report_outcome feedback.</p>
              <div className="legend">
                <span><i style={{ background: 'var(--s1)' }} />recurring tasks</span>
                <span><i style={{ background: 'var(--s2)' }} />unseen tasks</span>
              </div>
              <div className="chart">
                <Lines
                  rounds={learning.rounds}
                  series={[
                    { name: 'recurring', color: 'var(--s1)', points: learning.curves.recurring.map((p) => p.complete) },
                    { name: 'unseen', color: 'var(--s2)', points: learning.curves.heldout.map((p) => p.complete) },
                  ]}
                />
              </div>
              <details>
                <summary>table view</summary>
                <table className="data">
                  <thead><tr><th>round</th><th>recurring</th><th>unseen</th></tr></thead>
                  <tbody>
                    {learning.curves.recurring.map((p, i) => (
                      <tr key={p.round}><td>{p.round}</td><td>{pct(p.complete)}</td><td>{pct(learning.curves.heldout[i]!.complete)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </>
          ) : (
            <p className="empty">Run <code>npm run learn</code>.</p>
          )}
        </section>

        <section className="card">
          <h2>Session memory on follow-up tasks</h2>
          {cache ? (
            <>
              <p className="note">
                {cache.rows.length} follow-ups after a related task: {cache.coldCalls} calls in a fresh session, {cache.warmCalls} reusing entities stored in the graph.
              </p>
              <div className="legend">
                <span><i style={{ background: 'var(--dim)' }} />fresh session</span>
                <span><i style={{ background: 'var(--s1)' }} />with session memory</span>
              </div>
              <div className="chart">
                <Pairs rows={cache.rows.map((r) => ({ label: r.pair.split(' -> ')[1] ?? r.pair, full: r.pair, cold: r.cold.calls, warm: r.warm.calls, skipped: r.skipped }))} />
              </div>
            </>
          ) : (
            <p className="empty">Run <code>npm run cache</code>.</p>
          )}
        </section>
      </div>

      <section className="card">
        <h2>Under load</h2>
        {load ? (
          <>
            <p className="note">POST /find_tools over all benchmark tasks, {load.duration} s per level. Gateway, HydraDB and MinIO on one 4-thread laptop CPU.</p>
            <div className="scroll">
              <table className="data">
                <thead><tr><th>connections</th><th>requests / s</th><th>p50</th><th>p97.5</th><th>p99</th><th>errors</th></tr></thead>
                <tbody>
                  {load.results.map((r) => (
                    <tr key={r.connections}>
                      <td>{r.connections}</td><td>{r.rps.toFixed(1)}</td><td>{r.p50} ms</td><td>{r.p95} ms</td><td>{r.p99} ms</td><td>{r.errors + r.non2xx}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="empty">Run <code>npm run load</code>.</p>
        )}
      </section>
    </main>
    </>
  )
}
