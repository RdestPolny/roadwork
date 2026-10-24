/* The treadwheel (KIERAT.md): the hero in the second stall of a shared wheel, the treads coming down past the chalk
   line one per beat. ←/→ step in turn; a step on the line is cheap, a step beside it dear, a missed one costs a tread
   of height. Held ↑ rests on the handrail while the warder's lantern is elsewhere; caught, he shouts or strikes, and the
   third time throws the man off. Every man who falls makes the wheel heavier. The last one on it wins and may stay on
   alone for a bonus. No sound: every cue is in the picture. Rules: treadwheel-rules.js; picture: treadwheel-scene.js. */

import { state as boxing, setGstate, shake } from './boxing.js';
import { state as renderer, setFramebuffer } from './renderer.js';
import { state as input, setInfo, inputNow } from './input.js';
import { leaveMode, setPanelMode, exitToHub } from './navigation.js';
import { state as progression, applyStats, resetSessXP, statShort } from './progression.js';
import { state as session, beginSession, sessionMetric, sessionOpen, sessionRunning, sessionParams, sessionRoundDone, sessionFail } from './training-session.js';
import { DRILLS, ROMAN } from './training-data.js';
import * as R from './treadwheel-rules.js';
import { buildWheelScene, wheelSceneTick, renderWheelScene } from './treadwheel-scene.js';

const DT = 1/60;
/** Outside a session (debug start) stage I applies. */
const FREE = DRILLS.kierat.stages[0];
/** The hero's stall and the number on his board. */
export const HERO_STALL = 1, HERO_NO = 17;

/**
 * @typedef {object} WheelRun
 * @property {(r:any)=>([string,string][]|void)} [onEnd]  Called once with the result; may return extra summary rows.
 * @property {any} [returnSt]  Station to come back to.
 * @property {boolean} [cobb]  Blind Cobb on duty: longer back turns, a slower lantern.
 * @property {number} [stage]
 * @property {boolean} [brief]  false: skip the board before the wheel (a retry).
 */

export const state = {
  on:false, /** @type {any} */ p:FREE, /** @type {WheelRun} */ o:{},
  /** intro (the board before the wheel) · run · choice (won: step off or stay) · alone · done */ phase:'run',
  t:0, ticks:0, pos:0, bpm:48, target:48, bells:0, bellT:0, nk:1, stopT:0, outs:0, alone:0, aloneT:0,
  /** @type {{k:number,t:number,foot:number,done:boolean}[]} */ beats:[],
  /** @type {{t:number,foot:number}|null} */ early:null,
  /** @type {{id:string,phase:string,t:number,dur:number}|null} */ ev:null, /** @type {{id:string,at:number}|null} */ evQ:null,
  /** @type {any} */ hero:null, /** @type {any[]} */ rivals:[], stalls:4,
  guard:{phase:'watch',t:0,sec:5,feint:false,beam:3,strike:0,shout:0,target:-1,knock:0},
  keys:{rest:false,down:false,touchRest:false}, downT:0, bellAnim:0, cobb:false,
  feedback:'', /** @type {[string,string][]} */ rows:[], /** @type {number[]} */ outOrder:[],
};

/** Stage parameters of the running session. */
function params(){ return sessionOpen()?sessionParams('kierat'):FREE; }
/** Seconds per beat now. */
function beatSec(){ return 60/Math.max(20,state.bpm); }
/** Wheel position where tread k's edge reaches the chalk line (the warped tread sits lower). @param {number} k */
export function crossAt(k){ return k+(state.p.events.includes('warp')&&k%R.TREADS===R.WARP_TREAD?R.WARP_SHIFT:0); }

/** Climb into the stall: the warder, the men beside you, the wheel starts. @param {WheelRun} [o] */
export function startTreadwheel(o={}){
  leaveMode(); setGstate('kierat'); applyStats(); resetSessXP();
  beginSession('kierat',{end:onSessionEnd,extra:summaryExtra,ownEsc:true,again:o.onEnd?undefined:()=>startTreadwheel({...o,brief:false})},o.stage);
  const p=params(), lv={str:progression.save.stats.str.lvl,spd:progression.save.stats.spd.lvl,end:progression.save.stats.end.lvl};
  const body=R.wheelBody(lv,{zm:progression.save.sim.zm,glod:progression.save.sim.glod});
  const n=p.rivals.length+1, free=[...Array(n).keys()].filter(k=>k!==HERO_STALL);
  Object.assign(state,{on:true,p,o,phase:o.brief===false?'run':'intro',t:0,ticks:0,pos:0,bpm:p.bpm[0],target:p.bpm[0],bells:0,bellT:0,nk:1,stopT:0,outs:0,alone:0,aloneT:0,
    beats:[],early:null,ev:null,evQ:null,stalls:n,downT:0,bellAnim:0,cobb:!!o.cobb,rows:[],outOrder:[],
    hero:{body,O:body.breath,C:body.grip,P:3,run:0,trance:false,resting:false,afterRest:false,lockT:0,caught:0,out:false,how:'',
      g:'',gT:0,slip:0,climbT:0,hitT:0,outT:0},
    rivals:p.rivals.map((/** @type {string} */ id,/** @type {number} */ k)=>Object.assign(R.makeRival(id,free[k]),{g:'',gT:0,slip:0,shoutT:0,outT:0})),
    guard:{phase:'watch',t:0,sec:3+Math.random()*2,feint:false,beam:n-1,strike:0,shout:0,target:-1,knock:0},
    keys:{rest:false,down:false,touchRest:false},
    feedback:'←/→ na zmianę, kiedy krawędź deski dochodzi do kredowej kreski. ↑ — oprzyj się, kiedy klucznik patrzy na ciebie, a jego latarnia gaśnie.'});
  buildWheelScene(n); document.body.classList.add('kierat'); setPanelMode(); setInfo();
  if(state.phase==='intro') showBrief();
}

/** The board before the wheel: the rules for this stage; the wheel stands until he climbs in. */
function showBrief(){
  const el=document.getElementById('wheelIntro'); if(!el) return;
  const b=R.wheelBrief(state.p,ROMAN[Math.max(0,DRILLS.kierat.stages.indexOf(state.p))],state.cobb);
  /** @type {HTMLElement} */ (document.getElementById('wiTitle')).textContent=b.title;
  /** @type {HTMLElement} */ (document.getElementById('wiLead')).textContent=b.lead;
  /** @type {HTMLElement} */ (document.getElementById('wiRows')).innerHTML=b.rows.map(([k,v])=>'<span>'+k+'</span><span>'+v+'</span>').join('');
  el.hidden=false; /** @type {HTMLElement} */ (document.getElementById('wiGo')).focus();
}

/** Off the board and onto the wheel. */
export function wheelGo(){
  const S=state; if(!S.on||S.phase!=='intro') return;
  S.phase='run'; wheelKeysOff(); hideBrief(); setInfo();
}

function hideBrief(){ const el=document.getElementById('wheelIntro'); if(el) el.hidden=true; }

/** Leave the wheel: release the keys. */
export function resetTreadwheel(){ state.on=false; hideBrief(); state.keys.rest=state.keys.down=state.keys.touchRest=false; document.body.classList.remove('kierat'); }

/** Where to come back to after the wheel. */
export function treadwheelReturn(){ return state.o?.returnSt||null; }

/** Can a step count now? */
function canStep(){ return state.on&&boxing.gstate==='kierat'&&!input.paused&&(!sessionOpen()||sessionRunning())&&(state.phase==='run'||state.phase==='alone')&&!state.hero.out; }

/* ---------- input ---------- */

/** Keys of the wheel. @param {KeyboardEvent} e @param {boolean} down */
export function wheelKey(e,down){
  const c=e.code, S=state;
  const foot=c==='ArrowLeft'||c==='KeyA'?0:c==='ArrowRight'||c==='KeyD'?1:-1;
  if(c==='ArrowUp'||c==='KeyW'||c==='ShiftLeft'||c==='ShiftRight'){ e.preventDefault(); S.keys.rest=down; return; }
  if(c==='ArrowDown'||c==='KeyS'){ e.preventDefault(); S.keys.down=down; if(!down) S.downT=0; return; }
  if(S.phase==='intro'){ if(!down||e.repeat) return;
    if(c==='Escape'){ e.preventDefault(); exitToHub(); }
    else if(c==='Enter'||c==='Space'||foot>=0){ e.preventDefault(); wheelGo(); }
    return; }
  if(!down||e.repeat) return;
  if(c==='Escape'){ e.preventDefault(); if(S.phase==='choice') stepOff(); else if(canStep()) heroOut('zszedł'); return; }
  if(foot<0) return;
  e.preventDefault();
  if(S.phase==='choice'){ if(foot===0) stepOff(); else stayOn(); return; }
  press(foot,inputNow());
}

/** Release held keys (menus, focus loss). */
export function wheelKeysOff(){ state.keys.rest=state.keys.down=state.keys.touchRest=false; state.downT=0; }

/** The next tread's predicted crossing time (ms), Infinity while the wheel stands. */
function nextCross(){
  const sp=speed(); if(sp<=0) return Infinity;
  return boxing.simNow+(crossAt(state.nk)-state.pos)/sp*1000;
}

/** A foot comes down. @param {number} foot 0 left, 1 right @param {number} t input time (ms) */
function press(foot,t){
  const S=state, H=S.hero;
  if(!canStep()||H.resting) return;
  if(H.P<=0){ climb(); return; }   // hanging: every step scrabbles for the tread
  let last=null; for(const b of S.beats) if(!b.done&&t-b.t<=R.WINDOW.off&&t>=b.t-R.WINDOW.off) last=b;
  const tn=nextCross(), dn=tn-t;
  if(last&&(!(dn<=R.WINDOW.off)||Math.abs(t-last.t)<=dn)){ judge(last,t-last.t,foot); return; }
  if(dn>=0&&dn<=R.WINDOW.off&&!S.early){ S.early={t,foot}; return; }
  if(H.P<3){ climb(); return; }
  step('off');   // a foot stamped between the treads: a stumble
  S.feedback='Potknięcie — noga między deskami.';
}

/** Judge a step against its beat. @param {{k:number,t:number,foot:number,done:boolean}} b @param {number} dt @param {number} foot */
function judge(b,dt,foot){
  const H=state.hero; b.done=true;
  let g=R.judgeStep(dt,R.windowScale(H.body.win,H.O/H.body.breath,H.afterRest))||'off';
  if(foot!==b.foot) g='off';
  if(H.O<=0&&g==='clean') g='good';
  H.afterRest=false;
  step(g);
  state.feedback=g==='clean'?(H.trance?'Koło idzie samo.':'Czysto.'):g==='good'?'Dobrze.':foot!==b.foot?'Ta sama noga — potknięcie.':dt<0?'Za wcześnie.':'Za późno.';
}

/** Pay for one step of the hero and count it. @param {string} g clean|good|off|miss */
function step(g){
  const S=state, H=S.hero, wind=S.ev?.id==='wind'&&S.ev.phase==='on'?1.3:1;
  H.run=g==='clean'?H.run+1:0; if(H.run>=R.TRANCE_AT) H.trance=true; if(g!=='clean') H.trance=false;
  const c=R.stepCost(g,{load:R.wheelLoad(S.outs)*wind,hunger:H.body.hunger,use:H.body.use,heavy:R.heavyMult(S.t),trance:H.trance,low:H.P<2.5});
  H.O=Math.max(0,Math.min(H.body.breath,H.O-c));
  if(g==='miss') H.P=Math.max(0,H.P-1);
  sessionMetric(g==='miss'?'missed':g); if(H.trance&&g==='clean') sessionMetric('trance');
  H.g=g; H.gT=20; if(g==='off'||g==='miss') H.slip=1;
}

/** A climbing step between the beats: a third of a tread back up, dearly bought. */
function climb(){
  const H=state.hero;
  H.P=Math.min(3,H.P+R.CLIMB_STEP); H.O=Math.max(0,H.O-R.CLIMB_COST*H.body.climb); H.climbT=10; H.trance=false; H.run=0;
  sessionMetric('climb'); state.feedback=H.P>=3?'Z powrotem na stopniu.':'Wdrapujesz się…';
}

/* ---------- the wheel ---------- */

/** Treads per second right now: the brake, a jam, a man being pulled out from under the treads. */
function speed(){
  const S=state; if(S.phase==='choice'||S.phase==='done'||S.stopT>0) return 0;
  const v=S.bpm/60, E=S.ev;
  if(E&&E.phase==='on'){ if(E.id==='brake') return v*0.5; if(E.id==='jam') return E.t<1.5*beatSec()?0:v*2; }
  return v;
}

/** A tempo change breaks every trance on the wheel. */
function breakTrance(){ state.hero.run=0; state.hero.trance=false; for(const r of state.rivals){ r.run=0; r.trance=false; } }

/** Bells, the brake let out, the events after them and their tells. */
function tempoTick(){
  const S=state, p=S.p;
  S.bellAnim=Math.max(0,S.bellAnim-DT);
  if((S.bellT+=DT)>=20){ S.bellT=0; S.bells++; S.bellAnim=1.2;
    S.target=S.phase==='alone'?S.target+4:R.bellTempo(p.bpm,S.bells); if(S.target!==S.bpm) breakTrance();
    const e=R.nextEvent(p.events,Math.random); if(e&&!S.evQ&&!S.ev) S.evQ={id:e,at:4+Math.random()*6}; }
  const rate=6/(4*beatSec());   /* the new tempo comes in over four beats */
  if(S.bpm<S.target) S.bpm=Math.min(S.target,S.bpm+rate*DT); else if(S.bpm>S.target) S.bpm=Math.max(S.target,S.bpm-rate*DT);
  if(S.evQ&&(S.evQ.at-=DT)<=0){ S.ev={id:S.evQ.id,phase:'tell',t:0,dur:S.evQ.id==='wind'?1.5:Math.max(0.8,1.2*beatSec())}; S.evQ=null; }
  const E=S.ev; if(!E) return;
  E.t+=DT;
  if(E.phase==='tell'&&E.t>=E.dur){ E.phase='on'; E.t=0; E.dur=E.id==='wind'?6:E.id==='brake'?2*2*beatSec():(1.5+1)*beatSec(); if(E.id!=='wind') breakTrance(); }
  else if(E.phase==='on'&&E.t>=E.dur) S.ev=null;
}

/** The warder's cycle and where his lantern points. */
function guardTick(){
  const S=state, G=S.guard, p=S.p, n=S.stalls;
  G.t+=DT; G.strike=Math.max(0,G.strike-DT); G.shout=Math.max(0,G.shout-DT); G.knock=Math.max(0,G.knock-DT);
  if(G.t>=G.sec){
    const away=S.phase==='alone'?p.away.map((/** @type {number} */ v)=>v*0.7):p.away;
    const nx=R.guardNext(G.feint&&G.phase==='turn'?'feint':G.phase,{away,warn:p.warn,watch:p.watch,fake:p.fake,cobb:S.cobb},Math.random);
    G.phase=nx.phase; G.sec=nx.sec; G.feint=!!nx.feint; G.t=0;
  }
  G.beam=G.phase==='watch'?R.beamAt(G.t,n,p.beam*(S.cobb?0.75:1)):G.phase==='back'?n-1+1.6*(1-G.t/G.sec):n+3;
  if(p.events.includes('knock')&&G.phase==='watch'&&G.knock<=0&&Math.random()<DT*0.9) G.knock=0.25;   /* his stick on the rail, off the beat on purpose */
}

/** Is a stall in the lantern now? @param {number} stall */
function lit(stall){ const G=state.guard; return (G.phase==='watch'||G.phase==='back')&&R.beamOn(G.beam,stall)>0.5; }

/** A tread's edge reaches the chalk line. @param {number} k @param {number} t crossing time (ms) */
function crossBeat(k,t){
  const S=state, H=S.hero, b={k,t,foot:k&1,done:false};
  S.beats.push(b);
  if(S.early){ const e=S.early; S.early=null; if(t-e.t<=R.WINDOW.off) judge(b,e.t-t,e.foot); }
  if(!b.done&&(H.resting||H.P<=0||H.out||S.phase==='choice')) b.done=true;   // on the rail or hanging: the treads go by under him
  if(!H.out&&!H.resting&&H.O<=0) H.P=Math.max(0,H.P-0.5);                  // no breath left: the wheel takes him down
  const E=S.ev, ctx={load:R.wheelLoad(S.outs)*(E?.id==='wind'&&E.phase==='on'?1.3:1),heavy:R.heavyMult(S.t),event:E&&E.phase==='on'?E.id:'',warp:crossAt(k)!==k};
  for(const r of S.rivals){ if(r.out) continue; const g=R.rivalBeat(r,ctx,Math.random); if(g){ r.g=g; r.gT=20; if(g==='off'||g==='miss') r.slip=1; } }
}

/** A beat went by without a step. @param {{done:boolean}} b */
function missBeat(b){ b.done=true; step('miss'); state.feedback='Noga zjechała — stopień niżej.'; }

/** The hero's hands: the rail, hanging, the lantern. */
function heroTick(){
  const S=state, H=S.hero; if(H.out) return;
  H.gT=Math.max(0,H.gT-1); H.slip=Math.max(0,H.slip-0.06); H.climbT=Math.max(0,H.climbT-1); H.hitT=Math.max(0,H.hitT-DT); H.lockT=Math.max(0,H.lockT-DT);
  const want=(S.keys.rest||S.keys.touchRest)&&H.lockT<=0&&S.phase!=='choice';
  if(want&&!H.resting&&H.P>0&&H.C>2){ H.resting=true; H.trance=false; H.run=0; S.early=null; S.feedback='Na poręczy. Oczy na latarni.'; }
  if(H.resting&&(!want||H.C<=0)){ H.resting=false; H.afterRest=true; S.feedback=H.C<=0?'Ręce puszczają — wracaj do rytmu.':'Z powrotem w rytm.'; }
  if(H.resting){ H.O=Math.min(H.body.breath,H.O+R.REST_GAIN*H.body.regen*DT); H.C=Math.max(0,H.C-R.REST_GRIP*DT); sessionMetric('rest'); }
  else if(H.P<=0){ H.C=Math.max(0,H.C-R.HANG_GRIP*DT); if(H.C<=0){ heroOut('spadł'); return; } }
  else H.C=Math.min(H.body.grip,H.C+R.GRIP_BACK*DT);
  if(H.resting&&lit(HERO_STALL)) caught();
  if(S.keys.down){ if((S.downT+=DT)>=1) heroOut('zszedł'); }
}

/** The lantern finds him on the rail. */
function caught(){
  const S=state, H=S.hero, G=S.guard;
  H.caught++; sessionMetric('caught'); H.resting=false; H.afterRest=true; G.target=HERO_STALL; H.hitT=0.6;
  H.O=Math.max(0,H.O-(R.CAUGHT[H.caught-1]??0));
  if(H.caught===1){ G.shout=1; S.feedback='„Ręce z poręczy, Siedemnasty!” Oddech uciekł.'; shake(1,8,0); }
  else if(H.caught===2){ G.strike=0.6; H.P=Math.max(0,H.P-1); H.lockT=1; S.feedback='Kij po palcach. Jeszcze raz — i zlatujesz z koła.'; shake(2,12,0); }
  else { G.strike=0.8; S.feedback='„Precz z koła!” Klucznik ściąga cię za kołnierz.'; shake(3,16,0); heroOut('zrzucony'); }
  setInfo();
}

/** The rivals: hands each tick, out when grip or the warder says so. */
function rivalsTick(){
  const S=state, G=S.guard;
  for(const r of S.rivals){
    r.gT=Math.max(0,r.gT-1); r.slip=Math.max(0,r.slip-0.06); r.shoutT=Math.max(0,r.shoutT-DT);
    if(r.out) continue;
    if(R.rivalHands(r,{dt:DT,beam:G.beam,phase:G.phase},Math.random)){ r.shoutT=0.8; G.target=r.stall; if(r.caught>=2) G.strike=0.6; else G.shout=1; }
    const how=R.rivalDone(r);
    if(how){ r.out=true; r.how=how; r.outAt=S.t; r.outT=0; S.outs++; S.outOrder.push(r.stall); S.stopT=2*beatSec(); breakTrance();
      S.feedback=r.def.name+(how==='thrown'?' zrzucony z koła przez klucznika.':' spada z koła. Koło staje — i rusza cięższe.'); setInfo(); }
  }
  if(S.phase==='run'&&!S.hero.out&&S.rivals.every(r=>r.out)) won();
}

/** Nobody left beside him: the warder points the stick at the steps down. */
function won(){
  const S=state; S.phase='choice'; S.hero.resting=false; sessionMetric('won');
  S.feedback='Sam na kole. ← zejdź · → zostań po premię (koło cięższe, latarnia częściej).'; setInfo();
}
/** Take the win and climb down. */
function stepOff(){ if(state.phase==='choice'){ state.hero.how='zszedł'; finish(); } }
/** Stay on alone for the bonus. */
function stayOn(){ const S=state; if(S.phase!=='choice') return; S.phase='alone'; S.target=S.bpm+4; S.bellT=0; S.feedback='Sam. Wszyscy z ławki patrzą.'; setInfo(); }

/** The hero is off the wheel. @param {string} how spadł | zszedł | zrzucony */
function heroOut(how){
  const S=state, H=S.hero; if(H.out) return;
  H.out=true; H.how=how; H.resting=false; H.outT=0;
  if(how==='spadł') shake(3,14,1);
  finish();
}

/** Score the session: place, time, the bonus alone; thrown off fails it. */
function finish(){
  const S=state, H=S.hero; if(S.phase==='done') return;
  const won=S.phase==='choice'||S.phase==='alone', left=S.rivals.filter(r=>!r.out).length;
  S.phase='done';
  sessionMetric('field',S.stalls); sessionMetric('place',won?1:left+1); sessionMetric('sec',Math.round(S.t));
  if(H.how==='zrzucony') sessionFail('zrzucony z koła'); else sessionRoundDone();
}

/** The session is scored: tell the owner (the prison day), keep its summary rows. */
function onSessionEnd(){
  const S=state, H=S.hero, m={won:S.rivals.every(r=>r.out)&&H.how!=='zrzucony',place:0,field:S.stalls,how:H.how,alone:S.alone,caught:H.caught,sec:S.t,
    strongBeaten:S.rivals.filter(r=>r.out&&R.rivalStars(r.def.rank)>=2).length,fell:H.how==='spadł',firstOff:false,stage:session.S?.stage||1};
  m.place=m.won?1:S.rivals.filter(r=>!r.out).length+1;
  m.firstOff=!m.won&&S.outOrder.length===0;
  S.rows=(S.o.onEnd?.(m))||[];
}

/** Extra summary rows. @param {any} r */
function summaryExtra(r){
  const S=state, H=S.hero, m=r.metrics||{}, steps=(m.clean||0)+(m.good||0)+(m.off||0)+(m.missed||0);
  const line=H.how==='zrzucony'?'Klucznik ściąga cię za kołnierz. Koło kręci się dalej bez ciebie.':m.won?(S.alone?'Zostałeś sam na kole i dalej deptałeś. Ławka milczy.':'Ostatni na kole. Reszta siedzi na ławce i dyszy.'):H.how==='spadł'?'Stopnie zabrały ci nogi. Leżysz pod kołem.':'Zszedłeś, zanim koło cię zrzuciło.';
  let h='<span>Kierat</span><span>miejsce '+(m.place||'—')+' z '+(m.field||S.stalls)+' · na kole '+Math.round(m.sec||S.t)+' s'+(S.alone?' · sam '+S.alone*10+' s':'')+'</span>';
  h+='<span>Kroki</span><span>czysto '+(m.clean||0)+' · dobrze '+(m.good||0)+' · obok '+(m.off||0)+' · pominięte '+(m.missed||0)+(steps?' · w transie '+(m.trance||0):'')+'</span>';
  h+='<span>Poręcz</span><span>odpoczynek '+Math.round((m.rest||0)/60)+' s · przyłapany '+(m.caught||0)+'×</span>';
  for(const [k,v] of S.rows) h+='<span>'+k+'</span><span>'+v+'</span>';
  return h+'<span></span><span><i>'+line+'</i></span>';
}

/* ---------- the tick ---------- */

/** One simulation step of the wheel. */
export function treadwheelTick(){
  if(!state.on) return;
  const S=state, now=boxing.simNow;
  if(S.phase==='intro'||(sessionOpen()&&!sessionRunning())){ wheelSceneTick(view()); return; }
  S.ticks++;
  guardTick();
  if(S.phase==='run'||S.phase==='alone'){
    S.t+=DT; tempoTick();
    if(S.phase==='alone'&&(S.aloneT+=DT)>=10){ S.aloneT=0; S.alone++; sessionMetric('alone'); }
    S.stopT=Math.max(0,S.stopT-DT);
    const sp=speed(), pos0=S.pos; S.pos+=sp*DT;
    for(let g=0;g<4&&S.pos>=crossAt(S.nk);g++){ const c=crossAt(S.nk); crossBeat(S.nk,now-1000*DT+(sp>0?(c-pos0)/sp*1000:0)); S.nk++; }
    for(const b of S.beats) if(!b.done&&now-b.t>R.WINDOW.off) missBeat(b);
    if(S.early&&now-S.early.t>R.WINDOW.off*2) S.early=null;
    S.beats=S.beats.filter(b=>!b.done||now-b.t<400);
    heroTick();
    if(S.phase!=='done') rivalsTick();
  }
  for(const r of S.rivals) if(r.out) r.outT+=DT;
  if(S.hero.out) S.hero.outT+=DT;
  if(S.ticks%10===0) setInfo();
  wheelSceneTick(view());
}

/** What the picture needs from the mode. */
function view(){
  const S=state;
  return {pos:S.pos,nk:S.nk,warp:S.p.events.includes('warp'),stalls:S.stalls,hero:S.hero,heroStall:HERO_STALL,heroNo:HERO_NO,rivals:S.rivals,guard:S.guard,
    ev:S.ev,bell:S.bellAnim,bpm:S.bpm,phase:S.phase,stop:S.stopT>0,t:S.t,cobb:S.cobb};
}

/** Draw the wheel. */
export function renderTreadwheel(){ setFramebuffer(renderer.FB_MAIN); renderWheelScene(view()); }

/** The DOM lines under the picture. */
export function wheelInfo(){
  const S=state, H=S.hero; if(!H) return;
  const left=S.rivals.filter(r=>!r.out).length, pct=(/** @type {number} */ v,/** @type {number} */ m)=>Math.round(100*v/Math.max(1,m))+'%';
  input.infoEl.textContent='KIERAT · stopień '+ROMAN[Math.max(0,DRILLS.kierat.stages.indexOf(S.p))]+' · na kole '+(left+(H.out?0:1))+' z '+S.stalls+' · '+Math.round(S.bpm)+' kroków/min · oddech '+pct(H.O,H.body.breath)+' · chwyt '+pct(H.C,H.body.grip)+(H.caught?' · przyłapany '+H.caught+'/3':'')+(S.cobb?' · dyżur Cobba':'');
  input.livesEl.textContent='';
  input.nextEl.textContent=S.feedback+(S.phase==='choice'?'':' · ←/→ kroki · ↑ poręcz · ↓ (przytrzymaj) lub Esc — zejdź · '+statShort());
}

/* ---------- touch ---------- */

/** @type {Map<number,number>} pointer id → foot */
const touches = new Map();
export function initialize(){
  const stage=renderer.stage;
  stage.addEventListener('pointerdown',e=>{ if(boxing.gstate!=='kierat'||e.pointerType==='mouse') return;
    const r=stage.getBoundingClientRect(), foot=e.clientX-r.left<r.width/2?0:1; touches.set(e.pointerId,foot);
    state.keys.touchRest=touches.size>=2;
    if(touches.size===1){ if(state.phase==='intro') wheelGo(); else if(state.phase==='choice'){ if(foot===0) stepOff(); else stayOn(); } else press(foot,inputNow()); } });
  const up=(/** @type {PointerEvent} */ e)=>{ if(!touches.delete(e.pointerId)) return; state.keys.touchRest=touches.size>=2; };
  stage.addEventListener('pointerup',up); stage.addEventListener('pointercancel',up);
  addEventListener('blur',wheelKeysOff);
  document.getElementById('wiGo')?.addEventListener('click',()=>wheelGo());
  document.getElementById('wiBack')?.addEventListener('click',()=>{ if(state.phase==='intro') exitToHub(); });
}
