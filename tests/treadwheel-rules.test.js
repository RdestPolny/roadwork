import test from 'node:test';
import assert from 'node:assert/strict';
import {judgeStep, stepCost, wheelLoad, hungerMult, wheelBody, windowScale, guardNext, beamAt, beamOn, bellTempo,
  makeRival, rivalBeat, rivalHands, rivalDone, wheelQuality, wheelComplete, wheelBrief, CAUGHT, CAUGHT_OUT} from '../src/treadwheel-rules.js';
import {DRILLS, sessionScore, sessionXP, PRISON_TRIALS} from '../src/training-data.js';
import {dailyTask, taskDone} from '../src/prison-data.js';

/** @param {number} seed */
const rng = (seed)=>()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };

test('a step is judged by its distance to the beat; speed widens the clean window but not the stumble', () => {
  assert.equal(judgeStep(30),'clean');
  assert.equal(judgeStep(-80),'good');
  assert.equal(judgeStep(150),'off');
  assert.equal(judgeStep(260),'');
  assert.equal(judgeStep(55,1.25),'clean');
  assert.equal(windowScale(1.2,0.2,true),1.2*0.75*0.5);
});

test('every man off the wheel makes it heavier; hunger and a missed step cost breath, a trance gives it back', () => {
  assert.equal(wheelLoad(0),1);
  assert.ok(Math.abs(wheelLoad(4)-1.6)<1e-9);
  assert.equal(hungerMult(2),1.15);
  const c={load:1,hunger:1,use:1,heavy:1,trance:false,low:false};
  assert.equal(stepCost('clean',c),0.5);
  assert.ok(stepCost('off',c)>stepCost('good',c));
  assert.ok(stepCost('clean',{...c,trance:true})<0);
  assert.equal(stepCost('good',{...c,low:true}),1.4);
});

test('endurance gives breath, strength grip, tiredness takes breath', () => {
  const weak=wheelBody({str:1,spd:1,end:1}), strong=wheelBody({str:15,spd:15,end:15});
  assert.ok(strong.breath>weak.breath&&strong.grip>weak.grip&&strong.win>weak.win);
  assert.equal(wheelBody({str:1,spd:1,end:1},{zm:3}).breath,weak.breath-18);
});

test('the warder watches, turns away, warns and swings the lantern back; the beam sweeps the row', () => {
  const p={away:[4,4],warn:1,watch:[5,5],fake:false};
  assert.deepEqual(guardNext('watch',p,()=>0.5),{phase:'turn',sec:0.8});
  assert.deepEqual(guardNext('turn',p,()=>0.5),{phase:'away',sec:4});
  assert.deepEqual(guardNext('away',p,()=>0.5),{phase:'warn',sec:1});
  assert.deepEqual(guardNext('warn',p,()=>0.5),{phase:'back',sec:0.5});
  assert.deepEqual(guardNext('back',p,()=>0.5),{phase:'watch',sec:5});
  assert.equal(guardNext('watch',{...p,fake:true},()=>0.1).feint,true);
  assert.equal(beamAt(0,5,1),4);
  assert.equal(beamAt(4,5,1),0);
  assert.equal(beamAt(6,5,1),2);
  assert.equal(beamOn(1,1),1);
  assert.equal(beamOn(3,1),0);
  assert.equal(bellTempo([48,64],1),54);
  assert.equal(bellTempo([48,64],9),64);
});

test('a rival resting in the lantern is caught and loses breath; the third time he is thrown off', () => {
  const r=makeRival('jack',0);
  r.resting=true; r.O=50;
  assert.equal(rivalHands(r,{dt:1/60,beam:0,phase:'watch'},()=>0.99),true);
  assert.equal(r.caught,1); assert.ok(r.O<=50-CAUGHT[0]+0.1);
  r.caught=CAUGHT_OUT; assert.equal(rivalDone(r),'thrown');
  const h=makeRival('harry',2); h.P=0; h.C=0; assert.equal(rivalDone(h),'fell');
});

test('rivals tire out: none outlasts five minutes on a heavy wheel', () => {
  const rnd=rng(7), rs=DRILLS.kierat.stages[4].rivals.map((/** @type {string} */ id,/** @type {number} */ k)=>makeRival(id,k));
  for(let b=0;b<300;b++) for(const r of rs){ rivalBeat(r,{load:wheelLoad(3),heavy:1+b/120,event:'',warp:false},rnd); rivalHands(r,{dt:1,beam:9,phase:'watch'},rnd); }
  assert.ok(rs.every(r=>rivalDone(r)==='fell'));
});

test('the wheel session scores place and clean steps; thrown off by the warder earns nothing', () => {
  const d=DRILLS.kierat, p=d.stages[0];
  const win=sessionScore(d,{field:4,place:1,clean:120,good:10,off:2,missed:0,caught:0,won:1,sec:100},1);
  assert.equal(win.grade,'S');
  const mid=sessionScore(d,{field:4,place:3,clean:40,good:40,off:10,missed:5,caught:1,sec:60},1);
  assert.ok(mid.score<win.score&&mid.score>0);
  const thrown={field:4,place:4,clean:80,good:5,caught:3,sec:70};
  assert.equal(wheelQuality(thrown),0); assert.equal(wheelComplete(thrown,p),0);
  const sc=sessionScore(d,thrown,1), xp=sessionXP(d,1,sc,{str:5,spd:5,end:5},0,false);
  assert.deepEqual(xp,{str:0,spd:0,end:0});
  const good=sessionXP(d,1,win,{str:5,spd:5,end:5},0,false);
  assert.ok(good.end>good.str&&good.str>good.spd);
});

test('the legacy wheel trial remains valid; daily tasks use available training', () => {
  const alt=PRISON_TRIALS['end:10'].alt;
  assert.equal(alt.drill,'kierat'); assert.equal(alt.stage,3);
  assert.equal(alt.ok({grade:'A',metrics:{won:1}}),true);
  assert.equal(alt.ok({grade:'A',metrics:{won:0}}),false);
  assert.equal(dailyTask({str:9,spd:9,end:3},true,1),'pompki-b');
  assert.equal(dailyTask({str:9,spd:9,end:3},true),'pompki-b');
  assert.equal(taskDone('kierat-ostatni',{id:'kierat',grade:'C',metrics:{won:1}}),true);
});

test('the board before the wheel names the controls and only the events of its stage', () => {
  const st=DRILLS.kierat.stages, one=wheelBrief(st[0],'I'), five=wheelBrief(st[4],'V',true), text=(b)=>b.rows.map(r=>r.join(' ')).join(' ');
  assert.equal(one.title,'KIERAT · STOPIEŃ I');
  for(const k of ['Kroki','Poręcz','Zejście']) assert.ok(one.rows.some(r=>r[0]===k),k);
  assert.match(text(one),/Numer 31/); assert.match(text(one),/48 → 64/);
  assert.match(text(one),/dzwon/); assert.doesNotMatch(text(one),/zastój|kołatka|fałszywe/);
  assert.match(text(five),/kołatka/); assert.match(text(five),/fałszywe odwrócenie/); assert.match(text(five),/Cobb/);
});
