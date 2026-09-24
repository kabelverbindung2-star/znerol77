import { useEffect, useState, type ReactNode } from 'react'
import Switch from '../ui/Switch'
import type { Place, Settings } from '../../lib/types'
import { DEFAULT_WIDGETS, type SettingsPatch } from '../../lib/useSettings'

interface Props {
  settings: Settings
  update: (patch: SettingsPatch) => Promise<void>
  openWallpapers: () => void
  hotkeys: { menu: string; hide: string }
  startRest: () => void
}

const ACCENTS = ['#C6F432', '#5CE1E6', '#FFB020', '#FF5FA2', '#2563EB', '#16A34A', '#9333EA', '#EA580C']

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }): JSX.Element {
  return (
    <section className="glass settings-section">
      <div className="settings-head">
        <div className="settings-title">{title}</div>
        {sub && <div className="quick-sub">{sub}</div>}
      </div>
      {children}
    </section>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children: ReactNode }): JSX.Element {
  return (
    <div className="settings-row">
      <div>
        <div>{label}</div>
        {sub && <div className="quick-sub">{sub}</div>}
      </div>
      <div className="settings-control">{children}</div>
    </div>
  )
}

function Choice<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div className="choice" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function Einstellungen({ settings, update, openWallpapers, hotkeys, startRest }: Props): JSX.Element {
  const a = settings.appearance
  const wp = settings.wallpaper
  const [loginItem, setLoginItem] = useState(false)
  const [version, setVersion] = useState('')
  const [updateMsg, setUpdateMsg] = useState<string | null>(null)
  const [audioKey, setAudioKey] = useState(settings.audio.switchHotkey)
  const [audioKeyMsg, setAudioKeyMsg] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [places, setPlaces] = useState<Place[]>([])
  const [displays, setDisplays] = useState<{ id: number; label: string; primary: boolean; width: number; height: number }[]>([])

  useEffect(() => {
    const load = (): void => {
      window.znerol.screens.list().then(setDisplays).catch(() => undefined)
    }
    load()
    return window.znerol.screens.onChanged(load)
  }, [])

  useEffect(() => {
    window.znerol.system.getLoginItem().then(setLoginItem).catch(() => undefined)
    window.znerol.system.version().then(setVersion).catch(() => undefined)
  }, [])
  useEffect(() => setAudioKey(settings.audio.switchHotkey), [settings.audio.switchHotkey])
  useEffect(() => {
    if (query.trim().length < 2) {
      setPlaces([])
      return
    }
    const t = setTimeout(() => window.znerol.weather.search(query).then(setPlaces).catch(() => setPlaces([])), 350)
    return () => clearTimeout(t)
  }, [query])

  const glass = a.style === 'glass'

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Einstellungen</div>
          <div className="page-subtitle">Aussehen, Hintergrund, Tasten und mehr</div>
        </div>
      </div>

      <div className="settings-grid">
        <Section title="Aussehen">
          <div className="style-cards">
            <button type="button" className={`style-card ${glass ? 'active' : ''}`} onClick={() => update({ appearance: { style: 'glass' } })}>
              <span className="style-preview glass-preview">
                <i />
                <i />
                <i />
              </span>
              <b>Glas</b>
              <span className="quick-sub">Bilder im Hintergrund, durchsichtige Karten</span>
            </button>
            <button type="button" className={`style-card ${!glass ? 'active' : ''}`} onClick={() => update({ appearance: { style: 'basic' } })}>
              <span className={`style-preview basic-preview ${a.mode}`}>
                <i />
                <i />
                <i />
              </span>
              <b>Basic</b>
              <span className="quick-sub">Schlicht und ruhig, ohne Hintergrundbild</span>
            </button>
          </div>
          {!glass && (
            <Row label="Helligkeit">
              <Choice
                value={a.mode}
                options={[
                  { value: 'light', label: 'Hell' },
                  { value: 'dark', label: 'Dunkel' }
                ]}
                onChange={(v) => update({ appearance: { mode: v } })}
              />
            </Row>
          )}
          <Row label="Leiste" sub="Auch per Rechtsklick auf die Leiste">
            <Choice
              value={a.nav ?? 'top'}
              options={[
                { value: 'top', label: 'Oben' },
                { value: 'left', label: 'Links' },
                { value: 'right', label: 'Rechts' }
              ]}
              onChange={(v) => update({ appearance: { nav: v } })}
            />
          </Row>
          <Row label="Akzentfarbe">
            <div className="swatches">
              {ACCENTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`swatch ${settings.accent.toLowerCase() === c.toLowerCase() ? 'active' : ''}`}
                  style={{ background: c }}
                  aria-label={`Akzentfarbe ${c}`}
                  onClick={() => update({ accent: c })}
                />
              ))}
            </div>
          </Row>
        </Section>

        {glass && (
          <Section title="Hintergrund">
            <Choice
              value={a.background}
              options={[
                { value: 'photos', label: 'Wechselnde Bilder' },
                { value: 'fixed', label: 'Festes Bild' },
                { value: 'plain', label: 'Kein Bild' },
                { value: 'transparent', label: 'Durchsichtig' }
              ]}
              onChange={(v) => update({ appearance: { background: v } })}
            />
            <div className="quick-sub" style={{ margin: '8px 0 4px' }}>
              {a.background === 'photos' && 'Das Bild wechselt automatisch. Welche Bilder und wie oft stellst du unten ein.'}
              {a.background === 'fixed' && 'Ein Bild, das bleibt. Kein automatischer Wechsel.'}
              {a.background === 'plain' && 'Gar kein Bild – einfarbiger Hintergrund, der Bild-Knopf verschwindet.'}
              {a.background === 'transparent' &&
                'Das Fenster wird durchsichtig: zwischen und hinter den Karten siehst du deinen Desktop. Beim Umschalten öffnet sich das Fenster kurz neu.'}
            </div>
            {(a.background === 'photos' || a.background === 'fixed') && (
              <>
                {a.background === 'photos' && (
                  <Row label="Wechseln">
                    <select value={wp.intervalMin} onChange={(e) => update({ wallpaper: { intervalMin: Number(e.target.value), auto: true } })}>
                      <option value={5}>Alle 5 Minuten</option>
                      <option value={10}>Alle 10 Minuten</option>
                      <option value={30}>Alle 30 Minuten</option>
                      <option value={60}>Stündlich</option>
                      <option value={1440}>Täglich</option>
                    </select>
                  </Row>
                )}
                <Row label="Bilder" sub="Fotos, eigene Bilder und gezeichnete Szenen">
                  <button type="button" className="btn btn-sm" onClick={openWallpapers}>
                    Bild auswählen
                  </button>
                </Row>
                <Row label="Bild abdunkeln">
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={wp.dim}
                    aria-label="Bild abdunkeln"
                    onChange={(e) => update({ wallpaper: { dim: Number(e.target.value) } })}
                  />
                </Row>
              </>
            )}
            {a.background === 'transparent' && (
              <Row label="Karten" sub="Links = mehr Desktop sichtbar, rechts = besser lesbar">
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={wp.dim}
                  aria-label="Deckkraft der Karten"
                  onChange={(e) => update({ wallpaper: { dim: Number(e.target.value) } })}
                />
              </Row>
            )}
            <Row label="Glas-Effekt" sub="Aus = schneller, weniger Arbeit für die Grafikkarte">
              <Switch on={wp.glass} onToggle={(v) => update({ wallpaper: { glass: v } })} />
            </Row>
          </Section>
        )}

        <Section title="Bildschirme & Ruhe">
          <Row
            label="2 Bildschirme"
            sub={
              displays.length < 2
                ? 'Nur ein Bildschirm erkannt'
                : 'Zweites Fenster mit eigenen Kacheln. Rechtsklick auf eine Kachel verschiebt sie.'
            }
          >
            <Switch on={settings.screens.dual} disabled={displays.length < 2 && !settings.screens.dual} onToggle={(v) => update({ screens: { dual: v } })} />
          </Row>
          {settings.screens.dual && displays.length > 2 && (
            <Row label="Auf welchem Bildschirm">
              <select
                value={settings.screens.displayId ?? ''}
                onChange={(e) => update({ screens: { displayId: e.target.value ? Number(e.target.value) : null } })}
              >
                <option value="">Automatisch</option>
                {displays.map((d, i) => (
                  <option key={d.id} value={d.id}>
                    {i + 1}: {d.label} ({d.width}×{d.height}){d.primary ? ' · Haupt' : ''}
                  </option>
                ))}
              </select>
            </Row>
          )}
          <Row
            label="Ruhemodus"
            sub="PC wird leise (sparsamster Energiemodus), andere Apps werden minimiert, Bildschirme bleiben an und zeigen nur die Uhr. Klick oder Taste beendet ihn."
          >
            <button type="button" className="btn btn-sm" onClick={startRest}>
              Starten
            </button>
          </Row>
          <Row label="Bildschirm aus" sub="Nur die Bildschirme gehen aus, der PC läuft weiter. Maus bewegen weckt sie.">
            <button type="button" className="btn btn-sm" onClick={() => window.znerol.display.off()}>
              Ausschalten
            </button>
          </Row>
        </Section>

        <Section title="Tasten">
          <Row label="Audiogerät wechseln" sub={audioKeyMsg ?? 'z. B. F6, F7, Control+Alt+A (Fn geht nicht)'}>
            <input className="text-input short" value={audioKey} aria-label="Taste für Audiowechsel" onChange={(e) => setAudioKey(e.target.value)} />
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                const ok = await window.znerol.audio.setHotkey(audioKey.trim())
                setAudioKeyMsg(ok ? 'Gespeichert.' : 'Schon belegt oder ungültig.')
              }}
            >
              Übernehmen
            </button>
          </Row>
          <Row label="Spiel-Overlay" sub={`${hotkeys.menu} öffnet das Schnellmenü, ${hotkeys.hide} blendet aus`}>
            <Switch
              on={settings.overlay.enabled}
              onToggle={(v) => {
                update({ overlay: { enabled: v } })
                window.znerol.overlay.setEnabled(v)
              }}
            />
          </Row>
          <Row label="Autoclicker" sub="Die Starttaste stellst du im Klicker ein; Esc stoppt immer." >
            <span className="quick-sub">im Tab Klicker</span>
          </Row>
        </Section>

        <Section title="Start & Leistung">
          <Row label="Mit Windows starten">
            <Switch on={loginItem} onToggle={(v) => window.znerol.system.setLoginItem(v).then(setLoginItem).catch(() => undefined)} />
          </Row>
          <Row label="Messen alle" sub="Seltener = leiser und sparsamer">
            <Choice
              value={String(settings.performance.intervalSec)}
              options={[
                { value: '1', label: '1 s' },
                { value: '2', label: '2 s' },
                { value: '5', label: '5 s' }
              ]}
              onChange={(v) => update({ performance: { intervalSec: Number(v) } })}
            />
          </Row>
        </Section>

        <Section title="Wetter" sub={settings.weather ? `Ort: ${settings.weather.name}` : 'Noch kein Ort eingestellt'}>
          <input
            className="text-input"
            placeholder="Stadt suchen …"
            value={query}
            aria-label="Ort für das Wetter suchen"
            onChange={(e) => setQuery(e.target.value)}
          />
          {places.map((p) => (
            <button
              key={`${p.lat},${p.lon}`}
              type="button"
              className="place-row"
              onClick={() => {
                update({ weather: { name: p.region && p.region !== p.name ? `${p.name}, ${p.region}` : p.name, lat: p.lat, lon: p.lon } })
                setQuery('')
              }}
            >
              <b>{p.name}</b>
              <span>{[p.region, p.country].filter(Boolean).join(', ')}</span>
            </button>
          ))}
        </Section>

        <Section title="Übersicht" sub="Kacheln bearbeiten: auf der Übersicht lange auf eine Kachel drücken.">
          <button type="button" className="btn btn-sm" onClick={() => update({ dashboard: { widgets: DEFAULT_WIDGETS } })}>
            Kacheln zurücksetzen
          </button>
        </Section>

        <Section title="Info">
          <Row label="Version">
            <span className="mono">{version || '–'}</span>
          </Row>
          <Row label="Updates" sub={updateMsg ?? 'Updates werden automatisch geladen.'}>
            <button type="button" className="btn btn-sm" onClick={async () => setUpdateMsg(await window.znerol.update.check())}>
              Jetzt prüfen
            </button>
          </Row>
          <Row label="Gespeicherte Daten" sub="Einstellungen, Zeichnungen, Bilder">
            <button type="button" className="btn btn-sm" onClick={() => window.znerol.system.openDataFolder()}>
              Ordner öffnen
            </button>
          </Row>
        </Section>
      </div>
    </>
  )
}
