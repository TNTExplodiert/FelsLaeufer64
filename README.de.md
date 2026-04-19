# Felslaeufer 64

Felslaeufer 64 ist ein statisches 3D-Jump-and-Run fuer den Browser. Das Spiel laeuft komplett lokal mit HTML5, JavaScript und WebGL, also ohne Server.

## Start

1. [index.html](C:/Users/tom/Documents/code/game1/index.html) direkt im Browser oeffnen.
2. In die 3D-Ansicht klicken, damit die Maus die Kamera steuert.
3. Mit den Tasten losspielen.

Es wird kein lokaler Webserver benoetigt.

Das Projekt kann auch als ZIP von GitHub heruntergeladen, lokal entpackt und danach einfach ueber die Datei `index.html` im Browser geoeffnet werden.

## Steuerung

- `WASD`: Bewegung relativ zur Kamerarichtung
- `Leertaste`: Sprung und Doppelsprung
- `Q`: kurzer Dash
- `Maus`: Kamera drehen
- `Mausrad`: Zoom
- `R`: Respawn am Startpunkt
- `ESC`: Maus freigeben

## ASCII-Level

Das Level wird ueber ASCII-Art im Editor links beschrieben. Unterstuetzt werden drei Groessen:

- `64 x 64`
- `256 x 256`
- `1024 x 1024`

Beim Wechsel der Groesse wird automatisch eine passende Beispielwelt geladen.

### Symbole

- `S`: Startpunkt
- `L`: normaler Boden
- `P`: Plattform fuer einen normalen Sprung
- `D`: hohe Plattform fuer den Doppelsprung
- `X`: Loch mit Lava
- `Z`: Ziel

Ungueltige Zeichen werden automatisch als `X` behandelt. Wenn kein `S` vorhanden ist, setzt das Spiel selbst einen Startpunkt.

## Spielprinzip

- Die Spielfigur ist ein Stein.
- `X`-Felder und der Bereich unter Plattformen sind mit Lava gefuellt.
- Beruehrung mit Lava fuehrt zum Respawn.
- Das Ziel wird mit einer Flagge markiert.
- Beim Erreichen des Ziels stoppt die Kugel.
- Das Ziel startet im Hintergrund weiterhin den eingebauten Video-Gag.

## Technik

- Hardwarebeschleunigtes 3D mit Three.js / WebGL
- Lokale Browser-Bundle-Datei ueber `three.local.js`
- Prozedurale Texturen fuer Stein, Boden und Lava
- Kollisionssystem auf Tile-Basis
- Doppelsprung, Dash und Third-Person-Kamera
- Beispielwelten fuer alle drei Grid-Groessen

## Projektdateien

- [index.html](C:/Users/tom/Documents/code/game1/index.html): Layout, UI und Canvas
- [styles.css](C:/Users/tom/Documents/code/game1/styles.css): Darstellung und Layout
- [game.js](C:/Users/tom/Documents/code/game1/game.js): Spielmechanik, Kamera, Physik und Level-Parser
- [README.md](C:/Users/tom/Documents/code/game1/README.md): kurze englische/technische Projektbeschreibung
- [README.de.md](C:/Users/tom/Documents/code/game1/README.de.md): diese deutsche Beschreibung

## Hinweise

- Sehr grosse Grids wie `1024 x 1024` koennen im Browser deutlich schwerer sein als `64 x 64`.
- Wenn der Browser keine Pointer-Lock-Freigabe hat, zuerst einmal ins Spielfeld klicken.
- Falls du das Level manuell bearbeitest, kannst du es mit dem Button `Level laden` oder mit `Strg+Enter` neu einlesen.
