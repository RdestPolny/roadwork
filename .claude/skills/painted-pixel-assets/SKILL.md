---
name: painted-pixel-assets
description: Realistic painted pixel-art assets for any 2D game from one AI reference painting of the scene — new poses, walk cycles, idle animations, turning heads, props and empty backgrounds made as image edits of that same reference through Codex (GPT Images in the ChatGPT app), people cut out with Apple Vision, exported as RGBA layers with positions (or baked into the game's own format) and animated in the engine. Use when the user wants realistic characters, sprites or animation frames, a scene rebuilt "1:1 from the reference", better assets for a level or minigame, or complains about halos / leftover background around sprites or a hand-drawn look ("realistyczne", "wzór", "assety", "sprite", "animacja postaci", "chód", "idle", "wycięcie", "tło wokół", "Codex", "grafika z AI"). Not for procedural art tuning without a reference image.
---

# Painted pixel assets from a reference

The look comes from a painting; the code only cuts, places, moves and lights it. Hand-placed or procedural pixels for
faces, bodies and limbs fall visibly short of the painting — users notice at once. If a part can come from an image,
make an image of it: the reference, or an edit of the reference.

Scripts (`scripts/`): `edit.sh` (Codex edits), `vmask.swift` (Apple Vision subject mask), `cut.py` (layers from a JSON
spec → RGBA PNGs + manifest), `check.py` (measure, inspect, compare, motion maps). A worked example in a real game,
with its bake into a palette-indexed JS module, is in `references/example-treadwheel.md`.

**Roadwork:** przeczytaj najpierw `references/roadwork.md` (które elementy to obrazy, a które rysuje kod).

## 0. Check the tools

```bash
ls /Applications/ChatGPT.app/Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex   # Codex, image generation built in
swiftc --version && sw_vers -productVersion        # Vision subject masks need macOS 14+
python3 -I -c "import numpy, PIL"
```
No Codex → give the user the prompts from `references/edit-prompts.md` and ask for the images. Not on macOS →
replace Vision with `rembg` (`pip install rembg onnxruntime`; BiRefNet/u2net models download on first use).

## 1. The reference

One painted image of the whole scene, composed for the game's frame (aspect and layout of the game screen). If the user
has none, write the prompt (scene, camera, every element's place, light, palette, style). Bring it to the game grid
once to see what survives — small grids lose faces and text, so pick the resolution here:

```bash
S=~/.claude/skills/painted-pixel-assets/scripts
python3 -I $S/check.py shrink art/scene.webp --size=288x192 --out=artifacts/tmp/ref
python3 -I $S/check.py grid art/scene.webp --box=200,40,288,160 --bright --out=artifacts/tmp/grid.png   # measure on a gridded crop
```
Write the measured places (figures' centres, heads, light sources, occluders) into the code as constants.

## 2. Plan the edits

List every frame and state the game needs, and **an empty background under anything that moves** (the stalls without
people, the bench without the men). Rules that held:
- One edit = the reference with ONE change. Never chain edits; each starts from the original.
- Keep identities stable: take only the moving part from an edit (legs for a walk, a head for a turn) and the rest of
  the figure from the original — whole-figure edits change faces and clothes a little each time.
- A walk needs at least feet together / left up / right up. Whole-body states (resting, hanging, fallen) can be full figures.

Prompts that worked and what failed: `references/edit-prompts.md`.

## 3. Generate

```bash
$S/edit.sh art/scene.webp art scene-step-left "<what changes>"            # -> art/scene-step-left.png, reference size
printf '%s\t%s\n' step-left "…" step-right "…" > batch.tsv
$S/edit.sh --batch batch.tsv art/scene.webp art scene-                    # three at a time; minutes each — run in background
python3 -I $S/check.py sheet art/scene.webp art/scene-step-*.png --box=20,40,110,150 --out=artifacts/tmp/edits.png
```
**Look at every edit before using it.** Codex mixes up left/right (eyes, raised leg) — regenerate naming the picture
edge and whose side it is. An edit drifts slightly everywhere (≈10/255 on average): never take a whole edited frame
where the original should stay. If `edit.sh` reports no output, the newest file in `~/.codex/generated_images/` is it.

## 4. Cut

Write a spec and run `cut.py` (fields in its docstring):
```bash
python3 -I $S/cut.py art/scene-layers.json      # -> <out>/<name>.png (RGBA, cropped) + <out>/manifest.json (x, y, w, h)
python3 -I $S/check.py layers <out>/manifest.json --out=artifacts/tmp/layers.png   # every layer on magenta
```
- **People, animals, anything organic: `"cut": "vision"`** on the full-size picture per box (soft alpha brought to
  the grid). Vision counts a bench or chair the figure sits on as part of it — keep that occluder as its own layer
  (`"rows"`) drawn in front, and cut the figures whole.
- **Props and a turned head on an otherwise identical edit: `"cut": "diff"`** against the reference (threshold ~28
  for edits, ~18 for props). It carries the drifted wall behind them as a rectangle; if that shows, cut with Vision on
  a head-and-shoulders box instead.
- Never cut people by difference against an inpainted background — background halos stay around them.
- Legs under an original upper body: `"fade_in_below"` at the hips. Figures in front of others: `"minus"`.
- `"palette": N` shares one palette across layers (≈200, median cut, no dithering) for a consistent pixel look.

## 5. Put it in the game

Static plate = the reference with every moving part's place filled from the empty edits. Then layers in order, moved
by whole pixels, chosen from the game clock — rules in `references/layering.md`. Code draws only what must move
procedurally (rotating parts, a beam, dust, light) and the HUD.

## 6. Verify — every round

Render frames from the game (staged states: each pose, each idle variant, extreme offsets), then:
```bash
python3 -I $S/check.py compare frames/f0.png --frame=0 --ref=art/scene.webp --box=0,0,288,192 --out=artifacts/tmp/cmp.png
python3 -I $S/check.py motion frames/f*.png --out=artifacts/tmp/motion.png     # or one contact sheet with --cols/--frame-size
```
In the motion map only the outlines of moving figures and intended motion may light up — a lit rectangle means a layer
drags its background along. Inspect the picture's border at the extreme offsets: a figure touching the edge must not
come loose from it. Then the project's tests and the frame time.

## Pitfalls seen

- Added light over a part the painting already lights doubles it — keep it faint there.
- A second vignette or a strong tone lift on a painting that already has them washes it out; compare pixel values.
- Painted layers + per-pixel light are cheap only if static work is precomputed (grain, fog on a coarse grid, tone LUT).
