import { renderThamesPort, withThamesCamera, portFightOutfit, thamesBlocked, startPortAfterFight } from './thames-port.js';
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
import { state as gymState, figureHD, hubBlocked, hubBounds, hubRebake, hubTransReset, heroFigureLook, isoX, isoY, renderHub, setFightSpectators } from './gym.js';
import { state as rendererState, zoomBlit, screenToView, setFramebuffer, isometricFrame } from './renderer.js';
import { mix } from './cast.js';
import {BODY_HIT_SECONDS, bodyHitMotion} from './body-reaction.js';
import {ARM_UPPER, ARM_FORE, solveLimb, strikeArmTargets} from './combat-anatomy.js';
import {RIG, buildSpine, headSocket, shoulderSocket, supportPelvis, legAnchors} from './fighter-rig.js';
import { state as npcsState, cnLookHD } from './npcs.js';
import { state as sparringState, oppDef, oppLevels, oppStars, setSparFight, setRigged, setFightLimit } from './sparring.js';
import { setRoomRaw } from './rooms.js';
import { state as inputState, setInfo } from './input.js';
import { exitToHub } from './navigation.js';
import { initAudio, sfxPunch, sfxWhoosh, sfxBlock, sfxKO, sfxBell, sfxCrack, sfxLand, sfxPerfectEvade } from './audio.js';
import { createCombatant, tickCombatant, punchCost, beginPunch, whiffPunch, setGuard, beginSlip, evadeCost, classifyEvade, resolveNearMiss, resolvePunch, TUNING } from './realtime-rules.js';
import { state as progressionState, resetSessXP, addXP, persist, sessXPText, statShort, passTrial, recordFight } from './progression.js';
import { fighterStats } from './stats.js';
import { fightXP } from './training-data.js';
import { doneToday, takeFightTrial } from './training-session.js';
import { prisonFightEnd, countFight, showFightPlate, hideFightPlate } from './prison.js';
import { hungerLevel, tiredness } from './simulation.js';
import { lastingSpec } from './card-data.js';
import { state as comicState, startKnockdownComic, recordKnockdownComicFrame, drawKnockdownComic, knockdownComicOnScreen } from './knockdown-comic.js';

// Runtime values owned by iso-fight; the fight is reset by startIsoFight().
export const state = {on:false,t:0,uiT:0,slowMo:0,kdSlow:0,scale:1,P:null,O:null,keys:{},tapAt:{u:-9,d:-9,l:-9,r:-9},upAt:{u:-9,d:-9,l:-9,r:-9},eTap:null,eHeld:false,evadeHintShown:false,low:false,guardHeld:false,phase:'off',pt:0,elapsed:0,winner:null,how:'',idx:0,venue:'cell',opp:null,rigKO:false,
  notice:'',noticeUntil:0,pointer:null,clinch:false,push:null,spaceAt:-1,freeze:0,slipFlip:1,parts:[],decals:[],cam:{z:2,x:144,y:96,init:true},xpToday:0,trial:null,banner:null};

/** Seconds from the start of a punch to contact and to the end of the recovery. */
const PT=[{hit:.10,end:.30},{hit:.15,end:.40},{hit:.19,end:.48},{hit:.19,end:.48}];
/** Keep the shared boxing rules and only stretch this rival's contact/recovery frames. */
const punchT=(F,pid)=>bullTiming(PT[pid],!!F.bull);
/** Farthest hip-to-hip distance (room units) at which each punch lands: the old side-on ranges 33/31/27/26 px scaled to the rooms. */
const RANGE=[1.45,1.40,1.20,1.10];
const LUNGE=[1.2,1.6,1.8,1.4];
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
/** Upper arm and forearm (to the middle of the fist), thigh and shin: the bones keep their length in every pose. */
const ARM_U=ARM_UPPER, ARM_L=ARM_FORE, LEG_U=3.2, LEG_L=3.2;

const lerp3=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number} */ k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
const smooth=(/** @type {number} */ k)=>k*k*(3-2*k);

/** Progress of the striking motion, with acceleration into contact. @param {number} k */
export const punchSnap=(k)=>k*k;

const emptyCounts=()=>({thrown:0,landed:0,power:0,body:0,counters:0,evades:0,blocks:0,perfects:0,minSta:1});

/** One fighter: the rules' combatant, the pose state, the footwork and the counters of the result card.
 * @param {number} i @param {number} j @param {number} fi @param {number} fj @param {any} look @param {(fn:()=>void)=>void} wrap
 * @param {{hpMax:number,staCap:number,pow:number,regen:number,hunger?:number}} rules @param {{stunDealt:number,stunTaken:number}} S @param {number} [leadSide] */
function makeFighter(i,j,fi,fj,look,wrap,rules,S,leadSide=1){
  const F={i,j,fi,fj,leadSide,lastHand:0,evadeHookHand:0,dash:null,dashReadyAt:0,lastMove:[fi,fj],moving:false,mf:0,ms:0,rt:createCombatant(rules),pk:null,buf:null,slipSince:-9,slipDir:1,evKind:/** @type {'slip'|'in'|'back'|'left'|'right'} */ ('slip'),evDi:0,evDj:0,evFwd:0,evSide:0,hurtT:0,hurtDuration:.3,hurtDir:0,hurtLow:false,hurtPower:1,hurtBlocked:false,hurtSide:0,stagger:0,stun:0,dmg:0,faceDamage:0,
    grab:null,grabExempt:null,ko:false,down:false,downAt:0,kdN:0,kdMash:0,kdLast:0,gUp:0,look,lagF:0,lagVF:0,lagS:0,lagVS:0,hLagF:0,hLagS:0,pvf:0,pvs:0,rd:/** @type {any} */ (null),rise:/** @type {any} */ (null),seed:Math.random()*6,aiAt:1,combo:[],comboAt:0,seen:0,strafe:1,strafeUntil:0,guardUntil:0,lowAim:false,
    stunDealt:S.stunDealt,stunTaken:S.stunTaken,c:emptyCounts(),wounds:/** @type {any} */ ({cuts:0,ribs:0}),bleed:false,hist:/** @type {any[]} */ ([]),draw:()=>{}};
  F.ft={1:{},'-1':{}}; F.li=i; F.lj=j; for(const s of [1,-1]) Object.assign(F.ft[s],stance(F,s),{sw:0,from:null,to:null});
  F.wrap=wrap; F.draw=()=>F.wrap(()=>drawFighter(F));
  return F;
}

/** Where the two stand: on the floor of the room, facing each other along the screen's horizontal, as in the side view.
 * @param {string} room @returns {[number[],number[]]} */
function fightBlocked(i,j){ return state.venue==='sandy'?Math.hypot(i-5.55,j-5.15)>3.6:state.venue==='port'?thamesBlocked(i,j):hubBlocked(i,j); }
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
  const S=state, save=progressionState.save, V=venue??sparringState.sparVenue, sandbox=V==='sandy', room=V==='port'?'port':V==='yard'||V==='laznia'?V:'cell';
  const returnRoom=sandbox?(S.on&&S.venue==='sandy'?S.returnRoom:gymState.hubRoom):null;
  S.portraits=null;
  initAudio(); inputState.overEl.hidden=true;
  setSparFight(idx,sandbox?'cell':V,station);
  if(sandbox){ setRigged(false); setFightLimit(0); } // the preview never inherits Sunday-match cheats or a timer
  if(room!=='port'&&gymState.hubRoom!==room){ setRoomRaw(room); hubRebake(); }
  const O=V==='port'?{...oppDef(idx),name:'PIJANY',title:'Pijany doker'}:oppDef(idx), st=save.stats, PS=fighterStats({str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl}), OS=fighterStats(oppLevels(O));
  const wounds=lastingSpec(save.injuries), cap=PS.staCap-(tiredness()*4+(wounds.nose?5:0)+wounds.ribs*5), hero=heroFigureLook(), [pa,oa]=sandbox?[[4.95,5.75],[6.05,4.55]]:V==='port'?[PORT_BRAWL.hero,PORT_BRAWL.drunk]:startSpots(room);
  S.P=makeFighter(pa[0],pa[1],0.7071,-0.7071,hero.look,hero.wrap,{hpMax:100+PS.hpBonus,staCap:3*Math.max(25,cap),pow:PS.pow,regen:PS.regen,hunger:hungerLevel()},PS,-1);
  S.O=makeFighter(oa[0],oa[1],-0.7071,0.7071,V==='port'?{sk:[appearanceState.R_SKIN,appearanceState.R_SKINF],top:[appearanceState.R_HSH,appearanceState.R_HSHF],pt:[appearanceState.R_HPT,appearanceState.R_HPTF],shoe:appearanceState.R_HSLIP,hair:appearanceState.R_HAIR,cap:appearanceState.R_HPT,style:'flatcap',stubble:true,rolledSleeves:true,tuckedShirt:true}:foeFigure(V,idx,O),V==='port'?portFightOutfit:fn=>fn(),{hpMax:O.hp,staCap:3*Math.max(25,OS.staCap),pow:OS.pow,regen:OS.regen},OS);
  if(O.heavy){ S.O.bull=createBullState(); S.O.rt.regen*=0.7; S.O.bullClock=0; }
  Object.assign(S.P.wounds,wounds); S.O.aiAt=0.6;
  Object.assign(S,{on:true,t:0,uiT:0,slowMo:0,kdSlow:0,scale:1,keys:{},tapAt:{u:-9,d:-9,l:-9,r:-9},upAt:{u:-9,d:-9,l:-9,r:-9},eTap:null,eHeld:false,low:false,guardHeld:false,phase:'intro',pt:0,elapsed:0,winner:null,how:'',idx,venue:V,opp:O,rigKO:false,banner:null,pointer:null,clinch:false,push:null,spaceAt:-1,parts:[],decals:[],cam:{z:2,x:144,y:96,init:true},freeze:0,
    notice:'1-4 ciosy · F dash · LPM korpus · Spacja blok · Q slip',noticeUntil:3,slipFlip:1,xpToday:0,trial:null,returnRoom});
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
  if(S.venue==='sandy'&&down&&c==='F9'){ e.preventDefault(); const a=document.createElement('a'); a.download='roadwork-sandy-432x288.png'; a.href=rendererState.hd3.off.toDataURL('image/png'); a.click(); return true; }
  if(S.phase==='end'){ if(down&&(c==='Enter'||c==='Space')){ e.preventDefault(); inputState.againFn(); } return true; }
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
export function isoFightBodyAim(held){ state.low=!!held&&state.on&&state.phase==='fight'&&!inputState.paused; }

/** Direction from the fighter's feet to the pointer in room coordinates. @returns {[number,number]} */
function pointerDirection(){ return state.venue==='port'?withThamesCamera(pointerDirectionInRoom):pointerDirectionInRoom(); }
/** Resolve the pointer using the current room projection. */
function pointerDirectionInRoom(){
  const S=state; if(!S.pointer||!S.P) return [0,0];
  // Input is handled outside withHD(), where ISO_K has already returned to 1.
  // Camera coordinates belong to the active framebuffer (3× in all isometric venues).
  const frame=isometricFrame(S.venue), scale=frame.W/144;
  // The port's camera is already in legacy 2× pixels between render calls.
  const projectionScale=S.venue==='port'?scale/2:scale;
  const C=S.cam, W=frame.W, H=frame.H, z=(Math.abs(C.z-2.35)<0.03?2.35:C.z)*(1+0.35*Math.max(slowMoEffect(),knockdownZoom()));
  const cx=Math.round(Math.max(W/(2*z),Math.min(W-W/(2*z),C.x))), cy=Math.round(Math.max(H/(2*z),Math.min(H-H/(2*z),C.y)));
  const sx=isoX(S.P.i,S.P.j), sy=isoY(S.P.i,S.P.j,0);
  const dx=S.pointer.x-(W/2+(sx*projectionScale-cx)*z)/scale;
  const dy=S.pointer.y-(H/2+(sy*projectionScale-cy)*z)/scale;
  if(Math.hypot(dx,dy)<4) return [0,0];
  const di=dx+2*dy, dj=2*dy-dx, len=Math.hypot(di,dj); return [di/len,dj/len];
}

/** Take hold at close range; a held Space remains the normal guard. */
function startClinch(){
  const S=state, P=S.P, O=S.O;
  if(!S.on||S.phase!=='fight'||busy(P)||busy(O)||toward(P,O)[2]>1.25) return;
  if(P.rt.guarding) setGuard(P.rt,false,S.t);
  if(O.rt.guarding) setGuard(O.rt,false,S.t);
  P.buf=O.buf=null; O.combo=[]; S.clinch=true; say('Klincz · ruch / obrót · Spacja odepchnij');
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
  say('Odepchnięcie');
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
  const hand=pid===2&&!special&&F.evadeHookHand?F.evadeHookHand:pid>=2&&F.lastHand&&!special?-F.lastHand:(F.leadSide===-1?[-1,1,1,1][pid]:HAND[pid]);
  if(!special){ F.lastHand=hand; F.evadeHookHand=0; }
  F.pk={pid,low,t:0,hit:false,special,hand,fastCounter:counterEvade,exhausted}; F.lowAim=low; F.buf=null; F.c.thrown++;
  if(F===state.P){ F.hist.push({pid,low,at:now}); if(F.hist.length>4) F.hist.shift(); }
  sfxWhoosh(0.25+0.1*pid);
  return true;
}

/** A directional evade (a double tap, or the rival's choice), decided on the axis from F to G: in, back, or a step to the side. @param {any} F @param {any} G @param {number} di @param {number} dj */
function evade(F,G,di,dj){
  const now=state.t;
  if(busy(F)||state.phase!=='fight') return false;
  const [ui,uj]=toward(F,G), info=classifyEvade(di,dj,ui,uj);
  if(!beginSlip(F.rt,now,info.kind)){
    if(F===state.P&&F.rt.sta<evadeCost(F.rt,now)) say('Brak tchu na unik');
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
  if(!beginSlip(F.rt,now,'slip')){ if(F===state.P&&F.rt.sta<evadeCost(F.rt,now)) say('Slip: odetchnij'); return false; }
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
  if(F.rt.sta<DASH.cost){ if(F===S.P) say('Brak tchu na dash'); return false; }
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
  F.pk=null; F.dash=null; F.buf=null; F.combo=[]; F.slipSince=-Infinity; F.rt.slipSince=-Infinity;
  if(F.rt.guarding) setGuard(F.rt,false,S.t);
  S.clinch=false; S.push=null;
  if(F===S.P){ S.eTap=null; say('Tłum cię trzyma!'); } else say('Tłum trzyma rywala!');
}

/** The end of the brawl: a knockout or a stoppage, the time, the knuckle-duster. @param {any} W winner @param {string} how */
function endBout(W,how){
  const S=state; if(S.phase!=='fight'||S.rigKO&&how!=='KASTET') return;
  S.phase='ko'; S.pt=0; S.winner=W; S.how=how;
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
  D.rt.hp=Math.max(1,D.rt.hp-dmg); D.stun+=22; D.dmg=Math.min(1,D.dmg+0.12); D.faceDamage+=dmg; D.hurtT=.3; D.hurtDir=0; D.hurtLow=false; D.hurtPower=1; D.stagger=.3;
  if(Math.random()<0.45) D.wounds.cuts=Math.min(3,(D.wounds.cuts||0)+1);
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
    say(D.evKind==='back'?'Idealny odskok! Kontruj +55%':D.evKind==='in'?'Idealny doskok! Kontruj +55%':'Idealny unik! Następny cios +55%');
  } else { sfxWhoosh(0.55); S.freeze=2; }
}

/** Contact of a punch at its apex, with the rules of realtime-rules.js. @param {any} A @param {any} D */
function impact(A,D){
  const S=state, now=S.t, pid=A.pk.pid, low=A.pk.low, gap=toward(A,D)[2], R=RANGE[pid];
  if(A.pk.special){ special(A,D); return; }
  if(D.ko||D.down) return;
  if(gap>R){
    whiffPunch(A.rt,now);
    if(A.bull) registerBullMiss(A.bull,pid,now);
    if(resolveNearMiss(A.rt,D.rt,{gap,range:R,now})){ onPerfectEvade(D); return; }   // out of reach by a hair while evading sideways or back
    if(pid>=1&&A.rt.sta<22){ A.stagger=.55; A.pk=null; popup(sparringState.T_OVER,hx(A),hy(A)-8,appearanceState.C_SPARK,1,28); }
    else if(A===S.P) say('Poza zasięgiem');
    return;
  }
  const k=gap/R;
  let rangeMod=1;
  if(pid<=1){ if(k>=0.76&&k<=0.97) rangeMod=1.15; else if(k<0.64) rangeMod=0.75; }
  else if(k>=0.70&&k<=0.90) rangeMod=1.20;
  const o=resolvePunch(A.rt,D.rt,{pid,low,now,gap,range:R});
  // The defender who slipped avoided contact, unlike a block or parry.
  if(o.kind==='slip'&&A.bull) registerBullMiss(A.bull,pid,now);
  if(o.damage>0){
    const extra=o.damage*(rangeMod*(A.bull?BULL.damage[pid]:1)-1);
    D.rt.hp=Math.max(0,D.rt.hp-extra); o.damage=Math.max(0,o.damage+extra);
  }
  const px=hx(D), py=hy(D)+(low?10:0);
  if(o.kind==='parry'){
    D.c.blocks++; D.c.perfects++; A.stagger=.45; A.pk=null; A.stun+=16; popup(sparringState.T_PARRY,px,py-12,appearanceState.C_SPARK,1,30); sfxBlock(0.95,true);
    S.freeze=4; say(D===S.P?'Idealny blok - kontruj!':'Rywal zbił cios'); return;
  }
  if(o.kind==='slip'){ onPerfectEvade(D); return; }
  const blocked=o.kind==='block';
  A.pk.landed=o.kind==='hit'&&o.damage>0;
  if(blocked) D.c.blocks++;
  if(!blocked&&o.damage>0){ A.c.landed++; if(pid>0) A.c.power++; if(low) A.c.body++; else D.faceDamage+=o.damage; if(o.counter) A.c.counters++; D.dmg=Math.min(1,D.dmg+o.damage/D.rt.hpMax*1.6); }
  let stagger=false;
  if(!blocked){
    if(low){
      if(pid>=2&&(D.rt.sta<22||o.counter)){ D.wounds.ribs=(D.wounds.ribs||0)+1; D.rt.hp=Math.max(0,D.rt.hp-4); D.stagger=.5; D.pk=null; stagger=true; sfxCrack(0.85); popup(sparringState.T_RIB,px,py-10,sparringState.C_BLOOD2,1,36); }
    } else {
      D.stun+=[11,20,28,32][pid]*(o.counter?1.45:1)*((A.stunDealt||1)/(D.stunTaken||1));
      if(D.stun>=82&&D.rt.hp>0){ D.stun=30; D.stagger=.7; D.pk=null; stagger=true; popup(sparringState.T_CARD+19,px,py-16,appearanceState.C_SPARK,1,38); }
      if(pid===2&&D.dmg>0.42&&(D.wounds.cuts||0)<3&&Math.random()<0.28){ D.wounds.cuts=(D.wounds.cuts||0)+1; popup(sparringState.T_CUT,px,py-18,sparringState.C_BLOOD2,1,38); }
      if((pid===1||pid===3)&&o.counter&&D.dmg>0.48&&!D.wounds.nose){ D.wounds.nose=true; D.rt.regen*=0.82; sfxCrack(0.8); popup(sparringState.T_CARD+15,px,py-18,sparringState.C_BLOOD2,1,38); }
    }
  }
  // Body blows are a separate, longer anticipation/compression/recovery sequence.
  // This is visual only: resolvePunch above still owns stamina and HP.
  D.hurtDuration=low?(blocked?.18:BODY_HIT_SECONDS+pid*.025):.3;
  D.hurtT=D.hurtDuration; D.hurtDir=pid; D.hurtLow=low; D.hurtBlocked=blocked;
  D.hurtPower=(blocked?0.25:1)*(1+0.8*(1-Math.max(0,Math.min(1,D.rt.sta/D.rt.staCapInitial))))*(low&&!blocked?1+pid*.08:1);
  const [sideI,sideJ]=toward(D,A);
  D.hurtSide=Math.max(-1,Math.min(1,(sideI*-D.fj+sideJ*D.fi)*1.8+(A.pk.hand||1)*0.3));
  if(!blocked&&o.damage>0&&D.bull?.mode==='WINDUP'){ D.bull.mode='RECOVERY'; D.bull.until=now+0.48; }
  if(!stagger&&!blocked&&!low&&D.pk&&D.pk.t<punchT(D,D.pk.pid).hit) D.pk=null;   /* a clean hit interrupts the windup */
  const [ui,uj]=toward(A,D); walk(D,A,ui,uj,(blocked?.05:A===S.P&&A.rt.comboCount>1?.06:.12)*(A.bull?BULL.knockback:1));
  if(o.damage>=1) popup(sparringState.T_DMG+Math.min(30,Math.max(1,Math.round(o.damage)))-1,px,py-14,blocked?appearanceState.C_GRAY:appearanceState.C_WHITE,1,32);
  spray(A,D,pid,low,blocked,o);   // the hit shows as drops, not a comic flash
  if(blocked) sfxBlock(0.6); else sfxPunch(Math.min(1.4,0.55+0.25*pid+(o.counter?0.2:0)),low?1:0.35+pid*0.15,true);
  S.freeze=blocked?1:(pid===3||o.counter?4:2); boxingState.shakeT=blocked?3:6; boxingState.shakeAmp=blocked?1:2; boxingState.shakeDur=blocked?3:6; boxingState.shakeAxis=0;
  if(o.failedSlip&&D===S.P) say('Zły slip: cios rywala +35%'); else if(o.counter&&A===S.P) say('Kontra!');
  if(D.rt.hp<=0){
    const brutal=D.kdN>=2||(D.kdN===1&&o.counter&&pid===3);
    if(!D.down&&!brutal){
      D.down=true; D.downAt=now; D.kdN++; D.kdMash=0; D.pk=null; D.dash=null; D.buf=null;
      D.rt.hp=Math.round(D.rt.hpMax*(D.kdN===1?0.32:0.20)); D.rt.sta=Math.max(D.rt.sta,D.rt.staCap*0.5); D.stun=0;
      startIsoRagdoll(D,A,pid,false); banner('NOKDAUN!',appearanceState.C_RED,80); sfxKO();
      say(D===S.P?'NOKDAUN! Wciskaj klawisze, żeby wstać!':'Rywal na deskach ('+D.kdN+'/3)');
    } else { D.ko=true; D.pk=null; D.dash=null; startIsoRagdoll(D,A,pid,true); spray(A,D,pid,low,false,o,true); endBout(A,D.kdN>=2?'TKO':'KO'); }
  }
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
    const moved=walk(F,P,ui,uj,WALK*0.8*BULL.move*state.scale); // 68% of the standard rival's 0.8*WALK
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
  b.pid=pid; b.mode='WINDUP';
  b.until=now+(pid===0?0.25:pid===1?0.38:pid===2?0.57:0.51);
  F.aiAt=b.until+0.22;
}

/** The opponent: keeps his distance, circles, reads the player's punches and answers in short combinations (the old styles). @param {any} F @param {any} P */
function ai(F,P){
  const S=state, now=S.t, O=S.opp, [ui,uj,gap]=toward(F,P), si=-uj, sj=ui;
  const archKey=O.name==='DAN'?'tank':(ARCH[O.style]?O.style:'bal'), arch=ARCH[archKey], perks=O.perks||[];
  F.moving=false;
  if(F.bull){ bullAi(F,P,ui,uj,gap); return; }
  if(F.grab||F.ko||F.down||P.ko||P.down){ if(F.rt.guarding) setGuard(F.rt,false,now); return; }
  if(F.rt.guarding&&now>=F.guardUntil) setGuard(F.rt,false,now);
  if(F.stagger>0||F.pk) return;
  if(S.venue==='port'){
    if(now<F.aiAt) return;
    if(gap>1.25){ walk(F,P,ui,uj,WALK*.4*S.scale); F.moving=true; F.mf=1; F.ms=0; return; }
    if(gap<=RANGE[0]) press(F,0,false);
    F.aiAt=now+1.2; return;
  }
  if(F.combo.length&&now>=F.comboAt){ const n=F.combo.shift(); if(gap<=RANGE[n.pid]*0.9&&F.rt.sta>=10&&press(F,n.pid,n.low)){ F.comboAt=now+(n.pid===0?.15:.22); } else F.combo.length=0; return; }
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
  const playerHurt=P.rt.sta<25||P.stun>45, k=(arch.idealGap-19)/9, ideal=RANGE[1]*(0.62+0.3*k), minGap=Math.max(MIN_SEP+0.04,ideal-0.14), targetGap=playerHurt?Math.min(ideal,0.9):ideal;
  if(now>=F.strafeUntil){ F.strafe=Math.random()<.5?-1:1; F.strafeUntil=now+.7+Math.random()*1.1; }
  if(gap>targetGap+0.1){
    if(playerHurt&&(archKey==='press'||archKey==='counter')&&gap<targetGap+0.55&&F.rt.evadeFatigue===0&&F.rt.sta>=nextEvCost+18&&Math.random()<arch.slipBias*0.18&&evade(F,P,ui,uj)){ F.aiAt=now+.28; return; }   // a dash in on a hurt man
    walk(F,P,ui,uj,WALK*0.8*S.scale); F.moving=true; F.mf=1; F.ms=0; return;
  }
  if(gap<minGap&&!playerHurt){
    if(perks.includes('shove')&&gap<1.0&&F.rt.sta>=12&&Math.random()<0.45){ F.rt.sta-=8; if(press(F,2,false,'shove')){ F.aiAt=now+.45; return; } }
    if(archKey==='out'||archKey==='counter'){
      if(F.rt.evadeFatigue===0&&F.rt.sta>=nextEvCost+14&&Math.random()<arch.slipBias*0.22&&evade(F,P,-ui,-uj)){ F.aiAt=now+.28; return; }   // a hop back out of reach
      walk(F,P,-ui,-uj,WALK*0.8*S.scale); F.moving=true; F.mf=-1; F.ms=0; F.aiAt=now+.18; return;
    }
  }
  if(Math.abs(gap-targetGap)<0.5){ walk(F,P,si*F.strafe,sj*F.strafe,WALK*0.5*S.scale); F.moving=true; F.mf=0; F.ms=F.strafe; }
  if(perks.includes('dirty-work')&&gap<1.0&&F.rt.sta>=16&&Math.random()<0.16){ F.rt.sta-=10; if(press(F,2,false,Math.random()<0.5?'headbutt':'elbow')){ F.aiAt=now+.55; return; } }
  if(F.rt.sta<16&&!playerHurt){ F.aiAt=now+.38; return; }
  const r=Math.random(), w=arch.weights;
  let pid=r<w[0]?0:(r<w[1]?1:(r<w[2]?2:3));
  if(gap>RANGE[pid]) pid=gap>RANGE[1]?0:1;
  if(gap>RANGE[0]){ F.aiAt=now+.12; return; }
  const aimBody=(P.rt.guarding&&Math.random()<0.70)||Math.random()<arch.bodyBias;
  if(press(F,pid,aimBody)){
    if(F.rt.sta>=20&&Math.random()<arch.comboChance*(playerHurt?1.35:1)){
      const second=pid===0?1:(pid===1?2:(pid===2?3:2));
      F.combo=[{pid:second,low:aimBody?false:(Math.random()<arch.bodyBias)}];
      if((archKey==='press'||playerHurt)&&F.rt.sta>=34&&Math.random()<0.45) F.combo.push({pid:second===2?3:2,low:false});
      F.comboAt=now+(pid===0?.16:.24);
    }
    if(archKey==='out'&&!F.combo.length&&Math.random()<0.4){ F.aiAt=now+.25; return; }
  }
  F.aiAt=now+(arch.cadence[0]+Math.random()*arch.cadence[1])*(playerHurt?0.68:1);
}

/** The simulation's time scale: 1, or slow motion after the player's perfect evade (held, then eased back). */
function timeScale(){
  const S=state; if(S.slowMo<=0) return 1;
  const u=1-S.slowMo/TUNING.slowMoDuration;
  return u<0.6?TUNING.slowMoScale:TUNING.slowMoScale+(1-TUNING.slowMoScale)*smooth((u-0.6)/0.4);
}

/** One 60 Hz step of the fight. The fight's own dt is scaled by the slow motion; the input clock (uiT) and the pause are not. */
export function isoFightTick(){ if(state.venue==='port') return withThamesCamera(tickFight); return tickFight(); }
function tickFight(){
  const S=state; if(!S.on) return;
  if(S.freeze>0){
    // Hit-stop freezes combat logic, but the struck torso still begins to fold
    // over the impact: otherwise the visual response starts frames after contact.
    S.freeze--;
    for(const F of [S.P,S.O]) if(F?.hurtT>0) F.hurtT=Math.max(0,F.hurtT-1/60);
    return;
  }
  const rawDt=1/60, scale=S.kdSlow>0?(S.kdSlow>3?0.85:S.kdSlow>1.8?0.35:0.16):(S.phase==='fight'?timeScale():1), dt=rawDt*scale, P=S.P, O=S.O;
  S.scale=scale; if(S.kdSlow>0) S.kdSlow=Math.max(0,S.kdSlow-rawDt); if(S.slowMo>0) S.slowMo=Math.max(0,S.slowMo-rawDt);
  if(S.banner&&S.kdSlow<=0&&--S.banner.t<=0) S.banner=null;   // the knockdown's words wait for the comic to end
  tickFeet(P,scale); tickFeet(O,scale); tickSpurt(P,scale); tickSpurt(O,scale); tickParts(scale);
  for(const F of [P,O]){ if((F.ko||F.down)&&!F.rd) startIsoRagdoll(F,null,1,F.ko); if(F.rd){ F.rd.steps+=scale; while(F.rd.steps>=1){ stepIsoRagdoll(F); F.rd.steps-=1; } } if(F.rise&&(F.rise.t+=scale/27)>=1) F.rise=null; }
  if(S.kdSlow>3&&S.venue!=='sandy') recordKnockdownFrame();
  for(const F of [P,O]){ F.gUp+=((F.rt.guarding?1:0)-F.gUp)*0.35*scale; F.hurtT=Math.max(0,F.hurtT-dt); F.stagger=Math.max(0,F.stagger-dt*(S.phase==='fight'?1:0)); }
  const [pi,pj]=toward(P,O), [oi,oj]=toward(O,P);
  for(const [F,ti,tj] of [[P,pi,pj],[O,oi,oj]]){ if(F.ko||F.down) continue; const turn=F.bull?0.11:0.22; F.fi+=(ti-F.fi)*turn*scale; F.fj+=(tj-F.fj)*turn*scale; const m=Math.hypot(F.fi,F.fj)||1; F.fi/=m; F.fj/=m; }
  P.moving=false; O.moving=false;
  if(S.phase==='intro'){
    S.pt++; if(S.pt===2) banner('WALCZ!',appearanceState.C_WHITE,80);
    if(S.pt>=45){ hideFightPlate(); S.phase='fight'; S.pt=0; banner('WALCZ!',appearanceState.C_SPARK,40); if(!S.evadeHintShown){ S.evadeHintShown=true; say('Mysz ruch · E unik'); } setInfo(); }
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
  if(sparringState.timeLimit&&S.elapsed>=sparringState.timeLimit){ timeUp(); return; }
  for(const F of [P,O]){
    const G=F===P?O:P;
    tickCombatant(F.rt,dt,now);
    if(F.dash&&(F.ko||F.down||F.grab||F.stagger>0)) F.dash=null;
    if(F.dash){
      const D=F.dash, u=Math.min(1,(now-D.at)/DASH.duration), next=dashTravel(u), moved=walk(F,G,D.di,D.dj,DASH.distance*Math.max(0,next-D.progress));
      D.progress=next;
      if(moved>1e-6){ F.moving=true; F.mf=D.di*F.fi+D.dj*F.fj; F.ms=D.di*-F.fj+D.dj*F.fi; }
      if(F.buf&&u>=DASH.punchFrom&&!F.pk){ const b=F.buf; F.buf=null; if(now<=b.until) press(F,b.pid,b.low); }
      if(u>=1) F.dash=null;
    }
    const su=(now-F.slipSince)/TUNING.slipActive;
    if(su>=0&&su<1&&!F.ko&&!F.down){   // the evade is a quick eased move of the whole body, not a jump
      walk(F,G,F.evDi,F.evDj,(EVADE_SPEED[F.evKind]||0.01)*Math.sin(Math.PI*su)*scale);
      F.moving=F.evKind!=='slip'; F.mf=F.evFwd; F.ms=F.evSide;
    }
    F.stagger=Math.max(0,F.stagger);
    F.stun=Math.max(0,F.stun-dt*4);
    F.c.minSta=Math.min(F.c.minSta,F.rt.sta/F.rt.staCap);
    if(F.wounds.cuts&&!F.down&&!F.ko) F.rt.hp=Math.max(1,F.rt.hp-(0.25*F.wounds.cuts)*dt);
    if(F.pk){ F.pk.t+=(F.pk.fastCounter?rawDt:dt)*(F.pk.exhausted?0.5:1)*(S.venue==='port'&&F===O?.5:1); if(!F.pk.hit&&F.pk.t>=punchT(F,F.pk.pid).hit){ F.pk.hit=true; impact(F,G); if(S.phase!=='fight') return; } if(F.pk&&F.pk.t>=punchT(F,F.pk.pid).end) F.pk=null; }
    if(F.buf&&(!F.pk||canCancel(F))&&!F.dash&&F.stagger<=0&&!F.down&&(now-F.slipSince>=TUNING.slipActive||(F===P&&S.slowMo>0&&now<F.rt.counterUntil))){ const b=F.buf; F.buf=null; if(now<=b.until) press(F,b.pid,b.low); }
    if(F.buf&&now>F.buf.until) F.buf=null;
    if(F.down&&!F.ko){   /* the count: the player gets up with enough taps, the rival on his own */
      const down=now-F.downAt;
      if(F===P){
        if(F.kdMash>=riseTaps(F)&&down>=1.2){ F.down=false; F.stagger=.6; stopIsoRagdoll(F); say('Wstałeś z desek! Trzymaj gardę'); }
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
    else { if(di||dj) moveClinch(di,dj,scale); return; }
  }
  if(S.guardHeld&&(free||P.dash&&now-P.dash.at>=DASH.duration*.80)&&!P.rt.guarding&&now-P.slipSince>=TUNING.slipActive) setGuard(P.rt,true,now);
  if(!S.guardHeld&&P.rt.guarding) setGuard(P.rt,false,now);
  if((di||dj)&&free&&now-P.slipSince>=TUNING.slipActive){
    const sp=WALK*(0.9+0.1*boxingState.STATS.speed)*(P.rt.guarding?0.5:1)*scale;
    const moved=walk(P,O,di,dj,sp); P.moving=moved>0; P.mf=di*P.fi+dj*P.fj; P.ms=di*(-P.fj)+dj*P.fi;
    if(moved>0) P.lastMove=[di,dj];
  }
  ai(O,P);
  for(const F of [O,P]) updateCrowdGrab(F);
  for(const F of [P,O]) if(!F.ko&&!F.down){
    if((F.bleed||F.wounds.cuts)&&F.rt.hp/F.rt.hpMax<0.6&&Math.random()<0.02*scale) drip(F,'blood');
    if(F.bull?.mode==='EXHAUSTED'&&Math.random()<0.045*scale) drip(F,'sweat');
  }
  if(sparringState.rigged&&!S.rigKO&&(P.rt.hp/P.rt.hpMax-O.rt.hp/O.rt.hpMax>.15||now>35)){
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
  const m=(/** @type {number[]} */ a,/** @type {number[]} */ b)=>lerp3(a,b,k), side=(/** @type {number} */ s)=>{ const a=A(s), b=B(s); return {hip:m(a.hip,b.hip),knee:m(a.knee,b.knee),foot:m(a.foot,b.foot),sh:m(a.sh,b.sh),el:m(a.el,b.el),hd:m(a.hd,b.hd)}; };
  const J={1:side(1),'-1':side(-1)}, f=(/** @type {number} */ s)=>J[s];
  f.pel=m(A.pel,B.pel); f.chest=m(A.chest,B.chest); f.head=m(A.head,B.head);
  if(A.belly||B.belly){ const mid=(/** @type {any} */ X)=>X.belly||lerp3(X.pel,X.chest,0.5); f.belly=lerp3(mid(A),mid(B),k); }
  if(A.abd||B.abd) f.abd=m(A.abd||lerp3(A.pel,A.chest,.48),B.abd||lerp3(B.pel,B.chest,.48));
  return f;
}

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
  let lung=0, e=0, arm=0, follow=0, wind=0;
  const pk=F.pk, D=pk?DRIVE[pk.pid]:null, hook=pk?.pid===2, upper=pk?.pid===3;
  if(pk){
    const T=punchT(F,pk.pid), striking=pk.t<T.hit;
    const k=striking?pk.t/T.hit:Math.max(0,1-(pk.t-T.hit)/(T.end-T.hit));
    e=striking&&(F===state.P||F===state.O)?punchSnap(k):smooth(Math.min(1,k));
    arm=striking?e:e*e; // fist retracts slightly ahead of the torso
    if(!striking&&k>0.6)follow=Math.sin(Math.PI*(1-k)/0.4);
    if((hook||upper)&&striking)wind=Math.sin(Math.PI*k);
    lean+=D.lean*e;
    bob-=D.drop*e+(upper?0.9:hook?0.2:0)*wind;
    lung=LUNGE[pk.pid]*e;
    if(pk.low)bob-=0.80*e; // crouch in the knees, not a collapsed spine
  }
  const ps=pk?(pk.hand??(F.leadSide===-1?[-1,1,1,1][pk.pid]:HAND[pk.pid])):0;
  const su=(t-F.slipSince)/TUNING.slipActive;
  if(su>=0&&su<=1){
    const w=Math.sin(Math.PI*su);
    if(F.evKind==='in'){lean+=1.15*w;bob-=0.9*w;lateral+=0.45*F.evSide*w;}
    else if(F.evKind==='back'){lean-=1.25*w;bob-=0.75*w;lateral+=0.45*F.evSide*w;}
    else {lateral+=2.8*F.slipDir*w;lean+=0.6*F.evFwd*w;bob-=1.1*w;}
  }
  if(clinch){lean+=1.1;bob-=0.5;}

  const body=F.hurtLow?bodyHitMotion(F.hurtT,F.hurtDuration,F.hurtPower,F.hurtBlocked):{fold:0,knees:0,cover:0};
  const fold=Math.min(1.15,body.fold), absorb=body.knees, cover=body.cover;
  const hitSide=F.hurtSide||0;
  lean+=0.1*fold;
  bob-=0.54*absorb;
  const h=F.hurtLow?0:Math.min(1,F.hurtT/0.3)*F.hurtPower;
  if(!F.hurtLow){
    lean-=(F.hurtDir===2?0.8:1.5)*h;
    lateral+=(F.hurtDir===2?1.3*F.leadSide:0)*h;
    bob-=0.3*h;
  }
  if(F.stagger>0){lean-=0.8;bob-=0.6;}
  const breathing=F.bull?.mode==='EXHAUSTED',loading=F.bull?.mode==='WINDUP';
  if(breathing){lean+=2.1;bob-=1.25+0.28*Math.sin(t*9);lateral+=0.14*Math.sin(t*4);}
  if(loading){lean-=0.5;lateral+=0.6*F.leadSide;bob-=0.55;}

  // Anatomical pelvis, abdomen, ribcage and neck form one continuous chain.
  // The rotating pelvis and shoulders are sockets of that chain, not separate
  // animated points that can pull away from the body in a power punch.
  const bodySide=hook?-ps*e*0.4:(pk&&pk.low?ps*e:0);
  const walkRot=-stride*0.58-F.lagS*0.25, hipRot=stride*0.42;
  const asin=(v)=>Math.asin(Math.max(-1,Math.min(1,v)));
  const shoulderYaw=-asin(walkRot/2.7)
    -(D?ps*(D.yaw*e*(1+0.18*follow)-(hook?0.4:upper?0.3:0)*wind):0);
  const hipYaw=-asin(hipRot*0.45/1.25)
    -(D?ps*(D.hip*e-(hook||upper?0.15:0)*wind):0);
  const tilt=D?D.tilt*e+(upper?-0.6*wind:0):0;
  const feet={};
  for(const side of [-1,1]){
    const f=footJoint(F,side);
    feet[side]=[f.fwd,f.side,RIG.footHeight+f.lift];
  }
  const pelvisHint=[lung*0.24-F.lagF*0.14,
    lateral*0.48-F.lagS*0.15,RIG.pelvisHeight+bob];
  const pelvis=supportPelvis(pelvisHint,feet,hipYaw);
  const {abdomen,chest}=buildSpine(pelvis,{
    lean:lean+lung*0.18,sideLean:lateral*0.22+bodySide*0.42+ps*tilt*0.14+hitSide*fold*0.12,
    fold,lunge:lung
  });
  const legs=legAnchors(pelvis,feet,hipYaw);
  const J={};
  for(const side of [-1,1]){
    const s=side, punching=!!D&&s===ps, leg=legs[s];
    const [knee,ankle]=solveLimb(leg.hip,leg.foot,LEG_U,LEG_L,leg.pole);
    const shrug=D?(punching?D.rise:-0.2*D.rise)*e+s*ps*tilt*0.38:0;
    const sh=shoulderSocket(chest,s,shoulderYaw,shrug);

    // Shoulder-relative guard. Upper arms, forearms, hands and elbows follow
    // the ribcage through slips, lunges and body hits without changing length.
    const armSwing=-s*stride*0.45+F.lagF*0.35;
    const mill=pk?0:(1-F.gUp)*0.2, phase=t*5.5+F.seed+(s>0?0:Math.PI);
    let pole=[sh[0]+0.65+armSwing*0.30,sh[1]+s*0.20,sh[2]-1.75];
    let hand=[sh[0]+2.2+armSwing*0.7+Math.cos(phase)*mill,
      sh[1]-s*1.45,sh[2]+1.55+Math.sin(phase)*mill];
    if(clinch){
      pole=[sh[0]+1.1,sh[1]+s*0.35,sh[2]-1.55];
      hand=[sh[0]+3.1,sh[1]-s*1.0,sh[2]-0.1];
    }
    if(F.gUp>0.02){
      pole=lerp3(pole,[sh[0]+0.7,sh[1]+s*0.12,sh[2]-1.48],F.gUp);
      hand=lerp3(hand,[sh[0]+2.7,sh[1]-s*1.58,sh[2]+1.85],F.gUp);
    }
    if(breathing){
      pole=[sh[0]+0.5,sh[1]+s*0.55,sh[2]-3.0];
      hand=[sh[0]+1.45,sh[1]+s*0.18,sh[2]-5.45];
    }
    if(loading){
      pole=[sh[0]-0.35,sh[1]+s*0.65,sh[2]-1.95];
      hand=[sh[0]-0.15,sh[1]+s*0.5,sh[2]-0.95];
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
      heelLift:punching?Math.min(0.34,D.heel*e*0.45):0};
  }
  const jf=(s)=>J[s];
  jf.pel=pelvis;
  jf.abd=abdomen;
  jf.chest=chest;

  // The head reacts with a short neck rather than teleporting independently.
  // This also preserves the slip and the lead-shoulder chin-cover silhouette.
  const headHint=[
    chest[0]+0.1+F.hLagF*0.48+(D?D.head[0]*e:0)+0.58*fold,
    chest[1]+F.hLagS*0.40+bodySide*0.45
      +(D?ps*(D.head[1]*e+(upper?0.6:0)*wind):0)+hitSide*fold*0.32,
    chest[2]+RIG.neckToHead-0.68*fold-0.48*F.gUp
      -(F.stagger>0?0.52:0)-(breathing?0.42:0)
      -Math.abs(F.hLagF)*0.12
  ];
  if(!F.hurtLow){
    headHint[0]-=(F.hurtDir===2?0.25:F.hurtDir===3?0.5:0.8)*h;
    headHint[1]+=(F.hurtDir===2?0.8*F.leadSide:0)*h;
    headHint[2]+=(F.hurtDir===3?0.35:0)*h;
  }
  jf.head=headSocket(chest,headHint);
  return jf;
}

/** Draw one fighter as the hub figure: on his feet, getting up (from the ragdoll's last pose to his stance) or as a ragdoll on the boards. @param {any} F */
function drawFighter(F){
  if((F.ko||F.down)&&F.rd){ figureHD(F,ragdollJoints(F),F.look,{pose:0,base:0,noShadow:true,light:true,tilt:true}); return; }
  let jf=fighterJoints(F);
  if(F.rise){ jf=blendJoints(F.rise.joints,jf,smooth(Math.min(1,F.rise.t))); }
  figureHD(F,jf,F.look,{pose:0,base:0,noShadow:!!F.rise,light:state.venue!=='sandy',tilt:!!F.rise||!!F.pk?.low||F.pk?.pid===2||F.pk?.pid===3||F.hurtT>0});
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
  const fat=Math.min(1,(F.rt.evadeFatigue||0)*0.28), staCol=fat>0?mix(A.C_SPARK,A.C_RED,fat*0.65):A.C_SPARK;   // the breath bar warms as evading wears him out
  rect(x-1,y-1,w+2,9,A.C_OUT);
  const fill=(/** @type {number} */ yy,/** @type {number} */ hh,/** @type {number} */ k,/** @type {number} */ c)=>{ const n=Math.round(w*Math.max(0,Math.min(1,k))); rect(right?x+w-n:x,yy,n,hh,c); };
  fill(y,4,hp,A.C_RED);
  rect(x,y+5,w,3,0xff2a2418); fill(y+5,3,cap,0xff4a4230); fill(y+5,3,sta,staCol);
}

/** Render a fighter's existing head model once for the fight HUD. @param {any} F */
function fightPortrait(F){
  const W=appearanceState.W, H=appearanceState.H, buf=new Uint32Array(W*H), previous=setFramebuffer(buf);
  const C={i:5,j:5,fi:0.7071,fj:0.7071}, J=(s)=>({hip:[0,s*1.2,7],knee:[0,s*1.2,4],foot:[0,s*1.2,1],sh:[0,s*2.5,12],el:[0,s*2.5,10],hd:[0,s*1.5,13]});
  J.pel=[0,0,7]; J.chest=[0,0,12]; J.head=[0,0,16];
  try{ F.wrap(()=>figureHD(C,J,F.look,{noShadow:true})); } finally { setFramebuffer(previous); }
  const cx=Math.round(isoX(C.i,C.j)), cy=Math.round(isoY(C.i,C.j,15.4));
  const portrait=new Uint32Array(12*14);
  for(let y=0;y<14;y++) for(let x=0;x<12;x++){ const sx=cx+x-6, sy=cy+y-6; if(sx>=0&&sy>=0&&sx<W&&sy<H) portrait[y*12+x]=buf[sy*W+sx]; }
  return portrait;
}

/** Paint a framed portrait beside the bars. @param {Uint32Array} portrait @param {number} x @param {number} phase @param {any} F */
function drawFightPortrait(portrait,x,phase,F){
  const K=gymState.ISO_K, W=appearanceState.W, fb=rendererState.fb;
  rect(x,4,16,18,appearanceState.C_OUT); rect(x+1,5,14,16,0xff30241c);
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
const RD_PAIRS=[[0,11],[11,1],[1,2],[0,3],[3,4],[0,5],[5,6],[1,7],[7,8],[1,9],[9,10],[0,2],[3,5],[0,1]];   // the last three only push apart (spine-head, knees, a spine folded double)
const RD_SOFT=11, RD_SOFT_MIN=[0.85,0.85,0.55];
const RD_RAD=[1.4,1.6,1.5,0.9,0.8,0.9,0.8,0.8,0.7,0.8,0.7,1.5];
const RD_GRAV=0.07;

/** Put a fighter into the ragdoll from the pose he stands in, with the blow's push (away from attacker A). @param {any} F @param {any} A @param {number} pid @param {boolean} ko */
function startIsoRagdoll(F,A,pid,ko){
  const J=fighterJoints(F), a=J(1), b=J(-1), loc=[J.pel,J.chest,J.head,a.knee,a.foot,b.knee,b.foot,a.el,a.hd,b.el,b.hd,J.pel.map((v,k)=>(v+J.chest[k])/2)];
  let af=-1, as=0; if(A){ const [ui,uj]=toward(A,F); af=ui*F.fi+uj*F.fj; as=ui*-F.fj+uj*F.fi; }
  if(pid===2){ const side=A?.pk?.hand||1; af*=0.25; as=side; }
  const sp=ko?0.75:0.62, kick=pid===3?0.3:0.1, gut=!!A?.pk?.low;   // a body blow caves the belly in while the chest and head fold forward over the fist
  const nodes=loc.map(([f,s,z],k)=>{
    const w=world(F,f,s), m=gut?(k===11?1.5:k===0?0.9:k===1?-0.15:k===2?0.05:k>=7&&k<=10?0.6:0.3):k===11?0.7:k===2?1.35:k===1?0.95:k===0?0.45:k>=7?1.1:0.15;
    const vf=af*sp*m+rnd(-0.03,0.03), vs=as*sp*m+rnd(-0.03,0.03), vi=(vf*F.fi-vs*F.fj)/7.5, vj=(vf*F.fj+vs*F.fi)/7.5, vz=k<=2||k===11?kick*m:0;
    return {i:w.i,j:w.j,z,pi:w.i-vi,pj:w.j-vj,pz:z-vz};
  });
  const len=RD_PAIRS.map(([p,q],k)=>{ const d=Math.hypot(loc[q][0]-loc[p][0],loc[q][1]-loc[p][1],loc[q][2]-loc[p][2]); return k>=RD_SOFT?d*RD_SOFT_MIN[k-RD_SOFT]:d; });
  F.rd={nodes,len,thud:false,steps:0}; F.rise=null; if(A){ state.kdSlow=3.8; if(state.venue!=='sandy'){ startKnockdownComic(F===state.P?0:1,pid,!!A.pk?.low,state.venue); recordKnockdownFrame(); } }
}

/** One 60 Hz step of the ragdoll. @param {any} F */
function stepIsoRagdoll(F){
  const N=F.rd.nodes, L=F.rd.len;
  for(const n of N){ const vi=(n.i-n.pi)*0.97, vj=(n.j-n.pj)*0.97, vz=(n.z-n.pz)*0.97-RD_GRAV; n.pi=n.i; n.pj=n.j; n.pz=n.z; n.i+=vi; n.j+=vj; n.z+=vz; }
  for(let it=0;it<4;it++){
    for(let b=0;b<RD_PAIRS.length;b++){
      const A=N[RD_PAIRS[b][0]], B=N[RD_PAIRS[b][1]], dx=(B.i-A.i)*7.5, dy=(B.j-A.j)*7.5, dz=B.z-A.z, d=Math.hypot(dx,dy,dz)||1e-4;
      if(b>=RD_SOFT&&d>=L[b]) continue;
      const k=(L[b]-d)/d*0.5;
      A.i-=dx*k/7.5; A.j-=dy*k/7.5; A.z-=dz*k; B.i+=dx*k/7.5; B.j+=dy*k/7.5; B.z+=dz*k;
    }
    for(const [h,kn,ft] of [[0,3,4],[0,5,6]]){ const zm=Math.max(N[h].z,N[ft].z)+1.4; if(N[kn].z>zm) N[kn].z=zm; }   // a knee never folds high above the hip and foot
    for(let k=0;k<N.length;k++){
      const n=N[k];
      if(n.z<RD_RAD[k]){
        const vz=n.z-n.pz, vi=n.i-n.pi, vj=n.j-n.pj;
        n.z=RD_RAD[k]; n.pz=n.z+vz*0.2; n.pi=n.i-vi*0.76; n.pj=n.j-vj*0.76;
        if(!F.rd.thud&&k===1&&vz<-0.45){ F.rd.thud=true; sfxLand(Math.min(1.5,-vz*1.3)); boxingState.shakeT=boxingState.shakeDur=5; boxingState.shakeAmp=1; boxingState.shakeAxis=1; }   // the first heavy landing of the chest
      }
      if(fightBlocked(n.i,n.j)){ if(!fightBlocked(n.pi,n.pj)){ n.i=n.pi; n.j=n.pj; } else { n.pi=n.i; n.pj=n.j; } }
    }
  }
  const pel=N[0]; if(!fightBlocked(pel.i,pel.j)){ F.i=pel.i; F.j=pel.j; F.li=F.i; F.lj=F.j; }
}

/** The ragdoll as joints in the body coordinates figureHD draws; the hip and shoulder lines follow the spine. @param {any} F */
function ragdollJoints(F){
  const N=F.rd.nodes, loc=(/** @type {any} */ n)=>{ const di=(n.i-F.i)*7.5, dj=(n.j-F.j)*7.5; return [di*F.fi+dj*F.fj,di*-F.fj+dj*F.fi,n.z]; };
  const pel=loc(N[0]), chest=loc(N[1]), head=loc(N[2]);
  let ux=chest[0]-pel[0], uy=chest[1]-pel[1], uz=chest[2]-pel[2]; const ul=Math.hypot(ux,uy,uz)||1; ux/=ul; uy/=ul; uz/=ul;
  let sx=-uy*ux, sy=1-uy*uy, sz=-uy*uz, sl=Math.hypot(sx,sy,sz); if(sl<0.2){ sx=1-ux*ux; sy=-ux*uy; sz=-ux*uz; sl=Math.hypot(sx,sy,sz)||1; } sx/=sl; sy/=sl; sz/=sl;   // the body's side made square to the spine
  const at=(/** @type {number[]} */ o,/** @type {number} */ k)=>[o[0]+sx*k,o[1]+sy*k,o[2]+sz*k];
  const side=(/** @type {number} */ s,/** @type {number} */ kn,/** @type {number} */ ft,/** @type {number} */ el,/** @type {number} */ hd)=>({hip:at(pel,s*1.25),knee:loc(N[kn]),foot:loc(N[ft]),sh:at(chest,s*2.7),el:loc(N[el]),hd:loc(N[hd])});
  const J={1:side(1,3,4,7,8),'-1':side(-1,5,6,9,10)}, f=(/** @type {number} */ s)=>J[s];
  f.pel=pel; f.chest=chest; f.head=head; f.belly=loc(N[11]); f.abd=lerp3(pel,chest,.48);
  return f;
}

/** Back on his feet where he lay: the pose he got up from fades into his stance. @param {any} F */
function stopIsoRagdoll(F){
  if(!F.rd) return;
  F.rise={joints:ragdollJoints(F),t:0}; F.rd=null; F.li=F.i; F.lj=F.j;
  for(const s of [1,-1]) Object.assign(F.ft[s],stance(F,s),{sw:0,from:null,to:null});
}

const BLOOD=rgb('#7a121a'), BLOOD_DRY=rgb('#38090e'), BLOOD_HI=rgb('#98222b');
const SWEAT_MIST=rgb('#586a74'), SWEAT_DROP=rgb('#7c909a'), SWEAT_FLOOR=rgb('#181a1e');
const rnd=(/** @type {number} */ a,/** @type {number} */ b)=>a+Math.random()*(b-a);

/** Throw a small amount of sweat on damaging hits; blood replaces it below 60% health and grows as health falls.
 * @param {any} A @param {any} D @param {number} pid @param {boolean} low @param {boolean} blocked @param {{damage:number,counter:boolean}} o @param {boolean} [ko] */
function spray(A,D,pid,low,blocked,o,ko){
  const [ui,uj]=toward(A,D), si=-uj, sj=ui, z0=low?9.5:14.6, hpF=D.rt.hp/D.rt.hpMax, swing=pid===2?1:0, heavy=pid>=1||o.counter||!!ko;
  const fire=(/** @type {'mist'|'sweat'|'blood'} */ kind,/** @type {number} */ n,/** @type {number} */ power)=>{
    const mist=kind==='mist';
    for(let k=0;k<n;k++){
      const along=rnd(mist?0.25:0.45,mist?0.85:1.25)*power, across=rnd(-0.85,0.85)*(pid<=1?0.22:0.8+swing*0.5)*power+swing*0.55*power, sp=mist?0.016:0.021;
      state.parts.push({kind,i:D.i+ui*0.08+rnd(-0.04,0.04),j:D.j+uj*0.08+rnd(-0.04,0.04),z:z0+rnd(-0.8,0.8),vi:(ui*along+si*across)*sp,vj:(uj*along+sj*across)*sp,
        vz:pid===3&&!low?rnd(0.45,0.95)*power:rnd(0.15,0.65)*(0.5+power*0.45),size:kind==='blood'&&heavy&&Math.random()<0.28?2:1,
        age:0,maxAge:mist?10+(Math.random()*8|0):999,creep:0,host:null,df:0,ds:0,pi:D.i,pj:D.j,pz:z0}); } };
  if(blocked||o.damage<=0) return;
  if(hpF>=0.6&&!ko){
    fire('mist',Math.max(1,Math.round((3+pid*2+(o.counter?2:0))*0.4)),0.85+pid*0.15);
    if(heavy) fire('sweat',Math.max(1,Math.round((2+pid+(o.counter?2:0))*0.4)),0.95+pid*0.18);
  } else if(!low||ko){
    D.bleed=true;
    const amount=0.4+0.6*Math.max(0,1-hpF/0.6);
    fire('blood',Math.max(1,Math.round((ko?16:3+pid*3+(o.counter?4:0))*amount)),ko?1.45:1+0.18*pid);
    if(ko) D.spurt={t:34,ui,uj,si,sj};
  }
}

/** The blood that keeps jetting from a finished fighter: pulses from the head, arcing away from the attacker and fading out. @param {any} F @param {number} scale */
function tickSpurt(F,scale){
  const S=F.spurt; if(!S) return;
  S.t-=scale; if(S.t<=0){ F.spurt=null; return; }
  const h=F.rd?F.rd.nodes[2]:{i:F.i,j:F.j,z:14}, fade=Math.min(1,S.t/12), pulse=0.55+0.45*Math.sin(S.t*0.9), n=1+Math.round(3*pulse*fade);
  for(let k=0;k<n;k++){
    const along=rnd(0.9,1.9)*(0.5+0.5*pulse)*(0.6+0.4*fade), across=rnd(-0.55,0.55), sp=0.021;
    state.parts.push({kind:'blood',i:h.i,j:h.j,z:h.z,vi:(S.ui*along+S.si*across)*sp,vj:(S.uj*along+S.sj*across)*sp,vz:rnd(0.3,0.85)*(0.5+0.5*pulse),size:Math.random()<0.3?2:1,
      age:0,maxAge:999,creep:0,host:null,df:0,ds:0,pi:h.i,pj:h.j,pz:h.z});
  }
}

/** A drop that creeps down the face first (a cut that keeps bleeding, a tired sweat) and only then lets go. @param {any} F @param {'sweat'|'blood'} kind */
function drip(F,kind){
  const df=rnd(0.14,0.21), ds=rnd(-0.08,0.08), z=kind==='blood'?rnd(13.2,14.4):rnd(13.8,15), i=F.i+F.fi*df-F.fj*ds, j=F.j+F.fj*df+F.fi*ds;
  state.parts.push({kind,i,j,z,vi:F.fi*0.002,vj:F.fj*0.002,vz:0,size:1,age:0,maxAge:999,creep:14+(Math.random()*8|0),host:F,df,ds,pi:i,pj:j,pz:z});
}

/** Fly the mist and the drops; a fast drop splashes small on the boards; blood that lands stays as a stain, sweat leaves a faint wet spot. */
function tickParts(scale=1){
  const S=state, live=[], [bw,bh]=S.venue==='port'?[30,13]:hubBounds();
  for(const p of S.parts){
    p.age+=scale; p.pi=p.i; p.pj=p.j; p.pz=p.z;
    if(p.creep>0&&p.host&&!p.host.ko&&!p.host.down){   // the viscous phase: it slides down the cheek and chin with the head
      p.creep--; p.i=p.host.i+p.host.fi*p.df-p.host.fj*p.ds; p.j=p.host.j+p.host.fj*p.df+p.host.fi*p.ds; p.z-=0.07*scale; live.push(p); continue; }
    if(p.kind==='mist'){ p.vi*=0.85; p.vj*=0.85; p.vz=p.vz*0.9-0.016; p.i+=p.vi*scale; p.j+=p.vj*scale; p.z+=p.vz*scale; if(p.age<p.maxAge&&p.z>0) live.push(p); continue; }
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

/** Zoom on the fighters: close in on the pair, wider only when they part; the centre follows with a lag. */
function camera(){
  const S=state, C=S.cam, K=gymState.ISO_K, W=appearanceState.W, H=appearanceState.H, P=S.P, O=S.O;
  const px=isoX(P.i,P.j), py=isoY(P.i,P.j,9), ox=isoX(O.i,O.j), oy=isoY(O.i,O.j,9);
  const need=Math.max(Math.abs(px-ox)+52*K,(Math.abs(py-oy)+48*K)*1.5), zt=Math.min(2.35,Math.max(1.3,W/need));
  if(C.init){ C.init=false; C.z=zt; C.x=(px+ox)/2; C.y=(py+oy)/2+4*K; }
  C.z+=(zt-C.z)*0.08; const z=(Math.abs(C.z-2.35)<0.03?2.35:C.z)*(1+0.35*Math.max(slowMoEffect(),knockdownZoom()));
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

/** Save a presentation-only snapshot so the comic can replay the same fall. */
function recordKnockdownFrame(){
  const frame=/** @type {any} */ ([state.P,state.O].map(F=>({
    C:{i:F.i,j:F.j,fi:F.fi,fj:F.fj}, look:F.look, wrap:F.wrap,
    joints:F.rd?ragdollJoints(F):fighterJoints(F), tilt:!!F.rd||!!F.pk?.low||F.pk?.pid===2
  })));
  frame.blood=state.parts.filter(p=>p.kind==='blood').map(({i,j,z,pi,pj,pz,size})=>({i,j,z,pi,pj,pz,size}));   // the drops in the air, for the comic to replay
  recordKnockdownComicFrame(frame);
}

/** The comic's closing words: the knockdown or the stoppage, the count, and the taps the player still needs to rise. */
function comicCaption(){
  const S=state, V=comicState.victim===0?S.P:S.O;
  if(V.ko) return {title:S.how==='TKO'?'TKO!':S.how==='KASTET'?'KASTET!':'KO!',line:'',pips:null};
  if(V===S.P) return V.down?{title:'WSTAWAJ!',line:'WCISKAJ KLAWISZE',pips:[Math.min(V.kdMash,riseTaps(V)),riseTaps(V)]}:{title:plain('Wstałeś!'),line:'',pips:null};
  return {title:'NOKDAUN!',line:'RYWAL NA DESKACH '+V.kdN+'/3',pips:null};
}

/** Frame: the room with both fighters, bars, sparks and the notice. Called inside the 2× frame. */
export function renderIsoFight(){ if(state.venue==='port') return withThamesCamera(renderFight); return renderFight(); }
function renderFight(){
  const S=state; if(!S.on) return;
  if(S.venue!=='sandy'&&S.kdSlow>0&&knockdownComicOnScreen(3.8-S.kdSlow,S.kdSlow)){ drawKnockdownComic(3.8-S.kdSlow,comicCaption()); return; }
  if(gymState.fightSpectators) for(const C of gymState.fightSpectators) C.t=S.t*60;
  if(S.venue==='port') renderThamesPort([S.P,S.O]);
  else if(S.venue==='sandy'){
    renderSandyArena(); drawDecals();
    for(const F of [S.P,S.O].sort((a,b)=>(a.i+a.j)-(b.i+b.j))){ F.draw(); drawSandyFootDust(F); }
  } else renderHub();   /* standard fights remain in their room's depth sorter */
  const K=gymState.ISO_K, W=appearanceState.W/K;
  drawParts();
  if(S.phase==='intro'||S.phase==='fight') marker(S.P);
  camera();
  applySlowMoTint();
  if(!S.portraits) S.portraits=[fightPortrait(S.P),fightPortrait(S.O)];
  drawFightPortrait(S.portraits[0],4,0,S.P); drawFightPortrait(S.portraits[1],W-20,1,S.O);
  bars(22,6,44,S.P,false); bars(W-66,6,44,S.O,true);
  drawText('TY',30*K,17*K,appearanceState.C_WHITE,1); drawText(plain(String(S.opp.name)),(W-22)*K-(String(S.opp.name).length*2)*K,17*K,appearanceState.C_WHITE,1);
  if(S.notice&&(S.t<S.noticeUntil||S.phase!=='fight')) drawText(plain(S.notice),(W/2)*K,(appearanceState.H/K-12)*K,appearanceState.C_WHITE,1);
  if(S.banner){ const b=S.banner; if(b.t>8||(b.t&2)) drawText(b.text,W/2*K,56*K,b.color,2); }
}

/** A small arrow over the player's head, so the two can be told apart. @param {any} F */
function marker(F){
  const K=gymState.ISO_K, x=Math.round(isoX(F.i,F.j)), y=Math.round(isoY(F.i,F.j,22))-((boxingState.tick>>3)&1)*K;
  for(let r=0;r<3;r++) for(let dx=-r;dx<=r;dx++) rect(x/K+dx|0,y/K+(2-r),1,1,appearanceState.C_SPARK);
}

/** Text for the info line below the picture. */
export function isoFightInfo(){
  const S=state, V=S.venue, where=V==='sandy'?'TEST HD 432×288 · BOHATER VS HARRY':V==='port'?'BÓJKA W PORCIE':V==='yard'?'BÓJKA NA SPACERNIAKU':V==='canteen'?'BÓJKA PRZY POSIŁKU':V==='laznia'?'BÓJKA W ŁAŹNI':'BÓJKA W WARDZIE';
  return where+' · '+(S.opp?S.opp.title:'')+' · '+(S.phase==='end'||S.phase==='ko'?'KONIEC':'DO KO')+(V==='sandy'?' · R restart · F9 PNG':'');
}
export const CONTROLS='mysz/WASD ruch · F dash ku kursorowi · E unik · 2× E odskok · 1 jab · 2 cross · 3 hook · 4 uppercut · LPM + cios: korpus · Spacja blok / klincz · Q slip · F10 pauza · Esc wyjście';
