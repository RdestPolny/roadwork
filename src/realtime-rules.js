// @ts-check

/** Seconds and stamina costs shared by the realtime controller and its rules. */
export const TUNING=Object.freeze({repeatReset:2,repeatStep:.35,regen:14,guardDrain:9,
  guardPerfect:.12,guardRearm:.3,parryCost:8,slipCost:10,slipCooldown:.65,
  slipActive:.35,slipPerfect:.16,slipVulnerable:.65,counterDuration:1,counterPower:1.5,failedSlipPower:1.35});
/** Stamina required by jab, cross, hook and uppercut before repeat penalties. */
export const PUNCH_COST=Object.freeze([5,9,12,16]);
/** Health damage before strength, hunger and defensive reactions. */
export const PUNCH_DAMAGE=Object.freeze([6,10,13,17]);

/**
 * Create independent, transient combat state; all timestamps use simulation seconds.
 * @param {{hpMax?:number,staCap?:number,pow?:number,regen?:number,hunger?:number}} [spec]
 */
export function createCombatant({hpMax=100,staCap=100,pow=1,regen=1,hunger=0}={}){
  hpMax=Math.max(1,hpMax);staCap=Math.max(0,staCap);
  return {hp:hpMax,hpMax,sta:staCap,staCap,pow:Math.max(0,pow),regen:Math.max(0,regen),hunger:Math.max(0,hunger),
    guarding:false,guardSince:-Infinity,guardReadyAt:-Infinity,
    slipSince:-Infinity,slipReadyAt:-Infinity,counterUntil:-Infinity,punchCounter:false,
    punchLast:[-Infinity,-Infinity,-Infinity,-Infinity],punchRepeats:[0,0,0,0]};
}
/** @typedef {ReturnType<typeof createCombatant>} Combatant */

/**
 * Advance resource recovery or held guard drain, without consulting a wall clock.
 * @param {Combatant} f @param {number} dt @param {number} now
 */
export function tickCombatant(f,dt,now){
  if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(now))return;
  f.sta=Math.max(0,Math.min(f.staCap,f.sta+dt*(f.guarding?-TUNING.guardDrain:TUNING.regen*f.regen)));
}

/**
 * Quote the next punch cost without changing repeat history; body and head share pid.
 * @param {Combatant} f @param {number} pid @param {number} now
 */
export function punchCost(f,pid,now){
  if(!Number.isInteger(pid)||pid<0||pid>=PUNCH_COST.length)return Infinity;
  const repeats=now>=f.punchLast[pid]+TUNING.repeatReset?0:f.punchRepeats[pid];
  return PUNCH_COST[pid]*(1+TUNING.repeatStep*repeats);
}

/**
 * Spend stamina and commit repeat history only when the punch can start.
 * @param {Combatant} f @param {number} pid @param {number} now
 */
export function beginPunch(f,pid,now){
  const cost=punchCost(f,pid,now);
  if(f.hp<=0||!Number.isFinite(now)||!Number.isFinite(cost)||f.sta<cost)return false;
  f.sta=Math.max(0,f.sta-cost);
  f.punchCounter=now<f.counterUntil;f.counterUntil=-Infinity;
  f.punchRepeats[pid]=now>=f.punchLast[pid]+TUNING.repeatReset?1:f.punchRepeats[pid]+1;
  f.punchLast[pid]=now;
  return true;
}

/**
 * Begin the ideal guard window on a fresh press, with a short rearm cooldown.
 * @param {Combatant} f @param {boolean} held @param {number} now
 */
export function setGuard(f,held,now){
  if(f.guarding===held)return;
  f.guarding=held;
  if(!held)return;
  f.guardSince=now>=f.guardReadyAt?now:-Infinity;
  if(Number.isFinite(f.guardSince))f.guardReadyAt=now+TUNING.guardRearm;
}

/**
 * Start a slip when its stamina cost and cooldown permit it.
 * @param {Combatant} f @param {number} now
 */
export function beginSlip(f,now){
  if(f.hp<=0||!Number.isFinite(now)||now<f.slipReadyAt||f.sta<TUNING.slipCost)return false;
  f.sta=Math.max(0,f.sta-TUNING.slipCost);
  f.slipSince=now;f.slipReadyAt=now+TUNING.slipCooldown;
  setGuard(f,false,now);
  return true;
}

/**
 * Resolve contact once. Counter power latched at launch survives until contact, even if defended.
 * A held guard pays damage in stamina; an exhausted guard lets the unpaid share through.
 * @param {Combatant} attacker @param {Combatant} defender
 * @param {{pid:number,low?:boolean,now:number}} blow
 * @returns {{kind:'hit'|'block'|'parry'|'slip',damage:number,counter:boolean,failedSlip:boolean}}
 */
export function resolvePunch(attacker,defender,{pid,low=false,now}){
  const counter=attacker.punchCounter;
  attacker.punchCounter=false;
  if(!Number.isInteger(pid)||pid<0||pid>=PUNCH_DAMAGE.length)return {kind:'hit',damage:0,counter,failedSlip:false};
  // Height changes the presentation; both targets obey the same basic defense rules.
  void low;
  const slipAge=now-defender.slipSince;
  if(slipAge>=0&&slipAge<=TUNING.slipPerfect){
    defender.counterUntil=now+TUNING.counterDuration;
    return {kind:'slip',damage:0,counter,failedSlip:false};
  }
  const failedSlip=slipAge>TUNING.slipPerfect&&slipAge<TUNING.slipVulnerable;
  let damage=Math.max(1,PUNCH_DAMAGE[pid]*attacker.pow-attacker.hunger)*(counter?TUNING.counterPower:1)*(failedSlip?TUNING.failedSlipPower:1);
  /** @type {'hit'|'block'|'parry'|'slip'} */
  let kind='hit';
  if(defender.guarding&&defender.sta>0){
    const guardAge=now-defender.guardSince;
    if(guardAge>=0&&guardAge<=TUNING.guardPerfect){
      attacker.sta=Math.max(0,attacker.sta-TUNING.parryCost);
      // One fresh guard press deflects one blow, even with simultaneous contacts.
      defender.guardSince=-Infinity;
      return {kind:'parry',damage:0,counter,failedSlip};
    }
    kind='block';
    const absorbed=Math.min(defender.sta,damage);
    defender.sta=Math.max(0,defender.sta-absorbed);damage-=absorbed;
  }
  damage=Math.min(defender.hp,damage);
  defender.hp=Math.max(0,defender.hp-damage);
  return {kind,damage,counter,failedSlip};
}
