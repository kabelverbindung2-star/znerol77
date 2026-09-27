import { useEffect, useState, type ReactNode } from 'react'
import NavIcon from '../ui/NavIcon'
import { Calculator, Converter, Countdown, Notes, RandomTool, Stopwatch } from '../tools/Tools'

type ToolId = 'calc' | 'timer' | 'stopwatch' | 'notes' | 'convert' | 'dice'

const TOOLS: { id: ToolId; title: string; sub: string; className: string; render: (big: boolean) => ReactNode }[] = [
  { id: 'calc', title: 'Taschenrechner', sub: 'auch mit Tastatur · Esc löscht alles', className: 'tool-calc', render: (big) => <Calculator big={big} /> },
  { id: 'timer', title: 'Timer', sub: 'Stunden, Minuten, Sekunden', className: 'tool-timer', render: () => <Countdown /> },
  { id: 'stopwatch', title: 'Stoppuhr', sub: 'mit Runden', className: 'tool-stopwatch', render: () => <Stopwatch /> },
  { id: 'notes', title: 'Notizen', sub: 'wird automatisch gespeichert', className: 'tool-notes', render: () => <Notes /> },
  { id: 'convert', title: 'Umrechner', sub: 'Länge, Gewicht, Temperatur …', className: 'tool-convert', render: () => <Converter /> },
  { id: 'dice', title: 'Zufall', sub: 'Würfel, Münze, Zahl', className: 'tool-dice', render: () => <RandomTool /> }
]

function Head({ id, title, sub, onOpen, onClose }: { id: ToolId; title: string; sub: string; onOpen?: () => void; onClose?: () => void }): JSX.Element {
  return (
    <header className="tool-card-head">
      <button type="button" className="tool-icon" onClick={onOpen ?? onClose} title={onOpen ? 'Groß öffnen' : 'Zurück'} aria-label={onOpen ? `${title} groß öffnen` : 'Zurück'}>
        <NavIcon name={id} size={onClose ? 24 : 18} />
      </button>
      <div className="tool-card-titles">
        <div className="tool-card-title">{title}</div>
        <div className="quick-sub">{sub}</div>
      </div>
      {onOpen && (
        <button type="button" className="icon-btn tool-expand" onClick={onOpen} title="Groß öffnen" aria-label={`${title} groß öffnen`}>
          <NavIcon name="expand" size={16} />
        </button>
      )}
      {onClose && (
        <button type="button" className="btn btn-sm" onClick={onClose}>
          Zurück
        </button>
      )}
    </header>
  )
}

export default function Werkzeuge(): JSX.Element {
  const [focus, setFocus] = useState<ToolId | null>(null)
  const open = TOOLS.find((t) => t.id === focus)

  useEffect(() => {
    if (!focus) return
    const onKey = (e: KeyboardEvent): void => {
      // Esc closes the big view, except inside the calculator (there Esc clears)
      if (e.key === 'Escape' && !(e.target as HTMLElement).closest('.calculator')) setFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus])

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Werkzeuge</div>
          <div className="page-subtitle">Auf ein Symbol klicken macht das Werkzeug groß · alles läuft weiter, auch wenn du den Tab wechselst</div>
        </div>
      </div>
      <div className="tools-grid">
        {TOOLS.map((t) => (
          <section key={t.id} className={`glass tool-card ${t.className}`}>
            <Head id={t.id} title={t.title} sub={t.sub} onOpen={() => setFocus(t.id)} />
            {t.render(false)}
          </section>
        ))}
      </div>
      {open && (
        <div className="tool-focus-backdrop" onClick={() => setFocus(null)}>
          <section className={`glass tool-card tool-focus ${open.className}`} role="dialog" aria-label={open.title} onClick={(e) => e.stopPropagation()}>
            <Head id={open.id} title={open.title} sub={open.sub} onClose={() => setFocus(null)} />
            <div className="tool-focus-body">{open.render(true)}</div>
          </section>
        </div>
      )}
    </>
  )
}
