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
  const fr=m.fr||5;
  return Math.min(m.dur,m.id>=0&&m.id<=3&&!events?t+fr:(Math.floor(t/fr)+1)*fr);
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
    const k=Math.min(1.8,(sparringState.bareknuckle?1.15:1)*(1+0.8*Math.max(0,1-F.hp/F.hpMax))), kb=1+(k-1)*0.35;
    for(const c of [state.HX,state.HY]) out[c]=state.GUARD[c]+(out[c]-state.GUARD[c])*k;
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

/* Keyframe times are 60 Hz ticks. Punch poses update every tick; events retain the 5-tick grid. */
state.MOVES = [
 // Victorian jab: linear piston strike from the long guard; lead foot steps in, chin stays protected behind the shoulder.
 MOVE('JAB',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{LGX:15.8,LGY:-0.5,ROT:-0.25,LEAN:0.2,BX:-0.5,HX:-0.1,HY:0,RGX:4.6,RGY:4.8,HROT:-0.05,STEP:0.3}),
   K(5,state.E_OUT,{LGX:17.5,LGY:-2.8,ROT:-0.45,LEAN:0.35,BX:-0.2,HX:-0.2,HY:0,RGX:4.2,RGY:5.2,HROT:-0.1,STEP:0.7}),
   K(6,state.E_OUT,{LGX:18.2,LGY:-3.5,ROT:-0.55,LEAN:0.45,BX:0,HX:-0.3,HY:0,RGX:4.0,RGY:5.4,HROT:-0.15,STEP:0.8}),
   K(9,state.E_OUT,{LGX:15.0,LGY:0.6,ROT:-0.2,LEAN:0.1,BX:-0.5,HX:-0.1,HY:0,RGX:4.6,RGY:4.6,STEP:0.3}),
   K(14,state.E_IO,{})
 ],{apex:3,glove:0,fstep:1,twist:0.006,cancel:9,imp:0.0024,dent:1.6,stop:2,shake:0,weight:0.45,fr:3,smear:[2]}),
 MOVE('CROSS',[
   K(0,state.E_LIN,{}),
   // Victorian cross-counter: coil onto the rear foot and load hips and shoulders.
   K(5,state.E_IN,{ROT:-0.35,LEAN:-0.5,BY:0.8,BX:-0.6,RGX:3.5,RGY:4.2,LGX:11.5,LGY:3.0,HY:0.4,HROT:-0.25}),
   // drive: rear heel turns and lifts, hip drives through, right shoulder powers forward
   K(10,state.E_OUT,{ROT:0.5,LEAN:3.8,BX:0.6,BY:1.4,RGX:11.8,RGY:-1.0,HEEL:2.2,HROT:0.65,LGX:6.5,LGY:3.8,HY:0.6}),
   // apex: full extension into the head/jaw; lead fist tightly guards the solar plexus
   K(15,state.E_OUT,{ROT:1.15,LEAN:7.2,BX:1.2,BY:1.8,RGX:18.5,RGY:-2.5,HEEL:3.5,HROT:1.0,LGX:4.0,LGY:4.8,HX:0.2,HY:0.8}),
   // active recovery begins immediately rather than freezing in an over-extended dive
   K(22,state.E_OUT,{ROT:0.75,LEAN:4.8,BX:0.8,BY:1.4,RGX:14.5,RGY:-0.5,HEEL:2.0,HROT:0.6,LGX:6.5,LGY:3.8,HY:0.5}),
   // settling hips and shoulders on return
   K(28,state.E_IO,{ROT:0.25,LEAN:1.8,BX:0.2,BY:0.8,RGX:8.5,RGY:1.5,HEEL:0.8,HROT:0.2,LGX:10.0,LGY:3.0}),
   K(34,state.E_IO,{})
 ],{apex:3,glove:1,fstep:2,twist:0.014,cancel:22,imp:0.0045,dent:2.5,stop:5,shake:1,axis:0,weight:0.8,sweatHit:3,smear:[2,3],dust:[2]}),
 // HOOK: a sharp load — a slight knee dip, chin tucked to the chest, weight onto the lead leg, glove cocked beside the
 // chin — then the hips fire first and the shoulders whip after them; the arm stays bent at ninety degrees, elbow up and
 // forearm level with the ground at jaw height, the lead heel rises and spins out and the chin stays down through impact
 MOVE('HOOK',[
   K(0,state.E_LIN,{}),
   K(5,state.E_OUT,{BY:0.9,BX:-0.5,LEAN:0.4,ROT:0.25,HROT:0.1,HX:0.5,HY:1,LGX:8,LGY:-1.5,LFL:-0.2,RGX:4.5,RGY:-0.5,LKN:-0.2,HEEL:0.2}),
   K(8,state.E_OUT,{BY:1.8,BX:0,LEAN:1,ROT:0.6,HROT:0.3,HX:0.9,HY:1.8,LGX:5,LGY:-2.5,LFL:-0.5,LGS:-0.2,RGX:4.5,RGY:-1.5,LKN:-0.5,HEEL:0.4}),
   K(12,state.E_IO,{BY:2.3,BX:0.3,LEAN:1.4,ROT:0.7,HROT:-0.15,HX:1,HY:2,LGX:4.5,LGY:-3,LFL:-0.6,LGS:-0.2,RGX:4.5,RGY:-2,LHEEL:0.5,LKN:-0.2,HEEL:0.4}),
   K(15,state.E_OUT,{BY:1.2,BX:0.6,LEAN:2.6,ROT:-1.5,HROT:-0.95,HX:0.6,HY:1.6,LGX:10.5,LGY:-4.2,LFL:-0.6,LGS:1.4,RGX:4.5,RGY:-2,LHEEL:2,LKN:1.4}),
   K(20,state.E_OUT,{BY:1.3,BX:0.6,LEAN:2.6,ROT:-1.75,HROT:-1.05,HX:0.4,HY:1.6,LGX:9.5,LGY:-3.6,LFL:-0.6,LGS:1.6,RGX:4.5,RGY:-2,LHEEL:2.1,LKN:1.5}),
   K(26,state.E_IO,{BY:0.6,LEAN:1,ROT:-0.4,HROT:-0.25,HY:0.6,LGX:10,LGY:-0.5,LFL:-0.2,LGS:0.3,RGX:5,RGY:0,LHEEL:0.5,LKN:0.3}),
   K(32,state.E_IO,{})
 ],{apex:4,glove:0,fstep:1,twist:-0.07,cancel:22,imp:0.005,dent:3,stop:7,shake:2,axis:0,weight:1,sweatHit:4,smear:[3,4,5],dust:[4]}),
 // UPPERCUT: no squat — a short dip with the rear shoulder dropped and wound back, then the hips and shoulders turn
 // through (slow start, violent end) and the bent arm rips straight up the middle, elbow under the glove, onto the rear toes
 MOVE('UPPERCUT',[
   K(0,state.E_LIN,{}),
   K(5,state.E_IN,{ROT:-0.55,HROT:-0.4,BY:2.2,LEAN:1.2,BX:-0.3,RGX:5,RGY:2.5,HY:1.4,HX:0.4,LGX:6,LGY:-6}),
   K(9,state.E_IO,{ROT:-0.8,HROT:-0.55,BY:2.8,LEAN:1,BX:-0.5,RGX:5.5,RGY:4,HY:1.8,HX:0.6,LGX:6,LGY:-6.5}),
   K(13,state.E_IN,{ROT:0.6,HROT:0.5,BY:1.8,LEAN:2.6,BX:1.4,RGX:9,RGY:-2,HEEL:2,HY:0.8,LGX:5,LGY:-6.5}),
   K(15,state.E_OUT,{ROT:1.5,HROT:1.05,BY:0.6,LEAN:3.6,BX:3,RGX:10.5,RGY:-9.5,HEEL:3.6,HX:1,HY:-0.6,LGX:5,LGY:-6.5}),
   K(19,state.E_LIN,{ROT:1.6,HROT:1.1,BY:0.4,LEAN:3.7,BX:3.2,RGX:10,RGY:-10.5,HEEL:3.6,HX:1,HY:-0.8,LGX:5,LGY:-6.5}),
   K(25,state.E_IO,{ROT:0.4,HROT:0.3,BY:1,LEAN:2,BX:0.8,RGX:7,RGY:-5,HEEL:1}),
   K(31,state.E_IO,{})
 ],{apex:4,glove:1,fstep:1,twist:0.012,cancel:21,imp:0.0035,dent:2.4,stop:6,shake:2,axis:1,lift:2,rise:1,weight:1,sweatHit:4,smear:[3,4],dust:[4]}),
 MOVE('DODGE',[
   K(0,state.E_LIN,{}),
   K(5,state.E_OUT,{BY:4,LEAN:-1.5,HX:-1,HY:1,LGX:5,LGY:-5,RGX:4,RGY:-4}),
   K(10,state.E_IO,{BY:6,LEAN:0,HY:1.5,LGX:5,LGY:-5,RGX:4,RGY:-4}),
   K(15,state.E_IO,{BY:4,LEAN:2,HX:1,HY:1,LGX:6,LGY:-5,RGX:4,RGY:-4}),
   K(20,state.E_IO,{BY:2,LEAN:1.5}),
   K(25,state.E_IO,{})
 ],{fstep:-3,cancel:20,sweat:[1],dust:[1]}),
 // SLIP LEFT (outside): head snaps over the lead knee, rear shoulder rolls through, springs back past centre
 MOVE('SLIP L',[
   K(0,state.E_LIN,{}),
   K(4,state.E_OUT,{BY:4,LEAN:4.5,BX:2,HX:2,HY:2,ROT:0.7,HROT:0.3,LGX:5,LGY:-6,RGX:3,RGY:-4}),
   K(9,state.E_LIN,{BY:4.5,LEAN:5,BX:2.5,HX:2,HY:2,ROT:0.8,HROT:0.3,LGX:5,LGY:-6,RGX:3,RGY:-4}),
   K(15,state.E_OUT,{BY:0.6,LEAN:0,BX:-0.5,HX:-0.5,ROT:-0.2}),
   K(22,state.E_IO,{})
 ],{cancel:15,sweat:[1],dust:[1],headSmear:[1,3]}),
 // SLIP RIGHT (inside): head snaps back over the rear knee, lead shoulder rolls in, springs back
 MOVE('SLIP R',[
   K(0,state.E_LIN,{}),
   K(4,state.E_OUT,{BY:4,LEAN:-3.5,BX:-2,HX:-2,HY:2,ROT:-0.8,HROT:-0.3,LGX:6,LGY:-5,RGX:3,RGY:-3}),
   K(9,state.E_LIN,{BY:4.5,LEAN:-4,BX:-2.5,HX:-2,HY:2,ROT:-0.9,HROT:-0.3,LGX:6,LGY:-5,RGX:3,RGY:-3}),
   K(15,state.E_OUT,{BY:0.6,LEAN:1.8,BX:0.6,HX:0.5,ROT:0.2}),
   K(22,state.E_IO,{})
 ],{cancel:15,sweat:[1],dust:[1],headSmear:[1,3]}),
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
 // light straight to the face: chin snaps back, half a step of slide
 MOVE('TRAFIONY',[
   K(0,state.E_LIN,{}),
   K(2,state.E_OUT,{HX:-3.2,HY:-1.2,LEAN:-0.2,BX:-0.9,BY:1.4,ROT:-0.45,GX:-0.5,LGX:6,LGY:-6,RGX:3,RGY:-2}),
   K(6,state.E_OUT,{HX:-1.6,HY:-0.3,LEAN:0.3,BX:-0.6,BY:1.6,ROT:-0.2,GX:-1.1}),
   K(10,state.E_IO,{HX:-0.6,LEAN:0.7,BY:1.6,GX:-1.5,RSTEP:-0.5}),
   K(16,state.E_IO,{GX:-1.5})
 ],{walk:-1,cancel:11,sweat:[1],fr:2,headSmear:[1]}),
 // heavy straight: head whips back, shoulders open, a reeling step back
 MOVE('TRAFIONY!',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{HX:-3.6,HY:-1.8,LEAN:-1.7,BX:-1.5,BY:1.2,ROT:-0.65,HROT:-0.3,GX:-1,LGX:4,LGY:-8,RGX:2,RGY:-4}),
   K(10,state.E_OUT,{HX:-2,HY:-0.5,LEAN:-0.8,BX:-1,BY:2.2,ROT:-0.3,GX:-2.5,STEP:1.5,RSTEP:-1.5,RLIFT:1,LGX:5,LGY:-7,RGX:3,RGY:-3}),
   K(17,state.E_IO,{HX:-0.5,LEAN:0.5,BY:2,GX:-3.5,STEP:0.5,LLIFT:0.8,LKN:0.5}),
   K(24,state.E_IO,{GX:-3.5})
 ],{walk:-1,cancel:18,sweat:[1],dust:[2],fr:2,headSmear:[1]}),
 // hook to the head: head knocked down and across, shoulders spun open, lead glove flung low
 MOVE('HAK NA GŁOWĘ',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{HX:-2,HY:3.2,LEAN:-1.3,BX:-1.2,BY:2.2,ROT:1.25,HROT:0.6,GX:-0.7,LGX:3,LGY:-1,RGX:4,RGY:-5,LKN:0.7}),
   K(10,state.E_OUT,{HX:-1.5,HY:1.5,LEAN:-0.5,BY:3,ROT:0.6,HROT:0.3,GX:-2,RSTEP:-1,LGX:4,LGY:-3,RGX:4,RGY:-4}),
   K(17,state.E_IO,{HX:-0.5,HY:0.5,LEAN:0.5,BY:2,ROT:0.1,GX:-2.5}),
   K(24,state.E_IO,{GX:-2.5})
 ],{walk:-1,cancel:18,sweat:[1],fr:2,headSmear:[1]}),
 // uppercut: chin snaps up, body lifts onto the toes, then settles back
 MOVE('PODBRÓDEK',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{HX:-2.4,HY:-3.8,LEAN:-2.8,BX:-1,BY:-0.9,HEEL:1.6,LHEEL:1.1,GX:-0.5,LGX:5,LGY:-9,RGX:3,RGY:-6,SQ:1}),
   K(10,state.E_OUT,{HX:-2,HY:-1.5,LEAN:-1.5,BY:1.5,GX:-2.5,RSTEP:-1.5,RLIFT:1,LGX:5,LGY:-7,RGX:3,RGY:-3}),
   K(17,state.E_IO,{HX:-0.5,LEAN:0.3,BY:2.2,GX:-3}),
   K(24,state.E_IO,{GX:-3})
 ],{walk:-1,cancel:18,sweat:[1],fr:2,headSmear:[1]}),
 // body shot: folds over the punch, elbows collapse onto the ribs
 MOVE('NA KORPUS',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{BY:3.5,LEAN:2.5,BX:-1.5,HX:1,HY:2.5,SQ:-1,ROT:0.3,GX:-0.5,LGX:5,LGY:1,RGX:4,RGY:3,LKN:0.8}),
   K(12,state.E_IO,{BY:3.5,LEAN:2,BX:-1,HX:0.8,HY:2,SQ:-0.8,GX:-2,RSTEP:-1,LGX:5,LGY:0,RGX:4,RGY:2}),
   K(19,state.E_IO,{BY:2,LEAN:1.3,HY:1,GX:-2.5,LGX:6,LGY:-3,RGX:4,RGY:0}),
   K(26,state.E_IO,{GX:-2.5})
 ],{walk:-1,cancel:20}),
 // high guard: both gloves shell the face, chin down (held while blocking)
 MOVE('BLOK',[
   K(0,state.E_LIN,{}),
   K(5,state.E_OUT,{LGX:6,LGY:-9,RGX:6,RGY:-7,HX:-0.5,HY:1.5,BY:2,LEAN:0.8,ROT:0.2,LGS:0.3,RGS:0.2}),
   K(30,state.E_LIN,{LGX:6,LGY:-9,RGX:6,RGY:-7,HX:-0.5,HY:1.5,BY:2,LEAN:0.8,ROT:0.2,LGS:0.3,RGS:0.2}),
   K(38,state.E_IO,{})
 ],{cancel:6,hold:6}),
 // punch caught on the gloves: guard is driven back into the face, short slide
 MOVE('BLOK!',[
   K(0,state.E_LIN,{}),
   K(3,state.E_OUT,{LGX:4,LGY:-9,RGX:4.5,RGY:-7,HX:-1.5,HY:1.5,BY:2.4,LEAN:-0.2,BX:-1,ROT:0.2,GX:-1,LGS:0.3,RGS:0.2}),
   K(9,state.E_IO,{LGX:5.5,LGY:-9,RGX:5.5,RGY:-7,HX:-0.8,HY:1.5,BY:2.2,LEAN:0.5,GX:-1.5,LGS:0.3,RGS:0.2}),
   K(14,state.E_IO,{LGX:6,LGY:-9,RGX:6,RGY:-7,HX:-0.5,HY:1.5,BY:2,LEAN:0.8,ROT:0.2,GX:-1.5,LGS:0.3,RGS:0.2})
 ],{walk:-1,cancel:8}),
 // stagger: rubber legs, two stumbling steps back, hands low (wide open)
 MOVE('ZAMROCZONY',[
   K(0,state.E_LIN,{}),
   K(4,state.E_OUT,{HX:-2.5,HY:-1,LEAN:-2,BX:-1.5,BY:2,ROT:-0.5,GX:-1,LGX:4,LGY:-1,RGX:3,RGY:2}),
   K(14,state.E_IO,{HX:1,HY:2,LEAN:1.5,BX:0.5,BY:4,ROT:0.4,GX:-3,STEP:2,RSTEP:-2,LKN:1.5,LGX:4,LGY:1,RGX:3,RGY:3}),
   K(26,state.E_IO,{HX:-1.5,HY:0.5,LEAN:-1,BX:-1,BY:3,ROT:-0.3,GX:-5,STEP:-1,RLIFT:1.2,LGX:5,LGY:-1,RGX:3,RGY:2}),
   K(38,state.E_IO,{HX:0.5,HY:1.5,LEAN:1,BY:3,GX:-6,LKN:0.8,LGX:6,LGY:-3,RGX:4,RGY:0}),
   K(50,state.E_IO,{GX:-6})
 ],{walk:-1,cancel:44,sweat:[1,3],dust:[2,3]}),
 // knockdown: head snaps, knees go, sits down hard on the canvas (held for the count)
 MOVE('NOKDAUN',[
   K(0,state.E_LIN,{}),
   K(4,state.E_OUT,{HX:-3,HY:-2,LEAN:-3,BX:-1.5,BY:1.5,ROT:-0.5,GX:-1,LGX:3,LGY:-3,RGX:2,RGY:0}),
   K(12,state.E_IN,{HX:-1,HY:0,LEAN:-3.5,BX:-3,BY:8,GX:-3,STEP:3,RSTEP:3,LKN:1,LGX:3,LGY:3,RGX:1,RGY:5}),
   K(18,state.E_OUT,{HX:0,HY:1,LEAN:-4,BX:-4,BY:14,GX:-4,STEP:5,RSTEP:8,ST:10,LGX:4,LGY:6,RGX:2,RGY:8,SQ:-0.5}),
   K(24,state.E_IO,{HX:0.5,HY:1.5,LEAN:-3.5,BX:-4,BY:13.5,GX:-4,STEP:5,RSTEP:8,ST:10,LGX:5,LGY:5,RGX:3,RGY:7})
 ],{walk:-1,cancel:999,hold:23,sweat:[1],dust:[3],land:[3]}),
 // get up: rolls onto a knee, pushes up, guard comes back
 MOVE('WSTAJE',[
   K(0,state.E_LIN,{}),
   K(10,state.E_IO,{HX:1,HY:2,LEAN:2,BX:-2,BY:10,STEP:4,RSTEP:1,LKN:1.5,ST:10,LGX:7,LGY:3,RGX:4,RGY:4}),
   K(22,state.E_IO,{HX:0.5,HY:1.5,LEAN:2,BX:-0.5,BY:5,STEP:1.5,RSTEP:-0.5,LKN:0.8,LGX:6,LGY:-2,RGX:4,RGY:1}),
   K(32,state.E_IO,{BY:2,LEAN:1.2,LGX:6,LGY:-4,RGX:4,RGY:-1}),
   K(40,state.E_IO,{})
 ],{walk:-1,cancel:40}),
 // KO: head snaps, legs fold, slams flat onto the back, arms splayed (held)
 MOVE('KO',[
   K(0,state.E_LIN,{}),
   K(4,state.E_OUT,{HX:-3,HY:-2.5,LEAN:-3.5,BX:-1.5,BY:1,ROT:-0.6,GX:-1,LGX:2,LGY:-6,RGX:1,RGY:-3}),
   K(14,state.E_IN,{HX:-2,HY:0,LEAN:-5,BX:-3,BY:9,GX:-4,STEP:4,RSTEP:4,LGX:1,LGY:-2,RGX:0,RGY:0}),
   K(22,state.E_OUT,{HX:-6,HY:8,LEAN:-9,BX:-4,BY:15,SQ:-7,GX:-5,STEP:9,RSTEP:9,ST:8,LGX:-6,LGY:-3,RGX:2,RGY:1}),
   K(28,state.E_OUT,{HX:-7,HY:9,LEAN:-10,BX:-4,BY:15.5,SQ:-8.5,GX:-5,STEP:10,RSTEP:10,ST:8,LGX:-9,LGY:0,RGX:5,RGY:3}),
   K(36,state.E_IO,{HX:-7,HY:9,LEAN:-10,BX:-4,BY:15.5,SQ:-8.5,GX:-5,STEP:10,RSTEP:10,ST:8,LGX:-9,LGY:0,RGX:5,RGY:3})
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
  K(3,state.E_OUT,{LGX:9,LGY:-8,LGS:0.6,ROT:0.3,HX:-0.5,BY:1.5}),
  K(7,state.E_OUT,{LGX:8,LGY:-12,LGS:0.9,ROT:0.4,HX:-0.5,BY:1.5}),
  K(12,state.E_IO,{})
],{cancel:9}));
state.S_PARRIED=state.MOVES.length;
state.MOVES.push(MOVE('ODBITY',[
  K(0,state.E_LIN,{}),
  K(4,state.E_OUT,{ROT:-0.8,HROT:-0.4,LEAN:-0.5,HX:-1,LGX:9,LGY:-13,LGS:-0.6,RGX:3,RGY:0}),
  K(18,state.E_LIN,{ROT:-0.7,HROT:-0.3,LEAN:-0.3,HX:-1,LGX:8,LGY:-12,LGS:-0.5,RGX:3,RGY:0}),
  K(30,state.E_IO,{})
],{cancel:28}));
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
  K(0,state.E_LIN,{LGX:6,LGY:-9,RGX:6,RGY:-7,HX:-0.5,HY:1.5,BY:2,LEAN:0.8,ROT:0.2,LGS:0.3,RGS:0.2}),
  K(6,state.E_OUT,{LGX:4.5,LGY:-10,RGX:4.5,RGY:-8.5,HX:-1,HY:2.8,BY:3.2,LEAN:1.6,ROT:0.1,LGS:0.5,RGS:0.4,SQ:-0.6}),
  K(30,state.E_LIN,{LGX:4.5,LGY:-10,RGX:4.5,RGY:-8.5,HX:-1,HY:2.8,BY:3.2,LEAN:1.6,ROT:0.1,LGS:0.5,RGS:0.4,SQ:-0.6}),
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
