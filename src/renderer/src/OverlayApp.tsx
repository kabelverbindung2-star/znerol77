import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Sparkline from './components/ui/Sparkline'
import { usePerf } from './lib/usePerf'
import { useSettings } from './lib/useSettings'
import { formatBytesPerSec } from './lib/format'
import type { ClickerStatus } from './lib/types'

const ITEMS = [
  { tab: 'uebersicht', label: 'Übersicht', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { tab: 'prozesse', label: 'Prozesse', icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { tab: 'autostart', label: 'Autostart', icon: 'M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10' },
  { tab: 'autoclicker', label: 'Klicker', icon: 'M4 4l7 17 2.5-7.5L21 11z' },
  { tab: 'audio', label: 'Audio', icon: 'M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14' },
  {
    tab: 'spiele',
    label: 'Spiele',
    icon: 'M6 12h4M8 10v4M15 13h.01M18 11h.01M6 6h12a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-4a4 4 0 0 1 4-4z'
  }
]

const SIZE = 400
const C = SIZE / 2
const R = 160
const r = 86

function pt(rad: number, deg: number): [number, number] {
  const t = (deg * Math.PI) / 180
  return [C + rad * Math.cos(t), C + rad * Math.sin(t)]
}

function segmentPath(k: number): { d: string; mid: [number, number] } {
  const a0 = -120 + 60 * k + 1.5
  const a1 = -60 + 60 * k - 1.5
  const [x0, y0] = pt(R, a0)
  const [x1, y1] = pt(R, a1)
  const [x2, y2] = pt(r, a1)
  const [x3, y3] = pt(r, a0)
  const f = (n: number): string => n.toFixed(1)
  return {
    d: `M${f(x0)} ${f(y0)} A${R} ${R} 0 0 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r} ${r} 0 0 0 ${f(x3)} ${f(y3)} Z`,
    mid: pt((R + r) / 2, -90 + 60 * k)
  }
}

function Bars({ data, color }: { data: number[]; color: string }): JSX.Element {
  const top = Math.max(...data, 1)
  const last = data.slice(-16)
  return (
    <div className="bars">
      {last.map((v, i) => (
        <span
          key={i}
          style={{
            height: `${Math.max((v / top) * 100, 8)}%`,
            background: i === last.length - 1 ? color : 'rgba(255,255,255,0.22)'
          }}
        />
      ))}
    </div>
  )
}

export default function OverlayApp(): JSX.Element {
  const { sample, history } = usePerf(30)
  const { settings } = useSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const [hover, setHover] = useState(0)
  const [boost, setBoost] = useState(false)
  const [clicker, setClicker] = useState<ClickerStatus | null>(null)
  const [hotkeys, setHotkeys] = useState({ menu: 'Alt+Q', hide: 'Alt+H' })
  const [toast, setToast] = useState<{ title: string; sub?: string; n: number } | null>(null)

  useEffect(() => {
    window.znerol.system.info().then((i: any) => i?.hotkeys && setHotkeys(i.hotkeys)).catch(() => undefined)
    window.znerol.games.boostState().then(setBoost).catch(() => undefined)
    window.znerol.autoclicker.status().then((s: ClickerStatus) => setClicker(s)).catch(() => undefined)
    const offs = [
      window.znerol.overlay.onMenu((open) => {
        setMenuOpen(open)
        setHover(0)
      }),
      window.znerol.games.onBoost(setBoost),
      window.znerol.overlay.onToast((t) => setToast({ ...t, n: Date.now() })),
      window.znerol.autoclicker.onStatus((s) => setClicker(s as ClickerStatus))
    ]
    return () => offs.forEach((off) => off())
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') window.znerol.overlay.closeMenu()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const segments = useMemo(() => ITEMS.map((_, k) => segmentPath(k)), [])
  const accent = settings.accent
  const gpu = sample?.gpu[0]
  const temp = sample?.cpu.temp ?? gpu?.temp ?? null

  const rail = [
    { label: 'CPU', value: sample ? sample.cpu.load.toFixed(0) : '–', unit: ' %', data: history.cpu, color: accent },
    { label: 'GPU', value: gpu?.loadPercent != null ? gpu.loadPercent.toFixed(0) : '–', unit: gpu?.loadPercent != null ? ' %' : '', data: history.gpu, color: accent },
    { label: 'RAM', value: sample ? sample.mem.usedGB.toFixed(1) : '–', unit: ' GB', data: history.mem, color: accent },
    { label: 'Temp', value: temp != null ? temp.toFixed(0) : '–', unit: temp != null ? ' °C' : '', data: history.temp, color: '#FF9A62' }
  ]

  return (
    <div className={`ov ${menuOpen ? 'menu-open' : ''}`} style={{ '--accent': accent } as CSSProperties}>
      {toast && (
        <div key={toast.n} className="ov-glass ov-toast" role="status">
          <span className="ov-tile accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
            </svg>
          </span>
          <div>
            <div className="ov-card-title">{toast.title}</div>
            {toast.sub && <div className="ov-card-sub">{toast.sub}</div>}
          </div>
        </div>
      )}
      {(settings.overlay.enabled || menuOpen) && (
      <>
      <div className="ov-glass ov-rail">
        {rail.map((m) => (
          <div key={m.label} className="ov-metric">
            <div className="ov-metric-head">
              <span>{m.label}</span>
              <b style={{ color: m.label === 'Temp' ? '#FF9A62' : undefined }}>
                {m.value}
                <small>{m.unit}</small>
              </b>
            </div>
            <Bars data={m.data} color={m.color} />
          </div>
        ))}
      </div>

      <div className="ov-cards">
        {boost && (
          <div className="ov-glass ov-card">
            <span className="ov-tile accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </span>
            <div>
              <div className="ov-card-title">Boost aktiv</div>
              <div className="ov-card-sub">Höchstleistung</div>
            </div>
          </div>
        )}
        {clicker && (
          <div className="ov-glass ov-card">
            <span className={`ov-tile ${clicker.running ? 'accent' : ''}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4l7 17 2.5-7.5L21 11z" />
              </svg>
            </span>
            <div>
              <div className="ov-card-title">{clicker.running ? 'Klicker läuft' : 'Klicker bereit'}</div>
              <div className="ov-card-sub">{clicker.running ? `${clicker.clicks} Klicks` : 'Hotkey im Klicker-Tab'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="ov-glass ov-net">
        <div className="ov-net-head">
          <span>Netz</span>
          <span className="mono">{sample?.net.iface ?? ''}</span>
        </div>
        <Sparkline data={history.rx} color={accent} height={32} />
        <div className="mono ov-net-values">
          ↓ {formatBytesPerSec(sample?.net.rx ?? 0)} · ↑ {formatBytesPerSec(sample?.net.tx ?? 0)}
        </div>
      </div>
      </>
      )}

      {menuOpen && (
        <div className="ov-backdrop" onClick={() => window.znerol.overlay.closeMenu()}>
          <div className="ov-radial" onClick={(e) => e.stopPropagation()}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
              {segments.map((s, k) => (
                <path
                  key={k}
                  d={s.d}
                  fill={k === hover ? accent : 'rgba(10,11,9,0.72)'}
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="1"
                />
              ))}
              <circle cx={C} cy={C} r={76} fill="rgba(10,11,9,0.85)" stroke="rgba(255,255,255,0.14)" />
            </svg>
            {ITEMS.map((it, k) => {
              const [x, y] = segments[k].mid
              return (
                <button
                  key={it.tab}
                  type="button"
                  className={`ov-seg ${k === hover ? 'active' : ''}`}
                  style={{ left: x, top: y }}
                  onMouseEnter={() => setHover(k)}
                  onFocus={() => setHover(k)}
                  onClick={() => window.znerol.overlay.navigate(it.tab)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={it.icon} />
                  </svg>
                  {it.label}
                </button>
              )
            })}
            <div className="ov-center">
              <span>{ITEMS[hover].label}</span>
              <b>{sample ? `${sample.cpu.load.toFixed(0)} %` : '–'}</b>
              <small className="mono">CPU · {sample ? `${sample.mem.usedPercent.toFixed(0)} % RAM` : ''}</small>
            </div>
          </div>
          <div className="ov-hint">
            <kbd>{hotkeys.menu}</kbd> oder <kbd>Esc</kbd> schließen · <kbd>{hotkeys.hide}</kbd> Overlay ausblenden
          </div>
        </div>
      )}
    </div>
  )
}
