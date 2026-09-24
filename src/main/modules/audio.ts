import { winHelper } from './winhelper'
import { isWindows } from './platform'

export interface AudioDevice {
  id: string
  name: string
  isDefault: boolean
}

export interface AudioState {
  volume: number // 0-100
  muted: boolean
  devices: AudioDevice[]
}

export interface AudioSession {
  pid: number
  process: string
  name: string
  system: boolean
  active: boolean
  peak: number // 0-1, current output level
  volume: number
  muted: boolean
}

export interface MediaInfo {
  app: string
  title: string
  artist: string
  album: string
  status: string // Playing | Paused | Stopped | ...
  canNext: boolean
  canPrev: boolean
  art: string | null
}

function requireWindows(): void {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
}

export async function getAudioState(): Promise<AudioState> {
  if (!isWindows) return { volume: 0, muted: false, devices: [] }
  const [master, devices] = await Promise.all([
    winHelper.request<{ volume: number; muted: boolean }>('master', {}, 30000),
    winHelper.request<AudioDevice[]>('devices', {}, 30000)
  ])
  return { ...master, devices }
}

export async function setVolume(percent: number): Promise<void> {
  requireWindows()
  await winHelper.request('setMasterVolume', { arg: Math.round(percent) })
}

export async function setMuted(muted: boolean): Promise<void> {
  requireWindows()
  await winHelper.request('setMasterMute', { arg: muted })
}

export async function setDefaultDevice(id: string): Promise<void> {
  requireWindows()
  await winHelper.request('setDefault', { arg: id })
}

/** Switches to the next active output device and returns it. */
export async function cycleDevice(): Promise<{ id: string; name: string; count: number } | null> {
  requireWindows()
  return winHelper.request('cycle', {}, 30000)
}

export async function listSessions(): Promise<AudioSession[]> {
  if (!isWindows) return []
  return winHelper.request<AudioSession[]>('sessions', {}, 30000)
}

export async function setSessionMute(pid: number, muted: boolean): Promise<void> {
  requireWindows()
  await winHelper.request('sessionMute', { pid, arg: muted })
}

export async function setSessionVolume(pid: number, percent: number): Promise<void> {
  requireWindows()
  await winHelper.request('sessionVolume', { pid, arg: Math.round(percent) })
}

export async function getMedia(): Promise<MediaInfo | null> {
  if (!isWindows) return null
  return winHelper.request<MediaInfo | null>('media', {}, 30000)
}

export async function mediaControl(action: 'next' | 'prev' | 'toggle'): Promise<void> {
  requireWindows()
  await winHelper.request('mediaControl', { arg: action }, 15000)
}
