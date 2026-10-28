import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNING,PUNCH_COST,createCombatant,tickCombatant,punchCost,beginPunch,setGuard,beginSlip,evadeCost,classifyEvade,resolveNearMiss,resolvePunch} from '../src/realtime-rules.js';

const hit=(a,b,now,pid=0,low=false)=>resolvePunch(a,b,{pid,now,low});

test('repeat costs are independent by punch and reset exactly at two seconds',()=>{
  const f=createCombatant();
  for(let pid=0;pid<4;pid++)assert.equal(punchCost(f,pid,0),PUNCH_COST[pid]);
  assert.equal(beginPunch(f,0,0),true);
  assert.equal(punchCost(f,0,1.999),5*1.35);
  assert.equal(punchCost(f,1,1.999),9);
  assert.equal(punchCost(f,0,2),5);
  beginPunch(f,0,2);beginPunch(f,0,2.1);
  assert.equal(punchCost(f,0,2.2),5*1.7);
  assert.equal(punchCost(f,0,4.1),5);
});

test('unaffordable punches do not spend stamina or alter repeat history',()=>{
  const f=createCombatant({staCap:4}),before=structuredClone(f);
  assert.equal(beginPunch(f,0,0),false);assert.deepEqual(f,before);
  assert.equal(beginPunch(f,8,0),false);assert.equal(beginPunch(f,0,NaN),false);
  const exact=createCombatant({staCap:16});assert.equal(beginPunch(exact,3,0),true);assert.equal(exact.sta,0);
});

test('an allowed exhausted punch spends the remaining stamina and records the punch',()=>{
  const f=createCombatant(); f.sta=2;
  assert.equal(beginPunch(f,0,0,true),true); assert.equal(f.sta,0); assert.equal(f.punchRepeats[0],1);
  assert.equal(beginPunch(f,0,1,true),true); assert.equal(f.sta,0);
  assert.equal(beginPunch(f,9,2,true),false);
});

test('a clean body jab deals half damage and drains more stamina',()=>{
  const a=createCombatant(), b=createCombatant(); b.sta=50;
  const result=hit(a,b,1,0,true);
  assert.equal(result.damage,2.25); assert.equal(b.hp,122.75); assert.ok(Math.abs(b.sta-41.9)<1e-9);
});

test('stamina recovers at the increased rate without exceeding its cap',()=>{
  const f=createCombatant(); f.sta=50; tickCombatant(f,1,1); assert.equal(f.sta,62.5);
  tickCombatant(f,10,11); assert.equal(f.sta,f.staCap);
});

test('holding guard drains continuously, prevents regeneration and fails at zero',()=>{
  const a=createCombatant(),b=createCombatant({staCap:9});
  setGuard(b,true,0);tickCombatant(b,1,1);assert.equal(b.sta,0);
  assert.equal(hit(a,b,1).kind,'hit');assert.equal(b.hp,94);
  tickCombatant(b,2,3);assert.equal(b.sta,0);
  setGuard(b,false,3);tickCombatant(b,.5,3.5);assert.equal(b.sta,7);
  tickCombatant(b,2,5.5);assert.equal(b.sta,9);
});

test('normal guard absorbs damage with stamina and passes through the unpaid share',()=>{
  const a=createCombatant(),b=createCombatant({staCap:8});setGuard(b,true,0);
  assert.deepEqual(hit(a,b,.5),{kind:'block',damage:0,counter:false,failedSlip:false});assert.equal(b.sta,2);
  assert.equal(hit(a,b,.6).damage,4);assert.equal(b.hp,96);assert.equal(b.sta,0);
});

test('ideal guard includes the boundary and drains extra attacker stamina only once',()=>{
  const a=createCombatant(),b=createCombatant();beginPunch(a,1,0);setGuard(b,true,0);
  assert.equal(hit(a,b,.12,1,true).kind,'parry');assert.equal(b.hp,100);assert.equal(a.sta,100-9-TUNING.parryCost);
  assert.equal(hit(a,b,.12).kind,'block');
  setGuard(b,false,.13);setGuard(b,true,.14);assert.equal(hit(a,b,.15).kind,'block');
  setGuard(b,false,.3);setGuard(b,true,.3);assert.equal(hit(a,b,.31).kind,'parry');
});

test('holding guard does not refresh ideal timing',()=>{
  const a=createCombatant(),b=createCombatant();setGuard(b,true,0);setGuard(b,true,.5);
  assert.equal(hit(a,b,.51).kind,'block');
});

test('ideal slip avoids every basic head/body punch and grants one counter',()=>{
  for(let pid=0;pid<4;pid++)for(const low of [false,true]){
    const a=createCombatant(),b=createCombatant();assert.equal(beginSlip(b,0),true);
    assert.equal(hit(a,b,.16,pid,low).kind,'slip');assert.equal(b.hp,100);
    beginPunch(b,0,.2);assert.equal(hit(b,a,.3).damage,9);
    beginPunch(b,0,.31);assert.equal(hit(b,a,.4).counter,false);
  }
});

test('counter expires at one second and is consumed by a defended punch',()=>{
  const a=createCombatant(),b=createCombatant();beginSlip(b,0);hit(a,b,.1);
  beginPunch(b,0,1.1);assert.equal(hit(b,a,1.2).counter,false);
  const c=createCombatant(),d=createCombatant();beginSlip(d,0);hit(c,d,.1);setGuard(c,true,.2);
  beginPunch(d,0,.2);const blocked=hit(d,c,.21);assert.equal(blocked.kind,'parry');assert.equal(blocked.counter,true);
  beginPunch(d,0,.22);assert.equal(hit(d,c,.23).counter,false);
});

test('bad slip timing amplifies damage only during its vulnerability window',()=>{
  for(const [at,failed] of [[.16001,true],[.35,true],[.649,true],[.65,false]]){
    const a=createCombatant(),b=createCombatant();beginSlip(b,0);const r=hit(a,b,at);
    assert.equal(r.failedSlip,failed);assert.equal(r.damage,6*(failed?1.35:1));
  }
});

test('slip requires stamina and respects the exact cooldown boundary',()=>{
  const f=createCombatant();assert.equal(beginSlip(f,0),true);assert.equal(f.sta,90);
  assert.equal(beginSlip(f,.649),false);assert.equal(beginSlip(f,.65),true);
  assert.equal(beginSlip(createCombatant({staCap:9}),0),false);
});

test('damage respects strength and hunger, clamps hp and keeps stamina nonnegative',()=>{
  const a=createCombatant({pow:2,hunger:2}),b=createCombatant({hpMax:8});
  assert.equal(hit(a,b,0).damage,8);assert.equal(b.hp,0);assert.equal(beginPunch(b,0,0),false);
  const c=createCombatant({staCap:1});setGuard(b,true,0);b.hp=1;b.sta=1;hit(c,b,.1);assert.equal(c.sta,0);
});

test('pause is deterministic: no calls or zero elapsed time change the state',()=>{
  const f=createCombatant();beginSlip(f,0);beginPunch(f,0,.1);const before=structuredClone(f);
  tickCombatant(f,0,1000);tickCombatant(f,-1,1);tickCombatant(f,NaN,1);assert.deepEqual(f,before);
  const other=structuredClone(f);tickCombatant(f,.1,.2);tickCombatant(other,.1,.2);assert.deepEqual(f,other);
});


test('counter latches at launch, survives expiry in flight and is spent on a missed punch',()=>{
  const a=createCombatant(),b=createCombatant();beginSlip(b,0);hit(a,b,.1);
  beginPunch(b,0,1);assert.equal(b.counterUntil,-Infinity);
  assert.equal(hit(b,a,1.2).damage,9);assert.equal(b.punchCounter,false);
  beginSlip(b,2);hit(a,b,2.1);beginPunch(b,0,2.2);
  beginPunch(b,0,2.3);assert.equal(hit(b,a,2.4).counter,false);
});

test('an unaffordable punch preserves the waiting counter and any launched punch',()=>{
  const a=createCombatant(),b=createCombatant();beginSlip(b,0);hit(a,b,.1);
  b.sta=0;const until=b.counterUntil;assert.equal(beginPunch(b,0,.2),false);
  assert.equal(b.counterUntil,until);assert.equal(b.punchCounter,false);
  b.sta=5;assert.equal(beginPunch(b,0,.3),true);
  assert.equal(beginPunch(b,0,.4),false);assert.equal(b.punchCounter,true);
  assert.equal(hit(b,a,.5).counter,true);
});

test('evade cost grows while spamming, a refused evade leaves the fatigue alone and it fades after evadeReset',()=>{
  const f=createCombatant({staCap:100});
  assert.equal(evadeCost(f,0),TUNING.slipCost);
  assert.equal(beginSlip(f,0,'left'),true);assert.equal(f.evadeFatigue,1);
  assert.equal(evadeCost(f,.7),TUNING.slipCost*(1+TUNING.evadeStep));
  assert.equal(beginSlip(f,.7,'right'),true);assert.equal(f.evadeFatigue,2);
  f.sta=5;assert.equal(beginSlip(f,1.4,'back'),false);assert.equal(f.evadeFatigue,2);
  tickCombatant(f,.1,.7+TUNING.evadeReset);
  assert.equal(f.evadeFatigue,0);assert.equal(evadeCost(f,.7+TUNING.evadeReset),TUNING.slipCost);
});

test('evade fatigue resets on a landed punch and on a perfect near miss, which also opens the counter window',()=>{
  const a=createCombatant(),d=createCombatant();
  beginSlip(a,0,'in');beginSlip(a,.7,'left');assert.equal(a.evadeFatigue,2);
  beginPunch(a,0,1);assert.equal(resolvePunch(a,d,{pid:0,now:1.1}).kind,'hit');assert.equal(a.evadeFatigue,0);
  beginSlip(d,2,'back');beginSlip(d,2.7,'back');assert.equal(d.evadeFatigue,2);
  assert.equal(resolveNearMiss(a,d,{gap:1.55,range:1.4,now:2.85}),true);
  assert.equal(d.evadeFatigue,0);assert.ok(d.counterUntil>2.85);
  const q=createCombatant();beginSlip(q,0,'slip');assert.equal(resolveNearMiss(a,q,{gap:1.5,range:1.4,now:.1}),false,'the in-place slip has no near miss');
});

test('a dash in that gets under the punch is a perfect evade',()=>{
  const a=createCombatant(),d=createCombatant();beginSlip(d,0,'in');
  assert.equal(resolvePunch(a,d,{pid:1,now:.2,gap:.9,range:1.4}).kind,'slip');
  const e=createCombatant();beginSlip(e,0,'in');
  assert.equal(resolvePunch(a,e,{pid:1,now:.2,gap:1.3,range:1.4}).kind,'hit');
});

test('screen direction maps onto the fighter-to-opponent axis as in, back, left or right',()=>{
  const ui=Math.SQRT1_2,uj=-Math.SQRT1_2;
  assert.equal(classifyEvade(ui,uj,ui,uj).kind,'in');
  assert.equal(classifyEvade(-ui,-uj,ui,uj).kind,'back');
  assert.equal(classifyEvade(-Math.SQRT1_2,-Math.SQRT1_2,ui,uj).kind,'left');
  assert.equal(classifyEvade(Math.SQRT1_2,Math.SQRT1_2,ui,uj).kind,'right');
});
