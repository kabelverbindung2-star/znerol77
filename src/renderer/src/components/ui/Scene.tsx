import { memo, useMemo, type ReactNode } from 'react'
import type { ScenePalette } from '../../lib/palettes'

/** Deterministic pseudo-random numbers so every scene looks the same each time. */
function rng(seed: number): () => number {
  let x = seed >>> 0
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0
    return x / 4294967296
  }
}

function seedOf(name: string): number {
  let h = 2166136261
  for (const ch of name) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

function Stars({ seed, count = 140, maxY = 460 }: { seed: number; count?: number; maxY?: number }): JSX.Element {
  const stars = useMemo(() => {
    const r = rng(seed)
    return Array.from({ length: count }, () => ({ x: r() * 1280, y: r() * maxY, s: r() * 1.4 + 0.4, o: r() * 0.6 + 0.3 }))
  }, [seed, count, maxY])
  return (
    <g>
      {stars.map((st, i) => (
        <circle key={i} cx={st.x} cy={st.y} r={st.s} fill="#FFFFFF" opacity={st.o} />
      ))}
    </g>
  )
}

function Clouds({ color, y = 150 }: { color: string; y?: number }): JSX.Element {
  return (
    <g fill={color} opacity="0.55">
      <ellipse cx="220" cy={y} rx="120" ry="26" />
      <ellipse cx="290" cy={y - 16} rx="80" ry="30" />
      <ellipse cx="720" cy={y + 50} rx="150" ry="22" />
      <ellipse cx="800" cy={y + 36} rx="90" ry="26" />
      <ellipse cx="1110" cy={y - 30} rx="110" ry="20" />
    </g>
  )
}

function Lake({ p }: { p: ScenePalette }): JSX.Element {
  const trees: [number, number, number][] = [
    [20, 300, 90], [70, 240, 70], [120, 320, 96], [170, 220, 64], [215, 270, 80], [255, 190, 56],
    [300, 150, 44], [990, 160, 48], [1030, 200, 58], [1075, 260, 76], [1120, 310, 92],
    [1165, 230, 68], [1210, 330, 100], [1255, 250, 74]
  ]
  return (
    <>
      <circle cx="930" cy="380" r="46" fill={p.sun} />
      <polygon points="0,470 140,360 260,420 400,300 520,400 640,330 780,430 900,310 1040,410 1160,350 1280,420 1280,520 0,520" fill={p.far} />
      <polygon points="400,300 372,330 388,326 400,340 414,326 428,332" fill="#FFFFFF8C" />
      <polygon points="900,310 872,340 888,336 900,350 914,336 930,342" fill="#FFFFFF8C" />
      <polygon points="0,520 120,430 260,480 380,380 520,470 660,400 820,490 980,390 1120,470 1280,430 1280,520" fill={p.mid} />
      <rect y="520" width="1280" height="280" fill={p.lake} />
      <polygon points="0,520 120,610 260,560 380,660 520,570 660,640 820,550 980,650 1120,570 1280,610 1280,520" fill={p.mid} opacity="0.35" />
      <rect x="760" y="560" width="340" height="2" fill={p.light} opacity="0.5" />
      <rect x="820" y="590" width="220" height="2" fill={p.light} opacity="0.35" />
      {trees.map(([x, h, w], i) => (
        <polygon key={i} points={`${x - w / 2},800 ${x},${800 - h} ${x + w / 2},800`} fill={p.trees} />
      ))}
    </>
  )
}

function Palm({ x, scale, flip, color }: { x: number; scale: number; flip?: boolean; color: string }): JSX.Element {
  const leaves = [
    'M0 0 C 50 -40, 120 -30, 160 10 C 110 -10, 60 -10, 0 0 Z',
    'M0 0 C 40 -70, 110 -90, 150 -70 C 100 -60, 50 -40, 0 0 Z',
    'M0 0 C -10 -70, 20 -120, 60 -130 C 30 -100, 15 -60, 0 0 Z',
    'M0 0 C -50 -50, -120 -50, -160 -10 C -110 -30, -60 -25, 0 0 Z',
    'M0 0 C -40 -20, -100 10, -130 60 C -90 20, -50 5, 0 0 Z',
    'M0 0 C 30 -10, 90 20, 120 70 C 80 30, 40 15, 0 0 Z'
  ]
  return (
    <g transform={`translate(${x} 800) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M0 0 C 10 -110, 30 -230, 70 -340" stroke={color} strokeWidth="20" fill="none" strokeLinecap="round" />
      <g transform="translate(70 -340)" fill={color}>
        {leaves.map((d, i) => (
          <path key={i} d={d} />
        ))}
        <circle cx="4" cy="6" r="10" />
      </g>
    </g>
  )
}

function Beach({ p, id }: { p: ScenePalette; id: string }): JSX.Element {
  const sunX = p.night ? 1000 : 900
  const sunY = p.night ? 150 : 400
  return (
    <>
      <defs>
        <linearGradient id={`sea-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.lake} />
          <stop offset="1" stopColor={p.near} />
        </linearGradient>
      </defs>
      <circle cx={sunX} cy={sunY} r={p.night ? 34 : 62} fill={p.sun} />
      <polygon points="760,470 840,440 910,452 990,432 1090,470" fill={p.far} />
      <rect y="470" width="1280" height="330" fill={`url(#sea-${id})`} />
      <g fill={p.light} opacity={p.night ? 0.5 : 0.6}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={sunX - 70 + ((i * 37) % 90)} y={482 + i * 14} width={140 - i * 12} height="3" rx="1.5" />
        ))}
      </g>
      <g stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="2" fill="none">
        <path d="M0 540 Q 160 530 320 540 T 640 540 T 960 540 T 1280 540" />
        <path d="M0 585 Q 160 572 320 585 T 640 585 T 960 585 T 1280 585" />
        <path d="M0 628 Q 160 614 320 628 T 640 628 T 960 628 T 1280 628" />
      </g>
      <polygon points="515,458 530,420 530,458" fill={p.trees} opacity="0.8" />
      <rect x="505" y="458" width="34" height="5" rx="2" fill={p.trees} opacity="0.8" />
      <path d="M0 660 C 300 620, 620 700, 1280 640 L1280 800 L0 800 Z" fill={p.ground} />
      <path d="M0 660 C 300 620, 620 700, 1280 640" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="4" fill="none" />
      <Palm x={140} scale={1} color={p.trees} />
      <Palm x={250} scale={0.7} color={p.trees} />
      <Palm x={1160} scale={0.9} flip color={p.trees} />
    </>
  )
}

function Mountains({ p, id, seed }: { p: ScenePalette; id: string; seed: number }): JSX.Element {
  const pines = useMemo(() => {
    const r = rng(seed + 7)
    return Array.from({ length: 70 }, (_, i) => {
      const x = i * 19 + r() * 12
      const h = 60 + r() * 90
      const base = 800 - r() * 30
      return `${x - h * 0.22},${base} ${x},${base - h} ${x + h * 0.22},${base}`
    })
  }, [seed])
  const sun = p.night ? { x: 1010, y: 140, r: 32 } : p.skyBot.startsWith('#F') ? { x: 640, y: 420, r: 80 } : { x: 300, y: 190, r: 46 }
  return (
    <>
      <defs>
        <linearGradient id={`mist-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={p.night ? 0.06 : 0.28} />
        </linearGradient>
      </defs>
      <circle cx={sun.x} cy={sun.y} r={sun.r} fill={p.sun} />
      <polygon
        points="0,520 90,380 170,430 300,230 390,330 470,270 560,360 700,180 820,330 910,260 1010,360 1120,220 1220,330 1280,300 1280,560 0,560"
        fill={p.far}
      />
      <g fill="#FFFFFF" opacity={p.night ? 0.55 : 0.9}>
        <polygon points="300,230 270,275 288,270 300,286 314,268 332,276" />
        <polygon points="700,180 664,236 684,228 700,246 718,226 740,238" />
        <polygon points="1120,220 1090,266 1108,260 1120,276 1134,258 1150,268" />
      </g>
      <rect y="420" width="1280" height="160" fill={`url(#mist-${id})`} />
      <polygon points="0,600 140,470 260,540 400,420 540,520 660,450 800,540 950,430 1100,520 1280,460 1280,640 0,640" fill={p.mid} />
      <polygon points="0,680 180,580 330,640 520,560 700,650 880,590 1060,660 1280,590 1280,720 0,720" fill={p.near} />
      <rect y="700" width="1280" height="100" fill={p.ground} />
      {pines.map((pts, i) => (
        <polygon key={i} points={pts} fill={p.trees} />
      ))}
    </>
  )
}

function City({ p, seed }: { p: ScenePalette; seed: number }): JSX.Element {
  const { far, mid, near, windows, reflections } = useMemo(() => {
    const r = rng(seed)
    const row = (base: number, minH: number, maxH: number, minW: number, maxW: number) => {
      const out: { x: number; w: number; h: number; base: number; antenna: boolean }[] = []
      let x = -20
      while (x < 1300) {
        const w = minW + r() * (maxW - minW)
        out.push({ x, w, h: minH + r() * (maxH - minH), base, antenna: r() > 0.8 })
        x += w + r() * 6
      }
      return out
    }
    const far = row(600, 90, 220, 40, 80)
    const mid = row(620, 140, 360, 50, 110)
    const near = row(640, 60, 170, 70, 140)
    const litChance = p.night ? 0.5 : p.skyBot.startsWith('#F') ? 0.32 : 0.12
    const windows: { x: number; y: number }[] = []
    for (const b of mid) {
      for (let wy = b.base - b.h + 14; wy < b.base - 16; wy += 18) {
        for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 14) {
          if (r() < litChance) windows.push({ x: wx, y: wy })
        }
      }
    }
    const reflections = windows
      .filter(() => r() > 0.7)
      .map((w) => ({ x: w.x, y: 650 + r() * 40, h: 4 + r() * 10 }))
    return { far, mid, near, windows, reflections }
  }, [seed, p.night, p.skyBot])
  const sun = p.night ? { x: 1030, y: 130, r: 30 } : p.skyBot.startsWith('#F') ? { x: 420, y: 440, r: 70 } : { x: 980, y: 170, r: 44 }
  return (
    <>
      <circle cx={sun.x} cy={sun.y} r={sun.r} fill={p.sun} />
      {far.map((b, i) => (
        <rect key={`f${i}`} x={b.x} y={b.base - b.h} width={b.w} height={b.h} fill={p.far} />
      ))}
      {mid.map((b, i) => (
        <g key={`m${i}`}>
          <rect x={b.x} y={b.base - b.h} width={b.w} height={b.h} fill={p.mid} />
          {b.antenna && <rect x={b.x + b.w / 2 - 1.5} y={b.base - b.h - 34} width="3" height="34" fill={p.mid} />}
        </g>
      ))}
      <g fill={p.light} opacity={p.night ? 0.95 : 0.75}>
        {windows.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width="6" height="8" rx="1" />
        ))}
      </g>
      {near.map((b, i) => (
        <rect key={`n${i}`} x={b.x} y={b.base - b.h} width={b.w} height={b.h} fill={p.near} />
      ))}
      <rect y="640" width="1280" height="70" fill={p.lake} />
      <g fill={p.light} opacity="0.35">
        {reflections.map((w, i) => (
          <rect key={i} x={w.x} y={w.y} width="6" height={w.h} />
        ))}
      </g>
      <rect y="706" width="1280" height="94" fill={p.ground} />
      <g fill={p.light} opacity={p.night ? 0.9 : 0.35}>
        {Array.from({ length: 16 }, (_, i) => (
          <circle key={i} cx={40 + i * 80} cy="712" r="3.5" />
        ))}
      </g>
    </>
  )
}

/** Illustrated landscape, drawn at 1280×800 and cropped to fill its box. */
function Scene({ p, idSuffix = 'main' }: { p: ScenePalette; idSuffix?: string }): JSX.Element {
  const safeId = idSuffix.replace(/[^a-zA-Z0-9_-]/g, '')
  const gid = `sky-${safeId}`
  const seed = seedOf(p.name)
  let body: ReactNode
  if (p.kind === 'beach') body = <Beach p={p} id={safeId} />
  else if (p.kind === 'mountains') body = <Mountains p={p} id={safeId} seed={seed} />
  else if (p.kind === 'city') body = <City p={p} seed={seed} />
  else body = <Lake p={p} />
  return (
    <svg
      viewBox="0 0 1280 800"
      preserveAspectRatio="xMidYMid slice"
      width="100%"
      height="100%"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.skyTop} />
          <stop offset="1" stopColor={p.skyBot} />
        </linearGradient>
      </defs>
      <rect width="1280" height="800" fill={`url(#${gid})`} />
      {p.night && <Stars seed={seed} />}
      {!p.night && p.kind !== 'lake' && <Clouds color="#FFFFFF" y={p.kind === 'city' ? 120 : 150} />}
      {body}
    </svg>
  )
}

export default memo(Scene)
