# Isometric hub rooms (2× frame, 288×192)

## Frame and projection

- `hdRoom()` in `src/renderer.js` lists the 2× rooms (cell, yard, laznia). A room joins the 2× frame by
  being added there first; `withHD(fn)` swaps the picture size, buffers and `gymState.ISO_K = 2` for the bake and the frame.
- Projection in `src/gym.js`: `isoX(i,j)`, `isoY(i,j,z)` (6 px per unit across, 3 down, ×`ISO_K`); fill a face
  with `quad(…, (x,y)=>colour)`; `isoLine`, `isoLineThin`; `psetK` for a 2×2 dot.
- Placement by clock positions on the diamond: 12 = back corner, 3 = right, 6 = front, 9 = left.
- People in 2× rooms use `figureHD` (`src/gym.js`) with an `hd` look; walls and floor are baked by `hubRebake()`
  (call it after changing anything static, and when the hour or weather changes).

## Module pattern (see `src/exercise-yard.js`)

- `wallCol(a,z,x,y,right)` and `floorCol(x,y)`: per-pixel colour of the two back walls and the floor, used through
  `quad` inside `buildX(drawFlat)`; flat items drawn in the same bake.
- `drawXItem(it)`: the room's own props (return `true` when handled).
- After the light pass in `renderHub` (`src/gym.js`, the `hubRoom==='yard'` line): `weatherLight`, `dimFB` by
  `skyBucket`, rain, the room's fog, breath, vignette. Per-frame effects go there.
- Layout and stations: `exerciseLayout()` and the room's entries in `rooms.js`; keep station positions when moving art,
  or the browser tests for the room fail.

## Render commands

```bash
node scripts/render-room.mjs --room=yard --times=600,1230 --crop=40:60:120:80 --out=r1     # hours + one close-up
node scripts/render-room.mjs --room=yard --people=none --times=600 --out=r2                 # empty room: furniture only
node scripts/render-room.mjs --room=yard --times=600 --crop=100:60:80:60 --anim=8:4 --out=r3 # 8 close-ups 4 ticks apart
```
Crops are in 2× picture pixels. `--eval='…'` sets a scene up after entering the room (`await import('/src/…')` works).

## What has worked

- Light from the sky well: wall tops lighter, the floor darker towards the walls (ambient occlusion), soot heavier high up.
- Textures from per-unit tone (bricks, setts, planks) plus large value-noise patches; avoid per-pixel hash dots.
- Same fog and motion rules as the side scenes: float positions, continuous alpha, layers drifting differently from
  walkers. The hub yard's `yardFog` in `src/exercise-yard.js` still uses 36 px grid cells moving with `t*0.08` — the
  blocky look the user rejected in the fight scene; replace it with the `fbm` approach when that room is reworked.

## Tests for iso work

`npm run test:browser -- "--only=exercise yard"` (or `--only=the Ward`, `--only=bath`) when stations, walkers or the
layout changed; the full suite once before handing the room over.
