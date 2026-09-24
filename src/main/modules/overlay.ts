import { BrowserWindow, screen } from 'electron'

let win: BrowserWindow | null = null
let menuOpen = false

export function createOverlayWindow(preload: string, load: (w: BrowserWindow) => void): BrowserWindow {
  const { bounds } = screen.getPrimaryDisplay()
  win = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    show: false,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    webPreferences: { preload, sandbox: false }
  })
  win.setAlwaysOnTop(true, 'screen-saver')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setIgnoreMouseEvents(true, { forward: true })
  load(win)
  win.on('closed', () => {
    win = null
  })
  return win
}

export function getOverlayWindow(): BrowserWindow | null {
  return win && !win.isDestroyed() ? win : null
}

export function setOverlayVisible(visible: boolean): void {
  const w = getOverlayWindow()
  if (!w) return
  if (visible) w.showInactive()
  else {
    setMenuOpen(false)
    w.hide()
  }
}

export function isOverlayVisible(): boolean {
  return getOverlayWindow()?.isVisible() ?? false
}

/** While the radial menu is open the overlay takes mouse input; otherwise clicks go to the game. */
export function setMenuOpen(open: boolean): void {
  const w = getOverlayWindow()
  if (!w) return
  menuOpen = open
  if (open) {
    if (!w.isVisible()) w.showInactive()
    w.setFocusable(true)
    w.setIgnoreMouseEvents(false)
    w.focus()
  } else {
    w.setIgnoreMouseEvents(true, { forward: true })
    w.setFocusable(false)
    w.blur()
  }
  w.webContents.send('overlay:menu', open)
}

export function toggleMenu(): void {
  setMenuOpen(!menuOpen)
}
