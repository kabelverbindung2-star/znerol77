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

async function sample(): Promise<PerfSample> {
  const [cpuLoad, mem, temp, cpuSpeed, netStats, fsSize, graphics, time, osInfo] =
    await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.cpuTemperature().catch(() => ({ main: null }) as any),
      si.cpuCurrentSpeed().catch(() => ({ avg: null }) as any),
      si.networkStats().catch(() => [] as any[]),
      si.fsSize().catch(() => [] as any[]),
      si.graphics().catch(() => ({ controllers: [] }) as any),
      si.time(),
      si.osInfo()
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

export function startPerfLoop(getWindow: () => BrowserWindow | null, intervalMs = 1500): void {
  if (timer) return
  timer = setInterval(async () => {
    const win = getWindow()
    if (!win || win.isDestroyed()) return
    try {
      const data = await sample()
      win.webContents.send('perf:update', data)
    } catch {
      // systeminformation can throw transiently on some platforms; ignore this tick
    }
  }, intervalMs)
}

export function stopPerfLoop(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
