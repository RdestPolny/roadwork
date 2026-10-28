import { state as appearanceState, rgb, setRamp, applyGear } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { state as sparringState, sparExit } from './sparring.js';
import { state as npcsState } from './npcs.js';
import { state as progressionState, applyStats, resetSessXP, statShort } from './progression.js';
import { initAudio, sfxBreath, sfxWhoosh, sfxLand, sfxClap, sfxSlap, sfxChime, sfxMiss } from './audio.js';
import { state as boxingState, setFlow, spawn, ik, drawText, drawBoxer, setVenueLight, clearVenueLight, setupFighterLight } from './boxing.js';
import { state as animationState } from './animation.js';
import { state as inputState, setInfo } from './input.js';
import { setPanelMode } from './navigation.js';
import { wardWallBg, drawWardWallLive } from './ward-wall.js';
import { mix } from './cast.js';
import { beginSession, sessionMetric, sessionAddTime, sessionOpen, sessionRunning, sessionParams } from './training-session.js';

const C_PERFECT=rgb('#a8f28c'), C_LOCK=rgb('#4a1812'), C_PAPER=rgb('#8a8070'), C_BURN=['#e8c050','#e07a30','#d83a2a'].map(rgb);

// Runtime values owned by pushups; initialized explicitly by main.js.
export const state = {}; function buildPuCell(){
  const save0=rendererState.fb; rendererState.fb=state.bgPU; wardWallBg(); rendererState.fb=state.bgPUBreath; wardWallBg(true); rendererState.fb=save0;
}
export function setPrisonOutfit(on){
  if(on){ setRamp(appearanceState.R_SHIRT,npcsState.CN_TOP,false); setRamp(appearanceState.R_SHIRTF,npcsState.CN_TOP,true); setRamp(appearanceState.R_PANT,npcsState.CN_PANT,false); setRamp(appearanceState.R_PANTF,npcsState.CN_PANT,true);
    setRamp(appearanceState.R_BOOT,sparringState.PRIS_SHOE,false); setRamp(appearanceState.R_BOOTF,sparringState.PRIS_SHOE,true); setRamp(appearanceState.R_BTR,sparringState.PRIS_SOLE,false); setRamp(appearanceState.R_BTRF,sparringState.PRIS_SOLE,true); appearanceState.btStyle='low'; }
  else { if(sparringState.WORK_RAMPS) appearanceState.PAL.set(sparringState.WORK_RAMPS,appearanceState.R_SHIRT*3); applyGear(progressionState.save.eq); }
}

/** Outside a session (debug start) the stage I parameters apply. */
const FREE={goal:16,zone:10,min:5,burn:0.06};
/** A miss locks the bar three seconds; lying on the paper this long is a miss; the burn drains per tick resting at the top. */
const LOCK_TICKS=180, LIE_TICKS=10, RECOVER=0.003;
/** The depth meter: arms locked at MY0, chest on the newspaper at MY1. */
const MX=12, MY0=46, MY1=82, MH=MY1-MY0;

/** @returns {{goal:number,zone:number,min:number,burn:number}} */
function params(){ return sessionOpen()?sessionParams('pushup'):FREE; }
/** Shake of the burning arms on the way down, in meter rows: the meter shows what is judged. */
function tremor(){ const b=state.puBurn, t=boxingState.tick; return b*b*1.6*Math.sin(t*0.9)*Math.sin(t*0.37+1); }
/** Meter row of the chest. */
function meterY(){ return Math.round(MY1-MH*state.puH+(state.puPhase==='lower'?tremor():0)); }
/** Rows of the depth target just above the paper: the OK zone and, at its bottom, the perfect core (nose over the paper). */
export function pushupZone(){ const end=MY1, n=Math.max(2,Math.round(state.puZone/3)); return {top:end-state.puZone,end,coreTop:end-n,coreEnd:end}; }
/** @param {string} text @param {number} color */
function flash(text,color){ state.puFlash=text; state.puFlashC=color; state.puFlashT=50; }

/** Sweat in the push-ups: heavy drops that run off the brow and chin onto the newspapers, and a fine mist on a launch. @param {number} n @param {boolean} [burst] */
function spawnPuSweat(n,burst=false){
  const B=boxingState;
  for(let j=0;j<n;j++){
    const drip=!burst&&Math.random()<0.72, x=B.headX+1+(Math.random()-0.5)*3, y=B.headY+2+Math.random()*2;
    spawn(drip?B.P_DRIP:B.P_SWEAT,x,y,(Math.random()-0.5)*(drip?0.12:0.45),drip?0.08:-0.18-Math.random()*0.25,drip?44:14+(Math.random()*6|0),drip?B.C_SWEAT_DROP:B.C_SWEAT_MIST);
  }
}

/** The living layer of the cell wall behind the push-ups: tallow flame and smoke, dust in the window's shaft, a breath over the paper. */
export function drawPushupAtmos(){ if(state.puVenue==='cell') drawWardWallLive(boxingState.headX+4,boxingState.headY+1,state.puBurn); }

/** The man, lit by the tallow lamp: drawn on a clean buffer so the light pass touches him and not the wall, then laid over the scene. */
export function drawPushupBody(){
  if(boxingState.lightStrength<=0.01){ drawBoxer(); return; }
  const N=appearanceState.W*appearanceState.H; if(buf?.length!==N) buf=new Uint32Array(N);
  const real=rendererState.fb; buf.fill(0); rendererState.fb=buf; drawBoxer(); rendererState.fb=real;
  for(let i=0;i<N;i++) if(buf[i]){
    const x=i%appearanceState.W, y=(i/appearanceState.W)|0;
    const beam=y>=20?Math.exp(-((x+(y-20)*0.55-102)**2)/(54+(y-11)*1.6)):0;
    real[i]=buf[i]===appearanceState.C_OUT||buf[i]===appearanceState.C_SHADOW?buf[i]:mix(buf[i],rgb('#c4cec3'),beam*0.24);
  }
}
let buf=/** @type {Uint32Array|null} */ (null);

/** One minute on the newspapers: lower under control, release just over the paper, manage the burn. */
export function startPushup(){
  initAudio(); if(boxingState.gstate==='spar')sparExit(); applyGear(progressionState.save.eq);
  boxingState.mode=boxingState.M_FREE; boxingState.gstate='pushup'; applyStats(); resetSessXP(); setFlow(false); boxingState.buffered=-1; animationState.walkHeld=-1; animationState.posX=0; boxingState.state=animationState.IDLE;
  const venue=state.puVenue, p=beginSession('pushup',{end:()=>{ state.puHeld=false; },again:()=>{ state.puVenue=venue; startPushup(); }});
  Object.assign(state,{puPhase:'top',puH:1,puVisH:1,puVelH:0,puSag:0,puSagV:0,puHeadLag:0,puBreath:0,puHeld:false,puArmed:true,puTm:0,puTop:60,puBottom:0,puLock:0,puBurn:0,puZone:p.zone,puLift:0,puClap:0,puCollapse:0,puClapDone:false,
    puReps:0,puPerfects:0,puStreak:0,puBest:0,puExplosive:0,puFlashT:0,
    puFeedback:'Minuta pompek. Przytrzymaj Spację, by zejść; puść tuż nad podłogą — zielone to ideał. Postój w podporze zbija zakwas.'});
  document.body.classList.add('pushup');
  if(state.puVenue==='cell'){ buildPuCell(); setPrisonOutfit(true); setVenueLight(102,16,0.52); setupFighterLight(65,false); }   // the tallow lamp on the left
  inputState.overEl.hidden=true; setPanelMode(); setInfo();
}

export function puReset(){ state.puHeld=false; clearVenueLight(); document.body.classList.remove('pushup'); boxingState.state=animationState.IDLE; animationState.lastPose.set(animationState.cur); boxingState.idleT=0; if(state.puVenue==='cell') setPrisonOutfit(false); }

/** Keyboard and touch share a held input; simulation alone changes the exercise. @param {boolean} down */
export function holdPushup(down){ if(boxingState.gstate==='pushup'&&(!inputState.paused||!down)&&!(down&&sessionOpen()&&!sessionRunning())) state.puHeld=down; }

/** A good release: the burn grows (more when rushed or sloppy, and with every rep done), the target narrows; the fifth perfect in a row comes up
 * explosive (counts twice, eases the burn), the tenth with a clap (counts twice, +2 s). Arms past their limit give out.
 * @param {boolean} perfect */
function puScore(perfect){
  const P=params(), cost=P.burn*(perfect?1:1.3)*(1+state.puReps*0.015)+0.04*Math.max(0,1-state.puTop/30);
  if(state.puBurn+cost>=1){ puMiss('Ręce puszczają — zakwas.',0.8); return; }
  state.puBurn+=cost; state.puStreak=perfect?state.puStreak+1:0; state.puBest=Math.max(state.puBest,state.puStreak);
  const clap=perfect&&state.puStreak%10===0, plyo=perfect&&!clap&&state.puStreak%5===0, n=clap||plyo?2:1;
  state.puReps+=n; sessionMetric('reps',n); sessionMetric('points',(perfect?1:0.7)*n);
  if(perfect){ state.puPerfects++; sessionMetric('perfect'); }
  if(plyo) state.puBurn=Math.max(0,state.puBurn-0.1);
  if(clap) sessionAddTime(2);
  state.puZone=Math.max(P.min,state.puZone-1); state.puExplosive=clap?2:plyo?1:0; state.puPhase='press';
  state.puSagV+=state.puExplosive?0.28:0.14;
  flash(clap?'KLASK +2 S':plyo?'WYRZUT X2':perfect?'IDEALNIE':'DOBRZE',perfect?C_PERFECT:appearanceState.C_SPARK);
  state.puFeedback=clap?'Dziesięć idealnych — pompka z klaśnięciem, +2 s!':plyo?'Pięć idealnych — wyrzut, liczy się podwójnie.':perfect?'Idealnie! Passa idealnych: '+state.puStreak+'.':'Zaliczone. Zejdź niżej, nosem nad podłogę.';
  sfxChime(perfect?1000+Math.min(10,state.puStreak)*40:760);
  if(state.puReps%4<n||state.puBurn>0.55) spawnPuSweat(clap||plyo?3:2,clap||plyo);
  setInfo();
}
/** Released above the zone: a half rep, not counted, the streak broken. */
function puShallow(){
  state.puStreak=0; state.puBurn=Math.min(0.99,state.puBurn+params().burn*0.5); state.puExplosive=0; state.puPhase='press';
  flash('ZA PLYTKO',appearanceState.C_WHITE); state.puFeedback='Półpompka — nie liczy się. Zejdź niżej.'; sfxMiss(); setInfo();
}
/** A miss: he goes down on the paper, the bar is locked three seconds, the target widens.
 * @param {string} why @param {number} [burn] burn left after it */
function puMiss(why,burn){
  state.puPhase='fail'; state.puTm=0; state.puLock=LOCK_TICKS; state.puStreak=0; state.puExplosive=0;
  if(burn!==undefined) state.puBurn=burn;
  state.puSagV+=0.45;
  state.puZone=Math.min(params().zone,state.puZone+2); sessionMetric('misses');
  for(let j=0;j<5;j++) spawn(boxingState.P_DUST,46+j*4,appearanceState.FLOOR_Y-1,(Math.random()-0.5)*1.1,-0.15-Math.random()*0.25,16,appearanceState.C_DUST);   // dust off the newspapers
  flash('SKUCHA',appearanceState.C_RED); state.puFeedback=why+' Blokada 3 s.'; sfxLand(1);
  if(!boxingState.shakeT){ boxingState.shakeAmp=1; boxingState.shakeAxis=1; boxingState.shakeT=boxingState.shakeDur=5; }
  setInfo();
}

export function pushupTick(){
  if(state.puFlashT>0) state.puFlashT--;
  if(state.puLock>0){ state.puLock--; if(state.puLock%60===0) setInfo(); }
  const prevH=state.puH;
  switch(state.puPhase){
    case 'top':
      if(!state.puHeld){
        state.puArmed=true; state.puTop++; state.puBurn=Math.max(0,state.puBurn-RECOVER);
        if(state.puBurn>0.45&&(boxingState.tick%45)===0) spawnPuSweat(1,false);
        if(state.puTop%30===0) setInfo();
        break;
      }
      if(state.puArmed){ state.puPhase='lower'; state.puBottom=0; state.puSagV-=0.08; sfxBreath(); setInfo(); }
      break;
    case 'lower': {
      if(state.puHeld){ state.puH=Math.max(0,state.puH-0.02*(1+0.35*state.puBurn)); if(state.puH===0&&++state.puBottom>LIE_TICKS) puMiss('Za długo — leżysz na podłodze.'); break; }
      const y=meterY(), z=pushupZone();
      if(y>=z.top&&y<z.end) puScore(y>=z.coreTop); else if(y<z.top) puShallow(); else puMiss('Za nisko — klatka na podłodze.');
      break;
    }
    case 'press':
      state.puH=Math.min(1,state.puH+(state.puExplosive?0.07:0.032*(1-0.55*state.puBurn)));
      if(state.puH<1) break;
      if(state.puExplosive){ state.puPhase='launch'; state.puLaunchT=0; state.puLaunchPeak=state.puExplosive===2?5.5:3.8; state.puClapDone=false; sfxWhoosh(1); }
      else { state.puPhase='top'; state.puTop=0; state.puSagV-=0.12; state.puArmed=!state.puHeld; setInfo(); }
      break;
    case 'launch': {
      state.puLaunchT++; const T=22, x=state.puLaunchT/T;
      state.puLift=state.puLaunchPeak*4*x*(1-x); state.puH=1;
      state.puClap=state.puExplosive===2?Math.max(0,1-Math.abs(x-0.5)*4):0;
      if(state.puExplosive===2&&!state.puClapDone&&x>=0.5){
        state.puClapDone=true; sfxClap();   // dust off the palms and a few drops instead of a comic star
        for(let j=0;j<3;j++) spawn(boxingState.P_DUST,boxingState.rgx+(Math.random()-0.5)*2,boxingState.rgy+(Math.random()-0.5)*2,(Math.random()-0.5)*0.9,-0.2-Math.random()*0.25,11,appearanceState.C_DUST);
        spawnPuSweat(2,true);
      }
      if(state.puLaunchT>=T){
        state.puLift=0; state.puClap=0; state.puExplosive=0; state.puPhase='top'; state.puTop=0; state.puArmed=!state.puHeld;
        state.puVelH=-0.09; state.puSagV+=0.32;   // the elbows and hips give on landing
        sfxSlap(1.1); sfxLand(0.8);
        for(let j=0;j<4;j++) spawn(boxingState.P_DUST,state.PU_HANDX-2+j*1.5,appearanceState.FLOOR_Y-1,(Math.random()-0.5)*1,-0.2-Math.random()*0.3,14,appearanceState.C_DUST);
        if(!boxingState.shakeT){boxingState.shakeAmp=1;boxingState.shakeAxis=1;boxingState.shakeT=boxingState.shakeDur=6;} setInfo();
      }
      break;
    }
    case 'fail':
      state.puTm++; state.puBurn=Math.max(0,state.puBurn-0.0015);
      state.puCollapse=state.puLock>30?Math.min(1,state.puTm/10):state.puLock/30;
      if(state.puLock===0){ state.puCollapse=0; state.puH=0; state.puPhase='press'; state.puFeedback='Z powrotem do podporu.'; setInfo(); }
      break;
  }
  // Secondary springs of the presentation only: the judging (meterY, puH) never reads them.
  const rawH=state.puH, easeH=rawH*rawH*(3-2*rawH)*0.55+rawH*0.45;
  state.puVelH+=(easeH-state.puVisH)*0.34; state.puVelH*=0.62; state.puVisH=Math.max(0,Math.min(1.06,state.puVisH+state.puVelH));
  const dh=state.puH-prevH, targetSag=state.puBurn*0.85+(dh>0?0.55:dh<0?-0.25:0);
  state.puSagV+=(targetSag-state.puSag)*0.24; state.puSagV*=0.68; state.puSag=Math.max(-0.9,Math.min(1.8,state.puSag+state.puSagV));
  const targetHead=dh*18+state.puBurn*1.1+(state.puPhase==='press'?0.7:0);
  state.puHeadLag+=(targetHead-state.puHeadLag)*0.22;
  state.puBreath+=0.09+state.puBurn*0.14;
}

export function solvePushup(){
  const h=state.puVisH, b=state.puBurn, t=boxingState.tick;
  const breath=state.puPhase==='top'?(0.35+0.55*b)*Math.sin(state.puBreath):0;
  let yS=state.PU_BOT+(state.PU_TOP-state.PU_BOT)*h-state.puLift-breath*0.45;
  if(state.puPhase!=='fail') yS+=(Math.sin(t*1.7)*0.65+Math.sin(t*2.9+1)*0.35)*b*b*0.85;   /* burning arms shake */
  if(state.puCollapse>0) yS+=(83-yS)*state.puCollapse;
  const Ax=state.PU_ANKX, Ay=appearanceState.FLOOR_Y-3, dy=Ay-yS, dx=Math.sqrt(Math.max(1,state.PU_LB*state.PU_LB-dy*dy));
  const Sx=Ax+dx, Sy=yS, ux=dx/state.PU_LB, uy=-dy/state.PU_LB;          // body axis (feet -> shoulders)
  // the hips and knees sag a little with the burn and with the pace instead of a rigid rod
  const sag=state.puSag*(1-state.puCollapse)+breath*0.35;
  const hipXf=Ax+ux*28-uy*sag*0.3, hipYf=Ay+uy*28+sag-2, knXf=Ax+ux*14, knYf=Ay+uy*14+0.4+sag*0.55;
  state.puHipX=hipXf; state.puHipY=hipYf;
  // hands: planted under the shoulders; leave the floor at the top of an explosive rep; meet for the clap
  const hl=Math.max(0,state.puLift-1.2)*0.9;
  let hnx=state.PU_HANDX, hny=appearanceState.FLOOR_Y-2-hl, hfx=state.PU_HANDX+1, hfy=appearanceState.FLOOR_Y-2-hl;
  if(state.puClap>0){ const cx=Sx+1, cy=Sy+7; hnx+=(cx-hnx)*state.puClap; hny+=(cy-hny)*state.puClap; hfx+=(cx-hfx)*state.puClap; hfy+=(cy-hfy)*state.puClap; }
  if(state.puCollapse>0){ hnx-=2*state.puCollapse; hfx-=2*state.puCollapse; }
  // the shoulder blades draw together at the bottom and the back pushes up at the top
  const scap=(1-h)*1.1-h*0.45, hLag=state.puHeadLag*(1-state.puCollapse);
  // torso / head joints (globals read by drawBoxer)
  boxingState.torsoX=Math.round(hipXf); boxingState.hipX=Math.round(hipXf); boxingState.hipY=Math.round(hipYf)-1;
  boxingState.sx=Math.round(Sx); boxingState.sy=Math.round(Sy+scap)-2;
  boxingState.rsx=Math.round(Sx); boxingState.rsy=Math.round(Sy); boxingState.lsx=Math.round(Sx+1); boxingState.lsy=Math.round(Sy-1);
  boxingState.headX=Math.round(Sx+ux*6+uy*0.8-hLag*0.25); boxingState.headY=Math.round(Sy+uy*6-ux*0.8+hLag+breath*0.3)-1;
  // arms: elbows point back towards the feet
  ik(boxingState.rsx,boxingState.rsy,hnx,hny,appearanceState.UPPER,appearanceState.FORE,1); boxingState.rex=Math.round(boxingState.IKx); boxingState.rey=Math.round(boxingState.IKy); boxingState.rgx=Math.round(boxingState.IKtx); boxingState.rgy=Math.round(boxingState.IKty);
  ik(boxingState.lsx,boxingState.lsy,hfx,hfy,appearanceState.UPPER,appearanceState.FORE,1); boxingState.lex=Math.round(boxingState.IKx); boxingState.ley=Math.round(boxingState.IKy); boxingState.lgx=Math.round(boxingState.IKtx); boxingState.lgy=Math.round(boxingState.IKty);
  // legs: straight line from the hips to the ankles, up on the toes
  const px=0.37, py=0.93, heelShift=(1-h)*0.8+(state.puPhase==='press'?0.5:0);   // foot direction (roughly perpendicular to the shin); the heels lift a little going down and pushing
  boxingState.rhx=boxingState.hipX; boxingState.rhy=Math.round(hipYf); boxingState.rkx=Math.round(knXf); boxingState.rky=Math.round(knYf); boxingState.rax=Math.round(Ax+heelShift*0.4); boxingState.ray=Math.round(Ay-heelShift*0.5);
  boxingState.rtx=Math.round(Ax+px*3); boxingState.rty=appearanceState.FLOOR_Y-1; boxingState.rhex=Math.round(Ax-px*1.5+heelShift*0.5); boxingState.rhey=Math.round(Ay-py*1.5-heelShift*0.6);
  boxingState.lhx=boxingState.hipX+1; boxingState.lhy=Math.round(hipYf)-1; boxingState.lkx=Math.round(knXf)+1; boxingState.lky=Math.round(knYf)-1; boxingState.lax=boxingState.rax+1; boxingState.lay=boxingState.ray-1;
  boxingState.ltx=Math.round(Ax+1+px*3); boxingState.lty=appearanceState.FLOOR_Y-1; boxingState.lhex=boxingState.rhex+1; boxingState.lhey=boxingState.rhey-1;
  boxingState.shDirX=-ux; boxingState.shDirY=-uy;
}

/** The depth meter (the OK zone, its perfect core, the paper at the bottom), the burn beside it, the count and the call. */
export function drawPushupMeter(){
  const z=pushupZone(), locked=state.puLock>0, A=appearanceState;
  for(let y=MY0-1;y<=MY1+1;y++) for(let x=MX-1;x<=MX+3;x++) pset(x,y,(x===MX-1||x===MX+3||y===MY0-1||y===MY1+1)?A.C_OUT:A.C_LANE);
  for(let y=MY0;y<=MY1;y++) for(let x=MX;x<=MX+2;x++) pset(x,y,y>=z.coreTop&&y<z.coreEnd?C_PERFECT:y>=z.top&&y<z.end?A.C_SPARK:y===MY1?C_PAPER:locked?C_LOCK:A.C_LANE);
  const ym=meterY(); for(let x=MX-2;x<=MX+4;x++) pset(x,ym,A.C_WHITE);
  const bx=MX+6, top=Math.round(MY1-(MH+1)*state.puBurn), hot=state.puBurn>0.8, col=state.puBurn<0.5?C_BURN[0]:state.puBurn<0.8?C_BURN[1]:C_BURN[2];
  for(let y=MY0-1;y<=MY1+1;y++) for(let x=bx-1;x<=bx+2;x++) pset(x,y,(x===bx-1||x===bx+2||y===MY0-1||y===MY1+1)?A.C_OUT:(y>=top&&!(hot&&(boxingState.tick&8))?col:A.C_LANE));
  drawText(String(state.puReps),MX+4,MY0-8,A.C_SPARK,1);
  if(locked) drawText(String(Math.ceil(state.puLock/60)),MX+1,MY1+4,A.C_RED,1);
  if(state.puFlashT>0&&(state.puFlashT>12||state.puFlashT&2)) drawText(state.puFlash,72,3,state.puFlashC,1);
}

/** Keep the DOM instructions and the touch control in sync with the exercise. */
export function pushupInfo(){
  inputState.infoEl.textContent='POMPKI · '+state.puReps+' powt. ('+state.puPerfects+' idealnych) · passa '+state.puStreak+(state.puStreak%10>=5?' → klask przy 10':' → wyrzut przy 5')+' · zakwas '+Math.round(state.puBurn*100)+'%';
  inputState.livesEl.textContent=''; inputState.nextEl.textContent=state.puFeedback+(state.puLock>0?' Jeszcze '+Math.ceil(state.puLock/60)+' s.':'')+' · '+statShort()+' · Esc — wróć do celi';
  const button=document.getElementById('pushupAction');
  if(button) button.textContent=state.puLock>0?'Skucha · blokada '+Math.ceil(state.puLock/60)+' s':state.puPhase==='top'||state.puPhase==='lower'?'Przytrzymaj · w dół / puść nad gazetą':'Wyciskanie…';
}

export function initialize(){

/* =====================================================================
   PUSH-UPS — one minute on the newspapers. Hold to lower under control, let go just over
   the paper (green core = perfect, yellow = good, higher = a half rep, on the paper = a miss).
   Height h: 0 = chest on the floor, 1 = arms locked out. Every rep adds burn, more when rushed;
   resting at the top drains it; burn speeds and shakes the descent and slows the press, and
   full burn drops him. Five perfects in a row come up explosive, ten with a clap.
   The pose is solved directly in plank orientation and drawn by the same renderer.
   ===================================================================== */
state.PU_HANDX = 79;
state.PU_ANKX = 33;
state.PU_TOP = 69.5;
state.PU_BOT = 80;
state.PU_LB = 46;

state.puPhase = 'top';
state.puH = 1;
state.puHeld = false;
state.puArmed = true;
state.puTm = 0;
state.puTop = 0;
state.puBottom = 0;
state.puLock = 0;
state.puBurn = 0;
state.puZone = 10;
state.puLift = 0;
state.puClap = 0;
state.puCollapse = 0;
state.puLaunchPeak = 0;
state.puLaunchT = 0;
state.puClapDone = false;
state.puExplosive = 0;
state.puReps = 0;
state.puPerfects = 0;
state.puStreak = 0;
state.puBest = 0;
state.puFlash = '';
state.puFlashC = 0;
state.puFlashT = 0;
state.puFeedback = '';
state.puHipX = 0;
state.puHipY = 0;
state.puVisH = 1;
state.puVelH = 0;
state.puSag = 0;
state.puSagV = 0;
state.puHeadLag = 0;
state.puBreath = 0;

state.puVenue = '';
                            // 'cell' = push-ups on the newspapers in the cell (cell wall behind, drelich)
state.bgPU = new Uint32Array(appearanceState.W*appearanceState.H);
state.bgPUBreath = new Uint32Array(appearanceState.W*appearanceState.H);
const button=document.getElementById('pushupAction');
button.addEventListener('pointerdown',e=>{ e.preventDefault(); button.setPointerCapture(e.pointerId); holdPushup(true); });
button.addEventListener('pointerup',()=>holdPushup(false)); button.addEventListener('pointercancel',()=>holdPushup(false));
button.addEventListener('lostpointercapture',()=>holdPushup(false));
addEventListener('blur',()=>holdPushup(false));
}
