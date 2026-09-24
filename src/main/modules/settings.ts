import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

export interface Settings {
  wallpaper: {
    auto: boolean
    intervalMin: number
    order: 'random' | 'sequential'
    glass: boolean // backdrop blur on the cards; off = lighter on the GPU
    blur: number // px for the glass cards
    dim: number // 0-60 percent
    currentId: string | null
  }
  overlay: {
    enabled: boolean
  }
  audio: {
    switchHotkey: string // cycles the default output device
  }
  weather: {
    name: string
    lat: number
    lon: number
  } | null
  accent: string
}

const SETTINGS_VERSION = 2

const DEFAULTS: Settings = {
  wallpaper: { auto: true, intervalMin: 10, order: 'random', glass: true, blur: 16, dim: 16, currentId: null },
  overlay: { enabled: false },
  audio: { switchHotkey: 'F6' },
  weather: null,
  accent: '#C6F432'
}

let cache: Settings | null = null
const file = (): string => path.join(app.getPath('userData'), 'settings.json')

export async function getSettings(): Promise<Settings> {
  if (cache) return cache
  try {
    const raw = JSON.parse(await fs.readFile(file(), 'utf-8'))
    cache = {
      wallpaper: { ...DEFAULTS.wallpaper, ...(raw.wallpaper ?? {}) },
      overlay: { ...DEFAULTS.overlay, ...(raw.overlay ?? {}) },
      audio: { ...DEFAULTS.audio, ...(raw.audio ?? {}) },
      weather: raw.weather && typeof raw.weather.lat === 'number' ? raw.weather : null,
      accent: typeof raw.accent === 'string' ? raw.accent : DEFAULTS.accent
    }
    // 2.0.x had the always-on overlay as default, which cost performance for everyone
    if ((raw.version ?? 1) < SETTINGS_VERSION) cache.overlay.enabled = false
  } catch {
    cache = structuredClone(DEFAULTS)
  }
  return cache
}

export type SettingsPatch = {
  wallpaper?: Partial<Settings['wallpaper']>
  overlay?: Partial<Settings['overlay']>
  audio?: Partial<Settings['audio']>
  weather?: Settings['weather']
  accent?: string
}

export async function updateSettings(patch: SettingsPatch): Promise<Settings> {
  const current = await getSettings()
  cache = {
    wallpaper: { ...current.wallpaper, ...(patch.wallpaper ?? {}) },
    overlay: { ...current.overlay, ...(patch.overlay ?? {}) },
    audio: { ...current.audio, ...(patch.audio ?? {}) },
    weather: patch.weather !== undefined ? patch.weather : current.weather,
    accent: patch.accent ?? current.accent
  }
  await fs.mkdir(path.dirname(file()), { recursive: true })
  await fs.writeFile(file(), JSON.stringify({ version: SETTINGS_VERSION, ...cache }, null, 2), 'utf-8')
  return cache
}
