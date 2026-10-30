import test from 'node:test';
import assert from 'node:assert/strict';
import { DRINKER_A, DRINKER_B, drinkersAt, lonerAt, toWorld } from '../src/port-life.js';

test('barrel drinkers keep their heads apart', () => {
  let min=Infinity;
  for(let t=0;t<6000;t+=10){ const p=drinkersAt(t), a=toWorld(DRINKER_A,p.a.pose.head), b=toWorld(DRINKER_B,p.b.pose.head);
    min=Math.min(min,Math.hypot(a[0]-b[0],a[1]-b[1])*7.5); }
  assert.ok(min>5.5,`heads ${min.toFixed(2)} units apart`);
});

test('the wall loner brings the cigarette filter to his mouth and exhales from it', () => {
  let drags=0, exhales=0;
  for(let t=0;t<9000;t++){ const l=lonerAt(t);
    assert.ok(l.cig.bottom.every(Number.isFinite)&&l.mouth.every(Number.isFinite));
    if(l.drag>.99){ drags++; const d=Math.hypot((l.cig.bottom[0]-l.mouth[0])*7.5,(l.cig.bottom[1]-l.mouth[1])*7.5,l.cig.bottom[2]-l.mouth[2]);
      assert.ok(d<.3,`filter ${d.toFixed(2)} units from the lips`); }
    if(l.exhale) exhales++; }
  assert.ok(drags>0&&exhales>0);
});
