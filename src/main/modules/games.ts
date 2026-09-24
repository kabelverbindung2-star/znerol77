import { promises as fs } from 'fs'
import path from 'path'
import { runPowerShell, isWindows } from './platform'

export interface GameEntry {
  appId: string
  name: string
  installDir: string
}

/** Minimal VDF (Valve Data Format) parser — enough for libraryfolders.vdf / appmanifest_*.acf. */
function parseVdf(text: string): Record<string, any> {
  const root: Record<string, any> = {}
  const stack: Record<string, any>[] = [root]
  const lines = text.split(/\r?\n/)
  let pendingKey: string | null = null
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('//')) continue
    if (line === '{') {
      const parent = stack[stack.length - 1]
      const key = pendingKey ?? `_${Object.keys(parent).length}`
      const obj: Record<string, any> = {}
      parent[key] = obj
      stack.push(obj)
      pendingKey = null
      continue
    }
    if (line === '}') {
      stack.pop()
      continue
    }
    const matches = [...line.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1])
    if (matches.length >= 2) {
      stack[stack.length - 1][matches[0]] = matches[1]
      pendingKey = null
    } else if (matches.length === 1) {
      pendingKey = matches[0]
    }
  }
  return root
}

async function findSteamPath(): Promise<string | null> {
  if (!isWindows) return null
  try {
    const out = await runPowerShell(
      `(Get-ItemProperty -Path 'HKCU:\\Software\\Valve\\Steam' -Name SteamPath -ErrorAction SilentlyContinue).SteamPath`
    )
    if (out) return out.trim()
  } catch {
    // fall through to default guesses
  }
  const guesses = ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam']
  for (const g of guesses) {
    try {
      await fs.access(g)
      return g
    } catch {
      // try next
    }
  }
  return null
}

export async function listGames(): Promise<GameEntry[]> {
  const steamPath = await findSteamPath()
  if (!steamPath) return []

  const libraryFile = path.join(steamPath, 'steamapps', 'libraryfolders.vdf')
  let libraries = [path.join(steamPath, 'steamapps')]
  try {
    const raw = await fs.readFile(libraryFile, 'utf-8')
    const data = parseVdf(raw)
    const folders = data.libraryfolders || {}
    for (const key of Object.keys(folders)) {
      const entry = folders[key]
      if (entry && typeof entry === 'object' && entry.path) {
        libraries.push(path.join(entry.path, 'steamapps'))
      }
    }
    libraries = [...new Set(libraries)]
  } catch {
    // only the default library exists
  }

  const games: GameEntry[] = []
  for (const lib of libraries) {
    let files: string[] = []
    try {
      files = await fs.readdir(lib)
    } catch {
      continue
    }
    for (const f of files) {
      if (!/^appmanifest_\d+\.acf$/.test(f)) continue
      try {
        const raw = await fs.readFile(path.join(lib, f), 'utf-8')
        const data = parseVdf(raw)
        const app = data.AppState
        if (app?.appid && app?.name) {
          games.push({
            appId: app.appid,
            name: app.name,
            installDir: path.join(lib, 'common', app.installdir || app.name)
          })
        }
      } catch {
        // skip unreadable manifest
      }
    }
  }
  return games.sort((a, b) => a.name.localeCompare(b.name))
}

let previousPowerScheme: string | null = null

export async function enableGameBoost(blocklist: string[]): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  try {
    const active = await runPowerShell(
      `(powercfg /getactivescheme) -replace '.*GUID: ([0-9a-fA-F-]+).*','$1'`
    )
    previousPowerScheme = active.trim() || null
  } catch {
    previousPowerScheme = null
  }
  await runPowerShell('powercfg /setactive SCHEME_MIN').catch(() => undefined)

  for (const name of blocklist) {
    const safe = name.replace(/'/g, "''").replace(/\.exe$/i, '')
    await runPowerShell(`Stop-Process -Name '${safe}' -Force -ErrorAction SilentlyContinue`).catch(
      () => undefined
    )
  }
}

export async function disableGameBoost(): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  if (previousPowerScheme) {
    await runPowerShell(`powercfg /setactive ${previousPowerScheme}`).catch(() => undefined)
  } else {
    await runPowerShell('powercfg /setactive SCHEME_BALANCED').catch(() => undefined)
  }
}

export function launchGame(appId: string): string {
  return `steam://run/${appId}`
}
