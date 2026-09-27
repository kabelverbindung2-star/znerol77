import { useCallback, useEffect, useRef, useState } from 'react'
import { useSettings } from '../lib/useSettings'
import { useMedia } from '../lib/useMedia'
import NatureVideo from './NatureVideo'
import VideoPicker from './VideoPicker'
import MusicPicker from './MusicPicker'
import Switch from './ui/Switch'
import { useWallpapers } from '../lib/useWallpapers'
import { sceneImage } from './Background'
import { describe } from './WeatherChip'
import * as calmMusic from '../lib/calmMusic'
import type { MediaItem, Settings, Weather } from '../lib/types'

const noop = async (): Promise<void> => undefined
const LONG_PRESS_MS = 550

type Show = 'video' | 'picture' | 'black'

function Choice<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }): JSX.Element {
  return (
    <div className="choice" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Settings inside rest mode: long press or right click opens it. */
function RestSettings({
  rest,
  update,
  media,
  onClose
}: {
  rest: Settings['rest']
  update: (patch: { rest: Partial<Settings['rest']> }) => Promise<void>
  media: { videos: MediaItem[] }
  onClose: () => void
}): JSX.Element {
  const [picker, setPicker] = useState(false)
  const [musicPicker, setMusicPicker] = useState(false)
  const owner = calmMusic.isOwner()
  const music = calmMusic.useCalmMusic()
  const show: Show = rest.black ? 'black' : rest.video ? 'video' : 'picture'
  const chosen = media.videos.find((v) => v.id === rest.videoId)
  return (
    <div className="rest-settings glass" role="dialog" aria-label="Ruhemodus einstellen">
      <div className="rest-settings-head">
        <b>Ruhemodus</b>
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Fertig
        </button>
      </div>
      <div className="settings-row">
        <div>Anzeige</div>
        <Choice<Show>
          value={show}
          options={[
            { value: 'video', label: 'Naturvideo' },
            { value: 'picture', label: 'Bild' },
            { value: 'black', label: 'Schwarz' }
          ]}
          onChange={(v) => update({ rest: { video: v === 'video', black: v === 'black' } })}
        />
      </div>
      {show === 'video' && (
        <div className="settings-row">
          <div>
            <div>Video</div>
            <div className="quick-sub">{chosen ? chosen.title : 'wechselt alle paar Minuten'}</div>
          </div>
          <button type="button" className="btn btn-sm" onClick={() => setPicker(true)}>
            Auswählen
          </button>
        </div>
      )}
      <div className="settings-row">
        <div>
          <div>Mehrere Bildschirme</div>
          <div className="quick-sub">gilt beim nächsten Start</div>
        </div>
        <Choice
          value={rest.span}
          options={[
            { value: 'one', label: 'Ein großes' },
            { value: 'same', label: 'Gleiches' },
            { value: 'each', label: 'Verschiedene' }
          ]}
          onChange={(v) => update({ rest: { span: v } })}
        />
      </div>
      <div className="settings-row">
        <div>Uhr</div>
        <Choice
          value={rest.clock}
          options={[
            { value: 'corner', label: 'Ecke' },
            { value: 'center', label: 'Mitte' },
            { value: 'off', label: 'Aus' }
          ]}
          onChange={(v) => update({ rest: { clock: v } })}
        />
      </div>
      <div className="settings-row">
        <div>Sekunden zeigen</div>
        <Switch on={rest.seconds} onToggle={(v) => update({ rest: { seconds: v } })} />
      </div>
      <div className="settings-row">
        <div>
          <div>Ruhemusik</div>
          <div className="quick-sub">{owner && music.current ? music.current.title : '55 ruhige Stücke'}</div>
        </div>
        <div className="row">
          <button
            type="button"
            className="round-btn"
            aria-label={owner && music.playing ? 'Pause' : 'Abspielen'}
            onClick={() => calmMusic.command(owner && music.playing ? 'pause' : 'play')}
          >
            {owner && music.playing ? '❚❚' : '▶'}
          </button>
          <button type="button" className="round-btn" aria-label="Nächstes Stück" onClick={() => calmMusic.command('next')}>
            ››
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setMusicPicker(true)}>
            Auswählen
          </button>
        </div>
      </div>
      <div className="settings-row">
        <div>Musik beim Start</div>
        <Switch on={rest.music} onToggle={(v) => update({ rest: { music: v } })} />
      </div>
      <button type="button" className="btn btn-primary wide" onClick={() => window.znerol.rest.stop()}>
        Ruhemodus beenden
      </button>
      {musicPicker && <MusicPicker onClose={() => setMusicPicker(false)} />}
      {picker && (
        <VideoPicker
          selected={rest.videoId}
          onSelect={(id) => {
            update({ rest: { videoId: id, video: true, black: false } })
            setPicker(false)
          }}
          onClose={() => setPicker(false)}
        />
      )}
    </div>
  )
}

/**
 * Rest mode screen (one per monitor). Deliberately still: the clock changes once a minute
 * (or second), no blur, no system measurements. A short click or any key ends it; a long
 * press or right click opens its settings.
 */
export default function RestScreen({ index: rawIndex }: { index: number }): JSX.Element {
  // 100+ = every monitor shows the same film (see rest.ts); otherwise each its own
  const same = rawIndex >= 100
  const index = same ? rawIndex - 100 : rawIndex
  const { settings, update } = useSettings()
  const walls = useWallpapers(settings, noop, false)
  const [now, setNow] = useState(() => new Date())
  const [weather, setWeather] = useState<Weather | null>(null)
  const media = useMedia()
  const [film, setFilm] = useState<MediaItem | null>(null)
  const onFilm = useCallback((v: MediaItem | null) => setFilm(v), [])
  const [panel, setPanel] = useState(false)
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; long: boolean } | null>(null)
  const rest = settings.rest
  const withVideo = !rest.black && rest.video && media.videos.length > 0

  // only re-render when what is shown changes (seconds off = once a minute)
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      if (rest.seconds || d.getSeconds() === 0) setNow(d)
    }, 1000)
    return () => clearInterval(t)
  }, [rest.seconds])

  const place = settings.weather
  useEffect(() => {
    if (!place || index !== 0) return
    const load = (): void => {
      window.znerol.weather.get(place.lat, place.lon).then(setWeather).catch(() => undefined)
    }
    load()
    const t = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(t)
  }, [place, index])

  // keys end rest mode (not while the settings are open)
  useEffect(() => {
    if (panel) return
    const stop = (): void => {
      window.znerol.rest.stop()
    }
    window.addEventListener('keydown', stop)
    return () => window.removeEventListener('keydown', stop)
  }, [panel])

  const onPointerDown = (e: React.PointerEvent): void => {
    if (panel || e.button !== 0) return
    const p = { long: false, timer: setTimeout(() => ((p.long = true), setPanel(true)), LONG_PRESS_MS) }
    press.current = p
  }
  const onPointerUp = (e: React.PointerEvent): void => {
    const p = press.current
    press.current = null
    if (!p || e.button !== 0) return
    clearTimeout(p.timer)
    if (!p.long) window.znerol.rest.stop() // short click: wake up
  }

  const wp = walls.current
  const src = wp.source === 'builtin' ? sceneImage(wp.id) : wp.url
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const w = weather ? describe(weather.code, weather.isDay) : null
  const temp = w && weather ? ` · ${Math.round(weather.temp)} °C` : ''

  return (
    <div
      className={`rest-screen ${index === 0 ? 'main' : 'side'} ${withVideo ? 'with-video' : ''} ${rest.black ? 'black' : ''}`}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onContextMenu={(e) => {
        e.preventDefault()
        setPanel(true)
      }}
    >
      {!rest.black && !(withVideo && film) && <img className="rest-bg" src={src} alt="" draggable={false} />}
      {withVideo && <NatureVideo videos={media.videos} offset={same ? 0 : index * 7} seeded={same} pinnedId={rest.videoId} onCurrent={onFilm} />}
      {rest.clock === 'corner' && (
        <div className="rest-corner">
          <div className="rest-date">
            {now.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}
            {temp}
          </div>
          <div className="rest-time">
            {hh}:{mm}
            {rest.seconds && <small>{ss}</small>}
          </div>
        </div>
      )}
      {rest.clock === 'center' && (
        <div className="rest-center">
          <div className="rest-time">
            {hh}:{mm}
            {rest.seconds && <small>{ss}</small>}
          </div>
          <div className="rest-date">
            {now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            {w && weather && place && ` · ${Math.round(weather.temp)} °C, ${w.text} in ${place.name.split(',')[0]}`}
          </div>
        </div>
      )}
      {film && withVideo && (
        <div className="rest-credit">
          {film.title} · {film.artist}
          {film.license ? ` · ${film.license}` : ''} · Wikimedia Commons
        </div>
      )}
      {index === 0 && !panel && <div className="rest-hint">Klicken oder Taste: beenden · lange drücken oder Rechtsklick: einstellen</div>}
      {panel && (
        <div className="rest-settings-wrap" onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
          <RestSettings rest={rest} update={update} media={media} onClose={() => setPanel(false)} />
        </div>
      )}
    </div>
  )
}
