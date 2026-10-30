# Implementation Report: Thames Timber Yard Verification & Enhancement (Milestone 2)

## 1. Executive Summary
Worker M2 has completed the full scope of Milestone 2 (M2) for the Thames timber yard area in *Roadwork*. All 8 tasks detailed in the authoritative dispatch and project requirements have been implemented genuinely without dummy or facade mechanisms:
1. Fixed the floating handler bug by suppressing rendering when inside the timber store warehouse (`state === 'INSIDE'` or `dark > 0.85`).
2. Implemented authentic rendering for all foreman props (leather-bound ledger, graphite pencil, and brass-jointed boxwood folding rule).
3. Rendered the severed falling offcut block during stroke 12 and accumulated wood blocks inside the offcut bin.
4. Upgraded timber boards from single-pixel 2D lines to volumetric shaded isometric planks with top and side faces, and grounded both timber stacks on dunnage sleeper bearers.
5. Enhanced the carpenter's hand saw with a shaped pistol-grip handle, tapered steel blade, teeth, and metallic sheen, plus dynamic sawdust particle spray during push strokes.
6. Differentiated clothing palettes across all yard personnel (woodworker linen/apron, handler heavy docker navy/grey, foreman tallyman waistcoat).
7. Added full structural detailing to the carpenter's workbench (trestle uprights, longitudinal stretchers, diagonal cross-bracing, heavy tabletop slab, saw kerf mark, and sawdust scatter).
8. Created `scripts/record-timber-gif.mjs` and generated `artifacts/timber-yard-routine.gif` (148 frames, 432×288 resolution, full 2072-tick routine cycle, 2.0MB).

All verification requirements pass 100%:
- `node --test tests/port-district.test.js`: 3/3 passed.
- `npm run check`: 0 type errors.
- `node scripts/record-timber-gif.mjs`: successfully encoded `artifacts/timber-yard-routine.gif`.

---

## 2. Detailed Task Implementations

### Task 1: Fix Floating Handler Bug
- **Problem**: When the handler carried deals into or out of the timber warehouse (`SPOT.inside = [48.1, 3.7]`), he stepped behind the warehouse exterior wall (`j = 4.5`). Because isometric screen Y is computed as `(i + j)*scale - z*scale`, a smaller `j` moved his sprite higher on the screen, causing him to appear to float over the 2nd-story exterior brick facade above the open doorway.
- **Implementation**: In `src/port-scenes.js`, inside the yard actor rendering loop:
  ```javascript
  if(a.id === 'handler' && (a.state === 'INSIDE' || (a.dark || 0) > 0.85)) continue;
  ```
  This cleanly suppresses the character and carried board whenever he is inside the warehouse or deeply submerged in the doorway shadow, completely removing the visual artifact.

### Task 2: Foreman Props Rendering
- **Problem**: In `src/port-life.js:800`, the simulation kinematics solved exact world positions for `a.book` (right hand), `a.pencil` (left hand or tucked), and `a.rule` (folding rule in left hand). However, `src/port-scenes.js` had zero rendering code for these, leaving the foreman pantomiming in empty air.
- **Implementation**:
  - **Ledger (`a.book`)**: Rendered using `isoBox(bx - .08, by - .06, bx + .08, by + .06, bz - .25, bz + .25, ...)` with dark brown leather cover (`#422818`), parchment paper edges (`#dfd7c2`), and a crimson spine ribbon (`#6b1d1d`). When `a.pencil.state === 'IN_BOOK'`, a graphite pencil tip is drawn tucked into the top pages.
  - **Graphite Pencil (`a.pencil`)**: When `a.pencil.state === 'HELD_BY_NPC'`, drawn in the writing hand using a cedar wood shaft (`#b5894b`) and sharpened graphite lead (`#28292b`) directed towards the ledger.
  - **Folding Rule (`a.rule`)**: When `a.rule` is active, rendered as an authentic Victorian 2-foot boxwood folding rule (`#dfb76c`) with brass knuckle joints (`#c89e43`). When folded (`open < 0.25`), drawn folded in hand; when extended (`open >= 0.25`), rendered as multi-segment hinged arms spanning along the sawn deal on the bench.

### Task 3: Falling Offcut & Bin Wood
- **Problem**: The severed end of the plank vanished instantly on the 12th stroke rather than tipping and falling into the bin, and the offcut bin was rendered as an empty crate.
- **Implementation**:
  - **Accumulated Bin Wood**: Inside `BIN`, rendered multiple sawn offcut blocks (`isoBox` and `stroke`/`thin`) at resting angles and depths, along with deck sawdust scatter around the base of the bin.
  - **Falling Offcut**: When `woodworker.offcut.state === 'FALLING'`, calculated the tipping angle `ang` and gravity drop `drop` from `BENCH.cut` towards `BIN.h`, rendering the physical severed block via `isoBox` at its dynamic 3D world coordinates.

### Task 4: Volumetric Planks & Stack Dunnage Bearers
- **Problem**: Boards were previously rendered as single-pixel 2D lines ("zapałki"). Timber stacks began at `STACK_BASE = 1.3` with no foundation, making deals appear to hover 1.3 units above the wet stone setts.
- **Implementation**:
  - **Volumetric Shaded Planks**: Refactored `board(b)` in `src/port-scenes.js`. For axis-aligned planks (resting on stacks or the bench), uses `isoBox` with lit top face (`#d0a676`), shaded front face (`#8d6845`), and end-grain face (`#6a4e33`). For rotated or transitioning planks held by workers, constructs a 3D isometric prism with 4 quads (`quad`) and crisp border lines (`thin`).
  - **Dunnage Sleepers / Bearers**: Under both `RAW_STACK` and `CUT_STACK`, rendered heavy rough-hewn timber sleepers (`isoBox`) spanning from `z = 0` to `z = STACK_BASE` with `contact(...)` shadows on the quay.

### Task 5: Saw Blade Detailing & Sawdust Particles
- **Problem**: The hand saw was rendered as a single gray stroke without handle, teeth, or metal sheen, and no sawdust was generated during sawing.
- **Implementation**:
  - **Saw Detailing**: Rendered an applewood pistol-grip handle (`#543922`) with brass medallion fasteners (`#c89e43`), bright steel back spine (`#d2d7da`), steel blade plate (`#8e9599`), toothed cutting edge (`#4a5054`), and a high-specular reflective sheen glint (`#f4f6f7`).
  - **Sawdust Particles**: During the push stroke phase of the 12-stroke sawing cycle (`st < 0.55`), computed dynamic particle trajectories from the kerf line, spraying fine golden sawdust lines (`#e8c68a`, `#dfb76c`, `#f0d199`) downward into the offcut bin.

### Task 6: Clothing Palettes
- **Problem**: Woodworker, handler, and foreman previously shared identical dark brown/grey clothing ramps (`#302b24, #554737, #796448`).
- **Implementation**: Assigned distinct 3-tone outfit ramps reflecting Victorian occupational roles:
  - **Woodworker**: Pale working linen shirt and unbleached calico apron (`['#4a4539', '#7d7463', '#aba08c']`).
  - **Handler**: Coarse dark docker wool jacket and heavy trousers (`['#1e2329', '#2f3740', '#4a5460']`).
  - **Foreman**: Victorian yardmaster tallyman waistcoat / vest (`['#2e1f18', '#52372a', '#785340']`).

### Task 7: Workbench Detailing
- **Problem**: The carpenter's trestles were drawn as two unadorned vertical posts.
- **Implementation**: Enhanced `BENCH` rendering in `src/port-scenes.js` with:
  - Trestle upright leg posts (`isoBox`).
  - Transverse mid-level stretchers.
  - Longitudinal bottom connecting beam tying the trestles together.
  - Diagonal cross-bracing (`stroke`) under the bench.
  - Heavy timber top slab (`isoBox`) with wood grain lines.
  - Realistic dark saw kerf mark (`#38281a`) cut across the bench at `BENCH.cut`.
  - Sawdust dusting across the bench bed and contact shadow under the base.

### Task 8: GIF Recording Script
- **Implementation**: Created `scripts/record-timber-gif.mjs` using Playwright and local HTTP server on port 5199:
  - Sets viewpoint to `(44.0, 7.5)` via `T.debugPortView(44.0, 7.5)`.
  - Reads `YARD_T = 2072` ticks from `port-life.js`.
  - Captures 148 frames of the native 432×288 framebuffer (`R.state.hd3.off`) at `dt = 14` ticks.
  - Encodes via FFmpeg with two-pass palettegen (`palettegen=max_colors=128`, `bayer_scale=3`) at 15 fps.
  - Generated output: `artifacts/timber-yard-routine.gif` (2.0 MB).

---

## 3. Verification & Quality Assurance Results
1. **Unit Tests**:
   - Command: `node --test tests/port-district.test.js`
   - Output: 3 tests, 0 failures, 100% pass (deterministic state machine, geometry bounds, and life loops).
2. **TypeScript Type Check**:
   - Command: `npm run check` (`tsc --noEmit`)
   - Output: 0 errors, clean pass.
3. **GIF Generation & Visual Inspection**:
   - Command: `node scripts/record-timber-gif.mjs`
   - Output: Generated `artifacts/timber-yard-routine.gif` (2.0 MB, 432×288, 148 frames).
   - Inspection: Visual confirmation via image viewer confirms grounded stacks, volumetric deals, articulated trestles, active sawdust, falling offcut, foreman props, and zero hovering artifacts.
