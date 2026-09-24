import { useRef, useState } from 'react'
import { useHighscore, useKeys } from './common'

type Grid = number[][]

const empty = (): Grid => Array.from({ length: 4 }, () => [0, 0, 0, 0])

function addTile(g: Grid): Grid {
  const free: [number, number][] = []
  g.forEach((row, y) => row.forEach((v, x) => v === 0 && free.push([y, x])))
  if (!free.length) return g
  const [y, x] = free[Math.floor(Math.random() * free.length)]
  const n = g.map((r) => r.slice())
  n[y][x] = Math.random() < 0.9 ? 2 : 4
  return n
}

function slideRow(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter((v) => v)
  const out: number[] = []
  let gained = 0
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === nums[i + 1]) {
      out.push(nums[i] * 2)
      gained += nums[i] * 2
      i++
    } else out.push(nums[i])
  }
  while (out.length < 4) out.push(0)
  return { row: out, gained }
}

const rotate = (g: Grid): Grid => g[0].map((_, x) => g.map((row) => row[x]).reverse())

function move(g: Grid, dir: 'left' | 'right' | 'up' | 'down'): { grid: Grid; gained: number; moved: boolean } {
  const turns = { left: 0, up: 1, right: 2, down: 3 }[dir]
  let r = g
  for (let i = 0; i < turns; i++) r = rotate(rotate(rotate(r)))
  let gained = 0
  r = r.map((row) => {
    const res = slideRow(row)
    gained += res.gained
    return res.row
  })
  for (let i = 0; i < turns; i++) r = rotate(r)
  const moved = JSON.stringify(r) !== JSON.stringify(g)
  return { grid: r, gained, moved }
}

function canMove(g: Grid): boolean {
  return (['left', 'right', 'up', 'down'] as const).some((d) => move(g, d).moved)
}

const COLORS: Record<number, [string, string]> = {
  2: ['#EEE4DA', '#3C3A32'], 4: ['#EDE0C8', '#3C3A32'], 8: ['#F2B179', '#FFFFFF'], 16: ['#F59563', '#FFFFFF'],
  32: ['#F67C5F', '#FFFFFF'], 64: ['#F65E3B', '#FFFFFF'], 128: ['#EDCF72', '#FFFFFF'], 256: ['#EDCC61', '#FFFFFF'],
  512: ['#EDC850', '#FFFFFF'], 1024: ['#EDC53F', '#FFFFFF'], 2048: ['#EDC22E', '#FFFFFF']
}

export default function Game2048(): JSX.Element {
  const [grid, setGrid] = useState<Grid>(() => addTile(addTile(empty())))
  const [score, setScore] = useState(0)
  const [best, submit] = useHighscore('2048')
  const [over, setOver] = useState(false)
  const [won, setWon] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const doMove = (dir: 'left' | 'right' | 'up' | 'down'): void => {
    if (over) return
    const res = move(grid, dir)
    if (!res.moved) return
    const next = addTile(res.grid)
    const s = score + res.gained
    setGrid(next)
    setScore(s)
    submit(s)
    if (!won && next.some((r) => r.includes(2048))) setWon(true)
    if (!canMove(next)) setOver(true)
  }

  const restart = (): void => {
    setGrid(addTile(addTile(empty())))
    setScore(0)
    setOver(false)
    setWon(false)
  }

  useKeys((e) => {
    const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
      ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down'
    }
    const d = map[e.key]
    if (d) {
      e.preventDefault()
      doMove(d)
    }
  })

  return (
    <div className="game">
      <div className="game-hud">
        <span>Punkte <b>{score}</b></span>
        <span>Rekord <b>{best}</b></span>
        <button type="button" className="btn btn-sm" onClick={restart}>
          Neu
        </button>
      </div>
      <div
        className="g2048"
        onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const t = touch.current
          touch.current = null
          if (!t) return
          const dx = e.clientX - t.x
          const dy = e.clientY - t.y
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return
          doMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
        }}
      >
        {grid.flat().map((v, i) => {
          const [bg, fg] = COLORS[v] ?? ['#3C3A32', '#FFFFFF']
          return (
            <div key={i} className={`g2048-cell ${v ? 'filled' : ''}`} style={v ? { background: bg, color: fg } : undefined}>
              {v || ''}
            </div>
          )
        })}
        {over && (
          <div className="game-overlay">
            <b>Keine Züge mehr – {score} Punkte</b>
            <button type="button" className="btn btn-primary" onClick={restart}>
              Nochmal
            </button>
          </div>
        )}
      </div>
      <div className="quick-sub">Pfeiltasten, WASD oder wischen. Gleiche Zahlen verschmelzen – schaffst du 2048?{won && ' Geschafft!'}</div>
    </div>
  )
}
