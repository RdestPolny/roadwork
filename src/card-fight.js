/* Skill fights in Newgate (KARCIANKA.md). This module owns the duel in progress and its HUD: the command menu of
   brush-stroke bars beside the player's fighter (Expedition 33 style), the exchange timeline of both queues, the
   reaction ring and the exchange played blow by blow with the ordinary fight animations. The rules are in card-rules.js;
   the fighters belong to sparring.js and act the skills out through its operations. The file keeps its old name. */

import { CARDS, LASTING, lastingSpec, RIVALS, rivalSkills, tempoOf, nodeKeys } from './card-data.js';
import { mulberry, makeFighter, newDuel, queueSkill, unqueue, canQueue, skillCost, tells, startExchange, resolveBlow, nextBlow, layBlows, reactWindow, getUp, aiPlan, aiReaction, notePerfect, useZone, has } from './card-rules.js';
import { state as spar, cardAct, setCardVitals, cardCaption, cardGetUp, cardFinish, sparMoveSpeed, fighterHead } from './sparring.js';
import { state as anim } from './animation.js';
import { tiredness, hungerLevel } from './simulation.js';
import { state as progression, recordInjuries, recordHabits, playerLoadout } from './progression.js';
import { prisonSave } from './prison.js';
import { skillIcon } from './skill-icons.js';
import { state as renderer } from './renderer.js';

export const state = {
  /** @type {any} */ duel:null, /** @type {() => number} */ rng:Math.random,
  phase:'off', sel:0, t:0, wait:0, gather:0,
  /** @type {{t:number,fn:() => void}[]} */ script:[],
  base:[8,8], log:'', name:'', /** @type {string[]|null} */ added:null,
  key:'', rigged:false, rigFired:false, /** @type {Record<string,number>[]} */ seen0:[],   // the rival's memory of the player before this brawl
  auto:false,   // Auto: no timing — a dodge always works, a parry is always a plain block
  /** @type {any} */ qte:null,   // the skill moment on screen: a ring closing on a head, or the count after a knockdown
  /** @type {number[]|null} */ pin:null,   // where the menu hangs on the screen, easing after the camera
  /** @type {any[]} */ shown:[],   // this turn's blows on the timeline, both sides, with what became of them
};

/* Skill moments (KARCIANKA.md §6). The ring closes in RING ticks; the reaction windows come from the engine. */
const RING=40, GOOD=10, COUNT_T=42, GETUP_NEED=3;

const ROMAN=['I','II','III','IV'];
const PID=/** @type {Record<string,number>} */ ({jab:0,cross:1,hook:2,upper:3});
/** The move a punch is acted out with. @param {string} card */
const moveOf=card=>card==='lokiec'?anim.M_ELBOW:card==='zbyka'?anim.M_HEADBUTT:PID[CARDS[card]?.punch||CARDS[card]?.as||card]??0;
const ICON=/** @type {Record<string,string>} */ ({jab:'double-jab',cross:'executioner',hook:'butcher',upper:'shock','jab-k':'rolling',watroba:'liver-hunter',
  splot:'body-hammer',zoladek:'cracked-ribs','raz-dwa':'one-two-three',lokiec:'dirty-work',zbyka:'dirty-work',nerki:'nerki',burza:'storm',
  dobicie:'bomb',piach:'piach',kciuk:'kciuk',kosa:'executioner',dziobanie:'sting',lawina:'shock',cyna:'executioner'});
const REASON=/** @type {Record<string,string>} */ ({bark:'Wybity bark: nic za 3+ kondycji.',kondycja:'Za mało kondycji.',pelna:'Kolejka jest pełna.',raz:'Ten skill zagrasz raz na walkę.',skill:'',faza:''});
const INJURY=/** @type {Record<string,string>} */ ({cut:'rozcięcie',eyeL:'podbite lewe oko',eyeR:'podbite prawe oko',nose:'złamany nos',rib:'żebro',handL:'lewa kostka',handR:'prawa kostka',concussion:'wstrząs',legs:'wiotkie nogi',armL:'stłuczone lewe przedramię',armR:'stłuczone prawe przedramię',shoulder:'wybity bark'});
const REACT_PL=/** @type {Record<string,string>} */ ({dodge:'unik',parry:'parowanie',atak:'cios'});

const $=(/** @type {string} */ id)=>/** @type {HTMLElement} */ (document.getElementById(id));

/** A new skill brawl against the opponent `O` (called by startSpar). The perks of both fighters become skills, nicks and rules.
 * @param {any} O @param {{str:number,spd:number,end:number}} levels @param {number} maxTurns
 * @param {{perks:string[],read:number,rigged:boolean,key:string}} me  key: venue:index of the rival (his memory of the player) */
export function cardStart(O,levels,maxTurns,me){
  const st=progression.save.stats, S=state;
  S.rng=mulberry(Math.floor(Math.random()*4294967296));
  const A=makeFighter({name:'Ty',style:'bal',levels:{str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl},injuries:lastingSpec(progression.save.injuries),perks:me.perks,nodes:nodeKeys(progression.save.moves),read:me.read,skills:playerLoadout(),tired:tiredness(),hunger:hungerLevel()});   // the set and the punch trees chosen on the character sheet; the day's tiredness and hunger
  const R=RIVALS[O.name]||{hint:''}, perks=[...new Set([...(O.perks||[]),...(R.perks||[])])];
  const B=makeFighter({name:O.title,style:O.style,levels,perks,skills:rivalSkills(O.style,perks,R.signature),nodes:R.nodes,read:R.read,bias:R.bias,block:R.block,parry:R.parry});
  S.duel=newDuel(A,B,S.rng,{maxTurns});
  S.key=me.key; S.rigged=me.rigged; S.rigFired=false;
  S.seen0=(progression.save.habits[me.key]||[]).map(o=>({...o})); S.duel.memory[1]=S.seen0.map(o=>({...o}));   // he remembers how you fought him
  S.base=[A.staMax,B.staMax]; S.pin=null; S.name=O.title; S.phase='plan'; S.sel=0; S.script=[]; S.shown=[]; S.gather=0; S.qte=null; S.added=null; $('khQte').hidden=true;
  const T=progression.save.record.bare, novice=T.w+T.l+T.d<3;   // the controls are told in the first brawls only
  S.log=prisonSave().profesor?.spotkany&&R.hint?'Profesor: „'+R.hint+'”':novice?'Wydaj kondycję na ciosy (1–'+A.skills.length+' albo klik), Enter — walka. Ciosy rywala: Q unik (łatwy), E parowanie (trudne). Obrona przed ciosem za 2+ zabiera 1 kondycji z następnej tury.':'';
  aiPlan(S.duel,1,S.rng);
  sync(); $('cardHud').hidden=false; document.body.classList.add('cardfight'); render();
}

/** Leaving the fight. */
export function cardStop(){ state.duel=null; state.phase='off'; state.script=[]; state.qte=null; $('khQte').hidden=true; $('cardHud').hidden=true; document.body.classList.remove('cardfight'); }

/** Stamina still free: while planning the queued skills are not paid yet; from the exchange on `sta` is the reserve. What
 * the rival has queued shows only to a player who reads him. @param {any} f */
function left(f){ const d=state.duel; return state.phase!=='plan'||(f===d.f[1]&&tells(d,0).level<1)?f.sta:f.sta-f.spent; }

/** Copy the engine's numbers onto the fight HUD. */
function sync(){
  const d=state.duel; if(!d) return;
  d.f.forEach((/** @type {any} */ f,/** @type {0|1} */ side)=>setCardVitals(side,{hp:f.hp,hpMax:f.hpMax,sta:left(f),staShow:f.sta,staMax:f.staMax,staCap:state.base[side],stun:f.stun,perfects:f.perfects,wounds:f.inj}));
}

/** One simulation tick of the skill fight (from sparUpdate, outside hitstop). */
export function cardTick(){
  const S=state, d=S.duel; if(!d) return;
  bars(); pinMenu();
  if(spar.SP.phase==='ko'||spar.SP.phase==='end'){   // the brawl is decided: keep what it broke, make room for the result
    settle();
    $('cardHud').hidden=true; return;
  }
  if(spar.SP.phase!=='fight') return;
  if($('cardHud').classList.contains('intro')) render();   // the menu comes up only once the brawl is on, never over the room
  if(S.phase==='plan'){ drift(); return; }
  if(S.phase!=='reveal') return;
  S.t++;
  qteTick();
  while(S.script.length&&S.script[0].t<=S.t) /** @type {{fn:() => void}} */ (S.script.shift()).fn();
  if(S.script.length||S.qte) return;
  if(S.gather>0){ S.gather--; if(!inPlace()){ drift(); return; } S.gather=0; }   // walk back into range before the first blow (at most 1,5 s)
  if(!settled()) return;
  if(S.wait>0){ S.wait--; return; }
  if(d.phase==='fight') playBlow();
  else if(d.phase==='plan') nextTurn();
  else if(d.phase==='over'&&spar.SP.phase==='fight') cardFinish(d.winner,d.end==='czas'||d.end==='remis'?'CZAS':d.end==='nokdaun'?'TKO':'KO');
}

/** Both fighters stand still (or lie on the boards) and no reaction is pending. */
function settled(){
  return spar.FIG.every((/** @type {any} */ F)=>F.pendHit<0&&(F.st===anim.IDLE||F.st===anim.S_BLOCK||F.down||F.ko));
}
/** Where the fighters stand for the distance of the engine: Blisko or Daleko. */
function target(){ return state.duel?.close?6:1; }
/** A walking step is about 5 px, so ±3 is in place. */
function inPlace(){ return spar.FIG.every((/** @type {any} */ F)=>Math.abs(F.effPos-target())<=3); }
/** Idle fighters walk to their distance. */
function drift(){
  spar.FIG.forEach((/** @type {any} */ F,/** @type {0|1} */ side)=>{
    if(F.st!==anim.IDLE||F.down||F.ko||F.pendHit>=0) return;
    const gap=F.effPos-target();
    if(gap<-3) cardAct(side,anim.M_WALKF); else if(gap>3) cardAct(side,anim.M_WALKB);
  });
}

/** Finish planning: both queues go onto one clock and the exchange starts. */
function endTurn(){
  const S=state, d=S.duel;
  if(!d||S.phase!=='plan'||spar.SP.phase!=='fight') return;
  const ev=startExchange(d,S.rng);
  S.shown=d.blows.map((/** @type {any} */ b)=>({side:b.side,card:b.card,hit:b.hit,idx:b.idx,start:b.start,t:b.t,res:''}));
  S.phase='reveal'; S.script=[]; S.t=0; S.wait=10; S.gather=90;
  S.log=d.blows.length?'Wymiana.':'Nikt nie bije. '+describe(ev);
  sync(); render();
}

/** After the last blow: the rival lays his next queue. */
function nextTurn(){
  const S=state, d=S.duel;
  S.phase='plan'; S.sel=0; S.shown=[];
  aiPlan(d,1,S.rng); rig(); sync();
  S.log='Tura '+d.turn+'. '+S.log; render();
}

/** Mark what became of a blow on the timeline. @param {any} b @param {string} res */
function mark(b,res){ const x=state.shown.find(s=>s.side===b.side&&s.idx===b.idx&&s.hit===b.hit); if(x) x.res=res; else if(b.bonus) state.shown.push({side:b.side,card:b.card,hit:0,idx:b.idx,start:b.t,t:b.t,res,bonus:true}); }

/**
 * Resolve the next blow and turn it into a script of moves on the fight clock. A rival punch is played live: it starts,
 * a ring closes on the player's head, and Q (dodge) or E (parry) — or the impact — decides the reaction before the engine
 * resolves the blow. The player's own punch meets the AI's block at once and gets a ring for XP only.
 */
function playBlow(){
  const S=state, d=S.duel, b=nextBlow(d); if(!b) return;
  S.t=0;
  if(b.side===1&&CARDS[b.card].kind!=='trik') liveDefence(b);
  else {
    const hp=d.f.map((/** @type {any} */ f)=>f.hp), stun=d.f.map((/** @type {any} */ f)=>f.stun);
    const react=b.side===0?aiReaction(d,S.rng):{kind:/** @type {'none'} */ ('none'),grade:/** @type {'late'} */ ('late')};
    const ev=resolveBlow(d,react,S.rng);
    const {sc,atk}=buildScript(ev,b,react,hp,stun,{t0:4,skipFirst:false});
    S.script=sc; afterResolve(b,ev);
    if(b.side===0&&!S.auto&&atk&&atk.t!==undefined){
      const tgt=atk.t+atk.apex, lag=Math.max(0,RING+2-tgt);
      for(const x of S.script) x.t+=lag;
      S.qte={kind:'atak',side:1,start:tgt+lag-RING,target:tgt+lag,done:false,
        press:(/** @type {string} */ _k,/** @type {string} */ g)=>{ if(g==='perfect') notePerfect(d,0); }};
    }
  }
  render();
}

/** Log, wait and the count after the engine has resolved a blow. @param {any} b @param {any[]} ev */
function afterResolve(b,ev){
  const S=state, d=S.duel, nb=nextBlow(d);
  S.wait=nb&&nb.side===b.side&&nb.idx===b.idx?4:14;   // the punches of one combination follow each other closely
  S.log=describe(ev);
  if(d.phase!=='getup') return;
  const side=d.down, end=Math.max(S.t,S.script.at(-1)?.t||0)+50;
  S.script.push({t:end,fn:()=>startCount(side)});
}

/** A rival punch: it is on its way and the outcome waits for the player's reaction. @param {any} b */
function liveDefence(b){
  const S=state, d=S.duel, pid=moveOf(b.use), apex=apexT(pid,1)-1, tgt=RING+4;   /* −1: the punch lands a tick after the ring closes, so a press on it is in time */
  /** @type {any} */ const pend={};
  const settle=(/** @type {'none'|'dodge'|'parry'} */ kind,/** @type {any} */ g)=>{
    if(!pend.resolve) return pend;
    pend.resolve=null;
    if(S.qte&&!S.qte.done) Object.assign(S.qte,{done:true,grade:'late',label:'bez obrony',flash:20});   // the punch came first
    const hp=d.f.map((/** @type {any} */ f)=>f.hp), stun=d.f.map((/** @type {any} */ f)=>f.stun), react={kind,grade:g};
    const ev=resolveBlow(d,react,S.rng);
    const {sc,atk}=buildScript(ev,b,react,hp,stun,{t0:Math.max(0,tgt-apex),skipFirst:true});
    const [mv,lowG]=defenceMove(react,b.use,b.low);
    if(mv>=0) cardAct(0,mv,{guardLow:lowG,hold:24});
    Object.assign(pend,atk?atk.out:{kind:'whiff'});
    S.script.push(...sc); S.script.sort((x,y)=>x.t-y.t);
    afterResolve(b,ev); sync(); render();
    return pend;
  };
  pend.resolve=()=>settle('none','late');   // the punch landed before any press
  S.script=[{t:Math.max(1,tgt-apex),fn:()=>cardAct(1,pid,{low:b.low,out:pend})}];
  S.qte={kind:'obrona',side:0,start:tgt-RING,target:tgt,done:false,card:b.use,heavy:CARDS[b.card].heavy,press:settle};
}

/** The defence move a reaction shows: the guard (low for a body shot) for a parry, a duck under a hook, a slip from the rest.
 * @param {{kind:string}} react @param {string} atk @param {boolean} low @returns {[number,boolean]} move and low guard */
function defenceMove(react,atk,low){
  if(react.kind==='parry') return [anim.S_BLOCK,low];
  if(react.kind==='dodge') return (CARDS[atk]?.as||atk)==='hook'?[anim.M_DODGE,false]:[atk==='jab'?anim.M_SLIPR:anim.M_SLIPL,false];
  return [-1,false];
}
/** Ticks from the start of a punch to its impact at the fighter's current speed. Key events fire at the start of the
 * frame that reaches them (sparring's frame loop), so the impact comes on the first tick of that frame.
 * @param {number} pid @param {0|1} side */
function apexT(pid,side){ const m=anim.MOVES[pid], fr=m.fr||5, frame=Math.max(0,Math.ceil(m.times[m.apex]/fr)-1); return Math.ceil(frame*fr/Math.max(0.3,sparMoveSpeed(spar.FIG[side],pid))); }

/* ---------------------------------------------------------------- skill moments ------------------------------------ */

const GRADE_TEXT=/** @type {Record<string,string>} */ ({perfect:'CZYSTO!',good:'dobrze',late:'za późno',early:'za wcześnie'});

/** The player pressed a reaction key during the exchange: 'dodge' (Q), 'parry' (E) or 'atak' (Spacja on his own punch).
 * @param {'dodge'|'parry'|'atak'} kind */
function qtePress(kind){
  const S=state, q=S.qte; if(!q||q.done) return;
  if(q.kind==='wstan'){ countPress(); return; }
  if(S.t<q.start-4) return;   // the ring is not up yet
  if(q.kind==='atak'&&kind!=='atak') return;
  const dt=S.t-q.target;
  /** @type {string} */ let g;
  if(q.kind==='obrona'){
    if(kind==='atak') kind='dodge';
    const w=reactWindow(S.duel,0,kind,q.card), a=Math.abs(dt);
    g=S.auto?(kind==='dodge'?'good':'late'):a<=w.clean?'perfect':a<=w.ok?'good':'late';
  } else { const a=Math.abs(dt); g=a<=4?'perfect':a<=GOOD?'good':'late'; }
  q.grade=g; q.label=(q.kind==='obrona'?REACT_PL[kind]+' — ':'')+(S.auto&&q.kind==='obrona'?(kind==='dodge'?'unik':'blok'):GRADE_TEXT[g==='late'&&dt<0?'early':g]); q.done=true; q.flash=24;
  q.press(kind,g); sync(); qteDraw();
}

/** Per tick: the ring closes, a missed ring fades, the count goes on. */
function qteTick(){
  const S=state, q=S.qte; if(!q) return;
  if(q.kind==='wstan'){ countTick(); qteDraw(); return; }
  if(!q.done&&S.t>q.target+GOOD){ q.done=true; q.grade='late'; q.label=q.kind==='obrona'?'bez obrony':GRADE_TEXT.late; q.flash=20; if(q.kind==='obrona') q.press('none','late'); }
  if(q.done&&!(--q.flash>0)) S.qte=null;
  qteDraw();
}

/** After a knockdown: the count, and for the player the get-up moment (three presses inside the zone). @param {0|1} side */
function startCount(side){
  const S=state, d=S.duel, f=d.f[side], i=f.inj;
  const head=(i.concussion?1:0)+(i.nose?1:0)+(i.eyeL||i.eyeR?1:0)+(i.cuts>=2?1:0);
  const zone=Math.max(0.12,0.36-0.08*(f.knockdowns-1)-0.06*head+(has(f,'rise')?0.08:0));
  if(side===1||S.auto){
    const up=side===0||S.rng()<(f.inj.concussion?0.45:0.7);
    S.script.push({t:S.t+(up?150:COUNT_T*10),fn:()=>finishCount(side,up)});
    return;
  }
  S.qte={kind:'wstan',side:0,count:0,got:0,zone,t0:S.t,pos:0.5,done:false,label:''}; qteDraw();
}
function countTick(){
  const S=state, q=S.qte, k=S.t-q.t0;
  q.pos=0.5+0.5*Math.sin(k/9);   // the marker sways like the floor under a knocked-down man
  if(q.flash>0) q.flash--;
  if(k>0&&k%COUNT_T===0){ q.count++; if(q.count>=10){ S.qte=null; finishCount(0,false); } }
}
function countPress(){
  const q=state.qte, inZone=Math.abs(q.pos-0.5)<=q.zone/2;
  if(inZone){ q.got++; q.label='na nogi '+q.got+'/'+GETUP_NEED; } else q.label='nogi uciekają';
  q.flash=14;
  if(q.got>=GETUP_NEED){ state.qte=null; finishCount(0,true); }
}
/** @param {0|1} side @param {boolean} up */
function finishCount(side,up){
  const S=state, d=S.duel, e=getUp(d,up,S.rng);
  if(up) cardGetUp(side);
  for(const x of e) if(x.t==='ko') cardFinish(x.side,'KO');
  S.log=up?(side===0?'Wstajesz. ':'Rywal wstaje. ')+describe(e):(side===0?'Zostajesz na deskach.':'Rywal zostaje na deskach.');
  sync(); render(); qteDraw();
}

/** Draw the ring over a head, or the count bar. */
function qteDraw(){
  const el=$('khQte'), q=state.qte;
  $('khReact').hidden=!(q&&q.kind==='obrona'&&!q.done);
  if(!q){ el.hidden=true; return; }
  el.hidden=false;
  if(q.kind==='wstan'){
    el.className='kh-qte count';
    el.innerHTML='<b>'+(q.count+1)+'</b><div class="kh-count-bar"><i class="zone" style="left:'+((0.5-q.zone/2)*100)+'%;width:'+(q.zone*100)+'%"></i><i class="mark" style="left:'+(q.pos*100)+'%"></i></div>'+
      '<small>'+(q.flash>0&&q.label?q.label:'Spacja w strefie — wstań ('+q.got+'/'+GETUP_NEED+')')+'</small>';
    return;
  }
  const [x,y]=headPx(q.side), left=Math.max(0,(q.target-state.t)/RING);
  el.className='kh-qte ring'+(q.done?' done '+q.grade:'')+(q.kind==='obrona'?' def':'')+(q.heavy?' heavy':'');
  el.style.left=x+'px'; el.style.top=y+'px';
  el.innerHTML='<i class="target"></i><i class="closing" style="transform:translate(-50%,-50%) scale('+(1+2.2*left).toFixed(3)+')"></i>'+
    '<small>'+(q.done?q.label:q.kind==='obrona'?(q.heavy?'CIĘŻKI · ':'')+'Q unik · E parowanie':'Spacja — w czas')+'</small>';
}
/** A fighter's head in CSS pixels of the stage, through the fight camera. @param {0|1} side @returns {[number,number]} */
function headPx(side){
  const cv=/** @type {HTMLCanvasElement} */ ($('screen')), k=cv.clientWidth/cv.width, [hx,hy]=fighterHead(side);
  return [(renderer.vx+hx*renderer.vs)*k,(renderer.vy+(hy+3)*renderer.vs)*k];
}

/**
 * Engine events of one blow → moves on the fight clock: the punch with its outcome, the reaction timed to meet it, the
 * captions of tricks and turn ends.
 * @param {any[]} ev @param {any} b the blow @param {{kind:string,grade:string}} react @param {number[]} hp @param {number[]} stun
 * @param {{t0:number,skipFirst:boolean}} o  start tick; skipFirst: the punch is already on its way (a live rival punch)
 * @returns {{sc:{t:number,fn:() => void}[],atk:any}}
 */
function buildScript(ev,b,react,hp,stun,o){
  /** @type {{t:number,fn:() => void}[]} */
  const sc=[]; const at=(/** @type {number} */ t,/** @type {() => void} */ fn)=>sc.push({t,fn});
  /** @type {any} */ let atk=null; /** @type {any} */ let end=null;
  const D=/** @type {0|1} */ (1-b.side);
  for(const e of ev){
    if(e.t==='hit'||e.t==='whiff'){
      atk={side:e.side,card:e.card,low:!!e.low,out:{kind:e.t,tag:e.tag,dmg:e.dmg||0,low:!!e.low,level:e.level||0}};
      if(e.t==='hit'){ hp[D]-=e.dmg; stun[D]+=e.stun; atk.out.hp=hp[D]; atk.out.stun=stun[D]; }
      mark(b,e.t==='hit'?(e.tag==='blok'?'blok':'trafia'):'pudło');
    } else if(e.t==='dodge'||e.t==='parry'){ atk={side:b.side,card:b.use,low:b.low,out:{kind:e.t,low:b.low}}; mark(b,e.t==='parry'?'parowanie':'unik'); }
    else if(e.t==='fizzle'||e.t==='przelot'||e.t==='skurcz'){ for(const x of state.shown) if(x.side===(e.t==='przelot'?b.side:D)&&x.card===e.card&&!x.res&&x.t>b.t){ x.res='przepada'; } }
    if(e.t==='ko'){ if(atk&&e.side===atk.side&&(e.tag==='ko'||e.tag==='nokdaun')){ atk.out.ko=true; atk.out.how=e.tag==='nokdaun'?'TKO':b.card==='cyna'?'KASTET':'KO'; } else end=e; }
    else if(!atk) continue;
    else if(e.t==='open'&&e.side!==atk.side) atk.out.open=e.level;
    else if(e.t==='przelot') atk.out.przelot=true;
    else if(e.t==='knockdown') atk.out.kd=true;
    else if(e.t==='zadyszka') atk.out.zadyszka=true;
    else if(e.t==='skurcz') atk.out.skurcz=true;
    else if(e.t==='wound') atk.out.mroczki=true;
    else if(e.t==='injury'&&e.side!==atk.side) (atk.out.injuries||=[]).push(e.injury);
    else if(e.t==='injury') (atk.out.selfInjuries||=[]).push(e.injury);   // a knuckle breaking on the block
    else if(e.t==='handpain') hp[atk.side]-=1;
    else if(e.t==='reflect') hp[atk.side]-=e.dmg;   // Kolczasta garda
  }
  let t=o.t0;
  for(const e of ev){
    if(e.t==='sand') at(t,()=>{ cardAct(e.side,anim.M_SHOVE); cardCaption(/** @type {0|1} */ (1-e.side),spar.T_SAND); });
    else if(e.t==='thumb') at(t,()=>{ cardAct(e.side,anim.M_SHOVE); cardAct(/** @type {0|1} */ (1-e.side),anim.S_HITJ); cardCaption(/** @type {0|1} */ (1-e.side),spar.T_THUMB); });
    else if(e.t==='waste') at(t,()=>{ cardAct(e.side,anim.M_SHOVE); cardAct(/** @type {0|1} */ (1-e.side),anim.M_DODGE); });
    else if(e.t==='fizzle'&&e.tag==='odepchniety') at(t+20,()=>cardCaption(e.side,spar.T_SHOVE));
    else if(e.t==='fizzle'&&e.tag==='zamach przerwany') at(t+20,()=>cardCaption(e.side,spar.T_CARD+5));
    else if(e.t==='gain') at(t+20,()=>cardCaption(e.side,spar.T_CARD+20,10));
    else if(e.t==='broken') at(t+20,()=>cardCaption(e.side,spar.T_BROKEN));
    else if(e.t==='burst') at(t+20,()=>cardCaption(e.side,spar.T_BURST));
    else if(e.t==='rage') at(t+20,()=>cardCaption(e.side,spar.T_RAGE));
    if(e.t==='sand'||e.t==='thumb'||e.t==='waste') mark(b,e.t==='waste'?'unik':'trafia');
  }
  if(atk){
    const pid=moveOf(atk.card), apex=apexT(pid,atk.side);
    atk.t=t; atk.apex=apex;
    if(!o.skipFirst){
      const [mv,lowG]=defenceMove(react,atk.card,atk.low);
      if(mv===anim.S_BLOCK) at(t,()=>cardAct(D,mv,{guardLow:lowG,hold:apex+18}));
      else if(mv>=0) at(t+Math.max(0,apex-(mv===anim.M_DODGE?6:5)),()=>cardAct(D,mv));
      at(t,()=>cardAct(atk.side,pid,{low:atk.low,out:atk.out}));
    }
    t+=apex+(atk.out.kd||atk.out.ko?30:16);
  } else t+=24;
  if(end) at(t+20,()=>cardFinish(end.tag==='remis'?-1:end.side,end.tag==='czas'||end.tag==='remis'?'CZAS':'KO'));
  at(t,()=>{ sync(); render(); });
  return {sc:sc.sort((x,y)=>x.t-y.t),atk};
}

/** One line about the blow for the log. @param {any[]} ev */
function describe(ev){
  const who=(/** @type {number} */ s)=>s===0?'Ty':'Rywal', name=(/** @type {string} */ id)=>CARDS[id]?.name.toLowerCase()||id, out=[];
  const TAG=/** @type {Record<string,string>} */ ({czysto:'czysto',blok:'w blok',przebicie:'przez blok',odsloniety:'ODSŁONIĘTY — spóźniony unik',kastet:'KASTET Z ŁYŻKI'});
  for(const e of ev){
    if(e.t==='hit') out.push(who(e.side)+': '+name(e.card)+(CARDS[e.card]?.low?'':'')+' — '+(TAG[e.tag]||e.tag)+', −'+e.dmg+(e.level?' (Otwarcie '+ROMAN[e.level-1]+')':''));
    else if(e.t==='dodge') out.push(who(e.side)+': unik'+(e.grade==='perfect'?' — czysto!':''));
    else if(e.t==='parry') out.push(who(e.side)+': parowanie'+(e.grade==='perfect'?' — czysto!':''));
    else if(e.t==='open') out.push((e.side===0?'Masz':'Rywal ma')+' Otwarcie '+ROMAN[e.level-1]);
    else if(e.t==='przelot') out.push(who(e.side)+' przelatuje za ciosem'+(e.card?' — '+name(e.card)+' przepada':''));
    else if(e.t==='fizzle') out.push(who(e.side)+': '+name(e.card)+' — '+(e.tag||'przepada'));
    else if(e.t==='skurcz') out.push(who(e.side)+': skurcz — '+name(e.card)+' przepada');
    else if(e.t==='waste') out.push(who(e.side)+': '+name(e.card)+' w pustkę');
    else if(e.t==='legs') out.push(who(e.side)+': ciężkie nogi — trudniej o unik');
    else if(e.t==='zadyszka') out.push(who(e.side)+': zadyszka, następna tura −'+e.level+' kondycji');
    else if(e.t==='guard') out.push(who(e.side)+': rozbita garda — blok trzyma najwyżej 40%');
    else if(e.t==='slow') out.push(who(e.side)+': ciężkie nogi — reszta ciosów o tempo później');
    else if(e.t==='push') out.push(who(e.side)+': odepchnięty — '+name(e.card)+' znów robi krok');
    else if(e.t==='reflect') out.push(who(e.side)+': kolczasta garda — '+e.dmg+' wraca do atakującego');
    else if(e.t==='bent') out.push(who(e.side)+': zgięty — następny cios w głowę bez bloku');
    else if(e.t==='debt'&&e.side===0) out.push('obrona: −1 kondycji w następnej turze');
    else if(e.t==='gain') out.push(who(e.side)+': +'+e.level+' kondycji w następnej turze');
    else if(e.t==='reserve') out.push(who(e.side)+' oszczędzał siły: zaczyna następną wymianę');
    else if(e.t==='lock') out.push(who(e.side)+': ogłuszony, −'+e.level+' kondycji');
    else if(e.t==='injury') out.push(who(e.side)+': '+(INJURY[e.injury]||e.injury)+'!');
    else if(e.t==='knockdown') out.push(who(e.side)+' na deskach!');
    else if(e.t==='whiff') out.push(who(e.side)+': pudło'+(e.tag==='szczęście'?' — szczęśliwy unik':''));
    else if(e.t==='sand') out.push(who(e.side)+': piach w oczy!');
    else if(e.t==='thumb') out.push(who(e.side)+': kciuk w oko!');
    else if(e.t==='broken') out.push(who(e.side)+' złamany!');
    else if(e.t==='burst') out.push(who(e.side)+': Wybuch — rywal ogłuszony');
    else if(e.t==='rage') out.push(who(e.side)+': SZAŁ!');
    else if(e.t==='bleed') out.push(who(e.side)+': krwawi, −1');
  }
  return out.join(' · ');
}

/* ---------------------------------------------------------------- input -------------------------------------------- */

/** Queue a skill of the set (by its place in the menu). @param {number} k */
function pick(k){
  const S=state, d=S.duel; if(!d||S.phase!=='plan'||spar.SP.phase!=='fight') return;
  const id=d.f[0].skills[k]; if(!id) return;
  const r=queueSkill(d,0,id);
  S.log=r?REASON[r]??r:'';
  sync(); render();
}
/** Take the last queued skill back (or the one at `idx`). @param {number} [idx] */
function take(idx){
  const S=state, d=S.duel; if(!d||S.phase!=='plan') return;
  unqueue(d,0,idx); S.log=''; sync(); render();
}
/** Strefa: once a brawl the whole rival queue shows. */
function zone(){
  const S=state, d=S.duel; if(!d||S.phase!=='plan') return;
  S.log=useZone(d,0)?'Strefa: widzisz wszystko, co rywal ułożył.':has(d.f[0],'the-zone')?'Strefa już była w tej walce.':'';
  if(S.log) render();
}
/** The menu bar under the selection: a skill or „Walcz” at the end. */
function activate(){ const d=state.duel; if(state.sel>=d.f[0].skills.length) endTurn(); else pick(state.sel); }

/** Keyboard in a skill fight. Returns true when the key was used. @param {KeyboardEvent} e @param {boolean} down */
export function cardKey(e,down){
  const S=state, d=S.duel; if(!d) return false;
  if(!down) return false;
  if(S.phase==='reveal'){
    const k=e.code==='KeyQ'||e.code==='ShiftLeft'||e.code==='ArrowLeft'?'dodge':e.code==='KeyE'||e.code==='KeyF'||e.code==='ArrowRight'?'parry':e.code==='Space'?'atak':'';
    if(k){ e.preventDefault(); qtePress(/** @type {'dodge'|'parry'|'atak'} */ (k)); return true; }
    return ['ArrowUp','ArrowDown','KeyS','KeyW','Enter','Backspace'].includes(e.code);
  }
  const n=d.f[0].skills.length+1;   // the skills and „Walcz” after them
  if(e.code==='ArrowUp'||e.code==='KeyW'){ e.preventDefault(); S.sel=(S.sel+n-1)%n; render(); return true; }
  if(e.code==='ArrowDown'||e.code==='KeyS'){ e.preventDefault(); S.sel=(S.sel+1)%n; render(); return true; }
  const digit=/^(Digit|Numpad)([1-9])$/.exec(e.code);
  if(digit){ e.preventDefault(); pick(+digit[2]-1); return true; }
  if(e.code==='Backspace'){ e.preventDefault(); take(); return true; }
  if(e.code==='KeyZ'){ e.preventDefault(); zone(); return true; }
  if(e.code==='Enter'){ e.preventDefault(); endTurn(); return true; }
  if(e.code==='Space'){ e.preventDefault(); activate(); return true; }
  return ['ArrowLeft','ArrowRight','KeyA','KeyD','KeyQ','KeyE','KeyR','KeyT'].includes(e.code);   // movement keys do nothing in a skill fight
}

/* ---------------------------------------------------------------- HUD ---------------------------------------------- */

/** @param {number} n @param {number} on @param {number} res @param {number} max */
function pips(n,on,res,max){ let s=''; for(let i=0;i<n;i++) s+='<i class="pip '+(i<on?'on':i<on+res?'res':i<max?'off':'lost')+'"></i>'; return s; }

/** @param {any} f */
function wounds(f){
  const i=f.inj, w=[];
  if(i.cuts) w.push('rozcięcia ×'+i.cuts); else if(i.scars) w.push('strup'+(i.scars>1?' ×'+i.scars:'')); if(i.eyeL) w.push('lewe oko'); if(i.eyeR) w.push('prawe oko'); if(i.nose) w.push('nos'); if(i.ribs) w.push('żebra ×'+i.ribs);
  if(i.handL) w.push('lewa kostka'); if(i.handR) w.push('prawa kostka'); if(i.concussion) w.push('wstrząs'); if(i.legs) w.push('wiotkie nogi');
  return w.join(', ');
}

/** Zamroczenie as seven notches: at seven the fighter goes down. @param {any} f */
function stunMeter(f){
  let s=''; for(let i=0;i<7;i++) s+='<i'+(i<f.stun?' class="on"':'')+'></i>';
  return '<span class="kh-v kh-stun" title="Zamroczenie — przy 7 nokdaun"><b>Zamroczenie</b>'+s+'</span>';
}

/** Kondycja: free points, points already queued, the ceiling; the debt the reactions took off the next turn.
 * @param {any} f @param {number} base */
function stamina(f,base){
  const free=Math.max(0,left(f)), n=Math.max(base,f.sta);
  return '<span class="kh-v"><b>Kondycja</b> '+pips(n,free,free<f.sta?Math.min(f.spent,f.sta-free):0,Math.max(f.staMax,f.sta))+' '+free+'/'+f.staMax+(state.phase==='plan'?'':' zapas')+
    (f.debt?' <em class="kh-debt" title="Obrony tej tury zabiorą tyle z następnej">−'+f.debt+' następna</em>':'')+
    (f.x.wind?' <em class="kh-debt" title="Zadyszka zabierze tyle z następnej tury">−'+f.x.wind+' zadyszka</em>':'')+'</span>';
}

/** What changes the fight now: an opening, the wounds. @param {any} f */
function tags(f){
  return (f.open?'<span class="kh-v kh-open"><b>Otwarcie</b> '+ROMAN[f.open-1]+'</span>':'')+
    (wounds(f)?'<span class="kh-v kh-wound"><b>Rany</b> '+wounds(f)+'</span>':'');
}

/** Health bars of both corners from the drawn fighters: they drop on the impact frame, the pale part follows slowly. */
function bars(){
  spar.FIG.forEach((/** @type {any} */ F,/** @type {number} */ side)=>{
    const el=$('khHp'+side), f=Math.max(0,F.hp)/F.hpMax, key=Math.round(F.hp)+'/'+F.hpMax+'/'+Math.round(F.hpShow);
    if(el.dataset.v===key) return;
    el.dataset.v=key; el.className='kh-hp'+(f<=0.25?' low':f<=0.5?' mid':'');
    /** @type {HTMLElement} */ (el.children[0]).style.width=(100*Math.max(0,F.hpShow)/F.hpMax).toFixed(1)+'%';
    /** @type {HTMLElement} */ (el.children[1]).style.width=(100*f).toFixed(1)+'%';
    el.children[2].textContent=Math.max(0,Math.round(F.hp))+'/'+F.hpMax;
  });
}

/** Which way from the player's fighter his menu hangs: behind his back, away from the rival (-1 left, 1 right). */
function menuSide(){ return fighterHead(0)[0]<fighterHead(1)[0]?-1:1; }

/** Pin the command menu beside the player's fighter through the camera; it eases after it, so a punch-in barely moves it. */
function pinMenu(){
  const el=$('khMenu'), cv=/** @type {HTMLCanvasElement} */ ($('screen'));
  if(!cv.width||!renderer.vs||el.hidden) return;
  const k=cv.clientWidth/cv.width, [hx,hy]=fighterHead(0), side=menuSide(), w=el.offsetWidth, h=el.offsetHeight;
  let x=(renderer.vx+(hx+side*14)*renderer.vs)*k, y=(renderer.vy+(hy-6)*renderer.vs)*k;
  if(side<0) x-=w;
  x=Math.max(8,Math.min(cv.clientWidth-w-8,x)); y=Math.max(70,Math.min(cv.clientHeight-h-90,y));
  const S=state;
  if(!S.pin) S.pin=[x,y]; else { S.pin[0]+=(x-S.pin[0])*0.12; S.pin[1]+=(y-S.pin[1])*0.12; }
  el.style.left=S.pin[0].toFixed(1)+'px'; el.style.top=S.pin[1].toFixed(1)+'px';
  el.classList.toggle('flip',side<0);   // stepping down away from the fighter
}

/** One brush-stroke bar of the menu. @param {string} key @param {string} inner @param {string} cls @param {string} attr */
function bar(key,inner,cls,attr){
  return '<button type="button" class="kh-bar'+cls+'"'+attr+'><kbd>'+key+'</kbd>'+inner+'</button>';
}

/** The command menu: the skills of the set as bars (name, cost, tempo, damage), „Walcz” at the end. @param {any} me */
function menu(me){
  const S=state, plan=S.phase==='plan';
  let out='<div class="kh-menu-head">'+stamina(me,S.base[0])+'</div>';
  me.skills.forEach((/** @type {string} */ id,/** @type {number} */ k)=>{
    const c=CARDS[id], cost=skillCost(me,id), why=canQueue(S.duel,0,id), n=me.queue.filter((/** @type {any} */ q)=>q.card===id).length;
    const stat=(c.dmg?c.dmg+(c.hits?'×'+c.hits:'')+' obr.':'trik')+' · tempo '+tempoOf(c)+(c.low?' · korpus':'')+(c.heavy?' · ciężki':'');
    out+=bar(String(k+1),skillIcon(ICON[id]||'shock')+'<span class="kh-bar-name">'+c.name+(n?' <em>×'+n+'</em>':'')+'</span><span class="kh-bar-cost">'+pips(cost,cost,0,cost)+'</span><small>'+stat+'</small>',
      (k===S.sel?' sel':'')+(why?' off':'')+(c.low?' low':'')+(c.heavy?' heavy':''),' style="--i:'+k+'" data-k="'+k+'" title="'+c.text.replace(/"/g,'&quot;')+'"'+(plan?'':' disabled'));
  });
  out+=bar('↵','<span class="kh-bar-name">Walcz</span><small>'+(me.queue.length?me.queue.length+' '+(me.queue.length===1?'ruch':me.queue.length<5?'ruchy':'ruchów'):'bez ciosów')+'</small>',
    ' go'+(S.sel>=me.skills.length?' sel':''),' style="--i:'+me.skills.length+'" data-go="1"'+(plan?'':' disabled'));
  return out;
}

/** The exchange timeline: both queues on one clock of tempo, the player below, the rival above. While planning the rival
 * shows only what the player reads of him. */
function timeline(){
  const S=state, d=S.duel, plan=S.phase==='plan', view=tells(d,0);
  const mine=plan?layBlows(d,0).map(b=>({...b,res:''})):S.shown.filter(x=>x.side===0);
  const his=plan?[]:S.shown.filter(x=>x.side===1);
  const cur=plan?null:nextBlow(d);
  const span=Math.max(6,...mine.map(b=>b.t),...his.map(b=>b.t));
  /** One block per move (a combination spans all its punches); a bonus punch is a block of one tempo. @param {any[]} list */
  const lane=list=>{
    /** @type {Map<string,any>} */ const groups=new Map();
    for(const b of list){ const k=b.side+':'+b.idx, g=groups.get(k); if(g){ g.t=Math.max(g.t,b.t); if(b.res) g.res=b.res; } else groups.set(k,{...b}); }
    return [...groups.values()].map(g=>{
      const c=CARDS[g.card], x=g.bonus?g.t-1:g.start, w=g.bonus?1:g.t-g.start, now=cur&&cur.side===g.side&&cur.idx===g.idx;
      return '<i class="kh-blow'+(c.heavy?' heavy':'')+(c.low?' low':'')+(now?' now':'')+(g.res?' r-'+g.res:'')+'" style="left:'+(100*x/span).toFixed(2)+'%;width:'+(100*Math.max(1,w)/span).toFixed(2)+'%">'+
        '<span>'+(g.bonus?'+ ':'')+c.name+'</span>'+(g.res?'<em>'+g.res+'</em>':'')+'</i>';
    }).join('');
  };
  let rival;
  if(plan){
    rival=view.level<1?'<span class="kh-hidden">rywal ukrywa plan</span>':
      '<span class="kh-hidden">'+view.count+' '+(view.count===1?'ruch':view.count<5?'ruchy':'ruchów')+' za '+view.spent+' kondycji'+(view.moves.length?': '+view.moves.map(m=>m.card?CARDS[m.card].name:m.heavy?'CIĘŻKI':'?').join(' · '):'')+'</span>';
  } else rival=lane(his);
  let ticks=''; for(let i=1;i<span;i++) ticks+='<b style="left:'+(100*i/span).toFixed(2)+'%"></b>';
  return '<div class="kh-lane kh-lane-r"><small>'+S.name+'</small><div class="kh-track">'+ticks+rival+'</div></div>'+
    '<div class="kh-lane kh-lane-me"><small>Ty</small><div class="kh-track">'+ticks+(mine.length?lane(mine):'<span class="kh-hidden">wybierz ciosy — tempo decyduje, kto trafi pierwszy</span>')+'</div></div>';
}

function render(){
  const S=state, d=S.duel; if(!d) return;
  const me=d.f[0], rv=d.f[1], plan=S.phase==='plan';
  $('cardHud').classList.toggle('reveal',!plan);
  $('cardHud').classList.toggle('intro',spar.SP.phase!=='fight');
  $('khRivalName').textContent=S.name;
  $('khRivalInfo').innerHTML=stunMeter(rv)+stamina(rv,S.base[1])+tags(rv);
  $('khStats').innerHTML=stunMeter(me)+tags(me);
  $('khEnergy').innerHTML='<span class="kh-v"><b>Tura</b> '+d.turn+(d.maxTurns?'/'+d.maxTurns:'')+'</span>'+(plan?'':stamina(me,S.base[0]));
  const m=$('khMenu'); m.hidden=!plan||spar.SP.phase!=='fight'; if(!m.hidden) m.innerHTML=menu(me);
  $('khTimeline').innerHTML=timeline();
  const zb=/** @type {HTMLButtonElement} */ ($('khZone')); zb.hidden=!has(me,'the-zone'); zb.disabled=!plan||!!me.x.zoneUsed;
  /** @type {HTMLButtonElement} */ ($('khUndo')).disabled=!plan||!me.queue.length;
  $('khLog').textContent=S.log;
  bars(); pinMenu();
}

/** Once the brawl is decided: keep what it broke, and what the rival learned of the player's habits. */
function settle(){
  const S=state, d=S.duel; if(!d||S.added) return;
  S.added=recordInjuries(d.f[0].inj);
  if(S.key) recordHabits(S.key,d.memory[1].map((/** @type {Record<string,number>} */ o,/** @type {number} */ i)=>{ const n=/** @type {Record<string,number>} */ ({}); for(const [k,v] of Object.entries(o)) if(v-(S.seen0[i]?.[k]||0)>0) n[k]=v-(S.seen0[i]?.[k]||0); return n; }));
}

/** The rigged fight (#6): once the player leads or the brawl drags on, Silas pulls the spoon from his sleeve first thing. */
function rig(){
  const S=state, d=S.duel; if(!S.rigged||S.rigFired||d.phase!=='plan') return;
  const me=d.f[0], rv=d.f[1];
  if(me.hp/me.hpMax-rv.hp/rv.hpMax<0.15&&d.turn<5) return;
  S.rigFired=true;
  if(!rv.skills.includes('cyna')) rv.skills.push('cyna');
  rv.queue.unshift({card:'cyna',cost:0});
}

/** Rows for the result card: what this brawl broke and what is still unhealed. */
export function cardResultRows(){
  const S=state; if(!S.duel) return '';
  settle();
  const now=progression.save.injuries.map(e=>LASTING[e.id].name);
  return (S.added.length?'<span>Nowe rany</span><span><b style="color:#ff6a5a">'+S.added.map(id=>LASTING[id].name).join(', ')+'</b></span>':'')+
    (now.length?'<span>Nosisz rany</span><span>'+[...new Set(now)].map(n=>n+(now.filter(x=>x===n).length>1?' ×'+now.filter(x=>x===n).length:'')).join(', ')+' — do wyleczenia</span>':'');
}

/** Auto: no timing in the skill moments (kept in this browser). @param {boolean} on */
function setAuto(on){
  state.auto=on; try{ localStorage.setItem('heavybag.cardauto',on?'1':'0'); }catch(e){}
  /** @type {HTMLInputElement} */ ($('optCardAuto')).checked=on;
}

/** Wire the HUD buttons once (main.js order: after the DOM exists). */
export function initialize(){
  $('khMenu').addEventListener('click',e=>{
    const b=/** @type {HTMLElement|null} */ (/** @type {HTMLElement} */ (e.target).closest('.kh-bar'));
    if(!b) return;
    if(b.dataset.go) endTurn(); else { state.sel=+(b.dataset.k||0); pick(state.sel); }
  });
  $('khTimeline').addEventListener('click',e=>{ if(/** @type {HTMLElement} */ (e.target).closest('.kh-lane-me .kh-blow')) take(); });
  $('khUndo').addEventListener('click',()=>take());
  $('khZone').addEventListener('click',()=>zone());
  $('khDodge').addEventListener('pointerdown',e=>{ e.preventDefault(); qtePress('dodge'); });
  $('khParry').addEventListener('pointerdown',e=>{ e.preventDefault(); qtePress('parry'); });
  $('khQte').addEventListener('pointerdown',e=>{ e.preventDefault(); qtePress(state.qte?.kind==='obrona'?'dodge':'atak'); });
  try{ state.auto=localStorage.getItem('heavybag.cardauto')==='1'; }catch(e){}
  const box=/** @type {HTMLInputElement} */ ($('optCardAuto')); box.checked=state.auto; box.addEventListener('change',()=>setAuto(box.checked));
}
