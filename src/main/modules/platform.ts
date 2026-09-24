import { spawn, type ChildProcessWithoutNullStreams } from 'child_process'

export const isWindows = process.platform === 'win32'

/**
 * Spawns a persistent, interactive PowerShell process. Commands written to
 * its stdin are executed in one continuous runspace, so state (like a
 * `Add-Type` P/Invoke definition) survives between calls. This avoids the
 * need for native Node addons (robotjs, edge-js, ...) which are notoriously
 * fragile to rebuild against Electron's ABI.
 */
export function spawnPersistentPowerShell(): ChildProcessWithoutNullStreams | null {
  if (!isWindows) return null
  return spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', '-'], {
    windowsHide: true
  })
}

/** Runs a one-off PowerShell command and resolves with stdout. */
export function runPowerShell(script: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isWindows) {
      reject(new Error('Nur unter Windows verfügbar'))
      return
    }
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true }
    )
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('PowerShell-Timeout'))
    }, timeoutMs)
    child.stdout.on('data', (d) => (stdout += d.toString()))
    child.stderr.on('data', (d) => (stderr += d.toString()))
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(stderr.trim() || `PowerShell beendet mit Code ${code}`))
    })
  })
}
