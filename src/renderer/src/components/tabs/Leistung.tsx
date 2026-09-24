import { useEffect, useRef, useState } from 'react'
import Sparkline from '../ui/Sparkline'
import RingGauge from '../ui/RingGauge'
import { formatBytesPerSec, formatUptime } from '../../lib/format'

interface PerfSample {
  timestamp: number
  cpu: { load: number; cores: number[]; temp: number | null; speed: number | null }
  mem: { usedPercent: number; usedGB: number; totalGB: number; swapUsedPercent: number }
  net: { rx: number; tx: number; iface: string }
  disks: { fs: string; usedPercent: number; sizeGB: number }[]
  gpu: { model: string; loadPercent: number | null; memUsedPercent: number | null; temp: number | null }[]
  uptimeSec: number
  os: { platform: string; distro: string; hostname: string; arch: string }
}

const HISTORY_LEN = 60

export default function Leistung(): JSX.Element {
  const [sample, setSample] = useState<PerfSample | null>(null)
  const cpuHistory = useRef<number[]>([])
  const memHistory = useRef<number[]>([])
  const rxHistory = useRef<number[]>([])
  const txHistory = useRef<number[]>([])
  const [, forceTick] = useState(0)

  useEffect(() => {
    const off = window.znerol?.perf.onUpdate((data: unknown) => {
      const d = data as PerfSample
      setSample(d)
      cpuHistory.current = [...cpuHistory.current, d.cpu.load].slice(-HISTORY_LEN)
      memHistory.current = [...memHistory.current, d.mem.usedPercent].slice(-HISTORY_LEN)
      rxHistory.current = [...rxHistory.current, d.net.rx].slice(-HISTORY_LEN)
      txHistory.current = [...txHistory.current, d.net.tx].slice(-HISTORY_LEN)
      forceTick((n) => n + 1)
    })
    return () => off?.()
  }, [])

  if (!sample) {
    return (
      <>
        <Header />
        <div className="empty-state">Warte auf erste Messwerte…</div>
      </>
    )
  }

  const maxNet = Math.max(...rxHistory.current, ...txHistory.current, 1024)

  return (
    <>
      <Header hostname={sample.os.hostname} uptime={sample.uptimeSec} distro={sample.os.distro} />

      <div className="grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Arbeitsspeicher</span>
          </div>
          <div className="card-value">
            {sample.mem.usedPercent.toFixed(0)}
            <small>%</small>
          </div>
          <Sparkline data={memHistory.current} color="var(--accent-blue)" />
          <div className="card-foot">
            {sample.mem.usedGB.toFixed(1)} GB von {sample.mem.totalGB.toFixed(1)} GB belegt
            {sample.mem.swapUsedPercent > 0 && ` · Swap ${sample.mem.swapUsedPercent.toFixed(0)}%`}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Prozessor</span>
          </div>
          <div className="card-value">
            {sample.cpu.load.toFixed(0)}
            <small>%</small>
          </div>
          <Sparkline data={cpuHistory.current} color="var(--accent-green)" />
          <div className="card-foot">
            {sample.cpu.speed ? `${sample.cpu.speed.toFixed(2)} GHz` : ''}
            {sample.cpu.temp ? ` · ${sample.cpu.temp.toFixed(0)}°C` : ''} · Auslastung der letzten {HISTORY_LEN * 1.5 >= 60 ? Math.round((HISTORY_LEN * 1.5) / 60) : 1} Min.
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Netzwerk</span>
            <span style={{ fontSize: 11.5, fontWeight: 700 }}>
              <span style={{ color: 'var(--accent-purple)' }}>↓ {formatBytesPerSec(sample.net.rx)}</span>{' '}
              <span style={{ color: 'var(--accent-orange)' }}>↑ {formatBytesPerSec(sample.net.tx)}</span>
            </span>
          </div>
          <div style={{ position: 'relative', height: 56 }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Sparkline data={rxHistory.current} color="var(--accent-purple)" max={maxNet} fill={false} />
            </div>
            <div style={{ position: 'absolute', inset: 0 }}>
              <Sparkline data={txHistory.current} color="var(--accent-orange)" max={maxNet} fill={false} />
            </div>
          </div>
          <div className="card-foot">Interface: {sample.net.iface || 'unbekannt'}</div>
        </div>

        {sample.gpu.length > 0 &&
          sample.gpu.map((g, i) => (
            <div className="card" key={i}>
              <div className="card-header">
                <span className="card-title">GPU {sample.gpu.length > 1 ? i + 1 : ''}</span>
              </div>
              <div className="ring-gauge">
                <RingGauge percent={g.loadPercent ?? 0} color="var(--accent-cyan)" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{g.model}</div>
                  <div className="card-foot" style={{ marginTop: 4 }}>
                    {g.memUsedPercent != null && `VRAM ${g.memUsedPercent.toFixed(0)}%`}
                    {g.temp != null && ` · ${g.temp.toFixed(0)}°C`}
                  </div>
                </div>
              </div>
            </div>
          ))}

        {sample.disks.map((d, i) => (
          <div className="card" key={i}>
            <div className="card-header">
              <span className="card-title">Speicher {d.fs}</span>
            </div>
            <div className="ring-gauge">
              <RingGauge
                percent={d.usedPercent}
                color={d.usedPercent > 85 ? 'var(--accent-red)' : 'var(--accent-blue)'}
              />
              <div className="card-foot">{d.sizeGB.toFixed(0)} GB gesamt</div>
            </div>
          </div>
        ))}
      </div>

      <div className="section" style={{ marginTop: 22 }}>
        <div className="section-title">CPU-Kerne</div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 10 }}>
          {sample.cpu.cores.map((load, i) => (
            <div key={i} className="card" style={{ padding: '10px 8px', textAlign: 'center' }}>
              <RingGauge percent={load} color="var(--accent-green)" size={48} stroke={5} />
              <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4 }}>Kern {i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Header({
  hostname,
  uptime,
  distro
}: {
  hostname?: string
  uptime?: number
  distro?: string
}): JSX.Element {
  return (
    <div className="topbar">
      <div>
        <div className="page-title">Leistung</div>
        <div className="page-subtitle">
          {hostname ? `${hostname} · ${distro} · Uptime ${formatUptime(uptime || 0)}` : 'Live-Systemübersicht'}
        </div>
      </div>
      <span className="pill">● Live</span>
    </div>
  )
}
