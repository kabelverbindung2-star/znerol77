import { app } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { HELPER_SCRIPT } from './helper-script'
import { isWindows } from './platform'

interface Pending {
  resolve: (v: any) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

/**
 * One long-lived powershell.exe that compiled the C# helper once and then answers
 * JSON requests over stdin/stdout. Replaces the old "spawn PowerShell + recompile
 * for every call" approach, which was a big part of the lag.
 */
class WinHelper {
  private proc: ChildProcessWithoutNullStreams | null = null
  private starting: Promise<void> | null = null
  private buffer = ''
  private nextId = 1
  private pending = new Map<number, Pending>()

  private async start(): Promise<void> {
    if (!isWindows) throw new Error('Nur unter Windows verfügbar')
    const file = path.join(app.getPath('userData'), 'znerol-helper.ps1')
    await fs.writeFile(file, HELPER_SCRIPT, 'utf-8')
    const proc = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', file],
      { windowsHide: true }
    )
    this.proc = proc
    this.buffer = ''
    proc.stdout.setEncoding('utf8')
    proc.stderr.on('data', () => {
      // warnings from WinRT loading etc.; real errors come back as JSON replies
    })
    proc.on('exit', () => {
      this.proc = null
      this.starting = null
      for (const [, p] of this.pending) {
        clearTimeout(p.timer)
        p.reject(new Error('Windows-Helfer wurde beendet'))
      }
      this.pending.clear()
    })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Windows-Helfer startet nicht')), 30000)
      proc.stdout.on('data', (chunk: string) => {
        this.buffer += chunk
        let nl: number
        while ((nl = this.buffer.indexOf('\n')) >= 0) {
          const line = this.buffer.slice(0, nl).trim()
          this.buffer = this.buffer.slice(nl + 1)
          if (!line.startsWith('{')) continue
          let msg: any
          try {
            msg = JSON.parse(line)
          } catch {
            continue
          }
          if (msg.ready) {
            clearTimeout(timer)
            resolve()
            continue
          }
          const p = this.pending.get(msg.id)
          if (!p) continue
          this.pending.delete(msg.id)
          clearTimeout(p.timer)
          if (msg.ok) p.resolve(msg.data)
          else p.reject(new Error(msg.error || 'Fehler im Windows-Helfer'))
        }
      })
      proc.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })
    })
  }

  private ensure(): Promise<void> {
    if (this.proc && this.starting) return this.starting
    this.starting = this.start().catch((err) => {
      this.proc?.kill()
      this.proc = null
      this.starting = null
      throw err
    })
    return this.starting
  }

  async request<T = unknown>(cmd: string, args: Record<string, unknown> = {}, timeoutMs = 8000): Promise<T> {
    await this.ensure()
    const id = this.nextId++
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error('Windows-Helfer antwortet nicht'))
      }, timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.proc!.stdin.write(JSON.stringify({ id, cmd, ...args }) + '\n')
    })
  }

  /** Fire-and-forget (used for autoclicker clicks, where waiting would add latency). */
  async send(cmd: string, args: Record<string, unknown> = {}): Promise<void> {
    await this.ensure()
    this.proc!.stdin.write(JSON.stringify({ cmd, ...args }) + '\n')
  }

  dispose(): void {
    this.proc?.kill()
    this.proc = null
    this.starting = null
  }
}

export const winHelper = new WinHelper()
