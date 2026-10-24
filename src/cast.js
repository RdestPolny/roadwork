/* Cast: extra people drawn with the boxer skeleton (drawBoxer) outside the fights — the crowd in
   the canteen, the arm wrestlers. Each figure keeps its own palette snapshot (look + clothes); a pose sets the joints
   in the right-facing local frame with the feet on FLOOR_Y; drawFig draws it into a scratch buffer and blits it
   (mirrored, shifted, dimmed or tinted) onto a target buffer. */

import { state as boxingState, drawBoxer, ik } from './boxing.js';
import { state as appearanceState, setRamp, applyLook } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as npcsState } from './npcs.js';
import { state as sparringState } from './sparring.js';

// Runtime values owned by cast; initialized explicitly by main.js.
export const state = {};

/**
 * Snapshot of a figure's palette: look (skin, hair, face) and clothes (three-tone ramps).
 * `trunk` colours the towel / trunks (drawn when the outfit shows them, e.g. in the bath).
 * @param {Record<string,string>} look @param {string[]} [top] @param {string[]} [pant] @param {string[]} [shoe] @param {string[]} [trunk]
 */
export function makeFig(look,top,pant,shoe,trunk){
  const A=appearanceState, keep=A.PAL.slice(), keepLk={...A.lk};
  top=top||npcsState.CN_TOP; pant=pant||npcsState.CN_PANT; shoe=shoe||sparringState.PRIS_SHOE;
  applyLook(look);
  setRamp(A.R_SHIRT,top,false); setRamp(A.R_SHIRTF,top,true); setRamp(A.R_PANT,pant,false); setRamp(A.R_PANTF,pant,true);
  setRamp(A.R_BOOT,shoe,false); setRamp(A.R_BOOTF,shoe,true); setRamp(A.R_BTR,sparringState.PRIS_SOLE,false); setRamp(A.R_BTRF,sparringState.PRIS_SOLE,true);
  if(trunk){ setRamp(A.R_TRUNK,trunk,false); setRamp(A.R_TRUNKF,trunk,true); setRamp(A.R_TT,trunk,false); setRamp(A.R_TTF,trunk,true); }
  const fig={pal:A.PAL.slice(),lk:{...A.lk}};
  A.PAL.set(keep); Object.assign(A.lk,keepLk);
  return fig;
}

/** A redder copy of a figure (strain, anger): the skin ramps pushed towards blood red. @param {any} fig @param {number} k 0..1 */
export function flushed(fig,k){
  const A=appearanceState, pal=fig.pal.slice();
  for(const slot of [A.R_SKIN,A.R_SKINF,A.R_SKX,A.R_SKXF]) for(let j=0;j<3;j++){ const i=slot*3+j, c=pal[i]; pal[i]=mix(c,(0xff000000|(0x28<<16)|(0x30<<8)|0xd8)>>>0,k*(j===0?0.5:0.38)); }
  return {pal,lk:fig.lk};
}

/** A prison look from a seed (skins, greying hair, short cuts, stubble). @param {number} seed */
export function inmateLook(seed){
  const r=(/** @type {number} */ k)=>((Math.imul(seed*2654435761+k*40503,0x9e3779b1)>>>16)&0xffff)/65536;
  const pick=(/** @type {string[]} */ a,/** @type {number} */ k)=>a[Math.floor(r(k)*a.length)];
  return {skin:pick(['s1','s1','s2','s2','s3','s4','s5'],1),hair:pick(['h1','h1','h2','h2','h3','h4','h6','h6'],2),style:pick(['short','buzz','buzz','bald','short'],3),
    eyes:pick(['normal','narrow','narrow','wide'],4),brows:pick(['normal','thick','angry'],5),nose:pick(['straight','broken','small','broken'],6),
    facial:pick(['none','stubble','stubble','mustache','beard','goatee'],7),extra:pick(['none','none','none','scar','tape'],8)};
}

/**
 * Pose the skeleton (right-facing local frame; the feet on FLOOR_Y).
 * near/far = hand targets (IK through the elbows) unless nearE/farE fix the elbows; feet = [near x, far x].
 * @param {{x:number,squat?:number,lean?:number,rise?:number,bob?:number,near:number[],far:number[],nearE?:number[],farE?:number[],feet:number[],lift?:number[],headDx?:number,headDy?:number}} o
 */
export function pose(o){
  const B=boxingState, A=appearanceState, fy=A.FLOOR_Y, squat=o.squat??0.12, lean=o.lean??0;
  B.hipX=Math.round(o.x); B.hipY=Math.round(A.HIP_Y0+1+squat*9-(o.rise||0)-4-(o.bob||0));
  B.sx=Math.round(o.x+lean); B.sy=B.hipY-A.TORSO; B.torsoX=B.hipX;
  B.lsx=B.sx+1; B.lsy=B.sy+1; B.rsx=B.sx-1; B.rsy=B.sy+1;
  B.headX=B.sx+2+Math.round(lean*0.3)+(o.headDx||0); B.headY=B.sy-6+(o.headDy||0);
  if(o.nearE){ B.rex=Math.round(o.nearE[0]); B.rey=Math.round(o.nearE[1]); B.rgx=Math.round(o.near[0]); B.rgy=Math.round(o.near[1]); }
  else { ik(B.rsx,B.rsy,o.near[0],o.near[1],A.UPPER,A.FORE,1); B.rex=Math.round(B.IKx); B.rey=Math.round(B.IKy); B.rgx=Math.round(B.IKtx); B.rgy=Math.round(B.IKty); }
  if(o.farE){ B.lex=Math.round(o.farE[0]); B.ley=Math.round(o.farE[1]); B.lgx=Math.round(o.far[0]); B.lgy=Math.round(o.far[1]); }
  else { ik(B.lsx,B.lsy,o.far[0],o.far[1],A.UPPER,A.FORE,1); B.lex=Math.round(B.IKx); B.ley=Math.round(B.IKy); B.lgx=Math.round(B.IKtx); B.lgy=Math.round(B.IKty); }
  const lN=(o.lift&&o.lift[0])||0, lF=(o.lift&&o.lift[1])||0, tipN=lN>1.5?1:0, tipF=lF>1.5?1:0;
  B.lax=Math.round(o.feet[1]); B.lay=Math.round(fy-3-lF); B.rax=Math.round(o.feet[0]); B.ray=Math.round(fy-3-lN);
  B.lhx=B.hipX+1; B.lhy=B.hipY; B.rhx=B.hipX-1; B.rhy=B.hipY;
  ik(B.lhx,B.lhy,B.lax,B.lay,A.THIGH,A.SHIN,-1); B.lkx=Math.round(B.IKx); B.lky=Math.round(B.IKy);
  ik(B.rhx,B.rhy,B.rax,B.ray,A.THIGH,A.SHIN,-1); B.rkx=Math.round(B.IKx); B.rky=Math.round(B.IKy);
  B.ltx=B.lax+4; B.lty=Math.round(fy-1-lF+tipF); B.lhex=B.lax-1; B.lhey=Math.round(fy-1-lF-tipF);
  B.rtx=B.rax+4; B.rty=Math.round(fy-1-lN+tipN); B.rhex=B.rax-1; B.rhey=Math.round(fy-1-lN-tipN);
  B.shDirX=0; B.shDirY=1;
}

/**
 * Draw a posed figure. `mid` draws between the body and the near arm (a held tool), `top` after the whole body
 * (caps, things in front). Coordinates inside the hooks are local (right-facing, unshifted).
 * @param {any} fig
 * `scale` < 1 shrinks the figure around its feet (people further away).
 * @param {{into?:Uint32Array,mirror?:boolean,dx?:number,dy?:number,mid?:()=>void,top?:()=>void,dim?:number,tint?:number,tintK?:number,clipY?:number,scale?:number}} o
 */
export function drawFig(fig,o){
  const A=appearanceState, keep=A.PAL.slice(), keepLk={...A.lk}, keepBt=A.btStyle, keepTr=A.trStyle, keepFb=rendererState.fb;
  A.PAL.set(fig.pal); Object.assign(A.lk,fig.lk); A.btStyle='low'; A.trStyle='plain';
  const F=state.FB; F.fill(0); rendererState.fb=F;
  boxingState.workMidHook=o.mid||null;
  drawBoxer();
  boxingState.workMidHook=null;
  if(o.top) o.top();
  rendererState.fb=keepFb;
  A.PAL.set(keep); Object.assign(A.lk,keepLk); A.btStyle=keepBt; A.trStyle=keepTr;
  const w=A.W, h=A.H, dx=Math.round(o.dx||0), dy=Math.round(o.dy||0), M=o.into||rendererState.FB_MAIN, dim=o.dim||0, tk=o.tintK||0, clip=o.clipY??h;
  const sc=o.scale||1;
  if(sc!==1){ const ax=boxingState.hipX, ay=A.FLOOR_Y, wax=(o.mirror?w-1-ax:ax)+dx, way=ay+dy;
    for(let ty=0;ty<Math.min(h,clip);ty++){ const sy=Math.round(ay+(ty-way)/sc); if(sy<0||sy>=h) continue;
      for(let tx=0;tx<w;tx++){ const lx=Math.round(ax+(tx-wax)/sc*(o.mirror?-1:1)); if(lx<0||lx>=w) continue; let c=F[sy*w+lx]; if(!c) continue;
        if(tk) c=mix(c,/** @type {number} */ (o.tint),tk); if(dim) c=darken(c,dim); M[ty*w+tx]=c; } }
    return; }
  for(let y=0;y<h;y++){ const ty=y+dy; if(ty<0||ty>=h||ty>=clip) continue; const r=y*w, tr=ty*w;
    for(let x=0;x<w;x++){ let c=F[r+x]; if(!c) continue; const tx=(o.mirror?w-1-x:x)+dx; if(tx<0||tx>=w) continue;
      if(tk) c=mix(c,/** @type {number} */ (o.tint),tk); if(dim) c=darken(c,dim); M[tr+tx]=c; } }
}

/** @param {number} c @param {number} k 0..1 */
function darken(c,k){ const m=1-k; return (0xff000000|((((c>>16)&255)*m)<<16)|((((c>>8)&255)*m)<<8)|((c&255)*m))>>>0; }
/** @param {number} c @param {number} t @param {number} k 0..1 */
export function mix(c,t,k){ const ch=(/** @type {number} */ s)=>Math.round(((c>>s)&255)*(1-k)+((t>>s)&255)*k); return (0xff000000|(ch(16)<<16)|(ch(8)<<8)|ch(0))>>>0; }

const JOINTS=['hipX','hipY','sx','sy','torsoX','lsx','lsy','rsx','rsy','headX','headY','rex','rey','rgx','rgy','lex','ley','lgx','lgy','lax','lay','rax','ray','lhx','lhy','rhx','rhy','lkx','lky','rkx','rky','ltx','lty','lhex','lhey','rtx','rty','rhex','rhey','shDirX','shDirY','IKx','IKy','IKtx','IKty'];
/** The fight owns the skeleton fields: keep them around extra figures drawn during a fight. */
export function saveJoints(){ const B=/** @type {any} */ (boxingState); return JOINTS.map(k=>B[k]); }
/** @param {any[]} v */
export function restoreJoints(v){ const B=/** @type {any} */ (boxingState); JOINTS.forEach((k,i)=>{ B[k]=v[i]; }); }


export function initialize(){
  state.FB=new Uint32Array(appearanceState.W*appearanceState.H);
}
