interface Props {
  percent: number
  color: string
  size?: number
  stroke?: number
  label?: string
}

export default function RingGauge({ percent, color, size = 64, stroke = 7, label }: Props): JSX.Element {
  const clamped = Math.max(0, Math.min(100, percent))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className="ring-gauge">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.4s ease' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.24}
          fontWeight={800}
          fill="var(--text)"
        >
          {Math.round(clamped)}%
        </text>
      </svg>
      {label && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{label}</div>}
    </div>
  )
}
