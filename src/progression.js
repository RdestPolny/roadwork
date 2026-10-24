import { addLasting, mergeHabits, healOne, MOVES, skillPool, sanitizeLoadout, movesSpent, learnBlock, buyNode, LOADOUT_MAX } from './card-data.js';
import { GEAR_BY_ID, HERO_LOOK, SIM_DEF, STAT_MAX, STAT_KEYS, STAT_PL } from './data.js';
/** One hero, one head: a save keeps only the hero's look (any older custom look becomes his). */
const HERO_LOOKS=Object.fromEntries(Object.entries(HERO_LOOK).map(([k,id])=>[k,[{id}]]));
import { LEGACY_GYM_TYPES, LEGACY_DECOR_BY_ID } from './legacy-save-data.js';
import { spendTobacco } from './prison.js';
import { state as boxingState, popup } from './boxing.js';
import { state as simulationState } from './simulation.js';
import { state as sparringState } from './sparring.js';
import { state as appearanceState, applyGear, applyLook } from './appearance.js';
import { sfxChime } from './audio.js';
import { createSaveStore } from './save-store.js';
import { DEBUG } from './config.js';
import { TRAIT_LEVELS, TRAIT_NAMES } from './skill-data.js';
import { xpNeed as statXpNeed, treePassives, milestoneText, TRIAL_LEVELS } from './stats.js';
import { PRISON_CAP } from './training-data.js';
import { REVENGE_XP } from './prison-data.js';
import { pointsEarned, traitBlock, traitId, fightTraits } from './perk-rules.js';

// Runtime values owned by progression; initialized explicitly by main.js.
export const state = {};

export function mergeSave(d){ return state.saveStore.merge(d); } /** @param {number} l */ export function xpNeed(l){ return statXpNeed(l); }

/** Points of one attribute: earned by levels, trials and lessons, spent on its moves and punch trees. @param {string} key */
export function skillPoints(key){
  const S=state.save.skills[key], earned=pointsEarned(state.save.stats[key].lvl,state.save.trials[key],S.bonus);
  const spent=movesSpent(state.save.moves,/** @type {'str'|'spd'|'end'} */ (key));
  return {earned,spent,free:earned-spent};
}

/** Tobacco a trait change costs: an empty slot and the first change of an attribute are free. @param {string} key @param {number} slot */
export function traitCost(key,slot){ return state.save.traits[key][slot]&&state.save.skills[key].respecs?5:0; }

/** Pick a trait (Cecha) in a slot; changing a chosen one is paid in tobacco. @param {'str'|'spd'|'end'} key @param {number} slot @param {'a'|'b'} pick
 * @returns {string} '' or the reason (unknown, level, same, fajki) */
export function pickTrait(key,slot,pick){
  const T=state.save.traits[key], why=traitBlock(slot,pick,T,state.save.stats[key].lvl); if(why) return why;
  if(T[slot]){ const cost=traitCost(key,slot); if(cost&&!spendTobacco(cost)) return 'fajki'; state.save.skills[key].respecs++; }
  T[slot]=pick; persist(); return '';
}

/** Debug and test helper: set a trait without the level or tobacco. @param {'str'|'spd'|'end'} key @param {number} slot @param {''|'a'|'b'} pick */
export function setTrait(key,slot,pick){ state.save.traits[key][slot]=pick; persist(); }

/** Buy the next node of a punch tree with its attribute's points. @param {string} id @param {'a'|'b'} pick @returns {string} '' or the reason */
export function buyPunchNode(id,pick){
  const M=MOVES[id]; if(!M) return 'unknown';
  const why=buyNode(state.save.moves,id,pick,skillPoints(M.tree).free); if(!why) persist(); return why;
}

/** New skills go straight into the set while it has room (the player can take them out on the Skille tab). Does not persist. @param {string[]} ids */
export function addToLoadout(ids){
  const pool=playerSkillPool(), set=playerLoadout();
  for(const id of ids) if(set.length<LOADOUT_MAX&&pool.includes(id)&&!set.includes(id)) set.push(id);
  state.save.loadout=set;
}

/* ---------- moves and the skill set ---------- */

/** Skills the player may take into a fight now: learnt moves and the skills of the perks taken into fights. @returns {string[]} */
export function playerSkillPool(){ return skillPool(state.save.moves,playerFightPerks()); }

/** The set the player fights with: the saved one, made legal against what he knows today. @returns {string[]} */
export function playerLoadout(){ return sanitizeLoadout(state.save.loadout,playerSkillPool()); }

/** Learn a move with the points of its tree. @param {string} id @returns {string} '' or the reason (known, points, unknown) */
export function learnMove(id){
  const M=MOVES[id]; if(!M) return 'unknown';
  const why=learnBlock(state.save.moves,id,skillPoints(M.tree).free); if(why) return why;
  state.save.moves[id]={picks:''}; addToLoadout([id]); persist(); return '';
}

/** Put a known skill into the set. @param {string} id @returns {string} '' or the reason (in, unknown, full) */
export function loadoutAdd(id){
  const set=playerLoadout();
  if(set.includes(id)) return 'in';
  if(!playerSkillPool().includes(id)) return 'unknown';
  if(set.length>=LOADOUT_MAX) return 'full';
  state.save.loadout=[...set,id]; persist(); return '';
}

/** Take a skill out of the set; at least one stays. @param {string} id @returns {string} '' or the reason (none, min) */
export function loadoutRemove(id){
  const set=playerLoadout();
  if(!set.includes(id)) return 'none';
  if(set.length<=1) return 'min';
  state.save.loadout=set.filter(c=>c!==id); persist(); return '';
}

/** Perks the player's fighter takes into a fight: the Cechy of the three attributes and the Spacerniak perks (always on). */
export function playerFightPerks(){ return [...(/** @type {const} */ (['str','spd','end'])).flatMap(key=>fightTraits(key,state.save.traits[key])),...(state.save.bare?.unlocked||[])]; }

export function statPow(){ return treePassives('str',state.save.stats.str.lvl).pow; }

export function statSpd(){ return treePassives('spd',state.save.stats.spd.lvl).punch; }

/** Passive bonuses of one tree at the player's current level. @param {'str'|'spd'|'end'} key */
export function playerPassives(key){ return treePassives(key,state.save.stats[key].lvl); }

export function applyStats(){ boxingState.STATS.power=statPow(); boxingState.STATS.speed=statSpd(); }

export function addXP(k,a,raw){
  const S=state.save.stats[k]; if(S.lvl>=STAT_MAX||a<=0) return;
  if(!raw) a*=revengeMul();                      /* revenge hunger after the infirmary */
  S.xp+=a; state.sessXP[k]+=a; state.statsDirty=true;
  settleLevels(k);
}

/** Turn stored XP into levels, parking it in the trial bank at levels 10 and 20. @param {string} k */
function settleLevels(k){
  const S=state.save.stats[k];
  while(S.lvl<STAT_MAX){
    if(prisonCapped(k)){ const B=state.save.prison.bank, was=B[k]; B[k]=Math.min(xpNeed(S.lvl),B[k]+S.xp); S.xp=0;
      if(!was&&B[k]>0) showToast(STAT_PL[k]+': limit więzienny ('+PRISON_CAP+') — nadwyżka XP w puli (do 1 poziomu)',true); break; }
    if(trialLocked(k,S.lvl)){ S.banked=Math.min(xpNeed(S.lvl),S.banked+S.xp); S.xp=0; break; }   // levels 10 and 20 wait for Profesor's trial
    if(S.xp<xpNeed(S.lvl)) break;
    S.xp-=xpNeed(S.lvl); S.lvl++; levelUp(k);
  }
  if(S.lvl>=STAT_MAX) S.xp=0;
} function levelUp(k){
  popup(sparringState.T_LVL+STAT_KEYS.indexOf(k),72,22,appearanceState.C_SPARK,1,70); sfxChime(990); sfxChime(1320);
  const lvl=state.save.stats[k].lvl, milestone=milestoneText(/** @type {'str'|'spd'|'end'} */ (k),lvl);
  const slot=TRAIT_LEVELS.indexOf(lvl);
  showToast('nowy poziom · +1 punkt ciosów'+(slot>=0?' · nowa Cecha do wyboru: '+TRAIT_NAMES[traitId(/** @type {'str'|'spd'|'end'} */ (k),slot,'a')]+' albo '+TRAIT_NAMES[traitId(/** @type {'str'|'spd'|'end'} */ (k),slot,'b')]+' (karta postaci, P)':'')+(milestone?' · kamień milowy: '+milestone:'')+(trialLocked(k,lvl)?' · dalsze poziomy po próbie u Profesora':'')+(prisonCapped(k)?' · limit więzienny':''),!!milestone||trialLocked(k,lvl),STAT_PL[k].toUpperCase()+' '+lvl);
  if(boxingState.gstate!=='spar') applyStats();
  persist(); state.statsDirty=false;
}

/** Show a short notice on a slip of paper above the game, optionally under a red stamp. @param {string} text @param {boolean} [big] @param {string} [stamp] */
export function showToast(text,big=false,stamp=''){
  const el=document.getElementById('levelToast'); if(!el) return;
  el.replaceChildren(); if(stamp){ const s=document.createElement('b'); s.textContent=stamp; el.append(s); }
  el.append(text); el.classList.toggle('big',big); el.hidden=false;
  clearTimeout(state.toastT); state.toastT=setTimeout(()=>{ el.hidden=true; },big?5200:2600);
}

/** Revenge hunger: +25% XP for three days after the infirmary. */
export function revengeMul(){ const A=state.save.prison?.ambulatorium; return A&&A.glodDo>state.save.sim.day?REVENGE_XP:1; }

/** An extra point in an attribute (Profesor's lessons): it pays for the attribute's punches. @param {'str'|'spd'|'end'} k */
export function grantPerkPoint(k){
  state.save.skills[k].bonus++; persist();
  showToast('+1 punkt ciosów · '+STAT_PL[k],true,'LEKCJA');
}

/** A tree at the prison ceiling: further XP is banked. @param {string} k */
export function prisonCapped(k){ return state.save.stats[k].lvl>=PRISON_CAP; }

/** Whether a tree waits for Profesor’s trial at this level. @param {string} k @param {number} lvl */
export function trialLocked(k,lvl){ return TRIAL_LEVELS.includes(/** @type {any} */ (lvl))&&!state.save.trials[k][String(lvl)]; }

/** Trial waiting in a tree (its level) or 0. @param {string} k */
export function trialPending(k){ const l=state.save.stats[k].lvl; return trialLocked(k,l)?l:0; }

/** Mark a trial passed: +1 point and the banked XP flows into the next level. @param {string} k @param {number} lvl */
export function passTrial(k,lvl){
  if(state.save.trials[k][String(lvl)]) return false;
  const S=state.save.stats[k], banked=S.banked;
  state.save.trials[k][String(lvl)]=true; S.banked=0;
  showToast(STAT_PL[k]+' '+lvl+': +1 punkt ciosów, odblokowano kolejne poziomy',true,'PRÓBA ZDANA'); sfxChime(1320);
  if(banked>0){ S.xp+=banked; settleLevels(k); }
  persist(); return true;
}

export function resetSessXP(){ state.sessXP.str=0; state.sessXP.spd=0; state.sessXP.end=0; }

export function sessXPText(){ const a=[]; for(const k of STAT_KEYS) if(state.sessXP[k]>=0.5) a.push('+'+Math.round(state.sessXP[k])+' '+STAT_PL[k].toLowerCase()); return a.length?a.join(' · '):'—'; }

/** A finished fight goes into the record (character sheet). @param {{win:boolean,draw:boolean,ko:boolean,bare:boolean,opp:string,venue:string,how:string}} f */
export function recordFight(f){
  const R=state.save.record, T=f.bare?R.bare:R.spar;
  if(f.draw) T.d++; else if(f.win){ T.w++; if(f.ko) T.ko++; } else { T.l++; if(f.ko) T.koL++; }
  R.last.unshift({r:f.draw?'d':f.win?'w':'l',o:f.opp.slice(0,40),v:f.venue,h:f.how.slice(0,8),day:Math.floor(state.save.sim.day)}); R.last.length=Math.min(R.last.length,8);
}

/** After a card brawl: add what it broke to the lasting injuries (they stay until healed). Returns the new ids.
 * @param {{cuts:number,eyeL:boolean,eyeR:boolean,nose:boolean,ribs:number,handL:boolean,handR:boolean,concussion:boolean}} inj */
export function recordInjuries(inj){
  const r=addLasting(state.save.injuries,inj,Math.floor(state.save.sim.day));
  state.save.injuries=r.list; return r.added;
}

/** After a card brawl: what this rival will remember of the player's habits. @param {string} key venue:index @param {Record<string,number>[]} seen */
export function recordHabits(key,seen){ state.save.habits[key]=mergeHabits(state.save.habits[key],seen); }

/** One lasting injury of this kind is healed (the oldest). @param {string} id */
export function healInjury(id){ state.save.injuries=healOne(state.save.injuries,id); }

export function statShort(){ return 'SIŁ '+state.save.stats.str.lvl+' · SZY '+state.save.stats.spd.lvl+' · WYT '+state.save.stats.end.lvl; }

export function persist(){
  if(state.devMode) return true;   /* developer mode: the autosave stays as it was when the mode was switched on */
  const ok=state.saveStore.write();
  if(ok){ state.statsDirty=false; simulationState.simDirty=false; }
  else { state.statsDirty=true; simulationState.simDirty=true; }
  const warning=document.getElementById('saveWarning');
  if(warning){ warning.hidden=ok; warning.textContent=ok?'':'Zapis niedostępny: '+(state.saveStore.error||'sprawdź pamięć przeglądarki')+'. Postęp pozostaje w tej karcie.'; }
  return ok;
}

/** Developer mode (options, only with ?debug=1): doors lead anywhere at any hour, the autosave is not written.
 * Switching it off reloads the page, so the game goes back to the last autosave. @param {boolean} on */
export function setDevMode(on){
  const warning=document.getElementById('saveWarning');
  if(on&&!DEBUG) return;
  if(on&&!state.devMode){ persist(); state.devMode=true; try{ localStorage.setItem('heavybag.dev','1'); }catch(e){} devModeShow(); }
  else if(!on&&state.devMode){ state.devMode=false; try{ localStorage.removeItem('heavybag.dev'); }catch(e){} location.reload(); }
}

/** Show the developer mode: the warning over the picture and the real state of the checkbox in the options
 * (a browser restores a ticked box after a reload even when the mode itself is off). */
function devModeShow(){
  const warning=document.getElementById('saveWarning'), box=/** @type {HTMLInputElement|null} */ (document.getElementById('optDev'));
  if(box) box.checked=state.devMode;
  if(warning&&state.devMode){ warning.hidden=false; warning.textContent='Tryb developera: z drzwi dowolne miejsce o dowolnej porze, autozapis wyłączony. Wyłączenie trybu wczyta ostatni zapis.'; }
}

export function initialize(){


/* =====================================================================
   SAVE AND PROGRESSION
   ===================================================================== */
state.devMode = DEBUG&&(()=>{ try{ return localStorage.getItem('heavybag.dev')==='1'; }catch(e){ return false; } })();   /* it survives a reload, like the snapshot it protects */
queueMicrotask(()=>devModeShow());
state.saveStore = createSaveStore({gearById:GEAR_BY_ID,looks:HERO_LOOKS,lookDefaults:HERO_LOOK,decorById:LEGACY_DECOR_BY_ID,gymTypes:LEGACY_GYM_TYPES,simDefaults:SIM_DEF,xpNeed,storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)}});

state.SAVE_KEY = 'heavybag.save';

state.HAD_SAVE = state.saveStore.hadSave;

state.save = state.saveStore.state;

state.statsDirty = false;
 state.sessXP = {str:0,spd:0,end:0};

setInterval(()=>{ if(state.statsDirty||simulationState.simDirty) persist(); },2000);

addEventListener('pagehide',persist);

{ const from=state.saveStore.migratedFrom;   // levels were recalculated only for saves before v4; v4–v8 get the skill set instead of the deck
  if(from!==null) setTimeout(()=>showToast(from<4?'Nowy system rozwoju: poziomy przeliczono na skalę 1–30 według zdobytego XP, a Profesor zwrócił punkty perków do rozdania.':'Bójki na skille: talię zastąpił zestaw do '+LOADOUT_MAX+' ciosów (karta postaci, zakładka Skille).'+(from>=7?' Punkty za dawne ruchy obrony wróciły do drzewek.':''),true),600); }

applyGear(state.save.eq);
 applyLook(state.save.look);
 applyStats();

}
