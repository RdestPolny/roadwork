import { rgb, setRamp, state as appearanceState } from './appearance.js';
import { state as rendererState, line, taper, zoomBlit } from './renderer.js';
import { state as boxingState, setGstate, h2 } from './boxing.js';
import { state as gymState, quad, isoLine, isoLineThin, isoX, isoY, isoBox, figureHD, withCellOutfit, setPropCamera, shadeC } from './gym.js';
import { mix } from './cast.js';
import { setPanelMode, enterPrisonFromPort } from './navigation.js';
import { setInfo, setPortSackPrompt } from './input.js';
import { startIsoFight } from './iso-fight.js';
import { horse, coachWheel } from './carriage.js';
import { resetStory, storyPlaying, storyBegun, beginBefore, beginAfter, storyTick, storyShot, storyLine, storyCaption, storyFade, storyBars, storyVanDoor, storyCast, state as storyState } from './port-story.js';
import { portSurface, districtBlocked } from './port-district.js';
import { DEBUG } from './config.js';
import { portDistrictStatic, portDecks, portRiverDistance, portDistrictProps, portDistrictFX } from './port-extension.js';

/** Enter the standalone developer preview without changing the saved room. */
export function startThamesPort(){ Object.assign(player,{i:21.5,j:9,fi:-1,fj:0,ph:0,moving:false,carrying:false,lift:-1,pose:null}); Object.assign(playerSack,{i:20.9,j:8.5}); Object.assign(portJob,{ticks:0,delivered:0,entry:null,finished:false}); resetStory(); Object.assign(view,{z:1,cx:144,cy:96,pixelRatio:1}); portStory(); say(); camera.x=162-(player.i-player.j)*12; camera.y=84-(player.i+player.j)*6; bake.key=''; clearThamesInput(); setGstate('port'); setPanelMode(); setInfo(); }

const C={black:rgb('#080a0a'), mortar:rgb('#211e1a'), brick:[rgb('#42322a'),rgb('#49372c'),rgb('#382d27'),rgb('#524034')],
  stock:[rgb('#4d4636'),rgb('#564d3b'),rgb('#443e31'),rgb('#5d523e')], brickC:[rgb('#3b2a25'),rgb('#45302a'),rgb('#33261f'),rgb('#4c362d')],
  stone:[rgb('#413f38'),rgb('#49463d'),rgb('#373932'),rgb('#504b40')], joint:rgb('#252925'), wet:rgb('#69716a'), lintel:rgb('#77725f'),
  water:rgb('#172324'), waterHi:rgb('#3f4c48'), ripple:rgb('#46524b'), slime:rgb('#25301f'), iron:rgb('#171a19'), ironHi:rgb('#3c4240'), edge:rgb('#726c5c'),
  wood:rgb('#5b4935'), woodDark:rgb('#382e24'), woodLight:rgb('#80684b'), rope:rgb('#9c8867'), ropeD:rgb('#3a342b'), lamp:rgb('#edb963'), flame:rgb('#fff1c4'),
  glass:rgb('#252b2b'), glassHi:rgb('#4a5552'), lit:rgb('#d9a35c'), litD:rgb('#7c5530'), paper:[rgb('#a59a7c'),rgb('#8e5a44'),rgb('#6d7a78')],
  slate:rgb('#2b2f31'), skyTop:rgb('#121619'), skyLow:rgb('#4a463b'), fog:rgb('#5e5c50'), smoke:rgb('#3f3d38'),
  tar:rgb('#161514'), wale:rgb('#8a7a58'), rail:rgb('#7a6448'), bulwark:rgb('#4a3a2d'), deck:rgb('#5d4c38'), seam:rgb('#2a231c'),
  canvas:rgb('#4b4d3f'), crate:[rgb('#6f5a40'),rgb('#5f4d38'),rgb('#7d6a4c')], jute:rgb('#7d6847'), coal:rgb('#16181b'), gull:rgb('#c9c8bd')};
// One person is about 17 height units; one ground tile is 7.5 height units.
const camera={x:150,y:-18,ix:12,jx:-12,iy:6,jy:6,z:2,figureScale:2};
/** Low tide: the river surface lies well below the quay's coping. */
const WL=-7;
/** Warehouse fronts along the back of the quay: run along i, roof height and brick. */
const FRONTS=[{i0:0,i1:11,h:74,pal:C.brick,seed:19},{i0:11,i1:21,h:62,pal:C.stock,seed:41},{i0:21,i1:30,h:68,pal:C.brickC,seed:67}];
/** Gas lamps: three on the quay edge, two on wall brackets; z is the centre of the lantern. */
const LAMPS=[{i:4.6,j:12.1,z:25.5,r:5.5},{i:13.6,j:12.1,z:25.5,r:5.5},{i:21,j:12.1,z:25.5,r:5.5},{i:.95,j:11.2,z:30,r:4.5,wall:'i'},{i:17.25,j:.95,z:30,r:4.5,wall:'j'},{i:40.2,j:12.05,z:25.5,r:6.2},{i:48.2,j:12.2,z:25.5,r:6.2},{i:36.1,j:6.85,z:30,r:5.2,wall:'j'}];
/** Per-frame lamp brightness, flickering independently. */
let glow=LAMPS.map(()=>1);

/** Move the view across the larger port without changing its zoom. */
/** pose: the joints a story scene gives him, in place of his own walk. */
const player={i:21.5,j:9,fi:-1,fj:0,ph:0,moving:false,carrying:false,lift:-1,pose:null}, playerSack={i:20.9,j:8.5}, keys=new Set();
const portJob={ticks:0,delivered:0,entry:null,finished:false};
/** What a story scene's camera looks at (ground point, height) and its zoom; cx, cy: the zoom centre in the last frame. */
const view={i:0,j:0,h:9,z:1,cx:144,cy:96,pixelRatio:1};
/** Update the foreman's line and the port task counter; during a scene only its closing caption, centred over the black. */
function portStory(){
  const el=document.getElementById('portStory');
  if(!el) return;
  el.classList.toggle('caption',storyPlaying());
  if(storyPlaying()) el.textContent=storyCaption();
  else el.textContent=portJob.finished?(portJob.delivered<3?`Przenieś worki do magazynu!  ${portJob.delivered}/3`:'Wszystkie worki w magazynie!  3/3'):portJob.ticks<240?'Operator dźwigu: „Jeszcze kilka worków i macie fajrant”.':portJob.delivered<3?`Przenieś worki do magazynu!  ${portJob.delivered}/3 · brama w głębi nabrzeża`:'Wszystkie worki w magazynie!  3/3';
}
/** Read the port player's position and carried sack for the scene's controls and tests. */
export function thamesPlayer(){ return {...player,pose:!!player.pose,zoom:view.z,sack:{...playerSack},job:{...portJob},story:storyState.kind&&{kind:storyState.kind,tick:storyState.tick}}; }
/** Keep the interaction hint in sync with the pickup range and animation. */
function sackPrompt(){
  const show=!player.carrying&&player.lift<0&&!portJob.entry&&!storyPlaying()&&Math.hypot(player.i-playerSack.i,player.j-playerSack.j)<1.4;
  const H=rendererState.hd3, d=window.devicePixelRatio||1;
  setPortSackPrompt(show,(H.ox+isoX(playerSack.i,playerSack.j)*H.scale)/d,(H.oy+isoY(playerSack.i,playerSack.j,5)*H.scale)/d);
}
/** Ground-level footprints of the port props, including the movable sack. */
export function thamesBlocked(i,j){
  if(i<.5||j<.5||!portSurface(i,j)||districtBlocked(i,j)) return true;
  if(i<30&&j>12.4) return true;
  const boxes=[[.5,.5,2.3,2.2],[4.55,1.65,5.65,2.75],[5.6,9.7,9.55,10.85],
    [2.1,9.9,3,10.8],[6.7,3.6,10.6,6.1],[11,3.5,14,6.3],
    [17.6,2.2,21.55,3.6],[21.6,1,24.6,3.6],
    [20.85,3.95,22.5,5.6],[19.4,6.25,20.8,8.05],
    [25.85,10.3,27.75,12.2],[28.3,7.9,29.9,9.8]];
  if(boxes.some(([a,b,c,d])=>i>a-.2&&i<c+.2&&j>b-.2&&j<d+.2)) return true;
  if(Math.hypot(i-27.65,j-1.7)<.55) return true;
  if(LAMPS.some(l=>!l.wall&&Math.hypot(i-l.i,j-l.j)<.48)) return true;
  if([2.2,8.5,16.5,21.8,28.2].some(x=>Math.hypot(i-x,j-12.6)<.36)) return true;
  if(Math.hypot(i-26.8,j-6.6)<craneAt(boxingState.tick,-2.4).heap.r+.2) return true;
  return !player.carrying&&(player.lift<0||player.lift/120<.45)&&Math.hypot(i-playerSack.i,j-playerSack.j)<.48;
}
/** Set a movement key for the port player. */
export function thamesKey(code,down,repeat=false){
  if(storyPlaying()) return true;
  if(code==='KeyE'){
    if(down&&!repeat&&player.lift<0&&!portJob.entry){
      if(player.carrying){ playerSack.i=player.i+player.fi*.55; playerSack.j=player.j+player.fj*.55; player.carrying=false; }
      else if(Math.hypot(player.i-playerSack.i,player.j-playerSack.j)<1.4){ const di=playerSack.i-player.i,dj=playerSack.j-player.j,dist=Math.hypot(di,dj); if(dist>.01){ player.fi=di/dist; player.fj=dj/dist; } player.lift=0; player.moving=false; }
    }
    return true;
  }
  if(!['ArrowLeft','KeyA','ArrowRight','KeyD','ArrowUp','KeyW','ArrowDown','KeyS'].includes(code)) return false;
  if(down) keys.add(code); else keys.delete(code); return true;
}
/** Release port movement after pause or loss of focus. */
export function clearThamesInput(){ keys.clear(); }
/** Advance the player and follow them through the port. */
export function tickThamesPort(){
  if(storyPlaying()){
    const r=storyTick(boxingState.tick);
    if(r.end){ Object.assign(player,{pose:null,moving:false}); say(); if(r.end==='fight'){ portJob.finished=true; portStory(); startIsoFight(0,'port'); } else enterPrisonFromPort(); return; }
    Object.assign(player,r.hero); portStory(); aim(); return;
  }
  if(portJob.ticks<240&&++portJob.ticks===240) portStory();
  if(portJob.entry){
    const e=portJob.entry; e.tick++;
    if(e.tick<=55){ const u=e.tick/55; player.i=lerp(e.i,13.15,u); player.j=lerp(e.j,-1.4,u); player.fi=0; player.fj=-1; player.moving=true; player.ph+=.045; }
    else if(e.tick<=105){ player.moving=false; if(e.tick===56){ player.carrying=false; portJob.delivered++; playerSack.i=20.9; playerSack.j=8.5; portStory(); } }
    else if(e.tick<=160){ const u=(e.tick-105)/55; player.i=13.15; player.j=lerp(-1.4,1.15,u); player.fi=0; player.fj=1; player.moving=true; player.ph+=.045; }
    else { portJob.entry=null; player.moving=false; clearThamesInput(); if(portJob.delivered===2&&!portJob.finished) beginScene(()=>beginBefore(boxingState.tick)); }
    return;
  }
  if(player.lift>=0){ if(++player.lift>=120){ player.lift=-1; player.carrying=true; } return; }
  const dx=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
  const dy=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
  player.moving=!!(dx||dy); if(!player.moving) return;
  const len=Math.hypot(dx+dy,dy-dx), di=(dx+dy)/len,dj=(dy-dx)/len;
  const speed=player.carrying?TRIP.out*1.2:.065;
  const oi=player.i, oj=player.j, ni=oi+di*speed, nj=oj+dj*speed;
  if(!thamesBlocked(ni,player.j)) player.i=ni;
  if(!thamesBlocked(player.i,nj)) player.j=nj;
  player.moving=player.i!==oi||player.j!==oj;
  if(player.carrying&&portJob.delivered<3&&Math.hypot(player.i-13.15,player.j-.8)<1.25){
    portJob.entry={tick:0,i:player.i,j:player.j}; clearThamesInput();
  }
  player.fi=di; player.fj=dj; player.ph+=player.carrying?speed/TRIP.cycle:.045;
  followPortCamera();
}
/** Position-preserving camera follow; only new terrain relaxes the old bounds. */
function followPortCamera(){
  const ext=Math.max(0,Math.min(1,(player.i-29.5)/13));
  camera.x=Math.max(-40-400*ext,Math.min(330,162-(player.i-player.j)*12));
  camera.y=Math.max(-180-290*ext,Math.min(170,84-(player.i+player.j)*6));
}
/** Debug-only viewpoint for deterministic 432×288 environment captures.
 * Normal gameplay and story beats never call this function. */
export function debugPortView(i,j){
  if(!DEBUG||!portSurface(i,j)||districtBlocked(i,j)) return false;
  player.i=i; player.j=j; player.moving=false; player.lift=-1;
  followPortCamera();bake.key='';
  return true;
}
/** Start a story scene from what the camera shows now: the shot eases over from the middle of the picture at zoom z. */
function beginScene(begin,z=1){
  const [i,j]=ground(view.cx/view.pixelRatio,view.cy/view.pixelRatio,9); begin();
  Object.assign(view,{i,j,h:9,z}); portStory();
}
/** Ease the camera towards the scene's shot: pan to its point, then zoom; the pan keeps the quay inside the picture. */
function aim(){
  const s=storyShot(boxingState.tick);
  view.i+=(s.i-view.i)*.04; view.j+=(s.j-view.j)*.04; view.z+=(s.z-view.z)*.035;
  camera.x=Math.max(-40,Math.min(330,144-(view.i-view.j)*12));
  camera.y=Math.max(-180,Math.min(170,96-(view.i+view.j)*6+view.h*2));
}
/** The scene's camera on the finished picture: the zoom on its point, black bars closing in from above and below, the fade to black. */
function sceneFrame(){
  const W=appearanceState.W, H=appearanceState.H, z=view.z, fb=rendererState.fb;
  view.cx=Math.max(W/(2*z),Math.min(W-W/(2*z),isoX(view.i,view.j))); view.cy=Math.max(H/(2*z),Math.min(H-H/(2*z),isoY(view.i,view.j,view.h)));
  view.pixelRatio=gymState.ISO_K/2;
  if(z>1.001) zoomBlit(z,view.cx,view.cy);
  const bar=Math.round(14*storyBars()); if(bar>0){ fb.fill(C.black,0,bar*W); fb.fill(C.black,(H-bar)*W,H*W); }
  const f=storyFade(); if(f>0) for(let k=0;k<fb.length;k++) fb[k]=mix(fb[k],C.black,f);
}
/** The bubble over the speaker's head, following him through the camera's zoom; the words come out a few letters a tick. */
function say(){
  const el=document.getElementById('npcSay'); if(!el) return;
  const L=storyLine(boxingState.tick);
  if(!L){ el.hidden=true; el.dataset.text=''; return; }
  if(el.dataset.text!==L.text){ el.dataset.text=L.text; el.replaceChildren(document.createElement('span'),document.createElement('span')); el.lastChild.className='unsaid'; el.hidden=false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  el.firstChild.textContent=L.text.slice(0,L.shown); el.lastChild.textContent=L.text.slice(L.shown);
  const Hd=rendererState.hd3, d=window.devicePixelRatio||1, W=appearanceState.W, H=appearanceState.H, z=view.z;
  const x=(Hd.ox+(isoX(L.at[0],L.at[1])-(view.cx-W/(2*z)))*z*Hd.scale)/d, y=(Hd.oy+(isoY(...L.at)-(view.cy-H/(2*z)))*z*Hd.scale)/d;
  const half=el.offsetWidth/2+8, left=Hd.ox/d+half, right=(Hd.ox+W*Hd.scale)/d-half, cx=Math.max(left,Math.min(right,x));
  el.style.left=`${cx}px`; el.style.top=`${Math.max(Hd.oy/d+el.offsetHeight+24,y)}px`; el.style.setProperty('--tail',`${Math.max(-half+18,Math.min(half-18,x-cx))}px`);
}
const NZ=new Float32Array(4096); for(let k=0;k<4096;k++) NZ[k]=h2(k&63,k>>6)/255;
/** Smooth value noise in 0..1, tiling every 64 units. */
function vn(u,v){
  const a=Math.floor(u),b=Math.floor(v),f=u-a,g=v-b,s=f*f*(3-2*f),r=g*g*(3-2*g),a0=a&63,a1=(a+1)&63,b0=(b&63)<<6,b1=((b+1)&63)<<6;
  const n0=NZ[a0+b0]+(NZ[a1+b0]-NZ[a0+b0])*s, n1=NZ[a0+b1]+(NZ[a1+b1]-NZ[a0+b1])*s; return n0+(n1-n0)*r;
}
/** Two octaves of value noise. */
const fbm=(u,v)=>vn(u,v)*.65+vn(u*2.1+5.3,v*2.1+1.7)*.35;
const frac=v=>v-Math.floor(v);

/** Recover ground coordinates (at height z) from a pixel in the shared isometric camera. */
function ground(x,y,z=0){ const a=(x-camera.x)/camera.ix,b=(y-camera.y+z*camera.z)/camera.iy; return [(a+b)/2,(b-a)/2]; }
/** Position [i,z] of a pixel on the vertical plane j=J. */
function onJ(J,x,y){ const i=(x-camera.x-J*camera.jx)/camera.ix; return [i,(camera.y+i*camera.iy+J*camera.jy-y)/camera.z]; }
/** Position [j,z] of a pixel on the vertical plane i=I. */
function onI(I,x,y){ const j=(x-camera.x-I*camera.ix)/camera.jx; return [j,(camera.y+I*camera.iy+j*camera.jy-y)/camera.z]; }
/** A textured plane in world coordinates. */
function floor(i0,j0,i1,j1,z,texture){ quad(i0,j0,z,i1,j0,z,i1,j1,z,i0,j1,z,texture); }
/** A line in the port's world coordinates. */
function stroke(i,j,z,I,J,Z,c){ isoLine(i,j,z,I,J,Z,c); }
/** A one-pixel line in the port's world coordinates. */
function thin(i,j,z,I,J,Z,c){ isoLineThin(i,j,z,I,J,Z,c); }
/** Colour already in the picture at a pixel, for glazes over earlier layers. */
const under=(x,y)=>rendererState.fb[y*appearanceState.W+x];

/** Blend a soft elliptical spot of colour into the picture: lamp halo, smoke puff or contact shadow. */
function spot(cx,cy,rx,ry,a,col){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H;
  const x0=Math.max(0,Math.floor(cx-rx)), x1=Math.min(W-1,Math.ceil(cx+rx)), y0=Math.max(0,Math.floor(cy-ry)), y1=Math.min(H-1,Math.ceil(cy+ry));
  for(let y=y0;y<=y1;y++){ const v=(y+.5-cy)/ry; for(let x=x0;x<=x1;x++){ const u=(x+.5-cx)/rx, q=1-u*u-v*v; if(q>0){ const k=y*W+x; fb[k]=mix(fb[k],col,a*q*q); } } }
}
/** Soft darkening under a prop standing on the setts. */
function contact(i0,j0,i1,j1,z=0,k=.55){
  floor(i0-.2,j0-.15,i1+.25,j1+.3,z,(x,y)=>{ const [i,j]=ground(x,y,z), d=Math.max(Math.max(i0-i,i-i1,0)/.25,Math.max(j0-j,j-j1,0)/.3); return shadeC(under(x,y),k+(1-k)*Math.min(1,d)); });
}

/** Wet granite setts with puddles, grime by the walls and pools of gas light. */
function sett(x,y){ const [i,j]=ground(x,y); return settAt(i,j); }
/** The quay's setts at a ground point, or 0 off the quay (the knockdown comic's floor). @param {number} i @param {number} j */
export function quayFloor(i,j){ const s=portSurface(i,j); return !s?0:s==='stone'?settAt(i,j):shadeC(C.woodLight,.75+vn(i*1.4,j*3)*.25); }
/** @param {number} i @param {number} j */
function settAt(i,j){
  const row=Math.floor(j*2.3), u=i*1.25+frac(row*.37)*.9, v=j*2.3-row, f=frac(u);
  const n=h2(Math.floor(u)+row*7,row*3), wetN=fbm(i*.33+3,j*.45+11);
  let c=(v<.17||f<.07)?C.joint:shadeC(C.stone[n&3],v>.72?1.13:f>.9?.88:1);
  c=shadeC(c,(.84+(n-128)/1300+(vn(i*.7,j*.7)-.5)*.2)*Math.min(1,.62+j*.1)*Math.min(1,.62+i*.12));
  if(i<8.5&&(Math.abs(j-3.75)<.14||Math.abs(j-5.95)<.14)) c=mix(shadeC(c,.72),C.glassHi,.12*Math.max(0,1-i/8.5));
  if(wetN>.64) c=mix(shadeC(c,.7),C.glassHi,Math.min(.55,(wetN-.64)*6)*(.6+.4*vn(i*2,j*6)));
  else if(wetN>.58) c=shadeC(c,.82);
  let L=0; for(let k=0;k<LAMPS.length;k++){ const l=LAMPS[k], q=Math.max(0,1-Math.hypot(i-l.i,j-l.j)/l.r); L+=q*q*glow[k]; }
  if(wetN>.64) L*=1.8;
  if(gymState.ISO_K===3&&v>.2&&f>.13){ const grain=h2(Math.floor(i*24)+41,Math.floor(j*24));
    if(grain<14) c=shadeC(c,.78); else if(grain>244) c=shadeC(c,1.12); }
  return L>0?mix(shadeC(c,1+L*.7),C.lamp,Math.min(.4,L*.22)):c;
}
/** Brick bond with a granite plinth, per-brick tone, soot streaks and rising damp; a runs along the face, z up it. */
function brickAt(a,z,pal,seed){
  if(z<2.6){ const r=Math.floor(z/1.3), u=a*1.4+(r&1)*.5; return (frac(z/1.3)<.15||frac(u)<.05)?C.mortar:shadeC(C.stone[h2(Math.floor(u)+seed,r)&3],.8+vn(a*3,z)*.16); }
  const row=Math.floor(z*1.1), u=a*4.4+(row&1)*.5, f=frac(u), v=z*1.1-row, n=h2(Math.floor(u)+seed,row);
  if(v<.17||f<.07) return shadeC(C.mortar,.88+vn(a*2,z*.3)*.25);
  const streak=vn(a*1.6+seed,z*.035), patch=vn(a*.45+seed,z*.06);
  const k=(.86+(n-128)/650)*(1.08-.34*streak*Math.min(1,z/26)-.16*patch)*(z<10?.8+z*.02:1);
  const fleck=gymState.ISO_K===3?h2(Math.floor(a*18)+seed,Math.floor(z*11)):128;
  return shadeC(pal[n&3],k*(fleck<17?.78:fleck>246?1.11:1));
}
/** A point on a wall face: f is {j:J} (faces +j) or {i:I} (faces +i), a runs along it. */
const pt=(f,a,z)=>f.j!==undefined?[a,f.j+.03,z]:[f.i+.03,a,z];
/** A rectangle painted on a wall face. */
function fq(f,a0,z0,a1,z1,fn){ quad(...pt(f,a0,z0),...pt(f,a1,z0),...pt(f,a1,z1),...pt(f,a0,z1),fn); }
/** A line on a wall face. */
function fl(f,a0,z0,a1,z1,c){ thin(...pt(f,a0,z0),...pt(f,a1,z1),c); }

/** Sash window in a stone surround: lit, dark with sky sheen, or behind iron shutters; ground floors get bars. */
function windowAt(f,a,z,w,h,kind,t,bars=false){
  const id=Math.floor(a*7+z), stone=(x,y)=>shadeC(C.lintel,.78+vn((x-camera.x)*.35,(y-camera.y)*.35)*.3);
  fq(f,a-.14,z+h,a+w+.14,z+h+2.4,stone); fl(f,a-.14,z+h+2.4,a+w+.14,z+h+2.4,shadeC(C.lintel,1.25));
  fq(f,a+w*.42,z+h+.2,a+w*.58,z+h+2.7,()=>shadeC(C.lintel,1.12));
  fq(f,a-.1,z-1.1,a+w+.1,z,stone); fl(f,a-.1,z-.05,a+w+.1,z-.05,shadeC(C.lintel,1.3));
  fq(f,a,z,a+w,z+h,()=>C.iron);
  if(kind==='shut'){ fq(f,a+.06,z+.3,a+w-.06,z+h-.2,(x,y)=>shadeC(rgb('#2c332f'),.8+vn((x-camera.x)*.2,(y-camera.y)*.08)*.4)); fl(f,a+w/2,z+.3,a+w/2,z+h-.2,C.iron); for(const k of [.25,.75]) fl(f,a+.06,z+h*k,a+w-.06,z+h*k,C.ironHi); return; }
  const flick=.85+.15*vn(id,id*.3);
  fq(f,a+.08,z+.4,a+w-.08,z+h-.3,kind==='lit'?(x,y)=>mix(C.litD,C.lit,(.45+.55*vn((x-camera.x)*.12+id,(y-camera.y)*.09))*flick):(x,y)=>mix(C.glass,C.glassHi,Math.max(0,.55-frac(((y-camera.y)*.8+(x-camera.x)*.35)/23))));
  for(let k=1;k<3;k++){ const aa=a+.08+(w-.16)*k/3; fl(f,aa,z+.4,aa,z+h-.3,shadeC(C.iron,1.4)); }
  for(let k=1;k<4;k++){ const zz=z+.4+(h-.7)*k/4; fl(f,a+.08,zz,a+w-.08,zz,shadeC(C.iron,k===2?1:1.4)); }
  if(bars) for(let k=1;k<6;k++){ const aa=a+w*k/6; fl(f,aa,z,aa,z+h,C.iron); }
}
/** Tattered bills pasted on the brick at street level. */
function poster(f,a,z,w,h,k){
  const paper=C.paper[k%3];
  fq(f,a,z,a+w,z+h,(x,y)=>{ const n=vn((x-camera.x)*.45+k*9,(y-camera.y)*.3); return n<.28?0:mix(under(x,y),paper,.85*Math.min(1,(n-.28)*6)); });
  for(let r=0;r<4;r++){ const zz=z+h*(.78-r*.18); fl(f,a+w*.12,zz,a+w*(r?.82:.88),zz,shadeC(paper,r?.55:.35)); }
}
const FONT={V:'101101101101010',W:'101101111111101',A:'010101111101101',P:'110101110100100',I:'111010010010111',N:'101111111101101',G:'011100101101011',H:'101101111101101',R:'110101110101101',F:'111100110100100',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',K:'101101110101101',L:'100100100100111',M:'101111111101101',O:'010101101101010',S:'011100010001110',T:'111010010010010',U:'101101101101111',Y:'101101010010010',' ':'000000000000000'};
/** Faded painted lettering across a wall face, one font pixel = 2×2 screen pixels; col and k set the paint and how much of it is left. */
function lettering(f,a,z,text,col=rgb('#c9bf9d'),k=.38){
  for(let n=0;n<text.length;n++){ const g=FONT[text[n]]; for(let p=0;p<15;p++) if(g[p]==='1'){
    const aa=a+(n*4+p%3)/6, zz=z-Math.floor(p/3);
    fq(f,aa,zz-1,aa+1/6,zz,(x,y)=>mix(under(x,y),col,Math.min(1,k+.4*vn((x-camera.x)*.3,(y-camera.y)*.4))));
  } }
}
/** Upright cylinder: barrels, bollards and lamp posts; body(z,s) colours its side, s = -1..1 across. */
function cyl(i,j,r,z0,z1,body,top,bulge=0){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, cx=isoX(i,j), yb=isoY(i,j,z0), yt=isoY(i,j,z1), rx0=r*Math.hypot(camera.ix,camera.jx), ry=r*Math.hypot(camera.iy,camera.jy);
  const rxm=rx0*(1+bulge);
  for(let y=Math.max(0,Math.floor(yt-ry-1));y<=Math.min(H-1,Math.ceil(yb+ry+1));y++){
    const zf=Math.max(0,Math.min(1,(yb-y)/(yb-yt||1))), rx=rx0*(1+bulge*Math.sin(Math.PI*zf));
    for(let x=Math.max(0,Math.floor(cx-rxm-1));x<=Math.min(W-1,Math.ceil(cx+rxm+1));x++){
      const s=(x+.5-cx)/rx; if(s<-1||s>1) continue; const e=Math.sqrt(1-s*s)*ry, py=y+.5;
      if(top&&Math.abs(py-yt)<=e) fb[y*W+x]=top(s,(py-yt)/(e||1));
      else if(py>yt+(top?e:-e)&&py<=yb+e) fb[y*W+x]=body(z0+(yb+e-py)/camera.z,s);
    }
  }
}
/** Light falls from the quay lamps on the left: a cylinder's lit and shadowed flanks. */
const roundLit=s=>.68+.5*Math.max(0,1-(s+.3)*(s+.3))-.18*Math.max(0,s);
/** Oak cask with staves and iron hoops. */
function barrel(i,j,z=0){
  cyl(i,j,.36,z,z+7,(zz,s)=>{ const h=zz-z; if((h>.7&&h<1.3)||(h>5.7&&h<6.3)||(h>2.5&&h<2.9)||(h>4.1&&h<4.5)) return shadeC(C.iron,roundLit(s)*1.4);
    return shadeC(C.wood,roundLit(s)*(.82+(h2(Math.floor((Math.asin(s)+1.6)*3.2),Math.floor(i*9+j))-128)/700)); },
    (s,v)=>Math.abs(v)>.75||Math.abs(s)>.85?shadeC(C.iron,1.3):shadeC(C.woodLight,.8+v*.12),.1);
}
/** Cast-iron mooring bollard with a mushroom cap. */
function bollard(i,j){
  contact(i-.3,j-.3,i+.3,j+.3,0,.6);
  cyl(i,j,.24,0,2.6,(z,s)=>shadeC(C.iron,roundLit(s)*1.5),(s,v)=>shadeC(C.ironHi,1-v*.2));
  cyl(i,j,.33,2.6,3.4,(z,s)=>shadeC(C.iron,roundLit(s)*1.8),(s,v)=>shadeC(C.ironHi,1.15-v*.2));
}
/** Planked shipping crate: battens round each face, a diagonal brace and, sometimes, a stencilled mark. */
function crate(i,j,w,d,h,z=0,tone=0,mark=-1){
  const wood=C.crate[tone%3], i1=i+w, j1=j+d, z1=z+h, sd=h2(Math.floor(i*5),Math.floor(j*5));
  const plank=(u,v,len,seed,k)=>{ if(u<.12||u>len-.12||v<.5||v>h-.5) return shadeC(wood,k*1.08); const p=Math.floor(v/1.7);
    return frac(v/1.7)<.12?shadeC(wood,k*.55):shadeC(wood,k*(.8+(h2(p+seed,sd)-128)/800+vn(u*3,v*.5)*.12)); };
  if(!z) contact(i,j,i1,j1);
  quad(i,j1,z,i1,j1,z,i1,j1,z1,i,j1,z1,(x,y)=>{ const [a,zz]=onJ(j1,x,y); return plank(a-i,zz-z,w,3,.95); });
  quad(i1,j,z,i1,j1,z,i1,j1,z1,i1,j,z1,(x,y)=>{ const [a,zz]=onI(i1,x,y); return plank(a-j,zz-z,d,7,.72); });
  floor(i,j,i1,j1,z1,(x,y)=>{ const [a,b]=ground(x,y,z1), p=(b-j)*3.2; return frac(p)<.14?shadeC(wood,.7):shadeC(wood,1.12+(h2(Math.floor(p),sd)-128)/900); });
  thin(i+.12,j1+.01,z+.5,i1-.12,j1+.01,z1-.5,shadeC(wood,1.1)); thin(i1+.01,j+.12,z+.5,i1+.01,j1-.12,z1-.5,shadeC(wood,.85));
  for(const [a,b,c,dd] of [[i,j1,i1,j1],[i1,j,i1,j1]]){ thin(a,b,z1,c,dd,z1,shadeC(wood,1.25)); }
  thin(i1,j1,z,i1,j1,z1,shadeC(wood,.5));
  if(mark>=0){ const m=i1+.02, jm=j+d/2, zm=z+h/2, ink=rgb('#26201a');
    if(mark%2){ thin(m,jm-.25,zm-1.4,m,jm+.25,zm+1.4,ink); thin(m,jm-.25,zm+1.4,m,jm+.25,zm-1.4,ink); }
    else { thin(m,jm-.3,zm,m,jm,zm+1.5,ink); thin(m,jm,zm+1.5,m,jm+.3,zm,ink); thin(m,jm+.3,zm,m,jm,zm-1.5,ink); thin(m,jm,zm-1.5,m,jm-.3,zm,ink); } }
}
/** Burlap of the sacks the docker carries, and the dusty sacking of the coal sacks. */
const BURLAP=rgb('#76634a'), COALSACK=rgb('#4d473e');
/** Width of a tied sack along its length s (0 bottom .. 1 top), as a share of its half width: a flat, slightly
 * flaring bottom, a full belly, the neck drawn in under the tie, and the gathered tuft above it. Open sacks stop at a wide mouth. */
function sackProfile(s,open){
  if(s<.05) return 1;
  if(open) return s<.9?.86+.12*Math.sin(Math.PI*(s-.05)/.85):.9+(s-.9);
  if(s<.7) return .82+.16*Math.sin(Math.PI*(s-.05)/.75+.15);
  if(s<.84) return lerp(.84,.25,ease((s-.7)/.14));
  if(s<.88) return .22;
  const u=(s-.88)/.12; return (.28+.3*Math.sin(Math.PI*Math.min(1,u*1.5)*.5))*Math.sqrt(Math.max(0,1-Math.max(0,(u-.5)/.5)**2));
}
/** A burlap sack in screen space: bottom centre (bx,by), axis (ux,uy) towards the tie, length L and half width w in pixels.
 * depth pixels of darker underside give a lying sack its thickness; an open sack shows its mouth, coal inside if fill > 0. */
function sackShape(bx,by,ux,uy,L,w,col,depth=0,open=false,fill=0){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, nx=-uy, ny=ux, R=Math.ceil(L+w)+2, seed=19;
  const at=(px,py)=>{ const s=(px*ux+py*uy)/L; if(s<0||s>1) return null; const t=(px*nx+py*ny)/(w*sackProfile(s,open)); return Math.abs(t)<=1?[s,t]:null; };
  for(let y=Math.max(0,Math.floor(by-R));y<=Math.min(H-1,Math.ceil(by+R+depth));y++) for(let x=Math.max(0,Math.floor(bx-R));x<=Math.min(W-1,Math.ceil(bx+R));x++){
    let hit=null, d=0; for(;d<=depth;d++){ hit=at(x+.5-bx,y+.5-by-d); if(hit) break; } if(!hit) continue;
    const [sx,tx]=hit, lx=x-bx, ly=y-by, weave=.07*vn(lx*.8+seed,ly*.8)+.04*((Math.floor(lx)+Math.floor(ly)*2)%3===0?1:0);
    const grime=vn(lx*.22+seed*.1,ly*.25), stain=Math.max(0,vn(lx*.12+seed,ly*.14)-.6)*1.6;
    let k=(d>0?.55+weave:.82+.26*(1-tx*tx)-.16*tx+weave)*(.84+.22*grime)*(1-stain*.35);
    if(!open&&sx>.68&&sx<.84) k*=.82+.18*Math.abs(Math.sin(tx*4+sx*20));
    if(!open&&sx>=.84&&sx<=.88) { fb[y*W+x]=shadeC(rgb('#5c4a32'),d?.6:1.05-.2*tx); continue; }
    if(tx>.82&&sx<.7&&d===0) k*=(Math.floor(sx*L)&1)?1.18:.92;
    if(Math.abs(tx)>.86||sx<.03) k*=.68;
    if(open&&sx>.92&&d===0){ fb[y*W+x]=fill>.1?coalAt(x,y,.7+.4*fill):INSIDE; continue; }
    fb[y*W+x]=shadeC(col,k);
  }
}
/** A tied sack between upright (tilt 0) and lying along the ground direction (di,dj) (tilt 1), centred on world point c. */
function sackAt(c,di,dj,tilt,col=BURLAP){
  const sx=camera.ix*di+camera.jx*dj, sy=camera.iy*di+camera.jy*dj, l=Math.hypot(sx,sy)||1, L=lerp(15,1.05*l,tilt);
  let ux=lerp(0,sx/l,tilt), uy=lerp(-1,sy/l,tilt); const n=Math.hypot(ux,uy)||1; ux/=n; uy/=n;
  sackShape(isoX(c[0],c[1])-ux*L/2,isoY(...c)-uy*L/2,ux,uy,L,4.4,col,Math.round(3*tilt));
}
/** A tied sack lying along i (dir 1) or j (dir -1), its underside at z. */
function sack(i,j,z,dir=1,col=BURLAP){ sackAt([i,j,z+1.5],dir>0?1:0,dir>0?0:1,1,col); }
/** Glossy black coal lumps at a picture pixel, brightness k: lit facets towards the upper left, dark gaps between lumps. */
function coalAt(x,y,k){
  x-=camera.x; y-=camera.y;
  const cx=Math.floor(x/3), cy=Math.floor(y/2.4); let best=9, sh=0, h=0;
  for(let dy=-1;dy<=1;dy++) for(let dx=-1;dx<=1;dx++){ const gx=cx+dx, gy=cy+dy, n=h2(gx,gy), px=gx*3+1.5+((n&15)/15-.5)*2, py=gy*2.4+1.2+((n>>4)/15-.5)*1.6, d=Math.hypot((x-px)/1.7,(y-py)/1.2);
    if(d<best){ best=d; sh=-(x-px)*.25-(y-py)*.45; h=n; } }
  if(best>.88) return shadeC(C.coal,.45*k);
  const lit=Math.max(0,sh+.3)*(1-best*.6);
  return mix(shadeC(C.coal,k*(.75+(h&7)*.05)),rgb('#77818c'),Math.min(.75,lit*lit*.9*k));
}
/** Tarpaulin stretched over stacked cargo, lashed down with rope. */
function tarpCargo(i,j,w,d,h){
  const i1=i+w, j1=j+d, cv=(x,y,k)=>shadeC(C.canvas,k*(.82+.35*vn((x-camera.x)*.12,(y-camera.y)*.5)));
  contact(i,j,i1,j1);
  quad(i,j1+.1,0,i1,j1+.1,0,i1-.1,j1-.15,h,i+.1,j1-.15,h,(x,y)=>cv(x,y,.9));
  quad(i1+.1,j,0,i1+.1,j1+.1,0,i1-.1,j1-.15,h,i1-.1,j+.1,h,(x,y)=>cv(x,y,.7));
  floor(i+.1,j+.1,i1-.1,j1-.15,h,(x,y)=>cv(x,y,1.15));
  for(let a=i+.6;a<i1;a+=1.2){ thin(a,j+.1,h+.05,a,j1-.15,h+.05,C.rope); thin(a,j1-.15,h,a+.03,j1+.1,0,C.rope); }
  for(let b=j+.6;b<j1;b+=1.4) thin(i1-.1,b,h,i1+.1,b+.03,0,C.rope);
}
/** A weathered autumn tree: furrowed bark, fine branches and a crown stirred by the wind. */
function autumnTree(t){
  const i=27.65,j=1.7, leaves=['#544d38','#62583b','#756641','#897449','#78533b','#906749','#a09262'].map(rgb);
  const wind=Math.sin(t*.016)*.11+Math.sin(t*.007+.8)*.07;
  for(let k=0;k<120;k++){
    const a=h2(k,31)/255*Math.PI*2, r=.35+2.05*Math.sqrt(h2(k,37)/255), di=Math.cos(a)*r,dj=Math.sin(a)*r*.65;
    thin(i+di,j+dj,.08,i+di+.09,j+dj+.04,.08,leaves[h2(k,41)%leaves.length]);
  }
  contact(i-.28,j-.28,i+.28,j+.28,0,.58);
  const trunk=['#29241e','#4b4032','#77664c'];
  withRamps(trunk,trunk,r=>{
    for(const [di,dj] of [[-.32,.05],[.25,.16],[.08,-.3]]) rod([i+di,j+dj,.1],[i,j,3],2.4,3.4,r);
    rod([i,j,0],[i+.02,j,12],6,4.8,r);
    rod([i+.02,j,12],[i+.06,j,23],4.8,2.7,r);
    const branches=[[-1.25,-.2,31],[1.32,.2,32],[-.5,1,34],[.35,-.9,35],[-1.45,.6,28],[1.2,-.8,29],[-.3,.15,36]];
    branches.forEach(([di,dj,z],k)=>{
      const base=[i+.04,j,15+(k%3)*1.4], mid=[i+di*.52+wind*.35,j+dj*.52,22+(k%3)], end=[i+di+wind,j+dj,z];
      rod(base,mid,2.7,1.55,r); rod(mid,end,1.6,.45,r);
      rod(mid,[i+di*.8+wind*.8,j+dj+.28,z-1.4],1,.25,r);
    });
  });
  for(let k=0;k<14;k++){
    const z=1+(k*1.71)%20, side=(k%3-1)*.085;
    thin(i+side,j+.12,z,i+side+.025,j+.12,z+1.3+(k%3)*.4,rgb(k%2?'#30291f':'#897357'));
  }
  const clusters=[[-1.1,-.2,30,11,7],[1.05,.2,31,12,8],[-.45,.75,33,11,8],[.35,-.65,34,12,8],[-1.15,.5,27,9,6],[1.05,-.5,28,10,7],[-.1,.1,36,9,6]];
  for(let c=0;c<clusters.length;c++){
    const [di,dj,z,rx,ry]=clusters[c], sway=wind*(.7+c*.05)+Math.sin(t*.024+c*1.7)*.025, cx=isoX(i+di+sway,j+dj),cy=isoY(i+di+sway,j+dj,z);
    for(let k=0;k<105;k++){
      const seed=k+c*131, angle=h2(seed,43)/255*Math.PI*2, radius=Math.sqrt(h2(seed,47)/255);
      const x=Math.round(cx+Math.cos(angle)*radius*rx),y=Math.round(cy+Math.sin(angle)*radius*ry);
      const col=shadeC(leaves[h2(seed,53)%leaves.length],.68+.26*(1-radius)+.08*Math.max(0,-Math.sin(angle)));
      line(x,y,x+1+(k%3===0?1:0),y,col,col);
    }
  }
  for(let k=0;k<3;k++){
    const u=frac(t/420+k/3), a=k*2.1, x=i+Math.sin(a+u*4)*.5+wind, y=j+Math.cos(a)*.5+u*.7;
    thin(x,y,30*(1-u),x+.09,y+.04,30*(1-u),leaves[(k+3)%leaves.length]);
  }
}
/** Victorian gas lamp: plinth, fluted column, ladder bar and a tapered four-pane lantern. */
function lantern(i,j,z,k,t){
  const frame=C.iron, gl=(x,y)=>{ const [, zz]=onJ(j+.21,x,y); return mix(C.litD,C.flame,Math.max(0,Math.min(1,(1-Math.abs(zz-z+.3)/2.2)*k))); };
  quad(i-.15,j+.15,z-2.2,i+.15,j+.15,z-2.2,i+.27,j+.27,z+1.8,i-.27,j+.27,z+1.8,gl);
  quad(i+.15,j-.15,z-2.2,i+.15,j+.15,z-2.2,i+.27,j+.27,z+1.8,i+.27,j-.27,z+1.8,(x,y)=>shadeC(gl(x,y),.86));
  thin(i-.15,j+.15,z-2.2,i-.27,j+.27,z+1.8,frame); thin(i+.15,j+.15,z-2.2,i+.27,j+.27,z+1.8,frame); thin(i+.15,j-.15,z-2.2,i+.27,j-.27,z+1.8,frame);
  thin(i-.15,j+.15,z-2.2,i+.15,j+.15,z-2.2,frame); thin(i+.15,j-.15,z-2.2,i+.15,j+.15,z-2.2,frame);
  quad(i-.32,j+.32,z+1.8,i+.32,j+.32,z+1.8,i,j,z+3.6,i,j,z+3.6,()=>shadeC(frame,1.6));
  quad(i+.32,j-.32,z+1.8,i+.32,j+.32,z+1.8,i,j,z+3.6,i,j,z+3.6,()=>shadeC(frame,1.15));
  thin(i-.32,j+.32,z+1.8,i+.32,j+.32,z+1.8,C.ironHi); thin(i,j,z+3.6,i,j,z+4.6,frame);
}
/** A quay lamp standing on the setts. */
function gasLamp(i,j,k,t){
  contact(i-.35,j-.35,i+.35,j+.35,0,.6);
  cyl(i,j,.3,0,1.6,(z,s)=>shadeC(C.iron,roundLit(s)*1.6),(s,v)=>shadeC(C.ironHi,1.1));
  cyl(i,j,.2,1.6,3.4,(z,s)=>shadeC(C.iron,roundLit(s)*(z>2.9?2:1.5)),(s,v)=>shadeC(C.ironHi,1));
  cyl(i,j,.12,3.4,22.6,(z,s)=>shadeC(C.iron,roundLit(s)*(frac(s*2.2+.5)<.3?1.05:1.6)*(z>20.5&&z<21.3?1.4:1)));
  stroke(i-.5,j,21,i+.5,j,21,C.iron); thin(i-.5,j,21.6,i+.5,j,21.6,C.ironHi);
  lantern(i,j,25.2,k,t);
}
/** A lantern on a scrolled iron bracket fixed to a wall face. */
function wallLamp(l,k,t){
  const out=l.wall==='j'?[0,1]:[1,0], bi=l.i-out[0]*.95, bj=l.j-out[1]*.95;
  stroke(bi,bj,l.z+2.6,l.i,l.j,l.z+2.6,C.iron); thin(bi,bj,l.z-1.4,l.i-out[0]*.4,l.j-out[1]*.4,l.z+2.6,C.iron);
  thin(l.i,l.j,l.z+2.6,l.i,l.j,l.z+1.8,C.iron);
  lantern(l.i,l.j,l.z-1,k,t);
}
/** Puffs of smoke or breath rising from a point and drifting with the wind, each fading as it grows. */
function smoke(i,j,z,t,seed,n=7,period=420,col=C.smoke,size=1){
  for(let k=0;k<n;k++){
    const age=frac((t+seed*97)/period+k/n), a=age*period, x=isoX(i,j)+a*.09*size+Math.sin(a*.02+k)*1.5*size, y=isoY(i,j,z)-a*.13*size;
    const r=(1.5+a*.03)*size; spot(x,y,r*1.25,r,.55*Math.min(1,age*8)*(1-age)**1.3,col);
  }
}

/** Draw a person using the same model and scale as the exploration rooms. */
function dockPerson(i,j,sitting=false,z0=0,fi=1,fj=0){
  const A=appearanceState, C0={i,j,fi,fj,z0}, joint=s=>sitting?{
    hip:[0,s*1.2,4.2],knee:[2.4,s*1.3,4],foot:[3,s*1.4,.9],sh:[.1,s*2.7,9.4],el:[.8,s*3,7],hd:[2,s*3,5.6]
  }:{hip:[0,s*1.2,7.2],knee:[.7,s*1.3,3.8],foot:[0,s*1.4,.9],sh:[.1,s*2.7,12.4],el:[-.2,s*3.5,9.9],hd:[.6,s*3.7,8]};
  joint.pel=[0,0,sitting?3.8:6.6];joint.chest=[.4,0,sitting?9:12.2];joint.head=[.35,0,sitting?12.4:15.6];
  withCellOutfit(()=>figureHD(C0,joint,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'flatcap',stubble:true},{noShadow:true}));
}
/** The police van, a "Black Maria", standing where the cabs wait: a tall closed box of blue-black lacquer on coach wheels, beaded panels
 * with a gilt line and the royal cipher, barred vents under the roof, a side door at the back with a grille and an iron step, a constable
 * on the box and a pair of bays. door 0..1: how far the side door stands open (it swings out on its front hinge). */
function policeVan(t,door){
  const dark=rgb('#121416'), trim=rgb('#a78a60'), gilt=rgb('#b8975a'), bead=rgb('#3d4757'), lac=[rgb('#141922'),rgb('#1f2633'),rgb('#2f3949')];
  const i0=6.9, i1=10.25, j0=3.8, j1=5.9, z0=3.4, z1=19.4, N={j:j1}, Fr={i:i1}, D0=7.88, D1=8.72, Dz0=4.4, Dz1=14.4;
  const grain=(c,k)=>(x,y)=>shadeC(c,k*(.86+.2*vn((x-camera.x)*.45,(y-camera.y)*.06)));
  coachWheel(6.95,3.72,5.8,5.7); coachWheel(10.35,3.72,3.0,2.9);
  stroke(7.25,5.8,3,10.35,5.8,3,dark); stroke(7.25,3.8,3,10.35,3.8,3,dark);
  isoBox(i0+.1,j0+.1,i1-.1,j1-.1,z0-.7,z0,dark,dark,dark);
  isoBox(i0,j0,i1,j1,z0,z1,lac[2],lac[1],lac[0],grain(lac[1],1),grain(lac[0],1));
  /* cornice and the flat roof with its rail */
  isoBox(i0-.12,j0-.12,i1+.12,j1+.12,z1,z1+.8,shadeC(lac[2],1.15),shadeC(lac[2],1.05),lac[1]);
  thin(i0-.12,j1+.13,z1+.8,i1+.12,j1+.13,z1+.8,bead); thin(i1+.13,j0-.12,z1+.8,i1+.13,j1+.12,z1+.8,bead);
  for(const a of [i0+.2,(i0+i1)/2,i1-.2]) thin(a,j1,z1+.8,a,j1,z1+1.8,C.iron);
  thin(i0+.2,j1,z1+1.8,i1-.2,j1,z1+1.8,C.ironHi);
  /* beaded panels with a gilt line inside: the back panel, the door and the long front panel with the cipher */
  const panel=(f,a0,a1,zb,zt)=>{ for(const [a,b,c,d,col] of [[a0,zb,a1,zb,bead],[a0,zt,a1,zt,bead],[a0,zb,a0,zt,bead],[a1,zb,a1,zt,bead],[a0+.1,zb+.5,a1-.1,zb+.5,gilt],[a0+.1,zt-.5,a1-.1,zt-.5,gilt],[a0+.1,zb+.5,a0+.1,zt-.5,gilt],[a1-.1,zb+.5,a1-.1,zt-.5,gilt]]) fl(f,a,b,c,d,col); };
  panel(N,i0+.1,D0-.08,z0+.7,z1-3.6); panel(N,8.82,i1-.1,z0+.7,z1-3.6); panel(Fr,j0+.12,j1-.12,z0+.7,z1-3.6);
  lettering(N,8.95,13,'VR',gilt,.75);
  for(const [a,z] of [[9.2,14.6],[9.38,15.1],[9.56,14.6],[9.38,14.3]]) fq(N,a,z,a+.12,z+.5,()=>gilt);
  /* the barred vents along the top of each side */
  for(const [f,a0,a1] of [[N,i0+.2,i1-.2],[Fr,j0+.2,j1-.2]]){ fq(f,a0,z1-2.9,a1,z1-1,()=>INSIDE); fl(f,a0,z1-2.95,a1,z1-2.95,bead); fl(f,a0,z1-.95,a1,z1-.95,bead);
    for(let a=a0+.09;a<a1;a+=.17) fl(f,a,z1-2.9,a,z1-1,C.ironHi); }
  /* the side door: closed, its grille and handle; open, the dark inside with a bench, and the leaf swung out towards the quay */
  const th=Math.max(0,Math.min(1,door))*1.75;
  if(th<.02){ panel(N,D0,D1,Dz0,Dz1); fq(N,8.1,Dz1-3.2,8.5,Dz1-1.4,()=>INSIDE); for(let a=8.16;a<8.5;a+=.11) fl(N,a,Dz1-3.2,a,Dz1-1.4,C.ironHi); fl(N,8.62,9.2,8.62,9.9,gilt); }
  else {
    fq(N,D0,Dz0,D1,Dz1,()=>INSIDE); fq(N,D0,7,D1,7.6,()=>rgb('#1e1a16')); fl(N,D0,7.6,D1,7.6,rgb('#3a3128'));
    const ti=D1-(D1-D0)*Math.cos(th), tj=j1+(D1-D0)*Math.sin(th), lit=.75+.35*Math.cos(th);
    quad(D1,j1+.01,Dz0,ti,tj,Dz0,ti,tj,Dz1,D1,j1+.01,Dz1,()=>shadeC(lac[1],lit));
    for(const z of [Dz0+.6,Dz1-.6]) thin(D1,j1+.02,z,ti,tj,z,gilt);
    thin(ti,tj,Dz0,ti,tj,Dz1,bead);
  }
  isoBox(D0+.05,j1,D1-.05,j1+.42,2.1,2.5,shadeC(C.ironHi,1.2),C.iron,C.iron); for(const a of [D0+.1,D1-.1]) thin(a,j1+.4,2.1,a,j1,z0,C.iron);
  /* near wheels, the lamp at the front corner, the driver's box and footboard */
  coachWheel(6.95,5.95,5.8,5.7); coachWheel(10.35,5.95,3.0,2.9);
  isoBox(10.25,5.8,10.48,6.03,13.2,15.2,dark,C.lamp,rgb('#6f5533')); stroke(10.23,5.9,15.3,10.5,5.9,15.3,trim);
  isoBox(10.25,4.05,10.95,5.65,14.6,15.3,rgb('#3a2c26'),rgb('#2a201c'),rgb('#201814'));
  isoBox(10.95,3.95,11.6,5.65,12.1,12.6,C.woodLight,C.wood,C.woodDark);
  for(const j of [4.1,5.5]){ stroke(10.25,j,11,11.05,j,12.1,dark); stroke(10.25,j,14.6,10.4,j,11.3,dark); }
  const P={i:10.55,j:4.85,fi:1,fj:0,z0:11.4}, hands=[2.8,0,8.6];
  withCellOutfit(()=>{
    const A=appearanceState, navy=['#11151d','#1d2431','#2f3a4d'];
    setRamp(A.R_HSH,navy,false); setRamp(A.R_HSHF,navy,true); setRamp(A.R_HPT,navy,false); setRamp(A.R_HPTF,navy,true); setRamp(A.R_HBELT,['#0c0f15','#1a202c','#2d3647'],false);
    const br=Math.sin(t*.05)*.1, J=s=>({hip:[0,s*1.2,4.2],knee:[2.2,s*1.3,4],foot:[3.9,s*1.4,1.4],sh:[.1,s*2.7,9.4+br],el:[1.5,s*2.8,7.4],hd:[hands[0],s*1.6,hands[2]+.2*Math.sin(t*.031)]});
    J.pel=[0,0,3.8]; J.chest=[.4,0,9+br]; J.head=[.45,0,12.4+br];
    figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HBELT,style:'toque',mustache:true},{noShadow:true});
    const star=toWorld(P,1.8,0,13.9); thin(...star,star[0],star[1],star[2]+.5,rgb('#b49a5a'));
  });
  /* the far horse, the pole between the pair and the splinter bar at the van's front, then the near horse */
  const reins=toWorld(P,...hands);
  horse(t,0,0,dark,trim,reins);
  stroke(10.55,4.15,6.6,10.55,6.95,6.6,C.woodDark); thin(10.55,4.15,7.1,10.55,6.95,7.1,C.woodLight);
  quad(10.35,5.52,3.2,13.95,5.52,9.6,13.95,5.52,10.2,10.35,5.52,3.8,()=>C.wood);
  stroke(10.35,5.52,3.8,13.95,5.52,10.2,C.woodLight); stroke(10.35,5.52,3.1,13.95,5.52,9.5,dark);
  isoBox(13.85,5.42,14.05,5.62,9.5,10.4,C.ironHi,C.iron,C.iron);
  for(const j of [5.05,6.0]) thin(13.95,5.52,10,13.55,j,11.6,dark);
  horse(t,1.35,1.1,dark,trim,reins);
}
/** Run fn with two figure ramps set to the given colours, for spars, furled sails and cargo drawn with taper. */
function withRamps(a,b,fn){ withCellOutfit(()=>{ const A=appearanceState; setRamp(A.R_HSH,a,false); setRamp(A.R_HPT,b,false); fn(A.R_HSH,A.R_HPT); }); }
/** A tapered round body between two world points (spar, furled sail, bundle), outline then fill. */
function rod(p,q,r0,r1,ramp,bl=0){
  const x0=isoX(p[0],p[1]),y0=isoY(...p),x1=isoX(q[0],q[1]),y1=isoY(...q);
  taper(x0,y0,r0,x1,y1,r1,0,ramp,0,-9,-9,0,bl); taper(x0,y0,r0,x1,y1,r1,1,ramp,0,-9,-9,0,bl);
}
/** A rope sagging between two world points. */
function rope(p,q,sag,c=C.ropeD){
  let a=p; for(let k=1;k<=8;k++){ const u=k/8, b=[p[0]+(q[0]-p[0])*u,p[1]+(q[1]-p[1])*u,p[2]+(q[2]-p[2])*u-sag*4*u*(1-u)]; thin(...a,...b,c); a=b; }
}

/** Tarred, flat-bottomed river hull along i: bluff bow at s1, square transom at s0, low sheer. */
function hullShape(o,b){
  const mid=(o.s0+o.s1)/2, half=(o.s1-o.s0)/2, bo=o.s1-o.bow;
  const hw=i=>i>bo?o.w*Math.sqrt(Math.max(0,1-Math.min(1,(i-bo)/o.bow)**3)):o.w*(i<o.s0+1.2?.94+.05*(i-o.s0):1);
  const top=i=>WL+b+o.fb+o.sheer*((i-mid)/half)**2;
  return {hw,top,deck:i=>top(i)-(o.well||.9),jn:i=>o.jc+hw(i),jf:i=>o.jc-hw(i)};
}
/** Draw a hull: its reflection, the far bulwark and the deck, then deck(S) for whatever stands on it, then the near side over it. */
function hull(o,b,t,deck,after){
  const S=hullShape(o,b), n=Math.ceil((o.s1-o.s0)/.25), I=k=>o.s0+(o.s1-o.s0)*k/n, wl=WL+b;
  for(let k=0;k<n;k++){ const a=I(k),c=I(k+1);
    quad(a,S.jn(a),wl,c,S.jn(c),wl,c,S.jn(c),wl-(S.top(c)-wl)*.8,a,S.jn(a),wl-(S.top(a)-wl)*.8,(x,y)=>shadeC(under(x,y),.5+.32*vn((x-camera.x)*.15,(y-camera.y)*.9+t*.03))); }
  for(let k=0;k<n;k++){ const a=I(k),c=I(k+1);
    quad(a,S.jf(a),S.deck(a),c,S.jf(c),S.deck(c),c,S.jf(c),S.top(c),a,S.jf(a),S.top(a),(x,y)=>shadeC(C.bulwark,.85+vn((x-camera.x)*.2,(y-camera.y)*.6)*.25)); }
  quad(o.s0,S.jf(o.s0),S.deck(o.s0),o.s0,S.jn(o.s0),S.deck(o.s0),o.s0,S.jn(o.s0),S.top(o.s0),o.s0,S.jf(o.s0),S.top(o.s0),()=>shadeC(C.bulwark,1.15));
  for(let k=0;k<n;k++){ const a=I(k),c=I(k+1), dz=(S.deck(a)+S.deck(c))/2;
    quad(a,S.jf(a),dz,c,S.jf(c),dz,c,S.jn(c),dz,a,S.jn(a),dz,(x,y)=>{ const [gi,gj]=ground(x,y,dz), p=(gj-o.jc)*2.6+10, pl=Math.floor(p), f=frac(p);
      return shadeC(C.deck,(f<.16?.7:f>.8?1.08:1)*(.82+(h2(pl,Math.floor(gi/4.3+pl*.37))-128)/1000+vn(gi*.35,gj*1.2)*.2)*o.light); }); }
  deck(S);
  for(let k=0;k<n;k++){ const a=I(k),c=I(k+1), ja=S.jn(a), jc=S.jn(c), ta=S.top(a), tc=S.top(c), lit=1+.3*Math.max(-.6,Math.min(1,(ja-jc)/(c-a)));
    quad(a,ja,wl-.3,c,jc,wl-.3,c,jc,tc,a,ja,ta,(x,y)=>shadeC(C.tar,lit*(.78+.5*vn((x-camera.x)*.07+o.s0,(y-camera.y)*.8))));
    quad(a,ja,wl-.3,c,jc,wl-.3,c,jc,wl+.6,a,ja,wl+.6,(x,y)=>shadeC(C.slime,lit*(.75+.4*vn((x-camera.x)*.3,(y-camera.y)*1.3))));
    for(const f of [.3,.5,.68]) thin(a,ja,wl+(ta-wl)*f,c,jc,wl+(tc-wl)*f,shadeC(C.tar,lit*.55));
    quad(a,ja,ta-1.75,c,jc,tc-1.75,c,jc,tc-1.25,a,ja,ta-1.25,()=>shadeC(C.wale,lit*.9));
    quad(a,ja,ta-.3,c,jc,tc-.3,c,jc,tc+.05,a,ja,ta+.05,()=>shadeC(C.rail,lit));
  }
  for(let k=0;k<4;k++){ const u=frac(t*.0016+k*.27), a=o.s0+.5+u*(o.s1-o.s0-2.5); thin(a,S.jn(a)+.2,wl,a+.7,S.jn(a+.7)+.2,wl,mix(C.water,C.waterHi,Math.sin(u*Math.PI))); }
  if(after) after(S);
  return S;
}
/** The sailing barge moored at the quay: brailed spritsail, leeboards, hatches, wheel and a stove pipe. */
function barge(t){
  const b=Math.sin(t*.021)*.22, o={s0:1.5,s1:21.2,jc:17.2,w:2.6,bow:3.4,fb:6.6,sheer:1.3,light:1}, jc=o.jc;
  const rudder=()=>{ const S=hullShape(o,b); quad(o.s0-.05,jc,WL+b-1,o.s0-1.2,jc,WL+b-1,o.s0-.8,jc,S.top(o.s0)+.8,o.s0-.05,jc,S.top(o.s0)+.8,(x,y)=>shadeC(C.tar,.9+vn((x-camera.x)*.3,(y-camera.y)*.3)*.3)); thin(o.s0-.8,jc,S.top(o.s0)+.8,o.s0-.05,jc,S.top(o.s0)+.8,C.wale); };
  rudder();
  hull(o,b,t,S=>{
    const dk=S.deck(10), mast=[15.2,jc];
    /* deckhouse at the stern, tall enough to stoop through its door */
    const c0=o.s0+.55, c1=o.s0+2.45, cw=1.35, cz=S.deck(5), ch=11, roof=cz+ch, paint=rgb('#3a3b2c'), trim=rgb('#8a7d5c');
    const panel=(a,z,a0,a1)=>{ const u=(a-a0)/(a1-a0), v=(z-cz)/ch; return shadeC(paint,(v<.12||v>.9||frac(u*3)<.05?1.25:1)*(.85+vn(a*3,z*.3)*.25)); };
    isoBox(c0,jc-cw,c1,jc+cw,cz,roof,paint,paint,paint,(x,y)=>{ const [a,z]=onJ(jc+cw,x,y); return panel(a,z,c0,c1); },(x,y)=>{ const [a,z]=onI(c1,x,y); return shadeC(panel(a,z,jc-cw,jc+cw),.78); });
    for(const a of [c0+.35,c0+1.3]){ quad(a,jc+cw+.01,cz+5,a+.55,jc+cw+.01,cz+5,a+.55,jc+cw+.01,cz+8.2,a,jc+cw+.01,cz+8.2,()=>trim);
      quad(a+.08,jc+cw+.02,cz+5.3,a+.47,jc+cw+.02,cz+5.3,a+.47,jc+cw+.02,cz+7.9,a+.08,jc+cw+.02,cz+7.9,(x,y)=>mix(C.litD,C.lit,.35+.5*vn((x-camera.x)*.4+t*.006,(y-camera.y)*.3))); }
    quad(c1+.01,jc-.55,cz+.1,c1+.01,jc+.55,cz+.1,c1+.01,jc+.55,cz+10.4,c1+.01,jc-.55,cz+10.4,()=>shadeC(trim,.75));
    for(const b of [jc-.5,jc+.04]) quad(c1+.02,b,cz+.3,c1+.02,b+.46,cz+.3,c1+.02,b+.46,cz+10.2,c1+.02,b,cz+10.2,(x,y)=>{ const [, z]=onI(c1,x,y); return shadeC(paint,(Math.abs(z-cz-5)<.25||Math.abs(z-cz-9.4)<.2?.6:.9)+vn((x-camera.x)*.3,(y-camera.y)*.3)*.2); });
    thin(c1+.03,jc,cz+.3,c1+.03,jc,cz+10.2,C.black); thin(c1+.03,jc-.3,cz+5,c1+.03,jc-.2,cz+5,rgb('#c9a03a'));
    const ridge=roof+1.2, eave=cw+.2;
    quad(c0-.15,jc-eave,roof,c1+.15,jc-eave,roof,c1+.15,jc,ridge,c0-.15,jc,ridge,(x,y)=>shadeC(rgb('#4a4636'),1.15+vn((x-camera.x)*.2,(y-camera.y)*.4)*.2));
    quad(c0-.15,jc,ridge,c1+.15,jc,ridge,c1+.15,jc+eave,roof,c0-.15,jc+eave,roof,(x,y)=>shadeC(rgb('#4a4636'),.95+vn((x-camera.x)*.2,(y-camera.y)*.4)*.2));
    quad(c1+.15,jc-eave,roof,c1+.15,jc,ridge,c1+.15,jc+eave,roof,c1+.15,jc+eave,roof-.35,()=>shadeC(trim,.8));
    thin(c0-.15,jc+eave,roof,c1+.15,jc+eave,roof,trim); thin(c1+.15,jc-eave,roof,c1+.15,jc,ridge,trim); thin(c1+.15,jc,ridge,c1+.15,jc+eave,roof,trim);
    /* skylight with lit, barred glass, the sliding companion hatch and the stove's chimney */
    const sz=ridge-.2;
    isoBox(c0+.2,jc-.6,c0+1,jc+.6,sz,sz+1,trim,shadeC(trim,.8),shadeC(trim,.65));
    for(const [a,b,k] of [[jc-.6,jc,1.15],[jc,jc+.6,.95]]){ const z0=a<jc?sz+1:sz+1.9, z1=a<jc?sz+1.9:sz+1;
      quad(c0+.2,a,z0,c0+1,a,z0,c0+1,b,z1,c0+.2,b,z1,(x,y)=>mix(C.litD,C.lit,(.3+.5*vn((x-camera.x)*.3+t*.004,(y-camera.y)*.5))*k)); }
    for(let a=c0+.4;a<c0+1;a+=.27){ thin(a,jc-.6,sz+1,a,jc,sz+1.9,C.iron); thin(a,jc,sz+1.9,a,jc+.6,sz+1,C.iron); }
    isoBox(c1-.75,jc-.6,c1+.1,jc+.6,sz,sz+1.2,shadeC(paint,1.3),paint,shadeC(paint,.8));
    thin(c1-.75,jc+.61,sz+1.2,c1+.1,jc+.61,sz+1.2,trim);
    const ci=c0+1.2, cj=jc-.85;
    cyl(ci,cj,.12,roof,roof+6.2,(z,s)=>shadeC(C.iron,roundLit(s)*1.5));
    isoBox(ci-.2,cj-.2,ci+.2,cj+.2,roof+6.2,roof+6.8,C.ironHi,C.iron,C.iron);
    /* main hatch under a lashed tarpaulin, then the fore hatch */
    for(const [h0,h1,hw] of [[6.4,14,1.7],[16.4,18.6,1.2]]){
      const z0=S.deck(h0), z1=z0+1.3, z2=z0+2.2, tarp=(x,y,k)=>shadeC(C.canvas,k*(.8+.4*vn((x-camera.x)*.15,(y-camera.y)*.6)));
      isoBox(h0,jc-hw,h1,jc+hw,z0,z1,C.woodDark,C.tar,C.tar);
      quad(h0,jc-hw,z1,h1,jc-hw,z1,h1,jc,z2,h0,jc,z2,(x,y)=>tarp(x,y,1.12));
      quad(h0,jc,z2,h1,jc,z2,h1,jc+hw,z1,h0,jc+hw,z1,(x,y)=>tarp(x,y,.92));
      quad(h1,jc-hw,z1,h1,jc,z2,h1,jc+hw,z1,h1,jc+hw,z1,(x,y)=>tarp(x,y,.75));
      for(let a=h0+.5;a<h1;a+=1.15){ thin(a,jc-hw,z1,a,jc,z2+.05,C.rope); thin(a,jc,z2+.05,a,jc+hw,z1,C.rope); }
      thin(h0,jc+hw+.01,z1-.4,h1,jc+hw+.01,z1-.4,C.woodLight);
    }
    /* windlass: two oak bitts, the barrel with the anchor chain round it, and the pawl post between */
    const wd=S.deck(19.4);
    for(const b of [jc-1.35,jc+1.05]) isoBox(19.1,b,19.6,b+.35,wd,wd+6,C.woodLight,C.wood,C.woodDark);
    withRamps(['#3a2c1f','#6a5238','#977a54'],['#3a2c1f','#6a5238','#977a54'],r=>rod([19.35,jc-1.05,wd+3.4],[19.35,jc+1.05,wd+3.4],3,3,r));
    for(let k=0;k<4;k++){ const b=jc-.45+k*.22; thin(19.35,b,wd+2.4,19.38,b+.06,wd+4.4,C.ironHi); }
    isoBox(19.25,jc-.12,19.5,jc+.12,wd,wd+3.6,C.woodLight,C.wood,C.woodDark);
    rope([19.4,jc+.2,wd+2],[20.9,S.jn(20.9)-.3,S.top(20.9)],.4,C.ironHi);
    for(const b of [jc-1.45,jc+1.45]) thin(19.35,b,wd+3.4,19.8,b,wd+5.6,C.iron);
    /* mizzen, mast and topmast */
    cyl(o.s0+.5,jc,.07,S.deck(2),S.deck(2)+22,(z,s)=>shadeC(C.woodLight,roundLit(s)));
    isoBox(14.85,jc-.4,15.55,jc+.4,dk,dk+3.2,C.woodLight,C.wood,C.woodDark);
    cyl(...mast,.13,dk,dk+58,(z,s)=>shadeC(rgb('#8e734f'),roundLit(s)*(z>dk+56?.7:1)));
    cyl(15.22,jc,.08,dk+52,dk+74,(z,s)=>shadeC(rgb('#9a7f58'),roundLit(s)));
    withRamps(['#3e1a10','#6e2f1b','#99482a'],['#3a2a1c','#6b5336','#937552'],(sail,spar)=>{
      rod([o.s0+.4,jc,S.deck(2)+3],[o.s0-1,jc,S.deck(2)+19],1.1,.7,spar);
      rod([o.s0+.6,jc,S.deck(2)+5],[o.s0+.2,jc,S.deck(2)+17],1.6,1,sail);
      rod([14.75,jc+.05,dk+6],[14.55,jc+.05,dk+54],4.2,2.6,sail,3); rod([14.7,jc+.08,dk+20],[14.6,jc+.08,dk+46],2.4,2,sail,1.5);
      rod([15.2,jc+.05,dk+57],[15.2,jc+.05,dk+70],1.5,1.1,sail);
      rod([15,jc+.12,dk+3.5],[5.2,jc+.12,dk+60],1.5,1,spar);
      rod([10.2,jc+.15,dk+30],[5.4,jc+.15,dk+58.5],2.6,1.3,sail,.8);
      rod([o.s1-.1,jc,S.top(o.s1)+1.2],[18.4,jc,dk+20],2.2,1.2,sail,.7);
    });
    for(let z=dk+11;z<dk+52;z+=6.8) thin(15.15,jc+.3,z,14.15,jc+.3,z-.8,C.rope);
    const head=[15.2,jc,dk+55], peak=[5.2,jc,dk+60];
    thin(...head,o.s1,jc,S.top(o.s1)+1.5,C.ropeD); thin(15.22,jc,dk+74,o.s1,jc,S.top(o.s1)+1.2,C.ropeD);
    for(const [i,j] of [[14,S.jf(14)],[16,S.jf(16)]]) thin(...head,i,j,S.top(i),C.ropeD);
    thin(...peak,15.2,jc,dk+66,C.ropeD); thin(...peak,o.s0+.6,S.jf(o.s0+.6),S.top(o.s0)+.4,C.ropeD);
    const flap=Math.sin(t*.13)*.25+Math.sin(t*.31)*.12;
    quad(15.22,jc,dk+74,15.22,jc,dk+75.6,14.3,jc+flap,dk+75.4+flap,14.3,jc+flap,dk+74.4+flap,()=>rgb('#8c2b1d'));
    for(const [i,j] of [[14,S.jn(14)],[16,S.jn(16)]]) thin(...head,i,j,S.top(i),C.ropeD);
    thin(...peak,o.s0+.6,S.jn(o.s0+.6),S.top(o.s0)+.4,C.ropeD);
    bargeman(t,S,o);
  },S=>{
    /* leeboard hung on the near side, and the anchor stowed on the bow */
    const j=S.jn(12.5)+.12, z0=S.top(12.5)-.2;
    quad(12.1,j,z0,13.1,j,z0,14.7,j,WL+b+1.5,10.6,j,WL+b+.7,(x,y)=>{ const [a]=onJ(j,x,y); return shadeC(C.tar,(frac(a*1.6)<.12?.6:1.05)*(.85+vn((x-camera.x)*.2,(y-camera.y)*.5)*.3)); });
    thin(12.1,j,z0,10.6,j,WL+b+.7,C.wale); thin(12.6,j+.01,z0+.3,12.6,j+.01,z0-3,C.ironHi);
    thin(12.6,j,z0,S.top(16),S.jn(16)+.05,S.top(16)+.5,C.iron);
    const ai=19.7, aj=S.jn(ai)+.1, az=S.top(ai)-.8;
    stroke(ai,aj,az,ai-.15,aj,az-4,C.iron); thin(ai-.5,aj,az-3.2,ai-.15,aj,az-4.2,C.iron); thin(ai+.25,aj,az-3,ai-.15,aj,az-4.2,C.iron);
  });
  const S=hullShape(o,b); return {...S,o,chimney:[o.s0+1.75,o.jc-.85,S.deck(5)+11+1.2+7]};
}
/** A point and heading at distance d along a polyline of [i,j] points. */
function along(path,d){
  for(let k=0;k<path.length-1;k++){ const a=path[k], b=path[k+1], L=Math.hypot(b[0]-a[0],b[1]-a[1]); if(d<=L||k===path.length-2){ const u=Math.min(1,d/L); return [lerp(a[0],b[0],u),lerp(a[1],b[1],u),Math.atan2(b[1]-a[1],b[0]-a[0])]; } d-=L; }
}
const pathLen=path=>path.slice(1).reduce((s,p,k)=>s+Math.hypot(p[0]-path[k][0],p[1]-path[k][1]),0);
/** The bargeman's round on deck: he stands by the deckhouse door, walks forward along the side deck to the shrouds,
 * tests them with a hand, and walks back. Durations in ticks; he walks .012 tiles a tick. */
function bargeman(t,S,o){
  const jc=o.jc, side=jc+2.05, path=[[o.s0+3,jc+.3],[o.s0+3.5,side],[14.4,side]], L=pathLen(path), walk=L/.012;
  const run=[['door',260],['out',walk],['shroud',200],['back',walk]], total=run.reduce((a,p)=>a+p[1],0);
  let u=frac(t/total)*total, k=0; while(u>=run[k][1]){ u-=run[k][1]; k++; } const part=run[k][0], v=u/run[k][1];
  let i,j,a,J;
  const stand=(look,reach)=>{ const br=Math.sin(t*.045)*.08, J=s=>({hip:[0,s*1.2,7.2],knee:[.6,s*1.3,3.8],foot:[s>0?.3:-.2,s*1.45,.9],sh:[.2,s*2.6,12.3+br],
      el:reach&&s>0?[1.2,s*3.2,13.6]:[0,s*3.4,9.9+br],hd:reach&&s>0?[1.8,s*2.6,16.4]:[.3,s*3.6,7.9+br]}); J.pel=[0,0,6.6];J.chest=[.3,0,12.2+br];J.head=[.4+look*.3,look*.5,15.6+br]; return J; };
  if(part==='door'){ [i,j]=path[0]; const arrive=Math.atan2(path[0][1]-path[1][1],path[0][0]-path[1][0]), leave=arrive+Math.PI;
    a=v<.12?turnTo(arrive,Math.PI,v/.12):v<.85?Math.PI:turnTo(Math.PI,leave,(v-.85)/.15); J=stand(Math.sin(t*.01),false); }
  else if(part==='shroud'){ [i,j]=path[2]; a=turnTo(0,Math.PI/2,ease(v*5)); if(v>.8) a=turnTo(Math.PI/2,Math.PI,ease((v-.8)*5)); J=stand(0,v>.2&&v<.75); }
  else { const d=part==='out'?v*L:L-v*L; [i,j,a]=along(path,d); if(part==='back') a+=Math.PI; J=walkJoints(d/TRIP.cycle,false,1); }
  const P={i,j,fi:Math.cos(a),fj:Math.sin(a),z0:S.deck(i)};
  docker(P,J,['#1f2524','#333d3c','#4f5b5a']);
}
/** A dumb lighter loaded with coal, moored beyond the barge. */
function lighter(t){
  const b=Math.sin(t*.017+1)*.2, o={s0:22.5,s1:31.4,jc:16.5,w:2.2,bow:1.6,fb:4.6,sheer:.5,light:.9}, jc=o.jc;
  return hull(o,b,t,S=>{
    const z0=S.deck(27);
    isoBox(23.6,jc-1.6,30.2,jc+1.6,z0,z0+.9,C.woodDark,C.tar,C.tar);
    coalMound([{i:25.3,j:jc-.15,ri:1.9,rj:1.55,h:10},{i:27.9,j:jc+.15,ri:2.1,rj:1.5,h:8},{i:29.3,j:jc-.2,ri:1.2,rj:1.3,h:5}],Math.round((z0+.9)*2)/2,11);
    stroke(29.35,jc+.75,z0+3.6,29.75,jc+.6,z0+9.5,C.woodLight); stroke(29.15,jc+.77,z0+3.3,29.55,jc+.77,z0+3.8,C.iron);
  });
}
/** A lighterman sculling a skiff slowly downriver. */
function skiff(t){
  const L=70, u=frac(t*.0019/L*12), s0=-16+u*L, b=Math.sin(t*.05)*.12, o={s0,s1:s0+5.2,jc:27.5,w:.85,bow:1.8,fb:2.4,sheer:.6,well:1.8,light:.75}, jc=o.jc, ph=t*.045;
  hull(o,b,t,S=>{
    const dz=S.deck(s0+2.4), lock=S.top(s0+2.4)+.2, sw=Math.sin(ph), dip=Math.cos(ph)>0?-.8:.9;
    thin(s0+2.2,jc-.8,lock,s0+2.3+sw*.9,jc-3.4,WL+b+dip,C.woodLight);
    dockPerson(s0+2.2,jc,true,dz-3.2,1,0);
    thin(s0+2.2,jc+.8,lock,s0+2.3+sw*.9,jc+3.4,WL+b+dip,C.woodLight);
  });
  for(let k=0;k<3;k++){ const a=frac(t*.004+k/3); spot(isoX(s0-a*3,jc),isoY(s0-a*3,jc,WL),3+a*5,1.2+a*1.4,.25*(1-a),C.waterHi); }
}
/** Timber jib crane on a granite plinth by the lighter: centre, jib reach and the height of its head. */
const CRANE={i:26.8,j:11.25,reach:4.65,head:29};
/** Parts of one round of the crane, in ticks: dig a tubful from the lighter, swing it round, drop it on the quay heap, swing back. */
const CRANE_RUN=[['down',120],['dig',70],['up',130],['swingOut',230],['lower',60],['dump',110],['lift',60],['swingBack',230]];
const CRANE_T=CRANE_RUN.reduce((a,p)=>a+p[1],0);
/** The coal heap on the quay grows with every tubful until it is full size: radius in tiles and height. */
function heapAt(n){ const s=Math.min(1,.35+n*.07); return {r:.85+.9*s,h:2.6+7.4*s}; }
/** The crane at tick t: jib angle, tub height and how full it is. */
function craneAt(t,deck){
  const n=Math.floor(t/CRANE_T); let u=t-n*CRANE_T, k=0; while(u>=CRANE_RUN[k][1]){ u-=CRANE_RUN[k][1]; k++; }
  const part=CRANE_RUN[k][0], v=u/CRANE_RUN[k][1], heap=heapAt(n+(k>5||part==='dump'?ease(part==='dump'?v:1):0));
  const travel=19, dig=deck+6.5, drop=heapAt(n).h+5.5, out=Math.PI/2, back=3*Math.PI/2;
  const z={down:lerp(travel,dig,ease(v)),dig:dig-.6*Math.sin(Math.PI*v),up:lerp(dig,travel,ease(v)),swingOut:travel,lower:lerp(travel,drop,ease(v)),dump:drop,lift:lerp(drop,travel,ease(v)),swingBack:travel}[part];
  const a={swingOut:lerp(out,back,ease(v)),swingBack:lerp(back,out,ease(v))}[part]??(k>3&&k<7?back:out);
  const fill={dig:ease(v),dump:1-ease(v)}[part]??(k>1&&k<5?1:0), settle=part==='lower'||part==='down'?1-v:part==='dump'||part==='dig'?0:part==='up'||part==='lift'?.3:1;
  return {part,v,n,a,z,fill,heap,pour:part==='dump'?Math.sin(Math.PI*Math.min(1,v*1.3)):0,sway:settle*(part.startsWith('swing')?Math.sin(Math.PI*v):.5)};
}
/** Where the hook hangs: under the jib head, swinging a little after the jib stops. */
function craneHook(t,K){ const s=.12*K.sway*Math.sin(t*.07); return [CRANE.i+CRANE.reach*Math.cos(K.a)+s*Math.sin(K.a),CRANE.j+CRANE.reach*Math.sin(K.a)-s*Math.cos(K.a)]; }
/** The crane: plinth, turning timber post, the jib and its iron ties; the winch stays on the plinth beside the post. */
function crane(t,K){
  const {i,j}=CRANE, c=Math.cos(K.a), sn=Math.sin(K.a), head=[i+CRANE.reach*c,j+CRANE.reach*sn,CRANE.head];
  const plank=(f,a0)=>(x,y)=>{ const [a]=f(x,y); return shadeC(C.wood,(frac((a-a0)*5)<.15?.62:1)*(.82+vn((x-camera.x)*.25,(y-camera.y)*.08)*.3)); };
  contact(i-1,j-1,i+1,j+1);
  isoBox(i-.95,j-.95,i+.95,j+.95,0,1.3,shadeC(C.edge,1.05),shadeC(C.stone[1],1.05),shadeC(C.stone[2],.9));
  isoBox(i-.75,j-.75,i+.75,j+.75,1.3,2.1,C.woodLight,C.wood,C.woodDark);
  const jib=()=>{ withRamps(['#3a2c1f','#6a5238','#977a54'],['#3a2c1f','#6a5238','#977a54'],r=>rod([i+.35*c,j+.35*sn,3.4],head,2.3,1.6,r));
    thin(i+.35*c,j+.35*sn,4.4,head[0],head[1],head[2]+.9,C.woodLight); thin(i,j,8.6,i,j,21.6,C.rope); thin(i,j,21.6,...head,C.rope); };
  if(c+sn<0) jib();
  isoBox(i-.3,j-.3,i+.3,j+.3,2.1,21.2,C.woodLight,C.wood,C.woodDark,(x,y)=>plank((x,y)=>onJ(j+.3,x,y),i)(x,y),(x,y)=>shadeC(plank((x,y)=>onI(i+.3,x,y),j)(x,y),.75));
  for(const z of [5,11,17,20.6]){ thin(i-.3,j+.31,z,i+.3,j+.31,z,C.iron); thin(i+.31,j-.3,z,i+.31,j+.3,z,C.iron); }
  isoBox(i-.36,j-.36,i+.36,j+.36,21.2,22,C.ironHi,C.iron,C.iron);
  if(c+sn>=0) jib();
  for(const d of [-.12,.12]) thin(i-sn*d,j+c*d,21.8,head[0]-sn*d,head[1]+c*d,head[2]+.4,C.iron);
  isoBox(head[0]-.18,head[1]-.18,head[0]+.18,head[1]+.18,head[2]-.6,head[2]+1.1,C.ironHi,C.iron,C.iron);
  /* the winch: two timber cheeks, a rope drum and the iron gear wheel the hand turns */
  const w=-K.z*.45;
  for(const b of [j-.45,j+.3]) isoBox(i+.4,b,i+.6,b+.15,2.1,10,C.woodLight,C.wood,C.woodDark);
  withRamps(['#3a2c1f','#6a5238','#977a54'],['#3a2c1f','#6a5238','#977a54'],r=>rod([i+.5,j-.3,8.6],[i+.5,j+.3,8.6],1.8,1.8,r));
  for(let k=0;k<3;k++){ const b=j-.2+k*.2; thin(i+.5,b,7.9,i+.5,b+.05,9.3,C.rope); }
  for(let k=0;k<14;k++){ const p=k*Math.PI/7+w, q=(k+1)*Math.PI/7+w; thin(i+.68,j+Math.cos(p)*.36,8+Math.sin(p)*2.7,i+.68,j+Math.cos(q)*.36,8+Math.sin(q)*2.7,C.edge); }
  for(let k=0;k<4;k++){ const p=k*Math.PI/2+w; thin(i+.68,j,8,i+.68,j+Math.cos(p)*.34,8+Math.sin(p)*2.6,C.iron); }
}
/** The coal heaver by the quay heap: where he shovels, the sack on its iron holder, where he stands to lay sacks down,
 * and the places on his pile of filled sacks [i, j, z, heading], bottom first. */
const HEAVER={i:28.75,j:5.4,sack:[29.25,6.75],drop:[28.95,7.5],pile:[[28.75,8.35,0,1.35],[29.5,8.45,0,.35],[28.9,9.35,0,-.3],[29.55,9.4,0,1.8],[29.15,8.85,2.2,.75],[29.2,9.05,4.4,-.5]],per:8,v:.014};
/** One shovelful: dig into the heap, lift, swing round to the sack, tip it in, swing back. */
const SHOVEL=[['dig',52],['lift',28],['toSack',36],['tip',32],['toHeap',36]];
const CARRY=Math.hypot(HEAVER.drop[0]-HEAVER.i,HEAVER.drop[1]-HEAVER.j)/HEAVER.v;
/** After eight shovelfuls: tie the sack, shoulder it, carry it to the pile, lay it down, walk back and turn to the heap. */
const STOW=[['tie',70],['shoulder',50],['carry',CARRY],['lay',60],['back',CARRY],['turn',24]];
const SHOVEL_T=SHOVEL.reduce((a,p)=>a+p[1],0), STOW_T=STOW.reduce((a,p)=>a+p[1],0), SACK_T=SHOVEL_T*HEAVER.per+STOW_T;
/** The heaver's state at tick t: which part of his work, how full the sack is, how many sacks lie on the pile. */
function heaverAt(t){
  const n=Math.floor(t/SACK_T); let u=t-n*SACK_T;
  if(u>=SHOVEL_T*HEAVER.per){ u-=SHOVEL_T*HEAVER.per; let k=0; while(u>=STOW[k][1]){ u-=STOW[k][1]; k++; }
    return {part:STOW[k][0],v:u/STOW[k][1],fill:1,done:n+(k>3?1:0),stow:true}; }
  const m=Math.floor(u/SHOVEL_T); u-=m*SHOVEL_T; let k=0; while(u>=SHOVEL[k][1]){ u-=SHOVEL[k][1]; k++; }
  const part=SHOVEL[k][0], v=u/SHOVEL[k][1];
  return {part,v,fill:(m+(k>3||part==='tip'&&v>.5?1:0))/HEAVER.per,done:n};
}
/** Place on the pile for the sack laid n-th; once the pile is full the last place is reused. */
const pileSlot=n=>HEAVER.pile[Math.min(n,HEAVER.pile.length-1)];
/** The coal heaver shovelling from the quay heap into a sack held open on an iron stand, then carrying each full sack to his pile. */
function heaver(t,heapR){
  const S=heaverAt(t), Hh=[CRANE.i,CRANE.j-CRANE.reach], [si,sj]=HEAVER.sack, v=S.v, home=[HEAVER.i,HEAVER.j], drop=HEAVER.drop;
  const toHeap=Math.atan2(Hh[1]-home[1],Hh[0]-home[0]), toSack=Math.atan2(sj-home[1],si-home[0]), out=Math.atan2(drop[1]-home[1],drop[0]-home[0]), slot=pileSlot(S.done);
  /* the iron sack holder: a filling sack, or the full one tied, or a fresh empty one once he has shouldered it */
  const onStand=S.stow?(S.part==='tie'?'tied':'empty'):'open', sh=onStand==='open'?2.8+3.2*S.fill:onStand==='tied'?6.6:2.6;
  contact(si-.4,sj-.4,si+.4,sj+.4,0,.6);
  if(onStand==='tied') sackShape(isoX(si,sj),isoY(si,sj,0),0,-1,lerp(6.2,7.4,ease(v))*camera.z,4.6,COALSACK,0,v<.5,1);
  else sackShape(isoX(si,sj),isoY(si,sj,0),0,-1,sh*camera.z,3.8+.9*(onStand==='open'?S.fill:0),COALSACK,0,true,onStand==='open'?S.fill:0);
  for(const d of [-.42,.42]) thin(si+d*.7,sj-d*.7,0,si+d*.7,sj-d*.7,6.4,C.iron);
  thin(si-.3,sj+.3,6.4,si+.3,sj-.3,6.4,C.iron);
  if(S.stow){ thin(si+.62,sj+.1,.2,si+.42,sj-.25,9,C.woodLight); quad(si+.5,sj+.25,.1,si+.75,sj-.05,.1,si+.78,sj-.05,2,si+.53,sj+.25,2,()=>C.ironHi); }
  let P, J, held=null, tilt=1, dir=[1,0], W0, W1;
  if(!S.stow){
    const a={dig:toHeap,lift:toHeap,toSack:turnTo(toHeap,toSack,v),tip:toSack,toHeap:turnTo(toSack,toHeap,v)}[S.part];
    const reach=Math.max(2.6,(Math.hypot(Hh[0]-home[0],Hh[1]-home[1])-heapR*.9)*7.5);
    const bend=S.part==='dig'?Math.sin(Math.PI*Math.min(1,v*1.15)):S.part==='lift'?.3*(1-v):S.part==='tip'?.25:0;
    const blade=S.part==='dig'?lerp3([4.2,0,4],[reach,0,.8],ease(v*1.6)):S.part==='lift'?lerp3([reach,0,.8],[4.4,0,7],ease(v)):S.part==='tip'?lerp3([4.2,0,7],[3.8,0,5.2],ease(v*2)):[4.3,0,7];
    const rear=[.6-bend*.4,-1.2,8.6-bend*2.4], front=lerp3(rear,blade,.42);
    J=s=>{ const hd=s<0?rear:front;
      return {hip:[-1*bend,s*1.25,7.2-1.9*bend],knee:[.7+1.5*bend+(s>0?.3:0),s*1.45,3.9],foot:[s>0?1.1:-.7,s*1.7,.9],sh:[.2+1.9*bend,s*2.6,12.3-2.8*bend],
        el:[(.2+1.9*bend+hd[0])/2+.2,s*2.9,(12.3-2.8*bend+hd[2])/2-1.2],hd}; };
    J.pel=[-.8*bend,0,6.6-1.8*bend];J.chest=[.3+2*bend,0,12.1-2.8*bend];J.head=[.4+2.8*bend,0,15.4-4*bend];
    P={i:home[0],j:home[1],fi:Math.cos(a),fj:Math.sin(a),z0:0}; W0=toWorld(P,...rear); W1=toWorld(P,...blade);
  } else {
    let i=home[0], j=home[1], a=toSack, bend=0, g=0, loaded=false;
    if(S.part==='tie') bend=Math.sin(Math.PI*v)*.9;
    else if(S.part==='shoulder'){ bend=v<.4?ease(v/.4)*.8:.8*(1-ease((v-.4)/.6)); loaded=v>.4; }
    else if(S.part==='carry'||S.part==='back'){ const d=(S.part==='carry'?v:1-v); i=lerp(home[0],drop[0],d); j=lerp(home[1],drop[1],d); a=S.part==='carry'?out:out+Math.PI; g=v*CARRY*HEAVER.v/TRIP.cycle; loaded=S.part==='carry'; }
    else if(S.part==='lay'){ i=drop[0]; j=drop[1]; a=out; bend=Math.sin(Math.PI*v)*.9; loaded=v<.5; }
    else { a=turnTo(out+Math.PI,toHeap,v); }
    P={i,j,fi:Math.cos(a),fj:Math.sin(a),z0:0};
    const side=(P.fi-P.fj)>=0?1:-1, shoulder=toWorld(P,.2,side*2.4,14.4);
    if(S.part==='carry'||S.part==='back'||S.part==='turn') J=walkJoints(g,loaded,side);
    else { J=s=>{ const hd=S.part==='tie'?[2.6,s*.8,5.2+Math.sin(t*.3+s)*.5]:loaded?(s===side?[.9,s*2.3,16]:[.5,s*3.5,7.7]):[2.6,s*1.1,7-3*bend];
        return {hip:[-1.2*bend,s*1.25,7.2-2.4*bend],knee:[.7+1.7*bend,s*1.45,3.9],foot:[s>0?.6:-.4,s*1.6,.9],sh:[.2+2.2*bend,s*2.6,12.3-3.2*bend],el:[(.2+2.2*bend+hd[0])/2+.3,s*2.9,(12.3-3.2*bend+hd[2])/2-1],hd}; };
      J.pel=[-1*bend,0,6.6-2.2*bend];J.chest=[.3+2.3*bend,0,12.1-3.2*bend];J.head=[.4+3.2*bend,0,15.4-4.6*bend]; }
    if(S.part==='shoulder'&&v>.4){ const u=ease((v-.4)/.6); held=lerp3([si,sj,3.5],shoulder,u); tilt=u; dir=[P.fi,P.fj]; }
    else if(S.part==='carry') { held=shoulder; dir=[P.fi,P.fj]; }
    else if(S.part==='lay'&&v<.5){ const u=ease(v/.5), dest=[slot[0],slot[1],slot[2]+1.5]; held=lerp3(shoulder,dest,u); dir=[lerp(P.fi,Math.cos(slot[3]),u),lerp(P.fj,Math.sin(slot[3]),u)]; }
  }
  docker(P,J,['#2a2724','#45403a','#655d53']);
  if(held) sackAt(held,dir[0],dir[1],tilt,COALSACK);
  if(S.stow) return;
  thin(...W0,...W1,C.woodLight);
  const dx=W1[0]-W0[0], dy=W1[1]-W0[1], L=Math.hypot(dx,dy)||1, ux=dx/L*.22, uy=dy/L*.22, px=-uy*.8, py=ux*.8;
  quad(W1[0]-ux+px,W1[1]-uy+py,W1[2]+.25,W1[0]-ux-px,W1[1]-uy-py,W1[2]+.25,W1[0]+ux-px,W1[1]+uy-py,W1[2]-.15,W1[0]+ux+px,W1[1]+uy+py,W1[2]-.15,()=>C.ironHi);
  const loaded=S.part==='lift'&&v>.3||S.part==='toSack'||S.part==='tip'&&v<.5;
  if(loaded) spot(isoX(W1[0],W1[1]),isoY(...W1)-1.5,2.6,1.6,.95,C.coal);
  if(S.part==='tip'&&v>.2&&v<.8){ const fb=rendererState.fb, Wd=appearanceState.W;
    for(let k=0;k<10;k++){ const f=frac(t*.06+k*.37), x=Math.round(lerp(isoX(W1[0],W1[1]),isoX(si,sj),f)+(h2(k,5)%3-1)), y=Math.round(lerp(isoY(...W1),isoY(si,sj,sh),f)+f*f*3);
      if(x>=0&&y>=0&&x<Wd&&y<appearanceState.H) fb[y*Wd+x]=k%3?shadeC(C.coal,.8):rgb('#59616a'); } }
}
/** The filled coal sacks on the heaver's pile, lying every which way, one more each time he lays a sack down. */
function coalSacks(t){ const n=Math.min(HEAVER.pile.length,heaverAt(t).done); HEAVER.pile.slice(0,n).forEach(p=>sackAt([p[0],p[1],p[2]+1.5],Math.cos(p[3]),Math.sin(p[3]),1,COALSACK)); }
/** Pixels of the coal mounds, kept per camera position and mound shape; the mounds only change while coal is tipped. */
const mounds=new Map();
/** A heap of coal made of one or more irregular cones {i,j,ri,rj,h} rising from height z0: each picture pixel shows the highest
 * slice whose ragged outline (noise round the rim) covers it, shaded darker towards the foot and on the near flank. */
function coalMound(cones,z0,seed){
  const key=camera.x+','+camera.y+','+z0.toFixed(1)+','+cones.map(c=>[c.i,c.j,c.ri,c.rj,c.h].map(v=>v.toFixed(1)).join(':')).join('|');
  let px=mounds.get(key);
  if(!px){ if(mounds.size>40) mounds.clear(); px=[];
    const W=appearanceState.W, Ht=appearanceState.H, top=Math.max(...cones.map(c=>c.h)), step=.45;
    let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(const c of cones) for(const [a,b] of [[-1,-1],[1,-1],[1,1],[-1,1]]){ const x=isoX(c.i+a*c.ri*1.2,c.j+b*c.rj*1.2), y=isoY(c.i+a*c.ri*1.2,c.j+b*c.rj*1.2,z0); x0=Math.min(x0,x); x1=Math.max(x1,x); y0=Math.min(y0,y-c.h*camera.z); y1=Math.max(y1,y); }
    for(let y=Math.max(0,Math.floor(y0));y<=Math.min(Ht-1,Math.ceil(y1));y++) for(let x=Math.max(0,Math.floor(x0));x<=Math.min(W-1,Math.ceil(x1));x++){
      for(let z=top;z>=0;z-=step){ const [gi,gj]=ground(x+.5,y+.5,z0+z); let best=-1;
        for(const c of cones){ if(z>c.h) continue; const u=(gi-c.i)/c.ri, v=(gj-c.j)/c.rj, ang=Math.atan2(v,u), rag=1+.42*(vn(ang*1.9+seed+c.i,z*.45+c.j)-.5), q=(u*u+v*v)/(rag*rag), lim=Math.pow(1-z/c.h,1.25);
          if(q<=lim) best=Math.max(best,q/lim); }
        if(best>=0){ const k=(.5+.6*z/top)*(best>.7?.82:1)*(1.06-.12*Math.sign(gj-cones[0].j)); px.push(y*W+x,coalAt(x,y,k)); break; } } }
    mounds.set(key,px); }
  const fb=rendererState.fb; for(let k=0;k<px.length;k+=2) fb[px[k]]=px[k+1];
}
/** The heap on the setts where the crane tips its tubs: a main cone with a slumped shoulder beside it. */
function coalHeap(i,j,R,Hh){
  contact(i-R*1.2,j-R,i+R*1.2,j+R,0,.5);
  coalMound([{i,j,ri:R,rj:R*.9,h:Hh},{i:i+R*.55,j:j+R*.45,ri:R*.75,rj:R*.7,h:Hh*.55}],0,3);
}
/** The rope, tipping tub and coal falling from its rim onto the heap. */
function craneLoad(t,K){
  const [i,j]=craneHook(t,K), z=K.z, head=[CRANE.i+CRANE.reach*Math.cos(K.a),CRANE.j+CRANE.reach*Math.sin(K.a),CRANE.head];
  thin(...head,i,j,z+8.3,C.rope);
  const tilt=K.part==='dump'?Math.PI*.72*(K.v<.3?ease(K.v/.3):K.v<.75?1:ease((1-K.v)/.25)):0, sn=Math.sin(tilt), cs=Math.cos(tilt);
  const point=(a,b,h)=>[i+(a*cs+h*sn)/7.5,j+b/7.5,z+2.2+h*cs-a*sn];
  for(const a of [-3.15,3.15]) thin(i,j,z+8.3,...point(a,0,2.2),C.iron);
  { const face=(a,b,c,d,col)=>quad(...point(...a),...point(...b),...point(...c),...point(...d),()=>col);
    face([-3,-3,-2.2],[3,-3,-2.2],[3,-3,2.2],[-3,-3,2.2],shadeC(C.ironHi,.7));
    face([3,-3,-2.2],[3,3,-2.2],[3,3,2.2],[3,-3,2.2],shadeC(C.ironHi,.95));
    face([-3,3,-2.2],[3,3,-2.2],[3,3,2.2],[-3,3,2.2],shadeC(C.ironHi,.8));
    face([-3,-3,2.2],[3,-3,2.2],[3,3,2.2],[-3,3,2.2],K.fill>.15?C.coal:INSIDE);
    for(const b of [-3,3]) thin(...point(-3,b,2.2),...point(3,b,2.2),C.ironHi);
  }
  if(K.part==='dump'&&K.v>.28&&K.v<.78){ const fb=rendererState.fb, W=appearanceState.W, top=K.heap.h, rim=point(3,0,2.2);
    for(let k=0;k<26;k++){ const f=frac(t*.035+k*.618), zz=lerp(rim[2],top,f*f), x=Math.round(isoX(rim[0],rim[1])+(h2(k,Math.floor(t*.035+k*.618))%7-3)*(.5+1.2*f)), y=Math.round(isoY(rim[0],rim[1],zz));
      if(h2(k,7)/255>K.pour||x<0||y<0||x+1>=W||y+1>=appearanceState.H) continue; for(const d of [0,1]){ fb[y*W+x+d]=k%4?shadeC(C.coal,.8):rgb('#59616a'); fb[(y+1)*W+x+d]=shadeC(C.coal,.6); } } }
}
/** A point given in a figure's own frame (forward, side, up, in height units) placed in the world. */
const toWorld=(P,f,s,z)=>[P.i+(f*P.fi-s*P.fj)/7.5,P.j+(f*P.fj+s*P.fi)/7.5,z+(P.z0||0)];
/** Draw a docker in his work clothes with the joint function J. */
function docker(P,J,top=['#2b2620','#4a3f31','#6a5a44']){
  const A=appearanceState;
  withCellOutfit(()=>{ setRamp(A.R_HSH,top,false); setRamp(A.R_HSHF,top,true);
    figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'flatcap',stubble:true},{noShadow:true}); });
}
const ease=u=>{ u=Math.max(0,Math.min(1,u)); return u*u*(3-2*u); };
const lerp=(a,b,u)=>a+(b-a)*u, lerp3=(a,b,u)=>[lerp(a[0],b[0],u),lerp(a[1],b[1],u),lerp(a[2],b[2],u)];
/** Begin the scene after the brawl at the fighters' final positions, the camera still on the pair as the fight left it. */
export function startPortAfterFight(hero,fallen){
  Object.assign(player,{i:hero.i,j:hero.j,moving:false,carrying:false,lift:-1});
  portJob.finished=true; clearThamesInput(); resumeThamesPort();
  view.cx=isoX((hero.i+fallen.i)/2,(hero.j+fallen.j)/2); view.cy=isoY((hero.i+fallen.i)/2,(hero.j+fallen.j)/2,9); view.pixelRatio=1; beginScene(()=>beginAfter(hero,fallen),2);
}
/** Diagnostics and art review: the port with the story scene before ('before') or after ('after') the brawl. */
export function startPortScene(kind){
  startThamesPort();
  if(kind==='after') startPortAfterFight({i:15.9,j:6.1},{i:17.5,j:5.2});
  else { Object.assign(player,{i:13.15,j:1.15,fi:0,fj:1}); portJob.delivered=2; beginScene(()=>beginBefore(boxingState.tick)); }
}
/** Interior of the warehouse doorways, where people and goods disappear into the dark. */
const INSIDE=rgb('#0d0c0a');
/** Draw fn as if it stood behind a wall in the plane j = J (the warehouse front by default): only what shows through hole(a,z)
 * is kept, sunk in the dark by dark. */
const behind={buf:new Uint32Array(0)};
function behindFront(fn,hole,dark,J=0){
  const fb=rendererState.fb, W=appearanceState.W; if(behind.buf.length!==fb.length) behind.buf=new Uint32Array(fb.length); behind.buf.set(fb); fn();
  for(let k=0;k<fb.length;k++){ if(fb[k]===behind.buf[k]) continue; const [a,z]=onJ(J,k%W,(k/W)|0); fb[k]=hole(a,z)?mix(fb[k],INSIDE,dark):behind.buf[k]; }
}
const archHole=(a,z)=>z>=0&&a>=12&&a<=14.3&&Math.hypot((a-13.15)/1.15,Math.max(0,z-15.5)/3.5)<=1;
const bayHole=(a,z)=>a>=4.3&&a<=5.9&&z>=50.2&&z<=67;

/** Walking legs: q is the phase of one stride cycle (two steps); returns foot forward offset and lift. */
const stride=q=>{ const D=.62; if(q<D) return [1.6-3.2*q/D,0]; const u=(q-D)/(1-D); return [-1.6+3.2*ease(u),Math.sin(Math.PI*u)]; };
/** Joints of a walking man at stride phase g; loaded = a sack held on the shoulder of side `side`. */
function walkJoints(g,loaded,side){
  const bob=-.22*Math.cos(4*Math.PI*g)-(loaded?.15:0), lean=loaded?.8:.5, swing=stride(frac(g+.5))[0], swing2=stride(frac(g))[0];
  const J=s=>{ const [fx,lift]=stride(frac(g+(s>0?0:.5))), hip=[0,s*1.2,7.2+bob], sw=s>0?swing:swing2;
    return {hip,knee:[fx*.5+.55+lift*.35,s*1.3,(hip[2]+.9+lift)/2+.2],foot:[fx,s*1.4,.9+lift*.9],sh:[lean*.5,s*2.6,12.1+bob],
      el:loaded&&s===side?[.6,s*3.1,14.4+bob]:[.2-sw*.45,s*3.4,9.8+bob],hd:loaded&&s===side?[.9,s*2.3,16+bob]:[.5-sw*.8,s*3.5,7.7+bob]}; };
  J.pel=[0,0,6.6+bob];J.chest=[lean,0,12+bob];J.head=[lean+.2,0,15.3+bob];
  return J;
}

/** Sacks in the stack beside the cab, bottom first; the docker takes the top one each trip. */
const SACKS=[[19.75,6.6,0,1.3],[20.45,6.75,0,.2],[19.8,7.65,0,-.25],[20.5,7.75,0,1.75],[20.05,6.95,2.2,.55],[20.15,7.6,2.2,-.9],[20.05,7.25,4.4,1.1]];
/** The docker's way from the stack to the cart arch of warehouse B and into its dark. */
const ROUTE=[[19.05,7.15],[14.1,1.6],[13.15,.55],[13.15,-1.9]];
const SEG=ROUTE.slice(1).map((p,k)=>Math.hypot(p[0]-ROUTE[k][0],p[1]-ROUTE[k][1])), ROUTE_LEN=SEG.reduce((a,b)=>a+b,0);
/** Ticks of each part of a trip, walking speeds in tiles per tick, and the length of one stride cycle in tiles. */
const TRIP={lift:120,turn:20,inside:170,out:.013,back:.017,cycle:.69};
/** A point and the walking direction at distance d along the route. */
function routeAt(d){
  for(let k=0;k<SEG.length;k++){ if(d<=SEG[k]||k===SEG.length-1){ const a=ROUTE[k], b=ROUTE[k+1], u=Math.min(1,d/SEG[k]); return [lerp(a[0],b[0],u),lerp(a[1],b[1],u),Math.atan2(b[1]-a[1],b[0]-a[0])]; } d-=SEG[k]; }
}
/** Turn from angle a to b the short way round. */
const turnTo=(a,b,u)=>{ let d=b-a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return a+d*ease(u); };
/** Where the docker is in his round trip at tick t. */
function dockerAt(t){
  const tOut=ROUTE_LEN/TRIP.out, tBack=ROUTE_LEN/TRIP.back, cycle=TRIP.lift+TRIP.turn+tOut+TRIP.inside+tBack+TRIP.turn;
  const trip=Math.floor(t/cycle); let u=t-trip*cycle, n=SACKS.length-(trip%4);
  const out0=Math.atan2(ROUTE[1][1]-ROUTE[0][1],ROUTE[1][0]-ROUTE[0][0]);
  if(u<TRIP.lift) return {phase:'lift',u:u/TRIP.lift,i:ROUTE[0][0],j:ROUTE[0][1],a:0,n}; u-=TRIP.lift;
  if(u<TRIP.turn) return {phase:'turn',i:ROUTE[0][0],j:ROUTE[0][1],a:turnTo(0,out0,u/TRIP.turn),n:n-1,loaded:true,g:0}; u-=TRIP.turn;
  if(u<tOut){ const d=u*TRIP.out, [i,j,a]=routeAt(d); return {phase:'out',i,j,a,g:d/TRIP.cycle,n:n-1,loaded:true}; } u-=tOut;
  const end=ROUTE[ROUTE.length-1];
  if(u<TRIP.inside) return {phase:'inside',i:end[0],j:end[1],a:Math.PI/2,n:n-1}; u-=TRIP.inside;
  n=SACKS.length-((trip+1)%4)+1;   /* the stack is topped up while he is out of sight */
  if(u<tBack){ const d=ROUTE_LEN-u*TRIP.back, [i,j,a]=routeAt(d); return {phase:'back',i,j,a:a+Math.PI,g:(ROUTE_LEN-d)/TRIP.cycle,n:n-1}; } u-=tBack;
  return {phase:'turn',i:ROUTE[0][0],j:ROUTE[0][1],a:turnTo(out0+Math.PI,0,u/TRIP.turn),n:n-1,g:0};
}
/** The stack of sacks the docker carries from; n are still on it. */
function sackStack(n){ SACKS.slice(0,n).forEach(p=>sackAt([p[0],p[1],p[2]+1.5],Math.cos(p[3]),Math.sin(p[3]),1)); }
/** The docker and player share the same bend, grasp and shoulder lift. */
function liftSack(P,top,u,side){
  const bend=u<.35?ease(u/.35):u<.45?1:1-ease((u-.45)/.3), up=ease((u-.75)/.25), grab=top[2]+1.4;
  const hand=s=>u<.45?[lerp(.6,3,ease(u/.35)),s*lerp(3.4,1,ease(u/.35)),lerp(7.7,grab+1.2,ease(u/.35))]
      :u<.75?[lerp(3,2.3,ease((u-.45)/.3)),s*1,lerp(grab+1.2,10,ease((u-.45)/.3))]
      :s===side?lerp3([2.3,s*1,10],[.9,s*2.3,16],up):lerp3([2.3,s*1,10],[.5,s*3.5,7.7],up);
  const J=s=>{ const hip=[-1.3*bend,s*1.2,7.2-2.7*bend], hd=hand(s);
      return {hip,knee:[.7+1.9*bend,s*1.4,3.8+.3*bend],foot:[s>0?.5:-.3,s*1.5,.9],sh:[.1+2.3*bend,s*2.6,12.4-3.4*bend],el:[(.1+2.3*bend+hd[0])/2+.4,s*2.9,(12.4-3.4*bend+hd[2])/2-1],hd}; };
  J.pel=[-1.1*bend,0,6.6-2.6*bend];J.chest=[.4+2.4*bend,0,12.2-3.6*bend];J.head=[.4+3.3*bend,0,15.6-5*bend];
  let held=null, tilt=1, dir=[0,0];
  if(u>=.45){ const inHands=toWorld(P,2.4,0,8.5), onShoulder=toWorld(P,.2,side*2.4,14.4);
      const w=ease((u-.45)/.3); held=u<.75?lerp3([top[0],top[1],top[2]+1.5],inHands,w):lerp3(inHands,onShoulder,up); tilt=u<.75?1-.6*w:.4+.6*up;
      dir=u<.75?[lerp(Math.cos(top[3]),P.fi,w),lerp(Math.sin(top[3]),P.fj,w)]:[P.fi,P.fj]; }
  return {J,held,tilt,dir};
}
/** The docker: bends to the stack, heaves a sack up onto his near shoulder, carries it into the cart arch and comes back for the next. */
/** The docker at tick t; once the story begins he puts work aside and watches the trouble from over by the crane. */
const dockerNow=t=>storyBegun()?{phase:'watch',i:24.3,j:7.2,a:-2.93,n:SACKS.length,g:.25}:dockerAt(t);
function sackCarrier(t){
  const D=dockerNow(t); if(D.phase==='inside') return;
  const P={i:D.i,j:D.j,fi:Math.cos(D.a),fj:Math.sin(D.a),z0:0}, side=(P.fi-P.fj)>=0?1:-1;
  let J, held=null, tilt=1, dir=[0,0];
  if(D.phase==='lift'){
    ({J,held,tilt,dir}=liftSack(P,SACKS[D.n-1],D.u,side));
  } else {
    J=walkJoints(D.g,!!D.loaded,side);
    if(D.loaded) held=toWorld(P,.2,side*2.4,14.4+(-.22*Math.cos(4*Math.PI*D.g)-.15));
  }
  const draw=()=>{
    contact(D.i-.35,D.j-.25,D.i+.35,D.j+.25,0,.7);
    docker(P,J); if(held) sackAt(held,dir[0]||P.fi,dir[1]||P.fj,tilt);
  };
  if(D.j<.35) behindFront(draw,archHole,Math.max(0,Math.min(1,(.3-D.j)/1.6))); else draw();
}

/** The hoist at warehouse A: crates stacked under the beam are hauled up one by one to the open loading door. */
const HOIST={i:5.1,j:2.2,pulley:68.8,door:52,stroke:6.5,strokeT:30,crate:5};
/** Where the hoist is in its round at tick t: which crate, its height and the hauler's hands. */
function hoistAt(t){
  const parts=[]; let total=0;
  for(let m=0;m<4;m++){ const z0=HOIST.crate*(3-m), next=m<3?HOIST.crate*(2-m):HOIST.crate*3, strokes=Math.ceil((HOIST.door-z0)/HOIST.stroke);
    const p=[['hook',60],['haul',strokes*HOIST.strokeT],['hold',40],['take',90],['wait',50],['lower',(HOIST.door+8-(next+HOIST.crate+3))/.3]];
    for(const [k,d] of p){ parts.push({m,k,d,start:total,z0,next,strokes}); total+=d; } }
  const u=frac(t/total)*total, P=parts.find(p=>u<p.start+p.d)||parts[parts.length-1], v=(u-P.start)/P.d;
  const lift=P.k==='haul'?Math.min(HOIST.door-P.z0,HOIST.stroke*(Math.floor(v*P.strokes)+ease(frac(v*P.strokes)))):0;
  const crateZ=P.k==='hook'?P.z0:P.k==='haul'?P.z0+lift:HOIST.door;
  const hookZ=P.k==='hook'||P.k==='haul'||P.k==='hold'?crateZ+HOIST.crate+3:P.k==='lower'?lerp(HOIST.door+8,P.next+HOIST.crate+3,v):HOIST.door+8;
  return {...P,v,crateZ,hookZ,stack:P.m===3&&(P.k==='wait'||P.k==='lower')?3:3-P.m,crateJ:P.k==='take'?lerp(HOIST.j,-1.6,ease(v)):HOIST.j,carried:P.k!=='wait'&&P.k!=='lower',stroke:P.k==='haul'?v*P.strokes:0};
}
/** The stack of crates under the hoist beam. */
function hoistStack(n){ for(let k=0;k<n;k++) crate(HOIST.i-.55,HOIST.j-.55,1.1,1.1,HOIST.crate,k*HOIST.crate,k%3,k===0?0:-1); }
/** The hauler: hand over hand on the fall of the hoist rope, leaning back with each pull; he lets it run back down for the next crate. */
function hoistMan(t,H){
  const P={i:3.7,j:2.35,fi:1,fj:0,z0:0}, k=Math.floor(H.stroke), e=ease(frac(H.stroke)), pulling=H.k==='haul';
  const breath=Math.sin(t*.05)*.1, pull=pulling?Math.sin(Math.PI*frac(H.stroke)):0;
  const hz=s=>{ if(!pulling) return H.k==='lower'?11+Math.sin(H.v*40+s)*.4:s>0?11.2:9.6; const mine=(k%2===0)===(s>0); return mine?lerp(16,9.2,e):lerp(9.2,16,e); };
  const J=s=>{ const z=hz(s), dip=pull*.5;
    return {hip:[-.3-pull*.4,s*1.2,7.2-dip],knee:[s>0?.9:.3,s*1.3,3.9-dip*.4],foot:[s>0?.9:-.8,s*1.5,.9],sh:[-.1-pull*.5,s*2.5,12.3-dip+breath],
      el:[.9-pull*.3,s*2.9,(12.3+z)/2-1.4],hd:[1.9-pull*.2,s*.45,z]}; };
  J.pel=[-.3-pull*.4,0,6.6-pull*.5];J.chest=[-.1-pull*.6,0,12.1-pull*.5+breath];J.head=[-.1-pull*.8,0,15.4-pull*.4+breath];
  contact(P.i-.4,P.j-.3,P.i+.4,P.j+.3,0,.7);
  /* the rope tail coiled on the setts, then the fall from the lower hand, then the hauler over it */
  for(let n=0;n<3;n++){ const r=.32-n*.07; let a=[3.2+r,2.85,.05]; for(let q=1;q<=10;q++){ const b=[3.2+Math.cos(q*.63)*r,2.85+Math.sin(q*.63)*r,.05]; thin(...a,...b,C.rope); a=b; } }
  const hands=[toWorld(P,J(1).hd[0],J(1).hd[1],J(1).hd[2]),toWorld(P,J(-1).hd[0],J(-1).hd[1],J(-1).hd[2])].sort((a,b)=>b[2]-a[2]);
  rope(hands[1],[3.2,2.85,.1],1.2,C.rope);
  docker(P,J,['#22292a','#3a4546','#5a6766']);
  thin(HOIST.i-.12,HOIST.j,HOIST.pulley,...hands[0],C.rope); thin(...hands[0],...hands[1],C.rope);
}
/** The hook, its rope and the crate on it; the warehouseman in the loading door takes the crate in. */
function hoistLoad(t,H){
  const sw=Math.sin(t*.021)*.05*(H.k==='haul'?1:.4), hi=HOIST.i+sw, hz=H.hookZ;
  thin(HOIST.i,HOIST.j,HOIST.pulley,hi,HOIST.j,hz+.6,C.rope);
  thin(hi-.15,HOIST.j,hz,hi+.15,HOIST.j,hz+.6,C.iron); thin(hi+.15,HOIST.j,hz+.6,hi+.15,HOIST.j,hz-.4,C.iron);
  if(H.carried&&H.k!=='take'){ const z=H.crateZ; for(const [a,b] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]]) thin(hi,HOIST.j,hz,hi+a,HOIST.j+b,z+HOIST.crate,C.rope);
    crate(hi-.55,HOIST.j-.55,1.1,1.1,HOIST.crate,z,(3-H.m)%3,H.m===3?0:-1); }
  if(H.k==='take'){ const j=H.crateJ, j1=j+.55;
    if(j1>0) crate(hi-.55,Math.max(0,j-.55),1.1,j1-Math.max(0,j-.55),HOIST.crate,HOIST.door,(3-H.m)%3);
    if(j-.55<0) behindFront(()=>crate(hi-.55,j-.55,1.1,Math.min(1.1,-(j-.55)),HOIST.crate,HOIST.door,(3-H.m)%3),bayHole,Math.max(0,Math.min(.8,-j*.5))); }
  const show=H.k==='hold'?ease(H.v*2):H.k==='take'?1:H.k==='wait'?1-ease(H.v):0;
  if(show>0){ const reach=H.k==='take'?1-H.v:H.k==='hold'?ease(H.v):0, P={i:5.3,j:-.45,fi:0,fj:1,z0:50.2};
    const J=s=>({hip:[-.4*reach,s*1.2,7.2],knee:[.6,s*1.3,3.8],foot:[0,s*1.4,.9],sh:[.4+reach,s*2.6,12.2-reach],el:[1.4+reach,s*3,10.6-reach],hd:[2.2+reach*1.6,s*1.6,10.4-reach*.6]});
    J.pel=[-.2*reach,0,6.6];J.chest=[.5+reach,0,12-reach*.6];J.head=[.5+reach*1.2,0,15.3-reach*.8];
    behindFront(()=>docker(P,J,['#3b3127','#5a4a38','#7b6650']),bayHole,1-.6*show); }
}
/** The crane hand turning the winch. */
function craneHand(t,K){
  const a=-K.z*.45, hj=CRANE.j+Math.cos(a)*.3, hz=8+Math.sin(a)*2.3, P={i:CRANE.i+1.2,j:11.32,fi:-1,fj:0,z0:0}, rock=Math.sin(a)*(K.part==='down'||K.part==='up'||K.part==='lower'||K.part==='lift'?1:.2);
  const J=s=>{ const hd=[(P.i-CRANE.i-.8)*7.5,(P.j-hj)*7.5+s*.35,hz], sh=[.3+rock*.25,s*2.5,12.1-rock*.15];
    return {hip:[-.2,s*1.2,7.2],knee:[s>0?.8:.2,s*1.3,3.9],foot:[s>0?.7:-.6,s*1.5,.9],sh,el:[(sh[0]+hd[0])/2-.2,s*2.4+(hd[1]-s*2.5)*.4,(sh[2]+hd[2])/2-1.3],hd}; };
  J.pel=[-.1,0,6.6];J.chest=[.6+rock*.3,0,12-rock*.15];J.head=[.7+rock*.3,0,15.3-rock*.15];
  contact(P.i-.35,P.j-.3,P.i+.35,P.j+.3,0,.7);
  thin(CRANE.i+.68,hj,hz,CRANE.i+.92,hj,hz,C.edge);
  docker(P,J,['#22292a','#3a4546','#5a6766']);
}
/** Gulls: one circling over the river, two resting on posts, now and then turning their heads. */
function gulls(t){
  const fb=rendererState.fb, W=appearanceState.W, put=(x,y,c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<W&&y<appearanceState.H) fb[y*W+x]=c; };
  for(const [i,j,z,id] of [[8.5,12.5,3.5,1],[19.7,2.9,15.6,2]]){
    const x=isoX(i,j), y=isoY(i,j,z), look=vn(t*.006+id*9,id)>.5?1:-1;
    for(let dx=-2;dx<=2;dx++) put(x+dx,y,shadeC(C.gull,dx>0?.75:1)); for(let dx=-1;dx<=1;dx++) put(x+dx,y-1,C.gull);
    put(x+look*2,y-2,C.gull); put(x+look*3,y-2,rgb('#c9a03a')); put(x-look*3,y-1,rgb('#8d8e88')); put(x,y+1,C.black);
  }
  const g=t*.0035, i=12+10*Math.cos(g), j=22+5*Math.sin(g), z=48+4*Math.sin(t*.011), x=isoX(i,j), y=isoY(i,j,z), dir=-Math.sin(g)*camera.ix+Math.cos(g)*.5*camera.jx>0?1:-1;
  const flap=vn(t*.008,7)>.45?Math.sin(t*.24):.35;
  for(const d of [-1,1]){ line(Math.round(x),Math.round(y),Math.round(x+d*3.5),Math.round(y-flap*2.5-1),C.gull,C.gull); line(Math.round(x+d*3.5),Math.round(y-flap*2.5-1),Math.round(x+d*7),Math.round(y-flap*4.5),shadeC(C.gull,.75),shadeC(C.gull,.75)); }
  put(x+dir,y,C.gull); put(x+dir*2,y,rgb('#c9a03a')); put(x-dir,y+1,C.gull);
}

/** Night sky above the roofs: soot-dark overhead, the city's gaslit smog glowing low. */
function sky(t){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H;
  for(let y=0;y<H;y++){ const wy=y-camera.y, k=Math.max(0,Math.min(1,(wy+260)/200));
    for(let x=0;x<W;x+=6){ const n=vn((x-camera.x)*.012+t*.0004,wy*.03), c=mix(C.skyTop,C.skyLow,Math.min(1,k*.8+n*.35)); fb.fill(c,y*W+x,y*W+Math.min(W,x+6)); } }
}
/** Slate roof behind a parapet; faces +j for the long range (front) or +i for the side range. */
function roof(i0,i1,h,front=true,D=6,R=10.4){
  const slate=(x,y)=>{ const s=front?(y-(camera.y+camera.iy*(x-camera.x)/camera.ix-camera.z*h))/(camera.iy*camera.jx*D/camera.ix-camera.jy*D-camera.z*R)
      :(y-(camera.y+camera.jy*(x-camera.x)/camera.jx-camera.z*h))/(-camera.iy*D+camera.jy*camera.ix*D/camera.jx-camera.z*R);
    const a=front?(x-camera.x+camera.jx*D*s)/camera.ix:(x-camera.x+camera.ix*D*s)/camera.jx, r=Math.floor(s*16), u=a*2.6+(r&1)*.5;
    if(frac(s*16)<.16||frac(u)<.05) return shadeC(C.slate,.55);
    return shadeC(C.slate,(.82+(h2(Math.floor(u),r)-128)/600)*(.8+s*.45)*(.85+vn(a*.6,s*5)*.3)); };
  if(front) quad(i0,-.05,h,i1,-.05,h,i1,-D,h+R,i0,-D,h+R,slate);
  else quad(-.05,i0,h,-.05,i1,h,-D,i1,h+R,-D,i0,h+R,slate);
}
/** Brick chimney stack on a ridge, with clay pots. */
function chimney(i,j,z,w){
  isoBox(i,j,i+w,j+.9,z,z+9,C.brick[3],C.brick[0],C.brick[2],(x,y)=>{ const [a,zz]=onJ(j+.9,x,y); return brickAt(a,zz-z+4,C.brick,7); },(x,y)=>{ const [a,zz]=onI(i+w,x,y); return shadeC(brickAt(a,zz-z+4,C.brick,9),.75); });
  isoBox(i-.1,j-.1,i+w+.1,j+1,z+9,z+9.8,C.lintel,shadeC(C.lintel,.8),shadeC(C.lintel,.6));
  for(let k=0;k<Math.round(w/.5);k++){ const pi=i+.25+k*.5; cyl(pi,j+.45,.13,z+9.8,z+12,(zz,s)=>shadeC(rgb('#7a4a33'),roundLit(s)),(s,v)=>C.black); }
}

/** The quay's river wall: granite courses, a coping, and green slime below the tide line. */
function quayFace(a,z){
  if(z>-.9){ return frac(a*.8)<.04?C.mortar:shadeC(C.edge,(z>-.25?1.05:.82)*(.85+vn(a*2,3)*.2)); }
  const r=Math.floor((z+.9)/2.2), u=a*.62+(r&1)*.5, f=frac(u), v=frac((z+.9)/2.2);
  let c=(v>.9||f<.04)?C.mortar:shadeC(C.stone[h2(Math.floor(u),r)&3],(v<.2?1.18:1)*(.95+vn(a*1.4,z*.4)*.3));
  const tide=WL+2.6+vn(a*.7,1)*1.2; if(z<tide) c=mix(c,C.slime,Math.min(.85,(tide-z)*.35+vn(a*3,z)*.2));
  return c;
}
/** Warehouse front: brickwork, string courses, cornice, windows, loading doors and bills. */
function fronts(t){
  const F={j:0}, band=(x,y)=>shadeC(C.lintel,.72+vn((x-camera.x)*.3,(y-camera.y)*.3)*.3);
  for(const s of FRONTS){
    quad(s.i0,0,0,s.i1,0,0,s.i1,0,s.h,s.i0,0,s.h,(x,y)=>{ const [a,z]=onJ(0,x,y); return brickAt(a,z,s.pal,s.seed); });
    for(const z of [24,47]) if(z<s.h-4){ fq(F,s.i0,z,s.i1,z+1.3,band); fl(F,s.i0,z+1.3,s.i1,z+1.3,shadeC(C.lintel,1.2)); }
    fq(F,s.i0,s.h-2.2,s.i1,s.h,band); fl(F,s.i0,s.h,s.i1,s.h,shadeC(C.lintel,1.3)); fl(F,s.i0,s.h-2.2,s.i1,s.h-2.2,C.black);
  }
  /* A: loading bay with stacked doors, the hoist beam above */
  for(const a of [1.2,7.6,9.5]) windowAt(F,a,5,1.2,13,'dark',t,true);
  for(const [a,k] of [[1.2,'dark'],[2.9,'lit'],[7.6,'shut'],[9.3,'dark']]){ windowAt(F,a,28,1.2,15,k,t); windowAt(F,a,51,1.2,15,k==='lit'?'dark':k==='dark'?'lit':'shut',t); }
  const bay=(z,h,open)=>{ fq(F,4.2,z,6,z+h,()=>C.iron);
    if(open){ fq(F,4.3,z+.2,5.9,z+h,(x,y)=>{ const [a,zz]=onJ(0,x,y); return mix(rgb('#120f0c'),C.litD,Math.max(0,.75-Math.hypot(a-5.1,(zz-z-h*.4)/9))); });
      for(const a of [4.3,5.9]) quad(a,0,z+.2,a,.75,z+.2,a,.75,z+h,a,0,z+h,(x,y)=>{ const [, zz]=onI(a,x,y); return shadeC(C.wood,.7+(frac(zz/1.6)<.15?-.2:0)+(a>5?.2:0)); }); return; }
    fq(F,4.3,z+.2,5.9,z+h,(x,y)=>{ const [a]=onJ(0,x,y); return shadeC(C.wood,(frac(a*3.5)<.15?.55:.85)*(.85+vn((x-camera.x)*.3,(y-camera.y)*.15)*.25)); });
    fl(F,5.1,z+.2,5.1,z+h,C.iron); for(const zz of [z+h*.2,z+h*.8]){ fl(F,4.3,zz,4.9,zz,C.ironHi); fl(F,5.3,zz,5.9,zz,C.ironHi); } };
  bay(0,21,false); bay(27,17,false); bay(50,17,true);
  fq(F,4,0,4.2,21,band); fq(F,6,0,6.2,21,band);
  isoBox(4.95,0,5.25,2.6,70,71,C.woodLight,C.wood,C.woodDark); isoBox(4.98,2.05,5.22,2.35,68.4,70,C.woodLight,C.woodDark,C.woodDark);
  poster(F,2.65,4,1.3,9,0); poster(F,3.3,10,.75,6,1);
  /* B: cart arch, lettering and posters */
  fq(F,12,0,14.3,19,(x,y)=>{ const [a,z]=onJ(0,x,y); const d=Math.hypot((a-13.15)/1.15,(Math.max(0,z-15.5))/3.5); return d>1?0:mix(rgb('#0d0c0a'),C.litD,Math.max(0,.6-Math.hypot(a-13.6,(z-9)/11))*glow[4]); });
  for(let k=0;k<=8;k++){ const a=Math.PI*k/8, b=Math.PI*(k+1)/8; thin(13.15-Math.cos(a)*1.25,.04,15.5+Math.sin(a)*3.9,13.15-Math.cos(b)*1.25,.04,15.5+Math.sin(b)*3.9,shadeC(C.lintel,1.1)); }
  for(const a of [15.2,18.9]) windowAt(F,a,5,1.2,13,'dark',t,true);
  for(const [a,k] of [[12.2,'lit'],[14.4,'dark'],[16.6,'dark'],[18.8,'lit']]){ windowAt(F,a,28,1.2,14,k,t); }
  fq(F,11.6,50,20.4,56.8,(x,y)=>mix(under(x,y),rgb('#1c1a16'),.55)); lettering(F,11.75,55.6,'WAPPING WHARF');
  poster(F,16.55,4,.9,7,2); poster(F,20,3,.75,8,0);
  /* C: shuttered windows, a side door, a drainpipe at each joint */
  for(const [a,k] of [[22,'shut'],[27,'dark']]) windowAt(F,a,5,1.2,13,k,t,true);
  for(const [a,k] of [[22,'dark'],[24.3,'shut'],[26.6,'lit'],[28.8,'dark']]){ windowAt(F,a,28,1.2,15,k,t); windowAt(F,a,51,1.2,13,k==='lit'?'shut':'dark',t); }
  fq(F,24.3,0,25.7,16,()=>C.iron); fq(F,24.4,.1,25.6,15.6,(x,y)=>shadeC(rgb('#2a2e26'),.8+vn((x-camera.x)*.4,(y-camera.y)*.1)*.3)); fq(F,24.1,16,25.9,17.8,band);
  poster(F,28.3,3.5,1.2,8,1);
  for(const a of [10.85,20.85]){ fl(F,a,1,a,FRONTS[a<20?1:2].h-2,C.iron); fl(F,a+.08,1,a+.08,FRONTS[a<20?1:2].h-2,C.ironHi); fq(F,a-.1,FRONTS[a<20?1:2].h-4,a+.2,FRONTS[a<20?1:2].h-2.2,()=>C.iron); }
}
/** Open warehouse doors stand above the quay, in front of its ground plane. */
function warehouseDoors(){
  for(const a of [12,14.3]){
    quad(a,.03,.2,a,1.05,.2,a,1.05,15.4,a,.03,15.4,(x,y)=>{ const [j,z]=onI(a,x,y); return shadeC(C.woodDark,(frac(j*4)<.12?.65:1)*(frac(z/4.5)<.07?.65:1)*(.85+vn((x-camera.x)*.25,(y-camera.y)*.2)*.2)); });
    for(const z of [2,8,14]) thin(a,.05,z,a,1.03,z,C.ironHi);
    thin(a,1.05,.2,a,1.05,15.4,C.woodLight);
  }
}
/** The side of warehouse A along the left of the quay, and its gable end over the river. */
function sideWall(t){
  const F={i:0};
  quad(0,0,0,0,13,0,0,13,74,0,0,74,(x,y)=>{ const [a,z]=onI(0,x,y); return shadeC(brickAt(a,z,C.brick,53),.88); });
  for(const z of [24,47]) fq(F,0,z,13,z+1.3,(x,y)=>shadeC(C.lintel,.65+vn((x-camera.x)*.3,(y-camera.y)*.3)*.3));
  fq(F,0,71.8,13,74,(x,y)=>shadeC(C.lintel,.66));
  for(const a of [1.6,9.2]) windowAt(F,a,5,1.2,13,'dark',t,true);
  for(const [a,k] of [[2,'lit'],[4.8,'dark'],[7.6,'dark'],[10.4,'shut']]){ windowAt(F,a,28,1.2,15,k,t); windowAt(F,a,51,1.2,15,k==='lit'?'dark':'shut',t); }
  carriageGate(F);
  poster(F,10.75,4,.9,8,2);
  fl(F,12.4,1,12.4,72,C.iron); fl(F,12.48,1,12.48,72,C.ironHi);
  quad(0,13,WL,-14,13,WL,-14,13,74,0,13,74,(x,y)=>{ const [a,z]=onJ(13,x,y); return z<0?quayFace(-a,z):shadeC(brickAt(-a,z,C.brick,61),.72); });
}

/** The carriage gate in the side of warehouse A, through which the cab came in: plane i = 0, from j0 to j1. */
const GATE={j0:3.4,j1:7.8,spring:17,rise:5};
const gateHole=(j,z)=>z>=0&&j>=GATE.j0&&j<=GATE.j1&&(z<=GATE.spring||((j-(GATE.j0+GATE.j1)/2)/((GATE.j1-GATE.j0)/2))**2+((z-GATE.spring)/GATE.rise)**2<=1);
/** What shows through the gate: the passage's setts and its left-hand wall with the gate leaf folded back against it,
 * sinking into the dark, and a lantern's glow halfway in. Depth d along the line of sight is in tiles. */
function gateInside(j,z){
  const dFloor=z/6, dWall=j-GATE.j0, d=Math.min(dFloor,dWall), warm=.5*Math.exp(-((d-1.7)**2)*1.2)*Math.max(0,1-Math.abs(z-6*d-14)/16);
  let c;
  if(d>3.8) c=mix(INSIDE,C.litD,.18);
  else if(dWall<dFloor){ const zw=z-6*dWall;
    c=dWall<2.3&&zw<GATE.spring-.6?shadeC(C.woodDark,(frac(dWall*3.2)<.14?.55:.95)*(frac(zw/5.5)<.06?.6:1)):brickAt(dWall,zw,C.brick,29); c=shadeC(c,.55-.1*dWall); }
  else { const fi=-dFloor, fj=j-dFloor, row=Math.floor(fj*2.3), u=fi*1.25+frac(row*.37)*.9, v=frac(fj*2.3);
    c=(v<.17||frac(u)<.07)?C.joint:shadeC(C.stone[h2(Math.floor(u)+row*7,row*3)&3],.75); c=shadeC(c,.6-.12*dFloor); }
  return mix(c,C.lamp,Math.min(.35,warm*.6));
}
/** The gate: an opening onto the passage, rusticated stone piers, a ring of voussoirs with a keystone, and impost blocks. */
function carriageGate(F){
  const {j0,j1,spring,rise}=GATE, mid=(j0+j1)/2, half=(j1-j0)/2, stone=(x,y,k)=>shadeC(C.lintel,k*(.72+vn((x-camera.x)*.35,(y-camera.y)*.35)*.3));
  fq(F,j0,0,j1,spring+rise,(x,y)=>{ const [j,z]=onI(0,x,y); return gateHole(j,z)?gateInside(j,z):0; });
  for(const [a,b] of [[j0-.45,j0],[j1,j1+.45]]) for(let z=0;z<spring;z+=2.2){ const wide=Math.floor(z/2.2)%2, a0=wide?(a<j0?a-.2:a):a, b0=wide?(a<j0?b:b+.2):b;
    fq(F,a0,z,b0,Math.min(spring,z+2.2),(x,y)=>stone(x,y,1)); fl(F,a0,z,b0,z,shadeC(C.lintel,.5)); }
  fq(F,j0-.55,spring-.9,j0+.15,spring,(x,y)=>stone(x,y,1.15)); fq(F,j1-.15,spring-.9,j1+.55,spring,(x,y)=>stone(x,y,1.15));
  for(let k=0;k<11;k++){ const p=Math.PI*k/11, q=Math.PI*(k+1)/11, P=(a,r)=>[mid-Math.cos(a)*half*r,spring+Math.sin(a)*rise*r];
    const [a0,z0]=P(p,1), [a1,z1]=P(q,1), [a2,z2]=P(q,1.32), [a3,z3]=P(p,1.32);
    quad(...pt(F,a0,z0),...pt(F,a1,z1),...pt(F,a2,z2),...pt(F,a3,z3),(x,y)=>stone(x,y,k===5?1.25:k%2?.95:1.05)); fl(F,a0,z0,a3,z3,shadeC(C.lintel,.5)); }
}
/** River surface: wind-streaked ripples, shadow under the quay and the shimmering columns of the lamps' reflections. */
function water(t){
  const refl=LAMPS.filter(l=>!l.wall).map(l=>({x:isoX(l.i,l.j),y:isoY(l.i,l.j,2*WL-l.z),top:isoY(l.i,13,WL),k:glow[LAMPS.indexOf(l)]}));
  let px=-9, py=-9, pc=0;
  const shade=(x,y)=>{
    if(under(x,y)!==RIVER) return 0;
    if(y===py&&x===px+1&&(x&1)) return pc;
    px=x; py=y;
    const [i,j]=ground(x,y,WL), r=fbm((i-j)*.45+t*.0025,(i+j)*2.6-t*.009), hi=Math.max(0,Math.min(1,(r-.6)*9))*(.5+vn((i-j)*.2,(i+j)*.3));
    let c=hi>0?mix(C.water,C.waterHi,hi*.75):C.water; c=shadeC(c,(j<15&&i<52.5?.62+.38*Math.max(0,j-13)/2:1)*(.85+(r-.5)*.3));
    for(const l of refl){ if(y<l.top||Math.abs(x-l.x)>12) continue; const dx=x-l.x+(vn(y*.35,t*.03+l.x)-.5)*7, w=Math.exp(-dx*dx/14)*Math.max(0,1-Math.abs(y-l.y)/46)*l.k;
      if(w>.02) c=mix(c,C.lamp,Math.min(.85,w*(.25+.9*hi+.3*Math.max(0,Math.sin(y*1.3+t*.07+x*.2))))); }
    return pc=c; };
  floor(-30,13,80,70,WL,shade); floor(52,-8,80,13,WL,shade);
}

/** Chimney stacks [i, j, base z, width]; the first pot of each lit one smokes. */
const CHIMNEYS=[[-4.6,6,81.5,1.2,true],...[[2.5,74,1.6,true],[8,74,1.2,false],[15.4,62,1.6,true],[25.2,68,1.6,true]].map(([i,h,w,lit])=>[i,-4.4,h+.8+10.4*(4.4/6),w,lit])];
/** Marks the river's pixels in the baked background, for the per-frame water to fill. */
const RIVER=0xff010203;
/** The static background baked for the current camera position. */
const bake={key:'',buf:new Uint32Array(0)};
/** Sky, roofs, warehouses, the quay walls and the setts: nothing here moves, so it is drawn once per camera position. */
function background(t){
    const keep=glow; glow=LAMPS.map(()=>1);
    sky(t);
    roof(0,13,74,false); roof(0,11,74); roof(11,21,62); roof(21,30,68);
    for(const c of CHIMNEYS) chimney(c[0],c[1],c[2],c[3]);
    quad(11,0,62,11,-6,62,11,-6,84.4,11,0,74,(x,y)=>{ const [a,z]=onI(11,x,y); return shadeC(brickAt(-a,z,C.brick,23),.68); });
    sideWall(t); fronts(t);
    // The former solid end wall (i=30) is now the open continuation of Wapping.
    floor(-30,13,80,70,WL,()=>RIVER); floor(52,-8,80,13,WL,()=>RIVER);
    quad(0,13,WL-.5,52,13,WL-.5,52,13,0,0,13,0,(x,y)=>{ const [a,z]=onJ(13,x,y); return quayFace(a,z); });
    quad(52,0,WL-.5,52,13,WL-.5,52,13,0,52,0,0,(x,y)=>{ const [a,z]=onI(52,x,y); return shadeC(quayFace(a,z),.78); });
    for(let i=1;i<30;i+=2.6){ isoBox(i,13.02,i+.4,13.42,WL-.6,-1,C.woodLight,C.wood,C.woodDark); thin(i+.2,13.43,WL+.6,i+.2,13.43,-1.2,C.woodDark); }
    for(let z=WL+.4;z<0;z+=1.2) thin(12.4,13.05,z,12.95,13.05,z,C.ironHi); for(const i of [12.4,12.95]) thin(i,13.05,WL,i,13.05,.9,C.iron);
    floor(0,0,30,13,0,sett);
    floor(30,0,52,13,0,sett);
    warehouseDoors();
    portDistrictStatic(t);
    thin(0,13,0,52,13,0,C.edge); thin(52,0,0,52,13,0,C.edge);
    for(const j of [10.9,11.6]){ thin(0,j+.07,0,52,j+.07,0,C.black); thin(0,j,0,52,j,0,shadeC(C.ironHi,1.6)); }
    glow=keep;
}
/** Temporarily scale the original 2× Thames camera into the active native framebuffer.
 * Story and physics keep their existing 2× camera coordinates. */
let portPixelsActive=false;
function withPortPixels(fn){
  const ratio=gymState.ISO_K>1?gymState.ISO_K/2:1;
  if(ratio===1||portPixelsActive) return fn();
  const props=['x','y','ix','jx','iy','jy','z','figureScale'], previous=props.map(k=>camera[k]);
  for(let p=0;p<props.length;p++) camera[props[p]]=previous[p]*ratio;
  portPixelsActive=true;
  try { return fn(); } finally { for(let p=0;p<props.length;p++) camera[props[p]]=previous[p]; portPixelsActive=false; }
}
/** Use the port projection while rendering or advancing its fight. */
export function withThamesCamera(fn){ return withPortPixels(()=>{ const previous=setPropCamera(camera); try { return fn(); } finally { setPropCamera(previous); } }); }
/** Restore the port after its fight without restarting the job. */
export function resumeThamesPort(){ setGstate('port'); setPanelMode(); portStory(); setInfo(); }
/** Outfit shared by the port opponent and his fight figure. */
export function portFightOutfit(fn){ const A=appearanceState; withCellOutfit(()=>{ setRamp(A.R_HSH,['#797974','#b7b4a7','#e1dbca'],false); setRamp(A.R_HSHF,['#797974','#b7b4a7','#e1dbca'],true); setRamp(A.R_HPT,['#181b1d','#2a2e31','#454a4a'],false); setRamp(A.R_HPTF,['#181b1d','#2a2e31','#454a4a'],true); fn(); }); }
export function renderThamesPort(fighters=null){ return withPortPixels(()=>renderPortFrame(fighters)); }
/** A Thames frame after selecting the native-resolution camera. */
function renderPortFrame(fighters){
  const t=boxingState.tick, previous=setPropCamera(camera), fb=rendererState.fb, key=camera.x+','+camera.y+','+fb.length;
  glow=LAMPS.map((l,k)=>.86+.14*vn(t*.045+k*13,k*5)+.05*Math.sin(t*.37+k*2));
  try{
    if(bake.key!==key){ background(t); bake.buf=fb.slice(); bake.key=key; } else fb.set(bake.buf);
    water(t);
    portRiverDistance(t);
    portDecks();
    for(const c of CHIMNEYS) if(c[4]) smoke(c[0]+.25,c[1]+.45,c[2]+12.5,t,Math.floor(c[0]*3),8,520,C.fog,1.3);
    /* back-to-front props on the quay */
    const H=hoistAt(t), D=dockerNow(t), K=craneAt(t,-2.4);
    const props=[
      ...storyCast(t),
      ...(fighters?fighters.map(F=>[F.i+F.j,()=>F.draw()]):[]),
      ...(!player.carrying&&(player.lift<0||player.lift/120<.45)?[[playerSack.i+playerSack.j,()=>sack(playerSack.i,playerSack.j,0)]]:[]),
      ...(!fighters?[[player.i+player.j,()=>{ if(portJob.entry&&portJob.entry.tick>55&&portJob.entry.tick<=105) return;
        const A=appearanceState, side=player.fi-player.fj>=0?1:-1, g=player.moving?player.ph%1:.25;
        const lifting=player.lift>=0?liftSack(player,[playerSack.i,playerSack.j,0,0],player.lift/120,side):null;
        const J=lifting?lifting.J:player.pose||walkJoints(g,player.carrying,side);
        const draw=()=>{
        contact(player.i-.22,player.j-.22,player.i+.22,player.j+.22,0,.4);
        withCellOutfit(()=>figureHD(player,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'fringe',stubble:true,cut:true},{noShadow:true}));
        if(lifting?.held) sackAt(lifting.held,lifting.dir[0],lifting.dir[1],lifting.tilt);
        else if(player.carrying) sackAt(toWorld(player,.2,side*2.4,14.4-.22*Math.cos(4*Math.PI*g)-.15),player.fi,player.fj,1); };
        if(portJob.entry&&player.j<.35) behindFront(draw,archHole,Math.max(0,Math.min(1,(.3-player.j)/1.6))); else draw(); }]]:[]),
      [HOIST.i+HOIST.j,()=>{ hoistStack(H.stack); hoistLoad(t,H); }],
      [6.05,()=>hoistMan(t,H)],
      [2,()=>{ barrel(.85,.85); barrel(1.8,.9); barrel(.9,1.8); barrel(1.35,1.3,7); }],
      [3.6,()=>{ for(const j of [GATE.j0-.3,GATE.j1+.3]){ contact(.05,j-.2,.45,j+.2,0,.6); cyl(.25,j,.2,0,2.2,(z,s)=>shadeC(C.lintel,roundLit(s)*(.85+.1*z)),(s,v)=>shadeC(C.lintel,1.15)); } }],
      [16.3,()=>{ crate(5.6,9.75,1.25,1.1,8,0,0,0); crate(6.95,9.7,1.2,1.15,8,0,1); crate(8.3,9.8,1.25,1.05,7,0,2,1); crate(6.3,9.8,1.2,1.05,7,8,2); }],
      [6,()=>{ for(const L of LAMPS) if(L.wall) wallLamp(L,glow[LAMPS.indexOf(L)],t); }],
      [21.2,()=>{ crate(17.6,2.2,1.3,1.2,8,0,0,1); crate(19,2.3,1.3,1.2,8,0,1); crate(20.35,2.4,1.2,1.2,8,0,2,0); crate(17.75,2.25,1.2,1.15,7,8,2); crate(19.1,2.35,1.15,1.1,6,8,0,1); }],
      [25,()=>tarpCargo(21.6,1,3,2.6,7.5)],
      [29.35,()=>autumnTree(t)],
      [25.6,()=>{ barrel(21.2,4.3); barrel(22.05,4.45); barrel(21.6,5.15); }],
      [31.4,()=>coalSacks(t)],
      [HEAVER.i+HEAVER.j-.2,()=>heaver(t,K.heap.r)],
      [CRANE.i+6.6,()=>coalHeap(CRANE.i,CRANE.j-CRANE.reach,K.heap.r,K.heap.h)],
      [26.8,()=>sackStack(D.phase==='lift'&&D.u>=.45?D.n-1:D.n)],
      [13,()=>policeVan(t,storyVanDoor())],
      [12.9,()=>{ crate(2.1,9.9,.9,.9,4,0,2); dockPerson(2.6,10.4,true,0,0,1); smoke(2.65,11.15,12.4,t,5,5,260,C.fog,.6); }],
      [36.3,()=>{ for(let k=0;k<3;k++){ const i=29+k*.1,j=11.6+k*.1; rope([i,j,.05],[i+.8-k*.2,j,.05],0,C.rope); rope([i+.8-k*.2,j,.05],[i+.8-k*.2,j+.5-k*.2,.05],0,C.rope); rope([i+.8-k*.2,j+.5-k*.2,.05],[i,j+.5-k*.2,.05],0,C.rope); } }],
      [CRANE.i+CRANE.j,()=>{ crane(t,K); craneHand(t,K); }],
      [D.i+D.j,()=>sackCarrier(t)],
      ...portDistrictProps(t),
    ];
    for(let k=0;k<LAMPS.length;k++){ const l=LAMPS[k]; if(!l.wall) props.push([l.i+l.j,()=>gasLamp(l.i,l.j,glow[k],t)]); }
    for(const i of [2.2,8.5,16.5,21.8,28.2]) props.push([i+12.6,()=>bollard(i,12.6)]);
    props.sort((a,b)=>a[0]-b[0]).forEach(p=>p[1]());
    const B=barge(t), L=lighter(t);
    for(const [i,bi] of [[2.2,2.6],[16.5,17.5]]) rope([i,12.6,3],[bi,B.jf(bi),B.top(bi)],1.2,C.rope);
    for(const [i,bi] of [[21.8,23.4],[28.2,29.5]]) rope([i,12.6,3],[bi,L.jf(bi),L.top(bi)],1,C.rope);
    craneLoad(t,K);
    quad(10.2,12.85,.15,11.2,12.85,.15,11.2,B.jf(10.7),B.top(10.7),10.2,B.jf(10.7),B.top(10.7),(x,y)=>shadeC(C.wood,.85+vn((x-camera.x)*.3,(y-camera.y)*.3)*.25));
    for(let u=.08;u<1;u+=.12){ const j=12.85+(B.jf(10.7)-12.85)*u, z=.15+(B.top(10.7)-.15)*u; thin(10.2,j,z+.05,11.2,j,z+.05,C.woodLight); }
    skiff(t);
    smoke(...B.chimney,t,3,9,380,C.fog,1);
    gulls(t);
    portDistrictFX(t);
    atmosphere(t);
    if(!fighters) sackPrompt();
    if(!fighters&&storyPlaying()){ sceneFrame(); say(); }
  } finally { setPropCamera(previous); }
}
/** Two layers of drifting river fog, thicker over the water, then halos round the lamps and a vignette. */
function atmosphere(t){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, fr=C.fog&255, fg=(C.fog>>8)&255, fbb=(C.fog>>16)&255;
  for(let y=0;y<H;y+=2){ const wy=y-camera.y; for(let x=0;x<W;x+=2){
    const wx=x-camera.x, n1=fbm(wx*.016-t*.0011,wy*.034+Math.sin(t*.0009)*.4), n2=fbm(wx*.035+t*.0024+9,wy*.07-t*.0004);
    const [, j]=ground(x,y,WL), river=Math.max(0,Math.min(1,(j-12.5)/4));
    const a=Math.min(.62,.06+.3*n1*n1+river*(.08+.4*Math.max(0,n2-.38)));
    for(let yy=y;yy<y+2&&yy<H;yy++) for(let xx=x;xx<x+2;xx++){
      const dx=xx/W-.5, dy=yy/H-.5, v=1-.88*(dx*dx+dy*dy), k=yy*W+xx, c=fb[k];
      const r=((c&255)*(1-a)+fr*a)*v, g=(((c>>8)&255)*(1-a)+fg*a)*v, b=(((c>>16)&255)*(1-a)+fbb*a)*v;
      fb[k]=(0xff000000|(b<<16)|(g<<8)|r)>>>0;
    }
  } }
  LAMPS.forEach((l,k)=>{ const x=isoX(l.i,l.j), y=isoY(l.i,l.j,l.z-(l.wall?1:0)); spot(x,y,30,26,.2*glow[k],C.lamp); spot(x,y,9,8,.45*glow[k],C.flame); });
}
/* drawing helpers shared with the vehicles (carriage.js) and the story's cast (port-story.js) */
export { C, contact, toWorld, spot, thin, stroke, floor, rod, rope, smoke, cyl, roundLit, behindFront, vn, ease, lerp, lerp3, frac, walkJoints, turnTo, along, pathLen, withRamps, barrel, crate, chimney, onI, onJ, ground, brickAt, windowAt, lettering, fq, fl, docker, dockPerson, hull, gasLamp, bollard };
