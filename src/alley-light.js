// Shared, deterministic light timing of the alley: one source for the props (what the eye sees burning) and the light pass
// (what it lights), so a basket's flame and the glow it throws never drift apart. Pure functions of time in SECONDS.

const smooth=(/** @type {number} */ a,/** @type {number} */ b,/** @type {number} */ x)=>{ const k=Math.max(0,Math.min(1,(x-a)/(b-a))); return k*k*(3-2*k); };

/** Brightness of a coke fire around 1: a slow breathing, a quicker crackle and now and then a gust. @param {{i:number,j:number,flicker?:number}} f @param {number} t seconds */
export function fireLevel(f,t){
  const s=f.i*3.1+f.j*5.7, slow=Math.sin(t*1.9+s), mid=Math.sin(t*6.3+s*1.7), quick=Math.sin(t*17.0+s*0.7)*Math.sin(t*11.3+s);
  const gust=Math.max(0,Math.sin(t*0.37+s*2.3))**8;   // a rare draught that makes it roar
  return Math.max(0.35,1+(f.flicker??0.6)*(0.28*slow+0.2*mid+0.16*quick)+0.25*gust);
}

/** Smooth on/off of a schedule {period,on,phase} (phase 0..1, `on` the lit share of the period): 1.5 s fades at both ends, 1 when there is none. @param {{period:number,on:number,phase:number}|undefined} s @param {number} t seconds */
export function scheduleLevel(s,t){
  if(!s) return 1;
  const u=((t/s.period+s.phase)%1+1)%1, f=Math.min(0.4,1.5/s.period);
  return smooth(0,f,u)*(1-smooth(s.on-f,s.on,u));
}

/** Brightness of a tallow candle in a window around 1 (small, nervous), times its schedule. @param {{flicker?:number,schedule?:{period:number,on:number,phase:number}}} w @param {number} t seconds @param {number} [seed] */
export function candleLevel(w,t,seed=0){
  const f=w.flicker??0.5, n=Math.sin(t*9.1+seed)*0.5+Math.sin(t*23.7+seed*2.3)*0.3+Math.sin(t*3.3+seed*0.7)*0.2;
  return scheduleLevel(w.schedule,t)*Math.max(0.3,1+f*0.3*n);
}
