import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

function subscribe<T>(channel: string, cb: (data: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, data: T): void => cb(data)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api = {
  system: {
    info: () => ipcRenderer.invoke('system:info'),
    getLoginItem: (): Promise<boolean> => ipcRenderer.invoke('app:getLoginItem'),
    setLoginItem: (enabled: boolean): Promise<boolean> => ipcRenderer.invoke('app:setLoginItem', enabled)
  },
  perf: {
    onUpdate: (cb: (data: unknown) => void) => subscribe('perf:update', cb)
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
    onStatus: (cb: (status: unknown) => void) => subscribe('autoclicker:status', cb)
  },
  audio: {
    get: () => ipcRenderer.invoke('audio:get'),
    setVolume: (percent: number) => ipcRenderer.invoke('audio:setVolume', percent),
    setMuted: (muted: boolean) => ipcRenderer.invoke('audio:setMuted', muted)
  },
  games: {
    list: () => ipcRenderer.invoke('games:list'),
    launch: (appId: string) => ipcRenderer.invoke('games:launch', appId),
    boostState: (): Promise<boolean> => ipcRenderer.invoke('games:boostState'),
    boostOn: (blocklist: string[]) => ipcRenderer.invoke('games:boostOn', blocklist),
    boostOff: () => ipcRenderer.invoke('games:boostOff'),
    onBoost: (cb: (active: boolean) => void) => subscribe('boost:changed', cb)
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch: unknown) => ipcRenderer.invoke('settings:update', patch),
    onChanged: (cb: () => void) => subscribe('settings:changed', cb)
  },
  wallpapers: {
    list: () => ipcRenderer.invoke('wallpapers:list'),
    sync: () => ipcRenderer.invoke('wallpapers:sync'),
    addCustom: (): Promise<number> => ipcRenderer.invoke('wallpapers:addCustom'),
    removeCustom: (id: string) => ipcRenderer.invoke('wallpapers:removeCustom', id),
    onChanged: (cb: () => void) => subscribe('wallpapers:changed', cb)
  },
  overlay: {
    setEnabled: (enabled: boolean) => ipcRenderer.invoke('overlay:setEnabled', enabled),
    closeMenu: () => ipcRenderer.invoke('overlay:closeMenu'),
    navigate: (tab: string) => ipcRenderer.invoke('overlay:navigate', tab),
    onMenu: (cb: (open: boolean) => void) => subscribe('overlay:menu', cb)
  },
  nav: {
    onGoto: (cb: (tab: string) => void) => subscribe('nav:goto', cb)
  }
}

export type ZnerolApi = typeof api

contextBridge.exposeInMainWorld('znerol', api)
