# ZnerolMonitor

Systemmonitor und Gaming-Werkzeugkasten für Windows, mit Glas-Oberfläche über wechselnden Naturfotos und einem Overlay, das über dem Spiel liegt.

## Was drin ist

**App-Fenster**
- **Übersicht**: Uhrzeit, CPU/GPU/RAM/Temperatur mit Verlauf, größte Verbraucher, Netzwerk, Laufwerke, Schnellzugriff (Overlay, Boost, Autoclicker, mit Windows starten).
- **Prozesse**: sortier- und filterbare Liste, beenden, Priorität ändern.
- **Autostart**: Registry-`Run`-Einträge und Startup-Ordner verwalten.
- **Klicker**: Profile, Intervall + Zufalls-Delay, Maustaste, Einzel/Doppel, feste oder aktuelle Position, globaler Hotkey.
- **Audio**: Master-Lautstärke, Stummschaltung, Geräteliste.
- **Spiele**: installierte Steam-Spiele, Schnellstart, Boost-Modus.

**Hintergründe** (Bild-Knopf oben rechts)
- Beim ersten Start lädt die App bis zu 50 freie Landschaftsfotos von Wikimedia Commons (Kategorie „Featured pictures of landscapes“) und speichert sie lokal. Name und Fotograf stehen unten links.
- Automatischer Wechsel (5 Min. bis täglich, zufällig oder nacheinander), manuelle Auswahl, eigene Bilder hinzufügen, Unschärfe und Abdunkeln einstellbar.
- Ohne Internet gibt es 9 gezeichnete Szenen als Ersatz.

**Spiel-Overlay** (eigenes, durchsichtiges Fenster)
- Links CPU/GPU/RAM/Temperatur, rechts Boost- und Klicker-Status, unten rechts Netzwerk.
- `Alt+Q` öffnet das Radialmenü (springt in den gewählten Bereich der App), `Esc` schließt, `Alt+H` blendet das Overlay aus.
- Klicks gehen durch das Overlay ans Spiel, solange das Menü zu ist.
- Funktioniert bei Spielen im Fenster- oder randlosen Vollbildmodus. Über exklusivem Vollbild kann Windows kein normales Fenster anzeigen.

## Starten

```bash
npm install
npm run dev        # Entwicklung mit Hot-Reload
npm run dist:win   # Windows-Installer nach release/
```

## Grenzen

- Autostart, Klicker, Audio und Boost benötigen Windows (PowerShell-Helfer, keine nativen Node-Addons).
- CPU-Temperatur liefert Windows oft nur mit Administratorrechten; ohne steht dort „–“.
- FPS-Anzeige und Lautstärke pro App sind nicht eingebaut – beides bräuchte tiefe Eingriffe (Grafik-Hooks bzw. native Audio-Sitzungs-API).

## Aufbau

```
src/main/modules/   perf, processes, autostart, autoclicker, audio, games,
                    settings, wallpapers (Download + zwall://-Protokoll), overlay
src/preload/        window.znerol.* Bridge
src/renderer/       index.html (App-Fenster), overlay.html (Spiel-Overlay)
```
