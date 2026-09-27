import { useEffect, useState } from 'react'
import type { MediaItem } from './types'

let cache: Promise<{ videos: MediaItem[]; music: MediaItem[] }> | null = null

export function loadMedia(): Promise<{ videos: MediaItem[]; music: MediaItem[] }> {
  if (!cache) {
    cache = window.znerol.media.list().catch(() => {
      cache = null
      return { videos: [], music: [] }
    })
  }
  return cache
}

/** The hand-picked nature videos and calm music (resolved once per app start). */
export function useMedia(): { videos: MediaItem[]; music: MediaItem[]; loaded: boolean } {
  const [state, setState] = useState<{ videos: MediaItem[]; music: MediaItem[]; loaded: boolean }>({ videos: [], music: [], loaded: false })
  useEffect(() => {
    let alive = true
    loadMedia().then((m) => alive && setState({ ...m, loaded: true }))
    return () => {
      alive = false
    }
  }, [])
  return state
}
