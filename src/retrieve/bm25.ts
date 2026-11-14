const STOP = new Set('a an the and or of to for in on at by with from into is are be it its this that these those my our your their me us i we you he she they them as do does did can could should would will please then also any all some via using use get'.split(' '))

export function stem(w: string) {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3)
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

export function tokenize(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map(stem)
}

// query-side synonyms for how people phrase agent tasks
const SYN: Record<string, string[]> = {
  open: ['create'], file: ['create'], make: ['create'], add: ['create'], start: ['create'], new: ['create'],
  tell: ['send', 'message', 'notify'], ping: ['send', 'message'], dm: ['direct', 'message'], text: ['sms'],
  notify: ['send', 'message'], alert: ['send', 'message', 'notify'], post: ['send', 'message'],
  move: ['update', 'reschedule'], change: ['update'], set: ['update'], edit: ['update'], fix: ['edit'],
  find: ['search'], look: ['search', 'get'], show: ['get', 'read'], check: ['get', 'status'], which: ['search'],
  cancel: ['delete'], remove: ['delete'], email: ['mail'], meeting: ['event'], invite: ['event', 'attendee'],
  save: ['create', 'write'], write: ['create'], summary: ['write'], crash: ['error'], bug: ['issue', 'error'], typo: ['edit', 'file'],
  link: ['url'], logs: ['log'], db: ['database'], slot: ['free', 'time'],
}

export function expand(query: string): string[] {
  const out: string[] = []
  for (const w of tokenize(query)) {
    out.push(w)
    for (const s of SYN[w] ?? []) out.push(stem(s))
  }
  return out
}

// okapi bm25 over a small in-memory corpus
export class BM25 {
  private docs: Map<string, number>[] = []
  private lens: number[] = []
  private df = new Map<string, number>()
  private avg = 0

  constructor(texts: string[], private k1 = 1.2, private b = 0.75) {
    for (const text of texts) {
      const tf = new Map<string, number>()
      const toks = tokenize(text)
      for (const w of toks) tf.set(w, (tf.get(w) ?? 0) + 1)
      for (const w of tf.keys()) this.df.set(w, (this.df.get(w) ?? 0) + 1)
      this.docs.push(tf)
      this.lens.push(toks.length)
    }
    this.avg = this.lens.reduce((a, b) => a + b, 0) / Math.max(1, this.lens.length)
  }

  scores(query: string): Float64Array {
    const out = new Float64Array(this.docs.length)
    const q = [...new Set(expand(query))]
    const n = this.docs.length
    for (const w of q) {
      const df = this.df.get(w)
      if (!df) continue
      const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5))
      for (let i = 0; i < n; i++) {
        const f = this.docs[i]!.get(w)
        if (!f) continue
        out[i]! += (idf * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * this.lens[i]!) / this.avg))
      }
    }
    return out
  }
}
