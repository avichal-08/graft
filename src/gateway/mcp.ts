// graft as an mcp server over stdio. point any mcp client at this one server
// instead of every upstream server it would otherwise load.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { Gateway } from './core.js'

const gw = await Gateway.open()
const session = process.env.GRAFT_SESSION ?? 'default'

const server = new McpServer({ name: 'graft', version: '0.1.0' })
const json = (v: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(v, null, 2) }] })

server.registerTool(
  'find_tools',
  {
    description:
      'Describe what you are trying to do and get back only the tools you need for it, including the lookups that produce their inputs, in the order to use them. Entities you already resolved in this session are listed under known so you can skip those lookups. Call it again when the task changes.',
    inputSchema: {
      task: z.string().describe('the task in plain words, e.g. "refund the last charge for jane@acme.com and email her"'),
      have: z.array(z.string()).optional().describe('entity types you already hold, e.g. ["email", "linear.issue"]'),
      k: z.number().int().min(1).max(30).optional().describe('max tools to return, default 10'),
    },
  },
  async ({ task, have, k }) => json(await gw.findTools({ task, have, k, session })),
)

server.registerTool(
  'call_tool',
  {
    description: 'Run one of the tools returned by find_tools. Pass the lookup id from find_tools so graft can learn which picks were useful.',
    inputSchema: {
      name: z.string().describe('tool name exactly as find_tools returned it'),
      args: z.record(z.string(), z.unknown()).optional().describe('arguments matching the tool input schema'),
      lookup: z.string().optional().describe('lookup id from the find_tools call this came from'),
    },
  },
  async ({ name, args, lookup }) => json(await gw.callTool({ name, args, lookup, session })),
)

server.registerTool(
  'recall_entities',
  {
    description: 'List entities already resolved in this session (customers, channels, issues, ids), so you can reuse them instead of looking them up again.',
    inputSchema: { type: z.string().optional().describe('only this entity type, e.g. "stripe.customer"') },
  },
  async ({ type }) => json(await gw.recall(session, type)),
)

server.registerTool(
  'report_outcome',
  {
    description: 'Tell graft whether the task behind a find_tools lookup succeeded, and name any tool you needed that it did not return.',
    inputSchema: {
      lookup: z.string(),
      success: z.boolean(),
      used: z.array(z.string()).optional().describe('tools you used, including ones you found elsewhere'),
    },
  },
  async ({ lookup, success, used }) => json(await gw.feedback({ lookup, success, used })),
)

await server.connect(new StdioServerTransport())
