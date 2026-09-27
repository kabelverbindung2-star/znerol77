import { useEffect, useState } from 'react'
import * as player from '../lib/calmMusic'
import { useMedia } from '../lib/useMedia'
import { usePoll } from '../lib/usePoll'
import type { MediaInfo, Station } from '../lib/types'

type Tab = 'radio' | 'calm' | 'spotify'

// the station list is the same everywhere; load it once per window
let stationsCache: Promise<Station[]> | null = null
function loadStations(): Promise<Station[]> {
  if (!stationsCache) {
    stationsCache = window.znerol.radio.stations().catch(() => {
      stationsCache = null
      return []
    })
  }
  return stationsCache
}

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

function Logo({ src, name }: { src?: string; name: string }): JSX.Element {
  const [broken, setBroken] = useState(false)
  return (
    <span className="station-logo">
      {src && !broken ? <img src={src} alt="" loading="lazy" onError={() => setBroken(true)} /> : name.slice(0, 1).toUpperCase()}
    </span>
  )
}

function NowPlaying(): JSX.Element {
  const m = player.useCalmMusic()
  const owner = player.isOwner()
  const t = owner ? m.current : null
  return (
    <div className="now-bar">
      <Logo src={t?.thumb} name={t?.title ?? '♪'} />
      <div className="now-text">
        <div className="np-app">{owner ? (m.playing ? (m.source === 'radio' ? 'Radio läuft' : 'Ruhemusik läuft') : 'Pausiert') : 'Spielt im Hauptfenster'}</div>
        <div className="np-title">{t ? t.title : 'Wähle einen Sender oder ein Stück'}</div>
        {t && <div className="np-artist">{t.artist}</div>}
        {m.error && <div className="quick-sub">{m.error}</div>}
      </div>
      <div className="np-controls">
        <button type="button" className="round-btn" aria-label="Zurück" onClick={() => player.command('prev')}>
          ‹‹
        </button>
        <button
          type="button"
          className="round-btn big"
          aria-label={owner && m.playing ? 'Pause' : 'Abspielen'}
          onClick={() => player.command(owner && m.playing ? 'pause' : 'play')}
        >
          {owner && m.playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="round-btn" aria-label="Weiter" onClick={() => player.command('next')}>
          ››
        </button>
        {owner && (
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(m.volume * 100)}
            aria-label="Lautstärke"
            onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
          />
        )}
      </div>
    </div>
  )
}

function RadioTab({ compact }: { compact: boolean }): JSX.Element {
  const [stations, setStations] = useState<Station[]>([])
  const [genres, setGenres] = useState<{ label: string; tag: string }[]>([])
  const [genre, setGenre] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Station[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const m = player.useCalmMusic()
  const currentId = player.isOwner() && m.source === 'radio' ? m.current?.id : undefined

  useEffect(() => {
    loadStations()
      .then((s) => {
        setStations(s)
        if (s.length === 0) setError('Radio-Verzeichnis gerade nicht erreichbar – ist das Internet an?')
      })
      .finally(() => setLoading(false))
    window.znerol.radio.genres().then(setGenres).catch(() => undefined)
  }, [])

  // search by name or genre (a little delay while typing)
  useEffect(() => {
    if (!query.trim() && !genre) {
      setResults(null)
      return
    }
    const t = setTimeout(() => {
      setLoading(true)
      window.znerol.radio
        .search(query, genre ?? undefined)
        .then((r: Station[]) => {
          setResults(r)
          setError(null)
        })
        .catch(() => setError('Suche ging gerade nicht'))
        .finally(() => setLoading(false))
    }, 350)
    return () => clearTimeout(t)
  }, [query, genre])

  const list = results ?? stations
  return (
    <div className="radio-tab">
      <div className="radio-filters">
        <input className="text-input" placeholder="Sender suchen …" value={query} aria-label="Sender suchen" onChange={(e) => setQuery(e.target.value)} />
        {!compact && (
          <div className="presets">
            <button type="button" className={`chip ${!genre && !query ? 'active' : ''}`} onClick={() => (setGenre(null), setQuery(''))}>
              Beliebt
            </button>
            {genres.map((g) => (
              <button key={g.tag} type="button" className={`chip ${genre === g.tag ? 'active' : ''}`} onClick={() => setGenre(genre === g.tag ? null : g.tag)}>
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <div className="quick-sub">{error}</div>}
      {loading && list.length === 0 && <div className="empty-state">Lade Sender …</div>}
      {!loading && results && results.length === 0 && <div className="empty-state">Nichts gefunden.</div>}
      <div className="station-grid">
        {list.map((st) => (
          <button
            key={st.id}
            type="button"
            className={`station ${currentId === `station:${st.id}` ? 'active' : ''}`}
            title={st.info}
            onClick={() => player.command('station', undefined, st, list)}
          >
            <Logo src={st.logo} name={st.name} />
            <span className="station-text">
              <b>{st.name}</b>
              <span className="quick-sub">{results ? st.info : st.genre}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CalmTab(): JSX.Element {
  const media = useMedia()
  const m = player.useCalmMusic()
  const currentId = player.isOwner() && m.source === 'calm' ? m.current?.id : undefined
  return (
    <ol className="calm-list">
      {!media.loaded && <li className="empty-state">Lade Liste …</li>}
      {media.music.map((t) => (
        <li key={t.id}>
          <button type="button" className={t.id === currentId ? 'active' : ''} onClick={() => player.command('track', t.id)}>
            <span className="calm-name">{t.title}</span>
            <span className="dim">{t.artist}</span>
            <span className="mono dim">{t.duration ? fmt(t.duration) : ''}</span>
            <span className="dim">{t.license}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}

function SpotifyTab(): JSX.Element {
  const [media, setMedia] = useState<MediaInfo | null>(null)
  usePoll(async () => setMedia(await window.znerol.audio.media()), 2500)
  const playing = media?.status === 'Playing'
  const control = async (a: 'prev' | 'next' | 'toggle'): Promise<void> => {
    await window.znerol.audio.mediaControl(a).catch(() => undefined)
    setTimeout(async () => setMedia(await window.znerol.audio.media()), 400)
  }
  return (
    <div className="spotify-tab">
      <div className="now-bar">
        <span className="station-logo big">{media?.art ? <img src={media.art} alt="" /> : '♫'}</span>
        <div className="now-text">
          <div className="np-app">{media?.title ? `${media.app || 'Musik'} · ${playing ? 'läuft' : 'pausiert'}` : 'Spotify & Co.'}</div>
          <div className="np-title">{media?.title || 'Gerade läuft nichts'}</div>
          <div className="np-artist">{media?.title ? media.artist : 'Starte einen Song in Spotify, YouTube oder einer anderen App – hier steuerst du ihn.'}</div>
        </div>
        <div className="np-controls">
          <button type="button" className="round-btn" aria-label="Zurück" onClick={() => control('prev')}>
            ‹‹
          </button>
          <button type="button" className="round-btn big" aria-label={playing ? 'Pause' : 'Abspielen'} onClick={() => control('toggle')}>
            {playing ? '❚❚' : '▶'}
          </button>
          <button type="button" className="round-btn" aria-label="Weiter" onClick={() => control('next')}>
            ››
          </button>
        </div>
      </div>
      <button type="button" className="btn" onClick={() => window.znerol.spotify.open()}>
        Spotify öffnen
      </button>
    </div>
  )
}

/** Music in one place: radio stations, the calm pieces and control of Spotify (or any other player). */
export default function MusicPanel({ compact = false, initialTab = 'radio' }: { compact?: boolean; initialTab?: Tab }): JSX.Element {
  const [tab, setTab] = useState<Tab>(initialTab)
  return (
    <div className={`music-panel ${compact ? 'compact' : ''}`}>
      {tab !== 'spotify' && <NowPlaying />}
      <div className="choice music-tabs" role="tablist">
        {(
          [
            ['radio', 'Radio'],
            ['calm', 'Ruhemusik'],
            ['spotify', 'Spotify']
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="music-body">
        {tab === 'radio' && <RadioTab compact={compact} />}
        {tab === 'calm' && <CalmTab />}
        {tab === 'spotify' && <SpotifyTab />}
      </div>
    </div>
  )
}
