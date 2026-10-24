/* Meals in Newgate: there is no canteen. In the morning and in the evening the turnkey drops the flap in the Ward door
   and hands out a hunk of black bread and a tin bowl of skilly; the hero takes his at the door, carries it about the
   Ward and eats it sitting on the edge of the guard-bed (one action: hunger is gone). Over the bowl a cellmate may be wrestled at arm's length for his portion (the minigame
   in armwrestle.js), and on the account days the flap is where the turnkey sells (trade at the flap; save key wypiska). */

import { state as gymState } from './gym.js';
import { rgb } from './appearance.js';
import { state as roomsState, startActivity, goRoom, solidDraw } from './rooms.js';
import { state as sparringState } from './sparring.js';
import { state as progressionState, persist, showToast, addXP } from './progression.js';
import { prisonSave, addRespekt, myRank, prisonGate, showCards, listCanteenOption, supperDenied } from './prison.js';
import { spendAction, simNudge } from './simulation.js';
import { startArm } from './armwrestle.js';
import { isShopDay, inmateRank, EXTRA_PORTION, weekday, OPINIA_GOOD, OPINIA_NO_SHOP, fmtMoney } from './prison-data.js';
import { freshness } from './training-data.js';
import { SLOTS_HERO, BED_SEAT_J } from './ward.js';

// Runtime values owned by ward-meal; initialized explicitly by main.js.
export const state = {};

const C = {};

/** The meal of this phase (breakfast in the morning, supper in the evening) and what the player did with it; null at noon. */
function meal(){
  const s=progressionState.save.sim;
  if(s.faza===1) return null;
  const key=s.day*3+s.faza;
  if(!state.meal||state.meal.key!==key) state.meal={key,label:s.faza?'kolacja':'śniadanie',tray:false,eaten:false,extra:0,demand:false};
  return state.meal;
}
/** The current meal state (null outside meals). */
export function currentMeal(){ return meal(); }

/** Is he carrying his bowl about the Ward (taken at the flap, not eaten, not lost at arm wrestling)? */
export function carryingTray(){ const M=state.meal; return gymState.hubRoom==='cell'&&!!M&&M.tray&&!M.eaten&&!roomsState.hubAct; }
/** The bowl and the bread in his hands, held at the waist in front of him. @param {any} P the hero @param {number} z height (body units) */
export function drawHeldTray(P,z){
  const S=1/7.5, at=(/** @type {number} */ f,/** @type {number} */ s)=>[P.i+(f*P.fi-s*P.fj)*S,P.j+(f*P.fj+s*P.fi)*S];
  const [bi,bj]=at(3.2,-0.4), r=0.2;
  solidDraw(bi-r,bj-r,bi+r,bj+r,z-0.9,z+0.4,(a,b,zz)=>{ const d=Math.hypot(a-bi,b-bj); if(d>r*(0.7+0.3*Math.min(1,(zz-z+0.9)/1.3))) return 0;   // a tin bowl, wider at the top
    if(zz>z+0.25) return d>r*0.8?C.tinH:(d<r*0.5?C.skilly:C.skillyD); return (a-bi)-(b-bj)>0?C.tinD:C.tin; });
  const [ci,cj]=at(2.6,1.5); solidDraw(ci-0.14,cj-0.08,ci+0.14,cj+0.08,z-0.5,z+0.2,(a,b,zz)=>Math.hypot((a-ci)/0.14,(b-cj)/0.08)<1?(zz>z?C.crust:C.crumb):0);   // the bread
}

/** Arm wrestling with a cellmate. @param {any} O his fight sheet (sparring CELL_OPP) @param {'porcja'|'sport'} stake */
function wrestle(O,stake){
  const M=meal(), today=progressionState.save.train.count['arm']||0;
  if(stake==='sport') spendAction('trening');
  startArm({name:O.title,fight:O.rank,oppRank:inmateRank(O.rank),stake,look:O.look,onEnd:(res)=>{
    progressionState.save.train.count['arm']=today+1;
    const xp=Math.round((res==='win'?18:res==='draw'?10:7)*freshness(today));
    if(xp>0){ addXP('str',xp); addXP('end',Math.round(xp/4)); }
    const up=inmateRank(O.rank)>myRank()?2:1, P=prisonSave();
    if(res==='win'){ if(stake==='porcja'&&M){ M.extra+=EXTRA_PORTION; P.stol.dokladki++; showToast('Wygrana! Jego chleb jest twój.'); } addRespekt(stake==='sport'?1:up,'siłowanie na rękę'); }
    else if(res==='loss'){ if(stake==='porcja'&&M){ M.tray=false; M.eaten=true; showToast('Przegrana. Oddajesz miskę.'); } addRespekt(stake==='sport'?-1:-2,'siłowanie na rękę'); }
    else showToast('Remis. Nikt nic nie traci.');
    P.stol.gry++; persist();
  }});
}

/** Extra options at the Ward door during a meal: the bowl through the flap, the turnkey's trade, a list fight. @returns {any[]} */
export function mealDoorOptions(){
  const M=meal(); if(!M||gymState.hubRoom!=='cell') return [];
  /** @type {any[]} */ const out=[M.label==='kolacja'&&supperDenied()?['Klapa zamknięta — bez kolacji, kara z kieratu',()=>{},true]:[M.tray||M.eaten?'Miska już odebrana':'Odbierz miskę przez klapę · '+M.label,()=>{ M.tray=true; showToast('Masz miskę i chleb. Zjedz na pryczy.'); },M.tray||M.eaten]];
  const s=progressionState.save.sim, op=prisonSave().opinia, day=isShopDay(s.day)||(op>=OPINIA_GOOD&&weekday(s.day)===5);
  if(M.label==='kolacja'&&day) out.push(op<=OPINIA_NO_SHOP?['Klucznik nie sprzedaje ci — za słaba opinia',()=>{},true]:['Handel przez klapę · na koncie '+fmtMoney(prisonSave().wypiska),()=>openShop()]);
  const L=listCanteenOption(); if(L) out.push(L);
  return out;
}
/** On the guard-bed with the bowl: eat it sitting on the edge. @param {any} st @returns {any[]} */
export function mealBedOptions(st){
  if(!carryingTray()) return [];
  const M=meal(); if(!M) return []; const why=prisonGate();
  return [['Zjedz na pryczy · 1 akcja · głód znika'+(M.extra?' · z cudzym chlebem: −1 zmęczenia':'')+(why?' — '+why:''),()=>eat(st),!!why,'act']];
}
/** By a cellmate: arm wrestling for the portion (with the bowl), for sport, buying or taking his bread. @param {number} idx cell inmate @returns {any[]} */
export function mealMateOptions(idx){
  const M=meal(), O=sparringState.CELL_OPP[idx]; if(!O||gymState.hubRoom!=='cell') return [];
  /** @type {any[]} */ const out=[];
  const hold=!!M&&M.tray&&!M.eaten, first=O.title.split(' ')[0];
  const why=prisonGate(), cost=' · 1 akcja'+(why?' — '+why:'');
  if(hold) out.push(['Siłowanie na rękę o porcję — '+O.title+' · bez akcji',()=>wrestle(O,'porcja')]);
  if(M) out.push(['Siłowanie na rękę dla sportu'+cost,()=>wrestle(O,'sport'),!!why]);
  if(hold&&!M.bought&&prisonSave().fajki>=2) out.push(['Odkup jego chleb za 2 prymki tytoniu',()=>{ prisonSave().fajki-=2; M.bought=true; M.extra+=EXTRA_PORTION; persist(); showToast(first+' chowa tytoń i podsuwa ci swój chleb.'); }]);
  if(hold&&myRank()>=inmateRank(O.rank)+2&&!M.demand) out.push(['Zażądaj jego chleba (respekt)',()=>{ M.demand=true; M.extra+=EXTRA_PORTION; showToast(first+' bez słowa oddaje ci swój chleb.'); }]);
  return out;
}

/** Eat on the edge of the guard-bed, at his own place. @param {any} st */
function eat(st){
  const M=meal(); if(!M) return;
  const extra=M.extra>0; M.eaten=true; M.tray=false;
  startActivity(st,{kind:'eat',label:M.label+' na pryczy',min:0,pose:2,pz:-1.3,at:[SLOTS_HERO,BED_SEAT_J],face:[0,1],order:'after',pop:-1,
    after:()=>{ spendAction('posilek'); if(extra) simNudge('zm',-1); }});
}

/* ---------- the turnkey's trade at the flap (save key: wypiska) ---------- */

/** Goods sold at the flap: price (on the prison account) and what buying does; ids are the save keys. */
export const SHOP=[{id:'kawa',name:'Garść herbaty',price:3,note:'−1 zmęczenia, do zaparzenia w Wardzie, bez akcji'},{id:'baton',name:'Kawałek sera',price:1.5,note:'głód −1, poza posiłkami, bez akcji'},
  {id:'mydlo',name:'Mydło karbolowe',price:1,note:'kąpiel i mycie dają więcej'},{id:'konserwa',name:'Peklowana wołowina',price:4,note:'głód −3, do zjedzenia w Wardzie, bez akcji'},
  {id:'fajki',name:'Laska tytoniu',price:5,note:'+10 prymek — waluta między więźniami'}];

function openShop(){
  const P=prisonSave();
  showCards([{kicker:'KLAPA W DRZWIACH',title:'Handel z klucznikiem',body:'<p>Na koncie: <b>'+fmtMoney(P.wypiska)+'</b>. Klucznik liczy na palcach i nie lubi czekać. Co kupisz, trafi do twojej skrzyni.</p>',
    choices:[...SHOP.map(o=>({label:o.name+' · '+fmtMoney(o.price),sub:o.note+(P.wypiska<o.price?' — za mało na koncie':''),fn:()=>{
      if(P.wypiska<o.price){ showToast('Za mało na koncie.'); return; }
      P.wypiska=Math.round((P.wypiska-o.price)*100)/100;
      if(o.id==='fajki') P.fajki+=10; else P.zapasy[o.id]=(P.zapasy[o.id]||0)+1;
      persist(); showToast('Kupione: '+o.name.toLowerCase()+'.'); openShop(); }})),{label:'Odejdź od klapy',fn:()=>{}}]}]);
}

export function initialize(){
  Object.assign(C,{tin:rgb('#6e7274'),tinD:rgb('#4e5254'),tinH:rgb('#9a9ea0'),skilly:rgb('#8a8460'),skillyD:rgb('#6a6446'),crust:rgb('#3e2814'),crumb:rgb('#5e4224')});
  state.meal=null;
}
