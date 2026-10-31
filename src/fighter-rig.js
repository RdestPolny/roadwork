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
 */
export const RIG=Object.freeze({
  pelvisHeight:6.6, hipHeight:0.3, hipHalf:1.25,
  lowerSpine:2.68, upperSpine:2.94, shoulderHalf:2.7, shoulderHeight:0.2,
  neckToHead:3.4, legUpper:3.2, legLower:3.2,
  footHeight:0.9, minimumFootClearance:0.05
});

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
    if(!foot)continue;
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
export function buildSpine(pelvis,{lean=0,sideLean=0,fold=0,lunge=0}={}){
  const l=clamp(lean,-3.5,4.0),s=clamp(sideLean,-3.0,3.0),f=clamp(fold,0,1.15);
  const lower=[0.075+0.115*l+0.028*lunge-0.19*f,0.045*s-0.055*f,1];
  const upper=[0.105+0.135*l+0.042*lunge+0.34*f,0.06*s+0.065*f,1];
  const abdomen=move(pelvis,lower,RIG.lowerSpine);
  const chest=move(abdomen,upper,RIG.upperSpine);
  return {pelvis:[...pelvis],abdomen,chest};
}

/** A short neck with a fixed attachment to the ribcage. Head hints still
 * provide slipping, shock and chin-tuck, but cannot dislocate the skull. */
export function headSocket(chest,hint){
  const vx=clamp(hint[0]-chest[0],-1.0,1.1);
  const vy=clamp(hint[1]-chest[1],-0.95,0.95);
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
