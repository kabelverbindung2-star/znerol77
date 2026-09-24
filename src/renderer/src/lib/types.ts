export interface PerfSample {
  timestamp: number
  cpu: { load: number; cores: number[]; temp: number | null; speed: number | null }
  mem: { usedPercent: number; usedGB: number; totalGB: number; swapUsedPercent: number }
  net: { rx: number; tx: number; iface: string }
  disks: { fs: string; usedPercent: number; sizeGB: number }[]
  gpu: { model: string; loadPercent: number | null; memUsedPercent: number | null; temp: number | null }[]
  uptimeSec: number
  os: { platform: string; distro: string; hostname: string; arch: string }
}

export interface Wallpaper {
  id: string
  source: 'builtin' | 'commons' | 'custom'
  name: string
  url: string
  credit?: string
}

export interface Settings {
  wallpaper: {
    auto: boolean
    intervalMin: number
    order: 'random' | 'sequential'
    glass: boolean
    blur: number
    dim: number
    currentId: string | null
  }
  overlay: { enabled: boolean }
  audio: { switchHotkey: string }
  weather: { name: string; lat: number; lon: number } | null
  accent: string
}

export interface AudioDevice {
  id: string
  name: string
  isDefault: boolean
}

export interface AudioSession {
  pid: number
  process: string
  name: string
  system: boolean
  active: boolean
  peak: number
  volume: number
  muted: boolean
}

export interface MediaInfo {
  app: string
  title: string
  artist: string
  album: string
  status: string
  canNext: boolean
  canPrev: boolean
  art: string | null
}

export interface Place {
  name: string
  region: string
  country: string
  lat: number
  lon: number
}

export interface Weather {
  temp: number
  feelsLike: number
  code: number
  isDay: boolean
  wind: number
  humidity: number
  min: number
  max: number
  fetchedAt: number
}

export interface ProcInfo {
  pid: number
  name: string
  cpu: number
  memPercent: number
  memMB: number
  user: string
  priority: number
}

export interface ClickerStatus {
  running: boolean
  clicks: number
  profileId: string | null
  error: string | null
}
