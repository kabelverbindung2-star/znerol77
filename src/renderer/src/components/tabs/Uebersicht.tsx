import { useEffect, useRef, useState } from 'react'
import NavIcon from '../ui/NavIcon'
import { useContextMenu, type MenuItem } from '../ui/ContextMenu'
import { WIDGETS, type Size, type WidgetProps } from '../dashboard/widgets'
import type { WidgetConfig } from '../../lib/types'

export { BoostExplainer, DEFAULT_BLOCKLIST } from '../../lib/boost'

type Props = Omit<WidgetProps, 'size'> & {
  /** which tile list: the main window or the second screen */
  board?: 'widgets' | 'widgets2'
  /** extra buttons at the right end of the bar (second screen: close) */
  barExtra?: JSX.Element
}

const LONG_PRESS_MS = 550
const SIZE_LABEL: Record<Size, string> = { s: 'Klein', m: 'Mittel', l: 'Breit' }

export default function Uebersicht(props: Props): JSX.Element {
  const { settings, update, board = 'widgets', barExtra } = props
  const other = board === 'widgets' ? 'widgets2' : 'widgets'
  const saved = settings.dashboard[board] ?? []
  const [widgets, setWidgets] = useState<WidgetConfig[]>(saved)
  const [editing, setEditing] = useState(false)
  const [picker, setPicker] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null)
  const justEntered = useRef(false)

  // follow changes made elsewhere (e.g. "Kacheln zurücksetzen" in the settings)
  useEffect(() => {
    if (!dragId) setWidgets(saved)
  }, [saved, dragId])

  const save = (next: WidgetConfig[]): void => {
    setWidgets(next)
    update({ dashboard: { [board]: next } })
  }

  // ---------- second screen ----------
  const [displays, setDisplays] = useState(1)
  useEffect(() => {
    const load = (): void => {
      window.znerol.screens.list().then((l) => setDisplays(l.length)).catch(() => undefined)
    }
    load()
    return window.znerol.screens.onChanged(load)
  }, [])
  const dual = settings.screens.dual
  const [note, setNote] = useState<string | null>(null)
  const toggleDual = (): void => {
    if (!dual && displays < 2) {
      setNote('Nur ein Bildschirm erkannt. Schließ einen zweiten an, dann geht es.')
      return
    }
    setNote(null)
    update({ screens: { dual: !dual } })
  }
  const moveToOther = (w: WidgetConfig): void => {
    const next = widgets.filter((x) => x.id !== w.id)
    setWidgets(next)
    update({
      dashboard: { [board]: next, [other]: [...(settings.dashboard[other] ?? []), w] },
      ...(board === 'widgets' && !dual ? { screens: { dual: true } } : {})
    })
  }

  // ---------- right click on a tile ----------
  const ctx = useContextMenu()
  const tileMenu = (e: React.MouseEvent, w: WidgetConfig, size: Size): void => {
    const def = WIDGETS[w.type]
    const items: MenuItem[] = [
      board === 'widgets'
        ? {
            label: displays < 2 ? 'Auf Bildschirm 2 (nur 1 Bildschirm erkannt)' : 'Auf Bildschirm 2 verschieben',
            disabled: displays < 2,
            onClick: () => moveToOther(w)
          }
        : { label: 'Auf Hauptbildschirm verschieben', onClick: () => moveToOther(w) },
      { label: '', separator: true },
      ...def.sizes.map((s) => ({ label: SIZE_LABEL[s], active: s === size, onClick: () => setSize(w.id, s) })),
      { label: '', separator: true },
      { label: 'Kacheln bearbeiten', onClick: () => setEditing(true) },
      { label: `${def.name} entfernen`, danger: true, onClick: () => remove(w.id) }
    ]
    ctx.open(e, items)
  }

  // ---------- long press to edit ----------
  const onPointerDown = (e: React.PointerEvent): void => {
    if (editing || e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('input, textarea, select, .weather')) return
    press.current = {
      x: e.clientX,
      y: e.clientY,
      timer: setTimeout(() => {
        press.current = null
        justEntered.current = true
        setEditing(true)
        setTimeout(() => (justEntered.current = false), 400)
      }, LONG_PRESS_MS)
    }
  }
  const cancelPress = (): void => {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
  }
  const onPointerMove = (e: React.PointerEvent): void => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress()
  }

  // Esc leaves edit mode
  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (picker) setPicker(false)
        else setEditing(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, picker])

  // ---------- drag & drop ----------
  const onDragEnter = (overId: string): void => {
    if (!dragId || dragId === overId) return
    setWidgets((list) => {
      const from = list.findIndex((w) => w.id === dragId)
      const to = list.findIndex((w) => w.id === overId)
      if (from < 0 || to < 0) return list
      const next = list.slice()
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }
  const onDragEnd = (): void => {
    setDragId(null)
    update({ dashboard: { [board]: widgets } })
  }

  const setSize = (id: string, size: Size): void => save(widgets.map((w) => (w.id === id ? { ...w, size } : w)))
  const remove = (id: string): void => save(widgets.filter((w) => w.id !== id))
  const add = (type: string): void => {
    const def = WIDGETS[type]
    const size = def.sizes.includes('m') ? 'm' : def.sizes[0]
    save([...widgets, { id: `w-${type}-${Date.now().toString(36)}`, type, size }])
    setPicker(false)
  }

  return (
    <div className={`dashboard ${editing ? 'editing' : ''}`}>
      <div className="dash-bar">
        {editing ? (
          <>
            <span className="quick-sub">Ziehen zum Verschieben · Größe und × an jeder Kachel</span>
            <button type="button" className="btn btn-sm" onClick={() => setPicker(true)}>
              <NavIcon name="plus" size={14} /> Kachel hinzufügen
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setEditing(false)}>
              Fertig
            </button>
          </>
        ) : (
          <>
            {note && <span className="quick-sub">{note}</span>}
            {board === 'widgets' && (
              <button
                type="button"
                className={`btn btn-sm ghost ${dual ? 'on' : ''}`}
                aria-pressed={dual}
                onClick={toggleDual}
                title="Zweites Fenster mit eigenen Kacheln auf dem anderen Bildschirm. Rechtsklick auf eine Kachel verschiebt sie."
              >
                <NavIcon name="screens" size={15} /> 2 Bildschirme{dual ? ': an' : ''}
              </button>
            )}
            <button type="button" className="btn btn-sm ghost" onClick={() => setEditing(true)} title="Oder lange auf eine Kachel drücken · Rechtsklick für mehr">
              Bearbeiten
            </button>
          </>
        )}
        {barExtra}
      </div>

      <div className="dash-grid">
        {widgets.map((w) => {
          const def = WIDGETS[w.type]
          if (!def) return null
          const size: Size = def.sizes.includes(w.size) ? w.size : def.sizes[0]
          return (
            <div
              key={w.id}
              className={`tile size-${size} tile-${w.type} ${w.type === 'clock' ? 'bare' : 'glass'} ${dragId === w.id ? 'dragging' : ''}`}
              draggable={editing}
              onDragStart={(e) => {
                setDragId(w.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', w.id)
              }}
              onDragEnter={() => onDragEnter(w.id)}
              onDragOver={(e) => editing && e.preventDefault()}
              onDragEnd={onDragEnd}
              onContextMenu={(e) => tileMenu(e, w, size)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={cancelPress}
              onPointerLeave={cancelPress}
              onClickCapture={(e) => {
                if (justEntered.current) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              }}
            >
              <div className="tile-body">{def.render({ ...props, size })}</div>
              {editing && (
                <div className="tile-edit">
                  <span className="tile-name">{def.name}</span>
                  <div className="tile-sizes">
                    {def.sizes.map((s) => (
                      <button key={s} type="button" className={s === size ? 'active' : ''} onClick={() => setSize(w.id, s)}>
                        {SIZE_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="tile-remove" aria-label={`${def.name} entfernen`} onClick={() => remove(w.id)}>
                    <NavIcon name="close" size={14} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {editing && (
          <button type="button" className="tile size-s add-tile" onClick={() => setPicker(true)}>
            <NavIcon name="plus" size={28} />
            <span>Kachel hinzufügen</span>
          </button>
        )}
        {!editing && widgets.length === 0 && (
          <div className="empty-state">
            Keine Kacheln. <button type="button" className="link-btn" onClick={() => setEditing(true)}>Bearbeiten</button> und über + welche hinzufügen.
          </div>
        )}
      </div>

      {ctx.menu}

      {picker && (
        <div className="modal-backdrop" onClick={() => setPicker(false)}>
          <div className="glass modal" role="dialog" aria-label="Kachel hinzufügen" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <span>Kachel hinzufügen</span>
              <button type="button" className="icon-btn" aria-label="Schließen" onClick={() => setPicker(false)}>
                <NavIcon name="close" size={16} />
              </button>
            </div>
            <div className="picker-grid">
              {Object.entries(WIDGETS).map(([type, def]) => {
                const count = widgets.filter((w) => w.type === type).length
                return (
                  <button key={type} type="button" className="picker-item" onClick={() => add(type)}>
                    <b>{def.name}</b>
                    <span className="quick-sub">{def.desc}</span>
                    {count > 0 && <span className="badge">schon {count}× da</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
