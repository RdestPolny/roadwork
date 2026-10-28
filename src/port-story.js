/* The story on the Thames quay: the cast (a drunk docker, a constable with a woman by the crates, a masked stranger)
   and the two scenes either side of the brawl. Each scene is a pure function of its tick: where everyone stands, their
   joints, what the camera looks at and who speaks. The port (thames-port.js) owns the player, the job and the camera;
   it asks this module for the player's pose, the shot and the line, and draws the cast among its props. */
import { rgb, setRamp, state as appearanceState } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as gymState, figureHD, withCellOutfit, isoX, isoY, quad, shadeC } from './gym.js';
import { h2 } from './boxing.js';
import { mix } from './cast.js';
import { toiletJoints, drawToiletStream } from './npcs.js';
import { C, contact, toWorld, spot, thin, stroke, rod, smoke, cyl, roundLit, behindFront, vn, ease, lerp, lerp3, frac, walkJoints, turnTo, along, pathLen, portFightOutfit } from './thames-port.js';

/** Where the brawl starts: the player and the drunk where the scene before it leaves them. */
export const PORT_BRAWL={hero:[15.75,5.95],drunk:[17.35,5]};
/** The story so far: kind is null in free roam, then 'before', 'fight', 'after' and 'end' once the player is taken away; tick counts the current scene. */
export const state={kind:null,tick:0,stand0:1,hero0:null,fallen:null};
/** Free roam, as when the port opens. */
export function resetStory(){ Object.assign(state,{kind:null,tick:0,stand0:1,hero0:null,fallen:null}); }
/** A scene is playing and the player has no control. */
export function storyPlaying(){ return state.kind==='before'||state.kind==='after'; }
/** The story has begun: the docker stops work to watch. */
export function storyBegun(){ return state.kind!==null; }
/** Start the scene before the brawl at tick t, when the second sack is in. */
export function beginBefore(t){ Object.assign(state,{kind:'before',tick:0,stand0:whisperStand(t)}); }
/** Start the scene after the brawl at the fighters' final positions. */
export function beginAfter(hero,fallen){ Object.assign(state,{kind:'after',tick:0,hero0:[hero.i,hero.j],fallen:[fallen.i,fallen.j]}); }

/** Scene lengths in ticks. */
const BEFORE_END=1340, AFTER_END=1480;
/** Advance the scene: the player's pose, or at the end 'fight' (the brawl begins) or 'prison'. */
export function storyTick(t){
  const n=++state.tick;
  if(state.kind==='before'){ if(n>=BEFORE_END){ state.kind='fight'; return {end:'fight'}; } return {hero:beforeCast(n,t).hero}; }
  if(n>=AFTER_END){ state.kind='end'; return {end:'prison'}; }
  return {hero:afterCast(n,t).hero};
}

/* ---------- poses ---------- */

/** A placed figure: position, facing angle and the height of its base. */
const at=(i,j,a,z0=0)=>({i,j,fi:Math.cos(a),fj:Math.sin(a),z0});
/** Angle from point p to point q, each [i,j] or a placed figure. */
const toward=(p,q)=>Math.atan2((q.j??q[1])-(p.j??p[1]),(q.i??q[0])-(p.i??p[0]));
/** Facing angle of a placed figure. */
const heading=P=>Math.atan2(P.fj,P.fi);
/** 0..1 across the ticks a..b, eased. */
const span=(n,a,b)=>ease((n-a)/(b-a));
/** A single bump 0→1→0 across the ticks a..a+w. */
const pulse=(n,a,w)=>n>a&&n<a+w?Math.sin(Math.PI*(n-a)/w):0;
/** Short signed turn from angle a to angle b. */
const turnBy=(a,b)=>{ let d=b-a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return d; };
/** An elbow between the shoulder and the hand, bent outwards and down. */
const elbow=(sh,hd,s)=>[(sh[0]+hd[0])/2-.25,s*(Math.abs(sh[1]+hd[1])/2+.7),(sh[2]+hd[2])/2-.45];
/** Blend two joint sets by u (0..1). */
function lerpJ(A,B,u){
  u=Math.max(0,Math.min(1,u)); if(u===0) return A; if(u===1) return B;
  const J=s=>{ const a=A(s), b=B(s), o={}; for(const k in a) o[k]=lerp3(a[k],b[k],u); return o; };
  for(const k of ['pel','chest','head']) J[k]=lerp3(A[k],B[k],u); return J;
}
/** A man standing, or walking at stride phase o.g (o.walk), bent forward by o.bend (0..1), leaning o.lean, breathing o.breath;
 * o.hand(s) places that hand (null leaves it hanging or swinging). */
function body(o={}){
  const W=o.walk?walkJoints(o.g,false,1):null, b=o.bend||0, br=o.breath||0, ln=o.lean||0, bob=W?W.pel[2]-6.6:0;
  const J=s=>{ const w=W&&W(s), h=o.hand?.(s);
    const hip=w?[w.hip[0]-1.3*b,w.hip[1],w.hip[2]-2.7*b]:[-1.3*b,s*1.2,7.2-2.7*b];
    const knee=w?[w.knee[0]+1.9*b,w.knee[1],w.knee[2]+.3*b]:[.65+1.9*b,s*1.3,3.8+.3*b];
    const foot=w?w.foot:[s>0?.3:-.2,s*1.45,.9];
    const sh=[.2+2.3*b+ln*.5,s*2.6,(w?w.sh[2]:12.3)-3.4*b+br];
    const hd=h||(w?[w.hd[0]+2.6*b+ln*.4,w.hd[1],w.hd[2]-3.2*b]:[.3+2.6*b+ln*.4,s*3.6,7.9-3.2*b+br]);
    return {hip,knee,foot,sh,el:w&&!h&&!b?w.el:elbow(sh,hd,s),hd};
  };
  J.pel=[-1.1*b,0,6.6-2.6*b+bob]; J.chest=[.3+2.4*b+ln,0,12.2-3.6*b+bob+br]; J.head=[.4+3.3*b+ln*1.2,0,15.6-5*b+bob+br];
  return J;
}
/** Running at stride phase g: longer strides, knees and arms driving, the body pitched forward. */
function runJoints(g){
  const W=walkJoints(g,false,1);
  const J=s=>{ const w=W(s); return {hip:w.hip,knee:[w.knee[0]*1.35+.5,w.knee[1],w.knee[2]+.7],foot:[w.foot[0]*1.5,w.foot[1],.9+(w.foot[2]-.9)*2.2],
    sh:[w.sh[0]+.9,w.sh[1],w.sh[2]-.3],el:[w.el[0]*1.8+.4,w.el[1]*.85,w.el[2]+.8],hd:[w.hd[0]*2+1.4,w.hd[1]*.8,w.hd[2]+2.6]}; };
  J.pel=[W.pel[0],0,W.pel[2]+.2]; J.chest=[W.chest[0]+1.3,0,W.chest[2]-.3]; J.head=[W.head[0]+1.6,0,W.head[2]-.4];
  return J;
}
/** Down on one knee beside someone lying, reaching to them; k blends from standing (0) to kneeling (1). */
function kneelJ(k,t){
  const br=Math.sin(t*.08)*.15*k;
  const K=s=>{ const sh=[1.5,s*2.5,10.9+br], hd=[3.6,s*1.7,4.6];
    return s>0?{hip:[0,s*1.2,4.6],knee:[2.7,s*1.3,3.8],foot:[2.6,s*1.45,.9],sh,el:elbow(sh,hd,s),hd}
      :{hip:[0,s*1.2,4.6],knee:[.3,s*1.3,.9],foot:[-2.9,s*1.45,.7],sh,el:elbow(sh,hd,s),hd}; };
  K.pel=[0,0,4.1]; K.chest=[1.6,0,9.8+br]; K.head=[2.7,0,12.9+br];
  return lerpJ(body(),K,k);
}
/** A person lying on the setts, head forward. */
function lyingJoints(){
  const J=s=>({hip:[0,s,1.4],knee:[-3,s*1.2,1],foot:[-6,s*1.3,.6],sh:[3,s*1.8,2],el:[2,s*3,1],hd:[1,s*4,.6]});
  J.pel=[0,0,1.4]; J.chest=[3,0,2]; J.head=[5,0,2]; return J;
}
/** Dragged under the arms, head towards whoever drags him: u raises the chest from lying (0) to held up (1). */
function draggedJ(u){
  const J=s=>({hip:[0,s,1.4],knee:[-3,s*1.25,lerp(1,1.3,u)],foot:[-6,s*1.45,.6],sh:[lerp(3,2.4,u),s*1.8,lerp(2,6.9,u)],
    el:[lerp(2,3.3,u),s*lerp(3,2.7,u),lerp(1,7.9,u)],hd:[lerp(1,4.3,u),s*lerp(4,2.2,u),lerp(.6,8.2,u)]});
  J.pel=[0,0,lerp(1.4,2,u)]; J.chest=[lerp(3,2.4,u),0,lerp(2,6.3,u)]; J.head=[lerp(5,3,u),0,lerp(2,8.8,u)];
  return J;
}
/** On his feet but out cold, held up from behind: knees gone, head on his chest. */
function slumpJ(){
  const J=s=>({hip:[0,s*1.1,6.4],knee:[1.3,s*1.2,3.5],foot:[.2,s*1.4,.9],sh:[.9,s*2.4,11],el:[.8,s*3.3,8.4],hd:[1.4,s*3.1,6.2]});
  J.pel=[0,0,5.9]; J.chest=[1.1,0,11]; J.head=[2.2,0,13.1]; return J;
}
/** Fists up. */
const guard=(s,t)=>[2.5,s*1.25,13.3+Math.sin(t*.09+s)*.3];
/** Hands raised, palms out. */
const handsUp=s=>[.9,s*2.7,17.6];

/* ---------- the drunk ---------- */

/** A drunk standing: weight rolling slowly from foot to foot, the head heavy; hand(s) may place a hand. */
function drunkStand(t,hand){
  const sw=Math.sin(t*.035)*.7+(vn(t*.01,3)-.5)*.8, J=body({breath:Math.sin(t*.06)*.12,hand});
  const D=s=>{ const a=J(s); return {...a,foot:[a.foot[0],s*1.65,a.foot[2]]}; };
  D.pel=[J.pel[0],sw*.3,J.pel[2]]; D.chest=[J.chest[0]+.5,sw*.6,J.chest[2]-.3]; D.head=[J.head[0]+.8,sw*1.1,J.head[2]-.6];
  return D;
}
/** A drunk's walk at stride phase g: the body rolls over each foot in turn, feet wide, arms loose and thrown out for balance,
 * the head lolling a beat behind; lurch pitches him forward in a stumble. */
function drunkWalk(g,t,lurch=0){
  const W=walkJoints(g,false,1), sw=Math.sin(2*Math.PI*g), lag=Math.sin(2*Math.PI*g-.9), roll=vn(t*.013,7)-.5;
  const J=s=>{ const w=W(s), up=Math.max(0,-s*sw);   /* the arm on the side he rolls away from comes up and out */
    return {hip:[w.hip[0],w.hip[1]+sw*.25,w.hip[2]],knee:[w.knee[0],s*1.5+sw*.2,w.knee[2]],foot:[w.foot[0]*.8,s*(1.7+.3*up),w.foot[2]],
      sh:[w.sh[0]+.5+lurch,s*2.6+sw*.6,w.sh[2]-.4],el:[w.el[0]*.5+.4+lurch,s*(3.8+up*.9)+sw*.5,w.el[2]+up*1.6],
      hd:[w.hd[0]*.4+.9+lurch*1.5,s*(4.3+up*1.6)+sw*.5,w.hd[2]+up*3]}; };
  J.pel=[W.pel[0],sw*.35,W.pel[2]-.15]; J.chest=[W.chest[0]+.7+lurch*1.6,sw*.8+roll*.5,W.chest[2]-.5-lurch*.6];
  J.head=[W.head[0]+1+lurch*2.4,lag*1.5+roll*.6,W.head[2]-1-.4*Math.abs(lag)-lurch];
  return J;
}
/** Doubled over beside the crate: the hand on its side flat on the crate's face, the other on his knee, head down; heave jerks him lower. */
function vomitJ(t,heave){
  const b=.8+.2*heave, br=Math.sin(t*.11)*.2;
  const J=s=>{ const sh=[.2+2.4*b,s*2.6,12.3-3.3*b+br], hd=s<0?[2.3,-4.5,9.8]:[1.9,2.3,5.6];
    return {hip:[-1.4*b,s*1.35,7.2-2.3*b],knee:[.9+1.5*b,s*1.55,3.9+.2*b],foot:[s>0?.7:-.5,s*1.8,.9],sh,el:elbow(sh,hd,s),hd}; };
  J.pel=[-1.2*b,0,6.6-2.2*b]; J.chest=[.4+2.7*b,0,12.2-3.5*b+br]; J.head=[.6+3.9*b+.5*heave,0,15.6-5.6*b-.6*heave+br];
  return J;
}
/** His way from the crates where he pissed to the crates by the sacks, past the van's horses and the stack; at the end he stands
 * along the crates, facing VOMIT_A with the crates at his left hand. */
const DRUNK_PATH=[[8.8,8.8],[11.6,8.55],[14.4,7.95],[16.7,7.05],[18.3,5.6],[19.2,4.1]], VOMIT_A=0;
/** Distance along his way at walk progress u: uneven speed and a stumble forward a little past half way. */
const drunkGone=u=>{ u=Math.max(0,Math.min(1,u)); return pathLen(DRUNK_PATH)*Math.max(0,Math.min(1,u+.02*Math.sin(u*Math.PI*6)+.035*ease((u-.46)/.05)-.035*ease((u-.51)/.14))); };
/** The drunk, his outfit and braces. */
function drunkFig(P,J){
  const A=appearanceState; contact(P.i-.22,P.j-.22,P.i+.22,P.j+.22,P.z0||0,.4);
  portFightOutfit(()=>{
    figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,cap:A.R_HPT,style:'flatcap',stubble:true,rolledSleeves:true,tuckedShirt:true},{noShadow:true});
    const Q=J.chest, B=J.pel; for(const s of [-1,1]) thin(...toWorld(P,Q[0]+1.6,Q[1]+s*1.25,Q[2]-.6),...toWorld(P,B[0]+1.6,B[1]+s*.95,B[2]+1.4),rgb('#39332d'));
  });
}
/** Vomit falling from his mouth to the setts. */
function spew(P,J,t){
  const m=toWorld(P,J.head[0]+1.3,J.head[1],J.head[2]-1.2), g=toWorld(P,4.1,0,.15);
  for(let q=0;q<9;q++){ const u=frac(t*.07+q/9), p=[lerp(m[0],g[0],u),lerp(m[1],g[1],u),lerp(m[2],g[2],u*u)];
    stroke(...p,p[0],p[1],p[2]-.9,q%3?rgb('#8b8248'):rgb('#a39a5c')); }
}
/** The pool of sick on the setts, amt 0..1 of its full size. */
function puddle(p,amt){
  if(amt<=0) return; const x=isoX(p[0],p[1]), y=isoY(p[0],p[1],0), r=.35+.65*amt;
  spot(x,y,8*r,3.2*r,.85,rgb('#4b4728')); spot(x+4*r,y+1,4.5*r,1.8*r,.8,rgb('#57522e')); spot(x-3.5*r,y-.5,3.5*r,1.6*r,.75,rgb('#46411f'));
  for(let k=0;k<7;k++){ const px=Math.round(x+((k*37)%15-7)*r), py=Math.round(y+((k*23)%5-2)*r); if(px>=0&&py>=0&&px<appearanceState.W&&py<appearanceState.H) rendererState.fb[py*appearanceState.W+px]=k%2?rgb('#9a9058'):rgb('#7a7240'); }
  spot(x-2*r,y-1,2.5*r,.9*r,.35,C.lamp);
}

/* ---------- the woman and the constable by the crates ---------- */

/** How far the woman by the crates has stood up at tick t: she kneels, then stands against the wall, on a 30-second round. */
function whisperStand(t){ const p=t%1800; return p<720?0:p<840?ease((p-720)/120):p<1560?1:ease((1800-p)/240); }
/** The woman and the constable at stand (0 she kneels before him .. 1 she stands against the wall, he behind her). */
function whisperPose(t,stand){
  const nod=.25*Math.sin(t*.031), glance=vn(t*.01,3)>.62?-.5:0;
  const bow=.5+.5*Math.sin(t*.0372), headF=lerp(.55+1.1*bow,1,stand), headZ=lerp(10.8-2.2*bow,15.1,stand), sway=Math.sin(t*.025)*.08*stand;
  const W={i:16.9,j:lerp(1.05,.85,stand),fi:1-stand,fj:lerp(.12,-1,stand),z0:0}, P={i:lerp(18.35,16.95,stand),j:lerp(1.2,1.42+sway,stand),fi:lerp(-1,0,stand),fj:lerp(-.1,-1,stand),z0:0};
  const Jw=s=>({hip:[0,s*1.05,lerp(3.5,7,stand)],knee:[lerp(1.8,.5,stand),s*1.1,lerp(.9,3.8,stand)],foot:[lerp(-1.3,.1,stand),s*1.2,lerp(.5,.9,stand)],sh:[.2,s*2.35,lerp(8.5,12,stand)],el:[lerp(1,2,stand),s*2.8,lerp(6.4,14,stand)],hd:[lerp(1.7,4,stand),s*lerp(.7,2.8,stand),lerp(7.8,16,stand)]});
  Jw.pel=[0,0,lerp(2.9,6.4,stand)]; Jw.chest=[.35,0,lerp(8.3,11.8,stand)]; Jw.head=[headF,glance*.3,headZ];
  const Jp=s=>({hip:[0,s*1.25,7.3],knee:[.6,s*1.35,3.9],foot:[0,s*1.45,.9],sh:[.3,s*2.8,12.6],
    el:s>0?[lerp(3,2.2,stand),s*2.5,lerp(11.5,9.6,stand)]:[lerp(-.1,2.2,stand),s*3.5,lerp(9.9,9.6,stand)],hd:s>0?[lerp(10.8-headF,4.2+sway*7.5,stand),lerp(1.1,1.2,stand),lerp(headZ+1.5,7.5,stand)]:[lerp(.4,4.2+sway*7.5,stand),lerp(s*3.4,-2,stand),lerp(7.9,7.5,stand)]});
  Jp.pel=[0,0,6.7]; Jp.chest=[.7,0,12.3]; Jp.head=[1,0,15.6+nod*.4];
  return {W,Jw,P,Jp};
}
/** Her clothes: a dark bodice, a full wine-coloured skirt over a crinoline and an ochre wool shawl. */
const DRESS={top:['#1d181c','#342a31','#4f414b'],skirt:['#22121a','#43202c','#683444'],shawl:['#4a3b20','#776339','#a38c55']};
/** The woman: her figure, the skirt belling out from the waist and the shawl round her shoulders, hair pinned up; tilt lets a
 * falling or lying body carry its face, blood (0..1) soaks the front of her dress from the wound. */
function womanFig(P,J,tilt=false,blood=0){
  const A=appearanceState;
  withCellOutfit(()=>{
    setRamp(A.R_HSH,DRESS.top,false); setRamp(A.R_HSHF,DRESS.top,true); setRamp(A.R_HPT,DRESS.skirt,false); setRamp(A.R_HPTF,DRESS.skirt,true);
    setRamp(A.R_HBELT,DRESS.shawl,false);
    /* the hair ramp is put back afterwards */
    const hair=A.PAL.slice(A.R_HAIR*3,A.R_HAIR*3+3); setRamp(A.R_HAIR,['#241812','#4a3020','#6e4a2e'],false);
    try{ figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'bun'},{noShadow:true,tilt}); }
    finally{ A.PAL.set(hair,A.R_HAIR*3); }
    skirt(P,J); shawl(P,J,A.R_HBELT);
  });
  if(blood>0){ const w=toWorld(P,J.chest[0]+1.4,J.chest[1],lerp(J.pel[2],J.chest[2],.35)), x=isoX(w[0],w[1]), y=isoY(...w);
    spot(x,y,2.4+2.6*blood,2.6+4*blood,.85,rgb('#3a0807')); spot(x-.5,y+1+2*blood,1.5+1.5*blood,2+3*blood,.7,rgb('#5e0f0b')); }
}
/** Blend three colours by u (0 dark .. 1 light). */
const grade=(c,u)=>{ u=Math.max(0,Math.min(1,u)); return u<.5?mix(c[0],c[1],u*2):mix(c[1],c[2],(u-.5)*2); };
/** The skirt as a bell of hoops stacked from the hem up to the waist, so each hoop's front hides the ones below it: lit from the lamps
 * on the left, soft folds down it, darker at the hem; when she lies it spreads flat along her legs. Outline first, then the cloth. */
function skirt(P,J){
  const c=gymState.propCamera, kx=Math.hypot(c.ix,c.jx)/7.5, ky=Math.hypot(c.iy,c.jy)/7.5, cols=DRESS.skirt.map(rgb), fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H;
  const L=J(-1).foot, R=J(1).foot, up=Math.max(0,Math.min(1,(J.pel[2]-1.4)/5));
  const top=toWorld(P,lerp(J.pel[0],J.chest[0],.42),lerp(J.pel[1],J.chest[1],.42),lerp(J.pel[2],J.chest[2],.42));
  const hem=toWorld(P,(L[0]+R[0])/2+.4*up,(L[1]+R[1])/2*.3,Math.max(.3,Math.min(L[2],R[2])-.6));
  const x0=isoX(hem[0],hem[1]), y0=isoY(...hem), x1=isoX(top[0],top[1]), y1=isoY(...top), n=Math.max(4,Math.ceil(Math.hypot(x1-x0,y1-y0))), rh=lerp(3.9,5.4,up);
  for(let pass=0;pass<2;pass++) for(let k=0;k<=n;k++){
    const u=k/n, t=1-u, r=lerp(2.3,rh,Math.pow(t,.8)), cx=lerp(x0,x1,u), cy=lerp(y0,y1,u), rx=r*kx+(pass?0:1), ry=r*ky*lerp(.75,1,up)+(pass?0:1);
    for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(H-1,Math.ceil(cy+ry));y++){ const v=(y+.5-cy)/ry;
      for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(W-1,Math.ceil(cx+rx));x++){ const s=(x+.5-cx)/rx; if(s*s+v*v>1) continue;
        fb[y*W+x]=pass?grade(cols,(roundLit(s)-.5)/.75*(.86+.14*Math.cos(s*7.5+t*2.2))*(t>.93?.75:1)-.12*t):appearanceState.C_OUT; } }
  }
}
/** A wool shawl round her shoulders, its ends crossed over her chest and its point down her back when she turns away. */
function shawl(P,J,ramp){
  const Q=J.chest, SL=J(-1).sh, SR=J(1).sh, w=a=>toWorld(P,...a);
  if(P.fi+P.fj<0) rod(w([Q[0]-.5,Q[1],Q[2]+.2]),w([Q[0]-1.3,Q[1],Q[2]-4.4]),3.4,.8,ramp);
  rod(w([SL[0]-.3,SL[1]*.9,SL[2]+.2]),w([SR[0]-.3,SR[1]*.9,SR[2]+.2]),2.3,2.3,ramp);
  for(const S of [SL,SR]) rod(w([S[0]+.1,S[1]*.85,S[2]-.1]),w([Q[0]+1.5,Q[1]-Math.sign(S[1])*.5,Q[2]-2.7]),1.9,1.2,ramp);
}
/** The constable in his navy tunic and helmet with its brass star. */
function copFig(P,J){
  const A=appearanceState;
  withCellOutfit(()=>{
    const navy=['#11151d','#1d2431','#2f3a4d'];
    setRamp(A.R_HSH,navy,false); setRamp(A.R_HSHF,navy,true); setRamp(A.R_HPT,navy,false); setRamp(A.R_HPTF,navy,true); setRamp(A.R_HBELT,['#0c0f15','#1a202c','#2d3647'],false);
    figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HBELT,style:'toque',mustache:true,belt:true},{noShadow:true});
  });
  const hb=toWorld(P,J.head[0]+1.35,J.head[1],J.head[2]+1.5); thin(...hb,hb[0],hb[1],hb[2]+.5,rgb('#b49a5a'));
}
/** Breath in the cold air at a figure's mouth. */
const breath=(P,J,t,seed)=>smoke(...toWorld(P,J.head[0]+1.6,J.head[1],J.head[2]-1.2),t,seed,4,240,C.fog,.45);
/** The two by the crates, drawn together as they stand close. */
function whisperDraw(t,stand,turn=0,wave=0){
  const {W,Jw,P,Jp}=whisperPose(t,stand), Q={...P}, a=heading(P)+turn; Q.fi=Math.cos(a); Q.fj=Math.sin(a);
  const Jc=wave?s=>{ const o=Jp(s); if(s>0){ o.hd=[2.4+Math.sin(t*.3)*1.1,s*4.3,12.8]; o.el=elbow(o.sh,o.hd,s); } return o; }:Jp;
  if(wave){ Jc.pel=Jp.pel; Jc.chest=Jp.chest; Jc.head=Jp.head; }
  contact(W.i-.35,W.j-.3,P.i+.35,P.j+.3,0,.65);
  womanFig(W,Jw); copFig(Q,Jc);
  breath(W,Jw,t,11); breath(Q,Jp,t+120,17);
}

/* ---------- the masked stranger ---------- */

/** He is first seen once the drunk is being taken away: in the dark between the tarpaulin and the wall; his way along the wall to the woman. */
const LURK=[25.15,.8], CREEP=[[25.15,.8],[21.3,.72],[17.85,.95]];
/** Hunch any joints into his stoop: shoulders forward and down, head thrust out; cock tips the head over to one side. */
function hunch(B,t,cock=0){
  const J=s=>{ const a=B(s); return {...a,sh:[a.sh[0]+1.3,a.sh[1],a.sh[2]-.5],el:[a.el[0]+.8,a.el[1],a.el[2]],hd:[a.hd[0]+.5,a.hd[1],a.hd[2]]}; };
  J.pel=B.pel; J.chest=[B.chest[0]+1.5,B.chest[1],B.chest[2]-.7]; J.head=[B.head[0]+1.9,B.head[1]+cock*1.1,B.head[2]-1.1-cock*.5+(cock?0:Math.sin(t*.04)*.12)]; return J;
}
/** A head that holds dead still, then now and then jerks a little: an animal listening. */
const twitch=n=>h2(Math.floor(n/9),77)>232?((h2(Math.floor(n/9),78)&1)?.5:-.5):0;
/** The stranger in a long coat and top hat, a canvas hood over his face; the knife in his far hand, red once it has been used. */
function ripperFig(P,J,bloody=false){
  const A=appearanceState;
  contact(P.i-.2,P.j-.2,P.i+.2,P.j+.2,0,.45);
  withCellOutfit(()=>{
    const coat=['#15171a','#24272b','#3c3d3e'];
    setRamp(A.R_HSH,coat,false); setRamp(A.R_HSHF,coat,true); setRamp(A.R_HPT,coat,false); setRamp(A.R_HPTF,coat,true);
    setRamp(A.R_HBELT,['#817e74','#c2beb0','#e1ddd0'],false);
    figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,cap:A.R_HBELT,style:'hood'},{noShadow:true});
    const w=(f,s,z)=>toWorld(P,f,s,z), dark=rgb('#24262a'), B=J.pel;
    quad(...w(B[0]+.5,-1.5,B[2]+1.2),...w(B[0]+.5,1.5,B[2]+1.2),...w(B[0]+.9,1.9,B[2]-3.1),...w(B[0]+.9,-1.9,B[2]-3.1),()=>dark);
    thin(...w(B[0]+1.1,0,B[2]+1),...w(B[0]+1.3,0,B[2]-2.9),rgb('#3e4042'));
    const h=J.head, hat=w(h[0],h[1],h[2]+1.1);
    cyl(hat[0],hat[1],.25,hat[2],hat[2]+.25,(z,s)=>shadeC(rgb('#1a1b1c'),roundLit(s)),()=>rgb('#292a2a'));
    cyl(hat[0],hat[1],.16,hat[2]+.2,hat[2]+2.5,(z,s)=>shadeC(rgb('#292a2c'),roundLit(s)),()=>rgb('#373739'));
    /* the knife points the way the forearm does */
    const hand=J(-1).hd, el=J(-1).el, d=[hand[0]-el[0],hand[1]-el[1],hand[2]-el[2]], l=Math.hypot(...d)||1, tip=[hand[0]+d[0]/l*2.6,hand[1]+d[1]/l*2.6,hand[2]+d[2]/l*2.6];
    stroke(...w(...hand),...w(hand[0]+d[0]/l*.6,hand[1]+d[1]/l*.6,hand[2]+d[2]/l*.6),rgb('#493a31'));
    stroke(...w(hand[0]+d[0]/l*.6,hand[1]+d[1]/l*.6,hand[2]+d[2]/l*.6),...w(...tip),bloody?rgb('#7a1712'):rgb('#a6aba9'));
    if(bloody) thin(...w(...tip),...w(tip[0]-d[0]/l*.8,tip[1]-d[1]/l*.8,tip[2]-d[2]/l*.8),rgb('#b02a1c'));
  });
}
/** Draw fn faded to alpha a (0 gone .. 1 solid) over what is already in the picture. */
const fade={buf:new Uint32Array(0)};
function ghost(fn,a){
  if(a<=0) return; if(a>=1){ fn(); return; }
  const fb=rendererState.fb; if(fade.buf.length!==fb.length) fade.buf=new Uint32Array(fb.length); fade.buf.set(fb); fn();
  for(let k=0;k<fb.length;k++) if(fb[k]!==fade.buf[k]) fb[k]=mix(fade.buf[k],fb[k],a);
}
/** The ticks the knife goes in, and the cut across her throat after them. */
const STABS=[893,908,921,944], SLASH=968;
/** How hard the knife is going in at tick n (0..1), and how far the throat cut has swept. */
const stabAt=n=>Math.max(...STABS.map(a=>pulse(n,a-6,15))), slashAt=n=>span(n,SLASH-6,SLASH+6);
/** His attack: the near hand round her throat, the far hand driving the knife in under her ribs, then the cut across her throat. */
function stabJ(B,n){
  const k=stabAt(n), cut=n>=SLASH-14&&n<SLASH+14, sw=slashAt(n);
  const J=s=>{ const o=B(s);
    if(s<0){ o.hd=cut?[lerp(3.2,4.6,pulse(n,SLASH-14,28)),lerp(-2.6,1.8,sw),lerp(13.2,13.8,sw)]:[3+1.9*k,-.7,9.3-.5*k]; o.el=cut?[2.4,-2.9,11.6]:[2.2-.4*k,-2.5,9.6]; }
    else { o.hd=[5,s*.4,13.4]; o.el=elbow(o.sh,o.hd,s); }
    return o; };
  J.pel=B.pel; J.chest=[B.chest[0]+.6*k,B.chest[1],B.chest[2]]; J.head=B.head; return J;
}

/* ---------- the scene before the brawl ---------- */

/** The player's way out of the warehouse gate towards the last sack, stopping short where he sees the drunk. */
const HERO_WALK=[[13.15,1.15],[14.5,2.2],[15.5,4.3],[15.95,5.3]], HERO_GO=160, HERO_V=.021;
/** Length of the player's way out of the gate (computed on use: the path helpers come from the port module). */
const heroLen=()=>pathLen(HERO_WALK);
/** Everyone in the scene before the brawl at tick n. */
function beforeCast(n,t){
  /* the drunk: finishes pissing against the crates, staggers over to the crates by the sacks, is sick there, turns on the player */
  let D, DJ, pee=false, sick=false;
  const end=DRUNK_PATH[DRUNK_PATH.length-1], last=Math.atan2(end[1]-DRUNK_PATH[4][1],end[0]-DRUNK_PATH[4][0]);
  if(n<140){
    D=at(8.8,8.8,n<110?Math.PI/2:turnTo(Math.PI/2,Math.atan2(DRUNK_PATH[1][1]-8.8,DRUNK_PATH[1][0]-8.8),(n-110)/30));
    if(n<110){ const T=toiletJoints(); DJ=s=>{ const o=T(s); if(n>=60) o.hd=[o.hd[0]+.2,o.hd[1],o.hd[2]+.3*Math.sin(n*.7)]; return o; }; DJ.pel=T.pel; DJ.chest=T.chest; DJ.head=[T.head[0],T.head[1],T.head[2]+.08*Math.sin(t*.025)]; pee=n<60; }
    else DJ=drunkStand(t);
  } else if(n<600){
    const u=(n-140)/460, d=drunkGone(u), [i,j,a]=along(DRUNK_PATH,d), g=d/.62, sw=Math.sin(2*Math.PI*g+.3)*.14, lurch=Math.sin(Math.PI*Math.max(0,Math.min(1,(u-.45)/.1)));
    D=at(i-Math.sin(a)*sw,j+Math.cos(a)*sw,a+.12*Math.sin(2*Math.PI*g)); DJ=drunkWalk(g,t,lurch*1.2);
  } else if(n<1010){
    const H=heroAt(n), hit=n>=650&&n<790;
    const a=n<880?turnTo(last,VOMIT_A,(n-600)/40):turnTo(VOMIT_A,toward(end,H),(n-905)/35);
    D=at(end[0],end[1],a);
    const heave=Math.max(pulse(n,665,16),pulse(n,697,16),n>=720&&n<790?.5+.25*Math.sin(n*.35):0,pulse(n,838,10)*.6);
    const wipe=n>=893&&n<930?s=>s>0?[2.8,s*lerp(1.4,-.6,(n-893)/37),14.4]:null:null, fist=n>=940?s=>s>0?[2.5,s*2.1,14.4+Math.sin(n*.45)*.8]:null:wipe;
    DJ=n<650?lerpJ(drunkStand(t),vomitJ(t,0),span(n,605,650)):n<880?vomitJ(t,hit?heave:heave*.4):lerpJ(vomitJ(t,0),drunkStand(t,fist),span(n,880,915));
    sick=n>=722&&n<788;
  } else {
    const H=heroAt(n), go=[end,PORT_BRAWL.drunk], L=pathLen(go), d=L*Math.min(1,(n-1010)/120);
    if(n<1130){ const [i,j,a]=along(go,d), g=d/.62, sw=Math.sin(2*Math.PI*g+.3)*.12; D=at(i-Math.sin(a)*sw,j+Math.cos(a)*sw,a); DJ=drunkWalk(g,t); }
    else { D=at(...PORT_BRAWL.drunk,toward(PORT_BRAWL.drunk,H)+.1*Math.sin(t*.03)); DJ=drunkStand(t,n>=1150?s=>guard(s,t):null); }
  }
  const hero=heroBefore(n,t,D);
  /* the constable turns from the woman, waves the player off over his shoulder and turns back */
  const stand=lerp(state.stand0,1,span(n,0,120)), cop=whisperPose(t,stand).P, back=toward(cop,hero), w=span(n,1155,1180)-span(n,1270,1300);
  return {hero,drunk:{P:D,J:DJ,pee,sick},puddle:Math.max(0,Math.min(1,(n-722)/66)),
    whisper:{stand,turn:turnBy(heading(cop),back)*.72*w,wave:n>=1172&&n<1268},cop:{i:cop.i,j:cop.j}};
}
/** The player's position in the scene before the brawl, without his pose. */
function heroAt(n){
  if(n<1010){ const d=Math.max(0,(n-HERO_GO)*HERO_V); const [i,j]=along(HERO_WALK,Math.min(d,heroLen())); return [i,j]; }
  const u=span(n,1010,1070), e=HERO_WALK[HERO_WALK.length-1]; return [lerp(e[0],PORT_BRAWL.hero[0],u),lerp(e[1],PORT_BRAWL.hero[1],u)];
}
/** The player before the brawl: out of the gate, stops to watch the drunk, shouts at him, steps back and calls the constable. */
function heroBefore(n,t,D){
  const [i,j]=heroAt(n), d=(n-HERO_GO)*HERO_V, cop=[16.95,1.42];
  if(n<HERO_GO) return {...at(i,j,Math.PI/2),pose:body({breath:Math.sin(t*.05)*.08})};
  if(d<heroLen()){ const [,,a]=along(HERO_WALK,d); return {...at(i,j,a),pose:walkJoints(d/.69,false,1),moving:true}; }
  const arrive=HERO_GO+heroLen()/HERO_V, aD=toward([i,j],D), aCop=toward([i,j],cop);
  let a=turnTo(Math.atan2(HERO_WALK[3][1]-HERO_WALK[2][1],HERO_WALK[3][0]-HERO_WALK[2][0]),aD,(n-arrive)/30);
  if(n>=1030) a=n<1285?turnTo(aD,aCop,(n-1030)/25):turnTo(aCop,aD,(n-1285)/20);
  const hand=n>=790&&n<880?s=>s>0?[4.6,s*1.3,13.4]:null:n>=1040&&n<1145?s=>s>0?[2.1,s*.9,15.3]:[2.4,s*2.9,16.4]:n>=1295?s=>guard(s,t):null;
  if(n>=1010&&n<1070) return {...at(i,j,a),pose:body({walk:true,g:-span(n,1010,1070)*1.0,hand}),moving:true};
  return {...at(i,j,a),pose:body({breath:Math.sin(t*.05)*.1,hand})};
}
/* ---------- the scene after the brawl ---------- */

/** The van's side door, the constable's way there with the drunk and his run back to the woman. */
const DRAG_VIA=[15,7.05], DOOR_STOP=[7.75,7.15], DOOR_IN=[8.3,6.5], COP_BACK=[[8.32,6.75],[9.2,7.2],[15,7.25],[15.7,4.45]], COP0=[16.95,1.42];
/** The woman runs from the nook by the crates out onto the open setts before the gate (HER), where the stranger catches her (RIP_AT);
 * she falls there, the player kneels beside her (KNEEL) and the stranger runs back behind the crates into the dark. */
const HER=[15.85,2.6], RIP_AT=[16.5,2], KNEEL=[15.6,1.9], WOMAN_RUN=[[16.9,1],[16.2,1.9],HER];
const CHASE=[[17.85,.95],[17.2,1.25],RIP_AT], FLEE=[[16.72,1.8],[17.3,1.05],[21.3,.72],[25.15,.8],[27.2,.8]];
/** Where he holds her, pulled in from where she turned, and where she falls: face down, her head towards him. */
const HELD=[HER[0]+(RIP_AT[0]-HER[0])*.12,HER[1]+(RIP_AT[1]-HER[1])*.12];
const herBody=()=>at(...HELD,toward(HER,RIP_AT));
/** The constable's drag: from the fallen man, out to the lane in front of the cab rank, along it to the van. */
function dragPath(F){
  let u=[DRAG_VIA[0]-F[0],DRAG_VIA[1]-F[1]], l=Math.hypot(...u); if(l<1){ u=[DOOR_STOP[0]-F[0],DOOR_STOP[1]-F[1]]; l=Math.hypot(...u); }
  u=[u[0]/l,u[1]/l]; const G=[F[0]+u[0]*.88,F[1]+u[1]*.88];
  return {G,dir:Math.atan2(u[1],u[0]),path:l<1?[F,G,DOOR_STOP]:[F,G,DRAG_VIA,DOOR_STOP]};
}
/** Everyone in the scene after the brawl at tick n. */
function afterCast(n,t){
  const F=state.fallen, R=dragPath(F), L=pathLen(R.path)-.88;
  /* the constable and the man he takes to the van */
  let P, PJ, DP=null, DJ=null, inVan=0;
  const walkIn=[COP0,[16.85,4.2],R.G];
  if(n<80){ P=at(...COP0,turnTo(-Math.PI/2,toward(COP0,F),(n-40)/40)); PJ=body({breath:Math.sin(t*.05)*.08}); DP=at(...F,R.dir); DJ=lyingJoints(); }
  else if(n<260){ const W=pathLen(walkIn), d=W*Math.min(1,(n-80)/180), [i,j,a]=along(walkIn,d); P=at(i,j,n<250?a:turnTo(a,R.dir+Math.PI,(n-250)/10)); PJ=n<250?body({walk:true,g:d/.69}):body(); DP=at(...F,R.dir); DJ=lyingJoints(); }
  else if(n<340){ P=at(...R.G,R.dir+Math.PI); const b=n<300?span(n,260,300)*.95:lerp(.95,.45,span(n,300,340)); PJ=body({bend:b,hand:s=>[lerp(.3,3.2,Math.min(1,(n-260)/30)),s*lerp(3.6,1.3,Math.min(1,(n-260)/30)),lerp(7.9,lerp(3.6,6.8,span(n,300,340)),Math.min(1,(n-260)/30))]}); DP=at(...F,R.dir); DJ=n<300?lyingJoints():lerpJ(lyingJoints(),draggedJ(1),span(n,300,340)); }
  else if(n<640){
    const d=L*(n-340)/300, c=along(R.path,d+.88), m=along(R.path,d);
    P=at(c[0],c[1],toward(c,m)); PJ=body({walk:true,g:-d/.6,bend:.45,hand:s=>[3.2,s*1.3,6.8]}); DP=at(m[0],m[1],toward(m,c)); DJ=draggedJ(1);
  } else {
    const m=along(R.path,L), aDoor=-Math.PI/2;
    if(n<690){ P=at(...DOOR_STOP,turnTo(toward(DOOR_STOP,m),-1.15,(n-640)/25)); PJ=body({hand:s=>s>0&&n>=655?[4.4,s*1.1,10.4]:null}); DP=at(m[0],m[1],toward(m,DOOR_STOP)); DJ=draggedJ(1); }
    else if(n<740){ const u=span(n,690,740); P=at(lerp(DOOR_STOP[0],8.35,u),lerp(DOOR_STOP[1],7.25,u),turnTo(-1.15,aDoor,(n-690)/30)); PJ=body({bend:lerp(.5,.2,u),hand:s=>[lerp(3.2,2.6,u),s*1.4,lerp(7,10.5,u)]});
      DP=at(lerp(m[0],DOOR_IN[0],u),lerp(m[1],DOOR_IN[1],u),turnTo(toward(m,DOOR_STOP),aDoor,(n-690)/40)); DJ=lerpJ(draggedJ(1),slumpJ(),u); }
    else if(n<790){ const u=span(n,740,785); P=at(8.35,lerp(7.25,6.8,u),aDoor); PJ=body({lean:.6*u,hand:s=>[lerp(2.6,4.4,u),s*1.4,10.5]});
      if(u<1){ DP=at(DOOR_IN[0],lerp(DOOR_IN[1],5.2,u),aDoor,4.4*Math.min(1,u/.6)); DJ=slumpJ(); inVan=Math.max(0,Math.min(1,(5.95-DP.j)/1.1)); } }
    else if(n<840){ P=at(8.35,6.8,n<820?aDoor:turnTo(aDoor,toward([8.35,6.8],COP_BACK[2]),(n-820)/20)); PJ=body({hand:s=>s>0&&n<815?[4,s*1.3,10.8]:null}); }
    else { const B=[[8.35,6.8],...COP_BACK.slice(1)], W=pathLen(B), d=Math.min(W,(n-840)*.047);
      if(d<W){ const [i,j,a]=along(B,d); P=at(i,j,a); PJ=runJoints(d/1.05); }
      else { const H=afterHeroAt(n); P=at(...COP_BACK[COP_BACK.length-1],toward(COP_BACK[COP_BACK.length-1],H)); PJ=body({breath:Math.sin(t*.12)*.3,hand:n>=1100&&n<1240?s=>s>0?[4.4,s*1.5,13.6]:null:null}); } }
  }
  const woman=womanAfter(n,t), ripper=ripperAfter(n,t), hero=heroAfter(n,t,P);
  return {hero,cop:{P,J:PJ},drunk:DP&&{P:DP,J:DJ,inVan},woman,ripper,puddle:1,pool:Math.max(0,Math.min(1,(n-1030)/260))};
}
/** The player's place after the brawl, for the constable to face. */
function afterHeroAt(n){ const W=heroRun(); return n<RUN_AT?state.hero0:along(W,Math.min(pathLen(W),(n-RUN_AT)*RUN_V)); }
/** The player's run from the brawl round her feet to the far side of her, starting on her cry. */
const heroRun=()=>[state.hero0,[14.9,3],KNEEL], RUN_AT=955, RUN_V=.05;
/** The player after the brawl: gets his breath, watches the constable, runs to the woman's cry, kneels by her, rises with his hands up. */
function heroAfter(n,t,cop){
  const H=state.hero0, W=heroRun(), RL=pathLen(W), d=(n-RUN_AT)*RUN_V;
  if(n<RUN_AT){ const aim=n<120?state.fallen:[cop.i,cop.j], a=n<800?toward(H,aim):turnTo(toward(H,[cop.i,cop.j]),toward(H,HER),(n-800)/25);
    return {...at(...H,a),pose:body({breath:Math.sin(t*(n<300?.16:.07))*(n<300?.35:.12)})}; }
  if(d<RL){ const [i,j,a]=along(W,d); return {...at(i,j,a),pose:runJoints(d/1.05),moving:true}; }
  const arrive=RUN_AT+RL/RUN_V, aRun=toward(W[1],KNEEL), aHer=toward(KNEEL,toWorld(herBody(),2.6,0,0)), aCop=toward(KNEEL,COP_BACK[COP_BACK.length-1]);
  if(n<1150) return {...at(...KNEEL,turnTo(aRun,aHer,(n-arrive)/15)),pose:kneelJ(span(n,Math.max(arrive+20,990),Math.max(arrive+60,1030)),t)};
  return {...at(...KNEEL,turnTo(aHer,aCop,(n-1150)/30)),pose:lerpJ(kneelJ(1,t),body({breath:Math.sin(t*.1)*.15,hand:n>=1170?handsUp:null}),span(n,1150,1185))};
}
/** Down on both knees, hands pressed to the wound, bowed over. */
function kneelW(){
  const J=s=>{ const sh=[1.1,s*2.3,10.4], hd=[2.2,s*.7,7.4]; return {hip:[0,s*1.05,4.4],knee:[2.3,s*1.15,.9],foot:[-1.7,s*1.2,.6],sh,el:elbow(sh,hd,s),hd}; };
  J.pel=[0,0,4.1]; J.chest=[1.2,0,9.7]; J.head=[2.5,0,12.4]; return J;
}
/** The woman after the brawl: alone against the wall she turns round and watches the constable; she sees the stranger, runs out
 * screaming and turns at bay; he drags her in by the throat, stabs her four times and cuts her throat; she sinks to her knees and falls. */
function womanAfter(n,t){
  const {W:W0,Jw}=whisperPose(t,1), aWall=-Math.PI/2, aVan=toward(W0,DOOR_STOP), aRip=toward(HER,RIP_AT);
  if(n<160) return {P:W0,J:Jw};
  const calm=s=>[2.2,s*.6,10.6], hair=s=>s>0&&n>=400&&n<480?[.5,s*1.7,16.8]:calm(s), scared=s=>[1.9,s*.8,15];
  if(n<780){ const u=span(n,160,260); return {P:at(16.9,lerp(.85,1,u),turnTo(aWall,aVan,(n-160)/100)),J:lerpJ(Jw,body({breath:Math.sin(t*.06)*.1,hand:hair}),u)}; }
  const stand=body({breath:Math.sin(t*.2)*.25,hand:scared});
  if(n<805) return {P:at(lerp(16.9,16.75,span(n,780,800)),1,turnTo(aVan,0,(n-780)/12)),J:stand};
  const RL=pathLen(WOMAN_RUN), d=RL*Math.min(1,(n-805)/45);
  if(n<850){ const [i,j,a]=along(WOMAN_RUN,d); return {P:at(i,j,a),J:runJoints(d/.9)}; }
  const fend=body({breath:Math.sin(t*.25)*.3,lean:-.5,hand:s=>[2.6,s*1.5,13.6]});
  if(n<870) return {P:at(...HER,turnTo(toward(WOMAN_RUN[1],HER),aRip,(n-850)/14)),J:fend};
  const pull=span(n,870,882), P=at(lerp(HER[0],HELD[0],pull),lerp(HER[1],HELD[1],pull),aRip);
  /* held up by the throat, her hands at his arm and the knife; each stab doubles her over, the throat cut throws her head back */
  const k=stabAt(n), sag=span(n,885,985)*.8, back=pulse(n,SLASH-4,24);
  const held=s=>{ const o=fend(s); o.hd=s<0?[2.9,-.5,9.6]:[3.6,s*.9,12.6]; o.el=elbow(o.sh,o.hd,s); o.hip=[o.hip[0]-.4*k,o.hip[1],o.hip[2]-1.3*sag]; o.knee=[o.knee[0]+1.2*sag,o.knee[1],o.knee[2]]; return o; };
  held.pel=[-.4*k-.3*sag,0,6.6-1.3*sag]; held.chest=[.4+1.3*k,0,12.2-.9*k-1.2*sag]; held.head=[.6+1.7*k-1.2*back,0,15.6-.9*k-1.2*sag+.4*back];
  if(n<870+15) return {P,J:lerpJ(fend,held,pull),blood:0};
  const blood=span(n,893,990);
  if(n<985) return {P,J:held,blood};
  if(n<1012) return {P,J:lerpJ(held,kneelW(),span(n,985,1012)),blood};
  return {P,J:lerpJ(kneelW(),lyingJoints(),span(n,1012,1045)),tilt:true,blood};
}
/** The stranger after the brawl: he forms out of the dark by the wall; creeps along it behind the crates in quick bursts, freezing
 * mid-step with his head cocked; stalks the woman with long, even strides; kills her, stands over her a moment, snaps his head round
 * at the player and scuttles back behind the crates into the dark, blood dripping from the knife. */
function ripperAfter(n,t){
  const frozen=(cock=0)=>hunch(body(),t,cock), aHer=toward(RIP_AT,HER);
  /* the camera comes to the empty dark first; he forms out of it */
  if(n<450) return null;
  if(n<560) return {P:at(...LURK,Math.PI),J:frozen(.8+twitch(n)),a:span(n,500,560)};
  if(n<780){ const W=pathLen(CREEP), b=Math.floor((n-560)/44), m=(n-560)%44, d=W*(b+ease(Math.min(1,m/27)))/5, [i,j,a]=along(CREEP,d);
    return {P:at(i,j,a),J:hunch(walkJoints(d/.5,false,1),t,m<27?0:Math.min(1,(m-27)/4)+twitch(n)*.5),a:1}; }
  if(n<805) return {P:at(...CREEP[CREEP.length-1],turnTo(Math.PI,toward(CREEP[2],HER),(n-780)/5)),J:frozen(n<798?.9+twitch(n):0),a:1};
  if(n<870){ const W=pathLen(CHASE), d=W*(n-805)/65, [i,j,a]=along(CHASE,d); return {P:at(i,j,a),J:hunch(walkJoints(d/.85,false,1),t),a:1}; }
  const grab=s=>[lerp(2.5,5,span(n,866,880)),s*.4,13.4];
  if(n<885) return {P:at(...RIP_AT,aHer),J:hunch(body({hand:s=>s>0?grab(s):[1.6,s*2.6,9.4]}),t),a:1,bloody:false};
  if(n<985) return {P:at(...RIP_AT,aHer),J:stabJ(hunch(body(),t),n),a:1,bloody:n>=893};
  const off=span(n,985,1000), P0=[lerp(RIP_AT[0],FLEE[0][0],off),lerp(RIP_AT[1],FLEE[0][1],off)];
  if(n<1026){ const look=n<1020?aHer:turnTo(aHer,toward(P0,KNEEL),(n-1020)/5), J=hunch(body({bend:n<1020?.35:0}),t,n<1020?.9:0);
    return {P:at(...P0,look),J,a:1,bloody:true}; }
  const W=pathLen(FLEE), d=(n-1026)*.065; if(d>=W) return null;
  const [i,j,a]=along(FLEE,d); return {P:at(i,j,a),J:hunch(runJoints(d/.9),t),a:1-span(n,1080,1140),bloody:true};
}

/* ---------- blood ---------- */

/** Gravity on a drop of blood, in height units a tick². */
const DROP_G=.03;
/** Drops thrown at tick a from world point p towards angle dir (spread wide): those in the air go to fly as [i,j,z], those down to land as [i,j,size]. */
function spatter(n,a,p,dir,count,spread,seed,fly,land){
  if(n<a) return;
  for(let q=0;q<count;q++){
    const r1=h2(q*5+seed,seed)/255, r2=h2(q*11+seed*3,seed+7)/255, r3=h2(q*3+seed*7,seed+13)/255;
    const ang=dir+(r1-.5)*spread, sp=.006+.02*r2, vz=.12+.3*r3, tl=(vz+Math.sqrt(vz*vz+2*DROP_G*p[2]))/DROP_G, dt=Math.min(n-a,tl);
    const q3=[p[0]+Math.cos(ang)*sp*dt,p[1]+Math.sin(ang)*sp*dt,Math.max(0,p[2]+vz*dt-DROP_G*dt*dt/2)];
    if(n-a>=tl) land.push([q3[0],q3[1],r2>.6?2:1]); else fly.push(q3);
  }
}
/** Every drop of the murder at tick n: from the stab wounds, the cut throat and, as he runs, off the end of the knife. */
function bloodAt(n){
  const fly=[], land=[], her=herBody(), a=heading(her), wound=toWorld(her,1.5,0,9.4), throat=toWorld(her,1.1,0,13.6);
  STABS.forEach((s,k)=>spatter(n,s,wound,a+(k%2?.5:-.5),8,1.9,31+k,fly,land));
  spatter(n,SLASH,throat,a+Math.PI/2,12,1.2,71,fly,land); spatter(n,SLASH,throat,a,8,1,73,fly,land);
  for(let td=1030;td<Math.min(n,1110);td+=8){ const R=ripperAfter(td,0); if(R){ const h=toWorld(R.P,...R.J(-1).hd); land.push([h[0],h[1],1]); } }
  for(let td=990;td<Math.min(n,1040);td+=7) land.push([her.i+((td*7)%5-2)*.05,her.j+((td*3)%5-2)*.05,2]);
  return {fly,land};
}
/** The blood on the setts: the spreading pool round her and every drop that has come down. */
function bloodGround(n,pool){
  const W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb, set=(x,y,c)=>{ if(x>=0&&y>=0&&x<W&&y<H) fb[y*W+x]=c; };
  if(pool>0){ const b=toWorld(herBody(),2.4,0,0), x=isoX(b[0],b[1]), y=isoY(b[0],b[1],0);
    spot(x,y,15*pool,6*pool,.9,rgb('#2e0706')); spot(x+3*pool,y+1,9*pool,3.6*pool,.85,rgb('#4a0b08')); spot(x-6*pool,y-1,6*pool,2.4*pool,.8,rgb('#3a0807')); spot(x-2*pool,y-1,4*pool,1.2*pool,.3,C.lamp); }
  for(const [i,j,sz] of bloodAt(n).land){ const x=Math.round(isoX(i,j)), y=Math.round(isoY(i,j,0)), c=rgb(sz>1?'#4d0b09':'#6a120d'); set(x,y,c); if(sz>1){ set(x+1,y,c); set(x,y+1,rgb('#3a0807')); } }
}

/* ---------- what the port asks for ---------- */

/** The player's pose in the current scene. */
const castNow=t=>state.kind==='before'?beforeCast(state.tick,t):afterCast(state.tick,t);
/** Head height of a cast member for the bubble and the camera. */
const headOf=(P,J)=>[P.i,P.j,(P.z0||0)+J.head[2]+4.5];
/** Lines spoken in each scene: from tick, to tick, who and what. */
const LINES={before:[[790,880,'hero','Hej! Nie rzygaj przy workach!'],[900,1010,'drunk','Zaraz ci wypierdolę!'],[1030,1150,'hero','Policjancie! Pomocy!'],[1160,1285,'cop','Odwal się, jestem zajęty!']],
  after:[[805,878,'woman','Pomocy!'],[915,995,'hero','Trzymaj się!'],[1095,1245,'cop','Coś ty jej zrobił?! Jesteś aresztowany!']]};
/** Camera shots: from tick, who is in the picture (repeat a name to weight it) and the zoom. */
const SHOTS={before:[[0,'drunk',1.8],[140,'drunk',1.55],[580,'drunk',2],[785,'hero hero drunk',1.7],[890,'drunk',1.9],[1020,'hero cop',1.35],[1155,'cop',1.9],[1280,'hero drunk',1.8]],
  after:[[0,'hero drunk',1.7],[80,'cop drunk',1.55],[300,'cop drunk',1.45],[450,'ripper',1.8],[600,'cop drunk',1.85],[800,'woman ripper',1.9],[900,'woman woman ripper hero',1.45],[985,'woman ripper',1.9],[1025,'woman hero',1.75],[1090,'cop hero',1.7]]};
/** Where each named cast member stands now, for the camera and the bubbles. */
function places(c){
  const p={hero:[c.hero.i,c.hero.j,(c.hero.z0||0)+c.hero.pose.head[2]+4.5]};
  if(c.drunk) p.drunk=headOf(c.drunk.P,c.drunk.J);
  if(c.cop?.P) p.cop=headOf(c.cop.P,c.cop.J); else if(c.cop) p.cop=[c.cop.i,c.cop.j,20];
  if(c.woman) p.woman=headOf(c.woman.P,c.woman.J);
  if(c.ripper) p.ripper=headOf(c.ripper.P,c.ripper.J);
  return p;
}
/** What the camera looks at in the current scene: a ground point, a height and the zoom. */
export function storyShot(t){
  const k=state.kind, n=state.tick, list=SHOTS[k]; let s=list[0]; for(const x of list) if(n>=x[0]) s=x;
  const p=places(castNow(t)), who=s[1].split(' ').map(w=>p[w]||p.hero);
  return {i:who.reduce((a,q)=>a+q[0],0)/who.length,j:who.reduce((a,q)=>a+q[1],0)/who.length,h:9,z:s[2]};
}
/** The line being spoken: its text, how much of it is out, and the world point above the speaker's head. */
export function storyLine(t){
  if(!storyPlaying()) return null;
  const n=state.tick, L=LINES[state.kind].find(l=>n>=l[0]&&n<l[1]); if(!L) return null;
  return {text:L[3],shown:Math.min(L[3].length,Math.ceil((n-L[0]+1)*1.5)),at:places(castNow(t))[L[2]]};
}
/** The words over the black at the end of the story. */
export function storyCaption(){ return state.kind==='after'&&state.tick>=1300?'Kilka godzin później…':''; }
/** How dark the picture is: the fade to black at the end of the story. */
export function storyFade(){ return state.kind==='after'?span(state.tick,1250,1310):0; }
/** How far the black bars of a scene have closed in (0..1). */
export function storyBars(){ return storyPlaying()?span(state.tick,0,40):0; }
/** How far the van's side door stands open (0..1). */
export function storyVanDoor(){ return state.kind==='after'?span(state.tick,655,690)-span(state.tick,790,815):0; }
/** The cast for the frame, as [depth, draw] pairs for the port's depth sorter. */
export function storyCast(t){
  const k=state.kind, out=[];
  if(!k){
    out.push([17.6,()=>{ const P=at(8.8,8.8,Math.PI/2), J=toiletJoints(); J.head=[J.head[0],J.head[1],J.head[2]+.08*Math.sin(t*.025)]; drunkFig(P,J); pee(P,t); }]);
    out.push([19.6,()=>whisperDraw(t,whisperStand(t))]);
    return out;
  }
  if(k==='end') return [[21,()=>puddle(puddleAt(),1)]];
  if(k==='fight'){
    out.push([21,()=>puddle(puddleAt(),1)],[19.6,()=>whisperDraw(t,1)]);
    return out;
  }
  const c=castNow(t);
  if(c.puddle) out.push([21,()=>puddle(puddleAt(),c.puddle)]);
  if(c.drunk){ const {P,J}=c.drunk;
    if(c.drunk.inVan) out.push([P.i+P.j,()=>behindFront(()=>drunkFig(P,J),doorHole,.35+.6*c.drunk.inVan,5.9)]);
    else out.push([P.i+P.j,()=>{ drunkFig(P,J); if(c.drunk.pee) pee(P,t); if(c.drunk.sick) spew(P,J,t); }]); }
  if(c.ripper){ const {P,J,a,bloody}=c.ripper; out.push([P.i+P.j,()=>ghost(()=>ripperFig(P,J,bloody),a)]); }
  if(k==='before') out.push([19.6,()=>whisperDraw(t,c.whisper.stand,c.whisper.turn,c.whisper.wave)]);
  else {
    const {P,J}=c.cop; out.push([P.i+P.j,()=>{ contact(P.i-.22,P.j-.22,P.i+.22,P.j+.22,0,.4); copFig(P,J); breath(P,J,t+120,17); }]);
    const Wm=c.woman, n=state.tick; out.push([Wm.P.i+Wm.P.j+(Wm.tilt?.6:0),()=>{
      contact(Wm.P.i-.3,Wm.P.j-.25,Wm.P.i+.3,Wm.P.j+.25,0,.6); womanFig(Wm.P,Wm.J,!!Wm.tilt,Wm.blood||0); if(!Wm.tilt) breath(Wm.P,Wm.J,t,11); }]);
    /* the blood: on the setts under everyone, and the drops still in the air in front of her */
    if(n>=STABS[0]){ out.push([-1,()=>bloodGround(n,c.pool)],[HELD[0]+HELD[1]+.9,()=>{ const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, red=rgb('#a01a12');
      for(const [i,j,z] of bloodAt(n).fly){ const x=Math.round(isoX(i,j)), y=Math.round(isoY(i,j,z)); if(x>=0&&y>=0&&x<W&&y<H) fb[y*W+x]=red; } }]); }
  }
  return out;
}
/** Where the sick lies in front of the crates by the sacks: under the drunk's mouth as he bends over. */
const puddleAt=()=>toWorld(at(...DRUNK_PATH[DRUNK_PATH.length-1],VOMIT_A),4.1,0,0);
/** The van's side doorway, in the plane of its near side (a along it, z up). */
const doorHole=(a,z)=>a>=7.88&&a<=8.72&&z>=4.4&&z<=14.4;
/** Piss against the crates by the quay edge. */
function pee(P,t){ const s=toWorld(P,2,0,7.2), e=[8.8,9.8,3.8]; drawToiletStream(isoX(s[0],s[1]),isoY(...s),isoX(e[0],e[1]),isoY(...e),t); }
