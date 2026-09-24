import { app, dialog, net, protocol, type BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

export interface Wallpaper {
  id: string
  source: 'builtin' | 'commons' | 'custom'
  name: string
  /** zwall://… for downloaded/custom files, empty for builtin (renderer draws those) */
  url: string
  credit?: string
}

export const BUILTIN_SCENES = [
  'Bergsee',
  'Wald',
  'Wüste',
  'Nacht',
  'Nebel',
  'Herbst',
  'Fjord',
  'Savanne',
  'Polarlicht'
]

const TARGET_COUNT = 50
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000
const USER_AGENT = 'ZnerolMonitor/2.0 (desktop app; wallpaper download)'
// Wikimedia Commons: featured (community-reviewed, freely licensed) landscape photos.
const COMMONS_API =
  'https://commons.wikimedia.org/w/api.php?action=query&format=json' +
  '&generator=categorymembers&gcmtitle=Category:Featured_pictures_of_landscapes' +
  `&gcmtype=file&gcmlimit=${TARGET_COUNT}` +
  '&prop=imageinfo&iiprop=url%7Cextmetadata%7Cmime&iiurlwidth=1920'

interface CommonsIndex {
  lastAttempt: number
  items: { id: string; file: string; name: string; credit: string }[]
}

const baseDir = (): string => path.join(app.getPath('userData'), 'wallpapers')
const commonsDir = (): string => path.join(baseDir(), 'commons')
const customDir = (): string => path.join(baseDir(), 'custom')
const indexFile = (): string => path.join(commonsDir(), 'index.json')

let syncing = false
let notify: () => void = () => {}

/** Must run before app 'ready'. */
export function registerWallpaperScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: 'zwall', privileges: { standard: true, secure: true, supportFetchAPI: true } }
  ])
}

/** Serves zwall://img/<commons|custom>/<file> from the wallpaper cache, never outside it. */
export function handleWallpaperProtocol(): void {
  protocol.handle('zwall', (request) => {
    const { pathname } = new URL(request.url)
    const target = path.resolve(baseDir(), '.' + decodeURIComponent(pathname))
    if (!target.startsWith(path.resolve(baseDir()) + path.sep)) {
      return new Response('forbidden', { status: 403 })
    }
    return net.fetch(pathToFileURL(target).toString())
  })
}

export function setWallpaperListener(getWindows: () => BrowserWindow[]): void {
  notify = () => {
    for (const w of getWindows()) if (!w.isDestroyed()) w.webContents.send('wallpapers:changed')
  }
}

async function readIndex(): Promise<CommonsIndex> {
  try {
    return JSON.parse(await fs.readFile(indexFile(), 'utf-8'))
  } catch {
    return { lastAttempt: 0, items: [] }
  }
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export async function listWallpapers(): Promise<Wallpaper[]> {
  const builtin: Wallpaper[] = BUILTIN_SCENES.map((n) => ({
    id: `builtin:${n}`,
    source: 'builtin',
    name: n,
    url: ''
  }))
  const index = await readIndex()
  const commons: Wallpaper[] = index.items.map((it) => ({
    id: it.id,
    source: 'commons',
    name: it.name,
    url: `zwall://img/commons/${encodeURIComponent(it.file)}`,
    credit: it.credit
  }))
  let customFiles: string[] = []
  try {
    customFiles = await fs.readdir(customDir())
  } catch {
    // no custom images yet
  }
  const custom: Wallpaper[] = customFiles
    .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
    .map((f) => ({
      id: `custom:${f}`,
      source: 'custom',
      name: f.replace(/^\d+-/, '').replace(/\.[^.]+$/, ''),
      url: `zwall://img/custom/${encodeURIComponent(f)}`
    }))
  return [...commons, ...custom, ...builtin]
}

/** Downloads up to 50 landscape photos in the background; safe to call on every start. */
export async function syncCommonsWallpapers(force = false): Promise<void> {
  if (syncing) return
  const index = await readIndex()
  if (!force && index.items.length >= TARGET_COUNT) return
  if (!force && Date.now() - index.lastAttempt < RETRY_AFTER_MS && index.items.length > 0) return
  syncing = true
  try {
    await fs.mkdir(commonsDir(), { recursive: true })
    index.lastAttempt = Date.now()
    const res = await net.fetch(COMMONS_API, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) throw new Error(`Commons API ${res.status}`)
    const data: any = await res.json()
    const pages: any[] = Object.values(data?.query?.pages ?? {})
    const known = new Set(index.items.map((i) => i.id))
    for (const page of pages) {
      if (index.items.length >= TARGET_COUNT) break
      const info = page.imageinfo?.[0]
      const id = `commons:${page.pageid}`
      if (!info || known.has(id)) continue
      if (!/^image\/(jpeg|png|webp)$/.test(info.mime ?? '')) continue
      const src: string = info.thumburl || info.url
      const ext = info.mime === 'image/png' ? 'png' : info.mime === 'image/webp' ? 'webp' : 'jpg'
      const fileName = `${page.pageid}.${ext}`
      try {
        const img = await net.fetch(src, { headers: { 'User-Agent': USER_AGENT } })
        if (!img.ok) continue
        await fs.writeFile(path.join(commonsDir(), fileName), Buffer.from(await img.arrayBuffer()))
      } catch {
        continue
      }
      const meta = info.extmetadata ?? {}
      const artist = stripHtml(meta.Artist?.value ?? '') || 'Unbekannt'
      const license = stripHtml(meta.LicenseShortName?.value ?? '')
      const title = stripHtml(meta.ObjectName?.value ?? '') || String(page.title ?? '')
        .replace(/^File:/, '')
        .replace(/\.[^.]+$/, '')
      index.items.push({
        id,
        file: fileName,
        name: title.slice(0, 80),
        credit: `Foto: ${artist}${license ? ` · ${license}` : ''} · Wikimedia Commons`
      })
      await fs.writeFile(indexFile(), JSON.stringify(index, null, 2), 'utf-8')
      notify()
    }
    await fs.writeFile(indexFile(), JSON.stringify(index, null, 2), 'utf-8')
  } catch {
    await fs.writeFile(indexFile(), JSON.stringify(index, null, 2), 'utf-8').catch(() => undefined)
  } finally {
    syncing = false
    notify()
  }
}

export async function addCustomWallpapers(parent: BrowserWindow | null): Promise<number> {
  const opts = {
    title: 'Eigene Hintergrundbilder wählen',
    properties: ['openFile', 'multiSelections'] as Array<'openFile' | 'multiSelections'>,
    filters: [{ name: 'Bilder', extensions: ['jpg', 'jpeg', 'png', 'webp'] }]
  }
  const result = parent ? await dialog.showOpenDialog(parent, opts) : await dialog.showOpenDialog(opts)
  if (result.canceled) return 0
  await fs.mkdir(customDir(), { recursive: true })
  let added = 0
  for (const src of result.filePaths) {
    const safe = path.basename(src).replace(/[^\w.\- ]/g, '_')
    await fs.copyFile(src, path.join(customDir(), `${Date.now()}-${safe}`))
    added += 1
  }
  notify()
  return added
}

export async function removeCustomWallpaper(id: string): Promise<void> {
  if (!id.startsWith('custom:')) return
  const name = path.basename(id.slice('custom:'.length))
  await fs.unlink(path.join(customDir(), name)).catch(() => undefined)
  notify()
}
