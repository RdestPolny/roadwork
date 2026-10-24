/**
 * @typedef {object} Sequence
 * @property {string[][]} combos
 * @property {number} comboIndex
 * @property {string[]} current
 * @property {number} completed
 * @property {string[]} queue
 * @property {string|null} active
 * @property {number} failures
 * @property {boolean} between
 * @property {boolean} finished
 * @property {number} pace
 * @property {number} targetPace
 * @property {number} bestPace
 * @property {number|null} lastInput
 * @property {number|null} lastTick
 */

/** @param {string[][]} combos @returns {Sequence} */
export function createSequence(combos){
  return {combos,comboIndex:0,current:combos[0]||[],completed:0,queue:[],active:null,failures:0,between:false,finished:combos.length===0,pace:1,targetPace:1,bestPace:1,lastInput:null,lastTick:null};
}

/** Accept ordered manual input; only animation completion confirms progress.
 * @param {Sequence} S @param {string} token @param {number} nowMs
 * @returns {'accepted'|'wrong'|'ignored'}
 */
export function enqueueAction(S,token,nowMs){
  const next=S.completed+(S.active===null?0:1)+S.queue.length;
  if(S.finished||S.between||next>=S.current.length)return 'ignored';
  if(token!==S.current[next]){
    S.failures++; S.completed=0; S.queue.length=0; S.active=null;
    S.pace=S.targetPace=1; S.lastInput=null; S.lastTick=nowMs;
    return 'wrong';
  }
  tickSequence(S,nowMs);
  if(S.lastInput!==null){
    const interval=Math.max(0,nowMs-S.lastInput);
    S.targetPace=1+Math.max(0,Math.min(1,(650-interval)/500));
  }
  S.lastInput=nowMs;
  S.queue.push(token);
  return 'accepted';
}

/** Start one queued action when no animation is active.
 * @param {Sequence} S @returns {string|null}
 */
export function beginAction(S){
  if(S.finished||S.between||S.active!==null)return null;
  S.active=S.queue.shift()??null;
  return S.active;
}

/** Confirm one completed animation; the last action starts combo feedback.
 * @param {Sequence} S @returns {string|null}
 */
export function finishAction(S){
  if(S.active===null)return null;
  const token=S.active;
  S.active=null; S.completed++;
  if(S.completed===S.current.length)S.between=true;
  return token;
}

/** Advance only after the current combo's completion feedback.
 * @param {Sequence} S @returns {boolean} Whether another combo is available.
 */
export function nextSequenceCombo(S){
  if(S.finished||!S.between)return false;
  S.comboIndex++; S.completed=0; S.between=false;
  S.current=S.combos[S.comboIndex]||[];
  S.finished=S.comboIndex>=S.combos.length;
  return !S.finished;
}

/** Smooth pace using shared game milliseconds; a frozen clock preserves pause.
 * @param {Sequence} S @param {number} nowMs
 */
export function tickSequence(S,nowMs){
  if(S.lastTick===null){S.lastTick=nowMs;return;}
  const elapsed=Math.max(0,nowMs-S.lastTick);
  if(S.lastInput!==null&&nowMs-S.lastInput>=1200){
    const beforeIdle=Math.max(0,Math.min(elapsed,S.lastInput+1200-S.lastTick));
    S.pace+=(S.targetPace-S.pace)*(1-Math.exp(-beforeIdle/300));
    S.bestPace=Math.max(S.bestPace,S.pace);
    S.targetPace=1;
    S.pace+=(1-S.pace)*(1-Math.exp(-(elapsed-beforeIdle)/300));
  }else S.pace+=(S.targetPace-S.pace)*(1-Math.exp(-elapsed/300));
  S.bestPace=Math.max(S.bestPace,S.pace);
  S.lastTick=Math.max(S.lastTick,nowMs);
}
