import { useEffect, useRef, useState } from 'react'
import type { MediaItem } from '../lib/types'

const MIN_MS = 90_000 // short clips loop until 1.5 minutes have passed
const MAX_MS = 20 * 60_000 // long films play up to 20 minutes before the next one

/**
 * Full-screen nature videos that change now and then with a slow cross-fade.
 * `offset` lets a second monitor start somewhere else in the list.
 */
export default function NatureVideo({
  videos,
  offset = 0,
  paused = false,
  pinnedId = null,
  seeded = false,
  muted = true,
  onCurrent
}: {
  /** play the film's own sound */
  muted?: boolean
  /** start at a film picked from the current hour, so several screens show the same one */
  seeded?: boolean
  videos: MediaItem[]
  offset?: number
  paused?: boolean
  /** one chosen film that stays (loops); null = change now and then */
  pinnedId?: string | null
  onCurrent?: (v: MediaItem | null) => void
}): JSX.Element | null {
  const pinnedIndex = pinnedId ? videos.findIndex((v) => v.id === pinnedId) : -1
  const [index, setIndex] = useState(() => {
    if (!videos.length) return 0
    const start = seeded ? Math.floor(Date.now() / 3_600_000) : Math.floor(Math.random() * videos.length)
    return (offset + start) % videos.length
  })
  // a newly chosen film takes over at once
  useEffect(() => {
    if (pinnedIndex >= 0) setIndex(pinnedIndex)
  }, [pinnedIndex])
  const [shown, setShown] = useState<number | null>(null) // becomes visible once it really plays
  const failures = useRef(0)
  const ref = useRef<HTMLVideoElement>(null)
  const current = videos[index] ?? null

  useEffect(() => {
    onCurrent?.(shown === index ? current : null)
  }, [shown, index, current, onCurrent])

  // next film after a while
  useEffect(() => {
    if (!current || videos.length < 2 || pinnedIndex >= 0) return
    const ms = Math.min(MAX_MS, Math.max(MIN_MS, current.duration * 1000))
    const t = setTimeout(() => setIndex((i) => (i + 1) % videos.length), ms)
    return () => clearTimeout(t)
  }, [current, videos.length, pinnedIndex])

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (paused) v.pause()
    else v.play().catch(() => undefined)
  }, [paused, index])

  // hand the decoder and its buffers back right away when a film ends or the screen closes
  // (otherwise Chromium keeps them until the next garbage collection)
  useEffect(() => {
    const v = ref.current
    return () => {
      if (!v) return
      v.pause()
      v.removeAttribute('src')
      v.load()
    }
  }, [current?.id])

  if (!current) return null
  return (
    <video
      ref={ref}
      key={current.id}
      className={`nature-video ${shown === index ? 'visible' : ''}`}
      src={current.url}
      muted={muted}
      loop
      autoPlay={!paused}
      playsInline
      preload="auto"
      disablePictureInPicture
      onPlaying={() => {
        failures.current = 0
        setShown(index)
      }}
      onError={() => {
        // skip films that do not load; give up after a full round (offline)
        failures.current += 1
        if (failures.current < videos.length) setIndex((i) => (i + 1) % videos.length)
      }}
    />
  )
}
