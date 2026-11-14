import type { Metadata } from 'next'
import { Code } from '@/components/code'
import { Callout } from '@/components/steps'

export const metadata: Metadata = { title: 'Adding tools' }

export default function Catalog() {
  return (
    <>
      <h1>Adding tools</h1>
      <p className="lead">
        The catalog is TypeScript in <code>src/catalog/servers</code>. Each tool states its inputs, the entity types it needs and gives, and the
        capabilities it covers. That is what the walk runs on.
      </p>

      <h2>A server and its tools</h2>
      <Code label="src/catalog/servers/acme.ts">{`import { server, t } from '../dsl.js'

export const acme = server('acme', 'Acme Billing', 'Accounts and invoices in Acme.', [
  t('find_account', 'Find an account by owner email.',
    ['email! Owner email address'],
    { needs: ['email'], gives: ['acme.account'], caps: ['look up customer'] }),

  t('list_invoices', 'List invoices for an account, newest first.',
    ['account! Account id', 'status:enum(open|paid|void) Invoice status', 'limit:int Max results'],
    { needs: ['acme.account'], gives: ['acme.invoice'], caps: ['billing history'] }),

  t('void_invoice', 'Void an open invoice.',
    ['invoice! Invoice id'],
    { needs: ['acme.invoice'], caps: ['void invoice'] }),
])`}</Code>

      <h3>Field syntax</h3>
      <p>
        <code>name[:type][!] description</code>, where <code>!</code> marks a required field and type is one of <code>str</code> (the default),{' '}
        <code>int</code>, <code>num</code>, <code>bool</code>, <code>arr</code>, <code>obj</code>, <code>date</code> or <code>enum(a|b|c)</code>. Fields expand
        into a JSON schema like the ones MCP servers publish.
      </p>

      <h3>needs, gives and caps</h3>
      <ul>
        <li><strong>needs</strong>: entity types the tool consumes. Namespace ids by service (<code>acme.account</code>); shared kinds like <code>email</code> connect services.</li>
        <li><strong>gives</strong>: entity types it returns. A tool that gives a type is a candidate producer for every tool that needs it.</li>
        <li><strong>caps</strong>: short phrases for what the tool is for. Reusing a phrase across servers (<code>look up customer</code>) groups equivalent tools.</li>
      </ul>

      <h2>Register and load</h2>
      <p>Import the server in <code>src/catalog/index.ts</code> and add it to the <code>servers</code> list, then check and reload:</p>
      <Code label="shell">{`npx tsx scripts/catalog-stats.ts   # counts, tokens, entity types with no producer
npm run ingest -- --wipe           # reload the graph`}</Code>
      <Callout tone="warn">
        <code>--wipe</code> clears the whole graph, including sessions and learned hints, because node ids follow catalog order. Without it, ingest only adds.
      </Callout>
    </>
  )
}
