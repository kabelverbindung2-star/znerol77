import type { ReactNode } from 'react'
import NavIcon from '../ui/NavIcon'
import { Calculator, Converter, Countdown, Notes, RandomTool, Stopwatch } from '../tools/Tools'

function ToolCard({ icon, title, sub, className = '', children }: { icon: string; title: string; sub?: string; className?: string; children: ReactNode }): JSX.Element {
  return (
    <section className={`glass tool-card ${className}`}>
      <header className="tool-card-head">
        <span className="tool-icon">
          <NavIcon name={icon} size={18} />
        </span>
        <div>
          <div className="tool-card-title">{title}</div>
          {sub && <div className="quick-sub">{sub}</div>}
        </div>
      </header>
      {children}
    </section>
  )
}

export default function Werkzeuge(): JSX.Element {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Werkzeuge</div>
          <div className="page-subtitle">Alles läuft weiter, auch wenn du den Tab wechselst · jedes Werkzeug gibt es auch als Kachel für die Übersicht</div>
        </div>
      </div>
      <div className="tools-grid">
        <ToolCard icon="calc" title="Taschenrechner" sub="auch mit Tastatur · Esc löscht alles" className="span-rows">
          <Calculator />
        </ToolCard>
        <ToolCard icon="timer" title="Timer" sub="Stunden, Minuten, Sekunden">
          <Countdown />
        </ToolCard>
        <ToolCard icon="stopwatch" title="Stoppuhr" sub="mit Runden">
          <Stopwatch />
        </ToolCard>
        <ToolCard icon="notes" title="Notizen" sub="wird automatisch gespeichert">
          <Notes />
        </ToolCard>
        <ToolCard icon="convert" title="Umrechner" sub="Länge, Gewicht, Temperatur …">
          <Converter />
        </ToolCard>
        <ToolCard icon="dice" title="Zufall" sub="Würfel, Münze, Zahl">
          <RandomTool />
        </ToolCard>
      </div>
    </>
  )
}
