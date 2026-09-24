import { app } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

export type UpdateState =
  | { status: 'idle' }
  | { status: 'downloading'; version: string }
  | { status: 'ready'; version: string }

let state: UpdateState = { status: 'idle' }

/**
 * Checks the GitHub releases of this repo for a newer version, downloads it in the
 * background and installs it on the next quit. Only runs in the installed app.
 */
export function startAutoUpdates(onChange: (s: UpdateState) => void): void {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-available', (info) => {
    state = { status: 'downloading', version: info.version }
    onChange(state)
  })
  autoUpdater.on('update-downloaded', (info) => {
    state = { status: 'ready', version: info.version }
    onChange(state)
  })
  autoUpdater.on('error', () => {
    // offline or GitHub unreachable: try again at the next check
  })
  const check = (): void => {
    autoUpdater.checkForUpdates().catch(() => undefined)
  }
  check()
  setInterval(check, 60 * 60 * 1000)
}

export function getUpdateState(): UpdateState {
  return state
}

export function installUpdateNow(): void {
  if (state.status === 'ready') autoUpdater.quitAndInstall()
}
