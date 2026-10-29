/** Pure timing for the independent F dash, in fight-world room units. */
export const DASH=Object.freeze({
  cost:14, cooldown:.26, duration:.23, distance:.86, punchFrom:.58, buffer:.34
});
/** @param {number} u Normalised dash phase (0..1). The small first phase loads the legs. */
export function dashTravel(u){
  const s=x=>x*x*(3-2*x);
  u=Math.max(0,Math.min(1,u));
  if(u<.10) return .025*s(u/.10);
  if(u<.76) return .025+.895*s((u-.10)/.66);
  return .92+.08*s((u-.76)/.24);
}
/** A short responsive push-off, travel, then braking phase for the skeleton. @param {number} u */
export function dashPose(u){
  u=Math.max(0,Math.min(1,u));
  return {
    load:u<.12?Math.sin(Math.PI*u/.24):Math.max(0,1-(u-.12)/.18),
    push:u<.1?0:Math.sin(Math.PI*Math.min(1,(u-.1)/.66)),
    land:u>.76?Math.sin(Math.PI*(u-.76)/.24):0
  };
}
/** Choose a direction from the pointer, falling back to last movement. @param {number[]} pointer @param {number[]} last */
export function dashDirection(pointer,last){
  let di=Number(pointer?.[0])||0, dj=Number(pointer?.[1])||0;
  let mag=Math.hypot(di,dj);
  if(mag<.01){di=Number(last?.[0])||0;dj=Number(last?.[1])||0;mag=Math.hypot(di,dj);}
  return mag>=.01?[di/mag,dj/mag]:[0,0];
}
