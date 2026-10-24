---
name: roadwork-scene-art
description: Pixel-art look of Roadwork's scenes — isometric 2× hub rooms (288×192) and side-on 144×96 fight backdrops: walls, floors, props, background people, fog, breath, background animation and 60 fps motion. Use when the user asks to improve, rework or fix how a room or fight scene looks or moves ("tło", "pokój", "spacerniak", "cela", "łaźnia", "sylwetki", "mgła", "animacja tła", "klatkaż", "realizm"). Not for card rules, balance, menus or save logic.
---

# Roadwork scene art

Art rounds are cheap only when each round = one render + one look. Do not run tests, read whole modules or take
Browser-pane screenshots during art rounds.

## Which scene

| Scene | Where | Read first |
| --- | --- | --- |
| Side-on fight backdrop (Ward, yard, bath) — 144×96, fighters drawn on top | `src/newgate-fight.js`, `src/bath-scene.js`, `src/fight-crowd.js`; hooked from `renderSpar`/`buildRing` in `src/sparring.js` | [references/side-scene.md](references/side-scene.md) |
| Isometric hub room — 2× frame 288×192 | `src/exercise-yard.js`, `src/ward.js`, `src/bath.js`, `src/rooms.js`, `src/gym.js` | [references/iso-room.md](references/iso-room.md) |

Read only the scene's section of the module (`grep -n "^export function\|^function"` then `sed -n a,bp`), not the file.

## Loop

1. **Baseline render** before editing, so the user's complaint is visible:
   ```bash
   node scripts/render-room.mjs --room=yard --fight=3:40 --times=600 --out=s0     # side-on fight, 3 frames 40 ticks apart
   node scripts/render-room.mjs --room=yard --times=600,1230 --out=r0            # iso room at 10:00 and 20:30
   ```
   `--room` = cell | yard | canteen | laznia; the fight uses that room's venue. Output: `artifacts/tmp/<out>.png`.
2. **Back up the module** to the scratchpad (`cp src/x.js $SCRATCH/x.orig.js`) — the project has no git; this is
   the only way to diff or test the baseline.
3. **Edit.** Replace a whole function body at a time with a Python `str.replace` + `assert old in s`, or splice
   by line range after asserting the boundary lines. Then `node --check <file>`.
4. **Look at one frame large**, not the whole sheet:
   ```bash
   python3 .claude/skills/roadwork-scene-art/scripts/frames.py zoom artifacts/tmp/s1.png --frame=1 --box=0,30,144,90 --scale=9
   python3 .claude/skills/roadwork-scene-art/scripts/frames.py strip artifacts/tmp/s1.png --frames=0-5 --box=0,30,50,90   # one figure over time
   ```
   Boxes are in picture pixels (144×96). Output lands next to the sheet as `<name>_zoom.png` / `_strip.png`.
5. **Hide a layer to judge another** (figures under fog, breath without fog): add a temporary first statement
   `if(globalThis.__nofog) return;` and render with `--eval='globalThis.__nofog=1'`. Before finishing:
   `grep -c globalThis src/<file>.js` must print the original count.
6. **Measure, don't eyeball, motion and timing:**
   ```bash
   node scripts/render-room.mjs --room=yard --fight=9:1 --out=m1                   # 9 consecutive ticks
   python3 .claude/skills/roadwork-scene-art/scripts/frames.py motion artifacts/tmp/m1.png --box=0,20,46,84
   node .claude/skills/roadwork-scene-art/scripts/perf.mjs --venue=yard            # ms per frame incl. the sim step
   ```
   `motion` prints changed pixels per consecutive frame: any `0` = the background stood still that tick (not 60 fps).
   For random events (breath, blinks) simulate frequency in `node -e` with a copy of `h2` from `src/boxing.js` instead
   of hunting frames.
7. **Finish** (once, not per round): `npm test`; `npm run test:browser`. The browser suite stops at the first
   failure — run the remaining scenarios with `npm run test:browser -- "--only=<substring>"`, and check a failure
   against the backup (swap it in, rerun that one scenario, swap back) before calling it pre-existing.

## Quality bar the user holds

- No single-pixel hash speckle (`h2(x,y)<n` → one light pixel). Texture comes from per-brick/per-stone tone,
  large-scale value noise (soot, damp, streaks) and edge light/shadow.
- Every background movement changes something every tick: sub-pixel float positions, continuous alpha. Never
  `Math.round` a figure's root, never step noise in blocks (`(x+t*v)/G|0`).
- Fog drifts in at least two layers, slower than and not in the direction of moving people, and evolves (not only
  slides).
- People in the background walk like people: planted stance foot, long double support, hips rising over the standing
  leg, shoulders and head lagging behind it, varied height, stoop, arms and clothes, no two in step.
- Ambient effects are sparse and random per person (`h2(id, slot)`), never everyone at once.
- Keep the fighters readable: backdrop detail lives where the HUD does not cover it (see side-scene reference).

## Gotchas

- Colours are ABGR (`rgb('#rrggbb')` packs red in the low byte). Use `mix(c,t,k)` from `cast.js` and the local
  `shade(c,k)`; don't hand-roll channel maths.
- Dense one-line source: no `//` comments inside replaced fragments, only `/* */`. Run `node --check` after
  every scripted edit.
- Palette ramps: `appearanceState.N_RAMPS` comment in `src/appearance.js` lists reserved ranges; take new slots
  only from a range the module owns, set them with `setRamp` in `initialize()`.
- Figures need the buffer swap: `rendererState.fb = layer`, draw, restore. `taper` pass 0 paints the outline
  (radius + 1) — loop both passes over all parts to get one silhouette outline.
- New state goes into the module's own `state`; reset it in `initialize()`. Don't write into other modules' state.
