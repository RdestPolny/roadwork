import { LEVEL_MAX, TRIAL_LEVELS, migrateLegacyStat } from './stats.js';
import { sanitizeTraits, fightTraits } from './perk-rules.js';
import { prisonDefaults, sanitizePrison, PRISON_ROOMS } from './prison-data.js';
import { sanitizeLasting, sanitizeHabits, sanitizeMoves, sanitizeLoadout, skillPool, startMoves, STARTER_LOADOUT, PERK_CARDS, MOVES, MOVED_TO_NEW_TREE } from './card-data.js';

/**
 * @typedef {{slot:string}} Gear
 * @typedef {{kind:string}} Decor
 * @typedef {{w?:number,h?:number,fixed?:boolean,wall?:boolean,rot?:boolean,max?:number,variants?:unknown[]}} GymType
 * @typedef {{t:string,i:number,j:number,r:number,v?:number}} GymItem
 * @typedef {{lvl:number,xp:number,banked:number}} Stat
 * @typedef {import('./perk-rules.js').TreeSkills} Skills
 * @typedef {import('./perk-rules.js').TraitPick} TraitPick
 * @typedef {{day:number,count:Record<string,number>,best:Record<string,{grade:string,score:number}>,stage:Record<string,number>}} Train
 * @typedef {Record<string,Record<string,boolean>>} Trials
 * @typedef {{day:number,min:number,faza:number,akcje:number,zm:number,glod:number,h:number}} Sim   the day's phase (0 rano, 1 południe, 2 wieczór), actions used, zmęczenie, głód, higiena; min: the phase's nominal hour
 * @typedef {import('./prison-data.js').PrisonSave} PrisonSave
 * @typedef {import('./card-data.js').LastingInjury} LastingInjury
 * @typedef {import('./card-data.js').Habit} Habit
 * @typedef {import('./card-data.js').MoveState} MoveState
 * @typedef {{unlocked:string[],respecs:number}} BareSkills
 * @typedef {{w:number,l:number,d:number,ko:number,koL:number}} Tally   wins, losses, draws, wins by KO, losses by KO
 * @typedef {{spar:Tally,bare:Tally,last:{r:'w'|'l'|'d',o:string,v:string,h:string,day:number}[]}} FightRecord   gloved sparring vs bareknuckle; the last eight fights, newest first
 * @typedef {{version:number,phase:'prison'|'free',prison:PrisonSave,bare:BareSkills,coins:number,owned:string[],eq:Record<string,string>,look:Record<string,string>,record:FightRecord,injuries:LastingInjury[],habits:Record<string,Habit>,moves:Record<string,MoveState>,loadout:string[],stats:Record<string,Stat>,skills:Record<string,Skills>,traits:Record<string,TraitPick[]>,trials:Trials,train:Train,sim:Sim,room:string,decor:Record<string,string>,decorOwned:string[],gym?:GymItem[],gymV?:number,bucketV?:number,cellFrom?:string}} Save
 * @typedef {{gearById:Record<string,Gear>,looks:Record<string,{id:string}[]>,lookDefaults:Record<string,string>,decorById:Record<string,Decor>,gymTypes:Record<string,GymType>,simDefaults:Sim,xpNeed:(level:number)=>number,storage:Pick<Storage,'getItem'|'setItem'>}} SaveConfig
 */

const SAVE_KEY = 'heavybag.save';
const VERSION = 10;
const KNOWN_VERSIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ID = /^[a-z0-9:_-]{1,48}$/;
const GRADES = ['S','A','B','C','D'];
const DEFAULT_EQ = {trunks:'t_royal', gloves:'g_crimson', boots:'b_white', bag:'k_cheap'};
const DEFAULT_DECOR = {floor:'f_check', wall:'w_blue'};

/** @param {unknown} value @returns {Record<string, any>} */
function object(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/** @param {unknown} value @param {number} fallback @param {number} min @param {number} max */
function number(value, fallback, min, max) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

/** @param {SaveConfig} config */
export function createSaveStore(config) {
  const {gearById, looks, lookDefaults, decorById, gymTypes, simDefaults, xpNeed, storage} = config;
  /** @type {string|null} */
  let error = null;
  let writable = true;
  let recovered = false;

  /** @returns {Save} */
  function defaults() {
    const skills=()=>({bonus:0,respecs:0});
    const traits=()=>/** @type {TraitPick[]} */ (['','','']);
    const tally=()=>({w:0,l:0,d:0,ko:0,koL:0});
    const trials=()=>Object.fromEntries(TRIAL_LEVELS.map(l=>[String(l),false]));
    return {version:VERSION, phase:'prison', prison:prisonDefaults(), bare:{unlocked:[],respecs:0}, coins:0, owned:Object.values(DEFAULT_EQ), eq:{...DEFAULT_EQ},
      look:{...lookDefaults}, record:{spar:tally(),bare:tally(),last:[]}, injuries:[], habits:{}, moves:startMoves(), loadout:[...STARTER_LOADOUT], stats:{str:{lvl:1,xp:0,banked:0},spd:{lvl:1,xp:0,banked:0},end:{lvl:1,xp:0,banked:0}},
      skills:{str:skills(),spd:skills(),end:skills()}, traits:{str:traits(),spd:traits(),end:traits()},
      trials:{str:trials(),spd:trials(),end:trials()},
      train:{day:1,count:{},best:{},stage:{}},
      sim:{...simDefaults}, room:'cell', decor:{...DEFAULT_DECOR}, decorOwned:Object.values(DEFAULT_DECOR)};
  }

  /** @param {unknown} data @returns {Save|null} */
  function normalize(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    try {
      const d = object(data), out = defaults();
      if (d.version !== undefined && !KNOWN_VERSIONS.includes(d.version)) return null;
      const legacy = d.version !== VERSION && d.version !== 9 && d.version !== 8 && d.version !== 7 && d.version !== 6 && d.version !== 5 && d.version !== 4;   // v4 → v5 adds the prison act, v5 → v6 lasting injuries, v6 → v7 moves and the deck, v7 → v8 the day in phases, v8 → v9 the skill set instead of the deck, v9 → v10 Cechy and punch trees instead of perks
      const prisonAct = d.version === 5 || d.version === 6 || d.version === 7 || d.version === 8 || d.version === 9 || d.version === VERSION;
      const cardAct = d.version === 6 || d.version === 7 || d.version === 8 || d.version === 9 || d.version === VERSION;
      const deckAct = d.version === 7 || d.version === 8;   // the moves and the deck the skill set is made of
      const phaseAct = d.version === 8 || d.version === 9 || d.version === VERSION;   // the day in phases
      // An empty object is a new game (prison). Older saves keep their free world; v5 stores its phase.
      const fresh = Object.keys(d).length === 0;
      out.phase = fresh ? 'prison' : (prisonAct && (d.phase === 'prison' || d.phase === 'free') ? d.phase : 'free');
      if (!fresh) out.coins = 250, out.room = 'gym';
      if (prisonAct) out.prison = sanitizePrison(d.prison);
      if (cardAct) out.injuries = sanitizeLasting(d.injuries);   // card fights: injuries kept until healed
      if (cardAct) out.habits = sanitizeHabits(d.habits);       // …and what each rival remembers of your habits (absent in early v6 saves)
      { const b = object(d.bare); out.bare = {unlocked:(Array.isArray(b.unlocked) ? [...new Set(b.unlocked)] : []).filter(id => typeof id === 'string' && ID.test(id)).slice(0, 16),
          respecs:Number.isInteger(b.respecs) && b.respecs >= 0 && b.respecs <= 1000 ? b.respecs : 0}; }
      out.coins = number(d.coins, out.coins, 0, Number.MAX_VALUE);
      if (Array.isArray(d.owned)) out.owned = [...new Set(out.owned.concat(d.owned.filter(id => typeof id === 'string' && Object.hasOwn(gearById,id))))];
      for (const slot of Object.keys(out.eq)) {
        const id = object(d.eq)[slot];
        if (typeof id === 'string' && Object.hasOwn(gearById,id) && gearById[id].slot === slot && out.owned.includes(id)) out.eq[slot] = id;
      }
      for (const key of Object.keys(lookDefaults)) {
        const id = object(d.look)[key];
        if (looks[key]?.some(o => o.id === id)) out.look[key] = id;
      }
      {   // the fight record (added with the character sheet: older saves start from zero)
        const r = object(d.record);
        for (const kind of /** @type {const} */ (['spar','bare'])) { const t = object(r[kind]); for (const f of /** @type {const} */ (['w','l','d','ko','koL'])) out.record[kind][f] = Math.floor(number(t[f], 0, 0, 1e6)); }
        out.record.last = (Array.isArray(r.last) ? r.last : []).slice(0, 8).map(object).filter(e => e.r === 'w' || e.r === 'l' || e.r === 'd')
          .map(e => ({r:/** @type {'w'|'l'|'d'} */ (e.r), o:typeof e.o === 'string' ? e.o.slice(0, 40) : '', v:typeof e.v === 'string' && ID.test(e.v) ? e.v : 'gym', h:typeof e.h === 'string' ? e.h.slice(0, 8) : '', day:Math.floor(number(e.day, 1, 1, Number.MAX_SAFE_INTEGER))}));
      }
      for (const key of Object.keys(out.stats)) {
        const s = object(object(d.stats)[key]);
        if (legacy) {
          // Before v4 trees had 10 levels: keep the cumulative XP and place it on the 30-level curve.
          const old = Math.floor(number(s.lvl, 1, 1, 10)), oldXp = number(s.xp, 0, 0, Number.MAX_VALUE);
          out.stats[key] = {...migrateLegacyStat(old, old < 10 && oldXp < Math.round(50*Math.pow(old,1.4)) ? oldXp : 0), banked:0};
          continue;
        }
        const lvl = Math.floor(number(s.lvl, 1, 1, LEVEL_MAX));
        const xp = number(s.xp, 0, 0, Number.MAX_VALUE);
        out.stats[key] = {lvl, xp:lvl < LEVEL_MAX && xp < xpNeed(lvl) ? xp : 0, banked:number(s.banked, 0, 0, 1e7)};
      }
      for (const key of Object.keys(out.trials)) {
        const t = object(object(d.trials)[key]);
        for (const level of TRIAL_LEVELS) out.trials[key][String(level)] = legacy ? out.stats[key].lvl > level : t[String(level)] === true;
      }
      /** @type {string[]} */
      const oldPerks = [];   // tree perks of saves before v10: their points return, a few become gifts below
      for (const key of /** @type {const} */ (['str','spd','end'])) {
        const s = object(object(d.skills)[key]), target = out.skills[key];
        target.bonus = Number.isInteger(s.bonus) && s.bonus >= 0 && s.bonus <= 1000000 ? s.bonus : 0;
        target.respecs = !legacy && Number.isInteger(s.respecs) && s.respecs >= 0 && s.respecs <= 1000000 ? s.respecs : 0;
        if (d.version === VERSION) out.traits[key] = sanitizeTraits(object(d.traits)[key], out.stats[key].lvl);
        else if (!legacy && Array.isArray(s.unlocked)) oldPerks.push(...s.unlocked.filter(id => typeof id === 'string' && ID.test(id)));
      }
      {   // the moves (v7) and the skill set (v9). A v7–v8 deck becomes the set (each skill once, defence drops out);
          // older saves keep what they fought with: the start, the uppercut, the perks' skills
        const perks = [...(/** @type {const} */ (['str','spd','end'])).flatMap(k => fightTraits(k, out.traits[k])), ...out.bare.unlocked];
        const kept = d.version === VERSION || d.version === 9;
        if (kept || deckAct) out.moves = sanitizeMoves(d.moves);
        else if (!fresh) out.moves = sanitizeMoves({upper:{gift:true}});   // the uppercut they had is not paid for with their points
        if (d.version !== VERSION && !fresh) {   // v10: moves now paid by another attribute stay gifts; skills of old perks become moves
          for (const id of MOVED_TO_NEW_TREE) if (out.moves[id] && MOVES[id].price) out.moves[id].gift = true;
          for (const [perk, move] of /** @type {const} */ ([['bomb','dobicie'],['storm','burza']])) if (oldPerks.includes(perk) && !out.moves[move]) out.moves[move] = {picks:'', gift:true};
        }
        const wish = kept ? d.loadout : deckAct ? d.deck : fresh ? null : [...STARTER_LOADOUT, 'upper', ...oldPerks.flatMap(id => PERK_CARDS[id]?.cards || [])];
        if (wish) out.loadout = sanitizeLoadout(wish, skillPool(out.moves, perks));
      }
      {
        const t = object(d.train), out_t = out.train;
        out_t.day = Math.floor(number(t.day, 1, 1, Number.MAX_SAFE_INTEGER));
        for (const [id, n] of Object.entries(object(t.count)).slice(0, 96)) if (ID.test(id) && Number.isInteger(n) && n >= 0 && n <= 1000) out_t.count[id] = n;
        for (const [id, b] of Object.entries(object(t.best)).slice(0, 96)) { const o = object(b); if (ID.test(id) && GRADES.includes(o.grade)) out_t.best[id] = {grade:o.grade, score:number(o.score, 0, 0, 100)}; }
        for (const [id, n] of Object.entries(object(t.stage)).slice(0, 96)) if (ID.test(id) && Number.isInteger(n) && n >= 1 && n <= 5) out_t.stage[id] = n;
      }
      {   // the day in phases (v8); older saves: the phase of their hour, tiredness from energy, hunger from food
        const t = object(d.sim), PHASE_MIN = [8*60, 14*60, 19*60];
        out.sim.day = Math.floor(number(t.day, simDefaults.day, 1, Number.MAX_SAFE_INTEGER));
        out.sim.h = number(t.h, simDefaults.h, 0, 100);
        if (phaseAct || fresh) {
          out.sim.faza = Math.floor(number(t.faza, 0, 0, 2)); out.sim.akcje = Math.floor(number(t.akcje, 0, 0, 2));
          out.sim.zm = Math.floor(number(t.zm, 0, 0, 8)); out.sim.glod = Math.floor(number(t.glod, 0, 0, 5));
        } else {
          const m = number(t.min, simDefaults.min, 0, 1439), e = number(t.e, 85, 0, 100), f = number(t.f, 70, 0, 100);
          out.sim.faza = m < 12*60 ? 0 : m < 17*60+30 ? 1 : 2;
          out.sim.zm = Math.max(0, Math.min(4, Math.round((100 - e) / 20)));
          out.sim.glod = f >= 60 ? 0 : f >= 35 ? 1 : f >= 15 ? 2 : 3;
        }
        out.sim.min = PHASE_MIN[out.sim.faza];
      }
      if (d.room === 'izolatka') out.room = 'cell'; // Retired room in existing saves.
      if (['gym','home','cell','yard','canteen','laznia'].includes(d.room)) out.room = d.room;
      if (out.phase === 'prison' && !PRISON_ROOMS.includes(out.room)) out.room = 'cell';
      if (d.cellFrom === 'gym') out.cellFrom = 'gym';
      if (Array.isArray(d.decorOwned)) out.decorOwned = [...new Set(out.decorOwned.concat(d.decorOwned.filter(id => typeof id === 'string' && Object.hasOwn(decorById,id))))];
      for (const kind of Object.keys(out.decor)) {
        const id = object(d.decor)[kind];
        if (typeof id === 'string' && Object.hasOwn(decorById,id) && decorById[id].kind === kind && out.decorOwned.includes(id)) out.decor[kind] = id;
      }
      if (Array.isArray(d.gym)) {
        out.gym = [];
        for (const entry of d.gym) {
          const it = object(entry), t = it.t;
          if (typeof t !== 'string' || !Object.hasOwn(gymTypes,t)) continue;
          const type = gymTypes[t];
          if (type.fixed || typeof type.w !== 'number' || typeof type.h !== 'number' || !Number.isFinite(type.w) || !Number.isFinite(type.h) || type.w <= 0 || type.h <= 0) continue;
          const r = type.rot && it.r === 1 ? 1 : 0;
          const w = r ? type.h : type.w, h = r ? type.w : type.h;
          if (!Number.isInteger(it.i) || !Number.isInteger(it.j) || it.i < 0 || it.j < 0 || it.i+w > 12 || it.j+h > 10) continue;
          if (type.wall && !((it.i === 0 && it.j+h <= 3.6) || it.j === 0)) continue;
          if (type.max && out.gym.filter(o => o.t === t).length >= type.max) continue;
          const variants = t === 'bag' ? Object.values(gearById).filter(o => o.slot === 'bag').length : type.variants?.length || 1;
          /** @type {GymItem} */
          const item = {t, i:it.i, j:it.j, r};
          if (it.v !== undefined) item.v = Number.isInteger(it.v) && it.v >= 0 && it.v < variants ? it.v : 0;
          out.gym.push(item);
        }
      }
      if (Number.isInteger(d.gymV) && d.gymV >= 0) out.gymV = d.gymV;
      if (Number.isInteger(d.bucketV) && d.bucketV >= 0) out.bucketV = d.bucketV;
      return out;
    } catch {
      return null;
    }
  }

  /** @type {Save} */
  const state = defaults();

  /** @param {unknown} data */
  function merge(data) {
    const next = normalize(data);
    if (!next) { error = 'Nieprawidłowy zapis lub nieobsługiwana wersja.'; return false; }
    for (const key of Object.keys(state)) delete object(state)[key];
    Object.assign(state, next);
    return true;
  }

  /** @param {unknown} cause */
  function fail(cause) {
    error = cause instanceof Error ? cause.message : String(cause);
  }

  /** @param {string} raw */
  function decode(raw) {
    const data = normalize(JSON.parse(raw));
    if (!data) throw new Error('Nieprawidłowy zapis lub nieobsługiwana wersja.');
    return data;
  }

  function read() {
    let raw = null;
    try {
      raw = storage.getItem(SAVE_KEY);
      return raw === null ? null : decode(raw);
    } catch (cause) {
      writable = false;
      fail(cause);
      if (raw !== null) {
        try { storage.setItem(SAVE_KEY+'.corrupt', raw); } catch { /* Keep the original save in place. */ }
      }
      return null;
    }
  }

  let hadSave = false;
  /** @type {number|null} Version of the stored autosave when it predates the current schema. */
  let migratedFrom = null;
  try {
    const raw = storage.getItem(SAVE_KEY);
    hadSave = raw !== null;
    if (raw !== null) { const v = object(JSON.parse(raw)).version; if (v !== VERSION && (v === undefined || KNOWN_VERSIONS.includes(v))) migratedFrom = typeof v === 'number' ? v : 0; }
  } catch (cause) { if (!(cause instanceof SyntaxError)) { writable = false; fail(cause); } }
  const initial = read();
  if (initial) merge(initial); else migratedFrom = null;

  function write() {
    if (!writable) return false;
    try {
      const next = normalize(state);
      if (!next) throw new Error('Nieprawidłowy zapis lub nieobsługiwana wersja.');
      const raw = storage.getItem(SAVE_KEY);
      // Backup is best effort: quota must not prevent saving current progress.
      if (raw !== null) {
        try {
          decode(raw);
          try { storage.setItem(SAVE_KEY+'.backup', raw); } catch { /* The original survives until the new write succeeds. */ }
        } catch (cause) {
          if (!recovered) {
            writable = false;
            fail(cause);
            try { storage.setItem(SAVE_KEY+'.corrupt', raw); } catch { /* The original remains untouched. */ }
            return false;
          }
        }
      }
      storage.setItem(SAVE_KEY, JSON.stringify(next));
      recovered = false;
      error = null;
      return true;
    } catch (cause) { fail(cause); return false; }
  }

  /** @param {number} i */
  function readSlot(i) {
    if (!Number.isInteger(i) || i < 1 || i > 3) return null;
    try {
      const raw = storage.getItem('heavybag.slot.'+i);
      if (raw === null) return null;
      const slot = object(JSON.parse(raw)), data = normalize(slot.data);
      return data && typeof slot.ts === 'number' && Number.isFinite(slot.ts) && slot.ts >= 0 ? {ts:slot.ts,data} : null;
    } catch (cause) { fail(cause); return null; }
  }

  /** @param {number} i */
  function writeSlot(i) {
    if (!Number.isInteger(i) || i < 1 || i > 3) { error = 'Nieprawidłowy numer slotu.'; return false; }
    if (!writable) return false;
    try {
      const data = normalize(state);
      if (!data) throw new Error('Nieprawidłowy zapis lub nieobsługiwana wersja.');
      const previous = storage.getItem('heavybag.slot.'+i);
      if (previous !== null) {
        const version = object(object(JSON.parse(previous)).data).version;
        if (version !== undefined && !KNOWN_VERSIONS.includes(version)) throw new Error('Nieobsługiwana wersja zapisu w slocie.');
      }
      storage.setItem('heavybag.slot.'+i, JSON.stringify({ts:Date.now(),data}));
      error = null;
      return true;
    } catch (cause) { fail(cause); return false; }
  }

  return {state, hadSave, migratedFrom, get writable() { return writable; }, get error() { return error; },
    merge, read, write, readSlot, writeSlot, recover() { recovered = true; writable = true; error = null; }};
}
