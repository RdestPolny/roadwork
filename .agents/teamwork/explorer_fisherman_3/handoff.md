# Handoff Report: Testing Architecture, Browser Test Harness, and State Inspection for Fisherman Pier Routine

**Author**: `explorer_fisherman_3`  
**Date**: 2026-10-30  
**Target Milestone**: Fisherman Scene Testing & State Verification Architecture

---

## 1. Observation

### 1.1 Test Configuration & Runners (`package.json`)
- `package.json:8-10`:
  ```json
  "scripts": {
    "dev": "node scripts/serve.mjs",
    "test": "node --test tests/*.test.js",
    "test:browser": "node tests/browser.mjs",
    "check": "tsc --noEmit"
  },
  "devDependencies": {
    "playwright": "1.63.0",
    "typescript": "7.0.2"
  }
  ```
- Two test runners exist:
  1. **Node.js Native Test Runner** (`node --test tests/*.test.js`): Executes fast ESM unit tests using `node:test` and `node:assert/strict`.
  2. **Browser Test Runner** (`node tests/browser.mjs`): Custom Playwright-based test harness against the local zero-dependency HTTP server (`scripts/serve.mjs`).

### 1.2 Browser Test Harness Architecture (`tests/browser.mjs`)
- Server spawn and browser initialization (`tests/browser.mjs:18-27`):
  ```javascript
  const port = 5189;
  const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
  await once(server.stdout, 'data');
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
  let context;
  let page;
  const errors = [];
  const results = [];
  const path = '/?debug=1';
  ```
- Seeded pseudo-randomness and test isolation (`tests/browser.mjs:28-46`):
  ```javascript
  async function fresh() {
    if (context) await context.close();
    context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(() => {
      let seed = 123456789;
      Math.random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
    });
    page = await context.newPage();
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await page.goto(`http://127.0.0.1:${port}${path}`);
    await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
    await page.evaluate(() => {
      document.querySelector('[data-a="new"]').click();
      window.__boxer.newGame();
      document.querySelector('#storyChoices button')?.click();
      window.__boxer.pause();
      window.__boxer.step(0);
    });
  }
  ```
- CLI filter option (`tests/browser.mjs:83-85`):
  ```javascript
  const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).toLowerCase();   // npm run test:browser -- --only=cell
  async function check(name, run) {
    if (only && !name.toLowerCase().includes(only)) return;
    await fresh();
    await run();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  }
  ```
- Registration of Thames port checks (`tests/browser.mjs:158-159`):
  ```javascript
  await check('Thames life: fixed routine phases',()=>checkPortLife(page));
  await check('Thames district: 13 native exploration, NPC, brawl and story captures',()=>checkPortDistrict(page));
  ```

### 1.3 State Inspection & Deterministic Time Warping (`tests/port-life-browser.mjs`)
- Verbatim existing browser test implementation (`tests/port-life-browser.mjs:4-21`):
  ```javascript
  /** Capture specific routine phases at the native resolution. */
  export async function checkPortLife(page){
    await mkdir('artifacts/port-life',{recursive:true});
    await page.evaluate(()=>document.querySelector('[data-dev-scene="port"]').click());
    const scenes=[['fisher-wait','fisher','WAIT',.5,49.4,23.5],['fisher-reel','fisher','REEL',.8,49.4,23.5],['fisher-drop','fisher','DROP_FISH',.6,49.4,23.5],['pub-sip','pub','A',.5,34.2,8.8],['wood-pick','wood','PICK_UP_PLANK',.7,46.7,8.3],['wood-carry','wood','WALK_TO_BENCH',.5,46.7,8.3],['wood-saw','wood','SAW',.5,46.7,8.3],['wood-place','wood','PLACE_ON_STACK',.7,46.7,8.3]];
    for(const [name,who,state,u,i,j] of scenes){
      const result=await page.evaluate(async({who,state,u,i,j})=>{
        const L=await import('/src/port-life.js'), T=await import('/src/thames-port.js'), B=await import('/src/boxing.js'), R=await import('/src/renderer.js');
        window.__boxer.pause(); const valid=T.debugPortView(i,j);
        const target=L.phaseTime(who,state,u); L.setLifeOffset(target-B.state.tick); R.render();
        return {valid,target,png:R.state.hd3.off.toDataURL('image/png')};
      },{who,state,u,i,j});
      assert.ok(result.valid,`${name} camera point`);
      assert.ok(result.target>=0,`${who} ${state}`);
      await writeFile(`artifacts/port-life/${name}.png`,Buffer.from(result.png.split(',')[1],'base64'));
    }
    await page.evaluate(async()=>{(await import('/src/port-life.js')).setLifeOffset(0);});
  }
  ```

### 1.4 Background Routine Determinism in Unit Tests (`tests/port-district.test.js`)
- Verbatim unit test verification (`tests/port-district.test.js:27-41`):
  ```javascript
  test('background routines remain deterministic on the port and cycle through their activities', async()=>{
    const { portLife, LOOPS } = await import('../src/port-life.js');
    const fish=new Set(), work=new Set();
    for(let t=0;t<LOOPS.FISH.T;t+=13){
      const p=portLife(t); assert.deepEqual(p,portLife(t));
      fish.add(p.fisher.state); work.add(p.yard.wood.state);
      for(const a of [p.fisher,p.pub.a,p.pub.b,p.loner,p.keeper,p.yard.wood,p.yard.hand,p.yard.fore])
        assert.ok(Number.isFinite(a.P.i)&&Number.isFinite(a.P.j)&&portSurface(a.P.i,a.P.j),`actor outside port at ${t}`);
      assert.ok(['ON_TABLE','HELD_BY_NPC'].includes(p.pub.mug.state));
      assert.ok(['ON_TABLE','HELD_BY_NPC'].includes(p.pub.bottle.state));
      assert.ok(Number.isFinite(p.fisher.rod.tip[0]));
    }
    for(const state of ['WAIT','CAST','REEL','UNHOOK','DROP_FISH']) assert.ok(fish.has(state),state);
    for(const state of ['PICK_UP_PLANK','WALK_TO_BENCH','SAW','PLACE_ON_STACK']) assert.ok(work.has(state),state);
  });
  ```

### 1.5 Debug Hooks on `window` and Life Clock Lifecycle (`src/devtools.js`, `src/port-life.js`)
- In `src/devtools.js:131-155`:
  - `window.__boxer` is created only when `DEBUG === true` (URL query `?debug=1`).
  - Methods:
    - `pause()`: Sets `paused = true`.
    - `resume()`: Sets `paused = false`.
    - `step(n)`: Loops `n` times doing `boxingState.simNow += STEP_MS; update();` then calls `render()`.
- In `src/port-life.js:804-822`:
  - `const clock = { offset: 0 };`
  - `export const lifeTime = tick => tick + clock.offset;`
  - `export function setLifeOffset(v) { clock.offset = v; }`
  - `export const LOOPS = { FISH, TALK, LONE, KEEP, WOOD, HANDLER, HANDLER_LAG };`
  - `export function phaseTime(who, state, u = .5, nth = 0)`: returns exact integer tick `t` for a character to reach `state` at progress `u`.
  - `export function portLife(t)`: returns `{ fisher: fisherAt(t), pub: drinkersAt(t), loner: lonerAt(t), keeper: keeperAt(t), yard: yardAt(t) }`.

### 1.6 Current Test Suite Status Commands & Results
1. `npm run check` (`tsc --noEmit`):
   - Command output: Exit code 0, 0 type errors.
2. `node --test tests/port-district.test.js`:
   - Command output: Exit code 0, 3/3 passed in 153.9ms.
3. `npm run test:browser -- --only=life`:
   - Command output: `PASS Thames life: fixed routine phases`, Exit code 0, completed in ~5s.
4. `npm run test:browser -- --only=district`:
   - Command output: `PASS Thames district: 13 native exploration, NPC, brawl and story captures`, Exit code 0, completed in ~5s.
5. `npm test` (`node --test tests/*.test.js`):
   - 83 tests pass across 17 test files.
   - Pre-existing failures exist in `tests/animation.test.js` (4 failing assertions related to Victorian punch poses) and `tests/realtime-rules.test.js` (10 failing assertions related to stamina/guard rules). These are strictly isolated combat/animation unit tests unrelated to port or district routines.

---

## 2. Logic Chain

1. **Test Runner Mechanics**:
   - Observations 1.1 and 1.2 demonstrate that Roadwork uses two test runners: native `node --test` for fast pure-logic unit tests and Playwright Chromium for browser integration tests.
   - `tests/browser.mjs` runs tests against an ephemeral static server (`scripts/serve.mjs`) on port 5189 with `?debug=1`.
   - The `--only=` argument enables running single test suites with sub-second overhead (e.g. `npm run test:browser -- --only=life`).

2. **Deterministic Time-Warping vs. Real-Time Waiting**:
   - In real-time, the fisherman's fishing and break cycle spans dozens of seconds (e.g. `LOOPS.FISH.T` is several thousand ticks). Waiting for this in real-time in a browser test would be extremely slow, prone to timeouts, and flaky.
   - Observations 1.3 and 1.5 reveal the architectural solution already established in Roadwork:
     - The background simulation is 100% pure and deterministic: `portLife(t)` is a function of life time `t`.
     - `phaseTime(who, state, u)` returns the exact life tick `t` where a state transition or pose occurs.
     - `setLifeOffset(target - B.state.tick)` shifts the life clock instantaneously without waiting for wall-clock time.
     - `debugPortView(i, j)` positions the camera at the pier (`49.4, 23.5`) instantly.
     - `window.__boxer.pause()` ensures no ticks advance between inspections.
     - `window.__boxer.step(N)` allows stepping through micro-transitions deterministically if tick-by-tick continuity needs to be checked.

3. **Fisherman State Verification**:
   - In `src/port-life.js`, the fisherman loop will be extended from `['PREPARE', 'CAST', 'WAIT', 'NIBBLE', 'REEL', 'UNHOOK', 'DROP_FISH', 'RESET']` to include:
     `['PREPARE_BREAK', 'WALK_TO_PEE', 'PEE', 'WALK_BACK', 'RETRIEVE_ROD']`.
   - In `tests/port-district.test.js`, a unit test evaluates `portLife(t)` across the full loop `LOOPS.FISH.T`:
     - Asserts that every state (`CAST`, `WAIT`, `NIBBLE`, `REEL`, `UNHOOK`, `DROP_FISH`, `PREPARE_BREAK`, `WALK_TO_PEE`, `PEE`, `WALK_BACK`, `RETRIEVE_ROD`) is visited.
     - Asserts `portSurface(fisher.P.i, fisher.P.j) === 'pier'` at every single tick.
     - Asserts coordinates during `PEE` reach the designated pee anchor on the pier.
   - In `tests/port-life-browser.mjs`, `phaseTime('fisher', state, 0.5)` targets each state, renders the canvas, and asserts:
     - `result.fisher.state === state`
     - `result.valid === true`
     - Captures PNG artifacts (`fisher-cast.png`, `fisher-pee.png`, etc.) for visual review.

4. **Bucket State Verification**:
   - Bucket state involves:
     a) `count`: Number of fish currently in the bucket.
     b) `splash`: Visual splashing animation state (ripple rings/bubbles/droplets) inside bucket.
   - When fisherman is in `DROP_FISH` and reaches release threshold `u >= FISH_IN`:
     - `count` increments by 1.
     - `splash` becomes active (`splash >= 0`).
   - While `count > 0`:
     - Visual splashing effect is active (pure canvas particles/ripples, no audio).
   - When cat performs `STEAL_FISH`:
     - `count` decrements by 1.
   - Verification in test:
     - Query `L.portLife(t).fisher.caught` (or `L.portLife(t).bucket.count`).
     - Query `L.portLife(t).bucket.splash` or `L.portLife(t).fisher.splash`.
     - Test evaluates `countBeforeDrop + 1 === countAfterDrop` and `countBeforeSteal - 1 === countAfterSteal`.

5. **Cat State Verification**:
   - Cat state progression:
     `SITTING_OBSERVING` -> `STALKING_APPROACH` -> `STEALING_FISH` -> `SPRINTING_TO_CRATE` -> `EATING_ON_CRATE` -> `RETURNING_TO_POST`.
   - Synchronization / Trigger condition:
     - Cat state machine is deterministic: either driven by a combined pier life loop or synchronized to `fisher.state === 'WALK_TO_PEE' || fisher.state === 'PEE'`.
     - Test asserts: Cat NEVER enters `STALKING_APPROACH` while fisherman is at `fisher.state === 'WAIT'` or `'CAST'` or `'REEL'`.
     - When fisherman transitions to `WALK_TO_PEE`, cat transitions to `STALKING_APPROACH`.
     - At `STEALING_FISH`, cat position is at `BUCKET` coordinates, and bucket fish count decrements.
     - At `SPRINTING_TO_CRATE`, cat `hasFish === true`, moving towards crate.
     - At `EATING_ON_CRATE`, cat position is atop the wooden crate (`ANCHORS.cat_crate`), playing eating animation.
     - At `RETURNING_TO_POST`, cat returns to initial sitting spot (`ANCHORS.cat_watch_spot`), resuming observation.

6. **Fast, Zero-Flake Execution**:
   - The test requires **zero `sleep` or polling loops**.
   - `page.evaluate()` executes synchronously on the browser thread with dynamic module imports.
   - All state assertions use direct equality checks (`assert.equal`, `assert.ok`) on the data returned by `portLife(t)`.
   - Execution time for the browser test will be < 3 seconds total.

---

## 3. Caveats

1. **Baseline Pre-Existing Combat Failures**:
   - Running the full test suite (`npm test`) reveals pre-existing failures in `tests/animation.test.js` and `tests/realtime-rules.test.js`. These are completely unrelated to port life routines or browser district tests.
   - Port district unit tests (`tests/port-district.test.js`) and browser tests (`tests/port-life-browser.mjs`, `tests/port-district-browser.mjs`) are 100% passing and healthy.
2. **Object Structure Convention in `portLife`**:
   - In current code, `fisherAt(t)` returns `caught: fishCaught(t)` and `splash: ...` directly on `L.fisher`, while props are drawn from `ANCHORS.fisher_bucket`.
   - When adding the cat and extending bucket interactions, the implementing agent should ensure `L.bucket` (or fields on `L.fisher.bucket`) and `L.cat` are cleanly exported on the object returned by `portLife(t)` so both unit and browser tests can inspect them uniformly.
3. **Viewpoint Bounds**:
   - In `tests/port-life-browser.mjs`, `debugPortView(49.4, 23.5)` is used to aim at the pier. If the cat or crate is located slightly further along the pier (e.g. `(47.5, 21.0)`), tests should position `debugPortView(i, j)` to ensure both the pier, bucket, and crate are within the camera frame (or capture multiple specific viewpoints as `scenes` array does).

---

## 4. Conclusion

1. **Testing Architecture Summary**:
   - Roadwork uses a clean two-tiered testing model:
     - **Tier 1 (Node.js Unit Tests)**: Fast (< 200ms) algorithmic verification of all loop steps, state transitions, coordinate bounds, and count increments/decrements via `portLife(t)`.
     - **Tier 2 (Browser Integration Tests)**: Playwright-driven native 432x288 canvas verification (`npm run test:browser -- --only=life`), combining deterministic life clock time-warping (`setLifeOffset`, `phaseTime`) with state assertions and PNG review artifact generation.
2. **Deterministic Verification Strategy for Pier Routine**:
   - **Fisherman**: Verified across 100% of cycle states without waiting, using `phaseTime('fisher', state, u)` and checking `portSurface(i, j) === 'pier'`.
   - **Bucket**: Verified by checking `count` increments when `fisher.state === 'DROP_FISH'` and decrements when `cat.state === 'STEAL_FISH'`, and checking `splash` particles active while fish are in bucket.
   - **Cat**: Verified by checking transition conditions (stalking only when fisherman walks to pee), coordinates moving from observation post -> bucket -> crate -> post, and `hasFish` flag lifecycle.
3. **Health Assessment**:
   - `npm run check` passes with 0 errors.
   - `tests/port-district.test.js` passes 3/3 in 153ms.
   - `npm run test:browser -- --only=life` passes in 5s.

---

## 5. Verification Method

To independently verify the observations and conclusions in this report, execute the following commands in the workspace root (`/Users/marcinek/Documents/Roadwork`):

1. **Verify Type Health**:
   ```bash
   npm run check
   ```
   *Expected outcome*: Exits with code 0 (`tsc --noEmit` produces no errors).

2. **Verify Unit Test for Port District & Background Life**:
   ```bash
   node --test tests/port-district.test.js
   ```
   *Expected outcome*: Exits with code 0, 3 tests pass in ~150-250ms.

3. **Verify Existing Browser Life Harness**:
   ```bash
   npm run test:browser -- --only=life
   ```
   *Expected outcome*: Exits with code 0, prints `PASS Thames life: fixed routine phases` in ~5s, outputs PNG captures to `artifacts/port-life/`.

4. **Verify Port District Browser Scenes**:
   ```bash
   npm run test:browser -- --only=district
   ```
   *Expected outcome*: Exits with code 0, prints `PASS Thames district: 13 native exploration, NPC, brawl and story captures`.

5. **Files to Inspect**:
   - `tests/browser.mjs`: Test runner setup, Playwright initialization, `--only` filtering.
   - `tests/port-life-browser.mjs`: Exact usage of `phaseTime`, `setLifeOffset`, `debugPortView`, and `page.evaluate`.
   - `tests/port-district.test.js`: Unit test loop evaluation of `portLife(t)`.
   - `src/port-life.js`: Pure life clock implementation, `LOOPS`, `phaseTime`, `portLife(t)`.
   - `src/devtools.js`: `window.__boxer` pause/step/resume API.
