// The dark East End alley: a walk-only sub-mode of the Thames port, built like the pub interior (src/pub.js).
// Owns state, walking, collisions, camera, the static bake and depth order. Layout: alley-layout.js (single source of truth).
// Art lives in alley-shell.js (cobbles, tenement wall, gate), alley-props.js (clutter, lamp posts) and alley-fx.js (fog, glow, drips).
import { state as rendererState, setFramebuffer } from './renderer.js';
import { state as appearanceState } from './appearance.js';
import { state as boxingState } from './boxing.js';
import { withPortView, portHero, contact } from './thames-port.js';
import { walkJoints } from './port-life.js';
import { depthOrder } from './pub.js';
import { alleyShellStatic, alleyShellProps } from './alley-shell.js';
import { alleyPropsStatic, alleyProps } from './alley-props.js';
import { alleyFX, alleyFXGround } from './alley-fx.js';
import { alleyRats, resetAlleyRats } from './alley-rats.js';
import { ALLEY } from './alley-layout.js';
export { ALLEY };

/** Walking margin round solids and walls (half the body's width). */
const R=.24;

/** Runtime values owned by the alley. */
export const state={inside:false,i:ALLEY.hero.i,j:ALLEY.hero.j,fi:ALLEY.hero.fi,fj:ALLEY.hero.fj,ph:0,moving:false,cy:48,ox:0,bake:/** @type {Uint32Array|null} */(null)};

/** Whether the port player is in the alley. */
export function alleyInside(){ return state.inside; }
/** Step into the alley at its street mouth, facing the blind end. */
export function enterAlley(){ const h=ALLEY.hero; Object.assign(state,{inside:true,i:h.i,j:h.j,fi:h.fi,fj:h.fj,ph:0,moving:false}); resetAlleyRats(); follow(true); }
/** Debug/art capture: stand the player at (i,j) and snap the camera to him. */
export function alleyPlace(/** @type {number} */i,/** @type {number} */j){ state.i=i; state.j=j; follow(true); }
/** Leave the alley (the port puts its player back on the quay). */
export function leaveAlley(){ state.inside=false; }
/** Forget the baked alley: call after changing anything static. */
export function invalidateAlley(){ state.bake=null; }

const inBox=(/** @type {number} */i,/** @type {number} */j,/** @type {number[]} */b,m=R)=>i>b[0]-m&&i<b[2]+m&&j>b[1]-m&&j<b[3]+m;
/** Footprints that stop the player (walkable mats and grates carry solid:false; the arch is not a box at all). */
const SOLIDS=ALLEY.boxes.filter(b=>b.solid!==false).map(b=>b.box);
/** Whether a body centred on (i,j) would hit a wall or a solid prop. */
export function alleyBlocked(/** @type {number} */i,/** @type {number} */j){
  const X=ALLEY.exit, atMouth=j>X.j0+R&&j<X.j1-R;
  if(i<R||j<R||j>ALLEY.J-R||i>(atMouth?ALLEY.I+.1:ALLEY.I-R)) return true;
  return SOLIDS.some(b=>inBox(i,j,b));
}

/** Walk one tick; dx,dy are the held screen directions. Returns 'exit' when the player walks out of the street mouth. */
export function alleyTick(/** @type {number} */dx,/** @type {number} */dy){
  state.moving=!!(dx||dy);
  if(state.moving){
    const len=Math.hypot(dx+dy,dy-dx), di=(dx+dy)/len, dj=(dy-dx)/len, v=.065, oi=state.i, oj=state.j;
    if(!alleyBlocked(oi+di*v,oj)) state.i=oi+di*v;
    if(!alleyBlocked(state.i,oj+dj*v)) state.j=oj+dj*v;
    state.moving=state.i!==oi||state.j!==oj; state.fi=di; state.fj=dj; state.ph+=.045;
    if(state.i>ALLEY.I-.05) return 'exit';
  }
  follow(false);
}

/** Camera: the alley is far wider and taller than the 432×288 frame (it is long on the screen's diagonal), so it pans both ways after the player.
 * CX is the bake's origin (2× units, a multiple of 2 so ×1.5 lands on whole native pixels); ox (native px, multiples of 3) and cy (even) pick the window. */
const CX=2*Math.ceil(6*ALLEY.J), CY_TOP=2*ALLEY.H, CY_BOTTOM=2*Math.floor((192-6*(ALLEY.I+ALLEY.J))/2), OX_MAX=Math.max(0,Math.ceil(1.5*(CX+12*ALLEY.I))-432);
function follow(/** @type {boolean} */snap, i=state.i, j=state.j){
  const want=Math.max(CY_BOTTOM,Math.min(CY_TOP,128-(i+j)*6)), wx=Math.max(0,Math.min(OX_MAX,1.5*(CX+12*(i-j))-216));
  state.cy=snap?want:state.cy+(want-state.cy)*.08; state.ox=snap?wx:state.ox+(wx-state.ox)*.08;
}

/** Bake the whole alley's static layers once into a buffer the size of its picture (about 1.7 MB: no need to cut it into segments). */
const BW=432+OX_MAX, BH=Math.ceil((CY_TOP-CY_BOTTOM)*1.5)+288;
function bake(){
  const A=appearanceState, buf=new Uint32Array(BW*BH), oldW=A.W, oldH=A.H, previous=setFramebuffer(buf);
  A.W=BW; A.H=BH;
  try{ withPortView(CX,CY_TOP,()=>{ alleyShellStatic(); alleyPropsStatic(); }); }
  finally{ A.W=oldW; A.H=oldH; setFramebuffer(previous); }
  return buf;
}

/** Run fn in the alley's camera (the same window the frame is copied from). */
export function withAlleyCamera(/** @type {()=>any} */fn){
  const cy=2*Math.round(state.cy/2), ox=3*Math.round(state.ox/3);
  return withPortView(CX-ox/1.5,cy,fn);
}

/** Prepare the alley before its camera is installed. */
export function prepareAlley(){ if(!state.bake) state.bake=bake(); }

/** The alley frame (inside withHD, at the native 432×288). */
export function renderAlley(){
  const t=boxingState.tick, fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H;
  prepareAlley();
  const cy=2*Math.round(state.cy/2), oy=(CY_TOP-cy)*1.5, ox=3*Math.round(state.ox/3), B=/** @type {Uint32Array} */(state.bake);
  for(let y=0;y<H;y++) fb.set(B.subarray((oy+y)*BW+ox,(oy+y)*BW+ox+W),y*W);
  withAlleyCamera(()=>{
    alleyFXGround(t);   // puddles lie on the floor: under the props and the hero
    const hero=state, side=hero.fi-hero.fj>=0?1:-1, g=hero.moving?hero.ph%1:.25;
    const actors=[{box:[hero.i-.22,hero.j-.22,hero.i+.22,hero.j+.22],draw:()=>{ contact(hero.i-.22,hero.j-.22,hero.i+.22,hero.j+.22,0,.45); portHero(hero,walkJoints(g,false,side)); }}];
    for(const p of depthOrder([...alleyShellProps(t),...alleyProps(t),...alleyRats(t,hero),...actors])) p.draw();
    alleyFX(t);
  });
}
