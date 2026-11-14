import { getEncoding } from 'js-tiktoken'
import { FREE_TYPES, type Server, type Tool } from './dsl.js'
import { dev } from './servers/dev.js'
import { comms } from './servers/comms.js'
import { biz } from './servers/biz.js'
import { ops } from './servers/ops.js'
import { docs } from './servers/docs.js'

export const servers: Server[] = [...dev, ...comms, ...biz, ...ops, ...docs]
export const tools: Tool[] = servers.flatMap((s) => s.tools)
export const toolByKey = new Map(tools.map((t) => [t.key, t]))

// the definition an mcp client would put in the model's context
export function definition(t: Tool) {
  return { name: t.name, description: t.description, inputSchema: t.inputSchema }
}

const enc = getEncoding('cl100k_base')
const tokenCache = new Map<string, number>()

export function tokens(t: Tool): number {
  let n = tokenCache.get(t.key)
  if (n === undefined) {
    n = enc.encode(JSON.stringify(definition(t))).length
    tokenCache.set(t.key, n)
  }
  return n
}

export function entityTypes() {
  const types = new Set<string>()
  for (const t of tools) for (const e of [...t.needs, ...t.gives]) types.add(e)
  return [...types].sort()
}

export const isFree = (type: string) => FREE_TYPES.has(type)
