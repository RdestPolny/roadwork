# Handoff Report: Verification & GIF Infrastructure

## 1. Observation
- `package.json:8-10`: `"test": "node --test tests/*.test.js"`, `"test:browser": "node tests/browser.mjs"`, `"check": "tsc --noEmit"`.
- `tests/port-district.test.js`: `node --test tests/port-district.test.js` passed 3/3 tests in 184.7ms.
- `tests/browser.mjs`: `npm run test:browser -- --only=thames` passed all 4 test targets in 20.8s (`PASS Thames life: fixed routine phases`, `PASS Thames district: 13 native exploration, NPC, brawl and story captures`, `PASS 432x288: six native scene captures and Thames camera regression`, `PASS Thames port developer preview, animation and return`).
- `npm test`: Failed on `tests/animation.test.js` (Victorian guard timing) and `tests/realtime-rules.test.js` (stamina/counter/damage timing assertions); unrelated to the port district.
- `scripts/render-port.mjs:25`: Crashed with `TypeError: T.panThamesPort is not a function`.
- `src/port-life.js:544-554`: Defined `WOOD` loop (10 steps) with `YARD_T = 2072` ticks, `HANDLER` loop with `HANDLER_LAG = 1609`, synchronized to the timber yard cycle.
- `src/renderer.js:218-220`: Defined native 3× framebuffer `state.hd3` at 432×288 pixels (`img`, `off`, `octx`).
- `src/thames-port.js:132-137`: Defined `debugPortView(i, j)`. Tested coordinate `(46.7, 8.3)` puts the player in front of the saw table; coordinate `(44.0, 7.5)` puts the player on the side stone path, providing an unobstructed view of the entire yard.
- `which ffmpeg`: `/opt/homebrew/bin/ffmpeg` (FFmpeg 8.1.1). `which magick convert gifsicle`: not found.
- `.gitignore:2`: Contains `artifacts/`. Existing `artifacts/port-rutyna.gif` is untracked by Git.
- `scratch/record_test_gif.mjs`: Prototyped and recorded 30 frames at 15 fps using Playwright and FFmpeg palettegen/paletteuse; generated 432×288 GIF (`artifacts/tmp/test_timber.gif`, 307 KiB) in ~0.25s encoding time with crisp pixel-art rendering.

## 2. Logic Chain
1. *From observation of `tests/port-district.test.js` and `npm run test:browser -- --only=thames`:* The Thames port simulation and visual rendering pipeline are fully functional, deterministic, and verifiable through automated headless browser tests.
2. *From observation of `scripts/render-port.mjs`:* The existing script `render-port.mjs` cannot be reused directly because `panThamesPort` was removed from `thames-port.js`. A new dedicated recording script or harness function is required.
3. *From observation of `src/port-life.js` (`YARD_T = 2072` ticks):* At fixed 60 Hz, one complete routine cycle takes 34.53 seconds. Stepping 4 ticks per frame produces 518 frames; playing at 15 fps reproduces true 1.0× game speed smoothly.
4. *From observation of `src/renderer.js` (`hd3` 432×288) and viewpoint tests:* The native 432×288 buffer captures exact pixel art without canvas scaling artifacts. `debugPortView(44.0, 7.5)` clears the camera of the player sprite, framing the worker, handler, foreman, stacks, bench, and waterfront in one shot.
5. *From observation of `/opt/homebrew/bin/ffmpeg` and prototype test in `scratch/record_test_gif.mjs`:* A 2-pass FFmpeg palette generation with Bayer scale 3 dithering generates a high-quality GIF (~3.5–5 MB) in ~3–4 seconds, with zero external dependencies beyond Playwright and standard macOS brew FFmpeg.
6. *From observation of `.gitignore`:* Because `artifacts/` is ignored by default, committing the resulting GIF into the repository per requirement R3 requires adding an exception to `.gitignore` or using `git add -f`.

## 3. Caveats
- `npm test` fails in other modules (`realtime-rules` and `animation`), so the test verification step for timber yard changes must rely on `node --test tests/port-district.test.js`, `npm run check`, and `npm run test:browser -- --only=thames`.
- The total cycle length (2072 ticks, ~34.5s) is long for a standard web GIF. At 15 fps (518 frames) the file is ~4 MB. If an even smaller file size is desired, 10 fps (step=6 ticks, 345 frames) yields ~2.5 MB. 15 fps is recommended for motion smoothness.

## 4. Conclusion
1. **Verification**: Verify all timber yard and port logic changes with:
   - Logic: `node --test tests/port-district.test.js`
   - Types: `npm run check`
   - Visual/Browser: `npm run test:browser -- --only=thames`
2. **GIF Recording Pipeline**:
   - Create a dedicated script `scripts/record-timber-gif.mjs` modeling `scratch/record_test_gif.mjs`.
   - Setup: Start local HTTP server, launch Playwright Chromium, navigate to `/?debug=1`, execute `startThamesPort()`, and set camera via `debugPortView(44.0, 7.5)`.
   - Capture: Step 4 ticks per frame for 518 frames (covering all 2072 ticks of `YARD_T`), dumping `hd3.off` to PNG frames.
   - Encode: Run FFmpeg with `palettegen=max_colors=128:reserve_transparent=0` and `paletteuse=dither=bayer:bayer_scale=3` at 15 fps into `artifacts/port-rutyna.gif`.
   - Git tracking: Add `!artifacts/port-rutyna.gif` to `.gitignore` so the file can be tracked in the repository.

## 5. Verification Method
- Run port unit tests: `node --test tests/port-district.test.js`
- Run Thames browser scenario: `npm run test:browser -- --only=thames`
- Verify GIF prototype generation:
  ```bash
  node scratch/record_test_gif.mjs
  ffprobe artifacts/tmp/test_timber.gif
  ```
  Expected output: 432x288, 15 fps, duration 2.00s.
- Invalidation condition: `T.debugPortView(44.0, 7.5)` returns `false` or `ffmpeg` fails with palette generation errors.
