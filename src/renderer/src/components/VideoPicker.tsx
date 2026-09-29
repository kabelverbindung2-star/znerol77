import { useState } from "react";
import NavIcon from "./ui/NavIcon";
import Switch from "./ui/Switch";
import { useMedia } from "../lib/useMedia";
import { useSettings } from "../lib/useSettings";

/** Paste a YouTube link; saved videos can be played as background or in rest mode. */
function YouTubeSection({
  context,
  onDone,
}: {
  context: "background" | "rest";
  onDone: () => void;
}): JSX.Element {
  const { settings, update } = useSettings();
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const yt = settings.youtube;
  const play = (id: string): void => {
    if (context === "rest")
      update({
        youtube: { current: id },
        rest: { youtube: true, black: false },
      });
    else
      update({
        youtube: { current: id },
        appearance: { style: "glass", background: "youtube" },
      });
    onDone();
  };
  const add = async (): Promise<void> => {
    if (!link.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const info = await window.znerol.youtube.info(link);
      const items = [info, ...yt.items.filter((x) => x.id !== info.id)].slice(
        0,
        40,
      );
      await update({ youtube: { items } });
      setLink("");
      play(info.id);
    } catch (e) {
      setError(
        (e as Error).message.replace(
          /^Error invoking remote method '[^']+': (Error: )?/,
          "",
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="yt-section">
      <div className="yt-add">
        <input
          className="text-input"
          placeholder="YouTube-Link einfügen (z. B. ein 4K-Naturfilm oder Musikvideo)"
          value={link}
          aria-label="YouTube-Link"
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !link.trim()}
          onClick={add}
        >
          {busy ? "Prüfe …" : "Abspielen"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => window.znerol.youtube.openSite()}
          title="Auf YouTube ein Video suchen und den Link kopieren"
        >
          YouTube öffnen
        </button>
      </div>
      {error && <div className="quick-sub warn">{error}</div>}
      <div className="yt-sound">
        <span>Ton von Videos</span>
        <span className="quick-sub">
          nur im Hauptfenster, damit er nicht doppelt läuft
        </span>
        <Switch
          on={settings.rest.sound}
          onToggle={(v) => update({ rest: { sound: v } })}
        />
      </div>
      {yt.items.length > 0 && (
        <div className="video-grid">
          {yt.items.map((v) => (
            <div
              key={v.id}
              className={`video-card ${yt.current === v.id ? "active" : ""}`}
            >
              <button
                type="button"
                className="video-card-main"
                onClick={() => play(v.id)}
                title={v.title}
              >
                <span className="video-thumb">
                  <img
                    src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                  />
                </span>
                <b>{v.title}</b>
              </button>
              <button
                type="button"
                className="link-btn"
                onClick={() =>
                  update({
                    youtube: {
                      items: yt.items.filter((x) => x.id !== v.id),
                      current: yt.current === v.id ? null : yt.current,
                    },
                  })
                }
              >
                entfernen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function mins(sec: number): string {
  return sec >= 60 ? `${Math.round(sec / 60)} min` : `${sec} s`;
}

/** Choose one nature video (or let them change). Used by the menus and the rest mode settings. */
export default function VideoPicker({
  selected,
  onSelect,
  onClose,
  context = "background",
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
  context?: "background" | "rest";
}): JSX.Element {
  const media = useMedia();
  const [tab, setTab] = useState<"nature" | "youtube">(
    selected?.startsWith("yt:") ? "youtube" : "nature",
  );
  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div
        className="glass modal video-picker"
        role="dialog"
        aria-label="Video auswählen"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <span>Video auswählen</span>
          <button
            type="button"
            className="icon-btn"
            aria-label="Schließen"
            onClick={onClose}
          >
            <NavIcon name="close" size={16} />
          </button>
        </div>
        <div className="seg video-tabs">
          <button
            type="button"
            className={tab === "nature" ? "on" : ""}
            onClick={() => setTab("nature")}
          >
            Naturfilme
          </button>
          <button
            type="button"
            className={tab === "youtube" ? "on" : ""}
            onClick={() => setTab("youtube")}
          >
            YouTube
          </button>
        </div>
        {tab === "youtube" && (
          <YouTubeSection context={context} onDone={onClose} />
        )}
        {tab === "nature" && !media.loaded && (
          <div className="empty-state">Lade Liste …</div>
        )}
        {tab === "nature" && media.loaded && media.videos.length === 0 && (
          <div className="empty-state">
            Keine Videos geladen – ist das Internet an?
          </div>
        )}
        {tab === "nature" && (
          <div className="video-grid">
            <button
              type="button"
              className={`video-card shuffle ${selected === null ? "active" : ""}`}
              onClick={() => onSelect(null)}
            >
              <span className="video-thumb">
                <NavIcon name="shuffle" size={28} />
              </span>
              <b>Wechselnd</b>
              <span className="quick-sub">alle paar Minuten ein anderes</span>
            </button>
            {media.videos.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`video-card ${selected === v.id ? "active" : ""}`}
                onClick={() => onSelect(v.id)}
                title={`${v.title} · ${v.artist} · ${v.license}`}
              >
                <span className="video-thumb">
                  {v.thumb ? (
                    <img src={v.thumb} alt="" loading="lazy" />
                  ) : (
                    <NavIcon name="bild" size={24} />
                  )}
                </span>
                <b>{v.title}</b>
                <span className="quick-sub">
                  {mins(v.duration)} · {v.license || "frei"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
