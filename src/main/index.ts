import { app, shell, BrowserWindow, ipcMain, globalShortcut, nativeTheme } from 'electron'
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

let mainWindow: BrowserWindow | null = null
let registeredHotkey: string | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0d1117',
    titleBarStyle: 'default',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  startPerfLoop(() => mainWindow)
}

function wireIpc(): void {
  ipcMain.handle('system:info', () => ({
    isWindows,
    platform: process.platform,
    versions: process.versions
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

  clickerEngine.setStatusListener((status) => {
    mainWindow?.webContents.send('autoclicker:status', status)
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
    if (!accelerator) return true
    const ok = globalShortcut.register(accelerator, () => {
      const status = clickerEngine.getStatus()
      if (status.running) clickerEngine.stop()
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
  ipcMain.handle('games:boostOn', (_e, blocklist: string[]) => enableGameBoost(blocklist))
  ipcMain.handle('games:boostOff', () => disableGameBoost())

  ipcMain.handle('theme:isDark', () => nativeTheme.shouldUseDarkColors)
}

app.whenReady().then(() => {
  wireIpc()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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
