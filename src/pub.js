/* The Rope & Anchor: a small public room within the existing dockside footprint. */
import {rgb, state as appearanceState} from './appearance.js';
import {state as rendererState} from './renderer.js';
import {state as gymState, setPropCamera, quad, isoLineThin, isoBox, figureHD, withCellOutfit} from './gym.js';
import {walkJoints} from './port-life.js';
import {leavePubToPort} from './thames-port.js';
import {setPubPrompt} from './input.js';
import {state as boxingState} from './boxing.js';

const P={i:4.9,j:6.05,fi:0,fj:-1,ph:.25,moving:false}, keys=new Set();
const cam={x:200,y:79,ix:18,jx:-18,iy:9,jy:9,z:3,figureScale:3};
const c={void:rgb('#171411'),floor:rgb('#66503a'),floor2:rgb('#735a40'),seam:rgb('#433427'),wall:rgb('#75634d'),wall2:rgb('#60503e'),dark:rgb('#2a211a'),wood:rgb('#513625'),trim:rgb('#94724c'),bar:rgb('#34251c'),top:rgb('#805d3c'),stone:rgb('#746452'),soot:rgb('#221c18'),fire:rgb('#dc8034'),gold:rgb('#d2a666'),glass:rgb('#527066'),cool:rgb('#788581'),paper:rgb('#bcaa83')};
// Furniture footprints include a small margin for the figure's feet.
const obstacles=[[.1,.1,2.8,1.28],[3.05,.1,4.55,.75],[5.2,.1,7.05,1.05],[7.65,1.05,8.55,3.25],[1.1,2.25,2.45,3.35],[4.05,2.1,5.55,3.05],[6.35,4,7.25,4.8],[.1,4.2,.7,6.15]];
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
/** A table with visible legs and a thick top. */
function table(a,b,d,e){for(const i of [a+.1,d-.22])for(const j of [b+.1,e-.22])box(i,j,i+.12,j+.12,0,5,c.trim,c.wood,c.bar);box(a,b,d,e,5,5.7,c.top,c.wood,c.bar);}
/** Vary bottle silhouettes and colours behind the counter. */
function bottle(i,j,z,h,col){box(i,j,i+.15,j+.15,z,z+h,col,col,c.dark);box(i+.045,j+.045,i+.105,j+.105,z+h,z+h+.7,c.trim,col,col);}
/** Paint the fixed room shell and its restrained period details. */
function shell(){
 rendererState.fb.fill(c.void);
 panel(0,0,0,8.6,0,0,8.6,6.9,0,0,6.9,0,c.floor);
 for(let j=.35;j<6.9;j+=.48){ln(0,j,.02,8.6,j,.02,c.seam);const offset=(Math.floor(j*10)%3)*1.17;for(let i=offset+.8;i<8.6;i+=2.5)ln(i,j,.03,i,j+.46,.03,c.floor2);}
 // Rear walls are raised; the street-facing walls are cut away for visibility.
 panel(0,0,0,8.6,0,0,8.6,0,22,0,0,22,c.wall);
 panel(0,0,0,0,6.9,0,0,6.9,22,0,0,22,c.wall2);
 panel(0,0,0,8.6,0,0,8.6,0,5.5,0,0,5.5,c.wood);
 panel(0,0,0,0,6.9,0,0,6.9,5.5,0,0,5.5,c.bar);
 for(let i=.5;i<8.6;i+=.85)ln(i,.01,.5,i,.01,5.4,c.trim);
 for(let j=.5;j<6.9;j+=.9)ln(.01,j,.5,.01,j,5.4,c.trim);
 ln(0,0,5.5,8.6,0,5.5,c.trim);ln(0,0,5.5,0,6.9,5.5,c.trim);
 // A few repaired boards, worn plaster and a structural beam.
 for(const [i,j] of [[2.1,4.4],[3.3,5.35],[5.7,3.9],[7.2,5.8]])ln(i,j,.04,i+.6,j,.04,c.trim);
 for(const [i,z] of [[3.6,17],[5.2,9],[6.4,18],[8.2,11]])ln(i,.01,z,i+.25,.01,z+.15,c.wall2);
 box(0,0,.18,6.9,21.3,22,c.wood,c.bar,c.dark);
 // Front threshold and two cut-down window sills correspond to the street facade.
 box(0,6.76,4.1,6.9,0,.55,c.stone,c.dark,c.dark);box(5.7,6.76,8.6,6.9,0,.55,c.stone,c.dark,c.dark);
 box(4.1,6.75,5.7,6.9,0,.25,c.cool,c.stone,c.stone);
 ln(4.1,6.8,.3,4.1,6.8,5,c.trim);ln(5.7,6.8,.3,5.7,6.8,5,c.trim);
 // Low cutaway frames mark the ground-floor windows without hiding the player.
 for(const [a,b] of [[.8,2.05],[6.65,7.9]]){box(a,6.72,b,6.9,.55,1.05,c.trim,c.wood,c.dark);ln(a,6.76,1.05,a,6.76,3.1,c.trim);ln(b,6.76,1.05,b,6.76,3.1,c.trim);}
 // Door into service rooms, simple print and lamp on the rear wall.
 panel(6.9,.01,1,8.05,.01,1,8.05,.01,16,6.9,.01,16,c.dark);
 panel(7.05,.02,1,7.9,.02,1,7.9,.02,15,7.05,.02,15,c.wood);
 ln(7.18,.03,3,7.18,.03,13,c.trim);ln(7.75,.03,3,7.75,.03,13,c.trim);
 panel(4.65,.02,12,5.4,.02,12,5.4,.02,16,4.65,.02,16,c.paper);
 box(5.85,.05,6.05,.27,16,17,c.gold,c.wood,c.dark);
 ln(5.95,.16,17,5.95,.16,20,c.gold);
}
/** Shelves, counter and stove fixed against the back walls. */
function fixed(){
 // Shelves and irregular bottles.
 for(const z of [10,15]){box(.3,.08,2.75,.48,z,z+.35,c.trim,c.wood,c.bar);for(let k=0;k<6;k++){const i=.43+k*.36+(k%2)*.05;bottle(i,.18,z+.35,1.4+(k%3)*.5,k%3===0?c.glass:k%3===1?c.dark:c.wood);}}
 box(.1,.7,2.9,1.32,0,7.2,c.wood,c.bar,c.dark);box(.02,.62,3,1.4,7.2,8,c.top,c.wood,c.bar);
 for(let i=.3;i<2.9;i+=.6){ln(i,1.405,1,i,1.405,6.8,c.trim);}
 // Hand pump and a jug on the worktop.
 box(1.8,.95,2,1.16,8,9,c.gold,c.wood,c.dark);ln(1.9,1.04,9,1.9,1.04,12,c.gold);ln(1.9,1.04,12,2.25,1.04,11.5,c.gold);
 bottle(.85,1,8,1.7,c.glass);
 // Fireplace on the back wall with chimney breast.
 box(3.12,.03,4.5,.55,0,15,c.stone,c.stone,c.dark);panel(3.35,.56,1,4.27,.56,1,4.27,.56,7,3.35,.56,7,c.soot);
 const flick=(Math.sin(boxingState.tick*.08)>0?.3:0);panel(3.62,.57,1.3,4.03,.57,1.3,3.95,.57,3.6+flick,3.72,.57,3.3,c.fire);
 box(3,.0,4.62,.69,8,8.8,c.trim,c.stone,c.dark);
}
/** Draw furniture and the player sorted by their ground depth. */
function furnishings(){
 const items=[
  [5.8,()=>{table(1.1,2.25,2.45,3.35);box(1.35,2.5,1.55,2.7,5.7,6.8,c.gold,c.wood,c.bar);}],
  [8.6,()=>{table(4.05,2.1,5.55,3.05);bottle(4.35,2.4,5.7,1.9,c.glass);box(4.9,2.65,5.15,2.87,5.7,6.25,c.paper,c.stone,c.dark);}],
  [11.1,()=>{table(6.35,4,7.25,4.8);box(6.65,4.25,6.86,4.45,5.7,6.7,c.gold,c.wood,c.dark);}],
  [5.2,()=>box(.1,4.2,.7,6.15,0,4,c.top,c.wood,c.bar)],
  [10,()=>box(7.65,1.05,8.55,3.25,0,4,c.top,c.wood,c.bar)],
  [P.i+P.j,()=>{const A=appearanceState,side=P.fi-P.fj>=0?1:-1,J=walkJoints(P.moving?P.ph%1:.25,false,side);withCellOutfit(()=>figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'crop',stubble:true},{noShadow:true}));}]
 ];items.sort((a,b)=>a[0]-b[0]).forEach(x=>x[1]());
}
/** Render in the same fixed 432×288 framebuffer and 2:1 projection as the port. */
export function renderPub(){const old=setPropCamera(cam);try{shell();fixed();furnishings();}finally{setPropCamera(old);}}
