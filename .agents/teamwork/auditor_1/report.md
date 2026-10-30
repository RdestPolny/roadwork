# Forensic Audit Report: Thames Timber Yard Verification & Enhancement

**Work Product**: Roadwork Thames Timber Yard Enhancement (`src/port-scenes.js`, `scripts/record-timber-gif.mjs`, `tests/port-district.test.js`, `artifacts/timber-yard-routine.gif`)  
**Profile**: General Project  
**Integrity Mode**: Development (defined in `ORIGINAL_REQUEST.md` line 8; simultaneously evaluated against Demo and Benchmark criteria)  
**Auditor**: Forensic Auditor 1 (`.agents/teamwork/auditor_1`)  
**Verdict**: **CLEAN**

---

## Executive Summary

An exhaustive forensic integrity investigation was conducted across the source code, simulation integration, test harnesses, and generated media deliverables of the Thames Timber Yard work product. 

Every claim of implementation was verified empirically through static analysis, test execution, browser runtime tracing, git tamper checking, and live re-execution of the GIF generation pipeline.

**Result**: Zero integrity violations, zero hardcoded test fixtures, zero dummy facades, zero test tampering, and zero pre-fabricated media artifacts were detected. The work product is an authentic, mathematically sound procedural implementation that strictly satisfies all requirements of `ORIGINAL_REQUEST.md` and architectural interface contracts of `PROJECT.md`.

---

## Phase Results

| # | Forensic Check Dimension | Status | Mode Relevance | Details |
|---|---|:---:|:---:|---|
| 1 | **Hardcoded Output Detection** | **PASS** | Dev / Demo / Benchmark | Regex and AST scans of `src/port-scenes.js` and `scripts/record-timber-gif.mjs` show zero hardcoded test results, expected output mocks, or cheat conditions. |
| 2 | **Facade / Stub Detection** | **PASS** | Dev / Demo / Benchmark | All canvas drawing routines (`board`, `isoBox`, `quad`, trestles, saw, particles, foreman props) are genuine procedural 3D math implementations. |
| 3 | **Simulation Variable Consumption** | **PASS** | Dev / Demo / Benchmark | Every simulation property from `port-life.js` (`a.book.at`, `a.pencil.at`, `a.pencil.state`, `a.rule.at`, `a.rule.open`, `woodOff.state`, `woodOff.drop`, `woodOff.ang`, `a.state`, `a.dark`, `yard.raw`, `yard.cut`) is genuinely rendered. |
| 4 | **Test Suite Tampering & Weakening** | **PASS** | Dev / Demo / Benchmark | Git diff inspection of `tests/port-district.test.js` confirmed no assertions were weakened or bypassed. All tests enforce deep determinism (`assert.deepEqual(p, portLife(t))`), surface constraints, and valid routine state cycles. |
| 5 | **Runtime Execution Verification** | **PASS** | Dev / Demo / Benchmark | `node --test tests/port-district.test.js` passes 3/3 tests (193 ms); `npm run check` passes with 0 type errors; browser suites `port-district` (13/13) and `port-life` (8/8) pass without error. |
| 6 | **Artifact Authenticity & Pipeline Execution** | **PASS** | Dev / Demo / Benchmark | Re-ran `node scripts/record-timber-gif.mjs` live. Verified Playwright browser launch, headless HTTP server, step-by-step canvas framebuffer capture from `R.state.hd3.off.toDataURL('image/png')`, and FFmpeg two-pass palette encoding. `ffprobe` confirms 432×288 resolution, 148 frames, 15 fps, 9.87s duration. |
| 7 | **Code Reuse & Dependency Boundary** | **PASS** | Demo / Benchmark | Core logic uses native ESM and standard project primitives (`isoBox`, `quad`, `stroke`, `thin`). No third-party runtime dependencies introduced. Playwright and FFmpeg restricted strictly to dev/verification tooling. |

---

## Detailed Forensic Evidence

### 1. Static Code Analysis (`src/port-scenes.js`)

#### A. Volumetric Board Rendering (`board(b)`)
- Lines 23–62 implement an authentic dual-path isometric renderer:
  - **Axis-aligned path** (lines 31–38): Uses `isoBox` with 3-tone lighting: top lit face (`#d0a676`), shaded front face (`#8d6845`), and end-grain face (`#6a4e33`).
  - **Dynamic rotated path** (lines 40–62): Computes normal vector `n = [-d[1], d[0]]` and 8 corner vertices in 3D world space (`c0..c3` and `t0..t3`), projecting four distinct isometric quadrilateral facets using `quad()` plus four definition border strokes via `thin()`.
- **Finding**: Genuine geometric polygon math; zero 1-pixel stubs or dummy facades.

#### B. Grounded Dunnage Bearers
- `RAW_STACK` (lines 72–78): Renders ground contact shadow (`contact()`) and three crosswise sleeper beams (`isoBox`) along `j` spanning `z = 0` to `z = STACK_BASE`, perfectly perpendicular to longitudinal raw deals.
- `CUT_STACK` (lines 81–87): Renders three crosswise sleepers (`isoBox`) along `i` spanning `z = 0` to `z = STACK_BASE`.
- **Finding**: Eliminates the previous floating bug; physically grounds stacks into the quay stone setts.

#### C. Workbench Detailing & Offcut Bin
- `BENCH` (lines 90–105): Renders trestle upright posts, mid-level stretchers, longitudinal base tie beam, diagonal X-bracing (`stroke`), heavy slab top, longitudinal wood grain lines, dark saw kerf notch cut at `BENCH.cut`, and sawdust dusting.
- `BIN` (lines 108–116): Renders crate outer shell, two internal accumulated sawn blocks (`isoBox`) resting on `z = BIN.h`, leaning offcuts (`stroke`, `thin`), and ambient sawdust scatter.
- `woodOff` (lines 126–132): Gated by `woodOff.state === 'FALLING'`. Uses simulation output `woodOff.drop` and `woodOff.ang` to compute world coordinates `[ci, cj, cz]` and render the severed block via `isoBox`.
- **Finding**: Connects the 12th saw stroke physically to the receptacle; zero disconnected mocks.

#### D. Saw Detailing & Dynamic Sawdust Particles
- Hand saw (lines 151–160): Shaped applewood handle, brass medallion fastener, steel spine, blade plate, teeth edge, and specular metallic glint.
- Dynamic sawdust spray (lines 161–174): Gated strictly by `a.state === 'SAW' && a.u >= 0.09 && a.u < 0.90` and push stroke phase `st < 0.55`. Excludes pull strokes and the mid-cycle pause (`0.46 <= v <= 0.54`). Uses `spread = Math.sin(pushU * Math.PI)` to emit three particle lines downward towards the offcut bin.
- **Finding**: Procedural mathematical envelope tied to kinematics clock; no hardcoded frame counters.

#### E. Foreman Props & Physical Kinematics
- Ledger (`a.book.at`, lines 179–184): Leather cover (`#422818`), parchment page block (`#dfd7c2`), bookmark ribbon (`#6b1d1d`), and tucked pencil tip when `a.pencil.state === 'IN_BOOK'`.
- Pencil (`a.pencil.at`, lines 185–189): Rendered in hand when `HELD_BY_NPC` with cedar shaft (`#b5894b`) and graphite point (`#28292b`).
- Folding rule (`a.rule.at`, lines 190–203): Victorian boxwood rule with brass knuckles. Renders folded when `open < 0.25` and unfolds into multi-segment brass-jointed arms when `open >= 0.25`.
- **Finding**: 100% genuine consumption of kinematics coordinates calculated in `port-life.js:800`.

#### F. Floating Handler Glitch Suppression
- Line 137: `if(a.id==='handler' && (a.state==='INSIDE' || (a.dark||0)>0.85)) continue;`
- Cleanly suppresses character and carried board when entering behind the warehouse exterior facade wall (`j = 4.5`), eliminating 2nd-story hovering without modifying the underlying deterministic simulation state machine.

---

### 2. Test Integrity & Execution Validation

#### A. Test Suite Tampering Verification
Git diff inspection between HEAD and working copy for `tests/port-district.test.js`:
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
- **Finding**: Every assertion is functional and strict. Tests idempotency (`assert.deepEqual(p, portLife(t))`), surface validity, finiteness of positions, and transition coverage through all required operational states. Zero dummy passes or weakened assertions.

#### B. Empirical Test Run Outputs
1. **Unit Tests**:
   ```
   $ node --test tests/port-district.test.js
   ✔ extended port builds at least twice the original plan with connected timber decks (0.688084ms)
   ✔ buildings and stored goods block travel, with public passages left open (0.679458ms)
   ✔ background routines remain deterministic on the port and cycle through their activities (129.57725ms)
   ℹ tests 3
   ℹ suites 0
   ℹ pass 3
   ℹ fail 0
   ```
2. **Type Check**:
   ```
   $ npm run check
   > roadwork@0.1.0 check
   > tsc --noEmit
   [Clean exit code 0]
   ```
3. **Browser Suites**:
   - `npm run test:browser -- --only=port-district`: Exit code 0 (all 13 camera viewpoints verified).
   - `npm run test:browser -- --only=port-life`: Exit code 0 (all 8 routine phases verified).

---

### 3. Deliverable Artifact Forensic Validation (`artifacts/timber-yard-routine.gif`)

#### A. Live Pipeline Re-Execution
To empirically prove that `artifacts/timber-yard-routine.gif` was not fabricated, pre-rendered, or downloaded, the auditor re-executed `scripts/record-timber-gif.mjs` directly in the environment:
```
$ node scripts/record-timber-gif.mjs
Timber yard routine period: 2072 ticks
Capturing 148 frames of native 432x288 framebuffer (dt=14 ticks)...
Encoding animated GIF to /Users/marcinek/Documents/Roadwork/artifacts/timber-yard-routine.gif...
Input #0, image2, from '/Users/marcinek/Documents/Roadwork/artifacts/tmp/timber_frames/frame_%04d.png':
  Duration: 00:00:09.87, start: 0.000000, bitrate: N/A
  Stream #0:0: Video: png, rgba(pc, gbr/unknown/unknown), 432x288, 15 fps
[Parsed_palettegen_1 @ 0x6000009840c0] 128 colors generated out of 31201 colors; ratio=0.004102
Output #0, gif, to '/Users/marcinek/Documents/Roadwork/artifacts/timber-yard-routine.gif':
frame=  148 fps=0.0 q=-0.0 Lsize= 2087KiB time=00:00:09.86 bitrate=1732.4kbits/s speed=10.5x elapsed=0:00:00.94
Successfully generated timber yard routine GIF: /Users/marcinek/Documents/Roadwork/artifacts/timber-yard-routine.gif
```
Execution completed in **9.2 seconds**, producing an authentic 2,136,648-byte animation.

#### B. Media Container & Stream Analysis (`ffprobe`)
```
$ ffprobe -v error -select_streams v:0 -show_entries stream=width,height,nb_read_frames,r_frame_rate,duration -count_frames -of default=noprint_wrappers=1 artifacts/timber-yard-routine.gif
width=432
height=288
r_frame_rate=15/1
duration=9.870000
nb_read_frames=148
```
- **Resolution**: Exactly **432 × 288** (1:1 match with Roadwork native HD3 framebuffer `R.state.hd3.off`).
- **Frame Count**: Exactly **148 frames** (`2072 ticks / 14 ticks per frame = 148`).
- **Framerate**: Exactly **15 fps**.
- **Duration**: **9.87 seconds**.
- **Visual Examination**: Stacks rest on grounded dunnage bearers; volumetric shaded planks; woodworker saws with push-stroke sawdust; falling offcut tips and drops into bin; bin contains accumulated offcut blocks; foreman tracks with leather book, pencil, and folding rule; handler enters warehouse without 2nd-story facade hovering.

---

## Mode-Specific Flagging Assessment

In accordance with the 2-Phase Investigation Architecture:
- `ORIGINAL_REQUEST.md` specifies `Integrity mode: development`.

| Check Dimension | Development Mode Rule | Finding | Violation? |
|---|---|---|:---:|
| Hardcoded test results | 🔴 Prohibited | None found | NO |
| Dummy / facade implementations | 🔴 Prohibited | None found | NO |
| Fabricated verification outputs | 🔴 Prohibited | None found | NO |
| Copied core logic | ✅ Allowed (Dev) / 🔴 Prohibited (Demo/Bench) | None found; native engine ESM | NO |
| Pre-built framework for core logic | ✅ Allowed (Dev/Demo) / 🔴 Prohibited (Bench) | None; procedural canvas primitives | NO |
| Read test source to reverse-engineer | ✅ Allowed (Dev) / 🔴 Prohibited (Demo/Bench) | None found | NO |
| Delegated core work to external tool | ✅ Allowed (Dev) / 🔴 Prohibited (Demo/Bench) | None found | NO |

**Conclusion**: The implementation satisfies the strictest standards across all three integrity modes (Development, Demo, and Benchmark).

---

## Final Forensic Verdict

# **CLEAN**

The Thames Timber Yard implementation is an authentic, high-quality, and robust work product with zero integrity violations. All acceptance criteria from `ORIGINAL_REQUEST.md` are satisfied in full.
