import { clearHeldInput } from './input.js';

export const state = {};

/** Open or close game options, releasing controls when the panel opens. @param {boolean} open */
export function optsToggle(open){
  state.optsEl.hidden=!open;
  if(open){ clearHeldInput(); document.activeElement?.blur?.(); }
}

/** Bind the options panel after the document and input owners are ready to initialize. */
export function initialize(){
  state.optsEl=document.getElementById('opts');
  document.getElementById('optClose').onclick=()=>optsToggle(false);
  state.optsEl.addEventListener('mousedown',e=>e.stopPropagation());
  state.optsEl.addEventListener('click',e=>{ e.stopPropagation(); if(e.target===state.optsEl) optsToggle(false); });
}
