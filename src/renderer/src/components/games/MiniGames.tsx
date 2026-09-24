import { lazy, Suspense, useState } from 'react'

const GAMES = [
  { id: 'snake', name: 'Snake', desc: 'Friss die Äpfel, werde länger, beiß dich nicht selbst.', color: '#6BCB77', load: () => import('./Snake') },
  { id: '2048', name: '2048', desc: 'Schiebe gleiche Zahlen zusammen bis 2048.', color: '#EDC22E', load: () => import('./Game2048') },
  { id: 'blocks', name: 'Blöcke', desc: 'Fallende Steine, volle Reihen verschwinden.', color: '#4CC9F0', load: () => import('./Blocks') },
  { id: 'mines', name: 'Minensucher', desc: 'Finde alle Felder ohne Mine.', color: '#B388EB', load: () => import('./Mines') },
  { id: 'breakout', name: 'Mauerbrecher', desc: 'Schläger, Ball, bunte Steine.', color: '#FF9F45', load: () => import('./Breakout') },
  { id: 'flappy', name: 'Flatterflug', desc: 'Durch die Lücken flattern – nur eine Taste.', color: '#FF6B6B', load: () => import('./Flappy') }
] as const

// each game is its own chunk, so the Spiele tab stays light until you actually play
const LAZY = Object.fromEntries(GAMES.map((g) => [g.id, lazy(g.load)])) as Record<string, React.LazyExoticComponent<() => JSX.Element>>

function best(id: string): string {
  try {
    const key = id === 'mines' ? 'mines-leicht' : id
    const v = Number(localStorage.getItem(`znerol.highscore.${key}`)) || 0
    if (!v) return ''
    return id === 'mines' ? `Bestzeit ${10000 - v} s` : `Rekord ${v}`
  } catch {
    return ''
  }
}

export default function MiniGames(): JSX.Element {
  const [open, setOpen] = useState<string | null>(null)
  const game = GAMES.find((g) => g.id === open)
  const Comp = open ? LAZY[open] : null

  return (
    <section className="minigames">
      <div className="section-title">Minispiele</div>
      {game && Comp ? (
        <div className="glass panel game-panel">
          <div className="panel-head">
            <span>{game.name}</span>
            <button type="button" className="btn btn-sm" onClick={() => setOpen(null)}>
              Schließen
            </button>
          </div>
          <Suspense fallback={<div className="empty-state">Lade Spiel …</div>}>
            <Comp />
          </Suspense>
        </div>
      ) : (
        <div className="games-grid">
          {GAMES.map((g) => (
            <button key={g.id} type="button" className="glass game-card" onClick={() => setOpen(g.id)}>
              <span className="game-icon" style={{ background: g.color }}>
                {g.name.charAt(0)}
              </span>
              <span className="game-name">{g.name}</span>
              <span className="quick-sub">{g.desc}</span>
              <span className="game-best mono">{best(g.id)}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
