/* Cell light: a lighting pass over the finished frame of the isometric cell (the shared Ward).
   The background build records where each pixel sits in the room; every frame the tallow lamp (evening and the dark
   morning), the sun through the barred window (day) and the cold window light (after lights-out) relight it.
   Walls and floor get proper distance and angle; furniture and people take the light of the surface behind them. */

import { state as gymState, isoX, isoY, isoLine } from './gym.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { state as progressionState } from './progression.js';
import { state as boxingState, h2 } from './boxing.js';
import { weatherNow } from './weather.js';
import { wardWinOpen, wardPainted, LAMP, WARD_WIN as WIN } from './ward.js';

// Runtime values owned by cell-light; initialized explicitly by main.js.
export const state = {};

/** The barred window in the j = 0 wall, in wall units u = 6·i and height z. */
/** One height unit (a screen pixel) in tiles. */
const ZS = 0.15;
/** Is (u,z) open between the Ward window bars? @param {number} u @param {number} z */
export function winOpen(u,z){ return wardWinOpen(u,z); }

/** @param {number} a @param {number} b @param {number} x */
const smooth=(a,b,x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };

/** Light sources at a minute of the day: daylight 0..1, the lamp (on 6:00–7:30 and 17:30–22:00), window light after 22:00.
 * @param {number} min */
export function cellLights(min){
  const h=(((min/60)%24)+24)%24;
  return {h,day:smooth(5.8,8,h)*(1-smooth(17,20,h)),bulb:(h>=6&&h<7.5)||(h>=17.5&&h<22),night:h>=22||h<6};
}

/** Sun through the window: horizontal drift per tile of depth and drop per tile (low in the morning, high at noon). @param {number} h */
function sunRay(h){ const u=Math.max(0,Math.min(1,(h-6)/13.5)), s=Math.sin(Math.PI*u); return {lx:0.45-0.9*u,lz:2.3+0.7*s,k:Math.pow(s,0.35)}; }   // a low sun: the long barred patch crosses the free floor, right of the table in the morning, by the door in the evening

/** Record the room position of every background pixel. Called after the cell background is built. @param {number} cw @param {number} ch */
export function buildCellLight(cw,ch){
  const W=appearanceState.W, H=appearanceState.H, OX=gymState.HUB_OX, OY=gymState.HUB_OY, WH=gymState.HUB_WH;
  if(state.kind.length!==W*H){ state.kind=new Uint8Array(W*H); state.pos=new Float32Array(W*H*3); }   // the 2× room has its own size
  const K=state.kind, P=state.pos;
  state.cw=cw; state.ch=ch;
  const Kp=gymState.ISO_K;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const p=y*W+x, ux=x/Kp, uy=y/Kp, a=(ux-OX)/6, b=(uy-OY)/3, fi=(a+b)/2, fj=(b-a)/2;
    let k=0, i=0, j=0, z=0;
    if(fi>=0&&fj>=0&&fi<=cw&&fj<=ch){ k=1; i=fi; j=fj; }                                      // floor
    else if(ux<OX){ const lj=(OX-ux)/6, lz=OY+lj*3-uy; if(lj<=ch&&lz>=0&&lz<=WH){ k=2; j=lj; z=lz; } }   // left wall, i = 0
    else { const ri=(ux-OX)/6, rz=OY+ri*3-uy; if(ri<=cw&&rz>=0&&rz<=WH){ k=winOpen(ri*6,rz)?4:3; i=ri; z=rz; } }   // window wall, j = 0
    K[p]=k; P[p*3]=i; P[p*3+1]=j; P[p*3+2]=z;
  }
}

/** Tallow intensity this frame: an uneven, guttering flame. */
function bulbPower(on){
  const t=boxingState.tick;
  if(!on) return 0;
  return 0.78+0.22*(h2(t>>1,5)/255)*(h2(t>>3,9)/255)-(h2(t>>4,17)<12?0.25:0);
}

/** Position of the tallow flame on its bracket. */
function bulbAt(){ const t=boxingState.tick; return {i:LAMP.i+0.25+Math.sin(t*0.37)*0.03,j:LAMP.j+Math.cos(t*0.29)*0.03}; }

/** Relight the finished frame. */
export function lightCell(){
  const fb=rendererState.FB_MAIN, bg=gymState.bgHub, K=state.kind, P=state.pos, N=appearanceState.W*appearanceState.H;
  const L=cellLights(progressionState.save.sim.min), S=sunRay(L.h), B=bulbAt();
  const wx=weatherNow(), dk=wx==='sun'?1:wx==='cloud'?0.82:0.66, bulb=1.75*bulbPower(L.bulb), sun=wx==='sun'?0.32*L.day*S.k:0, amb=0.15+0.42*L.day*dk, night=L.night?0.32:0;   /* clouds and rain: no patch of sun, a dimmer day; the Ward: smog, a dark vault */
  const AR=amb*(0.92+0.06*L.day), AG=amb*0.96, AB=amb*(1.08-0.05*L.day)*0.96, bz=LAMP.z*ZS, fall=0.11, gR=0.62, gB=0.3, wi=(WIN.u0+WIN.u1)/12, NL={i:wi,j:0.4,z:WIN.z0+2};
  state.bulb=bulb; state.sun=sun; state.ray=S;
  const PT=wardPainted(), pAmb=0.28+0.66*L.day*(wx==='sun'?1:wx==='cloud'?0.88:0.76), pCool=1-L.day;   /* the painting keeps its own light: by day close to it, at night a dark vault */
  for(let p=0;p<N;p++){
    const k=K[p], c=fb[p], front=c!==bg[p];
    if(PT&&!front){ fb[p]=paintedLight(c,k,P[p*3],P[p*3+1],P[p*3+2],pAmb,pCool,bulb,B,bz,sun,S,night,NL); continue; }
    if(k===4&&!front) continue;                                                             // the sky behind the bars stays as it is
    let r=AR, g=AG, b=AB;
    const i=P[p*3], j=P[p*3+1], z=P[p*3+2]*ZS;
    if(bulb>0){
      let e;
      if(k){ const dx=B.i-i, dy=B.j-j, dz=bz-z, d2=dx*dx+dy*dy+dz*dz, d=Math.sqrt(d2);
        const lam=front?0.85:Math.max(0.12,k===1?dz/d:k===2?dx/d:dy/d); e=bulb*lam/(1+fall*d2); }
      else e=front?bulb*0.3:0;
      r+=e; g+=e*gR; b+=e*gB;
    }
    if(k&&L.day>0){ const dw=Math.hypot(i-wi,j)+0.1; const e=L.day*0.3/(1+0.12*dw*dw); r+=e*0.95; g+=e; b+=e*1.04; }   // daylight fill, strongest by the window
    if(sun>0&&!front&&(k===1||k===2)&&winOpen((i-S.lx*j)*6,P[p*3+2]+S.lz*j)){ r+=sun; g+=sun*0.9; b+=sun*0.7; }   // the barred patch of sun
    if(night>0&&k){ const dx=NL.i-i, dy=NL.j-j, dz=(NL.z-P[p*3+2])*ZS, e=night/(1+0.22*(dx*dx+dy*dy+dz*dz)); r+=e*0.45; g+=e*0.6; b+=e*0.62; }   /* the Ward at night: only the cold of the slot */
    const R=Math.min(255,(c&255)*r)|0, G=Math.min(255,((c>>8)&255)*g)|0, Bl=Math.min(255,((c>>16)&255)*b)|0;
    fb[p]=(0xff000000|(Bl<<16)|(G<<8)|R)>>>0;
  }
}

/** Light on a pixel of the painted Ward: dimmed by the hour (cooler in the dark), warmed near the tallow flame (the
 * painted glow round it fades while it is out), the barred patch of sun, the cold of the slot at night.
 * @param {number} c @param {number} k @param {number} i @param {number} j @param {number} z @param {number} amb
 * @param {number} cool @param {number} bulb @param {{i:number,j:number}} B @param {number} bz @param {number} sun
 * @param {{lx:number,lz:number}} S @param {number} night @param {{i:number,j:number,z:number}} NL */
function paintedLight(c,k,i,j,z,amb,cool,bulb,B,bz,sun,S,night,NL){
  let r=amb*(1-0.1*cool), g=amb, b=amb*(1+0.14*cool);
  if(k){
    const dx=B.i-i, dy=B.j-j, dz=bz-z*ZS, d2=dx*dx+dy*dy+dz*dz;
    if(bulb>0){ const e=bulb*0.42/(1+0.11*d2); r+=e; g+=e*0.72; b+=e*0.42; }
    else { const e=1-0.5*Math.exp(-d2/5); r*=e; g*=e; b*=e; }
    if(k>=3&&i*6>WIN.u0&&i*6<WIN.u1&&z>WIN.z0&&z<WIN.z1){ const e=0.6*(1-amb)*(1-cool); r+=e*0.9; g+=e; b+=e*1.05; }   // the slot itself: daylight behind the bars
    if(sun>0&&(k===1||k===2)&&winOpen((i-S.lx*j)*6,z+S.lz*j)){ r+=sun*0.6; g+=sun*0.54; b+=sun*0.42; }
    if(night>0){ const ex=NL.i-i, ey=NL.j-j, ez=(NL.z-z)*ZS, e=night*0.7/(1+0.22*(ex*ex+ey*ey+ez*ez)); r+=e*0.45; g+=e*0.6; b+=e*0.62; }
  }
  const R=Math.min(255,(c&255)*r)|0, G=Math.min(255,((c>>8)&255)*g)|0, Bl=Math.min(255,((c>>16)&255)*b)|0;
  return (0xff000000|(Bl<<16)|(G<<8)|R)>>>0;
}

/** Add light around a pixel: brighten towards white with a soft falloff.
 * @param {number} cx @param {number} cy @param {number} rad @param {number} k @param {number[]} tint */
function glow(cx,cy,rad,k,tint){
  const fb=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H;
  for(let y=Math.max(0,Math.floor(cy-rad));y<=Math.min(H-1,Math.ceil(cy+rad));y++) for(let x=Math.max(0,Math.floor(cx-rad));x<=Math.min(W-1,Math.ceil(cx+rad));x++){
    const d=Math.hypot(x-cx,(y-cy)*1.3)/rad; if(d>=1) continue;
    const a=k*(1-d)*(1-d), p=y*W+x, c=fb[p];
    const R=(c&255)+(255-(c&255))*a*tint[0], G=((c>>8)&255)+(255-((c>>8)&255))*a*tint[1], B=((c>>16)&255)+(255-((c>>16)&255))*a*tint[2];
    fb[p]=(0xff000000|((B|0)<<16)|((G|0)<<8)|(R|0))>>>0;
  }
}

/** Draw the Ward's tallow lamp after the lighting pass. */
export function drawCellLights(){ drawLamp(); }

/** The tallow lamp on its iron bracket by the door: a squat iron cup, the flame, its halo and smoke. */
function drawLamp(){
  const t=boxingState.tick, K=gymState.ISO_K, lit=state.bulb>0.3, bi=LAMP.i, bj=LAMP.j, bz=LAMP.z;
  if(wardPainted()){ paintedFlame(t,lit,Math.round(isoX(bi,bj)),Math.round(isoY(bi,bj,bz))); return; }
  isoLine(0.02,bj,bz-1.6,bi,bj,bz-0.4,state.C_SOCKET); isoLine(0.02,bj,bz-0.6,bi,bj,bz-0.4,state.C_SOCKET);   // the bracket
  const x=Math.round(isoX(bi,bj)), y=Math.round(isoY(bi,bj,bz));
  for(let dx=-2*K;dx<=2*K;dx++){ pset(x+dx,y,state.C_CUP); pset(x+dx,y+1,state.C_SOCKET); } for(let dx=-K;dx<=K;dx++) pset(x+dx,y+2,state.C_SOCKET);
  if(lit){ const fl=(h2(t>>2,3)%3)-1, hgt=2*K+((h2(t>>2,7)&1)?1:0);
    for(let k=0;k<hgt;k++){ const sx=Math.round(fl*k/hgt); pset(x+sx,y-1-k,k<1?state.C_FLAME3:state.C_FLAME2); if(k<hgt-1) pset(x+sx+(k&1?1:-1),y-1-k,state.C_FLAME1); }
    glow(x,y-2*K,16*K,0.4*state.bulb,[1,0.62,0.28]);
    for(let k=0;k<6;k++){ const f=((t*0.012+k/6)%1), sx=x+Math.sin(t*0.05+k*1.3)*f*5*K, sy=y-hgt-f*18*K; if(f<0.9) pset(Math.round(sx),Math.round(sy),state.C_SMOKE); } }   // the greasy smoke
  else pset(x,y-1,state.C_SOCKET);
}

/** The painted lamp: a live flame over the painted one, a faint halo and greasy smoke; out, a dark wick.
 * @param {number} t @param {boolean} lit @param {number} x @param {number} y the cup under the flame */
function paintedFlame(t,lit,x,y){
  if(!lit){ for(let dy=-5;dy<=0;dy++) for(let dx=-1;dx<=1;dx++) pset(x+dx,y+dy,dx||dy<-3?state.C_SMOKE:state.C_CUP); return; }
  const fl=(h2(t>>2,3)%3)-1, hgt=3+((h2(t>>2,7)&1)?1:0);
  for(let k=0;k<hgt;k++){ const sx=Math.round(fl*k/hgt); pset(x+sx,y-1-k,k<2?state.C_FLAME3:state.C_FLAME2); if(k>0&&k<hgt-1) pset(x+sx+(k&1?1:-1),y-1-k,state.C_FLAME1); }
  glow(x,y-3,14,0.16*state.bulb,[1,0.62,0.28]);
  for(let k=0;k<6;k++){ const f=((t*0.012+k/6)%1), sx=x+Math.sin(t*0.05+k*1.3)*f*8, sy=y-hgt-f*30; if(f<0.9) pset(Math.round(sx),Math.round(sy),state.C_SMOKE); }
}

export function initialize(){
  state.C_FLAME1=rgb('#c8501e'); state.C_FLAME2=rgb('#ffb04a'); state.C_FLAME3=rgb('#fff0b0'); state.C_CUP=rgb('#4a4640'); state.C_SMOKE=rgb('#3a3632');
  state.kind=new Uint8Array(appearanceState.W*appearanceState.H);
  state.pos=new Float32Array(appearanceState.W*appearanceState.H*3);
  state.cw=10; state.ch=9; state.bulb=0; state.sun=0; state.ray={lx:0,lz:5,k:0};
  state.C_SOCKET=rgb('#3a3630');
}
