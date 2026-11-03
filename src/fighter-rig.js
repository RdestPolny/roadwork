/**
 * Biomechanical standing rig for all 432x288 isometric fights.
 *
 * This module owns JOINT ANCHORS, not gameplay: no distances used for damage,
 * hit detection, movement, stamina or knockdown timing change.
 * +x forward, +/-y fighter sides, +z upward (legacy body units).
 *
 * Physical segment lengths are constant in every standing pose. A punch rotates
 * shoulder/hip sockets around their respective spine joints; it never pulls
 * the chest, neck or hips apart as if they were unrelated animation controls.
 *
 * Proportions are the game's stylized figure (short legs, a long trunk, a big
 * head), not a real human's. Each rig joint still has one mocap bone
 * (MOCAP_JOINTS), so a clip retargets onto these bones by their angles.
 */
export const RIG=Object.freeze({
  pelvisHeight:6.6, hipHeight:0.3, hipHalf:1.38,
  lowerSpine:2.68, upperSpine:2.94, shoulderHalf:2.40, shoulderHeight:0.2,
  neckToHead:3.4, legUpper:3.2, legLower:3.2,
  footHeight:0.9, minimumFootClearance:0.05
});

/** The rig's joints and the mocap bones (CMU names; Mixamo adds a "mixamorig:" prefix and Spine2) they read.
 *  Side joints take the Left/Right bone of their side; clavicles, toes and fingers stay inside the drawn surfaces. */
export const MOCAP_JOINTS=Object.freeze({
  pel:'Hips', abd:'Spine', chest:'Spine1', head:'Head',
  hip:'UpLeg', knee:'Leg', foot:'Foot', sh:'Arm', el:'ForeArm', hd:'Hand'
});

import {ARM_UPPER,ARM_FORE,solveLimb} from './combat-anatomy.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const length=(v)=>Math.hypot(v[0],v[1],v[2]);
const move=(a,v,d)=>{const r=length(v)||1;return [a[0]+v[0]*d/r,a[1]+v[1]*d/r,a[2]+v[2]*d/r];};

/** Anatomical half-pelvis socket. Keep the visual hips symmetric about the pelvis,
 * even when hips counter-rotate against shoulders. */
export function hipSocket(pelvis,side,yaw){
  const s=side<0?-1:1,a=clamp(yaw,-1.35,1.35);
  return [pelvis[0]+0.27-s*RIG.hipHalf*Math.sin(a),
    pelvis[1]+s*RIG.hipHalf*Math.cos(a),pelvis[2]+RIG.hipHeight];
}

/** Arm socket on a ribcage, with an optional independent shrug on the punching side.
 * No world-space reattachment: shoulders always follow the chest joint. */
export function shoulderSocket(chest,side,yaw,shrug=0){
  const s=side<0?-1:1,a=clamp(yaw,-1.35,1.35);
  return [chest[0]-0.2-s*RIG.shoulderHalf*Math.sin(a),
    chest[1]+s*RIG.shoulderHalf*Math.cos(a),
    chest[2]+RIG.shoulderHeight+clamp(shrug,-0.35,0.95)];
}

/** Limit pelvis HEIGHT before two-bone IK. Horizontal drift during very fast dashes
 * is handled separately by fitPlantedFoot so the entire body does not collapse. */
export function supportPelvis(target,feet,hipYaw){
  let cap=target[2], any=false;
  const maxLength=RIG.legUpper+RIG.legLower-0.055;
  for(const side of [-1,1]){
    const hip=hipSocket(target,side,hipYaw), foot=feet[side];
    if(!foot || foot[2]>RIG.footHeight+0.12)continue; // airborne leg cannot support body weight
    const xy2=(hip[0]-foot[0])**2+(hip[1]-foot[1])**2;
    if(xy2>maxLength*maxLength)continue; // dash: visual foot catches up instead
    const maxZ=foot[2]-RIG.hipHeight+Math.sqrt(maxLength*maxLength-xy2);
    cap=Math.min(cap,maxZ);any=true;
  }
  // Keep pelvis grounded in a deep squat even if a distant dash foot is a stale anchor.
  return [target[0],target[1],any?Math.max(3.85,cap):target[2]];
}

/** With a planted shoe the leg must reach the GROUND, not stop in mid-air.
 * Only when footwork/dash temporarily outruns the bone can the visible shoe
 * slide towards the hip. The simulation's original foot anchor is untouched.
 * The projection is continuous at the reach boundary (no snap). */
export function fitPlantedFoot(hip,foot){
  const vertical=hip[2]-foot[2], maxLength=RIG.legUpper+RIG.legLower-0.055;
  const horizontal=Math.hypot(foot[0]-hip[0],foot[1]-hip[1]);
  const maxHorizontal=Math.sqrt(Math.max(0,maxLength*maxLength-vertical*vertical));
  if(horizontal<=maxHorizontal || horizontal<1e-8)return [...foot];
  const k=maxHorizontal/horizontal;
  return [hip[0]+(foot[0]-hip[0])*k,hip[1]+(foot[1]-hip[1])*k,foot[2]];
}

/** Always bend the knee towards the front of the boxer, not backwards through
 * the thigh, with a little side-specific clearance for the other knee. */
export function kneePole(hip,foot,side){
  const s=side<0?-1:1;
  return [0.52*(hip[0]+foot[0])+1.8,
    (hip[1]+foot[1])*0.5+s*0.42,
    (hip[2]+foot[2])*0.5-0.15];
}

/** Two spinal links; forward bend and abdominal compression are rotations of
 * fixed-length segments rather than uncontrolled screen-space translations.
 * As the abdomen retreats, the ribs fold over it in an actual articulated arc.
 */
export function buildSpine(pelvis,{lean=0,sideLean=0,fold=0,foldSide=0,lunge=0}={}){
  const l=clamp(lean,-3.5,4.0),s=clamp(sideLean,-3.0,3.0),f=clamp(fold,0,1.15),fs=clamp(foldSide,-1,1);
  const lower=[0.075+0.115*l+0.028*lunge-0.19*f,0.045*s-0.055*f*fs,1];
  const upper=[0.105+0.135*l+0.042*lunge+0.34*f,0.06*s+0.065*f*fs,1];
  const abdomen=move(pelvis,lower,RIG.lowerSpine);
  const chest=move(abdomen,upper,RIG.upperSpine);
  return {pelvis:[...pelvis],abdomen,chest};
}

/** A short neck with a fixed attachment to the ribcage. Head hints still
 * provide slipping, shock and chin-tuck, but cannot dislocate the skull. */
export function headSocket(chest,hint){
  const vx=clamp(hint[0]-chest[0],-0.9,0.9);
  const vy=clamp(hint[1]-chest[1],-0.75,0.75);
  const vz=Math.max(2.5,hint[2]-chest[2]);
  return move(chest,[vx,vy,vz],RIG.neckToHead);
}

/** Grounded leg chain inputs with fixed hip width and knee-pole handedness.
 * The existing two-bone IK solver owns the actual knee positions. */
export function legAnchors(pelvis,feet,hipYaw){
  const out={};
  for(const s of [-1,1]){
    const hip=hipSocket(pelvis,s,hipYaw),foot=fitPlantedFoot(hip,feet[s]);
    out[s]={hip,foot,pole:kneePole(hip,foot,s)};
  }
  return out;
}

/** Project a skeletal link onto its true bone length. Used when a ragdoll
 * interpolates back into its stance: ordinary lerp would visibly shrink it.
 * Fallback follows the source pose's up-axis in the degenerate case. */
export function fixBoneLength(from,to,boneLength,axis=[0,0,1]){
  const dir=[to[0]-from[0],to[1]-from[1],to[2]-from[2]];
  return move(from,length(dir)<1e-6?axis:dir,boneLength);
}

const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const half=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];

/**
 * Any figure pose (hand-written NPC poses, ragdolls, the fight rig, mocap) on the rig's proportions, the way a mocap clip is
 * retargeted: every bone keeps its direction and takes the rig's length; the shoulder and hip lines keep their centre and
 * turn and take the rig's width. A foot standing on the floor stays where it stood and the body rises or sinks over it,
 * so standing and sitting figures keep their ground contact. A pose already on the rig's proportions comes back unchanged.
 * @param {any} J joints: J(s) -> {hip,knee,foot,sh,el,hd,...} for s=-1/1, with J.pel, J.chest, J.head and optional J.abd
 * @returns {any} the same shape
 */
export function refitFigure(J){
  const P0=J.pel, Q0=J.chest, A=J(-1), B=J(1), spine=RIG.lowerSpine+RIG.upperSpine, legLen=RIG.legUpper+RIG.legLower;
  // The body's height comes from its standing legs: each keeps its own bend (reach over own length) on the longer bones.
  let lift=0, n=0;
  const planted=(/** @type {any} */ L)=>L.foot[2]<=1.5&&L.hip[2]-L.foot[2]>=2.5;   // on the floor, under the body (not lying)
  const hipC=half(A.hip,B.hip), hipW=length(sub(B.hip,A.hip))/2||RIG.hipHalf, hipK=RIG.hipHalf/hipW;
  const hipAt=(/** @type {any} */ L,/** @type {number[]} */ pel)=>add(add(pel,sub(hipC,P0)),[(L.hip[0]-hipC[0])*hipK,(L.hip[1]-hipC[1])*hipK,(L.hip[2]-hipC[2])*hipK]);
  for(const L of [A,B]){
    const own=length(sub(L.knee,L.hip))+length(sub(L.foot,L.knee)), reach=length(sub(L.foot,L.hip));
    if(!planted(L)||L.knee[2]>L.hip[2]-1.5||own<1e-6)continue;   // a sitting thigh rests on the seat: only a leg under the body carries it
    const hip=hipAt(L,P0), want=Math.min(0.995,reach/own)*legLen, h2=(hip[0]-L.foot[0])**2+(hip[1]-L.foot[1])**2;
    lift+=L.foot[2]+Math.sqrt(Math.max(0,want*want-h2))-hip[2]; n++;
  }
  const P=[P0[0],P0[1],P0[2]+(n?lift/n:0)];
  // Spine and neck: same bend, the rig's lengths.
  let abd=null, Q;
  if(J.abd){ const a=length(sub(J.abd,P0)), b=length(sub(Q0,J.abd)), k=spine/((a+b)||1); abd=move(P,sub(J.abd,P0),a*k); Q=move(abd,sub(Q0,J.abd),b*k); }
  else Q=move(P,sub(Q0,P0),spine);
  const head=move(Q,sub(J.head,Q0),RIG.neckToHead);
  const shC=half(A.sh,B.sh), shW=length(sub(B.sh,A.sh))/2||RIG.shoulderHalf, shK=RIG.shoulderHalf/shW;
  const out={};
  for(const s of [-1,1]){
    const L=J(s), sh=add(add(Q,sub(shC,Q0)),[(L.sh[0]-shC[0])*shK,(L.sh[1]-shC[1])*shK,(L.sh[2]-shC[2])*shK]);
    const el=move(sh,sub(L.el,L.sh),ARM_UPPER), hd=move(el,sub(L.hd,L.el),ARM_FORE);
    const hip=hipAt(L,P), own=length(sub(L.knee,L.hip))+length(sub(L.foot,L.knee));
    const down=planted(L), foot=down?[...L.foot]:add(hip,sub(L.foot,L.hip).map(v=>v*legLen/(own||legLen)));
    const [knee,ankle]=solveLimb(hip,foot,RIG.legUpper,RIG.legLower,add(hip,sub(L.knee,L.hip)));
    out[s]={...L,hip,knee,foot:down?foot:ankle,sh,el,hd};
  }
  const f=(/** @type {number} */ s)=>out[s];
  Object.assign(f,J,{pel:P,chest:Q,head});
  if(abd){ f.abd=abd; if(J.belly===J.abd) f.belly=abd; }
  return f;
}
