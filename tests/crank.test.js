import test from 'node:test';
import assert from 'node:assert/strict';
import {DURATION,TARGET,TAU,crankOffset,createCrank,isRising,holdCrank,releaseCrank,tickCrank} from '../src/crank-rules.js';

/** Follow half-turns with the selected input pattern. */
function play(mode='rhythm'){
  const c=createCrank();let frame=0;
  while(!c.done){
    holdCrank(c,mode==='rhythm'?isRising(c):mode==='held'?true:mode==='spam'?frame%2===0:false);
    tickCrank(c);frame++;
  }
  return c;
}

test('six to twelve is the upward half; twelve to six is the release half',()=>{
  const c=createCrank();
  for(const angle of [0,Math.PI*.5,TAU+.2]){c.angle=angle;assert.equal(isRising(c),true);}
  for(const angle of [Math.PI,Math.PI*1.5,TAU*2-.001]){c.angle=angle;assert.equal(isRising(c),false);}
});

test('the grip turns away from the worker: right side up, left side down',()=>{
  const bottom=crankOffset(0,11),right=crankOffset(Math.PI/2,11),top=crankOffset(Math.PI,11),left=crankOffset(Math.PI*1.5,11);
  assert.equal(bottom.y,11);assert.equal(right.x,11);assert.equal(top.y,-11);assert.equal(left.x,-11);
  assert.ok(crankOffset(Math.PI-.1,11).x>crankOffset(Math.PI+.1,11).x,'the grip travels left, away from the worker, across the top');
});

test('good hold/release rhythm builds speed and beats idle, held and indiscriminate spam',()=>{
  const c=play();assert.ok(c.turns>=TARGET);assert.ok(c.best>=8);
  for(const mode of ['idle','held','spam'])assert.ok(play(mode).turns<c.turns/2);
  assert.ok(c.goodTime/c.workTime>.98);
});

test('early input changes only stop motion; correcting the grip resumes the same turn',()=>{
  const c=createCrank();holdCrank(c,true);tickCrank(c,.5);
  const rising=c.angle;holdCrank(c,false);tickCrank(c,.5);assert.equal(c.angle,rising);
  holdCrank(c,true);tickCrank(c,.5);assert.ok(c.angle>rising);
  tickCrank(c,3);assert.equal(c.angle,Math.PI);
  holdCrank(c,false);tickCrank(c,.3);const falling=c.angle;
  holdCrank(c,true);tickCrank(c,.5);assert.equal(c.angle,falling);
  holdCrank(c,false);tickCrank(c,3);assert.equal(c.turns,1);assert.equal(c.angle,0);
});

test('clearing held input preserves the mechanism for pause',()=>{
  const c=createCrank();holdCrank(c,true);tickCrank(c,.5);
  const expected={...c,held:false};releaseCrank(c);assert.deepEqual(c,expected);
});

test('only full revolutions score, and a revolution landing on the bell does not',()=>{
  const c=createCrank();c.angle=TAU-.02;c.speed=2;tickCrank(c,1/60);
  assert.equal(c.turns,1);
  const end=createCrank();end.elapsed=DURATION-.01;end.angle=TAU-.019;end.speed=2;tickCrank(end,.01);
  assert.equal(end.turns,0);assert.equal(end.elapsed,DURATION);assert.equal(end.done,true);
});

test('the final bell freezes both work and input; invalid time cannot advance it',()=>{
  const c=play(),frozen=structuredClone(c);tickCrank(c,3);holdCrank(c,true);assert.deepEqual(c,frozen);
  const fresh=createCrank(),initial=structuredClone(fresh);for(const dt of [NaN,0,-1])tickCrank(fresh,dt);assert.deepEqual(fresh,initial);
  assert.deepEqual(play(),play());
});


test('the top and bottom wait for the next grip change',()=>{
  const c=createCrank();holdCrank(c,true);tickCrank(c,4);
  assert.equal(c.angle,Math.PI);assert.equal(c.turns,0);
  holdCrank(c,false);tickCrank(c,4);
  assert.equal(c.angle,0);assert.equal(c.turns,1);
  tickCrank(c,4);assert.equal(c.turns,1);assert.equal(c.angle,0);
});
