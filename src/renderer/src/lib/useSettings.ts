import { useCallback, useEffect, useState } from 'react'
import type { Settings, WidgetConfig } from './types'

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'w-clock', type: 'clock', size: 'l' },
  { id: 'w-cpu', type: 'cpu', size: 's' },
  { id: 'w-gpu', type: 'gpu', size: 's' },
  { id: 'w-ram', type: 'ram', size: 's' },
  { id: 'w-temp', type: 'temp', size: 's' },
  { id: 'w-procs', type: 'processes', size: 'm' },
  { id: 'w-quick', type: 'quick', size: 'm' },
  { id: 'w-media', type: 'media', size: 'm' },
  { id: 'w-net', type: 'network', size: 'm' }
]

export const DEFAULT_SETTINGS: Settings = {
  appearance: { style: 'glass', mode: 'dark', background: 'photos', nav: 'top' },
  wallpaper: { auto: true, intervalMin: 10, order: 'random', glass: true, blur: 16, dim: 16, currentId: null },
  overlay: { enabled: false },
  audio: { switchHotkey: 'F6' },
  weather: null,
  dashboard: { widgets: DEFAULT_WIDGETS, widgets2: [] },
  screens: { dual: false, displayId: null },
  performance: { intervalSec: 2 },
  accent: '#C6F432'
}

export interface SettingsPatch {
  appearance?: Partial<Settings['appearance']>
  wallpaper?: Partial<Settings['wallpaper']>
  overlay?: Partial<Settings['overlay']>
  audio?: Partial<Settings['audio']>
  weather?: Settings['weather']
  dashboard?: Partial<Settings['dashboard']>
  screens?: Partial<Settings['screens']>
  performance?: Partial<Settings['performance']>
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
      appearance: { ...s.appearance, ...(patch.appearance ?? {}) },
      wallpaper: { ...s.wallpaper, ...(patch.wallpaper ?? {}) },
      overlay: { ...s.overlay, ...(patch.overlay ?? {}) },
      audio: { ...s.audio, ...(patch.audio ?? {}) },
      weather: patch.weather !== undefined ? patch.weather : s.weather,
      dashboard: { ...s.dashboard, ...(patch.dashboard ?? {}) },
      screens: { ...s.screens, ...(patch.screens ?? {}) },
      performance: { ...s.performance, ...(patch.performance ?? {}) },
      accent: patch.accent ?? s.accent
    }))
    await window.znerol.settings.update(patch)
  }, [])

  return { settings, update }
}
