import { psetK, isoLineThin, state as gymState, mkItem, quad, itemW, itemH, isoBox, isoLine, isoX, isoY, stationOf } from './gym.js';
import { state as bathState, bathEnter, bathLeave } from './bath.js';
import { isPrison, roomOpen, cellDoorOptions, yardDoorOptions, bunkOptions, lockerOptions, useSoap } from './prison.js';
import { yardLayout, state as npcsState, cnEnter, ynEnter } from './npcs.js';
import { state as progressionState, persist } from './progression.js';
import { rgb, state as appearanceState } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { h2, state as boxingState, popup, drawText } from './boxing.js';
import { state as pushupsState, startPushup } from './pushups.js';
import { simTime, simUI, simNudge } from './simulation.js';
import { initAudio, sfxWhoosh, sfxChime, tone } from './audio.js';
import { stMenuClose, enterHub } from './navigation.js';
import { setInfo } from './input.js';
import { startPullups } from './pullups.js';
import { startRoaches } from './roaches.js';
import { startShadowboxing } from './shadowboxing.js';
import { stageOption, stageFor } from './training-session.js';
import { ROMAN } from './training-data.js';
import { buildCellLight } from './cell-light.js';
import { WARD_W, WARD_H, wardLayout, buildWard, drawWardItem, PALLET_Z } from './ward.js';
import { drawExerciseItem } from './exercise-yard.js';

// Runtime values owned by rooms; initialized explicitly by main.js.
export const state = {};
export const NEWSPAPER_COLORS={paper:[rgb('#d8d0b9'),rgb('#ede5d0'),rgb('#dfd8c5')],edge:rgb('#b4aa92'),ink:rgb('#a4a193'),head:rgb('#62665d'),photo:rgb('#93978a'),fold:rgb('#c3baa3'),shadow:rgb('#535349')};

/** Shared newspaper print in normalized sheet coordinates; edition 1 is the open spread. */
export function newspaperColor(u,v,k){
  if(u<0||u>1||v<0||v>1) return 0;
  const C=NEWSPAPER_COLORS,open=k===1,page=open?(u<0.5?0:1):0,pu=open?(u*2)%1:u;
  if(v>0.93||u>0.975) return C.edge;
  if(open&&Math.abs(u-0.5)<0.025) return C.fold;
  if(pu>0.88&&v<0.12&&pu-v>0.86) return C.fold;
  const tx=Math.floor(pu*14),ty=Math.floor(v*20);
  if(pu<0.1||pu>0.9||v<0.09||v>0.9) return C.paper[k];
  if(v<0.2) return tx%6===0?C.paper[k]:C.head;
  if(v<0.3) return C.paper[k];
  if(pu>0.52&&pu<0.88&&v>0.34&&v<0.59) return v>0.44&&pu>0.64&&pu<0.79?C.head:C.photo;
  if(ty%3===0&&tx%6!==0&&tx%6<4+((ty+k+page)%2)) return C.ink;
  if(Math.abs(v-0.7)<0.025) return C.fold;
  return C.paper[k];
}

/** Build the Ward and Newgate exercise yard. */
export function roomsLoad(){
  gymState.cellList=wardLayout().map(mkItem);
  gymState.yardList=yardLayout().map(mkItem);
  gymState.gymItems=gymState.hubRoom==='yard'?gymState.yardList:
    gymState.hubRoom==='laznia'?bathState.list:gymState.cellList;
}

/** Restore a prison room; retired or unknown room identifiers return to the Ward. @param {string} room */
export function setRoomRaw(room){
  const next=['cell','yard','laznia'].includes(room)?room:'cell';
  if(gymState.hubRoom==='laznia'&&next!=='laznia') bathLeave();
  gymState.hubRoom=next;
  gymState.HUB_OY=next==='yard'?26:29;
  gymState.gymItems=next==='yard'?gymState.yardList:
    next==='laznia'?bathState.list:gymState.cellList;
  if(next==='laznia') bathEnter();
  progressionState.save.room=next;
  if(next==='cell'&&npcsState.CN_READY) cnEnter();
  if(next==='yard'&&npcsState.YN_READY) ynEnter();
}

/** Recover j and height on the face at i = i1. */
export function faceI(i1,x,y){
  const c=gymState.propCamera;
  if(c){ state.fa=c.jx?(x-c.x-i1*c.ix)/c.jx:0; state.fz=(c.y+i1*c.iy+state.fa*c.jy-y)/c.z; }
  else { state.fa=i1-(x-gymState.HUB_OX)/6; state.fz=gymState.HUB_OY+(i1+state.fa)*3-y; }
}

export // face at j = j1 (runs along i)
function faceJ(j1,x,y){
  const c=gymState.propCamera;
  if(c){ state.fa=c.ix?(x-c.x-j1*c.jx)/c.ix:0; state.fz=(c.y+state.fa*c.iy+j1*c.jy-y)/c.z; }
  else { state.fa=j1+(x-gymState.HUB_OX)/6; state.fz=gymState.HUB_OY+(state.fa+j1)*3-y; }
}

export // horizontal plane at height z (fa = i, fz = j)
function floorAt(x,y,z){
  const c=gymState.propCamera;
  if(c){ const dx=x-c.x, dy=y-c.y+z*c.z, det=c.ix*c.jy-c.jx*c.iy; state.fa=det?(dx*c.jy-dy*c.jx)/det:0; state.fz=det?(c.ix*dy-c.iy*dx)/det:0; }
  else { const a=(x-gymState.HUB_OX)/6, b=(y-gymState.HUB_OY+z)/3; state.fa=(a+b)/2; state.fz=(b-a)/2; }
} // fa=i, fz=j on a horizontal plane
/** Build the shared Ward background and its lighting map. */
export function buildCell(){
  rendererState.fb=gymState.bgHub; state.homeSkyB=skyBucket();
  buildWard();
  for(const it of gymState.gymItems) if(gymState.GYM_TYPES[it.t].flat) drawCellItem(it);
  rendererState.fb=rendererState.FB_MAIN;
  buildCellLight(state.CELL_W,state.CELL_H);
}
// small ray-marched solid for round props (pail, toilet bowl, basin): for every pixel of the bbox, march down in z from the
// top; the first world point (i,j,z) for which fn returns a colour is the surface facing the camera. fn -> colour or 0.
export function solidDraw(i0,j0,i1,j1,z0,z1,fn){
  const xs=[isoX(i0,j0),isoX(i1,j0),isoX(i0,j1),isoX(i1,j1)], ys=[isoY(i0,j0,z1),isoY(i1,j1,z0),isoY(i1,j0,z0),isoY(i0,j1,z0)];
  const xa=Math.max(0,Math.floor(Math.min(...xs))), xb=Math.min(appearanceState.W-1,Math.ceil(Math.max(...xs))), ya=Math.max(0,Math.floor(Math.min(...ys))), yb=Math.min(appearanceState.H-1,Math.ceil(Math.max(...ys)));
  const K=gymState.ISO_K;
  for(let y=ya;y<=yb;y++) for(let x=xa;x<=xb;x++){
    for(let z=z1;z>=z0;z-=0.2/K){ const a=(x/K-gymState.HUB_OX)/6, b=(y/K-gymState.HUB_OY+z)/3, pi=(a+b)/2, pj=(b-a)/2;
      if(pi<i0||pi>i1||pj<j0||pj>j1) continue; const c=fn(pi,pj,z); if(c){ rendererState.fb[y*appearanceState.W+x]=c; break; } } }
}

/** A box without the black outline of isoBox: small wall things read better with edges in their own darker paint.
 * @param {number} i0 @param {number} j0 @param {number} i1 @param {number} j1 @param {number} z0 @param {number} z1 @param {number} cT
 * @param {(x:number,y:number)=>number} fnF face at j1 @param {(x:number,y:number)=>number} fnS face at i1 @param {number} edge */
function plainBox(i0,j0,i1,j1,z0,z1,cT,fnF,fnS,edge){
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,fnF); quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,fnS); quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,()=>cT);
  isoLine(i0,j1,z0,i1,j1,z0,edge); isoLine(i1,j0,z0,i1,j1,z0,edge);
}

/** Curtain cloth: faded green-grey with folds, a dirty hem, stains low down. @param {number} u @param {number} fz */
function curtainCol(u,fz){
  const KT=rgb('#6f877c'), KF=rgb('#586d63'), KL=rgb('#8aa092'), KH=rgb('#454c42');
  if(fz<1.4) return (h2(Math.floor(u*20),7)<120)?KH:KF;
  const f=((u*7)%1+1)%1; if(f<0.25) return KF; if(f>0.78) return KL;
  if(fz<4.5&&h2(Math.floor(u*14),Math.floor(fz))<60) return KH; return KT;
}

/** Shared enamel for the corner toilet and basin. */
const ENAMEL = {e0:'#ece8de',e1:'#d6d1c6',e2:'#b4afa4',e3:'#8a857a',in:'#9a958a',water:'#6f6a5f',grime:'#3e392f'};

/** The shared cell's toilet in the 9 o'clock corner (after the reference photo): back to the left wall, facing into the cell.
 * A round bowl with a wide bare rim and no seat, a hump at the back, a narrow pedestal on a flat foot plate, grime at the base.
 * @param {any} it */
function drawDoorToilet(it){
  const tc=it.j+itemH(it)/2, tw=0.04, E=ENAMEL, E0=rgb(E.e0), E1=rgb(E.e1), E2=rgb(E.e2), E3=rgb(E.e3), GR=rgb(E.grime);
  const shade=(/** @type {number} */ ny,/** @type {number} */ z)=>z<0.15?GR:ny>0.3?E0:(ny<-0.4?E2:E1);         // lit towards +j, the room side
  isoLine(tw+0.3,tc,4.0,0.01,tc,4.0,appearanceState.C_STEEL2);                                                      // outlet into the wall
  solidDraw(tw,tc-0.5,tw+1.05,tc+0.5,0,7,(pi,pj,pz)=>{
    if(pz>5.25){ const dj=(pj-tc)/0.26, top=5.25+2.1*Math.sqrt(Math.max(0,1-dj*dj));                             // the hump at the back
      if(Math.abs(dj)<=1&&pi<tw+0.38&&pz<=top) return pz>top-0.25?E0:(dj>0.3?E0:(dj<-0.4?E2:E1)); return 0; }
    if(pz>3.0){ const u=(pz-3)/2.25, ci=tw+0.55, ri=0.5*(0.8+0.2*u), rj=0.45*(0.8+0.2*u), nx=(pi-ci)/ri, ny=(pj-tc)/rj, q=nx*nx+ny*ny;   // the bowl
      if(q>1||pi<tw+0.05) return 0;
      if(pz>5.0){ const w=((pi-ci-0.03)/(ri*0.7))**2+(ny/0.72)**2; if(w<0.3) return rgb(E.water); if(w<1) return (h2(Math.floor(pi*30),Math.floor(pj*30))<50)?E3:rgb(E.in); return E0; }   // rim, the dirty inside
      return pz<3.3?E2:shade(ny,pz); }
    if(pz>0.55){ const t=pz/3, ri=0.2+0.08*(1-t), rj=0.17+0.07*(1-t), nx=(pi-(tw+0.6))/ri, ny=(pj-tc)/rj;        // pedestal
      if(nx*nx+ny*ny>1) return 0; return shade(ny,pz); }
    if(pi>tw+0.2&&pi<tw+0.98&&Math.abs(pj-tc)<0.3) return pz>0.4?E1:(pz<0.15?GR:E2);                               // foot plate
    return 0; });
  for(const [di,dj] of [[1.02,-0.2],[1.0,0.22],[0.3,0.33]]) psetK(Math.round(isoX(tw+di,tc+dj)),Math.round(isoY(tw+di,tc+dj,0)),GR);   // grime round the foot
  if(gymState.ISO_K>1){ const rc=0.3, rj=it.j-0.02, rr=0.13;                                                     // a roll of grey paper on the floor by the basin
    solidDraw(rc-rr,rj-rr,rc+rr,rj+rr,0,1.3,(a,b,z)=>{ const d=Math.hypot(a-rc,b-rj); if(d>rr) return 0; if(z>1.1) return d<rr*0.35?rgb('#6e6a60'):rgb('#d8d2c2'); return ((a-rc)-(b-rj))>0?rgb('#a8a294'):rgb('#c8c2b2'); }); }
  return true;
}

/** The washbasin next to the corner toilet (after the reference photo): an enamel backsplash with a badge, a D-shaped basin with
 * a rolled rim, two old taps on the wall, a trap pipe, rust running down from it and a rusty vent grate low on the wall. @param {any} it */
function drawWallSink(it){
  const jc=it.j+itemH(it)/2, hw=0.36, zb=7.6, zr=9.6, i0=0.1, dep=0.46, E=ENAMEL, E0=rgb(E.e0), E1=rgb(E.e1), E2=rgb(E.e2), ST=appearanceState.C_STEEL, S2=appearanceState.C_STEEL2, RUST=rgb('#7a4a2a');
  quad(0.02,jc-0.3,2.8,0.02,jc+0.2,2.8,0.02,jc+0.2,4.6,0.02,jc-0.3,4.6,(x,y)=>{ faceI(0.02,x,y); const u=(state.fa-(jc-0.3))/0.5, v=(state.fz-2.8)/1.8;   // vent grate under the basin
    if(u<0.07||u>0.93||v<0.12||v>0.88) return rgb('#4a3426'); return ((Math.floor(state.fa*24+state.fz*1.8)+Math.floor(state.fa*24-state.fz*1.8))&1)?rgb('#2a2420'):RUST; });
  isoLineThin(0.03,jc+0.02,zb-0.4,0.03,jc+0.02,5.2,RUST); isoLineThin(0.03,jc+0.24,zb-0.2,0.03,jc+0.24,5.6,rgb('#8f5c34'));   // rust running down the wall
  isoLine(0.28,jc,zb,0.28,jc,zb-1.5,S2); isoLine(0.28,jc,zb-1.5,0.02,jc,zb-1.9,S2);                                 // trap into the wall
  plainBox(0.02,jc-hw,0.12,jc+hw,zr-0.2,zr+2.0,E0,()=>E2,(x,y)=>{ faceI(0.12,x,y); const u=(state.fa-jc)/hw, v=state.fz-(zr+0.9);   // backsplash
    if(Math.abs(u)+Math.abs(v)*0.5<0.16) return E2; if(Math.abs(v+0.75)<0.2&&Math.abs(Math.abs(u)-0.12)<0.07) return rgb('#5e5a52'); return E0; },E2);   // the badge, two little overflow holes
  solidDraw(i0,jc-hw,i0+dep,jc+hw,zb,zr,(pi,pj,pz)=>{                                                             // basin
    const t=(pz-zb)/(zr-zb), h=hw*(0.75+0.25*t), dp=dep*(0.7+0.3*t), u=(pj-jc)/h, d=(pi-i0)/dp;
    if(d<0||d>1||Math.abs(u)>1||Math.abs(u)**3+d**3>1) return 0;
    if(pz>zr-0.3){ const uu=(pj-jc)/(h*0.75), vv=(pi-i0-0.04)/(dp*0.75), q=uu*uu+vv*vv; if(vv<0) return E0; if(q<0.05) return rgb('#4d4a44'); if(q<1) return rgb(E.in); return E0; }
    if(t<0.15) return E2; return u>0.25?E0:(u<-0.4?E2:E1); });
  for(const s of [-1,1]){ const tj=jc+s*0.2;                                                                     // taps
    psetK(Math.round(isoX(0.03,tj)),Math.round(isoY(0.03,tj,12.9)),rgb('#c9ccd0'));
    isoLine(0.03,tj,12.6,0.24,tj,12.6,ST); isoLine(0.24,tj,12.6,0.24,tj,11.9,ST); psetK(Math.round(isoX(0.06,tj)),Math.round(isoY(0.06,tj,13.7)),S2); }
  return true;
}

/** The curtain closing the toilet corner off from the door: shut between the door and the basin, pulled back on the room side.
 * Its own item, so somebody washing at the basin is drawn in front of it. @param {any} it */
function drawCornerCurtain(it){
  const j0=it.j+itemH(it)/2, jw=state.CELL_H, i1=it.i+itemW(it), zc=15;
  isoLine(0.02,j0,zc+0.3,i1,j0,zc+0.3,appearanceState.C_STEEL); isoLine(i1,j0,zc+0.3,i1,jw,zc+0.3,appearanceState.C_STEEL);   // L-rail: out of the wall, then along the open side
  quad(0.02,j0,0.8,i1,j0,0.8,i1,j0,zc,0.02,j0,zc,(x,y)=>{ faceJ(j0,x,y); return curtainCol(state.fa,state.fz); });         // shut on the door side
  quad(i1,j0,0.8,i1,j0+0.42,0.8,i1,j0+0.42,zc,i1,j0,zc,(x,y)=>{ faceI(i1,x,y); return curtainCol((state.fa-j0)*1.7,state.fz); });   // pulled back, bunched
  for(let k=0;k<4;k++){ const a=j0+0.06+k*0.12; isoLine(i1,a,zc,i1,a,zc+0.3,appearanceState.C_OUT); }                  // rings
  isoLine(i1,jw,zc+0.3,i1,jw,zc-0.7,appearanceState.C_STEEL2);                                                             // bracket on the cut-away wall
  return true;
}

export function drawCellItem(it){
  if(gymState.hubRoom==='yard'&&drawExerciseItem(it)) return true;   /* the exercise yard's gate and drain */
  if(gymState.hubRoom==='cell'&&!gymState.propCamera&&drawWardItem(it)) return true;   /* the Ward's own furniture */
  const i=it.i, j=it.j, w=itemW(it), h=itemH(it);
  switch(it.t){
    case 'cshadow': case 'cfloor': return true;   // bare floor: inmates keep the cell spotless, nothing marks where you train
    case 'cradio': {   // the prison radio's wall speaker (kołchoźnik): brown bakelite box, cloth grille, its wire up to the conduit
      const j0=j+0.08, j1=j+h-0.08, i1=0.26, z0=16.6, z1=19.4;
      const BT=rgb('#8a6440'), BF=rgb('#6b4a2c'), BS=rgb('#563a22'), GR=rgb('#b4a282'), GD=rgb('#a08c6c');
      isoLine(0.15,(j0+j1)/2,z1,0.02,(j0+j1)/2,20.4,state.CLC.conduit);
      plainBox(0.02,j0,i1,j1,z0,z1,BT,()=>BF,(x,y)=>{ faceI(i1,x,y); const u=(state.fa-j0)/(j1-j0), v=(state.fz-z0)/(z1-z0);
        if(u<0.14||u>0.86||v<0.16||v>0.84) return BS;
        return ((x+y)&1)?GD:GR; },BS);                                                           // cloth grille
      return true; }
    case 'ccross': {   // a small dark wooden cross on the wall
      const jc=j+h/2, W=rgb('#4a3020'), Hl=rgb('#7a5a3a');
      isoLine(0.03,jc,16.2,0.03,jc,19.6,W); isoLine(0.03,jc-0.25,18.5,0.03,jc+0.25,18.5,W);
      psetK(Math.round(isoX(0.03,jc)),Math.round(isoY(0.03,jc,19.4)),Hl);
      return true; }
    case 'ccal': {     // a wall calendar from the canteen kiosk: a beach picture over the month grid, a red band between
      const j0=j, j1=j+h, z0=16.4, z1=19.9;   // on the left wall, next to the cross, above the curtain rail
      quad(0.02,j0,z0,0.02,j1,z0,0.02,j1,z1,0.02,j0,z1,(x,y)=>{ faceI(0.02,x,y); const u=(j1-state.fa)/(j1-j0), v=(state.fz-z0)/(z1-z0);
        if(v>0.56){ if(Math.hypot((u-0.55)*1.6,v-0.78)<0.16) return rgb('#c98a64');                // the girl on the beach
          return v>0.8?rgb('#6f9fc0'):rgb('#d8c08a'); }
        if(v>0.49) return rgb('#a8352b');
        return ((x+y*2)%3===0&&v>0.06)?rgb('#6a6250'):rgb('#e4dcc6'); });                       // month grid
      return true; }
    case 'cdoor': case 'ydoor': {
      const a0=j+0.05, a1=j+h-0.05, Hd=19.5;
      const fn=(x,y)=>{ const a=(gymState.HUB_OX-x)/6, z=gymState.HUB_OY+a*3-y, u=(a-a0)/(a1-a0);
        if(u<0.04||u>0.96||z>Hd) return appearanceState.C_OUT; if(z>Hd-0.9) return appearanceState.C_OUT;
        if(u<0.13||u>0.87||z>Hd-3) return state.CLC.dFr;
        if(u>0.44&&u<0.56&&z>14.4&&z<16.8){ const d=Math.hypot((u-0.5)*(a1-a0)*6,z-15.6); return d<0.9?rgb('#0d0f0c'):(d<1.8?state.CLC.dLens:state.CLC.dFr); }      // spy-hole
        if(u>0.28&&u<0.72&&z>7.2&&z<10.8){                                                                                         // food hatch
          if(u<0.3||u>0.7||z<7.5||z>10.5) return appearanceState.C_OUT;
          if(z>10||Math.abs(u-0.5)<0.03&&z<8.2) return state.CLC.dHi; if(z<8) return state.CLC.dR;
          if(u>0.6&&u<0.66&&z>8.7&&z<9.4) return state.CLC.dLock; return state.CLC.dHatch; }
        if(u>0.77&&u<0.83&&z>6.6&&z<10.6) return (z>8.6&&z<9.4&&Math.abs(u-0.8)<0.015)?appearanceState.C_OUT:state.CLC.dLock;                            // lock plate
        if(z>11.6&&z<12.5&&u>0.16&&u<0.84) return state.CLC.dBolt;                                                                        // bolt bar
        if((z>5.2&&z<6.6)||(z>13.2&&z<14.2)){ return (((x+y)&3)===0&&z>5.9&&z<6.3)||(Math.abs(u-0.2)<0.02||Math.abs(u-0.8)<0.02)?state.CLC.dHi:state.CLC.dR; }
        return (((x*3+y*5)%17)===0)?state.CLC.dR:state.CLC.dP; };
      quad(0,a0,0,0,a1,0,0,a1,Hd,0,a0,Hd,fn);
      quad(0.05,a0,0.2,0.55,a0,0.2,0.55,a1,0.2,0.05,a1,0.2,(x,y)=>((x^y)&3)?rgb('#4a4234'):rgb('#3a3226'));   // worn threshold
      return true; }
    case 'bunk': case 'bunk2': {
      // cream steel bunk after the reference photo: 4 tall square cream posts, wide flat cream side rails, end panels with
      // two horizontal bars, bare white quilted mattresses; a maroon ladder at the wall end of the long side that ends in a
      // maroon guard rail running along the UPPER bunk only; two red-brown drawers under the lower bed.
      const B2=it.t==='bunk2', L=B2?w:h, Wd=B2?h:w, pw=0.08, FO=gymState.bunkFront;   // FO: only the parts in front of a sleeper
      const mp=(a,b)=>B2?[i+a,j+b]:[i+b,j+a];
      const GT=rgb('#f7eec0'), GF=rgb('#eedc94'), GS=rgb('#d2ba6a'), GE=rgb('#6b5a2c'), GH=rgb('#fff8d8'), GD=rgb('#9c8446');   // cream enamel (brighter + yellower than the tan wall)
      const RT=rgb('#b4473c'), RF=rgb('#91332b'), RS=rgb('#6e2620'), RH=rgb('#cc6353'), RD=rgb('#521b16');                    // maroon ladder / rail
      const gbox=(i0,j0,i1,j1,z0,z1,cT,cF,cS,fnT,E0)=>{
        const thin=(i1-i0<0.3||j1-j0<0.3), E=E0||(thin?cS:GE);
        quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,()=>cF);
        quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,()=>cS);
        quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,fnT||(()=>cT));
        isoLine(i0,j0,z1,i1,j0,z1,E); isoLine(i0,j0,z1,i0,j1,z1,E); isoLine(i0,j1,z1,i1,j1,z1,E); isoLine(i1,j0,z1,i1,j1,z1,E);
        if(!thin){ isoLine(i0,j1,z0,i1,j1,z0,E); isoLine(i1,j0,z0,i1,j1,z0,E);
        isoLine(i0,j1,z0,i0,j1,z1,E); isoLine(i1,j1,z0,i1,j1,z1,E); isoLine(i1,j0,z0,i1,j0,z1,E); } };
      const gb=(a0,b0,a1,b1,z0,z1,cT,cF,cS,fnT,E)=>{ const p=mp(a0,b0), q=mp(a1,b1);
        gbox(Math.min(p[0],q[0]),Math.min(p[1],q[1]),Math.max(p[0],q[0]),Math.max(p[1],q[1]),z0,z1,cT||GT,cF||GF,cS||GS,fnT,E); };
      const ln=(a0,b0,z0,a1,b1,z1,c)=>{ const p=mp(a0,b0), q=mp(a1,b1); isoLine(p[0],p[1],z0,q[0],q[1],z1,c); };
      const GO=rgb('#2c2615');                                                                   // dark outline, like the other cell props
      const post=(a,b)=>{ const c=a+pw/2, d=b+pw/2;                                              // thin square tube: lit + shaded 1px
        ln(c,d,0,c,d,21.6,GF); ln(c+(B2?0.09:0),d+(B2?0:0.09),0,c+(B2?0.09:0),d+(B2?0:0.09),21.6,GS); ln(c,d,21.6,c,d,21.6,GH); };
      const panel=(a)=>{                                                                         // end panel: top bar + 3 vertical slats per level
        for(const [z0,z1] of [[15.2,20.3],[6.2,9.0]]){
          for(let k=1;k<=3;k++){ const b=0.1+(Wd-0.2)*k/4; ln(a,b,z0,a,b,z1,GF); }
          gb(a-0.05,0.1,a+0.05,Wd-0.1,z1,z1+0.6); } };
      const quilt=(zt)=>(x,y)=>{ floorAt(x,y,zt); const u=B2?state.fa-i:state.fz-j, v=B2?state.fz-j:state.fa-i;                      // quilted top, diamond stitching
        const s=Math.floor((u+v)*3.2)+Math.floor((u-v)*3.2); const d=((u+v)*3.2%1+1)%1;
        if(d<0.12||((((u-v)*3.2)%1+1)%1)<0.12) return rgb('#cfd3d5'); return (s&1)?rgb('#f1f1ec'):rgb('#e7e8e3'); };
      const bedding=(zm,lv)=>{                                                                   // thin white quilted mattress + folded sheet at the head
        gb(0.12,0.12,L-0.12,Wd-0.12,zm,zm+1.3,rgb('#eeeeea'),rgb('#d7d8d4'),rgb('#babcb9'),quilt(zm+1.3),rgb('#a2a6a8'));
        gb(0.18,0.22,0.8,Wd-0.2,zm+1.3,zm+2.0,rgb('#f6f4ee'),rgb('#dcd9d0'),rgb('#c0bdb3'),null,rgb('#aaa79d'));   // pillow
        if(lv) gb(0.85,0.2,1.35,Wd-0.18,zm+1.3,zm+1.85,rgb('#f2f0e8'),rgb('#d5d2c8'),rgb('#b8b5ab'),null,rgb('#a4a197')); };  // folded sheet
      // --- back things first
      if(!FO){ post(0,0);
      panel(0.07);
      gb(0.15,0.02,L-0.15,0.14,2.9,4.9); gb(0.15,0.02,L-0.15,0.14,11.9,13.9);                    // back rails (mostly hidden)
      post(0,Wd-pw); post(L-pw,0); }
      // --- two wooden drawers under the lower bed (walnut, flush with the front, cut-out grip at the top)
      const DT=rgb('#a06a3e'), DF=rgb('#8c5832'), DS=rgb('#704526'), DE=rgb('#3a2213'), DG=rgb('#9a643a'), DN=rgb('#1e120a');
      const dA0=pw+0.03, dA1=L-pw-0.03, dM=L/2;
      if(!FO){
      gb(dA0,0.2,dM-0.03,Wd-0.02,0.3,2.85,DT,DF,DS,null,DE); gb(dM+0.03,0.2,dA1,Wd-0.02,0.3,2.85,DT,DF,DS,null,DE);
      ln(dA0,Wd,1.3,dM-0.1,Wd,1.3,DG); ln(dM+0.1,Wd,1.8,dA1,Wd,1.8,DG);                           // grain
      ln(dM,Wd,0.3,dM,Wd,2.85,DE);                                                               // seam between the drawers
      for(const c of [(dA0+dM)/2,(dM+dA1)/2]) ln(c-0.2,Wd,2.5,c+0.2,Wd,2.5,DN);                    // grip cut-outs
      ln(dA0,Wd,0.2,dA1,Wd,0.2,DE);                                                              // bottom edge
      }
      // --- lower bed then upper bed
      for(const lv of [0,1]){
        const zf=lv?11.9:2.9, zm=zf+2.0;
        if(!FO){ gb(0,0,0.14,Wd,zf,zm);                                                        // head-end rail
        bedding(zm,lv); }
        gb(0,Wd-0.14,L,Wd,zf,zm);                                                              // wide flat side rail, front
        ln(0,Wd+0.02,zf-0.3,L,Wd+0.02,zf-0.3,GO);                                              // its dark underside
        ln(0.15,Wd,zm-0.4,L-0.15,Wd,zm-0.4,GH);                                                // enamel highlight on the flat bar
        gb(L-0.14,0,L,Wd,zf,zm);                                                               // foot-end rail
        ln(pw,Wd+0.02,zm+2.6,0.75,Wd+0.02,zm,GD); ln(L-pw,Wd+0.02,zm+2.6,L-0.75,Wd+0.02,zm,GD);   // diagonal braces post -> side rail
        if(lv){ ln(pw,Wd,zf-2.2,0.5,Wd,zf,GD); ln(L-pw,Wd,zf-2.2,L-0.5,Wd,zf,GD); }             // brackets under the upper frame
      }
      post(L-pw,Wd-pw);
      panel(L-0.07);
      if(!B2&&!it.hideShirt){                                                                    // prison work shirt drying over the upper foot bar
        const sj=j+L+0.03, s0=i+0.16, s1=i+Wd-0.12, zt0=20.9, zb=13.6, sw=s1-s0;
        const BT=rgb('#5d7189'), BF=rgb('#4b5c71'), BL=rgb('#7388a1'), BD=rgb('#3c4a5a'), BG=rgb('#566057');
        quad(s0,sj,zb,s1,sj,zb,s1,sj,zt0,s0,sj,zt0,(x,y)=>{ faceJ(sj,x,y); const u=(state.fa-s0)/sw, v=(zt0-state.fz)/(zt0-zb);
          const body=u>0.2&&u<0.8, sleeve=(u<=0.2||u>=0.8)&&v<0.62-(u<0.2?(0.2-u):(u-0.8))*0.9;
          if(!body&&!sleeve) return 0;
          if(v<0.09) return BD;                                                                    // fold over the bar
          if(body&&v<0.2&&Math.abs(u-0.5)<0.12) return BL;                                         // collar
          if(body&&Math.abs(u-0.5)<0.03&&v>0.2) return ((Math.floor(v*9))&1)?rgb('#c9ccc4'):BF;     // button placket
          if(body&&v>0.9) return BF;                                                               // hem
          if(h2(Math.floor(u*11),Math.floor(v*9))<34) return BG;                                   // grime
          if(sleeve) return u<0.2?BL:BF;
          const f=(u*5)%1; return f<0.18?BF:(f>0.85?BL:BT); });
        ln(0.2,Wd,zt0+0.2,0.2,Wd-0.01,zt0+0.2,BD);
      }
      // --- maroon ladder in the left third of the long side as seen by the camera (like the reference; on the left bunk
      //     that is the end away from the wall, so the cabinet no longer hides it). Its stiles rise above
      //     the upper bunk, bend outwards and run on as the guard rail to the posts - two rail sections, gap = the way in.
      //     1px lines: at 144x96 boxes would merge into a red block.
      const bx=Wd+0.06, lad0=B2?L*0.3:L*0.7-0.62, lad1=lad0+0.62, zR=18.6, bend=0.16;
      ln(lad0,bx,3.0,lad0,bx,zR-0.9,RF); ln(lad1,bx,3.0,lad1,bx,zR-0.9,RF);                                   // stiles
      for(const z of [4.4,7.4,10.4,13.4]) ln(lad0,bx,z,lad1,bx,z,RT);                                          // rungs
      ln(lad0,bx,zR-0.9,lad0-bend,bx,zR,RH); ln(lad1,bx,zR-0.9,lad1+bend,bx,zR,RH);                           // the bends
      ln(pw+0.02,bx,zR,lad0-bend,bx,zR,RT); ln(lad1+bend,bx,zR,L-pw-0.02,bx,zR,RT);                           // guard rail -> posts
      ln(pw+0.02,bx,zR,pw+0.02,bx,zR,RD); ln(L-pw-0.02,bx,zR,L-pw-0.02,bx,zR,RD);                             // bolts on the posts
      return true; }
    case 'crad': {
      const j1=j+h;
      isoBox(i,j,i+w,j1,2.2,9.5,state.CLC.rdT,state.CLC.rdF,state.CLC.rdS,(x,y)=>{ faceJ(j1,x,y); const u=(state.fa-i)*7, f=u-Math.floor(u); if(state.fz<3||state.fz>8.6) return state.CLC.rdG; return f<0.28?state.CLC.rdG:state.CLC.rdF; });
      isoLine(i+0.1,j+0.05,2.2,i+0.1,j+0.05,0.5,state.CLC.rdG); isoLine(i+w-0.1,j+0.05,2.2,i+w-0.1,j+0.05,0.5,state.CLC.rdG);
      return true; }
    case 'ccom': {    // hanging cabinet after the photo: a long box in brown wood-grain veneer, two sliding doors covered in
                      // flowered paper with round green knobs at the ends, open cubbies with a shelf in the middle (a mug, a jar, a box)
      const i0=i+0.05, i1=i+w-0.02, j0=0.02, j1=j+h-0.12, z0=12.4, z1=18.4;
      const VT=rgb('#9a6a3a'), VF=rgb('#7a4c26'), VS=rgb('#5e3a1c'), VE=rgb('#3e2612'), IN=rgb('#3b2614');
      const P0=rgb('#d6c8a2'), PP=rgb('#b4868a'), PG=rgb('#7d8c5c'), GK=rgb('#2e7d3c');
      const paper=(/** @type {number} */ a,/** @type {number} */ b)=>{ const n=h2(Math.floor(a*30),Math.floor(b*2.2)); return n<18?PP:n<32?PG:P0; };
      quad(i0+0.05,0.03,z0-0.8,i1-0.05,0.03,z0-0.8,i1-0.05,0.03,z0,i0+0.05,0.03,z0,(x,y)=>((x+y)&1)?state.CLC.wU[2]:0);   // its shadow on the wall
      plainBox(i0,j0,i1,j1,z0,z1,VT,(x,y)=>{ faceJ(j1,x,y); const u=(state.fa-i0)/(i1-i0), v=(state.fz-z0)/(z1-z0);
        if(v<0.12||v>0.9||u<0.03||u>0.97) return VF;                                           // veneer frame
        if(u<0.44||u>0.72){ if(Math.abs(u-0.44)<0.02||Math.abs(u-0.72)<0.02) return VE;       // door edges
          if(Math.abs(v-0.55)<0.1&&(Math.abs(u-0.37)<0.035||Math.abs(u-0.79)<0.035)) return GK;   // green knobs
          return paper(state.fa,state.fz); }
        if(Math.abs(u-0.58)<0.025||Math.abs(v-0.5)<0.06) return VF;                            // divider and shelf
        if(u>0.47&&u<0.53&&v>0.14&&v<0.4) return rgb('#e8e2d0');                               // a white box
        if(u>0.48&&u<0.53&&v>0.57&&v<0.74) return rgb('#b3bac0');                              // tin mug
        if(u>0.62&&u<0.67&&v>0.57&&v<0.8) return rgb('#9a5e26');                               // jar of tea
        return IN; },(x,y)=>{ faceI(i1,x,y); return ((Math.floor(state.fz*1.6)+Math.floor(state.fa*8))%4===0)?VE:VS; },VE);
      return true; }
    case 'cwc': return drawDoorToilet(it);
    case 'ccurt': return drawCornerCurtain(it);
    case 'csink': return drawWallSink(it);
    case 'ctable': {   // plain wooden table (no black outline): plank top with a darker edge band, 4 wooden legs,
                       // an aluminium plate and a tin mug on top
      const i1=i+w, j1=j+h, zt=6.6, zT=zt+0.9;
      const TT=rgb('#b6773c'), TF=rgb('#8f5a2a'), TS=rgb('#6c4220'), TE=rgb('#5a3719'), TG=rgb('#a56a34'), LG=rgb('#7a4a22'), LD=rgb('#5c3818');
      isoLine(i+0.1,j+0.1,0,i+0.1,j+0.1,zt,LD); isoLine(i1-0.1,j+0.1,0,i1-0.1,j+0.1,zt,LD);            // back legs
      isoLine(i+0.1,j1-0.1,0,i+0.1,j1-0.1,zt,LG);
      quad(i,j1,zt,i1,j1,zt,i1,j1,zT,i,j1,zT,()=>TF); quad(i1,j,zt,i1,j1,zt,i1,j1,zT,i1,j,zT,()=>TS);
      quad(i,j,zT,i1,j,zT,i1,j1,zT,i,j1,zT,(x,y)=>{ floorAt(x,y,zT); const f=((state.fz-j)*4.6)%1;              // planks + grain
        return f<0.1?TE:((h2(Math.floor(state.fa*7),Math.floor(state.fz*4.6))<40)?TG:TT); });
      isoLine(i,j1,zt,i1,j1,zt,TE); isoLine(i1,j,zt,i1,j1,zt,TE);                                       // underside edge (brown, not black)
      isoLine(i1-0.1,j1-0.1,0,i1-0.1,j1-0.1,zt,LG);                                                       // front leg
      // aluminium plate: shallow disc with a raised rim
      const pc=i+0.75, pj=j+0.62, pr=0.3;
      solidDraw(pc-pr,pj-pr,pc+pr,pj+pr,zT,zT+0.45,(a,b,z)=>{ const d=Math.hypot(a-pc,b-pj); if(d>pr) return 0;
        if(z>zT+0.3) return d>pr*0.72?rgb('#d7dbe0'):((h2(Math.floor(a*30),Math.floor(b*30))<40)?rgb('#8d949b'):rgb('#a9b0b7'));
        return ((a-pc)-(b-pj))>0?rgb('#7b8289'):rgb('#9aa1a8'); });
      // tin mug with a handle
      const mc=i+1.45, mj=j+0.5, mr=0.11;
      solidDraw(mc-mr,mj-mr,mc+mr,mj+mr,zT,zT+1.9,(a,b,z)=>{ const d=Math.hypot(a-mc,b-mj); if(d>mr) return 0;
        if(z>zT+1.7) return d>mr*0.6?rgb('#dfe3e6'):rgb('#3a3f44');
        return ((a-mc)-(b-mj))>0.02?rgb('#7d848b'):rgb('#b3bac0'); });
      psetK(Math.round(isoX(mc+mr+0.06,mj-0.06)),Math.round(isoY(mc+mr+0.06,mj-0.06,zT+1.0)),rgb('#7d848b'));
      if(gymState.ISO_K>1){   // the 2× room has room for the small things: a tin ashtray with butts, a pack of Popularne
        const ac=i+1.25, aj=j+0.98, ar=0.16;
        solidDraw(ac-ar,aj-ar,ac+ar,aj+ar,zT,zT+0.35,(a,b,z)=>{ const d=Math.hypot(a-ac,b-aj); if(d>ar) return 0;
          if(z>zT+0.25){ if(d<ar*0.7) return (h2(Math.floor(a*60),Math.floor(b*60))<70)?rgb('#e8e2d4'):rgb('#5e5a52'); return rgb('#b8bcc0'); } return rgb('#80868c'); });
        plainBox(i+0.35,j+0.9,i+0.62,j+1.08,zT,zT+0.9,rgb('#e4dccb'),(x,y)=>{ faceJ(j+1.08,x,y); return state.fz>zT+0.55?rgb('#b3332a'):rgb('#e4dccb'); },(x,y)=>{ faceI(i+0.62,x,y); return state.fz>zT+0.55?rgb('#8a2620'):rgb('#c4bcaa'); },rgb('#8a2620'));
      }
      return true; }
    case 'cstool': {   // steel-legged stool with a green seat
      const i1=i+w, j1=j+h, zs=4.2, zS=5.1;
      const ST=rgb('#5e8a55'), SF=rgb('#48703f'), SS=rgb('#375631'), SE=rgb('#27401f'), SH=rgb('#79a36c'), LG=rgb('#9aa0a6'), LD=rgb('#6d737a');
      isoLine(i+0.08,j+0.08,0,i+0.08,j+0.08,zs,LD); isoLine(i1-0.08,j+0.08,0,i1-0.08,j+0.08,zs,LD); isoLine(i+0.08,j1-0.08,0,i+0.08,j1-0.08,zs,LG);
      quad(i,j1,zs,i1,j1,zs,i1,j1,zS,i,j1,zS,()=>SF); quad(i1,j,zs,i1,j1,zs,i1,j1,zS,i1,j,zS,()=>SS);
      quad(i,j,zS,i1,j,zS,i1,j1,zS,i,j1,zS,(x,y)=>{ floorAt(x,y,zS); return ((state.fa-i)<0.14||(state.fz-j)<0.14)?SH:ST; });
      isoLine(i,j1,zs,i1,j1,zs,SE); isoLine(i1,j,zs,i1,j1,zs,SE);
      isoLine(i1-0.08,j1-0.08,0,i1-0.08,j1-0.08,zs,LG);
      return true; }
    case 'cwheel': {   // old steel wheelchair facing +j: two big wheels with hand rims, leather seat and back, casters, footrest
      const i0=i+0.08, i1=i+w-0.08, j0=j+0.12, j1=j+h-0.1, FO=gymState.bunkFront;
      const FR=rgb('#a4aab0'), FD=rgb('#6c737a'), TY=rgb('#18181a'), TYL=rgb('#3a3a3e'), LE=rgb('#3e302a'), LL=rgb('#5a4638'), LD=rgb('#2a201c');
      const wheel=(/** @type {number} */ wi)=>{ const jc=j0+0.38, R=0.42, zc=3.7, ZR=3.6; let pj=jc+R, pz=zc;
        for(let a=1;a<=24;a++){ const t=a/24*Math.PI*2, nj=jc+R*Math.cos(t), nz=zc+ZR*Math.sin(t); isoLine(wi,pj,pz,wi,nj,nz,TY); isoLine(wi,pj,pz-0.5,wi,nj,nz-0.5,TYL); pj=nj; pz=nz; }
        for(let a=0;a<4;a++){ const t=a/4*Math.PI*2+0.4; isoLine(wi,jc,zc,wi,jc+R*0.85*Math.cos(t),zc+ZR*0.85*Math.sin(t),FD); }
        isoLine(wi,jc,zc,wi,jc,zc+0.01,FR); };
      if(!FO){
        wheel(i0);
        quad(i0+0.1,j0+0.02,5.4,i1-0.1,j0+0.02,5.4,i1-0.1,j0+0.02,11.4,i0+0.1,j0+0.02,11.4,(x,y)=>((x+y)%5===0?LD:LE));          // backrest
        isoLine(i0+0.08,j0,5,i0+0.08,j0,12.4,FD); isoLine(i1-0.08,j0,5,i1-0.08,j0,12.4,FR);                                   // back posts
        isoLine(i0+0.08,j0,12.4,i0+0.08,j0-0.22,12.6,TY); isoLine(i1-0.08,j0,12.4,i1-0.08,j0-0.22,12.6,TY);                   // push handles
        quad(i0+0.1,j0+0.05,5.1,i1-0.1,j0+0.05,5.1,i1-0.1,j1-0.12,5.1,i0+0.1,j1-0.12,5.1,(x,y)=>{ floorAt(x,y,5.1); return (state.fz-j0)<0.12?LD:((x+y)&3)===0?LL:LE; });   // seat
        isoLine(i0+0.1,j0+0.05,8.2,i0+0.1,j0+0.7,8.2,FD); isoLine(i0+0.1,j0+0.7,8.2,i0+0.1,j0+0.7,5.1,FD);                   // far armrest
        isoLine(i0+0.12,j1-0.12,5,i0+0.12,j1,1.4,FD); isoLine(i0+0.14,j1,0.6,i0+0.14,j1,0.61,TY);                             // far front leg + caster
      }
      wheel(i1);
      isoLine(i1-0.1,j0+0.05,8.2,i1-0.1,j0+0.7,8.2,FR); isoLine(i1-0.1,j0+0.7,8.2,i1-0.1,j0+0.7,5.1,FR);                       // near armrest
      isoLine(i1-0.12,j1-0.12,5,i1-0.12,j1,1.4,FR); isoLine(i1-0.14,j1,0.6,i1-0.14,j1,0.61,TY);                                // near front leg + caster
      quad(i0+0.15,j1-0.05,1.3,i1-0.15,j1-0.05,1.3,i1-0.15,j1+0.12,1.3,i0+0.15,j1+0.12,1.3,()=>FD);                          // footrest
      return true;
    }
    case 'cbucket': {   // galvanised slop pail (redrawn): round, tapered, two pressed ribs, rolled rim, wire handle with a wooden grip
      const ci=i+w/2, cj=j+h/2, zt=5.0, rb=0.3, rt=0.4;
      const G0=rgb('#c3c9cc'), G1=rgb('#a0a7ab'), G2=rgb('#7f868b'), G3=rgb('#5f656a'), GR=rgb('#d3d8da'), GI=rgb('#2c2f2d'), GU=rgb('#7a5a36');
      solidDraw(ci-rt,cj-rt,ci+rt,cj+rt,0,zt+0.35,(pi,pj,pz)=>{
        const r=rb+(rt-rb)*Math.min(1,pz/zt)+(pz>zt-0.1?0.03:0), di=pi-ci, dj=pj-cj, d2=di*di+dj*dj;
        if(d2>r*r) return 0;
        if(pz>zt-0.05){ return d2<(r*0.8)*(r*0.8)?((h2(Math.floor(pi*30),Math.floor(pj*30))<30)?rgb('#3e3a2c'):GI):GR; }   // rim + dark inside
        const sx=(di-dj)/r;                                                                              // -1.4 (lit, left) .. 1.4 (shade, right)
        if(Math.abs(pz-1.5)<0.28||Math.abs(pz-3.4)<0.28) return sx>0.7?G2:G0;                          // pressed ribs
        if(pz<0.35) return G3;
        if(h2(Math.floor((pi+pj)*22),Math.floor(pz*1.5))<14) return GU;                                  // rust spots
        return sx<-0.55?G0:(sx<0.35?G1:(sx<0.95?G2:G3)); });
      for(let k=0;k<=24;k++){ const t=Math.PI*k/24, c=Math.cos(t)*0.7071*rt, hz=zt-0.3+2.4*Math.sin(t);   // wire handle, arcs over the top
        psetK(Math.round(isoX(ci+c,cj-c)),Math.round(isoY(ci+c,cj-c,hz)),(k>9&&k<15)?rgb('#6a4a2a'):G3); }
      return true; }
  }
  return false;
}

/** Daylight bucket shared by prison and work scene backgrounds. */
export function skyBucket(){ const h=progressionState.save.sim.min/60; return h<5?0:h<7?1:h<17.5?2:h<19.5?3:h<21.5?4:0; }

export function cellOptions(st){
  const s=progressionState.save.sim, it=st.item;
  switch(st.id){
    case 'cdoor': return cellDoorOptions(goRoom);
    case 'ydoor': return yardDoorOptions(goRoom);
    case 'cpull': return [[()=>'Podciąganie na kracie okna · stopień '+ROMAN[stageFor('pullup')-1]+' · minuta · 1 akcja',startPullups,false,'go'],stageOption('pullup')];
    case 'croach': return [[()=>'Karaluchy na ścianie · stopień '+ROMAN[stageFor('roach')-1]+' · ogarek łoju · 1 akcja',startRoaches,false,'go'],stageOption('roach')];
    case 'cshadow': return [[()=>'Walka z cieniem · stopień '+ROMAN[stageFor('shadow')-1]+' · 10 kombinacji · 1 akcja',()=>startShadowboxing(st),false,'go'],stageOption('shadow')];
    case 'cpush': return [[()=>'Pompki · stopień '+ROMAN[stageFor('pushup')-1]+' · minuta · 1 akcja',()=>{ pushupsState.puVenue='cell'; startPushup(); },false,'go'],stageOption('pushup')];
    case 'ccom': return isPrison()?lockerOptions(st,startActivity):[];
    case 'cwash': { const soap=isPrison()&&useSoap(false), H=soap?40:20, done=isPrison()&&state.washKey===s.day*3+s.faza;   /* a quick wash at the butt: no action, once a phase */
      return [['Umyj się przy beczce z wodą · +'+H+' higieny · bez akcji'+(soap?' (mydło)':' (woda na przydział)')+(done?' — już się myłeś':''),()=>{ if(soap) useSoap(true); if(isPrison()) state.washKey=s.day*3+s.faza; startActivity(st,{kind:'wash',label:'mycie w misce',min:0,pose:0,at:[it.i-0.5,it.j+0.3],face:[1,0],order:'before',pop:state.T_WYSPANY+4,after:()=>simNudge('h',H)}); },s.h>=90||done,'act']]; }
    case 'bunk': return [...bunkOptions(st,startActivity,PALLET_Z-0.25),...(isPrison()?lockerOptions(st,startActivity):[])];
  }
  return [];
}
/** Run a timed activity in the room (sleep, eating, washing, waiting…). @param {any} st @param {any} spec */
export function startActivity(st,spec){
  stMenuClose(); initAudio(); sfxWhoosh(0.3);
  state.hubAct=Object.assign({t:0,done:0,dur:spec.kind==='sleep'?120:70,st,item:st.item},spec);
  for(const k in gymState.hubKeys) gymState.hubKeys[k]=0; gymState.hubNear=null; persist(); setInfo();
}

export function actTick(){
  const A=state.hubAct; A.t++;
  if(A.t<=state.ACT_FADE){ gymState.hubFade=A.t/state.ACT_FADE;
    if(A.t===state.ACT_FADE){ gymState.hubP.i=A.at[0]; gymState.hubP.j=A.at[1]; gymState.hubP.fi=A.face[0]; gymState.hubP.fj=A.face[1]; gymState.hubP.pose=A.pose; gymState.hubP.poseZ=A.pz||0; gymState.hubP.moving=false; if(A.kind==='sleep') sfxChime(420); }
    return; }
  const k=A.t-state.ACT_FADE;
  if(k<=A.dur){ gymState.hubFade=k<state.ACT_FADE?1-k/state.ACT_FADE:0; A.done=k;
    if((k&7)===0) simUI();
    if(A.kind==='eat'&&k%40===20) tone('square',220,180,0.02,0.05);
    return; }
  const u=k-A.dur; gymState.hubFade=Math.min(1,u/state.ACT_FADE);
  if(u>=state.ACT_FADE){
    const st=A.st; gymState.hubP.pose=0; gymState.hubP.poseZ=0; gymState.hubP.i=st.spot[0]; gymState.hubP.j=st.spot[1];
    let fi=st.look[0]-st.spot[0], fj=st.look[1]-st.spot[1]; const l=Math.hypot(fi,fj)||1; gymState.hubP.fi=-fi/l; gymState.hubP.fj=-fj/l;   // step away, facing the room
    state.hubAct=null; gymState.fadeInT=14; gymState.hubFade=1;
    if(!A.stopped) A.after?.();   // what the activity does (an action spent, a need changed) lands once it is done
    if(!A.stopped&&A.pop>=0) popup(A.pop,72,20,appearanceState.C_SPARK,1,70);
    sfxChime(760); persist(); simUI(); setInfo();
  }
}

export function actStop(){ const A=state.hubAct; if(!A) return; A.stopped=true; if(A.t<=state.ACT_FADE){ A.t=state.ACT_FADE; } const k=A.t-state.ACT_FADE; if(k<=A.dur){ A.dur=Math.max(1,A.done); A.t=state.ACT_FADE+A.dur; } }

export function actRun(){ return state.hubAct&&state.hubAct.t>state.ACT_FADE&&state.hubAct.t<=state.ACT_FADE+state.hubAct.dur; }

export function goRoom(room,mins){
  if(!roomOpen(room)) return;
  void mins; setRoomRaw(room);   /* walking between rooms costs no action */
  const door=gymState.gymItems.find(x=>x.t===({cell:'cdoor',yard:'ydoor',laznia:'ldoor'}[gymState.hubRoom]));
  enterHub(door?stationOf(door):null);
  gymState.hubP.fi=-gymState.hubP.fi; gymState.hubP.fj=-gymState.hubP.fj;                     // came in through the door: face the room
  simUI();
}

export function dimFB(f){ const k=Math.max(0,Math.min(256,(256*(1-f))|0)); for(let i=0;i<appearanceState.W*appearanceState.H;i++){ const c=rendererState.FB_MAIN[i]; rendererState.FB_MAIN[i]=(0xff000000|((((c>>16)&255)*k>>8)<<16)|((((c>>8)&255)*k>>8)<<8)|((c&255)*k>>8))>>>0; } }

export function drawActivityOverlay(){
  const A=state.hubAct;
  if(!A) return;
  const K=gymState.ISO_K;
  if(A.kind==='sleep'&&actRun()){ dimFB(0.5); const x=Math.round(isoX(A.at[0],A.at[1]-1))+3*K, y=Math.round(isoY(A.at[0],A.at[1]-1,(A.pz||6.5)+5.5));
    for(let k=0;k<3;k++){ const ph=((boxingState.tick+k*26)%78)/78; if(ph<0.08) continue; drawText('Z',x+(k*3+Math.round(ph*4))*K,y-Math.round(ph*14)*K,ph>0.8?appearanceState.C_GRAY:appearanceState.C_WHITE,1); } }
  if(actRun()) drawText(simTime().toUpperCase(),72*K,3*K,appearanceState.C_SPARK,2);
}

export function initialize(){

// points on a vertical face: x,y -> coordinate along the face + height
state.fa = 0;
state.fz = 0;

// Newgate Ward geometry.
state.CELL_W = WARD_W;
state.CELL_H = WARD_H;

Object.assign(gymState.GYM_TYPES,{
  cdoor:{fixed:true,flat:true,z:9,st:'cdoor'}, bunk:{fixed:true,block:true,z:14,st:'bunk'}, bunk2:{fixed:true,block:true}, cpull:{fixed:true,flat:true,z:20.9,st:'cpull'}, croach:{fixed:true,flat:true,z:13,st:'croach'},
  crad:{fixed:true,block:true}, ccom:{fixed:true,block:true,z:17,st:'ccom'}, cshadow:{fixed:true,flat:true,z:0,st:'cshadow'}, cfloor:{fixed:true,flat:true,z:1,st:'cpush'}, cwc:{fixed:true,block:true}, csink:{fixed:true,block:true,z:10,st:'cwash'}, ctable:{fixed:true,block:true}, cstool:{fixed:true,block:true},
  ccurt:{fixed:true,block:true}, cradio:{fixed:true,flat:true}, ccross:{fixed:true,flat:true}, ccal:{fixed:true,flat:true}, cbucket:{fixed:true,block:true}, cwheel:{fixed:true,block:true,z:15,st:'profesor'}
});

Object.assign(gymState.ST_INFO,{cpull:['PODCIAGANIE','Krata okna nad pryczą — podciąganie'],croach:['ŚCIANA','Ściana z wyrytym GOD HELP ME — karaluchy'],cpush:['POMPKI','Wolny kawałek podłogi — pompki'],cdoor:['DRZWI','Dębowe drzwi Wardu z klapą'],bunk:['PRYCZA','Prycza — sen'],cwash:['BECZKA','Beczka z wodą — zimna woda na przydział'],ccom:['SKRZYNIA','Skrzynia — zapasy kupione przez klapę']});
gymState.ST_INFO.cshadow=['WALKA Z CIENIEM','Wolne miejsce na środku — shadowboxing'];
gymState.ST_INFO.profesor=['PROFESOR','Profesor — stary pięściarz w fotelu na kółkach'];

state.CLC = {
  wU:[rgb('#b3a67c'),rgb('#a4976e'),rgb('#8a7e5a')], wL:[rgb('#5d6b58'),rgb('#505d4c'),rgb('#3c473a')],
  plaster:rgb('#8e8570'), plaster2:rgb('#776f5d'), damp:rgb('#3d4a3c'), mold:rgb('#2f3a2e'), line:rgb('#2f382d'), conduit:rgb('#2d2c26'), switchW:rgb('#d4d0be'),
  frT:rgb('#c2b174'),frF:rgb('#a09054'),frS:rgb('#7a6d3e'), mT:rgb('#dcd8c6'),mF:rgb('#b8b4a1'),mS:rgb('#97937f'), bT:rgb('#737a6c'),bF:rgb('#5d6356'),bS:rgb('#494e43'),
  red:rgb('#8a5234'),red2:rgb('#5f3822'),
  tbT:rgb('#b6773c'),tbF:rgb('#8f5a2a'),tbS:rgb('#6c4220'),
  stT:rgb('#cfc8ae'),stF:rgb('#a8a188'),stS:rgb('#877f6a'),
  rdT:rgb('#e2e3df'),rdF:rgb('#c5c7c3'),rdS:rgb('#a3a5a2'),rdG:rgb('#8f918d'),
  zT:rgb('#aeb2b3'),zF:rgb('#82878b'),zS:rgb('#62676c'),zL:rgb('#93989b'),
  bwT:rgb('#e8e6dc'),bwF:rgb('#c9c7bb'),bwS:rgb('#a8a698'),bwIn:rgb('#8f9aa8'),rim:rgb('#3f5fa8'),
  jgT:rgb('#4b6fb8'),jgF:rgb('#38549a'),jgS:rgb('#2a3f78'),
  cbT:rgb('#8d928a'),cbF:rgb('#737870'),cbS:rgb('#5a5e56'),
  dFr:rgb('#262c34'),dP:rgb('#46515e'),dR:rgb('#343d48'),dHi:rgb('#7a8797'),dHatch:rgb('#323b46'),dLens:rgb('#9aa596'),dBolt:rgb('#2a2d28'),dLock:rgb('#c2b174'),
  tile:[rgb('#8a8472'),rgb('#7f7969'),rgb('#928c79')], grout:rgb('#66624f'), stain:rgb('#6f6a5a')
};

state.cellSkyB = -1;

state.SKY = [['#0b1030','#16204a'],['#f09060','#5a3a78'],['#9cc8ee','#5a94d0'],['#f0a050','#a0507a'],['#3a2a60','#1a1a44']];

state.homeSkyB = -1;
state.homeWx = '';   // the weather the background was built for


/* ---------- activities: sleep, nap, rest, meals, shower (the clock runs while they last) ---------- */
state.hubAct = null;

state.T_WYSPANY = boxingState.TXT.length;
 boxingState.TXT.push('WYSPANY!','DZIEN DOBRY','ODPOCZETY','MNIAM!','SWIEZY!','KRZEPA!');

state.ACT_FADE = 10;
}
