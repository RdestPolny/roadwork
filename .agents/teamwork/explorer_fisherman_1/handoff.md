# Handoff Report — Scene Architecture, Pier Layout & Lifecycle Integration

**Agent:** explorer_fisherman_1  
**Working Directory:** `/Users/marcinek/Documents/Roadwork/.agents/teamwork/explorer_fisherman_1/`  
**Date:** 2026-10-30  
**Handoff Type:** Hard (Exploration Task Complete)

---

## 1. Observation

### 1.1 Existing River / Port / Wharf Files
Direct code inspection using `find_by_name`, `grep_search`, and `view_file` revealed the following modular architecture:

1. **`src/port-district.js`**:
   - Lines 6–13 define the global district bounds:
     ```javascript
     export const DISTRICT = {
       quay: [0, 0, 52, 13],
       pier: [42.2, 13, 51.8, 25],
       terrace: [33.1, 13, 39.3, 16.2],
       pub: [30.9, 0, 39.5, 5.9],
       store: [42.4, 0, 46.2, 3.9],
       workshop: [46.65, 0, 52, 4.5],
     };
     ```
   - Lines 37–38 establish deck elevation above quay setts:
     ```javascript
     export const DECK_Z = .25;
     ```
   - Lines 41–54 define existing background anchor positions:
     ```javascript
     export const ANCHORS = {
       pier_fishing_spot: { i: 49.6, j: 24.05, a: 1.37 },
       fisher_bucket: { i: 49.16, j: 24.3 },
       fisher_box: { i: 50.15, j: 23.73, w: .55, d: .36, h: 1.7 },
       ...
     };
     ```
   - Lines 55–60 define collision blocks (`LIFE_BLOCKS`), including the bucket and tackle box:
     ```javascript
     const LIFE_BLOCKS = [
       ...
       [48.93, 24.07, 49.39, 24.53], // fisher_bucket footprint
       [49.87, 23.55, 50.43, 23.91], // fisher_box footprint
       ...
     ];
     ```
   - Lines 27–35 specify cargo blocks and walkable deck boundaries:
     ```javascript
     const cargo = [
       ...
       [44.25, 22.35, 46.95, 23.5] // Hand winch footprint
     ];
     // Walkable margins on the pier:
     if((i > 42 && j > 12.6) && (!within(i, j, [42.55, 12.6, 51.45, 24.5]))) return true;
     ```

2. **`src/port-extension.js`**:
   - Lines 27–46 (`renderDeck`): Renders transverse weathered deck boards and piling supports reaching below low-tide waterline (`WL = -7`, supports to `-11.5`).
   - Lines 48–58 (`rail`): Renders timber railings with posts up to `z = 6.4..7.0`, top rail at `z = 6.5`, middle rail at `z = 3.4`.
   - Lines 60–70 (`portDecks`): Places perimeter railings:
     ```javascript
     rail(42.2, 25, 51.8, 25);     // South railing (facing open Thames)
     rail(42.2, 13, 42.2, 25);     // West railing
     rail(51.8, 13, 51.8, 25);     // East railing
     ```
   - Lines 71–80 (`pierBoat`): Moored utility boat at `s0: 44.1, s1: 48.2, jc: 28.1`, moored with rope from `[46.6, 24.85, 2.2]` on the pier head.
   - Lines 188–204 (`portDistrictProps`):
     ```javascript
     export function portDistrictProps(t){
       const result = [
         ...
         [60.6, ()=>{ crate(43.4, 15.1, 1.2, 1.3, 7, DECK_Z, 2, 0); crate(44.8, 15.4, 1.1, 1.1, 6, DECK_Z, 1, 1); }],
         [70.4, ()=>{ for(let k=0;k<4;k++) isoBox(48.4, 18+k*.55, 50.7, 18.24+k*.55, DECK_Z, DECK_Z+1.2+k*.05, WOOD_HI, WOOD, WOOD_DARK); }],
         ...
       ];
       result.push(...portLifeProps(t));
       return result;
     }
     ```

3. **`src/port-details.js`**:
   - Lines 150–182 (`pierCraftDetails`): Renders hand winch at `wi = 44.25, wj = 22.55` on the pier with rope running to `[wi+1.6, j1-.6, 1.8]`.
   - Lines 183–193: Mooring rings at far corners `[42.92, 24.5]` and `[51.08, 24.5]`.
   - Lines 205–212 (`yardCraftProps`): Mooring line coil on the pier deck at `bi = 49.9, bj = 22.8`.

4. **`src/port-scenes.js`**:
   - Lines 65–70 (`portLifeProps`):
     ```javascript
     export function portLifeProps(t){
       const L = portLife(lifeTime(t)), out = [], add = (i,j,fn) => out.push([i+j, fn]);
       ...
       add(BUCKET.i, BUCKET.j, () => cyl(BUCKET.i, BUCKET.j, BUCKET.r, DECK_Z, DECK_Z+BUCKET.h, (z,s)=>shadeC(C.woodDark,roundLit(s)), ()=>C.woodLight));
       add(TACKLE.i, TACKLE.j, () => crate(TACKLE.i, TACKLE.j, TACKLE.w, TACKLE.d, TACKLE.h, DECK_Z));
       ...
       const f = L.fisher;
       add(f.P.i, f.P.j, () => {
         person(f, ['#34302a', '#544a3b', '#766853']);
         stroke(...f.rod.butt, ...f.rod.mid, C.woodDark);
         thin(...f.rod.mid, ...f.rod.tip, C.woodLight);
         rope(f.rod.tip, f.float, .1, C.rope);
         if(!f.floatUnder) cyl(f.float[0], f.float[1], .035, f.float[2], f.float[2]+.5, ()=>rgb('#b74432'), ()=>rgb('#eee2c0'));
         if(f.fish) stroke(...f.fish.head, ...f.fish.tail, rgb('#a7b6ad'));
       });
       ...
       return out;
     }
     ```

5. **`src/port-life.js`**:
   - Pure deterministic module evaluating routine poses as functions of the life tick `t` (`lifeTime(t) = tick + clock.offset`).
   - Lines 177–202 define the existing fisherman frame and loop:
     ```javascript
     const FA = ANCHORS.pier_fishing_spot;
     export const FISHER = frameAt(FA.i, FA.j, FA.a, DECK_Z);
     export const BUCKET = { i: ANCHORS.fisher_bucket.i, j: ANCHORS.fisher_bucket.j, r: .21, h: 2.5 };
     export const TACKLE = ANCHORS.fisher_box;
     const WLL = -7 - DECK_Z; // -7.25 relative to pier deck
     const LAND = [34, 1.6, WLL];
     export const ROD = { len: 27, butt: 1.5, grip: 2.4, reel: .95 };
     const REST = { g: [1.2, -.6, 8.6], el: .42, az: .1, twist: -.22 };
     ```
   - Current fishing cycle steps: `PREPARE` (100), `CAST` (124), followed by 9 bite attempts with `WAIT` (720..1500), `NIBBLE` (130..190), `REEL` (210), `UNHOOK` (190), `DROP_FISH` (120), `RESET` (130), `MISS` (110).
   - Lines 284–290 (`fishCaught(t)`): Currently returns a purely arithmetic count without decrements:
     ```javascript
     function fishCaught(t){
       const S = stepAt(FISH, t); let c = 2 + S.n * FISH_PER_LOOP;
       for(let k=0; k<S.k; k++) if(FISH.steps[k].s === 'DROP_FISH') c++;
       if(S.s === 'DROP_FISH' && S.u >= FISH_IN) c++;
       return c;
     }
     ```
   - Lines 368: Calculates splash timing during `DROP_FISH`:
     `splash: S.s === 'DROP_FISH' && u >= FISH_IN ? (u - FISH_IN) * S.d : -1`.

6. **`src/thames-port.js`**:
   - Projection parameters (lines 28–30):
     `camera = { x: 150, y: -18, ix: 12, jx: -12, iy: 6, jy: 6, z: 2 }`.
     `UNIT = 7.5` height units per ground tile.
     `isoX(i, j) = camera.x + 12*i - 12*j`.
     `isoY(i, j, z) = camera.y + 6*i + 6*j - 2*z`.
   - Depth sorting (lines 1218–1255):
     All props and actors are packed into an array of tuples `[depthKey, drawFn]`, where `depthKey = i + j`.
     Sorted strictly ascending: `props.sort((a,b) => a[0] - b[0]).forEach(p => p[1]())`.

7. **Scene Lifecycle & Execution Tracing**:
   - `src/runtime.js` line 22: `boxingState.tick++;` executes on every 60 Hz tick.
   - `src/runtime.js` line 33: `if(boxingState.gstate === 'port'){ tickThamesPort(); return; }`.
   - `src/renderer.js` line 147: `if(boxingState.gstate === 'port'){ withHD(()=>{ renderThamesPort(); present(false); }, isometricFrame('port')); return; }`.
   - `src/thames-port.js` line 1206: `renderThamesPort()` executes `renderPortFrame()`.
   - `renderPortFrame()` calls `cachedBackground()` -> `water()` -> `portRiverDistance()` -> `props.sort().forEach()` -> `portDistrictFX()` -> `atmosphere()`.
   - Tests `tests/port-district.test.js` pass 3/3 (382ms).
   - Browser tests `node tests/browser.mjs --only=life` and `--only=district` pass 100% cleanly.

---

## 2. Logic Chain

### 2.1 Coordinate Space & Physical Surfaces
1. From `DISTRICT.pier = [42.2, 13, 51.8, 25]` and `DECK_Z = 0.25`:
   - The pier extends from `i = 42.2` to `51.8` (width 9.6 tiles) and from `j = 13.0` to `25.0` (length 12.0 tiles).
   - Timber deck walking surface is at elevation `z = 0.25`.
   - Water surface is at `WL = -7.00` (low tide Thames). The vertical drop from the deck to the water is `7.25` height units (~0.97 tiles).
   - The pier connects to the stone quay at `j = 13.0`.
   - The remaining three edges (`i = 42.2`, `i = 51.8`, and `j = 25.0`) are open to the river and enclosed by low timber railings (`rail(...)` with top rail at `z = 6.5`, middle rail at `z = 3.4`).

2. Existing objects and obstruction zones on the pier:
   - Hand winch: `[44.25, 22.35, 46.95, 23.5]` (blocked in `cargo`).
   - Moored boat rope: spans from `[46.6, 24.85, 2.2]` to boat at `j = 28.1`.
   - Mooring line coil: centered at `[49.9, 22.8]`.
   - Timber stacks on pier: `i in [48.4, 50.7], j in [18.0, 20.4]` (`isoBox` up to `z = DECK_Z + 1.25`).
   - Existing wooden crates: at `[43.4, 15.1]` and `[44.8, 15.4]`.
   - Fisherman: at `[49.6, 24.05, 0.25]` facing `a = 1.37` (towards `+j`, south).
   - Bucket: at `[49.16, 24.3, 0.25]`.
   - Tackle box: at `[50.15, 23.73, 0.25]`.

### 2.2 Determination of Ideal Spatial Layout

#### Spot 1: Fisherman Fishing Spot
- **Coordinates:** `i = 49.60, j = 24.05, z = 0.25` (Deck level), facing angle `a = 1.37` rad (~78.5°).
- **Rationale:** This is the canonical `ANCHORS.pier_fishing_spot`. It sits at the south-eastern pier head, directly facing the open water (`+j`), with the rod extending out over the river (`LAND = [34, 1.6, -7.25]` in local coordinates). This spot is already supported by existing IK algorithms, collision rules, and visual test captures (`fisher-wait.png`, `fisher-reel.png`, `fisher-drop.png`).

#### Spot 2: Fish Bucket Placement
- **Coordinates:** `i = 49.16, j = 24.30, z = 0.25`.
- **Dimensions:** Cylinder radius `r = 0.21`, height `h = 2.5` (`BUCKET` in `port-life.js`).
- **Rationale:** This is `ANCHORS.fisher_bucket`. In the fisherman's local frame, it resolves to `BUCKET_L = [-0.25, 3.79, 0]`, exactly at his left foot. In `DROP_FISH`, the unhooked fish is dropped over `[BUCKET_L[0], BUCKET_L[1], BUCKET.h + DROP_UP]`. Modifying these coordinates would break the existing hand drop trajectory and fall physics.

#### Spot 3: Fisherman Peeing Spot
- **Coordinates:** `i = 51.20, j = 21.80, z = 0.25`, facing angle `a = 0.00` rad (due East, facing `+i`).
- **Rationale:**
  - Located on the eastern railing (`i = 51.80`) between the timber stack (`j = 20.4`) and the coiled line (`j = 22.8`).
  - Distance from fishing spot: `di = 1.60, dj = -2.25`, distance = `2.76` tiles (~20.7 height units). At standard walking pace (0.0135 tiles/tick), the walk takes ~200 ticks (~3.3s), which provides an ideal temporal window for the cat's heist.
  - Directional alignment: Facing `a = 0.00` (east) means the fisherman turns his back completely away from the bucket (`di = -2.04, dj = +2.50`), creating a natural and credible opportunity for the cat to sneak in unnoticed.
  - Visuals: In isometric projection (`+i` is down-right on screen), facing east gives a rear/side view where the urine stream arches over the railing into the river (`WL = -7.0`), hitting the water with a tiny droplet/ripple effect at `[52.0, 21.8, -7.0]`.

#### Spot 4: Cat's Initial Sitting / Observing Spot
- **Coordinates:** `i = 47.50, j = 22.20, z = 0.25`, facing angle `a = 0.62` rad (facing toward bucket at `[49.16, 24.30]`).
- **Rationale:**
  - Located in the open mid-deck area east of the winch (`i > 46.95`), west of the fisherman/peeing path (`i < 49.6`), and south of the timber stack (`j > 20.4`).
  - Completely clear of `LIFE_BLOCKS` and `cargo`.
  - Unobstructed line of sight directly to the fisherman and bucket at a distance of `2.64` tiles.
  - Depth key: `47.50 + 22.20 = 69.70`. Because `69.70 < 73.46` (bucket depth), the cat naturally sorts behind the bucket and fisherman without visual clipping.

#### Spot 5: Wooden Crate for Cat Eating Spot
Two valid architectural choices exist:
- **Option A (Recommended — Dedicated Pier Crate):**
  - **Coordinates:** `i = 45.40, j = 20.60, z = 0.25`.
  - **Dimensions:** Width `0.80`, depth `0.80`, height `4.50` units (~0.6 tiles).
  - **Cat eating position (top surface):** `[45.40, 20.60, z = 0.25 + 4.50 = 4.75]`.
  - **Depth key:** `45.40 + 20.60 = 66.00`.
  - **Rationale:** Placed in the spacious, empty open deck area north of the hand winch (`j < 22.35`) and west of the timber stack (`i < 48.40`). Distance from bucket to crate is `hypot(49.16 - 45.40, 24.30 - 20.60) = 5.28` tiles. At cat sprint speed (~0.055 tiles/tick), the sprint takes ~96 ticks (1.6s). Both the cat eating on the crate and the fisherman peeing remain simultaneously visible in the standard 432×288 camera view without requiring camera pans.
- **Option B (Reusing Existing Crate):**
  - **Coordinates:** Existing crate at `i = 44.80, j = 15.40, z = 0.25` (height 6.0 units, top at `z = 6.25`, drawn in `port-extension.js:197`).
  - **Rationale:** Reuses an existing crate already present in the environment. Distance from bucket is `9.89` tiles, requiring a longer sprint (~180 ticks, 3.0s).

---

## 3. Spatial Layout Summary Table

| Entity / Landmark | Grid `i` | Grid `j` | Elevation `z` | Depth Key (`i + j`) | Facing `a` (rad) | Bounding Box / Footprint |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pier Deck Bounds** | `42.20 .. 51.80` | `13.00 .. 25.00` | `0.25` | `55.20 .. 76.80` | — | Total area: `9.6 × 12.0` tiles |
| **Water Level (Thames)** | — | — | `-7.00` | — | — | Low tide river level |
| **Fisherman Fishing Spot** | `49.60` | `24.05` | `0.25` | `73.65` | `1.37` (~78.5°) | `[49.4, 23.8, 49.8, 24.3]` |
| **Fish Bucket** | `49.16` | `24.30` | `0.25` | `73.46` | `0.00` | `r = 0.21, h = 2.5` |
| **Fisher Tackle Box** | `50.15` | `23.73` | `0.25` | `73.88` | `0.00` | `w = 0.55, d = 0.36, h = 1.7` |
| **Mooring Line Coil** | `49.90` | `22.80` | `0.25` | `72.70` | — | Radius `~0.5` |
| **Peeing Spot (East Rail)** | `51.20` | `21.80` | `0.25` | `73.00` | `0.00` (East) | Stream reaches rail at `i=51.8` |
| **Cat Observing Spot** | `47.50` | `22.20` | `0.25` | `69.70` | `0.62` (~35.5°) | Cat body `~0.9 × 0.4` units |
| **Cat Eating Crate (Opt A)**| `45.40` | `20.60` | `0.25` | `66.00` | `0.00` | `w = 0.80, d = 0.80, h = 4.5` |
| **Cat on Crate Top (Opt A)**| `45.40` | `20.60` | `4.75` | `66.00` | `1.37` | Cat crouched eating fish |
| **Existing Crates (Opt B)** | `44.80` | `15.40` | `0.25` | `60.20` | `0.00` | `w = 1.10, d = 1.10, h = 6.0` |
| **Hand Winch (Obstacle)** | `44.25 .. 46.17` | `22.55 .. 23.37` | `0.25` | `66.80 .. 69.54` | — | Blocked `[44.25, 22.35, 46.95, 23.5]` |
| **Timber Planks Stack** | `48.40 .. 50.70` | `18.00 .. 20.40` | `0.25` | `66.40 .. 71.10` | — | Height `~1.25` units |

---

## 4. Lifecycle Integration & Data Structures

### 4.1 State Machine Lifecycle Architecture
Following the pattern established by `woodworker` and `handler` in `src/port-life.js`:
1. **Deterministic Function of Time:**
   The entire routine must remain a pure, deterministic function of `lifeTime(t) = t + clock.offset`, where `t = boxingState.tick`. No unsaved mutable global state or asynchronous timers should be introduced.
2. **Fisherman Loop (`FISH`):**
   - The loop sequence is extended to include the pee break cycle:
     - `PREPARE` -> `CAST` -> `WAIT` -> `NIBBLE` -> `REEL` -> `UNHOOK` -> `DROP_FISH` -> `RESET`
     - After N successful catches (e.g., after 2 catches or during the scheduled loop break):
     - `STOW_ROD` (~80 ticks): Lowers rod and rests it against the railing/tackle box.
     - `WALK_TO_PEE` (~180 ticks): Follows waypoint path `[[49.60, 24.05], [50.80, 22.80], [51.20, 21.80]]` using `walkStep`.
     - `PEE` (~280 ticks): Stands at east railing, unbuttons, pee trajectory rendered as dynamic `thin(...)` arc with water ripples at impact point.
     - `PEE_RESET` (~70 ticks): Buttons up, adjusts belt.
     - `WALK_TO_ROD` (~180 ticks): Returns along reverse path to `[49.60, 24.05]`.
     - `TAKE_ROD` (~80 ticks): Picks up rod and transitions back into `PREPARE`/`CAST`.
3. **Cat State Machine (`CAT`):**
   - Synchronized with the fisherman's cycle or driven by state conditions:
     - `WATCH`: Sits at `[47.50, 22.20]`, head yaw tracks fisherman, tail swishes.
     - `STALK` / `APPROACH`: Triggered when fisherman begins `WALK_TO_PEE`. Walks/runs to `[49.16, 24.10]` (beside bucket).
     - `STEAL`: Rears up on bucket rim, snatches a fish into its jaws. Bucket fish count decrements by 1 (`fish--`).
     - `FLEE`: Sprints with fish in mouth to crate at `[45.40, 20.60]`.
     - `JUMP_UP`: Leaps onto crate surface (`z` interpolates from `0.25` to `4.75`).
     - `EAT`: Crouches with fish between paws, chewing animation.
     - `CLEAN`: Licks paw and washes face.
     - `JUMP_DOWN`: Leaps off crate back to deck.
     - `RETURN`: Walks back to `[47.50, 22.20]` and resumes `WATCH`.
4. **Bucket & Fish Splashing Data Structure:**
   - Object state returned by `portLife(t)`:
     ```javascript
     bucket: {
       i: BUCKET.i,
       j: BUCKET.j,
       fish: fishCountAt(t),       // Computed deterministically: caught - stolen
       splashing: fishCountAt(t) > 0,
       splashIntensity: ...
     }
     ```
   - Rendering in `port-scenes.js`:
     - Base bucket drawn via `cyl(...)`.
     - When `fish > 0`: draws water surface ellipse, silver fish body reflection, dynamic ripples (`thin(...)` with `C.waterHi` / `C.ripple`), and periodic splashing droplet particles.

---

## 5. Caveats
1. **Save-game Schemas:** Background routines in `port-life.js` are purely environmental ambient vignettes. They do not alter `save-store.js` or save data schemas.
2. **Option A vs. Option B Crate:** Option A requires adding a small crate prop to `port-scenes.js` or `port-extension.js` at `[45.40, 20.60]`. If strict zero-new-props policy is preferred, Option B utilizes the existing crate at `[44.80, 15.40]`.
3. **Existing Failures in Other Modules:** Running `npm test` revealed pre-existing unit test failures in `tests/realtime-rules.test.js` (unrelated combat rules). However, `tests/port-district.test.js` and all browser tests (`npm run test:browser -- --only=life` and `--only=district`) pass 100%.

---

## 6. Conclusion
The scene architecture, coordinate space, rendering pipeline, and depth sorting mechanisms in Roadwork provide a clean foundation for the fisherman and cat routine:
- **Geometry & Elevation:** Pier deck is at `z = 0.25`, water at `WL = -7.00`, south/east/west edges are railing-protected.
- **Coordinates Identified:**
  - Fishing spot: `[49.60, 24.05, 0.25]`
  - Fish bucket: `[49.16, 24.30, 0.25]`
  - Peeing spot: `[51.20, 21.80, 0.25]` (facing east over rail)
  - Cat observing spot: `[47.50, 22.20, 0.25]` (facing bucket)
  - Cat eating crate: `[45.40, 20.60, 0.25]` (Option A) or `[44.80, 15.40, 0.25]` (Option B)
- **Lifecycle Integration:** Seamlessly integrates into `portLife(t)` in `src/port-life.js` and `portLifeProps(t)` in `src/port-scenes.js`, sorted via `i + j` in `thames-port.js`.

---

## 7. Verification Method

### 7.1 Automated Unit Tests
Verify that port background routines pass determinism and collision checks:
```bash
node --test tests/port-district.test.js
```
Expected output: 3 tests pass in <400ms.

### 7.2 Browser Automation Tests
Verify visual rendering and routine phases in native resolution:
```bash
npm run test:browser -- --only=life
npm run test:browser -- --only=district
```
Expected output: Both test suites pass, generating visual captures in `artifacts/port-life/` and `artifacts/thames-district/`.

### 7.3 Visual Artifact Inspection
Inspect existing rendered captures to verify pier layout and fisherman positioning:
- `artifacts/port-life/fisher-wait.png`
- `artifacts/port-life/fisher-drop.png`
- `artifacts/thames-district/08-timber-pier-and-boat.png`

### 7.4 Invalidation Conditions
- Any proposed coordinates with `i < 42.55` or `i > 51.45` or `j < 13.00` or `j > 24.50` (would fall off the pier or trigger `districtBlocked`).
- Positioning inside `[44.25, 22.35, 46.95, 23.5]` (hand winch collision box).
- Modifying `ANCHORS.fisher_bucket` position away from `[49.16, 24.30]` (would break the existing `DROP_FISH` hand release and fall physics).
