import { state as boxingState } from './boxing.js';
import { state as sparringState, guardLowOf } from './sparring.js';

// Runtime values owned by animation; initialized explicitly by main.js.
export const state = {};
/** Release a held walking direction when an overlay takes focus. */
export function releaseWalk(){ state.walkHeld=-1; }

function ease(id,a){
  switch(id){
    case state.E_OUT: {const b=1-a; return 1-b*b*b;}
    case state.E_IN: return a*a;
    case state.E_IO: return 0.5-0.5*Math.cos(Math.PI*a);
    case state.E_SNAP: {const b=1-a; return 1-b*b*b*b;} // eksplozywny wystrzał bokserski
    default: return a;
  }
} function K(t,e,o){const p=new Float32Array(state.NP);p.set(state.GUARD);for(const k in o)p[state.IDX[k]]=o[k];return {t,e,p};} function MOVE(name,keys,opt){
  const n=keys.length;
  const m=Object.assign({name,n,times:new Float32Array(n),eases:new Uint8Array(n),keys:[],dur:keys[n-1].t,
    apex:-1,glove:-1,fstep:0,twist:0,walk:0,headSmear:0,cancel:keys[n-1].t,imp:0,dent:0,stop:0,shake:0,axis:0,lift:0,rise:0,weight:0,sweatHit:0,
    smearMask:0,dustMask:0,sweatMask:0},opt);
  for(let i=0;i<n;i++){m.times[i]=keys[i].t;m.eases[i]=keys[i].e;m.keys.push(keys[i].p);}
  (opt.smear||[]).forEach(i=>m.smearMask|=1<<i);
  (opt.dust||[]).forEach(i=>m.dustMask|=1<<i);
  (opt.sweat||[]).forEach(i=>m.sweatMask|=1<<i);
  let lm=0; (opt.land||[]).forEach(i=>lm|=1<<i); m.landMask=lm;
  let hm=0; (opt.headSmear||[]).forEach(i=>hm|=1<<i); m.headSmear=hm;
  return m;
}

export function isDash(id){ return id===state.M_DASHF||id===state.M_DASHB; }

export function isFwd(id){ return id===state.M_WALKF||id===state.M_DASHF; }

/** Sample punches each simulation step; retain the original pose on event frames.
 * @param {{id:number,dur:number,fr?:number}} m @param {number} t @param {number} events
 * @returns {number} Pose time in 60 Hz ticks, independent of event/cancel timing.
 */
export function poseSampleTime(m,t,events){
  return Math.max(0,Math.min(m.dur,t));
}

export function samplePose(m,t,out){
  const ts=m.times; let i=1; while(i<m.n-1&&t>ts[i]) i++;
  const t0=ts[i-1], t1=ts[i]; let a=t1>t0?(t-t0)/(t1-t0):1; if(a<0)a=0; else if(a>1)a=1;
  a=ease(m.eases[i],a);
  const A=i===1?state.fromPose:m.keys[i-1], B=m.keys[i];
  for(let k=0;k<state.NP;k++) out[k]=A[k]+(B[k]-A[k])*a;
  if(boxingState.gstate==='spar') sparPoseExtras(m,t,out);
  // footwork: pendulum position/hop from the start pose decays, flow adds a step-in toward the apex
  const tp=m.apex>0?m.times[m.apex]:m.times[2];
  const back=t<tp?1-t/tp:0;
  if(m.hop) return; // dash offsets come directly from the keys
  if(m.walk){ out[state.GY]=state.fromPose[state.GY]*back; return; }   // walks: GX comes from the keys (body travels with the feet)
  out[state.GX]=state.fromPose[state.GX]*back; out[state.GY]=state.fromPose[state.GY]*back;
  // footwork: step toward the apex position
  const bump=t<=tp?ease(state.E_OUT,t/tp):Math.max(0,1-(t-tp)/(m.dur-tp));
  out[state.GX]+=boxingState.moveStep*bump;
  // sparring body shot: dip the knees and drop the punching glove to rib height
  if(sparringState.aimLow&&m.glove>=0&&m.id<=3){
    const L=state.LOWP[m.id], gy=m.glove===0?state.LGY:state.RGY, gx=m.glove===0?state.LGX:state.RGX;
    out[state.BY]+=L[0]*bump; out[state.LEAN]+=L[3]*bump; out[state.HEEL]+=L[4]*bump; out[state.HY]+=0.5*bump;
    out[gy]+=L[1]*bump; out[gx]+=L[2]*bump; if(out[gy]>L[5]) out[gy]=L[5];
  }
  if(boxingState.gstate==='spar'&&sparringState.bareknuckle&&m.id>=state.S_HITJ&&m.id<=state.S_UPPED){
    out[state.HX]*=1.15; out[state.HROT]*=1.15;
  }
  if(boxingState.flow){
    for(let j=0;j<state.AMP_N;j++){const k=state.AMP_IDX[j]; out[k]=state.GUARD[k]+(out[k]-state.GUARD[k])*state.FLOW_AMP;}
    if(out[state.ROT]>1.3)out[state.ROT]=1.3; else if(out[state.ROT]<-1.3)out[state.ROT]=-1.3; if(out[state.HROT]>1.1)out[state.HROT]=1.1;
  }
}
/** Sparring additions to a sampled pose: hurt fighters' heads snap further on hits; a guard held low drops the gloves to the ribs.
 * @param {any} m @param {number} t @param {Float32Array} out */
function sparPoseExtras(m,t,out){
  const F=sparringState.ctxF; if(!F) return;
  if(m.id>=state.S_HITJ&&m.id<=state.S_UPPED){
    // Zamiast wyrywać głowę z szyi (k do 1.8), dzielimy impet między głowę (k<=1.35) a ugięcie tułowia (kb)
    const rawK=(sparringState.bareknuckle?1.12:1)*(1+0.6*Math.max(0,1-F.hp/F.hpMax));
    const k=Math.min(1.35,rawK), kb=Math.min(1.45,1+(rawK-1)*0.55);
    out[state.HX]=Math.max(-3.6,Math.min(3.0,state.GUARD[state.HX]+(out[state.HX]-state.GUARD[state.HX])*k));
    out[state.HY]=Math.max(-3.4,Math.min(3.0,state.GUARD[state.HY]+(out[state.HY]-state.GUARD[state.HY])*k));
    for(const c of [state.LEAN,state.ROT,state.HROT]) out[c]=state.GUARD[c]+(out[c]-state.GUARD[c])*kb;
  }
  if(m.id===state.S_BLOCK||m.id===state.S_BLOCKHIT||m.id===state.S_SHELL){
    const tg=guardLowOf(F)?1:0, g=F.glw??tg; F.glw=g+(tg-g)*0.35;
    const w=F.glw*(m.id===state.S_BLOCK?Math.min(1,t/5)*(t>30?Math.max(0,1-(t-30)/8):1):1);
    if(w>0.01) for(let j=0;j<state.LOWG_CH.length;j++) out[state.LOWG_CH[j]]+=state.LOWG_D[j]*w;
  }
}

/** Sample the planted guard on the shared beat clock, retaining fatigue and injury cues. @param {Float32Array} out */
export function computeIdle(out){
  let ph=(boxingState.simNow-boxingState.lastBeatMs)/boxingState.beatMs; if(ph<0)ph=0; else if(ph>0.999)ph=0.999;
  let bi=boxingState.beatIdx;
  if(sparringState.idleOff){ ph+=sparringState.idleOff; if(ph>=1){ ph-=1; bi++; } }   // sparring: the two fighters shift their weight off-phase
  const step=Math.floor(ph*8)/8, TAU=6.283185307;
  out.set(state.GUARD);
  if(boxingState.flow){
    // PENDULUM STEP: land on every beat, hop in on even beats, out on odd beats
    const air=step<0.125||step>0.875?0:Math.sin(Math.PI*(step-0.125)/0.75);
    out[state.GY]=-3*air;
    out[state.BY]=state.GUARD[state.BY]+(step<0.125?2.2:(step>0.875?0.8:0.2));   // knees absorb the landing
    const dir=(bi&1)?-1:1, p=step<0.125?0:(step>0.875?1:(step-0.125)/0.75);
    out[state.GX]=dir*(-2.5+5*(0.5-0.5*Math.cos(Math.PI*p)));
    out[state.BX]=state.GUARD[state.BX]; out[state.LEAN]=state.GUARD[state.LEAN]+0.5+0.5*dir*air;
    out[state.HEEL]=1+air; out[state.ST]=state.GUARD[state.ST]-1;
    return;
  }
  const tired=state.idleTired, hurt=state.idleHurt, close=state.idleClose, fresh=1-tired;
  // Planted bareknuckle guard: slow weight transfer and breathing, without hopping or raising the hands to the face.
  const w=Math.sin(Math.PI*((bi&3)+step)/2), amp=(0.4+0.4*fresh)*(1-0.4*hurt);
  out[state.BX]+=0.65*w*amp; out[state.LEAN]-=0.25*w*amp;
  out[state.ROT]+=0.07*w; out[state.HROT]+=0.05*w; out[state.HX]-=0.2*w;
  out[state.BY]+=0.45*tired+0.6*hurt+0.3*close;
  const breath=0.5-0.5*Math.cos(TAU*((bi%(tired>0.5?2:4))+step)/(tired>0.5?2:4));
  out[state.SQ]+=(0.65+0.65*tired)*breath; out[state.HY]+=0.2*breath+0.4*close;
  out[state.LGY]+=1.2*tired+0.8*hurt-0.5*close; out[state.RGY]+=tired+0.8*hurt-0.5*close;
  out[state.LGX]+=0.4*w*amp-0.5*tired;
  // Victorian forearm circling (milling): subtle elliptical roll of the fists and forearms
  const millAngle=TAU*(((bi&1)+step)/2), mill=(0.5+0.5*fresh)*(1-0.5*hurt)*(1-0.6*tired);
  out[state.LGX]+=0.75*Math.cos(millAngle)*mill;
  out[state.LGY]+=0.55*Math.sin(millAngle)*mill;
  out[state.RGX]+=0.45*Math.cos(millAngle+Math.PI)*mill;
  out[state.RGY]+=0.4*Math.sin(millAngle+Math.PI)*mill;
  // 5. hurt: slow irregular wobble (sampled at 12 fps)
  if(hurt>0){
    const tq=Math.floor(boxingState.simNow/83.3)*0.0833;
    out[state.BX]+=1.3*hurt*Math.sin(tq*2.1); out[state.LEAN]+=1.1*hurt*Math.sin(tq*1.3+1); out[state.HX]+=0.8*hurt*Math.sin(tq*2.9+2); out[state.HY]+=0.9*hurt;
  }
}

export function initialize(){


/* =====================================================================
   POSE PARAMETERS
   ===================================================================== */
// GX/GY = whole-body offset incl. feet (footwork / hop). GY<0 = airborne.
state.BX = 0;
state.BY = 1;
state.LEAN = 2;
state.ROT = 3;
state.HX = 4;
state.HY = 5;
state.LGX = 6;
state.LGY = 7;
state.RGX = 8;
state.RGY = 9;
state.LFL = 10;
state.RFL = 11;
state.ST = 12;
state.HEEL = 13;
state.LGS = 14;
state.RGS = 15;
state.STEP = 16;
state.SQ = 17;
state.GX = 18;
state.GY = 19;
state.HROT = 20;
state.LHEEL = 21;
state.LKN = 22;
state.RSTEP = 23;
state.LLIFT = 24;
state.RLIFT = 25;
state.NP = 26;
   // HROT = hip rotation (rear hip drives forward)
state.IDX = {BX:state.BX,BY:state.BY,LEAN:state.LEAN,ROT:state.ROT,HX:state.HX,HY:state.HY,LGX:state.LGX,LGY:state.LGY,RGX:state.RGX,RGY:state.RGY,LFL:state.LFL,RFL:state.RFL,ST:state.ST,HEEL:state.HEEL,LGS:state.LGS,RGS:state.RGS,STEP:state.STEP,SQ:state.SQ,GX:state.GX,GY:state.GY,HROT:state.HROT,LHEEL:state.LHEEL,LKN:state.LKN,RSTEP:state.RSTEP,LLIFT:state.LLIFT,RLIFT:state.RLIFT};
   // LHEEL/LKN = lead heel pivot / lead knee turn-in (hooks)
state.GUARD = new Float32Array(state.NP);

// Upright Victorian guard: extended lead fist, rear fist at the chest, elbows down.
state.GUARD[state.BX]=-1;
 state.GUARD[state.BY]=0;
 state.GUARD[state.LEAN]=-0.5;
 state.GUARD[state.LGX]=14;
 state.GUARD[state.LGY]=2;
 state.GUARD[state.RGX]=5;
 state.GUARD[state.RGY]=4;
 state.GUARD[state.ST]=22;

state.cur = new Float32Array(state.NP);
state.fromPose = new Float32Array(state.NP);
state.lastPose = new Float32Array(state.NP);
state.idleP = new Float32Array(state.NP);

state.cur.set(state.GUARD);


state.E_LIN = 0;
state.E_OUT = 1;
state.E_IN = 2;
state.E_IO = 3;
state.E_SNAP = 4;

/* Keyframe times are 60 Hz ticks. Punch poses update every tick; events retain the 5-tick grid. */
state.MOVES = [
 // JAB (Lewy prosty): krótki impuls z przedniej nogi, biodro i lewy bark wkręcają się do przodu,
 // prawa ręka asekuruje szczękę (RGY:-3.2), broda schowana za lewym barkiem, błyskawiczny powrót po linii ciosu.
 MOVE('JAB',[
   K(0,state.E_LIN,{}),
   K(2,state.E_IN,{LGX:12.8,LGY:0.5,ROT:-0.15,HROT:-0.1,LEAN:0.4,BX:0.2,BY:0.6,HX:-0.2,HY:0.6,RGX:4.8,RGY:-2.8,STEP:0.4,HEEL:0.5}),
   K(5,state.E_SNAP,{LGX:19.2,LGY:-4.2,ROT:-0.75,HROT:-0.35,LEAN:1.8,BX:0.9,BY:0.9,HX:-0.6,HY:1.1,RGX:4.2,RGY:-3.8,STEP:1.2,HEEL:1.2,LGS:0.3}),
   K(6,state.E_OUT,{LGX:19.6,LGY:-4.4,ROT:-0.82,HROT:-0.4,LEAN:2.0,BX:1.0,BY:1.0,HX:-0.7,HY:1.2,RGX:4.0,RGY:-4.0,STEP:1.3,HEEL:1.3,LGS:0.4}),
   K(9,state.E_OUT,{LGX:13.5,LGY:-1.0,ROT:-0.25,HROT:-0.1,LEAN:0.6,BX:0.2,BY:0.5,HX:-0.2,HY:0.5,RGX:4.6,RGY:-1.5,STEP:0.5}),
   K(13,state.E_IO,{})
 ],{apex:3,glove:0,fstep:1.5,twist:0.008,cancel:9,imp:0.0028,dent:1.8,stop:2,shake:0,weight:0.5,fr:2,smear:[2,3]}),

 // CROSS (Prawy prosty): załadowanie ciężaru na tylną nogę, mocny skręt tylnej stopy (HEEL:3.6) i biodra (HROT:1.1),
 // prawy bark wybija przed brodę (ROT:1.25), lewa ręka wraca wysoko pod policzek (LGX:5.5, LGY:-4.5).
 MOVE('CROSS',[
   K(0,state.E_LIN,{}),
   K(4,state.E_IN,{ROT:-0.45,HROT:-0.35,LEAN:-0.8,BY:1.4,BX:-0.8,RGX:3.0,RGY:2.0,LGX:12.5,LGY:0.5,HX:-0.3,HY:0.8,HEEL:0.4}),
   K(7,state.E_IN,{ROT:0.45,HROT:0.65,LEAN:2.4,BX:0.8,BY:1.6,RGX:11.5,RGY:-2.2,HEEL:2.4,LGX:6.5,LGY:-3.5,HX:0.2,HY:1.2,STEP:0.6}),
   K(10,state.E_SNAP,{ROT:1.25,HROT:1.1,LEAN:4.6,BX:1.8,BY:1.8,RGX:19.6,RGY:-4.2,HEEL:3.6,LGX:5.2,LGY:-4.8,HX:0.4,HY:1.4,STEP:1.0,RGS:0.6}),
   K(12,state.E_OUT,{ROT:1.3,HROT:1.15,LEAN:4.8,BX:1.9,BY:1.8,RGX:19.8,RGY:-4.2,HEEL:3.8,LGX:5.0,LGY:-4.8,HX:0.4,HY:1.4,STEP:1.0,RGS:0.6}),
   K(17,state.E_OUT,{ROT:0.5,HROT:0.45,LEAN:2.0,BX:0.7,BY:1.2,RGX:10.5,RGY:-1.5,HEEL:1.8,LGX:8.5,LGY:-2.0,HY:0.8}),
   K(24,state.E_IO,{ROT:0.1,HROT:0.1,LEAN:0.4,BY:0.4,RGX:6.0,RGY:2.0,HEEL:0.4,LGX:12.5,LGY:1.0}),
   K(30,state.E_IO,{})
 ],{apex:3,glove:1,fstep:2,twist:0.016,cancel:19,imp:0.0048,dent:2.7,stop:5,shake:1,axis:0,weight:0.85,fr:3,sweatHit:3,smear:[2,3,4],dust:[2,3]}),

 // HOOK (Lewy sierpowy): zejście na nogach i przeniesienie ciężaru na przednią stopę, a następnie gwałtowny obrót
 // przedniej pięty (LHEEL:2.4) i kolana do środka (LKN:1.5); łokieć idzie wysoko w poziomie (LFL:-0.65), prawa ręka przy szczęce.
 MOVE('HOOK',[
   K(0,state.E_LIN,{}),
   K(4,state.E_IN,{BY:2.0,BX:-0.4,LEAN:0.8,ROT:0.55,HROT:0.35,HX:0.6,HY:1.4,LGX:6.5,LGY:-1.5,LFL:-0.25,RGX:4.8,RGY:-4.2,LKN:0.2,HEEL:0.5}),
   K(7,state.E_IN,{BY:2.4,BX:0.2,LEAN:1.4,ROT:0.75,HROT:0.1,HX:0.8,HY:1.8,LGX:5.2,LGY:-3.2,LFL:-0.55,LGS:0.2,RGX:4.5,RGY:-4.8,LHEEL:0.8,LKN:0.5,HEEL:0.6}),
   K(10,state.E_SNAP,{BY:1.4,BX:0.9,LEAN:2.4,ROT:-1.45,HROT:-0.95,HX:0.4,HY:1.6,LGX:13.2,LGY:-4.6,LFL:-0.7,LGS:1.4,RGX:4.5,RGY:-4.8,LHEEL:2.2,LKN:1.4}),
   K(13,state.E_OUT,{BY:1.5,BX:0.8,LEAN:2.3,ROT:-1.7,HROT:-1.1,HX:0.2,HY:1.6,LGX:10.5,LGY:-4.0,LFL:-0.65,LGS:1.6,RGX:4.5,RGY:-4.5,LHEEL:2.4,LKN:1.6}),
   K(19,state.E_OUT,{BY:1.0,BX:0.3,LEAN:1.0,ROT:-0.6,HROT:-0.4,HY:0.8,LGX:9.5,LGY:-1.5,LFL:-0.25,LGS:0.5,RGX:4.8,RGY:-1.5,LHEEL:0.8,LKN:0.5}),
   K(27,state.E_IO,{})
 ],{apex:3,glove:0,fstep:1,twist:-0.075,cancel:19,imp:0.0052,dent:3.1,stop:7,shake:2,axis:0,weight:1,fr:3,sweatHit:3,smear:[2,3,4],dust:[3]}),

 // UPPERCUT (Prawy podbródkowy): ugięcie kolan i obniżenie prawego barku, po czym wybicie z nóg (BY: 2.8 -> 0.3, SQ: 1.2)
 // i wbicie pięści pionowo przez gardę rywala przy pełnej asekuracji lewą ręką (LGY:-5.5).
 MOVE('UPPERCUT',[
   K(0,state.E_LIN,{}),
   K(4,state.E_IN,{ROT:-0.65,HROT:-0.45,BY:2.6,SQ:-0.6,LEAN:1.2,BX:-0.4,RGX:4.8,RGY:3.2,HY:1.6,HX:0.5,LGX:5.5,LGY:-5.0}),
   K(7,state.E_IN,{ROT:-0.8,HROT:-0.55,BY:3.0,SQ:-0.8,LEAN:1.4,BX:-0.2,RGX:5.8,RGY:4.2,HY:1.8,HX:0.6,LGX:5.2,LGY:-5.5,HEEL:0.8}),
   K(10,state.E_SNAP,{ROT:0.75,HROT:0.65,BY:1.4,SQ:0.4,LEAN:2.8,BX:1.6,RGX:10.8,RGY:-2.5,HEEL:2.4,HY:0.6,LGX:5.0,LGY:-5.5,RGS:0.5}),
   K(12,state.E_SNAP,{ROT:1.45,HROT:1.1,BY:0.3,SQ:1.2,LEAN:3.4,BX:2.6,RGX:11.8,RGY:-10.2,HEEL:3.8,HX:0.8,HY:-0.5,LGX:4.8,LGY:-5.2,RGS:0.8}),
   K(15,state.E_OUT,{ROT:1.55,HROT:1.15,BY:0.2,SQ:1.3,LEAN:3.5,BX:2.8,RGX:11.2,RGY:-11.0,HEEL:3.8,HX:0.8,HY:-0.7,LGX:4.8,LGY:-5.0,RGS:0.7}),
   K(21,state.E_IO,{ROT:0.45,HROT:0.3,BY:1.0,LEAN:1.6,BX:0.8,RGX:7.5,RGY:-3.5,HEEL:1.2,LGX:9.0,LGY:-1.5}),
   K(28,state.E_IO,{})
 ],{apex:4,glove:1,fstep:1,twist:0.014,cancel:19,imp:0.004,dent:2.6,stop:6,shake:2,axis:1,lift:2,rise:1,weight:1,sweatHit:4,smear:[3,4,5],dust:[4]}),
 // DODGE (Rotacja / Weave pod sierpowym): zejście po łuku litery U – najpierw odchylenie i ugięcie kolan
 // na tylną nogę, przejście dołem ze zwartą gardą i wyjście w górę na przednią nogę z wkręceniem biodra.
 MOVE('DODGE',[
   K(0,state.E_LIN,{}),
   K(4,state.E_OUT,{BY:3.4,BX:-0.8,LEAN:-1.2,ROT:-0.45,HROT:-0.25,HX:-0.6,HY:1.2,LGX:6.8,LGY:-4.2,RGX:4.5,RGY:-3.8,LKN:0.4}),
   K(9,state.E_IO,{BY:5.4,BX:0.2,LEAN:0.8,ROT:0.15,HROT:0.1,HX:0.4,HY:1.8,LGX:6.2,LGY:-5.0,RGX:4.5,RGY:-4.5,LKN:1.0,HEEL:0.5}),
   K(14,state.E_OUT,{BY:3.0,BX:1.0,LEAN:2.2,ROT:0.55,HROT:0.35,HX:0.8,HY:1.2,LGX:6.8,LGY:-4.5,RGX:4.5,RGY:-4.0,LKN:0.6,HEEL:1.0}),
   K(19,state.E_IO,{BY:1.2,BX:0.2,LEAN:0.8,ROT:0.15,HROT:0.1,LGX:10.5,LGY:-1.0}),
   K(24,state.E_IO,{})
 ],{fstep:-3,cancel:18,sweat:[1],dust:[1,2],headSmear:[1,2]}),

 // SLIP L (Unik na zewnątrz / Outside Slip): zejście z linii ciosu nad przednie kolano, prawy bark i biodro
 // wkręcają się do przodu (ładowanie prawej ręki lub lewego sierpa), broda schowana, garda wysoko przy szczęce.
 MOVE('SLIP L',[
   K(0,state.E_LIN,{}),
   K(3,state.E_SNAP,{BY:3.4,BX:1.6,LEAN:3.2,ROT:0.9,HROT:0.5,HX:1.4,HY:1.8,LGX:6.5,LGY:-5.2,RGX:4.5,RGY:-4.5,LKN:0.9,HEEL:1.0}),
   K(8,state.E_OUT,{BY:3.8,BX:1.9,LEAN:3.6,ROT:1.0,HROT:0.55,HX:1.6,HY:2.0,LGX:6.2,LGY:-5.5,RGX:4.5,RGY:-4.8,LKN:1.1,HEEL:1.2}),
   K(14,state.E_OUT,{BY:0.8,BX:-0.2,LEAN:0.2,ROT:-0.15,HROT:-0.1,HX:-0.2,HY:0.4,LGX:11.0,LGY:-0.5,RGX:4.8,RGY:1.5}),
   K(20,state.E_IO,{})
 ],{cancel:13,sweat:[1],dust:[1],headSmear:[1,2]}),

 // SLIP R (Unik do wewnątrz / Inside Slip): przeniesienie ciężaru na ugiętą tylną nogę, lewy bark i biodro
 // zawijają się do środka (ładowanie prawego prostego / podbródkowego), bez nienaturalnego łamania pleców w tył.
 MOVE('SLIP R',[
   K(0,state.E_LIN,{}),
   K(3,state.E_SNAP,{BY:3.4,BX:-1.4,LEAN:-1.6,ROT:-0.9,HROT:-0.5,HX:-1.3,HY:1.5,LGX:7.0,LGY:-4.8,RGX:4.2,RGY:-4.2,LHEEL:0.8,LKN:0.5}),
   K(8,state.E_OUT,{BY:3.8,BX:-1.8,LEAN:-2.0,ROT:-1.05,HROT:-0.6,HX:-1.6,HY:1.7,LGX:6.8,LGY:-5.2,RGX:4.0,RGY:-4.5,LHEEL:1.0,LKN:0.6}),
   K(14,state.E_OUT,{BY:0.8,BX:0.4,LEAN:1.0,ROT:0.2,HROT:0.15,HX:0.3,HY:0.4,LGX:11.5,LGY:0,RGX:4.8,RGY:2.0}),
   K(20,state.E_IO,{})
 ],{cancel:13,sweat:[1],dust:[1],headSmear:[1,2]}),
 // Feet offsets (STEP/RSTEP) are relative to the body origin, which itself travels with GX,
 // so the values below are (absolute foot position - GX).
 // WALK FORWARD: step-drag — lead foot lifts (knee bent) and reaches, hips sink and follow, rear foot drags up (+7 px)
 MOVE('WALK >',[
   K(0,state.E_LIN,{}),
   K(6,state.E_OUT,{GX:2,STEP:1.5,RSTEP:-2,LLIFT:2.2,LKN:1.3,BY:2.4,LEAN:1.5,HEEL:0.5}),
   K(12,state.E_IO,{GX:4.8,STEP:2.2,RSTEP:-4.8,BY:3,LEAN:1.5,LKN:1.2}),
   K(18,state.E_IO,{GX:6,STEP:1,RSTEP:-1.5,RLIFT:1.2,BY:2.2,HEEL:1,LKN:0.6}),
   K(24,state.E_IO,{GX:7,BY:1.4})
 ],{walk:7,cancel:24,dust:[2,4]}),
 // WALK BACK: rear foot reaches back first, lead foot follows (-7 px)
 MOVE('WALK <',[
   K(0,state.E_LIN,{}),
   K(6,state.E_OUT,{GX:-2,STEP:2,RSTEP:-1.5,RLIFT:2,BY:2.2,LEAN:0.5}),
   K(12,state.E_IO,{GX:-4.8,STEP:4.8,RSTEP:-2.2,BY:2.6,LEAN:0.5}),
   K(18,state.E_IO,{GX:-6,STEP:1.5,RSTEP:-1,LLIFT:1.2,LKN:0.5,BY:2}),
   K(24,state.E_IO,{GX:-7,BY:1.4})
 ],{walk:-7,cancel:24,dust:[2,4]})
];

state.M_DODGE = 4;
state.M_SLIPL = 5;
state.M_SLIPR = 6;
state.M_WALKF = 7;
state.M_WALKB = 8;
state.POS_MIN = -21;
state.POS_MAX = 7;


// Keep retired move slots 9–16 empty so the remaining animation IDs stay stable.
state.MOVES.length=17;

/* ---------- SPARRING: hit reactions, high guard, knockdown ----------
   Reactions are "walk"-type moves: GX is keyed, so the knock-back travels with the feet and
   is baked into posX when the move ends (GX < 0 = away from the opponent — every fighter is
   simulated in its own right-facing frame). hold = tick where time stops while the hold
   condition is true (block held, fighter down). */
state.S_FIRST = state.MOVES.length;

state.MOVES.push(
  // S_HITJ (trafiony prostym): ostry odskok głowy w tył, lekka praca kolan i szybkie zebranie gardy
  MOVE('TRAFIONY',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{HX:-2.5,HY:-0.9,LEAN:-0.8,BX:-0.8,BY:1.4,ROT:-0.45,HROT:-0.2,GX:-0.6,LGX:7.2,LGY:-4.8,RGX:4.2,RGY:-3.5}),
    K(6,state.E_OUT,{HX:-1.4,HY:-0.3,LEAN:-0.2,BX:-0.5,BY:1.8,ROT:-0.25,GX:-1.2,RSTEP:-0.5,LGX:8.0,LGY:-3.5,RGX:4.5,RGY:-2.0}),
    K(11,state.E_IO,{HX:-0.4,LEAN:0.4,BY:1.2,GX:-1.5,LGX:11.0,LGY:-0.5,RGX:4.8,RGY:1.5}),
    K(16,state.E_IO,{GX:-1.5})
  ],{walk:-1,cancel:11,sweat:[1],fr:2,headSmear:[1]}),

  // S_HIT (mocny prosty): głowa i barki odrzucone, wyraźny krok wstecz tylną nogą dla złapania równowagi
  MOVE('TRAFIONY!',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{HX:-2.9,HY:-1.3,LEAN:-1.8,BX:-1.4,BY:1.5,ROT:-0.7,HROT:-0.35,GX:-1.0,LGX:6.0,LGY:-5.5,RGX:3.5,RGY:-4.2,LHEEL:0.6}),
    K(8,state.E_OUT,{HX:-1.8,HY:-0.5,LEAN:-1.0,BX:-1.0,BY:2.4,ROT:-0.4,HROT:-0.2,GX:-2.5,STEP:1.2,RSTEP:-1.8,RLIFT:1.0,LGX:6.8,LGY:-4.5,RGX:4.0,RGY:-3.2}),
    K(15,state.E_IO,{HX:-0.4,HY:0.4,LEAN:0.4,BY:1.8,GX:-3.5,STEP:0.4,LLIFT:0.6,LKN:0.5,LGX:9.5,LGY:-1.5,RGX:4.6,RGY:0.5}),
    K(22,state.E_IO,{GX:-3.5})
  ],{walk:-1,cancel:16,sweat:[1],dust:[2],fr:2,headSmear:[1]}),

  // S_HOOKED (trafiony sierpowym): głowa i obręcz barkowa przekręcone z impetem ciosu, ugięcie kolan
  MOVE('HAK NA GŁOWĘ',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{HX:-1.8,HY:2.1,LEAN:-1.2,BX:-1.1,BY:2.2,ROT:1.25,HROT:0.65,GX:-0.8,LGX:5.0,LGY:-1.5,RGX:4.5,RGY:-4.8,LKN:0.8,HEEL:0.8}),
    K(9,state.E_OUT,{HX:-1.2,HY:1.2,LEAN:-0.5,BX:-0.6,BY:2.8,ROT:0.65,HROT:0.35,GX:-2.0,RSTEP:-1.2,LGX:6.2,LGY:-2.8,RGX:4.5,RGY:-4.0,LKN:0.5}),
    K(16,state.E_IO,{HX:-0.3,HY:0.4,LEAN:0.4,BY:1.6,ROT:0.15,GX:-2.5,LGX:10.0,LGY:-0.5,RGX:4.8,RGY:1.0}),
    K(22,state.E_IO,{GX:-2.5})
  ],{walk:-1,cancel:16,sweat:[1],fr:2,headSmear:[1]}),

  // S_UPPED (trafiony podbródkowym): podbicie brody i klatki piersiowej w górę na palcach, po czym ciężkie osadzenie na nogach
  MOVE('PODBRÓDEK',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{HX:-2.2,HY:-2.6,LEAN:-2.4,BX:-1.0,BY:-0.6,SQ:0.8,ROT:-0.35,HEEL:1.8,LHEEL:1.2,GX:-0.6,LGX:6.2,LGY:-6.2,RGX:3.8,RGY:-5.0}),
    K(9,state.E_OUT,{HX:-1.5,HY:-1.1,LEAN:-1.4,BX:-0.8,BY:1.8,SQ:0.2,GX:-2.4,RSTEP:-1.5,RLIFT:1.0,LGX:6.5,LGY:-5.0,RGX:4.0,RGY:-3.5}),
    K(16,state.E_IO,{HX:-0.4,HY:0.3,LEAN:0.3,BY:2.0,GX:-3.0,LGX:9.5,LGY:-1.5,RGX:4.6,RGY:0.5}),
    K(22,state.E_IO,{GX:-3.0})
  ],{walk:-1,cancel:16,sweat:[1],fr:2,headSmear:[1]}),

  // S_BODY (cios na korpus / wątrobę): nagłe złamanie w pasie, łokcie schodzą na żebra, głowa opada za gardę
  MOVE('NA KORPUS',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{BY:3.6,LEAN:2.8,BX:-1.6,HX:1.1,HY:2.2,SQ:-1.2,ROT:0.35,HROT:0.2,GX:-0.6,LGX:5.8,LGY:0.5,RGX:4.2,RGY:2.2,LFL:0.4,RFL:0.3,LKN:0.9}),
    K(10,state.E_IO,{BY:3.8,LEAN:2.4,BX:-1.2,HX:0.9,HY:1.8,SQ:-1.0,ROT:0.25,GX:-2.0,RSTEP:-1.0,LGX:6.0,LGY:-0.5,RGX:4.2,RGY:1.5,LFL:0.3,LKN:0.6}),
    K(18,state.E_IO,{BY:1.8,LEAN:1.0,HY:0.8,GX:-2.5,LGX:9.0,LGY:-2.0,RGX:4.5,RGY:0.5}),
    K(24,state.E_IO,{GX:-2.5})
  ],{walk:-1,cancel:18}),

  // S_BLOCK (wysoka, zwarta garda): przednia ręka chroni łuk brwiowy, tylna asekuruje szczękę, łokcie wąsko
  MOVE('BLOK',[
    K(0,state.E_LIN,{}),
    K(4,state.E_OUT,{LGX:7.4,LGY:-6.4,RGX:4.8,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.4,HY:1.4,BY:1.8,LEAN:0.9,ROT:0.25,HROT:0.15,LGS:0.25,RGS:0.2}),
    K(30,state.E_LIN,{LGX:7.4,LGY:-6.4,RGX:4.8,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.4,HY:1.4,BY:1.8,LEAN:0.9,ROT:0.25,HROT:0.15,LGS:0.25,RGS:0.2}),
    K(38,state.E_IO,{})
  ],{cancel:5,hold:5}),

  // S_BLOCKHIT (cios przyjęty na gardę): twarde wbicie przedramion i sprężyste zamortyzowanie na kolanach
  MOVE('BLOK!',[
    K(0,state.E_LIN,{}),
    K(2,state.E_SNAP,{LGX:5.6,LGY:-6.2,RGX:3.8,RGY:-5.2,LFL:0.45,RFL:0.4,HX:-1.1,HY:1.6,BY:2.6,LEAN:-0.3,BX:-1.0,ROT:0.3,GX:-1.0,LGS:0.3,RGS:0.25,LKN:0.5}),
    K(8,state.E_OUT,{LGX:6.8,LGY:-6.4,RGX:4.5,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.6,HY:1.5,BY:2.1,LEAN:0.5,GX:-1.5,LGS:0.25,RGS:0.2}),
    K(13,state.E_IO,{LGX:7.4,LGY:-6.4,RGX:4.8,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.4,HY:1.4,BY:1.8,LEAN:0.9,ROT:0.25,GX:-1.5,LGS:0.25,RGS:0.2})
  ],{walk:-1,cancel:7}),

  // S_STAGGER (zamroczony / "na miękkich nogach")
  MOVE('ZAMROCZONY',[
    K(0,state.E_LIN,{}),
    K(4,state.E_OUT,{HX:-2.2,HY:-0.8,LEAN:-1.8,BX:-1.4,BY:2.2,ROT:-0.45,GX:-1.2,LGX:5.5,LGY:-1.5,RGX:3.5,RGY:1.5}),
    K(14,state.E_IO,{HX:0.8,HY:1.8,LEAN:1.4,BX:0.4,BY:3.8,ROT:0.35,GX:-3.2,STEP:1.8,RSTEP:-2.0,LKN:1.2,LGX:5.0,LGY:0.5,RGX:3.5,RGY:2.5}),
    K(26,state.E_IO,{HX:-1.2,HY:0.6,LEAN:-0.8,BX:-0.8,BY:3.0,ROT:-0.25,GX:-5.0,STEP:-0.8,RLIFT:1.0,LGX:5.8,LGY:-1.0,RGX:3.8,RGY:1.5}),
    K(38,state.E_IO,{HX:0.4,HY:1.2,LEAN:0.8,BY:2.6,GX:-6.0,LKN:0.6,LGX:7.5,LGY:-2.5,RGX:4.2,RGY:0}),
    K(50,state.E_IO,{GX:-6.0})
  ],{walk:-1,cancel:44,sweat:[1,3],dust:[2,3]}),

  // S_KD (nokdaun): ugięcie nóg i opadnięcie na jedno kolano / przysiad podparcia
  MOVE('NOKDAUN',[
    K(0,state.E_LIN,{}),
    K(3,state.E_SNAP,{HX:-2.6,HY:-1.6,LEAN:-2.6,BX:-1.5,BY:1.6,ROT:-0.5,GX:-1.0,LGX:4.5,LGY:-3.0,RGX:2.8,RGY:-0.5}),
    K(11,state.E_IN,{HX:-0.8,HY:0.4,LEAN:-2.8,BX:-2.8,BY:8.0,GX:-3.0,STEP:3.0,RSTEP:3.0,LKN:1.2,LGX:4.0,LGY:2.5,RGX:2.0,RGY:4.5}),
    K(18,state.E_OUT,{HX:0.4,HY:1.4,LEAN:-3.2,BX:-3.8,BY:13.5,GX:-4.0,STEP:5.0,RSTEP:7.5,ST:10,LGX:4.5,LGY:5.5,RGX:2.5,RGY:7.5,SQ:-0.6}),
    K(24,state.E_IO,{HX:0.6,HY:1.6,LEAN:-3.0,BX:-3.8,BY:13.2,GX:-4.0,STEP:5.0,RSTEP:7.5,ST:10,LGX:5.0,LGY:5.0,RGX:3.0,RGY:7.0,SQ:-0.5})
  ],{walk:-1,cancel:999,hold:23,sweat:[1],dust:[3],land:[3]}),

  // S_GETUP (wstawanie z desek)
  MOVE('WSTAJE',[
    K(0,state.E_LIN,{}),
    K(10,state.E_IO,{HX:0.8,HY:1.8,LEAN:2.0,BX:-1.8,BY:9.5,STEP:3.8,RSTEP:1.0,LKN:1.4,ST:12,LGX:7.0,LGY:2.5,RGX:4.2,RGY:3.5}),
    K(22,state.E_IO,{HX:0.4,HY:1.2,LEAN:1.8,BX:-0.4,BY:4.5,STEP:1.5,RSTEP:-0.5,LKN:0.8,ST:16,LGX:7.5,LGY:-2.0,RGX:4.5,RGY:0.5}),
    K(32,state.E_IO,{BY:1.8,LEAN:0.8,LGX:10.5,LGY:-1.0,RGX:4.8,RGY:1.5}),
    K(40,state.E_IO,{})
  ],{walk:-1,cancel:40}),

  // S_KO (ciężki nokaut – upadek na plecy)
  MOVE('KO',[
    K(0,state.E_LIN,{}),
    K(3,state.E_SNAP,{HX:-2.8,HY:-2.0,LEAN:-3.2,BX:-1.5,BY:1.2,ROT:-0.6,GX:-1.0,LGX:3.5,LGY:-5.0,RGX:2.0,RGY:-2.5}),
    K(13,state.E_IN,{HX:-1.8,HY:0.2,LEAN:-5.0,BX:-3.0,BY:9.0,GX:-4.0,STEP:4.0,RSTEP:4.0,LGX:2.0,LGY:-1.5,RGX:1.0,RGY:0.5}),
    K(21,state.E_OUT,{HX:-5.5,HY:7.5,LEAN:-9.0,BX:-4.0,BY:15.0,SQ:-7.0,GX:-5.0,STEP:9.0,RSTEP:9.0,ST:8,LGX:-5.5,LGY:-2.5,RGX:2.5,RGY:1.5}),
    K(28,state.E_OUT,{HX:-6.5,HY:8.5,LEAN:-10.0,BX:-4.0,BY:15.5,SQ:-8.5,GX:-5.0,STEP:10.0,RSTEP:10.0,ST:8,LGX:-8.5,LGY:0.5,RGX:5.0,RGY:3.0}),
    K(36,state.E_IO,{HX:-6.5,HY:8.5,LEAN:-10.0,BX:-4.0,BY:15.5,SQ:-8.5,GX:-5.0,STEP:10.0,RSTEP:10.0,ST:8,LGX:-8.5,LGY:0.5,RGX:5.0,RGY:3.0})
  ],{walk:-1,cancel:9999,hold:35,sweat:[1],dust:[3],land:[3]})
);

state.S_WIN = state.MOVES.length;

state.MOVES.push(
 // victory (reference): a small crouch with the fists at the chest, then up on the toes, both arms thrown up (held)
 MOVE('WYGRANA',[
   K(0,state.E_LIN,{}),
   K(8,state.E_OUT,{BY:3,LEAN:0.6,LGX:5,LGY:-2,RGX:3,RGY:0,HY:1.5,SQ:0.5,ST:18}),
   K(18,state.E_OUT,{BY:-0.5,LEAN:-0.8,HEEL:1.5,LHEEL:1,LGX:3,LGY:-19,RGX:0,RGY:-19,HX:-0.5,HY:-1.5,ST:14,SQ:-0.5}),
   K(26,state.E_IO,{BY:0,LEAN:-0.6,HEEL:1,LHEEL:0.5,LGX:3.5,LGY:-18,RGX:0.5,RGY:-18,HX:-0.5,HY:-1.2,ST:14})
 ],{cancel:9999,hold:25})
);

state.S_HITJ = state.S_FIRST;
state.S_HIT = state.S_FIRST+1;
state.S_HOOKED = state.S_FIRST+2;
state.S_UPPED = state.S_FIRST+3;
state.S_BODY = state.S_FIRST+4;
state.S_BLOCK = state.S_FIRST+5;
state.S_BLOCKHIT = state.S_FIRST+6;
state.S_STAGGER = state.S_FIRST+7;
state.S_KD = state.S_FIRST+8;
state.S_GETUP = state.S_FIRST+9;
state.S_KO = state.S_FIRST+10;

/* DASHES (double-tap a direction): a low springy hop off the back foot (doskok) / front foot (odskok),
   ~13-14 px in 18 ticks. Cancelable on landing, so a doskok flows straight into a punch. */
state.M_DASHF = state.MOVES.length;
state.M_DASHB = state.MOVES.length+1;

state.MOVES.push(
 MOVE('DOSKOK',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{GX:1.5,BY:2.6,LEAN:3,HEEL:1.8,RSTEP:-1.5,RLIFT:0.5,HY:1.2}),
   K(8,state.E_OUT,{GX:9,GY:-1.5,BY:1.2,LEAN:3.8,STEP:1.5,RSTEP:-4.5,LLIFT:1.2,RLIFT:1.5,HEEL:2,HY:1.5}),
   K(12,state.E_IN,{GX:12,BY:2.6,LEAN:1.6,STEP:0.5,RSTEP:-1,HY:1}),
   K(18,state.E_IO,{GX:13,BY:1.3})
 ],{walk:13,hop:1,cancel:12,dust:[1,3],land:[3]}),
 MOVE('ODSKOK',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{GX:-1.5,BY:2.4,LEAN:0,HX:-1,LHEEL:1,LLIFT:0.5,HY:1}),
   K(8,state.E_OUT,{GX:-10,GY:-1.5,BY:1.5,LEAN:-1.8,HX:-1.5,STEP:3.5,RSTEP:-0.5,LLIFT:1.5,RLIFT:1.2,HY:0.5}),
   K(12,state.E_IN,{GX:-13,BY:2.6,LEAN:0.4,STEP:1,HY:1}),
   K(18,state.E_IO,{GX:-14,BY:1.3})
 ],{walk:-14,hop:1,cancel:12,dust:[1,3],land:[3]})
);

// Duck under the guard, drive past on bent knees, then turn and rise into stance.
state.M_PIVOT=state.MOVES.length;
state.MOVES.push(MOVE('PIVOT',[
  K(0,state.E_LIN,{}),
  K(4,state.E_OUT,{BY:7,LEAN:5,HX:2,HY:2.5,ROT:0.7,HROT:0.3,LGX:5,LGY:-6,RGX:3,RGY:-4,LKN:1.5}),
  K(8,state.E_OUT,{BY:7,LEAN:6,HX:2,HY:2.5,ROT:0.8,HROT:0.3,LGX:5,LGY:-6,RGX:3,RGY:-4,STEP:5,RSTEP:-5,LLIFT:1,RLIFT:2,HEEL:1.5,LKN:1.5}),
  K(14,state.E_IO,{BY:6.5,LEAN:4,HX:1,HY:2,ROT:0.6,HROT:0.3,LGX:5,LGY:-6,RGX:3,RGY:-4,STEP:2,RSTEP:-3,LLIFT:2,LHEEL:1}),
  K(18,state.E_IO,{BY:5,LEAN:2,HY:1.5,ROT:-0.8,HROT:-0.6,LGX:5,LGY:-6,RGX:4,RGY:-5,STEP:-3,RSTEP:2,LLIFT:1,HEEL:0.8}),
  K(23,state.E_OUT,{BY:1.5,LEAN:1,ROT:-0.2,HROT:-0.1,STEP:1,LHEEL:0.5}),
  K(30,state.E_IO,{})
],{cancel:30}));

// The opponent steps into the vacated slot, then follows the passing boxer with a late turn.
state.M_PIVOT_TURN=state.MOVES.length;
state.MOVES.push(MOVE('OBRÓT',[
  K(0,state.E_LIN,{}),
  K(7,state.E_LIN,{}),
  K(13,state.E_IO,{BY:2,LEAN:1.5,STEP:2,RSTEP:-4,RLIFT:2,HROT:-0.3}),
  K(20,state.E_IO,{BY:2,STEP:1,RSTEP:-1,ROT:-0.7,HROT:-0.6}),
  K(24,state.E_IO,{BY:1.5,ST:8,HEEL:1,LHEEL:1,ROT:-1,HROT:-0.9,LGX:5,LGY:-6,RGX:4,RGY:-5}),
  K(27,state.E_OUT,{BY:1,ST:10,ROT:0.3,HROT:0.2,STEP:-1,RSTEP:1}),
  K(30,state.E_IO,{})
],{cancel:30}));

/* ---------- PERK MOVES AND REACTIONS (tiers IV–VI) ----------
   Appended after every existing move, so earlier ids and the reaction ranges S_HITJ…S_BLOCKHIT keep their values. */
state.M_SHOVE=state.MOVES.length;
state.MOVES.push(MOVE('ODEPCHNIĘCIE',[
  K(0,state.E_LIN,{}),
  K(5,state.E_OUT,{BY:2,LEAN:2.5,GX:2,STEP:2,RSTEP:-1,LGX:12,LGY:-6,RGX:12,RGY:-4,LGS:0.3,RGS:0.3,HROT:0.3}),
  K(10,state.E_OUT,{BY:1.5,LEAN:3.5,GX:3,STEP:2.5,RSTEP:-2,HEEL:1.5,LGX:17,LGY:-6,RGX:17,RGY:-4,LGS:0.4,RGS:0.4,HROT:0.5}),
  K(16,state.E_IO,{GX:2,LEAN:2,LGX:9,LGY:-6,RGX:7,RGY:-3}),
  K(22,state.E_IO,{})
],{apex:2,special:'shove',cancel:16,dust:[2]}));
state.S_PUSHED=state.MOVES.length;
state.MOVES.push(MOVE('ODEPCHNIĘTY',[
  K(0,state.E_LIN,{}),
  K(4,state.E_OUT,{HX:-1.5,LEAN:-1.8,BX:-1.5,BY:2,GX:-3,STEP:1,LGX:4,LGY:-3,RGX:3,RGY:0,ROT:-0.3}),
  K(12,state.E_IO,{HX:-0.8,LEAN:-0.6,BY:2.4,GX:-8,STEP:-1,RLIFT:1.2,LGX:5,LGY:-4,RGX:3,RGY:-1}),
  K(20,state.E_IO,{GX:-12,BY:1.4})
],{walk:-12,cancel:20,dust:[1,2]}));
state.S_DAZED=state.MOVES.length;
state.MOVES.push(MOVE('OGŁUSZONY',[
  K(0,state.E_LIN,{}),
  K(6,state.E_OUT,{HX:-1,HY:1,LEAN:-1,BY:3,ROT:-0.2,LGX:4,LGY:1,RGX:3,RGY:3,LKN:1}),
  K(18,state.E_IO,{HX:1,HY:2,LEAN:1,BY:4,ROT:0.3,LGX:4,LGY:2,RGX:3,RGY:4,LKN:1.5}),
  K(30,state.E_IO,{HX:-1,HY:1,LEAN:-0.5,BY:3,ROT:-0.3,LGX:4,LGY:1,RGX:3,RGY:3,LKN:0.8}),
  K(42,state.E_IO,{BY:1.5})
],{cancel:42,sweat:[1]}));
state.S_DOUBLED=state.MOVES.length;
state.MOVES.push(MOVE('ZGIĘTY',[
  K(0,state.E_LIN,{}),
  K(3,state.E_OUT,{BY:5,LEAN:4,BX:-1,HX:1.5,HY:3.5,SQ:-1.5,ROT:0.3,GX:-0.5,LGX:4,LGY:3,RGX:3,RGY:4,LKN:1}),
  K(24,state.E_LIN,{BY:5,LEAN:4,BX:-1,HX:1.5,HY:3.5,SQ:-1.5,ROT:0.3,GX:-1.5,LGX:4,LGY:3,RGX:3,RGY:4,LKN:1}),
  K(36,state.E_IO,{BY:2,LEAN:1.5,GX:-1.5,LGX:6,LGY:-2,RGX:4,RGY:0})
],{walk:-1,cancel:36,sweat:[1]}));
state.M_PARRY=state.MOVES.length;
state.MOVES.push(MOVE('PAROWANIE',[
  K(0,state.E_LIN,{}),
  K(2,state.E_SNAP,{LGX:10.5,LGY:-4.2,LFL:0.2,LGS:0.5,ROT:0.35,HROT:0.15,LEAN:0.4,HX:-0.4,HY:0.8,BY:1.2,RGX:4.8,RGY:-4.5}),
  K(6,state.E_OUT,{LGX:8.8,LGY:-2.2,LFL:0.3,LGS:0.6,ROT:0.45,HROT:0.2,LEAN:0.6,HX:-0.4,HY:1.0,BY:1.4,RGX:4.8,RGY:-4.5}),
  K(12,state.E_IO,{})
],{cancel:8}));
state.S_PARRIED=state.MOVES.length;
state.MOVES.push(MOVE('ODBITY',[
  K(0,state.E_LIN,{}),
  K(3,state.E_SNAP,{ROT:-0.75,HROT:-0.35,LEAN:-0.6,HX:-0.8,HY:0.6,BY:1.4,LGX:8.5,LGY:-6.5,LGS:-0.4,RGX:3.8,RGY:-1.5}),
  K(16,state.E_OUT,{ROT:-0.55,HROT:-0.25,LEAN:-0.3,HX:-0.6,HY:0.4,BY:1.2,LGX:8.0,LGY:-5.5,LGS:-0.3,RGX:4.2,RGY:-0.5}),
  K(28,state.E_IO,{})
],{cancel:24}));
state.S_OVERREACH=state.MOVES.length;
state.MOVES.push(MOVE('PRZELOT',[
  K(0,state.E_LIN,{}),
  K(6,state.E_OUT,{LEAN:5,BX:3,GX:3,STEP:3,RSTEP:-1,LLIFT:1,LGX:16,LGY:-1,RGX:5,RGY:2,HX:2,HY:2,LKN:1,ROT:-0.4}),
  K(24,state.E_LIN,{LEAN:4.5,BX:2.5,GX:4,STEP:2,RSTEP:-1.5,LGX:13,LGY:0,RGX:5,RGY:2,HX:2,HY:2,LKN:1,ROT:-0.3}),
  K(36,state.E_IO,{GX:4})
],{walk:4,cancel:36,dust:[1]}));
state.M_ELBOW=state.MOVES.length;
state.MOVES.push(MOVE('ŁOKIEĆ',[
  K(0,state.E_LIN,{}),
  K(4,state.E_IN,{ROT:0.5,HROT:0.2,LGX:4,LGY:-9,LGS:-0.8,BY:1.5}),
  K(8,state.E_OUT,{ROT:-0.9,HROT:-0.5,LEAN:2.5,LGX:9,LGY:-8,LGS:-1,BY:1.5,LHEEL:0.8}),
  K(14,state.E_LIN,{ROT:-0.9,HROT:-0.5,LEAN:2.5,LGX:9,LGY:-8,LGS:-1,BY:1.5,LHEEL:0.8}),
  K(22,state.E_IO,{})
],{apex:2,glove:0,pid:2,special:'elbow',fstep:0,cancel:14,stop:4,shake:1,weight:0.7,sweatHit:2}));
state.M_HEADBUTT=state.MOVES.length;
state.MOVES.push(MOVE('Z BYKA',[
  K(0,state.E_LIN,{}),
  K(5,state.E_IN,{LEAN:-1.2,HX:-1.5,HY:-0.5,BY:2,LGX:6,LGY:-6,RGX:5,RGY:-4}),
  K(10,state.E_OUT,{LEAN:5.5,HX:3,HY:1.5,BX:2,GX:1.5,BY:2,LGX:8,LGY:-4,RGX:6,RGY:-3}),
  K(16,state.E_LIN,{LEAN:5,HX:2.5,HY:1.5,BX:2,GX:1.5,BY:2}),
  K(24,state.E_IO,{})
],{apex:2,special:'headbutt',cancel:16,sweat:[2]}));
state.M_CLINCH=state.MOVES.length;
state.MOVES.push(MOVE('KLINCZ',[
  K(0,state.E_LIN,{}),
  K(6,state.E_OUT,{GX:5,STEP:3,RSTEP:-1,LEAN:4,HX:2,HY:2,BY:2.5,LGX:14,LGY:-9,RGX:12,RGY:-6,LGS:0.6,RGS:0.5}),
  K(40,state.E_LIN,{GX:5,STEP:3,RSTEP:-1,LEAN:4,HX:2,HY:2,BY:2.5,LGX:14,LGY:-9,RGX:12,RGY:-6,LGS:0.6,RGS:0.5}),
  K(48,state.E_IO,{GX:1})
],{walk:1,hold:6,cancel:48}));
state.S_CLINCHED=state.MOVES.length;
state.MOVES.push(MOVE('W KLINCZU',[
  K(0,state.E_LIN,{}),
  K(6,state.E_OUT,{LEAN:3,HX:2,HY:2,BY:2.5,GX:1,LGX:10,LGY:-3,RGX:8,RGY:-1}),
  K(40,state.E_LIN,{LEAN:3,HX:2,HY:2,BY:2.5,GX:1,LGX:10,LGY:-3,RGX:8,RGY:-1}),
  K(48,state.E_IO,{GX:-1})
],{walk:-1,hold:6,cancel:48}));
state.S_SHELL=state.MOVES.length;
state.MOVES.push(MOVE('SKORUPA',[
  K(0,state.E_LIN,{LGX:7.4,LGY:-6.4,RGX:4.8,RGY:-5.4,LFL:0.35,RFL:0.3,HX:-0.4,HY:1.4,BY:1.8,LEAN:0.9,ROT:0.25,LGS:0.25,RGS:0.2}),
  K(5,state.E_OUT,{LGX:5.8,LGY:-6.8,RGX:4.0,RGY:-5.8,LFL:0.5,RFL:0.45,HX:-0.8,HY:2.4,BY:3.2,LEAN:1.8,ROT:0.15,LGS:0.4,RGS:0.35,SQ:-0.6}),
  K(30,state.E_LIN,{LGX:5.8,LGY:-6.8,RGX:4.0,RGY:-5.8,LFL:0.5,RFL:0.45,HX:-0.8,HY:2.4,BY:3.2,LEAN:1.8,ROT:0.15,LGS:0.4,RGS:0.35,SQ:-0.6}),
  K(38,state.E_IO,{})
],{cancel:6,hold:6}));
// charging a power punch: the first (loading) key of the punch, held until release
state.M_WINDUP=state.MOVES.length;
for(const pid of [1,2,3]){ const src=state.MOVES[pid], load=src.keys[1], o={}; for(const k in state.IDX) o[k]=load[state.IDX[k]];
  o.BY+=1; o.LEAN-=0.6; if(pid===1) o.RGX-=1.5; else if(pid===2) o.LGX-=1.5; else o.RGY+=1.5;
  state.MOVES.push(MOVE('ZAMACH '+src.name,[K(0,state.E_LIN,{}),K(8,state.E_IN,o),K(90,state.E_LIN,o)],{hold:8,cancel:0,charge:pid})); }

state.MOVES.forEach((move,id)=>{ move.id=id; });

state.moveRate = 1;

state.posX = 0;
state.walkHeld = -1;

state.IDLE = -1;

// body-shot profile per punch: [knee dip, glove drop, glove x, lean in, heel, glove-y cap]
// the uppercut becomes a short shovel into the belly: the glove waits at the hip, then drives up-and-in to the solar plexus
/* low guard: gloves drop from the face to the ribs and belly, elbows tucked, knees a bit deeper, the chin comes up (exposed) */
state.LOWG_CH = [state.LGX,state.LGY,state.RGX,state.RGY,state.BY,state.LEAN,state.HY,state.HX];
state.LOWG_D = [-1,10,-1.2,9,1,0.6,-1.6,0.6];
state.LOWP = [[2.5,6.5,0,0.8,0,99],[3,6,0,0.8,0,99],[3,7,-0.5,0.5,0,99],[3.5,12,-1,1.2,-1.5,6.5]];

state.FLOW_AMP = 1.3;
state.AMP_IDX = new Uint8Array([state.LEAN,state.ROT,state.BY,state.HEEL,state.HX,state.HY,state.HROT]);
state.AMP_N = 7;

/* Idle retains the eight-step sprite cadence on the existing shared beat clock. */
/* IDLE: planted Victorian guard, a four-beat weight shift and a slower breath.
   Fatigue drops the fists and deepens breathing; injuries retain their irregular wobble.
   The explicitly activated flow footwork above keeps its existing movement. */
state.idleTired = 0;
state.idleHurt = 0;
state.idleClose = 0;
state.idleSeed = 7;

}
