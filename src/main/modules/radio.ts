import { app, net } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { STATIONS, GENRES } from './radio-list'

/** A playable radio station from the free Radio Browser directory (radio-browser.info). */
export interface Station {
  id: string
  name: string
  genre: string
  url: string
  logo: string
  info: string // e.g. "MP3 · 128 kbit/s · Germany"
  homepage: string
}

const USER_AGENT = 'ZnerolMonitor/2.2 (https://github.com/kabelverbindung2-star/znerol77)'
// several mirrors of the same directory; if one is down the next one answers
const SERVERS = ['de1.api.radio-browser.info', 'de2.api.radio-browser.info', 'fi1.api.radio-browser.info', 'nl1.api.radio-browser.info']
const MAX_AGE_MS = 24 * 60 * 60 * 1000
const cacheFile = (): string => path.join(app.getPath('userData'), 'radio.json')

let memory: Station[] | null = null

async function api(pathAndQuery: string): Promise<any[]> {
  let lastError: unknown = null
  for (const host of SERVERS) {
    try {
      const res = await net.fetch(`https://${host}/json/${pathAndQuery}`, { headers: { 'User-Agent': USER_AGENT } })
      if (res.ok) return (await res.json()) as any[]
      lastError = new Error(`HTTP ${res.status}`)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError ?? new Error('Radio-Verzeichnis nicht erreichbar')
}

function toStation(x: any, name?: string, genre?: string): Station | null {
  const url = String(x.url_resolved || x.url || '')
  if (!/^https?:\/\//.test(url)) return null
  const parts = [x.codec, x.bitrate ? `${x.bitrate} kbit/s` : '', x.country].filter(Boolean)
  return {
    id: String(x.stationuuid),
    name: name ?? String(x.name).trim().slice(0, 60),
    genre: genre ?? String(x.tags ?? '').split(',')[0] ?? '',
    url,
    logo: /^https:\/\//.test(x.favicon ?? '') ? x.favicon : '',
    info: parts.join(' · '),
    homepage: /^https?:\/\//.test(x.homepage ?? '') ? x.homepage : ''
  }
}

/** The hand-picked stations (looked up by name, so changed stream addresses still work). */
export async function listStations(force = false): Promise<Station[]> {
  if (memory && !force) return memory
  try {
    const cached = JSON.parse(await fs.readFile(cacheFile(), 'utf-8'))
    if (!force && Date.now() - cached.at < MAX_AGE_MS && cached.count === STATIONS.length && cached.stations.length) {
      memory = cached.stations as Station[]
      return memory
    }
  } catch {
    // no cache yet
  }
  const out: Station[] = []
  for (const pick of STATIONS) {
    try {
      const q = new URLSearchParams({ name: pick.search, order: 'clickcount', reverse: 'true', limit: '5', hidebroken: 'true' })
      const found = await api(`stations/search?${q}`)
      const s = found.map((x) => toStation(x, pick.name, pick.genre)).find(Boolean)
      if (s) out.push(s)
    } catch {
      // one station missing is fine
    }
  }
  if (out.length) {
    memory = out
    await fs.writeFile(cacheFile(), JSON.stringify({ at: Date.now(), count: STATIONS.length, stations: out }), 'utf-8').catch(() => undefined)
  }
  return out
}

/** Search the whole directory by name or by genre tag. */
export async function searchStations(query: string, tag?: string): Promise<Station[]> {
  const q = new URLSearchParams({ order: 'clickcount', reverse: 'true', limit: '40', hidebroken: 'true' })
  if (tag) q.set('tag', tag)
  if (query.trim()) q.set('name', query.trim())
  const found = await api(`stations/search?${q}`)
  const seen = new Set<string>()
  return found
    .map((x) => toStation(x))
    .filter((s): s is Station => !!s && !seen.has(s.name.toLowerCase()) && (seen.add(s.name.toLowerCase()), true))
}

export function genres(): { label: string; tag: string }[] {
  return GENRES
}

/** The directory counts plays to rank popular stations; we tell it when a station is started. */
export function reportPlay(id: string): void {
  if (!/^[0-9a-f-]{36}$/.test(id)) return
  api(`url/${id}`).catch(() => undefined)
}
