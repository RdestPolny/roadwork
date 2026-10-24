import { state as boxing, drawText } from './boxing.js';
import { state as appearance, rgb } from './appearance.js';
import { state as renderer, pset, setFramebuffer } from './renderer.js';
import { state as input, setInfo } from './input.js';
import { leaveMode, setPanelMode } from './navigation.js';
import { applyStats, resetSessXP, statShort } from './progression.js';
import { setPrisonOutfit } from './pushups.js';
import { buildPullupBackground, pullupSceneTick, renderPullupScene } from './pullup-scene.js';
import { initAudio, sfxBreath, sfxChime, sfxMiss } from './audio.js';
import { beginSession, sessionMetric, sessionAddTime, sessionOpen, sessionRunning, sessionParams } from './training-session.js';

/** Perfect core of the target; a miss locks the bar for three seconds. */
const C_PERFECT=rgb('#a8f28c'), C_LOCK=rgb('#4a1812'), LOCK_TICKS=180, REST_TICKS=20;
/** Outside a session (debug start) the stage I parameters apply. */
const FREE={goal:20,zone:13,min:7};
export const state={phase:'hang',held:false,armed:true,height:0,velocity:0,reps:0,perfects:0,combo:0,best:0,streak:0,target:40,zoneSize:13,hit:false,topTicks:0,rest:0,lock:0,feedback:'',flash:'',flashC:0,flashT:0,background:null};

/** Use the same pixel position for drawing and judging the release. @param {number} height */
function meterY(height){ return Math.round(74-49*height); }

/** Rows of the target: the whole OK zone and the perfect core in its middle; drawing and judging share them. */
export function pullupZone(){
  const top=Math.round(state.target)-Math.floor((state.zoneSize-1)/2), n=Math.max(2,Math.round(state.zoneSize/3)), core=top+Math.floor((state.zoneSize-n)/2);
  return {top,end:top+state.zoneSize,coreTop:core,coreEnd:core+n};
}
/** Stage parameters: goal reps for the minute, starting zone, the smallest zone. */
function params(){ return sessionOpen()?sessionParams('pullup'):FREE; }
/** Move the target somewhere new, at least 6 rows from where it was. */
function moveTarget(){ let t; do t=32+Math.random()*20; while(Math.abs(t-state.target)<6); state.target=t; }
/** @param {string} text @param {number} color */
function flash(text,color){ state.flash=text; state.flashC=color; state.flashT=50; }

/** Begin the exercise: one minute at the window, as many pull-ups as he can. */
export function startPullups(){
  leaveMode(); initAudio(); boxing.gstate='pullup'; applyStats(); resetSessXP();
  const p=beginSession('pullup',{end:()=>{ state.held=false; },again:()=>startPullups()});
  Object.assign(state,{phase:'hang',held:false,armed:true,height:0,velocity:0,reps:0,perfects:0,combo:0,best:0,streak:0,target:40,zoneSize:p.zone,hit:false,topTicks:0,rest:0,lock:0,flashT:0,
    feedback:'Minuta na kracie. Przytrzymaj Spację i puść ją w strefie — zielony środek to ideał. Skucha blokuje na 3 s.'});
  moveTarget(); setPrisonOutfit(true); state.background=buildPullupBackground();
  document.body.classList.add('pullup'); setPanelMode(); solvePullup(); setInfo();
}

/** Release input on exit and restore the player's equipment palette. */
export function resetPullups(){ state.held=false; state.phase='hang'; setPrisonOutfit(false); document.body.classList.remove('pullup'); }

/** Keyboard and touch share a held input; simulation alone changes exercise progress. @param {boolean} down */
export function holdPullup(down){ if(boxing.gstate==='pullup'&&(!input.paused||!down)&&!(down&&sessionOpen()&&!sessionRunning())) state.held=down; }

/** A good release: count it, shrink the target towards the stage's minimum and move it; every fifth perfect in a row
 * buys two seconds. @param {boolean} perfect */
function scoreRep(perfect){
  state.hit=true; state.reps++; state.combo++; state.best=Math.max(state.best,state.combo); state.streak=perfect?state.streak+1:0;
  sessionMetric('reps'); sessionMetric('points',perfect?1:0.7);
  if(perfect){ state.perfects++; sessionMetric('perfect'); }
  const bonus=perfect&&state.streak%5===0; if(bonus) sessionAddTime(2);
  state.zoneSize=Math.max(params().min,state.zoneSize-1); moveTarget();
  flash(perfect?(bonus?'IDEALNIE +2 S':'IDEALNIE'):'DOBRZE',perfect?C_PERFECT:appearance.C_SPARK);
  state.feedback=perfect?(bonus?'Pięć idealnych z rzędu — +2 s!':'Idealnie! Passa idealnych: '+state.streak+'.'):'Zaliczone. Celuj w zielony środek.';
  sfxChime(perfect?1000+Math.min(10,state.streak)*40:760);
}
/** A miss: the bar is locked for three seconds, the target widens a little and moves. @param {string} why */
function missRep(why){
  state.phase='down'; state.velocity=0; state.hit=false; state.combo=0; state.streak=0; state.lock=LOCK_TICKS;
  state.zoneSize=Math.min(params().zone,state.zoneSize+2); moveTarget(); sessionMetric('misses');
  flash('SKUCHA',appearance.C_RED); state.feedback=why+' Blokada 3 s.'; sfxMiss(); setInfo();
}

/** Judge the release against the visible target, then lower automatically; a miss locks the bar. */
export function pullupTick(){
  if(state.flashT>0) state.flashT--;
  if(state.lock>0){ state.lock--; if(state.lock%60===0) setInfo(); if(state.lock===0&&state.phase==='lock'){ state.phase='hang'; state.armed=!state.held; state.feedback='Znowu na kracie — przytrzymaj Spację.'; setInfo(); } }
  if(state.phase==='lock') return;
  if(state.phase==='rest'){
    if(--state.rest<=0){ state.phase='hang'; state.armed=!state.held; setInfo(); }
    return;
  }
  if(state.phase==='hang'){
    if(!state.held) state.armed=true;
    if(!state.held||!state.armed) return;
    state.phase='up'; state.hit=false; state.topTicks=0; state.feedback='Puść Spację w strefie — zielony środek to ideał.'; sfxBreath(); setInfo();
  }
  if(state.phase==='up'){
    if(state.held){
      state.height=Math.min(1,state.height+0.012*(1-Math.min(0.3,state.reps*0.012)));
      if(state.height===1&&++state.topTicks>45) missRep('Za długo na górze.');
    } else {
      const y=meterY(state.height), z=pullupZone();
      if(y>=z.top&&y<z.end){ state.phase='down'; state.velocity=0; scoreRep(y>=z.coreTop&&y<z.coreEnd); setInfo(); }
      else missRep(y<z.top?'Za wysoko — minąłeś strefę.':'Za nisko — puściłeś przed strefą.');
    }
    return;
  }
  if(state.phase==='down'){
    state.velocity+=(0.045-state.velocity)*0.25;
    state.height=Math.max(0,state.height-state.velocity);
    if(state.height>0) return;
    state.armed=false;
    if(state.lock>0) state.phase='lock'; else { state.phase='rest'; state.rest=REST_TICKS; }
    setInfo();
  }
}

/** Step the scene seen from behind: progress towards the current target is the pose; holding past it strains. */
export function solvePullup(){
  const top=(74-state.target)/49;
  pullupSceneTick({p:Math.min(1,state.height/top),phase:state.phase,held:state.held,reps:state.reps,strain:state.phase==='up'&&state.height>=top?Math.min(1,state.topTicks/45+0.3):0});
}

/** Render the window scene, then the meter (the OK zone, its perfect core, the lock), the count and the call. */
export function renderPullup(){
  setFramebuffer(renderer.FB_MAIN); renderPullupScene();
  const x=133,y0=25,y1=74,y=meterY(state.height),z=pullupZone(),locked=state.lock>0;
  for(let py=y0;py<=y1;py++) for(let px=x;px<=x+3;px++){
    const c=py>=z.coreTop&&py<z.coreEnd?C_PERFECT:py>=z.top&&py<z.end?appearance.C_SPARK:locked?C_LOCK:appearance.C_FLOOR_EDGE;
    pset(px,py,c); }
  for(let px=x-1;px<=x+4;px++) pset(px,y,appearance.C_WHITE);
  drawText(String(state.reps),134,12,appearance.C_SPARK,1);
  if(locked) drawText(String(Math.ceil(state.lock/60)),135,78,state.flashC,1);
  if(state.flashT>0&&(state.flashT>12||state.flashT&2)) drawText(state.flash,72,3,state.flashC,1);
}

/** Keep the DOM instructions and touch control in sync with the current phase. */
export function pullupInfo(){
  input.infoEl.textContent='PODCIĄGANIE NA KRACIE OKNA · '+state.reps+' powt. ('+state.perfects+' idealnych) · passa '+state.combo+' · najlepsza '+state.best;
  input.livesEl.textContent=''; input.nextEl.textContent=state.feedback+(state.lock>0?' Jeszcze '+Math.ceil(state.lock/60)+' s.':'')+' · '+statShort()+' · Esc — wróć do celi';
  const button=document.getElementById('pullupAction');
  if(button) button.textContent=state.lock>0?'Skucha · blokada '+Math.ceil(state.lock/60)+' s':state.phase==='down'||state.phase==='rest'?'Opuszczanie · kolejne podciągnięcie za chwilę':'Przytrzymaj · podciągnij / puść w strefie';
}

export function initialize(){
  const button=document.getElementById('pullupAction');
  button.addEventListener('pointerdown',e=>{ e.preventDefault(); button.setPointerCapture(e.pointerId); holdPullup(true); });
  button.addEventListener('pointerup',()=>holdPullup(false)); button.addEventListener('pointercancel',()=>holdPullup(false));
  button.addEventListener('lostpointercapture',()=>holdPullup(false));
  addEventListener('blur',()=>holdPullup(false));
}
