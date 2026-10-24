/* Pure progression math shared by the save store, progression, sparring and tests.
   Three trees (Siła / Szybkość / Wytrzymałość) level 1–30. Every passive grows 60% smoothly with each
   level and 40% in six steps at levels 5, 10, 15, 20, 25 and 30, so milestones are felt in play. */

export const LEVEL_MAX = 30;
export const MILESTONE_EVERY = 5;
export const TRIAL_LEVELS = /** @type {const} */ ([10, 20]);

/** XP needed to go from level l to l+1. @param {number} l */
export function xpNeed(l){ return 10*Math.round(4+Math.pow(l,1.65)); }

/** Cumulative XP needed to reach level l from level 1. @param {number} l */
export function xpTotal(l){ let s=0; for(let k=1;k<l;k++) s+=xpNeed(k); return s; }

/** Level and remainder for a cumulative XP amount, capped at LEVEL_MAX. @param {number} total */
export function levelFromTotal(total){
  let lvl=1, xp=Math.max(0,total);
  while(lvl<LEVEL_MAX&&xp>=xpNeed(lvl)){ xp-=xpNeed(lvl); lvl++; }
  return {lvl, xp:lvl>=LEVEL_MAX?0:xp};
}

/** XP curve used by saves before version 4 (levels 1–10). @param {number} l */
export function legacyXpNeed(l){ return Math.round(50*Math.pow(l,1.4)); }

/** Convert a pre-v4 stat (levels 1–10) by its cumulative XP. @param {number} lvl @param {number} xp */
export function migrateLegacyStat(lvl,xp){
  let total=Math.max(0,xp);
  for(let k=1;k<Math.min(10,lvl);k++) total+=legacyXpNeed(k);
  return levelFromTotal(total);
}

/** Share of the 1→30 growth reached at a level: 60% linear, 40% in milestone steps. @param {number} l */
export function passiveFraction(l){
  const L=Math.max(1,Math.min(LEVEL_MAX,Math.floor(l)));
  return 0.6*(L-1)/(LEVEL_MAX-1)+0.4*Math.floor(L/MILESTONE_EVERY)/(LEVEL_MAX/MILESTONE_EVERY);
}

/** @param {number} l @param {number} from @param {number} to */
function grow(l,from,to){ return from+(to-from)*passiveFraction(l); }

/** Passive bonuses of one tree at a level. Values at 30 equal the old level-10 maximum where they existed.
 * @param {'str'|'spd'|'end'} key @param {number} l @returns {Record<string,number>} */
export function treePassives(key,l){
  if(key==='str') return {pow:grow(l,0.95,1.49), stunDealt:grow(l,1,1.25), guardDrain:grow(l,1,1.2)};
  if(key==='spd') return {punch:grow(l,0.95,1.22), foot:grow(l,0.95,1.15), back:grow(l,0.95,1.2)};
  return {staCap:grow(l,90,126), regen:grow(l,0.9,1.44), fat:grow(l,0.13,0.058), recov:grow(l,0.4,0.85),
    hpMax:Math.round(grow(l,100,120)), stunTaken:grow(l,1,0.85), energyUse:grow(l,1,0.8)};
}

/** Fighter-ready stats for three tree levels (player or opponent). @param {{str:number,spd:number,end:number}} lv */
export function fighterStats(lv){
  const s=treePassives('str',lv.str), q=treePassives('spd',lv.spd), e=treePassives('end',lv.end);
  return {pow:s.pow, stunDealt:s.stunDealt, guardDrain:s.guardDrain, spd:q.punch, spdFoot:q.foot, spdBack:q.back,
    staCap:Math.round(e.staCap), regen:e.regen, fat:e.fat, recov:e.recov, hpBonus:e.hpMax-100, stunTaken:e.stunTaken, endLvl:lv.end};
}

/** Player-facing description of a milestone reached at level l, or '' between milestones.
 * @param {'str'|'spd'|'end'} key @param {number} l */
export function milestoneText(key,l){
  if(l%MILESTONE_EVERY) return '';
  const a=treePassives(key,l), pct=(/** @type {number} */ v)=>Math.round(v*100);
  if(key==='str') return 'moc ×'+a.pow.toFixed(2).replace('.',',')+' · ogłuszenie +'+(pct(a.stunDealt)-100)+'% · nacisk na gardę +'+(pct(a.guardDrain)-100)+'%';
  if(key==='spd') return 'ciosy ×'+a.punch.toFixed(2).replace('.',',')+' · nogi ×'+a.foot.toFixed(2).replace('.',',')+' · powrót ×'+a.back.toFixed(2).replace('.',',');
  return 'kondycja '+Math.round(a.staCap)+' · zdrowie '+a.hpMax+' · szczęka −'+(100-pct(a.stunTaken))+'%';
}

/** Short summary of current passives for the trainer screen. @param {'str'|'spd'|'end'} key @param {number} l */
export function passiveSummary(key,l){
  const a=treePassives(key,l), f=(/** @type {number} */ v)=>v.toFixed(2).replace('.',','), pct=(/** @type {number} */ v)=>Math.round(v*100);
  if(key==='str') return 'Moc ×'+f(a.pow)+' · Ogłuszenie +'+(pct(a.stunDealt)-100)+'% · Nacisk na gardę +'+(pct(a.guardDrain)-100)+'%';
  if(key==='spd') return 'Ciosy ×'+f(a.punch)+' · Nogi ×'+f(a.foot)+' · Powrót do gardy ×'+f(a.back);
  return 'Kondycja '+Math.round(a.staCap)+' · Regeneracja ×'+f(a.regen)+' · Zdrowie '+a.hpMax+' · Szczęka −'+(100-pct(a.stunTaken))+'% · Energia na treningu −'+(100-pct(a.energyUse))+'%';
}

/** Tree levels of an opponent from its rank and boxing style: specialists trade one tree for another.
 * @param {number} rank @param {string} style @returns {{str:number,spd:number,end:number}} */
export function opponentLevels(rank,style){
  const off={out:[-4,4,0],press:[4,-4,0],counter:[-2,3,-1],bal:[0,0,0]}[style]||[0,0,0];
  const c=(/** @type {number} */ v)=>Math.max(1,Math.min(LEVEL_MAX,Math.round(v)));
  return {str:c(rank+off[0]), spd:c(rank+off[1]), end:c(rank+off[2])};
}

/** Stars shown for an opponent rank: ★ up to 9, ★★ up to 19, ★★★ above, ★★★★ from 28. @param {number} rank */
export function opponentStars(rank){ return rank>=28?4:rank>=20?3:rank>=10?2:1; }
