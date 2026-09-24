import { useEffect, useState } from 'react'
import {
  ActivityIcon,
  ListIcon,
  PowerIcon,
  ClickIcon,
  VolumeIcon,
  GamepadIcon,
  SunIcon,
  MoonIcon
} from './components/ui/Icons'
import Leistung from './components/tabs/Leistung'
import Prozesse from './components/tabs/Prozesse'
import Autostart from './components/tabs/Autostart'
import Autoclicker from './components/tabs/Autoclicker'
import Audio from './components/tabs/Audio'
import Spiele from './components/tabs/Spiele'

const TABS = [
  { id: 'leistung', label: 'Leistung', icon: ActivityIcon, component: Leistung },
  { id: 'prozesse', label: 'Prozesse', icon: ListIcon, component: Prozesse },
  { id: 'autostart', label: 'Autostart', icon: PowerIcon, component: Autostart },
  { id: 'autoclicker', label: 'Autoclicker', icon: ClickIcon, component: Autoclicker },
  { id: 'audio', label: 'Audio', icon: VolumeIcon, component: Audio },
  { id: 'spiele', label: 'Spiele', icon: GamepadIcon, component: Spiele }
] as const

type TabId = (typeof TABS)[number]['id']

export default function App(): JSX.Element {
  const [active, setActive] = useState<TabId>('leistung')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isWindows, setIsWindows] = useState(true)

  useEffect(() => {
    window.znerol?.system
      .info()
      .then((info: any) => setIsWindows(Boolean(info?.isWindows)))
      .catch(() => setIsWindows(false))
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const ActiveComponent = TABS.find((t) => t.id === active)?.component ?? Leistung

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" />
          <span className="brand-name">ZnerolMonitor</span>
        </div>
        <nav className="nav">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={`nav-item ${active === tab.id ? 'active' : ''}`}
                onClick={() => setActive(tab.id)}
              >
                <Icon className="nav-icon" />
                {tab.label}
              </button>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            <span>{theme === 'dark' ? 'Dunkles Design' : 'Helles Design'}</span>
            {theme === 'dark' ? <MoonIcon className="nav-icon" /> : <SunIcon className="nav-icon" />}
          </button>
          {!isWindows && <span>⚠ Systemfunktionen benötigen Windows</span>}
          <span>v1.0.0</span>
        </div>
      </aside>
      <main className="main">
        <ActiveComponent />
      </main>
    </div>
  )
}
