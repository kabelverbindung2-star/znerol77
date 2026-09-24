import { BrowserWindow } from 'electron'
import si from 'systeminformation'

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

let lastNet: { rx: number; tx: number; ts: number } | null = null
let timer: ReturnType<typeof setInterval> | null = null

// On Windows most systeminformation calls run a PowerShell/WMI query. Without a
// persistent PowerShell every query spawns a new powershell.exe, which is what made
// the whole PC lag and the fans spin up. One long-lived session fixes that.
export function startSystemQueries(): void {
  if (process.platform === 'win32') si.powerShellStart()
}

export function stopSystemQueries(): void {
  if (process.platform === 'win32') si.powerShellRelease()
}

// Expensive, slowly changing values refresh on their own cadence (in ticks).
let tick = 0
let gpuTemp: { temp: any; graphics: any } | null = null
let rare: { fsSize: any[]; osInfo: any } | null = null

async function sample(): Promise<PerfSample> {
  if (!gpuTemp || tick % 5 === 0) {
    const [temp, graphics] = await Promise.all([
      si.cpuTemperature().catch(() => ({ main: null }) as any),
      si.graphics().catch(() => ({ controllers: [] }) as any)
    ])
    gpuTemp = { temp, graphics }
  }
  if (!rare || tick % 30 === 0) {
    const [fsSize, osInfo] = await Promise.all([si.fsSize().catch(() => [] as any[]), si.osInfo()])
    rare = { fsSize, osInfo }
  }
  tick += 1
  const { temp, graphics } = gpuTemp
  const { fsSize, osInfo } = rare
  const [cpuLoad, mem, cpuSpeed, netStats, time] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.cpuCurrentSpeed().catch(() => ({ avg: null }) as any),
    si.networkStats().catch(() => [] as any[]),
    si.time()
  ])

  const now = Date.now()
  let rx = 0
  let tx = 0
  let iface = ''
  if (netStats.length > 0) {
    const primary = netStats.reduce((a: any, b: any) => (b.rx_bytes > a.rx_bytes ? b : a))
    iface = primary.iface
    const totalRx = netStats.reduce((s: number, n: any) => s + (n.rx_bytes || 0), 0)
    const totalTx = netStats.reduce((s: number, n: any) => s + (n.tx_bytes || 0), 0)
    if (lastNet) {
      const dt = Math.max((now - lastNet.ts) / 1000, 0.5)
      rx = Math.max(0, (totalRx - lastNet.rx) / dt)
      tx = Math.max(0, (totalTx - lastNet.tx) / dt)
    }
    lastNet = { rx: totalRx, tx: totalTx, ts: now }
  }

  return {
    timestamp: now,
    cpu: {
      load: cpuLoad.currentLoad,
      cores: cpuLoad.cpus.map((c) => c.load),
      temp: temp.main ?? null,
      speed: cpuSpeed.avg ?? null
    },
    mem: {
      usedPercent: (mem.active / mem.total) * 100,
      usedGB: mem.active / 1024 ** 3,
      totalGB: mem.total / 1024 ** 3,
      swapUsedPercent: mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0
    },
    net: { rx, tx, iface },
    disks: fsSize
      .filter((d: any) => d.size > 0)
      .map((d: any) => ({ fs: d.mount || d.fs, usedPercent: d.use, sizeGB: d.size / 1024 ** 3 })),
    gpu: (graphics.controllers || []).map((g: any) => ({
      model: g.model || 'GPU',
      loadPercent: g.utilizationGpu ?? null,
      memUsedPercent:
        g.memoryUsed && g.memoryTotal ? (g.memoryUsed / g.memoryTotal) * 100 : null,
      temp: g.temperatureGpu ?? null
    })),
    uptimeSec: time.uptime,
    os: {
      platform: osInfo.platform,
      distro: osInfo.distro,
      hostname: osInfo.hostname,
      arch: osInfo.arch
    }
  }
}

let busy = false

export function startPerfLoop(getWindows: () => BrowserWindow[], intervalMs = 2000): void {
  if (timer) return
  timer = setInterval(async () => {
    // nobody looking (minimised / hidden / overlay off) -> measure nothing at all
    const targets = getWindows().filter((w) => !w.isDestroyed() && w.isVisible() && !w.isMinimized())
    if (targets.length === 0 || busy) return
    busy = true
    try {
      const data = await sample()
      for (const w of targets) w.webContents.send('perf:update', data)
    } catch {
      // systeminformation can throw transiently on some platforms; ignore this tick
    } finally {
      busy = false
    }
  }, intervalMs)
}

export function restartPerfLoop(getWindows: () => BrowserWindow[], intervalMs: number): void {
  stopPerfLoop()
  startPerfLoop(getWindows, Math.max(1000, Math.min(10000, intervalMs)))
}

export function stopPerfLoop(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
