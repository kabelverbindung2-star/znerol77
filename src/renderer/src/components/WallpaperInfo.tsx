import NavIcon from './ui/NavIcon'
import type { Wallpaper } from '../lib/types'

/** Small "?" in the corner; hovering shows where the photo is from, with links. */
export default function WallpaperInfo({ wallpaper }: { wallpaper: Wallpaper }): JSX.Element | null {
  const info = wallpaper.info
  if (wallpaper.source === 'builtin') return null
  const open = (url: string) => (e: React.MouseEvent): void => {
    e.preventDefault()
    window.znerol.system.openExternal(url)
  }
  return (
    <div className="wp-info">
      <button type="button" className="wp-info-btn" aria-label="Infos zum Hintergrundbild">
        <NavIcon name="info" size={16} />
      </button>
      <div className="wp-info-pop" role="tooltip">
        {info ? (
          <>
            <div className="wp-info-title">{info.title || wallpaper.name}</div>
            <dl>
              <dt>Foto</dt>
              <dd>{info.artist}</dd>
              {info.date && (
                <>
                  <dt>Aufgenommen</dt>
                  <dd>{info.date}</dd>
                </>
              )}
              <dt>Lizenz</dt>
              <dd>
                {info.licenseUrl ? (
                  <a href={info.licenseUrl} onClick={open(info.licenseUrl)}>
                    {info.license || 'Lizenz ansehen'}
                  </a>
                ) : (
                  info.license || 'siehe Bildseite'
                )}
              </dd>
              <dt>Quelle</dt>
              <dd>Wikimedia Commons</dd>
            </dl>
            <a className="wp-info-link" href={info.descriptionUrl} onClick={open(info.descriptionUrl)}>
              Bild auf Wikimedia Commons öffnen ↗
            </a>
          </>
        ) : (
          <div className="wp-info-title">Eigenes Bild · {wallpaper.name}</div>
        )}
      </div>
    </div>
  )
}
