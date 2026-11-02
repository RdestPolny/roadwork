# Side-on scenes (144×96)

Only shadowboxing (Cień, `startSpar(…, shadow=true)`, always the cell) and push-ups still use this frame; real fights
are isometric (see iso-room.md). The yard and bath side backdrops below are no longer reachable in play — use them as a
visual pattern, not as live code to polish.

## Frame layout and what covers it

- Fighters stand on `appearanceState.FLOOR_Y` = 86, about 45 px tall (heads ≈ y 40), centred near x 72.
- In-canvas HUD: names, HP and stamina bars and the clock fill y 0–18 across the width.
- The card fight and its HTML card overlay are gone; check what the shadowboxing HUD covers on a real render
  (`node scripts/shot.mjs --scene=shadow`), not from these numbers.
- So detail that must be seen lives in **y 20–68**; the floor is mostly hidden; the top of the wall only peeks out.

## Draw order per frame (`renderSpar` in `src/sparring.js`)

1. `rendererState.fb.set(state.bgRing)`: the baked static backdrop (`buildRing(venue)` → `yardFightBg` /
   `wardFightBg` / `bathBg`), baked once per fight. Put everything that does not move here, at any cost per pixel.
2. `…FightBack(hot, …)`: per-frame things behind the fighters (people, rag, fog, light pass, breath).
3. Fighter shadows, particles, the two fighters.
4. `…FightFront(t0)`: over the fighters (lamp flame, flying rag, captions). Keep it light; the fighters must stay crisp.

Per-frame budget: the yard backdrop with fog over all 13 824 pixels, five walkers and breath costs about 1.3 ms per
frame including the sim step (`scripts/perf.mjs`). A full-frame per-pixel pass with 4 noise samples is affordable.

## Building blocks

The side-on fight scenes and their helpers lived in `src/newgate-fight.js`, removed in `992736a` (fights became
isometric). Still in the tree: `vnoise(u,v)` and `fbm(u,v)` in `src/noise.js`, `mix(c,t,k)` in `src/cast.js`,
`knee(…)` two-bone IK in `src/fighter-rig.js`, `yardFog` in `src/exercise-yard.js`. The removed ones (`softSpot`,
`blitLayer`, `convictPose`/`drawConvict`, `breath`, `drawWarder`) are only in history:
`git show 992736a^:src/newgate-fight.js`. The recipes below describe them as patterns, not live code.

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

## Render timing

`shot.mjs` starts the scene at tick 0 and steps `--warm` ticks (default 60): the first frame is at `boxingState.tick` = 60,
then `60 + k·gap`. Compute when a timed event happens from that, instead of rendering many sheets.
