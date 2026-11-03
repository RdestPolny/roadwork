// Alley light and atmosphere, drawn per frame inside the alley camera (native pixels, 12 px per ground unit along i/j, 2 px per z).
// Pipeline: alleyFXGround (puddles with mirrored lamps and drip rings, painted under the actors) -> one lighting pass over the
// whole picture (ambient gradient, gas pools, two drifting fog layers, lamp halos, vignette, hero's torch) -> overlays (window
// patches, lamp bloom, drip, steam, curtain shadows, drizzle and soot). There is no alpha channel: the lighting pass is a per-channel
// "pixel*m+add" on a 4 px node grid, bilinearly interpolated per pixel (no 4 px blocks), with an ordered dither to hide banding.
import { state as rendererState } from './renderer.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as gymState, isoX, isoY } from './gym.js';
import { mix } from './cast.js';
import { vn, spot } from './thames-port.js';
import { ALLEY } from './alley-layout.js';
import { fireLevel, candleLevel } from './alley-light.js';
import { state as alleyState } from './alley.js';

/** Hex colour to [r,g,b] in 0..255. @param {string} h */
const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const clamp=(/** @type {number} */v,/** @type {number} */a,/** @type {number} */b)=>v<a?a:v>b?b:v;
/** Smoothstep from a to b (a>b gives a falling edge). */
const sm=(/** @type {number} */a,/** @type {number} */b,/** @type {number} */v)=>{ const t=clamp((v-a)/(b-a),0,1); return t*t*(3-2*t); };
/** Cheap hash of a number to 0..1. */
const h1=(/** @type {number} */k)=>{ const v=Math.sin(k*127.1+311.7)*43758.5453; return v-Math.floor(v); };
/** Smooth 1D value noise in -1..1. */
const n1=(/** @type {number} */x,/** @type {number} */seed)=>{ const a=Math.floor(x), f=x-a, s=f*f*(3-2*f); return (h1(a+seed)*(1-s)+h1(a+1+seed)*s)*2-1; };

// ---- palette (concept.md) ----
const COL={
  lowFog:hx('#5c6664'), highFog:hx('#7a8077'), warmFog:hx('#8a8466'),
  haloNear:hx('#e0a850'), haloFar:hx('#9a6a30'), haloEdge:hx('#6a6a3a'),
  dark:hx('#07090a'), water:hx('#10181a'), sky:hx('#2a3638'), gas:hx('#b88c4a'), drop:rgb('#9fb0ad'), rim:hx('#0a0c0d'),
  pawn:hx('#c8964a'), candle:hx('#a88a58'), steam:hx('#7a8077'), core:rgb('#fff1b8'), fireBloom:rgb('#e0762a'), flame:rgb('#f0c060'),
};
const AMBIENT_TINT=[.9,1,1.1];          // cool shadow: light that is not gas leans blue-green
const E0=.3, E1=.8;                      // exposure: multiplier = E0+E1*light (1 = the shell's full palette)
const NODE=4;                            // node spacing of the lighting grid, px
const BAYER=new Float32Array([0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5].map(v=>.5+((v+.5)/16-.5)*.8));

// ---- light sources ----
/** @typedef {{i:number,j:number,bi:number,bj:number,z:number,r:number,g:number,b:number,R:number,I:number,gain:number,lamp:boolean,mode:string,flick:number,seed:number,sx:number,sy:number,P:number,id:string,fire:boolean,hn:number[],hf:number[],he:number[],sched?:any}} Src */
const GAS_TINT=[.88,.95,.55];
const HALO_GAS={hn:COL.haloNear,hf:COL.haloFar,he:COL.haloEdge}, HALO_FIRE={hn:hx('#e0762a'),hf:hx('#a23c18'),he:hx('#7a2a14')};
/** @type {Src[]} */
const SRC=[];
ALLEY.lamps.forEach((l,n)=>{
  if(!l.lit||l.mode==='dead'||!(l.radius>0)) return;
  const c=hx(l.color), cand=l.kind==='lantern', t=cand?0:.3;      // gas leans yellow-green, a stable candle stays plain warm
  SRC.push({i:l.i,j:l.j,bi:l.i,bj:l.j,z:l.z,r:(c[0]/255)*(1-t+t*GAS_TINT[0]),g:(c[1]/255)*(1-t+t*GAS_TINT[1]),b:(c[2]/255)*(1-t+t*GAS_TINT[2]),R:l.radius,I:1,gain:cand?.7:1,lamp:true,mode:l.mode,flick:l.flicker,seed:n*17.3,sx:0,sy:0,P:20-9*l.flicker,id:l.id,fire:false,...HALO_GAS});
});
(ALLEY.fires||[]).forEach((f,n)=>{
  const c=hx(f.color);
  SRC.push({i:f.i,j:f.j,bi:f.i,bj:f.j,z:f.z,r:c[0]/255,g:c[1]/255,b:c[2]/255,R:f.radius,I:1,gain:1.05,lamp:true,mode:'fire',flick:f.flicker,seed:200+n*13.1,sx:0,sy:0,P:0,id:f.id,fire:true,...HALO_FIRE});
});
/** @type {Src[]} */
const GLOW=[];
ALLEY.glows.forEach((g,n)=>{ const c=hx(g.color); GLOW.push({i:g.i,j:g.id==='glow-pawn'?g.j-1:g.j,bi:g.i,bj:g.j,z:g.z,r:c[0]/255,g:c[1]/255,b:c[2]/255,R:g.radius,I:g.schedule?0:1,gain:g.id==='glow-pawn'?.55:g.schedule?.6:.3,lamp:false,mode:'steady',flick:g.flicker||0,seed:90+n*11,sx:0,sy:0,P:0,id:g.id,fire:false,...HALO_GAS,sched:g}); });
const LIGHTS=[...SRC,...GLOW];
const GL_PAWN=GLOW.find(g=>g.id==='glow-pawn'), GL_LODG=GLOW.find(g=>g.id==='glow-lodging');
/** The hero's discreet torch, so he never sinks into a black hole. */
const TORCH={bi:0,bj:0,id:'torch',fire:false,hn:COL.haloNear,hf:COL.haloFar,he:COL.haloEdge,i:0,j:0,z:6,r:.95,g:.88,b:.72,R:4,I:1,gain:.2,lamp:false,mode:'steady',flick:0,seed:0,sx:0,sy:0,P:0};

const AMB_I=ALLEY.ambient.map(a=>a.i), AMB_K=ALLEY.ambient.map(a=>a.k);
/** Ambient exposure along the alley (linear between the plan's points). @param {number} i */
function ambientAt(i){
  const n=AMB_I.length; if(i<=AMB_I[0]) return AMB_K[0]; if(i>=AMB_I[n-1]) return AMB_K[n-1];
  let q=1; while(AMB_I[q]<i) q++;
  return AMB_K[q-1]+(AMB_K[q]-AMB_K[q-1])*(i-AMB_I[q-1])/(AMB_I[q]-AMB_I[q-1]);
}

/** Choke profile of a gutter lamp, dt seconds after the event started: dips, over-shoots, settles (0 outside). @param {number} dt */
function choke(dt){
  if(dt<0||dt>.5) return 1;
  if(dt<.15) return 1-.55*sm(0,.15,dt);
  if(dt<.25) return .45+.75*sm(.15,.25,dt);
  return 1.2-.2*sm(.25,.5,dt);
}
/** Brightness factor of a lamp at s seconds. @param {Src} L @param {number} s */
function lampLevel(L,s){
  if(L.mode==='steady'){ const a=L.flick<.4?.03:.045; return 1+a*(n1(s*3.1,L.seed)*.65+n1(s*7.3,L.seed)*.35); }
  const a=.05+.1*L.flick;
  let v=1+a*(n1(s*3.1,L.seed)*.6+n1(s*7.3,L.seed)*.3+n1(s*13.7,L.seed)*.1*L.flick);
  const u=(s+L.seed)/L.P, k=Math.floor(u); v*=choke((u-k-h1(k*7+L.seed)*.95)*L.P);
  if(L.id==='lamp-lodging'){                   // goes out for ~0.4 s every 40-70 s
    const P2=55, u2=(s+L.seed*2)/P2, k2=Math.floor(u2), dt=(u2-k2-h1(k2*5+L.seed)*.9)*P2;
    if(dt>=0&&dt<.5) v*=1-sm(0,.05,dt)*sm(.5,.4,dt);
  }
  return Math.max(0,v);
}

// ---- per-frame state ----
let S_=0;                                  // seconds
let groundT=-1;                            // tick the ground pass last ran in (alley.js may call alleyFXGround itself)
/** Camera inverse, set each frame from the prop camera. */
const CAM={x:0,y:0,ix:12,jx:-12,iy:6,jy:6,z:2,det:144,hx:0,hy:0,hi:0,hj:0};
function setCamera(/** @type {number} */t){
  const c=gymState.propCamera||CAM;
  CAM.x=c.x; CAM.y=c.y; CAM.ix=c.ix; CAM.jx=c.jx; CAM.iy=c.iy; CAM.jy=c.jy; CAM.z=c.z; CAM.det=c.ix*c.jy-c.jx*c.iy;
  S_=t/60;
  for(let n=0;n<LIGHTS.length;n++){ const L=LIGHTS[n]; L.sx=isoX(L.bi,L.bj,0); L.sy=isoY(L.bi,L.bj,L.z); }
  const A=alleyState; CAM.hi=A.i; CAM.hj=A.j; CAM.hx=isoX(A.i,A.j,0); CAM.hy=isoY(A.i,A.j,0);
  TORCH.i=A.i; TORCH.j=A.j;
}
/** Update lamp and window levels for this frame. */
function updateLevels(){
  const s=S_;
  for(const L of SRC){
    if(L.fire){ L.I=fireLevel({i:L.bi,j:L.bj,flicker:L.flick},s); L.i=L.bi+.15*n1(s*6.1,L.seed); L.j=L.bj+.15*n1(s*5.3,L.seed+4); }   // the pool of light wavers with the flame
    else L.I=lampLevel(L,s);
  }
  for(const G of GLOW){
    if(G.id==='glow-pawn'){ const u=(s+7)/50, k=Math.floor(u), dt=(u-k-h1(k)*.9)*50; G.I=1-.25*sm(0,.5,dt)*sm(2,1.5,dt); }   // someone passes with a lamp
    else if(G.sched) G.I=candleLevel(G.sched,s,G.seed);                                                                         // candle window on its schedule
    else G.I=1+.1*n1(s/2.2,G.seed)+.05*n1(s*4.1,G.seed);                                                                      // lodging candle
  }
}

// ---- light at a world point (shared by the lighting pass and alleyLightAt) ----
let oR=0,oG=0,oB=0,oLamp=0;
/** Light (per channel, 1 = ambient 1.0) at ground coordinates i,j and height z; also the share given by gas/windows. */
function lightAt3(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {boolean} */torch){
  const a=ambientAt(i); let r=a*AMBIENT_TINT[0], g=a*AMBIENT_TINT[1], b=a*AMBIENT_TINT[2], lw=0;
  for(let n=0;n<LIGHTS.length+(torch?1:0);n++){
    const L=n<LIGHTS.length?LIGHTS[n]:TORCH; if(L.I<=.003) continue;
    const di=i-L.i, dj=j-L.j, dz=(z-L.z)*.125, d2=di*di+dj*dj+dz*dz, R2=L.R*L.R; if(d2>=R2) continue;
    const q=1-d2/R2, w=q*q*L.I*L.gain;
    r+=L.r*w; g+=L.g*w; b+=L.b*w; if(n<LIGHTS.length) lw+=w*(.3*L.r+.59*L.g+.11*L.b);
  }
  oR=r; oG=g; oB=b; oLamp=lw;
}
/** Light at a ground point: brightness 0..1 and warmth 0..1 (the hero is shaded with it). */
export function alleyLightAt(/** @type {number} */i,/** @type {number} */j){
  lightAt3(i,j,6,false);
  const lum=.3*oR+.59*oG+.11*oB;
  return {k:clamp(lum,0,1),warm:lum>0?clamp(oLamp/lum*1.4,0,1):0};
}

// ---- lighting pass ----
let NODES=new Float32Array(0), ROW=new Float32Array(0), nodeW=0, nodeH=0, nx=0, ny=0;
/** Fog noise in 0..1: two octaves; the second one slips against the first and rises/sinks, so shapes evolve instead of just sliding. */
function fogN(/** @type {number} */u,/** @type {number} */v,/** @type {number} */s,/** @type {number} */slip){
  return vn(u,v+.03*s)*.58+vn(u*2.1+5.3+slip*s,v*2.1+1.7-.06*s)*.42;
}
function lightPass(){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H;
  if(nodeW!==W||nodeH!==H){ nodeW=W; nodeH=H; nx=Math.ceil(W/NODE)+1; ny=Math.ceil(H/NODE)+1; NODES=new Float32Array(nx*ny*6); ROW=new Float32Array(nx*6); }
  const {x:cx0,y:cy0,ix,jx,iy,jy,z:cz,det}=CAM, I=ALLEY.I, s=S_, nodes=NODES;
  const hx=CAM.hx, hy=CAM.hy-14;
  // per-frame hoisted halo data
  const halos=[]; for(const L of SRC) if(L.I>.01) halos.push(L); for(const L of GLOW) if(L.sched&&L.I>.02) halos.push(L);
  let q=0;
  for(let gy=0;gy<ny;gy++){ const y=gy*NODE, dy=y-cy0;
    for(let gx=0;gx<nx;gx++,q+=6){
      const x=gx*NODE, dx=x-cx0;
      // what does this pixel look at: floor, tenement wall (j=0) or the blind end wall (i=0)?
      const fi=(dx*jy-jx*dy)/det, fj=(ix*dy-iy*dx)/det;
      let pi,pj,pz;
      if(fj>=0&&fi>=0){ pi=fi; pj=fj; pz=0; }
      else if(fj<0&&fi>=0){ pi=dx/ix; pj=0; pz=Math.min(ALLEY.H,(pi*iy-dy)/cz); }
      else if(fi<0&&fj>=0){ pi=0; pj=dx/jx; pz=Math.min(ALLEY.H,(pj*jy-dy)/cz); }
      else { pi=0; pj=0; pz=ALLEY.H; }
      lightAt3(pi,pj,pz,true);
      let mr=E0+E1*oR, mg=E0+E1*oG, mb=E0+E1*oB;
      // fog: low layer hugs the ground (floor and the foot of the wall), high layer hangs in the air slice through the lane's middle
      const pic=pi<0?0:pi>I?I:pi, depth=1-pic/I, wlow=Math.exp(-pz/9);
      const n=fogN((pi+1.6*s)/16,pj/4.5+pz/36+9,s,.05);                                                    // drifts towards i=0
      const aLow=(.09+.26*sm(.3,.74,n))*(.65+.55*depth*depth+.35*Math.pow(pic/I,3))*wlow;
      const ai=(dx-3.4*jx)/ix, az=(ai*iy+3.4*jy-dy)/cz;
      const nh=fogN((ai-.7*s)/12,(az-.2*s)/16+4,s,-.06);                                                  // drifts the other way, upwards
      const aHigh=(.03+.17*sm(.34,.76,nh))*sm(-4,8,az)*sm(62,36,az);
      // lit fog colour: same exposure as the surfaces, warmed by the gas
      const fr=COL.lowFog[0], fg=COL.lowFog[1], fb_=COL.lowFog[2], hr=COL.highFog[0], hg=COL.highFog[1], hb=COL.highFog[2];
      const wm=clamp(oLamp*1.6,0,1), wr=COL.warmFog[0], wg=COL.warmFog[1], wb=COL.warmFog[2];
      const lr=fr+(wr-fr)*wm, lg=fg+(wg-fg)*wm, lb=fb_+(wb-fb_)*wm, qr=hr+(wr-hr)*wm, qg=hg+(wg-hg)*wm, qb=hb+(wb-hb)*wm;
      const ka=1-aLow, kb=1-aHigh;
      let ar=(lr*aLow*kb+qr*aHigh)*mr, ag=(lg*aLow*kb+qg*aHigh)*mg, ab=(lb*aLow*kb+qb*aHigh)*mb;
      mr*=ka*kb; mg*=ka*kb; mb*=ka*kb;
      // lamp halos in the air (self-lit: absolute colours mixed in)
      for(let n=0;n<halos.length;n++){
        const L=halos[n], rx=3.4*L.R+10, ry=rx*.9, ux=(x-L.sx)/rx, uy=(y-L.sy)/ry, d2=ux*ux+uy*uy; if(d2>=1) continue;
        const f=(1-d2)*(1-d2)*L.I, nr=clamp(1-d2*4,0,1), nr2=nr*nr;
        const hn=.3*nr2*f, hf=.14*f;
        const e=sm(.3,1,d2), cr=L.hf[0]+(L.he[0]-L.hf[0])*e, cg=L.hf[1]+(L.he[1]-L.hf[1])*e, cb=L.hf[2]+(L.he[2]-L.hf[2])*e;
        mr*=1-hf; mg*=1-hf; mb*=1-hf; ar=ar*(1-hf)+cr*hf; ag=ag*(1-hf)+cg*hf; ab=ab*(1-hf)+cb*hf;
        mr*=1-hn; mg*=1-hn; mb*=1-hn; ar=ar*(1-hn)+L.hn[0]*hn; ag=ag*(1-hn)+L.hn[1]*hn; ab=ab*(1-hn)+L.hn[2]*hn;
      }
      // vignette, centred on the hero
      const vx=(x-hx)/(W*.62), vy=(y-hy)/(H*.62), vv=clamp(.36*(vx*vx+vy*vy)*1.3,0,.42), kv=1-vv;
      mr*=kv; mg*=kv; mb*=kv; ar=ar*kv+COL.dark[0]*vv; ag=ag*kv+COL.dark[1]*vv; ab=ab*kv+COL.dark[2]*vv;
      nodes[q]=mr; nodes[q+1]=mg; nodes[q+2]=mb; nodes[q+3]=ar; nodes[q+4]=ag; nodes[q+5]=ab;
    }
  }
  // apply, bilinear between nodes
  const rowLen=nx*6;
  for(let y=0;y<H;y++){
    const fy=y/NODE, r0=fy|0, f=fy-r0, r1=r0+1<ny?r0+1:r0, o0=r0*rowLen, o1=r1*rowLen, g=1-f;
    for(let k=0;k<rowLen;k++) ROW[k]=nodes[o0+k]*g+nodes[o1+k]*f;
    const yb=(y&3)<<2, base=y*W;
    for(let gx=0;gx<nx-1;gx++){
      const b=gx*6, x0=gx*NODE, xe=x0+NODE<W?x0+NODE:W; if(x0>=W) break;
      let mr=ROW[b], mg=ROW[b+1], mb=ROW[b+2], ar=ROW[b+3], ag=ROW[b+4], ab=ROW[b+5];
      const dmr=(ROW[b+6]-mr)/NODE, dmg=(ROW[b+7]-mg)/NODE, dmb=(ROW[b+8]-mb)/NODE, dar=(ROW[b+9]-ar)/NODE, dag=(ROW[b+10]-ag)/NODE, dab=(ROW[b+11]-ab)/NODE;
      for(let x=x0;x<xe;x++){
        const k=base+x, c=fb[k];
        if(c!==0){
          const d=BAYER[yb|(x&3)];
          const r=(c&255)*mr+ar+d, gg=((c>>8)&255)*mg+ag+d, bl=((c>>16)&255)*mb+ab+d;
          fb[k]=0xff000000|((bl>255?255:bl|0)<<16)|((gg>255?255:gg|0)<<8)|(r>255?255:r|0);
        }
        mr+=dmr; mg+=dmg; mb+=dmb; ar+=dar; ag+=dag; ab+=dab;
      }
    }
  }
}

// ---- timed events (drips, steam, curtain): irregular periods without a loop per frame ----
/** @typedef {{lo:number,hi:number,seed:number,n:number,t0:number,t1:number,init:boolean}} Ev */
/** @param {number} lo @param {number} hi @param {number} seed @returns {Ev} */
const ev=(lo,hi,seed)=>({lo,hi,seed,n:0,t0:0,t1:0,init:false});
/** Start of the event running at s (E.t1 is the next one). Rewinds when time restarts. @param {Ev} E @param {number} s */
function evAt(E,s){
  if(!E.init||s<E.t0){ E.init=true; E.n=0; E.t0=0; E.t1=E.lo+(E.hi-E.lo)*h1(E.seed); }
  while(s>=E.t1){ E.t0=E.t1; E.n++; E.t1+=E.lo+(E.hi-E.lo)*h1(E.seed+E.n*3.7); }
  return E.t0;
}
const DRIP=ALLEY.drips[0], dripEv=ev(DRIP.period[0],DRIP.period[1],5), steamEv=ev(9,13,9), curtainEv=ev(18,35,3);
const GRATE=/** @type {number[]} */(ALLEY.boxes.find(b=>b.id==='grate-steam')?.box||[27.4,3.1,28.2,3.7]);
const PUD=ALLEY.puddles.map((p,n)=>({...p,seed:n*13.7}));
const WIN_LODGING=ALLEY.windows.find(w=>w.id==='w1-g'), WIN_PAWN=ALLEY.windows.find(w=>w.id==='w0-pawn');

/** Colour already lit like the surfaces around pixel x,y: the lighting nodes' m*c+add (for overlays drawn after the pass). */
function litColor(/** @type {number} */r,/** @type {number} */g,/** @type {number} */b,/** @type {number} */x,/** @type {number} */y){
  const px=clamp(x>>2,0,nx-1), py=clamp(y>>2,0,ny-1), q=(py*nx+px)*6, N=NODES;
  return 0xff000000|(clamp(b*N[q+2]+N[q+5],0,255)<<16)|(clamp(g*N[q+1]+N[q+4],0,255)<<8)|clamp(r*N[q]+N[q+3],0,255);
}
/** Mix a pixel toward a colour (ignores the transparent void). */
function put(/** @type {number} */x,/** @type {number} */y,/** @type {number} */col,/** @type {number} */a){
  const W=appearanceState.W, H=appearanceState.H; if(x<0||y<0||x>=W||y>=H||a<=0) return;
  const fb=rendererState.fb, k=y*W+x; if(fb[k]!==0) fb[k]=mix(fb[k],col,a>1?1:a);
}

// ---- ground pass: puddles (under the actors when alley.js calls it before them) ----
/** Paint the puddles: dark water, sky and gas sheen, mirrored lamps and the drip's rings. @param {boolean} maskHero */
function paintPuddles(maskHero){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, {x:cx0,y:cy0,ix,jx,iy,jy,det}=CAM, s=S_;
  const ageD=s-dripEv.t0, dpx=isoX(DRIP.puddle.i,DRIP.puddle.j,0), dpy=isoY(DRIP.puddle.i,DRIP.puddle.j,0);
  const mx0=CAM.hx-10, mx1=CAM.hx+10, my0=CAM.hy-46, my1=CAM.hy+2;
  for(const P of PUD){
    let bx0=1e9,bx1=-1e9,by0=1e9,by1=-1e9;
    for(let a=-1;a<=1;a+=2) for(let b=-1;b<=1;b+=2){ const x=isoX(P.i+a*P.rx*1.3,P.j+b*P.ry*1.3,0), y=isoY(P.i+a*P.rx*1.3,P.j+b*P.ry*1.3,0); if(x<bx0)bx0=x; if(x>bx1)bx1=x; if(y<by0)by0=y; if(y>by1)by1=y; }
    const x0=Math.max(0,Math.floor(bx0)-1), x1=Math.min(W-1,Math.ceil(bx1)+1), y0=Math.max(0,Math.floor(by0)-1), y1=Math.min(H-1,Math.ceil(by1)+1);
    if(x1<x0||y1<y0) continue;
    const rings=P.big&&ageD<2.4;
    for(let y=y0;y<=y1;y++){ const dy=y+.5-cy0;
      for(let x=x0;x<=x1;x++){
        if(maskHero&&x>=mx0&&x<=mx1&&y>=my0&&y<=my1) continue;
        const dx=x+.5-cx0, gi=(dx*jy-jx*dy)/det, gj=(ix*dy-iy*dx)/det, u=(gi-P.i)/P.rx, v=(gj-P.j)/P.ry, q=u*u+v*v;
        if(q>1.7) continue;
        const edge=q+(vn(gi*1.6+P.seed,gj*1.6)-.5)*.9+(vn(gi*4.1+P.seed,gj*5.3)-.5)*.25; if(edge>=1) continue;
        const k=y*W+x, c=fb[k]; if(c===0) continue;
        // water over the stones, then the sky (slowly rippling, stronger on the far side)
        let r=(c&255)*.1+COL.water[0]*.9, g=((c>>8)&255)*.1+COL.water[1]*.9, b=((c>>16)&255)*.1+COL.water[2]*.9;
        const rip=.5+.5*Math.sin(y*1.4+vn(gi*2.4,gj*1.2+s*.1)*7+s*.4), line=rip*rip*rip*rip*rip*rip, cloud=vn(gi*.7+s*.04,gj*1.1-s*.03);
        const ws=clamp((cloud-.25)*1.1,0,.6)*(.8-.3*v)*.7+line*.14;
        r+=(COL.sky[0]-r)*ws; g+=(COL.sky[1]-g)*ws; b+=(COL.sky[2]-b)*ws;
        // gas: a faint sheen where a lamp's light lies on the water, and the lamp's own mirror image when it lines up
        let sheen=0, mir=0;
        for(let n=0;n<SRC.length;n++){
          const L=SRC[n]; if(L.I<=.01) continue;
          const di=gi-L.i, dj=gj-L.j, d2=di*di+dj*dj, R2=L.R*L.R;
          if(d2<R2){ const w=1-d2/R2; sheen+=w*w*L.I; }
          const ex=L.sx+1.3*Math.sin(y*.6+s*2.3+L.seed)*(.5+.5*Math.sin(s*.7+L.seed)), ey=isoY(L.i,L.j,0)+L.z*2, ax=x+.5-ex, ay=y+.5-ey;
          if(ax>-7&&ax<7&&ay>-34&&ay<34) mir+=Math.exp(-ax*ax*.28)*Math.exp(-ay*ay/(2*13*13))*L.I*(.55+.45*Math.sin(y*1.7+s*3.1+L.seed*2));
        }
        const gw=clamp(sheen*.14*(.5+line),0,.14)+clamp(mir*.6,0,.7);
        r+=(COL.gas[0]-r)*gw; g+=(COL.gas[1]-g)*gw; b+=(COL.gas[2]-b)*gw;
        if(rings){
          const rx=x+.5-dpx, ry=(y+.5-dpy)*2, dd=Math.sqrt(rx*rx+ry*ry);
          for(let n=0;n<3;n++){ const age=ageD-n*.22; if(age<=0||age>=1.4) continue; const w=Math.max(0,1-Math.abs(dd-age/1.4*7)/.9)*(1-age/1.4)*.5;
            if(w>0){ r+=(159-r)*w; g+=(176-g)*w; b+=(173-b)*w; } }
        }
        if(edge>.8){ const w=sm(.8,.95,edge)*.45; r+=(COL.rim[0]-r)*w; g+=(COL.rim[1]-g)*w; b+=(COL.rim[2]-b)*w; }
        fb[k]=0xff000000|((b>255?255:b|0)<<16)|((g>255?255:g|0)<<8)|(r>255?255:r|0);
      }
    }
  }
}
let groundMasked=false;
/** Floor effects: puddles with reflections and ripples. alley.js may call this right after the baked picture is copied
 * (before the props and the hero), then nothing paints over the actors; otherwise alleyFX runs it itself and spares the hero's box. */
export function alleyFXGround(/** @type {number} */t){
  setCamera(t); updateLevels(); evAt(dripEv,S_); groundT=t; groundMasked=false; paintPuddles(false);
}

// ---- overlays after the lighting pass ----
/** A slanted patch of window light on the cobbles with the frame's bars in it. */
function windowPatch(/** @type {number} */ci,/** @type {number} */j0,/** @type {number} */j1,/** @type {number} */slant,/** @type {number} */hw0,/** @type {number} */hw1,/** @type {number[]} */col,/** @type {number} */a0){
  if(a0<=.005) return;
  const W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb, {x:cx0,y:cy0,ix,jx,iy,jy,det}=CAM;
  let bx0=1e9,bx1=-1e9,by0=1e9,by1=-1e9;
  for(const jj of [j0,j1]) for(const sg of [-1,1]){ const i=ci+slant*(jj-j0)+sg*(jj===j0?hw0:hw1), x=isoX(i,jj,0), y=isoY(i,jj,0); if(x<bx0)bx0=x; if(x>bx1)bx1=x; if(y<by0)by0=y; if(y>by1)by1=y; }
  const x0=Math.max(0,Math.floor(bx0)-1), x1=Math.min(W-1,Math.ceil(bx1)+1), y0=Math.max(0,Math.floor(by0)-1), y1=Math.min(H-1,Math.ceil(by1)+1);
  const pr=col[0], pg=col[1], pb=col[2], gr=pr/255*2.6, gg=pg/255*2.6, gb=pb/255*2.6;
  for(let y=y0;y<=y1;y++){ const dy=y+.5-cy0;
    for(let x=x0;x<=x1;x++){
      const dx=x+.5-cx0, gi=(dx*jy-jx*dy)/det, gj=(ix*dy-iy*dx)/det, vv=(gj-j0)/(j1-j0); if(vv<0||vv>1) continue;
      const hw=hw0+(hw1-hw0)*vv, uu=(gi-ci-slant*(gj-j0))/hw, au=uu<0?-uu:uu; if(au>1) continue;
      const k=y*W+x, c=fb[k]; if(c===0) continue;
      let w=a0*Math.pow(1-vv,1.3)*sm(1,.8,au)*(.8+.35*vn(gi*2.2,gj*2.2));
      if(au<.07||Math.abs(vv-.34)<.03||Math.abs(vv-.68)<.03) w*=.45;       // mullion and transom shadows
      if(w<=.004) continue;
      // light adds on top of the texture (multiply plus a faint wash) instead of painting a flat colour over it
      const r=(c&255)*(1+w*gr)+pr*w*.1, g=((c>>8)&255)*(1+w*gg)+pg*w*.1, b=((c>>16)&255)*(1+w*gb)+pb*w*.1;
      fb[k]=0xff000000|((b>255?255:b|0)<<16)|((g>255?255:g|0)<<8)|(r>255?255:r|0);
    }
  }
}
/** Darken a rectangle of a wall pane (plane j=pj, i in i0..i1, z in z0..z1) with soft edges. */
function paneShade(/** @type {number} */pj,/** @type {number} */i0,/** @type {number} */i1,/** @type {number} */z0,/** @type {number} */z1,/** @type {number} */a){
  if(a<=.005) return;
  const {x:cx0,y:cy0,ix,jx,iy,jy,z:cz}=CAM, dk=rgb('#0a0c0d');
  const xa=isoX(i0,pj,0), xb=isoX(i1,pj,0), ya=isoY(i0,pj,z1), yb=isoY(i1,pj,z0);
  for(let y=Math.floor(Math.min(ya,yb))-2;y<=Math.ceil(Math.max(ya,yb))+2;y++) for(let x=Math.floor(xa);x<=Math.ceil(xb);x++){
    const i=(x+.5-cx0-pj*jx)/ix, z=(cy0+i*iy+pj*jy-(y+.5))/cz;
    const w=a*sm(i0,i0+.12,i)*sm(i1,i1-.12,i)*sm(z0,z0+1.5,z)*sm(z1,z1-1.5,z); if(w>.004) put(x,y,dk,w);
  }
}
const env=(/** @type {number} */x)=>x<0?.15:Math.max(.15,sm(0,.8,x)*sm(3.8,2.6,x));
function steam(){
  const gi=(GRATE[0]+GRATE[2])/2, gj=(GRATE[1]+GRATE[3])/2, gx=isoX(gi,gj,0), gy=isoY(gi,gj,0), s=S_, ts=s-evAt(steamEv,s);
  for(let k=0;k<9;k++){
    const life=(s/3.2+k/9)%1, e=env(ts-life*3.2), a=e*.62*Math.pow(1-life,1.2)*sm(0,.12,life); if(a<.01) continue;
    const x=gx-life*6.4+2.2*Math.sin(life*4+k*1.7+s*.7), y=gy-2-life*26-life*3.2, rx=2.6+life*8.5;
    spot(x,y,rx,rx*.85,a,litColor(COL.steam[0]*1.2,COL.steam[1]*1.2,COL.steam[2]*1.15,x|0,y|0));
  }
}
function dripFX(){
  const s=S_, fall=dripEv.t1-s, age=s-dripEv.t0, dpx=isoX(DRIP.puddle.i,DRIP.puddle.j,0), dpy=isoY(DRIP.puddle.i,DRIP.puddle.j,0);
  if(fall<.35&&fall>=0){
    const p=1-fall/.35, i=DRIP.i+(DRIP.puddle.i-DRIP.i)*p, j=DRIP.j+(DRIP.puddle.j-DRIP.j)*p, z=14*(1-p*p), x=Math.round(isoX(i,j,0)), y=Math.round(isoY(i,j,z));
    for(let dy=0;dy<2;dy++) for(let dx=0;dx<2;dx++) put(x+dx,y+dy,COL.drop,.85);
    put(x,y-1,COL.drop,.4); put(x+1,y-2,COL.drop,.2);
  }
  if(age<.25) for(let sg=-1;sg<=1;sg+=2){
    const x=Math.round(dpx+sg*age*34), y=Math.round(dpy-(22*age-80*age*age)), a=(1-age/.25)*.8;
    put(x,y,COL.drop,a); put(x+1,y,COL.drop,a*.6);
  }
}
const SOOT=rgb('#07090a'), RAIN=rgb('#9fb0ad');
/** Sparse drizzle and soot on the pixel grid: whole pixels step along, no noise texture. */
function motes(){
  const W=appearanceState.W, H=appearanceState.H, s=S_;
  for(let k=0;k<30;k++){
    const x0=h1(k*3.1)*W, sp=70+h1(k*5.7)*30, y=((h1(k*9.3)*(H+8)+s*sp)%(H+8))-4, x=Math.round((x0+y*.16)%W), yy=Math.round(y);
    const q=(clamp(yy>>2,0,ny-1)*nx+clamp(x>>2,0,nx-1))*6, m=NODES[q+1], w=clamp((m-.35)*.3,.03,.28);
    put(x,yy,RAIN,w); put(x,yy+1,RAIN,w*.55);
  }
  for(let k=0;k<12;k++){
    const x0=h1(k*7.3+50)*W, sp=7+h1(k*2.9)*6, y=((h1(k*4.1+50)*H+s*sp)%H), x=Math.round((x0+Math.sin(s*.5+k*2.1)*7)%W), yy=Math.round(y);
    const q=(clamp(yy>>2,0,ny-1)*nx+clamp(x>>2,0,nx-1))*6, m=NODES[q+1], w=clamp((m-.55)*.7,0,.5);
    put(x,yy,SOOT,w);
  }
}

const GLASS=[0xff,0x9a,0x4e], WIN_CANDLE=ALLEY.windows.filter(w=>w.state==='candle');
/** A candle window's glass lit from within: dark glass pixels turn warm, frame bars (brighter pixels) stay as they are. @param {any} w @param {number} lv */
function paneGlow(w,lv){
  if(lv<=.02) return;
  const W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb, {x:cx0,y:cy0,ix,iy,z:cz}=CAM;
  const ya=isoY(w.i0,0,w.z1), yb=isoY(w.i1,0,w.z0), xa=isoX(w.i0,0,0), xb=isoX(w.i1,0,0);
  if(xb<0||xa>=W) return;
  const y0=Math.max(0,Math.floor(Math.min(ya,yb))-1), y1=Math.min(H-1,Math.ceil(Math.max(ya,yb))+1), x0=Math.max(0,Math.floor(xa)), x1=Math.min(W-1,Math.ceil(xb));
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    const i=(x+.5-cx0)/ix, z=(cy0+i*iy-(y+.5))/cz;
    if(i<w.i0||i>w.i1||z<w.z0||z>w.z1) continue;
    const k=y*W+x, c=fb[k]; if(c===0) continue;
    const r=c&255, g=(c>>8)&255, b=(c>>16)&255, lum=(r+g+b)/3, a=lv*sm(70,35,lum)*.8*(.85+.3*vn(i*3,z*.3+S_*.5));
    if(a<=.01) continue;
    const nr=r+(GLASS[0]-r)*a, ng=g+(GLASS[1]-g)*a, nb=b+(GLASS[2]-b)*a;
    fb[k]=0xff000000|((nb|0)<<16)|((ng|0)<<8)|(nr|0);
  }
}
const SPARK=[rgb('#fff0b0'),rgb('#ffc060'),rgb('#e0762a'),rgb('#a23c18')];
/** Sparks rising from a coke basket in arcs and dying out; positions are pure functions of time on the pixel grid, a gust throws a spray. */
function sparks(/** @type {Src} */L){
  const s=S_, n=14+(L.I>1.25?14:0), life=1.7;
  for(let k=0;k<n;k++){
    const u=s/life+k/n*(k<14?1:3.1)+(k<14?0:.37), c=Math.floor(u), a=u-c, hs=h1(c*7.7+k*13.1+L.seed);
    if(k>=14&&hs>L.I-1) continue;                                                // spray sparks only during a gust
    const vx=(h1(c*3.3+k*5.9+L.seed)-.5)*26, rise=16+hs*22, x=Math.round(L.sx+vx*a+Math.sin(a*6+k)*1.5), y=Math.round(L.sy-3-rise*a+8*a*a*(1+hs));
    const f=1-a, col=SPARK[a<.25?0:a<.55?1:a<.8?2:3];
    put(x,y,col,f*1.1);
  }
}
/** Per-frame effects inside the alley camera (native px): the ground pass if alley.js did not run it, then lighting, fog and overlays. */
export function alleyFX(/** @type {number} */t){
  setCamera(t); updateLevels();
  if(groundT!==t){ evAt(dripEv,S_); paintPuddles(true); }
  groundT=-1;
  lightPass();
  const s=S_, G0=GL_PAWN, G1=GL_LODG;
  if(G0) windowPatch(20.3,2.3,5.1,.6,1,2.4,COL.pawn,.42*G0.I);
  if(G1) windowPatch(12.4,1.2,4.2,.3,.4,1.3,COL.candle,.13*G1.I);
  for(const G of GLOW) if(G.sched){ const w=WIN_CANDLE.find(q=>q.id===G.sched.window); if(w) paneGlow(w,G.I); }
  steam();
  for(const L of SRC){ if(L.I<=.01) continue;
    if(L.fire){ spot(L.sx,L.sy-2,10,8,.16*L.I,COL.fireBloom); spot(L.sx,L.sy-2,4,3,.22*L.I,COL.flame); sparks(L); }
    else { spot(L.sx,L.sy,7,6,.28*L.I,COL.flame); spot(L.sx,L.sy,3,3,.4*L.I,COL.core); } }
  dripFX();
  const t0=evAt(curtainEv,s), ts=s-t0;
  if(WIN_LODGING&&ts<4.5){ const e=sm(0,.6,ts)*sm(4.5,3.6,ts), i0=WIN_LODGING.i0+.12+ts*.05+.04*Math.sin(ts*2); paneShade(0,i0,i0+.67,WIN_LODGING.z0+4,WIN_LODGING.z0+11,.35*e); }
  if(WIN_PAWN&&G0&&G0.I<.999) paneShade(2.3,WIN_PAWN.i0,WIN_PAWN.i1,WIN_PAWN.z0,WIN_PAWN.z1,(1-G0.I)*.9);
  motes();
}
