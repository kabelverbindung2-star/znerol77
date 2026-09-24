import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePoll } from '../../lib/usePoll'
import { useSettings } from '../../lib/useSettings'
import type { AudioDevice, AudioSession, MediaInfo } from '../../lib/types'

interface AppGroup {
  key: string
  name: string
  pids: number[]
  peak: number
  volume: number
  muted: boolean
  system: boolean
}

function mediaAppName(app: string): string {
  const a = app.toLowerCase()
  if (a.includes('spotify')) return 'Spotify'
  if (a.includes('chrome')) return 'Chrome'
  if (a.includes('msedge') || a.includes('edge')) return 'Edge'
  if (a.includes('firefox')) return 'Firefox'
  if (a.includes('vlc')) return 'VLC'
  return app.replace(/\.exe$/i, '').split(/[!_.]/)[0] || 'Medien'
}

function groupSessions(sessions: AudioSession[]): AppGroup[] {
  const map = new Map<string, AppGroup>()
  for (const s of sessions) {
    const key = s.system ? 'system' : s.process.toLowerCase()
    const g = map.get(key)
    if (g) {
      g.pids.push(s.pid)
      g.peak = Math.max(g.peak, s.peak)
      g.muted = g.muted && s.muted
      g.volume = Math.max(g.volume, s.volume)
    } else {
      map.set(key, {
        key,
        name: s.name || s.process,
        pids: [s.pid],
        peak: s.peak,
        volume: s.volume,
        muted: s.muted,
        system: s.system
      })
    }
  }
  // what is making sound right now first, system sounds last
  return [...map.values()].sort((a, b) => Number(a.system) - Number(b.system) || b.peak - a.peak || a.name.localeCompare(b.name))
}

const Icon = {
  prev: 'M19 20L9 12l10-8v16zM5 19V5',
  next: 'M5 4l10 8-10 8V4zM19 5v14',
  play: 'M6 4l14 8-14 8V4z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  speaker: 'M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14',
  muted: 'M11 5L6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6'
}

function Svg({ d, size = 18 }: { d: string; size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

export default function Audio(): JSX.Element {
  const { settings } = useSettings()
  const [media, setMedia] = useState<MediaInfo | null>(null)
  const [sessions, setSessions] = useState<AudioSession[]>([])
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [master, setMaster] = useState<{ volume: number; muted: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hotkeyInput, setHotkeyInput] = useState('')
  const [hotkeyMsg, setHotkeyMsg] = useState<string | null>(null)
  const lastSent = useRef(0)

  useEffect(() => setHotkeyInput(settings.audio.switchHotkey), [settings.audio.switchHotkey])

  const loadState = useCallback(async () => {
    try {
      const s = await window.znerol.audio.get()
      setDevices(s.devices)
      setMaster({ volume: s.volume, muted: s.muted })
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  usePoll(loadState, 6000)
  usePoll(async () => setSessions(await window.znerol.audio.sessions()), 1000)
  usePoll(async () => setMedia(await window.znerol.audio.media()), 2500)
  useEffect(() => window.znerol.audio.onChanged(() => void loadState()), [loadState])

  const groups = useMemo(() => groupSessions(sessions), [sessions])
  const playing = media && media.title && media.status === 'Playing'

  const control = async (action: 'prev' | 'next' | 'toggle'): Promise<void> => {
    try {
      await window.znerol.audio.mediaControl(action)
      setTimeout(async () => setMedia(await window.znerol.audio.media()), 400)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const setGroupVolume = (g: AppGroup, value: number, final = false): void => {
    setSessions((prev) => prev.map((s) => (g.pids.includes(s.pid) ? { ...s, volume: value } : s)))
    const now = Date.now()
    if (!final && now - lastSent.current < 90) return
    lastSent.current = now
    for (const pid of g.pids) window.znerol.audio.sessionVolume(pid, value).catch(() => undefined)
  }

  const toggleGroupMute = (g: AppGroup): void => {
    const next = !g.muted
    setSessions((prev) => prev.map((s) => (g.pids.includes(s.pid) ? { ...s, muted: next } : s)))
    for (const pid of g.pids) window.znerol.audio.sessionMute(pid, next).catch(() => undefined)
  }

  const setMasterVolume = (value: number, final = false): void => {
    setMaster((m) => (m ? { ...m, volume: value } : m))
    const now = Date.now()
    if (!final && now - lastSent.current < 90) return
    lastSent.current = now
    window.znerol.audio.setVolume(value).catch(() => undefined)
  }

  const applyHotkey = async (): Promise<void> => {
    const ok = await window.znerol.audio.setHotkey(hotkeyInput.trim())
    setHotkeyMsg(ok ? 'Gespeichert.' : 'Diese Taste ist schon belegt (z. B. vom Klicker) oder ungültig.')
  }

  const current = devices.find((d) => d.isDefault)

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Audio</div>
          <div className="page-subtitle">
            {current ? `Ausgabe: ${current.name}` : 'Ausgabegerät'} · <kbd>{settings.audio.switchHotkey || '–'}</kbd> wechselt das Gerät
          </div>
        </div>
        <button type="button" className="btn" onClick={() => window.znerol.audio.cycle()}>
          Gerät wechseln
        </button>
      </div>

      {error && <div className="win-only-banner">{error}</div>}

      <div className="audio-top">
        <div className="glass now-playing">
          {media && media.title ? (
            <>
              <div className="np-art">{media.art ? <img src={media.art} alt="" /> : <Svg d={Icon.speaker} size={34} />}</div>
              <div className="np-info">
                <div className="np-app">
                  {mediaAppName(media.app)} · {playing ? 'läuft gerade' : 'pausiert'}
                </div>
                <div className="np-title">{media.title}</div>
                <div className="np-artist">{media.artist || media.album}</div>
                <div className="np-controls">
                  <button type="button" className="round-btn" aria-label="Vorheriger Titel" disabled={!media.canPrev} onClick={() => control('prev')}>
                    <Svg d={Icon.prev} />
                  </button>
                  <button type="button" className="round-btn big" aria-label={playing ? 'Pause' : 'Abspielen'} onClick={() => control('toggle')}>
                    <Svg d={playing ? Icon.pause : Icon.play} size={20} />
                  </button>
                  <button type="button" className="round-btn" aria-label="Nächster Titel" disabled={!media.canNext} onClick={() => control('next')}>
                    <Svg d={Icon.next} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="np-empty">
              <Svg d={Icon.speaker} size={28} />
              <div>
                <div className="np-title">Gerade läuft keine Musik</div>
                <div className="np-artist">Starte Spotify oder ein Video, dann erscheint es hier mit Titel und Steuerung.</div>
              </div>
            </div>
          )}
        </div>

        <div className="glass master">
          <div className="panel-head">
            <span>Gesamtlautstärke</span>
            <span className="mono dim">{master?.muted ? 'stumm' : `${master?.volume ?? '–'} %`}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={master?.volume ?? 0}
            disabled={!master}
            aria-label="Gesamtlautstärke"
            onChange={(e) => setMasterVolume(Number(e.target.value))}
            onPointerUp={(e) => setMasterVolume(Number((e.target as HTMLInputElement).value), true)}
          />
          <button
            type="button"
            className={`btn ${master?.muted ? 'btn-primary' : ''}`}
            disabled={!master}
            onClick={async () => {
              if (!master) return
              await window.znerol.audio.setMuted(!master.muted)
              setMaster({ ...master, muted: !master.muted })
            }}
          >
            <Svg d={master?.muted ? Icon.muted : Icon.speaker} size={16} />
            {master?.muted ? 'Ton an' : 'Stumm'}
          </button>
        </div>
      </div>

      <div className="section-title">Was gerade Ton macht</div>
      <div className="glass panel">
        {groups.length === 0 && <div className="empty-state">Keine App gibt gerade Ton aus.</div>}
        {groups.map((g) => (
          <div key={g.key} className={`app-row ${g.peak > 0.01 ? 'live' : ''}`}>
            <span className="proc-icon">{g.name.charAt(0).toUpperCase()}</span>
            <div className="app-main">
              <div className="app-name">
                {g.name}
                {g.peak > 0.01 && <span className="live-badge">spielt</span>}
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ width: `${Math.min(100, Math.round(g.peak * 140))}%` }} />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={g.volume}
              className="app-volume"
              aria-label={`Lautstärke ${g.name}`}
              onChange={(e) => setGroupVolume(g, Number(e.target.value))}
              onPointerUp={(e) => setGroupVolume(g, Number((e.target as HTMLInputElement).value), true)}
            />
            <span className="mono dim app-pct">{g.volume}</span>
            <button
              type="button"
              className={`icon-btn mute ${g.muted ? 'active' : ''}`}
              aria-label={g.muted ? `${g.name} Ton an` : `${g.name} stummschalten`}
              aria-pressed={g.muted}
              onClick={() => toggleGroupMute(g)}
            >
              <Svg d={g.muted ? Icon.muted : Icon.speaker} size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="section-title">Ausgabegeräte</div>
      <div className="audio-bottom">
        <div className="glass panel">
          {devices.length === 0 && <div className="empty-state">Keine Geräte gefunden.</div>}
          {devices.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`device-row ${d.isDefault ? 'active' : ''}`}
              onClick={async () => {
                await window.znerol.audio.setDefault(d.id)
                loadState()
              }}
            >
              <span className={`radio ${d.isDefault ? 'on' : ''}`} />
              <span>{d.name}</span>
              {d.isDefault && <span className="badge">aktiv</span>}
            </button>
          ))}
        </div>
        <div className="glass panel">
          <div className="panel-head">
            <span>Taste zum Wechseln</span>
          </div>
          <div className="row" style={{ alignItems: 'center' }}>
            <input
              type="text"
              className="text-input"
              value={hotkeyInput}
              aria-label="Taste zum Wechseln des Ausgabegeräts"
              onChange={(e) => setHotkeyInput(e.target.value)}
              placeholder="F6"
            />
            <button type="button" className="btn" onClick={applyHotkey}>
              Übernehmen
            </button>
          </div>
          <div className="quick-sub" style={{ marginTop: 8 }}>
            {hotkeyMsg ??
              'Beispiele: F6, F7, Control+Alt+A. Die Fn-Taste geht nicht – die wertet die Tastatur selbst aus, Windows sieht sie nie.'}
          </div>
        </div>
      </div>
    </>
  )
}
