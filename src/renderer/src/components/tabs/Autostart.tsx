import { useEffect, useMemo, useState } from 'react'
import Switch from '../ui/Switch'

type Source = 'hkcu-run' | 'hklm-run' | 'hklm-run32' | 'user-folder' | 'common-folder' | 'task'

interface AutostartEntry {
  id: string
  name: string
  command: string
  source: Source
  location: string
  enabled: boolean
  needsAdmin: boolean
  file?: string
  taskPath?: string
}

const FILTERS: { id: 'all' | 'registry' | 'folder' | 'task' | 'off'; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'registry', label: 'Registry' },
  { id: 'folder', label: 'Autostart-Ordner' },
  { id: 'task', label: 'Aufgabenplanung' },
  { id: 'off', label: 'Ausgeschaltet' }
]

export default function Autostart(): JSX.Element {
  const [entries, setEntries] = useState<AutostartEntry[]>([])
  const [icons, setIcons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [command, setCommand] = useState('')

  const refresh = async (): Promise<void> => {
    setLoading(true)
    try {
      const list: AutostartEntry[] = await window.znerol.autostart.list()
      setEntries(list)
      setError(null)
      const paths = [...new Set(list.map((e) => e.command).filter(Boolean))]
      window.znerol.autostart.icons(paths).then(setIcons).catch(() => undefined)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const run = async (entry: AutostartEntry, fn: () => Promise<unknown>): Promise<void> => {
    setBusy(entry.id)
    try {
      await fn()
      await refresh()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (q && !e.name.toLowerCase().includes(q) && !e.command.toLowerCase().includes(q)) return false
      if (filter === 'registry') return e.source.includes('run')
      if (filter === 'folder') return e.source.endsWith('folder')
      if (filter === 'task') return e.source === 'task'
      if (filter === 'off') return !e.enabled
      return true
    })
  }, [entries, filter, query])

  const on = entries.filter((e) => e.enabled).length

  const pick = async (): Promise<void> => {
    const file = await window.znerol.autostart.pickFile()
    if (!file) return
    setCommand(`"${file}"`)
    if (!name) setName(file.split('\\').pop()?.replace(/\.[^.]+$/, '') ?? '')
  }

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

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Autostart</div>
          <div className="page-subtitle">
            {loading ? 'Lese Einträge …' : `${entries.length} Programme starten mit Windows · ${on} an, ${entries.length - on} aus`}
          </div>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={refresh} disabled={loading}>
            Neu laden
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            + Programm hinzufügen
          </button>
        </div>
      </div>

      {error && <div className="win-only-banner">{error}</div>}

      {showForm && (
        <div className="glass panel" style={{ marginBottom: 14 }}>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="as-name">Name</label>
              <input id="as-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mein Programm" />
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label htmlFor="as-cmd">Programm</label>
              <input id="as-cmd" type="text" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="C:\Pfad\zu\programm.exe" />
            </div>
            <button type="button" className="btn" style={{ marginBottom: 14 }} onClick={pick}>
              Durchsuchen …
            </button>
          </div>
          <div className="card-actions">
            <button type="button" className="btn btn-primary" onClick={add}>
              Hinzufügen
            </button>
            <button type="button" className="btn" onClick={() => setShowForm(false)}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="as-toolbar">
        <div className="choice">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
        <input className="text-input" style={{ maxWidth: 260 }} placeholder="Suchen …" value={query} aria-label="Autostart durchsuchen" onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="glass panel as-list">
        {!loading && visible.length === 0 && <div className="empty-state">Keine Einträge</div>}
        {visible.map((e) => (
          <div key={e.id} className={`as-row ${e.enabled ? '' : 'off'}`}>
            <span className="as-icon">{icons[e.command] ? <img src={icons[e.command]} alt="" /> : e.name.charAt(0).toUpperCase()}</span>
            <div className="as-main">
              <div className="as-name">
                {e.name}
                {e.needsAdmin && <span className="badge" title="Ändern fragt nach Administratorrechten">Admin</span>}
              </div>
              <div className="as-cmd mono" title={e.command}>
                {e.command || '–'}
              </div>
              <div className="quick-sub">{e.location}</div>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => window.znerol.autostart.reveal(e)} title="Im Explorer zeigen">
              Ordner
            </button>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              disabled={busy === e.id}
              onClick={() => confirm(`„${e.name}“ endgültig aus dem Autostart entfernen?`) && run(e, () => window.znerol.autostart.remove(e))}
            >
              Entfernen
            </button>
            <Switch on={e.enabled} disabled={busy === e.id} onToggle={(v) => run(e, () => window.znerol.autostart.toggle(e, v))} />
          </div>
        ))}
      </div>
      <div className="quick-sub" style={{ marginTop: 10 }}>
        Ausschalten funktioniert wie im Windows-Task-Manager: Der Eintrag bleibt da, startet aber nicht mehr mit. Einträge mit „Admin“
        gelten für alle Benutzer – Windows fragt dann einmal nach Erlaubnis.
      </div>
    </>
  )
}
