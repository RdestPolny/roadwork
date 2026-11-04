import test from 'node:test';
import assert from 'node:assert/strict';
import { BULL, createBullState, registerBullMiss, advanceBull, bullTiming, runLength, beginRun, chainHook, wantsCharge, beginCharge, launchCharge, chargeCatches, absorbBullHit } from '../src/heavy-bruiser.js';

test('three heavy misses open a vulnerable breath window only after recovery',()=>{
  const b=createBullState();
  for(let n=0;n<3;n++) registerBullMiss(b,2,n);
  assert.equal(b.pending,true);
  assert.equal(advanceBull(b,2.2,true),'APPROACH');
  assert.equal(advanceBull(b,2.5,false),'EXHAUSTED');
  assert.equal(b.missLoad,0);
  assert.equal(advanceBull(b,4.0,false),'EXHAUSTED');
  assert.equal(advanceBull(b,5.11,false),'RESUME');
  assert.equal(advanceBull(b,5.7,false),'APPROACH');
});
test('jabs have smaller penalty, rest decays fatigue and blocked blows do not count',()=>{
  const b=createBullState();
  registerBullMiss(b,0,0); registerBullMiss(b,0,0.3);
  assert.ok(b.missLoad<1);
  const before=b.missLoad;
  advanceBull(b,1,false);
  assert.ok(b.missLoad<before);
  assert.equal(b.pending,false);
});
test('heavy profile does not mutate common timing or damage arrays',()=>{
  const p={hit:.19,end:.48}, heavy=bullTiming(p,true);
  assert.equal(p.hit,.19);
  assert.ok(heavy.hit>p.hit&&heavy.end>p.end);
  assert.equal(bullTiming(p,false),p);
  assert.deepEqual(BULL.damage,[1.1,1.5,1.8,1.6]);
});

test('missing a hook causes longer recovery than hitting a target',()=>{
  const missed=createBullState(), hit=createBullState();
  missed.mode='ATTACK';hit.mode='ATTACK';
  registerBullMiss(missed,2,0.1);
  assert.equal(advanceBull(missed,0.8,false),'RECOVERY');
  assert.equal(advanceBull(hit,0.8,false),'RECOVERY');
  assert.ok(missed.until>hit.until+0.3,'whiff grants the player a longer counter opportunity');
});

test('a run is 2 to 4 hooks, the first with the long warning tell, and the chain continues without a recovery',()=>{
  assert.equal(runLength(0),2); assert.equal(runLength(0.5),3); assert.equal(runLength(0.99),4);
  const b=createBullState(); beginRun(b,10,3);
  assert.equal(b.mode,'WINDUP'); assert.equal(b.until,10+BULL.warnWind); assert.equal(b.run.left,2);
  b.mode='ATTACK'; b.lastAt=11; assert.equal(advanceBull(b,11.5,false),'CHAIN');
  assert.ok(chainHook(b,11.5)); assert.equal(b.until,11.5+BULL.chainWind); assert.equal(b.run.left,1);
  b.mode='ATTACK'; chainHook(b,12); b.mode='ATTACK'; assert.equal(advanceBull(b,12.6,false),'RECOVERY'); assert.equal(b.run,null);
});

test('the charge starts only from a distance and off cooldown, and catches a man only on its line',()=>{
  const b=createBullState();
  assert.equal(wantsCharge(b,1,3),false);   // too early in the fight
  assert.equal(wantsCharge(b,b.chargeAt,1.5),false); assert.equal(wantsCharge(b,b.chargeAt,3),true);
  beginCharge(b,5); launchCharge(b,6,1,0); assert.equal(b.mode,'CHARGE'); assert.equal(wantsCharge(b,7,3),false);
  assert.equal(chargeCatches(0.8,0.3),true); assert.equal(chargeCatches(0.8,1.2),false); assert.equal(chargeCatches(2,0),false);
});

test('tiredness waits until a charge is over',()=>{
  const b=createBullState(); b.mode='CHARGE'; b.pending=true; b.lastAt=1;
  assert.equal(advanceBull(b,1.5,false),'CHARGE');
});

test('windup armor absorbs a jab spam but a heavier run of blows still cancels the hook',()=>{
  const b=createBullState();
  beginRun(b,0,3);
  assert.equal(b.armor,BULL.armor);
  for(let n=0;n<4;n++) assert.equal(absorbBullHit(b,0),true,'jab '+n);
  assert.equal(absorbBullHit(b,1),true);
  assert.equal(absorbBullHit(b,0),false,'armor spent');
  b.mode='RECOVERY'; b.armor=BULL.armor;
  assert.equal(absorbBullHit(b,2),false,'no armor while recovering');
  const c=Object.assign(createBullState(),{run:{left:1,first:false}});
  chainHook(c,0);
  assert.equal(c.armor,BULL.armor,'each hook of a run is loaded with fresh armor');
});
