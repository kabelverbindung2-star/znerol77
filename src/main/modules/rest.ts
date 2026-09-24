import { BrowserWindow, globalShortcut, powerSaveBlocker, screen } from 'electron'
import { winHelper } from './winhelper'
import { isWindows } from './platform'
import { withTimeout } from './perf'

// Windows 11 power modes (Settings > System > Power > Power mode)
const BEST_EFFICIENCY = '961cc777-2547-4f9d-8174-7d86181b8a7a'

interface RestDeps {
  preload: string
  load: (w: BrowserWindow, query: Record<string, string>) => void
  /** app windows to hide while resting (main window, second screen) */
  appWindows: () => BrowserWindow[]
  onStart: () => void
  onStop: () => void
}

let windows: BrowserWindow[] = []
let blocker: number | null = null
let previousPowerMode: string | null = null
let hidden: BrowserWindow[] = []
let deps: RestDeps | null = null
let stopping = false

export function isResting(): boolean {
  return windows.length > 0
}

/**
 * Rest mode: every monitor shows a calm clock screen (one update per second, no animation),
 * the displays stay on, other apps are minimised and Windows switches to its most
 * efficient power mode. Everything is restored when it ends.
 */
export async function startRest(d: RestDeps): Promise<{ powerMode: boolean; minimized: number }> {
  if (isResting()) return { powerMode: previousPowerMode !== null, minimized: 0 }
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

  hidden = d.appWindows().filter((w) => !w.isDestroyed() && w.isVisible())
  for (const w of hidden) w.hide()

  blocker = powerSaveBlocker.start('prevent-display-sleep')
  d.onStart()

  const cursor = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const displays = screen.getAllDisplays().sort((a, b) => (a.id === cursor.id ? -1 : b.id === cursor.id ? 1 : 0))
  windows = displays.map((display, i) => {
    const w = new BrowserWindow({
      ...display.bounds,
      frame: false,
      show: false,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      backgroundColor: '#000000',
      webPreferences: { preload: d.preload, sandbox: false }
    })
    w.setAlwaysOnTop(true, 'screen-saver')
    w.once('ready-to-show', () => {
      w.setBounds(display.bounds)
      if (i === 0) w.show()
      else w.showInactive()
      w.setFullScreen(true)
    })
    w.on('closed', () => {
      if (!stopping) stopRest().catch(() => undefined)
    })
    d.load(w, { rest: String(i) })
    return w
  })

  if (!globalShortcut.isRegistered('Escape')) globalShortcut.register('Escape', () => void stopRest())
  return { powerMode, minimized }
}

export async function stopRest(): Promise<void> {
  if (!isResting() || stopping) return
  stopping = true
  const toClose = windows
  windows = []
  for (const w of toClose) if (!w.isDestroyed()) w.close()
  if (globalShortcut.isRegistered('Escape')) globalShortcut.unregister('Escape')
  if (blocker !== null && powerSaveBlocker.isStarted(blocker)) powerSaveBlocker.stop(blocker)
  blocker = null

  for (const w of hidden) if (!w.isDestroyed()) w.show()
  hidden = []
  deps?.onStop()

  if (isWindows) {
    if (previousPowerMode) await withTimeout(winHelper.request('setPowerMode', { arg: previousPowerMode }, 5000), 5000, null)
    previousPowerMode = null
    await withTimeout(winHelper.request('restoreMinimized', {}, 8000), 8000, null)
  }
  stopping = false
}

/** Monitors off, PC keeps running. Short delay so the click that asked for it does not wake them again. */
export function displayOff(): void {
  if (!isWindows) return
  setTimeout(() => {
    winHelper.send('monitorOff').catch(() => undefined)
  }, 700)
}
