import { state as progressionState, persist, mergeSave, applyStats, resetSessXP } from './progression.js';
import { simTime, state as simulationState, simUI } from './simulation.js';
import { state as inputState, setInfo, setPaused } from './input.js';
import { leaveMode, enterHub, stMenuClose } from './navigation.js';
import { state as boxingState } from './boxing.js';
import { state as gymState, stationOf } from './gym.js';
import { roomsLoad, setRoomRaw } from './rooms.js';
import { applyGear, applyLook } from './appearance.js';
import { state as optionsState, optsToggle } from './options.js';
import { state as dialogState } from './dialog.js';
import { isPrison, startIntake, syncPhaseClass, resetPrisonUI } from './prison.js';
import { weekday, WEEKDAYS, isWorkDay } from './prison-data.js';
import { openCharSheet } from './char-sheet.js';

/** What the day still holds: this phase with its actions left, then the phases to come. */
function todayHTML(){
  const s=progressionState.save.sim, work=isWorkDay(s.day), sun=weekday(s.day)===6;
  const P=['rano: śniadanie, treningi'+(work?', obowiązkowa korba':''),'południe: spacerniak'+(sun?' i niedzielne bicie':'')+' albo cela','wieczór: kolacja, treningi, łaźnia, sen'];
  return P.map((t,i)=>i===s.faza?'<b>'+t+' · akcje '+(2-s.akcje)+'/2</b>':t).filter((_,i)=>i>=s.faza).join('<br>');
}
/** Controls of the current mode, then the keys that always work. */
function controlsHTML(){
  const mode=(inputState.controlsText||inputState.nextEl.textContent||'').split(' · ').filter(t=>t&&!/^(SIŁ|SZY|WYT) \d+$/.test(t));
  const all=[...mode,'P — karta postaci (poza walką i treningiem)','Esc — pauza w celi, wyjście z treningu i walki','F10 — pauza zawsze','O — opcje · M — dźwięk'];
  return '<ul class="sys-keys">'+all.map(t=>'<li>'+t.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</li>').join('')+'</ul>';
}

// Runtime values owned by menu; initialized explicitly by main.js.
export const state = {}; function resetSave(){ progressionState.saveStore.merge({}); } function saveMetaOf(d){
  const st=d.stats||{}, sm=d.sim||{}, lv=k=>(st[k]&&st[k].lvl)|0||1;
  return 'Dzień '+(sm.day|0||1)+' · '+(['rano','południe','wieczór'][sm.faza|0]||'rano')+' · Newgate'+'<br>SIŁ '+lv('str')+' · SZY '+lv('spd')+' · WYT '+lv('end');
} function slotRead(i){ return progressionState.saveStore.readSlot(i); } function slotWrite(i){ persist(); return progressionState.saveStore.writeSlot(i); } function fmtTs(ts){ try{ return new Date(ts).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } } function autoRead(){ return progressionState.saveStore.read(); } // replace the whole game state: d = a save object (null + fresh = brand new game)
function sysApply(d,fresh){
  progressionState.saveStore.recover(); resetSave(); if(d) mergeSave(d); resetPrisonUI();
  if(fresh) Object.assign(progressionState.save.sim,{day:1,faza:1,akcje:0,min:14*60,zm:0,glod:1,h:60});   // prison: intake at noon on Monday
  inputState.overEl.hidden=true; if(document.getElementById('workEnd')) document.getElementById('workEnd').hidden=true;
  leaveMode(); boxingState.gstate='hub'; syncPhaseClass();
  roomsLoad(); setRoomRaw(progressionState.save.room);
  applyGear(progressionState.save.eq); applyLook(progressionState.save.look); applyStats(); resetSessXP(); progressionState.statsDirty=false; simulationState.simDirty=false;
  enterHub(null);
  const door=gymState.gymItems.find(x=>x.t===({cell:'cdoor',yard:'ydoor',laznia:'ldoor'}[progressionState.save.room]||'cdoor')); if(door) enterHub(stationOf(door));
  persist(); simUI(); setInfo();
}

export function sysOpen(mode){
  state.sysMode=mode; state.sysView='menu'; state.sysNote=''; state.sysAsk=null;
  if(mode==='pause') persist();
  optsToggle(false); stMenuClose();
  if(typeof dialogState.dlgEl!=='undefined'&&!dialogState.dlgEl.hidden){ clearInterval(dialogState.dlgTimer); dialogState.dlgEl.hidden=true; document.body.classList.remove('dlgopen'); }
  setPaused(true); document.body.classList.add('sysopen'); state.sysEl.hidden=false; sysRender();
} export function sysClose(){
  state.sysStarted=true; state.sysEl.hidden=true; document.body.classList.remove('sysopen');
  setPaused(false);
} function sysBtnHTML(act,title,sub,opts){ opts=opts||{}; return '<button class="sysbtn'+(opts.danger?' danger':'')+'" data-a="'+act+'"'+(opts.arg!==undefined?' data-n="'+opts.arg+'"':'')+(opts.off?' disabled':'')+'><b>'+title+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</button>'; } function sysRender(){
  let h='', sub='';
  const auto=autoRead(), hasAuto=!!auto&&(progressionState.HAD_SAVE||state.sysStarted);
  if(state.sysAsk){
    state.sysTitleEl.textContent='NA PEWNO?'; sub='';
    h='<div class="msg">'+state.sysAsk.msg+'</div>'+sysBtnHTML('ask-yes','Tak',state.sysAsk.yes,{danger:true})+sysBtnHTML('ask-no','Nie, wróć','');
  } else if(state.sysView==='menu'){
    state.sysTitleEl.textContent='ROADWORK';
    const S=progressionState.save.sim;
    sub=state.sysNote||(state.sysMode==='main'?'Newgate, Londyn · 1868':(isPrison()?'Newgate · dzień '+S.day+' · '+WEEKDAYS[weekday(S.day)]+' '+simTime():'Dzień '+S.day+' · '+simTime()));
    if(state.sysMode==='main'){
      h+=sysBtnHTML('cont','Kontynuuj',hasAuto?saveMetaOf(auto):'brak zapisu',{off:!hasAuto});
      h+=sysBtnHTML('new','Nowa gra','Newgate, 1868 · dzień 1 — przyjęcie do Wardu');
      h+=sysBtnHTML('load','Wczytaj grę','autozapis lub jeden z '+state.SLOT_N+' slotów',{off:!hasAuto&&![1,2,3].some(slotRead)});
    } else {
      const hub=boxingState.gstate==='hub'||boxingState.gstate==='menu';
      h+=sysBtnHTML('resume','Wracam','Esc');
      h+=sysBtnHTML('char','Karta postaci',hub?'P':'poza walką i treningiem',{off:!hub});
      h+=sysBtnHTML('keys','Sterowanie','');
      h+=sysBtnHTML('save','Zapisz grę','slot 1–'+state.SLOT_N+' · autozapis działa cały czas');
      h+=sysBtnHTML('load','Wczytaj grę','autozapis lub slot');
    }
    h+=sysBtnHTML('opts','Opcje','dźwięk i ustawienia gry');
    if(state.sysMode!=='main'){
      h+=sysBtnHTML('new','Nowa gra','zaczyna od zera · autozapis zostanie nadpisany',{danger:true});
      h+=sysBtnHTML('title','Zapisz i wyjdź','do menu głównego');
    }
  } else if(state.sysView==='load'||state.sysView==='save'){
    const isSave=state.sysView==='save';
    state.sysTitleEl.textContent=isSave?'ZAPISZ GRĘ':'WCZYTAJ GRĘ'; sub=state.sysNote||(isSave?'Wybierz slot':'Wybierz zapis');
    if(!isSave) h+=sysBtnHTML('pick-auto','Autozapis',hasAuto?saveMetaOf(auto):'brak',{off:!hasAuto});
    for(let i=1;i<=state.SLOT_N;i++){ const r=slotRead(i);
      h+=sysBtnHTML(isSave?'pick-save':'pick-load','Slot '+i+(r?' · '+fmtTs(r.ts):''),r?saveMetaOf(r.data):(isSave?'pusty — zapisz tutaj':'pusty'),{arg:i,off:!isSave&&!r}); }
    h+=sysBtnHTML('back','Wstecz','Esc');
  } else if(state.sysView==='keys'){
    state.sysTitleEl.textContent='STEROWANIE'; sub='Klawisze tego miejsca i te, które działają zawsze';
    h+=controlsHTML()+sysBtnHTML('back','Wstecz','Esc');
  }
  state.sysKickerEl.textContent=state.sysAsk?'':state.sysMode==='pause'?'PAUZA':'';
  const today=state.sysMode==='pause'&&state.sysView==='menu'&&!state.sysAsk&&isPrison()?todayHTML():'';
  state.sysTodayEl.hidden=!today; state.sysTodayEl.innerHTML=today?'<b>DZIŚ</b>'+today:'';
  state.sysSub.innerHTML=sub; state.sysBody.innerHTML=h;
  const f=state.sysBody.querySelector('.sysbtn:not(:disabled)'); if(f) f.focus();
} function sysDoNew(){ newGame(); }
/** Start a fresh prison act in the Ward. */
export function newGame(){ sysApply(null,true); sysClose(); if(isPrison()) startIntake(); } function sysDoLoad(d){ sysApply(d,false); sysClose(); } function sysAct(a,n){
  switch(a){
    case 'cont': sysClose(); break;
    case 'resume': sysClose(); break;
    case 'new':
      if(progressionState.HAD_SAVE||state.sysStarted) state.sysAsk={msg:'Nowa gra usunie obecny postęp (autozapis). Zapisane sloty zostają nietknięte.',yes:'Zacznij nową grę',fn:sysDoNew};
      else { sysDoNew(); return; }
      break;
    case 'load': state.sysView='load'; state.sysNote=''; break;
    case 'save': state.sysView='save'; state.sysNote=''; break;
    case 'keys': state.sysView='keys'; state.sysNote=''; break;
    case 'char': sysClose(); openCharSheet(); return;
    case 'back': state.sysView='menu'; state.sysNote=''; break;
    case 'opts': optsToggle(true); return;
    case 'title': persist(); state.sysMode='main'; state.sysView='menu'; state.sysNote=''; break;
    case 'pick-auto': { const d=autoRead(); if(!d) return; if(state.sysMode==='pause') state.sysAsk={msg:'Wczytanie autozapisu zastąpi bieżący stan gry.',yes:'Wczytaj',fn:()=>sysDoLoad(d)}; else { sysDoLoad(d); return; } break; }
    case 'pick-load': { const r=slotRead(n); if(!r) return; if(state.sysMode==='pause') state.sysAsk={msg:'Wczytanie slotu '+n+' zastąpi bieżący stan gry. Zapisz go najpierw, jeśli chcesz go zachować.',yes:'Wczytaj slot '+n,fn:()=>sysDoLoad(r.data)}; else { sysDoLoad(r.data); return; } break; }
    case 'pick-save': {
      const doIt=()=>{ state.sysNote=slotWrite(n)?'Zapisano w slocie '+n+'.':'Nie udało się zapisać (brak miejsca w przeglądarce?).'; state.sysView='menu'; state.sysAsk=null; };
      if(slotRead(n)) state.sysAsk={msg:'Slot '+n+' jest zajęty. Nadpisać?',yes:'Nadpisz slot '+n,fn:doIt}; else doIt();
      break; }
    case 'ask-yes': { const f=state.sysAsk&&state.sysAsk.fn; state.sysAsk=null; if(f) f(); if(state.sysEl.hidden) return; break; }
    case 'ask-no': state.sysAsk=null; break;
  }
  sysRender();
}

export function sysKey(e){   // returns true when the key was consumed by the menu
  if(!state.sysEl.hidden){
    if(e.code==='Escape'||e.code==='F10'){ e.preventDefault(); if(!optionsState.optsEl.hidden){ optsToggle(false); } else if(state.sysAsk){ state.sysAsk=null; sysRender(); } else if(state.sysView!=='menu'){ state.sysView='menu'; state.sysNote=''; sysRender(); } else if(state.sysMode==='pause') sysClose(); }
    else if(!optionsState.optsEl.hidden){ return false; }
    e.stopImmediatePropagation(); return true;
  }
  if(e.code==='F10'&&!e.repeat){ e.preventDefault(); sysOpen('pause'); return true; }
  return false;
}

export function initialize(){



/* =====================================================================
   MENU · SAVES · NEW GAME
   Title screen on start (Continue / New game / Load), pause menu in the game (F10 or the ☰ button):
   Resume / Save / Load / New game / Main menu. The running game autosaves continuously ("Autozapis");
   on top of that there are 3 manual slots. A new game begins with the prison intake in the Ward.
   ===================================================================== */
state.SLOT_N = 3;
state.SLOT_KEY = i=>'heavybag.slot.'+i;

state.sysEl = document.getElementById('sys');
state.sysBody = document.getElementById('sysBody');
state.sysSub = document.getElementById('sysSub');
state.sysTitleEl = document.getElementById('sysTitle');
state.sysKickerEl = document.getElementById('sysKicker');
state.sysTodayEl = document.getElementById('sysToday');

state.sysMode = 'main';
state.sysView = 'menu';
state.sysNote = '';
state.sysAsk = null;
state.sysStarted = false;

state.sysBody.addEventListener('click',e=>{ const b=e.target.closest('.sysbtn'); if(!b||b.disabled) return; sysAct(b.dataset.a,+b.dataset.n||0); });

state.sysEl.addEventListener('mousedown',e=>e.stopPropagation());
 state.sysEl.addEventListener('click',e=>e.stopPropagation());

document.getElementById('sysBtn').onclick=e=>{ e.stopPropagation(); e.currentTarget.blur(); if(state.sysEl.hidden) sysOpen('pause'); else if(state.sysMode==='pause') sysClose(); };
}
