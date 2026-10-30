## 2026-10-30T09:35:40Z
You are worker_fisherman_iter2, a remediation and QA engineer.
Working directory: /Users/marcinek/Documents/Roadwork/.agents/teamwork/worker_fisherman_iter2/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read the following authoritative files before starting work:
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/marcinek/Documents/Roadwork/PROJECT.md
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/orchestrator/handoff.md
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/orchestrator/GATE_STATUS.md
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/challenger_fisherman_1/handoff.md
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/challenger_fisherman_2/handoff.md
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/reviewer_fisherman_1/handoff.md

Your exclusive write ownership:
- `src/port-life.js`
- `src/port-scenes.js`
- `tests/port-fisherman.test.js`
- `tests/port-life-browser.mjs`

Your remediation mission:
Fix the 5 concrete defects identified during Gate 1:
1. **Kinematics Frame NaN Corruption in `src/port-life.js:287` and `306`**:
   `P = frameAt(w.P.i, w.P.j, w.P.a, DECK_Z)` passes `w.P.a === undefined` because `w.P` is already a `Frame` object from `walkStep`. This causes `fi: NaN, fj: NaN` and corrupts `handR` to `[NaN, NaN, 7.85]` for 480 ticks during `WALK_TO_PEE` and `WALK_BACK`.
   Fix: Set `w.P.z0 = DECK_Z; P = w.P;` so the existing valid frame orientation is preserved.
2. **Solid Obstacle Penetration — Tackle Box**:
   In `src/port-life.js`, `PATH_TO_PEE` and `PATH_BACK` straight-line segment cuts directly through the tackle box `[49.87, 23.55, 50.43, 23.91]` (`LIFE_BLOCKS[3]`).
   Fix: Add waypoint routing around the tackle box: from fishing spot `[49.60, 24.05]` step west/north to `[49.40, 23.50]`, then north to `[49.40, 21.80]`, then east along clear deck to pee spot `[51.20, 21.80]`.
3. **Solid Obstacle Penetration — Shipping Crate**:
   During `SPRINT`, the cat enters the horizontal footprint of crate `[45.0, 20.2, 45.8, 21.0]` at ground level before ascending to crate top (`z = 4.75`). During `RETURN`, the cat drops to deck level inside the crate interior volume and walks 38 ticks before exiting.
   Fix: Interpolate elevation so the cat leaps onto the crate top before crossing into the crate boundary, and leaps off the crate edge down to deck level before walking back.
4. **Bucket Inventory State Triggers**:
   In `src/port-life.js` (`bucketAt`), avoid magic tick numbers `1441` and `1752`. Use phase boundaries or clean named constants.
5. **Update Test Coverage**:
   In `tests/port-fisherman.test.js`, add assertions verifying:
   - `P.fi`, `P.fj`, and `handR` are finite for every tick in `0..2563`.
   - `districtBlocked(P.i, P.j)` is strictly false during the entire walking paths.
   - `bucket.count` transitions cleanly between 2 and 3 without inventory drift.

Verification:
Run the following test commands and document results in `handoff.md`:
- `node --test tests/port-district.test.js tests/port-fisherman.test.js`
- `npm run check`
- `node scratch/adversarial_fisherman_stress.mjs` (ensure Challenger 1's stress test now passes 100%!)
- `npm run test:browser -- --only=life`
