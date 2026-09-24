import { promises as fs } from 'fs'
import path from 'path'
import { runPowerShell, isWindows } from './platform'

export interface AutostartEntry {
  id: string
  name: string
  command: string
  source: 'registry' | 'startup-folder'
  enabled: boolean
}

const RUN_KEY = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const DISABLED_KEY = 'HKCU:\\Software\\ZnerolMonitor\\DisabledAutostart'

function startupFolder(): string {
  return path.join(
    process.env.APPDATA || '',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup'
  )
}

export async function listAutostart(): Promise<AutostartEntry[]> {
  if (!isWindows) return []

  const entries: AutostartEntry[] = []

  // Registry Run key entries
  const script = `
    $ErrorActionPreference = 'SilentlyContinue'
    if (Test-Path '${RUN_KEY}') {
      $props = Get-Item -Path '${RUN_KEY}' | Select-Object -ExpandProperty Property
      foreach ($p in $props) {
        $val = (Get-ItemProperty -Path '${RUN_KEY}' -Name $p).$p
        Write-Output "$p|$val"
      }
    }
  `
  try {
    const out = await runPowerShell(script)
    for (const line of out.split(/\r?\n/).filter(Boolean)) {
      const idx = line.indexOf('|')
      if (idx === -1) continue
      const name = line.slice(0, idx)
      const command = line.slice(idx + 1)
      entries.push({ id: `reg:${name}`, name, command, source: 'registry', enabled: true })
    }
  } catch {
    // registry key may not exist yet — that's fine
  }

  // Startup folder shortcuts
  try {
    const dir = startupFolder()
    const files = await fs.readdir(dir).catch(() => [] as string[])
    for (const f of files) {
      if (!f.toLowerCase().endsWith('.lnk') && !f.toLowerCase().endsWith('.url')) continue
      entries.push({
        id: `folder:${f}`,
        name: f.replace(/\.(lnk|url)$/i, ''),
        command: path.join(dir, f),
        source: 'startup-folder',
        enabled: true
      })
    }
  } catch {
    // ignore
  }

  // Disabled (parked) entries we moved out ourselves
  try {
    const out = await runPowerShell(`
      $ErrorActionPreference = 'SilentlyContinue'
      if (Test-Path '${DISABLED_KEY}') {
        $props = Get-Item -Path '${DISABLED_KEY}' | Select-Object -ExpandProperty Property
        foreach ($p in $props) {
          $val = (Get-ItemProperty -Path '${DISABLED_KEY}' -Name $p).$p
          Write-Output "$p|$val"
        }
      }
    `)
    for (const line of out.split(/\r?\n/).filter(Boolean)) {
      const idx = line.indexOf('|')
      if (idx === -1) continue
      const name = line.slice(0, idx)
      const command = line.slice(idx + 1)
      entries.push({ id: `disabled:${name}`, name, command, source: 'registry', enabled: false })
    }
  } catch {
    // ignore
  }

  return entries
}

export async function addAutostartEntry(name: string, command: string): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  const safeName = name.replace(/'/g, "''")
  const safeCommand = command.replace(/'/g, "''")
  await runPowerShell(
    `New-ItemProperty -Path '${RUN_KEY}' -Name '${safeName}' -Value '${safeCommand}' -PropertyType String -Force | Out-Null`
  )
}

export async function removeAutostartEntry(entry: AutostartEntry): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  if (entry.source === 'startup-folder') {
    await fs.unlink(entry.command).catch(() => undefined)
    return
  }
  const safeName = entry.name.replace(/'/g, "''")
  const keyBase = entry.enabled ? RUN_KEY : DISABLED_KEY
  await runPowerShell(
    `Remove-ItemProperty -Path '${keyBase}' -Name '${safeName}' -ErrorAction SilentlyContinue`
  )
}

/** Disable = move the value from the live Run key into a parked key (and back to enable). */
export async function toggleAutostartEntry(entry: AutostartEntry, enable: boolean): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  if (entry.source === 'startup-folder') {
    throw new Error('Startup-Ordner-Einträge können nur entfernt, nicht deaktiviert werden')
  }
  const safeName = entry.name.replace(/'/g, "''")
  const safeCommand = entry.command.replace(/'/g, "''")
  const fromKey = enable ? DISABLED_KEY : RUN_KEY
  const toKey = enable ? RUN_KEY : DISABLED_KEY
  await runPowerShell(`
    New-Item -Path '${toKey}' -Force | Out-Null
    New-ItemProperty -Path '${toKey}' -Name '${safeName}' -Value '${safeCommand}' -PropertyType String -Force | Out-Null
    Remove-ItemProperty -Path '${fromKey}' -Name '${safeName}' -ErrorAction SilentlyContinue
  `)
}
