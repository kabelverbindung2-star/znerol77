import { BrowserWindow, screen } from 'electron'
import { isWindows } from './platform'

/**
 * Numbered dots on the screen where the autoclicker will click (click-through,
 * always on top, over all monitors). Positions come in physical pixels.
 */
let win: BrowserWindow | null = null
let latest: { x: number; y: number; n: number }[] = []

function area(): Electron.Rectangle {
  const all = screen.getAllDisplays().map((d) => d.bounds)
  const x = Math.min(...all.map((b) => b.x))
  const y = Math.min(...all.map((b) => b.y))
  return {
    x,
    y,
    width: Math.max(...all.map((b) => b.x + b.width)) - x,
    height: Math.max(...all.map((b) => b.y + b.height)) - y
  }
}

export function showMarkers(
  positions: { x: number; y: number }[],
  preload: string,
  load: (w: BrowserWindow, query: Record<string, string>) => void
): void {
  if (positions.length === 0) {
    hideMarkers()
    return
  }
  const bounds = area()
  // physical pixels -> window coordinates (DIP) inside the covering window
  latest = positions.map((p, i) => {
    const dip = isWindows ? screen.screenToDipPoint({ x: p.x, y: p.y }) : { x: p.x, y: p.y }
    return { x: dip.x - bounds.x, y: dip.y - bounds.y, n: i + 1 }
  })
  if (win && !win.isDestroyed()) {
    win.setBounds(bounds)
    win.webContents.send('markers:update', latest)
    return
  }
  const w = new BrowserWindow({
    ...bounds,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: { preload, sandbox: false }
  })
  w.setAlwaysOnTop(true, 'screen-saver')
  w.setIgnoreMouseEvents(true)
  w.once('ready-to-show', () => {
    w.setBounds(bounds)
    w.showInactive()
    w.webContents.send('markers:update', latest)
  })
  w.on('closed', () => {
    if (win === w) win = null
  })
  load(w, { markers: '1' })
  win = w
}

export function hideMarkers(): void {
  if (win && !win.isDestroyed()) win.destroy()
  win = null
}
