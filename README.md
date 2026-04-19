# Felslaeufer 64

Statisches 3D-Jump-and-Run fuer den Browser mit HTML5 und JavaScript.

## Start

1. `index.html` direkt im Browser oeffnen.
2. Ins Spielfeld klicken, damit die Maus die Kamera ueber Pointer Lock steuert.
3. Mit `WASD` laufen, mit `Leertaste` springen und doppelt springen, mit dem Mausrad zoomen.

Es wird kein lokaler Server benoetigt. Das Projekt ist darauf ausgelegt, direkt als Datei gestartet zu werden.

## Level-Format

Das Level wird komplett ueber ein 64 x 64 ASCII-Gitter im Textfeld beschrieben.

- `S` Startpunkt
- `L` normaler Boden
- `P` Plattform in einfacher Sprunghoehe
- `X` Loch

Ungueltige Zeichen werden beim Laden automatisch als `X` behandelt. Wenn kein `S` existiert, wird ein Startpunkt automatisch eingesetzt.

## Technik

- WebGL-Rendering mit Three.js
- Hardwarebeschleunigte 3D-Darstellung
- Doppelsprung mit einfacher Plattform-Physik
- Third-Person-Kamera mit Maussteuerung und Zoom
- Instanced Meshes fuer die Tile-Welt
- Prozedurale Fels- und Bodenoberflaechen, damit das Spiel ohne weitere Downloads lauffaehig bleibt

## Asset-Quellen, die ich geprueft habe

Um den Offline-Start stabil zu halten, nutzt das Spiel aktuell prozedural erzeugte Texturen. Fuer spaetere Upgrades sind diese frei nutzbaren Quellen interessant:

- Three.js offizielle Doku und Releases: https://threejs.org/ und https://github.com/mrdoob/three.js/
- ambientCG, z. B. Rocks/Stone PBR-Texturen unter CC0: https://ambientcg.com/
- Poly Haven, CC0-Texturen und Modelle: https://polyhaven.com/

## Dateien

- `index.html` Layout und UI
- `styles.css` Oberflaeche
- `game.js` Spiel, Kamera, Physik und ASCII-Level-Parser
- `three.local.js` lokale Browser-Bundle-Datei fuer Three.js
