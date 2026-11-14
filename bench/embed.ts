// dense retrieval baseline: all-MiniLM-L6-v2 on cpu, tool vectors cached on disk
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

const MODEL = 'Xenova/all-MiniLM-L6-v2'
const CACHE = 'bench/.cache'

let extractor: Promise<FeatureExtractionPipeline> | undefined
// pipeline()'s overloads are too wide for tsc, so call it through a narrow type
const load = pipeline as unknown as (task: 'feature-extraction', model: string, opts: { dtype: 'q8' }) => Promise<FeatureExtractionPipeline>
const model = () => (extractor ??= load('feature-extraction', MODEL, { dtype: 'q8' }))

export async function embed(texts: string[]): Promise<Float32Array[]> {
  const ex = await model()
  const out: Float32Array[] = []
  for (let i = 0; i < texts.length; i += 32) {
    const t = await ex(texts.slice(i, i + 32), { pooling: 'mean', normalize: true })
    const [n, d] = t.dims as [number, number]
    const data = t.data as Float32Array
    for (let j = 0; j < n; j++) out.push(data.slice(j * d, (j + 1) * d))
  }
  return out
}

// vectors for a corpus, keyed by a hash of its texts so edits invalidate the cache
export async function corpus(texts: string[]): Promise<Float32Array[]> {
  const key = createHash('sha1').update(MODEL).update(texts.join('\n')).digest('hex').slice(0, 12)
  const file = `${CACHE}/tools-${key}.json`
  if (existsSync(file)) return (JSON.parse(readFileSync(file, 'utf8')) as number[][]).map((v) => Float32Array.from(v))
  const vecs = await embed(texts)
  mkdirSync(CACHE, { recursive: true })
  writeFileSync(file, JSON.stringify(vecs.map((v) => Array.from(v))))
  return vecs
}

export const cosine = (a: Float32Array, b: Float32Array) => {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!
  return s
}
