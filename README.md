# Felslaeufer 64

Felslaeufer 64 is a static 3D platformer for the browser. The game runs fully locally with HTML5, JavaScript, and WebGL, so no server is required.

## Start

1. Open [index.html](C:/Users/tom/Documents/code/game1/index.html) directly in your browser.
2. Click into the 3D view so the mouse controls the camera.
3. Start playing.

No local web server is required.

You can also download the project as a ZIP from GitHub, extract it locally, and then open `index.html` directly in your browser.

## Controls

- `WASD`: move relative to the camera direction
- `Space`: jump and double jump
- `Q`: short dash
- `Mouse`: rotate camera
- `Mouse wheel`: zoom
- `R`: respawn at the start point
- `ESC`: release mouse control

## ASCII Level Format

The level is described as ASCII art in the editor on the left. Three sizes are supported:

- `64 x 64`
- `256 x 256`
- `1024 x 1024`

When you change the size, a matching example world is loaded automatically.

### Symbols

- `S`: start point
- `L`: normal ground
- `P`: platform reachable with a normal jump
- `D`: higher platform intended for a double jump
- `X`: hole filled with lava
- `Z`: goal

Invalid characters are automatically treated as `X`. If no `S` is present, the game places a start point automatically.

## Gameplay

- The player character is a stone.
- `X` tiles and the area below platforms are filled with lava.
- Touching lava causes a respawn.
- The goal is marked with a flag.
- When the goal is reached, the ball stops moving.
- The goal still triggers the built-in video gag in the background.

## Technology

- Hardware-accelerated 3D using Three.js / WebGL
- Local browser bundle via `three.local.js`
- Procedural textures for stone, ground, and lava
- Tile-based collision system
- Double jump, dash, and third-person camera
- Example worlds for all three grid sizes

## Project Files

- [index.html](C:/Users/tom/Documents/code/game1/index.html): layout, UI, and canvas
- [styles.css](C:/Users/tom/Documents/code/game1/styles.css): styling and layout
- [game.js](C:/Users/tom/Documents/code/game1/game.js): gameplay, camera, physics, and level parser
- [README.md](C:/Users/tom/Documents/code/game1/README.md): this English description
- [README.de.md](C:/Users/tom/Documents/code/game1/README.de.md): German description

## Notes

- Very large grids like `1024 x 1024` can be much heavier in the browser than `64 x 64`.
- If pointer lock is not active, click once into the game view first.
- If you edit the level manually, you can reload it with the `Level laden` button or with `Ctrl+Enter`.
