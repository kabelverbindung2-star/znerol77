import { useEffect, useState } from 'react'

/**
 * A YouTube video filling the whole area like a wallpaper (cropped to cover, no controls,
 * looping). Clicks go through to the app. `muted` = no sound; it also pauses while the
 * window is minimised or covered.
 */
export default function YouTubeBackground({ id, muted, dim = 0 }: { id: string; muted: boolean; dim?: number }): JSX.Element {
  const [hidden, setHidden] = useState(document.hidden)
  useEffect(() => {
    const on = (): void => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    loop: '1',
    playlist: id,
    controls: '0',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    disablekb: '1',
    modestbranding: '1'
  })
  return (
    <div className="bg yt-bg" aria-hidden="true">
      {!hidden && (
        <iframe
          key={`${id}-${muted}`}
          className="yt-frame"
          src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
          title="YouTube"
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
      <div className="bg-dim" style={{ opacity: dim / 100 }} />
    </div>
  )
}
