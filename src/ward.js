/* The Ward — Newgate, 1868: the shared cell as a low, long vault of sandstone ashlar and soot-black brick under old
   limewash. A wide plank guard-bed runs along the back wall with flattened straw pallets and iron rings with chains;
   the only window is a barred slot under the vault with a plank shutter, letting in cold smog; a night tub stands in
   the corner by the door in its own puddle; names, dates and crosses are scratched into the lime. The room is drawn at
   2× (the cell is a 2× room); the light (a tallow lamp by the door, smog through the slot) is cell-light's.
   Mechanics keep the old item types: bunk / bunk2 = the guard-bed (sleep, sitting on its edge), cwc = the tub,
   csink = the water butt (washing), cwheel = Profesor's bath chair, ccom = the chest (goods), cdoor = the oak door. */

import { state as gymState, quad, isoLine, isoLineThin, isoX, isoY, itemW, itemH, shadeC, psetK } from './gym.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { state as roomsState, faceI, faceJ, floorAt, solidDraw, skyBucket } from './rooms.js';
import { skyColors } from './weather.js';
import { state as npcsState } from './npcs.js';

// Runtime values owned by ward; initialized explicitly by main.js.
export const state = {};

export const WARD_W = 12, WARD_H = 7;
/** Top of the guard-bed planks and of a straw pallet on it. */
export const BED_Z = 5.2, PALLET_Z = 5.75;
/** The guard-bed: along the back wall (j = 0), this deep. */
const BED_J1 = 2.46;
/** The window slot in the back wall (wall units u = 6·i, height z): no glass, a grille, a plank shutter to its right. */
export const WARD_WIN = {u0:32,u1:40,z0:15.6,z1:21.4,grille:true};
/** The tallow lamp on its bracket on the left wall, by the door. */
export const LAMP = {i:0.32,j:1.7,z:12.6};
/** Sleeping places on the guard-bed, by item and level: centre i of the pallet. */
const SLOTS = {bunk:[3.55,0.95],bunk2:[5.75,7.75,9.55,10.95]};
/** The hero's own place on the guard-bed (the middle of 'bunk', where he sleeps) and where one sits on its edge. */
export const SLOTS_HERO = 2.25, BED_SEAT_J = 2.15;
/** Pallets lying on the guard-bed (i centres), the used ones and two spare. */
const PALLETS = [0.95,2.15,3.55,5.75,7.75,9.55,10.95];

export function wardLayout(){ return [
  {t:'cdoor',i:0,j:3.0,w:0.3,h:1.5},
  {t:'bunk',i:0.15,j:0.06,w:4.2,h:BED_J1-0.06},{t:'bunk2',i:4.35,j:0.06,w:7.5,h:BED_J1-0.06},
  {t:'cpull',i:5.6,j:2.55,w:0.8,h:0.4},   /* under the window slot: up on the guard-bed, hands on the grille */
  {t:'croach',i:7.25,j:2.55,w:0.9,h:0.4},   /* kneeling on the guard-bed at the scratched GOD HELP ME: roaches on the wall */
  {t:'cwc',i:0.18,j:5.75,w:1.0,h:1.0},
  {t:'csink',i:11.05,j:4.15,w:0.75,h:0.75},
  {t:'cstool',i:11.25,j:5.1,w:0.6,h:0.6},
  {t:'cwheel',i:8.5,j:3.05,w:0.95,h:0.95},   /* Profesor's chair, clear of the window slot */
  {t:'cfloor',i:2.2,j:4.2,w:3.0,h:2.6},
  {t:'cshadow',i:7.2,j:4.1,w:1.6,h:1.6}
]; }

/** Where a cell person lies: centre, facing (head to the wall), the pallet height, the spot in front of his place. @param {{t:string,lv:number}} bed */
export function wardBed(bed){
  const it=gymState.cellList.find(x=>x.t===bed.t); if(!it) return null;
  const i=(SLOTS[bed.t]||[it.i+1])[bed.lv];
  return {it,at:[i,1.2],face:[0,-1],base:PALLET_Z-0.25,app:[i,BED_J1+0.45]};
}
/** Places on the edge of the guard-bed to sit (centre, the spot in front, facing the room). */
export const WARD_SEATS = [{c:[1.2,2.15],a:[1.2,2.95],f:[0,1]},{c:[4.6,2.15],a:[4.6,2.95],f:[0,1]},{c:[8.8,2.15],a:[8.8,2.95],f:[0,1]},{c:[10.4,2.15],a:[10.4,2.95],f:[0,1]}];
/** Open floor for squats, push-ups and standing about; the water butt. */
export const WARD_EX = [{p:[3.0,4.6],f:[1,0]},{p:[6.6,5.6],f:[0,1]},{p:[9.0,4.3],f:[-1,0]},{p:[4.4,6.2],f:[1,0]}];
export const WARD_WASH = {p:[10.55,4.45],f:[1,0]};

/* ---------- walls ---------- */

const C = {};
const bay=(/** @type {number} */ x,/** @type {number} */ y)=>gymState.BAYER[(y&3)*4+(x&3)];
/** @param {number} c @param {number} t @param {number} k */
function mixC(c,t,k){ const ch=(/** @type {number} */ s)=>Math.round(((c>>s)&255)*(1-k)+((t>>s)&255)*k); return (0xff000000|(ch(16)<<16)|(ch(8)<<8)|ch(0))>>>0; }

/** Is (u, z) open air in the window slot (not frame, not grille)? @param {number} u @param {number} z */
export function wardWinOpen(u,z){
  const W=WARD_WIN; if(u<W.u0+0.7||u>W.u1-0.7||z<W.z0+0.7||z>W.z1-0.6) return false;
  if(Math.abs(z-(W.z0+W.z1)/2)<0.45) return false;                                        // the cross bar
  return ((u-W.u0-0.7)%1.55)>0.55;                                                        // square iron bars
}
/** The window slot: a deep stone reveal, square bars, smog behind. @param {number} u @param {number} z @param {number} x @param {number} y */
function windowCol(u,z,x,y){
  const W=WARD_WIN;
  if(u<W.u0-1.4||u>W.u1+6.2||z<W.z0-1.6||z>W.z1+1.1) return 0;
  if(u>W.u1+0.9&&u<W.u1+5.9&&z>W.z0-0.4&&z<W.z1+0.4){                                        // the plank shutter, swung open against the wall
    const pu=(u-W.u1-0.9)/5, pl=Math.floor(pu*4), e=pu*4-pl;
    if(Math.abs(z-W.z0-1.3)<0.45||Math.abs(z-W.z1+1.3)<0.45) return (Math.abs(e-0.5)<0.12&&(Math.floor(u*2)&1))?C.rivet:C.iron;   // hinge straps
    return e<0.08?C.woodK:(h2(pl,Math.floor(z*1.4))<60?C.woodD:C.wood); }
  if(u>=W.u0&&u<=W.u1&&z>=W.z0&&z<=W.z1){
    if(wardWinOpen(u,z)){ const k=(z-W.z0)/(W.z1-W.z0), b=skyBucket(), S=skyColors(b,roomsState.SKY[b]);   /* the sky, drowned in smog */
      const sky=mixC(rgb(k>0.5?S[0]:S[1]),C.smog,0.74); return bay(x,y)<3?mixC(sky,C.smogL,0.3):sky; }
    if(u<W.u0+0.7||u>W.u1-0.7||z<W.z0+0.7||z>W.z1-0.6) return z<W.z0+0.7?C.stoneT:(u<W.u0+0.7?C.stoneD:C.stone);   // the reveal: lit sill, shaded jamb
    return (u-W.u0)%1.55<0.75||Math.abs(z-(W.z0+W.z1)/2)<0.25?C.ironH:C.iron; }
  if(z<W.z0&&z>W.z0-1.6&&u>W.u0-1.4&&u<W.u1+1.4) return z>W.z0-0.5?C.stoneT:C.stone;        // the stone sill
  if(z>W.z1&&u>W.u0-1.4&&u<W.u1+1.4) return C.stoneD;                                       // lintel
  if(u<W.u0&&u>W.u0-1.4) return C.stoneD;
  if(u>W.u1&&u<W.u1+1.4) return C.stone;
  // smog stains spreading on the wall round the slot
  return 0;
}

/** A wall of the Ward. a: tiles along the wall, z: height, right: the back wall (j = 0, the window wall). */
export function wardWallCol(a,z,x,y,right){
  const WH=gymState.HUB_WH, lim=right?WARD_W:WARD_H, u=a*6;
  if(z>WH-0.9||a>lim-0.08) return appearanceState.C_OUT;
  if(right){ const w=windowCol(u,z,x,y); if(w) return w; }
  // the vault springing: a row of low arches, the ceiling between them black with soot
  const sp=4, t=((a%sp)/sp-0.5)*2, arch=WH-4.6+3.6*t*t;
  if(z>arch){ const d=z-arch; if(d<0.5) return C.stoneD; return d>1.2||bay(x,y)<10?C.vault:C.sootD; }
  if(Math.abs((a+sp/2)%sp-sp/2)<0.18&&z>arch-6) return z>arch-0.4?C.stoneT:C.stoneD;         // the pier under each springing
  let c;
  if(z<9.6){                                                                                 // sandstone ashlar
    const row=Math.floor(z/3.2), fz=z/3.2-row, bu=(u+row*4.6+(right?0:7))/9.2, col=Math.floor(bu), fu=bu-col, n=h2(col*7+(right?3:1),row*13+5);
    if(fz<0.07||fu<0.035) return C.joint;
    c=n<70?C.ash[1]:n>215?C.ash[2]:C.ash[0];
    if(fz>0.88) c=C.ash[2];                                                                  // the worn top arris
    if(h2(Math.floor(u*3),Math.floor(z*3))<22) c=C.ash[3];                                    // tooling marks
    if(z<3.4&&(3.4-z)*4>bay(x,y)) c=h2(Math.floor(u*2),Math.floor(z*2))<60?C.mold:C.damp;     // rising damp, mould at the foot
    if(n>244&&fu>0.3&&fu<0.36) c=C.joint;                                                    // a crack through the block
  } else if(z<10.3) c=z>10?C.stoneT:C.stone;                                                 // string course
  else {                                                                                     // brick under old limewash
    const br=Math.floor((z-10.3)/1.15), bu=(u+(br&1)*1.2)/2.4, bc=Math.floor(bu), fb=bu-bc, fz=(z-10.3)/1.15-br;
    const peel=h2(Math.floor(u/5)+(right?20:40),Math.floor(z/3.5)+3)>178&&h2(Math.floor(u*1.5),Math.floor(z*1.5))>40;
    if(peel){ c=(fz<0.12||fb<0.06)?C.mortar:C.brick[h2(bc,br)%3]; }
    else { const n=h2(Math.floor(u*1.3)+(right?9:2),Math.floor(z*1.1)); c=n<60?C.lime[1]:n>230?C.lime[2]:C.lime[0];
      if(fz<0.1&&bay(x,y)<3) c=C.lime[1]; }                                                  // brick courses ghosting through
    const run=h2(Math.floor(u*1.4)+(right?5:11),7);
    if(run<46&&z>10.3+(h2(Math.floor(u*1.4),8)&7)) c=mixC(c,C.damp,0.45);                    // water runs from the vault
    const soot=Math.max(0,(z-14)/(WH-14)); c=mixC(c,C.soot,Math.min(0.75,soot*0.8+(h2(Math.floor(u*1.5),Math.floor(z*0.7))&31)/255));   // soot under the vault, smooth
  }
  if(!right){ const lu=LAMP.j*6, dz=z-LAMP.z; if(dz>0.5&&Math.abs(u-lu)<1.2+dz*0.18&&(1-Math.abs(u-lu)/(1.2+dz*0.18))*14>bay(x,y)) c=mixC(c,C.soot,0.7); }   // the lamp's soot plume
  // iron rings over the guard-bed, the chains hanging down the wall onto the planks
  if(right){ for(let k=0;k<5;k++){ const ru=12+k*12; if(ru>WARD_WIN.u0-3&&ru<WARD_WIN.u1+7) continue;
    const d=Math.hypot((u-ru)*0.9,z-8.4); if(d<0.75&&d>0.35) return d<0.5?C.ironH:C.iron;
    if(z>BED_Z&&z<8.1){ const cu=ru+0.25*Math.sin((z-BED_Z)*2.2); if(Math.abs(u-cu)<0.32) return ((z*2.6)|0)&1?C.iron:C.ironH; } } }
  // corner shade and grime low on the walls
  const corner=Math.max(0,1-a/1.3)*(1-z/WH); if(corner*12>bay(x,y)) c=shadeC(c,0.7);
  return c;
}

/** Scratches in the lime: names, dates, crosses and tallies (on the brick zone), sheared onto the iso wall. */
function scratches(){
  const fb=rendererState.fb, K=gymState.ISO_K, FONT=boxingState.FONT;
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<appearanceState.W&&y<appearanceState.H) fb[y*appearanceState.W+x]=c; };
  /** text on the back wall (right) or the left wall, at (a, z) with the top-left corner; one font pixel = one 2× pixel */
  const write=(/** @type {string} */ s,/** @type {boolean} */ right,/** @type {number} */ a,/** @type {number} */ z)=>{
    const x0=(right?isoX(a,0):isoX(0,a)), y0=(right?isoY(a,0,z):isoY(0,a,z)), sl=right?0.5:-0.5;
    for(let k=0;k<s.length;k++){ const g=FONT[s.charCodeAt(k)]; if(!g) continue;
      for(let r=0;r<5;r++) for(let q=0;q<3;q++) if(g&(1<<(14-(r*3+q)))){ const dx=k*4+q; put(x0+dx,y0+r+dx*sl,C.scratch); put(x0+dx+1,y0+r+dx*sl+1,C.scratchD); } } };
  write('J.MORLEY 1866',true,1.1,15.4); write('GOD HELP ME',true,7.6,14.2); write('W.H.',true,10.4,16.8); write('NO HOPE',false,5.4,16.2); write('1867',false,4.2,13.4);
  // crosses and tally marks
  const mark=(/** @type {boolean} */ right,/** @type {number} */ a,/** @type {number} */ z,/** @type {number} */ kind,/** @type {number} */ n)=>{
    const x0=right?isoX(a,0):isoX(0,a), y0=right?isoY(a,0,z):isoY(0,a,z), sl=right?0.5:-0.5;
    if(kind===0){ for(let r=0;r<9;r++) put(x0+3,y0+r+3*sl,C.scratch); for(let q=0;q<7;q++) put(x0+q,y0+2+q*sl,C.scratch); }   // a cross
    else for(let m=0;m<n;m++){ const q=m*2+(m>=5?2:0); for(let r=0;r<6;r++) put(x0+q,y0+r+q*sl,C.scratch); if(m===4) for(let qq=-1;qq<10;qq++) put(x0+qq,y0+4-qq*0.45+qq*sl,C.scratch); }   // tallies in fives
  };
  mark(true,3.2,13.6,0,0); mark(true,9.3,15.6,0,0); mark(false,2.5,15.6,0,0); mark(true,4.5,12.6,1,9); mark(false,6.0,13.6,1,13); mark(true,10.8,13.2,1,6);
  void K;
}

/** The floor: worn stone flags, wet patches, straw by the guard-bed, the stain round the tub, dirt along the walls.
 * @param {number} x @param {number} y */
export function floorCol(x,y){
  const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY)/3, i=(a+b)/2, j=(b-a)/2;
  if(i<0||j<0||i>WARD_W||j>WARD_H) return 0;
  const row=Math.floor(j/1.16), fj=j/1.16-row, off=h2(row,3)/255*1.7, si=(i+off)/1.85, col=Math.floor(si), fi=si-col, n=h2(col*5+row*17,row*7+2);
  let c;
  if(fj<0.05||fi<0.035) c=C.fjoint;
  else { c=C.flag[n%3]; if(Math.hypot(fi-0.5,fj-0.5)<0.28&&bay(x,y)<6) c=C.flag[3];                // worn smooth in the middle
    if(n>238&&Math.abs(fi-fj)<0.04) c=C.fjoint; }                                           // cracked flag
  const wet=h2(Math.floor(i*0.9)+30,Math.floor(j*0.9)+11)/255, wd=Math.hypot((i*0.9%1)-0.5,(j*0.9%1)-0.5);
  if(wet>0.68&&wd<0.38){ c=mixC(c,C.wet,0.6); if(wd>0.33&&bay(x,y)<5) c=C.wetH; }           // puddles with a cold gleam
  const ti=0.7, tj=6.25, pd=Math.hypot((i-ti)*0.8,(j-tj)*1.1);
  if(pd<1.6){ const k=1-pd/1.6; if(k*15>bay(x,y)) c=mixC(c,C.piss,0.35+0.4*k); if(pd>1.42&&pd<1.5&&bay(x,y)<8) c=C.pissH; }   // round the tub
  if(j>BED_J1-0.05&&j<BED_J1+1.0&&h2(Math.floor(i*14),Math.floor(j*9))<14) c=h2(Math.floor(i*30),Math.floor(j*30))<128?C.straw:C.strawD;   // straw dragged off the pallets
  if(h2(Math.floor(i*22),Math.floor(j*22))<5) c=C.dirt;                                       // droppings, dirt
  const wall=Math.min(i,j); if(wall<0.9&&(1-wall/0.9)*13>bay(x,y)) c=shadeC(c,0.62);          // black along the walls
  return c;
}

/** Build the Ward into the background buffer: walls, floor, scratches, the flat items. */
export function buildWard(){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, OX=gymState.HUB_OX, OY=gymState.HUB_OY, WH=gymState.HUB_WH;
  for(let k=0;k<W*H;k++) fb[k]=C.ceil;
  quad(0,0,0,0,WARD_H,0,0,WARD_H,WH,0,0,WH,(x,y)=>{ const j=(OX-x)/6, z=OY+j*3-y; return wardWallCol(j,z,x,y,false); });
  quad(0,0,0,WARD_W,0,0,WARD_W,0,WH,0,0,WH,(x,y)=>{ const i=(x-OX)/6, z=OY+i*3-y; return wardWallCol(i,z,x,y,true); });
  quad(0,0,0,WARD_W,0,0,WARD_W,WARD_H,0,0,WARD_H,0,floorCol);
  scratches();
  isoLine(0,WARD_H,0,WARD_W,WARD_H,0,appearanceState.C_FLOOR_EDGE); isoLine(WARD_W,0,0,WARD_W,WARD_H,0,appearanceState.C_FLOOR_EDGE);
}

/* ---------- items ---------- */

/** A straw pallet on the guard-bed: lumpy ticking, stains, straw poking out, a rag rolled at the head. @param {number} ci */
function pallet(ci){
  const i0=ci-0.46, i1=ci+0.46, j0=0.3, j1=2.2, z0=BED_Z, z1=PALLET_Z, sd=Math.floor(ci*7);
  const top=(/** @type {number} */ x,/** @type {number} */ y)=>{ floorAt(x,y,z1); const fi=roomsState.fa, fj=roomsState.fz, n=h2(Math.floor(fi*7)+sd,Math.floor(fj*5));
    if(h2(Math.floor(fi*13)+sd,Math.floor(fj*11))<34) return C.tickD;                        // stains
    if((fi-i0<0.06||i1-fi<0.06)&&h2(Math.floor(fj*30),sd)<70) return C.straw;              // straw at the seams
    return n<90?C.tickS:n>200?C.tickH:C.tick; };
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,(x,y)=>{ faceJ(j1,x,y); return h2(Math.floor(roomsState.fa*20),sd)<50?C.straw:C.tickS; });
  quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,()=>C.tickD);
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,top);
  if(ci===7.75){
    quad(i0+0.03,j0+0.05,z1,i1-0.1,j0+0.02,z1,i1-0.22,j0+0.55,z1+0.35,i0+0.12,j0+0.4,z1+0.48,(x,y)=>h2(x|0,y|0)<105?C.ragD:C.rag);
    isoLine(i0+0.12,j0+0.3,z1+0.35,i1-0.23,j0+0.42,z1+0.4,C.ragD);
  } else quad(i0+0.05,j0,z1,i1-0.05,j0,z1,i1-0.05,j0+0.38,z1+0.45,i0+0.05,j0+0.38,z1+0.45,(x,y)=>{ const n=h2(x|0,y|0); return n<80?C.ragD:C.rag; });
}
/** The guard-bed: a plank platform on trestles, black underneath; pallets, chains and odds and ends on top. @param {any} it */
function guardBed(it){
  if(gymState.bunkFront) return;                                                             // nothing stands in front of a sleeper
  const i0=it.i, j0=it.j, i1=it.i+itemW(it), j1=it.j+itemH(it), Z=BED_Z, B2=it.t==='bunk2';
  quad(i0,j1,0,i1,j1,0,i1,j1,Z-1.7,i0,j1,Z-1.7,(x,y)=>{ faceJ(j1,x,y); const fi=roomsState.fa;   // the dark under the planks, the trestle legs
    if(((fi+0.3)%2.1)<0.22) return (roomsState.fz>Z-2.2)?C.woodD:C.woodK; return bay(x|0,y|0)<2?C.woodK:C.under; });
  quad(i0,j1,Z-1.7,i1,j1,Z-1.7,i1,j1,Z,i0,j1,Z,(x,y)=>{ faceJ(j1,x,y); const fz=roomsState.fz, fi=roomsState.fa;   // the front board
    if(fz>Z-0.25) return C.woodH; if(fz<Z-1.55) return C.woodK;
    if(((fi*1.7)%1)<0.05&&fz>Z-1.2&&fz<Z-0.6) return C.rivet;                                 // nail heads
    return h2(Math.floor(fi*3),Math.floor(fz*2))<50?C.woodD:C.wood; });
  if(B2) quad(i1,j0,0,i1,j1,0,i1,j1,Z,i1,j0,Z,(x,y)=>{ faceI(i1,x,y); return roomsState.fz>Z-1.7?(roomsState.fz>Z-0.25?C.woodH:C.woodD):C.woodK; });
  quad(i0,j0,Z,i1,j0,Z,i1,j1,Z,i0,j1,Z,(x,y)=>{ floorAt(x,y,Z); const fj=roomsState.fz, fi=roomsState.fa, pl=Math.floor(fj/0.42), e=fj/0.42-pl;   // planks along the bed
    if(e<0.09) return C.woodK; const n=h2(Math.floor(fi*2.5)+pl*7,pl);
    if(h2(Math.floor(fi*9),Math.floor(fj*9))<16) return C.woodK;                              // knots, black stains
    return n<70?C.woodD:n>215?C.woodH:C.wood; });
  isoLine(i0,j1,Z,i1,j1,Z,C.woodK);
  for(const ci of PALLETS) if(ci>i0+0.3&&ci<i1-0.3) pallet(ci);
  if(!B2){ cup(3.05,1.6); bread(1.55,2.05); bible(3.55,1.75); } else { cup(6.35,1.9); bread(7.2,0.75); plate(8.5,1.9); }
}
/** A dented tin cup. @param {number} ci @param {number} cj */
function cup(ci,cj){ const r=0.1; solidDraw(ci-r,cj-r,ci+r,cj+r,PALLET_Z,PALLET_Z+1.4,(a,b,z)=>{ const d=Math.hypot(a-ci,b-cj); if(d>r) return 0; if(z>PALLET_Z+1.25) return d<r*0.6?C.ironK:C.tinH; return (a-ci)-(b-cj)>0?C.tinD:C.tin; }); }
/** A shallow tin plate on the bed. @param {number} ci @param {number} cj */
function plate(ci,cj){ const r=0.25; solidDraw(ci-r,cj-r,ci+r,cj+r,PALLET_Z,PALLET_Z+0.18,(a,b)=>{ const d=Math.hypot(a-ci,b-cj); return d>r?0:d>r*0.7?C.tinH:C.tinD; }); }
/** A crust of black bread. @param {number} ci @param {number} cj */
function bread(ci,cj){ solidDraw(ci-0.18,cj-0.1,ci+0.18,cj+0.1,PALLET_Z,PALLET_Z+0.7,(a,b,z)=>{ const u=(a-ci)/0.18, v=(b-cj)/0.1; if(u*u+v*v>1||z>PALLET_Z+0.7*(1-u*u*0.6)) return 0; return z>PALLET_Z+0.45?C.crust:C.crumb; }); }
/** The prison bible, black, the gilt gone. @param {number} ci @param {number} cj */
function bible(ci,cj){ quad(ci-0.16,cj-0.22,PALLET_Z+0.35,ci+0.16,cj-0.22,PALLET_Z+0.35,ci+0.16,cj+0.22,PALLET_Z+0.35,ci-0.16,cj+0.22,PALLET_Z+0.35,(x,y)=>{ floorAt(x,y,PALLET_Z+0.35); return Math.abs(roomsState.fa-ci)<0.03?C.gilt:C.book; });
  quad(ci-0.16,cj+0.22,PALLET_Z,ci+0.16,cj+0.22,PALLET_Z,ci+0.16,cj+0.22,PALLET_Z+0.35,ci-0.16,cj+0.22,PALLET_Z+0.35,()=>C.page); }

/** A coopered vessel: staves, iron hoops, a dark rim. @param {any} it @param {number} hgt @param {number} inner colour inside @param {boolean} lid */
function barrel(it,hgt,inner,lid){
  const ci=it.i+itemW(it)/2, cj=it.j+itemH(it)/2, r=Math.min(itemW(it),itemH(it))/2-0.04;
  solidDraw(ci-r,cj-r,ci+r,cj+r,0,hgt+0.1,(a,b,z)=>{ const d=Math.hypot(a-ci,b-cj), rr=r*(0.9+0.1*Math.sin(Math.PI*Math.min(1,z/hgt)));   /* the belly */
    if(d>rr) return 0;
    if(z>hgt-0.12){ if(d>rr*0.8) return C.woodH; if(lid&&(a-ci)<0.06) return h2(Math.floor((b-cj)*30),3)<60?C.woodD:C.wood; return 0; }
    if(d<rr*0.8) return z<hgt-0.7?(h2(Math.floor(a*60),Math.floor(b*60))<40?C.liqH:inner):0;
    const ang=Math.atan2(b-cj,a-ci), st=Math.floor((ang+Math.PI)/(Math.PI*2)*18), lit=(a-ci)-(b-cj)<0;
    if(Math.abs(z-hgt*0.22)<0.32||Math.abs(z-hgt*0.78)<0.32) return lit?C.ironH:C.iron;      // hoops
    if(z<0.5) return C.woodK;
    return st%2?(lit?C.wood:C.woodD):(lit?C.woodH:C.wood); });
}
/** Profesor's bath chair: a wicker back, two big spoked wheels, a small one in front. @param {any} it */
function bathChair(it){
  const P=npcsState.PROF, ci=it.i+itemW(it)/2, cj=it.j+itemH(it)/2-0.05, fi=P?.fi??0, fj=P?.fj??1, zs=4.2;
  // Local forward and side coordinates follow the seated figure's orientation.
  const pt=(f,s,z)=>[ci+f*fi-s*fj,cj+f*fj+s*fi,z];
  const line=(f0,s0,z0,f1,s1,z1,col)=>isoLine(...pt(f0,s0,z0),...pt(f1,s1,z1),col);
  const panel=(a,b,c,d,col)=>quad(...pt(...a),...pt(...b),...pt(...c),...pt(...d),col);
  const wheel=(side)=>{
    const phase=P?.ph||0, R=3.2;
    for(let k=0;k<6;k++){ const t=k/6*Math.PI+phase; const a=pt(Math.cos(t)*R/7.5,side,3.2+Math.sin(t)*R), b=pt(-Math.cos(t)*R/7.5,side,3.2-Math.sin(t)*R); isoLineThin(...a,...b,C.woodH); }
    for(let k=0;k<=40;k++){ const t=k/40*Math.PI*2, q=pt(Math.cos(t)*R/7.5,side,3.2+Math.sin(t)*R), x=Math.round(isoX(q[0],q[1])), y=Math.round(isoY(...q)); pset(x,y,C.woodK); pset(x,y+1,t<Math.PI?C.woodH:C.wood); }
    const q=pt(0,side,3.2); pset(Math.round(isoX(q[0],q[1])),Math.round(isoY(...q)),C.ironH);
  };
  const near=fi-fj>=0?0.4:-0.4;
  if(gymState.bunkFront){
    if(fi+fj<0){
      panel([-0.38,-0.48,zs],[-0.38,0.48,zs],[-0.38,0.48,zs+7],[-0.38,-0.48,zs+7],(x,y)=>((x+y)&1)?C.wicker:C.wickerD);
      line(-0.38,-0.48,zs+7,-0.38,0.48,zs+7,C.woodH);
    }
    wheel(near);
    line(-0.38,near,zs+2.4,0.32,near,zs+2.4,C.woodH);
    line(0.32,near,zs+2.4,0.32,near,zs+0.5,C.woodD);
    return;
  }
  wheel(-near);
  panel([-0.38,-0.38,zs],[0.38,-0.38,zs],[0.38,0.38,zs],[-0.38,0.38,zs],(x,y)=>h2(x|0,y|0)<90?C.rag:C.ragD);
  panel([-0.38,-0.48,zs],[-0.38,0.48,zs],[-0.38,0.48,zs+7.0],[-0.38,-0.48,zs+7.0],(x,y)=>((x+y)&1)?C.wicker:C.wickerD);
  for(const side of [-0.38,0.38]) line(-0.38,side,zs+2.4,0.32,side,zs+2.4,C.woodD);
  line(0.5,-0.3,0.6,0.5,0.3,0.6,C.iron); line(0.32,0,zs-1,0.5,0,0.6,C.iron);
  line(-0.38,-0.48,zs+7,-0.38,0.48,zs+7,C.woodH);
}
/** The chest for what he owns: planks, two iron bands, a padlock. @param {any} it */
function chest(it){
  const i0=it.i, j0=it.j, i1=it.i+itemW(it), j1=it.j+itemH(it), z1=4.0;
  const band=(/** @type {number} */ f)=>Math.abs(f-0.22)<0.05||Math.abs(f-0.78)<0.05;
  quad(i0,j1,0,i1,j1,0,i1,j1,z1,i0,j1,z1,(x,y)=>{ faceJ(j1,x,y); const f=(roomsState.fa-i0)/(i1-i0), fz=roomsState.fz;
    if(band(f)) return C.iron; if(Math.abs(f-0.5)<0.07&&fz>z1-1.6&&fz<z1-0.5) return fz<z1-1.2?C.ironK:C.tinD;   // the padlock
    return ((fz*1.25)%1)<0.1?C.woodK:(h2(Math.floor(f*4),Math.floor(fz))<60?C.woodD:C.wood); });
  quad(i1,j0,0,i1,j1,0,i1,j1,z1,i1,j0,z1,(x,y)=>{ faceI(i1,x,y); return band((roomsState.fa-j0)/(j1-j0))?C.iron:C.woodD; });
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,(x,y)=>{ floorAt(x,y,z1); const f=(roomsState.fa-i0)/(i1-i0); return band(f)?C.ironH:C.woodH; });
  isoLine(i0,j1,0,i1,j1,0,C.woodK); isoLine(i1,j0,0,i1,j1,0,C.woodK);
}
/** The oak door in a stone frame: planks, three iron straps with rivets, the grated judas, the lock box, the food flap.
 * @param {any} it */
function oakDoor(it){
  const a0=it.j, a1=it.j+itemH(it), Hd=15.2;
  quad(0.01,a0-0.32,0,0.01,a1+0.32,0,0.01,a1+0.32,Hd+1.4,0.01,a0-0.32,Hd+1.4,(x,y)=>{ faceI(0.01,x,y); const fa=roomsState.fa, fz=roomsState.fz;   // the stone frame
    if(fa>a0&&fa<a1&&fz<Hd) return 0; const n=h2(Math.floor(fz/2.6),Math.floor(fa*3)); return fz>Hd+0.9?C.stoneT:(n<90?C.stoneD:C.stone); });
  quad(0.02,a0,0,0.02,a1,0,0.02,a1,Hd,0.02,a0,Hd,(x,y)=>{ faceI(0.02,x,y); const u=(roomsState.fa-a0)/(a1-a0), z=roomsState.fz;
    if(u<0.04||u>0.96||z>Hd-0.35) return C.woodK;
    if(u>0.36&&u<0.64&&z>10.4&&z<13){ if(u<0.39||u>0.61||z<10.7||z>12.7) return C.iron; return ((u-0.39)%0.07<0.025)?C.ironH:C.ironK; }   // the judas grille
    if(u>0.3&&u<0.7&&z>6.6&&z<7.9) return z>7.7||z<6.8||u<0.32||u>0.68?C.ironH:C.iron;      // the food flap
    if(u>0.76&&u<0.92&&z>8.4&&z<10.6) return Math.abs(z-9.3)<0.25&&Math.abs(u-0.84)<0.02?C.ironK:C.iron;   // the lock box
    for(const sz of [2.4,8.0,13.6]) if(Math.abs(z-sz)<0.42){ return ((u*24)%1)<0.2&&Math.abs(z-sz)<0.18?C.rivet:C.iron; }   // straps
    const pl=Math.floor(u*5), e=u*5-pl; if(e<0.06) return C.woodK;
    const n=h2(pl*3,Math.floor(z*1.3)); return n<50?C.oakD:n>220?C.oakH:C.oak; });
  quad(0.05,a0,0.15,0.6,a0,0.15,0.6,a1,0.15,0.05,a1,0.15,(x,y)=>((x^y)&3)?C.stoneD:C.joint);   // the worn threshold
}

/** Draw a Ward item; false when it is not one. @param {any} it */
export function drawWardItem(it){
  switch(it.t){
    case 'cdoor': oakDoor(it); return true;
    case 'bunk': case 'bunk2': guardBed(it); return true;
    case 'cwc': barrel(it,4.2,C.filth,false); return true;
    case 'csink': if(!gymState.bunkFront){ barrel(it,3.3,C.water,true); const ci=it.i+itemW(it)/2, cj=it.j+itemH(it)/2; isoLine(ci+0.05,cj-0.05,3.4,ci+0.35,cj+0.2,1.8,C.tinD); } return true;   // and the ladle hooked on its rim
    case 'cstool': {
      const i=it.i, j=it.j, w=itemW(it), h=itemH(it), z=2.5;
      for(const a of [i+0.08,i+w-0.08]) for(const b of [j+0.08,j+h-0.08]) isoLine(a,b,0,a,b,z,C.woodD);
      quad(i,j,z,i+w,j,z,i+w,j+h,z,i,j+h,z,()=>C.woodH);
      isoLine(i,j+h,z,i+w,j+h,z,C.woodK); return true;
    }
    case 'cwheel': bathChair(it); return true;
    case 'ccom': chest(it); return true;
    case 'cpull': case 'cfloor': case 'croach': return true;
    case 'cshadow': { const ci=it.i+itemW(it)/2, cj=it.j+itemH(it)/2;                      // the flags worn pale where he trains
      for(let k=0;k<40;k++){ const t=h2(k,3)/255*Math.PI*2, r=0.25+0.5*h2(k,5)/255; psetK(Math.round(isoX(ci+Math.cos(t)*r,cj+Math.sin(t)*r)),Math.round(isoY(ci+Math.cos(t)*r,cj+Math.sin(t)*r,0)),C.flag[3]); } return true; }
  }
  return false;
}

/** A blanket over the hero asleep on his pallet: the grey rag pulled up. @param {any} A the sleep activity */
export function wardBlanket(A){
  const ci=A.at[0], z=PALLET_Z+0.9;
  quad(ci-0.45,0.95,z,ci+0.45,0.95,z,ci+0.45,2.15,z-0.2,ci-0.45,2.15,z-0.2,(x,y)=>{ floorAt(x,y,z); return h2(Math.floor(roomsState.fa*9),Math.floor(roomsState.fz*7))<80?C.ragD:C.rag; });
  quad(ci-0.45,2.15,PALLET_Z,ci+0.45,2.15,PALLET_Z,ci+0.45,2.15,z-0.2,ci-0.45,2.15,z-0.2,()=>C.ragD);
}

/* ---------- life: rats, flies over the tub, drips, breath ---------- */

/** Before the lighting pass (they are lit with the room): rats along the walls, flies over the tub, drops from the vault. */
/** Flies circling a spot of the Ward (the tub, a man who stinks like it). @param {number} ci @param {number} cj @param {number} z @param {number} n */
export function wardFlies(ci,cj,z,n){
  const t=boxingState.tick;
  for(let k=0;k<n;k++){ const a=t*0.09*(1+k*0.13)+k*2, x=Math.round(isoX(ci,cj)+Math.cos(a)*(5+k*2)+Math.sin(t*0.31+k)*2), y=Math.round(isoY(ci,cj,z+k*0.8)+Math.sin(a*1.7)*3);
    pset(x,y,C.fly); if((t+k)&1) pset(x+1,y,C.fly); }
}

/** Draw one rat in the cell at isometric coordinates (R.i, R.j). @param {any} R @param {number} t */
function drawRat(R, t){
  const x = Math.round(isoX(R.i, R.j)), y = Math.round(isoY(R.i, R.j, 0));
  const dir = (R.fi - R.fj) >= 0 ? 1 : -1;
  const isMoving = R.wait === 0, sn = (R.wait > 0 && ((t >> 2) & 1)) ? 1 : 0, run = (t >> 1) & 1;
  const dot = (dx, dy, col) => pset(x + dx * dir, y + dy, col);

  // 1. Soft contact shadow on the flagstones
  dot(-1, 0, C.ratShadow);
  dot(0, 0, C.ratShadow);
  dot(1, 0, C.ratShadow);

  // 2. Scampering paws
  if(isMoving){
    dot((run ? 1 : 2), 0, C.ratPaws);
    dot((run ? -1 : -2), 0, C.ratPaws);
  } else {
    dot(1, 0, C.ratPaws);
    dot(-1, 0, C.ratPaws);
  }

  // 3. Body (lower belly and back)
  dot(-2, -1, C.ratDark);
  dot(-1, -1, C.rat);
  dot(0, -1, C.rat);
  dot(1, -1, C.rat);
  dot(-1, -2, C.ratH);  // dorsal highlight
  dot(0, -2, C.rat);

  // 4. Head, ear & glowing ruby eye
  dot(2, -1, C.ratSnout);
  dot(1, -2, C.ratEar);
  dot(2, -2, C.ratEye);

  // 5. Snout / twitching nose
  dot(3, -1 - sn, C.ratNose);

  // 6. Sinuous tail swaying behind the body
  const tw = t * 0.35 + (R.seed || 0);
  for(let k = 1; k <= 4; k++){
    const ty = -1 + Math.round(Math.sin(tw + k * 0.9) * (k * 0.32));
    dot(-2 - k, ty, k > 2 ? C.ratTT : C.ratT);
  }
}

/** Draw roaches on the wall or after the guard-bed has been drawn. @param {boolean} bed */
export function wardRoaches(bed){
  if(!gymState.actors){
    for(let k=0;k<4;k++){
      const duration=[150,190,120,170][k], pause=[38,65,25,52][k], cycle=2*(duration+pause);
      const phase=(boxingState.tick+k*103)%cycle, moving=phase<duration||(phase>=duration+pause&&phase<2*duration+pause);
      const p=phase<duration?phase/duration:phase<duration+pause?1:phase<2*duration+pause?1-(phase-duration-pause)/duration:0;
      const travel=k===0||k===2, onBed=travel&&p>0.72;
      if(onBed!==bed) continue;
      const i=8.0+k*0.55+Math.sin(p*Math.PI*2+k)*0.35;
      const j=onBed?(p-0.72)*3:0, z=travel?13-Math.min(1,p/0.72)*(13-PALLET_Z):11.7+p*3.2;
      const x=Math.round(isoX(i,j)), y=Math.round(isoY(i,j,z)), leg=moving?((boxingState.tick>>1)+k&1):0;
      pset(x-1,y-1,C.roachLeg); pset(x+1,y+1,C.roachLeg);
      pset(x-1,y+leg,C.roachLeg); pset(x+1,y-leg,C.roachLeg);
      pset(x,y,C.roach); pset(x,y-1,C.roachH);
    }
  }
}

export function wardLife(){
  const t = boxingState.tick, P = gymState.hubP;
  wardRoaches(false);
  for(const R of state.rats){                                                                // a rat runs, stops, sniffs, runs on; bolts from the hero
    const near = Math.hypot(R.i - P.i, R.j - P.j) < 1.6;
    if(near && R.wait > 0) R.wait = 0;
    if(R.wait > 0){
      R.wait--;
    } else {
      const dx = R.ti - R.i, dj = R.tj - R.j, d = Math.hypot(dx, dj), sp = near ? 0.08 : 0.042;
      if(d < sp){
        R.i = R.ti; R.j = R.tj; R.k = (R.k + 1) % R.path.length; [R.ti, R.tj] = R.path[R.k];
        R.wait = near ? 0 : (16 + ((h2(R.k, t >> 4) & 31)));
      } else {
        R.i += (dx / d) * sp; R.j += (dj / d) * sp; R.fi = dx / d; R.fj = dj / d;
      }
    }
    drawRat(R, t);
  }
  const tub=gymState.cellList.find(x=>x.t==='cwc');
  if(tub) wardFlies(tub.i+itemW(tub)/2,tub.j+itemH(tub)/2,6,5);                              // flies over the tub
  for(const D of state.drips){ D.z-=D.v; D.v+=0.03; if(D.z<=0){ D.z=gymState.HUB_WH-3; D.v=0; D.i=1+h2(t,D.k)/255*10; D.j=0.6+h2(D.k,t)/255*5.6; }
    pset(Math.round(isoX(D.i,D.j)),Math.round(isoY(D.i,D.j,D.z)),C.drop); }
}
/** Breath in the cold: a little cloud now and then at the mouth of everyone awake. @param {any[]} people */
export function wardBreath(people){
  const t=boxingState.tick, M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H;
  people.forEach((C0,k)=>{ if(!C0||C0.act==='lie') return; const ph=(t+k*41)%120; if(ph>40) return;
    const f=ph/40, hz=(C0.act==='sit'?14.6:16.8), x=isoX(C0.i+(C0.fi||0)*0.35,C0.j+(C0.fj||0)*0.35)+f*6, y=isoY(C0.i,C0.j,hz)-f*8;
    for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){ const d=(dx*dx+dy*dy)/9; if(d>1) continue; const X=Math.round(x+dx*(1+f)), Y=Math.round(y+dy*(1+f)); if(X<0||Y<0||X>=W||Y>=H) continue;
      if(bay(X,Y)<(1-f)*(1-d)*7) M[Y*W+X]=mixC(M[Y*W+X],C.breath,0.5); } });
}
/** After the lighting pass: smog wisps creeping in through the slot. */
export function wardSmog(){
  const t=boxingState.tick, M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H, Wn=WARD_WIN;
  for(let k=0;k<7;k++){ const f=((t*0.0016+k/7)%1), wi=(Wn.u0+Wn.u1)/12+Math.sin(k*2.3)*0.4, z=(Wn.z0+Wn.z1)/2-f*7, j=f*2.4;
    const x=isoX(wi,j)+Math.sin(t*0.01+k)*4, y=isoY(wi,j,z), R=6+f*14, a=0.22*Math.sin(Math.PI*f);
    for(let dy=-R;dy<=R;dy+=1) for(let dx=-R*1.6;dx<=R*1.6;dx+=1){ const d=(dx*dx/2.56+dy*dy)/(R*R); if(d>1) continue; const X=Math.round(x+dx), Y=Math.round(y+dy); if(X<0||Y<0||X>=W||Y>=H) continue;
      M[Y*W+X]=mixC(M[Y*W+X],C.smog,a*(1-d)*0.6); } }   /* soft, no dither */
}
/** The frame darkens towards its edges: the eye is pulled to the lamp and the people. */
export function wardVignette(){
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H;
  for(let y=0;y<H;y++){ const v=(y/H-0.48)*2; for(let x=0;x<W;x++){ const u=(x/W-0.5)*2, d=u*u*0.7+v*v; if(d<0.45) continue;
    const k=Math.max(0.5,1-(d-0.45)*0.6), p=y*W+x, c=M[p]; M[p]=(0xff000000|((((c>>16)&255)*k)<<16)|((((c>>8)&255)*k)<<8)|((c&255)*k))>>>0; } }
}

export function initialize(){
  Object.assign(C,{ceil:rgb('#050506'),vault:rgb('#0c0b0a'),sootD:rgb('#191612'),soot:rgb('#15120e'),
    ash:[rgb('#6a5d48'),rgb('#5a4f3d'),rgb('#7a6c54'),rgb('#4a4133')],joint:rgb('#28241d'),stone:rgb('#6e6350'),stoneD:rgb('#4e4538'),stoneT:rgb('#8a7c62'),
    lime:[rgb('#7e7864'),rgb('#6a6452'),rgb('#8e8872')],brick:[rgb('#5a3428'),rgb('#4a2a20'),rgb('#64402e')],mortar:rgb('#38322a'),
    damp:rgb('#2e342a'),mold:rgb('#1e2a22'),
    smog:rgb('#5e6450'),smogL:rgb('#7e826a'),iron:rgb('#2a2a2c'),ironH:rgb('#4a4a4e'),ironK:rgb('#121214'),rivet:rgb('#5e5e62'),
    wood:rgb('#4e3c28'),woodD:rgb('#3a2c1c'),woodH:rgb('#62503a'),woodK:rgb('#1c150e'),under:rgb('#100c08'),
    oak:rgb('#3e2e1e'),oakD:rgb('#2e2216'),oakH:rgb('#4e3c28'),
    flag:[rgb('#4a4640'),rgb('#423e38'),rgb('#3a3731'),rgb('#575249')],fjoint:rgb('#1e1c19'),wet:rgb('#2c3232'),wetH:rgb('#6a7474'),
    piss:rgb('#5a5626'),pissH:rgb('#8a844a'),straw:rgb('#8a7a44'),strawD:rgb('#6a5c30'),dirt:rgb('#24201a'),
    tick:rgb('#5e5844'),tickS:rgb('#4e4936'),tickH:rgb('#6e6850'),tickD:rgb('#3a3526'),rag:rgb('#4a4842'),ragD:rgb('#38362f'),
    tin:rgb('#7a7e80'),tinH:rgb('#a4a8aa'),tinD:rgb('#565a5c'),crust:rgb('#4a3018'),crumb:rgb('#6a4a28'),book:rgb('#1a1612'),gilt:rgb('#6a5a2a'),page:rgb('#8a8268'),
    filth:rgb('#2e2612'),liqH:rgb('#5a5228'),water:rgb('#2e3a3c'),wicker:rgb('#6e5a36'),wickerD:rgb('#4e3e22'),
    scratch:rgb('#857e69'),scratchD:rgb('#3a352a'),
    ratShadow:rgb('#14100c'),ratDark:rgb('#241e18'),rat:rgb('#3d3228'),ratH:rgb('#5a4c3e'),
    ratSnout:rgb('#70564a'),ratNose:rgb('#9c6e66'),ratEye:rgb('#d82818'),ratEar:rgb('#78564c'),
    ratPaws:rgb('#58443c'),ratT:rgb('#5e4840'),ratTT:rgb('#7c6258'),
    roach:rgb('#21140e'),roachH:rgb('#563626'),roachLeg:rgb('#332017'),
    fly:rgb('#0e0e0e'),drop:rgb('#8a9a9a'),breath:rgb('#c8ccc4')});
  state.rats=[
    {path:[[1.4,2.7],[3.6,2.8],[5.4,3.3],[7.8,3.5],[9.8,3.8],[10.2,5.0],[8.0,5.2],[5.0,4.6],[2.2,5.2],[1.4,6.2],[0.8,4.2]],k:0,seed:0}
  ];
  for(const R of state.rats){
    [R.i,R.j]=R.path[R.k];
    const next=(R.k+1)%R.path.length;
    [R.ti,R.tj]=R.path[next];
    R.wait=20; R.fi=1; R.fj=0;
  }
  state.drips=[0,1,2].map(k=>({k,i:2+k*3,j:1+k,z:10+k*4,v:0}));
}

/** Compatibility flag consumed by room builders; the archived painted plate is not active. */
export function wardPainted(){ return false; }
