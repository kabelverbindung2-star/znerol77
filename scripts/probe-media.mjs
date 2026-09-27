// Asks Wikimedia Commons which free nature videos and calm music exist (run in CI; the dev sandbox has no access).
const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'ZnerolMonitor/2.2 (https://github.com/kabelverbindung2-star/znerol77; media probe)'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(q, limit = 40) {
  const url =
    `${API}?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${limit}` +
    `&gsrsearch=${encodeURIComponent(q)}&prop=videoinfo&viprop=size%7Cmime%7Cextmetadata%7Cderivatives`
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } })
    const text = await r.text()
    try {
      return Object.values(JSON.parse(text)?.query?.pages ?? {})
    } catch {
      await wait(5000 * (i + 1))
    }
  }
  return []
}

const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const seen = new Set()

async function probe(kind, queries, keep) {
  console.log(`\n===== ${kind} =====`)
  for (const q of queries) {
    await wait(2500)
    const pages = await search(q)
    const rows = []
    for (const p of pages) {
      const v = p.videoinfo?.[0]
      if (!v || seen.has(p.title)) continue
      const derivs = (v.derivatives ?? []).map((x) => x.transcodekey || '').filter(Boolean)
      const row = { title: p.title, dur: Math.round(v.duration ?? 0), w: v.width ?? 0, h: v.height ?? 0, mime: v.mime, lic: strip(v.extmetadata?.LicenseShortName?.value), derivs }
      if (!keep(row)) continue
      seen.add(p.title)
      rows.push(row)
    }
    console.log(`\n--- ${q}: ${rows.length}`)
    for (const r of rows) console.log(`${r.dur}s|${r.w}x${r.h}|${r.mime}|${r.lic}|${r.derivs.join(',')}|${r.title}`)
  }
}

const bigVideo = (r) => r.dur >= 20 && r.w >= 1600 && r.w / Math.max(1, r.h) >= 1.5 && (r.derivs.includes('1080p.vp9.webm') || r.mime === 'video/webm')
await probe('video', [
  'waterfall 4K filetype:video',
  'waterfall filetype:video filew:>1900',
  'river timelapse filetype:video',
  'clouds timelapse filetype:video filew:>1900',
  'sea waves beach filetype:video filew:>1900',
  'drone mountains filetype:video filew:>1900',
  'alps filetype:video filew:>1900',
  'glacier filetype:video filew:>1900',
  'sunset timelapse filetype:video filew:>1900',
  'night sky stars timelapse filetype:video filew:>1900',
  'aurora timelapse filetype:video filew:>1900',
  'ISS earth 4K filetype:video',
  'coral reef filetype:video filew:>1900',
  'desert dunes filetype:video filew:>1900',
  'fjord Norway filetype:video filew:>1900',
  'Iceland landscape filetype:video filew:>1900'
], bigVideo)

const music = (r) => /^(audio|application\/ogg)/.test(r.mime ?? '') && r.dur >= 90 && r.dur <= 1500
await probe('audio', [
  'Musopen piano filetype:audio',
  'Chopin nocturne filetype:audio',
  'Satie Gymnopédie filetype:audio',
  'Debussy filetype:audio',
  'Clair de lune filetype:audio',
  'Bach prelude filetype:audio',
  'Beethoven moonlight sonata filetype:audio',
  'Schubert impromptu filetype:audio',
  'Mozart piano sonata adagio filetype:audio',
  'Kevin MacLeod filetype:audio',
  'ambient calm filetype:audio',
  'lute guitar filetype:audio',
  'Grieg Morning Mood filetype:audio',
  'Pachelbel canon filetype:audio'
], music)
