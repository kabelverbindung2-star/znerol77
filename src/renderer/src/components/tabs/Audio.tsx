import { useEffect, useState } from 'react'
import Switch from '../ui/Switch'

interface AudioState {
  volume: number
  muted: boolean
  devices: { name: string; status: string }[]
}

export default function Audio(): JSX.Element {
  const [state, setState] = useState<AudioState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localVolume, setLocalVolume] = useState(0)

  const refresh = async (): Promise<void> => {
    try {
      const s = await window.znerol.audio.get()
      setState(s as AudioState)
      setLocalVolume((s as AudioState).volume)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 4000)
    return () => clearInterval(id)
  }, [])

  const applyVolume = async (value: number): Promise<void> => {
    setLocalVolume(value)
    try {
      await window.znerol.audio.setVolume(value)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const toggleMute = async (next: boolean): Promise<void> => {
    try {
      await window.znerol.audio.setMuted(next)
      await refresh()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Audio</div>
          <div className="page-subtitle">Systemlautstärke, Stummschaltung & Ausgabegeräte</div>
        </div>
      </div>

      {error && <div className="win-only-banner">⚠ {error}</div>}

      <div className="grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Master-Lautstärke</span>
            <Switch on={state?.muted ?? false} onToggle={toggleMute} />
          </div>
          <div className="card-value" style={{ marginBottom: 10 }}>
            {state?.muted ? 'Stumm' : `${localVolume}%`}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={localVolume}
            disabled={state?.muted}
            onChange={(e) => applyVolume(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
          />
          <div className="card-foot">Stummschaltung {state?.muted ? 'aktiv' : 'aus'} — Schalter oben rechts</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Ausgabegeräte</span>
          </div>
          {(!state || state.devices.length === 0) && <div className="empty-state">Keine Geräte gefunden</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state?.devices.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.03)'
                }}
              >
                <span style={{ fontSize: 13 }}>{d.name}</span>
                <span className={`badge`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
