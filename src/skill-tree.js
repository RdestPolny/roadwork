import { TRAITS, TRAIT_LEVELS, TRAIT_NAMES, TRAIT_WAYS } from './skill-data.js';
import { skillIcon } from './skill-icons.js';
import { STAT_KEYS, STAT_PL, STAT_MAX } from './data.js';
import { state as progressionState, xpNeed, skillPoints, pickTrait, traitCost, trialLocked } from './progression.js';
import { traitBlock } from './perk-rules.js';
import { treePassives } from './stats.js';
import { DEBUG } from './config.js';
import { PERK_CARDS } from './card-data.js';
import { setPaused, clearHeldInput } from './input.js';
import { dlgClose } from './dialog.js';
import { BARE_PERKS, BARE_TIER_RANK, BARE_RESPEC_FAJKI, RESPEKT_RANKS, bareBlock } from './prison-data.js';
import { bareInfo, buyBare, respecBare } from './prison.js';

/* Profesor's dialog: the Cechy of the three attributes (PERKI.md) — pick an open slot, change a chosen trait for
   tobacco — and the Spacerniak tree. The character sheet shows the same trait cards (`traitRows`) without changes. */

let dialog, branches, tabs, notice, activeBranch='str';
const ROMAN=['','I','II','III'];
/** Tabs of the three attributes and Spacerniak. */
const TABS=()=>[...STAT_KEYS,'bare'];
const BRANCH_NOTES={str:'Mocne trafienia. Kontuzje. Kończenie wymian.',spd:'Czytaj cios. Zejdź z linii. Odpowiedz pierwszy.',end:'Zachowaj kondycję. Przyjmij presję. Walcz do końca.'};

/** What an attribute gives in a brawl by itself, without Cechy. @param {'str'|'spd'|'end'} key @param {number} lvl */
export function fightPassiveText(key,lvl){
  if(key==='str'){ const p=treePassives('str',lvl); return 'W bójce: ciosy ×'+p.pow.toFixed(2).replace('.',',')+' · zamroczenie ×'+p.stunDealt.toFixed(2).replace('.',','); }
  if(key==='spd') return 'W bójce: okno uniku +'+Math.min(3,Math.floor(lvl/5))+' (co 5 poziomów) · przy remisie tempa pierwszy szybszy';
  return 'W bójce: zdrowie +'+lvl+' · kondycja +'+Math.floor((lvl-1)/4)+' (co 4 poziomy)';
}

/**
 * The trait cards of one attribute, slot by slot. `profesor` allows changing a chosen trait (for tobacco); elsewhere
 * only an open, empty slot can be picked. Each card carries data-trait="key:slot:pick".
 * @param {'str'|'spd'|'end'} key @param {boolean} profesor
 */
export function traitRows(key,profesor){
  const lvl=progressionState.save.stats[key].lvl, picks=progressionState.save.traits[key];
  return TRAIT_LEVELS.map((at,slot)=>{
    const cards=/** @type {const} */ (['a','b']).map((pick,i)=>{
      const id=TRAITS[key][slot][i], mine=picks[slot]===pick, why=traitBlock(slot,pick,picks,lvl), cost=traitCost(key,slot);
      const st=mine?{cls:'learned',state:'always',text:'Wybrana · działa zawsze'}
        :why==='level'?{cls:'locked',state:'locked',text:'Od poziomu '+at}
        :!picks[slot]?{cls:'available',state:'buy',text:'Wybierz · za darmo'}
        :profesor?{cls:'available'+(cost?' short':''),state:'change',text:'Zmień · '+(cost?cost+' prymek tytoniu':'pierwsza zmiana za darmo')}
        :{cls:'blocked',state:'blocked',text:'Zmiana u Profesora'};
      return '<button type="button" class="skill-node '+st.cls+'" data-trait="'+key+':'+slot+':'+pick+'" data-state="'+st.state+'" aria-pressed="'+mine+'"'+(['locked','blocked'].includes(st.state)?' aria-disabled="true"':'')+
        '><span class="skill-node-heading"><span class="skill-emblem">'+skillIcon(id)+'</span><b>'+TRAIT_NAMES[id]+'<small class="skill-path-name">'+TRAIT_WAYS[key][i]+'</small></b><span class="skill-switch" aria-hidden="true"></span></span><span class="skill-description">'+PERK_CARDS[id].text+'</span><span class="skill-state">'+st.text+'</span></button>';
    }).join('');
    return '<div class="skill-tier'+(lvl>=at?'':' closed')+'" data-tier="'+(slot+1)+'"><h3><span>Cecha '+ROMAN[slot+1]+'</span> · poziom '+at+'<small>jedna z dwóch</small></h3><div class="skill-grid two">'+cards+'</div></div>';
  }).join('');
}

/** Pick or change a trait from a card; returns the message for the player. @param {HTMLElement} button @param {boolean} profesor */
export function traitClick(button,profesor){
  const [key,s,pick]=/** @type {string} */ (button.dataset.trait).split(':'), slot=Number(s), state=button.dataset.state;
  const id=TRAITS[/** @type {'str'|'spd'|'end'} */ (key)][slot][pick==='a'?0:1], name=TRAIT_NAMES[id];
  if(state==='buy'||(state==='change'&&profesor)){
    const why=pickTrait(/** @type {'str'|'spd'|'end'} */ (key),slot,/** @type {'a'|'b'} */ (pick));
    return why==='fajki'?'Za mało tytoniu na zmianę.':why?'Nie można wybrać: '+name+'.':(state==='change'?'Zmieniono Cechę: ':'Nowa Cecha: ')+name+'.';
  }
  if(state==='always') return name+' działa zawsze.';
  return button.querySelector('.skill-state')?.textContent||'';
}

/** Whether the trainer's skill menu currently owns game input. */
export function skillTreeOpen(){ return !!dialog?.open; }

/** Pause the cell and replace Profesor’s conversation with the Cechy. */
export function openSkillTree(){
  if(skillTreeOpen()) return;
  dlgClose(false);
  clearHeldInput();
  setPaused(true);
  renderSkillTree();
  { const k=dialog.querySelector('.skill-kicker'), c=document.getElementById('skillClose'), i=document.getElementById('skillIntro');
    if(k) k.textContent='ROADWORK / CELA · PROFESOR';
    if(c) c.innerHTML='Wróć do celi <kbd>Esc</kbd>';
    if(i) i.textContent='Na poziomach 5, 10 i 15 każdego atrybutu wybierasz jedną z dwóch Cech; działają zawsze. Tutaj możesz zmienić wybraną Cechę za tytoń. Punkty z awansów idą na ciosy (karta postaci, zakładka Ciosy). Spacerniak kupujesz za respekt.'; }
  notice.textContent='';
  dialog.showModal();
  document.body.classList.add('skillopen');
}

/** Select one tab and update the native buttons' tab semantics. @param {string} key */
function selectBranch(key){
  activeBranch=key;
  for(const tab of tabs.querySelectorAll('[data-skill-tab]')){
    const selected=tab.dataset.skillTab===key;
    tab.setAttribute('aria-selected',String(selected));
    tab.tabIndex=selected?0:-1;
  }
  for(const panel of branches.children) panel.hidden=panel.id!=='skill-panel-'+key;
}

/** Consume gameplay keys while keeping modal and tab navigation accessible. @param {KeyboardEvent} e */
export function skillTreeKey(e){
  if(!skillTreeOpen()) return false;
  if(e.type==='keydown'&&e.target.closest('[data-skill-tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.code)){
    e.preventDefault();
    const T=TABS(), index=T.indexOf(activeBranch);
    const key=e.code==='Home'?T[0]:e.code==='End'?T[T.length-1]:T[(index+(e.code==='ArrowRight'?1:T.length-1))%T.length];
    selectBranch(key);
    tabs.querySelector('[data-skill-tab="'+key+'"]').focus();
  }
  if(e.type==='keydown'&&e.code==='Tab'){
    const buttons=[...dialog.querySelectorAll('button:not(:disabled):not([tabindex="-1"])')].filter(button=>!button.closest('[hidden]'));
    const first=buttons[0], last=buttons[buttons.length-1];
    if((e.shiftKey&&document.activeElement===first)||(!e.shiftKey&&document.activeElement===last)){
      e.preventDefault();
      (e.shiftKey?last:first).focus();
    }
  }
  e.stopImmediatePropagation();
  return true;
}

/** Three trait slots per attribute with the level, XP, what the attribute gives by itself and its punch points. */
function renderSkillTree(){
  branches.innerHTML=STAT_KEYS.map(key=>{
    const stat=progressionState.save.stats[key], need=xpNeed(stat.lvl), max=stat.lvl>=STAT_MAX, pts=skillPoints(key);
    return '<section id="skill-panel-'+key+'" class="skill-branch" role="tabpanel" aria-labelledby="skill-tab-'+key+'"><header><div class="skill-branch-title"><h2>'+STAT_PL[key]+'</h2><span class="skill-branch-note">'+BRANCH_NOTES[key]+'</span><span class="skill-passives">'+fightPassiveText(key,stat.lvl)+'</span></div><div class="skill-training"><span class="skill-level">Poziom '+stat.lvl+'</span><span class="skill-xp">'+(max?'Maksymalny poziom':(trialLocked(key,stat.lvl)?'Próba u Profesora · pula '+Math.floor(stat.banked)+' / '+need:Math.floor(stat.xp)+' / '+need)+' XP')+'</span><progress max="'+need+'" value="'+(max?need:(trialLocked(key,stat.lvl)?stat.banked:stat.xp))+'" aria-label="'+STAT_PL[key]+' — postęp XP"></progress></div><strong class="skill-count" data-points="'+pts.free+'">'+pts.free+'<small> wolnych pkt na ciosy z '+pts.earned+'</small></strong></header>'+
      traitRows(key,true)+(DEBUG?'<div class="skill-respec"><button type="button" data-skill-grant="'+key+'">+1 pkt testowy</button></div>':'')+'</section>';
  }).join('')+barePanel();
  selectBranch(activeBranch);
}

/** What a perk does in a skill fight: the skill it teaches, a nick or a rule. @param {string} id */
function perkText(id){
  const P=PERK_CARDS[id];
  return '<b class="skill-card-kind">'+({karta:'Skill',nacięcie:'Nacięcie',reguła:'Reguła'})[P.kind]+'</b> '+P.text;
}

/** Spacerniak: points from respect, three tiers gated by rank, one tier III. */
function barePanel(){
  const I=bareInfo(), free=I.points-I.spent;
  const rows=[1,2,3].map(tier=>{
    const nodes=BARE_PERKS.filter(p=>p.tier===tier).map(p=>{
      const own=I.unlocked.includes(p.id), why=own?'':bareBlock(p.id,I);
      const text=own?'Wykupiony · zawsze aktywny':why==='rank'?'Od rangi '+RESPEKT_RANKS[BARE_TIER_RANK[tier]].name:why==='choice'?'Zablokowane · wybrano inny perk progu III':why==='points'?'Kup · '+p.cost+' pkt (brakuje '+(p.cost-free)+')':'Kup · '+p.cost+' pkt';
      const cls=own?'learned':why==='points'?'available short':why?'locked':'available', st=own?'always':why?'locked':'buy';
      return '<button type="button" class="skill-node '+cls+'" data-skill="'+p.id+'" data-branch="bare" data-state="'+st+'" aria-pressed="'+own+'"'+(why&&!own?' aria-disabled="true"':'')+'><span class="skill-node-heading"><span class="skill-emblem">'+skillIcon(p.id)+'</span><b>'+p.name+'<small class="skill-path-name">'+p.tag+'</small></b><span class="skill-switch" aria-hidden="true"></span></span><span class="skill-description">'+perkText(p.id)+'</span><span class="skill-state">'+text+'</span></button>';
    }).join('');
    const open=I.rank>=BARE_TIER_RANK[tier];
    return '<div class="skill-tier'+(open?'':' closed')+'" data-tier="'+tier+'"><h3><span>Próg '+['','I','II','III'][tier]+'</span> · '+['','Znany','Szanowany','Twardziel · jeden z trzech'][tier]+'<small>od rangi '+RESPEKT_RANKS[BARE_TIER_RANK[tier]].name+' · '+tier+' pkt</small></h3><div class="skill-grid">'+nodes+'</div></div>';
  }).join('');
  const respec='<div class="skill-respec"><button type="button" data-bare-respec="1"'+(I.unlocked.length?'':' disabled')+'>Zmień build u Profesora · '+BARE_RESPEC_FAJKI+' prymek tytoniu (masz '+I.fajki+')</button></div>';
  return '<section id="skill-panel-bare" class="skill-branch" role="tabpanel" aria-labelledby="skill-tab-bare"><header><div class="skill-branch-title"><h2>Spacerniak</h2><span class="skill-branch-note">Triki, przetrwanie i czytanie ludzi. Punkty z respektu, perki zawsze aktywne.</span></div>'+
    '<div class="skill-points"><b>'+free+'</b> wolnych z '+I.points+' pkt · ranga '+RESPEKT_RANKS[I.rank].name+'</div></header>'+respec+rows+'</section>';
}

/** @param {string} text */
function say(text){ notice.textContent=text+(progressionState.saveStore.error?' Zapis niedostępny: '+progressionState.saveStore.error+'. Postęp pozostaje w tej karcie.':''); }

/** Re-render and keep focus on the element the player used. @param {string} selector */
function refresh(selector){ renderSkillTree(); branches.querySelector(selector)?.focus({preventScroll:true}); }

/** A Spacerniak perk card: buy it, or say why not. @param {HTMLElement} button */
function pickBare(button){
  const id=/** @type {string} */ (button.dataset.skill), p=BARE_PERKS.find(x=>x.id===id); if(!p) return;
  if(button.dataset.state==='buy'){ const why=buyBare(id); refresh('[data-skill="'+id+'"]'); say(why?'Nie można kupić: '+p.name+'.':'Wykupiono: '+p.name+' — działa zawsze.'); return; }
  say(button.querySelector('.skill-state')?.textContent||'');
}

/** Bind the native modal after progression and trainer dialog initialization. */
export function initialize(){
  dialog=document.getElementById('skillTree');
  branches=document.getElementById('skillBranches');
  tabs=document.getElementById('skillTabs');
  notice=document.getElementById('skillNotice');
  document.getElementById('skillClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    document.body.classList.remove('skillopen');
    clearHeldInput();
    setPaused(false);
    document.getElementById('hubUse').focus();
  });
  dialog.addEventListener('click',e=>{
    const target=/** @type {HTMLElement} */ (e.target);
    const tab=target.closest('[data-skill-tab]');
    if(tab){ selectBranch(/** @type {HTMLElement} */ (tab).dataset.skillTab); return; }
    const trait=/** @type {HTMLElement|null} */ (target.closest('[data-trait]'));
    if(trait){ const msg=traitClick(trait,true); refresh('[data-trait="'+trait.dataset.trait+'"]'); say(msg); return; }
    const bareR=/** @type {HTMLElement|null} */ (target.closest('[data-bare-respec]'));
    if(bareR){
      if(bareR.dataset.armed!=='1'){ bareR.dataset.armed='1'; bareR.textContent='Potwierdź zwrot punktów Spacerniaka — kliknij ponownie'; say('Profesor zwróci punkty Spacerniaka za '+BARE_RESPEC_FAJKI+' prymek tytoniu.'); return; }
      const why=respecBare(); refresh('[data-bare-respec]'); say(why==='fajki'?'Za mało tytoniu.':why?'Nie można zmienić buildu.':'Punkty Spacerniaka wróciły do puli.'); return;
    }
    const grant=/** @type {HTMLElement|null} */ (target.closest('[data-skill-grant]'));
    if(grant){ progressionState.save.skills[/** @type {string} */ (grant.dataset.skillGrant)].bonus++; refresh('[data-skill-grant="'+grant.dataset.skillGrant+'"]'); say('Dodano punkt testowy.'); return; }
    const button=/** @type {HTMLElement|null} */ (target.closest('[data-skill]'));
    if(button) pickBare(button);
  });
}
