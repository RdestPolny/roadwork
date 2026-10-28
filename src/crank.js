import { setGstate } from './boxing.js';
import { state as input, setInfo } from './input.js';
import { leaveMode, setPanelMode, enterHub } from './navigation.js';
import { initAudio, tone } from './audio.js';
import { createCrank, tickCrank, holdCrank, releaseCrank, isRising, DURATION, TARGET } from './crank-rules.js';
import { loadCrankScene, prepareCrankScene, prepareCrankFrame, renderCrankScene } from './crank-scene.js';

export const state={on:false,phase:'intro',crank:null,o:{},settled:false,loadId:0};
let hud,board,title,lead,rows,go,back,clock,score,norm,hint,feedback,meter,fill,pace,button;
const heldSources=new Set();
/** Enter the replacement labour activity; loading and briefing never spend time or an action. @param {any} [o] */
export function startCrank(o={}){
  leaveMode();setGstate('crank');initAudio();
  Object.assign(state,{on:true,phase:'loading',crank:createCrank(),o,settled:false});
  const id=++state.loadId;prepareCrankScene();document.body.classList.add('crank');setPanelMode();hud.hidden=false;
  title.textContent='Żelazna korba';lead.textContent='Ładowanie szopy…';rows.innerHTML='';go.hidden=true;back.textContent='Wróć do Wardu';board.hidden=false;
  loadCrankScene().then(()=>{
    if(!state.on||id!==state.loadId)return;
    state.phase='intro';lead.textContent='Ta maszyna niczego nie napędza. Liczą się tylko kolejne obroty.';
    rows.innerHTML='<p>Pracujesz przez <b>30 sekund</b>. Norma: <b>'+TARGET+' pełnych obrotów</b>.</p><p><kbd>Spacja</kbd> — trzymaj, gdy uchwyt idzie prawym łukiem w górę, od godziny <b>6 przez 3 do 12</b>. Puść na lewym łuku w dół, od <b>12 przez 9 do 6</b>. Równy rytm rozpędza korbę. Przy niewłaściwym chwycie korba czeka — popraw Spację, aby kontynuować. Na 12 i 6 korba czeka na zmianę chwytu.</p><p>Możesz też trzymać i puszczać przycisk pod sceną. <kbd>F10</kbd> — pauza; <kbd>Esc</kbd> — przerwij pracę.</p>';
    go.hidden=false;go.textContent='Chwyć korbę';go.focus();setInfo();syncHUD();
  }).catch(()=>{if(state.on&&id===state.loadId){state.phase='error';lead.textContent='Nie udało się wczytać tła. Wróć i spróbuj ponownie.';}});
  setInfo();syncHUD();
}
/** Begin only after explicit confirmation. */
export function crankGo(){if(state.phase!=='intro')return;state.phase='run';board.hidden=true;crankKeysOff();syncHUD();}
/** Clear held controls without resetting the simulation. */
export function crankKeysOff(){heldSources.clear();releaseCrank(state.crank);}
/** Cancel asynchronous loading and hide the activity when another mode takes ownership. */
export function resetCrank(){state.on=false;++state.loadId;crankKeysOff();if(hud)hud.hidden=true;if(board)board.hidden=true;document.body.classList.remove('crank');}
/** End an active shift once, otherwise return to its originating station. */
export function crankReturn(){if(state.phase==='run'){finish(true);return;}enterHub(state.o.returnSt||null);}
/** Combine held keyboard and pointer controls.
 * @param {string} source @param {boolean} down */
function control(source,down){
  if(!down){heldSources.delete(source);releaseIfActive();return;}
  if(!state.on||state.phase!=='run'||input.paused)return;
  heldSources.add(source);holdCrank(state.crank,true);syncHUD();
}
/** Release the crank only when every held input has ended. */
function releaseIfActive(){if(state.on&&state.phase==='run'&&!input.paused&&!heldSources.size){holdCrank(state.crank,false);syncHUD();}}
/** Route Space and navigation; ignore key repeat. @param {KeyboardEvent} e @param {boolean} down */
export function crankKey(e,down){
  if(e.code==='Space'){
    e.preventDefault();if(e.repeat)return;
    if(down&&state.phase==='intro'&&!input.paused){crankGo();return;}
    control('keyboard',down);return;
  }
  if(!down||e.repeat||input.paused)return;
  if(e.code==='Escape'){e.preventDefault();crankReturn();}
  else if(e.code==='Enter'){e.preventDefault();if(state.phase==='intro')crankGo();else if(state.phase==='result')crankReturn();}
}
/** Settle only once; prison owns all changes to rewards, action costs and the daily work flag. @param {boolean} [aborted] */
function finish(aborted=false){
  if(state.settled)return;state.settled=true;state.phase='result';crankKeysOff();
  const c=state.crank,won=!aborted&&c.turns>=TARGET,accuracy=c.workTime?Math.round(100*c.goodTime/c.workTime):0;
  const result={turns:c.turns,best:c.best,accuracy,won,aborted};
  const rewards=state.o.onEnd?.(result)||[];
  title.textContent=aborted?'Puściłeś korbę przed dzwonkiem':won?'Norma wykręcona':'Żelazo nie ustąpiło';
  lead.textContent=aborted?'Praca została przerwana.':won?'Norma wykonana. Maszyna nadal niczego nie napędza.':'Wynik poniżej normy. Jutro znów ta sama korba.';
  rows.innerHTML='<div class="cr-summary">'+[['Pełne obroty',c.turns+' / '+TARGET],['Rytm',accuracy+'%'],['Najlepsza seria',c.best],...rewards].map(([k,v])=>'<span>'+k+'</span><b>'+v+'</b>').join('')+'</div>';
  go.hidden=true;back.textContent='Wróć do Wardu';board.hidden=false;back.focus();tone('sine',300,won?720:180,.2,.08);syncHUD();
}
/** Advance on the existing fixed 60 Hz clock; pauses never call this operation. */
export function crankTick(){
  if(!state.on||state.phase!=='run')return;
  const c=state.crank,turns=c.turns;
  tickCrank(c);
  if(c.turns>turns)tone('sine',180,260,.045,.025);
  if(c.done)finish();syncHUD();
}
/** Prepare the original-resolution boxer before the HD pass. */
export function crankFrame(){if(!['loading','error'].includes(state.phase)&&state.crank)prepareCrankFrame(state.crank);}
/** Draw the shed, machine, worker and physical cues. */
export function renderCrank(){if(!['loading','error'].includes(state.phase)&&state.crank)renderCrankScene(state.crank);}
/** Keep the current half-turn explicit without relying on colour or sound. */
function syncHUD(){
  if(!hud||!state.crank)return;
  const c=state.crank,rising=isRising(c);
  clock.textContent=String(Math.max(0,Math.ceil(DURATION-c.elapsed)));clock.classList.toggle('cr-last',c.elapsed>=25);
  score.textContent=c.turns;norm.textContent=TARGET;pace.textContent=Math.round(c.speed*60/(Math.PI*2));
  hint.textContent=rising?'6 → 12 · TRZYMAJ SPACJĘ':'12 → 6 · PUŚĆ SPACJĘ';
  feedback.textContent=c.streak>=2?'Równy rytm. Korba nabiera tempa.':rising?'Ciągnij uchwyt prawym łukiem w górę.':'Daj uchwytowi opaść lewym łukiem.';
  const value=Math.min(1,c.speed/4.55);
  fill.style.width=(value*100)+'%';meter.setAttribute('aria-label','Tempo korby');meter.setAttribute('aria-valuenow',String(Math.round(value*100)));
  button.textContent=rising?'Spacja · trzymaj':'Spacja · puść';button.setAttribute('aria-pressed',String(c.held));
}
/** Shared pause-menu controls. */
export function crankInfo(){input.infoEl.textContent='ŻELAZNA KORBA · 30 sekund pracy';input.nextEl.textContent='Spacja: trzymaj 6→12, puść 12→6 · Esc — zakończ · F10 — pauza';input.livesEl.textContent='';}
/** Bind controls in main's explicit initialization order. */
export function initialize(){
  hud=document.getElementById('crankHud');board=document.getElementById('crankBoard');title=document.getElementById('crTitle');lead=document.getElementById('crLead');rows=document.getElementById('crRows');go=document.getElementById('crGo');back=document.getElementById('crBack');clock=document.getElementById('crClock');score=document.getElementById('crScore');norm=document.getElementById('crNorm');hint=document.getElementById('crHint');feedback=document.getElementById('crFeedback');meter=document.getElementById('crMeter');fill=document.getElementById('crFill');pace=document.getElementById('crPace');button=document.getElementById('crHold');
  go.onclick=crankGo;back.onclick=crankReturn;
  button.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();button.setPointerCapture(e.pointerId);control('pointer'+e.pointerId,true);});
  const up=e=>control('pointer'+e.pointerId,false);
  button.addEventListener('pointerup',up);button.addEventListener('pointercancel',up);button.addEventListener('lostpointercapture',up);
}
