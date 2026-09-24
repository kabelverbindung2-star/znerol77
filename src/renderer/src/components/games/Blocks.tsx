import { useEffect, useRef, useState } from 'react'
import { roundRect, setupCanvas, useFrame, useHighscore, useKeys } from './common'

const COLS = 10
const ROWS = 20
const CELL = 26
const W = COLS * CELL
const H = ROWS * CELL

type Matrix = number[][]

const SHAPES: Record<string, { m: Matrix; color: string }> = {
  I: { m: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#4CC9F0' },
  O: { m: [[1, 1], [1, 1]], color: '#FFD166' },
  T: { m: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#B388EB' },
  S: { m: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#6BCB77' },
  Z: { m: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#FF6B6B' },
  J: { m: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#4D96FF' },
  L: { m: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#FF9F45' }
}

interface Piece {
  type: string
  m: Matrix
  x: number
  y: number
}

const rotateCW = (m: Matrix): Matrix => m[0].map((_, x) => m.map((row) => row[x]).reverse())

function bag(): string[] {
  const b = Object.keys(SHAPES)
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const emptyBoard = (): (string | null)[][] => Array.from({ length: ROWS }, () => Array(COLS).fill(null))

export default function Blocks(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null)
  const nextCanvas = useRef<HTMLCanvasElement>(null)
  const [best, submit] = useHighscore('blocks')
  const [state, setState] = useState<'ready' | 'play' | 'pause' | 'over'>('ready')
  const [hud, setHud] = useState({ score: 0, lines: 0, level: 1 })
  const g = useRef({
    board: emptyBoard(),
    queue: [] as string[],
    piece: null as Piece | null,
    acc: 0,
    score: 0,
    lines: 0,
    level: 1
  })

  const take = (): string => {
    const s = g.current
    if (s.queue.length < 7) s.queue.push(...bag())
    return s.queue.shift()!
  }

  const spawn = (): boolean => {
    const type = take()
    const m = SHAPES[type].m.map((r) => r.slice())
    const piece = { type, m, x: Math.floor((COLS - m[0].length) / 2), y: type === 'I' ? -1 : 0 }
    g.current.piece = piece
    return fits(piece.m, piece.x, piece.y)
  }

  const fits = (m: Matrix, px: number, py: number): boolean => {
    const b = g.current.board
    for (let y = 0; y < m.length; y++)
      for (let x = 0; x < m[y].length; x++) {
        if (!m[y][x]) continue
        const bx = px + x
        const by = py + y
        if (bx < 0 || bx >= COLS || by >= ROWS) return false
        if (by >= 0 && b[by][bx]) return false
      }
    return true
  }

  const lock = (): void => {
    const s = g.current
    const p = s.piece!
    p.m.forEach((row, y) =>
      row.forEach((v, x) => {
        if (v && p.y + y >= 0) s.board[p.y + y][p.x + x] = p.type
      })
    )
    const full = s.board.filter((row) => row.every(Boolean)).length
    if (full) {
      s.board = s.board.filter((row) => !row.every(Boolean))
      while (s.board.length < ROWS) s.board.unshift(Array(COLS).fill(null))
      s.lines += full
      s.score += [0, 100, 300, 500, 800][full] * s.level
      s.level = 1 + Math.floor(s.lines / 10)
    }
    setHud({ score: s.score, lines: s.lines, level: s.level })
    if (!spawn()) {
      setState('over')
      submit(s.score)
    }
  }

  const reset = (): void => {
    g.current = { board: emptyBoard(), queue: [], piece: null, acc: 0, score: 0, lines: 0, level: 1 }
    spawn()
    setHud({ score: 0, lines: 0, level: 1 })
    setState('play')
  }

  const tryMove = (dx: number, dy: number): boolean => {
    const p = g.current.piece
    if (!p || !fits(p.m, p.x + dx, p.y + dy)) return false
    p.x += dx
    p.y += dy
    return true
  }

  const tryRotate = (): void => {
    const p = g.current.piece
    if (!p) return
    const m = rotateCW(p.m)
    for (const k of [0, -1, 1, -2, 2]) {
      if (fits(m, p.x + k, p.y)) {
        p.m = m
        p.x += k
        return
      }
    }
  }

  useKeys((e) => {
    const k = e.key
    if (state !== 'play') {
      if (k === ' ' || k === 'Enter') {
        e.preventDefault()
        if (state === 'pause') setState('play')
        else reset()
      }
      return
    }
    const handled = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'p', 'P', 'a', 'd', 's', 'w'].includes(k)
    if (handled) e.preventDefault()
    if (k === 'ArrowLeft' || k === 'a') tryMove(-1, 0)
    else if (k === 'ArrowRight' || k === 'd') tryMove(1, 0)
    else if (k === 'ArrowDown' || k === 's') {
      if (tryMove(0, 1)) g.current.score += 1
      else lock()
    } else if (k === 'ArrowUp' || k === 'w') tryRotate()
    else if (k === ' ') {
      let n = 0
      while (tryMove(0, 1)) n++
      g.current.score += n * 2
      lock()
    } else if (k === 'p' || k === 'P') setState('pause')
    draw()
  })

  const draw = (): void => {
    const ctx = setupCanvas(canvas.current, W, H)
    if (!ctx) return
    const s = g.current
    ctx.fillStyle = '#12140F'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    for (let x = 1; x < COLS; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL, 0)
      ctx.lineTo(x * CELL, H)
      ctx.stroke()
    }
    const cell = (x: number, y: number, color: string, alpha = 1): void => {
      ctx.globalAlpha = alpha
      ctx.fillStyle = color
      roundRect(ctx, x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3, 5)
      ctx.fill()
      ctx.globalAlpha = 1
    }
    s.board.forEach((row, y) => row.forEach((t, x) => t && cell(x, y, SHAPES[t].color)))
    const p = s.piece
    if (p) {
      let gy = p.y
      while (fits(p.m, p.x, gy + 1)) gy++
      p.m.forEach((row, y) => row.forEach((v, x) => v && gy + y >= 0 && cell(p.x + x, gy + y, SHAPES[p.type].color, 0.2)))
      p.m.forEach((row, y) => row.forEach((v, x) => v && p.y + y >= 0 && cell(p.x + x, p.y + y, SHAPES[p.type].color)))
    }
    const nctx = setupCanvas(nextCanvas.current, 110, 90)
    if (nctx && s.queue[0]) {
      nctx.clearRect(0, 0, 110, 90)
      const sh = SHAPES[s.queue[0]]
      const off = (110 - sh.m[0].length * 22) / 2
      sh.m.forEach((row, y) =>
        row.forEach((v, x) => {
          if (!v) return
          nctx.fillStyle = sh.color
          roundRect(nctx, off + x * 22 + 1, 12 + y * 22 + 1, 20, 20, 4)
          nctx.fill()
        })
      )
    }
  }

  useEffect(draw)

  useFrame((dt) => {
    const s = g.current
    s.acc += dt
    const speed = Math.max(0.07, 0.8 * Math.pow(0.85, s.level - 1))
    if (s.acc >= speed) {
      s.acc = 0
      if (!tryMove(0, 1)) lock()
      draw()
    }
  }, state === 'play')

  return (
    <div className="game blocks">
      <div className="game-stage">
        <canvas ref={canvas} style={{ width: W, height: H }} />
        {state !== 'play' && (
          <div className="game-overlay">
            <b>{state === 'over' ? `Vorbei – ${hud.score} Punkte` : state === 'pause' ? 'Pause' : 'Blöcke'}</b>
            <span>← → bewegen · ↑ drehen · ↓ schneller · Leertaste fallen lassen · P Pause</span>
            <button type="button" className="btn btn-primary" onClick={() => (state === 'pause' ? setState('play') : reset())}>
              {state === 'pause' ? 'Weiter' : state === 'over' ? 'Nochmal' : 'Start'}
            </button>
          </div>
        )}
      </div>
      <div className="blocks-side">
        <div className="glass panel">
          <div className="quick-sub">Nächster</div>
          <canvas ref={nextCanvas} style={{ width: 110, height: 90 }} />
        </div>
        <div className="glass panel blocks-stats">
          <span>Punkte</span>
          <b>{hud.score}</b>
          <span>Reihen</span>
          <b>{hud.lines}</b>
          <span>Level</span>
          <b>{hud.level}</b>
          <span>Rekord</span>
          <b>{best}</b>
        </div>
      </div>
    </div>
  )
}
