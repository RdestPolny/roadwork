import test from 'node:test';
import assert from 'node:assert/strict';
import {weekday, isWorkDay, isShopDay, absMin, clock, sanitizePrison, prisonDefaults, workNorma, workStage, workPay, WORK_TARGET} from '../src/prison-data.js';

test('the week: Monday is day 1, work Monday to Saturday from day 2, the flap trades on Monday and Thursday', () => {
  assert.deepEqual([weekday(1), weekday(7), weekday(8)], [0, 6, 0]);
  assert.deepEqual([isWorkDay(1), isWorkDay(2), isWorkDay(6), isWorkDay(7), isWorkDay(8)], [false, true, true, false, true]);
  assert.deepEqual([1, 2, 4, 8].map(isShopDay), [true, false, true, true]);
  assert.equal(clock(absMin(3, 6*60+15)), '06:15');
});

test('the prison save keeps its schedule cursor', () => {
  assert.equal(prisonDefaults().zegar, 0);
  assert.equal(sanitizePrison({zegar: 4000.7}).zegar, 4000);
  assert.equal(sanitizePrison({zegar: -3}).zegar, 0);
});

test('respect ranks and arm wrestling setup', async () => {
  const {respektRank, inmateRank, armSetup, armResult} = await import('../src/prison-data.js');
  assert.deepEqual([0,14,15,34,35,60,84,85,100].map(respektRank), [0,0,1,1,2,3,3,4,4]);
  assert.deepEqual([2,6,10,14,17,20].map(inmateRank), [0,1,2,3,3,4]);
  const even = armSetup({myRank:1, oppRank:1, strLvl:5, endLvl:5, oppFight:8});
  const boss = armSetup({myRank:3, oppRank:1, strLvl:5, endLvl:5, oppFight:8});
  assert.equal(even.start, 0);
  assert.ok(boss.start > 0 && boss.surgeGap > even.surgeGap, 'respect gives a head start and fewer surges');
  assert.ok(armSetup({myRank:1, oppRank:1, strLvl:15, endLvl:5, oppFight:8}).push > even.push, 'strength pushes harder');
  assert.deepEqual([1, -1, 0.3].map(armResult), ['win', 'loss', 'draw']);
});

test('slaughterhouse quota, stage and pay', () => {
  assert.equal(workNorma(6,6,0,0),100); assert.equal(workNorma(6,6,1,0),92); assert.equal(workNorma(6,6,0,40),110,'the boxed finale adds up to 20');
  assert.equal(workNorma(20,6,0,400),150); assert.equal(workNorma(0,6,3,0),0);
  assert.deepEqual(WORK_TARGET.slice(1),[6,8,10]);
  assert.equal(workStage(0,50),1); assert.equal(workStage(5,50),2); assert.equal(workStage(12,60),3); assert.equal(workStage(12,40),1);
  const p=workPay(100); assert.equal(p.zl,12); assert.equal(p.wypiska+p.depozyt,12); assert.equal(p.opinia,2);
  assert.equal(workPay(120).zl,22.4); assert.equal(workPay(120).opinia,3); assert.ok(workPay(120).przodownik);
  assert.equal(workPay(70).opinia,-2); assert.ok(workPay(70).skarga);
});

test('money is shown in shillings and pence', async () => {
  const {fmtMoney} = await import('../src/prison-data.js');
  assert.deepEqual([fmtMoney(1.5), fmtMoney(3), fmtMoney(0.5), fmtMoney(0), fmtMoney(22.4), fmtMoney(-1.25)],
    ['1 szyl. 6 p.', '3 szyl.', '6 p.', '0 p.', '22 szyl. 5 p.', '−1 szyl. 3 p.']);
});

test('supervision: guard risk, respect from fights and reports', async () => {
  const {guardRisk, fightRespekt, recentRaports} = await import('../src/prison-data.js');
  assert.equal(guardRisk({venue:'cell'}),0.10); assert.equal(guardRisk({venue:'cell',night:true}),0.05);
  assert.equal(guardRisk({venue:'yard',sec:35}),0.28);
  assert.equal(guardRisk({venue:'canteen'}),0.60); assert.equal(guardRisk({venue:'laznia',sec:25}),0.22); assert.equal(guardRisk({venue:'canteen',blind:true}),0.15); assert.equal(guardRisk({venue:'yard',sunday:true}),0);
  assert.deepEqual([fightRespekt({win:true,stars:2}),fightRespekt({win:true,ko:true,stars:2}),fightRespekt({win:false,stars:1}),fightRespekt({win:false,stars:4}),fightRespekt({win:false,draw:true,stars:1})],[8,12,-6,0,0]);
  assert.equal(recentRaports([1,3,9,10],10),2);
});

test('Profesor: one note per fight and the daily task for the weakest tree', async () => {
  const {fightNote, dailyTask, taskDone} = await import('../src/prison-data.js');
  const base={thrown:40,landed:20,taken:5,minSta:0.5,body:4,evades:2,counters:1};
  assert.equal(fightNote(base),'');
  assert.equal(fightNote({...base,landed:10}),'celnosc');
  assert.equal(fightNote({...base,taken:20}),'garda');
  assert.equal(fightNote({...base,minSta:0.1}),'kondycja');
  assert.equal(fightNote({...base,body:0}),'korpus');
  assert.equal(fightNote({...base,evades:9}),'kontry');
  assert.equal(dailyTask({str:3,spd:5,end:5},true),'podciaganie-b');
  assert.equal(dailyTask({str:5,spd:2,end:5},true),'cien-b');
  assert.equal(dailyTask({str:5,spd:5,end:5},true),'pompki-b');
  assert.equal(dailyTask({str:5,spd:5,end:5},false),'pompki-b');
  assert.equal(taskDone('pompki-b',{id:'pushup',grade:'B'}),true);
  assert.equal(taskDone('pompki-b',{id:'pushup',grade:'C'}),false);
  assert.equal(taskDone('pompki-b',{id:'pushup',grade:'S',aborted:true}),false);
  assert.equal(taskDone('norma-100',{id:'work',grade:'C',metrics:{norma:104}}),true);
});

test('Profesor\'s list: ten names in order, lessons and the shadow stages', async () => {
  const {LISTA, listEntry, lessonOk, cienStage, MEMORIES} = await import('../src/prison-data.js');
  assert.equal(LISTA.length,10); assert.deepEqual(LISTA.map(e=>e.n),[1,2,3,4,5,6,7,8,9,10]);
  assert.equal(listEntry(6).rigged,true); assert.equal(listEntry(11),null);
  for(const e of LISTA.slice(0,9)) assert.ok(MEMORIES[String(e.n)],'memory '+e.n);
  const f={win:true,ko:false,blocks:9,landed:20,body:8,cuts:0,counters:3,kdTaken:0,evades:12,sunday:false};
  assert.ok(lessonOk('blocks8',f)&&lessonOk('body40',f)&&lessonOk('nocut',f)&&lessonOk('counters3',f)&&lessonOk('nokd',f)&&lessonOk('evades12',f));
  assert.equal(lessonOk('ko',f),false); assert.equal(lessonOk('blocks8',{...f,win:false}),false);
  assert.deepEqual([cienStage({}),cienStage({'4':true}),cienStage({'4':true,'6':true})],[1,2,3]);
});

test('Spacerniak: points from respect, tiers by rank, one tier III, frozen outside prison', async () => {
  const {BARE_PERKS, barePoints, bareSpent, bareBlock} = await import('../src/prison-data.js');
  assert.equal(BARE_PERKS.length,10);
  assert.equal(barePoints({maxRank:4,bicie:true,glaz:true}),6); assert.equal(barePoints({maxRank:1,bicie:false,glaz:false}),1);
  const s={unlocked:[],points:6,rank:4,prison:true};
  assert.equal(bareBlock('piach',s),'');
  assert.equal(bareBlock('kciuk',{...s,rank:1}),'rank');
  assert.equal(bareBlock('pamiec',{...s,unlocked:['nerki']}),'choice');
  assert.equal(bareBlock('nerki',{...s,unlocked:['kciuk','kostki']}),'points');
  assert.equal(bareBlock('piach',{...s,prison:false}),'frozen');
  assert.equal(bareSpent(['piach','kciuk','nerki']),6);
  assert.equal(1+2+2+3>6,true,'tier I + II cannot all be bought with III');
});

test('daily events at most one a day, the Sunday brawl lineup', async () => {
  const {pickDailyEvent, bicieOpponents} = await import('../src/prison-data.js');
  let days=0;
  for(let d=2;d<202;d++){ const a=pickDailyEvent(d,'apel',{fajki:30,rank:1,inCanteen:false}), m=pickDailyEvent(d,'meal',{fajki:30,rank:1,inCanteen:true}), y=pickDailyEvent(d,'yard',{fajki:30,rank:1,inCanteen:false}); if(a||m||y) days++; }
  assert.ok(days>30&&days<120,'event days '+days);
  assert.equal(pickDailyEvent(1,'apel',{fajki:30,rank:1,inCanteen:false}),'');
  const ranks=[3,6,8,10,12,14,17];
  assert.deepEqual(bicieOpponents(1,1,ranks),[0,1,2]);
  assert.deepEqual(bicieOpponents(10,1,ranks),[3,4,5]);
  const p=bicieOpponents(5,8,ranks); assert.equal(p[p.length-1],5); assert.equal(p.length,3);
});

test('Profesor\'s lessons in a card brawl ask for card-sized numbers', async () => {
  const {lessonOk,lessonText,LISTA}=await import('../src/prison-data.js');
  const base={win:true,ko:false,blocks:3,landed:5,body:1,cuts:0,counters:2,kdTaken:0,evades:4,sunday:false};
  assert.equal(lessonOk('blocks8',base),false); assert.equal(lessonOk('blocks8',{...base,cards:true}),true);
  assert.equal(lessonOk('evades12',{...base,cards:true}),true); assert.equal(lessonOk('counters3',{...base,cards:true}),true);
  assert.match(lessonText(LISTA[5],true),/4 uniki/); assert.match(lessonText(LISTA[5],false),/12 uników/);
  assert.equal(lessonText(LISTA[2],true),LISTA[2].lesson.text,'lessons without numbers stay');
  assert.match(lessonText(LISTA[0],true),/3 ciosy zatrzymane parowaniem/,'blocks count parries in a skill fight');
});
