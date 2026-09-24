import os from 'os'
import si from 'systeminformation'
import { winHelper } from './winhelper'
import { isWindows } from './platform'
import { withTimeout } from './perf'

export interface ProcInfo {
  pid: number
  name: string
  cpu: number
  memPercent: number
  memMB: number
  user: string
  priority: number
}

// Overview and process tab ask at the same time; they share one result for a few seconds.
let cached: { at: number; list: Promise<ProcInfo[]> } | null = null
const CACHE_MS = 3000

export function listProcesses(): Promise<ProcInfo[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.list
  const list = withTimeout(queryProcesses(), 12000, [] as ProcInfo[])
  cached = { at: Date.now(), list }
  return list
}

async function queryProcesses(): Promise<ProcInfo[]> {
  const total = os.totalmem()
  if (isWindows) {
    // Process.GetProcesses in the helper: fast, no WMI (WMI is what hung before)
    const raw = await winHelper.request<{ pid: number; name: string; cpu: number; mem: number }[]>('processes', {}, 30000)
    return raw
      .map((p) => ({
        pid: p.pid,
        name: p.name,
        cpu: p.cpu,
        memPercent: (p.mem / total) * 100,
        memMB: p.mem / 1024 ** 2,
        user: '',
        priority: 0
      }))
      .sort((a, b) => b.cpu - a.cpu || b.memMB - a.memMB)
  }
  const data = await si.processes()
  return data.list
    .map((p) => ({
      pid: p.pid,
      name: p.name,
      cpu: p.cpu,
      memPercent: p.mem,
      memMB: p.memRss ? p.memRss / 1024 : 0,
      user: p.user || '',
      priority: p.priority ?? 0
    }))
    .sort((a, b) => b.cpu - a.cpu)
}

export async function killProcess(pid: number): Promise<void> {
  cached = null
  if (isWindows) await winHelper.request('kill', { pid })
  else process.kill(pid, 'SIGTERM')
}

export async function setProcessPriority(pid: number, level: string): Promise<void> {
  if (!isWindows) throw new Error('Priorität setzen wird nur unter Windows unterstützt')
  cached = null
  await winHelper.request('setPriority', { pid, arg: level })
}
