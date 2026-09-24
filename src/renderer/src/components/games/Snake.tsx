import { useEffect, useRef, useState } from 'react'
import { cssVar, roundRect, setupCanvas, useFrame, useHighscore, useKeys } from './common'

const COLS = 24
const ROWS = 16
const CELL = 26
const W = COLS * CELL
const H = ROWS * CELL

type P = { x: number; y: number }

function freeCell(snake: P[]): P {
  while (true) {
    const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }
    if (!snake.some((s) => s.x === p.x && s.y === p.y)) return p
  }
}

export default function Snake(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [best, submit] = useHighscore('snake')
  const [score, setScore] = useState(0)
  const [state, setState] = useState<'ready' | 'play' | 'over'>('ready')
  const g = useRef({
    snake: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }] as P[],
    dir: { x: 1, y: 0 },
    next: { x: 1, y: 0 },
    food: { x: 16, y: 8 } as P,
    acc: 0,
    step: 0.12
  })

  const reset = (): void => {
    const snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }]
    g.current = { snake, dir: { x: 1, y: 0 }, next: { x: 1, y: 0 }, food: freeCell(snake), acc: 0, step: 0.12 }
    setScore(0)
    setState('play')
  }

  useKeys((e) => {
    const k = e.key.toLowerCase()
    const map: Record<string, P> = {
      arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 }
    }
    if (map[k]) {
      e.preventDefault()
      const d = map[k]
      const cur = g.current.dir
      if (d.x !== -cur.x || d.y !== -cur.y) g.current.next = d
      if (state !== 'play') reset()
    } else if (k === ' ' || k === 'enter') {
      e.preventDefault()
      if (state !== 'play') reset()
    }
  })

  const draw = (): void => {
    const ctx = setupCanvas(canvas.current, W, H)
    if (!ctx) return
    const accent = cssVar('--accent', '#C6F432')
    ctx.fillStyle = '#12140F'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if ((x + y) % 2 === 0) ctx.fillRect(x * CELL, y * CELL, CELL, CELL)
    const { snake, food } = g.current
    ctx.fillStyle = '#FF6B6B'
    ctx.beginPath()
    ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * 0.36, 0, Math.PI * 2)
    ctx.fill()
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? accent : accent + (i % 2 ? 'CC' : 'AA')
      roundRect(ctx, s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, 7)
      ctx.fill()
    })
  }

  useEffect(draw)

  useFrame((dt) => {
    const s = g.current
    s.acc += dt
    if (s.acc < s.step) return
    s.acc = 0
    s.dir = s.next
    const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y }
    if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || s.snake.some((p) => p.x === head.x && p.y === head.y)) {
      setState('over')
      submit(s.snake.length - 3)
      draw()
      return
    }
    s.snake.unshift(head)
    if (head.x === s.food.x && head.y === s.food.y) {
      s.food = freeCell(s.snake)
      s.step = Math.max(0.055, s.step - 0.003)
      setScore(s.snake.length - 3)
    } else s.snake.pop()
    draw()
  }, state === 'play')

  return (
    <div className="game">
      <div className="game-hud">
        <span>Punkte <b>{score}</b></span>
        <span>Rekord <b>{best}</b></span>
      </div>
      <div className="game-stage">
        <canvas ref={canvas} style={{ width: W, height: H }} />
        {state !== 'play' && (
          <div className="game-overlay">
            <b>{state === 'over' ? `Vorbei – ${score} Punkte` : 'Snake'}</b>
            <span>Pfeiltasten oder WASD · Leertaste startet</span>
            <button type="button" className="btn btn-primary" onClick={reset}>
              {state === 'over' ? 'Nochmal' : 'Start'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
