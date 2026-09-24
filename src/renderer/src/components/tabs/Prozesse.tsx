import { useEffect, useMemo, useState } from 'react'
import { formatMB } from '../../lib/format'

interface ProcInfo {
  pid: number
  name: string
  cpu: number
  memPercent: number
  memMB: number
  user: string
  priority: number
}

type SortKey = 'cpu' | 'memPercent' | 'name'

export default function Prozesse(): JSX.Element {
  const [procs, setProcs] = useState<ProcInfo[]>([])
  const [filter, setFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('cpu')
  const [loading, setLoading] = useState(true)
  const [busyPid, setBusyPid] = useState<number | null>(null)

  const refresh = async (): Promise<void> => {
    try {
      const list = await window.znerol.processes.list()
      setProcs(list as ProcInfo[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 2500)
    return () => clearInterval(id)
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const list = q ? procs.filter((p) => p.name.toLowerCase().includes(q) || String(p.pid).includes(q)) : procs
    return [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      return (b[sortKey] as number) - (a[sortKey] as number)
    })
  }, [procs, filter, sortKey])

  const kill = async (pid: number): Promise<void> => {
    setBusyPid(pid)
    try {
      await window.znerol.processes.kill(pid)
      await refresh()
    } catch (e) {
      alert(`Konnte Prozess nicht beenden: ${(e as Error).message}`)
    } finally {
      setBusyPid(null)
    }
  }

  const setPriority = async (pid: number, level: string): Promise<void> => {
    try {
      await window.znerol.processes.setPriority(pid, level)
      await refresh()
    } catch (e) {
      alert(`Priorität konnte nicht gesetzt werden: ${(e as Error).message}`)
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Prozesse</div>
          <div className="page-subtitle">{filtered.length} von {procs.length} Prozessen</div>
        </div>
        <input
          type="text"
          placeholder="Suchen nach Name oder PID…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--card-border)',
            borderRadius: 10,
            padding: '8px 12px',
            color: 'var(--text)',
            fontSize: 13,
            width: 240
          }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th onClick={() => setSortKey('name')} style={{ cursor: 'pointer' }}>
                  Name
                </th>
                <th>PID</th>
                <th onClick={() => setSortKey('cpu')} style={{ cursor: 'pointer' }}>
                  CPU %
                </th>
                <th onClick={() => setSortKey('memPercent')} style={{ cursor: 'pointer' }}>
                  RAM
                </th>
                <th>Priorität</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Lade Prozesse…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-state">
                    Keine Prozesse gefunden
                  </td>
                </tr>
              )}
              {filtered.slice(0, 200).map((p) => (
                <tr key={p.pid}>
                  <td>{p.name}</td>
                  <td className="mono">{p.pid}</td>
                  <td className="mono">{p.cpu.toFixed(1)}</td>
                  <td className="mono">
                    {formatMB(p.memMB)} <span style={{ color: 'var(--text-faint)' }}>({p.memPercent.toFixed(1)}%)</span>
                  </td>
                  <td>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) setPriority(p.pid, e.target.value)
                        e.target.value = ''
                      }}
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-dim)',
                        border: '1px solid var(--card-border)',
                        borderRadius: 6,
                        fontSize: 11.5,
                        padding: '3px 6px'
                      }}
                    >
                      <option value="">ändern…</option>
                      <option value="low">Niedrig</option>
                      <option value="belownormal">Unter Normal</option>
                      <option value="normal">Normal</option>
                      <option value="abovenormal">Über Normal</option>
                      <option value="high">Hoch</option>
                      <option value="realtime">Echtzeit</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={busyPid === p.pid}
                      onClick={() => kill(p.pid)}
                    >
                      Beenden
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
