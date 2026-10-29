/* Prison act: owner of save.phase and save.prison at runtime — phase, story cards, the day's schedule in three phases
   of two actions (guard calls, actions gated, the end of a phase) and the cell and yard doors.
   Pure rules live in prison-data.js; this module applies them to the running game. */

import { PERK_CARDS } from './card-data.js';
import { state as progressionState, persist, showToast, grantPerkPoint, xpNeed, addToLoadout, addXP } from './progression.js';
import { startSpar, setRigged, setFightLimit, state as sparringState } from './sparring.js';
import { spendAction, nextPhase, phaseDone, actionsLeft, simPhase, simNudge, PHASES, PHASE_MIN, SLEEP_REST, NAP_REST } from './simulation.js';
import { currentMeal } from './ward-meal.js';
import { setPaused, state as inputState, setInfo } from './input.js';
import { state as menuState } from './menu.js';
import { state as gymState, stationOf } from './gym.js';
import { state as roomsState, goRoom, startActivity } from './rooms.js';
import { state as navigationState, stMenuClose } from './navigation.js';
import { simUI } from './simulation.js';
import { sfxBell, initAudio } from './audio.js';
import { DEBUG } from './config.js';
import { PRISON_ROOMS, isWorkDay, fmtMoney,
  weekday, isShopDay, pickDailyEvent, bicieOpponents, BICIE_SEC, fightNote, BARE_PERKS, barePoints, bareSpent, bareBlock, BARE_RESPEC_FAJKI, LISTA, lessonText, listEntry, lessonOk, MEMORIES, AMBU_DAYS, AMBU_RENTA, REVENGE_DAYS } from './prison-data.js';
import { startCrank } from './crank.js';
import { onSessionEnd } from './training-session.js';

// Runtime values owned by prison; initialized explicitly by main.js.
export const state = {};

/** Whether the game is in the prison act (new games start there). */
export function isPrison(){ return progressionState.save?.phase==='prison'; }

/** Prison block of the save. */
export function prisonSave(){ return progressionState.save.prison; }

/** Is a room open in the current phase? @param {string} room */
export function roomOpen(room){ return !isPrison()||PRISON_ROOMS.includes(room); }

/** The surviving act is Newgate; old free-world saves resume here. @param {string} phase */
export function setPhase(phase){
  if(phase!=='prison') return false;
  progressionState.save.phase='prison'; prisonSave().zegar=phaseKey();
  persist(); syncPhaseClass(); simUI(); return true;
}

/** Apply Newgate to legacy saves without bypassing the save store's write protection. */
export function syncPhaseClass(){
  if(progressionState.save.phase!=='prison'){
    progressionState.save.phase='prison'; prisonSave().zegar=phaseKey();
  }
  document.body.classList.add('prison');
}

/** Respect rank of the player (0–4). */
/** Pay in tobacco twists; false when there is not enough. @param {number} n */
export function spendTobacco(n){ const P=prisonSave(); if(P.fajki<n) return false; P.fajki-=n; return true; }

/** Pay shillings from the account; false when there is not enough. @param {number} x */
export function spendMoney(x){ const P=prisonSave(); if(P.wypiska<x) return false; P.wypiska=Math.round((P.wypiska-x)*100)/100; return true; }

/* ---------- story cards: full-screen text cards that pause the game ---------- */

/**
 * @typedef {{kicker?:string,title:string,body:string,stamp?:string,button?:string,choices?:{label:string,sub?:string,fn:()=>void}[],done?:()=>void}} Card
 */

/** Show one or more cards in sequence; `done` runs after the last one closes. @param {Card[]} cards @param {()=>void} [done] */
export function showCards(cards,done){
  state.queue.push(...cards.map(c=>({...c})));
  if(done) state.queue[state.queue.length-1].done=done;
  if(state.cardEl.hidden) nextCard();
}

/** Drop queued cards (new game or load). */
export function resetPrisonUI(){ state.queue.length=0; state.current=null; if(state.cardEl){ state.cardEl.hidden=true; document.body.classList.remove('cardopen'); } }

/** Is a story card on screen? */
export function cardOpen(){ return !!state.cardEl&&!state.cardEl.hidden; }

function nextCard(){
  const c=state.queue.shift();
  if(!c){ state.cardEl.hidden=true; document.body.classList.remove('cardopen'); if(inputState.paused&&menuState.sysEl.hidden) setPaused(false); return; }
  state.current=c;
  state.kickerEl.textContent=c.kicker||'';
  state.titleEl.textContent=c.title;
  state.bodyEl.innerHTML=c.body;
  state.stampEl.textContent=c.stamp||''; state.stampEl.hidden=!c.stamp;
  const ch=c.choices||[{label:c.button||'Dalej',fn:()=>{}}];
  state.choicesEl.classList.toggle('one',ch.length===1);
  state.choicesEl.innerHTML=ch.map((o,i)=>'<button class="sysbtn" type="button" data-i="'+i+'"><b>'+o.label+'</b> <kbd>'+(ch.length>1?(i+1):'')+(i===0?(ch.length>1?' · ':'')+'Enter':'')+'</kbd>'+(o.sub?'<small>'+o.sub+'</small>':'')+'</button>').join('');
  if(state.cardEl.hidden){ stMenuClose(); setPaused(true); state.cardEl.hidden=false; document.body.classList.add('cardopen'); }
  /** @type {HTMLElement|null} */ (state.choicesEl.querySelector('button'))?.focus();
}

/** @param {number} i */
function pickCard(i){
  const c=state.current; if(!c) return;
  const ch=c.choices||[{label:'',fn:()=>{}}], o=ch[i]; if(!o) return;
  state.current=null;
  nextCard();
  o.fn();
  if(c.done) c.done();
}

/** Keyboard on a story card. @param {KeyboardEvent} e @returns {boolean} consumed */
export function prisonKey(e){
  if(!cardOpen()) return false;
  const n=state.current?.choices?.length||1;
  if(['Enter','Space','KeyE'].includes(e.code)){ e.preventDefault(); if(!e.repeat) pickCard(0); }
  else if(e.code==='Escape'&&n===1){ e.preventDefault(); if(!e.repeat) pickCard(0); }
  else if(/^Digit[1-9]$/.test(e.code)){ e.preventDefault(); const i=+e.code[5]-1; if(i<n&&!e.repeat) pickCard(i); }
  e.stopImmediatePropagation(); return true;
}

/* ---------- day one ---------- */

/** A new game: the intake card in the cell. */
export function startIntake(){
  const P=prisonSave(); if(P.przyjecie) return;
  P.przyjecie=1; P.zegar=phaseKey(); persist();
  showCards([{kicker:'NEWGATE 1868 · DZIEŃ 1 · PONIEDZIAŁEK',title:'Przyjęcie',stamp:'PRZYJĘTO',
    body:'<p>Old Bailey zostaje za plecami; wąskie przejście prowadzi prosto tutaj. Spis rzeczy, kubeł zimnej wody, sukienny kaftan z numerem. Kamienny korytarz prowadzi do ciężkich drzwi Wardu. Za murem bije dzwon St Sepulchre — ktoś mówi, że na jutrzejszego wisielca.</p><p>Ward na kilku. Gaduła na skraju pryczy, ponury typ pod oknem i stary człowiek w drewnianym fotelu na kółkach, który nawet nie podnosi wzroku.</p><p class="hint">E rozmowa · W/A/S/D ruch · Esc pauza · P karta. Plan dnia widać w rogu ekranu.</p>',button:'Wejdź'}]);
}

/* ---------- the day: three phases of two actions (simulation.js owns the needs) ---------- */

/** Station of the cell door (where the guard collects the player). */
function doorStation(){
  const it=gymState.gymItems.find(x=>x.t===({yard:'ydoor',canteen:'ndoor',laznia:'ldoor'}[gymState.hubRoom]||'cdoor'));
  return it?stationOf(it):null;
}

/** Why an action cannot start now ('' when it can): the phase has no actions left. */
export function prisonGate(){
  if(!isPrison()||progressionState.devMode) return '';
  return actionsLeft()>0?'':'brak akcji — '+PHASES[simPhase()]+' się kończy';
}

/** Stations whose activity costs an action (training, a fight). */
const ACTION_STATIONS=['cpull','croach','cshadow','cpush','cellfight','yardfight','bathfight'];

/**
 * Disable station options that need an action when the phase has none left.
 * @param {any} st @param {any[]} opts
 */
export function gateOptions(st,opts){
  if(!ACTION_STATIONS.includes(st.id)) return opts;
  const why=prisonGate(); if(!why) return opts;
  return opts.map(o=>{
    if(!o||typeof o[1]!=='function'||(typeof o[0]==='function'&&o[3]!=='go')) return o;   // stage and mode toggles stay usable
    const L=o[0], label=typeof L==='function'?()=>L()+' — '+why:L+' — '+why;
    return [label,o[1],true,o[3]];
  });
}

/** A guard announcement: toast, bell. @param {string} text */
function guard(text){ initAudio(); sfxBell(1); showToast(text); }

/** Move the player to the cell (from the yard or the bath) before the next phase. */
function toCell(){ if(gymState.hubRoom!=='cell') goRoom('cell',0); }

/** Has today's work been done (or refused)? */
function workSettled(){ const P=prisonSave(), day=progressionState.save.sim.day; return P.flagi['praca-'+(day%7)]===true; }
/** Mark today's work as done or refused. */
function settleWork(){ const P=prisonSave(), day=progressionState.save.sim.day; for(let k=0;k<7;k++) delete P.flagi['praca-'+k]; P.flagi['praca-'+(day%7)]=true; }
/** Is there a shift to go to this morning? */
export function workDue(){ const s=progressionState.save.sim; return isWorkDay(s.day)&&s.faza===0&&!workSettled(); }

/** A phase begins: the roll call and the morning news, the yard, supper and the bath. */
function phaseStart(){
  const s=progressionState.save.sim;
  if(s.faza===0){
    daySnapshot();
    debtCheck();
    guard('Pobudka i apel! Śniadanie przez klapę.'+(isWorkDay(s.day)?' Zbiórka do korby — przed końcem poranka.':''));
    return dailyEvent('apel');
  }
  if(s.faza===1){
    guard(weekday(s.day)===6?'Długi spacerniak — pod murem niedzielne bicie.':'Spacerniak otwarty do wieczora.');
    return dailyEvent('yard');
  }
  guard('Kolacja przez klapę. Łaźnia otwarta.');
  return dailyEvent('meal');
}

/** The phase is over: a skipped shift is a report, everybody back to the cell; after the evening the day closes. */
function phaseEnd(){
  const s=progressionState.save.sim, P=prisonSave();
  if(s.faza===0&&workDue()) settleWork();
  if(s.faza===1){ delete P.flagi['zakaz-spaceru']; if(gymState.hubRoom==='yard') guard('Koniec spaceru! Wszyscy do cel.'); }
  if(s.faza===2&&gymState.hubRoom==='laznia') guard('Koniec łaźni! Ubierać się i do cel.');
  toCell();
  if(s.faza===2) dayReport();
  nextPhase(); persist(); setInfo();
}

/** End the phase now, with the actions left unused (the door, the bunk at night). */
export function endPhaseNow(){ if(!isPrison()) return; phaseEnd(); }

/* Smithfield paid-shift UI removed: normal prison labour is the crank. */

/** Is this fight the current name on Profesor's list (and is the player allowed to take it now)? @param {string} venue @param {number} idx */
export function listMatch(venue,idx){
  const P=prisonSave(), e=listEntry(P.lista.rozdzial), s=progressionState.save.sim;
  if(!e||e.opp!==venue+':'+idx) return {entry:null,why:''};
  if(e.when==='evening'&&s.faza!==2) return {entry:null,why:'Profesor: „Reubena bierzemy wieczorem”.'};
  if(e.when==='sunday'&&!sundayFight()) return {entry:null,why:'Profesor: „Ned bije się tylko w niedzielę, przy wszystkich”.'};
  return {entry:e,why:''};
}

/** Sunday's long yard: the brawl the guards do not see. */
function sundayFight(){ const s=progressionState.save.sim; return weekday(s.day)===6&&s.faza===1&&gymState.hubRoom==='yard'; }

const PLATE_VENUE = {cell:['BÓJKA W CELI','w celi'],yard:['BÓJKA NA SPACERNIAKU','na spacerniaku'],canteen:['BÓJKA PRZY POSIŁKU','przy posiłku'],laznia:['BÓJKA W ŁAŹNI','w łaźni']};
/** Opening plate of a bare-knuckle fight: where, who, and how often the guard looks. @param {string} venue @param {string} name */
export function showFightPlate(venue,name){
  const el=document.getElementById('fightPlate'), V=PLATE_VENUE[venue]; if(!el||!V) return;
  const risk=state.friendly?'sparing za tytoń':'';
  /** @type {HTMLElement} */ (el.querySelector('#fpKicker')).textContent=V[0]+' · GOŁE PIĘŚCI · DO KO';
  /** @type {HTMLElement} */ (el.querySelector('#fpName')).textContent=name;
  /** @type {HTMLElement} */ (el.querySelector('#fpRisk')).textContent=risk;
  el.hidden=true; void el.offsetWidth; el.hidden=false;
  clearTimeout(state.plateT); state.plateT=setTimeout(()=>{ el.hidden=true; },1700);
}

/** Hide the opening plate when simulation enters live combat or a result. */
export function hideFightPlate(){clearTimeout(state.plateT);const el=document.getElementById('fightPlate');if(el)el.hidden=true;}

/** Before a prison fight starts: arm the rigged one (#6, once). @param {string} venue @param {number} idx */
export function prisonFightStart(venue,idx){
  if(!isPrison()) return;
  const m=listMatch(venue,idx);
  setRigged(!!m.entry?.rigged&&!prisonSave().ambulatorium.zdarzenie);
}

/** Option label tag for an opponent on the list. @param {string} venue @param {number} idx */
export function listTag(venue,idx){
  if(!isPrison()) return '';
  const e=listEntry(prisonSave().lista.rozdzial); return e&&e.opp===venue+':'+idx?' · lista Profesora #'+e.n:'';
}

/** Start a list fight that has no figure to walk up to (at the meal, the yard boss, Reuben at night). @param {any} st station to come back to */
export function startListFight(st){
  const e=listEntry(prisonSave().lista.rozdzial); if(!e) return;
  if(prisonGate()){ showToast('Na walkę trzeba akcji — '+prisonGate()); return; }
  const [venue,idx]=e.opp.split(':'); prisonFightStart(venue,+idx); startSpar(+idx,venue,st||doorStation());
}

/** The canteen option for a list fight at the meal. @returns {any[]|null} */
export function listCanteenOption(){
  const e=listEntry(prisonSave().lista.rozdzial); if(!e||!e.opp.startsWith('canteen:')) return null;
  const m=listMatch('canteen',+e.opp.split(':')[1]);
  return [e.name+' czeka przy klapie, kiedy wydają posiłek — walka z listy (#'+e.n+') · 1 akcja'+(m.entry?'':' — za wcześnie')+(prisonGate()?' — '+prisonGate():''),()=>startListFight(gymState.hubNear),!m.entry||!!prisonGate()];
}

/** Reward of a lesson. @param {import('./prison-data.js').ListEntry} e */
function lessonReward(e){
  const R=e.reward;
  if(R.punkt){ const st=progressionState.save.stats, k=/** @type {'str'|'spd'|'end'} */ (['str','spd','end'].reduce((a,b)=>st[b].lvl<st[a].lvl?b:a)); grantPerkPoint(k); }
  if(R.cien) showToast('Cień z Profesorem: odblokowany stopień '+['I','II','III'][R.cien-1],true);
  if(R.spacerniak) prisonSave().flagi['spacerniak-punkt']=true;
}

/**
 * A finished bareknuckle fight in prison: respect, Profesor's list and note, and a guard may have seen it.
 * @param {{win:boolean,draw:boolean,ko:boolean,rival?:string,stars:number,sec:number,venue:string,opp?:number,rigged?:boolean,stats?:any}} f  rival: his name in lower case (the ladder) @returns {string} rows for the result screen
 */
export function prisonFightEnd(f){
  if(!isPrison()) return '';
  const P=prisonSave(), s=progressionState.save.sim, venue=/** @type {'cell'|'yard'|'canteen'|'laznia'} */ (f.venue==='yard'?'yard':f.venue==='canteen'?'canteen':f.venue==='laznia'?'laznia':'cell');
  const sunday=sundayFight(), idx=f.opp??-1, m=listMatch(venue,idx), e=m.entry;
  if(state.bicie) simNudge('zm',1); else spendAction('walka');   // a fight takes an action (the Sunday brawl took its one at the start)
  if(state.dayStart) state.dayStart.fights++;
  if(state.friendly){ state.friendly=false; persist();
    return '<span>Sparing za tytoń</span><span>trening z Reubenem</span>'; }
  const betRow=settleBet(f), bicieRow=state.bicie?.inFight?bicieResult(f):'';
  if(f.win&&f.rival&&!f.rigged) P.pokonani[f.rival]=Math.min(1e4,(P.pokonani[f.rival]||0)+1);   // the ladder on the character sheet
  if(state.tacaFight){ state.tacaFight=false; const M=currentMeal(); if(M&&!f.win){ M.tray=false; M.eaten=true; showToast('Miska przepadła.'); } }
  if(f.rigged){                                                  // #6: the knuckle-duster; not a real loss
    setRigged(false); P.ambulatorium.zdarzenie=true; P.flagi['do-ambulatorium']=true; persist();
    return '<span>Lista Profesora</span><span>#6 '+(e?e.name:'')+' — to nie była uczciwa walka</span>';
  }
  if(f.stats){ const note=fightNote(f.stats); P.profesor.uwaga=note; }   // Profesor's note waits for the next talk
  // Profesor's list: the next name, and lessons that can be made up in a rematch
  const st=f.stats||{}, lf={cards:!!st.cards,win:f.win,ko:f.ko,blocks:st.blocks||0,landed:st.landed||0,body:st.body||0,cuts:st.cuts||0,counters:st.counters||0,kdTaken:st.kdTaken||0,evades:st.evades||0,sunday};
  let list='';
  if(e&&f.win){ P.lista.wygrane[String(e.n)]=true; P.lista.rozdzial=Math.min(11,P.lista.rozdzial+1); list='#'+e.n+' '+e.name+' — zaliczone'; if(e.reward.final) P.flagi.final=true; }
  else if(e) list='#'+e.n+' '+e.name+' — przegrana. Profesor omówi to w celi';
  else if(m.why) list=m.why;
  for(const L of LISTA) if(L.opp===venue+':'+idx&&P.lista.wygrane[String(L.n)]&&!P.lista.lekcje[String(L.n)]&&L.lesson.key!=='none'){
    if(lessonOk(L.lesson.key,lf)){ P.lista.lekcje[String(L.n)]=true; lessonReward(L); list+=(list?' · ':'')+'lekcja zaliczona: '+lessonText(L,lf.cards); }
    else if(e&&e.n===L.n) list+=' · lekcja do poprawienia: '+lessonText(L,lf.cards); }
  persist();
  return bicieRow+betRow+(list?'<span>Lista Profesora</span><span>'+list+'</span>':'');
}

/* ---------- daily events, the Sunday brawl, bets and favours ---------- */

/** One event a day, at the morning apel, a meal or the yard opening. @param {'apel'|'meal'|'yard'} at @returns {boolean} a card was shown */
function dailyEvent(at){
  const P=prisonSave(), day=progressionState.save.sim.day;
  if(P.zdarzenia.ostatnie===day) return false;
  const id=pickDailyEvent(day,at,{fajki:P.fajki,rank:0,inCanteen:gymState.hubRoom==='cell'}); if(!id) return false;   /* the meal is in the Ward now */
  const card=EVENT_CARDS[id]?.(); if(!card) return false;
  P.zdarzenia.ostatnie=day; persist(); showCards([card]); return true;
}

/** @type {Record<string,()=>any>} */
const EVENT_CARDS={
  list:()=>({kicker:'ZDARZENIE · APEL',title:'List z domu',body:'<p>Kapelan rzuca kopertę na pryczę. Rozcięta, przeczytana przez naczelnika, ale twoja. Kilka zdań, które trzymają cię przy pionie cały dzień.</p>',
    button:'Schowaj list',done:()=>{ simNudge('zm',-2); simUI(); showToast('List z domu: −2 zmęczenia'); }}),
  uwaga:()=>({kicker:'ZDARZENIE · APEL',title:'Uwaga Profesora',body:'<p>Profesor łapie cię za nadgarstek, zanim wstaniesz z pryczy. „Łokieć ci ucieka przy prostym. Pokażę ci to raz”.</p><p class="hint">Najbliższa sesja cienia: +50% XP.</p>',
    button:'Dzięki',done:()=>{ prisonSave().flagi['uwaga-cien']=true; persist(); }}),
  taca:()=>{ const M=currentMeal(); if(!M) return null;
    return {kicker:'ZDARZENIE · POSIŁEK',title:'Miska',body:'<p>Bill „Gruby” Bellamy z drugiego końca pryczy kładzie łapę na twojej misce. „Ty już jadłeś, młody”.</p>',
      choices:[{label:'Oddaj miskę',sub:'bez posiłku',fn:()=>{ M.tray=false; M.eaten=true; }},
               {label:'Walcz',sub:'bójka przy posiłku',fn:()=>{ M.tray=true; state.tacaFight=true; prisonFightStart('canteen',2); startSpar(2,'canteen',doorStation()); }}]}; },
  przysluga:()=>({kicker:'ZDARZENIE · POSIŁEK',title:'Przysługa',body:'<p>Przez kratę w drzwiach szepcze Tully, chudy chłopak z sąsiedniego wardu. „Pożycz pięć prymek. Oddam, przy najbliższym handlu, z górką, słowo”.</p>',
    choices:[{label:'Pożycz 5 prymek',sub:'może odda 8, a może nic',fn:()=>{ const P=prisonSave(); P.fajki-=5; P.flagi.dlug=true; persist(); }},
             {label:'Odmów',sub:'nic się nie dzieje',fn:()=>{}}]}),
  wyzwanie:()=>{ const idx=sparringState.YARD_OPP.findIndex(/** @param {any} O @param {number} i */ (O,i)=>i<7); if(idx<0) return null;
    const O=sparringState.YARD_OPP[idx];
    return {kicker:'ZDARZENIE · SPACERNIAK',title:'Wyzwanie',body:'<p>'+O.title+' stoi przy kracie i patrzy prosto na ciebie. „Na spacerniak. Zobaczymy, ile jesteś wart”.</p>',
      choices:[{label:'Przyjmij',sub:'walka od razu',fn:()=>{ goRoom('yard',5); prisonFightStart('yard',idx); startSpar(idx,'yard',doorStation()); }},
               {label:'Odmów',sub:'bez walki',fn:()=>{}}]}; },
};

/** A loan comes back (or not) on a day the turnkey trades at the flap. */
function debtCheck(){
  const P=prisonSave(); if(!P.flagi.dlug||!isShopDay(progressionState.save.sim.day)) return;
  delete P.flagi.dlug;
  if(Math.random()<0.7){ P.fajki+=8; showToast('Tully oddaje dług: +8 prymek'); } else showToast('Tully’ego przenieśli do Pentonville. Tytoń przepadł.');
  persist();
}

/** Bets: the stake is paid now, a win pays double. @param {number} n */
export function placeBet(n){ const P=prisonSave(); if(P.fajki<n) return false; P.fajki-=n; state.bet=n; persist(); return true; }
/** @param {{win:boolean,draw:boolean}} f */
function settleBet(f){
  const n=state.bet||0; if(!n) return ''; state.bet=0;
  const P=prisonSave(), back=f.win?2*n:f.draw?n:0; P.fajki+=back;
  return '<span>Zakład</span><span>'+(f.win?'+'+n+' prymek (wypłata '+back+')':f.draw?'zwrot stawki':'−'+n+' prymek')+'</span>';
}

/**
 * Extra fight options in prison: a bet on a yard fight (from Szanowany), Reuben's favour sparring.
 * @param {boolean} yard @param {number} idx @param {()=>void} go starts the fight @param {()=>any} station
 */
export function prisonFightExtras(yard,idx,go,station){
  if(!isPrison()) return [];
  const P=prisonSave(), out=[];
  if(yard) for(const n of [5,10]) if(P.fajki>=n) out.push(['… z zakładem: '+n+' prymek (wygrana: '+2*n+')',()=>{ if(placeBet(n)) go(); }]);
  if(!yard&&idx===2&&progressionState.save.sim.faza!==2) out.push(['Sparing z Reubenem za 3 prymki'+(P.fajki<3?' — za mało tytoniu':''),()=>friendlySpar(station()),P.fajki<3]);
  return out;
}

/** Favour: Reuben spars for three tobacco twists, the turnkey looks away. */
export function friendlySpar(st){
  const P=prisonSave(); if(P.fajki<3) return; P.fajki-=3; state.friendly=true; persist();
  startSpar(2,'cell',st);
}

/** The Sunday brawl at 10:00 on the long yard: three fights, to KO or 90 s, guards looking away. */
function bicieTick(){
  const P=prisonSave(), s=progressionState.save.sim, B=state.bicie;
  if(B){
    if(B.inFight) return false;
    if(B.next==='fight'){ B.next=''; bicieFight(); return true; }
    return false; }
  if(!sundayFight()||P.bicie.ostatnie===s.day||!actionsLeft()) return false;
  P.bicie.ostatnie=s.day; persist();
  const st=progressionState.save.stats, avg=(st.str.lvl+st.spd.lvl+st.end.lvl)/3;
  const opps=bicieOpponents(avg,P.lista.rozdzial,sparringState.YARD_OPP.slice(0,7).map(/** @param {any} O */ O=>O.rank));
  const names=opps.map(i=>sparringState.YARD_OPP[i].title).join(' → ');
  /** @type {any[]} */ const ch=[{label:'Wchodzę',sub:'bez zakładu',fn:()=>startBicie(opps,0)}];
  for(const n of [5,10]) if(P.fajki>=n) ch.push({label:'Wchodzę · zakład '+n+' prymek',sub:'wygrana całego bicia: '+(2*n+5)+' prymek',fn:()=>startBicie(opps,n)});
  ch.push({label:'Patrzę z boku',sub:'bez walki',fn:()=>{}});
  showCards([{kicker:'NIEDZIELA · POŁUDNIE',title:'Niedzielne bicie',body:'<p>Kaptury idą w górę, pod murem robi się krąg. Trzy walki, do nokautu albo 90 sekund: <b>'+names+'</b>.</p><p class="hint">Wygrana'+(P.bicie.wygrane?'':' · pierwszy punkt Spacerniaka')+'.</p>',choices:ch}]);
  return true;
}

/** @param {number[]} opps @param {number} bet */
function startBicie(opps,bet){
  if(bet) prisonSave().fajki-=bet;
  spendAction('walka');   // the whole brawl is one action; each fight after the first tires on its own
  state.bicie={opps,round:0,bet,next:'',inFight:false}; persist(); bicieFight();
}
function bicieFight(){
  const B=state.bicie, idx=B.opps[B.round];
  B.inFight=true; setFightLimit(BICIE_SEC*60); prisonFightStart('yard',idx); startSpar(idx,'yard',doorStation());
}
/** A brawl fight ended. @param {{win:boolean,draw:boolean}} f */
function bicieResult(f){
  const B=state.bicie, P=prisonSave(); B.inFight=false; setFightLimit(0);
  const n=B.round+1;
  if(!f.win){ state.bicie=null; persist(); return '<span>Niedzielne bicie</span><span>runda '+n+'/3 — odpadasz'+(B.bet?' · zakład przepada':'')+'</span>'; }
  if(n<3){ B.round++; B.next='fight'; return '<span>Niedzielne bicie</span><span>runda '+n+'/3 wygrana · następny: '+sparringState.YARD_OPP[B.opps[B.round]].title+'</span>'; }
  state.bicie=null; P.bicie.wygrane++; const pay=B.bet?2*B.bet+5:0; P.fajki+=pay;
  persist();
  return '<span>Niedzielne bicie</span><span><b>wygrane!</b>'+(pay?' · +'+pay+' prymek':'')+(P.bicie.wygrane===1?' · punkt Spacerniaka':'')+'</span>';
}

/* ---------- the day's mark on the wall ---------- */

function daySnapshot(){
  const P=prisonSave(), st=progressionState.save.stats;
  state.dayStart={day:progressionState.save.sim.day,fajki:P.fajki,konto:P.wypiska+P.depozyt,xp:xpSum(st),lv:st.str.lvl+st.spd.lvl+st.end.lvl,fights:0};
}
/** @param {any} st */
function xpSum(st){ let x=0; for(const k of ['str','spd','end']){ for(let l=1;l<st[k].lvl;l++) x+=xpNeed(l); x+=st[k].xp; } return x; }

/** Evening apel: a short summary of the day — another mark on the wall. */
function dayReport(){
  const D=state.dayStart, s=progressionState.save.sim; if(!D||D.day!==s.day) return;
  const P=prisonSave(), st=progressionState.save.stats, sg=(/** @type {number} */ n)=>(n>0?'+':'')+Math.round(n);
  const rows=[['Doświadczenie',sg(xpSum(st)-D.xp)+' XP'+((st.str.lvl+st.spd.lvl+st.end.lvl)>D.lv?' · awans!':'')],
    ['Walki',String(D.fights)],['Konto',(P.wypiska+P.depozyt-D.konto>=1/24?'+':'')+fmtMoney(P.wypiska+P.depozyt-D.konto)],['Tytoń',sg(P.fajki-D.fajki)+' · '+P.fajki]];
  state.dayStart=null;
  showCards([{kicker:'APEL WIECZORNY',title:'Kreska na ścianie · dzień '+s.day,body:'<div class="card-stats">'+rows.map(r=>'<span>'+r[0]+'</span><span>'+r[1]+'</span>').join('')+'</div>',button:'Dalej'}]);
}

/* ---------- the infirmary: after the rigged fight ---------- */

/** The rigged fight's aftermath: black screen, stitches, Profesor's visit, a night talk, then days skipped. */
function toAmbulatorium(){
  const M=MEMORIES['6'];
  showCards([
    {kicker:'IZBA CHORYCH',title:'Ciemność',body:'<p>Szum w uszach. Ktoś krzyczy, ktoś inny się śmieje. Zapach karbolu, łoju i mokrego kamienia.</p>'},
    {kicker:'IZBA CHORYCH · DZIEŃ 1',title:'Chirurg',body:'<p>„Sześć szwów na łuku. Szczęście, że oko całe” — więzienny chirurg nawleka igłę przy świecy, nie podnosząc wzroku. „Upadłeś na schodach, prawda? Wszyscy tu upadają na schodach”.</p>'},
    {kicker:'IZBA CHORYCH · DZIEŃ 3',title:'Harry przywozi Profesora',body:'<p>Skrzypienie drewnianych kół na korytarzu. Harry stawia fotel Profesora przy łóżku i wychodzi zakurzyć. Profesor długo patrzy na twój opatrunek.</p>'},
    {kicker:'IZBA CHORYCH · NOC',title:M.title,body:'<p>'+M.body+'</p><p>„Lista to nie trening, chłopcze. To rachunek. A na końcu rachunku stoi Szef spacerniaka”.</p>'},
    {kicker:'WYPIS',title:'Głód rewanżu',body:'<p>Minęło '+AMBU_DAYS+' dni. Wracasz do Wardu: najedzony, wyspany i wściekły.</p><p class="hint">Przez 3 dni +25% XP ze wszystkich treningów. Silas czeka na rewanż — tym razem uczciwy.</p>',
      choices:[{label:'Do Wardu',fn:()=>leaveAmbulatorium()}]}]);
}

function leaveAmbulatorium(){
  const P=prisonSave(), s=progressionState.save.sim;
  s.day+=AMBU_DAYS; s.faza=1; s.akcje=0; s.min=PHASE_MIN[1]; s.zm=0; s.glod=0; s.h=30;
  P.depozyt=Math.round((P.depozyt+AMBU_RENTA*AMBU_DAYS)*100)/100;
  P.ambulatorium.do=0; P.ambulatorium.glodDo=s.day+REVENGE_DAYS;
  if(!P.lista.wspomnienia.includes('6')) P.lista.wspomnienia.push('6');
  P.zegar=phaseKey(); persist(); goRoom('cell',0); simUI();
}

/* ---------- Spacerniak: the bareknuckle tree ---------- */

/** Fights with a rival so far (Pamięć spacerniaka; kept after prison too). @param {string} key 'venue:index' */
export function fightsWith(key){ const k=key.replace(/[^a-z0-9:_-]/g,''); return progressionState.save.prison?.pamiec?.[k]||0; }
/** Count a finished fight with a rival. @param {string} key */
export function countFight(key){ const P=progressionState.save.prison; if(!P) return; const k=key.replace(/[^a-z0-9:_-]/g,''); P.pamiec[k]=Math.min(1e4,(P.pamiec[k]||0)+1); }

/** Points, spending and gates of the tree. */
export function bareInfo(){
  const save=progressionState.save, P=save.prison;
  const maxRank=Math.max([4,3,2,1].find(k=>P.flagi['ranga-'+k])||0,[3,5,8,10].filter(n=>P.lista.rozdzial>n).length);
  const points=barePoints({maxRank,bicie:P.bicie.wygrane>0,glaz:!!P.flagi['spacerniak-punkt']});
  return {points,spent:bareSpent(save.bare.unlocked),unlocked:save.bare.unlocked,rank:maxRank,prison:isPrison(),fajki:P.fajki};
}

/** Buy a perk of the tree. @param {string} id @returns {string} why not ('' = bought) */
export function buyBare(id){
  const I=bareInfo(), why=bareBlock(id,I); if(why) return why;
  progressionState.save.bare.unlocked.push(id); addToLoadout(PERK_CARDS[id]?.cards||[]); persist(); return '';   // a yard trick goes into the skill set
}

/** Change the build: Profesor, in prison, 20 tobacco twists. @returns {string} why not */
export function respecBare(){
  const save=progressionState.save, P=save.prison;
  if(!isPrison()) return 'frozen'; if(!save.bare.unlocked.length) return 'empty'; if(P.fajki<BARE_RESPEC_FAJKI) return 'fajki';
  P.fajki-=BARE_RESPEC_FAJKI; save.bare.unlocked=[]; save.bare.respecs++; persist(); return '';
}

/** Change the guards' opinion (0–100). @param {number} n @param {string} why */
export function addOpinia(n,why){
  const P=prisonSave(); P.opinia=Math.max(0,Math.min(100,P.opinia+n));
  showToast('Opinia '+(n>0?'+':'')+n+' · '+why);
}

/** The phase key the schedule has handled (day·3 + phase): its start news show once. */
function phaseKey(){ const s=progressionState.save.sim; return s.day*3+s.faza; }

/** Developer mode: the schedule starts from now, the phases jumped over do not happen. */
export function prisonClockSync(){ if(isPrison()) prisonSave().zegar=phaseKey(); }

/** The schedule in the hub: transfers, the Sunday brawl, the start of a phase, and the next phase once both actions are used. */
export function prisonTick(){
  if(progressionState.devMode){ prisonClockSync(); return; }   /* developer mode: no roll calls, no guards sending him back */
  if(!isPrison()||cardOpen()||roomsState.hubAct||gymState.hubTrans.kind||!navigationState.stMenuEl.hidden) return;
  const P=prisonSave();
  if(P.flagi['do-ambulatorium']){ delete P.flagi['do-ambulatorium']; persist(); toAmbulatorium(); return; }
  if(P.zegar!==phaseKey()){ P.zegar=phaseKey(); persist(); if(phaseStart()){ simUI(); setInfo(); return; } }
  if(bicieTick()) return;
  if(phaseDone()){ phaseEnd(); return; }
  simUI();
}

/* ---------- doors and the bunk ---------- */

/** Label of the next phase, for “end the phase” options. */
function nextName(){ const f=simPhase(); return f===2?'sen, nowy dzień':PHASES[f+1]; }

/** The cell door in prison: work in the morning, the yard at noon, the bath in the evening, ending the phase. @param {(room:string,min?:number)=>void} go */
export function cellDoorOptions(go){
  const f=simPhase();
  /** @type {any[]} */ const out=[];
  if(workDue()){ const why=prisonGate();
    out.push(['Żelazna korba · 30 sekund · bez zapłaty · 1 akcja'+(why?' — '+why:''),()=>crankShift(),!!why,'act']);
    out.push(['Pomiń pracę',()=>{ settleWork(); persist(); }]); }
  if(f===1) out.push(['Wyjdź na spacerniak',()=>go('yard',0)]);
  if(f===2) out.push(['Idź do łaźni',()=>go('laznia',0)]);
  out.push(['Zakończ: '+PHASES[f]+' → '+nextName()+(actionsLeft()?' · zostało akcji: '+actionsLeft():''),()=>endPhaseNow(),false,'act']);
  return out;
}

/** The yard door in prison: back to the cell, and the yard boss when he is next on the list. @param {(room:string,min?:number)=>void} go */
export function yardDoorOptions(go){
  /** @type {any[]} */ const out=[['Wróć do celi',()=>go('cell',0)]];
  const e=listEntry(prisonSave().lista.rozdzial);
  if(e&&e.opp==='yard:7'){ const m=listMatch('yard',7); out.push(['Szef spacerniaka czeka pod murem — walka z listy (#10)'+(m.entry?'':' — '+m.why),()=>startListFight(doorStation()),!m.entry||!!prisonGate()]); }
  out.push(['Zakończ: '+PHASES[simPhase()]+' → '+nextName(),()=>endPhaseNow(),false,'act']);
  return out;
}

/**
 * Bunk in prison: a nap (one action, −2 zmęczenia) and, in the evening, sleep (the day ends).
 * @param {any} st @param {(st:any,spec:any)=>void} run @param {number} pz bunk height of the sleeping pose
 */
export function bunkOptions(st,run,pz){
  const s=progressionState.save.sim, it=st.item, bi=it.i+(it.r?it.h??2:it.w??1)/2, why=prisonGate();
  const spec=(/** @type {string} */ label,/** @type {()=>void} */ after)=>({kind:'sleep',label,min:0,pose:1,pz,at:[bi,it.j+1.55],face:[0,-1],order:'after',pop:-1,after});
  /** @type {any[]} */ const out=[['Drzemka · 1 akcja · −'+NAP_REST+' zmęczenia'+(why?' — '+why:s.zm?'':' — nie jesteś zmęczony'),()=>run(st,spec('drzemka',()=>spendAction('drzemka'))),!!why||!s.zm,'act']];
  if(s.faza===2) out.push(['Śpij · koniec dnia (−'+SLEEP_REST+' zmęczenia)'+(actionsLeft()?' · zostało akcji: '+actionsLeft():''),()=>run(st,spec('sen',()=>endPhaseNow())),false,'act']);
  else out.push(['Sen dopiero wieczorem',()=>{},true]);
  return out;
}

/* ---------- the chest in the Ward: goods bought from the turnkey at the flap ---------- */

/** Soap: five washes per bar. @param {boolean} use consume one wash */
export function useSoap(use){
  const Z=prisonSave().zapasy; if(!(Z.mydlo>0)) return false;
  if(use){ Z['mydlo-uzycia']=(Z['mydlo-uzycia']||0)+1; if(Z['mydlo-uzycia']>=5){ Z['mydlo-uzycia']=0; Z.mydlo--; } persist(); }
  return true;
}

/** Locker options: eat or drink what was bought. @param {any} st @param {(st:any,spec:any)=>void} run */
export function lockerOptions(st,run){
  const Z=prisonSave().zapasy, it=st.item, at=[st.spot[0],st.spot[1]], face=[it.i+0.6-st.spot[0],it.j+0.3-st.spot[1]];
  /** @type {[string,string,string,'zm'|'glod',number][]} */
  const GOODS=[['kawa','Zaparz herbatę','−1 zmęczenia','zm',-1],['baton','Zjedz ser','głód −1','glod',-1],['konserwa','Zjedz peklowaną wołowinę','głód −3','glod',-3]];
  /** @type {any[]} */ const out=GOODS.filter(g=>Z[g[0]]>0).map(g=>[g[1]+' ('+Z[g[0]]+') · '+g[2]+' · bez akcji',()=>{   // from the chest: no action
    Z[g[0]]--; persist(); run(st,{kind:'eat',label:g[1].toLowerCase(),min:0,pose:0,at,face,order:'before',pop:-1,after:()=>simNudge(g[3],g[4])}); },false,'act']);
  if(Z.mydlo>0) out.push(['Mydło: '+Z.mydlo+' (5 myć na kostkę)',()=>{},true]);
  if(!out.length) out.push(['Pusto. Handel przez klapę odbywa się w poniedziałek i czwartek przy kolacji.',()=>{},true]);
  return out;
}

export function initialize(){
  state.queue=[]; state.current=null;
  state.cardEl=document.getElementById('storyCard');
  state.kickerEl=document.getElementById('storyKicker');
  state.titleEl=document.getElementById('storyTitle');
  state.bodyEl=document.getElementById('storyBody');
  state.stampEl=document.getElementById('storyStamp');
  state.choicesEl=document.getElementById('storyChoices');
  state.choicesEl.addEventListener('click',e=>{ const btn=/** @type {HTMLElement} */ (e.target).closest('button'); if(!btn) return; e.stopPropagation(); pickCard(+(btn.dataset.i||0)); });
  state.cardEl.addEventListener('mousedown',e=>e.stopPropagation());
  state.cardEl.addEventListener('click',e=>e.stopPropagation());
  syncPhaseClass();
  onSessionEnd(r=>{ if(isPrison()&&r.id!=='work') spendAction('trening'); });   // a training takes an action of the phase and tires
}
