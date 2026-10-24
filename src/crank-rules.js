/** Thirty seconds of pointless prison labour, driven only by simulation time. */
export const DURATION=30;
export const TARGET=10;
export const TAU=Math.PI*2;

/** Start at six o'clock, ready for the first upward pull. */
export function createCrank(){
  return {elapsed:0,angle:0,speed:0,turns:0,held:false,done:false,streak:0,best:0,goodTime:0,workTime:0};
}

/** The right half of a counterclockwise revolution goes from six through three to twelve.
 * @param {ReturnType<typeof createCrank>} c */
export function isRising(c){return c.angle%TAU<Math.PI;}

/** Counterclockwise motion from six o'clock pushes the upper grip away from the worker on the right.
 * @param {number} angle @param {number} radius */
export function crankOffset(angle,radius){return {x:Math.sin(angle)*radius,y:Math.cos(angle)*radius};}

/** Set the current grip without penalties for changing it early.
 * @param {ReturnType<typeof createCrank>} c @param {boolean} down */
export function holdCrank(c,down){if(!c.done)c.held=down;}

/** Release input on pause without changing the mechanism's angle or speed.
 * @param {ReturnType<typeof createCrank>|null} c */
export function releaseCrank(c){if(c)c.held=false;}

/** Advance with small steps so rhythm and the final bell use one clock.
 * @param {ReturnType<typeof createCrank>} c @param {number} [dt] */
export function tickCrank(c,dt=1/60){
  if(c.done||!Number.isFinite(dt)||dt<=0)return;
  let left=Math.min(dt,DURATION-c.elapsed);
  while(left>1e-10){
    const step=Math.min(left,1/120);left-=step;c.elapsed+=step;
    c.workTime+=step;
    const rising=isRising(c),good=c.held===rising;
    if(!good){c.speed=0;continue;}
    const target=Math.min(4.2,2.1+c.streak*.24)+(rising?0:.35);
    c.speed+=(target-c.speed)*Math.min(1,step*3);
    c.angle=Math.min(rising?Math.PI:TAU,c.angle+c.speed*step);
    c.goodTime+=step;
    if(c.angle===TAU){
      if(c.elapsed<DURATION-1e-9){c.turns++;c.streak++;c.best=Math.max(c.best,c.streak);}
      c.angle=0;
    }
  }
  if(c.elapsed>=DURATION-1e-9){c.elapsed=DURATION;c.done=true;}
}
