import type { Metadata } from 'next'
import Link from 'next/link'
import { Code } from '@/components/code'

export const metadata: Metadata = { title: 'Quickstart' }

export default function Quickstart() {
  return (
    <>
      <h1>Quickstart</h1>
      <p className="lead">Run the graph, load the tool catalog, and point an agent at graft. About ten minutes on a laptop.</p>

      <h2>What you need</h2>
      <ul>
        <li><strong>Node 22</strong> for graft and the web app.</li>
        <li><strong>Linux or WSL</strong> to run the HydraDB graph node.</li>
        <li><strong>Docker</strong> for MinIO, the S3-compatible store HydraDB keeps the graph in.</li>
      </ul>

      <h2>1. Install</h2>
      <Code label="shell">{`git clone https://github.com/avichal-08/graft.git
cd graft
npm install
npm --prefix web install`}</Code>

      <h2>2. Start the graph</h2>
      <p>
        MinIO first, then HydraDB. <code>hydra/up.sh</code> downloads the published HydraDB image the first time and runs <code>graph-node</code> with
        its own libraries, so there is nothing to compile.
      </p>
      <Code label="shell">{`bash hydra/minio.sh      # minio on :9100 with a "graft" bucket
bash hydra/up.sh         # hydradb: http :8443, bolt :7687 (run inside wsl on windows)
npm run probe            # optional: checks the cypher features graft relies on`}</Code>

      <h2>3. Load the catalog</h2>
      <p>Writes the tools, capabilities, entity types and skills into the graph. The data lives in MinIO, so this is a one-time step.</p>
      <Code label="shell">{`npm run ingest
# ingested 642 nodes and 1297 edges`}</Code>

      <h2>4. Run graft</h2>
      <Code label="shell">{`npm run serve            # http api on :7700, used by the web app
npm run web              # this site on :3100
npm run gateway          # the mcp server, on stdio (your client starts this)`}</Code>
      <p>
        You do not need to start the gateway yourself when you use an MCP client: the client spawns it. Next, <Link href="/docs/mcp">connect a client</Link>, or
        try a task in the <Link href="/playground">playground</Link>.
      </p>

      <div className="callout" style={{ ['--c' as string]: 'var(--butter)' }}>
        <code>call_tool</code> runs a built-in stand-in for the upstream services, so everything works without accounts. Results look real and are stored
        in the graph like real ones.
      </div>
    </>
  )
}
