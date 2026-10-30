## 2026-10-30T09:04:26Z
You are worker_fisherman, an implementation and testing engineer.
Working directory: /Users/marcinek/Documents/Roadwork/.agents/teamwork/worker_fisherman/

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You MUST read the following authoritative files before starting work:
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/ORIGINAL_REQUEST.md
- /Users/marcinek/Documents/Roadwork/PROJECT.md
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/explorer_fisherman_1/handoff.md
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/explorer_fisherman_2/handoff.md
- /Users/marcinek/Documents/Roadwork/.agents/teamwork/explorer_fisherman_3/handoff.md

Your exclusive write ownership:
- `src/port-life.js`
- `src/port-scenes.js`
- `src/port-district.js` (if needed for anchors/constants)
- `tests/port-district.test.js` or `tests/port-fisherman.test.js`
- `tests/port-life-browser.mjs`

Your implementation mission:
1. Fisherman Routine (`src/port-life.js` & `src/port-scenes.js`):
   - Implement the complete fishing cycle: casting, waiting/holding, bite/reeling, stashing fish into bucket.
   - Implement the physiological break: propping rod against pier rail, walking along pier to pier head spot (`[51.20, 21.80, 0.25]` facing east), peeing over railing into the Thames with a procedural parabolic ballistic urine stream and water surface splash at `WL = -7.0`, walking back, retrieving rod, resuming fishing.
   - Use existing kinematics primitives (`body`, `walkStep`, `ik`).
2. Fish Bucket Mechanics & Visual Splash (`src/port-life.js` & `src/port-scenes.js`):
   - Bucket inventory tracking with closed-cycle determinism (e.g. starts with 2 fish, fisherman adds fish -> 3, cat steals fish -> 2).
   - Pure canvas visual splash: water ripple rings expanding on bucket water surface, specular bubbles, droplet splash particles on drop and cat theft (zero audio calls).
   - Render bucket cylinder top with water shader and visible fish silhouettes/tails matching `count`.
3. Cat Routine on Pier & Crate (`src/port-life.js` & `src/port-scenes.js`):
   - Position cat observing spot at `[47.50, 22.20, 0.25]` and eating crate at `[45.40, 20.60, 0.25]`.
   - Cat states: `WATCH` (observing fisherman), `STALK` (triggered when fisherman is walking to pee; sneaks toward bucket), `STEAL` (paw in bucket, takes fish, bucket count decrements, splash triggers), `SPRINT` (runs with fish in mouth to crate), `EAT` (hops on crate, eats fish, jaw chew animation, tail wag), `RETURN` (hops down and trots back to observation post).
   - Draw quadruped cat using isometric primitives (`taper`, `thin`, `stroke`) matching Roadwork Victorian aesthetic.
4. Automated Verification:
   - Unit tests in `tests/port-district.test.js` or `tests/port-fisherman.test.js` verifying deterministic progression through all states, bucket inventory conservation, and collision safety.
   - Browser test additions in `tests/port-life-browser.mjs` capturing and verifying fisherman pee break, bucket splash, and cat theft/eating.
   - Run tests:
     - `node --test tests/port-district.test.js` (or new test file)
     - `npm run check` (`tsc --noEmit`)
     - `npm run test:browser -- --only=life`
     - `npm test`
   - Document all test execution commands and exact outputs in your handoff report.

## 2026-10-30T09:16:14Z
**Context**: Fisherman & Cat routine implementation
**Content**: Heartbeat check (11 minutes since last progress update). Please update your `progress.md` with current status and report your progress on the implementation and tests.
**Action**: Continue implementation, update `progress.md`, and report status.
