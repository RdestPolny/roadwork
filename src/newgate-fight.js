/* Newgate fights seen from the side (native 144×96): the Ward (venue 'cell', and 'canteen' = a fight at the meal) and
   the exercise yard ('yard'). Each has a cached back wall and floor and per-frame light and people behind the fight: in
   the Ward the tallow and the barred window light the wall, a shaft of dust and the cellmates standing in the dark (shaded
   per pixel, faces sunk in shadow); on the yard the hooded procession in the smog. On the yard the rival tears his hood off as the fight starts — it lies on the setts for the rest of it. */

import { state as appearanceState, rgb, setRamp } from './appearance.js';
import { state as rendererState, pset, taper, disc, shadowEll } from './renderer.js';
import { state as boxingState, h2, drawText, drawChar } from './boxing.js';
import { state as gymState } from './gym.js';
import { mix } from './cast.js';

// Runtime values owned by newgate-fight; initialized explicitly by main.js.
export const state = {};

const C = {};
const WALL_FLOOR = 75;
/** @param {number} c @param {number} k */
const shade=(c,k)=>(0xff000000|(Math.min(255,((c>>16)&255)*k)<<16)|(Math.min(255,((c>>8)&255)*k)<<8)|Math.min(255,(c&255)*k))>>>0;
/** The tallow lamp on the Ward's wall, on the left. */
const LAMP = [16,31];

/** Stone flags in perspective from the wall line to the bottom of the picture. @param {number} x @param {number} y @param {number[]} P @param {number} J */
function flags(x,y,P,J){
  const dz=y-38, u=(x-72)/dz*7.5, rows=[75,77,80,84,89,95]; let row=0; while(row<rows.length-1&&y>=rows[row+1]) row++;
  const fu=u-Math.floor(u+(row&1)*0.5), gw=0.8/dz*7.5;
  let c=(rows.includes(y)||fu<gw)?J:P[h2(Math.floor(u+(row&1)*0.5)*5+1,row*11+2)%3];
  if(y<78) c=shade(c,0.7);
  return c;
}

/* ---------- the Ward ---------- */

/** The barred window high on the right: its embrasure, the opening and the bars. */
const WIN = {x0:95,x1:109,y0:11,y1:20};
/** Is (x, y) open sky between the bars of the window? @param {number} x @param {number} y */
const winSky=(x,y)=>x>=WIN.x0&&x<=WIN.x1&&y>=WIN.y0&&y<=WIN.y1&&(x-WIN.x0)%5!==2&&(x-WIN.x0)%5!==3&&y!==15;
/** The crack running down from the vault: its x at height y. @param {number} y */
const crackX=(y)=>58+(y-6)*0.18+5*(vnoise(y*0.16,5.3)-0.5)+1.5*(vnoise(y*0.6,8.1)-0.5);

/** Old limewash on the brick: how much of it is still on at (x, y) (peeled where < 0.47). @param {number} x @param {number} y */
const limeOn=(x,y)=>fbm(x*0.05+3.1,y*0.085+1.7)+0.16*vnoise(x*0.31,y*0.45+4)+0.06*vnoise(x*0.9,y*1.1+2)+0.07-Math.max(0,(y-30)*0.004);
/** One pixel of the Ward's back wall (unlit; the light falls on it per frame). @param {number} x @param {number} y */
function wardWall(x,y){
  const t=((x%48)/48-0.5)*2, arch=4+7*t*t; let c;
  if(y<arch-2) return mix(C.vault,C.soot,0.5+0.5*vnoise(x*0.2,y*0.4));                         // the vault, black with soot
  if(y<arch){ const r=Math.floor((x+(y&1)*2)/4); return ((x+(y&1)*2)%4===0)?C.joint:shade(C.stoneD,0.75+0.1*(h2(r,3)&3)); }   // the voussoirs of the arch
  if(y<42){
    const br=Math.floor((y-2)/3), bu=x+(br&1)*3, mort=((y-2)%3)===0||(bu%6)===0, L=limeOn(x,y);
    if(L>0.47){ c=mix(C.lime[0],C.lime[1],vnoise(x*0.14,y*0.21+9)); if(limeOn(x,y+1)<=0.47) c=mix(c,C.limeL,0.2); else if(limeOn(x,y-1)<=0.47) c=shade(c,0.8); }   // a lip where it flakes
    else { c=mort?C.mortar:C.brick[h2(Math.floor(bu/6),br)%3]; if(!mort&&((y-2)%3)===1) c=shade(c,1.08);
      if(limeOn(x,y-1)>0.47) c=shade(c,0.7); else if(mort) c=mix(c,C.limeD,0.25); }               // the lime overhang shades the brick under it
    const s=Math.max(0,0.8-(y-arch)/26)+0.75*vnoise(x*0.31+7,2.3)**3*Math.max(0,1-(y-arch)/36);    // soot from the vault and run down in streaks
    const plume=y<34?0.85*Math.exp(-(((x-17.5)/(1.6+(34-y)*0.3))**2))*Math.min(1,(34-y)/5):0;      // and black above the lamp
    c=mix(c,C.soot,Math.min(0.9,s+plume));
    if(x>=WIN.x0-3&&x<=WIN.x1+3&&y>21){ const r=vnoise(x*0.7,3.3); if(r>0.55) c=mix(c,C.rust,Math.min(0.55,(r-0.55)*2.4)*Math.max(0,1-(y-21)/16)); }   // rust bled from the bars
    const tide=31+5*fbm(x*0.07,9.3);                                                                 // rising damp, salt at its edge
    if(y>tide) c=mix(c,C.damp,0.3+0.3*vnoise(x*0.2,y*0.3)); else if(y>tide-1.2) c=mix(c,C.salt,0.35);
    if(y>arch+1&&y<40){ const cx=crackX(y); if(Math.abs(x-cx)<0.55) c=C.crack; else if(Math.abs(x-cx-1)<0.55) c=mix(c,C.limeL,0.25); }
    return c; }
  if(y<44) return y===42?mix(C.stoneT,C.soot,0.3*vnoise(x*0.2,1)):shade(C.stone,0.8);             // the string course
  if(y<58){ const row=Math.floor((y-44)/7), bx=Math.floor((x+row*11)/22), lx=(x+row*11)%22, ly=(y-44)%7;   // ashlar, chiselled
    if(ly===0||lx===0) return C.joint;
    c=C.ash[h2(bx,row)%3]; if(ly===1||lx===1) c=shade(c,1.12); else if(ly===6||lx===21) c=shade(c,0.78);
    c=mix(c,C.damp,0.25+0.35*vnoise(x*0.12,y*0.2+row));
    const wet=vnoise(x*0.45,7.7); if(wet>0.58) c=mix(c,C.wet,(wet-0.58)*2*Math.min(1,(y-44)/6));     // water run down from the tide
    if(y>51) c=mix(c,C.slime,Math.min(0.6,(y-51)*0.09*(0.6+0.8*vnoise(x*0.18,4.4))));
    return c; }
  if(y===58) return mix(C.bedH,C.bed,vnoise(x*0.3,2));                                               // the guard-bed: its worn edge,
  if(y===59) return C.bedK;
  if(y<67){ const j=(x+3)%23; if(j===0) return C.bedK; if(y===66) return shade(C.bedF,0.6);         //   the front board, grain and nails,
    c=mix(C.bedF,C.bed,0.35*vnoise(x*0.06,y*0.9+2)+0.15); if((j===2||j===21)&&(y===61||y===64)) c=C.nail;
    return c; }
  if(y<WALL_FLOOR) return ((x%22)<2)?shade(C.bedF,0.55):C.under;                                    //   black underneath, the trestles
  return flags(x,y,C.flag,C.fjoint);
}

/** The Ward behind a fight, into rendererState.fb (the ring buffer): the wall unlit — the lamp and the window light it
 * per frame (wardFightBack). Also the wall behind the push-ups. */
export function wardFightBg(){
  const fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H;
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ if(x>=0&&x<w&&y>=0&&y<h) fb[y*w+x]=c; };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) fb[y*w+x]=wardWall(x,y);
  for(let y=WIN.y0-3;y<=WIN.y1+3;y++) for(let x=WIN.x0-4;x<=WIN.x1+4;x++){                        // the window: a splayed reveal,
    const ex=Math.max(WIN.x0-x,x-WIN.x1,0), ey=Math.max(WIN.y0-y,y-WIN.y1,0); if(!ex&&!ey) continue;
    if(y>WIN.y1&&y<=WIN.y1+2) px(x,y,y===WIN.y1+1?C.stoneT:C.stone); else px(x,y,x<WIN.x0?shade(C.stone,0.95-ex*0.08):y<WIN.y0?shade(C.stoneD,0.9):shade(C.stoneD,0.7)); }
  for(let y=WIN.y0;y<=WIN.y1;y++) for(let x=WIN.x0;x<=WIN.x1;x++) px(x,y,winSky(x,y)?C.sky:((x-WIN.x0)%5===2||y===15)?C.ironH:C.iron);   //   bars over the smog
  for(let y=WIN.y0-1;y<=WIN.y1+1;y++) for(let x=WIN.x1+5;x<WIN.x1+11;x++){ const top=WIN.y0-1+Math.round((x-WIN.x1-5)*0.35);   //   the plank shutter swung open
    if(y<top||y>WIN.y1+1-Math.round((x-WIN.x1-5)*0.35)) continue; px(x,y,(x-WIN.x1)%3===0?C.bedK:(y===WIN.y0+2||y===WIN.y1-1)?C.iron:mix(C.bedF,C.bed,vnoise(x*0.5,y*0.3))); }
  for(const cx of [30,82]){ for(let a=0;a<6.28;a+=0.35) px(Math.round(cx+Math.cos(a)*2),Math.round(48+Math.sin(a)*2),a>3.5?C.ironH:C.iron);   // rings, chains down to the planks
    for(let y=50;y<58;y++){ px(cx+((y>>1)&1),y,(y&1)?C.ironH:C.iron); if(y&1) px(cx+((y>>1)&1)+1,y+1,shade(fb[(y+1)*w+cx+2]||C.iron,0.7)); } }
  for(const [x0,x1] of [[2,28],[50,74],[96,122]]) for(let x=x0;x<x1;x++){ const hump=1.6*Math.sin(Math.PI*(x-x0)/(x1-x0))+0.6*vnoise(x*0.4,3);   // straw pallets, sacking split
    for(let y=Math.round(57.4-hump);y<58;y++) px(x,y,mix(C.tickD,C.tick,vnoise(x*0.5,y*0.8))); }
  for(let s=0;s<26;s++){ const x=4+h2(s,41)%118, y=56+(h2(s,42)&1), dx=(h2(s,43)&1)?1:-1; if((x>27&&x<50)||(x>73&&x<96)) continue; px(x,y,C.straw); px(x+dx,y+1,shade(C.straw,0.75)); }   // straws poking out
  const scr=(/** @type {number} */ x0,/** @type {number} */ y0,/** @type {number} */ x1,/** @type {number} */ y1)=>{ const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));   // a line cut into the lime
    for(let i=0;i<=n;i++){ const x=Math.round(x0+(x1-x0)*i/n), y=Math.round(y0+(y1-y0)*i/n); px(x,y,mix(fb[y*w+x],C.scratch,0.55)); px(x,y+1,shade(fb[(y+1)*w+x],0.7)); } };
  scr(64,36,70,36); scr(66,36,66,25); scr(66,25,71,25); scr(66,28,68,26); scr(70,25,70,27);           // a gallows, the noose,
  for(let a=0;a<6.28;a+=0.6) px(Math.round(70+Math.cos(a)),Math.round(28.5+Math.sin(a)),mix(fb[Math.round(28.5+Math.sin(a))*w+Math.round(70+Math.cos(a))],C.scratch,0.5));
  scr(70,30,70,33); scr(70,31,69,32); scr(70,31,71,32);                                              //   a man hanging in it
  for(let g=0;g<4;g++){ const x0=24+g*7; for(let m=0;m<4;m++) scr(x0+m,34-(g&1),x0+m,37-(g&1)); scr(x0-1,37-(g&1),x0+4,34-(g&1)); }   // the days, five by five
  for(const [s,x,y] of [['1867',118,26],['J.M.',36,25]]) for(let k=0;k<s.length;k++) drawChar(s.charCodeAt(k),x+k*4,y,mix(C.scratch,C.limeD,0.6),1);
  for(let y=24;y<34;y++) px(LAMP[0],y+4,C.iron); for(let x=LAMP[0]-1;x<=LAMP[0]+3;x++) px(x,LAMP[1]+3,C.iron);   // the lamp's bracket
  for(let y=62;y<WALL_FLOOR+1;y++) for(let x=128;x<140;x++){ const e=x===128||x===139; px(x,y,e?C.bedK:((y===65||y===71)?C.iron:(x<132?C.bedF:C.bed))); }   // the night tub in the corner
  for(let x=118;x<144;x++){ const k=vnoise(x*0.3,6.6); if(k>0.4) px(x,WALL_FLOOR+1+(k>0.6?1:0),mix(C.flag[1],C.piss,Math.min(1,(k-0.4)*3))); }
}

/* The cellmates watching: dark shapes in the gloom by the walls, no faces, no cloth to be seen — only an edge caught by
   the tallow or by the grey window behind them. Each is a handful of capsules at sub-pixel positions, filled flat; they
   breathe, shift their weight and turn their heads after the fight. */

/** The watchers: x feet, fy feet line, k size, arms, stoop, a flat cap, tilt (weight on one leg, + = on his left). */
const WATCHERS = [
  {x:9.5,fy:77.5,k:1.0,arms:'behind',stoop:1.6,cap:false,tilt:0.8},
  {x:24.5,fy:78,k:1.07,arms:'fist',stoop:0.5,cap:true,tilt:-0.5},
  {x:41.5,fy:73.6,k:1.0,arms:'sit',stoop:0,cap:false,tilt:0},
  {x:123.5,fy:77.5,k:1.04,arms:'hang',stoop:0.7,cap:true,tilt:-0.9},
  {x:135.5,fy:78.5,k:0.96,arms:'fold',stoop:2.0,cap:false,tilt:0.6},
];

/** Fill capsules [ax,ay,r0,bx,by,r1] as one dark shape on the frame; its outer edge facing the lamp or the window
 * catches a little light. @param {number[][]} parts @param {number} fl @param {number} cl */
function drawSil(parts,fl,cl){
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H;
  let x0=W,x1=0,y0=H,y1=0; for(const p of parts){ const r=Math.max(p[2],p[5]); x0=Math.min(x0,p[0]-r,p[3]-r); x1=Math.max(x1,p[0]+r,p[3]+r); y0=Math.min(y0,p[1]-r,p[4]-r); y1=Math.max(y1,p[1]+r,p[4]+r); }
  x0=Math.max(0,Math.floor(x0)-1); x1=Math.min(W-1,Math.ceil(x1)+1); y0=Math.max(0,Math.floor(y0)-1); y1=Math.min(H-1,Math.ceil(y1)+1);
  const bw=x1-x0+1, m=new Uint8Array(bw*(y1-y0+1));
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const px=x+0.5, py=y+0.5;
    for(const [ax,ay,r0,bx,by,r1] of parts){ const dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy, s=L2?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/L2)):0, ex=px-ax-dx*s, ey=py-ay-dy*s, r=r0+(r1-r0)*s;
      if(ex*ex+ey*ey<r*r){ m[(y-y0)*bw+x-x0]=1; break; } } }
  const out=(/** @type {number} */ x,/** @type {number} */ y)=>x<x0||x>x1||y<y0||y>y1||!m[(y-y0)*bw+x-x0];
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ if(!m[(y-y0)*bw+x-x0]) continue;
    const l=wallLight(x,y,fl,cl), p=y*W+x; let c=mix(C.silh,C.silhL,Math.min(1,(l[0]+l[1])*0.12));
    const sl=LAMP[0]+1>x?1:-1, sw=102>x?1:-1, dl=Math.hypot(x-LAMP[0]-1,(y-LAMP[1])*1.1), dw=Math.hypot(x-102,y-16);
    const il=fl*1.2/(1+(dl/28)**2), iw=cl/(1+(dw/36)**2);
    const a=il*(out(x+sl,y)?0.9:out(x,y-1)?0.45:0), b=iw*(out(x+sw,y)?0.7:out(x,y-1)?0.8:0);
    if(a>0.08) c=mix(c,C.rimW,Math.min(0.8,a)); if(b>0.08) c=mix(c,C.rimC,Math.min(0.65,b));
    M[p]=c; }
}

/** One cellmate as capsules: in a greatcoat to the knees, the shoulders dropped, standing (arms hanging, folded, behind
 * him, a fist that rises with the fight) or sitting on the edge of the guard-bed, elbows on the knees.
 * @param {any} o @param {number} id @param {number} t @param {number} e excitement 0..1 @returns {number[][]} */
function watcherParts(o,id,t,e){
  const k=o.k, d=o.x<72?1:-1, br=Math.sin(t*2*Math.PI/(150+id*23)+id), sw=0.55*Math.sin(t*0.0047+id*1.7)**3, P=[];
  const look=d*(0.3+0.5*e)+0.25*Math.sin(t*0.0021+id*2.3);
  const X=(/** @type {number} */ lx,/** @type {number} */ ly)=>o.x+lx*k-sw*ly/36*k, Y=(/** @type {number} */ ly)=>o.fy+ly*k;
  const cap=(/** @type {number[]} */ a,/** @type {number} */ r0,/** @type {number[]} */ b,/** @type {number} */ r1)=>P.push([X(a[0],a[1]),Y(a[1]),r0*k,X(b[0],b[1]),Y(b[1]),r1*k]);
  const head=(/** @type {number} */ hx,/** @type {number} */ hy,/** @type {number} */ sh)=>{ cap([hx*0.6,sh-0.4],1.3,[hx,hy+1.6],1.35); cap([hx,hy+0.7],2.3,[hx,hy-0.5],2.55);
    if(o.cap){ cap([hx-1.6,hy-1.5],1.2,[hx+1.4,hy-1.9],1.1); cap([hx+look*1.4,hy-1.0],0.6,[hx+look*3.0,hy-0.6],0.45); } };
  if(o.arms==='sit'){
    const up=e*1.2, sh=-22.4+up+0.2*br;
    for(const s of [-1,1]){ cap([s*3.4,-1.2],1.4,[s*3.6,-0.2],1.4); cap([s*3.3,-12.6],1.7,[s*3.4,-1.6],1.35); cap([s*2.6,-15],2.5,[s*3.3,-13.2],2.3); }
    cap([0,-15.4],3.8,[0,sh+1],4.4); for(const s of [-1,1]) cap([s*1.5,sh],1.9,[s*4.3,sh+1.2],1.8);
    head(look*0.8,-27.6+up+0.25*br,sh);
    for(const s of [-1,1]){ cap([s*4.5,sh+1.4],1.5,[s*3.6,-15.8+up*0.3],1.3); cap([s*3.6,-15.8+up*0.3],1.3,[s*0.9,-14.6],1.1); }
    return P; }
  const st=o.stoop*(1-0.4*e), lean=e*0.9, sh=-27.4+st*0.9+lean*0.5-0.3*br, hy=-33.4+st*1.7+lean*0.9+0.1*br;
  const tl=o.tilt; for(const s of [-1,1]){ const sp=s*tl>0?0.4:1.3; cap([s*(1.7+sp),-1],1.45,[s*(2.3+sp),-0.4],1.4); cap([s*2.1-tl*0.5,-12.5],1.7,[s*(1.7+sp),-1.4],1.4); }
  const arm=(/** @type {number} */ s,/** @type {number[]} */ el,/** @type {number[]} */ hn)=>{ cap([s*4.3,sh+1.3],1.6,el,1.3); cap(el,1.3,hn,1.1); cap(hn,1.15,hn,1.15); };
  if(o.arms==='behind') for(const s of [-1,1]) arm(s,[s*5.3,-21.6],[s*3.2,-18]);
  cap([-tl*0.6,-19],4.0,[-tl*0.9,-10.4],4.6+0.2*Math.sin(t*0.01+id)); cap([-tl*0.6,-19],4.0,[tl*0.2,sh+1.8],4.5);   // the greatcoat, its skirt
  for(const s of [-1,1]) cap([s*1.5+tl*0.2,sh-s*tl*0.35],2.0,[s*4.4+tl*0.2,sh+1.4-s*tl*0.6],1.9);   // dropped shoulders, one lower
  head(look+tl*0.5,hy,sh);
  if(o.arms==='fold'){ arm(1,[5.4,-21.8+lean],[-2.4,-23.2+lean]); arm(-1,[-5.4,-21.4+lean],[2.4,-22.4+lean]); }
  else if(o.arms==='hang') for(const s of [-1,1]) arm(s,[s*6.0,-20.6],[s*6.2,-13.6+0.3*br]);
  else if(o.arms==='fist'){ const f=e*e*(3-2*e), s=d; arm(-s,[-s*6.0,-20.8],[-s*6.0,-14.2]);
    arm(s,[s*(6.0+1.4*f),-20.8-7.6*f],[s*(6.0+1.0*f),-14.4-21*f+0.4*Math.sin(t*0.4)*f]); }
  return P;
}

/** The man on the guard-bed under the window, face to the wall, a blanket over him, one hand hanging over the edge.
 * He does not move. */
const SLEEPER = [[113,56.4,2.0,101,56.2,2.4],[107.5,55.4,2.7,107.5,55.4,2.7],[101.5,55.3,2.6,101.5,55.3,2.6],
  [97.6,55.4,1.9,97.6,55.4,1.9],[103.2,57.6,0.95,103.8,63.6,0.85],[103.9,64.6,1.0,104.1,65.4,0.9]];
/** Two flies over him: float positions, a slow wander and a quick buzz. @param {number} t */
function drawFlies(t){
  const M=rendererState.FB_MAIN, w=appearanceState.W;
  for(let i=0;i<2;i++){ const a=t*(0.05+i*0.017)+i*2, x=102+i*3+4*Math.sin(a)+1.2*Math.sin(t*0.31+i), y=51+2.5*Math.sin(a*1.7+i)+0.8*Math.sin(t*0.43+i*3);
    const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
    for(const [ox,oy,wt] of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){ const p=(iy+oy)*w+ix+ox; M[p]=shade(M[p],1-0.75*wt); } }
}

/** How worked up each watcher is: rises when a punch lands, each at his own pace, settles slowly. @param {boolean} hot @param {number} t */
function stirWatchers(hot,t){
  const E=state.wardEx||(state.wardEx=new Float32Array(WATCHERS.length)), dt=Math.max(0,Math.min(12,t-(state.wardT??t))); state.wardT=t;
  for(let i=0;i<E.length;i++) E[i]=Math.max(0,Math.min(1,E[i]+(hot?dt*0.06*(0.4+h2(i,9)/255):-dt*0.004)));
  return E;
}

/** The light of the Ward at (x, y) on the wall and the floor: the tallow pool on the left, the cold spill of the window, the
 * patch the shaft throws on the flags, the dark between. @returns {number[]} r, g, b multipliers */
function wallLight(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ fl,/** @type {number} */ cl){
  const dx=x-LAMP[0]-1, dy=(y-LAMP[1])*1.1, il=fl*1.8/(1+(dx*dx+dy*dy)/(36*36));
  let iw=0.55*cl*Math.max(0,1-Math.hypot(x-102,(y-16)*0.85)/30)**2;
  if(y>=WALL_FLOOR){ const x0=x+(y-21)*0.52; iw+=0.5*cl*Math.max(0,Math.min(1,(x0-94)/3,(110-x0)/3)); }
  const v=1-0.85*Math.max(0,Math.hypot((x/appearanceState.W-0.5)*1.6,(y/appearanceState.H-0.45)*1.4)-0.5), a=0.36;
  return [(il*1.05+iw*0.62+a*0.85)*v,(il*0.76+iw*0.74+a*0.9)*v,(il*0.48+iw*0.84+a)*v];
}

/** Behind the fighters in the Ward, per frame: the wall lit by the flickering tallow and the grey day through the bars,
 * the shaft of light with the dust in it, the lamp's smoke, the cellmates in the gloom, the reek on the floor.
 * @param {boolean} hot */
export function wardFightBack(hot){
  const M=rendererState.FB_MAIN, w=appearanceState.W, h=appearanceState.H, t=boxingState.tick;
  const fl=0.84+0.1*vnoise(t*0.09,3.3)+0.06*vnoise(t*0.37,7.1), cl=0.8+0.2*vnoise(t*0.004,1.7);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const p=y*w+x, o=M[p], l=wallLight(x,y,fl,cl);
    M[p]=(0xff000000|(Math.min(255,((o>>16)&255)*l[2])<<16)|(Math.min(255,((o>>8)&255)*l[1])<<8)|Math.min(255,(o&255)*l[0]))>>>0; }
  for(let y=WIN.y0;y<=WIN.y1;y++) for(let x=WIN.x0;x<=WIN.x1;x++) if(winSky(x,y))                // the smog going past outside
    M[y*w+x]=mix(C.skyD,C.sky,Math.min(1,cl*(0.35+0.9*fbm(x*0.12-t*0.004,y*0.2+t*0.0007))));
  for(let y=WIN.y1+2;y<WALL_FLOOR+8;y++){ const fade=Math.exp(-(y-21)/55)*cl;                    // the shaft from the window, dust swirling in it
    for(let x=Math.max(0,Math.floor(WIN.x0-3-(y-21)*0.52));x<=Math.min(w-1,Math.ceil(WIN.x1+3-(y-21)*0.52));x++){
      const x0=x+(y-21)*0.52, edge=Math.max(0,Math.min(1,(x0-WIN.x0+2)/3,(WIN.x1+2-x0)/3)); if(!edge) continue;
      const a=0.2*edge*fade*(0.35+fbm(x0*0.11+t*0.0013,y*0.05-t*0.0021)), p=y*w+x; M[p]=mix(M[p],C.beam,a); } }
  for(let i=0;i<9;i++){ const s=((h2(i,1)/255)+t*0.00025*(1+(i%3)*0.5))%1, u=h2(i,2)/255+0.12*Math.sin(t*0.0031+i*1.9);   // motes catching the light
    const y=22+s*50, x=WIN.x0+u*(WIN.x1-WIN.x0)-(y-21)*0.52, tw=0.5+0.5*Math.sin(t*0.05+i*2.3), a=0.45*tw*Math.sin(Math.PI*s);
    const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
    for(const [ox,oy,wt] of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){ const p=(iy+oy)*w+ix+ox; M[p]=mix(M[p],C.beamL,a*wt); } }
  for(let y=4;y<LAMP[1]-1;y++){ const r=1.2+(LAMP[1]-y)*0.22, cx=LAMP[0]+1.5+Math.sin(y*0.3-t*0.035)*(LAMP[1]-y)*0.08;   // the tallow smoke curling up
    for(let x=Math.floor(cx-r*2);x<=Math.ceil(cx+r*2);x++){ const a=0.32*Math.exp(-(((x-cx)/r)**2))*fbm(x*0.25,y*0.18+t*0.025)*Math.min(1,(LAMP[1]-y)/4); if(a>0.01){ const p=y*w+x; M[p]=mix(M[p],C.smoke,a); } } }
  drawSil(SLEEPER,fl,cl); drawFlies(t);
  const E=stirWatchers(hot,t);
  WATCHERS.forEach((o,i)=>{ softSpot(o.x,o.fy+0.3,6*o.k,1.4,0.5); drawSil(watcherParts(o,i,t,E[i]),fl,cl); });
  for(let y=60;y<h;y++){ const g=Math.min(1,(y-60)/10)*0.5;                                         // the reek low over the flags, two layers
    for(let x=0;x<w;x++){ const n=fbm(x*0.045+t*0.0016,y*0.12+t*0.0004), m=fbm(x*0.08-t*0.0011+9,y*0.2+3), a=g*Math.max(0,n*1.5-0.5)+0.25*g*m, p=y*w+x; M[p]=mix(M[p],C.mist,Math.min(0.45,a)); } }
}
/** Over the finished frame in the Ward: the lamp's flame and its glow. */
export function wardFightFront(){
  const t=boxingState.tick, fl=0.84+0.1*vnoise(t*0.09,3.3)+0.06*vnoise(t*0.37,7.1), sw=Math.sin(t*0.11)*0.6+(vnoise(t*0.2,5)-0.5);
  softSpot(LAMP[0]+1.5,LAMP[1]+0.5,4.5*fl,4*fl,0.18*fl,C.flame1,1);
  pset(LAMP[0],LAMP[1]+2,C.cup); pset(LAMP[0]+1,LAMP[1]+2,C.cup); pset(LAMP[0]+2,LAMP[1]+2,C.cup);
  pset(LAMP[0]+1,LAMP[1]+1,C.flame1); pset(LAMP[0]+1+(sw>0.3?1:0),LAMP[1],C.flame2); if(fl>0.88) pset(LAMP[0]+1+(sw>0?1:0),LAMP[1]-1,C.flame1);
}

/* ---------- the exercise yard ---------- */

const NG = 32;
/** Smooth value noise, 0..1, wrapping every 32 units (the grid is filled in initialize). @param {number} u @param {number} v */
export function vnoise(u,v){
  const G=state.noise, i=Math.floor(u), j=Math.floor(v), fu=u-i, fv=v-j, su=fu*fu*(3-2*fu), sv=fv*fv*(3-2*fv);
  const i0=i&31, i1=(i+1)&31, j0=(j&31)*NG, j1=((j+1)&31)*NG, a=G[j0+i0], b=G[j0+i1], c=G[j1+i0], d=G[j1+i1];
  return a+(b-a)*su+(c-a+(a-b-c+d)*su)*sv;
}
/** Two octaves of value noise, 0..1. @param {number} u @param {number} v */
export const fbm=(u,v)=>vnoise(u,v)*0.65+vnoise(u*2.03+11.3,v*2.03+5.7)*0.35;
/** Feet line of the far arc of the walking ring, along the wall. @param {number} x */
const ringY=(x)=>79.2+2*((x-72)/72)**2;

/* The yard in the rain, late in the day: a well of wet rusticated granite (Dance's Newgate), barred slits of the wing
   high up, the downpipe overflowing on the left, on the right the iron gate under an arch into Birdcage Walk — the
   passage where the hanged lie under the flags, their initials cut into the stones by the gate — and one gas lamp on
   its bracket. The hooded convicts drag themselves round the ring; the turnkey stands at the gate in the lamplight. */

/** Colours of the yard, filled once when the backdrop is first baked. */
const Y = {};
function yardPalette(){
  if(Y.ready) return;
  Object.assign(Y,{ready:1,cloud:rgb('#15181d'),skyL:rgb('#3c444c'),
    stone:[rgb('#5e6266'),rgb('#54585c'),rgb('#64645f'),rgb('#5a5d60'),rgb('#4c5055'),rgb('#68665e')],
    joint:rgb('#06070a'),edge:rgb('#8a939a'),soot:rgb('#0b0c0f'),wet:rgb('#15181c'),sheen:rgb('#9ea8b0'),slime:rgb('#18241c'),moss:rgb('#26321f'),
    rust:rgb('#4a2a18'),cope:rgb('#50555a'),copeT:rgb('#7a8288'),iron:rgb('#101114'),ironH:rgb('#363a40'),void:rgb('#020203'),bar:rgb('#1e2024'),barH:rgb('#4a5058'),
    sett:[rgb('#34373a'),rgb('#2d3033'),rgb('#3b3d3f')],mud:rgb('#0f1113'),flag:rgb('#464a4e'),puddle:rgb('#1a1f25'),
    rain:rgb('#d2dce4'),fog:rgb('#5c656e'),fogD:rgb('#3e454c'),gas:rgb('#fff2b8'),gasL:rgb('#d8b468'),glass:rgb('#c8a85c'),
    skin:rgb('#7e786c'),eye:rgb('#0c0c0c'),figOut:rgb('#0b0d10'),breath:rgb('#a6aeb4')});
}

/** Course lines of the wall (each starts with its joint): eight courses of rock-faced granite, two of the plinth. */
const COURSES = [11,18,24,31,37,44,50,57,63,69,75];
const PIPE = 18, WINS = [40,76], GATE = 130, SPR = 46, TK_X = 131;
/** The gas lamp's light, 0..1, at (x, y). @param {number} x @param {number} y */
const lampK=(x,y)=>{ const q=1-((x-state.lx)/24)**2-((y-state.ly-3)/26)**2; return q>0?q*q:0; };
/** The turnkey's lantern at tick t: the hand on its bail and the lantern hanging under it, swinging a little as he
 * shifts his weight. @param {number} t @returns {number[]} [hand x, hand y, lantern x, lantern y] */
function lanternAt(t){
  const ws=0.6*Math.sin(t*0.0042)**3, hx=TK_X+ws-2.4, hy=76-16.6+1.2, a=0.1*Math.sin(t*0.019)+0.05*Math.sin(t*0.047)-ws*0.2;
  return [hx,hy,hx+Math.sin(a)*3.4,hy+Math.cos(a)*3.4];
}
/** Where the light is this frame. @param {number} t */
function lampTick(t){ const L=lanternAt(t); state.lx=L[2]; state.ly=L[3]; }
/** Gaslight flicker at tick t, about 0.8..1. @param {number} t */
const flick=(t)=>0.86+0.1*vnoise(t*0.045,3.7)+0.04*Math.sin(t*0.37);
/** Initials of the hanged and their crosses, cut by the gate: [x, y, text]. */
const CARVED = [[95,45,'EW'],[104,45,'+'],[98,51,'TB'],[93,58,'JM'],[102,58,'64'],[111,51,'+']];
const GLYPH = {E:'111110100111',W:'101101111101',T:'111010010010',B:'110111101110',J:'011001101010',M:'101111101101','+':'010111010010','6':'011110101010','4':'101111001001'};

/** One rock-faced block of the wall: the deep chamfered joint, the top bevel catching the sky, the rough boss.
 * @param {number} x @param {number} y @param {number} bx0 @param {number} bx1 @param {number} y0 @param {number} y1 @param {number} id @param {boolean} plinth */
function stonePx(x,y,bx0,bx1,y0,y1,id,plinth){
  if(y===y0||x===bx0) return Y.joint;
  let c=shade(Y.stone[id%6],(0.9+((id>>3)&15)/15*0.16)*(plinth?0.82:1));
  const n=vnoise(x*0.47+id*0.37,y*0.6+id*0.11), m=vnoise(x*1.3+id,y*1.1);
  c=shade(c,(0.76+0.4*n+(m>0.76?-0.16:0))*(1.07-0.17*(y-y0)/Math.max(1,y1-y0)));    /* the boss: bumps, pits, lit from above */
  if(y===y0+1) c=mix(c,Y.edge,0.5); else if(y===y0+2) c=mix(c,Y.edge,0.14); else if(y===y1) c=shade(c,0.55);
  if(x===bx0+1) c=shade(c,1.1); else if(x===bx1-1) c=shade(c,0.72);
  const wb=(id>>5)&7; if(wb<2) c=mix(c,Y.wet,0.32); else if(wb===7) c=shade(c,1.08);           /* some blocks soaked through */
  if((id&3)===0&&x-bx0<3&&y-y0<3&&x-bx0+y-y0<4) c=shade(c,0.62);                                     /* a spalled corner */
  return c;
}
/** Soot, the rain's wet streaks and the damp over the stone. @param {number} c @param {number} x @param {number} y */
function weather(c,x,y){
  const top=Math.max(0,1-(y-11)/52), streak=10+44*vnoise(x*0.21,7.7), s=Math.max(0,1-(y-11)/streak)*Math.max(0,vnoise(x*0.33,3.3)*1.6-0.55);
  c=mix(c,Y.soot,Math.max(0.03,Math.min(0.8,0.08+0.4*top*top+0.3*(vnoise(x*0.07,y*0.09)-0.5))));
  if(s>0) c=mix(c,Y.wet,Math.min(0.6,s*0.7));
  const cur=vnoise(x*0.45,12.1)*0.7+vnoise(x*1.1,y*0.04+3)*0.3; if(cur>0.6) c=mix(c,Y.wet,Math.min(0.5,(cur-0.6)*2.2));   /* curtains of water down the whole wall */
  else if(cur<0.25) c=mix(c,Y.edge,(0.25-cur)*0.5*Math.max(0,1-(y-11)/50));                             /* lime washed out of the joints */
  const tide=52+5*vnoise(x*0.11,2.2); if(y>tide) c=mix(c,Y.slime,Math.min(0.6,0.15+(y-tide)*0.03)*(0.6+0.6*vnoise(x*0.2,y*0.25)));
  return mix(c,Y.fog,0.07+Math.max(0,Math.min(0.36,(y-38)/36*0.36)));                                   /* the rain hanging between the wall and us */
}
/** Is (x, y) standing water? Puddles on the setts, a few on the ring, the pool under the downpipe. @param {number} x @param {number} y */
const isPuddle=(x,y)=>y>=76&&(vnoise(x*0.085+2.5,y*0.3+1.1)>(y<82?0.7:0.6)||(Math.abs(x-PIPE+3)<5-(y-76)*0.5&&y<84));
/** The rivulets running down the wall: x, top, bottom, speed. */
const RIVULETS = Array.from({length:15},(_,i)=>{ const x=3+((i*83+17)%138), w=WINS.find(c=>Math.abs(x-c)<6);
  return {x, y0:w!==undefined?40:11, y1:62+(i%3), sp:0.35+(i%5)*0.09, off:i*37}; });
/** The wavering line a rivulet follows. @param {any} r @param {number} y */
const rivX=(r,y)=>r.x+1.4*(vnoise(r.x*0.7,y*0.11)-0.5);

/** The yard behind a fight, baked once: sky, spikes, coping, the granite wall with its slits, the downpipe, the gate of
 * Birdcage Walk with the initials, the lamp bracket, the wet setts with the wall mirrored in the puddles. */
export function yardFightBg(){
  yardPalette();
  const fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H;
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ if(x>=0&&x<w&&y>=0&&y<h) fb[y*w+x]=c; };
  const get=(/** @type {number} */ x,/** @type {number} */ y)=>fb[Math.max(0,Math.min(h-1,y))*w+Math.max(0,Math.min(w-1,x))];
  const tint=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ col,/** @type {number} */ a)=>{ if(x>=0&&x<w&&y>=0&&y<h&&a>0) fb[y*w+x]=mix(fb[y*w+x],col,Math.min(1,a)); };
  for(let y=0;y<8;y++) for(let x=0;x<w;x++) fb[y*w+x]=mix(Y.cloud,Y.skyL,Math.max(0,Math.min(1,(y/8)*0.7+(fbm(x*0.05,y*0.3)-0.5)*0.8)));   /* low cloud, the rain coming out of it */
  for(let x=0;x<w;x++){ px(x,5,Y.iron); px(x,4,(x&1)?Y.ironH:Y.iron); }                            /* the spiked roller on the coping */
  for(let k=0;k<49;k++){ const x0=k*3+1, a=h2(k,5)/255*Math.PI, dx=Math.cos(a)*3.2, dy=Math.sin(a)*3.4;
    for(let s=-1;s<=1;s+=0.2) px(Math.round(x0+dx*s),Math.round(4.5+dy*s),s<0?Y.ironH:Y.iron); }
  for(let x=0;x<w;x++){ px(x,8,mix(Y.copeT,Y.wet,0.2*vnoise(x*0.3,1))); px(x,9,x%18===0?Y.joint:Y.cope); px(x,10,Y.soot); }
  for(let c=0;c<10;c++){ const y0=COURSES[c], y1=COURSES[c+1]-1, plinth=c>=8; let x=-(h2(c,3)%14), j=0;
    while(x<w){ const len=plinth?20+h2(c,j)%12:11+h2(c,j)%11, id=h2(c*31+j,17);
      for(let y=y0;y<=y1;y++) for(let xx=Math.max(0,x);xx<Math.min(w,x+len);xx++) fb[y*w+xx]=weather(stonePx(xx,y,x,x+len,y0,y1,id,plinth),xx,y);
      x+=len; j++; } }
  for(let x=0;x<w;x++){ px(x,63,mix(Y.copeT,Y.slime,0.35+0.3*vnoise(x*0.2,4))); tint(x,64,Y.joint,0.5); tint(x,74,Y.joint,0.6); }   /* the plinth's wet top, the foot of the wall */
  for(const r of RIVULETS) for(let y=r.y0;y<r.y1;y++){ const xr=rivX(r,y), xi=Math.floor(xr), f=xr-xi; tint(xi,y,Y.wet,0.5*(1-f)); tint(xi+1,y,Y.wet,0.5*f); }
  for(const c of WINS){                                                                              /* the barred slits of the wing */
    for(let x=c-6;x<=c+6;x++){ px(x,24,Y.joint); px(x,25,mix(Y.cope,Y.edge,0.35)); px(x,26,shade(Y.cope,0.7)); px(x,37,Y.copeT); px(x,38,Y.cope); tint(x,39,Y.joint,0.7); }
    for(let y=27;y<37;y++){ px(c-5,y,shade(Y.cope,1.05)); px(c-4,y,shade(Y.cope,0.55)); px(c+4,y,shade(Y.cope,0.4)); px(c+5,y,shade(Y.cope,0.75));
      for(let x=c-3;x<=c+3;x++) px(x,y,(x-c)%2===0&&x!==c-3&&x!==c+3?(y===27?Y.barH:Y.bar):y===31?Y.bar:mix(Y.void,Y.fogD,0.12*(36-y)/9)); }
    for(let d=0;d<14;d++) for(const x of [c-2,c,c+2]) tint(x,40+d,Y.rust,0.4*(1-d/14));             /* the bars bleeding rust down the stone */
    for(let d=0;d<18;d++) for(let x=c-5;x<=c+5;x++) tint(x,40+d,Y.wet,0.3*(1-d/18)*(Math.abs(x-c)<4?1:0.5)); }
  for(let y=0;y<h;y++) for(let x=GATE-14;x<w;x++){ const dx=x-GATE, dy=y-SPR, r=y<SPR?Math.hypot(dx,dy):Math.abs(dx);   /* the arch, its gate */
    if(y<31||y>74) continue;
    if(r<9){ let c=mix(Y.void,Y.fog,0.18+0.62*Math.max(0,(y-38)/36)**0.8*(1-Math.abs(dx)/14)+0.12*(fbm(x*0.2,y*0.12)-0.5));   /* the passage beyond, full of grey rain */
      if(y>67) c=mix(c,Y.flag,0.25*(y-67)/8);
      if((x-GATE)%3===0) c=(x-GATE)%6===0?Y.iron:Y.bar; if(y===53||y===71) c=Y.iron; if(y===52||y===70) c=Y.bar; if(r>7.6&&y<SPR) c=Y.iron;
      fb[y*w+x]=c; }
    else if(r<14&&y<SPR){ const a=Math.atan2(-dy,dx), seg=a/(Math.PI/9), fs=seg-Math.floor(seg), key=Math.abs(a-Math.PI/2)<0.18;
      fb[y*w+x]=weather(fs<0.12&&!key?Y.joint:shade(Y.stone[(Math.floor(seg)+3)%6],(key?1.12:0.96)*(r<10?1.18:r>13?0.7:1)),x,y); }
    else if(r<13&&y>=SPR){ const q=((y-SPR)/5|0), long=q&1?13:11; if(Math.abs(dx)<long){ fb[y*w+x]=weather((y-SPR)%5===0||Math.abs(dx)===long-1?Y.joint:shade(Y.stone[q%6],r<10?1.15:0.95),x,y); } } }
  for(const [x0,y0,txt] of CARVED) [...txt].forEach((ch,k)=>{ const g=GLYPH[ch]; for(let i=0;i<12;i++) if(g[i]==='1'){ const x=x0+k*4+i%3, y=y0+(i/3|0);
    px(x,y,mix(get(x,y),Y.joint,0.75)); if(g[i+3]!=='1') tint(x,y+1,Y.edge,0.28); } });             /* cut deep, the lower lip of each stroke catching the light */
  for(let y=11;y<73;y++){ px(PIPE,y,Y.ironH); px(PIPE+1,y,Y.iron); tint(PIPE+2,y,Y.joint,0.4); tint(PIPE-1,y,Y.wet,0.35); }   /* the downpipe */
  for(let y=11;y<16;y++) for(let x=PIPE-2+(y>13?1:0);x<=PIPE+3-(y>13?1:0);x++) px(x,y,y===11?Y.barH:(x===PIPE-2+(y>13?1:0)?Y.ironH:Y.iron));
  for(let y=20;y<66;y+=11) for(let x=PIPE-1;x<=PIPE+2;x++){ px(x,y,Y.ironH); px(x,y+1,Y.iron); }
  for(let y=16;y<75;y++) for(let x=PIPE-6;x<=PIPE+6;x++) tint(x,y,Y.slime,0.32*(1-Math.abs(x-PIPE-0.5)/7)*(y/75));
  for(let x=PIPE-4;x<=PIPE+1;x++){ px(x,72,Y.iron); px(x,73,Y.iron); px(x,74,Y.joint); } px(PIPE-4,71,Y.ironH);   /* its shoe */
  const pud=state.yPud=new Uint8Array(w*h);
  for(let y=WALL_FLOOR;y<h;y++) for(let x=0;x<w;x++){ const d=y-ringY(x), my=Math.max(11,2*WALL_FLOOR-y-1); let c;
    if(isPuddle(x,y)){ pud[y*w+x]=1; c=shade(mix(Y.puddle,get(x,my),0.6),0.62); if(!isPuddle(x,y-1)) c=mix(c,Y.copeT,0.22); }   /* the wall upside down in the water */
    else if(d>-2.5&&d<2.5){ const fx=(x+3)%10; c=(fx===0||d>1.6)?Y.mud:shade(mix(Y.flag,Y.sett[h2(Math.floor((x+3)/10),7)%3],0.35),0.9+0.15*vnoise(x*0.3,y)); if(d<-1.5) c=mix(c,Y.copeT,0.18); }
    else { const dz=y-38, u=(x-72)/dz*16, rf=Math.log(dz)*14, row=Math.floor(rf), fv=rf-row, uo=u+(row&1)*0.5, fu=uo-Math.floor(uo), id=h2(Math.floor(uo),row);
      if(fu<0.13||fv<0.14) c=(id&3)===0?mix(Y.mud,Y.moss,0.5):mix(Y.mud,get(x,my),0.2);
      else { c=shade(Y.sett[id%3],(0.9+((id>>4)&15)/15*0.16)*(fv>0.8?0.82:1)); if(fv<0.36) c=mix(c,get(x,my),0.22+0.2*(1-fv/0.36)); } }   /* wet: each sett's top glazed with the wall's light */
    if(y<79) c=shade(c,0.72+(y-75)*0.07);
    fb[y*w+x]=c; }
}

const R_HOOD = 176, R_HOODF = 177, R_COAT = 178, R_COATF = 179;
const R_PANT = 180, R_PANTF = 181, R_BOOT = 182, R_BOOTF = 183;
const R_TK_COAT = 184, R_TK_COATF = 185, R_TK_PANT = 186, R_TK_BOOT = 187, R_TK_CAP = 188, R_HAND = 189, R_HANDF = 190;

const seg = (x0, y0, r0, x1, y1, r1, p, rp) => taper(x0, y0, r0, x1, y1, r1, p, rp, 0, -9, -9, 0, 0);
const dot = (x, y, r, p, rp) => disc(x, y, r, p, rp);

/** Clothes of the walkers, soaked dark: [hood, coat, trousers] three-tone ramps (the far side is derived). */
const WALK_CLOTHES = [
  [['#4a4a45','#62625b','#7c7b72'],['#1e2020','#2c2f2c','#3e413c'],['#141618','#202224','#2e302e']],   // drab grey frieze
  [['#4c4840','#635e54','#7c766a'],['#221c16','#322920','#45392c'],['#141210','#211d18','#2f2922']],   // brown frieze
  [['#464743','#5c5d58','#74756e'],['#1a1d20','#282c30','#3a3f43'],['#121314','#1e1f20','#2c2d2e']],   // a faded blue-grey coat
  [['#4e4b44','#66625a','#807b70'],['#181614','#25221e','#36322c'],['#101010','#1c1a18','#2a2724']],   // patched black
];
/** The convicts on the far arc of the ring: height, stoop, arms, gait phase, clothes, a dragged foot. Each one's stride
 * follows his height, so the line keeps its spacing but no two walk in step. */
const WALKERS = [
  {hk:1.26,stoop:1.5,arms:'swing',ph:0.1,cl:0},
  {hk:1.32,stoop:1.1,arms:'hug',ph:0.55,cl:1},
  {hk:1.2,stoop:2.3,arms:'behind',ph:0.3,cl:2},
  {hk:1.29,stoop:1.3,arms:'hang',ph:0.8,cl:3},
  {hk:1.23,stoop:1.9,arms:'hang',ph:0.45,cl:1,drag:1},
];
const WALK_V = 0.082, WALK_LOOP = 200, WALK_GAP = 40, WALK_DUTY = 0.72;
/** Gait phase 0..1 of walker o at tick t (one cycle = two steps; the stride follows his height). @param {any} o @param {number} t */
const walkPhase=(o,t)=>((t*WALK_V)/(11.5*o.hk)+o.ph)%1;
/** Where walker k is at tick t. @param {number} k @param {number} t */
const walkerX=(k,t)=>((k*WALK_GAP-t*WALK_V)%WALK_LOOP+WALK_LOOP)%WALK_LOOP-28;

/** Thigh and shin from the hip to the ankle, the knee bending forwards (to the left). @returns {number[]} the knee */
function knee(/** @type {number} */ hx,/** @type {number} */ hy,/** @type {number} */ ax,/** @type {number} */ ay,/** @type {number} */ a,/** @type {number} */ b){
  const d=Math.min(a+b-0.01,Math.hypot(ax-hx,ay-hy)), th=Math.atan2(ay-hy,ax-hx), q=Math.acos(Math.max(-1,Math.min(1,(a*a+d*d-b*b)/(2*a*d))));
  return [hx+Math.cos(th+q)*a,hy+Math.sin(th+q)*a];
}

/** The joints of a convict dragging himself to the left at gait phase p: each boot planted on the setts while the body
 * passes over it (long double support), then shuffled forward low — the lame one scrapes his bad foot and sinks onto it.
 * The hips rise over the standing leg, the stooped shoulders heave up a beat later, the head nods after them.
 * @param {number} X @param {number} fy @param {number} p @param {any} o */
function convictPose(X,fy,p,o){
  const k=o.hk, S=11.5*k, D=WALK_DUTY, TH=8.3*k, SH=8.1*k, Lg=TH+SH, st=(/** @type {number} */ lag)=>Math.cos(4*Math.PI*(p-D/2-lag)), dr=o.drag||0;
  const foot=(/** @type {number} */ off)=>{ const q=(p+off)%1, bad=dr&&off>0; if(q<D) return {x:X-(D/2-q)*S,lift:0,heel:q>D-0.18&&!bad?(q-D+0.18)*6*k:0,q};
    const s=(q-D)/(1-D), e=s*s*(3-2*s); return {x:X+(D/2-D*e)*S,lift:Math.sin(Math.PI*s)*(bad?0.15:0.8)*k,heel:bad?0:0.7*k*(1-s),q}; };
  const sink=dr*0.7*k*Math.max(0,Math.cos(2*Math.PI*(p+0.5-D/2)));
  const hy=fy-1.3-Lg*0.95-0.7*k*st(0)+o.stoop*0.3+sink, lean=1.3+o.stoop*0.9+0.6*k*(1-st(0))/2;
  const shX=X-lean, shY=hy-9.6*k+o.stoop*0.45-0.3*k*st(0.06)+sink*0.6, hx=shX-1.0*k-o.stoop*0.6-0.3*(1-st(0.12)), hdy=shY-2.7*k+o.stoop*0.75+0.4*st(0.12)+sink*0.3;
  return {k,S,TH,SH,hy,lean,shX,shY,hx,hdy,fn:foot(0),ff:foot(0.5)};
}
/** One hooded convict trudging to the left, in profile, the canvas sack over the head with one corner sticking up behind.
 * Drawn into the current buffer at sub-pixel positions, so he moves every frame.
 * @param {number} X hip x @param {number} fy ground @param {number} p gait phase 0..1 @param {any} o walker */
function drawConvict(X,fy,p,o){
  const P=convictPose(X,fy,p,o), {k,hy,lean,shX,shY,hx,hdy}=P;
  const sg=(/** @type {number} */ x0,/** @type {number} */ y0,/** @type {number} */ r0,/** @type {number} */ x1,/** @type {number} */ y1,/** @type {number} */ r1,/** @type {number} */ pass,/** @type {number} */ rp)=>seg(x0,y0,r0*k,x1,y1,r1*k,pass,rp);
  const leg=(/** @type {any} */ f,/** @type {number} */ pass,/** @type {number} */ rp,/** @type {number} */ rb)=>{ const ay=fy-1.3-f.lift, [kx,ky]=knee(X,hy,f.x,ay,P.TH,P.SH);
    sg(X,hy,1.65,kx,ky,1.3,pass,rp); sg(kx,ky,1.2,f.x,ay,0.95,pass,rp);
    sg(f.x+0.9*k,ay+0.8-f.heel,0.85,f.x-2.3*k,fy-0.5-f.lift,0.72,pass,rb); };
  const arm=(/** @type {number} */ off,/** @type {number} */ pass,/** @type {number} */ rp,/** @type {number} */ rh)=>{
    const sw=Math.cos(2*Math.PI*(p+off-0.5)), sx=shX+0.3-0.45*sw, sy=shY+1.4*k+0.35*Math.sin(2*Math.PI*(p+off)); let ex,ey,wx,wy;
    if(o.arms==='behind'){ ex=sx+2.6*k; ey=sy+3.6*k; wx=X+2.4*k; wy=hy-0.6; }
    else if(o.arms==='hug'){ const b=0.3*Math.sin(2*Math.PI*(p+off)); ex=sx-2.0*k; ey=sy+4.0*k+b; wx=sx+(off?1.4:0.4)*k; wy=sy+2.2*k+b; }   /* arms wrapped round himself against the cold */
    else { const A=o.arms==='hang'?0.1:0.24, th=A*sw, b=0.25+0.2*Math.max(0,sw);
      ex=sx-Math.sin(th)*5*k; ey=sy+Math.cos(th)*5*k; wx=ex-Math.sin(th+b)*4.6*k; wy=ey+Math.cos(th+b)*4.6*k; }
    sg(sx,sy,1.2,ex,ey,1.05,pass,rp); sg(ex,ey,1.0,wx,wy,0.85,pass,rp); dot(wx,wy,0.85*k,pass,rh); };
  for(let pass=0;pass<2;pass++){
    arm(0.5,pass,R_COATF,R_HANDF); leg(P.ff,pass,R_PANTF,R_BOOTF); leg(P.fn,pass,R_PANT,R_BOOT);
    sg(X+0.2,hy+1.2*k,2.1,X-lean*0.45,hy-4.8*k,2.2,pass,R_COAT); sg(X-lean*0.45,hy-4.8*k,2.2,shX+0.5,shY+1.2*k,2.45,pass,R_COAT);   // the back curves into the stoop
    sg(shX+0.6,shY+0.9*k,1.8,hx,hdy,1.85,pass,R_HOOD); sg(hx+0.4,hdy-0.4*k,0.9,hx+1.9*k,hdy-2.3*k,0.5,pass,R_HOOD);   // the sack, its corner
    arm(0,pass,R_COAT,R_HAND); }
  const ey=Math.round(hdy-0.3*k); pset(Math.round(hx-2*k),ey,appearanceState.C_OUT); pset(Math.round(hx-1.2*k),ey,C.hoodD);   // the eye slit
  pset(Math.round(shX-0.6),Math.round(shY+0.7*k),C.silhD);                                        // the cord at the neck
}
/** A breath let out now and then — a few short puffs from the slit, hanging and spreading in the cold where they were
 * breathed. Who breathes when is chance: each man has his own slow rhythm and skips most of his turns.
 * @param {number} t @param {number} id @param {number} period @param {(te:number)=>number[]|null} mouth */
function breath(t,id,period,mouth){
  const slot=Math.floor((t+id*61)/period), age=(t+id*61)%period;
  for(let back=0;back<2;back++){ const n=slot-back, a0=age+back*period; if(h2(id*7+3,n)>95) continue;
    for(let i=0;i<3;i++){ const a=a0-i*11; if(a<0||a>=95) continue; const m=mouth(t-a); if(!m) continue;
      const out=1-Math.exp(-a/18); softSpot(m[0]-1.5-7*out-a*0.02,m[1]+0.3-1.5*out-a*0.02,1.5+a*0.05,1.2+a*0.036,0.62*Math.min(1,a/5)*(1-a/95)**1.4*(i?0.75:1),Y.breath||C.breath,1);   /* blown out, slowing, spreading */ } }
}

/** The turnkey at the gate: a frock coat to the knees, a peaked cap, hands behind his back, the baton and keys at his
 * belt. He breathes and shifts his weight now and then. @param {number} sx @param {number} sy @param {number} t */
function drawWarder(sx,sy,t){
  const ws=0.6*Math.sin(t*0.0042)**3, br=0.35*Math.sin(t*0.031), X=sx+ws, hy=sy-16.6, shY=sy-27.4+br, lh=lanternAt(t);
  for(let p=0;p<2;p++){
    seg(X+0.4,hy,1.8,sx+1.4,sy-8.5,1.5,p,R_TK_PANT); seg(sx+1.4,sy-8.5,1.4,sx+1.6,sy-1.4,1.2,p,R_TK_PANT); seg(sx+2.2,sy-0.7,1.0,sx-0.2,sy-0.5,0.9,p,R_TK_BOOT);
    seg(X-0.4,hy,1.9,sx-1.2,sy-8.5,1.6,p,R_TK_PANT); seg(sx-1.2,sy-8.5,1.5,sx-1.6,sy-1.4,1.25,p,R_TK_PANT); seg(sx-0.8,sy-0.7,1.05,sx-3.4,sy-0.5,0.95,p,R_TK_BOOT);
    seg(X+2.6,hy-1,0.7,X+3.1,hy+5.5,0.6,p,R_TK_BOOT);                                              // the baton
    seg(X+0.2,hy-0.5,2.8,X+0.6,sy-9.5,3.3,p,R_TK_COAT); seg(X+0.2,hy-0.5,2.7,X-0.3,shY+1.4,2.9,p,R_TK_COAT); dot(X-0.2,shY+1.4,2.7,p,R_TK_COAT);
    seg(X+0.4,shY+1.6,1.4,X+2.6,shY+6,1.25,p,R_TK_COAT); seg(X+2.6,shY+6,1.2,X+2.0,hy-1.2,1.05,p,R_TK_COAT);   // the arm, the hands behind
    seg(X-0.6,shY,1.3,X-0.9,shY-1.2,1.3,p,R_HAND); dot(X-1,shY-2.9,2.1,p,R_HAND);
    seg(X-1.2,shY-4.7,2.0,X+0.4,shY-5.1,2.0,p,R_TK_CAP); seg(X-2.4,shY-3.4,0.6,X-4.3,shY-3.0,0.5,p,R_TK_BOOT);   // the cap, its peak
    seg(X-0.3,shY+1.6,1.4,X-1.5,shY+6.4,1.25,p,R_TK_COAT); seg(X-1.5,shY+6.4,1.2,lh[0],lh[1]-0.6,1.05,p,R_TK_COAT); dot(lh[0],lh[1],0.95,p,R_HAND); }   // the near arm hanging, the lantern in his fist
  for(let x=-2;x<=2;x++) pset(Math.round(X+x),Math.round(hy-0.6),C.tkBelt);
  pset(Math.round(X-2),Math.round(hy-0.6),C.tkBrass); pset(Math.round(X+1.6),Math.round(hy+0.6),C.tkBrass); pset(Math.round(X+1.4),Math.round(hy+1.6),C.tkBrass);   // buckle and keys
  pset(Math.round(X-2.6),Math.round(shY-2.2),C.whisk); pset(Math.round(X-1.8),Math.round(shY-1.6),C.whisk);   // whiskers
  pset(Math.round(X-2.4),Math.round(shY-3.4),appearanceState.C_OUT);
}

/** Copy the figure layer onto the frame in a box and clear it; outlines turn to a dark tone of the smog, not black.
 * @param {Uint32Array} L @param {number} x0 @param {number} x1 @param {number} y0 @param {number} y1 */
function blitLayer(L,x0,x1,y0,y1){
  const M=rendererState.FB_MAIN, w=appearanceState.W, h=appearanceState.H, out=appearanceState.C_OUT;
  x0=Math.max(0,x0|0); x1=Math.min(w-1,x1|0); y0=Math.max(0,y0|0); y1=Math.min(h-1,y1|0);
  for(let y=y0;y<=y1;y++) for(let x=x0,i=y*w+x0;x<=x1;x++,i++){ const c=L[i]; if(c){ M[i]=c===out?C.figOut:c; L[i]=0; } }
}
/** Like blitLayer, for a figure out in the rain: its upper edges glazed by the grey sky, and the figure mirrored dimly in
 * the wet setts below its feet (stronger in the puddles, wavering with the ripples). @param {Uint32Array} L
 * @param {number} x0 @param {number} x1 @param {number} y0 @param {number} y1 @param {number} fy feet @param {number} sheen */
function blitWet(L,x0,x1,y0,y1,fy,sheen){
  const M=rendererState.FB_MAIN, w=appearanceState.W, h=appearanceState.H, out=appearanceState.C_OUT, pud=state.yPud, t=boxingState.tick;
  x0=Math.max(0,x0|0); x1=Math.min(w-1,x1|0); y0=Math.max(1,y0|0); y1=Math.min(h-1,y1|0);
  for(let y=Math.max(y0,Math.floor(fy-10));y<=Math.min(y1,fy);y++){ const ry=Math.round(2*fy-y+1); if(ry>=h||ry<=fy) continue;
    const a=0.5*(1-(fy-y)/10.5), wob=Math.round(0.6*Math.sin(ry*1.9+t*0.21));
    for(let x=x0;x<=x1;x++){ const c=L[y*w+x], xr=x+wob; if(!c||xr<0||xr>=w) continue; const p=ry*w+xr; M[p]=mix(M[p],c===out?Y.figOut:shade(c,0.7),a*(pud[p]?0.85:0.3)); } }
  for(let y=y0;y<=y1;y++) for(let x=x0,i=y*w+x0;x<=x1;x++,i++){ const c=L[i]; if(!c) continue;
    if(c===out) M[i]=Y.figOut; else { const up=L[i-w]; M[i]=up===out||up===0?mix(c,Y.sheen,sheen):c; } }
  for(let y=y0;y<=y1;y++) L.fill(0,y*w+x0,y*w+x1+1);
}
/** Darken (k) or veil (col) the frame in a soft ellipse; soft = 1 spreads it further than the default 2. @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} k @param {number} [col] @param {number} [soft] */
function softSpot(cx,cy,rx,ry,k,col,soft=2){
  const M=rendererState.FB_MAIN, w=appearanceState.W, h=appearanceState.H;
  for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(h-1,Math.ceil(cy+ry));y++) for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(w-1,Math.ceil(cx+rx));x++){
    const q=((x-cx)/rx)**2+((y-cy)/ry)**2; if(q>=1) continue; const p=y*w+x, a=k*(soft===2?(1-q)*(1-q):1-q);
    M[p]=col===undefined?shade(M[p],1-a):mix(M[p],col,a); }
}
/** Blend col into the frame at a sub-pixel point, spread over the four pixels round it. @param {number} x @param {number} y @param {number} col @param {number} a */
function splat(x,y,col,a){
  const M=rendererState.FB_MAIN, w=appearanceState.W, h=appearanceState.H, x0=Math.floor(x), y0=Math.floor(y), fx=x-x0, fy=y-y0;
  const put=(/** @type {number} */ px,/** @type {number} */ py,/** @type {number} */ k)=>{ if(k>0.01&&px>=0&&px<w&&py>=0&&py<h) M[py*w+px]=mix(M[py*w+px],col,Math.min(1,k)); };
  put(x0,y0,a*(1-fx)*(1-fy)); put(x0+1,y0,a*fx*(1-fy)); put(x0,y0+1,a*(1-fx)*fy); put(x0+1,y0+1,a*fx*fy);
}

/** One sheet of rain: n drops falling at vy px a tick with the wind, each re-placed at random every fall; where one hits
 * the ground it bursts into a crown on the setts or a ring in a puddle. Near the lamp the drops catch the gaslight.
 * @param {number} n @param {number} seed @param {number} vy @param {number} len @param {number} gyA @param {number} gyB
 * @param {number} alpha @param {boolean} splash @param {number} [lampOnly] only the drops inside the lamplight, this bright */
function rain(n,seed,vy,len,gyA,gyB,alpha,splash,lampOnly=0){
  const t=boxingState.tick, w=appearanceState.W, h=appearanceState.H, SL=0.24, REST=9, fl=flick(t);
  for(let i=0;i<n;i++){
    const r1=h2(i,seed)/256, r2=h2(i+311,seed)/256, gy=gyA+(gyB-gyA)*r2, top=-len-6-r1*30, F=gy-top, total=F+REST*vy;
    const pos=t*vy+r1*total*7.3, slot=Math.floor(pos/total), ph=pos-slot*total;
    let x0=(h2(i*13+seed,slot)+h2(i*7+1,slot+seed)/256)/256*(w+24)-6;
    if(lampOnly) x0=state.lx-20+(x0+6)/(w+24)*40;
    if(ph<F){ const y=top+ph;
      for(let s=0;s<len;s++){ const py=y-s, row=Math.floor(py); if(row<0||row>=h||py>gy) continue;
        const pxf=x0-(gy-py)*SL, lk=lampK(pxf,py)*fl; if(lampOnly&&lk<0.02) continue;
        const a=(lampOnly?lampOnly*lk:alpha*(1+2.2*lk))*(1-s/len), col=lk>0.05?mix(Y.rain,Y.gas,Math.min(1,lk*1.4)):Y.rain;
        const xi=Math.floor(pxf), f=pxf-xi; splat(xi,row,col,a*(1-f)); splat(xi+1,row,col,a*f); } }
    else if(splash){ const a=(ph-F)/vy, k=1-a/REST, gi=Math.floor(gy);
      if(gi>=h||x0<0||x0>=w) continue;
      const lk=lampK(x0,gy)*fl, col=lk>0.05?mix(Y.rain,Y.gas,lk):Y.rain, A=alpha*2.2*(1+2*lk);
      if(state.yPud&&state.yPud[gi*w+Math.floor(x0)]){ const rr=0.6+a*0.32;                     /* a ring spreading in the puddle */
        for(let q=0;q<8;q++){ const an=q*Math.PI/4; splat(x0+Math.cos(an)*rr,gy+Math.sin(an)*rr*0.35,col,A*0.45*k); } }
      else { for(const sd of [-1,1]) splat(x0+sd*(0.3+a*0.24),gy-a*0.5+a*a*0.055,col,A*0.6*k); if(a<2) splat(x0,gy-0.5,col,A*0.5); }   /* a crown off the setts */
    } }
}
/** Water on the wall: glints running down the rivulets, drops gathering under the sills, the lamp and the hopper and
 * falling, the downpipe overflowing at its head and gushing out of its shoe onto the setts. @param {number} t */
function wallWater(t){
  const fl=flick(t);
  for(const r of RIVULETS){ const L=r.y1-r.y0+24;
    for(let g=0;g<2;g++){ const yy=r.y0+((t*r.sp+r.off+g*L*0.5)%L); if(yy>=r.y1) continue;
      for(let s=0;s<4;s++){ const y=yy-s*0.8; if(y<r.y0) break; const lk=lampK(rivX(r,y),y)*fl; splat(rivX(r,y),y,lk>0.05?Y.gas:Y.sheen,(0.3+lk)*(1-s/4)); } } }
  const DRIPS=[[WINS[0]-3,39,76],[WINS[0]+4,39,77],[WINS[1]-2,39,78],[WINS[1]+3,39,77],[GATE+1,32,77],[GATE-11,46,76],[PIPE+3,16,78]];
  DRIPS.forEach(([x,y0,y1],i)=>{ const P=70+h2(i,5)%80, a=(t+i*29)%P, G=P*0.65;
    if(a<G) splat(x,y0+a/G*0.8,Y.sheen,0.15+0.4*a/G);
    else { const f=a-G, y=y0+0.8+0.045*f*f; if(y<y1){ splat(x,y,Y.sheen,0.6); splat(x,y-1.2,Y.sheen,0.25); }
      else { const s=(y-y1)/(0.09*f+0.01); if(s<6) for(const sd of [-1,1]) splat(x+sd*(0.4+s*0.3),y1-s*0.5+s*s*0.06,Y.sheen,0.45*(1-s/6)); } } });
  for(let y=15;y<73;y++){ const n=vnoise(PIPE*0.9,(y-t*1.9)*0.22), a=Math.max(0,n-0.42)*1.3;   /* overflow down the pipe's face */
    if(a>0) splat(PIPE-2.2+0.4*vnoise(y*0.4,t*0.05),y,Y.sheen,a*(0.4+0.3*(y<20?1:0))); }
  for(let s=0;s<6;s++){ const ph=((t*0.12+s/6)%1), x=PIPE-4.5-ph*4.5, y=73+ph*ph*4;               /* the gush from the shoe */
    splat(x,y,Y.sheen,0.55*(1-ph*0.6)); splat(x+0.6,y-0.3,Y.rain,0.3); }
  for(let s=0;s<5;s++){ const a=(t*0.7+s*3.1)%9, sd=h2(s,Math.floor((t*0.7+s*3.1)/9))&1?1:-1;           /* and its spray where it strikes */
    splat(PIPE-9+sd*(0.5+a*0.35),77-a*0.6+a*a*0.07,Y.rain,0.45*(1-a/9)); }
}
/** Now and then a face in the middle slit: two eyes between the bars, the knuckles round them; it comes and it goes.
 * @param {number} t */
function watcherAt(t){
  const P=760, slot=Math.floor((t+300)/P), a=(t+300)%P; if(h2(slot,41)>110) return;
  const v=Math.min(1,a/70,(470-a)/60); if(v<=0) return;
  const c=WINS[1], M=rendererState.FB_MAIN, w=appearanceState.W, put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ col,/** @type {number} */ k)=>{ M[y*w+x]=mix(M[y*w+x],col,k*v); };
  for(const x of [c-1,c+1]){ put(x,32,Y.skin,0.32); put(x,33,Y.eye,0.9); put(x,34,Y.skin,0.38); put(x,35,Y.skin,0.26); }
  if(a>180){ put(c-2,36,Y.skin,0.55); put(c+2,36,Y.skin,0.5); }                                   /* then the hands close on the bars */
}
/** The gaslight on the wet stone round the lamp, wavering. @param {number} t */
function lampPool(t){
  const M=rendererState.FB_MAIN, w=appearanceState.W, fl=flick(t);
  for(let y=Math.max(0,Math.floor(state.ly-24));y<Math.min(appearanceState.H,state.ly+30);y++) for(let x=Math.max(0,Math.floor(state.lx-24));x<Math.min(w,state.lx+25);x++){ const k=lampK(x,y); if(k>0) M[y*w+x]=mix(M[y*w+x],Y.gasL,k*0.42*fl); }
}

/** The procession of hooded convicts along the far arc of the ring, the turnkey at the gate. */
function drawYardProcession(){
  const t=boxingState.tick, A=appearanceState, L=state.walkL||(state.walkL=new Uint32Array(A.W*A.H)), keepFb=rendererState.fb, PAL=A.PAL;
  rendererState.fb=L;
  softSpot(131,76.5,5,1.2,0.3); drawWarder(TK_X,76,t); blitWet(L,116,146,36,78,76,0.26);
  const order=WALKERS.map((o,k)=>({o,k,x:walkerX(k,t)})).filter(w=>w.x>-16&&w.x<160).sort((a,b)=>ringY(a.x)-ringY(b.x));
  for(const {o,x} of order){ const fy=ringY(x), p=walkPhase(o,t);
    PAL.set(state.walkPal[o.cl],R_HOOD*3); softSpot(x,fy+0.2,6,1.3,0.3);
    drawConvict(x,fy,p,o); blitWet(L,x-15,x+15,fy-48,fy+2,fy,0.32);
    const P=convictPose(x,fy,p,o);
    for(const f of [P.fn,P.ff]){ const since=f.q*P.S/WALK_V; if(since<11&&f.lift===0) for(const sd of [-1,1]) splat(f.x-1.2*o.hk+sd*(1+since*0.3),fy-since*0.45+since*since*0.04,Y.rain,0.32*(1-since/11)); } }   /* water thrown up as a boot comes down */
  rendererState.fb=keepFb;
}
/** The breath of the convicts and the turnkey, over the mist (it is as near as they are). */
function drawYardBreath(){
  const t=boxingState.tick;
  WALKERS.forEach((o,k)=>breath(t,k,260+k*53,te=>{ const xe=walkerX(k,te); if(Math.abs(xe-walkerX(k,t))>40) return null;
    const P=convictPose(xe,ringY(xe),walkPhase(o,te),o); return [P.hx-2.4*o.hk,P.hdy+1.2*o.hk]; }));
  breath(t,9,310,()=>[128.4,45.6]);
}

/** Behind the fighters on the yard: water down the wall, the face in the slit, the far rain, the silent ring of hooded
 * convicts, the hood the rival tore off, the lamplight, the mist and the gusts, the near rain.
 * @param {boolean} hot @param {number} fbx the rival's x @param {number} t0 ticks since the fight began */
export function yardFightBack(hot,fbx,t0){
  yardPalette();
  const t=boxingState.tick; lampTick(t);
  wallWater(t); watcherAt(t); rain(150,3,2.3,4,64,79,0.2,true);
  drawYardProcession();
  const R=state.rag;
  if(t0<2||!R) state.rag={x:fbx,y:30,vx:0.9,vy:-2.2,rest:false};                                // the hood comes off his head
  else if(!R.rest){ R.vy+=0.16; R.x+=R.vx; R.y+=R.vy; R.vx*=0.98; if(R.y>=appearanceState.FLOOR_Y+3){ R.y=appearanceState.FLOOR_Y+3; R.rest=true; } }
  if(state.rag.rest) drawRag(state.rag);                                                         // on the setts behind the fight
  lampPool(t); yardFog(); rain(85,7,3.4,7,80,93,0.3,true); drawYardBreath();
}
/** The hood: a grey canvas bag with two slits, tumbling through the air or lying flat. @param {any} R */
function drawRag(R){
  const x=Math.round(R.x), y=Math.round(R.y), fly=!R.rest;
  for(let dy=-2;dy<=1;dy++) for(let dx=-3;dx<=3;dx++){ if(!fly&&dy<0&&Math.abs(dx)>1) continue; if(fly&&Math.abs(dx)+Math.abs(dy)>4) continue; pset(x+dx,y+dy,(dx+dy)&1?C.hood:C.hoodD); }
  if(fly){ pset(x-1,y-1,C.silhD); pset(x+1,y-1,C.silhD); }
}
/** Over the finished frame on the yard: the gas flame and the rain sparkling round it (they give light, nothing dims
 * them), a few drops between us and the fighters, the hood still in the air, the line under the names.
 * @param {number} t0 ticks since the fight began */
export function yardFightFront(t0){
  const t=boxingState.tick, fl=flick(t), M=rendererState.FB_MAIN, w=appearanceState.W;
  lampTick(t);
  const [hx,hy,lx,ly]=lanternAt(t), cx=Math.round(lx), cy=Math.round(ly), put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ if(x>=0&&x<w&&y>=0&&y<appearanceState.H) M[y*w+x]=c; };
  for(let y=cy-20;y<=cy+18;y++) for(let x=cx-17;x<=cx+17;x++){ if(x<0||x>=w||y<0||y>=appearanceState.H) continue; const q=1-((x-lx)/17)**2-((y-ly-2)/20)**2, g=1-((x-lx)/8)**2-((y-ly)/8)**2;
    if(q>0) M[y*w+x]=mix(shade(M[y*w+x],1+1.5*q*q*fl),Y.gasL,(q*q*0.14+(g>0?g*g*0.3:0))*fl); }   /* what the lantern lights: him, the gate, the wet setts; and its glare */
  for(let y=cy-2;y<=cy+1;y++) for(let x=cx-1;x<=cx+1;x++){ const k=Math.max(0,1-Math.hypot((x-lx)*1.2,(y-ly-0.3)*0.9)/2.2)*fl; put(x,y,mix(Y.glass,Y.gas,Math.min(1,0.2+k*1.2))); }   /* the horn panes, the flame */
  put(cx,cy-3,Y.iron); put(cx-1,cy-3,Y.ironH); put(cx+1,cy-3,Y.iron); put(cx,cy-4,Y.iron); put(cx-1,cy+2,Y.iron); put(cx,cy+2,Y.iron); put(cx+1,cy+2,Y.iron);   /* cap, chimney, base */
  for(let s=0;s<1;s+=0.34) put(Math.round(hx+(lx-hx)*s),Math.round(hy+(cy-4-hy)*s),Y.iron);                          /* the bail */
  rain(30,11,3.1,6,60,100,0,false,0.85); rain(16,13,5.2,12,98,112,0.1,false);
  if(state.rag&&!state.rag.rest&&t0>=2) drawRag(state.rag);                                      // still in the air: in front of the fighters
  if(t0>=2&&t0<90) drawText('ZRYWA KAPTUR!',72,30,C.hoodL,1);
}
/** Mist over the yard behind the fight, recomputed every frame: a high layer drifting slowly to the right and swelling,
 * a low spray of rain creeping the other way round the walkers' legs, and grey sheets of rain swept across by the gusts;
 * dark edges. */
function yardFog(){
  const M=rendererState.FB_MAIN, w=appearanceState.W, h=appearanceState.H, t=boxingState.tick;
  const u1=t*0.0007, v1=Math.sin(t*0.0011)*0.35, u2=t*0.0021, v2=t*0.0005, g=t*0.028, gv=t*0.0025;
  for(let y=0;y<h;y++){ const high=Math.max(0,0.3-y/h*0.4), low=Math.exp(-(((y-72)/9)**2))*0.62, col=y<44?Y.fog:mix(Y.fog,Y.fogD,Math.min(1,(y-44)/36)), vy=(y/h-0.45)*1.4, sk=y*0.32, gy=y<80?0.17:0.08;
    for(let x=0;x<w;x++){ const a1=fbm(x*0.03-u1,y*0.06+v1), a2=fbm(x*0.055+u2+17,y*0.14+v2+3), gs=vnoise((x-sk)*0.05-g,gv+5.5);
      const a=Math.min(0.55,high*(0.3+1.4*a1*a1)+low*Math.max(0,a2*1.8-0.7)+gy*Math.max(0,gs-0.42)*1.7+0.03), v=Math.max(0,Math.hypot((x/w-0.5)*1.6,vy)-0.55), p=y*w+x;
      M[p]=shade(mix(M[p],col,a),1-v*0.75); } }
}

/** A new fight: the rag is put back on the rival's head. */
export function resetNewgateFight(){ state.rag=null; }

export function initialize(){
  Object.assign(C,{vault:rgb('#0a0908'),stone:rgb('#5e5646'),stoneD:rgb('#3e382e'),stoneT:rgb('#766c58'),joint:rgb('#1e1b16'),
    brick:[rgb('#4a2e24'),rgb('#3e261e'),rgb('#54362a')],mortar:rgb('#2a2420'),lime:[rgb('#7e7864'),rgb('#6a6452')],soot:rgb('#121010'),damp:rgb('#2e342a'),slime:rgb('#26301e'),
    ash:[rgb('#6a5d48'),rgb('#5a4f3d'),rgb('#7a6c54')],bed:rgb('#4e3c28'),bedH:rgb('#62503a'),bedF:rgb('#3a2c1c'),bedK:rgb('#1c150e'),under:rgb('#0e0a06'),
    tick:rgb('#5e5844'),tickD:rgb('#4a4434'),iron:rgb('#1c1c1e'),ironH:rgb('#3a3a3e'),smog:rgb('#5c5e4c'),smogL:rgb('#727462'),scratch:rgb('#857e69'),piss:rgb('#5a5626'),
    flag:[rgb('#4a4640'),rgb('#423e38'),rgb('#3a3731')],fjoint:rgb('#1e1c19'),gloom:rgb('#1a1612'),silhD:rgb('#14110e'),
    cup:rgb('#4a4640'),flame1:rgb('#ff9a3a'),flame2:rgb('#fff0b0'),smoke:rgb('#3a3632'),
    cope:rgb('#4a463e'),copeT:rgb('#625e54'),salt:rgb('#7a766a'),sett:[rgb('#3e3c38'),rgb('#36342f'),rgb('#46433d')],mud:rgb('#221f1a'),flagY:rgb('#5a564c'),
    dark:rgb('#0a0a0c'),rust:rgb('#5a3420'),rustD:rgb('#3e2416'),fog:rgb('#6e705e'),hood:rgb('#6e6d66'),hoodD:rgb('#4e4e4a'),hoodL:rgb('#c8c6b8'),
    frieze:rgb('#342e26'),friezeD:rgb('#221e18'),pant:rgb('#1e1c18'),tkCoat:rgb('#181c28'),tkCoatD:rgb('#12141e'),tkCap:rgb('#101218'),tkBrass:rgb('#625432')});
  Object.assign(C,{skyT:rgb('#3c3e34'),far:rgb('#2a2a26'),drip:rgb('#0e0d0c'),mortarL:rgb('#3a342e'),bloom:rgb('#8a8676'),granite:rgb('#4e4a42'),wet:rgb('#1c1e1c'),
    ybrick:[rgb('#4a2e24'),rgb('#3e261e'),rgb('#54362a'),rgb('#5a3e2c'),rgb('#3a2a22')],moss:rgb('#262c1a'),puddle:rgb('#2e302c'),glint:rgb('#5c5e52'),
    bar:rgb('#2e2e32'),void:rgb('#050506'),pipeH:rgb('#34343a'),ironK:rgb('#0e0e10'),figOut:rgb('#17150f'),breath:rgb('#c2c4b6'),fogD:rgb('#5a5c4e'),
    tkBelt:rgb('#0c0c0e'),whisk:rgb('#2a2018')});
  Object.assign(C,{limeL:rgb('#a29c86'),limeD:rgb('#4e4a3e'),crack:rgb('#0c0a08'),nail:rgb('#14100c'),straw:rgb('#7a6e48'),sky:rgb('#a8ae9e'),skyD:rgb('#6a7062'),
    beam:rgb('#8c9488'),silh:rgb('#0b0a08'),silhL:rgb('#2a2620'),rimW:rgb('#e09850'),rimC:rgb('#a8b4ae'),beamL:rgb('#c4c8b8'),mist:rgb('#1e1e1a')});
  state.walkPal=WALK_CLOTHES.map(([hood,coat,pant])=>{ setRamp(R_HOOD,hood,false); setRamp(R_HOODF,hood,true); setRamp(R_COAT,coat,false); setRamp(R_COATF,coat,true);
    setRamp(R_PANT,pant,false); setRamp(R_PANTF,pant,true); setRamp(R_BOOT,['#0e0c0a','#1a1714','#2a2622'],false); setRamp(R_BOOTF,['#0e0c0a','#1a1714','#2a2622'],true);
    return appearanceState.PAL.slice(R_HOOD*3,(R_BOOTF+1)*3); });
  setRamp(R_HAND, ['#4e3a2c', '#6e5240', '#8a6a52'], false);
  setRamp(R_HANDF, ['#4e3a2c', '#6e5240', '#8a6a52'], true);
  setRamp(R_TK_COAT, ['#121622', '#1c2234', '#2a344e'], false);
  setRamp(R_TK_COATF, ['#0a0e16', '#141824', '#1e2638'], true);
  setRamp(R_TK_PANT, ['#101218', '#1a1c24', '#262834'], false);
  setRamp(R_TK_BOOT, ['#0a0a0e', '#14141a', '#202028'], false);
  setRamp(R_TK_CAP, ['#0e1018', '#181c28', '#262c3e'], false);
  state.wardEx=null; state.wardT=undefined; state.yard=null; state.rag=null; state.walkL=null;
  state.noise=new Float32Array(NG*NG).map((_,i)=>h2(i&31,(i>>5)+77)/255);
}
