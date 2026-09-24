import { app, shell, BrowserWindow, ipcMain, globalShortcut } from 'electron'
import { join } from 'path'
import { is } from './modules/env'
import { startPerfLoop, stopPerfLoop } from './modules/perf'
import { listProcesses, killProcess, setProcessPriority } from './modules/processes'
import {
  listAutostart,
  addAutostartEntry,
  removeAutostartEntry,
  toggleAutostartEntry,
  type AutostartEntry
} from './modules/autostart'
import { clickerEngine, defaultProfiles, type AutoClickerProfile } from './modules/autoclicker'
import { getAudioState, setVolume, setMuted } from './modules/audio'
import { listGames, enableGameBoost, disableGameBoost, launchGame } from './modules/games'
import { isWindows } from './modules/platform'
import { getSettings, updateSettings } from './modules/settings'
import {
  registerWallpaperScheme,
  handleWallpaperProtocol,
  setWallpaperListener,
  listWallpapers,
  syncCommonsWallpapers,
  addCustomWallpapers,
  removeCustomWallpaper
} from './modules/wallpapers'
import {
  createOverlayWindow,
  getOverlayWindow,
  setOverlayVisible,
  isOverlayVisible,
  setMenuOpen,
  toggleMenu
} from './modules/overlay'

import { startAutoUpdates, getUpdateState, installUpdateNow } from './modules/updater'

const PRELOAD = join(__dirname, '../preload/index.mjs')
const MENU_HOTKEY = 'Alt+Q'
const HIDE_HOTKEY = 'Alt+H'

let mainWindow: BrowserWindow | null = null
let registeredHotkey: string | null = null
let boostActive = false

registerWallpaperScheme()

function loadPage(win: BrowserWindow, page: 'index' | 'overlay'): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/${page}.html`)
  } else {
    win.loadFile(join(__dirname, `../renderer/${page}.html`))
  }
}

function allWindows(): BrowserWindow[] {
  return BrowserWindow.getAllWindows()
}

function broadcast(channel: string, payload?: unknown): void {
  for (const w of allWindows()) if (!w.isDestroyed()) w.webContents.send(channel, payload)
}

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0A0B09',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#F2F4EE', height: 44 },
    webPreferences: { preload: PRELOAD, sandbox: false }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })
  mainWindow.on('closed', () => {
    mainWindow = null
    getOverlayWindow()?.close()
  })
  loadPage(mainWindow, 'index')
}

async function createOverlay(): Promise<void> {
  const settings = await getSettings()
  const overlay = createOverlayWindow(PRELOAD, (w) => loadPage(w, 'overlay'))
  overlay.once('ready-to-show', () => {
    if (settings.overlay.enabled) overlay.showInactive()
  })
}

function showMainWindow(tab?: string): void {
  if (!mainWindow) createMainWindow()
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
  if (tab) mainWindow.webContents.send('nav:goto', tab)
}

function registerOverlayHotkeys(): void {
  globalShortcut.register(MENU_HOTKEY, () => toggleMenu())
  globalShortcut.register(HIDE_HOTKEY, async () => {
    const visible = !isOverlayVisible()
    setOverlayVisible(visible)
    await updateSettings({ overlay: { enabled: visible } })
    broadcast('settings:changed')
  })
}

function wireIpc(): void {
  ipcMain.handle('system:info', () => ({
    isWindows,
    platform: process.platform,
    hotkeys: { menu: MENU_HOTKEY, hide: HIDE_HOTKEY }
  }))

  ipcMain.handle('processes:list', () => listProcesses())
  ipcMain.handle('processes:kill', (_e, pid: number) => killProcess(pid))
  ipcMain.handle('processes:setPriority', (_e, pid: number, level: any) =>
    setProcessPriority(pid, level)
  )

  ipcMain.handle('autostart:list', (): Promise<AutostartEntry[]> => listAutostart())
  ipcMain.handle('autostart:add', (_e, name: string, command: string) =>
    addAutostartEntry(name, command)
  )
  ipcMain.handle('autostart:remove', (_e, entry: AutostartEntry) => removeAutostartEntry(entry))
  ipcMain.handle('autostart:toggle', (_e, entry: AutostartEntry, enable: boolean) =>
    toggleAutostartEntry(entry, enable)
  )
  ipcMain.handle('app:getLoginItem', () => app.getLoginItemSettings().openAtLogin)
  ipcMain.handle('app:setLoginItem', (_e, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return app.getLoginItemSettings().openAtLogin
  })

  clickerEngine.setStatusListener((status) => broadcast('autoclicker:status', status))
  ipcMain.handle('autoclicker:defaultProfiles', () => defaultProfiles)
  ipcMain.handle('autoclicker:start', (_e, profile: AutoClickerProfile) =>
    clickerEngine.start(profile)
  )
  ipcMain.handle('autoclicker:stop', () => clickerEngine.stop())
  ipcMain.handle('autoclicker:status', () => clickerEngine.getStatus())
  ipcMain.handle('autoclicker:setHotkey', (_e, accelerator: string, profile: AutoClickerProfile) => {
    if (registeredHotkey) {
      globalShortcut.unregister(registeredHotkey)
      registeredHotkey = null
    }
    if (!accelerator || accelerator === MENU_HOTKEY || accelerator === HIDE_HOTKEY) return false
    const ok = globalShortcut.register(accelerator, () => {
      if (clickerEngine.getStatus().running) clickerEngine.stop()
      else clickerEngine.start(profile).catch(() => undefined)
    })
    if (ok) registeredHotkey = accelerator
    return ok
  })

  ipcMain.handle('audio:get', () => getAudioState())
  ipcMain.handle('audio:setVolume', (_e, percent: number) => setVolume(percent))
  ipcMain.handle('audio:setMuted', (_e, muted: boolean) => setMuted(muted))

  ipcMain.handle('games:list', () => listGames())
  ipcMain.handle('games:launch', (_e, appId: string) => shell.openExternal(launchGame(appId)))
  ipcMain.handle('games:boostState', () => boostActive)
  ipcMain.handle('games:boostOn', async (_e, blocklist: string[]) => {
    await enableGameBoost(blocklist)
    boostActive = true
    broadcast('boost:changed', true)
  })
  ipcMain.handle('games:boostOff', async () => {
    await disableGameBoost()
    boostActive = false
    broadcast('boost:changed', false)
  })

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:update', async (_e, patch) => {
    const next = await updateSettings(patch)
    broadcast('settings:changed')
    return next
  })

  ipcMain.handle('wallpapers:list', () => listWallpapers())
  ipcMain.handle('wallpapers:sync', () => syncCommonsWallpapers(true))
  ipcMain.handle('wallpapers:addCustom', () => addCustomWallpapers(mainWindow))
  ipcMain.handle('wallpapers:removeCustom', (_e, id: string) => removeCustomWallpaper(id))

  ipcMain.handle('update:state', () => getUpdateState())
  ipcMain.handle('update:install', () => installUpdateNow())

  ipcMain.handle('overlay:setEnabled', async (_e, enabled: boolean) => {
    setOverlayVisible(enabled)
    await updateSettings({ overlay: { enabled } })
    broadcast('settings:changed')
  })
  ipcMain.handle('overlay:closeMenu', () => setMenuOpen(false))
  ipcMain.handle('overlay:navigate', (_e, tab: string) => {
    setMenuOpen(false)
    showMainWindow(tab)
  })
}

app.whenReady().then(async () => {
  handleWallpaperProtocol()
  setWallpaperListener(allWindows)
  wireIpc()
  createMainWindow()
  await createOverlay()
  registerOverlayHotkeys()
  startPerfLoop(allWindows)
  syncCommonsWallpapers().catch(() => undefined)
  startAutoUpdates((s) => broadcast('update:changed', s))

  app.on('activate', () => {
    if (!mainWindow) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  stopPerfLoop()
  clickerEngine.dispose()
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  clickerEngine.dispose()
})
