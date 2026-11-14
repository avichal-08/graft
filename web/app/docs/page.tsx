import type { Metadata } from 'next'
import Link from 'next/link'
import { Code } from '@/components/code'
import { Steps, Step, Callout } from '@/components/steps'

export const metadata: Metadata = { title: 'Quickstart' }

export default function Quickstart() {
  return (
    <>
      <h1>Quickstart</h1>
      <p className="lead">Run the graph, load the tool catalog and point an agent at graft. About ten minutes on a laptop.</p>

      <h2>Before you start</h2>
      <ul>
        <li><strong>Node 22</strong> for graft and this site.</li>
        <li><strong>Linux or WSL</strong> to run the HydraDB graph node.</li>
        <li><strong>Docker</strong> for MinIO, the S3-compatible store HydraDB keeps the graph in.</li>
      </ul>

      <h2>Set up</h2>
      <Steps>
        <Step title="Install">
          <Code label="shell">{`git clone https://github.com/avichal-08/graft.git
cd graft
npm install
npm --prefix web install`}</Code>
        </Step>
        <Step title="Start the graph">
          <p>
            MinIO first, then HydraDB. The first run downloads the published HydraDB image and runs <code>graph-node</code> with its own
            libraries, so there is nothing to compile.
          </p>
          <Code label="shell">{`bash hydra/minio.sh      # minio on :9100 with a "graft" bucket
bash hydra/up.sh         # hydradb on :8443 (run inside wsl on windows)
npm run probe            # optional: checks the cypher features graft relies on`}</Code>
        </Step>
        <Step title="Load the catalog">
          <p>Writes tools, capabilities, entity types and skills into the graph. The data lives in MinIO, so you only do this once.</p>
          <Code label="shell">{`npm run ingest
# ingested 642 nodes and 1297 edges`}</Code>
        </Step>
        <Step title="Run graft">
          <Code label="shell">{`npm run serve            # http api on :7700
npm run web              # this site on :3100`}</Code>
          <p>
            The MCP gateway itself is started by your client, so there is no need to run it by hand. Next, <Link href="/docs/mcp">connect a client</Link>, or
            try a task in the <Link href="/playground">playground</Link>.
          </p>
        </Step>
      </Steps>

      <Callout title="No accounts needed">
        <code>call_tool</code> runs a built-in stand-in for the upstream services. Results look real and are stored in the graph like real ones, so the
        whole loop works on a laptop.
      </Callout>
    </>
  )
}
