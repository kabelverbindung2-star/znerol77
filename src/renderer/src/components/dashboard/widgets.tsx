import { useEffect, useState, type ReactNode } from 'react'
import Sparkline from '../ui/Sparkline'
import Switch from '../ui/Switch'
import InfoTip from '../ui/InfoTip'
import WeatherChip from '../WeatherChip'
import { Calculator, Countdown, Stopwatch } from '../tools/Tools'
import { usePoll } from '../../lib/usePoll'
import { BoostExplainer, useBoost } from '../../lib/boost'
import type { PerfHistory } from '../../lib/usePerf'
import type { ClickerStatus, MediaInfo, PerfSample, ProcInfo, Settings, WidgetConfig } from '../../lib/types'
import type { SettingsPatch } from '../../lib/useSettings'
import { formatBytesPerSec, formatMB, formatUptime } from '../../lib/format'

export type Size = WidgetConfig['size']

export interface WidgetProps {
  size: Size
  sample: PerfSample | null
  history: PerfHistory
  settings: Settings
  update: (patch: SettingsPatch) => Promise<void>
  goto: (tab: string) => void
  hotkeys: { menu: string; hide: string }
}

interface WidgetDef {
  name: string
  desc: string
  sizes: Size[]
  render: (p: WidgetProps) => ReactNode
}

// ---------- small helpers ----------
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

function Head({ title, right }: { title: string; right?: ReactNode }): JSX.Element {
  return (
    <div className="panel-head">
      <span>{title}</span>
      {right}
    </div>
  )
}

function Metric({
  label,
  sub,
  value,
  unit,
  data,
  color,
  max
}: {
  label: string
  sub: string
  value: string
  unit: string
  data: number[]
  color: string
  max?: number
}): JSX.Element {
  return (
    <div className="metric">
      <div className="metric-head">
        <span>{label}</span>
        <span className="mono">{sub}</span>
      </div>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      <Sparkline data={data} color={color} height={30} max={max} />
    </div>
  )
}

// ---------- widgets ----------
function ClockWidget({ size, sample, settings, update }: WidgetProps): JSX.Element {
  const now = useClock()
  const cpu = sample?.cpu.load ?? 0
  const mood = cpu < 25 ? 'alles ruhig' : cpu < 70 ? 'gut beschäftigt' : 'unter Volllast'
  return (
    <div className={`clock-widget ${size}`}>
      <div className="hero-row">
        <div className="hero-time">{now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</div>
        <WeatherChip location={settings.weather} update={update} />
      </div>
      <div className="hero-sub">
        {greeting(now.getHours())} · {now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        {size === 'l' && sample ? ` · ${mood}, ${cpu.toFixed(0)} % CPU` : ''}
      </div>
    </div>
  )
}

function ProcessesWidget({ size, goto }: WidgetProps): JSX.Element {
  const [procs, setProcs] = useState<ProcInfo[]>([])
  const count = size === 's' ? 3 : 7
  // listing processes is expensive on Windows, so only every 10 s and only while visible
  usePoll(async () => setProcs(((await window.znerol.processes.list()) as ProcInfo[]).slice(0, 7)), 10000)
  return (
    <>
      <Head
        title="Größte Verbraucher"
        right={
          <button type="button" className="link-btn" onClick={() => goto('prozesse')}>
            Alle
          </button>
        }
      />
      {procs.length === 0 && <div className="empty-state">Lade Prozesse…</div>}
      {procs.slice(0, count).map((p) => (
        <div key={p.pid} className="proc-row">
          <span className="proc-icon">{p.name.charAt(0).toUpperCase()}</span>
          <span className="proc-name">{p.name.replace(/\.exe$/i, '')}</span>
          {size !== 's' && <span className="mono dim">{p.cpu.toFixed(1)} %</span>}
          <span className="mono">{formatMB(p.memMB)}</span>
        </div>
      ))}
    </>
  )
}

function QuickWidget({ settings, update, goto, hotkeys }: WidgetProps): JSX.Element {
  const boost = useBoost()
  const [loginItem, setLoginItem] = useState(false)
  const [clicker, setClicker] = useState<ClickerStatus | null>(null)
  useEffect(() => {
    window.znerol.system.getLoginItem().then(setLoginItem).catch(() => undefined)
    window.znerol.autoclicker.status().then((s: ClickerStatus) => setClicker(s)).catch(() => undefined)
    return window.znerol.autoclicker.onStatus((s) => setClicker(s as ClickerStatus))
  }, [])
  return (
    <>
      <Head title="Schnellzugriff" />
      <div className="quick">
        <InfoTip
          text={
            <>
              Blendet über deinem Spiel kleine Anzeigen für CPU, GPU, RAM und Temperatur ein. {hotkeys.menu} öffnet ein Schnellmenü,{' '}
              {hotkeys.hide} blendet alles aus. Kostet etwas Leistung – nur einschalten, wenn du es brauchst.
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
            <Switch on={boost.on} disabled={boost.busy} onToggle={boost.toggle} />
          </div>
        </InfoTip>
        <InfoTip text="Klickt automatisch für dich – bis zu 500 Mal pro Sekunde. Tempo, Maustaste und Starttaste stellst du im Klicker ein; Esc stoppt immer.">
          <div className="quick-row">
            <div>
              <div className="quick-title">Autoclicker</div>
              <div className="quick-sub">{clicker?.running ? `läuft · ${clicker.clicks} Klicks` : 'bereit'}</div>
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
              <div className="quick-sub">beim Anmelden öffnen</div>
            </div>
            <Switch on={loginItem} onToggle={(v) => window.znerol.system.setLoginItem(v).then(setLoginItem).catch(() => undefined)} />
          </div>
        </InfoTip>
      </div>
    </>
  )
}

function NetworkWidget({ sample, history }: WidgetProps): JSX.Element {
  return (
    <>
      <Head title="Netzwerk" right={<span className="mono dim">{sample?.net.iface || ''}</span>} />
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
    </>
  )
}

function DisksWidget({ sample }: WidgetProps): JSX.Element {
  return (
    <>
      <Head title="Laufwerke" />
      {(sample?.disks ?? []).slice(0, 5).map((d) => (
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
    </>
  )
}

function MediaWidget({ size }: WidgetProps): JSX.Element {
  const [media, setMedia] = useState<MediaInfo | null>(null)
  usePoll(async () => setMedia(await window.znerol.audio.media()), 3000)
  const playing = media?.status === 'Playing'
  const control = async (a: 'prev' | 'next' | 'toggle'): Promise<void> => {
    await window.znerol.audio.mediaControl(a).catch(() => undefined)
    setTimeout(async () => setMedia(await window.znerol.audio.media()), 400)
  }
  if (!media || !media.title) {
    return (
      <>
        <Head title="Musik" />
        <div className="empty-state">Gerade läuft nichts. Starte Spotify oder ein Video.</div>
      </>
    )
  }
  return (
    <div className={`media-widget ${size}`}>
      <div className="np-art small">{media.art ? <img src={media.art} alt="" /> : null}</div>
      <div className="np-info">
        <div className="np-app">{playing ? 'Läuft gerade' : 'Pausiert'}</div>
        <div className="np-title">{media.title}</div>
        <div className="np-artist">{media.artist}</div>
        <div className="np-controls">
          <button type="button" className="round-btn" aria-label="Zurück" onClick={() => control('prev')}>
            ‹‹
          </button>
          <button type="button" className="round-btn big" aria-label={playing ? 'Pause' : 'Abspielen'} onClick={() => control('toggle')}>
            {playing ? '❚❚' : '▶'}
          </button>
          <button type="button" className="round-btn" aria-label="Überspringen" onClick={() => control('next')}>
            ››
          </button>
        </div>
      </div>
    </div>
  )
}

function VolumeWidget(): JSX.Element {
  const [vol, setVol] = useState<{ volume: number; muted: boolean } | null>(null)
  usePoll(async () => {
    const s = await window.znerol.audio.get()
    setVol({ volume: s.volume, muted: s.muted })
  }, 8000)
  return (
    <>
      <Head title="Lautstärke" right={<span className="mono dim">{vol ? (vol.muted ? 'stumm' : `${vol.volume} %`) : '–'}</span>} />
      <input
        type="range"
        min={0}
        max={100}
        value={vol?.volume ?? 0}
        disabled={!vol}
        aria-label="Lautstärke"
        onChange={(e) => {
          const v = Number(e.target.value)
          setVol((o) => (o ? { ...o, volume: v } : o))
          window.znerol.audio.setVolume(v).catch(() => undefined)
        }}
      />
      <div className="row" style={{ marginTop: 10 }}>
        <button
          type="button"
          className={`btn btn-sm ${vol?.muted ? 'btn-primary' : ''}`}
          disabled={!vol}
          onClick={async () => {
            if (!vol) return
            await window.znerol.audio.setMuted(!vol.muted)
            setVol({ ...vol, muted: !vol.muted })
          }}
        >
          {vol?.muted ? 'Ton an' : 'Stumm'}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => window.znerol.audio.cycle()}>
          Gerät wechseln
        </button>
      </div>
    </>
  )
}

function CoresWidget({ sample }: WidgetProps): JSX.Element {
  const cores = sample?.cpu.cores ?? []
  return (
    <>
      <Head title="CPU-Kerne" right={<span className="mono dim">{cores.length}</span>} />
      <div className="cores">
        {cores.map((c, i) => (
          <div key={i} className="core" title={`Kern ${i + 1}: ${c.toFixed(0)} %`}>
            <div className="core-fill" style={{ height: `${Math.max(3, c)}%` }} />
          </div>
        ))}
      </div>
    </>
  )
}

function SystemWidget({ sample }: WidgetProps): JSX.Element {
  return (
    <>
      <Head title="System" />
      <div className="sys-grid">
        <span>Name</span>
        <b>{sample?.os.hostname ?? '–'}</b>
        <span>System</span>
        <b>{sample?.os.distro ?? '–'}</b>
        <span>Läuft seit</span>
        <b>{sample ? formatUptime(sample.uptimeSec) : '–'}</b>
        <span>Arbeitsspeicher</span>
        <b>{sample ? `${sample.mem.totalGB.toFixed(1)} GB` : '–'}</b>
      </div>
    </>
  )
}

function WeatherWidget({ settings, update }: WidgetProps): JSX.Element {
  return (
    <>
      <Head title="Wetter" right={<span className="quick-sub">{settings.weather?.name ?? ''}</span>} />
      <div className="weather-widget">
        <WeatherChip location={settings.weather} update={update} />
        <span className="quick-sub">Drüberfahren zeigt die Temperatur</span>
      </div>
    </>
  )
}

const pct = (v: number | null | undefined): string => (v == null ? '–' : v.toFixed(0))

export const WIDGETS: Record<string, WidgetDef> = {
  clock: { name: 'Uhr & Wetter', desc: 'Große Uhrzeit, Datum und Wetter-Symbol', sizes: ['m', 'l'], render: (p) => <ClockWidget {...p} /> },
  cpu: {
    name: 'Prozessor',
    desc: 'Auslastung mit Verlauf',
    sizes: ['s', 'm'],
    render: ({ sample, history }) => (
      <Metric label="CPU" sub={sample?.cpu.speed ? `${sample.cpu.speed.toFixed(1)} GHz` : ''} value={sample ? pct(sample.cpu.load) : '–'} unit=" %" data={history.cpu} color="var(--accent)" max={100} />
    )
  },
  gpu: {
    name: 'Grafikkarte',
    desc: 'GPU-Auslastung',
    sizes: ['s', 'm'],
    render: ({ sample, history }) => {
      const g = sample?.gpu[0]
      return (
        <Metric
          label="GPU"
          sub={g?.model ? g.model.replace(/^(NVIDIA|AMD|Intel\(R\))\s*/i, '').slice(0, 18) : ''}
          value={pct(g?.loadPercent)}
          unit={g?.loadPercent != null ? ' %' : ''}
          data={history.gpu}
          color="var(--text)"
          max={100}
        />
      )
    }
  },
  ram: {
    name: 'Arbeitsspeicher',
    desc: 'Belegter RAM',
    sizes: ['s', 'm'],
    render: ({ sample, history }) => (
      <Metric label="RAM" sub={sample ? `${sample.mem.totalGB.toFixed(1)} GB` : ''} value={sample ? sample.mem.usedGB.toFixed(1) : '–'} unit=" GB" data={history.mem} color="var(--text)" max={100} />
    )
  },
  temp: {
    name: 'Temperatur',
    desc: 'CPU- bzw. GPU-Temperatur',
    sizes: ['s', 'm'],
    render: ({ sample, history }) => {
      const t = sample?.cpu.temp ?? sample?.gpu[0]?.temp ?? null
      return (
        <Metric
          label="Temperatur"
          sub={sample?.cpu.temp != null ? 'CPU' : sample?.gpu[0]?.temp != null ? 'GPU' : 'als Admin'}
          value={t != null ? t.toFixed(0) : '–'}
          unit={t != null ? ' °C' : ''}
          data={history.temp}
          color="var(--warm)"
        />
      )
    }
  },
  processes: { name: 'Größte Verbraucher', desc: 'Programme mit der meisten Last', sizes: ['s', 'm'], render: (p) => <ProcessesWidget {...p} /> },
  quick: { name: 'Schnellzugriff', desc: 'Overlay, Boost, Klicker, Autostart', sizes: ['m'], render: (p) => <QuickWidget {...p} /> },
  media: { name: 'Musik', desc: 'Was gerade läuft, mit Pause und Überspringen', sizes: ['m', 'l'], render: (p) => <MediaWidget {...p} /> },
  volume: { name: 'Lautstärke', desc: 'Lautstärke, stumm, Gerät wechseln', sizes: ['s', 'm'], render: () => <VolumeWidget /> },
  network: { name: 'Netzwerk', desc: 'Download und Upload', sizes: ['m', 'l'], render: (p) => <NetworkWidget {...p} /> },
  disks: { name: 'Laufwerke', desc: 'Belegter Speicherplatz', sizes: ['m'], render: (p) => <DisksWidget {...p} /> },
  cores: { name: 'CPU-Kerne', desc: 'Jeder Kern einzeln', sizes: ['m', 'l'], render: (p) => <CoresWidget {...p} /> },
  system: { name: 'System', desc: 'PC-Name, Windows, Laufzeit', sizes: ['s', 'm'], render: (p) => <SystemWidget {...p} /> },
  weather: { name: 'Wetter', desc: 'Wetter-Symbol mit Temperatur', sizes: ['s', 'm'], render: (p) => <WeatherWidget {...p} /> },
  stopwatch: {
    name: 'Stoppuhr',
    desc: 'Läuft weiter, auch im Hintergrund',
    sizes: ['s', 'm'],
    render: () => (
      <>
        <Head title="Stoppuhr" />
        <Stopwatch compact />
      </>
    )
  },
  timer: {
    name: 'Timer',
    desc: 'Countdown mit Ton',
    sizes: ['s', 'm'],
    render: () => (
      <>
        <Head title="Timer" />
        <Countdown compact />
      </>
    )
  },
  calculator: {
    name: 'Taschenrechner',
    desc: 'Rechnen, auch mit Tastatur',
    sizes: ['m'],
    render: () => (
      <>
        <Head title="Rechner" />
        <Calculator compact />
      </>
    )
  }
}
