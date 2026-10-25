/* The day in Newgate: three phases (rano, południe, wieczór), two actions in each. Training, work and fights tire the
   hero (zmęczenie: the card fight's stamina bar is that much shorter), a nap and the night's sleep rest him; meals end
   hunger (głód: punches hit softer), the bath and the water butt wash off the dirt (higiena). The clock only exists as
   the nominal hour of the phase, for the light in the Ward and the weather. */

import { state as progressionState } from './progression.js';
import { state as boxingState } from './boxing.js';
import { weekday, WEEKDAYS, ladderNext, listEntry } from './prison-data.js';
import { weatherNow, WEATHER_PL } from './weather.js';
import { drawPocketWatch } from './pocket-watch.js';
import { drawNeedIcons } from './need-icons.js';
import { workDue, prisonGate } from './prison.js';
import { currentMeal } from './ward-meal.js';

// Runtime values owned by simulation; initialized explicitly by main.js.
export const state = {}; // simReady: save is loaded (setInfo can run earlier during boot)

/** Names of the phases (index = sim.faza). */
export const PHASES = ['rano','południe','wieczór'];
/** The hour each phase shows (lighting, weather, absolute days of the infirmary). */
export const PHASE_MIN = [8*60, 14*60, 19*60];
/** Actions in a phase. */
export const ACTIONS = 2;
/** Zmęczenie cap; the night takes 4 of it, a nap 2. */
export const TIRED_MAX = 8;
export const SLEEP_REST = 4, NAP_REST = 2;

/** What an action does to the needs. @type {Record<string,{zm?:number,glod?:number,h?:number}>} */
const ACTION_FX = {trening:{zm:1,h:-10}, praca:{zm:1,h:-20}, walka:{zm:1,h:-10}, drzemka:{zm:-NAP_REST}, posilek:{}, mycie:{}};

function S(){ return progressionState.save.sim; }
function clamp(){ const s=S(); s.zm=Math.max(0,Math.min(TIRED_MAX,Math.round(s.zm))); s.glod=Math.max(0,Math.min(5,Math.round(s.glod))); s.h=Math.max(0,Math.min(100,s.h)); }

/** The phase now (0 rano, 1 południe, 2 wieczór). */
export function simPhase(){ return S().faza; }
/** Actions still free in this phase. */
export function actionsLeft(){ return Math.max(0,ACTIONS-S().akcje); }
/** Is the phase used up (the schedule moves on in the hub)? */
export function phaseDone(){ return S().akcje>=ACTIONS; }

/** Hunger level: 0 fed, 1 hungry (−1 to every punch), 2 starving (−2). */
export function hungerLevel(){ const g=S().glod; return g>=3?2:g>=2?1:0; }
/** Zmęczenie: points the stamina bar of a fight is short of. */
export function tiredness(){ return S().zm; }

/**
 * Spend one action of the phase and apply what it does. `kind`: trening, praca, walka (tire), drzemka (rests), posilek
 * (ends hunger), mycie (with `wash` points of hygiene). Returns true when the phase is now used up.
 * @param {string} kind @param {number} [wash]
 */
export function spendAction(kind,wash=0){
  const s=S(), fx=ACTION_FX[kind]||{};
  s.akcje=Math.min(ACTIONS,s.akcje+1);
  if(fx.zm) s.zm+=fx.zm;
  if(fx.h) s.h+=fx.h;
  if(kind==='posilek') s.glod=0;
  if(kind==='mycie') s.h+=wash;
  clamp(); state.simDirty=true; simUI();
  return phaseDone();
}

/** Move to the next phase; after the evening the night passes (sleep) and a new day begins. Returns true on a new day. */
export function nextPhase(){
  const s=S(); let day=false;
  s.faza++; s.glod++; s.h-=5;
  if(s.faza>2){ s.faza=0; s.day++; s.zm-=SLEEP_REST; day=true; }
  s.akcje=0; s.min=PHASE_MIN[s.faza];
  clamp(); state.simDirty=true; simUI();
  return day;
}

/** Nudge a need: h (0–100), zm (zmęczenie), glod (hunger steps). @param {'h'|'zm'|'glod'} k @param {number} d */
export function simNudge(k,d){ const s=S(); s[k]+=d; clamp(); state.simDirty=true; simUI(); }

/** Developer mode: jump to a phase of the same day, the needs unchanged. @param {number} f */
export function simSetPhase(f){ const s=S(); s.faza=Math.max(0,Math.min(2,Math.floor(f))); s.akcje=0; s.min=PHASE_MIN[s.faza]; state.simDirty=true; }

/** The phase in words, for the HUD and the result screens. */
export function simTime(){ return PHASES[S().faza]; }

/** Orientational HUD time: actions divide each phase, with midnight ending the evening. The schedule keeps its nominal clock. */
export function simClockMinutes(){
  const s=S(), start=PHASE_MIN[s.faza], end=PHASE_MIN[s.faza+1]??24*60;
  return progressionState.devMode?s.min:start+(end-start)*Math.min(ACTIONS,s.akcje)/ACTIONS;
}

/** The hero's state in words: tiredness (the bar in a fight), hunger (punches), dirt. */
export function simFormText(){
  const s=S(), out=[], g=hungerLevel();
  out.push(s.zm?'zmęczony · kondycja w walce −'+s.zm:'wypoczęty');
  if(g) out.push((g>1?'wygłodzony':'głodny')+' · ciosy −'+g);
  if(s.h<25) out.push('brudny');
  return out.join(' · ');
}

/** Render the three needs using the same thresholds as their gameplay consequences. */
function needsUI(){
  if(!state.needsEl) state.needsEl=document.getElementById('needsHud');
  if(!state.needsEl) return;
  const s=S(), g=hungerLevel(), rows=[
    ['hunger','Głód',s.glod,5,g>1?'Wygłodzony · ciosy −2':g?'Głodny · ciosy −1':s.glod?'Lekki głód':'Po posiłku',g>1?'bad':g?'warn':''],
    ['fatigue','Zmęczenie',s.zm,TIRED_MAX,s.zm?'Kondycja −'+s.zm:'Wypoczęty',s.zm>=4?'bad':s.zm>=2?'warn':''],
    ['hygiene','Higiena',Math.round(s.h),100,s.h<25?'Bardzo brudny':s.h<40?'Brudny':s.h<70?'Do odświeżenia':'Czysty',s.h<25?'bad':s.h<40?'warn':'']
  ];
  const h=rows.map(([key,label,value,max,note,tone])=>{
    const steps=max===100?10:max, filled=Math.round(value/max*steps);
    return '<div class="need '+tone+'" data-need="'+key+'"><div class="need-meter" role="meter" aria-label="'+label+'" aria-valuemin="0" aria-valuemax="'+max+'" aria-valuenow="'+value+'" aria-valuetext="'+note+'" data-filled="'+filled+'" style="--steps:'+steps+';--fill:'+(filled/steps*100).toFixed(2)+'%"><i class="need-ring" aria-hidden="true"></i><canvas width="32" height="32" aria-hidden="true"></canvas></div><div class="need-info"><div class="need-heading"><b>'+label+'</b></div><small>'+note+'</small></div></div>';
  }).join('');
  if(h!==state.needsLastHTML){ state.needsEl.innerHTML=h; drawNeedIcons(state.needsEl); state.needsLastHTML=h; }
}

export function simUI(){
  if(!state.simReady) return; const s=S();
  if(boxingState.gstate==='hub'||boxingState.gstate==='menu') needsUI();
  if(!state.simCardEl){ state.simCardEl=document.getElementById('simCard'); state.simMiniEl=document.getElementById('simMini'); }
  const left=actionsLeft(), dots='●'.repeat(left)+'○'.repeat(ACTIONS-left);
  if(state.simCardEl&&(boxingState.gstate==='hub'||boxingState.gstate==='menu')){
    const minutes=simClockMinutes(), time=String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
    let h='<canvas class="pocket-watch" width="48" height="62" aria-hidden="true"></canvas><div class="watch-info">';
    h+='<div class="watch-date">'+WEEKDAYS[weekday(s.day)]+' · dzień '+s.day+'</div>';
    h+='<div class="when">'+PHASES[s.faza]+'</div><div class="watch-time">'+time+'</div>';
    h+='<div class="watch-actions" role="img" aria-label="Pozostałe punkty akcji: '+left+' z '+ACTIONS+'">';
    for(let i=0;i<ACTIONS;i++) h+='<i class="action-token'+(i<left?' available':'')+'" aria-hidden="true"></i>';
    h+='<span>akcje <b>'+left+'/'+ACTIONS+'</b></span></div>';
    if(weatherNow()!=='sun') h+='<div class="watch-weather">'+WEATHER_PL[weatherNow()]+'</div>';
    const M=currentMeal(), mealAvailable=!!M&&!M.eaten&&!prisonGate();
    h+='<div class="watch-meal'+(mealAvailable?' available':'')+'">'+(mealAvailable?(M.label==='śniadanie'?'Śniadanie':'Kolacja')+' · '+(M.tray?'zjedz na pryczy':'odbierz przy drzwiach'):M?.eaten?'Posiłek zjedzony':'Posiłek niedostępny')+'</div>';
    h+='<div class="watch-mealtimes">◆ Posiłki: rano i wieczorem</div></div>';
    const P=progressionState.save.prison, next=P.profesor.spotkany?listEntry(P.lista.rozdzial):ladderNext(P.pokonani);
    h+='<div class="watch-quest"><small>'+(P.profesor.spotkany?'Lista Profesora':'Następny przeciwnik')+'</small><b>'+(next?next.name:'Lista ukończona')+'</b>'+(next?'<span>'+next.where+'</span>':'');
    if(workDue()&&!prisonGate()) h+='<strong>Obowiązek: żelazna korba <span>Rano · przy drzwiach · 1 akcja</span></strong>';
    h+='</div>';
    if(h!==state.simLastHTML){ state.simCardEl.innerHTML=h; state.simCardEl.title='Zegarek wskazuje orientacyjny czas. Wydanie akcji przesuwa porę dnia; chodzenie jest darmowe.'; drawPocketWatch(state.simCardEl.querySelector('canvas'),minutes,mealAvailable); state.simLastHTML=h; }
  }
  if(state.simMiniEl){ const t='Dzień '+s.day+' · '+PHASES[s.faza]+' · akcje '+dots+' · '+simFormText(); if(t!==state.simLastMini){ state.simMiniEl.textContent=t; state.simLastMini=t; } }
}

export function initialize(){
  state.simDirty = false;
  state.simReady = false;
  state.simCardEl = null;
  state.simMiniEl = null;
  state.simLastHTML = '';
  state.simLastMini = '';
  state.needsEl = null;
  state.needsLastHTML = '';
}
