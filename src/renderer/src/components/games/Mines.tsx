import { useEffect, useState } from 'react'
import { useHighscore } from './common'

interface Cell {
  mine: boolean
  open: boolean
  flag: boolean
  n: number
}

const LEVELS = {
  leicht: { w: 9, h: 9, mines: 10 },
  mittel: { w: 16, h: 16, mines: 40 },
  schwer: { w: 24, h: 16, mines: 75 }
} as const

type Level = keyof typeof LEVELS

const blank = (w: number, h: number): Cell[] =>
  Array.from({ length: w * h }, () => ({ mine: false, open: false, flag: false, n: 0 }))

function neighbors(i: number, w: number, h: number): number[] {
  const x = i % w
  const y = Math.floor(i / w)
  const out: number[] = []
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push(ny * w + nx)
    }
  return out
}

const NUM_COLORS = ['', '#4D96FF', '#46A758', '#FF6B6B', '#8E4EC6', '#F76B15', '#12A594', '#E5484D', '#999']

export default function Mines(): JSX.Element {
  const [level, setLevel] = useState<Level>('leicht')
  const { w, h, mines } = LEVELS[level]
  const [cells, setCells] = useState<Cell[]>(() => blank(w, h))
  const [started, setStarted] = useState(false)
  const [state, setState] = useState<'play' | 'won' | 'lost'>('play')
  const [startAt, setStartAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const [best, submit] = useHighscore(`mines-${level}`)

  useEffect(() => {
    if (!started || state !== 'play') return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [started, state])

  const restart = (lv: Level = level): void => {
    setLevel(lv)
    setCells(blank(LEVELS[lv].w, LEVELS[lv].h))
    setStarted(false)
    setState('play')
  }

  const seconds = started ? Math.floor(((state === 'play' ? now : now) - startAt) / 1000) : 0

  const open = (i: number): void => {
    if (state !== 'play') return
    let board = cells.map((c) => ({ ...c }))
    if (!started) {
      // first click is always safe (and opens an area)
      const safe = new Set([i, ...neighbors(i, w, h)])
      let placed = 0
      while (placed < mines) {
        const r = Math.floor(Math.random() * w * h)
        if (safe.has(r) || board[r].mine) continue
        board[r].mine = true
        placed++
      }
      board.forEach((c, j) => (c.n = neighbors(j, w, h).filter((k) => board[k].mine).length))
      setStarted(true)
      setStartAt(Date.now())
      setNow(Date.now())
    }
    const c = board[i]
    if (c.flag || c.open) return
    if (c.mine) {
      board = board.map((x) => (x.mine ? { ...x, open: true } : x))
      setCells(board)
      setState('lost')
      return
    }
    const stack = [i]
    while (stack.length) {
      const j = stack.pop()!
      const cj = board[j]
      if (cj.open || cj.flag) continue
      cj.open = true
      if (cj.n === 0) stack.push(...neighbors(j, w, h))
    }
    setCells(board)
    if (board.every((x) => x.mine || x.open)) {
      setState('won')
      const time = Math.max(1, Math.floor((Date.now() - startAt) / 1000))
      // highscore = fastest time, stored as 10000 - seconds so "higher is better" works
      submit(10000 - time)
    }
  }

  const flag = (i: number, e: React.MouseEvent): void => {
    e.preventDefault()
    if (state !== 'play' || cells[i].open) return
    setCells(cells.map((c, j) => (j === i ? { ...c, flag: !c.flag } : c)))
  }

  const flags = cells.filter((c) => c.flag).length

  return (
    <div className="game">
      <div className="game-hud">
        <span>Minen <b>{mines - flags}</b></span>
        <span>Zeit <b>{seconds} s</b></span>
        <span>Bestzeit <b>{best ? `${10000 - best} s` : '–'}</b></span>
        <select value={level} aria-label="Schwierigkeit" onChange={(e) => restart(e.target.value as Level)}>
          <option value="leicht">Leicht</option>
          <option value="mittel">Mittel</option>
          <option value="schwer">Schwer</option>
        </select>
        <button type="button" className="btn btn-sm" onClick={() => restart()}>
          Neu
        </button>
      </div>
      <div className="game-stage">
        <div className="mines" style={{ gridTemplateColumns: `repeat(${w}, 28px)` }} onContextMenu={(e) => e.preventDefault()}>
          {cells.map((c, i) => (
            <button
              key={i}
              type="button"
              className={`mine-cell ${c.open ? 'open' : ''} ${c.open && c.mine ? 'boom' : ''}`}
              aria-label={c.open ? (c.mine ? 'Mine' : String(c.n || 'leer')) : c.flag ? 'Flagge' : 'verdeckt'}
              onClick={() => open(i)}
              onContextMenu={(e) => flag(i, e)}
              style={c.open && c.n ? { color: NUM_COLORS[c.n] } : undefined}
            >
              {c.open ? (c.mine ? '●' : c.n || '') : c.flag ? '⚑' : ''}
            </button>
          ))}
        </div>
        {state !== 'play' && (
          <div className="game-overlay">
            <b>{state === 'won' ? `Geschafft in ${seconds} s!` : 'Boom – eine Mine'}</b>
            <button type="button" className="btn btn-primary" onClick={() => restart()}>
              Nochmal
            </button>
          </div>
        )}
      </div>
      <div className="quick-sub">Linksklick deckt auf, Rechtsklick setzt eine Flagge. Der erste Klick ist immer sicher.</div>
    </div>
  )
}
