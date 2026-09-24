import type { ChildProcessWithoutNullStreams } from 'child_process'
import { spawnPersistentPowerShell, isWindows } from './platform'

export interface AutoClickerProfile {
  id: string
  name: string
  intervalMs: number
  jitterMs: number
  button: 'left' | 'right' | 'middle'
  mode: 'single' | 'double'
  target: 'current' | 'fixed'
  x: number
  y: number
  clickLimit: number // 0 = unendlich
  hotkey: string // Accelerator string, z.B. "F6"
}

export interface AutoClickerStatus {
  running: boolean
  clicks: number
  profileId: string | null
  error: string | null
}

const PS_INIT = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ZnerolInput {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
}
"@
$MOUSEEVENTF_LEFTDOWN = 0x0002
$MOUSEEVENTF_LEFTUP = 0x0004
$MOUSEEVENTF_RIGHTDOWN = 0x0008
$MOUSEEVENTF_RIGHTUP = 0x0010
$MOUSEEVENTF_MIDDLEDOWN = 0x0020
$MOUSEEVENTF_MIDDLEUP = 0x0040
function Do-Click($button) {
  switch ($button) {
    'right'  { [ZnerolInput]::mouse_event($MOUSEEVENTF_RIGHTDOWN,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 8; [ZnerolInput]::mouse_event($MOUSEEVENTF_RIGHTUP,0,0,0,[UIntPtr]::Zero) }
    'middle' { [ZnerolInput]::mouse_event($MOUSEEVENTF_MIDDLEDOWN,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 8; [ZnerolInput]::mouse_event($MOUSEEVENTF_MIDDLEUP,0,0,0,[UIntPtr]::Zero) }
    default  { [ZnerolInput]::mouse_event($MOUSEEVENTF_LEFTDOWN,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 8; [ZnerolInput]::mouse_event($MOUSEEVENTF_LEFTUP,0,0,0,[UIntPtr]::Zero) }
  }
}
Write-Output "ZNEROL_READY"
`

class ClickerEngine {
  private helper: ChildProcessWithoutNullStreams | null = null
  private ready = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private status: AutoClickerStatus = { running: false, clicks: 0, profileId: null, error: null }
  private onStatus: (s: AutoClickerStatus) => void = () => {}

  setStatusListener(cb: (s: AutoClickerStatus) => void): void {
    this.onStatus = cb
  }

  private emit(): void {
    this.onStatus({ ...this.status })
  }

  private async ensureHelper(): Promise<void> {
    if (this.helper && this.ready) return
    if (!isWindows) throw new Error('Autoclicker wird nur unter Windows unterstützt')
    this.helper = spawnPersistentPowerShell()
    if (!this.helper) throw new Error('Konnte PowerShell-Helper nicht starten')
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Helper-Start-Timeout')), 5000)
      this.helper!.stdout.on('data', (d) => {
        if (d.toString().includes('ZNEROL_READY')) {
          this.ready = true
          clearTimeout(timeout)
          resolve()
        }
      })
      this.helper!.stderr.on('data', () => {
        // swallow noisy PS warnings; real errors surface via start() try/catch
      })
      this.helper!.on('exit', () => {
        this.ready = false
        this.helper = null
      })
      this.helper!.stdin.write(PS_INIT + '\n')
    })
  }

  private sendClick(profile: AutoClickerProfile): void {
    if (!this.helper) return
    const moveCmd =
      profile.target === 'fixed' ? `[ZnerolInput]::SetCursorPos(${profile.x},${profile.y})\n` : ''
    const clickCmd = `Do-Click '${profile.button}'\n`
    const cmds = profile.mode === 'double' ? clickCmd + clickCmd : clickCmd
    this.helper.stdin.write(moveCmd + cmds)
  }

  async start(profile: AutoClickerProfile): Promise<void> {
    if (this.status.running) return
    try {
      await this.ensureHelper()
    } catch (err) {
      this.status = { running: false, clicks: 0, profileId: null, error: (err as Error).message }
      this.emit()
      throw err
    }
    this.status = { running: true, clicks: 0, profileId: profile.id, error: null }
    this.emit()

    const tick = (): void => {
      if (!this.status.running) return
      this.sendClick(profile)
      this.status.clicks += 1
      this.emit()
      if (profile.clickLimit > 0 && this.status.clicks >= profile.clickLimit) {
        this.stop()
        return
      }
      const jitter = profile.jitterMs > 0 ? Math.floor(Math.random() * profile.jitterMs) : 0
      this.timer = setTimeout(tick, Math.max(1, profile.intervalMs + jitter))
    }
    tick()
  }

  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.status = { ...this.status, running: false }
    this.emit()
  }

  getStatus(): AutoClickerStatus {
    return { ...this.status }
  }

  dispose(): void {
    this.stop()
    this.helper?.kill()
    this.helper = null
    this.ready = false
  }
}

export const clickerEngine = new ClickerEngine()

export const defaultProfiles: AutoClickerProfile[] = [
  {
    id: 'default',
    name: 'Standard',
    intervalMs: 100,
    jitterMs: 15,
    button: 'left',
    mode: 'single',
    target: 'current',
    x: 0,
    y: 0,
    clickLimit: 0,
    hotkey: 'F6'
  }
]
