import { useCallback, useEffect, useState } from 'react'
import { useSettings } from '../lib/useSettings'
import { useMedia } from '../lib/useMedia'
import NatureVideo from './NatureVideo'
import { useWallpapers } from '../lib/useWallpapers'
import { sceneImage } from './Background'
import { describe } from './WeatherChip'
import type { MediaItem, Weather } from '../lib/types'

const noop = async (): Promise<void> => undefined

/**
 * Rest mode screen (one per monitor). Deliberately still: the clock changes once per second,
 * nothing animates, no blur, no system measurements. Click or any key ends it.
 */
export default function RestScreen({ index }: { index: number }): JSX.Element {
  const { settings } = useSettings()
  const walls = useWallpapers(settings, noop, false)
  const [now, setNow] = useState(() => new Date())
  const [weather, setWeather] = useState<Weather | null>(null)
  const media = useMedia()
  const [film, setFilm] = useState<MediaItem | null>(null)
  const onFilm = useCallback((v: MediaItem | null) => setFilm(v), [])
  const withVideo = settings.rest.video && media.videos.length > 0

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

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

  useEffect(() => {
    const stop = (): void => {
      window.znerol.rest.stop()
    }
    window.addEventListener('mousedown', stop)
    window.addEventListener('keydown', stop)
    return () => {
      window.removeEventListener('mousedown', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [])

  const wp = walls.current
  const picture = settings.appearance.style === 'glass' && settings.appearance.background !== 'plain' && settings.appearance.background !== 'transparent'
  const src = wp.source === 'builtin' ? sceneImage(wp.id) : wp.url
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const w = weather ? describe(weather.code, weather.isDay) : null

  return (
    <div className={`rest-screen ${index === 0 ? 'main' : 'side'} ${withVideo ? 'with-video' : ''}`}>
      {picture && !(withVideo && film) && <img className="rest-bg" src={src} alt="" draggable={false} />}
      {withVideo && <NatureVideo videos={media.videos} offset={index * 7} onCurrent={onFilm} />}
      {withVideo ? (
        <div className="rest-corner">
          <div className="rest-date">
            {now.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' })}
            {w && weather && ` · ${Math.round(weather.temp)} °C`}
          </div>
          <div className="rest-time">
            {hh}:{mm}
          </div>
        </div>
      ) : (
        <div className="rest-center">
          <div className="rest-time">
            {hh}:{mm}
            <small>{ss}</small>
          </div>
          <div className="rest-date">
            {now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            {w && weather && place && ` · ${Math.round(weather.temp)} °C, ${w.text} in ${place.name.split(',')[0]}`}
          </div>
        </div>
      )}
      {film && (
        <div className="rest-credit">
          {film.title} · {film.artist}
          {film.license ? ` · ${film.license}` : ''} · Wikimedia Commons
        </div>
      )}
      {index === 0 && <div className="rest-hint">Ruhemodus · Klicken oder eine Taste drücken zum Beenden</div>}
    </div>
  )
}
