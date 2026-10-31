import test from 'node:test';
import assert from 'node:assert/strict';
import {
  portLife, fisherAt, bucketAt, catAt, phaseTime,
  LOOPS, FISH, CAT, PEE_SPOT, CAT_SPOT, CAT_CRATE, CAT_STEAL_SPOT, BUCKET,
  BUCKET_DROP_TICK, BUCKET_STEAL_TICK
} from '../src/port-life.js';
import { portSurface, districtBlocked, DECK_Z } from '../src/port-district.js';

test('fisherman routine completes full fishing cycle and Thames physiological break with finite kinematics', ()=>{
  const visited = new Set();
  const T = LOOPS.FISH.T;

  for(let t = 0; t < T; t++){
    const f = fisherAt(t);
    visited.add(f.state);

    // Coordinates must always remain safely on pier deck
    assert.equal(portSurface(f.P.i, f.P.j), 'pier', `Fisherman out of pier bounds at t=${t}: [${f.P.i}, ${f.P.j}]`);
    assert.ok(Number.isFinite(f.rod.tip[0]) && Number.isFinite(f.rod.butt[0]), `Invalid rod coordinates at t=${t}`);

    // Numerical safety invariant: frame orientation and hand coordinates must be finite on every tick
    assert.ok(Number.isFinite(f.P.fi) && Number.isFinite(f.P.fj), `Fisherman frame orientation NaN at t=${t}`);
    assert.ok(Number.isFinite(f.handR[0]) && Number.isFinite(f.handR[1]) && Number.isFinite(f.handR[2]), `Fisherman handR NaN at t=${t}`);

    // Walking path obstacle clearance: fisherman must never walk into solid tackle box or other obstacles
    if(f.state === 'WALK_TO_PEE' || f.state === 'WALK_BACK'){
      assert.equal(districtBlocked(f.P.i, f.P.j), false, `Fisherman penetrated obstacle at t=${t}: [${f.P.i}, ${f.P.j}]`);
      assert.equal(f.rod.propped, true, 'Rod must be propped while walking to/from pee break');
    }

    // Break mechanics checks
    if(f.state === 'PEE'){
      assert.ok(Math.abs(f.P.i - PEE_SPOT.i) < 0.1, `Fisherman at pee spot i: ${f.P.i}`);
      assert.ok(Math.abs(f.P.j - PEE_SPOT.j) < 0.1, `Fisherman at pee spot j: ${f.P.j}`);
      assert.equal(f.rod.propped, true, 'Rod must be propped while peeing');

      if(f.u >= 0.15 && f.u <= 0.85){
        assert.ok(f.pee != null, `Pee stream missing at u=${f.u}`);
        assert.ok(Array.isArray(f.pee.stream) && f.pee.stream.length >= 5, 'Stream must be a multi-segment arc');
        const start = f.pee.stream[0];
        const end = f.pee.stream[f.pee.stream.length - 1];
        assert.ok(start[2] > 5.0, `Stream must start at torso height: ${start[2]}`);
        assert.equal(end[2], -7.0, `Stream must hit Thames low water level -7.0: ${end[2]}`);
        assert.ok(end[0] > 51.8, `Stream must arc over east rail (51.8): ${end[0]}`);
      }
    }
  }

  // All required states from specification and interface contract
  const expected = [
    'PREPARE', 'CAST', 'WAIT', 'NIBBLE', 'REEL', 'UNHOOK', 'DROP_FISH',
    'PREPARE_BREAK', 'WALK_TO_PEE', 'PEE', 'WALK_BACK', 'RETRIEVE_ROD', 'RESUME'
  ];
  for(const st of expected){
    assert.ok(visited.has(st), `Expected fisherman state ${st} was not visited`);
  }
});

test('dock cat routine executes observation, stalk, theft, sprint, eating on crate and return without solid penetration', ()=>{
  const visited = new Set();
  const T = LOOPS.CAT.T;
  const CAT_CRATE_BLOCK = [45.0, 20.2, 45.8, 21.0];
  const within = (i, j, r) => i >= r[0] && j >= r[1] && i <= r[2] && j <= r[3];

  for(let t = 0; t < T; t++){
    const c = catAt(t);
    const f = fisherAt(t);
    visited.add(c.state);

    // Surface bounds check: cat is on pier deck or on crate top
    assert.equal(portSurface(c.P.i, c.P.j), 'pier', `Cat out of pier bounds at t=${t}: [${c.P.i}, ${c.P.j}]`);
    assert.ok(Number.isFinite(c.P.i) && Number.isFinite(c.P.j) && Number.isFinite(c.P.z) && Number.isFinite(c.P.a), `Cat coords non-finite at t=${t}`);

    // Obstacle penetration check: if cat horizontal position enters crate footprint, it must be elevated on leap or top
    if(within(c.P.i, c.P.j, CAT_CRATE_BLOCK)){
      assert.ok(c.P.z >= DECK_Z + 0.5, `Cat penetrated inside solid crate footprint at deck elevation at t=${t}: z=${c.P.z}`);
    }

    // Opportunity trigger invariant: cat MUST be in WATCH while fisherman is fishing
    if(f.state === 'CAST' || f.state === 'WAIT' || f.state === 'NIBBLE' || f.state === 'REEL'){
      assert.equal(c.state, 'WATCH', `Cat must observe during fisherman fishing, got ${c.state} at t=${t}`);
      assert.equal(c.hasFish, false, 'Cat cannot have fish during normal fishing');
    }

    // While eating on crate
    if(c.state === 'EAT'){
      assert.ok(Math.abs(c.P.i - CAT_CRATE.i) < 0.1, `Cat eating position i=${c.P.i}`);
      assert.ok(Math.abs(c.P.j - CAT_CRATE.j) < 0.1, `Cat eating position j=${c.P.j}`);
      assert.ok(c.P.z >= DECK_Z + CAT_CRATE.h - 0.1, `Cat must be on top of crate: ${c.P.z}`);
      if(c.u < 0.70){
        assert.equal(c.eating, true, 'Cat must be eating fish in first phase');
        assert.ok(c.fishScale > 0 && c.fishScale <= 1, `Fish scale: ${c.fishScale}`);
      }
    }
  }

  const expectedCat = ['WATCH', 'STALK', 'STEAL', 'SPRINT', 'EAT', 'RETURN'];
  for(const st of expectedCat){
    assert.ok(visited.has(st), `Expected cat state ${st} was not visited`);
  }
});

test('larger pail and cat reach remain aligned without stepping into bucket',()=>{
  assert.ok(BUCKET.r>=.34, 'The pail mouth must be wide enough to read in 432x288');
  assert.ok(BUCKET.h>=3.4, 'The pail must be taller than the previous 2.5 units');
  assert.equal(districtBlocked(BUCKET.i+BUCKET.r-.025,BUCKET.j),true,
    'Expanded collision must cover the pail mouth');
  const approach=Math.hypot(CAT_STEAL_SPOT.i-BUCKET.i,CAT_STEAL_SPOT.j-BUCKET.j);
  assert.ok(approach>BUCKET.r+.18, 'The cat root must stay outside the pail');

  const early=catAt(phaseTime('cat','STEAL',.05));
  const dipping=catAt(phaseTime('cat','STEAL',.50));
  const leaving=catAt(phaseTime('cat','STEAL',.90));
  assert.equal(early.reach,0,'The paw starts at a natural resting position');
  assert.ok(dipping.reach>.9 && dipping.pawInBucket,'The paw enters the larger pail');
  assert.ok(leaving.reach<.01 && leaving.hasFish,'The paw retracts with the fish');

  // Numerical safety and smoothness at every step, including transitions.
  let prev=catAt(0);
  for(let t=1;t<LOOPS.CAT.T;t++){
    const cat=catAt(t);
    assert.ok(cat.reach>=0&&cat.reach<=1&&Number.isFinite(cat.reach));
    if(cat.state==='STEAL'&&prev.state==='STEAL')
      assert.ok(Math.abs(cat.reach-prev.reach)<.12, 'Reach should animate continuously');
    prev=cat;
  }
});

test('fish bucket inventory obeys closed-cycle conservation and triggers visual splashes', ()=>{
  const T = LOOPS.FISH.T;

  // Verify determinism
  for(let t = 0; t < 200; t += 23){
    assert.deepEqual(portLife(t), portLife(t), `Determinism failure at t=${t}`);
  }

  let dropTransitions = 0;
  let stealTransitions = 0;
  let prevCount = bucketAt(0).count;

  let sawDropSplash = false;
  let sawStealSplash = false;

  for(let t = 0; t < T; t++){
    const b = bucketAt(t);
    const c = catAt(t);
    const f = fisherAt(t);

    // Inventory bounds: strictly 2 or 3
    assert.ok(b.count === 2 || b.count === 3, `Invalid bucket count at t=${t}: ${b.count}`);

    // Closed-cycle conservation: count after one full period must exactly match
    assert.equal(b.count, bucketAt(t + T).count, `Cycle drift at t=${t}`);

    if(prevCount === 2 && b.count === 3){
      dropTransitions++;
      assert.equal(t, BUCKET_DROP_TICK, `Drop transition must occur at tick ${BUCKET_DROP_TICK}, occurred at ${t}`);
    }
    if(prevCount === 3 && b.count === 2){
      stealTransitions++;
      assert.equal(t, BUCKET_STEAL_TICK, `Steal transition must occur at tick ${BUCKET_STEAL_TICK}, occurred at ${t}`);
    }
    prevCount = b.count;

    if(f.state === 'DROP_FISH' && b.splash >= 0) sawDropSplash = true;
    if(c.state === 'STEAL' && b.splash >= 0) sawStealSplash = true;
  }

  assert.ok(sawDropSplash, 'Drop splash effect must trigger in bucket');
  assert.ok(sawStealSplash, 'Cat theft splash effect must trigger in bucket');
  assert.equal(dropTransitions, 1, 'Exactly one drop transition per cycle');
  assert.equal(stealTransitions, 1, 'Exactly one steal transition per cycle');
});


test('phaseTime accurately targets specific routine states for fisherman and cat', ()=>{
  for(const st of ['PREPARE', 'CAST', 'WAIT', 'REEL', 'DROP_FISH', 'PEE', 'WALK_BACK', 'RESUME']){
    const tick = phaseTime('fisher', st, 0.5);
    assert.ok(tick >= 0, `phaseTime failed for fisher ${st}`);
    const f = fisherAt(tick);
    assert.equal(f.state, st, `fisherAt(${tick}) state mismatch for ${st}`);
  }

  for(const st of ['WATCH', 'STALK', 'STEAL', 'SPRINT', 'EAT', 'RETURN']){
    const tick = phaseTime('cat', st, 0.5);
    assert.ok(tick >= 0, `phaseTime failed for cat ${st}`);
    const c = catAt(tick);
    assert.equal(c.state, st, `catAt(${tick}) state mismatch for ${st}`);
  }
});

