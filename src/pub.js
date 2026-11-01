/* The Rope & Anchor: a small public room within the existing dockside footprint. */
import {rgb, state as appearanceState} from './appearance.js';
import {state as rendererState} from './renderer.js';
import {setPropCamera, quad, isoLineThin, isoBox, figureHD, withCellOutfit} from './gym.js';
import {walkJoints} from './port-life.js';
import {leavePubToPort} from './thames-port.js';
import {setPubPrompt} from './input.js';
import {state as boxingState} from './boxing.js';
import {drawPubShell} from './pub-shell-art.js';
import {drawPubBar} from './pub-bar-art.js';
import {drawPubFireplace, drawPubLamp} from './pub-fire-art.js';
import {pubFurnitureItems} from './pub-furniture-art.js';

const P={i:4.9,j:6.05,fi:0,fj:-1,ph:.25,moving:false}, keys=new Set();
const cam={x:200,y:79,ix:18,jx:-18,iy:9,jy:9,z:3,figureScale:3};
const c={void:rgb('#171411'),floor:rgb('#66503a'),floor2:rgb('#735a40'),seam:rgb('#433427'),wall:rgb('#75634d'),wall2:rgb('#60503e'),dark:rgb('#2a211a'),wood:rgb('#513625'),trim:rgb('#94724c'),bar:rgb('#34251c'),top:rgb('#805d3c'),stone:rgb('#746452'),soot:rgb('#221c18'),fire:rgb('#dc8034'),gold:rgb('#d2a666'),glass:rgb('#527066'),cool:rgb('#788581'),paper:rgb('#bcaa83')};
// Furniture footprints include a small margin for the figure's feet.
const obstacles=[[.02,.1,3,1.4],[3.05,.1,4.55,.75],[7.65,1.05,8.55,3.25],[1.1,2.25,2.45,3.35],[4.05,2.1,5.55,3.05],[6.35,4,7.25,4.8],[.1,4.2,.7,6.15],[5.13,6.18,5.65,6.72]];
/** Solid walls and furniture, expressed in the same ground units as the port. */
export function pubBlocked(i,j){ return i<.34||i>8.26||j<.34||j>6.56||obstacles.some(([a,b,d,e])=>i>a-.19&&i<d+.19&&j>b-.19&&j<e+.19); }
/** Reset only the temporary interior player; the port state stays with its owner. */
export function startPub(){Object.assign(P,{i:4.9,j:6.05,fi:0,fj:-1,ph:.25,moving:false});clearPubInput();setPubPrompt(true);}
/** Release motion when the game pauses or focus is lost. */
export function clearPubInput(){keys.clear();P.moving=false;}
/** Handle movement and the deliberate interaction at the entrance. */
export function pubKey(e,down){const code=e.code;if(code==='KeyE'){if(down&&!e.repeat&&Math.hypot(P.i-4.9,P.j-6.35)<.95){clearPubInput();setPubPrompt(false);leavePubToPort();}return true;}if(!['ArrowLeft','KeyA','ArrowRight','KeyD','ArrowUp','KeyW','ArrowDown','KeyS'].includes(code))return false;if(down)keys.add(code);else keys.delete(code);return true;}
/** Advance movement with independent axis collision for smooth corner sliding. */
export function tickPub(){const x=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA')),y=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));if(x||y){const n=Math.hypot(x+y,y-x),di=(x+y)/n,dj=(y-x)/n,oi=P.i,oj=P.j;if(!pubBlocked(P.i+di*.055,P.j))P.i+=di*.055;if(!pubBlocked(P.i,P.j+dj*.055))P.j+=dj*.055;P.moving=P.i!==oi||P.j!==oj;P.fi=di;P.fj=dj;if(P.moving)P.ph+=.045;}else P.moving=false;setPubPrompt(Math.hypot(P.i-4.9,P.j-6.35)<.95);}
/** Snapshot for debugging and integration tests. */
export function pubPlayer(){return {...P};}
/** Draw a world-space panel in the room. */
function panel(i0,j0,z0,i1,j1,z1,i2,j2,z2,i3,j3,z3,col){quad(i0,j0,z0,i1,j1,z1,i2,j2,z2,i3,j3,z3,()=>col);}
/** Short line in world coordinates. */
function ln(i,j,z,I,J,Z,col){isoLineThin(i,j,z,I,J,Z,col);}
/** Simple solid wooden furnishing. */
function box(a,b,d,e,z,h,top=c.top,front=c.wood,side=c.bar){isoBox(a,b,d,e,z,h,top,front,side);}
/** Draw the room fixtures before the movable foreground furnishings. */
function fixed(){
  drawPubBar({box,ln,panel,c});
  drawPubFireplace(boxingState.tick);
  drawPubLamp(boxingState.tick);
}
/** Sort the player with each piece of furniture by ground depth. */
function furnishings(){
  const items=pubFurnitureItems({box,ln,c});
  items.push([P.i+P.j,()=>{
    const A=appearanceState, side=P.fi-P.fj>=0?1:-1;
    const J=walkJoints(P.moving?P.ph%1:.25,false,side);
    withCellOutfit(()=>figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'crop',stubble:true},{noShadow:true}));
  }]);
  items.sort((a,b)=>a[0]-b[0]).forEach(item=>item[1]());
}
/** A low, dithered contact shadow beneath the player's feet. */
function playerShadow(){
  const a=P.i-.24,b=P.j-.24,d=P.i+.24,e=P.j+.24;
  quad(a,b,.035,d,b,.035,d,e,.035,a,e,.035,(x,y)=>{
    const k=y*appearanceState.W+x, color=rendererState.fb[k];
    if((x+y)&1) return color;
    return (0xff000000|(((color>>16&255)*.65)<<16)|(((color>>8&255)*.65)<<8)|((color&255)*.65))>>>0;
  });
}
/** Cache the stationary pools of light in native pixel coordinates. */
let lights=null;
function lightMap(w,h){
  if(lights&&lights.w===w&&lights.h===h) return lights;
  const data=new Float32Array(w*h*3);
  const fall=(x,y,cx,cy,rx,ry)=>Math.max(0,1-Math.hypot((x-cx)/rx,(y-cy)/ry));
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const k=(y*w+x)*3;
    data[k]=fall(x,y,260,106,85,65);
    data[k+1]=fall(x,y,304,80,105,86);
    data[k+2]=fall(x,y,167,188,70,53);
  }
  return lights={w,h,data};
}
/** Local amber and cool pools of light keep the room legible without blur. */
function roomLight(){
  const fb=rendererState.fb,w=appearanceState.W,h=appearanceState.H,data=lightMap(w,h).data;
  for(let k=0;k<fb.length;k++){
    const col=fb[k]; if(col===c.void) continue;
    const fire=data[k*3],gas=data[k*3+1],door=data[k*3+2];
    const dark=.87+.10*Math.max(fire,gas)+.08*door;
    const r=Math.min(255,(col&255)*dark+fire*23+gas*13+door*2);
    const g=Math.min(255,(col>>8&255)*dark+fire*10+gas*8+door*6);
    const b=Math.min(255,(col>>16&255)*dark+fire*3+gas*3+door*12);
    fb[k]=(0xff000000|(b<<16)|(g<<8)|r)>>>0;
  }
}
/** Render in the same fixed 432×288 framebuffer and 2:1 projection as the port. */
export function renderPub(){const old=setPropCamera(cam);try{drawPubShell({fb:rendererState.fb,c,panel,ln,box});playerShadow();fixed();furnishings();roomLight();}finally{setPropCamera(old);}}
