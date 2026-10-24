import { tone, initAudio } from './audio.js';
import { state as menuState, sysOpen } from './menu.js';
import { state as gymState } from './gym.js';
import { state as animationState } from './animation.js';
import { stMenuClose } from './navigation.js';
import { state as inputState } from './input.js';
import { setPaused } from './input.js';
import { render } from './renderer.js';

// Runtime values owned by dialog; initialized explicitly by main.js.
export const state = {};

function dlgSay(t){ state.dlgFull=t; state.dlgPos=0; state.dlgTextEl.textContent=''; clearInterval(state.dlgTimer);
  state.dlgTimer=setInterval(()=>{ state.dlgPos++; state.dlgTextEl.textContent=state.dlgFull.slice(0,state.dlgPos); if(state.dlgPos%3===1) tone('square',150+Math.random()*60,40,0.03,0.008); if(state.dlgPos>=state.dlgFull.length) clearInterval(state.dlgTimer); },22); } function dlgRender(){
  state.dlgOpt=state.speaker.options(); dlgPaint();
}
function dlgPaint(){
  if(state.dlgSel>=state.dlgOpt.length) state.dlgSel=0;
  state.dlgOptsEl.innerHTML=state.dlgOpt.map((o,i)=>'<button class="sysbtn'+(i===state.dlgSel?' sel':'')+'" data-i="'+i+'"><kbd>'+(i+1)+'</kbd><span><b>'+o[0]+'</b>'+(o[1]?'<small>'+o[1]+'</small>':'')+'</span></button>').join('');
}

/** Portrait and name plate of whoever talks. @param {string} who @param {(cv:HTMLCanvasElement)=>void} draw @param {string} name @param {string} sub */
function dlgFace(who,draw,name,sub){
  if(state.picOf!==who){ draw(state.dlgPic); state.picOf=who; }
  const n=state.dlgEl.querySelector('.dname'), d=state.dlgEl.querySelector('.dsub'); if(n) n.textContent=name; if(d) d.textContent=sub;
}

/**
 * Open the dialogue with another speaker (Profesor in the cell).
 * @param {{who:string,name:string,sub:string,draw:(cv:HTMLCanvasElement)=>void,hello:string,options:()=>any[][]}} sp
 */
export function dlgSpeak(sp){
  if(!state.dlgEl.hidden||!menuState.sysEl.hidden) return;
  initAudio(); state.speaker=sp; dlgFace(sp.who,sp.draw,sp.name,sp.sub);
  for(const k in gymState.hubKeys) gymState.hubKeys[k]=0; animationState.walkHeld=-1; stMenuClose();
  setPaused(true); state.dlgSel=0; state.dlgEl.hidden=false; document.body.classList.add('dlgopen'); dlgRender();
  dlgSay(sp.hello);
}

/** Say a line in the open dialogue and refresh its options. @param {string} t */
export function dlgLineSay(t){ dlgSay(t); if(!state.dlgEl.hidden) dlgRender(); }

/** Close the speaker dialogue, optionally preserving pause for a following modal. */
export function dlgClose(resume=true){
  clearInterval(state.dlgTimer); state.dlgEl.hidden=true; document.body.classList.remove('dlgopen');
  if(resume&&inputState.paused&&menuState.sysEl.hidden) setPaused(false);
}

export function dlgKey(e){   // true when the dialog consumed the key
  if(state.dlgEl.hidden) return false;
  const c=e.code;
  if(c==='Escape'){ e.preventDefault(); dlgClose(); }
  else if(c==='ArrowUp'||c==='KeyW'){ e.preventDefault(); state.dlgSel=(state.dlgSel+state.dlgOpt.length-1)%state.dlgOpt.length; dlgRender(); }
  else if(c==='ArrowDown'||c==='KeyS'){ e.preventDefault(); state.dlgSel=(state.dlgSel+1)%state.dlgOpt.length; dlgRender(); }
  else if(/^Digit[1-9]$/.test(c)){ e.preventDefault(); const i=+c[5]-1; if(i<state.dlgOpt.length){ state.dlgSel=i; state.dlgOpt[i][2](); if(!state.dlgEl.hidden) dlgRender(); } }
  else if(c==='Enter'||c==='KeyE'||c==='Space'){ e.preventDefault(); if(!e.repeat){ if(state.dlgPos<state.dlgFull.length){ clearInterval(state.dlgTimer); state.dlgPos=state.dlgFull.length; state.dlgTextEl.textContent=state.dlgFull; } else { state.dlgOpt[state.dlgSel][2](); if(!state.dlgEl.hidden) dlgRender(); } } }
  e.stopImmediatePropagation(); return true;
}

export function sysInit(){ render(); sysOpen('main'); }

export function initialize(){


/* ---------- dialog with a prison speaker (visual-novel style: paused game, big portrait, options) ---------- */
state.dlgEl = document.getElementById('dlg');
state.dlgTextEl = document.getElementById('dlgText');
state.dlgOptsEl = document.getElementById('dlgOpts');
state.dlgPic = document.getElementById('dlgPic');

state.dlgFull = '';
state.dlgPos = 0;
state.dlgTimer = 0;
state.dlgSel = 0;
state.dlgOpt = [];
state.dlgDrawn = false;
state.speaker = null;
state.picOf = "";

state.dlgOptsEl.addEventListener('click',e=>{ const b=e.target.closest('.sysbtn'); if(!b) return; state.dlgSel=+b.dataset.i; state.dlgOpt[state.dlgSel][2](); if(!state.dlgEl.hidden) dlgRender(); });

state.dlgEl.addEventListener('mousedown',e=>e.stopPropagation());
 state.dlgEl.addEventListener('click',e=>e.stopPropagation());
}
