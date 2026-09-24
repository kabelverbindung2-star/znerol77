import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Settings, Wallpaper } from './types'

const FALLBACK: Wallpaper = { id: 'builtin:Bergsee', source: 'builtin', name: 'Bergsee', url: '' }

export function useWallpapers(
  settings: Settings,
  update: (patch: { wallpaper: Partial<Settings['wallpaper']> }) => Promise<void>,
  rotate = true
): {
  all: Wallpaper[]
  current: Wallpaper
  nextAt: number | null
  select: (id: string) => void
  next: () => void
} {
  const [all, setAll] = useState<Wallpaper[]>([])
  const [switchedAt, setSwitchedAt] = useState(Date.now())
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  useEffect(() => {
    const load = (): void => {
      window.znerol.wallpapers.list().then((list: Wallpaper[]) => setAll(list)).catch(() => undefined)
    }
    load()
    return window.znerol.wallpapers.onChanged(load)
  }, [])

  const current = useMemo(() => {
    const byId = all.find((w) => w.id === settings.wallpaper.currentId)
    return byId ?? all.find((w) => w.source !== 'builtin') ?? all[0] ?? FALLBACK
  }, [all, settings.wallpaper.currentId])

  const select = useCallback(
    (id: string) => {
      setSwitchedAt(Date.now())
      update({ wallpaper: { currentId: id } })
    },
    [update]
  )

  const next = useCallback(() => {
    // rotate through photos (downloaded + own) when there are any, otherwise through the drawn scenes
    const photos = all.filter((w) => w.source !== 'builtin')
    const pool = photos.length > 1 ? photos : all
    if (pool.length < 2) return
    const idx = pool.findIndex((w) => w.id === current.id)
    let pick: Wallpaper
    if (settingsRef.current.wallpaper.order === 'sequential') {
      pick = pool[(idx + 1) % pool.length]
    } else {
      do pick = pool[Math.floor(Math.random() * pool.length)]
      while (pick.id === current.id)
    }
    select(pick.id)
  }, [all, current.id, select])

  const { intervalMin } = settings.wallpaper
  const auto = settings.wallpaper.auto && rotate
  useEffect(() => {
    if (!auto) return
    const t = setInterval(() => {
      if (Date.now() - switchedAt >= intervalMin * 60_000) next()
    }, 5_000)
    return () => clearInterval(t)
  }, [auto, intervalMin, switchedAt, next])

  return { all, current, nextAt: auto ? switchedAt + intervalMin * 60_000 : null, select, next }
}
