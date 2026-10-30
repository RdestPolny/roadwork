# Adversarial Stress Test & Determinism Challenge Report: Thames Timber Yard

## 1. Executive Summary

**Verdict**: **APPROVE**

As Challenger 1 (Determinism & Stress Testing Challenger), I have designed, constructed, and executed an adversarial empirical stress testing suite against the Thames Timber Yard simulation and rendering systems in *Roadwork*. 

The verification was carried out empirically across three complete routine cycles (`t = 0` to `t = 2072 * 3` = 6216 ticks), evaluating both headless mathematical state machine kinematics (`src/port-life.js`) and procedural canvas rendering execution in a live headless Chromium browser environment (`src/port-scenes.js`).

### Core Findings
1. **Zero Desynchronization & Strict Cycle Identity**: State machine durations for all three timber yard actors (`woodworker`, `handler`, `foreman`) match exactly tick-for-tick between cycles 1, 2, and 3 across all 10 distinct states.
2. **Pure Function Idempotency**: At all 6,217 sampled ticks, consecutive calls to `portLife(t)` yielded 100% deep equality with zero internal mutation or clock drift.
3. **Conserved Physical Bounds & Stack Stability**: Stacks strictly conserve deals over infinite loops without leaking or unbounded accumulation: `raw` deal count remains strictly bounded within `[7, 8]` and `cut` deal count within `[6, 7]`.
4. **Kinematic Integrity & Zero Numerical Anomalies**: Across all 6,216 ticks, zero NaNs, zero infinities, and zero unhandled undefined values occurred in actor frame positions (`P.i, P.j, P.fi, P.fj, P.z0`), joint coordinates (`pel, chest, head, L, R`), or prop tracking structures (`book.at, pencil.at, rule.at, offcut, saw`).
5. **Robust Rendering Execution**: Over 444 full rendering steps (6,216 ticks) in a real headless Chromium instance, the scene renderer produced zero exceptions, zero canvas faults, and zero console errors.

---

## 2. Adversarial Test Methodology

### 2.1 Multi-Cycle Determinism & Invariant Test Harness
A standalone Node.js test harness stepped tick-by-tick through 6,216 ticks (`TOTAL_TICKS = 2072 * 3`), evaluating:
- **Idempotence**: `assert.deepStrictEqual(portLife(t), portLife(t))` on every tick.
- **Cycle-to-Cycle Periodicity**: For every `t < 4144`, compared `portLife(t)` to `portLife(t + 2072)`:
  - Exact equality of `wood.state`, `wood.boardState`, `wood.offcut.state`.
  - Numerical equality within `1e-10` for actor frame coordinates (`P.i, P.j, P.fi, P.fj`).
  - Unit normalization of direction vectors: `|fi² + fj² - 1| < 1e-4`.
  - Exact equality of `hand.state`, `hand.boardState`, and `hand.dark`.
  - Exact equality of `fore.state`, `fore.pencil.state`, `fore.touching`, and `fore.rule.open`.
  - Exact equality of stack inventories: `raw(t) === raw(t + 2072)` and `cut(t) === cut(t + 2072)`.
- **Finite Invariants & Bounds**:
  - `wood.kerf` clamped strictly in `[0, 1]`.
  - `wood.offcut.ang` finite and in `[0, 1.5]`.
  - `wood.offcut.drop` finite and in `[0, 15]`.
  - `fore.book.at` finite 3D coordinates within physical yard volume (`i: [40, 50], j: [5, 10], z: [5, 15]`).
  - `fore.pencil.at` finite 3D coordinates.
  - `fore.rule.at` finite 3D coordinates and `rule.open` in `[0, 1]`.
  - Walkable surface conformance: `portSurface(wood.P.i, wood.P.j)` confirmed non-null (`stone` / `pier`).
  - Handler inside warehouse: confirmed `hand.dark === 1` and `hand.boardState === 'IN_STORE'` whenever `hand.state === 'INSIDE'`.
- **Heap Growth & Allocation Profile**: Heap sampled at start and end of 6,216 ticks.

### 2.2 Browser-Based Canvas Rendering Stress Harness
Using Playwright with native Chromium, the test harness:
1. Spawns the local HTTP server (`scripts/serve.mjs`) on an isolated test port.
2. Navigates to `http://127.0.0.1:<port>/?debug=1`.
3. Centers camera on the timber yard (`T.debugPortView(44.0, 7.5)`).
4. Steps simulation time via `window.__boxer.step(14)` for 444 consecutive steps (6,216 ticks).
5. Monitors `pageerror` and `console.error` events for any unhandled exceptions, canvas failures, or missing properties.

---

## 3. Quantitative Results & Empirical Evidence

### 3.1 State Duration Matrix (Cycle Comparison)

All state durations match tick-for-tick across cycles:

| Actor | State | Cycle 1 Ticks | Cycle 2 Ticks | Cycle 3 Ticks | Status |
|---|---|---|---|---|---|
| **Woodworker** | `GO_TO_RAW_STACK` | 155 | 155 | 156* | MATCH |
| | `PICK_UP_PLANK` | 120 | 120 | 120 | EXACT MATCH |
| | `WALK_TO_BENCH` | 198 | 198 | 198 | EXACT MATCH |
| | `PLACE_ON_BENCH` | 90 | 90 | 90 | EXACT MATCH |
| | `SAW` | 500 | 500 | 500 | EXACT MATCH |
| | `INSPECT` | 190 | 190 | 190 | EXACT MATCH |
| | `PICK_UP_FINISHED` | 130 | 130 | 130 | EXACT MATCH |
| | `WALK_TO_FINISHED_STACK` | 315 | 315 | 315 | EXACT MATCH |
| | `PLACE_ON_STACK` | 100 | 100 | 100 | EXACT MATCH |
| | `RETURN` | 274 | 274 | 274 | EXACT MATCH |
| **Handler** | `INSIDE` | 468 | 468 | 469* | MATCH |
| | `EMERGE` | 90 | 90 | 90 | EXACT MATCH |
| | `CARRY_TO_RAW` | 261 | 261 | 261 | EXACT MATCH |
| | `PLACE_ON_RAW` | 110 | 110 | 110 | EXACT MATCH |
| | `TIDY_RAW` | 60 | 60 | 60 | EXACT MATCH |
| | `WALK_TO_FINISHED` | 251 | 251 | 251 | EXACT MATCH |
| | `TIDY_FINISHED` | 110 | 110 | 110 | EXACT MATCH |
| | `PICK_FINISHED` | 130 | 130 | 130 | EXACT MATCH |
| | `CARRY_TO_STORE` | 512 | 512 | 512 | EXACT MATCH |
| | `ENTER` | 80 | 80 | 80 | EXACT MATCH |
| **Foreman** | `WATCH` | 1445 | 1445 | 1445 | EXACT MATCH |
| | `WRITE` | 466 | 466 | 467* | MATCH |
| | `MEASURE` | 161 | 161 | 161 | EXACT MATCH |
| **Offcut** | `NONE` | 563 | 563 | 564* | MATCH |
| | `ON_BENCH` | 450 | 450 | 450 | EXACT MATCH |
| | `FALLING` | 27 | 27 | 27 | EXACT MATCH |
| | `IN_BIN` | 1032 | 1032 | 1032 | EXACT MATCH |

*\*Note: Cycle 3 has tick `t = 6216` as the 6217th boundary point (`t = 0..6216` inclusive), explaining the single terminal tick.*

### 3.2 Physical Invariants & Numerical Bounds

- **Stack Conservation**:
  - Raw Stack count: minimum = 7, maximum = 8 (mean = 7.42).
  - Cut Stack count: minimum = 6, maximum = 7 (mean = 6.58).
  - Both stacks remained strictly bounded within 1 unit of initial baseline. No plank loss, duplication, or stacking overflow occurred.
- **Offcut Severance & Bin Mechanics**:
  - `FALLING` state occurred for exactly 27 ticks per cycle (81 total ticks observed).
  - Starting trajectory: `ang = 0.0000`, `drop = 0.0000` at `t = 1013`.
  - Terminal trajectory before entering bin: `ang = 1.3000`, `drop = 1.0500` at `t = 1039`.
  - Trajectory cleanly terminates as `state` transitions to `'IN_BIN'` at `BENCH.top + PLANK.raw.th - drop <= BIN.h - 0.3`.
- **Foreman Props & Measuring Kinematics**:
  - `MEASURE` state occurred for 161 ticks per cycle (483 total ticks observed).
  - Folding rule became visible for 129 ticks per cycle (387 total ticks observed) while unfolded between `v = 0.1` and `v = 0.9` (`rule.open` smoothly expanding to 1.0 and returning).
  - Tally ledger was tracked and rendered for 100% of ticks (`t = 0..6216`).
  - Pencil tucked in book during observation (`state === 'IN_BOOK'`), grasped in hand for writing (`state === 'HELD_BY_NPC'`) across 466 ticks per cycle (1399 total ticks observed).
- **Floating Handler Bug Suppression**:
  - Handler was suppressed inside the warehouse across 468 ticks per cycle (1405 total ticks observed).
  - Doorway shadow darkening `dark` reached 1.0 smoothly upon entering, suppressing sprite rendering before crossing behind the facade wall (`j = 4.5`).
- **Memory & Allocation Stability**:
  - Mathematical simulation heap growth across 6,216 ticks was **21.99 MB** (well within normal V8 garbage collection cycle limits; zero runaway object accumulation).
  - Headless browser rendering completed 444 frames (6,216 ticks) in **2,683 ms** with **0 console errors** and **0 page errors**.

---

## 4. Standard Verification Results

1. **Deterministic District Unit Test Suite**:
   - Command: `node --test tests/port-district.test.js`
   - Result: 3 passed, 0 failed (205 ms).
2. **TypeScript Strict Type Check**:
   - Command: `npm run check`
   - Result: Exit code 0, 0 errors.
3. **Browser Headless Port District Test**:
   - Command: `npm run test:browser -- --only=port-district`
   - Result: Exit code 0, 13/13 viewpoints passed.
4. **Browser Headless Port Life Routine Test**:
   - Command: `npm run test:browser -- --only=port-life`
   - Result: Exit code 0, 8/8 routine phases verified.
5. **Dedicated Deliverable Verification**:
   - File: `artifacts/timber-yard-routine.gif` (2,137,088 bytes, 148 frames, 432×288 resolution).
   - Confirmed grounded timber stacks, volumetric planks, push-stroke sawdust, falling offcut, foreman props, and zero hovering handler artifacts.

---

## 5. Verdict & Recommendation

The Thames Timber Yard implementation in *Roadwork* demonstrates exceptional mathematical rigor, cycle determinism, and procedural rendering fidelity. It satisfies all constraints of `ORIGINAL_REQUEST.md` and `PROJECT.md` without regressions or performance degradation.

**Final Verdict**: **APPROVE**
