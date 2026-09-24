import { useEffect, useState } from 'react'
import Scene from './ui/Scene'
import Switch from './ui/Switch'
import { paletteFor } from '../lib/palettes'
import type { Settings, Wallpaper } from '../lib/types'
import type { SettingsPatch } from '../lib/useSettings'

interface Props {
  settings: Settings
  update: (patch: SettingsPatch) => Promise<void>
  all: Wallpaper[]
  current: Wallpaper
  nextAt: number | null
  fixed?: boolean
  onSelect: (id: string) => void
  onNext: () => void
  onClose: () => void
}

function Thumb({ wp }: { wp: Wallpaper }): JSX.Element {
  if (wp.source === 'builtin') return <Scene p={paletteFor(wp.id)} idSuffix={`t${wp.name}`} />
  return <img src={wp.url} alt="" loading="lazy" draggable={false} />
}

function countdown(nextAt: number | null, now: number): string {
  if (!nextAt) return 'Wechsel aus'
  const s = Math.max(0, Math.round((nextAt - now) / 1000))
  return `nächstes in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function WallpaperPanel(props: Props): JSX.Element {
  const { settings, update, all, current, nextAt, fixed = false, onSelect, onNext, onClose } = props
  const [now, setNow] = useState(Date.now())
  const [syncing, setSyncing] = useState(false)
  const wp = settings.wallpaper

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const photos = all.filter((w) => w.source === 'commons')
  const own = all.filter((w) => w.source === 'custom')
  const drawn = all.filter((w) => w.source === 'builtin')

  const sync = async (): Promise<void> => {
    setSyncing(true)
    try {
      await window.znerol.wallpapers.sync()
    } finally {
      setSyncing(false)
    }
  }

  const group = (title: string, list: Wallpaper[], removable = false): JSX.Element | null =>
    list.length === 0 ? null : (
      <section className="wp-group">
        <div className="wp-group-title">
          {title} <span>{list.length}</span>
        </div>
        <div className="wp-grid">
          {list.map((w) => (
            <div key={w.id} className={`wp-thumb ${w.id === current.id ? 'selected' : ''}`}>
              <button type="button" className="wp-thumb-btn" aria-label={w.name} title={w.name} onClick={() => onSelect(w.id)}>
                <Thumb wp={w} />
              </button>
              {removable && (
                <button
                  type="button"
                  className="wp-remove"
                  aria-label={`${w.name} entfernen`}
                  onClick={() => window.znerol.wallpapers.removeCustom(w.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    )

  return (
    <aside className="wp-panel glass" aria-label="Hintergrund-Einstellungen">
      <div className="wp-head">
        <span className="wp-title">Hintergrund</span>
        <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="wp-preview">
        <Thumb wp={current} />
      </div>
      <div className="wp-meta">
        <div className="wp-name">{current.name}</div>
        <div className="wp-sub">{current.credit ?? (current.source === 'builtin' ? 'Gezeichnete Szene' : 'Eigenes Bild')}</div>
        {!fixed && (
          <div className="wp-row">
            <span className="wp-sub">{countdown(nextAt, now)}</span>
            <button type="button" className="link-btn" onClick={onNext}>
              Jetzt wechseln
            </button>
          </div>
        )}
      </div>

{!fixed && (
        <>
      <div className="wp-row">
        <span>Automatisch wechseln</span>
        <Switch on={wp.auto} onToggle={(v) => update({ wallpaper: { auto: v } })} />
      </div>

      <div className="wp-selects">
        <label>
          Intervall
          <select value={wp.intervalMin} onChange={(e) => update({ wallpaper: { intervalMin: Number(e.target.value) } })}>
            <option value={5}>Alle 5 Minuten</option>
            <option value={10}>Alle 10 Minuten</option>
            <option value={30}>Alle 30 Minuten</option>
            <option value={60}>Stündlich</option>
            <option value={1440}>Täglich</option>
          </select>
        </label>
        <label>
          Reihenfolge
          <select
            value={wp.order}
            onChange={(e) => update({ wallpaper: { order: e.target.value as Settings['wallpaper']['order'] } })}
          >
            <option value="random">Zufällig</option>
            <option value="sequential">Nacheinander</option>
          </select>
        </label>
      </div>

        </>
      )}

      <div className="wp-row">
        <div>
          <div>Glas-Effekt</div>
          <div className="wp-sub">Aus = schneller, weniger Last für die Grafikkarte</div>
        </div>
        <Switch on={wp.glass} onToggle={(v) => update({ wallpaper: { glass: v } })} />
      </div>

      {wp.glass && (
        <label className="wp-slider">
          <span>
            Unschärfe der Karten <b>{wp.blur}</b>
          </span>
          <input type="range" min={4} max={32} value={wp.blur} onChange={(e) => update({ wallpaper: { blur: Number(e.target.value) } })} />
        </label>
      )}
      <label className="wp-slider">
        <span>
          Bild abdunkeln <b>{wp.dim} %</b>
        </span>
        <input type="range" min={0} max={60} value={wp.dim} onChange={(e) => update({ wallpaper: { dim: Number(e.target.value) } })} />
      </label>

      <div className="wp-scroll">
        {photos.length === 0 && (
          <div className="wp-note">
            Noch keine Fotos. Die App lädt bis zu 50 freie Landschaftsfotos von Wikimedia Commons, sobald Internet da ist.
            <button type="button" className="link-btn" onClick={sync} disabled={syncing}>
              {syncing ? 'Lade…' : 'Jetzt laden'}
            </button>
          </div>
        )}
        {group('Fotos', photos)}
        {group('Eigene Bilder', own, true)}
        {group('Gezeichnet', drawn)}
      </div>

      <button type="button" className="btn wide" onClick={() => window.znerol.wallpapers.addCustom()}>
        Eigene Bilder hinzufügen
      </button>
    </aside>
  )
}
