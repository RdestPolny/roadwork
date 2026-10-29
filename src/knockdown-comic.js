/* The knockdown comic: a short live close-up, then a page of three panels that replay the blow and the fall (the punch, the fall,
   the boards) and the live close-up again. The fight records the two figures each tick of the fall; every panel draws them with its
   own camera, centred on the fighters and turned around them, over the venue's floor seen from the same turn. Presentation only. */

import { state as appearanceState, rgb } from './appearance.js';
import { state as gymState, figureHD, setPropCamera, shadeC } from './gym.js';
import { state as rendererState, setFramebuffer, HD_K } from './renderer.js';
import { drawChar } from './boxing.js';
import { floorCol as wardFloor } from './ward.js';
import { floorCol as yardFloor } from './exercise-yard.js';
import { floorCol as bathFloor } from './bath.js';
import { quayFloor } from './thames-port.js';

// Runtime values owned by the comic; startKnockdownComic() resets them.
export const state = {frames:/** @type {any[]} */ ([]),victim:1,pid:0,low:false,venue:'cell',panels:/** @type {any[]} */ ([]),scratch:/** @type {Uint32Array|null} */ (null),
  framing:/** @type {({dx:number,dy:number}|null)[]} */ ([])};

/** Real seconds: the live close-up before the page, the second and third panels' entrances, the white flash of a new panel and the live close-up after the page. */
const ENTER=0.3, P2_AT=1.0, P3_AT=2.2, FLASH=0.035, LEAVE=0.25;
const PAGE=rgb('#100e10'), INK=rgb('#060506'), RIM=rgb('#d2c4a7'), FLASH_C=rgb('#f4eee2'), VOID=rgb('#1c191d');
const PAPER=rgb('#e3d6b6'), LETTER=rgb('#1b1516'), BLOOD=rgb('#8e1f1c');
const PUNCH=['JAB','PROSTY','SIERPOWY','PODBRODKOWY'];

/** The knockdown page is designed at 288×192 and scaled with the active room (2× or 3×). turn: the camera's turn from a side-on
 *  view of the blow (the attacker on the left, the victim on the right in every panel); zoom: picture pixels per figure pixel;
 *  light: radius of the pool of light in tiles; shift: the figures moved across the panel, as a share of its width. */
const LAYOUT=[
  {poly:[[6,6],[172,6],[150,92],[6,92]],turn:0,zoom:2.5,light:2.4,shift:0,at:ENTER},
  {poly:[[178,6],[282,6],[282,92],[156,92]],turn:0.75,zoom:1.9,light:2.8,shift:0,at:P2_AT},
  {poly:[[6,98],[282,98],[282,186],[6,186]],turn:0.35,zoom:1.35,light:3.6,shift:-0.17,at:P3_AT}];

/** Begin a comic for the fall that starts now. @param {number} victim 0 the hero, 1 the rival @param {number} pid @param {boolean} low @param {string} venue */
export function startKnockdownComic(victim,pid,low,venue){
  Object.assign(state,{frames:[],victim,pid,low,venue,panels:[],framing:[]});
}

/** Keep one tick of the fall: per fighter its place, facing, look, outfit and joints. @param {any[]} frame */
export function recordKnockdownComicFrame(frame){ state.frames.push(frame); }

/** Is the page on screen at this moment, rather than the live close-up around it? @param {number} elapsed @param {number} left real seconds */
export function knockdownComicOnScreen(elapsed,left){ return elapsed>=ENTER&&left>LEAVE; }

/** The page over the whole picture: the panels shown so far and their captions.
 *  @param {number} elapsed real seconds since the blow
 *  @param {{title:string,line:string,pips:number[]|null}} caption the third panel's words; pips: taps made and taps needed to rise */
export function drawKnockdownComic(elapsed,caption){
  const S=state, W=appearanceState.W, H=appearanceState.H, dest=rendererState.fb, n=S.frames.length;
  dest.fill(PAGE); if(!n) return;
  if(S.scratch?.length!==W*H) S.scratch=new Uint32Array(W*H);
  for(let k=0;k<LAYOUT.length;k++){
    const L=LAYOUT[k]; if(elapsed<L.at) break;
    const P=S.panels[k]||(S.panels[k]=panel(L,k,n)), flash=elapsed-L.at<FLASH, idx=frameAt(k,elapsed,n);
    if(!flash&&idx!==P.idx){ P.idx=idx; renderPanel(P,S.frames[idx]); S.framing[k]=P.framing; }
    for(let y=0;y<P.h;y++) for(let x=0;x<P.w;x++){
      const m=P.mask[y*P.w+x]; if(!m) continue;
      dest[(P.y+y)*W+P.x+x]=m===1?INK:m===2?RIM:flash?FLASH_C:P.img[y*P.w+x];
    }
  }
  const P1=S.panels[0], P3=S.panels[2];
  const q=gymState.ISO_K/HD_K;
  if(P1) label(P1.x+Math.round(8*q),P1.y+Math.round(8*q),[[PUNCH[S.pid]+(S.low?' NA KORPUS':''),2,LETTER]],null);
  if(P3&&elapsed>=P3_AT+0.3) label(P3.x+P3.w-Math.round(8*q),P3.y+Math.round(8*q),[[caption.title,3,BLOOD],[caption.line,2,LETTER]],caption.pips,true);
}

/** Which recorded tick a panel shows now: the moment of contact, the fall, then the landing held. @param {number} k @param {number} elapsed @param {number} n */
function frameAt(k,elapsed,n){
  if(k===0) return Math.min(2,n-1);
  const t=k===1?Math.min(1,(elapsed-P2_AT)/(P3_AT-P2_AT)):Math.min(1,(elapsed-P3_AT)/1.1);
  return Math.round((k===1?t*0.65:0.35+t*0.65)*(n-1));
}

/** A panel's fixed parts: its box, the ink/rim/inside mask, the turn and the point the camera looks at. @param {any} L @param {number} k @param {number} n */
function panel(L,k,n){
  const S=state, q=gymState.ISO_K/HD_K, poly=L.poly.map((/** @type {number[]} */ p)=>[Math.round(p[0]*q),Math.round(p[1]*q)]);
  const xs=poly.map(p=>p[0]), ys=poly.map(p=>p[1]);
  const x=Math.min(...xs)-1, y=Math.min(...ys)-1, w=Math.max(...xs)-x+1, h=Math.max(...ys)-y+1, mask=new Uint8Array(w*h);
  for(let py=0;py<h;py++) for(let px=0;px<w;px++){
    let d=Infinity;
    for(let e=0;e<poly.length;e++){   // the distance inside each edge of the convex panel (clockwise on screen)
      const [x0,y0]=poly[e], [x1,y1]=poly[(e+1)%poly.length], dx=x1-x0, dy=y1-y0;
      d=Math.min(d,((y+py+0.5-y0)*dx-(x+px+0.5-x0)*dy)/Math.hypot(dx,dy));
    }
    mask[py*w+px]=d<-1?0:d<0?1:d<2?2:3;
  }
  // the camera turns about the pair at the blow so that the line from the attacker to the victim lies across the panel, then by the panel's turn
  const f0=S.frames[0], V0=f0[S.victim].C, A0=f0[1-S.victim].C, last=S.frames[n-1][S.victim].C;
  const pivot={i:(V0.i+A0.i)/2,j:(V0.j+A0.j)/2}, a=-Math.PI/4+L.turn-Math.atan2(V0.j-A0.j,V0.i-A0.i);
  const P={x,y,w,h,mask,img:new Uint32Array(w*h),floor:/** @type {Uint32Array|null} */ (null),zoom:L.zoom,cx:w*(0.5+L.shift),light:L.light,co:Math.cos(a),si:Math.sin(a),pivot,idx:-1,
    focus:{i:0,j:0,z:0},framing:/** @type {{dx:number,dy:number}|null} */ (null)};
  const at=(/** @type {number} */ i,/** @type {number} */ j,/** @type {number} */ z)=>{ const [ri,rj]=turn(P,i,j); P.focus={i:ri,j:rj,z}; };
  if(k===0) at(A0.i+(V0.i-A0.i)*0.55,A0.j+(V0.j-A0.j)*0.55,13);   // the fist on the jaw
  else if(k===1) at(V0.i*0.55+last.i*0.45,V0.j*0.55+last.j*0.45,8);   // the fall, the whole man
  else at(last.i*0.7+pivot.i*0.3,last.j*0.7+pivot.j*0.3,6);   // the boards and the one still standing
  return P;
}

/** A room point turned about the panel's pivot. @param {any} P @param {number} i @param {number} j @returns {[number,number]} */
function turn(P,i,j){ const di=i-P.pivot.i, dj=j-P.pivot.j; return [P.pivot.i+di*P.co-dj*P.si,P.pivot.j+di*P.si+dj*P.co]; }

/** The venue's floor at a room point, or 0 where there is none. @param {number} i @param {number} j */
function floorAt(i,j){
  if(state.venue==='port') return quayFloor(i,j);
  const f=gymState.hubRoom==='yard'?yardFloor:gymState.hubRoom==='laznia'?bathFloor:wardFloor;
  return f(gymState.HUB_OX+(i-j)*6,gymState.HUB_OY+(i+j)*3);
}

/** Draw one recorded tick into a panel: the figures through the panel's camera, over its lit floor. @param {any} P @param {any[]} frame */
function renderPanel(P,frame){
  const W=appearanceState.W, H=appearanceState.H, K=gymState.ISO_K, scratch=/** @type {Uint32Array} */ (state.scratch), F=P.focus;
  const cam={ix:6*K,jx:-6*K,iy:3*K,jy:3*K,z:K,figureScale:K,x:0,y:0};
  cam.x=W/2-(F.i*cam.ix+F.j*cam.jx); cam.y=H/2-(F.i*cam.iy+F.j*cam.jy-F.z*cam.z);
  if(!P.floor){   // the floor does not move: light it once from the point the camera looks at
    P.floor=new Uint32Array(P.w*P.h);
    for(let py=0;py<P.h;py++) for(let px=0;px<P.w;px++){
      if(P.mask[py*P.w+px]!==3) continue;
      const a=(W/2+(px-P.cx)/P.zoom-cam.x)/cam.ix, b=(H/2+(py-P.h/2)/P.zoom-cam.y)/cam.iy, ri=(a+b)/2, rj=(b-a)/2;
      const di=ri-P.pivot.i, dj=rj-P.pivot.j, c=floorAt(P.pivot.i+di*P.co+dj*P.si,P.pivot.j-di*P.si+dj*P.co);
      const light=0.16+0.84*Math.max(0,1-Math.hypot(ri-F.i,rj-F.j)/P.light)**2;
      P.floor[py*P.w+px]=shadeC(c||VOID,light);
    }
  }
  const figures=frame.map(f=>{ const [i,j]=turn(P,f.C.i,f.C.j); return {f,C:{...f.C,i,j,fi:f.C.fi*P.co-f.C.fj*P.si,fj:f.C.fi*P.si+f.C.fj*P.co}}; })
    .sort((a,b)=>a.C.i+a.C.j-b.C.i-b.C.j);
  scratch.fill(0);
  const prevFb=setFramebuffer(scratch), prevCam=setPropCamera(cam);
  try { for(const {f,C} of figures) f.wrap(()=>figureHD(C,f.joints,f.look,{noShadow:true,tilt:f.tilt})); }
  finally { setPropCamera(prevCam); setFramebuffer(prevFb); }
  let sx=0, sy=0, seen=0;
  for(let py=0;py<P.h;py++) for(let px=0;px<P.w;px++){
    const q=py*P.w+px; if(P.mask[q]!==3) continue;
    const x=Math.floor(W/2+(px-P.cx)/P.zoom), y=Math.floor(H/2+(py-P.h/2)/P.zoom), c=x>=0&&x<W&&y>=0&&y<H?scratch[y*W+x]:0;
    if(c){ sx+=px; sy+=py; seen++; }
    P.img[q]=c||P.floor[q];
  }
  P.framing=seen?{dx:(sx/seen-P.cx)/P.w,dy:(sy/seen-P.h/2)/P.h}:null;   // where the figures sit in the panel, for the tests
}

/** A caption box of capital lines (text, letter size, colour), with an optional row of taps; (x,y) is its top left corner, or top right.
 *  @param {number} x @param {number} y @param {[string,number,number][]} lines @param {number[]|null} pips @param {boolean} [right] */
function label(x,y,lines,pips,right=false){
  lines=lines.filter(l=>l[0]); if(!lines.length) return;
  const q=gymState.ISO_K/HD_K, font=/** @type {number} */ (sc)=>Math.max(1,Math.round(sc*q));
  const pad=Math.round(4*q), pipSize=Math.round(6*q), pipStep=Math.round(9*q), pipH=pips?Math.round(10*q):0;
  const w=Math.max(...lines.map(([t,sc])=>t.length*4*font(sc)-font(sc)),pips?pips[1]*pipStep-Math.round(3*q):0)+pad*2;
  const h=lines.reduce((s,[,sc])=>s+5*font(sc)+Math.round(3*q),0)-Math.round(3*q)+pipH+pad*2;
  const top=y, W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb;
  if(right) x-=w;
  for(let yy=top-1;yy<=top+h;yy++) for(let xx=x-1;xx<=x+w;xx++){
    if(xx<0||yy<0||xx>=W||yy>=H) continue;
    fb[yy*W+xx]=yy<top||yy===top+h||xx<x||xx===x+w?INK:PAPER;
  }
  let ly=top+pad;
  for(const [t,sc,c] of lines){ const fs=font(sc); for(let k=0;k<t.length;k++) drawChar(t.charCodeAt(k),x+pad+k*4*fs,ly,c,fs); ly+=5*fs+Math.round(3*q); }
  if(pips) for(let k=0;k<pips[1];k++) for(let yy=0;yy<pipSize;yy++) for(let xx=0;xx<pipSize;xx++){
    const edge=xx===0||yy===0||xx===pipSize-1||yy===pipSize-1, tx=x+pad+k*pipStep+xx, ty=ly+yy;
    if(tx<0||ty<0||tx>=W||ty>=H) continue;
    if(k<pips[0]||edge) fb[ty*W+tx]=k<pips[0]?BLOOD:LETTER;
  }
}
