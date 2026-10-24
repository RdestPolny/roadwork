# Side-on fight backdrops (144×96)

## Frame layout and what covers it

- Fighters stand on `appearanceState.FLOOR_Y` = 86, about 45 px tall (heads ≈ y 40), centred near x 72.
- In-canvas HUD: names, HP and stamina bars and the clock fill y 0–18 across the width.
- HTML card overlay (in the real game, not in render-room sheets): the opponent panel covers about x 25–119, y 16–22,
  his three beat cards x 59–84, y 24–35; the player's bar starts at y ≈ 69 and his cards and hand cover y 80–96.
- So detail that must be seen lives in **y 20–68**; the floor is mostly hidden; the top of the wall only peeks out.

## Draw order per frame (`renderSpar` in `src/sparring.js`)

1. `rendererState.fb.set(state.bgRing)`: the baked static backdrop (`buildRing(venue)` → `yardFightBg` /
   `wardFightBg` / `bathBg`), baked once per fight. Put everything that does not move here, at any cost per pixel.
2. `…FightBack(hot, …)`: per-frame things behind the fighters (people, rag, fog, light pass, breath).
3. Fighter shadows, particles, the two fighters.
4. `…FightFront(t0)`: over the fighters (lamp flame, flying rag, captions). Keep it light; the fighters must stay crisp.

Per-frame budget: the yard backdrop with fog over all 13 824 pixels, five walkers and breath costs about 1.3 ms per
frame including the sim step (`scripts/perf.mjs`). A full-frame per-pixel pass with 4 noise samples is affordable.

## Building blocks already in `src/newgate-fight.js` (reuse, don't rewrite)

| Function | Use |
| --- | --- |
| `vnoise(u,v)`, `fbm(u,v)` | smooth value noise from the 32×32 grid `state.noise` (filled in `initialize`); 0..1 |
| `shade(c,k)`, `mix(c,t,k)` | darken/lighten; blend towards a colour |
| `softSpot(cx,cy,rx,ry,k,col?,soft?)` | soft contact shadow (no `col`), or a veil/puff of `col`; `soft=1` spreads further |
| `blitLayer(L,x0,x1,y0,y1)` | copy a figure layer onto `FB_MAIN` in a box, clear it, turn the black outline into `C.figOut` |
| `knee(hx,hy,ax,ay,thigh,shin)` | two-bone IK, knee bending forwards (to the left) |
| `convictPose` / `drawConvict` | the trudging gait; pose shared by the drawing and by the breath (mouth position at any past tick) |
| `breath(t,id,period,mouth)` | random, sparse breath: a few puffs per exhale, most turns skipped via `h2(id*7+3,slot)` |
| `drawWarder` | standing figure with idle weight shift and breathing |
| `yardFog` | two-layer drifting smog + vignette |

## Recipes

**Static wall bake.** Per-pixel function per band (`yardSky`, `yardCoping`, `yardBrick`, `yardPlinth`, `yardGround`),
then overlay passes for windows, pipes and spikes. Brick: course height 3 (1 mortar + 2 brick, top row ×1.06, bottom
×0.93), per-brick tone from `h2(brickX, course)`; then soot `mix` driven by height + `vnoise` mottling + per-column
streaks `vnoise(x*0.31, c)` fading down from the coping; damp tide mark from `vnoise(x*0.11, c)`; piers with a light
left column, a dark right column and a cast shadow.

**Background people.** Draw into `state.walkL` (one `Uint32Array(W*H)`), with both `taper` passes over all parts,
far limbs on the `…F` ramps, then `blitLayer`. Sort by feet y. Soft contact shadow with `softSpot` before the blit.
Pass float coordinates everywhere; scale radii by the figure's size factor `k`.

Gait (one cycle = two steps; forward = −x): duty `D ≈ 0.68` for a trudge (0.6 for a normal walk).
- stance `q < D`: `footX = X − (D/2 − q)·S` (planted: it doesn't move in the world);
- swing: `s = (q−D)/(1−D)`, `e = smoothstep(s)`, `footX = X + (D/2 − D·e)·S`, `lift = sin(πs)·0.9k`;
- body: `hipY −= 0.75k·cos(4π(p − D/2))`; shoulders the same with lag 0.06, head nod with lag 0.12; lean grows in
  double support. Speed of the line `v` is shared (keeps spacing); stride `S` follows height, so cadences differ.
- Trudging convicts: `v ≈ 0.11 px/tick`, `S ≈ 12.5k`, `k ≈ 1.2–1.3` (≈ 41 px tall).

**Fog.** `a = high(y)·(0.3 + 1.4·n1²) + ground(y)·max(0, 1.8·n2 − 0.7) + 0.04`, capped at 0.6.
`n1 = fbm(x·0.032 − t·0.0008, y·0.06 + sin(t·0.0013)·0.35)` drifts right and swells;
`n2 = fbm(x·0.055 + t·0.0024, y·0.14 + t·0.0005)` creeps left near the feet. Blend per pixel, then vignette.
Heavy fog flattens the wall: keep `high` at most ~0.17 at y 40.

**Breath.** Draw after the fog. Start ahead of the face (`hx − 2.4k`), not on a light hood. Blow out with
`1 − exp(−a/18)` (≈ 7 px), rise slowly, radius `1.5 + a·0.05`, alpha `0.62·min(1,a/5)·(1−a/95)^1.4`, `soft=1`.
Each person: own period (230 + 53·id ticks), offset `id·61`, breathes in ~37% of slots → nobody most of the time,
rarely three at once.

## Render-room timing

`--fight=n:gap` starts the fight and steps 60 ticks; the first frame is at `boxingState.tick` = 120, then
`120 + k·gap`. Compute when a timed event happens from that, instead of rendering many sheets.
