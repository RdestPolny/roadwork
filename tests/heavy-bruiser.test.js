import test from 'node:test';
import assert from 'node:assert/strict';
import { BULL, createBullState, registerBullMiss, advanceBull, bullTiming } from '../src/heavy-bruiser.js';

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
