# ZnerolMonitor

System-Monitor, Prozessmanager, Autostart-Verwaltung, Autoclicker, Audio-Steuerung und ein Spiele-Hub mit Boost-Modus – als Electron-Desktop-App.

## Tabs

- **Leistung** – Live CPU/RAM/Netzwerk/Disk/GPU-Monitoring mit Sparklines und Ring-Gauges (funktioniert plattformübergreifend, `systeminformation`-basiert).
- **Prozesse** – Sortierbare Prozessliste, Prozess beenden, Priorität ändern.
- **Autostart** – Registry-`Run`-Einträge und Startup-Ordner verwalten, aktivieren/deaktivieren, hinzufügen, entfernen.
- **Autoclicker** – Mehrere Profile, konfigurierbares Intervall + Zufalls-Delay, Links/Rechts/Mitte, Einzel-/Doppelklick, feste oder aktuelle Position, globaler Hotkey.
- **Audio** – Master-Lautstärke & Stummschaltung über die Windows Core-Audio-API, Liste der Ausgabegeräte.
- **Spiele** – Erkennt installierte Steam-Spiele (alle Bibliotheken), Schnellstart, Gaming-Boost-Modus (Höchstleistungs-Energieplan + konfigurierbare Hintergrundprozesse beenden).

## Plattform-Hinweis

Prozess-/Arbeitsspeicher-/Netzwerk-Monitoring läuft auf jeder Plattform. **Autostart, Autoclicker, Audio-Steuerung und Boost-Modus benötigen Windows** – sie sprechen die Windows-Registry, den Startup-Ordner, `user32.dll` (Mauseingaben) und die Core-Audio-API über eingebettete, schlanke PowerShell-Helfer an (keine fragilen nativen Node-Addons wie `robotjs`, die bei jedem Electron-Update neu kompiliert werden müssten).

## Entwicklung

```bash
npm install
npm run dev       # Dev-Modus mit Hot-Reload
npm run build     # Produktions-Build (electron-vite)
npm run typecheck # TypeScript-Prüfung
npm run dist:win  # Windows-Installer via electron-builder
```

## Architektur

```
src/
  main/            Electron-Hauptprozess
    modules/
      perf.ts          Live-Systemmetriken (systeminformation)
      processes.ts      Prozessliste, kill, Priorität
      autostart.ts      Registry Run-Keys + Startup-Ordner
      autoclicker.ts    Persistenter PowerShell-Helper für Mausklicks
      audio.ts          Core-Audio-COM-Interop (Lautstärke/Mute)
      games.ts          Steam-Library-Scan + Boost-Modus
      platform.ts       PowerShell-Hilfsfunktionen
  preload/         contextBridge-API (window.znerol.*)
  renderer/        React-UI (Sidebar-Navigation, 6 Tabs)
```
