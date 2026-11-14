import type { Metadata } from 'next'
import { PageHero } from '@/components/page-hero'
import { Playground } from '@/components/playground'

export const metadata: Metadata = { title: 'Playground' }

export default function PlaygroundPage() {
  return (
    <>
      <PageHero kicker="Playground" title="Watch graft pick the tools.">
        Describe a task the way you would ask an agent. graft starts from the tools your words point to and walks the graph to every lookup they
        depend on, stopping at anything you already hold.
      </PageHero>
      <main className="wrap page-body">
        <Playground />
      </main>
    </>
  )
}
