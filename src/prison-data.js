/* Prison act (pure data and rules): save shape and sanitizer.
   Retired respect/report/paid-slaughterhouse fields and rules remain for old saves,
   tests and the optional Smithfield debug prototype; they are not live prison rewards. */

/** @typedef {'prison'|'free'} Phase */
/**
 * @typedef {object} PrisonSave
 * @property {number} opinia      Guards' and educator's opinion, 0–100.
 * @property {number} respekt     Inmates' respect, 0–100.
 * @property {number[]} raporty   Days of recent disciplinary reports.
 * @property {number} izolatkaDo  Retired save field; always 0.
 * @property {number} wypiska     Prison account the turnkey sells against at the flap (shillings; shown with fmtMoney).
 * @property {number} depozyt     Locked deposit paid out on release (shillings).
 * @property {number} fajki       Chewing tobacco quids (prymki), contraband and the inmates' currency.
 * @property {Record<string,number>} zapasy   Goods bought from the turnkey at the flap.
 * @property {{wygrane:number,ostatnie:number}} bicie   Sunday fights.
 * @property {Record<string,number>} pamiec   Fights per opponent (Pamięć spacerniaka).
 * @property {Record<string,number>} pokonani   Wins per rival (his name in sparring.js in lower case, e.g. jack): the ladder.
 * @property {{ostatnie:number,flagi:Record<string,boolean>}} zdarzenia   Daily events.
 * @property {Record<'str'|'spd'|'end',number>} bank   XP above the prison level cap.
 * @property {{rozdzial:number,lekcje:Record<string,boolean>,wygrane:Record<string,boolean>,wspomnienia:string[]}} lista   Profesor's list.
 * @property {{zdarzenie:boolean,do:number,glodDo:number}} ambulatorium   Rigged fight, infirmary and revenge hunger.
 * @property {{uwaga:string,zadanie:{dzien:number,id:string,zaliczone:boolean},spotkany:boolean}} profesor
 * @property {{dzien:number,gry:number,dokladki:number}} stol   Canteen table games of the day.
 * @property {number[]} norma     Last work shifts in percent of the quota.
 * @property {number} zmiany    Work shifts done (raises the slaughterhouse assignment stage).
 * @property {number} upomnienie  Night (day it began) of the last guard warning for training after lights out.
 * @property {number} przyjecie   Step of the day-one intake (0 = not started, 99 = done).
 * @property {number} zegar       Absolute minute (day·1440 + min) up to which schedule events were handled.
 * @property {Record<string,boolean>} flagi   Story flags.
 */

const ID = /^[a-z0-9:_-]{1,48}$/;
const TREES = /** @type {const} */ (['str','spd','end']);

/** @returns {PrisonSave} */
export function prisonDefaults(){
  return {opinia:50, respekt:0, raporty:[], izolatkaDo:0, wypiska:0, depozyt:0, fajki:0,
    zapasy:{}, bicie:{wygrane:0,ostatnie:0}, pamiec:{}, pokonani:{}, zdarzenia:{ostatnie:0,flagi:{}},
    bank:{str:0,spd:0,end:0}, lista:{rozdzial:1,lekcje:{},wygrane:{},wspomnienia:[]},
    ambulatorium:{zdarzenie:false,do:0,glodDo:0},
    profesor:{uwaga:'',zadanie:{dzien:0,id:'',zaliczone:false},spotkany:false},
    stol:{dzien:0,gry:0,dokladki:0}, norma:[], zmiany:0, upomnienie:0, przyjecie:0, zegar:0, flagi:{}};
}

/** @param {unknown} v @returns {Record<string,any>} */
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string,any>} */ (v) : {};
/** @param {unknown} v @param {number} fb @param {number} lo @param {number} hi */
const num = (v,fb,lo,hi) => typeof v === 'number' && Number.isFinite(v) ? Math.max(lo,Math.min(hi,v)) : fb;
/** @param {unknown} v @param {number} fb @param {number} lo @param {number} hi */
const int = (v,fb,lo,hi) => Math.floor(num(v,fb,lo,hi));
/** @param {unknown} v @param {number} max @returns {Record<string,number>} */
function counts(v,max){
  /** @type {Record<string,number>} */ const out={};
  for(const [k,n] of Object.entries(obj(v)).slice(0,64)) if(ID.test(k)&&Number.isInteger(n)&&n>=0&&n<=max) out[k]=n;
  return out;
}
/** @param {unknown} v @returns {Record<string,boolean>} */
function flags(v){
  /** @type {Record<string,boolean>} */ const out={};
  for(const [k,b] of Object.entries(obj(v)).slice(0,128)) if(ID.test(k)&&b===true) out[k]=true;
  return out;
}
/** @param {unknown} v @param {number} len @param {number} lo @param {number} hi @returns {number[]} */
function ints(v,len,lo,hi){
  return (Array.isArray(v)?v:[]).filter(n=>Number.isInteger(n)&&n>=lo&&n<=hi).slice(-len);
}

/** Rebuild a stored prison block from defaults, keeping only valid values. @param {unknown} raw @returns {PrisonSave} */
export function sanitizePrison(raw){
  const d=obj(raw), out=prisonDefaults(), DAY=Number.MAX_SAFE_INTEGER;
  out.opinia=num(d.opinia,out.opinia,0,100);
  out.respekt=num(d.respekt,out.respekt,0,100);
  out.raporty=ints(d.raporty,20,1,DAY);
  out.wypiska=num(d.wypiska,0,0,1e7); out.depozyt=num(d.depozyt,0,0,1e7); out.fajki=int(d.fajki,0,0,1e6);
  out.zapasy=counts(d.zapasy,99);
  const b=obj(d.bicie); out.bicie={wygrane:int(b.wygrane,0,0,1e4),ostatnie:int(b.ostatnie,0,0,DAY)};
  out.pamiec=counts(d.pamiec,1e4);
  const z=obj(d.zdarzenia); out.zdarzenia={ostatnie:int(z.ostatnie,0,0,DAY),flagi:flags(z.flagi)};
  const bank=obj(d.bank); for(const k of TREES) out.bank[k]=num(bank[k],0,0,1e7);
  const l=obj(d.lista);
  out.lista={rozdzial:int(l.rozdzial,1,1,11),lekcje:flags(l.lekcje),wygrane:flags(l.wygrane),
    wspomnienia:(Array.isArray(l.wspomnienia)?l.wspomnienia:[]).filter(s=>typeof s==='string'&&ID.test(s)).slice(0,32)};
  out.pokonani=d.pokonani===undefined?Object.fromEntries(LISTA.filter(L=>out.lista.wygrane[String(L.n)]).map(L=>[L.rival,1])):counts(d.pokonani,1e4);   // older saves: the names won from Profesor's list
  const a=obj(d.ambulatorium); out.ambulatorium={zdarzenie:a.zdarzenie===true,do:int(a.do,0,0,DAY),glodDo:int(a.glodDo,0,0,DAY)};
  const p=obj(d.profesor), pz=obj(p.zadanie);
  out.profesor={uwaga:typeof p.uwaga==='string'&&ID.test(p.uwaga)?p.uwaga:'',
    zadanie:{dzien:int(pz.dzien,0,0,DAY),id:typeof pz.id==='string'&&ID.test(pz.id)?pz.id:'',zaliczone:pz.zaliczone===true},spotkany:p.spotkany===true};
  const s=obj(d.stol); out.stol={dzien:int(s.dzien,0,0,DAY),gry:int(s.gry,0,0,99),dokladki:int(s.dokladki,0,0,99)};
  out.norma=ints(d.norma,7,0,300);
  out.zmiany=int(d.zmiany,0,0,1e5);
  out.upomnienie=int(d.upomnienie,0,0,DAY);
  out.przyjecie=int(d.przyjecie,0,0,99);
  out.zegar=int(d.zegar,0,0,DAY);
  out.flagi=flags(d.flagi);
  delete out.flagi['do-izolatki']; // Retired transfer must not survive loading an old save.
  return out;
}



/**
 * Money for the player: a decimal number of shillings as shillings and pence (12 pence to the shilling).
 * @param {number} x shillings (fractions and negatives allowed) @returns {string} e.g. "1 szyl. 6 p.", "3 szyl.", "6 p."
 */
export function fmtMoney(x){
  const v=Number.isFinite(x)?x:0, p=Math.round(Math.abs(v)*12), s=Math.floor(p/12), d=p%12;
  return (v<0&&p?'−':'')+(s&&d?s+' szyl. '+d+' p.':s?s+' szyl.':d+' p.');
}

/** Rooms that belong to the prison (others are closed while the phase is 'prison'). */
export const PRISON_ROOMS = ['cell','yard','laznia'];   /* Newgate: no canteen, meals come through the Ward's door */

/* =====================================================================
   THE WEEK
   Day 1 is a Monday (intake). Mon–Sat: work at the slaughterhouse from day 2; Sunday: no work, the Sunday brawl on the
   yard at noon. The day itself is three phases of two actions (simulation.js).
   ===================================================================== */

export const WEEKDAYS = ['poniedziałek','wtorek','środa','czwartek','piątek','sobota','niedziela'];
/** 0 = Monday … 6 = Sunday. @param {number} day */
export function weekday(day){ return ((Math.floor(day)-1)%7+7)%7; }
/** Work at the slaughterhouse: Monday–Saturday from day 2. @param {number} day */
export function isWorkDay(day){ return day>=2&&weekday(day)<6; }
/** Canteen window (wypiska): Monday and Thursday at supper. @param {number} day */
export function isShopDay(day){ const w=weekday(day); return w===0||w===3; }

/** Absolute minute. @param {number} day @param {number} min */
export function absMin(day,min){ return Math.floor(day)*1440+min; }

/** HH:MM of an absolute or day minute. @param {number} m */
export function clock(m){ const x=((Math.round(m)%1440)+1440)%1440; return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0'); }

/* =====================================================================
   RESPECT
   ===================================================================== */

/** Where an inmate of a fighting rank stands among the prisoners (0–4). @param {number} fightRank */
export function inmateRank(fightRank){ return fightRank<6?0:fightRank<10?1:fightRank<14?2:fightRank<18?3:4; }

/* =====================================================================
   CANTEEN: meals, table seats by respect, arm wrestling for a portion
   ===================================================================== */

/** Food from a meal and from a won extra portion. */
export const MEAL_FOOD = 32, EXTRA_PORTION = 20;

/**
 * Arm wrestling setup. The bar runs from −1 (the player's hand on the table) to +1 (the rival's).
 * Respect gives a head start and makes the rival surge less often; strength and endurance give push and stamina.
 * @param {{myRank:number,oppRank:number,strLvl:number,endLvl:number,oppFight:number}} p
 */
export function armSetup(p){
  return {start:0,
    push:0.08*(0.8+0.03*(p.strLvl-1)),                // bar gained by a press on the beat (×1.6 perfect, ×0.35 off the beat)
    stamina:40+2*(p.endLvl-1),                         // presses before the arm tires
    oppForce:0.001*(0.8+0.04*p.oppFight),              // steady pull of the rival per tick
    surgeGap:150,   // ticks between surges; an intimidated rival surges less
    surge:0.006*(0.8+0.04*p.oppFight),                 // extra pull per tick during a surge (×0.3 when braced)
    brace:0.3, surgeLen:24, limit:20*60};
}
/** Result of a finished bout from the bar position. @param {number} bar */
export function armResult(bar){ return bar>=1?'win':bar<=-1?'loss':'draw'; }

/* =====================================================================
   WORK: the slaughterhouse at Smithfield, a short walk from the gate (work.js)
   The hired gang hauls half carcasses from the cart onto the hooks; the quota (norma, %) decides pay and opinion.
   ===================================================================== */

/** Shillings for a 100% shift; premium from 110%, „przodownik” from 120%. */
export const WORK_PAY = 12, WORK_PREMIA = 3, WORK_PRZODOWNIK = 5;
/** Halves to hang in a shift by assignment stage 1–3 (index = stage). */
export const WORK_TARGET = [0,6,8,10];

/** Small deterministic hash of a day (and a salt) to 0..1. @param {number} day @param {number} salt */
export function dayRand(day,salt){ let x=(Math.floor(day)*2654435761+salt*40503)>>>0; x=(x^(x>>>15))>>>0; x=Math.imul(x,2246822519)>>>0; x=(x^(x>>>13))>>>0; return (x%10007)/10007; }

/** Assignment stage from the shifts worked and opinion. @param {number} shifts @param {number} opinia */
export function workStage(shifts,opinia){ return 1+(shifts>=5&&opinia>=50?1:0)+(shifts>=12&&opinia>=60?1:0); }

/**
 * Quota of a shift in percent: halves on the hooks against the target, a dropped one costs, punching the meat at the
 * end of the shift (the boxing finale) earns a little. @param {number} hung @param {number} target @param {number} drops @param {number} punches
 */
export function workNorma(hung,target,drops,punches){
  return Math.max(0,Math.min(150,Math.round(100*hung/Math.max(1,target)-8*drops+Math.min(20,Math.floor(punches/4)))));
}

/** Pay and opinion of a quota. @param {number} norma */
export function workPay(norma){
  const zl=Math.round((WORK_PAY*norma/100+(norma>=110?WORK_PREMIA:0)+(norma>=120?WORK_PRZODOWNIK:0))*100)/100;
  const wyp=Math.round(zl*50)/100;
  return {zl, wypiska:wyp, depozyt:Math.round((zl-wyp)*100)/100, opinia:norma>=120?3:norma>=100?2:norma<80?-2:0,
    przodownik:norma>=120, skarga:norma<80};
}

/* =====================================================================
   SUPERVISION: opinion, respect from fights, guard risk, reports
   ===================================================================== */

/** Historic guard-opinion thresholds; account and trading UI may still read these values. */
export const OPINIA_GOOD = 70, OPINIA_NO_SHOP = 30;

/* =====================================================================
   PROFESOR: fight notes and the daily task
   ===================================================================== */

/** Notes after a fight: what he says and which drill gets +10% XP next time. */
export const NOTES = /** @type {Record<string,{text:string,drill:string}>} */ ({
  celnosc:{text:'Machasz. Mniej, a celniej — co trzeci cios w powietrze to prezent dla niego.',drill:'shadow'},
  garda:{text:'Opuszczasz prawą. Każdy cios wraca do brody, inaczej zbierasz wszystko na twarz.',drill:'shadow'},
  kondycja:{text:'Zgasłeś w połowie. Najpierw płuca, potem pięści.',drill:'pushup'},
  korpus:{text:'Korpus nie ucieknie. Bij na dół, to głowa sama opadnie.',drill:'shadow'},
  kontry:{text:'Nogi dobre. Teraz kontruj — unik to dopiero pół roboty.',drill:'shadow'},
});
/** XP bonus of a told note and of the daily task. */
export const NOTE_BONUS = 0.10, TASK_BONUS = 0.20;

/**
 * The single note Profesor makes about a fight ('' when there is nothing to say).
 * @param {{thrown:number,landed:number,taken:number,minSta:number,body:number,evades:number,counters:number}} f
 */
export function fightNote(f){
  if(f.thrown>=10&&f.landed/f.thrown<0.35) return 'celnosc';
  if(f.taken>=15) return 'garda';
  if(f.minSta<0.15) return 'kondycja';
  if(f.landed>=5&&f.body===0) return 'korpus';
  if(f.evades>=8&&f.counters<2) return 'kontry';
  return '';
}

/** Daily tasks: a drill and the grade (or quota) to reach. */
export const DAILY_TASKS = /** @type {Record<string,{text:string,drill:string,grade?:string,norma?:number,won?:boolean}>} */ ({
  'podciaganie-b':{text:'Minuta podciągania na kracie okna, na ocenę co najmniej B.',drill:'pullup',grade:'B'},
  'pompki-b':{text:'Minuta pompek, na ocenę co najmniej B.',drill:'pushup',grade:'B'},
  'cien-b':{text:'Dziesięć kombinacji z cieniem, na ocenę co najmniej B.',drill:'shadow',grade:'B'},
  'norma-100':{text:'W rzeźni wyrób normę. Sto procent, nie mniej.',drill:'work',norma:100},
});
const GRADES=['D','C','B','A','S'];

/** The task for the weakest tree; only currently available training is assigned.
 * @param {{str:number,spd:number,end:number}} lv @param {boolean} workDay @param {number} [day] */
export function dailyTask(lv,workDay,day=0){
  const order=/** @type {('end'|'spd'|'str')[]} */ (['end','spd','str']), k=order.reduce((a,b)=>lv[b]<lv[a]?b:a);
  return k==='str'?'podciaganie-b':k==='spd'?'cien-b':'pompki-b';
}

/** Did a finished session fulfil the task? @param {string} id @param {{id:string,aborted?:boolean,grade:string,metrics?:Record<string,number>}} r */
export function taskDone(id,r){
  const T=DAILY_TASKS[id]; if(!T||r.id!==T.drill||r.aborted) return false;
  if(T.norma) return (r.metrics?.norma||0)>=T.norma;
  if(T.won) return !!r.metrics?.won;
  return GRADES.indexOf(r.grade)>=GRADES.indexOf(T.grade||'B');
}

/* =====================================================================
   PROFESOR'S LIST: the vendetta, ten names in order
   opp = 'venue:index' into the venue's opponent table (sparring CELL_OPP / YARD_OPP / CANTEEN_OPP).
   need = respect rank index; when = extra condition; lesson = the bonus condition and its reward.
   ===================================================================== */

/** @typedef {{n:number,rival:string,opp:string,name:string,where:string,need:number,when?:'evening'|'sunday',lesson:{key:string,text:string},reward:{punkt?:boolean,cien?:number,spacerniak?:boolean,final?:boolean},rigged?:boolean}} ListEntry */
/** @type {ListEntry[]} */
export const LISTA = [
  {n:1,rival:'jack',opp:'yard:0',name:'Jack „Młody” Morley',where:'spacerniak',need:0,lesson:{key:'blocks8',text:'co najmniej 8 zablokowanych ciosów'},reward:{}},
  {n:2,rival:'walter',opp:'yard:1',name:'Walter „Chudy” Pratt',where:'spacerniak',need:0,lesson:{key:'body40',text:'wygraj, pracując na korpus (co najmniej 40% trafień)'},reward:{punkt:true}},
  {n:3,rival:'zeke',opp:'canteen:0',name:'Zeke „Kosa” Price',where:'Ward, przy posiłku',need:1,lesson:{key:'nocut',text:'nie daj się rozciąć'},reward:{}},
  {n:4,rival:'joseph',opp:'yard:2',name:'Joseph „Siwy” Marsh',where:'spacerniak',need:1,lesson:{key:'counters3',text:'co najmniej 3 kontry'},reward:{cien:2}},
  {n:5,rival:'albert',opp:'yard:3',name:'Albert „Ciężki” Rudd',where:'spacerniak',need:1,lesson:{key:'nokd',text:'wygraj bez nokdaunu'},reward:{punkt:true}},
  {n:6,rival:'silas',opp:'yard:4',name:'Silas „Cichy” Crane',where:'spacerniak',need:2,lesson:{key:'evades12',text:'co najmniej 12 uników (w rewanżu)'},reward:{cien:3},rigged:true},
  {n:7,rival:'reuben',opp:'cell:2',name:'Reuben „Kruk” Doyle',where:'Ward, wieczorem',need:2,when:'evening',lesson:{key:'evades8',text:'co najmniej 8 uników — uciekaj przed jego ładowanymi'},reward:{punkt:true}},
  {n:8,rival:'ned',opp:'yard:5',name:'Ned „Dym” Coker',where:'spacerniak, w niedzielę',need:3,when:'sunday',lesson:{key:'sunday',text:'wygraj w niedzielnym biciu'},reward:{}},
  {n:9,rival:'dan',opp:'canteen:1',name:'Dan „Głaz” Mullins',where:'Ward, przy posiłku, przy wszystkich',need:3,lesson:{key:'ko',text:'nokaut'},reward:{spacerniak:true}},
  {n:10,rival:'szef',opp:'yard:7',name:'Szef spacerniaka',where:'spacerniak',need:4,lesson:{key:'none',text:'—'},reward:{final:true}},
];

/* =====================================================================
   THE LADDER (TALIA.md §5): every fighter of Newgate from the weakest, with where to find him and how to beat him.
   The character sheet shows the first one not beaten yet; Profesor's list above stays the story.
   ===================================================================== */

/** @typedef {{rival:string,name:string,stars:string,where:string,tip:string}} LadderEntry */
/** @type {LadderEntry[]} */
export const LADDER = [
  {rival:'harry',name:'Harry „Stary” Hobbs',stars:'★',where:'cela — współwięzień',tip:'zamyka się w gardzie i oddaje hak na żebra. Zwód, a nie cios w gardę.'},
  {rival:'jack',name:'Jack „Młody” Morley',stars:'★',where:'cela lub spacerniak',tip:'bije ile wlezie, prawie się nie broni. Garda i unik, potem kontra.'},
  {rival:'walter',name:'Walter „Chudy” Pratt',stars:'★',where:'cela lub spacerniak',tip:'ucieka i dziobie z daleka. Bij na korpus — ciężkie nogi go zatrzymają.'},
  {rival:'bill',name:'Bill „Gruby” Bellamy',stars:'★',where:'Ward, przy posiłku — gdy zabiera miski',tip:'pcha pod ścianę. Nie odskakuj; Mijanka spod ściany.'},
  {rival:'zeke',name:'Zeke „Kosa” Price',stars:'★',where:'cela — współwięzień, albo przy posiłku',tip:'Kosa: długi prawy szybki jak jab. Unik pod prosty i wchodź.'},
  {rival:'joseph',name:'Joseph „Siwy” Marsh',stars:'★',where:'spacerniak',tip:'paruje proste. Mieszaj piętra, bij hakiem i na korpus.'},
  {rival:'albert',name:'Albert „Ciężki” Rudd',stars:'★★',where:'spacerniak',tip:'uppercut od progu, potem korpus. Sparuj uppercut albo bij na korpus, zanim go wyprowadzi.'},
  {rival:'reuben',name:'Reuben „Kruk” Doyle',stars:'★★',where:'cela — współwięzień, wieczorem',tip:'trzy jaby, potem ciężka ręka. Unik na dziobanie, parowanie na to, co po nim.'},
  {rival:'silas',name:'Silas „Cichy” Crane',stars:'★★',where:'spacerniak',tip:'czyta twój plan i blokuje ciężkie ciosy. Szybkie i nieregularne układy.'},
  {rival:'ned',name:'Ned „Dym” Coker',stars:'★★',where:'spacerniak, niedzielne bicie w południe',tip:'głowa, korpus, głowa. Drugi cios idzie na wątrobę — sparuj go.'},
  {rival:'dan',name:'Dan „Głaz” Mullins',stars:'★★',where:'Ward, przy posiłku, przy wszystkich',tip:'uppercut bez zamachu. Unik i ciosy na korpus.'},
  {rival:'szef',name:'Szef spacerniaka',stars:'★★★',where:'spacerniak — lista Profesora',tip:'czyta i podmienia kartę, bije brudno. Zwody i trzymaj zdrowie.'},
];

/** The next fighter to beat on the ladder (null when all are beaten). @param {Record<string,number>} pokonani */
export function ladderNext(pokonani){ return LADDER.find(e=>!pokonani[e.rival])||null; }

/** The entry of a chapter (1–10; 11 = the list is done). @param {number} rozdzial */
export function listEntry(rozdzial){ return LISTA[rozdzial-1]||null; }

/** Card brawls have a few exchanges where a real-time fight has dozens: the same lessons with smaller numbers. */
const CARD_LESSONS=/** @type {Record<string,{n:number,text:string}>} */ ({blocks8:{n:3,text:'co najmniej 3 ciosy zatrzymane parowaniem'},
  counters3:{n:2,text:'co najmniej 2 ciosy z Otwarcia'},evades12:{n:4,text:'co najmniej 4 uniki (w rewanżu)'},
  evades8:{n:3,text:'co najmniej 3 uniki — uciekaj przed jego dziobaniem'}});

/** What Profesor wants to see, in the words of the current fight rules. @param {{lesson:{key:string,text:string}}} entry @param {boolean} cards */
export function lessonText(entry,cards){ return cards&&CARD_LESSONS[entry.lesson.key]?CARD_LESSONS[entry.lesson.key].text:entry.lesson.text; }

/**
 * Was the lesson met in this fight? @param {string} key
 * @param {{win:boolean,ko:boolean,blocks:number,landed:number,body:number,cuts:number,counters:number,kdTaken:number,evades:number,sunday:boolean,cards?:boolean}} f  cards: a card brawl (smaller numbers)
 */
export function lessonOk(key,f){
  if(!f.win) return false;
  const n=(/** @type {number} */ real)=>f.cards&&CARD_LESSONS[key]?CARD_LESSONS[key].n:real;
  switch(key){
    case 'blocks8': return f.blocks>=n(8);
    case 'body40': return f.landed>0&&f.body/f.landed>=0.4;
    case 'nocut': return f.cuts===0;
    case 'counters3': return f.counters>=n(3);
    case 'nokd': return f.kdTaken===0;
    case 'evades12': return f.evades>=n(12);
    case 'evades8': return f.evades>=n(8);
    case 'sunday': return f.sunday;
    case 'ko': return f.ko;
    default: return false;
  }
}

/** Highest stage of Cień z Profesorem unlocked by the lessons (I, II after #4, III after #6). @param {Record<string,boolean>} lekcje */
export function cienStage(lekcje){ return lekcje['6']?3:lekcje['4']?2:1; }

/** Memory cards the list uncovers at night, one per won name. */
export const MEMORIES = /** @type {Record<string,{title:string,body:string}>} */ ({
  '1':{title:'Rycina z ringu',body:'Pożółkła rycina z „Bell’s Life”: ring na łące pod Moulsey Hurst, młody pięściarz z uniesioną ręką. Przy linach sędzia z zegarkiem — ta sama szczęka co u Jacka. „Jego ojciec liczył mi wtedy sekundy do kreski. Za wolno, jak na moje nogi. Za szybko, jak na tych, co postawili przeciwko mnie”.'},
  '2':{title:'Kwit z zakładów',body:'Pomięty kwit bukmachera z czterdziestego czwartego. Na odwrocie, ołówkiem: „Chudy — 300 gwinei”. „Walter był wtedy dzieckiem. Ale jego stary trzymał kasę. Dzieci płacą za ojców, tak tu jest”.'},
  '3':{title:'Wycinek z gazety',body:'„Bell’s Life in London”: sensacyjna porażka faworyta pod Hampton. Ktoś wyciął rycinę z widowni i zakreślił twarz w trzecim rzędzie. Młody Zeke, z brzytwą w kieszeni surduta. „Kosa to nie przezwisko. To było ostrzeżenie”.'},
  '4':{title:'List bez znaczka',body:'„Panie, nie mogłem inaczej” — podpisane J. Profesor nie mówi, co to znaczy. Mówi tylko: „Joseph siwiał już wtedy. Ze strachu siwieje się szybciej”.'},
  '5':{title:'Karta ze szpitala',body:'Szpital św. Bartłomieja, sala dla połamanych, rok pięćdziesiąty pierwszy. Kręgosłup, krzyż. Pod spodem ktoś dopisał: „wypadek w dokach”. „Albert chodził wtedy przy żurawiu w dokach św. Katarzyny. Ciężki był już wtedy. Ciężka była też ta skrzynia herbaty, co mi spadła na plecy”.'},
  '6':{title:'Kastet z łyżki',body:'Profesor obraca w palcach wygięty kawałek cyny. „Taki sam. Szef zawsze lubił łyżki od miski — nic nie kosztują, a robią swoje. Teraz wiesz, kim on jest. I wiesz, że wie, kim ty jesteś”.'},
  '7':{title:'Dagerotyp ze ślubu',body:'Ślub u św. Idziego, dwóch młodych w pożyczonych surdutach. Jeden to Reuben. Drugiemu ktoś wydrapał twarz szpilką. „Mój brat. Reuben był świadkiem. Świadkowie widzą, ale nie mówią. Tego go nauczyli”.'},
  '8':{title:'Klucz od przebieralni',body:'Mały mosiężny klucz z numerkiem 8. „Przebieralnia na tyłach gospody Pod Koroną. Ned miał wtedy dziesięć lat i podawał ręczniki. Ktoś mu dał ten klucz, żeby otworzył moją skrzynkę. Dymu nie było bez ognia”.'},
  '9':{title:'Nekrolog',body:'Wycinek z „Morning Chronicle”: zmarł nagle, w wieku trzydziestu lat — brat Profesora. „Dan trzymał go za ręce. Ktoś inny bił. Głaz się nie rusza, wiesz? Stoi i patrzy”.'},
});

/** The infirmary after the rigged fight: days skipped, a small allowance per day, revenge hunger. */
export const AMBU_DAYS = 6, AMBU_RENTA = 1.5, REVENGE_DAYS = 3, REVENGE_XP = 1.25;

/* =====================================================================
   SPACERNIAK: the small bareknuckle tree, bought with respect, frozen after prison
   ===================================================================== */

/** @typedef {{id:string,name:string,tier:number,cost:number,tag:string,description:string}} BarePerk */
/** @type {BarePerk[]} */
export const BARE_PERKS = [
  {id:'piach',name:'Garść piachu',tier:1,cost:1,tag:'Brudne',description:'T: rzut piachem w oczy, raz na walkę. Rywal pociera oczy i przez 1,2 s nie blokuje, a połowa jego ciosów chybia.'},
  {id:'szczeka',name:'Betonowa szczęka',tier:1,cost:1,tag:'Tylko bez rękawic',description:'Przyjmujesz o 15% mniej ogłuszenia. Raz na walkę nokdaun zamienia się w zachwianie.'},
  {id:'zoladek',name:'Więzienny żołądek',tier:1,cost:1,tag:'Zawsze',description:'Głód i zmęczenie obniżają formę o połowę mniej.'},
  {id:'kciuk',name:'Kciuk w oko',tier:2,cost:2,tag:'Brudne',description:'T w klinczu lub z bliska: podbite oko do końca walki — 10% ciosów rywala chybia, a czyta twoje o 20% gorzej. Maks. 2 razy, odnowienie 20 s.'},
  {id:'zaskoczenie',name:'Z zaskoczenia',tier:2,cost:2,tag:'Zawsze',description:'Pierwszy cios walki (do 2 s od „WALCZ”) i pierwszy po klinczu: rywal go nie czyta, a zadaje +40% obrażeń.'},
  {id:'dirty-work',name:'Brudna robota',tier:2,cost:2,tag:'Brudne',description:'Skille Łokieć i Z byka: brudne ciosy z bliska. Łokieć rozcina łuk, Z byka łamie nos zamroczonemu.'},
  {id:'kostki',name:'Twarde kostki',tier:2,cost:2,tag:'Tylko bez rękawic',description:'+10% obrażeń; czysty cross ma 15% szans na rozcięcie.'},
  {id:'nerki',name:'Nerki',tier:3,cost:3,tag:'Klinczer',description:'W każdym klinczu ciosy 1–4 to krótkie ciosy na korpus: każdy zabiera rywalowi kondycję i 3% jej pojemności.'},
  {id:'pamiec',name:'Pamięć spacerniaka',tier:3,cost:3,tag:'Kontrujący',description:'Z rywalem, z którym już walczyłeś, od początku widzisz zapowiedzi jego ciosów, a kontry zadają +15%. Po 3 walkach pierwszy cios każdej jego serii jest o 30% wolniejszy. Działa też na wolności.'},
  {id:'bezzasad',name:'Bez zasad',tier:3,cost:3,tag:'Brudny',description:'Triki (piach, kciuk) odnawiają się co 15 s zamiast raz na walkę. Na ringu pierwszy brudny cios w rundzie uchodzi uwadze sędziego.'},
];
/** Respect rank needed for each tier (Znany, Szanowany, Twardziel). */
export const BARE_TIER_RANK = [0,1,2,3];
/** Changing the build: Profesor, in prison, for tobacco twists. */
export const BARE_RESPEC_FAJKI = 20;

/** Points of the tree: one per rank reached from Znany, the first Sunday brawl won, the lesson with Dan. @param {{maxRank:number,bicie:boolean,glaz:boolean}} p */
export function barePoints(p){ return Math.max(0,Math.min(4,p.maxRank))+(p.bicie?1:0)+(p.glaz?1:0); }

/** Points spent. @param {string[]} unlocked */
export function bareSpent(unlocked){ return unlocked.reduce((a,id)=>a+(BARE_PERKS.find(p=>p.id===id)?.cost||0),0); }

/**
 * Why a perk cannot be bought ('' when it can).
 * @param {string} id @param {{unlocked:string[],points:number,rank:number,prison:boolean}} s
 */
export function bareBlock(id,s){
  const P=BARE_PERKS.find(p=>p.id===id); if(!P) return 'unknown';
  if(s.unlocked.includes(id)) return 'owned';
  if(!s.prison) return 'frozen';
  if(s.rank<BARE_TIER_RANK[P.tier]) return 'rank';
  if(P.tier===3&&s.unlocked.some(u=>BARE_PERKS.find(p=>p.id===u)?.tier===3)) return 'choice';
  if(bareSpent(s.unlocked)+P.cost>s.points) return 'points';
  return '';
}

/* =====================================================================
   DAILY EVENTS, THE SUNDAY BRAWL, BETS
   ===================================================================== */

/** Events of the day: where they can happen. At most one a day. */
export const DAILY_EVENTS = /** @type {Record<string,{at:'apel'|'meal'|'yard',chance:number}>} */ ({
  list:{at:'apel',chance:0.4}, uwaga:{at:'apel',chance:0.4},
  taca:{at:'meal',chance:0.45}, przysluga:{at:'meal',chance:0.4},
  wyzwanie:{at:'yard',chance:0.5},
});
/** Chance that a day has an event at all. */
export const EVENT_DAY_CHANCE = 0.45;

/**
 * The event of a day at this moment ('' = none). Deterministic per day; the caller makes sure it fires once.
 * @param {number} day @param {'apel'|'meal'|'yard'} at @param {{fajki:number,rank:number,inCanteen:boolean}} ctx
 */
export function pickDailyEvent(day,at,ctx){
  if(day<2||dayRand(day,31)>=EVENT_DAY_CHANCE) return '';
  const ok=Object.keys(DAILY_EVENTS).filter(id=>DAILY_EVENTS[id].at===at&&(id!=='kipisz'||ctx.fajki>15)&&(id!=='taca'||ctx.inCanteen)&&(id!=='wyzwanie'||ctx.rank<4)&&(id!=='przysluga'||ctx.fajki>=5));
  if(!ok.length) return '';
  const id=ok[Math.floor(dayRand(day,37+at.length)*ok.length)];
  return dayRand(day,41+at.length)<DAILY_EVENTS[id].chance/EVENT_DAY_CHANCE*0.6?id:'';
}

/** The Sunday brawl: three fights of rising rank, to KO or 90 s, guards looking away. */
export const BICIE_SEC = 90;
/**
 * Yard opponents of the brawl (indices into YARD_OPP), rising; on chapter 8 Ned is the last one.
 * @param {number} avgLvl @param {number} rozdzial @param {number[]} ranks ranks of YARD_OPP 0..6
 */
export function bicieOpponents(avgLvl,rozdzial,ranks){
  const n=Math.min(ranks.length,7), s=Math.max(0,Math.min(n-3,Math.round(avgLvl/2.5)-1));
  let opp=[s,s+1,s+2];
  if(rozdzial===8&&!opp.includes(5)){ opp=[...opp.slice(0,2).filter(i=>i<5),5]; while(opp.length<3) opp.unshift(Math.max(0,opp[0]-1)); }
  return [...new Set(opp)].sort((a,b)=>ranks[a]-ranks[b]);
}

/** Bets on a yard fight: the stake is paid at the start, a win pays double. */
export const BETS = [2,5,10];
