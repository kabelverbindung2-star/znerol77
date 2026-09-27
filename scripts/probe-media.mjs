// Asks Wikimedia Commons which free nature videos and calm music exist (run in CI; the dev sandbox has no access).
const API = 'https://commons.wikimedia.org/w/api.php'
const UA = 'ZnerolMonitor/2.2 (media probe)'

async function search(q, limit = 50) {
  const url =
    `${API}?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=${limit}` +
    `&gsrsearch=${encodeURIComponent(q)}&prop=videoinfo&viprop=url%7Csize%7Cmime%7Cextmetadata%7Cderivatives`
  const r = await fetch(url, { headers: { 'User-Agent': UA } })
  const d = await r.json()
  return Object.values(d?.query?.pages ?? {})
}

const strip = (s) => String(s ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()

async function probe(kind, queries) {
  console.log(`\n===== ${kind} =====`)
  const seen = new Set()
  for (const q of queries) {
    const pages = await search(q)
    const good = []
    for (const p of pages) {
      const v = p.videoinfo?.[0]
      if (!v) continue
      const m = v.extmetadata ?? {}
      const row = {
        t: p.title.replace(/^File:/, '').slice(0, 70),
        dur: Math.round(v.duration ?? 0),
        size: `${v.width ?? 0}x${v.height ?? 0}`,
        mime: v.mime,
        lic: strip(m.LicenseShortName?.value),
        derivs: (v.derivatives ?? []).map((x) => x.transcodekey || x.shorttitle || '').filter(Boolean).slice(0, 6).join(',')
      }
      good.push(row)
    }
    const fresh = good.filter((g) => !seen.has(g.t))
    fresh.forEach((g) => seen.add(g.t))
    console.log(`\n--- "${q}": ${pages.length} hits, ${fresh.length} new`)
    for (const g of fresh.slice(0, 12)) console.log(`${g.dur}s ${g.size} ${g.mime} [${g.lic}] ${g.t} {${g.derivs}}`)
  }
  console.log(`\nTOTAL unique ${kind}: ${seen.size}`)
}

await probe('video', [
  'waterfall filetype:video filew:>1279',
  'river filetype:video filew:>1279',
  'clouds timelapse filetype:video filew:>1279',
  'ocean waves filetype:video filew:>1279',
  'mountains filetype:video filew:>1279',
  'forest filetype:video filew:>1279',
  'earth from space ISS filetype:video filew:>1279',
  'aurora filetype:video filew:>1279',
  'lake landscape filetype:video filew:>1279',
  'incategory:"Featured videos" nature'
])
await probe('audio', [
  'Musopen filetype:audio',
  'nocturne piano filetype:audio',
  'Gymnopédie filetype:audio',
  'Clair de lune filetype:audio',
  'prelude piano filetype:audio',
  'Kevin MacLeod filetype:audio',
  'ambient music filetype:audio',
  'Bach cello suite filetype:audio'
])
