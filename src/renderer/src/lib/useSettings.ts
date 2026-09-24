import { useCallback, useEffect, useState } from 'react'
import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  wallpaper: { auto: true, intervalMin: 10, order: 'random', blur: 24, dim: 16, currentId: null },
  overlay: { enabled: true },
  accent: '#C6F432'
}

export interface SettingsPatch {
  wallpaper?: Partial<Settings['wallpaper']>
  overlay?: Partial<Settings['overlay']>
  accent?: string
}

export function useSettings(): { settings: Settings; update: (patch: SettingsPatch) => Promise<void> } {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const load = (): void => {
      window.znerol.settings.get().then((s: Settings) => setSettings(s)).catch(() => undefined)
    }
    load()
    return window.znerol.settings.onChanged(load)
  }, [])

  const update = useCallback(async (patch: SettingsPatch) => {
    // optimistic, so sliders feel immediate
    setSettings((s) => ({
      wallpaper: { ...s.wallpaper, ...(patch.wallpaper ?? {}) },
      overlay: { ...s.overlay, ...(patch.overlay ?? {}) },
      accent: patch.accent ?? s.accent
    }))
    await window.znerol.settings.update(patch)
  }, [])

  return { settings, update }
}
