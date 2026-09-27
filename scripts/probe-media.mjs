// Checks the hand-picked media list (src/main/modules/media-list.ts) against Wikimedia Commons
// the same way the app does, and that every chosen file really downloads. Runs in CI.
import { readFileSync } from 'fs'

const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'ZnerolMonitor/2.2 (https://github.com/kabelverbindung2-star/znerol77; media check)'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const src = readFileSync(new URL('../src/main/modules/media-list.ts', import.meta.url), 'utf-8')
const lists = {}
new Function('exp', src.replace(/export const (\w+) =/g, 'exp.$1 =').replace(/^\/\/.*$/gm, ''))(lists)

function pickVideo(v) {
  const d = v.derivatives ?? []
  const hd = d.find((x) => x.transcodekey === '1080p.vp9.webm') ?? d.find((x) => x.transcodekey === '720p.vp9.webm')
  if (hd?.src) return hd.src
  return v.mime === 'video/webm' ? v.url : null
}
function pickAudio(v) {
  if (/^audio\/(mpeg|ogg|opus|flac|wav|webm|x-flac)$/.test(v.mime ?? '') || v.mime === 'application/ogg') return v.url
  const d = v.derivatives ?? []
  return (d.find((x) => x.transcodekey === 'mp3') ?? d.find((x) => x.transcodekey === 'ogg'))?.src ?? null
}

async function check(name, titles, pick, minimum) {
  let ok = 0
  const missing = []
  for (let i = 0; i < titles.length; i += 40) {
    const batch = titles.slice(i, i + 40).map((t) => `File:${t}`)
    const url = `${API}?action=query&format=json&prop=videoinfo&viprop=url%7Csize%7Cmime%7Cextmetadata%7Cderivatives&titles=${encodeURIComponent(batch.join('|'))}`
    const data = await (await fetch(url, { headers: { 'User-Agent': UA } })).json()
    const renamed = new Map((data.query.normalized ?? []).map((n) => [n.from, n.to]))
    const pages = new Map(Object.values(data.query.pages).map((p) => [p.title, p]))
    for (const asked of batch) {
      const p = pages.get(renamed.get(asked) ?? asked)
      const v = p?.videoinfo?.[0]
      const file = v && pick(v)
      if (!file) {
        missing.push(`${asked} (${p?.missing !== undefined ? 'not on Commons' : 'no playable version'})`)
        continue
      }
      await wait(300)
      const head = await fetch(file, { method: 'HEAD', headers: { 'User-Agent': UA } })
      const mb = (Number(head.headers.get('content-length')) / 1e6).toFixed(1)
      if (!head.ok) {
        missing.push(`${asked} (HTTP ${head.status})`)
        continue
      }
      ok++
      console.log(`ok  ${Math.round(v.duration)}s ${mb} MB ${head.headers.get('content-type')} [${(v.extmetadata?.LicenseShortName?.value ?? '').replace(/<[^>]*>/g, '')}] ${asked.slice(5, 90)}`)
    }
    await wait(1000)
  }
  console.log(`\n${name}: ${ok} of ${titles.length} playable`)
  for (const m of missing) console.log('MISSING', m)
  if (ok < minimum) throw new Error(`${name}: only ${ok}, need ${minimum}`)
}

await check('videos', lists.NATURE_VIDEOS, pickVideo, 20)
await check('music', lists.CALM_MUSIC, pickAudio, 50)
