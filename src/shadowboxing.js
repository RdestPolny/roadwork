import { createSequence, enqueueAction, beginAction, finishAction, nextSequenceCombo, tickSequence } from './shadow-sequence.js';
import { startShadowCombat, finishShadowCombat, setShadowTempo, shadowReady, resetShadowPosition, performShadowAction, state as spar } from './sparring.js';
import { state as boxing } from './boxing.js';
import { state as moves } from './animation.js';
import { state as input, inputNow } from './input.js';
import { state as gym, stationOf } from './gym.js';
import { beginSession, sessionMetric, finishSession, state as sessionState } from './training-session.js';
import { ROMAN } from './training-data.js';
import { exitToHub } from './navigation.js';
import { skillIcon } from './skill-icons.js';
import { sfxChime, sfxMiss } from './audio.js';

export const COMBOS=[['J','C'],['J','C','H'],['J','bC','H'],['DF','J','C','DB'],['S','C','H'],['S','J','bH'],['J','P','C','H'],['DF','J','bC','P','H','DB'],['DF','J','C','DB','DF','bH'],['bC','P','H','DB','DF','U']];
export const state={active:false,sequence:null};
const LABELS={J:'Jab',C:'Cross',H:'Hook',U:'Upper',DF:'Doskok',DB:'Odskok',S:'Slip',D:'Unik',P:'Pivot'};
const ICONS={J:'double-jab',C:'executioner',H:'butcher',U:'duck-launch',DF:'vanishing-target',DB:'efficient-evade',S:'mirror-counter',D:'duck-launch',P:'rolling'};

/** Number of manually accepted steps, including animations waiting in the queue. */
function accepted(){const S=state.sequence;return S.completed+(S.active?1:0)+S.queue.length;}

/** Facing for queued controls, including pivots already accepted but not yet animated. */
export function shadowInputMirror(){
  if(!state.active)return !!spar.FA.mirror;
  return state.sequence.current.slice(0,accepted()).reduce((face,token)=>token==='P'?!face:face,state.startMirror);
}

/** Begin the ten-combo cell session using the existing fighter and pivot animations. */
export function startShadowboxing(station,opts){
  const item=gym.cellList.find(it=>it.t==='cshadow');
  state.station=station||state.station||(item?stationOf(item):null);
  state.opts=opts||null; state.prof=!!opts;   // Cień z Profesorem: he picks the combos and calls them in a bubble, at his tempo
  startShadowCombat(state.station);
  const p=beginSession(state.prof?'shadowp':'shadow',{silent:true,end:showSummary,again:()=>startShadowboxing(state.station,state.opts||undefined)},state.prof?opts.stage:undefined);
  state.window=state.prof?(p.win||240):0;
  state.active=true;state.sequence=createSequence(state.prof?opts.combos:COMBOS);state.feedbackUntil=0;
  document.body.classList.add('shadow');document.body.classList.toggle('shadowprof',state.prof);state.hud.hidden=false;
  state.summary.hidden=true;state.restart.hidden=true;
  prepareCombo();
}

/** Release the training overlay when its owning combat scene exits. */
export function stopShadowboxing(){
  state.active=false; state.prof=false; document.body.classList.remove('shadowprof');
  if(state.hud)state.hud.hidden=true;
  document.body.classList.remove('shadow');
}

/** Show the current combination with controls calculated separately for each pivot side. */
function prepareCombo(){
  resetShadowPosition(state.sequence.current[0]==='DF');
  state.startMirror=!!spar.FA.mirror;
  let face=state.startMirror;
  state.steps.innerHTML=state.sequence.current.map(token=>{
    const body=token.startsWith('b'),base=body?token.slice(1):token,punch='JCHU'.indexOf(base);
    const key=punch>=0?(body?'↓ + ':'')+(punch+1):base==='S'?'Q':base==='D'?'Spacja':'2×'+((base==='DB')!==face?'←':'→');
    const html='<li>'+skillIcon(body?'body-hammer':ICONS[base])+'<b>'+LABELS[base]+(body?' · korpus':'')+'</b><kbd>'+key+'</kbd></li>';
    if(token==='P')face=!face;
    return html;
  }).join('');
  state.cards=[...state.steps.children];
  state.comboT0=boxing.tick; state.late=false;
  if(state.prof){ state.call=callOf(state.sequence.current); state.callT=boxing.tick; }
  notice(state.prof?'Profesor woła: '+state.call.toLowerCase()+' — zdąż w jego tempie.':'Wykonaj kombinację. Szybsze poprawne inputy przyspieszają animacje.');
  renderProgress();
}

/** Update feedback only when its text changes, keeping screen-reader announcements useful. */
function notice(text){if(state.notice.textContent!==text)state.notice.textContent=text;}

/** Submit one manual action; wrong order resets this combination without awarding XP. */
export function shadowSubmit(token){
  if(!state.active||input.paused)return;
  const result=enqueueAction(state.sequence,token,inputNow());
  if(result==='wrong'){
    sessionMetric('errors');
    prepareCombo();setShadowTempo(1);sfxMiss();
    notice('Pomyłka — spróbuj jeszcze raz tej samej kombinacji.');
  }
  renderProgress();
}

/** Route fight controls to head/body tokens at input time, before the queued animation. */
export function shadowPress(id){
  if(id<=3){shadowSubmit(((input.bodyHeld||input.bodyEl.checked)?'b':'')+'JCHU'[id]);return;}
  const token=id===moves.M_DASHF?'DF':id===moves.M_DASHB?'DB':id===moves.M_PIVOT?'P':id===moves.M_DODGE?'D':id===moves.M_SLIPL||id===moves.M_SLIPR?'S':null;
  if(token)shadowSubmit(token);
}

/** A close forward pair means pivot when that is the next instructed action. */
export function shadowDoubleTap(forward){
  const next=state.sequence.current[accepted()];
  shadowSubmit(forward?(next==='P'?'P':'DF'):'DB');
}

/** Translate a validated token into an existing animation. */
function action(token){
  const low=token.startsWith('b'),base=low?token.slice(1):token,punch='JCHU'.indexOf(base);
  const id=punch>=0?punch:{DF:moves.M_DASHF,DB:moves.M_DASHB,S:moves.M_SLIPL,D:moves.M_DODGE,P:moves.M_PIVOT}[base];
  return performShadowAction(id,low);
}

/** Advance on completed animations; cadence uses the simulation clock and freezes on pause. */
export function shadowTick(){
  if(!state.active)return;
  const S=state.sequence;
  tickSequence(S,boxing.simNow);setShadowTempo(S.pace);
  if(state.prof&&!S.between&&!state.late&&boxing.tick-state.comboT0>state.window){ state.late=true; sessionMetric('late'); state.call='SZYBCIEJ!'; state.callT=boxing.tick; sfxMiss(); }
  if(S.active&&shadowReady()){
    finishAction(S); sessionMetric('actions'); sessionMetric('paceSum',S.pace);
    if(S.between){
      sessionMetric('combos');
      state.feedbackUntil=boxing.tick+24;sfxChime(880);
      notice('Dobra kombinacja!');
    }
  }
  if(S.between&&boxing.tick>=state.feedbackUntil){
    if(nextSequenceCombo(S))prepareCombo();
    else{
      finishSession(false);
    }
  }
  if(!S.active&&S.queue.length&&shadowReady()){
    if(action(S.queue[0])){beginAction(S);notice('Trzymaj serię — możesz wpisywać kolejne ruchy.');}
    else notice('Złap oddech — następny ruch ruszy po odzyskaniu staminy.');
  }
  renderProgress();
}

/** Profesor's call for a combination, in the pixel font (no diacritics). @param {string[]} combo */
function callOf(combo){
  const W={J:'RAZ',C:'DWA',H:'HAK',U:'GORA',DF:'WEJDZ',DB:'WYJDZ',S:'SLIP',P:'PIVOT',D:'SCHYL SIE'};
  return combo.map(t=>t.startsWith('b')?W[t.slice(1)]+' DOL':W[t]).join('-')+'!';
}

/** What Profesor shouts now (for the scene), or null outside his session. */
export function shadowProfCall(){ return state.active&&state.prof?{text:state.call||'',age:boxing.tick-(state.callT||0)}:null; }

/** Closed-session summary inside the training overlay (finished or aborted). */
function showSummary(){
  const S=state.sequence, r=sessionState.last;
  S.finished=true; S.queue.length=0;
  finishShadowCombat();
  state.summary.hidden=false;state.restart.hidden=false;
  state.summary.textContent=(r.aborted?'Przerwany · ':'Ocena '+r.grade+' ('+r.score+'%) · ')+'stopień '+ROMAN[r.stage-1]+' · '+(r.metrics.combos||0)+'/'+(state.prof?state.opts.combos.length:10)+' kombinacji · najlepsze tempo '+S.bestPace.toFixed(2)+'× · powtórki: '+S.failures+(state.prof?' · spóźnienia: '+(r.metrics.late||0):'')+' · '+(r.gained||'bez XP');
  notice('Trening ukończony. Enter — jeszcze raz · Esc — wróć do celi.');
}

/** Render confirmed, executing and queued steps without rebuilding the overlay each tick. */
function renderProgress(){
  const S=state.sequence,next=accepted();
  const N=state.prof?state.opts.combos.length:COMBOS.length;
  state.counter.textContent='Kombinacja '+Math.min(S.comboIndex+1,N)+' / '+N;
  state.tempo.textContent='Tempo '+S.pace.toFixed(2)+'×';
  state.pace.value=S.pace-1;
  state.stamina.max=spar.FA.staCap;state.stamina.value=spar.FA.sta;
  state.queue.textContent=S.queue.length?'W kolejce: '+S.queue.length:'';
  state.cards.forEach((card,i)=>{
    card.classList.toggle('done',S.finished||i<S.completed);
    card.classList.toggle('playing',!!S.active&&i===S.completed);
    card.classList.toggle('queued',i>=S.completed+(S.active?1:0)&&i<next);
    card.classList.toggle('next',!S.finished&&!S.between&&i===next);
  });
}

/** Bind native overlay controls after the game's explicit initialization sequence. */
export function initialize(){
  for(const name of ['hud','steps','notice','counter','tempo','pace','stamina','queue','summary','restart'])state[name]=document.getElementById('shadow'+name[0].toUpperCase()+name.slice(1));
  state.restart.onclick=()=>startShadowboxing(state.station,state.opts||undefined);
  document.getElementById('shadowExit').onclick=exitToHub;
  state.hud.querySelectorAll('[data-shadow]').forEach(button=>{button.onclick=()=>shadowSubmit(button.dataset.shadow);});
}
