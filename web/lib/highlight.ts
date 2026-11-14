// a small highlighter for the snippets on this site: json, shell, ts, python, toml.
// returns html with spans; input is escaped first.

export type Lang = 'json' | 'shell' | 'ts' | 'python' | 'toml' | 'text'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const span = (cls: string, s: string) => `<span class="t-${cls}">${esc(s)}</span>`

const KEYWORDS: Record<string, string[]> = {
  ts: ['import', 'from', 'const', 'let', 'await', 'async', 'new', 'return', 'export', 'function', 'type', 'as', 'if', 'else', 'for', 'of', 'true', 'false', 'null'],
  python: ['import', 'from', 'def', 'return', 'for', 'in', 'if', 'else', 'True', 'False', 'None', 'with', 'as'],
}

// one regex per language: alternatives in priority order, each a named group
const RULES: Record<Exclude<Lang, 'text'>, [string, RegExp][]> = {
  json: [
    ['key', /"(?:[^"\\]|\\.)*"(?=\s*:)/y],
    ['str', /"(?:[^"\\]|\\.)*"/y],
    ['num', /-?\b\d+(?:\.\d+)?\b/y],
    ['kw', /\b(?:true|false|null)\b/y],
  ],
  shell: [
    ['com', /#[^\n]*/y],
    ['str', /'[^'\n]*'|"(?:[^"\\\n]|\\.)*"/y],
    ['flag', /(?<=\s)--?[a-zA-Z][\w-]*/y],
    ['cmd', /(?<=^|\n|&&\s|\|\s)\s*[a-z][\w.-]*/y],
  ],
  ts: [
    ['com', /\/\/[^\n]*/y],
    ['str', /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/y],
    ['num', /\b\d+(?:\.\d+)?\b/y],
    ['word', /\b[A-Za-z_]\w*\b/y],
  ],
  python: [
    ['com', /#[^\n]*/y],
    ['str', /f?"(?:[^"\\\n]|\\.)*"|f?'(?:[^'\\\n]|\\.)*'/y],
    ['num', /\b\d+(?:\.\d+)?\b/y],
    ['word', /\b[A-Za-z_]\w*\b/y],
  ],
  toml: [
    ['com', /#[^\n]*/y],
    ['sect', /\[[^\]\n]+\]/y],
    ['key', /\b[\w.-]+(?=\s*=)/y],
    ['str', /"(?:[^"\\\n]|\\.)*"/y],
  ],
}

export function highlight(code: string, lang: Lang): string {
  if (lang === 'text') return esc(code)
  const rules = RULES[lang]
  let out = ''
  let plain = ''
  let i = 0
  const flush = () => {
    out += esc(plain)
    plain = ''
  }
  outer: while (i < code.length) {
    for (const [kind, re] of rules) {
      re.lastIndex = i
      const m = re.exec(code)
      if (m && m[0].length) {
        flush()
        let cls = kind
        if (kind === 'word') cls = KEYWORDS[lang]?.includes(m[0]) ? 'kw' : /^[A-Z]/.test(m[0]) ? 'type' : code[i + m[0].length] === '(' ? 'fn' : ''
        out += cls ? span(cls, m[0]) : esc(m[0])
        i += m[0].length
        continue outer
      }
    }
    plain += code[i]
    i++
  }
  flush()
  return out
}

export function guessLang(label: string | undefined, code: string): Lang {
  const l = (label ?? '').toLowerCase()
  if (l.endsWith('.ts') || l === 'ts' || l === 'typescript') return 'ts'
  if (l.includes('python') || l.endsWith('.py')) return 'python'
  if (l.includes('toml')) return 'toml'
  if (l.endsWith('.json') || l === 'json' || l === 'response' || /^\s*[[{]/.test(code)) return 'json'
  if (l === 'shell' || l === 'try' || l.includes('run in')) return 'shell'
  if (l === 'instructions' || l === 'schema') return 'text'
  return 'shell'
}
