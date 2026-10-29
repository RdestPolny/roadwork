import test from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICT, PLAN_AREA, PORT_LIFE, portRoutine, portSurface, districtBlocked } from '../src/port-district.js';

test('extended port builds at least twice the original plan with connected timber decks',()=>{
  assert.ok(PLAN_AREA>2*30*13,`expanded plan: ${PLAN_AREA} tiles²`);
  assert.equal(portSurface(15,7),'stone');
  assert.equal(portSurface(35,8),'stone');
  assert.equal(portSurface(35,14.5),'terrace');
  assert.equal(portSurface(47,20),'pier');
  assert.equal(portSurface(46.5,12.9),'stone');
  assert.equal(portSurface(46.5,13.1),'pier');
  assert.equal(portSurface(46.5,25.2),null);
  assert.equal(portSurface(31,18),null,'outside decks is the river');
});

test('buildings and stored goods block travel, with public passages left open',()=>{
  for(const [i,j] of [[33,3],[44,2],[49,3],[43.5,5.7],[49.5,11.4],[40.5,12]]){
    assert.equal(districtBlocked(i,j),true,`blocked at ${i},${j}`);
  }
  for(const [i,j] of [[29,6],[30.2,6.8],[35.5,8],[41,5.2],[47,9],[36,14.5],[47,21]]){
    assert.equal(districtBlocked(i,j),false,`open at ${i},${j}`);
  }
  assert.deepEqual(DISTRICT.pier,[42.2,13,51.8,25]);
});

test('13 decorative characters have staggered multi-phase routines with no teleport at the loop seam',()=>{
  assert.ok(PORT_LIFE.length>=10&&PORT_LIFE.length<=14);
  assert.equal(new Set(PORT_LIFE.map(n=>n.id)).size,PORT_LIFE.length);
  const phases=new Set();
  for(const n of PORT_LIFE){
    const seen=new Set();
    for(let t=0;t<n.cycle;t+=Math.max(1,Math.floor(n.cycle/80))){
      const p=portRoutine(t-n.shift,n); seen.add(p.stage); phases.add(p.stage);
      assert.equal(Number.isFinite(p.i)&&Number.isFinite(p.j),true);
      assert.equal(portSurface(p.i,p.j)!==null,true,`${n.id} stays on port terrain`);
    }
    assert.ok(seen.size>=3,`${n.id} has working phases`);
    const before=portRoutine(n.cycle-1-n.shift,n),after=portRoutine(n.cycle-n.shift,n);
    assert.ok(Math.hypot(before.i-after.i,before.j-after.j)<.1,`${n.id} has seamless loop`);
  }
  assert.deepEqual([...phases].sort(),['approach','rest','return','work']);
});
