import { useEffect, useRef, useState } from 'react'
import { formatDuration, useCountdown, useStopwatch } from '../../lib/timers'
import { evaluate, formatNumber, toggleSign } from '../../lib/calc'

// ---------- Stopwatch ----------
export function Stopwatch({ compact = false }: { compact?: boolean }): JSX.Element {
  const sw = useStopwatch()
  return (
    <div className={`tool stopwatch ${compact ? 'compact' : ''}`}>
      <div className="tool-display mono">{formatDuration(sw.elapsed)}</div>
      <div className="tool-actions">
        <button type="button" className={`btn ${sw.running ? '' : 'btn-primary'}`} onClick={sw.toggle}>
          {sw.running ? 'Stopp' : sw.elapsed > 0 ? 'Weiter' : 'Start'}
        </button>
        <button type="button" className="btn" onClick={sw.running ? sw.lap : sw.reset} disabled={!sw.running && sw.elapsed === 0}>
          {sw.running ? 'Runde' : 'Zurücksetzen'}
        </button>
      </div>
      {!compact && sw.laps.length > 0 && (
        <ol className="laps">
          {sw.laps.map((t, i) => {
            const prev = sw.laps[i + 1] ?? 0
            return (
              <li key={i}>
                <span>Runde {sw.laps.length - i}</span>
                <span className="mono dim">+{formatDuration(t - prev)}</span>
                <span className="mono">{formatDuration(t)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}

// ---------- Timer: hours, minutes and seconds ----------
const PRESETS: { label: string; ms: number }[] = [
  { label: '30 s', ms: 30_000 },
  { label: '1 min', ms: 60_000 },
  { label: '3 min', ms: 180_000 },
  { label: '5 min', ms: 300_000 },
  { label: '10 min', ms: 600_000 },
  { label: '15 min', ms: 900_000 },
  { label: '25 min', ms: 1_500_000 },
  { label: '30 min', ms: 1_800_000 },
  { label: '1 h', ms: 3_600_000 },
  { label: '2 h', ms: 7_200_000 }
]

function split(ms: number): { h: number; m: number; s: number } {
  const total = Math.round(ms / 1000)
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
}

function NumberField({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }): JSX.Element {
  return (
    <label className="time-field">
      <input
        className="text-input mono"
        inputMode="numeric"
        value={String(value).padStart(2, '0')}
        aria-label={label}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '').slice(-2)
          onChange(Math.min(max, Number(digits || 0)))
        }}
        onWheel={(e) => onChange(Math.max(0, Math.min(max, value + (e.deltaY < 0 ? 1 : -1))))}
      />
      <span>{label}</span>
    </label>
  )
}

export function Countdown({ compact = false }: { compact?: boolean }): JSX.Element {
  const t = useCountdown()
  const [hms, setHms] = useState(() => split(t.duration))
  const progress = t.duration > 0 ? 1 - t.remaining / t.duration : 0
  const set = (next: { h: number; m: number; s: number }): void => {
    setHms(next)
    const ms = (next.h * 3600 + next.m * 60 + next.s) * 1000
    if (ms > 0) t.setDuration(ms)
  }
  return (
    <div className={`tool countdown ${compact ? 'compact' : ''} ${t.finished ? 'done' : ''}`}>
      <div className="tool-display mono">{formatDuration(t.remaining, false)}</div>
      <div className="bar">
        <div className="bar-fill accent" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      <div className="tool-actions">
        <button type="button" className={`btn ${t.running ? '' : 'btn-primary'}`} onClick={t.running ? t.pause : t.start}>
          {t.running ? 'Pause' : 'Start'}
        </button>
        <button type="button" className="btn" onClick={t.reset}>
          Zurücksetzen
        </button>
      </div>
      {!compact && (
        <>
          <div className="time-fields" title="Mit dem Mausrad hoch- und runterzählen">
            <NumberField label="Std" value={hms.h} max={99} onChange={(h) => set({ ...hms, h })} />
            <span className="time-colon">:</span>
            <NumberField label="Min" value={hms.m} max={59} onChange={(m) => set({ ...hms, m })} />
            <span className="time-colon">:</span>
            <NumberField label="Sek" value={hms.s} max={59} onChange={(s) => set({ ...hms, s })} />
          </div>
          <div className="presets">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`chip ${t.duration === p.ms ? 'active' : ''}`}
                onClick={() => {
                  setHms(split(p.ms))
                  t.setDuration(p.ms)
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ---------- Calculator ----------
const BASIC = ['AC', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '±', '0', ',', '=']
const EXTRA = ['(', ')', '√', 'x²', '^', 'π', '1/x']

export function Calculator({ compact = false, big = false }: { compact?: boolean; big?: boolean }): JSX.Element {
  const [expr, setExprState] = useState('')
  const exprRef = useRef('')
  // always act on the latest text, even when several keys arrive before a re-render
  const setExpr = (next: string | ((e: string) => string)): void => {
    exprRef.current = typeof next === 'function' ? next(exprRef.current) : next
    setExprState(exprRef.current)
  }
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([])
  const [more, setMore] = useState(big)
  const root = useRef<HTMLDivElement>(null)

  const preview = (() => {
    if (!expr) return ''
    try {
      return formatNumber(evaluate(expr))
    } catch {
      return ''
    }
  })()

  const press = (k: string): void => {
    if (k === 'AC' || k === 'C') {
      setExpr('')
      setResult(null)
      return
    }
    if (k === '⌫') {
      setExpr((e) => e.slice(0, -1))
      setResult(null)
      return
    }
    if (k === '±') {
      setExpr(toggleSign)
      return
    }
    if (k === 'x²') {
      setExpr((e) => (e ? `(${e})^2` : e))
      return
    }
    if (k === '1/x') {
      setExpr((e) => (e ? `1÷(${e})` : e))
      return
    }
    if (k === '=') {
      const current = exprRef.current
      if (!current) return
      try {
        const r = formatNumber(evaluate(current))
        setHistory((h) => [{ expr: current, result: r }, ...h].slice(0, 30))
        setResult(r)
        setExpr(r.replace(/\./g, ''))
      } catch (e) {
        const msg = (e as Error).message
        setResult(msg === 'Division durch 0' ? 'Nicht durch 0 teilen' : msg.startsWith('Wurzel') ? msg : 'Fehler')
      }
      return
    }
    setResult(null)
    setExpr((e) => e + k)
  }

  // keyboard input while the calculator is focused
  useEffect(() => {
    const el = root.current
    if (!el) return
    const onKey = (e: KeyboardEvent): void => {
      const map: Record<string, string> = { '*': '×', '/': '÷', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'AC', Delete: 'AC', '.': ',' }
      const k = map[e.key] ?? e.key
      if (/^[0-9+\-×÷%(),^π√]$/.test(k) || ['=', '⌫', 'AC'].includes(k)) {
        e.preventDefault()
        press(k)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  })

  const keyClass = (k: string): string =>
    ['calc-key', '÷×-+^'.includes(k) && k.length === 1 ? 'op' : '', k === '=' ? 'eq' : '', k === 'AC' ? 'clear' : '', ['⌫', '%', '±'].includes(k) ? 'fn' : '']
      .filter(Boolean)
      .join(' ')

  return (
    <div ref={root} className={`tool calculator ${compact ? 'compact' : ''} ${big ? 'big' : ''}`} tabIndex={0} aria-label="Taschenrechner">
      <div className="calc-screen">
        <div className="calc-expr mono">{expr || '0'}</div>
        <div className="calc-result mono">{result ?? (preview && preview !== expr ? `= ${preview}` : '')}</div>
      </div>
      {!compact && (
        <div className="calc-extra-row">
          <button type="button" className={`chip ${more ? 'active' : ''}`} onClick={() => setMore((v) => !v)}>
            {more ? 'Weniger' : 'Mehr: √ x² π ( )'}
          </button>
        </div>
      )}
      {more && !compact && (
        <div className="calc-keys extra">
          {EXTRA.map((k) => (
            <button key={k} type="button" className="calc-key fn" onClick={() => press(k)}>
              {k}
            </button>
          ))}
        </div>
      )}
      <div className="calc-keys">
        {BASIC.map((k) => (
          <button key={k} type="button" className={keyClass(k)} title={k === 'AC' ? 'Alles löschen (Esc)' : k === '⌫' ? 'Letztes Zeichen löschen' : undefined} onClick={() => press(k)}>
            {k}
          </button>
        ))}
      </div>
      {!compact && history.length > 0 && (
        <div className="calc-history-wrap">
          <div className="calc-history-head">
            <span className="quick-sub">Verlauf</span>
            <button type="button" className="link-btn" onClick={() => setHistory([])}>
              leeren
            </button>
          </div>
          <ul className="calc-history">
            {history.map((h, i) => (
              <li key={i}>
                <button type="button" onClick={() => setExpr(h.result.replace(/\./g, ''))}>
                  <span className="dim">{h.expr} =</span> <b>{h.result}</b>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ---------- Notes (saved automatically) ----------
const NOTES_KEY = 'znerol.notes'

export function Notes({ compact = false }: { compact?: boolean }): JSX.Element {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(NOTES_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [saved, setSaved] = useState(true)
  useEffect(() => {
    setSaved(false)
    const t = setTimeout(() => {
      try {
        localStorage.setItem(NOTES_KEY, text)
      } catch {
        // storage blocked: stays in memory
      }
      setSaved(true)
    }, 400)
    return () => clearTimeout(t)
  }, [text])
  // other windows (second screen) see the same notes
  useEffect(() => {
    const on = (e: StorageEvent): void => {
      if (e.key === NOTES_KEY && e.newValue !== null) setText(e.newValue)
    }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])
  return (
    <div className={`tool notes ${compact ? 'compact' : ''}`}>
      <textarea
        className="notes-area"
        value={text}
        placeholder="Notizen, Einkaufsliste, Ideen … wird automatisch gespeichert"
        aria-label="Notizen"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="quick-sub">{saved ? `Gespeichert · ${text.length} Zeichen` : 'Speichert …'}</div>
    </div>
  )
}

// ---------- Unit converter ----------
type Unit = { id: string; label: string; toBase: (v: number) => number; fromBase: (v: number) => number }
const linear = (id: string, label: string, factor: number): Unit => ({ id, label, toBase: (v) => v * factor, fromBase: (v) => v / factor })

const UNITS: Record<string, { label: string; units: Unit[] }> = {
  length: {
    label: 'Länge',
    units: [
      linear('mm', 'Millimeter', 0.001),
      linear('cm', 'Zentimeter', 0.01),
      linear('m', 'Meter', 1),
      linear('km', 'Kilometer', 1000),
      linear('in', 'Zoll (inch)', 0.0254),
      linear('ft', 'Fuß (feet)', 0.3048),
      linear('mi', 'Meile', 1609.344)
    ]
  },
  weight: {
    label: 'Gewicht',
    units: [linear('g', 'Gramm', 0.001), linear('kg', 'Kilogramm', 1), linear('t', 'Tonne', 1000), linear('oz', 'Unze', 0.028349523125), linear('lb', 'Pfund (lb)', 0.45359237)]
  },
  temp: {
    label: 'Temperatur',
    units: [
      { id: 'c', label: '°C', toBase: (v) => v, fromBase: (v) => v },
      { id: 'f', label: '°F', toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: 'k', label: 'Kelvin', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 }
    ]
  },
  speed: {
    label: 'Tempo',
    units: [linear('kmh', 'km/h', 1 / 3.6), linear('ms', 'm/s', 1), linear('mph', 'mph', 0.44704), linear('kn', 'Knoten', 0.514444)]
  },
  data: {
    label: 'Daten',
    units: [linear('b', 'Byte', 1), linear('kb', 'KB', 1024), linear('mb', 'MB', 1024 ** 2), linear('gb', 'GB', 1024 ** 3), linear('tb', 'TB', 1024 ** 4)]
  },
  time: {
    label: 'Zeit',
    units: [linear('s', 'Sekunden', 1), linear('min', 'Minuten', 60), linear('h', 'Stunden', 3600), linear('d', 'Tage', 86400), linear('w', 'Wochen', 604800)]
  }
}

export function Converter(): JSX.Element {
  const [kind, setKind] = useState('length')
  const cat = UNITS[kind]
  const [from, setFrom] = useState('m')
  const [to, setTo] = useState('km')
  const [value, setValue] = useState('1')
  const pick = (k: string): void => {
    setKind(k)
    setFrom(UNITS[k].units[0].id)
    setTo(UNITS[k].units[1].id)
  }
  const fu = cat.units.find((u) => u.id === from) ?? cat.units[0]
  const tu = cat.units.find((u) => u.id === to) ?? cat.units[1]
  const n = parseFloat(value.replace(',', '.'))
  const out = Number.isFinite(n) ? formatNumber(tu.fromBase(fu.toBase(n))) : '–'
  return (
    <div className="tool converter">
      <div className="presets">
        {Object.entries(UNITS).map(([k, c]) => (
          <button key={k} type="button" className={`chip ${k === kind ? 'active' : ''}`} onClick={() => pick(k)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="conv-row">
        <input className="text-input mono" value={value} inputMode="decimal" aria-label="Wert" onChange={(e) => setValue(e.target.value)} />
        <select value={fu.id} aria-label="Von" onChange={(e) => setFrom(e.target.value)}>
          {cat.units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="btn btn-sm swap-btn"
        onClick={() => {
          setFrom(tu.id)
          setTo(fu.id)
        }}
      >
        ⇅ tauschen
      </button>
      <div className="conv-row">
        <div className="conv-result mono">{out}</div>
        <select value={tu.id} aria-label="Nach" onChange={(e) => setTo(e.target.value)}>
          {cat.units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ---------- Random: dice, coin, number ----------
export function RandomTool(): JSX.Element {
  const [dice, setDice] = useState(1)
  const [rolled, setRolled] = useState<number[]>([])
  const [coin, setCoin] = useState<string | null>(null)
  const [min, setMin] = useState('1')
  const [max, setMax] = useState('100')
  const [num, setNum] = useState<number | null>(null)
  const rnd = (n: number): number => {
    const a = new Uint32Array(1)
    crypto.getRandomValues(a)
    return a[0] % n
  }
  const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
  return (
    <div className="tool random">
      <div className="rand-row">
        <button type="button" className="btn btn-primary" onClick={() => setRolled(Array.from({ length: dice }, () => rnd(6) + 1))}>
          Würfeln
        </button>
        <select value={dice} aria-label="Anzahl Würfel" onChange={(e) => setDice(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'Würfel' : 'Würfel'}
            </option>
          ))}
        </select>
        <span className="dice">{rolled.map((r) => FACES[r - 1]).join(' ')}</span>
        {rolled.length > 1 && <span className="quick-sub">= {rolled.reduce((a, b) => a + b, 0)}</span>}
      </div>
      <div className="rand-row">
        <button type="button" className="btn" onClick={() => setCoin(rnd(2) === 0 ? 'Kopf' : 'Zahl')}>
          Münze werfen
        </button>
        {coin && <b className="rand-out">{coin}</b>}
      </div>
      <div className="rand-row">
        <button
          type="button"
          className="btn"
          onClick={() => {
            const a = Math.ceil(Number(min))
            const b = Math.floor(Number(max))
            if (Number.isFinite(a) && Number.isFinite(b) && b >= a) setNum(a + rnd(b - a + 1))
          }}
        >
          Zufallszahl
        </button>
        <input className="text-input short mono" value={min} aria-label="von" onChange={(e) => setMin(e.target.value.replace(/[^0-9-]/g, ''))} />
        <span className="quick-sub">bis</span>
        <input className="text-input short mono" value={max} aria-label="bis" onChange={(e) => setMax(e.target.value.replace(/[^0-9-]/g, ''))} />
        {num !== null && <b className="rand-out">{num}</b>}
      </div>
    </div>
  )
}
