import { renderThamesPort, withThamesCamera, portFightOutfit, thamesBlocked, startPortAfterFight } from './thames-port.js';
import { renderPub, withPubCamera, pubBlocked, PUB_RIVAL, followPubFight, preparePub } from './pub.js';
import { PORT_BRAWL } from './port-story.js';
import { DASH, dashTravel, dashPose, dashDirection } from './combat-dash.js';
import { BULL, createBullState, registerBullMiss, advanceBull, bullTiming } from './heavy-bruiser.js';
/* Isometric fight: the prison's brawl, played in the isometric hub rooms (the Ward, the yard, the bath) with free movement in
   eight directions. The punches, guard, slip, stamina and damage are the rules of realtime-rules.js; the opponents, their
   styles, the knockdowns, the wounds and the result card are the fight's old ones. The people are the 3D-skeleton figures of
   the hub rooms (figureHD) posed for a stance, a punch and a slip. */

import { state as boxingState, popup, drawText } from './boxing.js';
import { renderSandyArena, drawSandyFootDust } from './hd-fight-scene.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as gymState, figureHD, hubBlocked, hubBounds, hubRebake, hubTransReset, heroFigureLook, isoX, isoY, renderHub, setFightSpectators, bodyPt } from './gym.js';
import { state as rendererState, zoomBlit, screenToView, setFramebuffer, isometricFrame, line, pset } from './renderer.js';
import { mix } from './cast.js';
import {BODY_HIT_SECONDS, bodyHitMotion} from './body-reaction.js';
import {ARM_UPPER, ARM_FORE, solveLimb, strikeArmTargets, elbowAngle} from './combat-anatomy.js';
import {ragdollLengths, stepRagdoll, ragdollJointsIn} from './ragdoll.js';
import {RIG, buildSpine, headSocket, shoulderSocket, supportPelvis, legAnchors, fixBoneLength, refitFigure} from './fighter-rig.js';
import { mocapPunch } from './mocap-punches.js';
import { mocapStep, stepTravel } from './mocap-steps.js';
import { mocapIdle, mocapGetUp } from './mocap-stance.js';
import { state as npcsState, cnLookHD } from './npcs.js';
import { state as sparringState, oppDef, oppLevels, oppStars, setSparFight, setRigged, setFightLimit } from './sparring.js';
import { setRoomRaw } from './rooms.js';
import { state as inputState, setInfo } from './input.js';
import { exitToHub } from './navigation.js';
import { initAudio, sfxPunch, sfxWhoosh, sfxBlock, sfxKO, sfxBell, sfxCrack, sfxLand, sfxPerfectEvade, sfxTell } from './audio.js';
import { createCombatant, tickCombatant, punchCost, beginPunch, whiffPunch, setGuard, beginSlip, evadeCost, classifyEvade, resolveNearMiss, resolvePunch, secondWind, TUNING, ZONES, PUNCH_DAMAGE } from './realtime-rules.js';
import { state as progressionState, resetSessXP, addXP, persist, sessXPText, statShort, passTrial, recordFight } from './progression.js';
import { fighterStats } from './stats.js';
import { fightXP } from './training-data.js';
import { PW, PH, hasPainted, portraitInks, portraitPose, paintPortrait } from './fight-portraits.js';
import { doneToday, takeFightTrial } from './training-session.js';
import { prisonFightEnd, countFight, showFightPlate, hideFightPlate } from './prison.js';
import { hungerLevel, tiredness } from './simulation.js';
import { lastingSpec } from './card-data.js';
import { state as comicState, startKnockdownComic, recordKnockdownComicFrame, drawKnockdownComic, knockdownComicOnScreen, startFinisherMontage, finisherMontageLength, drawFinisherMontage } from './knockdown-comic.js';

// Runtime values owned by iso-fight; the fight is reset by startIsoFight().
export const state = {on:false,t:0,uiT:0,slowMo:0,kdSlow:0,scale:1,P:null,O:null,keys:{},tapAt:{u:-9,d:-9,l:-9,r:-9},upAt:{u:-9,d:-9,l:-9,r:-9},eTap:null,eHeld:false,evadeHintShown:false,low:false,guardHeld:false,phase:'off',pt:0,elapsed:0,winner:null,how:'',idx:0,venue:'cell',opp:null,rigKO:false,
  notice:'',noticeUntil:0,pointer:null,showRig:false,clinch:false,clinchAt:0,push:null,spaceAt:-1,freeze:0,slipFlip:1,parts:[],decals:[],cam:{z:2,x:144,y:96,init:true},xpToday:0,trial:null,banner:null,
  tape:/** @type {any[]} */ ([]),fin:/** @type {any} */ (null),windUsed:false,kick:0};

/** Seconds from the start of a punch to contact and to the end of the recovery. */
const PT=[{hit:.10,end:.30},{hit:.15,end:.40},{hit:.19,end:.48},{hit:.19,end:.48}];
/** Keep the shared boxing rules and only stretch this rival's contact/recovery frames. */
const punchT=(F,pid)=>bullTiming(PT[pid],!!F.bull);
/** Farthest hip-to-hip distance (room units) at which each punch lands: the old side-on ranges 33/31/27/26 px scaled to the rooms. */
const RANGE=[1.45,1.40,1.20,1.10];
const LUNGE=[1.2,1.6,1.8,1.4];
/** Seconds of one loop of the mocap fight idle, and how far its fists are dropped below the clip's (a lower, Victorian guard). */
const IDLE_LOOP=3.13, IDLE_DROP=0.9;
/** Fight ticks of getting up from the boards (the mocap clip, about 2.4x its own speed), and how fast it finishes once he punches
 *  or raises his guard (walking keeps it: the steps are his feet finding the stance). */
const RISE_TICKS=90, RISE_HURRY=12;
/** The rear straight's body sequence, from CMU mocap 13_18 (scripts/bvh-to-keys.mjs) mixed halfway with the original
 *  in-sync motion: exponents on the punch progress for [striking, recovery]. Contact (progress 1) keeps the hand-tuned pose.
 *  Striking: weight and hips lead, the shoulders follow, the fist keeps its snap. Recovery: the hips unwind first, the fist
 *  comes back a little later than before. */
const CROSS_PHASE=[{weight:0.6,hip:0.6,shoulder:0.75,arm:1},{weight:1,hip:1.5,shoulder:1,arm:1.5}];
/** Seconds the rival shows each punch (jab, cross, hook, uppercut) before he throws it: a power punch can be read and answered.
 *  TELL_CHAIN: a later punch of his combination or his counter after an evade is shown only briefly. */
const TELL=[.13,.23,.33,.33], TELL_CHAIN=.08;
/** The tell's length for a rival of this rank: ×1.3 at rank 0, down to ×0.85 from rank 20. @param {number} rank */
const tellScale=rank=>Math.max(.85,1.3-.0225*rank);
/** Default hand sides for the rival. */
const HAND=[1,-1,1,-1];
const MIN_SEP=0.8;
const WALK=0.034;
/** A double tap: the window between the first and the second press (real seconds) and how close two keys must be to count as one diagonal. */
const TAP_WINDOW=0.22, TAP_CHORD=0.06;
/** Room units per tick at the peak of the eased evade, by kind. */
const EVADE_SPEED={in:0.050,back:0.053,left:0.029,right:0.029,slip:0.010};

/** The opponents' styles (the old tuning): preferred distance in px of the side-on picture, punch weights, slip habit, combos, body shots, pace. */
const ARCH=/** @type {Record<string,{idealGap:number,minGap:number,weights:number[],slipBias:number,comboChance:number,bodyBias:number,cadence:number[]}>} */ ({
  out:     { idealGap: 28, minGap: 21, weights: [0.55, 0.85, 0.95, 1.0], slipBias: 0.60, comboChance: 0.42, bodyBias: 0.20, cadence: [0.42, 0.45] },
  press:   { idealGap: 19, minGap: 16, weights: [0.15, 0.40, 0.75, 1.0], slipBias: 0.20, comboChance: 0.65, bodyBias: 0.45, cadence: [0.34, 0.38] },
  counter: { idealGap: 24, minGap: 19, weights: [0.30, 0.65, 0.85, 1.0], slipBias: 0.72, comboChance: 0.50, bodyBias: 0.25, cadence: [0.50, 0.55] },
  bal:     { idealGap: 22, minGap: 18, weights: [0.22, 0.52, 0.85, 1.0], slipBias: 0.32, comboChance: 0.42, bodyBias: 0.30, cadence: [0.44, 0.48] },
  tank:    { idealGap: 20, minGap: 16, weights: [0.10, 0.45, 0.75, 1.0], slipBias: 0.10, comboChance: 0.48, bodyBias: 0.38, cadence: [0.48, 0.52] }});

/** How each punch drives the body at contact, in body units and radians: the shoulders' and the hips' turn that brings the punching side
 *  forward, the forward lean, the drop of the hips (negative: the legs drive up), the chest's lean towards the punching side, the head's
 *  move off the line [forward, towards the punching side], the punching shoulder's rise over the chin and the heel's visual pivot.
 *  Reachable fist targets and elbow poles are derived from the live shoulder in combat-anatomy.js. */
const DRIVE=[
  {yaw:0.42,hip:0.12,lean:0.3, drop:0.25,tilt:0,   head:[0.2,0.45], rise:0.55,heel:0},      // jab: a snap from the shoulder, the chin behind it
  {yaw:0.95,hip:0.55,lean:0.7, drop:0.45,tilt:0,   head:[0.7,-0.7], rise:0.55,heel:0.55},     // cross: the rear hip and shoulder turn through, the weight over the front knee
  {yaw:1.05,hip:0.5, lean:0.2, drop:0.25,tilt:-0.4,head:[0.2,-0.3], rise:0.90, heel:0.35},   // hook: the elbow up level with the fist, the whole trunk swings it
  {yaw:0.65,hip:0.45,lean:0.1, drop:-0.3,tilt:0.5, head:[0.1,-0.2], rise:-0.2,heel:0.45}];   // uppercut: sit into the legs, then drive up under the chin
/** Each punch's tell at full load: the shoulders' and the hips' turn taking the punching side back, the lean (negative: the weight
 *  on the back foot), the drop of the hips, the sideways lean towards the punching side, and the punching fist's and elbow's shift from
 *  the guard [forward, outwards, up], in body units. A body shot dips lower still. */
const TELL_POSE=[
  {yaw:0.25,hip:0.1, lean:-0.35,drop:0.45,side:0,   hand:[-1.3,0,-1.4],   pole:[-0.4,0.1,-0.6]},   // jab: the lead hand drops to the chest and draws back
  {yaw:0.8, hip:0.35,lean:-0.95,drop:0.4, side:0,   hand:[-2.1,0.4,0.2],  pole:[-1.2,0.6,0]},      // cross: the rear shoulder and hip turn away, the weight on the back foot
  {yaw:0.75,hip:0.35,lean:-0.4, drop:0.35,side:-0.5,hand:[-1.1,0.8,1.3],  pole:[-0.7,1.2,2.1]},    // hook: the elbow cocked up over the shoulder, the trunk wound the other way
  {yaw:0.35,hip:0.2, lean:0.45, drop:1.3, side:0.3, hand:[-0.6,0.4,-2.4], pole:[-0.5,0.6,-1.0]}];  // uppercut: sat into the knees, the fist dropped to the hip  // uppercut: sat into the knees, the fist dropped to the hip
/** Upper arm and forearm (to the middle of the fist), thigh and shin: the bones keep their length in every pose. */
const ARM_U=ARM_UPPER, ARM_L=ARM_FORE, LEG_U=3.2, LEG_L=3.2;

const lerp3=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number} */ k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
const smooth=(/** @type {number} */ k)=>k*k*(3-2*k);

/** Progress of the striking motion, with acceleration into contact. @param {number} k */
export const punchSnap=(k)=>k*k;

const emptyCounts=()=>({thrown:0,landed:0,power:0,body:0,counters:0,evades:0,blocks:0,perfects:0,minSta:1,run:0,bestRun:0,lastLand:-9,finisher:0});

/** One fighter: the rules' combatant, the pose state, the footwork and the counters of the result card.
 * @param {number} i @param {number} j @param {number} fi @param {number} fj @param {any} look @param {(fn:()=>void)=>void} wrap
 * @param {{hpMax:number,staCap:number,pow:number,regen:number,hunger?:number}} rules @param {{stunDealt:number,stunTaken:number}} S @param {number} [leadSide] */
function makeFighter(i,j,fi,fj,look,wrap,rules,S,leadSide=1){
  const F={i,j,fi,fj,leadSide,lastHand:0,evadeHookHand:0,dash:null,dashReadyAt:0,lastMove:[fi,fj],moving:false,mf:0,ms:0,rt:createCombatant(rules),pk:null,buf:null,slipSince:-9,slipDir:1,evKind:/** @type {'slip'|'in'|'back'|'left'|'right'} */ ('slip'),evDi:0,evDj:0,evFwd:0,evSide:0,hurtT:0,hurtDuration:.3,hurtDir:0,hurtLow:false,hurtPower:1,hurtBlocked:false,hurtSide:0,stagger:0,stun:0,dmg:0,faceDamage:0,
    grab:null,grabExempt:null,ko:false,down:false,downAt:0,kdN:0,kdMash:0,kdLast:0,gUp:0,look,lagF:0,lagVF:0,lagS:0,lagVS:0,hLagF:0,hLagS:0,pvf:0,pvs:0,rd:/** @type {any} */ (null),rise:/** @type {any} */ (null),seed:Math.random()*6,tire:0,tiredAt:0,aiAt:1,vib:0,vibI:0,vibJ:0,slide:/** @type {any} */ (null),tell:/** @type {any} */ (null),combo:[],comboAt:0,seen:0,strafe:1,strafeUntil:0,guardUntil:0,lowAim:false,
    stunDealt:S.stunDealt,stunTaken:S.stunTaken,c:emptyCounts(),wounds:/** @type {any} */ ({cuts:0,ribs:0}),cutAt:/** @type {number[]} */ ([]),bleed:false,hist:/** @type {any[]} */ ([]),draw:()=>{}};
  F.ft={1:{},'-1':{}}; F.li=i; F.lj=j; for(const s of [1,-1]) Object.assign(F.ft[s],stance(F,s),{sw:0,from:null,to:null});
  F.wrap=wrap; F.draw=()=>F.wrap(()=>drawFighter(F));
  return F;
}

/** Where the two stand: on the floor of the room, facing each other along the screen's horizontal, as in the side view.
 * @param {string} room @returns {[number[],number[]]} */
function fightBlocked(i,j){ return state.venue==='sandy'?Math.hypot(i-5.55,j-5.15)>3.6:state.venue==='port'?thamesBlocked(i,j):state.venue==='pub'?pubBlocked(i,j):hubBlocked(i,j); }
function startSpots(room){
  const [w,h]=hubBounds(), pref=room==='cell'?[5.55,5.15]:[w/2,h/2], d=[0.7071,-0.7071], half=0.78;
  for(let r=0;r<6;r+=0.4) for(let a=0;a<(r?16:1);a++){
    const ang=a/16*6.283, cx=pref[0]+Math.cos(ang)*r, cy=pref[1]+Math.sin(ang)*r, p=[cx-d[0]*half,cy-d[1]*half], o=[cx+d[0]*half,cy+d[1]*half];
    if(!hubBlocked(p[0],p[1])&&!hubBlocked(o[0],o[1])&&!hubBlocked(cx,cy)) return [p,o];
  }
  return [[pref[0]-d[0]*half,pref[1]-d[1]*half],[pref[0]+d[0]*half,pref[1]+d[1]*half]];
}

/** The hub person who plays the rival: the yard and the bath inmates, the Ward's cellmates, the man from the meal by name. @param {string} venue @param {number} idx @param {any} O */
function foeFigure(venue,idx,O){
  const byName=[...npcsState.CN,...npcsState.YN].find(c=>c&&String(c.name).toUpperCase()===O.name);
  const C=(venue==='yard'||venue==='laznia'?npcsState.YN[idx]:venue==='cell'?npcsState.CN[idx]:byName)||byName||npcsState.CN[1];
  return {...cnLookHD({...C,tub:false,act:undefined}),irons:false};   /* out of the tub, towel on */
}

/** Begin a brawl against rival `idx` of `venue` in that venue's isometric room; `station` is where the hero returns to.
 * @param {number} idx @param {string} [venue] @param {any} [station] */
export function startIsoFight(idx,venue,station){
  const S=state, save=progressionState.save, V=venue??sparringState.sparVenue, sandbox=V==='sandy', room=V==='port'||V==='pub'?'port':V==='yard'||V==='laznia'?V:'cell';
  const returnRoom=sandbox?(S.on&&S.venue==='sandy'?S.returnRoom:gymState.hubRoom):null;
  S.portraits=null;
  initAudio(); inputState.overEl.hidden=true;
  setSparFight(idx,sandbox||V==='pub'?'cell':V,station);
  if(sandbox||V==='pub'){ setRigged(false); setFightLimit(0); } // the preview never inherits Sunday-match cheats or a timer
  if(room!=='port'&&gymState.hubRoom!==room){ setRoomRaw(room); hubRebake(); }
  const O=V==='port'?{...oppDef(idx),name:'PIJANY',title:'Pijany doker'}:oppDef(idx), st=save.stats, PS=fighterStats({str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl}), OS=fighterStats(oppLevels(O));
  const wounds=lastingSpec(save.injuries), cap=PS.staCap-(tiredness()*4+(wounds.nose?5:0)+wounds.ribs*5), hero=heroFigureLook(), [pa,oa]=sandbox?[[4.95,5.75],[6.05,4.55]]:V==='port'?[PORT_BRAWL.hero,PORT_BRAWL.drunk]:V==='pub'?[[11.5,5.5],[PUB_RIVAL.i,PUB_RIVAL.j]]:startSpots(room);
  S.P=makeFighter(pa[0],pa[1],0.7071,-0.7071,hero.look,hero.wrap,{hpMax:100+PS.hpBonus,staCap:3*Math.max(25,cap),pow:PS.pow,regen:PS.regen,hunger:hungerLevel()},PS,-1);
  S.O=makeFighter(oa[0],oa[1],-0.7071,0.7071,V==='port'?{sk:[appearanceState.R_SKIN,appearanceState.R_SKINF],top:[appearanceState.R_HSH,appearanceState.R_HSHF],pt:[appearanceState.R_HPT,appearanceState.R_HPTF],shoe:appearanceState.R_HSLIP,hair:appearanceState.R_HAIR,cap:appearanceState.R_HPT,style:'flatcap',stubble:true,rolledSleeves:true,tuckedShirt:true}:foeFigure(V==='pub'?'cell':V,idx,O),V==='port'?portFightOutfit:fn=>fn(),{hpMax:O.hp,staCap:3*Math.max(25,OS.staCap),pow:OS.pow,regen:OS.regen},OS);
  if(O.heavy){ S.O.bull=createBullState(); S.O.rt.regen*=0.7; S.O.bullClock=0; }
  Object.assign(S.P.wounds,wounds); S.O.aiAt=0.6;
  Object.assign(S,{on:true,t:0,uiT:0,slowMo:0,kdSlow:0,scale:1,keys:{},tapAt:{u:-9,d:-9,l:-9,r:-9},upAt:{u:-9,d:-9,l:-9,r:-9},eTap:null,eHeld:false,low:false,guardHeld:false,phase:'intro',pt:0,elapsed:0,winner:null,how:'',idx,venue:V,opp:O,rigKO:false,banner:null,pointer:null,clinch:false,clinchAt:0,push:null,tape:[],fin:null,windUsed:false,kick:0,spaceAt:-1,parts:[],decals:[],cam:{z:2,x:144,y:96,init:true},freeze:0,
    notice:'Ciosy 1-4 · LPM: korpus · Spacja: blok · Q: slip · F: dash',noticeUntil:3,slipFlip:1,xpToday:0,trial:null,returnRoom});
  if(room==='cell'&&!sandbox){
    const center=[(pa[0]+oa[0])/2,(pa[1]+oa[1])/2], positions=[[-2,-1.2],[-1,-1.8],[0,-2],[1,-1.8],[2,-1.2],[-2.6,0.3],[2.6,0.3]];
    const spectators=[...npcsState.CN,npcsState.STINK].filter(C=>String(C.name).toUpperCase()!==O.name).map((C,k)=>{
      const [di,dj]=positions[k%positions.length], i=center[0]+di, j=center[1]+dj, len=Math.hypot(di,dj);
      return {...C,i,j,fi:-di/len,fj:-dj/len,act:'cheer',after:null,step:{k:'spectator'},moving:false};
    });
    const chair=gymState.cellList.find(it=>it.t==='cwheel');
    if(chair) spectators.push({...npcsState.PROF,i:chair.i+chair.w/2,j:chair.j+chair.h/2-0.05,act:'sit',after:chair,step:{k:'prof'}});
    setFightSpectators(spectators);
  } else setFightSpectators(null);
  gymState.actors=[S.P,S.O]; gymState.preScene=drawDecals; gymState.hubNear=null; hubTransReset();
  boxingState.gstate='isofight';
  document.body.classList.remove('hub','pushup','port'); document.body.classList.add('spar');
  showFightPlate(sandbox?'cell':V,O.title);
  setInfo();
}

/** End the brawl now in favour of side 0 (the hero) or 1 (diagnostics and tests). @param {0|1} side @param {string} [how] */
export function isoFightFinish(side,how='KO'){
  const S=state; if(!S.on) return;
  if(S.phase==='intro'){ hideFightPlate(); S.phase='fight'; }
  if(how==='CZAS'){ timeUp(); return; }
  const W=side===1?S.O:S.P, L=side===1?S.P:S.O; L.rt.hp=0; L.ko=true; L.down=false; L.pk=null; if(!L.rd) startIsoRagdoll(L,W,3,true); endBout(W,how);
}

/** Leave the fight state (the hub entry restores the rest). */
export function stopIsoFight(){ setFightSpectators(null); state.on=false; state.phase='off'; gymState.actors=null; gymState.preScene=null; state.keys={}; state.guardHeld=false; state.low=false; state.clinch=false; state.push=null; hideFightPlate(); }

/** Return to the room where the HD preview was opened. */
export function sandyFightReturnRoom(){ return state.returnRoom||'cell'; }

/** Where the fight left things for the hub: rival, venue, whether the hero won, and the station to return to. */
export function isoFightOutcome(){ const S=state; return {idx:S.idx,venue:S.venue,won:S.phase==='end'&&S.winner===S.P,station:sparringState.cellFightSt}; }

/** Drop held keys on blur, pause or mode change. */
export function isoFightRelease(){ state.keys={}; state.tapAt={u:-9,d:-9,l:-9,r:-9}; state.upAt={u:-9,d:-9,l:-9,r:-9}; state.eTap=null; state.eHeld=false; state.guardHeld=false; state.low=false; state.spaceAt=-1; state.pointer=null; if(state.on&&state.P?.rt.guarding) setGuard(state.P.rt,false,state.t); }

/** A big caption over the middle of the picture (not in the room: it does not zoom with the camera). @param {string} text @param {number} color @param {number} ticks */
function banner(text,color,ticks){ state.banner={text,color,t:ticks}; }

function say(/** @type {string} */ text){ state.notice=text; state.noticeUntil=state.t+1.4; }

const FIGHT_KEYS=new Set(['Digit1','Digit2','Digit3','Digit4','KeyJ','KeyK','KeyL','KeyI','KeyQ','KeyE','KeyF','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS']);

/** Keyboard for the isometric fight. A double tap of a movement key is an evade in that direction. @param {KeyboardEvent} e @param {boolean} down @returns {boolean} */
export function isoFightKey(e,down){
  const c=e.code, S=state;
  if(c==='Escape'){ if(down){ e.preventDefault(); exitToHub(); } return true; }
  if(S.venue==='sandy'&&down&&c==='KeyR'){ e.preventDefault(); startIsoFight(0,'sandy'); return true; }
  if(S.venue==='sandy'&&down&&c==='F7'){ e.preventDefault(); S.showRig=!S.showRig; return true; }
  if(S.venue==='sandy'&&down&&c==='F9'){ e.preventDefault(); const a=document.createElement('a'); a.download='roadwork-sandy-432x288.png'; a.href=rendererState.hd3.off.toDataURL('image/png'); a.click(); return true; }
  if(S.phase==='end'){ if(down&&(c==='Enter'||c==='Space')){ e.preventDefault(); inputState.againFn(); } return true; }
  if(S.phase==='finisher'){ e.preventDefault(); if(down&&!e.repeat) finisherKey(c); return true; }
  const move=/** @type {'u'|'d'|'l'|'r'|undefined} */ ({ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r'}[c]);
  if(move){
    e.preventDefault();
    const wasDown=!!S.keys[move];
    S.keys[move]=down?1:0;
    if(!down&&wasDown) S.upAt[move]=S.uiT;
    else if(down&&!wasDown&&!e.repeat&&S.on&&S.phase==='fight'&&!S.P.down&&!S.P.ko){
      // the first press to the second press within the window, with a release between them: holding a key never arms a dodge
      if(S.uiT-S.tapAt[move]<=TAP_WINDOW&&S.upAt[move]>=S.tapAt[move]){
        const has=(/** @type {'u'|'d'|'l'|'r'} */ k)=>S.keys[k]||Math.abs(S.tapAt[k]-S.tapAt[move])<=TAP_CHORD?1:0;   // a diagonal: the other key of the pair, held or tapped in the same instant
        const dx=has('r')-has('l'), dy=has('d')-has('u');
        S.tapAt={u:-9,d:-9,l:-9,r:-9};
        if(dx||dy){ let di=dx+dy, dj=dy-dx; const l=Math.hypot(di,dj)||1; di/=l; dj/=l; evade(S.P,S.O,di,dj); }
      } else S.tapAt[move]=S.uiT;
    }
  }
  if(down&&S.on&&S.phase==='fight'&&S.P.down&&!S.P.ko&&FIGHT_KEYS.has(c)){ e.preventDefault(); mash(S.P); return true; }   /* on the boards every key is a breath towards the feet */
  if(move) return true;
  if(c==='ShiftLeft'||c==='ShiftRight') return true; // Shift no longer aims at the body.
  if(c==='Space'){
    e.preventDefault();
    if(down){
      if(S.clinch){ clinchPush(); S.spaceAt=-1; return true; }
      S.spaceAt=S.uiT; S.guardHeld=true;
    } else {
      S.guardHeld=false;
      if(S.spaceAt>=0&&S.uiT-S.spaceAt<0.2) startClinch();
      S.spaceAt=-1;
    }
    return true;
  }
  if(S.clinch) return true;
  if(c==='KeyF'){ e.preventDefault(); if(down&&!e.repeat&&S.on&&S.phase==='fight') startDash(S.P); return true; }
  if(c==='KeyE'){
    e.preventDefault();
    if(!down){ S.eHeld=false; return true; }
    if(!S.on||S.phase!=='fight'||S.eHeld||e.repeat) return true;
    S.eHeld=true;
    if(S.eTap&&S.uiT-S.eTap.at<=TAP_WINDOW){
      S.eTap=null; const [di,dj]=toward(S.P,S.O); evade(S.P,S.O,-di,-dj);
    } else if(!busy(S.P)){ const [di,dj]=pointerDirection(); S.eTap={at:S.uiT,di,dj}; }
    return true;
  }
  if(!down||!S.on||S.phase!=='fight') return !!{Digit1:1,Digit2:1,Digit3:1,Digit4:1,KeyQ:1}[c];
  const pid={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Numpad1:0,Numpad2:1,Numpad3:2,Numpad4:3,KeyJ:0,KeyK:1,KeyL:2,KeyI:3}[c];
  if(pid!==undefined){ e.preventDefault(); press(S.P,pid,S.low); return true; }
  if(c==='KeyQ'){ e.preventDefault(); slip(S.P); return true; }
  return false;
}

/** Store the pointer in picture coordinates while the fight is active. @param {PointerEvent} e */
export function isoFightPointer(e){
  if(!state.on||inputState.paused||state.phase!=='fight') return;
  const cv=rendererState.screen, r=cv.getBoundingClientRect(), k=cv.width/(cv.clientWidth||1);
  const [x,y]=screenToView((e.clientX-r.left)*k,(e.clientY-r.top)*k);
  state.pointer=x>=0&&x<144&&y>=0&&y<96?{x,y}:null;
}

/** Stop following the pointer when it leaves the game. */
export function isoFightPointerLeave(){ state.pointer=null; }

/** Left mouse button is a held body-shot modifier only during an active fight. @param {boolean} held */
export function isoFightBodyAim(held){ state.low=!!held&&state.on&&(state.phase==='fight'||state.phase==='finisher')&&!inputState.paused; }

/** Direction from the fighter's feet to the pointer in room coordinates. @returns {[number,number]} */
function pointerDirection(){ return state.venue==='pub'?withPubCamera(pointerDirectionInRoom):state.venue==='port'?withThamesCamera(pointerDirectionInRoom):pointerDirectionInRoom(); }
/** Resolve the pointer using the current room projection. */
function pointerDirectionInRoom(){
  const S=state; if(!S.pointer||!S.P) return [0,0];
  // Input is handled outside withHD(), where ISO_K has already returned to 1.
  // Camera coordinates belong to the active framebuffer (3× in all isometric venues).
  const frame=isometricFrame(S.venue), scale=frame.W/144;
  // The port's camera is already in legacy 2× pixels between render calls.
  const projectionScale=S.venue==='port'||S.venue==='pub'?scale/2:scale;
  const C=S.cam, W=frame.W, H=frame.H, z=S.venue==='pub'?1:(Math.abs(C.z-2.35)<0.03?2.35:C.z)*(1+0.35*Math.max(slowMoEffect(),knockdownZoom()));
  const cx=Math.round(Math.max(W/(2*z),Math.min(W-W/(2*z),C.x))), cy=Math.round(Math.max(H/(2*z),Math.min(H-H/(2*z),C.y)));
  const sx=isoX(S.P.i,S.P.j), sy=isoY(S.P.i,S.P.j,0);
  const dx=S.pointer.x-(W/2+(sx*projectionScale-cx)*z)/scale;
  const dy=S.pointer.y-(H/2+(sy*projectionScale-cy)*z)/scale;
  if(Math.hypot(dx,dy)<4) return [0,0];
  const di=dx+2*dy, dj=2*dy-dx, len=Math.hypot(di,dj); return [di/len,dj/len];
}

/** Seconds a clinch lasts before the two come apart on their own; both get their breath back faster while it holds. */
const CLINCH_MAX=3;
/** Take hold at close range (a tired rival may hang on the player too); a held Space remains the normal guard. @param {boolean} [byRival] */
function startClinch(byRival=false){
  const S=state, P=S.P, O=S.O;
  if(!S.on||S.phase!=='fight'||busy(P)||busy(O)||O.finStun||toward(P,O)[2]>1.25) return false;
  if(P.rt.guarding) setGuard(P.rt,false,S.t);
  if(O.rt.guarding) setGuard(O.rt,false,S.t);
  P.buf=O.buf=null; O.combo=[]; O.tell=null; S.clinch=true; S.clinchAt=S.t; S.guardHeld=false;
  say(byRival?'Rywal cię klinczuje · Spacja: odepchnij':'Klincz · Spacja: odepchnij');
  return true;
}

/** Release the hold and move the opponent in the selected direction, respecting room collisions. */
function clinchPush(){
  const S=state, P=S.P, O=S.O, K=S.keys;
  let di=(K.r||0)-(K.l||0), dj=(K.d||0)-(K.u||0);
  if(di||dj){ const x=di+dj,y=dj-di,l=Math.hypot(x,y); di=x/l; dj=y/l; }
  else [di,dj]=pointerDirection();
  if(!di&&!dj) [di,dj]=toward(P,O);
  S.clinch=false; S.guardHeld=false; O.stagger=0.35; O.aiAt=S.t+0.55;
  S.push={di,dj,left:30};
}

/** Move the pair together and turn the opponent around the player on sideways input. @param {number} di @param {number} dj @param {number} scale */
function moveClinch(di,dj,scale){
  const S=state, P=S.P, O=S.O, [ui,uj,gap]=toward(P,O);
  const forward=di*ui+dj*uj, side=di*-uj+dj*ui, step=WALK*0.55*scale;
  const angle=side*step/Math.max(gap,MIN_SEP), c=Math.cos(angle), sn=Math.sin(angle);
  const pi=P.i+ui*forward*step, pj=P.j+uj*forward*step;
  const oi=pi+(O.i-P.i)*c-(O.j-P.j)*sn, oj=pj+(O.i-P.i)*sn+(O.j-P.j)*c;
  if(!fightBlocked(pi,pj)&&!fightBlocked(oi,oj)){ P.i=pi; P.j=pj; O.i=oi; O.j=oj; P.moving=O.moving=true; P.mf=forward; P.ms=side; O.mf=-forward; O.ms=-side; }
}

/** One tap towards getting up from the boards. @param {any} F */
function mash(F){
  if(state.uiT-F.kdLast<0.09) return;   // the real clock: the knockdown's slow motion does not swallow the taps
  F.kdLast=state.uiT; F.kdMash++;
  if(F.kdMash&1) popup(sparringState.T_RISE,hx(F),hy(F)-12,appearanceState.C_SPARK,1,18);
}

/** Taps the player needs to rise from this knockdown. @param {any} F */
function riseTaps(F){ return 4+F.kdN*3; }

/** After a clean hit the player may throw the next punch once this share of the recovery has passed. */
const CANCEL_FROM=0.4;
/** A landed punch of the player can be cancelled into the next one early; whiffs and blocks keep the full recovery. @param {any} F */
function canCancel(F){
  const pk=F.pk; if(!pk||!pk.landed||F!==state.P) return false;
  const T=punchT(F,pk.pid); return pk.t>=T.hit+(T.end-T.hit)*CANCEL_FROM;
}

/** @param {any} F */
function busy(F){ return F.grab||F.ko||F.down||F.stagger>0||F.pk||F.dash||(state.t-F.slipSince<TUNING.slipActive); }

/** Seconds a punch pressed during a busy moment is remembered. */
const PUNCH_BUFFER=.38;

/** Start a costed punch; a press during a busy moment is kept for PUNCH_BUFFER. @param {any} F @param {number} pid @param {boolean} low @param {string} [special] */
function press(F,pid,low,special){
  const now=state.t;
  if(F.grab||F.ko||F.down||F.stagger>0||state.phase!=='fight') return false;
  if(F.dash&&now-F.dash.at<DASH.duration*DASH.punchFrom){ if(!special) F.buf={pid,low,until:now+DASH.buffer}; return false; }
  const counterEvade=F===state.P&&state.slowMo>0&&now<F.rt.counterUntil;
  if((F.pk&&!canCancel(F))||(!counterEvade&&now-F.slipSince<TUNING.slipActive)){ if(!special) F.buf={pid,low,until:now+PUNCH_BUFFER}; return false; }
  if(F.rt.guarding) setGuard(F.rt,false,now);
  const exhausted=F===state.P&&F.rt.sta<punchCost(F.rt,pid,now);
  if(!beginPunch(F.rt,pid,now,F===state.P)) return false;
  if(F.dash) F.dash.hitChain=true;
  if(counterEvade) F.slipSince=-Infinity;
  const hand=punchHand(F,pid,special);
  if(!special){ F.lastHand=hand; F.evadeHookHand=0; }
  F.pk={pid,low,t:0,hit:false,special,hand,fastCounter:counterEvade,exhausted}; F.lowAim=low; F.buf=null; F.c.thrown++;
  if(F===state.P){ F.hist.push({pid,low,at:now}); if(F.hist.length>4) F.hist.shift(); }
  sfxWhoosh(0.25+0.1*pid);
  return true;
}

/** The hand F throws punch pid with: an evade's hook comes off the evading side, power punches alternate, otherwise the stance decides.
 * @param {any} F @param {number} pid @param {string} [special] */
function punchHand(F,pid,special){
  return pid===2&&!special&&F.evadeHookHand?F.evadeHookHand:pid>=2&&F.lastHand&&!special?-F.lastHand:(F.leadSide===-1?[-1,1,1,1][pid]:HAND[pid]);
}

/** The rival shows the punch he is about to throw (its own pose, a glint of the fist and a breath); ai() throws it when the tell runs out.
 *  A feint is shown but not thrown. A clean hit, a stagger, a clinch or the boards cancel it.
 * @param {any} F @param {number} pid @param {boolean} low @param {boolean} [chain] a follow-up or a counter: a short tell @param {number} [mult] */
function startTell(F,pid,low,chain=false,mult=1){
  const now=state.t, rank=state.opp?.rank||0, sec=(chain?TELL_CHAIN:TELL[pid]*tellScale(rank))*mult;
  const feint=!chain&&pid>=1&&rank>=10&&Math.random()<(rank-8)*0.012;
  if(F.rt.guarding) setGuard(F.rt,false,now);
  F.tell={pid,low,at:now,until:now+(feint?sec*0.7:sec),feint,chain,hand:punchHand(F,pid)};
  if(!chain) sfxTell(pid);
  return true;
}

/** A directional evade (a double tap, or the rival's choice), decided on the axis from F to G: in, back, or a step to the side. @param {any} F @param {any} G @param {number} di @param {number} dj */
function evade(F,G,di,dj){
  const now=state.t;
  if(busy(F)||state.phase!=='fight') return false;
  const [ui,uj]=toward(F,G), info=classifyEvade(di,dj,ui,uj);
  if(!beginSlip(F.rt,now,info.kind)){
    if(F===state.P&&F.rt.sta<evadeCost(F.rt,now)) say('Za mało tchu na unik');
    return false;
  }
  F.slipSince=now; F.evKind=info.kind; F.evDi=info.di; F.evDj=info.dj; F.evFwd=info.fwd; F.evSide=info.side; F.slipDir=info.slipDir;
  F.evadeHookHand=info.kind==='left'||info.kind==='right'?-info.slipDir:0;
  sfxWhoosh(info.kind==='in'||info.kind==='back'?0.46:0.4);
  return true;
}

/** The slip under Q: in place, with a small step aside. @param {any} F @param {number} [dir] */
function slip(F,dir){
  const now=state.t, G=F===state.P?state.O:state.P;
  if(busy(F)||state.phase!=='fight') return false;
  if(!beginSlip(F.rt,now,'slip')){ if(F===state.P&&F.rt.sta<evadeCost(F.rt,now)) say('Za mało tchu na slip'); return false; }
  const [ui,uj]=toward(F,G);
  F.slipSince=now; state.slipFlip=-state.slipFlip; F.slipDir=dir||state.slipFlip;
  F.evKind='slip'; F.evDi=-uj*F.slipDir; F.evDj=ui*F.slipDir; F.evFwd=0; F.evSide=F.slipDir;
  F.evadeHookHand=-F.slipDir;
  sfxWhoosh(0.4);
  return true;
}

/** Unit vector of the opponent from F and the distance. @param {any} F @param {any} G */
function toward(F,G){ const di=G.i-F.i, dj=G.j-F.j, d=Math.hypot(di,dj)||1; return [di/d,dj/d,d]; }

/** Move F by (di,dj)*sp in the room, never into furniture, walls or the other fighter. @param {any} F @param {any} G @param {number} di @param {number} dj @param {number} sp */
/** Swept small steps avoid dashing across thin furniture and the opponent. */
function walk(F,G,di,dj,sp){
  if(F.grab||!Number.isFinite(sp)||sp<=0) return 0;
  const startI=F.i, startJ=F.j, d0=Math.hypot(F.i-G.i,F.j-G.j);
  const ok=(/** @type {number} */ a,/** @type {number} */ b)=>{
    if(fightBlocked(a,b)) return false;
    if(F.dash&&gymState.fightSpectators?.some(c=>c.step?.k==='spectator'&&Math.hypot(c.i-a,c.j-b)<.35)) return false;
    const d=Math.hypot(a-G.i,b-G.j); return d>=MIN_SEP||d>=d0;
  };
  const n=Math.ceil(Math.max(Math.abs(di*sp),Math.abs(dj*sp))/.035), step=sp/Math.max(1,n);
  for(let k=0;k<n;k++){
    const ni=F.i+di*step, nj=F.j+dj*step;
    if(ok(ni,F.j)) F.i=ni;
    if(ok(F.i,nj)) F.j=nj;
  }
  return Math.hypot(F.i-startI,F.j-startJ);
}

/** Short stamina-priced F dash; direction is fixed at the keyboard event, with no invulnerability. */
function startDash(F){
  const S=state, now=S.t;
  if(!S.on||S.phase!=='fight'||S.clinch||busy(F)||now<F.dashReadyAt) return false;
  if(F.rt.sta<DASH.cost){ if(F===S.P) say('Za mało tchu na dash'); return false; }
  const [di,dj]=dashDirection(pointerDirection(),F.lastMove);
  if(!di&&!dj) return false;
  F.rt.sta-=DASH.cost;
  F.rt.regenReadyAt=Math.max(F.rt.regenReadyAt,now+.35);
  F.dashReadyAt=now+DASH.cooldown;
  if(F.rt.guarding) setGuard(F.rt,false,now);
  const ui=F===S.P?S.O:S.P, [ti,tj]=toward(F,ui);
  F.dash={at:now,di,dj,progress:0,hitChain:false,fwd:di*ti+dj*tj,side:di*-tj+dj*ti};
  F.lastMove=[di,dj]; F.buf=null;
  sfxWhoosh(.55);
  return true;
}

/** A standing spectator restrains a fighter who reaches the crowd, until he escapes after two seconds. @param {any} F */
function updateCrowdGrab(F){
  const S=state;
  if(F.grab){
    if(F.down||F.ko||S.t>=F.grab.until){
      Object.assign(F.grab.person,{act:'cheer',grabbing:null,...F.grab.origin}); F.grab=null;
    }
    return;
  }
  if(F.grabExempt&&Math.hypot(F.i-F.grabExempt.i,F.j-F.grabExempt.j)>1.15) F.grabExempt=null;
  if(F.down||F.ko||F.grabExempt||(F===S.P&&S.push)||(F===S.P?S.O.grab:S.P.grab)) return;
  const C=gymState.fightSpectators?.find(c=>c.step?.k==='spectator'&&!c.grabbing&&c!==F.grabExempt&&Math.hypot(F.i-c.i,F.j-c.j)<0.65);
  if(!C) return;
  F.grab={person:C,until:S.t+2,origin:{i:C.i,j:C.j,fi:C.fi,fj:C.fj}}; F.grabExempt=C; C.grabbing=F; C.act='grab';
  C.i=F.i-F.fi*0.6; C.j=F.j-F.fj*0.6; C.fi=F.fi; C.fj=F.fj;
  F.pk=null; F.dash=null; F.buf=null; F.combo=[]; F.tell=null; F.slipSince=-Infinity; F.rt.slipSince=-Infinity;
  if(F.rt.guarding) setGuard(F.rt,false,S.t);
  S.clinch=false; S.push=null;
  if(F===S.P){ S.eTap=null; say('Tłum cię trzyma'); } else say('Tłum trzyma rywala');
}

/** The end of the brawl: a knockout or a stoppage, the time, the knuckle-duster. @param {any} W winner @param {string} how */
function endBout(W,how){
  const S=state; if(S.phase!=='fight'||S.rigKO&&how!=='KASTET') return;
  S.phase='ko'; S.pt=0; S.winner=W; S.how=how; S.P.tell=S.O.tell=null;
  banner(how==='TKO'?'TKO!':how==='KASTET'?'KASTET!':'KO!',appearanceState.C_RED,150); sfxKO();
  setInfo();
}

/** Time is up (the Sunday brawl): the fresher fighter wins, a close one is a draw. */
function timeUp(){
  const S=state, A=S.P, B=S.O, d=A.rt.hp/A.rt.hpMax-B.rt.hp/B.rt.hpMax;
  S.phase='ko'; S.pt=0; S.how='CZAS'; S.winner=Math.abs(d)<0.05?null:(d>0?A:B);
  banner('CZAS!',appearanceState.C_WHITE,120); sfxBell(2); setInfo();
}

/** A special move of the dirty fighters at its apex: the shove, the headbutt, the elbow. @param {any} A @param {any} D */
function special(A,D){
  const S=state, kind=A.pk.special, gap=toward(A,D)[2];
  if(D.ko||D.down||gap>1.1) return;
  const [ui,uj]=toward(A,D), px=hx(D), py=hy(D);
  if(kind==='shove'){ walk(D,A,ui,uj,.5); D.rt.sta=Math.max(0,D.rt.sta-6); D.stagger=.35; popup(sparringState.T_SHOVE,px,py-12,appearanceState.C_WHITE,1,28); sfxPunch(0.7,0.8,true); S.freeze=2; return; }
  const dmg=kind==='headbutt'?9:7;
  D.rt.hp=Math.max(1,D.rt.hp-dmg); D.stun+=22; D.dmg=Math.min(1,D.dmg+0.12); D.faceDamage+=dmg; D.hurtT=D.hurtDuration=.3; D.hurtDir=0; D.hurtLow=false; D.hurtPower=1; D.stagger=.3;
  if(Math.random()<0.45&&(D.wounds.cuts||0)<3){ D.wounds.cuts=(D.wounds.cuts||0)+1; D.cutAt.push(S.t); }
  popup(kind==='headbutt'?sparringState.T_HEADBUTT:sparringState.T_CUT,px,py-14,sparringState.C_BLOOD2,1,34);
  sfxPunch(1,0.8,true); spray(A,D,2,false,false,{damage:dmg,counter:true}); S.freeze=3;
}

/** A perfect evade: the player gets the slow motion and the counter, the rival just freezes a moment. @param {any} D */
function onPerfectEvade(D){
  const S=state, px=hx(D), py=hy(D);
  D.c.evades++; D.c.perfects++;
  popup(sparringState.T_UNIK,px,py-12,appearanceState.C_SPARK,1,30);
  if(D===S.P){
    S.slowMo=TUNING.slowMoDuration; D.rt.counterUntil=Math.max(D.rt.counterUntil,S.t+1.1); sfxPerfectEvade();
    say((D.evKind==='back'?'Idealny odskok':D.evKind==='in'?'Idealny doskok':'Idealny unik')+' · kontruj');
  } else { sfxWhoosh(0.55); S.freeze=2; }
}

/** Contact of a punch at its apex, with the rules of realtime-rules.js. @param {any} A @param {any} D */
function impact(A,D){
  const S=state, now=S.t, pid=A.pk.pid, low=A.pk.low, gap=toward(A,D)[2], R=RANGE[pid];
  if(A.pk.special){ special(A,D); return; }
  if(D.ko||D.down) return;
  if(gap>R){
    whiffPunch(A.rt,now);
    if(A===S.O) A.pk.whiff=true;   // the rival's miss carries him over his front foot: an opening to punish
    if(A.bull) registerBullMiss(A.bull,pid,now);
    if(resolveNearMiss(A.rt,D.rt,{gap,range:R,now})){ onPerfectEvade(D); return; }   // out of reach by a hair while evading sideways or back
    if(pid>=1&&A.rt.sta<22){ A.stagger=.55; A.pk=null; popup(sparringState.T_OVER,hx(A),hy(A)-8,appearanceState.C_SPARK,1,28); }
    else if(A===S.P) say('Poza zasięgiem');
    return;
  }
  if(D.finStun){ finisherHit(A,D,pid,low); return; }
  const k=gap/R;
  let rangeMod=1;
  if(pid<=1){ if(k>=0.76&&k<=0.97) rangeMod=1.15; else if(k<0.64) rangeMod=0.75; }
  else if(k>=0.70&&k<=0.90) rangeMod=1.20;
  const o=resolvePunch(A.rt,D.rt,{pid,low,now,gap,range:R,guardLate:guardLate(D)});
  // The defender who slipped avoided contact, unlike a block or parry.
  if(o.kind==='slip'&&A.bull) registerBullMiss(A.bull,pid,now);
  if(o.damage>0){
    const extra=o.damage*(rangeMod*(A.bull?BULL.damage[pid]:1)-1);
    D.rt.hp=Math.max(0,D.rt.hp-extra); o.damage=Math.max(0,o.damage+extra);
  }
  const px=hx(D), py=hy(D)+(low?10:0);
  if(o.kind==='parry'){
    D.c.blocks++; D.c.perfects++; A.stagger=.45; A.pk=null; A.stun+=16; popup(sparringState.T_PARRY,px,py-12,appearanceState.C_SPARK,1,30); sfxBlock(0.95,true);
    S.freeze=8; say(D===S.P?'Idealny blok · kontruj':'Rywal sparował'); return;
  }
  if(o.kind==='slip'){ onPerfectEvade(D); return; }
  const blocked=o.kind==='block';
  A.pk.landed=o.kind==='hit'&&o.damage>0;
  if(blocked) D.c.blocks++;
  if(!blocked&&o.damage>0){ landRun(A,D,now); A.c.landed++; if(pid>0) A.c.power++; if(low) A.c.body++; else D.faceDamage+=o.damage; if(o.counter) A.c.counters++; D.dmg=Math.min(1,D.dmg+o.damage/D.rt.hpMax*1.6); }
  let stagger=false;
  if(!blocked){
    if(low){
      if(pid>=2&&(D.rt.sta<22||o.counter)){ D.wounds.ribs=(D.wounds.ribs||0)+1; D.rt.hp=Math.max(0,D.rt.hp-4); D.stagger=.5; D.pk=null; stagger=true; sfxCrack(0.85); popup(sparringState.T_RIB,px,py-10,sparringState.C_BLOOD2,1,36); }
    } else {
      D.stun+=[11,20,28,32][pid]*(o.counter?1.45:1)*((A.stunDealt||1)/(D.stunTaken||1));
      if(D.stun>=82&&D.rt.hp>0){ D.stun=30; D.stagger=.7; D.pk=null; stagger=true; popup(sparringState.T_CARD+19,px,py-16,appearanceState.C_SPARK,1,38); }
      if(pid===2&&D.dmg>0.42&&(D.wounds.cuts||0)<3&&Math.random()<0.28){ D.wounds.cuts=(D.wounds.cuts||0)+1; D.cutAt.push(now); popup(sparringState.T_CUT,px,py-18,sparringState.C_BLOOD2,1,38); }
      if((pid===1||pid===3)&&o.counter&&D.dmg>0.48&&!D.wounds.nose){ D.wounds.nose=true; D.rt.regen*=0.82; sfxCrack(0.8); popup(sparringState.T_CARD+15,px,py-18,sparringState.C_BLOOD2,1,38); }
    }
  }
  // Body blows are a separate, longer anticipation/compression/recovery sequence.
  // This is visual only: resolvePunch above still owns stamina and HP.
  D.hurtDuration=low?(blocked?.18:BODY_HIT_SECONDS+pid*.025):!blocked&&pid>=1?.4:.3;
  D.hurtT=D.hurtDuration; D.hurtDir=pid; D.hurtLow=low; D.hurtBlocked=blocked;
  D.hurtPower=(blocked?0.25:1)*(1+0.8*(1-Math.max(0,Math.min(1,D.rt.sta/D.rt.staCapInitial))))*(low&&!blocked?1+pid*.08:1);
  const [sideI,sideJ]=toward(D,A);
  D.hurtSide=Math.max(-1,Math.min(1,(sideI*-D.fj+sideJ*D.fi)*1.8+(A.pk.hand||1)*0.3));
  const interrupted=!blocked&&o.damage>0&&(!!D.tell||D.bull?.mode==='WINDUP');   // a clean blow while he loads a punch takes it away
  if(interrupted&&D.tell){ D.tell=null; D.aiAt=Math.max(D.aiAt,now+.3); }
  if(!blocked&&o.damage>0&&D.bull?.mode==='WINDUP'){ D.bull.mode='RECOVERY'; D.bull.until=now+0.48; }
  if(!stagger&&!blocked&&!low&&D.pk&&D.pk.t<punchT(D,D.pk.pid).hit) D.pk=null;   /* a clean hit interrupts the windup */
  const [ui,uj]=toward(A,D), kb=A.bull?BULL.knockback:1; walk(D,A,ui,uj,(blocked?.05:A===S.P&&A.rt.comboCount>1?.06:.12)*kb);
  const slide=blocked||o.damage<=0||A.rt.comboCount>1?0:o.counter?.18:pid>=2?.1:0;   // a lone hook, uppercut or counter drives him back across the floor; combinations still connect
  if(slide) D.slide={di:ui,dj:uj,left:slide*kb};
  if(o.damage>=1) popup(sparringState.T_DMG+Math.min(30,Math.max(1,Math.round(o.damage)))-1,px,py-14,blocked?appearanceState.C_GRAY:appearanceState.C_WHITE,1,32);
  spray(A,D,pid,low,blocked,o);   // the hit shows in the head's snap and what flies off him, not in a flash
  if(blocked) sfxBlock(0.6); else sfxPunch(Math.min(1.4,0.55+0.25*pid+(o.counter?0.2:0)),low?1:0.35+pid*0.15,true);
  hitFeel(blocked,o.damage,o.counter,pid,low);
  D.vib=S.freeze; D.vibI=ui; D.vibJ=uj;
  if(o.failedSlip&&D===S.P) say('Spóźniony slip'); else if(o.counter&&A===S.P) say('Kontra'); else if(interrupted&&A===S.P) say('Przerwany zamach');
  if(D.rt.hp<=0){
    const brutal=D.kdN>=2||(D.kdN===1&&o.counter&&pid===3);
    if(!D.down&&!brutal){
      D.down=true; D.downAt=now; D.kdN++; D.kdMash=0; D.pk=null; D.dash=null; D.buf=null;
      D.rt.hp=Math.round(D.rt.hpMax*(D.kdN===1?0.32:0.20)); D.rt.sta=Math.max(D.rt.sta,D.rt.staCap*0.5); D.stun=0;
      startIsoRagdoll(D,A,pid,false); banner('NOKDAUN!',appearanceState.C_RED,80); sfxKO();
      say(D===S.P?'Wciskaj klawisze, żeby wstać':'Rywal na deskach ('+D.kdN+'/3)');
    } else if(A===S.P&&S.venue!=='sandy'&&!S.rigKO) startFinisher(A,D,D.kdN>=2?'TKO':'KO');
    else { D.ko=true; D.pk=null; D.dash=null; startIsoRagdoll(D,A,pid,true); spray(A,D,pid,low,false,o,true); endBout(A,D.kdN>=2?'TKO':'KO'); }
  }
}

/** Tired arms come up slowly: a held guard of a tired fighter that is not up yet does not block. @param {any} F */
function guardLate(F){ return F.rt.zone>0&&F.rt.guarding&&F.gUp<0.6; }

/** Count clean hits landed within the combo window without taking one back: the best run goes on the result card. @param {any} A @param {any} D @param {number} now */
function landRun(A,D,now){
  const c=A.c; c.run=now-c.lastLand<=TUNING.comboWindow?c.run+1:1; c.lastLand=now; c.bestRun=Math.max(c.bestRun,c.run);
  D.c.run=0;
}

/** Hit-stop by the punch (longer for a counter), a shake along the blow (an uppercut shakes the frame up and down) and, for a power
 *  punch or a counter, a short punch-in of the camera. A block stops the action briefly too.
 * @param {boolean} blocked @param {number} damage @param {boolean} counter @param {number} pid @param {boolean} low */
function hitFeel(blocked,damage,counter,pid,low){
  const S=state;
  if(blocked){ S.freeze=3; boxingState.shakeT=boxingState.shakeDur=4; boxingState.shakeAmp=1; boxingState.shakeAxis=0; return; }
  S.freeze=Math.min(14,[4,6,8,9][pid]+(damage>=12?1:0)+(counter?4:0));
  boxingState.shakeT=boxingState.shakeDur=Math.min(12,6+Math.round(damage/3)); boxingState.shakeAmp=damage>=10||counter?3:2; boxingState.shakeAxis=pid===3&&!low?1:0;
  if(counter||pid>=1) S.kick=Math.max(S.kick,counter?0.1:pid>=2?0.06:0.04);
}

/* FINISHER. The blow that takes the rival's last health does not drop him: he stands stunned and sways, the player lands up to
   FIN_HITS free blows in the live fight (he falls on the last one, or when FIN_WINDOW runs out), and then the comic replays the
   knockout blow, every free blow and the fall in slow motion, one panel after another. */
/** Free blows, the seconds the stunned rival stays up, ticks of the fall recorded before the comic. */
const FIN_HITS=4, FIN_WINDOW=4, FIN_FALL=80;
/** Seconds the finished comic page holds before the result. */
const FIN_HOLD=1.2;

/** The player's blow took the rival's last health: he is stunned on his feet. @param {any} A @param {any} D @param {string} how */
function startFinisher(A,D,how){
  const S=state, pk=A.pk;
  D.pk=null; D.dash=null; D.buf=null; D.combo=[]; D.tell=null; D.rt.hp=0; D.finStun=true; D.stun=0; D.stagger=0;
  if(D.rt.guarding) setGuard(D.rt,false,S.t);
  S.clinch=false; S.push=null;
  S.tape.push(snapshot());
  S.fin={stage:'stun',how,at:S.t,hits:[{idx:S.tape.length-1,pid:pk?.pid??1,low:!!pk?.low}],fall:0,t:0,skip:false};
  say('Rywal się chwieje · dobij go');
}

/** A free blow on the stunned rival: no guard, no damage left to deal, only the reaction, the spray and the count; the last one drops him.
 * @param {any} A @param {any} D @param {number} pid @param {boolean} low */
function finisherHit(A,D,pid,low){
  const S=state, F=S.fin, [ui,uj]=toward(A,D), [si,sj]=toward(D,A);
  D.hurtDuration=low?BODY_HIT_SECONDS+pid*.025:.3; D.hurtT=D.hurtDuration; D.hurtDir=pid; D.hurtLow=low; D.hurtBlocked=false; D.hurtPower=1.6;
  D.hurtSide=Math.max(-1,Math.min(1,(si*-D.fj+sj*D.fi)*1.8+(A.pk.hand||1)*0.3));
  if(!low) D.faceDamage+=PUNCH_DAMAGE[pid]; D.dmg=Math.min(1,D.dmg+0.1);
  walk(D,A,ui,uj,.04);
  A.pk.landed=true; A.c.landed++; A.c.finisher++; if(low) A.c.body++; landRun(A,D,S.t);
  spray(A,D,pid,low,false,{damage:PUNCH_DAMAGE[pid]*1.5,counter:true});
  sfxPunch(Math.min(1.4,0.75+0.25*pid),low?1:0.35+pid*0.15,true);
  hitFeel(false,12,true);
  S.tape.push(snapshot()); F.hits.push({idx:S.tape.length-1,pid,low});
  if(F.hits.length>FIN_HITS) finisherFall(A,D,pid,low);
}

/** The stunned rival goes down: the fall plays live and is recorded for the comic. @param {any} A @param {any} D @param {number} pid @param {boolean} low */
function finisherFall(A,D,pid=1,low=false){
  const S=state, F=S.fin;
  D.finStun=false; D.ko=true; D.pk=null;
  startIsoRagdoll(D,A,pid,true); spray(A,D,pid,low,false,{damage:PUNCH_DAMAGE[pid],counter:true},true);
  F.stage='fall'; F.fall=S.tape.length;
}

/** The fall is on the tape: the comic replays the fight's end, panel after panel. */
function startFinisherComic(){
  const S=state, F=S.fin, last=S.tape.length-1;
  const clips=F.hits.map((/** @type {any} */ h,/** @type {number} */ k)=>({ref:h.idx,from:Math.max(0,h.idx-(k?10:18)),to:Math.min(last,h.idx+9),pid:h.pid,low:h.low,fall:false}));
  clips.push({ref:F.fall,from:Math.max(0,F.fall-2),to:last,pid:0,low:false,fall:true});
  startFinisherMontage(S.tape,clips,F.how,S.venue);
  F.stage='comic'; F.t=0; S.phase='finisher'; S.banner=null; setInfo();
}

/** Any key ends the comic early. @param {string} c */
function finisherKey(c){ if(state.fin&&c) state.fin.skip=true; }

/** One tick of the comic: when it has played out (or was skipped), back to the room and the bout ends as a knockout. */
function tickFinisher(){
  const S=state, F=S.fin;
  F.t+=1/60;
  if(!F.skip&&F.t<finisherMontageLength()+FIN_HOLD) return;
  F.stage='done'; S.phase='fight'; endBout(S.P,F.how);
}

/** Screen position (native px) of a fighter's head. @param {any} F */
function hx(F){ return isoX(F.i,F.j)/gymState.ISO_K; }
/** @param {any} F */
function hy(F){ return isoY(F.i,F.j,15.6)/gymState.ISO_K; }

/** Slow, readable slugger logic. All movement, attack, and fatigue events remain scoped to Briggs. */
function bullAi(F,P,ui,uj,gap){
  const now=state.t, b=F.bull, mode=advanceBull(b,now,!!F.pk);
  if(F.grab||F.ko||F.down||P.ko||P.down){ if(F.rt.guarding) setGuard(F.rt,false,now); return; }
  if(mode==='RESUME'){ if(!F.rt.guarding) setGuard(F.rt,true,now); return; }
  if(F.rt.guarding) setGuard(F.rt,false,now);
  if(mode==='EXHAUSTED'){ F.buf=null; F.combo.length=0; return; }
  if(F.stagger>0){
    if(mode==='WINDUP'){ b.mode='RECOVERY'; b.until=now+0.5; }
    return;
  }
  if(F.pk){ b.mode='ATTACK'; return; }
  if(mode==='RECOVERY') return;
  if(mode==='WINDUP'){
    if(now>=b.until){
      if(press(F,b.pid,false)){ b.mode='ATTACK'; b.missed=false; }
      else { b.mode='RECOVERY'; b.until=now+0.35; }
    }
    return;
  }
  if(gap>1.08){
    b.mode='APPROACH';
    const moved=walk(F,P,ui,uj,WALK*0.8*BULL.move*ZONES[F.rt.zone].walk*state.scale); // 68% of the standard rival's 0.8*WALK
    F.moving=moved>0; F.mf=1; F.ms=0; return;
  }
  b.mode='PRESSURE';
  if(now<F.aiAt) return;
  if(F.rt.sta<Math.min(punchCost(F.rt,1,now),punchCost(F.rt,2,now))){
    F.aiAt=now+0.4; return;
  }
  const r=Math.random();
  let pid=r<0.08?0:r<0.30?1:r<0.85?2:3;
  if(gap>RANGE[pid]) pid=gap>RANGE[1]?0:1;
  if(gap>RANGE[pid]) return;
  b.pid=pid; b.mode='WINDUP'; b.at=now; sfxTell(pid);
  b.until=now+(pid===0?0.25:pid===1?0.38:pid===2?0.57:0.51);
  F.aiAt=b.until+0.22;
}

/** The opponent: keeps his distance, circles, reads the player's punches and answers in short combinations (the old styles). @param {any} F @param {any} P */
function ai(F,P){
  const S=state, now=S.t, O=S.opp, [ui,uj,gap]=toward(F,P), si=-uj, sj=ui;
  const archKey=O.name==='DAN'?'tank':(ARCH[O.style]?O.style:'bal'), arch=ARCH[archKey], perks=O.perks||[], zone=F.rt.zone, legs=ZONES[zone].walk;
  F.moving=false;
  if(F.finStun) return;   // stunned on his feet: nothing but the sway
  if(F.bull){ bullAi(F,P,ui,uj,gap); return; }
  if(F.grab||F.ko||F.down||P.ko||P.down){ F.tell=null; if(F.rt.guarding) setGuard(F.rt,false,now); return; }
  if(F.rt.guarding&&now>=F.guardUntil) setGuard(F.rt,false,now);
  if(F.stagger>0) F.tell=null;
  if(F.tell){ if(now>=F.tell.until){ const t=F.tell; F.tell=null; if(t.feint) F.aiAt=Math.max(F.aiAt,now+.25); else press(F,t.pid,t.low); } return; }   // committed to the shown punch
  if(F.stagger>0||F.pk) return;
  if(S.venue==='port'){
    if(now<F.aiAt) return;
    if(gap>1.25){ walk(F,P,ui,uj,WALK*.4*S.scale); F.moving=true; F.mf=1; F.ms=0; return; }
    if(gap<=RANGE[0]) startTell(F,0,false);
    F.aiAt=now+1.2; return;
  }
  if(F.combo.length&&now>=F.comboAt){ const n=F.combo.shift(); if(gap<=RANGE[n.pid]*0.9&&F.rt.sta>=10&&startTell(F,n.pid,n.low,true)){ F.comboAt=now+(n.pid===0?.15:.22); } else F.combo.length=0; return; }
  if(now-F.slipSince<TUNING.slipActive||F.rt.guarding) return;
  const hist=P.hist.filter((/** @type {any} */ h)=>now-h.at<5), recentStraights=hist.filter((/** @type {any} */ h)=>h.pid<=1).length, recentLow=hist.filter((/** @type {any} */ h)=>h.low).length, adaptSlip=recentStraights>=3?0.25:0;
  const pp=P.pk, nextEvCost=evadeCost(F.rt,now);
  if(pp&&!pp.special&&pp.t>0.05&&pp.t<punchT(P,pp.pid).hit&&F.seen!==P.rt.lastActionAt){
    F.seen=P.rt.lastActionAt;
    if(gap<RANGE[pp.pid]*1.1&&Math.random()<Math.min(0.68,0.22+O.rank*0.018+adaptSlip*0.5)){
      if(pp.pid<=2&&F.rt.sta>=nextEvCost+6&&Math.random()<Math.min(0.85,arch.slipBias+adaptSlip)){
        const backEv=(archKey==='out'||archKey==='counter')&&gap<RANGE[pp.pid]*0.95&&Math.random()<0.42;
        if(backEv?evade(F,P,-ui,-uj):evade(F,P,si*F.strafe,sj*F.strafe)){
          const cPid=recentLow>=2?3:(Math.random()<0.55?2:1);
          F.combo=[{pid:cPid,low:false}];
          if(archKey==='counter'||archKey==='press') F.combo.push({pid:cPid===1?2:1,low:Math.random()<0.3});
          F.comboAt=now+.17; F.aiAt=now+.45; return;
        }
      }
      setGuard(F.rt,true,now); F.guardUntil=now+.26+Math.random()*.14; return;
    }
  }
  if(now<F.aiAt) return;
  if(zone===2&&!(P.rt.sta<25||P.stun>45)&&tiredAi(F,P,ui,uj,gap)) return;
  const playerHurt=P.rt.sta<25||P.stun>45, k=(arch.idealGap-19)/9, ideal=RANGE[1]*(0.62+0.3*k), minGap=Math.max(MIN_SEP+0.04,ideal-0.14), targetGap=playerHurt?Math.min(ideal,0.9):ideal;
  if(now>=F.strafeUntil){ F.strafe=Math.random()<.5?-1:1; F.strafeUntil=now+.7+Math.random()*1.1; }
  if(gap>targetGap+0.1){
    if(playerHurt&&(archKey==='press'||archKey==='counter')&&gap<targetGap+0.55&&F.rt.evadeFatigue===0&&F.rt.sta>=nextEvCost+18&&Math.random()<arch.slipBias*0.18&&evade(F,P,ui,uj)){ F.aiAt=now+.28; return; }   // a dash in on a hurt man
    walk(F,P,ui,uj,WALK*0.8*legs*S.scale); F.moving=true; F.mf=1; F.ms=0; return;
  }
  if(gap<minGap&&!playerHurt){
    if(perks.includes('shove')&&gap<1.0&&F.rt.sta>=12&&Math.random()<0.45){ F.rt.sta-=8; if(press(F,2,false,'shove')){ F.aiAt=now+.45; return; } }
    if(archKey==='out'||archKey==='counter'){
      if(F.rt.evadeFatigue===0&&F.rt.sta>=nextEvCost+14&&Math.random()<arch.slipBias*0.22&&evade(F,P,-ui,-uj)){ F.aiAt=now+.28; return; }   // a hop back out of reach
      walk(F,P,-ui,-uj,WALK*0.8*legs*S.scale); F.moving=true; F.mf=-1; F.ms=0; F.aiAt=now+.18; return;
    }
  }
  if(Math.abs(gap-targetGap)<0.5){ walk(F,P,si*F.strafe,sj*F.strafe,WALK*0.5*legs*S.scale); F.moving=true; F.mf=0; F.ms=F.strafe; }
  if(perks.includes('dirty-work')&&gap<1.0&&F.rt.sta>=16&&Math.random()<0.16){ F.rt.sta-=10; if(press(F,2,false,Math.random()<0.5?'headbutt':'elbow')){ F.aiAt=now+.55; return; } }
  if(F.rt.sta<16&&!playerHurt){ F.aiAt=now+.38; return; }
  const r=Math.random(), w=arch.weights;
  let pid=r<w[0]?0:(r<w[1]?1:(r<w[2]?2:3));
  if(gap>RANGE[pid]) pid=gap>RANGE[1]?0:1;
  if(gap>RANGE[0]){ F.aiAt=now+.12; return; }
  const aimBody=(P.rt.guarding&&Math.random()<0.70)||Math.random()<arch.bodyBias;
  if(startTell(F,pid,aimBody)){
    if(F.rt.sta>=20&&Math.random()<arch.comboChance*(playerHurt?1.35:1)*(zone?0.6:1)){
      const second=pid===0?1:(pid===1?2:(pid===2?3:2));
      F.combo=[{pid:second,low:aimBody?false:(Math.random()<arch.bodyBias)}];
      if((archKey==='press'||playerHurt)&&F.rt.sta>=34&&Math.random()<0.45) F.combo.push({pid:second===2?3:2,low:false});
      F.comboAt=now+(pid===0?.16:.24);
    }
    if(archKey==='out'&&!F.combo.length&&Math.random()<0.4){ F.aiAt=now+.25; return; }
  }
  F.aiAt=now+(arch.cadence[0]+Math.random()*arch.cadence[1])*(playerHurt?0.68:1)*(zone?1.3:1);
}

/** A gassed rival changes his fight: he hangs on in a clinch, throws a wild hook when the player is close, or backs off with his guard up to breathe.
 * @param {any} F @param {any} P @param {number} ui @param {number} uj @param {number} gap @returns {boolean} the turn is used */
function tiredAi(F,P,ui,uj,gap){
  const now=state.t;
  if(now>=F.tiredAt){
    F.tiredAt=now+.45+Math.random()*.3; const r=Math.random();
    if(gap<1.2&&!P.pk&&r<0.3&&startClinch(true)){ F.aiAt=now+.4; return true; }
    if(gap<=RANGE[2]&&r<0.55&&startTell(F,2,false,false,1.2)){ F.aiAt=now+.9; return true; }
  }
  if(gap>=2.4) return false;
  walk(F,P,-ui,-uj,WALK*0.8*ZONES[2].walk*state.scale); F.moving=true; F.mf=-1; F.ms=0;   // no guard while backing off: a held guard costs the breath he needs
  return true;
}

/** The simulation's time scale: 1, or slow motion after the player's perfect evade (held, then eased back). */
function timeScale(){
  const S=state; if(S.slowMo<=0) return 1;
  const u=1-S.slowMo/TUNING.slowMoDuration;
  return u<0.6?TUNING.slowMoScale:TUNING.slowMoScale+(1-TUNING.slowMoScale)*smooth((u-0.6)/0.4);
}

/** One 60 Hz step of the fight. The fight's own dt is scaled by the slow motion; the input clock (uiT) and the pause are not. */
export function isoFightTick(){ if(state.venue==='pub'){ followPubFight((state.P.i+state.O.i)/2,(state.P.j+state.O.j)/2); return withPubCamera(tickFight); } if(state.venue==='port') return withThamesCamera(tickFight); return tickFight(); }
function tickFight(){
  const S=state; if(!S.on) return;
  for(const F of [S.P,S.O]) if(F&&F.vib>0) F.vib--;   // the struck man's tremble runs on real frames, through the hit-stop
  if(S.freeze>0){
    // Hit-stop freezes combat logic, but the struck torso still begins to fold
    // over the impact: otherwise the visual response starts frames after contact.
    S.freeze--;
    for(const F of [S.P,S.O]) if(F?.hurtT>0) F.hurtT=Math.max(0,F.hurtT-1/60);
    return;
  }
  if(S.phase==='finisher'){ tickFinisher(); return; }
  const rawDt=1/60, scale=S.kdSlow>0?(S.kdSlow>3?0.85:S.kdSlow>1.8?0.35:0.16):(S.phase==='fight'?timeScale():1), dt=rawDt*scale, P=S.P, O=S.O;
  S.scale=scale; if(S.kdSlow>0) S.kdSlow=Math.max(0,S.kdSlow-rawDt); if(S.slowMo>0) S.slowMo=Math.max(0,S.slowMo-rawDt);
  if(S.banner&&S.kdSlow<=0&&--S.banner.t<=0) S.banner=null;   // the knockdown's words wait for the comic to end
  tickFeet(P,scale); tickFeet(O,scale); tickSpurt(P,scale); tickSpurt(O,scale); tickParts(scale);
  for(const F of [P,O]){ if((F.ko||F.down)&&!F.rd) startIsoRagdoll(F,null,1,F.ko); if(F.rd){ F.rd.steps+=scale; while(F.rd.steps>=1){ stepIsoRagdoll(F); F.rd.steps-=1; } } if(F.rise&&(F.rise.t+=scale/(F.pk||F.gUp>0.2?RISE_HURRY:RISE_TICKS))>=1) F.rise=null; }
  if(S.kdSlow>3&&S.venue!=='sandy') recordKnockdownFrame();
  if(O.rt.guarding&&!O.gWas) O.gPop=1; O.gWas=O.rt.guarding; O.gPop=Math.max(0,(O.gPop||0)-dt*5);   // the rival's guard snaps up past its place and settles: a block you can see coming
  for(const F of [P,O]){ F.gUp+=((F.rt.guarding?1:0)-F.gUp)*0.35*ZONES[F.rt.zone].guard*scale; F.tire+=(F.rt.zone/2-F.tire)*0.04*scale; F.hurtT=Math.max(0,F.hurtT-dt); F.stagger=Math.max(0,F.stagger-dt*(S.phase==='fight'?1:0)); }
  const [pi,pj]=toward(P,O), [oi,oj]=toward(O,P);
  for(const [F,ti,tj] of [[P,pi,pj],[O,oi,oj]]){ if(F.ko||F.down) continue; const turn=F.bull?0.11:0.22; F.fi+=(ti-F.fi)*turn*scale; F.fj+=(tj-F.fj)*turn*scale; const m=Math.hypot(F.fi,F.fj)||1; F.fi/=m; F.fj/=m; }
  P.moving=false; O.moving=false;
  if(S.phase==='intro'){
    S.pt++;
    if(S.pt>=45){ hideFightPlate(); S.phase='fight'; S.pt=0; if(!S.evadeHintShown){ S.evadeHintShown=true; say('Mysz: ruch · E: unik'); } setInfo(); }
    return;
  }
  if(S.phase==='ko'){
    if(P.rt.guarding) setGuard(P.rt,false,S.t); if(O.rt.guarding) setGuard(O.rt,false,S.t);
    if(++S.pt>=100&&S.kdSlow<=0){
      if(S.venue==='port'&&S.winner===S.P){ const hero={i:P.i,j:P.j}, fallen={i:O.i,j:O.j}; stopIsoFight(); document.body.classList.remove('spar'); startPortAfterFight(hero,fallen); return; }
      showResult(); S.phase='end';
    }
    return;
  }
  if(S.phase!=='fight') return;
  S.uiT+=rawDt; S.t+=dt; S.elapsed++; const now=S.t;
  if(O.bull) O.bullClock=now;
  if(S.eTap&&S.uiT-S.eTap.at>TAP_WINDOW){ const {di,dj}=S.eTap; S.eTap=null; if(di||dj) evade(P,O,di,dj); }
  if(sparringState.timeLimit&&S.elapsed>=sparringState.timeLimit&&!S.fin){ timeUp(); return; }
  for(const F of [P,O]){
    const G=F===P?O:P;
    tickCombatant(F.rt,dt,now,S.clinch?TUNING.clinchRegen:1);
    if(F.dash&&(F.ko||F.down||F.grab||F.stagger>0)) F.dash=null;
    if(F.dash){
      const D=F.dash, u=Math.min(1,(now-D.at)/DASH.duration), next=dashTravel(u), moved=walk(F,G,D.di,D.dj,DASH.distance*Math.max(0,next-D.progress));
      D.progress=next;
      if(moved>1e-6){ F.moving=true; F.mf=D.di*F.fi+D.dj*F.fj; F.ms=D.di*-F.fj+D.dj*F.fi; }
      if(F.buf&&u>=DASH.punchFrom&&!F.pk){ const b=F.buf; F.buf=null; if(now<=b.until) press(F,b.pid,b.low); }
      if(u>=1) F.dash=null;
    }
    if(F.slide){   // the knockback eases out over a few frames, kicking up dust under the shoes
      const D=F.slide, step=Math.min(D.left,(D.left*0.22+0.003)*scale);
      if(!F.ko&&!F.down&&!F.grab){ walk(F,G,D.di,D.dj,step); if(step>0.012) kickDust(F,D.di,D.dj); }
      D.left-=step; if(D.left<=0.001||F.ko||F.down||F.grab) F.slide=null;
    }
    const su=(now-F.slipSince)/TUNING.slipActive;
    if(su>=0&&su<1&&!F.ko&&!F.down){   // the evade is a quick eased move of the whole body, not a jump
      walk(F,G,F.evDi,F.evDj,(EVADE_SPEED[F.evKind]||0.01)*ZONES[F.rt.zone].walk*Math.sin(Math.PI*su)*scale);
      F.moving=F.evKind!=='slip'; F.mf=F.evFwd; F.ms=F.evSide;
    }
    F.stagger=Math.max(0,F.stagger);
    F.stun=Math.max(0,F.stun-dt*4);
    F.c.minSta=Math.min(F.c.minSta,F.rt.sta/F.rt.staCap);
    if(F.wounds.cuts&&!F.down&&!F.ko) F.rt.hp=Math.max(1,F.rt.hp-(0.25*F.wounds.cuts)*dt);
    if(F.pk){ F.pk.t+=(F.pk.fastCounter?rawDt:dt*ZONES[F.rt.zone].punch)*(F.pk.exhausted?0.5:1)*(S.venue==='port'&&F===O?.5:1); if(!F.pk.hit&&F.pk.t>=punchT(F,F.pk.pid).hit){ F.pk.hit=true; impact(F,G); if(S.phase!=='fight') return; } if(F.pk&&F.pk.t>=punchT(F,F.pk.pid).end) F.pk=null; }
    if(F.buf&&(!F.pk||canCancel(F))&&!F.dash&&F.stagger<=0&&!F.down&&(now-F.slipSince>=TUNING.slipActive||(F===P&&S.slowMo>0&&now<F.rt.counterUntil))){ const b=F.buf; F.buf=null; if(now<=b.until) press(F,b.pid,b.low); }
    if(F.buf&&now>F.buf.until) F.buf=null;
    if(F.down&&!F.ko){   /* the count: the player gets up with enough taps, the rival on his own */
      const down=now-F.downAt;
      if(F===P){
        if(F.kdMash>=riseTaps(F)&&down>=1.2){ F.down=false; F.stagger=.6; stopIsoRagdoll(F); say('Wstałeś · trzymaj gardę'); }
        else if(down>=3.4){ if(F.kdN===1&&F.kdMash>=2){ F.down=false; F.stagger=.6; stopIsoRagdoll(F); } else { F.down=false; F.ko=true; F.rt.hp=0; endBout(O,'KO'); return; } }
      } else if(down>=2.3+F.kdN*0.45){ F.down=false; F.stagger=.6; stopIsoRagdoll(F); }
    }
  }
  if(S.push){
    const push=S.push;
    if(!O.down&&!O.ko){
      const [ui,uj]=toward(P,O);
      if(push.di*ui+push.dj*uj<0) walk(P,O,-push.di,-push.dj,0.045*scale);
      walk(O,P,push.di,push.dj,0.045*scale);
    }
    push.left-=scale; if(push.left<=0||O.down||O.ko) S.push=null;
  }
  const K=S.keys; let dx=(K.r||0)-(K.l||0), dy=(K.d||0)-(K.u||0);
  let [di,dj]=pointerDirection(); if(dx||dy){ di=dx+dy; dj=dy-dx; const l=Math.hypot(di,dj); di/=l; dj/=l; }
  const free=!P.grab&&!P.pk&&!P.dash&&P.stagger<=0&&!P.down&&!P.ko;
  if(S.clinch){
    if(P.grab||O.grab||P.down||P.ko||O.down||O.ko){ S.clinch=false; }
    else if(now-S.clinchAt>=CLINCH_MAX){ S.clinch=false; S.push={di:pi,dj:pj,left:14}; O.aiAt=now+.4; say('Rozdzieleni'); }
    else { if(di||dj) moveClinch(di,dj,scale); recordTape(); return; }
  }
  if(S.guardHeld&&(free||P.dash&&now-P.dash.at>=DASH.duration*.80)&&!P.rt.guarding&&now-P.slipSince>=TUNING.slipActive) setGuard(P.rt,true,now);
  if(!S.guardHeld&&P.rt.guarding) setGuard(P.rt,false,now);
  if((di||dj)&&free&&now-P.slipSince>=TUNING.slipActive){
    const sp=WALK*(0.9+0.1*boxingState.STATS.speed)*(P.rt.guarding?0.5:1)*ZONES[P.rt.zone].walk*scale;
    const moved=walk(P,O,di,dj,sp); P.moving=moved>0; P.mf=di*P.fi+dj*P.fj; P.ms=di*(-P.fj)+dj*P.fi;
    if(moved>0) P.lastMove=[di,dj];
  }
  ai(O,P);
  for(const F of [O,P]) updateCrowdGrab(F);
  for(const F of [P,O]) if(!F.ko&&!F.down){
    if((F.bleed||F.wounds.cuts)&&F.rt.hp/F.rt.hpMax<0.6&&Math.random()<0.02*scale) drip(F,'blood');
    if(F.bull?.mode==='EXHAUSTED'&&Math.random()<0.045*scale) drip(F,'sweat');
    else if(F.rt.zone&&Math.random()<0.012*F.rt.zone*scale) drip(F,'sweat');
  }
  if(!S.windUsed&&P.rt.zone===2&&!P.pk&&!P.down&&now-P.rt.lastActionAt>=TUNING.secondWindRest&&now-P.slipSince>=TUNING.secondWindRest){
    S.windUsed=true; secondWind(P.rt); say('Drugi oddech');
  }
  recordTape();
  if(S.fin?.stage==='stun'&&now-S.fin.at>=FIN_WINDOW) finisherFall(P,O);
  else if(S.fin?.stage==='fall'&&S.tape.length-S.fin.fall>=FIN_FALL){ startFinisherComic(); return; }
  if(sparringState.rigged&&!S.fin&&!S.rigKO&&(P.rt.hp/P.rt.hpMax-O.rt.hp/O.rt.hpMax>.15||now>35)){
    S.rigKO=true; P.rt.hp=0; P.ko=true; P.pk=null; if(!P.rd) startIsoRagdoll(P,O,2,true); S.phase='ko'; S.pt=0; S.winner=O; S.how='KASTET';
    banner('KASTET!',appearanceState.C_RED,150); sfxKO(); setInfo();
  }
}

/** The result card of a brawl: XP, the fight record, the prison's verdict (respect, the turnkey, the list), the wounds. */
function showResult(){
  hideFightPlate();
  if(state.venue==='sandy'){
    inputState.overTitle.textContent=state.winner===state.P?'WYGRANA — TEST HD':'PRZEGRANA — TEST HD';
    inputState.overStats.textContent='Bohater kontra Harry · arena piaskowa 432×288 · bez XP i zmian zapisu';
    inputState.againFn=()=>startIsoFight(0,'sandy'); inputState.overEl.hidden=false; inputState.againBtn.focus(); setInfo(); return;
  }
  if(state.venue==='pub'){
    inputState.overTitle.textContent=state.winner===state.P?'WYGRANA — BÓJKA W PUBIE':'PRZEGRANA — BÓJKA W PUBIE';
    inputState.overStats.textContent='Rywal: '+state.opp.title+' · Esc — powrót do pubu';
    inputState.againFn=()=>startIsoFight(0,'pub'); inputState.overEl.hidden=false; inputState.againBtn.focus(); setInfo(); return;
  }
  if(state.venue==='port'){
    inputState.overTitle.textContent=state.winner===state.P?'WYGRANA — BÓJKA W PORCIE':'PRZEGRANA — BÓJKA W PORCIE';
    inputState.overStats.textContent='Rywal: Pijany doker';
    inputState.againFn=()=>startIsoFight(0,'port'); inputState.overEl.hidden=false; inputState.againBtn.focus(); setInfo(); return;
  }
  const S=state, win=S.winner===S.P, draw=!S.winner, ko=S.how!=='CZAS', O=S.opp, FA=S.P.c, FB=S.O.c, save=progressionState.save, endSta=S.P.rt.sta/S.P.rt.staCap;
  resetSessXP();
  { const st=save.stats, key='fight:'+S.venue+':'+S.idx, today=doneToday(key);
    const xp=fightXP({bare:true,stars:oppStars(O),outcome:win?(ko?'ko':'win'):(draw?'draw':'loss'),simulated:false,today,
      levelGap:(st.str.lvl+st.spd.lvl+st.end.lvl)/3-O.rank,landed:FA.landed,power:FA.power,knockdowns:S.O.kdN,
      evades:FA.evades,counters:FA.counters,minutes:S.elapsed/3600,blocks:FA.blocks,endSta,perfects:FA.perfects||0});
    for(const k of /** @type {('str'|'spd'|'end')[]} */ (['str','spd','end'])) if(xp[k]>0) addXP(k,xp[k]);
    save.train.count[key]=today+1; S.xpToday=today;
    const trial=takeFightTrial(S.idx,S.venue,oppStars(O));   // Profesor's trial on the yard
    S.trial=trial?{name:trial.def.name,task:trial.def.task,passed:trial.def.ok({win,ko,evades:FA.evades,minSta:FA.minSta})}:null;
    if(S.trial?.passed){ const [k,l]=trial.id.split(':'); passTrial(k,+l); } }
  countFight(S.venue+':'+S.idx); recordFight({win,draw,ko,bare:true,opp:O.title,venue:S.venue,how:S.how||''});
  const prisonRows=prisonFightEnd({win,draw,ko,rival:String(O.name).toLowerCase(),stars:oppStars(O),sec:Math.floor(S.elapsed/60),venue:S.venue,opp:S.idx,rigged:S.how==='KASTET',
    stats:{thrown:FA.thrown,landed:FA.landed,taken:FB.landed,minSta:FA.minSta,body:FA.body||0,evades:FA.evades,counters:FA.counters,blocks:FA.blocks,cuts:S.P.wounds.cuts||0,kdTaken:S.P.kdN,cards:false}});
  persist();
  inputState.overTitle.textContent=(win?'WYGRANA':(draw?'REMIS':'PRZEGRANA'))+' — '+S.how+' · bareknuckle';
  const acc=(/** @type {any} */ c)=>c.thrown?Math.round(100*c.landed/c.thrown)+'%':'—';
  inputState.overStats.innerHTML='<span>Rywal</span><span>'+O.title+'</span>'+
    (S.how==='KASTET'?'<span>Oszustwo</span><span><b style="color:#ff6a5a">kastet z łyżki w rękawie — wszyscy widzieli</b></span>':'')+
    '<span>Czas bójki</span><span>'+Math.floor(S.elapsed/60)+' s</span>'+
    '<span>Trafione / rzucone</span><span>'+FA.landed+'/'+FA.thrown+' ('+acc(FA)+') · rywal '+FB.landed+'/'+FB.thrown+' ('+acc(FB)+')</span>'+
    '<span>Mocne ciosy</span><span>'+FA.power+' · rywal '+FB.power+'</span>'+
    '<span>Na korpus</span><span>'+FA.body+' · rywal '+FB.body+'</span>'+
    '<span>Kontry</span><span>'+FA.counters+' · rywal '+FB.counters+'</span>'+
    '<span>Najlepsza seria</span><span>'+FA.bestRun+' '+(FA.bestRun===1?'cios':FA.bestRun>=2&&FA.bestRun<=4?'ciosy':'ciosów')+' z rzędu · rywal '+FB.bestRun+'</span>'+
    '<span>Najniższa kondycja</span><span>'+Math.round(100*FA.minSta)+'% · rywal '+Math.round(100*FB.minSta)+'%</span>'+
    (FA.finisher?'<span>Dobicie</span><span>'+FA.finisher+' '+(FA.finisher===1?'cios':'ciosy')+' w zatrzymanym czasie</span>':'')+
    '<span>Nokdauny</span><span>'+S.O.kdN+' · rywal '+S.P.kdN+'</span>'+
    '<span>Uniki / bloki</span><span>'+FA.evades+' / '+FA.blocks+' · rywal '+FB.evades+' / '+FB.blocks+'</span>'+
    prisonRows+
    (S.trial?'<span>Próba Profesora</span><span><b class="grade grade-'+(S.trial.passed?'A':'D')+'">'+(S.trial.passed?'ZDANA':'NIEZDANA')+'</b> · '+S.trial.task+'</span>':'')+
    '<span>Czyste momenty</span><span>'+(FA.perfects||0)+' · +'+Math.min(30,3*(FA.perfects||0))+'% XP</span>'+
    '<span>Doświadczenie</span><span>'+sessXPText()+' → '+statShort()+(S.xpToday?' · '+(S.xpToday+1)+'. walka z tym rywalem dziś':'')+'</span>';
  inputState.againFn=()=>startIsoFight(S.idx,S.venue);
  inputState.overEl.hidden=false; inputState.againBtn.focus();
  setInfo();
}

/** Blend two joint sets (functions of the side with .pel, .chest, .head) by k. @param {any} A @param {any} B @param {number} k */
function blendJoints(A,B,k){
  const m=(a,b)=>lerp3(a,b,k);
  const J={};
  for(const side of [-1,1]){
    const a=A(side),b=B(side);
    J[side]={
      hip:m(a.hip,b.hip),knee:m(a.knee,b.knee),foot:m(a.foot,b.foot),
      sh:m(a.sh,b.sh),el:m(a.el,b.el),hd:m(a.hd,b.hd),
      heelLift:(a.heelLift||0)*(1-k)+(b.heelLift||0)*k
    };
  }
  const f=(s)=>J[s];
  f.pel=m(A.pel,B.pel);
  const abdominal=(X)=>X.abd||X.belly||lerp3(X.pel,X.chest,0.48);
  f.abd=m(abdominal(A),abdominal(B));
  f.chest=m(A.chest,B.chest);
  f.head=m(A.head,B.head);

  // Direct vertex lerp shortens bones and can pull arms into the chest halfway
  // through standing up. Restore every length after blending the orientations.
  f.abd=fixBoneLength(f.pel,f.abd,RIG.lowerSpine);
  f.chest=fixBoneLength(f.abd,f.chest,RIG.upperSpine);
  f.head=fixBoneLength(f.chest,f.head,RIG.neckToHead);
  for(const side of [-1,1]){
    const j=J[side];
    j.hip=fixBoneLength(f.pel,j.hip,Math.hypot(RIG.hipHalf,RIG.hipHeight));
    j.sh=fixBoneLength(f.chest,j.sh,Math.hypot(RIG.shoulderHalf,RIG.shoulderHeight));
    [j.knee,j.foot]=solveLimb(j.hip,j.foot,LEG_U,LEG_L,j.knee);
    [j.el,j.hd]=solveLimb(j.sh,j.hd,ARM_U,ARM_L,j.el);
  }
  return f;
}

/** Side of the hand throwing a punch: its own hand, or the stance's default for that punch. @param {any} F @param {any} pk */
const strikeSide=(F,pk)=>pk.hand??(F.leadSide===-1?[-1,1,1,1][pk.pid]:HAND[pk.pid]);

/** A struck head's recoil over the seconds since the blow: a damped spring that peaks at 1 within a few frames, rebounds a little
 *  past rest and settles. @param {number} u */
function headSnap(u){ return u<0?0:Math.exp(-u/0.09)*Math.sin(u*34)/0.62; }

/** The joints of a fighter on his feet: stance, steps, punch, slip, guard, flinch, and the body's own secondary motion
 * (the chest and head lag a sudden move, the shoulders turn against the hips with every step, the arms swing). @param {any} F */
function fighterJoints(F, t=state.t, clinch=state.clinch){
  const mv=F.moving;
  const sw1=F.ft[1].sw?Math.sin(Math.PI*Math.min(1,F.ft[1].sw)):0;
  const sw2=F.ft[-1].sw?Math.sin(Math.PI*Math.min(1,F.ft[-1].sw)):0;
  const air=Math.max(sw1,sw2), stride=sw1-sw2;
  const dashU=F.dash?Math.max(0,Math.min(1,(t-F.dash.at)/DASH.duration)):0;
  const dash=F.dash?dashPose(dashU):{load:0,push:0,land:0};

  // Gameplay velocities control presentation only. The rig never controls hit
  // ranges or player position; shoes remain driven by the existing footwork.
  let bob=-1.05+0.10*Math.sin(t*2.1+F.seed)+0.18*air-0.85*dash.load
    -0.48*dash.land-(F.rt.sta<25?0.5:0);
  let lean=0.35+F.lagF*0.55+(mv?F.mf*0.3:0)
    +(F.dash?F.dash.fwd*1.05*dash.push:0);
  let lateral=F.lagS*0.65+(mv?F.ms*0.25:0)+stride*0.35
    +(F.dash?F.dash.side*0.75*dash.push:0);
  let lung=0, e=0, arm=0, follow=0, wind=0, eW=0, eH=0, eS=0, prog=-1;
  const pk=F.pk, D=pk?DRIVE[pk.pid]:null, hook=pk?.pid===2, upper=pk?.pid===3;
  if(pk){
    const T=punchT(F,pk.pid), striking=pk.t<T.hit;
    const k=striking?pk.t/T.hit:Math.max(0,1-(pk.t-T.hit)/(T.end-T.hit));
    e=striking&&(F===state.P||F===state.O)?punchSnap(k):smooth(Math.min(1,k));
    arm=striking?e:e*e; // fist retracts slightly ahead of the torso
    if(!striking&&k>0.6)follow=Math.sin(Math.PI*(1-k)/0.4);
    if((hook||upper)&&striking)wind=Math.sin(Math.PI*k);
    eW=eH=eS=e; prog=striking?k:2-k;
    if(pk.pid===1){ const C=CROSS_PHASE[striking?0:1]; eW=e**C.weight; eH=e**C.hip; eS=e**C.shoulder; arm=e**C.arm; }
    lean+=D.lean*eW;
    bob-=D.drop*eW+(upper?0.9:hook?0.2:0)*wind;
    lung=LUNGE[pk.pid]*eW;
    if(pk.whiff&&!striking){ const o=Math.sin(Math.PI*Math.min(1,(pk.t-T.hit)/(T.end-T.hit))); lean+=0.9*o; lung+=0.6*LUNGE[pk.pid]*o; bob-=0.35*o; }
    if(pk.low)bob-=0.80*eW; // crouch in the knees, not a collapsed spine
  }
  const ps=pk?strikeSide(F,pk):0;
  const su=(t-F.slipSince)/TUNING.slipActive;
  if(su>=0&&su<=1){
    const w=Math.sin(Math.PI*su);
    if(F.evKind==='in'){lean+=1.15*w;bob-=0.9*w;lateral+=0.45*F.evSide*w;}
    else if(F.evKind==='back'){lean-=1.25*w;bob-=0.75*w;lateral+=0.45*F.evSide*w;}
    else {lateral+=2.8*F.slipDir*w;lean+=0.6*F.evFwd*w;bob-=1.1*w;}
  }
  if(clinch){lean+=1.1;bob-=0.5;}
  const pop=Math.sin(Math.PI*(F.gPop||0))*F.gUp; bob-=0.35*pop;

  const body=F.hurtLow?bodyHitMotion(F.hurtT,F.hurtDuration,F.hurtPower,F.hurtBlocked):{fold:0,knees:0,cover:0};
  const fold=Math.min(1.15,body.fold), absorb=body.knees, cover=body.cover;
  const hitSide=F.hurtSide||0;
  lean+=0.1*fold;
  bob-=0.54*absorb;
  const h=F.hurtLow?0:Math.min(1,F.hurtT/0.3)*F.hurtPower;
  if(!F.hurtLow){
    lean-=(F.hurtDir===2?1.3:2.4)*h;   // overdrawn: the head and chest snap back well past a real recoil
    lateral+=(F.hurtDir===2?2.0*F.leadSide:0)*h;
    bob-=0.45*h;
  }
  if(F.stagger>0){lean-=0.8;bob-=0.6;}
  // Tiredness shows before the bar does: a heavy, quick breath in the knees, the trunk bent forward and a sway on the feet.
  const tire=F.finStun?1.25:F.tire||0;
  if(F.finStun){ const k=t*3.1+F.seed; lean-=0.7+0.6*Math.sin(k); lateral+=1.0*Math.sin(k*0.7); bob-=0.5+0.3*Math.sin(k*1.9); }   // out on his feet: he sways and lolls
  if(tire>0.01){bob-=(0.45+0.2*Math.sin(t*(5.5+2*tire)+F.seed))*tire;lean+=0.45*tire;lateral+=0.35*tire*Math.sin(t*1.7+F.seed);}
  const breathing=F.bull?.mode==='EXHAUSTED';
  if(breathing){lean+=2.1;bob-=1.25+0.28*Math.sin(t*9);lateral+=0.14*Math.sin(t*4);}
  const tl=pk?null:tellOf(F), TP=tl?TELL_POSE[tl.pid]:null, ts=tl?tl.hand:0;
  const tw=tl?smooth(Math.min(1,(t-tl.at)/Math.max(0.05,(tl.until-tl.at)*0.6))):0;   // loads over most of the tell, then holds
  if(TP){lean+=TP.lean*tw;bob-=(TP.drop+(tl.low?0.6:0))*tw;lateral+=TP.side*ts*tw;}

  // Anatomical pelvis, abdomen, ribcage and neck form one continuous chain.
  // The rotating pelvis and shoulders are sockets of that chain, not separate
  // animated points that can pull away from the body in a power punch.
  const bodySide=hook?-ps*e*0.4:(pk&&pk.low?ps*e:0);
  const walkRot=-stride*0.58-F.lagS*0.25, hipRot=stride*0.42;
  const asin=(v)=>Math.asin(Math.max(-1,Math.min(1,v)));
  const shoulderYaw=-asin(walkRot/2.7)
    -(D?ps*(D.yaw*eS*(1+0.18*follow)-(hook?0.4:upper?0.3:0)*wind):0)+(TP?ts*TP.yaw*tw:0);
  const hipYaw=-asin(hipRot*0.45/1.25)
    -(D?ps*(D.hip*eH-(hook||upper?0.15:0)*wind):0)+(TP?ts*TP.hip*tw:0);
  const tilt=D?D.tilt*eS+(upper?-0.6*wind:0):0;
  const feet={}, step=stepLegs(F);
  for(const side of [-1,1]){
    const f=footJoint(F,side);
    feet[side]=[f.fwd,f.side,RIG.footHeight+f.lift];
    if(step) feet[side]=lerp3(feet[side],step.feet[side],step.w);   // the mocap boxing step over the game's own footwork
  }
  if(step) bob+=step.bob*step.w;
  const pelvisHint=[lung*0.24-F.lagF*0.14,
    lateral*0.48-F.lagS*0.15,RIG.pelvisHeight+bob];
  const pelvis=supportPelvis(pelvisHint,feet,hipYaw);
  const {abdomen,chest}=buildSpine(pelvis,{
    lean:lean+lung*0.18,sideLean:lateral*0.22+bodySide*0.42+ps*tilt*0.14+hitSide*fold*0.12,
    fold,foldSide:hitSide,lunge:lung
  });
  const legs=legAnchors(pelvis,feet,hipYaw);
  const J={};
  for(const side of [-1,1]){
    const s=side, punching=!!D&&s===ps, leg=legs[s];
    const [knee,ankle]=solveLimb(leg.hip,leg.foot,LEG_U,LEG_L,leg.pole);
    const shrug=D?(punching?D.rise:-0.2*D.rise)*eS+s*ps*tilt*0.38:0;
    const sh=shoulderSocket(chest,s,shoulderYaw,shrug);

    // Shoulder-relative guard. Upper arms, forearms, hands and elbows follow
    // the ribcage through slips, lunges and body hits without changing length.
    const armSwing=-s*stride*0.45+F.lagF*0.35;
    // The resting stance is the mocap fight idle (src/mocap-stance.js) dropped to a Victorian guard: the lead fist out in front at
    // chest height, the rear one by the ribs. A raised block (gUp) lifts both fists to the face, so the two read apart.
    const idle=mocapIdle(t/IDLE_LOOP+F.seed), m=s*F.leadSide>0?idle.lead:idle.rear, y=F.leadSide===-1?-1:1;
    const mid=[chest[0]-0.2,chest[1],chest[2]+RIG.shoulderHeight-IDLE_DROP];
    let pole=[mid[0]+m.el[0]+armSwing*0.30,mid[1]+y*m.el[1],mid[2]+m.el[2]];
    let hand=[mid[0]+m.hd[0]+armSwing*0.7,mid[1]+y*m.hd[1],mid[2]+m.hd[2]];
    if(clinch){
      pole=[sh[0]+1.1,sh[1]+s*0.35,sh[2]-1.55];
      hand=[sh[0]+3.1,sh[1]-s*1.0,sh[2]-0.1];
    }
    if(F.gUp>0.02){
      pole=lerp3(pole,[sh[0]+0.7,sh[1]+s*0.12,sh[2]-1.48],F.gUp);
      hand=lerp3(hand,[sh[0]+2.7,sh[1]-s*1.58,sh[2]+1.85],F.gUp);
      if(pop>0.01){ hand=[hand[0]+0.4*pop,hand[1]-s*0.2*pop,hand[2]+0.7*pop]; pole=[pole[0],pole[1]-s*0.2*pop,pole[2]+0.3*pop]; }
    }
    if(tire>0.01&&!punching){ hand[2]-=1.3*tire; pole[2]-=0.5*tire; }   // the fists sag
    if(breathing){
      pole=[sh[0]+0.5,sh[1]+s*0.55,sh[2]-3.0];
      hand=[sh[0]+1.45,sh[1]+s*0.18,sh[2]-5.45];
    }
    if(TP&&s===ts){
      hand=[hand[0]+TP.hand[0]*tw,hand[1]+s*TP.hand[1]*tw,hand[2]+TP.hand[2]*tw];
      pole=[pole[0]+TP.pole[0]*tw,pole[1]+s*TP.pole[1]*tw,pole[2]+TP.pole[2]*tw];
    }
    if(punching){
      const target=strikeArmTargets(pk.pid,s,sh,hand,pole,arm,wind,pk.low);
      hand=target.hand;pole=target.pole;
    }
    if(cover>0.01&&!punching){
      const k=Math.min(0.82,cover*0.74);
      pole=lerp3(pole,[sh[0]+0.6,sh[1]-s*0.25,sh[2]-2.3],k);
      hand=lerp3(hand,[sh[0]+1.55,sh[1]-s*1.1,sh[2]-2.0],k);
    }
    const [elbow,fist]=solveLimb(sh,hand,ARM_U,ARM_L,pole);
    J[s]={hip:leg.hip,knee,foot:ankle,sh,el:elbow,hd:fist,
      heelLift:punching?Math.min(0.34,D.heel*eH*0.45):0};
  }
  const jf=(s)=>J[s];
  jf.pel=pelvis;
  jf.abd=abdomen;
  jf.chest=chest;

  // The head reacts with a short neck rather than teleporting independently.
  // This also preserves the slip and the lead-shoulder chin-cover silhouette.
  const headHint=[
    chest[0]+0.1+F.hLagF*0.48+(D?D.head[0]*eS:0)+0.58*fold,
    chest[1]+F.hLagS*0.40+bodySide*0.45
      +(D?ps*(D.head[1]*eS+(upper?0.6:0)*wind):0)+hitSide*fold*0.32,
    chest[2]+RIG.neckToHead-0.68*fold-0.48*F.gUp
      -(F.stagger>0?0.52:0)-(breathing?0.42:0)-0.4*tire
      -Math.abs(F.hLagF)*0.12
  ];
  if(!F.hurtLow){
    const hs=F.hurtT>0?headSnap(F.hurtDuration-F.hurtT)*F.hurtPower:0;   // the head whips on the neck: out past the chest, back past rest, settled
    headHint[0]-=(F.hurtDir===2?0.4:F.hurtDir===3?0.8:1.3)*hs;
    headHint[1]+=(F.hurtDir===2?1.3*F.leadSide:0)*hs;
    headHint[2]+=(F.hurtDir===3?0.6:0)*hs;
  }
  jf.head=headSocket(chest,headHint);
  return pk&&!pk.low&&prog>=0?withMocapPunch(F,jf,pk.pid,ps,prog):jf;
}

/** How much of a mocap punch is used: the trunk and head at most TRUNK, the punching arm fully only around contact
 *  (progress 0..1 strike, 1..2 recovery), so the punch starts from and returns to the game's high Victorian guard.
 *  armOut per punch: the jab's mocap fist drops at once after contact, so its arm goes back to the game's right away. */
const MOCAP_MIX={trunk:0.6,armIn:[0.45,0.85],armOut:[[1,1.15],[1.05,1.45],[1.05,1.45],[1.05,1.45]]};

/**
 * A punch's upper body from mocap (src/mocap-punches.js), retargeted onto this rig: the trunk, the head and the punching
 * arm take the mocap's bone directions on the rig's lengths. The legs (the game's footwork) and the guard arm stay
 * procedural; MOCAP_MIX says how much of each part is mocap at each moment. A punch with no take baked for its hand, or
 * to the body, stays procedural.
 * @param {any} F fighter @param {any} jf procedural joints @param {number} pid punch @param {number} ps punching side
 * @param {number} prog 0..1 strike, 1..2 recovery
 */
function withMocapPunch(F,jf,pid,ps,prog){
  const y=F.leadSide===-1?-1:1, M=mocapPunch(pid,ps*y>0,prog);
  if(!M)return jf;
  const X=MOCAP_MIX, ramp=(/** @type {number} */ v,/** @type {number} */ a,/** @type {number} */ b)=>smooth(Math.max(0,Math.min(1,(v-a)/(b-a))));
  const wt=X.trunk*(prog<=1?ramp(prog,0,0.5):1-ramp(prog,1.2,2));
  const wa=prog<=1?ramp(prog,X.armIn[0],X.armIn[1]):1-ramp(prog,X.armOut[pid][0],X.armOut[pid][1]);
  if(wt<=0&&wa<=0)return jf;
  const P=jf.pel;
  const put=(/** @type {number[]} */ v)=>[P[0]+v[0],P[1]+y*v[1],P[2]+v[2]];
  // The shoulder line keeps the mocap's turn and tilt but sits where the rig attaches it to the chest.
  const chest=put(M.chest), mc=put([0,1,2].map(c=>(M.lead.sh[c]+M.rear.sh[c])/2));
  const gc=[0,1,2].map(c=>(jf(-1).sh[c]+jf(1).sh[c])/2-jf.chest[c]), shift=[0,1,2].map(c=>chest[c]+gc[c]-mc[c]);
  const at=(/** @type {number[]} */ v)=>put(v).map((q,c)=>q+shift[c]);
  // Both arms keep the game's bones on the mocap's shoulders, turned with the shoulder line so a guard arm stays in front of
  // the chest however far the trunk turns; the trunk blend (wt) must not move the punching arm, which wa drives below.
  const msh={[-1]:at((-y>0?M.lead:M.rear).sh),[1]:at((y>0?M.lead:M.rear).sh)};
  const turn=Math.atan2(msh[1][1]-msh[-1][1],msh[1][0]-msh[-1][0])-Math.atan2(jf(1).sh[1]-jf(-1).sh[1],jf(1).sh[0]-jf(-1).sh[0]);
  const cs=Math.cos(turn), sn=Math.sin(turn), rot=(/** @type {number[]} */ v)=>[v[0]*cs-v[1]*sn,v[0]*sn+v[1]*cs,v[2]];
  const J={};
  for(const s of [-1,1]){
    const g=jf(s), sh=msh[s], el=add3(sh,rot(sub3(g.el,g.sh)));
    J[s]={...g,sh,el,hd:add3(el,rot(sub3(g.hd,g.el)))};
  }
  const out=blendJoints(jf,refitFigure(Object.assign((/** @type {number} */ s)=>J[s],{pel:P,abd:put(M.abd),chest,head:put(M.head)})),wt);
  // The punching arm alone: its bones turned towards the mocap's by wa, hung from the blended shoulder.
  const m=ps*y>0?M.lead:M.rear, o=out(ps), dir=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number[]} */ c,/** @type {number[]} */ d)=>lerp3(norm3(sub3(b,a)),norm3(sub3(d,c)),wa);
  o.el=move3(o.sh,dir(o.sh,o.el,put(m.sh),put(m.el)),ARM_U);
  o.hd=move3(o.el,dir(o.el,o.hd,put(m.el),put(m.hd)),ARM_L);
  return out;
}
const sub3=(/** @type {number[]} */ a,/** @type {number[]} */ b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add3=(/** @type {number[]} */ a,/** @type {number[]} */ b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const norm3=(/** @type {number[]} */ v)=>{const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l];};
const move3=(/** @type {number[]} */ a,/** @type {number[]} */ v,/** @type {number} */ d)=>{const n=norm3(v);return [a[0]+n[0]*d,a[1]+n[1]*d,a[2]+n[2]*d];};

/** The punch F is showing before he throws it: the rival's tell, or the heavy rival's windup. @param {any} F */
function tellOf(F){
  const b=F.bull;
  if(b?.mode==='WINDUP') return {pid:b.pid,low:false,at:b.at??-Infinity,until:b.until,hand:punchHand(F,b.pid),chain:false};
  return F.tell;
}

/**
 * Getting up from the boards (src/mocap-stance.js) over the stance he will stand in: from the ragdoll's last pose into the clip,
 * the clip itself (it starts where the ragdoll's pelvis lies and ends over his feet), then into the fighting pose J.
 * Southpaws are mirrored. Presentation only: the rules stood him up already.
 * @param {any} F @param {any} J the fighting pose he rises into
 */
function risingJoints(F,J){
  const t=Math.min(1,F.rise.t), u=Math.max(0,Math.min(1,(t-0.08)/0.8)), y=F.leadSide===-1?-1:1, R=F.rise.joints;
  const M=mocapGetUp(u), M0=mocapGetUp(0), k=1-smooth(u), off=[(R.pel[0]-M0.pel[0])*k,(R.pel[1]-y*M0.pel[1])*k,0];
  const put=(/** @type {number[]} */ v)=>[v[0]+off[0],y*v[1]+off[1],v[2]];
  const side={};
  for(const s of [-1,1]){ const m=M(s*y); side[s]={hip:put(m.hip),knee:put(m.knee),foot:put(m.foot),sh:put(m.sh),el:put(m.el),hd:put(m.hd)}; }
  const clip=Object.assign((/** @type {number} */ s)=>side[s],{pel:put(M.pel),abd:put(M.abd),chest:put(M.chest),head:put(M.head)});
  const into=blendJoints(R,clip,smooth(Math.min(1,t/0.1)));
  return blendJoints(into,J,smooth(Math.max(0,(t-0.86)/0.14)));
}

/** Draw one fighter as the hub figure: on his feet, getting up (from the ragdoll's last pose to his stance) or as a ragdoll on the boards. @param {any} F */
function drawFighter(F){
  if((F.ko||F.down)&&F.rd){ figureHD(F,ragdollJoints(F),F.look,{pose:0,base:0,noShadow:true,light:true,tilt:true}); return; }
  const v=F.vib>0?(F.vib&1?1:-1)*0.08*Math.min(1,F.vib/4):0;   // the struck man trembles along the blow during the hit-stop
  F.i+=F.vibI*v; F.j+=F.vibJ*v;
  let jf=fighterJoints(F);
  if(F.rise) jf=risingJoints(F,jf);
  const fist=fistCue(F);
  figureHD(F,jf,F.look,{pose:0,base:0,noShadow:!!F.rise,light:state.venue!=='sandy',tilt:!!F.rise||!!F.pk?.low||F.pk?.pid===2||F.pk?.pid===3||F.hurtT>0,fist:fist||undefined});
  if(fist) appearanceState.PAL.set(fist.saved,fist.rp*3);
  F.i-=F.vibI*v; F.j-=F.vibJ*v;
}

/** The fist under a tell flushes deep red and swells a little as the punch gathers. */
const TELL_RED=[rgb('#4a1210'),rgb('#8a231c'),rgb('#b03a2c')];
/** The rival's cue before a punch: the fist he will throw grows and reddens over the tell. It borrows the hit-flash ramp (unused in
 *  this scene) for his skin blended to red; the caller restores the ramp from `saved` after drawing.
 * @param {any} F @returns {{side:number,grow:number,rp:number,saved:Uint32Array}|null} */
function fistCue(F){
  const tl=state.phase==='fight'&&!F.pk&&!F.ko&&!F.down?tellOf(F):null; if(!tl) return null;
  const u=smooth(Math.max(0,Math.min(1,(state.t-tl.at)/Math.max(0.05,tl.until-tl.at)))); if(u<=0) return null;
  const A=appearanceState, rp=A.R_FLASH, near=((F.fi||0)-(F.fj||0))>=0?1:-1, sk=F.look.sk[tl.hand===near?0:1], saved=A.PAL.slice(rp*3,rp*3+3), red=0.6*u;
  for(let j=0;j<3;j++) A.PAL[rp*3+j]=mixC(A.PAL[sk*3+j],TELL_RED[j],red);
  return {side:tl.hand,grow:0.28*u,rp,saved};
}

/** Blend two packed colours. @param {number} a @param {number} b @param {number} t */
function mixC(a,b,t){
  const ch=(/** @type {number} */ sh)=>Math.round(((a>>>sh)&255)+(((b>>>sh)&255)-((a>>>sh)&255))*t)<<sh;
  return (0xff000000|ch(16)|ch(8)|ch(0))>>>0;
}

/** A DEBUG-only consumer receives real joint coordinates and metrics for the
 * frozen frame. No mutation, and no dependence on the rendering camera.
 * @param {'player'|'opponent'} [which] */
export function combatRigSnapshot(which='player'){
  const F=which==='opponent'?state.O:state.P;
  if(!F)return null;
  let J=(F.rd&&(F.ko||F.down))?ragdollJoints(F):fighterJoints(F);
  if(F.rise)J=risingJoints(F,J);
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  const angle=(a,b,c)=>elbowAngle(a,b,c);
  const side=(s)=>{
    const b=J(s);
    return {
      joints:{hip:b.hip,knee:b.knee,ankle:b.foot,shoulder:b.sh,elbow:b.el,hand:b.hd},
      upperArm:+dist(b.sh,b.el).toFixed(3),
      forearm:+dist(b.el,b.hd).toFixed(3),
      upperLeg:+dist(b.hip,b.knee).toFixed(3),
      lowerLeg:+dist(b.knee,b.foot).toFixed(3),
      elbowAngle:+angle(b.sh,b.el,b.hd).toFixed(1),
      kneeAngle:+angle(b.hip,b.knee,b.foot).toFixed(1),
      footHeight:+b.foot[2].toFixed(3)
    };
  };
  return {
    fighter:which,venue:state.venue,down:!!F.rd,
    strike:F.pk?{id:F.pk.pid,low:!!F.pk.low,t:+F.pk.t.toFixed(4),hand:F.pk.hand}:null,
    pelvis:J.pel,abdomen:J.abd,chest:J.chest,head:J.head,
    lowerSpine:+dist(J.pel,J.abd||J.pel).toFixed(3),
    upperSpine:+dist(J.abd||J.pel,J.chest).toFixed(3),
    neck:+dist(J.chest,J.head).toFixed(3),
    hipSpan:+dist(J(-1).hip,J(1).hip).toFixed(3),
    shoulderSpan:+dist(J(-1).sh,J(1).sh).toFixed(3),
    left:side(-1),right:side(1)
  };
}

export const WARD_SPAR_SPEED=0.6;

/** Create a presentation-only fighter using the same pose and footwork as the brawl. @param {any} C */
export function createWardSparFighter(C){
  return makeFighter(C.i,C.j,C.fi,C.fj,cnLookHD(C),fn=>fn(),{hpMax:100,staCap:100,pow:1,regen:1},{stunDealt:1,stunTaken:1});
}

/** Update the Ward spectator's shared fight pose without changing combat state. @param {any} F @param {any} C @param {any} partner */
export function updateWardSparFighter(F,C,partner){
  const now=boxingState.tick*WARD_SPAR_SPEED/60, names=['jab','cross','hook','upper'], pid=names.indexOf(C.pk);
  F.i=C.i; F.j=C.j; F.fi=C.fi; F.fj=C.fj; F.moving=C.moving; F.mf=C.sparMove||0; F.ms=0;
  F.pk=pid<0?null:{pid,t:C.pt/60,low:false,hand:C.pside};
  if(C.sparDodge&& !F.sparDodging){ F.slipSince=now; F.slipDir=C.name==='Reuben'?1:-1; F.evKind='slip'; F.evFwd=0; }
  F.sparDodging=!!C.sparDodge;
  F.hurtT=Math.max(0,F.hurtT-WARD_SPAR_SPEED/60);
  if(partner?.step?.k==='spar'&&partner.pk&&partner.pt===7&&!C.sparDodge){ F.hurtT=F.hurtDuration=.3; F.hurtDir=names.indexOf(partner.pk); F.hurtLow=false; F.hurtPower=1; }
  tickFeet(F,WARD_SPAR_SPEED,now);
}

/** Start a presentation-only knockdown without changing the active fight. @param {any} F @param {number} pid */
export function startWardSparKnockdown(F,pid){ startIsoRagdoll(F,null,pid,true); F.sparDownJoints=null; }

/** Advance the Ward knockdown and keep its owner at the ragdoll's pelvis. @param {any} F @param {any} C @param {number} elapsed */
export function tickWardSparKnockdown(F,C,elapsed){
  if(elapsed<100){ stepIsoRagdoll(F); C.i=F.i; C.j=F.j; }
  else if(!F.sparDownJoints) F.sparDownJoints=ragdollJoints(F);
}

/** Draw the fall, then ease the joints into the Ward's lying pose. @param {any} F @param {number} elapsed */
export function drawWardSparKnockdown(F,elapsed){
  const liePoint=([f,s,z])=>[z-9,s,3+f*0.45];
  const side=s=>{ const j={hip:[0,s*1.2,7.2],knee:[0.3,s*1.25,3.8],foot:[0,s*1.3,0.9],sh:[0.1,s*2.7,12.4],el:[-0.1,s*3.4,9.9],hd:[0.3,s*3.3,7.7]}; for(const k in j) j[k]=liePoint(j[k]); return j; };
  side.pel=liePoint([0,0,6.6]); side.chest=liePoint([0.3,0,12.2]); side.head=liePoint([0.35,0,15.6]);
  const from=F.sparDownJoints||ragdollJoints(F), joints=blendJoints(from,side,smooth(Math.max(0,Math.min(1,(elapsed-100)/60))));
  figureHD(F,joints,F.look,{pose:0,base:0,noShadow:true,light:true,tilt:true});
}

/** Draw the Ward fighter with the brawl's joints, independent of its simulation clock. @param {any} F */
export function drawWardSparFighter(F){
  const joints=fighterJoints(F,boxingState.tick*WARD_SPAR_SPEED/60,false);
  figureHD(F,joints,F.look,{pose:0,base:0,light:true,tilt:!!F.pk||F.hurtT>0});
}

/** The picture font has capitals, digits and a few marks only. @param {string} s */
function plain(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[·—–]/g,'-').toUpperCase(); }

/** Native-pixel rectangle in the 2× frame. @param {number} x @param {number} y @param {number} w @param {number} h @param {number} c */
function rect(x,y,w,h,c){ const K=gymState.ISO_K, W=appearanceState.W, fb=rendererState.fb; for(let yy=y*K;yy<(y+h)*K;yy++) for(let xx=x*K;xx<(x+w)*K;xx++){ if(xx<0||yy<0||xx>=W||yy>=appearanceState.H) continue; fb[yy*W+xx]=c; } }

/** A health and breath bar with a dark frame. @param {number} x @param {number} y @param {number} w @param {any} F @param {boolean} right */
function bars(x,y,w,F,right){
  const A=appearanceState, hp=F.rt.hp/F.rt.hpMax, sta=F.rt.sta/F.rt.staCapInitial, cap=F.rt.staCap/F.rt.staCapInitial;
  const fat=Math.min(1,(F.rt.evadeFatigue||0)*0.28+F.rt.zone*0.35), gassed=F.rt.zone===2&&(boxingState.tick&16);
  const staCol=gassed?A.C_RED:fat>0?mix(A.C_SPARK,A.C_RED,fat*0.65):A.C_SPARK;   // the breath bar warms as evading or tiredness wears him out; gassed, it blinks red
  rect(x-1,y-1,w+2,9,A.C_OUT);
  const fill=(/** @type {number} */ yy,/** @type {number} */ hh,/** @type {number} */ k,/** @type {number} */ c)=>{ const n=Math.round(w*Math.max(0,Math.min(1,k))); rect(right?x+w-n:x,yy,n,hh,c); };
  fill(y,4,hp,A.C_RED);
  rect(x,y+5,w,3,0xff2a2418); fill(y+5,3,cap,0xff4a4230); fill(y+5,3,sta,staCol);
}

/** A fighter's HUD portrait: the painted, living bust of the hero or Harry (fight-portraits.js), else his head model rendered once.
 * @param {any} F @param {boolean} hero @returns {{ink:any,buf:Uint32Array}|{head:Uint32Array}} */
function fightPortrait(F,hero){
  if(hasPainted(F,hero)){ let ink=null; F.wrap(()=>{ ink=portraitInks(F.look,appearanceState.PAL,hero); }); return {ink,buf:new Uint32Array(PW*PH)}; }
  const W=appearanceState.W, H=appearanceState.H, buf=new Uint32Array(W*H), previous=setFramebuffer(buf);
  const C={i:5,j:5,fi:0.7071,fj:0.7071}, J=(s)=>({hip:[0,s*1.2,7],knee:[0,s*1.2,4],foot:[0,s*1.2,1],sh:[0,s*2.5,12],el:[0,s*2.5,10],hd:[0,s*1.5,13]});
  J.pel=[0,0,7]; J.chest=[0,0,12]; J.head=[0,0,16];
  try{ F.wrap(()=>figureHD(C,J,F.look,{noShadow:true})); } finally { setFramebuffer(previous); }
  const cx=Math.round(isoX(C.i,C.j)), cy=Math.round(isoY(C.i,C.j,15.4));
  const portrait=new Uint32Array(12*14);
  for(let y=0;y<14;y++) for(let x=0;x<12;x++){ const sx=cx+x-6, sy=cy+y-6; if(sx>=0&&sy>=0&&sx<W&&sy<H) portrait[y*12+x]=buf[sy*W+sx]; }
  return {head:portrait};
}

/** Paint a framed portrait beside the bars. @param {any} entry from fightPortrait @param {number} x @param {number} phase 0 left, 1 right @param {any} F */
function drawFightPortrait(entry,x,phase,F){
  const K=gymState.ISO_K, W=appearanceState.W, fb=rendererState.fb;
  rect(x,4,16,18,appearanceState.C_OUT); rect(x+1,5,14,16,0xff30241c);
  if(entry.ink){
    paintPortrait(entry.buf,entry.ink,portraitPose(F,state.t,phase?1:-1));
    for(let y=0;y<16*K;y++){ const sy=Math.floor(y*PH/(16*K)); for(let xx=0;xx<14*K;xx++) fb[(5*K+y)*W+(x+1)*K+xx]=entry.buf[sy*PW+Math.floor(xx*PW/(14*K))]; }
    return;
  }
  const portrait=entry.head;
  const bob=Math.round(Math.sin(state.t*2+phase)*0.65);
  for(let y=0;y<16*K;y++) for(let xx=0;xx<14*K;xx++){
    const sx=Math.floor(xx*12/(14*K)), sy=Math.floor((y-bob)*14/(16*K));
    if(sy<0||sy>=14) continue;
    let c=portrait[sy*12+sx]; if(!c) continue;
    if(F.look.style!=='hood'){
      const bruise=(sx>=3&&sx<=4&&(F.faceDamage>=12||F.wounds.eyeR))||(sx>=7&&sx<=8&&(F.faceDamage>=24||F.wounds.eyeL));
      if(bruise&&sy===7) c=mix(c,rgb('#633d58'),0.65);
      if(F.wounds.nose&&sx===6&&sy>=9&&sy<=11) c=rgb(sy===11?'#7c241e':'#b53528');
    }
    fb[(5*K+y)*W+(x+1)*K+xx]=c;
  }
}

/** Boxing stance, body units [forward, side]: the lead foot (side +1) in front, the rear one behind, wide apart. */
const STANCE={1:[1.5,1.7],'-1':[-1.3,-1.7]};
const SWING=7, STEP_AT=0.17, STEP_LEAD=0.28;

/** World position of a body-local point of fighter F. @param {any} F @param {number} fwd @param {number} side */
function world(F,fwd,side){ return {i:F.i+(fwd*F.fi-side*F.fj)/7.5,j:F.j+(fwd*F.fj+side*F.fi)/7.5}; }
/** Where foot s belongs under the body now. @param {any} F @param {number} s */
function stance(F,s){ const [f]=STANCE[s*F.leadSide], sd=s*1.7; return world(F,f,sd); }

/** Footwork: the feet stay planted; the foot on the side we are going to steps first, the other one drags into the stance
 * (forward: lead foot, back: rear foot, left or right: the foot on that side). Only one foot is in the air at a time. @param {any} F */
function tickFeet(F,scale=1,now=state.t){
  const inv=scale>1e-3?1/scale:1, vi=(F.i-F.li)*inv, vj=(F.j-F.lj)*inv; F.li=F.i; F.lj=F.j;   // speeds in the fight's own time, so slow motion does not stall the footwork
  { // the chest and head lag a change of speed (start, stop, a shove, a slip): springs driven by the acceleration, so steady walking leaves no lean behind
    const vf=(vi*F.fi+vj*F.fj)*7.5, vs=(vi*-F.fj+vj*F.fi)*7.5, af=vf-F.pvf, as=vs-F.pvs; F.pvf=vf; F.pvs=vs;
    const su=(now-F.slipSince)/TUNING.slipActive, kick=su>=0&&su<0.2?-F.slipDir*0.1:0;
    F.lagVF+=((-af*2.6-F.lagF*0.28)-F.lagVF*0.34)*scale; F.lagVS+=((-as*2.6+kick-F.lagS*0.28)-F.lagVS*0.34)*scale;
    F.lagF=Math.max(-1.4,Math.min(1.4,F.lagF+F.lagVF*scale)); F.lagS=Math.max(-1.4,Math.min(1.4,F.lagS+F.lagVS*scale));
    F.hLagF+=(F.lagF*1.25-vf*0.4-F.hLagF)*0.22*scale; F.hLagS+=(F.lagS*1.25-vs*0.4-F.hLagS)*0.22*scale;
  }
  const sp=Math.hypot(vi,vj), mi=sp>1e-4?vi/sp:0, mj=sp>1e-4?vj/sp:0;
  tickStepClip(F,vi,vj,scale);
  const A=F.ft[1], B=F.ft[-1];
  for(const s of [1,-1]){ const f=F.ft[s];
    if(f.sw>0){ f.sw=Math.min(1,f.sw+scale/(F.dash?5:F.bull?SWING*1.2:SWING));
      // The landing spot was captured when the shoe left the ground, not chased each frame.
      if(f.sw>=1){ f.sw=0; f.i=f.to.i; f.j=f.to.j; f.from=null; } } }
  if(A.sw>0||B.sw>0||F.ko) return;
  const cand=[];
  for(const s of [1,-1]){ const f=F.ft[s], T=stance(F,s), di=f.i-T.i, dj=f.j-T.j, along=di*mi+dj*mj, perp=Math.hypot(di-along*mi,dj-along*mj), d=along<0?Math.hypot(along,perp):perp;   /* a foot already ahead of its place is not late */
    // Never snap a lagging foot to its stance: catch up with another actual step.
    cand.push({s,d,score:(STANCE[s*F.leadSide][0]*(mi*F.fi+mj*F.fj)+s*1.7*(mi*-F.fj+mj*F.fi))+d});
  }
  if(!cand.some(c=>c.d>STEP_AT)) return;   /* one foot is late: of the two that are at all behind, the one on the side of the move goes first */
  cand.splice(0,cand.length,...cand.filter(c=>c.d>STEP_AT*0.45));
  cand.sort((a,b)=>b.score-a.score);
  const f=F.ft[cand[0].s]; f.sw=scale/(F.dash?5:F.bull?SWING*1.2:SWING); f.from={i:f.i,j:f.j};
  const T=stance(F,cand[0].s), ahead=Math.min(.43,STEP_LEAD+sp*3.2), ti=T.i+mi*ahead, tj=T.j+mj*ahead;
  const dx=ti-f.i, dy=tj-f.j, len=Math.hypot(dx,dy)||1, limit=F.dash?.72:.56;
  f.to={i:f.i+dx*Math.min(1,limit/len),j:f.j+dy*Math.min(1,limit/len)};
}

/**
 * The mocap boxing step the legs show (src/mocap-steps.js): forward or back by the body's forward speed, the side step by the
 * sideways one (a step towards the lead side is the right step played backwards: lead foot first, rear foot dragged after). The
 * phase follows the distance covered, so a planted shoe stays put; the weight fades in while he moves and out when he stops.
 * @param {any} F @param {number} vi @param {number} vj world speed per fight tick @param {number} scale
 */
function tickStepClip(F,vi,vj,scale){
  const vf=(vi*F.fi+vj*F.fj)*7.5, vs=(vi*-F.fj+vj*F.fi)*7.5*(F.leadSide===-1?-1:1), v=Math.hypot(vf,vs);   // vs: + towards the lead side
  const moving=v>0.02&&!F.dash&&!F.ko&&!F.down&&!state.clinch;
  if(moving){
    F.stepKind=Math.abs(vf)>=Math.abs(vs)?(vf>0?'forward':'back'):'right'; F.stepRev=F.stepKind==='right'&&vs>0;
    const T=stepTravel(F.stepKind), along=Math.abs(F.stepKind==='right'?vs:vf);
    F.stepU=(F.stepU||0)+along/Math.hypot(T[0],T[1]);
  }
  F.stepW=(F.stepW||0)+((moving?1:0)-(F.stepW||0))*Math.min(1,0.3*scale);
}

/** The mocap step's feet for F (body-local [forward, side, height] by side), placed on F's own stance, and the pelvis' rise and
 *  fall, or null when he is not stepping. @param {any} F */
function stepLegs(F){
  if(!F.stepKind||!(F.stepW>0.01)) return null;
  const y=F.leadSide===-1?-1:1, u=F.stepRev?1-(F.stepU%1):F.stepU, M=mocapStep(F.stepKind,u), M0=mocapStep(F.stepKind,0);
  /** @type {Record<number,number[]>} */ const feet={};
  for(const s of [-1,1]){ const k=s*y>0?'lead':'rear', st=STANCE[s*y], m=M[k].foot, m0=M0[k].foot;
    feet[s]=[m[0]-m0[0]+st[0],y*(m[1]-m0[1])+s*1.7,m[2]]; }
  return {feet,bob:M.pel[2]-M0.pel[2],w:F.stepW};
}

/** Foot s of F as a body-local joint [forward, side, height] and its air progress 0..1. @param {any} F @param {number} s */
function footJoint(F,s){
  const f=F.ft[s]; let i=f.i, j=f.j, lift=0, u=0;
  if(f.sw>0&&f.from){ u=Math.min(1,f.sw); const e=u*u*(3-2*u); i=f.from.i+(f.to.i-f.from.i)*e; j=f.from.j+(f.to.j-f.from.j)*e; lift=(F.dash?1.5:1.05)*Math.sin(Math.PI*u); }
  const di=(i-F.i)*7.5, dj=(j-F.j)*7.5;
  return {fwd:di*F.fi+dj*F.fj,side:di*-F.fj+dj*F.fi,lift,u};
}

/* RAGDOLL. A knocked-down fighter is a Verlet skeleton in room space (i, j in tiles, z in body units): 12 nodes joined by the bones he
   was standing with, falling under gravity onto the boards and sliding against the walls and furniture (hubBlocked). The pelvis
   carries the fighter's position, so the camera, the speech bubbles and the depth sorter keep working.
   Nodes: 0 pelvis, 1 chest, 2 head, 3 knee, 4 foot, 5 knee, 6 foot, 7 elbow, 8 hand, 9 elbow, 10 hand, 11 belly (the middle of the spine: the torso folds there; 3-4 and 7-8 are side +1). */
/** Put a fighter into the ragdoll from the pose he stands in, with the blow's push (away from attacker A). @param {any} F @param {any} A @param {number} pid @param {boolean} ko */
function startIsoRagdoll(F,A,pid,ko){
  const J=fighterJoints(F), a=J(1), b=J(-1), loc=[J.pel,J.chest,J.head,a.knee,a.foot,b.knee,b.foot,a.el,a.hd,b.el,b.hd,J.abd||J.pel.map((v,k)=>(v+J.chest[k])/2)];
  let af=-1, as=0; if(A){ const [ui,uj]=toward(A,F); af=ui*F.fi+uj*F.fj; as=ui*-F.fj+uj*F.fi; }
  if(pid===2){ const side=A?.pk?.hand||1; af*=0.25; as=side; }
  const sp=ko?0.75:0.62, kick=pid===3?0.3:0.1, gut=!!A?.pk?.low;   // a body blow caves the belly in while the chest and head fold forward over the fist
  const nodes=loc.map(([f,s,z],k)=>{
    const w=world(F,f,s), m=gut?(k===11?1.5:k===0?0.9:k===1?-0.15:k===2?0.05:k>=7&&k<=10?0.6:0.3):k===11?0.7:k===2?1.35:k===1?0.95:k===0?0.45:k>=7?1.1:0.15;
    const vf=af*sp*m+rnd(-0.03,0.03), vs=as*sp*m+rnd(-0.03,0.03), vi=(vf*F.fi-vs*F.fj)/7.5, vj=(vf*F.fj+vs*F.fi)/7.5, vz=k<=2||k===11?kick*m:0;
    return {i:w.i,j:w.j,z,pi:w.i-vi,pj:w.j-vj,pz:z-vz};
  });
  const len=ragdollLengths(loc);
  F.rd={nodes,len,thud:false,steps:0}; F.rise=null; if(A&&!state.fin){ state.kdSlow=3.8; if(state.venue!=='sandy'){ startKnockdownComic(F===state.P?0:1,pid,!!A.pk?.low,state.venue); recordKnockdownFrame(); } }
}

/** One 60 Hz step of the ragdoll. @param {any} F */
function stepIsoRagdoll(F){
  stepRagdoll(F.rd,{blocked:fightBlocked,onThud:vz=>{ sfxLand(Math.min(1.5,-vz*1.3)); boxingState.shakeT=boxingState.shakeDur=5; boxingState.shakeAmp=1; boxingState.shakeAxis=1; }});   // the first heavy landing of the chest
  const pel=F.rd.nodes[0]; if(!fightBlocked(pel.i,pel.j)){ F.i=pel.i; F.j=pel.j; F.li=F.i; F.lj=F.j; }
}

/** The ragdoll as joints in the body coordinates figureHD draws; the hip and shoulder lines follow the spine. @param {any} F */
function ragdollJoints(F){ return ragdollJointsIn(F.rd.nodes,F,RIG.hipHalf,RIG.shoulderHalf); }

/** Back on his feet where he lay: the pose he got up from fades into his stance. @param {any} F */
function stopIsoRagdoll(F){
  if(!F.rd) return;
  F.rise={joints:ragdollJoints(F),t:0}; F.rd=null; F.li=F.i; F.lj=F.j;
  for(const s of [1,-1]) Object.assign(F.ft[s],stance(F,s),{sw:0,from:null,to:null});
}

const BLOOD=rgb('#7a121a'), BLOOD_DRY=rgb('#38090e'), BLOOD_HI=rgb('#98222b');
const DUST=rgb('#8c8170');
const SWEAT_MIST=rgb('#586a74'), SWEAT_DROP=rgb('#7c909a'), SWEAT_FLOOR=rgb('#181a1e');
const rnd=(/** @type {number} */ a,/** @type {number} */ b)=>a+Math.random()*(b-a);

/** Throw sweat on damaging hits, more as the stamina runs out; blood replaces it on head blows below 60% health and grows as health falls.
 * @param {any} A @param {any} D @param {number} pid @param {boolean} low @param {boolean} blocked @param {{damage:number,counter:boolean}} o @param {boolean} [ko] */
function spray(A,D,pid,low,blocked,o,ko){
  const [ui,uj]=toward(A,D), si=-uj, sj=ui, pose=fighterJoints(D), z0=low?pose.abd[2]+0.6:pose.head[2]-0.5, hpF=D.rt.hp/D.rt.hpMax, swing=pid===2?1:0, heavy=pid>=1||o.counter||!!ko;
  const fire=(/** @type {'mist'|'sweat'|'blood'} */ kind,/** @type {number} */ n,/** @type {number} */ power)=>{
    const mist=kind==='mist';
    for(let k=0;k<n;k++){
      const along=rnd(mist?0.25:0.45,mist?0.85:1.25)*power, across=rnd(-0.85,0.85)*(pid<=1?0.22:0.8+swing*0.5)*power+swing*0.55*power, sp=mist?0.016:0.021;
      state.parts.push({kind,i:D.i+ui*0.08+rnd(-0.04,0.04),j:D.j+uj*0.08+rnd(-0.04,0.04),z:z0+rnd(-0.8,0.8),vi:(ui*along+si*across)*sp,vj:(uj*along+sj*across)*sp,
        vz:pid===3&&!low?rnd(0.45,0.95)*power:rnd(0.15,0.65)*(0.5+power*0.45),size:kind==='blood'&&heavy&&Math.random()<0.28?2:1,
        age:0,maxAge:mist?10+(Math.random()*8|0):999,creep:0,host:null,df:0,ds:0,pi:D.i,pj:D.j,pz:z0}); } };
  if(blocked||o.damage<=0) return;
  if(hpF>=0.6&&!ko||low&&!ko){   // sweat thrown off along the blow: a drop or two off a fresh man, a spray off a spent one
    const tired=1-Math.max(0,Math.min(1,D.rt.sta/D.rt.staCapInitial));
    fire('sweat',Math.round((1+pid*0.5+(o.counter?1:0))*(1+tired*4)),0.9+pid*0.15+tired*0.2);
    const mist=Math.round(tired*tired*(4+pid*2)); if(mist) fire('mist',mist,0.85+pid*0.15);
  } else {
    D.bleed=true;
    const amount=0.4+0.6*Math.max(0,1-hpF/0.6);
    fire('blood',Math.max(1,Math.round((ko?16:3+pid*3+(o.counter?4:0))*amount)),ko?1.45:1+0.18*pid);
    if(ko) D.spurt={t:34,ui,uj,si,sj};
  }
}

/** Dust kicked up by the shoes of a fighter sliding back from a blow. @param {any} F @param {number} di @param {number} dj */
function kickDust(F,di,dj){
  for(const s of [1,-1]){ if(Math.random()<0.5) continue; const f=F.ft[s];
    state.parts.push({kind:'dust',i:f.i+rnd(-0.05,0.05),j:f.j+rnd(-0.05,0.05),z:0.3,vi:-di*rnd(0.004,0.012)+rnd(-0.006,0.006),vj:-dj*rnd(0.004,0.012)+rnd(-0.006,0.006),
      vz:rnd(0.12,0.3),size:Math.random()<0.4?2:1,age:0,maxAge:14+(Math.random()*8|0),creep:0,host:null,df:0,ds:0,pi:f.i,pj:f.j,pz:0.3}); }
}

/** The blood that keeps jetting from a finished fighter: pulses from the head, arcing away from the attacker and fading out. @param {any} F @param {number} scale */
function tickSpurt(F,scale){
  const S=F.spurt; if(!S) return;
  S.t-=scale; if(S.t<=0){ F.spurt=null; return; }
  const h=F.rd?F.rd.nodes[2]:(()=>{const j=fighterJoints(F),w=world(F,j.head[0],j.head[1]);return {...w,z:j.head[2]};})(), fade=Math.min(1,S.t/12), pulse=0.55+0.45*Math.sin(S.t*0.9), n=1+Math.round(3*pulse*fade);
  for(let k=0;k<n;k++){
    const along=rnd(0.9,1.9)*(0.5+0.5*pulse)*(0.6+0.4*fade), across=rnd(-0.55,0.55), sp=0.021;
    state.parts.push({kind:'blood',i:h.i,j:h.j,z:h.z,vi:(S.ui*along+S.si*across)*sp,vj:(S.uj*along+S.sj*across)*sp,vz:rnd(0.3,0.85)*(0.5+0.5*pulse),size:Math.random()<0.3?2:1,
      age:0,maxAge:999,creep:0,host:null,df:0,ds:0,pi:h.i,pj:h.j,pz:h.z});
  }
}

/** A drop that creeps down the face first (a cut that keeps bleeding, a tired sweat) and only then lets go. @param {any} F @param {'sweat'|'blood'} kind */
function drip(F,kind){
  const face=fighterJoints(F).head, df=face[0]/7.5+rnd(0.08,0.13), ds=face[1]/7.5+rnd(-0.05,0.05);
  const z=face[2]+(kind==='blood'?rnd(-1.25,-0.2):rnd(-0.65,0.25)), i=F.i+F.fi*df-F.fj*ds, j=F.j+F.fj*df+F.fi*ds;
  state.parts.push({kind,i,j,z,vi:F.fi*0.002,vj:F.fj*0.002,vz:0,size:1,age:0,maxAge:999,creep:14+(Math.random()*8|0),host:F,df,ds,pi:i,pj:j,pz:z});
}

/** Fly the mist and the drops; a fast drop splashes small on the boards; blood that lands stays as a stain, sweat leaves a faint wet spot. */
function tickParts(scale=1){
  const S=state, live=[], [bw,bh]=S.venue==='port'?[30,13]:hubBounds();
  for(const p of S.parts){
    p.age+=scale; p.pi=p.i; p.pj=p.j; p.pz=p.z;
    if(p.creep>0&&p.host&&!p.host.ko&&!p.host.down){   // the viscous phase: it slides down the cheek and chin with the head
      p.creep--; p.i=p.host.i+p.host.fi*p.df-p.host.fj*p.ds; p.j=p.host.j+p.host.fj*p.df+p.host.fi*p.ds; p.z-=0.07*scale; live.push(p); continue; }
    if(p.kind==='mist'||p.kind==='dust'){ p.vi*=0.85; p.vj*=0.85; p.vz=p.vz*0.9-0.016; p.i+=p.vi*scale; p.j+=p.vj*scale; p.z+=p.vz*scale; if(p.age<p.maxAge&&p.z>0) live.push(p); continue; }
    p.vi*=0.96; p.vj*=0.96; p.vz-=0.044*scale; p.i+=p.vi*scale; p.j+=p.vj*scale; p.z+=p.vz*scale;
    if(p.z<=0){
      if(p.i>0.35&&p.j>0.35&&p.i<bw-0.35&&p.j<bh-0.35){
        if(p.kind==='blood'||Math.random()<0.45) stain(p);
        if(p.vz<-0.26&&p.age<60) for(let q=p.kind==='blood'?(p.size>1?3:2):1;q>0;q--){ const a=rnd(0,6.283), sp=rnd(0.004,0.011);
          live.push({kind:p.kind==='blood'?'blood':'mist',i:p.i,j:p.j,z:0.15,vi:Math.cos(a)*sp,vj:Math.sin(a)*sp,vz:rnd(0.1,0.22),size:1,age:0,maxAge:7+(Math.random()*5|0),creep:0,host:null,df:0,ds:0,pi:p.i,pj:p.j,pz:0.15}); }
      }
      continue;
    }
    if(p.age<p.maxAge) live.push(p);
  }
  S.parts=live;
}

/** A floor mark: a compact core with a few droplets along the way the drop was flying. @param {any} p */
function stain(p){
  const S=state, blood=p.kind==='blood', sp=Math.hypot(p.vi,p.vj), l=sp||1, di=p.vi/l, dj=p.vj/l, big=blood?rnd(0.038,0.072)*(p.size*0.45+0.55):rnd(0.025,0.042);
  const blobs=[{di:0,dj:0,r:big}], n=blood?(sp>0.012?2+(Math.random()*2|0):(Math.random()*2|0)):0;
  for(let k=1;k<=n;k++){ const d=k*rnd(0.045,0.1); blobs.push({di:di*d+rnd(-0.02,0.02),dj:dj*d+rnd(-0.02,0.02),r:big*rnd(0.28,0.52)}); }
  S.decals.push({i:p.i,j:p.j,t0:S.t,blood,blobs});
  if(S.decals.length>260) S.decals.shift();
}

/** Floor marks under the people, drawn into the room before the furniture and lighting; the edges are dithered, not outlined. */
function drawDecals(){
  const S=state, K=gymState.ISO_K, W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb, bay=gymState.BAYER;
  for(const d of S.decals){
    const age=S.t-d.t0;
    for(const b of d.blobs){
      const cx=isoX(d.i+b.di,d.j+b.dj), cy=isoY(d.i+b.di,d.j+b.dj,0), rx=Math.max(1,b.r*7.5*K), ry=Math.max(0.6,rx*0.5);
      for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
        if(x<0||y<0||x>=W||y>=H) continue; const u=(x-cx)/rx, v=(y-cy)/ry, q=u*u+v*v; if(q>1||(q>0.62&&bay[(y&3)*4+(x&3)]>10)) continue; const k=y*W+x;
        if(d.blood){ const dry=Math.min(1,age/28), base=mix(BLOOD,BLOOD_DRY,dry), c=(age<4&&q<0.35)?mix(base,BLOOD_HI,0.35*(1-age/4)):base; fb[k]=mix(fb[k],c,0.82); }
        else fb[k]=mix(fb[k],SWEAT_FLOOR,0.28*Math.max(0,1-age/5));
      }
    }
  }
  S.decals=S.decals.filter(d=>d.blood||S.t-d.t0<5);
}

/** The mist and drops in the air, over the fighters: single muted pixels, no white fringe. */
function drawParts(){
  const W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb, tick=boxingState.tick;
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ if(x>=0&&y>=0&&x<W&&y<H) fb[y*W+x]=c; };
  for(const p of state.parts){
    const x=Math.round(isoX(p.i,p.j)), y=Math.round(isoY(p.i,p.j,p.z)), fast=p.creep===0&&Math.hypot(p.vi,p.vj)>0.014, tail=()=>[Math.round(isoX(p.pi,p.pj)),Math.round(isoY(p.pi,p.pj,p.pz))];
    if(p.kind==='mist'){ if(p.maxAge-p.age>4||((x+y+tick)&1)) px(x,y,SWEAT_MIST); }
    else if(p.kind==='dust'){ if(p.maxAge-p.age>5||((x+y+tick)&1)){ px(x,y,DUST); if(p.size>1) px(x+1,y,DUST); } }
    else if(p.kind==='sweat'){ px(x,y,SWEAT_DROP); if(fast&&p.pz>0){ const [tx,ty]=tail(); px(tx,ty,SWEAT_MIST); } }
    else { if(fast&&p.pz>0){ const [tx,ty]=tail(); px(tx,ty,BLOOD_DRY); } px(x,y,BLOOD); if(p.size>1){ px(x+1,y,BLOOD_DRY); px(x,y+1,BLOOD); } }
  }
}

/** Fade the evade effect in and out on the slow-motion clock. */
function slowMoEffect(){
  const elapsed=TUNING.slowMoDuration-state.slowMo;
  return state.slowMo>0?smooth(Math.min(1,Math.max(0,elapsed/0.12)))*smooth(Math.min(1,state.slowMo/0.3)):0;
}

/** Ease the knockdown close-up in and back out over its slow-motion window. */
function knockdownZoom(){
  const t=state.kdSlow; return t>0?smooth(Math.min(1,(3.8-t)/0.2))*smooth(Math.min(1,t/0.3)):0;
}

/** F7: unzoomed skeletal overlay rendered over the 432x288 sandy scene.
 * The joint chains and their colors are diagnostic, not part of the game art. */
function renderRigOverlay(F){
  let J=F.rd&&(F.ko||F.down)?ragdollJoints(F):fighterJoints(F);
  if(F.rise)J=risingJoints(F,J);
  const oldC=gymState.ipC,oldPose=gymState.ipPose,oldBase=gymState.ipBase;
  gymState.ipC=F;gymState.ipPose=0;gymState.ipBase=0;
  const p=(v)=>{bodyPt(v[0],v[1],v[2]);return [Math.round(gymState.bpX),Math.round(gymState.bpY)];};
  const spine=rgb('#e7c770'),arms=rgb('#8fd7c5'),legs=rgb('#d89890'),nodes=rgb('#f7f5d5');
  const segment=(a,b,color)=>{const A=p(a),B=p(b);line(A[0],A[1],B[0],B[1],color,color);};
  const joint=(a)=>{const [x,y]=p(a);pset(x,y,nodes);pset(x+1,y,nodes);};
  try{
    segment(J.pel,J.abd||J.pel,spine);
    segment(J.abd||J.pel,J.chest,spine);
    segment(J.chest,J.head,spine);
    for(const s of [-1,1]){
      const a=J(s);
      segment(J.pel,a.hip,legs);segment(a.hip,a.knee,legs);segment(a.knee,a.foot,legs);
      segment(J.chest,a.sh,arms);segment(a.sh,a.el,arms);segment(a.el,a.hd,arms);
      for(const v of [a.hip,a.knee,a.foot,a.sh,a.el,a.hd])joint(v);
    }
    for(const v of [J.pel,J.abd||J.pel,J.chest,J.head])joint(v);
  }finally{gymState.ipC=oldC;gymState.ipPose=oldPose;gymState.ipBase=oldBase;}
}

/** Zoom on the fighters: close in on the pair, wider only when they part; the centre follows with a lag. */
function camera(){
  const S=state, C=S.cam, K=gymState.ISO_K, W=appearanceState.W, H=appearanceState.H, P=S.P, O=S.O;
  const px=isoX(P.i,P.j), py=isoY(P.i,P.j,9), ox=isoX(O.i,O.j), oy=isoY(O.i,O.j,9);
  const need=Math.max(Math.abs(px-ox)+52*K,(Math.abs(py-oy)+48*K)*1.5), zt=Math.min(2.35,Math.max(1.3,W/need));
  if(C.init){ C.init=false; C.z=zt; C.x=(px+ox)/2; C.y=(py+oy)/2+4*K; }
  C.z+=(zt-C.z)*0.08; S.kick*=0.82; const z=(Math.abs(C.z-2.35)<0.03?2.35:C.z)*(1+0.35*Math.max(slowMoEffect(),knockdownZoom())+S.kick);
  const tx=(px+ox)/2, ty=(py+oy)/2+4*K;
  C.x+=(tx-C.x)*0.1; C.y+=(ty-C.y)*0.1;
  const cx=Math.round(Math.max(W/(2*z),Math.min(W-W/(2*z),C.x))), cy=Math.round(Math.max(H/(2*z),Math.min(H-H/(2*z),C.y)));
  zoomBlit(z,cx,cy);
}

/** Desaturate the scene during an ideal evade and around the knockdown comic while keeping strongly red blood visible. */
function applySlowMoTint(){
  const w=Math.max(slowMoEffect(),knockdownZoom()); if(w<=0) return;
  const fb=rendererState.fb, N=appearanceState.W*appearanceState.H;
  for(let p=0;p<N;p++){
    const c=fb[p], r=c&255, g=(c>>8)&255, b=(c>>16)&255;
    if(r>g*1.8&&r>b*1.5&&r-g>20) continue;
    const l=r*0.3+g*0.59+b*0.11;
    fb[p]=(0xff000000|((b+(l-b)*w|0)<<16)|((g+(l-g)*w|0)<<8)|(r+(l-r)*w|0))>>>0;
  }
}

/** A presentation-only snapshot of both fighters and the blood in the air, for the comics to replay. */
function snapshot(){
  const frame=/** @type {any} */ ([state.P,state.O].map(F=>({
    C:{i:F.i,j:F.j,fi:F.fi,fj:F.fj}, look:F.look, wrap:F.wrap,
    joints:F.rd?ragdollJoints(F):fighterJoints(F), tilt:!!F.rd||!!F.pk?.low||F.pk?.pid===2||F.hurtT>0
  })));
  frame.blood=state.parts.filter(p=>p.kind==='blood').map(({i,j,z,pi,pj,pz,size})=>({i,j,z,pi,pj,pz,size}));
  return frame;
}

/** Save a snapshot so the knockdown comic can replay the same fall. */
function recordKnockdownFrame(){ recordKnockdownComicFrame(snapshot()); }

/** Ticks of the fight kept on the tape before a knockout: the run-up the finisher's replay starts with. */
const TAPE_KEEP=100;
/** Keep the last TAPE_KEEP ticks of the fight for the finisher's replay (not in the HD test arena, which has no comic). */
function recordTape(){
  const S=state; if(S.venue==='sandy') return;
  S.tape.push(snapshot()); if(S.tape.length>TAPE_KEEP&&!S.fin) S.tape.shift();   // the finisher keeps every tick: its panels point into the tape
}

/** The comic's closing words: the knockdown or the stoppage, the count, and the taps the player still needs to rise. */
function comicCaption(){
  const S=state, V=comicState.victim===0?S.P:S.O;
  if(V.ko) return {title:S.how==='TKO'?'TKO!':S.how==='KASTET'?'KASTET!':'KO!',line:'',pips:null};
  if(V===S.P) return V.down?{title:'WSTAWAJ!',line:'WCISKAJ KLAWISZE',pips:[Math.min(V.kdMash,riseTaps(V)),riseTaps(V)]}:{title:plain('Wstałeś!'),line:'',pips:null};
  return {title:'NOKDAUN!',line:'RYWAL NA DESKACH '+V.kdN+'/3',pips:null};
}

/** Frame: the room with both fighters, bars, sparks and the notice. Called inside the 2× frame. */
export function renderIsoFight(){ if(state.venue==='pub'){ preparePub(); return withPubCamera(renderFight); } if(state.venue==='port') return withThamesCamera(renderFight); return renderFight(); }
function renderFight(){
  const S=state; if(!S.on) return;
  if(S.phase==='finisher'){ drawFinisherMontage(S.fin.t); return; }
  if(S.venue!=='sandy'&&S.kdSlow>0&&knockdownComicOnScreen(3.8-S.kdSlow,S.kdSlow)){ drawKnockdownComic(3.8-S.kdSlow,comicCaption()); return; }
  if(gymState.fightSpectators) for(const C of gymState.fightSpectators) C.t=S.t*60;
  if(S.venue==='pub') renderPub([S.P,S.O]);
  else if(S.venue==='port') renderThamesPort([S.P,S.O]);
  else if(S.venue==='sandy'){
    renderSandyArena(); drawDecals();
    for(const F of [S.P,S.O].sort((a,b)=>(a.i+a.j)-(b.i+b.j))){ F.draw(); drawSandyFootDust(F); }
  } else renderHub();   /* standard fights remain in their room's depth sorter */
  const K=gymState.ISO_K, W=appearanceState.W/K;
  drawParts();
  if(S.venue==='sandy'&&S.showRig){renderRigOverlay(S.P);renderRigOverlay(S.O);}
  if(S.phase==='intro'||S.phase==='fight') marker(S.P);
  if(S.venue==='pub') Object.assign(S.cam,{z:1,x:appearanceState.W/2,y:appearanceState.H/2,init:false});
  else camera();
  applySlowMoTint();
  if(!S.portraits) S.portraits=[fightPortrait(S.P,true),fightPortrait(S.O,false)];
  drawFightPortrait(S.portraits[0],4,0,S.P); drawFightPortrait(S.portraits[1],W-20,1,S.O);
  bars(22,6,44,S.P,false); bars(W-66,6,44,S.O,true);
  drawText('TY',30*K,17*K,appearanceState.C_WHITE,1); drawText(plain(String(S.opp.name)),(W-22)*K-(String(S.opp.name).length*2)*K,17*K,appearanceState.C_WHITE,1);
  if(S.notice&&(S.t<S.noticeUntil||S.phase!=='fight')) drawText(plain(S.notice),(W/2)*K,(appearanceState.H/K-12)*K,appearanceState.C_WHITE,1);
  if(S.banner){ const b=S.banner; if(b.t>8||(b.t&2)) drawText(b.text,W/2*K,30*K,b.color,1); }   // small, under the bars: the fight stays in view
}

/** A small arrow over the player's head, so the two can be told apart. @param {any} F */
function marker(F){
  const K=gymState.ISO_K, x=Math.round(isoX(F.i,F.j)), y=Math.round(isoY(F.i,F.j,22))-((boxingState.tick>>3)&1)*K;
  for(let r=0;r<3;r++) for(let dx=-r;dx<=r;dx++) rect(x/K+dx|0,y/K+(2-r),1,1,appearanceState.C_SPARK);
}

/** Text for the info line below the picture. */
export function isoFightInfo(){
  const S=state, V=S.venue, where=V==='sandy'?'TEST HD 432×288 · BOHATER VS HARRY':V==='port'?'BÓJKA W PORCIE':V==='yard'?'BÓJKA NA SPACERNIAKU':V==='canteen'?'BÓJKA PRZY POSIŁKU':V==='laznia'?'BÓJKA W ŁAŹNI':'BÓJKA W WARDZIE';
  return where+' · '+(S.opp?S.opp.title:'')+' · '+(S.phase==='end'||S.phase==='ko'?'KONIEC':'DO KO')+(V==='sandy'?' · F7 szkielet · R restart · F9 PNG':'');
}
export const CONTROLS='mysz/WASD ruch · F dash ku kursorowi · E unik · 2× E odskok · 1 jab · 2 cross · 3 hook · 4 uppercut · LPM + cios: korpus · Spacja blok / klincz · Q slip · F10 pauza · Esc wyjście';
