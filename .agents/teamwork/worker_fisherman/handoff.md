# Handoff Report: Fisherman Routine, Fish Bucket Mechanics, and Pier Cat Heist

**Agent**: `worker_fisherman`  
**Role**: Implementer & QA Engineer  
**Date**: 2026-10-30  
**Handoff Type**: Hard (Implementation, visual rendering, and automated test suite complete)

---

## 1. Observation

### 1.1 Codebase Architecture & Ownership
- Exclusive write ownership files:
  - `src/port-district.js`: Geometry definitions and background anchors.
  - `src/port-life.js`: Pure deterministic kinematics and state machine engine.
  - `src/port-scenes.js`: Isometric Canvas visual rendering pipeline.
  - `tests/port-fisherman.test.js`: New unit test suite.
  - `tests/port-life-browser.mjs`: Playwright browser test harness.

### 1.2 Spatial Geometry & Deck Bounds
- In `src/port-district.js`:
  - `DISTRICT.pier = [42.2, 13, 51.8, 25]` (pier deck extends from `i = 42.2..51.8` and `j = 13.0..25.0`).
  - `DECK_Z = 0.25` (timber deck elevation).
  - River waterline: `WL = -7.0` (in `src/thames-port.js:31`).
  - Added anchors in `src/port-district.js:45-47`:
    - `pier_peeing_spot: { i: 51.20, j: 21.80, a: 0.0 }` (East railing overlooking Thames).
    - `cat_spot: { i: 47.50, j: 22.20, a: 0.62 }` (Mid-pier observation post facing bucket).
    - `cat_crate: { i: 45.40, j: 20.60, w: .8, d: .8, h: 4.5 }` (Sturdy shipping crate on pier deck).
  - Added crate collision block in `src/port-district.js:62`: `[45.0, 20.2, 45.8, 21.0]`.

### 1.3 State Machine Synchrony & Kinematics
- In `src/port-life.js`:
  - Extended fisherman routine to 13 states with period `T = 2564` ticks (`FISH_STEPS` in lines 193–207):
    - `PREPARE` (90t)
    - `CAST` (124t)
    - `WAIT` (600t)
    - `NIBBLE` (130t)
    - `REEL` (210t)
    - `UNHOOK` (190t)
    - `DROP_FISH` (120t)
    - `PREPARE_BREAK` (90t)
    - `WALK_TO_PEE` (240t)
    - `PEE` (360t)
    - `WALK_BACK` (240t)
    - `RETRIEVE_ROD` (90t)
    - `RESUME` (80t)
  - During break (`WALK_TO_PEE`, `PEE`, `WALK_BACK`), the rod is securely propped against the south rail (`rod.propped = true`, butt at `[49.80, 23.90, 0.25]`, mid at `[49.60, 24.80, 6.5]`, tip at `[49.40, 25.50, 7.8]`, line hanging to float at `[49.40, 26.50, WLL + bob]`).
  - During `PEE`, fisherman stands at `[51.20, 21.80, 0.25]` facing east (`a = 0.0`). For `u in [0.10, 0.90]`, procedural parabolic ballistic stream arcs from pelvis height (`[51.373, 21.80, 6.45]`) over the east railing (`i = 51.80, z = 6.5`) to water impact at `[52.95, 21.80, -7.00]` with expanding ripple rings and micro-droplets.
  - Implemented `CAT_STEPS` loop matching period `T = 2564` ticks:
    - `WATCH` (1554t): Sits at `[47.50, 22.20, 0.25]` observing fisherman.
    - `STALK` (140t, 1554..1694t): Triggered when fisherman begins `WALK_TO_PEE`. Sneaks low to bucket `[49.30, 24.15]`.
    - `STEAL` (90t, 1694..1784t): Rears up on bucket rim, paw plunges into water (splash!), extracts fish in jaws.
    - `SPRINT` (100t, 1784..1884t): Gallops with fish to crate `[45.40, 20.60]`, leaps onto crate top (`z = 4.75`).
    - `EAT` (280t, 1884..2164t): Feasts on fish on crate top while fisherman pees; fish shrinks; finishes with paw face wash.
    - `RETURN` (160t, 2164..2324t): Hops down and trots back to observation post.
    - `WATCH` (240t, 2324..2564t): Sits calmly at post before fisherman returns to rod.
  - Implemented `bucketAt(t)` with closed-cycle determinism:
    - `count`: Starts at 2. Increments to 3 at `DROP_FISH` (tick 1441). Decrements back to 2 at cat `STEAL` (tick 1752). `count(t + T) === count(t)`.
    - `splash`: Evaluates droplet particle age `[0..24]` on fisherman fish drop and cat paw steal (zero audio calls).

### 1.4 Visual Canvas Rendering
- In `src/port-scenes.js`:
  - `cyl(bk.i, bk.j, ...)` with procedural top shader:
    - Weathered oak stave rim: `r2 > 0.72` -> `shadeC(C.woodDark, 1.15)`.
    - Dynamic water ripples: expanding rings on `splash >= 0` and living fish flop.
    - Visible fish silhouettes/tails inside water matching `count`:
      - `count >= 1`: Silver flank / tail at `s in [-0.28, 0.28]`.
      - `count >= 2`: Second fish tail near rim at `s in [-0.55, -0.1]`.
      - `count >= 3`: Third fish silhouette at `s in [0.1, 0.55]`.
    - Specular bubble glints at `(s, v)` offsets.
    - Parabolic water droplets flaring upward above bucket rim when `splash >= 0`.
  - Cat crate: `add(cc.i, cc.j, () => crate(cc.i, cc.j, cc.w, cc.d, cc.h, DECK_Z))`.
  - Quadruped cat renderer (`drawCat`):
    - Ground contact shadow.
    - Charcoal dock tabby palette (`rgb('#3b4044')`, `rgb('#1a1c1d')`, `rgb('#7a8288')`).
    - Articulated torso, 4 legs with gait swing, head with triangular ears, curving expressive tail.
    - Silver held fish across jaws during `SPRINT`.
    - Silver fish lying on crate shrinking during `EAT`.
  - Propped rod:
    - When `f.rod.propped`, propped rod is rendered resting on south railing with slack line to water.
  - Urine stream & splash:
    - Rendered using golden `thin()` line segments along parabolic trajectory.
    - Water impact at `[ix, iy, -7.0]` rendered with expanding water ripples and droplet flare.

### 1.5 Automated Test Results
- `node --test tests/port-district.test.js tests/port-fisherman.test.js`:
  - Output: 7/7 tests passed in 100ms.
- `npm run check` (`tsc --noEmit`):
  - Output: Exit code 0, 0 type errors.
- `npm run test:browser -- --only=life`:
  - Output: `PASS Thames life: fixed routine phases` (exit code 0).
  - Captures generated in `artifacts/port-life/`:
    - `fisher-wait.png`
    - `fisher-reel.png`
    - `fisher-drop.png`
    - `fisher-pee.png` (verified visually: fisherman peeing into Thames, propped rod on rail)
    - `cat-steal.png` (verified visually: cat at bucket stealing fish while fisherman walks away)
    - `cat-eat.png` (verified visually: cat eating fish on crate while fisherman pees)
- `npm run test:browser -- --only=district`:
  - Output: `PASS Thames district: 13 native exploration, NPC, brawl and story captures` (exit code 0).

---

## 2. Logic Chain

1. **Closed-Cycle Fish Conservation**:
   - Observation 1.3 shows that within each cycle of period `T = 2564`:
     - Before tick 1441: bucket has 2 fish.
     - At tick 1441 (`DROP_FISH`), fisherman releases caught fish: bucket count becomes 3.
     - At tick 1752 (`STEAL`), cat snatches 1 fish into jaws: bucket count returns to 2.
     - For remainder of cycle: bucket has 2 fish.
   - Because `count(t + T) === count(t)`, no inventory drift occurs over indefinite gameplay sessions.

2. **Opportunity Trigger Guarantee**:
   - Observation 1.3 shows that `CAT` loop is strictly in `WATCH` while `FISH` is in `PREPARE`, `CAST`, `WAIT`, `NIBBLE`, `REEL`, `UNHOOK`, `DROP_FISH`.
   - The cat only transitions to `STALK` at tick 1554, exactly when the fisherman begins `WALK_TO_PEE`.
   - The cat steals the fish at tick 1725–1752, while the fisherman's back is completely turned walking to the east railing.
   - The cat reaches the crate, eats, and returns to `WATCH` at tick 2324, 70 ticks before the fisherman returns to the fishing spot at tick 2394.
   - Therefore, the cat heist is guaranteed to remain undetected by the fisherman.

3. **Parabolic Ballistic Urine Stream**:
   - Observation 1.2 shows that the east railing is located at `i = 51.80` with top rail elevation `z = 6.5`.
   - The pee spot is at `[51.20, 21.80, 0.25]` facing east.
   - Observation 1.3 shows the emitter starts at `[51.373, 21.80, 6.45]`, crests above the rail at `[51.65, 21.80, 6.68]`, drops through `[51.95, 6.10]`, `[52.30, 4.20]`, `[52.65, 0.50]`, and terminates at river water level `WL = -7.00` at `[52.95, 21.80, -7.00]`.
   - Visual inspection of `artifacts/port-life/fisher-pee.png` directly confirms the stream cleanly clears the timber railing and splashes into the river below.

4. **Zero-Audio Pure Canvas Splash**:
   - Observation 1.4 confirms all splashes, water ripples, specular bubbles, and eating effects are implemented purely via Canvas shading and procedural geometry (`cyl` top callback and `thin()` line segments).
   - Zero sound files, Web Audio nodes, or sound triggers were introduced, strictly adhering to R2.

---

## 3. Caveats

- **Pre-existing Combat Test Failures**:
  As noted in the explorer handoffs, running `npm test` across all repo tests shows unrelated pre-existing failures in `tests/animation.test.js` and `tests/realtime-rules.test.js` (Victorian punch timing and guard stamina rules). These were present prior to this task and are completely isolated from port district and life routines.
- **Fixed Window**:
  In accordance with `AGENTS.md`, visual framing and testing were verified in the canonical fixed test resolution (1280×800 window, rendering native 432×288 framebuffer).

---

## 4. Conclusion

All requirements (R1–R5) and acceptance criteria have been implemented and verified:
1. **Fisherman Routine**: Complete fishing cycle (prepare, cast, wait, nibble, reel, unhook, drop fish) plus physiological break (propping rod on south rail, walking to east railing, peeing with parabolic ballistic stream into Thames at `WL = -7.0`, walking back, retrieving rod, resuming).
2. **Fish Bucket Mechanics**: Closed-cycle determinism (2 -> 3 -> 2), top water shader with visible fish silhouettes matching count, expanding ripple rings, specular bubbles, and droplet splash particles (zero audio calls).
3. **Dock Cat Routine**: Initial observation post, opportunity detection triggering sneak crawl when fisherman walks to pee, paw theft from bucket, sprint gallop with fish in jaws to crate, eating on crate with fish shrinkage and paw wash, and return trot to post.
4. **Automated Verification**: 7/7 unit tests passing in `tests/port-district.test.js` and `tests/port-fisherman.test.js`, 0 TypeScript errors via `npm run check`, and Playwright browser tests passing with rendered artifacts in `artifacts/port-life/`.

---

## 5. Verification Method

To independently reproduce and verify all results:

1. **Run Port Unit Tests**:
   ```bash
   node --test tests/port-district.test.js tests/port-fisherman.test.js
   ```
   *Expected result*: 7 tests pass in ~100ms with exit code 0.

2. **Verify Type Cleanliness**:
   ```bash
   npm run check
   ```
   *Expected result*: `tsc --noEmit` exits with code 0 (0 type errors).

3. **Run Browser Life Test**:
   ```bash
   npm run test:browser -- --only=life
   ```
   *Expected result*: Exits with code 0 and prints `PASS Thames life: fixed routine phases`.

4. **Inspect Generated Artifacts**:
   Inspect the visual PNG captures generated by the browser test harness:
   - `artifacts/port-life/fisher-pee.png` (fisherman peeing over rail, propped rod)
   - `artifacts/port-life/cat-steal.png` (cat stealing from bucket while fisherman walks)
   - `artifacts/port-life/cat-eat.png` (cat on crate eating fish)
   - `artifacts/port-life/fisher-drop.png` (fish dropped into bucket)
   - `artifacts/port-life/fisher-wait.png` (fishing stance, observing cat)

5. **Invalidation Conditions**:
   - Any bucket fish count outside `{2, 3}` or failure of `count(t + T) === count(t)`.
   - Fisherman or cat leaving `portSurface === 'pier'` deck bounds.
   - Cat stalking before fisherman begins walking to pee break.
   - Urine stream failing to clear east rail or failing to terminate at `WL = -7.0`.
