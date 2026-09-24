import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

export interface WidgetConfig {
  id: string
  type: string
  size: 's' | 'm' | 'l' // 1, 2 or 4 grid columns
}

export interface Settings {
  appearance: {
    style: 'glass' | 'basic'
    mode: 'dark' | 'light' // used by the basic style
    background: 'photos' | 'fixed' | 'plain' | 'transparent'
    nav: 'left' | 'top' | 'right' // where the navigation bar sits
  }
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
  dashboard: {
    widgets: WidgetConfig[]
    widgets2: WidgetConfig[] // tiles on the second screen
  }
  screens: {
    dual: boolean // second window on another monitor
    displayId: number | null // which monitor; null = the first one without the main window
  }
  performance: {
    intervalSec: number
  }
  accent: string
}

const SETTINGS_VERSION = 4

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

export const DEFAULT_WIDGETS_2: WidgetConfig[] = [
  { id: 'w2-clock', type: 'clock', size: 'l' },
  { id: 'w2-media', type: 'media', size: 'm' },
  { id: 'w2-net', type: 'network', size: 'm' },
  { id: 'w2-procs', type: 'processes', size: 'm' },
  { id: 'w2-cpu', type: 'cpu', size: 's' },
  { id: 'w2-ram', type: 'ram', size: 's' }
]

const DEFAULTS: Settings = {
  appearance: { style: 'glass', mode: 'dark', background: 'photos', nav: 'top' },
  wallpaper: { auto: true, intervalMin: 10, order: 'random', glass: true, blur: 16, dim: 16, currentId: null },
  overlay: { enabled: false },
  audio: { switchHotkey: 'F6' },
  weather: null,
  dashboard: { widgets: DEFAULT_WIDGETS, widgets2: DEFAULT_WIDGETS_2 },
  screens: { dual: false, displayId: null },
  performance: { intervalSec: 2 },
  accent: '#C6F432'
}

let cache: Settings | null = null
const file = (): string => path.join(app.getPath('userData'), 'settings.json')

export async function getSettings(): Promise<Settings> {
  if (cache) return cache
  try {
    const raw = JSON.parse(await fs.readFile(file(), 'utf-8'))
    const widgets = Array.isArray(raw.dashboard?.widgets) ? raw.dashboard.widgets : DEFAULT_WIDGETS
    const widgets2 = Array.isArray(raw.dashboard?.widgets2) ? raw.dashboard.widgets2 : DEFAULT_WIDGETS_2
    cache = {
      appearance: { ...DEFAULTS.appearance, ...(raw.appearance ?? {}) },
      wallpaper: { ...DEFAULTS.wallpaper, ...(raw.wallpaper ?? {}) },
      overlay: { ...DEFAULTS.overlay, ...(raw.overlay ?? {}) },
      audio: { ...DEFAULTS.audio, ...(raw.audio ?? {}) },
      weather: raw.weather && typeof raw.weather.lat === 'number' ? raw.weather : null,
      dashboard: { widgets, widgets2 },
      screens: { ...DEFAULTS.screens, ...(raw.screens ?? {}) },
      performance: { ...DEFAULTS.performance, ...(raw.performance ?? {}) },
      accent: typeof raw.accent === 'string' ? raw.accent : DEFAULTS.accent
    }
    // 2.0.1 had the always-on overlay as default, which cost performance for everyone
    if ((raw.version ?? 1) < 2) cache.overlay.enabled = false
    // the user asked for the old horizontal bar at the top back
    if ((raw.version ?? 1) < 4) cache.appearance.nav = 'top'
  } catch {
    cache = structuredClone(DEFAULTS)
  }
  return cache
}

export type SettingsPatch = {
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

let writing: Promise<void> = Promise.resolve()

export async function updateSettings(patch: SettingsPatch): Promise<Settings> {
  await getSettings()
  // read the cache again *after* awaiting: several quick changes must build on each other
  const current = cache!
  cache = {
    appearance: { ...current.appearance, ...(patch.appearance ?? {}) },
    wallpaper: { ...current.wallpaper, ...(patch.wallpaper ?? {}) },
    overlay: { ...current.overlay, ...(patch.overlay ?? {}) },
    audio: { ...current.audio, ...(patch.audio ?? {}) },
    weather: patch.weather !== undefined ? patch.weather : current.weather,
    dashboard: { ...current.dashboard, ...(patch.dashboard ?? {}) },
    screens: { ...current.screens, ...(patch.screens ?? {}) },
    performance: { ...current.performance, ...(patch.performance ?? {}) },
    accent: patch.accent ?? current.accent
  }
  const snapshot = JSON.stringify({ version: SETTINGS_VERSION, ...cache }, null, 2)
  // writes are queued so an older state can never land on disk after a newer one
  writing = writing
    .then(async () => {
      await fs.mkdir(path.dirname(file()), { recursive: true })
      await fs.writeFile(file() + '.tmp', snapshot, 'utf-8')
      await fs.rename(file() + '.tmp', file())
    })
    .catch(() => undefined)
  await writing
  return cache
}
