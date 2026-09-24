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
    blur: number
    dim: number
    currentId: string | null
  }
  overlay: { enabled: boolean }
  accent: string
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
