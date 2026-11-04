// Walter Pratt already exists in Newgate. Briggs is an independent heavyweight archetype.
export const BULL = Object.freeze({
  move: 0.68, health: 1.4, damage: [1.1,1.5,1.8,1.6],
  punchDuration: 1.38, knockback: 1.8, recovery: 0.68,
  missThreshold: 3.2, exhausted: 2.6, resume: 0.48, missDecay: 0.09,
  // He throws hooks only: a slow opening one that warns, then the rest of a run of 2..4 comes quickly.
  warnWind: 0.95, chainWind: 0.36, runMin: 2, runMax: 4,
  // The charge: a long stamp, then a straight run along the line fixed when it starts. A hit carries the man to the wall.
  chargeWind: 1.05, chargeSpeed: 0.085, chargeReach: 7, chargeTime: 1.5, chargeEvery: 6, chargeFrom: 2.4,
  // Poise while loading or throwing a hook: each windup absorbs this much light-blow weight before a clean hit cancels it.
  armor: 2.5, jabArmorCost: 0.5,
  carrySpeed: 0.13, carryMax: 4.5, pinned: 5, slamDamage: 12, slamBeat: 0.55, punishHooks: 3, pinnedDamage: 0.65
});

/** Modes in which he is running or has caught a man: tiredness waits until it is over. */
const CHARGING=new Set(['CHARGE_WIND','CHARGE','CARRY','SLAMMED']);

/** The fighter owns his transient fatigue; this object is never written into save data. */
export function createBullState(){
  return {mode:'APPROACH',missLoad:0,pending:false,missed:false,until:0,lastAt:0,pid:2,run:null,charge:null,chargeAt:3,runs:0,carry:null,armor:0};
}

/** The strike only counts if it actually passed through the contact check with no impact.
 * A guarded blow or hit never calls this function. */
export function registerBullMiss(b,pid,now){
  if(!b||!Number.isFinite(now)||pid<0||pid>3||b.mode==='EXHAUSTED') return false;
  b.missLoad=Math.min(5,b.missLoad+(pid===0?0.3:1.1));
  b.missed=true;
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
  if(b.pending&&!punching&&!CHARGING.has(b.mode)){
    b.pending=false; b.missLoad=0; b.mode='EXHAUSTED'; b.until=now+BULL.exhausted;
    return b.mode;
  }
  if(b.mode==='ATTACK'&&!punching){
    if(b.run&&b.run.left>0) b.mode='CHAIN';   // the next hook of the run follows without a pause
    else { b.mode='RECOVERY'; b.until=now+BULL.recovery+(b.missed?0.32:0); b.missed=false; b.run=null; }
  }
  if(b.mode==='RECOVERY'&&now>=b.until) b.mode='APPROACH';
  if(!b.pending) b.missLoad=Math.max(0,b.missLoad-dt*BULL.missDecay);
  return b.mode;
}

/** Per-fighter punch duration preserves the common punch event and IK implementation. */
export function bullTiming(normal,heavy){
  return heavy?{hit:normal.hit*BULL.punchDuration,end:normal.end*BULL.punchDuration}:normal;
}


/** The number of hooks in one run, the opening warning hook included. @param {number} [r] a random number in [0,1) */
export function runLength(r=Math.random()){
  return BULL.runMin+Math.min(BULL.runMax-BULL.runMin,Math.floor(r*(BULL.runMax-BULL.runMin+1)));
}

/** Start a run of hooks: the first one carries the long warning tell. @param {ReturnType<typeof createBullState>} b @param {number} now @param {number} [n] */
export function beginRun(b,now,n=runLength()){
  b.run={left:n-1,first:true}; b.pid=2; b.mode='WINDUP'; b.at=now; b.until=now+BULL.warnWind; b.runs++; b.armor=BULL.armor;
}

/** Whether a clean hit is absorbed by the bull's poise instead of cancelling his hook; spends the armor when it is.
 * Only a windup or a hook in flight is armored. @param {ReturnType<typeof createBullState>|undefined} b @param {number} pid punch id (0 = jab) */
export function absorbBullHit(b,pid){
  if(!b||!(b.armor>0)||!(b.mode==='WINDUP'||b.mode==='ATTACK'||b.mode==='CHAIN')) return false;
  b.armor-=pid===0?BULL.jabArmorCost:1;
  return true;
}

/** The next hook of a running combination, thrown after a short tell. @param {ReturnType<typeof createBullState>} b @param {number} now */
export function chainHook(b,now){
  if(!b.run||b.run.left<=0) return false;
  b.run.left--; b.run.first=false; b.pid=2; b.mode='WINDUP'; b.at=now; b.until=now+BULL.chainWind; b.armor=BULL.armor;
  return true;
}

/** Whether it is time to charge: far enough away, and not right after the last one. @param {ReturnType<typeof createBullState>} b @param {number} now @param {number} gap */
export function wantsCharge(b,now,gap){
  return gap>=BULL.chargeFrom&&now>=b.chargeAt;
}

/** Start the stamp before a charge. @param {ReturnType<typeof createBullState>} b @param {number} now */
export function beginCharge(b,now){
  b.run=null; b.mode='CHARGE_WIND'; b.at=now; b.until=now+BULL.chargeWind; b.charge=null;
}

/** Fix the charge's line when the stamp ends. @param {ReturnType<typeof createBullState>} b @param {number} now @param {number} di @param {number} dj unit direction to the target */
export function launchCharge(b,now,di,dj){
  b.mode='CHARGE'; b.charge={di,dj,at:now,dist:0}; b.chargeAt=now+BULL.chargeEvery;
}

/** Whether a charging bull at the given offset from his own line catches a man: ahead of him and close to the line.
 * @param {number} along distance along the charge line @param {number} across distance from the line */
export function chargeCatches(along,across){
  return along>-0.2&&along<1.15&&Math.abs(across)<0.75;
}
