# Dispatch: Milestone 2 — Implementation of Scene, Asset, and Routine Enhancements

## Mission
Implement the planned scene, asset, and routine enhancements for the Thames timber yard area in Roadwork, fixing all visual glitches, enriching object details, and connecting unrendered props.

## Authoritative Inputs
- User Request: /Users/marcinek/Documents/Roadwork/.agents/teamwork/ORIGINAL_REQUEST.md
- Audit & Assessment Report: /Users/marcinek/Documents/Roadwork/.agents/teamwork/audit_report.md
- Project Scope: /Users/marcinek/Documents/Roadwork/PROJECT.md
- Codebase guidelines: /Users/marcinek/Documents/Roadwork/AGENTS.md

## File Ownership
You exclusively own and may edit:
- `src/port-scenes.js`
- `src/port-life.js`
- `src/port-extension.js`
- `src/port-details.js`
- `scripts/record-timber-gif.mjs`

Do NOT touch other files unless strictly necessary.

## Implementation Tasks
1. **Fix Floating Handler Bug**:
   - In `src/port-scenes.js`, when drawing `L.yard.hand`, check if `a.state === 'INSIDE'` or `a.dark > 0.85`. Do not draw the character when inside the timber warehouse (behind the wall `j = 4.5`), eliminating the visual bug where he appears to float on the 2nd-story exterior brick facade.
2. **Foreman Props Rendering**:
   - In `src/port-scenes.js`, render the foreman's ledger (`a.book`), graphite pencil (`a.pencil`), and folding rule (`a.rule`) using appropriate canvas primitives (`isoBox`, `stroke`, `thin`) at their calculated IK world positions.
3. **Falling Offcut & Bin Wood**:
   - In `src/port-scenes.js`, render the severed offcut block when falling (`a.offcut.state === 'FALLING'`) and render cut wooden blocks inside `BIN` so it's not permanently empty.
4. **Volumetric Planks & Stack Dunnage Bearers**:
   - Upgrade board drawing in `src/port-scenes.js` from single-pixel 2D lines to shaded isometric planks with top and side faces.
   - Add dunnage sleepers/bearers underneath `RAW_STACK` and `CUT_STACK` so timber deals do not hover 1.3 units above the quay.
5. **Sawdust & Saw Polish**:
   - Add fine sawdust particles during push saw strokes.
   - Enhance the saw blade graphic with distinct teeth / metallic sheen.
6. **Clothing Palettes**:
   - Differentiate clothing colors between the carpenter (lighter working shirt/apron), handler (heavy docker wear), and foreman (vest/tallyman attire).
7. **Workbench Detailing**:
   - Add cross-bracing and wood texture to the carpenter's trestles.
8. **GIF Recording Script**:
   - Create `scripts/record-timber-gif.mjs` (adapted from `scratch/record_test_gif.mjs`) using viewpoint `(44.0, 7.5)`, recording a clean 432×288 animated GIF of the full routine cycle to `artifacts/timber-yard-routine.gif`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Verification Requirements
Run and document results for:
1. `node --test tests/port-district.test.js` (must pass 3/3 tests)
2. `npm run check` (TypeScript type check must pass)
3. `node scripts/record-timber-gif.mjs` (must generate `artifacts/timber-yard-routine.gif`)

Write your final report to `.agents/teamwork/worker_m2/report.md` and handoff to `.agents/teamwork/worker_m2/handoff.md`.
Communicate back to orchestrator via send_message when done.


## 2026-10-30T04:38:33Z
You are Worker M2: Timber Yard Implementation Worker.
Working directory: /Users/marcinek/Documents/Roadwork/.agents/teamwork/worker_m2/
Identity: teamwork_worker
Authoritative Request: /Users/marcinek/Documents/Roadwork/.agents/teamwork/ORIGINAL_REQUEST.md
Audit Report: /Users/marcinek/Documents/Roadwork/.agents/teamwork/audit_report.md
Project Plan: /Users/marcinek/Documents/Roadwork/PROJECT.md
Dispatch details: /Users/marcinek/Documents/Roadwork/.agents/teamwork/worker_m2/DISPATCH.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

File Ownership:
You exclusively own and may edit:
- `src/port-scenes.js`
- `src/port-life.js`
- `src/port-extension.js`
- `src/port-details.js`
- `scripts/record-timber-gif.mjs`

Tasks to implement:
1. Fix Floating Handler Bug: In `src/port-scenes.js`, do not draw `L.yard.hand` when `a.state === 'INSIDE'` or `a.dark > 0.85` (behind the warehouse wall `j = 4.5`), eliminating the visual bug where he appears to hover on the 2nd-story exterior brick facade.
2. Foreman Props Rendering: In `src/port-scenes.js`, render the foreman's ledger (`a.book`), graphite pencil (`a.pencil`), and folding rule (`a.rule`) using appropriate canvas primitives (`isoBox`, `stroke`, `thin`) at their calculated IK world positions.
3. Falling Offcut & Bin Wood: In `src/port-scenes.js`, render the severed offcut block when falling (`a.offcut.state === 'FALLING'`) and render cut wooden blocks inside `BIN` so it's not permanently empty.
4. Volumetric Planks & Stack Dunnage Bearers: Upgrade board drawing in `src/port-scenes.js` from single-pixel 2D lines to shaded isometric planks with top and side faces. Add dunnage sleepers/bearers underneath `RAW_STACK` and `CUT_STACK` so timber deals do not hover 1.3 units above the quay.
5. Sawdust & Saw Polish: Add fine sawdust particles during push saw strokes. Enhance the saw blade graphic with distinct teeth / metallic sheen.
6. Clothing Palettes: Differentiate clothing colors between the carpenter (lighter working shirt/apron), handler (heavy docker wear), and foreman (vest/tallyman attire).
7. Workbench Detailing: Add cross-bracing and wood texture to the carpenter's trestles.
8. GIF Recording Script: Create `scripts/record-timber-gif.mjs` (adapted from `scratch/record_test_gif.mjs`) using viewpoint `(44.0, 7.5)`, recording a clean 432×288 animated GIF of the full routine cycle to `artifacts/timber-yard-routine.gif`.

Verification Requirements:
1. `node --test tests/port-district.test.js` (must pass 3/3 tests)
2. `npm run check` (TypeScript type check must pass)
3. `node scripts/record-timber-gif.mjs` (must generate `artifacts/timber-yard-routine.gif`)

Write detailed report to `/Users/marcinek/Documents/Roadwork/.agents/teamwork/worker_m2/report.md` and handoff summary to `/Users/marcinek/Documents/Roadwork/.agents/teamwork/worker_m2/handoff.md`.
Communicate back to orchestrator via send_message when done.
