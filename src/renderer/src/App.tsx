import { useEffect, useState, type CSSProperties } from 'react'
import Background from './components/Background'
import WallpaperPanel from './components/WallpaperPanel'
import Uebersicht from './components/tabs/Uebersicht'
import Prozesse from './components/tabs/Prozesse'
import Autostart from './components/tabs/Autostart'
import Autoclicker from './components/tabs/Autoclicker'
import Audio from './components/tabs/Audio'
import Spiele from './components/tabs/Spiele'
import { usePerf } from './lib/usePerf'
import { useSettings } from './lib/useSettings'
import { useWallpapers } from './lib/useWallpapers'

const TABS = [
  { id: 'uebersicht', label: 'Übersicht' },
  { id: 'prozesse', label: 'Prozesse' },
  { id: 'autostart', label: 'Autostart' },
  { id: 'autoclicker', label: 'Klicker' },
  { id: 'audio', label: 'Audio' },
  { id: 'spiele', label: 'Spiele' }
] as const

type TabId = (typeof TABS)[number]['id']

export default function App(): JSX.Element {
  const [tab, setTab] = useState<TabId>('uebersicht')
  const [panelOpen, setPanelOpen] = useState(false)
  const [isWindows, setIsWindows] = useState(true)
  const [hotkeys, setHotkeys] = useState({ menu: 'Alt+Q', hide: 'Alt+H' })
  const [appUpdate, setAppUpdate] = useState<{ status: string; version?: string }>({ status: 'idle' })
  const { sample, history } = usePerf()
  const { settings, update } = useSettings()
  const walls = useWallpapers(settings, update)

  useEffect(() => {
    window.znerol.system
      .info()
      .then((info: any) => {
        setIsWindows(Boolean(info?.isWindows))
        if (info?.hotkeys) setHotkeys(info.hotkeys)
      })
      .catch(() => setIsWindows(false))
    window.znerol.update.state().then(setAppUpdate).catch(() => undefined)
    const offUpdate = window.znerol.update.onChanged((s) => setAppUpdate(s as { status: string; version?: string }))
    const offNav = window.znerol.nav.onGoto((t) => {
      if (TABS.some((x) => x.id === t)) setTab(t as TabId)
    })
    return () => {
      offUpdate()
      offNav()
    }
  }, [])

  const style = {
    '--accent': settings.accent,
    '--blur': `${settings.wallpaper.blur}px`
  } as CSSProperties

  const goto = (t: string): void => {
    if (TABS.some((x) => x.id === t)) setTab(t as TabId)
  }

  return (
    <div className={`app ${panelOpen ? 'with-panel' : ''}`} style={style}>
      <Background wallpaper={walls.current} dim={settings.wallpaper.dim} />

      <header className="titlebar">
        <span className="logo">Znerol</span>
        <nav className="segmented" aria-label="Bereiche">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'active' : ''}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        {appUpdate.status === 'ready' && (
          <button type="button" className="update-btn" onClick={() => window.znerol.update.install()}>
            Update {appUpdate.version} · jetzt neu starten
          </button>
        )}
        {appUpdate.status === 'downloading' && <span className="update-note">Update {appUpdate.version} wird geladen…</span>}
        <button
          type="button"
          className={`icon-btn ${panelOpen ? 'active' : ''}`}
          aria-label="Hintergrund-Einstellungen"
          aria-pressed={panelOpen}
          onClick={() => setPanelOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>
      </header>

      <main className="content">
        {!isWindows && tab !== 'uebersicht' && tab !== 'prozesse' && (
          <div className="win-only-banner">Diese Funktion braucht Windows. Hier läuft nur die Anzeige.</div>
        )}
        {tab === 'uebersicht' && (
          <Uebersicht sample={sample} history={history} settings={settings} update={update} goto={goto} hotkeys={hotkeys} />
        )}
        {tab === 'prozesse' && <Prozesse />}
        {tab === 'autostart' && <Autostart />}
        {tab === 'autoclicker' && <Autoclicker />}
        {tab === 'audio' && <Audio />}
        {tab === 'spiele' && <Spiele />}
      </main>

      {panelOpen && (
        <WallpaperPanel
          settings={settings}
          update={update}
          all={walls.all}
          current={walls.current}
          nextAt={walls.nextAt}
          onSelect={walls.select}
          onNext={walls.next}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {walls.current.credit && <div className="credit">{walls.current.name} · {walls.current.credit}</div>}
    </div>
  )
}
