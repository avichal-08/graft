// setup snippets per mcp client. the path placeholder is replaced in the ui.
export const PATH = '/path/to/graft'

export type Client = { id: string; name: string; where: string; lang: string; snippet: (path: string) => string; note?: string }

const json = (path: string, cmd = 'npm') =>
  JSON.stringify(
    { mcpServers: { graft: { command: cmd, args: ['--silent', '--prefix', path, 'run', 'gateway'], env: { GRAFT_SESSION: 'my-agent' } } } },
    null,
    2,
  )

export const clients: Client[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    where: 'run in your project',
    lang: 'shell',
    snippet: (p) => `claude mcp add graft -e GRAFT_SESSION=my-agent -- npm --silent --prefix ${p} run gateway`,
  },
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    where: 'claude_desktop_config.json (Settings → Developer → Edit config)',
    lang: 'json',
    snippet: (p) => json(p),
    note: 'On Windows use "npm.cmd" as the command.',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    where: '.cursor/mcp.json in your project, or ~/.cursor/mcp.json',
    lang: 'json',
    snippet: (p) => json(p),
    note: 'On Windows use "npm.cmd" as the command.',
  },
  {
    id: 'codex',
    name: 'Codex',
    where: '~/.codex/config.toml',
    lang: 'toml',
    snippet: (p) => `[mcp_servers.graft]\ncommand = "npm"\nargs = ["--silent", "--prefix", "${p}", "run", "gateway"]\nenv = { GRAFT_SESSION = "my-agent" }`,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    where: '~/.codeium/windsurf/mcp_config.json',
    lang: 'json',
    snippet: (p) => json(p),
  },
  {
    id: 'any',
    name: 'Any MCP client',
    where: 'stdio transport',
    lang: 'shell',
    snippet: (p) => `# command the client should spawn\nnpm --silent --prefix ${p} run gateway\n\n# or over http, without mcp\ncurl -s localhost:7700/find_tools -H 'content-type: application/json' \\\n  -d '{"task": "refund the last charge for jane@acme.com", "have": ["email"]}'`,
  },
]

// what to tell the agent so it routes through graft instead of guessing
export const agentInstructions = `You have a tool router called graft.

Before doing a task, call find_tools with the task in plain words and any
entity types you already hold (an email, an issue key). Use only the tools it
returns, in the order of its plan. Check "known" first: those entities were
already resolved in this session, so skip the lookups that produce them.

Run tools through call_tool with the lookup id from find_tools. When the task
is done, call report_outcome with success and the tools you used, including
any you had to find another way.`
