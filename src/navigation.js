import { resumeThamesPort } from './thames-port.js';
import { healerOpen } from './healers.js';
import { openCharSheet } from './char-sheet.js';
import { state as boxingState, setFlow, resetClock } from './boxing.js';
import { state as armState } from './armwrestle.js';
import { profOpen } from './profesor.js';
import { diagnosticWork } from './diagnostic-work.js';
import { stopIsoFight, isoFightOutcome } from './iso-fight.js';
import { sparExit, state as sparringState, isShadowboxing, setRigged, setFightLimit } from './sparring.js';
import { puReset, state as pushupsState } from './pushups.js';
import { resetPullups } from './pullups.js';
import { resetRoaches } from './roaches.js';
import { resetCrank, crankReturn } from './crank.js';
import { state as inputState, setInfo, clearHeldInput } from './input.js';
import { state as progressionState, applyStats, persist } from './progression.js';
import { applyGear } from './appearance.js';
import { state as animationState } from './animation.js';
import { state as gymState, hubRebake, isoX, isoY, hubUnstuck, stationOf, stationOptions } from './gym.js';
import { setRoomRaw, state as roomsState, actStop } from './rooms.js';
import { finishPrisonFight } from './npcs.js';
import { initAudio, sfxWhoosh, sfxChime, sfxMiss, state as audioState } from './audio.js';
import { sysOpen } from './menu.js';
import { sessionLeave } from './training-session.js';

// Runtime values owned by navigation; initialized explicitly by main.js.
export const state = {};

export /* ---------- entering / leaving ---------- */
function leaveMode(){
  clearHeldInput(); sessionLeave();
  if(boxingState.gstate==='work') diagnosticWork.workReset();
  if(boxingState.gstate==='spar') sparExit();
  if(boxingState.gstate==='isofight') stopIsoFight();
  if(boxingState.gstate==='arm'){ armState.A=null; document.body.classList.remove('arm'); }
  if(boxingState.gstate==='pushup') puReset();
  if(boxingState.gstate==='pullup') resetPullups();
  if(boxingState.gstate==='roach') resetRoaches();
  if(boxingState.gstate==='crank') resetCrank();
  applyGear(progressionState.save.eq);
  boxingState.mode=boxingState.M_FREE; setFlow(false); boxingState.combo=0; animationState.posX=0; boxingState.state=animationState.IDLE; boxingState.buffered=-1; animationState.walkHeld=-1; animationState.cur.set(animationState.GUARD); animationState.lastPose.set(animationState.cur); boxingState.idleT=0;
  document.body.classList.remove('pushup','pullup','roach','spar','flow');
  inputState.overEl.hidden=true;
}

export function enterHub(st){
  roomsState.hubAct=null; gymState.hubP.pose=0; gymState.hubP.poseZ=0;
  leaveMode(); boxingState.gstate='hub'; resetClock(600,boxingState.simNow); applyStats(); boxingState.hitstop=0; boxingState.shakeT=0; boxingState.pL.fill(0); boxingState.puL.fill(0);
  document.body.classList.add('hub'); stMenuClose();
  for(const k in gymState.hubKeys) gymState.hubKeys[k]=0;
  hubRebake();                                             // gear / bag colours may have changed
  if(st){
    gymState.hubP.i=st.spot[0]; gymState.hubP.j=st.spot[1]; gymState.hubP.moving=false;
    let fi=st.look[0]-st.spot[0], fj=st.look[1]-st.spot[1]; const l=Math.hypot(fi,fj)||1; gymState.hubP.fi=fi/l; gymState.hubP.fj=fj/l;
    gymState.hubTrans={kind:2,t:0,dur:24,zx:isoX(st.look[0],st.look[1]),zy:isoY(st.look[0],st.look[1],st.look[2]),fn:null};
  } else gymState.hubTrans.kind=0;   // no station: no zoom-out left over from an earlier entry
  hubUnstuck(); gymState.hubNear=null; persist(); setPanelMode(); setInfo();

}

/** Transfer the port story to the prison cell. */
export function enterPrisonFromPort(){ setRoomRaw('cell'); enterHub(null); }

export function exitToHub(){
  if(boxingState.gstate==='crank'){ crankReturn(); return; }
  if(boxingState.gstate==='spar'&&isShadowboxing()){const st=sparringState.cellFightSt;setRoomRaw('cell');enterHub(st);return;}
  if(boxingState.gstate==='pullup'){ const it=gymState.cellList.find(x=>x.t==='cpull'); enterHub(it?stationOf(it):null); return; }
  if(boxingState.gstate==='roach'){ const it=gymState.cellList.find(x=>x.t==='croach'); enterHub(it?stationOf(it):null); return; }
  if(boxingState.gstate==='pushup'&&pushupsState.puVenue==='cell'){ const it=gymState.cellList.find(x=>x.t==='cfloor'); enterHub(it?stationOf(it):null); pushupsState.puVenue=''; return; }
  if(boxingState.gstate==='isofight'){
    const {idx,venue:room,won,station}=isoFightOutcome();
    if(room==='port'){ stopIsoFight(); inputState.overEl.hidden=true; document.body.classList.remove('spar'); resumeThamesPort(); return; }
    if(gymState.hubRoom!==room) setRoomRaw(room);
    enterHub(station); if(room!=='canteen'&&room!=='laznia') finishPrisonFight(idx,won,room==='yard'); setRigged(false); setFightLimit(0);
    return; }
  enterHub(null); } function hubLaunch(st,fn){
  stMenuClose(); initAudio(); sfxWhoosh(0.5); gymState.hubLastItem=st.item||null;
  gymState.hubTrans={kind:1,t:0,dur:26,zx:isoX(st.look[0],st.look[1]),zy:isoY(st.look[0],st.look[1],st.look[2]),fn};
}

export function stMenuOpen(st){ if(st&&st.id==='profesor'){ profOpen(); return; } if(st&&(st.id==='smierdziel')){ healerOpen(st.id); return; } state.stCur=st; state.stOpts=stationOptions(st); state.stSel=0; stMenuRender(); state.stMenuEl.hidden=false; sfxChime(700); setInfo(); }

export function stMenuClose(){ if(state.stMenuEl) state.stMenuEl.hidden=true; state.stCur=null; }

export function stMenuRender(){
  let h='<b>'+state.stCur.title+'</b>';
  state.stOpts.forEach((o,k)=>{ const lab=typeof o[0]==='function'?o[0]():o[0]; h+='<button data-k="'+k+'" class="'+(k===state.stSel?'sel':'')+'"'+(o[2]?' disabled':'')+'>'+lab+'</button>'; });
  h+='<small>↑↓ wybór · Enter / E '+(state.stCur.direct?'kup':'start')+' · Esc zamknij</small>';
  state.stMenuEl.innerHTML=h;
  state.stMenuEl.querySelectorAll('button[data-k]').forEach(b=>{ b.onpointerenter=()=>{ state.stSel=+b.dataset.k; state.stMenuEl.querySelectorAll('button').forEach(x=>x.classList.toggle('sel',x===b)); }; b.onclick=()=>{ state.stSel=+b.dataset.k; stMenuPick(); }; });
}

export function stMenuPick(){
  const o=state.stOpts[state.stSel]; if(!o||!state.stCur) return;
  if(o[2]){ sfxMiss(); return; }
  if(o[3]==='act'){ o[1](); return; }                                          // room activity: no zoom, it runs in the room
  if(state.stCur.direct){ stMenuClose(); o[1](); return; }                           // direct choice: act straight away
  if(o[0] instanceof Function&&o[3]!=='go'){ o[1](); stMenuRender(); sfxChime(880); return; } // toggles stay open; 'go' entries only have a live label
  hubLaunch(state.stCur,o[1]);
}

export function hubKey(e,down){
  const c=e.code;
  if(roomsState.hubAct){ if(down&&(c==='Escape'||c==='KeyE'||c==='Space'||c==='Enter')){ e.preventDefault(); actStop(); } return; }
  if(down&&!state.stMenuEl.hidden){
    if(c==='ArrowUp'||c==='KeyW'){ e.preventDefault(); state.stSel=(state.stSel+state.stOpts.length-1)%state.stOpts.length; stMenuRender(); return; }
    if(c==='ArrowDown'||c==='KeyS'){ e.preventDefault(); state.stSel=(state.stSel+1)%state.stOpts.length; stMenuRender(); return; }
    if(c==='Enter'||c==='KeyE'||c==='Space'){ e.preventDefault(); stMenuPick(); return; }
    if(c==='Escape'){ stMenuClose(); setInfo(); return; }
    return;
  }
  const v=down?1:0;
  if(c==='ArrowUp'||c==='KeyW'){ gymState.hubKeys.u=v; e.preventDefault(); }
  else if(c==='ArrowDown'||c==='KeyS'){ gymState.hubKeys.d=v; e.preventDefault(); }
  else if(c==='ArrowLeft'||c==='KeyA'){ gymState.hubKeys.l=v; e.preventDefault(); }
  else if(c==='ArrowRight'||c==='KeyD'){ gymState.hubKeys.r=v; e.preventDefault(); }
  else if(down&&(c==='KeyE'||c==='Space'||c==='Enter')){ e.preventDefault(); if(gymState.hubNear&&!gymState.hubTrans.kind) stMenuOpen(gymState.hubNear); }
  else if(down&&c==='Escape'){ e.preventDefault(); sysOpen('pause'); }                       // Esc: game menu (save / load / new game / main menu)
  else if(down&&c==='KeyM'){ audioState.soundOn=!audioState.soundOn; inputState.sndEl.checked=audioState.soundOn; }
  else if(down&&c==='KeyP'){ e.preventDefault(); openCharSheet(); }                    // P: the character sheet
}

/** Match touch controls to the active prison activity. */
export function setPanelMode(){
  document.body.classList.toggle('hub',boxingState.gstate==='hub'||boxingState.gstate==='menu');
  for(const mode of ['work','arm','port']) document.body.classList.toggle(mode,boxingState.gstate===mode);
  const pullup=boxingState.gstate==='pullup'||boxingState.gstate==='roach', pu=boxingState.gstate==='pushup';
  document.getElementById('menuBtn').textContent=boxingState.gstate==='spar'&&sparringState.sparVenue==='yard'?'Wróć na spacerniak':boxingState.gstate==='spar'&&sparringState.sparVenue==='laznia'?'Wróć do łaźni':'Wróć do Wardu';
  const labels=['1 · Jab','2 · Cross','3 · Hook','4 · Upper','Spacja · Blok'];
  document.querySelectorAll('#panel button[data-m]').forEach(b=>{ const m=+b.dataset.m; if(m<=4){ b.textContent=labels[m]; b.style.display=pullup||pu?'none':''; } });
}

export function initialize(){

/* ---------- station mini menu (DOM) — prison interactions ---------- */
state.stMenuEl = null;
state.stSel = 0;
state.stOpts = [];
state.stCur = null;
}
