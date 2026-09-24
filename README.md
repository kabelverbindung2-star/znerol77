# ZnerolMonitor

Systemmonitor und Gaming-Werkzeugkasten für Windows, mit Glas-Oberfläche über wechselnden Naturfotos und einem Overlay, das über dem Spiel liegt.

## Was drin ist

**Seitenleiste**: Übersicht, Prozesse, Autostart, Klicker, Audio, Spiele, Zeichnen, Werkzeuge, Einstellungen.

- **Übersicht** – Kachel-Dashboard. Lange auf eine Kachel drücken (oder „Bearbeiten“) → verschieben, Größe ändern, entfernen, über **+** hinzufügen: Uhr & Wetter, CPU, GPU, RAM, Temperatur, CPU-Kerne, Netzwerk, Laufwerke, größte Verbraucher, Schnellzugriff, Musik, Lautstärke, System, Stoppuhr, Timer, Taschenrechner.
- **Prozesse** – sortier- und filterbare Liste, beenden, Priorität ändern.
- **Autostart** – Registry (nur du / alle Benutzer / 32-Bit), Autostart-Ordner (nur du / alle), Aufgabenplanung. An/Aus wie im Task-Manager (`StartupApproved`), Einträge für alle Benutzer fragen einmal nach Adminrechten.
- **Klicker** – 1 bis 500 Klicks pro Sekunde (eigener Thread im Windows-Helfer, 1-ms-Timer, `SendInput`), Profile, Starttaste (Standard `F8`), **Esc stoppt immer**.
- **Audio** – läuft gerade (Titel, Cover, Pause, Vor/Zurück; Spotify zuerst), welche App gerade Ton macht (Pegel, Lautstärke, stumm pro App), Ausgabegerät wählen. `F6` wechselt das Ausgabegerät (änderbar).
- **Spiele** – Steam-Bibliothek, Boost-Modus und **Minispiele**: Snake, 2048, Blöcke, Minensucher, Mauerbrecher, Flatterflug (Rekorde werden gespeichert).
- **Zeichnen** – Stift (druckempfindlich), Marker, Radierer, Text, Farben, Größen, Papier (weiß/kariert/Punkte/dunkel), Rückgängig, als PNG speichern. Mehrere Zeichnungen, automatisch gespeichert.
- **Werkzeuge** – Stoppuhr mit Runden, Timer mit Ton, Taschenrechner (auch per Tastatur). Laufen im Hintergrund weiter.
- **Einstellungen** – Stil **Glas** oder **Basic** (hell/dunkel), Akzentfarbe, Hintergrund (wechselnde Bilder / festes Bild / kein Bild / durchsichtig = Windows-11-Acrylic), Glas-Effekt, Tasten, Overlay, Autostart der App, Messintervall, Wetter-Ort, Updates.

**Hintergründe**
- Bis zu 50 freie Landschaftsfotos von Wikimedia Commons, in der Auflösung deines Bildschirms (bis 4K) heruntergeladen und lokal gespeichert. Das **?** unten links zeigt Titel, Fotograf, Lizenz und den Link zur Bildseite.
- 18 gezeichnete Szenen (Bergsee, Strand, Berge, Stadt – jeweils Tag, Abend, Nacht – und mehr) als Ersatz ohne Internet.
- Eigene Bilder, Wechsel-Intervall, Abdunkeln.

**Spiel-Overlay** (eigenes, durchsichtiges Fenster)
- Links CPU/GPU/RAM/Temperatur, rechts Boost- und Klicker-Status, unten rechts Netzwerk.
- `Alt+Q` öffnet das Radialmenü, `Alt+H` blendet aus. Standardmäßig aus.
- Funktioniert bei Spielen im Fenster- oder randlosen Vollbildmodus.

## Starten

```bash
npm install
npm run dev        # Entwicklung mit Hot-Reload
npm run dist:win   # Windows-Installer nach release/
```

## Grenzen

- Autostart, Klicker, Audio und Boost benötigen Windows (PowerShell-Helfer, keine nativen Node-Addons).
- CPU-Temperatur liefert Windows oft nur mit Administratorrechten; ohne steht dort „–“.
- Eine FPS-Anzeige ist nicht eingebaut (bräuchte Grafik-Hooks ins Spiel).
- Die Fn-Taste kann keine App abfangen – sie wird von der Tastatur selbst ausgewertet.

## Leistung

- Alle Windows-Abfragen laufen über **eine** dauerhafte PowerShell-Sitzung (systeminformation) bzw. einen dauerhaften Helfer (`src/main/modules/helper-script.ts`: C# für Core Audio, Mausklicks, Mediensteuerung) statt ständig neue Prozesse zu starten.
- Gemessen wird nur, solange ein Fenster sichtbar und nicht minimiert ist.
- Das Overlay-Fenster wird erst erzeugt, wenn es gebraucht wird; der Glas-Effekt ist abschaltbar.
- Der Release-Build testet Helfer, 500er-Klicker und Autostart-Skript auf einem echten Windows-Rechner (`scripts/test-helper.mjs`), bevor ein Update veröffentlicht wird.
- Der Windows-Helfer wird nur einmal kompiliert und als DLL zwischengespeichert.

## Aufbau

```
src/main/modules/   perf, processes, autostart, autoclicker, audio, games,
                    settings, wallpapers (Download + zwall://-Protokoll), overlay
src/preload/        window.znerol.* Bridge
src/renderer/       index.html (App-Fenster), overlay.html (Spiel-Overlay)
```
