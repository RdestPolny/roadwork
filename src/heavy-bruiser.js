// Walter Pratt already exists in Newgate. Briggs is an independent heavyweight archetype.
export const BULL = Object.freeze({
  move: 0.68, health: 1.4, damage: [1.1,1.5,1.8,1.6],
  punchDuration: 1.38, knockback: 1.8, recovery: 0.68,
  missThreshold: 3.2, exhausted: 2.6, resume: 0.48, missDecay: 0.09
});

/** The fighter owns his transient fatigue; this object is never written into save data. */
export function createBullState(){
  return {mode:'APPROACH',missLoad:0,pending:false,until:0,lastAt:0,pid:2};
}

/** The strike only counts if it actually passed through the contact check with no impact.
 * A guarded blow or hit never calls this function. */
export function registerBullMiss(b,pid,now){
  if(!b||!Number.isFinite(now)||pid<0||pid>3||b.mode==='EXHAUSTED') return false;
  b.missLoad=Math.min(5,b.missLoad+(pid===0?0.3:1.1));
  b.lastAt=now;
  if(b.missLoad>=BULL.missThreshold) b.pending=true;
  return b.pending;
}

/** Advance the attack -> recovery -> vulnerability -> resume cycle in simulation seconds.
 * A pending exhaustion waits until the current blow finishes. */
export function advanceBull(b,now,punching=false){
  if(!b||!Number.isFinite(now)) return 'APPROACH';
  const dt=Math.min(1,Math.max(0,now-b.lastAt));
  b.lastAt=now;
  if(b.mode==='EXHAUSTED'){
    if(now>=b.until){ b.mode='RESUME'; b.until=now+BULL.resume; }
    return b.mode;
  }
  if(b.mode==='RESUME'){
    if(now>=b.until) b.mode='APPROACH';
    return b.mode;
  }
  if(b.pending&&!punching){
    b.pending=false; b.missLoad=0; b.mode='EXHAUSTED'; b.until=now+BULL.exhaust;
    return b.mode;
  }
  if(b.mode==='ATTACK'&&!punching){ b.mode='RECOVERY'; b.until=now+BULL.recovery; }
  if(b.mode==='RECOVERY'&&now>=b.until) b.mode='APPROACH';
  if(!b.pending) b.missLoad=Math.max(0,b.missLoad-dt*BULL.missDecay);
  return b.mode;
}

/** Per-fighter punch duration preserves the common punch event and IK implementation. */
export function bullTiming(normal,heavy){
  return heavy?{hit:normal.hit*BULL.punchDuration,end:normal.end*BULL.punchDuration}:normal;
}
