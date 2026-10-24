import { bathBg, bathBack, bathFront, towelColors, resetBathScene } from './bath-scene.js';
import { wardFightBg, wardFightBack, wardFightFront, yardFightBg, yardFightBack, yardFightFront, resetNewgateFight } from './newgate-fight.js';
import { cellFightBg, cellFightBack, cellFightFront } from './cell-fight-scene.js';
import { prisonFightEnd, fightsWith, countFight, showFightPlate, hideFightPlate } from './prison.js';
import { saveFighterContext, loadFighterContext } from './fighter-context.js';
import { state as appearanceState, setRamp, applyGear, applyLook, rgb } from './appearance.js';
import { state as boxingState, torsoEdge, solve, setFlow, resetClock, commitWalk, startMove, handleEvents, updateShorts, spawn, clearParticles, popup, updateParticles, h2, drawText, drawBoxer, drawParticles, drawPopups } from './boxing.js';
import { state as animationState, isFwd, samplePose, poseSampleTime, computeIdle, isDash } from './animation.js';
import { state as pushupsState, puReset } from './pushups.js';
import { state as npcsState } from './npcs.js';
import { initAudio, sfxWhoosh, sfxBlock, sfxPunch, tone, sfxKO, sfxBell, sfxCrack } from './audio.js';
import { state as progressionState, playerFightPerks, applyStats, resetSessXP, addXP, persist, sessXPText, statShort } from './progression.js';
import { state as inputState, setInfo, inputNow, clearHeldInput } from './input.js';
import { setPanelMode } from './navigation.js';
import { state as rendererState, pset, shadowEll, setCamera } from './renderer.js';
import { state as roomsState } from './rooms.js';
import { state as gymState, shadeC } from './gym.js';
import { fighterStats, opponentLevels, opponentStars } from './stats.js';
import { fightXP } from './training-data.js';
import { doneToday, takeFightTrial } from './training-session.js';
import { passTrial, recordFight } from './progression.js';
import { shadowTick, stopShadowboxing } from './shadowboxing.js';
import { hungerLevel, tiredness } from './simulation.js';
import { lastingSpec } from './card-data.js';
import { createCombatant, tickCombatant, beginPunch, punchCost, setGuard, beginSlip, resolvePunch } from './realtime-rules.js';
import { realtimeHud, hideRealtimeHud } from './realtime-hud.js';
import { state as cardState, cardStart, cardTick, cardStop, cardResultRows } from './card-fight.js';

// Runtime values owned by sparring; initialized explicitly by main.js.
export const PIVOT_RANGE = 25;
export const state = {}; function saveCtx(F){
  saveFighterContext(F.S,state.contextSources);
  F.cur.set(animationState.cur); F.from.set(animationState.fromPose); F.last.set(animationState.lastPose);
} function loadCtx(F){
  loadFighterContext(F.S,state.contextSources);
  animationState.cur.set(F.cur); animationState.fromPose.set(F.from); animationState.lastPose.set(F.last);
} function mkFighter(){
  return {S:{}, cur:new Float32Array(animationState.NP), from:new Float32Array(animationState.NP), last:new Float32Array(animationState.NP), pal:new Uint32Array(appearanceState.N_RAMPS*3),
    tr:'stripe', gl:'classic', bt:'mid', look:null, name:'', title:'', manual:false, mirror:false, opp:null, idleOff:0,
    hpMax:100, hp:100, hpShow:100, sta:100, staMax:100, staCap:100, regen:1, fat:0.1, recov:0.5, endLvl:1, stun:0, dmg:0, blood:[], spd:1, pow:1,
    down:false, ko:false, kdN:0, hurt:0, thrown:0, landed:0, power:0, evades:0, blocks:0, counters:0,
    evChain:0, evLast:-999, evActive:false, evHit:false, staShow:100, pendHit:-1, blockT:0,
    st:animationState.IDLE, stT:0, faceL:0, headXL:0, headY:0, chestL:0, hipY:0, hipL:0, effPos:state.START_POS, stW:12};
}

export /* Stamina has two layers: sta (what you can spend now) regenerates only up to staMax, and staMax itself wears
   down — a slice of every effort (fat), body shots, and slowly the clock. Between rounds part of the lost
   ceiling comes back (recov). Endurance sets the capacity, the regeneration, the wear and the recovery. */
function staF(F){ return F.sta/F.staCap; }

/** A live brawl shares the ordinary fighter poses, scene and result flow. */
export function isRealtimeFight(){ return !isShadowboxing()&&!isCardFight()&&state.live===true; }

/** Fighters may start a deliberate action from idle, walking or their held guard. @param {any} F */
function liveReady(F){ return !F.down&&!F.ko&&F.pendHit<0&&(F.st===animationState.IDLE||F.st===animationState.M_WALKF||F.st===animationState.M_WALKB||F.st===animationState.S_BLOCK); }

/** Copy transient rules values to the existing animation and result presentation. @param {any} F */
function liveVitals(F){ F.hp=F.rt.hp; F.sta=F.rt.sta; F.staMax=F.rt.staCap; }

/** Start a live move in the context owned by sparring. @param {any} F @param {number} id @param {boolean} [low] */
function liveMove(F,id,low=false){
  switchTo(F); state.nextLow=low?1:0; startMove(id,0); derive(F); saveCtx(F); switchTo(state.FA);
}

/** Brief feedback uses combat time, so it freezes with pause. @param {string} text */
function liveNotice(text){ state.SP.notice=text; state.SP.noticeUntil=state.SP.liveTime+1.2; }

/** Start a costed punch once, sharing repeat history between head and body. @param {any} F @param {number} pid @param {boolean} low */
function livePunch(F,pid,low){
  if(!liveReady(F)||F.rt.guarding)return false;
  if(!beginPunch(F.rt,pid,state.SP.liveTime)){ if(F===state.FA)liveNotice('Za mało kondycji — zmień cios lub odetchnij.'); return false; }
  F.rtPunchAt=state.SP.liveTime; F.rtLow=low; liveVitals(F); liveMove(F,pid,low); return true;
}

/** Raise or release a guard through the fighter owner; attacking cannot be cancelled into a block. @param {any} F @param {boolean} held */
function liveGuard(F,held){
  setGuard(F.rt,held,state.SP.liveTime); F.blockT=held?2:0;
  if(held&&F.st!==animationState.S_BLOCK&&F.st!==animationState.S_BLOCKHIT)liveMove(F,animationState.S_BLOCK);
}

/** Release a held guard on key-up, pause, blur or mode change. @param {boolean} held */
export function setRealtimeGuard(held){
  if(!isRealtimeFight()||!state.FA?.rt)return;
  state.SP.guardHeld=held;
  if(!held)liveGuard(state.FA,false);
  else if(state.SP.phase==='fight'&&liveReady(state.FA))liveGuard(state.FA,true);
}

/** Route the ordinary keyboard and screen controls to the live fighter. @param {number} id @returns {boolean} */
export function realtimePress(id){
  if(!isRealtimeFight()||state.SP.phase!=='fight')return false;
  const F=state.FA;
  if(id>=0&&id<=3)return livePunch(F,id,inputState.bodyHeld||inputState.bodyEl?.checked);
  if(!liveReady(F)||F.rt.guarding)return false;
  if(id===animationState.M_SLIPL||id===animationState.M_SLIPR||id===animationState.M_DODGE){
    if(!beginSlip(F.rt,state.SP.liveTime)){liveNotice('Slip: odetchnij przed następnym unikiem.');return false;}
    liveVitals(F);liveMove(F,id);return true;
  }
  if(id===animationState.M_WALKF||id===animationState.M_WALKB||isDash(id)){
    switchTo(F);if(!sparCanWalk(id)){switchTo(state.FA);return false;}
    if(isDash(id)){if(F.rt.sta<3)return false;F.rt.sta-=3;liveVitals(F);}
    liveMove(F,id);return true;
  }
  return false;
}

/** One deterministic-clock AI decision; opponents close distance, vary punches, and sometimes defend a visible windup. */
function liveAI(){
  const F=state.FB,A=state.FA,now=state.SP.liveTime,O=oppDef();
  if(F.rt.guarding&&now>=F.rtGuardUntil)liveGuard(F,false);
  if(!liveReady(F)||F.rt.guarding)return;
  if(A.st>=0&&A.st<=3&&now-A.rtPunchAt>.08&&F.rtSeen!==A.rtPunchAt){
    F.rtSeen=A.rtPunchAt;
    if(hipDist(F)<34&&Math.random()<Math.min(.48,.18+O.rank*.012)){
      liveGuard(F,true);F.rtGuardUntil=now+.3;return;
    }
  }
  if(now<F.rtAiAt)return;
  const gap=hipDist(F);
  if(gap>25){if(F.st!==animationState.M_WALKF)liveMove(F,animationState.M_WALKF);F.rtAiAt=now+.12;return;}
  if(F.rt.sta<18){F.rtAiAt=now+.45;return;}
  const roll=Math.random(),pid=O.style==='press'?(roll<.2?0:roll<.48?1:roll<.78?2:3):roll<.4?0:roll<.68?1:roll<.88?2:3;
  if(livePunch(F,pid,Math.random()<.3))F.rtTellUntil=now+(pid===0?.18:.1);
  F.rtAiAt=now+.55+Math.random()*.65;
}

/** Update live resources, held controls, Sunday limits and HUD using the fixed simulation clock. */
function liveTick(){
  if(state.SP.phase!=='fight')return;
  state.SP.liveTime+=1/60;
  const now=state.SP.liveTime,F=state.FA;
  if(state.timeLimit&&state.SP.elapsed>=state.timeLimit){timeUp();return;}
  for(const f of state.FIG){
    // Recover between actions; keeping the guard up always drains it, including at zero.
    tickCombatant(f.rt,1/60,now);liveVitals(f);
    if(f.rt.guarding)f.blockT=2;
  }
  if(state.SP.guardHeld&&liveReady(F)&&!F.rt.guarding)liveGuard(F,true);
  if(!state.SP.guardHeld&&F.rt.guarding)liveGuard(F,false);
  if(!state.SP.guardHeld&&animationState.walkHeld>=0&&F.st!==animationState.walkHeld&&liveReady(F))realtimePress(animationState.walkHeld);
  liveAI();
  if(state.rigged&&!state.rigKO&&(F.hp/F.hpMax-state.FB.hp/state.FB.hpMax>.15||now>35)){
    state.rigKO=true;F.rt.hp=F.hp=0;F.ko=true;F.pendHit=animationState.S_KO;
    state.SP.phase='ko';state.SP.pt=0;state.SP.winner=state.FB;state.SP.how='KASTET';
    popup(state.T_KASTET,72,26,appearanceState.C_RED,3,150);sfxKO();setInfo();
  }
}

/** Contact is resolved at the existing animation apex, once, with its actual target height. @param {any} m */
function liveImpact(m){
  const A=state.ctxF,D=A.opp,pid=m.id,now=state.SP.liveTime;
  if(state.SP.phase!=='fight'||pid<0||pid>3||D.ko)return;
  if(hipDist(A)>[33,31,27,26][pid]){A.rt.punchCounter=false;if(A===state.FA)liveNotice('Poza zasięgiem — podejdź bliżej.');return;}
  const o=resolvePunch(A.rt,D.rt,{pid,low:!!state.aimLow,now}),low=!!state.aimLow;
  liveVitals(A);liveVitals(D);
  if(o.kind==='parry'){
    D.blocks++;D.perfects++;A.pendHit=animationState.S_PARRIED;
    popup(state.T_PARRY,wX(appearanceState.W-1-D.headXL),D.headY-12,appearanceState.C_SPARK,1,30);sfxBlock(.9,true);boxingState.hitstop=4;
    liveNotice(D===state.FA?'Idealny blok — strącony cios, rywal traci kondycję.':'Rywal strącił twój cios.');return;
  }
  if(o.kind==='slip'){
    D.evades++;D.perfects++;popup(state.T_UNIK,wX(appearanceState.W-1-D.headXL),D.headY-12,appearanceState.C_SPARK,1,30);sfxWhoosh(.5);
    if(D===state.FA)liveNotice('Idealny slip — następny cios +50% przez 1 s.');return;
  }
  const blocked=o.kind==='block'&&o.damage===0;
  if(o.kind==='block')D.blocks++;
  if(o.damage>0){A.landed++;if(pid>0)A.power++;if(low)A.body++;if(o.counter)A.counters++;D.dmg=Math.min(1,D.dmg+o.damage/D.hpMax*1.6);D.hurt=2;}
  D.pendHit=blocked?animationState.S_BLOCKHIT:low?animationState.S_BODY:[animationState.S_HITJ,animationState.S_HIT,animationState.S_HOOKED,animationState.S_UPPED][pid];
  const L=m.glove===0,gy=L?boxingState.lgy:boxingState.rgy,hxA=appearanceState.W-1-D.headXL,hy=D.headY,cx=Math.round(appearanceState.W-1-(low?D.bellyL:D.faceL))-1;
  hitFx(A,D,{pid,low,blocked,counter:o.counter,heavy:pid===3,hole:false,slowHit:false,L,cx,gy,hxA,hy,dmg:o.damage});
  if(o.damage>0)popup(state.T_DMG+Math.min(30,Math.max(1,Math.round(o.damage)))-1,wX(hxA),hy-4,appearanceState.C_WHITE,1,32);
  if(o.failedSlip&&D===state.FA)liveNotice('Zły timing slipu — cios rywala +35%.');
  else if(o.counter&&A===state.FA)liveNotice('Kontra po slipie · obrażenia +50%.');
  if(D.hp<=0){D.ko=true;D.pendHit=animationState.S_KO;endByKO(A,D,'KO');}
}

/** Keep health, live costs and defensive feedback visible without the card menu. */
function liveHUD(){
  const now=state.SP.liveTime;
  realtimeHud({fighters:state.FIG,costs:[0,1,2,3].map(pid=>Math.round(punchCost(state.FA.rt,pid,now)*10)/10),
    message:state.SP.phase==='intro'?'Przygotuj się · 1–4 ciosy · Spacja blok · Q slip':now<state.SP.noticeUntil?state.SP.notice:'Zmieniaj ciosy. Opuść blok, żeby odzyskać kondycję.',
    counter:now<state.FA.rt.counterUntil,phase:state.SP.phase,elapsed:state.SP.elapsed/60});
}

/** Turn-based skill engine, kept as an explicit entry (debug, tests). @param {number} idx @param {string} [venue] @param {any} [station] */
export function startCardSpar(idx,venue,station){startSpar(idx,venue,station,false,true);}

/** Real-time brawl, the same as the default `startSpar`. @param {number} idx @param {string} [venue] @param {any} [station] */
export function startLiveSpar(idx,venue,station){startSpar(idx,venue,station,false,false);}

/** Whether the current fight uses the prison's bareknuckle rules. */
export function isBareknuckle(){ return state.bareknuckle===true; }

/** Whether this scene is the prison's non-contact technique exercise. */
export function isShadowboxing(){ return state.shadow===true; }

/** A brawl fought with cards (KARCIANKA.md): the card engine decides, the fighters only act it out. */
export function isCardFight(){ return state.cards===true; }

/** Choose the next fight venue through its owner. @param {string} venue */
export function setSparVenue(venue){ state.sparVenue=venue; }

/** Copy tree-derived passives onto a fighter (player or opponent). @param {any} F @param {{str:number,spd:number,end:number}} lv @returns {number} extra health */
export function applyFighterStats(F,lv){ const S=fighterStats(lv); Object.assign(F,{pow:S.pow,spd:S.spd,spdFoot:S.spdFoot,spdBack:S.spdBack,staCap:S.staCap,regen:S.regen,fat:S.fat,recov:S.recov,endLvl:S.endLvl,stunDealt:S.stunDealt,stunTaken:S.stunTaken,guardDrain:S.guardDrain}); return S.hpBonus; } function switchTo(F){ if(state.ctxF===F) return; if(state.ctxF) saveCtx(state.ctxF); loadCtx(F); state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror; boxingState.trl=F.trl||(F.trl={h:[[],[]]}); } function wX(x){ return state.mirrorCtx?appearanceState.W-1-x:x; }

/** Guard height of a card fight's block (the engine picks it). @param {any} F */
export function guardLowOf(F){ return !!F.guardLow; }

/** Distance between the boxers' hips in their facing-relative coordinates. @param {any} F */
export function hipDist(F){ return 31-F.effPos-F.opp.effPos; }

export // 31 = W-1-2*BASE_X
function sparClamp(p){ const lim=31-state.MIN_DIST-state.oppF.effPos; if(p>lim)p=lim; return p<state.RING_MIN?state.RING_MIN:p; } function sparCanWalk(id){ return isFwd(id)?31-state.ctxF.effPos-state.oppF.effPos>state.MIN_DIST+3:animationState.posX>state.RING_MIN+2; } // can defender D slip / roll this punch right now?  (slips beat straights, the weave beats straights and hooks)

export // opponent silhouette (front edge, in the CURRENT fighter's frame) at height gy: gloves stop on it
function oppSurface(gy){
  if(isShadowboxing())return 999;
  const D=state.oppF; if(D.down||D.ko||(state.aimLow===0&&evades(D,boxingState.state))) return 999;
  if(gy<D.headY-6||gy>D.hipY+3) return 999;
  return appearanceState.W-1-(gy<=D.headY+6?D.faceL:(gy<=D.chestY+2?D.chestL:D.bellyL));
} function derive(F){
  F.st=boxingState.state; F.stT=boxingState.stateT; F.headXL=boxingState.headX; F.faceL=boxingState.headX+5; F.headY=boxingState.headY; F.chestL=torsoEdge(boxingState.sy+5,true);
  F.chestY=boxingState.sy+5; F.bellyL=torsoEdge(boxingState.hipY-4,true);
  F.hipY=boxingState.hipY; F.hipL=boxingState.hipX; F.effPos=sparClamp(animationState.posX+animationState.cur[animationState.GX]); F.stW=animationState.cur[animationState.ST];
}

/** Tree levels of an opponent definition. @param {any} O */
export function oppLevels(O){ return O.lv||opponentLevels(O.rank,O.style); }

/** Stars of an opponent definition (★–★★★★). @param {any} O */
export function oppStars(O){ return opponentStars(O.rank); }


/** A time limit for the next bareknuckle fight (the Sunday brawl: 90 s), 0 = none. @param {number} ticks */
export function setFightLimit(ticks){ state.timeLimit=ticks; }

/** Arm the rigged fight (Profesor's list #6): the rival pulls a knuckle-duster once the player leads. @param {boolean} on */
export function setRigged(on){ state.rigged=on; state.rigKO=false; }

/** The player's trousers-only fight skin, including Cień; bath outfits keep their towel. @param {any} [F] */
export function bareTorsoOut(F=state.ctxF){ return (boxingState.gstate==='spar'&&isBareknuckle()&&state.sparVenue!=='laznia'&&!!F&&F===state.FA); }
/** A fight in the bath: towels round the hips, bare fists, rubber slippers. */
export function towelOut(){ return boxingState.gstate==='spar'&&state.sparVenue==='laznia'; }
export function prisonOut(){ return boxingState.gstate==='crank'||boxingState.gstate==='pullup'||boxingState.gstate==='work'||boxingState.gstate==='arm'||(boxingState.gstate==='spar'&&isBareknuckle()&&state.sparVenue!=='laznia')||(boxingState.gstate==='pushup'&&pushupsState.puVenue==='cell'); } function prisonPal(F){                 // this fighter wears the cell drelich: blue shirt + trousers, black shoes
  const keep=appearanceState.PAL.slice(); appearanceState.PAL.set(F.pal);
  setRamp(appearanceState.R_SHIRT,npcsState.CN_TOP,false); setRamp(appearanceState.R_SHIRTF,npcsState.CN_TOP,true); setRamp(appearanceState.R_PANT,npcsState.CN_PANT,false); setRamp(appearanceState.R_PANTF,npcsState.CN_PANT,true);
  setRamp(appearanceState.R_BOOT,state.PRIS_SHOE,false); setRamp(appearanceState.R_BOOTF,state.PRIS_SHOE,true); setRamp(appearanceState.R_BTR,state.PRIS_SOLE,false); setRamp(appearanceState.R_BTRF,state.PRIS_SOLE,true);
  F.pal.set(appearanceState.PAL); appearanceState.PAL.set(keep); F.bt='low';
  if(F===state.FA)for(let j=0;j<3;j++)F.pal[appearanceState.R_PANTF*3+j]=shadeC(F.pal[appearanceState.R_PANT*3+j],0.86);
} /* ---------- setup / teardown ---------- */
/** This fighter wears a towel and slippers (the bath). @param {any} F @param {string[]} towel @param {string[]} slip */
function towelPal(F,towel,slip){
  const A=appearanceState, keep=A.PAL.slice(); A.PAL.set(F.pal);
  for(const [r,far] of [[A.R_TRUNK,false],[A.R_TRUNKF,true],[A.R_TT,false],[A.R_TTF,true],[A.R_TA,false],[A.R_TAF,true]]) setRamp(r,towel,far);
  setRamp(A.R_BOOT,slip,false); setRamp(A.R_BOOTF,slip,true); setRamp(A.R_BTR,slip,false); setRamp(A.R_BTRF,slip,true);
  F.pal.set(A.PAL); A.PAL.set(keep); F.bt='low'; F.tr='plain';
}
function snapFighterLook(F,eq,look){ applyGear(eq); applyLook(look); F.pal.set(appearanceState.PAL); F.tr=appearanceState.trStyle; F.gl=appearanceState.glStyle; F.bt=appearanceState.btStyle; F.look=Object.assign({},appearanceState.lk); } function resetFighter(F){
  state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror;                          // fresh context (previous one is being reset too)
  boxingState.state=animationState.IDLE; boxingState.stateT=0; boxingState.frameIdx=-1; boxingState.fired=0; boxingState.idleT=99; boxingState.curGrade=1; boxingState.buffered=-1; boxingState.bufferTick=0; boxingState.bufferedGrade=1; boxingState.moveStep=0; animationState.moveRate=1;
  animationState.posX=state.START_POS; boxingState.flashL=0; boxingState.flashR=0; animationState.cur.set(animationState.GUARD); animationState.fromPose.set(animationState.GUARD); animationState.lastPose.set(animationState.GUARD);
  boxingState.trX=0; boxingState.trY=0; boxingState.trVX=0; boxingState.trVY=0; state.aimLow=0; state.nextLow=0; state.idleOff=F.idleOff;
  F.effPos=state.START_POS; F.pendHit=-1; F.blockT=0; F.down=false; F.hurt=0; F.stun=0; F.kx=F.kv=F.ky=F.shk=F.hitT0=0;
  boxingState.STATS.speed=F.spd; solve(); boxingState.prevHX=appearanceState.BASE_X+animationState.posX+animationState.cur[animationState.BX]; boxingState.prevHY=appearanceState.HIP_Y0+animationState.cur[animationState.BY]; derive(F); saveCtx(F);
}

export function sparExit(){
  if(isShadowboxing())stopShadowboxing();
  if(isCardFight())cardStop();
  hideRealtimeHud();state.live=false;
  state.shadow=false;state.shadowRate=1;state.cards=false;
  if(state.ctxF){ switchTo(state.FA); state.ctxF=null; } boxingState.trl=boxingState.trailMain;
  state.oppF=null; state.mirrorCtx=false; state.aimLow=0; state.nextLow=0; state.idleOff=0; animationState.idleTired=0; animationState.idleHurt=0; animationState.idleClose=0; animationState.idleSeed=7; state.faceDmg=0; state.lyingDraw=false;
  rendererState.fb=rendererState.FB_MAIN; if(state.sparLkSave) appearanceState.lk=state.sparLkSave; if(state.WORK_RAMPS) appearanceState.PAL.set(state.WORK_RAMPS,appearanceState.R_SHIRT*3); applyGear(progressionState.save.eq); applyLook(progressionState.save.look);
  applyStats();
  animationState.posX=0; boxingState.state=animationState.IDLE; boxingState.buffered=-1; animationState.cur.set(animationState.GUARD); animationState.lastPose.set(animationState.cur); boxingState.idleT=0; boxingState.hitstop=0; boxingState.shakeT=0;
  state.SP.phase='off'; state.SP.pivot=null;
  document.body.classList.remove('spar','realtimefight'); inputState.overEl.hidden=true; { const fp=document.getElementById('fightPlate'); if(fp) fp.hidden=true; }
} /* ---------- per-fighter simulation step (mirrors update() for one boxer) ---------- */
function stepAnim(F,adv){
  let ev=0, frameChanged=false, m=null;
  if(boxingState.state!==animationState.IDLE){
    m=animationState.MOVES[boxingState.state];
    if(boxingState.stateT>=m.dur){
      if(m.walk)commitWalk(); animationState.lastPose.set(animationState.cur); const was=boxingState.state; boxingState.state=animationState.IDLE; boxingState.idleT=0; m=null;
      if(was===animationState.S_BLOCKHIT&&F.blockT>0){ startMove(animationState.S_BLOCK,6); m=animationState.MOVES[boxingState.state]; }   // straight back into the held guard
    }
    if(m){
      const fr=m.fr||5, f=Math.floor(boxingState.stateT/fr);
      if(f!==boxingState.frameIdx){
        boxingState.frameIdx=f; frameChanged=true;
        let sT=(f+1)*fr; if(sT>m.dur)sT=m.dur;
        for(let k=1;k<m.n;k++) if(!(boxingState.fired&(1<<k))&&sT>=m.times[k]){boxingState.fired|=1<<k;ev|=1<<k;}
      }
      if(frameChanged||(adv&&m.id>=0&&m.id<=3)||m.id===animationState.S_BLOCK||m.id===animationState.S_BLOCKHIT||m.id===animationState.S_SHELL) samplePose(m,poseSampleTime(m,boxingState.stateT,ev),animationState.cur);
      if(adv&&!(isRealtimeFight()&&F===state.FB&&m.id>=0&&m.id<=3&&state.SP.liveTime<F.rtTellUntil)&&!(m.hold&&boxingState.stateT>=m.hold&&holdFor(F))){ boxingState.stateT+=sparMoveSpeed(F,boxingState.state)*(isCardFight()&&m.id>=0&&m.id<=3&&boxingState.stateT>m.times[m.apex]?1.6:1); if(m.hold&&boxingState.stateT>m.hold&&holdFor(F)) boxingState.stateT=m.hold; }   // never step over a hold
    }
  }
  if(boxingState.state===animationState.IDLE){
    computeIdle(animationState.idleP); if(adv) boxingState.idleT++;
    if(boxingState.idleT<=5){for(let k=0;k<animationState.NP;k++)animationState.cur[k]=animationState.lastPose[k]+(animationState.idleP[k]-animationState.lastPose[k])*0.5;} else animationState.cur.set(animationState.idleP);
  }
  solve();
  if(m&&ev) handleEvents(m,ev);
  if(m&&frameChanged){ if(m.glove===0){boxingState.pgx=boxingState.lgx;boxingState.pgy=boxingState.lgy;} else if(m.glove===1){boxingState.pgx=boxingState.rgx;boxingState.pgy=boxingState.rgy;} boxingState.phx=boxingState.headX; boxingState.phy=boxingState.headY; }
  if(adv) updateShorts();
  derive(F);
} /* The round script: feel-out (first 20 %: jabs, footwork) -> exchanges -> closing burst
   (last 20 %, the fighter behind on points pushes harder). A hurt opponent draws a finisher. */


/** The bodies of one punch: the struck fighter is thrown back from the blow in one frame, shivers through the freeze and rocks
 * back (a spring on the drawn position only, the engine's distance is untouched); the puncher drives into it.
 * @param {any} A @param {any} D @param {{pid:number,low:boolean,blocked:boolean,heavy:boolean,dmg:number}} o */
function bodyHit(A,D,o){
  const dir=fighterView(D).x>=fighterView(A).x?1:-1, pw=o.blocked?1:1+o.dmg*0.45+(o.heavy?1:0);
  D.kx=dir*pw*(o.pid===3?0.6:1); D.kv=0; D.shk=o.blocked?0:(o.heavy?2:1); D.ky=o.low?2:o.pid===3&&!o.blocked?-2:0;
  A.kx=dir*(0.6+0.3*o.pid); A.kv=0;
}
/** One tick of the body springs of a fighter (not during the freeze). @param {any} F */
function bodyStep(F){
  F.shk=0; F.ky=(F.ky||0)*0.7;
  if(F.kx||F.kv){ F.kv=((F.kv||0)-0.3*F.kx)*0.72; F.kx+=F.kv; if(Math.abs(F.kx)<0.05&&Math.abs(F.kv)<0.05) F.kx=F.kv=0; }
}

/** Feedback of one landed or blocked punch: hitstop, shake, sparks, sweat and blood, sound and captions.
 * @param {any} A @param {any} D @param {{pid:number,low:boolean,blocked:boolean,counter:boolean,heavy:boolean,hole:boolean,slowHit:boolean,L:boolean,cx:number,gy:number,hxA:number,hy:number,dmg?:number}} o */
function hitFx(A,D,o){
  const {pid,low,blocked,counter,heavy,hole,slowHit,L,cx,gy,hxA,hy,dmg}=o, bare=isBareknuckle();
  boxingState.hitstop=bare?(blocked?2:Math.min(9,[3,5,5,5][pid]+(counter?1:0)+(heavy?3:0))):(blocked?2:(pid===0?3:5)+(counter?2:0)+(heavy?6:0)+(boxingState.curGrade===0?1:0));
  camKick(cx,gy,blocked?0.03:Math.min(0.25,([0.06,0.09,0.13,0.13][pid]??0.1)+(heavy?0.05:0)+(counter?0.03:0)+(slowHit?0.05:0)));
  const amp=blocked?0:Math.min(4,(pid===0?(bare?1:0):(bare?2:1))+(counter?1:0)+(heavy?1:0));
  if(amp>0){boxingState.shakeAmp=amp;boxingState.shakeAxis=pid===3?1:0;boxingState.shakeT=boxingState.shakeDur=8+(heavy?6:0);}
  bodyHit(A,D,{pid,low,blocked,heavy,dmg:dmg||0});
  if(blocked){
    sfxBlock(0.6+0.1*pid,bare); popup(state.T_BLOK,wX(hxA),hy-10,appearanceState.C_GRAY,1,18);
    return;
  }
  if(hole) popup(state.T_HOLE,wX(hxA),hy-14,appearanceState.C_SPARK,1,26);
  if(pid===2&&!low){ boxingState.hitstop+=2; boxingState.shakeAmp=Math.min(3,boxingState.shakeAmp+1); boxingState.shakeT=boxingState.shakeDur=Math.max(boxingState.shakeT,12);   // the hook lands like a door slammed
    for(let j=0;j<7;j++) spawn(boxingState.P_SWEAT,hxA,hy+(Math.random()-0.5)*4,-0.6-Math.random()*1.4,(Math.random()-0.7)*1.2,22,appearanceState.C_SWEAT); }
  // spray off the struck head: more sweat the more tired he is; below 60 % HP some of it turns into blood
  { const hf=D.hp/D.hpMax, bloodAt=bare?0.8:0.6, pb=hf<bloodAt?(bloodAt-hf)*(bare?2:1.5):0, tired=1-staF(D), nd=1+Math.round((1+pid)*(0.5+1.5*tired));
    const sx0=low?appearanceState.W-1-D.chestL:hxA, sy0=low?gy:hy-2;
    for(let j=0;j<nd;j++){ const bl=!low&&Math.random()<pb;
      spawn(bl?boxingState.P_BIT:boxingState.P_SWEAT,sx0+Math.random()*3,sy0+Math.random()*3,0.5+Math.random()*1.3,-0.5-Math.random()*1.1,bl?44:36,bl?(Math.random()<0.5?state.C_BLOOD:state.C_BLOOD2):appearanceState.C_SWEAT); } }
  sfxPunch(Math.min(1.4,0.55+0.25*pid+(counter?0.2:0)),low?1:0.35+pid*0.15,bare);
  if(counter) popup(state.T_KONTRA,wX(hxA),hy-14,appearanceState.C_SPARK,slowHit?2:1,slowHit?40:30);
  if(slowHit){ boxingState.hitstop=bare?Math.min(6,boxingState.hitstop+1):boxingState.hitstop+4; boxingState.shakeAmp=3; boxingState.shakeAxis=0; boxingState.shakeT=boxingState.shakeDur=14; }
}

/** Time is up (the Sunday brawl): the fresher fighter wins, a close one is a draw. */
function timeUp(){
  const A=state.FA, B=state.FB, d=A.hp/A.hpMax-B.hp/B.hpMax;
  state.SP.phase='ko'; state.SP.pt=0; state.SP.how='CZAS'; state.SP.winner=Math.abs(d)<0.05?null:(d>0?A:B);
  popup(state.T_TIME,72,26,appearanceState.C_WHITE,2,120); sfxBell(2); setInfo();
} function endByKO(Wn,Ls,how){
  if(state.rigKO) return;                         // the knuckle-duster already decided it
  state.SP.phase='ko'; state.SP.pt=0; state.SP.winner=Wn; state.SP.how=how;
  popup(how==='TKO'?state.T_TKO:how==='KASTET'?state.T_KASTET:state.T_KOX,72,26,appearanceState.C_RED,3,150); sfxKO();
  setInfo();
}


/** Rebase a fighter in its owned context, retaining health, effort, perks and clothing marks.
 * @param {any} F @param {number} position @param {number} move */
function placePivotFighter(F,position,move){
  Object.assign(F.S,{posX:position,state:move,stateT:0,frameIdx:-1,fired:0,idleT:99,buffered:-1,moveStep:0,aimLow:0,nextLow:0});
  F.cur.set(animationState.GUARD); F.from.set(animationState.GUARD); F.last.set(animationState.GUARD);
  F.blockT=0; F.pendHit=-1;
  if(F.trl)for(const trail of F.trl.h)trail.length=0;
  state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror;
  loadCtx(F); solve(); derive(F); saveCtx(F);
  Object.assign(F.S,{prevHX:F.hipL,prevHY:F.hipY,pgx:F.S.lgx,pgy:F.S.lgy,phx:F.headXL,phy:F.headY});
}

/** A close forward pair trades adjacent slots, including when either boxer is against a wall.
 * @returns {boolean} Whether the pivot started. */
export function sparPivot(){
  const A=state.FA,B=state.FB,cost=isCardFight()?0:6;
  const ready=A.st===animationState.IDLE||A.st===animationState.M_WALKF||A.st===animationState.M_WALKB||A.st===animationState.S_BLOCK;
  if(state.SP.phase!=='fight'||state.SP.pivot||!A.manual||A.down||A.ko||B.down||B.ko||!ready||B.st===animationState.S_GETUP||boxingState.tick<state.SP.pivotCD||hipDist(A)>PIVOT_RANGE||A.sta<cost)return false;
  const positions=[B.effPos,A.effPos],from=state.FIG.map(F=>F.mirror?appearanceState.W-1-F.hipL:F.hipL);
  clearHeldInput(); spendSta(A,cost);
  if(state.ctxF)saveCtx(state.ctxF);
  A.mirror=!A.mirror; B.mirror=!B.mirror;
  A.effPos=positions[0]; B.effPos=positions[1];
  for(let pass=0;pass<2;pass++)for(let i=0;i<2;i++)placePivotFighter(state.FIG[i],positions[i],i===0?animationState.M_PIVOT:animationState.M_PIVOT_TURN);
  state.SP.pivot={t:0,dur:animationState.MOVES[animationState.M_PIVOT].dur,from,to:state.FIG.map(F=>F.mirror?appearanceState.W-1-F.hipL:F.hipL)};
  state.SP.pivotCD=boxingState.tick+60;
  switchTo(A); sfxWhoosh(0.45); return true;
}

/** Start the cell training with a harmless reference silhouette. @param {any} station */
export function startShadowCombat(station){ startSpar(0,'cell',station,true); }

/** End training effort without declaring a winner or awarding fight rewards. */
export function finishShadowCombat(){ if(isShadowboxing())state.SP.phase='end'; }

/** Set the animation multiplier without changing ordinary fight or rhythm clocks. @param {number} rate */
export function setShadowTempo(rate){ if(isShadowboxing())state.shadowRate=Math.max(1,Math.min(2,rate)); }

/** Whether a queued training action can start or the previous animation has completed. */
export function shadowReady(){ return !state.SP.pivot&&(state.FA.st===animationState.IDLE||state.FA.st===animationState.S_BLOCK); }

/** Recenter a new attempt while preserving effort and the side reached by the last pivot. @param {boolean} far */
export function resetShadowPosition(far=false){
  if(!isShadowboxing())return;
  state.SP.pivot=null;clearHeldInput();
  const positions=[far?-7:6,6];
  state.FA.effPos=positions[0];state.FB.effPos=positions[1];
  for(let pass=0;pass<2;pass++)for(let i=0;i<2;i++)placePivotFighter(state.FIG[i],positions[i],animationState.IDLE);
  state.FA.evChain=0;state.FA.evActive=false;state.FA.evLast=-999;
  state.SP.pivotCD=0;switchTo(state.FA);
}

/** Start one real animation, retaining its stamina cost and full completion requirement.
 * @param {number} id @param {boolean} low @returns {boolean} */
export function performShadowAction(id,low=false){
  if(!isShadowboxing()||!shadowReady())return false;
  const cost=id<=3?state.STA_COST[id]*0.6:isDash(id)?2.5:id===animationState.M_PIVOT?6:state.EV_BASE[id===animationState.M_DODGE?2:id-animationState.M_SLIPL];
  if(state.FA.sta<cost)return false;
  if(id===animationState.M_PIVOT)return sparPivot();
  switchTo(state.FA);
  if(isDash(id)&&!sparCanWalk(id))return false;
  state.nextLow=low?1:0;startMove(id,0);derive(state.FA);saveCtx(state.FA);return true;
}

/* ---------- card fights: the card engine decides, these operations act it out ---------- */

/** Start a move for one fighter of a card fight; a punch carries the engine's outcome to its apex.
 * @param {0|1} side @param {number} id @param {{low?:boolean,guardLow?:boolean,hold?:number,out?:any}} [o] @returns {boolean} */
export function cardAct(side,id,o={}){
  const F=state.FIG[side];
  if(!isCardFight()||F.down||F.ko) return false;
  switchTo(F);
  if((id===animationState.M_WALKF||id===animationState.M_WALKB||isDash(id))&&!sparCanWalk(id)){ switchTo(state.FA); return false; }
  F.cardOut=o.out||null;
  if(id===animationState.S_BLOCK){ F.guardLow=!!o.guardLow; F.blockT=o.hold||30; }
  state.nextLow=o.low?1:0; startMove(id,0); derive(F); saveCtx(F); F.st=id;
  switchTo(state.FA);
  return true;
}

/** Show the engine's numbers on the fight HUD and the wounds on the fighter.
 * @param {0|1} side @param {{hp:number,hpMax:number,sta:number,staMax:number,staCap:number,stun:number,perfects?:number,wounds?:any}} v */
export function setCardVitals(side,v){
  const F=state.FIG[side]; F.perfects=v.perfects||0; if(v.wounds) F.wounds={...v.wounds};
  F.hpMax=v.hpMax; F.hp=v.hp; if(F.hpShow<F.hp||F.hpShow>F.hpMax) F.hpShow=F.hp;
  F.staCap=v.staCap; F.staMax=v.staMax; F.sta=v.sta; F.staShow=v.staShow??v.sta; F.stun=v.stun*12;
}

/** A floating caption over a fighter's head (card captions: OTWARCIE, ZWÓD, ODDECH…). @param {0|1} side @param {number} text @param {number} [dy] */
export function cardCaption(side,text,dy=0){
  const F=state.FIG[side], v=fighterView(F), x=v.mirror?appearanceState.W-1-F.headXL:F.headXL;
  popup(text,x,F.headY-14-dy,text>=state.T_CARD&&text<state.T_CARD+3?appearanceState.C_SPARK:appearanceState.C_WHITE,1,40);
}

/** A fighter's head in native picture pixels (the card fight draws its rings there). @param {0|1} side @returns {[number,number]} */
export function fighterHead(side){ const F=state.FIG[side], v=fighterView(F); return [v.mirror?appearanceState.W-1-F.headXL:F.headXL,F.headY]; }

/** Back up after a knockdown in a card fight. @param {0|1} side */
export function cardGetUp(side){ const F=state.FIG[side]; F.down=false; F.pendHit=animationState.S_GETUP; }

/** End a card fight that no punch ended (bleeding, the Sunday turn limit). @param {-1|0|1} winner @param {string} how */
export function cardFinish(winner,how){
  if(how==='CZAS'){ timeUp(); return; }
  const W=state.FIG[winner===1?1:0], L=W.opp; L.hp=0; L.ko=true; L.pendHit=animationState.S_KO; endByKO(W,L,how);
}

/** The punch of a card reached its apex: act out the outcome the engine already decided (`F.cardOut`). @param {any} m */
function cardImpact(m){
  const A=state.ctxF, D=A.opp, C=appearanceState; let o=A.cardOut; A.cardOut=null;
  if(o?.resolve) o=o.resolve();   // a live beat: the player's defence is graded now, at the latest
  if(!o||D.down||D.ko) return;
  const pid=Math.min(3,m.pid??(m.id<=3?m.id:1)), L=m.glove===0, low=!!o.low, gy=L?boxingState.lgy:boxingState.rgy, hxA=C.W-1-D.headXL, hy=D.headY;
  if(o.kind!=='hit'){
    if(o.kind==='parry'){ A.pendHit=animationState.S_PARRIED; D.pendHit=animationState.M_PARRY; popup(state.T_PARRY,wX(hxA),hy-10,C.C_SPARK,1,28); sfxBlock(0.9,true); boxingState.hitstop=4; }
    else { popup(o.kind==='half'?state.T_CARD+12:state.T_UNIK,wX(hxA),hy-10,C.C_SWEAT,1,24); sfxWhoosh(0.5); }
    if(o.kind!=='whiff') D.evades++;
    if(o.przelot){ A.pendHit=animationState.S_OVERREACH; popup(state.T_OVER,wX(boxingState.headX),boxingState.headY-12,C.C_SPARK,1,28); }
    if(o.open) popup(state.T_CARD+o.open-1,wX(hxA),hy-18,C.C_SPARK,1,40);
    return;
  }
  const blocked=o.tag==='blok', heavy=!!(o.kd||o.ko||o.level>=2||o.tag==='nadziany');
  D.hp=Math.max(0,o.hp); D.stun=o.stun*12;
  if(blocked) D.blocks++;
  else { A.landed++; if(pid>0)A.power++; if(low)A.body=(A.body||0)+1; if(o.level)A.counters++; D.hurt=2; if(!low) D.dmg=Math.min(1,D.dmg+o.dmg/D.hpMax*1.6); }
  const front=C.W-1-(low?(gy<=D.chestY+2?D.chestL:D.bellyL):D.faceL), cx=Math.round(front)-1;
  if(o.ko){ if(o.how!=='TKO') D.hp=0; D.ko=true; D.pendHit=animationState.S_KO; endByKO(A,D,o.how||'KO'); }
  else if(o.kd){ D.down=true; D.pendHit=animationState.S_KD; D.kdN++; popup(state.T_NOKDAUN,72,30,C.C_RED,2,70); }
  else { D.pendHit=blocked?animationState.S_BLOCKHIT:(low?animationState.S_BODY:[animationState.S_HITJ,animationState.S_HIT,animationState.S_HOOKED,animationState.S_UPPED][pid]); D.hitT0=blocked?0:D.pendHit===animationState.S_HITJ?1:2; }
  if(o.dmg>0){ const n=Math.min(30,Math.round(o.dmg)), side=fighterView(D).x>=fighterView(A).x?1:-1; popup(state.T_DMG+n-1,wX(hxA)+side*9,hy-2,heavy?C.C_RED:blocked?C.C_GRAY:C.C_WHITE,heavy||n>=6?2:1,34); }   // damage dealt, beside the head
  hitFx(A,D,{pid,low,blocked,counter:o.level>0,heavy,hole:o.tag==='dziura',slowHit:false,L,cx,gy,hxA,hy,dmg:o.dmg});
  const caps=[];
  if(o.tag==='odsloniety') caps.push(state.T_OPEN); if(o.tag==='przebicie') caps.push(state.T_CARD+10);
  if(o.skurcz) caps.push(state.T_CARD+8); if(o.zadyszka) caps.push(state.T_CARD+9); if(o.mroczki) caps.push(state.T_CARD+11);
  const CAP=/** @type {Record<string,number>} */ ({rib:state.T_RIB,cut:state.T_CUT,eyeL:state.T_CARD+14,eyeR:state.T_CARD+14,nose:state.T_CARD+15,handL:state.T_CARD+16,handR:state.T_CARD+16,concussion:state.T_CARD+17,legs:state.T_CARD+18});
  const W=D.wounds||(D.wounds={});
  for(const k of o.injuries||[]){ caps.push(CAP[k]??state.T_CARD+11); if(k==='cut') W.cuts=(W.cuts||0)+1; else if(k==='rib') W.ribs=(W.ribs||0)+1; else W[k]=true; if(k!=='cut'&&k!=='legs') sfxCrack(1); }
  for(const k of o.selfInjuries||[]){ const AW=A.wounds||(A.wounds={}); AW[k]=true; sfxCrack(0.8); popup(state.T_CARD+16,wX(boxingState.headX),boxingState.headY-14,state.C_BLOOD2,1,40); }
  caps.forEach((c,i)=>popup(c,wX(hxA),hy-18-6*i,c===state.T_CUT||c===state.T_RIB?state.C_BLOOD2:C.C_SPARK,1,40));
}

/** Advance the duck/dash and the opponent's delayed turn on the same simulation clock. */
function pivotTick(){
  const P=state.SP.pivot,A=state.FA,m=animationState.MOVES[animationState.M_PIVOT];
  P.t=Math.min(P.dur,P.t+sparMoveSpeed(A,m.id));
  if(state.SP.phase!=='fight'||P.t>=P.dur){
    state.SP.pivot=null;
    for(const F of state.FIG)placePivotFighter(F,F.effPos,animationState.IDLE);
    return;
  }
  for(const F of state.FIG){
    F.S.stateT=P.t; state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror;
    loadCtx(F); samplePose(animationState.MOVES[F.S.state],P.t,F.cur); loadCtx(F); solve(); derive(F); saveCtx(F);
  }
}

/** Render the low dash before the player turns; the opponent reacts after the crossing.
 * @param {any} F */
export function fighterView(F){
  const P=state.SP.pivot;
  if(!P)return {mirror:F.mirror,x:F.mirror?appearanceState.W-1-F.hipL:F.hipL,dx:Math.round(F.kx||0)+(F.shk&&boxingState.hitstop>0?((boxingState.tick&1)?F.shk:-F.shk):0),dy:Math.round(F.ky||0),scaleX:1};
  const i=F===state.FA?0:1,p=P.t/P.dur;
  const dash=Math.max(0,Math.min(1,(p-(i===0?0.12:0.24))/(i===0?0.38:0.44)));
  const blend=(1-Math.cos(Math.PI*dash))*0.5;
  const turn=Math.max(0,Math.min(1,(p-(i===0?0.53:0.74))/0.2)),mirror=turn<0.5?!F.mirror:F.mirror;
  const x=Math.round(P.from[i]+(P.to[i]-P.from[i])*blend);
  return {mirror,x,dx:Math.round(x-(mirror?appearanceState.W-1-F.hipL:F.hipL)),dy:Math.round(Math.sin(Math.PI*dash)*(i===0?2:-1)),scaleX:1-0.45*Math.sin(Math.PI*turn)};
}



export function stain(x){ const xi=Math.round(x); if(xi<1||xi>=appearanceState.W-1) return; const y=appearanceState.FLOOR_Y-1+(h2(xi,boxingState.tick)&3), c=(boxingState.tick&1)?state.C_STAIN:state.C_STAIN2; state.bgRing[y*appearanceState.W+xi]=c; } /* ---------- render ---------- */

/** Drelich sections, front to back, matching the existing sleeves, torso and trousers.
 * @param {Record<string,number>} S Current joints. @param {any} F Fighter. */
function clothingSegments(S,F){
  const boot=F.bt==='high'?0.55:F.bt==='low'?0.22:0.4;
  const bare=bareTorsoOut(F);
  const legs=[
    [S.rhx,S.rhy,S.rkx,S.rky,3.5,2.2],
    [S.rkx,S.rky,S.rax+(S.rkx-S.rax)*boot,S.ray+(S.rky-S.ray)*boot,2.1,1.7],
    [S.lhx,S.lhy,S.lkx,S.lky,3.5,2.2],
    [S.lkx,S.lky,S.lax+(S.lkx-S.lax)*boot,S.lay+(S.lky-S.lay)*boot,2.1,1.7]
  ];
  return [
    bare?null:[S.rsx,S.rsy,S.rex,S.rey,3.1,2.5],
    bare?null:[S.rex,S.rey,S.rex+(S.rgx-S.rex)*0.72,S.rey+(S.rgy-S.rey)*0.72,2.5,2],
    bare?[S.torsoX,S.hipY,S.torsoX,S.hipY+1,3.5,3.5]:[S.torsoX,S.hipY+1,S.sx,S.sy+2,3.9,6.1],
    ...(bare?[legs[2],legs[3],legs[0],legs[1]]:legs),
    bare?null:[S.lsx,S.lsy,S.lex,S.ley,3,2.3],
    bare?null:[S.lex,S.ley,S.lex+(S.lgx-S.lex)*0.72,S.ley+(S.lgy-S.ley)*0.72,2.3,1.9]
  ];
}

/** Locate fabric and keep its local coordinates so a stain follows the animated limb.
 * @param {(number[]|null)[]} sections @param {number} x @param {number} y */
function clothingContact(sections,x,y){
  for(let part=0;part<sections.length;part++){
    if(!sections[part])continue;
    const [ax,ay,bx,by,r0,r1]=sections[part], dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/(len*len)));
    const px=x-ax-dx*t,py=y-ay-dy*t;
    if(Math.hypot(px,py)<=r0+(r1-r0)*t-0.8)return {part,t,offset:(-dy*px+dx*py)/len};
  }
  return null;
}

/** Absorb falling blood along its swept path; other modes keep their floor stains.
 * @param {number} x0 @param {number} y0 @param {number} x @param {number} y @param {number} color
 * @returns {boolean} Whether clothing caught the drop. */
export function catchBloodOnClothes(x0,y0,x,y,color){
  if(boxingState.gstate!=='spar'||!isBareknuckle()||y<=y0)return false;
  const fighters=state.FIG.map(F=>({F,sections:clothingSegments(F===state.ctxF?boxingState:F.S,F)}));
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(x-x0),y-y0)));
  for(let k=1;k<=steps;k++)for(const {F,sections} of fighters){
    const wx=x0+(x-x0)*k/steps,wy=y0+(y-y0)*k/steps;
    const hit=clothingContact(sections,F.mirror?appearanceState.W-1-wx:wx,wy);
    if(!hit)continue;
    if(F.blood.length<64)F.blood.push({...hit,color});
    return true;
  }
  return false;
}

/** Paint attached blood only on visible fabric pixels, keeping skin and outlines intact.
 * @param {any} F Fighter currently drawn into FB_ALT. */
function drawClothingBlood(F){
  if(!isBareknuckle()||!F.blood.length)return;
  const sections=clothingSegments(boxingState,F), colors=[];
  for(const ramp of [appearanceState.R_SHIRT,appearanceState.R_SHIRTF,appearanceState.R_PANT,appearanceState.R_PANTF])for(let i=0;i<3;i++)colors.push(F.pal[ramp*3+i]);
  for(const mark of F.blood){
    if(!sections[mark.part])continue;
    const [ax,ay,bx,by]=sections[mark.part],dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
    const cx=Math.round(ax+dx*mark.t-dy/len*mark.offset),cy=Math.round(ay+dy*mark.t+dx/len*mark.offset);
    for(const [ox,oy] of [[0,0],[0,1],[-1,0],[1,0]]){
      const x=cx+ox,y=cy+oy;
      if(x<0||x>=appearanceState.W||y<0||y>=appearanceState.H)continue;
      const i=y*appearanceState.W+x;
      if(colors.includes(state.FB_ALT[i])&&clothingContact(sections,x,y)?.part===mark.part)state.FB_ALT[i]=ox===0?mark.color:state.C_STAIN2;
    }
  }
}

function composite(mirror,hurt,dx=0,dy=0,scaleX=1,ghost=false){
  const s1=appearanceState.PAL[appearanceState.R_SKIN*3+1], s2=appearanceState.PAL[appearanceState.R_SKIN*3+2], f1=appearanceState.PAL[appearanceState.R_SKINF*3+1], f2=appearanceState.PAL[appearanceState.R_SKINF*3+2];
  const anchor=mirror?appearanceState.W-1-boxingState.hipX:boxingState.hipX;
  for(let y=0;y<appearanceState.H;y++){
    const r=y*appearanceState.W;
    for(let x=0;x<appearanceState.W;x++){
      let c=state.FB_ALT[r+x]; if(!c) continue;
      if(ghost){if((x+y)&1)continue;c=appearanceState.C_GHOST2;}
      if(hurt&&(c===s1||c===s2||c===f1||c===f2)) c=appearanceState.C_WHITE;             // hit flash on the skin
      const tx=Math.round(anchor+((mirror?appearanceState.W-1-x:x)-anchor)*scaleX)+dx,ty=y+dy;
      if(tx>=0&&tx<appearanceState.W&&ty>=0&&ty<appearanceState.H)rendererState.FB_MAIN[ty*appearanceState.W+tx]=c;
    }
  }
} function drawFighter(F){
  switchTo(F);
  appearanceState.PAL.set(F.pal); appearanceState.trStyle=F.tr; appearanceState.glStyle=F.gl; appearanceState.btStyle=F.bt; appearanceState.lk=F.look; state.faceDmg=F.dmg; state.lyingDraw=boxingState.state===animationState.S_KO&&boxingState.stateT>14;
  rendererState.fb=state.FB_ALT; state.FB_ALT.fill(0); drawBoxer(); drawClothingBlood(F); drawWounds(F); rendererState.fb=rendererState.FB_MAIN;
  const view=fighterView(F);
  composite(view.mirror,false,view.dx,view.dy,view.scaleX,isShadowboxing()&&F===state.FB);
} /** Card fight wounds in the fighter's own buffer: a split brow, a swollen eye, a broken nose, a swollen knuckle.
 * @param {any} F */
function drawWounds(F){
  const w=F.wounds; if(!w||!isCardFight()) return;
  const hx=boxingState.headX, hy=boxingState.headY, W=appearanceState.W, H=appearanceState.H, B=state.FB_ALT;
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&x<W&&y>=0&&y<H&&B[y*W+x]) B[y*W+x]=c; };
  const n=Math.min(3,w.cuts||0);
  for(let i=0;i<n;i++) put(hx+1+i,hy-3,i&1?state.C_BLOOD:state.C_BLOOD2);
  if(n>=2) for(let y=hy-2;y<=hy+1;y++) put(hx+3,y,state.C_BLOOD);   // the blood runs into the eye
  if(w.scars&&!n) put(hx+2,hy-3,state.C_BRUISE2);   // an old scab on the brow
  if(w.eyeL||w.eyeR){ put(hx+2,hy-2,state.C_BRUISE); put(hx+3,hy-2,state.C_BRUISE2); put(hx+2,hy-1,state.C_BRUISE2); put(hx+3,hy-1,state.C_BRUISE); }
  if(w.nose){ put(hx+4,hy,state.C_BRUISE2); put(hx+4,hy+1,state.C_BLOOD); }
  for(const [k,gx,gy] of /** @type {[string,number,number][]} */ ([['handL',boxingState.lgx,boxingState.lgy],['handR',boxingState.rgx,boxingState.rgy]]))
    if(w[k]) for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++) if(Math.abs(dx)+Math.abs(dy)<2) put(gx+dx,gy+dy,(dx+dy)&1?state.C_BRUISE:state.C_BRUISE2);
}

/** Present a fight: the pixel picture and the camera. With fighters=false only the venue is drawn (the poster look
 * paints the fighters, their shadows, particles and captions over it). @param {boolean} [fighters] */
export function renderSpar(fighters=true){
  drawSparPixels(fighters);
  switchTo(state.FA);
  const C=state.cam, cards=isCardFight()||isRealtimeFight();
  setCamera(cards?{x:C.x,y:C.y,at:C.at,h:C.h,w:CAM_W,px:C.px,py:C.py,m:1+C.kick}:null);
}
/** The pixel picture of a fight: venue, shadows, particles, both fighters in draw order, captions. @param {boolean} fighters */
function drawSparPixels(fighters){
  rendererState.fb=rendererState.FB_MAIN; rendererState.fb.set(state.bgRing);
  const hot=boxingState.shakeT>0||state.SP.phase==='end', V=state.sparVenue, cell=V==='cell', ward=V==='canteen', yard=V==='yard';   // the cell is painted (cell-fight-scene), a fight at the meal keeps the drawn Ward
  const bath=V==='laznia', cards=isCardFight()||isRealtimeFight(); if(bath){ bathBack(hot); if(cards) dimBackdrop(); state.FB_PRE.set(rendererState.FB_MAIN); }
  if(cell) cellFightBack(hot); else if(ward) wardFightBack(hot); else if(yard) yardFightBack(hot,fighterView(state.FB).x,state.SP.elapsed);
  if(cards&&!bath) dimBackdrop(cell?0.45:1);   // the painted cell is dark already: only a little of the gloom on top
  if(!fighters){ if(bath) bathFront(state.FB_PRE); if(cell) cellFightFront(); else if(ward) wardFightFront(); else if(yard) yardFightFront(state.SP.elapsed); return; }
  for(let i=0;i<2;i++){ const F=state.FIG[i],view=fighterView(F); shadowEll(view.x,appearanceState.FLOOR_Y+view.dy-Math.round(F.ky||0),F.st===animationState.S_KO?13:Math.round((F.stW*0.5+6)*view.scaleX),1); }
  drawParticles(true);
  // draw order: the one punching is in front (glove lands over the face) unless the other one is slipping it
  const aAtt=state.FA.st>=0&&state.FA.st<=3, bAtt=state.FB.st>=0&&state.FB.st<=3;
  let front=state.FA;
  if(bAtt&&!aAtt) front=state.FB;
  if(front===state.FA&&aAtt&&evades(state.FB,state.FA.st)) front=state.FB; else if(front===state.FB&&bAtt&&evades(state.FA,state.FB.st)) front=state.FA;
  if(state.FA.st===animationState.S_KD||state.FA.st===animationState.S_KO) front=state.FB; else if(state.FB.st===animationState.S_KD||state.FB.st===animationState.S_KO) front=state.FA;
  if(state.SP.pivot)front=state.FA;
  drawFighter(front===state.FA?state.FB:state.FA); drawFighter(front);
  if(bath) bathFront(state.FB_PRE);
  if(cell) cellFightFront(); else if(ward) wardFightFront(); else if(yard) yardFightFront(state.SP.elapsed);   /* tallow and gloom, smog */
  drawParticles(false);
  if(state.SP.pivot)drawText('PIVOT',72,30,appearanceState.C_SWEAT,1);
  drawPopups();
}

/* ---------- the camera of a card brawl: the pair fills the screen while the cards are laid, closer for the reveal,
   a punch-in on every blow held through the hitstop; the room behind sinks into the dark ---------- */

/** The floor row, where it sits on the screen and how many rows fill the screen: planning (the feet just above the card
 * panel), the reveal, someone down (room above the pair for the count). */
const CAM_PLAN={y:89,at:0.78,h:98}, CAM_REVEAL={y:89,at:0.95,h:68}, CAM_DOWN={y:91,at:0.9,h:74};
/** Native width that always stays on screen (both fighters with their reach), for narrow screens. */
const CAM_W=78;

/** A new brawl opens on the whole room and moves in. */
function resetCamera(){ state.cam={x:72,y:89,at:0.93,h:appearanceState.H,kick:0,kickT:0,px:72,py:60}; }

/** A blow lands: punch in around the impact; the strongest blow of the moment wins. @param {number} x @param {number} y @param {number} s */
function camKick(x,y,s){ const C=state.cam; if(C&&s>Math.max(C.kick,C.kickT)){ C.kickT=s; C.px=x; C.py=y; } }

/** One tick of the camera (also during the hitstop: the punch-in grows while the fighters stand frozen). */
function camTick(){
  const C=state.cam; if(!C||isShadowboxing()) return;
  const xa=fighterView(state.FA).x, xb=fighterView(state.FB).x, down=state.FA.down||state.FA.ko?xa:state.FB.down||state.FB.ko?xb:-1;
  const T=down>=0||state.SP.phase==='ko'||state.SP.phase==='end'?CAM_DOWN:isRealtimeFight()?{y:89,at:.87,h:86}:cardState.phase==='reveal'?CAM_REVEAL:CAM_PLAN;
  const tx=down>=0?(xa+xb)/4+down/2:(xa+xb)/2;   // a man on the boards draws the eye
  C.x+=(tx-C.x)*0.08; C.y+=(T.y-C.y)*0.08; C.at+=(T.at-C.at)*0.08; C.h+=(T.h-C.h)*0.08;
  if(C.kickT>0){ C.kick+=(C.kickT-C.kick)*0.6; if(boxingState.hitstop===0&&C.kick>C.kickT*0.9) C.kickT=0; }   // in within three frames, held through the freeze
  else C.kick*=0.9;                                                                                            // then eased back out
}

/** Card brawl: the room behind the fighters sinks back — darker and greyer, lit only round the pair.
 * @param {number} [s] how much of it (1 = full; the painted cell takes less) */
function dimBackdrop(s=1){
  const M=rendererState.FB_MAIN, w=appearanceState.W, h=appearanceState.H, cx=state.cam.x, cy=appearanceState.FLOOR_Y-22;
  for(let y=0;y<h;y++){ const dy=(y-cy)/46;
    for(let x=0;x<w;x++){ const dx=(x-cx)/54, k=1-s*(0.62-0.47*Math.max(0,1-Math.sqrt(dx*dx+dy*dy))), p=y*w+x, c=M[p];
      const r=c&255, g=(c>>8)&255, b=(c>>16)&255, l=(r*77+g*150+b*29)>>8;
      M[p]=(0xff000000|(((b+(l-b)*0.45*s)*k)<<16)|(((g+(l-g)*0.45*s)*k)<<8)|((r+(l-r)*0.45*s)*k))>>>0; } }
}

/* ---------- the brawl: the card engine decides (card-fight.js), these functions act it out; Cień uses the same scene ---------- */

/** How fast a fighter's move plays: tree speed, bare fists, tiredness and stun (Cień: the training tempo). @param {any} F @param {number} id */
export function sparMoveSpeed(F,id){
  const punch=id>=0&&id<=3, reaction=(id>=animationState.S_HITJ&&id<=animationState.S_BLOCKHIT)||id===animationState.S_STAGGER||id===animationState.S_GETUP;
  const base=punch?F.spd:reaction?(F.spdBack??F.spd):(F.spdFoot??F.spd), quick=isBareknuckle()&&(punch||reaction)?1.15:1, stamina=Math.max(0,Math.min(1,staF(F)));   /* never below 0: a stalled move would hang the reveal */
  return base*quick*(punch&&isCardFight()?1.25:1)*(punch?0.45+0.55*stamina:0.8+0.2*stamina)*(F.stun>55?0.85:1)*(isShadowboxing()?state.shadowRate:1);
}

/** Effort in Cień: a slice of every effort wears the ceiling down (the card fight keeps its own stamina). @param {any} F @param {number} x */
export function spendSta(F,x){ F.sta=Math.max(0,F.sta-x); F.staMax=Math.max(F.staCap*0.3,F.staMax-x*F.fat); if(F.sta>F.staMax) F.sta=F.staMax; }
/** @param {any} F @param {number} x */
function gainSta(F,x){ F.sta=Math.min(F.staMax,F.sta+x); }

/** A dash costs effort (Cień). @param {any} F */
export function sparDashCost(F){ if(isShadowboxing()) spendSta(F,2.5); }

/** Raising the guard is not free (Cień). @param {any} F */
export function sparRaiseGuard(F){ if(isShadowboxing()) spendSta(F,1); }

/** Slips and the weave cost effort, and a streak of evades that dodged nothing costs more each time (Cień). @param {any} F @param {number} id */
export function sparEvadeCost(F,id){
  if(!isShadowboxing()) return;
  if(boxingState.tick-F.evLast>state.EV_RESET) F.evChain=0; else if(F.evActive&&!F.evHit) F.evChain++;
  const k=F.evChain, cost=Math.min(22,state.EV_BASE[id===animationState.M_DODGE?2:id-animationState.M_SLIPL]*(1+0.6*k+0.3*k*k));
  spendSta(F,cost); F.evLast=boxingState.tick; F.evActive=true; F.evHit=false;
  if(k>=1) popup(state.T_MINUS+Math.min(19,Math.round(cost)-1),wX(boxingState.headX),boxingState.headY-9,k>=3?appearanceState.C_RED:state.C_HPM,1,26);
}

/** A punch starts (boxing.startMove): it is counted; in Cień it costs effort. @param {number} id */
export function sparOnAttack(id){
  const A=state.ctxF, m=animationState.MOVES[id];
  if(m.special) return;
  if(isShadowboxing()) spendSta(A,state.STA_COST[id]*0.6);
  A.thrown++;
}

/** The apex of a punch: in a card fight the engine's outcome is shown; Cień has nobody to hit. @param {any} m */
export function sparImpact(m){ if(isCardFight()) cardImpact(m); else if(isRealtimeFight())liveImpact(m); }

/** A slip or the weave avoids a punch while it is in its window (draw order, glove contact). @param {any} D @param {number} pid */
function evades(D,pid){
  const s=D.st, t=D.stT; if(pid<0||pid>3) return false;
  if((s===animationState.M_SLIPL||s===animationState.M_SLIPR)&&t>=2&&t<=15) return pid<=1;
  if(s===animationState.M_DODGE&&t>=3&&t<=18) return pid<=2;
  return false;
}

/** Whether a move that holds keeps holding: a raised guard, the boards, the winner's pose, the KO. @param {any} F */
function holdFor(F){
  const s=boxingState.state;
  if(s===animationState.S_BLOCK||s===animationState.S_SHELL) return F.blockT>0;
  if(s===animationState.S_KD) return F.down;
  return s===animationState.S_WIN||s===animationState.S_KO;
}

/** A reaction ordered by the impact starts now. @param {any} F */
function applyHit(F){
  const id=F.pendHit; F.pendHit=-1; boxingState.buffered=-1; if(id!==animationState.S_BLOCKHIT) F.blockT=0;
  const t0=F.hitT0||0; F.hitT0=0; startMove(id,t0);   // a hit reaction starts on its first key: the head is already thrown on the freeze frame
}

/** One fighter's simulation step in its own frame: idle mood, a pending reaction, the animation, sweat and blood. @param {any} F */
function fighterStep(F){
  switchTo(F);
  if(boxingState.flashL>0)boxingState.flashL--; if(boxingState.flashR>0)boxingState.flashR--;
  boxingState.STATS.speed=sparMoveSpeed(F,boxingState.state);
  animationState.idleTired=Math.max(0,Math.min(1,(0.7-staF(F))/0.7)); animationState.idleHurt=Math.max(0,Math.min(1,Math.max(F.stun/80,(0.35-F.hp/F.hpMax)/0.35*0.7)));
  animationState.idleClose=hipDist(F)<25?1:0; animationState.idleSeed=F.mirror?91:7;
  if(F.dripPending){ F.dripPending=false; spawn(boxingState.P_BIT,boxingState.headX+3,boxingState.headY-1,0.1+Math.random()*0.2,0.3,44,Math.random()<0.5?state.C_BLOOD:state.C_BLOOD2); }
  if(F.pendHit>=0) applyHit(F);
  boxingState.buffered=-1;
  stepAnim(F,true);
  if(staF(F)<0.6&&Math.random()<(0.6-staF(F))*0.12) spawn(boxingState.P_SWEAT,boxingState.headX-1+Math.random()*3,boxingState.headY-3+Math.random()*3,(Math.random()-0.6)*0.5,-0.3-Math.random()*0.4,40,appearanceState.C_SWEAT);   // dripping when tired
  if(F.hp<F.hpMax*0.35&&F.dmg>0.4&&!F.ko&&Math.random()<0.01) spawn(boxingState.P_BIT,boxingState.headX+5,boxingState.headY+1,0.15,0,40,state.C_BLOOD);   // nosebleed
}

/** Card wounds: an open cut or a broken nose keeps dripping. */
function cardDrip(){
  for(const F of state.FIG){ const w=F.wounds; if(w&&(w.cuts||w.nose)&&state.SP.phase==='fight'&&!F.down&&(F.dripT=(F.dripT||0)+1)>=Math.max(14,40-10*(w.cuts||0))){ F.dripT=0; F.dripPending=true; } }
}

export /* ---------- main fight tick ---------- */
function sparUpdate(){
  if(isShadowboxing())shadowTick();
  if(state.SP.phase==='fight')state.SP.elapsed++;
  camTick();
  if(boxingState.hitstop>0){ boxingState.hitstop--; return; }                                 // freeze both fighters on impact
  if(isCardFight()) cardTick();
  if(isRealtimeFight())liveTick();
  state.SP.pt++;
  if(state.SP.phase==='intro'){
    if(state.SP.pt===2) popup(state.T_WALCZ,72,30,appearanceState.C_WHITE,2,80);
    if(state.SP.pt>=45){ if(isRealtimeFight())hideFightPlate();state.SP.phase='fight'; state.SP.pt=0; popup(state.T_WALCZ,72,30,appearanceState.C_SPARK,2,40); setInfo(); }
  } else if(state.SP.phase==='ko'){
    if(!state.SP.winPose&&state.SP.pt>=36&&state.SP.winner&&!state.SP.winner.down&&!state.SP.winner.ko){ state.SP.winPose=true; state.SP.winner.pendHit=animationState.S_WIN; }
    if(state.SP.pt>=100) showSparResult();
  }
  if(state.SP.pivot){ pivotTick(); switchTo(state.FA); return; }
  if(isCardFight()) cardDrip();
  if(boxingState.tick&1){ fighterStep(state.FA); fighterStep(state.FB); } else { fighterStep(state.FB); fighterStep(state.FA); }
  for(let i=0;i<2;i++){ const F=state.FIG[i]; if(F.pendHit>=0){ switchTo(F); applyHit(F); stepAnim(F,false); } }   // reactions show on the impact frame
  for(const F of state.FIG){
    const s=F.st;
    F.stun=Math.max(0,F.stun-0.16); if(F.hurt>0)F.hurt--; if(F.blockT>0)F.blockT--; if(boxingState.hitstop===0) bodyStep(F);
    if(isShadowboxing()){ if(s===animationState.IDLE||s===animationState.M_WALKF||s===animationState.M_WALKB) gainSta(F,0.055*F.regen); else if(s===animationState.S_BLOCK) gainSta(F,0.025*F.regen); }   // Cień breathes
    if(state.SP.phase==='fight') F.minSta=Math.min(F.minSta??1,staF(F));
    if(F.hpShow>F.hp) F.hpShow=Math.max(F.hp,F.hpShow-0.25);
    if(F.staShow>F.sta) F.staShow=Math.max(F.sta,F.staShow-0.4); else F.staShow=F.sta;
  }
  if(isRealtimeFight())liveHUD();
  updateParticles();
  switchTo(state.FA);
}

/** The rival of the current fight (cell, yard and bath, the meal). @param {number} [i] */
export function oppDef(i){ return (state.sparVenue==='cell'?state.CELL_OPP:state.sparVenue==='canteen'?state.CANTEEN_OPP:state.YARD_OPP)[i===undefined?state.sparOpp:i]; }

/** Start a brawl in Newgate (bare fists, real time unless `cards`) or Cień; a rematch keeps the venue, the engine and the return station.
 * @param {number} idx @param {string} [venue] @param {any} [station] @param {boolean} [shadow] @param {boolean} [cards] the turn-based skill engine */
export function startSpar(idx,venue,station,shadow=false,cards=false){
  const selected=venue??(boxingState.gstate==='hub'?(gymState.hubRoom==='yard'?'yard':'cell'):state.sparVenue), save=progressionState.save;
  initAudio(); inputState.overEl.hidden=true;
  if(boxingState.gstate==='pushup') puReset(); if(boxingState.gstate==='spar') sparExit();
  clearParticles();
  clearHeldInput(); state.FA.mirror=false; state.FB.mirror=true;
  state.shadow=shadow; state.shadowRate=1; state.rigKO=false;
  state.sparVenue=selected; state.bareknuckle=true; state.cards=!shadow&&cards;state.live=!shadow&&!cards;
  if(station) state.cellFightSt=station;
  state.sparOpp=idx; const O=oppDef(idx);
  boxingState.mode=boxingState.M_SPAR; boxingState.gstate='spar'; setFlow(false); boxingState.combo=0; animationState.walkHeld=-1; boxingState.hitstop=0; boxingState.shakeT=0;
  resetClock(60000/100,boxingState.simNow);
  if(!state.sparLkSave) state.sparLkSave=appearanceState.lk;
  snapFighterLook(state.FA,save.eq,save.look);
  snapFighterLook(state.FB,Object.assign({},save.eq,O.eq),O.look);
  if(selected==='laznia'){ const T=towelColors(); towelPal(state.FA,T.towel,T.slip); towelPal(state.FB,T.towel2,T.slip); resetBathScene(); }
  else { prisonPal(state.FA); prisonPal(state.FB); }
  resetNewgateFight();   /* the yard rival's hood goes back on */
  applyGear(save.eq); applyLook(save.look);
  const st=save.stats, bonus=applyFighterStats(state.FA,{str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl});
  Object.assign(state.FA,{name:'TY',title:'Ty',manual:true,hpMax:100+bonus});
  applyFighterStats(state.FB,oppLevels(O));
  Object.assign(state.FB,{name:O.name,title:O.title,manual:true,hpMax:O.hp});
  if(shadow){ state.FA.regen=4; state.FB.name='CIEŃ'; }
  for(const F of state.FIG){ Object.assign(F,{evChain:0,evLast:-999,evActive:false,evHit:false,staShow:F.staCap,hp:F.hpMax,hpShow:F.hpMax,sta:F.staCap,staMax:F.staCap,stun:0,dmg:0,blood:[],down:false,ko:false,kdN:0,hurt:0,thrown:0,landed:0,power:0,evades:0,blocks:0,counters:0,body:0,minSta:1,perfects:0,wounds:null,faceL:-999,headY:-99,hipY:-99}); }
  resetFighter(state.FA); resetFighter(state.FB); state.ctxF=state.FB; switchTo(state.FA);
  Object.assign(state.SP,{phase:'intro',t:0,elapsed:0,pt:0,winner:null,how:'',winPose:false,pivot:null,pivotCD:0,trial:null}); buildRing(selected); resetCamera();
  if(state.live){
    Object.assign(state.SP,{liveTime:0,guardHeld:false,notice:'',noticeUntil:0});
    const wounds=lastingSpec(save.injuries);
    for(const F of state.FIG){
      const cap=F.staCap-(F===state.FA?tiredness()*4+(wounds.nose?5:0)+wounds.ribs*5:0);
      F.rt=createCombatant({hpMax:F.hpMax,staCap:Math.max(25,cap),pow:F.pow,regen:F.regen,hunger:F===state.FA?hungerLevel():0});
      Object.assign(F,{staCap:F.rt.staCap,rtAiAt:.6,rtGuardUntil:0,rtSeen:-1,rtTellUntil:0,rtPunchAt:-1,rtLow:false});
      if(F===state.FA)F.wounds={...wounds};liveVitals(F);
    }
    for(let pass=0;pass<2;pass++)for(const F of state.FIG)placePivotFighter(F,4,animationState.IDLE);
    switchTo(state.FA);liveHUD();
  }
  if(shadow) state.SP.phase='fight'; else showFightPlate(selected,O.title);
  document.body.classList.remove('pushup'); document.body.classList.add('spar');document.body.classList.toggle('realtimefight',state.live);
  if(state.cards){ const perks=playerFightPerks(), key=selected+':'+idx;
    cardStart(O,oppLevels(O),state.timeLimit?12:0,{perks,read:perks.includes('pamiec')&&fightsWith(key)>0?1:0,rigged:!!state.rigged,key}); }   // Pamięć spacerniaka: a known rival reads easier
  setPanelMode(); setInfo();
}

/** The result card of a brawl: XP, the fight record, the prison's verdict (respect, the turnkey, the list), the wounds. */
function showSparResult(){
  hideFightPlate();
  state.SP.phase='end';
  const win=state.SP.winner===state.FA, draw=!state.SP.winner, ko=state.SP.how!=='CZAS', O=oppDef(), FA=state.FA, FB=state.FB, save=progressionState.save;
  resetSessXP();
  { const st=save.stats, key='fight:'+state.sparVenue+':'+state.sparOpp, today=doneToday(key);
    const xp=fightXP({bare:true,stars:oppStars(O),outcome:win?(ko?'ko':'win'):(draw?'draw':'loss'),simulated:false,today,
      levelGap:(st.str.lvl+st.spd.lvl+st.end.lvl)/3-O.rank,landed:FA.landed,power:FA.power,knockdowns:FB.kdN,
      evades:FA.evades,counters:FA.counters,minutes:state.SP.elapsed/3600,blocks:FA.blocks,endSta:staF(FA),perfects:FA.perfects||0});
    for(const k of /** @type {('str'|'spd'|'end')[]} */ (['str','spd','end'])) if(xp[k]>0) addXP(k,xp[k]);
    save.train.count[key]=today+1; state.SP.xpToday=today;
    const trial=takeFightTrial(state.sparOpp,state.sparVenue,oppStars(O));   // Profesor's trial on the yard
    state.SP.trial=trial?{name:trial.def.name,task:trial.def.task,passed:trial.def.ok({win,ko,evades:FA.evades,minSta:FA.minSta})}:null;
    if(state.SP.trial?.passed){ const [k,l]=trial.id.split(':'); passTrial(k,+l); } }
  countFight(state.sparVenue+':'+state.sparOpp); recordFight({win,draw,ko,bare:true,opp:O.title,venue:state.sparVenue,how:state.SP.how||''});
  const prisonRows=prisonFightEnd({win,draw,ko,rival:String(O.name).toLowerCase(),stars:oppStars(O),sec:Math.floor(state.SP.elapsed/60),venue:state.sparVenue,opp:state.sparOpp,rigged:state.SP.how==='KASTET',
    stats:{thrown:FA.thrown,landed:FA.landed,taken:FB.landed,minSta:FA.minSta,body:FA.body||0,evades:FA.evades,counters:FA.counters,blocks:FA.blocks,cuts:FA.wounds?.cuts||0,kdTaken:FA.kdN,cards:isCardFight()}});
  persist();
  inputState.overTitle.textContent=(win?'WYGRANA':(draw?'REMIS':'PRZEGRANA'))+' — '+state.SP.how+' · bareknuckle';
  const acc=(/** @type {any} */ F)=>F.thrown?Math.round(100*F.landed/F.thrown)+'%':'—';
  inputState.overStats.innerHTML='<span>Rywal</span><span>'+O.title+'</span>'+
    (state.SP.how==='KASTET'?'<span>Oszustwo</span><span><b style="color:#ff6a5a">kastet z łyżki w rękawie — wszyscy widzieli</b></span>':'')+
    '<span>Czas bójki</span><span>'+Math.floor(state.SP.elapsed/60)+' s</span>'+
    '<span>Trafione / rzucone</span><span>'+FA.landed+'/'+FA.thrown+' ('+acc(FA)+') · rywal '+FB.landed+'/'+FB.thrown+' ('+acc(FB)+')</span>'+
    '<span>Mocne ciosy</span><span>'+FA.power+' · rywal '+FB.power+'</span>'+
    '<span>Nokdauny</span><span>'+FB.kdN+' · rywal '+FA.kdN+'</span>'+
    '<span>Uniki / bloki</span><span>'+FA.evades+' / '+FA.blocks+' · rywal '+FB.evades+' / '+FB.blocks+'</span>'+
    prisonRows+
    (state.SP.trial?'<span>Próba Profesora</span><span><b class="grade grade-'+(state.SP.trial.passed?'A':'D')+'">'+(state.SP.trial.passed?'ZDANA':'NIEZDANA')+'</b> · '+state.SP.trial.task+'</span>':'')+
    (isCardFight()?cardResultRows():'')+
    '<span>Czyste momenty</span><span>'+(FA.perfects||0)+' · +'+Math.min(30,3*(FA.perfects||0))+'% XP</span>'+
    '<span>Doświadczenie</span><span>'+sessXPText()+' → '+statShort()+(state.SP.xpToday?' · '+(state.SP.xpToday+1)+'. walka z tym rywalem dziś':'')+'</span>';
  inputState.againFn=()=>startSpar(state.sparOpp,undefined,undefined,false,state.cards);
  hideRealtimeHud();
  inputState.overEl.hidden=false; inputState.againBtn.focus();
  setInfo();
}

/** The backdrop of the fight scene: the Ward (also a fight at the meal), the yard, the bath. @param {string} venue */
export function buildRing(venue){
  rendererState.fb=state.bgRing;
  if(venue==='yard') yardFightBg(); else if(venue==='laznia') rendererState.fb.set(bathBg()); else if(venue==='cell') cellFightBg(); else wardFightBg();
  rendererState.fb=rendererState.FB_MAIN;
}

export function initialize(){
state.contextSources = {boxing:boxingState,animation:animationState,sparring:state};

/* =====================================================================
   SPARRING — two fighters on one skeleton / renderer
   ---------------------------------------------------------------------
   Every fighter is simulated in its OWN right-facing local frame by exactly the same
   animation code as the bag work: the module-level animation globals (state, cur, joints,
   shorts spring…) are swapped per fighter (switchTo). The opponent is drawn into a spare
   buffer and composited mirrored (x -> W-1-x), so seen from either fighter the other one
   sits at W-1-x: converting a position between the two frames is always x' = W-1-x.
   The card engine (card-fight.js) decides every exchange; the apex frame only shows its
   outcome, and the gloves are clamped on the opponent's silhouette.
   ===================================================================== */
state.RING_MIN = -36;
state.MIN_DIST = 18;
state.START_POS = -10;

state.FB_ALT = new Uint32Array(appearanceState.W*appearanceState.H);
state.FB_PRE = new Uint32Array(appearanceState.W*appearanceState.H);   // the bath: the frame before the fighters (their reflection)
state.bgRing = new Uint32Array(appearanceState.W*appearanceState.H);

state.ctxF = null;
state.oppF = null;
state.mirrorCtx = false;
state.aimLow = 0;
state.nextLow = 0;
state.idleOff = 0;

state.sparVenue = 'cell';   // 'cell' / 'canteen' = the Ward, 'yard', 'laznia' = the bath
state.bareknuckle = false;
state.shadow = false;
state.shadowRate = 1;
state.sparOpp = 0;
state.lyingDraw = false;
state.faceDmg = 0;
state.sparLkSave = null;

state.SP = {phase:'off', elapsed:0, pt:0, winner:null, how:''};

state.FA = mkFighter();
state.FB = mkFighter();
state.FIG = [state.FA,state.FB];

state.FA.opp=state.FB;
 state.FB.opp=state.FA;
 state.FB.mirror=true;
 state.FB.idleOff=0.37;

// fist fights in the Ward: the three cellmates (bare knuckles, the frieze jacket)
state.CELL_OPP = [
  {name:'HARRY',title:'Harry „Stary” Hobbs',style:'counter',hp:95, rank:2,perks:['clinch','shell'],eq:{},
   look:{skin:'s2',hair:'h6',style:'buzz',eyes:'narrow',brows:'thick',nose:'broken',facial:'stubble',extra:'none'}},
  {name:'ZEKE',title:'Zeke „Kosa” Price',style:'out',    hp:100,rank:8,perks:['shove','dirty-work'],eq:{},
   look:{skin:'s1',hair:'h2',style:'short',eyes:'normal',brows:'normal',nose:'straight',facial:'stubble',extra:'scar'}},
  {name:'REUBEN',title:'Reuben „Kruk” Doyle', style:'press',  hp:120,rank:12,perks:['heavy-hands','charged-punch'],eq:{},
   look:{skin:'s3',hair:'h1',style:'buzz',eyes:'narrow',brows:'angry',nose:'broken',facial:'mustache',extra:'none'}},
];

// The seven existing yard inmates keep their visible skin and hair in the fight.
state.YARD_OPP = [
  {name:'JACK',title:'Jack „Młody” Morley',style:'bal',hp:90,rank:3,eq:{},look:{skin:'s1',hair:'h2',style:'short',facial:'none'}},
  {name:'WALTER',title:'Walter „Chudy” Pratt',style:'out',hp:95,rank:6,eq:{},look:{skin:'s2',hair:'h1',style:'buzz',facial:'stubble'}},
  {name:'JOSEPH',title:'Joseph „Siwy” Marsh',style:'counter',hp:100,rank:8,eq:{},look:{skin:'s3',hair:'h6',style:'buzz',facial:'stubble'}},
  {name:'ALBERT',title:'Albert „Ciężki” Rudd',style:'press',hp:115,rank:10,eq:{},look:{skin:'s4',hair:'h3',style:'bald',facial:'beard'}},
  {name:'SILAS',title:'Silas „Cichy” Crane',style:'counter',hp:100,rank:12,eq:{},look:{skin:'s2',hair:'h1',style:'buzz',facial:'none'}},
  {name:'NED',title:'Ned „Dym” Coker',style:'bal',hp:105,rank:14,eq:{},look:{skin:'s1',hair:'h4',style:'short',facial:'stubble'}},
  {name:'DAN',title:'Dan „Głaz” Mullins',style:'press',hp:120,rank:17,eq:{},look:{skin:'s5',hair:'h1',style:'bald',facial:'beard'}},
  // the end of Profesor's list: the yard boss, the only ★★★ in prison (no yard figure; he is called from the yard door)
  {name:'SZEF',title:'Szef spacerniaka',style:'counter',hp:130,rank:20,perks:['dirty-work','shove','counterpuncher','read-tells'],eq:{},look:{skin:'s3',hair:'h1',style:'short',eyes:'narrow',brows:'angry',nose:'broken',facial:'mustache',extra:'scar'}},
];

// Fights at the meal from Profesor's list (#3 Zeke, #9 Dan): in the Ward over the bowls, everybody watching.
state.CANTEEN_OPP = [
  {name:'ZEKE',title:'Zeke „Kosa” Price',style:'out',hp:100,rank:8,perks:['shove','dirty-work'],eq:{},
   look:{skin:'s1',hair:'h2',style:'short',eyes:'normal',brows:'normal',nose:'straight',facial:'stubble',extra:'scar'}},
  {name:'DAN',title:'Dan „Głaz” Mullins',style:'press',hp:120,rank:17,perks:['heavy-hands'],eq:{},look:{skin:'s5',hair:'h1',style:'bald',facial:'beard'}},
  // the one who takes bowls (daily event)
  {name:'BILL',title:'Bill „Gruby” Bellamy',style:'press',hp:110,rank:7,perks:['shove'],eq:{},look:{skin:'s2',hair:'h3',style:'buzz',facial:'stubble'}},
];

state.PRIS_SHOE = ['#141416','#26262a','#3e3e44'];
state.PRIS_SOLE = ['#0c0c0e','#1e1e22','#303036'];

state.cellFightSt = null;
state.WORK_RAMPS = undefined;   // filled in by work.js
//            jab  cross hook upper — the effort of a punch in Cień
state.STA_COST = [1.8,3.5,4.2,4.5];

state.T_IDEAL = 40;
state.T_LVL = 41;
state.T_RUNDA = 26;
state.T_WALCZ = 29;
state.T_NOKDAUN = 30;
state.T_CZAS = 31;
state.T_BLOK = 32;
state.T_UNIK = 33;
state.T_KONTRA = 34;
state.T_KOX = 35;
state.T_TKO = 36;
state.T_WIN = 37;
state.T_LOSE = 38;
state.T_DRAW = 39;

/* Evading costs stamina, and a streak of evades that dodged NOTHING costs more each time
   (punishes spamming slips and hoping). A successful evade or ~1.8 s without evading resets the streak. */
state.EV_BASE = [2,2,2.6];
state.EV_RESET = 110;

state.T_CUT = boxingState.TXT.length;
 boxingState.TXT.push('ROZCIECIE','OSTRZEZENIE','BURZA!','BOMBA!','KLINCZ','ODEPCHNIETY','NA LINY!','Z BYKA!','PAROWANIE','PRZELOT','STREFA','SZAL!','WSTAN!','ZEBRO','ZLAMANY!','SERIA!','WYBUCH!','ODSLONIETY');
 ['T_WARN','T_STORM','T_BOMB','T_CLINCH','T_SHOVE','T_ROPES','T_HEADBUTT','T_PARRY','T_OVER','T_ZONE','T_RAGE','T_RISE','T_RIB','T_BROKEN','T_FLURRY','T_BURST','T_OPEN'].forEach((k,i)=>{ state[k]=state.T_CUT+1+i; });

state.T_KASTET = boxingState.TXT.length; boxingState.TXT.push('KASTET!','PIACH!','KCIUK!','BETON!','CZAS!');
state.T_HOLE = boxingState.TXT.length; boxingState.TXT.push('DZIURA!');
state.T_DMG = boxingState.TXT.length; for(let n=1;n<=30;n++) boxingState.TXT.push('-'+n);   // damage numbers over a struck head
state.T_CARD = boxingState.TXT.length; boxingState.TXT.push('OTWARCIE I','OTWARCIE II','OTWARCIE III','ZWOD!','ODDECH','WYPRZEDZONY','ZAMACH','NADZIANY!','SKURCZ','ZADYSZKA','PRZEBICIE','MROCZKI','POL UNIKU','PUSTO','PODBITE OKO','NOS!','KOSTKA!','WSTRZAS!','NOGI!','OGLUSZONY','KONDYCJA +1','MIJANKA','STREFA','SZAL!');
state.T_TIME = state.T_KASTET+4; state.T_SAND = state.T_KASTET+1; state.T_THUMB = state.T_KASTET+2; state.T_JAW = state.T_KASTET+3;
state.rigged = false;
state.rigKO = false;
state.timeLimit = 0;

state.T_MINUS = boxingState.TXT.length;
 for(let i=1;i<=20;i++) boxingState.TXT.push('-'+i);

state.C_STAIN = rgb('#5a1420');
state.C_STAIN2 = rgb('#74182a');

// Cień: the reference silhouette
state.C_GHOST2 = rgb('#2a6f8a');

state.C_HPM = rgb('#ffd23f');
state.C_BLOOD = rgb('#a50e1c');
state.C_BLOOD2 = rgb('#e02a3a');
state.C_BRUISE = rgb('#6a3a6a');
state.C_BRUISE2 = rgb('#4a2448');
}
