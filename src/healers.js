/* Healing the lasting injuries of the card brawls in Newgate: Śmierdziel's ointment by the Ward's night tub (tobacco,
   the face only, sometimes it is just muck) and a turnkey on the yard who takes shillings for a visit to the surgeon
   (anything, every time). The rules are in card-data.js (HEALERS, healOne); the save belongs to progression and prison. */

import { HEALERS, LASTING } from './card-data.js';
import { state as progression, healInjury, persist, showToast } from './progression.js';
import { showCards, prisonSave, spendTobacco, spendMoney } from './prison.js';
import { fmtMoney } from './prison-data.js';
import { simNudge } from './simulation.js';

/** Open Śmierdziel's healing options in the Ward. @param {string} id */
export function healerOpen(id){ if(id==='smierdziel') stinkCard(); }

/** Kinds of injury the player carries that this healer can treat, with how many of each. @param {string[]} heals */
function treatable(heals){
  /** @type {Record<string,number>} */ const n={};
  for(const e of progression.save.injuries) if(heals.includes(e.id)) n[e.id]=(n[e.id]||0)+1;
  return Object.entries(n);
}

function stinkCard(){
  const P=prisonSave(), H=HEALERS.masc, list=treatable(H.heals), other=progression.save.injuries.length-list.reduce((a,[,k])=>a+k,0);
  const body='<p>Siedzi na mokrych płytach przy kadzi, bez koszuli, skóra szara jak wapno pod sadzą. Nad głową brzęczą mu muchy, a smród kadzi nie wiadomo, gdzie się kończy, a gdzie zaczyna on sam.</p>'+
    (list.length?'<p>Wyciąga z kieszeni blaszane pudełko po tabace: w środku coś żółtego, pachnie łojem i czymś gorszym. — <i>Maść. Sam robię. Na łuk, na oko, na nos. Dwa prymki, tytoń z góry. Działa… przeważnie.</i></p>'
      :'<p>Podnosi na ciebie mętne oczy. — <i>Nic ci nie jest. Przyjdź, jak cię ktoś urządzi. Mam maść na łuk, na oko, na nos.</i></p>')+
    (other?'<p class="hint">— <i>Kości nie skleję</i> — mówi, patrząc na żebra i kostki. — <i>Z tym do felczera. Felczer ci pomoże, jeśli masz środki na koncie.</i></p>':'');
  showCards([{kicker:'The Ward · przy kadzi',title:'Śmierdziel',body,stamp:'',button:'Odejdź',
    choices:[{label:'Do felczera',sub:'leczenie za środki na koncie',fn:()=>surgeonCard()},...list.map(([id,k])=>({label:'Maść: '+LASTING[id].name.toLowerCase()+(k>1?' (×'+k+')':''),sub:H.price+' prymki tytoniu · masz '+P.fajki,fn:()=>buyOintment(id)})),
      {label:'Odejdź',sub:'smród zostaje w nosie',fn:()=>{}}]}]);
}

/** @param {string} id */
function buyOintment(id){
  const H=HEALERS.masc;
  if(!spendTobacco(H.price)){ showToast('Za mało tytoniu. Śmierdziel odwraca się do kadzi.'); return; }
  if(Math.random()<H.fail){ simNudge('h',-25); persist(); showToast('Maść cuchnie kadzią i nic nie daje. Higiena −25.',true); return; }
  healInjury(id); persist(); showToast(LASTING[id].name+' — zagojone. Szczypie jak diabli.',true);
}

function surgeonCard(){
  const P=prisonSave(), H=HEALERS.felczer, list=treatable(H.heals);
  const body='<p>Śmierdziel wskazuje drogę do felczera.</p>'+
    (list.length?'<p>— <i>Felczer znajdzie chwilę. '+fmtMoney(H.price)+' za jedną robotę. Kość, łuk, oko — wszystko jedno.</i></p>'
      :'<p>— <i>Felczer jest dla połamanych, a ty jesteś cały.</i></p>');
  showCards([{kicker:'The Ward · leczenie',title:'Do felczera',body,stamp:'',button:'Odejdź',
    choices:[...list.map(([id,k])=>({label:'Felczer: '+LASTING[id].name.toLowerCase()+(k>1?' (×'+k+')':''),sub:'koszt '+fmtMoney(H.price)+' · na koncie '+fmtMoney(P.wypiska),fn:()=>bribe(id)})),
      {label:'Odejdź',sub:'wróć do Wardu',fn:()=>{}}]}]);
}

/** @param {string} id */
function bribe(id){
  if(!spendMoney(HEALERS.felczer.price)){ showToast('Za mało na koncie.'); return; }
  healInjury(id); persist(); showToast('Felczer — '+LASTING[id].name.toLowerCase()+': zszyte, nastawione, obandażowane.',true);
}
