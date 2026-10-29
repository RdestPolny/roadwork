import test from 'node:test';
import assert from 'node:assert/strict';
import {DASH,dashTravel,dashPose,dashDirection} from '../src/combat-dash.js';

test('dash easing remains monotonic, advances in its first frames and lands precisely',()=>{
  assert.equal(dashTravel(0),0); assert.equal(dashTravel(1),1);
  let previous=0;
  for(let n=1;n<=100;n++){const v=dashTravel(n/100);assert.ok(v>=previous&&v<=1);previous=v;}
  assert.ok(dashTravel(.1)>0&&dashTravel(.75)>.8);
  assert.ok(dashPose(.05).load>0&&dashPose(.4).push>0&&dashPose(.9).land>0);
});

test('eight compass directions and fallback are normalized without altering the aim',()=>{
  for(const [x,y] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
    const [i,j]=dashDirection([x,y],[0,0]);assert.ok(Math.abs(Math.hypot(i,j)-1)<1e-9);
    assert.equal(Math.sign(i),Math.sign(x));assert.equal(Math.sign(j),Math.sign(y));
  }
  assert.deepEqual(dashDirection([0,0],[-2,0]),[-1,0]);
  assert.deepEqual(dashDirection([0,0],[0,0]),[0,0]);
  assert.ok(DASH.cooldown>=DASH.duration&&DASH.punchFrom<1);
});
