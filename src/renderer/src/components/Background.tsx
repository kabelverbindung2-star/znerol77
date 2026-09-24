import { useEffect, useState } from 'react'
import Scene from './ui/Scene'
import { paletteFor } from '../lib/palettes'
import type { Wallpaper } from '../lib/types'

function Layer({ wp }: { wp: Wallpaper }): JSX.Element {
  if (wp.source === 'builtin') return <Scene p={paletteFor(wp.id)} idSuffix={wp.id.replace(/[^a-zA-Z]/g, '')} />
  return <img src={wp.url} alt="" draggable={false} />
}

/** Full-window wallpaper that cross-fades when the current image changes. */
export default function Background({ wallpaper, dim }: { wallpaper: Wallpaper; dim: number }): JSX.Element {
  const [layers, setLayers] = useState<Wallpaper[]>([wallpaper])

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1]?.id === wallpaper.id ? prev : [...prev.slice(-1), wallpaper]))
    const t = setTimeout(() => setLayers([wallpaper]), 1400)
    return () => clearTimeout(t)
  }, [wallpaper])

  return (
    <div className="bg" aria-hidden="true">
      {layers.map((wp, i) => (
        <div key={wp.id} className={`bg-layer ${i > 0 ? 'bg-fade-in' : ''}`}>
          <Layer wp={wp} />
        </div>
      ))}
      <div className="bg-dim" style={{ opacity: dim / 100 }} />
    </div>
  )
}
