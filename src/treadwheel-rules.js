/* Rules of the treadwheel (KIERAT.md), pure and unit-tested: step windows and costs, the shared load of the wheel,
   rest on the handrail, the warder's lantern cycle, the tempo plan and the rivals in the other stalls.
   Randomness comes in as an argument, so the mode, the tests and the tuning script share the same rules. */

import { treePassives } from './stats.js';

/** Step windows in ms around the moment a tread's edge reaches the chalk line. */
export const WINDOW = {clean:45, good:100, off:200};
/** Breath paid per step at load 1. A missed step also costs a tread of height. */
export const STEP_COST = /** @type {Record<string,number>} */ ({clean:0.5, good:0.9, off:1.8, miss:1.0});
/** Clean steps in a row that put the legs in a trance, and what a trance step gives back. */
export const TRANCE_AT = 8, TRANCE_GAIN = 0.3;
/** Extra breath for each beat stood low on the wheel (the tread hits the shins) and per climbing step. */
export const LOW_COST = 0.5, CLIMB_COST = 2.5, CLIMB_STEP = 1/3;
/** Rest on the handrail: breath back per second (× regen), grip lost per second; grip lost hanging and won back standing. */
export const REST_GAIN = 2.6, REST_GRIP = 6, HANG_GRIP = 10, GRIP_BACK = 3;
/** Breath lost when the warder catches you resting: first and second time; the third throws you off. */
export const CAUGHT = [15, 25], CAUGHT_OUT = 3;
/** The legs grow heavy: the cost of a step rises by this share every minute on the wheel. */
export const HEAVY_PER_MIN = 0.4;

/** @param {number} v */
const clamp01 = (v)=>v<0?0:v>1?1:v;

/** Weight of the wheel on each pair of legs left on it. @param {number} out men already off */
export function wheelLoad(out){ return 1+0.15*Math.max(0,out); }

/** Hunger makes each step dearer. @param {number} glod hunger steps (2 hungry, 3 starving) */
export function hungerMult(glod){ return glod>=3?1.3:glod>=2?1.15:1; }

/** Grade of a step from its distance to the beat. @param {number} dtMs press minus beat @param {number} [k] window scale */
export function judgeStep(dtMs,k=1){
  const d=Math.abs(dtMs);
  return d<=WINDOW.clean*k?'clean':d<=WINDOW.good*k?'good':d<=WINDOW.off?'off':'';
}

/**
 * Breath paid for one beat. @param {string} grade clean|good|off|miss @param {{load:number,hunger:number,use:number,heavy:number,trance:boolean,low:boolean}} c
 * @returns {number} breath to subtract (negative gives breath back in a trance)
 */
export function stepCost(grade,c){
  if(c.trance&&grade==='clean') return -TRANCE_GAIN;
  return (STEP_COST[grade]||0)*c.load*c.hunger*c.use*c.heavy+(c.low?LOW_COST:0);
}

/** How heavy the legs are after some seconds on the wheel. @param {number} sec */
export function heavyMult(sec){ return 1+HEAVY_PER_MIN*Math.max(0,sec)/60; }

/**
 * A man's body on the wheel from his three tree levels and his needs.
 * @param {{str:number,spd:number,end:number}} lv @param {{zm?:number,glod?:number}} [needs]
 */
export function wheelBody(lv,needs={}){
  const s=treePassives('str',lv.str), q=treePassives('spd',lv.spd), e=treePassives('end',lv.end);
  return {breath:Math.max(30,Math.round(e.staCap-6*(needs.zm||0))), grip:Math.round(40*s.pow), regen:e.regen, use:e.energyUse,
    win:q.punch/0.95, hunger:hungerMult(needs.glod||0), climb:1/s.pow};
}

/** Windows narrow when the breath runs low; the first step after the handrail is half as wide.
 * @param {number} win body window scale @param {number} breathFrac @param {boolean} afterRest */
export function windowScale(win,breathFrac,afterRest){ return win*(breathFrac<0.3?0.75:1)*(afterRest?0.5:1); }

/* ---------- the warder and his lantern ---------- */

/**
 * The next phase of the warder's cycle. watch: the lantern sweeps the stalls; turn: his head comes round to the camera
 * and the lantern's shutter closes; away: he stares out of the picture; warn: his head starts back; back: it turns to the stalls.
 * A feint (from stage IV) starts to turn away and swings straight back.
 * @param {string} phase the phase that just ended @param {{away:number[],warn:number,watch:number[],fake:boolean,cobb?:boolean}} p
 * @param {()=>number} rnd @returns {{phase:string,sec:number,feint?:boolean}}
 */
export function guardNext(phase,p,rnd){
  const span=(/** @type {number[]} */ r)=>r[0]+(r[1]-r[0])*rnd();
  if(phase==='watch'){ if(p.fake&&rnd()<0.3) return {phase:'turn',sec:0.8,feint:true}; return {phase:'turn',sec:0.8}; }   /* the head comes round slowly */
  if(phase==='turn') return {phase:'away',sec:span(p.away)*(p.cobb?1.4:1)};
  if(phase==='feint') return {phase:'back',sec:0.25};
  if(phase==='away') return {phase:'warn',sec:p.warn};
  if(phase==='warn') return {phase:'back',sec:0.5};
  return {phase:'watch',sec:span(p.watch)};
}

/** Where the lantern points along the stalls while he watches (0 = first stall … n−1 = last), sweeping back and forth.
 * @param {number} sec seconds into the watch @param {number} n stalls @param {number} speed stalls per second */
export function beamAt(sec,n,speed){
  if(n<=1) return 0;
  const span=n-1, t=(sec*speed)%(2*span), x=t<=span?span-t:t-span;   // starts at his end of the row (the right) and sweeps left
  return x;
}

/** How much of the beam falls on a stall. @param {number} beam stall the beam points at @param {number} stall */
export function beamOn(beam,stall){ return clamp01(1-Math.abs(beam-stall)/0.9); }

/* ---------- the tempo ---------- */

/** Beats per minute of a stage at the n-th bell (the brake let out a little more each time). @param {number[]} bpm [start,max] @param {number} bells */
export function bellTempo(bpm,bells){ return Math.min(bpm[1],bpm[0]+6*Math.max(0,bells)); }

/** Pick the next tempo event after a bell, from those the stage allows. @param {string[]} allowed @param {()=>number} rnd @returns {string} */
export function nextEvent(allowed,rnd){
  const pool=allowed.filter(e=>e!=='bell'&&e!=='warp'&&e!=='knock');
  return pool.length&&rnd()<0.55?pool[Math.floor(rnd()*pool.length)]:'';
}

/** The warped tread: one of the 24 sits lower, its edge reaches the line a third of a beat late. */
export const TREADS = 24, WARP_TREAD = 7, WARP_SHIFT = 1/3;

/* ---------- the rivals ---------- */

/**
 * Men who can share the wheel. rank → tree levels as in a fight; acc: how true their feet are; bold: how readily they
 * rest behind the warder's back (and how late they let go); clumsy: they trip on warped treads and brake jerks;
 * burn: they start hard and fade; pious: never touch the rail.
 */
export const RIVALS = /** @type {Record<string,{id:string,name:string,no:number,rank:number,acc:number,bold:number,clumsy?:boolean,burn?:boolean,pious?:boolean,sick?:boolean}>} */ ({
  n31:{id:'n31',name:'Numer 31',no:31,rank:1,acc:0.45,bold:0.5,sick:true},
  harry:{id:'harry',name:'Harry „Stary” Hobbs',no:12,rank:2,acc:0.62,bold:0.3},
  jack:{id:'jack',name:'Jack „Młody” Morley',no:23,rank:3,acc:0.8,bold:0.9,burn:true},
  walter:{id:'walter',name:'Walter „Chudy” Pratt',no:9,rank:6,acc:0.7,bold:0.5},
  joseph:{id:'joseph',name:'Joseph „Siwy” Marsh',no:4,rank:8,acc:0.68,bold:0.6},
  albert:{id:'albert',name:'Albert „Ciężki” Rudd',no:15,rank:10,acc:0.7,bold:0.4,clumsy:true},
  silas:{id:'silas',name:'Silas „Cichy” Crane',no:6,rank:12,acc:0.95,bold:0,pious:true},
  ned:{id:'ned',name:'Ned „Dym” Coker',no:28,rank:14,acc:0.8,bold:0.55},
  dan:{id:'dan',name:'Dan „Głaz” Mullins',no:2,rank:17,acc:0.78,bold:0.45,clumsy:true},
});

/** Stars of a rival by rank, as on the yard (★★ from rank 10). @param {number} rank */
export function rivalStars(rank){ return rank>=20?3:rank>=10?2:1; }

/** A rival on the wheel. @param {string} id @param {number} stall */
export function makeRival(id,stall){
  const d=RIVALS[id], L=Math.max(1,Math.min(30,d.rank+1)), body=wheelBody({str:L,spd:L,end:L},{zm:d.sick?3:0});
  if(d.pious) body.breath=Math.round(body.breath*1.45);   /* he never rests: he endures */
  return {id, def:d, stall, body, O:body.breath, C:body.grip, P:3, run:0, trance:false, resting:false, caught:0, out:false, outAt:0, how:'', hangT:0};
}

/**
 * One beat of a rival: decide a step, pay for it, maybe climb back. Rest is decided per second by rivalRest.
 * @param {any} r @param {{load:number,heavy:number,event:string,warp:boolean}} c @param {()=>number} rnd
 * @returns {string} the step's grade ('' while he rests)
 */
export function rivalBeat(r,c,rnd){
  if(r.out||r.resting) return '';
  const f=clamp01(r.O/r.body.breath), d=r.def;
  let acc=d.acc*(d.burn?Math.max(0.55,1.1-0.0045*r.beats):1);
  if((c.warp||c.event==='brake'||c.event==='jam')&&(d.clumsy||rnd()<0.35)) acc*=0.35;
  const pMiss=0.02+0.3*(1-f)*(1-f)+(1-acc)*0.06+(r.O<=0?0.7:0);
  const pOff=(1-acc)*0.45+0.15*(1-f);
  const pClean=acc*(0.25+0.6*f);
  const x=rnd();
  const g=x<pMiss?'miss':x<pMiss+pOff?'off':x<pMiss+pOff+pClean&&r.O>0?'clean':'good';
  r.beats=(r.beats||0)+1;
  r.run=g==='clean'?r.run+1:0; if(r.run>=TRANCE_AT) r.trance=true; if(g!=='clean') r.trance=false;
  r.O=Math.max(0,r.O-stepCost(g,{load:c.load,hunger:r.body.hunger,use:r.body.use,heavy:c.heavy,trance:r.trance,low:r.P<2.5}));
  if(r.O>r.body.breath) r.O=r.body.breath;
  if(g==='miss') r.P=Math.max(0,r.P-1);
  if(r.P<3&&r.O>8&&rnd()<0.6){ r.P=Math.min(3,r.P+CLIMB_STEP*2); r.O=Math.max(0,r.O-CLIMB_COST*2*r.body.climb); }   // two climbing steps between beats
  return g;
}

/**
 * A rival's hands for one tick: rest on the rail when the lantern is far, let go when it comes, hang when he sinks.
 * @param {any} r @param {{dt:number,beam:number,phase:string}} c @param {()=>number} rnd
 * @returns {boolean} caught this tick
 */
export function rivalHands(r,c,rnd){
  if(r.out) return false;
  const d=r.def, f=clamp01(r.O/r.body.breath), lit=c.phase==='watch'||c.phase==='back'?beamOn(c.beam,r.stall):0;
  const near=c.phase==='watch'||c.phase==='back'?Math.abs(c.beam-r.stall):9;
  if(r.resting){
    const late=d.bold*0.6;   // a bold man lets go late
    if(r.C<6||r.O>=r.body.breath*0.98||(c.phase==='warn'&&rnd()<(1-late)*c.dt*3)||(near<1.6-late&&rnd()<c.dt*6)) r.resting=false;
  } else if(!d.pious&&r.P>=1&&r.C>r.body.grip*0.45&&f<0.8&&(c.phase==='away'||(near>=2.5&&rnd()<d.bold*0.5))&&rnd()<c.dt*(0.4+d.bold)) r.resting=true;
  if(r.resting){ r.O=Math.min(r.body.breath,r.O+REST_GAIN*r.body.regen*c.dt); r.C=Math.max(0,r.C-REST_GRIP*c.dt); }
  else if(r.P<=0){ r.C=Math.max(0,r.C-HANG_GRIP*c.dt); r.hangT+=c.dt; }
  else { r.C=Math.min(r.body.grip,r.C+GRIP_BACK*c.dt); r.hangT=0; }
  if(r.resting&&lit>0.5){ r.resting=false; r.caught++; r.O=Math.max(0,r.O-(CAUGHT[r.caught-1]??0)); return true; }
  return false;
}

/** Is a rival done: off the wheel by grip, or thrown off by the warder? @param {any} r @returns {string} '' | 'fell' | 'thrown' */
export function rivalDone(r){
  if(r.out) return r.how;
  if(r.caught>=CAUGHT_OUT) return 'thrown';
  if(r.P<=0&&r.C<=0) return 'fell';
  return '';
}

/* ---------- the session's score ---------- */

/** Quality of a wheel session (0..1). @param {Record<string,number>} m */
export function wheelQuality(m){
  const steps=(m.clean||0)+(m.good||0)+(m.off||0)+(m.missed||0), field=Math.max(2,m.field||2), place=Math.max(1,m.place||field);
  if((m.caught||0)>=CAUGHT_OUT) return 0;
  return clamp01(0.5*(1-(place-1)/(field-1))+0.35*(steps?(m.clean||0)/steps:0)+0.15*(1-(m.caught||0)/CAUGHT_OUT)+0.04*(m.alone||0));   /* every 10 s alone on the wheel adds to the grade */
}

/** Completion of a wheel session (0..1): time against the stage's target, a win is whole; thrown off is nothing.
 * @param {Record<string,number>} m @param {{target:number}} p */
export function wheelComplete(m,p){
  if((m.caught||0)>=CAUGHT_OUT) return 0;
  if(m.won) return 1;
  return clamp01((m.sec||0)/p.target);
}

/** What each tempo event looks like before it comes, for the board before the wheel. */
const EVENT_TELLS = /** @type {Record<string,string>} */ ({
  bell:'<b>dzwon</b> — sznur drga, klucznik luzuje hamulec: koło przyspiesza',
  warp:'<b>krzywa deska</b> — jasna, pęknięta; schodzi do kreski z opóźnieniem',
  wind:'<b>wiatr</b> — kurz sypie się z dachu: przez chwilę koło jest cięższe',
  brake:'<b>szarpnięcie hamulca</b> — klucznik łapie dźwignię: dwa takty wolniej',
  jam:'<b>zastój</b> — iskra w trybach, deski stają, potem ruszają podwójnie',
  knock:'<b>kołatka</b> — klucznik stuka kijem obok rytmu; licz deski, nie stuk',
});

/** The board before the wheel: how to play, for the stage being taken.
 * @param {{rivals:string[],bpm:number[],events:string[],fake:boolean}} p stage parameters
 * @param {string} roman stage numeral @param {boolean} [cobb] blind Cobb on duty
 * @returns {{title:string,lead:string,rows:[string,string][]}} rows of label and HTML text */
export function wheelBrief(p,roman,cobb=false){
  const men=p.rivals.map(id=>RIVALS[id]?.name||id).join(', ');
  /** @type {[string,string][]} */
  const rows=[
    ['Cel','Zostań na kole najdłużej. Kto odpadnie, siada na ławce, a koło robi się cięższe dla reszty. Ostatni wygrywa.'],
    ['Kroki','<b>← / →</b> na zmianę, kiedy krawędź deski dochodzi do kredowej kreski. Krok na kresce prawie nic nie kosztuje, obok niej — dużo. Pominięta deska zsuwa cię stopień niżej.'],
    ['Siły','Paski na słupkach twojego boksu (17): <b>oddech</b> i <b>chwyt</b>. Bez oddechu trudniej trafić w kreskę. Zsunięty na dół wisisz na poręczy — wdrapuj się krokami, zanim puszczą ręce.'],
    ['Poręcz','<b>↑</b> (przytrzymaj) — oprzyj się i złap oddech. Wolno tylko, kiedy klucznik odwróci głowę <b>do ciebie</b>, a jego latarnia zgaśnie. Gdy snop światła trafi twój boks: krzyk, potem kij. Za trzecim razem zrzuca z koła — bez treningu i bez kolacji.'],
    ['Zejście','<b>↓</b> (przytrzymaj) lub <b>Esc</b> — zejdź sam. Po wygranej: <b>←</b> zejdź albo <b>→</b> zostań sam na kole po premię.'],
    ['Na kole',men+' · tempo '+p.bpm[0]+' → '+p.bpm[1]+' kroków/min'],
    ['Uważaj',p.events.map(e=>EVENT_TELLS[e]).filter(Boolean).join('<br>')+(p.fake?'<br><b>fałszywe odwrócenie</b> — klucznik zaczyna obracać głowę i nagle wraca':'')],
  ];
  if(cobb) rows.push(['Dyżur','Ślepy Cobb: dłużej patrzy w pustkę, latarnia wolniej sunie po boksach.']);
  return {title:'KIERAT · STOPIEŃ '+roman,lead:'Szopa kieratu. Cztery boksy na jednym kole, klucznik z latarnią przy piecu.',rows};
}
