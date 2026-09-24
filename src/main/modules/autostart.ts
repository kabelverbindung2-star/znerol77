import { app, shell } from 'electron'
import { promises as fs } from 'fs'
import { runPowerShell, isWindows } from './platform'
import { RUN, APPROVED, AUTOSTART_LIST_SCRIPT } from './ps-scripts'

export type AutostartSource = 'hkcu-run' | 'hklm-run' | 'hklm-run32' | 'user-folder' | 'common-folder' | 'task'

export interface AutostartEntry {
  id: string
  name: string
  command: string
  source: AutostartSource
  location: string
  enabled: boolean
  needsAdmin: boolean
  file?: string // startup-folder entries: the .lnk/.url file itself
  taskPath?: string // scheduled tasks
}

const RUN_KEYS = RUN as Record<'hkcu-run' | 'hklm-run' | 'hklm-run32', string>
const APPROVED_KEYS = APPROVED as Record<Exclude<AutostartSource, 'task'>, string>

const q = (s: string): string => `'${s.replace(/'/g, "''")}'`

export async function listAutostart(): Promise<AutostartEntry[]> {
  if (!isWindows) return []
  const out = await runPowerShell(AUTOSTART_LIST_SCRIPT, 30000)
  if (!out.trim()) return []
  const data = JSON.parse(out)
  const list: AutostartEntry[] = Array.isArray(data) ? data : [data]
  return list.sort((a, b) => a.name.localeCompare(b.name))
}

/** Runs a script with admin rights (Windows shows the UAC prompt). */
async function runElevated(script: string): Promise<void> {
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  try {
    await runPowerShell(
      `$p = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -Wait -PassThru ` +
        `-ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand','${encoded}'; exit $p.ExitCode`,
      120000
    )
  } catch (e) {
    const msg = (e as Error).message
    if (/abgebrochen|canceled|cancelled/i.test(msg)) throw new Error('Abgebrochen – dafür braucht es Administratorrechte.')
    throw e
  }
}

async function run(script: string, admin: boolean): Promise<void> {
  if (admin) return runElevated(`$ErrorActionPreference = 'Stop'\n${script}`)
  try {
    await runPowerShell(`$ErrorActionPreference = 'Stop'\n${script}`, 20000)
  } catch (e) {
    // e.g. a scheduled task owned by the system: retry with admin rights
    if (/zugriff|access|denied|unauthori|berechtigung|0x80070005/i.test((e as Error).message)) {
      return runElevated(`$ErrorActionPreference = 'Stop'\n${script}`)
    }
    throw e
  }
}

export async function toggleAutostartEntry(entry: AutostartEntry, enable: boolean): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  if (entry.source === 'task') {
    const cmd = enable ? 'Enable-ScheduledTask' : 'Disable-ScheduledTask'
    await run(`${cmd} -TaskPath ${q(entry.taskPath ?? '\\')} -TaskName ${q(entry.name)} | Out-Null`, false)
    return
  }
  const key = APPROVED_KEYS[entry.source]
  const valueName = entry.source.endsWith('folder') ? (entry.file ?? '').split('\\').pop() ?? entry.name : entry.name
  const bytes = enable
    ? '[byte[]](2,0,0,0,0,0,0,0,0,0,0,0)'
    : '([byte[]](3,0,0,0) + [BitConverter]::GetBytes([DateTime]::Now.ToFileTime()))'
  await run(
    `New-Item -Path ${q(key)} -Force | Out-Null\nSet-ItemProperty -Path ${q(key)} -Name ${q(valueName)} -Value ${bytes} -Type Binary`,
    entry.needsAdmin
  )
}

export async function removeAutostartEntry(entry: AutostartEntry): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  if (entry.source === 'task') {
    await run(`Unregister-ScheduledTask -TaskPath ${q(entry.taskPath ?? '\\')} -TaskName ${q(entry.name)} -Confirm:$false`, false)
    return
  }
  if (entry.source.endsWith('folder')) {
    if (!entry.file) return
    if (entry.needsAdmin) await run(`Remove-Item -LiteralPath ${q(entry.file)} -Force`, true)
    else await fs.unlink(entry.file)
    return
  }
  const runKey = RUN_KEYS[entry.source as keyof typeof RUN_KEYS]
  await run(
    `Remove-ItemProperty -Path ${q(runKey)} -Name ${q(entry.name)}\n` +
      `Remove-ItemProperty -Path ${q(APPROVED_KEYS[entry.source])} -Name ${q(entry.name)} -ErrorAction SilentlyContinue`,
    entry.needsAdmin
  )
}

export async function addAutostartEntry(name: string, command: string): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  await runPowerShell(
    `New-ItemProperty -Path ${q(RUN_KEYS['hkcu-run'])} -Name ${q(name)} -Value ${q(command)} -PropertyType String -Force | Out-Null`
  )
}

/** Extracts the program path from a command line like `"C:\x\app.exe" --min`. */
export function programPath(command: string): string {
  const c = command.trim()
  if (c.startsWith('"')) return c.slice(1, c.indexOf('"', 1))
  const m = c.match(/^(.+?\.(exe|bat|cmd|lnk|com))(\s|$)/i)
  return m ? m[1] : c.split(' ')[0]
}

export function revealAutostart(entry: AutostartEntry): void {
  shell.showItemInFolder(entry.file ?? programPath(entry.command))
}

/** Small program icons for the list (data URLs), empty where Windows has none. */
export async function autostartIcons(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  await Promise.all(
    paths.map(async (p) => {
      try {
        const img = await app.getFileIcon(programPath(p), { size: 'normal' })
        if (!img.isEmpty()) out[p] = img.toDataURL()
      } catch {
        // file missing or no icon
      }
    })
  )
  return out
}
