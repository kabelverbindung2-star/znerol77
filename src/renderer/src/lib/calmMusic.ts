import { useEffect, useState } from 'react'
import { loadMedia } from './useMedia'
import type { MediaItem } from './types'

/**
 * One music player for the whole window, so it keeps playing while you switch tabs
 * and during rest mode (the main window is only hidden then, not closed).
 */
interface State {
  list: MediaItem[]
  index: number
  playing: boolean
  volume: number
  error: string | null
}

const VOLUME_KEY = 'znerol.calmMusic.volume'
let audio: HTMLAudioElement | null = null
let failures = 0
let order: number[] = []
let state: State = { list: [], index: 0, playing: false, volume: readVolume(), error: null }
const listeners = new Set<(s: State) => void>()

function readVolume(): number {
  try {
    const v = Number(localStorage.getItem(VOLUME_KEY))
    return v > 0 && v <= 1 ? v : 0.5
  } catch {
    return 0.5
  }
}

function emit(patch: Partial<State>): void {
  state = { ...state, ...patch }
  for (const l of listeners) l(state)
}

function shuffle(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

async function ensure(): Promise<HTMLAudioElement | null> {
  if (state.list.length === 0) {
    const { music } = await loadMedia()
    if (music.length === 0) {
      emit({ error: 'Keine Musik geladen (keine Internetverbindung?)' })
      return null
    }
    order = shuffle(music.length)
    emit({ list: music, index: order[0], error: null })
  }
  if (!audio) {
    audio = new Audio()
    audio.preload = 'auto'
    audio.volume = state.volume
    audio.addEventListener('ended', () => void next())
    audio.addEventListener('play', () => emit({ playing: true, error: null }))
    audio.addEventListener('playing', () => {
      failures = 0
    })
    audio.addEventListener('pause', () => emit({ playing: false }))
    // a file that cannot be played is skipped instead of stopping the music
    audio.addEventListener('error', () => {
      failures += 1
      if (failures >= 5) {
        failures = 0
        audio!.autoplay = false
        emit({ playing: false, error: 'Musik lässt sich gerade nicht laden (Internet?)' })
      } else if (audio?.autoplay) void next()
    })
  }
  return audio
}

async function playIndex(i: number): Promise<void> {
  const a = await ensure()
  if (!a) return
  const track = state.list[i]
  if (!track) return
  emit({ index: i })
  a.autoplay = true
  a.src = track.url
  try {
    await a.play()
  } catch {
    emit({ playing: false })
  }
}

export async function play(): Promise<void> {
  const a = await ensure()
  if (!a) return
  if (!a.src) return playIndex(state.index)
  try {
    await a.play()
  } catch {
    emit({ playing: false })
  }
}

export function pause(): void {
  audio?.pause()
}

export async function toggle(): Promise<void> {
  if (state.playing) pause()
  else await play()
}

function step(dir: 1 | -1): number {
  const pos = order.indexOf(state.index)
  return order[(pos + dir + order.length) % order.length] ?? 0
}

export async function next(): Promise<void> {
  await ensure()
  if (state.list.length) await playIndex(step(1))
}

export async function prev(): Promise<void> {
  await ensure()
  if (state.list.length) await playIndex(step(-1))
}

export async function playTrack(i: number): Promise<void> {
  await playIndex(i)
}

export function setVolume(v: number): void {
  const vol = Math.max(0, Math.min(1, v))
  if (audio) audio.volume = vol
  try {
    localStorage.setItem(VOLUME_KEY, String(vol))
  } catch {
    // private storage off: volume just is not remembered
  }
  emit({ volume: vol })
}

export function useCalmMusic(): State & { current: MediaItem | null } {
  const [s, setS] = useState(state)
  useEffect(() => {
    listeners.add(setS)
    // show the list (titles) before the first play
    if (state.list.length === 0) {
      loadMedia().then(({ music }) => {
        if (state.list.length === 0 && music.length) {
          order = shuffle(music.length)
          emit({ list: music, index: order[0] })
        }
      })
    }
    return () => {
      listeners.delete(setS)
    }
  }, [])
  return { ...s, current: s.list[s.index] ?? null }
}

export async function playTrackById(id: string): Promise<void> {
  await ensure()
  const i = state.list.findIndex((t) => t.id === id)
  if (i >= 0) await playIndex(i)
}

// ---------- one player for all windows ----------
// The music plays in the main window. The second screen and the rest screens send their
// button presses there, so there is never a second player running at the same time.
export type MusicCommand = 'toggle' | 'next' | 'prev' | 'play' | 'pause' | 'track'
let owner = false

export function setOwner(isOwner: boolean): void {
  owner = isOwner
}

export function isOwner(): boolean {
  return owner
}

export function runCommand(cmd: MusicCommand, id?: string): void {
  if (cmd === 'toggle') void toggle()
  else if (cmd === 'next') void next()
  else if (cmd === 'prev') void prev()
  else if (cmd === 'play') void play()
  else if (cmd === 'pause') pause()
  else if (cmd === 'track' && id) void playTrackById(id)
}

/** Use this from any window: plays here if this is the main window, otherwise asks the main window. */
export function command(cmd: MusicCommand, id?: string): void {
  if (owner) runCommand(cmd, id)
  else window.znerol.music.command(cmd, id)
}
