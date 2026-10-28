import { wardWallBg, drawWardWallLive } from './ward-wall.js';
import { saveFighterContext, loadFighterContext } from './fighter-context.js';
import { state as appearanceState, setRamp, applyGear, applyLook, rgb } from './appearance.js';
import { state as boxingState, setVenueLight, clearVenueLight, setupFighterLight, torsoEdge, solve, setFlow, resetClock, commitWalk, startMove, handleEvents, updateShorts, spawn, clearParticles, popup, updateParticles, h2, drawText, drawBoxer, drawParticles, drawPopups } from './boxing.js';
import { state as animationState, isFwd, samplePose, poseSampleTime, computeIdle, isDash } from './animation.js';
import { state as pushupsState, puReset } from './pushups.js';
import { state as npcsState } from './npcs.js';
import { initAudio, sfxWhoosh } from './audio.js';
import { state as progressionState, applyStats } from './progression.js';
import { state as inputState, setInfo, clearHeldInput } from './input.js';
import { setPanelMode } from './navigation.js';
import { state as rendererState, shadowEll } from './renderer.js';
import { state as gymState, shadeC } from './gym.js';
import { fighterStats, opponentLevels, opponentStars } from './stats.js';
import { shadowTick, stopShadowboxing } from './shadowboxing.js';
import { startIsoFight } from './iso-fight.js';

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

/** Whether the current fight uses the prison's bareknuckle rules. */
export function isBareknuckle(){ return state.bareknuckle===true; }

/** Whether this scene is the prison's non-contact technique exercise. */
export function isShadowboxing(){ return state.shadow===true; }

/** Choose the next fight venue through its owner. @param {string} venue */
export function setSparVenue(venue){ state.sparVenue=venue; }

/** Record which brawl is being fought and where to return to afterwards (the isometric fight reads them back). @param {number} idx @param {string} venue @param {any} [station] */
export function setSparFight(idx,venue,station){ state.sparOpp=idx; state.sparVenue=venue; state.bareknuckle=true; state.shadow=false; if(station) state.cellFightSt=station; }

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
export function bareTorsoOut(F=state.ctxF){ return (boxingState.gstate==='spar'&&!isShadowboxing()&&isBareknuckle()&&state.sparVenue!=='laznia'&&!!F&&F===state.FA); }
export function prisonOut(){ return boxingState.gstate==='crank'||boxingState.gstate==='pullup'||boxingState.gstate==='work'||boxingState.gstate==='arm'||(boxingState.gstate==='spar'&&isBareknuckle()&&state.sparVenue!=='laznia')||(boxingState.gstate==='pushup'&&pushupsState.puVenue==='cell'); } function prisonPal(F){                 // this fighter wears the cell drelich: blue shirt + trousers, black shoes
  const keep=appearanceState.PAL.slice(); appearanceState.PAL.set(F.pal);
  setRamp(appearanceState.R_SHIRT,npcsState.CN_TOP,false); setRamp(appearanceState.R_SHIRTF,npcsState.CN_TOP,true); setRamp(appearanceState.R_PANT,npcsState.CN_PANT,false); setRamp(appearanceState.R_PANTF,npcsState.CN_PANT,true);
  setRamp(appearanceState.R_BOOT,state.PRIS_SHOE,false); setRamp(appearanceState.R_BOOTF,state.PRIS_SHOE,true); setRamp(appearanceState.R_BTR,state.PRIS_SOLE,false); setRamp(appearanceState.R_BTRF,state.PRIS_SOLE,true);
  F.pal.set(appearanceState.PAL); appearanceState.PAL.set(keep); F.bt='low';
  if(F===state.FA)for(let j=0;j<3;j++)F.pal[appearanceState.R_PANTF*3+j]=shadeC(F.pal[appearanceState.R_PANT*3+j],0.86);
} /* ---------- setup / teardown ---------- */
function snapFighterLook(F,eq,look){ applyGear(eq); applyLook(look); F.pal.set(appearanceState.PAL); F.tr=appearanceState.trStyle; F.gl=appearanceState.glStyle; F.bt=appearanceState.btStyle; F.look=Object.assign({},appearanceState.lk); } function resetFighter(F){
  state.ctxF=F; state.oppF=F.opp; state.mirrorCtx=F.mirror;                          // fresh context (previous one is being reset too)
  boxingState.state=animationState.IDLE; boxingState.stateT=0; boxingState.frameIdx=-1; boxingState.fired=0; boxingState.idleT=99; boxingState.curGrade=1; boxingState.buffered=-1; boxingState.bufferTick=0; boxingState.bufferedGrade=1; boxingState.moveStep=0; animationState.moveRate=1;
  animationState.posX=state.START_POS; boxingState.flashL=0; boxingState.flashR=0; animationState.cur.set(animationState.GUARD); animationState.fromPose.set(animationState.GUARD); animationState.lastPose.set(animationState.GUARD);
  boxingState.trX=0; boxingState.trY=0; boxingState.trVX=0; boxingState.trVY=0; boxingState.torsoLagX=0; boxingState.torsoLagVX=0; boxingState.rdOn=0; boxingState.rdLying=false; state.aimLow=0; state.nextLow=0; state.idleOff=F.idleOff;
  F.effPos=state.START_POS; F.pendHit=-1; F.blockT=0; F.down=false; F.hurt=0; F.stun=0; F.kx=F.kv=F.ky=F.shk=F.hitT0=0;
  boxingState.STATS.speed=F.spd; solve(); boxingState.prevHX=appearanceState.BASE_X+animationState.posX+animationState.cur[animationState.BX]; boxingState.prevHY=appearanceState.HIP_Y0+animationState.cur[animationState.BY]; derive(F); saveCtx(F);
}

export function sparExit(){
  if(isShadowboxing())stopShadowboxing();
  state.shadow=false;state.shadowRate=1;
  if(state.ctxF){ switchTo(state.FA); state.ctxF=null; } boxingState.trl=boxingState.trailMain;
  clearVenueLight(); state.oppF=null; state.mirrorCtx=false; state.aimLow=0; state.nextLow=0; state.idleOff=0; animationState.idleTired=0; animationState.idleHurt=0; animationState.idleClose=0; animationState.idleSeed=7; state.faceDmg=0; state.lyingDraw=false;
  rendererState.fb=rendererState.FB_MAIN; if(state.sparLkSave) appearanceState.lk=state.sparLkSave; if(state.WORK_RAMPS) appearanceState.PAL.set(state.WORK_RAMPS,appearanceState.R_SHIRT*3); applyGear(progressionState.save.eq); applyLook(progressionState.save.look);
  applyStats();
  animationState.posX=0; boxingState.state=animationState.IDLE; boxingState.buffered=-1; animationState.cur.set(animationState.GUARD); animationState.lastPose.set(animationState.cur); boxingState.idleT=0; boxingState.hitstop=0; boxingState.shakeT=0;
  state.SP.phase='off'; state.SP.pivot=null;
  document.body.classList.remove('spar'); inputState.overEl.hidden=true; { const fp=document.getElementById('fightPlate'); if(fp) fp.hidden=true; }
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
      samplePose(m,poseSampleTime(m,boxingState.stateT,ev),animationState.cur);
      if(adv&&!(m.hold&&boxingState.stateT>=m.hold&&holdFor(F))){
        // Dynamiczna prędkość ciosu: szybki wystrzał do apexu, lekki docisk w celu i zrywny powrót do gardy
        const isPunch=m.id>=0&&m.id<=3&&m.apex>0;
        const tApex=isPunch?m.times[m.apex]:0;
        const punchMod=isPunch?(boxingState.stateT<tApex?1.18:(boxingState.stateT<tApex+2?0.85:1.25)):1;
        boxingState.stateT+=sparMoveSpeed(F,boxingState.state)*punchMod;
        if(m.hold&&boxingState.stateT>m.hold&&holdFor(F)) boxingState.stateT=m.hold;
      }
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
  const A=state.FA,B=state.FB,cost=6;
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
  appearanceState.PAL.set(F.pal); appearanceState.trStyle=F.tr; appearanceState.glStyle=F.gl; appearanceState.btStyle=F.bt; appearanceState.lk=F.look; state.faceDmg=F.dmg; state.lyingDraw=boxingState.rdOn?boxingState.rdLying:boxingState.state===animationState.S_KO&&boxingState.stateT>14;
  const view=fighterView(F);
  setupFighterLight(view.x,view.mirror);
  rendererState.fb=state.FB_ALT; state.FB_ALT.fill(0); drawBoxer(); rendererState.fb=rendererState.FB_MAIN;
  composite(view.mirror,false,view.dx,view.dy,view.scaleX,isShadowboxing()&&F===state.FB);
}

/** Present the boxer training in the Ward. */
export function renderSpar(){
  rendererState.fb=rendererState.FB_MAIN; rendererState.fb.set(state.bgRing);
  drawWardWallLive(0,0,0);
  const view=fighterView(state.FA);
  shadowEll(view.x,appearanceState.FLOOR_Y+view.dy-Math.round(state.FA.ky||0),Math.round((state.FA.stW*0.5+6)*view.scaleX),1);
  drawParticles(true);
  drawFighter(state.FA);
  drawParticles(false);
  if(state.SP.pivot)drawText('PIVOT',72,30,appearanceState.C_SWEAT,1);
  drawPopups();
  switchTo(state.FA);
}

/* ---------- Cień: the training tempo and effort ---------- */

/** How fast a fighter's move plays: tree speed, bare fists, tiredness and stun (Cień: the training tempo). @param {any} F @param {number} id */
export function sparMoveSpeed(F,id){
  const punch=id>=0&&id<=3, reaction=(id>=animationState.S_HITJ&&id<=animationState.S_BLOCKHIT)||id===animationState.S_STAGGER||id===animationState.S_GETUP;
  const base=punch?F.spd:reaction?(F.spdBack??F.spd):(F.spdFoot??F.spd), quick=isBareknuckle()&&(punch||reaction)?1.15:1, stamina=Math.max(0,Math.min(1,staF(F)));   /* never below 0: a stalled move would hang the reveal */
  return base*quick*(punch?0.45+0.55*stamina:0.8+0.2*stamina)*(F.stun>55?0.85:1)*(isShadowboxing()?state.shadowRate:1);
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
  if(F.pendHit>=0) applyHit(F);
  boxingState.buffered=-1;
  stepAnim(F,true);
  if(staF(F)<0.6&&Math.random()<(0.6-staF(F))*0.12) spawn(boxingState.P_SWEAT,boxingState.headX-1+Math.random()*3,boxingState.headY-3+Math.random()*3,(Math.random()-0.6)*0.5,-0.3-Math.random()*0.4,40,appearanceState.C_SWEAT);   // dripping when tired
}

/** One tick of Cień: the pair of animated fighters (the silhouette idles), effort and breath. */
export function sparUpdate(){
  if(isShadowboxing())shadowTick();
  if(state.SP.phase==='fight')state.SP.elapsed++;
  if(boxingState.hitstop>0){ boxingState.hitstop--; return; }
  state.SP.pt++;
  if(state.SP.pivot){ pivotTick(); switchTo(state.FA); return; }
  if(boxingState.tick&1){ fighterStep(state.FA); fighterStep(state.FB); } else { fighterStep(state.FB); fighterStep(state.FA); }
  for(let i=0;i<2;i++){ const F=state.FIG[i]; if(F.pendHit>=0){ switchTo(F); applyHit(F); stepAnim(F,false); } }
  for(const F of state.FIG){
    const s=F.st;
    F.stun=Math.max(0,F.stun-0.16); if(F.hurt>0)F.hurt--; if(F.blockT>0)F.blockT--;
    if(isShadowboxing()){ if(s===animationState.IDLE||s===animationState.M_WALKF||s===animationState.M_WALKB) gainSta(F,0.055*F.regen); else if(s===animationState.S_BLOCK) gainSta(F,0.025*F.regen); }   // Cień breathes
    if(F.hpShow>F.hp) F.hpShow=Math.max(F.hp,F.hpShow-0.25);
    if(F.staShow>F.sta) F.staShow=Math.max(F.sta,F.staShow-0.4); else F.staShow=F.sta;
  }
  updateParticles();
  switchTo(state.FA);
}

/** The rival of the current fight (cell, yard and bath, the meal). @param {number} [i] */
export function oppDef(i){ return (state.sparVenue==='cell'?state.CELL_OPP:state.sparVenue==='canteen'?state.CANTEEN_OPP:state.YARD_OPP)[i===undefined?state.sparOpp:i]; }

/** Start a brawl (the isometric fight scene, iso-fight.js) or Cień (this module's side-on training scene); a rematch keeps the venue and the return station.
 * @param {number} idx @param {string} [venue] @param {any} [station] @param {boolean} [shadow] */
export function startSpar(idx,venue,station,shadow=false){
  if(!shadow){ startIsoFight(idx,venue,station); return; }
  const selected='cell', save=progressionState.save;
  initAudio(); inputState.overEl.hidden=true;
  if(boxingState.gstate==='pushup') puReset(); if(boxingState.gstate==='spar') sparExit();
  clearParticles();
  clearHeldInput(); state.FA.mirror=false; state.FB.mirror=true;
  state.shadow=true; state.shadowRate=1;
  state.sparVenue=selected; state.bareknuckle=true;
  if(station) state.cellFightSt=station;
  state.sparOpp=idx; const O=oppDef(idx);
  boxingState.mode=boxingState.M_SPAR; boxingState.gstate='spar'; setFlow(false); boxingState.combo=0; animationState.walkHeld=-1; boxingState.hitstop=0; boxingState.shakeT=0;
  resetClock(60000/100,boxingState.simNow);
  if(!state.sparLkSave) state.sparLkSave=appearanceState.lk;
  snapFighterLook(state.FA,save.eq,save.look);
  snapFighterLook(state.FB,Object.assign({},save.eq,O.eq),O.look);
  prisonPal(state.FA); prisonPal(state.FB);
  applyGear(save.eq); applyLook(save.look);
  const st=save.stats, bonus=applyFighterStats(state.FA,{str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl});
  Object.assign(state.FA,{name:'TY',title:'Ty',manual:true,hpMax:100+bonus});
  applyFighterStats(state.FB,oppLevels(O));
  Object.assign(state.FB,{name:O.name,title:O.title,manual:true,hpMax:O.hp});
  state.FA.regen=4; state.FB.name='CIEŃ';
  for(const F of state.FIG){ Object.assign(F,{evChain:0,evLast:-999,evActive:false,evHit:false,staShow:F.staCap,hp:F.hpMax,hpShow:F.hpMax,sta:F.staCap,staMax:F.staCap,stun:0,dmg:0,blood:[],down:false,ko:false,kdN:0,hurt:0,thrown:0,landed:0,power:0,evades:0,blocks:0,counters:0,body:0,minSta:1,perfects:0,wounds:null,faceL:-999,headY:-99,hipY:-99}); }
  resetFighter(state.FA); resetFighter(state.FB); state.ctxF=state.FB; switchTo(state.FA);
  Object.assign(state.SP,{phase:'fight',t:0,elapsed:0,pt:0,winner:null,how:'',pivot:null,pivotCD:0}); buildRing(selected);
  document.body.classList.remove('pushup'); document.body.classList.add('spar');
  setPanelMode(); setInfo();
}

/** The backdrop of Cień: the painted Ward cell. @param {string} _venue */
export function buildRing(_venue){
  rendererState.fb=state.bgRing; wardWallBg(); rendererState.fb=rendererState.FB_MAIN;
  setVenueLight(102,16,0.52);
}

export function initialize(){
state.contextSources = {boxing:boxingState,animation:animationState,sparring:state};

/* =====================================================================
   CIEŃ — two fighters on one skeleton / renderer
   ---------------------------------------------------------------------
   Every fighter is simulated in its OWN right-facing local frame by exactly the same
   animation code as the bag work: the module-level animation globals (state, cur, joints,
   shorts spring…) are swapped per fighter (switchTo). The opponent is drawn into a spare
   buffer and composited mirrored (x -> W-1-x), so seen from either fighter the other one
   sits at W-1-x: converting a position between the two frames is always x' = W-1-x.
   Only Cień (shadowboxing) is fought here, against the reference silhouette; the brawls of the prison are played
   in the isometric rooms (iso-fight.js), which share the opponents' tables and the fight record below.
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

state.CELL_OPP.push(state.YARD_OPP[0],state.YARD_OPP[1]);

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
