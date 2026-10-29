import { state as appearanceState, rgb, setRamp } from './appearance.js';
import { carryingTray, drawHeldTray, mealDoorOptions, mealBedOptions, mealMateOptions } from './ward-meal.js';
import { buildBath, drawBathItem, bathTick, bathOptions, bathFX, BATH_W, BATH_H, LAMPS as BATH_LAMPS, state as bathState } from './bath.js';
import { gateOptions, listTag, prisonFightStart, prisonFightExtras } from './prison.js';
import { state as rendererState, line, taper, pset, shadowEll, withHD, hdRoom, roomFrame, zoomBlit, setLightVec, setFramebuffer } from './renderer.js';
import { drawHDCharacterDetails } from './hd-fight-scene.js';
import { state as progressionState } from './progression.js';
import { buildYard, state as npcsState, cnTick, ynTick, cnBlocks, ynBlocks, cnNight, cnRect, cnDraw, cnToiletStream } from './npcs.js';
import { lightCell, drawCellLights, cellLights } from './cell-light.js';
import { wardBlanket, wardLife, wardRoaches, wardBreath, wardSmog, wardVignette, LAMP, WARD_WIN } from './ward.js';
import { yardFog } from './exercise-yard.js';
import { weatherNow, weatherLight, drawRain } from './weather.js';
import { drawCellItem, state as roomsState, buildCell, skyBucket, cellOptions, actTick, dimFB, drawActivityOverlay } from './rooms.js';
import { state as boxingState, updatePopups, drawPopups } from './boxing.js';
import { state as navigationState, setPanelMode } from './navigation.js';
import { state as sparringState, startSpar, oppStars } from './sparring.js';
import { tone } from './audio.js';
import { setInfo } from './input.js';
import { devDoorOptions } from './devtools.js';

/** Rooms where the player wears the prison drelich. */
const PRISON_LOOK=['cell','yard'];   // in the bath: a towel (drawIsoBoxer)

// Runtime values owned by gym; initialized explicitly by main.js.
export const state = {};

/** Release hub controls when an overlay takes focus. */
export function clearHubInput(){ for(const key in state.hubKeys) state.hubKeys[key]=0; }

/** Select a temporary prop camera; return the previous projection for restoration. */
export function setPropCamera(camera){ const previous=state.propCamera; state.propCamera=camera; return previous; }

export function isoX(i,j){ const c=state.propCamera; return c?c.x+i*c.ix+j*c.jx:(state.HUB_OX+(i-j)*6)*state.ISO_K; }

export function isoY(i,j,z){ const c=state.propCamera; return c?c.y+i*c.iy+j*c.jy-z*c.z:(state.HUB_OY+(i+j)*3-z)*state.ISO_K; } function fillPoly(n,fn){
  let y0=1e9,y1=-1e9; for(let k=0;k<n;k++){ if(state.PY[k]<y0)y0=state.PY[k]; if(state.PY[k]>y1)y1=state.PY[k]; }
  y0=Math.max(0,Math.ceil(y0)); y1=Math.min(appearanceState.H-1,Math.floor(y1));
  const K=state.propCamera?1:state.ISO_K;
  for(let y=y0;y<=y1;y++){
    let xa=1e9,xb=-1e9;
    for(let k=0;k<n;k++){ const k2=(k+1)%n, ay=state.PY[k], by=state.PY[k2]; if((ay<=y&&by>=y)||(by<=y&&ay>=y)){ const x=ay===by?Math.min(state.PX[k],state.PX[k2]):state.PX[k]+(y-ay)*(state.PX[k2]-state.PX[k])/(by-ay); const x2=ay===by?Math.max(state.PX[k],state.PX[k2]):x; if(x<xa)xa=x; if(x2>xb)xb=x2; } }
    const s=Math.max(0,Math.round(xa)), e=Math.min(appearanceState.W-1,Math.round(xb));
    for(let x=s;x<=e;x++){ const c=fn(x/K,y/K); if(c) rendererState.fb[y*appearanceState.W+x]=c; }   // callbacks get 1× picture coordinates
  }
}

export function quad(i0,j0,z0,i1,j1,z1,i2,j2,z2,i3,j3,z3,fn){
  state.PX[0]=isoX(i0,j0);state.PY[0]=isoY(i0,j0,z0);state.PX[1]=isoX(i1,j1);state.PY[1]=isoY(i1,j1,z1);state.PX[2]=isoX(i2,j2);state.PY[2]=isoY(i2,j2,z2);state.PX[3]=isoX(i3,j3);state.PY[3]=isoY(i3,j3,z3);
  // Orthographic top and edge-on faces have no area and no inverse surface coordinates.
  if(state.propCamera&&((state.PX[1]-state.PX[0])*(state.PY[3]-state.PY[0])-(state.PY[1]-state.PY[0])*(state.PX[3]-state.PX[0]))===0) return;
  fillPoly(4,fn);
}

export function isoLine(i0,j0,z0,i1,j1,z1,c1,c2){
  const x0=Math.round(isoX(i0,j0)), y0=Math.round(isoY(i0,j0,z0)), x1=Math.round(isoX(i1,j1)), y1=Math.round(isoY(i1,j1,z1)), K=state.propCamera?1:state.ISO_K;
  line(x0,y0,x1,y1,c1,c2||c1);
  if(K>1){ const flat=Math.abs(x1-x0)>=Math.abs(y1-y0); for(let k=1;k<K;k++) line(x0+(flat?0:k),y0+(flat?k:0),x1+(flat?0:k),y1+(flat?k:0),c1,c2||c1); }   // rods keep their thickness in the 2× room
}

/** A one-pixel line even in the 2× room: for the fine details the larger picture allows. */
export function isoLineThin(i0,j0,z0,i1,j1,z1,c1,c2){ line(Math.round(isoX(i0,j0)),Math.round(isoY(i0,j0,z0)),Math.round(isoX(i1,j1)),Math.round(isoY(i1,j1,z1)),c1,c2||c1); }

/** A picture pixel as a K×K block (one native pixel in the 2× room). @param {number} x @param {number} y @param {number} c */
export function psetK(x,y,c){ const K=state.propCamera?1:state.ISO_K; for(let dy=0;dy<K;dy++) for(let dx=0;dx<K;dx++) pset(x+dx,y+dy,c); }

export // box with the three faces the camera sees (top, +j "front-left", +i "front-right") + dark edges
function isoBox(i0,j0,i1,j1,z0,z1,cT,cF,cS,fnF,fnS){
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,fnF||(()=>cF));
  quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,fnS||(()=>cS));
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,()=>cT);
  isoLine(i0,j0,z1,i1,j0,z1,appearanceState.C_OUT); isoLine(i0,j0,z1,i0,j1,z1,appearanceState.C_OUT); isoLine(i0,j1,z1,i1,j1,z1,appearanceState.C_OUT); isoLine(i1,j0,z1,i1,j1,z1,appearanceState.C_OUT);
  isoLine(i0,j1,z0,i1,j1,z0,appearanceState.C_OUT); isoLine(i1,j0,z0,i1,j1,z0,appearanceState.C_OUT);
  isoLine(i0,j1,z0,i0,j1,z1,appearanceState.C_OUT); isoLine(i1,j1,z0,i1,j1,z1,appearanceState.C_OUT); isoLine(i1,j0,z0,i1,j0,z1,appearanceState.C_OUT);
}

export // gymItems = the items of the room we are in
function mkItem(o){ const f=state.GYM_TYPES[o.t]&&state.GYM_TYPES[o.t].fixed; return {t:o.t,i:f?o.i:o.i|0,j:f?o.j:o.j|0,r:o.r?1:0,w:o.w,h:o.h,v:o.v|0,spr:null,bx0:0,by0:0,bx1:-1,by1:-1,held:false,isNew:false}; }

export function itemW(it){ if(it.w!==undefined) return it.r?it.h:it.w; const T=state.GYM_TYPES[it.t]; return it.r?T.h:T.w; }

export // fixed items carry their own (fractional) size
function itemH(it){ if(it.h!==undefined) return it.r?it.w:it.h; const T=state.GYM_TYPES[it.t]; return it.r?T.w:T.h; }

/** Draw one room item into the current buffer: the Ward and the yard (rooms.js), the bath (bath.js). @param {any} it */
function drawItem(it){ if(!drawCellItem(it)) drawBathItem(it); }

function sprBake(it,key){
  if(!it[key]||it[key].length!==appearanceState.W*appearanceState.H) it[key]=new Uint32Array(appearanceState.W*appearanceState.H); else it[key].fill(0);
  const save0=rendererState.fb; rendererState.fb=it[key]; drawItem(it); rendererState.fb=save0;
  let x0=appearanceState.W,y0=appearanceState.H,x1=-1,y1=-1; const s=it[key];
  for(let y=0;y<appearanceState.H;y++){ const r=y*appearanceState.W; for(let x=0;x<appearanceState.W;x++) if(s[r+x]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } }
  return [x0,y0,x1,y1];
} function renderItemSprite(it){
  [it.bx0,it.by0,it.bx1,it.by1]=sprBake(it,'spr');
  if(it.t==='bunk'||it.t==='bunk2'||it.t==='cwheel'||it.t==='lshower'||it.t==='lpod'){ state.bunkFront=true; it.bb2=sprBake(it,'spr2'); state.bunkFront=false; }   // front rails + ladder, drawn again over a sleeper
} function blitSprite(it,tint,layer){
  const s=it.spr; if(!s) return;
  if(layer!==2) for(let y=it.by0;y<=it.by1;y++){ const r=y*appearanceState.W; for(let x=it.bx0;x<=it.bx1;x++){ const c=s[r+x]; if(c) rendererState.FB_MAIN[r+x]=tint?(((x+y)&1)?c:tint):c; } }
  const s2=it.spr2, b=it.bb2; if(!s2||!b||layer===1) return;
  for(let y=b[1];y<=b[3];y++){ const r=y*appearanceState.W; for(let x=b[0];x<=b[2];x++){ const c=s2[r+x]; if(c) rendererState.FB_MAIN[r+x]=tint?(((x+y)&1)?c:tint):c; } }
}

export // plane j=c (runs along i) / plane i=c (runs along j): a = position along the wall (tiles), z = height
function wallJ(c,a0,a1,Hh,fn){ quad(a0,c,0,a1,c,0,a1,c,Hh,a0,c,Hh,(x,y)=>{ const a=(x-state.HUB_OX)/6+c, z=state.HUB_OY+(a+c)*3-y; return fn(a,z,x,y); }); } function wallI(c,a0,a1,Hh,fn){ quad(c,a0,0,c,a1,0,c,a1,Hh,c,a0,Hh,(x,y)=>{ const a=c-(x-state.HUB_OX)/6, z=state.HUB_OY+(c+a)*3-y; return fn(a,z,x,y); }); }

export function shadeC(c,k){ return (0xff000000|(Math.min(255,((c>>16)&255)*k)<<16)|(Math.min(255,((c>>8)&255)*k)<<8)|Math.min(255,(c&255)*k))>>>0; } function buildHub(){                       // room shell (walls, floor) + everything flat, baked into bgHub
  if(hdRoom()&&!rendererState.inHD){ withHD(buildHub,roomFrame()); return; }   // the rooms bake into the 2× background
  if(state.hubRoom==='yard') buildYard(); else if(state.hubRoom==='laznia') buildBath(); else buildCell();   // the Ward
}


export function hubRebake(){ roomsState.homeWx=weatherNow(); const bake=()=>{ buildHub(); for(const it of state.gymItems) if(!state.GYM_TYPES[it.t].flat) renderItemSprite(it); }; if(hdRoom()) withHD(bake,roomFrame()); else bake(); }   /* the cell bakes at 2× */


export /* ---------- geometry helpers (footprint rectangles in tile space) ---------- */
function itemRect(it){ return [it.i,it.j,it.i+itemW(it),it.j+itemH(it)]; } function rectDist(it,pi,pj){ const r=itemRect(it); const dx=Math.max(r[0]-pi,0,pi-r[2]), dy=Math.max(r[1]-pj,0,pj-r[3]); return Math.hypot(dx,dy); }

/** Floor size [width, depth] of the current hub room in room units. */
export function hubBounds(){ return state.hubRoom==='yard'?[npcsState.YARD_W,npcsState.YARD_H]:state.hubRoom==='laznia'?[BATH_W,BATH_H]:[roomsState.CELL_W,roomsState.CELL_H]; }
export function hubBlocked(i,j){
  { const [w,h]=hubBounds(); if(i<0.45||j<0.45||i>w-0.4||j>h-0.4) return true; }
  for(const it of state.gymItems){
    if(it.held) continue; const T=state.GYM_TYPES[it.t];
    if(T.block==='circle'){ if(Math.hypot(i-(it.i+0.5),j-(it.j+0.5))<0.55) return true; }
    else if(T.block){ const r=itemRect(it); if(i>r[0]-0.25&&i<r[2]+0.25&&j>r[1]-0.25&&j<r[3]+0.25) return true; }
  }
  return false;
}

export function stationOf(it){
  const T=state.GYM_TYPES[it.t], inf=state.ST_INFO[T.st], r=itemRect(it);
  let li=(r[0]+r[2])/2, lj=(r[1]+r[3])/2;
  if(it.t==='cfloor'){ li=it.i+1.3; lj=it.j+1.4; }
  if(it.t==='cpull'){ li=0.9; lj=3.2; }
  if(it.t==='croach'){ li=it.i+0.5; lj=0.1; }
  if(it.t==='cdoor'||it.t==='ydoor'){ li=0.05; lj=it.j+0.75; }
  // where the boxer stands when he comes back: the first free spot in front of the item
  let si=li, sj=lj;
  if(!T.flat){
    const cand=[[r[2]+0.6,(r[1]+r[3])/2],[(r[0]+r[2])/2,r[3]+0.6],[r[2]+0.55,r[3]+0.55],[r[0]-0.6,(r[1]+r[3])/2],[(r[0]+r[2])/2,r[1]-0.6]];
    for(const c of cand) if(!hubBlocked(c[0],c[1])){ si=c[0]; sj=c[1]; break; }
  }
  if(it.t==='cfloor'){ si=it.i+1.5; sj=it.j+1.5; }   // back on the middle of the free floor
  if(it.t==='cpull'){ si=it.i+itemW(it)+0.2; sj=it.j+0.2; }
  if(it.t==='croach'){ si=it.i+0.45; sj=it.j+0.5; }
  if(it.t==='cdoor'||it.t==='ydoor'){ si=1.0; sj=it.j+0.75; }
  return {id:T.st,name:inf[0],title:inf[1],look:[li,lj,T.z],spot:[si,sj],item:it};
}


/** Options of a station; in prison they are gated by the daily schedule. @param {any} st */
export function stationOptions(st){ const o=stationOptions1(st), d=devDoorOptions(st); return d.length?[...(o||[]),...d]:o; }   /* developer mode adds travel to the doors */
function stationOptions1(st){ const c=bathOptions(st); if(c) return c; const o=stationOptions0(st);
  const meal=st.id==='cdoor'?mealDoorOptions():st.id==='bunk'?mealBedOptions(st):st.id==='cellfight'?mealMateOptions(st.cn):[];   /* the meal in the Ward: the flap, the guard-bed, the cellmates */
  return [...meal,...gateOptions(st,o)]; }
function stationOptions0(st){
  switch(st.id){
    case 'cellfight': case 'yardfight': { const yard=st.id==='yardfight', idx=yard?st.yn:st.cn, O=(yard?sparringState.YARD_OPP:sparringState.CELL_OPP)[idx];
      const go=()=>{ const C=(yard?npcsState.YN:npcsState.CN)[idx]; prisonFightStart(yard?'yard':'cell',idx); startSpar(idx,yard?'yard':'cell',{...st,look:[C.i,C.j,15],spot:[state.hubP.i,state.hubP.j]}); };
      const extra=prisonFightExtras(yard,idx,go,()=>{ const C=(yard?npcsState.YN:npcsState.CN)[idx]; return {...st,look:[C.i,C.j,15],spot:[state.hubP.i,state.hubP.j]}; });
      return [['Walka na gołe pięści: '+O.title+' '+'★'.repeat(oppStars(O))+' · do KO'+listTag(yard?'yard':'cell',idx),go],...extra]; }
  }
  return cellOptions(st);
}


export function hubUnstuck(){   // after a layout change the boxer may stand inside something: step him out
  if(!hubBlocked(state.hubP.i,state.hubP.j)) return;
  for(let rad=0.5;rad<8;rad+=0.5) for(let a=0;a<6.28;a+=0.4){ const i=state.hubP.i+Math.cos(a)*rad, j=state.hubP.j+Math.sin(a)*rad; if(!hubBlocked(i,j)){ state.hubP.i=i; state.hubP.j=j; return; } }
}

/** Cancel a running room transition (the zoom of a door or a station), for a scene that takes the room over. */
export function hubTransReset(){ state.hubTrans.kind=0; state.hubFade=0; }

export function hubTick(){
  state.hubFade=0;
  if(state.hubTrans.kind){
    state.hubTrans.t++; const x=state.hubTrans.t/state.hubTrans.dur;
    if(state.hubTrans.kind===1){ state.hubFade=x>0.62?(x-0.62)/0.38:0; if(state.hubTrans.t>=state.hubTrans.dur){ const f=state.hubTrans.fn; state.hubTrans.kind=0; state.hubFade=0; state.fadeInT=14; f(); setPanelMode(); return; } }
    else { state.hubFade=x<0.3?1-x/0.3:0; if(state.hubTrans.t>=state.hubTrans.dur){ state.hubTrans.kind=0; } }
  }
  if(roomsState.hubAct) actTick();
  if(state.hubRoom==='cell') cnTick(); else if(state.hubRoom==='yard') ynTick(); else if(state.hubRoom==='laznia') bathTick();
  const menuOpen=!navigationState.stMenuEl.hidden||boxingState.gstate==='menu';
  let dx=state.hubKeys.r-state.hubKeys.l, dy=state.hubKeys.d-state.hubKeys.u;
  if(menuOpen||state.hubTrans.kind||roomsState.hubAct) { dx=0; dy=0; }
  state.hubP.moving=false;
  if(dx||dy){
    let di=dx+dy, dj=dy-dx; const l=Math.hypot(di,dj); di/=l; dj/=l;
    const sp=0.052*(0.9+0.1*boxingState.STATS.speed);
    const ni=state.hubP.i+di*sp, nj=state.hubP.j+dj*sp;
    const trB=(a,b)=>(state.hubRoom==='cell'&&cnBlocks(a,b))||(state.hubRoom==='yard'&&ynBlocks(a,b));   // the inmates are solid
    if(!hubBlocked(ni,state.hubP.j)&&!trB(ni,state.hubP.j)) state.hubP.i=ni; if(!hubBlocked(state.hubP.i,nj)&&!trB(state.hubP.i,nj)) state.hubP.j=nj;
    state.hubP.fi=di; state.hubP.fj=dj; state.hubP.moving=true; state.hubP.ph+=0.28;
    if(((state.hubP.ph/Math.PI)|0)!==(((state.hubP.ph-0.28)/Math.PI)|0)) tone('sine',90,70,0.03,0.05);
  }
  // nearest item in reach -> station
  let best=null, bd=0.95;
  if(!roomsState.hubAct) for(const it of state.gymItems){ if(!state.GYM_TYPES[it.t].st) continue; const d=rectDist(it,state.hubP.i,state.hubP.j); if(d<bd){ bd=d; best=it; } }
  let cnB=null; if(state.hubRoom==='cell'&&!roomsState.hubAct) for(let k=0;k<npcsState.CN.length;k++){ const C=npcsState.CN[k]; if(!C.step||C.away||C.act==='lie') continue; const d=Math.hypot(C.i-state.hubP.i,C.j-state.hubP.j)-0.35; if(d<bd){ bd=d; cnB=k; } }
  let mnB=null; if(state.hubRoom==='laznia'&&!roomsState.hubAct) for(let k=0;k<npcsState.YN.length;k++){ const C=npcsState.YN[k]; const d=Math.hypot(C.i-state.hubP.i,C.j-state.hubP.j)-0.55; if(d<bd){ bd=d; mnB=k; } }
  let ynB=null; if(state.hubRoom==='yard'&&!cnNight()&&!roomsState.hubAct) for(let k=0;k<npcsState.YN.length;k++){ const C=npcsState.YN[k]; const d=Math.hypot(C.i-state.hubP.i,C.j-state.hubP.j)-0.35; if(d<bd){ bd=d; ynB=k; } }
  /* the healers: Śmierdziel by the Ward's tub, a turnkey on the yard (healers.js) */
  let heal=null; if(!roomsState.hubAct){
    const cand=state.hubRoom==='cell'?[[npcsState.STINK,'smierdziel']]:[];
    for(const [C,id] of cand){ if(!C||C.away) continue; const d=Math.hypot(C.i-state.hubP.i,C.j-state.hubP.j)-0.35; if(d<bd){ bd=d; heal={C,id}; cnB=null; ynB=null; } } }
  if(heal){ const C=heal.C; if(!state.hubNear||state.hubNear.id!==heal.id){ state.hubNear={id:heal.id,npc:true,name:'ŚMIERDZIEL',title:'Śmierdziel — maść i droga do felczera',look:[C.i,C.j,10],spot:[state.hubP.i,state.hubP.j],item:null}; setInfo(); } state.hubNear.look[0]=C.i; state.hubNear.look[1]=C.j; }
  else if(cnB!==null){ const C=npcsState.CN[cnB]; if(!state.hubNear||state.hubNear.cn!==cnB){ state.hubNear={id:'cellfight',cn:cnB,name:C.name.toUpperCase(),title:C.name+' — współwięzień',look:[C.i,C.j,15],spot:[state.hubP.i,state.hubP.j],item:null}; setInfo(); } state.hubNear.look[0]=C.i; state.hubNear.look[1]=C.j; }
  else if(mnB!==null){ const C=npcsState.YN[mnB], name=sparringState.YARD_OPP[mnB].title; if(!state.hubNear||state.hubNear.yn!==mnB){ state.hubNear={id:'bathfight',yn:mnB,name:name.toUpperCase(),title:name+' — w łaźni',look:[C.i,C.j,13],spot:[state.hubP.i,state.hubP.j],item:null}; setInfo(); } }
  else if(ynB!==null){ const C=npcsState.YN[ynB], name=sparringState.YARD_OPP[ynB].title; if(!state.hubNear||state.hubNear.yn!==ynB){ state.hubNear={id:'yardfight',yn:ynB,name:name.toUpperCase(),title:name+' — współwięzień',look:[C.i,C.j,15],spot:[state.hubP.i,state.hubP.j],item:null}; setInfo(); } state.hubNear.look[0]=C.i; state.hubNear.look[1]=C.j; }
  else if((best&&best)!==(state.hubNear&&state.hubNear.item)||(state.hubNear&&(state.hubNear.cn!==undefined||state.hubNear.yn!==undefined||state.hubNear.npc))){ state.hubNear=best?stationOf(best):null; setInfo(); }
  if(best?.t==='cwheel'&&state.hubNear?.item===best) state.hubNear=stationOf(best);
  if(!state.hubTrans.kind&&(skyBucket()!==roomsState.homeSkyB||weatherNow()!==roomsState.homeWx)) hubRebake();   // the light follows the clock and the weather
  updatePopups();
}

export // ipC = the character being drawn (hubP or the trainer)
function bodyPt(fwd,side,z){ if(state.ipPose===1){ const f=z-9; z=state.ipBase+fwd*0.45+2; fwd=f; } else if(state.ipPose===2) z+=state.ipBase;   // lying: height becomes length, chest up
  const C=state.ipC||state.hubP, S=1/7.5, i=C.i+(fwd*C.fi-side*C.fj)*S, j=C.j+(fwd*C.fj+side*C.fi)*S; state.bpX=isoX(i,j); state.bpY=isoY(i,j,z+(C.z0||0)); state.bpD=i+j; }

/** The light on a figure standing at C: the strongest source of the room [i, j, height, strength 0..1] (the Ward's barred window by day or
 * the tallow lamp, the bath's nearest gas jet, the yard's overcast sky) and the screen direction towards it. @param {any} C */
function figureLight(C){
  const r=state.hubRoom, wx=weatherNow(); let L=[C.i,C.j,20,0];
  if(r==='cell'){
    const lt=cellLights(progressionState.save.sim.min), day=lt.day*(wx==='sun'?0.55:wx==='cloud'?0.42:0.32), wi=(WARD_WIN.u0+WARD_WIN.u1)/12, wz=(WARD_WIN.z0+WARD_WIN.z1)/2;
    if(lt.bulb) L=day>0.25&&Math.hypot(C.i-wi,C.j)<Math.hypot(C.i-LAMP.i,C.j-LAMP.j)*1.1?[wi,0,wz,day]:[LAMP.i,LAMP.j,LAMP.z,0.62];
    else L=day>0.05?[wi,0,wz,day]:[wi,0.4,WARD_WIN.z0+2,0.28];
  } else if(r==='laznia'){
    let best=BATH_LAMPS[0], bd=1e9; for(const l of BATH_LAMPS){ const d=Math.hypot(C.i-l[0],C.j-l[1]); if(d<bd){ bd=d; best=l; } }
    L=[best[0],best[1],best[2],0.52/Math.max(1,bd*0.32)];
  } else if(r==='yard'){
    const b=skyBucket(); L=[C.i-2.2,C.j-3.2,28,b===0?0.2:(wx==='sun'?0.52:wx==='cloud'?0.32:0.24)];
  }
  const sx=isoX(L[0],L[1])-isoX(C.i,C.j), sy=isoY(L[0],L[1],L[2])-isoY(C.i,C.j,10), sl=Math.hypot(sx,sy)||1;
  return L[3]>0.05?{str:L[3],lx:sx/sl,ly:sy/sl,face:((L[0]-C.i)*C.fi+(L[1]-C.j)*C.fj)/(Math.hypot(L[0]-C.i,L[1]-C.j)||1)}:null;
}

/** A figure drawn into its own buffer, so the light pass touches the figure only and never the room behind it. */
let litBuf=/** @type {Uint32Array|null} */ (null);
/** Start a lit figure: aim the shading and switch to the clean buffer. @param {{str:number,lx:number,ly:number,face:number}} lit */
function litBegin(lit){
  const N=appearanceState.W*appearanceState.H; if(litBuf?.length!==N) litBuf=new Uint32Array(N);
  return {real:setFramebuffer(litBuf),prev:setLightVec(lit.lx,lit.ly)};
}
/** Rim light on the edge facing the source, the lit half brighter, the far half darker; then the figure goes onto the room.
 * @param {{str:number,lx:number,ly:number,face:number}} lit @param {{real:Uint32Array,prev:[number,number]}} st @param {number} cx @param {number} cy */
function litEnd(lit,st,cx,cy){
  const W=appearanceState.W, H=appearanceState.H, buf=/** @type {Uint32Array} */ (litBuf), real=st.real, K=state.ISO_K;
  let x0=W, y0=H, x1=0, y1=0;
  for(let k=0;k<state.ipN;k++){ const r=Math.max(state.ipR0[k],state.ipR1[k])+3*K;
    x0=Math.min(x0,state.ipX0[k]-r,state.ipX1[k]-r); x1=Math.max(x1,state.ipX0[k]+r,state.ipX1[k]+r); y0=Math.min(y0,state.ipY0[k]-r,state.ipY1[k]-r); y1=Math.max(y1,state.ipY0[k]+r,state.ipY1[k]+r); }
  x0=Math.max(1,Math.floor(x0)); y0=Math.max(1,Math.floor(y0)); x1=Math.min(W-2,Math.ceil(x1)); y1=Math.min(H-2,Math.ceil(y1));
  const {str,lx,ly}=lit, C_OUT=appearanceState.C_OUT, C_SH=appearanceState.C_SHADOW, dirX=lx>=0?1:-1, dirY=ly>=0?1:-1, span=Math.max(6*K,(x1-x0)*0.45), face=lit.face*0.12*str;
  for(let y=y0;y<=y1;y++){ const row=y*W;
    for(let x=x0;x<=x1;x++){
      const c=buf[row+x]; if(!c) continue;
      if(c!==C_OUT&&c!==C_SH){
        const u=((x-cx)*lx+(y-cy)*ly*0.55)/span, nx=buf[row+x+dirX], ny=buf[(y+dirY)*W+x];
        const edge=(nx===0||nx===C_OUT)||(Math.abs(ly)>0.55&&(ny===0||ny===C_OUT));
        if(u>0.06&&edge) buf[row+x]=shadeC(c,1+str*0.52+Math.max(0,face));
        else if(u>0.16) buf[row+x]=shadeC(c,1+(u-0.16)*str*0.32+face);
        else if(u<-0.06) buf[row+x]=shadeC(c,Math.max(0.5,1+(u+0.06)*str*0.72+face));
      }
      real[row+x]=buf[row+x]; buf[row+x]=0;
    }
  }
  setFramebuffer(real); setLightVec(st.prev[0],st.prev[1]);
}

/**
 * A person in the 2× room, modelled for the larger picture: realistic proportions (a smaller head with a jaw, ears and hair,
 * a neck, square shoulders, a pelvis, hands and shoes), a face (eyes, brows, nose, mouth, stubble or a beard) and the drelich
 * (collar, button placket, waist seam, breast pocket). J(s) gives the limb joints {hip,knee,foot,sh,el,hd} of side s;
 * J.pel, J.chest and J.head are the body joints; J.abd (optional) is the waist/abdominal hinge.
 * All are in body coordinates [forward, side, height] like ipAdd.
 * @param {any} C @param {any} J
 * In the bath L.bare strips the drelich (top and trousers take the skin), L.waist wraps a towel round the hips
 * and L.censor puts a pixel mosaic over the groin.
 * @param {{sk:number[],top:number[],pt:number[],shoe:number,hair:number,style?:string,beard?:boolean,stubble?:boolean,mustache?:boolean,bare?:boolean,waist?:number,censor?:boolean,belt?:boolean,baton?:boolean,cap?:number,chops?:boolean,scarf?:number,irons?:boolean,rolledSleeves?:boolean,tuckedShirt?:boolean}} L
 * Newgate: style 'flatcap' (L.cap ramp), L.chops mutton-chop whiskers, L.scarf a neckerchief colour, L.irons leg irons.
 * @param {{pose?:number,base?:number,noShadow?:boolean,light?:boolean,tilt?:boolean,look?:number[],only?:string,side?:number}} [o]   look: [yaw, pitch] of the head against the body (pitch > 0 looks down); only:'hands' redraws just the forearms and hands (side: one of them) over a prop drawn after the figure; light: shade him by the room's light (the brawl); tilt: head and chest fixtures follow a ragdoll's neck and spine
 */
export function figureHD(C,J,L,o={}){
  state.ipC=C; state.ipN=0; state.ipPose=o.pose||0; state.ipBase=o.base||0;
  const heavy=L.bodyType==='heavy', bulk=heavy?{shoulders:1.26,arms:1.5,forearms:1.6,chest:1.3,belly:1.6,thighs:1.5,calves:1.4,neck:1.6,head:1.17,...(L.bulk||{})}:null;
  const inhale=heavy?Math.sin((C.bullClock??(C.t||0)/60)*7)*((C.bull?.mode==='EXHAUSTED')?0.32:0.12):0;
  const lit=o.light?figureLight(C):null, nearS=((C.fi||0)-(C.fj||0))>=0?1:-1, mix=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
  for(let s=-1;s<=1;s+=2){
    const k=s===nearS?0:1, A=J(s), SK=L.sk[k], PT=L.pt[k], TP=L.top[k], wr=mix(A.el,A.hd,0.8), toe=[A.foot[0]+0.85,A.foot[1],A.foot[2]-0.25];
    if(o.only==='hands'){ if(!o.side||o.side===s){ ipAdd(...A.el,0.88, ...wr,0.76, L.rolledSleeves?SK:TP); ipAdd(...wr,0.62, ...A.hd,0.7, SK); } continue; }   // forearm and hand only (of one side), over a prop
    if(L.waist) ipAdd(...A.hip,1.3, ...A.knee,1.08, PT,L.waist,0.5,0.5,L.waist); else ipAdd(...A.hip,1.3*(bulk?.thighs||1), ...A.knee,1.08*(bulk?.thighs||1), PT);   /* thigh (the towel over its top half) */
    ipAdd(...A.knee,1.02*(bulk?.calves||1), ...A.foot,0.84*(bulk?.calves||1), PT);                                                                   // shin
    ipAdd(A.foot[0]-0.2,A.foot[1],A.foot[2]-0.15,0.92, ...toe,0.74, L.shoe);                                   // prison shoe
    ipAdd(...A.sh,1.1*(bulk?.arms||1), ...A.el,0.9*(bulk?.arms||1), TP); ipAdd(...A.el,0.88*(bulk?.forearms||1), ...wr,0.76*(bulk?.forearms||1), L.rolledSleeves?SK:TP);
    ipAdd(...wr,0.62, ...A.hd,0.7, SK);                                                                          // hand
    ipAdd(A.hip[0],A.hip[1],A.hip[2]+0.3,1.35*(bulk?.thighs||1), A.hip[0],A.hip[1]*0.4,A.hip[2]+0.4,1.4*(bulk?.thighs||1), L.waist||PT);            // seat of the trousers
  }
  if(o.only==='hands'){ for(let k=0;k<state.ipN;k++) state.ipOrd[k]=k;
    for(let a=1;a<state.ipN;a++){ const v=state.ipOrd[a]; let b=a-1; while(b>=0&&state.ipD[state.ipOrd[b]]>state.ipD[v]){ state.ipOrd[b+1]=state.ipOrd[b]; b--; } state.ipOrd[b+1]=v; }
    for(let p=0;p<2;p++) for(let a=0;a<state.ipN;a++){ const k=state.ipOrd[a]; taper(Math.round(state.ipX0[k]),Math.round(state.ipY0[k]),state.ipR0[k],Math.round(state.ipX1[k]),Math.round(state.ipY1[k]),state.ipR1[k],p,state.ipRp[k],state.ipRp2[k],state.ipZ1[k],state.ipZ2[k],state.ipRp3[k]); }
    state.ipPose=0; state.ipBase=0; state.ipC=state.hubP; return; }
  const P=J.pel, Q=J.chest, SL=J(-1).sh, SR=J(1).sh, T0=L.top[0], S0=L.sk[0];
  // The head and chest fixtures (face, collar, pocket...) sit in a frame that follows the neck and the spine, so a ragdoll that lies or
  // tumbles carries its face with it; standing figures use the plain body axes and draw exactly as before.
  const frame=(/** @type {number[]} */ from,/** @type {number[]} */ to)=>{ let ux=to[0]-from[0], uy=to[1]-from[1], uz=to[2]-from[2]; const ul=Math.hypot(ux,uy,uz)||1; ux/=ul; uy/=ul; uz/=ul;
    let sx=-uy*ux, sy=1-uy*uy, sz=-uy*uz, sl=Math.hypot(sx,sy,sz); if(sl<0.2){ sx=1-ux*ux; sy=-ux*uy; sz=-ux*uz; sl=Math.hypot(sx,sy,sz)||1; } sx/=sl; sy/=sl; sz/=sl;
    return [sy*uz-sz*uy,sz*ux-sx*uz,sx*uy-sy*ux,sx,sy,sz,ux,uy,uz]; };   // forward = side × up, side = body side made square to the axis
  const at=(/** @type {number[]} */ o,/** @type {number[]|null} */ fr)=>(/** @type {number} */ a,/** @type {number} */ b,/** @type {number} */ c)=>fr?[o[0]+a*fr[0]+b*fr[3]+c*fr[6],o[1]+a*fr[1]+b*fr[4]+c*fr[7],o[2]+a*fr[2]+b*fr[5]+c*fr[8]]:[o[0]+a,o[1]+b,o[2]+c];
  // look: the head turned (yaw) and bowed (pitch) on the neck while the body keeps its facing, as a frame [forward, side, up].
  const look=o.look?(()=>{ const [y,p]=o.look, cy=Math.cos(y), sy=Math.sin(y), cp=Math.cos(p), sp=Math.sin(p); return [cy*cp,sy*cp,-sp,-sy,cy,0,cy*sp,sy*sp,cp]; })():null;
  const hp=at([J.head[0]+0.1,J.head[1],J.head[2]-0.6],look||(o.tilt?frame(Q,J.head):null)), tp=at(Q,o.tilt?frame(J.abd||P,Q):null), pp=at(P,o.tilt?frame(P,J.abd||Q):null), H=hp(0,0,0);
  const B=J.abd||J.belly;   // a mid-spine joint (the abdomen of a body-shot reaction, or a ragdoll's belly): the torso is then two segments that can fold at the waist
  if(L.waist){ if(B){ ipAdd(P[0],P[1],P[2]+0.5,1.85, ...B,2.0, T0,L.waist,0.24,0.24,L.waist); ipAdd(...B,2.0, Q[0],Q[1],Q[2]-0.3,2.2, T0,L.waist,0.24,0.24,L.waist); }
    else ipAdd(P[0],P[1],P[2]+0.5,1.85, Q[0],Q[1],Q[2]-0.3,2.2, T0,L.waist,0.24,0.24,L.waist); }              /* bare torso, the towel tucked in at the waist */
  else if(B){ ipAdd(P[0],P[1],P[2]+(L.tuckedShirt?1.5:0.5),(L.tuckedShirt?1.55:1.85)*(bulk?.chest||1), ...B,2.0*(bulk?.chest||1), T0); ipAdd(...B,2.0*(bulk?.chest||1), Q[0],Q[1],Q[2]-0.3,2.2*(bulk?.chest||1), T0); }
  else ipAdd(P[0],P[1],P[2]+(L.tuckedShirt?1.5:0.5),(L.tuckedShirt?1.55:1.85)*(bulk?.chest||1), Q[0],Q[1],Q[2]-0.3,2.2*(bulk?.chest||1), T0);
  if(heavy){
    // A real forward-projecting belly, attached to the spine. Soft delay is visual only: IK bone lengths remain unchanged.
    const lag=Math.max(-0.28,Math.min(0.28,(C.lagF||0)*0.19)), r=2.35*bulk.belly;
    ipAdd(...pp(1.5+lag,0,1.35),r*0.87+inhale, ...pp(2.15+lag,0,-1.05),r+inhale,T0);
  }
  ipAdd(SL[0],SL[1]*0.82,SL[2]-0.15,1.15*(bulk?.shoulders||1), SR[0],SR[1]*0.82,SR[2]-0.15,1.15*(bulk?.shoulders||1), T0);                               // shoulders
  const HS=L.style==='hood'?(L.cap??L.hair):S0;   /* under a hood the head is all canvas */
  ipAdd(Q[0],Q[1],Q[2]+0.3,0.72*(bulk?.neck||1), ...hp(-0.15,0,-1.3),0.68*(bulk?.neck||1), HS);                                            // neck
  const cropped=L.style==='fringe'||L.style==='crop';   /* the hero: hair over the whole skull, the face in front of it */
  ipAdd(...H,1.75*(bulk?.head||1), ...H,1.75*(bulk?.head||1), cropped?L.hair:HS);                                                       // skull beneath the hair
  if(cropped) ipAdd(...hp(0.9,0,-0.2),1.15, ...hp(1.0,0,-0.65),1.0, S0);                     // face in front of the hair
  ipAdd(...hp(0.45,0,-0.7),1.2, ...hp(0.85,0,-1.15),0.95, HS);                                       // jaw and chin
  if(L.style!=='hood') for(let s=-1;s<=1;s+=2) ipAdd(...hp(-0.15,s*1.68,-0.15),0.42, ...hp(-0.1,s*1.68,-0.25),0.4, L.sk[s===nearS?0:1]);   // ears
  const st=L.style||'short';
  if(st==='long'){ ipAdd(...hp(-0.35,0,0.6),1.8, ...hp(-0.35,0,0.6),1.8, L.hair); ipAdd(...hp(-0.85,0,-0.3),1.45, ...hp(-1.0,0,-1.9),1.2, L.hair); }   // long, down the neck
  else if(st==='skinhead') { /* completely bald: no hair cap or horseshoe */ }
  else if(st==='bald') ipAdd(...hp(-0.95,-1.25,0.15),0.85, ...hp(-0.95,1.25,0.15),0.85, L.hair);   // a horseshoe of hair round the back
  else if(st==='cap'){ ipAdd(...hp(-0.25,0,1.25),1.55, ...hp(-0.25,0,1.45),1.5, L.cap??L.hair); ipAdd(...hp(1.2,-0.8,1.2),0.3, ...hp(1.35,0.8,1.2),0.3, L.shoe); }   /* peaked uniform cap */
  else if(st==='hood'){ const cr=L.cap??L.hair; ipAdd(...H,1.98, ...H,1.98, cr); ipAdd(...hp(0.45,0,-0.8),1.5, ...hp(0.65,0,-1.45),1.3, cr);   /* a canvas hood over head and face, */
    ipAdd(...hp(-0.15,0,-1.2),1.65, ...tp(-0.1,0,0.2),2.25, cr); }                                                       /* its skirt over the shoulders */
  else if(st==='flatcap'){ const cr=L.cap??L.hair; ipAdd(...hp(-0.25,0,0.75),1.86, ...hp(0.35,0,0.95),1.8, cr); ipAdd(...hp(1.15,-0.95,0.85),0.42, ...hp(1.35,0.95,0.85),0.42, cr); }   /* a cloth cap pulled low, a short peak */
  else if(st==='toque') ipAdd(...hp(-0.25,0,0.9),1.55, ...hp(-0.4,0,2.5),1.7, L.hair);                              /* cook's tall white cap */
  else if(st==='bun'){ ipAdd(...hp(0.15,0,0.75),2.12, ...hp(-0.5,0,1.15),2.05, L.hair);   /* full hair parted in the middle, */
    for(let s=-1;s<=1;s+=2) ipAdd(...hp(-0.25,s*1.5,0.35),0.9, ...hp(-0.75,s*1.5,-0.45),0.85, L.hair);   /* swept back over the ears */
    ipAdd(...hp(-1.85,0,1.25),1.5, ...hp(-2.15,0,0.6),1.35, L.hair); }   /* and pinned up in a bun at the back */
  else if(st==='shaved')ipAdd(...hp(-0.25,0,0.35),1.76, ...hp(-0.25,0,0.35),1.76, L.hair);   // a hair cap a little larger than the skull:
  else { ipAdd(...hp(-0.3,0,0.6),1.8, ...hp(-0.3,0,0.6),1.8, L.hair);                       // it shows on top and at the back, the face covers its front
    if(st==='fringe') ipAdd(...hp(0.85,-0.95,1.15),0.52, ...hp(1.0,0.85,1.0),0.5, L.hair); }   // straight fringe
  if(L.heavyMustache) ipAdd(...hp(1.7,-0.75,-0.68),0.56, ...hp(1.7,0.75,-0.68),0.56,L.hair);
  if(L.beard) ipAdd(...hp(0.75,0,-0.75),1.18, ...hp(0.95,0,-1.6),0.92, L.hair);
  if(L.chops) for(let s=-1;s<=1;s+=2) ipAdd(...hp(0.35,s*1.45,-0.1),0.52, ...hp(0.8,s*1.2,-1.25),0.5, L.hair);   /* mutton chops down to the jaw */
  for(let k=0;k<state.ipN;k++) state.ipOrd[k]=k;
  for(let a=1;a<state.ipN;a++){ const v=state.ipOrd[a]; let b=a-1; while(b>=0&&state.ipD[state.ipOrd[b]]>state.ipD[v]){ state.ipOrd[b+1]=state.ipOrd[b]; b--; } state.ipOrd[b+1]=v; }
  if(!state.ipPose&&!o.noShadow){ bodyPt(0,0,0); shadowEll(Math.round(state.bpX),Math.round(state.bpY),4,1); }
  const lst=lit?litBegin(lit):null;   // everything below goes to the clean buffer until litFinish
  const litFinish=()=>{ if(lit&&lst){ bodyPt(Q[0],Q[1],Q[2]); litEnd(lit,lst,state.bpX,state.bpY); } };
  for(let p=0;p<2;p++) for(let a=0;a<state.ipN;a++){ const k=state.ipOrd[a];
    taper(Math.round(state.ipX0[k]),Math.round(state.ipY0[k]),state.ipR0[k],Math.round(state.ipX1[k]),Math.round(state.ipY1[k]),state.ipR1[k],p,state.ipRp[k],state.ipRp2[k],state.ipZ1[k],state.ipZ2[k],state.ipRp3[k]); }
  // ---- details on the side facing the camera (one 2× pixel each)
  const PAL=appearanceState.PAL, sh=(/** @type {number} */ r,/** @type {number} */ k)=>PAL[r*3+k];
  bodyPt(...H); const hd0=state.bpD;
  const dot=(/** @type {number} */ f,/** @type {number} */ sd,/** @type {number} */ z,/** @type {number} */ c,/** @type {number} */ d0)=>{ bodyPt(f,sd,z); if(state.bpD>d0+0.02) pset(Math.round(state.bpX),Math.round(state.bpY),c); };
  const EYE=rgb('#3a2a20'), LIP=sh(S0,0);
  if(st==='hood'){ for(let s=-1;s<=1;s+=2){ dot(...hp(1.85,s*0.55,0.15),rgb('#0a0908'),hd0); dot(...hp(1.82,s*0.85,0.2),rgb('#0a0908'),hd0); }   /* two slits, nothing else of a face */
    dot(...hp(1.6,0,-0.9),sh(L.cap??L.hair,0),hd0); }
  else {
  const eyeAt=(/** @type {number} */ s)=>{ bodyPt(...hp(1.5,s*0.66,0.2)); return [Math.round(state.bpX),Math.round(state.bpY),state.bpD]; };
  const e0=eyeAt(-1), e1=eyeAt(1), profile=Math.abs(e0[0]-e1[0])<3&&Math.abs(e0[1]-e1[1])<3;   // seen from the side the two eyes land together: keep only the near eye and brow
  for(let s=-1;s<=1;s+=2){ if(profile&&(s<0?e0[2]<e1[2]:e1[2]<=e0[2])) continue; dot(...hp(1.5,s*0.66,0.2),EYE,hd0); dot(...hp(1.5,s*0.66,-0.15),EYE,hd0); }   // eyes, two pixels tall; no brows, they read as a second eye
  dot(...hp(1.82,0.12,-0.3),sh(S0,1),hd0);                                                               // nose: a half-tone, not a hole
  if(L.mustache||L.beard){ dot(...hp(1.6,-0.35,-0.62),sh(L.hair,L.beard?1:0),hd0); dot(...hp(1.6,0.35,-0.62),sh(L.hair,L.beard?1:0),hd0); }
  if(!L.beard) dot(...hp(1.5,-0.1,-1.0),LIP,hd0);                                                       // mouth (a beard hides it)
  if(L.stubble) for(const [f,sd,z] of [[1.2,-0.62,-1.05],[1.3,0.6,-1.1],[1.4,0,-1.4],[1.05,-0.95,-0.7],[1.05,0.95,-0.75]]) dot(...hp(f,sd,z),sh(S0,0),hd0);
  if(heavy&&C.bull?.mode==='EXHAUSTED'){
    for(const s of [-1,1]) dot(...hp(1.05,s*1.10,-0.34),rgb('#ba655c'),hd0);
    dot(...hp(0.95,-0.55,1.1),rgb('#c9dbd5'),hd0);
    dot(...hp(1.35,0.9,0.8),rgb('#d2ddda'),hd0);
  }
  }
  bodyPt(...Q); const cd0=state.bpD, TD=sh(T0,0), TL=sh(T0,2);
  if(L.censor){ bodyPt(...pp(1.0,0,-0.5)); censor(Math.round(state.bpX),Math.round(state.bpY)); }
  if(heavy&&C.bull?.mode==='EXHAUSTED') dot(...tp(2.25,0,-1.2),rgb('#796b65'),cd0);
  if(L.bare){ litFinish(); if(state.ISO_K===3&&state.ipPose===0&&!o.tilt) drawHDCharacterDetails(C,J,L); state.ipPose=0; state.ipBase=0; state.ipC=state.hubP; return; }
  dot(...tp(1.7,-0.55,0.15),TL,cd0); dot(...tp(1.7,0.55,0.15),TL,cd0);                     // collar points
  if(L.scarf!==undefined){ dot(...tp(1.75,0,0.25),L.scarf,cd0); dot(...tp(1.85,0.25,-0.3),L.scarf,cd0); dot(...tp(1.85,-0.2,-0.55),L.scarf,cd0); }   /* a knotted neckerchief */
  bodyPt(...tp(2.0,0,-0.9)); const ax=Math.round(state.bpX), ay=Math.round(state.bpY), ad=state.bpD;
  bodyPt(...pp(1.7,0,0.8)); const bx=Math.round(state.bpX), by=Math.round(state.bpY);
  if(ad>cd0+0.02&&state.bpD>cd0-0.2){ line(ax,ay,bx,by,TD,TD); for(const t of [0.15,0.5,0.85]) pset(Math.round(ax+(bx-ax)*t)+1,Math.round(ay+(by-ay)*t),TL); }   // button placket
  dot(...tp(1.85,nearS*1.05,-0.45),TD,cd0); dot(...tp(1.85,nearS*1.35,-0.45),TD,cd0);         // breast pocket edge
  if(L.belt){ bodyPt(...pp(1.55,-1.3,0.9)); const x0=Math.round(state.bpX), y0=Math.round(state.bpY), d0=state.bpD; bodyPt(...pp(1.55,1.3,0.9)); if(Math.max(d0,state.bpD)>cd0-0.3) line(x0,y0,Math.round(state.bpX),Math.round(state.bpY),sh(L.shoe,0),sh(L.shoe,1)); }   /* belt */
  if(L.irons){ const a=J(-1).foot, b=J(1).foot; bodyPt(a[0],a[1],a[2]+0.5); const x0=state.bpX, y0=state.bpY; bodyPt(b[0],b[1],b[2]+0.5); const x1=state.bpX, y1=state.bpY;   /* leg irons: two cuffs, the chain sagging between */
    const IR=rgb('#3a3632'), IH=rgb('#7a7068'); for(let k=0;k<=12;k++){ const u=k/12, x=x0+(x1-x0)*u, y=y0+(y1-y0)*u+Math.sin(Math.PI*u)*3*state.ISO_K; pset(Math.round(x),Math.round(y),k&1?IH:IR); }
    for(const [x,y] of [[x0,y0],[x1,y1]]) for(let d=-1;d<=1;d++){ pset(Math.round(x)+d,Math.round(y)-1,IR); pset(Math.round(x)+d,Math.round(y),IH); } }
  if(L.baton){ bodyPt(...pp(0.3,nearS*2.05,1.0)); const x0=Math.round(state.bpX), y0=Math.round(state.bpY); bodyPt(...pp(0.7,nearS*2.2,-3.0)); line(x0,y0,Math.round(state.bpX),Math.round(state.bpY),sh(L.shoe,0),sh(L.shoe,0)); }   /* rubber baton on the hip */
  litFinish(); if(state.ISO_K===3&&state.ipPose===0&&!o.tilt) drawHDCharacterDetails(C,J,L); state.ipPose=0; state.ipBase=0; state.ipC=state.hubP;
}

/** A pixel mosaic over the groin: 4×3 blocks of 2×2 picture pixels, each the average of what is under it, lighter or darker by turns. @param {number} cx @param {number} cy */
function censor(cx,cy){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, B=2, T=[0.62,1.3,0.86,1.14,0.72,1.4];
  for(let by=0;by<3;by++) for(let bx=0;bx<4;bx++){ const x0=cx-4+bx*B, y0=cy-3+by*B; let r=0, g=0, b=0, n=0;
    for(let y=y0;y<y0+B;y++) for(let x=x0;x<x0+B;x++){ if(x<0||y<0||x>=W||y>=H) continue; const c=fb[y*W+x]; r+=c&255; g+=(c>>8)&255; b+=(c>>16)&255; n++; }
    if(!n) continue; const m=T[(bx*5+by*3)%6]/n, v=(0xff000000|(Math.min(255,b*m|0)<<16)|(Math.min(255,g*m|0)<<8)|Math.min(255,r*m|0))>>>0;
    for(let y=y0;y<y0+B;y++) for(let x=x0;x<x0+B;x++) if(x>=0&&y>=0&&x<W&&y<H) fb[y*W+x]=v; }
}

/** One tapered limb of a hub figure; radii are native pixels, doubled in the 2× room. */
export function ipAdd(f0,s0,z0,r0,f1,s1,z1,r1,rp,rp2,zz1,zz2,rp3){
  if(state.ipN>=state.IP_N) return; const k=state.ipN++;
  bodyPt(f0,s0,z0); state.ipX0[k]=state.bpX; state.ipY0[k]=state.bpY; let d=state.bpD;
  bodyPt(f1,s1,z1); state.ipX1[k]=state.bpX; state.ipY1[k]=state.bpY; state.ipD[k]=(d+state.bpD)*0.5;
  const K=state.propCamera?.figureScale??state.ISO_K; state.ipR0[k]=r0*K; state.ipR1[k]=r1*K; state.ipRp[k]=rp; state.ipRp2[k]=rp2||0; state.ipZ1[k]=zz1===undefined?-9:zz1; state.ipZ2[k]=zz2===undefined?-9:zz2; state.ipRp3[k]=rp3||0;
} function drawIsoBoxer(){                                   // in the cell he wears the same drelich as the inmates (long sleeves, no belt, black shoes)
  if(state.hubRoom==='laznia'){ drawIsoTowel(); return; }
  if(!PRISON_LOOK.includes(state.hubRoom)){ drawIsoBoxer0(); return; }
  if(state.hubRoom==='yard'){ const A=appearanceState, k=A.PAL.slice(A.R_HAIR*3,A.R_HAIR*3+3); setRamp(A.R_HAIR,npcsState.HOOD,false); state.heroHood=true;   /* on the yard he wears the hood too */
    try{ drawIsoBoxerCell(); } finally { state.heroHood=false; A.PAL.set(k,A.R_HAIR*3); } return; }
  drawIsoBoxerCell();
} function drawIsoBoxerCell(){ withCellOutfit(drawIsoBoxer0);
} /** Run fn with the hero's ramps set to the prison drelich (long sleeves, no belt, black shoes). @param {()=>void} fn */
export function withCellOutfit(fn){
  const keep=state.CELL_OUTFIT.map(o=>[appearanceState.PAL[o[0]*3],appearanceState.PAL[o[0]*3+1],appearanceState.PAL[o[0]*3+2]]);
  for(const o of state.CELL_OUTFIT) setRamp(o[0],o[1],o[2]);
  try{ fn(); } finally { state.CELL_OUTFIT.forEach((o,k)=>{ appearanceState.PAL[o[0]*3]=keep[k][0]; appearanceState.PAL[o[0]*3+1]=keep[k][1]; appearanceState.PAL[o[0]*3+2]=keep[k][2]; }); }
} function drawIsoTowel(){                                   // in the bath: a towel round the hips and rubber slippers
  withBathTowel(()=>{ state.isoTowel=true; try{ drawIsoBoxer0(); } finally { state.isoTowel=false; } });
} /** Run fn with the hero's ramps set to the bath towel and rubber slippers. @param {()=>void} fn */
export function withBathTowel(fn){
  const A=appearanceState, slots=[A.R_TRUNK,A.R_TRUNKF,A.R_TT,A.R_TTF,A.R_BOOT,A.R_BOOTF], keep=slots.map(r=>A.PAL.slice(r*3,r*3+3));
  setRamp(A.R_TRUNK,state.ISO_TOWEL,false); setRamp(A.R_TRUNKF,state.ISO_TOWEL,true); setRamp(A.R_TT,state.ISO_TOWEL,false); setRamp(A.R_TTF,state.ISO_TOWEL,true);
  setRamp(A.R_BOOT,state.ISO_SLIP,false); setRamp(A.R_BOOTF,state.ISO_SLIP,true);
  try{ fn(); } finally { slots.forEach((r,k)=>A.PAL.set(keep[k],r*3)); }
} /** The hero's modelled-figure look in the current hub room and the palette wrapper to draw it in: the cell drelich, the yard hood, the bath towel.
 * @returns {{look:any,wrap:(fn:()=>void)=>void}} */
export function heroFigureLook(){
  const A=appearanceState, look=/** @type {any} */ ({sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'crop',stubble:true});
  if(state.hubRoom==='laznia'){ Object.assign(look,{top:look.sk,pt:look.sk,shoe:A.R_BOOT,bare:true,censor:false,waist:A.R_TRUNK}); return {look,wrap:withBathTowel}; }
  if(state.hubRoom==='yard'){ Object.assign(look,{style:'hood',stubble:false});
    return {look,wrap:fn=>{ const k=A.PAL.slice(A.R_HAIR*3,A.R_HAIR*3+3); setRamp(A.R_HAIR,npcsState.HOOD,false); try{ withCellOutfit(fn); } finally { A.PAL.set(k,A.R_HAIR*3); } }}; }
  return {look,wrap:withCellOutfit};
} function drawIsoBoxer0(){
  state.ipC=state.hubP; state.ipN=0; state.ipPose=state.hubP.pose|0; state.ipBase=state.hubP.poseZ||0;
  const HD=state.ISO_K>1&&(PRISON_LOOK.includes(state.hubRoom)||state.hubRoom==='laznia'), jt={};   // the 2× cell: the modelled figure
  const still=state.ipPose===1||state.ipPose===2, mv=state.hubP.moving&&!state.ipPose, ph=state.hubP.ph, swayI=mv?0.35*Math.cos(ph):0, swayJ=mv?0.45*Math.sin(ph):0, bob=still?0:(mv?Math.abs(Math.sin(ph))*0.7:0.35*Math.sin(boxingState.tick*0.09));
  const sideD=(-state.hubP.fj+state.hubP.fi), nearS=sideD>=0?1:-1;
  const dressed=!state.isoTowel&&!(roomsState.hubAct&&roomsState.hubAct.kind==='shower'&&roomsState.hubAct.t>roomsState.ACT_FADE);   // prison clothes (the bath has its own figure)
  for(let s=-1;s<=1;s+=2){
    const near=s===nearS, sw=mv?Math.sin(ph+(s<0?0:Math.PI)):0, lift=mv?Math.max(0,Math.cos(ph+(s<0?0:Math.PI)))*1.3:0, fF=2.3*sw;
    const SK=near?appearanceState.R_SKIN:appearanceState.R_SKINF, TR=near?appearanceState.R_TRUNK:appearanceState.R_TRUNKF, TT=near?appearanceState.R_TT:appearanceState.R_TTF, PT=near?appearanceState.R_HPT:appearanceState.R_HPTF, SH=near?appearanceState.R_HSH:appearanceState.R_HSHF;
    if(HD) jt[s]=state.ipPose===2&&state.hubRoom==='cell'?{hip:[0.3,s*1.2,7.2],knee:[2.6,s*1.3,7.4],foot:[2.8,s*1.45,2.2]}:state.ipPose===2&&state.hubRoom==='laznia'?   /* on the edge of the guard-bed: knees forward, feet down */
      {hip:[0.3,s*1.2,5.9],knee:[2.6,s*1.3,6.6],foot:[4.4,s*1.35,5.9]}:{hip:[0,s*1.2,7.2+bob],knee:[fF*0.5+0.7,s*1.3,3.8+lift*0.6],foot:[fF,s*1.4,0.9+lift]};   /* in a tub: legs out in the water */
    if(state.ipPose!==2&&!HD){                              // sitting: the legs are hidden by the sofa
      if(dressed){
        ipAdd(0,s*1.2,7.2+bob,1.45, fF*0.5+0.7,s*1.3,3.8+lift*0.6,1.2, PT);
        ipAdd(fF*0.5+0.7,s*1.3,3.8+lift*0.6,1.2, fF,s*1.4,0.9+lift,1.1, PT);
        ipAdd(fF-0.2,s*1.4,0.7+lift,1.15, fF+0.9,s*1.4,0.5+lift,1.0, appearanceState.R_HSLIP);
      } else {
        ipAdd(0,s*1.2,7.2+bob,1.4, fF*0.5+0.7,s*1.3,3.8+lift*0.6,1.1, SK,TR,0.45,0.58,TT);
        ipAdd(fF*0.5+0.7,s*1.3,3.8+lift*0.6,1.1, fF,s*1.4,0.9+lift,1.0, SK);
        ipAdd(fF-0.2,s*1.4,0.8+lift,1.25, fF+0.9,s*1.4,0.6+lift,1.1, near?appearanceState.R_BOOT:appearanceState.R_BOOTF);
      }
    }
    // arms hang a little away from the body (wide lats, soft elbows, hands slightly in front of the hips)
    // and swing gently - bigger bend on the forward swing
    const aw=mv?-sw:(state.ipPose?0:0.1*Math.sin(boxingState.tick*0.045+(s<0?0:1.3)));
    let ex=-0.2+0.55*aw, ez=9.9+bob+0.15*Math.abs(aw), hx=0.6+1.1*aw+(aw>0?0.5*aw:0), hz=8.0+bob+0.5*(aw>0?aw:0), es=3.5, hs=3.7;
    if(state.ipPose===3&&s===1&&(boxingState.tick%80)<36){ ex=1.3; ez=10.6; es=3.0; hx=2.3; hz=14.2; hs=1.5; }   // eating: hand to the mouth
    if(state.ipPose===2){ ex=0.9; ez=9.8; hx=2.2; hz=8.6; }                                           // sitting: hands on the thighs
    const longS=dressed&&PRISON_LOOK.includes(state.hubRoom);
    if(HD){ Object.assign(jt[s],{sh:[0.1,s*2.7,12.4+bob],el:[ex,s*es,ez],hd:[hx,s*hs,hz]}); if(carryingTray()) Object.assign(jt[s],{el:[1.2,s*2.9,9.6+bob],hd:[2.4,s*2.5,10.3+bob]}); continue; }   /* both hands on the tray */
    if(dressed) ipAdd(0.1,s*2.7,12.4+bob,1.25, ex,s*es,ez,1.05, longS?SH:SK,SH,0.62);    // short sleeve (long in the cell)
    else ipAdd(0.1,s*2.7,12.4+bob,1.15, ex,s*es,ez,1.0, SK);
    ipAdd(ex,s*es,ez,1.0, hx,s*hs,hz,0.9, longS?SH:SK);
    ipAdd(hx,s*hs,hz-0.2,1.0, hx+0.1,s*hs,hz-0.2,1.0, SK);                            // bare fists
  }
  if(HD){ const A=appearanceState, J=(/** @type {number} */ s)=>jt[s]; J.pel=[0,0,6.6+bob]; J.chest=[0.4+swayI,swayJ,12.2+bob]; J.head=[0.35,0,15.6+bob];
    const look={sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'crop',stubble:true};
    if(state.heroHood) Object.assign(look,{style:'hood',stubble:false});
    if(state.isoTowel){ const wet=!!(roomsState.hubAct&&roomsState.hubAct.kind==='shower'&&roomsState.hubAct.t>roomsState.ACT_FADE);   /* the bath: a towel and slippers, under the shower naked */
      Object.assign(look,{top:look.sk,pt:look.sk,shoe:A.R_BOOT,bare:true,censor:false,waist:wet?undefined:A.R_TRUNK}); }   /* in the tub the water hides him */
    const tray=carryingTray(), front=state.hubP.fi+state.hubP.fj>0;   /* the tray is in front of him: drawn over him when he faces the camera */
    if(tray&&!front) drawHeldTray(state.hubP,10.6+bob);
    figureHD(state.hubP,J,look,{pose:state.ipPose,base:state.ipBase,noShadow:still});
    if(tray&&front) drawHeldTray(state.hubP,10.6+bob);
    return; }
  if(dressed) ipAdd(0,0,6.6+bob,2.2, 0.4+swayI,swayJ,12.2+bob,2.85, appearanceState.R_HSH,appearanceState.R_HPT,0.27,0.34,appearanceState.R_HBELT);   // shirt tucked into the trousers, belt
  else ipAdd(0,0,6.6+bob,2.1, 0.4+swayI,swayJ,12.2+bob,2.8, appearanceState.R_SKIN,appearanceState.R_TRUNK,0.34,0.44,appearanceState.R_TT);
  ipAdd(0.35,0,15.6+bob,2.45, 0.35,0,15.6+bob,2.45, appearanceState.R_SKIN);
  if(appearanceState.lk.style!=='bald') ipAdd(-0.5,0,16.5+bob,appearanceState.lk.style==='afro'?2.9:2.25, -0.5,0,16.5+bob,appearanceState.lk.style==='afro'?2.9:2.25, appearanceState.R_HAIR);
  for(let k=0;k<state.ipN;k++) state.ipOrd[k]=k;
  for(let a=1;a<state.ipN;a++){ const v=state.ipOrd[a]; let b=a-1; while(b>=0&&state.ipD[state.ipOrd[b]]>state.ipD[v]){ state.ipOrd[b+1]=state.ipOrd[b]; b--; } state.ipOrd[b+1]=v; }
  if(!still){ bodyPt(0,0,0); shadowEll(Math.round(state.bpX),Math.round(state.bpY),4,1); }
  for(let p=0;p<2;p++) for(let a=0;a<state.ipN;a++){ const k=state.ipOrd[a];
    taper(Math.round(state.ipX0[k]),Math.round(state.ipY0[k]),state.ipR0[k],Math.round(state.ipX1[k]),Math.round(state.ipY1[k]),state.ipR1[k],p,state.ipRp[k],state.ipRp2[k],state.ipZ1[k],state.ipZ2[k],state.ipRp3[k]); }
  if(state.ipPose!==1){ bodyPt(0.35,0,15.6); const hd=state.bpD;                                          // eyes (closed when lying)
    for(let s=-1;s<=1;s+=2){ bodyPt(2.2,s*0.9,15.9+bob); if(state.bpD>hd+0.02) pset(Math.round(state.bpX),Math.round(state.bpY),appearanceState.C_OUT); } }
  state.ipPose=0;
}
function behind(a,b){ return state.drA1[a]<=state.drA0[b]+1e-4||state.drB1[a]<=state.drB0[b]+1e-4; } // a is behind b if it ends before b starts on either axis
function drawScene(){
  let n=0;
  for(const it of state.gymItems){ if(state.GYM_TYPES[it.t].flat||it.held||n>=state.DR_N-1) continue; const r=itemRect(it); state.drA0[n]=r[0]; state.drB0[n]=r[1]; state.drA1[n]=r[2]; state.drB1[n]=r[3];
    state.drRef[n]=it; state.drDone[n]=0; n++; }
  const actOrd=roomsState.hubAct&&roomsState.hubAct.t>=roomsState.ACT_FADE&&roomsState.hubAct.order?roomsState.hubAct:null;   // using furniture: the boxer is drawn right before / after that item
  let pIdx=-1; if(!actOrd&&!state.actors){ state.drA0[n]=state.hubP.i-0.2; state.drB0[n]=state.hubP.j-0.2; state.drA1[n]=state.hubP.i+0.2; state.drB1[n]=state.hubP.j+0.2; state.drRef[n]=null; state.drDone[n]=0; pIdx=n; n++; }
  const NPCL=state.actors?state.fightSpectators:state.hubRoom==='cell'?npcsState.CNL:state.hubRoom==='yard'?(cnNight()?null:npcsState.YND):(state.hubRoom==='laznia'?bathState.crowd:null);   // hooded inmates and the turnkeys
  const cnIdx=[]; if(NPCL) for(const C of NPCL){ if(C.after||!C.step) continue; const r=cnRect(C); state.drA0[n]=r[0]; state.drB0[n]=r[1]; state.drA1[n]=r[2]; state.drB1[n]=r[3]; state.drRef[n]=null; state.drDone[n]=0; cnIdx.push([n,C]); n++; }
  const actIdx=[]; if(state.actors) for(const a of state.actors){ state.drA0[n]=a.i-0.25; state.drB0[n]=a.j-0.25; state.drA1[n]=a.i+0.25; state.drB1[n]=a.j+0.25; state.drRef[n]=null; state.drDone[n]=0; actIdx.push([n,a]); n++; }   // fight actors: {i,j,draw}
  for(let left=n;left>0;left--){
    // pick an undrawn element with nothing undrawn behind it (fallback: the one with the smallest centre depth)
    let pick=-1, pd=1e9;
    for(let a=0;a<n;a++){ if(state.drDone[a]) continue; let ok=true; for(let b=0;b<n&&ok;b++){ if(b===a||state.drDone[b]) continue; if(behind(b,a)&&!behind(a,b)) ok=false; }
      const d=state.drA0[a]+state.drA1[a]+state.drB0[a]+state.drB1[a]; if(ok&&(pick<0||d<pd)){ pick=a; pd=d; } }
    if(pick<0){ for(let a=0;a<n;a++) if(!state.drDone[a]){ const d=state.drA0[a]+state.drA1[a]+state.drB0[a]+state.drB1[a]; if(d<pd){ pd=d; pick=a; } } }
    state.drDone[pick]=1;
    const cnE=cnIdx.length?cnIdx.find(e=>e[0]===pick):null;
    const acE=actIdx.length?actIdx.find(e=>e[0]===pick):null;
    if(acE) acE[1].draw(); else if(cnE){ if(cnE[1]===npcsState.STINK) cnToiletStream(); cnDraw(cnE[1]); } else if(pick===pIdx) drawIsoBoxer(); else { const it=state.drRef[pick], mine=actOrd&&it===actOrd.item;
      if(mine&&actOrd.order==='before') drawIsoBoxer();
      const onIt=NPCL?NPCL.filter(C=>C.after===it):null;
      if(it.t==='cwheel'&&state.hubRoom==='cell'){ drawItem(it); if(onIt) for(const C of onIt) cnDraw(C); state.bunkFront=true; drawItem(it); state.bunkFront=false; }
      else if(onIt&&onIt.length){ blitSprite(it,0,1); for(const C of onIt) cnDraw(C); blitSprite(it,0,2); }   // inmate on a stool / in a bunk (+ the bunk's front layer over him)
      else blitSprite(it,0);
      if(state.hubRoom==='cell'&&it.t==='bunk2') wardRoaches(true);
      if(mine&&actOrd.order==='after'){ drawIsoBoxer(); if(actOrd.kind==='shower'&&it.t==='lshower') blitSprite(it,0,2);   /* in the tub: its near sides over him */
        if(actOrd.kind==='sleep'){ wardBlanket(actOrd); } } }
  }
} function drawHubMarker(){
  if(state.hubTrans.kind||!navigationState.stMenuEl.hidden) return;
  if(!state.hubNear) return; const L=state.hubNear.look;
  const K=state.ISO_K, x=Math.round(isoX(L[0],L[1])), y=Math.round(isoY(L[0],L[1],L[2]))-(9+((boxingState.tick>>3)&1))*K;
  for(let r=0;r<3;r++) for(let dx=-r;dx<=r;dx++) psetK(x+dx*K,y+(4-r)*K,r===2&&Math.abs(dx)===2?appearanceState.C_OUT:appearanceState.C_SPARK);
  psetK(x,y+5*K,appearanceState.C_SPARK);   // the name and the key are in the DOM prompt below the picture
}

export function renderHub(){
  if(hdRoom()&&!rendererState.inHD){ withHD(renderHub,roomFrame()); return; }   // Newgate rooms are drawn into the 2× frame
  rendererState.fb=rendererState.FB_MAIN; rendererState.fb.set(state.bgHub);
  if(state.preScene) state.preScene();   // marks on the floor under the people (iso-fight.js)
  if(state.hubRoom==='cell') wardLife();   /* rats, flies and drips under the people */
  drawScene();
  if(state.hubRoom==='cell'&&!state.actors&&!npcsState.STINK.step) cnToiletStream();
  if(state.hubRoom==='cell'){ wardBreath(state.actors||[state.hubP,...npcsState.CNL]); lightCell(); drawCellLights(); wardSmog(); wardVignette(); }   /* the Ward: cold breath, tallow and smog, dark edges */
  else if(state.hubRoom==='laznia') bathFX();   /* gaslight, steam, fog, carbolic */
  if(state.hubRoom==='yard'){ weatherLight(); const b=skyBucket(); if(b===0) dimFB(0.45); else if(b===4) dimFB(0.25); drawRain(); yardFog(); wardBreath(state.actors||npcsState.YND); wardVignette(); }   /* Newgate: smog in the well, breath through the hoods */
  drawActivityOverlay();
  drawHubMarker();
  if(state.hubTrans.kind){
    const x=state.hubTrans.t/state.hubTrans.dur, zz=state.hubTrans.kind===1?1+2.4*x*x:1+2.4*(1-x)*(1-x);
    const K=state.ISO_K; zoomBlit(zz,(72+(state.hubTrans.zx-72)*((zz-1)/2.4))*K,(48+(state.hubTrans.zy-48)*((zz-1)/2.4))*K);   // the centre is in native coordinates
  }
  drawPopups();
}













/** Set the people shown alongside fight actors in the room. @param {any[]|null} spectators */
export function setFightSpectators(spectators){ state.fightSpectators=spectators; }

export function initialize(){

/* Prison rooms share the isometric projection and depth-sorted item renderer. */
state.HUB_GW = 12;
state.HUB_GH = 10;
state.HUB_OX = 66;
state.HUB_WH = 24;
state.ISO_K = 1;
state.HUB_OY = 29;

state.bgHub = new Uint32Array(appearanceState.W*appearanceState.H);

// scanline fill of a convex polygon (points in PX/PY), colour from fn(x,y)
state.PX = new Float32Array(8);
state.PY = new Float32Array(8);

state.BAYER = new Uint8Array([0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]);

// Room modules register their fixed furniture and stations during initialize().
state.GYM_TYPES = {};
state.ST_INFO = {};
state.gymItems = [];
state.cellList = [];
state.yardList = [];
state.hubRoom = 'cell';
state.bunkFront = false;

/* ---------- player ---------- */
state.hubP = {i:6.2,j:5.6,fi:-0.7071,fj:-0.7071,ph:0,moving:false,pose:0,poseZ:0};
   // pose: 0 stand, 1 lie, 2 sit, 3 eat
state.hubKeys = {u:0,d:0,l:0,r:0};
state.preScene = null;
state.fightSpectators = null;
state.actors = null;   // fight actors drawn by the depth sorter instead of the hero and the inmates (iso-fight.js)

state.hubNear = null;
state.hubLastItem = null;
state.hubTrans = {kind:0,t:0,dur:1,zx:72,zy:48,fn:null};
state.hubFade = 0;
state.fadeInT = 0;

/* ---------- tiny iso boxer (3D skeleton -> iso) ---------- */
state.IP_N = 32;   // the modelled 2× figure has about 25 parts
state.ipX0 = new Float32Array(state.IP_N);
state.ipY0 = new Float32Array(state.IP_N);
state.ipR0 = new Float32Array(state.IP_N);
state.ipX1 = new Float32Array(state.IP_N);
state.ipY1 = new Float32Array(state.IP_N);
state.ipR1 = new Float32Array(state.IP_N);
state.ipD = new Float32Array(state.IP_N);
state.ipRp = new Int16Array(state.IP_N);
state.ipRp2 = new Int16Array(state.IP_N);
state.ipZ1 = new Float32Array(state.IP_N);
state.ipZ2 = new Float32Array(state.IP_N);
state.ipRp3 = new Int16Array(state.IP_N);
state.ipOrd = new Int8Array(state.IP_N);

state.ipN = 0;
state.bpX = 0;
state.bpY = 0;
state.bpD = 0;
state.ipPose = 0;
state.ipBase = 0;
state.ipC = null;

state.ISO_TOWEL = ['#8e969c','#c8ced0','#eef0ee'];
state.ISO_SLIP = ['#1a1c22','#2e3240','#4a5068'];
state.isoTowel = false;
state.CELL_OUTFIT = [[appearanceState.R_HSH,state.CN_TOP_R=['#36302a','#504638','#6a5e4a'],false],[appearanceState.R_HSHF,state.CN_TOP_R,true],[appearanceState.R_HPT,state.CN_PANT_R=['#262420','#38342e','#4e4940'],false],[appearanceState.R_HPTF,state.CN_PANT_R,true],
  [appearanceState.R_HBELT,['#1c2430','#2c3848','#3c4a5e'],false],[appearanceState.R_HSLIP,['#141416','#26262a','#3e3e44'],false]];

state.CN_TOP_R = undefined;
state.CN_PANT_R = undefined;

/* ---------- depth-sorted draw of items + boxer ---------- */
state.DR_N = 64;
state.drA0 = new Float32Array(state.DR_N);
state.drB0 = new Float32Array(state.DR_N);
state.drA1 = new Float32Array(state.DR_N);
state.drB1 = new Float32Array(state.DR_N);
state.drDone = new Uint8Array(state.DR_N);
 state.drRef = new Array(state.DR_N).fill(null);


}
