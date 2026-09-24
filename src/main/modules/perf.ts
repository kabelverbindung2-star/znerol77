import { BrowserWindow } from 'electron'
import os from 'os'
import si from 'systeminformation'
import { winHelper } from './winhelper'
import { isWindows } from './platform'

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

/** Never let one slow query freeze the whole loop (that is what left the tiles empty). */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(fallback), ms)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      () => {
        clearTimeout(t)
        resolve(fallback)
      }
    )
  })
}

// ---------- CPU from Node's own per-core counters (no PowerShell, no WMI) ----------
let lastCpu: os.CpuInfo[] | null = null

function cpuLoad(): { load: number; cores: number[]; speed: number | null } {
  const now = os.cpus()
  const prev = lastCpu
  lastCpu = now
  if (!prev || prev.length !== now.length) return { load: 0, cores: now.map(() => 0), speed: null }
  let idleAll = 0
  let totalAll = 0
  const cores = now.map((c, i) => {
    const p = prev[i].times
    const t = c.times
    const idle = t.idle - p.idle
    const total = t.user - p.user + (t.nice - p.nice) + (t.sys - p.sys) + (t.irq - p.irq) + idle
    idleAll += idle
    totalAll += total
    return total > 0 ? Math.max(0, Math.min(100, (1 - idle / total) * 100)) : 0
  })
  const speed = now[0]?.speed ? now[0].speed / 1000 : null
  return { load: totalAll > 0 ? (1 - idleAll / totalAll) * 100 : 0, cores, speed }
}

// ---------- network rate ----------
let lastNet: { rx: number; tx: number; ts: number } | null = null

function rate(totalRx: number, totalTx: number): { rx: number; tx: number } {
  const now = Date.now()
  let rx = 0
  let tx = 0
  if (lastNet) {
    const dt = Math.max((now - lastNet.ts) / 1000, 0.5)
    rx = Math.max(0, (totalRx - lastNet.rx) / dt)
    tx = Math.max(0, (totalTx - lastNet.tx) / dt)
  }
  lastNet = { rx: totalRx, tx: totalTx, ts: now }
  return { rx, tx }
}

async function netStats(): Promise<PerfSample['net']> {
  if (isWindows) {
    const n = await withTimeout(winHelper.request<{ rx: number; tx: number; iface: string }>('net', {}, 30000), 4000, null)
    if (!n) return { rx: 0, tx: 0, iface: '' }
    return { ...rate(n.rx, n.tx), iface: n.iface }
  }
  const stats: any[] = await withTimeout(si.networkStats(), 4000, [] as any[])
  if (!stats.length) return { rx: 0, tx: 0, iface: '' }
  const primary = stats.reduce((a, b) => (b.rx_bytes > a.rx_bytes ? b : a))
  const r = rate(
    stats.reduce((s, n) => s + (n.rx_bytes || 0), 0),
    stats.reduce((s, n) => s + (n.tx_bytes || 0), 0)
  )
  return { ...r, iface: primary.iface }
}

async function disks(): Promise<PerfSample['disks']> {
  if (isWindows) {
    const d = await withTimeout(
      winHelper.request<{ fs: string; size: number; free: number }[]>('drives', {}, 30000),
      5000,
      [] as { fs: string; size: number; free: number }[]
    )
    return d
      .filter((x) => x.size > 0)
      .map((x) => ({ fs: x.fs, usedPercent: ((x.size - x.free) / x.size) * 100, sizeGB: x.size / 1024 ** 3 }))
  }
  const fsz: any[] = await withTimeout(si.fsSize(), 5000, [] as any[])
  return fsz.filter((d) => d.size > 0).map((d) => ({ fs: d.mount || d.fs, usedPercent: d.use, sizeGB: d.size / 1024 ** 3 }))
}

// GPU (nvidia-smi) and temperature are the slowest queries; if they keep failing we stop asking.
let gpuFailures = 0
let tempFailures = 0
let tick = 0
const slow: { temp: number | null; gpu: PerfSample['gpu']; disks: PerfSample['disks'] } = { temp: null, gpu: [], disks: [] }

async function refreshSlow(): Promise<void> {
  const jobs: Promise<void>[] = []
  // model name etc. once (on Windows this spawns nvidia-smi/PowerShell, so not repeatedly)
  if (gpuFailures < 2 && (slow.gpu.length === 0 || !isWindows)) {
    jobs.push(
      withTimeout(si.graphics() as Promise<any>, 8000, null).then((g: any) => {
        if (!g) {
          gpuFailures++
          return
        }
        slow.gpu = (g.controllers || []).map((c: any) => ({
          model: c.model || 'GPU',
          loadPercent: c.utilizationGpu ?? null,
          memUsedPercent: c.memoryUsed && c.memoryTotal ? (c.memoryUsed / c.memoryTotal) * 100 : null,
          temp: c.temperatureGpu ?? null
        }))
      })
    )
  }
  if (tempFailures < 2 && (slow.temp === null || !isWindows)) {
    jobs.push(
      withTimeout(si.cpuTemperature() as Promise<any>, 5000, null).then((t: any) => {
        const v = t?.main
        if (typeof v === 'number' && v > 0) slow.temp = v
        else tempFailures++
      })
    )
  }
  if (tick % 15 === 0) jobs.push(disks().then((d) => void (slow.disks = d)))
  await Promise.all(jobs)
}

/** GPU load from the Windows performance counters (same source as Task Manager). */
async function gpuLoad(): Promise<number | null> {
  if (!isWindows || gpuCounterFailures >= 3) return null
  const r = await withTimeout(winHelper.request<{ load: number }>('gpu', {}, 30000), 3000, null)
  if (!r) {
    gpuCounterFailures++
    return null
  }
  return r.load
}
let gpuCounterFailures = 0

async function sample(): Promise<PerfSample> {
  if (tick % 5 === 0) await refreshSlow()
  tick += 1
  const cpu = cpuLoad()
  const total = os.totalmem()
  const used = total - os.freemem()
  const [net, gload] = await Promise.all([netStats(), gpuLoad()])
  if (gload !== null) {
    if (slow.gpu.length === 0) slow.gpu = [{ model: 'GPU', loadPercent: gload, memUsedPercent: null, temp: null }]
    else slow.gpu[0] = { ...slow.gpu[0], loadPercent: gload }
  }
  return {
    timestamp: Date.now(),
    cpu: { load: cpu.load, cores: cpu.cores, temp: slow.temp ?? slow.gpu[0]?.temp ?? null, speed: cpu.speed },
    mem: { usedPercent: (used / total) * 100, usedGB: used / 1024 ** 3, totalGB: total / 1024 ** 3, swapUsedPercent: 0 },
    net,
    disks: slow.disks,
    gpu: slow.gpu,
    uptimeSec: os.uptime(),
    os: {
      platform: process.platform,
      distro: typeof os.version === 'function' ? os.version() : os.type(),
      hostname: os.hostname(),
      arch: os.arch()
    }
  }
}

export function startSystemQueries(): void {
  // prime the CPU counters so the first real sample already has a delta
  cpuLoad()
}

export function stopSystemQueries(): void {
  // nothing persistent any more
}

let timer: ReturnType<typeof setInterval> | null = null
let busy = false

export function startPerfLoop(getWindows: () => BrowserWindow[], intervalMs = 2000): void {
  if (timer) return
  timer = setInterval(async () => {
    // nobody looking (minimised / hidden) -> measure nothing at all
    const targets = getWindows().filter((w) => !w.isDestroyed() && w.isVisible() && !w.isMinimized())
    if (targets.length === 0 || busy) return
    busy = true
    try {
      const data = await withTimeout(sample(), 10000, null)
      if (data) for (const w of targets) if (!w.isDestroyed()) w.webContents.send('perf:update', data)
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
