# Handoff Report: Fisherman, Cat, and Bucket Kinematics & State Machines

## 1. Observation

### 1.1 Existing Architecture & Character Systems
- **Pure Simulation Engine (`src/port-life.js`)**:
  - `port-life.js` contains zero DOM/canvas calls; it is a purely mathematical, deterministic simulation driven by `lifeTime(t) = t + clock.offset` (lines 804–809).
  - Every character's joint positions, body orientations, held props, and states are pure functions of `t`.
  - Kinematic solver `body(o)` (lines 91–108):
    - Solves a 3D figure using spine lean (`lean`), roll (`side`), shoulder twist (`twist`), crouch (`crouch`), pelvis back (`back`), lateral sway (`sway`), and head direction (`yaw`, `pitch`, `nod`).
    - Two-bone analytical IK `ik(root, target, lens, pole)` (lines 72–77) solves arms (`ARM = [2.45, 2.2]`) and legs (`LEG = [3.1, 3.4]`).
  - Locomotion solver:
    - `walkJoints(g, loaded, side)` (lines 43–51) computes dynamic leg swing and foot lift via `stride(q)` (line 40) where foot lift is `sin(PI * u)`.
    - `walkBody(g, o)` (lines 111–120) smoothly blends `walkJoints` with static/carrying arm targets and `calm` interpolation.
    - `walkStep(S, pts, a0, a1, stop)` (lines 145–150) computes polyline navigation along `pts`, turning from `a0` to path heading, and turning on the spot to `a1` during the final `stop` ticks.
  - State machine loops:
    - `loop(list)` (lines 127–128) wraps arrays of `[state, ticks, data]` into a cyclic timeline of total duration `T`.
    - `stepAt(L, t)` (lines 130–134) performs binary search to find the active step, returning progress `u = local / d`, elapsed `local`, and cycle count `n`.
    - `phaseTime(who, state, u, nth)` (lines 813–819) finds the exact global tick for a given state, progress, and occurrence.

### 1.2 Pier Geometry and Current Fisherman Routine
- **Pier Coordinates (`src/port-district.js`)**:
  - Pier bounding box: `DISTRICT.pier = [42.2, 13, 51.8, 25]` (line 8).
  - Deck height: `DECK_Z = 0.25` (line 38); river low-tide waterline `WL = -7.0` (in `src/thames-port.js:31`).
  - Southern waterward railing at `j = 25.0` with timber posts from `DECK_Z` to `z = 6.4` and top rail at `z = 6.5` (`src/port-extension.js:66`).
  - Existing anchors:
    - `ANCHORS.pier_fishing_spot = { i: 49.6, j: 24.05, a: 1.37 }` (facing 1.37 rad, ~78.5° towards south/Thames).
    - `ANCHORS.fisher_bucket = { i: 49.16, j: 24.3, r: 0.21, h: 2.5 }`.
    - `ANCHORS.fisher_box = { i: 50.15, j: 23.73, w: 0.55, d: 0.36, h: 1.7 }` (tackle box).
    - Pier hand winch at `i = 44.25, j = 22.55`; coiled line at `i = 49.9, j = 22.8`.
- **Current Fisherman Routine (`src/port-life.js:193–369`)**:
  - Cycle `FISH`: 9 fishing iterations (`n = 0..8`).
  - States: `PREPARE` (100t), `CAST` (124t), `WAIT` (720..1500t), `NIBBLE` (130..190t), `MISS` (110t), `REEL` (210t), `UNHOOK` (190t), `DROP_FISH` (120t), `RESET` (130t).
  - Fish states: `IN_WATER`, `ON_LINE`, `HELD_BY_NPC`, `FALLING`, `IN_BUCKET`.
  - Current fish count: `fishCaught(t)` computes `c = 2 + S.n * FISH_PER_LOOP + ...` (lines 285–290).
  - Current splash: `S.s === 'DROP_FISH' && u >= FISH_IN ? (u - FISH_IN) * S.d : -1`.

### 1.3 Rendering Pipeline (`src/port-scenes.js`)
- `portLifeProps(t)` collects stationary props and animated figures into depth-sorted queue `out.push([i + j, fn])` (line 66).
- Figure rendering: `docker(p, J, top, { look: pose.look })` in `src/thames-port.js:847` invokes `figureHD` from `src/gym.js:283`.
- Prop primitives:
  - `cyl(i, j, r, z0, z1, body, top, bulge)` (`src/thames-port.js:272`) renders shaded vertical cylinders with lit sides and top cap.
  - `crate(i, j, w, d, h, z, tone, mark)` (`src/thames-port.js:299`) renders volumetric planked wooden shipping crates with battens and diagonal braces.
  - `stroke(i, j, z, I, J, Z, c)` and `thin(i, j, z, I, J, Z, c)` render isometric 3D lines.
  - `quad(...)` and `isoBox(...)` render textured/shaded isometric planes and blocks.
- Quadruped animal rendering (`src/carriage.js:28–95`):
  - Uses `taper(x0, y0, r0, x1, y1, r1, pass, ramp)` to draw organic tapered muscle limbs, neck, muzzle, and ears, with two-pass outline and color ramp shading.

---

## 2. Logic Chain

### 2.1 Fisherman State Machine & Kinematics Design

```
                  ┌───────────────┐
                  │    CASTING    │ (PREPARE 90t + CAST 124t)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ WAITING/FISH  │ (WAIT 720..1500t)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ BITE/REELING  │ (NIBBLE 130t -> REEL 210t)
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │STASH_IN_BUCKET│ (UNHOOK 190t -> DROP_FISH 120t -> count + 1)
                  └───────┬───────┘
                          │
               ┌──────────┴──────────┐
               │ Pee Break Trigger?  │
               └──────────┬──────────┘
             No (Catch < N)│  │ Yes (Catch >= N)
               ┌──────────┘  └─────────────────────┐
               ▼                                   ▼
        [Normal RESET 130t]               ┌─────────────────┐
               │                          │ PREPARING_BREAK │ (90t: lean rod against rail)
               └──────►(Back to CAST)     └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ WALKING_TO_PEE  │ (360t: walk to pier head)
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │     PEEING      │ (480t: stream + water splash)
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │  WALKING_BACK   │ (360t: walk back to station)
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │ RETRIEVING_ROD  │ (90t: pick up rod)
                                          └────────┬────────┘
                                                   │
                                                   ▼
                                          ┌─────────────────┐
                                          │    RESUMING     │ (70t: stance reset -> CAST)
                                          └────────┬────────┘
                                                   │
                                                   └──────►(Back to CASTING)
```

#### Detailed State Parameters & Kinematic Specs:
1. **CASTING**:
   - `PREPARE` (90 ticks): settles feet into wide casting stance `cast = {[-1]:[-.85,-1.55,.9],[1]:[.45,1.5,.9]}`.
   - `CAST` (124 ticks): back cast arm raise (`top = [.5,-2.1,13.2]`, `el = 1.78`), forward drive snap (`drive = [2.7,-1.4,10.6]`, `el = .24`), rod tip flex (`bend = -.22*bump(u,.52,.1)+.1*bump(u,.66,.06)`), line flies into water.
2. **WAITING/FISHING**:
   - Duration: 720..1500 ticks.
   - Breathing and posture: breathing rhythm `bob = 0.08 * sin(t * 0.045)`, subtle rod tip sway `el = REST.el + 0.06 * sin(t * 0.025)`, line sag on water surface `floatL = onWater`.
   - Occasional head glance: `b.yaw = (rnd(...) < 0.5 ? 0.55 : -0.45) * bump(local, e3 * D, 85)`.
3. **BITE/REELING**:
   - `NIBBLE` (130 ticks): float submerges (`dip = -2.6`), strike pulls rod back (`el = REST.el + 0.5`, `g = lerp3(REST.g, struck, strike)`).
   - `REEL` (210 ticks): rod bent (`bend = 0.32 + 0.06 * sin(u * 31)`), fisherman sits back on heels (`back = -0.5 * k`, `crouch = 0.12 * k`), free hand executes circular crank revolutions `crank(g, el, az, local, into)`.
4. **STASHING_IN_BUCKET**:
   - `UNHOOK` (190 ticks): rod raised near vertical (`el = UNHOOK_EL`, `az = UNHOOK_AZ`), fish swings to chest, free hand grasps fish, hook released.
   - `DROP_FISH` (120 ticks): body twists toward bucket (`twist = 0.12 + 0.78 * v`, `lean = 0.1 + 0.6 * v`), hand moves over bucket `[BUCKET_L[0], BUCKET_L[1], BUCKET.h + DROP_UP]`.
   - At `FISH_FREE = 0.58`: hand opens; fish falls parabolically under gravity `FALL_G = 0.045`.
   - At `FISH_IN = 0.81`: fish passes below bucket rim; **Bucket Fish Count increments by +1**; water splash triggers.
5. **PREPARING_BREAK**:
   - Duration: 90 ticks.
   - Action: Fisherman straightens up (`lean: 0.07`, `crouch: 0`), turns towards the railing at `j = 25.0` (`turn(1.37, 1.57, u)`).
   - Rod Placement:
     - Hands guide the rod to lean against the timber railing post at `[49.8, 24.9, 6.5]`.
     - Butt lands on deck: `butt = [49.8, 23.9, DECK_Z]`.
     - Tip extends over the water: `tip = [49.4, 25.2, 7.8]`.
     - At `u >= 0.75`: Hands release rod (`hands[-1]` and `hands[1]` return to body rest sides).
     - State `rodState = 'ON_RAIL'`. The fishing line hangs slack with float floating gently on the water.
6. **WALKING_TO_PEE**:
   - Duration: 360 ticks (~6.0s).
   - Route polyline: `PATH_TO_PEE = [[49.6, 24.05], [47.5, 24.2], [44.8, 24.4]]` (total distance = 4.85 tiles).
   - Kinematics: `walkStep(S, PATH_TO_PEE, 1.37, 1.57, 30)` with `walkBody(w.g, { calm: w.calm })`.
   - Normal walking pace: `d / 0.69` stride phase, natural arm counter-swing.
7. **PEEING**:
   - Duration: 480 ticks (~8.0s).
   - Location: `PEE_SPOT = { i: 44.8, j: 24.4, a: 1.57 }` (facing South towards the Thames, directly against the timber rail `j = 25.0`).
   - Body Posture:
     - Wide stance: `feet = {[-1]: [-.3, -1.35, .9], [1]: [.3, 1.35, .9]}`.
     - Hands brought together at lower abdomen: `hands = {[-1]: [1.1, -.45, 6.2], [1]: [1.1, .45, 6.2]}`.
     - Spine slightly arched: `lean = -0.04`, `back = 0.22`, `pitch = 0.38` (head tilted slightly downward).
   - Procedural Urine Stream:
     - Active interval: local ticks 60 to 420 (duration 360 ticks = 6.0s).
     - Emitter nozzle: `origin = toWorld(P, [1.3, 0, 6.2])`.
     - Parabolic arc trajectory across railing into river:
       - Initial velocity: `v_forward = 0.024` tiles/tick, `v_up = 0.045` units/tick, gravity `g = 0.0038`.
       - Arc travels ~1.2 tiles south to `j = 25.6`, dropping from `z = 6.4` to water line `WL = -7.0`.
       - Rendered using 4-6 line segments via `thin()` with golden/pale tone `shadeC(C.lamp, 0.82)`.
       - Slight pulse modulation: `0.05 * sin(local * 0.25)`.
     - Surface Splash at River Water (`WL = -7.0`):
       - Expanding ripple rings: `thin()` in `C.waterHi` (`rgb('#3f4c48')`) and `C.ripple`.
       - Micro droplets (2-3 particles) flaring upward.
   - Settle / Buttoning: local ticks 420..480: stream tapers to drips, subtle pelvis shake (`sway = 0.12 * sin(local * 0.8)`), hands adjust belt.
8. **WALKING_BACK**:
   - Duration: 360 ticks.
   - Route polyline: `PATH_BACK = [[44.8, 24.4], [47.5, 24.2], [49.6, 24.05]]`.
   - Kinematics: `walkStep(S, PATH_BACK, -1.57, 1.37, 30)` with `walkBody(w.g)`.
9. **RETRIEVING_ROD**:
   - Duration: 90 ticks.
   - Action: Fisherman arrives at fishing spot, bends forward (`lean: 0.25`, `pitch: 0.4`), extends hands to the propped rod.
   - At `u >= 0.45`: Hands close on butt and fore grip; lifts rod off railing; `rodState = 'HELD_BY_NPC'`.
10. **RESUMING**:
    - Duration: 70 ticks.
    - Settles feet into `cast` stance, turns shoulders to `REST.twist`, checks tension of the dangling line, transitions directly into `PREPARE` / `CAST`.

---

### 2.2 Fish Bucket State Machine & Visual Mechanics

#### State Structure:
- `bucketAt(t)` evaluates:
  - `count`: number of fish currently inside the bucket (integer >= 0).
  - `splash`: active splash effect age in ticks (-1 if idle).
  - `flop`: living fish tail-thrash phase (0..1).
  - `ripples`: array of active concentric water ring radii and opacities.
  - `bubbles`: array of specular bubble coordinates inside the bucket.

#### Closed-Cycle Fish Conservation:
- Start of loop: `count = 2`.
- Fisherman catches and drops fish (`DROP_FISH` at `u >= FISH_IN`): `count = 3`.
- Cat stealthily steals fish (`STEALING_FISH` at `u >= FISH_EXTRACTED`): `count = 2`.
- Net delta per loop cycle: `+1 - 1 = 0`.
- Closed cyclic property holds: `count(t + T) === count(t)`.

#### Procedural Canvas Visuals (Zero Audio, Pure Visual Shading):
1. **Dynamic Bucket Cap (`cyl` top shader)**:
   - Bucket top ellipse has center `(cx, cy)`, radii `(rx, ry)`.
   - Rim ring: `(s^2 + v^2) > 0.78`: dark iron/wood stave rim (`shadeC(C.woodDark, 1.1)`).
   - Water surface: `(s^2 + v^2) <= 0.78`: dark brackish Thames water `rgb('#1c2826')`.
   - Visual Fish Representation based on `count`:
     - `count === 0`: Empty bucket; dark murky water with faint bottom stave reflection.
     - `count === 1`: Single silver-grey fish body breaking surface. A curved stroke `rgb('#8ca097')` with dark dorsal seam `rgb('#4a5651')` and tail waggle `0.2 * sin(t * 0.12)`.
     - `count === 2`: Two fish; one tail resting near left rim, one glistening silver flank across center.
     - `count >= 3`: Abundant catch; multiple overlapping silver highlights, tail fin contours protruding slightly above rim, active water surface.
2. **Living Fish Flop & Ripple Effect**:
   - Every 80 ticks (~1.3s), a fish inside the bucket thrashes (`flop` pulse):
     - Center of disturbance: `(cx + dx, cy + dy)` offset based on `rnd(n, 7)`.
     - Generates 2 concentric expanding elliptical rings: `rx_ring = rx * 0.6 * q`, `ry_ring = ry * 0.6 * q`.
     - Color: pixel blend with `C.waterHi` (`rgb('#3f4c48')`), fading out as `(1 - q)^2`.
3. **Surface Bubbles**:
   - 2-3 persistent micro-bubbles generated deterministically:
     - Tiny 1-2 pixel bright glints: specular pixel `rgb('#d8ece7')` with shadow edge `rgb('#162220')`.
     - Drift slowly across water surface: `dx = 0.08 * sin(t * 0.03 + b)`.
4. **Impact Splash Particles (Entry and Cat Paw Extraction)**:
   - Triggered when `DROP_FISH` drops fish into bucket (`local_splash = 0..22 ticks`) and when `STEALING_FISH` paw enters bucket (`local_splash = 0..18 ticks`).
   - 4-6 water droplet particles:
     - Trajectory: `x_k(tau) = bx + vx_k * tau`, `y_k(tau) = by + vy_k * tau`, `z_k(tau) = z_water + vz_k * tau - 0.5 * g * tau^2`.
     - Rendered with `thin()` in `C.waterHi`.

---

### 2.3 Cat and Crate State Machine & Kinematics Design

```
┌──────────────────┐
│ SITTING_OBSERVE  │ (at CAT_POST [50.6, 22.2], watches fisherman, tail flickers)
└────────┬─────────┘
         │
         │ (Trigger: Fisherman enters PREPARING_BREAK / WALKING_TO_PEE)
         ▼
┌──────────────────┐
│ OPPORTUNITY_DET  │ (40t: alert head raise, ears forward, body drops into crouch)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ STEALTH_APPROACH │ (130t: low belly crawl stalk along pier to bucket [49.38, 24.18])
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  STEALING_FISH   │ (110t: paws on rim -> paw plunges in -> jaws clamp fish -> count - 1)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ SPRINT_TO_CRATE  │ (80t: bounding gallop with fish in mouth -> leap onto crate [47.8, 21.6])
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ EATING_ON_CRATE  │ (320t: pins fish -> chewing bites -> fish devoured -> paw wash)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ RETURN_TO_POST   │ (180t: hops off crate -> casual trot back to CAT_POST -> sits)
└────────┬─────────┘
         │
         └─────────►(Back to SITTING_OBSERVING)
```

#### Detailed State Parameters & Spatial Layout:
- **Anchors**:
  - Observation Post `CAT_POST`: `{ i: 50.6, j: 22.2, a: -2.35 }` (facing South-West towards bucket and fisherman).
  - Cat Crate `CAT_CRATE`: `{ i: 47.8, j: 21.6, w: 0.65, d: 0.55, h: 2.0 }` (a sturdy wharf cargo crate situated north of the winch).
  - Steal Spot `CAT_STEAL`: `{ i: 49.38, j: 24.18, a: 2.65 }` (right beside bucket rim).

#### Kinematic Rig & Drawing Model for Cat:
- Proportions:
  - Cat shoulder height: 2.2 units (~4 screen pixels); body length: 3.4 units (~7 screen pixels); head diameter: 1.6 units (~3 screen pixels).
  - Scale harmonizes with human docker height (17 units).
- Victorian Wharf Cat Palette:
  - Charcoal dock tabby: `coat = ['#1a1c1d', '#363c3e', '#5a6265']` with pale muzzle/chest `rgb('#c2c6c8')`.
  - Or ginger dock cat: `coat = ['#382417', '#744626', '#ad7242']` with cream bib.
- Anatomical Primitives:
  - Trunk: smoothly tapered capsule `taper(rump, chest, r_rump, r_chest, ...)`.
  - Head: spherical skull at neck joint, with two triangular pointed ears on top (`thin()` strokes).
  - 4 Limbs: Forelegs (`fore = [shoulder, elbow, paw]`) and Hind legs (`hind = [hip, hock, foot]`).
  - Tail: 3-segment expressive polyline (`thin()` or `rope()`), curving dynamically.

#### Cat State-by-State Execution:
1. **SITTING_OBSERVING**:
   - Haunches resting on deck: `rump = [0, 0, DECK_Z + 0.4]`, `chest = [0.8, 0, DECK_Z + 1.8]`, `head = [1.2, 0, DECK_Z + 2.5]`.
   - Forelegs straight down to deck: `paw_L = [1.0, -0.4, DECK_Z]`, `paw_R = [1.0, 0.4, DECK_Z]`.
   - Tail curled around paws: base at rump, curving along deck with tip flick: `tip_y = sin(t * 0.08) * 0.3`.
   - Head tracking: head yaw points towards fisherman `yawTo(P, [fisher.P.i, fisher.P.j])`.
   - Ear twitch: micro-flick every ~120 ticks.
2. **OPPORTUNITY_DETECTED** (40 ticks):
   - Ears snap forward; head raises sharply; body drops from upright sitting to low stalking posture (`chest_z = DECK_Z + 1.0`, `rump_z = DECK_Z + 1.0`).
   - Tail extends straight back behind body, tip twitching with predatory excitement.
3. **STEALTH_APPROACH** (130 ticks):
   - Traversal from `CAT_POST [50.6, 22.2]` to `CAT_STEAL [49.38, 24.18]` (distance: 2.3 tiles).
   - Crawling pace: ~0.018 tiles/tick.
   - Low stalking crouch: belly nearly skimming deck (`z = DECK_Z + 0.6`).
   - Four-beat creeping gait: paws planted carefully with minimal vertical bobbing.
   - Head thrust forward, fixed unblinkingly on bucket.
4. **STEALING_FISH** (110 ticks):
   - Ticks 0..30: Cat rears forebody up; front paws grip the bucket rim (`z = DECK_Z + BUCKET.h = 2.75`).
   - Ticks 30..65: Right front paw plunges down into the bucket water! Water splash particles burst from bucket rim! Paw hooks fish.
   - Ticks 65..95: Paw jerks out with fish; cat clamps jaws firmly around fish center. **Bucket fish count decrements by 1!**
   - Ticks 95..110: Cat drops all four paws back to deck, fish held crosswise in jaws (head and tail dangling either side of mouth).
5. **SPRINTING_TO_CRATE** (80 ticks):
   - Traversal from `[49.38, 24.18]` to `CAT_CRATE [47.8, 21.6]` (distance: 3.0 tiles).
   - High-speed bounding gallop: pace ~0.038 tiles/tick.
   - Spine stretches and flexes vigorously; head held high so fish doesn't drag on deck planks.
   - Final 20 ticks: powerful upward leap from deck onto the top of the crate (`z_crate = DECK_Z + 2.0 = 2.25`).
6. **EATING_ON_CRATE** (320 ticks):
   - Location: top of crate `[47.8, 21.6, 2.25]`.
   - Ticks 0..40: Cat crouches over fish, pinning it to crate wood under front paws.
   - Ticks 40..220 (180 ticks = 3.0s): Active chewing and tearing!
     - 12 chewing beats: head jerks sideways and downwards into fish.
     - Fish geometry visibly shrinks: full fish (ticks 40) -> half fish (ticks 130) -> fish tail (ticks 190) -> swallowed (ticks 220).
   - Ticks 220..320: Sits up on crate top, thoroughly washes face and whiskers with forepaw; tail gives lazy contented twitches.
7. **RETURNING_TO_POST** (180 ticks):
   - Ticks 0..25: Clean hop down from crate to pier deck.
   - Ticks 25..155: Casual, leisurely trotting walk back to `CAT_POST [50.6, 22.2]`.
   - Ticks 155..180: Turns around to face south-west, smoothly sits back down into `SITTING_OBSERVING`.

---

### 2.4 Complete Timeline Synchronization

| Global Tick `t_rel` | Fisherman State | Cat State | Fish Bucket State | Visual Drama |
|---|---|---|---|---|
| **0 .. 90** | `PREPARING_BREAK` | `SITTING_OBSERVING` | Count = 3, calm ripples | Fisherman sets rod on rail; Cat watches closely. |
| **90 .. 130** | `WALKING_TO_PEE` (leaves spot) | `OPPORTUNITY_DETECTED` | Count = 3 | Fisherman walks away; Cat's ears prick, drops to crouch. |
| **130 .. 260** | `WALKING_TO_PEE` (mid-pier) | `STEALTH_APPROACH` | Count = 3 | Fisherman's back is turned; Cat sneaks across pier. |
| **260 .. 370** | `WALKING_TO_PEE` -> reaches rail | `STEALING_FISH` | **Count: 3 -> 2!** Splash! | Cat paws bucket, pulls out fish in mouth. Splash triggers. |
| **370 .. 450** | `PEEING` begins | `SPRINTING_TO_CRATE` | Count = 2 | Fisherman unbuttons at rail; Cat sprints across pier with fish. |
| **450 .. 770** | `PEEING` (steady stream into Thames) | `EATING_ON_CRATE` | Count = 2, gentle ripples | Urine stream arcs into river; Cat feasts on crate top. |
| **770 .. 870** | `PEEING` (shaking, buttoning up) | `EATING_ON_CRATE` (paw wash) | Count = 2 | Stream stops; Cat cleans whiskers on crate. |
| **870 .. 1050** | `PEEING` finishes -> turns | `RETURNING_TO_POST` | Count = 2 | Cat hops down and trots back to post; sits innocently. |
| **1050 .. 1290** | `WALKING_BACK` (walking to spot) | `SITTING_OBSERVING` | Count = 2 | Fisherman walks back; Cat is already sitting, observing calmly. |
| **1290 .. 1380** | `RETRIEVING_ROD` (picks up rod) | `SITTING_OBSERVING` | Count = 2 | Fisherman takes rod; Cat looks completely innocent. |
| **1380 .. 1450** | `RESUMING` -> `CAST` | `SITTING_OBSERVING` | Count = 2 | Stance reset; line casts back into water. |

**Key Synchrony Invariants:**
1. Cat never moves towards bucket until Fisherman has released the rod and walked at least 1 full tile away (`t_rel >= 90`).
2. Fish extraction occurs while Fisherman is walking towards the pee spot (`t_rel = 260..370`), with his back completely turned.
3. Cat is fully finished eating and has returned to `CAT_POST` by `t_rel = 1050`, well before Fisherman reaches the fishing spot at `t_rel = 1290`.
4. Bucket fish count strictly decrements during `STEALING_FISH`, accurately reflecting stolen inventory without race conditions.

---

## 3. Caveats

1. **Camera View Framing**:
   - The developer camera view (`T.debugPortView(49.4, 23.5)`) currently centers on the fishing spot `(49.6, 24.05)`.
   - The pee spot at `(44.8, 24.4)` is ~4.8 tiles to the west. In the standard 432×288 buffer (`ix = 12, jx = -12, iy = 6, jy = 6`), 4.8 tiles corresponds to ~58 screen pixels, which is well within the visible screen area without moving the camera. However, for dedicated close-up review captures, camera coordinates `[47.0, 23.5]` will frame both the fisherman peeing and the cat on the crate simultaneously in one magnificent tableau.
2. **Audio Effects Non-Requirement**:
   - As explicitly constrained in R2 ("bez konieczności odtwarzania efektów dźwiękowych"), all splashes, streams, ripples, and eating actions are 100% visual on the canvas buffer. No audio channels or sound triggers are needed.
3. **Cycle Count Pre-conditions**:
   - The bucket begins the day with `count = 2`. The loop must land at least one fish before the first pee break so `count` reaches 3 before cat steals it back to 2, ensuring `count` never drops to 0 unless deliberately intended.
4. **Collision Margin on Pier**:
   - `DISTRICT.pier` is walkable within `[42.55, 12.6, 51.45, 24.5]`. The pee spot `[44.8, 24.4]` and cat crate `[47.8, 21.6]` are strictly inside the legal walkable deck and clear of the winch footprint `[44.25, 22.35, 46.95, 23.5]`.

---

## 4. Conclusion

1. **State Machine Completeness**:
   - The Fisherman has a robust 10-state life machine including realistic fishing kinematics, rod propping against pier railing, path traversal, procedural urine stream mechanics with ballistic drop, and stance resets.
   - The Fish Bucket has an integer inventory state that increments on fish catch and decrements on cat theft, with procedural water ripple rings, specular surface bubbles, and dynamic fish body count rendering.
   - The Cat has a 7-state routine: observing, opportunity detection, low creeping stalk, paw theft, bounding gallop sprint, chewing/eating on crate with fish shrinkage and face cleaning, and casual return to post.
2. **Kinematic & Visual Fidelity**:
   - All visual elements build directly on Roadwork's existing rendering stack (`figureHD`, `taper`, `cyl`, `thin`, `stroke`, `crate`, `isoBox`, `contact`).
   - The cat uses an expressive quadruped rig inspired by `src/carriage.js`, perfectly proportioned at ~4 pixels shoulder height for Victorian London docklands.
3. **Deterministic Synchronization**:
   - Both routines are locked to the shared game tick clock in `src/port-life.js`. The cat heist executes flawlessly during the fisherman's absence, returning to post before the fisherman walks back.
4. **Implementation Readiness**:
   - The exact polylines, tick counts, joint offsets, color palettes, and transition criteria are fully specified and ready for worker implementation.

---

## 5. Verification Method

### 5.1 Unit Test Verification (`tests/port-district.test.js`)
Independent verification command:
```bash
node --test tests/port-district.test.js
```
Assertions to add:
1. `LOOPS.FISH` and `LOOPS.CAT` determinism:
   - Verify all states exist: `assert.ok(fishStates.has('PREPARING_BREAK'))`, `assert.ok(fishStates.has('PEEING'))`, `assert.ok(catStates.has('STEALING_FISH'))`, `assert.ok(catStates.has('EATING_ON_CRATE'))`.
2. Bucket inventory invariant:
   - For every tick `t` in `[0, LOOPS.FISH.T]`:
     `assert.ok(p.bucket.count >= 1, 'Bucket never empty')`.
     `assert.equal(p.bucket.count(t + T), p.bucket.count(t), 'Fish conservation per cycle')`.
3. Spatial bounds:
   - All positions of Fisherman and Cat remain on `portSurface === 'pier'` throughout all ticks.

### 5.2 Browser Snapshot & State Inspection (`npm run test:browser`)
Verification command:
```bash
npm run test:browser -- --only=port-life
```
Specific inspection targets:
1. `phaseTime('fisher', 'PEEING', 0.5)`:
   - Verify `fisher.state === 'PEEING'`.
   - Verify `fisher.peeStream != null` with valid ballistic arc coordinates.
   - Capture snapshot: `artifacts/port-life/fisher-pee.png`.
2. `phaseTime('cat', 'STEALING_FISH', 0.5)`:
   - Verify `cat.state === 'STEALING_FISH'`.
   - Verify `cat.pawInBucket === true`.
   - Capture snapshot: `artifacts/port-life/cat-steal.png`.
3. `phaseTime('cat', 'EATING_ON_CRATE', 0.5)`:
   - Verify `cat.state === 'EATING_ON_CRATE'`.
   - Verify `cat.P.z0 === DECK_Z + CRATE.h`.
   - Capture snapshot: `artifacts/port-life/cat-eat.png`.
4. Transition condition verification:
   - Inspect that `cat.state === 'SITTING_OBSERVING'` while `fisher.state === 'WAIT'`.
   - Inspect that `cat.state === 'OPPORTUNITY_DETECTED'` within 10 ticks of `fisher.state === 'WALKING_TO_PEE'`.

### 5.3 Invalidation Conditions
The design is invalidated if:
1. The cat reaches the bucket while the fisherman is still at the fishing spot (would break opportunity detection).
2. The cat's sprint or eat animation exceeds the fisherman's break duration (fisherman would catch the cat, violating requirement).
3. Any coordinate falls outside `DISTRICT.pier` or into the river before the pee spot.
4. Bucket fish count drifts across cycles (`count(t + T) !== count(t)`).
