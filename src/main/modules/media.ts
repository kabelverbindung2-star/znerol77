import { app, net } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { NATURE_VIDEOS, CALM_MUSIC } from './media-list'

/**
 * Free nature videos (rest mode, optional background) and calm music, all from Wikimedia
 * Commons. The lists are hand-picked titles; here they are turned into playable URLs plus
 * author/licence, and cached for a week. Files are streamed, not downloaded, so nothing
 * piles up on the disk.
 */
export interface MediaItem {
  id: string
  kind: 'video' | 'music'
  title: string
  artist: string
  license: string
  licenseUrl: string
  descriptionUrl: string
  duration: number
  url: string
  thumb?: string // small still picture (videos)
}

const API = 'https://commons.wikimedia.org/w/api.php'
const USER_AGENT = 'ZnerolMonitor/2.2 (https://github.com/kabelverbindung2-star/znerol77)'
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const CACHE_VERSION = 2

const cacheFile = (): string => path.join(app.getPath('userData'), 'media.json')

let memory: { videos: MediaItem[]; music: MediaItem[] } | null = null
let loading: Promise<{ videos: MediaItem[]; music: MediaItem[] }> | null = null

function strip(s: unknown): string {
  return String(s ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function niceTitle(fileTitle: string): string {
  return fileTitle
    .replace(/^File:/, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s*\((video|cropped)\)/gi, '')
    .trim()
}

function pickVideoUrl(v: any): string | null {
  const derivs: any[] = v.derivatives ?? []
  // VP9 1080p transcode: sharp, and every Chromium plays it (Theora/.ogv originals it does not)
  const hd = derivs.find((d) => d.transcodekey === '1080p.vp9.webm') ?? derivs.find((d) => d.transcodekey === '720p.vp9.webm')
  if (hd?.src) return hd.src
  if (v.mime === 'video/webm' && v.url) return v.url
  return null
}

function pickAudioUrl(v: any): string | null {
  if (/^audio\/(mpeg|ogg|opus|flac|wav|webm|x-flac)$/.test(v.mime ?? '') && v.url) return v.url
  if (v.mime === 'application/ogg' && v.url) return v.url
  const derivs: any[] = v.derivatives ?? []
  const d = derivs.find((x) => x.transcodekey === 'mp3') ?? derivs.find((x) => x.transcodekey === 'ogg')
  return d?.src ?? null
}

async function resolve(titles: string[], kind: MediaItem['kind']): Promise<MediaItem[]> {
  const byTitle = new Map<string, MediaItem>()
  const renamed = new Map<string, string>() // how Commons spells a title we asked for
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40).map((t) => `File:${t}`)
    const url =
      `${API}?action=query&format=json&prop=videoinfo` +
      '&viprop=url%7Csize%7Cmime%7Cextmetadata%7Cderivatives&viurlwidth=320' +
      `&titles=${encodeURIComponent(batch.join('|'))}`
    const res = await net.fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`Commons ${res.status}`)
    const data: any = await res.json()
    for (const n of data?.query?.normalized ?? []) renamed.set(n.from, n.to)
    for (const page of Object.values<any>(data?.query?.pages ?? {})) {
      const item = toItem(page, kind)
      if (item) byTitle.set(page.title, item)
    }
  }
  // keep the order of the hand-picked list (the API answers in its own order)
  return titles
    .map((t) => {
      const asked = `File:${t}`
      return byTitle.get(renamed.get(asked) ?? asked)
    })
    .filter((x): x is MediaItem => !!x)
}

function toItem(page: any, kind: MediaItem['kind']): MediaItem | null {
  const v = page.videoinfo?.[0]
  if (!v) return null
  const src = kind === 'video' ? pickVideoUrl(v) : pickAudioUrl(v)
  if (!src) return null
  const meta = v.extmetadata ?? {}
  return {
    id: `${kind}:${page.pageid}`,
    kind,
    title: strip(meta.ObjectName?.value) || niceTitle(page.title),
    artist: strip(meta.Artist?.value) || 'Unbekannt',
    license: strip(meta.LicenseShortName?.value),
    licenseUrl: strip(meta.LicenseUrl?.value),
    descriptionUrl: v.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
    duration: Math.round(v.duration ?? 0),
    url: src,
    thumb: kind === 'video' && typeof v.thumburl === 'string' ? v.thumburl : undefined
  }
}

async function readCache(): Promise<{ at: number; videos: MediaItem[]; music: MediaItem[] } | null> {
  try {
    const c = JSON.parse(await fs.readFile(cacheFile(), 'utf-8'))
    if (c.version !== CACHE_VERSION || c.listSize !== NATURE_VIDEOS.length + CALM_MUSIC.length) return null
    return c
  } catch {
    return null
  }
}

export function getMedia(force = false): Promise<{ videos: MediaItem[]; music: MediaItem[] }> {
  if (memory && !force) return Promise.resolve(memory)
  if (loading) return loading
  loading = (async () => {
    const cached = await readCache()
    if (cached && !force && Date.now() - cached.at < MAX_AGE_MS && cached.videos.length > 0) {
      memory = { videos: cached.videos, music: cached.music }
      return memory
    }
    try {
      const [videos, music] = await Promise.all([resolve(NATURE_VIDEOS, 'video'), resolve(CALM_MUSIC, 'music')])
      memory = { videos, music }
      await fs.writeFile(
        cacheFile(),
        JSON.stringify({ version: CACHE_VERSION, listSize: NATURE_VIDEOS.length + CALM_MUSIC.length, at: Date.now(), videos, music }),
        'utf-8'
      )
      return memory
    } catch {
      // offline: an older list still plays whatever the browser cache has
      return cached ? { videos: cached.videos, music: cached.music } : { videos: [], music: [] }
    }
  })().finally(() => {
    loading = null
  })
  return loading
}
