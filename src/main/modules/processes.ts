import si from 'systeminformation'
import { exec } from 'child_process'
import { promisify } from 'util'
import { isWindows } from './platform'

const execAsync = promisify(exec)

export interface ProcInfo {
  pid: number
  name: string
  cpu: number
  memPercent: number
  memMB: number
  user: string
  priority: number
}

export async function listProcesses(): Promise<ProcInfo[]> {
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
  if (isWindows) {
    await execAsync(`taskkill /PID ${pid} /F`)
  } else {
    process.kill(pid, 'SIGTERM')
  }
}

const PRIORITY_MAP: Record<string, string> = {
  low: 'idle',
  belownormal: 'belownormal',
  normal: 'normal',
  abovenormal: 'abovenormal',
  high: 'high',
  realtime: 'realtime'
}

export async function setProcessPriority(pid: number, level: keyof typeof PRIORITY_MAP): Promise<void> {
  if (!isWindows) throw new Error('Priorität setzen wird nur unter Windows unterstützt')
  const wmicLevel = PRIORITY_MAP[level]
  await execAsync(
    `wmic process where ProcessId=${pid} CALL setpriority "${wmicLevel}"`
  )
}
