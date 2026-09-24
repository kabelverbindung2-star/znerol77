# ZnerolMonitor

Systemmonitor und Gaming-Werkzeugkasten für Windows, mit Glas-Oberfläche über wechselnden Naturfotos und einem Overlay, das über dem Spiel liegt.

## Was drin ist

**App-Fenster**
- **Übersicht**: Uhrzeit, Wetter-Symbol (drüberfahren zeigt Temperatur; Ort einmal einstellen, Daten von Open-Meteo), CPU/GPU/RAM/Temperatur mit Verlauf, größte Verbraucher, Netzwerk, Laufwerke, Schnellzugriff (Overlay, Boost, Autoclicker, mit Windows starten).
- **Prozesse**: sortier- und filterbare Liste, beenden, Priorität ändern.
- **Autostart**: Registry-`Run`-Einträge und Startup-Ordner verwalten.
- **Klicker** (Starttaste standardmäßig `F8`): Profile, Intervall + Zufalls-Delay, Maustaste, Einzel/Doppel, feste oder aktuelle Position, globaler Hotkey.
- **Audio**: läuft gerade (Spotify & andere Player: Titel, Cover, Pause, Vor/Zurück), welche App gerade Ton macht (Pegel, Lautstärke, stumm pro App), Gesamtlautstärke, Ausgabegerät wählen. `F6` wechselt das Ausgabegerät (Taste änderbar) und zeigt kurz an, welches jetzt aktiv ist.
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
- Eine FPS-Anzeige ist nicht eingebaut (bräuchte Grafik-Hooks ins Spiel).
- Die Fn-Taste kann keine App abfangen – sie wird von der Tastatur selbst ausgewertet.

## Leistung

- Alle Windows-Abfragen laufen über **eine** dauerhafte PowerShell-Sitzung (systeminformation) bzw. einen dauerhaften Helfer (`src/main/modules/helper-script.ts`: C# für Core Audio, Mausklicks, Mediensteuerung) statt ständig neue Prozesse zu starten.
- Gemessen wird nur, solange ein Fenster sichtbar und nicht minimiert ist.
- Das Overlay-Fenster wird erst erzeugt, wenn es gebraucht wird; der Glas-Effekt ist abschaltbar.
- Der Release-Build startet den Helfer auf einem echten Windows-Rechner (`scripts/test-helper.mjs`), bevor ein Update veröffentlicht wird.

## Aufbau

```
src/main/modules/   perf, processes, autostart, autoclicker, audio, games,
                    settings, wallpapers (Download + zwall://-Protokoll), overlay
src/preload/        window.znerol.* Bridge
src/renderer/       index.html (App-Fenster), overlay.html (Spiel-Overlay)
```
