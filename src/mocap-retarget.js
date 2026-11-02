/**
 * Debug-only retarget of a captured clip (scripts/mixamo-to-clip.py) onto Roadwork's fixed-length rig.
 * The clip stores joint POINTS; here the points only choose directions and extensions, while every bone
 * keeps its RIG length: spine/neck/shoulder/hip by direction, arms and legs through the shared two-bone IK.
 * Presentation only — nothing here feeds hit ranges, footwork or any clock.
 */
import {RIG} from './fighter-rig.js';
import {solveLimb,ARM_UPPER,ARM_FORE} from './combat-anatomy.js';

/** @typedef {number[]} V3 */
/** @typedef {{format:string,fps:number,source?:string,frames:Record<string,V3>[]}} MocapClip */

const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const len=(a)=>Math.hypot(a[0],a[1],a[2]);
const unit=(a)=>mul(a,1/(len(a)||1));
const mid=(a,b)=>mul(add(a,b),0.5);
const lerp=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
const LEG=RIG.legUpper+RIG.legLower, ARM=ARM_UPPER+ARM_FORE;

/** Seconds a clip lasts. @param {MocapClip} clip */
export function clipDuration(clip){ return (clip.frames.length-1)/clip.fps; }

/** The clip's frame at `time` seconds (linear between captured frames; clamped, or wrapped when `loop`).
 * @param {MocapClip} clip @param {number} time @param {boolean} [loop] @returns {Record<string,V3>} */
export function sampleClip(clip,time,loop=false){
  const n=clip.frames.length, d=clipDuration(clip)||1e-9;
  const u=loop?((time%d)+d)%d:Math.max(0,Math.min(d,time));
  const x=u*clip.fps, i=Math.min(n-1,Math.floor(x)), j=Math.min(n-1,i+1), k=x-i, a=clip.frames[i], b=clip.frames[j];
  /** @type {Record<string,V3>} */ const out={};
  for(const key of Object.keys(a))out[key]=lerp(a[key],b[key],k);
  return out;
}

/** Retargeting scales measured once per clip, from its first frame. @param {Record<string,V3>} p */
export function clipScales(p){
  const arm=(s)=>len(sub(p['el'+s],p['sh'+s]))+len(sub(p['hd'+s],p['el'+s]));
  const leg=(s)=>len(sub(p['kn'+s],p['hip'+s]))+len(sub(p['an'+s],p['kn'+s]));
  return {arm:(arm('L')+arm('R'))/2, leg:(leg('L')+leg('R'))/2};
}

/**
 * Joints for one captured frame, in the shape `fighterJoints` returns: `J(side)` plus `.pel .abd .chest .head`.
 * @param {Record<string,V3>} p captured points (fighter frame: x forward, y left, z up, ankle floor = 0)
 * @param {{arm:number,leg:number}} sc from clipScales
 * @param {'L'|'R'} [plus] which captured hand is rig side +1
 */
export function retargetFrame(p,sc,plus='L'){
  const kl=LEG/sc.leg, ka=ARM/sc.arm, minus=plus==='L'?'R':'L';
  const T=(v)=>[v[0]*kl,v[1]*kl,RIG.footHeight+v[2]*kl];   // legs and pelvis: absolute, so planted feet stay planted
  const hipsMid=mid(p.hipL,p.hipR), pelT=T(p.pel);
  const pel=[pelT[0],pelT[1],T(hipsMid)[2]-RIG.hipHeight];
  const shMid=mid(p.shL,p.shR);
  const abd=add(pel,mul(unit(sub(p.abd,p.pel)),RIG.lowerSpine));
  const chest=add(abd,mul(unit(sub(shMid,p.abd)),RIG.upperSpine));
  const head=add(chest,mul(unit(sub(p.head,shMid)),RIG.neckToHead));
  const shAxis=unit(sub(p['sh'+plus],p['sh'+minus])), hipAxis=unit(sub(p['hip'+plus],p['hip'+minus]));
  const J={};
  for(const s of [-1,1]){
    const m=s>0?plus:minus;
    const hip=add(add(pel,[0.27,0,RIG.hipHeight]),mul(hipAxis,s*RIG.hipHalf));
    const sh=add(add(chest,[-0.2,0,RIG.shoulderHeight]),mul(shAxis,s*RIG.shoulderHalf));
    const reach=sub(p['hd'+m],p['sh'+m]), ext=Math.min(0.995,len(reach)/sc.arm);
    const [el,hd]=solveLimb(sh,add(sh,mul(unit(reach),ext*ARM)),ARM_UPPER,ARM_FORE,add(sh,mul(sub(p['el'+m],p['sh'+m]),ka)));
    const [knee,foot]=solveLimb(hip,T(p['an'+m]),RIG.legUpper,RIG.legLower,T(p['kn'+m]));
    J[s]={hip,knee,foot,sh,el,hd,heelLift:0};
  }
  const f=(s)=>J[s];
  f.pel=pel;f.abd=abd;f.chest=chest;f.head=head;
  return f;
}

/** Joints of `clip` at `time`, ready for figureHD. @param {MocapClip} clip @param {number} time @param {{loop?:boolean,plus?:'L'|'R'}} [o] */
export function mocapJoints(clip,time,o={}){
  return retargetFrame(sampleClip(clip,time,o.loop),clipScales(clip.frames[0]),o.plus);
}
