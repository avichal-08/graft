// painted backdrop for the hero and the closing banner: cobalt sky with brush
// streaks and grain, halftone cumulus sitting on the horizon, a calm sea and
// pastel dunes. a faint star graph in the sky is the one nod to what graft does.
// layered so the sky can stretch while the landscape keeps its proportions.

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

type Puff = { x: number; y: number; r: number }

// a cumulus bank: big puffs toward the middle, smaller at the edges, flat base
function cloud(cx: number, base: number, width: number, height: number, seed: number): Puff[] {
  const r = rng(seed)
  const puffs: Puff[] = []
  const n = Math.max(4, Math.round(width / 30))
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const bell = Math.sin(Math.PI * t)
    const rad = (0.3 + 0.7 * bell) * height * (0.32 + r() * 0.16)
    puffs.push({ x: cx - width / 2 + t * width + (r() - 0.5) * 14, y: base - rad * 0.7, r: rad })
  }
  for (let i = 0; i < n; i++) {
    const t = 0.2 + r() * 0.6
    const bell = Math.sin(Math.PI * t)
    const rad = height * (0.16 + r() * 0.2) * (0.5 + bell * 0.7)
    puffs.push({ x: cx - width / 2 + t * width + (r() - 0.5) * 30, y: base - height * (0.35 + r() * 0.55) * bell, r: rad })
  }
  return puffs
}

// land viewBox is 1440 x 520 with the horizon at y 300; clouds may rise above it
const banks = [
  { id: 'l', puffs: cloud(70, 312, 380, 300, 11) },
  { id: 'r', puffs: cloud(1390, 312, 520, 520, 23) },
  { id: 'm', puffs: cloud(860, 306, 300, 90, 37) },
  { id: 'h', puffs: cloud(1170, -240, 220, 70, 53) },
]

const stars: [number, number][] = [[40, 60], [120, 26], [190, 80], [270, 44], [160, 150], [310, 130], [-35, 115]]
const links: [number, number][] = [[0, 1], [1, 2], [2, 3], [1, 4], [2, 4], [3, 5], [0, 6], [4, 5]]

export function Scene({ id = 'hero', land = true }: { id?: string; land?: boolean }) {
  const u = (x: string) => `${id}-${x}`
  return (
    <div className="scene" aria-hidden="true">
      <svg className="sky" viewBox="0 0 1440 900" preserveAspectRatio="none">
        <defs>
          <linearGradient id={u('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1435ae" />
            <stop offset="0.5" stopColor="#2352d4" />
            <stop offset="0.85" stopColor="#4f84e8" />
            <stop offset="1" stopColor="#86adef" />
          </linearGradient>
          <filter id={u('streaks')}>
            <feTurbulence type="fractalNoise" baseFrequency="0.0025 0.045" numOctaves="3" seed="8" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 -0.2" />
          </filter>
        </defs>
        <rect width="1440" height="900" fill={`url(#${u('sky')})`} />
        <rect width="1440" height="900" filter={`url(#${u('streaks')})`} opacity="0.45" />
      </svg>

      {id === 'hero' && (
        <svg className="stars" viewBox="-60 0 400 180">
          <g opacity="0.6">
            {links.map(([a, b], i) => (
              <line key={i} x1={stars[a]![0]} y1={stars[a]![1]} x2={stars[b]![0]} y2={stars[b]![1]} stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.2" strokeDasharray="2 5" />
            ))}
            {stars.map(([x, y], i) => (
              <path key={i} d={`M${x},${y - 6} Q${x},${y} ${x + 6},${y} Q${x},${y} ${x},${y + 6} Q${x},${y} ${x - 6},${y} Q${x},${y} ${x},${y - 6} Z`} fill="#fff6dc" />
            ))}
          </g>
        </svg>
      )}

      {land && (
        <svg className="land" viewBox="0 0 1440 520">
          <defs>
            <linearGradient id={u('cloud')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset="0.55" stopColor="#f5ebd8" />
              <stop offset="1" stopColor="#cfc8e0" />
            </linearGradient>
            <linearGradient id={u('shade')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <mask id={u('shademask')} maskContentUnits="objectBoundingBox">
              <rect width="1" height="1" fill={`url(#${u('shade')})`} />
            </mask>
            <pattern id={u('dots')} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
              <circle cx="3" cy="3" r="1.2" fill="#4d67bd" />
            </pattern>
            <linearGradient id={u('sea')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1c44b6" />
              <stop offset="1" stopColor="#3166d6" />
            </linearGradient>
            <linearGradient id={u('dune1')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f3e1a9" />
              <stop offset="1" stopColor="#e5c886" />
            </linearGradient>
            <linearGradient id={u('dune2')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f5d0b3" />
              <stop offset="1" stopColor="#e8b192" />
            </linearGradient>
            <filter id={u('paint')} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="4" />
              <feDisplacementMap in="SourceGraphic" scale="14" />
            </filter>
          </defs>

          <rect y="300" width="1440" height="230" fill={`url(#${u('sea')})`} />
          <path d="M600,302 C640,288 690,286 740,294 C770,298 790,302 810,302 Z" fill="#3c62bd" opacity="0.85" />
          <g stroke="#ffffff" strokeLinecap="round" opacity="0.38">
            {Array.from({ length: 30 }, (_, i) => {
              const r = rng(100 + i)
              const x = r() * 1440, y = 310 + r() * 90, w = 12 + r() * 50
              return <line key={i} x1={x} x2={x + w} y1={y} y2={y} strokeWidth={1 + r() * 1.3} />
            })}
          </g>

          {banks.map((b) => (
            <g key={b.id} filter={`url(#${u('paint')})`}>
              {b.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={`url(#${u('cloud')})`} />)}
              <g mask={`url(#${u('shademask')})`} opacity="0.32">
                {b.puffs.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill={`url(#${u('dots')})`} />)}
              </g>
            </g>
          ))}

          <g filter={`url(#${u('paint')})`}>
            <path d="M-40,420 C200,380 420,396 640,420 C860,444 1060,384 1480,404 L1480,540 L-40,540 Z" fill={`url(#${u('dune2')})`} />
            <path d="M-40,452 C260,426 520,452 760,466 C1000,480 1220,436 1480,450 L1480,540 L-40,540 Z" fill={`url(#${u('dune1')})`} />
          </g>
        </svg>
      )}

      <svg className="grain" preserveAspectRatio="none" viewBox="0 0 600 600">
        <filter id={u('grain')}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" seed="2" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.35" />
        </filter>
        <rect width="600" height="600" filter={`url(#${u('grain')})`} />
      </svg>
    </div>
  )
}
