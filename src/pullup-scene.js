/* Pull-ups at the Ward's window, seen from behind the hero (native 144×96). The deep stone reveal of the window slot, its
   grille — the same square bars and cross bar as in the iso Ward — and London in the smog beyond: roofs, chimney smoke,
   the dome of St Paul's over the gaol wall. The hero hangs from the cross bar. His body is a height field (torso rows,
   capsule limbs, muscles as bumps) shaded by the tallow lamp on the left and rimmed by the window in front of him. The
   more of the opening his head and shoulders cover, the darker the room and the thinner the shafts of light. Cockroaches
   run the walls: they come out while the light is blocked and scatter when it returns. */

import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { h2 } from './boxing.js';
import { state as roomsState, skyBucket } from './rooms.js';
import { skyColors, weatherNow } from './weather.js';
import { vnoise, fbm } from './noise.js';

const CX = 72;
/** The cross bar's middle row; the hands close on it at CX ± GRIP.x. */
export const BAR_Y = 40;
export const GRIP = {x:32.5,y:BAR_Y};
/** Shoulder joint to elbow, elbow to the middle of the fist. */
export const ARM = {upper:22,fore:21};
/** The grille's opening, the reveal's mouth on the room side, the vanishing point of the reveal. */
export const OPEN = {x0:26,x1:118,y0:9,y1:71};
const INNER = {x0:12,x1:132,y0:-2,y1:79}, VP = {x:72,y:44};
/** Left edges of the five square bars (5 px), spaced like the iso grille: the first and last stand against the jambs. */
const BARS = [0,1,2,3,4].map(k=>OPEN.x0+21.6*k);
const SY_TOP = BAR_Y+5;
const DOME = {x:57,y:34};
/** Surfaces of the background, per pixel. */
const K_WALL=0, K_JAMB_L=1, K_JAMB_R=2, K_SOFFIT=3, K_SILL=4, K_BAR=5, K_SKY=6;
const M_SKIN=1, M_HAIR=2, M_PANT=3, M_EAR=4, M_HAND=5;
const LF = norm3(-0.5,-0.72,0.48), HV = norm3(-0.5,-0.72,1.48);

/** Scene state: the baked background with its per-pixel maps, the hero's smoothed movement and the small life around. */
export const state = {bg:null,pose:{},t:0,ps:0,pv:0,effort:0,cover:0,light:1};

/* ---------- colour helpers (ABGR) ---------- */

/** @param {number} v */
const cl = (v)=>v<0?0:v>255?255:Math.round(v);
/** @param {number} r @param {number} g @param {number} b */
const pack = (r,g,b)=>(0xff000000|(cl(b)<<16)|(cl(g)<<8)|cl(r))>>>0;
/** Blend colour a towards b by k. @param {number} a @param {number} b @param {number} k */
function mixc(a,b,k){ return pack((a&255)+((b&255)-(a&255))*k,((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*k,((a>>16)&255)+(((b>>16)&255)-((a>>16)&255))*k); }
/** Scale a colour's brightness. @param {number} a @param {number} k */
function mulc(a,k){ return pack((a&255)*k,((a>>8)&255)*k,((a>>16)&255)*k); }
/** @param {number} x @param {number} y @param {number} z */
function norm3(x,y,z){ const l=Math.hypot(x,y,z); return [x/l,y/l,z/l]; }
/** @param {number} a @param {number} b @param {number} x */
function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
/** @param {number} t */
const gauss = (t)=>Math.exp(-t*t);

/* ---------- the background ---------- */

/** Which surface a pixel shows: wall, a face of the reveal (with its depth t: 0 at the room, 1 at the grille, and the
 * coordinate along it), a bar or the open air. @param {number} x @param {number} y @returns {[number,number,number]} */
function surface(x,y){
  const px=x+0.5, py=y+0.5;
  if(px>=OPEN.x0&&px<OPEN.x1&&py>=OPEN.y0&&py<OPEN.y1) return [onBar(px,py)?K_BAR:K_SKY,1,0];
  if(px<INNER.x0||px>=INNER.x1||py<INNER.y0||py>=INNER.y1) return [K_WALL,0,0];
  const dx=px-VP.x, dy=py-VP.y, hx=dx/((dx<0?INNER.x0:INNER.x1)-VP.x), hy=dy/((dy<0?INNER.y0:INNER.y1)-VP.y);
  if(hx>=hy){ const g=((dx<0?OPEN.x0:OPEN.x1)-VP.x)/((dx<0?INNER.x0:INNER.x1)-VP.x); return [dx<0?K_JAMB_L:K_JAMB_R,Math.min(1,(1-hx)/(1-g)),VP.y+dy/hx]; }
  const g=((dy<0?OPEN.y0:OPEN.y1)-VP.y)/((dy<0?INNER.y0:INNER.y1)-VP.y); return [dy<0?K_SOFFIT:K_SILL,Math.min(1,(1-hy)/(1-g)),VP.x+dx/hy];
}
/** @param {number} px @param {number} py */
function onBar(px,py){ return Math.abs(py-BAR_Y-0.5)<2.5||BARS.some(b=>px>=b&&px<b+5); }

/** Old brick under peeling limewash, soot from the vault, the slot's rust and water running down under the sill.
 * @param {number} x @param {number} y */
function wallCol(x,y){
  const yy=y+40, course=(yy/5)|0, off=(course&1)*6.5, bx=Math.floor((x+off)/13), mort=yy%5===0||Math.floor(x+off)%13===0;
  const id=h2(bx+3,course*5+1), brick=[rgb('#5e3a2c'),rgb('#6b4332'),rgb('#553328'),rgb('#714a36')][id&3];
  let c=mort?rgb('#3c3530'):mulc(brick,0.9+((id>>2)&15)/15*0.2);
  const lime=vnoise(x*0.07+2,y*0.09)*0.7+vnoise(x*0.21,y*0.23+4)*0.3;
  if(lime>0.47) c=mixc(rgb('#a29d8c'),rgb('#8c8778'),vnoise(x*0.3,y*0.3)); else if(lime>0.45) c=mixc(c,rgb('#3a332c'),0.5);   // the limewash and the lip where it flaked off
  c=mixc(c,rgb('#14110e'),Math.max(0,Math.min(0.75,0.18+0.4*vnoise(x*0.05+9,y*0.04)+(y<20?(20-y)*0.02:0))));
  if(x>=OPEN.x0-4&&x<OPEN.x1+4&&y>=INNER.y1){ const run=4+16*vnoise(x*0.33,7.1); if(y-INNER.y1<run) c=mixc(c,(x&7)<3?rgb('#4a2a16'):rgb('#1c2418'),0.5*(1-(y-INNER.y1)/run)); }
  if(y>86) c=mixc(c,rgb('#1f241c'),Math.min(0.5,(y-86)*0.06));
  return mulc(c,1.08-x/144*0.3);                                                                // the lamp is on the left
}
/** Dressed stone of the reveal: blocks along it, two stones deep. @param {number} k @param {number} t @param {number} v @param {number} x @param {number} y */
function revealCol(k,t,v,x,y){
  const side=k===K_JAMB_L||k===K_JAMB_R, row=Math.floor((v+3)/(side?11:15)), deep=t>(row&1?0.45:0.6)?1:0;
  const along=side?((v+3)%11):((v+3)%15), joint=along<0.9||Math.abs(t-(row&1?0.45:0.6))<0.05;
  const id=h2(row*3+k,deep+7), base=[rgb('#77736a'),rgb('#6c685f'),rgb('#807b70')][id%3];
  let c=joint?rgb('#3b3732'):mulc(base,0.92+(id>>4&7)*0.02), lit;
  if(k===K_SILL){ lit=0.62+0.5*t;
    const u=v, ub=BARS.map(b=>VP.x+(b+2.5-VP.x)/0.767).find(b=>Math.abs(u-b)<1.6+1.8*(1-t));
    if(ub!==undefined){ lit*=0.72; if(vnoise(u*0.8,t*6)>0.42) c=mixc(c,rgb('#6a3a1c'),0.45*t+0.1); } }   // the bars' shadows and their rust run in towards the room
  else if(k===K_SOFFIT){ lit=0.34+0.3*t; c=mixc(c,rgb('#1a1612'),0.25+0.3*vnoise(x*0.2,t*3)); }
  else lit=(k===K_JAMB_L?0.5:0.42)+0.5*t;
  if(t<0.07) lit*=1.14;                                                                          // the worn arris
  return mulc(c,lit*(0.55+0.45*state.lum));
}
/** Square iron bars against the sky: a lit edge, a dark edge, rust. @param {number} x @param {number} y @param {number} light */
function barCol(x,y,light){
  const iron=rgb('#2c2824'), rimc=mixc(iron,light,0.45);
  let c;
  if(Math.abs(y+0.5-BAR_Y-0.5)<2.5){ const r=y-(BAR_Y-2); c=r===0?rimc:r===1?rgb('#4a4540'):r===4?rgb('#141210'):iron;
    if(BARS.some(b=>x===b+1||x===b+3)&&r===2) c=rgb('#5a544c'); }                                 // bolts where the bars cross
  else { const b=BARS.find(b=>x>=b&&x<b+5)??0, col=x-b; c=col===0?rimc:col===1?rgb('#3e3a35'):col===4?rgb('#141210'):iron; }
  const rust=vnoise(x*0.6+1,y*0.35);
  if(rust>0.66) c=mixc(c,rgb('#6e3b1c'),0.6); else if(rust>0.6) c=mixc(c,rgb('#4c2a16'),0.5);
  return c;
}

/** London through the slot: the smog sky, St Paul's dome, the roofs of Old Bailey, the gaol's spiked wall.
 * @param {number} x @param {number} y @param {number[]} S @returns {[number,number]} colour and depth (3 sky … 0 the wall) */
function outsideCol(x,y,S){
  const L=state, px=x+0.5, py=y+0.5, k=(y-OPEN.y0)/(OPEN.y1-OPEN.y0), smog=L.smog;
  let c=mixc(S[0],S[1],Math.min(1,k*1.4)); c=mixc(c,smog,0.62+0.18*k); c=mixc(c,L.light0,Math.max(0,0.25-Math.abs(py-50)*0.02));
  const roof=L.roof[x]??99, eave=L.eave[x]??99;
  if(py>=57){                                                                                    /* the gaol's outer wall: coping, chevaux-de-frise */
    const block=h2((x+(((y-57)/5|0)&1)*4)>>3,(y-57)/5|0); let w=py<59?rgb('#4a4842'):mulc(rgb('#33302c'),0.85+(block&7)*0.03);
    if(py>=59&&((y-59)%5===0)) w=rgb('#24221f'); return [mixc(w,smog,0.18),0]; }
  if(py>=53.5&&Math.abs(((px*0.5)%2)-1)*2.6<py-53.5) return [mixc(rgb('#1e1c1a'),smog,0.2),0];
  if(py>=roof){                                                                                  /* the terraces: slate roofs, a band of top-floor windows */
    let r;
    if(py<eave) r=mulc(rgb('#3d4046'),((y-roof)|0)%2?0.92:1.02);
    else { const win=(x%6<2)&&(py-eave>1.2)&&(py-eave<3.6), lit=L.night&&h2(x>>2,9)<110; r=win?(lit?rgb('#d89a48'):rgb('#1c1a18')):rgb('#4b3a30'); if(win&&lit) return [r,1]; }
    return [mixc(r,smog,0.38),1]; }
  const dx=px-DOME.x, far0=mixc(rgb('#2e3136'),smog,0.5);
  const body=(py>=DOME.y+6&&Math.abs(dx)<15)||(py>=DOME.y+3&&py<DOME.y+7&&Math.abs(dx)<10)||(py>=DOME.y&&py<DOME.y+3&&Math.abs(dx)<8);
  const far=far0, cup=py<DOME.y&&(dx/10)**2+((py-DOME.y)/9)**2<1, lan=py>=DOME.y-13&&py<DOME.y-8.5&&Math.abs(dx)<1.7;
  const ball=py>=DOME.y-15&&py<DOME.y-13&&Math.abs(dx)<1, cross=(py>=DOME.y-18&&py<DOME.y-15&&Math.abs(dx)<0.6)||(Math.abs(py-DOME.y+16.5)<0.6&&Math.abs(dx)<1.6);
  if(body||cup||lan||ball||cross){
    let d=far; if(cup) d=mulc(far,dx<-4?1.16:dx<1?1.06:0.92); else if(py>=DOME.y+3&&py<DOME.y+6) d=mulc(far,(x&1)?0.9:1.05);
    return [L.night?mulc(d,0.6):d,2]; }
  return [c,3];
}

/** Bake the scene for the current hour and weather, and reset the life in it. The renderer's buffer is untouched. */
export function buildPullupBackground(){
  const w=appearanceState.W, h=appearanceState.H, N=w*h, L=state, b=skyBucket(), wx=weatherNow(), sky=skyColors(b,roomsState.SKY[b]).map(rgb);
  L.lum=[0.3,0.62,1,0.7,0.42][b]*(wx==='rain'?0.8:1); L.night=b===0||b===4; L.rain=wx==='rain';
  L.smog=mixc(rgb('#8a8676'),sky[1],0.25); if(L.night) L.smog=mulc(L.smog,0.32);
  L.light0=mixc(sky[1],rgb('#d8d0b8'),0.5); L.lightC=mulc(mixc(L.smog,rgb('#e6dcc0'),0.55),0.6+0.5*L.lum);
  L.roof=[]; L.eave=[]; L.plumes=[];
  for(let x=OPEN.x0,n=0;x<OPEN.x1;n++){                                                          // terraced houses with chimney stacks
    const wd=9+h2(n,1)%8, ridge=44+h2(n,2)%5, eave=ridge+4+h2(n,3)%2, sx=x+2+h2(n,4)%Math.max(1,wd-5), st=ridge-4-h2(n,5)%3;
    for(let i=x;i<x+wd;i++){ L.roof[i]=i>=sx&&i<sx+3?st:ridge; L.eave[i]=eave; }
    if(h2(n,6)<190) L.plumes.push({x:sx+1.5,y:st,s:0.6+h2(n,7)/255*0.5,ph:h2(n,8)/40});
    x+=wd; }
  L.bg=new Uint32Array(N); L.kind=new Uint8Array(N); L.glow=new Float32Array(N); L.roomK=new Float32Array(N); L.depth=new Uint8Array(N);
  let open=0;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x, [k,t,v]=surface(x,y); L.kind[i]=k;
    if(k===K_SKY){ const [c,d]=outsideCol(x,y,sky); L.bg[i]=c; L.depth[i]=d; L.glow[i]=L.lum*(d>=2?1:0.7); open+=L.glow[i]; }
    else if(k===K_BAR){ L.bg[i]=barCol(x,y,L.light0); L.glow[i]=0.06; }
    else if(k===K_WALL){ L.bg[i]=mulc(wallCol(x,y),0.5+0.3*L.lum); L.roomK[i]=1; }
    else { L.bg[i]=revealCol(k,t,v,x,y); L.glow[i]=L.lum*0.35*t; L.roomK[i]=0.25+0.35*(1-t); } }
  L.openGlow=open; L.t=0; L.ps=0; L.pv=0; L.effort=0; L.phase=''; L.reps=0; L.asym=0; L.sheen=0;
  L.z=new Float32Array(N); L.mat=new Uint8Array(N); L.rays=new Float32Array(73*49); L.src=new Float32Array(72*48);
  L.roaches=[0,1,2,3,4].map(id=>spawnRoach(id,true)); L.puffs=[]; L.drips=[]; L.birds=[]; L.birdT=120;
  L.motes=Array.from({length:18},(_,k)=>({x:20+h2(k,1)/255*104,y:4+h2(k,2)/255*88,ph:k}));
  return L.bg;
}

/* ---------- the hero ---------- */

/** One sim tick of the scene: the body follows the exercise with a little spring (a jolt at the dead hang), effort,
 * breath, sweat, the roaches, the birds and the dust. @param {{p:number,phase:string,held:boolean,reps:number,strain:number}} g */
export function pullupSceneTick(g){
  const L=state; if(!L.bg) return; L.t++;
  L.pv+=(g.p-L.ps)*0.32; L.pv*=0.6; L.ps+=L.pv; L.ps=Math.max(-0.12,Math.min(1.04,L.ps));
  L.effort+=((g.phase==='up'&&g.held?1:0)-L.effort)*0.08; L.strain=g.strain; L.fatigue=Math.min(1,g.reps/14);
  if(g.phase==='up'&&L.phase!=='up') L.asym=(Math.random()-0.5)*0.12;
  if(g.phase==='down'&&L.phase==='up'){ const P=L.pose; L.puffs.push({x:P.hx+(Math.random()<0.5?-5:5),y:P.hy+2,age:0,life:70,vx:(Math.random()-0.5)*0.1}); }   // he breathes out at the top
  if(g.reps>L.reps&&g.reps>=3&&L.drips.length<6) L.drips.push({x:(Math.random()-0.5)*14,y:-2,v:0,stick:0});
  L.reps=g.reps; L.phase=g.phase; L.sheen=Math.min(0.85,0.22+g.reps*0.06);
  if((g.phase==='rest'||g.phase==='hang'||g.phase==='lock')&&h2(L.t>>5,31)<14&&(L.t&31)===0) L.puffs.push({x:L.pose.hx+(Math.random()-0.5)*8,y:(L.pose.hy||60)+3,age:0,life:50,vx:(Math.random()-0.5)*0.08});
  for(const p of L.puffs) p.age++; L.puffs=L.puffs.filter(p=>p.age<p.life);
  for(const d of L.drips){ if(d.stick>0) d.stick--; else { d.v=Math.min(0.22,d.v+0.006); d.y+=d.v; if(Math.random()<0.02){ d.stick=20+Math.random()*60; d.v=0; } } }
  L.drips=L.drips.filter(d=>d.y<60);
  for(const m of L.motes){ m.x+=Math.sin(L.t*0.011+m.ph*1.7)*0.05+0.012; m.y+=Math.cos(L.t*0.009+m.ph)*0.04-0.006; if(m.x>126) m.x=18; if(m.y<2) m.y=92; }
  for(const r of L.roaches) roachTick(r);
  if(--L.birdT<=0){ const left=Math.random()<0.5; L.birds.push({x:left?OPEN.x0-6:OPEN.x1+6,y:14+Math.random()*22,vx:(left?1:-1)*(0.3+Math.random()*0.25),ph:Math.random()*6}); L.birdT=300+Math.random()*700; }
  for(const b of L.birds){ b.x+=b.vx; b.y+=Math.sin(L.t*0.03+b.ph)*0.04; } L.birds=L.birds.filter(b=>b.x>OPEN.x0-8&&b.x<OPEN.x1+8);
}

/** Two-bone arm with the elbow kept outward and down. @param {number} sx @param {number} sy @param {number} gx @param {number} gy @param {number} side */
function armIK(sx,sy,gx,gy,side){
  const U=ARM.upper, F=ARM.fore, max=(U+F)*0.995; let dx=gx-sx, dy=gy-sy, d=Math.hypot(dx,dy);
  if(d>max){ sx=gx-dx*max/d; sy=gy-dy*max/d; dx=gx-sx; dy=gy-sy; d=max; }
  const a=(U*U-F*F+d*d)/(2*d), hh=Math.sqrt(Math.max(0,U*U-a*a)), bx=sx+dx*a/d, by=sy+dy*a/d, nx=-dy/d, ny=dx/d;
  const e1=[bx+nx*hh,by+ny*hh], e2=[bx-nx*hh,by-ny*hh], e=side*(e1[0]-CX)>side*(e2[0]-CX)?e1:e2;
  return {sx,sy,ex:e[0],ey:e[1],gx,gy};
}

/** The hero's skeleton for the smoothed progress: shoulder blades up by the ears at the dead hang, pulled down and
 * together on the way up, lats flaring, elbows driving down beside the ribs, the head tipping back over the bar. */
function solvePose(){
  const L=state, P=L.pose, p=L.ps, pc=Math.max(0,Math.min(1,p)), t=L.t;
  const shrug=1-smooth(0,0.16,pc)+Math.max(0,-p)*3, ret=smooth(0.08,0.78,pc), act=Math.min(1,smooth(0.04,0.55,pc)+L.effort*0.25), tilt=smooth(0.72,1,pc);
  const e=pc*pc*(3-2*pc)*0.35+pc*0.65, sw=16+1.2*ret-1.4*Math.min(1.4,shrug);
  const shake=(L.strain*0.7+L.effort*L.fatigue*0.35)*(Math.sin(t*1.9)*0.6+Math.sin(t*3.1+1)*0.4);
  const breath=(L.phase==='rest'||L.phase==='hang'||L.phase==='lock')?Math.sin(t*(0.07+L.fatigue*0.05)):0;
  const hang=BAR_Y+Math.sqrt(((ARM.upper+ARM.fore)*0.985)**2-(GRIP.x-sw)**2), sy=hang+(SY_TOP-hang)*e+shake*0.5;
  const lead=L.asym*Math.sin(Math.PI*pc)*6, tx=shake*0.4;
  P.l=armIK(CX+tx-sw,sy-lead,CX-GRIP.x,GRIP.y,-1); P.r=armIK(CX+tx+sw,sy+lead,CX+GRIP.x,GRIP.y,1);
  P.cx=CX+tx; P.ty=(P.l.sy+P.r.sy)/2+3*Math.min(1.3,shrug); P.tilt=(P.r.sy-P.l.sy)/(2*sw);
  P.sw=sw; P.shrug=shrug; P.ret=ret; P.act=act; P.headTilt=tilt; P.breath=breath; P.trapH=6+4*Math.min(1.3,shrug);
  P.hx=P.cx-P.tilt*5; P.hy=P.ty-14.6-1.2*tilt; P.flexL=1-Math.hypot(P.l.gx-P.l.sx,P.l.gy-P.l.sy)/(ARM.upper+ARM.fore); P.flexR=1-Math.hypot(P.r.gx-P.r.sx,P.r.gy-P.r.sy)/(ARM.upper+ARM.fore);
}

/** Half-width of the back at Y px below the top of the ribcage: the traps' slope, the shoulders, the lats' flare, the
 * waist, the hips in the trousers. @param {number} Y */
function backHalf(Y){
  const P=state.pose, top=P.sw-1;
  if(Y<0){ const q=Math.min(1,-Y/P.trapH); return 5.7+(top-5.7)*Math.pow(Math.max(0,1-q),0.7); }
  if(Y>=40) return 12.4+(Y-40)*0.14;
  const lat=(1.2+2.1*P.act)*gauss((Y-(7+3*(1-P.act)))/6.5);
  return 12.2+(top-12.2)*Math.pow(1-Y/40,1.25)+lat+P.breath*0.5*gauss((Y-14)/10);
}
/** Height of the muscles over the round of the back, after a back mid-pull: the spine's groove between thick erectors,
 * the lower traps' diamond to a point at mid-back, the shoulder blades with their spines (wide and tipped up at the
 * dead hang, drawn down and in on the pull), teres and infraspinatus bunching towards the armpit, the lats' long wings.
 * @param {number} X @param {number} Y @param {number} hw */
function backBumps(X,Y,hw){
  const P=state.pose, ax=Math.abs(X);
  let z=-1.5*gauss(X/1.25)*smooth(1,9,Y);                                                         // the spine's groove
  z+=1.4*gauss((ax-4.4)/2.3)*smooth(15,31,Y)*(1+0.3*smooth(31,40,Y));                            // the erectors
  const tip=20+3*(1-P.ret), tw=Y<3?hw-3:(hw-3)*Math.max(0,(tip-Y)/(tip-3))*0.85;                  // lower and middle traps
  if(Y<tip) z+=(0.2+0.25*P.ret)*(1-smooth(tw-4,tw,ax))*smooth(-2,1,Y);
  const cx=10.5+3.5*(1-P.ret)+1.5*P.shrug, cy=9-2.5*P.shrug+1.5*P.ret, an=0.5*P.shrug-0.1*P.ret;  // the shoulder blade
  const a=(ax-cx)*Math.cos(an)-(Y-cy)*Math.sin(an), b=(ax-cx)*Math.sin(an)+(Y-cy)*Math.cos(an), rw=5.4*(1-0.45*Math.max(0,b)/7.8);
  z+=(0.9+0.5*P.act)*(1-smooth(0.35,1.05,(a/rw)**2+(b/7.8)**2));
  z+=(0.6+1.3*P.act)*gauss(Math.hypot(ax-(hw-4.5),Y-(12+2*(1-P.act)))/3.6);                     // teres and infraspinatus
  z+=0.4*P.ret*gauss((ax-3.3)/1.8)*gauss((Y-11)/5);                                              // rhomboids between the blades
  const ax0=hw-1, ay0=6, vx=6.5-ax0, vy=33-ay0, tt=Math.max(0,Math.min(1,((ax-ax0)*vx+(Y-ay0)*vy)/(vx*vx+vy*vy)));
  z+=(0.8+2.2*P.act)*gauss(Math.hypot(ax-ax0-vx*tt,Y-ay0-vy*tt)/4.6)*Math.sin(Math.PI*tt)**0.7;   // the lats
  z+=0.8*gauss((Y+1)/3.2)*gauss((ax-6)/3.2);                                                     // the upper traps over the shoulder line
  return z;
}

/** Rasterise the body into the depth and material maps; returns its bounding box. */
function rasterBody(){
  const L=state, P=L.pose, Z=L.z, M=L.mat, w=appearanceState.W, h=appearanceState.H; Z.fill(-1e9);
  let x0=w, x1=0, y0=h, y1=0;
  const plot=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ z,/** @type {number} */ m)=>{ if(x<0||y<0||x>=w||y>=h) return; const i=y*w+x; if(z>Z[i]){ Z[i]=z; M[i]=m; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } };
  const cap=(/** @type {number[]} */ a,/** @type {number[]} */ b,/** @type {number} */ r0,/** @type {number} */ r1,/** @type {number} */ z0,/** @type {number} */ z1,/** @type {number} */ m,/** @type {number} */ bl)=>{
    const rm=Math.max(r0,r1)+bl, dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy||1;
    for(let y=Math.floor(Math.min(a[1],b[1])-rm);y<=Math.ceil(Math.max(a[1],b[1])+rm);y++) for(let x=Math.floor(Math.min(a[0],b[0])-rm);x<=Math.ceil(Math.max(a[0],b[0])+rm);x++){
      const px=x+0.5, py=y+0.5, t=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/l2)), ex=px-a[0]-dx*t, ey=py-a[1]-dy*t, r=r0+(r1-r0)*t+bl*4*t*(1-t), d2=ex*ex+ey*ey;
      if(d2<r*r) plot(x,y,z0+(z1-z0)*t+Math.sqrt(r*r-d2),m); } };
  const ell=(/** @type {number} */ cx,/** @type {number} */ cy,/** @type {number} */ rx,/** @type {number} */ ry,/** @type {number} */ z0,/** @type {number} */ rz,/** @type {(x:number,y:number)=>number} */ m,e=2)=>{
    for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){ const q=Math.abs((x+0.5-cx)/rx)**e+Math.abs((y+0.5-cy)/ry)**e; if(q<1) plot(x,y,z0+rz*Math.sqrt(1-q),m(x,y)); } };
  /** A muscle riding on a limb: offset across it, lifted just over its round. @param {number[]} a @param {number[]} b @param {number[]} lat @param {number[]} br @param {number[]} bz @param {number} t0 @param {number} t1 @param {number} o0 @param {number} o1 @param {number} r0 @param {number} r1 @param {number} lift */
  const muscle=(a,b,lat,br,bz,t0,t1,o0,o1,r0,r1,lift)=>{ const at=(/** @type {number} */ t,/** @type {number} */ o,/** @type {number} */ r)=>{ const R=br[0]+(br[1]-br[0])*Math.max(0,t);
      return [[a[0]+(b[0]-a[0])*t+lat[0]*o,a[1]+(b[1]-a[1])*t+lat[1]*o],bz[0]+(bz[1]-bz[0])*t+Math.sqrt(Math.max(0,R*R-o*o))-r+lift]; };
    const [p0,z0]=at(t0,o0,r0), [p1,z1]=at(t1,o1,r1); cap(p0,p1,r0,r1,z0,z1,M_SKIN,0); };
  /** The side of a limb facing up and out (the outer heads), from its direction. @param {number} dx @param {number} dy @param {number} s */
  const outer=(dx,dy,s)=>{ const l=Math.hypot(dx,dy)||1, n=[-dy/l,dx/l]; return n[0]*s*0.6-n[1]*0.8>0?n:[-n[0],-n[1]]; };
  for(const [A,s,flex] of /** @type {[any,number,number][]} */ ([[P.l,-1,P.flexL],[P.r,1,P.flexR]])){   // arms: deltoid, triceps, forearm, fist over the bar
    const S=[A.sx,A.sy], E=[A.ex,A.ey], fl=Math.hypot(A.gx-A.ex,A.gy-A.ey)||1, wr=[A.gx+(A.ex-A.gx)/fl*3.2,A.gy+(A.ey-A.gy)/fl*3.2];
    const lu=outer(E[0]-S[0],E[1]-S[1],s), lf=outer(wr[0]-E[0],wr[1]-E[1],s), ur=[4.6,3.4], uz=[2.4,1], fr=[3.8,2.8], fz=[1,-3], fN=Math.min(1,flex/0.6);
    cap(E,wr,fr[0],fr[1],fz[0],fz[1],M_SKIN,0.4);
    muscle(E,wr,lf,fr,fz,0.12,0.58,1.3,0.7,3.5,2.2,0.8+0.4*L.effort);                               /* extensors and brachioradialis, thick just below the elbow */
    muscle(E,wr,lf,fr,fz,0.1,0.48,-1.1,-0.7,3,2.1,0.6+0.3*L.effort);                             /*   and the flexors */
    cap(S,E,ur[0],ur[1],uz[0],uz[1],M_SKIN,0.9+0.3*flex);
    muscle(S,E,lu,ur,uz,0.12,0.72,-2,-1.2,3.7,2.5,1.2+0.4*fN);                                 /* triceps, long head by the armpit */
    muscle(S,E,lu,ur,uz,0.12,0.45,1.6,1.4,3,2.3,0.7+0.2*fN);                                   /*   and lateral head */
    muscle(S,E,lu,ur,uz,0.4-0.12*fN,0.84-0.06*fN,1.6,1.3,3.1+0.9*fN,2.2,0.9+1.5*fN);
    muscle(S,E,lu,ur,uz,-0.02,0.4,0.5,0.3,4.8,2.3,1+0.3*L.effort);                               /* the deltoid's cap to its insertion */                /* the biceps: gathers into a peak as the elbow bends, narrows into it */
    ell(A.gx,A.gy-0.7,3.5,3.9,-3,2.6,()=>M_HAND); }
  cap([P.hx,P.hy+4],[P.cx,P.ty-1],5.1,5.8,0.5,0.5,M_SKIN,0);
  for(const s of [-1,1]) cap([P.hx+s*2.2,P.hy+5],[P.cx+s*2.9,P.ty-3],2.5,2.7,3,2.8,M_SKIN,0);   /* the neck's two columns, a groove between */                                       // the neck
  const hairline=(/** @type {number} */ x)=>P.hy+4.1-0.9*((x+0.5-P.hx)/6.9)**2-1.4*P.headTilt;
  ell(P.hx,P.hy,6.9,7.9,1.5,7,(x,y)=>y+0.5>hairline(x)?M_SKIN:M_HAIR,2.5);                              // the head, cropped close
  for(const s of [-1,1]) ell(P.hx+s*6.4,P.hy+1.5,1.3,2.5,0.8,1.4,()=>M_EAR);
  for(let y=Math.floor(P.ty-P.trapH-1);y<h;y++){                                                   // the back, row by row
    const Y0=y+0.5-P.ty, hw0=backHalf(Y0);
    for(let x=Math.floor(P.cx-hw0-2);x<=Math.ceil(P.cx+hw0+2);x++){ const X=x+0.5-P.cx, Y=Y0-P.tilt*X, hw=backHalf(Y), u=X/hw; if(Y<-P.trapH||Math.abs(u)>=1) continue;
      const round=5.6*Math.sqrt(1-u**4);
      if(Y>=40) plot(x,y,round+0.6*Math.sin(X*0.9+Y*0.3)*smooth(42,48,Y),M_PANT);
      else plot(x,y,round+backBumps(X,Y,hw),M_SKIN); } }
  return [x0,x1,y0,y1];
}

/** Light the body: six skin tones from the lamp, the window's rim on every edge that has the opening behind it, the
 * sweat's shine, dark creases where one part passes over another. @param {number[]} box */
function shadeBody(box){
  const L=state, P=L.pose, Z=L.z, M=L.mat, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, PAL=appearanceState.PAL, A=appearanceState;
  const skin=[PAL[A.R_SKX*3],PAL[A.R_SKIN*3],PAL[A.R_SKX*3+1],PAL[A.R_SKIN*3+1],PAL[A.R_SKX*3+2],PAL[A.R_SKIN*3+2]];
  const hair=[mixc(PAL[A.R_HAIR*3],0xff000000,0.45),PAL[A.R_HAIR*3],PAL[A.R_HAIR*3+1],PAL[A.R_HAIR*3+2]];
  const pant=[mixc(PAL[A.R_PANT*3],0xff000000,0.4),PAL[A.R_PANT*3],PAL[A.R_PANT*3+1],PAL[A.R_PANT*3+2]];
  const rimc=mixc(skin[5],L.lightC,0.55), room=(0.5+0.5*L.light)*(0.62+0.38*L.lum);
  for(let y=box[2];y<=box[3];y++) for(let x=box[0];x<=box[1];x++){ const i=y*w+x, z=Z[i]; if(z<-1e8) continue;
    const zl=x>0&&Z[i-1]>-1e8?Z[i-1]:z-3, zr=x<w-1&&Z[i+1]>-1e8?Z[i+1]:z-3, zu=y>0&&Z[i-w]>-1e8?Z[i-w]:z-3, zd=y<h-1&&Z[i+w]>-1e8?Z[i+w]:z-3;
    const dzx=Math.max(-3,Math.min(3,(zr-zl)/2)), dzy=Math.max(-3,Math.min(3,(zd-zu)/2)), nl=1/Math.hypot(dzx,dzy,1), nx=-dzx*nl, ny=-dzy*nl, nz=nl;
    const m=M[i], over=Math.max(zl,zr,zu,zd)-z>2.6;
    let I=(0.1+0.82*Math.max(0,nx*LF[0]+ny*LF[1]+nz*LF[2]))*room; if(over) I*=0.5;
    const sp=(m===M_SKIN||m===M_HAND)?Math.pow(Math.max(0,nx*HV[0]+ny*HV[1]+nz*HV[2]),18)*L.sheen:0;
    let c;
    if(m===M_HAIR) c=hair[Math.max(0,Math.min(3,Math.floor(I*3.6)))];
    else if(m===M_PANT){ c=pant[Math.max(0,Math.min(3,Math.floor(I*3.6)))]; const Y=y+0.5-P.ty-P.tilt*(x+0.5-P.cx); if(Y<42) c=mixc(c,0xff000000,0.3); }
    else { let k=Math.max(over?0:1,Math.floor(I*5)+1-(over?2:0)+(m===M_EAR?-1:0)); if(m===M_HAND&&y+0.5<P.l.gy-2.6) k++; c=skin[Math.min(5,k)]; if(sp>0.45) c=mixc(c,0xffffffff,sp>0.75?0.55:0.3); }
    const sx=Math.round(x+nx*3.4), sy=Math.round(y+ny*3.4), gl=sx>=0&&sy>=0&&sx<w&&sy<h&&Z[sy*w+sx]<-1e8?L.glow[sy*w+sx]:0, rim=(1-nz)*gl*2.2;
    if(rim>0.3) c=mixc(c,m===M_HAIR?mixc(hair[2],L.lightC,0.4):m===M_PANT?mixc(pant[3],L.lightC,0.5):rimc,rim>0.5?0.75:0.4);
    fb[i]=c; }
  for(const d of L.drips){ const x=Math.round(P.cx+d.x), y=Math.round(P.ty+8+d.y);   // sweat running down the back
    for(let k=0;k<2;k++){ const yy=y-k; if(x<0||yy<0||x>=w||yy>=h) continue; const i=yy*w+x; if(M[i]===M_SKIN&&Z[i]>-1e8) fb[i]=mixc(fb[i],0xffffffff,k?0.2:0.45); } }
}

/* ---------- the life around him ---------- */

/** @param {number} id @param {boolean} first */
function spawnRoach(id,first){
  let x=0, y=0;
  if(first) for(let k=0;k<40;k++){ x=4+Math.random()*136; y=2+Math.random()*92; if(walkable(x,y)&&(k>30||state.kind[(y|0)*appearanceState.W+(x|0)]!==K_WALL)) break; }
  else { const edge=h2(id,state.t|0)%3; x=edge===0?1:edge===1?142:20+Math.random()*100; y=edge===2?95:30+Math.random()*60; }
  return {id,x,y,a:Math.random()*6.28,v:0,vt:0.5,mode:first?0:2,timer:first?Math.random()*200:400+Math.random()*900,leg:0};
}
/** Can a roach stand here: wall or reveal, not the open air, not under the meter. @param {number} x @param {number} y */
function walkable(x,y){
  const w=appearanceState.W, h=appearanceState.H; if(x<0||y<0||x>=w||y>=h) return false;
  if(x>=129&&x<140&&y>=8&&y<78) return false;
  const k=state.kind[(y|0)*w+(x|0)]; return k!==K_SKY&&k!==K_BAR;
}
/** Dart, stop, twitch the feelers; head for the window while the hero blocks it, scatter when the light comes back.
 * @param {any} r */
function roachTick(r){
  const L=state;
  if(r.mode===2){ if(--r.timer<=0) Object.assign(r,{mode:1,timer:60,a:Math.atan2(48-r.y,72-r.x)}); return; }
  if(r.mode===0){ r.v*=0.6; if(--r.timer<=0){ r.mode=1; r.timer=25+Math.random()*110; r.a+=(Math.random()-0.5)*2.4; r.vt=0.35+Math.random()*0.5; } return; }
  const dark=L.light<0.75, toWin=Math.atan2(BAR_Y-r.y,CX-r.x), bright=L.glow[(r.y|0)*appearanceState.W+(r.x|0)]>0.15;
  let want=r.a+(vnoise(L.t*0.05,r.id*7.3)-0.5)*0.5;
  if(dark&&!bright) want=r.a+Math.sin(toWin-r.a)*0.12; else if(!dark&&(bright||L.light>0.9)) want=r.a-Math.sin(toWin-r.a)*0.16;
  r.a=want; const vt=(!dark&&bright)?0.95:r.vt; r.v+=(vt-r.v)*0.2;
  const nx=r.x+Math.cos(r.a)*r.v, ny=r.y+Math.sin(r.a)*r.v;
  if(walkable(nx,ny)){ r.x=nx; r.y=ny; } else { r.a+=(Math.random()<0.5?1:-1)*(1.2+Math.random()); r.v*=0.3; }
  if(r.x<0.5||r.x>143.5||r.y>95.5||r.y<0.5){ Object.assign(r,spawnRoach(r.id,false)); return; }
  r.leg+=r.v*1.4;
  if(--r.timer<=0){ r.mode=0; r.timer=20+Math.random()*(dark?60:180); }
}
/** A glossy brown body along its heading, legs rowing while it runs, feelers. @param {any} r */
function drawRoach(r){
  if(r.mode===2) return;
  const fb=rendererState.fb, w=appearanceState.W, Z=state.z, ca=Math.cos(r.a), sa=Math.sin(r.a);
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c,/** @type {number} */ k)=>{ x=Math.floor(x); y=Math.floor(y); if(x<0||y<0||x>=w||y>=appearanceState.H||!walkable(x,y)) return; const i=y*w+x; fb[i]=k>=1?c:mixc(fb[i],c,k); };
  for(let y=Math.floor(r.y-3);y<=r.y+3;y++) for(let x=Math.floor(r.x-3);x<=r.x+3;x++){ const dx=x+0.5-r.x, dy=y+0.5-r.y, a=dx*ca+dy*sa, c=-dx*sa+dy*ca, q=(a/2.6)**2+(c/1.3)**2;
    if(q<1) put(x,y,a>1.6?rgb('#1e0f07'):(Math.abs(c+0.3)<0.5&&a>-0.8&&a<0.9?rgb('#b8743e'):a<-1?rgb('#4a240f'):rgb('#6a3818')),1); }
  if(r.v>0.1) for(const [la,s,ph] of [[1,1,0],[0,-1,0],[-1,1,0],[1,-1,1],[0,1,1],[-1,-1,1]]){ const sw=Math.sin(r.leg+ph*Math.PI)*0.9; put(r.x+ca*(la+sw)-sa*s*1.8,r.y+sa*(la+sw)+ca*s*1.8,rgb('#2a160a'),0.8); }
  const tw=Math.sin(state.t*0.4+r.id)*0.25;
  for(const s of [-1,1]) for(let k=1;k<=3;k++){ const an=r.a+s*(0.35+tw*s), d=2.6+k; put(r.x+Math.cos(an)*d,r.y+Math.sin(an)*d,rgb('#6a4428'),0.7-k*0.12); }
}

/** Light shafts from the opening into the hazy room, cut by the hero: a radial gather over a half-size map. */
function lightShafts(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, S=L.src, R=L.rays, RW=72, RH=48, Z=L.z, G=L.glow;
  for(let v=0;v<RH;v++) for(let u=0;u<RW;u++){ let s=0; for(let k=0;k<4;k++){ const i=(v*2+(k>>1))*w+u*2+(k&1); if(Z[i]<-1e8) s+=L.kind[i]===K_SKY?G[i]:L.kind[i]===K_BAR?L.lum*0.6:0; } S[v*RW+u]=s*0.25; }
  const sx=CX/2, sy=-26;                                                                          /* the sky stands high over the slot: the shafts fall into the room */
  for(let v=0;v<=RH;v++) for(let u=0;u<=RW;u++){ const dl=Math.hypot(sx-u,sy-v), dx=(sx-u)/dl, dy=(sy-v)/dl; let x=u, y=v, sum=0, dec=1;
    for(let k=0;k<24;k++){ x+=dx; y+=dy; const xi=x|0, yi=y|0; if(xi>=0&&yi>=0&&xi<RW&&yi<RH) sum+=S[yi*RW+xi]*dec; dec*=0.94; }
    R[v*(RW+1)+u]=sum/14; }
  const col=L.lightC, k0=0.85*(0.35+0.65*L.lum);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const fx=x/2, fy=y/2, u=fx|0, v=fy|0, ax=fx-u, ay=fy-v, o=v*(RW+1)+u;
    const r=(R[o]*(1-ax)+R[o+1]*ax)*(1-ay)+(R[o+RW+1]*(1-ax)+R[o+RW+2]*ax)*ay, i=y*w+x, a=Math.min(0.5,r*k0*(Z[i]>-1e8?0.35:L.kind[i]===K_SKY?0.15:1));
    if(a>0.01) fb[i]=mixc(fb[i],col,a); }
}

/** Smog drifting outside, chimney smoke, pigeons, rain — only where the opening shows air. */
function outsideLife(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, t=L.t, K=L.kind, D=L.depth, smoke=mulc(rgb('#6e6a62'),L.night?0.4:1);
  for(let y=OPEN.y0;y<OPEN.y1;y++) for(let x=OPEN.x0;x<OPEN.x1;x++){ const i=y*w+x; if(K[i]!==K_SKY) continue;
    const n=fbm(x*0.045-t*0.0011,y*0.09+Math.sin(t*0.0017)*0.3), a=(0.1+0.32*n*n)*(D[i]===0?0.4:1);
    let c=mixc(fb[i],L.smog,a);
    for(const p of L.plumes){ const hh=p.y-y; if(hh<0||D[i]===0||(D[i]===1&&y>=p.y-0.5)) continue;
      const cxp=p.x+hh*0.42+Math.sin(hh*0.16-t*0.021+p.ph)*1.4, wd=0.9+hh*0.2, g=gauss((x+0.5-cxp)/wd);
      if(g<0.03) continue; const s=g*p.s*Math.max(0,1-hh/34)*(0.45+0.55*vnoise(x*0.3-t*0.006,y*0.28+t*0.016+p.ph)); c=mixc(c,smoke,Math.min(0.8,s)); }
    fb[i]=c; }
  for(const b of L.birds){ const f=Math.sin(L.t*0.32+b.ph), up=f>0.3, dn=f<-0.3, x=Math.round(b.x), y=Math.round(b.y);
    for(const [dx,dy] of up?[[-2,-1],[-1,0],[0,0],[1,0],[2,-1]]:dn?[[-2,1],[-1,0],[0,0],[1,0],[2,1]]:[[-2,0],[-1,0],[0,0],[1,0],[2,0]]){ const xx=x+dx, yy=y+dy, i=yy*w+xx; if(xx>=0&&xx<w&&K[i]===K_SKY&&D[i]>=1) fb[i]=mixc(fb[i],rgb('#1a1816'),0.75); } }
  if(L.rain) for(let k=0;k<46;k++){ const x0=OPEN.x0+(h2(k,3)/255)*96, y0=(h2(k,4)/255*62+t*2.3)%62; for(let s=0;s<3;s++){ const x=Math.round(x0-y0*0.25-s*0.25), y=Math.round(OPEN.y0+y0-s), i=y*w+x; if(x>=0&&x<w&&y>=0&&K[i]===K_SKY) fb[i]=mixc(fb[i],rgb('#c8ccd0'),0.28-s*0.06); } }
}

/** Puffs of breath in the cold, and the dust that shows only inside the shafts. */
function airLife(){
  const L=state, fb=rendererState.fb, w=appearanceState.W, h=appearanceState.H, R=L.rays;
  for(const p of L.puffs){ const k=p.age/p.life, r=1.5+k*5, a=0.32*(1-k)*Math.min(1,p.age/6), cx=p.x+p.vx*p.age, cy=p.y-p.age*0.16;
    for(let y=Math.floor(cy-r);y<=cy+r;y++) for(let x=Math.floor(cx-r);x<=cx+r;x++){ if(x<0||y<0||x>=w||y>=h) continue; const d=Math.hypot(x+0.5-cx,y+0.5-cy)/r; if(d>=1) continue;
      const s=a*(1-d)*(1-d)*(0.55+0.6*vnoise(x*0.5+p.age*0.05,y*0.5)); if(s>0.02) fb[y*w+x]=mixc(fb[y*w+x],L.lightC,Math.min(0.6,s)); } }
  for(const m of L.motes){ const x=Math.floor(m.x), y=Math.floor(m.y); if(x<0||y<0||x>=w||y>=h) continue; const r=R[(y>>1)*73+(x>>1)]*(0.35+0.65*L.lum);
    if(r>0.04) fb[y*w+x]=mixc(fb[y*w+x],L.lightC,Math.min(0.7,r*4)); }
}

/** Pose and rasterise the hero for a given progress (0 dead hang … 1 chin over the bar) without stepping the scene;
 * the coverage of the opening and the room's light follow. For tests and for the render. @param {number} [p] */
export function posePullup(p){
  const L=state; if(p!==undefined){ L.ps=p; L.pv=0; }
  solvePose(); const box=rasterBody();
  let cov=0; const Z=L.z, K=L.kind, G=L.glow; for(let i=0;i<Z.length;i++) if(Z[i]>-1e8&&K[i]===K_SKY) cov+=G[i];
  L.cover=L.openGlow>0?cov/L.openGlow:0; L.light=Math.max(0.3,Math.min(1,1.12-1.7*L.cover));
  return box;
}

/** The whole picture into the renderer's buffer. */
export function renderPullupScene(){
  const L=state, fb=rendererState.fb, R=L.roomK; fb.set(L.bg);
  outsideLife(); const box=posePullup();
  for(const r of L.roaches) drawRoach(r);
  const dim=(1-L.light)*1.1; for(let i=0;i<fb.length;i++) if(R[i]>0) fb[i]=mulc(fb[i],1-R[i]*dim);
  shadeBody(box); lightShafts(); airLife();
}
