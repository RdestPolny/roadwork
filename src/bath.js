/* The Bathhouse — Newgate, 1868: the evening wash, 19:00–19:40, in a low barrel-vaulted cellar. Rough stone walls under
   a black, sweating brick vault (the end wall is the vault's arch); a row of zinc tubs like troughs, each in a stall of
   bare planks without a door so that the turnkey on his podium sees every man; a gutter cut into the flags carries the
   grey water to an iron drain. The water is never changed: murky, with a skin of tallow and carbolic soap. Gas sconces
   barely get through the steam — each one a smudge of light in the fog; everything smells of carbolic (a yellow-green
   cast over the frame). The yard men soak in the tubs (bare to the waist above the water), wait in towels or sit on the
   benches; a fight with any of them (venue 'laznia': steam and noise, fewer eyes). */

import { state as gymState, isoLine, isoX, isoY, quad, shadeC, itemW, itemH, mkItem } from './gym.js';
import { rgb, state as appearanceState } from './appearance.js';
import { state as roomsState, floorAt, faceI, faceJ, solidDraw, startActivity, goRoom, skyBucket } from './rooms.js';
import { state as rendererState, pset } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { state as npcsState } from './npcs.js';
import { state as sparringState, startSpar, oppStars } from './sparring.js';
import { spendAction } from './simulation.js';
import { prisonGate, useSoap, prisonFightStart, prisonFightExtras, listTag } from './prison.js';

// Runtime values owned by bath; initialized explicitly by main.js.
export const state = {};

export const BATH_W = 10, BATH_H = 7;
/** The stalls along the back wall (j = 0): left edge of the first, width of each; the tub centres (one man to a tub). */
const STALL_I0 = 1.85, STALL_W = 1.6, STALL_J = 2.3;
export const SHOWERS = [0,1,2,3,4].map(k=>STALL_I0+STALL_W*(k+0.5));
/** A tub: half width (i), its length along j, the rim and the grey water; the depth a man sinks to (z0). */
const TUB_R = 0.5, TUB_J0 = 0.28, TUB_J1 = 2.02, RIM_Z = 4.2, WATER_Z = 3.5, SOAK_Z = -4.2, SOAK_J = 1.3, PART_Z = 8.6;
/** Who soaks in which tub (yard inmate → tub); tub 1 is left for the hero; who sits on the benches; the last one waits. */
const AT_TUB = [[0,0],[1,2],[2,3],[3,4]], ON_BENCH = [5,6];
/** The gutter along the stalls and the drain it runs to. */
const GUT_J0 = 2.5, GUT_J1 = 2.78, DRAIN = [9.72,2.64];
/** The vault: the walls rise to the springing, above it the brick barrel; on the end wall (i = 0) the arch itself. */
const SPRING_Z = 13.2;
/** Gas sconces: [i, j, z]. */
/** The three gas lamps [i, j, height]; the fighters are lit from the nearest. */
export const LAMPS = [[0.12,4.55,11.8],[SHOWERS[0]+STALL_W/2,0.12,12.2],[SHOWERS[3]+STALL_W/2,0.12,12.2]];
/** The turnkey's podium. */
const POD = {i:0.15,j:2.7,w:1.35,h:1.6,z:3.0};

export function bathLayout(){
  const out=[{t:'ldoor',i:0,j:5.0,w:0.3,h:1.5},{t:'lpod',i:POD.i,j:POD.j,w:POD.w,h:POD.h}];
  for(let k=0;k<5;k++) out.push({t:'lshower',i:STALL_I0+STALL_W*k,j:0.06,w:STALL_W,h:STALL_J,v:k});
  out.push({t:'lbench',i:3.0,j:5.65,w:2.2,h:0.5},{t:'lbench',i:6.4,j:5.65,w:2.2,h:0.5});
  return out;
}

/* ---------- the room shell ---------- */

const C={};
const bay=(/** @type {number} */ x,/** @type {number} */ y)=>gymState.BAYER[(y&3)*4+(x&3)];
/** @param {number} c @param {number} t @param {number} k */
function mixC(c,t,k){ const ch=(/** @type {number} */ s)=>Math.round(((c>>s)&255)*(1-k)+((t>>s)&255)*k); return (0xff000000|(ch(16)<<16)|(ch(8)<<8)|ch(0))>>>0; }
/** Height of the vault's arch on the end wall at j. @param {number} j */
const archZ=(j)=>SPRING_Z+(gymState.HUB_WH-1.5-SPRING_Z)*Math.sqrt(Math.max(0,1-((j-BATH_H/2)/(BATH_H/2))**2));

/** @param {number} a along the wall @param {number} z height @param {number} x @param {number} y @param {boolean} right the long back wall (j = 0) */
function wallCol(a,z,x,y,right){
  const lim=right?BATH_W:BATH_H, u=a*6; if(a>lim-0.06) return C.ceil;
  const top=right?gymState.HUB_WH-0.8:archZ(a);
  if(z>top) return C.ceil;
  if(!right&&z>top-0.7) return z>top-0.3?C.brickK:C.stoneT;                                   // the arch's ring of voussoirs
  if(z>SPRING_Z){                                                                            // wet black brick of the vault
    const br=Math.floor((z-SPRING_Z)/0.9), bu=(u+(br&1)*1.0)/2.0, fb=bu-Math.floor(bu), fz=(z-SPRING_Z)/0.9-br;
    let c=(fz<0.14||fb<0.08)?C.mortar:C.brick[h2(Math.floor(bu),br)%3];
    if(right) c=mixC(c,C.ceil,Math.min(0.85,(z-SPRING_Z)/(gymState.HUB_WH-SPRING_Z)*0.95));   // the barrel curving away overhead
    if(h2(Math.floor(u*2),Math.floor(z*1.5))<4) c=C.wetV;                                     // sweat on the brick
    return c; }
  if(z>SPRING_Z-0.6) return z>SPRING_Z-0.2?C.stoneT:C.stoneD;                                  // the springing course
  // rough coursed rubble, limewash gone grey and peeling, green and black at the foot
  const row=Math.floor(z/1.9), fz=z/1.9-row, bu=(u+(row*2.3)%3)/(2.2+(h2(row,7)&3)*0.4), col=Math.floor(bu), fu=bu-col, n=h2(col*5+(right?2:9),row*11);
  let c=(fz<0.1||fu<0.05)?C.joint:(n<80?C.rub[1]:n>210?C.rub[2]:C.rub[0]);
  if(h2(Math.floor(u/3)+(right?4:8),Math.floor(z/3))>150&&!(fz<0.1||fu<0.05)) c=mixC(c,C.lime,0.55);   // what is left of the limewash
  if(z<3.2&&(3.2-z)*5>bay(x,y)) c=h2(Math.floor(u*2),Math.floor(z*2))<110?C.slime:mixC(c,C.slime,0.55);
  if(h2(Math.floor(u*1.3)+(right?1:5),3)<40&&z<SPRING_Z-1) c=mixC(c,C.damp,0.4);              // runs from the vault
  for(const L of LAMPS){ const lr=right?L[1]<0.5:L[0]<0.5; if(!lr) continue; const lu=(right?L[0]:L[1])*6, dz=z-L[2];
    if(dz>0.6&&Math.abs(u-lu)<0.8+dz*0.2&&(1-Math.abs(u-lu)/(0.8+dz*0.2))*12>bay(x,y)) c=mixC(c,C.soot,0.6); }   // soot over each gas jet
  if(!right){                                                                                // hooks with the men's clothes, left of the podium
    if(a>0.4&&a<2.45&&z>12.0&&z<12.7) return z>12.5?C.woodL:C.wood;
    for(let k=0;k<4;k++){ const hx=0.7+k*0.5; if(Math.abs(a-hx)<0.035&&z>11.3&&z<12.2) return C.iron;
      if(Math.abs(a-hx)<0.2&&z>(k&1?6.2:7.4)&&z<11.4){ const e=Math.abs(a-hx)>0.16||z<(k&1?6.5:7.7); return e?C.joint:(k===2?(Math.abs(z-8.6)<0.25?C.stripe:C.towel):(Math.abs(a-hx)<0.04?C.coatD:C.coat)); } } }
  if(a<0.25) c=shadeC(c,0.7);
  return c;
}

/** The floor: worn wet flags, soap scum, the gutter and its drain, black along the walls. @param {number} x @param {number} y */
export function floorCol(x,y){
  const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY)/3, i=(a+b)/2, j=(b-a)/2;
  if(i<0||j<0||i>BATH_W||j>BATH_H) return 0;
  const row=Math.floor(j/1.2), off=h2(row,9)/255*1.4, si=(i+off)/1.7, fi=si-Math.floor(si), fj=j/1.2-row, n=h2(Math.floor(si)*3+row*13,row);
  let c=(fj<0.05||fi<0.035)?C.fjoint:C.flag[n%3];
  c=mixC(c,C.wet,0.35);
  if(j>GUT_J0&&j<GUT_J1&&i>STALL_I0-0.25){ const e=Math.min(j-GUT_J0,GUT_J1-j); c=e<0.04?C.stoneD:(bay(x,y)<3?C.greyH:C.grey); }   // the gutter, grey water in it
  const d=Math.hypot(i-DRAIN[0],(j-DRAIN[1])*1.2);
  if(d<0.3){ c=d>0.24?C.iron:(((i-DRAIN[0])*16|0)&1?C.ironK:C.iron); }
  if(j<GUT_J0&&j>2.0&&h2(Math.floor(i*20),Math.floor(j*20))<18) c=C.scum;                    // soap scum slopped over the rims
  const X=i*1.1+3, Y=j*1.1+9, xi=Math.floor(X), yi=Math.floor(Y), fx=X-xi, fy=Y-yi, sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy), nn=(/** @type {number} */ a,/** @type {number} */ b)=>h2(a,b)/255;
  const pn=(nn(xi,yi)*(1-sx)+nn(xi+1,yi)*sx)*(1-sy)+(nn(xi,yi+1)*(1-sx)+nn(xi+1,yi+1)*sx)*sy;   // standing water in the hollows
  if(pn>0.62&&!(j>GUT_J0&&j<GUT_J1)) c=mixC(c,C.grey,pn>0.66?0.6:0.3);
  const e=Math.min(i,j); if(e<0.9&&(1-e/0.9)*12>bay(x,y)) c=shadeC(c,0.6);
  return c;
}

export function buildBath(){
  rendererState.fb=gymState.bgHub; roomsState.homeSkyB=skyBucket();
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, OX=gymState.HUB_OX, OY=gymState.HUB_OY, WH=gymState.HUB_WH;
  for(let k=0;k<W*H;k++) fb[k]=C.ceil;
  quad(0,0,0,0,BATH_H,0,0,BATH_H,WH,0,0,WH,(x,y)=>{ const j=(OX-x)/6, z=OY+j*3-y; return wallCol(j,z,x,y,false); });
  quad(0,0,0,BATH_W,0,0,BATH_W,0,WH,0,0,WH,(x,y)=>{ const i=(x-OX)/6, z=OY+i*3-y; return wallCol(i,z,x,y,true); });
  quad(0,0,0,BATH_W,0,0,BATH_W,BATH_H,0,0,BATH_H,0,floorCol);
  for(const L of LAMPS) sconce(L);
  for(const it of gymState.gymItems) if(gymState.GYM_TYPES[it.t].flat) drawBathItem(it);
  isoLine(0,BATH_H,0,BATH_W,BATH_H,0,appearanceState.C_FLOOR_EDGE); isoLine(BATH_W,0,0,BATH_W,BATH_H,0,appearanceState.C_FLOOR_EDGE);
  rendererState.fb=rendererState.FB_MAIN;
}
/** A gas sconce: a brass arm out from the wall (the flame in its glass is drawn live). @param {number[]} L */
function sconce(L){
  const [i,j,z]=L, back=j<0.5, ai=back?i:0.02, aj=back?0.02:j, ei=i+(back?0:0.35), ej=j+(back?0.35:0);
  isoLine(ai,aj,z-1.4,ei,ej,z-0.4,C.brass); isoLine(ei,ej,z-0.4,ei,ej,z,C.brassH);
}

/* ---------- items ---------- */

/** A stall: the plank partition on its right (and the first one's left), the zinc tub with its grey water.
 * In the front layer (over a man in the tub): the tub's near sides and rim, the right partition. @param {any} it */
function stall(it){
  const i0=it.i, i1=it.i+itemW(it), ci=(i0+i1)/2, FO=gymState.bunkFront, k=it.v;
  const part=(/** @type {number} */ pi)=>quad(pi,0.05,0,pi,STALL_J,0,pi,STALL_J,PART_Z,pi,0.05,PART_Z,(x,y)=>{ faceI(pi,x,y); const j=roomsState.fa, z=roomsState.fz;   // bare planks, uneven tops
    if(z>PART_Z-0.5-((h2(Math.floor(j*3),k)&3)*0.15)) return 0; const pl=Math.floor(j/0.38), e=j/0.38-pl; if(e<0.08) return C.woodK;
    if(z<1.2) return C.woodK; return h2(pl,Math.floor(z*1.4)+k)<60?C.woodD:(h2(pl+3,Math.floor(z*0.5))<30?C.slimeW:C.wood); });
  const post=(/** @type {number} */ pi)=>isoLine(pi,STALL_J,0,pi,STALL_J,PART_Z-0.3,C.woodK);
  const i0t=ci-TUB_R, i1t=ci+TUB_R;
  const side=(/** @type {number} */ z,/** @type {number} */ u)=>{ if(z>RIM_Z-0.35) return C.zincH; if(Math.abs(z-1.2)<0.25) return C.zincD;   // rolled rim, a seam
    return h2(Math.floor(u*16),Math.floor(z*2))<26?C.rust:(h2(Math.floor(u*5)+3,Math.floor(z))<40?C.zincD:C.zinc); };
  if(!FO){
    if(k===0){ part(i0); post(i0); }
    quad(i0t,TUB_J0,RIM_Z,i1t,TUB_J0,RIM_Z,i1t,TUB_J1,RIM_Z,i0t,TUB_J1,RIM_Z,(x,y)=>{ floorAt(x,y,RIM_Z); const fi=roomsState.fa, fj=roomsState.fz;   // the inside: the far rims
      if(fi<i0t+0.08||fj<TUB_J0+0.08) return C.zincD; return 0; });
    quad(i0t+0.07,TUB_J0+0.07,WATER_Z,i1t-0.07,TUB_J0+0.07,WATER_Z,i1t-0.07,TUB_J1-0.07,WATER_Z,i0t+0.07,TUB_J1-0.07,WATER_Z,(x,y)=>{ floorAt(x,y,WATER_Z); const fi=roomsState.fa, fj=roomsState.fz;
      const n=h2(Math.floor(fi*18)+k*7,Math.floor(fj*18)); return n<40?C.scum:n<70?C.greyH:(h2(Math.floor(fi*5),Math.floor(fj*5))<60?C.greyD:C.grey); });   // grey water, a skin of tallow
  }
  quad(i0t,TUB_J1,0,i1t,TUB_J1,0,i1t,TUB_J1,RIM_Z,i0t,TUB_J1,RIM_Z,(x,y)=>{ faceJ(TUB_J1,x,y); return side(roomsState.fz,roomsState.fa); });   // the near end
  quad(i1t,TUB_J0,0,i1t,TUB_J1,0,i1t,TUB_J1,RIM_Z,i1t,TUB_J0,RIM_Z,(x,y)=>{ faceI(i1t,x,y); return shadeC(side(roomsState.fz,roomsState.fa),0.82); });
  isoLine(i0t,TUB_J1,RIM_Z,i1t,TUB_J1,RIM_Z,C.zincH); isoLine(i1t,TUB_J0,RIM_Z,i1t,TUB_J1,RIM_Z,C.zincH);
  isoLine(ci-0.1,TUB_J1,0.6,ci-0.1,TUB_J1+0.12,0.4,C.iron);                                   // the plug's spout into the gutter
  part(i1); post(i1);
}
/** The turnkey's podium: planks on posts, a rail round it, two steps. @param {any} it */
function podium(it){
  const i0=it.i, j0=it.j, i1=it.i+itemW(it), j1=it.j+itemH(it), z=POD.z, FO=gymState.bunkFront;
  if(!FO){
    quad(i0,j1,0,i1,j1,0,i1,j1,z,i0,j1,z,(x,y)=>{ faceJ(j1,x,y); return ((roomsState.fz*2)%1)<0.12?C.woodK:C.woodD; });
    quad(i1,j0,0,i1,j1,0,i1,j1,z,i1,j0,z,(x,y)=>{ faceI(i1,x,y); return ((roomsState.fz*2)%1)<0.12?C.woodK:shadeC(C.woodD,0.85); });
    quad(i0,j0,z,i1,j0,z,i1,j1,z,i0,j1,z,(x,y)=>{ floorAt(x,y,z); return ((roomsState.fa*3)%1)<0.08?C.woodK:C.wood; });
    for(let s=0;s<2;s++){ const si=i1+0.25*(2-s), sz=z*(s+1)/3; quad(i1,j0+0.3,sz,si,j0+0.3,sz,si,j0+1.0,sz,i1,j0+1.0,sz,()=>C.woodL); quad(si,j0+0.3,0,si,j0+1.0,0,si,j0+1.0,sz,si,j0+0.3,sz,()=>C.woodD); } }
  for(const [pi,pj] of [[i0+0.08,j1-0.08],[i1-0.08,j1-0.08],[i1-0.08,j0+0.08]]) isoLine(pi,pj,z,pi,pj,z+5.2,C.woodK);   // the rail
  isoLine(i0+0.08,j1-0.08,z+5.0,i1-0.08,j1-0.08,z+5.0,C.wood); isoLine(i1-0.08,j1-0.08,z+5.0,i1-0.08,j0+0.08,z+5.0,C.wood);
}
/** A bench of rough planks, black with wet. @param {any} it */
function bench(it){
  if(gymState.bunkFront) return;
  const i=it.i, j=it.j, i1=i+itemW(it), j1=j+itemH(it), zs=4.0;
  for(const a of [i+0.25,i1-0.25]) for(const b of [j+0.1,j1-0.1]) isoLine(a,b,0,a,b,zs-0.4,C.woodK);
  quad(i,j1,zs-0.6,i1,j1,zs-0.6,i1,j1,zs,i,j1,zs,()=>C.woodD); quad(i1,j,zs-0.6,i1,j1,zs-0.6,i1,j1,zs,i1,j,zs,()=>C.woodK);
  quad(i,j,zs,i1,j,zs,i1,j1,zs,i,j1,zs,(x,y)=>{ floorAt(x,y,zs); return h2(Math.floor(roomsState.fa*8),Math.floor(roomsState.fz*6))<50?C.woodL:C.wood; });
  const ti=i+0.5, tj=j+0.12; quad(ti,tj,zs,ti+0.6,tj,zs,ti+0.6,tj+0.28,zs,ti,tj+0.28,zs,()=>C.towel);   // a folded towel, a lump of carbolic soap
  solidDraw(i1-0.55,j+0.15,i1-0.35,j+0.32,zs,zs+0.5,(a,b,z)=>z<zs+0.45?C.soap:0);
}

/** Draw one bath item; false for anything else. @param {any} it */
export function drawBathItem(it){
  switch(it.t){
    case 'ldoor': { const a0=it.j, a1=it.j+itemH(it), Hd=14.5;                               // an iron-strapped door under a low arch
      quad(0.01,a0-0.3,0,0.01,a1+0.3,0,0.01,a1+0.3,Hd+1.6,0.01,a0-0.3,Hd+1.6,(x,y)=>{ faceI(0.01,x,y); const fa=roomsState.fa, fz=roomsState.fz, u=(fa-a0)/(a1-a0), top=Hd+Math.sqrt(Math.max(0,1-(u*2-1)**2))*1.2;
        if(u>0&&u<1&&fz<top){ for(const sz of [3,8,13]) if(Math.abs(fz-sz)<0.4) return C.iron; const pl=Math.floor(u*5); return u*5-pl<0.07?C.woodK:(h2(pl,Math.floor(fz))<50?C.woodD:C.wood); }
        return h2(Math.floor(fz/2),Math.floor(fa*3))<90?C.stoneD:C.stoneT; });
      return true; }
    case 'lshower': stall(it); return true;
    case 'lpod': podium(it); return true;
    case 'lbench': bench(it); return true;
  }
  return false;
}

/* ---------- inmates ---------- */

const TOWEL=['#6e6c64','#8e8c84','#acaaa0'], SLIP=['#1a1814','#2a2620','#3e382e'];
/** @param {number} rb @param {string[]} hex */
function ramp(rb,hex){ const P=appearanceState.PAL; for(let k=0;k<3;k++) P[rb*3+k]=rgb(hex[k]); }

/** Entering the bath: four men soak in the tubs, two sit on the benches in towels, one waits; the turnkey on his podium. */
export function bathEnter(){
  const P=appearanceState.PAL, B=state.list.filter(x=>x.t==='lbench'), tubs=state.list.filter(x=>x.t==='lshower'), pod=state.list.find(x=>x.t==='lpod');
  state.saved=npcsState.YN.map(Cn=>({pal:P.slice(Cn.rb*3,(Cn.rb+10)*3),C:{...Cn}}));
  state.use=[-1,-1,-1,-1,-1];
  npcsState.YN.forEach((Cn,k)=>{
    ramp(Cn.rb+4,TOWEL); for(let q=0;q<3;q++) P[(Cn.rb+5)*3+q]=shadeC(P[(Cn.rb+4)*3+q],0.75);      // the towel (cnLookHD: bath)
    ramp(Cn.rb+8,SLIP);                                                                          // clogs
    Object.assign(Cn,{sleeves:false,pants:false,bath:true,yard:true,moving:false,after:null,t:(k*97)%400,smokeY:Cn.smokeY??Cn.smoke,smoke:false,tub:false,z0:0});
    const tb=AT_TUB.find(a=>a[0]===k);
    if(tb){ state.use[tb[1]]=k; Object.assign(Cn,{act:'sit',tub:true,i:SHOWERS[tb[1]],j:SOAK_J,fi:0,fj:1,z0:SOAK_Z,after:tubs[tb[1]]}); return; }   // in the water to the chest
    const bi=ON_BENCH.indexOf(k);
    if(bi>=0&&B[bi]){ const b=B[bi]; Object.assign(Cn,{act:'sit',i:b.i+itemW(b)/2,j:b.j+itemH(b)/2,fi:0,fj:-1,after:b}); return; }   // facing the tubs
    Object.assign(Cn,{act:'rest',i:2.4,j:4.6,fi:0.3,fj:-1});                                     // waiting for a tub
  });
  state.crowd=[...npcsState.YN];
}
/** Leaving the bath: clothes and places as they were. */
export function bathLeave(){
  if(!state.saved) return;
  const P=appearanceState.PAL;
  npcsState.YN.forEach((Cn,k)=>{ const S=state.saved[k]; P.set(S.pal,Cn.rb*3); Object.assign(Cn,{sleeves:S.C.sleeves,pants:S.C.pants,bath:false,tub:false,z0:0,yard:true,act:'idle',after:null,smoke:S.C.smoke}); });
  state.saved=null;
}

export function bathTick(){ for(const Cn of npcsState.YN) Cn.t++; }

/* ---------- light, steam, water ---------- */

/** Is a tub in use (a man in it, or the hero)? @param {number} k */
function inUse(k){
  const A=roomsState.hubAct; if(A&&A.kind==='shower'&&A.item&&A.item.t==='lshower'&&A.item.v===k) return true;
  return state.use[k]>=0;
}
/** Blend a picture pixel towards a colour. @param {number} x @param {number} y @param {number} c @param {number} a */
function mix(x,y,c,a){
  const W=appearanceState.W, M=rendererState.FB_MAIN; x=Math.round(x); y=Math.round(y); if(x<0||y<0||x>=W||y>=appearanceState.H) return; const p=y*W+x;
  M[p]=mixC(M[p],c,a);
}

/** Drawn over the room every frame: the gaslight (three smudges in a dark cellar), ripples round the men in the
 * tubs, the grey water crawling along the gutter, drips from the vault, steam off the water, the fog with a halo round
 * each jet, and the carbolic cast over everything. */
export function bathFX(){
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H, t=boxingState.tick, K=gymState.ISO_K, BG=gymState.bgHub;
  const lamps=LAMPS.map((L,k)=>{ const back=L[1]<0.5, i=L[0]+(back?0:0.35), j=L[1]+(back?0.35:0);
    return {x:isoX(i,j),y:isoY(i,j,L[2]+0.6),p:0.95+0.05*Math.sin(t*0.13+k*2)-(h2(t>>3,k)<4?0.15:0)}; });   // gas: steady, a rare gutter
  // the light: dark everywhere, warm round the jets
  const R2=(44*K)**2, amb=0.15;
  for(let y=0;y<H;y++) for(let x=0,p=y*W;x<W;x++,p++){ let f=amb; for(const L of lamps){ const dx=x-L.x, dy=(y-L.y)*1.3; f+=L.p*0.52/(1+(dx*dx+dy*dy)/R2); }
    const o=M[p], r=Math.min(255,(o&255)*f*1.04), g=Math.min(255,((o>>8)&255)*f*0.97), b=Math.min(255,((o>>16)&255)*f*0.8);
    M[p]=(0xff000000|((b|0)<<16)|((g|0)<<8)|(r|0))>>>0; }
  let on=0;
  SHOWERS.forEach((ci,k)=>{ if(!inUse(k)) return; on++;
    for(let w=0;w<2;w++){ const r=((t*0.05+k*1.7+w*2.5)%5)*0.06+0.12; for(let a=0;a<6.28;a+=0.35/K) mix(isoX(ci+Math.cos(a)*r,SOAK_J+0.2+Math.sin(a)*r*0.7),isoY(ci+Math.cos(a)*r,SOAK_J+0.2+Math.sin(a)*r*0.7,WATER_Z),C.greyH,0.35*(1-r/0.42)); }   // ripples round him
    if(t%26===(k*5)%26){ const x=isoX(ci,1.1), y=isoY(ci,1.1,WATER_Z+2); state.steam.push({x:x+(Math.random()-0.5)*6*K,y,vx:(Math.random()-0.4)*0.06*K,vy:(-0.08-Math.random()*0.06)*K,r:4*K,l:220,m:220}); } });
  for(let m=0;m<9;m++){ const f=(t*0.006+m/9)%1, i=STALL_I0-0.1+f*(DRAIN[0]-STALL_I0+0.1), j=(GUT_J0+GUT_J1)/2; mix(isoX(i,j),isoY(i,j,0),C.greyH,0.8); }   // the water going to the drain
  if(Math.random()<0.06) state.drips.push({i:1+Math.random()*8.5,j:0.4+Math.random()*5.5,z:gymState.HUB_WH-2,v:0});
  for(const d of state.drips){ d.v+=0.05; d.z-=d.v; mix(isoX(d.i,d.j),isoY(d.i,d.j,Math.max(0,d.z)),C.drop,0.85); if(d.z<=0){ d.done=1; mix(isoX(d.i,d.j)-K,isoY(d.i,d.j,0),C.drop,0.5); mix(isoX(d.i,d.j)+K,isoY(d.i,d.j,0),C.drop,0.5); } }
  state.drips=state.drips.filter(d=>!d.done);
  if(state.steam.length<8+on*2&&t%30===0) state.steam.push({x:(30+Math.random()*90)*K,y:(30+Math.random()*30)*K,vx:0.04*K,vy:-0.015*K,r:8*K,l:320,m:320});
  for(const s of state.steam){ s.l--; s.x+=s.vx; s.y+=s.vy; s.r=Math.min(16*K,s.r+0.05*K);
    const k=Math.min(1,s.l/s.m*1.6)*Math.min(1,(s.m-s.l)/30), R=Math.ceil(s.r);
    for(let y=-R;y<=R;y+=1) for(let x=-R;x<=R;x+=1){ const d=(x*x+y*y)/(s.r*s.r); if(d>1) continue; const X=Math.round(s.x+x), Y=Math.round(s.y+y); if(X<0||X>=W||Y<0||Y>=H||BG[Y*W+X]===C.ceil) continue;
      M[Y*W+X]=mixC(M[Y*W+X],C.steam,k*(1-d)*0.32); } }
  state.steam=state.steam.filter(s=>s.l>0).slice(-40);
  // the fog: thick and slow, lit from within near every jet
  const S=0.26+0.03*on, G=40*K, gw=Math.ceil(W/G)+2, gh=Math.ceil(H/G)+2, ox=t*0.1, oy=-t*0.03, cx=Math.floor(ox/G), cy=Math.floor(oy/G), N=state.mist;
  for(let y=0;y<gh;y++) for(let x=0;x<gw;x++) N[y*gw+x]=h2(x+cx,y+cy)/255;
  for(let y=0;y<H;y++){ const v=(y+oy)/G-cy, vy=Math.floor(v), fy=v-vy, hf=0.6+0.4*(1-y/H);
    for(let x=0,p=y*W;x<W;x++,p++){ if(BG[p]===C.ceil) continue; const u=(x+ox)/G-cx, ux=Math.floor(u), fx=u-ux, q=vy*gw+ux;
      const n=(N[q]*(1-fx)+N[q+1]*fx)*(1-fy)+(N[q+gw]*(1-fx)+N[q+gw+1]*fx)*fy;
      let lit=0.1; for(const L of lamps){ const dx=x-L.x, dy=(y-L.y)*1.2; lit+=1.0/(1+(dx*dx+dy*dy)/(26*K)**2); }
      const a=Math.min(0.5,S*hf*(0.35+0.65*n)), fc=mixC(C.fogD,C.fog,Math.min(1,lit));
      M[p]=mixC(M[p],fc,a); } }
  for(const L of lamps){ const x0=Math.round(L.x), y0=Math.round(L.y);                       // the glass globe, the jet inside it
    for(let dy=-2*K;dy<=2*K;dy++) for(let dx=-2*K;dx<=2*K;dx++){ const d=Math.hypot(dx,dy*1.1)/(2*K); if(d>1) continue; mix(x0+dx,y0+dy,d>0.8?C.glass:C.flame,d>0.8?0.6:0.35*(1-d)); }
    for(let k=0;k<2*K;k++){ pset(x0,y0+K-k,k<K?C.flame:C.flameW); if(k<K) pset(x0+1,y0+K-k,C.flame); } }
  for(let p=0;p<W*H;p++) M[p]=mixC(M[p],C.carbolic,0.07);                                     // the carbolic air
}

/* ---------- stations ---------- */

/** Station options in the bath (null when the station is not a bath one). @param {any} st */
export function bathOptions(st){
  switch(st.id){
    case 'ldoor': return [['Wróć do celi',()=>goRoom('cell',0)]];
    case 'lshower': {
      const k=st.item.v, who=state.use[k];
      if(who>=0) return [['Zajęte — '+sparringState.YARD_OPP[who].title,()=>{},true]];
      const soap=useSoap(false), why=prisonGate();
      return [['Kąpiel w wannie · 1 akcja · higiena do pełna'+(soap?' (mydło karbolowe)':' (szara woda)')+(why?' — '+why:''),()=>{ if(soap) useSoap(true);
        startActivity(st,{kind:'shower',label:'kąpiel w łaźni',min:0,pose:2,pz:SOAK_Z,at:[SHOWERS[k],SOAK_J],face:[0,1],order:'after',pop:-1,after:()=>spendAction('mycie',100)}); },!!why,'act']]; }
    case 'lbench': return [['Ławka — ręcznik i mydło karbolowe',()=>{},true]];
    case 'bathfight': {
      const k=st.yn, O=sparringState.YARD_OPP[k], Cn=npcsState.YN[k];
      const here=()=>({...st,look:[Cn.i,Cn.j,15],spot:[gymState.hubP.i,gymState.hubP.j]});
      const go=()=>{ prisonFightStart('laznia',k); startSpar(k,'laznia',here()); };
      const why=prisonGate();
      return [['Bójka w łaźni: '+O.title+' '+'★'.repeat(oppStars(O))+' · do KO · 1 akcja'+listTag('laznia',k)+(why?' — '+why:''),go,!!why],...prisonFightExtras(true,k,go,here)]; }
  }
  return null;
}

export function initialize(){
  Object.assign(C,{ceil:rgb('#050505'),
    rub:[rgb('#5e584a'),rgb('#4e4a3e'),rgb('#6a6454')],joint:rgb('#24221c'),lime:rgb('#8a8676'),stone:rgb('#5a5446'),stoneD:rgb('#3e3a30'),stoneT:rgb('#726a58'),
    brick:[rgb('#3a2620'),rgb('#2e1e1a'),rgb('#44302a')],brickK:rgb('#1a1210'),mortar:rgb('#221c18'),slime:rgb('#24301e'),slimeW:rgb('#3a3e26'),damp:rgb('#2a3026'),soot:rgb('#141210'),
    wetH:rgb('#8a9088'),flag:[rgb('#4e4a42'),rgb('#46423b'),rgb('#3e3b35')],fjoint:rgb('#1c1a17'),wet:rgb('#2a2e2c'),
    grey:rgb('#4e5048'),greyD:rgb('#3e403a'),greyH:rgb('#7a7c70'),scum:rgb('#8a8670'),
    zinc:rgb('#6e7270'),zincD:rgb('#4e5250'),zincH:rgb('#9a9e98'),rust:rgb('#6a4a2e'),iron:rgb('#26262a'),ironK:rgb('#101012'),
    wood:rgb('#4a3a28'),woodL:rgb('#5e4c36'),woodD:rgb('#36291c'),woodK:rgb('#1a140e'),coat:rgb('#3e3628'),coatD:rgb('#2a241a'),towel:rgb('#8e8c84'),stripe:rgb('#5a2a20'),
    soap:rgb('#a89a5a'),brass:rgb('#6a5428'),brassH:rgb('#9a7e3e'),glass:rgb('#c8c8b0'),flame:rgb('#ffd890'),flameW:rgb('#fff8e0'),
    drop:rgb('#5e625a'),steam:rgb('#c8c8bc'),fog:rgb('#b0a684'),fogD:rgb('#2e302a'),wetV:rgb('#4a4a42'),carbolic:rgb('#b0b47a')});
  Object.assign(gymState.GYM_TYPES,{ldoor:{fixed:true,flat:true,z:9,st:'ldoor'},lshower:{fixed:true,block:true,z:8,st:'lshower'},lbench:{fixed:true,block:true,z:7,st:'lbench'},lpod:{fixed:true,block:true}});
  state.list=bathLayout().map(mkItem); state.use=[-1,-1,-1,-1,-1]; state.saved=null; state.steam=[]; state.drips=[]; state.mist=new Float32Array(256); state.crowd=[];
  Object.assign(gymState.ST_INFO,{ldoor:['DRZWI','Drzwi łaźni — powrót do celi'],lshower:['WANNA','Cynkowa wanna — kąpiel w szarej wodzie'],lbench:['LAWKA','Ławka']});
}
