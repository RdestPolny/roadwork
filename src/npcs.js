import { wardBed, wardBlanket, wardFlies, WARD_SEATS, WARD_EX, WARD_WASH } from './ward.js';
import { exerciseLayout, buildExerciseYard, ringPos, RING_C, WALK_R, WALK_SP } from './exercise-yard.js';
import { figureHD, state as gymState, itemW, itemH, isoLine, quad, ipAdd, bodyPt, itemRect } from './gym.js';
import { rgb, state as appearanceState, setRamp } from './appearance.js';
import { state as roomsState, floorAt, drawCellItem } from './rooms.js';
import { pset, taper, shadowEll, state as rendererState } from './renderer.js';
import { state as progressionState } from './progression.js';
import { h2 } from './boxing.js';
import { LOOK } from './data.js';

// Runtime values owned by npcs; initialized explicitly by main.js.
export const state = {};

function crewRamps(rb,c){ setRamp(rb,c.sk,false); setRamp(rb+1,c.sk,true); setRamp(rb+2,c.tr,false); setRamp(rb+3,c.tr,true); setRamp(rb+4,c.tt,false); setRamp(rb+5,c.tt,true);
  setRamp(rb+6,c.top,false); setRamp(rb+7,c.top,true); setRamp(rb+8,c.gl,false); setRamp(rb+9,c.hair,false); } function npcFace(C,di,dj,k){ const l=Math.hypot(di,dj); if(l<1e-4) return; di/=l; dj/=l; C.fi+=(di-C.fi)*k; C.fj+=(dj-C.fj)*k; const m=Math.hypot(C.fi,C.fj)||1; C.fi/=m; C.fj/=m; }

function crewArm(C,s,near,sh,el,hd,glove){
  const rb=C.rb, SK=near?rb:rb+1, TP=near?rb+6:rb+7;
  ipAdd(sh[0],sh[1],sh[2],1.15, el[0],el[1],el[2],1.0, TP);
  ipAdd(el[0],el[1],el[2],1.0, hd[0],hd[1],hd[2],0.9, C.sleeves?TP:SK);
  if(glove) ipAdd(hd[0],hd[1],hd[2],1.4, hd[0]+0.1,hd[1],hd[2],1.4, rb+8);
  else if(C.wraps) ipAdd(hd[0],hd[1],hd[2],1.05, hd[0]+0.05,hd[1],hd[2],1.05, rb+8);
  else ipAdd(hd[0],hd[1],hd[2],0.95, hd[0]+0.05,hd[1],hd[2],0.95, SK);
} function crewGuardArm(C,s,bob,lean,sl){
  let el=[1.0+lean,s*2.6+sl,10.9+bob], hd=[2.3+lean,s*1.25+sl,14.0+bob];
  if(C.pk&&C.pk!=='slip'&&C.pside===s){ const e=Math.sin(Math.PI*Math.min(1,C.pt/state.PUNCH_T[C.pk])), P={jab:[[3.4,s*1.4,13.0],[6.3,s*0.5,13.6]],cross:[[3.4,s*1.4,13.0],[6.3,s*0.4,13.6]],hook:[[2.6,s*3.1,13.3],[4.4,-s*0.2,13.6]],upper:[[2.2,s*2.0,10.4],[3.8,s*0.8,15.2]]}[C.pk];
    el=state.lerp3(el,[P[0][0]+lean,P[0][1]+sl,P[0][2]+bob],e); hd=state.lerp3(hd,[P[1][0]+lean,P[1][1]+sl,P[1][2]+bob],e); }
  return [el,hd];
}

export function drawIsoNPC(C){
  if(C.act==='pushup'){ drawCrewPushup(C); return; }
  gymState.ipC=C; gymState.ipN=0; gymState.ipPose=0; gymState.ipBase=0;
  const rb=C.rb, act=C.act, mv=C.moving, ph=C.ph, t=C.t;
  const sideD=(-C.fj+C.fi), nearS=sideD>=0?1:-1;
  const stance=act==='guard'||act==='bag';
  let bob=0, lean=0, sl=0, jump=0;
  if(stance){ bob=-0.4+0.35*Math.sin(t*0.11); if(C.pk&&C.pk!=='slip'){ const e=Math.sin(Math.PI*Math.min(1,C.pt/state.PUNCH_T[C.pk])); lean=0.5*e; if(C.pk==='upper') bob-=0.6*e; }
    if(C.pk==='slip'){ const e=Math.sin(Math.PI*Math.min(1,C.pt/state.PUNCH_T.slip)); sl=1.3*C.slip*e; bob-=1.1*e; } }
  else if(act==='rest') bob=0.3*Math.sin(t*0.13);
  else if(act==='scrub') bob=0.15*Math.sin(t*0.3);
  else if(mv) bob=Math.abs(Math.sin(ph))*0.6;
  const dr=C.hood&&gymState.hubRoom==='yard'&&mv;   /* the yard: the damned drag their feet, stooped, arms hanging */
  if(dr){ lean=0.9; bob*=0.4; }
  const HD=gymState.ISO_K>1&&(C.pants||C.bath), jt={};   // cell inmates in the 2× room: the modelled figure
  for(let s=-1;s<=1;s+=2){
    const near=s===nearS, SK=near?rb:rb+1, TRk=near?rb+2:rb+3, TT=near?rb+4:rb+5;
    let hip=[0,s*1.2,7.2+bob+jump], knee, foot;
    if(stance){ const lead=s===1, sh=mv?0.45*Math.sin(ph+(lead?0:Math.PI)):0, ff=(lead?1.5:-1.3)+sh;
      hip=[0,s*1.25,6.9+bob]; knee=[ff*0.55+0.5,s*1.55,3.6]; foot=[ff,s*1.7,0.9+(mv?Math.max(0,Math.cos(ph+(lead?0:Math.PI)))*0.5:0)]; }
    else { const sw=mv?Math.sin(ph+(s<0?0:Math.PI)):0, lift=mv?Math.max(0,Math.cos(ph+(s<0?0:Math.PI)))*(dr?0.35:1.3):0, fF=(dr?0.95:2.2)*sw;
      knee=[fF*0.5+0.7,s*1.3,3.8+lift*0.6]; foot=[fF,s*1.4,0.9+lift]; }
    if(HD) jt[s]={hip,knee,foot};
    else if(C.pants){ ipAdd(hip[0],hip[1],hip[2],1.45, knee[0],knee[1],knee[2],1.2, TRk); ipAdd(knee[0],knee[1],knee[2],1.15, foot[0],foot[1],foot[2],1.05, TRk); }   // long trousers (cell inmates)
    else { ipAdd(hip[0],hip[1],hip[2],1.4, knee[0],knee[1],knee[2],1.1, SK,TRk,0.45,0.58,TT);
    ipAdd(knee[0],knee[1],knee[2],1.1, foot[0],foot[1],foot[2],1.0, SK); }
    if(!HD) ipAdd(foot[0]-0.2,foot[1],foot[2]-0.1,1.25, foot[0]+0.9,foot[1],foot[2]-0.3,1.1, appearanceState.R_NPCB);
    // arms
    const sh=[0.1+lean,s*2.7+sl,12.4+bob+jump]; let el, hd;
    if(stance){ [el,hd]=crewGuardArm(C,s,bob,lean,sl); }
    else if(act==='behind'){ el=[-0.8,s*2.7,10.1]; hd=[-1.4,s*0.9,8.7]; }                                                   /* hands clasped behind the back */                                                      // arms folded
    else if(act==='rest'){ el=[-0.5,s*4.3,10.2+bob]; hd=[0.3,s*2.9,8.0+bob]; }
    else if(act==='scrub'){ const w=Math.sin(t*0.3+(s>0?0:1.7)); el=[0.9,s*3.1,14.3+bob]; hd=[0.7+0.25*w,s*1.5,17.0+0.35*w+bob]; }   // under the shower: scrubbing the head
    else if(act==='loose'){ const j=Math.sin(t*0.5+(s>0?0:2))*0.35; el=[0.1,s*3.4,9.9]; hd=[0.8+j,s*3.6,8.0+Math.abs(j)]; }
    else if(dr){ const aw=-Math.sin(ph+(s<0?0:Math.PI)); el=[0.7,s*3.0,9.5+bob]; hd=[1.0+0.15*aw,s*3.0,7.0+bob]; }   /* arms hanging, a faint sway */
    else { const aw=mv?-Math.sin(ph+(s<0?0:Math.PI)):0; el=[-0.2+0.55*aw,s*3.5,9.9+bob]; hd=[0.6+1.1*aw+(aw>0?0.5*aw:0),s*3.7,8.0+bob+0.5*Math.max(0,aw)]; }
    if(HD){ Object.assign(jt[s],{sh,el,hd}); continue; }
    crewArm(C,s,near,sh,el,hd,C.gloves);
  }
  if(HD){ const J=(/** @type {number} */ s)=>jt[s]; J.pel=[0,sl,6.6+bob+jump]; J.chest=[0.4+lean,sl,12.2+bob+jump]; J.head=[0.35+lean*1.2+(dr?0.5:0),sl*1.25,15.6+bob+jump-(dr?1.1:0)];   /* stooped: the head hangs forward */
    figureHD(C,J,cnLookHD(C)); return; }
  ipAdd(0,0,6.6+bob+jump,2.1, 0.4+lean,sl,12.2+bob+jump,2.8, rb+6,rb+2,0.34,0.44,rb+4);
  const hz=15.6+bob+jump, hf=0.35+lean*1.2, hs=sl*1.25;
  ipAdd(hf,hs,hz,2.45, hf,hs,hz,2.45, rb);
  ipAdd(hf-0.5,hs,hz+0.9,2.2, hf-0.5,hs,hz+0.9,2.2, rb+9);
  for(let k=0;k<gymState.ipN;k++) gymState.ipOrd[k]=k;
  for(let a=1;a<gymState.ipN;a++){ const v=gymState.ipOrd[a]; let b=a-1; while(b>=0&&gymState.ipD[gymState.ipOrd[b]]>gymState.ipD[v]){ gymState.ipOrd[b+1]=gymState.ipOrd[b]; b--; } gymState.ipOrd[b+1]=v; }
  bodyPt(0,0,0); shadowEll(Math.round(gymState.bpX),Math.round(gymState.bpY),4,1);
  for(let p=0;p<2;p++) for(let a=0;a<gymState.ipN;a++){ const k=gymState.ipOrd[a];
    taper(Math.round(gymState.ipX0[k]),Math.round(gymState.ipY0[k]),gymState.ipR0[k],Math.round(gymState.ipX1[k]),Math.round(gymState.ipY1[k]),gymState.ipR1[k],p,gymState.ipRp[k],gymState.ipRp2[k],gymState.ipZ1[k],gymState.ipZ2[k],gymState.ipRp3[k]); }
  bodyPt(hf,hs,hz); const hd0=gymState.bpD;
  for(let s=-1;s<=1;s+=2){ bodyPt(hf+1.85,hs+s*0.9,hz+0.3); if(gymState.bpD>hd0+0.02) pset(Math.round(gymState.bpX),Math.round(gymState.bpY),appearanceState.C_OUT); }
  gymState.ipC=gymState.hubP;
} function drawCrewPushup(C){
  gymState.ipC=C; gymState.ipN=0; gymState.ipPose=0; gymState.ipBase=0;
  const rb=C.rb, up=C.up, Zs=2.4+3.3*up, zf=f=>0.8+(f+6.4)/8.8*(Zs-0.8);
  const sideD=(-C.fj+C.fi), nearS=sideD>=0?1:-1;
  for(let s=-1;s<=1;s+=2){
    const near=s===nearS, SK=near?rb:rb+1, TRk=near?rb+2:rb+3, TT=near?rb+4:rb+5;
    if(C.pants){ ipAdd(-2.0,s*1.1,zf(-2.0),1.4, -4.2,s*0.95,zf(-4.2),1.15, TRk); ipAdd(-4.2,s*0.95,zf(-4.2),1.1, -6.3,s*0.85,0.95,1.0, TRk); }
    else { ipAdd(-2.0,s*1.1,zf(-2.0),1.35, -4.2,s*0.95,zf(-4.2),1.1, SK,TRk,0.45,0.58,TT);
    ipAdd(-4.2,s*0.95,zf(-4.2),1.05, -6.3,s*0.85,0.95,0.95, SK); }
    ipAdd(-6.6,s*0.85,0.55,1.1, -6.2,s*0.85,1.5,1.05, appearanceState.R_NPCB);
    const sh=[2.3,s*2.6,Zs], el=[2.0,s*(3.3+0.9*(1-up)),0.6+(Zs-0.6)*0.5+0.4], hd=[2.7,s*3.0,0.7];
    crewArm(C,s,near,sh,el,hd,false);
  }
  ipAdd(-2.0,0,zf(-2.0),2.0, 2.0,0,zf(2.0),2.5, rb+6,rb+2,0.3,0.38,rb+4);
  ipAdd(4.0,0,Zs+0.5,2.3, 4.0,0,Zs+0.5,2.3, rb);
  ipAdd(3.5,0,Zs+1.3,2.1, 3.5,0,Zs+1.3,2.1, rb+9);
  for(let k=0;k<gymState.ipN;k++) gymState.ipOrd[k]=k;
  for(let a=1;a<gymState.ipN;a++){ const v=gymState.ipOrd[a]; let b=a-1; while(b>=0&&gymState.ipD[gymState.ipOrd[b]]>gymState.ipD[v]){ gymState.ipOrd[b+1]=gymState.ipOrd[b]; b--; } gymState.ipOrd[b+1]=v; }
  bodyPt(-1.2,0,0); shadowEll(Math.round(gymState.bpX),Math.round(gymState.bpY),6,1);
  for(let p=0;p<2;p++) for(let a=0;a<gymState.ipN;a++){ const k=gymState.ipOrd[a];
    taper(Math.round(gymState.ipX0[k]),Math.round(gymState.ipY0[k]),gymState.ipR0[k],Math.round(gymState.ipX1[k]),Math.round(gymState.ipY1[k]),gymState.ipR1[k],p,gymState.ipRp[k],gymState.ipRp2[k],gymState.ipZ1[k],gymState.ipZ2[k],gymState.ipRp3[k]); }
  gymState.ipC=gymState.hubP;
}

export function crewRect(C){      // footprint used by the depth sort
  if(C.act==='pushup'){ const a0=-0.9, a1=0.6;
    if(Math.abs(C.fi)>0.5){ const x0=C.i+Math.min(a0*C.fi,a1*C.fi), x1=C.i+Math.max(a0*C.fi,a1*C.fi); return [x0,C.j-0.3,x1,C.j+0.3]; }
    const y0=C.j+Math.min(a0*C.fj,a1*C.fj), y1=C.j+Math.max(a0*C.fj,a1*C.fj); return [C.i-0.3,y0,C.i+0.3,y1]; }
  return [C.i-0.2,C.j-0.2,C.i+0.2,C.j+0.2];
}

export function yardLayout(){ return exerciseLayout(); }   /* Newgate: the exercise yard */
export function buildYard(){ rendererState.fb=gymState.bgHub; buildExerciseYard(drawCellItem); rendererState.fb=rendererState.FB_MAIN; }

function cnBedOf(C){                   // where he lies (centre, facing = head), the mattress height and the spot next to the bunk
  if(gymState.hubRoom==='cell') return wardBed(C.bed);   /* the Ward: a place on the guard-bed */
  const it=gymState.cellList.find(x=>x.t===C.bed.t); if(!it) return null;
  const up=C.bed.lv===1, base=up?15.5:6.5;
  const fr=up?0:0.3;                   // lower bunk: lie nearer the front edge, else the upper frame hides him completely
  if(C.bed.t==='bunk') return {it,at:[it.i+itemW(it)/2+fr,it.j+1.55],face:[0,-1],base,app:[2.1,1.9]};
  return {it,at:[it.i+1.55,it.j+itemH(it)/2+fr],face:[-1,0],base,app:up?[6.1,2.15]:[7.2,2.15]};
}

export function cnNight(){ const h=progressionState.save.sim.min/60; return h<6||h>=22; } function cnBlk(i,j){
  if(i<0.35||j<0.35||i>roomsState.CELL_W-0.35||j>roomsState.CELL_H-0.35) return true;
  for(const it of gymState.cellList){ if(!gymState.GYM_TYPES[it.t].block) continue; const r=itemRect(it); if(i>r[0]-0.2&&i<r[2]+0.2&&j>r[1]-0.2&&j<r[3]+0.2) return true; }
  return false; } function cnGridBuild(){ state.cnGW=Math.ceil(roomsState.CELL_W/state.CN_G); state.cnGH=Math.ceil(roomsState.CELL_H/state.CN_G); state.cnGrid=new Uint8Array(state.cnGW*state.cnGH); state.cnPrev=new Int32Array(state.cnGW*state.cnGH);
  for(let b=0;b<state.cnGH;b++) for(let a=0;a<state.cnGW;a++) state.cnGrid[b*state.cnGW+a]=cnBlk((a+0.5)*state.CN_G,(b+0.5)*state.CN_G)?1:0; } function cnLOS(i0,j0,i1,j1){ const d=Math.hypot(i1-i0,j1-j0), n=Math.max(1,Math.ceil(d/0.1)); for(let k=1;k<n;k++){ const t=k/n; if(cnBlk(i0+(i1-i0)*t,j0+(j1-j0)*t)) return false; } return true; } function cnNode(i,j){ let best=-1, bd=1e9; for(let b=0;b<state.cnGH;b++) for(let a=0;a<state.cnGW;a++) if(!state.cnGrid[b*state.cnGW+a]){ const d=Math.hypot((a+0.5)*state.CN_G-i,(b+0.5)*state.CN_G-j); if(d<bd){ bd=d; best=b*state.cnGW+a; } } return best; } function cnPath(C,gi,gj){
  if(!state.cnGrid) cnGridBuild();
  if(cnLOS(C.i,C.j,gi,gj)) return [[gi,gj]];
  const s=cnNode(C.i,C.j), g=cnNode(gi,gj); if(s<0||g<0) return [[gi,gj]];
  state.cnPrev.fill(-1); state.cnPrev[s]=s; const q=[s]; let h=0;
  while(h<q.length){ const c=q[h++]; if(c===g) break; const a=c%state.cnGW, b=(c/state.cnGW)|0;
    for(const d of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){ const na=a+d[0], nb=b+d[1]; if(na<0||nb<0||na>=state.cnGW||nb>=state.cnGH) continue; const n=nb*state.cnGW+na;
      if(state.cnGrid[n]||state.cnPrev[n]>=0) continue; if(d[0]&&d[1]&&(state.cnGrid[b*state.cnGW+na]||state.cnGrid[nb*state.cnGW+a])) continue; state.cnPrev[n]=c; q.push(n); } }
  if(state.cnPrev[g]<0) return [[gi,gj]];
  const pts=[]; for(let c=g;c!==s;c=state.cnPrev[c]) pts.push([(c%state.cnGW+0.5)*state.CN_G,((c/state.cnGW|0)+0.5)*state.CN_G]); pts.reverse(); pts.push([gi,gj]);
  const out=[]; let ci=C.i, cj=C.j, k=0;
  while(k<pts.length){ let far=k; while(far+1<pts.length&&cnLOS(ci,cj,pts[far+1][0],pts[far+1][1])) far++; out.push(pts[far]); ci=pts[far][0]; cj=pts[far][1]; k=far+1; }
  return out;
} function cnWalk(C,gi,gj,sp){          // one step; true = arrived. Waits for the player standing in the way, then squeezes past.
  if(!C.path){ C.path=cnPath(C,gi,gj); C.pk=0; }
  const p=C.path[C.pk]; let di=p[0]-C.i, dj=p[1]-C.j; const d=Math.hypot(di,dj);
  if(d<=sp){ C.i=p[0]; C.j=p[1]; if(++C.pk>=C.path.length){ C.path=null; return true; } return false; }
  di/=d; dj/=d;
  const ni=C.i+di*sp, nj=C.j+dj*sp, pd=Math.hypot(ni-gymState.hubP.i,nj-gymState.hubP.j);
  if(C.pass>0) C.pass--;
  else if(pd<0.5&&pd<Math.hypot(C.i-gymState.hubP.i,C.j-gymState.hubP.j)){ if(++C.wait<100){ npcFace(C,di,dj,0.2); return false; } C.pass=80; }
  C.wait=0; C.i=ni; C.j=nj; npcFace(C,di,dj,0.22); C.moving=true; C.ph+=0.2;
  return false;
} // ---- routine ----
function cnFree(C,key){ return !state.CN.some(o=>o!==C&&o.res===key); } function cnPlan(C){
  const P=C.plan, R=Math.random;
  if(cnNight()){ const B=cnBedOf(C); if(B){ C.res='bed'; P.push({k:'go',i:B.app[0],j:B.app[1]},{k:'sleep',night:true,d:999999}); return; } }
  for(let n=0;n<8;n++){
    const r=R();
    if(r<0.3){ const S=WARD_SEATS.map((s,k)=>[s,k]).filter(e=>cnFree(C,'stool'+e[1])); if(!S.length) continue; const e=S[R()*S.length|0];
      C.res='stool'+e[1]; P.push({k:'go',i:e[0].a[0],j:e[0].a[1]},{k:'sit',s:e[0],d:900+(R()*1100|0)}); return; }
    if(r<0.62){ const E=WARD_EX.map((s,k)=>[s,k]).filter(e=>cnFree(C,'ex'+e[1])); if(!E.length) continue; const e=E[R()*E.length|0], kind=R()<0.4?'squat':(R()<0.6?'pushup':'idle');
      C.res='ex'+e[1]; P.push({k:'go',i:e[0].p[0],j:e[0].p[1]},{k:kind,f:e[0].f,d:kind==='idle'?300+(R()*400|0):650+(R()*400|0)}); return; }
    if(r<0.76){ if(!cnFree(C,'sink')) continue; C.res='sink'; P.push({k:'go',i:WARD_WASH.p[0],j:WARD_WASH.p[1]},{k:'wash',f:WARD_WASH.f,d:320+(R()*300|0)}); return; }
    if(r<0.9){ const B=cnBedOf(C); if(!B) continue; C.res='bed'; P.push({k:'go',i:B.app[0],j:B.app[1]},{k:'sleep',d:900+(R()*900|0)}); return; }
  }
  const e=WARD_EX[R()*WARD_EX.length|0]; C.res=''; P.push({k:'go',i:e.p[0]+R()*0.4-0.2,j:e.p[1]+R()*0.4-0.2},{k:'idle',f:[R()-0.5,R()-0.5],d:300});
} function cnLeave(C){                   // got up from a stool / bunk: stand next to it
  const S=C.step; C.after=null;
  if(S&&S.k==='sit'){ C.i=S.s.a[0]; C.j=S.s.a[1]; }
  if(S&&S.k==='sleep'){ const B=cnBedOf(C); if(B){ C.i=B.app[0]; C.j=B.app[1]; } }
} function cnStepTick(C){
  const S=C.step;
  if(S.k==='go'){ C.act='walk'; if(cnWalk(C,S.i,S.j,0.022)){ C.step=null; } return; }
  if(S.f) npcFace(C,S.f[0],S.f[1],0.2);
  switch(S.k){
    case 'sit': C.act='sit'; C.i=S.s.c[0]; C.j=S.s.c[1]; C.fi=S.s.f[0]; C.fj=S.s.f[1];
      C.after=gymState.cellList.find(x=>(x.t==='bunk'||x.t==='bunk2')&&S.s.c[0]>=x.i&&S.s.c[0]<x.i+itemW(x)&&S.s.c[1]<x.j+itemH(x))||null; break;   /* sitting on the edge of the guard-bed */
    case 'sleep': { const B=cnBedOf(C); if(!B){ C.step=null; return; } C.act='lie'; C.i=B.at[0]; C.j=B.at[1]; C.fi=B.face[0]; C.fj=B.face[1]; C.after=B.it;
      if(S.night&&!cnNight()&&C.t>200) S.d=0; break; }
    case 'squat': C.act='squat'; break;
    case 'pushup': C.act='pushup'; { const T=70, k=C.t%T; C.up=0.5+0.5*Math.cos(2*Math.PI*k/T); } break;
    case 'wash': C.act='wash'; break;
    default: C.act=(S.rest=S.rest===undefined?Math.random()<0.5:S.rest)?'rest':'idle';
  }
  if(C.t>=S.d){ cnLeave(C); C.up=1; C.step=null; C.res=''; }
  else if(!S.night&&S.k!=='sleep'&&cnNight()&&C.t>60){ cnLeave(C); C.step=null; C.plan=[]; C.res=''; }   // lights out: go to bed
}

export function cnTick(){
  profTick(); stinkTick();
  for(const C of state.CN){
    if(C.away) continue;
    C.t++; C.moving=false;
    if(!C.step){ if(!C.plan.length) cnPlan(C); C.step=C.plan.shift(); C.t=0; C.path=null; C.pk=0; C.wait=0; }
    cnStepTick(C);
  }
}

export function cnEnter(){                    // entering the cell: everybody is already somewhere doing something (no parade from the door)
  if(!state.cnGrid) cnGridBuild();
  profTick(); stinkTick();
  const used=[];
  for(const C of state.CN){
    C.step=null; C.plan=[]; C.after=null; C.path=null; C.res=''; C.act='idle'; C.up=1;
    C.away=progressionState.save.phase==='prison'&&C.name==='Zeke';   // in prison his bunk is Profesor's; he sits in another cell
    if(C.away) continue;
    cnPlan(C);
    while(C.plan.length&&C.plan[0].k==='go'){ const g=C.plan.shift(); C.i=g.i; C.j=g.j; }
    C.step=C.plan.shift()||null; C.t=C.step?Math.floor(Math.random()*Math.min(C.step.d*0.6,600)):0;
    if(C.step) cnStepTick(C);
  }
}

export function cnBlocks(a,b){ for(const C of state.CN){ if(C.after||C.away) continue; const d=Math.hypot(a-C.i,b-C.j); if(d<0.42&&d<Math.hypot(gymState.hubP.i-C.i,gymState.hubP.j-C.j)) return true; } return false; }

/** Resume the inmate's routine after a fight, resting on the yard or sleeping after a cell defeat.
 * @param {number} index Inmate index in the matching room.
 * @param {boolean} won Whether the player won.
 * @param {boolean} yard Whether the fight took place on the yard.
 */
export function finishPrisonFight(index,won,yard){
  const C=(yard?state.YN:state.CN)[index]; if(!C) return;
  C.moving=false;
  if(yard){ C.fightRest=won?420:180; C.wait=0; C.pass=0; if(C.kind!=='sit') C.act='rest'; return; }
  C.plan=[]; C.after=null; C.res=won?'bed':''; C.path=null; C.t=0;
  C.step=won?{k:'sleep',d:1600}:{k:'idle',rest:true,d:420};
}

/** Profesor's pose: in the wheelchair by day, in the lower bunk at night. */
/** Śmierdziel keeps to the wet corner by the tub (and is not there outside prison). */
function stinkTick(){
  const S=state.STINK, tub=gymState.cellList.find(x=>x.t==='cwc'); S.t++;
  S.away=progressionState.save.phase!=='prison'||!tub;
  S.step=S.away?null:{k:'stink'};
  if(tub){ S.i=tub.i+itemW(tub)+0.45; S.j=tub.j+itemH(tub)*0.55; }
}

function profTick(){
  const P=state.PROF; P.t++;
  const chair=gymState.cellList.find(x=>x.t==='cwheel'), bunk=gymState.cellList.find(x=>x.t==='bunk2');
  const B=cnNight()&&bunk&&progressionState.save.phase==='prison'?cnBedOf(P):null;
  if(B){ P.act='lie'; P.after=B.it; P.i=B.at[0]; P.j=B.at[1]; P.fi=B.face[0]; P.fj=B.face[1]; }
  else if(chair){ P.act='sit'; P.after=chair; P.i=chair.i+itemW(chair)/2; P.j=chair.j+itemH(chair)/2-0.05; P.fi=-0.6; P.fj=0.8; }
}

export function cnRect(C){ return C.act==='pushup'?crewRect(C):[C.i-0.2,C.j-0.2,C.i+0.2,C.j+0.2]; } // ---- drawing ----
/** How a cell person looks in the 2× room: ramps of his colour block plus hair, beard and stubble. @param {any} C */
/** The modelled-figure look of a hub person (also the fighters of the isometric fight). @param {any} C */
export function cnLookHD(C){ const rb=C.rb, L={sk:[rb,rb+1],top:[rb+6,rb+7],pt:[rb+2,rb+3],shoe:appearanceState.R_NPCB,hair:rb+9,...(C.hd||{})};
  if(C.hood&&gymState.hubRoom==='yard') Object.assign(L,{style:'hood',cap:rb+8,beard:false,mustache:false,chops:false,stubble:false});   /* the yard: everyone under the same grey hood */
  if(C.bath){ const wet=C.act==='scrub'||C.tub; Object.assign(L,{top:L.sk,pt:L.sk,shoe:rb+8,bare:true,censor:C.act==='scrub',waist:wet?undefined:rb+4}); }   /* the bath: slippers and a towel, naked under the shower */
  return L; }

function cnSkel(C,J,lie,base){        // J(s) -> {hip,knee,foot,sh,el,hd}; J.pel / J.chest / J.head: body joints [fwd,side,z]
  if(gymState.ISO_K>1){ figureHD(C,J,cnLookHD(C),{pose:lie?1:0,base,noShadow:lie||J.noShadow}); return; }   // the 2× cell
  gymState.ipC=C; gymState.ipN=0; gymState.ipPose=lie?1:0; gymState.ipBase=base||0;
  const rb=C.rb, nearS=(-C.fj+C.fi)>=0?1:-1;
  for(let s=-1;s<=1;s+=2){
    const near=s===nearS, SK=near?rb:rb+1, PT=near?rb+2:rb+3, TP=near?rb+6:rb+7, L=J(s);
    ipAdd(L.hip[0],L.hip[1],L.hip[2],1.45, L.knee[0],L.knee[1],L.knee[2],1.2, PT);
    ipAdd(L.knee[0],L.knee[1],L.knee[2],1.15, L.foot[0],L.foot[1],L.foot[2],1.05, PT);
    ipAdd(L.foot[0]-0.2,L.foot[1],L.foot[2]-0.1,1.2, L.foot[0]+0.9,L.foot[1],L.foot[2]-0.3,1.05, appearanceState.R_NPCB);
    ipAdd(L.sh[0],L.sh[1],L.sh[2],1.2, L.el[0],L.el[1],L.el[2],1.05, TP);
    ipAdd(L.el[0],L.el[1],L.el[2],1.05, L.hd[0],L.hd[1],L.hd[2],0.95, TP);
    ipAdd(L.hd[0],L.hd[1],L.hd[2],0.95, L.hd[0]+0.05,L.hd[1],L.hd[2],0.95, SK);
  }
  const P=J.pel, Q=J.chest, H=J.head;
  ipAdd(P[0],P[1],P[2],2.2, Q[0],Q[1],Q[2],2.85, rb+6,rb+2,0.3,0.36,rb+2);
  ipAdd(H[0],H[1],H[2],2.45, H[0],H[1],H[2],2.45, rb);
  ipAdd(H[0]-0.5,H[1],H[2]+0.9,2.2, H[0]-0.5,H[1],H[2]+0.9,2.2, rb+9);
  for(let k=0;k<gymState.ipN;k++) gymState.ipOrd[k]=k;
  for(let a=1;a<gymState.ipN;a++){ const v=gymState.ipOrd[a]; let b=a-1; while(b>=0&&gymState.ipD[gymState.ipOrd[b]]>gymState.ipD[v]){ gymState.ipOrd[b+1]=gymState.ipOrd[b]; b--; } gymState.ipOrd[b+1]=v; }
  if(!lie&&!J.noShadow){ bodyPt(0,0,0); shadowEll(Math.round(gymState.bpX),Math.round(gymState.bpY),4,1); }
  for(let p=0;p<2;p++) for(let a=0;a<gymState.ipN;a++){ const k=gymState.ipOrd[a];
    taper(Math.round(gymState.ipX0[k]),Math.round(gymState.ipY0[k]),gymState.ipR0[k],Math.round(gymState.ipX1[k]),Math.round(gymState.ipY1[k]),gymState.ipR1[k],p,gymState.ipRp[k],gymState.ipRp2[k],gymState.ipZ1[k],gymState.ipZ2[k],gymState.ipRp3[k]); }
  if(!lie){ bodyPt(H[0],H[1],H[2]); const hd0=gymState.bpD;
    for(let s=-1;s<=1;s+=2){ bodyPt(H[0]+1.85,H[1]+s*0.9,H[2]+0.3); if(gymState.bpD>hd0+0.02) pset(Math.round(gymState.bpX),Math.round(gymState.bpY),appearanceState.C_OUT); } }
  gymState.ipPose=0; gymState.ipBase=0; gymState.ipC=gymState.hubP;
} function cnBlanket(C){                 // grey prison blanket over the legs of a sleeping inmate
  const B=cnBedOf(C); if(!B) return; if(gymState.hubRoom==='cell'){ wardBlanket({at:B.at}); return; }
  const it=B.it, w=itemW(it), h=itemH(it), z0=B.base-0.3, z1=B.base+2.9;
  const T=roomsState.CLC.bT, F=roomsState.CLC.bF, S=roomsState.CLC.bS;
  let i0,j0,i1,j1; if(it.t==='bunk'){ i0=it.i+0.14; i1=it.i+w-0.14; j0=B.at[1]-0.05; j1=it.j+h-0.18; } else { j0=it.j+0.14; j1=it.j+h-0.14; i0=B.at[0]-0.05; i1=it.i+w-0.18; }
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,()=>F); quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,()=>S);
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,(x,y)=>{ floorAt(x,y,z1); return (h2(Math.floor(roomsState.fa*9),Math.floor(roomsState.fz*9))<50)?F:T; });
  isoLine(i0,j0,z1,i1,j0,z1,roomsState.CLC.mS); isoLine(i0,j0,z1,i0,j1,z1,roomsState.CLC.mS);
}

export function cnDraw(C){
  const t=C.t;
  switch(C.act){
    case 'pushup': drawCrewPushup(C); return;
    case 'walk': case 'idle': case 'rest': case 'loose': case 'behind': drawIsoNPC(C); return;
    case 'sit': {
      const eat=(!C.yard||C.smoke)&&(t%260)<60, bob=0.15*Math.sin(t*0.05);
      const J=s=>{ const R=s===1&&eat;
        if(C.tub) return {hip:[0.3,s*1.2,5.9],knee:[2.6,s*1.3,6.6],foot:[4.4,s*1.35,5.9],sh:[0.3,s*2.7,11.2+bob],el:[1.0,s*3.1,9.2+bob],hd:[1.6,s*3.2,9.1]};   /* in the tub: legs out in the water, hands on the rim */
        return {hip:[0.3,s*1.2,5.9],knee:[2.7,s*1.35,6.1],foot:[2.8,s*1.45,0.9],sh:[0.3,s*2.7,11.2+bob],
          el:R?[1.5,s*3.0,10.4]:(C.yard?[1.3,s*3.1,8.6]:[1.4,s*3.2,8.7]), hd:R?[1.7,s*0.9,13.4]:(C.yard?[2.5,s*2.0,6.9]:[2.9,s*2.3,8.2])}; };
      J.pel=[0,0,5.4]; J.chest=[0.3,0,10.9+bob]; J.head=[0.6,0,14.3+bob]; J.noShadow=true;
      cnSkel(C,J,false);
      if(C.smoke){ gymState.ipC=C; bodyPt(eat?1.9:2.6,eat?0.9:2.0,eat?13.6:7.1); const x=Math.round(gymState.bpX), y=Math.round(gymState.bpY); pset(x,y,rgb('#ff7a2a'));   // cigarette + smoke
        for(let k=0;k<3;k++){ const ph=(t*0.4+k*9)%24; if(ph<18) pset(x+Math.round(Math.sin(t*0.05+k)*1.2),y-2-Math.round(ph*0.35),(k&1)?rgb('#c8ccd2'):rgb('#9aa0a8')); } gymState.ipC=gymState.hubP; }
      return; }
    case 'floor': {   /* on the wet flags by the tub: knees up, arms over them, head hanging; now and then he scratches */
      const bob=0.12*Math.sin(t*0.04), itch=(t%420)<70, nod=0.5*Math.max(0,Math.sin(t*0.011));
      const J=s=>({hip:[0,s*1.2,1.4],knee:[1.9,s*1.4,5.2],foot:[3.0,s*1.5,0.9],sh:[-0.3,s*2.6,8.4+bob],
        el:s===1&&itch?[0.7,s*3.0,10.4]:[1.5,s*2.9,6.2],hd:s===1&&itch?[0.6,s*1.5,12.3+Math.sin(t*0.9)*0.3]:[2.4,s*1.6,5.0]});
      J.pel=[0,0,1.0]; J.chest=[-0.2,0,8.1+bob]; J.head=[0.3+nod*0.3,0,11.9+bob-nod*0.5]; J.noShadow=true;
      cnSkel(C,J,false);
      if(gymState.ISO_K>1) wardFlies(C.i,C.j,10,4);
      return; }
    case 'lie': {
      const br=0.2*Math.sin(t*0.03);
      const J=s=>({hip:[0,s*1.2,7.2],knee:[0.3,s*1.25,3.8],foot:[0,s*1.3,0.9],sh:[0.1,s*2.7,12.4+br],el:[-0.1,s*3.4,9.9],hd:[0.3,s*3.3,7.7]});
      J.pel=[0,0,6.6]; J.chest=[0.3,0,12.2+br]; J.head=[0.35,0,15.6];
      cnSkel(C,J,true,cnBedOf(C).base); cnBlanket(C); return; }
    case 'squat': {
      const T=96, d=0.5-0.5*Math.cos(2*Math.PI*(t%T)/T);
      const J=s=>({hip:[-1.5*d,s*1.25,7.2-3.1*d],knee:[0.7+0.9*d,s*(1.3+0.5*d),3.8+0.5*d],foot:[0.25,s*1.5,0.9],
        sh:[0.1+0.9*d,s*2.7,12.4-3.0*d],el:[0.3+0.9*d,s*4.1,14.8-3.0*d],hd:[-0.6+0.9*d,s*1.3,15.9-3.0*d]});   // hands behind the head
      J.pel=[-1.5*d,0,6.6-3.1*d]; J.chest=[0.4+0.9*d,0,12.2-3.0*d]; J.head=[0.45+1.1*d,0,15.6-3.0*d];
      cnSkel(C,J,false); return; }
    case 'wash': {
      const sp=(t%190)<46, w=0.35*Math.sin(t*0.32);
      const J=s=>({hip:[0,s*1.2,7.2],knee:[0.8,s*1.3,3.8],foot:[0.3,s*1.4,0.9],sh:[0.9,s*2.6,12.0],
        el:sp?[2.0,s*2.9,11.4]:[2.1,s*3.0,10.3], hd:sp?[2.2,s*0.9,14.2]:[2.9+w*s,s*1.4,9.9+Math.abs(w)]});
      J.pel=[0,0,6.6]; J.chest=[0.9,0,12.0]; J.head=sp?[1.4,0,14.8]:[1.6,0,14.6];
      cnSkel(C,J,false);
      if(!sp&&(t%9)<3){ bodyPt(3.0,(t%2?1:-1)*0.8,10.8); pset(Math.round(gymState.bpX),Math.round(gymState.bpY),rgb('#bcd4e8')); gymState.ipC=gymState.hubP; }   // splashes
      return; }
  }
  drawIsoNPC(C);
}

/** The walkers on the ring: the yard people and the two extra men, all in hoods. */
const walkers=()=>[...state.YN,...state.YARD_EXTRA];
export function ynEnter(){
  const W=walkers(), L=Math.PI*2*WALK_R;
  W.forEach((C,k)=>{ C.t=(Math.random()*400)|0; C.wait=0; C.pass=0; C.fightRest=0; C.after=null; C.kind='walk';
    C.s=L*k/W.length; const p=ringPos(C.s); C.i=p[0]; C.j=p[1]; C.fi=p[2]; C.fj=p[3]; C.act='walk'; C.hood=true; });
  Object.assign(state.GUARD,{i:RING_C[0]+0.15,j:RING_C[1]+0.15,fi:0.7071,fj:0.7071,act:'behind',moving:false});     // one turnkey in the middle,
  Object.assign(state.GUARD2,{i:1.25,j:3.2,fi:1,fj:0.25,act:'behind',moving:false});                                 // one by the gate
  state.YND=[...W,state.GUARD,state.GUARD2];
}

export function ynTick(){
  if(cnNight()) return;
  const W=walkers(), P=gymState.hubP;
  let halt=false;                                                                    // the column stops as one when the hero stands in the way
  for(const C of W){ if(C.fightRest>0) continue; const p=ringPos(C.s+0.4), pd=Math.hypot(p[0]-P.i,p[1]-P.j); if(pd<0.55&&pd<Math.hypot(C.i-P.i,C.j-P.j)) halt=true; }
  state.yardStep=(state.yardStep||0)+(halt?0:0.1);   /* a slow, dragging step */
  for(const C of W){
    C.t++; C.moving=false;
    if(C.fightRest>0){ C.fightRest--; continue; }
    if(halt){ C.act='idle'; continue; }
    C.s+=WALK_SP; const p=ringPos(C.s); C.i=p[0]; C.j=p[1]; C.fi=p[2]; C.fj=p[3]; C.moving=true; C.act='walk'; C.ph=state.yardStep;   /* in step */
  }
}

export function ynBlocks(a,b){ if(cnNight()) return false; for(const C of walkers()){ if(C.after) continue; const d=Math.hypot(a-C.i,b-C.j); if(d<0.42&&d<Math.hypot(gymState.hubP.i-C.i,gymState.hubP.j-C.j)) return true; } return false; }

export function initialize(){

// Shared boots and skeletal pose colors used by prison inmates.
setRamp(appearanceState.R_NPCB,['#121014','#241e24','#3a3238'],false);
state.PUNCH_T = {jab:12,cross:14,hook:16,upper:16,slip:18};
state.lerp3 = (a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];

// Newgate exercise yard.
state.YARD_W = 12;   // as large as the picture allows without scrolling
state.YARD_H = 10;

Object.assign(gymState.GYM_TYPES,{ ydoor:{fixed:true,flat:true,z:9,st:'ydoor'}, ydrain:{fixed:true,flat:true},  });

Object.assign(gymState.ST_INFO,{ydoor:['DRZWI','Drzwi — powrót do celi']});


/* =====================================================================
   CELL INMATES — 3 NPCs in prison frieze jackets (the old drelich) living their own day in the cell:
   eating / chatting at the table, naps and night sleep on their own bunk, squats, push-ups,
   washing at the sink, standing around. Shared prison skeleton renderer and color ramps
   (rb+0 skin, +1 skin far, +2/+3 trousers, +4/+5 trousers (no belt), +6/+7 drelich top, +9 hair).
   Paths: a small BFS grid of the cell (0.25 tile). Sitting / lying inmates are drawn right after
   their stool / bunk (bunks are baked in two layers so the front rail and ladder stay in front).
   ===================================================================== */
state.CN_READY = undefined;
                          // set once the inmates exist (setRoomRaw can run before this point)
state.CN_TOP = ['#36302a','#504638','#6a5e4a'];   /* Newgate: coarse brown-grey frieze */
state.CN_PANT = ['#262420','#38342e','#4e4940'];

state.CN = [
  {name:'Harry',rb:66,bed:{t:'bunk',lv:0},sk:['#8a5a3a','#c68a5e','#eab48a'],hair:['#6a6e7a','#a8acb8','#e0e4ec'],hd:{style:'bald',stubble:true,chops:true,irons:true,scarf:0xff2a3a6a}},   // hd: the 2× look
  {name:'Zeke',rb:76,bed:{t:'bunk2',lv:0},sk:['#b87a5e','#e8b08a','#ffd8b8'],hair:['#2a160c','#4a2a16','#704424'],hd:{style:'flatcap',cap:84,irons:true}},
  {name:'Reuben',rb:86,bed:{t:'bunk2',lv:1},sk:['#7a3f2b','#b86b45','#e59c6b'],hair:['#110b0b','#1e1414','#3b2b2b'],hd:{style:'shaved',mustache:true,chops:true,irons:true,scarf:0xff22306e}},
];

for(const C of state.CN){
  crewRamps(C.rb,{sk:C.sk,tr:state.CN_PANT,tt:state.CN_PANT,top:state.CN_TOP,gl:C.hd&&C.hd.cap?['#2e2a22','#463e30','#5e5442']:C.sk,hair:C.hair});   /* a cloth cap takes the glove ramp */
  Object.assign(C,{sleeves:true,wraps:false,gloves:false,pants:true,i:5,j:6,fi:0.7071,fj:0.7071,z0:0,ph:0,moving:false,act:'idle',t:0,
    plan:[],step:null,path:null,pk:0,wait:0,pass:0,res:'',after:null,up:1,reps:0,pq:[],pside:1,pt:0,cool:0});
}

/* Profesor: the old ring veteran in a wheelchair by the lower bunk. He sits all day and lies in that bunk at night. */
state.PROF = {name:'Profesor',rb:166,hd:{style:'long',beard:true},bed:{t:'bunk2',lv:0},yard:true,sleeves:true,wraps:false,gloves:false,pants:true,i:8.15,j:2.5,fi:-0.6,fj:0.8,z0:0,ph:0,moving:false,act:'sit',t:0,
  step:{k:'prof'},after:null,up:1,pq:[],pt:0,smoke:false};
crewRamps(166,{sk:['#8a5e46','#b98a6c','#dcae8e'],tr:state.CN_PANT,tt:state.CN_PANT,top:state.CN_TOP,gl:['#8a5e46','#b98a6c','#dcae8e'],hair:['#9a9aa2','#cfcfd6','#f0f0f4']});
/* Śmierdziel: a filthy man squatting shirtless on the wet flags by the night tub, flies over his head; he sells an
   ointment of his own making (healers.js). In prison only, always in the same spot, he sleeps sitting. */
state.STINK = {name:'Śmierdziel',rb:216,hd:{style:'shaved',beard:true,stubble:true,top:[216,217],bare:true},yard:true,sleeves:false,wraps:false,gloves:false,pants:true,i:1.6,j:6.3,fi:0.9,fj:0.45,z0:0,ph:0,moving:false,act:'floor',t:0,
  step:{k:'stink'},after:null,up:1,pq:[],pt:0,smoke:false};
crewRamps(216,{sk:['#6a5644','#8f765e','#ad927a'],tr:['#241e18','#382f25','#4c4132'],tt:['#241e18','#382f25','#4c4132'],top:['#241e18','#382f25','#4c4132'],gl:['#6a5644','#8f765e','#ad927a'],hair:['#1a1610','#2a241a','#3a3224']});
/** Cell people for drawing: the inmates, Profesor and Śmierdziel. */
state.CNL = [...state.CN, state.PROF, state.STINK];

state.CN_READY=true;

// ---- walk grid ----
state.CN_G = 0.25;
 state.cnGrid = null;
state.cnGW = 0;
state.cnGH = 0;
state.cnPrev = null;


/* Hooded Newgate inmates walk in a single column, watched by two turnkeys. */
state.YN_READY = undefined;

state.YN_SK = ['s1','s2','s3','s4','s2','s1','s5'];
state.YN_HR = ['h2','h1','h6','h3','h1','h4','h1'];

/** The yard hood: dirty grey canvas. */
state.HOOD = ['#4e4e4a','#6e6d66','#8e8c84'];
state.YN = [];
 for(let k=0;k<7;k++){
  const sk=LOOK.skin.find(o=>o.id===state.YN_SK[k]).ramp, hr=LOOK.hair.find(o=>o.id===state.YN_HR[k]).ramp, rb=96+k*10;
  crewRamps(rb,{sk,tr:state.CN_PANT,tt:state.CN_PANT,top:state.CN_TOP,gl:state.HOOD,hair:hr});   /* the glove ramp: the yard hood */
  state.YN.push({rb,yard:true,sleeves:true,wraps:false,gloves:false,pants:true,i:5,j:5,fi:1,fj:0,z0:0,ph:0,moving:false,act:'idle',t:0,step:{k:'yard'},after:null,
    kind:'walk',s:0,wait:0,pass:0,fightRest:0,smoke:k===5,pq:[],pk:null,pt:0,up:1});
}

/** Two more hooded walkers on the ring (not yard opponents, so nobody picks a fight with them). */
state.YARD_EXTRA = [176,186].map((rb,k)=>{ crewRamps(rb,{sk:k?['#7a4a32','#ad7452','#d69c78']:['#a07258','#d6a684','#f4c8a6'],tr:state.CN_PANT,tt:state.CN_PANT,top:state.CN_TOP,gl:state.HOOD,hair:k?['#1a1210','#2e221c','#4a382c']:['#5a4028','#8a6440','#b08a5c']});
  return {rb,yard:true,sleeves:true,wraps:false,gloves:false,pants:true,i:6,j:4,fi:0,fj:-1,z0:0,ph:0,moving:false,act:'idle',t:0,step:{k:'yard'},after:null,pk:null,pt:0,up:1,hd:{style:k?'shaved':'short',stubble:!!k}}; });
crewRamps(206,{sk:['#9a6a50','#c8967a','#e8b898'],tr:['#16181e','#22252e','#30343e'],tt:['#16181e','#22252e','#30343e'],top:['#181c28','#262c3c','#384054'],gl:['#101218','#1c1f28','#2c303a'],hair:['#3a3026','#5a4a3a','#7a6a56']});   /* a turnkey: dark blue coat, peaked cap */
state.GUARD = {rb:206,yard:false,sleeves:true,wraps:false,gloves:false,pants:true,i:0.8,j:1.0,fi:0.7071,fj:0.7071,z0:0,ph:0,moving:false,act:'behind',t:0,step:{k:'guard'},after:null,pk:null,pt:0,up:1,hd:{style:'cap',cap:214,belt:true,baton:true,mustache:true}};
/** The second turnkey on the yard, by the gate (same uniform as the first). */
state.GUARD2 = {...state.GUARD,step:{k:'guard'},hd:{style:'cap',cap:214,belt:true,baton:true,chops:true}};
/** Everyone drawn on the yard (ynEnter rebuilds it with the turnkeys). */
state.YND = [...state.YN, ...state.YARD_EXTRA];

state.YN_READY=true;
}
