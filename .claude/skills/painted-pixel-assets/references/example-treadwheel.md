# Worked example: the treadwheel in Roadwork

Roadwork (`~/Downloads/Roadwork`, native ESM, own pixel renderer, 288×192 at 2×) rebuilt its treadwheel minigame from
one AI painting with this method (2026-10-17), then went back to code-drawn art for the game. The whole experiment
(edits, bake, scene, the hero-sprite test) is kept in `~/Downloads/Roadwork-kierat-codex/`; the paths below are relative
to that folder (the painting itself stays in `Roadwork/reference/kierat-wzor.webp`).

## Files

| File | Role |
| --- | --- |
| `reference/kierat-wzor.webp` | the painting (1536×1024) |
| `reference/kierat-<name>.png` | Codex edits: `pusto`, `lawka-pusto`, `krok-l` / `krok-srodek` / `krok-p`, `odpoczynek`, `wiszenie`, `upadek`, `lawka-szept`, `lawka-zimno`, `latarnia-zamknieta`, `glowa-quarter` / `glowa-front` / `glowa-warn` |
| `scripts/kierat-edit.sh` | the project's edit wrapper (same as this skill's `edit.sh`, fixed to that reference) |
| `scripts/vmask.swift` | Apple Vision subject mask |
| `scripts/kierat-plate.py` | the bake: plate + layers + one 200-colour palette → `src/treadwheel-plate.js` (palette hex, base64 indices, base64 alpha per layer) |
| `src/treadwheel-scene.js` | composition, motion, light; `paste(L,{dx,dy,x0,x1,a,edge})` |

## What each edit became

- `pusto` (empty stalls): the panels behind the men and the painted treads, scrolled in time by sampling each moving
  tread from the painted tread at the same screen height along the painting's own edge spacing.
- `krok-*`: legs only (Vision cut, faded in below the hips) under the original upper bodies; switched per beat.
- `odpoczynek`, `wiszenie`, `upadek`: whole figures for resting on the rail, hanging, collapsed at the foot of the stall.
- `lawka-pusto` under the two on the bench; `lawka-szept` / `lawka-zimno` whole-figure idle variants; the plank of the
  bench cut from the original and drawn in front; breathing/shivering moves the figures with `edge`.
- `latarnia-zamknieta`: the lantern with its shutter shut (open = the original's lantern, cut by difference).
- `glowa-*`: the warder's head turning from his painted profile to stare at the camera; his body never moves.

## Bake details worth copying

- Vision per stall box on the 1536×1024 picture, alpha by `Image.BOX` resampling to the grid; people in one box never
  take pixels of people in front of them (subtract the bench figures, grown by 1 px).
- Head turns cut by difference > 28 against the original, plus the old profile's pixels, closed 2 / opened 1.
- Everything quantized together (plate, panels, original, every edit side by side) so all layers share the palette.
- ~12 s per bake with Vision; the generated module ~330 KB for 20 layers.
