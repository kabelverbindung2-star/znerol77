import { useMemo } from 'react'

interface Props {
  data: number[]
  color: string
  height?: number
  max?: number
  fill?: boolean
}

export default function Sparkline({ data, color, height = 56, max = 100, fill = true }: Props): JSX.Element {
  const width = 100
  const path = useMemo(() => {
    if (data.length === 0) return { line: '', area: '' }
    const step = width / Math.max(data.length - 1, 1)
    const points = data.map((v, i) => {
      const x = i * step
      const y = height - (Math.min(v, max) / max) * height
      return [x, y]
    })
    const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
    const area = `${line} L${points[points.length - 1][0].toFixed(2)},${height} L0,${height} Z`
    return { line, area }
  }, [data, height, max])

  const gradientId = useMemo(() => `grad-${color.replace('#', '')}-${Math.random().toString(36).slice(2, 7)}`, [color])

  return (
    <div className="sparkline-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        style={{ display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {fill && data.length > 1 && <path d={path.area} fill={`url(#${gradientId})`} stroke="none" />}
        {data.length > 1 && (
          <path d={path.line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        )}
      </svg>
    </div>
  )
}
