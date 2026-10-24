// The drawn fight venues (yard, Ward at the meal, bath) in the poster look. The game, its animation and its camera stay
// as they are: this reads the joints each fighter has solved (F.S) and the camera the renderer used, and paints over
// the pixel frame. `?styl=piksel` keeps the old picture.
import { state as appearanceState } from './appearance.js';
import { state as animationState } from './animation.js';
import { state as boxingState } from './boxing.js';
import { state as rendererState } from './renderer.js';
import { state as sparState, fighterView, isShadowboxing, isCardFight, bareTorsoOut } from './sparring.js';
import { shadowProfCall } from './shadowboxing.js';
import { drawFigure, posterLook, poseJoints } from './poster-fighter.js';
import { C, REG, line, ink, useContext, setBoil, starburst } from './poster-ink.js';

const VENUES={yard:1,canteen:1,laznia:1,cell:1};
/** Poster figure units per native pixel: the game's torso (12 px) is the poster's 104 units. */
const UNITS=8.67;
const PHRASES={head:['SMACK!','ON THE CONK!','PEPPERED!','A NOBBER!'],chin:['A FLOORER!','CLARET!','KNOCKED SILLY!'],body:['IN THE BREAD-BASKET!','A RIB-ROASTER!','WINDED!'],stop:['STOPPED!','GUARDED!']};
/** @type {{x:number,y:number,t:number,s:number,rot:number,text:string,small:boolean,seed:number}[]} */
const FX=[];
const last={px:0,py:0,kickT:0};
/** Poster look per fighter, remade when its game look or the venue changes. @type {WeakMap<object,{ref:any,venue:string,look:any,id:number}>} */
const LOOKS=new WeakMap();

/** `?styl=piksel` keeps the pixel picture. */
const pixelStyle=()=>typeof location!=='undefined'&&new URLSearchParams(location.search).get('styl')==='piksel';
/** Is this fight drawn in the poster look? Every fight venue, and Cień (in the cell). */
export function posterFightOn(){ return !pixelStyle()&&boxingState.gstate==='spar'&&sparState.sparVenue in VENUES; }
let classOn=false;
/** Dress the DOM (fight HUD, opening bill) in the poster look while a poster fight is on screen. */
export function syncPosterClass(){ const on=posterFightOn(); if(on!==classOn&&typeof document!=='undefined'){ document.body.classList.toggle('posterfight',on); classOn=on; } }

/** A fighter's solved joints, mapped from its own (unmirrored) native frame to the screen.
 * @param {any} F @param {(x:number,y:number)=>{x:number,y:number}} toScreen */
function joints(F,toScreen){
  const s=F.S, view=fighterView(F), W=appearanceState.W, mirror=view.mirror, f=mirror?-1:1;
  const anchor=mirror?W-1-s.hipX:s.hipX;
  const M=(/** @type {number} */ x,/** @type {number} */ y)=>{ const mx=mirror?W-1-x:x; return toScreen(anchor+(mx-anchor)*view.scaleX+view.dx+.5,y+view.dy+.5); };
  const S=ink.S, H=M(s.torsoX,s.hipY), Sh=M(s.sx,s.sy+.5), lean=Math.atan2(Sh.x-H.x,-(Sh.y-H.y));
  const MT=new DOMMatrix().translateSelf(H.x,H.y).rotateSelf(lean*180/Math.PI).scaleSelf(f*S,Math.hypot(Sh.x-H.x,Sh.y-H.y)/104);
  const T=(/** @type {number} */ x,/** @type {number} */ y)=>{ const q=MT.transformPoint({x,y}); return {x:q.x,y:q.y}; };
  const fist=(/** @type {{x:number,y:number}} */ el,/** @type {{x:number,y:number}} */ g)=>{ const a=Math.atan2(g.y-el.y,g.x-el.x), wr={x:g.x-Math.cos(a)*12.5*S,y:g.y-Math.sin(a)*12.5*S};
    return {wr,M:new DOMMatrix().translateSelf(wr.x,wr.y).rotateSelf(a*180/Math.PI).scaleSelf(S*1.1,f*S*1.1),c:g}; };
  const boot=(/** @type {{x:number,y:number}} */ an,/** @type {{x:number,y:number}} */ heel,/** @type {{x:number,y:number}} */ toe)=>{ const dx=toe.x-heel.x, dy=toe.y-heel.y, a=f>0?Math.atan2(dy,dx):Math.atan2(-dy,-dx);
    return new DOMMatrix().translateSelf(an.x,an.y).rotateSelf(a*180/Math.PI*.6).scaleSelf(f*S,S).translateSelf(-2,13); };
  const elF=M(s.lex,s.ley), elN=M(s.rex,s.rey), fF=fist(elF,M(s.lgx,s.lgy)), fN=fist(elN,M(s.rgx,s.rgy));
  const anF=M(s.lax,s.lay), anN=M(s.rax,s.ray), neckB=T(3,-110), hc=M(s.headX,s.headY);
  const ha=Math.atan2(hc.x-neckB.x,-(hc.y-neckB.y))*.55+lean*.45;
  const MH=new DOMMatrix().translateSelf(hc.x,hc.y).rotateSelf(ha*180/Math.PI).scaleSelf(f*S*1.08,S*1.08);
  return {f,M,J:{MT,T,H,shF:M(s.lsx,s.lsy),elF,wrF:fF.wr,fF,shN:M(s.rsx,s.rsy),elN,wrN:fN.wr,fN,
    hipF:M(s.lhx,s.lhy),knF:M(s.lkx,s.lky),anF,bootF:boot(anF,M(s.lhex,s.lhey),M(s.ltx,s.lty)),
    hipN:M(s.rhx,s.rhy),knN:M(s.rkx,s.rky),anN,bootN:boot(anN,M(s.rhex,s.rhey),M(s.rtx,s.rty)),neckB,hc,MH},
    floorY:M(0,appearanceState.FLOOR_Y).y};
}

/** A new blow seen through the camera's punch-in (sparring's camKick): a woodcut burst where it landed. */
function watchBlows(){
  const C0=sparState.cam; if(!C0||isShadowboxing()) return;   // Cień punches the air: nothing lands
  if(C0.kickT>0&&(C0.kickT!==last.kickT||C0.px!==last.px||C0.py!==last.py)){
    const stop=C0.kickT<0.05, heavy=C0.kickT>=0.15, D=[sparState.FA,sparState.FB].sort((a,b)=>Math.abs(fighterView(a).x-C0.px)-Math.abs(fighterView(b).x-C0.px))[0];
    const body=!stop&&C0.py>(D?.S?.headY??0)+9, list=stop?PHRASES.stop:body?PHRASES.body:heavy?PHRASES.chin:PHRASES.head, R=Math.random;
    FX.push({x:C0.px,y:C0.py,t:boxingState.tick,s:stop?.55:heavy?1:.8,rot:(R()-.5)*.35,text:list[Math.floor(R()*list.length)],small:stop,seed:Math.floor(R()*1e6)});
  }
  last.px=C0.px; last.py=C0.py; last.kickT=C0.kickT;
}

/** Blood the clothes caught (sparring keeps it on the cloth sections, in the fighter's own frame), as screen points per
 * poster piece. Section order follows sparring's clothingSegments. @param {any} F @param {(x:number,y:number)=>{x:number,y:number}} M */
function bloodMarks(F,M){
  if(!F.blood?.length) return null;
  const S=F.S, boot=F.bt==='high'?.55:F.bt==='low'?.22:.4, bare=bareTorsoOut(F);
  const legs=[[S.rhx,S.rhy,S.rkx,S.rky],[S.rkx,S.rky,S.rax+(S.rkx-S.rax)*boot,S.ray+(S.rky-S.ray)*boot],[S.lhx,S.lhy,S.lkx,S.lky],[S.lkx,S.lky,S.lax+(S.lkx-S.lax)*boot,S.lay+(S.lky-S.lay)*boot]];
  const sec=[[S.rsx,S.rsy,S.rex,S.rey],[S.rex,S.rey,S.rex+(S.rgx-S.rex)*.72,S.rey+(S.rgy-S.rey)*.72],bare?[S.torsoX,S.hipY,S.torsoX,S.hipY+1]:[S.torsoX,S.hipY+1,S.sx,S.sy+2],
    ...(bare?[legs[2],legs[3],legs[0],legs[1]]:legs),[S.lsx,S.lsy,S.lex,S.ley],[S.lex,S.ley,S.lex+(S.lgx-S.lex)*.72,S.ley+(S.lgy-S.ley)*.72]];
  const keys=['sleeveN','foreN','torso',...(bare?['thighF','shinF','thighN','shinN']:['thighN','shinN','thighF','shinF']),'sleeveF','foreF'];
  /** @type {Record<string,{x:number,y:number,dark:boolean}[]>} */ const out={};
  for(const m of F.blood){ const q=sec[m.part]; if(!q) continue; const [ax,ay,bx,by]=q, dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy)||1;
    const p=M(ax+dx*m.t-dy/len*m.offset-.5,ay+dy*m.t+dx/len*m.offset-.5); (out[keys[m.part]]??=[]).push({...p,dark:m.color===sparState.C_STAIN||m.color===sparState.C_STAIN2}); }
  return out;
}

/** Blood on the boards (sparring stains its ring background) and the game's particles, in native units.
 * @param {boolean} smear the speed lines go behind the fighters, everything else in front */
function particles(smear){
  const B=boxingState, k=ink.px, ctx=ink.ctx;
  for(let i=0;i<B.MAXP;i++){ if(B.pL[i]<=0) continue; const t=B.pT[i]; if((t===B.P_SMEAR)!==smear) continue;
    const x=B.pX[i], y=B.pY[i], vx=B.pVX[i], vy=B.pVY[i], age=B.pM[i]-B.pL[i];
    if(t===B.P_SMEAR){ const dx=vx-x, dy=vy-y, L=Math.hypot(dx,dy)||1, nx=-dy/L, ny=dx/L; ctx.fillStyle=C.ink;
      for(const o of [-1.4,0,1.4]){ ctx.beginPath(); ctx.moveTo(x+nx*o,y+ny*o); ctx.lineTo(vx+nx*(o+.25),vy+ny*(o+.25)); ctx.lineTo(vx+nx*(o-.25),vy+ny*(o-.25)); ctx.fill(); } }
    else if(t===B.P_SWEAT||t===B.P_BIT){ const blood=t===B.P_BIT&&(B.pC[i]===sparState.C_BLOOD||B.pC[i]===sparState.C_BLOOD2), a=Math.atan2(vy,vx), r=blood?.55:.45;
      ctx.save(); ctx.translate(x+(blood?REG.x*k:0),y+(blood?REG.y*k:0)); ctx.rotate(a); const p=new Path2D(); p.moveTo(-r*3,0); p.quadraticCurveTo(-r,-r,0,-r); p.arc(0,0,r,-Math.PI/2,Math.PI/2); p.quadraticCurveTo(-r,r,-r*3,0);
      ctx.fillStyle=blood?C.red:t===B.P_BIT?C.cream:C.paper; ctx.fill(p); if(!blood){ ctx.lineWidth=.8*k; ctx.strokeStyle=C.ink; ctx.stroke(p); } ctx.restore(); }
    else if(t===B.P_SPARK) line([[x,y],[x-vx*2,y-vy*2]],1.3*k);
    else if(t===B.P_DUST){ ctx.fillStyle=C.drabD; ctx.beginPath(); ctx.arc(x,y,.35,0,7); ctx.fill(); }
    else if(t===B.P_RING){ ctx.globalAlpha=Math.max(0,1-age/12); ctx.beginPath(); ctx.arc(x,y,1.8+age*.85,0,7); ctx.lineWidth=1*k; ctx.strokeStyle=C.ink; ctx.stroke(); ctx.globalAlpha=1; }
    else if(t===B.P_STAR){ ctx.save(); ctx.translate(x,y); ctx.rotate(age*.3); const p=new Path2D(); for(let n=0;n<10;n++){ const a=n/10*Math.PI*2, r=n%2?.6:1.5; n?p.lineTo(Math.cos(a)*r,Math.sin(a)*r):p.moveTo(Math.cos(a)*r,Math.sin(a)*r); } p.closePath();
      ctx.fillStyle=C.ochre; ctx.fill(p); ctx.lineWidth=.8*k; ctx.strokeStyle=C.ink; ctx.stroke(p); ctx.restore(); }
  }
}
/** Profesor in his wheelchair at the edge of the cell, calling the combos of Cień. @param {number} t */
function profesor(t){
  const call=shadowProfCall(); if(!call) return;
  const up=call.age<40&&!!call.text, x=16, fy=appearanceState.FLOOR_Y, k=ink.px, ctx=ink.ctx;
  ctx.lineCap='round';
  for(const [cx,cy,r] of [[x+1,fy-7,7],[x+11,fy-2,2]]){ ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.lineWidth=3*k; ctx.strokeStyle=C.ink; ctx.stroke();
    for(let a=0;a<6;a++){ const q=a/6*Math.PI+t*.0; line([[cx-Math.cos(q)*r,cy-Math.sin(q)*r],[cx+Math.cos(q)*r,cy+Math.sin(q)*r]],.8*k); } }
  line([[x-4,fy-15],[x+9,fy-15],[x+11,fy-3]],2.4*k); line([[x-4,fy-15],[x-6,fy-30]],2.4*k);
  if(!LOOKS.has(profesor)) LOOKS.set(profesor,{ref:null,venue:'cell',id:5,look:Object.assign(posterLook({style:'bald',facial:'fullbeard',nose:'broken',extra:'none'},false,false),{shirt:C.drab,cloth:C.drabD,clothDark:false,scarf:true})});
  const L=/** @type {any} */(LOOKS.get(profesor)).look, S=34/360;
  const j=poseJoints({x:x+1,fy,S,f:1,fl1:82,fl2:6,nl1:76,nl2:2,lean:up?10:-6,head:up?6:-4,fa1:up?140:40,fa2:up?170:80,na1:30,na2:75});
  const keep={S:ink.S,px:ink.px}; ink.S=S; ink.px=.06;
  drawFigure({look:L,id:5,J:j.J,f:1,floorY:fy,noCast:true,box:{x:0,y:0,w:1,h:1},eye:up?1:0,mouth:up?1:0,claret:0});
  ink.S=keep.S; ink.px=keep.px;
}

/** Paint the fight over the pixel frame the renderer just presented. */
export function renderPosterFight(){
  const ctx=rendererState.sctx, vs=rendererState.vs, X0=rendererState.vx+boxingState.shX*vs, Y0=rendererState.vy+boxingState.shY*vs, t=boxingState.tick, v=sparState.sparVenue;
  const toScreen=(/** @type {number} */ x,/** @type {number} */ y)=>({x:X0+x*vs,y:Y0+y*vs}), world=()=>{ ctx.setTransform(vs,0,0,vs,X0,Y0); ink.px=.1; };
  const shadow=isShadowboxing();
  watchBlows();
  useContext(ctx); setBoil(Math.floor(t/10));
  ctx.save();   // over the pixel venue the renderer has already put on the screen
  if(shadow){ world(); profesor(t); ctx.setTransform(1,0,0,1,0,0); }
  world(); particles(true); ctx.setTransform(1,0,0,1,0,0);

  // the one punching is in front, a man on the boards behind
  const FA=sparState.FA, FB=sparState.FB, att=(/** @type {any} */ F)=>F.st>=0&&F.st<=3, down=(/** @type {any} */ F)=>F.st===animationState.S_KD||F.st===animationState.S_KO;
  let front=FA; if(att(FB)&&!att(FA)) front=FB; if(down(FA)) front=FB; else if(down(FB)) front=FA; if(shadow) front=FA;
  ink.S=vs/UNITS; ink.px=vs/10;
  for(const F of front===FA?[FB,FA]:[FA,FB]){
    const hero=F===FA, j=joints(F,toScreen), xs=[j.J.H.x,j.J.hc.x,j.J.fF.c.x,j.J.fN.c.x], ys=[j.J.hc.y,j.J.fF.c.y,j.J.fN.c.y,j.floorY];
    let pl=LOOKS.get(F); if(!pl||pl.ref!==F.look||pl.venue!==v){ pl={ref:F.look,venue:v,look:posterLook(F.look,hero,v==='laznia'),id:hero?0:1}; LOOKS.set(F,pl); }
    const m=70*ink.S, bx=Math.min(...xs)-m, by=Math.min(...ys)-m, W2=isCardFight()?F.wounds:null;
    const hurt=F.hurt>0||down(F)||(F.stun||0)>0, ghost=shadow&&!hero;
    const fig={look:pl.look,id:pl.id,J:j.J,f:j.f,floorY:j.floorY,box:{x:bx,y:by,w:Math.max(...xs)+m-bx,h:Math.max(...ys)+m-by},noCast:ghost,
      eye:hurt?2:att(F)?1:0,mouth:F.hurt>0||down(F)?1:0,claret:F.dmg>0.25?Math.ceil(F.dmg*3)+(W2?.nose?1:0):W2?.nose?2:0,swollen:F.dmg>0.7||!!(W2?.eyeL||W2?.eyeR),
      wounds:W2,knuckleF:!!W2?.handL,knuckleN:!!W2?.handR,marks:bloodMarks(F,j.M)};
    if(ghost) ghostFigure(ctx,fig); else drawFigure(fig);
  }

  world(); particles(false); ctx.setTransform(1,0,0,1,0,0);
  for(let i=FX.length-1;i>=0;i--){ const e=FX[i], age=t-e.t; if(age>32||age<0){ FX.splice(i,1); continue; }
    const sc=age<3?.55:age<9?1.15:age<25?1:.7, p=toScreen(e.x,e.y-4);
    starburst(p.x,p.y,e.s*sc*vs/6.5,e.rot,e.text,e.small,e.seed+Math.floor(t/10)); }
  captions(ctx,toScreen,vs,t);
  ctx.restore();
}

/** @type {{c:HTMLCanvasElement|null}} */ const GHOST={c:null};
/** Cień's imagined opponent: the whole figure printed faintly, as if through the paper. @param {CanvasRenderingContext2D} ctx @param {any} fig */
function ghostFigure(ctx,fig){
  const W=ctx.canvas.width, H=ctx.canvas.height; let g=GHOST.c; if(!g){ g=GHOST.c=document.createElement('canvas'); } if(g.width!==W||g.height!==H){ g.width=W; g.height=H; }
  const b=fig.box, x=Math.max(0,Math.floor(b.x)), y=Math.max(0,Math.floor(b.y)), w=Math.min(W,Math.ceil(b.x+b.w))-x, h=Math.min(H,Math.ceil(b.y+b.h))-y; if(w<=0||h<=0) return;
  const gc=/** @type {CanvasRenderingContext2D} */(g.getContext('2d')); gc.setTransform(1,0,0,1,0,0); gc.clearRect(x,y,w,h);
  useContext(gc); drawFigure(fig); useContext(ctx);
  ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=.3; ctx.drawImage(g,x,y,w,h,x,y,w,h); ctx.restore();
}

/** Wood type over the fight: the game's popups ("WALCZ!", grades, counts) and the pivot (the yard's torn hood and its cry stay in the pixel venue).
 * @param {CanvasRenderingContext2D} ctx @param {(x:number,y:number)=>{x:number,y:number}} toScreen @param {number} vs @param {number} t */
function captions(ctx,toScreen,vs,t){
  const B=boxingState;
  const words=[];
  for(let i=0;i<B.MAXPU;i++){ if(B.puL[i]<=0||(B.puL[i]<8&&(B.puL[i]&1))) continue; const txt=B.TXT[B.puT[i]]; if(txt) words.push({txt,x:B.puX[i],y:B.puY[i],sc:B.puS[i],c:B.puC[i]}); }
  if(sparState.SP?.pivot) words.push({txt:'PIVOT',x:72,y:30,sc:1,c:0});
  for(const w of words){
    const r=w.c&255, g=(w.c>>8)&255, size=Math.round(5.2*w.sc*vs), p=toScreen(w.x,w.y+2.5*w.sc); p.y=Math.max(p.y,size*.75+8);
    ctx.save(); ctx.font=`${size}px Ultra, Rye, Georgia, serif`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.lineJoin='round';
    ctx.lineWidth=size*.22; ctx.strokeStyle=C.paper; ctx.strokeText(w.txt,p.x,p.y);
    if(r>150&&g<120){ ctx.fillStyle=C.red; ctx.fillText(w.txt,p.x+REG.x,p.y+REG.y); ctx.lineWidth=size*.04; ctx.strokeStyle=C.ink; ctx.strokeText(w.txt,p.x,p.y); }
    else { ctx.fillStyle=C.ink; ctx.fillText(w.txt,p.x+size*.05,p.y+size*.05); ctx.fillStyle=r>150&&g>150?C.ochre:C.ink; ctx.fillText(w.txt,p.x,p.y); }
    ctx.restore(); }
}
