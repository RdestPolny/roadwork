# Handoff Report — Worker Routines & Timber Yard Audit

**Working Directory**: `/Users/marcinek/Documents/Roadwork/.agents/teamwork/explorer_survey_2/`  
**Target Roles**: Implementer, Orchestrator  
**Handoff Type**: Hard (Task complete)

---

## 1. Observation

1. **Floating Handler Visual Glitch**:
   - In `src/port-life.js:741-748`, `handler()` sets `P = frameAt(p[0], p[1], ...)` where for `state === 'INSIDE'`, `p = SPOT.inside = [48.1, 3.7]`.
   - In `src/port-extension.js:157, 171`, the timber warehouse wall lies on the line `j = 4.5`.
   - In `src/port-scenes.js:45`:
     ```javascript
     for(const a of [L.yard.wood,L.yard.hand,L.yard.fore]) add(a.P.i,a.P.j,()=>{person(a,['#302b24','#554737','#796448']); board(a.board); if(a.saw){ const q=a.saw.handle||[SAW_REST.i,SAW_REST.j,SAW_REST.z], d=a.saw.dir||SAW_REST.dir; stroke(...q,q[0]+d[0]*6.2/7.5,q[1]+d[1]*6.2/7.5,q[2]+d[2]*6.2,rgb('#a79c87')); }});
     ```
   - In `artifacts/port-life/wood-carry.png` and `artifacts/port-life/wood-pick.png`, the handler is visibly drawn hovering on the upper-level exterior brick facade of the timber workshop above the doorway at `j = 3.7` (smaller `j` projects higher on screen).
   - In `src/thames-port.js:871-874`, warehouse doorways use `behindFront(draw, archHole, ...)` to mask actors inside buildings. `port-scenes.js` lacks any door masking or occlusion check for `a.state === 'INSIDE'` or `a.dark`.

2. **Missing Foreman Props**:
   - In `src/port-life.js:800-801`, `foreman()` returns:
     ```javascript
     return {P,pose,state,book:{at:handWorld(P,pose,1)},pencil:{state:pencil,at:handWorld(P,pose,-1)},rule:rule?{...rule,at:handWorld(P,pose,-1)}:null,
       touching:state==='MEASURE'&&rule&&rule.open>.5?'bench':'',id:'foreman'};
     ```
   - In `src/port-scenes.js:45`, only `a.board` and `a.saw` are handled. `a.book`, `a.pencil`, and `a.rule` are never rendered. In the game view (`wood-saw.png`), the foreman holds and gestures with completely empty hands.

3. **Vanishing Sawing Offcuts**:
   - In `src/port-life.js:717-721`, `sawing()` computes `offcut = BENCH.top+PLANK.raw.th-drop>BIN.h-.3?{state:'FALLING',ang,drop}:{state:'IN_BIN',ang:0,drop:0}`.
   - In `src/port-scenes.js:45`, `a.offcut` is completely ignored; severed wood pieces vanish instantly upon completion of stroke 12 at `u = 0.9`.

4. **Wireframe Plank Rendering & Floating Stacks**:
   - In `src/port-scenes.js:23-29`:
     ```javascript
     function board(b){
       if(!b) return;
       const {i,j,z,dir,kind}=b, d=dir||[1,0,0], len=kind.len/2, w=kind.w/2, n=[-d[1],d[0]];
       const a=[i-d[0]*len,j-d[1]*len], c=[i+d[0]*len,j+d[1]*len];
       stroke(a[0],a[1],z+kind.th/2-(d[2]||0)*len*7.5,c[0],c[1],z+kind.th/2+(d[2]||0)*len*7.5,rgb('#866648'));
       thin(a[0]+n[0]*w,a[1]+n[1]*w,z+kind.th,c[0]+n[0]*w,c[1]+n[1]*w,z+kind.th,rgb('#c7a276'));
     }
     ```
   - Boards lack side/face shading and end grain. Stacks at `STACK_BASE = 1.3` float 1.3 units above the quay without dunnage bearers.

5. **Test Determinism**:
   - `node --test tests/port-district.test.js` executed with 3 tests passing, 0 failures (179 ms). Background routines are strictly deterministic functions of the life clock.

---

## 2. Logic Chain

1. From Observation 1, the handler's position inside the timber warehouse (`j = 3.7`) is rendered by `person(a)` in `port-scenes.js` without checking if the character is inside the building or occluded by the front wall (`j = 4.5`). Because isometric Y decreases as world J decreases, the handler's feet are projected above the ground level, appearing as a man walking on the 2nd-story exterior brick wall. Skipping rendering when `a.state === 'INSIDE'` or masking when `a.dark > 0.85` eliminates this severe visual artifact.
2. From Observation 2, `port-life.js` solves IK positions for the ledger, pencil, and folding rule, but `port-scenes.js` only contains drawing calls for `board` and `saw`. Connecting `a.book`, `a.pencil`, and `a.rule` to primitive rendering (`isoBox`, `stroke`, `thin`) will restore the intended visual storytelling of the foreman inspecting and tallying lumber.
3. From Observation 3, the physics of the falling offcut are already computed in the state machine (`woodworker.offcut`). Rendering the offcut block when falling and adding static cut blocks inside `BIN` provides visual cause-and-effect for the 12-stroke sawing routine.
4. From Observation 4, rendering planks with isometric face shading and adding wooden bearers under `RAW_STACK` and `CUT_STACK` grounds the lumber stacks into the quay architecture, transforming thin line "matchsticks" into convincing Victorian timber deals.
5. From Observation 5, all background life is verified deterministic via `portLife(t)`, ensuring that visual and behavioral enhancements can be added without breaking existing invariants or unit tests.

---

## 3. Caveats

- **Free Roam Player Collisions**: NPCs in the background life layer do not possess dynamic collision boundaries against the player to avoid trapping the player during free roam. Player can walk through the woodworker if standing directly on `SPOT.bench`.
- **Existing Fight / Punch Tests**: Running `npm test` showed failures in unrelated legacy combat tests (`tests/realtime-rules.test.js`, `tests/sparring.test.js`), which are outside the port district scope. `tests/port-district.test.js` passed 100% cleanly.
- **GIF Generation Scope**: The full timber cycle lasts 1670 ticks (~27.8 s). For practical GIF file size and evaluation clarity, a representative window of ~600-800 frames (sawing, offcut drop, measuring, stacking) should be targeted.

---

## 4. Conclusion

The timber yard scene possesses a robust, deterministic 3-character choreography that only requires localized rendering and behavioral fixes in `src/port-scenes.js`, `src/port-life.js`, and `src/port-extension.js`:
1. Suppress handler rendering when `a.state === 'INSIDE'` to fix the wall-floating glitch.
2. Render the foreman's book, pencil, and folding rule.
3. Render falling offcut blocks and wood blocks inside `BIN`.
4. Render 2-4 wood sawdust particles during the push strokes of sawing.
5. Upgrade board drawing from 2D wires to volumetric isometric planks and add stack bearers.
6. Differentiate worker clothing palettes (foreman vest, carpenter shirt/apron, handler heavy workwear).

Full technical details and before/after code proposals are documented in `.agents/teamwork/explorer_survey_2/report.md`.

---

## 5. Verification Method

1. **Unit Test Verification**:
   ```bash
   node --test tests/port-district.test.js
   ```
   Must pass with 3/3 tests passing and no regressions in life loop determinism.

2. **Snapshot / Visual Inspection**:
   ```bash
   npm run test:browser -- --only=port-life
   ```
   Inspect `artifacts/port-life/wood-saw.png`, `wood-carry.png`, and `wood-pick.png`.
   - Invalidation condition: If the handler is visible on the upper brick facade in `wood-carry.png` or `wood-pick.png`, the fix failed.
   - Verification success: In `wood-saw.png`, the foreman holds a visible tally book/rule, the saw has volumetric blade presence, sawdust is visible, and planks have volumetric faces and dunnage under stacks.
