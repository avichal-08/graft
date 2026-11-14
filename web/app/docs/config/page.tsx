import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configuration' }

const rows: [string, string, string][] = [
  ['HYDRA_HTTP_URL', 'http://127.0.0.1:8443', 'HydraDB http query endpoint'],
  ['HYDRA_TOKEN', 'local-development-token-32-bytes', 'HydraDB auth token'],
  ['HYDRA_GRAPH', 'default', 'graph id'],
  ['HYDRA_CELL', 'cell-0', 'cell to query'],
  ['HYDRA_POOL', '32', 'http connections to HydraDB'],
  ['GRAFT_SESSION', 'default', 'session for the mcp gateway'],
  ['PORT', '7700', 'http api port'],
]
const hydra: [string, string, string][] = [
  ['HYDRA_STORE', 'minio', 'minio, or local (a directory, cleared on every start)'],
  ['HYDRA_S3_ENDPOINT', 'http://127.0.0.1:9100', 'object store endpoint'],
  ['HYDRA_S3_BUCKET', 'graft', 'bucket'],
  ['HYDRA_S3_KEY / HYDRA_S3_SECRET', 'graft / graft-local-secret', 'credentials'],
  ['HYDRA_TAG', '0.4.0', 'HydraDB image version to run'],
]
const web: [string, string, string][] = [
  ['GRAFT_API', 'http://127.0.0.1:7700', 'where the web app finds the http api'],
  ['GRAFT_RESULTS', '../bench/results', 'benchmark results shown on the site'],
]

function Table({ data }: { data: [string, string, string][] }) {
  return (
    <table>
      <thead><tr><th>variable</th><th>default</th><th></th></tr></thead>
      <tbody>
        {data.map(([k, d, w]) => <tr key={k}><td><code>{k}</code></td><td><code>{d}</code></td><td>{w}</td></tr>)}
      </tbody>
    </table>
  )
}

export default function Config() {
  return (
    <>
      <h1>Configuration</h1>
      <p className="lead">Everything is set with environment variables. The defaults match the local setup from the quickstart.</p>
      <h2>Gateway and http api</h2>
      <Table data={rows} />
      <h2>Running HydraDB</h2>
      <p>Read by <code>hydra/start.sh</code> and <code>hydra/minio.sh</code>.</p>
      <Table data={hydra} />
      <h2>Web app</h2>
      <Table data={web} />
    </>
  )
}
