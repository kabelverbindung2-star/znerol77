import { useEffect, useState } from 'react'

/** Numbered dots where the autoclicker clicks (shown in a click-through window over the screens). */
export default function Markers(): JSX.Element {
  const [dots, setDots] = useState<{ x: number; y: number; n: number }[]>([])
  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'
    return window.znerol.autoclicker.onMarkers(setDots)
  }, [])
  return (
    <div className="markers">
      {dots.map((d) => (
        <div key={d.n} className="marker" style={{ left: d.x, top: d.y }}>
          <span>{d.n}</span>
        </div>
      ))}
    </div>
  )
}
