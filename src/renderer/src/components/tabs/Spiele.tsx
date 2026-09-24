import { useEffect, useState } from 'react'
import InfoTip from '../ui/InfoTip'
import { BoostExplainer, DEFAULT_BLOCKLIST } from './Uebersicht'

interface GameEntry {
  appId: string
  name: string
  installDir: string
}

const BLOCKLIST_KEY = 'znerol.boost.blocklist'

export default function Spiele(): JSX.Element {
  const [games, setGames] = useState<GameEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [boostOn, setBoostOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [blocklistText, setBlocklistText] = useState('')

  useEffect(() => {
    window.znerol.games
      .list()
      .then((list: GameEntry[]) => setGames(list))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))

    const saved = localStorage.getItem(BLOCKLIST_KEY)
    setBlocklistText(saved ? JSON.parse(saved).join(', ') : DEFAULT_BLOCKLIST.join(', '))

    window.znerol.games.boostState().then(setBoostOn).catch(() => undefined)
    return window.znerol.games.onBoost(setBoostOn)
  }, [])

  const launch = (appId: string): void => {
    window.znerol.games.launch(appId).catch((e: Error) => alert(e.message))
  }

  const blocklist = (): string[] =>
    blocklistText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const persistBlocklist = (): void => {
    localStorage.setItem(BLOCKLIST_KEY, JSON.stringify(blocklist()))
  }

  const toggleBoost = async (): Promise<void> => {
    setBusy(true)
    try {
      if (!boostOn) {
        persistBlocklist()
        await window.znerol.games.boostOn(blocklist())
        setBoostOn(true)
      } else {
        await window.znerol.games.boostOff()
        setBoostOn(false)
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Spiele</div>
          <div className="page-subtitle">Installierte Steam-Spiele & Gaming-Boost-Modus</div>
        </div>
        <InfoTip text={<BoostExplainer />}>
          <button className={`btn ${boostOn ? 'btn-danger' : 'btn-primary'}`} onClick={toggleBoost} disabled={busy}>
            {boostOn ? 'Boost beenden' : 'Boost starten'}
          </button>
        </InfoTip>
      </div>

      {error && <div className="win-only-banner">⚠ {error}</div>}
      {boostOn && (
        <div className="win-only-banner" style={{ background: 'rgba(53,214,138,0.1)', borderColor: 'rgba(53,214,138,0.3)', color: 'var(--accent-green)' }}>
          ⚡ Boost aktiv: Höchstleistungs-Energieplan gesetzt, Hintergrundprozesse beendet.
        </div>
      )}

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>
          Boost blockiert diese Hintergrundprozesse
        </div>
        <input
          type="text"
          value={blocklistText}
          onChange={(e) => setBlocklistText(e.target.value)}
          onBlur={persistBlocklist}
          placeholder="OneDrive, Spotify, Discord"
          style={{
            width: '100%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--card-border)',
            borderRadius: 10,
            padding: '9px 11px',
            color: 'var(--text)',
            fontSize: 13
          }}
        />
        <div className="card-foot">Kommagetrennte Prozessnamen — werden beim Aktivieren des Boosts beendet.</div>
      </div>

      <div className="section-title">Bibliothek</div>
      {loading && <div className="empty-state">Suche installierte Spiele…</div>}
      {!loading && games.length === 0 && !error && (
        <div className="empty-state">Keine Steam-Bibliothek gefunden</div>
      )}
      <div className="grid">
        {games.map((g) => (
          <div className="card" key={g.appId}>
            <div className="card-header">
              <span className="card-title">Steam</span>
              <span className="badge">#{g.appId}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{g.name}</div>
            <button className="btn btn-primary btn-sm" onClick={() => launch(g.appId)}>
              ▶ Starten
            </button>
          </div>
        ))}
      </div>
    </>
  )
}
