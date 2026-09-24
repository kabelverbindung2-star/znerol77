import { useEffect, useRef, useState } from 'react'
import { cssVar, roundRect, setupCanvas, useFrame, useHighscore, useKeys } from './common'

const W = 640
const H = 440
const ROWS = 6
const COLS = 10
const BW = 56
const BH = 18
const GAP = 6
const TOP = 50
const ROW_COLORS = ['#FF6B6B', '#FF9F45', '#FFD166', '#6BCB77', '#4CC9F0', '#B388EB']

function makeBricks(): { x: number; y: number; alive: boolean; color: string }[] {
  const left = (W - (COLS * BW + (COLS - 1) * GAP)) / 2
  const out = []
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) out.push({ x: left + c * (BW + GAP), y: TOP + r * (BH + GAP), alive: true, color: ROW_COLORS[r] })
  return out
}

export default function Breakout(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [best, submit] = useHighscore('breakout')
  const [state, setState] = useState<'ready' | 'play' | 'over' | 'won'>('ready')
  const [hud, setHud] = useState({ score: 0, lives: 3 })
  const g = useRef({ px: W / 2, bx: W / 2, by: H - 60, vx: 220, vy: -300, bricks: makeBricks(), score: 0, lives: 3, keys: { l: false, r: false } })

  const serve = (): void => {
    const s = g.current
    s.bx = s.px
    s.by = H - 60
    const angle = (Math.random() * 0.8 - 0.4) * Math.PI
    const speed = 340 + (s.score / 10) * 1.5
    s.vx = Math.sin(angle) * speed
    s.vy = -Math.cos(angle) * speed
  }

  const reset = (): void => {
    g.current = { ...g.current, bricks: makeBricks(), score: 0, lives: 3, px: W / 2 }
    serve()
    setHud({ score: 0, lives: 3 })
    setState('play')
  }

  useKeys((e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a') g.current.keys.l = true
    if (e.key === 'ArrowRight' || e.key === 'd') g.current.keys.r = true
    if ((e.key === ' ' || e.key === 'Enter') && state !== 'play') {
      e.preventDefault()
      reset()
    }
  })
  useEffect(() => {
    const up = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft' || e.key === 'a') g.current.keys.l = false
      if (e.key === 'ArrowRight' || e.key === 'd') g.current.keys.r = false
    }
    window.addEventListener('keyup', up)
    return () => window.removeEventListener('keyup', up)
  }, [])

  const draw = (): void => {
    const ctx = setupCanvas(canvas.current, W, H)
    if (!ctx) return
    const s = g.current
    ctx.fillStyle = '#12140F'
    ctx.fillRect(0, 0, W, H)
    for (const b of s.bricks) {
      if (!b.alive) continue
      ctx.fillStyle = b.color
      roundRect(ctx, b.x, b.y, BW, BH, 4)
      ctx.fill()
    }
    ctx.fillStyle = cssVar('--accent', '#C6F432')
    roundRect(ctx, s.px - 50, H - 30, 100, 12, 6)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(s.bx, s.by, 7, 0, Math.PI * 2)
    ctx.fill()
  }

  useEffect(draw)

  useFrame((dt) => {
    const s = g.current
    if (s.keys.l) s.px -= 520 * dt
    if (s.keys.r) s.px += 520 * dt
    s.px = Math.max(50, Math.min(W - 50, s.px))
    s.bx += s.vx * dt
    s.by += s.vy * dt
    if (s.bx < 7 || s.bx > W - 7) {
      s.vx *= -1
      s.bx = Math.max(7, Math.min(W - 7, s.bx))
    }
    if (s.by < 7) {
      s.vy = Math.abs(s.vy)
    }
    // paddle: bounce angle depends on where the ball hits
    if (s.vy > 0 && s.by > H - 37 && s.by < H - 18 && Math.abs(s.bx - s.px) < 56) {
      const speed = Math.hypot(s.vx, s.vy) * 1.01
      const t = (s.bx - s.px) / 56
      s.vx = speed * Math.sin(t * 1.05)
      s.vy = -speed * Math.cos(t * 1.05)
    }
    for (const b of s.bricks) {
      if (!b.alive) continue
      if (s.bx + 7 > b.x && s.bx - 7 < b.x + BW && s.by + 7 > b.y && s.by - 7 < b.y + BH) {
        b.alive = false
        const overlapX = Math.min(s.bx + 7 - b.x, b.x + BW - (s.bx - 7))
        const overlapY = Math.min(s.by + 7 - b.y, b.y + BH - (s.by - 7))
        if (overlapX < overlapY) s.vx *= -1
        else s.vy *= -1
        s.score += 10
        setHud({ score: s.score, lives: s.lives })
        break
      }
    }
    if (s.bricks.every((b) => !b.alive)) {
      setState('won')
      submit(s.score + s.lives * 50)
    }
    if (s.by > H + 10) {
      s.lives -= 1
      setHud({ score: s.score, lives: s.lives })
      if (s.lives <= 0) {
        setState('over')
        submit(s.score)
      } else serve()
    }
    draw()
  }, state === 'play')

  return (
    <div className="game">
      <div className="game-hud">
        <span>Punkte <b>{hud.score}</b></span>
        <span>Leben <b>{'♥'.repeat(Math.max(0, hud.lives))}</b></span>
        <span>Rekord <b>{best}</b></span>
      </div>
      <div className="game-stage">
        <canvas
          ref={canvas}
          style={{ width: W, height: H, cursor: state === 'play' ? 'none' : 'default' }}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            g.current.px = ((e.clientX - r.left) / r.width) * W
          }}
        />
        {state !== 'play' && (
          <div className="game-overlay">
            <b>{state === 'won' ? 'Alle Steine weg!' : state === 'over' ? `Vorbei – ${hud.score} Punkte` : 'Mauerbrecher'}</b>
            <span>Maus oder ← → bewegen den Schläger</span>
            <button type="button" className="btn btn-primary" onClick={reset}>
              {state === 'ready' ? 'Start' : 'Nochmal'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
