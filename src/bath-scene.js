/* The bathhouse seen from the side, for a fight in the łaźnia (drawing only): a low barrel vault of black wet brick,
   rough stone walls, a row of plank stalls with zinc tubs of grey water at the back, two gas sconces, the gutter cut in
   the flags. Per frame: the gaslight smudged in the steam, drips from the vault, steam behind and in front of the
   fighters, reflections in the wet floor, and men in towels watching from the front (fight-crowd), grey in the steam. */

import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { state as gymState } from './gym.js';
import { mix } from './cast.js';
import { buildFrontCrowd, drawFrontCrowd } from './fight-crowd.js';

// Runtime values owned by bath-scene; initialized explicitly by main.js.
export const state = {};

const C = {};
const W = () => appearanceState.W, H = () => appearanceState.H;
/** @param {number} x @param {number} y */
const bay=(x,y)=>gymState.BAYER[(y&3)*4+(x&3)];
/** @param {number} c @param {number} k */
const shade=(c,k)=>(0xff000000|(Math.min(255,((c>>16)&255)*k)<<16)|(Math.min(255,((c>>8)&255)*k)<<8)|Math.min(255,(c&255)*k))>>>0;

/** Stalls at the back (left edges), the gas sconces (x, y) and the line where the wall meets the floor. */
const STALLS = [40, 58, 76, 94], STALL_W = 18, SCONCES = [[22,30],[124,30]], WALL_FLOOR = 75;

/** The wall and the floor (cached). */
export function bathBg(){
  if(state.bg) return state.bg;
  const w=W(), h=H(), bg=new Uint32Array(w*h);
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ if(x>=0&&x<w&&y>=0&&y<h) bg[y*w+x]=c; };
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let c;
    const arch=2+16*(1-Math.sqrt(Math.max(0,1-((x-72)/76)**2)));                                   // the barrel's curve over the room
    if(y<arch) c=C.ceil;
    else if(y<20){ const br=Math.floor(y/2), bu=(x+(br&1)*2)/4, mort=(y%2===0)||(Math.floor(bu*4)%4===0); c=mort?C.mortar:C.brick[h2(Math.floor(bu),br)%3];
      c=mix(c,C.ceil,Math.max(0,0.7-(y-arch)/14)); if(h2(x,y*5)<10) c=C.wetV; }                    // the vault, sweating
    else if(y<22) c=y===20?C.stoneT:C.stoneD;
    else if(y<WALL_FLOOR){ const row=Math.floor((y-22)/5), bx=Math.floor((x+row*7)/(9+(row%3)*2)), mort=((y-22)%5)===0||((x+row*7)%(9+(row%3)*2))===0;   // rough stone
      c=mort?C.joint:C.rub[h2(bx,row)%3]; if(h2(bx+3,row)>200&&!mort) c=mix(c,C.lime,0.5); if(y>66&&(y-66)*2>bay(x,y)) c=mix(c,C.slime,0.5); }
    else { const dz=y-38, u=(x-72)/dz*8, row=Math.floor(Math.log(dz)*7), fu=u-Math.floor(u+(row&1)*0.5);   // wet flags
      c=(fu<0.8/dz*8||(Math.log(dz)*7)%1<0.1)?C.fjoint:C.flag[h2(Math.floor(u),row)%3]; c=mix(c,C.wet,0.3);
      if(y>=78&&y<=80) c=y===78?C.stoneD:(bay(x,y)<4?C.greyH:C.grey);                             // the gutter along the stalls
      if(y<WALL_FLOOR+3) c=shade(c,0.7); }
    bg[y*w+x]=c; }
  for(const sx of STALLS){ for(let y=44;y<WALL_FLOOR;y++){ put(sx,y,C.woodK); put(sx+1,y,C.wood); }   // plank partitions
    for(let y=44;y<WALL_FLOOR;y++) for(let x=sx+2;x<sx+STALL_W;x++) if(y<47) put(x,y,0); }
  for(let y=44;y<WALL_FLOOR;y++){ put(STALLS[3]+STALL_W,y,C.woodK); put(STALLS[3]+STALL_W+1,y,C.wood); }
  for(const sx of STALLS){ const x0=sx+3, x1=sx+STALL_W-2;                                            // a zinc tub in each stall
    for(let y=60;y<WALL_FLOOR;y++) for(let x=x0;x<x1;x++){ const e=x===x0||x===x1-1||y===WALL_FLOOR-1; put(x,y,y===60?C.zincH:e?C.zincD:(h2(x,y)<20?C.rust:C.zinc)); }
    for(let x=x0+1;x<x1-1;x++) put(x,59,h2(x,sx)<60?C.scum:C.grey); }                                // grey water just under the rim
  for(const [lx,ly] of SCONCES){ for(let k=0;k<4;k++) put(lx-3+k,ly+2,C.brass); put(lx,ly+1,C.brass); put(lx,ly,C.glass); put(lx+1,ly,C.glass); put(lx,ly-1,C.glass); put(lx+1,ly-1,C.glass); }
  return (state.bg=bg);
}

/** The spectators: feet x, feet above FLOOR_Y, how each cheers. They face the camera: the fight is in front of them. */
const FANS = [{x:8,dy:-7,how:1},{x:21,dy:-9,how:0},{x:34,dy:-6,how:2},{x:110,dy:-6,how:0},{x:123,dy:-9,how:2},{x:136,dy:-7,how:1}];
/** The spectators, seen through the steam: every colour sinks into one grey-green shadow tone, the outline softens. */
function buildFans(){
  return buildFrontCrowd({fans:FANS,seed:77,outfit:'towel',shoe:C.slipHex,trunk:C.towelHex,
    grade:(c,x,y,o)=>o?C.silhD:mix(mix(c,C.silh,0.6),C.steam,bay(x,y)<5?0.42:0.2)});
}

/** Behind the fighters, per frame: water from the running roses, splashes, drips, steam; the spectators cheering.
 * @param {boolean} [hot] a punch landed, a knockdown or the end: everybody shouts */
export function bathBack(hot=false){
  const M=rendererState.FB_MAIN, w=W(), t=boxingState.tick;
  const wet=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c,/** @type {number} */ a)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&x<w&&y>=0&&y<H()) M[y*w+x]=mix(M[y*w+x],c,a); };
  for(let m=0;m<7;m++){ const f=(t*0.008+m/7)%1; wet(f*w,79,C.greyH,0.7); }                         // grey water crawling along the gutter
  if(Math.random()<0.08) state.drips.push({x:20+Math.random()*104,y:16,v:0});
  for(const d of state.drips){ d.v+=0.08; d.y+=d.v; wet(d.x,d.y,C.drop,0.9); if(d.y>=WALL_FLOOR) d.done=1; }
  state.drips=state.drips.filter(d=>!d.done);
  if(!state.fans) state.fans=buildFans();
  drawFrontCrowd(state.fans,t,hot);
  steam(state.back,0.85,WALL_FLOOR+8);   /* the steam drifts in front of them */
}

/** In front of the fighters: light steam drifting over the picture, drops, and the fighters mirrored in the wet floor. @param {Uint32Array} before the frame before the fighters were drawn */
export function bathFront(before){
  const M=rendererState.FB_MAIN, w=W(), h=H(), F=appearanceState.FLOOR_Y;
  for(let y=F+1;y<h;y++){ const sy=2*F-y; if(sy<0) continue;
    for(let x=0;x<w;x++){ const s=sy*w+x, c=M[s]; if(c===before[s]) continue; if(bay(x,y)>(1-(y-F)/12)*10) continue;
      M[y*w+x]=mix(M[y*w+x],c,0.32); } }
  steam(state.front,0.35,h);
  const t=boxingState.tick;                                                                       // the gaslight in the steam, the cellar's dark, the carbolic
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let f=0.42; for(const [lx,ly] of SCONCES){ const dx=x-lx, dy=(y-ly)*1.2; f+=(0.85+0.05*Math.sin(t*0.1+lx))/(1+(dx*dx+dy*dy)/900); }
    const v=Math.max(0,Math.hypot((x/w-0.5)*1.5,(y/h-0.45)*1.4)-0.5), k=Math.min(1.25,f)*(1-v*0.8), p=y*w+x;
    M[p]=mix(shade(M[p],k),C.carbolic,0.06); }
  for(const [lx,ly] of SCONCES){ for(let k=0;k<2;k++) M[(ly-k)*w+lx]=k?C.flameW:C.flame; M[ly*w+lx+1]=C.flame; }
}

/** @param {any[]} S @param {number} dens @param {number} clipY */
function steam(S,dens,clipY){
  const M=rendererState.FB_MAIN, w=W(), h=H();
  if(S.length<(dens>0.5?8:4)&&Math.random()<0.05) S.push({x:Math.random()*w,y:clipY*(0.4+Math.random()*0.5),vx:(Math.random()-0.4)*0.12,vy:-0.05-Math.random()*0.05,r:5+Math.random()*5,l:400,m:400});
  for(const s of S){ s.l--; s.x+=s.vx; s.y+=s.vy; s.r=Math.min(14,s.r+0.02);
    const k=Math.min(1,s.l/s.m*1.5)*Math.min(1,(s.m-s.l)/40)*dens, R=Math.ceil(s.r);
    for(let y=-R;y<=R;y++) for(let x=-R;x<=R;x++){ const d=(x*x+y*y)/(s.r*s.r); if(d>1) continue; const X=Math.round(s.x+x), Y=Math.round(s.y+y); if(X<0||X>=w||Y<0||Y>=Math.min(h,clipY)) continue;
      if(bay(X,Y)<k*(1-d)*7) M[Y*w+X]=d<0.35?C.steam:C.steamD; } }
  for(let i=S.length-1;i>=0;i--) if(S[i].l<=0||S[i].y<-10) S.splice(i,1);
}

/** Towels and slippers for a fighter's palette snapshot. */
export function towelColors(){ return {towel:C.towelHex, towel2:C.towelHex2, slip:C.slipHex}; }

/** A new fight: fresh steam (the crowd and the wall stay cached). */
export function resetBathScene(){ state.back=[]; state.front=[]; state.drips=[]; }

export function initialize(){
  Object.assign(C,{out:rgb('#0a0a12'),ceil:rgb('#07080e'),plaster:rgb('#8e968a'),plasterD:rgb('#7a8276'),mold:rgb('#4e5a48'),
    tile:rgb('#d6d4c6'),tileD:rgb('#bebcae'),tileH:rgb('#e8e6da'),grout:rgb('#8a8a7e'),groutD:rgb('#6a6a60'),blue:rgb('#3e6286'),blueD:rgb('#2e4a68'),skirt:rgb('#3a4a44'),skirtD:rgb('#26302c'),
    rust:rgb('#9a6a42'),rustD:rgb('#7a4a2a'),pipe:rgb('#8a9296'),pipeH:rgb('#c4cacc'),pipeD:rgb('#5a6064'),valve:rgb('#6a2a22'),valveH:rgb('#a8483a'),
    frame:rgb('#4a4e4a'),bar:rgb('#1f2226'),frost:rgb('#b8c8d0'),frostH:rgb('#dce6ea'),wood:rgb('#8a6440'),woodL:rgb('#a87a4c'),woodD:rgb('#5e4228'),steel:rgb('#9aa2a8'),
    drel:rgb('#3e4e6e'),drelD:rgb('#2a3448'),towel:rgb('#e4e6e2'),towelD:rgb('#bcc0bc'),stripe:rgb('#8a3a2a'),alu:rgb('#a9b0b7'),soap:rgb('#c8b47a'),
    floor:rgb('#8e8a80'),floorD:rgb('#7a766c'),fgrout:rgb('#5e5a52'),puddle:rgb('#6e7a82'),drain:rgb('#2a2c2e'),drainD:rgb('#121416'),
    steam:rgb('#c8c8bc'),silh:rgb('#5e6e70'),silhD:rgb('#2e3a3c'),steamD:rgb('#c4cad0'),haze:rgb('#c4cad0'),
    rub:[rgb('#5e584a'),rgb('#4e4a3e'),rgb('#6a6454')],joint:rgb('#24221c'),lime:rgb('#8a8676'),stoneT:rgb('#726a58'),stoneD:rgb('#3e3a30'),slime:rgb('#24301e'),
    brick:[rgb('#3a2620'),rgb('#2e1e1a'),rgb('#44302a')],mortar:rgb('#221c18'),wetV:rgb('#4a4a42'),flag:[rgb('#4e4a42'),rgb('#46423b'),rgb('#3e3b35')],fjoint:rgb('#1c1a17'),wet:rgb('#2a2e2c'),
    grey:rgb('#4e5048'),greyH:rgb('#7a7c70'),scum:rgb('#8a8670'),zinc:rgb('#6e7270'),zincD:rgb('#4e5250'),zincH:rgb('#9a9e98'),woodK:rgb('#1a140e'),
    brass:rgb('#6a5428'),glass:rgb('#c8c8b0'),flame:rgb('#ffd890'),flameW:rgb('#fff8e0'),drop:rgb('#6e7268'),carbolic:rgb('#b0b47a'),
    towelHex:['#6e6c64','#8e8c84','#acaaa0'],towelHex2:['#7a6a52','#a8947a','#ccbca2'],slipHex:['#1a1c22','#2e3240','#4a5068']});
  state.bg=null; state.fans=null; resetBathScene();
}
