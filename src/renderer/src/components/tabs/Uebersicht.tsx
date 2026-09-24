import { useEffect, useState } from 'react'
import Sparkline from '../ui/Sparkline'
import Switch from '../ui/Switch'
import InfoTip from '../ui/InfoTip'
import WeatherChip from '../WeatherChip'
import { usePoll } from '../../lib/usePoll'
import type { PerfHistory } from '../../lib/usePerf'
import type { ClickerStatus, PerfSample, ProcInfo, Settings } from '../../lib/types'
import type { SettingsPatch } from '../../lib/useSettings'
import { formatBytesPerSec, formatMB, formatUptime } from '../../lib/format'

interface Props {
  sample: PerfSample | null
  history: PerfHistory
  settings: Settings
  update: (patch: SettingsPatch) => Promise<void>
  goto: (tab: string) => void
  hotkeys: { menu: string; hide: string }
}

const BOOST_KEY = 'znerol.boost.blocklist'
// Discord and Spotify are deliberately not on here: most people game with them open.
export const DEFAULT_BLOCKLIST = ['OneDrive', 'Teams', 'Skype']

function useClock(): Date {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

function greeting(h: number): string {
  if (h < 5) return 'Gute Nacht'
  if (h < 11) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
}

export default function Uebersicht({ sample, history, settings, update, goto, hotkeys }: Props): JSX.Element {
  const now = useClock()
  const [procs, setProcs] = useState<ProcInfo[]>([])
  const [boost, setBoost] = useState(false)
  const [boostBusy, setBoostBusy] = useState(false)
  const [loginItem, setLoginItem] = useState(false)
  const [clicker, setClicker] = useState<ClickerStatus | null>(null)

  // listing processes is expensive on Windows, so only every 10 s and only while visible
  usePoll(async () => setProcs(((await window.znerol.processes.list()) as ProcInfo[]).slice(0, 7)), 10000)

  useEffect(() => {
    window.znerol.games.boostState().then(setBoost).catch(() => undefined)
    window.znerol.system.getLoginItem().then(setLoginItem).catch(() => undefined)
    window.znerol.autoclicker.status().then((s: ClickerStatus) => setClicker(s)).catch(() => undefined)
    const offBoost = window.znerol.games.onBoost(setBoost)
    const offClicker = window.znerol.autoclicker.onStatus((s) => setClicker(s as ClickerStatus))
    return () => {
      offBoost()
      offClicker()
    }
  }, [])

  const toggleBoost = async (on: boolean): Promise<void> => {
    setBoostBusy(true)
    try {
      if (on) {
        let list = DEFAULT_BLOCKLIST
        try {
          const saved = localStorage.getItem(BOOST_KEY)
          if (saved) list = JSON.parse(saved)
        } catch {
          // keep defaults
        }
        await window.znerol.games.boostOn(list)
      } else {
        await window.znerol.games.boostOff()
      }
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBoostBusy(false)
    }
  }

  const cpu = sample?.cpu.load ?? 0
  const gpu = sample?.gpu[0]
  const temp = sample?.cpu.temp ?? gpu?.temp ?? null
  const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })
  const mood = cpu < 25 ? 'alles ruhig' : cpu < 70 ? 'gut beschäftigt' : 'unter Volllast'

  const metrics = [
    {
      label: 'CPU',
      sub: sample?.cpu.speed ? `${sample.cpu.speed.toFixed(1)} GHz` : '',
      value: sample ? cpu.toFixed(0) : '–',
      unit: ' %',
      data: history.cpu,
      color: 'var(--accent)',
      max: 100
    },
    {
      label: 'GPU',
      sub: gpu?.model ? gpu.model.replace(/^(NVIDIA|AMD|Intel\(R\))\s*/i, '').slice(0, 18) : '',
      value: gpu?.loadPercent != null ? gpu.loadPercent.toFixed(0) : '–',
      unit: gpu?.loadPercent != null ? ' %' : '',
      data: history.gpu,
      color: 'var(--text)',
      max: 100
    },
    {
      label: 'RAM',
      sub: sample ? `${sample.mem.totalGB.toFixed(1)} GB` : '',
      value: sample ? sample.mem.usedGB.toFixed(1) : '–',
      unit: ' GB',
      data: history.mem,
      color: 'var(--text)',
      max: 100
    },
    {
      label: 'Temperatur',
      sub: sample?.cpu.temp != null ? 'CPU' : gpu?.temp != null ? 'GPU' : '',
      value: temp != null ? temp.toFixed(0) : '–',
      unit: temp != null ? ' °C' : '',
      data: history.temp,
      color: 'var(--warm)',
      max: undefined
    }
  ]

  return (
    <div className="overview">
      <div className="hero">
        <div className="hero-row">
          <div className="hero-time">{time}</div>
          <WeatherChip location={settings.weather} update={update} />
        </div>
        <div className="hero-sub">
          {greeting(now.getHours())} · {date} · {sample ? `${mood}, ${cpu.toFixed(0)} % CPU` : 'Messung startet…'}
        </div>
      </div>

      <div className="metric-grid">
        {metrics.map((m) => (
          <div key={m.label} className="glass metric">
            <div className="metric-head">
              <span>{m.label}</span>
              <span className="mono">{m.sub}</span>
            </div>
            <div className="metric-value">
              {m.value}
              <small>{m.unit}</small>
            </div>
            <Sparkline data={m.data} color={m.color} height={30} max={m.max} />
          </div>
        ))}
      </div>

      <div className="overview-grid">
        <div className="glass panel">
          <div className="panel-head">
            <span>Größte Verbraucher</span>
            <button type="button" className="link-btn" onClick={() => goto('prozesse')}>
              Alle Prozesse
            </button>
          </div>
          {procs.length === 0 && <div className="empty-state">Lade Prozesse…</div>}
          {procs.map((p) => (
            <div key={p.pid} className="proc-row">
              <span className="proc-icon">{p.name.charAt(0).toUpperCase()}</span>
              <span className="proc-name">{p.name.replace(/\.exe$/i, '')}</span>
              <span className="mono dim">{p.cpu.toFixed(1)} %</span>
              <span className="mono">{formatMB(p.memMB)}</span>
            </div>
          ))}
        </div>

        <div className="glass panel">
          <div className="panel-head">
            <span>Schnellzugriff</span>
          </div>
          <div className="quick">
            <InfoTip
              text={
                <>
                  Blendet über deinem Spiel kleine Anzeigen für CPU, GPU, RAM und Temperatur ein. {hotkeys.menu} öffnet
                  ein Schnellmenü, {hotkeys.hide} blendet alles aus. Kostet etwas Leistung – nur einschalten, wenn du es
                  brauchst. Funktioniert nicht bei Spielen im exklusiven Vollbild.
                </>
              }
            >
            <div className="quick-row">
              <div>
                <div className="quick-title">Spiel-Overlay</div>
                <div className="quick-sub">
                  {hotkeys.menu} Menü · {hotkeys.hide} ausblenden
                </div>
              </div>
              <Switch
                on={settings.overlay.enabled}
                onToggle={(v) => {
                  update({ overlay: { enabled: v } })
                  window.znerol.overlay.setEnabled(v)
                }}
              />
            </div>
            </InfoTip>
            <InfoTip text={<BoostExplainer />}>
            <div className="quick-row">
              <div>
                <div className="quick-title">Boost</div>
                <div className="quick-sub">Mehr Leistung fürs Spielen</div>
              </div>
              <Switch on={boost} disabled={boostBusy} onToggle={toggleBoost} />
            </div>
            </InfoTip>
            <InfoTip text="Klickt automatisch für dich – Tempo, Maustaste und Starttaste stellst du im Klicker-Tab ein.">
            <div className="quick-row">
              <div>
                <div className="quick-title">Autoclicker</div>
                <div className="quick-sub">
                  {clicker?.running ? `läuft · ${clicker.clicks} Klicks` : 'bereit'}
                </div>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => goto('autoclicker')}>
                Öffnen
              </button>
            </div>
            </InfoTip>
            <InfoTip text="Startet ZnerolMonitor automatisch, wenn du dich bei Windows anmeldest.">
            <div className="quick-row">
              <div>
                <div className="quick-title">Mit Windows starten</div>
                <div className="quick-sub">ZnerolMonitor beim Anmelden öffnen</div>
              </div>
              <Switch
                on={loginItem}
                onToggle={(v) => window.znerol.system.setLoginItem(v).then(setLoginItem).catch(() => undefined)}
              />
            </div>
            </InfoTip>
          </div>
        </div>

        <div className="glass panel">
          <div className="panel-head">
            <span>Netzwerk</span>
            <span className="mono dim">{sample?.net.iface || ''}</span>
          </div>
          <div className="net-values">
            <span>
              <i className="dot accent" />↓ {formatBytesPerSec(sample?.net.rx ?? 0)}
            </span>
            <span>
              <i className="dot light" />↑ {formatBytesPerSec(sample?.net.tx ?? 0)}
            </span>
          </div>
          <div className="net-chart">
            <Sparkline data={history.rx} color="var(--accent)" height={56} />
            <div className="net-overlay">
              <Sparkline data={history.tx} color="var(--text)" height={56} fill={false} />
            </div>
          </div>
        </div>

        <div className="glass panel">
          <div className="panel-head">
            <span>Laufwerke</span>
            <span className="mono dim">{sample ? `läuft seit ${formatUptime(sample.uptimeSec)}` : ''}</span>
          </div>
          {(sample?.disks ?? []).slice(0, 4).map((d) => (
            <div key={d.fs} className="disk-row">
              <span className="mono">{d.fs}</span>
              <div className="bar">
                <div className={`bar-fill ${d.usedPercent > 85 ? 'warn' : ''}`} style={{ width: `${d.usedPercent}%` }} />
              </div>
              <span className="mono dim">
                {d.usedPercent.toFixed(0)} % · {d.sizeGB >= 1000 ? `${(d.sizeGB / 1024).toFixed(1)} TB` : `${d.sizeGB.toFixed(0)} GB`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function BoostExplainer(): JSX.Element {
  let list = DEFAULT_BLOCKLIST
  try {
    const saved = localStorage.getItem(BOOST_KEY)
    if (saved) list = JSON.parse(saved)
  } catch {
    // keep defaults
  }
  return (
    <>
      <b>Was Boost macht:</b>
      <br />1. Stellt den Windows-Energiesparplan auf „Höchstleistung“ – der Prozessor taktet nicht mehr herunter.
      <br />2. Beendet diese Programme im Hintergrund: {list.length ? list.join(', ') : 'keine'} (änderbar im Tab Spiele).
      <br />
      <b>Beim Ausschalten</b> kommt dein vorheriger Energiesparplan zurück. Beendete Programme startest du bei Bedarf selbst neu.
      Der PC wird dabei eher lauter und wärmer, nicht leiser.
    </>
  )
}
