import { useEffect, useRef, useState } from 'react'
import { formatDuration, useCountdown, useStopwatch } from '../../lib/timers'
import { evaluate, formatNumber } from '../../lib/calc'

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

const PRESETS = [1, 3, 5, 10, 15, 25, 30, 60]

export function Countdown({ compact = false }: { compact?: boolean }): JSX.Element {
  const t = useCountdown()
  const [minutes, setMinutes] = useState(String(Math.round(t.duration / 60000)))
  const progress = t.duration > 0 ? 1 - t.remaining / t.duration : 0
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
          <div className="presets">
            {PRESETS.map((m) => (
              <button key={m} type="button" className="chip" onClick={() => t.setDuration(m * 60_000)}>
                {m} min
              </button>
            ))}
          </div>
          <div className="row" style={{ alignItems: 'center' }}>
            <input
              className="text-input short"
              value={minutes}
              inputMode="numeric"
              aria-label="Minuten"
              onChange={(e) => setMinutes(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <button type="button" className="btn btn-sm" onClick={() => minutes && t.setDuration(Number(minutes) * 60_000)}>
              Minuten setzen
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const KEYS = ['C', '(', ')', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '%', '0', ',', '=']

export function Calculator({ compact = false }: { compact?: boolean }): JSX.Element {
  const [expr, setExprState] = useState('')
  const exprRef = useRef('')
  // always act on the latest text, even when several keys arrive before a re-render
  const setExpr = (next: string | ((e: string) => string)): void => {
    exprRef.current = typeof next === 'function' ? next(exprRef.current) : next
    setExprState(exprRef.current)
  }
  const [result, setResult] = useState<string | null>(null)
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([])
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
    if (k === 'C') {
      setExpr('')
      setResult(null)
      return
    }
    if (k === '⌫') {
      setExpr((e) => e.slice(0, -1))
      return
    }
    if (k === '=') {
      const current = exprRef.current
      try {
        const r = formatNumber(evaluate(current))
        setHistory((h) => [{ expr: current, result: r }, ...h].slice(0, 20))
        setResult(r)
        setExpr(r.replace(/\./g, ''))
      } catch (e) {
        setResult((e as Error).message === 'Division durch 0' ? 'Nicht durch 0 teilen' : 'Fehler')
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
      const map: Record<string, string> = { '*': '×', '/': '÷', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'C', Delete: 'C', '.': ',' }
      const k = map[e.key] ?? e.key
      if (/^[0-9+\-×÷%(),]$/.test(k) || ['=', '⌫', 'C'].includes(k)) {
        e.preventDefault()
        press(k)
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  })

  return (
    <div ref={root} className={`tool calculator ${compact ? 'compact' : ''}`} tabIndex={0} aria-label="Taschenrechner">
      <div className="calc-screen">
        <div className="calc-expr mono">{expr || '0'}</div>
        <div className="calc-result mono">{result ?? (preview && preview !== expr ? `= ${preview}` : '')}</div>
      </div>
      <div className="calc-keys">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className={`calc-key ${'÷×-+'.includes(k) ? 'op' : ''} ${k === '=' ? 'eq' : ''}`}
            onClick={() => press(k)}
          >
            {k}
          </button>
        ))}
      </div>
      {!compact && history.length > 0 && (
        <ul className="calc-history">
          {history.map((h, i) => (
            <li key={i}>
              <button type="button" onClick={() => setExpr(h.result.replace(/\./g, ''))}>
                <span className="dim">{h.expr} =</span> <b>{h.result}</b>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
