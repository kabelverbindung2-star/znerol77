import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react'
import Background from './components/Background'
import WallpaperPanel from './components/WallpaperPanel'
import WallpaperInfo from './components/WallpaperInfo'
import NavIcon from './components/ui/NavIcon'
import Uebersicht from './components/tabs/Uebersicht'
import Prozesse from './components/tabs/Prozesse'
import Autostart from './components/tabs/Autostart'
import Autoclicker from './components/tabs/Autoclicker'
import Audio from './components/tabs/Audio'
import Spiele from './components/tabs/Spiele'
import Werkzeuge from './components/tabs/Werkzeuge'
import Einstellungen from './components/tabs/Einstellungen'
import { usePerf } from './lib/usePerf'
import { useSettings } from './lib/useSettings'
import { useWallpapers } from './lib/useWallpapers'
import { useTimerAlarm } from './lib/timers'

// the drawing canvas is the heaviest page; load it only when opened
const Zeichnen = lazy(() => import('./components/tabs/Zeichnen'))

const TABS = [
  { id: 'uebersicht', label: 'Übersicht' },
  { id: 'prozesse', label: 'Prozesse' },
  { id: 'autostart', label: 'Autostart' },
  { id: 'autoclicker', label: 'Klicker' },
  { id: 'audio', label: 'Audio' },
  { id: 'spiele', label: 'Spiele' },
  { id: 'zeichnen', label: 'Zeichnen' },
  { id: 'werkzeuge', label: 'Werkzeuge' }
] as const

type TabId = (typeof TABS)[number]['id'] | 'einstellungen'

const LIME = '#c6f432'

/** Dark or light text on top of the accent colour, whichever is readable. */
function inkFor(hex: string): string {
  const m = hex.replace('#', '')
  const n = parseInt(m.length === 3 ? m.replace(/./g, '$&$&') : m, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return lum > 0.6 ? '#0a0b09' : '#ffffff'
}

export default function App(): JSX.Element {
  const [tab, setTab] = useState<TabId>('uebersicht')
  const [panelOpen, setPanelOpen] = useState(false)
  const [isWindows, setIsWindows] = useState(true)
  const [hotkeys, setHotkeys] = useState({ menu: 'Alt+Q', hide: 'Alt+H' })
  const [appUpdate, setAppUpdate] = useState<{ status: string; version?: string }>({ status: 'idle' })
  const { sample, history } = usePerf()
  const { settings, update } = useSettings()
  const ringing = useTimerAlarm()

  const { style: look, mode, background } = settings.appearance
  const glass = look === 'glass'
  const showPicture = glass && (background === 'photos' || background === 'fixed')
  const transparent = glass && background === 'transparent'
  const walls = useWallpapers(settings, update, showPicture && background === 'photos')

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
    const offNav = window.znerol.nav.onGoto((t) => setTab(t as TabId))
    return () => {
      offUpdate()
      offNav()
    }
  }, [])

  // the page itself must be see-through for the Windows acrylic material to show
  useEffect(() => {
    document.documentElement.dataset.bg = transparent ? 'transparent' : 'solid'
  }, [transparent])

  useEffect(() => {
    if (!showPicture) setPanelOpen(false)
  }, [showPicture])

  // lime is hard to read on the light basic style; use a calm blue there unless changed
  let accent = settings.accent
  if (!glass && mode === 'light' && accent.toLowerCase() === LIME) accent = '#2563eb'

  const style = {
    '--accent': accent,
    '--accent-ink': inkFor(accent),
    '--blur': `${settings.wallpaper.blur}px`
  } as CSSProperties

  const cls = [
    'app',
    glass ? 'theme-glass' : `theme-basic mode-${mode}`,
    panelOpen ? 'with-panel' : '',
    glass && !settings.wallpaper.glass ? 'no-glass' : '',
    transparent ? 'bg-transparent' : '',
    glass && background === 'plain' ? 'bg-plain' : ''
  ]
    .filter(Boolean)
    .join(' ')

  const needsWindows = !isWindows && ['autostart', 'autoclicker', 'audio'].includes(tab)

  return (
    <div className={cls} style={style}>
      {showPicture && <Background wallpaper={walls.current} dim={settings.wallpaper.dim} />}

      <div className="drag-strip" />

      <aside className="sidebar glass">
        <div className="brand">
          <span className="brand-mark" />
          <span>Znerol</span>
        </div>
        <nav className="side-nav" aria-label="Bereiche">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'active' : ''}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              <NavIcon name={t.id} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          {appUpdate.status === 'ready' && (
            <button type="button" className="update-btn" onClick={() => window.znerol.update.install()}>
              Update {appUpdate.version} · neu starten
            </button>
          )}
          {appUpdate.status === 'downloading' && <span className="update-note">Update {appUpdate.version} lädt …</span>}
          {showPicture && (
            <button type="button" className={panelOpen ? 'active' : ''} aria-pressed={panelOpen} onClick={() => setPanelOpen((v) => !v)}>
              <NavIcon name="bild" />
              <span>Hintergrund</span>
            </button>
          )}
          <button
            type="button"
            className={tab === 'einstellungen' ? 'active' : ''}
            aria-current={tab === 'einstellungen' ? 'page' : undefined}
            onClick={() => setTab('einstellungen')}
          >
            <NavIcon name="einstellungen" />
            <span>Einstellungen</span>
          </button>
        </div>
      </aside>

      <main className={`content content-${tab}`}>
        {needsWindows && <div className="win-only-banner">Diese Funktion braucht Windows. Hier läuft nur die Anzeige.</div>}
        {ringing && <div className="timer-ring">Timer abgelaufen</div>}
        {tab === 'uebersicht' && (
          <Uebersicht sample={sample} history={history} settings={settings} update={update} goto={(t) => setTab(t as TabId)} hotkeys={hotkeys} />
        )}
        {tab === 'prozesse' && <Prozesse />}
        {tab === 'autostart' && <Autostart />}
        {tab === 'autoclicker' && <Autoclicker />}
        {tab === 'audio' && <Audio />}
        {tab === 'spiele' && <Spiele />}
        {tab === 'zeichnen' && (
          <Suspense fallback={<div className="empty-state">Lade …</div>}>
            <Zeichnen />
          </Suspense>
        )}
        {tab === 'werkzeuge' && <Werkzeuge />}
        {tab === 'einstellungen' && (
          <Einstellungen settings={settings} update={update} hotkeys={hotkeys} openWallpapers={() => setPanelOpen(true)} />
        )}
      </main>

      {panelOpen && showPicture && (
        <WallpaperPanel
          settings={settings}
          update={update}
          all={walls.all}
          current={walls.current}
          nextAt={background === 'photos' ? walls.nextAt : null}
          fixed={background === 'fixed'}
          onSelect={walls.select}
          onNext={walls.next}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {showPicture && <WallpaperInfo wallpaper={walls.current} />}
    </div>
  )
}
