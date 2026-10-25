/* Roaches on the Ward's wall (KARALUCHY.md): the hero kneels on the guard-bed facing the scratched wall. The mouse (or
   the arrows) leads the shadow of his fist, a click or Space throws the punch at it. Roaches run across the wall from
   edge or crack to edge or crack; a squashed one stays as a stain. A miss is bare knuckles on stone: pain, a shaking
   hand and a pause. The session lasts one stub of tallow; the scene is roach-scene.js, the rules roach-rules.js. */

import { state as boxing, setGstate, shake, drawText } from './boxing.js';
import { state as appearance } from './appearance.js';
import { state as renderer, setFramebuffer, screenToView } from './renderer.js';
import { state as input, setInfo } from './input.js';
import { leaveMode, setPanelMode } from './navigation.js';
import { applyStats, resetSessXP, statShort } from './progression.js';
import { initAudio, sfxSquash, sfxKnuckle, sfxHiss, sfxSkitter, sfxHeart, sfxCrackle, sfxGaol, sfxWhoosh, sfxBreath } from './audio.js';
import { state as session, beginSession, sessionMetric, sessionAddTime, sessionOpen, sessionRunning, sessionParams } from './training-session.js';
import { DRILLS } from './training-data.js';
import { KINDS, HIT_PAIN, PAIN_FADE, PAIN_REST, SURFACE, roachContact, missCost, killPoints } from './roach-rules.js';
import { buildRoachWall, roachWallTick, renderRoachWall, surfaceAt, chipWall, bloodWall, wallDust, wallGoo, CRACKS, NAME_HOLE, WALL_Y1, FIST_FROM } from './roach-scene.js';
import { vnoise } from './noise.js';

/** Ticks of the punch going out, the stop at the wall (hit / miss), the way back. */
const OUT_T=7, STOP_HIT=4, STOP_MISS=6, BACK_T=10, BUFFER_T=4;
/** Outside a session (debug start) the stage I parameters apply. */
const FREE=DRILLS.roach.stages[0];
const KIND_WEIGHT = /** @type {Record<string,number>} */ ({black:3,prusak:3,nymph:2,big:1});

export const state = {
  on:false,
  /** Where the hand wants to be (mouse / keys) and where it is, with its spring velocity. */
  aim:{x:72,y:44}, hand:{x:72,y:44,vx:0,vy:0}, keys:{l:0,r:0,u:0,d:0}, keyV:0,
  /** 'aim' | 'out' | 'stop' | 'back' | 'cool' */
  phase:'aim', t:0, sx:0, sy:0, missed:false, cool:0, coolMax:0, buffered:false,
  pain:0, rest:0, combo:0, best:0, kills:0, clean:0, moving:0, misses:0, painMax:0,
  /** @type {any[]} */ roaches:[], /** @type {any[]} */ splats:[], /** @type {any[]} */ queue:[],
  nextId:0, spawnT:50, ticks:0, swarmAt:-1, lampK:1, ending:false, endT:0, knock:false,
  tremX:0, tremY:0, beatT:0, pulse:0, gaolT:400, flash:'', flashT:0, feedback:'',
  /** @type {{x:number,y:number,s:number,a:number}|null} */ ghost:null,
};

/** @param {number} a @param {number} b @param {number} x */
function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
/** Stage parameters of the running session. */
function params(){ return sessionOpen()?sessionParams('roach'):FREE; }
/** Session length in ticks (for the waves). */
function sessionLen(){ return (sessionOpen()?session.S.def.roundSec[session.S.stage-1]:80)*60; }

/** Kneel at the wall: one stub of tallow, as many roaches as he can. */
export function startRoaches(){
  leaveMode(); initAudio(); setGstate('roach'); applyStats(); resetSessXP();
  beginSession('roach',{end:endLamp,again:()=>startRoaches(),extra:summaryExtra});
  Object.assign(state,{on:true,aim:{x:72,y:44},hand:{x:72,y:44,vx:0,vy:0},keys:{l:0,r:0,u:0,d:0},keyV:0,phase:'aim',t:0,missed:false,cool:0,coolMax:0,buffered:false,
    pain:0,rest:0,combo:0,best:0,kills:0,clean:0,moving:0,misses:0,painMax:0,roaches:[],splats:[],queue:[],nextId:0,spawnT:50,ticks:0,lampK:1,ending:false,endT:0,knock:false,
    tremX:0,tremY:0,beatT:0,pulse:0,gaolT:300+Math.random()*400,flash:'',flashT:0,ghost:null,
    swarmAt:params().max>=4&&Math.random()<0.35?Math.round(sessionLen()*(0.3+Math.random()*0.4)):-1,
    feedback:'Mysz prowadzi cień pięści, klik lub Spacja — cios. Pudło to gołe kostki na kamieniu.'});
  buildRoachWall(); document.body.classList.add('roach'); setPanelMode(); setInfo();
}

/** Leave the wall: release the keys. */
export function resetRoaches(){ state.on=false; roachKeysOff(); document.body.classList.remove('roach'); }

/** Release held aim keys (menus, focus loss). */
export function roachKeysOff(){ state.keys.l=state.keys.r=state.keys.u=state.keys.d=0; }

/** Aim keys. @param {string} code @param {boolean} down @returns {boolean} consumed */
export function roachKey(code,down){
  const k=code==='ArrowLeft'||code==='KeyA'?'l':code==='ArrowRight'||code==='KeyD'?'r':code==='ArrowUp'||code==='KeyW'?'u':code==='ArrowDown'||code==='KeyS'?'d':'';
  if(!k) return false; state.keys[k]=down?1:0; return true;
}

/** Lead the hand to a point of the wall (native pixels). @param {number} x @param {number} y */
export function roachAim(x,y){ state.aim.x=Math.max(3,Math.min(141,x)); state.aim.y=Math.max(3,Math.min(WALL_Y1-3,y)); }

/** Can the hand be thrown now? */
function canAct(){ return state.on&&boxing.gstate==='roach'&&!input.paused&&(!sessionOpen()||sessionRunning()); }

/** Throw the punch at the shadow (a press late in the way back is kept for the next one). */
export function roachStrike(){
  if(!canAct()) return;
  if(state.phase==='back'&&state.t>=BACK_T-BUFFER_T){ state.buffered=true; return; }
  if(state.phase!=='aim') return;
  state.phase='out'; state.t=0; state.buffered=false; state.ghost=null;
  state.sx=state.hand.x+state.tremX; state.sy=state.hand.y+state.tremY; state.rest=0; sfxWhoosh(0.55);
}

/* ---------- roaches ---------- */

/** A point where a roach comes in or leaves: an edge of the wall or a crack. @param {boolean} [crackOk] */
function gatePoint(crackOk=true){
  if(crackOk&&Math.random()<0.45){ const c=CRACKS[Math.floor(Math.random()*CRACKS.length)]; return {x:c.x,y:c.y,crack:true}; }
  const s=Math.floor(Math.random()*4);
  return s===0?{x:-5,y:8+Math.random()*70,crack:false}:s===1?{x:149,y:8+Math.random()*70,crack:false}:s===2?{x:10+Math.random()*124,y:-5,crack:false}:{x:10+Math.random()*124,y:WALL_Y1+3,crack:false};
}
/** The gate furthest from a point among a few. @param {number} x @param {number} y */
function farGate(x,y){ let best=gatePoint(), bd=-1; for(let k=0;k<4;k++){ const g=gatePoint(), d=Math.hypot(g.x-x,g.y-y); if(d>bd){ bd=d; best=g; } } return best; }
/** The nearest way out from a point. @param {number} x @param {number} y */
function nearGate(x,y){
  const opts=[...CRACKS.map(c=>({x:c.x,y:c.y,crack:true})),{x:-5,y,crack:false},{x:149,y,crack:false},{x,y:-5,crack:false},{x,y:WALL_Y1+3,crack:false}];
  return opts.reduce((a,b)=>Math.hypot(a.x-x,a.y-y)<=Math.hypot(b.x-x,b.y-y)?a:b);
}
/** Pick a kind by the stage's list. @param {string[]} list */
function pickKind(list){ let sum=0; for(const k of list) sum+=KIND_WEIGHT[k]; let r=Math.random()*sum; for(const k of list){ r-=KIND_WEIGHT[k]; if(r<=0) return k; } return list[0]; }

/** A roach in from a gate, across a few turns of the wall, out at another gate. @param {string} kindId @param {any} [from] @param {any} [to] */
function spawnRoach(kindId,from,to){
  const kind=KINDS[kindId], a=from||gatePoint(), b=to||(kindId==='big'?{x:a.x<72?149:-5,y:10+Math.random()*66,crack:false}:farGate(a.x,a.y));
  const route=[]; const n=kindId==='big'?0:1+Math.floor(Math.random()*3);
  for(let k=0;k<n;k++) route.push({x:14+Math.random()*116,y:8+Math.random()*70});
  route.push(b);
  const r={id:state.nextId++,kind,x:a.x,y:a.y,a:Math.atan2(route[0].y-a.y,route[0].x-a.x),v:0,leg:Math.random()*6,route,ri:0,
    mode:'run',timer:30+Math.random()*90,fade:a.crack?0:1,leaving:false,flee:false,maim:false,pace:0.85+Math.random()*0.3};
  state.roaches.push(r); return r;
}
/** Scare roaches near a blow: they run for the nearest way out. @param {number} x @param {number} y @param {number} radius */
function scare(x,y,radius){
  for(const r of state.roaches){ if(r.leaving||Math.hypot(r.x-x,r.y-y)>radius) continue; r.flee=true; r.mode='run'; r.route=[nearGate(r.x,r.y)]; r.ri=0; }
}
/** One tick of a roach: run its route in bursts, stop now and then, slip into its crack at the end. @param {any} r @param {number} speed */
function runRoach(r,speed){
  const K=r.kind;
  if(r.leaving){ r.fade-=0.07; r.v*=0.8; r.x+=Math.cos(r.a)*r.v; r.y+=Math.sin(r.a)*r.v; return r.fade>0; }
  if(r.fade<1) r.fade=Math.min(1,r.fade+0.06);
  if(r.mode==='stop'){ r.v*=0.55; if(--r.timer<=0){ r.mode='run'; r.timer=30+Math.random()*100; } return true; }
  const T=r.route[r.ri], want=Math.atan2(T.y-r.y,T.x-r.x);
  let da=want-r.a; while(da>Math.PI) da-=Math.PI*2; while(da<-Math.PI) da+=Math.PI*2;
  const turn=K.id==='big'?0.07:K.id==='nymph'?0.26:0.16;
  r.a+=Math.max(-turn,Math.min(turn,da))+(vnoise(state.ticks*0.08,r.id*3.7)-0.5)*K.wiggle+(K.id==='nymph'?Math.sin(state.ticks*0.31+r.id)*0.12:0);
  const vt=K.speed*speed*r.pace*(r.flee?1.7:1)*(r.maim?0.45:1)*(Math.abs(da)>1.2?0.5:1);
  r.v+=(vt-r.v)*0.15; r.x+=Math.cos(r.a)*r.v; r.y+=Math.sin(r.a)*r.v; r.leg+=r.v*1.35;
  if(r.maim) r.a+=Math.sin(state.ticks*0.5+r.id)*0.08;
  const last=r.ri===r.route.length-1;
  if(!last&&r.y>WALL_Y1-2) r.y=WALL_Y1-2;
  if(Math.hypot(T.x-r.x,T.y-r.y)<(last&&T.crack?1.4:2.6)){ if(!last) r.ri++; else if(T.crack){ r.leaving=true; return true; } }
  if(last&&!T.crack&&(r.x<-6||r.x>150||r.y<-6||r.y>WALL_Y1+4)) return false;
  if(!r.flee&&!r.maim&&--r.timer<=0){ if(Math.random()<K.stop){ r.mode='stop'; r.timer=12+Math.random()*36; } else r.timer=30+Math.random()*90; }
  return true;
}
/** Keep roaches coming: more of them as the tallow burns down, a line out of the carving, sometimes a swarm. @param {any} p */
function spawnTick(p){
  const T=sessionLen(), live=state.roaches.filter(r=>!r.leaving).length;
  for(const q of state.queue) q.t--; const due=state.queue.filter(q=>q.t<=0); state.queue=state.queue.filter(q=>q.t>0);
  for(const q of due) spawnRoach(q.kind,q.from,q.to);
  if(state.ticks===state.swarmAt){ const c=CRACKS[Math.floor(Math.random()*CRACKS.length)], n=10+Math.floor(Math.random()*5);
    for(let k=0;k<n;k++) state.queue.push({t:k*4+Math.random()*3,kind:Math.random()<0.6?'prusak':p.kinds.includes('nymph')?'nymph':'prusak',from:{x:c.x,y:c.y,crack:true},to:gatePoint(false)}); }
  const cap=state.ending?12:Math.max(1,Math.round(p.max*(0.4+0.6*Math.min(1,state.ticks/(T*0.7)))));
  if(live>=cap) return;
  if(--state.spawnT>0&&live>0) return;
  state.spawnT=state.ending?6:35+Math.random()*80;
  const kind=pickKind(p.kinds);
  if(kind==='prusak'&&state.ticks>1200&&Math.random()<0.12){ for(let k=0;k<3;k++) state.queue.push({t:k*14,kind,from:{...NAME_HOLE,crack:true},to:undefined}); return; }   // out of the carved O
  spawnRoach(kind);
}

/* ---------- the punch ---------- */

/** The knuckles meet the wall at the shadow: squash what is under them or hurt the hand. */
function contact(){
  const x=state.sx, y=state.sy;
  let killed=0, hurt=0, best='';
  sessionMetric('strikes');
  for(const r of state.roaches){ if(r.leaving||r.fade<0.5) continue; const c=roachContact(x,y,r); if(!c) continue;
    if(c==='clean'||r.maim){ killRoach(r,c==='clean'&&!r.maim); killed++; if(c==='clean') best='clean'; else if(!best) best='graze'; }
    else { r.maim=true; r.flee=true; r.route=[nearGate(r.x,r.y)]; r.ri=0; if(!best) best='graze'; } }
  state.roaches=state.roaches.filter(r=>!r.dead);
  if(best){
    hurt=HIT_PAIN[best==='clean'?'clean':'graze']; addPain(hurt); state.missed=false; state.t=0; state.phase='stop';
    if(killed){ state.combo++; state.best=Math.max(state.best,state.combo); if(state.combo%5===0){ sessionAddTime(2); flash('+2 S'); state.feedback='Pięć z rzędu bez pudła — łój pali się dłużej (+2 s).'; } else state.feedback=best==='clean'?'Czysto.':'Dobity.'; }
    else state.feedback='Draśnięty — kuleje do szpary. Dobij go.';
    sfxSquash(killed?1:0.6); wallGoo(x,y,killed?5:2); shake(1,4,1); scare(x,y,18);
  } else {
    const surf=surfaceAt(x,y), m=missCost(surf,state.pain); addPain(m.pain-state.pain);
    state.cool=state.coolMax=m.cool; state.missed=true; state.combo=0; state.misses++; state.t=0; state.phase='stop';
    sessionMetric('misses'); sfxKnuckle(surf); sfxHiss(state.pain); chipWall(x,y); wallDust(x,y,surf===SURFACE.iron?4:12);
    if(state.pain>=60) bloodWall(x,y);
    shake(surf===SURFACE.iron?3:2,surf===SURFACE.iron?12:8,surf===SURFACE.iron?0:1); scare(x,y,24);
    state.feedback=(surf===SURFACE.iron?'W żelazne ucho! ':surf===SURFACE.brick?'Gołe kostki na cegle. ':'Kostki na wapnie. ')+'Ręka drży — chwila przerwy.';
  }
  setInfo();
}
/** A roach is squashed where it ran. @param {any} r @param {boolean} clean */
function killRoach(r,clean){
  r.dead=true; const pts=killPoints(r.kind,r.v);
  state.kills++; sessionMetric('kills'); sessionMetric('points',pts);
  if(clean){ state.clean++; sessionMetric('clean'); }
  if(pts>r.kind.pts){ state.moving++; sessionMetric('moving'); }
  state.splats.push({x:r.x,y:r.y,a:r.a,kind:r.kind,age:0,seed:(r.id*13.7)%31});
}
/** @param {number} d */
function addPain(d){
  state.pain=Math.max(0,Math.min(100,state.pain+d));
  if(state.pain>state.painMax){ sessionMetric('painMax',state.pain-state.painMax); state.painMax=state.pain; }
}
/** @param {string} text */
function flash(text){ state.flash=text; state.flashT=70; }

/** The punch's progress for the picture: 0 at the chin … 1 on the wall. */
function reach(){
  if(state.phase==='out') return Math.pow((state.t+1)/OUT_T,1.6);
  if(state.phase==='stop') return 1;
  if(state.phase==='back') return 1-Math.pow(state.t/BACK_T,0.7);
  return 0;
}

/* ---------- the tick ---------- */

/** One simulation step of the wall. */
export function roachTick(){
  if(!state.on) return;
  const p=params(), S=state;
  if(S.flashT>0) S.flashT--;
  if(S.ending){ S.endT++; S.lampK=Math.max(0,1-S.endT/90); if(S.endT===150&&S.knock) sfxGaol(3); }
  if(S.phase==='stop'&&S.t<(S.missed?STOP_MISS:STOP_HIT)){ S.t++; if(S.t>=(S.missed?STOP_MISS:STOP_HIT)){ S.phase='back'; S.t=0; } roachWallTick({pain:S.pain,lampK:S.lampK}); return; }   // the world holds still at the blow
  S.ticks++;
  const kx=S.keys.r-S.keys.l, ky=S.keys.d-S.keys.u;
  if(kx||ky){ S.keyV=Math.min(2.6,(S.keyV||0.8)+0.06); const l=Math.hypot(kx,ky); roachAim(S.aim.x+kx/l*S.keyV,S.aim.y+ky/l*S.keyV); } else S.keyV=0;
  const H=S.hand, follow=S.phase==='aim'||S.phase==='cool';
  if(follow){ const k=0.21*(0.9+0.1*Math.max(0.8,Math.min(1.6,boxing.STATS.speed||1))); H.vx+=(S.aim.x-H.x)*k; H.vy+=(S.aim.y-H.y)*k; H.vx*=0.62; H.vy*=0.62; H.x+=H.vx; H.y+=H.vy; }
  const shakeK=S.phase==='cool'?S.cool/S.coolMax:0, amp=3*smooth(20,100,S.pain)+2.5*shakeK, fast=S.pain>=90?0.55:0.21;
  S.tremX=(vnoise(S.ticks*fast,1.3)-0.5)*2*amp+(vnoise(S.ticks*0.03,8)-0.5)*0.9; S.tremY=(vnoise(S.ticks*fast+40,4.1)-0.5)*2*amp+Math.sin(S.ticks*0.035)*0.5+shakeK*shakeK*6;
  if(S.phase==='out'){ S.t++; if(S.t>=OUT_T) contact(); }
  else if(S.phase==='back'){ S.t++; if(S.t>=BACK_T){ H.x=S.sx; H.y=S.sy; H.vx=H.vy=0;
    if(S.missed){ S.phase='cool'; } else { S.phase='aim'; if(S.buffered){ S.buffered=false; roachStrike(); } } } }
  else if(S.phase==='cool'){ if(--S.cool<=0){ S.phase='aim'; S.feedback='Ręka znowu słucha.'; setInfo(); } }
  S.pain=Math.max(0,S.pain-(++S.rest>60?PAIN_REST:PAIN_FADE));
  for(const s of S.splats) s.age++;
  const speed=p.speed;
  S.roaches=S.roaches.filter(r=>runRoach(r,speed));
  spawnTick(p);
  sounds();
  roachWallTick({pain:S.pain,lampK:S.lampK});
}

/** Legs on lime, the heart, the wick, the gaol beyond the wall. */
function sounds(){
  const S=state, moving=S.roaches.filter(r=>!r.leaving&&r.v>0.15);
  if(moving.length&&Math.random()<0.05+0.03*moving.length){ const r=moving[Math.floor(Math.random()*moving.length)]; sfxSkitter(Math.max(-1,Math.min(1,(r.x-72)/72)),(0.04+0.012*Math.min(10,moving.length))*(r.kind.id==='big'?1.6:1)); }
  if(S.pain>=60){ if(--S.beatT<=0){ S.beatT=Math.round(52-0.2*(S.pain-60)); sfxHeart(0.4+0.6*(S.pain-60)/40); S.pulse=1; } }
  S.pulse*=0.93;
  if(Math.random()<0.004*S.lampK) sfxCrackle();
  if(S.pain>=40&&S.ticks%Math.round(150-S.pain)===0) sfxBreath();
  if(--S.gaolT<=0){ sfxGaol(Math.random()<0.55?0:Math.random()<0.6?1:2); S.gaolT=400+Math.random()*900; }
}

/** The session ran out: the lamp gutters, the dark fills with legs; a grade S gets an answer through the wall. */
function endLamp(){ state.ending=true; state.endT=0; state.phase='aim'; state.knock=session.last?.grade==='S'; roachKeysOff(); }

/** Extra summary rows. @param {any} r */
function summaryExtra(r){
  const S=state, line=S.painMax>=80?'Kostki starte do krwi. Ściana pamięta.':S.misses===0&&S.kills>0?'Ani jednego pudła. Robactwo uczy się ciebie bać.':S.kills>=(params().goal||12)?'Ściana lepi się od tego, co z nich zostało.':'Uciekły w szpary. Wrócą w nocy.';
  void r;
  return '<span>Karaluchy</span><span>zabite '+S.kills+' (czysto '+S.clean+', w biegu '+S.moving+') · pudła '+S.misses+' · najdłuższa seria '+S.best+' · ból maks. '+Math.round(S.painMax)+'</span><span></span><span><i>'+line+'</i></span>';
}

/* ---------- picture and words ---------- */

/** Render the wall with the shadow, the roaches, the stains and the fist in flight. */
export function renderRoaches(){
  setFramebuffer(renderer.FB_MAIN);
  const S=state, e=reach(), fly=S.phase==='out'||S.phase==='stop'||S.phase==='back';
  const ax=fly?S.sx:S.hand.x+S.tremX, ay=fly?S.sy:S.hand.y+S.tremY;
  const F0=FIST_FROM, fist=fly?{x:ax+(F0.x-ax)*(1-e),y:ay+(F0.y-ay)*(1-e),s:1+2.4*(1-e),a:1}:null;
  const ghost=S.phase==='out'&&S.t>0?(()=>{ const e0=Math.pow(S.t/OUT_T,1.6); return {x:ax+(F0.x-ax)*(1-e0),y:ay+(F0.y-ay)*(1-e0),s:1+2.4*(1-e0),a:0.35}; })():null;
  renderRoachWall({shadow:{x:ax,y:ay,ox:1.2*e,oy:-0.8*e,s:1.5-0.5*e,blur:1.1-0.8*e},roaches:S.roaches,splats:S.splats,fist,ghost,pain:S.pain,pulse:S.pulse});
  if(S.flashT>0&&(S.flashT>14||S.flashT&2)) drawText(S.flash,72,4,appearance.C_SPARK,1);
}

/** The DOM lines under the picture. */
export function roachInfo(){
  const S=state;
  input.infoEl.textContent='KARALUCHY NA ŚCIANIE · zabite '+S.kills+' (czysto '+S.clean+') · seria '+S.combo+' · najlepsza '+S.best+(S.pain>=30?' · ból '+(S.pain>=90?'nie do zniesienia':S.pain>=60?'mocny':'pulsuje'):'');
  input.livesEl.textContent='';
  input.nextEl.textContent=S.feedback+' · mysz / strzałki — cień · klik / Spacja — cios · '+statShort()+' · Esc — wróć do celi';
}

/** Map a pointer on the screen canvas to native picture pixels. @param {PointerEvent} e */
function pointerAt(e){
  const cv=/** @type {HTMLCanvasElement} */ (document.getElementById('screen')), r=cv.getBoundingClientRect(), k=cv.width/(cv.clientWidth||1);
  return screenToView((e.clientX-r.left)*k,(e.clientY-r.top)*k);
}

export function initialize(){
  const stage=renderer.stage;
  stage.addEventListener('pointermove',e=>{ if(boxing.gstate!=='roach') return; const [x,y]=pointerAt(e); roachAim(x,y); });
  stage.addEventListener('pointerdown',e=>{ if(boxing.gstate!=='roach') return; const [x,y]=pointerAt(e); roachAim(x,y); if(e.pointerType==='mouse'&&e.button===0) roachStrike(); });
  stage.addEventListener('pointerup',e=>{ if(boxing.gstate!=='roach'||e.pointerType==='mouse') return; roachStrike(); });   // touch: drag to aim, lift to punch
  addEventListener('blur',roachKeysOff);
}
