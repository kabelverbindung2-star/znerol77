import { useEffect, useState, type ReactNode } from 'react'
import NavIcon from '../ui/NavIcon'
import { Calculator, Converter, Countdown, Notes, RandomTool, Stopwatch } from '../tools/Tools'

type ToolId = 'calc' | 'timer' | 'stopwatch' | 'notes' | 'convert' | 'dice'
type Width = 's' | 'm' | 'l'
interface Slot {
  id: ToolId
  width: Width
  tall: boolean
  hidden: boolean
}

const TOOLS: Record<ToolId, { title: string; sub: string; render: (big: boolean) => ReactNode }> = {
  calc: { title: 'Rechner', sub: 'Tastatur geht auch · Esc löscht', render: (big) => <Calculator big={big} /> },
  timer: { title: 'Timer', sub: 'Stunden, Minuten, Sekunden', render: () => <Countdown /> },
  stopwatch: { title: 'Stoppuhr', sub: 'mit Runden', render: () => <Stopwatch /> },
  notes: { title: 'Notizen', sub: 'wird automatisch gespeichert', render: () => <Notes /> },
  convert: { title: 'Umrechner', sub: 'Länge, Gewicht, Temperatur …', render: () => <Converter /> },
  dice: { title: 'Zufall', sub: 'Würfel, Münze, Zahl', render: () => <RandomTool /> }
}

const DEFAULT_LAYOUT: Slot[] = [
  { id: 'calc', width: 'm', tall: true, hidden: false },
  { id: 'timer', width: 'm', tall: false, hidden: false },
  { id: 'stopwatch', width: 'm', tall: false, hidden: false },
  { id: 'notes', width: 'l', tall: false, hidden: false },
  { id: 'convert', width: 'm', tall: false, hidden: false },
  { id: 'dice', width: 'm', tall: false, hidden: false }
]
const LAYOUT_KEY = 'znerol.tools.layout'
const WIDTH_LABEL: Record<Width, string> = { s: 'Klein', m: 'Mittel', l: 'Breit' }

function loadLayout(): Slot[] {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? 'null') as Slot[] | null
    if (Array.isArray(saved)) {
      const known = saved.filter((s) => s.id in TOOLS)
      // tools added in later versions appear at the end
      return [...known, ...DEFAULT_LAYOUT.filter((d) => !known.some((k) => k.id === d.id))]
    }
  } catch {
    // broken storage: default layout
  }
  return DEFAULT_LAYOUT
}

export default function Werkzeuge(): JSX.Element {
  const [layout, setLayout] = useState<Slot[]>(loadLayout)
  const [editing, setEditing] = useState(false)
  const [focus, setFocus] = useState<ToolId | null>(null)
  const [dragId, setDragId] = useState<ToolId | null>(null)

  const save = (next: Slot[]): void => {
    setLayout(next)
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(next))
    } catch {
      // keeps working until restart
    }
  }
  const patch = (id: ToolId, p: Partial<Slot>): void => save(layout.map((s) => (s.id === id ? { ...s, ...p } : s)))

  useEffect(() => {
    if (!focus) return
    const onKey = (e: KeyboardEvent): void => {
      // Esc closes the big view, except inside the calculator (there Esc clears)
      if (e.key === 'Escape' && !(e.target as HTMLElement).closest('.calculator')) setFocus(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focus])

  const onDragEnter = (overId: ToolId): void => {
    if (!dragId || dragId === overId) return
    const from = layout.findIndex((s) => s.id === dragId)
    const to = layout.findIndex((s) => s.id === overId)
    const next = layout.slice()
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setLayout(next)
  }

  const visible = layout.filter((s) => !s.hidden)
  const hidden = layout.filter((s) => s.hidden)
  const open = focus ? TOOLS[focus] : null

  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Werkzeuge</div>
          <div className="page-subtitle">Symbol antippen = groß öffnen · läuft im Hintergrund weiter</div>
        </div>
        <div className="row">
          {editing && (
            <button type="button" className="btn btn-sm ghost" onClick={() => save(DEFAULT_LAYOUT)}>
              Zurücksetzen
            </button>
          )}
          <button type="button" className={`btn btn-sm ${editing ? 'btn-primary' : ''}`} onClick={() => (editing ? (save(layout), setEditing(false)) : setEditing(true))}>
            {editing ? 'Fertig' : 'Anpassen'}
          </button>
        </div>
      </div>

      {editing && hidden.length > 0 && (
        <div className="tools-hidden">
          <span className="quick-sub">Ausgeblendet:</span>
          {hidden.map((s) => (
            <button key={s.id} type="button" className="chip" onClick={() => patch(s.id, { hidden: false })}>
              + {TOOLS[s.id].title}
            </button>
          ))}
        </div>
      )}

      <div className={`tools-board ${editing ? 'editing' : ''}`}>
        {visible.map((s) => {
          const t = TOOLS[s.id]
          return (
            <section
              key={s.id}
              className={`tool-tile w-${s.width} ${s.tall ? 'tall' : ''} ${dragId === s.id ? 'dragging' : ''}`}
              draggable={editing}
              onDragStart={(e) => {
                setDragId(s.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnter={() => onDragEnter(s.id)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDragEnd={() => {
                setDragId(null)
                save(layout)
              }}
            >
              <header className="tool-tile-head">
                <button type="button" className="tool-glyph" onClick={() => !editing && setFocus(s.id)} title="Groß öffnen" aria-label={`${t.title} groß öffnen`}>
                  <NavIcon name={s.id} size={17} />
                </button>
                <div className="tool-tile-titles">
                  <div className="tool-tile-title">{t.title}</div>
                  <div className="quick-sub">{t.sub}</div>
                </div>
                {!editing && (
                  <button type="button" className="icon-btn subtle" onClick={() => setFocus(s.id)} title="Groß öffnen" aria-label={`${t.title} groß öffnen`}>
                    <NavIcon name="expand" size={15} />
                  </button>
                )}
              </header>
              {editing ? (
                <div className="tool-edit">
                  <div className="seg">
                    {(['s', 'm', 'l'] as Width[]).map((w) => (
                      <button key={w} type="button" className={s.width === w ? 'on' : ''} onClick={() => patch(s.id, { width: w })}>
                        {WIDTH_LABEL[w]}
                      </button>
                    ))}
                  </div>
                  <div className="seg">
                    <button type="button" className={!s.tall ? 'on' : ''} onClick={() => patch(s.id, { tall: false })}>
                      Normal
                    </button>
                    <button type="button" className={s.tall ? 'on' : ''} onClick={() => patch(s.id, { tall: true })}>
                      Hoch
                    </button>
                  </div>
                  <button type="button" className="btn btn-sm ghost" onClick={() => patch(s.id, { hidden: true })}>
                    Ausblenden
                  </button>
                  <span className="quick-sub">Zum Verschieben ziehen</span>
                </div>
              ) : (
                <div className="tool-tile-body">{t.render(false)}</div>
              )}
            </section>
          )
        })}
      </div>

      {open && focus && (
        <div className="tool-focus-backdrop" onClick={() => setFocus(null)}>
          <section className="tool-focus" role="dialog" aria-label={open.title} onClick={(e) => e.stopPropagation()}>
            <header className="tool-tile-head">
              <span className="tool-glyph">
                <NavIcon name={focus} size={20} />
              </span>
              <div className="tool-tile-titles">
                <div className="tool-tile-title big">{open.title}</div>
                <div className="quick-sub">{open.sub}</div>
              </div>
              <button type="button" className="btn btn-sm" onClick={() => setFocus(null)}>
                Fertig
              </button>
            </header>
            <div className="tool-focus-body">{open.render(true)}</div>
          </section>
        </div>
      )}
    </>
  )
}
