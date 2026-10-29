import { state as boxingState, resetClock, solve } from './boxing.js';
import { state as appearanceState } from './appearance.js';
import { update } from './runtime.js';
import { buildRing } from './sparring.js';
import { state as inputState } from './input.js';
import { render, resize } from './renderer.js';
import { state as simulationState, simUI } from './simulation.js';
import { roomsLoad, setRoomRaw } from './rooms.js';
import { state as progressionState } from './progression.js';
import { enterHub } from './navigation.js';
import { sysInit } from './dialog.js';
import { advanceFixed } from './time.js';

// Runtime values owned by loop; initialized explicitly by main.js.
export const state = {};
/** Resume the wall clock without changing the simulation timeline or tempo. */
export function resumeClock(){ state.last=performance.now(); state.acc=0; }

function simulationStep(){ boxingState.simNow+=appearanceState.STEP_MS; update(); } function frame(now){
  const dt=now-state.last; state.last=now;
  if(!inputState.paused){ state.acc=advanceFixed(state.acc,dt,appearanceState.STEP_MS,simulationStep); render(); }
  requestAnimationFrame(frame);
}

export function initialize(){


/* =====================================================================
   MAIN LOOP (fixed 60 Hz timestep; simNow advances per tick in real time)
   ===================================================================== */
state.acc = 0;
state.last = 0;

buildRing();
 resize();

state.last=performance.now();
 boxingState.simNow=0;
 resetClock(600,boxingState.simNow);


simulationState.simReady=true;
 solve();
 roomsLoad();
 setRoomRaw(progressionState.save.room);
 enterHub(null);
 simUI();

requestAnimationFrame(frame);

sysInit();
}
