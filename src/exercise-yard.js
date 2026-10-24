/* The Exercise Yard — Newgate, 1868: a well of soot-black brick. The walls rise out of the picture, crowned with iron
   spikes and arched grilles against a sky drowned in smog; the setts are wet; three rings of stone flags are let into
   them. The prisoners walk the outer ring in single file and in step, every one of them in the same grey canvas hood
   with two slits for the eyes — identical mannequins; their breath comes through the cloth. Two turnkeys watch from
   the middle and the gate. Drawn in the 2× frame; the walkers keep the old yard people (YN, so the fights still work). */

import { state as gymState, quad, isoLine, isoLineThin, isoX, isoY, shadeC, psetK } from './gym.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, pset } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { state as roomsState, skyBucket, faceI } from './rooms.js';
import { skyColors, weatherNow } from './weather.js';

// Runtime values owned by exercise-yard; initialized explicitly by main.js.
export const state = {};

/** The yard: 12 × 10 tiles (npcs.YARD_W / YARD_H), walls this high (they leave the top of the picture). */
const YW = 12, YH = 10;
export const EY_WH = 40;
/** The rings of flags (centre, band radii) and the walking ring. */
export const RING_C = [6, 5];
const RINGS = [[1.15,1.6],[2.55,3.0],[3.95,4.5]];
export const WALK_R = 4.22;
/** Walking speed along the ring (tiles per tick): a slow, dragging step. */
export const WALK_SP = 0.0055;

export function exerciseLayout(){ return [{t:'ydoor',i:0,j:1.1,w:0.3,h:1.5},{t:'ydrain',i:RING_C[0]-0.3,j:RING_C[1]-0.3,w:0.6,h:0.6}]; }

/** A point on the walking ring at arc length s: [i, j, facing i, facing j] (anticlockwise as seen from above). @param {number} s */
export function ringPos(s){ const a=s/WALK_R; return [RING_C[0]+Math.cos(a)*WALK_R,RING_C[1]+Math.sin(a)*WALK_R,-Math.sin(a),Math.cos(a)]; }

const C = {};
const bay=(/** @type {number} */ x,/** @type {number} */ y)=>gymState.BAYER[(y&3)*4+(x&3)];
/** @param {number} c @param {number} t @param {number} k */
function mixC(c,t,k){ const ch=(/** @type {number} */ s)=>Math.round(((c>>s)&255)*(1-k)+((t>>s)&255)*k); return (0xff000000|(ch(16)<<16)|(ch(8)<<8)|ch(0))>>>0; }

/** Cell windows high in the walls, looking down on the yard: [right wall?, u, z]. */
const SLITS = [[true,14,19],[true,34,19],[true,54,19],[false,22,19],[false,44,19],[true,24,25.5],[true,44,25.5],[false,32,25.5]];

/** A yard wall. a: tiles along the wall, z: height (above EY_WH: the spikes and the grille, else sky = 0). @param {number} a @param {number} z @param {number} x @param {number} y @param {boolean} right */
function wallCol(a,z,x,y,right){
  const lim=right?YW:YH, u=a*6; if(a>lim-0.02) return 0;
  if(z>EY_WH){                                                                                // iron against the sky
    const h=z-EY_WH, pu=u%1.5;
    if(h<0.6) return C.ironH;                                                                 // the rail on the coping
    if(h<3.6&&pu<0.32) return h>3.0?(pu<0.16?C.ironH:C.iron):C.iron;                          // spikes
    if(h>=3.6&&h<3.9&&pu<0.5) return C.iron;
    const span=12, t=((u%span)/span-0.5)*2, ah=3.2+2.6*Math.sqrt(Math.max(0,1-t*t));             // arched grilles between the posts
    if(Math.abs(h-ah)<0.35) return C.iron;
    if(h<ah&&h>3.2&&(u%span)%2<0.28) return C.iron;
    if(Math.abs(u%span)<0.4&&h<6.2) return C.ironH;                                           // the posts
    return 0; }
  if(z>EY_WH-1.0) return z>EY_WH-0.35?C.copeT:C.cope;                                          // stone coping
  for(const [r,su,sz] of SLITS) if(r===right&&Math.abs(u-su)<0.9&&z>sz&&z<sz+3.4){              // a barred cell window
    if(Math.abs(u-su)>0.7||z<sz+0.3) return C.stoneD; return Math.abs(u-su)<0.15?C.iron:(h2(su,sz|0)<60&&bay(x,y)<2?C.lamp:C.dark); }
  const pil=((u+1.5)%18)<2.4;                                                                  // brick piers every three tiles
  if(right&&Math.abs(u-63)<0.35&&z<EY_WH-1){ return ((z*1.2)|0)%5===0?C.ironH:(u<63?C.rustD:C.rust); }   // a rusted downpipe
  if(z<3.6){ const n=h2(Math.floor((u+(right?0:5))/4),Math.floor(z/1.8)); let c=(((u+(Math.floor(z/1.8)&1)*2)/4)%1<0.06||(z/1.8)%1<0.08)?C.joint:(n<80?C.stoneD:C.stone);   // the plinth
    if(z<1.6&&(1.6-z)*9>bay(x,y)) c=h2(Math.floor(u*2),Math.floor(z*3))<90?C.slime:mixC(c,C.slime,0.5); return c; }
  const br=Math.floor((z-3.6)/1.1), bu=(u+(br&1)*1.1)/2.2, fb=bu-Math.floor(bu), fz=(z-3.6)/1.1-br, n=h2(Math.floor(bu)+(right?40:7),br);
  let c=(fz<0.13||fb<0.07)?C.mortar:C.brick[n%3];
  if(pil) c=shadeC(c,((u+1.5)%18)<0.6?0.7:1.08);
  const streak=h2(Math.floor(u*0.9)+(right?3:9),5); if(streak<70) c=mixC(c,C.soot,0.35+0.4*(z/EY_WH));          // soot run down from the top
  if(h2(Math.floor(u*1.6)+21,Math.floor(z*0.5))<18) c=mixC(c,C.salt,0.5);                     // white salts weeping out
  c=mixC(c,C.soot,Math.min(0.78,0.28+z/EY_WH*0.55));                                             // blacker as it rises
  if(a<0.3) c=shadeC(c,0.72);
  return c;
}

/** Smooth value noise 0..1 (bilinear between hashed corners). @param {number} x @param {number} y */
function vnoise(x,y){ const X=Math.floor(x), Y=Math.floor(y), fx=x-X, fy=y-Y, sx=fx*fx*(3-2*fx), sy=fy*fy*(3-2*fy), n=(/** @type {number} */ a,/** @type {number} */ b)=>h2(a,b)/255;
  return (n(X,Y)*(1-sx)+n(X+1,Y)*sx)*(1-sy)+(n(X,Y+1)*(1-sx)+n(X+1,Y+1)*sx)*sy; }

/** The setts, the three rings of flags, the drain; wet and dark at the walls. @param {number} x @param {number} y */
function floorCol(x,y){
  const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY)/3, i=(a+b)/2, j=(b-a)/2;
  if(i<0||j<0||i>YW||j>YH) return 0;
  const r=Math.hypot(i-RING_C[0],j-RING_C[1]), ang=Math.atan2(j-RING_C[1],i-RING_C[0]);
  let c=0;
  for(const [r0,r1] of RINGS) if(r>=r0&&r<=r1){                                               // a ring of flags
    const seg=Math.max(8,Math.round(r*7)), sa=(ang/(Math.PI*2)+0.5)*seg, fa=sa-Math.floor(sa), n=h2(Math.floor(sa)+Math.round(r0*10),3);
    if(fa<0.05||r-r0<0.05||r1-r<0.05) c=C.joint; else { c=C.flag[n%3]; if(Math.abs(r-WALK_R)<0.18&&r0>3) c=bay(x,y)<9?C.flagW:c; }   // worn pale where the feet go
    break; }
  if(!c){ const row=Math.floor(j/0.34), si=(i+(row&1)*0.2)/0.4, fi=si-Math.floor(si), fj=j/0.34-row, n=h2(Math.floor(si)*3+row,row*7);   // setts
    const d=Math.hypot((fi-0.5)*1.1,fj-0.5); c=d>0.46?C.mud:(n<70?C.sett[1]:n>220?C.sett[2]:C.sett[0]);
    if(d<0.2&&fi<0.45&&bay(x,y)<4) c=C.settH; }                                                // the wet top of each stone
  const pn=vnoise(i*0.9+3,j*0.9+7)*0.7+vnoise(i*2.3,j*2.3)*0.3;                             // irregular puddles holding the grey sky
  if(pn>0.66) c=pn<0.68?C.wetH:mixC(c,C.wet,0.7);
  const e=Math.min(i,j); if(e<1.1&&(1-e/1.1)*13>bay(x,y)) c=shadeC(c,0.6);                     // black at the foot of the walls
  return c;
}

/** Build the yard into the background: smog sky, the two walls with their iron, the floor, the flat items. @param {(it:any)=>void} drawFlat */
export function buildExerciseYard(drawFlat){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, OX=gymState.HUB_OX, OY=gymState.HUB_OY, K=gymState.ISO_K, b=skyBucket();
  roomsState.homeSkyB=b; const S=skyColors(b,roomsState.SKY[b]), s0=mixC(rgb(S[0]),C.smog,0.7), s1=mixC(rgb(S[1]),C.smogL,0.6);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const t=y/(H*0.4); fb[y*W+x]=t<1&&bay(x,y)<t*16?s1:t<1?s0:s1; }
  const WT=EY_WH+7;
  quad(0,0,0,0,YH,0,0,YH,WT,0,0,WT,(x,y)=>{ const j=(OX-x)/6, z=OY+j*3-y; return wallCol(j,z,x,y,false); });
  quad(0,0,0,YW,0,0,YW,0,WT,0,0,WT,(x,y)=>{ const i=(x-OX)/6, z=OY+i*3-y; return wallCol(i,z,x,y,true); });
  isoLine(0,0,0,0,0,EY_WH,C.joint);
  quad(0,0,0,YW,0,0,YW,YH,0,0,YH,0,floorCol);
  isoLine(0,YH,0,YW,YH,0,appearanceState.C_FLOOR_EDGE); isoLine(YW,0,0,YW,YH,0,appearanceState.C_FLOOR_EDGE);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const p=y*W+x; if(fb[p]!==s0&&fb[p]!==s1) continue;   /* below the wall tops nothing is sky: the dark around the room */
    const nx=x/K, top=(nx<=OX?OY+(OX-nx)/6*3:OY+(nx-OX)/6*3)-WT; if(y/K>top) fb[p]=C.void; }
  for(const it of gymState.yardList) if(gymState.GYM_TYPES[it.t].flat) drawFlat(it);
}

/** The yard's own items; false for anything else. @param {any} it */
export function drawExerciseItem(it){
  if(it.t==='ydrain'){ const ci=it.i+0.3, cj=it.j+0.3;                                         // a round iron drain in the middle
    quad(ci-0.28,cj-0.28,0,ci+0.28,cj-0.28,0,ci+0.28,cj+0.28,0,ci-0.28,cj+0.28,0,(x,y)=>{ const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY)/3, i=(a+b)/2, j=(b-a)/2, d=Math.hypot(i-ci,j-cj);
      if(d>0.28) return 0; if(d>0.22) return C.ironH; return ((i-ci)*14|0)&1?C.iron:C.dark; }); return true; }
  if(it.t==='ydoor'){ const a0=it.j, a1=it.j+1.5, Hd=17;                                        // the gate: oak, iron straps, an arched head
    quad(0.01,a0-0.4,0,0.01,a1+0.4,0,0.01,a1+0.4,Hd+2.4,0.01,a0-0.4,Hd+2.4,(x,y)=>{ faceI(0.01,x,y); const fa=roomsState.fa, fz=roomsState.fz, u=(fa-a0)/(a1-a0);
      const top=Hd+Math.sqrt(Math.max(0,1-(u*2-1)**2))*1.8;
      if(u>0&&u<1&&fz<top){ if(fz>top-0.3) return C.ironK;
        for(const sz of [3,9,15]) if(Math.abs(fz-sz)<0.45) return ((u*20)%1)<0.22?C.ironH:C.iron;
        if(u>0.4&&u<0.6&&fz>11.5&&fz<13) return ((u*40)|0)&1?C.dark:C.iron;                   // the grated judas
        const pl=Math.floor(u*6), e=u*6-pl; return e<0.07?C.ironK:(h2(pl,Math.floor(fz*1.2))<50?C.oakD:C.oak); }
      return fz>top+1.6?C.copeT:(h2(Math.floor(fz/2.2),Math.floor(fa*3))<90?C.stoneD:C.stone); });   // the stone surround
    return true; }
  return false;
}

/** After the light: the smog lies thicker further back (higher in the picture) and drifts. */
export function yardFog(){
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H, t=boxingState.tick, wx=weatherNow(), base=wx==='sun'?0.16:wx==='cloud'?0.28:0.24;
  const G=36, gw=Math.ceil(W/G)+2, gh=Math.ceil(H/G)+2, ox=t*0.08, cx=Math.floor(ox/G), N=state.noise;
  for(let gy=0;gy<gh;gy++) for(let gx=0;gx<gw;gx++) N[gy*gw+gx]=h2(gx+cx,gy+3)/255;
  const fr=C.fog&255, fg=(C.fog>>8)&255, fbl=(C.fog>>16)&255;
  for(let y=0;y<H;y++){ const depth=Math.max(0,1.15-y/H), v=y/G, vy=Math.floor(v), fy=v-vy;
    for(let x=0,p=y*W;x<W;x++,p++){ const u=(x+ox)/G-cx, ux=Math.floor(u), fx=u-ux, q=vy*gw+ux;
      const n=(N[q]*(1-fx)+N[q+1]*fx)*(1-fy)+(N[q+gw]*(1-fx)+N[q+gw+1]*fx)*fy, a=Math.min(0.7,base*depth*(0.55+0.9*n)), o=M[p];
      M[p]=(0xff000000|((((o>>16)&255)+(fbl-((o>>16)&255))*a)<<16)|((((o>>8)&255)+(fg-((o>>8)&255))*a)<<8)|((o&255)+(fr-(o&255))*a))>>>0; } }
}

export function initialize(){
  Object.assign(C,{smog:rgb('#5c5e4c'),smogL:rgb('#7a7a62'),fog:rgb('#6e705e'),
    iron:rgb('#1c1c1e'),ironH:rgb('#3a3a3e'),ironK:rgb('#0e0e10'),rust:rgb('#5a3420'),rustD:rgb('#3e2416'),
    cope:rgb('#4a463e'),copeT:rgb('#625e54'),stone:rgb('#4e4a42'),stoneD:rgb('#3a3731'),joint:rgb('#1e1c19'),slime:rgb('#26301e'),
    brick:[rgb('#4a2e24'),rgb('#3e261e'),rgb('#54362a')],mortar:rgb('#2a2622'),soot:rgb('#141210'),salt:rgb('#8a8678'),
    dark:rgb('#0a0a0c'),void:rgb('#050506'),lamp:rgb('#a07a3a'),
    flag:[rgb('#5a564c'),rgb('#524e45'),rgb('#4a463e')],flagW:rgb('#6e695c'),sett:[rgb('#3e3c38'),rgb('#36342f'),rgb('#46433d')],settH:rgb('#5c5a54'),mud:rgb('#221f1a'),
    wet:rgb('#2a2e2e'),wetH:rgb('#6a706c'),oak:rgb('#3a2c1e'),oakD:rgb('#2a2016')});
  state.noise=new Float32Array(256);
}
