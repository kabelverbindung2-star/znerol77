import { memo, useEffect, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Scene from './ui/Scene'
import { paletteFor } from '../lib/palettes'
import type { Wallpaper } from '../lib/types'

// A drawn scene is hundreds of SVG shapes; as live DOM it is re-rasterised whenever something
// above it repaints. Turned into one image once, it costs the same as a photo.
const sceneCache = new Map<string, string>()

export function sceneImage(id: string): string {
  let url = sceneCache.get(id)
  if (!url) {
    const svg = renderToStaticMarkup(<Scene p={paletteFor(id)} idSuffix={id.replace(/[^a-zA-Z]/g, '')} />)
    const withNs = svg.includes('xmlns=') ? svg : svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(withNs)
    sceneCache.set(id, url)
  }
  return url
}

function Layer({ wp }: { wp: Wallpaper }): JSX.Element {
  return <img src={wp.source === 'builtin' ? sceneImage(wp.id) : wp.url} alt="" draggable={false} decoding="async" />
}

/** Full-window wallpaper that cross-fades when the current image changes. */
function Background({ wallpaper, dim }: { wallpaper: Wallpaper; dim: number }): JSX.Element {
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

// re-rendering the full-screen picture on every perf tick is wasted work
export default memo(Background)
