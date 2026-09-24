import type { ScenePalette } from '../../lib/palettes'

const TREES: [number, number, number][] = [
  [20, 300, 90], [70, 240, 70], [120, 320, 96], [170, 220, 64], [215, 270, 80], [255, 190, 56],
  [300, 150, 44], [990, 160, 48], [1030, 200, 58], [1075, 260, 76], [1120, 310, 92],
  [1165, 230, 68], [1210, 330, 100], [1255, 250, 74]
]

/** Illustrated landscape, drawn at 1280×800 and cropped to fill its box. */
export default function Scene({ p, idSuffix = 'main' }: { p: ScenePalette; idSuffix?: string }): JSX.Element {
  const gid = `sky-${idSuffix}`
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
      <rect width="1280" height="540" fill={`url(#${gid})`} />
      <circle cx="930" cy="380" r="46" fill={p.sun} />
      <polygon points="0,470 140,360 260,420 400,300 520,400 640,330 780,430 900,310 1040,410 1160,350 1280,420 1280,520 0,520" fill={p.far} />
      <polygon points="400,300 372,330 388,326 400,340 414,326 428,332" fill="#FFFFFF8C" />
      <polygon points="900,310 872,340 888,336 900,350 914,336 930,342" fill="#FFFFFF8C" />
      <polygon points="0,520 120,430 260,480 380,380 520,470 660,400 820,490 980,390 1120,470 1280,430 1280,520" fill={p.mid} />
      <rect y="520" width="1280" height="280" fill={p.lake} />
      <polygon points="0,520 120,610 260,560 380,660 520,570 660,640 820,550 980,650 1120,570 1280,610 1280,520" fill={p.mid} opacity="0.35" />
      <rect x="760" y="560" width="340" height="2" fill={p.sun} opacity="0.5" />
      <rect x="820" y="590" width="220" height="2" fill={p.sun} opacity="0.35" />
      {TREES.map(([x, h, w], i) => (
        <polygon key={i} points={`${x - w / 2},800 ${x},${800 - h} ${x + w / 2},800`} fill={p.trees} />
      ))}
    </svg>
  )
}
