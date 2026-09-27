import NavIcon from './ui/NavIcon'
import MusicPanel from './MusicPanel'

/** Radio, calm music and Spotify control in a window above everything (menus, rest mode, second screen). */
export default function MusicPicker({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div className="modal-backdrop" onClick={onClose} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()}>
      <div className="glass modal video-picker music-modal" role="dialog" aria-label="Musik" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <span>Musik</span>
          <button type="button" className="icon-btn" aria-label="Schließen" onClick={onClose}>
            <NavIcon name="close" size={16} />
          </button>
        </div>
        <MusicPanel />
      </div>
    </div>
  )
}
