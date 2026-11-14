# graft

A context layer for agents. Instead of loading every tool from every MCP server into the
model's window, an agent connects to graft and asks for what the task in front of it needs.
graft keeps the tool catalog, the skills and everything the agent has already resolved in a
[HydraDB](https://github.com/hydra-db/hydradb) graph, walks that graph, and hands back only
those tools, including the lookups the task never mentions.

Built for the HydraDB hackathon, track 2: the agent context layer.

```
"refund the customer who opened linear issue ENG-412"

  stripe.create_refund ── needs stripe.charge ──▶ stripe.list_charges
                                                       │ needs stripe.customer
                                                       ▼
                                             stripe.search_customers
                                                       │ needs email
                                                       ▼
                                                 linear.get_user ◀── linear.issue (given)
```

Text search finds `create_refund`. Nothing in the sentence says "list charges", "search
customers" or "get user"; graft reaches them by following what each tool consumes to the tools
that produce it.

## What it does

- **Only what the task needs.** `find_tools` returns about 10 tool schemas (~1,000 tokens)
  instead of all 284 (27,665 tokens), ordered so each tool is followed by the lookups that feed it.
- **Dependency chains, from the graph.** Every tool declares the entity types it consumes and
  produces. The walk runs in HydraDB, one batched hop at a time, and stops as soon as an input
  is something the agent already holds.
- **Memory of what was resolved.** Results from `call_tool` are written back as entities linked
  to the session. A follow-up task about the same customer, channel or pull request skips the
  lookups it would otherwise repeat.
- **Learns from outcomes.** `report_outcome` says what the agent actually used. Tools it needed
  that graft missed grow word and entity-type hints in the graph; the next lookup uses them.
- **One MCP server.** Point any MCP client at graft instead of 24 servers. There is also a plain
  HTTP API and a dashboard.

## Results

All numbers come from scripts in [`bench`](bench) and are committed in
[`bench/results`](bench/results). Tool selection is scored without an LLM, so the runs are
deterministic: each task lists the minimal set of tools an agent needs to finish it, unnamed
lookups included.

**Tool selection**, on 30 held-out tasks (another 30 were used for tuning), at most 10 tools:

| approach | gold tools returned | tasks with every tool needed | tokens per task |
|---|---|---|---|
| preload all 284 tools | 100% | 100% | 27,665 |
| keyword search, top 10 | 76.4% | 46.7% | 998 |
| embedding search, top 10 (MiniLM) | 76.0% | 53.3% | 1,015 |
| **graft** | **86.5%** | **66.7%** | **998** |
| graft, graph picks only | 73.6% | 43.3% | 495 |

At the same token budget as similarity search, graft gives the agent a complete toolset on
two thirds of unseen tasks against about half. Both are roughly 28× cheaper than preloading.

**Session memory**, on 12 follow-up tasks run after a related one: 29 tool calls in a fresh
session, **15 with the session's entities (48% fewer)**, and `find_tools` still returned every
tool that was needed in all 12.

**Learning**, tasks with every tool needed after each round of outcome feedback:

| round | 0 | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| recurring tasks | 66.7% | 90.0% | 100% | 100% | 100% | 100% |
| unseen tasks | 66.7% | 66.7% | 66.7% | 66.7% | 66.7% | 63.3% |

Teams run the same workflows over and over, and those converge in two rounds. Feedback does not
yet transfer to unseen tasks: with 30 training tasks there is little shared vocabulary to learn
from, and by round 5 one unseen task gets worse. An earlier version that also decayed hints for
ignored picks hurt unseen tasks more; it was dropped after measuring on a split of the tuning
tasks, not on the held-out ones.

**Under load**, `POST /find_tools` over all 60 tasks, 20 s per level, with the gateway, HydraDB
and MinIO on one 4-thread laptop CPU:

| connections | requests / s | p50 | p99 | errors |
|---|---|---|---|---|
| 1 | 21 | 44 ms | 103 ms | 0 |
| 10 | 36 | 253 ms | 708 ms | 0 |
| 50 | 39 | 1.18 s | 2.7 s | 0 |

Each lookup is about 4 graph queries; HydraDB alone serves ~250 queries/s on the same machine,
so the ceiling here is the shared CPU.

## How it works

The graph, in HydraDB:

```
(:Server)<-[:PROVIDED_BY]-(:Tool)-[:CONSUMES]->(:EntityType)-[:PRODUCED_BY]->(:Tool)
(:Capability)-[:SATISFIED_BY]->(:Tool)            what a tool is for, in plain words
(:Skill)-[:USES]->(:Tool)                         recipes
(:Session)-[:RESOLVED]->(:Entity)-[:INSTANCE_OF]->(:EntityType)
(:Entity)-[:RESOLVED_BY]->(:Tool)                 where a value came from
(:Run)-[:CALLED]->(:Tool)                         every call
(:Term)-[:SUGGESTS]->(:Hint {w})-[:FOR]->(:Tool)  learned from outcomes
```

`find_tools` in [`src/retrieve/graft.ts`](src/retrieve/graft.ts):

1. **Anchors.** The task is split into clauses ("refund jane, then email her" is two intents).
   Each clause is matched against tool text and against capabilities, whose `SATISFIED_BY` edges
   are read in one query, plus any learned hints. The best tool per clause, and the strongest
   tools for the whole task, become anchors.
2. **Walk.** For the anchors, read `CONSUMES`; drop entity types that are free text or already
   held (from the task or the session); read `PRODUCED_BY` for the rest; score each producer
   (a lookup rather than a write, named after the entity, specific, grounded in something the
   agent has, learned hints) and keep the best; repeat from the new tools, up to 4 hops. Each hop
   is one batched `UNWIND ... MATCH` over the whole frontier, with a guard against cycles.
3. **Order and cut.** Each anchor is followed by its chain, so a small `k` keeps whole chains
   rather than many bare anchors, then the result is cut to `k` tools and a token budget.

Tool text and some per-tool metadata (inputs, outputs, learned hints) are loaded from HydraDB
into memory at startup for matching and scoring; the capability edges and the dependency walk
are read from HydraDB on every call.

## Use it

The gateway is an MCP server over stdio with four tools:

| tool | does |
|---|---|
| `find_tools` | describe the task, get back the tools for it, the plan, and entities already known |
| `call_tool` | run one of those tools; results are stored as entities in the session |
| `recall_entities` | list what this session has already resolved |
| `report_outcome` | say whether the task worked and which tools were used |

`call_tool` runs a deterministic stand-in for the upstream servers, so everything works without
accounts. Proxying to real MCP servers is the next step.

An MCP client config (on Windows the command is `npm.cmd`):

```json
{
  "mcpServers": {
    "graft": {
      "command": "npm",
      "args": ["--silent", "--prefix", "/path/to/graft", "run", "gateway"],
      "env": { "GRAFT_SESSION": "my-agent" }
    }
  }
}
```

## Who it is for

Teams whose agents talk to many systems: support agents that touch Zendesk, Stripe and
Shopify; internal ops agents across GitHub, PagerDuty, Datadog and Slack; agent platforms that
let customers connect their own MCP servers. Past a dozen servers, the tool list itself becomes
the problem: every turn pays for tens of thousands of tokens of schemas, the model picks between
near-identical tools, and it rediscovers the same customer id on every task.

graft is the piece between the agent and its tools, the way a CDN sits between users and
origins:

- **Cost.** 27,665 → ~1,000 tokens of tool schemas per turn in this catalog. At $3 per million
  input tokens that is about $0.08 saved per turn, or $80,000 a month at a million turns, before
  counting the calls that session memory removes.
- **Reliability.** The agent sees the lookups a task needs, not only the tool that matches its
  wording, and does not repeat them.
- **An audit trail for free.** Every call, the entity it produced and the session it belongs to
  are already in the graph.

How it would be sold:

- **Open source gateway**, self-hosted against your own HydraDB, free.
- **Hosted**, priced per million `find_tools` calls, with a free tier for small catalogs.
- **Enterprise**, on your infrastructure, with per-team catalogs, SSO, and the run and entity
  graph as a queryable record of what agents did.

## Limits

- The catalog is 284 tools across 24 servers, written by hand with their inputs and outputs.
  Real servers would need that mapping extracted from their schemas.
- The 60 tasks and their gold toolsets were written for this project. They are split into
  tuning and held-out halves, and every number above is on the held-out half, but they are not
  an external benchmark.
- `call_tool` uses a stand-in executor rather than calling real services.
- Learning helps recurring work, not unseen tasks yet (see above).

## Layout

```
src/
  catalog/      the tool catalog: servers, tools with their inputs and outputs, skills
  ingest/       loads the catalog into hydradb
  retrieve/     find_tools: text matching, the graph walk, the catalog view
  learn/        hints learned from outcomes, stored in the graph
  gateway/      mcp server, core (find, call, recall, feedback), stand-in executor
  graph/        id ranges and relationship types
  db.ts         hydradb http client: typed cells, bookmarks, batching
  server.ts     http api used by the web app and the load test
bench/          tasks, baselines, learning, session memory and load benchmarks, results
web/            next.js site: landing, connect, playground, benchmarks and docs
hydra/          run hydradb locally (published image, no docker build) and minio
scripts/        probes and debugging helpers
```

## Development

Requires Node 22, WSL (or Linux) for HydraDB, and Docker for MinIO.

```bash
npm install
npm --prefix web install

bash hydra/minio.sh                 # minio on :9100 with a "graft" bucket (from a shell with docker)
wsl bash hydra/up.sh                # hydradb graph-node: bolt :7687, http :8443
npm run ingest                      # load the catalog, once; data lives in minio

npm run serve                       # http api on :7700
npm run web                         # site on :3100: connect, playground, benchmarks, docs
npm run gateway                     # mcp server on stdio
```

`hydra/fetch.py` downloads the published `ghcr.io/hydra-db/hydradb` image and `hydra/start.sh`
runs `graph-node` with the image's own loader and libraries, so no Rust build or system
packages are needed. `HYDRA_STORE=local` uses a local directory instead of MinIO; that store
cannot reopen after a restart, so it starts empty each time.

Benchmarks:

```bash
npm run bench -- --split test       # tool selection, all approaches
npm run learn                       # learning curves
npm run cache                       # session memory on follow-ups
npm run load                        # load test
npm run probe                       # which cypher features this hydradb supports
```

## License

MIT
