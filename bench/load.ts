// npm run load -- [--duration 20] [--levels 1,10,50]
// starts the http gateway, then hammers POST /find_tools with the benchmark
// tasks at each concurrency level. every request walks the graph in hydradb.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
import autocannon from 'autocannon'
import { tasks } from './tasks.js'

const arg = (name: string, def: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1]! : def
}
const duration = Number(arg('duration', '20'))
const levels = arg('levels', '1,10,50').split(',').map(Number)
const port = 7790
const base = `http://127.0.0.1:${port}`

const server = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' })
const stop = () => server.kill()
process.on('exit', stop)

for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${base}/health`)).ok) break
  } catch {}
  if (i > 60) throw new Error('gateway did not start')
  await new Promise((r) => setTimeout(r, 1000))
}

const bodies = tasks.map((t) => JSON.stringify({ task: t.task, have: t.have, k: 10 }))
let n = 0

type Level = { connections: number; rps: number; p50: number; p95: number; p99: number; errors: number; non2xx: number; requests: number }
const results: Level[] = []

for (const connections of levels) {
  const r = await autocannon({
    url: `${base}/find_tools`,
    connections,
    duration,
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    requests: [{ setupRequest: (req) => ({ ...req, body: bodies[n++ % bodies.length] }) }],
  })
  const level = {
    connections,
    rps: r.requests.average,
    p50: r.latency.p50,
    p95: r.latency.p97_5 ?? r.latency.p99,
    p99: r.latency.p99,
    errors: r.errors + r.timeouts,
    non2xx: r.non2xx,
    requests: r.requests.total,
  }
  results.push(level)
  console.log(`${String(connections).padStart(3)} conn  ${level.rps.toFixed(1).padStart(6)} req/s  p50 ${level.p50} ms  p97.5 ${level.p95} ms  p99 ${level.p99} ms  errors ${level.errors}  non-2xx ${level.non2xx}  (${level.requests} requests)`)
}

stop()
mkdirSync('bench/results', { recursive: true })
writeFileSync('bench/results/load.json', JSON.stringify({ duration, results }, null, 2))
process.exit(0)
