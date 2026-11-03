/**
 * Anatomical constraints for Roadwork's shared isometric fighting rig.
 * Coordinates are fighter-local: +x forward, +/-y to each hand, +z up.
 * Presentation only; hit ranges, damage and clocks stay in the combat rules.
 */
export const ARM_UPPER=3.0;
export const ARM_FORE=3.75; // includes the wrist-to-knuckle section

const mix3=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
const clamp01=v=>Math.max(0,Math.min(1,v));

/** Two fixed-length bones; bend towards the pole and clamp unreachable tips. */
export function solveLimb(root,tip,upper,lower,pole){
  const dx=tip[0]-root[0],dy=tip[1]-root[1],dz=tip[2]-root[2];
  const dist=Math.hypot(dx,dy,dz)||1e-6,ux=dx/dist,uy=dy/dist,uz=dz/dist;
  const reach=Math.max(Math.abs(upper-lower)+0.05,Math.min(dist,(upper+lower)*0.995));
  const axial=(upper*upper-lower*lower+reach*reach)/(2*reach);
  const radial=Math.sqrt(Math.max(0,upper*upper-axial*axial));
  let px=pole[0]-root[0],py=pole[1]-root[1],pz=pole[2]-root[2];
  const along=px*ux+py*uy+pz*uz;
  px-=along*ux;py-=along*uy;pz-=along*uz;
  let plen=Math.hypot(px,py,pz);
  if(plen<1e-4){px=uz*ux;py=uz*uy;pz=uz*uz-1;plen=Math.hypot(px,py,pz)||1;}
  return [
    [root[0]+ux*axial+px/plen*radial,root[1]+uy*axial+py/plen*radial,root[2]+uz*axial+pz/plen*radial],
    [root[0]+ux*reach,root[1]+uy*reach,root[2]+uz*reach]
  ];
}

/**
 * Hand + bend pole for jab, cross, hook or uppercut.
 * Both targets follow the shoulder AFTER torso rotation/lean/footwork.
 * Hook at contact: shoulder-level upper arm and forearm, elbow near 90 degrees.
 * @param {number} punch 0 jab, 1 cross, 2 hook, 3 uppercut
 * @param {number} side -1 / +1, striking hand
 * @param {number[]} shoulder current [forward, side, up]
 * @param {number[]} restHand glove's guard location
 * @param {number[]} restPole guard elbow's natural bend direction
 * @param {number} extension strike phase 0..1 (already eased by caller)
 * @param {number} windup chamber envelope 0..1 (zero at contact)
 * @param {boolean} low body-shot target
 * @returns {{hand:number[],pole:number[]}}
 */
export function strikeArmTargets(punch,side,shoulder,restHand,restPole,extension,windup,low=false){
  const k=clamp01(extension),w=clamp01(windup)*(1-k),s=side<0?-1:1;
  let reach,elbow;
  if(punch===2){
    // Upper arm points sideways, forearm folds across: an actual horizontal hook.
    reach=[4.85,-0.63,low?-1.6:0];
    elbow=[2.20,2.04,low?-0.95:0];
  }else if(punch===3){
    // Short, bent rising blow; no straightened overhead reach.
    reach=[low?3.20:3.88,-0.40,low?0.05:2.60];
    elbow=[1.65,1.75,-1.9];
  }else{
    // No remote/world-space knuckle target: prevent unreachable straight arms.
    reach=punch===0?(low?[5.80,-1.35,-1.65]:[6.30,-1.25,0.95]):(low?[5.92,-1.48,-1.65]:[6.35,-1.30,0.95]);
    elbow=[2.15,1.78,low?-1.45:-1.15];
  }
  const handTarget=[shoulder[0]+reach[0],shoulder[1]+s*reach[1],shoulder[2]+reach[2]];
  const poleTarget=[shoulder[0]+elbow[0],shoulder[1]+s*elbow[1],shoulder[2]+elbow[2]];
  const hand=mix3(restHand,handTarget,k),pole=mix3(restPole,poleTarget,k);
  // Circular hook and compact uppercut load visibly before the strike.
  if(punch===2){hand[0]-=0.35*w;hand[1]+=s*0.90*w;hand[2]-=0.14*w;}
  if(punch===3){hand[0]-=0.60*w;hand[1]+=s*0.45*w;hand[2]-=2.50*w;}
  return {hand,pole};
}

/** Internal elbow angle, degrees (90 bent, 180 extended). */
export function elbowAngle(shoulder,elbow,hand){
  const a=shoulder.map((x,i)=>x-elbow[i]),b=hand.map((x,i)=>x-elbow[i]);
  const dot=a.reduce((sum,x,i)=>sum+x*b[i],0);
  return Math.acos(Math.max(-1,Math.min(1,dot/(Math.hypot(...a)*Math.hypot(...b)||1))))*180/Math.PI;
}
