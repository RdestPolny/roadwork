/* The roach wall: the Ward's back wall over the guard-bed, seen from the hero's eyes (native 144×96). Soot-black brick
   in English bond under flaking limewash, GOD HELP ME scratched into it with tallies and a cross, cracks where the
   mortar has gone, an iron ring for the chains and its rust, damp rising from the bed; the bed's planks along the
   bottom. A tallow lamp stands on the bed behind him, low on the left: it rakes the wall, flickers a little and lays
   his shoulder and the shadow of his fist on the lime. The light is mood only and never changes what can be seen.
   The wall is a height field relit every frame; roaches, squashed bodies, the fist and the dust take the same light.
   The fist itself comes into the picture only while it is thrown. */

import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { vnoise, fbm } from './newgate-fight.js';
import { SURFACE } from './roach-rules.js';

/** The wall's rows end here; below lies the guard-bed. */
export const WALL_Y1 = 84;
/** Cracks in the wall where roaches come out and go in. */
export const CRACKS = [{x:15,y:38,r:2.4},{x:57,y:9,r:2},{x:79,y:71,r:2.6},{x:129,y:41,r:2.3},{x:101,y:25,r:1.9}];
/** The iron ring for the chains (its plate; the ring hangs below it). */
export const RING = {x:116,y:56};
/** GOD HELP ME, scratched at twice the font size; prusaks sometimes crawl out of the hollow of its O. */
const CARVE = {x:23,y:12,text:'GOD HELP ME'};
export const NAME_HOLE = {x:CARVE.x+8+2,y:CARVE.y+4};
const NAIL = {x:34,y:47};
/** The lamp behind him on the bed, in wall pixels (z towards the viewer). */
const LAMP = {x:-58,y:74,z:112};
const GAIN = 2.25, FALL2 = 1/(150*150), AMB = [0.085,0.098,0.105], WARM = [1,0.72,0.44];
/** Where the shadow of his right shoulder lies, and where the thrown fist comes from (off the picture). */
const SHOULDER = {dx:20,dy:4,rx:34,ry:24};
/** Where the thrown fist comes from: his right shoulder, below the picture. */
export const FIST_FROM = {x:124,y:142};
/** The shoulder's shadow below the picture, the upper arm and the forearm (wall pixels): the arm comes up from below,
 * straightens as the fist goes higher and folds at the elbow as it comes down. */
const ARM = {x:100,y:124,upper:50,fore:46};
const K_LIME=0, K_BRICK=1, K_MORTAR=2, K_IRON=3, K_CRACK=4, K_GROOVE=5, K_BED=6;

/** Baked maps of the wall, the light of this frame and the small life on it. */
export const state = {
  /** @type {Float32Array} */ alb:new Float32Array(0), /** @type {Float32Array} */ hgt:new Float32Array(0),
  /** @type {Float32Array} */ nrm:new Float32Array(0), /** @type {Uint8Array} */ kind:new Uint8Array(0),
  /** @type {Float32Array} */ wet:new Float32Array(0), /** @type {Float32Array} */ lam:new Float32Array(0),
  /** @type {Float32Array} */ shade:new Float32Array(0), /** @type {Float32Array} */ col:new Float32Array(0),
  /** @type {Float32Array} */ vign:new Float32Array(0),
  t:0, lx:LAMP.x, ly:LAMP.y, I:1, lampK:1, breathT:90,
  /** @type {{x:number,y:number,vx:number,vy:number,age:number,life:number,c:number[],goo:boolean}[]} */ parts:[],
  /** @type {{x:number,y:number,age:number,life:number,vx:number}[]} */ puffs:[],
  /** @type {{x:number,y:number,ph:number}[]} */ motes:[],
};

/* ---------- small helpers ---------- */

/** @param {string} hex @returns {number[]} linear-ish 0..1 colour */
const C3 = (hex)=>{ const c=rgb(hex); return [(c&255)/255,((c>>8)&255)/255,((c>>16)&255)/255]; };
/** @param {number[]} a @param {number[]} b @param {number} k */
const mix3 = (a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
/** @param {number[]} a @param {number} k */
const mul3 = (a,k)=>[a[0]*k,a[1]*k,a[2]*k];
/** @param {number} a @param {number} b @param {number} x */
function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
const clamp01 = (/** @type {number} */ v)=>v<0?0:v>1?1:v;
/** @param {number} v 0..1 → 0..255 */
const to8 = (v)=>v<=0?0:v>=1?255:Math.round(v*255);

const P = {
  brick:['#5e3c2e','#6a4433','#54382c','#714a37','#4a3328'].map(C3), mortar:C3('#5d564a'), lime:C3('#a59f8b'), limeOld:C3('#948a72'),
  grime:C3('#1b1611'), damp:C3('#28301f'), salt:C3('#c9c5b4'), crack:C3('#0a0806'), iron:C3('#2c2925'), rust:C3('#6c3818'), rustD:C3('#46220f'),
  groove:C3('#3a2a22'), grooveL:C3('#7d6a58'), wood:C3('#4b3a28'), woodL:C3('#64503a'), woodD:C3('#2a2016'), straw:C3('#9c8752'),
  chip:C3('#d9d3c2'), blood:C3('#5c1410'), bloodW:C3('#7a1c14'), goo:C3('#cdbb8a'), gooD:C3('#7c6c48'), gut:C3('#3a2414'),
  skin:C3('#a07458'), knuck:C3('#a3422f'), cloth:C3('#4a3c2c'), clothD:C3('#33291d'),
};

/** Which surface the fist meets at a point of the wall. @param {number} x @param {number} y @returns {number} */
export function surfaceAt(x,y){
  const w=appearanceState.W, xi=Math.max(0,Math.min(w-1,Math.round(x))), yi=Math.max(0,Math.min(WALL_Y1-1,Math.round(y)));
  const k=state.kind[yi*w+xi];
  return k===K_BRICK?SURFACE.brick:k===K_IRON?SURFACE.iron:k===K_MORTAR||k===K_CRACK?SURFACE.mortar:SURFACE.lime;
}

/* ---------- the wall, baked ---------- */

/** Brick, mortar and limewash at a pixel: colour, height, surface, wetness. @param {number} x @param {number} y
 * @returns {[number[],number,number,number]} */
function wallPx(x,y){
  const course=Math.floor(y/8), ry=y-course*8, stretch=(course&1)===0, L=stretch?24:12, off=stretch?((course>>1)&1)*12+3:9;
  const u=x+off, bx=Math.floor(u/L), fx=u-bx*L, joint=ry===7||fx===0, id=h2(bx*3+course*7+11,course*5+3);
  const ex=Math.min(fx,L-fx)-0.5, ey=Math.min(ry+1,7-ry)-0.5, e=Math.min(ex,ey);
  let c, h, k, wet=0;
  if(joint){ c=mul3(P.mortar,0.85+0.3*vnoise(x*0.9,y*0.9)); h=0.3+0.2*vnoise(x*0.7+3,y*0.7); k=K_MORTAR; }
  else {
    c=mul3(P.brick[id%5],0.88+((id>>3)&15)/15*0.22); k=K_BRICK;
    h=1-0.38*(1-smooth(0,1.1,e))-0.12*vnoise(x*0.6+id,y*0.7)-(vnoise(x*0.7+id,y*0.8)>0.78?0.22:0);
    const cx=fx<L/2?fx:L-fx, cy=ry<4?ry+1:7-ry;
    if(h2(id,bx+1)<34&&fx<L/2===(h2(id,5)&1)>0&&ry<4===(h2(id,6)&1)>0&&cx<3.2&&cy<2.6&&cx+cy<4.4){ h-=0.45; c=mix3(c,C3('#7a5a46'),0.35); }   // a broken arris
    c=mix3(c,P.grime,0.25*vnoise(x*0.3+id,y*0.5));
  }
  const limeN=vnoise(x*0.05+2,y*0.068)*0.7+vnoise(x*0.18,y*0.21+4)*0.3;
  if(limeN>0.41){
    const lip=limeN<0.445;
    c=mix3(P.lime,P.limeOld,vnoise(x*0.12+7,y*0.15)); c=mix3(c,P.grime,0.16*vnoise(x*0.5,y*0.5+9)+(lip?0.3:0)+(joint?0.22:0));   // the coat follows the bricks; dirt sits in the joints
    h=0.55*h+0.62+0.06*vnoise(x*0.45,y*0.45)+(lip?0.18:0); k=K_LIME;   // the coat fills the joints half-way
  } else if(limeN>0.37&&vnoise(x*0.8+2,y*0.8)>0.55) c=mix3(c,P.lime,0.55);                   // specks of lime left in the pits
  if(y<28) c=mix3(c,P.grime,0.55*(1-y/28)**1.5);                                                    // soot under the vault
  const run=vnoise(x*0.16+5,y*0.02+1.7); if(run>0.66) c=mix3(c,P.damp,Math.min(0.45,(run-0.66)*2.4));   // damp running down
  const tide=64+5*vnoise(x*0.07,1.3);
  if(y>tide){ c=mix3(mul3(c,0.8),P.damp,0.22); wet=0.18+0.14*vnoise(x*0.3,y*0.3); }                // rising damp from the bed
  if(Math.abs(y-tide)<1.3) c=mix3(c,P.salt,0.4*(1-Math.abs(y-tide)/1.3));                           // its salt line
  c=mul3(c,0.86+0.2*fbm(x*0.08+3,y*0.08));
  return [c,h,k,wet];
}

/** The guard-bed's planks at the bottom, edge-on from where he kneels. @param {number} x @param {number} y @returns {number[]} */
function bedPx(x,y){
  if(y===WALL_Y1) return mul3(P.woodD,0.35);                                                        // the black gap at the wall
  const b=y<87?0:y<91?1:2, top=[85,87,91][b], g=vnoise(x*0.05+b*9,(y-top)*1.4+b*3);
  let c=mix3(P.wood,P.woodL,g*0.8); if(y===top) c=mul3(P.woodD,0.8);
  if(h2(Math.floor(x/3)+b*50,b)<26&&((x+y*2)%5)<2) c=mix3(c,P.straw,0.7);                          // straw off the pallets
  return mul3(c,0.8+0.25*fbm(x*0.1,y*0.6+b));
}

/** Scratch a 1-px groove from (x0,y0) to (x1,y1) through the lime. @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {number} depth */
function groove(x0,y0,x1,y1,depth){
  const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*1.5)), w=appearanceState.W;
  for(let s=0;s<=n;s++){ const x=Math.round(x0+(x1-x0)*s/n), y=Math.round(y0+(y1-y0)*s/n); if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
    const i=y*w+x; if(state.kind[i]===K_GROOVE) continue;
    const lime=state.kind[i]===K_LIME; state.hgt[i]-=depth; state.kind[i]=K_GROOVE;
    setAlb(i,lime?mix3(P.groove,P.brick[h2(x,y)%5],0.4):P.grooveL); }
}
/** @param {number} i @param {number[]} c */
function setAlb(i,c){ state.alb[i*3]=c[0]; state.alb[i*3+1]=c[1]; state.alb[i*3+2]=c[2]; }
/** @param {number} i @returns {number[]} */
const getAlb = (i)=>[state.alb[i*3],state.alb[i*3+1],state.alb[i*3+2]];

/** GOD HELP ME at twice the font size, its strokes joined, and the dates, tallies and a cross by other hands. */
function carvings(){
  const FONT=boxingState.FONT;
  /** @param {string} s @param {number} x0 @param {number} y0 @param {number} sc */
  const write=(s,x0,y0,sc)=>{ for(let k=0;k<s.length;k++){ const g=FONT[s.charCodeAt(k)]; if(!g) continue; const on=(/** @type {number} */ q,/** @type {number} */ r)=>q>=0&&q<3&&r>=0&&r<5&&!!(g&(1<<(14-(r*3+q))));
    const px=(/** @type {number} */ q)=>x0+k*4*sc+q*sc+(h2(k,q)&1)*0.4, py=(/** @type {number} */ r)=>y0+r*sc+(h2(k+9,r)&1)*0.4;
    for(let r=0;r<5;r++) for(let q=0;q<3;q++){ if(!on(q,r)) continue; groove(px(q),py(r),px(q),py(r),0.55);
      if(on(q+1,r)) groove(px(q),py(r),px(q+1),py(r),0.55); if(on(q,r+1)) groove(px(q),py(r),px(q),py(r+1),0.55);
      if(!on(q+1,r)&&!on(q,r+1)&&on(q+1,r+1)) groove(px(q),py(r),px(q+1),py(r+1),0.55); if(!on(q-1,r)&&!on(q,r+1)&&on(q-1,r+1)) groove(px(q),py(r),px(q-1),py(r+1),0.55); } } };
  write(CARVE.text,CARVE.x,CARVE.y,2); write('W.H. 1867',10,66,1);
  for(let m=0;m<13;m++){ const g=Math.floor(m/5), q=m%5, x=84+g*12+q*2; if(q<4) groove(x,33,x+0.4,42,0.5); else groove(x-9,40,x+1,34,0.5); }   // tallies in fives
  groove(121,15,121,27,0.6); groove(117,19,125,19,0.6);                                                       // a cross
}

/** Holes where the mortar has gone: deep, black, a crumbling rim, a hairline running off. */
function cracks(){
  const w=appearanceState.W;
  for(const [n,c] of [...CRACKS,{...NAME_HOLE,r:1.1}].entries()){
    for(let y=Math.floor(c.y-c.r-3);y<=c.y+c.r+3;y++) for(let x=Math.floor(c.x-c.r-4);x<=c.x+c.r+4;x++){ if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
      const dx=x+0.5-c.x, dy=(y+0.5-c.y)*1.3, d=Math.hypot(dx,dy), r=c.r*(0.75+0.5*vnoise(Math.atan2(dy,dx)*1.6+n*5,n*3.1)), i=y*w+x;
      if(d<r){ state.kind[i]=K_CRACK; state.hgt[i]=-1.8+d/r; setAlb(i,mix3(P.crack,P.mortar,0.15*d/r)); }
      else if(d<r+1.3&&state.kind[i]!==K_GROOVE){ state.kind[i]=K_MORTAR; state.hgt[i]=Math.min(state.hgt[i],0.25); setAlb(i,mul3(P.mortar,0.75)); } }
    if(c.r<1.5) continue;
    let x=c.x, y=c.y, a=h2(n,7)/255*6.28;
    for(let s=0;s<14+h2(n,8)%10;s++){ a+=(h2(n*31+s,9)/255-0.5)*0.9; const nx=x+Math.cos(a)*1.4, ny=y+Math.sin(a)*1.4; groove(x,y,nx,ny,0.4); x=nx; y=ny; }
  }
}

/** The iron ring on its plate, the old nail, and the rust that ran down from both. */
function ironwork(){
  const w=appearanceState.W, R=RING, cy=R.y+8;
  for(let y=R.y-6;y<WALL_Y1;y++) for(let x=R.x-8;x<=R.x+8;x++){ const i=y*w+x;
    const ax=Math.abs(x+0.5-R.x), ay=Math.abs(y+0.5-R.y), dr=Math.hypot(x+0.5-R.x,(y+0.5-cy)/0.86), tube=Math.abs(dr-5.2);
    if(ax<4.2&&ay<3.8){ const bev=Math.min(4.2-ax,3.8-ay); state.kind[i]=K_IRON; state.hgt[i]=1.6+Math.min(0.5,bev*0.4); let c=mul3(P.iron,0.9+0.2*vnoise(x*0.7,y*0.7)); if(vnoise(x*0.5+3,y*0.6)>0.6) c=mix3(c,P.rust,0.6); if((ax>2.4&&ax<3.2)&&(ay>1.6&&ay<2.4)) c=mul3(c,0.5); setAlb(i,c); state.wet[i]=0.25; }
    else if(tube<1.35&&y>R.y+2){ state.kind[i]=K_IRON; state.hgt[i]=2.2+Math.sqrt(1.35*1.35-tube*tube)*1.3; let c=mul3(P.iron,0.95); if(vnoise(x*0.6,y*0.4+2)>0.58) c=mix3(c,P.rust,0.55); setAlb(i,c); state.wet[i]=0.3; }
    else if(y>cy+5&&Math.abs(x+0.5-R.x-0.6*vnoise(y*0.1,3))<1.6+1.4*vnoise(x*0.4,y*0.05)){ const k=0.55*(1-(y-cy-5)/(WALL_Y1-cy-5)); setAlb(i,mix3(getAlb(i),P.rustD,k)); }
  }
  for(let y=NAIL.y-2;y<NAIL.y+12;y++) for(let x=NAIL.x-2;x<=NAIL.x+2;x++){ const i=y*w+x, d=Math.hypot(x+0.5-NAIL.x,y+0.5-NAIL.y);
    if(d<1.3){ state.kind[i]=K_IRON; state.hgt[i]=2.1-d*0.5; setAlb(i,mix3(P.iron,P.rust,0.3)); }
    else if(y>NAIL.y+1&&Math.abs(x+0.5-NAIL.x)<0.9) setAlb(i,mix3(getAlb(i),P.rustD,0.5*(1-(y-NAIL.y)/12))); }
}

/** Normals from the height field (the bed keeps its own). @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 */
function normals(x0,y0,x1,y1){
  const w=appearanceState.W, H=state.hgt, N=state.nrm;
  for(let y=Math.max(0,y0);y<=Math.min(WALL_Y1-1,y1);y++) for(let x=Math.max(0,x0);x<=Math.min(w-1,x1);x++){ const i=y*w+x;
    const dx=H[y*w+Math.min(w-1,x+1)]-H[y*w+Math.max(0,x-1)], dy=H[Math.min(WALL_Y1-1,y+1)*w+x]-H[Math.max(0,y-1)*w+x];
    const nx=-dx*0.95, ny=-dy*0.95, l=Math.hypot(nx,ny,1); N[i*3]=nx/l; N[i*3+1]=ny/l; N[i*3+2]=1/l; }
}

/** Bake the wall for a new session: fresh lime, no stains. The renderer's buffer is untouched. */
export function buildRoachWall(){
  const w=appearanceState.W, h=appearanceState.H, N=w*h, S=state;
  S.alb=new Float32Array(N*3); S.hgt=new Float32Array(N); S.nrm=new Float32Array(N*3); S.kind=new Uint8Array(N); S.wet=new Float32Array(N);
  S.lam=new Float32Array(N); S.shade=new Float32Array(N); S.col=new Float32Array(N*3); S.vign=new Float32Array(N);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x;
    if(y<WALL_Y1){ const [c,hh,k,wet]=wallPx(x,y); setAlb(i,c); S.hgt[i]=hh; S.kind[i]=k; S.wet[i]=wet; }
    else { setAlb(i,bedPx(x,y)); S.kind[i]=K_BED; }
    const vx=(x+0.5-70)/86, vy=(y+0.5-46)/62; S.vign[i]=1-0.62*smooth(0.35,1.25,Math.hypot(vx,vy)); }
  carvings(); cracks(); ironwork(); normals(0,0,w-1,WALL_Y1-1);
  S.t=0; S.lampK=1; S.parts=[]; S.puffs=[]; S.breathT=90;
  S.motes=Array.from({length:14},(_,k)=>({x:h2(k,1)/255*144,y:10+h2(k,2)/255*70,ph:k*1.7}));
}

/* ---------- marks the session leaves ---------- */

/** Lime knocked off by a missed punch: a pale fresh edge round a pit. @param {number} x @param {number} y */
export function chipWall(x,y){
  const w=appearanceState.W;
  for(let yy=Math.floor(y-3);yy<=y+3;yy++) for(let xx=Math.floor(x-4);xx<=x+4;xx++){ if(xx<0||yy<0||xx>=w||yy>=WALL_Y1) continue;
    const i=yy*w+xx, d=Math.hypot((xx+0.5-x)/1.3,yy+0.5-y), r=1.6+1.2*vnoise(xx*0.9+x,yy*0.9+y);
    if(d<r){ const lime=state.kind[i]===K_LIME; state.hgt[i]-=lime?0.35:0.15; setAlb(i,lime?mix3(P.brick[h2(xx,yy)%5],P.chip,0.25):mix3(getAlb(i),P.chip,0.18)); }
    else if(d<r+0.9&&state.kind[i]===K_LIME) setAlb(i,mix3(getAlb(i),P.chip,0.55)); }
  normals(Math.floor(x-6),Math.floor(y-5),Math.ceil(x+6),Math.ceil(y+5));
}
/** The knuckles' print in blood, four marks in a row, still wet. @param {number} x @param {number} y */
export function bloodWall(x,y){
  const w=appearanceState.W;
  for(const kx of [-4,-1.4,1.4,4]){ const cx=x+kx+(Math.random()-0.5)*0.6, cy=y-1+Math.abs(kx)*0.12;
    for(let yy=Math.floor(cy-1);yy<=cy+2;yy++) for(let xx=Math.floor(cx-1);xx<=cx+1;xx++){ if(xx<0||yy<0||xx>=w||yy>=WALL_Y1) continue;
      const i=yy*w+xx, d=Math.hypot(xx+0.5-cx,(yy+0.5-cy)*0.8+(yy>cy?-0.3:0)); if(d>1.25) continue;
      setAlb(i,mix3(getAlb(i),d<0.7?P.bloodW:P.blood,d<0.7?0.9:0.6)); state.wet[i]=Math.max(state.wet[i],0.7); } }
}
/** Lime dust and grit bursting from a missed punch. @param {number} x @param {number} y @param {number} n */
export function wallDust(x,y,n){
  for(let k=0;k<n;k++){ const a=Math.random()*6.28, v=0.3+Math.random()*0.9;
    state.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.6-0.3,age:0,life:25+Math.random()*40,c:Math.random()<0.7?P.chip:P.mortar,goo:false}); }
}
/** Drops squirting from under the knuckles. @param {number} x @param {number} y @param {number} n */
export function wallGoo(x,y,n){
  for(let k=0;k<n;k++){ const a=Math.random()*6.28, v=0.6+Math.random()*1.1;
    state.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v*0.7,age:0,life:6+Math.random()*7,c:P.goo,goo:true}); }
}

/* ---------- the life in the scene ---------- */

/** One sim tick: lamp flicker, dust settling, drops sticking, breath in the cold. @param {{pain:number,lampK:number}} g */
export function roachWallTick(g){
  const S=state; if(!S.alb.length) return; S.t++;
  const t=S.t; S.lampK=g.lampK;
  S.I=1+0.11*(fbm(t*0.045,3.1)-0.5)+0.02*Math.sin(t*0.37)+(h2(t>>2,77)<6?-0.05:0);
  S.lx=LAMP.x+(fbm(t*0.03,7)-0.5)*2.6; S.ly=LAMP.y+(fbm(t*0.035,9)-0.5)*1.8;
  for(const p of S.parts){ p.age++; p.x+=p.vx; p.y+=p.vy;
    if(p.goo){ p.vx*=0.7; p.vy*=0.7; if(p.age>=p.life-1) gooDot(p.x,p.y); }
    else { p.vy+=0.045; p.vx*=0.96; if(p.y>=WALL_Y1+1+((p.x*7)%4)){ p.vy=0; p.vx=0; } } }
  S.parts=S.parts.filter(p=>p.age<p.life);
  if(--S.breathT<=0){ S.puffs.push({x:66+Math.random()*12,y:99,age:0,life:80,vx:(Math.random()-0.5)*0.12}); S.breathT=200-Math.min(120,g.pain*1.3)+Math.random()*40; }
  for(const p of S.puffs) p.age++; S.puffs=S.puffs.filter(p=>p.age<p.life);
  for(const m of S.motes){ m.x+=Math.sin(t*0.011+m.ph)*0.05+0.015; m.y+=Math.cos(t*0.009+m.ph)*0.04-0.008; if(m.x>146) m.x=-2; if(m.y<2) m.y=WALL_Y1-2; }
}
/** A drop that hit the wall stays as a wet speck. @param {number} x @param {number} y */
function gooDot(x,y){ const w=appearanceState.W, xi=Math.round(x), yi=Math.round(y); if(xi<0||yi<0||xi>=w||yi>=WALL_Y1) return; const i=yi*w+xi; setAlb(i,mix3(getAlb(i),P.goo,0.7)); state.wet[i]=Math.max(state.wet[i],0.6); }

/* ---------- shadows ---------- */

/** @param {number} px @param {number} py @param {number} hw @param {number} hh @param {number} r */
function sdBox(px,py,hw,hh,r){ const qx=Math.abs(px)-hw+r, qy=Math.abs(py)-hh+r; return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r; }
/** Tapered capsule a→b, radius ra→rb. @returns {[number,number]} distance and position t along it */
function sdCone(/** @type {number} */ px,/** @type {number} */ py,/** @type {number} */ ax,/** @type {number} */ ay,/** @type {number} */ bx,/** @type {number} */ by,/** @type {number} */ ra,/** @type {number} */ rb){
  const dx=bx-ax, dy=by-ay, t=clamp01(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1));
  return [Math.hypot(px-ax-dx*t,py-ay-dy*t)-(ra+(rb-ra)*t),t]; }
/** Smooth union. @param {number} a @param {number} b @param {number} k */
function smin(a,b,k){ const h=clamp01(0.5+0.5*(b-a)/k); return b+(a-b)*h-k*h*(1-h); }
const KN = [[-4.1,-1.3],[-1.35,-1.7],[1.4,-1.7],[4.1,-1.25]];
/** The clenched fist seen from behind, around the knuckles' middle (local units). @param {number} px @param {number} py @returns {number} */
function sdFist(px,py){
  let d=sdBox(px,py-2.8,6.2,4.8,2.8);
  for(const [kx,ky] of KN) d=smin(d,Math.hypot(px-kx,py-ky)-1.75,0.9);
  d=smin(d,sdCone(px,py,-6.3,2,-4,6.4,2.1,2)[0],1.1);
  return d;
}

/** Where the arm's shadow runs to the fist: shoulder, elbow (kept outward and down), wrist. Out of reach the shoulder
 * comes after the fist, as he leans in. @param {number} wx @param {number} wy @param {number} t */
function armShadow(wx,wy,t){
  let sx=ARM.x+Math.sin(t*0.035)*1.2, sy=ARM.y+Math.sin(t*0.035)*1.6, dx=wx-sx, dy=wy-sy, d=Math.hypot(dx,dy)||1;
  const max=(ARM.upper+ARM.fore)*0.985;
  if(d>max){ sx=wx-dx/d*max; sy=wy-dy/d*max; dx=wx-sx; dy=wy-sy; d=max; }
  const a=(ARM.upper**2-ARM.fore**2+d*d)/(2*d), h=Math.sqrt(Math.max(0,ARM.upper**2-a*a)), bx=sx+dx*a/d, by=sy+dy*a/d, nx=-dy/d, ny=dx/d;
  const e1=[bx+nx*h,by+ny*h], e2=[bx-nx*h,by-ny*h], out=(/** @type {number[]} */ e)=>e[0]*0.8+e[1]*0.6, e=out(e1)>out(e2)?e1:e2;
  return {sx,sy,ex:e[0],ey:e[1]};
}

/** The shadows on the wall this frame: his shoulder low on the right (breathing), the arm bent at the elbow and the fist
 * at the aim. @param {any} V */
function shadows(V){
  const S=state, w=appearanceState.W, Sh=S.shade, sh=V.shadow, s=sh.s, blur=sh.blur, ax=sh.x+sh.ox, ay=sh.y+sh.oy;
  const wx=ax+0.8*s, wy=ay+6.5*s, A=armShadow(wx,wy,S.t), bx=A.sx+SHOULDER.dx, by=A.sy+SHOULDER.dy;
  const x0=Math.min(A.sx,A.ex,wx)-12, x1=Math.max(A.sx,A.ex,wx)+12, y0=Math.min(A.ey,wy)-12;
  for(let y=0;y<appearanceState.H;y++) for(let x=0;x<w;x++){ const i=y*w+x, px=x+0.5, py=y+0.5;   // the bed's planks take the arm too
    const e=Math.hypot((px-bx)/SHOULDER.rx,(py-by)/SHOULDER.ry); let v=0.55*(1-smooth(0.7,1.3,e));
    if(px>x0&&px<x1&&py>y0){
      const [du]=sdCone(px,py,A.sx,A.sy,A.ex,A.ey,8.5,6.2), [df]=sdCone(px,py,A.ex,A.ey,wx,wy,6,3.6*s), da=smin(du,df,2.5);
      if(da<blur*2+1) v=Math.max(v,0.8*smooth(blur+0.6,-blur-0.6,da)); }
    if(Math.abs(px-ax)<14*s&&Math.abs(py-ay)<12*s){ const df=sdFist((px-ax)/s,(py-ay)/s)*s; v=Math.max(v,0.95*smooth(blur+0.5,-blur-0.5,df)); }
    Sh[i]=v; }
}

/* ---------- light ---------- */

/** Relight the wall and the bed into the colour buffer; keep the lamp's reach per pixel for what is drawn on top. */
function lightWall(){
  const S=state, w=appearanceState.W, h=appearanceState.H, A=S.alb, N=S.nrm, H=S.hgt, col=S.col, I=S.I*S.lampK, amb=0.35+0.65*S.lampK;
  const a0=AMB[0]*amb, a1=AMB[1]*amb, a2=AMB[2]*amb;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x, bed=y>=WALL_Y1;
    const pz=bed?(y-WALL_Y1)*7:H[i]*1.4, py=bed?WALL_Y1:y;
    const dx=S.lx-x, dy=S.ly-py, dz=LAMP.z-pz, d2=dx*dx+dy*dy+dz*dz, inv=1/Math.sqrt(d2);
    const nx=bed?0:N[i*3], ny=bed?-0.75:N[i*3+1], nz=bed?0.66:N[i*3+2];
    const ndl=Math.max(0,(nx*dx+ny*dy+nz*dz)*inv), lam=I/(1+d2*FALL2)*(1-S.shade[i]*0.92);
    S.lam[i]=lam; const l=lam*ndl*GAIN;
    let sp=0; const wt=S.wet[i];
    if(wt>0){ const hx=dx*inv, hy=dy*inv, hz=dz*inv+1, hl=Math.hypot(hx,hy,hz), nh=Math.max(0,(nx*hx+ny*hy+nz*hz)/hl); sp=wt*lam*1.5*nh**22; }
    col[i*3]=A[i*3]*(a0+l*WARM[0])+sp; col[i*3+1]=A[i*3+1]*(a1+l*WARM[1])+sp*0.82; col[i*3+2]=A[i*3+2]*(a2+l*WARM[2])+sp*0.6; }
}

/** Shade a small glossy dome (a roach's shell, a squashed body) at pixel i and blend it in.
 * @param {number} i @param {number} x @param {number} y @param {number[]} c @param {number} nx @param {number} ny @param {number} nz @param {number} gloss @param {number} a */
function shadeDot(i,x,y,c,nx,ny,nz,gloss,a){
  const S=state, dx=S.lx-x, dy=S.ly-y, dz=LAMP.z-2, inv=1/Math.hypot(dx,dy,dz), lam=S.lam[i]/(1-S.shade[i]*0.92)*(1-S.shade[i]*0.8);
  const ndl=Math.max(0,(nx*dx+ny*dy+nz*dz)*inv), l=lam*ndl*GAIN, amb=0.35+0.65*S.lampK;
  const hx=dx*inv, hy=dy*inv, hz=dz*inv+1, hl=Math.hypot(hx,hy,hz), nh=Math.max(0,(nx*hx+ny*hy+nz*hz)/hl), sp=gloss*lam*(0.9*nh**7+0.8*nh**40);
  const col=S.col;
  for(let k=0;k<3;k++){ const v=c[k]*(AMB[k]*amb+l*WARM[k])+sp*[1,0.84,0.62][k]; col[i*3+k]+=(v-col[i*3+k])*a; }
}
/** Darken the wall at pixel i (a contact shadow). @param {number} i @param {number} k */
function darken(i,k){ const c=state.col; c[i*3]*=1-k; c[i*3+1]*=1-k; c[i*3+2]*=1-k; }

/* ---------- roaches and what is left of them ---------- */

const RC = {black:{body:C3('#4a2c1c'),pron:C3('#2e1a10'),gloss:0.85}, prusak:{body:C3('#9a6a38'),pron:C3('#b48650'),gloss:0.55},
  nymph:{body:C3('#b08c62'),pron:C3('#9a7650'),gloss:0.4}, big:{body:C3('#7a3818'),pron:C3('#c09060'),gloss:0.7}};
/** Legs per side: root along the body (fraction of length), angle off the heading, length (× width) — front, middle, hind. */
const LEGS = [[0.2,1.0,0.55],[0.02,1.75,0.6],[-0.14,2.45,0.85]];

/** A roach: contact shadow, an oval shell with its shield and wing seam lit by the lamp, a soft gleam that slides as it
 * turns, legs rowing in two tripods, long feelers twitching. @param {any} r {x,y,a,v,leg,kind,fade,maim,id} */
function drawRoach(r){
  const S=state, w=appearanceState.W, K=r.kind, L=K.len, Wd=K.wid, ca=Math.cos(r.a), sa=Math.sin(r.a), col=RC[K.id], fade=r.fade??1;
  if(fade<=0.02) return;
  const dark=mul3(col.body,0.55);
  /** One sub-pixel dot of a leg or feeler. @param {number} x @param {number} y @param {number} a */
  const put=(x,y,a)=>{ const xi=Math.floor(x), yi=Math.floor(y); if(xi<0||yi<0||xi>=w||yi>=WALL_Y1) return; shadeDot(yi*w+xi,x,y,dark,0,0,1,0,a*fade); };
  /** A thin line of dots. @param {number} x0 @param {number} y0 @param {number} x1 @param {number} y1 @param {number} a */
  const line=(x0,y0,x1,y1,a)=>{ const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0)*1.4)); for(let k=1;k<=n;k++) put(x0+(x1-x0)*k/n,y0+(y1-y0)*k/n,a); };
  const R=Math.ceil(L*0.5+2);
  for(let y=Math.floor(r.y-R);y<=r.y+R;y++) for(let x=Math.floor(r.x-R);x<=r.x+R;x++){ if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
    const dx=x+0.5-r.x-0.8, dy=y+0.5-r.y+0.6, a=dx*ca+dy*sa, c=-dx*sa+dy*ca, q=(a/(L*0.52))**2+(c/(Wd*0.58))**2;
    if(q<1) darken(y*w+x,0.42*(1-q)*fade); }                                                      // the lamp is low on the left: shadow up-right
  const run=r.v>0.05, legs=r.maim?[0,2,4]:[0,1,2,3,4,5];
  for(const n of legs){ const [la,an,ln]=LEGS[n%3], s=n<3?1:-1, tri=(n%3===1)===(s>0);   // tripods: front+hind of one side with the middle of the other
    const sw=run?Math.sin(r.leg+(tri?0:Math.PI))*0.35:0, ang=r.a+s*(an+sw*(n%3===2?-1:1)), rx=r.x+ca*la*L+(-sa*s)*Wd*0.35, ry=r.y+sa*la*L+(ca*s)*Wd*0.35;
    const lg=ln*Wd+1.2, kx=rx+Math.cos(ang)*lg*0.55, ky=ry+Math.sin(ang)*lg*0.55, a2=ang-s*0.5*(n%3===0?-1:1), fx=kx+Math.cos(a2)*lg*0.6, fy=ky+Math.sin(a2)*lg*0.6;
    line(rx,ry,kx,ky,0.55); line(kx,ky,fx,fy,0.4); }
  for(let y=Math.floor(r.y-R);y<=r.y+R;y++) for(let x=Math.floor(r.x-R);x<=r.x+R;x++){ if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
    const dx=x+0.5-r.x, dy=y+0.5-r.y, a=(dx*ca+dy*sa)/(L*0.5), c=(-dx*sa+dy*ca)/(Wd*0.5)*(a>0.3?1+(a-0.3)*0.6:1), q=a*a+c*c;
    if(q>=1.15) continue; const cov=clamp01((1.15-q)*Math.min(L,Wd*2)*0.55);
    const pron=a>0.36;
    let base=pron?col.pron:col.body;
    if(K.id==='prusak'&&pron&&Math.abs(Math.abs(c)-0.3)<0.15) base=mul3(col.body,0.5);           // two dark bars on the shield
    if(K.id==='big'&&pron&&Math.hypot(a-0.62,c)<0.22) base=mul3(col.body,0.7);                   // the dark heart of its pale shield
    if(!pron&&Math.abs(c)<0.1&&a<0.3) base=mul3(base,0.72);                                       // where the wings meet
    if(Math.abs(a-0.36)<0.07) base=mul3(base,0.8);                                                // the shield's rim
    const nz=Math.sqrt(Math.max(0.05,1-Math.min(1,q))), lx=a*0.75, ly=c*0.75, nx=lx*ca-ly*sa, ny=lx*sa+ly*ca, nl=Math.hypot(nx,ny,nz)||1;
    shadeDot(y*w+x,x+0.5,y+0.5,base,nx/nl,ny/nl,nz/nl,col.gloss,cov*(K.id==='nymph'?0.75:1)*fade); }
  const tw=Math.sin(S.t*0.35+r.id)*0.18+(run?0:Math.sin(S.t*0.9+r.id*2)*0.22), tip=L*0.5;
  for(const s of [-1,1]){ let x=r.x+ca*tip, y=r.y+sa*tip, an=r.a+s*(0.22+tw*s); const n=Math.round(L*1.0+3);
    for(let k=0;k<n;k++){ an+=s*0.045; const nx=x+Math.cos(an)*0.8, ny=y+Math.sin(an)*0.8; put(nx,ny,0.5*(1-k/n)+0.1); x=nx; y=ny; } }
  if(K.id!=='nymph') for(const s of [-1,1]) put(r.x-ca*(tip+1)-sa*s*0.8,r.y-sa*(tip+1)+ca*s*0.8,0.35);   // the cerci
}

/** A squashed roach: the shell burst flat, guts and pale goo smeared out, legs still kicking for a while.
 * @param {any} p {x,y,a,kind,age,seed} */
function drawSplat(p){
  const w=appearanceState.W, K=p.kind, L=K.len, ca=Math.cos(p.a), sa=Math.sin(p.a), R=Math.ceil(L*1.0+3), dry=smooth(400,1400,p.age);
  for(let y=Math.floor(p.y-R);y<=p.y+R;y++) for(let x=Math.floor(p.x-R);x<=p.x+R;x++){ if(x<0||y<0||x>=w||y>=WALL_Y1) continue;
    const dx=x+0.5-p.x, dy=y+0.5-p.y, a=(dx*ca+dy*sa)/(L*0.7), c=(-dx*sa+dy*ca)/(K.wid*1.25), d=Math.hypot(a,c), edge=0.7+0.6*vnoise(Math.atan2(c,a)*2.4+p.seed,d*2+p.seed);
    if(d>edge) continue;
    const body=Math.hypot(a*1.15,c*1.6)<0.5+0.15*vnoise(x*0.9+p.seed,y*0.9);
    const base=body?mix3(RC[K.id].body,P.gut,0.4):mix3(mix3(P.goo,P.gooD,dry),P.gut,0.25*vnoise(x*0.7,y*0.7+p.seed));
    const nz=0.85+0.15*vnoise(x*1.3+p.seed,y*1.3), nx=(vnoise(x*0.9,y*0.9+p.seed)-0.5)*0.6, ny=(vnoise(x*0.9+5,y*0.9)-0.5)*0.6;
    shadeDot(y*w+x,x+0.5,y+0.5,base,nx,ny,nz,body?0.6:1.3*(1-dry*0.85),clamp01((edge-d)*2.5)*(body?1:0.92)); }
  const kick=1-smooth(0,170,p.age);
  for(let k=0;k<5;k++){ const s=k%2?1:-1, la=(k-2)*0.18, base=p.a+s*(1.2+0.5*h2(p.seed|0,k)/255)+Math.sin(p.age*0.9+k*2)*0.5*kick;
    const rx=p.x+ca*la*L, ry=p.y+sa*la*L;
    for(let q=1;q<=4;q++){ const xx=rx+Math.cos(base)*q*0.9, yy=ry+Math.sin(base)*q*0.9, xi=Math.floor(xx), yi=Math.floor(yy); if(xi<0||yi<0||xi>=w||yi>=WALL_Y1) continue; shadeDot(yi*w+xi,xx,yy,mul3(RC[K.id].body,0.45),0,0,1,0.1,0.7); } }
}

/* ---------- the fist ---------- */

/** The thrown fist from behind, lit by the lamp at his back: the back of the hand, the knuckles (red and raw as the pain
 * grows), the thumb, the forearm running back towards him and the rolled sleeve; out of focus while it is near the eye.
 * @param {{x:number,y:number,s:number,pain:number,a:number}} F */
function drawFist(F){
  const S=state, w=appearanceState.W, h=appearanceState.H, col=S.col, s=F.s, dxA=FIST_FROM.x-F.x, dyA=FIST_FROM.y-F.y, lA=Math.hypot(dxA,dyA)||1, ux=dxA/lA, uy=dyA/lA;
  const soft=0.7+1.7*(s-1), Ld=[-0.52,0.3,0.8], I=S.I*(0.35+0.65*S.lampK), raw=smooth(25,70,F.pain), blood=smooth(55,90,F.pain);
  /** Distance, material and height of the hand at a local point. @param {number} px @param {number} py */
  const field=(px,py)=>{
    const df=sdFist(px,py), [da,ta]=sdCone(px,py,0.8,7.2,0.8+ux*70,7.2+uy*70,4.2,8.5), d=smin(df,da,1.6);
    let kn=0; for(const [kx,ky] of KN){ const q=Math.hypot(px-kx,py-ky); if(q<1.9) kn=Math.max(kn,1-q/1.9); }
    const mat=da<df-0.5?(ta*70>19?(ta*70<23.5?3:2):0):(kn>0.25?1:0), sleeve=mat>=2?(mat===3?1.4:0.9):0;
    return {d:d-sleeve,mat,h:2.8*Math.sqrt(clamp01(-(d-sleeve)/2.8))+kn*0.9+sleeve*0.6,kn}; };
  const R=Math.ceil(16*s), reach=(10+soft)/s;
  for(let y=Math.max(0,Math.floor(F.y-R));y<h;y++) for(let x=Math.max(0,Math.floor(F.x-R));x<w;x++){
    const px=(x+0.5-F.x)/s, py=(y+0.5-F.y)/s;
    if(Math.hypot(px,py-2.8)>12+reach&&sdCone(px,py,0.8,7.2,0.8+ux*70,7.2+uy*70,4.2,8.5)[0]>2+reach) continue;   // far from the hand and the arm
    const f=field(px,py); const a=clamp01(0.5-f.d*s/soft)*F.a; if(a<=0.01) continue;
    const e=0.6, hx=field(px+e,py).h-field(px-e,py).h, hy=field(px,py+e).h-field(px,py-e).h, nl=Math.hypot(hx*0.5,hy*0.5,1), nx=-hx*0.5/nl, ny=-hy*0.5/nl, nz=1/nl;
    const ndl=Math.max(0,nx*Ld[0]+ny*Ld[1]+nz*Ld[2]);
    let c=f.mat===2?mul3(P.cloth,0.8+0.35*vnoise((x-F.x)*0.9,(y-F.y)*0.9)):f.mat===3?P.clothD:P.skin, gloss=0.18;
    if(f.mat<2&&f.kn>0){ c=mix3(c,P.knuck,raw*f.kn*0.9); if(blood>0&&f.kn>0.45){ c=mix3(c,P.bloodW,blood*0.85); gloss=0.6*blood; } }
    if(f.mat>=2) gloss=0;
    const l=I*(0.14+1.02*ndl), sp=gloss*I*Math.max(0,nx*-0.25+ny*0.15+nz*0.95)**14*0.5, i=y*w+x;
    for(let k=0;k<3;k++){ const v=c[k]*l*[1,0.86,0.7][k]+sp; col[i*3+k]+=(v-col[i*3+k])*a; } }
}

/* ---------- the whole picture ---------- */

/**
 * Draw the scene into the renderer's buffer.
 * @param {{shadow:{x:number,y:number,ox:number,oy:number,s:number,blur:number},roaches:any[],splats:any[],
 *   fist:{x:number,y:number,s:number,a:number}|null,ghost:{x:number,y:number,s:number,a:number}|null,pain:number,pulse:number}} V
 */
export function renderRoachWall(V){
  const S=state, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, col=S.col; if(!S.alb.length) return;
  shadows(V); lightWall();
  for(const p of V.splats) drawSplat(p);
  for(const r of V.roaches) drawRoach(r);
  for(const p of S.parts){ const x=Math.floor(p.x), y=Math.floor(p.y); if(x<0||y<0||x>=w||y>=h) continue; shadeDot(y*w+x,p.x,p.y,p.c,0,0,1,p.goo?0.8:0,p.goo?0.9:0.8*(1-p.age/p.life)); }
  const lc=[WARM[0]*0.9,WARM[1]*0.9,WARM[2]*0.9];
  for(const m of S.motes){ const x=Math.floor(m.x), y=Math.floor(m.y); if(x<0||y<0||x>=w||y>=WALL_Y1) continue; const i=y*w+x, k=Math.min(0.35,S.lam[i]*0.5)*(0.5+0.5*Math.sin(S.t*0.05+m.ph)); for(let q=0;q<3;q++) col[i*3+q]+=lc[q]*k; }
  for(const p of S.puffs){ const k=p.age/p.life, r=3+k*9, a=0.16*(1-k)*Math.min(1,p.age/10)*S.lampK, cx=p.x+p.vx*p.age, cy=p.y-p.age*0.38;
    for(let y=Math.max(0,Math.floor(cy-r));y<=Math.min(h-1,cy+r);y++) for(let x=Math.max(0,Math.floor(cx-r));x<=Math.min(w-1,cx+r);x++){ const d=Math.hypot(x+0.5-cx,y+0.5-cy)/r; if(d>=1) continue;
      const s=a*(1-d)*(1-d)*(0.5+0.7*vnoise(x*0.4+p.age*0.04,y*0.4)), i=y*w+x; for(let q=0;q<3;q++) col[i*3+q]+=(lc[q]*0.55-col[i*3+q]*0.3)*s; } }
  if(V.ghost) drawFist({...V.ghost,pain:V.pain});
  if(V.fist) drawFist({...V.fist,pain:V.pain});
  const desat=0.38*smooth(35,100,V.pain), red=smooth(55,100,V.pain)*V.pulse;
  for(let i=0;i<w*h;i++){ let r=col[i*3], g=col[i*3+1], b=col[i*3+2];
    const lum=r*0.3+g*0.55+b*0.15; r+=(lum-r)*desat; g+=(lum-g)*desat; b+=(lum-b)*desat;
    const v=S.vign[i]; r*=v; g*=v; b*=v;
    if(red>0){ const e=(1-v)*red*0.9; r=r*(1-e)+0.32*e; g*=1-e; b*=1-e*0.9; }
    fb[i]=(0xff000000|(to8(b)<<16)|(to8(g)<<8)|to8(r))>>>0; }
}
