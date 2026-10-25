/* Skill data of the player's progression: the skill catalogue, moves and punch trees, the set, the Cechy cards, lasting
   injuries, the healers and what a rival remembers. Pure data, no DOM. The file keeps its old name from the card engine,
   which is gone: the brawl is the real-time isometric fight (iso-fight.js). */

/** @typedef {'atak'|'trik'} CardKind */
/** @typedef {'L'|'R'|''} CardHand */
/**
 * @typedef {object} CardDef  a skill
 * @property {string} id
 * @property {string} name
 * @property {CardKind} kind
 * @property {number} cost  stamina
 * @property {number} speed  3 quick, 2 middle, 1 heavy: the tempo of the exchange (TEMPO_BASE − speed)
 * @property {number} dmg
 * @property {number} stun
 * @property {CardHand} hand  the punching hand (black eye, broken hand)
 * @property {boolean} heavy  slow, and a failed block lets three quarters through
 * @property {boolean} fx  carries a special effect (a cut, a body effect, a broken nose): a failed dodge raises its chance instead of the damage
 * @property {string} text
 * @property {string} [as]  the plain punch it counts as (an elbow is a hook)
 * @property {number} [hits]  quick punches in one skill (each lands on its own)
 * @property {boolean} [close]  Blisko: from Daleko it steps in (+1 tempo)
 * @property {boolean} [low]  always to the body
 * @property {boolean} [dirty]  a dirty trick the turnkey may see
 * @property {boolean} [once]  once a brawl
 * @property {string} [punch]  the punch it is acted out with (jab, cross, hook, upper)
 * @property {string[]} [seq]  the punches of a combination, in order (Raz-dwa, Burza)
 * @property {number} [wind]  Zadyszka of a body skill (1 when absent)
 */

/** @param {Partial<CardDef>&{id:string,name:string,kind:CardKind,text:string}} c @returns {CardDef} */
function card(c){ return {cost:1,speed:3,dmg:0,stun:0,hand:'',heavy:false,fx:!!c.low,...c}; }

/** Every skill by id. The player fights with a set of up to LOADOUT_MAX of them; defence is not a skill but a reaction. @type {Record<string,CardDef>} */
export const CARDS = {
  jab:      card({id:'jab',name:'Jab',kind:'atak',cost:1,speed:3,dmg:2,stun:1,hand:'L',text:'Szybki. Trafiony daje Ustawienie: następny cios (nie jab) w tej turze +1 i częściej ma efekt; cross +2.'}),
  cross:    card({id:'cross',name:'Cross',kind:'atak',cost:2,speed:2,dmg:4,stun:2,hand:'R',text:'Prosty z tylnej ręki. Przebicie: blok przepuszcza ¾. Z Ustawienia +2.'}),
  hook:     card({id:'hook',name:'Hook',kind:'atak',cost:2,speed:2,dmg:4,stun:3,hand:'L',fx:true,close:true,text:'Blisko. Z daleka robi krok. Czysty: Zachwianie (25%) — następny ruch rywala przepada; rozcina łuk (6%).'}),
  upper:    card({id:'upper',name:'Uppercut',kind:'atak',cost:3,speed:1,dmg:7,stun:4,hand:'R',heavy:true,fx:true,close:true,text:'Ciężki i wolny. Trafiony lub w blok: Rozbita garda do końca następnej tury. Nieudany blok przepuszcza ¾. Z Otwarciem III łamie nos.'}),
  'jab-k':  card({id:'jab-k',name:'Jab na korpus',kind:'atak',as:'jab',punch:'jab',cost:1,speed:3,dmg:1,hand:'L',low:true,text:'Szybki na żołądek: ciężkie nogi — reszta ciosów rywala w tej turze o 1 tempo później.'}),
  watroba:  card({id:'watroba',name:'Hak na wątrobę',kind:'atak',as:'hook',punch:'hook',cost:2,speed:2,dmg:3,hand:'L',low:true,close:true,text:'Blisko. Zadyszka 1, także przez blok. Co trzecie trafienie w walce: Skurcz.'}),
  splot:    card({id:'splot',name:'Prosty na splot',kind:'atak',as:'cross',punch:'cross',cost:2,speed:2,dmg:3,hand:'R',low:true,text:'W splot z dystansu: Zadyszka 1. Odepchnięcie: następny ruch rywala z bliska znów robi krok.'}),
  zoladek:  card({id:'zoladek',name:'Podbródkowy w żołądek',kind:'atak',as:'upper',punch:'upper',cost:3,speed:1,dmg:5,hand:'R',heavy:true,low:true,close:true,wind:2,text:'Ciężki i wolny. Zadyszka 2. Zgięty: następnego ciosu w głowę w tej turze nie da się zablokować.'}),
  'raz-dwa':card({id:'raz-dwa',name:'Raz-dwa',kind:'atak',as:'jab',punch:'jab',cost:2,speed:3,dmg:2,stun:1,hand:'L',hits:2,seq:['jab','cross'],text:'Jab i cross jeden po drugim; każdy broni się osobno.'}),
  lokiec:   card({id:'lokiec',name:'Łokieć',kind:'atak',as:'hook',punch:'hook',cost:1,speed:3,dmg:3,stun:2,hand:'R',fx:true,close:true,dirty:true,text:'Blisko. Brudny: czysty rozcina łuk w 30%.'}),
  zbyka:    card({id:'zbyka',name:'Z byka',kind:'atak',as:'hook',punch:'hook',cost:2,speed:2,dmg:4,stun:3,fx:true,close:true,dirty:true,text:'Blisko. Brudny: zamroczonemu (4+) łamie nos i dokłada 3 zamroczenia.'}),
  nerki:    card({id:'nerki',name:'Nerki',kind:'atak',as:'hook',punch:'hook',cost:2,speed:2,dmg:2,hits:2,hand:'L',close:true,low:true,text:'Blisko. Dwa krótkie na korpus, każdy Zadyszka 1.'}),
  burza:    card({id:'burza',name:'Burza ciosów',kind:'atak',as:'jab',punch:'jab',cost:5,speed:3,dmg:2,stun:1,hits:3,seq:['jab','hook','jab'],hand:'L',text:'Jab, hook i jab jeden po drugim; każdy broni się osobno.'}),
  dobicie:  card({id:'dobicie',name:'Dobicie',kind:'atak',as:'upper',punch:'upper',cost:4,speed:1,dmg:8,stun:4,hand:'R',heavy:true,fx:true,once:true,text:'Raz na walkę. Zamroczony (3+) — czysto w głowę to nokdaun. Przytomny widzi zamach: chybiasz i dajesz mu Otwarcie III.'}),
  piach:    card({id:'piach',name:'Garść piachu',kind:'trik',cost:1,speed:3,dirty:true,once:true,text:'Raz na walkę. W tej i następnej turze rywal nic nie czyta, blokuje rzadziej, a połowa jego ciosów chybia.'}),
  kciuk:    card({id:'kciuk',name:'Kciuk w oko',kind:'trik',cost:1,speed:3,dirty:true,once:true,fx:true,text:'Raz na walkę. Brudny: podbite oko, a następny ruch rywala w tej turze przepada.'}),
  kosa:     card({id:'kosa',name:'Kosa',kind:'atak',as:'cross',punch:'cross',cost:2,speed:3,dmg:4,stun:2,hand:'R',text:'Długi prawy z dystansu: szybki jak jab.'}),
  dziobanie:card({id:'dziobanie',name:'Dziobanie',kind:'atak',as:'jab',punch:'jab',cost:3,speed:3,dmg:2,stun:1,hits:3,hand:'L',text:'Trzy jaby jeden po drugim.'}),
  lawina:   card({id:'lawina',name:'Lawina',kind:'atak',as:'upper',punch:'upper',cost:3,speed:2,dmg:7,stun:4,hand:'R',fx:true,text:'Uppercut bez zamachu: szybki jak cross.'}),
  cyna:     card({id:'cyna',name:'Cynowa łyżka',kind:'atak',as:'cross',punch:'cross',cost:0,speed:3,dmg:99,hand:'R',dirty:true,once:true,text:'Kastet z łyżki w rękawie. Nie da się go zatrzymać.'}),
};

/** The tempo of a skill in the exchange: a jab 1, a cross or a hook 2, an uppercut 3; every extra punch of a combination +1. */
export const TEMPO_BASE = 4;
/** @param {CardDef} c */
export function tempoOf(c){ return Math.max(1,TEMPO_BASE-c.speed+(c.hits||1)-1); }

/* ---------- lasting injuries (KARCIANKA.md §7): kept in the save until healed ---------- */

/** @typedef {{id:string,day:number}} LastingInjury  one entry per injury; scars and ribs may repeat */
/** @typedef {{scars:number,eyeL:boolean,eyeR:boolean,nose:boolean,ribs:number,handL:boolean,handR:boolean,concussion:boolean}} LastingSpec */

/** Lasting injuries: name, what they do, how many may pile up. @type {Record<string,{name:string,effect:string,max:number}>} */
export const LASTING = {
  scar:{name:'Strup na łuku brwiowym',effect:'łuk pęka łatwiej: czysty cios w głowę rozcina go z szansą 20% (dwa strupy: 40%)',max:2},
  eyeL:{name:'Podbite lewe oko',effect:'węższe okno obrony przed prawą ręką rywala; twoje lewe ciosy chybiają w 15%',max:1},
  eyeR:{name:'Podbite prawe oko',effect:'węższe okno obrony przed lewą ręką rywala; twoje prawe ciosy chybiają w 15%',max:1},
  nose:{name:'Złamany nos',effect:'pasek kondycji −1',max:1},
  rib:{name:'Pęknięte żebro',effect:'pasek kondycji −1, hook i uppercut +1 kondycji',max:3},
  handL:{name:'Złamana kostka lewej dłoni',effect:'lewe ciosy zadają połowę i bolą ciebie',max:1},
  handR:{name:'Złamana kostka prawej dłoni',effect:'prawe ciosy zadają połowę i bolą ciebie',max:1},
  concussion:{name:'Wstrząs',effect:'węższe okna obrony w każdej bójce, trudniej wstać z desek',max:1},
};

/** Repair a saved list: known ids, a sane day, no more than each injury's maximum. @param {unknown} value @returns {LastingInjury[]} */
export function sanitizeLasting(value){
  /** @type {LastingInjury[]} */
  const out=[];
  for(const e of Array.isArray(value)?value.slice(0,32):[]){
    const id=e&&typeof e==='object'?e.id:null, day=e&&typeof e==='object'?e.day:null;
    if(typeof id!=='string'||!Object.hasOwn(LASTING,id)) continue;
    if(out.filter(x=>x.id===id).length>=LASTING[id].max) continue;
    out.push({id,day:typeof day==='number'&&Number.isFinite(day)?Math.max(1,Math.min(Number.MAX_SAFE_INTEGER,Math.floor(day))):1});
  }
  return out;
}

/** How the injuries enter the next brawl (the engine's `injuries` of a fighter). @param {LastingInjury[]} list @returns {LastingSpec} */
export function lastingSpec(list){
  const n=(/** @type {string} */ id)=>list.filter(e=>e.id===id).length;
  return {scars:n('scar'),eyeL:n('eyeL')>0,eyeR:n('eyeR')>0,nose:n('nose')>0,ribs:n('rib'),handL:n('handL')>0,handR:n('handR')>0,concussion:n('concussion')>0};
}

/**
 * The list after a brawl: what the fighter carried in plus what this brawl broke. A bleeding cut leaves one more scar.
 * @param {LastingInjury[]} list
 * @param {{cuts:number,eyeL:boolean,eyeR:boolean,nose:boolean,ribs:number,handL:boolean,handR:boolean,concussion:boolean}} inj the fighter's injuries at the end
 * @param {number} day
 * @returns {{list:LastingInjury[],added:string[]}}
 */
export function addLasting(list,inj,day){
  const out=list.map(e=>({...e})), had=lastingSpec(list);
  /** @type {string[]} */ const added=[];
  const add=(/** @type {string} */ id)=>{ if(out.filter(e=>e.id===id).length<LASTING[id].max){ out.push({id,day}); added.push(id); } };
  if(inj.cuts>0) add('scar');
  for(const id of /** @type {const} */ (['eyeL','eyeR','nose','handL','handR','concussion'])) if(inj[id]&&!had[id]) add(id);
  for(let i=had.ribs;i<inj.ribs;i++) add('rib');
  return {list:out,added};
}

/* ---------- what perks and traits do in a skill fight (KARCIANKA.md §8, PERKI.md) ----------
   The player's Cechy (skill-data.js TRAITS) and Spacerniak perks; the older tree perks stay for the rivals and old saves. */

/** @typedef {{kind:'karta'|'nacięcie'|'reguła',text:string,cards?:string[]}} PerkCard  karta: the perk teaches a skill */
/** What each perk does in a skill fight. Perk ids stay those of the trees, so saves need no migration. @type {Record<string,PerkCard>} */
export const PERK_CARDS = {
  // Siła — weight and breaking
  'body-hammer':{kind:'nacięcie',text:'Hook i cross na korpus: Zadyszka 2 zamiast 1.'},
  'guard-breaker':{kind:'reguła',text:'Twój zablokowany cios rozbija gardę jak uppercut: do końca następnej tury blok rywala zatrzymuje najwyżej 40%, a rywal blokuje rzadziej.'},
  executioner:{kind:'nacięcie',text:'Cross +3 obrażeń, gdy rywalowi zostały najwyżej 2 kondycji.'},
  finisher:{kind:'reguła',text:'Korpus, potem głowa w tej samej turze: cios w głowę +50%.'},
  shock:{kind:'nacięcie',text:'Uppercut z Otwarciem ogłusza: rywal ma o 2 kondycji mniej w następnej turze.'},
  'liver-hunter':{kind:'nacięcie',text:'Czysty hook na korpus zawsze wywołuje Skurcz wątroby (następny ruch rywala w tej turze przepada).'},
  butcher:{kind:'nacięcie',text:'Czysty hook w głowę rozcina łuk w 20% (bez perku 6%), z Otwarciem II–III zawsze.'},
  demolition:{kind:'reguła',text:'Trzy różne ciosy trafione w jednej turze: trzeci +50%.'},
  'heavy-answer':{kind:'nacięcie',text:'Czysty cross z Otwarciem dokłada od razu hook na korpus.'},
  'heavy-hands':{kind:'reguła',text:'Ciosy z Otwarciem dokładają 2 zamroczenia.'},
  'rope-pressure':{kind:'reguła',text:'Rywal, któremu w tej turze zostały najwyżej 2 kondycji, przyjmuje o 25% więcej.'},
  shove:{kind:'reguła',text:'Odepchnięcie: udane parowanie ciosu z bliska odpycha rywala — jego następny ruch w tej turze przepada.'},
  'cracked-ribs':{kind:'nacięcie',text:'Czysty hook lub cross na korpus zawsze łamie żebro (do 3).'},
  'charged-punch':{kind:'nacięcie',text:'Blok zatrzymuje najwyżej 30% twojego crossa, nawet czyste parowanie.'},
  'dirty-work':{kind:'karta',text:'Skille Łokieć i Z byka: brudne ciosy z bliska.',cards:['lokiec','zbyka']},
  crusher:{kind:'reguła',text:'Pięć czystych ciosów na korpus łamie rywala: do końca walki ma co turę 1 kondycji mniej.'},
  bomb:{kind:'karta',text:'Skill Dobicie: raz na walkę zamroczony rywal idzie na deski. Twój uppercut +2 zamroczenia.',cards:['dobicie']},
  bloodbath:{kind:'reguła',text:'Każdy czysty hook rozcina w 25%; rozcięty rywal (3+) blokuje rzadziej.'},
  // Szybkość — tempo and reading
  counterpuncher:{kind:'reguła',text:'Po udanym uniku lub parowaniu twój najbliższy cios +1 obrażeń i +1 zamroczenia.'},
  'double-jab':{kind:'nacięcie',text:'Trafiony jab w połowie przypadków dokłada od razu drugi jab.'},
  'level-change':{kind:'reguła',text:'Zmiana piętra względem poprzedniego ciosu w kolejce (głowa → korpus albo odwrotnie): o 1 tempo szybciej.'},
  rolling:{kind:'reguła',text:'Od drugiego czystego trafienia z rzędu ciosy +1 obrażeń; blok lub pudło zeruje.'},
  'one-two-three':{kind:'reguła',text:'Dwa trafione jaby w turze: od razu darmowy cross.'},
  'vanishing-target':{kind:'nacięcie',text:'Miarka: trafiony jab sprawia, że następnego uppercuta w tej turze nie da się zablokować.'},
  sting:{kind:'reguła',text:'Dwa trafione jaby w turze: kolejne ciosy rywala w tej turze o 1 tempo wolniejsze.'},
  'mirror-counter':{kind:'reguła',text:'Unik pod jab lub cross oddaje od razu tym samym ciosem.'},
  'duck-launch':{kind:'reguła',text:'Po uniku pod hook twój uppercut w tej i następnej turze o 1 tempo szybszy i +2 obrażeń.'},
  'light-feet':{kind:'reguła',text:'Szersze okno uniku, a ciężkie nogi go nie zwężają.'},
  'read-tells':{kind:'reguła',text:'Czytanie: widzisz, ile ruchów ułożył rywal, za ile kondycji i które są ciężkie.'},
  momentum:{kind:'reguła',text:'Od trzeciego ciosu w kolejce każdy następny o 1 tempo szybszy.'},
  parry:{kind:'reguła',text:'Szermierz: szersze okno parowania.'},
  flurry:{kind:'reguła',text:'Seria: trzecie czyste trafienie z rzędu daje +1 kondycji w następnej turze.'},
  overreach:{kind:'reguła',text:'Czysty unik w ostatniej chwili daje Otwarcie III.'},
  'the-zone':{kind:'reguła',text:'Strefa (klawisz Z): raz na walkę widzisz całą kolejkę rywala przed swoim ruchem.'},
  storm:{kind:'karta',text:'Skill Burza ciosów: jab, hook i jab jeden po drugim.',cards:['burza']},
  ghost:{kind:'reguła',text:'Duch: udany unik daje Otwarcie I.'},
  // Wytrzymałość — lasting and grinding
  economist:{kind:'reguła',text:'Pierwsze czyste trafienie w turze daje +1 kondycji w następnej turze.'},
  'iron-guard':{kind:'nacięcie',text:'Nieudane parowanie zatrzymuje 70% zamiast 50% (ciężki cios: połowę).'},
  'tough-body':{kind:'reguła',text:'Ciosy na korpus dają ci mniej Zadyszki (Młot rywala: 1 zamiast 2) i zadają o 1 mniej.'},
  breather:{kind:'nacięcie',text:'Każdy niewydany punkt kondycji zdejmuje 2 zamroczenia zamiast 1.'},
  'second-wind':{kind:'reguła',text:'Raz na walkę, gdy wydasz całą kondycję w turze: +2 kondycji w następnej.'},
  'elastic-guard':{kind:'nacięcie',text:'Czyste parowanie nic nie kosztuje.'},
  adrenaline:{kind:'reguła',text:'Po Otwarciu III masz +2 kondycji w następnej turze.'},
  'efficient-evade':{kind:'nacięcie',text:'Udany unik pod cios za 2+ kondycji nic nie kosztuje.'},
  'warrior-heart':{kind:'reguła',text:'Przy zdrowiu poniżej 30% zamroczenie rośnie o 25% wolniej.'},
  'thick-skin':{kind:'nacięcie',text:'Ciosy, których nie bronisz, zadają ci o 10% mniej.'},
  cornerman:{kind:'reguła',text:'Nokdaun rywala: +2 kondycji w następnej turze i −2 zamroczenia.'},
  clinch:{kind:'reguła',text:'Przeczekanie: do 2 niewydanych punktów kondycji przechodzi na następną turę.'},
  shell:{kind:'reguła',text:'Skorupa: pierwsza obrona w turze (unik albo parowanie) nic nie kosztuje.'},
  grinder:{kind:'reguła',text:'Koniec tury z 3 kondycji w zapasie więcej niż rywal: rywal ma 1 kondycji mniej w następnej.'},
  rise:{kind:'reguła',text:'Łatwiej wstać z desek; raz na walkę po nokdaunie +25% zdrowia.'},
  fortress:{kind:'reguła',text:'Trzy udane parowania w jednej turze — Wybuch: rywal ogłuszony, ma o 2 kondycji mniej w następnej.'},
  perpetuum:{kind:'reguła',text:'Zadyszka cię nie dotyczy; twoje ciosy na korpus dają ciężkie nogi na dwie tury.'},
  'last-stand':{kind:'reguła',text:'Raz na walkę zdrowie 0 to Szał: przez dwie tury nie padasz, ciosy +40% i kosztują 1 mniej.'},
  // Cechy (PERKI.md §3): new traits; the rest of the Cechy reuse the perks above
  'bone-on-bone':{kind:'reguła',text:'Twój cios, który rywal zablokuje albo sparuje, zabiera mu 1 kondycji z następnej tury.'},
  cutter:{kind:'reguła',text:'Każdy czysty cios w głowę: +5 p.p. na rozcięcie łuku.'},
  forearm:{kind:'reguła',text:'Twój cios w blok w 15% stłucze rywalowi rękę: jej ciosy −1 obrażeń do końca walki.'},
  knockout:{kind:'reguła',text:'Rywal idzie na deski przy zamroczeniu 6 zamiast 7.'},
  shoulder:{kind:'reguła',text:'Trafienie z Otwarciem III wybija rywalowi bark: do końca walki nie zagra ciosu za 3+.'},
  headsman:{kind:'reguła',text:'Raz na walkę czysty cios w głowę rywala z najwyżej 20% zdrowia to nokdaun.'},
  'lucky-slip':{kind:'reguła',text:'10% ciosów rywala chybia samo, bez reakcji i bez kosztu.'},
  'bull-neck':{kind:'reguła',text:'+6 zdrowia.'},
  'spiked-guard':{kind:'reguła',text:'Blok odbija w atakującego 25% obrażeń, które zatrzymał.'},
  // Spacerniak — dirty fighting
  piach:{kind:'karta',text:'Skill Garść piachu: raz na walkę rywal ślepnie na dwie tury.',cards:['piach']},
  szczeka:{kind:'reguła',text:'Zamroczenie −15%; raz na walkę nokdaun kończy się tylko wiotkimi nogami.'},
  zoladek:{kind:'reguła',text:'Głód i zmęczenie obniżają formę o połowę mniej (poza walką).'},
  kciuk:{kind:'karta',text:'Skill Kciuk w oko: podbite oko rywala.',cards:['kciuk']},
  zaskoczenie:{kind:'reguła',text:'Bójkę zaczynasz z Otwarciem I.'},
  kostki:{kind:'reguła',text:'Hook +1 obrażeń, kostka pęka o połowę rzadziej, czysty cross z Otwarciem rozcina.'},
  nerki:{kind:'karta',text:'Skill Nerki: dwa krótkie ciosy na korpus z bliska.',cards:['nerki']},
  pamiec:{kind:'reguła',text:'Z rywalem, z którym już walczyłeś: widzisz, ile ruchów ułożył i za ile kondycji.'},
  bezzasad:{kind:'reguła',text:'Brudne skille jednorazowe możesz zagrać raz na turę zamiast raz na walkę.'},
};

/* ---------- the player's moves and skill set (TALIA.md): learnt with tree points, the set chosen outside the fights ---------- */

/** @typedef {'str'|'spd'|'end'} TreeKey */
/** @typedef {{picks:string,gift?:boolean}} MoveState  a learnt move and the nodes of its punch tree chosen so far ('ab…', one letter per level); gift: known without paying (older saves) */
/** A move: the attribute that teaches it and its price in that attribute's points (0 = known from the start). Each
 * punch is paid with its own attribute (PERKI.md §2): Szybkość the jab, the body jab and the hook; Siła the cross and
 * both uppercuts; Wytrzymałość the body cross, the liver hook and Nerki.
 * @type {Record<string,{tree:TreeKey,price:number}>} */
export const MOVES = {
  jab:{tree:'spd',price:0}, 'jab-k':{tree:'spd',price:0}, hook:{tree:'spd',price:0}, 'raz-dwa':{tree:'spd',price:1}, burza:{tree:'spd',price:2},
  cross:{tree:'str',price:0}, upper:{tree:'str',price:1}, zoladek:{tree:'str',price:2}, dobicie:{tree:'str',price:2},
  watroba:{tree:'end',price:0}, splot:{tree:'end',price:1}, nerki:{tree:'end',price:1},
};
/** Moves that changed attribute in save v10: older saves keep them as gifts so the new attribute is not overspent. */
export const MOVED_TO_NEW_TREE = ['hook','watroba','splot','nerki'];
/** Skills a fight takes along (E33-style set), chosen on the character sheet. */
export const LOADOUT_MAX = 6;
/** The set of a new game. */
export const STARTER_LOADOUT = ['jab','cross','hook','jab-k','watroba'];

/** @typedef {{name:string,text:string}} PunchNode */
/** The punch trees (CIOSY.md §3): five levels of the eight plain punches, two nodes each (A, B), bought in order.
 * @type {Record<string,[PunchNode,PunchNode][]>} */
export const PUNCH_TREES = {
  jab:[
    [{name:'Mocne ustawienie',text:'Ustawienie +2 (cross +3).'},{name:'Długie ustawienie',text:'Ustawienie działa na dwa kolejne ciosy.'}],
    [{name:'Podwójny jab',text:'Trafiony jab w 30% dokłada od razu darmowy drugi.'},{name:'Celownik',text:'Szansa efektu z Ustawienia ×2 zamiast ×1,5, a cios w głowę z Ustawienia +1 zamroczenia.'}],
    [{name:'Miarka',text:'Czysty jab: następny cios w tej turze jest nieblokowalny.'},{name:'Żądło',text:'Dwa trafione jaby w turze: najbliższy ruch rywala przepada.'}],
    [{name:'Przerywnik',text:'Trafiony jab przerywa zamach ciężkiego ciosu rywala (raz na turę).'},{name:'Kontrjab',text:'Udany unik lub parowanie jaba albo crossa oddaje od razu darmowy jab z Ustawieniem.'}],
    [{name:'Raz-dwa-trzy',text:'Trafione jab i cross, potem hook w tej samej turze: hook +3 obr. i pewne Zachwianie.'},{name:'Dyktator',text:'Po trafionym jabie dwa różne trafione ciosy (nie jaby) w tej turze: rywal ma w następnej −2 kondycji i traci inicjatywę.'}],
  ],
  'jab-k':[
    [{name:'Kłucie',text:'Pierwszy w turze kosztuje 0.'},{name:'Twardy brzuch',text:'+1 obr.'}],
    [{name:'Zmiana piętra',text:'Następny cios w głowę o 1 tempo szybciej.'},{name:'Opuszczona garda',text:'Następny cios w głowę: rywal blokuje o połowę rzadziej.'}],
    [{name:'Kotwica',text:'Ciężkie nogi trwają też w następnej turze: pierwszy ruch rywala ląduje o 1 tempo później.'},{name:'Dławik',text:'Trafiony daje Zadyszkę jak inne ciosy na korpus.'}],
    [{name:'Przerywacz',text:'Trafiony, raz na turę, przerywa zamach każdego ciosu za 2+, nie tylko ciężkiego.'},{name:'Ustawienie z dołu',text:'Daje Ustawienie jak jab.'}],
    [{name:'Kotwiczenie',text:'Dwa trafione w turze: rywal traci ostatni ruch kolejki.'},{name:'Mrówka',text:'Czwarte trafienie w walce łamie żebro (raz na walkę).'}],
  ],
  hook:[
    [{name:'Krótki hak',text:'Nie robi kroku z dystansu.'},{name:'Ciężki hak',text:'+1 zamroczenia.'}],
    [{name:'Rzeźnik',text:'Rozcięcie 20% zamiast 6%.'},{name:'Wahadło',text:'Zachwianie 30% zamiast 25%.'}],
    [{name:'Hak z obrotu',text:'Hook zaraz po crossie: Zachwianie pewne.'},{name:'Podwójny hak',text:'Hook w głowę po haku na wątrobę w tej turze: +2 obr., Zachwianie ×2.'}],
    [{name:'Pod gardę',text:'Zablokowany hook przechodzi w 85% (z pełnym zamroczeniem) i ma 15% na Zachwianie.'},{name:'Kontrhak',text:'Po każdym udanym uniku twój hook w tej i następnej turze ma pewne Zachwianie i +2 obr., a w następnej także tempo 1.'}],
    [{name:'Na deski',text:'Zachwianie hooka co najmniej 45%; każde Zachwianie od razu +3 zamroczenia, a kolejne ciosy w głowę w tej turze +2.'},{name:'Na krew',text:'Czysty hook rozcina o 55 p.p. częściej; w rozciętego +4 obr. i Zachwianie 60%.'}],
  ],
  cross:[
    [{name:'Ciężka ręka',text:'+1 obr.'},{name:'Raz-dwa',text:'Cross zaraz po jabie ląduje o 1 tempo szybciej.'}],
    [{name:'Pęknięta garda',text:'Zablokowany cross rozbija gardę jak uppercut (do końca następnej tury).'},{name:'Kosa',text:'Pierwszy cross w turze ma tempo 1.'}],
    [{name:'Egzekutor',text:'+2 obr., gdy rywal ma ≤2 kondycji.'},{name:'Kontra prosta',text:'Cross w turze, w której udanie się obroniłeś: ×1,5 obr.'}],
    [{name:'Ciężka odpowiedź',text:'Czysty cross z Otwarciem albo z Ustawienia dokłada hak na wątrobę.'},{name:'Przez środek',text:'Cross, który wyląduje przed zamachem rywala, przerywa go (raz na turę).'}],
    [{name:'Nokautujący prosty',text:'Cross z Ustawienia: +2 obr. i +2 zamroczenia, w rywala z Rozbitą gardą +4 zamroczenia.'},{name:'Ładowany',text:'Cross z Ustawienia albo z Otwarciem przechodzi przez blok i parowanie w całości.'}],
  ],
  upper:[
    [{name:'Bomba',text:'+1 zamroczenia.'},{name:'Krótki zamach',text:'Tempo 2 zamiast 3.'}],
    [{name:'Rozbijacz',text:'Rozbita garda zatrzymuje najwyżej 25% zamiast 40%, a rywal prawie nie blokuje.'},{name:'Spod gardy',text:'Uppercut zaraz po hooku, który przeszedł, przechodzi przez blok (czyste parowanie go zatrzyma).'}],
    [{name:'Szok',text:'Uppercut z Otwarciem: rywal ma −2 kondycji w następnej turze.'},{name:'Wynurzenie',text:'Po uniku pod hook rywala uppercut w tej i następnej turze −1 tempo i +2 obr.'}],
    [{name:'Nieprzerywalny',text:'Ciosy na korpus nie przerywają zamachu, a uppercut +3 obr. i +1 zamroczenia.'},{name:'Zamach-zwód',text:'Przerwany uppercut zwraca kondycję i daje Otwarcie I; zablokowany albo sparowany też zwraca 3 kondycji w następnej turze.'}],
    [{name:'Złamany nos',text:'Czysty uppercut w rywala z zamroczeniem 2+: +2 zamroczenia i złamany nos.'},{name:'Rozbita twierdza',text:'Przy Rozbitej gardzie każdy twój cios +2 obr. i +2 zamroczenia.'}],
  ],
  zoladek:[
    [{name:'Taran',text:'Tempo 2 zamiast 3.'},{name:'Głębiej',text:'+3 obr.'}],
    [{name:'Zgięty wpół',text:'Zgięty trwa do końca tury, a każdy cios w głowę zgiętego +1 zamroczenia.'},{name:'Wyrwany oddech',text:'Jego Zadyszka sumuje się z innymi ciosami na korpus w tej turze.'}],
    [{name:'Pod brodę',text:'Uppercut w głowę na zgiętego: +3 zamroczenia.'},{name:'Skurcz',text:'Trafiony: Skurcz.'}],
    [{name:'Nieprzerywalny',text:'Ciosy na korpus nie przerywają zamachu.'},{name:'Pod żebra',text:'Po udanej obronie (unik albo parowanie) w poprzedniej turze: koszt 2 i tempo −1.'}],
    [{name:'Złamany',text:'Trafienie w rywala z Zadyszką: pewne żebro.'},{name:'Przewrót',text:'Zgięty rywal, potem hook w głowę przy zamroczeniu 5+: nokdaun.'}],
  ],
  splot:[
    [{name:'Głęboki',text:'+1 obr.'},{name:'Z dystansu',text:'Jako pierwszy ruch tury: +1 obr. i tempo 1.'}],
    [{name:'Splot',text:'Zadyszka 2.'},{name:'Stop',text:'Trafiony splot: najbliższy ruch rywala z bliska przepada zamiast się spóźnić.'}],
    [{name:'Bez tchu',text:'Trafiony splot: następny twój cios w tej turze jest nieblokowalny.'},{name:'Na wejściu',text:'Splot, który wyląduje przed ciosem rywala robiącym krok: ×2 obr.'}],
    [{name:'Żebro',text:'Czysty z Ustawieniem lub Otwarciem: 30% na pęknięte żebro.'},{name:'Mur',text:'Rywal, który zrobi krok po Odepchnięciu, traci Otwarcie i Ustawienie.'}],
    [{name:'Duszenie',text:'Zadyszka trwa dwie tury.'},{name:'Matador',text:'Każdy ruch rywala opóźniony Odepchnięciem daje ci Otwarcie I.'}],
  ],
  watroba:[
    [{name:'Młot',text:'Zadyszka 2.'},{name:'Bez kroku',text:'O 1 tempo szybszy i wchodzi bez kroku: następny cios z bliska też nie traci tempa.'}],
    [{name:'Łowca wątroby',text:'Czysty z Ustawieniem lub Otwarciem: Skurcz od razu.'},{name:'Przez gardę',text:'Zablokowany też liczy się do Skurczu.'}],
    [{name:'Pęknięte żebra',text:'Czysty: 20% na żebro.'},{name:'Wątroba–głowa',text:'Po nim hook w głowę w tej turze: +2 obr.'}],
    [{name:'Długi skurcz',text:'+1 obr.; Skurcz zabiera dwa ruchy i daje ci Otwarcie I.'},{name:'Piekło',text:'+1 obr.; po Skurczu rywal ma −2 kondycji w następnej turze.'}],
    [{name:'Na kolana',text:'+1 obr. i Skurcz co drugie trafienie zamiast co trzecie.'},{name:'Bez powietrza',text:'Rywal z Zadyszką: twoje hooki i uppercuty w głowę +1 zamroczenia, a zapas nie zdejmuje mu zamroczenia.'}],
  ],
};
/** The node keys a fighter takes into a brawl ('jab:1a' = the jab's level I, node A) from the picks of the moves.
 * @param {Record<string,MoveState>} moves @returns {string[]} */
export function nodeKeys(moves){ return Object.entries(moves).flatMap(([id,m])=>PUNCH_TREES[id]?[...m.picks].map((p,i)=>id+':'+(i+1)+p):[]); }

/** Points of each level of a punch tree (I–III one, IV–V two: seven for a whole tree). */
export const NODE_PRICE = [1,1,1,2,2];
/** Nodes that already work in a brawl ('jab:1a' = the jab's level I, node A): all five levels since CIOSY.md §6 step 4. @type {Set<string>} */
export const NODE_READY = new Set(Object.keys(PUNCH_TREES).flatMap(id=>[1,2,3,4,5].flatMap(l=>[id+':'+l+'a',id+':'+l+'b'])));

/** Points the chosen nodes of one punch cost. @param {string} picks */
function nodesSpent(picks){ let n=0; for(let i=0;i<picks.length;i++) n+=NODE_PRICE[i]; return n; }

/** The moves known from the start. @returns {Record<string,MoveState>} */
export function startMoves(){ return Object.fromEntries(Object.entries(MOVES).filter(([,m])=>!m.price).map(([id])=>[id,{picks:''}])); }

/** Repair the learnt moves of a save; the starting moves are always known. The upgrade paths of saves before v10
 * (`path`, `lvl`) could never be bought and are dropped. @param {unknown} value @returns {Record<string,MoveState>} */
export function sanitizeMoves(value){
  const out=startMoves(), v=value&&typeof value==='object'&&!Array.isArray(value)?/** @type {Record<string,any>} */ (value):{};
  for(const [id,m] of Object.entries(v)) if(Object.hasOwn(MOVES,id)&&m&&typeof m==='object'){
    const picks=PUNCH_TREES[id]&&typeof m.picks==='string'&&/^[ab]{0,5}$/.test(m.picks)?m.picks:'';
    out[id]={picks,...(m.gift===true&&MOVES[id].price?{gift:true}:{})};
  }
  return out;
}

/** Skills the player may take into a fight: the learnt moves and the skills the perks give.
 * @param {Record<string,MoveState>} moves @param {string[]} perks @returns {string[]} */
export function skillPool(moves,perks){
  return [...new Set([...Object.keys(moves).filter(id=>MOVES[id]),...perks.flatMap(p=>PERK_CARDS[p]?.cards||[])])];
}

/** A legal set from a wish list (an old deck works too): skills of the pool, each once, at most LOADOUT_MAX; an empty
 * set gets the starting one. @param {unknown} value @param {string[]} pool @returns {string[]} */
export function sanitizeLoadout(value,pool){
  /** @type {string[]} */
  const out=[];
  for(const id of Array.isArray(value)?value:[]) if(typeof id==='string'&&pool.includes(id)&&!out.includes(id)&&out.length<LOADOUT_MAX) out.push(id);
  if(!out.length) for(const id of STARTER_LOADOUT) if(pool.includes(id)) out.push(id);
  return out;
}

/** Points an attribute has spent on its moves and their punch trees. @param {Record<string,MoveState>} moves @param {TreeKey} tree */
export function movesSpent(moves,tree){
  let n=0; for(const [id,m] of Object.entries(moves)){ const M=MOVES[id]; if(M?.tree===tree) n+=(m.gift?0:M.price)+nodesSpent(m.picks); }
  return n;
}

/** Why a move cannot be learnt now ('' when it can). @param {Record<string,MoveState>} moves @param {string} id @param {number} free points left in its tree */
export function learnBlock(moves,id,free){
  const M=MOVES[id]; if(!M) return 'unknown';
  if(moves[id]) return 'known';
  if(M.price>free) return 'points';
  return '';
}

/** Why the next node of a punch tree cannot be bought ('' when it can).
 * @param {Record<string,MoveState>} moves @param {string} id @param {'a'|'b'} pick @param {number} free points left in its attribute
 * @param {Set<string>} [ready] nodes that already work in a brawl */
export function nodeBlock(moves,id,pick,free,ready=NODE_READY){
  const T=PUNCH_TREES[id]; if(!T||(pick!=='a'&&pick!=='b')) return 'unknown';
  const m=moves[id]; if(!m) return 'not-known';
  const lvl=m.picks.length; if(lvl>=T.length) return 'max';
  if(!ready.has(id+':'+(lvl+1)+pick)) return 'soon';
  if(NODE_PRICE[lvl]>free) return 'points';
  return '';
}

/** Buy the next node of a punch tree. @param {Record<string,MoveState>} moves @param {string} id @param {'a'|'b'} pick @param {number} free @param {Set<string>} [ready] @returns {string} '' or the reason */
export function buyNode(moves,id,pick,free,ready=NODE_READY){
  const why=nodeBlock(moves,id,pick,free,ready); if(why) return why;
  moves[id].picks+=pick; return '';
}

/** @typedef {Record<string,number>[]} Habit  per place in the queue: how often the player put each skill there */
/** Repair saved habits: rival keys like `yard:4`, up to four places of skill counts (retired defence cards drop out). @param {unknown} value @returns {Record<string,Habit>} */
export function sanitizeHabits(value){
  /** @type {Record<string,Habit>} */
  const out={};
  const v=value&&typeof value==='object'&&!Array.isArray(value)?/** @type {Record<string,unknown>} */ (value):{};
  for(const [key,beats] of Object.entries(v).slice(0,24)){
    if(!/^[a-z]+:\d{1,2}$/.test(key)||!Array.isArray(beats)) continue;
    out[key]=beats.slice(0,4).map(b=>{
      /** @type {Record<string,number>} */ const o={};
      if(b&&typeof b==='object') for(const [id,n] of Object.entries(b))
        if(Object.hasOwn(CARDS,id)&&typeof n==='number'&&Number.isFinite(n)&&n>0) o[id]=Math.min(99,Math.round(n*10)/10);
      return o;
    });
  }
  return out;
}

/** What a rival keeps of the player's habits after a brawl: the old picture faded, the new one added.
 * @param {Habit|undefined} old @param {Record<string,number>[]} seen @returns {Habit} */
export function mergeHabits(old,seen){
  /** @type {Habit} */ const out=[];
  for(let i=0;i<4;i++){
    /** @type {Record<string,number>} */ const o={};
    for(const [id,n] of Object.entries(old?.[i]||{})) o[id]=n*0.6;
    for(const [id,n] of Object.entries(seen[i]||{})) o[id]=(o[id]||0)+n;
    for(const id of Object.keys(o)) { o[id]=Math.min(99,Math.round(o[id]*10)/10); if(o[id]<0.2) delete o[id]; }
    out.push(o);
  }
  return out;
}

/* ---------- healing lasting injuries in Newgate ---------- */

/** Who heals what: Śmierdziel's ointment (the face only, tobacco, may fail) and the turnkey's way to the surgeon (anything, shillings).
 * @type {Record<string,{price:number,heals:string[],fail:number}>} */
export const HEALERS = {
  masc:{price:2,heals:['scar','eyeL','eyeR','nose'],fail:0.3},
  felczer:{price:3,heals:Object.keys(LASTING),fail:0},
};

/** The list without one injury of this kind (the oldest). @param {LastingInjury[]} list @param {string} id @returns {LastingInjury[]} */
export function healOne(list,id){ const k=list.findIndex(e=>e.id===id); return k<0?list:[...list.slice(0,k),...list.slice(k+1)]; }
