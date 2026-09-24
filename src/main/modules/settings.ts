import { app } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'

export interface Settings {
  wallpaper: {
    auto: boolean
    intervalMin: number
    order: 'random' | 'sequential'
    blur: number // px for the glass cards
    dim: number // 0-60 percent
    currentId: string | null
  }
  overlay: {
    enabled: boolean
  }
  accent: string
}

const DEFAULTS: Settings = {
  wallpaper: { auto: true, intervalMin: 10, order: 'random', blur: 24, dim: 16, currentId: null },
  overlay: { enabled: true },
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
      accent: typeof raw.accent === 'string' ? raw.accent : DEFAULTS.accent
    }
  } catch {
    cache = structuredClone(DEFAULTS)
  }
  return cache
}

type Patch = {
  wallpaper?: Partial<Settings['wallpaper']>
  overlay?: Partial<Settings['overlay']>
  accent?: string
}

export async function updateSettings(patch: Patch): Promise<Settings> {
  const current = await getSettings()
  cache = {
    wallpaper: { ...current.wallpaper, ...(patch.wallpaper ?? {}) },
    overlay: { ...current.overlay, ...(patch.overlay ?? {}) },
    accent: patch.accent ?? current.accent
  }
  await fs.mkdir(path.dirname(file()), { recursive: true })
  await fs.writeFile(file(), JSON.stringify(cache, null, 2), 'utf-8')
  return cache
}
