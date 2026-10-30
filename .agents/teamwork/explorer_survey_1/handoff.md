# Handoff Report: Thames Timber Yard Scene & Asset Survey

**Agent**: Explorer 1 (`explorer_survey_1`)  
**Mission**: Investigate Thames scene structure, timber yard location, rendering code, art assets, canvas drawing logic, visual elements, layout, layers, aesthetics, period fidelity, and visual defects.  
**Report Reference**: `.agents/teamwork/explorer_survey_1/report.md`

---

## 1. Observation

1. **Rendering Architecture & Assets**:
   - The scene does not use external PNG sprites or textures. All elements are procedurally drawn directly into a 432×288 framebuffer using 3D isometric projection helpers (`isoBox`, `quad`, `stroke`, `thin`, `cyl`) in `src/gym.js` and `src/thames-port.js:1208-1270`.
   - The Thames dockland is defined in `src/port-district.js:6-13` (`DISTRICT.quay = [0,0,52,13]`, `DISTRICT.workshop = [46.65,0,52,4.5]`, `DISTRICT.pier = [42.2,13,51.8,25]`).
   - The timber yard anchors are defined in `src/port-district.js:49-53`:
     ```javascript
     timber_workbench:{i0:47.3,j:7.9},
     timber_raw_stack:{i0:50.59,i1:51.13,j0:5.0,j1:7.4,along:'j',near:'i0'},
     timber_finished_stack:{i0:49.75,i1:51.8,j0:9.58,j1:10.14,along:'i',near:'j0'},
     timber_loading_spot:[48.1,4.85],
     timber_foreman:{i:46.95,j:8.25,a:-.74},
     ```
   - Static background structures are cached in `bake.buf` via `cachedBackground(t, fb)` in `src/thames-port.js:1175-1188`. The timber building facade and open doorway are drawn in `src/port-extension.js:171-184`.

2. **Observed Critical Visual Defects**:
   - **Defect A: Floating handler on the warehouse wall**:
     In `src/port-life.js:538`, `SPOT.inside = [ANCHORS.timber_loading_spot[0], ANCHORS.timber_loading_spot[1]-1.15] = [48.1, 3.7]`.
     In `src/port-extension.js:171`, warehouse wall `F2` is positioned at `j = 4.5`.
     When the handler walks inside (`j = 3.7`), his screen coordinate $Y = (i+j)\cdot 6 - z$ is smaller (higher up on the screen).
     In `src/port-scenes.js:45`, `person(a)` renders the handler without occlusion/depth clipping against the wall.
     Direct observation in `artifacts/port-life/wood-pick.png` and `artifacts/tmp/test_timber.gif`: The handler figure is rendered hovering on the exterior brick facade above the doorway.
   - **Defect B: Missing props for the timber foreman**:
     `src/port-life.js:784-802` calculates precise world positions for the foreman's book (`a.book`), pencil (`a.pencil`), and folding rule (`a.rule`).
     In `src/port-scenes.js:45`, the drawing loop for the yard workers is:
     ```javascript
     for(const a of [L.yard.wood,L.yard.hand,L.yard.fore]) add(a.P.i,a.P.j,()=>{
       person(a,['#302b24','#554737','#796448']);
       board(a.board);
       if(a.saw){ const q=a.saw.handle||[SAW_REST.i,SAW_REST.j,SAW_REST.z], d=a.saw.dir||SAW_REST.dir; stroke(...q,q[0]+d[0]*6.2/7.5,q[1]+d[1]*6.2/7.5,q[2]+d[2]*6.2,rgb('#a79c87')); }
     });
     ```
     `a.book`, `a.pencil`, and `a.rule` are completely omitted from rendering. The foreman mimes measuring and writing with empty hands.
   - **Defect C: Wood stacks floating in the air without bearers**:
     `src/port-life.js:524` defines `STACK_BASE = 1.3`, elevating the first layer of boards above ground.
     In `src/port-scenes.js:36`, stacks are drawn solely with `board(slotOf(st, kind, n))`. No bearer beams or pallets are drawn underneath, causing boards to hover 1.3 units above the cobbles.
   - **Defect D: Missing offcut drop**:
     `src/port-life.js:717-721` tracks the falling offcut (`wood.offcut`), but `port-scenes.js` does not draw it when severed.
   - **Defect E: Lack of sawdust / shavings**:
     The stone flags under the trestles are completely clean, lacking the characteristic workshop debris present in other parts of the game (such as the slaughterhouse in `src/work.js:73`).

---

## 2. Logic Chain

1. From Observation 1, the port district uses an explicit isometric coordinate system where screen depth is determined by `i + j` and drawing order.
2. From Observation 2 (Defect A), because the timber warehouse front wall is baked into the static background at $j=4.5$ and the handler's path enters $j=3.7$ inside the building, any actor rendered after the background without doorway clipping will be drawn directly on top of the front wall at screen coordinate $Y(48.1, 3.7)$, giving the illusion of climbing the outer brickwork.
3. Therefore, resolving Defect A requires clamping the handler's entry path to the doorway threshold or adding a doorway mask (such as `behindFront` used by the main warehouse in `src/thames-port.js:1231`).
4. From Observation 2 (Defect B & D), `port-life.js` already simulates the full physics and kinematics of the foreman's book, pencil, rule, and the falling offcut, but `port-scenes.js` failed to implement the corresponding drawing calls.
5. Therefore, implementing these props requires only adding the corresponding `stroke`/`thin`/`isoBox` render calls in `port-scenes.js` without altering simulation state or introducing new dependencies.

---

## 3. Caveats

- Investigation was strictly read-only; no code modifications in `src/` or `tests/` were made during this survey.
- The unit test suite `npm test` has pre-existing failures in `tests/realtime-rules.test.js` (unrelated combat rules from prior work); however, `node --test tests/port-district.test.js` passes 100% cleanly (3/3 tests pass).
- The player character does not directly interact with timber yard objects during the main story prologue (the player's objective is carrying coal sacks from the crane to the warehouse); the timber yard is an ambient living background vignette.

---

## 4. Conclusion

The Thames timber yard is an ambient vignette with strong structural design and period accuracy for 1868 Wapping, but it currently suffers from three major visual bugs:
1. **Critical Glitch**: The handler floats vertically up the warehouse facade during the `ENTER`/`INSIDE`/`EMERGE` animation phase due to missing doorway occlusion and excessive interior depth coordinate.
2. **Missing Render Hooks**: The foreman's book, pencil, and folding rule, as well as the cut-off wood block (`offcut`), are simulated in `port-life.js` but completely unrendered in `port-scenes.js`.
3. **Aesthetic Deficiencies**: The wood stacks float 1.3 units above the cobbles without support timbers (bearers), and the ground around the cutting bench lacks authentic sawdust/shavings.

Addressing these issues in `port-scenes.js`, `port-life.js`, and `port-extension.js` will bring the timber yard to the target quality bar without breaking existing contracts or unit tests.

---

## 5. Verification Method

To independently verify these findings:
1. Run port district unit tests:
   ```sh
   node --test tests/port-district.test.js
   ```
2. Inspect the captured frames in `artifacts/thames-district/` and `artifacts/port-life/`:
   - View `artifacts/thames-district/07-trade-yard.png` (trade yard overview).
   - View `artifacts/port-life/wood-pick.png` (clearly shows the handler hovering on the warehouse wall above the door).
   - View `artifacts/tmp/test_timber.gif` (shows full routine cycle with floating handler and empty-handed foreman).
3. Inspect `src/port-scenes.js:30-47` to confirm the complete omission of `a.book`, `a.pencil`, `a.rule`, and `a.offcut`.
