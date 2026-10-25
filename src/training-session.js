/* Owner of the running closed training session: rounds, rest, metrics, the summary screen and XP.
   Training modes start a session with hooks, report metrics and end rounds; they never assign its fields. */

import { DRILLS, ROMAN, recommendedStage, primaryTree, sessionScore, sessionXP, nextUnlocked, STAGE_BAND, PRISON_TRIALS } from './training-data.js';
import { state as progression, addXP, persist, sessXPText, resetSessXP, passTrial } from './progression.js';
import { state as boxing, popup } from './boxing.js';
import { state as appearance } from './appearance.js';
import { state as input, setInfo } from './input.js';
import { sfxBell, sfxChime } from './audio.js';
import { exitToHub } from './navigation.js';

/**
 * @typedef {object} SessionHooks
 * @property {(round:number)=>void} [rest]    Freeze the exercise between rounds.
 * @property {(round:number)=>void} [resume]  Restart the exercise for the next round.
 * @property {()=>void} [end]                 Freeze the exercise for the summary.
 * @property {()=>void} [again]               Start the same drill again.
 * @property {(result:any)=>string} [extra]   Extra summary rows (HTML spans).
 * @property {boolean} [silent]               Do not open the summary (the mode has its own end screen).
 * @property {boolean} [ownEsc]               The mode handles Esc itself (e.g. ends the work shift).
 */

export const state = {
  /** @type {any} */ S:null,
  /** @type {Record<string,number>} */ chosen:{},
  escAt:-1e9,
  /** @type {any} */ last:null,
  hud:/** @type {HTMLElement|null} */ (null),
  hudT:0,
  summaryOpen:false,
  /** @type {{id:string,def:any}|null} Trial armed by Profesor for the next matching drill or fight. */ trial:null,
  T_REST:0, T_SET:0, T_ROUND:-1,
  /** @type {((r:any)=>void)[]} Observers of finished sessions. */ listeners:[],
};

/** Stages the player has unlocked for a drill (1–5). @param {string} id */
export function unlockedStage(id){ return progression.save?.train?.stage?.[id]||1; }

/** Stage that the next session of a drill will use. @param {string} id */
export function stageFor(id){
  const d=DRILLS[id], max=Math.min(d.stages.length,unlockedStage(id));
  if(state.chosen[id]) return Math.min(max,state.chosen[id]);
  return Math.max(1,Math.min(max,recommendedStage(progression.save.stats[primaryTree(d)].lvl)));
}

/** Choose a stage explicitly (station menu, tests). @param {string} id @param {number} stage */
export function chooseStage(id,stage){ state.chosen[id]=Math.max(1,Math.min(unlockedStage(id),Math.floor(stage))); }

/** Station-menu toggle that cycles through unlocked stages. @param {string} id */
export function stageOption(id){
  const d=DRILLS[id];
  return [()=>{ const s=stageFor(id), rec=recommendedStage(progression.save.stats[primaryTree(d)].lvl), max=unlockedStage(id);
      return 'Stopień '+ROMAN[s-1]+' ('+d.unit+(d.roundSec?', '+d.roundSec[s-1]+' s':'')+') · zalecany '+ROMAN[rec-1]+(max<5?' · '+ROMAN[max]+' po ocenie B':'')+' — zmień'; },
    ()=>{ const max=unlockedStage(id); state.chosen[id]=stageFor(id)%max+1; return 'stay'; }];
}

/** Parameters of the current stage of a running session, or of the next one. @param {string} [id] */
export function sessionParams(id){
  if(state.S&&(!id||state.S.def.id===id)) return state.S.p;
  const d=DRILLS[/** @type {string} */ (id)]; return d.stages[stageFor(/** @type {string} */ (id))-1];
}

/** @returns {boolean} A session owns the current mode (running, resting or showing its summary). */
export function sessionOpen(){ return !!state.S; }
/** @returns {boolean} Inputs of the exercise count right now. */
export function sessionRunning(){ return !!state.S&&state.S.phase==='run'; }
/** @returns {boolean} The exercise is running or resting between rounds. */
export function sessionActive(){ return !!state.S&&(state.S.phase==='run'||state.S.phase==='rest'); }
/** @returns {string} Id of the running drill or ''. */
export function sessionDrill(){ return state.S?state.S.def.id:''; }
/** Current round (1-based). */
export function sessionRound(){ return state.S?state.S.round:0; }

/** Number of sessions of a drill already done today. @param {string} key */
export function doneToday(key){
  const t=progression.save.train, day=progression.save.sim.day;
  if(t.day!==day){ t.day=day; t.count={}; }
  return t.count[key]||0;
}

/** Begin a closed session of a drill. @param {string} id @param {SessionHooks} hooks @param {number} [stage] */
export function beginSession(id,hooks,stage){
  if(state.S&&state.S.phase!=='summary') sessionLeave();   // switching drills scores the old one as aborted
  if(state.summaryOpen&&input.overEl){ input.overEl.hidden=true; state.summaryOpen=false; }
  const T=state.trial, trial=T&&T.def.drill===id?T:null; if(trial) state.trial=null;
  const d=DRILLS[id], s=trial?trial.def.stage:Math.min(d.stages.length,stage||stageFor(id));
  resetSessXP();
  state.S={def:d, stage:s, p:d.stages[s-1], m:{}, round:1, phase:'run', t:d.roundSec?d.roundSec[s-1]*60:0, hooks:trial?{...hooks,again:undefined}:hooks, fail:'', trial};
  state.escAt=-1e9; state.last=null;
  if(state.hud) state.hud.hidden=false;
  renderHud();
  return state.S.p;
}

/** Count a metric of the running session. @param {string} key @param {number} [delta] */
export function sessionMetric(key,delta=1){ const S=state.S; if(S&&S.phase==='run') S.m[key]=(S.m[key]||0)+delta; }

/** Read a metric of the running session. @param {string} key */
export function sessionValue(key){ return state.S?.m[key]||0; }

/** Advance timers once per simulation step. */
export function sessionTick(){
  const S=state.S; if(!S) return;
  if(S.phase==='run'){
    S.m.runTicks=(S.m.runTicks||0)+1;
    if(S.def.roundSec&&--S.t<=0) sessionRoundDone();
  } else if(S.phase==='rest'){
    if(--S.t<=0) resumeRound();
  }
  if(++state.hudT>=6){ state.hudT=0; renderHud(); }
}

/** Extend the running timed round by seconds earned in play. @param {number} sec */
export function sessionAddTime(sec){ const S=state.S; if(S&&S.phase==='run'&&S.def.roundSec) S.t+=sec*60; }

/** End the current round or set; the last one finishes the session. */
export function sessionRoundDone(){
  const S=state.S; if(!S||S.phase!=='run') return;
  if(S.round>=S.def.rounds){ finishSession(false); return; }
  S.phase='rest'; S.t=S.def.restSec*60;
  popup(state.T_REST,72,30,appearance.C_SWEAT,2,90); sfxBell(2);
  S.hooks.rest?.(S.round);
  renderHud(); setInfo();
}

function resumeRound(){
  const S=state.S; if(!S||S.phase!=='rest') return;
  S.round++; S.phase='run'; S.t=S.def.roundSec?S.def.roundSec[S.stage-1]*60:0;
  popup((S.def.roundSec&&state.T_ROUND>=0?state.T_ROUND:state.T_SET)+Math.min(2,S.round-1),72,30,appearance.C_SPARK,2,60); sfxBell(1);
  S.hooks.resume?.(S.round);
  renderHud(); setInfo();
}

/** End the session at once (lives lost, too many trips). @param {string} reason */
export function sessionFail(reason){ const S=state.S; if(!S||S.phase==='summary') return; S.fail=reason; finishSession(false); }

/** Score the session, grant XP, charge world time and show the summary.
 * @param {boolean} aborted @returns {any} Result, also kept as state.last. */
export function finishSession(aborted){
  const S=state.S; if(!S||S.phase==='summary') return state.last;
  const d=S.def, sc=sessionScore(d,S.m,S.stage), save=progression.save, key=d.id;
  const levels={str:save.stats.str.lvl,spd:save.stats.spd.lvl,end:save.stats.end.lvl};
  const today=doneToday(key), xp=sessionXP(d,S.stage,sc,levels,today,aborted);
  resetSessXP();
  for(const k of /** @type {('str'|'spd'|'end')[]} */ (['str','spd','end'])) if(xp[k]>0) addXP(k,xp[k]);
  save.train.count[key]=today+1;
  const unlockedBefore=unlockedStage(key);
  if(!aborted){
    const best=save.train.best[key];
    if(!best||sc.score>best.score) save.train.best[key]={grade:sc.grade,score:sc.score};
    save.train.stage[key]=nextUnlocked(unlockedBefore,S.stage,sc.grade);
  }
  persist();
  const result={id:key,name:d.name,stage:S.stage,aborted,fail:S.fail,...sc,xp,gained:sessXPText(),today,unlocked:unlockedStage(key)>unlockedBefore?unlockedStage(key):0,round:S.round,rounds:d.rounds,metrics:{...S.m},trial:/** @type {any} */ (null)};
  if(S.trial){ const [k,l]=S.trial.id.split(':'), ok=S.trial.def.ok(result); result.trial={name:S.trial.def.name,task:S.trial.def.task,passed:ok}; if(ok) passTrial(k,+l); }
  state.last=result; S.phase='summary';
  for(const fn of state.listeners) fn(result);
  S.hooks.end?.();
  if(!S.hooks.silent) showSummary(result);
  renderHud(); setInfo();
  sfxChime(aborted?520:(['S','A'].includes(sc.grade)?1320:880));
  return result;
}

/** Abort a running session (Esc twice): half XP for the trained part, no grade bonus. */
export function abortSession(){ return finishSession(true); }

/** The mode is being left: an unfinished session is scored as aborted, without a summary. */
export function sessionLeave(){
  const S=state.S; if(!S) return;
  if(S.phase==='run'||S.phase==='rest'){ S.hooks={...S.hooks,silent:true,end:undefined,rest:undefined,resume:undefined}; finishSession(true); }
  state.S=null; if(state.hud) state.hud.hidden=true;
  if(input.overEl&&state.summaryOpen){ input.overEl.hidden=true; }
  state.summaryOpen=false;
}

/** Arm a Profesor trial; the next matching drill or yard fight decides it. @param {string} id e.g. 'str:10' */
export function armTrial(id){ state.trial=PRISON_TRIALS[id]?{id,def:PRISON_TRIALS[id]}:null; }

/** Take the armed fight trial for a yard rival of the required strength. @param {number} opp @param {string} venue @param {number} [stars] */
export function takeFightTrial(opp,venue,stars=0){
  const t=state.trial;
  if(!t?.def.yard||venue!=='yard'||stars<(t.def.minStars||0)) return null;
  state.trial=null; return t;
}

/** Summary rows for the shared result card. @param {any} r */
export function summaryRows(r){
  const pct=(/** @type {number} */ v)=>Math.round(v*100)+'%';
  let h='<span>Trening</span><span>'+r.name+' · stopień '+ROMAN[r.stage-1]+'</span>';
  h+='<span>Ocena</span><span><b class="grade grade-'+(r.aborted?'x':r.grade)+'">'+(r.aborted?'—':r.grade)+'</b> · wynik '+r.score+'% (jakość '+pct(r.quality)+' × ukończenie '+pct(r.completion)+')'+(r.aborted?' · przerwany':'')+(r.fail?' · '+r.fail:'')+'</span>';
  h+='<span>Doświadczenie</span><span>'+(r.gained||'—')+(r.today>=2?' · świeżość '+Math.round(100*[1,1,0.8,0.6,0.4][Math.min(4,r.today)])+'% (to ćwiczenie dziś: '+(r.today+1)+'.)':'')+'</span>';
  if(r.trial) h+='<span>Próba Profesora</span><span><b class="grade grade-'+(r.trial.passed?'A':'D')+'">'+(r.trial.passed?'ZDANA':'NIEZDANA')+'</b> · '+r.trial.task+'</span>';
  if(r.unlocked) h+='<span>Nowy stopień</span><span>Odblokowano stopień '+ROMAN[r.unlocked-1]+'</span>';
  const best=progression.save.train.best[r.id];
  if(best) h+='<span>Najlepszy wynik</span><span>'+best.grade+' · '+best.score+'%</span>';
  return h;
}

/** @param {any} r */
function showSummary(r){
  const S=state.S;
  input.overTitle.textContent=r.aborted?'TRENING PRZERWANY':(r.fail?'KONIEC — '+r.fail.toUpperCase():'TRENING ZAKOŃCZONY · '+r.grade);
  input.overStats.innerHTML=summaryRows(r)+(S.hooks.extra?S.hooks.extra(r):'');
  input.againFn=()=>{ const again=S.hooks.again; input.overEl.hidden=true; state.summaryOpen=false; state.S=null; if(again) again(); else exitToHub(); };
  input.overEl.hidden=false; state.summaryOpen=true; input.againBtn.focus();
}

/** Keyboard handling owned by the session: summary, rest and the double-Esc abort.
 * @param {KeyboardEvent} e @returns {boolean} Whether the event was consumed. */
export function sessionKey(e){
  const S=state.S; if(!S||e.repeat) return false;
  if(S.phase==='summary'){
    if(!state.summaryOpen) return false;
    if(e.code==='Enter'||e.code==='Space'){ e.preventDefault(); input.againFn(); }
    else if(e.code==='Escape'){ e.preventDefault(); exitToHub(); }
    return true;
  }
  if(e.code==='Escape'&&!S.hooks.ownEsc){
    e.preventDefault();
    if(S.phase==='run'&&Object.keys(S.m).every(k=>k==='runTicks'||!S.m[k])){ exitToHub(); return true; }   // nothing done yet: leave at once, as before
    if(performance.now()-state.escAt<2200){ state.escAt=-1e9; abortSession(); return true; }
    state.escAt=performance.now(); renderHud(true); return true;
  }
  if(S.phase==='rest'){
    if(e.code==='Enter'){ e.preventDefault(); resumeRound(); }
    return true;   // the exercise waits for the next round
  }
  return false;
}

/** @param {boolean} [askAbort] */
function renderHud(askAbort){
  const el=state.hud, S=state.S; if(!el) return;
  if(!S){ el.hidden=true; return; }
  const sec=(/** @type {number} */ t)=>{ const s=Math.max(0,Math.ceil(t/60)); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); };
  const sc=sessionScore(S.def,S.m,S.stage);
  let h='<b>'+S.def.name.toUpperCase()+' · '+ROMAN[S.stage-1]+'</b>';
  if(S.phase==='run'){
    h+='<span>'+(S.def.rounds>1?(S.def.roundSec?'runda ':'seria ')+S.round+'/'+S.def.rounds:'')+(S.def.roundSec?(S.def.rounds>1?' · ':'czas ')+sec(S.t):'')+'</span>';
    h+='<span>wynik '+sc.score+'% → <b class="grade grade-'+sc.grade+'">'+sc.grade+'</b></span>';
  } else if(S.phase==='rest') h+='<span>PRZERWA '+sec(S.t)+' · Enter — dalej</span><span>wynik '+sc.score+'%</span>';
  else h+='<span>koniec · '+(state.last?.aborted?'przerwany':'ocena '+state.last?.grade)+'</span>';
  if(askAbort||performance.now()-state.escAt<2200) h+='<span class="ask">Esc ponownie — przerwij (½ XP za wykonaną część)</span>';
  if(el.innerHTML!==h) el.innerHTML=h;
  el.hidden=false;
}

/** Stage band text for menus. @param {number} stage */
export function stageBand(stage){ const [lo,hi]=STAGE_BAND[stage-1]; return lo+'–'+hi; }

/** Call `fn` with the result of every finished session (Profesor's daily task and fight notes). @param {(r:any)=>void} fn */
export function onSessionEnd(fn){ state.listeners.push(fn); }

export function initialize(){
  state.hud=document.getElementById('sessionHud');
  state.T_REST=boxing.TXT.length; boxing.TXT.push('PRZERWA');
  state.T_SET=boxing.TXT.length; boxing.TXT.push('SERIA 1','SERIA 2','SERIA 3');
  state.T_ROUND=boxing.TXT.indexOf('RUNDA 1');
}
