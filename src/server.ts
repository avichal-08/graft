// plain http api over the same gateway, used by the dashboard and the load test.
// POST /find_tools, /call_tool, /recall_entities, /report_outcome with json bodies.
import { createServer, type IncomingMessage } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Gateway } from './gateway/core.js'

const port = Number(process.env.PORT ?? 7700)
const gw = await Gateway.open()

const routes: Record<string, (b: any) => Promise<unknown>> = {
  '/find_tools': (b) => gw.findTools(b),
  '/call_tool': (b) => gw.callTool(b),
  '/recall_entities': (b) => gw.recall(b.session ?? 'default', b.type),
  '/report_outcome': (b) => gw.feedback(b),
}

async function body(req: IncomingMessage) {
  let s = ''
  for await (const chunk of req) s += chunk
  return s ? JSON.parse(s) : {}
}

const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://x')
  try {
    if (req.method === 'POST' && routes[url.pathname]) {
      const out = await routes[url.pathname]!(await body(req))
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out))
      return
    }
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ ok: true, tools: gw.cat.toolList.length }))
      return
    }
    if (req.method === 'GET') {
      const path = url.pathname === '/' ? '/index.html' : url.pathname
      if (path.includes('..')) throw new Error('bad path')
      const file = join('web', path)
      const ext = path.slice(path.lastIndexOf('.'))
      res.writeHead(200, { 'content-type': types[ext] ?? 'application/octet-stream' }).end(await readFile(file))
      return
    }
    res.writeHead(404).end()
  } catch (e) {
    const msg = (e as Error).message
    res.writeHead((e as NodeJS.ErrnoException).code === 'ENOENT' ? 404 : 400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: msg }))
  }
}).listen(port, () => console.log(`graft on http://127.0.0.1:${port}`))
