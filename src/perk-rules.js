/* Attribute economy (pure): points from levels, trials and lessons (they pay for the attribute's punches), and the
   Cechy — one of two traits at levels 5, 10 and 15 (PERKI.md). Used by the save store, progression and both trait views. */

import { TRAITS, TRAIT_LEVELS } from './skill-data.js';
import { TRIAL_LEVELS } from './stats.js';

/** @typedef {import('./skill-data.js').SkillKey} SkillKey */
/** @typedef {''|'a'|'b'} TraitPick  the chosen trait of a slot: A, B or none yet */
/** @typedef {{bonus:number,respecs:number}} TreeSkills  lesson points; trait changes made (the first is free) */

/** Points earned in an attribute: one per level after the first, one per passed trial, plus lesson points.
 * @param {number} level @param {Record<string,boolean>} trials @param {number} [bonus] */
export function pointsEarned(level,trials,bonus=0){
  return Math.max(0,Math.floor(level)-1)+TRIAL_LEVELS.filter(l=>trials?.[String(l)]===true).length+bonus;
}

/** How many trait slots this level has opened. @param {number} level */
export function traitSlots(level){ return TRAIT_LEVELS.filter(l=>level>=l).length; }

/** The trait a pick stands for ('' when none). @param {SkillKey} key @param {number} slot @param {TraitPick} pick */
export function traitId(key,slot,pick){ return pick&&TRAITS[key][slot]?TRAITS[key][slot][pick==='a'?0:1]:''; }

/** Repair the saved picks of one attribute: three slots, only those its level has opened. @param {unknown} value @param {number} level @returns {TraitPick[]} */
export function sanitizeTraits(value,level){
  const v=Array.isArray(value)?value:[], open=traitSlots(level);
  return TRAIT_LEVELS.map((_,i)=>i<open&&(v[i]==='a'||v[i]==='b')?v[i]:'');
}

/** Why a slot cannot take this pick now ('' when it can). @param {number} slot @param {TraitPick} pick @param {TraitPick[]} picks @param {number} level */
export function traitBlock(slot,pick,picks,level){
  if(!Number.isInteger(slot)||slot<0||slot>=TRAIT_LEVELS.length||(pick!=='a'&&pick!=='b')) return 'unknown';
  if(level<TRAIT_LEVELS[slot]) return 'level';
  if(picks[slot]===pick) return 'same';
  return '';
}

/** The trait ids an attribute takes into a fight. @param {SkillKey} key @param {TraitPick[]} picks */
export function fightTraits(key,picks){ return picks.map((p,i)=>traitId(key,i,p)).filter(Boolean); }
