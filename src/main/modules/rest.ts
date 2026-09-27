import { BrowserWindow, globalShortcut, powerSaveBlocker, screen, type Display, type Rectangle } from 'electron'
import { winHelper } from './winhelper'
import { isWindows } from './platform'
import { withTimeout } from './perf'

// Windows 11 power modes (Settings > System > Power > Power mode)
const BEST_EFFICIENCY = '961cc777-2547-4f9d-8174-7d86181b8a7a'

interface RestDeps {
  preload: string
  load: (w: BrowserWindow, query: Record<string, string>) => void
  mainWindow: () => BrowserWindow | null
  secondWindow: () => BrowserWindow | null
  /** give the main window its normal title bar colours back */
  restoreAppearance: () => void
  onStart: () => void
  onStop: () => void
  /** several monitors: one big picture across all of them, or one screen each */
  span: 'one' | 'same' | 'each'
}

/** An app window that shows the rest screen itself instead of a new window (saves a whole renderer). */
interface Host {
  win: BrowserWindow
  bounds: Rectangle
  maximized: boolean
}

let active = false
let extra: BrowserWindow[] = [] // small rest-only windows for monitors without an app window
let hosts: Host[] = []
let blocker: number | null = null
let previousPowerMode: string | null = null
let deps: RestDeps | null = null
let stopping = false

export function isResting(): boolean {
  return active
}

function live(w: BrowserWindow | null): w is BrowserWindow {
  return !!w && !w.isDestroyed()
}

function cover(win: BrowserWindow, display: Display): void {
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setBounds(display.bounds)
  win.setFullScreen(true)
}

/**
 * Rest mode: every monitor shows a calm screen (clock, nature video or still picture),
 * the displays stay on, other apps are minimised and Windows switches to its most
 * efficient power mode. Everything is restored when it ends.
 */
export async function startRest(d: RestDeps): Promise<{ powerMode: boolean; minimized: number }> {
  if (active) return { powerMode: previousPowerMode !== null, minimized: 0 }
  active = true
  deps = d
  stopping = false
  let minimized = 0
  let powerMode = false

  if (isWindows) {
    minimized = Number(await withTimeout(winHelper.request<string>('minimizeOthers', { pid: process.pid }, 8000), 8000, '0')) || 0
    const current = await withTimeout(winHelper.request<string | null>('powerMode', {}, 5000), 5000, null)
    if (current) {
      const ok = await withTimeout(winHelper.request<boolean>('setPowerMode', { arg: BEST_EFFICIENCY }, 5000), 5000, false)
      if (ok) {
        previousPowerMode = current
        powerMode = true
      }
    }
  }

  blocker = powerSaveBlocker.start('prevent-display-sleep')
  d.onStart()

  // the monitor with the main window first: it gets the hint and the keyboard focus
  const main = d.mainWindow()
  const second = d.secondWindow()
  const mainDisplay = live(main) ? screen.getDisplayMatching(main.getBounds()) : screen.getPrimaryDisplay()
  const displays = screen.getAllDisplays().sort((a, b) => (a.id === mainDisplay.id ? -1 : b.id === mainDisplay.id ? 1 : 0))
  const used = new Set<BrowserWindow>()

  // one big rest screen stretched over all monitors (one video, not one per monitor)
  if (d.span === 'one' && displays.length > 1) {
    const union = displays.reduce(
      (u, dsp) => {
        const b = dsp.bounds
        const x = Math.min(u.x, b.x)
        const y = Math.min(u.y, b.y)
        return { x, y, width: Math.max(u.x + u.width, b.x + b.width) - x, height: Math.max(u.y + u.height, b.y + b.height) - y }
      },
      { ...displays[0].bounds }
    )
    const host = live(main) ? main : null
    if (host) {
      used.add(host)
      hosts.push({ win: host, bounds: host.isMaximized() ? host.getNormalBounds() : host.getBounds(), maximized: host.isMaximized() })
      if (host.isMinimized()) host.restore()
      if (host.isMaximized()) host.unmaximize()
      if (!host.isVisible()) host.show()
      try {
        host.setTitleBarOverlay({ color: '#000000', symbolColor: '#000000', height: 44 })
      } catch {
        // frameless window
      }
      host.setAlwaysOnTop(true, 'screen-saver')
      host.setBounds(union)
      host.webContents.send('rest:show', 0)
      host.focus()
    }
    for (const w of [main, second]) if (live(w) && !used.has(w) && w.isVisible()) w.hide()
    globalShortcut.unregister('Escape')
    globalShortcut.register('Escape', () => void stopRest())
    return { powerMode, minimized }
  }

  displays.forEach((display, i) => {
    const host = [main, second].find(
      (w): w is BrowserWindow => live(w) && !used.has(w) && screen.getDisplayMatching(w.getBounds()).id === display.id
    )
    if (host) {
      // an app window already sits on this monitor: it shows the rest screen itself
      used.add(host)
      hosts.push({ win: host, bounds: host.isMaximized() ? host.getNormalBounds() : host.getBounds(), maximized: host.isMaximized() })
      if (host.isMinimized()) host.restore()
      if (!host.isVisible()) host.show()
      try {
        host.setTitleBarOverlay({ color: '#000000', symbolColor: '#000000', height: 44 })
      } catch {
        // frameless window: no Windows buttons to hide
      }
      cover(host, display)
      host.webContents.send('rest:show', d.span === 'same' ? 100 + i : i)
      if (i === 0) host.focus()
      return
    }
    const w = new BrowserWindow({
      ...display.bounds,
      frame: false,
      show: false,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      backgroundColor: '#000000',
      webPreferences: { preload: d.preload, sandbox: false }
    })
    w.once('ready-to-show', () => {
      if (i === 0) w.show()
      else w.showInactive()
      cover(w, display)
    })
    w.on('closed', () => {
      if (!stopping) stopRest().catch(() => undefined)
    })
    d.load(w, { rest: String(d.span === 'same' ? 100 + i : i) })
    extra.push(w)
  })

  // app windows that did not become a rest screen stay out of sight meanwhile
  for (const w of [main, second]) if (live(w) && !used.has(w) && w.isVisible()) w.hide()

  // Esc ends rest mode (takes over the autoclicker's Esc; onStop gives it back)
  globalShortcut.unregister('Escape')
  globalShortcut.register('Escape', () => void stopRest())
  return { powerMode, minimized }
}

export async function stopRest(): Promise<void> {
  if (!active || stopping) return
  stopping = true
  const toClose = extra
  extra = []
  for (const w of toClose) if (!w.isDestroyed()) w.close()

  for (const h of hosts) {
    if (h.win.isDestroyed()) continue
    h.win.webContents.send('rest:hide')
    h.win.setAlwaysOnTop(false)
    h.win.setFullScreen(false)
    h.win.setBounds(h.bounds)
    if (h.maximized) h.win.maximize()
  }
  hosts = []
  for (const w of [deps?.mainWindow() ?? null, deps?.secondWindow() ?? null]) if (live(w) && !w.isVisible()) w.showInactive()
  deps?.restoreAppearance()

  if (globalShortcut.isRegistered('Escape')) globalShortcut.unregister('Escape')
  if (blocker !== null && powerSaveBlocker.isStarted(blocker)) powerSaveBlocker.stop(blocker)
  blocker = null
  active = false
  deps?.onStop()

  if (isWindows) {
    if (previousPowerMode) await withTimeout(winHelper.request('setPowerMode', { arg: previousPowerMode }, 5000), 5000, null)
    previousPowerMode = null
    await withTimeout(winHelper.request('restoreMinimized', {}, 8000), 8000, null)
  }
  const main = deps?.mainWindow() ?? null
  if (live(main)) main.focus()
  stopping = false
}

/** Monitors off, PC keeps running. Short delay so the click that asked for it does not wake them again. */
export function displayOff(): void {
  if (!isWindows) return
  setTimeout(() => {
    winHelper.send('monitorOff').catch(() => undefined)
  }, 700)
}
