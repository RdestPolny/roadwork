import test from 'node:test';
import assert from 'node:assert/strict';
import { DISTRICT, PLAN_AREA, portSurface, districtBlocked } from '../src/port-district.js';

test('extended port builds at least twice the original plan with connected timber decks',()=>{
  assert.ok(PLAN_AREA>2*30*13,`expanded plan: ${PLAN_AREA} tiles²`);
  assert.equal(portSurface(15,7),'stone');
  assert.equal(portSurface(35,8),'stone');
  assert.equal(portSurface(35,14.5),null,'the sloping shore is not walkable');
  assert.equal(portSurface(47,20),'pier');
  assert.equal(portSurface(46.5,12.9),'stone');
  assert.equal(portSurface(46.5,13.1),'pier');
  assert.equal(portSurface(46.5,25.2),null);
  assert.equal(portSurface(31,18),null,'outside decks is the river');
});

test('buildings and stored goods block travel, with public passages left open',()=>{
  // [31.7,6.8] and [39.45,8.8]: the barrels by the pub; [48.7,12.6]: the edge of the plank stack in the timber yard.
  for(const [i,j] of [[33,3],[44,2],[49,3],[43.5,5.7],[49.5,11.4],[48.5,18.7],[31.7,6.8],[39.45,8.8],[48.7,12.6]]){
    assert.equal(districtBlocked(i,j),true,`blocked at ${i},${j}`);
  }
  for(const [i,j] of [[29,6],[30.2,6.8],[35.5,8],[41,5.2],[40.5,12],[41.2,12.1],[40.25,11.2],[47,9],[47,21]]){
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
    for(const a of [p.fisher,p.pub.a,p.pub.b,p.loner,p.drunk,p.musician,p.yard.wood,p.yard.hand,p.yard.fore])
      assert.ok(Number.isFinite(a.P.i)&&Number.isFinite(a.P.j)&&portSurface(a.P.i,a.P.j),`actor outside port at ${t}`);
    assert.ok(['ON_TABLE','HELD_BY_NPC'].includes(p.pub.mug.state));
    assert.ok(['ON_TABLE','HELD_BY_NPC'].includes(p.pub.bottle.state));
    assert.ok(Number.isFinite(p.fisher.rod.tip[0]));
  }
  for(const state of ['WAIT','CAST','REEL','UNHOOK','DROP_FISH']) assert.ok(fish.has(state),state);
  for(const state of ['PICK_UP_PLANK','WALK_TO_BENCH','SAW','PLACE_ON_STACK']) assert.ok(work.has(state),state);
});

test('fixed props: one footprint each, collision from the footprint, depth key from the centre unless hand-tuned',async()=>{
  const { PORT_PROPS, propBlocked, propKey, propDraws } = await import('../src/port-district.js');
  const ids=PORT_PROPS.map(p=>p.id).filter(id=>id!=='bollard');
  assert.equal(new Set(ids).size,ids.length,'ids are unique (bollards share their art)');
  for(const p of PORT_PROPS){
    assert.ok(!!p.box!==!!p.circle,`${p.id}: a box or a circle`);
    if(p.box) assert.ok(p.box[0]<p.box[2]&&p.box[1]<p.box[3],`${p.id}: box runs from the near to the far corner`);
    const [i,j]=p.circle?p.circle:[(p.box[0]+p.box[2])/2,(p.box[1]+p.box[3])/2];
    assert.equal(propBlocked(i,j),p.block!==false||PORT_PROPS.some(q=>q!==p&&q.block!==false&&q.box&&i>=q.box[0]&&i<=q.box[2]&&j>=q.box[1]&&j<=q.box[3]),`${p.id}: centre blocked as declared`);
  }
  const crates=PORT_PROPS.find(p=>p.id==='quay_crates');
  assert.equal(propBlocked(crates.box[0]-.15,crates.box[1]+.5),true,'the clearance pad widens the old quay footprints');
  assert.equal(propKey({id:'x',box:[1,2,3,4]}),5);assert.equal(propKey({id:'x',circle:[2,3,.5]}),5);assert.equal(propKey(crates),16.3);
  const drawn=[];const pairs=propDraws({bollard:p=>drawn.push(p.circle[0])});
  assert.equal(pairs.length,5);pairs.forEach(([,draw])=>draw());assert.deepEqual(drawn,[2.2,8.5,16.5,21.8,28.2]);
  assert.throws(()=>propDraws({no_such_prop:()=>{}}),/without a footprint/);
});
