import NavIcon from './ui/NavIcon'
import { useMedia } from '../lib/useMedia'
import * as calmMusic from '../lib/calmMusic'

function fmt(sec: number): string {
  return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
}

/** Choose a calm music piece; it starts playing (in the main window) right away. */
export default function MusicPicker({ onClose }: { onClose: () => void }): JSX.Element {
  const media = useMedia()
  const music = calmMusic.useCalmMusic()
  const currentId = calmMusic.isOwner() ? music.current?.id : undefined
  return (
    <div className="modal-backdrop" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <div className="glass modal video-picker" role="dialog" aria-label="Ruhemusik auswählen" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span>Ruhemusik auswählen</span>
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={() => calmMusic.command('toggle')}>
              {calmMusic.isOwner() && music.playing ? '❚❚ Pause' : '▶ Abspielen'}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => calmMusic.command('next')}>
              ›› Nächstes
            </button>
            <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
              <NavIcon name="close" size={16} />
            </button>
          </div>
        </div>
        {!media.loaded && <div className="empty-state">Lade Liste …</div>}
        {media.loaded && media.music.length === 0 && <div className="empty-state">Keine Musik geladen – ist das Internet an?</div>}
        <ol className="calm-list picker">
          {media.music.map((t) => (
            <li key={t.id}>
              <button type="button" className={t.id === currentId ? 'active' : ''} onClick={() => calmMusic.command('track', t.id)}>
                <span className="calm-name">{t.title}</span>
                <span className="dim">{t.artist}</span>
                <span className="mono dim">{t.duration ? fmt(t.duration) : ''}</span>
                <span className="dim">{t.license}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
