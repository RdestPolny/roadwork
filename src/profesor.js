/* Profesor: the old ring veteran in a wooden bath chair, the player's cellmate and the only trainer in prison.
   Owner of the conversation with him: talk (intro, fight notes, night talk), the daily task, the trees
   and the level-10 prison trials. Pure rules (notes, tasks) live in prison-data.js. */

import { state as progressionState, persist, showToast, addXP, trialPending } from './progression.js';
import { dlgSpeak, dlgLineSay, dlgClose } from './dialog.js';
import { openSkillTree } from './skill-tree.js';
import { armTrial, onSessionEnd } from './training-session.js';
import { PRISON_TRIALS } from './training-data.js';
import { state as pushupsState, startPushup } from './pushups.js';
import { startShadowboxing, shadowProfCall, COMBOS } from './shadowboxing.js';
import { state as rendererState, pset } from './renderer.js';
import { drawText, state as boxingState } from './boxing.js';
import { rgb, state as appearanceState } from './appearance.js';
import { makeFig, pose, drawFig, saveJoints, restoreJoints } from './cast.js';
import { showCards, listMatch, startListFight, myRank } from './prison.js';
import { state as gymState, stationOf } from './gym.js';
import { isPrison, prisonSave, prisonGate } from './prison.js';
import { state as sparringState } from './sparring.js';
import { NOTES, NOTE_BONUS, TASK_BONUS, DAILY_TASKS, dailyTask, taskDone, isWorkDay, LISTA, listEntry, cienStage, MEMORIES, RESPEKT_RANKS, lessonText } from './prison-data.js';

// Runtime values owned by profesor; initialized explicitly by main.js.
export const state = {};

const HELLO = ['Siadaj. Nie stój mi nad głową.','No? Mów, nie mam całego dnia. Właściwie mam.','Ręce do brody, nawet jak gadasz.','Słucham cię.'];
const TALK = ['Nogi. Wszystko zaczyna się od nóg — ręka tylko kończy to, co zaczęła stopa.',
  'Nie patrz na pięść. Patrz na barki, one powiedzą ci wszystko pół sekundy wcześniej.',
  'W Wardzie nie ma worka, więc bijesz się z powietrzem. Powietrze nie oddaje, ale też nie wybacza lenistwa.',
  'Najpierw kondycja. Technika nic ci nie da, jak zgaśniesz w drugiej minucie.',
  'Gazety pod pompki zmieniaj co tydzień. Te z sześćdziesiątego trzeciego już ledwo żyją.',
  'Tutaj nikt nie liczy punktów. Liczy się, kto wstaje ostatni.',
  'Klucznicy widzą więcej, niż mówią. Bij się tam, gdzie patrzą w drugą stronę.'];
const NIGHT = ['Nie śpisz? Ja też nie. Fotel się nie męczy, to i ja nie.',
  'W czterdziestym szóstym biłem się pod Moulsey Hurst. Tłum aż po rzekę. Potem… potem kiedyś ci opowiem.',
  'Każde nazwisko z mojej listy coś mi zabrało. Ale to nie jest rozmowa na teraz. Śpij.',
  'Słyszysz Reubena? Chrapie jak parowóz. Kiedyś był niezły. Kiedyś każdy był niezły.',
  'Słyszysz? Dzwon u St Sepulchre. Rano kogoś powieszą, teraz już po cichu, za murem. Nie słuchaj. Śpij.'];
const pick = (/** @type {string[]} */ a) => a[Math.random()*a.length|0];

/** The Ward's bath-chair station opens the talk. */
export function profOpen(){
  dlgSpeak({who:'prof',name:'PROFESOR',sub:'Stary pięściarz w drewnianym fotelu na kółkach, współwięzień z Wardu',draw:drawProfPortrait,
    hello:hello(),options:profOptions});
}

function hello(){
  const P=prisonSave();
  if(!P.profesor.spotkany) return 'Hm. Nowy. Widziałem, jak wchodziłeś: lewa noga przodem, bark w górze. Boksowałeś kiedyś. Albo chciałeś.';
  return pick(HELLO);
}

/** The evening: the Ward quiets down, time for memories and for waking Reuben. */
function night(){ return progressionState.save.sim.faza===2; }

/** @returns {any[][]} [label, sub, fn] */
function profOptions(){
  const P=prisonSave(), out=[];
  out.push(['Pogadajmy.',P.profesor.uwaga&&!P.profesor.uwaga.startsWith('told:')?'Profesor ma uwagę po twojej walce':'Rozmowa',talk]);
  if(P.profesor.spotkany){
    const Z=P.profesor.zadanie, today=progressionState.save.sim.day;
    out.push(['Co mam dziś robić?',Z.dzien===today?(Z.zaliczone?'Zadanie dnia zaliczone':'Zadanie dnia: '+DAILY_TASKS[Z.id]?.text):'Zadanie dnia · +20% XP tej sesji',task]);
    const cs=cienStage(P.lista.lekcje);
    out.push(['Pokaż mi, jak się ruszać.','Cień z Profesorem · stopień '+['I','II','III'][cs-1]+' · 10 kombinacji · 1 akcja'+(prisonGate()?' — '+prisonGate():''),()=>{ if(!prisonGate()) startCien(cs); }]);
    out.push(['Kto następny?','Lista Profesora'+(P.lista.rozdzial<=10?' · #'+P.lista.rozdzial+' '+listEntry(P.lista.rozdzial)?.name:' · zamknięta'),listTalk]);
    out.push(['Pokaż, nad czym pracować.','Cechy: wybór i zmiana za tytoń',()=>{ dlgClose(false); openSkillTree(); }]);
    out.push(...trialOptions());
  }
  if(night()&&P.profesor.spotkany){
    const m=pendingMemory(); if(m) out.unshift(['Co cię z nim łączy?','Wspomnienie: '+MEMORIES[m].title,()=>memoryCard(m)]);
    const e=listEntry(P.lista.rozdzial); if(e&&e.opp==='cell:2'){ const ok=listMatch('cell',2).entry; out.push(['Obudź Reubena.','Lista #7 · bójka w celi, wieczorem'+(ok?'':' — '+RESPEKT_RANKS[e.need].name+' najpierw'),()=>{ if(!ok){ dlgLineSay('Nie dziś. Najpierw zostań kimś.'); return; } dlgClose(); const it=gymState.gymItems.find(/** @param {any} x */ x=>x.t==='cwheel'); startListFight(it?stationOf(it):null); }]); }
  }
  out.push(['Na razie.','Zakończ rozmowę',()=>dlgClose()]);
  return out;
}

function talk(){
  const P=prisonSave(), U=P.profesor;
  if(!U.spotkany){ U.spotkany=true; persist();
    dlgLineSay('Tu nie ma trenera. Jest prycza, stare gazety, krata w oknie i ja. Jak chcesz, poprowadzę cię. Ale robisz, co mówię, i nie pytasz po co.'); return; }
  if(U.uwaga&&!U.uwaga.startsWith('told:')&&NOTES[U.uwaga]){
    const N=NOTES[U.uwaga]; U.uwaga='told:'+U.uwaga; persist();
    dlgLineSay(N.text+' (Następna sesja: '+DRILL_PL[N.drill]+' · +10% XP)'); return; }
  dlgLineSay(night()?pick(NIGHT):pick(TALK));
}

const DRILL_PL = /** @type {Record<string,string>} */ ({shadow:'walka z cieniem',pushup:'pompki',pullup:'podciąganie',roach:'karaluchy na ścianie',work:'praca w rzeźni'});

/** The list: who is next, where, what he wants to see, and the names already done. */
function listTalk(){
  const P=prisonSave(), e=listEntry(P.lista.rozdzial);
  if(!e){ dlgLineSay('Lista zamknięta. Teraz już wiesz wszystko, co ja. Prawie wszystko.'); return; }
  const done=LISTA.filter(L=>P.lista.wygrane[String(L.n)]).map(L=>'#'+L.n+(P.lista.lekcje[String(L.n)]?' ✓':'')).join(' ');
  const need=myRank()<e.need?' Ale najpierw musisz być kimś — '+RESPEKT_RANKS[e.need].name+'.':'';
  const warn=P.ambulatorium.zdarzenie&&e.n>=9?' I uważaj na rękawy. Ludzie Szefa nie biją się czysto.':'';
  dlgLineSay('Następny: '+e.name+'. Gdzie: '+e.where+'. Chcę zobaczyć: '+lessonText(e,true)+'.'+need+warn+(done?' (Za tobą: '+done+')':''));
}

/** A won name whose memory he has not told yet. */
function pendingMemory(){ const P=prisonSave(); return LISTA.map(L=>String(L.n)).find(n=>P.lista.wygrane[n]&&MEMORIES[n]&&!P.lista.wspomnienia.includes(n))||''; }

/** @param {string} n */
function memoryCard(n){
  const P=prisonSave(), M=MEMORIES[n]; P.lista.wspomnienia.push(n); persist(); dlgClose();
  showCards([{kicker:'WSPOMNIENIE · LISTA #'+n,title:M.title,body:'<p>'+M.body+'</p>',button:'Dalej'}]);
}

/** Cień z Profesorem: he picks ten combinations — more of what the last note was about — and calls them. @param {number} stage */
function startCien(stage){
  dlgClose();
  const it=gymState.gymItems.find(/** @param {any} x */ x=>x.t==='cshadow'); if(!it) return;
  startShadowboxing(stationOf(it),{stage,combos:pickCombos()});
}

/** Ten combos ordered by length; a note shifts the choice (body shots, slips, short accurate ones…). */
function pickCombos(){
  const note=prisonSave().profesor.uwaga.replace('told:',''), score=(/** @type {string[]} */ c)=>{
    let v=Math.random()*0.8;
    if(note==='korpus') v+=c.filter(t=>t.startsWith('b')).length;
    if(note==='garda'||note==='kontry') v+=c.filter(t=>t==='S'||t==='P').length;
    if(note==='celnosc') v+=c.length<=3?1.5:0;
    if(note==='kondycja') v+=c.length>=5?1.5:0;
    return v; };
  const ranked=COMBOS.map(c=>({c,v:score(c)})).sort((a,b)=>b.v-a.v).map(x=>x.c);
  const pick=[...ranked.slice(0,6),...COMBOS.filter(c=>!ranked.slice(0,6).includes(c)).slice(0,4)];
  return pick.sort((a,b)=>a.length-b.length).slice(0,10);
}

function task(){
  const P=prisonSave(), Z=P.profesor.zadanie, s=progressionState.save.sim, st=progressionState.save.stats;
  if(Z.dzien!==s.day||['norma-100','kierat-ostatni'].includes(Z.id)){
    Z.dzien=s.day; Z.id=dailyTask({str:st.str.lvl,spd:st.spd.lvl,end:st.end.lvl},isWorkDay(s.day),s.day); Z.zaliczone=false; persist();
    dlgLineSay('Dziś tak: '+DAILY_TASKS[Z.id].text+' Zrobisz — będzie z tego więcej pożytku niż zwykle.'); return; }
  dlgLineSay(Z.zaliczone?'Zrobione. Nie szukaj pochwał, szukaj następnego zadania. Jutro.':'Mówiłem: '+DAILY_TASKS[Z.id].text);
}

/** Level-10 trials in prison: Profesor starts the drill (or sends the player to the yard). */
function trialOptions(){
  const out=[];
  for(const k of ['str','spd','end']){
    const lvl=trialPending(k); if(lvl!==10) continue;
    const id=k+':10', T=PRISON_TRIALS[id];
    const locked=T.drill==='shadowp'&&cienStage(prisonSave().lista.lekcje)<3;
    out.push(['Jestem gotów: '+T.name.toLowerCase()+'.',T.task+(locked?' — stopień III po lekcji z Silasem (#6)':''),()=>locked?dlgLineSay('Stopnia III cię jeszcze nie nauczyłem. Najpierw Silas.'):startTrial(id)]);
  }
  return out;
}

/** @param {string} id */
function startTrial(id){
  const T=PRISON_TRIALS[id]; armTrial(id);
  if(T.yard){ dlgLineSay('Jutro na spacerniaku znajdź kogoś z dwiema gwiazdkami. Wygraj i nie zgaśnij — patrzę spod muru.'); return; }
  dlgClose();
  if(T.drill==='pushup'){ pushupsState.puVenue='cell'; startPushup(); return; }
  if(T.drill==='shadowp'){
    const it=gymState.gymItems.find(/** @param {any} x */ x=>x.t==='cshadow'); if(it) startShadowboxing(stationOf(it),{stage:3,combos:pickCombos()}); }
}

/** A finished session: the told note and the daily task pay their bonus. @param {any} r */
function sessionEnded(r){
  if(!isPrison()||r.aborted) return;
  const P=prisonSave(), U=P.profesor, xp=r.xp||{};
  const bonus=(/** @type {number} */ k)=>{ for(const t of ['str','spd','end']) if(xp[t]>0) addXP(t,xp[t]*k,true); };
  if((r.id==='shadow'||r.id==='shadowp')&&P.flagi['uwaga-cien']){ delete P.flagi['uwaga-cien']; bonus(0.5); showToast('Poprawka Profesora: +50% XP'); }
  if(U.uwaga.startsWith('told:')){ const N=NOTES[U.uwaga.slice(5)]; if(N&&(N.drill===r.id||(N.drill==='shadow'&&r.id==='shadowp'))){ U.uwaga=''; bonus(NOTE_BONUS); showToast('Uwaga Profesora: +10% XP'); } }
  const Z=U.zadanie;
  if(Z.dzien===progressionState.save.sim.day&&!Z.zaliczone&&taskDone(Z.id,r)){ Z.zaliczone=true; bonus(TASK_BONUS); showToast('Zadanie Profesora zaliczone: +20% XP',true); }
  persist();
}

/* ---------- Cień z Profesorem: his figure in the wheelchair beside the fight scene, and the bubble ---------- */

const SC={};
/** @param {number} cx @param {number} cy @param {number} r @param {number} c */
function disc(cx,cy,r,c){ for(let y=-r;y<=r;y++) for(let x=-r;x<=r;x++) if(x*x+y*y<=r*r+r*0.6) pset(Math.round(cx+x),Math.round(cy+y),c); }
/** @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {number} r @param {number} c */
function seg(x0,y0,x1,y1,r,c){ const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0))); for(let k=0;k<=n;k++){ const t=k/n; if(r<=0) pset(Math.round(x0+(x1-x0)*t),Math.round(y0+(y1-y0)*t),c); else disc(x0+(x1-x0)*t,y0+(y1-y0)*t,r,c); } }

/** Profesor drawn like everybody else (the boxer skeleton), seated; built once. */
function profFig(){
  if(!SC.fig){ SC.fig=makeFig({skin:'s2',hair:'h6',style:'short',eyes:'narrow',brows:'thick',nose:'broken',facial:'beard',extra:'none'},['#3a2c1a','#5e4a2c','#84704a']);   // the old quilted jacket
    SC.fig.lk.style='long'; SC.fig.lk.facial='fullbeard'; }                                 // long grey hair and a full beard (head layers without a menu entry)
  return SC.fig;
}

/** The wheelchair, side view facing right: big rear wheel with a hand rim, caster at the front, tube frame, canvas back. @param {number} x hip @param {number} fy floor */
function wheelchair(x,fy,front){
  const wx=x-2, wy=fy-9, R=9, t=SC.roll;
  if(!front){
    for(let y=-R-1;y<=R+1;y++) for(let xx=-R-1;xx<=R+1;xx++){ const d=Math.hypot(xx,y); if(d>R+0.5) continue;
      const c=d>R-0.6?SC.out:d>R-1.7?SC.tyre:d>R-2.3?SC.rimD:null; if(c) pset(wx+xx,wy+y,c); }
    for(let k=0;k<12;k++){ const a=t+k/12*Math.PI*2; for(let q=2;q<R-2;q++) if((q+k)%2===0||q<4) pset(Math.round(wx+Math.cos(a)*q),Math.round(wy+Math.sin(a)*q),SC.spoke); }
    disc(wx,wy,1,SC.frame); pset(wx,wy,SC.out);
    // the backrest posts with push handles, the canvas, the seat rail, the down tube and the footrest
    seg(x-6,fy-17,x-7,fy-36,0,SC.frame); seg(x-5,fy-17,x-6,fy-36,0,SC.frameD);
    seg(x-7,fy-36,x-10,fy-36,0,SC.grip); pset(x-11,fy-36,SC.out);
    for(let y=fy-34;y<=fy-20;y++){ pset(x-5,y,SC.leather); pset(x-4,y,y%3===0?SC.leatherD:SC.leather); }
    seg(x-6,fy-17,x+9,fy-17,0,SC.frame); seg(x-6,fy-16,x+9,fy-16,0,SC.frameD);
    for(let xx=x-5;xx<=x+7;xx++) pset(xx,fy-18,SC.leatherD);
    return; }
  // in front of the legs: the hand rim, the armrest, the down tube to the footrest and the caster
  for(let k=0;k<32;k++){ const a=k/32*Math.PI*2; pset(Math.round(wx+Math.cos(a)*(R-3)),Math.round(wy+Math.sin(a)*(R-3)),k%8===0?SC.frame:SC.rim); }
  seg(x-5,fy-25,x+6,fy-25,0,SC.leatherD); seg(x-5,fy-24,x+6,fy-24,0,SC.frameD); seg(x+6,fy-24,x+6,fy-17,0,SC.frameD); seg(x-5,fy-24,x-5,fy-17,0,SC.frameD);
  seg(x+9,fy-16,x+12,fy-5,0,SC.frame); seg(x+10,fy-16,x+13,fy-5,0,SC.frameD);
  seg(x+8,fy-4,x+14,fy-4,0,SC.frame); pset(x+15,fy-4,SC.out);
  seg(x+12,fy-5,x+12,fy-3,0,SC.frameD);
  disc(x+12,fy-1,1,SC.tyre); pset(x+12,fy-1,SC.rim); for(let xx=x+10;xx<=x+14;xx++) pset(xx,fy+1,SC.shadow);
  for(let xx=wx-8;xx<=wx+8;xx++) if((xx&1)===0) pset(xx,fy+1,SC.shadow);
}

/** Is a pixel one of the jacket's colours (shirt ramps of the snapshot)? @param {number} c */
function isJacket(c){ const A=appearanceState, P=SC.fig.pal; for(const r of [A.R_SHIRT,A.R_SHIRTF]) for(let j=0;j<3;j++) if(P[r*3+j]===c) return true; return false; }

/** Drawn after the fight scene while Profesor runs the shadow session. */
export function drawProfShadow(){
  const call=shadowProfCall(); if(!call||!sparringState.FA) return;
  rendererState.fb=rendererState.FB_MAIN;
  const keep=saveJoints(), fy=appearanceState.FLOOR_Y, x=18, up=call.age<40&&!!call.text, t=boxingState.tick;
  SC.roll=(SC.roll||0)+(up?0.004:0);
  const shake=up&&((call.age>>2)&1)?1:0, breathe=Math.sin(t*0.04)*0.5;
  wheelchair(x,fy,false);
  pose({x,squat:0.45,lean:up?1.4:-0.6,bob:breathe,near:up?[x+17,fy-41-shake]:[x+8,fy-19],far:[x+3,fy-25],feet:[x+9,x+7],lift:[2,2],headDy:up?-1:0,headDx:up?1:0});
  drawFig(profFig(),{top:()=>{ const B=boxingState, hx=B.headX, hy=B.headY;
    if(up) pset(hx+5,hy+3,SC.mouth);                                                           // shouting through the beard
    // quilting on the jacket: diagonal stitches over the torso
    for(let y=B.sy+1;y<B.hipY-1;y++) for(let x=B.sx-4;x<=B.sx+4;x++){ const c=rendererState.fb[y*appearanceState.W+x]; if(c&&((x+y)%5===0||(x-y+65)%5===0)&&isJacket(c)) pset(x,y,SC.quilt); }
    // the scarf round his neck, its end hanging over the chest
    for(let k=-2;k<=2;k++) pset(B.sx+k+1,B.sy,k===2?SC.out:SC.scarf); for(let y=B.sy+1;y<B.sy+6;y++){ pset(B.sx+3,y,SC.scarf); pset(B.sx+4,y,y&1?SC.scarfD:SC.scarf); }
    // the plaid blanket over his knees
    const k0=B.rhx, k1=B.rkx, ky=B.rky;
    for(let xx=Math.min(k0,k1)-1;xx<=Math.max(k0,k1)+1;xx++) for(let yy=ky-2;yy<=ky+1;yy++){ const c=((xx>>1)+(yy>>1))&1?SC.plaid:SC.plaidD; pset(xx,yy,(xx+yy)%5===0?SC.plaidL:c); }
    for(let yy=ky+2;yy<=ky+4;yy++) pset(Math.max(k0,k1)+1,yy,(yy&1)?SC.plaid:SC.plaidD); }});
  wheelchair(x,fy,true);
  restoreJoints(keep);
  // the bubble with the call: framed, a tail to his mouth
  if(!call.text) return;
  const words=call.text.split('-'), lines=[]; let cur='';
  for(const w of words){ const tt=cur?cur+'-'+w:w; if(tt.length>26&&cur){ lines.push(cur+'-'); cur=w; } else cur=tt; }
  lines.push(cur);
  const wpx=Math.max(...lines.map(l=>l.length))*4+7, h=lines.length*7+5, bx=3, by=Math.max(14,fy-52-h), fast=call.text==='SZYBCIEJ!', pop=call.age<6?1:0;
  for(let j=-pop;j<h+pop;j++) for(let i=-pop;i<wpx+pop;i++){ const e=j===-pop||j===h-1+pop||i===-pop||i===wpx-1+pop; pset(bx+i,by+j,e?SC.out:(j===0||j===h-2+pop?SC.inkL:SC.ink)); }
  for(let k=0;k<4;k++){ pset(x+3+k,by+h+k,SC.out); pset(x+4+k,by+h+k,SC.ink); pset(x+5+k,by+h+k,SC.out); }
  lines.forEach((l,i)=>drawText(l,bx+(wpx>>1),by+3+i*7,fast?SC.red:SC.yellow,1));
}


/* ---------- portrait ---------- */

/** @param {HTMLCanvasElement} cv */
function drawProfPortrait(cv){
  const PW=96, PH=120; cv.width=PW; cv.height=PH;
  const g=/** @type {CanvasRenderingContext2D} */ (cv.getContext('2d')); g.imageSmoothingEnabled=false;
  let sd=11; const rnd=()=>{ sd=(sd*1664525+1013904223)>>>0; return sd/4294967296; };
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {string} */ c)=>{ x|=0; y|=0; if(x<0||y<0||x>=PW||y>=PH) return; g.fillStyle=c; g.fillRect(x,y,1,1); };
  const rect=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ w,/** @type {number} */ h,/** @type {string} */ c)=>{ g.fillStyle=c; g.fillRect(x,y,w,h); };
  const ell=(/** @type {number} */ cx,/** @type {number} */ cy,/** @type {number} */ rx,/** @type {number} */ ry,/** @type {(dx:number,dy:number,x:number,y:number)=>string|null} */ fn)=>{
    for(let y=Math.floor(cy-ry);y<=cy+ry;y++) for(let x=Math.floor(cx-rx);x<=cx+rx;x++){ const dx=(x-cx)/rx, dy=(y-cy)/ry; if(dx*dx+dy*dy<=1){ const c=fn(dx,dy,x,y); if(c) px(x,y,c); } } };
  const ln=(/** @type {number} */ x0,/** @type {number} */ y0,/** @type {number} */ x1,/** @type {number} */ y1,/** @type {string} */ c)=>{ const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1; for(let i=0;i<=n;i++) px(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),c); };
  const SK=['#d2a688','#b0846a','#8c6450','#62443a'];
  // wheelchair push handles behind the shoulders, prison drelich
  rect(4,70,4,50,'#7c838a'); rect(88,70,4,50,'#5c6268'); rect(2,68,8,4,'#1a1a1c'); rect(86,68,8,4,'#1a1a1c');
  ell(48,118,44,30,(dx)=>dx<-0.5?'#5a6e8a':dx>0.5?'#34445c':'#46587a');
  ln(48,92,48,120,'#2a3648'); for(let y=98;y<120;y+=7) px(47,y,'#9aa4b4');                   // buttons
  ell(36,94,10,5,(dx,dy)=>dy<0?'#5a6e8a':'#3a4a62'); ell(60,94,10,5,(dx,dy)=>dy<0?'#46587a':'#2e3c52');   // collar
  // thin neck with tendons
  rect(39,78,18,16,SK[1]); rect(39,78,4,16,SK[0]); rect(53,78,4,16,SK[2]); ln(43,80,45,93,SK[3]); ln(53,80,51,93,SK[3]);
  ell(48,90,8,3,()=>SK[2]); px(48,86,SK[3]); px(48,87,SK[2]);                                        // Adam's apple
  // ears, the left one a cauliflower
  ell(23,50,3.5,7,(dx)=>dx<0?SK[1]:SK[2]); for(const [x,y] of [[22,47],[21,50],[23,53],[22,55]]) px(x,y,SK[3]);
  ell(73,50,3,7,(dx)=>dx>0?SK[2]:SK[1]); px(74,50,SK[3]);
  // long gaunt head
  const inHead=(/** @type {number} */ x,/** @type {number} */ y)=>{ const dy=(y-48)/32; if(dy<-1||dy>1) return false; const w=24-Math.max(0,dy)*Math.max(0,dy)*10; const dx=(x-48)/w; return dx*dx+dy*dy<=1; };
  for(let y=16;y<=80;y++) for(let x=22;x<=74;x++){ if(!inHead(x,y)) continue; const d=(x-48)/24; let c=SK[1]; if(d<-0.45) c=SK[0]; else if(d>0.5) c=SK[2]; if(d>0.85) c=SK[3]; px(x,y,c); }
  for(let y=16;y<=80;y++) for(let x=22;x<=74;x++){ if(!inHead(x,y)) continue; if(!inHead(x-1,y)||!inHead(x+1,y)||!inHead(x,y-1)||!inHead(x,y+1)) px(x,y,'#3a2418'); }
  // hollow cheeks
  for(const s of [-1,1]) ell(48+s*15,62,5,8,(dx,dy)=>((dx*s>0)?SK[2]:null));
  // thin white hair combed back, high forehead
  const HAIR=['#f2f2f4','#cfcfd6','#9a9aa2'];
  for(let y=14;y<=30;y++) for(let x=24;x<=72;x++){ if(!inHead(x,y)) continue; const t=(y-14)/16; if(t>0.55+0.25*Math.abs(x-48)/24) continue; if(rnd()<0.7) px(x,y,(x+y)%4===0?HAIR[2]:(rnd()<0.5?HAIR[0]:HAIR[1])); }
  for(const s of [-1,1]) for(let k=0;k<26;k++) px(48+s*(22+rnd()*3),30+rnd()*18,rnd()<0.5?HAIR[1]:HAIR[2]);
  // forehead wrinkles
  for(const [y,a,b] of [[30,36,60],[34,34,62],[38,38,58]]) for(let x=a;x<=b;x++) px(x,y+((x*5+y)%6===0?1:0),SK[3]);
  // brows (white, bushy)
  for(let x=32;x<=44;x++){ px(x,41-((x-32)>>3),HAIR[1]); px(x,42-((x-32)>>3),HAIR[2]); }
  for(let x=52;x<=64;x++){ px(x,40+((x-52)>>3),HAIR[1]); px(x,41+((x-52)>>3),HAIR[2]); }
  // thick black-rimmed glasses, a taped hinge on the right
  for(const cx of [38,58]){ ell(cx,48,8,6,(dx,dy)=>{ const r=dx*dx+dy*dy; return r>0.62?'#111014':(dy<-0.3&&dx<0?'#cfe0ea':'#8aa0ac'); });
    px(cx-1,48,'#1a1010'); px(cx,48,'#1a1010'); px(cx,49,'#2a2020'); }
  rect(46,46,4,2,'#111014'); rect(22,46,6,2,'#111014'); rect(66,46,6,2,'#111014'); rect(64,44,3,6,'#e8e2d0');
  // nose: long, broken, bent to the left
  for(let y=50;y<=64;y++){ px(47-((y-50)>>3),y,SK[0]); px(49-((y-50)>>3),y,SK[2]); }
  ell(46,65,5,3,(dx,dy)=>dy>0.2?SK[3]:SK[1]); px(43,66,'#3a2418'); px(49,66,'#3a2418');
  // white stubble and a thin, tight mouth with a scar through the lip
  for(let y=66;y<=79;y++) for(let x=28;x<=68;x++){ if(!inHead(x,y)||Math.abs(x-48)<5&&y<70) continue; if(rnd()<0.32) px(x,y,rnd()<0.5?HAIR[1]:HAIR[2]); }
  for(let x=40;x<=56;x++) px(x,71+(x<42||x>54?1:0),'#5a3226'); for(let x=42;x<=54;x++) px(x,72,SK[2]);
  ln(51,68,53,75,'#e6c6b0');
  ell(48,78,6,2,(dx,dy)=>dy>0?SK[3]:null);
  return cv;
}

export function initialize(){
  Object.assign(SC,{tyre:rgb('#141416'),rim:rgb('#7c838a'),spoke:rgb('#5a6068'),frame:rgb('#a4aab0'),leather:rgb('#3e302a'),pants:rgb('#2e3a4c'),shirt:rgb('#4a5c74'),shoe:rgb('#1a1612'),
    skin:rgb('#c8987a'),skinD:rgb('#9a6e56'),hair:rgb('#ecebef'),glass:rgb('#9ab8c8'),rimG:rgb('#111014'),mouth:rgb('#5a3226'),paper:rgb('#ece6d6'),paperR:rgb('#f6dcd2'),ink:rgb('#141414'),red:rgb('#ff5a3a'),yellow:rgb('#ffd23f'),
    out:rgb('#0a0a12'),rimD:rgb('#3a3e44'),frameD:rgb('#6a7078'),grip:rgb('#26262a'),leatherD:rgb('#2a201c'),shadow:rgb('#2a2e26'),inkL:rgb('#2a2a30'),plaid:rgb('#8a3a2a'),plaidD:rgb('#5a2a22'),plaidL:rgb('#c8b070'),quilt:rgb('#2a2014'),scarf:rgb('#6a2a1e'),scarfD:rgb('#4a1a14')});
  SC.fig=null; SC.roll=0;
  onSessionEnd(sessionEnded);
}
