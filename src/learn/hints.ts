// learned routing hints, stored in the graph as
//   (:Term {key})-[:SUGGESTS]->(:Hint {w})-[:FOR]->(:Tool)
// a term is a task word ("w:refund") or an entity type ("t:slack.channel").
// w starts at 1 (neutral); ln(w) is what scoring adds.
import { batch, float, run } from '../db.js'
import { RANGE, REL } from '../graph/schema.js'
import { tokenize } from '../retrieve/bm25.js'

export const MIN_W = 0.2
export const MAX_W = 5

export const wordTerms = (text: string) => [...new Set(tokenize(text).filter((w) => !/^\d+$/.test(w)))].map((w) => `w:${w}`)
export const typeTerm = (type: string) => `t:${type}`

export class Hints {
  private terms = new Map<string, number>() // term key -> node id
  private hints = new Map<string, { id: number; w: number }>() // term|tool -> hint
  private byTerm = new Map<string, Map<number, number>>() // term -> tool -> w
  private next: { term: number; hint: number } = { term: RANGE.Term, hint: RANGE.Hint }

  static async load() {
    const h = new Hints()
    const [terms, rows] = await Promise.all([
      run('MATCH (x:Term) RETURN x.id AS id, x.key AS key'),
      run('MATCH (x:Term)-[:SUGGESTS]->(h:Hint)-[:FOR]->(t:Tool) RETURN x.key AS term, h.id AS id, h.w AS w, t.id AS tool'),
    ])
    for (const r of terms as { id: number; key: string }[]) {
      h.terms.set(r.key, r.id)
      h.next.term = Math.max(h.next.term, r.id + 1)
    }
    for (const r of rows as { term: string; id: number; w: number; tool: number }[]) {
      h.set(r.term, r.tool, r.id, r.w)
      h.next.hint = Math.max(h.next.hint, r.id + 1)
    }
    return h
  }

  get size() {
    return this.hints.size
  }

  w(term: string, tool: number) {
    return this.byTerm.get(term)?.get(tool) ?? 1
  }

  // sum of ln(w) over the terms, i.e. how much past outcomes favour this tool here
  bonus(terms: string[], tool: number) {
    let s = 0
    for (const t of terms) s += Math.log(this.w(t, tool))
    return s
  }

  // tools that have been reinforced for any of these terms
  suggested(terms: string[]): Set<number> {
    const out = new Set<number>()
    for (const t of terms) for (const [tool, w] of this.byTerm.get(t) ?? []) if (w > 1) out.add(tool)
    return out
  }

  // multiply hint weights; creates terms, hints and edges in hydradb as needed
  async update(changes: { term: string; tool: number; factor: number }[]) {
    const merged = new Map<string, { term: string; tool: number; factor: number }>()
    for (const c of changes) {
      const k = `${c.term}|${c.tool}`
      const prev = merged.get(k)
      merged.set(k, prev ? { ...c, factor: prev.factor * c.factor } : c)
    }
    const newTerms: { id: number; key: string }[] = []
    const newHints: { term: number; hint: number; tool: number }[] = []
    const rows: { id: number; key: string; w: ReturnType<typeof float> }[] = []
    for (const [key, c] of merged) {
      let termId = this.terms.get(c.term)
      if (termId === undefined) {
        termId = this.next.term++
        this.terms.set(c.term, termId)
        newTerms.push({ id: termId, key: c.term })
      }
      let hint = this.hints.get(key)
      if (!hint) {
        hint = { id: this.next.hint++, w: 1 }
        newHints.push({ term: termId, hint: hint.id, tool: c.tool })
      }
      const w = Math.min(MAX_W, Math.max(MIN_W, hint.w * c.factor))
      this.set(c.term, c.tool, hint.id, w)
      rows.push({ id: hint.id, key, w: float(w) })
    }
    if (newTerms.length) await batch('UNWIND $rows AS row MERGE (n {id: row.id}) SET n:Term, n.key = row.key', newTerms)
    await batch('UNWIND $rows AS row MERGE (n {id: row.id}) SET n:Hint, n.key = row.key, n.w = row.w', rows)
    if (newHints.length) {
      await Promise.all([
        batch(`UNWIND $rows AS row CREATE (a {id: row.src})-[:${REL.SUGGESTS}]->(b {id: row.dst})`, newHints.map((n) => ({ src: n.term, dst: n.hint }))),
        batch(`UNWIND $rows AS row CREATE (a {id: row.src})-[:${REL.FOR}]->(b {id: row.dst})`, newHints.map((n) => ({ src: n.hint, dst: n.tool }))),
      ])
    }
    return rows.length
  }

  async reset() {
    for (const label of ['Hint', 'Term']) {
      const ids = await run(`MATCH (n:${label}) RETURN n.id AS id`)
      await batch('UNWIND $rows AS row MATCH (n {id: row.id}) DETACH DELETE n', ids)
    }
    this.terms.clear()
    this.hints.clear()
    this.byTerm.clear()
    this.next = { term: RANGE.Term, hint: RANGE.Hint }
  }

  private set(term: string, tool: number, id: number, w: number) {
    this.hints.set(`${term}|${tool}`, { id, w })
    if (!this.byTerm.has(term)) this.byTerm.set(term, new Map())
    this.byTerm.get(term)!.set(tool, w)
  }
}
