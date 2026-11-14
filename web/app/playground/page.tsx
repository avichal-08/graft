import type { Metadata } from 'next'
import { Live } from '@/components/live'

export const metadata: Metadata = { title: 'Playground' }

export default function Playground() {
  return (
    <main className="wrap">
      <div className="dash-head">
        <h1>Playground</h1>
        <p>
          Type a task the way you would ask an agent. graft picks the tools the words point to, then walks the graph from what each one needs to the
          tool that provides it, and stops at anything you already hold.
        </p>
      </div>
      <section className="card" style={{ marginTop: 24 }}>
        <Live />
      </section>
    </main>
  )
}
