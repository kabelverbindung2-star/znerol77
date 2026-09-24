import NavIcon from './ui/NavIcon'

/** Minimise / maximise / close for the see-through window (it has no Windows frame). */
export default function WindowControls(): JSX.Element {
  return (
    <div className="win-controls">
      <button type="button" aria-label="Minimieren" onClick={() => window.znerol.win.minimize()}>
        <NavIcon name="min" size={14} />
      </button>
      <button type="button" aria-label="Maximieren" onClick={() => window.znerol.win.toggleMaximize()}>
        <NavIcon name="max" size={12} />
      </button>
      <button type="button" className="close" aria-label="Schließen" onClick={() => window.znerol.win.close()}>
        <NavIcon name="close" size={14} />
      </button>
    </div>
  )
}
