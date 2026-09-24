import { BrowserWindow, screen } from 'electron'

let win: BrowserWindow | null = null
let ready: Promise<BrowserWindow> | null = null
let menuOpen = false
let pinned = false // the user wants the overlay visible all the time
let toastTimer: ReturnType<typeof setTimeout> | null = null

/** The overlay window is only created when something needs it (saves a full-screen renderer). */
export function ensureOverlay(preload: string, load: (w: BrowserWindow) => void): Promise<BrowserWindow> {
  if (win && !win.isDestroyed() && ready) return ready
  const { bounds } = screen.getPrimaryDisplay()
  const w = new BrowserWindow({
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
    webPreferences: { preload, sandbox: false, backgroundThrottling: true }
  })
  w.setAlwaysOnTop(true, 'screen-saver')
  w.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  // no { forward: true }: forwarding installs a system-wide mouse hook that made the cursor lag
  w.setIgnoreMouseEvents(true)
  win = w
  ready = new Promise((resolve) => w.webContents.once('did-finish-load', () => resolve(w)))
  w.on('closed', () => {
    win = null
    ready = null
  })
  load(w)
  return ready
}

export function getOverlayWindow(): BrowserWindow | null {
  return win && !win.isDestroyed() ? win : null
}

function hideIfIdle(): void {
  const w = getOverlayWindow()
  if (w && !pinned && !menuOpen && !toastTimer) w.hide()
}

export function setOverlayVisible(visible: boolean): void {
  pinned = visible
  const w = getOverlayWindow()
  if (!w) return
  w.webContents.send('overlay:pinned', visible)
  if (visible) w.showInactive()
  else {
    setMenuOpen(false)
    hideIfIdle()
  }
}

export function isOverlayVisible(): boolean {
  return pinned
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
    w.setIgnoreMouseEvents(true)
    w.setFocusable(false)
    w.blur()
  }
  w.webContents.send('overlay:menu', open)
  if (!open) hideIfIdle()
}

export function isMenuOpen(): boolean {
  return menuOpen
}

/** Short on-screen message (e.g. "Audio: Kopfhörer"), works even when the overlay is off. */
export function showToast(toast: { title: string; sub?: string }): void {
  const w = getOverlayWindow()
  if (!w) return
  if (!w.isVisible()) w.showInactive()
  w.webContents.send('overlay:pinned', pinned)
  w.webContents.send('overlay:toast', toast)
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastTimer = null
    hideIfIdle()
  }, 2600)
}
