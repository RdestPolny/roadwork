import { state as npcsState } from './npcs.js';
import { hubBlocked, state as gymState, itemRect } from './gym.js';
import { startWork, workTap, workStepKey, workEnd, workGo, state as workState } from './work.js';
import { state as progressionState, addXP } from './progression.js';
import { state as roomsState, goRoom, actStop } from './rooms.js';
import { simFormText, simUI, simSetPhase, PHASES } from './simulation.js';
import { enterHub, exitToHub, state as navigationState, stMenuPick, stMenuRender, stMenuClose } from './navigation.js';
import { state as boxingState } from './boxing.js';
import { state as sparringState, startSpar } from './sparring.js';
import { isoFightFinish, startIsoFight, combatRigSnapshot } from './iso-fight.js';
import { state as appearanceState } from './appearance.js';
import { state as animationState } from './animation.js';
import { state as rendererState, render } from './renderer.js';
import { update } from './runtime.js';
import { startPushup, holdPushup, state as pushupsState } from './pushups.js';
import { startPullups } from './pullups.js';
import { startRoaches } from './roaches.js';
import { startShadowboxing } from './shadowboxing.js';
import { press, state as inputState, setPaused, setInfo } from './input.js';
import { DEBUG } from './config.js';
import { state as prisonState, prisonClockSync } from './prison.js';
import { PRISON_ROOMS } from './prison-data.js';
import { newGame, sysClose } from './menu.js';
import { optsToggle } from './options.js';
import { leaveMode } from './navigation.js';
import { startArm } from './armwrestle.js';
import { startCrank } from './crank.js';
import { initAudio } from './audio.js';
import { startThamesPort } from './thames-port.js';

export const state = {};
const DEV_DOORS=['cdoor','ydoor','ldoor'];
const ROOM_PL={cell:'Ward',yard:'spacerniak',laznia:'łaźnia'};
/** Debug door travel picks the phase without living through the schedule. @param {any} st */
export function devDoorOptions(st){
  if(!DEBUG||!progressionState.devMode||!DEV_DOORS.includes(st.id)) return [];
  if(state.devPhase===undefined) state.devPhase=progressionState.save.sim.faza;
  return [
    [()=>'[dev] Faza: '+PHASES[state.devPhase]+' · zmień',()=>{ state.devPhase=(state.devPhase+1)%3; }],
    ...PRISON_ROOMS.map(r=>[()=>'[dev] Przejdź: '+ROOM_PL[r]+' · '+PHASES[state.devPhase],()=>devJump(r,state.devPhase),false,'act'])];
}

/** @param {string} room @param {number} phase */
function devJump(room,phase){ stMenuClose(); simSetPhase(phase); prisonClockSync(); goRoom(room,0); setInfo(); }

/** Advance the same fixed simulation used by the frame loop. @param {number} n */
function step(n){ for(let i=0;i<n;i++){ boxingState.simNow+=appearanceState.STEP_MS; update(); } }

/** Switch to a target scene or minigame directly for testing. @param {string} scene */
export function devSwitchScene(scene){
  if((scene==='port'||scene==='sandy')&&!DEBUG) return;
  optsToggle(false);
  sysClose();
  stMenuClose();
  actStop();
  leaveMode();
  initAudio();

  switch(scene){
    case 'yard':
    case 'laznia':
    case 'cell':
      goRoom(scene, 0);
      setInfo();
      break;
    case 'port':
      startThamesPort();
      break;
    case 'work':
      startWork();
      break;
    case 'arm':
      startArm({
        name: 'Wielki Wacek',
        fight: 3,
        oppRank: 1,
        stake: 'porcja',
        onEnd: () => { goRoom(gymState.hubRoom || 'cell', 0); }
      });
      break;
    case 'sandy':
      startIsoFight(0,'sandy');
      break;
    case 'spar': {
      const venue = (gymState.hubRoom === 'yard' || gymState.hubRoom === 'laznia') ? gymState.hubRoom : 'cell';
      startSpar(0, venue, null);
      break;
    }
    case 'shadow':
      startShadowboxing(null);
      break;
    case 'pushups':
      pushupsState.puVenue = gymState.hubRoom || 'cell';
      startPushup();
      break;
    case 'pullups':
      startPullups();
      break;
    case 'roaches':
      startRoaches();
      break;
    case 'crank':
      startCrank();
      break;
  }
}

function initDevUi(){
  const btn = document.getElementById('optDevScenesBtn');
  const box = document.getElementById('devScenesBox');
  if(btn && box){
    btn.onclick = () => {
      const willShow = box.hidden;
      box.hidden = !willShow;
      box.style.display = willShow ? 'flex' : 'none';
      btn.textContent = willShow ? 'Zwiń listę scen' : 'Tryb developerski (przełącz scenę)';
    };
  }
  document.querySelectorAll('[data-dev-scene]').forEach(el => {
    /** @type {HTMLButtonElement} */ (el).onclick = () => {
      const s = el.getAttribute('data-dev-scene');
      if(s) devSwitchScene(s);
    };
  });
}

/** Install diagnostics only after the debug flag was explicitly enabled. */
export function initialize(){
  initDevUi();
  if(!DEBUG) return;
  window.__boxer={
    newGame, get phase(){return 'prison';}, get prison(){return prisonState;},
    hubBlocked, get items(){return gymState.gymItems.map(x=>x.t+':'+itemRect(x).map(v=>+v.toFixed(2)).join(','));},
    get CN(){return npcsState.CN;}, get YN(){return npcsState.YN;},
    startWork, workTap, workStepKey, workEnd, workGo,
    get work(){const W=workState.WK;return {dmg:W.dmg,punches:W.punches,finBonus:W.finBonus,phase:W.phase,n:W.n,drops:W.drops,p:+W.p.toFixed(3),A:+W.A.toFixed(3),ph:W.ph,sin:+Math.sin(W.ph).toFixed(3),lastKey:W.lastKey,hip:+W.hip.toFixed(1),face:W.face,stepT:W.stepT,rate:+W.rate.toFixed(1)};},
    get sim(){return Object.assign({},progressionState.save.sim,{room:gymState.hubRoom,act:roomsState.hubAct?roomsState.hubAct.kind:null,pose:gymState.hubP.pose,form:simFormText()});},
    simSet(o){Object.assign(progressionState.save.sim,o);simUI();}, goRoom, actStop,
    get room(){return gymState.hubRoom;}, enterHub, exitToHub,
    get hub(){return {g:boxingState.gstate,i:+gymState.hubP.i.toFixed(2),j:+gymState.hubP.j.toFixed(2),near:gymState.hubNear?gymState.hubNear.id:null,trans:gymState.hubTrans.kind,menu:!navigationState.stMenuEl.hidden,opts:navigationState.stOpts.length,venue:sparringState.sparVenue};},
    hubSet(i,j){gymState.hubP.i=i;gymState.hubP.j=j;}, hubKeys:gymState.hubKeys,
    stMenuPick, stSel(k){navigationState.stSel=k;stMenuRender();},
    get snap(){return {pal:Array.from(appearanceState.PAL).join(','),lk:JSON.stringify(appearanceState.lk),tr:appearanceState.trStyle,gl:appearanceState.glStyle,posX:animationState.posX,state:boxingState.state,fbMain:rendererState.fb===rendererState.FB_MAIN,mirror:sparringState.mirrorCtx,aimLow:sparringState.aimLow,idleOff:sparringState.idleOff,spd:boxingState.STATS.speed};},
    startSpar, isoFightFinish, rig:combatRigSnapshot, get stats(){return JSON.parse(JSON.stringify(progressionState.save.stats));}, addXP,
    get power(){return boxingState.STATS.power;}, get speed(){return boxingState.STATS.speed;},
    get dash(){return [animationState.M_DASHF,animationState.M_DASHB];},
    sparStep:step, fighter(i){return sparringState.FIG[i];},
    S_IDS:{S_HITJ:animationState.S_HITJ,S_HIT:animationState.S_HIT,S_HOOKED:animationState.S_HOOKED,S_UPPED:animationState.S_UPPED,S_BODY:animationState.S_BODY,S_BLOCK:animationState.S_BLOCK,S_BLOCKHIT:animationState.S_BLOCKHIT,S_STAGGER:animationState.S_STAGGER,S_KD:animationState.S_KD,S_GETUP:animationState.S_GETUP,S_KO:animationState.S_KO},
    startPushup, holdPushup, startPullups, startRoaches, startShadowboxing,
    get pu(){return {phase:pushupsState.puPhase,h:+pushupsState.puH.toFixed(3),reps:pushupsState.puReps,streak:pushupsState.puStreak,burn:+pushupsState.puBurn.toFixed(3),zone:pushupsState.puZone,lock:pushupsState.puLock};},
    press, pause(){setPaused(true,false);}, resume(){setPaused(false);},
    step(n){step(n);render();}, get now(){return boxingState.simNow;},
    get gstate(){return boxingState.gstate;}, get bpm(){return 60000/boxingState.beatMs;},
    get state(){return boxingState.state;}, get hits(){return boxingState.hits;}
  };
}
