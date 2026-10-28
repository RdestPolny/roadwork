import { state as boxingState, updatePopups, updateParticles, updateShorts } from './boxing.js';
import { armTick } from './armwrestle.js';
import { sessionTick } from './training-session.js';
import { state as gymState, hubTick } from './gym.js';
import { tickThamesPort } from './thames-port.js';
import { sparUpdate } from './sparring.js';
import { workTick, state as workState } from './work.js';
import { pushupTick, solvePushup } from './pushups.js';
import { pullupTick, solvePullup } from './pullups.js';
import { roachTick } from './roaches.js';
import { crankTick } from './crank.js';
import { prisonTick } from './prison.js';
import { isoFightTick } from './iso-fight.js';

// Runtime values owned by runtime; initialized explicitly by main.js.
export const state = {};

/* =====================================================================
   UPDATE
   ===================================================================== */
export function update(){
  boxingState.tick++;
  sessionTick();
  if(gymState.fadeInT>0) gymState.fadeInT--;
  while(boxingState.simNow>=boxingState.nextBeatMs){
    boxingState.lastBeatMs=boxingState.nextBeatMs; boxingState.beatIdx++;
    while(boxingState.tqLen>0&&boxingState.tqAt[boxingState.tqHead]<=boxingState.lastBeatMs+1){ boxingState.beatMs=boxingState.tqMs[boxingState.tqHead]; boxingState.tqHead=(boxingState.tqHead+1)%boxingState.TQ_N; boxingState.tqLen--; }
    boxingState.nextBeatMs=boxingState.lastBeatMs+boxingState.beatMs;
  }
  updatePopups();
  if(boxingState.shakeT>0){boxingState.shakeT--;const a=Math.ceil(boxingState.shakeAmp*boxingState.shakeT/boxingState.shakeDur),s=(boxingState.shakeT&2)?1:-1;boxingState.shX=boxingState.shakeAxis===0?s*a:0;boxingState.shY=boxingState.shakeAxis===1?s*a:0;} else {boxingState.shX=0;boxingState.shY=0;}
  if(boxingState.riseT>0){boxingState.riseT--;boxingState.shY+=1;}
  if(boxingState.gstate==='port'){ tickThamesPort(); return; }
  if(boxingState.gstate==='hub'||boxingState.gstate==='menu'){ hubTick(); if(boxingState.gstate==='hub') prisonTick(); return; }
  if(boxingState.gstate==='isofight'){ isoFightTick(); return; }
  if(boxingState.gstate==='spar'){ sparUpdate(); return; }
  if(boxingState.gstate==='work'){ workTick(); if(!workState.WK.slowT||boxingState.tick%4===0) updateParticles(); return; }
  if(boxingState.gstate==='arm'){ armTick(); updatePopups(); return; }
  if(boxingState.flashL>0)boxingState.flashL--; if(boxingState.flashR>0)boxingState.flashR--;
  if(boxingState.gstate==='pushup'){ pushupTick(); updateParticles(); solvePushup(); updateShorts(); return; }
  if(boxingState.gstate==='pullup'){ pullupTick(); updateParticles(); solvePullup(); return; }
  if(boxingState.gstate==='roach'){ roachTick(); return; }
  if(boxingState.gstate==='crank'){ crankTick(); return; }
}
