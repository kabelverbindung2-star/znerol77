import { useId, useMemo } from 'react'

interface Props {
  data: number[]
  color: string
  height?: number
  /** Fixed top of the scale; omit to scale to the data. */
  max?: number
  fill?: boolean
  strokeWidth?: number
}

export default function Sparkline({
  data,
  color,
  height = 40,
  max,
  fill = true,
  strokeWidth = 1.8
}: Props): JSX.Element {
  const width = 100
  const gradientId = `spark-${useId().replace(/[^a-zA-Z0-9]/g, '')}`

  const path = useMemo(() => {
    if (data.length < 2) return null
    const top = max ?? Math.max(...data, 1) * 1.15
    const step = width / (data.length - 1)
    const pts = data.map((v, i) => [i * step, height - 2 - (Math.min(v, top) / top) * (height - 4)])
    const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    return { line, area: `${line} L${width},${height} L0,${height} Z` }
  }, [data, height, max])

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {path && fill && <path d={path.area} fill={`url(#${gradientId})`} />}
      {path && (
        <path
          d={path.line}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
