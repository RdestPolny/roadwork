/* Isometric fight: the prison's brawl, played in the isometric hub rooms (the Ward, the yard, the bath) with free movement in
   eight directions. The punches, guard, slip, stamina and damage are the rules of realtime-rules.js; the opponents, their
   styles, the knockdowns, the wounds and the result card are the fight's old ones. The people are the 3D-skeleton figures of
   the hub rooms (figureHD) posed for a stance, a punch and a slip. */

import { state as boxingState, popup, drawText } from './boxing.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as gymState, figureHD, hubBlocked, hubBounds, hubRebake, hubTransReset, heroFigureLook, isoX, isoY, renderHub } from './gym.js';
import { state as rendererState, zoomBlit } from './renderer.js';
import { mix } from './cast.js';
import { state as npcsState, cnLookHD } from './npcs.js';
import { state as sparringState, oppDef, oppLevels, oppStars, setSparFight } from './sparring.js';
import { setRoomRaw } from './rooms.js';
import { state as inputState, setInfo } from './input.js';
import { exitToHub } from './navigation.js';
import { initAudio, sfxPunch, sfxWhoosh, sfxBlock, sfxKO, sfxBell, sfxCrack } from './audio.js';
import { createCombatant, tickCombatant, beginPunch, whiffPunch, setGuard, beginSlip, resolvePunch, TUNING } from './realtime-rules.js';
import { state as progressionState, resetSessXP, addXP, persist, sessXPText, statShort, passTrial, recordFight } from './progression.js';
import { fighterStats } from './stats.js';
import { fightXP } from './training-data.js';
import { doneToday, takeFightTrial } from './training-session.js';
import { prisonFightEnd, countFight, showFightPlate, hideFightPlate } from './prison.js';
import { hungerLevel, tiredness } from './simulation.js';
import { lastingSpec } from './card-data.js';

// Runtime values owned by iso-fight; the fight is reset by startIsoFight().
export const state = {on:false,t:0,P:null,O:null,keys:{},low:false,guardHeld:false,phase:'off',pt:0,elapsed:0,winner:null,how:'',idx:0,venue:'cell',opp:null,rigKO:false,
  notice:'',noticeUntil:0,fx:[],freeze:0,slipFlip:1,parts:[],decals:[],cam:{z:2,x:144,y:96,init:true},xpToday:0,trial:null,banner:null};

/** Seconds from the start of a punch to contact and to the end of the recovery. */
const PT=[{hit:.10,end:.30},{hit:.15,end:.40},{hit:.19,end:.48},{hit:.19,end:.48}];
/** Farthest hip-to-hip distance (room units) at which each punch lands: the old side-on ranges 33/31/27/26 px scaled to the rooms. */
const RANGE=[1.45,1.40,1.20,1.10];
const LUNGE=[1.2,1.6,1.8,1.4];
/** Jab and hook with the lead hand, cross and uppercut with the rear one. */
const HAND=[1,-1,1,-1];
const MIN_SEP=0.8;
const WALK=0.034;

/** The opponents' styles (the old tuning): preferred distance in px of the side-on picture, punch weights, slip habit, combos, body shots, pace. */
const ARCH=/** @type {Record<string,{idealGap:number,minGap:number,weights:number[],slipBias:number,comboChance:number,bodyBias:number,cadence:number[]}>} */ ({
  out:     { idealGap: 28, minGap: 21, weights: [0.55, 0.85, 0.95, 1.0], slipBias: 0.60, comboChance: 0.42, bodyBias: 0.20, cadence: [0.42, 0.45] },
  press:   { idealGap: 19, minGap: 16, weights: [0.15, 0.40, 0.75, 1.0], slipBias: 0.20, comboChance: 0.65, bodyBias: 0.45, cadence: [0.34, 0.38] },
  counter: { idealGap: 24, minGap: 19, weights: [0.30, 0.65, 0.85, 1.0], slipBias: 0.72, comboChance: 0.50, bodyBias: 0.25, cadence: [0.50, 0.55] },
  bal:     { idealGap: 22, minGap: 18, weights: [0.22, 0.52, 0.85, 1.0], slipBias: 0.32, comboChance: 0.42, bodyBias: 0.30, cadence: [0.44, 0.48] },
  tank:    { idealGap: 20, minGap: 16, weights: [0.10, 0.45, 0.75, 1.0], slipBias: 0.10, comboChance: 0.48, bodyBias: 0.38, cadence: [0.48, 0.52] }});

/** Per-punch hand targets in body coordinates [forward, side, height] (elbow, fist) for hand side s. */
const REACH=[
  (s)=>[[3.6,s*1.4,13.0],[7.6,s*0.5,13.7]],
  (s)=>[[3.6,s*1.4,13.0],[8.0,s*0.4,13.6]],
  (s)=>[[3.2,s*3.4,13.3],[5.4,-s*0.6,13.6]],
  (s)=>[[2.4,s*2.0,9.6],[4.4,s*0.8,16.0]]];

const lerp3=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number} */ k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
const smooth=(/** @type {number} */ k)=>k*k*(3-2*k);

const emptyCounts=()=>({thrown:0,landed:0,power:0,body:0,counters:0,evades:0,blocks:0,perfects:0,minSta:1});

/** One fighter: the rules' combatant, the pose state, the footwork and the counters of the result card.
 * @param {number} i @param {number} j @param {number} fi @param {number} fj @param {any} look @param {(fn:()=>void)=>void} wrap
 * @param {{hpMax:number,staCap:number,pow:number,regen:number,hunger?:number}} rules @param {{stunDealt:number,stunTaken:number}} S */
function makeFighter(i,j,fi,fj,look,wrap,rules,S){
  const F={i,j,fi,fj,moving:false,mf:0,ms:0,rt:createCombatant(rules),pk:null,buf:null,slipSince:-9,slipDir:1,hurtT:0,hurtDir:0,stagger:0,stun:0,dmg:0,
    ko:false,down:false,downAt:0,kdN:0,kdMash:0,kdLast:0,gUp:0,look,seed:Math.random()*6,aiAt:1,combo:[],comboAt:0,seen:0,strafe:1,strafeUntil:0,guardUntil:0,lowAim:false,
    stunDealt:S.stunDealt,stunTaken:S.stunTaken,c:emptyCounts(),wounds:/** @type {any} */ ({cuts:0,ribs:0}),bleed:false,hist:/** @type {any[]} */ ([]),draw:()=>{}};
  F.ft={1:{},'-1':{}}; F.li=i; F.lj=j; for(const s of [1,-1]) Object.assign(F.ft[s],stance(F,s),{sw:0,from:null,to:null});
  F.draw=()=>wrap(()=>drawFighter(F));
  return F;
}

/** Where the two stand: on the floor of the room, facing each other along the screen's horizontal, as in the side view.
 * @param {string} room @returns {[number[],number[]]} */
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
  const S=state, save=progressionState.save, V=venue??sparringState.sparVenue, room=V==='yard'||V==='laznia'?V:'cell';
  initAudio(); inputState.overEl.hidden=true;
  setSparFight(idx,V,station);
  if(gymState.hubRoom!==room){ setRoomRaw(room); hubRebake(); }
  const O=oppDef(idx), st=save.stats, PS=fighterStats({str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl}), OS=fighterStats(oppLevels(O));
  const wounds=lastingSpec(save.injuries), cap=PS.staCap-(tiredness()*4+(wounds.nose?5:0)+wounds.ribs*5), hero=heroFigureLook(), [pa,oa]=startSpots(room);
  S.P=makeFighter(pa[0],pa[1],0.7071,-0.7071,hero.look,hero.wrap,{hpMax:100+PS.hpBonus,staCap:Math.max(25,cap),pow:PS.pow,regen:PS.regen,hunger:hungerLevel()},PS);
  S.O=makeFighter(oa[0],oa[1],-0.7071,0.7071,foeFigure(V,idx,O),fn=>fn(),{hpMax:O.hp,staCap:Math.max(25,OS.staCap),pow:OS.pow,regen:OS.regen},OS);
  Object.assign(S.P.wounds,wounds); S.O.aiAt=0.6;
  Object.assign(S,{on:true,t:0,keys:{},low:false,guardHeld:false,phase:'intro',pt:0,elapsed:0,winner:null,how:'',idx,venue:V,opp:O,rigKO:false,banner:null,fx:[],parts:[],decals:[],cam:{z:2,x:144,y:96,init:true},freeze:0,
    notice:'1-4 ciosy · Spacja blok · Q slip',noticeUntil:3,slipFlip:1,xpToday:0,trial:null});
  gymState.actors=[S.P,S.O]; gymState.preScene=drawDecals; gymState.hubNear=null; hubTransReset();
  boxingState.gstate='isofight';
  document.body.classList.remove('hub','pushup'); document.body.classList.add('spar');
  showFightPlate(V,O.title);
  setInfo();
}

/** End the brawl now in favour of side 0 (the hero) or 1 (diagnostics and tests). @param {0|1} side @param {string} [how] */
export function isoFightFinish(side,how='KO'){
  const S=state; if(!S.on) return;
  if(S.phase==='intro'){ hideFightPlate(); S.phase='fight'; }
  if(how==='CZAS'){ timeUp(); return; }
  const W=side===1?S.O:S.P, L=side===1?S.P:S.O; L.rt.hp=0; L.ko=true; L.down=false; L.pk=null; endBout(W,how);
}

/** Leave the fight state (the hub entry restores the rest). */
export function stopIsoFight(){ state.on=false; state.phase='off'; gymState.actors=null; gymState.preScene=null; state.keys={}; state.guardHeld=false; hideFightPlate(); }

/** Where the fight left things for the hub: rival, venue, whether the hero won, and the station to return to. */
export function isoFightOutcome(){ const S=state; return {idx:S.idx,venue:S.venue,won:S.phase==='end'&&S.winner===S.P,station:sparringState.cellFightSt}; }

/** Drop held keys on blur, pause or mode change. */
export function isoFightRelease(){ state.keys={}; state.guardHeld=false; if(state.on&&state.P?.rt.guarding) setGuard(state.P.rt,false,state.t); }

/** A big caption over the middle of the picture (not in the room: it does not zoom with the camera). @param {string} text @param {number} color @param {number} ticks */
function banner(text,color,ticks){ state.banner={text,color,t:ticks}; }

function say(/** @type {string} */ text){ state.notice=text; state.noticeUntil=state.t+1.4; }

const FIGHT_KEYS=new Set(['Digit1','Digit2','Digit3','Digit4','KeyJ','KeyK','KeyL','KeyI','KeyQ','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS']);

/** Keyboard for the isometric fight. @param {KeyboardEvent} e @param {boolean} down @returns {boolean} */
export function isoFightKey(e,down){
  const c=e.code, S=state;
  if(c==='Escape'){ if(down){ e.preventDefault(); exitToHub(); } return true; }
  if(S.phase==='end'){ if(down&&(c==='Enter'||c==='Space')){ e.preventDefault(); inputState.againFn(); } return true; }
  const move={ArrowUp:'u',KeyW:'u',ArrowDown:'d',KeyS:'d',ArrowLeft:'l',KeyA:'l',ArrowRight:'r',KeyD:'r'}[c];
  if(move){ e.preventDefault(); S.keys[move]=down?1:0; }
  if(down&&S.on&&S.phase==='fight'&&S.P.down&&!S.P.ko&&FIGHT_KEYS.has(c)){ e.preventDefault(); mash(S.P); return true; }   /* on the boards every key is a breath towards the feet */
  if(move) return true;
  if(c==='ShiftLeft'||c==='ShiftRight'){ S.low=down; return true; }
  if(c==='Space'){ e.preventDefault(); S.guardHeld=down; return true; }
  if(!down||!S.on||S.phase!=='fight') return !!{Digit1:1,Digit2:1,Digit3:1,Digit4:1,KeyQ:1}[c];
  const pid={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Numpad1:0,Numpad2:1,Numpad3:2,Numpad4:3,KeyJ:0,KeyK:1,KeyL:2,KeyI:3}[c];
  if(pid!==undefined){ e.preventDefault(); press(S.P,pid,S.low); return true; }
  if(c==='KeyQ'){ e.preventDefault(); slip(S.P); return true; }
  return false;
}

/** One tap towards getting up from the boards. @param {any} F */
function mash(F){
  if(state.t-F.kdLast<0.09) return;
  F.kdLast=state.t; F.kdMash++;
  if(F.kdMash&1) popup(sparringState.T_RISE,hx(F),hy(F)-12,appearanceState.C_SPARK,1,18);
}

/** @param {any} F */
function busy(F){ return F.ko||F.down||F.stagger>0||F.pk||(state.t-F.slipSince<TUNING.slipActive); }

/** Start a costed punch; a press during a busy moment is kept for a quarter of a second. @param {any} F @param {number} pid @param {boolean} low @param {string} [special] */
function press(F,pid,low,special){
  const now=state.t;
  if(F.ko||F.down||F.stagger>0||state.phase!=='fight') return false;
  if(F.pk||now-F.slipSince<TUNING.slipActive){ if(!special) F.buf={pid,low,until:now+.25}; return false; }
  if(F.rt.guarding) setGuard(F.rt,false,now);
  if(!beginPunch(F.rt,pid,now)){ if(F===state.P) say('Brak tchu - odetchnij'); return false; }
  F.pk={pid,low,t:0,hit:false,special}; F.lowAim=low; F.buf=null; F.c.thrown++;
  if(F===state.P){ F.hist.push({pid,low,at:now}); if(F.hist.length>4) F.hist.shift(); }
  sfxWhoosh(0.25+0.1*pid);
  return true;
}

/** @param {any} F @param {number} [dir] */
function slip(F,dir){
  const now=state.t;
  if(busy(F)||state.phase!=='fight') return false;
  if(!beginSlip(F.rt,now)){ if(F===state.P) say('Slip: odetchnij'); return false; }
  F.slipSince=now; state.slipFlip=-state.slipFlip; F.slipDir=dir||state.slipFlip; sfxWhoosh(0.4);
  return true;
}

/** Unit vector of the opponent from F and the distance. @param {any} F @param {any} G */
function toward(F,G){ const di=G.i-F.i, dj=G.j-F.j, d=Math.hypot(di,dj)||1; return [di/d,dj/d,d]; }

/** Move F by (di,dj)*sp in the room, never into furniture, walls or the other fighter. @param {any} F @param {any} G @param {number} di @param {number} dj @param {number} sp */
function walk(F,G,di,dj,sp){
  const d0=Math.hypot(F.i-G.i,F.j-G.j);
  const ok=(/** @type {number} */ a,/** @type {number} */ b)=>{ if(hubBlocked(a,b)) return false; const d=Math.hypot(a-G.i,b-G.j); return d>=MIN_SEP||d>=d0; };
  const ni=F.i+di*sp, nj=F.j+dj*sp;
  if(ok(ni,F.j)) F.i=ni; if(ok(F.i,nj)) F.j=nj;
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
  D.rt.hp=Math.max(1,D.rt.hp-dmg); D.stun+=22; D.dmg=Math.min(1,D.dmg+0.12); D.hurtT=.3; D.stagger=.3;
  if(Math.random()<0.45) D.wounds.cuts=Math.min(3,(D.wounds.cuts||0)+1);
  popup(kind==='headbutt'?sparringState.T_HEADBUTT:sparringState.T_CUT,px,py-14,sparringState.C_BLOOD2,1,34);
  burst(px,py,'star'); sfxPunch(1,0.8,true); spray(A,D,2,false,false,{damage:dmg,counter:true}); S.freeze=3;
}

/** Contact of a punch at its apex, with the rules of realtime-rules.js. @param {any} A @param {any} D */
function impact(A,D){
  const S=state, now=S.t, pid=A.pk.pid, low=A.pk.low, gap=toward(A,D)[2], R=RANGE[pid];
  if(A.pk.special){ special(A,D); return; }
  if(D.ko||D.down) return;
  if(gap>R){
    whiffPunch(A.rt,now);
    if(pid>=1&&A.rt.sta<22){ A.stagger=.55; A.pk=null; popup(sparringState.T_OVER,hx(A),hy(A)-8,appearanceState.C_SPARK,1,28); }
    else if(A===S.P) say('Poza zasięgiem');
    return;
  }
  const k=gap/R;
  let rangeMod=1;
  if(pid<=1){ if(k>=0.76&&k<=0.97) rangeMod=1.15; else if(k<0.64) rangeMod=0.75; }
  else if(k>=0.70&&k<=0.90) rangeMod=1.20;
  const o=resolvePunch(A.rt,D.rt,{pid,low,now});
  if(o.damage>0){ const extra=o.damage*(rangeMod-1); D.rt.hp=Math.max(0,D.rt.hp-extra); o.damage=Math.max(0,o.damage+extra); }
  const px=hx(D), py=hy(D)+(low?10:0);
  if(o.kind==='parry'){
    D.c.blocks++; D.c.perfects++; A.stagger=.45; A.pk=null; A.stun+=16; popup(sparringState.T_PARRY,px,py-12,appearanceState.C_SPARK,1,30); sfxBlock(0.95,true);
    burst(px,py,'ring'); S.freeze=4; say(D===S.P?'Idealny blok - kontruj!':'Rywal zbił cios'); return;
  }
  if(o.kind==='slip'){ D.c.evades++; D.c.perfects++; popup(sparringState.T_UNIK,px,py-12,appearanceState.C_SPARK,1,30); sfxWhoosh(0.55); burst(px,py,'ring'); S.freeze=3;
    if(D===S.P) say('Idealny slip! Następny cios +55%'); return; }
  const blocked=o.kind==='block';
  if(blocked) D.c.blocks++;
  if(!blocked&&o.damage>0){ A.c.landed++; if(pid>0) A.c.power++; if(low) A.c.body++; if(o.counter) A.c.counters++; D.dmg=Math.min(1,D.dmg+o.damage/D.rt.hpMax*1.6); }
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
  D.hurtT=blocked?.12:.3; D.hurtDir=pid===2?1:0;
  if(!stagger&&!blocked&&!low&&D.pk&&D.pk.t<PT[D.pk.pid].hit) D.pk=null;   /* a clean hit interrupts the windup */
  const [ui,uj]=toward(A,D); walk(D,A,ui,uj,blocked?.05:.12);
  if(o.damage>=1) popup(sparringState.T_DMG+Math.min(30,Math.max(1,Math.round(o.damage)))-1,px,py-14,blocked?appearanceState.C_GRAY:appearanceState.C_WHITE,1,32);
  burst(px,py,blocked?'ring':'star');
  spray(A,D,pid,low,blocked,o);
  if(blocked) sfxBlock(0.6); else sfxPunch(Math.min(1.4,0.55+0.25*pid+(o.counter?0.2:0)),low?1:0.35+pid*0.15,true);
  S.freeze=blocked?1:(pid===3||o.counter?4:2); boxingState.shakeT=blocked?3:6; boxingState.shakeAmp=blocked?1:2; boxingState.shakeDur=blocked?3:6; boxingState.shakeAxis=0;
  if(o.failedSlip&&D===S.P) say('Zły slip: cios rywala +35%'); else if(o.counter&&A===S.P) say('Kontra!');
  if(D.rt.hp<=0){
    const brutal=D.kdN>=2||(D.kdN===1&&o.counter&&pid===3);
    if(!D.down&&!brutal){
      D.down=true; D.downAt=now; D.kdN++; D.kdMash=0; D.pk=null; D.buf=null;
      D.rt.hp=Math.round(D.rt.hpMax*(D.kdN===1?0.32:0.20)); D.rt.sta=Math.max(D.rt.sta,D.rt.staCap*0.5); D.stun=0;
      banner('NOKDAUN!',appearanceState.C_RED,80); sfxKO();
      say(D===S.P?'NOKDAUN! Wciskaj klawisze, żeby wstać!':'Rywal na deskach ('+D.kdN+'/3)');
    } else { D.ko=true; D.pk=null; spray(A,D,3,low,false,o,true); endBout(A,D.kdN>=2?'TKO':'KO'); }
  }
}

/** Screen position (native px) of a fighter's head. @param {any} F */
function hx(F){ return isoX(F.i,F.j)/gymState.ISO_K; }
/** @param {any} F */
function hy(F){ return isoY(F.i,F.j,15.6)/gymState.ISO_K; }

/** A short burst of sparks or a ring at native picture coordinates. @param {number} x @param {number} y @param {'star'|'ring'} kind */
function burst(x,y,kind){ state.fx.push({x,y,t:0,kind}); }

/** The opponent: keeps his distance, circles, reads the player's punches and answers in short combinations (the old styles). @param {any} F @param {any} P */
function ai(F,P){
  const S=state, now=S.t, O=S.opp, [ui,uj,gap]=toward(F,P), si=-uj, sj=ui;
  const archKey=O.name==='DAN'?'tank':(ARCH[O.style]?O.style:'bal'), arch=ARCH[archKey], perks=O.perks||[];
  F.moving=false;
  if(F.ko||F.down||P.ko||P.down){ if(F.rt.guarding) setGuard(F.rt,false,now); return; }
  if(F.rt.guarding&&now>=F.guardUntil) setGuard(F.rt,false,now);
  if(F.stagger>0||F.pk) return;
  if(F.combo.length&&now>=F.comboAt){ const n=F.combo.shift(); if(gap<=RANGE[n.pid]*0.9&&F.rt.sta>=10&&press(F,n.pid,n.low)){ F.comboAt=now+(n.pid===0?.15:.22); } else F.combo.length=0; return; }
  if(now-F.slipSince<TUNING.slipActive||F.rt.guarding) return;
  const hist=P.hist.filter((/** @type {any} */ h)=>now-h.at<5), recentStraights=hist.filter((/** @type {any} */ h)=>h.pid<=1).length, recentLow=hist.filter((/** @type {any} */ h)=>h.low).length, adaptSlip=recentStraights>=3?0.25:0;
  const pp=P.pk;
  if(pp&&!pp.special&&pp.t>0.05&&pp.t<PT[pp.pid].hit&&F.seen!==P.rt.lastActionAt){
    F.seen=P.rt.lastActionAt;
    if(gap<RANGE[pp.pid]*1.1&&Math.random()<Math.min(0.68,0.22+O.rank*0.018+adaptSlip*0.5)){
      if(pp.pid<=2&&F.rt.sta>=12&&Math.random()<Math.min(0.85,arch.slipBias+adaptSlip)&&slip(F)){
        const cPid=recentLow>=2?3:(Math.random()<0.55?2:1);
        F.combo=[{pid:cPid,low:false}];
        if(archKey==='counter'||archKey==='press') F.combo.push({pid:cPid===1?2:1,low:Math.random()<0.3});
        F.comboAt=now+.17; F.aiAt=now+.45; return;
      }
      setGuard(F.rt,true,now); F.guardUntil=now+.26+Math.random()*.14; return;
    }
  }
  if(now<F.aiAt) return;
  const playerHurt=P.rt.sta<25||P.stun>45, k=(arch.idealGap-19)/9, ideal=RANGE[1]*(0.62+0.3*k), minGap=Math.max(MIN_SEP+0.04,ideal-0.14), targetGap=playerHurt?Math.min(ideal,0.9):ideal;
  if(now>=F.strafeUntil){ F.strafe=Math.random()<.5?-1:1; F.strafeUntil=now+.7+Math.random()*1.1; }
  if(gap>targetGap+0.1){ walk(F,P,ui,uj,WALK*0.8); F.moving=true; F.mf=1; F.ms=0; return; }
  if(gap<minGap&&!playerHurt){
    if(perks.includes('shove')&&gap<1.0&&F.rt.sta>=12&&Math.random()<0.45){ F.rt.sta-=8; if(press(F,2,false,'shove')){ F.aiAt=now+.45; return; } }
    if(archKey==='out'||archKey==='counter'){ walk(F,P,-ui,-uj,WALK*0.8); F.moving=true; F.mf=-1; F.ms=0; F.aiAt=now+.18; return; }
  }
  if(Math.abs(gap-targetGap)<0.5){ walk(F,P,si*F.strafe,sj*F.strafe,WALK*0.5); F.moving=true; F.mf=0; F.ms=F.strafe; }
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

/** One 60 Hz step of the fight. */
export function isoFightTick(){
  const S=state; if(!S.on) return;
  if(S.freeze>0){ S.freeze--; return; }
  const dt=1/60, P=S.P, O=S.O;
  if(S.banner&&--S.banner.t<=0) S.banner=null;
  tickFeet(P); tickFeet(O); tickParts();
  for(const F of [P,O]){ F.gUp+=((F.rt.guarding?1:0)-F.gUp)*0.35; F.hurtT=Math.max(0,F.hurtT-dt); F.stagger=Math.max(0,F.stagger-dt*(S.phase==='fight'?1:0)); }
  const [pi,pj]=toward(P,O), [oi,oj]=toward(O,P);
  for(const [F,ti,tj] of [[P,pi,pj],[O,oi,oj]]){ if(F.ko||F.down) continue; F.fi+=(ti-F.fi)*0.22; F.fj+=(tj-F.fj)*0.22; const m=Math.hypot(F.fi,F.fj)||1; F.fi/=m; F.fj/=m; }
  if(S.fx.length){ for(const f of S.fx) f.t++; S.fx=S.fx.filter(f=>f.t<18); }
  P.moving=false; O.moving=false;
  if(S.phase==='intro'){
    S.pt++; if(S.pt===2) banner('WALCZ!',appearanceState.C_WHITE,80);
    if(S.pt>=45){ hideFightPlate(); S.phase='fight'; S.pt=0; banner('WALCZ!',appearanceState.C_SPARK,40); setInfo(); }
    return;
  }
  if(S.phase==='ko'){
    if(P.rt.guarding) setGuard(P.rt,false,S.t); if(O.rt.guarding) setGuard(O.rt,false,S.t);
    if(++S.pt>=100){ showResult(); S.phase='end'; }
    return;
  }
  if(S.phase!=='fight') return;
  S.t+=dt; S.elapsed++; const now=S.t;
  if(sparringState.timeLimit&&S.elapsed>=sparringState.timeLimit){ timeUp(); return; }
  for(const F of [P,O]){
    tickCombatant(F.rt,dt,now);
    F.stagger=Math.max(0,F.stagger);
    F.stun=Math.max(0,F.stun-dt*4);
    F.c.minSta=Math.min(F.c.minSta,F.rt.sta/F.rt.staCap);
    if(F.wounds.cuts&&!F.down&&!F.ko) F.rt.hp=Math.max(1,F.rt.hp-(0.25*F.wounds.cuts)/60);
    if(F.pk){ F.pk.t+=dt; if(!F.pk.hit&&F.pk.t>=PT[F.pk.pid].hit){ F.pk.hit=true; impact(F,F===P?O:P); if(S.phase!=='fight') return; } if(F.pk&&F.pk.t>=PT[F.pk.pid].end) F.pk=null; }
    if(F.buf&&!F.pk&&F.stagger<=0&&!F.down&&now-F.slipSince>=TUNING.slipActive){ const b=F.buf; F.buf=null; if(now<=b.until) press(F,b.pid,b.low); }
    if(F.buf&&now>F.buf.until) F.buf=null;
    if(F.down&&!F.ko){   /* the count: the player gets up with enough taps, the rival on his own */
      const down=now-F.downAt;
      if(F===P){
        if(F.kdMash>=4+F.kdN*3&&down>=1.2){ F.down=false; F.stagger=.6; say('Wstałeś z desek! Trzymaj gardę'); }
        else if(down>=3.4){ if(F.kdN===1&&F.kdMash>=2){ F.down=false; F.stagger=.6; } else { F.down=false; F.ko=true; F.rt.hp=0; endBout(O,'KO'); return; } }
      } else if(down>=2.3+F.kdN*0.45){ F.down=false; F.stagger=.6; }
    }
  }
  const K=S.keys; let dx=(K.r||0)-(K.l||0), dy=(K.d||0)-(K.u||0);
  const free=!P.pk&&P.stagger<=0&&!P.down&&!P.ko;
  if(S.guardHeld&&free&&!P.rt.guarding&&now-P.slipSince>=TUNING.slipActive) setGuard(P.rt,true,now);
  if(!S.guardHeld&&P.rt.guarding) setGuard(P.rt,false,now);
  if((dx||dy)&&free){
    let di=dx+dy, dj=dy-dx; const l=Math.hypot(di,dj); di/=l; dj/=l;
    const sp=WALK*(0.9+0.1*boxingState.STATS.speed)*(P.rt.guarding?0.5:1)*(now-P.slipSince<TUNING.slipActive?0.3:1);
    walk(P,O,di,dj,sp); P.moving=true; P.mf=di*P.fi+dj*P.fj; P.ms=di*(-P.fj)+dj*P.fi;
  }
  ai(O,P);
  for(const F of [P,O]) if(!F.ko&&!F.down){ if(F.bleed||F.wounds.cuts){ if(Math.random()<0.02) drip(F,'blood'); } else if(F.rt.sta<35&&Math.random()<0.012) drip(F,'sweat'); }
  if(sparringState.rigged&&!S.rigKO&&(P.rt.hp/P.rt.hpMax-O.rt.hp/O.rt.hpMax>.15||now>35)){
    S.rigKO=true; P.rt.hp=0; P.ko=true; P.pk=null; S.phase='ko'; S.pt=0; S.winner=O; S.how='KASTET';
    banner('KASTET!',appearanceState.C_RED,150); sfxKO(); setInfo();
  }
}

/** The result card of a brawl: XP, the fight record, the prison's verdict (respect, the turnkey, the list), the wounds. */
function showResult(){
  hideFightPlate();
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

/** Draw one fighter as the hub figure: stance, walking steps along the movement direction, punch, slip, guard and flinch. @param {any} F */
function drawFighter(F){
  const S=state, t=S.t, A=appearanceState, mv=F.moving;
  const air=Math.max(F.ft[1].sw?Math.sin(Math.PI*Math.min(1,F.ft[1].sw)):0,F.ft[-1].sw?Math.sin(Math.PI*Math.min(1,F.ft[-1].sw)):0), hop=Math.max(0,Math.sin(t*9+F.seed))*(air>0?0.4:1);
  let bob=-1.1+0.55*hop+0.5*air-(F.rt.sta<25?0.5:0), lean=0.35, sl=0, lung=0, e=0, pk=F.pk, tw=0;
  if(pk){ const T=PT[pk.pid], k=pk.t<T.hit?pk.t/T.hit:Math.max(0,1-(pk.t-T.hit)/(T.end-T.hit)); e=smooth(Math.min(1,k)); lean=0.6*e; lung=LUNGE[pk.pid]*e; if(pk.pid===3) bob-=0.6*e; if(pk.low) bob-=1.4*e; }
  const su=(t-F.slipSince)/TUNING.slipActive; if(su>=0&&su<=1){ const w=Math.sin(Math.PI*su); sl=1.6*F.slipDir*w; bob-=1.1*w; }
  const h=Math.min(1,F.hurtT/0.3); lean-=1.5*h*(F.hurtDir?0.6:1); bob-=0.5*h; if(F.stagger>0){ lean-=0.8; bob-=0.6; }
  const J={}, ps=pk?HAND[pk.pid]:0;
  for(let s=-1;s<=1;s+=2){
    const lead=s===1, fj=footJoint(F,s), ws=-s*0.45*Math.sin(Math.PI*(F.ft[s].sw?Math.min(1,F.ft[s].sw):0));
    const hip=[lung*0.5+0.3,s*1.25+sl*0.5+ws,6.9+bob], foot=[fj.fwd+(lead?lung*0.8:0),fj.side,0.9+fj.lift+0.5*hop*(fj.u?0:1)];
    const knee=[(hip[0]+foot[0])/2+1.5,(hip[1]+foot[1])/2+s*0.35,(hip[2]+foot[2])/2+0.2];
    const twist=pk?(s===ps?1.0:-0.6)*e:0, sh=[0.1+lean+lung+twist,s*2.7+sl,12.4+bob];
    let el=[1.0+lean+lung,s*2.6+sl,10.9+bob], hd=[2.3+lean+lung,s*1.25+sl,14.0+bob];
    if(F.gUp>0.02){ el=lerp3(el,[1.5+lean,s*2.0+sl,10.4+bob],F.gUp); hd=lerp3(hd,[3.1+lean,s*0.9+sl,14.6+bob],F.gUp); }
    if(pk&&s===ps){ const Rr=REACH[pk.pid](s), dz=pk.low?-4.4:0;
      el=lerp3(el,[Rr[0][0]+lean+lung,Rr[0][1]+sl,Rr[0][2]+bob+dz*0.6],e); hd=lerp3(hd,[Rr[1][0]+lean+lung,Rr[1][1]+sl,Rr[1][2]+bob+dz],e); }
    if(F.ko||F.down){ el=[-0.2,s*3.5,9.9]; hd=[0.6,s*3.7,8.0]; }
    J[s]={hip,knee,foot,sh,el,hd};
  }
  const jf=(/** @type {number} */ s)=>J[s];
  jf.pel=[lung*0.5,sl*0.5,6.6+bob]; jf.chest=[0.4+lean+lung*0.9,sl,12.2+bob]; jf.head=[0.35+lean*1.2+lung,sl*1.25,15.6+bob-(F.stagger>0?0.6:0)];
  figureHD(F,jf,F.look,{pose:F.ko||F.down?1:0,base:0,noShadow:F.ko||F.down});
}

/** The picture font has capitals, digits and a few marks only. @param {string} s */
function plain(s){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').replace(/[·—–]/g,'-').toUpperCase(); }

/** Native-pixel rectangle in the 2× frame. @param {number} x @param {number} y @param {number} w @param {number} h @param {number} c */
function rect(x,y,w,h,c){ const K=gymState.ISO_K, W=appearanceState.W, fb=rendererState.fb; for(let yy=y*K;yy<(y+h)*K;yy++) for(let xx=x*K;xx<(x+w)*K;xx++){ if(xx<0||yy<0||xx>=W||yy>=appearanceState.H) continue; fb[yy*W+xx]=c; } }

/** A health and breath bar with a dark frame. @param {number} x @param {number} y @param {number} w @param {any} F @param {boolean} right */
function bars(x,y,w,F,right){
  const A=appearanceState, hp=F.rt.hp/F.rt.hpMax, sta=F.rt.sta/F.rt.staCapInitial, cap=F.rt.staCap/F.rt.staCapInitial;
  rect(x-1,y-1,w+2,9,A.C_OUT);
  const fill=(/** @type {number} */ yy,/** @type {number} */ hh,/** @type {number} */ k,/** @type {number} */ c)=>{ const n=Math.round(w*Math.max(0,Math.min(1,k))); rect(right?x+w-n:x,yy,n,hh,c); };
  fill(y,4,hp,A.C_RED);
  rect(x,y+5,w,3,0xff2a2418); fill(y+5,3,cap,0xff4a4230); fill(y+5,3,sta,A.C_SPARK);
}

/** Boxing stance, body units [forward, side]: the lead foot (side +1) in front, the rear one behind, wide apart. */
const STANCE={1:[1.5,1.7],'-1':[-1.3,-1.7]};
const SWING=7, STEP_AT=0.17, STEP_LEAD=0.28;

/** World position of a body-local point of fighter F. @param {any} F @param {number} fwd @param {number} side */
function world(F,fwd,side){ return {i:F.i+(fwd*F.fi-side*F.fj)/7.5,j:F.j+(fwd*F.fj+side*F.fi)/7.5}; }
/** Where foot s belongs under the body now. @param {any} F @param {number} s */
function stance(F,s){ const [f,sd]=STANCE[s]; return world(F,f,sd); }

/** Footwork: the feet stay planted; the foot on the side we are going to steps first, the other one drags into the stance
 * (forward: lead foot, back: rear foot, left or right: the foot on that side). Only one foot is in the air at a time. @param {any} F */
function tickFeet(F){
  const vi=F.i-F.li, vj=F.j-F.lj; F.li=F.i; F.lj=F.j;
  const sp=Math.hypot(vi,vj), mi=sp>1e-4?vi/sp:0, mj=sp>1e-4?vj/sp:0;
  const A=F.ft[1], B=F.ft[-1];
  for(const s of [1,-1]){ const f=F.ft[s];
    if(f.sw>0){ f.sw+=1/SWING; const T=stance(F,s); f.to={i:T.i+mi*STEP_LEAD*(sp>0.01?1:0),j:T.j+mj*STEP_LEAD*(sp>0.01?1:0)};
      if(f.sw>=1){ f.sw=0; f.i=f.to.i; f.j=f.to.j; } } }
  if(A.sw>0||B.sw>0||F.ko) return;
  const cand=[];
  for(const s of [1,-1]){ const f=F.ft[s], T=stance(F,s), di=f.i-T.i, dj=f.j-T.j, along=di*mi+dj*mj, perp=Math.hypot(di-along*mi,dj-along*mj), d=along<0?Math.hypot(along,perp):perp;   /* a foot already ahead of its place is not late */
    if(Math.hypot(di,dj)>1.4){ f.i=T.i; f.j=T.j; continue; }
    cand.push({s,d,score:(STANCE[s][0]*(mi*F.fi+mj*F.fj)+STANCE[s][1]*(mi*-F.fj+mj*F.fi))+d});
  }
  if(!cand.some(c=>c.d>STEP_AT)) return;   /* one foot is late: of the two that are at all behind, the one on the side of the move goes first */
  cand.splice(0,cand.length,...cand.filter(c=>c.d>STEP_AT*0.45));
  cand.sort((a,b)=>b.score-a.score);
  const f=F.ft[cand[0].s]; f.sw=1/SWING; f.from={i:f.i,j:f.j}; const T=stance(F,cand[0].s); f.to={i:T.i+mi*STEP_LEAD,j:T.j+mj*STEP_LEAD};
}

/** Foot s of F as a body-local joint [forward, side, height] and its air progress 0..1. @param {any} F @param {number} s */
function footJoint(F,s){
  const f=F.ft[s]; let i=f.i, j=f.j, lift=0, u=0;
  if(f.sw>0&&f.from){ u=Math.min(1,f.sw); const e=u*u*(3-2*u); i=f.from.i+(f.to.i-f.from.i)*e; j=f.from.j+(f.to.j-f.from.j)*e; lift=2.3*Math.sin(Math.PI*u); }
  const di=(i-F.i)*7.5, dj=(j-F.j)*7.5;
  return {fwd:di*F.fi+dj*F.fj,side:di*-F.fj+dj*F.fi,lift,u};
}

const BLOOD=rgb('#a3141f'), BLOOD_DRY=rgb('#4a0b12'), BLOOD_HI=rgb('#d63a44'), SWEAT_FLOOR=rgb('#14161a');
const rnd=(/** @type {number} */ a,/** @type {number} */ b)=>a+Math.random()*(b-a);

/** Throw drops from a fighter's head (or body) away from an attacker: sweat on every clean hit, blood once the face is wrecked.
 * @param {any} A @param {any} D @param {number} pid @param {boolean} low @param {boolean} blocked @param {{damage:number,counter:boolean}} o @param {boolean} [ko] */
function spray(A,D,pid,low,blocked,o,ko){
  const [ui,uj]=toward(A,D), si=-uj, sj=ui, z0=low?9.5:14.6, hpF=D.rt.hp/D.rt.hpMax, swing=pid===2?1:0;
  const fire=(/** @type {'sweat'|'blood'} */ kind,/** @type {number} */ n,/** @type {number} */ power)=>{
    for(let k=0;k<n;k++){ const along=rnd(0.4,1.2)*power, across=rnd(-1,1)*(0.9+swing*0.6)*power+swing*0.5*power;
      state.parts.push({kind,i:D.i+ui*0.1,j:D.j+uj*0.1,z:z0+rnd(-1,1),vi:(ui*along+si*across)*0.022,vj:(uj*along+sj*across)*0.022,vz:rnd(0.3,0.9)*(0.6+power*0.5),size:kind==='blood'&&Math.random()<0.35?2:1,pi:0,pj:0,pz:0}); } };
  if(!ko) fire('sweat',blocked?2:4+pid*2,blocked?0.6:1);
  if(!blocked&&!low&&!ko&&((pid>=2&&(hpF<0.75||o.counter))||hpF<0.45||o.damage>=10)){ D.bleed=true; fire('blood',6+pid*3+(o.counter?4:0),1.1+0.2*pid); }
  if(ko){ D.bleed=true; fire('blood',22,1.6); fire('sweat',8,1.2); }
}

/** A single drop falling from a fighter's face (a cut that keeps bleeding, a tired sweat). @param {any} F @param {'sweat'|'blood'} kind */
function drip(F,kind){
  const a=rnd(0,6.283);
  state.parts.push({kind,i:F.i+F.fi*0.2,j:F.j+F.fj*0.2,z:kind==='blood'?12.5:15,vi:Math.cos(a)*0.004,vj:Math.sin(a)*0.004,vz:kind==='blood'?0:0.25,size:1,pi:0,pj:0,pz:0});
}

/** Fly the drops; blood that reaches the floor stays as a stain, sweat leaves a faint wet spot. */
function tickParts(){
  const S=state, live=[], [bw,bh]=hubBounds();
  for(const p of S.parts){
    p.pi=p.i; p.pj=p.j; p.pz=p.z; p.i+=p.vi; p.j+=p.vj; p.z+=p.vz; p.vz-=0.04;
    if(p.z<=0){ if(p.i>0.3&&p.j>0.3&&p.i<bw-0.3&&p.j<bh-0.3){ if(p.kind==='blood') stain(p); else if(Math.random()<0.4) stain(p); } continue; }
    live.push(p);
  }
  S.parts=live;
}

/** A floor mark: a heart blob with a streak of satellites along the way the drop was flying. @param {any} p */
function stain(p){
  const S=state, blood=p.kind==='blood', l=Math.hypot(p.vi,p.vj)||1, di=p.vi/l, dj=p.vj/l, big=blood?rnd(0.05,0.1)*(p.size*0.6+0.5):rnd(0.03,0.05);
  const blobs=[{di:0,dj:0,r:big}], n=blood?(Math.random()*4|0):0;
  for(let k=1;k<=n;k++){ const d=k*rnd(0.06,0.14); blobs.push({di:di*d+rnd(-0.03,0.03),dj:dj*d+rnd(-0.03,0.03),r:big*rnd(0.25,0.55)}); }
  S.decals.push({i:p.i,j:p.j,t0:S.t,blood,blobs});
  if(S.decals.length>260) S.decals.shift();
}

/** Floor marks under the people, drawn into the room before the furniture and lighting. */
function drawDecals(){
  const S=state, K=gymState.ISO_K, W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb;
  for(const d of S.decals){
    const age=S.t-d.t0;
    for(const b of d.blobs){
      const cx=isoX(d.i+b.di,d.j+b.dj), cy=isoY(d.i+b.di,d.j+b.dj,0), rx=Math.max(1,b.r*8.5*K), ry=Math.max(0.6,rx*0.5);
      for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
        if(x<0||y<0||x>=W||y>=H) continue; const u=(x-cx)/rx, v=(y-cy)/ry; if(u*u+v*v>1) continue; const k=y*W+x;
        if(d.blood){ const dry=Math.min(1,age/25), base=mix(BLOOD,BLOOD_DRY,dry), c=(age<6&&u<-0.2&&v<-0.2)?mix(base,BLOOD_HI,0.5*(1-age/6)):base; fb[k]=mix(fb[k],c,0.86); }
        else fb[k]=mix(fb[k],SWEAT_FLOOR,0.3*Math.max(0,1-age/5));
      }
    }
  }
  S.decals=S.decals.filter(d=>d.blood||S.t-d.t0<5);
}

/** The drops in the air, over the fighters. */
function drawParts(){
  const K=gymState.ISO_K, W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb;
  const dot=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ s,/** @type {number} */ c)=>{ for(let yy=y;yy<y+s*K;yy++) for(let xx=x;xx<x+s*K;xx++) if(xx>=0&&yy>=0&&xx<W&&yy<H) fb[yy*W+xx]=c; };
  for(const p of state.parts){
    const x=Math.round(isoX(p.i,p.j)), y=Math.round(isoY(p.i,p.j,p.z));
    if(p.kind==='blood'){ if(p.pz>0) dot(Math.round(isoX(p.pi,p.pj)),Math.round(isoY(p.pi,p.pj,p.pz)),1,BLOOD_DRY); dot(x,y,p.size,BLOOD); if(p.size>1) dot(x,y,1,BLOOD_HI); }
    else { dot(x,y,1,appearanceState.C_SWEAT); if(p.pz>0) dot(Math.round(isoX(p.pi,p.pj)),Math.round(isoY(p.pi,p.pj,p.pz)),1,appearanceState.C_WHITE); }
  }
}

/** Zoom on the fighters: close in on the pair, wider only when they part; the centre follows with a lag. */
function camera(){
  const S=state, C=S.cam, K=gymState.ISO_K, W=appearanceState.W, H=appearanceState.H, P=S.P, O=S.O;
  const px=isoX(P.i,P.j), py=isoY(P.i,P.j,9), ox=isoX(O.i,O.j), oy=isoY(O.i,O.j,9);
  const need=Math.max(Math.abs(px-ox)+70*K,(Math.abs(py-oy)+60*K)*1.5), zt=need>W/2?Math.max(1.3,W/need):2;
  if(C.init){ C.init=false; C.z=zt; C.x=(px+ox)/2; C.y=(py+oy)/2+4*K; }
  C.z+=(zt-C.z)*0.08; const z=Math.abs(C.z-2)<0.03?2:C.z;
  const tx=(px+ox)/2, ty=(py+oy)/2+4*K;
  C.x+=(tx-C.x)*0.1; C.y+=(ty-C.y)*0.1;
  const cx=Math.round(Math.max(W/(2*z),Math.min(W-W/(2*z),C.x))), cy=Math.round(Math.max(H/(2*z),Math.min(H-H/(2*z),C.y)));
  zoomBlit(z,cx,cy);
}

/** Frame: the room with both fighters, bars, sparks and the notice. Called inside the 2× frame. */
export function renderIsoFight(){
  const S=state; if(!S.on) return;
  renderHub();   /* the fighters are actors of the room's own depth sorter */
  const K=gymState.ISO_K, W=appearanceState.W/K;
  drawParts();
  for(const f of S.fx){ const u=f.t/18, R=2+u*(f.kind==='ring'?8:5), n=f.kind==='ring'?16:8, c=u<.5?appearanceState.C_WHITE:appearanceState.C_SPARK;
    for(let k=0;k<n;k++){ const a=k/n*6.283+(f.kind==='star'?0.4:0), r0=f.kind==='ring'?R:R*0.45, len=f.kind==='ring'?0:R*0.55; for(let d=0;d<=len;d+=1){ const rr=r0+d; const x=Math.round(f.x+Math.cos(a)*rr), y=Math.round(f.y+Math.sin(a)*rr*0.6); if(u<0.9) rect(x,y,1,1,c); } } }
  if(S.phase==='intro'||S.phase==='fight') marker(S.P);
  camera();
  bars(6,6,60,S.P,false); bars(W-66,6,60,S.O,true);
  drawText('TY',6*K+8*K,17*K,appearanceState.C_WHITE,1); drawText(plain(String(S.opp.name)),(W-6)*K-(String(S.opp.name).length*2)*K,17*K,appearanceState.C_WHITE,1);
  if(S.notice) drawText(plain(S.notice),(W/2)*K,(192/K-12)*K,appearanceState.C_WHITE,1);
  if(S.banner){ const b=S.banner; if(b.t>8||(b.t&2)) drawText(b.text,W/2*K,56*K,b.color,2); }
}

/** A small arrow over the player's head, so the two can be told apart. @param {any} F */
function marker(F){
  const K=gymState.ISO_K, x=Math.round(isoX(F.i,F.j)), y=Math.round(isoY(F.i,F.j,22))-((boxingState.tick>>3)&1)*K;
  for(let r=0;r<3;r++) for(let dx=-r;dx<=r;dx++) rect(x/K+dx|0,y/K+(2-r),1,1,appearanceState.C_SPARK);
}

/** Text for the info line below the picture. */
export function isoFightInfo(){
  const S=state, V=S.venue, where=V==='yard'?'BÓJKA NA SPACERNIAKU':V==='canteen'?'BÓJKA PRZY POSIŁKU':V==='laznia'?'BÓJKA W ŁAŹNI':'BÓJKA W WARDZIE';
  return where+' · '+(S.opp?S.opp.title:'')+' · '+(S.phase==='end'||S.phase==='ko'?'KONIEC':'DO KO');
}
export const CONTROLS='strzałki / WASD ruch · 1 jab · 2 cross · 3 hook · 4 uppercut · Shift korpus · Spacja blok · Q slip · F10 pauza · Esc wyjście';
