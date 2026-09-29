import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Switch from '../ui/Switch'
import { KEYS, MODS, accelerator, comboLabel, keyByName } from '../../lib/keys'

interface Profile {
  id: string
  name: string
  cps: number
  input: 'mouse' | 'keyboard'
  button: 'left' | 'right' | 'middle'
  mods: number
  key: string
  keyVk: number
  hotkeyMods: number
  hotkeyKey: string
  hotkeyVk: number
  hotkeyMode: 'toggle' | 'hold'
  limitOn: boolean
  limit: number
  timeOn: boolean
  time: number
  timeUnit: 's' | 'min'
  cornerStop: boolean
  edgeStop: boolean
  doubleOn: boolean
  doubleGap: number
  jitterOn: boolean
  jitterPct: number
  fixedOn: boolean
  positions: { x: number; y: number }[]
  markers: boolean
}

interface Status {
  running: boolean
  waiting: boolean
  clicks: number
  profileId: string | null
  error: string | null
  stoppedBy: '' | 'limit' | 'time' | 'corner' | 'edge'
}

const STORAGE_KEY = 'znerol.autoclicker.profiles'
const STOPPED_BY: Record<string, string> = {
  limit: 'Klick-Limit erreicht',
  time: 'Zeit abgelaufen',
  corner: 'Maus in der Ecke – gestoppt',
  edge: 'Maus am Rand – gestoppt'
}

// the speed slider is logarithmic: fine steps at low speeds, 1–500 on one track
const toSlider = (cps: number): number => Math.round((Math.log(cps) / Math.log(500)) * 1000)
const fromSlider = (v: number): number => Math.max(1, Math.min(500, Math.round(Math.exp((v / 1000) * Math.log(500)))))

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }): JSX.Element {
  return (
    <div className="seg" role="radiogroup">
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function ModToggles({ value, onChange }: { value: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <div className="seg multi">
      {MODS.map((m) => (
        <button key={m.bit} type="button" aria-pressed={!!(value & m.bit)} className={value & m.bit ? 'on' : ''} onClick={() => onChange(value ^ m.bit)}>
          {m.name}
        </button>
      ))}
    </div>
  )
}

function KeyPicker({ value, onChange, label }: { value: string; onChange: (name: string) => void; label: string }): JSX.Element {
  const [query, setQuery] = useState('')
  const [listening, setListening] = useState(false)
  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? KEYS.filter((k) => k.name.toLowerCase().includes(q)) : KEYS
  }, [query])
  // "Taste drücken": the next key pressed is taken
  useEffect(() => {
    if (!listening) return
    const on = (e: KeyboardEvent): void => {
      e.preventDefault()
      if (e.key === 'Escape') return setListening(false)
      const code = e.code.replace(/^Key/, '').replace(/^Digit/, '')
      const k = keyByName(code) ?? keyByName(e.key.length === 1 ? e.key.toUpperCase() : e.key)
      if (k) onChange(k.name)
      setListening(false)
    }
    window.addEventListener('keydown', on, true)
    return () => window.removeEventListener('keydown', on, true)
  }, [listening, onChange])
  return (
    <div className="key-picker">
      <select value={value} aria-label={label} onChange={(e) => onChange(e.target.value)}>
        {!list.some((k) => k.name === value) && <option value={value}>{value}</option>}
        {list.map((k) => (
          <option key={k.name} value={k.name}>
            {k.name}
          </option>
        ))}
      </select>
      <input className="text-input" placeholder="Suchen …" value={query} aria-label={`${label} suchen`} onChange={(e) => setQuery(e.target.value)} />
      <button type="button" className={`btn btn-sm ${listening ? 'btn-primary' : ''}`} onClick={() => setListening((v) => !v)}>
        {listening ? 'Jetzt Taste drücken …' : 'Taste drücken'}
      </button>
    </div>
  )
}

function Row({ title, sub, right, children }: { title: string; sub?: string; right?: ReactNode; children?: ReactNode }): JSX.Element {
  return (
    <div className="ac-row">
      <div className="ac-row-head">
        <div>
          <div className="ac-row-title">{title}</div>
          {sub && <div className="quick-sub">{sub}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  )
}

function NumberBox({ value, min, max, onChange, suffix }: { value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }): JSX.Element {
  return (
    <span className="num-box">
      <input
        className="text-input mono"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value.replace(/[^0-9]/g, ''))
          onChange(Math.max(min, Math.min(max, n || min)))
        }}
      />
      {suffix && <span className="quick-sub">{suffix}</span>}
    </span>
  )
}

export default function Autoclicker(): JSX.Element {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeId, setActiveId] = useState('')
  const [status, setStatus] = useState<Status>({ running: false, waiting: false, clicks: 0, profileId: null, error: null, stoppedBy: '' })
  const [hotkeyOk, setHotkeyOk] = useState<boolean | null>(null)
  const [capture, setCapture] = useState<number | null>(null)
  const [renaming, setRenaming] = useState(false)

  useEffect(() => {
    ;(async () => {
      let saved: unknown[] | null = null
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) saved = JSON.parse(raw)
      } catch {
        saved = null
      }
      // old profiles are upgraded to the new settings by the main process
      const list: Profile[] = saved ? await window.znerol.autoclicker.upgrade(saved) : await window.znerol.autoclicker.defaultProfiles()
      setProfiles(list)
      setActiveId(list[0]?.id ?? '')
    })()
    const off = window.znerol.autoclicker.onStatus((s: unknown) => setStatus(s as Status))
    window.znerol.autoclicker.status().then((s: unknown) => setStatus(s as Status))
    return () => {
      off?.()
      window.znerol.autoclicker.markers(null)
    }
  }, [])

  const p = profiles.find((x) => x.id === activeId) ?? profiles[0]

  const persist = (next: Profile[]): void => {
    setProfiles(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // storage blocked: keeps working until restart
    }
  }
  const set = (patch: Partial<Profile>): void => {
    if (!p) return
    persist(profiles.map((x) => (x.id === p.id ? { ...x, ...patch } : x)))
  }

  // the start/stop hotkey follows the settings at once (no extra button)
  const accel = p ? accelerator(p.hotkeyMods, p.hotkeyKey) : ''
  const pRef = useRef(p)
  pRef.current = p
  useEffect(() => {
    if (!p) return
    window.znerol.autoclicker
      .setHotkey(accel, pRef.current)
      .then((ok: boolean) => setHotkeyOk(ok))
      .catch(() => setHotkeyOk(false))
    // re-register when anything the hotkey starts with changes
  }, [accel, p?.hotkeyMode, JSON.stringify(p ?? {})]) // eslint-disable-line react-hooks/exhaustive-deps

  // markers on the screen while fixed positions are used
  useEffect(() => {
    if (!p) return
    window.znerol.autoclicker.markers(p.fixedOn && p.markers ? p.positions : null)
  }, [p?.fixedOn, p?.markers, JSON.stringify(p?.positions ?? [])]) // eslint-disable-line react-hooks/exhaustive-deps

  // "+ Position": 3 seconds to move the mouse there
  useEffect(() => {
    if (capture === null) return
    if (capture === 0) {
      window.znerol.autoclicker.cursor().then((pos) => {
        const cur = pRef.current
        if (cur) set({ positions: [...cur.positions, pos], fixedOn: true })
      })
      setCapture(null)
      return
    }
    const t = setTimeout(() => setCapture((c) => (c === null ? null : c - 1)), 1000)
    return () => clearTimeout(t)
  }, [capture]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <div className="empty-state">Lade …</div>

  const running = status.running && status.profileId === p.id
  const toggle = async (): Promise<void> => {
    if (running) await window.znerol.autoclicker.stop()
    else await window.znerol.autoclicker.start(p).catch((e: Error) => alert(e.message))
  }
  const hotkeyText = comboLabel(p.hotkeyMods, p.hotkeyKey)

  const addProfile = (): void => {
    const id = `profile-${Date.now()}`
    persist([...profiles, { ...p, id, name: `${p.name} Kopie` }])
    setActiveId(id)
  }
  const deleteProfile = (): void => {
    if (profiles.length <= 1) return
    const next = profiles.filter((x) => x.id !== p.id)
    persist(next)
    setActiveId(next[0].id)
  }

  return (
    <div className="ac">
      <div className="ac-profiles">
        {profiles.map((x) => (
          <button key={x.id} type="button" className={`chip ${x.id === p.id ? 'active' : ''}`} onClick={() => setActiveId(x.id)} onDoubleClick={() => setRenaming(true)}>
            {x.name}
            {status.running && status.profileId === x.id ? ' ●' : ''}
          </button>
        ))}
        <button type="button" className="chip" onClick={addProfile} title="Neues Profil (Kopie des aktuellen)">
          + Profil
        </button>
        {renaming ? (
          <input className="text-input short" autoFocus value={p.name} onChange={(e) => set({ name: e.target.value })} onBlur={() => setRenaming(false)} onKeyDown={(e) => e.key === 'Enter' && setRenaming(false)} />
        ) : (
          <button type="button" className="link-btn" onClick={() => setRenaming(true)}>
            umbenennen
          </button>
        )}
        {profiles.length > 1 && (
          <button type="button" className="link-btn" onClick={deleteProfile}>
            löschen
          </button>
        )}
      </div>

      <section className="glass ac-card ac-speed">
        <div className="ac-speed-head">
          <div className="ac-row-title">Geschwindigkeit</div>
          <div className="ac-cps">
            <b>{p.cps}</b> Klicks/s <span className="quick-sub">≈ {Math.round(1000 / p.cps)} ms</span>
          </div>
        </div>
        <input type="range" min={0} max={1000} value={toSlider(p.cps)} aria-label="Klicks pro Sekunde" onChange={(e) => set({ cps: fromSlider(Number(e.target.value)) })} />
        <div className="ac-speed-row">
          <button type="button" className="btn btn-sm" onClick={() => set({ cps: Math.max(1, p.cps - 1) })} aria-label="langsamer">
            −
          </button>
          <NumberBox value={p.cps} min={1} max={500} onChange={(cps) => set({ cps })} />
          <button type="button" className="btn btn-sm" onClick={() => set({ cps: Math.min(500, p.cps + 1) })} aria-label="schneller">
            +
          </button>
          <div className="presets">
            {[5, 10, 20, 50, 100, 250, 500].map((c) => (
              <button key={c} type="button" className={`chip ${p.cps === c ? 'active' : ''}`} onClick={() => set({ cps: c })}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button type="button" className={`ac-start ${running ? 'running' : ''} ${status.waiting && running ? 'waiting' : ''}`} onClick={toggle}>
        <span>
          {running ? (status.waiting ? `Bereit – ${hotkeyText} gedrückt halten` : `Stopp · ${status.clicks} Klicks`) : p.hotkeyMode === 'hold' ? 'Bereit machen' : 'Start'}
        </span>
        <kbd>{running ? 'Esc' : hotkeyText}</kbd>
      </button>
      {!running && status.stoppedBy && status.profileId === p.id && <div className="quick-sub ac-note">{STOPPED_BY[status.stoppedBy]}</div>}
      {status.error && <div className="win-only-banner">{status.error}</div>}

      <div className="ac-grid">
        <section className="glass ac-card">
          <div className="ac-card-title">Eingabe</div>
          <Seg
            value={p.input}
            options={[
              { value: 'mouse', label: 'Maus' },
              { value: 'keyboard', label: 'Tastatur' }
            ]}
            onChange={(input) => set({ input })}
          />
          {p.input === 'mouse' ? (
            <Row title="Maustaste">
              <Seg
                value={p.button}
                options={[
                  { value: 'left', label: 'Links' },
                  { value: 'middle', label: 'Mitte' },
                  { value: 'right', label: 'Rechts' }
                ]}
                onChange={(button) => set({ button })}
              />
            </Row>
          ) : (
            <Row title="Taste">
              <KeyPicker value={p.key} label="Taste" onChange={(name) => set({ key: name, keyVk: keyByName(name)?.vk ?? 0x20 })} />
            </Row>
          )}
          <Row title="Zusatztasten" sub="werden bei jedem Klick mitgedrückt">
            <ModToggles value={p.mods} onChange={(mods) => set({ mods })} />
          </Row>
          <div className="quick-sub">Kombination: {comboLabel(p.mods, p.input === 'mouse' ? `${{ left: 'Linksklick', middle: 'Mittelklick', right: 'Rechtsklick' }[p.button]}` : p.key)}</div>
        </section>

        <section className="glass ac-card">
          <div className="ac-card-title">Start/Stopp-Taste</div>
          <Row title="Zusatztasten">
            <ModToggles value={p.hotkeyMods} onChange={(hotkeyMods) => set({ hotkeyMods })} />
          </Row>
          <Row title="Taste">
            <KeyPicker value={p.hotkeyKey} label="Starttaste" onChange={(name) => set({ hotkeyKey: name, hotkeyVk: keyByName(name)?.vk ?? 0x77 })} />
          </Row>
          <Row title="Verhalten">
            <Seg
              value={p.hotkeyMode}
              options={[
                { value: 'toggle', label: 'Umschalten' },
                { value: 'hold', label: 'Halten' }
              ]}
              onChange={(hotkeyMode) => set({ hotkeyMode })}
            />
          </Row>
          <div className={`quick-sub ${hotkeyOk === false ? 'warn' : ''}`}>
            {hotkeyOk === false
              ? `${hotkeyText} ist schon belegt (z. B. von Windows oder einem anderen Programm) – bitte eine andere Taste wählen.`
              : p.hotkeyMode === 'toggle'
                ? `${hotkeyText} einmal drücken = Start, nochmal = Stopp. Esc stoppt immer.`
                : `Erst „Bereit machen“, dann klickt es nur, solange du ${hotkeyText} gedrückt hältst.`}
          </div>
        </section>

        <section className="glass ac-card">
          <div className="ac-card-title">Limits & Notaus</div>
          <Row title="Klick-Limit" sub="nach so vielen Klicks stoppen" right={<Switch on={p.limitOn} onToggle={(limitOn) => set({ limitOn })} />}>
            {p.limitOn && <NumberBox value={p.limit} min={1} max={10_000_000} onChange={(limit) => set({ limit })} suffix="Klicks" />}
          </Row>
          <Row title="Zeit-Limit" sub="nach dieser Zeit stoppen" right={<Switch on={p.timeOn} onToggle={(timeOn) => set({ timeOn })} />}>
            {p.timeOn && (
              <div className="row">
                <NumberBox value={p.time} min={1} max={100_000} onChange={(time) => set({ time })} />
                <Seg
                  value={p.timeUnit}
                  options={[
                    { value: 's', label: 'Sek' },
                    { value: 'min', label: 'Min' }
                  ]}
                  onChange={(timeUnit) => set({ timeUnit })}
                />
              </div>
            )}
          </Row>
          <Row title="Ecken-Stopp" sub="stoppt, wenn du die Maus in eine Bildschirmecke fährst" right={<Switch on={p.cornerStop} onToggle={(cornerStop) => set({ cornerStop })} />} />
          <Row title="Rand-Stopp" sub="stoppt, wenn die Maus einen Bildschirmrand erreicht" right={<Switch on={p.edgeStop} onToggle={(edgeStop) => set({ edgeStop })} />} />
        </section>

        <section className="glass ac-card">
          <div className="ac-card-title">Verhalten</div>
          <Row title="Doppelklick" sub="zwei Klicks kurz hintereinander" right={<Switch on={p.doubleOn} onToggle={(doubleOn) => set({ doubleOn })} />}>
            {p.doubleOn && <NumberBox value={p.doubleGap} min={1} max={500} onChange={(doubleGap) => set({ doubleGap })} suffix="ms dazwischen" />}
          </Row>
          <Row title="Tempo-Zufall" sub="Tempo schwankt leicht, wirkt menschlicher" right={<Switch on={p.jitterOn} onToggle={(jitterOn) => set({ jitterOn })} />}>
            {p.jitterOn && <NumberBox value={p.jitterPct} min={1} max={90} onChange={(jitterPct) => set({ jitterPct })} suffix="% Schwankung" />}
          </Row>
          <Row title="Feste Positionen" sub="klickt nacheinander an gespeicherten Stellen statt dort, wo die Maus ist" right={<Switch on={p.fixedOn} onToggle={(fixedOn) => set({ fixedOn })} />}>
            {p.fixedOn && (
              <>
                <ol className="ac-positions">
                  {p.positions.map((q, i) => (
                    <li key={i}>
                      <span className="marker-dot">{i + 1}</span>
                      <span className="mono">
                        {q.x}, {q.y}
                      </span>
                      <button type="button" className="link-btn" onClick={() => set({ positions: p.positions.filter((_, j) => j !== i) })}>
                        entfernen
                      </button>
                    </li>
                  ))}
                </ol>
                <button type="button" className="btn btn-sm" disabled={capture !== null} onClick={() => setCapture(3)}>
                  {capture !== null ? `Maus hinbewegen … ${capture}` : '+ Position hinzufügen'}
                </button>
                <Row title="Marker anzeigen" sub="rote Punkte mit Nummer auf dem Bildschirm" right={<Switch on={p.markers} onToggle={(markers) => set({ markers })} />} />
              </>
            )}
          </Row>
        </section>
      </div>
    </div>
  )
}
