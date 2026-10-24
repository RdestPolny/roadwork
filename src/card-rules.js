/* Skill combat engine (KARCIANKA.md). Pure and deterministic: every random choice takes an `rng` argument.
   A turn: both sides queue skills for stamina (`queueSkill`, the AI through `aiPlan`); `startExchange` pays the
   stamina and lays both queues on one clock by tempo (a jab 1, a cross 2, an uppercut 3; each side's moves follow one
   another, a combination splits into its punches). Then `resolveBlow` once per blow with the defender's reaction:
   the player's dodge or parry graded by card-fight, the AI's block from `aiReaction`. Every reaction costs a point of
   the next turn's stamina (the debt). `getUp` after a knockdown; the last blow ends the turn (bleeding, the reserve,
   the next bar). Perks of the trees act through `has(f,id)` at the few places where they bend a rule.
   Every plain punch hands on a status (CIOSY.md §2): the jab Ustawienie, the cross Przebicie, the hook Zachwianie,
   the uppercut Rozbita garda, the body jab heavy legs, the body cross Odepchnięcie, the liver hook Wątroba, the body
   uppercut Zgięty. */

import {CARDS,tempoOf,OPEN_EFFECT,REACT,REACT_COST,FAIL_DODGE,FAIL_FX,FAIL_PARRY,FAIL_PARRY_HEAVY,STA_MAX,STA_MIN,QUEUE_MAX,LOCK_COST,
  STUN_DAZE,STUN_LEGS,STUN_KD,STUN_DECAY,STYLE_AI,AI_SYNERGY,AI_REPEAT,skillsFor,SETUP,SWAY,CRACK_BLOCK,LIVER_EVERY,TELEGRAPH,CHEAP_PUNCH} from './card-data.js';
import {treePassives} from './stats.js';

/** @typedef {import('./card-data.js').CardDef} CardDef */
/** @typedef {'perfect'|'good'|'late'} Grade  a clean moment, inside the window, missed */
/** @typedef {{kind:'none'|'dodge'|'parry',grade:Grade}} Reaction  the defender's answer to one blow (an AI block is a parry) */
/** @typedef {0|1} Side */
/** @typedef {{card:string,cost:number}} Queued */
/**
 * One punch on the exchange clock.
 * @typedef {object} Blow
 * @property {Side} side  the attacker
 * @property {string} card  the skill
 * @property {string} use  the card whose numbers it hits with (a combination: its jab, cross, hook)
 * @property {number} hit  which punch of the skill (0 = the first; the first one pays the Otwarcie)
 * @property {number} idx  place in the attacker's queue (bonus punches: 100+)
 * @property {number} start  the clock when the move starts
 * @property {number} t  the clock when it lands
 * @property {boolean} dead
 * @property {boolean} bonus  a free punch a perk added (Podwójny jab, Lustrzana kontra…)
 * @property {boolean} low
 */
/** @typedef {{cuts:number,scars:number,eyeL:boolean,eyeR:boolean,nose:boolean,ribs:number,handL:boolean,handR:boolean,concussion:boolean,legs:boolean,armL:boolean,armR:boolean,shoulder:boolean}} Injuries  scars: old cuts that reopen easily; arms and the shoulder last this brawl only (Cechy) */
/**
 * @typedef {object} Fighter
 * @property {string} name
 * @property {string} style
 * @property {number} hp
 * @property {number} hpMax
 * @property {number} sta  this turn's bar (what is left after `spent` is paid is the reserve)
 * @property {number} staMax  the bar's length: body shots (Zadyszka), ribs and the nose shorten it
 * @property {number} debt  stamina the reactions of this turn take off the next bar
 * @property {number} gain  stamina perks add to the next bar
 * @property {number} stun  Zamroczenie 0–10
 * @property {boolean} dazed  above STUN_DAZE in the current stretch (narrower reaction windows)
 * @property {number} knockdowns
 * @property {number} pow
 * @property {number} stunDealt
 * @property {number} read  reading level of the rival's queue
 * @property {string[]} skills  the set this fighter took into the brawl
 * @property {Queued[]} queue
 * @property {number} spent  stamina queued this turn
 * @property {number} open  Otwarcie 0–III
 * @property {number} openTurn  the turn it was gained (lasts this and the next turn)
 * @property {boolean} setup  Ustawienie: a landed jab — the next punch this turn that is not a jab hits harder
 * @property {boolean} miarka  a landed jab with Miarka: next uppercut this turn cannot be blocked
 * @property {number} headCrits
 * @property {number} perfects  clean skill moments: they raise fight XP, never damage
 * @property {Injuries} inj
 * @property {string[]} perks  tree and Spacerniak perks in this brawl (rivals: also their own)
 * @property {Record<string,number>} used  once-a-brawl skills → the turn they were played
 * @property {boolean} locked  ogłuszony this turn: the bar was shorter
 * @property {boolean} lockNext  …the next one
 * @property {string[]} turnKinds  punches landed this turn (Demolka)
 * @property {import('./card-data.js').Bias[]} bias  a rival's habits: skills the AI likes a little more
 * @property {number} block  AI: chance to block a punch
 * @property {number} parry  AI: chance a block is a clean parry
 * @property {Set<string>} nodes  punch-tree nodes taken into the brawl ('jab:1a' = the jab's level I, node A; CIOSY.md §3)
 * @property {string} prev  the punch of this fighter's previous blow this turn ('' at the start): Hak z obrotu, Spod gardy
 * @property {boolean} prevClean  …and whether it got through (not blocked, dodged or lost)
 * @property {number} spd  Szybkość level: a wider dodge (+1 tick at 5, 10 and 15) and tempo ties after the reserve
 * @property {number} hunger  0 fed, 1 hungry, 2 starving: every punch that much softer (at least 1)
 * @property {Record<string,number>} x  perk counters: streak, flurry, jabs, counter, duckTurn, slowTurn, crackTurn, crush,
 *   broken, blindTurn, rage, standUsed, secondUsed, riseUsed, zoneTurn, zoneUsed, jawUsed, bodyTurn, econTurn, legsTurn
 *   (heavy legs: a narrower dodge), shellUsed, parries, crackTurn (Rozbita garda), wind (Zadyszka on the next bar),
 *   liver (liver hooks taken), bentTurn (Zgięty: the next head punch cannot be blocked)
 */
/** @typedef {Record<string,number>} TypeCounts */
/**
 * @typedef {object} Duel
 * @property {[Fighter,Fighter]} f
 * @property {'plan'|'fight'|'getup'|'over'} phase
 * @property {number} turn
 * @property {Side} init  who goes first when two blows land at once
 * @property {boolean} close  distance: Blisko / Daleko (they part after every turn)
 * @property {number} maxTurns  0 = no limit (Sunday beating uses a limit)
 * @property {-1|Side} winner
 * @property {''|'ko'|'nokdaun'|'czas'|'remis'} end
 * @property {-1|Side} down  waiting for getUp
 * @property {Blow[]} blows  this turn's exchange, in the order they land
 * @property {number} step  the blow to resolve next
 * @property {number} bonusN
 * @property {[TypeCounts[],TypeCounts[]]} memory  memory[side][place]: the rival's skills seen at that place of his queue
 */
/**
 * @typedef {object} CardEvent
 * @property {string} t  hit, whiff, dodge, parry, open, przelot, fizzle, debt, zadyszka, legs, reserve, skurcz, injury, wound,
 *   handpain, knockdown, ko, bleed, turn, sand, thumb, broken, burst, rage, lock, gain, waste, guard (Rozbita garda),
 *   slow (heavy legs: later punches), push (Odepchnięcie), bent (Zgięty)
 * @property {Side} side  who acts (the attacker for hits, the defender for dodges and parries)
 * @property {string} [card]
 * @property {number} [dmg]
 * @property {number} [stun]
 * @property {boolean} [low]
 * @property {string} [tag]
 * @property {number} [level]
 * @property {string} [injury]
 * @property {Grade} [grade]
 */
/** @typedef {{heavy:boolean,card?:string}} MoveTell */
/** @typedef {{level:number,count:number,spent:number,moves:MoveTell[]}} Tells */
/** @typedef {{name?:string,style?:string,levels?:{str:number,spd:number,end:number},skills?:string[],injuries?:Partial<Injuries>,read?:number,perks?:string[],bias?:import('./card-data.js').Bias[],block?:number,parry?:number,tired?:number,hunger?:number,nodes?:string[]}} FighterSpec  tired: the day's zmęczenie (the bar is that much shorter); hunger: punches that much softer */

/** Health before Wytrzymałość: a turn trades every queued punch, so it is more than the card fights had (30). */
const HP_BASE=42;
/** Cechy (PERKI.md §3): Byczy kark health, Szczęśliwy unik chance, Kolczasta garda share, Stłuczone przedramię chance,
 * Rozcinacz cut chance, Kat health share. */
const BULL_NECK=6, LUCKY_SLIP=0.1, SPIKES=0.25, FOREARM=0.15, CUTTER=0.05, HEADSMAN=0.2;

/** Small seeded generator for fights and simulations. @param {number} seed @returns {() => number} */
export function mulberry(seed){
  let a=seed>>>0;
  return ()=>{ a=(a+0x6D2B79F5)>>>0; let t=a; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; };
}

/** Does this fighter carry the perk into the brawl? @param {Fighter} f @param {string} id */
export function has(f,id){ return f.perks.includes(id); }

/** Does this fighter carry the node of a punch tree ('jab:1a')? @param {Fighter} f @param {string} key */
export function nd(f,key){ return f.nodes.has(key); }

/** A punch that has to close the distance first: from Daleko it steps in (+1 tempo). @param {string} id */
function stepsIn(id){ return !!CARDS[id]?.close; }

/** A fighter ready for a duel: the skill set, persistent injuries, the AI's blocking.
 * @param {FighterSpec} spec @returns {Fighter} */
export function makeFighter(spec){
  const lv=spec.levels||{str:1,spd:1,end:1}, style=STYLE_AI[spec.style||'']?/** @type {string} */ (spec.style):'bal', perks=[...new Set(spec.perks||[])];
  /** @type {Injuries} */
  const inj={cuts:0,scars:0,eyeL:false,eyeR:false,nose:false,ribs:0,handL:false,handR:false,concussion:false,legs:false,armL:false,armR:false,shoulder:false,...spec.injuries};
  const skills=[...new Set((spec.skills||skillsFor(perks,style)).filter(id=>CARDS[id]))];
  const staMax=Math.max(1,Math.max(STA_MIN,STA_MAX+Math.floor((lv.end-1)/4)-inj.ribs-(inj.nose?1:0))-(spec.tired||0));
  const ai=STYLE_AI[style];
  const hp=HP_BASE+lv.end+(perks.includes('bull-neck')?BULL_NECK:0);   // Byczy kark
  return {name:spec.name||'',style,hp,hpMax:hp,spd:lv.spd,nodes:new Set(spec.nodes||[]),prev:'',prevClean:false,sta:staMax,staMax,debt:0,gain:0,
    stun:0,dazed:false,knockdowns:0,pow:treePassives('str',lv.str).pow,stunDealt:treePassives('str',lv.str).stunDealt,
    read:(spec.read??0)+(perks.includes('read-tells')?2:0),skills,queue:[],spent:0,
    open:perks.includes('zaskoczenie')?1:0,openTurn:1,setup:false,miarka:false,headCrits:0,perfects:0,inj,
    perks,used:{},locked:false,lockNext:false,turnKinds:[],bias:spec.bias||[],block:spec.block??ai.block,parry:spec.parry??ai.parry,hunger:spec.hunger||0,
    x:{streak:0,flurry:0,jabs:0,counter:0,duckTurn:-9,slowTurn:0,crackTurn:-9,crush:0,broken:0,blindTurn:0,rage:0,standUsed:0,secondUsed:0,riseUsed:0,
      zoneTurn:0,zoneUsed:0,jawUsed:0,bodyTurn:0,econTurn:0,legsTurn:0,shellUsed:0,parries:0,wind:0,liver:0,bentTurn:0,katUsed:0,
      setupN:0,unblock:0,drop:0,anchorTurn:0,liverTurn:0,defTurn:0,crackNow:0,crackHard:0,bentN:0,windStack:0,
      cHook:-9,swayTurn:0,breakTurn:0,headBreak:0,windNext:0,windedTurn:0,noAir:0,jk:0,jkAll:0,antUsed:0,dictTurn:0,ribsReady:0}};
}

/** @param {Fighter} a @param {Fighter} b @param {() => number} rng @param {{maxTurns?:number}} [opts] @returns {Duel} */
export function newDuel(a,b,rng,opts={}){
  void rng;
  return {f:[a,b],phase:'plan',turn:1,init:b.spd>a.spd?1:0,close:false,maxTurns:opts.maxTurns||0,winner:-1,end:'',down:-1,blows:[],step:0,bonusN:0,memory:[[],[]]};
}

/** Stamina a skill costs this fighter now: broken ribs make hooks and uppercuts dearer, the Szał cheaper.
 * @param {Fighter} f @param {string} id */
export function skillCost(f,id){
  const c=CARDS[id]; let k=c.cost;
  if(id==='hook'||id==='upper') k+=f.inj.ribs;
  if(id==='jab-k'&&nd(f,'jab-k:1a')&&!f.queue.some(q=>q.card==='jab-k')) k=0;            // Kłucie: the first one is free
  if(id==='zoladek'&&nd(f,'zoladek:4b')&&f.x.ribsReady) k=Math.min(k,2);                    // Pod żebra: after last turn's parry
  if(f.x.rage>0) k=Math.max(0,k-1);
  return k;
}

/** Why a skill cannot be queued now ('' when it can). @param {Duel} d @param {Side} side @param {string} id */
export function canQueue(d,side,id){
  const f=d.f[side], c=CARDS[id];
  if(d.phase!=='plan') return 'faza';
  if(!c||!f.skills.includes(id)) return 'skill';
  if(f.queue.length>=QUEUE_MAX) return 'pelna';
  if(f.inj.shoulder&&c.cost>=3) return 'bark';   // Wybity bark
  if(f.spent+skillCost(f,id)>f.sta) return 'kondycja';
  if(c.once){
    const again=has(f,'bezzasad')&&c.dirty?f.used[id]===d.turn:f.used[id]!==undefined;
    if(again||f.queue.some(q=>q.card===id)) return 'raz';
  }
  return '';
}

/** Queue a skill at the end of the turn's queue. Returns '' or the reason it cannot go. @param {Duel} d @param {Side} side @param {string} id */
export function queueSkill(d,side,id){
  const why=canQueue(d,side,id); if(why) return why;
  const f=d.f[side], cost=skillCost(f,id);
  f.queue.push({card:id,cost}); f.spent+=cost;
  return '';
}

/** Take a queued skill back (the last one when `idx` is left out). @param {Duel} d @param {Side} side @param {number} [idx] */
export function unqueue(d,side,idx){
  const f=d.f[side]; if(d.phase!=='plan'||!f.queue.length) return;
  const [q]=f.queue.splice(idx??f.queue.length-1,1); if(q) f.spent-=q.cost;
}

/** A clean punch moment (PERFECT): fight XP, never damage. @param {Duel} d @param {Side} side */
export function notePerfect(d,side){ d.f[side].perfects++; }

/** Strefa: once a brawl the whole rival queue shows before the player is done. @param {Duel} d @param {Side} side */
export function useZone(d,side){
  const f=d.f[side]; if(d.phase!=='plan'||!has(f,'the-zone')||f.x.zoneUsed) return false;
  f.x.zoneUsed=1; f.x.zoneTurn=d.turn; return true;
}

/** What `viewer` can read of the rival's queue (§5). Level 0 — the default — shows nothing at all; 1: how many moves
 * and for how much stamina; 2: which of them are heavy; 3+: every skill (Strefa, Szef). @param {Duel} d @param {Side} viewer @returns {Tells} */
export function tells(d,viewer){
  const me=d.f[viewer], o=d.f[1-viewer];
  const zone=me.x.zoneTurn===d.turn, blind=me.x.blindTurn>=d.turn;
  const level=zone?9:blind?0:Math.max(0,me.read-(me.stun>=STUN_DAZE?1:0));
  if(level<1) return {level:0,count:0,spent:0,moves:[]};
  return {level,count:o.queue.length,spent:o.spent,moves:level<2?[]:o.queue.map(q=>({heavy:CARDS[q.card].heavy,...(level>=3?{card:q.card}:{})}))};
}

/** The moves of one queue on the exchange clock: each starts when the one before it lands; a combination splits into
 * its punches one tempo apart; the first close-range punch steps in. @param {Duel} d @param {Side} side @returns {Blow[]} */
export function layBlows(d,side){
  const f=d.f[side], X=f.x;
  /** @type {Blow[]} */
  const out=[];
  let t=0, step=!d.close, prevLow=/** @type {boolean|null} */ (null), prevId='', crossed=false;   // Kotwica: he starts a tempo late
  f.queue.forEach((q,k)=>{
    const c=CARDS[q.card], hits=c.hits||1;
    let dt=tempoOf(c);
    if(c.id==='watroba'&&nd(f,'watroba:1b')){ dt-=1; if(stepsIn(c.id)&&step) step=false; }  // Bez kroku: a tempo quicker, closes in without a step
    if(stepsIn(c.id)&&step&&!(c.id==='hook'&&nd(f,'hook:1a'))){ dt+=1; step=false; }          // Krótki hak: no step
    if(k===0&&X.anchorTurn===d.turn) dt+=1;                                                 // Kotwica: his first move lands a tempo late
    if((c.id==='upper'&&nd(f,'upper:1b'))||(c.id==='zoladek'&&nd(f,'zoladek:1a'))) dt-=1;   // Krótki zamach, Taran
    if(c.id==='cross'&&!crossed&&nd(f,'cross:2b')) dt-=1;                                   // Kosa: the first cross
    if(c.id==='splot'&&k===0&&nd(f,'splot:1b')) dt-=1;                                      // Z dystansu
    if(prevId==='jab-k'&&!c.low&&nd(f,'jab-k:2a')) dt-=1;                                   // Zmiana piętra
    if(prevId==='jab'&&c.id==='cross'&&nd(f,'cross:1b')) dt-=1;                              // Raz-dwa
    if(c.id==='hook'&&X.cHook>=d.turn-1&&nd(f,'hook:4b')) dt-=1;                             // Kontrhak
    if(c.id==='zoladek'&&X.ribsReady&&nd(f,'zoladek:4b')) dt-=1;                             // Pod żebra
    if(c.id==='cross') crossed=true;
    if(has(f,'momentum')&&k>=2) dt-=1;
    if(has(f,'level-change')&&prevLow!==null&&prevLow!==!!c.low) dt-=1;
    if((c.as||c.id)==='upper'&&X.duckTurn>=d.turn-1) dt-=1;
    dt=Math.max(hits,dt);
    const start=t; t+=dt;
    for(let h=0;h<hits;h++){
      const use=c.seq?c.seq[h]:c.id;
      out.push({side,card:c.id,use,hit:h,idx:k,start,t:t-(hits-1-h),dead:false,bonus:false,low:!!CARDS[use].low||!!c.low});
    }
    prevLow=!!c.low; prevId=c.id;
  });
  return out;
}

/** Pay the queued stamina, spend the once-a-brawl skills, remember what the rival showed and lay both queues on one
 * clock. Two blows landing together go in the order of the initiative. @param {Duel} d @param {() => number} rng @returns {CardEvent[]} */
export function startExchange(d,rng){
  /** @type {CardEvent[]} */
  const ev=[];
  if(d.phase!=='plan') return ev;
  d.f.forEach((f,side)=>{
    f.sta-=f.spent;
    for(const q of f.queue) if(CARDS[q.card].once) f.used[q.card]=d.turn;
    const mem=d.memory[1-side];
    f.queue.slice(0,4).forEach((q,i)=>{ const m=mem[i]||(mem[i]={}); m[q.card]=(m[q.card]||0)+1; });
  });
  const rank=(/** @type {Blow} */ b)=>b.side===d.init?0:1;
  d.blows=[...layBlows(d,0),...layBlows(d,1)].sort((a,b)=>a.t-b.t||rank(a)-rank(b)||a.idx-b.idx||a.hit-b.hit);
  d.step=0; d.bonusN=0; d.phase='fight';
  if(!nextBlow(d)) endTurn(d,rng,ev);
  return ev;
}

/** The blow to resolve next (dead ones are skipped), or null when the exchange is over. @param {Duel} d @returns {Blow|null} */
export function nextBlow(d){
  if(d.phase!=='fight') return null;
  while(d.step<d.blows.length&&d.blows[d.step].dead) d.step++;
  return d.blows[d.step]||null;
}

/** The reaction windows of `side` against a punch of this skill, in ticks either side of the impact: the dodge is easy,
 * the parry hard. Being dazed, a concussion, blood in the eye, heavy legs and a black eye on the punch's side narrow
 * them; Szybkość, Lekka stopa, Szermierz and a telegraphed punch (the same skill again) widen them. @param {Duel} d @param {Side} side @param {'dodge'|'parry'} kind @param {string} [card] */
export function reactWindow(d,side,kind,card=''){
  const f=d.f[side], c=CARDS[card];
  let k=0;
  if(f.stun>=STUN_DAZE) k-=2;
  if(f.inj.concussion) k-=1;
  if(f.inj.cuts>=2) k-=1;
  if(c?.hand&&(c.hand==='L'?f.inj.eyeR:f.inj.eyeL)) k-=2;   // the rival's hand comes in on the opposite side
  if(kind==='dodge') k+=Math.min(3,Math.floor(f.spd/5));   // Szybkość: +1 tick at 5, 10 and 15
  if(kind==='dodge'){ if(has(f,'light-feet')) k+=3; else if(f.x.legsTurn>=d.turn||f.inj.legs) k-=4; }
  if(kind==='parry'&&has(f,'parry')) k+=2;
  const b=nextBlow(d); if(b&&b.side!==side&&telegraphed(d,b)) k+=TELEGRAPH.ticks;
  if(kind==='parry'&&f.x.drop&&b&&b.side!==side&&!b.low) k-=2;   // Opuszczona garda (jab na korpus II B)
  const ok=Math.max(2,REACT[kind].ok+k);
  return {ok,clean:Math.min(REACT[kind].clean,ok)};
}

/** Telegraf: the blow is the same skill as the move queued right before it. @param {Duel} d @param {Blow} b */
export function telegraphed(d,b){ return !b.bonus&&b.hit===0&&b.idx>0&&d.f[b.side].queue[b.idx-1]?.card===b.card; }

/** A reaction to this skill costs nothing: a cheap punch is not worth a point of the next turn. @param {CardDef} c */
function cheap(c){ return c.kind!=='trik'&&c.cost<=CHEAP_PUNCH*(c.hits||1); }

/** A punch landing during a heavy wind-up of the rival stops it (body shots; Przerywnik, Przez środek; Przerywacz stops any
 * punch for 2+). Nieprzerywalny wind-ups hold; a broken uppercut with Zamach-zwód gives its stamina back and Otwarcie I.
 * @param {Duel} d @param {Blow} b @param {Side} t the rival @param {CardEvent[]} ev @param {boolean} any every punch for 2+ @returns {boolean} stopped */
function stopWindUp(d,b,t,ev,any){
  const D=d.f[t], steady=(/** @type {string} */ id)=>(id==='upper'&&nd(D,'upper:4a'))||(id==='zoladek'&&nd(D,'zoladek:4a'));
  const w=d.blows.find((x,i)=>i>d.step&&x.side===t&&!x.dead&&(CARDS[x.card].heavy||(any&&CARDS[x.card].cost>=2))&&x.start<b.t&&!steady(x.card));
  if(!w) return false;
  killNext(d,t); ev.push({t:'fizzle',side:t,card:w.card,tag:'zamach przerwany'});
  if(w.card==='upper'&&nd(D,'upper:4b')){ D.gain+=CARDS.upper.cost; grantOpen(d,t,1); ev.push({t:'gain',side:t,level:CARDS.upper.cost},{t:'open',side:t,level:1}); }   // Zamach-zwód
  return true;
}

/** The move of `side` that will land after the current blow is lost: all punches of it. @param {Duel} d @param {Side} side @returns {string} the lost skill, '' when none */
function killNext(d,side){
  for(let i=d.step+1;i<d.blows.length;i++){
    const b=d.blows[i];
    if(b.side===side&&!b.dead&&!b.bonus){ for(const x of d.blows) if(x.side===side&&x.idx===b.idx) x.dead=true; return b.card; }
  }
  return '';
}

/** A free punch a perk adds right after the current blow; it can be dodged or blocked like any other.
 * @param {Duel} d @param {Side} side @param {string} card */
function insertBonus(d,side,card){
  const cur=d.blows[d.step], t=cur?cur.t:0;
  d.blows.splice(d.step+1,0,{side,card,use:card,hit:0,idx:100+(d.bonusN++),start:t,t,dead:false,bonus:true,low:!!CARDS[card].low});
}

/** @param {Duel} d @param {Side} side @param {number} level */
function grantOpen(d,side,level){ const f=d.f[side]; if(level>f.open) f.open=level; f.openTurn=d.turn; }

/** @param {Duel} d @param {Side} side @param {string} id @param {CardEvent[]} ev */
function injure(d,side,id,ev){
  const f=d.f[side], i=f.inj;
  if(id==='cut'){ if(i.cuts>=5) return; i.cuts++; }
  else if(id==='eyeL'||id==='eyeR'){ if(i[id]) return; i[id]=true; }
  else if(id==='nose'){ if(i.nose) return; i.nose=true; f.staMax=Math.max(STA_MIN,f.staMax-1); }
  else if(id==='rib'){ if(i.ribs>=3) return; i.ribs++; f.staMax=Math.max(STA_MIN,f.staMax-1); }
  else if(id==='handL'||id==='handR'){ if(i[id]) return; i[id]=true; }
  else if(id==='concussion'){ if(i.concussion) return; i.concussion=true; }
  else if(id==='legs'){ if(i.legs) return; i.legs=true; }
  else if(id==='armL'||id==='armR'||id==='shoulder'){ if(i[id]) return; i[id]=true; }
  ev.push({t:'injury',side,injury:id});
}

/** A reaction costs a point of the next bar, unless a perk pays for it. @param {Duel} d @param {Side} side @param {boolean} free @param {CardEvent[]} ev */
function payReaction(d,side,free,ev){
  const f=d.f[side];
  if(!free&&has(f,'shell')&&!f.x.shellUsed){ f.x.shellUsed=1; free=true; }   // Skorupa: the first defence of the turn
  if(free) return;
  f.debt=Math.min(f.staMax,f.debt+REACT_COST); ev.push({t:'debt',side,level:f.debt});
}

/** Sting, heavy legs, Odepchnięcie: the rival's later blows this turn (from the move `from` of his queue) come a tempo
 * slower; the clock is sorted again. @param {Duel} d @param {Side} side the slowed one @param {number} [from] */
function slowDown(d,side,from=0){
  const tail=d.blows.splice(d.step+1);
  for(const b of tail) if(b.side===side&&b.idx>=from){ b.t+=1; b.start+=1; }
  d.blows.push(...tail.sort((a,b)=>a.t-b.t));
}

/**
 * Resolve the next blow with the defender's reaction. Returns the events; when it was the last blow, the turn ends too.
 * @param {Duel} d @param {Reaction} react @param {() => number} rng @returns {CardEvent[]}
 */
export function resolveBlow(d,react,rng){
  /** @type {CardEvent[]} */
  const ev=[];
  const b=nextBlow(d); if(!b) return ev;
  if(CARDS[b.card].kind==='trik') trick(d,b,react,ev,rng); else punch(d,b,react,ev,rng);
  d.f[b.side].prev=b.use; d.f[b.side].prevClean=ev.some(e=>e.t==='hit'&&e.side===b.side&&e.tag!=='blok');
  if(stepsIn(b.use)&&!b.dead) d.close=true;
  if(d.phase!=='fight') return ev;
  d.step++;
  if(!nextBlow(d)) endTurn(d,rng,ev);
  return ev;
}

/** The dirty tricks: sand in the eyes always gets in; the thumb is stopped by a good dodge or parry.
 * @param {Duel} d @param {Blow} b @param {Reaction} react @param {CardEvent[]} ev @param {() => number} rng */
function trick(d,b,react,ev,rng){
  const t=/** @type {Side} */ (1-b.side), D=d.f[t], ok=react.kind!=='none'&&react.grade!=='late';
  if(react.kind!=='none') payReaction(d,t,false,ev);
  if(b.card==='piach'){ D.x.blindTurn=d.turn+1; ev.push({t:'sand',side:b.side}); }
  else if(b.card==='kciuk'){
    if(ok){ ev.push({t:'waste',side:b.side,card:b.card}); return; }
    ev.push({t:'thumb',side:b.side}); injure(d,t,D.inj.eyeL?'eyeR':rng()<0.5?'eyeL':'eyeR',ev);
    const lost=killNext(d,t); if(lost) ev.push({t:'fizzle',side:t,card:lost,tag:'skulony'});
  }
}

/**
 * One punch into the rival with his reaction.
 * @param {Duel} d @param {Blow} b @param {Reaction} react @param {CardEvent[]} ev @param {() => number} rng
 */
function punch(d,b,react,ev,rng){
  const side=b.side, t=/** @type {Side} */ (1-side), A=d.f[side], D=d.f[t], c=CARDS[b.card], u=CARDS[b.use], X=A.x, Y=D.x;
  const base=u.as||u.id, pid=b.use, low=b.low, heavy=u.heavy||c.heavy, first=!b.hit&&!b.bonus;
  const ok=react.grade!=='late', clean=react.grade==='perfect';
  const whiff=(/** @type {string} */ tag='')=>{
    if(react.kind!=='none') payReaction(d,t,cheap(c),ev);
    ev.push({t:'whiff',side,card:pid,...(tag?{tag}:{})}); X.streak=0; X.flurry=0;
  };
  if(X.blindTurn>=d.turn&&rng()<0.5){ whiff(); return; }                                   // sand in the eyes
  if(u.hand&&(u.hand==='L'?A.inj.eyeL:A.inj.eyeR)&&rng()<0.15){ whiff(); return; }
  if(has(D,'lucky-slip')&&!b.bonus&&c.id!=='cyna'&&rng()<LUCKY_SLIP){ ev.push({t:'whiff',side,card:pid,tag:'szczęście'}); X.streak=0; X.flurry=0; return; }   // Szczęśliwy unik: no reaction, no cost
  if(c.id==='dobicie'&&D.stun<3){ whiff('widzi'); grantOpen(d,t,3); ev.push({t:'open',side:t,level:3}); return; }

  /* the reaction */
  let mult=1, fx=1, gain_=0, tag='czysto';
  if(c.id==='cyna') tag='kastet';                                                         // the knuckle-duster: nothing stops it
  else if(react.kind==='dodge'){
    if(ok){ mult=0; tag='unik'; if(has(D,'ghost')) gain_=1; if(clean&&has(D,'overreach')) gain_=3; }
    else { tag='odsloniety'; if(u.fx||low) fx=FAIL_FX; else mult=FAIL_DODGE; }        // a late dodge walks into it
  } else if(react.kind==='parry'){
    if(ok){ mult=0; tag='parowanie'; gain_=Math.max(1,Math.min(3,c.cost)); }
    else { const through=heavy||(base==='cross'&&!low)||(u.id==='hook'&&nd(A,'hook:4a')); mult=(u.id==='hook'&&nd(A,'hook:4a')?0.85:through?FAIL_PARRY_HEAVY:FAIL_PARRY)-(has(D,'iron-guard')?(through?0.25:0.2):0); tag='blok'; }   // Przebicie: a cross like a heavy punch, a hook with Pod gardę
  }
  const open=first?A.open:0, O=OPEN_EFFECT[open];
  const miarka=base==='upper'&&A.miarka&&first; if(miarka) A.miarka=false;
  const bent=!low&&Y.bentTurn===d.turn; if(bent&&--Y.bentN<=0) Y.bentTurn=0;           // Zgięty: one head punch (Zgięty wpół: two)
  const sure=first&&X.unblock>0; if(sure) X.unblock=0;                                  // Miarka (jab III A): the next punch
  const under=first&&base==='upper'&&!low&&A.prev==='hook'&&A.prevClean&&nd(A,'upper:2b');   // Spod gardy: after a hook that got through
  const charged=first&&u.id==='cross'&&nd(A,'cross:5b')&&(A.setup||A.open>0);             // Ładowany: from Ustawienie or an Otwarcie
  if(!low) Y.drop=0;                                                                     // Opuszczona garda: one head punch
  if((tag==='blok'||tag==='parowanie')&&(O.pierce||miarka||bent||sure||charged)||(tag==='blok'&&under)){ mult=1; gain_=0; tag='przebicie'; }   // Spod gardy: through a block, not a clean parry
  if(tag==='blok'&&(Y.crackTurn>=d.turn-1||Y.crackNow===d.turn)) mult=Math.max(mult,Y.crackHard&&Y.crackTurn>=d.turn-1?0.75:0.6);   // Rozbita garda (Rozbijacz: 25%)
  if((tag==='blok'||tag==='parowanie')&&u.id==='cross'&&has(A,'charged-punch')){ mult=Math.max(mult,0.7); gain_=0; tag='blok'; }
  if(react.kind==='parry'&&has(A,'bone-on-bone')&&c.id!=='cyna'){ D.debt=Math.min(D.staMax,D.debt+1); ev.push({t:'debt',side:t,level:D.debt}); }   // Kość w kość
  if(react.kind!=='none'){
    if(ok&&clean&&first) D.perfects++;
    payReaction(d,t,cheap(c)||(react.kind==='dodge'&&ok&&c.cost>=2&&has(D,'efficient-evade'))||(react.kind==='parry'&&ok&&clean&&has(D,'elastic-guard')),ev);
  }

  if(mult===0){   /* dodged or parried */
    X.streak=0; X.flurry=0;
    ev.push({t:tag==='parowanie'?'parry':'dodge',side:t,card:pid,tag,grade:react.grade});
    if(has(D,'counterpuncher')) Y.counter=1;
    Y.defTurn=d.turn;                                                                    // Kontra prosta (cross III B)
    if(tag==='unik'&&base==='hook'&&(has(D,'duck-launch')||nd(D,'upper:3b'))) Y.duckTurn=d.turn;
    if(tag==='unik'&&nd(D,'hook:4b')) Y.cHook=d.turn;                                    // Kontrhak: after any dodge
    if((base==='jab'||base==='cross')&&!b.bonus&&nd(D,'jab:4b')){ insertBonus(d,t,'jab'); D.setup=true; Y.setupN=Math.max(Y.setupN,1); }   // Kontrjab
    if(gain_){
      grantOpen(d,t,gain_); ev.push({t:'open',side:t,level:gain_});
      if(gain_===3&&has(D,'adrenaline')){ D.gain+=2; ev.push({t:'gain',side:t,level:2}); }
      if(OPEN_EFFECT[gain_].fizzle){ const lost=killNext(d,side); ev.push({t:'przelot',side,card:lost}); }
    }
    if(u.id==='upper'&&nd(A,'upper:4b')){ A.gain+=3; ev.push({t:'gain',side,level:3}); }   // Zamach-zwód: a stopped uppercut pays back
    if(tag==='parowanie'){
      Y.parries++;
      if(has(D,'fortress')&&Y.parries===3){ A.lockNext=true; ev.push({t:'burst',side:t}); }
      if(has(D,'shove')&&stepsIn(b.use)){ const lost=killNext(d,side); if(lost) ev.push({t:'fizzle',side,card:lost,tag:'odepchniety'}); }
      if(has(D,'staraszkola')) insertBonus(d,t,'watroba');                                  // Stara szkoła: the hook to the ribs comes right after
    }
    if(tag==='unik'&&(base==='jab'||base==='cross')&&has(D,'mirror-counter')&&!b.bonus) insertBonus(d,t,base);
    return;
  }

  /* it lands */
  let dmg=u.dmg*A.pow, stun=low?0:u.stun*A.stunDealt;
  if(has(A,'kostki')&&base==='hook') dmg+=1;
  if(base==='upper'&&!low&&has(A,'bomb')) stun+=2;
  const cashed=A.setup&&base!=='jab';   // Ustawienie: a jab after a jab only renews it
  if(cashed){ dmg+=(base==='cross'?SETUP.cross:SETUP.add)+(nd(A,'jab:1a')?1:0); fx*=nd(A,'jab:2b')?2:SETUP.fx; if(nd(A,'jab:2b')&&!low) stun+=1; if(--X.setupN<=0) A.setup=false; }   // Mocne, Długie ustawienie, Celownik
  if(u.id==='jab-k'&&nd(A,'jab-k:1b')) dmg+=1;                                            // Twardy brzuch
  if(u.id==='cross'&&nd(A,'cross:1a')) dmg+=1;                                            // Ciężka ręka
  if(u.id==='cross'&&nd(A,'cross:3b')&&X.defTurn===d.turn) dmg*=1.5;                      // Kontra prosta
  if(u.id==='hook'&&nd(A,'hook:1b')) stun+=1;                                             // Ciężki hak
  if(u.id==='hook'&&X.cHook>=d.turn-1&&nd(A,'hook:4b')) dmg+=2;                          // Kontrhak
  if(u.id==='hook'&&D.inj.cuts>0&&nd(A,'hook:5b')) dmg+=4;                                // Na krew
  if(u.id==='hook'&&X.liverTurn===d.turn) dmg+=(nd(A,'hook:3b')?2:0)+(nd(A,'watroba:3b')?2:0);   // Podwójny hak, Wątroba–głowa
  if(u.id==='upper'&&nd(A,'upper:1a')) stun+=1;                                           // Bomba
  if(u.id==='upper'&&nd(A,'upper:4a')){ dmg+=3; stun+=1; }                                // Nieprzerywalny
  if(u.id==='upper'&&bent&&nd(A,'zoladek:3a')) stun+=3;                                   // Pod brodę
  if(bent&&nd(A,'zoladek:2a')) stun+=1;                                                   // Zgięty wpół
  if(u.id==='zoladek'&&nd(A,'zoladek:1b')) dmg+=3;                                        // Głębiej
  if(u.id==='watroba'&&nd(A,'watroba:4a')) dmg+=1;                                        // Długi skurcz
  if(u.id==='watroba'&&nd(A,'watroba:4b')) dmg+=1;                                        // Piekło
  if(u.id==='upper'&&nd(A,'upper:5a')&&D.stun>=2) stun+=2;                                // Złamany nos: into a rattled head
  if(u.id==='watroba'&&nd(A,'watroba:5a')) dmg+=1;                                        // Na kolana
  if((base==='hook'||base==='upper')&&!low&&nd(A,'watroba:5b')&&(Y.wind>0||Y.windedTurn===d.turn)) stun+=1;   // Bez powietrza: a winded head
  if(u.id==='splot'&&nd(A,'splot:1a')) dmg+=1;                                            // Głęboki
  if(u.id==='splot'&&b.idx===0&&nd(A,'splot:1b')) dmg+=1;                                 // Z dystansu
  const cracked=Y.crackTurn>=d.turn-1||Y.crackNow===d.turn;
  if(nd(A,'upper:5b')&&cracked){ dmg+=2; if(!low) stun+=2; }                               // Rozbita twierdza
  if(u.id==='cross'&&cashed&&nd(A,'cross:5a')){ dmg+=2; stun+=cracked?4:2; }             // Nokautujący prosty
  if(!low&&Y.swayTurn===d.turn&&nd(A,'hook:5a')) stun+=2;                                 // Na deski
  if(u.id==='hook'&&nd(A,'jab:5a')&&A.turnKinds.includes('jab')&&A.turnKinds.includes('cross')) dmg+=3;   // Raz-dwa-trzy
  if(u.id==='splot'&&nd(A,'splot:3b')&&!d.close&&d.blows.some((x,i)=>i>d.step&&x.side===t&&!x.dead&&CARDS[x.card].close)) dmg*=2;   // Na wejściu: he has yet to step in
  if(X.counter){ dmg+=1; stun+=1; X.counter=0; }
  if(has(A,'rolling')&&X.streak>=1) dmg+=1;
  if(low&&has(D,'tough-body')) dmg=Math.max(1,dmg-1);
  if(u.id==='cross'&&has(A,'executioner')&&D.sta<=2) dmg+=3;
  if(u.id==='cross'&&nd(A,'cross:3a')&&D.sta<=2) dmg+=2;                                // Egzekutor (węzeł)
  if(base==='upper'&&X.duckTurn>=d.turn-1) dmg+=2;
  if(!low&&X.bodyTurn===d.turn&&has(A,'finisher')) dmg*=1.5;
  if(has(A,'rope-pressure')&&D.sta<=2) dmg*=1.25;
  if(has(A,'demolition')&&A.turnKinds.length>=2&&!A.turnKinds.includes(pid)) dmg*=1.5;
  if(X.rage>0) dmg*=1.4;
  if(u.hand&&A.inj[u.hand==='L'?'armL':'armR']) dmg=Math.max(1,dmg-1);   // a bruised forearm
  if(A.hunger) dmg=Math.max(1,dmg-A.hunger);   // an empty stomach: softer punches
  if(open){ A.open=0; dmg=(dmg+O.add)*O.mult; if(!low) stun+=O.stun+(has(A,'heavy-hands')?2:0); fx*=O.fx; }
  if((tag==='czysto'||tag==='odsloniety')&&has(D,'thick-skin')) dmg*=0.9;
  let hp=Math.max(1,Math.round(dmg*mult));
  let st=Math.round(stun*Math.min(1,mult)*(tag==='odsloniety'&&!u.fx&&!low?FAIL_DODGE:1));
  if(has(D,'warrior-heart')&&D.hp<D.hpMax*0.3) st=Math.round(st*0.75);
  if(has(D,'szczeka')) st=Math.round(st*0.85);
  const handKey=u.hand==='L'?'handL':'handR';
  if(u.hand&&A.inj[handKey]){ hp=Math.max(1,Math.round(hp*0.5)); A.hp-=1; ev.push({t:'handpain',side,dmg:1}); }
  if(c.id==='cyna') hp=Math.max(hp,D.hp);
  D.hp-=hp; D.stun+=st;
  const landed=mult>=1;
  if(tag==='blok'&&has(D,'spiked-guard')){ const back=Math.round(dmg*(1-mult)*SPIKES); if(back>=1){ A.hp-=back; ev.push({t:'reflect',side:t,dmg:back}); } }   // Kolczasta garda
  ev.push({t:'hit',side,card:pid,dmg:hp,stun:st,low,tag,level:open});
  if(landed){
    X.streak++; X.flurry++; if(!A.turnKinds.includes(pid)) A.turnKinds.push(pid);
    if(low) X.bodyTurn=d.turn;
    if(u.id==='watroba') X.liverTurn=d.turn;
    if(u.id==='watroba'&&nd(A,'watroba:5b')) Y.noAir=d.turn;                             // Bez powietrza
    const after=A.turnKinds.slice(A.turnKinds.indexOf('jab')+1).filter(k=>k!=='jab'&&k!=='jab-k');
    if(nd(A,'jab:5b')&&A.turnKinds.includes('jab')&&after.length>=2&&X.dictTurn!==d.turn){ X.dictTurn=d.turn; D.debt=Math.min(D.staMax,D.debt+2); ev.push({t:'debt',side:t,level:D.debt}); }   // Dyktator
    if(u.id==='jab-k'){
      X.jk++; X.jkAll++;
      if(X.jk===2&&nd(A,'jab-k:5a')){ const last=d.blows.filter((x,i)=>i>d.step&&x.side===t&&!x.dead&&!x.bonus).pop(); if(last){ for(const x of d.blows) if(x.side===t&&x.idx===last.idx) x.dead=true; ev.push({t:'fizzle',side:t,card:last.card,tag:'zakotwiczony'}); } }   // Kotwiczenie
      if(X.jkAll===4&&!X.antUsed&&nd(A,'jab-k:5b')){ X.antUsed=1; injure(d,t,'rib',ev); }   // Mrówka
      if(nd(A,'jab-k:4b')){ A.setup=true; X.setupN=Math.max(X.setupN,nd(A,'jab:1b')?2:1); }   // Ustawienie z dołu
    }
    if(has(A,'economist')&&X.econTurn!==d.turn){ X.econTurn=d.turn; A.gain+=1; ev.push({t:'gain',side,level:1}); }
    if(has(A,'flurry')&&X.flurry===3){ A.gain+=1; ev.push({t:'gain',side,level:1}); }
  } else {
    X.streak=0; X.flurry=0; if(tag==='blok'&&has(A,'guard-breaker')) Y.crackTurn=d.turn;
    if(tag==='blok'&&u.id==='upper'&&nd(A,'upper:4b')){ A.gain+=3; ev.push({t:'gain',side,level:3}); }   // Zamach-zwód
    if(tag==='blok'&&u.id==='cross'&&nd(A,'cross:2a')){ Y.crackTurn=d.turn; Y.crackHard=0; }   // Pęknięta garda: like an uppercut's
    if(tag==='blok'&&u.id==='hook'&&nd(A,'hook:4a')&&rng()<0.15){ const lost=killNext(d,t); if(lost){ Y.swayTurn=d.turn; if(nd(A,'hook:5a')) D.stun+=3; ev.push({t:'fizzle',side:t,card:lost,tag:'zachwiany'}); } }   // Pod gardę
    if(tag==='blok'&&has(A,'forearm')&&rng()<FOREARM) injure(d,t,u.hand==='R'?'armL':'armR',ev);   // Stłuczone przedramię: the arm the punch met
  }
  if(u.id==='jab'&&landed&&!b.bonus){
    A.setup=true; X.setupN=nd(A,'jab:1b')?2:1; if(has(A,'vanishing-target')) A.miarka=true;
    if(nd(A,'jab:3a')) X.unblock=1;                                                      // Miarka
    X.jabs++;
    if(X.jabs===2&&nd(A,'jab:3b')){ const lost=killNext(d,t); if(lost) ev.push({t:'fizzle',side:t,card:lost,tag:'żądło'}); }   // Żądło (węzeł)
    if(X.jabs===2&&has(A,'sting')){ Y.slowTurn=d.turn; slowDown(d,t); }
    if(X.jabs===2&&has(A,'one-two-three')) insertBonus(d,side,'cross');
  }
  if(base==='upper'&&open&&landed&&(has(A,'shock')||nd(A,'upper:3a'))) D.lockNext=true;   // Szok
  if(low){   /* what the body is for: it stops a wind-up, takes the legs and the wind, even through a block */
    const anyOk=u.id==='jab-k'&&landed&&nd(A,'jab-k:4a')&&X.breakTurn!==d.turn;            // Przerywacz: any punch for 2+, landed, once a turn
    if(stopWindUp(d,b,t,ev,anyOk)&&anyOk) X.breakTurn=d.turn;
    if(base!=='jab'||u.low){ const until=d.turn+(has(A,'perpetuum')?2:1); if(Y.legsTurn<until) ev.push({t:'legs',side:t}); Y.legsTurn=Math.max(Y.legsTurn,until); }
    if(u.id==='jab-k'&&Y.slowTurn!==d.turn){ Y.slowTurn=d.turn; slowDown(d,t); ev.push({t:'slow',side:t}); if(nd(A,'jab-k:3a')) Y.anchorTurn=d.turn+1; }   // heavy legs: his later punches come late (Kotwica: next turn too)
    if(u.id==='jab-k'&&landed&&nd(A,'jab-k:2b')) Y.drop=1;                               // Opuszczona garda
    if(u.id==='splot'){   // Odepchnięcie: his next close-range move has to step in again
      const nb=d.blows.find((x,i)=>i>d.step&&x.side===t&&!x.dead&&!x.bonus&&CARDS[x.card].close);
      if(nb&&landed&&nd(A,'splot:2b')){ for(const x of d.blows) if(x.side===t&&x.idx===nb.idx) x.dead=true; ev.push({t:'fizzle',side:t,card:nb.card,tag:'zatrzymany'}); }   // Stop: it never comes
      else if(nb){ slowDown(d,t,nb.idx); ev.push({t:'push',side:t,card:nb.card});
        if(nd(A,'splot:4b')){ D.open=0; D.setup=false; }                                    // Mur: he steps in empty-handed
        if(nd(A,'splot:5b')){ grantOpen(d,side,1); ev.push({t:'open',side,level:1}); } }     // Matador
    }
    if(u.id==='splot'&&landed&&nd(A,'splot:3a')) X.unblock=1;                             // Bez tchu: no breath to block the next one
    if(u.id==='zoladek'){ Y.bentTurn=d.turn; Y.bentN=nd(A,'zoladek:2a')?99:1; ev.push({t:'bent',side:t}); }   // Zgięty wpół: till the end of the turn
    if((base!=='jab'||(u.id==='jab-k'&&landed&&nd(A,'jab-k:3b')))&&!has(D,'perpetuum')){   // Dławik: a body jab that got through winds too
      const more=((base==='hook'||base==='cross')&&has(A,'body-hammer'))||(u.id==='watroba'&&nd(A,'watroba:1a'))||(u.id==='splot'&&nd(A,'splot:2a'))?1:0;   // Młot, Splot
      const n=Math.max(0,(u.wind||1)+more-(has(D,'tough-body')?1:0)+(fx>=FAIL_FX?1:0));
      if(u.id==='zoladek'&&landed&&(Y.wind>0||Y.windedTurn===d.turn)&&nd(A,'zoladek:5a')) injure(d,t,'rib',ev);   // Złamany: a winded rival
      if(n&&u.id==='splot'&&nd(A,'splot:5a')) Y.windNext=Math.max(Y.windNext,n);          // Duszenie: the turn after too
      if(u.id==='zoladek'&&nd(A,'zoladek:2b')) Y.windStack=d.turn;                         // Wyrwany oddech: this turn's body shots add up
      if(n){ Y.wind=Y.windStack===d.turn?Y.wind+n:Math.max(Y.wind,n); ev.push({t:'zadyszka',side:t,level:n}); }   // the next bar only; the strongest of the turn counts
    }
    const liver=u.id==='watroba'&&(landed||(tag==='blok'&&nd(A,'watroba:2b')))&&++Y.liver%(nd(A,'watroba:5a')?2:LIVER_EVERY)===0;   // Wątroba (Przez gardę: a blocked one counts; Na kolana: every second)
    const hunter=u.id==='watroba'&&landed&&cashed&&nd(A,'watroba:2a');                  // Łowca wątroby
    const gut=u.id==='zoladek'&&landed&&nd(A,'zoladek:3b');                                // Skurcz (podbródkowy III B)
    if(liver||hunter||gut||landed&&(open>=1||D.inj.ribs>=3||(base==='hook'&&has(A,'liver-hunter'))||(base==='hook'&&rng()<0.08*fx))){
      const lost=killNext(d,t); if(lost) ev.push({t:'skurcz',side:t,card:lost});
      if(u.id==='watroba'&&nd(A,'watroba:4a')){ const two=killNext(d,t); if(two) ev.push({t:'skurcz',side:t,card:two}); grantOpen(d,side,1); ev.push({t:'open',side,level:1}); }   // Długi skurcz: two moves and Otwarcie I
      if(nd(A,'watroba:4b')){ D.debt=Math.min(D.staMax,D.debt+2); ev.push({t:'debt',side:t,level:D.debt}); }   // Piekło
    }
    if(landed&&(base==='hook'||base==='cross')&&(has(A,'cracked-ribs')||rng()<(open>=1?0.25:0)*fx+(fx>=FAIL_FX?0.15:0)+(u.id==='watroba'&&nd(A,'watroba:3a')?0.2:0)+(u.id==='splot'&&(cashed||open>0)&&nd(A,'splot:4a')?0.3:0))) injure(d,t,'rib',ev);   // Pęknięte żebra, Żebro
    if(landed&&has(A,'crusher')&&!Y.broken&&++Y.crush>=5){ Y.broken=1; ev.push({t:'broken',side:t}); }
  } else if(landed){
    if(open>=2){ D.headCrits++; if(D.headCrits===3) injure(d,t,u.hand==='R'?'eyeL':'eyeR',ev); }
    const hook=u.id==='hook';
    const cut=(hook&&rng()<((has(A,'bloodbath')?0.25:has(A,'butcher')||nd(A,'hook:2a')?0.2:0.06)+(nd(A,'hook:5b')?0.55:0))*fx)||(hook&&open>=2&&has(A,'butcher'))||(open===3&&rng()<0.35)
      ||(c.id==='lokiec'&&rng()<0.3*fx)||(u.id==='cross'&&open&&has(A,'kostki'))||(!D.inj.cuts&&rng()<0.2*D.inj.scars*fx)||(has(A,'cutter')&&rng()<CUTTER*fx);
    if(cut) injure(d,t,'cut',ev);
    if(base==='upper'&&(open===3||(fx>=FAIL_FX&&rng()<0.3))) injure(d,t,'nose',ev);
    if(c.id==='zbyka'&&D.stun-st>=(fx>=FAIL_FX?3:4)){ injure(d,t,'nose',ev); D.stun+=3; }
    if(c.id==='dobicie') D.stun=Math.max(D.stun,STUN_KD);
    if(((u.id==='jab'&&nd(A,'jab:4a'))||(u.id==='cross'&&nd(A,'cross:4b')))&&X.headBreak!==d.turn&&stopWindUp(d,b,t,ev,false)) X.headBreak=d.turn;   // Przerywnik, Przez środek: once a turn
    if(u.id==='upper'&&nd(A,'upper:5a')&&D.stun-st>=2) injure(d,t,'nose',ev);              // Złamany nos
    if(u.id==='hook'&&bent&&nd(A,'zoladek:5b')&&D.stun>=5) D.stun=Math.max(D.stun,STUN_KD);  // Przewrót
    if(has(A,'headsman')&&!X.katUsed&&D.hp>0&&D.hp<=D.hpMax*HEADSMAN){ X.katUsed=1; D.stun=Math.max(D.stun,STUN_KD); }   // Kat
    const sway=u.id==='hook'&&A.prev==='cross'&&nd(A,'hook:3a')?1:(nd(A,'hook:2b')&&u.id==='hook'?0.3:SWAY)*fx*(u.id==='hook'&&X.liverTurn===d.turn&&nd(A,'hook:3b')?2:1);   // Wahadło, Hak z obrotu, Podwójny hak
    const certain=u.id==='hook'&&((nd(A,'jab:5a')&&A.turnKinds.includes('jab')&&A.turnKinds.includes('cross'))||(X.cHook>=d.turn-1&&nd(A,'hook:4b')));   // Raz-dwa-trzy, Kontrhak
    const odds=certain?1:u.id==='hook'&&D.inj.cuts>0&&nd(A,'hook:5b')?Math.max(sway,0.6):u.id==='hook'&&nd(A,'hook:5a')?Math.max(sway,0.45*fx):sway;   // Na krew, Na deski
    if(base==='hook'&&rng()<odds){ const lost=killNext(d,t); if(lost){ Y.swayTurn=d.turn; if(nd(A,'hook:5a')) D.stun+=3; ev.push({t:'fizzle',side:t,card:lost,tag:'zachwiany'}); } }   // Zachwianie (Na deski: +3 at once)
  }
  if(landed&&open===3&&has(A,'shoulder')) injure(d,t,'shoulder',ev);   // Wybity bark
  if(base==='upper'&&!low){ if(Y.crackTurn<d.turn) ev.push({t:'guard',side:t}); Y.crackTurn=d.turn; Y.crackHard=nd(A,'upper:2a')?1:0; }   // Rozbijacz   // Rozbita garda, landed or blocked
  if(tag==='blok'&&(u.id==='cross'||u.id==='hook')&&rng()<(has(A,'kostki')?0.04:0.08)) injure(d,side,handKey,ev);
  if(D.stun>=STUN_DAZE&&!D.dazed){ D.dazed=true; ev.push({t:'wound',side:t,card:'mroczki'}); }
  if(D.stun>=STUN_LEGS) injure(d,t,'legs',ev);
  if(A.hp<=0&&!lastStand(d,A,side,ev)){ finish(d,t,'ko',ev); return; }
  if(D.hp<=0&&!lastStand(d,D,t,ev)){ D.hp=0; finish(d,side,'ko',ev); return; }
  const kd=STUN_KD-(has(A,'knockout')?1:0);   // Nokauter
  if(D.stun>=kd&&Y.rage<=0){
    if(has(D,'szczeka')&&!Y.jawUsed){ Y.jawUsed=1; D.stun=kd-1; injure(d,t,'legs',ev); }   // Betonowa szczęka: only the legs go
    else {
      D.knockdowns++; if(open===3) injure(d,t,'concussion',ev);
      ev.push({t:'knockdown',side:t,level:D.knockdowns});
      if(has(A,'cornerman')){ A.gain+=2; A.stun=Math.max(0,A.stun-2); ev.push({t:'gain',side,level:2}); }
      if(D.knockdowns>=2) finish(d,side,'nokdaun',ev);
      else { d.phase='getup'; d.down=t; }
      return;
    }
  }
  if(u.id==='jab'&&landed&&!b.bonus&&((has(A,'double-jab')&&rng()<0.5)||(nd(A,'jab:2a')&&rng()<0.3))) insertBonus(d,side,'jab');   // Podwójny jab
  if(u.id==='cross'&&landed&&open&&!b.bonus&&(has(A,'heavy-answer')||nd(A,'cross:4a'))) insertBonus(d,side,'watroba');   // Ciężka odpowiedź
  else if(u.id==='cross'&&landed&&cashed&&!b.bonus&&nd(A,'cross:4a')) insertBonus(d,side,'watroba');   // …from Ustawienie too
}

/** Ostatni bastion: once a brawl health 0 becomes the Szał. @param {Duel} d @param {Fighter} f @param {Side} side @param {CardEvent[]} ev */
function lastStand(d,f,side,ev){
  if(!has(f,'last-stand')||f.x.standUsed) return false;
  f.x.standUsed=1; f.x.rage=2; f.hp=1; ev.push({t:'rage',side}); void d; return true;
}

/** @param {Duel} d @param {Side} winner @param {Duel['end']} end @param {CardEvent[]} ev */
function finish(d,winner,end,ev){ d.phase='over'; d.winner=winner; d.end=end; d.f[1-winner].hp=Math.max(0,d.f[1-winner].hp); ev.push({t:'ko',side:winner,tag:end}); }

/** After a knockdown: `up` false = counted out. The knockdown ends the exchange. @param {Duel} d @param {boolean} up @param {() => number} rng @returns {CardEvent[]} */
export function getUp(d,up,rng){
  /** @type {CardEvent[]} */
  const ev=[];
  const side=d.down;
  if(d.phase!=='getup'||side===-1) return ev;
  const f=d.f[side]; d.down=-1;
  if(!up){ finish(d,/** @type {Side} */ (1-side),'ko',ev); return ev; }
  f.stun=3; f.dazed=false; d.phase='fight';
  if(has(f,'rise')&&!f.x.riseUsed){ f.x.riseUsed=1; f.hp=Math.min(f.hpMax,f.hp+Math.round(f.hpMax*0.25)); }   // Wstań i walcz
  endTurn(d,rng,ev);
  return ev;
}

/** @param {Duel} d @param {() => number} rng @param {CardEvent[]} ev */
function endTurn(d,rng,ev){
  void rng;
  d.f.forEach((f,side)=>{ if(f.inj.cuts&&d.phase==='fight'){ f.hp-=1; ev.push({t:'bleed',side:/** @type {Side} */ (side),dmg:1}); if(f.hp<=0&&!lastStand(d,f,/** @type {Side} */ (side),ev)) finish(d,/** @type {Side} */ (1-side),'ko',ev); } });
  if(d.phase==='over') return;
  const R=d.f.map(f=>Math.max(0,f.sta));   // the reserve: stamina nobody spent this turn
  d.f.forEach((f,side)=>{
    f.stun=Math.max(0,f.stun-STUN_DECAY-(f.x.noAir===d.turn?0:R[side])*(has(f,'breather')?2:1));   // Bez powietrza: no reserve clears his head if(f.stun<STUN_DAZE) f.dazed=false;
    const o=d.f[1-side];
    if(has(f,'grinder')&&R[side]>=R[1-side]+3) o.debt=Math.min(o.staMax,o.debt+1);
    if(has(f,'second-wind')&&!f.x.secondUsed&&!R[side]&&f.spent>0){ f.x.secondUsed=1; f.gain+=2; ev.push({t:'gain',side:/** @type {Side} */ (side),level:2}); }
    if(has(f,'clinch')) f.gain+=Math.min(2,R[side]);
  });
  if(d.maxTurns&&d.turn>=d.maxTurns){
    const r=d.f.map(f=>f.hp/f.hpMax);
    if(Math.abs(r[0]-r[1])<0.05){ d.phase='over'; d.winner=-1; d.end='remis'; }
    else { d.phase='over'; d.winner=r[0]>r[1]?0:1; d.end='czas'; }
    ev.push({t:'ko',side:d.winner===1?1:0,tag:d.end});
    return;
  }
  d.turn++; d.phase='plan'; d.close=false; d.blows=[]; d.step=0;   // they part after every exchange; the first hook has to step in again
  const dict=d.f.findIndex(f=>f.x.dictTurn===d.turn-1);
  if(dict>=0) d.init=/** @type {Side} */ (dict);                                          // Dyktator: he took the initiative
  else if((R[0]>=2||R[1]>=2)&&R[0]!==R[1]){ d.init=R[0]>R[1]?0:1; ev.push({t:'reserve',side:d.init,level:R[d.init]}); }   // the fresher one is first
  else if(d.f[0].spd!==d.f[1].spd) d.init=d.f[0].spd>d.f[1].spd?0:1;   // Szybkość
  else d.init=/** @type {Side} */ (1-d.init);
  d.f.forEach((f,side)=>{
    f.locked=f.lockNext; f.lockNext=false;
    const wind=Math.min(f.x.wind,Math.max(0,f.staMax-STA_MIN));   // Zadyszka: never below STA_MIN
    f.x.windedTurn=f.x.wind>0?d.turn:0;                                                       // this turn he is winded (Złamany)
    f.sta=Math.max(0,Math.min(f.staMax+2,f.staMax-wind-f.debt+f.gain-(f.locked?LOCK_COST:0)-(f.x.broken?1:0)));
    if(f.locked) ev.push({t:'lock',side:/** @type {Side} */ (side),level:LOCK_COST});
    f.debt=0; f.gain=0; f.queue=[]; f.spent=0;
    if(f.open&&f.openTurn<d.turn-1) f.open=0;
    f.setup=false; f.miarka=false; f.turnKinds=[];
    Object.assign(f.x,{jabs:0,shellUsed:0,parries:0,wind:0,setupN:0,unblock:0,drop:0,jk:0}); f.prev=''; f.prevClean=false;
    f.x.wind=f.x.windNext; f.x.windNext=0;                                                  // Duszenie: the wind carries over once
    f.x.ribsReady=f.x.defTurn===d.turn-1?1:0;                                               // Pod żebra: a defence last turn   // the counterpuncher's +1 waits for the next punch
    if(f.x.rage>0) f.x.rage--;
  });
  ev.push({t:'turn',side:0,level:d.turn});
}

/* ---------------------------------------------------------------- AI ---------------------------------------------- */

/** A rival's habit for this skill at this place of the queue. @param {Fighter} f @param {string} id @param {number} place */
function habit(f,id,place){ let v=0; for(const b of f.bias) if(b.card===id&&(b.beat===undefined||b.beat===place)) v+=b.v; return v; }

/** What the AI's last queued skill adds to this one: the punch that cashes its status, never the same skill again.
 * @param {Fighter} f @param {string} id */
function synergy(f,id){
  const prev=f.queue[f.queue.length-1]?.card; if(!prev) return 0;
  if(prev===id) return -AI_REPEAT;
  const S=AI_SYNERGY[prev]||AI_SYNERGY[CARDS[prev].as||''], c=CARDS[id];
  return S?S[id]??S[c.as||'']??0:0;
}

/** How much the AI likes a skill now: damage and zamroczenie for the stamina, the body, its style, habits and the skill before it.
 * @param {Duel} d @param {Side} side @param {string} id @returns {number} */
function aiValue(d,side,id){
  const f=d.f[side], o=d.f[1-side], c=CARDS[id], st=STYLE_AI[f.style]||STYLE_AI.bal, n=c.hits||1;
  if(id==='dobicie') return o.stun>=4?8:-6;
  if(c.kind==='trik') return id==='piach'?2.5:o.inj.eyeL&&o.inj.eyeR?-3:2.5;
  if(id==='cyna') return -9;   // only the rigged fight pulls the spoon (card-fight)
  const v=(c.dmg*n*f.pow*st.deal+0.4*c.stun*n+(c.low?1.6*st.body:0)+(c.heavy?st.heavy-1:0))/Math.sqrt(Math.max(1,skillCost(f,id)));
  return v+habit(f,id,f.queue.length)+synergy(f,id);
}

/** Fill the queue of `side`: weighted picks among the skills it can still pay for, sometimes keeping a reserve.
 * @param {Duel} d @param {Side} side @param {() => number} rng */
export function aiPlan(d,side,rng){
  const f=d.f[side], st=STYLE_AI[f.style]||STYLE_AI.bal;
  if(d.phase!=='plan') return;
  while(f.queue.length<QUEUE_MAX){
    const opts=f.skills.filter(id=>!canQueue(d,side,id));
    if(!opts.length) break;
    if(f.queue.length&&rng()<st.reserve*(f.sta-f.spent<=2?1.5:0.5)) break;   // keep a little back: the reserve clears the head
    const v=opts.map(id=>aiValue(d,side,id)), max=Math.max(...v), w=v.map(x=>Math.exp((x-max)/(st.temp*1.6))), sum=w.reduce((a,b)=>a+b,0);
    let r=rng()*sum, k=0; while(k<w.length-1&&(r-=w[k])>0) k++;
    if(v[k]<0) break;
    queueSkill(d,side,opts[k]);
  }
}

/** The AI's answer to the next blow: it never dodges, it blocks — more often against the heavy punches it reads, the
 * skills the player keeps putting at the same place and a skill queued twice in a row, less with a broken guard; a block is sometimes a clean parry. Blocks cost it the next bar too.
 * @param {Duel} d @param {() => number} rng @returns {Reaction} */
export function aiReaction(d,rng){
  const b=nextBlow(d); if(!b) return {kind:'none',grade:'late'};
  const f=d.f[1-b.side], A=d.f[b.side], c=CARDS[b.card];
  let p=f.block;
  if(f.stun>=STUN_DAZE) p*=0.6;
  if(f.x.blindTurn>=d.turn) p*=0.5;
  if(f.inj.cuts>=3&&has(A,'bloodbath')) p*=0.7;
  if(f.debt>=f.staMax-1) p*=0.5;
  if(f.read>=2&&(c.heavy||c.cost>=3)) p+=0.25;
  const mem=d.memory[1-b.side][b.idx];
  if(mem&&!b.bonus){ const all=Object.values(mem).reduce((a,x)=>a+x,0); if(all) p+=0.2*(mem[b.card]||0)/all; }
  if(f.x.crackTurn>=d.turn-1||f.x.crackNow===d.turn) p*=f.x.crackHard&&f.x.crackTurn>=d.turn-1?CRACK_BLOCK/2.5:CRACK_BLOCK;   // Rozbita garda (Rozbijacz: much rarer)
  if(f.x.drop&&!b.low) p*=0.5;                                                    // Opuszczona garda
  if(telegraphed(d,b)) p+=TELEGRAPH.block;
  if(f.x.bentTurn===d.turn&&!b.low) return {kind:'none',grade:'late'};             // Zgięty: no block to the head
  if(rng()>=Math.min(0.85,p)) return {kind:'none',grade:'late'};
  return {kind:'parry',grade:rng()<f.parry?(rng()<0.3?'perfect':'good'):'late'};
}
