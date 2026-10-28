/* Character sheet (karta postaci, P): the hero's portrait and everything about him on one screen — where he is and
   what time it is, his needs and form, the three trees with XP still missing to the next level, the perks he owns,
   the fight record and the best training grades, who to beat next (the ladder) and the brawl skill set. Three tabs change
   things: Cechy (an open slot takes one of two traits), Ciosy (the punch trees, bought with the attribute's points) and
   Skille (skills in and out of the set, moves to learn). It opens over the hub and pauses the game. */

import { LASTING, PERK_CARDS, CARDS, MOVES, LOADOUT_MAX, tempoOf, PUNCH_TREES, NODE_PRICE, nodeBlock } from './card-data.js';
import { playerFightPerks, playerLoadout, playerSkillPool, learnMove, loadoutAdd, loadoutRemove, buyPunchNode } from './progression.js';
import { state as progressionState, xpNeed, trialLocked, skillPoints, prisonCapped } from './progression.js';
import { STAT_KEYS, STAT_PL, STAT_MAX } from './data.js';
import { traitRows, traitClick, fightPassiveText } from './skill-tree.js';
import { passiveSummary } from './stats.js';
import { DRILLS, PRISON_CAP } from './training-data.js';
import { BARE_PERKS, WEEKDAYS, weekday, fmtMoney, LADDER, ladderNext, listEntry, lessonText } from './prison-data.js';
import { simTime, simFormText, actionsLeft, hungerLevel, TIRED_MAX } from './simulation.js';
import { bareInfo } from './prison.js';
import { drawHeroPortrait } from './hero.js';
import { setPaused, clearHeldInput } from './input.js';
import { state as boxingState } from './boxing.js';

// Runtime values owned by char-sheet; initialized explicitly by main.js.
export const state = {};

const ROOMS = {cell:'cela',yard:'spacerniak',laznia:'łaźnia'};
const VENUES = {cell:'cela',yard:'spacerniak',canteen:'przy posiłku',laznia:'łaźnia'};
const HOW = {KO:'KO',TKO:'TKO',PKT:'na punkty',CZAS:'na czas',KASTET:'kastet',DQ:'dyskwalifikacja'};

/** @param {unknown} s */
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]||c);
/** A labelled bar, inked like a form. @param {string} label @param {number} v 0..100 @param {string} [note] */
const bar=(label,v,note)=>'<div class="cs-bar'+(v<25?' low':'')+'"><span>'+label+'</span><div class="cs-track"><i style="width:'+Math.max(0,Math.min(100,v))+'%"></i></div><b>'+Math.round(v)+'</b>'+(note?'<small>'+note+'</small>':'')+'</div>';
/** A figure with its label above and a note below. @param {string} label @param {string} value @param {string} [note] */
const fact=(label,value,note)=>'<div class="cs-fact"><span>'+label+'</span><b>'+value+'</b>'+(note?'<small>'+note+'</small>':'')+'</div>';

/** Is the sheet open? */
export function charSheetOpen(){ return !!state.dlg?.open; }

export function openCharSheet(){
  if(!state.dlg||charSheetOpen()||(boxingState.gstate!=='hub'&&boxingState.gstate!=='menu')) return;   // the hub only, never mid-fight
  clearHeldInput(); setPaused(true); state.deckMsg=''; state.punchMsg=''; state.perkMsg='';
  renderCharSheet();
  showTab('who');
  state.dlg.showModal(); document.body.classList.add('charopen');
}

/** Switch the file's tab. @param {string} id */
function showTab(id){
  for(const b of state.tabs){ const on=b.dataset.csTab===id; b.setAttribute('aria-selected',String(on)); b.tabIndex=on?0:-1; }
  for(const p of state.panels) p.hidden=p.id!=='cs-panel-'+id;
}

export function closeCharSheet(){
  if(!charSheetOpen()) return;
  state.dlg.close();
}

/** Keyboard while open: Esc / P closes. @param {KeyboardEvent} e @returns {boolean} handled */
export function charSheetKey(e){
  if(!charSheetOpen()) return false;
  if(e.code==='Escape'||e.code==='KeyP'){ e.preventDefault(); closeCharSheet(); }
  else if((e.code==='ArrowLeft'||e.code==='ArrowRight')&&e.target instanceof HTMLElement&&e.target.dataset.csTab){
    e.preventDefault(); const i=state.tabs.indexOf(e.target), b=state.tabs[(i+(e.code==='ArrowRight'?1:state.tabs.length-1))%state.tabs.length];
    showTab(b.dataset.csTab); b.focus(); }
  return true;
}

/** Fill the sheet from the save. */
export function renderCharSheet(){
  const S=progressionState.save, sim=S.sim, P=S.prison;
  drawHeroPortrait(state.portrait,{prison:true,hurt:Math.min(1,sim.zm/TIRED_MAX),wounds:S.injuries.map(e=>e.id)});
  // ---- who and where
  const place=ROOMS[S.room]||S.room, block=simTime()+' · akcje '+actionsLeft()+'/2';
  state.kicker.textContent='Newgate · karta więźnia';
  state.title.textContent='DZIEŃ '+sim.day+' · '+(WEEKDAYS[weekday(sim.day)].slice(0,3).toUpperCase()+' · ')+simTime();
  state.who.innerHTML='<span class="cs-lbl">'+'Skazany'+'</span><b class="cs-name">BOHATER</b><span>'+esc(place)+(block?' · '+esc(block):'')+'</span>';
  let facts='';
  {
    facts+=fact('Konto',fmtMoney(P.wypiska),'tytoń: '+P.fajki+' prym.');
    facts+=fact('Lista Profesora',Object.keys(P.lista.wygrane).length+' / 10',P.profesor?.spotkany?'nazwisk':'Profesor jeszcze nie mówi');
    state.stamp.hidden=true;
  }
  state.facts.innerHTML='<div class="cs-facts">'+facts+'</div>';
  state.quest.innerHTML=questHTML(P);
  // ---- needs and form
  let needs='';
  needs+=bar('Siły',100*(TIRED_MAX-sim.zm)/TIRED_MAX,sim.zm?'w walce pasek kondycji −'+sim.zm+' · drzemka −2, sen −4':'wypoczęty');
  needs+=bar('Najedzenie',[100,66,33,0][Math.min(3,sim.glod)],hungerLevel()?'ciosy −'+hungerLevel()+' obrażeń':'posiłek rano i wieczorem');
  needs+=bar('Higiena',sim.h,'łaźnia wieczorem, beczka z wodą');
  needs+='<p class="cs-form'+(sim.zm||hungerLevel()?'':' fit')+'">'+esc(simFormText())+'</p>';
  state.needs.innerHTML=needs;
  { const ids=[...new Set(S.injuries.map(e=>e.id))];   // lasting injuries from the card brawls: they stay until healed
    /** @type {HTMLElement} */ (document.getElementById('cs-wounds')).innerHTML=ids.length?'<ul class="cs-wounds">'+ids.map(id=>{ const n=S.injuries.filter(e=>e.id===id), L=LASTING[id];
      return '<li><b>'+esc(L.name)+(n.length>1?' ×'+n.length:'')+'</b><small>'+esc(L.effect)+' · od dnia '+Math.min(...n.map(e=>e.day))+'</small></li>'; }).join('')+'</ul>'
      :'<small>Bez ran. Na razie.</small>'; }
  state.sum.innerHTML='<div class="cs-sum">'+STAT_KEYS.map(k=>{ const st=S.stats[k];
    return '<div><b>'+STAT_PL[k].toUpperCase()+' '+st.lvl+'</b><small>'+(st.lvl>=STAT_MAX?'maksymalny poziom':Math.floor(prisonCapped(k)?P.bank[k]:trialLocked(k,st.lvl)?st.banked:st.xp)+' / '+xpNeed(st.lvl)+' XP'+(' · limit celi '+PRISON_CAP))+'</small></div>'; }).join('')+'</div>';
  // ---- the trees
  let stats='';
  for(const k of STAT_KEYS){
    const st=S.stats[k], max=st.lvl>=STAT_MAX, need=xpNeed(st.lvl), locked=trialLocked(k,st.lvl), capped=prisonCapped(k), pts=skillPoints(k);
    const have=capped?P.bank[k]:locked?st.banked:st.xp, pc=max?100:Math.min(100,100*have/need);
    let note=max?'maksymalny poziom':locked?'próba u Profesora odblokuje dalsze poziomy · w puli '+Math.floor(st.banked)+' / '+need+' XP':
      capped?'w więzieniu do poziomu '+PRISON_CAP+' · XP czeka w puli: '+Math.floor(P.bank[k])+' / '+need:
      Math.floor(st.xp)+' / '+need+' XP · brakuje '+Math.ceil(need-st.xp)+' do poziomu '+(st.lvl+1);
    stats+='<div class="cs-tree t-'+k+'"><div class="cs-tree-head"><b>'+STAT_PL[k]+'</b><span>poziom '+st.lvl+'<small> / '+STAT_MAX+'</small></span></div>'+
      '<div class="cs-track xp"><i style="width:'+pc+'%"></i></div><small>'+note+'</small>'+
      '<small class="cs-pass">'+esc(passiveSummary(k,st.lvl))+'</small>'+
      '<small class="cs-pass">'+esc(fightPassiveText(k,st.lvl))+'</small>'+
      '<small class="cs-pts">punkty na ciosy: '+pts.free+' wolne / '+pts.earned+' zdobyte</small></div>';
  }
  state.stats.innerHTML=stats;
  // ---- Cechy: an open slot takes one of two traits here; a change costs tobacco at Profesor's
  let perks=(state.perkMsg?'<p class="cs-deckhead"><em>'+esc(state.perkMsg)+'</em></p>':'');
  for(const k of STAT_KEYS) perks+='<div class="cs-traits"><h3>'+STAT_PL[k]+'<small>poziom '+S.stats[k].lvl+' · Cechy na poziomach 5, 10 i 15</small></h3>'+traitRows(k,false)+'</div>';
  { const B=BARE_PERKS.filter(p=>S.bare.unlocked.includes(p.id)), info=bareInfo();
      perks+='<div class="cs-perkrow"><b>Spacerniak'+(' · punkty '+(info.points-info.spent)+' / '+info.points)+'</b>'+(B.length?'<div class="cs-chips">'+B.map(p=>'<span class="on" title="'+esc(PERK_CARDS[p.id].text)+'">'+esc(p.name)+'</span>').join('')+'</div>':'<small>brak — w drzewku u Profesora</small>')+'</div>'; }
  {   // what the Cechy and Spacerniak perks do in a brawl (the skills they teach are on the Skille tab)
    const rules=playerFightPerks().filter(id=>PERK_CARDS[id]&&PERK_CARDS[id].kind!=='karta').map(id=>PERK_CARDS[id].text);
    perks+='<div class="cs-perkrow"><b>W bójce</b>'+(rules.length?'<ul class="cs-rules">'+rules.map(r=>'<li>'+esc(r)+'</li>').join('')+'</ul>':'<small>Jeszcze bez Cech. Pierwszą wybierzesz na poziomie 5.</small>')+'</div>';
  }
  state.perks.innerHTML=perks;
  renderPunches();
  renderDeck();
  // ---- the fight record
  const R=S.record, line=(/** @type {string} */ name,/** @type {any} */ t)=>'<div class="cs-rec"><span>'+name+'</span><b>'+t.w+'–'+t.l+'–'+t.d+'</b><small>'+(t.w+t.l+t.d?'wygrane przez KO: '+t.ko+' · przegrane przez KO: '+t.koL:'jeszcze bez walk')+'</small></div>';
  let fights=line('Bójki na gołe pięści',R.bare)+line('Sparingi w rękawicach',R.spar);
  if(R.last.length){ fights+='<ol class="cs-last">'+R.last.map(f=>'<li class="r-'+f.r+'"><b>'+({w:'W',l:'P',d:'R'})[f.r]+'</b> '+esc(f.o)+' <small>· '+esc(VENUES[f.v]||f.v)+' · '+esc(HOW[f.h]||f.h)+' · dzień '+f.day+'</small></li>').join('')+'</ol>'; }
  else fights+='<small>Ostatnie walki pojawią się tutaj.</small>';
  state.fights.innerHTML=fights;
  // ---- training
  const best=S.train.best, ids=Object.keys(DRILLS).filter(id=>best[id]||S.train.stage[id]);
  state.train.innerHTML=ids.length?'<div class="cs-grades">'+ids.map(id=>{ const D=/** @type {any} */ (DRILLS)[id], b=best[id], stg=S.train.stage[id]||1;
    return '<span><b class="g-'+(b?b.grade:'none')+'">'+(b?b.grade:'—')+'</b>'+esc(D.name)+'<small>stopień '+['I','II','III','IV','V'][stg-1]+'</small></span>'; }).join('')+'</div>':'<small>Pierwszy trening da pierwszą ocenę.</small>';
}

/** Who to beat next on the ladder, where and how; the whole ladder; Profesor's next name once he talks. @param {any} P */
function questHTML(P){
  const next=ladderNext(P.pokonani), won=LADDER.filter(e=>P.pokonani[e.rival]).length;
  let out=next?'<div class="cs-quest"><b>'+next.stars+' '+esc(next.name)+'</b><small><i>Gdzie:</i> '+esc(next.where)+'</small><small><i>Jak:</i> '+esc(next.tip)+'</small></div>'
    :'<div class="cs-quest"><b>Pobiłeś każdego w Newgate.</b></div>';
  out+='<ol class="cs-ladder" aria-label="Drabina: '+won+' z '+LADDER.length+'">'+LADDER.map(e=>'<li class="'+(P.pokonani[e.rival]?'won':e===next?'next':'')+'" title="'+esc(e.name)+'">'+esc(e.name.replace(/ „.*”/,''))+'</li>').join('')+'</ol>';
  const L=P.profesor?.spotkany?listEntry(P.lista.rozdzial):null;
  if(L) out+='<small class="cs-list">Lista Profesora #'+L.n+': '+esc(L.name)+' · '+esc(L.where)+' · chce zobaczyć: '+esc(lessonText(L,true))+'</small>';
  return out;
}

const TREE_PL=/** @type {Record<string,string>} */ ({str:'Siła',spd:'Szybkość',end:'Wytrzymałość'});
const DECK_WHY=/** @type {Record<string,string>} */ ({full:'Zestaw ma już '+LOADOUT_MAX+' skilli. Najpierw coś odłóż.',min:'W zestawie musi zostać co najmniej jeden skill.',in:'Ten skill już jest w zestawie.',none:'Tego skilla nie ma w zestawie.',unknown:'Tego skilla jeszcze nie znasz.',points:'Za mało punktów w tym atrybucie.',known:'Ten ruch już znasz.'});

/** One skill on the Skille tab: cost in stamina, name, tempo, damage, markers and text, with its buttons. @param {string} id @param {string} side buttons and notes */
function cardRow(id,side){
  const c=CARDS[id], marks=[c.low?'korpus':'głowa',c.heavy?'ciężki':'',c.dirty?'brudny':'',c.once?'raz na walkę':''].filter(Boolean).join(' · ');
  const stat=c.kind==='atak'?c.dmg+(c.hits?'×'+c.hits:'')+' obr. · tempo '+tempoOf(c)+' · '+marks:'trik · tempo '+tempoOf(c)+(c.once?' · raz na walkę':'');
  return '<li class="cs-card k-'+c.kind+(c.low?' low':'')+(c.heavy?' heavy':'')+'"><i title="koszt: '+c.cost+' kondycji">'+c.cost+'</i><span><b>'+esc(c.name)+'</b><small>'+esc(stat)+' — '+esc(c.text)+'</small></span>'+side+'</li>';
}

const NODE_WHY=/** @type {Record<string,string>} */ ({soon:'Ten węzeł zadziała w bójce w następnym etapie — na razie nie można go kupić.',points:'Za mało punktów tego atrybutu.','not-known':'Najpierw naucz się tego ruchu (zakładka Skille).',max:'To drzewko jest pełne.',unknown:''});
const ROMAN=['I','II','III','IV','V'];

/** The Ciosy tab: the eight punch trees by attribute; each level is one of two nodes, bought in order. */
function renderPunches(){
  const S=progressionState.save;
  let out='<p class="cs-deckhead">Każdy cios ma pięć poziomów; na każdym wybierasz jeden z dwóch węzłów. Płacisz punktami atrybutu ciosu (I–III po 1, IV–V po 2).'+(state.punchMsg?' <em>'+esc(state.punchMsg)+'</em>':'')+'</p>';
  for(const k of STAT_KEYS){
    const ids=Object.keys(PUNCH_TREES).filter(id=>MOVES[id].tree===k), free=skillPoints(k).free;
    out+='<h3>'+STAT_PL[k]+' · '+free+' wolnych pkt</h3><div class="cs-ptrees">';
    for(const id of ids){
      const m=S.moves[id], picks=m?m.picks:'';
      const rows=PUNCH_TREES[id].map((pair,lvl)=>'<li><i>'+ROMAN[lvl]+'</i>'+pair.map((n,i)=>{
        const pick=i?'b':'a', mine=picks[lvl]===pick, chosen=lvl<picks.length, next=lvl===picks.length&&!!m;
        const why=next?nodeBlock(S.moves,id,pick,free):'';
        const cls=mine?'on':chosen?'off':next?'next':'later';
        const note=mine?'wybrany':chosen?'':next?(why==='soon'?'w przygotowaniu':why==='points'?'brakuje punktów':'kup · '+NODE_PRICE[lvl]+' pkt'):'';
        return '<button type="button" class="cs-node '+cls+'" data-node="'+id+':'+pick+'"'+(next&&!why?'':' aria-disabled="true"')+' title="'+esc(n.text)+'"><b>'+esc(n.name)+'</b>'+esc(n.text)+(note?'<small>'+note+'</small>':'')+'</button>';
      }).join('')+'</li>').join('');
      out+='<div class="cs-ptree"><h4>'+esc(CARDS[id].name)+'<small>'+(m?'poziom '+picks.length+' / 5':'nieznany ruch')+'</small></h4><ol>'+rows+'</ol></div>';
    }
    out+='</div>';
  }
  state.punch.innerHTML=out;
}

/** A node on the Ciosy tab. @param {Event} e */
function punchClick(e){
  const b=/** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-node]')); if(!b) return;
  const [id,pick]=/** @type {string} */ (b.dataset.node).split(':'), S=progressionState.save, lvl=S.moves[id]?.picks.length??0;
  if(!S.moves[id]||lvl>=PUNCH_TREES[id].length||b.classList.contains('on')||b.classList.contains('off')||b.classList.contains('later')){ state.punchMsg=b.title; }
  else { const why=buyPunchNode(id,/** @type {'a'|'b'} */ (pick)); state.punchMsg=why?NODE_WHY[why]??why:'Nowy węzeł: '+PUNCH_TREES[id][lvl][pick==='a'?0:1].name+' ('+CARDS[id].name+').'; }
  renderCharSheet(); showTab('punch');
}

/** A trait card on the Cechy tab: an open slot takes it; changes are Profesor's. @param {Event} e */
function perkClick(e){
  const b=/** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('[data-trait]')); if(!b) return;
  state.perkMsg=traitClick(b,false); renderCharSheet(); showTab('perks');
}

/** The Skille tab: the set taken into a fight, the rest of the known skills, the moves still to learn. */
function renderDeck(){
  const S=progressionState.save, set=playerLoadout(), pool=playerSkillPool();
  const btn=(/** @type {string} */ act,/** @type {string} */ id,/** @type {string} */ label,/** @type {boolean} */ off,/** @type {string} */ title)=>'<button type="button" data-'+act+'="'+id+'"'+(off?' disabled':'')+' title="'+esc(title)+'">'+label+'</button>';
  let out='<p class="cs-deckhead"><b>'+set.length+'/'+LOADOUT_MAX+'</b> w zestawie · do bójki bierzesz najwyżej '+LOADOUT_MAX+' skilli; w kółku koszt w kondycji, niższe tempo uderza wcześniej. Unik i parowanie są zawsze pod ręką.'+(state.deckMsg?' <em>'+esc(state.deckMsg)+'</em>':'')+'</p>';
  out+='<div class="cs-deckcols"><div><h3>W zestawie</h3><ul class="cs-cards">'+set.map(id=>cardRow(id,btn('del',id,'−',set.length<=1,'Odłóż z zestawu'))).join('')+'</ul></div>';
  const coll=pool.filter(id=>CARDS[id]&&!set.includes(id));
  out+='<div><h3>Kolekcja</h3><ul class="cs-cards">'+(coll.length?coll.map(id=>cardRow(id,btn('add',id,'+',set.length>=LOADOUT_MAX,'Weź do zestawu'))).join(''):'<li><small>Wszystko, co znasz, jest w zestawie.</small></li>')+'</ul>';
  const learn=Object.keys(MOVES).filter(id=>!S.moves[id]);
  if(learn.length){ out+='<h3>Ruchy do nauki</h3><ul class="cs-cards">';
    for(const id of learn){ const M=MOVES[id], free=skillPoints(M.tree).free;
      out+=cardRow(id,'<span class="cs-cnt">'+TREE_PL[M.tree]+' · '+M.price+' pkt</span>'+btn('learn',id,'Naucz się',free<M.price,'Wolne punkty: '+free)); }
    out+='</ul>'; }
  state.deck.innerHTML=out+'</div></div>';
}

/** A button on the Skille tab. @param {Event} e */
function deckClick(e){
  const b=/** @type {HTMLElement} */ (e.target).closest('button'); if(!b) return;
  const why=b.dataset.add?loadoutAdd(b.dataset.add):b.dataset.del?loadoutRemove(b.dataset.del):b.dataset.learn?learnMove(b.dataset.learn):null;
  if(why===null) return;
  const learnt=b.dataset.learn;
  state.deckMsg=why?DECK_WHY[why]||why:learnt?'Nowy ruch: '+CARDS[learnt].name+' — '+(playerLoadout().includes(learnt)?'jest w zestawie.':'jest w kolekcji.'):'';
  renderCharSheet(); showTab('deck');
}

export function initialize(){
  const d=/** @type {HTMLDialogElement|null} */ (document.getElementById('charSheet')); state.dlg=d;
  if(!d) return;
  state.portrait=/** @type {HTMLCanvasElement} */ (d.querySelector('#csPortrait'));
  for(const k of ['who','facts','quest','needs','sum','stats','perks','punch','deck','fights','train']) state[k]=d.querySelector('#cs-'+k);
  state.deck?.addEventListener('click',deckClick);
  state.punch?.addEventListener('click',punchClick);
  state.perks?.addEventListener('click',perkClick);
  state.kicker=d.querySelector('#csKicker'); state.title=d.querySelector('#csTitle'); state.stamp=d.querySelector('#csStamp');
  state.tabs=[.../** @type {NodeListOf<HTMLButtonElement>} */ (d.querySelectorAll('[data-cs-tab]'))]; state.panels=[...d.querySelectorAll('.cs-panel')];
  for(const b of state.tabs) b.addEventListener('click',()=>showTab(b.dataset.csTab||'who'));
  d.addEventListener('close',()=>{ document.body.classList.remove('charopen'); setPaused(false); });
  d.addEventListener('cancel',e=>{ e.preventDefault(); closeCharSheet(); });
  d.querySelector('#csClose')?.addEventListener('click',closeCharSheet);
  document.getElementById('charBtn')?.addEventListener('click',e=>{ /** @type {HTMLElement} */ (e.currentTarget).blur(); openCharSheet(); });
}
