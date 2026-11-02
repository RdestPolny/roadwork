# Thames port (432×288, drawn in code)

Modules: `src/thames-port.js` (quay, water, barges, crane, camera, frame), `src/port-extension.js` and
`src/port-details.js` (the Wapping extension: pub front, trade buildings, pier, yard), `src/port-life.js` (pure
routines of the background people), `src/port-scenes.js` (their drawing), `src/port-district.js` (geography,
`ANCHORS`, `PORT_PROPS`), `src/port-story.js` (prologue). The pub interior is its own scene (`src/pub*.js`).

## Look first

- `node scripts/shot.mjs --scene=port --at=i:j --out=p0` renders the camera spot that follows a player at `i,j`
  (e.g. busker ≈ 40,6.7; police van ≈ 11,5; timber yard ≈ 47,8; pier ≈ 47,21). Crop and enlarge with
  `frames.py zoom` or PIL `NEAREST`.
- Asked to remove "that thing next to X": identify it on the render first (e.g. the net from `yardCraftProps`),
  then cut code.
- Prop map: F8 under `?debug=1`, or `--eval="(await import('/src/thames-port.js')).setPropMap(true)"` — footprints,
  ids, depth keys and the real collision (red dots).

## Fixed props

Every fixed prop has one entry in `PORT_PROPS` (`src/port-district.js`): footprint `box` [i0,j0,i1,j1] or
`circle` [i,j,r]; collision comes from it (`pad` widens it, `block:false` walks through); depth key `key`
(default: footprint centre). Its art is registered under the same `id` in `propDraws({...})` in `thames-port.js`
or `port-extension.js`; an id without a footprint throws. A new prop = an entry + a draw function. Never add a
separate collision rectangle or a hand-placed `[key, draw]` pair for a fixed prop.

## Drawing in the iso projection

- One `z` unit is about 1 px; screen-horizontal is `(di, −dj)`.
- A shape built from a single `thin()` line reads as "open"; build solid shapes from several dense rows.
- Very dark colours vanish on the brick walls.
- `horse()` in `src/carriage.js` draws the horses both in the port and at the cab: proportions change in both.
- The renderer has no alpha: fade by mixing with the background (`mix`).

## Background bake and textures

- `background()` (and everything it calls: `portDecks`, `portDistrictStatic`, …) is baked into 144 px chunks; on a
  fresh cache every chunk a following camera can reach is baked at once (one long frame on entering the port).
- Inside baked code compute texture noise from **world** pixels (`x-camera.x`, `y-camera.y`), never raw `x,y`: a
  screen-space pattern restarts in every chunk and leaves seams.
- Anything that moves or animates belongs in the per-frame props list, not in `background()`.

## Frame budget

`node scripts/profile-port.mjs` (budget 16.7 ms; Nov 2026: ≈ 8 ms idle, ≈ 9 ms walking). In per-pixel callbacks:
no arrays per pixel (inline `ground()` instead of `const [i,j]=ground(…)`), hoist per-frame terms, skip terms whose
weight is 0. Keep refactors of drawing code pixel-identical (`npm run test:visual`) and make intended look
changes a separate step.
