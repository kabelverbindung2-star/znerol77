import * as player from '../lib/calmMusic'

function fmt(sec: number): string {
  const m = Math.floor(sec / 60)
  return `${m}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

/** Calm music from Wikimedia Commons. `full` adds the whole track list (Audio tab). */
export default function CalmMusic({ full = false }: { full?: boolean }): JSX.Element {
  const m = player.useCalmMusic()
  const t = m.current
  return (
    <div className={`calm-music ${full ? 'full' : ''}`}>
      <div className="calm-head">
        <div>
          <div className="np-app">{m.playing ? 'Ruhemusik läuft' : 'Ruhemusik'}</div>
          <div className="np-title">{t ? t.title : m.list.length ? '' : 'Lade Liste …'}</div>
          {t && (
            <div className="np-artist">
              {t.artist}
              {t.license ? ` · ${t.license}` : ''}
            </div>
          )}
          {m.error && <div className="quick-sub">{m.error}</div>}
        </div>
      </div>
      <div className="np-controls">
        <button type="button" className="round-btn" aria-label="Zurück" onClick={() => player.prev()}>
          ‹‹
        </button>
        <button type="button" className="round-btn big" aria-label={m.playing ? 'Pause' : 'Abspielen'} onClick={() => player.toggle()}>
          {m.playing ? '❚❚' : '▶'}
        </button>
        <button type="button" className="round-btn" aria-label="Nächstes Stück" onClick={() => player.next()}>
          ››
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(m.volume * 100)}
          aria-label="Lautstärke der Ruhemusik"
          onChange={(e) => player.setVolume(Number(e.target.value) / 100)}
        />
      </div>
      {full && m.list.length > 0 && (
        <ol className="calm-list">
          {m.list.map((track, i) => (
            <li key={track.id}>
              <button type="button" className={i === m.index ? 'active' : ''} onClick={() => player.playTrack(i)}>
                <span className="calm-name">{track.title}</span>
                <span className="dim">{track.artist}</span>
                <span className="mono dim">{track.duration ? fmt(track.duration) : ''}</span>
                <a
                  className="link-btn"
                  href={track.descriptionUrl}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    window.znerol.system.openExternal(track.descriptionUrl)
                  }}
                  title={`Quelle und Lizenz: ${track.license || 'siehe Seite'}`}
                >
                  ?
                </a>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
