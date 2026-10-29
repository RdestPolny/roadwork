import { state as boxingState } from './boxing.js';
import { state as armState, armKey, armButton } from './armwrestle.js';
import { prisonKey } from './prison.js';
import { state as loopState, resumeClock } from './loop.js';
import { initAudio, state as audioState } from './audio.js';
import { state as sparringState, isShadowboxing } from './sparring.js';
import { shadowInputMirror, shadowDoubleTap, shadowPress, startShadowboxing, state as shadowState } from './shadowboxing.js';
import { releaseWalk, state as animationState } from './animation.js';
import { holdPushup, pushupInfo } from './pushups.js';
import { holdPullup, pullupInfo } from './pullups.js';
import { roachKey, roachKeysOff, roachStrike, roachInfo } from './roaches.js';
import { crankKey, crankKeysOff, crankInfo } from './crank.js';
import { thamesKey, clearThamesInput } from './thames-port.js';
import { simUI } from './simulation.js';
import { state as gymState, clearHubInput } from './gym.js';
import { statShort, setDevMode } from './progression.js';
import { state as roomsState, actStop } from './rooms.js';
import { state as workState, workHint, workKey, workTap, workStepKey, workEnd, workGo } from './work.js';
import { sysKey } from './menu.js';
import { dlgKey } from './dialog.js';
import { state as optionsState, optsToggle } from './options.js';
import { hubKey, exitToHub, state as navigationState, stMenuPick, stMenuOpen } from './navigation.js';
import { state as rendererState, resize, render } from './renderer.js';
import { inputTime } from './time.js';
import { skillTreeOpen, skillTreeKey } from './skill-tree.js';
import { charSheetKey, charSheetOpen } from './char-sheet.js';
import { sessionKey, sessionOpen, sessionRunning } from './training-session.js';
import { DEBUG } from './config.js';
import { state as appearanceState } from './appearance.js';
import { state as menuState } from './menu.js';
import { state as dialogState } from './dialog.js';
import { update } from './runtime.js';
import { isoFightKey, isoFightRelease, isoFightPointer, isoFightPointerLeave, isoFightBodyAim, isoFightInfo, CONTROLS as ISO_CONTROLS } from './iso-fight.js';

export const state = {};

/** Release held gameplay controls before opening or closing a modal. */
export function clearHeldInput(){
  crankKeysOff();isoFightRelease();clearThamesInput();
  clearHubInput(); releaseWalk(); state.bodyHeld=false; holdPullup(false); holdPushup(false); roachKeysOff(); resetDirectionTap();
}

/** Change pause without resetting time; diagnostics can freeze held input for fixed-step checks.
 * @param {boolean} paused @param {boolean} [releaseHeld] */
export function setPaused(paused,releaseHeld=true){
  if(paused&&releaseHeld) clearHeldInput();
  if(state.paused===paused) return;
  state.paused=paused;
  if(!paused) resumeClock();
}

/** Frame-freeze (F8, only under ?debug=1) with a debug readout so a stuck frame can be located; "." steps one tick while frozen. P stays the character sheet. */
function freezeInfo(){
  const t=Math.round(boxingState.simNow/appearanceState.STEP_MS), SP=sparringState.SP;
  return ['FREEZE  gstate='+boxingState.gstate+(boxingState.gstate==='hub'||boxingState.gstate==='menu'?'  room='+gymState.hubRoom:''),
    'tick='+t+'  simNow='+boxingState.simNow.toFixed(1)+'ms  url='+location.search,
    boxingState.gstate==='spar'?'spar: opp='+sparringState.sparOpp+' phase='+SP.phase+' elapsed='+SP.elapsed+(isShadowboxing()?' shadow':''):'',
    'F8 wznów · . krok 1 tick'].filter(Boolean).join('\n');
}
function freezeShow(){
  if(!state.freezeEl){ const el=state.freezeEl=document.createElement('pre'); el.style.cssText='position:fixed;left:8px;top:8px;z-index:99;margin:0;padding:6px 8px;background:#000c;color:#39ff7a;font:11px/1.3 monospace;pointer-events:none;user-select:text'; document.body.appendChild(el); }
  state.freezeEl.hidden=false; state.freezeEl.textContent=freezeInfo();
}
function freezeKey(e){
  const modal=!menuState.sysEl.hidden||!dialogState.dlgEl.hidden||!optionsState.optsEl.hidden||e.target.tagName==='INPUT'||e.target.tagName==='SELECT';
  if(!DEBUG||modal||e.ctrlKey||e.metaKey||e.altKey) return false;
  if(e.code==='F8'){
    e.preventDefault(); if(e.repeat) return true;
    state.frozen=!state.frozen; setPaused(state.frozen);
    if(state.frozen){ freezeShow(); console.log(freezeInfo()); } else if(state.freezeEl) state.freezeEl.hidden=true;
    return true;
  }
  if(!state.frozen) return false;
  if(e.code==='Period'){ e.preventDefault(); boxingState.simNow+=appearanceState.STEP_MS; update(); render(); freezeShow(); }
  return true;   // frozen: nothing else reaches the game
}

/** Shared simulation time for keyboard and touch controls. */
export function inputNow(){ return inputTime(boxingState.simNow,loopState.acc,loopState.last,performance.now(),state.paused); }

/** Route fighter controls only to the shadow training. */
export function press(mv){
  if(state.paused||skillTreeOpen()||(sessionOpen()&&!sessionRunning())) return;
  initAudio();
  if(boxingState.gstate==='spar'&&isShadowboxing()){ if(mv<=3)resetDirectionTap(); shadowPress(mv); }
}

/** One hint by the object instead of a bar of controls. @param {string} [title] @param {string} [sub] @param {string} [key] */
function setPrompt(title,sub,key='E'){
  if(!state.promptEl) return;
  state.promptEl.hidden=!title; if(!title) return;
  state.promptKeyEl.textContent=key; state.promptTitleEl.textContent=title; state.promptSubEl.textContent=sub||'';
}
/** Show the port's nearby sack interaction using the usual action prompt. */
export function setPortSackPrompt(show,x,y){
  setPrompt(show?'PODNIEŚ WOREK':'');
  if(show){ state.promptEl.style.setProperty('--port-x',`${x}px`); state.promptEl.style.setProperty('--port-y',`${y}px`); }
}

/** Upper case without diacritics, to match "PODCIAGANIE" with "podciąganie". @param {string} t */
const plain=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();

/** The nearby station, person or running activity as the hub prompt. */
function hubPrompt(){
  if(boxingState.gstate!=='hub') return setPrompt();
  if(roomsState.hubAct) return setPrompt('PRZERWIJ',roomsState.hubAct.label);
  const n=gymState.hubNear;
  if(n){   // "Gazety na podłodze — pompki", "Harry — współwięzień": the part naming the thing is the title, the other one the note
    const t=String(n.title||''), N=plain(String(n.name||t)), [a,b]=t.split(' — ');
    if(b!==undefined&&plain(b)===N) return setPrompt(b.toUpperCase(),a);
    if(b!==undefined&&plain(a)===N) return setPrompt(a.toUpperCase(),b);
    return setPrompt(String(n.name||t).toUpperCase(),plain(t)===N?'':t); }
  setPrompt();
}

export function setInfo(){
  simUI(); hubPrompt(); state.controlsText=''; state.livesEl.textContent='';
  if(boxingState.gstate==='hub'||boxingState.gstate==='menu'){
    const room={cell:'WARD',yard:'SPACERNIAK',laznia:'ŁAŹNIA'}[gymState.hubRoom]||'WARD';
    state.infoEl.textContent=room+(roomsState.hubAct?' · '+roomsState.hubAct.label:gymState.hubNear?' · '+gymState.hubNear.title+' — E':' · rozejrzyj się');
    state.nextEl.textContent=roomsState.hubAct?'Esc / E — przerwij':'strzałki / WASD — chodzenie · E — użyj · Esc — pauza · P — karta · '+statShort();
    return;
  }
  if(boxingState.gstate==='port'){ state.infoEl.textContent='PORT NAD TAMIZĄ · NOC'; state.nextEl.textContent='strzałki / WASD — ruch · E — podnieś / odłóż worek · Esc — powrót'; return; }
  if(boxingState.gstate==='work'){ state.infoEl.textContent='RZEŹNIA · półtusza '+Math.min(workState.WK.n+(workState.WK.phase==='end'?0:1),workState.WK_N)+'/'+workState.WK_N+(workState.WK.drops?' · upuszczone: '+workState.WK.drops:''); state.nextEl.textContent=workHint()+(workState.WK.phase==='end'?'':' · Esc — koniec zmiany'); return; }
  if(boxingState.gstate==='arm'){ const A=armState.A; state.infoEl.textContent='SIŁOWANIE NA RĘKĘ'+(A?' · '+A.name+(A.stake==='porcja'?' · o porcję':A.stake==='miejsce'?' · o miejsce':' · dla sportu'):''); state.nextEl.textContent=A&&A.result?'Enter — wróć do Wardu':'Spacja / E — pchnij w rytm kółka · przytrzymaj S / ↓ — zaprzyj się, gdy rywal czerwienieje · Esc — poddaj się'; return; }
  if(boxingState.gstate==='spar'){
    state.nextEl.textContent='';
    state.infoEl.textContent='WALKA Z CIENIEM · WARD';
    state.controlsText='1–4 ciosy · ↓+cios korpus · Q slip · 2×przód doskok / pivot · 2×tył odskok · Esc — koniec';
    return;
  }
  if(boxingState.gstate==='isofight'){ state.infoEl.textContent=isoFightInfo(); state.nextEl.textContent=''; state.controlsText=ISO_CONTROLS; return; }
  if(boxingState.gstate==='pullup'){ pullupInfo(); return; }
  if(boxingState.gstate==='roach'){ roachInfo(); return; }
  if(boxingState.gstate==='crank'){ crankInfo(); return; }
  if(boxingState.gstate==='pushup'){ pushupInfo(); return; }

}

/** Clear incomplete direction gestures when gameplay loses focus or changes mode. */
export function resetDirectionTap(){ state.tapMv=-1; state.tapMode=''; }

/** Consume two presses of the same direction within the existing 280 ms dash window.
 * @param {number} mv @param {number} [now] Shared input time, in milliseconds.
 * @returns {boolean} Whether this press completes a pair.
 */
export function directionDoubleTap(mv,now=inputNow()){
  const mode=boxingState.gstate==='spar'?'spar:'+sparringState.SP.phase+':'+(isShadowboxing()?shadowInputMirror():!!sparringState.FA?.mirror):boxingState.gstate;
  if(state.tapMv===mv&&state.tapMode===mode&&now-state.tapT>=0&&now-state.tapT<280){ resetDirectionTap(); return true; }
  state.tapMv=mv; state.tapT=now; state.tapMode=mode; return false;
}

/** Translate screen-left/right into movement relative to the player's current facing. @param {number} mv */
/** The one slip button (Q): the head goes outside the punch coming in (a jab: right, a cross: left),
 * with nothing coming in it goes to either side by turns. */
export function slipMove(){
  const L=animationState.M_SLIPL, R=animationState.M_SLIPR, O=boxingState.gstate==='spar'&&!isShadowboxing()?sparringState.FB:null;
  if(O&&(O.st===0||O.st===1)) return O.st===0?R:L;
  state.slipSide=!state.slipSide; return state.slipSide?L:R;
}

export function screenMove(mv){
  if(mv===animationState.M_SLIPL) return slipMove();
  return boxingState.gstate==='spar'&&(isShadowboxing()?shadowInputMirror():sparringState.FA.mirror)&&(mv===animationState.M_WALKF||mv===animationState.M_WALKB)?(mv===animationState.M_WALKF?animationState.M_WALKB:animationState.M_WALKF):mv;
}

/** Keep walking/dashes, using a close forward pair to pivot around the opponent. @param {number} mv */
function walkTap(mv){
  if(directionDoubleTap(mv)){
    releaseWalk();
    if(boxingState.gstate==='spar'&&isShadowboxing())shadowDoubleTap(mv===animationState.M_WALKF);
    else press(mv===animationState.M_WALKF?animationState.M_DASHF:animationState.M_DASHB);
    return true;
  }
  animationState.walkHeld=mv; return false;
}

export function initialize(){


/* =====================================================================
   INPUT + HUD
   ===================================================================== */
state.gradeEl = document.getElementById('grade');
state.infoEl = document.getElementById('info');
state.livesEl = document.getElementById('lives');
state.nextEl = document.getElementById('next');
state.promptEl = document.getElementById('prompt');
state.promptKeyEl = document.getElementById('promptKey');
state.promptTitleEl = document.getElementById('promptTitle');
state.promptSubEl = document.getElementById('promptSub');
state.controlsText = '';
// Screen buttons are for touch screens; the keyboard player gets a clean picture.
document.body.classList.toggle('debug',DEBUG);
if(navigator.maxTouchPoints>0||matchMedia('(any-pointer: coarse)').matches) document.body.classList.add('touch');
addEventListener('touchstart',()=>document.body.classList.add('touch'),{once:true,passive:true});

state.overEl = document.getElementById('over');
state.overTitle = document.getElementById('overTitle');
state.overStats = document.getElementById('overStats');
state.againBtn = document.getElementById('again');

state.gradeTimer = 0;
state.paused = false;
state.bodyHeld = false;

// Close forward pairs pivot. Down also aims punches at the body (and holds the low guard in a fight).
state.tapMv = -1;
state.tapT = 0;
state.tapMode = '';
state.slipSide = false;

state.KEYMAP = {KeyQ:5,ArrowRight:7,KeyD:7,ArrowLeft:8,KeyA:8,Digit1:0,KeyJ:0,Numpad1:0,Digit2:1,KeyK:1,Numpad2:1,Digit3:2,KeyL:2,Numpad3:2,Digit4:3,KeyI:3,Numpad4:3,Digit5:4,Space:4,Numpad5:4};


addEventListener('keydown',e=>{
  if(freezeKey(e)) return;
  if(charSheetKey(e)||prisonKey(e)||skillTreeKey(e)||sysKey(e)||dlgKey(e)) return;
  if(!optionsState.optsEl.hidden){ if(e.code==='Escape'||e.code==='KeyO'){ e.preventDefault(); optsToggle(false); } e.stopImmediatePropagation(); return; }
  if(e.code==='KeyO'&&!e.repeat&&!e.ctrlKey&&!e.metaKey&&e.target.tagName!=='INPUT'&&e.target.tagName!=='SELECT'){ e.preventDefault(); optsToggle(true); return; }
  if(boxingState.gstate==='port'){ if(thamesKey(e.code,true,e.repeat)){ e.preventDefault(); return; } if(!e.repeat&&e.code==='Escape'){ e.preventDefault(); exitToHub(); } return; }
  if(e.repeat)return;
  if(sessionKey(e)) return;
  if(boxingState.gstate==='work'){ workKey(e); return; }
  if(boxingState.gstate==='crank'){ crankKey(e,true); return; }
  if(boxingState.gstate==='arm'){ armKey(e,true); return; }
  if(boxingState.gstate==='isofight'){ isoFightKey(e,true); return; }
  if(boxingState.gstate==='hub'){ hubKey(e,true); return; }
  if(boxingState.gstate==='spar'){
    if(isShadowboxing()&&shadowState.sequence.finished){
      if(e.code==='Enter'){e.preventDefault();startShadowboxing();}
      else if(e.code==='Escape')exitToHub();
      return;
    }
    if(e.code==='Escape'){exitToHub();return;}
    if(e.code==='ArrowUp'||e.code==='ArrowDown'){
      e.preventDefault();
      if(e.code==='ArrowDown') state.bodyHeld=true;   // Cień: ↓ + punch goes to the body
      return;
    }
    const mv=screenMove(state.KEYMAP[e.code]);
    if(mv!==undefined){e.preventDefault(); if(mv===animationState.M_WALKF||mv===animationState.M_WALKB)walkTap(mv); else press(mv); return;}
    if(DEBUG&&e.code==='KeyG'){boxingState.debug=!boxingState.debug;state.dbgEl.checked=boxingState.debug;}
    if(e.code==='KeyM'){audioState.soundOn=!audioState.soundOn;state.sndEl.checked=audioState.soundOn;}
    return;
  }
  if(boxingState.gstate==='over'){ if(e.code==='Enter'||e.code==='Space'){e.preventDefault();state.againFn();} else if(e.code==='Escape')exitToHub(); return; }
  if(e.code==='Escape'){exitToHub();return;}
  if(boxingState.gstate==='pullup'){ if(e.code==='Space'||e.code==='KeyE'){e.preventDefault();holdPullup(true);} return; }
  if(boxingState.gstate==='roach'){ if(e.code==='Space'||e.code==='Enter'){e.preventDefault();roachStrike();} else if(roachKey(e.code,true)) e.preventDefault(); return; }
  if(boxingState.gstate==='pushup'){ if(e.code==='Space'||e.code==='KeyE'){e.preventDefault();holdPushup(true);} return; }
  const mv=screenMove(state.KEYMAP[e.code]);
  if(mv!==undefined){e.preventDefault(); if(mv===animationState.M_WALKF||mv===animationState.M_WALKB){ if(!walkTap(mv)) press(mv); return; } press(mv);return;}
  if(DEBUG&&e.code==='KeyG'){boxingState.debug=!boxingState.debug;state.dbgEl.checked=boxingState.debug;}
  if(e.code==='KeyM'){audioState.soundOn=!audioState.soundOn;state.sndEl.checked=audioState.soundOn;}
});

addEventListener('keyup',e=>{ if(boxingState.gstate==='port'){ thamesKey(e.code,false); return; } if(charSheetOpen()||skillTreeKey(e)) return; if(boxingState.gstate==='arm'){ armKey(e,false); return; } if(boxingState.gstate==='isofight'){ isoFightKey(e,false); return; } if(e.code==='Space'||e.code==='KeyE'){ holdPullup(false); holdPushup(false); } if(boxingState.gstate==='roach') roachKey(e.code,false); if(boxingState.gstate==='crank') crankKey(e,false); if(boxingState.gstate==='hub'||boxingState.gstate==='menu') hubKey(e,false); const k=state.KEYMAP[e.code], mv=k===animationState.M_SLIPL?k:screenMove(k); /* releasing Q must not pick the next slip side */ if(mv===animationState.walkHeld)releaseWalk(); if(e.code==='ArrowDown')state.bodyHeld=false; });

addEventListener('blur',clearHeldInput);
document.addEventListener('visibilitychange',()=>{ if(document.hidden) clearHeldInput(); });
addEventListener('pointerup',e=>{ if(e.button===0) isoFightBodyAim(false); });
addEventListener('pointercancel',()=>isoFightBodyAim(false));

document.querySelectorAll('#panel button[data-m]').forEach(b=>{ const mv=+b.dataset.m; if(mv===animationState.M_WALKF||mv===animationState.M_WALKB){
  b.addEventListener('pointerdown',()=>{walkTap(screenMove(mv));}); b.addEventListener('pointerup',releaseWalk); b.addEventListener('pointerleave',releaseWalk); }});

document.querySelectorAll('#panel button[data-m]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();press(screenMove(+b.dataset.m));}));


state.againFn=()=>{};

state.againBtn.addEventListener('click',()=>state.againFn());

state.bodyEl = document.getElementById('bodyMode');
navigationState.stMenuEl=document.getElementById('stMenu');

document.querySelectorAll('#panel button[data-hk]').forEach(b=>{ const k=b.dataset.hk; b.addEventListener('pointerdown',e=>{e.preventDefault();gymState.hubKeys[k]=1;}); b.addEventListener('pointerup',()=>{gymState.hubKeys[k]=0;}); b.addEventListener('pointerleave',()=>{gymState.hubKeys[k]=0;}); });

document.getElementById('hubUse').addEventListener('click',()=>{ if(boxingState.gstate!=='hub') return; if(roomsState.hubAct){ actStop(); return; } if(!navigationState.stMenuEl.hidden) stMenuPick(); else if(gymState.hubNear) stMenuOpen(gymState.hubNear); });

document.querySelectorAll('#panel button[data-wk]').forEach(b=>b.addEventListener('pointerdown',e=>{ e.preventDefault(); if(boxingState.gstate!=='work') return; const k=b.dataset.wk; if(k==='m') workTap(); else if(k==='l') workStepKey(-1); else if(k==='r') workStepKey(1); else workEnd(); }));

document.getElementById('wkReturn').addEventListener('click',()=>workGo());

document.getElementById('toMenu').addEventListener('click',exitToHub);

document.getElementById('menuBtn').addEventListener('click',exitToHub);
document.querySelectorAll('#panel [data-arm]').forEach(b=>{ const a=b.dataset.arm; if(a==='brace'){ b.addEventListener('pointerdown',()=>armButton('brace')); b.addEventListener('pointerup',()=>armButton('braceOff')); b.addEventListener('pointerleave',()=>armButton('braceOff')); } else b.addEventListener('click',()=>armButton(/** @type {any} */ (a))); });

rendererState.stage.addEventListener('pointermove',e=>{ if(boxingState.gstate==='isofight') isoFightPointer(e); });
rendererState.stage.addEventListener('pointerleave',()=>{ if(boxingState.gstate==='isofight') isoFightPointerLeave(); });
rendererState.stage.addEventListener('pointerdown',e=>{
  initAudio(); window.focus();
  if(e.button===0&&boxingState.gstate==='isofight'&&!state.paused){
    e.preventDefault(); isoFightPointer(e); isoFightBodyAim(true);
  }
});

state.sndEl=document.getElementById('snd');
state.dbgEl=document.getElementById('dbg');

state.sndEl.onchange=()=>{audioState.soundOn=state.sndEl.checked;};

state.dbgEl.onchange=()=>{boxingState.debug=state.dbgEl.checked;};

document.getElementById('optDev').onchange=e=>{ const on=e.target.checked; if(!on&&!confirm('Wyłączyć tryb developera? Gra wczyta ostatni zapis.')){ e.target.checked=true; return; } setDevMode(on); };


addEventListener('resize',resize);
}
