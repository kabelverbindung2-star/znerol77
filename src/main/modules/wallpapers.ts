import { app, dialog, net, protocol, screen, type BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

export interface WallpaperInfo {
  title: string
  artist: string
  license: string
  licenseUrl: string
  descriptionUrl: string
  date: string
}

export interface Wallpaper {
  id: string
  source: 'builtin' | 'commons' | 'custom'
  name: string
  /** zwall://… for downloaded/custom files, empty for builtin (renderer draws those) */
  url: string
  credit?: string
  info?: WallpaperInfo
}

// Drawn scenes; the renderer knows how to paint each name.
export const BUILTIN_SCENES = [
  'Bergsee',
  'Wald',
  'Nebel',
  'Herbst',
  'Fjord',
  'Polarlicht',
  'Nacht',
  'Strand',
  'Strand am Abend',
  'Strand bei Nacht',
  'Berge',
  'Berge im Abendrot',
  'Berge bei Nacht',
  'Stadt',
  'Stadt am Abend',
  'Stadt bei Nacht',
  'Wüste',
  'Savanne'
]

const TARGET_COUNT = 50
const INDEX_VERSION = 2
const RETRY_AFTER_MS = 24 * 60 * 60 * 1000
const USER_AGENT = 'ZnerolMonitor/2.1 (desktop app; wallpaper download)'
const API = 'https://commons.wikimedia.org/w/api.php'
const IIPROP = 'url%7Cextmetadata%7Cmime%7Csize'

interface IndexItem {
  id: string
  file: string
  name: string
  credit: string
  width?: number
  info?: WallpaperInfo
}

interface CommonsIndex {
  version?: number
  lastAttempt: number
  items: IndexItem[]
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

/** Download size that is sharp on this screen (physical pixels), within sane limits. */
function targetWidth(): number {
  try {
    const d = screen.getPrimaryDisplay()
    const px = Math.max(d.size.width, d.size.height) * d.scaleFactor
    return Math.round(Math.min(3840, Math.max(2560, px)))
  } catch {
    return 2560
  }
}

async function readIndex(): Promise<CommonsIndex> {
  try {
    return JSON.parse(await fs.readFile(indexFile(), 'utf-8'))
  } catch {
    return { version: INDEX_VERSION, lastAttempt: 0, items: [] }
  }
}

async function writeIndex(index: CommonsIndex): Promise<void> {
  await fs.writeFile(indexFile(), JSON.stringify({ ...index, version: INDEX_VERSION }, null, 2), 'utf-8')
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

function infoFromPage(page: any): WallpaperInfo {
  const ii = page.imageinfo?.[0] ?? {}
  const meta = ii.extmetadata ?? {}
  const title =
    stripHtml(meta.ObjectName?.value ?? '') ||
    String(page.title ?? '')
      .replace(/^File:/, '')
      .replace(/\.[^.]+$/, '')
  return {
    title: title.slice(0, 120),
    artist: stripHtml(meta.Artist?.value ?? '') || 'Unbekannt',
    license: stripHtml(meta.LicenseShortName?.value ?? ''),
    licenseUrl: stripHtml(meta.LicenseUrl?.value ?? ''),
    descriptionUrl: ii.descriptionurl ?? `https://commons.wikimedia.org/w/index.php?curid=${page.pageid}`,
    date: stripHtml(meta.DateTimeOriginal?.value ?? '').slice(0, 40)
  }
}

function creditOf(info: WallpaperInfo): string {
  return `Foto: ${info.artist}${info.license ? ` · ${info.license}` : ''} · Wikimedia Commons`
}

export async function listWallpapers(): Promise<Wallpaper[]> {
  const builtin: Wallpaper[] = BUILTIN_SCENES.map((n) => ({
    id: `builtin:${n}`,
    source: 'builtin',
    name: n,
    url: ''
  }))
  const index = await readIndex()
  const commons: Wallpaper[] = index.items.map((it) => {
    const pageid = it.id.replace('commons:', '')
    return {
      id: it.id,
      source: 'commons',
      name: it.info?.title || it.name,
      // ?w= busts the image cache after an upgrade to a sharper version
      url: `zwall://img/commons/${encodeURIComponent(it.file)}?w=${it.width ?? 1920}`,
      credit: it.credit,
      info: it.info ?? {
        title: it.name,
        artist: it.credit.replace(/^Foto: /, '').split(' · ')[0],
        license: '',
        licenseUrl: '',
        descriptionUrl: `https://commons.wikimedia.org/w/index.php?curid=${pageid}`,
        date: ''
      }
    }
  })
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

async function download(src: string, fileName: string): Promise<boolean> {
  try {
    const img = await net.fetch(src, { headers: { 'User-Agent': USER_AGENT } })
    if (!img.ok) return false
    const tmp = path.join(commonsDir(), fileName + '.part')
    await fs.writeFile(tmp, Buffer.from(await img.arrayBuffer()))
    await fs.rename(tmp, path.join(commonsDir(), fileName))
    return true
  } catch {
    return false
  }
}

function extFor(mime: string): string {
  return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
}

async function api(params: string): Promise<any[]> {
  const res = await net.fetch(`${API}?action=query&format=json&${params}`, { headers: { 'User-Agent': USER_AGENT } })
  if (!res.ok) throw new Error(`Commons API ${res.status}`)
  const data: any = await res.json()
  return Object.values(data?.query?.pages ?? {})
}

/**
 * Keeps up to 50 landscape photos (Wikimedia Commons featured pictures) in a local
 * cache, sized for this screen. Older, smaller downloads are replaced by sharper ones.
 */
export async function syncCommonsWallpapers(force = false): Promise<void> {
  if (syncing) return
  const index = await readIndex()
  const width = targetWidth()
  const needsUpgrade = index.items.some((i) => (i.width ?? 1920) < width * 0.9 || !i.info)
  const wantsMore = index.items.length < TARGET_COUNT
  const mayRetry = force || Date.now() - index.lastAttempt > RETRY_AFTER_MS || index.items.length === 0
  if (!needsUpgrade && !(wantsMore && mayRetry)) return

  syncing = true
  try {
    await fs.mkdir(commonsDir(), { recursive: true })
    index.lastAttempt = Date.now()

    // 1) sharper versions + full info for photos we already have (one request for all)
    const old = index.items.filter((i) => (i.width ?? 1920) < width * 0.9 || !i.info)
    if (old.length > 0) {
      const ids = old.map((i) => i.id.replace('commons:', '')).join('%7C')
      const pages = await api(`pageids=${ids}&prop=imageinfo&iiprop=${IIPROP}&iiurlwidth=${width}`)
      for (const page of pages) {
        const item = index.items.find((i) => i.id === `commons:${page.pageid}`)
        const ii = page.imageinfo?.[0]
        if (!item || !ii) continue
        item.info = infoFromPage(page)
        item.credit = creditOf(item.info)
        if ((item.width ?? 1920) < width * 0.9 && (await download(ii.thumburl || ii.url, item.file))) {
          item.width = ii.thumbwidth || ii.width || width
        }
        await writeIndex(index)
        notify()
      }
    }

    // 2) fill up to 50 photos
    if (index.items.length < TARGET_COUNT && mayRetry) {
      const pages = await api(
        'generator=categorymembers&gcmtitle=Category:Featured_pictures_of_landscapes' +
          `&gcmtype=file&gcmlimit=${TARGET_COUNT}&prop=imageinfo&iiprop=${IIPROP}&iiurlwidth=${width}`
      )
      const known = new Set(index.items.map((i) => i.id))
      for (const page of pages) {
        if (index.items.length >= TARGET_COUNT) break
        const ii = page.imageinfo?.[0]
        const id = `commons:${page.pageid}`
        if (!ii || known.has(id)) continue
        if (!/^image\/(jpeg|png|webp)$/.test(ii.mime ?? '')) continue
        // skip panoramas and portrait shots; they crop badly as a window background
        const ratio = (ii.width ?? 16) / (ii.height ?? 9)
        if (ratio < 1.2 || ratio > 2.6) continue
        const fileName = `${page.pageid}.${extFor(ii.mime)}`
        if (!(await download(ii.thumburl || ii.url, fileName))) continue
        const info = infoFromPage(page)
        index.items.push({
          id,
          file: fileName,
          name: info.title,
          credit: creditOf(info),
          width: ii.thumbwidth || width,
          info
        })
        await writeIndex(index)
        notify()
      }
    }
    await writeIndex(index)
  } catch {
    await writeIndex(index).catch(() => undefined)
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
