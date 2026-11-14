// compact tool specs that expand into real mcp tool definitions.
// field syntax: "name[:type][!] description"
//   type: str (default) | int | num | bool | arr | obj | date | enum(a|b|c)
//   ! marks the field required

export type JsonSchema = {
  type: 'object'
  properties: Record<string, Record<string, unknown>>
  required?: string[]
  additionalProperties?: boolean
  $schema?: string
}

export type Tool = {
  key: string // server.name, unique
  server: string
  name: string // mcp tool name as an agent would see it
  description: string
  inputSchema: JsonSchema
  needs: string[] // entity types consumed
  gives: string[] // entity types produced
  caps: string[] // capability phrases this tool satisfies
}

export type Server = {
  name: string
  title: string
  description: string
  tools: Tool[]
}

type ToolOpts = { needs?: string[]; gives?: string[]; caps?: string[] }
type ToolDef = { name: string; desc: string; fields: string[]; opts: ToolOpts }

export const t = (name: string, desc: string, fields: string[], opts: ToolOpts = {}): ToolDef => ({ name, desc, fields, opts })

export function server(name: string, title: string, description: string, defs: ToolDef[]): Server {
  return {
    name,
    title,
    description,
    tools: defs.map((d) => ({
      key: `${name}.${d.name}`,
      server: name,
      name: `${name}_${d.name}`,
      description: d.desc,
      inputSchema: schema(d.fields),
      needs: d.opts.needs ?? [],
      gives: d.opts.gives ?? [],
      caps: d.opts.caps ?? [],
    })),
  }
}

const fieldRe = /^([a-z_][a-z0-9_]*)(?::([a-z]+(?:\([^)]*\))?))?(!)?\s+(.+)$/i

function schema(fields: string[]): JsonSchema {
  const properties: JsonSchema['properties'] = {}
  const required: string[] = []
  for (const f of fields) {
    const m = fieldRe.exec(f)
    if (!m) throw new Error(`bad field spec: ${f}`)
    const [, name, type = 'str', req, description] = m as unknown as [string, string, string | undefined, string | undefined, string]
    properties[name] = { ...jsonType(type), description }
    if (req) required.push(name)
  }
  // same envelope zod-to-json-schema emits for typical ts mcp servers
  return {
    type: 'object',
    properties,
    ...(required.length ? { required } : {}),
    additionalProperties: false,
    $schema: 'http://json-schema.org/draft-07/schema#',
  }
}

function jsonType(t: string): Record<string, unknown> {
  if (t.startsWith('enum(')) return { type: 'string', enum: t.slice(5, -1).split('|') }
  switch (t) {
    case 'str': return { type: 'string' }
    case 'int': return { type: 'integer' }
    case 'num': return { type: 'number' }
    case 'bool': return { type: 'boolean' }
    case 'arr': return { type: 'array', items: { type: 'string' } }
    case 'obj': return { type: 'object', additionalProperties: true }
    case 'date': return { type: 'string', format: 'date-time' }
    default: throw new Error(`unknown field type ${t}`)
  }
}

// literal types an agent can author itself; never need a producer tool
export const FREE_TYPES = new Set(['text', 'query', 'date', 'url', 'amount', 'title', 'path', 'code', 'sql', 'number'])
