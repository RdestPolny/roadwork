import test from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICT, PLAN_AREA, portSurface, districtBlocked } from '../src/port-district.js';

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
