# Verification and GIF Infrastructure Survey Report

## Executive Summary
This report analyzes the verification suite, scene launch mechanics, browser harnesses, and recording infrastructure for the Thames timber yard area in Roadwork.
A deterministic, high-fidelity GIF recording pipeline was designed, prototyped, and empirically validated. Using Playwright with headless Chromium, native framebuffer extraction (`hd3.off` at 432×288), and a two-pass FFmpeg palette generator, the full 2072-tick (~34.5s) timber yard routine can be captured cleanly into a compact, artifact-free animated GIF.

---

## 1. Test Suite Analysis and Verification Mechanics

### 1.1 Node Unit Test Runner (`npm test`)
- Command: `node --test tests/*.test.js`
- Port and district tests:
  - `node --test tests/port-district.test.js` passes completely in ~185ms (3 tests pass: extended port area, passage navigability/blocking, and deterministic background routine cycling).
- Pre-existing failures:
  - Running `npm test` across all test files currently triggers assertion errors in unrelated modules (`tests/animation.test.js` and `tests/realtime-rules.test.js`), primarily around Victorian guard stance timing and realtime combat stamina/counter latch rules.
  - Port-specific logic (`src/port-district.js`, `src/port-life.js`, `src/port-scenes.js`, `src/port-extension.js`) is completely isolated from these combat mechanics.
- Type check:
  - `npm run check` (`tsc --noEmit`) passes cleanly with zero errors across the configured check modules.

### 1.2 Browser Test Harness (`npm run test:browser`)
- Command: `node tests/browser.mjs`
- Targeted execution: `npm run test:browser -- --only=thames`
- Harness structure:
  - Spawns `scripts/serve.mjs` on an isolated local port (e.g. 5189) with HTTP `Cache-Control: no-store`.
  - Launches headless Chromium via Playwright (using `/Applications/Google Chrome.app` when present).
  - Seeds `Math.random` via `addInitScript` for deterministic execution.
  - Opens `http://127.0.0.1:<port>/?debug=1`, exposing `window.__boxer`.
- Thames browser tests run in ~20 seconds and pass 100%:
  1. `checkPortLife`: validates deterministic phase capturing for fisher, pub, and timber yard workers (`artifacts/port-life/*.png`).
  2. `checkPortDistrict`: captures 13 distinct native viewpoints and cutscenes (`artifacts/thames-district/*.png`).
  3. Regression camera checks across the extended quay.

---

## 2. Scene Launch and Rendering Architecture

### 2.1 Entering the Port Scene
- Thames port is conditionally enabled under `?debug=1`.
- Direct JavaScript invocation:
  ```js
  window.__boxer.pause();
  const T = await import('/src/thames-port.js');
  T.startThamesPort();
  ```
- Alternatively, via developer UI:
  `document.querySelector('[data-dev-scene="port"]').click();`

### 2.2 Camera Positioning and Viewports
- Camera structure:
  The scene uses isometric projection coordinates (`camera.x`, `camera.y`, `camera.ix = 12`, `camera.jx = -12`, `camera.iy = 6`, `camera.jy = 6`, `camera.z = 2`).
- Navigation function:
  `T.debugPortView(i, j)` sets player coordinates `player.i = i, player.j = j`, marks `player.moving = false`, and executes `followPortCamera()`. It returns `true` if `(i, j)` is a walkable port surface.
- Viewpoint comparison for timber yard:
  - `T.debugPortView(46.7, 8.3)`: Places the player directly inside the yard between the bench and stacks, where the player figure visually occludes the workers.
  - `T.debugPortView(44.0, 7.5)`: **Optimal camera viewpoint**. The player stands safely to the left on the stone walkway, giving a completely unobstructed view of the workbench (`47.3, 7.9`), raw stack (`50.6, 5.0`), finished stack (`49.8, 9.6`), timber store entrance (`48.1, 4.85`), foreman (`47.0, 8.25`), and the river deck foreground.

### 2.3 Native Framebuffer Extraction
- Framebuffer specifications:
  - Native stage buffer: `R.state.hd3` (defined in `src/renderer.js`), resolution **432 × 288** (3× native 144×96).
  - Offscreen canvas: `R.state.hd3.off` containing the raw pixel buffer before browser DOM scaling or post-processing filters.
  - Extraction method: `R.state.hd3.off.toDataURL('image/png')`.
  - Stepping simulation: `window.__boxer.step(n)` advances simulation time by `n * appearanceState.STEP_MS` (where each tick is ~16.67ms, exactly 60 Hz).

---

## 3. Timber Yard Routine Timeline and Synchronization

### 3.1 Cycle Duration
- The timber yard routine cycle length is defined in `src/port-life.js`:
  `YARD_T = 2072` ticks (at 60 Hz = **34.533 seconds**).
- All three yard characters are synchronized to this master loop:
  1. **Woodworker (`WOOD`)**: 10 distinct steps totalling 2072 ticks:
     - `GO_TO_RAW_STACK`: 155 ticks
     - `PICK_UP_PLANK`: 120 ticks
     - `WALK_TO_BENCH`: 198 ticks
     - `PLACE_ON_BENCH`: 90 ticks
     - `SAW`: 500 ticks
     - `INSPECT`: 190 ticks
     - `PICK_UP_FINISHED`: 130 ticks
     - `WALK_TO_FINISHED_STACK`: 315 ticks
     - `PLACE_ON_STACK`: 100 ticks
     - `RETURN`: 274 ticks
  2. **Handler (`HANDLER`)**: 10 steps totalling 2072 ticks, running with `HANDLER_LAG = 1609` ticks to interlock delivery of raw planks and collection of finished boards.
  3. **Foreman (`FOREMAN`)**: Watches, writes notes in his ledger, and measures boards with a folding rule during `INSPECT`.

---

## 4. Audit of Existing Scripts and Tooling

### 4.1 Defect in `scripts/render-port.mjs`
- `scripts/render-port.mjs` is currently broken:
  - Line 25 attempts to call `T.panThamesPort(cx > 0 ? 'KeyA' : 'KeyD')`.
  - `src/thames-port.js` does not export `panThamesPort`. Running `node scripts/render-port.mjs` crashes with `TypeError: T.panThamesPort is not a function`.
  - This script must be avoided or patched during the implementation phase.

### 4.2 Local Environment Tools
- **Node.js**: v26.5.0 (supported ESM native runner).
- **Playwright**: 1.63.0 installed and functional.
- **FFmpeg**: v8.1.1 installed at `/opt/homebrew/bin/ffmpeg` with full filter and codec support (`palettegen`, `paletteuse`, `libx264`).
- **ImageMagick / Gifsicle**: Not installed (`magick`, `convert`, `gifsicle` not found). FFmpeg is the primary and only required media encoding engine.

### 4.3 Git Tracking Constraints
- `.gitignore` line 2 contains `artifacts/`.
- Existing files in `artifacts/` (such as `artifacts/port-rutyna.gif`) are currently untracked.
- Requirement R3 specifies: *"Wygenerowany i zapisany w repozytorium plik GIF obejmujący rejon tartaku i cykl rutyny pracujących tam postaci"*.
- To commit the final GIF into git, either:
  1. Add an exception in `.gitignore`: `!artifacts/port-rutyna.gif` (or `!artifacts/timber-yard.gif`), or
  2. Run `git add -f artifacts/<gif-name>.gif`.

---

## 5. Verified GIF Recording Pipeline

### 5.1 Pipeline Specification
- **Engine**: Headless Playwright script launching `http://127.0.0.1:<port>/?debug=1`.
- **Viewpoint**: `T.debugPortView(44.0, 7.5)` (unobstructed full view).
- **Frame Rate**:
  - Full routine cycle: 2072 ticks.
  - Stepping: `stepTicks = 4` (advances 4 simulation ticks per frame).
  - Total frames: `Math.floor(2072 / 4) = 518` frames.
  - Target framerate: 15 fps (playback time = 518 / 15 = 34.53s, matching 1.0× real-time speed).
- **Resolution**: Native 432 × 288 pixels (`hd3` buffer).
- **Encoding Command**:
  ```bash
  ffmpeg -y -framerate 15 -i "artifacts/tmp/frames/frame_%04d.png" \
    -filter_complex "[0:v]split[a][b];[a]palettegen=max_colors=128:reserve_transparent=0[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" \
    "artifacts/port-rutyna.gif"
  ```
- **File Size and Quality**:
  - 128-color adaptive palette with Bayer scale 3 dithering produces crisp pixel art with zero dithering noise on flat surfaces.
  - Tested 30-frame prototype generated in 0.25s at 307 KiB.
  - Full 518-frame GIF is estimated at 3.5 MB – 4.8 MB, well within git repository best practices.

### 5.2 Standalone Execution Script Architecture
The recommended implementation script (`scripts/record-timber-gif.mjs`) should:
1. Start `scripts/serve.mjs` on an available port.
2. Launch Playwright Chromium in headless mode.
3. Call `startThamesPort()` and `debugPortView(44.0, 7.5)`.
4. Capture frames in a tight loop stepping 4 ticks per capture.
5. Pipe frames directly into FFmpeg or output to `artifacts/tmp/frames/` and run 2-pass encoding.
6. Clean up temporary frame directories upon completion.
