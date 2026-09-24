import { spawn } from 'child_process'

export const isWindows = process.platform === 'win32'

/** Runs a one-off PowerShell command and resolves with stdout. */
export function runPowerShell(script: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!isWindows) {
      reject(new Error('Nur unter Windows verfügbar'))
      return
    }
    // -EncodedCommand avoids every Windows command-line quoting problem
    const encoded = Buffer.from(script, 'utf16le').toString('base64')
    const child = spawn(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encoded],
      { windowsHide: true }
    )
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('PowerShell-Timeout'))
    }, timeoutMs)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (d) => (stdout += d))
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
