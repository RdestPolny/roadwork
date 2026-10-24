import { state as appearanceState, rampIndex, rgb } from './appearance.js';
import { oppSurface, sparClamp, prisonOut, towelOut, bareTorsoOut, state as sparringState, stain, catchBloodOnClothes, sparRaiseGuard, sparDashCost, sparEvadeCost, sparOnAttack, staF, sparImpact } from './sparring.js';
import { wkSurf, drawCap, drawApron, redrawLeadLeg, wkStain, wkImpact } from './work.js';
import { state as animationState, samplePose, isDash } from './animation.js';
import { pset, taper, disc, state as rendererState, line, isSkinPx, shadowEll } from './renderer.js';
import { state as pushupsState } from './pushups.js';
import { sfxFlow, sfxWhoosh, sfxLand } from './audio.js';
import { setInfo } from './input.js';

// Runtime values owned by boxing; initialized explicitly by main.js.
export const state = {};

export function ik(sx,sy,tx,ty,l1,l2,sign){
  let dx=tx-sx, dy=ty-sy, d=Math.sqrt(dx*dx+dy*dy);
  if(d<1e-3){dx=1;dy=0;d=1;tx=sx+1;ty=sy;}
  const maxd=l1+l2-0.01, mind=Math.max(Math.abs(l1-l2),1);
  if(d>maxd){tx=sx+dx/d*maxd;ty=sy+dy/d*maxd;dx=tx-sx;dy=ty-sy;d=maxd;}
  else if(d<mind){tx=sx+dx/d*mind;ty=sy+dy/d*mind;dx=tx-sx;dy=ty-sy;d=mind;}
  const a=(l1*l1-l2*l2+d*d)/(2*d), h=Math.sqrt(Math.max(0,l1*l1-a*a)), ux=dx/d, uy=dy/d;
  state.IKx=sx+ux*a-sign*uy*h; state.IKy=sy+uy*a+sign*ux*h; state.IKtx=tx; state.IKty=ty;
}

/* =====================================================================
   SOLVE POSE -> JOINTS
   ===================================================================== */
function solveArm(shx,shy,relx,rely,r,fl,isLead){
  // integer-first: shoulder and glove offset are snapped BEFORE IK, so a guard pose moves as one rigid pixel block
  let gx=shx+Math.round(relx), gy=shy+Math.round(rely);
  ik(shx,shy,gx,gy,appearanceState.UPPER,appearanceState.FORE,1); gx=state.IKtx; gy=state.IKty;          // reachable target (straight arm if beyond reach)
  const tip=gx+r, surf=state.gstate==='spar'?oppSurface(gy):(state.gstate==='work'?wkSurf(gy):999); // opponent or hanging meat
  if(gx+r>surf+state.PENMAX){ gx=surf+state.PENMAX-r; ik(shx,shy,gx,gy,appearanceState.UPPER,appearanceState.FORE,1); }   // glove sinks in at most PENMAX px
  let ex=state.IKx, ey=state.IKy; gx=Math.round(state.IKtx); gy=Math.round(state.IKty);
  if(fl>0){ex+=((shx+gx)*0.5-ex)*fl; ey+=((shy+gy)*0.5-2-ey)*fl;}
  else if(fl<0){ const dx=gx-shx, dy=gy-shy, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L, vx=ex-shx, vy=ey-shy, pr=vx*ux+vy*uy;   // elbow up (hooks): the bend flipped over the shoulder-glove line
    const rx=shx+2*pr*ux-vx, ry=shy+2*pr*uy-vy; ex+=(rx-ex)*(-fl); ey+=(ry-ey)*(-fl); }
  if(isLead){state.lTipRaw=tip;state.lSurf=surf;state.lex=Math.round(ex);state.ley=Math.round(ey);state.lgx=gx;state.lgy=gy;}
  else {state.rTipRaw=tip;state.rSurf=surf;state.rex=Math.round(ex);state.rey=Math.round(ey);state.rgx=gx;state.rgy=gy;}
}

export function solve(){
  const P=animationState.cur;
  const bx=appearanceState.BASE_X+(state.gstate==='spar'?sparClamp(animationState.posX+P[animationState.GX]):animationState.posX+P[animationState.GX]), fy=appearanceState.FLOOR_Y+Math.round(P[animationState.GY]);   // footwork origin (x) and foot baseline (airborne when GY<0)
  state.hipX=Math.round(bx+P[animationState.BX]); state.hipY=Math.round(appearanceState.HIP_Y0+P[animationState.BY]+P[animationState.GY]);
  state.sx=Math.round(bx+P[animationState.BX]+P[animationState.LEAN]); state.sy=Math.round(appearanceState.HIP_Y0+P[animationState.BY]+P[animationState.GY]-appearanceState.TORSO-P[animationState.SQ]);
  const rot=P[animationState.ROT];
  state.lsx=state.sx+Math.round(1-2.5*rot); state.lsy=state.sy+1; state.rsx=state.sx+Math.round(-1+2.5*rot); state.rsy=state.sy+1;
  state.lgr=3.5+P[animationState.LGS]; state.rgr=4+P[animationState.RGS];
  solveArm(state.lsx,state.lsy,P[animationState.LGX],P[animationState.LGY],state.lgr,P[animationState.LFL],true);
  solveArm(state.rsx,state.rsy,P[animationState.RGX],P[animationState.RGY],state.rgr,P[animationState.RFL],false);
  state.headX=state.sx+Math.round(2+P[animationState.HX]); state.headY=state.sy+Math.round(-6+P[animationState.HY]);
  // legs: feet planted on the (possibly lifted) baseline, hips move over them
  const st=P[animationState.ST], h=P[animationState.HEEL];
  const la0=Math.round(bx+P[animationState.STEP]+st*0.44), lh=Math.round(P[animationState.LHEEL]);   // lead foot under a bent knee, rear leg long and almost straight
  const ll=Math.round(P[animationState.LLIFT]), rl=Math.round(P[animationState.RLIFT]);
  const lhU=Math.max(lh,0), lhT=Math.max(-lh,0);                       // heel up (ball of the foot) / toe up (heel strike)
  state.lax=la0+Math.round(lhU*0.6); state.lay=fy-3-lhU-ll;                 // lead heel lifts and turns out on hooks
  const r0=Math.round(bx-st*0.56+P[animationState.RSTEP]), hr=Math.round(h), hrU=Math.max(hr,0), hrT=Math.max(-hr,0);
  state.rax=r0+Math.round(hrU*0.7); state.ray=fy-3-hrU-rl;
  const hrot=P[animationState.HROT];
  state.lhx=state.hipX+1-Math.round(hrot); state.lhy=state.hipY; state.rhx=state.hipX-1+Math.round(3*hrot); state.rhy=state.hipY+(hrot>0.5?1:0);   // rear hip drives through
  state.torsoX=state.hipX+Math.round(hrot);
  ik(state.lhx,state.lhy,state.lax,state.lay,appearanceState.THIGH,appearanceState.SHIN,-1); state.lkx=Math.round(state.IKx+P[animationState.LKN]); state.lky=Math.round(state.IKy+P[animationState.LKN]*0.8);   // knee turns in
  ik(state.rhx,state.rhy,state.rax,state.ray,appearanceState.THIGH,appearanceState.SHIN,-1); state.rkx=Math.round(state.IKx); state.rky=Math.round(state.IKy);
  state.ltx=la0+4-Math.round(0.6*lhU)-Math.round(0.4*lhT); state.lty=fy-1-ll-lhT; state.lhex=la0-1+Math.round(lhU*0.9); state.lhey=fy-1-lhU-ll;
  state.rtx=r0+4-Math.round(1.5*Math.max(0,hrot))-Math.round(0.4*hrT); state.rty=fy-1-rl-hrT;   // rear foot turns in on the pivot (foreshortened)
  state.rhex=r0-1+Math.round(hrU*0.9); state.rhey=fy-1-hrU-rl;
  state.shDirX=0; state.shDirY=1;
  if(state.gstate==='spar'&&P[animationState.BY]>6){ const dx=(state.lkx+state.rkx)*0.5-state.hipX, dy=(state.lky+state.rky)*0.5-state.hipY, d=Math.sqrt(dx*dx+dy*dy)||1; state.shDirX=dx/d; state.shDirY=dy/d; }   // sitting / lying: trunks follow the thighs
} function trailRecord(){
  const m=state.state>=0?animationState.MOVES[state.state]:null, punching=m&&m.glove>=0&&m.apex>=0&&state.stateT<=m.times[m.apex]+3;
  for(let h=0;h<2;h++){
    const L=state.trl.h[h];
    for(const p of L) p.a++;
    while(L.length&&L[0].a>8) L.shift();
    if(punching&&m.glove===h){ const gx=h?state.rgx:state.lgx, gy=h?state.rgy:state.lgy, last=L[L.length-1];
      if(!last||Math.abs(last.x-gx)+Math.abs(last.y-gy)>=1){ L.push({x:gx,y:gy,a:0}); if(L.length>6) L.shift(); } }
  }
} function fillDisc(x,y,r,c,dither){ const r2=r*r; for(let yy=Math.floor(y-r);yy<=Math.ceil(y+r);yy++) for(let xx=Math.floor(x-r);xx<=Math.ceil(x+r);xx++){ const dx=xx-x, dy=yy-y; if(dx*dx+dy*dy<=r2&&(!dither||((xx+yy)&1))) pset(xx,yy,c); } } function drawTrails(){
  let rear=false;
  for(let h=0;h<2;h++){
    const L=state.trl.h[h]; if(L.length<2) continue;
    const fade=L[L.length-1].a; if(fade>5) continue;
    let len=0; for(let k=1;k<L.length;k++) len+=Math.hypot(L[k].x-L[k-1].x,L[k].y-L[k-1].y);
    if(len<6) continue;
    const gx=h?state.rgx:state.lgx, gy=h?state.rgy:state.lgy, gr=h?state.rgr:state.lgr, n=L.length; state.TS.length=0;
    for(let k=0;k<n-1;k++){ const p0=L[Math.max(0,k-1)], p1=L[k], p2=L[k+1], p3=L[Math.min(n-1,k+2)], m=Math.max(2,Math.ceil(Math.hypot(p2.x-p1.x,p2.y-p1.y)/0.7));   // Catmull-Rom
      for(let q=0;q<m;q++){ const t=q/m, t2=t*t, t3=t2*t;
        state.TS.push(0.5*(2*p1.x+(p2.x-p0.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(3*p1.x-p0.x-3*p2.x+p3.x)*t3), 0.5*(2*p1.y+(p2.y-p0.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(3*p1.y-p0.y-3*p2.y+p3.y)*t3)); } }
    state.TS.push(L[n-1].x,L[n-1].y);
    while(state.TS.length>=2&&Math.hypot(state.TS[state.TS.length-2]-gx,state.TS[state.TS.length-1]-gy)<gr-0.3) state.TS.length-=2;   // stop at the glove's edge
    const N=state.TS.length>>1; if(N<3) continue;
    const rMax=gr*0.92*(1-fade/6);
    for(let pass=0;pass<3;pass++) for(let k=0;k<N;k++){ const u=k/(N-1), r=rMax*Math.pow(u,0.9), x=state.TS[2*k], y=state.TS[2*k+1];
      if(r<0.6) continue;
      if(pass===0) fillDisc(x,y,r+0.7,state.C_TRL2,u<0.4); else if(pass===1) fillDisc(x,y,r,state.C_TRL,u<0.3); else if(u>0.5) fillDisc(x,y,r*0.38,state.C_TRLB,false); }
    if(h===1) rear=true;
  }
  // recoil chevrons in front of a straight that snaps back
  const m=state.state>=0?animationState.MOVES[state.state]:null;
  if(m&&(state.state===0||state.state===1)&&m.apex>=0){ const t0=m.times[m.apex]+2, tt=state.stateT-t0;
    if(tt>=0&&tt<9){ const h=m.glove, gx=(h?state.rgx:state.lgx)+(h?state.rgr:state.lgr)+2+(tt>>1), gy=h?state.rgy:state.lgy, c=appearanceState.PAL[(h?appearanceState.R_GLOVE:appearanceState.R_GLOVEF)*3+1];
      for(let k=0;k<2;k++){ const x=gx+k*3; pset(x,gy-1,c); pset(x+1,gy,c); pset(x,gy+1,c); } } }
  return rear;
} // work (butcher): apron / cap / shirt / trousers; mid hook = the carried carcass, drawn between body and head/near arm
function drawGlove(gx,gy,r,ex,ey,far,flash){
  let dx=ex-gx, dy=ey-gy; const d=Math.sqrt(dx*dx+dy*dy)||1; dx/=d; dy/=d;
  const c0x=Math.round(gx+dx*(r-1)), c0y=Math.round(gy+dy*(r-1)), c1x=Math.round(gx+dx*(r+1.5)), c1y=Math.round(gy+dy*(r+1.5));
  const gr=flash?appearanceState.R_FLASH:(far?appearanceState.R_GLOVEF:appearanceState.R_GLOVE), cr=far?appearanceState.R_CUFFF:appearanceState.R_CUFF;
  for(let p=0;p<2;p++){ taper(c0x,c0y,2.2,c1x,c1y,2.0,p,cr,0,-9,-9,0); disc(gx,gy,r,p,gr); }
  if(flash) return;
  if(appearanceState.glStyle==='twotone'){   // top half in the accent colour (knuckle panel)
    const ga=far?appearanceState.R_GAF:appearanceState.R_GA, ri=Math.ceil(r);
    for(let yy=-ri;yy<0;yy++)for(let xx=-ri;xx<=ri;xx++){ const x=gx+xx,y=gy+yy; if(x<0||y<0||x>=appearanceState.W||y>=appearanceState.H)continue; const k=rampIndex(rendererState.fb[y*appearanceState.W+x],gr); if(k>=0) rendererState.fb[y*appearanceState.W+x]=appearanceState.PAL[ga*3+k]; }
  } else if(appearanceState.glStyle==='laced'){   // laces criss-cross the cuff
    const mx=Math.round((c0x+c1x)*0.5), my=Math.round((c0y+c1y)*0.5);
    pset(mx,my,appearanceState.C_OUT); pset(mx-1,my-1,appearanceState.C_OUT); pset(mx+1,my+1,appearanceState.C_OUT);
  }
  pset(gx+1,gy-2,far?appearanceState.PAL[gr*3+2]:appearanceState.C_WHITE); pset(gx+2,gy-2,appearanceState.PAL[gr*3+2]); pset(gx,gy-2,appearanceState.PAL[gr*3+2]);
} function drawHand(gx,gy,ex,ey,far){
  if(bareTorsoOut()){ drawBareFist(gx,gy,ex,ey,far); return; }
  let dx=ex-gx, dy=ey-gy; const d=Math.sqrt(dx*dx+dy*dy)||1; dx/=d; dy/=d;
  const wx=Math.round(gx+dx*2), wy=Math.round(gy+dy*2);
  if(prisonOut()||towelOut()){ for(let p=0;p<2;p++){ taper(wx,wy,1.5,gx,gy,1.5,p,far?appearanceState.R_SKINF:appearanceState.R_SKIN,0,-9,-9,0); disc(gx,gy,1.9,p,far?appearanceState.R_SKINF:appearanceState.R_SKIN); }   // bare knuckles
    pset(gx+(far?0:1),gy-1,appearanceState.PAL[(far?appearanceState.R_SKINF:appearanceState.R_SKIN)*3+2]); return; }
  for(let p=0;p<2;p++){ taper(wx,wy,1.5,gx,gy,1.4,p,far?appearanceState.R_TRIMF:appearanceState.R_TRIM,0,-9,-9,0); disc(gx,gy,1.7,p,far?appearanceState.R_SKINF:appearanceState.R_SKIN); }
  pset(gx,gy+1,appearanceState.PAL[(far?appearanceState.R_TRIMF:appearanceState.R_TRIM)*3+1]);            // wrap across the knuckles
}

/** A clenched hand follows the forearm: wrist, knuckle plane, folded fingers and tucked thumb.
 * @param {number} gx @param {number} gy @param {number} ex @param {number} ey @param {boolean} far */
function drawBareFist(gx,gy,ex,ey,far){
  const len=Math.hypot(gx-ex,gy-ey)||1,ux=(gx-ex)/len,uy=(gy-ey)/len,nx=-uy,ny=ux;
  const ramp=far?appearanceState.R_SKINF:appearanceState.R_SKIN;
  const wx=Math.round(gx-ux*2.5),wy=Math.round(gy-uy*2.5),kx=Math.round(gx+ux*0.7),ky=Math.round(gy+uy*0.7);
  const tx=Math.round(gx-ux*0.8+nx*1.3),ty=Math.round(gy-uy*0.8+ny*1.3);
  for(let p=0;p<2;p++){
    taper(wx,wy,1.25,gx,gy,1.8,p,ramp,0,-9,-9,0);
    taper(gx,gy,1.8,kx,ky,1.65,p,ramp,0,-9,-9,0);
    disc(tx,ty,0.9,p,ramp);
  }
  const marks=[[0.7,-0.7,5],[0.7,0.6,4],[-0.5,0.6,1],[-1.2,1.2,3]];
  for(const [u,v,tone] of marks){
    const x=Math.round(gx+ux*u+nx*v),y=Math.round(gy+uy*u+ny*v);
    if(x>=0&&x<appearanceState.W&&y>=0&&y<appearanceState.H&&isSkinPx(rendererState.fb[y*appearanceState.W+x]))pset(x,y,skinTone(tone,far));
  }
}

export function drawLeg(hx,hy,kx,ky,ax,ay,hex,hey,tx,ty,far){
  const WO=state.workOutfit||prisonOut(), sk=WO?(far?appearanceState.R_PANTF:appearanceState.R_PANT):(far?appearanceState.R_SKINF:appearanceState.R_SKIN), tr=WO?sk:(far?appearanceState.R_TRUNKF:appearanceState.R_TRUNK), tm=WO?sk:(far?appearanceState.R_TTF:appearanceState.R_TT), bt=far?appearanceState.R_BOOTF:appearanceState.R_BOOT, bs=far?appearanceState.R_BTRF:appearanceState.R_BTR;
  const bh=appearanceState.btStyle==='high'?0.55:(appearanceState.btStyle==='low'?0.22:0.4);           // boot shaft height along the shin
  const bx=Math.round(ax+(kx-ax)*bh), by=Math.round(ay+(ky-ay)*bh);
  const sdx=ax-kx, sdy=ay-ky, sl=Math.sqrt(sdx*sdx+sdy*sdy)||1, ux=sdx/sl, uy=sdy/sl;
  const cfx=Math.round(kx+ux*sl*0.32-uy*0.9), cfy=Math.round(ky+uy*sl*0.32+ux*0.9);   // calf sits behind the shin
  for(let p=0;p<2;p++){
    taper(kx,ky,2.1,ax,ay,1.4,p,sk,0,-9,-9,0);
    disc(cfx,cfy,1.9,p,sk);
    taper(hx,hy,3.5,kx,ky,2.2,p,sk,tr,0.7,0.8,tm,0.6);   // long, baggy trunk legs down the thighs
    taper(bx,by,2.0,ax,ay,1.9,p,bt,0,-9,-9,0);
    taper(hex,hey,1.5,tx,ty,1.4,p,bt,0,-9,-9,0);
  }
  // sole: bottom row of the foot in the boot trim colour
  const sy0=Math.max(hey,ty)+1;
  for(let x=Math.min(hex,tx)-1;x<=Math.max(hex,tx)+1;x++){ const i=sy0*appearanceState.W+x; if(sy0<appearanceState.H&&x>=0&&x<appearanceState.W&&rampIndex(rendererState.fb[i],bt)>=0) rendererState.fb[i]=appearanceState.PAL[bs*3+1]; }
  if(appearanceState.btStyle==='stripe'||appearanceState.btStyle==='high') line(bx,by+1,ax,ay-1,appearanceState.PAL[bs*3+(far?1:2)],appearanceState.PAL[bs*3+(far?1:2)]);   // side stripe / high-top trim
  pset(bx+1,by+1,appearanceState.PAL[bt*3]); // lace
} function hLayer(L,skinOnly){
  if(!L) return;
  const rows=L.r;
  for(let j=0;j<rows.length;j++){
    const row=rows[j], y=L.oy+j+state.HO; if(y<0||y>=state.HG) continue;
    for(let i=0;i<row.length;i++){
      const ch=row.charCodeAt(i); if(ch===46) continue;
      const x=L.ox+i+state.HO; if(x<0||x>=state.HG) continue;
      const k=y*state.HG+x;
      if(skinOnly&&!(state.hgrid[k]>=48&&state.hgrid[k]<=53)) continue;   // e.g. the ear only shows where the skull is bare
      state.hgrid[k]=ch===95?0:ch;
    }
  }
} function drawHead(neck=true){
  const hx=Math.round(state.headX), hy=Math.round(state.headY), st=appearanceState.lk.style;
  const HS=i=>appearanceState.PAL[appearanceState.R_HAIR*3+i];
  if(neck) for(let p=0;p<2;p++) taper(state.sx+1,state.sy+1,2.6,hx-1,hy+2,2.2,p,appearanceState.R_SKIN,0,-9,-9,0);   // neck
  state.hgrid.fill(0);
  const S=state.HEAD_STYLE[st]||state.HEAD_STYLE.short;
  hLayer(S.b); hLayer(state.HEAD_BASE); hLayer(S.f);
  hLayer(state.HEAD_FEAT.ear,true);
  if(appearanceState.lk.facial!=='none') hLayer(state.HEAD_FEAT['facial_'+appearanceState.lk.facial]);
  hLayer(state.HEAD_FEAT['eyes_'+appearanceState.lk.eyes]||state.HEAD_FEAT.eyes_normal);
  hLayer(state.HEAD_FEAT['brows_'+appearanceState.lk.brows]||state.HEAD_FEAT.brows_normal);
  if(appearanceState.lk.nose!=='straight') hLayer(state.HEAD_FEAT['nose_'+appearanceState.lk.nose]);
  if(appearanceState.lk.extra!=='none') hLayer(state.HEAD_FEAT['extra_'+appearanceState.lk.extra]);
  for(let y=0;y<state.HG;y++) for(let x=0;x<state.HG;x++){
    const ch=state.hgrid[y*state.HG+x]; if(!ch) continue;
    const X=hx+(x-state.HO), Y=hy+y-state.HO; if(X<0||Y<0||X>=appearanceState.W||Y>=appearanceState.H) continue;
    const i=Y*appearanceState.W+X; let c;
    if(ch>=48&&ch<=53) c=skinTone(ch-48,false);
    else switch(ch){
      case 79: c=isSkinPx(rendererState.fb[i])?skinTone(1,false):appearanceState.C_OUT; break;   // O: over the neck / body it's a soft skin shadow
      case 75: case 69: c=appearanceState.C_OUT; break;                               // K, E
      case 97: c=HS(0); break; case 98: c=HS(1); break; case 99: c=HS(2); break;   // a b c
      case 87: c=appearanceState.PAL[4*3+1]; break; case 119: c=appearanceState.PAL[4*3+2]; break;  // W w
      case 114: c=appearanceState.C_RED; break;                                       // r
      case 113: c=0xff2a2e9a; break;                                                     // q: a fresh cut, dark blood red (#9a2e2a)
      case 84: c=appearanceState.PAL[appearanceState.R_TT*3+1]; break;                                // T
      default: continue;
    }
    rendererState.fb[i]=c;
  }
  if(sparringState.faceDmg>0.2) drawBruises(hx,hy);
  if(state.workOutfit) drawCap(hx,hy);
} // sparring damage builds up on the face: mouse under the eye -> swollen eye -> cut brow -> nosebleed -> split lip
function drawBruises(hx,hy){
  const d=sparringState.faceDmg;
  pset(hx+2,hy,sparringState.C_BRUISE);
  if(d>0.4){ pset(hx+3,hy,sparringState.C_BRUISE); pset(hx+2,hy-1,sparringState.C_BRUISE2); pset(hx+1,hy,sparringState.C_BRUISE2); }
  if(d>0.55){ pset(hx+3,hy-2,sparringState.C_BLOOD2); pset(hx+3,hy-3,sparringState.C_BLOOD); pset(hx+2,hy-3,sparringState.C_BLOOD2); }
  if(d>0.7){ pset(hx+5,hy+1,sparringState.C_BLOOD2); pset(hx+4,hy+2,sparringState.C_BLOOD); }
  if(d>0.85){ pset(hx+1,hy+1,sparringState.C_BRUISE); pset(hx+2,hy+2,sparringState.C_BRUISE2); pset(hx+3,hy+3,sparringState.C_BLOOD); }
}

export function updateShorts(){
  const hxf=state.gstate==='pushup'?pushupsState.puHipX:appearanceState.BASE_X+animationState.posX+animationState.cur[animationState.GX]+animationState.cur[animationState.BX], hyf=state.gstate==='pushup'?pushupsState.puHipY:appearanceState.HIP_Y0+animationState.cur[animationState.BY]+animationState.cur[animationState.GY];
  let vx=hxf-state.prevHX, vy=hyf-state.prevHY; state.prevHX=hxf; state.prevHY=hyf;
  if(vx>3||vx<-3)vx=0; if(vy>3||vy<-3)vy=0;
  state.trVX+=(-vx*2.4-state.trX)*0.3-state.trVX*0.26; state.trX+=state.trVX;
  state.trVY+=(-vy*1.8-state.trY)*0.3-state.trVY*0.26; state.trY+=state.trVY;
  if(state.trX>2.5)state.trX=2.5; else if(state.trX<-2.5)state.trX=-2.5; if(state.trY>2)state.trY=2; else if(state.trY<-2)state.trY=-2;
} function trunkPattern(hmx,hmy){
  if(appearanceState.trStyle!=='dots'&&appearanceState.trStyle!=='check'&&appearanceState.trStyle!=='flames') return;
  const y0=Math.max(0,state.hipY-4), y1=Math.min(appearanceState.H-1,hmy+5), x0=Math.max(0,state.hipX-9), x1=Math.min(appearanceState.W-1,state.hipX+10);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const i=y*appearanceState.W+x, c=rendererState.fb[i];
    let far=false, k=rampIndex(c,appearanceState.R_TRUNK); if(k<0){ k=rampIndex(c,appearanceState.R_TRUNKF); far=true; } if(k<0) continue;
    const rx=x-hmx+16, ry=y-state.hipY+16;
    let on=false;
    if(appearanceState.trStyle==='dots') on=((rx&3)===0&&(ry&3)===0)||((rx&3)===2&&(ry&3)===2);
    else if(appearanceState.trStyle==='check') on=(((rx>>1)+(ry>>1))&1)===1;
    else { const fh=state.FLAME[rx&7]; on=(hmy+4-y)<fh; if(on&&(hmy+4-y)===fh-1) k=2; }
    if(on) rendererState.fb[i]=appearanceState.PAL[(far?appearanceState.R_TAF:appearanceState.R_TA)*3+k];
  }
}

export function torsoEdge(y,front){   // torso silhouette x at row y (front or back edge)
  const y0=state.hipY+1, y1=state.sy+2; let t=(y-y0)/(y1-y0); if(t<0)t=0; else if(t>1)t=1;
  const ax=state.torsoX+(state.sx-state.torsoX)*t, r=3.9+2.2*t+0.35*4*t*(1-t);
  return Math.round(front?ax+r:ax-r);
}

function skinTone(k,far){
  const a=(far?appearanceState.R_SKINF:appearanceState.R_SKIN)*3, x=(far?appearanceState.R_SKXF:appearanceState.R_SKX)*3;
  return k<=0?appearanceState.PAL[x]:(k===1?appearanceState.PAL[a]:(k===2?appearanceState.PAL[x+1]:(k===3?appearanceState.PAL[a+1]:(k===4?appearanceState.PAL[x+2]:appearanceState.PAL[a+2]))));
}

/** Shade the biceps and forearm in joint-local coordinates, keeping the existing skin silhouette.
 * @param {number} sx @param {number} sy @param {number} ex @param {number} ey
 * @param {number} gx @param {number} gy @param {boolean} far */
function drawArmMuscles(sx,sy,ex,ey,gx,gy,far){
  const cap=far?2.8:3.4;
  for(let y=Math.max(0,Math.ceil(sy-cap));y<=Math.min(appearanceState.H-1,Math.floor(sy+cap));y++)for(let x=Math.max(0,Math.ceil(sx-cap));x<=Math.min(appearanceState.W-1,Math.floor(sx+cap));x++){
    const nx=(x-sx)/cap,ny=(y-sy)/cap,z2=1-nx*nx-ny*ny,i=y*appearanceState.W+x;
    if(z2<=0.12||!isSkinPx(rendererState.fb[i]))continue;
    const light=nx*rendererState.LX+ny*rendererState.LY+0.55*Math.sqrt(z2);
    rendererState.fb[i]=skinTone(Math.max(0,Math.min(5,Math.round(2.6+2*light))),far);
  }
  const segments=[[sx,sy,ex,ey,2.8,2,0.8],[ex,ey,gx,gy,2.2,1.6,0.35]];
  for(let part=0;part<segments.length;part++){
    const [ax,ay,bx,by,r0,r1,bulge]=segments[part],dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy);
    if(len<1)continue;
    const ux=dx/len,uy=dy/len,nx=-uy,ny=ux,light=nx*rendererState.LX+ny*rendererState.LY;
    const x0=Math.max(0,Math.floor(Math.min(ax,bx)-4)),x1=Math.min(appearanceState.W-1,Math.ceil(Math.max(ax,bx)+4));
    const y0=Math.max(0,Math.floor(Math.min(ay,by)-4)),y1=Math.min(appearanceState.H-1,Math.ceil(Math.max(ay,by)+4));
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
      const t=((x-ax)*ux+(y-ay)*uy)/len;
      if(t<0.08||t>0.95)continue;
      const r=r0+(r1-r0)*t+bulge*4*t*(1-t),across=((x-ax)*nx+(y-ay)*ny)/r;
      const i=y*appearanceState.W+x;
      if(Math.abs(across)>0.93||!isSkinPx(rendererState.fb[i]))continue;
      /* Rounded muscle light, a recessed elbow and a narrow forearm tendon instead of flat bands. */
      let value=2.7+across*light*2+0.8*Math.sqrt(1-across*across);
      if(part===0){ value+=0.6*Math.sin(Math.PI*t); if(t>0.76)value-=1.2; }
      else { if(t<0.2)value-=0.7; if(t>0.25&&Math.abs(across-0.2)<0.18)value+=0.6; }
      rendererState.fb[i]=skinTone(Math.max(0,Math.min(5,Math.round(value))),far);
    }
  }
  const dx=ex-sx,dy=ey-sy,len=Math.hypot(dx,dy)||1;
  const x=Math.round(sx+dx*0.28+dy/len*1.5),y=Math.round(sy+dy*0.28-dx/len*1.5);
  if(x>=0&&x<appearanceState.W&&y>=0&&y<appearanceState.H&&isSkinPx(rendererState.fb[y*appearanceState.W+x]))pset(x,y,skinTone(1,far));
}

/** Sparse hair clusters follow the chest's changing edges; skin clipping preserves its silhouette. */
function drawChestHair(){
  const rows=['h..h.h','.hh.h.','h.hhh.','.hh.h.','..h.h.','...h..'], color=appearanceState.PAL[appearanceState.R_HAIR*3+1];
  for(let j=0;j<rows.length;j++){
    const y=state.sy+4+j; if(y>=state.hipY-3)break;
    const left=torsoEdge(y,false)+2, right=torsoEdge(y,true)-2;
    for(let k=0;k<rows[j].length;k++)if(rows[j][k]==='h'){
      const x=Math.round(left+(right-left)*k/5);
      if(x>=0&&x<appearanceState.W&&y>=0&&y<appearanceState.H&&isSkinPx(rendererState.fb[y*appearanceState.W+x]))pset(x,y,color);
    }
  }
}

export function drawBoxer(){
  const PU=state.gstate==='pushup', PO=prisonOut(), BARE=bareTorsoOut(), SHIRT=PO&&!BARE, WO=state.workOutfit||PO, TW=towelOut(), GLV=!(PU||WO||TW);   // TW: the bath — a towel, bare fists
  if(GLV) trailRecord();
  if(PU) shadowEll(Math.round((state.lax+pushupsState.PU_HANDX)*0.5),appearanceState.FLOOR_Y,15,1);
  else if(state.gstate!=='spar') shadowEll(state.hipX,appearanceState.FLOOR_Y,Math.round(animationState.cur[animationState.ST]*0.5+6+animationState.cur[animationState.GY]*0.8),1);   // (spar: shadows go on the floor buffer)
  const SS=appearanceState.PAL[appearanceState.R_SKIN*3], SH=appearanceState.PAL[appearanceState.R_SKIN*3+2];
  // In the crank side view the far arm is occluded by the torso and the near arm.
  if(state.gstate!=='crank'){
  // far (lead) arm
  for(let p=0;p<2;p++){ taper(state.lsx,state.lsy,2.8,state.lex,state.ley,1.9,p,appearanceState.R_SKINF,0,-9,-9,0,0.6); taper(state.lex,state.ley,2.1,state.lgx,state.lgy,1.5,p,appearanceState.R_SKINF,0,-9,-9,0,0.3); }
  if(BARE) drawArmMuscles(state.lsx,state.lsy,state.lex,state.ley,state.lgx,state.lgy,true);
  if(state.workOutfit) for(let p=0;p<2;p++) taper(state.lsx,state.lsy,2.7,Math.round(state.lsx+(state.lex-state.lsx)*0.45),Math.round(state.lsy+(state.ley-state.lsy)*0.45),2.2,p,appearanceState.R_SHIRTF,0,-9,-9,0);   // short sleeve
  if(SHIRT){ const cx=Math.round(state.lex+(state.lgx-state.lex)*0.72), cy=Math.round(state.ley+(state.lgy-state.ley)*0.72);   // drelich: long sleeve down to the wrist
    for(let p=0;p<2;p++){ taper(state.lsx,state.lsy,3.0,state.lex,state.ley,2.3,p,appearanceState.R_SHIRTF,0,-9,-9,0); taper(state.lex,state.ley,2.3,cx,cy,1.9,p,appearanceState.R_SHIRTF,0,-9,-9,0); } }
  if(PU||WO||TW) drawHand(state.lgx,state.lgy,state.lex,state.ley,true); else drawGlove(state.lgx,state.lgy,state.lgr,state.lex,state.ley,true,state.flashL>0);
  }
  if(!BARE){
    drawLeg(state.lhx,state.lhy,state.lkx,state.lky,state.lax,state.lay,state.lhex,state.lhey,state.ltx,state.lty,true);
    drawLeg(state.rhx,state.rhy,state.rkx,state.rky,state.rax,state.ray,state.rhex,state.rhey,state.rtx,state.rty,false);
  }
  // V-shaped torso: narrow waist, lat flare, broad chest
  // plank: a flatter chest (seen from the side the ribcage is shallower than the standing V-taper suggests)
  const TSK=(state.workOutfit||SHIRT)?appearanceState.R_SHIRT:appearanceState.R_SKIN, TTR=WO?appearanceState.R_PANT:appearanceState.R_TRUNK, TTT=WO?appearanceState.R_PANT:appearanceState.R_TT;
  for(let p=0;p<2;p++){
    if(BARE) taper(state.torsoX,state.hipY-3,3.5,state.sx,state.sy+2,6.1,p,TSK,0,-9,-9,0,0.35);
    else taper(state.torsoX,state.hipY+1,PU?3.3:3.9,state.sx,state.sy+2,(PU||state.gstate==='crank')?4.6:6.1,p,TSK,TTR,0.28,0.38,TTT,PU?0:0.35);
  }
  if(BARE){
    // Lead arm and lead leg share the far side; the rear leg overlaps at the hip.
    drawLeg(state.lhx,state.lhy,state.lkx,state.lky,state.lax,state.lay,state.lhex,state.lhey,state.ltx,state.lty,true);
    drawLeg(state.rhx,state.rhy,state.rkx,state.rky,state.rax,state.ray,state.rhex,state.rhey,state.rtx,state.rty,false);
  }
  // muscle definition (front of the torso faces the opponent)
  if(!PU&&!sparringState.lyingDraw&&(!WO||BARE)){
  const fp=torsoEdge(state.sy+5,true);
  pset(fp-1,state.sy+3,SH); pset(fp-2,state.sy+3,SH);                                   // pec highlight
  pset(fp-1,state.sy+5,SS); pset(fp-2,state.sy+5,SS); pset(fp-3,state.sy+6,SS);               // under-pec line
  for(let ya=state.sy+7;ya<state.hipY-3;ya+=2){ const fa=torsoEdge(ya,true); pset(fa-1,ya,SS); pset(fa-3,ya,SS); pset(fa-2,ya+1,SH); }   // abs
  { const fs=torsoEdge(state.sy+7,true); pset(fs-5,state.sy+7,SS); pset(fs-4,state.sy+8,SS); }   // serratus
  { const bk=torsoEdge(state.sy+4,false); pset(bk+1,state.sy+3,SH); pset(bk+1,state.sy+4,SH); }  // lat rim light
  }
  if(BARE) drawChestHair();
  // loose trunks over the hips (hem swings with momentum), side seam stripe, waistband
  // shDirX/Y = direction from the hips towards the knees ((0,1) standing, along the body in a plank)
  if(state.workOutfit){ drawApron(); redrawLeadLeg(); }
  else if(PO){ if(PU){} else { if(!BARE&&!sparringState.lyingDraw){ const x0=torsoEdge(state.hipY-2,false)+1, x1=torsoEdge(state.hipY-2,true)-1; for(let x=x0;x<=x1;x++) pset(x,state.hipY-2,appearanceState.PAL[appearanceState.R_PANT*3+2]); }   // drelich: shirt over the trousers, waistband seam
    if(SHIRT){ const bx=torsoEdge(state.sy+8,true)-2; for(let y=state.sy+4;y<state.hipY-3;y+=3) pset(bx,y,appearanceState.PAL[appearanceState.R_SHIRT*3]); } } }                              // button placket
  else {
  const hmx=state.hipX+Math.round(state.shDirX*3.5+state.trX), hmy=state.hipY+Math.round(state.shDirY*3.5+state.trY);
  const sr0=PU?3.4:4.0, sr1=PU?3.9:4.3;
  for(let p=0;p<2;p++) taper(state.torsoX,state.hipY,sr0,hmx,hmy,sr1,p,appearanceState.R_TRUNK,0,-9,-9,0);
  for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){ const d=Math.sqrt(dx*dx+dy*dy); if(d>sr1-1.1&&d<=sr1&&dx*state.shDirX+dy*state.shDirY>=1.8) pset(hmx+dx,hmy+dy,appearanceState.PAL[appearanceState.R_TT*3+(dx>0?2:1)]); }   // hem
  trunkPattern(hmx,hmy);
  if(appearanceState.trStyle==='stripe'||appearanceState.trStyle==='panel'){   // side seam stripe (panel = 3 px wide)
    const sx1=hmx+Math.round(state.trX*0.5), sc=appearanceState.PAL[appearanceState.R_TA*3+1];
    const ex1=sx1+Math.round(state.shDirX*3)-Math.round(state.trX*0.5*Math.abs(state.shDirX)), ey1=hmy+Math.round(state.shDirY*3);
    line(state.torsoX,state.hipY-1,ex1,ey1,sc,sc);
    if(appearanceState.trStyle==='panel'){ line(state.torsoX-1,state.hipY-1,ex1-1,ey1,appearanceState.PAL[appearanceState.R_TA*3],appearanceState.PAL[appearanceState.R_TA*3]); line(state.torsoX+1,state.hipY-1,ex1+1,ey1,appearanceState.PAL[appearanceState.R_TA*3+2],appearanceState.PAL[appearanceState.R_TA*3+2]); }
  }
  if(!PU&&!sparringState.lyingDraw&&(state.trX>0.8||state.trX<-0.8)){ const fx=state.trX>0?-1:1; pset(hmx+fx*2,hmy,appearanceState.PAL[appearanceState.R_TRUNK*3]); pset(hmx+fx*3,hmy-1,appearanceState.PAL[appearanceState.R_TRUNK*3]); }   // fabric fold
  if(!PU&&!sparringState.lyingDraw) for(let yb=state.hipY-3;yb<=state.hipY-2;yb++){ const x0=torsoEdge(yb,false)+1, x1=torsoEdge(yb,true)-1; for(let x=x0;x<=x1;x++) pset(x,yb,appearanceState.PAL[appearanceState.R_TT*3+(yb===state.hipY-3?2:1)]); }
  }
  if(state.workMidHook) state.workMidHook();
  rendererState.softOutline=true; drawHead(); rendererState.softOutline=false;
  // near (rear) arm: deltoid cap, biceps belly, forearm thicker at the elbow
  rendererState.softOutline=true;
  for(let p=0;p<2;p++){ disc(state.rsx,state.rsy,PU?2.7:3.4,p,appearanceState.R_SKIN); taper(state.rsx,state.rsy,2.8,state.rex,state.rey,2.0,p,appearanceState.R_SKIN,0,-9,-9,0,0.8); taper(state.rex,state.rey,2.2,state.rgx,state.rgy,1.6,p,appearanceState.R_SKIN,0,-9,-9,0,0.35); }
  rendererState.softOutline=false;
  if(BARE) drawArmMuscles(state.rsx,state.rsy,state.rex,state.rey,state.rgx,state.rgy,false);
  if(state.workOutfit) for(let p=0;p<2;p++) taper(state.rsx,state.rsy,3.0,Math.round(state.rsx+(state.rex-state.rsx)*0.45),Math.round(state.rsy+(state.rey-state.rsy)*0.45),2.5,p,appearanceState.R_SHIRT,0,-9,-9,0);   // short sleeve
  if(SHIRT){ const cx=Math.round(state.rex+(state.rgx-state.rex)*0.72), cy=Math.round(state.rey+(state.rgy-state.rey)*0.72);   // long drelich sleeve
    for(let p=0;p<2;p++){ disc(state.rsx,state.rsy,3.5,p,appearanceState.R_SHIRT); taper(state.rsx,state.rsy,3.1,state.rex,state.rey,2.5,p,appearanceState.R_SHIRT,0,-9,-9,0); taper(state.rex,state.rey,2.5,cx,cy,2.0,p,appearanceState.R_SHIRT,0,-9,-9,0); } }
  if(!SHIRT){ let dx=state.rex-state.rsx, dy=state.rey-state.rsy; const d=Math.sqrt(dx*dx+dy*dy)||1; dx/=d; dy/=d;
    pset(Math.round(state.rsx+dx*3.2+dy*1.5),Math.round(state.rsy+dy*3.2-dx*1.5),SS);   // deltoid/biceps split
    pset(state.rsx,state.rsy-2,SH); }
  if(PU||WO||TW) drawHand(state.rgx,state.rgy,state.rex,state.rey,false); else drawGlove(state.rgx,state.rgy,state.rgr,state.rex,state.rey,false,state.flashR>0);
  if(GLV&&drawTrails()) drawGlove(state.rgx,state.rgy,state.rgr,state.rex,state.rey,false,state.flashR>0);   // smear over the body, glove crisp on top
}

// Cheap integer hash for procedural textures and deterministic scene details.
export function h2(a,b){ let h=Math.imul(a,374761393)+Math.imul(b,668265263)|0; h=Math.imul(h^(h>>>13),1274126177); return (h>>>24)&255; }

export function spawn(type,x,y,vx,vy,life,col){
  if(sparringState.mirrorCtx){ x=appearanceState.W-1-x; vx=type===state.P_SMEAR?appearanceState.W-1-vx:-vx; }   // sparring: the opponent is simulated in a mirrored frame
  for(let n=0;n<state.MAXP;n++){
    const i=(state.pCur+n)%state.MAXP;
    if(state.pL[i]<=0){state.pT[i]=type;state.pX[i]=x;state.pY[i]=y;state.pVX[i]=vx;state.pVY[i]=vy;state.pL[i]=life;state.pM[i]=life;state.pC[i]=col;state.pCur=(i+1)%state.MAXP;return;}
  }
}

/** Clear particles when starting a fresh fight so old drops cannot stain new clothes. */
export function clearParticles(){ state.pL.fill(0); }

export function updateParticles(){
  for(let i=0;i<state.MAXP;i++){
    if(state.pL[i]<=0)continue;
    state.pL[i]--;
    const t=state.pT[i];
    if(t===state.P_SWEAT||t===state.P_BIT){
      const x0=state.pX[i],y0=state.pY[i],blood=t===state.P_BIT&&(state.pC[i]===sparringState.C_BLOOD||state.pC[i]===sparringState.C_BLOOD2);
      state.pVY[i]+=0.09;state.pX[i]+=state.pVX[i];state.pY[i]+=state.pVY[i];
      if(blood&&catchBloodOnClothes(x0,y0,state.pX[i],state.pY[i],state.pC[i])){state.pL[i]=0;continue;}
      if(state.pY[i]>=appearanceState.FLOOR_Y-(t===state.P_BIT&&state.gstate==='work'?(i%5):0)){
        if(blood){if(state.gstate==='spar')stain(state.pX[i]);else if(state.gstate==='work')wkStain(state.pX[i],state.pY[i]);}
        state.pL[i]=0;
      }
    }
    else if(t===state.P_SPARK){state.pVX[i]*=0.86;state.pVY[i]=state.pVY[i]*0.86+0.04;state.pX[i]+=state.pVX[i];state.pY[i]+=state.pVY[i];}
    else if(t===state.P_DUST){state.pX[i]+=state.pVX[i];state.pY[i]+=state.pVY[i];state.pVX[i]*=0.92;state.pVY[i]*=0.95;}
  }
} function drawBurst(x,y,s,v){
  const A=v?[[1,-1],[1,1],[-1,1],[-1,-1]]:[[1,0],[0,1],[-1,0],[0,-1]], B=v?[[1,0],[0,1],[-1,0],[0,-1]]:[[1,1],[-1,1],[1,-1],[-1,-1]], d=v?0.78:1;
  for(let n=0;n<4;n++){ const dx=A[n][0], dy=A[n][1], L=Math.round(s*d*state.BURST_LEN[n]);
    for(let k=0;k<=L;k++){ pset(x+dx*k,y+dy*k,appearanceState.C_WHITE); if(k<L*0.45){ pset(x+dx*k+dy,y+dy*k-dx,appearanceState.C_WHITE); pset(x+dx*k-dy,y+dy*k+dx,appearanceState.C_WHITE); } } }
  for(let n=0;n<4;n++){ const dx=B[n][0], dy=B[n][1], L=Math.round(s*0.45*state.BURST_LEN[(n+2)&3]); for(let k=1;k<=L;k++) pset(x+dx*k,y+dy*k,state.C_TRL); }
  for(let yy=-2;yy<=2;yy++) for(let xx=-2;xx<=2;xx++) if(xx*xx+yy*yy<=(s>4?5:2)) pset(x+xx,y+yy,appearanceState.C_WHITE);
}

export function drawParticles(smearPass){
  for(let i=0;i<state.MAXP;i++){
    if(state.pL[i]<=0)continue;
    const t=state.pT[i]; if((t===state.P_SMEAR)!==smearPass)continue;
    const x=Math.round(state.pX[i]), y=Math.round(state.pY[i]), age=state.pM[i]-state.pL[i];
    if(t===state.P_BIT){pset(x,y,state.pC[i]);}
    else if(t===state.P_SWEAT){pset(x,y,appearanceState.C_SWEAT); if(age<6)pset(Math.round(state.pX[i]-state.pVX[i]),Math.round(state.pY[i]-state.pVY[i]),appearanceState.C_WHITE);}
    else if(t===state.P_SPARK){line(x,y,Math.round(state.pX[i]-state.pVX[i]*2),Math.round(state.pY[i]-state.pVY[i]*2),age<3?appearanceState.C_WHITE:state.pC[i],age<3?appearanceState.C_WHITE:state.pC[i]);}
    else if(t===state.P_DUST){ if(state.pL[i]>4||((x+y)&1)) pset(x,y,state.pC[i]); }
    else if(t===state.P_STAR){
      const r=age<2?4:(age<4?3:2), core=age<2;
      for(let k=1;k<=r;k++){pset(x-k,y,appearanceState.C_SPARK);pset(x+k,y,appearanceState.C_SPARK);pset(x,y-k,appearanceState.C_SPARK);pset(x,y+k,appearanceState.C_SPARK);}
      for(let k=1;k<r-1;k++){pset(x-k,y-k,appearanceState.C_WHITE);pset(x+k,y-k,appearanceState.C_WHITE);pset(x-k,y+k,appearanceState.C_WHITE);pset(x+k,y+k,appearanceState.C_WHITE);}
      pset(x,y,appearanceState.C_WHITE); if(core){pset(x+1,y,appearanceState.C_WHITE);pset(x-1,y,appearanceState.C_WHITE);pset(x,y+1,appearanceState.C_WHITE);pset(x,y-1,appearanceState.C_WHITE);}
    }
    else if(t===state.P_BURST){ const L=state.pM[i], k=age/L, sz=age<2?8:Math.max(2,8-(age-1)*7/(L-1)); drawBurst(x,y,sz,state.pC[i]&1); }
    else if(t===state.P_RING){ const r=1.8+age*0.85, c=age<3?appearanceState.C_WHITE:state.C_TRL; for(let a=0;a<6.2832;a+=0.9/r){ const px=Math.round(x+Math.cos(a)*r), py=Math.round(y+Math.sin(a)*r); if(age<5||((px+py)&1)) pset(px,py,c); } }
    else if(t===state.P_SMEAR){
      const x1=Math.round(state.pVX[i]), y1=Math.round(state.pVY[i]), c=age<2?appearanceState.C_WHITE:appearanceState.C_GRAY;
      line(x,y,x1,y1,c,c);
      const mx=Math.round((x+x1)*0.5), my=Math.round((y+y1)*0.5);
      if(Math.abs(y1-y)>Math.abs(x1-x)){ line(x-2,my,x1-2,y1,c,c); line(x+2,my,x1+2,y1,c,c); }   // vertical arc (uppercut): offset sideways
      else { line(mx,y-2,x1,y1-2,c,c); line(mx,y+2,x1,y1+2,c,c); }
    }
  }
}

export function pushTempo(at,ms){ if(state.tqLen>=state.TQ_N)return; const k=(state.tqHead+state.tqLen)%state.TQ_N; state.tqAt[k]=at; state.tqMs[k]=ms; state.tqLen++; }

/** Switch the running game mode (hub, spar, an exercise…). @param {string} g */
export function setGstate(g){ state.gstate=g; }

/** Shake the whole picture: amplitude in native pixels, duration in ticks, axis 0 horizontal / 1 vertical.
 * A weaker shake never cuts a stronger one short. @param {number} amp @param {number} dur @param {number} axis */
export function shake(amp,dur,axis){ if(state.shakeT>0&&state.shakeAmp>amp) return; state.shakeAmp=amp; state.shakeAxis=axis; state.shakeT=state.shakeDur=dur; }

export function resetClock(ms,now){ state.beatMs=ms; state.lastBeatMs=now; state.nextBeatMs=now+ms; state.tqLen=0; state.tqHead=0; }

export function setFlow(on){
  if(on===state.flow)return;
  state.flow=on; if(on)state.lastHitTick=state.tick;
  if(state.state===animationState.IDLE){animationState.lastPose.set(animationState.cur);state.idleT=0;}   // blend into / out of the footwork
  if(on){spawnSweat(5);for(let j=0;j<6;j++)spawn(state.P_DUST,state.hipX-6+j*2.5,appearanceState.FLOOR_Y-1,(Math.random()-0.5)*1.2,-0.2-Math.random()*0.3,16,appearanceState.C_DUST);sfxFlow();}
  document.body.classList.toggle('flow',on);
  setInfo();
}

export function predictApex(m){
  const save=state.moveStep; state.moveStep=0; samplePose(m,m.times[m.apex],state.tmpPose); state.moveStep=save;
  const P=state.tmpPose, bx=appearanceState.BASE_X+animationState.posX+P[animationState.GX], L=m.glove===0, rot=P[animationState.ROT];
  const sxA=Math.round(bx+P[animationState.BX]+P[animationState.LEAN]), syA=Math.round(appearanceState.HIP_Y0+P[animationState.BY]+P[animationState.GY]-appearanceState.TORSO-P[animationState.SQ]);
  const sh=L?sxA+Math.round(1-2.5*rot):sxA+Math.round(-1+2.5*rot);
  let rx=Math.round(L?P[animationState.LGX]:P[animationState.RGX]), ry=Math.round(L?P[animationState.LGY]:P[animationState.RGY]);
  const d=Math.sqrt(rx*rx+ry*ry), mx=appearanceState.UPPER+appearanceState.FORE-0.01; if(d>mx){rx*=mx/d;ry*=mx/d;}
  state.predTip=sh+rx+(L?3.5+P[animationState.LGS]:4+P[animationState.RGS]); state.predY=syA+1+ry;
}

export function commitWalk(){   // bake the travelled distance into posX so poses stay relative
  const d=animationState.cur[animationState.GX]; animationState.posX+=d; animationState.cur[animationState.GX]-=d;   // feet are body-relative, so only the origin moves
  if(state.gstate==='spar'){ animationState.posX=sparClamp(animationState.posX); return; }
  if(state.gstate==='work') return;
  if(animationState.posX<animationState.POS_MIN)animationState.posX=animationState.POS_MIN; else if(animationState.posX>animationState.POS_MAX)animationState.posX=animationState.POS_MAX;
}

export function startMove(id,t0){
  t0=t0||0;
  if(state.state>=0&&animationState.MOVES[state.state].walk) commitWalk();
  animationState.fromPose.set(animationState.cur); state.state=id; state.stateT=t0||0; state.frameIdx=-1; state.fired=0; state.curGrade=state.bufferedGrade; state.buffered=-1;
  const m=animationState.MOVES[id];
  for(let k=1;k<m.n;k++) if(m.times[k]<=state.stateT) state.fired|=1<<k;   // skipped wind-up keys don't fire events
  if(state.gstate==='spar'){ if(m.glove>=0){ sparringState.aimLow=sparringState.nextLow; sparringState.nextLow=0; } else sparringState.aimLow=0; }
  // Punches are thrown from the spot; walking controls the distance.
  state.moveStep=(m.glove<0&&state.flow)?m.fstep:0;
  if(m.glove===0){state.pgx=state.lgx;state.pgy=state.lgy;} else if(m.glove===1){state.pgx=state.rgx;state.pgy=state.rgy;}
  state.phx=state.headX; state.phy=state.headY;
  if(state.gstate==='spar'&&isDash(id)){ sparDashCost(sparringState.ctxF,id); sfxWhoosh(0.35); }
  if(state.gstate==='spar'&&(id===animationState.M_SLIPL||id===animationState.M_SLIPR||id===animationState.M_DODGE)) sparEvadeCost(sparringState.ctxF,id);
  if(state.gstate==='spar'&&id===animationState.S_BLOCK&&t0===0) sparRaiseGuard(sparringState.ctxF);   // raising the guard isn't free either
  if(m.walk) return;
  if(state.gstate==='spar'&&m.glove>=0) sparOnAttack(id);
  if(m.glove>=0) sfxWhoosh((0.5+m.weight*0.5)*(state.flow?1.4:1)); else sfxWhoosh(0.3);
}

export function handleEvents(m,ev){
  for(let k=1;k<m.n;k++){
    if(!(ev&(1<<k)))continue;
    if(m.landMask&(1<<k)){ sfxLand(0.6); if(state.gstate==='spar'&&m.id>=animationState.S_KD&&m.id<=animationState.S_KO){ sfxLand(1.6); state.shakeAmp=2; state.shakeAxis=1; state.shakeT=state.shakeDur=10; } }
    if(m.headSmear&(1<<k)) spawn(state.P_SMEAR,state.phx,state.phy,state.headX,state.headY,5,0);
    if(m.dustMask&(1<<k)) for(let j=0;j<3;j++) spawn(state.P_DUST,(m.walk&&k===2?(m.walk>0?state.ltx:state.rhex):state.rtx)-2+j*2,appearanceState.FLOOR_Y-1,(Math.random()-0.5)*0.8,-0.15-Math.random()*0.25,14,appearanceState.C_DUST);
    if(m.sweatMask&(1<<k)) spawnSweat(4);
    if(k===m.apex) impact(m);
  }
}

export function spawnSweat(n){
  if(state.gstate==='spar'&&sparringState.ctxF) n=Math.round(n*(0.2+1.3*(1-staF(sparringState.ctxF))));   // sparring: sweat follows fatigue
  for(let j=0;j<n;j++) spawn(state.P_SWEAT,state.headX-2+Math.random()*3,state.headY-3+Math.random()*2,-0.4-Math.random()*0.9,-0.6-Math.random()*0.9,40,appearanceState.C_SWEAT);
} function impact(m){
  if(state.gstate==='spar'){ sparImpact(m); return; }
  if(state.gstate==='work'){ wkImpact(m); return; }
}

export function drawChar(code,x,y,c,sc){
  const g=state.FONT[code]; if(!g)return;
  for(let r=0;r<5;r++)for(let q=0;q<3;q++) if(g&(1<<(14-(r*3+q))))
    for(let a=0;a<sc;a++)for(let b=0;b<sc;b++) pset(x+q*sc+b,y+r*sc+a,c);
}

export function drawText(s,cx,y,c,sc){
  sc*=rendererState.uiK;   // the 2× room: letters keep their size on screen
  const n=s.length, w=(n*4-1)*sc, x0=cx-(w>>1);
  for(let k=0;k<n;k++){ const code=s.charCodeAt(k), x=x0+k*4*sc;
    drawChar(code,x-sc,y,appearanceState.C_OUT,sc); drawChar(code,x+sc,y,appearanceState.C_OUT,sc); drawChar(code,x,y-sc,appearanceState.C_OUT,sc); drawChar(code,x,y+sc,appearanceState.C_OUT,sc); }
  for(let k=0;k<n;k++) drawChar(s.charCodeAt(k),x0+k*4*sc,y,c,sc);
}

export function popup(t,x,y,c,sc,life){ const i=state.puCur; state.puCur=(state.puCur+1)%state.MAXPU; state.puT[i]=t; state.puX[i]=x; state.puY[i]=y; state.puL[i]=life; state.puM[i]=life; state.puC[i]=c; state.puS[i]=sc; }

export function updatePopups(){ for(let i=0;i<state.MAXPU;i++) if(state.puL[i]>0){ state.puL[i]--; if(state.puM[i]-state.puL[i]<8) state.puY[i]-=0.5; } }

export function drawPopups(){
  for(let i=0;i<state.MAXPU;i++){
    if(state.puL[i]<=0)continue;
    if(state.puL[i]<8&&(state.puL[i]&1))continue;           // blink out
    const K=rendererState.uiK, hw=((state.TXT[state.puT[i]].length*4-1)*state.puS[i]>>1)+state.puS[i]+1, px=Math.max(hw,Math.min(appearanceState.W/K-1-hw,Math.round(state.puX[i])));   // keep the whole word on screen
    drawText(state.TXT[state.puT[i]],px*K,Math.round(state.puY[i])*K,state.puC[i],state.puS[i]);   // popups live in native coordinates
  }
}

export function initialize(){


/* =====================================================================
   SKELETON / IK
   ===================================================================== */
state.IKx = 0;
state.IKy = 0;
state.IKtx = 0;
state.IKty = 0;

// joints (integers after solve)
state.hipX = 0;
state.hipY = 0;
state.sx = 0;
state.sy = 0;
state.lsx = 0;
state.lsy = 0;
state.rsx = 0;
state.rsy = 0;
state.lex = 0;
state.ley = 0;
state.rex = 0;
state.rey = 0;
state.lgx = 0;
state.lgy = 0;
state.rgx = 0;
state.rgy = 0;
state.lgr = 3.5;
state.rgr = 4;
state.headX = 0;
state.headY = 0;
state.lhx = 0;
state.lhy = 0;
state.rhx = 0;
state.rhy = 0;
state.lkx = 0;
state.lky = 0;
state.rkx = 0;
state.rky = 0;
state.lax = 0;
state.lay = 0;
state.rax = 0;
state.ray = 0;
state.lhex = 0;
state.lhey = 0;
state.ltx = 0;
state.lty = 0;
state.rhex = 0;
state.rhey = 0;
state.rtx = 0;
state.rty = 0;

state.lTipRaw = 0;
state.rTipRaw = 0;
state.lSurf = 999;
state.rSurf = 999;
state.torsoX = 0;
state.shDirX = 0;
state.shDirY = 1;


state.PENMAX = 4.5;

/* =====================================================================
   BOXER RENDER (groups: outline pass then fill pass -> clean inner seams)
   ===================================================================== */
state.flashL = 0;
state.flashR = 0;

/* PUNCH TRAILS (reference: cream crescent smears for hooks / uppercuts, comet streaks with a cold core
   for straights, a double chevron of recoil when a straight snaps back). The punching glove's recent
   positions are recorded while the move is fast (start -> just past the apex) and drawn as a spline
   with a thickness that grows towards the glove; it stops at the glove's edge so the glove stays crisp.
   One trail set per context (sparring swaps it per fighter). */
state.trailMain = {h:[[],[]]};
 state.trl = state.trailMain;

state.TS = [];

state.workOutfit = false;
state.workMidHook = null;

/*HEADART-BEGIN*/
// ASCII head art (profile, faces right; ox/oy = offset of the top-left char from the head joint). Edit the strings directly. chars: . skip · _ clear · O outline (deep skin over skin, else black) · K black
// 0-5 skin tones · a/b/c hair shadow/mid/light · E eye · W/w eye white / tape · r cut · T hair tie (trunk trim)
state.HEAD_BASE = {ox:-6,oy:-5,r:['....OOOO.....','...O3455O....','..O334555O...','.O23334555O..','.O23333234O..','.O123333345O.','..O1233331O..','...O123334O..','.....O122O...','......OOO....']};

state.HEAD_STYLE = {short:{b:null,f:{ox:-6,oy:-7,r:['..OOOOOOO.','.OObccccOO','OObbcccccO','ObbbbccccO','Obbbbbc..O','Oaaaba....','Oaaaa.....','OOaa......','.OO.......']}},buzz:{b:null,f:{ox:-4,oy:-4,r:['..aba5','.aaa5.','aaa3a.','aa3...','a2....']}},bald:{b:null,f:{ox:-1,oy:-4,r:['55','5.']}},afro:{b:null,f:{ox:-8,oy:-10,r:['...OOOOOOO...','..OOcccccOOO.','.OObcbcccccOO','OObbccccbcccO','ObabbccccccbO','ObbbbacbccccO','OaabbbbcccbcO','Oaaaaaabb..OO','Oaaaaaaaa....','Oaaaaa.......','OOaaaa.......','.Oaaaa.......','.OOOOO.......']}},hightop:{b:null,f:{ox:-6,oy:-10,r:['..OOOOOOO.','.OOcccccOO','.OaabbbbcO','.OaabbbbcO','.OabbbbbcO','OOabbbbbcO','OaabbbbbbO','Oaaaaaa..O','Oaaaa.....','OOaa......','.O........']}},mohawk:{b:null,f:{ox:-7,oy:-9,r:['..OOOOOOO..','.OOcOcOcOO.','OObbbccccOO','ObbbbbccccO','OaaaaabcccO','OaaaO2.4.OO','OaaO2.3....','Oaa1.2.3...','OOa........','.OO........']}},ponytail:{b:null,f:{ox:-8,oy:-7,r:['....OOOOOOO.','...OObccccOO','..OObbcccccO','.OObbbbccccO','OObbbbbbc..O','Oaaaaaba....','OaaOaaa.....','OaaOaa......','OaaOO.......','OaaO........','OaOO........','OOO.........']}},cornrows:{b:null,f:{ox:-5,oy:-6,r:['.OOOOOOO.','OOaaaaaOO','OcccccccO','Oaaaaa..O','Obbba....','Oaaa.....','Oba......','OO.......']}},
  fringe:{b:null,f:{ox:-6,oy:-7,r:['..OOOOOOOO.','.OObcccccOO','OObbccccccO','Obbbbbcccbc','Obbbbbbcbbb','Oaabaab.ab.','Oaaba......','Oaaba......','OOaa.......','.Oaa.......','.OO........']}},   // the hero: straight hair, a fringe to the brows, the back over the ears
  long:{b:null,f:{ox:-8,oy:-7,r:['....OOOOOOO.','...OObccccOO','..OObbcccccO','..ObbbbccccO','.OObbbbbc..O','.Obaabba....','Oabaaba.....','Oaabaa......','Obaab.......','Oaaba.......','Obaab.......','Oaaba.......','Oabaa.......','.Obab.......','.OObaO......','..OOO.......']}}};   // long hair falling to the shoulders (no menu entry: Profesor)

state.HEAD_FEAT = {ear:{ox:-1,oy:-1,r:['1','2']},eyes_normal:{ox:2,oy:-1,r:['E']},eyes_narrow:{ox:1,oy:-1,r:['EE']},eyes_wide:{ox:1,oy:-1,r:['WE']},brows_normal:{ox:1,oy:-2,r:['00']},brows_thick:{ox:0,oy:-3,r:['.aa','0aa']},brows_angry:{ox:0,oy:-3,r:['0a.','.0a']},nose_broken:{ox:4,oy:-1,r:['4K']},nose_small:{ox:3,oy:0,r:['4K_']},facial_mustache:{ox:1,oy:1,r:['abb']},facial_goatee:{ox:1,oy:1,r:['abb','.ba','.aO']},facial_beard:{ox:-1,oy:0,r:['a.....','aab...','abbbb.','Oaab..','.OaaO.','..OO..']},extra_scar:{ox:1,oy:-3,r:['r','5','.','r']},extra_tape:{ox:3,oy:-1,r:['ww','Ww']},facial_stubble:{ox:-1,oy:1,r:['2.2.0','.2.2.','..1..']},extra_cut:{ox:3,oy:-2,r:['.q','q.']},facial_fullbeard:{ox:-1,oy:0,r:['a....bb','aab.bbc','abbbbbO','Oabbbc.','.Oabbb.','.Oaabb.','..Oab..','...OO..']}};

/*HEADART-END*/
/* HEAD — hand-pixelled profile (faces right). Composed every frame on a small char grid around the head joint
   from the ASCII layers above (base skull + face -> hairstyle -> ear -> facial hair -> eyes/brows/nose -> extras),
   then resolved to colours: skin/hair come from the look ramps, so every skin / hair colour keeps working. */
state.HG = 28;
state.HO = 14;
state.hgrid = new Uint8Array(state.HG*state.HG);

// loose trunks: the hem hangs on a spring and trails the hips (walks, hops, punches)
state.trX = 0;
state.trY = 0;
state.trVX = 0;
state.trVY = 0;
state.prevHX = 0;
state.prevHY = 0;

// surface patterns on the trunk fabric (thigh tops included); coordinates are body-relative so prints move with the cloth
state.FLAME = new Uint8Array([1,3,2,4,2,3,1,2]);

/* =====================================================================
   PARTICLES (preallocated pool)
   ===================================================================== */
state.MAXP = 192;
state.P_SWEAT = 1;
state.P_SPARK = 2;
state.P_STAR = 3;
state.P_SMEAR = 4;
state.P_DUST = 5;
state.P_BIT = 6;
state.P_BURST = 7;
state.P_RING = 8;
   // BURST = big white impact star, RING = shine on a parried punch
state.C_TRL = rgb('#f6ecdf');
state.C_TRL2 = rgb('#cdbba8');
state.C_TRLB = rgb('#a8d4ea');
   // punch smears: cream body, soft edge, cold core
state.pX = new Float32Array(state.MAXP);
state.pY = new Float32Array(state.MAXP);
state.pVX = new Float32Array(state.MAXP);
state.pVY = new Float32Array(state.MAXP);
state.pL = new Int16Array(state.MAXP);
state.pM = new Int16Array(state.MAXP);
state.pT = new Uint8Array(state.MAXP);
state.pC = new Uint32Array(state.MAXP);

state.pCur = 0;

// impact burst (reference: a white, uneven 4-point star with short diagonal rays and a bright core)
state.BURST_LEN = [1,0.72,0.9,0.62];


/* =====================================================================
   GAME STATE, BEAT CLOCK, STATS
   ===================================================================== */
state.STATS = {power:1,speed:1};

// Shared beat clock with scheduled tempo changes.
state.beatMs = 600;
state.gridDiv = 1;
state.simNow = 0;
state.lastBeatMs = 0;
state.nextBeatMs = 600;
state.beatIdx = 0;
state.beatFlash = 0;

state.TQ_N = 16;
state.tqAt = new Float64Array(state.TQ_N);
state.tqMs = new Float64Array(state.TQ_N);
 state.tqHead = 0;
state.tqLen = 0;


state.tick = 0;
state.state = animationState.IDLE;
state.stateT = 0;
state.frameIdx = -1;
state.fired = 0;
state.idleT = 99;
state.curGrade = 1;

state.buffered = -1;
state.bufferTick = 0;
state.bufferedGrade = 1;

state.hitstop = 0;
state.shakeT = 0;
state.shakeDur = 1;
state.shakeAmp = 0;
state.shakeAxis = 0;
state.shX = 0;
state.shY = 0;
state.riseT = 0;

state.moveStep = 0;
state.phx = 0;
state.phy = 0;
state.pgx = 0;
state.pgy = 0;
state.combo = 0;
state.lastHitTick = -999;
state.debug = false;


state.M_FREE = 0;
state.M_SPAR = 2;

state.mode = state.M_FREE;
state.gstate = 'menu';
            // menu, hub, exercises, work, card fights and shadowboxing

// Shared pose flag retained while exercise and fight entry reset the stance.
 state.flow = false;



state.tmpPose = new Float32Array(animationState.NP);
 state.predTip = 0;
state.predY = 0;


/* =====================================================================
   PIXEL FONT (3x5) + POPUPS
   ===================================================================== */
state.FONT = new Uint16Array(128);

(function(){
  const G={'0':'111101101101111','1':'010110010010111','2':'111001111100111','3':'111001111001111','4':'101101111001001',
   '5':'111100111001111','6':'111100111101111','7':'111001010010010','8':'111101111101111','9':'111101111001111',
   'A':'010101111101101','B':'110101110101110','C':'011100100100011','D':'110101101101110','E':'111100110100111',
   'F':'111100110100100','G':'011100101101011','H':'101101111101101','I':'111010010010111','J':'001001001101010',
   'K':'101101110101101','L':'100100100100111','M':'101111111101101','N':'110101101101101','O':'010101101101010',
   'P':'110101110100100','Q':'010101101110011','R':'110101110101101','S':'011100010001110','T':'111010010010010',
   'U':'101101101101111','V':'101101101101010','W':'101101111111101','X':'101101010101101','Y':'101101010010010',
   'Z':'111001010100111','!':'010010010000010','+':'000010111010000','-':'000000111000000','x':'000101010101000',':':'000010000010000','/':'001001010100100','%':'101001010100101'};
  for(const ch in G) state.FONT[ch.charCodeAt(0)]=parseInt(G[ch],2);
})();

// Preserve popup indices used by exercises and card-fight captions.
state.TXT = ['PERFECT','GOOD','OK','MISS','','','','','','','','','','','','','','','','','','MASH','WYRZUT!','KLASK!','FAIL','ZA MOCNO',
 'RUNDA 1','RUNDA 2','RUNDA 3','WALCZ!','NOKDAUN','CZAS!','BLOK','UNIK','KONTRA!','KO!','TKO','WYGRANA','PRZEGRANA','REMIS','IDEALNY UNIK!','SILA UP!','SZYBKOSC UP!','WYTRZYMALOSC UP!'];

state.T_MISS = 3;
state.MAXPU = 8;
state.puT = new Uint16Array(state.MAXPU);
state.puX = new Float32Array(state.MAXPU);
state.puY = new Float32Array(state.MAXPU);
state.puL = new Int16Array(state.MAXPU);
state.puM = new Int16Array(state.MAXPU);
state.puC = new Uint32Array(state.MAXPU);
state.puS = new Uint8Array(state.MAXPU);

state.puCur = 0;
}
