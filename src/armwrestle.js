/* Arm wrestling in the Ward, elbows on a chest by a candle stub: a close-up minigame (gstate 'arm').
   Space / E — push in the rhythm of the ring; hold S / ↓ — brace against the rival's surge; Esc — give up.
   The bar runs from −1 (your hand on the table) to +1 (his). Respect gives a head start (prison-data.armSetup). */

import { state as boxingState, drawText } from './boxing.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { makeFig, flushed, inmateLook, pose, drawFig, mix } from './cast.js';
import { state as gymState } from './gym.js';
import { state as progressionState } from './progression.js';
import { enterHub, setPanelMode } from './navigation.js';
import { setInfo } from './input.js';
import { tone, initAudio, sfxWhoosh } from './audio.js';
import { armSetup, armResult, respektRank } from './prison-data.js';

// Runtime values owned by armwrestle; initialized explicitly by main.js.
export const state = {};

const PERIOD = 34;          // ticks of one push rhythm

/**
 * Start a bout. @param {{name:string,fight:number,oppRank:number,stake:string,look?:Record<string,string>,onEnd:(res:'win'|'loss'|'draw')=>void}} o
 */
export function startArm(o){
  const save=progressionState.save, P=save.prison;
  const S=armSetup({myRank:respektRank(P.respekt),oppRank:o.oppRank,strLvl:save.stats.str.lvl,endLvl:save.stats.end.lvl,oppFight:o.fight});
  state.A={...o,S,bar:S.start,t:0,sta:S.stamina,brace:false,surgeT:0,nextSurge:S.surgeGap,tell:0,result:null,endT:0,flash:0,lastQ:-1,returnSt:gymState.hubNear};
  initAudio(); boxingState.gstate='arm'; document.body.classList.add('arm'); setPanelMode(); setInfo();
}

/** Is a bout running? */
export function armOn(){ return boxingState.gstate==='arm'; }

/** Rhythm phase 0..1; the press is best at 0 (ring meets the target). */
function phase(){ return (state.A.t%PERIOD)/PERIOD; }

/** @param {KeyboardEvent} e @param {boolean} down */
export function armKey(e,down){
  const A=state.A; if(!A) return;
  if(A.result){ if(down&&['Enter','Space','KeyE','Escape'].includes(e.code)){ e.preventDefault(); finish(); } return; }
  if(e.code==='KeyS'||e.code==='ArrowDown'){ e.preventDefault(); A.brace=down; return; }
  if(!down||e.repeat) return;
  if(e.code==='Escape'){ e.preventDefault(); A.bar=-1; settle(); return; }
  if(e.code==='Space'||e.code==='KeyE'||e.code==='Enter'){ e.preventDefault(); press(); }
}

/** Panel buttons. @param {'push'|'brace'|'braceOff'|'quit'} what */
export function armButton(what){
  const A=state.A; if(!A) return;
  if(A.result){ finish(); return; }
  if(what==='push') press(); else if(what==='brace') A.brace=true; else if(what==='braceOff') A.brace=false; else if(what==='quit'){ A.bar=-1; settle(); }
}

function press(){
  const A=state.A; if(A.brace||A.result) return;
  const p=phase(), d=Math.min(p,1-p), q=d<0.08?1.6:d<0.18?1:0.35;
  const tired=A.sta<=0?0.4:1;
  A.bar+=A.S.push*q*tired; A.sta=Math.max(0,A.sta-1); A.lastQ=q; A.flash=8;
  tone('square',q>1?520:(q>0.5?380:220),q>1?420:300,0.04,0.05);
  if(A.bar>=1) settle();
}

function settle(){
  const A=state.A; if(A.result) return;
  A.result=armResult(A.bar<=-1?-1:A.bar>=1?1:A.bar); A.endT=0;
  sfxWhoosh(0.8); tone('sine',A.result==='win'?660:180,A.result==='win'?880:120,0.3,0.12); setInfo();
}

function finish(){
  const A=state.A; if(!A) return;
  const res=/** @type {'win'|'loss'|'draw'} */ (A.result||'draw'), st=A.returnSt;
  state.A=null; document.body.classList.remove('arm');
  enterHub(st&&st.spot?st:null);
  A.onEnd(res);
}

export function armTick(){
  const A=state.A; if(!A) return;
  if(A.result){ if(++A.endT>150) finish(); return; }
  A.t++; if(A.flash>0) A.flash--;
  // the rival's steady pull and his surges (the face reddens just before)
  A.bar-=A.S.oppForce;
  if(A.surgeT>0){ A.surgeT--; A.bar-=A.S.surge*(A.brace?A.S.brace:1); if(A.brace) A.sta=Math.max(0,A.sta-0.04); }
  else if(--A.nextSurge<=0){ A.surgeT=A.S.surgeLen; A.nextSurge=Math.round(A.S.surgeGap*(0.7+0.6*((A.t*7919)%100)/100)); tone('sawtooth',90,70,0.2,0.05); }
  A.tell=A.surgeT>0?1:(A.nextSurge<40?1-A.nextSurge/40:0);
  if(A.brace) A.sta=Math.min(A.S.stamina,A.sta+0.02);
  if(A.bar<=-1||A.bar>=1||A.t>=A.S.limit) settle();
}

/* ---------- drawing: the close-up on a chest in the Ward, side view ----------
   The bout is drawn at the native size into a layer (table, benches, the wrestlers, sweat and dust) and shown three
   times larger in the 2× frame, so every pixel stays a clean 3×3 block; the HUD is shown at the usual 2×. Behind them,
   at the true 2× detail: the Ward's stone wall with its slot, the guard-bed with the cellmates on its edge eating their
   bread and watching, the flags running away in perspective; a candle stub on the chest lights them from below. */

const C={};
const TABLE_Y = 63, PIV_X = 72, PIV_Y = 62, CLASP_R = 7;

/** Zoom of the bout: the native point (72, 62) lands at (144, 122) of the 2× frame, three times larger. */
const ZOOM = 3, ZX = 72, ZY = 62, HX = 144, HY = 122;
/** The eye of the close-up (the wrestlers' heads) and the guard-bed behind them: its top and the floor in front of it. */
const ARM_HORIZON = 72, BED_TOP = 96, BED_FLOOR = 113;
/** Cellmates on the edge of the guard-bed: x in the 2× frame (one 2× pixel per native pixel), facing the bout. */
const TABLES = [{x:22,s:1,haze:0.2},{x:74,s:1,haze:0.2},{x:144,s:1,haze:0.24},{x:214,s:1,haze:0.2},{x:266,s:1,haze:0.2}];
/** The eating cycle: spoon in the plate, half way, at the mouth, half way back. */
const BITE = [0,1,2,1];

/** The two wrestlers, their flushed variants and the tables behind (once per bout). @param {any} A */
function prepare(A){
  const me=makeFig(progressionState.save.look), op=makeFig(A.look||inmateLook(A.name.length*7+A.fight));
  A.fig={me, meRed:flushed(me,0.7), op, opRed:flushed(op,0.8)};
  if(!state.tables) state.tables=TABLES.map((T,k)=>({...T,L:eatingTable(31+k*17,T.x>144||(T.x===144&&k%2===1))}));
  A.parts=[];
}

/** A cellmate on the edge of the guard-bed with his bread, facing the bout (mirrored on the right). @param {any} fig @param {boolean} mirror @param {number} f bite frame */
function eater(fig,mirror,f){
  const hand=f===0?[60,66]:f===1?[59,59]:[57,53];
  pose({x:50,squat:0.8,lean:f===2?1.2:1.8,near:hand,far:[58,67],feet:[59,55],headDy:f===2?0:1});
  drawFig(fig,{mirror});
  if(f<2){ const x=mirror?appearanceState.W-1-hand[0]:hand[0]; for(let k=-1;k<=1;k++){ pset(x+k,hand[1]-1,C.crust); pset(x+k,hand[1],C.crumb); } }   /* the hunk of bread in his hand */
}
/** A plate with the portion and the spoon resting on it, on the table top. @param {number} x */
function plate(x){ for(let k=0;k<5;k++){ pset(x+k,TABLE_Y-1,k===0||k===4?C.aluD:C.alu); if(k&&k<4) pset(x+k,TABLE_Y-2,k===2?C.cab:C.pot); } }
/** One cellmate on the guard-bed, drawn at the native size: four layers of the bite cycle. @param {number} seed @param {boolean} mirror */
function eatingTable(seed,mirror){
  const A=appearanceState, N=A.W*A.H, keep=rendererState.fb, keepM=rendererState.FB_MAIN, a=makeFig(inmateLook(seed)), out=[];
  for(let f=0;f<4;f++){ const L=new Uint32Array(N); rendererState.fb=L; rendererState.FB_MAIN=L; eater(a,mirror,BITE[(f+seed)%4]); out.push(L); }
  rendererState.fb=keep; rendererState.FB_MAIN=keepM;
  return out;
}

/** @param {string} type @param {number} x @param {number} y @param {number} vx @param {number} vy @param {number} l @param {number} c */
function part(type,x,y,vx,vy,l,c){ const P=state.A.parts; P.push({type,x,y,vx,vy,l,m:l,c}); if(P.length>120) P.splice(0,P.length-120); }

function tickParts(){
  const A=state.A; if(!A||!A.parts) return;
  for(const p of A.parts){ p.l--;
    if(p.type==='drop'){ p.vy+=0.14; p.x+=p.vx; p.y+=p.vy; const floor=p.x>58&&p.x<86?TABLE_Y-1:appearanceState.FLOOR_Y; if(p.y>=floor){ p.y=floor; p.vx=0; p.vy=0; p.type='splat'; p.l=Math.min(p.l,14); } }
    else if(p.type==='star'){ p.x+=p.vx; p.y+=p.vy; p.vx*=0.86; p.vy*=0.86; }
    else if(p.type==='dust'){ p.x+=p.vx; p.y+=p.vy; p.vx*=0.94; p.vy*=0.95; } }
  A.parts=A.parts.filter(p=>p.l>0);
}

function drawParts(){
  const A=state.A, w=appearanceState.W, h=appearanceState.H, M=rendererState.FB_MAIN, B=gymState.BAYER;
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&x<w&&y>=0&&y<h) M[y*w+x]=c; };
  for(const p of A.parts){ const k=p.l/p.m;
    if(p.type==='drop'){ px(p.x,p.y,C.sweat); px(p.x,p.y-1,C.sweatL); }
    else if(p.type==='splat'){ px(p.x-1,p.y,C.sweat); px(p.x+1,p.y,C.sweat); }
    else if(p.type==='star'){ const c=k>0.5?C.white:p.c; px(p.x,p.y,c); if(k>0.4){ px(p.x-1,p.y,p.c); px(p.x+1,p.y,p.c); px(p.x,p.y-1,p.c); px(p.x,p.y+1,p.c); } }
    else if(p.type==='dust'){ const r=1.5+(1-k)*2.5; for(let y=-3;y<=3;y++) for(let x=-3;x<=3;x++){ if(x*x+y*y>r*r) continue; const X=Math.round(p.x+x), Y=Math.round(p.y+y); if(X<0||X>=w||Y<0||Y>=h) continue; if(B[(Y&3)*4+(X&3)]<k*9) M[Y*w+X]=C.dust; } }
    else if(p.type==='ring'){ const r=2+(1-k)*9; for(let a=0;a<6.28;a+=0.3){ const X=p.x+Math.cos(a)*r, Y=p.y+Math.sin(a)*r*0.3; if(B[(Math.round(Y)&3)*4+(Math.round(X)&3)]<k*16) px(X,Y,C.dust); } } }
}

/** A seated wrestler at the table. @param {any} fig @param {boolean} mirror @param {number[]} P clasp (world) @param {number} strain 0..1 @param {number} end 1 won, -1 lost */
function wrestler(fig,mirror,P,strain,end){
  const w=appearanceState.W, L=(/** @type {number} */ x)=>mirror?w-1-x:x, t=boxingState.tick;
  const hip=mirror?L(94):50, elbow=[L(mirror?79:65),TABLE_Y-1], hand=[L(P[0]),P[1]];
  const jit=strain>0.55?((t>>1)&1?0.5:-0.5):0;
  const win=end===1, lose=end===-1;
  pose({x:hip,squat:0.8,rise:win?1:0,lean:lose?3.5:win?7.5:6+strain*1.6+jit,near:hand,nearE:elbow,far:lose?[hip+3,TABLE_Y+4]:[hip+10,TABLE_Y],feet:[hip+9,hip+5],headDy:lose?2:strain>0.7?1:0,headDx:lose?-1:strain>0.4?1:0});
  drawFig(fig,{mirror});
}

/** Bench under a wrestler. @param {number} x0 @param {number} x1 */
function bench(x0,x1){
  for(let x=x0;x<=x1;x++){ pset(x,71,C.out); pset(x,72,C.wdL); pset(x,73,C.wd); pset(x,74,C.out); }
  for(const lx of [x0+2,x1-2]) for(let y=75;y<appearanceState.FLOOR_Y;y++){ pset(lx,y,C.legD); pset(lx+1,y,C.leg); }
}

/** The chest they wrestle on: a dark plank lid with iron bands; a tin mug and a candle stub on the far end. */
function table(){
  for(let x=58;x<=86;x++){ pset(x,TABLE_Y,C.topH); pset(x,TABLE_Y+1,C.top); pset(x,TABLE_Y+2,C.alu); pset(x,TABLE_Y+3,C.aluD); pset(x,TABLE_Y+4,C.out); }
  pset(57,TABLE_Y+1,C.out); pset(57,TABLE_Y+2,C.out); pset(87,TABLE_Y+1,C.out); pset(87,TABLE_Y+2,C.out);
  for(const lx of [61,82]) for(let y=TABLE_Y+5;y<appearanceState.FLOOR_Y;y++){ pset(lx,y,C.legD); pset(lx+1,y,C.leg); pset(lx+2,y,C.legD); }
  for(let x=56;x<=88;x++) if((x+boxingState.tick*0)&1) pset(x,appearanceState.FLOOR_Y,C.shadow);
  for(let y=TABLE_Y+5;y<appearanceState.FLOOR_Y;y++) for(let x=58;x<=86;x++) if(x!==61&&x!==82) pset(x,y,(x===70||x===74)?C.legD:(((y+x)&7)===0?C.wdL:C.top));   // the chest's front, two iron bands
  for(let y=TABLE_Y-4;y<TABLE_Y;y++) for(let x=59;x<62;x++) pset(x,y,x===59?C.aluD:x===61?C.aluD:C.alu); pset(62,TABLE_Y-3,C.aluD);   // a tin mug
  for(let y=TABLE_Y-5;y<TABLE_Y;y++){ pset(84,y,y===TABLE_Y-1?C.wdL:C.wax); pset(85,y,C.waxD); }                                       // the candle stub
  const fl=(boxingState.tick>>2)&1; pset(84,TABLE_Y-6,C.flame); pset(84+fl,TABLE_Y-7,C.flameH);
}

/** @param {number} x @param {number} y @param {number} w @param {number} h */
function frame(x,y,w,h){ for(let j=0;j<h;j++) for(let i=0;i<w;i++) pset(x+i,y+j,(j===0||j===h-1||i===0||i===w-1)?C.out:C.panel); }

/** The native passes of a frame: the bout into one layer, the HUD into another (renderArmHD shows them). */
export function renderArm(){
  const A=state.A; if(!A) return;
  if(!A.fig) prepare(A);
  tickParts();
  const N=appearanceState.W*appearanceState.H; if(!state.fg||state.fg.length!==N){ state.fg=new Uint32Array(N); state.ui=new Uint32Array(N); }
  const keepM=rendererState.FB_MAIN, keep=rendererState.fb;
  state.fg.fill(0); rendererState.FB_MAIN=state.fg; rendererState.fb=state.fg;
  const res=A.result, bar=res?(A.bar>=1||res==='win'?1:A.bar<=-1||res==='loss'?-1:A.bar):A.bar;
  const ang=Math.max(-1.5,Math.min(1.5,bar*1.38)), P=[PIV_X+Math.sin(ang)*CLASP_R,PIV_Y-Math.cos(ang)*CLASP_R];
  const strain=Math.min(1,0.25+(A.flash>0?0.35:0)+(A.sta<=A.S.stamina*0.2?0.3:0)+(A.brace?0.35:0)+(bar<-0.5?0.25:0));
  const oppStrain=Math.min(1,0.2+A.tell*0.6+(bar>0.5?0.3:0));
  bench(36,54); bench(90,108);
  table();
  const end=res==='win'?1:res==='loss'?-1:0;
  wrestler(strain>0.6?A.fig.meRed:A.fig.me,false,P,strain,end);
  wrestler(oppStrain>0.6?A.fig.opRed:A.fig.op,true,P,oppStrain,-end);
  // the clasp: knuckles and a thumb over the top
  pset(Math.round(P[0]),Math.round(P[1])-2,C.out); pset(Math.round(P[0])-1,Math.round(P[1])-2,C.knuckle);
  // effects: sweat off the strained, stars on a good push, the slam
  if(strain>0.6&&boxingState.tick%18===0) part('drop',60+Math.random()*3,51,-0.4-Math.random()*0.5,-0.6,60,C.sweat);
  if(oppStrain>0.6&&boxingState.tick%22===0) part('drop',82+Math.random()*3,51,0.4+Math.random()*0.5,-0.6,60,C.sweat);
  if(A.flash===8){ const n=A.lastQ>1?7:A.lastQ>0.5?4:1; for(let i=0;i<n;i++){ const a=Math.random()*6.28; part('star',P[0],P[1],Math.cos(a)*1.6,Math.sin(a)*1.6,12,A.lastQ>1?C.gold:C.white); }
    if(A.lastQ>1) boxingState.shakeT=Math.max(boxingState.shakeT,3); }
  if(res&&A.endT===1&&res!=='draw'){ const x=P[0]; for(let i=0;i<6;i++) part('dust',x+(Math.random()-0.5)*6,TABLE_Y-1,(Math.random()-0.5)*0.8,-0.2-Math.random()*0.3,30,C.dust); part('ring',x,TABLE_Y,0,0,18,C.dust); boxingState.shakeT=10; }
  drawParts();
  state.ui.fill(0); rendererState.FB_MAIN=state.ui; rendererState.fb=state.ui;
  hud(A,P,bar);
  rendererState.FB_MAIN=keepM; rendererState.fb=keep;
}

/** A native point of the bout in the HUD layer (half the 2× frame): where the zoomed point shows. @param {number} x @param {number} y @returns {number[]} */
const zoomHud=(x,y)=>[Math.round((HX+(x-ZX)*ZOOM)/2),Math.round((HY+(y-ZY)*ZOOM)/2)];

/** Show a native layer in the 2× frame, k times larger, its point (ax, ay) at (bx, by); haze greys it. @param {Uint32Array} L @param {number} k @param {number} ax @param {number} ay @param {number} bx @param {number} by @param {number} [haze] @param {number} [hc] */
function blitScaled(L,k,ax,ay,bx,by,haze=0,hc=0){
  const w=appearanceState.W, h=appearanceState.H, nw=w/2, nh=h/2, M=rendererState.FB_MAIN;
  const x0=Math.max(0,Math.floor(bx-ax*k)), x1=Math.min(w,Math.ceil(bx+(nw-ax)*k)), y0=Math.max(0,Math.floor(by-ay*k)), y1=Math.min(h,Math.ceil(by+(nh-ay)*k));
  for(let y=y0;y<y1;y++){ const sy=Math.floor(ay+(y-by)/k); if(sy<0||sy>=nh) continue; const r=sy*nw;
    for(let x=x0;x<x1;x++){ const sx=Math.floor(ax+(x-bx)/k); if(sx<0||sx>=nw) continue; const c=L[r+sx]; if(c) M[y*w+x]=haze?mix(c,hc,haze):c; } }
}

/** The Ward behind the bout (2× frame, cached): stone below, limewash and soot above, the barred slot, the guard-bed
 * along the wall, the flags in perspective down to the eye level. @returns {Uint32Array} */
function wardArmBg(){
  if(state.bg) return state.bg;
  const w=appearanceState.W, h=appearanceState.H, bg=new Uint32Array(w*h), B=gymState.BAYER, bay=(/** @type {number} */ x,/** @type {number} */ y)=>B[(y&3)*4+(x&3)];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let c;
    if(y<BED_TOP){ if(y<46){ const br=y>>2, bx=((x+(br&1)*6)/12)|0, mort=(y&3)===0||((x+(br&1)*6)%12)===0, n=(bx*7+br*13)%17;   // brick under limewash, black with soot at the top
        c=mort?C.joint:(n<5?C.wall[1]:C.lime); c=mix(c,C.soot,Math.max(0,0.75-y/60)); }
      else { const row=((y-46)/12)|0, bx=((x+row*17)/30)|0, mort=((y-46)%12)===0||((x+row*17)%30)===0;   // ashlar
        c=mort?C.joint:C.wall[(bx*3+row)%3]; if(y>BED_TOP-14&&bay(x,y)<(y-BED_TOP+14)) c=mix(c,C.soot,0.4); } }
    else if(y<BED_TOP+3) c=C.bedT; else if(y<BED_FLOOR-3) c=((y-BED_TOP)%5===0)?C.bedK:C.bed; else if(y<BED_FLOOR) c=C.bedK;   // the guard-bed
    else { const sc=(y-ARM_HORIZON)/122, row=Math.floor(6/sc), fr=6/sc-row, u=(x-144)/(sc*30)+(row&1)*0.5, fu=u-Math.floor(u);   // flags
      c=(fr<Math.min(0.5,6/(sc*sc*122))||fu<1/(sc*30))?C.fjoint:C.flag[((Math.floor(u)*5+row*3)%3+3)%3]; }
    bg[y*w+x]=c; }
  for(let y=10;y<34;y++) for(let x=196;x<236;x++){ const e=x<199||x>232||y<13||y>30; bg[y*w+x]=e?C.wall[1]:((x-199)%7<2||Math.abs(y-21)<1?C.iron:C.sky); }   // the slot under the vault
  return (state.bg=bg);
}
/** The candle on the chest lights the room from below: warm near it, black at the edges. */
function candleLight(){
  const M=rendererState.FB_MAIN, w=appearanceState.W, h=appearanceState.H, t=boxingState.tick, cx=HX+(84-ZX)*ZOOM, cy=HY+(TABLE_Y-7-ZY)*ZOOM, p=0.92+0.08*Math.sin(t*0.4)*Math.sin(t*0.13);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const d=Math.hypot(x-cx,(y-cy)*1.2)/(150*p), f=Math.max(0.28,1.25-d*d*0.9), k=y*w+x, o=M[k];
    M[k]=(0xff000000|(Math.min(255,((o>>16)&255)*f*0.82)<<16)|(Math.min(255,((o>>8)&255)*f*0.95)<<8)|Math.min(255,(o&255)*f*1.05))>>>0; }
}

/** The 2× frame: the Ward behind, the cellmates eating on the guard-bed, the candle's light, the bout three times larger, the HUD; the chest shakes it. */
export function renderArmHD(){
  const A=state.A, M=rendererState.FB_MAIN; M.set(wardArmBg());
  if(!A||!A.fig) return;
  const t=boxingState.tick, hc=C.lime;
  state.tables.forEach((T,k)=>{ const f=Math.floor((t+k*23)/22)%4;   /* each on the edge of the guard-bed, his feet on the floor in front of it */
    blitScaled(T.L[f],T.s,72,appearanceState.FLOOR_Y,T.x,BED_FLOOR,T.haze,hc); });
  candleLight();
  blitScaled(state.fg,ZOOM,ZX,ZY,HX,HY);
  blitScaled(state.ui,2,0,0,0,0);
  const sh=boxingState.shakeT>0?(boxingState.shakeT--%2?2:-2):0;
  if(sh){ const w=appearanceState.W; for(let y=0;y<appearanceState.H;y++){ const r=y*w; if(sh>0) M.copyWithin(r+2,r,r+w-2); else M.copyWithin(r,r+2,r+w); } }
}

/** @param {any} A @param {number[]} P @param {number} bar */
function hud(A,P,bar){
  // the bar: his side red, your side green; the needle
  frame(20,2,105,9);
  for(let x=0;x<=100;x++){ const v=(x-50)/50, c=v<-0.6?C.red:v<0?C.redD:v<0.6?C.goodD:C.good; pset(22+x,5,c); pset(22+x,6,c); pset(22+x,7,shadeC(c)); }
  for(let y=4;y<=8;y++) pset(72,y,C.hud);
  const mx=Math.round(72+bar*50); for(let y=2;y<=10;y++){ pset(mx,y,C.white); pset(mx-1,y,C.out); pset(mx+1,y,C.out); }
  drawText('TY',10,4,C.hud,1); drawText(A.name.split(' ')[0].slice(0,5).toUpperCase(),134,4,C.hud,1);
  // stamina and the clock
  frame(2,86,36,8); const sw=Math.round(32*A.sta/A.S.stamina);
  for(let x=0;x<32;x++){ const on=x<sw, c=on?(A.sta<A.S.stamina*0.25?C.red:C.good):C.panel; pset(4+x,88,c); pset(4+x,89,c); pset(4+x,90,on?shadeC(c):C.panel); pset(4+x,91,C.panel); }
  if(!A.result){
    const left=Math.max(0,Math.ceil((A.S.limit-A.t)/60)); frame(122,85,20,10); drawText(String(left),132,87,left<=5&&(boxingState.tick>>3)&1?C.red:C.hud,1);
    // the rhythm ring closes on the clasp; press when it meets the inner circle
    const [qx,qy]=zoomHud(P[0],P[1]), p=(A.t%PERIOD)/PERIOD, r=3+(1-p)*10, cx=qx, cy=qy-15;   /* above the zoomed clasp */
    for(let k=0;k<28;k++){ const a=k/28*Math.PI*2, X=Math.round(cx+Math.cos(a)*r), Y=Math.round(cy+Math.sin(a)*r);
      if(A.brace){ if(k%2) pset(X,Y,C.hudD); } else pset(X,Y,p>0.82||p<0.08?C.gold:C.ring); }
    for(let k=0;k<12;k++){ const a=k/12*Math.PI*2; pset(Math.round(cx+Math.cos(a)*3),Math.round(cy+Math.sin(a)*3),C.good); }
    if(A.brace) drawText('BLOK',cx,cy+6,C.hud,1);
    if(A.tell>0.6){ const [hx,hy]=zoomHud(98,36); frame(hx-4,hy-4,9,11); for(let y=hy-2;y<=hy+3;y++) pset(hx,y,C.red); pset(hx,hy+5,C.red); }   /* his surge is coming */
  } else { frame(36,18,72,20); drawText(A.result==='win'?'WYGRANA':(A.result==='loss'?'PRZEGRANA':'REMIS'),72,23,A.result==='win'?C.good:(A.result==='loss'?C.red:C.hud),2); }
}
/** @param {number} c */
function shadeC(c){ return (0xff000000|((((c>>16)&255)*0.7)<<16)|((((c>>8)&255)*0.7)<<8)|((c&255)*0.7))>>>0; }

export function initialize(){
  Object.assign(C,{out:rgb('#0a0a12'),white:rgb('#f4f4ec'),panel:rgb('#1c1e26'),hud:rgb('#e8e2d4'),hudD:rgb('#5a5650'),good:rgb('#5ee07a'),goodD:rgb('#2e8a44'),red:rgb('#d23a2a'),redD:rgb('#8a2a1e'),
    ring:rgb('#ffd23f'),gold:rgb('#ffd23f'),sweat:rgb('#9fd8f4'),sweatL:rgb('#e4f6ff'),dust:rgb('#c8bca8'),knuckle:rgb('#e8b08a'),
    top:rgb('#3e2e1e'),topH:rgb('#5a4430'),alu:rgb('#7a7e80'),aluD:rgb('#4e5254'),leg:rgb('#2a2a2c'),legD:rgb('#1a1a1c'),wd:rgb('#3a2c1c'),wdL:rgb('#54402a'),shadow:rgb('#1a1410'),pot:rgb('#d8c070'),cab:rgb('#8a9a4a'),
    crust:rgb('#3e2814'),crumb:rgb('#5e4224'),wax:rgb('#d8ccaa'),waxD:rgb('#a89c7c'),flame:rgb('#ffb04a'),flameH:rgb('#fff0b0'),
    wall:[rgb('#5a5040'),rgb('#4a4234'),rgb('#665a48')],joint:rgb('#221e18'),lime:rgb('#6e6856'),soot:rgb('#121010'),bed:rgb('#3a2c1c'),bedT:rgb('#54402a'),bedK:rgb('#140e08'),
    flag:[rgb('#3e3a34'),rgb('#36332d'),rgb('#46423a')],fjoint:rgb('#161412'),sky:rgb('#2e3230'),iron:rgb('#1a1a1c')});
  state.A=null; state.bg=null;
}
