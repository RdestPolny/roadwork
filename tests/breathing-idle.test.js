import test from 'node:test';
import assert from 'node:assert/strict';
import { mocapBreathingIdle, IDLE_TICKS } from '../src/mocap-breathing-idle.js';
import { refitFigure, RIG } from '../src/fighter-rig.js';

const dist=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));
test('breathing idle loops continuously and fits the exploration rig',()=>{
  assert.equal(IDLE_TICKS,595);
  const first=mocapBreathingIdle(0), later=mocapBreathingIdle(.25);
  assert.ok(dist(first.head,later.head)>.1,'the imported clip actually moves');
  assert.deepEqual(mocapBreathingIdle(1).head,first.head);
  assert.ok(dist(mocapBreathingIdle(.99999).head,first.head)<.01,'no jump at the loop boundary');
  for(let k=0;k<24;k++){
    const J=refitFigure(mocapBreathingIdle(k/24));
    for(const side of [-1,1]){
      const a=J(side);
      for(const joint of [a.hip,a.knee,a.foot,a.sh,a.el,a.hd]) assert.ok(joint.every(Number.isFinite));
      assert.ok(Math.abs(dist(a.hip,a.knee)-RIG.legUpper)<.001);
      assert.ok(Math.abs(dist(a.knee,a.foot)-RIG.legLower)<.001);
    }
  }
});
