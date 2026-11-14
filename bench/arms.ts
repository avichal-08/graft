// the three ways an agent can get its tools into context
import type { GraphCatalog, ToolNode } from '../src/retrieve/catalog.js'
import { findTools } from '../src/retrieve/graft.js'
import type { Task } from './tasks.js'
import { corpus, embed, cosine } from './embed.js'

export type Selection = { tools: ToolNode[]; queries: number }
export type Arm = { name: string; select: (cat: GraphCatalog, t: Task, k: number) => Promise<Selection> }

// every tool from every server, the default for mcp clients today
export const all: Arm = {
  name: 'all tools',
  select: async (cat) => ({ tools: cat.toolList, queries: 0 }),
}

// tool rag: top-k by text similarity over names and descriptions
export const flat: Arm = {
  name: 'flat top-k',
  select: async (cat, t, k) => {
    const s = cat.toolIndex.scores(t.task)
    const top = [...s.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).filter(([, x]) => x > 0)
    return { tools: top.map(([i]) => cat.toolList[i]!), queries: 0 }
  },
}

// tool rag with embeddings: cosine between the task and each tool's text
let vecs: Float32Array[] | undefined
export const dense: Arm = {
  name: 'dense top-k',
  select: async (cat, t, k) => {
    vecs ??= await corpus(cat.toolDocs)
    const [q] = await embed([t.task])
    const top = vecs.map((v, i) => [i, cosine(q!, v)] as const).sort((a, b) => b[1] - a[1]).slice(0, k)
    return { tools: top.map(([i]) => cat.toolList[i]!), queries: 0 }
  },
}

// graph picks only: anchors and the producers their inputs need
export const lean: Arm = {
  name: 'graft lean',
  select: async (cat, t, k) => {
    const r = await findTools(cat, t.task, { have: t.have, k })
    return { tools: r.picks.map((p) => p.tool), queries: r.queries }
  },
}

// graph picks first, then the next best text matches up to k
export const graft: Arm = {
  name: 'graft',
  select: async (cat, t, k) => {
    const r = await findTools(cat, t.task, { have: t.have, k, fill: true })
    return { tools: r.picks.map((p) => p.tool), queries: r.queries }
  },
}
