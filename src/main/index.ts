import { app, shell, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron'
import { join } from 'path'
import { is } from './modules/env'
import { startPerfLoop, stopPerfLoop, restartPerfLoop, startSystemQueries, stopSystemQueries } from './modules/perf'
import { listProcesses, killProcess, setProcessPriority } from './modules/processes'
import {
  listAutostart,
  addAutostartEntry,
  removeAutostartEntry,
  toggleAutostartEntry,
  revealAutostart,
  autostartIcons,
  type AutostartEntry
} from './modules/autostart'
import { listSketches, getSketch, saveSketch, deleteSketch, type Sketch } from './modules/sketches'
import { clickerEngine, defaultProfiles, type AutoClickerProfile } from './modules/autoclicker'
import {
  getAudioState,
  setVolume,
  setMuted,
  setDefaultDevice,
  cycleDevice,
  listSessions,
  setSessionMute,
  setSessionVolume,
  getMedia,
  mediaControl
} from './modules/audio'
import { searchPlaces, getWeather } from './modules/weather'
import { winHelper } from './modules/winhelper'
import { listGames, enableGameBoost, disableGameBoost, launchGame } from './modules/games'
import { isWindows } from './modules/platform'
import { getSettings, updateSettings, type Settings } from './modules/settings'
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
  ensureOverlay,
  getOverlayWindow,
  setOverlayVisible,
  isOverlayVisible,
  setMenuOpen,
  isMenuOpen,
  showToast
} from './modules/overlay'
import { startAutoUpdates, getUpdateState, installUpdateNow, checkForUpdatesNow } from './modules/updater'

const PRELOAD = join(__dirname, '../preload/index.mjs')
const MENU_HOTKEY = 'Alt+Q'
const HIDE_HOTKEY = 'Alt+H'

let mainWindow: BrowserWindow | null = null
let registeredHotkey: string | null = null
let audioHotkey: string | null = null
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

/** "Transparent" background = Windows 11 acrylic material behind the page. */
function applyAppearance(settings: Settings): void {
  if (!mainWindow || process.platform !== 'win32') return
  const transparent = settings.appearance.background === 'transparent' && settings.appearance.style === 'glass'
  try {
    mainWindow.setBackgroundMaterial(transparent ? 'acrylic' : 'none')
    mainWindow.setBackgroundColor(transparent ? '#00000000' : '#0A0B09')
  } catch {
    // Windows 10 / older Electron: stays opaque, the page shows its own background
  }
}

function overlay(): Promise<BrowserWindow> {
  return ensureOverlay(PRELOAD, (w) => loadPage(w, 'overlay'))
}

async function setOverlayEnabled(enabled: boolean): Promise<void> {
  if (enabled) await overlay()
  setOverlayVisible(enabled)
  await updateSettings({ overlay: { enabled } })
  broadcast('settings:changed')
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
  globalShortcut.register(MENU_HOTKEY, async () => {
    await overlay()
    setMenuOpen(!isMenuOpen())
  })
  globalShortcut.register(HIDE_HOTKEY, () => {
    setOverlayEnabled(!isOverlayVisible()).catch(() => undefined)
  })
}

async function switchAudioDevice(): Promise<void> {
  try {
    const next = await cycleDevice()
    await overlay()
    if (next) showToast({ title: next.name, sub: next.count > 1 ? 'Audioausgabe gewechselt' : 'Nur ein Ausgabegerät aktiv' })
    broadcast('audio:changed')
  } catch (e) {
    await overlay()
    showToast({ title: 'Audio wechseln fehlgeschlagen', sub: (e as Error).message })
  }
}

/** Registers the hotkey that cycles the output device; returns false if it is taken. */
function registerAudioHotkey(accelerator: string): boolean {
  if (audioHotkey) {
    globalShortcut.unregister(audioHotkey)
    audioHotkey = null
  }
  if (!accelerator) return true
  if ([MENU_HOTKEY, HIDE_HOTKEY, registeredHotkey].includes(accelerator)) return false
  const ok = globalShortcut.register(accelerator, () => {
    switchAudioDevice()
  })
  if (ok) audioHotkey = accelerator
  return ok
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
  ipcMain.handle('autostart:reveal', (_e, entry: AutostartEntry) => revealAutostart(entry))
  ipcMain.handle('autostart:icons', (_e, paths: string[]) => autostartIcons(paths))
  ipcMain.handle('autostart:pickFile', async () => {
    const r = await dialog.showOpenDialog(mainWindow!, {
      title: 'Programm für den Autostart wählen',
      properties: ['openFile'],
      filters: [{ name: 'Programme', extensions: ['exe', 'bat', 'cmd', 'lnk'] }]
    })
    return r.canceled ? null : r.filePaths[0]
  })

  ipcMain.handle('sketches:list', () => listSketches())
  ipcMain.handle('sketches:get', (_e, id: string) => getSketch(id))
  ipcMain.handle('sketches:save', (_e, sketch: Sketch) => saveSketch(sketch))
  ipcMain.handle('sketches:delete', (_e, id: string) => deleteSketch(id))

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('app:openExternal', (_e, url: string) => {
    if (/^https:\/\//.test(url)) return shell.openExternal(url)
  })
  ipcMain.handle('app:openDataFolder', () => shell.openPath(app.getPath('userData')))
  ipcMain.handle('update:check', () => checkForUpdatesNow())
  ipcMain.handle('app:getLoginItem', () => app.getLoginItemSettings().openAtLogin)
  ipcMain.handle('app:setLoginItem', (_e, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return app.getLoginItemSettings().openAtLogin
  })

  clickerEngine.setStatusListener((status) => broadcast('autoclicker:status', status))
  // Esc stops a running autoclicker (only registered while it runs, so Esc works normally otherwise)
  clickerEngine.setRunningListener((running) => {
    if (running) {
      if (!globalShortcut.isRegistered('Escape')) globalShortcut.register('Escape', () => clickerEngine.stop())
    } else if (globalShortcut.isRegistered('Escape')) {
      globalShortcut.unregister('Escape')
    }
  })
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
    if (!accelerator || [MENU_HOTKEY, HIDE_HOTKEY, audioHotkey].includes(accelerator)) return false
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
  ipcMain.handle('audio:setDefault', (_e, id: string) => setDefaultDevice(id))
  ipcMain.handle('audio:cycle', () => switchAudioDevice())
  ipcMain.handle('audio:sessions', () => listSessions())
  ipcMain.handle('audio:sessionMute', (_e, pid: number, muted: boolean) => setSessionMute(pid, muted))
  ipcMain.handle('audio:sessionVolume', (_e, pid: number, percent: number) => setSessionVolume(pid, percent))
  ipcMain.handle('audio:media', () => getMedia())
  ipcMain.handle('audio:mediaControl', (_e, action: 'next' | 'prev' | 'toggle') => mediaControl(action))
  ipcMain.handle('audio:setHotkey', async (_e, accelerator: string) => {
    const ok = registerAudioHotkey(accelerator)
    if (ok) {
      await updateSettings({ audio: { switchHotkey: accelerator } })
      broadcast('settings:changed')
    }
    return ok
  })
  ipcMain.handle('audio:hotkeyState', () => audioHotkey)

  ipcMain.handle('weather:search', (_e, query: string) => searchPlaces(query))
  ipcMain.handle('weather:get', (_e, lat: number, lon: number) => getWeather(lat, lon))

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
    const before = await getSettings()
    const oldInterval = before.performance.intervalSec
    const next = await updateSettings(patch)
    if (patch.appearance) applyAppearance(next)
    if (next.performance.intervalSec !== oldInterval) restartPerfLoop(allWindows, next.performance.intervalSec * 1000)
    broadcast('settings:changed')
    return next
  })

  ipcMain.handle('wallpapers:list', () => listWallpapers())
  ipcMain.handle('wallpapers:sync', () => syncCommonsWallpapers(true))
  ipcMain.handle('wallpapers:addCustom', () => addCustomWallpapers(mainWindow))
  ipcMain.handle('wallpapers:removeCustom', (_e, id: string) => removeCustomWallpaper(id))

  ipcMain.handle('update:state', () => getUpdateState())
  ipcMain.handle('update:install', () => installUpdateNow())

  ipcMain.handle('overlay:setEnabled', (_e, enabled: boolean) => setOverlayEnabled(enabled))
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
  startSystemQueries()
  createMainWindow()
  const settings = await getSettings()
  applyAppearance(settings)
  if (settings.overlay.enabled) setOverlayEnabled(true).catch(() => undefined)
  registerOverlayHotkeys()
  registerAudioHotkey(settings.audio.switchHotkey)
  startPerfLoop(allWindows, settings.performance.intervalSec * 1000)
  syncCommonsWallpapers().catch(() => undefined)
  startAutoUpdates((s) => broadcast('update:changed', s))

  app.on('activate', () => {
    if (!mainWindow) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  stopPerfLoop()
  stopSystemQueries()
  winHelper.dispose()
  clickerEngine.dispose()
  globalShortcut.unregisterAll()
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  clickerEngine.dispose()
  winHelper.dispose()
})
