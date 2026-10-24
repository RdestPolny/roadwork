import test from 'node:test';
import assert from 'node:assert/strict';
import {mulberry,makeFighter,newDuel,queueSkill,skillCost,startExchange,resolveBlow,nextBlow,layBlows,reactWindow} from '../src/card-rules.js';
import {NODE_READY,PUNCH_TREES,REACT} from '../src/card-data.js';

/* The punch-tree nodes of levels I–III (CIOSY.md §3). Both fighters are level 1 (punches ×0.95) with a long bar. */
const NONE={kind:'none',grade:'late'}, LATE={kind:'parry',grade:'late'}, DODGE={kind:'dodge',grade:'good'};
/** @param {string[]} a @param {string[]} b @param {string[]} [nodes] the player's nodes */
function duel(a,b,nodes=[]){
  const rng=mulberry(7), d=newDuel(makeFighter({skills:a,nodes}),makeFighter({skills:b}),rng);
  for(const f of d.f) f.sta=f.staMax=20;
  return {d,rng};
}
const q=(d,side,...ids)=>{ for(const id of ids){ const r=queueSkill(d,side,id); assert.equal(r,'',`${id}: ${r}`); } };
function play(d,rng,react=()=>NONE){
  const ev=[...startExchange(d,rng)];
  while(d.phase==='fight'){ const b=nextBlow(d); if(!b) break; ev.push(...resolveBlow(d,react(b),rng)); }
  return ev;
}
const hits=(ev,side=0)=>ev.filter(e=>e.t==='hit'&&e.side===side);
const roll=v=>()=>v;
const times=(d,side)=>layBlows(d,side).map(b=>b.t);

test('all five levels of the eight punch trees are ready', () => {
  assert.equal(NODE_READY.size,80);
  for(const id of Object.keys(PUNCH_TREES)) assert.ok(NODE_READY.has(id+':1a')&&NODE_READY.has(id+':5b'),id);
});

test('jab: Mocne i Długie ustawienie, Podwójny jab, Celownik, Miarka, Żądło', () => {
  let {d,rng}=duel(['jab','cross'],[],['jab:1a']); q(d,0,'jab','cross');
  assert.equal(hits(play(d,rng))[1].dmg,Math.round(4*0.95+3),'cross from Ustawienie +3');
  ({d,rng}=duel(['jab','cross','hook'],[],['jab:1b'])); q(d,0,'jab','cross','hook');
  assert.equal(hits(play(d,rng))[2].dmg,Math.round(4*0.95+1),'the second punch still set up');
  ({d,rng}=duel(['jab'],[],['jab:2a'])); q(d,0,'jab');
  assert.equal(hits(play(d,roll(0.2))).length,2,'30%: a second jab');
  ({d}=duel(['jab','hook'],['cross'],['jab:2b'])); q(d,0,'jab','hook'); q(d,1,'cross','cross','cross');
  assert.ok(play(d,roll(0.4)).some(e=>e.tag==='zachwiany'),'Zachwianie 25% ×2 from Ustawienie');
  ({d}=duel(['jab','hook'],['cross'])); q(d,0,'jab','hook'); q(d,1,'cross','cross','cross');
  assert.ok(!play(d,roll(0.4)).some(e=>e.tag==='zachwiany'),'…×1.5 without it');
  ({d,rng}=duel(['jab','cross'],[],['jab:2b'])); q(d,0,'jab','cross');
  assert.equal(hits(play(d,roll(0.9)))[1].stun,3,'Celownik: the set-up head punch +1 zamroczenia');
  ({d,rng}=duel(['jab','cross'],[],['jab:3a'])); q(d,0,'jab','cross');
  assert.equal(hits(play(d,rng,b=>b.use==='cross'?LATE:NONE))[1].tag,'przebicie','Miarka: the next punch goes through the block');
  ({d,rng}=duel(['jab'],['jab'],['jab:3b'])); q(d,0,'jab','jab'); q(d,1,'jab','jab','jab','jab');
  assert.ok(play(d,rng).some(e=>e.t==='fizzle'&&e.tag==='żądło'),'Żądło: two landed jabs take his next move');
});

test('jab na korpus: Kłucie, Twardy brzuch, Zmiana piętra, Opuszczona garda, Kotwica, Dławik', () => {
  let {d,rng}=duel(['jab-k','cross'],[],['jab-k:1a']);
  assert.equal(skillCost(d.f[0],'jab-k'),0); q(d,0,'jab-k'); assert.equal(skillCost(d.f[0],'jab-k'),1,'only the first one is free');
  ({d,rng}=duel(['jab-k'],[],['jab-k:1b'])); q(d,0,'jab-k');
  assert.equal(hits(play(d,rng))[0].dmg,2);
  ({d}=duel(['jab-k','cross'],[],['jab-k:2a'])); q(d,0,'jab-k','cross');
  assert.deepEqual(times(d,0),[1,2],'the head punch after it a tempo sooner');
  ({d,rng}=duel(['cross'],['jab-k','cross'])); d.f[1].nodes.add('jab-k:2b'); q(d,1,'jab-k','cross');
  startExchange(d,rng); resolveBlow(d,NONE,rng);
  assert.equal(reactWindow(d,0,'parry','cross').ok,REACT.parry.ok-2,'his next head punch: a narrower parry');
  ({d,rng}=duel(['jab-k'],['jab'],['jab-k:3a'])); q(d,0,'jab-k'); q(d,1,'jab'); play(d,rng);
  q(d,1,'jab','jab'); assert.deepEqual(times(d,1),[2,3],'Kotwica: his first move next turn lands a tempo late');
  ({d,rng}=duel(['jab-k'],[],['jab-k:3b'])); q(d,0,'jab-k');
  assert.ok(play(d,rng).some(e=>e.t==='zadyszka'),'Dławik');
  ({d,rng}=duel(['jab-k'],[],['jab-k:3b'])); q(d,0,'jab-k');
  assert.ok(!play(d,rng,()=>LATE).some(e=>e.t==='zadyszka'),'…only when it gets through');
});

test('hook: Krótki hak, Ciężki hak, Rzeźnik, Wahadło, Hak z obrotu, Podwójny hak', () => {
  let {d,rng}=duel(['hook'],[],['hook:1a']); q(d,0,'hook');
  assert.deepEqual(times(d,0),[2],'no step from Daleko');
  ({d,rng}=duel(['hook'],[],['hook:1b'])); q(d,0,'hook');
  assert.equal(hits(play(d,roll(0.9)))[0].stun,4);
  ({d}=duel(['hook'],[],['hook:2a'])); q(d,0,'hook');
  assert.ok(play(d,roll(0.15)).some(e=>e.injury==='cut'),'a cut in 20%');
  ({d}=duel(['hook'],['cross'],['hook:2b'])); q(d,0,'hook'); q(d,1,'cross','cross','cross');
  assert.ok(play(d,roll(0.28)).some(e=>e.tag==='zachwiany'),'Zachwianie 30%');
  ({d}=duel(['cross','hook'],['cross'],['hook:3a'])); q(d,0,'cross','hook'); q(d,1,'cross','cross','cross','cross');
  assert.ok(play(d,roll(0.9)).some(e=>e.tag==='zachwiany'),'right after a cross: always');
  ({d,rng}=duel(['watroba','hook'],[],['hook:3b'])); q(d,0,'watroba','hook');
  assert.equal(hits(play(d,roll(0.9)))[1].dmg,Math.round(4*0.95+2),'after the liver hook +2');
});

test('uppercut: Bomba, Krótki zamach, Rozbijacz, Spod gardy, Szok, Wynurzenie', () => {
  let {d,rng}=duel(['upper'],[],['upper:1a']); q(d,0,'upper');
  assert.equal(hits(play(d,roll(0.9)))[0].stun,5);
  ({d}=duel(['upper'],[],['upper:1b'])); q(d,0,'upper'); assert.deepEqual(times(d,0),[3],'tempo 2 and the step');
  ({d,rng}=duel(['upper','hook'],[],['upper:2a'])); d.f[0].pow=10; d.f[1].hp=d.f[1].hpMax=999; q(d,0,'upper'); play(d,rng,()=>LATE);
  d.f[1].stun=0; q(d,0,'hook'); assert.equal(hits(play(d,rng,()=>LATE))[0].dmg,Math.round(40*0.75),'the guard holds 25%');
  ({d,rng}=duel(['hook','upper'],[],['upper:2b'])); q(d,0,'hook','upper');
  assert.equal(hits(play(d,roll(0.9),b=>b.use==='upper'?LATE:NONE))[1].tag,'przebicie','right after a hook that got through it goes through the block');
  ({d,rng}=duel(['hook','upper'],[],['upper:2b'])); q(d,0,'hook','upper');
  assert.equal(hits(play(d,roll(0.9),()=>LATE))[1].tag,'blok','not after a blocked hook');
  ({d,rng}=duel(['upper'],[],['upper:3a'])); d.f[0].open=1; q(d,0,'upper'); play(d,roll(0.9));
  assert.equal(d.f[1].locked,true,'Szok: his next bar is shorter');
  ({d,rng}=duel([],['hook'],['upper:3b'])); q(d,1,'hook'); play(d,rng,b=>b.side===1?DODGE:NONE);
  assert.equal(d.f[0].x.duckTurn,1,'Wynurzenie after a dodge under his hook');
});

test('podbródkowy w żołądek: Taran, Głębiej, Zgięty wpół, Wyrwany oddech, Pod brodę, Skurcz', () => {
  let {d,rng}=duel(['zoladek'],['jab-k'],['zoladek:1a']); q(d,0,'zoladek'); q(d,1,'jab-k');
  assert.deepEqual(times(d,0),[3],'tempo 2 and the step');
  ({d,rng}=duel(['zoladek'],[],['zoladek:1b'])); q(d,0,'zoladek');
  assert.equal(hits(play(d,roll(0.9)))[0].dmg,Math.round(5*0.95+3));
  ({d,rng}=duel(['zoladek','cross'],[],['zoladek:2a'])); d.f[1].hp=d.f[1].hpMax=999; q(d,0,'zoladek','cross','cross','cross');
  const bent=hits(play(d,roll(0.9),()=>LATE)).slice(1);
  assert.deepEqual(bent.map(e=>e.tag),['przebicie','przebicie','przebicie'],'the whole turn without a block');
  assert.equal(bent[0].stun,3,'+1 zamroczenia to the bent head');
  ({d,rng}=duel(['zoladek','watroba'],[],['zoladek:2b'])); q(d,0,'zoladek','watroba'); play(d,roll(0.9));
  assert.equal(d.f[1].sta,20-3,'Zadyszka 2 + 1');
  ({d,rng}=duel(['zoladek','upper'],[],['zoladek:3a'])); d.f[1].hp=d.f[1].hpMax=999; q(d,0,'zoladek','upper');
  assert.equal(hits(play(d,roll(0.9)))[1].stun,7,'Pod brodę: +3');
  ({d,rng}=duel(['zoladek'],['cross'],['zoladek:3b'])); q(d,0,'zoladek'); q(d,1,'cross','cross','cross');
  assert.ok(play(d,roll(0.9)).some(e=>e.t==='skurcz'));
});

test('prosty na splot: Głęboki, Z dystansu, Splot, Stop, Bez tchu, Na wejściu', () => {
  let {d,rng}=duel(['splot'],[],['splot:1a']); q(d,0,'splot');
  assert.equal(hits(play(d,rng))[0].dmg,Math.round(3*0.95+1));
  ({d,rng}=duel(['splot'],[],['splot:1b'])); q(d,0,'splot'); assert.deepEqual(times(d,0),[1]);
  assert.equal(hits(play(d,rng))[0].dmg,Math.round(3*0.95+1),'first move of the turn: +1');
  ({d,rng}=duel(['splot'],[],['splot:2a'])); q(d,0,'splot');
  assert.equal(play(d,rng).find(e=>e.t==='zadyszka').level,2);
  ({d,rng}=duel(['splot'],['jab','hook'],['splot:2b'])); q(d,0,'splot'); q(d,1,'jab','hook');
  assert.ok(play(d,rng).some(e=>e.t==='fizzle'&&e.tag==='zatrzymany'&&e.card==='hook'),'Stop: his hook never comes');
  ({d,rng}=duel(['splot','cross'],[],['splot:3a'])); q(d,0,'splot','cross');
  assert.equal(hits(play(d,rng,b=>b.use==='cross'?LATE:NONE))[1].tag,'przebicie','Bez tchu: the next punch goes through');
  ({d,rng}=duel(['splot'],['hook'],['splot:3b'])); q(d,0,'splot'); q(d,1,'hook');
  assert.equal(hits(play(d,rng))[0].dmg,Math.round(3*0.95*2),'landing before his step in: ×2');
});

test('hak na wątrobę: Młot, Bez kroku, Łowca wątroby, Przez gardę, Pęknięte żebra, Wątroba–głowa', () => {
  let {d,rng}=duel(['watroba'],[],['watroba:1a']); q(d,0,'watroba');
  assert.equal(play(d,roll(0.9)).find(e=>e.t==='zadyszka').level,2);
  ({d}=duel(['watroba','hook'],[],['watroba:1b'])); q(d,0,'watroba','hook'); assert.deepEqual(times(d,0),[1,3],'a tempo quicker, no step for it or the hook after it');
  ({d}=duel(['jab','watroba'],['cross'],['watroba:2a'])); q(d,0,'jab','watroba'); q(d,1,'cross','cross','cross');
  assert.ok(play(d,roll(0.9)).some(e=>e.t==='skurcz'),'set up by a jab: a Skurcz at once');
  ({d}=duel(['watroba'],['cross'],['watroba:2b'])); q(d,0,'watroba','watroba','watroba'); q(d,1,'cross','cross','cross','cross','cross');
  assert.ok(play(d,roll(0.9),b=>b.side===0?LATE:NONE).some(e=>e.t==='skurcz'),'blocked ones count to the third');
  ({d}=duel(['watroba'],[],['watroba:3a'])); q(d,0,'watroba');
  assert.ok(play(d,roll(0.1)).some(e=>e.injury==='rib'),'20% on a rib');
  ({d}=duel(['watroba','hook'],[],['watroba:3b'])); q(d,0,'watroba','hook');
  assert.equal(hits(play(d,roll(0.9)))[1].dmg,Math.round(4*0.95+2));
});

test('cross: Ciężka ręka, Raz-dwa, Pęknięta garda, Kosa, Egzekutor, Kontra prosta', () => {
  let {d,rng}=duel(['cross'],[],['cross:1a']); q(d,0,'cross');
  assert.equal(hits(play(d,rng))[0].dmg,Math.round(4*0.95+1));
  ({d}=duel(['jab','cross'],[],['cross:1b'])); q(d,0,'jab','cross'); assert.deepEqual(times(d,0),[1,2],'right after a jab: a tempo sooner');
  ({d,rng}=duel(['cross','hook'],[],['cross:2a'])); d.f[0].pow=10; d.f[1].hp=d.f[1].hpMax=999; q(d,0,'cross','hook');
  assert.equal(hits(play(d,rng,()=>LATE))[1].dmg,Math.round(40*0.6),'a blocked cross breaks the guard for the hook after it');
  ({d}=duel(['cross'],[],['cross:2b'])); q(d,0,'cross','cross'); assert.deepEqual(times(d,0),[1,3],'the first cross as quick as a jab');
  ({d,rng}=duel(['cross'],[],['cross:3a'])); d.f[1].sta=2; q(d,0,'cross');
  assert.equal(hits(play(d,rng))[0].dmg,Math.round(4*0.95+2));
  ({d,rng}=duel(['cross'],['jab'],['cross:3b'])); q(d,0,'cross'); q(d,1,'jab');
  assert.equal(hits(play(d,rng,b=>b.side===1?DODGE:NONE))[0].dmg,Math.round(4*0.95*1.5),'after a dodge this turn ×1.5');
});

/* ---------- levels IV–V ---------- */
const CLEAN={kind:'parry',grade:'good'};
const lost=(ev,tag)=>ev.some(e=>e.t==='fizzle'&&e.tag===tag);

test('jab IV–V: Przerywnik, Kontrjab, Raz-dwa-trzy, Dyktator', () => {
  let {d,rng}=duel(['jab'],['upper'],['jab:4a']); q(d,0,'jab'); q(d,1,'upper');
  assert.ok(lost(play(d,rng),'zamach przerwany'),'a landed jab stops his wind-up');
  ({d,rng}=duel([],['cross'],['jab:4b'])); q(d,1,'cross');
  const ev=play(d,rng,b=>b.side===1?CLEAN:NONE);
  assert.deepEqual(hits(ev).map(e=>e.card),['jab'],'a parried cross: a free jab back');
  ({d}=duel(['jab','cross','hook'],['cross'],['jab:5a'])); q(d,0,'jab','cross','hook'); q(d,1,'cross','cross','cross','cross');
  assert.ok(lost(play(d,roll(0.9)),'zachwiany'),'jab, cross, hook: the hook always sways');
  ({d,rng}=duel(['jab','cross','hook'],[],['jab:5b'])); d.f[0].stunDealt=0.1; d.f[1].hp=d.f[1].hpMax=999; q(d,0,'jab','cross','hook'); play(d,roll(0.9));
  assert.deepEqual([d.init,d.f[1].sta],[0,18],'two different punches after a jab: two of his points and the initiative');
});

test('jab na korpus IV–V: Przerywacz, Ustawienie z dołu, Kotwiczenie, Mrówka', () => {
  let {d,rng}=duel(['jab-k'],['cross'],['jab-k:4a']); q(d,0,'jab-k'); q(d,1,'cross');
  assert.ok(lost(play(d,rng),'zamach przerwany'),'a cross is stopped too, not only a heavy punch');
  ({d,rng}=duel(['jab-k','cross'],[],['jab-k:4b'])); q(d,0,'jab-k','cross');
  assert.equal(hits(play(d,rng))[1].dmg,Math.round(4*0.95+2),'it sets up like a jab');
  ({d,rng}=duel(['jab-k'],['jab'],['jab-k:5a'])); q(d,0,'jab-k','jab-k','jab-k'); q(d,1,'jab','jab','jab','jab','jab','jab');
  assert.ok(lost(play(d,rng),'zakotwiczony'),'two body jabs: his last move is lost');
  ({d,rng}=duel(['jab-k'],[],['jab-k:5b'])); q(d,0,'jab-k','jab-k','jab-k','jab-k');
  assert.ok(play(d,rng).some(e=>e.injury==='rib'),'the fourth body jab of the brawl cracks a rib');
});

test('hook IV–V: Pod gardę, Kontrhak, Na deski, Na krew', () => {
  let {d}=duel(['hook'],['cross'],['hook:4a']); q(d,0,'hook'); q(d,1,'cross','cross','cross');
  assert.ok(lost(play(d,roll(0.1),b=>b.side===0?LATE:NONE),'zachwiany'),'a blocked hook still sways in 15%');
  ({d}=duel(['jab','hook'],['hook','jab'],['hook:4b'])); q(d,0,'jab','hook'); q(d,1,'hook','jab','jab');
  assert.ok(lost(play(d,roll(0.9),b=>b.side===1&&b.use==='hook'?DODGE:NONE),'zachwiany'),'after a dodge under his hook: a sure sway');
  ({d}=duel(['jab','hook'],['jab','cross'],['hook:4b'])); q(d,0,'jab','hook'); q(d,1,'jab','cross','cross');
  const kh=play(d,roll(0.9),b=>b.side===1&&b.use==='jab'?DODGE:NONE);
  assert.ok(lost(kh,'zachwiany')&&hits(kh)[1].dmg===Math.round(4*0.95+2+1),'after any dodge: a sure sway and +2 (plus the Ustawienie of the jab)');
  ({d}=duel(['hook','cross'],['cross'],['hook:5a'])); q(d,0,'hook','cross'); q(d,1,'cross','cross','cross','cross');
  assert.equal(hits(play(d,roll(0.1)))[1].stun,4,'a swayed rival: +2 zamroczenia');
  ({d}=duel(['hook'],['cross'],['hook:5b'])); d.f[1].inj.cuts=1; q(d,0,'hook'); q(d,1,'cross','cross','cross');
  assert.ok(lost(play(d,roll(0.45)),'zachwiany'),'a cut rival sways in 50%');
});

test('cross IV–V: Ciężka odpowiedź, Przez środek, Nokautujący prosty, Ładowany', () => {
  let {d,rng}=duel(['cross'],[],['cross:4a']); d.f[0].open=1; q(d,0,'cross');
  assert.deepEqual(hits(play(d,roll(0.9))).map(e=>e.card),['cross','watroba']);
  ({d,rng}=duel(['cross'],['upper'],['cross:4b'])); q(d,0,'cross'); q(d,1,'upper');
  assert.ok(lost(play(d,rng),'zamach przerwany'),'a cross landing first stops his wind-up');
  ({d,rng}=duel(['jab','cross'],[],['cross:5a'])); d.f[1].x.crackTurn=1; q(d,0,'jab','cross');
  assert.equal(hits(play(d,rng))[1].stun,6,'set up into a broken guard: +4 zamroczenia');
  ({d,rng}=duel(['jab','cross'],[],['cross:5b'])); q(d,0,'jab','cross');
  assert.equal(hits(play(d,rng,b=>b.use==='cross'?CLEAN:NONE))[1].tag,'przebicie','from Ustawienie even a clean parry fails');
});

test('uppercut IV–V: Nieprzerywalny, Zamach-zwód, Złamany nos, Rozbita twierdza', () => {
  let {d,rng}=duel(['upper'],['jab-k'],['upper:4a']); q(d,0,'upper'); q(d,1,'jab-k');
  assert.equal(hits(play(d,roll(0.9))).length,1,'a body jab does not stop it');
  ({d,rng}=duel(['upper'],['jab-k'],['upper:4b'])); q(d,0,'upper'); q(d,1,'jab-k'); play(d,roll(0.9));
  assert.deepEqual([d.f[0].open,d.f[0].sta],[1,22],'a broken uppercut: its stamina back and Otwarcie I');
  ({d,rng}=duel(['upper'],[],['upper:4b'])); d.f[0].sta=d.f[0].staMax=5; d.f[1].hp=d.f[1].hpMax=999; q(d,0,'upper'); play(d,roll(0.9),()=>LATE);
  assert.equal(d.f[0].sta,7,'a blocked one pays back 3 too (the bar caps at +2)');
  ({d,rng}=duel(['upper'],[],['upper:5a'])); d.f[1].stun=4; q(d,0,'upper');
  assert.ok(play(d,roll(0.9)).some(e=>e.injury==='nose'));
  ({d,rng}=duel(['cross'],[],['upper:5b'])); d.f[1].x.crackTurn=1; q(d,0,'cross');
  const h=hits(play(d,rng))[0]; assert.deepEqual([h.dmg,h.stun],[Math.round(4*0.95+2),4],'any punch into a broken guard +2 / +2');
});

test('podbródkowy w żołądek IV–V: Nieprzerywalny, Pod żebra, Złamany, Przewrót', () => {
  let {d,rng}=duel(['zoladek'],['jab-k'],['zoladek:4a']); q(d,0,'zoladek'); q(d,1,'jab-k');
  assert.equal(hits(play(d,roll(0.9))).length,1,'a body jab does not stop it');
  ({d,rng}=duel(['zoladek'],['cross'],['zoladek:4b'])); q(d,1,'cross'); play(d,rng,b=>b.side===1?CLEAN:NONE);
  assert.equal(skillCost(d.f[0],'zoladek'),2,'after last turn\'s parry'); q(d,0,'zoladek'); assert.deepEqual(times(d,0),[3]);
  ({d,rng}=duel(['zoladek'],[],['zoladek:5a'])); d.f[1].x.wind=1; q(d,0,'zoladek');
  assert.ok(play(d,roll(0.9)).some(e=>e.injury==='rib'),'a winded rival: a sure rib');
  ({d,rng}=duel(['zoladek','hook'],[],['zoladek:5b'])); d.f[0].stunDealt=0.1; d.f[1].stun=5; q(d,0,'zoladek','hook'); play(d,roll(0.9));
  assert.equal(d.f[1].knockdowns,1,'bent, then a hook at 5+: down');
});

test('prosty na splot IV–V: Żebro, Mur, Duszenie, Matador', () => {
  let {d}=duel(['jab','splot'],[],['splot:4a']); q(d,0,'jab','splot');
  assert.ok(play(d,roll(0.25)).some(e=>e.injury==='rib'),'set up: 30% on a rib');
  let rng; ({d,rng}=duel(['splot'],['hook'],['splot:4b'])); d.f[1].open=2; q(d,0,'splot'); q(d,1,'hook');
  startExchange(d,rng); resolveBlow(d,NONE,rng); assert.equal(d.f[1].open,0,'pushed back, he loses his Otwarcie');
  ({d,rng}=duel(['splot'],[],['splot:5a'])); d.f[1].staMax=5; q(d,0,'splot'); play(d,rng);
  assert.equal(d.f[1].sta,4); play(d,rng); assert.equal(d.f[1].sta,4,'Zadyszka a second turn');
  ({d,rng}=duel(['splot'],['hook'],['splot:5b'])); q(d,0,'splot'); q(d,1,'hook'); play(d,rng);
  assert.equal(d.f[0].open,1,'his delayed move: Otwarcie I');
});

test('hak na wątrobę IV–V: Długi skurcz, Piekło, Na kolana, Bez powietrza', () => {
  let {d}=duel(['watroba'],['cross'],['watroba:4a']); d.f[0].open=1; q(d,0,'watroba'); q(d,1,'cross','cross','cross','cross');
  assert.equal(play(d,roll(0.9)).filter(e=>e.t==='skurcz').length,2);
  ({d}=duel(['watroba'],['cross'],['watroba:4b'])); d.f[0].open=1; q(d,0,'watroba'); q(d,1,'cross','cross','cross','cross'); play(d,roll(0.9));
  assert.equal(d.f[1].sta,17,'after a Skurcz: two points off his next bar (and one for the Zadyszka)');
  ({d}=duel(['watroba'],['cross'],['watroba:5a'])); q(d,0,'watroba','watroba'); q(d,1,'cross','cross','cross','cross','cross');
  assert.equal(play(d,roll(0.9)).filter(e=>e.t==='skurcz').length,1,'the second liver hook is a Skurcz');
  ({d}=duel(['watroba'],[],['watroba:5b'])); d.f[1].stun=3; q(d,0,'watroba'); play(d,roll(0.9));
  assert.equal(d.f[1].stun,1,'his reserve does not clear his head');
});
