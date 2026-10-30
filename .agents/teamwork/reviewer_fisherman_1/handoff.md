# Review & Adversarial Challenge Report: Fisherman Pier Routine, Fish Bucket & Cat

**Reviewer / Critic**: `reviewer_fisherman_1`  
**Parent Agent**: `8fdce49b-1206-4018-a81b-dd7177d21a35`  
**Date**: 2026-10-30  
**Verdict**: **`REQUEST_CHANGES`**  
**Overall Risk Assessment**: **HIGH**

---

## 1. Observation

### 1.1 Independent Build and Test Execution
Commands executed independently in the workspace:
1. `npm run check`:
   - Output: `tsc --noEmit` exited with code 0 (0 TypeScript errors).
2. `node --test tests/port-district.test.js tests/port-fisherman.test.js`:
   - Output: 7/7 tests passed in 265ms (exit code 0).
3. `npm run test:browser -- --only=life`:
   - Output: `PASS Thames life: fixed routine phases` (exit code 0).
4. `npm run test:browser -- --only=district`:
   - Output: `PASS Thames district: 13 native exploration, NPC, brawl and story captures` (exit code 0).

### 1.2 Inspection of Implementation Code

#### 1.2.1 Critical Numerical Corruption: `NaN` Heading Frame in `WALK_TO_PEE` & `WALK_BACK`
In `src/port-life.js`:
- Lines 58:
  ```javascript
  export const frameAt=(i,j,a,z0=0)=>({i,j,fi:Math.cos(a),fj:Math.sin(a),z0});
  ```
- Lines 145–149:
  ```javascript
  function walkStep(S,pts,a0,a1,stop){
    const v=clamp01(S.local/(S.d-stop)), w=walkAlong(pts,v);
    const a=S.local<16?turn(a0,w.a,S.local/16):v>=1?turn(w.a,a1,(S.local-(S.d-stop))/stop):w.a;
    const calm=Math.max(1-clamp01(S.local/20),clamp01((S.local-(S.d-stop-20))/20));
    return {P:frameAt(w.i,w.j,a),walk:v<1,g:w.d/.69,calm};
  }
  ```
- Lines 285–287 (`WALK_TO_PEE`):
  ```javascript
  } else if(S.s==='WALK_TO_PEE'){
    const w=walkStep(S,PATH_TO_PEE,FA.a,0.0,30);
    P=frameAt(w.P.i,w.P.j,w.P.a,DECK_Z);
  ```
- Lines 304–306 (`WALK_BACK`):
  ```javascript
  } else if(S.s==='WALK_BACK'){
    const w=walkStep(S,PATH_BACK,0.0,FA.a,30);
    P=frameAt(w.P.i,w.P.j,w.P.a,DECK_Z);
  ```
Notice that `w.P` is returned by `walkStep` as an object `{ i, j, fi, fj, z0 }`. It does NOT have property `a` (`w.P.a === undefined`).
Evaluating `frameAt(w.P.i, w.P.j, undefined, DECK_Z)` computes:
`fi: Math.cos(undefined)` -> `NaN`  
`fj: Math.sin(undefined)` -> `NaN`
Consequently:
- For all 240 ticks of `WALK_TO_PEE` (ticks 1554–1794) and all 240 ticks of `WALK_BACK` (ticks 2154–2394) — total 480 ticks per cycle:
  - `fisherAt(t).P.fi === NaN`
  - `fisherAt(t).P.fj === NaN`
  - In line 468–469:
    ```javascript
    const world=(p)=>toWorld(P,p);
    ```
    Where `toWorld` (line 60):
    ```javascript
    export const toWorld=(P,p)=>[P.i+(p[0]*P.fi-p[1]*P.fj)/UNIT,P.j+(p[0]*P.fj+p[1]*P.fi)/UNIT,p[2]+P.z0];
    ```
    Evaluating `toWorld(P, free)` yields `fisherAt(t).handR = [NaN, NaN, 7.85]`.

#### 1.2.2 Obstacle Collision: Fisherman Penetrates Solid Tackle Box
In `src/port-district.js`:
- Line 44: `fisher_box: { i: 50.15, j: 23.73, w: .55, d: .36, h: 1.7 }`
- Line 60: `LIFE_BLOCKS` includes tackle box footprint: `[49.87, 23.55, 50.43, 23.91]`
In `src/port-life.js`:
- Line 177: `FA = ANCHORS.pier_fishing_spot` (`i = 49.6, j = 24.05`)
- Line 186: `const PATH_TO_PEE=[[FA.i,FA.j],[50.80,23.20],[PEE_SPOT.i,PEE_SPOT.j]];`
- Line 187: `const PATH_BACK=[[PEE_SPOT.i,PEE_SPOT.j],[50.80,23.20],[FA.i,FA.j]];`
Interpolation along segment `[49.6, 24.05]` to `[50.80, 23.20]`:
At `i = 50.15`, `j = 24.05 + (23.20 - 24.05) * (50.15 - 49.6) / (50.80 - 49.6) = 23.66`.
Coordinates `[50.15, 23.66]` fall directly inside `[49.87, 23.55, 50.43, 23.91]`.
Empirical evaluation shows the fisherman penetrates the solid tackle box for 78 ticks (39 ticks walking to pee, 39 ticks walking back).

#### 1.2.3 Obstacle Collision: Cat Penetrates Wooden Crate Footprint at Deck Elevation
In `src/port-district.js`:
- Line 47: `cat_crate: { i: 45.40, j: 20.60, w: .8, d: .8, h: 4.5 }`
- Line 62: `LIFE_BLOCKS` includes `cat_crate` collision footprint: `[45.0, 20.2, 45.8, 21.0]`
In `src/port-life.js`:
- Lines 380–383 (`SPRINT`):
  ```javascript
  pos=[lerp(CAT_STEAL_SPOT.i,CAT_CRATE.i,ease(u)),lerp(CAT_STEAL_SPOT.j,CAT_CRATE.j,ease(u))];
  z=u<.8?DECK_Z:lerp(DECK_Z,DECK_Z+CAT_CRATE.h,ease((u-.8)/.2));
  ```
The cat's horizontal position enters `[45.0, 20.2, 45.8, 21.0]` at `u = 0.81` (`pos = [45.768, 20.935]`), but vertical elevation `z` is delayed until `u >= 0.8` and remains at `z = 0.28` (deck is 0.25). The cat moves horizontally into the interior volume of the solid wooden shipping crate for 46 ticks before leaping upwards.

#### 1.2.4 Hardcoded Magic Numbers in `bucketAt(t)`
In `src/port-life.js`:
- Lines 337–346:
  ```javascript
  export function bucketAt(t){
    const t_cycle=((t%FISH.T)+FISH.T)%FISH.T;
    // DROP_FISH at ~1441, cat theft at ~1752
    const count=(t_cycle>=1441&&t_cycle<1752)?3:2;
    const dropSplash=(t_cycle>=1441&&t_cycle<1466)?(t_cycle-1441):-1;
    const stealSplash=(t_cycle>=1725&&t_cycle<1750)?(t_cycle-1725):-1;
    const splash=Math.max(dropSplash,stealSplash);
    const flop=(t_cycle%80)<18?(t_cycle%80)/18:0;
    return {i:BUCKET.i,j:BUCKET.j,r:BUCKET.r,h:BUCKET.h,z:DECK_Z,count,splash,flop};
  }
  ```
Instead of evaluating the actual state machine states of `FISH` and `CAT` (e.g. comparing to `stepAt(FISH, t)` and `stepAt(CAT, t)` as done in `levels(t)` in the timber yard), `bucketAt(t)` uses hardcoded integer constants `1441` and `1752`. If any animation duration in `FISH_STEPS` or `CAT_STEPS` is modified, the bucket count desynchronizes from the visual drop and theft animations.

#### 1.2.5 Gaps in Test Suite Coverage
In `tests/port-fisherman.test.js`:
- Lines 15–16 only check `Number.isFinite(f.P.i)` and `Number.isFinite(f.P.j)`, failing to assert `f.P.fi`, `f.P.fj`, or `f.handR`.
In `tests/port-life-browser.mjs`:
- Line 35 queries `bucketCount: life.bucket.count`, but lines 40–50 make NO assertions on `bucketCount` in any scene.
- The `scenes` list in lines 8–20 includes `WAIT`, `REEL`, `DROP_FISH`, `PEE`, `STEAL`, `EAT`, but completely omits `WALK_TO_PEE` and `WALK_BACK`, masking the 480-tick `NaN` corruption in the browser harness.

---

## 2. Logic Chain

1. **Root Cause of `NaN` Frame**:
   - `walkStep` returns `{ P: frameAt(w.i, w.j, a), walk, g, calm }`.
   - `frameAt` creates an object with keys `{ i, j, fi, fj, z0 }`.
   - In lines 287 and 306, the code called `frameAt(w.P.i, w.P.j, w.P.a, DECK_Z)`.
   - Because `w.P.a` is `undefined`, `Math.cos(undefined)` and `Math.sin(undefined)` evaluate to `NaN`.
   - This corrupts `P.fi` and `P.fj` to `NaN` for all 480 ticks of the walking animations.
   - Any calculation depending on `toWorld(P, ...)` (such as `handR`) evaluates to `NaN`.

2. **Self-Certifying Test Blindspot**:
   - `tests/port-fisherman.test.js` only checked `portSurface(f.P.i, f.P.j)` and `Number.isFinite(f.rod.tip[0])`. Because the rod is propped during the break, `rod.tip` used fixed constants, and `f.P.i` and `f.P.j` were finite numbers.
   - Neither the unit tests nor `tests/port-life-browser.mjs` checked `f.P.fi`, `f.P.fj`, or `f.handR`.
   - Therefore, the test suite passed 100% green while masking a persistent runtime numerical corruption.

3. **Collision Disregard**:
   - `port-district.js` explicitly defines `fisher_box` and `cat_crate` in `LIFE_BLOCKS` to prevent walking through them.
   - However, the scripted kinematics path in `port-life.js` routes straight through the tackle box and directly into the side of the crate.

4. **Verdict Determination**:
   - A runtime numerical corruption producing `NaN` in actor frame orientation and hand coordinates for 480 ticks per cycle is a critical flaw.
   - Work with corrupted coordinates and unverified test gaps cannot be approved.
   - Therefore, the required verdict is **`REQUEST_CHANGES`**.

---

## 3. Findings

### [Critical] Finding 1: `NaN` Heading Frame (`fi`/`fj`) and `handR` in `WALK_TO_PEE` and `WALK_BACK`
- **What**: Fisherman's frame orientation `P.fi` and `P.fj`, and right hand coordinate `handR` are corrupted with `NaN` for 480 ticks every period.
- **Where**: `src/port-life.js:287` and `src/port-life.js:306`.
- **Why**: `w.P` returned by `walkStep` is already a `Frame` without property `.a`. Accessing `w.P.a` yields `undefined`, making `Math.cos(undefined) === NaN`.
- **Suggestion**:
  In `walkStep`, either return `a` in the result object (`return { P: frameAt(w.i, w.j, a, DECK_Z), a, ... }`) or use `P = { ...w.P, z0: DECK_Z }`.

### [Major] Finding 2: Fisherman Waypoint Trajectory Penetrates Solid Tackle Box
- **What**: Fisherman walks directly through `ANCHORS.fisher_box` (`[49.87, 23.55, 50.43, 23.91]`) for 78 ticks per cycle.
- **Where**: `src/port-life.js:186,187` (`PATH_TO_PEE` and `PATH_BACK`).
- **Why**: Straight-line segment between `pier_fishing_spot` `[49.6, 24.05]` and waypoint `[50.80, 23.20]` intersects the tackle box obstacle.
- **Suggestion**:
  Insert an evasion waypoint stepping slightly south or north of the tackle box (e.g. `[49.60, 24.05] -> [49.70, 24.60] -> [50.80, 23.20]`).

### [Major] Finding 3: Cat Sprint Trajectory Penetrates Crate Geometry at Ground Elevation
- **What**: Cat enters the interior footprint of the solid wooden shipping crate `[45.0, 20.2, 45.8, 21.0]` at deck elevation (`z = 0.28`) for 46 ticks before jumping.
- **Where**: `src/port-life.js:381–382` (`catAt` state `'SPRINT'`).
- **Why**: Horizontal interpolation reaches the crate centre at `u = 0.81`, but vertical elevation is delayed until `u >= 0.80` with smooth easing.
- **Suggestion**:
  Begin the upward arc earlier or end the horizontal sprint at the base of the crate before leaping onto the top.

### [Major] Finding 4: Fragile Hardcoded Tick Constants in `bucketAt(t)`
- **What**: `bucketAt(t)` determines fish count by checking hardcoded tick ranges `t_cycle >= 1441 && t_cycle < 1752` rather than state machine state.
- **Where**: `src/port-life.js:337–346`.
- **Why**: Any timing adjustment to `FISH_STEPS` or `CAT_STEPS` will cause bucket count and splash animations to desynchronize from the visual character animations.
- **Suggestion**:
  Bind `bucketAt(t)` to `stepAt(FISH, t)` and `stepAt(CAT, t)`, or calculate the transition tick dynamically from `phaseTime('fisher', 'DROP_FISH')` and `phaseTime('cat', 'STEAL')`.

### [Minor] Finding 5: Test Gaps in `port-fisherman.test.js` and `port-life-browser.mjs`
- **What**: Unit tests do not assert `f.P.fi`, `f.P.fj`, or `f.handR`. Browser test queries `bucketCount` without asserting, and omits `WALK_TO_PEE`/`WALK_BACK` from capture scenes.
- **Where**: `tests/port-fisherman.test.js:15` and `tests/port-life-browser.mjs:35,40-50`.
- **Why**: Allowed the `NaN` corruption to slip through automated verification.
- **Suggestion**:
  Add assertions in `tests/port-fisherman.test.js` that `Number.isFinite(f.P.fi)` and `Number.isFinite(f.handR[0])`. In `tests/port-life-browser.mjs`, add assertions for `bucketCount` and add a capture scene for `WALK_TO_PEE`.

---

## 4. Verified Claims

- Closed-cycle period equality `LOOPS.FISH.T === 2564` and `LOOPS.CAT.T === 2564` → verified via headless test → **PASS**.
- Closed-cycle bucket count bounds (`count in {2, 3}`) over 25,640 consecutive ticks → verified via empirical test → **PASS**.
- Cat stays in `'WATCH'` during fisherman's normal fishing loop (`CAST`, `WAIT`, `NIBBLE`, `REEL`) → verified via empirical test → **PASS**.
- Ballistic pee stream trajectory starts at pelvis elevation, arcs over east rail (`51.8`), and impacts at Thames low waterline `-7.0` → verified via simulation inspection and PNG review → **PASS**.
- Zero audio dependencies introduced → verified via codebase grep → **PASS**.

---

## 5. Caveats

- No caveats. The review independently evaluated the complete code diffs, executed all unit and browser test targets, rendered visual artifacts, and performed empirical adversarial stress-testing.

---

## 6. Conclusion

The implementation represents substantial, high-quality isometric rendering and animation work, with closed-cycle inventory determinism and authentic visual styling. However, due to a confirmed **Critical defect causing `NaN` heading frame values across 480 ticks per cycle** and **Major physical collision penetrations**, the submission cannot be approved in its current state.

**Verdict**: **`REQUEST_CHANGES`**

Required fixes for re-review:
1. Fix `w.P.a` undefined bug in `src/port-life.js:287` and `src/port-life.js:306` so `P.fi`, `P.fj`, and `handR` remain finite numbers.
2. Adjust `PATH_TO_PEE` and `PATH_BACK` waypoints in `src/port-life.js:186-187` to step around the solid tackle box `[49.87, 23.55, 50.43, 23.91]`.
3. Adjust `catAt` sprint trajectory in `src/port-life.js:381-382` so the cat does not penetrate inside the solid crate footprint at deck elevation.
4. Replace magic numbers `1441` and `1752` in `bucketAt(t)` with dynamic state-derived references.
5. Enhance unit and browser tests to assert finite frame coordinates and verify bucket counts.

---

## 7. Verification Method

To reproduce and verify these findings independently:

1. **Verify `NaN` Frame Defect**:
   Run the following headless Node snippet:
   ```bash
   node -e "import('./src/port-life.js').then(m => {
     const f = m.fisherAt(1554);
     console.log('t=1554 state:', f.state, 'fi:', f.P.fi, 'fj:', f.P.fj, 'handR:', f.handR);
     if (Number.isNaN(f.P.fi)) console.error('CONFIRMED: P.fi is NaN');
   })"
   ```
   *Expected output*: Prints `fi: NaN, fj: NaN` and confirms corruption.

2. **Verify Tackle Box Penetration**:
   Run the following headless Node snippet:
   ```bash
   node -e "import('./src/port-life.js').then(m => {
     const f = m.fisherAt(1578);
     console.log('t=1578 pos:', f.P.i, f.P.j, 'in box [49.87, 23.55, 50.43, 23.91]:',
       f.P.i >= 49.87 && f.P.i <= 50.43 && f.P.j >= 23.55 && f.P.j <= 23.91);
   })"
   ```
   *Expected output*: Confirms fisherman position `[49.873, 23.857]` is inside the tackle box.

3. **Verify Existing Tests Still Pass**:
   ```bash
   npm run check
   node --test tests/port-district.test.js tests/port-fisherman.test.js
   npm run test:browser -- --only=life
   ```
