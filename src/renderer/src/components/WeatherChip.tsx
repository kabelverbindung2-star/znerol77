import { useEffect, useRef, useState } from 'react'
import { usePoll } from '../lib/usePoll'
import type { Place, Settings, Weather } from '../lib/types'
import type { SettingsPatch } from '../lib/useSettings'

const P = {
  thermo: 'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  cloud: 'M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z',
  rain: 'M16 13v8M8 13v8M12 15v8M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25',
  snow: 'M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25M8 16h.01M8 20h.01M12 18h.01M12 22h.01M16 16h.01M16 20h.01',
  storm: 'M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9M13 11l-4 6h6l-4 6',
  fog: 'M3 10h18M3 14h18M5 18h14M7 6h10'
}

function describe(code: number, isDay: boolean): { text: string; icon: string } {
  if (code === 0) return { text: 'Klar', icon: isDay ? P.sun : P.moon }
  if (code <= 2) return { text: 'Teils bewölkt', icon: isDay ? P.sun : P.moon }
  if (code === 3) return { text: 'Bewölkt', icon: P.cloud }
  if (code === 45 || code === 48) return { text: 'Nebel', icon: P.fog }
  if (code >= 51 && code <= 57) return { text: 'Nieselregen', icon: P.rain }
  if (code >= 61 && code <= 67) return { text: 'Regen', icon: P.rain }
  if (code >= 71 && code <= 77) return { text: 'Schnee', icon: P.snow }
  if (code >= 80 && code <= 82) return { text: 'Regenschauer', icon: P.rain }
  if (code === 85 || code === 86) return { text: 'Schneeschauer', icon: P.snow }
  if (code >= 95) return { text: 'Gewitter', icon: P.storm }
  return { text: 'Wetter', icon: P.cloud }
}

function Svg({ d, size = 22 }: { d: string; size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

const r = (n: number): string => `${Math.round(n)}`

export default function WeatherChip({
  location,
  update
}: {
  location: Settings['weather']
  update: (patch: SettingsPatch) => Promise<void>
}): JSX.Element {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pinned, setPinned] = useState(false)
  const [editing, setEditing] = useState(!location)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[]>([])
  const root = useRef<HTMLDivElement>(null)

  // close when clicking somewhere else or pressing Esc
  useEffect(() => {
    if (!pinned) return
    const onDown = (e: MouseEvent): void => {
      if (root.current && !root.current.contains(e.target as Node)) setPinned(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setPinned(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  useEffect(() => setEditing(!location), [location])

  usePoll(
    async () => {
      if (!location) return
      try {
        setWeather(await window.znerol.weather.get(location.lat, location.lon))
        setError(null)
      } catch (e) {
        setError('Wetter nicht erreichbar')
      }
    },
    10 * 60 * 1000,
    [location?.lat, location?.lon]
  )

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        setResults(await window.znerol.weather.search(query))
        setError(null)
      } catch {
        setError('Suche nicht erreichbar')
      }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  const choose = async (p: Place): Promise<void> => {
    const name = p.region && p.region !== p.name ? `${p.name}, ${p.region}` : p.name
    await update({ weather: { name, lat: p.lat, lon: p.lon } })
    setQuery('')
    setResults([])
    setEditing(false)
    setPinned(false)
  }

  const d = weather ? describe(weather.code, weather.isDay) : null

  return (
    <div ref={root} className={`weather ${pinned ? 'open' : ''}`} onMouseLeave={() => !editing && setPinned(false)}>
      <button
        type="button"
        className="weather-btn"
        aria-label={weather && location ? `Wetter in ${location.name}: ${r(weather.temp)} Grad` : 'Wetter einstellen'}
        aria-expanded={pinned}
        onClick={() => setPinned((v) => !v)}
      >
        <Svg d={d ? d.icon : P.thermo} />
      </button>

      <div className="weather-pop glass">
        {location && weather && !editing && (
          <>
            <div className="weather-temp">
              {r(weather.temp)}
              <small>°C</small>
            </div>
            <div className="weather-desc">
              {d?.text} · gefühlt {r(weather.feelsLike)} °C
            </div>
            <div className="weather-grid">
              <span>Tief / Hoch</span>
              <b>
                {r(weather.min)}° / {r(weather.max)}°
              </b>
              <span>Wind</span>
              <b>{r(weather.wind)} km/h</b>
              <span>Luftfeuchte</span>
              <b>{r(weather.humidity)} %</b>
            </div>
            <div className="weather-foot">
              <span>{location.name}</span>
              <button type="button" className="link-btn" onClick={() => setEditing(true)}>
                Ort ändern
              </button>
            </div>
          </>
        )}
        {location && !weather && !editing && <div className="weather-desc">{error ?? 'Lade Wetter…'}</div>}
        {editing && (
          <div className="weather-search">
            <div className="weather-desc">Wo bist du? Stadt eingeben:</div>
            <input
              type="text"
              className="text-input"
              value={query}
              placeholder="z. B. München"
              aria-label="Ort suchen"
              onFocus={() => setPinned(true)}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results.map((p) => (
              <button key={`${p.lat},${p.lon}`} type="button" className="place-row" onClick={() => choose(p)}>
                <b>{p.name}</b>
                <span>{[p.region, p.country].filter(Boolean).join(', ')}</span>
              </button>
            ))}
            {error && <div className="quick-sub">{error}</div>}
            {location && (
              <button type="button" className="link-btn" onClick={() => setEditing(false)}>
                Abbrechen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
