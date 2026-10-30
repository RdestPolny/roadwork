# Handoff Report: Adversarial Challenge & Stress Testing of Fisherman Pier Routine

**Agent**: `challenger_fisherman_1`  
**Role**: Empirical Challenger & Critic  
**Date**: 2026-10-30  
**Handoff Type**: Hard  
**Verdict**: **REJECT**  

---

## 1. Observation

### 1.1 Test Suite & Harness Execution
- Executed existing unit tests:
  ```bash
  node --test tests/port-district.test.js tests/port-fisherman.test.js
  ```
  Result: 7/7 passed.
- Executed type checking:
  ```bash
  npm run check
  ```
  Result: 0 type errors.
- Executed browser Playwright test:
  ```bash
  npm run test:browser -- --only=life
  ```
  Result: Passed (`PASS Thames life: fixed routine phases`).
- Executed empirical adversarial stress harness (`scratch/adversarial_fisherman_stress.mjs`):
  ```bash
  node scratch/adversarial_fisherman_stress.mjs
  ```
  Result: 6,636 assertions passed, **4 defects failed** (exit code 1).

---

### 1.2 Defect 1: Numerical Corruption with `NaN` in Fisherman Kinematics Frame
- In `src/port-life.js:286-287` (`WALK_TO_PEE`):
  ```js
  const w = walkStep(S, PATH_TO_PEE, FA.a, 0.0, 30);
  P = frameAt(w.P.i, w.P.j, w.P.a, DECK_Z);
  ```
- In `src/port-life.js:305-306` (`WALK_BACK`):
  ```js
  const w = walkStep(S, PATH_BACK, 0.0, FA.a, 30);
  P = frameAt(w.P.i, w.P.j, w.P.a, DECK_Z);
  ```
- In `src/port-life.js:145-150`, `walkStep` returns:
  ```js
  return { P: frameAt(w.i, w.j, a), walk: v < 1, g: w.d / .69, calm };
  ```
- In `src/port-life.js:58`:
  ```js
  export const frameAt = (i, j, a, z0 = 0) => ({ i, j, fi: Math.cos(a), fj: Math.sin(a), z0 });
  ```
- Directly observed via evaluation:
  `w.P` is a `Frame` object `{ i, j, fi, fj, z0 }` and does **not** possess property `a`.
  Therefore `w.P.a === undefined`.
  Evaluating `frameAt(w.P.i, w.P.j, undefined, DECK_Z)` results in:
  `fi: Math.cos(undefined) === NaN` and `fj: Math.sin(undefined) === NaN`.
- Evaluating `fisherAt(t)` for ticks $1554 \le t < 1794$ (`WALK_TO_PEE`, 240 ticks) and $2154 \le t < 2394$ (`WALK_BACK`, 240 ticks):
  - `f.P.fi` is `NaN`
  - `f.P.fj` is `NaN`
  - `f.handR` in `src/port-life.js:487` is evaluated as `world(free) = toWorld(P, free) = [NaN, NaN, 7.85]`.
  - In `src/thames-port.js:845` / `figureHD(P, J, ...)`, joint transformations rely on `P.fi` and `P.fj`, resulting in `NaN` world/screen coordinates for all 480 walking ticks per cycle (18.7% of the total 2564-tick cycle).

---

### 1.3 Defect 2: Solid Obstacle Collision Penetration (Tackle Box)
- In `src/port-district.js:44`:
  `fisher_box: { i: 50.15, j: 23.73, w: .55, d: .36, h: 1.7 }`
- In `src/port-district.js:61`, registered in `LIFE_BLOCKS`:
  `[49.87, 23.55, 50.43, 23.91]`
- In `src/port-district.js:31`:
  `if(cargo.some(r=>within(i,j,r))||LIFE_BLOCKS.some(r=>within(i,j,r))) return true;` (blocked solid obstacle).
- In `src/port-life.js:186-187`:
  ```js
  const PATH_TO_PEE = [[FA.i, FA.j], [50.80, 23.20], [PEE_SPOT.i, PEE_SPOT.j]];
  const PATH_BACK = [[PEE_SPOT.i, PEE_SPOT.j], [50.80, 23.20], [FA.i, FA.j]];
  ```
  Where `FA = { i: 49.6, j: 24.05 }`.
- Straight-line motion between `[49.60, 24.05]` and `[50.80, 23.20]` passes through the center of the tackle box (`[50.15, 23.73]`).
- Measured penetration in empirical test harness:
  - During `WALK_TO_PEE` ($t = 1578..1616$, 39 ticks): `f.P.i \in [49.873, 50.428]`, `f.P.j \in [23.570, 23.857]`, where `districtBlocked(f.P.i, f.P.j) === true`.
  - During `WALK_BACK` ($t = 2291..2329$, 39 ticks): `f.P.i \in [49.873, 50.428]`, `f.P.j \in [23.570, 23.857]`, where `districtBlocked(f.P.i, f.P.j) === true`.
  - Total penetration: **78 ticks** per period. The fisherman walks through the solid wooden tackle box on both trips.

---

### 1.4 Defect 3: Solid Obstacle Collision Penetration & Ground Clipping (Cat Crate)
- In `src/port-district.js:47`:
  `cat_crate: { i: 45.40, j: 20.60, w: .8, d: .8, h: 4.5 }`
- In `src/port-district.js:62`, registered in `LIFE_BLOCKS`:
  `[45.0, 20.2, 45.8, 21.0]` (solid obstacle, height $h = 4.5$, deck floor at $z = \text{DECK\_Z} = 0.25$, top at $z = 4.75$).
- In `src/port-life.js:381-382` (`SPRINT`):
  ```js
  pos = [lerp(CAT_STEAL_SPOT.i, CAT_CRATE.i, ease(u)), lerp(CAT_STEAL_SPOT.j, CAT_CRATE.j, ease(u))];
  z = u < .8 ? DECK_Z : lerp(DECK_Z, DECK_Z + CAT_CRATE.h, ease((u - .8) / .2));
  ```
  At $u = 0.81$ ($t = 1865$), cat enters crate boundary ($i = 45.769 \le 45.80, j = 20.936 \le 21.0$), but its elevation is $z = 0.283$. For 4 ticks ($t = 1865..1868$), the cat penetrates inside the solid crate wood at floor level.
- In `src/port-life.js:392-395` (`RETURN`):
  ```js
  const v = Math.max(0, (u - .15) / .85);
  pos = [lerp(CAT_CRATE.i, CAT_SPOT.i, ease(v)), lerp(CAT_CRATE.j, CAT_SPOT.j, ease(v))];
  z = u < .15 ? lerp(DECK_Z + CAT_CRATE.h, DECK_Z, ease(u / .15)) : DECK_Z;
  ```
  For $u < 0.15$ ($t = 2164..2187$), $v = 0$, so the cat position is pinned at the crate center `[45.40, 20.60]`, while $z$ drops from $4.75$ down to $0.25$.
  Then from $u = 0.15$ to $u = 0.381$ ($t = 2188..2225$, 38 ticks), the cat walks at deck level $z = 0.25$ from the crate center through the interior of the solid crate until exiting at $i = 45.80$.
  Total penetration: **42 ticks** during `RETURN` + **4 ticks** during `SPRINT` = **46 ticks** inside the solid crate at floor level.

---

### 1.5 Verified Areas (Sound Mechanics)
- Multi-cycle closed determinism: `bucketAt(t).count === bucketAt(t + N * T).count` verified for $N \in [1..5\times 10^6]$ full periods.
- Discrete inventory bounds: `count \in {2, 3}` strictly conserved.
- Pure canvas rendering: zero audio triggers or Web Audio calls.
- Deck outer boundary containment: both actors stay inside `DISTRICT.pier = [42.2, 13, 51.8, 25]` (`portSurface === 'pier'`).
- Opportunity trigger: cat strictly remains in `WATCH` state while fisherman fishes.
- Ballistic urine physics: launches from pelvis, crests east railing ($z = 6.5$), impacts river at $WL = -7.00$, $i = 52.95 > 51.80$.

---

## 2. Logic Chain

1. **Mission Contract Violation**:
   - The mission explicitly mandates:
     *"3. Spatial bounds & collisions: verify that all actor positions (fisherman, cat) remain strictly inside the walkable pier deck boundaries defined in `DISTRICT.pier` and never penetrate solid obstacle blocks."*
   - Observation 1.3 proves that the fisherman enters `TACKLE_BOX_BLOCK` (`districtBlocked === true`) for 78 ticks per cycle.
   - Observation 1.4 proves that the cat enters `CAT_CRATE_BLOCK` at floor level ($z = 0.25..0.28$) for 46 ticks per cycle.
   - Therefore, the requirement that actors "never penetrate solid obstacle blocks" is violated.

2. **Kinematics Numerical Corruption**:
   - Observation 1.2 demonstrates that `src/port-life.js:287, 306` passes `undefined` into `frameAt` because `w.P` does not have an `.a` field.
   - This corrupts `f.P.fi` and `f.P.fj` to `NaN`, which cascades to `f.handR` and joint transformations during all walking ticks (480 ticks / cycle).
   - The Playwright browser test missed this because `tests/port-life-browser.mjs` only sampled `WAIT`, `REEL`, `DROP_FISH`, and `PEE` phases, completely omitting `WALK_TO_PEE` and `WALK_BACK`.

3. **Rejection Justification**:
   - Both collision penetrations and kinematics `NaN` corruption are verifiable, deterministic bugs in the new implementation.
   - In accordance with empirical challenger standards, the implementation cannot be approved in this state.

---

## 3. Caveats

- The core routine structure, timing synchrony ($T = 2564$), inventory state conservation, ballistic stream visual physics, and cat opportunity trigger are well-designed and mathematically sound.
- The bugs are localized to waypoint routing (`PATH_TO_PEE`), cat leaping/landing trajectory (`SPRINT`/`RETURN` vertical vs horizontal interpolation), and frame reconstruction in `walkStep` callers.
- In accordance with challenger constraints ("Review-only — do NOT modify implementation code"), no production code was modified by this agent.

---

## 4. Conclusion

**Verdict: REJECT**

The worker must address the following issues:
1. **Fix frame orientation in `fisherRod(t)`**:
   In `src/port-life.js:286-287` and `305-306`, do not access `w.P.a`. Either pass `frameAt(w.P.i, w.P.j, Math.atan2(w.P.fj, w.P.fi), DECK_Z)` or set `w.P.z0 = DECK_Z; P = w.P;`.
2. **Reroute `PATH_TO_PEE` and `PATH_BACK` around tackle box**:
   Add a clearance waypoint (e.g. `[49.70, 23.40]` or routing around $j \le 23.45$ or $i \ge 50.50$) so the path stays clear of `[49.87, 23.55, 50.43, 23.91]`.
3. **Correct cat leap/drop kinematics around crate**:
   In `SPRINT`, interpolate $z$ upward before entering the crate footprint ($u \ge 0.65$ with parabolic leap). In `RETURN`, hop horizontally outward to ground level outside the crate footprint before walking.

---

## 5. Verification Method

To independently reproduce all defects and verify findings:

1. **Run the Empirical Stress Harness**:
   ```bash
   node scratch/adversarial_fisherman_stress.mjs
   ```
   *Observed result*: Harness halts with exit code 1, reporting:
   - 480 ticks with `P.fi: NaN, P.fj: NaN`
   - 480 ticks with `handR: [NaN, NaN, 7.85]`
   - 78 ticks of fisherman tackle box penetration
   - 46 ticks of cat crate ground-level penetration

2. **Inspect Direct Coordinate Output**:
   ```bash
   node -e "import { fisherAt } from './src/port-life.js'; console.log(fisherAt(1578).P);"
   ```
   *Expected output*: `P: { i: 49.87..., j: 23.85..., fi: NaN, fj: NaN, z0: 0.25 }`.

3. **Check Tackle Box Collision**:
   ```bash
   node -e "import { fisherAt } from './src/port-life.js'; import { districtBlocked } from './src/port-district.js'; const f = fisherAt(1597); console.log(f.P, 'blocked:', districtBlocked(f.P.i, f.P.j));"
   ```
   *Expected output*: `blocked: true`.
