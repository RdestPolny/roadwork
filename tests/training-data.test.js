import test from 'node:test';
import assert from 'node:assert/strict';
import {DRILLS, PRISON_TRIALS, gradeFor, challengeMult, freshness, sessionScore, sessionXP, nextUnlocked, recommendedStage, primaryTree} from '../src/training-data.js';

test('every drill has five stages (work one, Cień z Profesorem three), shares summing to 1 and a primary tree', () => {
  for(const d of Object.values(DRILLS)){
    assert.equal(d.stages.length,d.id==='work'?1:d.id==='shadowp'?3:5,d.id);
    assert.ok(Math.abs(d.tree.str+d.tree.spd+d.tree.end-1)<1e-9,d.id);
    assert.ok(['str','spd','end'].includes(primaryTree(d)));
    if(d.roundSec) assert.equal(d.roundSec.length,5);
  }
});

test('grades, challenge, freshness and recommended stage follow the plan', () => {
  assert.deepEqual([gradeFor(100),gradeFor(95),gradeFor(94),gradeFor(85),gradeFor(70),gradeFor(50),gradeFor(49)],['S','S','A','A','B','C','D']);
  assert.equal(challengeMult(1,6),1);
  assert.equal(challengeMult(1,15),0.3);
  assert.equal(challengeMult(1,8),0.8);
  assert.equal(challengeMult(5,10),1.15);
  assert.deepEqual([0,1,2,3,4,9].map(n=>freshness(n)),[1,1,0.8,0.6,0.4,0.4]);
  assert.deepEqual([0,1,2,5].map(n=>freshness(n,true)),[1,0.7,0.4,0.4]);
  assert.deepEqual([1,6,7,12,13,19,25,30].map(recommendedStage),[1,1,2,2,3,4,5,5]);
});

test('scores multiply quality and completion; XP follows grade, stage and trained part', () => {
  const shadow=DRILLS.shadow, full={combos:10,errors:0,actions:40,paceSum:40};
  const r=sessionScore(shadow,full,1);
  assert.equal(r.grade,'S'); assert.equal(r.completion,1);
  const xp=sessionXP(shadow,1,r,{str:1,spd:1,end:1},0,false);
  assert.deepEqual(xp,{str:0,spd:117,end:63});   // 120 × 1.5
  const short=sessionScore(shadow,{...full,combos:3},1);
  assert.ok(sessionXP(shadow,1,short,{str:1,spd:1,end:1},0,false).end<xp.end/2);
  const aborted=sessionXP(shadow,1,{grade:'S',completion:0.5,quality:1,score:50},{str:1,spd:1,end:1},0,true);
  assert.deepEqual(sessionXP(shadow,1,{grade:'D',completion:1,quality:0,score:0},{str:1,spd:1,end:1},0,false),{str:0,spd:0,end:0},'idle sessions pay nothing');
  assert.deepEqual(sessionXP(shadow,1,{grade:'S',completion:1,quality:0,score:0},{str:1,spd:1,end:1},0,true),{str:0,spd:0,end:0});
  assert.equal(aborted.end,Math.round(120*0.5*0.5*0.35));
  const tired=sessionXP(shadow,1,r,{str:1,spd:20,end:1},4,false);
  assert.ok(tired.end<xp.end*0.2,'an easy stage repeated many times pays little');
  assert.equal(nextUnlocked(1,1,'B'),2); assert.equal(nextUnlocked(1,1,'C'),1); assert.equal(nextUnlocked(3,1,'S'),3); assert.equal(nextUnlocked(5,5,'S'),5);
});

test('sets, brigade and shadow sessions compute their own quality', () => {
  assert.equal(sessionScore(DRILLS.work,{squats:10,perfect:10,norma:100},1).score,100);
  assert.equal(sessionScore(DRILLS.pushup,{reps:9,points:9},2).completion,9/20);
  const shadow=sessionScore(DRILLS.shadow,{combos:10,errors:2,actions:40,paceSum:56},2);
  assert.equal(shadow.score,Math.round(100*(0.6*0.9+0.4*Math.min(1,1.4/1.2))));
});

test('fight XP rewards stars, the result and the style of the fight', async () => {
  const {fightXP}=await import('../src/training-data.js');
  const base={bare:false,stars:1,outcome:'win',simulated:false,today:0,levelGap:0,landed:0,power:0,knockdowns:0,evades:0,counters:0,minutes:0,blocks:0,endSta:0};
  const sum=x=>x.str+x.spd+x.end;
  assert.ok(Math.abs(sum(fightXP(base))-240)<=1);
  assert.ok(Math.abs(sum(fightXP({...base,stars:3,outcome:'ko'}))-240*1.7*1.25)<=1);
  assert.ok(Math.abs(sum(fightXP({...base,simulated:true}))-60)<=1);
  assert.ok(Math.abs(sum(fightXP({...base,today:1}))-168)<=1);
  assert.ok(Math.abs(sum(fightXP({...base,bare:true,outcome:'loss'}))-108)<=1);
  const puncher=fightXP({...base,landed:40,power:20,knockdowns:2}), dancer=fightXP({...base,evades:30,counters:12});
  assert.ok(puncher.str>puncher.spd&&puncher.str>puncher.end);
  assert.ok(dancer.spd>dancer.str);
  for(const x of [puncher,dancer]) for(const v of Object.values(x)) assert.ok(v>=Math.floor(sum(x)*0.2)-1,'every tree gets at least ~20%');
  assert.ok(sum(fightXP({...base,levelGap:20}))<sum(fightXP(base))*0.6);
});

test('clean moments of a card fight add 3% fight XP each, at most 30%', async () => {
  const {fightXP}=await import('../src/training-data.js');
  const base={bare:true,stars:1,outcome:'win',simulated:false,today:0,levelGap:0,landed:5,power:2,knockdowns:0,evades:1,counters:0,minutes:1,blocks:0,endSta:0.5};
  const sum=f=>Object.values(fightXP(f)).reduce((a,b)=>a+b,0);
  const plain=sum(base), five=sum({...base,perfects:5}), many=sum({...base,perfects:40});
  assert.ok(Math.abs(five/plain-1.15)<0.02, 'five clean moments: +15%');
  assert.ok(Math.abs(many/plain-1.3)<0.02, 'capped at +30%');
});


test('available drills and trials use Newgate activities', () => {
  assert.deepEqual(Object.keys(DRILLS).sort(),['pullup','pushup','roach','shadow','shadowp','work']);
  assert.deepEqual(Object.keys(PRISON_TRIALS).sort(),['end:10','spd:10','str:10']);
  for(const trial of Object.values(PRISON_TRIALS)) if(trial.drill) assert.ok(DRILLS[trial.drill]);
  assert.equal(PRISON_TRIALS['str:10'].drill,'pushup');
  assert.equal(PRISON_TRIALS['spd:10'].drill,'shadowp');
  const endurance=PRISON_TRIALS['end:10'];
  assert.equal(endurance.yard,true); assert.equal(endurance.minStars,2);
  assert.equal(endurance.ok({win:true,minSta:0.15}),true);
  assert.equal(endurance.ok({win:true,minSta:0.14}),false);
  assert.equal(endurance.ok({win:false,minSta:1}),false);
});
