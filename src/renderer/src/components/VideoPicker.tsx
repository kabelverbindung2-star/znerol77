import NavIcon from './ui/NavIcon'
import { useMedia } from '../lib/useMedia'

function mins(sec: number): string {
  return sec >= 60 ? `${Math.round(sec / 60)} min` : `${sec} s`
}

/** Choose one nature video (or let them change). Used by the menus and the rest mode settings. */
export default function VideoPicker({
  selected,
  onSelect,
  onClose
}: {
  selected: string | null
  onSelect: (id: string | null) => void
  onClose: () => void
}): JSX.Element {
  const media = useMedia()
  return (
    <div className="modal-backdrop" onClick={onClose} onMouseDown={(e) => e.stopPropagation()} onMouseUp={(e) => e.stopPropagation()}>
      <div className="glass modal video-picker" role="dialog" aria-label="Naturvideo auswählen" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span>Naturvideo auswählen</span>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            <NavIcon name="close" size={16} />
          </button>
        </div>
        {!media.loaded && <div className="empty-state">Lade Liste …</div>}
        {media.loaded && media.videos.length === 0 && <div className="empty-state">Keine Videos geladen – ist das Internet an?</div>}
        <div className="video-grid">
          <button type="button" className={`video-card shuffle ${selected === null ? 'active' : ''}`} onClick={() => onSelect(null)}>
            <span className="video-thumb">
              <NavIcon name="shuffle" size={28} />
            </span>
            <b>Wechselnd</b>
            <span className="quick-sub">alle paar Minuten ein anderes</span>
          </button>
          {media.videos.map((v) => (
            <button key={v.id} type="button" className={`video-card ${selected === v.id ? 'active' : ''}`} onClick={() => onSelect(v.id)} title={`${v.title} · ${v.artist} · ${v.license}`}>
              <span className="video-thumb">{v.thumb ? <img src={v.thumb} alt="" loading="lazy" /> : <NavIcon name="bild" size={24} />}</span>
              <b>{v.title}</b>
              <span className="quick-sub">
                {mins(v.duration)} · {v.license || 'frei'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
