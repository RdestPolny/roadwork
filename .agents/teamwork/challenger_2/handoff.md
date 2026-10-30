# Handoff Report: Challenger 2 — Edge Cases & Rendering Boundary Stress

## 1. Observation
- Target implementation and test files inspected:
  - `src/port-district.js`: Lines 41–54 (anchors: `timber_workbench`, `timber_raw_stack`, `timber_finished_stack`, `timber_loading_spot`, `timber_foreman`), lines 56–60 (`LIFE_BLOCKS`).
  - `src/port-scenes.js`: Lines 23–62 (`board(b)`), lines 72–87 (dunnage sleepers under raw and cut stacks), lines 90–105 (`BENCH` trestles, kerf, sawdust), lines 108–116 (`BIN` blocks and deck scatter), lines 126–132 (falling offcut block), lines 137 (`handler` suppression: `state==='INSIDE'||(dark||0)>0.85`), lines 151–175 (saw geometry and push-stroke sawdust), lines 178–204 (`foreman` book, pencil, rule).
  - `src/port-life.js`: Lines 512–532 (plank dimensions, bench, bin, stacks), lines 620–627 (stack inventory levels), lines 634–675 (`woodworker`), lines 685–722 (`sawing`), lines 738–777 (`handler`), lines 783–802 (`foreman`).
  - `src/port-extension.js`: Lines 157–184 (warehouse exterior brick wall `wallJ` at `j = 4.5`, open doorway quad at `i in [47.3, 49.1]`, `z in [0, 19]`).
- Empirical test execution commands and results:
  - `node --test tests/port-district.test.js`:
    ```
    ✔ extended port builds at least twice the original plan with connected timber decks (0.497167ms)
    ✔ buildings and stored goods block travel, with public passages left open (0.751208ms)
    ✔ background routines remain deterministic on the port and cycle through their activities (138.95325ms)
    ℹ tests 3
    ℹ suites 0
    ℹ pass 3
    ℹ fail 0
    ```
  - `npm run check`:
    ```
    > roadwork@0.1.0 check
    > tsc --noEmit
    [clean exit with code 0]
    ```
  - `node scripts/record-timber-gif.mjs`:
    ```
    Timber yard routine period: 2072 ticks
    Capturing 148 frames of native 432x288 framebuffer (dt=14 ticks)...
    Encoding animated GIF to /Users/marcinek/Documents/Roadwork/artifacts/timber-yard-routine.gif...
    [out#0/gif @ 0x6000010e4240] video:2087KiB
    Successfully generated timber yard routine GIF: /Users/marcinek/Documents/Roadwork/artifacts/timber-yard-routine.gif
    ```
  - Generated artifact: `artifacts/timber-yard-routine.gif` (2,137,088 bytes, 432×288, 148 frames, 15 fps).
  - Empirical boundary test harness:
    - Doorway transition: 522 suppressed ticks; 59 visible ticks stepping through the open portal (`j < 4.5` down to `j = 4.0185`); suppression threshold reached at `t = 2034` with `dark = 0.8519`; emergence first visibility at `t = 484` with `dark = 0.8475`. Zero facade bleed-through or 2nd-story hovering.
    - Stroke 12 offcut transition: cut plank switched synchronously at `t = 1013`; falling trajectory ran 27 ticks (`t = 1013..1040`); maximum single-tick deltas: `drop = 0.6650`, `ang = 0.1550 rad`; terminal drop = 3.5000; zero phantom offcuts.
    - Bin geometry: Block 1 `i in [49.56, 49.88]`, `j in [7.98, 8.16]`, `z in [2.60, 3.05]`; Block 2 `i in [49.66, 49.94]`, `j in [8.14, 8.38]`, `z in [2.60, 3.15]`. Minimum clearance from crate walls = 0.06 tiles; zero wall clipping.
    - Sawdust particles: active over 206 push-stroke ticks; vertical range `[4.701, 6.100]` (never exceeds `kz = 6.100`); horizontal range `j in [7.780, 8.040]`; distance to warehouse wall = 3.280 tiles.
    - Viewport stress test: 7 camera viewpoints (`(44.0, 7.5)`, `(44.0, 4.0)`, `(44.0, 11.0)`, `(40.0, 7.5)`, `(48.0, 7.5)`, `(47.3, 4.85)`, `(49.35, 7.9)`) tested across variable step rates (`dt = 1, 5, 14, 28`); zero console errors, zero uncaught page errors.

## 2. Logic Chain
1. In `src/port-extension.js:171, 176`, the warehouse brick wall sits at `j = 4.5` and has an open doorway aperture at `i in [47.3, 49.1]`. In `src/port-life.js:746`, shadow attenuation `dark = clamp01((4.70 - p[1]) / 0.8)` smoothly darkens the handler as he steps from `j = 4.85` into the portal. In `src/port-scenes.js:137`, suppression triggers when `a.state === 'INSIDE' || (a.dark || 0) > 0.85`. This activates at `j = 4.0185`, where the handler is already attenuated by >85% and deeply enveloped within the open door opening (`i = 48.1`). Because he never penetrates behind the brick wall outside of the doorway aperture, isometric projection cannot place his sprite on the 2nd-story facade.
2. In `src/port-life.js:654`, the board on the bench switches from `BENCH_RAW` to `BENCH_CUT` at exact tick `t = 1013`, ending the cut at `BENCH.cut = 49.35`. At the exact same tick, `offcut.state` becomes `'FALLING'` with initial `ang = 0`, `drop = 0` at `ci = 49.525`. Over the 27-tick falling interval, `ang` and `drop` increase monotonically without discontinuous snapping. At `t = 1040`, `BENCH.top + PLANK.raw.th - drop <= BIN.h - 0.3` cleanly terminates the falling sprite into `'IN_BIN'`.
3. In `src/port-scenes.js:108-116`, the accumulated wood blocks inside `BIN` are positioned at `i in [49.56, 49.88]` and `[49.66, 49.94]`, which are completely contained within the crate's `[49.50, 50.00]` extents. They rest on the crate's top plane at `z = 2.6 = BIN.h`, protruding realistic ~0.5 units above the crate rim without clipping perimeter walls or floating in air.
4. In `src/port-scenes.js:161-174`, sawdust particles spray downward (`z` decreases from 6.100 down to 4.701) and outward (`j in [7.780, 8.040]`). Because the warehouse wall is at `j = 4.5`, the minimum clearance between the particles and the wall is 3.280 tiles. No sawdust shoots into the sky or penetrates warehouse walls.
5. In `src/thames-port.js` and `src/renderer.js`, the native 432×288 framebuffer (`hd3.off`) maintains rigid dimensions and active canvas contexts under camera pans ranging across north, south, east, and west coordinates, and survives variable simulation step intervals (`dt = 1..28`) with zero console errors.

## 3. Caveats
- Browser execution requires Chromium and FFmpeg (both installed and validated on this macOS host).
- Kinematic checks were performed with mathematical rigor on all 2,072 ticks of the routine cycle; visual rendering was sampled and evaluated across multiple viewpoints and step rates.
- No caveats regarding code correctness or visual fidelity.

## 4. Conclusion
The Thames Timber Yard implementation is empirically robust, visually continuous, and resilient against edge cases and boundary conditions. All 5 challenge dimensions (doorway transition, offcut severance, bin geometry, sawdust dispersion, dynamic viewport) passed 100%.

**Explicit Verdict**: **APPROVE**

## 5. Verification Method
To independently reproduce and verify these empirical results:
1. Run deterministic district unit test suite:
   ```bash
   node --test tests/port-district.test.js
   ```
   Expected: 3 passed, 0 failed.
2. Run TypeScript strict type check:
   ```bash
   npm run check
   ```
   Expected: 0 errors, clean exit.
3. Run the automated timber yard GIF recording script:
   ```bash
   node scripts/record-timber-gif.mjs
   ```
   Expected: Output artifact generated at `artifacts/timber-yard-routine.gif` (2.0 MB, 148 frames, 432×288 resolution).
4. Inspect `artifacts/timber-yard-routine.gif` to visually verify smooth routines, absence of floating handler glitch, grounded timber stacks, volumetric planks, push-stroke sawdust, and falling offcut into the bin.
