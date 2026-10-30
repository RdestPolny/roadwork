# Project: Fisherman Pier Routine, Fish Bucket & Cat in Roadwork

## Architecture
Roadwork renders all isometric district scenes (including the Thames port district) into a native **432×288** framebuffer (`renderer.state.hd3`) using procedural ESM modules and canvas primitives.
- `src/port-life.js`: Pure deterministic simulation engine driven by `lifeTime(t) = t + clock.offset`. Solves all character kinematics (`body`, `walkStep`, `ik`), procedural life loops, and physical prop states (`fisher`, `bucket`, `cat`). Supports instant time-warping via `phaseTime(who, state, u)` and `setLifeOffset(delta)`.
- `src/port-scenes.js`: Visual canvas rendering for characters, animals, and props via `portLifeProps(t)`. Draws fisherman (`person`, rod, line, float, caught fish, urination stream), fish bucket (`cyl`, water surface, fish tails, ripples, specular bubbles, droplet splash), and dock cat (quadruped rig via `taper`, `thin`, `stroke`, ears, tail, held fish, eating animation on crate).
- `src/port-district.js`: Geometry definitions and anchors (`DISTRICT.pier`, `ANCHORS.pier_fishing_spot`, `ANCHORS.fisher_bucket`, `ANCHORS.fisher_box`, `ANCHORS.cat_spot`, `ANCHORS.cat_crate`).
- `tests/port-district.test.js` / `tests/port-fisherman.test.js`: Headless unit tests verifying deterministic state transitions, cycle looping, and bucket inventory conservation.
- `tests/port-life-browser.mjs` / `tests/browser.mjs`: Playwright browser test harness verifying visual rendering, state progression, and artifact generation without flakiness.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F1 | Fisherman Fishing Loop | Continuous fishing loop: casting rod, holding/waiting, fish bite/reeling, stashing fish into bucket. | M1 | ORIGINAL_REQUEST §R1 |
| F2 | Fisherman Pee Break Routine | Periodic break: propping rod against pier railing, walking along pier to pier head, peeing over railing into Thames with ballistic stream & splash, walking back, retrieving rod. | M1 | ORIGINAL_REQUEST §R1 |
| F3 | Bucket Inventory State | Bucket stores fish count: increments on fisherman drop, decrements on cat theft. Closed-cycle determinism. | M1 | ORIGINAL_REQUEST §R2 |
| F4 | Bucket Visual Splash Animation | Visual water ripple rings, specular bubbles, and droplet splash particles inside/around bucket (pure canvas, zero audio). | M1 | ORIGINAL_REQUEST §R2 |
| F5 | Cat Observation & Opportunity Trigger | Cat sits on pier watching fisherman; detects opportunity and triggers theft only when fisherman walks away to pee. | M1 | ORIGINAL_REQUEST §R3 |
| F6 | Cat Heist, Crate Sprint & Eating Routine | Cat sneaks to bucket, steals 1 fish, sprints with fish in mouth to wooden crate, eats fish on crate, returns to post. | M1 | ORIGINAL_REQUEST §R3 |
| F7 | Canvas Visual Rendering | Isometric canvas drawing for fisherman, rod, stream, bucket, fish, quadruped cat, and crate matching Roadwork aesthetic. | M1 | ORIGINAL_REQUEST §R4 |
| F8 | Automated Browser Verification | Automated browser test in `npm run test:browser` verifying state transitions for fisherman, bucket, and cat without flakiness. | M2 | ORIGINAL_REQUEST §R5 |
| F9 | Full Test Suite Integrity | Clean execution of `npm test`, `npm run check`, and existing browser tests without regressions. | M2 | ORIGINAL_REQUEST §R5 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Fisherman, Bucket & Cat Routines and Canvas Rendering | Implement kinematics, state machines, and canvas drawing in `src/port-life.js`, `src/port-scenes.js`, and `src/port-district.js` (F1–F7). | none | DONE |
| M2 | Automated Browser & Unit Test Verification | Create/update unit tests and Playwright browser tests in `tests/` verifying all state transitions and zero regressions (F8, F9). | M1 | DONE |
| M3 | Multi-Agent Gate Verification | Independent review (2 Reviewers), empirical stress testing (2 Challengers), and forensic integrity audit (1 Auditor). | M2 | DONE |

## Interface Contracts
### `src/port-life.js` ↔ `src/port-scenes.js`
- `L.fisher`:
  - `P`: `{ i, j, a, z }` (root isometric position, heading, elevation)
  - `s`: current state string (`'PREPARE'`, `'CAST'`, `'WAIT'`, `'NIBBLE'`, `'REEL'`, `'UNHOOK'`, `'DROP_FISH'`, `'PREPARE_BREAK'`, `'WALK_TO_PEE'`, `'PEE'`, `'WALK_BACK'`, `'RETRIEVE_ROD'`, `'RESUME'`)
  - `u`: progress in current state [0..1]
  - `rod`: `{ butt: [x,y,z], mid: [x,y,z], tip: [x,y,z], propped: boolean }`
  - `float`: `[x,y,z]` position of float in water
  - `floatUnder`: boolean (submerged on bite)
  - `fish`: `{ head: [x,y,z], tail: [x,y,z] } | null`
  - `pee`: `{ stream: [[x,y,z], ...], splash: boolean } | null`
- `L.bucket`:
  - `i, j, r, h`: geometry coordinates
  - `count`: integer number of fish (e.g. 2 -> 3 -> 2)
  - `splash`: number (splash strength / age, or -1 if inactive)
  - `ripples`: array of ripple rings or progress
  - `bubbles`: array or count of surface bubbles
- `L.cat`:
  - `P`: `{ i, j, a, z }`
  - `s`: current state string (`'WATCH'`, `'STALK'`, `'STEAL'`, `'SPRINT'`, `'EAT'`, `'RETURN'`)
  - `u`: progress [0..1]
  - `hasFish`: boolean (fish held in mouth)
  - `chew`: number (jaw/head chew cycle)
  - `tail`: `{ yaw, pitch, wag }`
- `L.catCrate`:
  - `i, j, w, d, h`: crate dimensions and location on pier deck

### `src/port-life.js` ↔ Test Harness (`tests/browser.mjs`, `tests/port-life-browser.mjs`)
- `phaseTime(who, state, u)`: returns global tick `target` for `who` in `state` at progress `u`.
- `setLifeOffset(delta)`: sets time offset so `B.state.tick + clock.offset === target`.

## Code Layout
- Exclusive write ownership:
  - `src/port-life.js` (fisherman, bucket, cat simulation & state machines)
  - `src/port-scenes.js` (fisherman, bucket, cat, crate canvas drawing)
  - `src/port-district.js` (pier anchors & collision blocks)
  - `tests/port-district.test.js` or `tests/port-fisherman.test.js` (deterministic unit tests)
  - `tests/port-life-browser.mjs` (browser verification captures & assertions)
