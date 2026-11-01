// Interior of the Rope & Anchor, the riverside pub on the Thames quay: a room of the port mode, entered by its street door.
// Owns the layout (single source of truth for every footprint), walking, collisions, camera, the static bake and depth order.
// The art lives in pub-shell.js (floor, walls, fireplace, light), pub-bar.js (counter, back bar, stools, stairs) and pub-tables.js.
import { state as rendererState, setFramebuffer } from './renderer.js';
import { state as appearanceState } from './appearance.js';
import { state as boxingState } from './boxing.js';
import { withPortView, portHero, contact } from './thames-port.js';
import { walkJoints } from './port-life.js';
import { pubShellStatic, pubShellProps, pubShellFX } from './pub-shell.js';
import { pubBarStatic, pubBarProps } from './pub-bar.js';
import { pubTablesStatic, pubTablesProps } from './pub-tables.js';
import { PUB } from './pub-layout.js';
export { PUB };

/** Walking margin round furniture and walls (half the body's width). */
const R=.24;
/** Seating round the dining tables: chairs and benches a diner pulls out (1 unit out from the long sides). */
function seatBoxes(){
  return PUB.dining.map(({box:[a,b,c,d],axis})=>axis==='j'?[a-.55,b,c+.55,d]:[a,b-.55,c,d+.55]);
}

/** Runtime values owned by the pub. */
export const state={inside:false,i:12,j:5.75,fi:-1,fj:0,ph:0,moving:false,cy:48,bake:/** @type {Uint32Array|null} */(null)};

/** Whether the port player is inside the pub. */
export function pubInside(){ return state.inside; }
/** Step in through the street door. */
export function enterPub(){ Object.assign(state,{inside:true,i:12.05,j:(PUB.door.j0+PUB.door.j1)/2,fi:-1,fj:0,ph:0,moving:false}); follow(true); }
/** Leave the room (the port puts its player back on the quay). */
export function leavePub(){ state.inside=false; }
/** Forget the baked room: call after changing anything static. */
export function invalidatePub(){ state.bake=null; }

const inBox=(/** @type {number} */i,/** @type {number} */j,/** @type {number[]} */b,m=R)=>i>b[0]-m&&i<b[2]+m&&j>b[1]-m&&j<b[3]+m;
/** Whether a body centred on (i,j) would hit a wall or a piece of furniture. */
export function pubBlocked(i,j){
  const P=PUB, D=P.door, atDoor=j>D.j0+R&&j<D.j1-R;
  if(i<R||j<R||j>P.J-R||i>(atDoor?P.I+.1:P.I-R)) return true;
  if(inBox(i,j,[0,P.fire.j0,.55,P.fire.j1])) return true;
  for(const b of [P.piano.box,P.stairs.box,P.counter.box,P.ret.box,P.backbar.box,P.servery,P.clock.box,...seatBoxes()]) if(inBox(i,j,b)) return true;
  if(P.stools.some(([si,sj])=>Math.hypot(i-si,j-sj)<P.stoolR+R)) return true;
  if(P.standing.some(s=>Math.hypot(i-s.i,j-s.j)<s.r+R)) return true;
  return [P.coatStand,P.pianoStool].some(c=>Math.hypot(i-c.i,j-c.j)<c.r+R);
}

/** Walk one tick; dx,dy are the held screen directions. Returns 'exit' when the player walks out of the street door. */
export function pubTick(/** @type {number} */dx,/** @type {number} */dy){
  state.moving=!!(dx||dy);
  if(state.moving){
    const len=Math.hypot(dx+dy,dy-dx), di=(dx+dy)/len, dj=(dy-dx)/len, v=.065, oi=state.i, oj=state.j;
    if(!pubBlocked(oi+di*v,oj)) state.i=oi+di*v;
    if(!pubBlocked(state.i,oj+dj*v)) state.j=oj+dj*v;
    state.moving=state.i!==oi||state.j!==oj; state.fi=di; state.fj=dj; state.ph+=.045;
    if(state.i>PUB.I-.05) return 'exit';
  }
  follow(false);
}
/** Camera height: the room is 432 px wide (fits exactly) and pans vertically; even values keep the bake aligned to whole pixels. */
const CX=138, CY_TOP=76, CY_BOTTOM=46;
function follow(/** @type {boolean} */snap){
  const want=Math.max(CY_BOTTOM,Math.min(CY_TOP,128-(state.i+state.j)*6));
  state.cy=snap?want:state.cy+(want-state.cy)*.08;
}

/**
 * A prop drawn each frame in depth order: box is its floor footprint [i0,j0,i1,j1], draw paints it.
 * @typedef {{box:number[],draw:()=>void}} PubProp
 */
/** Whether a must be drawn before (behind) b: decided along the axis on which their footprints are apart. */
function behind(/** @type {number[]} */a,/** @type {number[]} */b){
  const sepI=a[2]<=b[0]?-1:b[2]<=a[0]?1:0, sepJ=a[3]<=b[1]?-1:b[3]<=a[1]?1:0;
  if(sepI&&!sepJ) return sepI<0;
  if(sepJ&&!sepI) return sepJ<0;
  return a[0]+a[2]+a[1]+a[3]<b[0]+b[2]+b[1]+b[3];
}
/** Order props back to front: a topological sort on "behind", ties by depth (i+j); cycles fall back to depth. @param {PubProp[]} L */
export function depthOrder(L){
  const n=L.length, key=L.map(p=>p.box[0]+p.box[2]+p.box[1]+p.box[3]), ins=new Array(n).fill(0), out=L.map(()=>/** @type {number[]} */([]));
  for(let a=0;a<n;a++) for(let b=a+1;b<n;b++){ if(behind(L[a].box,L[b].box)){ out[a].push(b); ins[b]++; } else { out[b].push(a); ins[a]++; } }
  const done=new Array(n).fill(false), order=[];
  for(let k=0;k<n;k++){
    let best=-1; for(let a=0;a<n;a++) if(!done[a]&&ins[a]===0&&(best<0||key[a]<key[best])) best=a;
    if(best<0) for(let a=0;a<n;a++) if(!done[a]&&(best<0||key[a]<key[best])) best=a;
    done[best]=true; order.push(L[best]); for(const b of out[best]) ins[b]--;
  }
  return order;
}

/** Bake the whole room's static layers once into a 432×(room height) buffer. */
const BW=432, BH=Math.ceil((CY_TOP-CY_BOTTOM)*1.5)+288;
function bake(){
  const A=appearanceState, buf=new Uint32Array(BW*BH), oldW=A.W, oldH=A.H, previous=setFramebuffer(buf);
  A.W=BW; A.H=BH;
  try{ withPortView(CX,CY_TOP,()=>{ pubShellStatic(); pubBarStatic(); pubTablesStatic(); }); }
  finally{ A.W=oldW; A.H=oldH; setFramebuffer(previous); }
  return buf;
}

/** The pub frame (inside withHD, at the native 432×288). */
export function renderPub(){
  const t=boxingState.tick, fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H;
  if(!state.bake) state.bake=bake();
  const cy=2*Math.round(state.cy/2), off=(CY_TOP-cy)*1.5;
  fb.set(state.bake.subarray(off*BW,off*BW+W*H));
  withPortView(CX,cy,()=>{
    const hero=state, side=hero.fi-hero.fj>=0?1:-1, g=hero.moving?hero.ph%1:.25;
    /** @type {PubProp[]} */
    const props=[...pubShellProps(t),...pubBarProps(t),...pubTablesProps(t),
      {box:[hero.i-.22,hero.j-.22,hero.i+.22,hero.j+.22],draw:()=>{ contact(hero.i-.22,hero.j-.22,hero.i+.22,hero.j+.22,0,.45); portHero(hero,walkJoints(g,false,side)); }}];
    for(const p of depthOrder(props)) p.draw();
    pubShellFX(t);
  });
}
