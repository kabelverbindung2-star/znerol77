// Checks that the radio stations the app offers can be found in the Radio Browser directory
// and that their streams answer. Runs in CI (the dev sandbox has no access).
import { readFileSync } from 'fs'

const src = readFileSync(new URL('../src/main/modules/radio-list.ts', import.meta.url), 'utf-8')
const lists = {}
new Function('exp', src.replace(/export const (\w+) =/g, 'exp.$1 =').replace(/^\/\/.*$/gm, '').replace(/^export (interface|type)[\s\S]*?^}/gm, ''))(lists)
const UA = 'ZnerolMonitor/2.2 (https://github.com/kabelverbindung2-star/znerol77; radio check)'
const API = 'https://de1.api.radio-browser.info/json'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function stream(url) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), 8000)
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ctl.signal })
    const type = r.headers.get('content-type')
    ctl.abort()
    return `${r.status} ${type}`
  } catch (e) {
    return 'ERR ' + e.message
  } finally {
    clearTimeout(t)
  }
}

let ok = 0
for (const s of lists.STATIONS) {
  const q = new URLSearchParams({ name: s.search, order: 'clickcount', reverse: 'true', limit: '5', hidebroken: 'true' })
  const found = await (await fetch(`${API}/stations/search?${q}`, { headers: { 'User-Agent': UA } })).json()
  const pick = found.find((x) => x.url_resolved) 
  if (!pick) {
    console.log('MISSING', s.name, '(search:', s.search + ')')
    continue
  }
  const st = await stream(pick.url_resolved)
  const good = /^200 (audio|application\/ogg|application\/octet-stream)/.test(st)
  if (good) ok++
  console.log(good ? 'ok ' : 'BAD', s.name, '->', pick.name, '|', pick.codec, pick.bitrate + 'k |', st, '|', pick.url_resolved.slice(0, 90))
  await wait(400)
}
console.log(`\nstations: ${ok} of ${lists.STATIONS.length} play`)

for (const tag of lists.GENRES.map((g) => g.tag)) {
  const q = new URLSearchParams({ tag, order: 'clickcount', reverse: 'true', limit: '5', hidebroken: 'true' })
  const found = await (await fetch(`${API}/stations/search?${q}`, { headers: { 'User-Agent': UA } })).json()
  console.log(`genre ${tag}: ${found.length} ->`, found.map((x) => x.name).join(' | ').slice(0, 200))
  await wait(400)
}
if (ok < lists.STATIONS.length * 0.7) process.exit(1)
