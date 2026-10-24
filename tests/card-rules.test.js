import test from 'node:test';
import assert from 'node:assert/strict';
import {mulberry,makeFighter,newDuel,queueSkill,unqueue,canQueue,skillCost,startExchange,resolveBlow,nextBlow,layBlows,reactWindow,getUp,aiPlan,aiReaction,tells,useZone} from '../src/card-rules.js';
import {CARDS,STYLE_SKILLS,REACT,tempoOf,LIVER_EVERY} from '../src/card-data.js';

const NONE={kind:'none',grade:'late'};
/** A duel with the given skill sets and perks and a long stamina bar. */
function setup(skillsA,skillsB,perksA=[],perksB=[],seed=7){
  const rng=mulberry(seed);
  const d=newDuel(makeFighter({skills:skillsA,perks:perksA}),makeFighter({skills:skillsB,perks:perksB}),rng);
  for(const f of d.f) f.sta=f.staMax=20;
  return {d,rng};
}
const q=(d,side,...ids)=>{ for(const id of ids){ const r=queueSkill(d,side,id); assert.equal(r,'',`${id}: ${r}`); } };
/** Play the exchange; `react(blow)` answers each blow for its defender. */
function play(d,rng,react=()=>NONE){
  const ev=[...startExchange(d,rng)];
  while(d.phase==='fight'){ const b=nextBlow(d); if(!b) break; ev.push(...resolveBlow(d,react(b),rng)); }
  return ev;
}
const hits=(ev,side)=>ev.filter(e=>e.t==='hit'&&e.side===side);

test('every skill has a tempo: a jab 1, a cross 2, an uppercut 3, a combination one more per punch', () => {
  assert.deepEqual(['jab','cross','hook','upper','raz-dwa','burza'].map(id=>tempoOf(CARDS[id])),[1,2,2,3,2,3]);
  for(const c of Object.values(CARDS)) assert.ok(c.cost>=0&&c.speed>=1&&c.text,'skill '+c.id);
  for(const set of Object.values(STYLE_SKILLS)) for(const id of set) assert.ok(CARDS[id],id);
});

test('stamina is the only limit of the queue; a skill goes back with Backspace; once-a-brawl skills once', () => {
  const {d}=setup(['jab','cross','dobicie'],[]);
  d.f[0].sta=5;
  q(d,0,'jab','cross','jab');
  assert.equal(canQueue(d,0,'cross'),'kondycja');
  assert.equal(canQueue(d,0,'upper'),'skill','only the skills of the set');
  unqueue(d,0); assert.equal(d.f[0].spent,3); assert.deepEqual(d.f[0].queue.map(x=>x.card),['jab','cross']);
  d.f[0].sta=20; q(d,0,'dobicie'); assert.equal(canQueue(d,0,'dobicie'),'raz');
  d.f[0].inj.ribs=1; assert.equal(skillCost(d.f[0],'hook'),3,'a broken rib makes the hook dearer');
});

test('both queues go onto one clock by tempo: three jabs land before an uppercut that steps in', () => {
  const {d,rng}=setup(['jab'],['upper']);
  q(d,0,'jab','jab','jab'); q(d,1,'upper');
  assert.deepEqual(layBlows(d,1).map(b=>b.t),[4],'the first close punch steps in: +1');
  startExchange(d,rng);
  assert.deepEqual(d.blows.map(b=>`${b.side}:${b.use}@${b.t}`),['0:jab@1','0:jab@2','0:jab@3','1:upper@4']);
});

test('a combination splits into its punches; each is defended on its own', () => {
  const {d,rng}=setup(['raz-dwa'],[]);
  q(d,0,'raz-dwa');
  let n=0;
  const ev=play(d,rng,()=>n++===0?{kind:'parry',grade:'good'}:NONE);
  assert.deepEqual(ev.filter(e=>e.t==='hit'||e.t==='parry').map(e=>e.t+':'+(e.card||'')),['parry:jab','hit:cross']);
});

test('dodge: easy, avoids everything, costs a point of the next turn; late, the punch hits harder', () => {
  let {d,rng}=setup([],['cross']); q(d,1,'cross');
  let ev=play(d,rng,()=>({kind:'dodge',grade:'good'}));
  assert.ok(ev.some(e=>e.t==='dodge')&&!hits(ev,1).length);
  assert.equal(d.phase,'plan'); assert.equal(d.f[0].sta,19,'the next bar is a point shorter');
  ({d,rng}=setup([],['cross'])); q(d,1,'cross');
  ev=play(d,rng,()=>({kind:'dodge',grade:'late'}));
  assert.equal(hits(ev,1)[0].tag,'odsloniety'); assert.equal(hits(ev,1)[0].dmg,Math.round(4*0.95*1.5));
  assert.equal(d.f[0].sta,19,'a failed dodge costs too');
  assert.ok(REACT.dodge.ok>REACT.parry.ok,'the dodge window is wider than the parry');
});

test('a late dodge against a punch with a special effect raises the effect instead of the damage', () => {
  const {d,rng}=setup([],['watroba']); q(d,1,'watroba');
  const ev=play(d,rng,()=>({kind:'dodge',grade:'late'}));
  assert.equal(hits(ev,1)[0].dmg,Math.round(3*0.95),'no extra damage');
  assert.equal(ev.find(e=>e.t==='zadyszka').level,2,'Zadyszka 1 + 1');
});

test('parry: hard; clean it stops the punch and gives an Otwarcie worth its cost; missed it still stops half', () => {
  let {d,rng}=setup([],['cross']); q(d,1,'cross');
  let ev=play(d,rng,()=>({kind:'parry',grade:'perfect'}));
  assert.ok(ev.some(e=>e.t==='parry')); assert.equal(d.f[0].open,2); assert.equal(d.f[0].perfects,1);
  assert.equal(d.f[0].sta,19);
  ({d,rng}=setup([],['cross'])); q(d,1,'cross');
  ev=play(d,rng,()=>({kind:'parry',grade:'late'}));
  assert.equal(hits(ev,1)[0].tag,'blok'); assert.equal(hits(ev,1)[0].dmg,Math.round(4*0.95*0.75),'Przebicie: a cross gets three quarters through');
  ({d,rng}=setup([],['hook'])); q(d,1,'hook');
  ev=play(d,rng,()=>({kind:'parry',grade:'late'}));
  assert.equal(hits(ev,1)[0].dmg,2,'half of 4×0.95');
  ({d,rng}=setup([],['upper'])); q(d,1,'upper');
  ev=play(d,rng,()=>({kind:'parry',grade:'late'}));
  assert.equal(hits(ev,1)[0].dmg,Math.round(7*0.95*0.75),'a heavy punch gets three quarters through a missed parry');
});

test('the Otwarcie from a parried uppercut: Przelot takes the rival\'s next move, the counter is a critical', () => {
  const {d,rng}=setup(['cross'],['upper','jab']);
  q(d,1,'upper','jab');
  const ev=play(d,rng,b=>b.side===1?{kind:'parry',grade:'good'}:NONE);
  assert.ok(ev.some(e=>e.t==='przelot'&&e.card==='jab'),'his jab is lost');
  assert.equal(d.f[0].open,3);
  q(d,0,'cross');
  const ev2=play(d,rng);
  assert.equal(hits(ev2,0)[0].dmg,Math.round(4*0.95*2)); assert.equal(hits(ev2,0)[0].level,3);
});

test('a body shot landing during a heavy wind-up stops it', () => {
  const {d,rng}=setup(['jab-k'],['upper']);
  q(d,0,'jab-k'); q(d,1,'upper');
  const ev=play(d,rng);
  assert.ok(ev.some(e=>e.t==='fizzle'&&e.tag==='zamach przerwany'));
  assert.ok(!hits(ev,1).length);
});

test('knockdown, the count and the end of the exchange; two knockdowns end the brawl', () => {
  const {d,rng}=setup(['upper','jab'],[]);
  d.f[1].stun=6; q(d,0,'upper','jab');
  play(d,rng);
  assert.equal(d.phase,'getup'); assert.equal(d.down,1);
  getUp(d,true,rng);
  assert.equal(d.phase,'plan','getting up ends the exchange: the jab after it is not thrown');
  d.f[1].stun=6; q(d,0,'upper'); play(d,rng);
  assert.equal(d.phase,'over'); assert.equal(d.end,'nokdaun');
});

test('the reserve clears the head and makes the fresher one first next turn', () => {
  const {d,rng}=setup(['jab'],['jab']);
  d.f[0].sta=d.f[1].sta=5; d.f[0].stun=2; q(d,0,'jab'); q(d,1,'jab','jab','jab','jab');
  const ev=play(d,rng);
  assert.equal(d.init,0); assert.ok(ev.some(e=>e.t==='reserve'&&e.side===0));
  assert.equal(d.f[0].stun,0,'four jabs to the head, then decay 2 and four points of reserve');
});

test('reaction windows narrow with heavy legs, being dazed and a black eye; Lekka stopa widens the dodge', () => {
  const {d}=setup([],['cross']);
  const base=reactWindow(d,0,'dodge','jab').ok;
  d.f[0].x.legsTurn=d.turn; assert.ok(reactWindow(d,0,'dodge','jab').ok<base);
  d.f[0].x.legsTurn=0; d.f[0].stun=4; assert.ok(reactWindow(d,0,'parry','jab').ok<REACT.parry.ok);
  d.f[0].stun=0; d.f[0].inj.eyeR=true; assert.ok(reactWindow(d,0,'dodge','jab').ok<base,'his left comes in on your right');
  d.f[0].perks.push('light-feet'); d.f[0].inj.eyeR=false; assert.ok(reactWindow(d,0,'dodge','jab').ok>base);
});

test('reading: nothing by default, count and stamina at 1, heavy moves at 2, every skill with Strefa', () => {
  const {d}=setup([],['jab','upper'],['the-zone']);
  q(d,1,'jab','upper');
  assert.equal(tells(d,0).level,0);
  d.f[0].read=1; assert.deepEqual([tells(d,0).count,tells(d,0).spent,tells(d,0).moves.length],[2,4,0]);
  d.f[0].read=2; assert.deepEqual(tells(d,0).moves.map(m=>m.heavy),[false,true]);
  assert.ok(useZone(d,0)); assert.deepEqual(tells(d,0).moves.map(m=>m.card),['jab','upper']);
});

test('the AI queues within its stamina and never dodges: it blocks or takes it', () => {
  for(let s=1;s<30;s++){
    const rng=mulberry(s), d=newDuel(makeFighter({style:'press'}),makeFighter({style:'counter'}),rng);
    aiPlan(d,1,rng); aiPlan(d,0,rng);
    for(const f of d.f){ assert.ok(f.spent<=f.sta); assert.ok(f.queue.every(x=>f.skills.includes(x.card))); }
    startExchange(d,rng);
    while(d.phase==='fight'){ const r=aiReaction(d,rng); assert.notEqual(r.kind,'dodge'); resolveBlow(d,r,rng); }
  }
});

test('brawls end: AI against AI, KO, TKO or the Sunday limit', () => {
  for(let s=1;s<40;s++){
    const rng=mulberry(s), d=newDuel(makeFighter({style:'bal'}),makeFighter({style:'out'}),rng,{maxTurns:s%3?0:12});
    for(let n=0;n<60&&d.phase!=='over';n++){
      aiPlan(d,0,rng); aiPlan(d,1,rng); startExchange(d,rng);
      while(d.phase==='fight'||d.phase==='getup') if(d.phase==='getup') getUp(d,rng()<0.7,rng); else resolveBlow(d,aiReaction(d,rng),rng);
    }
    assert.equal(d.phase,'over','seed '+s);
  }
});

/* ---------- the statuses of the plain punches (CIOSY.md §2) ---------- */

/** A fixed roll: every chance below it happens. */
const roll=(/** @type {number} */ v)=>()=>v;

test('Ustawienie: a landed jab sets up the next punch that is not a jab; a cross cashes it for more', () => {
  const {d,rng}=setup(['jab','cross','hook'],[]);
  q(d,0,'jab','jab','cross','jab','hook');
  assert.deepEqual(hits(play(d,rng),0).map(e=>e.dmg),[2,2,Math.round(4*0.95+2),2,Math.round(4*0.95+1)],'a jab after a jab gets nothing');
});

test('Zachwianie: a clean hook takes the rival\'s next move by chance; Ustawienie raises the chance', () => {
  let {d}=setup(['hook'],['cross']); q(d,0,'hook'); q(d,1,'cross','cross');
  assert.ok(play(d,roll(0.2)).some(e=>e.t==='fizzle'&&e.tag==='zachwiany'),'25% happens below 0.25');
  ({d}=setup(['hook'],['cross'])); q(d,0,'hook'); q(d,1,'cross','cross');
  assert.ok(!play(d,roll(0.3)).some(e=>e.tag==='zachwiany'));
  ({d}=setup(['jab','hook'],['cross'])); q(d,0,'jab','hook'); q(d,1,'cross','cross','cross');
  assert.ok(play(d,roll(0.3)).some(e=>e.t==='fizzle'&&e.tag==='zachwiany'),'×1.5 after a jab');
});

test('Rozbita garda: an uppercut, landed or blocked, makes the block hold at most 40% till the end of the next turn', () => {
  const {d,rng}=setup(['upper','hook'],[]);
  d.f[0].pow=10; d.f[1].hp=d.f[1].hpMax=999; q(d,0,'upper');
  const late={kind:'parry',grade:'late'};
  assert.ok(play(d,rng,()=>late).some(e=>e.t==='guard'&&e.side===1));
  q(d,0,'hook');
  assert.equal(hits(play(d,rng,()=>late),0)[0].dmg,Math.round(40*0.6),'not half');
});

test('heavy legs: a body jab makes the rival\'s later punches land a tempo later', () => {
  const {d,rng}=setup(['jab-k'],['jab']); q(d,0,'jab-k'); q(d,1,'jab','jab');
  startExchange(d,rng);
  const ev=resolveBlow(d,NONE,rng);
  assert.ok(ev.some(e=>e.t==='slow'&&e.side===1));
  assert.deepEqual(d.blows.slice(d.step).map(b=>`${b.side}@${b.t}`),['1@2','1@3']);
});

test('Odepchnięcie: a body cross makes the rival\'s next close-range move step in again', () => {
  const {d,rng}=setup(['splot'],['jab','hook']); q(d,0,'splot'); q(d,1,'jab','hook');
  startExchange(d,rng);
  resolveBlow(d,NONE,rng);                                   // his jab
  const ev=resolveBlow(d,NONE,rng);                          // the splot
  assert.ok(ev.some(e=>e.t==='push'&&e.card==='hook'));
  assert.equal(d.blows.find(b=>b.card==='hook').t,5,'the hook steps in from 4 to 5');
});

test('Wątroba: every third landed liver hook of a brawl is a Skurcz', () => {
  const {d}=setup(['watroba'],['jab']); q(d,0,...Array(LIVER_EVERY).fill('watroba')); q(d,1,...Array(2*LIVER_EVERY+2).fill('jab'));
  const ev=play(d,roll(0.5));
  assert.equal(ev.filter(e=>e.t==='skurcz').length,1,'only the last one');
  assert.equal(d.f[1].x.liver,LIVER_EVERY);
});

test('Zgięty: after a body uppercut the next head punch goes through a block; the AI does not even try', () => {
  const {d,rng}=setup(['zoladek','cross'],[]); q(d,0,'zoladek','cross');
  startExchange(d,rng);
  assert.ok(resolveBlow(d,{kind:'parry',grade:'late'},rng).some(e=>e.t==='bent'&&e.side===1));
  assert.equal(aiReaction(d,rng).kind,'none');
  const ev=resolveBlow(d,{kind:'parry',grade:'late'},rng);
  assert.equal(hits(ev,0)[0].tag,'przebicie'); assert.equal(hits(ev,0)[0].dmg,Math.round(4*0.95));
  assert.equal(d.f[1].x.bentTurn,0,'one punch only');
});

test('Zadyszka shortens only the next bar, and the body shots of one turn do not add up', () => {
  const {d,rng}=setup([],['watroba','splot']);
  d.f[0].sta=d.f[0].staMax=5; q(d,1,'watroba','splot');
  play(d,rng);
  assert.equal(d.f[0].staMax,5); assert.equal(d.f[0].sta,4,'two body shots: still −1');
  play(d,rng); assert.equal(d.f[0].sta,5,'the turn after it is gone');
});

test('a cheap punch costs the defender no debt; a telegraphed one is easier to stop', () => {
  const {d,rng}=setup([],['jab']); q(d,1,'jab','jab');
  startExchange(d,rng);
  const base=reactWindow(d,0,'dodge','jab').ok;
  resolveBlow(d,{kind:'dodge',grade:'good'},rng);
  assert.equal(reactWindow(d,0,'dodge','jab').ok,base+2,'the same jab again: a wider ring');
  resolveBlow(d,{kind:'dodge',grade:'good'},rng);
  assert.equal(d.f[0].sta,20,'dodging jabs is free');
});
