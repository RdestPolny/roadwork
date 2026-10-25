// @ts-check

/** Seconds and stamina costs shared by the realtime controller and its rules. */
export const TUNING=Object.freeze({
  repeatReset:2.4, repeatStep:.45,
  comboWindow:1.1, comboStep:.15,
  regen:10.5, regenDelayJab:.45, regenDelayPower:.65, whiffDelay:.3, whiffCost:3,
  guardDrain:7, guardAbsorbCost:1.15, blockChip:.15,
  guardPerfect:.14, guardRearm:.3, parryCost:12, parryCounterDuration:.6, parryCounterPower:1.35,
  slipCost:8, slipCooldown:.65, slipActive:.35, slipPerfect:.18, slipVulnerable:.65,
  counterDuration:.9, counterPower:1.55, failedSlipPower:1.35,
  lowStaThreshold:25, lowStaCostMult:1.3, staCapWear:.04, staCapFloor:.4,
  bodyHpMult:.75, bodyStaDrain:1.4, bodyCapDrain:.25
});

/** Stamina required by jab, cross, hook and uppercut before repeat and combo penalties. */
export const PUNCH_COST=Object.freeze([6,10,14,18]);
/** Health damage before strength, hunger and defensive reactions. */
export const PUNCH_DAMAGE=Object.freeze([4.5,8,10.5,13.5]);

/**
 * Create independent, transient combat state; all timestamps use simulation seconds.
 * @param {{hpMax?:number,staCap?:number,pow?:number,regen?:number,hunger?:number}} [spec]
 */
export function createCombatant({hpMax=125,staCap=100,pow=1,regen=1,hunger=0}={}){
  hpMax=Math.max(1,hpMax);staCap=Math.max(0,staCap);
  return {hp:hpMax,hpMax,sta:staCap,staCap,staCapInitial:staCap,pow:Math.max(0,pow),regen:Math.max(0,regen),hunger:Math.max(0,hunger),
    guarding:false,guardSince:-Infinity,guardReadyAt:-Infinity,
    slipSince:-Infinity,slipReadyAt:-Infinity,counterUntil:-Infinity,counterMult:/** @type {number} */(TUNING.counterPower),punchCounter:false,
    regenReadyAt:-Infinity,lastActionAt:-Infinity,comboCount:0,
    punchLast:[-Infinity,-Infinity,-Infinity,-Infinity],punchRepeats:[0,0,0,0]};
}
/** @typedef {ReturnType<typeof createCombatant>} Combatant */

/**
 * Advance resource recovery or held guard drain, pausing recovery right after throwing a punch.
 * @param {Combatant} f @param {number} dt @param {number} now
 */
export function tickCombatant(f,dt,now){
  if(!Number.isFinite(dt)||dt<=0||!Number.isFinite(now))return;
  if(f.guarding){
    f.sta=Math.max(0,f.sta-dt*TUNING.guardDrain);
    return;
  }
  if(now<f.regenReadyAt)return;
  f.sta=Math.max(0,Math.min(f.staCap,f.sta+dt*TUNING.regen*f.regen));
}

/**
 * Quote the next punch cost without changing repeat history; includes same-punch repeat, combo chain and low-stamina penalty.
 * @param {Combatant} f @param {number} pid @param {number} now
 */
export function punchCost(f,pid,now){
  if(!Number.isInteger(pid)||pid<0||pid>=PUNCH_COST.length)return Infinity;
  const repeats=now>=f.punchLast[pid]+TUNING.repeatReset?0:f.punchRepeats[pid];
  const chain=now>=f.lastActionAt+TUNING.comboWindow?0:f.comboCount;
  const tired=f.sta<TUNING.lowStaThreshold?TUNING.lowStaCostMult:1;
  return PUNCH_COST[pid]*(1+TUNING.repeatStep*repeats+TUNING.comboStep*chain)*tired;
}

/**
 * Spend stamina, wear down staCap slightly, pause breath recovery and commit repeat/combo history.
 * @param {Combatant} f @param {number} pid @param {number} now
 */
export function beginPunch(f,pid,now){
  const cost=punchCost(f,pid,now);
  if(f.hp<=0||!Number.isFinite(now)||!Number.isFinite(cost)||f.sta<cost)return false;
  f.sta=Math.max(0,f.sta-cost);
  const floor=(f.staCapInitial||100)*TUNING.staCapFloor;
  f.staCap=Math.max(floor,f.staCap-cost*TUNING.staCapWear);
  if(f.sta>f.staCap)f.sta=f.staCap;
  f.punchCounter=now<f.counterUntil;f.counterUntil=-Infinity;
  f.punchRepeats[pid]=now>=f.punchLast[pid]+TUNING.repeatReset?1:f.punchRepeats[pid]+1;
  f.punchLast[pid]=now;
  f.comboCount=now>=f.lastActionAt+TUNING.comboWindow?1:f.comboCount+1;
  f.lastActionAt=now;
  const delay=pid===0?TUNING.regenDelayJab:TUNING.regenDelayPower;
  f.regenReadyAt=Math.max(f.regenReadyAt,now+delay);
  return true;
}

/**
 * Extra breath penalty when a thrown punch misses out of range (whiff).
 * @param {Combatant} f @param {number} now
 */
export function whiffPunch(f,now){
  f.punchCounter=false;
  f.sta=Math.max(0,f.sta-TUNING.whiffCost);
  f.regenReadyAt=Math.max(f.regenReadyAt,now+TUNING.whiffDelay);
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
  f.regenReadyAt=Math.max(f.regenReadyAt,now+.25);
  setGuard(f,false,now);
  return true;
}

/**
 * Resolve contact once. Body shots sap stamina and ceiling; held blocks take minor chip damage; parries open a short counter window.
 * @param {Combatant} attacker @param {Combatant} defender
 * @param {{pid:number,low?:boolean,now:number}} blow
 * @returns {{kind:'hit'|'block'|'parry'|'slip',damage:number,counter:boolean,failedSlip:boolean}}
 */
export function resolvePunch(attacker,defender,{pid,low=false,now}){
  const counter=attacker.punchCounter;
  const cMult=counter?(attacker.counterMult||TUNING.counterPower):1;
  attacker.punchCounter=false;
  attacker.counterMult=TUNING.counterPower;
  if(!Number.isInteger(pid)||pid<0||pid>=PUNCH_DAMAGE.length)return {kind:'hit',damage:0,counter,failedSlip:false};

  const slipAge=now-defender.slipSince;
  if(slipAge>=0&&slipAge<=TUNING.slipPerfect){
    defender.counterUntil=now+TUNING.counterDuration;
    defender.counterMult=TUNING.counterPower;
    return {kind:'slip',damage:0,counter,failedSlip:false};
  }
  const failedSlip=slipAge>TUNING.slipPerfect&&slipAge<TUNING.slipVulnerable;
  let rawDamage=Math.max(1,PUNCH_DAMAGE[pid]*attacker.pow-attacker.hunger)*cMult*(failedSlip?TUNING.failedSlipPower:1);
  let damage=rawDamage*(low?TUNING.bodyHpMult:1);

  /** @type {'hit'|'block'|'parry'|'slip'} */
  let kind='hit';
  if(defender.guarding&&defender.sta>0){
    const guardAge=now-defender.guardSince;
    if(guardAge>=0&&guardAge<=TUNING.guardPerfect){
      attacker.sta=Math.max(0,attacker.sta-TUNING.parryCost);
      attacker.regenReadyAt=Math.max(attacker.regenReadyAt,now+.5);
      defender.guardSince=-Infinity;
      defender.counterUntil=now+TUNING.parryCounterDuration;
      defender.counterMult=TUNING.parryCounterPower;
      return {kind:'parry',damage:0,counter,failedSlip};
    }
    kind='block';
    const chip=damage*TUNING.blockChip;
    const blockable=damage-chip;
    const staNeeded=blockable*TUNING.guardAbsorbCost;
    const staSpent=Math.min(defender.sta,staNeeded);
    defender.sta=Math.max(0,defender.sta-staSpent);
    const unblocked=blockable*(1-staSpent/(staNeeded||1));
    damage=chip+unblocked;
  } else if(low){
    // Czysty cios na korpus pali kondycję i obniża pułap tlenowy obrońcy
    const floor=(defender.staCapInitial||100)*TUNING.staCapFloor;
    defender.sta=Math.max(0,defender.sta-rawDamage*TUNING.bodyStaDrain);
    defender.staCap=Math.max(floor,defender.staCap-rawDamage*TUNING.bodyCapDrain);
    if(defender.sta>defender.staCap)defender.sta=defender.staCap;
    defender.regenReadyAt=Math.max(defender.regenReadyAt,now+.55);
  }

  damage=Math.min(defender.hp,damage);
  defender.hp=Math.max(0,defender.hp-damage);
  return {kind,damage,counter,failedSlip};
}
