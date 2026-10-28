/* Closed training sessions: definitions, stages I–V and the XP formula (pure, unit-tested).
   XP is granted once per finished session: base × tree share × grade × stage × challenge × freshness × XP_RATE.
   The form multiplier (sleep, food, rest) is applied by progression.addXP on top. */

import { LEVEL_MAX } from './stats.js';

/** @typedef {'str'|'spd'|'end'} TreeKey */
/** @typedef {Record<string,number>} Metrics */
/**
 * @typedef {object} DrillDef
 * @property {string} id
 * @property {string} name
 * @property {Record<TreeKey,number>} tree     Share of the session XP per tree (sum 1).
 * @property {number} base                     Total XP at grade B, stage I, full freshness.
 * @property {number} worldMin                 In-game minutes charged by a full session.
 * @property {number} intensity                Training intensity for the needs simulation.
 * @property {number} rounds
 * @property {number[]|null} roundSec          Round length per stage (null = rounds end by goal).
 * @property {number} restSec
 * @property {Record<string,any>[]} stages     Five parameter sets, stage I–V.
 * @property {(m:Metrics,p:Record<string,any>)=>number} quality      0..1
 * @property {(m:Metrics,p:Record<string,any>,d:DrillDef)=>number} complete  0..1
 * @property {string} unit                     Short description of the session for menus.
 */

export const XP_RATE = 1;
export const GRADE_AT = /** @type {const} */ ([['S',95],['A',85],['B',70],['C',50],['D',0]]);
export const GRADE_MULT = /** @type {Record<string,number>} */ ({S:1.5,A:1.25,B:1,C:0.75,D:0.5});
export const STAGE_MULT = [1,1.3,1.6,1.9,2.2];
export const STAGE_BAND = [[1,6],[7,12],[13,18],[19,24],[25,30]];
export const ROMAN = ['I','II','III','IV','V'];
export const FRESHNESS = [1,1,0.8,0.6,0.4];
export const FIGHT_FRESHNESS = [1,0.7,0.4];
export const ABORT_MULT = 0.5;

const clamp01 = (/** @type {number} */ v) => v<0?0:v>1?1:v;
/** @param {Metrics} m @param {string} k */
const n = (m,k) => m[k]||0;
/** @type {Record<string,DrillDef>} */
export const DRILLS = {
  pushup:{id:'pushup',name:'Pompki',tree:{str:0.65,spd:0,end:0.35},base:100,worldMin:20,intensity:1,rounds:1,roundSec:[60,60,60,60,60],restSec:0,unit:'na czas',
    stages:[{goal:16,zone:10,min:5,burn:0.06},{goal:20,zone:9,min:4,burn:0.065},{goal:24,zone:8,min:4,burn:0.07},{goal:28,zone:7,min:3,burn:0.075},{goal:32,zone:6,min:3,burn:0.08}],   /* one minute: goal reps, depth target and its smallest size, burn per rep */
    quality:m=>n(m,'reps')?n(m,'points')/n(m,'reps'):0,
    complete:(m,p)=>clamp01(n(m,'reps')/p.goal)},
  pullup:{id:'pullup',name:'Podciąganie na kracie okna',tree:{str:0.7,spd:0,end:0.3},base:100,worldMin:20,intensity:1,rounds:1,roundSec:[60,60,60,60,60],restSec:0,unit:'na czas',
    stages:[{goal:20,zone:13,min:7},{goal:25,zone:12,min:6},{goal:30,zone:11,min:6},{goal:35,zone:10,min:5},{goal:40,zone:9,min:5}],   /* one minute: goal reps, starting target, its smallest size */
    quality:m=>n(m,'reps')?n(m,'points')/n(m,'reps'):0,
    complete:(m,p)=>clamp01(n(m,'reps')/p.goal)},
  roach:{id:'roach',name:'Karaluchy na ścianie',tree:{str:0.1,spd:0.65,end:0.25},base:110,worldMin:20,intensity:0.7,rounds:1,roundSec:[80,75,70,65,60],restSec:0,unit:'ogarek łoju',
    stages:[{goal:12,max:3,kinds:['black'],speed:1},{goal:16,max:4,kinds:['black','prusak'],speed:1.1},{goal:20,max:5,kinds:['black','prusak','nymph'],speed:1.2},
      {goal:25,max:6,kinds:['black','prusak','nymph','big'],speed:1.3},{goal:30,max:7,kinds:['black','prusak','nymph','big'],speed:1.45}],   /* points to reach, roaches on the wall at once, kinds, running speed */
    quality:m=>n(m,'strikes')?0.6*clamp01(n(m,'kills')/n(m,'strikes'))+0.25*(n(m,'kills')?n(m,'clean')/n(m,'kills'):0)+0.15*clamp01(1-n(m,'painMax')/100):0,
    complete:(m,p)=>clamp01(n(m,'points')/p.goal)},
  shadow:{id:'shadow',name:'Walka z cieniem',tree:{str:0,spd:0.65,end:0.35},base:120,worldMin:20,intensity:0.8,rounds:1,roundSec:null,restSec:0,unit:'10 kombinacji',
    stages:[{pace:1},{pace:1.2},{pace:1.4},{pace:1.6},{pace:1.8}],
    quality:(m,p)=>0.6*clamp01(1-0.05*n(m,'errors'))+0.4*clamp01((n(m,'actions')?n(m,'paceSum')/n(m,'actions'):1)/p.pace),
    complete:m=>clamp01(n(m,'combos')/10)},
  shadowp:{id:'shadowp',name:'Cień z Profesorem',tree:{str:0.25,spd:0.55,end:0.2},base:150,worldMin:20,intensity:0.85,rounds:1,roundSec:null,restSec:0,unit:'10 kombinacji',
    stages:[{pace:1,win:240},{pace:1.2,win:200},{pace:1.4,win:165}],
    quality:(m,p)=>0.6*clamp01(1-0.05*n(m,'errors')-0.07*n(m,'late'))+0.4*clamp01((n(m,'actions')?n(m,'paceSum')/n(m,'actions'):1)/p.pace),
    complete:m=>clamp01(n(m,'combos')/10)},
  work:{id:'work',name:'Praca w rzeźni',tree:{str:0.55,spd:0,end:0.45},base:100,worldMin:0,intensity:0.9,rounds:1,roundSec:null,restSec:0,unit:'zmiana',
    stages:[{}],
    quality:m=>n(m,'squats')?clamp01((n(m,'perfect')+0.7*n(m,'good'))/n(m,'squats')-0.1*n(m,'drops')):0,
    complete:m=>clamp01(n(m,'norma')/100)},   /* the quota of the shift: halves against the target, drops, the boxing finale */
};

/** Main tree of a drill (largest share). @param {DrillDef} d @returns {TreeKey} */
export function primaryTree(d){
  return /** @type {TreeKey} */ (Object.entries(d.tree).sort((a,b)=>b[1]-a[1])[0][0]);
}

/** Recommended stage (1–5) for a tree level. @param {number} level */
export function recommendedStage(level){
  return STAGE_BAND.findIndex(([, hi])=>level<=hi)+1||5;
}

/** Grade letter for a 0–100 score. @param {number} score */
export function gradeFor(score){ return (GRADE_AT.find(([, at])=>score>=at)||GRADE_AT[4])[0]; }

/** Challenge multiplier: easy stages fade out above their band, hard ones pay a little more.
 * @param {number} stage 1–5 @param {number} level */
export function challengeMult(stage,level){
  const [lo,hi]=STAGE_BAND[stage-1];
  if(level>hi) return Math.max(0.3,1-0.1*(level-hi));
  if(level<lo) return 1.15;
  return 1;
}

/** Freshness of the n-th session of the same drill today (n counts earlier sessions). @param {number} n @param {boolean} [fight] */
export function freshness(n,fight=false){
  const t=fight?FIGHT_FRESHNESS:FRESHNESS; return t[Math.min(t.length-1,Math.max(0,n))];
}

/** Score (0–100), grade and completion of a session. @param {DrillDef} d @param {Metrics} m @param {number} stage */
export function sessionScore(d,m,stage){
  const p=d.stages[Math.min(d.stages.length,stage)-1], c=clamp01(d.complete({...m,stage},p,d)), q=clamp01(d.quality(m,p));
  const score=Math.round(100*q*c);
  return {quality:q, completion:c, score, grade:gradeFor(score)};
}

/** XP per tree for a finished (or aborted) session, before the form multiplier.
 * @param {DrillDef} d @param {number} stage @param {{grade:string,completion:number,quality?:number,score?:number}} result
 * @param {Record<TreeKey,number>} levels @param {number} doneToday @param {boolean} aborted */
export function sessionXP(d,stage,result,levels,doneToday,aborted){
  const level=levels[primaryTree(d)];
  // XP scales with the trained part: a session failed early pays like a short one, an aborted one at half rate.
  // Grade D and aborted sessions also scale with quality, so standing idle through the clock earns nothing.
  const q=result.quality??1, sc=result.score??100;
  const core=aborted?ABORT_MULT*result.completion*Math.min(1,q/0.7):(result.grade==='D'?GRADE_MULT.D*Math.min(1,sc/50):GRADE_MULT[result.grade])*result.completion;
  const total=d.base*core*STAGE_MULT[stage-1]*challengeMult(stage,level)*freshness(doneToday)*XP_RATE;
  /** @type {Record<TreeKey,number>} */
  const out={str:0,spd:0,end:0};
  for(const k of /** @type {TreeKey[]} */ (['str','spd','end'])) out[k]=Math.round(total*d.tree[k]);
  return out;
}

/** Highest stage unlocked after this result (B or better on the current top stage opens the next).
 * @param {number} unlocked @param {number} stage @param {string} grade */
export function nextUnlocked(unlocked,stage,grade){
  return stage>=unlocked&&['S','A','B'].includes(grade)?Math.min(5,unlocked+1):unlocked;
}

export { LEVEL_MAX };

/* ---------- fights ---------- */
export const FIGHT_BASE = {spar:240, bare:180};
export const STAR_MULT = [1,1,1.35,1.7,2];
export const OUTCOME_MULT = /** @type {Record<string,number>} */ ({ko:1.25,win:1,draw:0.8,loss:0.6});
export const SIM_FIGHT_MULT = 0.25;

/**
 * XP of one fight, split by how it was fought (before the form multiplier).
 * @param {{bare:boolean,stars:number,outcome:string,simulated:boolean,today:number,levelGap:number,
 *   landed:number,power:number,knockdowns:number,evades:number,counters:number,minutes:number,blocks:number,endSta:number,perfects?:number}} f
 *   perfects: clean skill moments of a card fight, +3% XP each, at most +30%
 * @returns {Record<TreeKey,number>}
 */
export function fightXP(f){
  const gap=f.levelGap>10?Math.max(0.3,1-0.05*(f.levelGap-10)):1;   // beating far weaker opponents fades out
  const total=(f.bare?FIGHT_BASE.bare:FIGHT_BASE.spar)*STAR_MULT[Math.max(1,Math.min(4,f.stars))]*(OUTCOME_MULT[f.outcome]??1)
    *freshness(f.today,true)*(f.simulated?SIM_FIGHT_MULT:1)*gap*XP_RATE*(1+0.03*Math.min(10,f.perfects||0));
  const w={str:1+0.04*f.landed+0.12*f.power+0.6*f.knockdowns,
           spd:1+0.12*f.evades+0.15*f.counters,
           end:1+0.4*f.minutes+0.04*f.blocks+(f.endSta>=0.4?1:0)};
  /** @type {Record<TreeKey,number>} */
  let share={str:0,spd:0,end:0};
  const sum=w.str+w.spd+w.end;
  for(const k of /** @type {TreeKey[]} */ (['str','spd','end'])) share[k]=Math.max(0.2,Math.min(0.6,w[k]/sum));
  const s2=share.str+share.spd+share.end;
  /** @type {Record<TreeKey,number>} */
  const out={str:0,spd:0,end:0};
  for(const k of /** @type {TreeKey[]} */ (['str','spd','end'])) out[k]=Math.round(total*share[k]/s2);
  return out;
}

/* ---------- Profesor trials ---------- */
/**
 * @typedef {object} TrialDef
 * @property {string} name
 * @property {string} task
 * @property {string} [drill]   Training drill played at a forced stage.
 * @property {number} [stage]
 * @property {(r:any)=>boolean} ok
 * @property {{drill:string,stage:number,task:string,ok:(r:any)=>boolean}} [alt]   Another way to pass it: a drill at a forced stage.
 */
const bestGrade=(/** @type {any} */ r)=>!r.aborted&&!r.fail&&['S','A'].includes(r.grade);
/** Level-10 trials in prison, run by Profesor in the cell.
 * A fight trial with `yard` is decided by the next yard fight with a rival of at least `minStars`. */
/** @type {Record<string,TrialDef & {yard?:boolean,minStars?:number}>} */
export const PRISON_TRIALS = {
  'str:10':{name:'Próba siły',task:'Pompki, stopień III, ocena A lub S',drill:'pushup',stage:3,ok:bestGrade},
  'spd:10':{name:'Próba szybkości',task:'Cień z Profesorem, stopień III, ocena A lub S',drill:'shadowp',stage:3,ok:bestGrade},
  'end:10':{name:'Próba wytrzymałości',task:'Bójka na spacerniaku z rywalem ★★ lub mocniejszym: wygraj, nie schodząc poniżej 15% kondycji',yard:true,minStars:2,ok:f=>f.win&&f.minSta>=0.15}
};

/** Level cap of every tree while in prison; XP above it is banked up to one level. */
export const PRISON_CAP = 15;
