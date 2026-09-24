import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const W = 1600
const H = 1000

type Tool = 'pen' | 'marker' | 'eraser' | 'text'
type Paper = 'white' | 'dark' | 'grid' | 'dots'

interface Stroke {
  k: 's'
  tool: 'pen' | 'marker' | 'eraser'
  color: string
  size: number
  pts: [number, number, number][] // x, y, pressure
}

interface TextItem {
  k: 't'
  x: number
  y: number
  text: string
  color: string
  size: number
}

type Item = Stroke | TextItem

interface SketchMeta {
  id: string
  name: string
  updatedAt: number
  thumb: string | null
}

const COLORS = ['#1D1D1B', '#FFFFFF', '#E5484D', '#F76B15', '#FFC53D', '#46A758', '#12A594', '#0090FF', '#8E4EC6', '#D6409F']
const SIZES = [2, 4, 8, 14, 24]

function paperColor(p: Paper): string {
  return p === 'dark' ? '#1E1F22' : '#FFFFFF'
}

function drawPaper(ctx: CanvasRenderingContext2D, paper: Paper): void {
  ctx.fillStyle = paperColor(paper)
  ctx.fillRect(0, 0, W, H)
  if (paper === 'grid' || paper === 'dots') {
    ctx.fillStyle = ctx.strokeStyle = 'rgba(0,0,0,0.08)'
    ctx.lineWidth = 1
    for (let x = 40; x < W; x += 40) {
      for (let y = 40; y < H; y += 40) {
        if (paper === 'dots') {
          ctx.beginPath()
          ctx.arc(x, y, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    if (paper === 'grid') {
      ctx.beginPath()
      for (let x = 40; x < W; x += 40) {
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
      }
      for (let y = 40; y < H; y += 40) {
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
      }
      ctx.stroke()
    }
  }
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke): void {
  const pts = s.pts
  if (pts.length === 0) return
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (s.tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = ctx.fillStyle = '#000'
  } else {
    ctx.strokeStyle = ctx.fillStyle = s.color
    if (s.tool === 'marker') ctx.globalAlpha = 0.35
  }
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.arc(pts[0][0], pts[0][1], s.size / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }
  if (s.tool === 'pen') {
    // pressure-sensitive: segment by segment with varying width
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0, p0] = pts[i - 1]
      const [x1, y1, p1] = pts[i]
      ctx.lineWidth = s.size * (0.45 + ((p0 + p1) / 2) * 1.1)
      ctx.beginPath()
      if (i === 1) ctx.moveTo(x0, y0)
      else {
        const [xp, yp] = pts[i - 2]
        ctx.moveTo((xp + x0) / 2, (yp + y0) / 2)
      }
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      ctx.stroke()
    }
  } else {
    ctx.lineWidth = s.tool === 'marker' ? s.size * 2.2 : s.size * 1.6
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i]
      const [x1, y1] = pts[i + 1]
      ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    }
    const last = pts[pts.length - 1]
    ctx.lineTo(last[0], last[1])
    ctx.stroke()
  }
  ctx.restore()
}

function drawText(ctx: CanvasRenderingContext2D, t: TextItem): void {
  ctx.save()
  ctx.fillStyle = t.color
  ctx.font = `500 ${t.size}px 'Geist Variable', 'Segoe UI', sans-serif`
  ctx.textBaseline = 'top'
  t.text.split('\n').forEach((line, i) => ctx.fillText(line, t.x, t.y + i * t.size * 1.25))
  ctx.restore()
}

function newId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export default function Zeichnen(): JSX.Element {
  const [pages, setPages] = useState<SketchMeta[]>([])
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [name, setName] = useState('Zeichnung')
  const [items, setItems] = useState<Item[]>([])
  const [redo, setRedo] = useState<Item[]>([])
  const [paper, setPaper] = useState<Paper>('white')
  const [tool, setTool] = useState<Tool>('pen')
  const [color, setColor] = useState(COLORS[0])
  const [size, setSize] = useState(4)
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; value: string } | null>(null)
  const [saved, setSaved] = useState(true)

  const inkRef = useRef<HTMLCanvasElement>(null)
  const paperRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const drawing = useRef<Stroke | null>(null)
  const loadedRef = useRef(false)
  const lastSaved = useRef('')

  const refreshPages = useCallback(async () => {
    setPages(await window.znerol.sketches.list())
  }, [])

  // open the most recent drawing (or start a new one)
  useEffect(() => {
    ;(async () => {
      const list: SketchMeta[] = await window.znerol.sketches.list()
      setPages(list)
      if (list[0]) await open(list[0].id)
      else startNew()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = async (id: string): Promise<void> => {
    const s = await window.znerol.sketches.get(id)
    loadedRef.current = false
    setCurrentId(id)
    setName(s?.name ?? 'Zeichnung')
    setItems((s?.items as Item[]) ?? [])
    setPaper(((s?.background as Paper) ?? 'white') as Paper)
    lastSaved.current = JSON.stringify([s?.items ?? [], s?.background ?? 'white', s?.name ?? 'Zeichnung'])
    setRedo([])
    setTextDraft(null)
    setTimeout(() => (loadedRef.current = true), 0)
  }

  const startNew = (): void => {
    loadedRef.current = false
    setCurrentId(newId())
    setName(`Zeichnung ${new Date().toLocaleDateString('de-DE')}`)
    setItems([])
    setRedo([])
    setPaper('white')
    lastSaved.current = ''
    setTimeout(() => (loadedRef.current = true), 0)
  }

  // ---------- rendering ----------
  const redraw = useCallback(() => {
    const ink = inkRef.current?.getContext('2d')
    const pap = paperRef.current?.getContext('2d')
    if (!ink || !pap) return
    drawPaper(pap, paper)
    ink.clearRect(0, 0, W, H)
    for (const it of items) {
      if (it.k === 's') drawStroke(ink, it)
      else drawText(ink, it)
    }
  }, [items, paper])

  useLayoutEffect(() => {
    for (const c of [inkRef.current, paperRef.current]) {
      if (!c) continue
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = W * dpr
      c.height = H * dpr
      c.getContext('2d')!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    redraw()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => redraw(), [redraw])

  // ---------- autosave ----------
  useEffect(() => {
    if (!currentId || !loadedRef.current) return
    const snapshot = JSON.stringify([items, paper, name])
    // an untouched (or empty new) page is not written to disk
    if (snapshot === lastSaved.current || (!lastSaved.current && items.length === 0)) return
    setSaved(false)
    const t = setTimeout(async () => {
      const thumb = document.createElement('canvas')
      thumb.width = 240
      thumb.height = 150
      const tc = thumb.getContext('2d')!
      if (paperRef.current) tc.drawImage(paperRef.current, 0, 0, 240, 150)
      if (inkRef.current) tc.drawImage(inkRef.current, 0, 0, 240, 150)
      await window.znerol.sketches.save({
        id: currentId,
        name,
        updatedAt: Date.now(),
        thumb: thumb.toDataURL('image/png'),
        items,
        background: paper
      })
      lastSaved.current = snapshot
      setSaved(true)
      refreshPages()
    }, 700)
    return () => clearTimeout(t)
  }, [items, paper, name, currentId, refreshPages])

  // ---------- input ----------
  const toCanvas = (e: React.PointerEvent | PointerEvent): [number, number] => {
    const rect = inkRef.current!.getBoundingClientRect()
    return [((e.clientX - rect.left) / rect.width) * W, ((e.clientY - rect.top) / rect.height) * H]
  }

  const onPointerDown = (e: React.PointerEvent): void => {
    if (e.button !== 0) return
    const [x, y] = toCanvas(e)
    if (tool === 'text') {
      commitText()
      setTextDraft({ x, y, value: '' })
      return
    }
    try {
      inkRef.current!.setPointerCapture(e.pointerId)
    } catch {
      // pointer already gone; drawing still works without capture
    }
    const pressure = e.pointerType === 'pen' ? e.pressure || 0.5 : 0.5
    drawing.current = { k: 's', tool, color, size, pts: [[x, y, pressure]] }
  }

  const onPointerMove = (e: React.PointerEvent): void => {
    const s = drawing.current
    if (!s) return
    // coalesced events give smoother lines on fast pens; fall back to the event itself
    const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? []
    const events = (coalesced.length ? coalesced : [e.nativeEvent]) as PointerEvent[]
    for (const ev of events) {
      const [x, y] = toCanvas(ev)
      const last = s.pts[s.pts.length - 1]
      if (Math.hypot(x - last[0], y - last[1]) < 1.2) continue
      s.pts.push([x, y, ev.pointerType === 'pen' ? ev.pressure || 0.5 : 0.5])
    }
    // live preview: redraw committed ink + current stroke
    const ink = inkRef.current!.getContext('2d')!
    ink.clearRect(0, 0, W, H)
    for (const it of items) {
      if (it.k === 's') drawStroke(ink, it)
      else drawText(ink, it)
    }
    drawStroke(ink, s)
  }

  const onPointerUp = (): void => {
    const s = drawing.current
    drawing.current = null
    if (!s) return
    setItems((prev) => [...prev, s])
    setRedo([])
  }

  const commitText = (): void => {
    setTextDraft((d) => {
      if (d && d.value.trim()) {
        const size2 = Math.max(18, size * 5)
        setItems((prev) => [...prev, { k: 't', x: d.x, y: d.y, text: d.value, color, size: size2 }])
        setRedo([])
      }
      return null
    })
  }

  const undo = useCallback(() => {
    setItems((prev) => {
      if (!prev.length) return prev
      setRedo((r) => [prev[prev.length - 1], ...r])
      return prev.slice(0, -1)
    })
  }, [])

  const redoOne = useCallback(() => {
    setRedo((r) => {
      if (!r.length) return r
      setItems((prev) => [...prev, r[0]])
      return r.slice(1)
    })
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (textDraft) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redoOne()
        else undo()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redoOne()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redoOne, textDraft])

  const exportPng = (): void => {
    // paper and ink are separate so the eraser only removes ink; merge them for the file
    const out = document.createElement('canvas')
    out.width = W
    out.height = H
    const c = out.getContext('2d')!
    drawPaper(c, paper)
    const ink = document.createElement('canvas')
    ink.width = W
    ink.height = H
    const ic = ink.getContext('2d')!
    for (const it of items) {
      if (it.k === 's') drawStroke(ic, it)
      else drawText(ic, it)
    }
    c.drawImage(ink, 0, 0)
    const a = document.createElement('a')
    a.href = out.toDataURL('image/png')
    a.download = `${name.replace(/[^\wäöüÄÖÜß -]/g, '_') || 'Zeichnung'}.png`
    a.click()
  }

  const remove = async (id: string): Promise<void> => {
    if (!confirm('Diese Zeichnung löschen?')) return
    await window.znerol.sketches.remove(id)
    const list: SketchMeta[] = await window.znerol.sketches.list()
    setPages(list)
    if (id === currentId) {
      if (list[0]) open(list[0].id)
      else startNew()
    }
  }

  // position of the text box on screen
  const draftStyle = (() => {
    if (!textDraft || !inkRef.current || !wrapRef.current) return undefined
    const rect = inkRef.current.getBoundingClientRect()
    const wrap = wrapRef.current.getBoundingClientRect()
    const scale = rect.width / W
    return {
      left: rect.left - wrap.left + textDraft.x * scale,
      top: rect.top - wrap.top + textDraft.y * scale,
      fontSize: Math.max(18, size * 5) * scale,
      color
    }
  })()

  const toolBtn = (t: Tool, label: string, icon: string): JSX.Element => (
    <button type="button" className={`tool-btn ${tool === t ? 'active' : ''}`} aria-pressed={tool === t} title={label} onClick={() => setTool(t)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={icon} />
      </svg>
      <span>{label}</span>
    </button>
  )

  return (
    <div className="sketch">
      <aside className="glass sketch-pages">
        <button type="button" className="btn btn-primary wide" onClick={startNew}>
          + Neue Zeichnung
        </button>
        <div className="sketch-list">
          {pages.map((p) => (
            <div key={p.id} className={`sketch-item ${p.id === currentId ? 'active' : ''}`}>
              <button type="button" className="sketch-open" onClick={() => open(p.id)}>
                {p.thumb ? <img src={p.thumb} alt="" /> : <span className="sketch-blank" />}
                <span className="sketch-name">{p.name}</span>
              </button>
              <button type="button" className="wp-remove" aria-label={`${p.name} löschen`} onClick={() => remove(p.id)}>
                ×
              </button>
            </div>
          ))}
        </div>
      </aside>

      <div className="sketch-main">
        <div className="glass sketch-toolbar">
          <input className="text-input sketch-title" value={name} aria-label="Name der Zeichnung" onChange={(e) => setName(e.target.value)} />
          <div className="tool-group">
            {toolBtn('pen', 'Stift', 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z')}
            {toolBtn('marker', 'Marker', 'M9 11l-6 6v3h9l3-3M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4')}
            {toolBtn('eraser', 'Radierer', 'M20 20H7L3 16a2 2 0 0 1 0-2.8l9.2-9.2a2 2 0 0 1 2.8 0l5 5a2 2 0 0 1 0 2.8L13 19')}
            {toolBtn('text', 'Text', 'M4 7V4h16v3M9 20h6M12 4v16')}
          </div>
          <div className="tool-group">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch small ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                aria-label={`Farbe ${c}`}
                onClick={() => {
                  setColor(c)
                  if (tool === 'eraser') setTool('pen')
                }}
              />
            ))}
          </div>
          <div className="tool-group">
            {SIZES.map((s) => (
              <button key={s} type="button" className={`size-btn ${size === s ? 'active' : ''}`} aria-label={`Größe ${s}`} onClick={() => setSize(s)}>
                <i style={{ width: Math.max(4, s), height: Math.max(4, s) }} />
              </button>
            ))}
          </div>
          <div className="tool-group">
            <select value={paper} aria-label="Papier" onChange={(e) => setPaper(e.target.value as Paper)}>
              <option value="white">Weiß</option>
              <option value="grid">Kariert</option>
              <option value="dots">Punkte</option>
              <option value="dark">Dunkel</option>
            </select>
            <button type="button" className="btn btn-sm" onClick={undo} disabled={!items.length} title="Rückgängig (Strg+Z)">
              ↶
            </button>
            <button type="button" className="btn btn-sm" onClick={redoOne} disabled={!redo.length} title="Wiederholen (Strg+Y)">
              ↷
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!items.length}
              onClick={() => {
                if (confirm('Alles auf dieser Seite löschen?')) {
                  setRedo(items.slice().reverse())
                  setItems([])
                }
              }}
            >
              Leeren
            </button>
            <button type="button" className="btn btn-sm" onClick={exportPng}>
              Als Bild speichern
            </button>
          </div>
          <span className="quick-sub sketch-saved">{saved ? 'Gespeichert' : 'Speichert …'}</span>
        </div>

        <div className="sketch-stage" ref={wrapRef}>
          <div className="sketch-paper" style={{ aspectRatio: `${W} / ${H}` }}>
            <canvas ref={paperRef} className="sketch-canvas" />
            <canvas
              ref={inkRef}
              className={`sketch-canvas ink tool-${tool}`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
          {textDraft && draftStyle && (
            <textarea
              className="sketch-text"
              autoFocus
              value={textDraft.value}
              style={draftStyle}
              placeholder="Text schreiben …"
              onChange={(e) => setTextDraft({ ...textDraft, value: e.target.value })}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  commitText()
                } else if (e.key === 'Escape') setTextDraft(null)
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
