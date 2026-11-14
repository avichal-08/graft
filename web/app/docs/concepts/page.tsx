import type { Metadata } from 'next'
import { Code } from '@/components/code'

export const metadata: Metadata = { title: 'Concepts' }

export default function Concepts() {
  return (
    <>
      <h1>Concepts</h1>
      <p className="lead">What graft keeps in the graph, and how a lookup uses it.</p>

      <h2>The graph</h2>
      <p>Everything lives in HydraDB. Tools are nodes; what connects them is the data they pass to each other.</p>
      <Code label="schema">{`(:Server)<-[:PROVIDED_BY]-(:Tool)-[:CONSUMES]->(:EntityType)-[:PRODUCED_BY]->(:Tool)
(:Capability)-[:SATISFIED_BY]->(:Tool)            what a tool is for, in plain words
(:Skill)-[:USES]->(:Tool)                         reusable recipes
(:Session)-[:RESOLVED]->(:Entity)-[:INSTANCE_OF]->(:EntityType)
(:Entity)-[:RESOLVED_BY]->(:Tool)                 where a value came from
(:Run)-[:CALLED]->(:Tool)                         every call
(:Term)-[:SUGGESTS]->(:Hint {w})-[:FOR]->(:Tool)  learned from outcomes`}</Code>

      <h2>Entity types</h2>
      <p>
        An entity type is a kind of value a tool takes or returns: <code>stripe.customer</code>, <code>slack.channel</code>, <code>github.pr</code>,{' '}
        <code>email</code>. Some types are free text the agent can write itself (<code>text</code>, <code>query</code>, <code>date</code>, <code>url</code>); those
        never need a lookup. Everything else has to come from somewhere: the task, the session, or another tool.
      </p>

      <h2>Anchors</h2>
      <p>
        The task is split into clauses, so “refund jane, then email her” is two intents. Each clause is matched against tool descriptions and against
        capabilities, plus any hints learned from earlier outcomes. The best tool for each clause, and the strongest tools for the task as a whole, are the
        anchors: the actions the task is asking for.
      </p>

      <h2>The walk</h2>
      <p>From the anchors, graft reads what they consume. For each entity type that is not free text and not already held, it reads which tools produce it and picks one, preferring:</p>
      <ul>
        <li>a read over a write (find a customer, do not create one),</li>
        <li>a tool named after the entity (<code>find_channel</code> for a channel),</li>
        <li>a specific tool over one that returns many things,</li>
        <li>a tool that starts from something the agent already has,</li>
        <li>and whatever past outcomes taught it.</li>
      </ul>
      <p>
        Then it repeats from the new tools, up to four hops, never picking a tool that needs something further up its own chain. Each hop is one batched
        query over the whole frontier.
      </p>

      <h2>Session memory</h2>
      <p>
        <code>call_tool</code> writes what a tool returned as entities in the session. The next <code>find_tools</code> in that session treats those types as
        already held, so lookups that would only produce them again are dropped from the plan, and their values are returned under <code>known</code>.
      </p>

      <h2>Learning</h2>
      <p>
        <code>report_outcome</code> adjusts hints, stored in the graph as weights between a word or an entity type and a tool. Tools the agent used that graft
        picked get a little stronger; tools it needed that graft missed get stronger still; a producer graft picked for a type the agent got another way
        gets weaker. Hints help most on work that repeats.
      </p>
    </>
  )
}
