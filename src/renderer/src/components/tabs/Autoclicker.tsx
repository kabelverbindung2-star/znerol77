import { useEffect, useState } from 'react'

interface Profile {
  id: string
  name: string
  intervalMs: number
  jitterMs: number
  button: 'left' | 'right' | 'middle'
  mode: 'single' | 'double'
  target: 'current' | 'fixed'
  x: number
  y: number
  clickLimit: number
  hotkey: string
}

interface Status {
  running: boolean
  clicks: number
  profileId: string | null
  error: string | null
}

const STORAGE_KEY = 'znerol.autoclicker.profiles'

function loadProfiles(fallback: Profile[]): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      // F6 now switches the audio device; move the untouched default profile to F8
      return (JSON.parse(raw) as Profile[]).map((p) => (p.id === 'default' && p.hotkey === 'F6' ? { ...p, hotkey: 'F8' } : p))
    }
  } catch {
    // ignore corrupt storage
  }
  return fallback
}

export default function Autoclicker(): JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const [status, setStatus] = useState<Status>({ running: false, clicks: 0, profileId: null, error: null })
  const [hotkeyStatus, setHotkeyStatus] = useState<'idle' | 'ok' | 'failed'>('idle')

  useEffect(() => {
    window.znerol.autoclicker.defaultProfiles().then((defaults: Profile[]) => {
      const loaded = loadProfiles(defaults)
      setProfiles(loaded)
      setActiveId(loaded[0]?.id ?? '')
    })
    const off = window.znerol.autoclicker.onStatus((s: unknown) => setStatus(s as Status))
    window.znerol.autoclicker.status().then((s: unknown) => setStatus(s as Status))
    return () => off?.()
  }, [])

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0]

  const persist = (next: Profile[]): void => {
    setProfiles(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const updateActive = (patch: Partial<Profile>): void => {
    if (!active) return
    persist(profiles.map((p) => (p.id === active.id ? { ...p, ...patch } : p)))
  }

  const addProfile = (): void => {
    const id = `profile-${Date.now()}`
    const base: Profile = active
      ? { ...active, id, name: `${active.name} Kopie` }
      : {
          id,
          name: 'Neues Profil',
          intervalMs: 100,
          jitterMs: 10,
          button: 'left',
          mode: 'single',
          target: 'current',
          x: 0,
          y: 0,
          clickLimit: 0,
          hotkey: ''
        }
    persist([...profiles, base])
    setActiveId(id)
  }

  const deleteProfile = (): void => {
    if (!active || profiles.length <= 1) return
    const next = profiles.filter((p) => p.id !== active.id)
    persist(next)
    setActiveId(next[0].id)
  }

  const start = async (): Promise<void> => {
    if (!active) return
    try {
      await window.znerol.autoclicker.start(active)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const stop = async (): Promise<void> => {
    await window.znerol.autoclicker.stop()
  }

  const applyHotkey = async (): Promise<void> => {
    if (!active) return
    try {
      const ok = await window.znerol.autoclicker.setHotkey(active.hotkey, active)
      setHotkeyStatus(ok ? 'ok' : 'failed')
    } catch {
      setHotkeyStatus('failed')
    }
  }

  if (!active) {
    return <div className="empty-state">Lade Profile…</div>
  }

  const isRunningThis = status.running && status.profileId === active.id

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Autoclicker</div>
          <div className="page-subtitle">Profile, Hotkeys, Zufalls-Delay & mehrere Klick-Modi</div>
        </div>
        {status.running ? (
          <span className="pill">● Aktiv · {status.clicks} Klicks</span>
        ) : (
          <span className="pill off">Gestoppt</span>
        )}
      </div>

      {status.error && <div className="win-only-banner">⚠ {status.error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '260px 1fr', alignItems: 'start' }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 10 }}>
            Profile
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {profiles.map((p) => (
              <button
                key={p.id}
                className={`nav-item ${p.id === active.id ? 'active' : ''}`}
                onClick={() => setActiveId(p.id)}
              >
                {p.name}
                {status.running && status.profileId === p.id && (
                  <span style={{ marginLeft: 'auto', color: 'var(--accent-green)' }}>●</span>
                )}
              </button>
            ))}
          </div>
          <div className="card-actions">
            <button className="btn btn-sm" onClick={addProfile}>
              + Neu
            </button>
            <button className="btn btn-sm btn-danger" onClick={deleteProfile} disabled={profiles.length <= 1}>
              Löschen
            </button>
          </div>
        </div>

        <div className="card">
          <div className="field">
            <label>Profilname</label>
            <input type="text" value={active.name} onChange={(e) => updateActive({ name: e.target.value })} />
          </div>

          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Intervall (ms)</label>
              <input
                type="number"
                min={1}
                value={active.intervalMs}
                onChange={(e) => updateActive({ intervalMs: Number(e.target.value) })}
              />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Zufalls-Verzögerung (± ms)</label>
              <input
                type="number"
                min={0}
                value={active.jitterMs}
                onChange={(e) => updateActive({ jitterMs: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Maustaste</label>
              <select value={active.button} onChange={(e) => updateActive({ button: e.target.value as Profile['button'] })}>
                <option value="left">Links</option>
                <option value="right">Rechts</option>
                <option value="middle">Mitte</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Klick-Modus</label>
              <select value={active.mode} onChange={(e) => updateActive({ mode: e.target.value as Profile['mode'] })}>
                <option value="single">Einzelklick</option>
                <option value="double">Doppelklick</option>
              </select>
            </div>
          </div>

          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Zielposition</label>
              <select value={active.target} onChange={(e) => updateActive({ target: e.target.value as Profile['target'] })}>
                <option value="current">Aktuelle Mausposition</option>
                <option value="fixed">Feste Koordinaten</option>
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Klick-Limit (0 = unendlich)</label>
              <input
                type="number"
                min={0}
                value={active.clickLimit}
                onChange={(e) => updateActive({ clickLimit: Number(e.target.value) })}
              />
            </div>
          </div>

          {active.target === 'fixed' && (
            <div className="row">
              <div className="field" style={{ flex: 1 }}>
                <label>X</label>
                <input type="number" value={active.x} onChange={(e) => updateActive({ x: Number(e.target.value) })} />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Y</label>
                <input type="number" value={active.y} onChange={(e) => updateActive({ y: Number(e.target.value) })} />
              </div>
            </div>
          )}

          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Starttaste (z. B. F8, Control+Alt+K)</label>
              <input type="text" value={active.hotkey} onChange={(e) => updateActive({ hotkey: e.target.value })} />
            </div>
            <button className="btn" style={{ marginBottom: 14 }} onClick={applyHotkey}>
              Hotkey aktivieren
            </button>
          </div>
          {hotkeyStatus === 'ok' && <div className="page-subtitle">Hotkey aktiv — startet/stoppt dieses Profil.</div>}
          {hotkeyStatus === 'failed' && (
            <div className="win-only-banner">Diese Taste ist schon belegt (F6 wechselt z. B. das Audiogerät) oder ungültig.</div>
          )}

          <div className="card-actions">
            {!isRunningThis ? (
              <button className="btn btn-primary" onClick={start}>
                ▶ Starten
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stop}>
                ■ Stoppen
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
