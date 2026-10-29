import { state as appearanceState } from './appearance.js';
import { renderArm, renderArmHD } from './armwrestle.js';
import { drawProfShadow } from './profesor.js';
import { state as gymState, renderHub } from './gym.js';
import { state as progressionState } from './progression.js';
import { state as boxingState, drawParticles, drawBoxer, drawPopups } from './boxing.js';
import { renderSpar } from './sparring.js';
import { renderWork } from './work.js';
import { state as pushupsState, drawPushupMeter, drawPushupAtmos, drawPushupBody } from './pushups.js';
import { renderPullup } from './pullups.js';
import { renderRoaches } from './roaches.js';
import { crankFrame, renderCrank } from './crank.js';
import { renderIsoFight, state as isoFightState } from './iso-fight.js';
import { renderThamesPort } from './thames-port.js';
import { collodionFrame } from './collodion.js';

// Runtime values owned by renderer; initialized explicitly by main.js.
export const state = {};

/** Standard Newgate rooms are rendered at 288×192; the Ward uses 432×288. */
export const HD_K = 2;
// Close framing keeps the crank, hands and upper body between the labour HUD panels.
const CRANK_VIEW={x:94,y:76,w:116,h:78};
/** Is a high-resolution room on screen now? */
export function hubHD(){ return (boxingState.gstate==='hub'||boxingState.gstate==='menu')&&hdRoom(); }
/** Is the current hub room one of the 2× rooms (for baking its background and sprites)? */
export function hdRoom(){ return gymState.hubRoom==='cell'||gymState.hubRoom==='yard'||gymState.hubRoom==='laznia'; }

/** Select the existing independent framebuffer for the current room. */
export function roomFrame(){ return gymState.hubRoom==='cell'?state.hd3:state.hd; }

/** Run fn with a high-resolution framebuffer: picture size, buffers, background, projection and text scale.
 * Everything is restored afterwards, so the rest of the game never sees the large frame. @template T @param {()=>T} fn @returns {T} */
export function withHD(fn, frame=state.hd){
  if(state.inHD) return fn();
  const A=appearanceState, H=frame, K=H.W/A.W, keep={W:A.W,H:A.H,FB:state.FB_MAIN,fb:state.fb,img:state.img,off:state.off,octx:state.octx,scale:state.scale,ox:state.ox,oy:state.oy,bg:gymState.bgHub};
  A.W=H.W; A.H=H.H; state.FB_MAIN=H.fb; if(keep.fb===keep.FB) state.fb=H.fb; state.img=H.img; state.off=H.off; state.octx=H.octx;
  state.scale=H.scale; state.ox=H.ox; state.oy=H.oy; gymState.bgHub=H.bg; gymState.ISO_K=K; state.uiK=K; state.inHD=true;
  try{ return fn(); }
  finally{ A.W=keep.W; A.H=keep.H; state.FB_MAIN=keep.FB; state.fb=keep.fb; state.img=keep.img; state.off=keep.off; state.octx=keep.octx;
    state.scale=keep.scale; state.ox=keep.ox; state.oy=keep.oy; gymState.bgHub=keep.bg; gymState.ISO_K=1; state.uiK=1; state.inHD=false; }
}

/** A native-resolution point of the picture on the screen, in device pixels (the 2× room is mapped through its own scale).
 * @param {number} x @param {number} y @returns {[number,number]} */
export function viewToScreen(x,y){ return [state.vx+x*state.vs,state.vy+y*state.vs]; }
/** A screen point (device pixels) back to native picture coordinates. @param {number} px @param {number} py @returns {[number,number]} */
export function screenToView(px,py){ return [(px-state.vx)/state.vs,(py-state.vy)/state.vs]; }

/** Select a drawing buffer and return the previous one for scoped offscreen rendering. */
export function setFramebuffer(buffer){ const previous=state.fb; state.fb=buffer; return previous; }

/** Aim the cel shading of tapered shapes at a light (a screen-space direction towards it); returns the previous direction.
 * @param {number} lx @param {number} ly @returns {[number,number]} */
export function setLightVec(lx,ly){ const prev=/** @type {[number,number]} */ ([state.LX,state.LY]); state.LX=lx; state.LY=ly; return prev; }

export function pset(x,y,c){ if(x<0||y<0||x>=appearanceState.W||y>=appearanceState.H) return; state.fb[y*appearanceState.W+x]=c; }

export function line(x0,y0,x1,y1,c1,c2){
  x0|=0;y0|=0;x1|=0;y1|=0;
  const dx=Math.abs(x1-x0), sx=x0<x1?1:-1, dy=-Math.abs(y1-y0), sy=y0<y1?1:-1;
  let err=dx+dy, n=0;
  for(;;){ pset(x0,y0,(n++&1)?c2:c1); if(x0===x1&&y0===y1)break; const e2=2*err; if(e2>=dy){err+=dy;x0+=sx;} if(e2<=dx){err+=dx;y0+=sy;} }
}

export // true while drawing parts that overlap the body (near arm, head): inner contours become skin-shadow, not black
function isSkinPx(c){ return c===appearanceState.PAL[appearanceState.R_SKX*3]||c===appearanceState.PAL[appearanceState.R_SKX*3+1]||c===appearanceState.PAL[appearanceState.R_SKX*3+2]||c===appearanceState.PAL[appearanceState.R_SKIN*3]||c===appearanceState.PAL[appearanceState.R_SKIN*3+1]||c===appearanceState.PAL[appearanceState.R_SKIN*3+2]||c===appearanceState.PAL[appearanceState.R_SKINF*3]||c===appearanceState.PAL[appearanceState.R_SKINF*3+1]||c===appearanceState.PAL[appearanceState.R_SKINF*3+2]; }

export function taper(x0,y0,r0,x1,y1,r1,pass,rp,rp2,z1,z2,rp3,bl){
  bl=bl||0;   // muscle belly: radius swells by bl at the middle of the segment
  if(pass===0){r0+=1;r1+=1;}
  const rm=(r0>r1?r0:r1)+bl;
  let minx=Math.floor((x0<x1?x0:x1)-rm), maxx=Math.ceil((x0>x1?x0:x1)+rm);
  let miny=Math.floor((y0<y1?y0:y1)-rm), maxy=Math.ceil((y0>y1?y0:y1)+rm);
  if(minx<0)minx=0; if(miny<0)miny=0; if(maxx>appearanceState.W-1)maxx=appearanceState.W-1; if(maxy>appearanceState.H-1)maxy=appearanceState.H-1;
  const dx=x1-x0, dy=y1-y0, l2=dx*dx+dy*dy, inv=l2>0?1/l2:0;
  for(let y=miny;y<=maxy;y++){
    let i=y*appearanceState.W+minx;
    for(let x=minx;x<=maxx;x++,i++){
      const tr=((x-x0)*dx+(y-y0)*dy)*inv;
      const t=tr<0?0:(tr>1?1:tr);
      const ex=x-(x0+dx*t), ey=y-(y0+dy*t);
      const r=r0+(r1-r0)*t+bl*4*t*(1-t);
      if(ex*ex+ey*ey>r*r) continue;
      if(pass===0){state.fb[i]=(state.softOutline&&isSkinPx(state.fb[i]))?appearanceState.PAL[appearanceState.R_SKIN*3]:appearanceState.C_OUT;continue;}
      const ramp=tr<z1?rp2:(tr<z2?rp3:rp);
      const k=(ex*state.LX+ey*state.LY)/(r>0.5?r:0.5);
      const side=(Math.abs(state.LX)-0.42)*0.10, hi=0.34-side, sh=-0.4+side;   // light from further aside narrows the cel bands; unchanged at the default light
      state.fb[i]=appearanceState.PAL[ramp*3+(k>hi?2:(k<sh?0:1))];
    }
  }
}

export function disc(x,y,r,pass,rp){ taper(x,y,r,x,y,r,pass,rp,0,-9,-9,0); }

/** Zoom the finished frame around (cx,cy) by z: the hub's walk-in / walk-out transition. @param {number} z @param {number} cx @param {number} cy */
export function zoomBlit(z,cx,cy){
  const W=appearanceState.W, H=appearanceState.H, N=W*H;   // the 2× rooms zoom too: scratch buffers follow the picture size
  if(state.zbBuf?.length!==N){ state.zbBuf=new Uint32Array(N); state.zbCol=new Int16Array(W); state.zbRow=new Int16Array(H); }
  const ALT=state.zbBuf; ALT.set(state.FB_MAIN);
  const x0=cx-W/(2*z), y0=cy-H/(2*z);
  for(let x=0;x<W;x++){ const v=Math.floor(x0+x/z); state.zbCol[x]=v<0?0:(v>W-1?W-1:v); }
  for(let y=0;y<H;y++){ const v=Math.floor(y0+y/z); state.zbRow[y]=v<0?0:(v>H-1?H-1:v); }
  for(let y=0;y<H;y++){ const r=state.zbRow[y]*W, o=y*W; for(let x=0;x<W;x++) state.FB_MAIN[o+x]=ALT[r+state.zbCol[x]]; }
}

export function shadowEll(cx,cy,rx,ry){
  rx*=state.uiK; ry*=state.uiK;   // the 2× room: the same shadow, twice the pixels
  const rx2=rx*rx, ry2=(ry+0.5)*(ry+0.5);
  for(let y=-ry;y<=ry;y++)for(let x=-rx;x<=rx;x++){
    const q=(x*x)/rx2+(y*y)/ry2; if(q>1)continue;
    if(!(y===0&&q<=0.8)&&!(state.uiK>1&&q<0.55)&&((x+y+cx)&1))continue;   // 2×: a solid core, dithered rim
    pset(cx+x,cy+y,appearanceState.C_SHADOW);
  }
}

/** Where the picture lands on the screen: left, top and the size of a native pixel, in device pixels. @returns {number[]} */
function viewRect(){
  if(boxingState.gstate==='crank'){
    const d=window.devicePixelRatio||1, w=state.screen.width,h=state.screen.height,short=h/d<500;
    const top=(short?72:110)*d,bottom=(short?110:180)*d;
    const v=CRANK_VIEW,scale=Math.max(.25,Math.min(w/v.w,(h-top-bottom)/v.h));
    return [Math.round((w-v.w*scale)/2-v.x*scale),Math.round(top+(h-top-bottom-v.h*scale)/2-v.y*scale),scale];
  }
  return [state.ox,state.oy,state.scale];
}

/** @param {boolean} face @param {boolean} [blit] false: only place the picture (another renderer paints it) */
function present(face,blit=true){
  const [rx,ry,rs]=viewRect();
  state.vx=rx; state.vy=ry; state.vs=rs*state.uiK;   // where a native pixel lands on the screen (mouse, bubbles, the card fight's rings)
  if(!blit) return;
  const hub=boxingState.gstate==='hub'||boxingState.gstate==='menu', f=hub?Math.max(gymState.hubFade,gymState.fadeInT/14):0;   // the room fade belongs to the hub only (a minigame can start mid-fade)
  if(f>0){ const k=Math.max(0,Math.min(256,(256*(1-f))|0)); for(let i=0;i<appearanceState.W*appearanceState.H;i++){ const c=state.FB_MAIN[i]; state.FB_MAIN[i]=(0xff000000|((((c>>16)&255)*k>>8)<<16)|((((c>>8)&255)*k>>8)<<8)|((c&255)*k>>8))>>>0; } }
  state.sctx.fillStyle='#000'; state.sctx.fillRect(0,0,state.screen.width,state.screen.height);
  const v=boxingState.gstate==='crank'?CRANK_VIEW:{x:0,y:0,w:appearanceState.W,h:appearanceState.H}, dx=rx+(v.x+boxingState.shX)*rs, dy=ry+(v.y+boxingState.shY)*rs;
  const print=collodionFrame(state.img,[v.x,v.y,v.w,v.h],Math.round(v.w*rs),Math.round(v.h*rs));   // the wet-plate look, when it is on
  if(print){ state.sctx.drawImage(print,dx,dy); return; }
  state.octx.putImageData(state.img,0,0);
  state.sctx.drawImage(state.off,v.x,v.y,v.w,v.h,dx,dy,v.w*rs,v.h*rs);
}

export function render(){
  if(boxingState.gstate==='port'){ withHD(()=>{ renderThamesPort(); present(false); }); return; }
  if(boxingState.gstate==='crank'){ crankFrame(); withHD(()=>{ renderCrank(); present(false); }); return; }
  if(boxingState.gstate==='hub'||boxingState.gstate==='menu'){ if(hubHD()) withHD(()=>{ renderHub(); present(false); },roomFrame()); else { renderHub(); present(false); } return; }
  if(boxingState.gstate==='isofight'){ withHD(()=>{ renderIsoFight(); present(false); },isoFightState.venue==='sandy'||isoFightState.venue==='cell'||isoFightState.venue==='canteen'?state.hd3:state.hd); return; }
  if(boxingState.gstate==='spar'){ renderSpar(); zoomBlit(1.2,72,49); drawProfShadow(); present(false); return; }
  if(boxingState.gstate==='pullup'){ renderPullup(); present(false); return; }
  if(boxingState.gstate==='roach'){ renderRoaches(); present(false); return; }
  if(boxingState.gstate==='work'){ renderWork(); present(false); return; }
  if(boxingState.gstate==='arm'){ renderArm(); withHD(()=>{ renderArmHD(); present(false); }); return; }   // arm wrestling: a close-up in the 2× frame
  if(boxingState.gstate!=='pushup') return;   // push-ups on the cell floor: the last side-view mode
  state.fb.set(Math.sin(boxingState.tick*0.035)>0.2?pushupsState.bgPUBreath:pushupsState.bgPU);
  drawPushupAtmos();
  drawParticles(true);
  drawPushupBody();
  drawParticles(false);
  zoomBlit(1.2,72,49);
  drawPushupMeter();
  drawPopups();
  present(true);
}

export function resize(){
  const dpr=window.devicePixelRatio||1, r=state.stage.getBoundingClientRect();
  state.screen.width=Math.max(1,Math.floor(r.width*dpr)); state.screen.height=Math.max(1,Math.floor(r.height*dpr));
  state.scale=Math.max(1,Math.floor(Math.min(state.screen.width/appearanceState.W,state.screen.height/appearanceState.H)));
  state.ox=(state.screen.width-appearanceState.W*state.scale)>>1; state.oy=(state.screen.height-appearanceState.H*state.scale)>>1;
  const H=state.hd; H.scale=Math.max(1,Math.floor(Math.min(state.screen.width/H.W,state.screen.height/H.H)));   // the 2× room: its own whole-pixel scale
  H.ox=(state.screen.width-H.W*H.scale)>>1; H.oy=(state.screen.height-H.H*H.scale)>>1;
   const T=state.hd3; T.scale=Math.max(1,Math.min(state.screen.width/T.W,state.screen.height/T.H)); // fractional nearest-neighbour scale fills the fixed 1280x800 stage
   T.ox=(state.screen.width-T.W*T.scale)>>1; T.oy=(state.screen.height-T.H*T.scale)>>1;
  state.sctx.imageSmoothingEnabled=false;
}

export function initialize(){


/* =====================================================================
   FRAMEBUFFER (software raster, zero-alloc per frame)
   ===================================================================== */
state.off = document.createElement('canvas');
 state.off.width=appearanceState.W;
 state.off.height=appearanceState.H;

state.octx = state.off.getContext('2d');

state.img = state.octx.createImageData(appearanceState.W,appearanceState.H);

state.FB_MAIN = new Uint32Array(state.img.data.buffer);

state.fb = state.FB_MAIN;   // render target (sparring draws each fighter into a spare buffer first)

state.stage = document.getElementById('stage');

state.screen = document.getElementById('screen');

state.sctx = state.screen.getContext('2d');

state.scale = 1;
state.ox = 0;
state.oy = 0;
state.vx = 0; state.vy = 0; state.vs = 1;
new ResizeObserver(()=>resize()).observe(state.stage);   // the card fight folds the top line away: the stage grows without a window resize
state.uiK = 1;
state.inHD = false;
{ // the 2× framebuffer for the yard, bath, port and arm wrestling
  const W=appearanceState.W*HD_K, H=appearanceState.H*HD_K, off=document.createElement('canvas'); off.width=W; off.height=H;
  const octx=/** @type {CanvasRenderingContext2D} */ (off.getContext('2d')), img=octx.createImageData(W,H);
  state.hd={W,H,off,octx,img,fb:new Uint32Array(img.data.buffer),bg:new Uint32Array(W*H),scale:1,ox:0,oy:0};
}

{ // Standalone 3x preview; never substitutes the production 2x room buffers.
   const W=appearanceState.W*3, H=appearanceState.H*3, off=document.createElement('canvas'); off.width=W; off.height=H;
   const octx=/** @type {CanvasRenderingContext2D} */ (off.getContext('2d')), img=octx.createImageData(W,H);
   state.hd3={W,H,off,octx,img,fb:new Uint32Array(img.data.buffer),bg:new Uint32Array(W*H),scale:1,ox:0,oy:0};
 }

 // light comes from above, slightly from the front
state.LX = 0.42;
state.LY = -0.91;

/* Tapered capsule. pass 0 = outline (radius+1, outline color), pass 1 = cel-shaded fill.
   Zones along the axis (t<z1 -> ramp2, t<z2 -> ramp3, else ramp) give trunks/waistband/trim. */
state.softOutline = false;
}
