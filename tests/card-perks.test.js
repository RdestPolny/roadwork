import test from 'node:test';
import assert from 'node:assert/strict';
import {mulberry,makeFighter,newDuel,queueSkill,canQueue,startExchange,resolveBlow,nextBlow,reactWindow,tells,useZone,aiPlan,aiReaction,getUp,layBlows} from '../src/card-rules.js';
import {PERK_CARDS,skillsFor,CARDS,RIVALS,rivalSkills,REACT,NODE_READY,STYLE_SKILLS} from '../src/card-data.js';
import {TRAITS} from '../src/skill-data.js';
import {BARE_PERKS} from '../src/prison-data.js';

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
const DODGE={kind:'dodge',grade:'good'}, PARRY={kind:'parry',grade:'good'}, CLEAN_PARRY={kind:'parry',grade:'perfect'};
/** The player (side 0) reacts with `r` to the rival's blows. @param {any} r */
const mine=r=>(/** @type {any} */ b)=>b.side===1?r:NONE;

test('every Cecha and Spacerniak perk has a skill-fight meaning, and its skills exist', () => {
  for(const id of [...Object.values(TRAITS).flat(2),...BARE_PERKS.map(p=>p.id)]){
    assert.ok(PERK_CARDS[id],'perk '+id);
    for(const c of PERK_CARDS[id].cards||[]) assert.ok(CARDS[c],'skill '+c);
  }
  assert.deepEqual(skillsFor(['dirty-work','economist']).slice(-2),['lokiec','zbyka']);
});

test('Siła: body hammer, executioner, finisher, rope pressure and demolition', () => {
  let {d,rng}=setup(['watroba'],[],['body-hammer']); q(d,0,'watroba');
  assert.equal(play(d,rng).find(e=>e.t==='zadyszka').level,2);
  ({d,rng}=setup(['cross'],[],['executioner'])); d.f[1].sta=2; q(d,0,'cross');
  assert.equal(hits(play(d,rng),0)[0].dmg,7,'4×0.95 + 3');
  ({d,rng}=setup(['watroba','cross'],[],['finisher'])); q(d,0,'watroba','cross');
  assert.equal(hits(play(d,rng),0)[1].dmg,6,'head after body: ×1.5');
  ({d,rng}=setup(['cross'],[],['rope-pressure'])); d.f[1].sta=2; q(d,0,'cross');
  assert.equal(hits(play(d,rng),0)[0].dmg,5);
  ({d,rng}=setup(['jab','cross','hook'],[],['demolition'])); q(d,0,'jab','cross','hook');
  assert.equal(hits(play(d,rng),0)[2].dmg,Math.round(4*0.95*1.5),'the third different punch +50% (the jab set-up +1 went to the cross)');
});

test('Siła: guard breaker cracks the next block, the charged cross goes through any block', () => {
  let {d,rng}=setup(['jab','hook'],[],['guard-breaker']); q(d,0,'jab','hook');
  const ev=play(d,rng,()=>PARRY.grade?{kind:'parry',grade:'late'}:NONE);
  assert.equal(hits(ev,0)[1].dmg,Math.round(4*0.95*0.6),'after a blocked punch a block holds only 40%');
  ({d,rng}=setup(['cross'],[],['charged-punch'])); q(d,0,'cross');
  assert.equal(hits(play(d,rng,()=>CLEAN_PARRY),0)[0].dmg,Math.round(4*0.95*0.7),'even a clean parry lets 70% through');
});

test('Siła: liver hunter, cracked ribs, crusher, shock', () => {
  let {d,rng}=setup(['watroba'],['jab','cross'],['liver-hunter']); q(d,0,'watroba'); q(d,1,'jab','cross','cross');
  let ev=play(d,rng); assert.ok(ev.some(e=>e.t==='skurcz'),'the liver takes his next move');
  ({d,rng}=setup(['watroba'],[],['cracked-ribs'])); q(d,0,'watroba');
  assert.ok(play(d,rng).some(e=>e.t==='injury'&&e.injury==='rib'));
  ({d,rng}=setup(['jab-k'],[],['crusher'])); q(d,0,'jab-k','jab-k','jab-k','jab-k','jab-k');
  assert.ok(play(d,rng).some(e=>e.t==='broken')); assert.equal(d.f[1].sta,20-1,'broken: a point less every turn');
  ({d,rng}=setup(['upper'],[],['shock'])); d.f[0].open=1; q(d,0,'upper');
  play(d,rng); assert.ok(d.f[1].locked); assert.equal(d.f[1].sta,18,'stunned: two points less');
});

test('Siła: dirty work, the shove, Dobicie', () => {
  let {d,rng}=setup(['lokiec'],[],[],[],3); q(d,0,'lokiec');
  assert.equal(hits(play(d,rng),0)[0].card,'lokiec');
  ({d,rng}=setup([],['hook','jab'],['shove'])); q(d,1,'hook','jab');
  let ev=play(d,rng,mine(PARRY)); assert.ok(ev.some(e=>e.t==='fizzle'&&e.tag==='odepchniety'&&e.card==='jab'));
  ({d,rng}=setup(['dobicie'],[])); q(d,0,'dobicie');
  ev=play(d,rng); assert.ok(ev.some(e=>e.t==='whiff'&&e.tag==='widzi')); assert.equal(d.f[1].open,3,'a fresh man sees it coming');
  ({d,rng}=setup(['dobicie'],[])); d.f[1].stun=4; q(d,0,'dobicie');
  play(d,rng); assert.equal(d.phase,'getup');
});

test('Szybkość: double jab, one-two-three, sting, Miarka, momentum and level change', () => {
  let {d,rng}=setup(['jab'],[],['double-jab'],[],1); q(d,0,'jab','jab','jab');
  assert.ok(hits(play(d,rng),0).length>3,'a free jab after a landed one');
  ({d,rng}=setup(['jab'],[],['one-two-three'])); q(d,0,'jab','jab');
  assert.ok(hits(play(d,rng),0).some(e=>e.card==='cross'));
  ({d,rng}=setup(['jab'],['cross'],['sting'])); q(d,0,'jab','jab'); q(d,1,'cross','cross');
  startExchange(d,rng); const before=d.blows.filter(b=>b.side===1).map(b=>b.t).join();
  while(d.phase==='fight') resolveBlow(d,NONE,rng);
  assert.ok(d.f[1].x.slowTurn===1,'his later punches came a tempo slower: '+before);
  ({d,rng}=setup(['jab','upper'],[],['vanishing-target'])); q(d,0,'jab','upper');
  assert.equal(hits(play(d,rng,b=>b.use==='upper'?PARRY:NONE),0).find(e=>e.card==='upper')?.tag,'przebicie','after a landed jab the uppercut cannot be blocked');
  ({d,rng}=setup(['jab','cross'],[],['momentum'])); q(d,0,'jab','jab','cross');
  assert.equal(layBlows(d,0).at(-1).t,1+1+1,'the third move a tempo quicker');
  ({d,rng}=setup(['jab','jab-k'],[],['level-change'])); q(d,0,'jab','jab-k','jab');
  assert.deepEqual(layBlows(d,0).map(b=>b.t),[1,2,3],'never quicker than one tempo');
});

test('Szybkość: mirror counter, overreach, ghost, duck and launch, counterpuncher, flurry', () => {
  let {d,rng}=setup([],['cross'],['mirror-counter']); q(d,1,'cross');
  let ev=play(d,rng,mine(DODGE)); assert.ok(hits(ev,0).some(e=>e.card==='cross'),'the dodged cross comes back');
  ({d,rng}=setup([],['jab'],['overreach'])); q(d,1,'jab');
  play(d,rng,mine({kind:'dodge',grade:'perfect'})); assert.equal(d.f[0].open,3);
  ({d,rng}=setup([],['jab'],['ghost'])); q(d,1,'jab');
  play(d,rng,mine(DODGE)); assert.equal(d.f[0].open,1);
  ({d,rng}=setup([],['jab'])); q(d,1,'jab'); play(d,rng,mine(DODGE)); assert.equal(d.f[0].open,0,'a plain dodge gives no Otwarcie');
  ({d,rng}=setup(['upper'],['hook'],['duck-launch'])); q(d,1,'hook');
  play(d,rng,mine(DODGE)); q(d,0,'upper');
  assert.equal(layBlows(d,0)[0].t,3,'the uppercut a tempo quicker (it still steps in)');
  ({d,rng}=setup(['jab'],['jab'],['counterpuncher'])); q(d,1,'jab'); play(d,rng,mine(DODGE)); q(d,0,'jab');
  assert.equal(hits(play(d,rng),0)[0].dmg,3,'+1 after a good defence');
  ({d,rng}=setup(['jab'],[],['flurry'])); q(d,0,'jab','jab','jab');
  play(d,rng); assert.equal(d.f[0].sta,21,'+1 stamina next turn after three clean');
});

test('Szybkość: light feet and the fencer widen the windows; read tells, the zone, the storm', () => {
  const {d}=setup([],[],['light-feet','parry']);
  assert.equal(reactWindow(d,0,'dodge').ok,REACT.dodge.ok+3); assert.equal(reactWindow(d,0,'parry').ok,REACT.parry.ok+2);
  d.f[0].x.legsTurn=1; assert.equal(reactWindow(d,0,'dodge').ok,REACT.dodge.ok+3,'heavy legs do not narrow it');
  const r=makeFighter({perks:['read-tells']}); assert.equal(r.read,2);
  const z=setup([],['jab'],['the-zone']); q(z.d,1,'jab'); assert.ok(useZone(z.d,0)); assert.equal(tells(z.d,0).moves[0].card,'jab'); assert.ok(!useZone(z.d,0));
  const s=setup(['burza'],[],['storm']); q(s.d,0,'burza');
  assert.deepEqual(hits(play(s.d,s.rng),0).map(e=>e.card),['jab','hook','jab']);
});

test('Wytrzymałość: economist, iron guard, thick skin, tough body, breather, efficient evade, elastic guard', () => {
  let {d,rng}=setup(['jab'],[],['economist']); q(d,0,'jab'); play(d,rng); assert.equal(d.f[0].sta,21);
  ({d,rng}=setup([],['hook'],['iron-guard'])); q(d,1,'hook');
  assert.equal(hits(play(d,rng,mine({kind:'parry',grade:'late'})),1)[0].dmg,1,'a missed parry stops 70%');
  ({d,rng}=setup([],['cross'],['thick-skin'])); q(d,1,'cross'); assert.equal(hits(play(d,rng),1)[0].dmg,3);
  ({d,rng}=setup([],['watroba'],['tough-body'])); q(d,1,'watroba'); const ev=play(d,rng);
  assert.equal(hits(ev,1)[0].dmg,2); assert.ok(!ev.some(e=>e.t==='zadyszka'));
  ({d,rng}=setup([],[],['breather'])); d.f[0].sta=5; d.f[0].stun=6; play(d,rng); assert.equal(d.f[0].stun,0);
  ({d,rng}=setup([],['cross'],['efficient-evade'])); q(d,1,'cross'); play(d,rng,mine(DODGE)); assert.equal(d.f[0].sta,20,'a dodge under a 2-point punch is free');
  ({d,rng}=setup([],['cross'],['elastic-guard'])); q(d,1,'cross'); play(d,rng,mine(CLEAN_PARRY)); assert.equal(d.f[0].sta,20);
});

test('Wytrzymałość: shell, fortress, clinch, perpetuum, warrior heart, last stand, rise, cornerman, second wind, grinder, adrenaline', () => {
  let {d,rng}=setup([],['cross'],['shell']); q(d,1,'cross','cross'); play(d,rng,mine(DODGE)); assert.equal(d.f[0].sta,19,'only the first defence is free');
  ({d,rng}=setup([],['jab'],['fortress'])); q(d,1,'jab','jab','jab'); play(d,rng,mine(PARRY)); assert.ok(d.f[1].locked);
  ({d,rng}=setup([],[],['clinch'])); d.f[0].sta=d.f[0].staMax=5; play(d,rng); assert.equal(d.f[0].sta,7,'two points of the reserve carry over');
  ({d,rng}=setup([],['watroba'],['perpetuum'])); q(d,1,'watroba'); assert.ok(!play(d,rng).some(e=>e.t==='zadyszka'));
  ({d,rng}=setup([],['upper'],['last-stand'])); d.f[0].hp=2; q(d,1,'upper'); play(d,rng); assert.equal(d.f[0].hp,1); assert.ok(d.phase!=='over');
  ({d,rng}=setup(['upper'],[],[],['rise'])); d.f[1].stun=6; d.f[1].hp=20; q(d,0,'upper'); play(d,rng); getUp(d,true,rng);
  assert.ok(d.f[1].hp>20,'Wstań i walcz');
  ({d,rng}=setup(['upper'],[],['cornerman'])); d.f[1].stun=6; q(d,0,'upper'); play(d,rng); getUp(d,true,rng); assert.equal(d.f[0].sta,22);
  ({d,rng}=setup(['jab'],[],['second-wind'])); d.f[0].sta=1; q(d,0,'jab'); play(d,rng); assert.equal(d.f[0].sta,22);
  ({d,rng}=setup([],['jab'],['grinder'])); d.f[0].sta=5; d.f[1].sta=2; q(d,1,'jab','jab'); play(d,rng); assert.equal(d.f[1].sta,19);
  ({d,rng}=setup([],['upper'],['adrenaline'])); q(d,1,'upper'); play(d,rng,mine(PARRY)); assert.equal(d.f[0].sta,21,'Otwarcie III: +2, the parry −1');
});

test('Spacerniak: sand, thumb, surprise, knuckles, kidneys, jaw', () => {
  let {d,rng}=setup(['piach'],['jab']); q(d,0,'piach'); play(d,rng); assert.equal(tells(d,1).level,0); assert.equal(d.f[1].x.blindTurn,2);
  ({d,rng}=setup(['kciuk'],['jab'])); q(d,0,'kciuk'); q(d,1,'jab','jab');
  let ev=play(d,rng); assert.ok(ev.some(e=>e.t==='thumb')); assert.ok(d.f[1].inj.eyeL||d.f[1].inj.eyeR); assert.ok(ev.some(e=>e.t==='fizzle'&&e.tag==='skulony'));
  ({d,rng}=setup(['kciuk'],[])); q(d,0,'kciuk'); ev=play(d,rng,()=>DODGE); assert.ok(ev.some(e=>e.t==='waste'),'a dodge beats the thumb');
  assert.equal(makeFighter({perks:['zaskoczenie']}).open,1);
  ({d,rng}=setup(['hook'],[],['kostki'])); q(d,0,'hook'); assert.equal(hits(play(d,rng),0)[0].dmg,5);
  ({d,rng}=setup(['nerki'],[])); q(d,0,'nerki'); ev=play(d,rng); assert.equal(hits(ev,0).length,2); assert.equal(ev.filter(e=>e.t==='zadyszka').length,2);
  ({d,rng}=setup(['upper'],[],[],['szczeka'])); d.f[1].stun=6; q(d,0,'upper'); play(d,rng); assert.equal(d.phase,'plan','Betonowa szczęka: no knockdown once');
});

test('the AI plays the perk skills and stays legal', () => {
  for(let s=0;s<60;s++){
    const rng=mulberry(s), perks=['dirty-work','storm','bomb','piach','kciuk','nerki','shell','fortress'];
    const d=newDuel(makeFighter({perks,style:'press'}),makeFighter({perks,style:'counter'}),rng);
    for(let n=0;n<40&&d.phase!=='over';n++){
      aiPlan(d,0,rng); aiPlan(d,1,rng);
      for(const f of d.f) assert.ok(f.spent<=f.sta);
      startExchange(d,rng);
      while(d.phase==='fight'||d.phase==='getup') if(d.phase==='getup') getUp(d,true,rng); else resolveBlow(d,aiReaction(d,rng),rng);
    }
  }
});

test('rivals: Harry\'s old school, Silas\'s spoon, Dan\'s avalanche, Szef blocks the heavy ones he reads', () => {
  let {d,rng}=setup(['jab'],[],[],['staraszkola']); q(d,0,'jab');
  let ev=play(d,rng,b=>b.side===0?PARRY:NONE); assert.ok(hits(ev,1).some(e=>e.card==='watroba'),'the parried jab is paid back with a body hook');
  ({d,rng}=setup([],['cyna'])); q(d,1,'cyna');
  ev=play(d,rng,mine(PARRY)); assert.equal(d.end,'ko'); assert.equal(hits(ev,1)[0].tag,'kastet');
  ({d,rng}=setup([],['lawina'])); q(d,1,'lawina'); assert.equal(layBlows(d,1)[0].t,2,'no wind-up: as quick as a cross');
  const szef=setup(['upper'],[]); szef.d.f[1].read=2; szef.d.f[1].block=0; q(szef.d,0,'upper'); startExchange(szef.d,szef.rng);
  let blocked=0; for(let i=0;i<200;i++) if(aiReaction(szef.d,mulberry(i)).kind==='parry') blocked++;
  assert.ok(blocked>30,'reading lets him block the uppercut: '+blocked);
  assert.ok(rivalSkills('out',[],RIVALS.ZEKE.signature).includes('kosa'));
  for(const [name,R] of Object.entries(RIVALS)){ assert.ok(R.hint.length>20,name); if(R.signature) assert.ok(CARDS[R.signature],name); for(const b of R.bias||[]) assert.ok(CARDS[b.card],name+' '+b.card); }
  for(const [name,R] of Object.entries(RIVALS)) for(const k of R.nodes||[]) assert.ok(NODE_READY.has(k)&&Object.values(STYLE_SKILLS).some(set=>set.includes(k.split(':')[0])),name+' '+k);
});

/* ---------- Cechy (PERKI.md §3) and the Szybkość passive ---------- */

test('Cechy, Siła: Kość w kość, Rozcinacz, Stłuczone przedramię, Nokauter, Wybity bark, Kat', () => {
  const late={kind:'parry',grade:'late'};
  let {d,rng}=setup(['cross'],[],['bone-on-bone']); q(d,0,'cross');
  let ev=play(d,rng,()=>late); assert.ok(ev.some(e=>e.t==='debt'&&e.side===1)); assert.equal(d.f[1].sta,18,'his block costs him a point more than the reaction');
  ({d,rng}=setup(['cross'],[],['cutter'])); q(d,0,'cross');
  assert.ok(play(d,()=>0.02).some(e=>e.t==='injury'&&e.injury==='cut'),'+5 p.p. on a cut');
  ({d,rng}=setup(['cross'],['hook'],['forearm'])); q(d,0,'cross');
  assert.ok(play(d,()=>0.1,()=>late).some(e=>e.t==='injury'&&e.injury==='armL'),'a right cross meets his left forearm');
  q(d,1,'hook'); assert.equal(hits(play(d,rng),1)[0].dmg,Math.round(4*0.95-1),'his left hook −1');
  ({d,rng}=setup(['upper'],[],['knockout'])); d.f[1].stun=3; q(d,0,'upper'); play(d,rng);
  assert.equal(d.phase,'getup','down at 6 instead of 7');
  ({d,rng}=setup(['cross'],[],['shoulder'])); d.f[0].open=3; d.f[1].hp=d.f[1].hpMax=999; q(d,0,'cross'); play(d,rng);
  assert.ok(d.f[1].inj.shoulder); d.f[1].sta=20; d.f[1].skills=['upper','jab']; assert.equal(canQueue(d,1,'upper'),'bark'); assert.equal(canQueue(d,1,'jab'),'');
  ({d,rng}=setup(['cross'],[],['headsman'])); d.f[1].hp=12; q(d,0,'cross','cross'); play(d,rng);
  assert.equal(d.f[1].knockdowns,1,'once a brawl: a clean punch under 20% health is a knockdown');
});

test('Cechy, Szybkość and Wytrzymałość: Szczęśliwy unik, Byczy kark, Kolczasta garda', () => {
  let {d}=setup([],['cross'],['lucky-slip']); q(d,1,'cross');
  let ev=play(d,()=>0.05,mine({kind:'dodge',grade:'good'}));
  assert.equal(ev.find(e=>e.t==='whiff')?.tag,'szczęście'); assert.equal(d.f[0].sta,20,'a lucky miss costs no reaction');
  assert.equal(makeFighter({perks:['bull-neck']}).hpMax,makeFighter({}).hpMax+6);
  let rng; ({d,rng}=setup([],['hook'],['spiked-guard'])); d.f[1].pow=10; q(d,1,'hook');
  ev=play(d,rng,mine({kind:'parry',grade:'late'}));
  assert.equal(ev.find(e=>e.t==='reflect').dmg,Math.round(40*0.5*0.25),'a quarter of what the block stopped');
  assert.equal(d.f[1].hp,d.f[1].hpMax-5);
});

test('Szybkość by itself: a wider dodge every five levels, and the faster one wins the tempo ties after the reserve', () => {
  const lv=(/** @type {number} */ spd)=>({str:1,spd,end:1});
  const rng=mulberry(3), d=newDuel(makeFighter({levels:lv(4)}),makeFighter({levels:lv(15)}),rng);
  assert.equal(d.init,1,'the faster one first from the start');
  d.f[0].spd=10; assert.equal(reactWindow(d,0,'dodge').ok,REACT.dodge.ok+2); d.f[0].spd=4; assert.equal(reactWindow(d,0,'dodge').ok,REACT.dodge.ok);
  assert.equal(reactWindow(d,1,'parry').ok,REACT.parry.ok,'the parry stays hard');
  for(const f of d.f){ f.skills=['jab']; f.sta=5; }
  q(d,0,'jab'); q(d,1,'jab'); play(d,rng);
  assert.equal(d.init,1,'no reserve decides it: Szybkość does');
});
