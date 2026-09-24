import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

const api = {
  system: {
    info: () => ipcRenderer.invoke('system:info'),
    isDarkTheme: () => ipcRenderer.invoke('theme:isDark')
  },
  perf: {
    onUpdate: (cb: (data: unknown) => void) => {
      const listener = (_e: IpcRendererEvent, data: unknown) => cb(data)
      ipcRenderer.on('perf:update', listener)
      return () => {
        ipcRenderer.removeListener('perf:update', listener)
      }
    }
  },
  processes: {
    list: () => ipcRenderer.invoke('processes:list'),
    kill: (pid: number) => ipcRenderer.invoke('processes:kill', pid),
    setPriority: (pid: number, level: string) =>
      ipcRenderer.invoke('processes:setPriority', pid, level)
  },
  autostart: {
    list: () => ipcRenderer.invoke('autostart:list'),
    add: (name: string, command: string) => ipcRenderer.invoke('autostart:add', name, command),
    remove: (entry: unknown) => ipcRenderer.invoke('autostart:remove', entry),
    toggle: (entry: unknown, enable: boolean) =>
      ipcRenderer.invoke('autostart:toggle', entry, enable)
  },
  autoclicker: {
    defaultProfiles: () => ipcRenderer.invoke('autoclicker:defaultProfiles'),
    start: (profile: unknown) => ipcRenderer.invoke('autoclicker:start', profile),
    stop: () => ipcRenderer.invoke('autoclicker:stop'),
    status: () => ipcRenderer.invoke('autoclicker:status'),
    setHotkey: (accelerator: string, profile: unknown) =>
      ipcRenderer.invoke('autoclicker:setHotkey', accelerator, profile),
    onStatus: (cb: (status: unknown) => void) => {
      const listener = (_e: IpcRendererEvent, data: unknown) => cb(data)
      ipcRenderer.on('autoclicker:status', listener)
      return () => {
        ipcRenderer.removeListener('autoclicker:status', listener)
      }
    }
  },
  audio: {
    get: () => ipcRenderer.invoke('audio:get'),
    setVolume: (percent: number) => ipcRenderer.invoke('audio:setVolume', percent),
    setMuted: (muted: boolean) => ipcRenderer.invoke('audio:setMuted', muted)
  },
  games: {
    list: () => ipcRenderer.invoke('games:list'),
    launch: (appId: string) => ipcRenderer.invoke('games:launch', appId),
    boostOn: (blocklist: string[]) => ipcRenderer.invoke('games:boostOn', blocklist),
    boostOff: () => ipcRenderer.invoke('games:boostOff')
  }
}

export type ZnerolApi = typeof api

contextBridge.exposeInMainWorld('znerol', api)
