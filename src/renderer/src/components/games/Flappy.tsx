import { useEffect, useRef, useState } from 'react'
import { cssVar, roundRect, setupCanvas, useFrame, useHighscore, useKeys } from './common'

const W = 420
const H = 560
const GAP = 160
const PIPE_W = 64
const SPEED = 170

interface Pipe {
  x: number
  gapY: number
  scored: boolean
}

export default function Flappy(): JSX.Element {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [best, submit] = useHighscore('flappy')
  const [state, setState] = useState<'ready' | 'play' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const g = useRef({ y: H / 2, vy: 0, pipes: [] as Pipe[], spawn: 0, score: 0, t: 0 })

  const flap = (): void => {
    if (state !== 'play') {
      g.current = { y: H / 2, vy: -300, pipes: [], spawn: 0.6, score: 0, t: 0 }
      setScore(0)
      setState('play')
      return
    }
    g.current.vy = -300
  }

  useKeys((e) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
      e.preventDefault()
      flap()
    }
  })

  const draw = (): void => {
    const ctx = setupCanvas(canvas.current, W, H)
    if (!ctx) return
    const s = g.current
    const sky = ctx.createLinearGradient(0, 0, 0, H)
    sky.addColorStop(0, '#5DA9E9')
    sky.addColorStop(1, '#BEE3F8')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (let i = 0; i < 4; i++) {
      const span = W + 120
      const cx = ((((i * 140 - s.t * 20) % span) + span) % span) - 60
      ctx.beginPath()
      ctx.ellipse(cx, 80 + i * 40, 46, 14, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    for (const p of s.pipes) {
      ctx.fillStyle = '#46A758'
      roundRect(ctx, p.x, -10, PIPE_W, p.gapY - GAP / 2 + 10, 8)
      ctx.fill()
      roundRect(ctx, p.x, p.gapY + GAP / 2, PIPE_W, H - (p.gapY + GAP / 2) - 40, 8)
      ctx.fill()
      ctx.fillStyle = '#3B8E4A'
      ctx.fillRect(p.x - 4, p.gapY - GAP / 2 - 18, PIPE_W + 8, 18)
      ctx.fillRect(p.x - 4, p.gapY + GAP / 2, PIPE_W + 8, 18)
    }
    ctx.fillStyle = '#E8C77A'
    ctx.fillRect(0, H - 40, W, 40)
    ctx.fillStyle = '#C9A55B'
    ctx.fillRect(0, H - 40, W, 5)
    // bird
    ctx.save()
    ctx.translate(110, s.y)
    ctx.rotate(Math.max(-0.5, Math.min(1.2, s.vy / 500)))
    ctx.fillStyle = cssVar('--accent', '#FFD166')
    ctx.beginPath()
    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(7, -4, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1D1D1B'
    ctx.beginPath()
    ctx.arc(8.5, -4, 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FF9F45'
    ctx.beginPath()
    ctx.moveTo(15, 0)
    ctx.lineTo(25, 3)
    ctx.lineTo(15, 6)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = "700 40px 'Geist Variable', sans-serif"
    ctx.textAlign = 'center'
    ctx.fillText(String(s.score), W / 2, 70)
  }

  useEffect(draw)

  useFrame((dt) => {
    const s = g.current
    s.t += dt
    s.vy += 900 * dt
    s.y += s.vy * dt
    s.spawn -= dt
    if (s.spawn <= 0) {
      s.pipes.push({ x: W + 10, gapY: 120 + Math.random() * (H - 300), scored: false })
      s.spawn = 1.45
    }
    for (const p of s.pipes) {
      p.x -= SPEED * dt
      if (!p.scored && p.x + PIPE_W < 110) {
        p.scored = true
        s.score += 1
        setScore(s.score)
      }
    }
    s.pipes = s.pipes.filter((p) => p.x > -PIPE_W - 10)
    const hit =
      s.y > H - 54 ||
      s.y < -20 ||
      s.pipes.some((p) => 110 + 16 > p.x && 110 - 16 < p.x + PIPE_W && (s.y - 12 < p.gapY - GAP / 2 || s.y + 12 > p.gapY + GAP / 2))
    if (hit) {
      setState('over')
      submit(s.score)
    }
    draw()
  }, state === 'play')

  return (
    <div className="game">
      <div className="game-hud">
        <span>Punkte <b>{score}</b></span>
        <span>Rekord <b>{best}</b></span>
      </div>
      <div className="game-stage">
        <canvas ref={canvas} style={{ width: W, height: H }} onPointerDown={flap} />
        {state !== 'play' && (
          <div className="game-overlay">
            <b>{state === 'over' ? `Vorbei – ${score} Punkte` : 'Flatterflug'}</b>
            <span>Leertaste oder Klick zum Flattern</span>
            <button type="button" className="btn btn-primary" onClick={flap}>
              {state === 'over' ? 'Nochmal' : 'Start'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
