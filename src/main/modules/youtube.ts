import { net, session } from 'electron'

/** Accepts every usual YouTube link form (watch, youtu.be, shorts, embed, live) or a bare id. */
export function youtubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m =
    s.match(/[?&]v=([\w-]{11})/) ??
    s.match(/youtu\.be\/([\w-]{11})/) ??
    s.match(/youtube(?:-nocookie)?\.com\/(?:embed|shorts|live|v)\/([\w-]{11})/)
  return m ? m[1] : null
}

/** Title of a video via YouTube's public oEmbed (no account, no key). */
export async function youtubeInfo(input: string): Promise<{ id: string; title: string }> {
  const id = youtubeId(input)
  if (!id) throw new Error('Das ist kein YouTube-Link.')
  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`
    const res = await net.fetch(url)
    if (res.status === 401 || res.status === 403) throw new Error('Dieses Video darf nicht eingebettet werden.')
    if (!res.ok) throw new Error('Video nicht gefunden.')
    const data = (await res.json()) as { title?: string }
    return { id, title: String(data.title ?? 'YouTube-Video').slice(0, 120) }
  } catch (e) {
    if ((e as Error).message.startsWith('Dieses') || (e as Error).message.startsWith('Video')) throw e
    return { id, title: 'YouTube-Video' } // offline: keep it, the player shows the rest
  }
}

/**
 * The app pages are loaded from files, which send no Referer; YouTube's embedded
 * player refuses to play without one (error 153). Give its requests a proper one.
 */
export function allowYoutubeEmbeds(): void {
  session.defaultSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube-nocookie.com/*', 'https://www.youtube.com/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders }
      if (!headers['Referer'] && !headers['referer']) headers['Referer'] = 'https://www.youtube-nocookie.com/'
      callback({ requestHeaders: headers })
    }
  )
}
