import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  danger?: boolean
  separator?: boolean
}

interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

/** Right-click menu: `open(event, items)` shows it at the mouse, it closes on click, Esc or scroll. */
export function useContextMenu(): { open: (e: React.MouseEvent, items: MenuItem[]) => void; menu: JSX.Element | null } {
  const [state, setState] = useState<MenuState | null>(null)
  const open = useCallback((e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault()
    e.stopPropagation()
    setState({ x: e.clientX, y: e.clientY, items })
  }, [])
  const close = useCallback(() => setState(null), [])
  return { open, menu: state ? <ContextMenu {...state} onClose={close} /> : null }
}

function ContextMenu({ x, y, items, onClose }: MenuState & { onClose: () => void }): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: x, top: y })

  // keep the menu inside the window
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setPos({
      left: Math.max(6, Math.min(x, window.innerWidth - r.width - 6)),
      top: Math.max(6, Math.min(y, window.innerHeight - r.height - 6))
    })
    el.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [x, y])

  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (!ref.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onClose)
    window.addEventListener('resize', onClose)
    document.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('resize', onClose)
      document.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  return (
    <div ref={ref} className="ctx-menu" role="menu" style={pos} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it, i) =>
        it.separator ? (
          <div key={i} className="ctx-sep" role="separator" />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            className={`${it.active ? 'active' : ''} ${it.danger ? 'danger' : ''}`}
            onClick={() => {
              onClose()
              it.onClick?.()
            }}
          >
            <span className="ctx-check">{it.active ? '✓' : ''}</span>
            {it.label}
          </button>
        )
      )}
    </div>
  )
}
