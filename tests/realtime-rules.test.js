import test from 'node:test';
import assert from 'node:assert/strict';
import {TUNING,PUNCH_COST,PUNCH_DAMAGE,createCombatant,tickCombatant,punchCost,beginPunch,setGuard,beginSlip,evadeCost,classifyEvade,resolveNearMiss,resolvePunch} from '../src/realtime-rules.js';

const hit=(a,b,now,pid=0,low=false)=>resolvePunch(a,b,{pid,now,low});
/** Equal up to float rounding. @param {number} actual @param {number} expected */
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} ≈ ${expected}`);

test('repeat costs are independent by punch, chain into combos and reset exactly at repeatReset',()=>{
  const f=createCombatant(),R=TUNING.repeatReset,jab=PUNCH_COST[0];
  for(let pid=0;pid<4;pid++)assert.equal(punchCost(f,pid,0),PUNCH_COST[pid]);
  assert.equal(beginPunch(f,0,0),true);
  near(punchCost(f,0,R-.001),jab*(1+TUNING.repeatStep));   // past the combo window: only the repeat counts
  assert.equal(punchCost(f,1,R-.001),PUNCH_COST[1]);
  assert.equal(punchCost(f,0,R),jab);
  beginPunch(f,0,R);beginPunch(f,0,R+.1);
  near(punchCost(f,0,R+.2),jab*(1+2*TUNING.repeatStep+2*TUNING.comboStep));
  assert.equal(punchCost(f,0,(R+.1)+R),jab);
});

test('unaffordable punches do not spend stamina or alter repeat history',()=>{
  const f=createCombatant({staCap:4}),before=structuredClone(f);
  assert.equal(beginPunch(f,0,0),false);assert.deepEqual(f,before);
  assert.equal(beginPunch(f,8,0),false);assert.equal(beginPunch(f,0,NaN),false);
  const exact=createCombatant();exact.sta=20;exact.sta=punchCost(exact,3,0);
  near(exact.sta,PUNCH_COST[3]*TUNING.lowStaCostMult);assert.equal(beginPunch(exact,3,0),true);assert.equal(exact.sta,0);
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
  const a=createCombatant(),b=createCombatant({staCap:TUNING.guardDrain});
  setGuard(b,true,0);tickCombatant(b,1,1);assert.equal(b.sta,0);
  assert.equal(hit(a,b,1).kind,'hit');assert.equal(b.hp,b.hpMax-PUNCH_DAMAGE[0]);
  tickCombatant(b,2,3);assert.equal(b.sta,0);
  setGuard(b,false,3);tickCombatant(b,.5,3.5);near(b.sta,.5*TUNING.regen);
  tickCombatant(b,2,5.5);assert.equal(b.sta,b.staCap);
});

test('normal guard pays the blockable share with stamina, lets chip damage through and passes the unpaid share',()=>{
  const a=createCombatant(),dmg=PUNCH_DAMAGE[0],chip=dmg*TUNING.blockChip,need=(dmg-chip)*TUNING.guardAbsorbCost;
  const b=createCombatant({staCap:need*1.5});setGuard(b,true,0);
  const first=hit(a,b,.5);assert.equal(first.kind,'block');near(first.damage,chip);near(b.sta,need*.5);
  const second=hit(a,b,.6);near(second.damage,chip+(dmg-chip)*.5);assert.equal(b.sta,0);near(b.hp,b.hpMax-first.damage-second.damage);
});

test('ideal guard includes the boundary and drains extra attacker stamina only once',()=>{
  const a=createCombatant(),b=createCombatant(),P=TUNING.guardPerfect;beginPunch(a,1,0);setGuard(b,true,0);
  assert.equal(hit(a,b,P,1,true).kind,'parry');assert.equal(b.hp,b.hpMax);near(a.sta,a.staCapInitial-PUNCH_COST[1]-TUNING.parryCost);
  assert.equal(hit(a,b,P).kind,'block');
  setGuard(b,false,P+.01);setGuard(b,true,P+.02);assert.equal(hit(a,b,P+.03).kind,'block','a re-press inside guardRearm is not ideal');
  setGuard(b,false,TUNING.guardRearm);setGuard(b,true,TUNING.guardRearm);assert.equal(hit(a,b,TUNING.guardRearm+.01).kind,'parry');
});

test('holding guard does not refresh ideal timing',()=>{
  const a=createCombatant(),b=createCombatant();setGuard(b,true,0);setGuard(b,true,.5);
  assert.equal(hit(a,b,.51).kind,'block');
});

test('ideal slip avoids every basic head/body punch and grants one counter',()=>{
  for(let pid=0;pid<4;pid++)for(const low of [false,true]){
    const a=createCombatant(),b=createCombatant();assert.equal(beginSlip(b,0),true);
    assert.equal(hit(a,b,TUNING.slipPerfect,pid,low).kind,'slip');assert.equal(b.hp,b.hpMax);
    beginPunch(b,0,.2);near(hit(b,a,.3).damage,PUNCH_DAMAGE[0]*TUNING.counterPower);
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
  const V=TUNING.slipVulnerable;
  for(const [at,failed] of [[TUNING.slipPerfect+1e-5,true],[TUNING.slipActive,true],[V-.001,true],[V,false]]){
    const a=createCombatant(),b=createCombatant();beginSlip(b,0);const r=hit(a,b,at);
    assert.equal(r.failedSlip,failed);near(r.damage,PUNCH_DAMAGE[0]*(failed?TUNING.failedSlipPower:1));
  }
});

test('slip requires stamina and respects the exact cooldown boundary',()=>{
  const f=createCombatant(),C=TUNING.slipCooldown;assert.equal(beginSlip(f,0),true);assert.equal(f.sta,f.staCap-TUNING.slipCost);
  assert.equal(beginSlip(f,C-.001),false);assert.equal(beginSlip(f,C),true);
  assert.equal(beginSlip(createCombatant({staCap:TUNING.slipCost-1}),0),false);
});

test('damage respects strength and hunger, clamps hp and keeps stamina nonnegative',()=>{
  const a=createCombatant({pow:2,hunger:2}),raw=PUNCH_DAMAGE[0]*2-2;
  assert.equal(hit(a,createCombatant(),0).damage,raw);
  const b=createCombatant({hpMax:raw-2});
  assert.equal(hit(a,b,0).damage,raw-2);assert.equal(b.hp,0);assert.equal(beginPunch(b,0,0),false);
  const c=createCombatant({staCap:1});setGuard(b,true,0);b.hp=1;b.sta=1;hit(c,b,.1);assert.equal(c.sta,0);
});

test('pause is deterministic: no calls or zero elapsed time change the state',()=>{
  const f=createCombatant();beginSlip(f,0);beginPunch(f,0,.1);const before=structuredClone(f);
  tickCombatant(f,0,1000);tickCombatant(f,-1,1);tickCombatant(f,NaN,1);assert.deepEqual(f,before);
  const other=structuredClone(f);tickCombatant(f,.1,.2);tickCombatant(other,.1,.2);assert.deepEqual(f,other);
});


test('counter latches at launch, survives expiry in flight and is spent on a missed punch',()=>{
  const a=createCombatant(),b=createCombatant(),late=.1+TUNING.counterDuration-.01;beginSlip(b,0);hit(a,b,.1);
  beginPunch(b,0,late);assert.equal(b.counterUntil,-Infinity);
  near(hit(b,a,late+.2).damage,PUNCH_DAMAGE[0]*TUNING.counterPower);assert.equal(b.punchCounter,false);
  beginSlip(b,2);hit(a,b,2.1);beginPunch(b,0,2.2);
  beginPunch(b,0,2.3);assert.equal(hit(b,a,2.4).counter,false);
});

test('an unaffordable punch preserves the waiting counter and any launched punch',()=>{
  const a=createCombatant(),b=createCombatant();beginSlip(b,0);hit(a,b,.1);
  b.sta=0;const until=b.counterUntil;assert.equal(beginPunch(b,0,.2),false);
  assert.equal(b.counterUntil,until);assert.equal(b.punchCounter,false);
  b.sta=5;b.sta=punchCost(b,0,.3);assert.equal(beginPunch(b,0,.3),true);
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

test('stamina zones change at their borders with a margin, and a worn ceiling keeps a fighter tired',async()=>{
  const {updateStaminaZone,secondWind,ZONES}=await import('../src/realtime-rules.js');
  const f=createCombatant({staCap:100});
  f.sta=50;assert.equal(updateStaminaZone(f),0);
  f.sta=44;assert.equal(updateStaminaZone(f),1);
  f.sta=50;assert.equal(updateStaminaZone(f),1,'no flicker back above the border');
  f.sta=56;assert.equal(updateStaminaZone(f),0);
  f.sta=19;assert.equal(updateStaminaZone(f),2);f.sta=25;assert.equal(updateStaminaZone(f),2);f.sta=31;assert.equal(updateStaminaZone(f),1);
  assert.ok(ZONES[2].walk<ZONES[1].walk&&ZONES[1].walk<ZONES[0].walk&&ZONES[2].punch<1&&ZONES[2].guard<ZONES[1].guard);
  const worn=createCombatant({staCap:100});worn.staCap=40;worn.sta=40;assert.equal(updateStaminaZone(worn),1,'body work keeps him tired at full breath');
  const g=createCombatant({staCap:100});g.sta=5;updateStaminaZone(g);assert.equal(secondWind(g),0);assert.equal(g.sta,60);
  worn.sta=10;updateStaminaZone(worn);secondWind(worn);assert.equal(worn.sta,40,'a second wind never passes the ceiling');
});

test('a clean body hook wears the ceiling down noticeably; a late tired guard does not block; a clinch speeds recovery',()=>{
  const a=createCombatant(),b=createCombatant({staCap:300});
  hit(a,b,1,2,true);assert.ok(300-b.staCap>=14,'body hook cuts the ceiling: '+b.staCap);
  const c=createCombatant(),d=createCombatant();setGuard(d,true,0);
  assert.equal(resolvePunch(c,d,{pid:1,now:1,guardLate:true}).kind,'hit');
  assert.equal(resolvePunch(c,d,{pid:1,now:2}).kind,'block');
  const e=createCombatant({staCap:100}),h=createCombatant({staCap:100});e.sta=h.sta=10;
  tickCombatant(e,1,1);tickCombatant(h,1,1,TUNING.clinchRegen);assert.equal(h.sta-10,2*(e.sta-10));
});

test('a fresh guard parries, but an unparryable blow only counts as a block',()=>{
  const mk=()=>{ const a=createCombatant(), d=createCombatant(); setGuard(d,true,0); return [a,d]; };
  const [a,d]=mk(); assert.equal(resolvePunch(a,d,{pid:2,now:0.05}).kind,'parry');
  const [a2,d2]=mk(); assert.equal(resolvePunch(a2,d2,{pid:2,now:0.05,noParry:true}).kind,'block');
});
