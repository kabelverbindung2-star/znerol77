import { useEffect, useState } from 'react'
import Switch from '../ui/Switch'

interface AutostartEntry {
  id: string
  name: string
  command: string
  source: 'registry' | 'startup-folder'
  enabled: boolean
}

export default function Autostart(): JSX.Element {
  const [entries, setEntries] = useState<AutostartEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    try {
      const list = await window.znerol.autostart.list()
      setEntries(list as AutostartEntry[])
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const add = async (): Promise<void> => {
    if (!name.trim() || !command.trim()) return
    try {
      await window.znerol.autostart.add(name.trim(), command.trim())
      setName('')
      setCommand('')
      setShowForm(false)
      await refresh()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const remove = async (entry: AutostartEntry): Promise<void> => {
    if (!confirm(`"${entry.name}" wirklich aus dem Autostart entfernen?`)) return
    try {
      await window.znerol.autostart.remove(entry)
      await refresh()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const toggle = async (entry: AutostartEntry, enable: boolean): Promise<void> => {
    try {
      await window.znerol.autostart.toggle(entry, enable)
      await refresh()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Autostart</div>
          <div className="page-subtitle">Programme, die mit Windows starten</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          + Eintrag hinzufügen
        </button>
      </div>

      {error && <div className="win-only-banner">⚠ {error}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mein Programm" />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Befehl / Pfad</label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder='C:\Pfad\zu\programm.exe'
              />
            </div>
          </div>
          <div className="card-actions">
            <button className="btn btn-primary" onClick={add}>
              Speichern
            </button>
            <button className="btn" onClick={() => setShowForm(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Befehl</th>
              <th>Quelle</th>
              <th>Aktiv</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="empty-state">
                  Lade Autostart-Einträge…
                </td>
              </tr>
            )}
            {!loading && entries.length === 0 && !error && (
              <tr>
                <td colSpan={5} className="empty-state">
                  Keine Autostart-Einträge gefunden
                </td>
              </tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.name}</td>
                <td className="mono" style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {entry.command}
                </td>
                <td>
                  <span className="badge">{entry.source === 'registry' ? 'Registry' : 'Startup-Ordner'}</span>
                </td>
                <td>
                  <Switch
                    on={entry.enabled}
                    disabled={entry.source === 'startup-folder'}
                    onToggle={(next) => toggle(entry, next)}
                  />
                </td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => remove(entry)}>
                    Entfernen
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
