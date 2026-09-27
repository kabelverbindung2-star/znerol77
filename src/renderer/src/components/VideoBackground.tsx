import { useEffect, useState } from 'react'
import NatureVideo from './NatureVideo'
import { useMedia } from '../lib/useMedia'
import { sceneImage } from './Background'

/** Nature videos behind the app; they stop while the window is minimised or covered. */
export default function VideoBackground({ dim }: { dim: number }): JSX.Element {
  const media = useMedia()
  const [hidden, setHidden] = useState(document.hidden)
  useEffect(() => {
    const on = (): void => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return (
    <div className="bg" aria-hidden="true">
      <div className="bg-layer">
        <img src={sceneImage('builtin:Bergsee')} alt="" draggable={false} />
      </div>
      {media.videos.length > 0 && <NatureVideo videos={media.videos} paused={hidden} />}
      <div className="bg-dim" style={{ opacity: dim / 100 }} />
    </div>
  )
}
