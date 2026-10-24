/* The treadwheel shed (native 144×96), drawn like the pull-up scene: a background baked once from per-pixel colour
   functions (sooty brick under limewash, oak posts and boards, the barred window, the beam with its shaft, the stove,
   wet flagstones, the bench), and people as height fields — capsules, ellipsoids and rows of a back — shaded from their
   normals in steps of a colour ramp and rimmed by the light behind them. Composition after the painted reference
   (reference/kierat-wzor.webp): four stalls with their numbers, the prisoners seen from behind leaning on the rail, the
   warder seated on a stool on the right with a bull's-eye lantern, two men on a bench in the foreground. Every frame
   draws what moves: the treads, the men, the warder's head, the lantern and its beam, the windmill's sails, the cog,
   the bell, dust, breath and light. No sound: every cue is in the picture. */

import { rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { h2, drawText } from './boxing.js';
import { state as roomsState, skyBucket } from './rooms.js';
import { skyColors } from './weather.js';
import { vnoise, fbm } from './newgate-fight.js';

const W = 144, H = 96;
/** The four stalls between the posts, and the posts. */
const STALLS = /** @type {[number,number][]} */ ([[12,32],[36,55],[59,78],[82,101]]);
const POSTS = [[7,12],[32,36],[55,59],[78,82],[101,105]];
const NUMBERS = [31,17,12,23];
/** The man in a stall stands a little left of its middle, as painted. */
const MAN_X = [20,46,69,92];
const WIN = {x0:22,x1:39,y0:0,y1:10}, HUB = {x:27,y:6};
const BEAM_Y0 = 11, BEAM_Y1 = 15, BAND_Y1 = 20, RAIL_Y = 35, PANEL_Y1 = 37, STALL_Y1 = 75, FLOOR_Y = 75;
/** The chalk line on the posts: a tread's edge on it is the beat. */
export const Y_LINE = 58;
/** Where the treads' edges stand, by treads above the line (index 6 = the line): wider apart towards us. */
const TREAD_EDGES = [37,40.5,44,47.25,50.5,54.25,58,62.25,66.5,70.75,75,79.5];
const COG = {x:108,y:6,r:7};
const STOVE = {x0:134,x1:144,y0:38,y1:73}, GRATE = {x0:136,x1:143,y0:54,y1:63};
const BELL = {x:127,y:18};
const BENCH = {x0:0,x1:53,y0:85,y1:90};
const BENCH_MEN = [{x:11,y:64},{x:35,y:64}];
const HEAD = {x:124.5,y:41,rx:4.2,ry:4.7};
const LANTERN = {x:112,y:52.5};
const STICK = [[111.5,61.5],[124,68]];

/* ---------- colour (ABGR, like the pull-up scene) ---------- */

/** @param {number} v */
const cl = (v)=>v<0?0:v>255?255:Math.round(v);
/** @param {number} r @param {number} g @param {number} b */
const pack = (r,g,b)=>(0xff000000|(cl(b)<<16)|(cl(g)<<8)|cl(r))>>>0;
/** @param {number} a @param {number} b @param {number} k */
export function mixc(a,b,k){ return pack((a&255)+((b&255)-(a&255))*k,((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*k,((a>>16)&255)+(((b>>16)&255)-((a>>16)&255))*k); }
/** @param {number} a @param {number} k */
export function mulc(a,k){ return pack((a&255)*k,((a>>8)&255)*k,((a>>16)&255)*k); }
/** @param {number} a @param {number} r @param {number} g @param {number} b */
function addc(a,r,g,b){ return pack((a&255)+r,((a>>8)&255)+g,((a>>16)&255)+b); }
/** @param {number} a @param {number} b @param {number} x */
export function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
const clamp01 = (/** @type {number} */ v)=>v<0?0:v>1?1:v;
/** @param {number} x @param {number} y @param {number} z */
function norm3(x,y,z){ const l=Math.hypot(x,y,z); return [x/l,y/l,z/l]; }
/** A ramp darkened. @param {number[]} r @param {number} k */
const mulc4 = (r,k)=>r.map(c=>mulc(c,k));
/** Five tones of a material, from its shadow to its light. @param {string} hex @param {number} [hi] */
function ramp(hex,hi=1.3){ const c=rgb(hex); return [mulc(c,0.3),mulc(c,0.52),mulc(c,0.76),c,mulc(c,hi)]; }

/* Materials of the people, and their ramps (each figure maps them to its own colours). */
const M_CAP=1, M_HAIR=2, M_SKIN=3, M_TOP=4, M_PANT=5, M_BOOT=6, M_STRAP=7, M_COAT=8, M_BEARD=9, M_FAR=10, M_BRASS=11;
const SKIN = ramp('#9a6a4c',1.22), BOOT = ramp('#24190f'), CAPR = ramp('#24221e'), HAIR = ramp('#2c241c');
const JACKETS = ['#3a2c1c','#a89e88','#33281a','#4a3824'].map(h=>ramp(h,1.3)), TROUSERS = ['#30271c','#3c3328','#342a1d','#3a2d1f'].map(h=>ramp(h));
const STRAP = ramp('#2c1e12'), COAT = ramp('#161a24',1.45), COATF = ramp('#0e1016'), BEARDR = ramp('#7a726a',1.2), BRASS = ramp('#a88638',1.3);
const BENCH_COATS = [ramp('#2e2419'),ramp('#2a231b')];
const WARM = rgb('#ffb86a'), COLD = rgb('#a8b4bc'), FIRE = rgb('#ff8a34');

/** The baked shed and the life in it. */
export const state = {
  /** @type {Uint32Array} */ bg:new Uint32Array(0), /** @type {Float32Array} */ z:new Float32Array(0), /** @type {Uint8Array} */ mat:new Uint8Array(0),
  /** @type {Float32Array} */ vign:new Float32Array(0),
  t:0, flick:1, n:4,
  /** @type {{x:number,y:number,vx:number,vy:number,age:number,life:number}[]} */ dust:[],
  /** @type {{x:number,y:number,age:number,life:number,dx:number}[]} */ puffs:[],
  /** @type {number[]} */ breathT:[],
  /** The two on the bench: still, whispering or shivering, and how far into it. */ benchMode:'still', benchPrev:'', benchT:0, benchDur:300, benchK:0,
};

/** Centre x of a stall. @param {number} k */
export function stallX(k){ const s=STALLS[k]; return (s[0]+s[1])/2; }

/* ---------- the shed, baked ---------- */

/** Sooty brick under flaking limewash; warmer by the stove, darker under the roof. @param {number} x @param {number} y */
function brick(x,y){
  const course=(y/3)|0, off=(course&1)*4, bx=Math.floor((x+off)/8), mort=y%3===0||Math.floor(x+off)%8===0;
  const id=h2(bx+5,course*3+2), base=[rgb('#4a3026'),rgb('#553628'),rgb('#422a22'),rgb('#5c3c2c')][id&3];
  let c=mort?rgb('#2c2622'):mulc(base,0.88+((id>>2)&15)/15*0.22);
  const lime=fbm(x*0.08+3,y*0.1);
  if(lime>0.6) c=mixc(c,rgb('#7a7464'),0.55); else if(lime>0.58) c=mixc(c,rgb('#2a241e'),0.4);
  c=mixc(c,rgb('#0e0c0a'),clamp01(0.35+0.35*vnoise(x*0.05+9,y*0.05)+(y<16?(16-y)*0.03:0)));
  if(x>118) c=mixc(c,rgb('#5a2c14'),0.18*smooth(118,144,x)*smooth(30,60,y));
  return c;
}
/** Old oak with its grain, lit by `light`. @param {number} x @param {number} y @param {number} light @param {boolean} vertical */
function oak(x,y,light,vertical){
  const g=fbm(vertical?x*0.9:x*0.08,vertical?y*0.08:y*0.9);
  return mulc(mixc(rgb('#3a2a1a'),rgb('#6a4e32'),g),light);
}

/** The shed's colour at a pixel. @param {number} x @param {number} y @param {number[]} S the sky's colours */
function bakeAt(x,y,S){
  const px=x+0.5, py=y+0.5;
  /* the window: sky through the bars, an arched head */
  if(px>=WIN.x0&&px<WIN.x1&&py<WIN.y1){ const ax=(px-(WIN.x0+WIN.x1)/2)/((WIN.x1-WIN.x0)/2);
    if(py<3&&ax*ax+(3-py)**2/9>1) return brick(x,y);
    if((x-WIN.x0)%4===2||y===4) return rgb('#1a1714');
    const c=mixc(mixc(S[0],S[1],py/WIN.y1),rgb('#a8aca4'),0.65); return mulc(c,0.9+0.1*vnoise(x*0.3,y*0.3)); }
  if(py>=WIN.y1&&py<WIN.y1+1&&px>=WIN.x0-1&&px<WIN.x1+1) return rgb('#6a665c');   /* the sill */
  /* the beam with the iron shaft along it */
  if(py>=BEAM_Y0&&py<BEAM_Y1&&px<110){ if(y===12) return mixc(rgb('#3a3632'),rgb('#6a645a'),0.4*vnoise(x*0.5,1));
    return oak(x,y,y===BEAM_Y0?1.15:y===BEAM_Y1-1?0.55:0.85,false); }
  /* the posts: oak, lit on the left, spear tips, chalk tallies */
  for(const [a,b] of POSTS) if(px>=a&&px<b&&py>=BEAM_Y1&&py<STALL_Y1+2){
    const u=(px-a)/(b-a); let c=oak(x,y,u<0.3?1.15:u>0.75?0.5:0.85,true);
    if(py>STALL_Y1-4){ const half=(STALL_Y1+2-py)*0.6; if(Math.abs(px-(a+b)/2)>half) return rgb('#1a1612'); c=mulc(c,0.8); }
    if(py>=44&&py<47&&(x-a)%2===0&&u>0.2&&u<0.8) c=mixc(c,rgb('#c8c2b0'),0.55);   /* tally marks */
    return c; }
  /* the band of boards over the stalls, with their number plates */
  if(py>=BEAM_Y1&&py<BAND_Y1&&px<105){ for(let k=0;k<4;k++){ if(Math.abs(px-stallX(k))<5&&py>=16&&py<19.5) return rgb('#14110e'); }
    return oak(x,y,y===BEAM_Y1?0.95:0.72,false); }
  /* the stalls' back panels and rail are drawn each frame with the treads */
  for(const [a,b] of STALLS) if(px>=a&&px<b&&py>=BAND_Y1&&py<STALL_Y1) return rgb('#0c0a08');
  /* the stove: black iron, rivets, its pipe up to the roof */
  if(px>=STOVE.x0&&px<STOVE.x1&&py>=STOVE.y0&&py<STOVE.y1){ let c=mixc(rgb('#141312'),rgb('#2c2a28'),vnoise(x*0.4,y*0.2));
    if(y===STOVE.y0||y===STOVE.y0+1) c=rgb('#3e3a36'); if((x+y)%7===0&&(y===STOVE.y0+3||y===STOVE.y1-3)) c=rgb('#5a5650'); return c; }
  if(px>=138&&px<142&&py<STOVE.y0) return mixc(rgb('#141312'),rgb('#2a2826'),px<139?0.8:0.2);
  /* the floor: wet flagstones */
  if(py>=FLOOR_Y){ const row=((y-FLOOR_Y)/((y-FLOOR_Y)<8?4:6))|0, off=(row&1)*7, fl=Math.floor((x+off)/14), joint=(x+off)%14===0;
    let c=mulc(rgb('#2a2620'),0.8+(h2(fl,row+3)&15)/40); if(joint) c=rgb('#141210');
    const wet=fbm(x*0.12,y*0.3); if(wet>0.58) c=mixc(c,rgb('#5a5a56'),(wet-0.58)*1.6);
    return mixc(c,rgb('#0a0908'),clamp01((y-FLOOR_Y)/40)); }
  /* the crate by the stove */
  if(px>=130&&py>=74&&py<96&&px<144) return mulc(oak(x,y,0.6,(x&3)===0),0.8);
  return brick(x,y);
}

/** Bake the shed and the warder's body (which never moves). @param {number} [n] */
export function buildWheelScene(n=4){
  const S=state, N=W*H, b=skyBucket(), sky=skyColors(b,roomsState.SKY[b]).map(rgb);
  S.n=n; S.t=0; S.dust=[]; S.puffs=[]; S.breathT=[0,1,2,3].map(k=>30+k*17); S.benchMode='still'; S.benchK=0; S.benchT=0;
  S.bg=new Uint32Array(N); S.z=new Float32Array(N).fill(-1e9); S.mat=new Uint8Array(N); S.vign=new Float32Array(N);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ S.bg[y*W+x]=bakeAt(x,y,sky);
    const dx=(x-70)/90, dy=(y-46)/62; S.vign[y*W+x]=clamp01(1.06-0.28*(dx*dx+dy*dy)); }
  for(const [x0,x1] of [[122,124],[132,134]]) for(let y=67;y<95;y++) for(let x=x0;x<x1;x++) S.bg[y*W+x]=oak(x,y,x===x0?0.9:0.55,true);   /* the stool */
  for(let y=65;y<68;y++) for(let x=119;x<136;x++) S.bg[y*W+x]=oak(x,y,y===65?1.1:0.7,false);
  for(const lx of [5,46]) for(let y=BENCH.y1;y<H;y++) for(let x=lx;x<lx+3;x++) S.bg[y*W+x]=oak(x,y,0.45,true);   /* the bench's legs */
  const prev=rendererState.fb; rendererState.fb=S.bg; warderBody(); rendererState.fb=prev;
}

/* ---------- height fields ---------- */

let bx0=W, bx1=-1, by0=H, by1=-1;
/** Start a figure. */
function begin(){ bx0=W; bx1=-1; by0=H; by1=-1; }
/** @param {number} x @param {number} y @param {number} z @param {number} m */
function plot(x,y,z,m){ if(x<0||y<0||x>=W||y>=H) return; const i=y*W+x, Z=state.z; if(m===M_TOP||m===M_PANT||m===M_COAT||m===M_FAR) z+=0.5*vnoise(x*0.55+m*7,y*0.3)+0.2*vnoise(x*1.3,y*0.9+m);   /* rumpled cloth */ if(z>Z[i]){ Z[i]=z; state.mat[i]=m; if(x<bx0)bx0=x; if(x>bx1)bx1=x; if(y<by0)by0=y; if(y>by1)by1=y; } }
/** A capsule between a and b, radii r0..r1, raised z0..z1, optional bulge. @param {number[]} a @param {number[]} b @param {number} r0 @param {number} r1 @param {number} z0 @param {number} z1 @param {number} m @param {number} [bl] */
function cap(a,b,r0,r1,z0,z1,m,bl=0){
  const rm=Math.max(r0,r1)+bl, dx=b[0]-a[0], dy=b[1]-a[1], l2=dx*dx+dy*dy||1e-6;
  for(let y=Math.floor(Math.min(a[1],b[1])-rm);y<=Math.ceil(Math.max(a[1],b[1])+rm);y++) for(let x=Math.floor(Math.min(a[0],b[0])-rm);x<=Math.ceil(Math.max(a[0],b[0])+rm);x++){
    const px=x+0.5, py=y+0.5, t=clamp01(((px-a[0])*dx+(py-a[1])*dy)/l2), ex=px-a[0]-dx*t, ey=py-a[1]-dy*t, r=r0+(r1-r0)*t+bl*4*t*(1-t), d2=ex*ex+ey*ey;
    if(d2<r*r) plot(x,y,z0+(z1-z0)*t+Math.sqrt(r*r-d2),m); }
}
/** A (super)ellipsoid. @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} z0 @param {number} rz @param {(x:number,y:number)=>number} m @param {number} [e] */
function ell(cx,cy,rx,ry,z0,rz,m,e=2){
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    const q=Math.abs((x+0.5-cx)/rx)**e+Math.abs((y+0.5-cy)/ry)**e; if(q<1) plot(x,y,z0+rz*Math.sqrt(1-q),m(x,y)); }
}

/**
 * Light a figure's height field into the frame and clear it: the key light's tone from each normal, a crease where a
 * part passes over another, a coloured rim on the side that faces a second light.
 * @param {Record<number,number[]>} pal material → five tones
 * @param {{key:number[],amb:number,k:number,rims?:{d:number[],c:number,k:number}[],fade?:number,cloth?:number}} L
 */
function shade(pal,L){
  if(bx1<bx0) return;
  const Z=state.z, M=state.mat, fb=rendererState.fb, fade=L.fade??1;
  for(let y=by0;y<=by1;y++) for(let x=bx0;x<=bx1;x++){ const i=y*W+x, z=Z[i]; if(z<-1e8) continue;
    const zl=x>0&&Z[i-1]>-1e8?Z[i-1]:z-2.5, zr=x<W-1&&Z[i+1]>-1e8?Z[i+1]:z-2.5, zu=y>0&&Z[i-W]>-1e8?Z[i-W]:z-2.5, zd=y<H-1&&Z[i+W]>-1e8?Z[i+W]:z-2.5;
    const dzx=Math.max(-3,Math.min(3,(zr-zl)/2)), dzy=Math.max(-3,Math.min(3,(zd-zu)/2)), nl=1/Math.hypot(dzx,dzy,1), nx=-dzx*nl, ny=-dzy*nl, nz=nl;
    const m=M[i], tones=pal[m]||pal[M_TOP], over=Math.max(zl,zr,zu,zd)-z>2.2;
    let I=L.amb+L.k*Math.max(0,nx*L.key[0]+ny*L.key[1]+nz*L.key[2]);
    let k=Math.floor(I*5); if(over) k-=1; let c=tones[Math.max(0,Math.min(4,k))];
    const ex=Math.round(x+nx*2.2), ey=Math.round(y+ny*2.2), edge=ex<bx0||ex>bx1||ey<by0||ey>by1||Z[ey*W+ex]<-1e8;   /* the outline, where the light from behind catches */
    if(edge) for(const R of L.rims||[]){ if(R.k<=0) continue; const r=nx*R.d[0]+ny*R.d[1]; if(r>0.3) c=mixc(c,R.c,Math.min(0.7,(r-0.3)*1.4*R.k)); }
    fb[i]=fade>=1?c:mixc(fb[i],c,fade); }
  for(let y=by0;y<=by1;y++) Z.fill(-1e9,y*W+bx0,y*W+bx1+1);   /* clear the figure only after it is lit: its neighbours shape the normals */
}

/* ---------- the warder (his body is baked; his head turns) ---------- */

/** The seated warder's greatcoat, legs, boots, the arm holding the lantern out and the one with the stick on his knee. */
function warderBody(){
  begin();
  cap([128,64],[119,67],3.6,3,0,0,M_FAR); cap([119,67],[116,85],2.6,2,0,-1,M_FAR); ell(114.5,86.5,3.6,2,0,1.6,()=>M_BOOT);   /* the far leg */
  cap([126,63],[117,64],4.2,3.6,3,3,M_COAT); cap([117,64],[113,84],3,2.4,3,2,M_COAT); ell(111,86,4.2,2.2,3,2,()=>M_BOOT);   /* the near leg */
  cap([127,62],[126,47],6.4,5.8,1,2,M_COAT,0.6); ell(122.5,63,6,4,2,3,()=>M_COAT);                                        /* the body, the coat's skirt over his lap */
  cap([128,50],[127,58],2.4,2.1,4,5,M_COAT); cap([127,58],[121,61],2.1,1.8,5,6,M_COAT); ell(120,61.5,1.8,1.6,6,1.5,()=>M_SKIN);   /* the hand on the knee */
  cap([124,49],[119,55],2.4,2.1,6,7,M_COAT); cap([119,55],[114,53.5],2.1,1.7,7,8,M_COAT); ell(113.2,53.4,1.7,1.6,8,1.4,()=>M_SKIN);   /* the lantern arm */
  ell(125.3,46.5,3.4,2.4,3,2.5,()=>M_COAT);                                                                               /* the collar */
  for(let k=0;k<4;k++) ell(122.4,49+k*3,0.6,0.6,8,0.6,()=>M_BRASS);                                                       /* buttons */
  shade({[M_COAT]:COAT,[M_FAR]:COATF,[M_BOOT]:BOOT,[M_SKIN]:SKIN,[M_BRASS]:BRASS},{key:norm3(-0.8,0.2,0.55),amb:0.08,k:0.9,rims:[{d:norm3(0.95,-0.2,0.2),c:FIRE,k:0.35}]});
}

/** How far his head is turned from the stalls to the camera (0 profile, watching … 1 staring at us). @param {any} G */
export function turned(G){
  if(G.phase==='watch') return 0;
  if(G.phase==='turn') return G.feint?0.45*Math.sin(Math.PI*Math.min(1,G.t/G.sec)):smooth(0,1,G.t/G.sec);
  if(G.phase==='away') return 1;
  if(G.phase==='warn') return 1-0.22*smooth(0,1,G.t/G.sec)+0.03*Math.sin(G.t*23);
  return 1-smooth(0,1,G.t/G.sec);
}

/** The warder's head turned by yaw: cap and peak, face, grey beard, ear, eyes under the brim; at the camera his eyes
 * catch the lantern. @param {number} a turn 0..1 @param {boolean} warn @param {boolean} shout */
function warderHead(a,warn,shout){
  const yaw=-Math.PI/2+a*Math.PI/2, dx=Math.sin(yaw), dz=Math.cos(yaw), {x:hx,y:hy,ry}=HEAD, rx=HEAD.rx*(0.82+0.18*Math.abs(dx));
  begin();
  for(let y=Math.floor(hy-ry-2);y<=hy+ry+1;y++) for(let x=Math.floor(hx-rx-1);x<=hx+rx+1;x++){
    const u=(x+0.5-hx)/rx, v=(y+0.5-hy)/ry, r2=u*u+v*v; if(r2>=1) continue;
    const w=Math.sqrt(1-r2), lf=u*dx+w*dz, lr=u*dz-w*dx;
    let m=M_HAIR;
    if(v<-0.32) m=M_CAP;
    else if(Math.abs(lr)>0.8&&v>-0.1&&v<0.25&&lf<0.3) m=M_SKIN;
    else if(lf>0.1&&v<0.25) m=M_SKIN;
    else if(lf>-0.3&&v>=0.22) m=M_BEARD;
    else if(Math.abs(lr)>0.5&&v>0) m=M_BEARD;
    plot(x,y,w*ry,m);
  }
  ell(hx,hy-ry*0.62,rx+0.9,ry*0.38,ry*0.55,1.4,()=>M_CAP,2.4);                                 /* the cap's crown, flat on top */
  const side=Math.abs(dx);
  if(side>0.3){ cap([hx+dx*rx*0.9,hy-0.6],[hx+dx*(rx+1.4),hy+0.6],0.9,0.6,ry*0.6,ry*0.7,M_SKIN); cap([hx+dx*rx*0.5,hy+2.6],[hx+dx*(rx+0.4),hy+4],1.4,1,ry*0.5,ry*0.55,M_BEARD); }
  if(side>0.25) cap([hx+dx*rx*0.5,hy-ry*0.3],[hx+dx*(rx+2.6),hy-ry*0.25+0.8],0.8,0.6,ry*0.9,ry*0.95,M_CAP);   /* the peak */
  shade({[M_CAP]:CAPR,[M_HAIR]:HAIR,[M_SKIN]:SKIN,[M_BEARD]:BEARDR},{key:norm3(-0.7,0.3,0.65),amb:0.12,k:0.88,rims:[{d:norm3(0.95,-0.2,0.2),c:FIRE,k:0.5}]});
  const fb=rendererState.fb;
  if(dz>0.25) for(let x=Math.floor(hx-rx*0.95);x<=hx+rx*0.95;x++){ const i=Math.round(hy-ry*0.28)*W+x; fb[i]=mulc(fb[i],0.45); }   /* the brim's shadow over the brow */
  if(dz>0.55){ const s=smooth(0.55,1,dz), sh=warn?-0.6:0;   /* his eyes catch the lantern */
    for(const e of [-0.38,0.38]){ const ex=Math.round(hx+rx*e*dz+sh), ey=Math.round(hy-ry*0.08), i=ey*W+ex; fb[i]=mixc(fb[i],rgb('#fff0cc'),s); } }
  if(shout&&dz<0.5){ const i=Math.round(hy+ry*0.35)*W+Math.round(hx+dx*rx*0.75); fb[i]=rgb('#1a0c08'); }
}

/* ---------- the prisoners ---------- */

/** Height of a man's body on the wheel: lower when he sinks, up on the rail. @param {any} m */
function bodyDrop(m){ return m.resting?-1.5:(3-Math.max(0,Math.min(3,m.P)))*2.5+(m.P<=0?2:0); }
/** Where his head is. @param {any} m */
function headY(m){ const f=clamp01(m.O/m.body.breath); return 26+bodyDrop(m)+(f<0.35?1.5:f<0.6?0.7:0); }

/** Gait from the wheel: the foot due on the next tread rises and lands at the line, the other is carried down.
 * @param {any} V @returns {{frac:number,due:number}} */
function gait(V){
  const c0=V.nk-1+(V.warp&&(V.nk-1)%24===7?1/3:0), c1=V.nk+(V.warp&&V.nk%24===7?1/3:0);
  return {frac:clamp01((V.pos-c0)/Math.max(0.2,c1-c0)),due:V.nk&1};
}

/**
 * A prisoner from behind in his stall, leaning over the rail: head (a cap or, for the hero, hair), neck, the round of
 * his back with shoulder blades, arms out to the rail, legs to the treads; resting, hanging, falling, collapsed.
 * @param {any} V @param {number} stall @param {any} m @param {boolean} hero @param {number} beamOn how much the lantern lights him
 */
function drawMan(V,stall,m,hero,beamOn){
  const f=clamp01(m.O/m.body.breath), G=gait(V);
  let drop=bodyDrop(m), fade=1;
  if(m.out){ if(m.outT>1.2){ slumped(stall,m,hero); return; } drop+=m.outT*m.outT*26; fade=1-smooth(0.8,1.2,m.outT); }
  const hunch=f<0.35?1.5:f<0.6?0.7:0, jerk=(m.shoutT||m.hitT)?Math.sin(state.t*1.3)*0.5:0;
  const hanging=m.P<=0&&!m.resting&&!m.out, cx=MAN_X[stall]+jerk;
  const sway=m.out||m.resting||hanging?0:(G.due?-1:1)*Math.sin(Math.PI*G.frac)*0.6;
  const up=m.out?drop:hanging?6:drop*0.5+hunch*0.6, yb=Y_LINE+drop, hips=43+up, sh=28.5+up+hunch*0.5;
  begin();
  /* legs: straight from the hip to the heel; the raised one looks shorter */
  for(const s of [-1,1]){
    const lx=cx+sway+s*2.1, due=(s<0?0:1)===G.due; let fy;
    if(m.out) fy=yb+(s>0?1.5:0);
    else if(m.resting) fy=hips+8+(s>0?0.5:0);
    else if(hanging) fy=yb+3+Math.sin(state.t*0.2+s);
    else if(due) fy=yb+2.4*(1-G.frac)-5*Math.sin(Math.PI*G.frac);
    else fy=yb+2.4*G.frac;
    if(m.slip&&due) fy+=m.slip*2.5;
    cap([lx,hips+1.5],[lx+s*0.3,fy-1.5],2.6,1.8,2,1,M_PANT); ell(lx+s*0.4,fy-0.6,2,1.2,1.5,1.2,()=>M_BOOT);
  }
  for(const s of [-1,1]) ell(cx+sway*0.5+s*1.9,hips+1,2.7,2.5,2,2.2,()=>M_PANT);                   /* the seat of his trousers */
  /* the back, leaning forward: round shoulders, blades, the spine, the jacket ending over the hips */
  for(let y=Math.floor(sh-1);y<=hips;y++){ const t=(y+0.5-sh)/(hips-sh), hw=t<0.18?4.4+10*t:6.2-1.9*smooth(0.18,1,t);
    for(let x=Math.floor(cx-hw);x<=cx+hw;x++){ const X=x+0.5-cx, u=X/hw; if(Math.abs(u)>=1||t<-0.1) continue;
      let z=hw*Math.sqrt(1-u*u)+2.2*(1-t);
      z+=0.8*Math.exp(-((((Math.abs(X)-2.8)/1.5)**2)+(((t-0.32)/0.2)**2)));                         /* the shoulder blades */
      z-=0.7*Math.exp(-((X/0.75)**2))*smooth(0.18,0.4,t);                                          /* the spine's groove */
      plot(x,y,z,hero&&Math.abs(Math.abs(X)-(2.2-t*1.3))<0.45&&t<0.9?M_STRAP:M_TOP); } }
  /* arms bent out to the rail (straight up when he hangs, folded when he leans on it) */
  for(const s of [-1,1]){
    const S=[cx+s*5,sh+1.6], hand=hanging?[cx+s*4.8,RAIL_Y]:[cx+s*7.4,RAIL_Y-0.6+(m.resting?-0.5:0)], E=hanging?[cx+s*5,(S[1]+RAIL_Y)/2]:[cx+s*7.6,sh+4.4+(m.resting?-1:0)];
    cap(S,E,1.9,1.6,5,5.5,M_TOP); cap(E,hand,1.6,1.3,5.5,6,M_TOP); ell(hand[0],hand[1],1.3,1.1,6,1,()=>M_SKIN);
  }
  cap([cx,sh],[cx,sh-2],1.3,1.2,4,4.4,M_SKIN);                                                  /* the neck */
  const hy=sh-3.4;
  ell(cx,hy,2.8,3,4,2.8,(x,y)=>hero?M_HAIR:(y+0.5<hy+0.8?M_CAP:M_HAIR),hero?2:2.3);            /* the head bowed between the shoulders */
  if(!hero) ell(cx,hy+0.5,3.4,0.8,5.2,0.6,()=>M_CAP);                                          /* the cap's brim */
  shade({[M_TOP]:JACKETS[stall],[M_PANT]:TROUSERS[stall],[M_BOOT]:BOOT,[M_SKIN]:SKIN,[M_CAP]:CAPR,[M_HAIR]:HAIR,[M_STRAP]:STRAP},
    {key:norm3(-0.62,-0.62,0.48),amb:0.06+(stall===1?0.1:0),k:1+(stall===1?0.15:0),rims:[{d:norm3(-0.95,-0.1,0.25),c:COLD,k:stall===1?0.9:0.35},{d:norm3(0.95,0,0.3),c:WARM,k:beamOn}],fade});
}

/** A man who dropped off, slumped at the foot of his stall. @param {number} stall @param {any} m @param {boolean} hero */
function slumped(stall,m,hero){
  const cx=MAN_X[stall], y=STALL_Y1-1, bob=Math.sin(state.t*0.05+stall)*0.3+(m.def?.sick?Math.max(0,Math.sin(state.t*0.3))*0.4:0);
  begin();
  ell(cx,y-4+bob,5.2,4.2,0,3.6,()=>M_TOP); cap([cx-3,y-1],[cx-5,y],1.6,1.4,1,1,M_PANT); cap([cx+3,y-1],[cx+5,y],1.6,1.4,1,1,M_PANT);
  ell(cx,y-8.5+bob,2.4,2.5,2,2.2,()=>hero?M_HAIR:M_CAP);
  shade({[M_TOP]:JACKETS[stall],[M_PANT]:TROUSERS[stall],[M_CAP]:CAPR,[M_HAIR]:HAIR},{key:norm3(-0.6,-0.6,0.5),amb:0.06,k:0.65});
}

/** The two on the bench, seen from behind: hunched backs, heads; they breathe, whisper, shiver; the plank in front. */
function benchMen(){
  const S=state, k=S.benchK, mode=S.benchMode==='still'?S.benchPrev:S.benchMode, breath=Math.sin(S.t*0.045);
  BENCH_MEN.forEach((b,j)=>{
    const shiver=mode==='lawka-zimno'?k*(S.t%5<2?0.5:-0.3):0, hunch=mode==='lawka-zimno'?k*1.5:0;
    const lean=mode==='lawka-szept'?k*(j===0?1.8:-0.8):0, cx=b.x+shiver, sh=b.y+5+breath*0.4-hunch*0.5;
    begin();
    for(let y=Math.floor(sh-2);y<BENCH.y0+2;y++){ const t=(y+0.5-sh)/(BENCH.y0-sh), hw=t<0.22?4.6+16*Math.max(0,t+0.08):9.4+1.4*smooth(0.22,1,t)+hunch*0.4;
      for(let x=Math.floor(cx-hw);x<=cx+hw;x++){ const X=x+0.5-cx, u=X/hw; if(Math.abs(u)>=1) continue;
        let z=hw*0.85*Math.sqrt(1-u*u)+2*(1-Math.max(0,t));
        z+=1.1*Math.exp(-((((Math.abs(X)-4)/2.4)**2)+(((t-0.15)/0.18)**2)));                   /* the shoulder blades under the coat */
        z-=0.8*Math.exp(-((X/1)**2))*smooth(0.1,0.35,t);                                         /* the spine */
        plot(x,y,z,M_TOP); } }
    cap([cx+lean*0.4,sh-0.5],[cx+lean*0.7,sh-3],1.8,1.7,6,7,M_SKIN);                              /* the neck */
    ell(cx+lean,sh-6+hunch*0.9,3.8,4.2,6,3.8,(x,y)=>y+0.5>sh-3.4+hunch*0.9?M_SKIN:M_HAIR);       /* the head, cropped hair, the nape */
    for(const sd of [-1,1]) ell(cx+lean+sd*3.7,sh-5.4+hunch*0.9,0.9,1.5,6,1,()=>M_SKIN);         /* ears */
    shade({[M_TOP]:BENCH_COATS[j],[M_HAIR]:HAIR,[M_SKIN]:mulc4(SKIN,0.6)},{key:norm3(0.1,-0.85,0.5),amb:0.04,k:0.55,rims:[{d:norm3(0,-0.95,0.3),c:mixc(WARM,COLD,0.55),k:0.8},{d:norm3(-0.9,-0.3,0.3),c:COLD,k:0.35}]});
  });
  const fb=rendererState.fb;
  for(let y=BENCH.y0;y<BENCH.y1;y++) for(let x=BENCH.x0;x<BENCH.x1;x++) fb[y*W+x]=oak(x,y,y===BENCH.y0?1.2:y===BENCH.y1-1?0.4:0.75,false);
}

/* ---------- the stalls: panels, rail, treads ---------- */

/** Screen y of a tread edge d treads above the line, on the stall's spacing. @param {number} d */
function treadY(d){ const f=6-d, i=Math.max(0,Math.min(TREAD_EDGES.length-2,Math.floor(f))), t=f-i; return TREAD_EDGES[i]+(TREAD_EDGES[i+1]-TREAD_EDGES[i])*t; }

/** Back panels, the rail and the moving treads of one stall. @param {any} V @param {number} k */
function drawStall(V,k){
  const [x0,x1]=STALLS[k], fb=rendererState.fb, hero=k===1;
  /** @type {{y:number,warp:boolean}[]} */ const edges=[];
  for(let j=V.nk-7;j<=V.nk+8;j++){ const w=V.warp&&((j%24)+24)%24===7; edges.push({y:treadY(j+(w?1/3:0)-V.pos),warp:w}); }
  for(let y=BAND_Y1;y<STALL_Y1;y++){
    let e=null, below=null;
    if(y>=PANEL_Y1) for(const q of edges){ if(q.y<=y+0.5&&(!e||q.y>e.y)) e=q; if(q.y>y+0.5&&(!below||q.y<below.y)) below=q; }
    for(let x=x0;x<x1;x++){ let c;
      if(y<PANEL_Y1){                                                                          /* dark boards behind him, the rail */
        c=mixc(rgb('#0a0806'),rgb('#2a2016'),0.25+0.5*fbm(x*0.9,y*0.06)); if((x-x0)%5===0) c=mulc(c,0.55);
        if(hero) c=mixc(c,rgb('#5a5e60'),0.45*smooth(PANEL_Y1,BAND_Y1,y)*(0.6+0.4*vnoise(x*0.3,y*0.2)));   /* the window's haze in stall 17 */
        if(y===RAIL_Y-1) c=mixc(rgb('#7a5c3c'),rgb('#a07a50'),vnoise(x*0.5,2)); else if(y===RAIL_Y) c=rgb('#3a2a1a'); else if(y===RAIL_Y+1) c=rgb('#140f0a');
      } else if(!e||!below) c=rgb('#0a0806');
      else { const into=y+0.5-e.y, u=into/Math.max(1,below.y-e.y), front=smooth(42,STALL_Y1,y);
        const edge=e.warp?rgb('#b8a684'):hero?mixc(rgb('#8a7660'),rgb('#9aa2a6'),0.5):rgb('#8a7660');
        c=into<1?mixc(rgb('#3a2e22'),edge,0.25+0.75*front):u<0.6?mulc(mixc(rgb('#2a2018'),rgb('#3e3022'),fbm(x*0.35,e.y*0.7+k)),0.55+0.45*front):rgb('#0e0b08');
        if(e.warp&&into>1&&Math.abs((x-x0)-7-((y*3)%4))<0.6) c=rgb('#0e0b08'); }               /* the crack in the warped tread */
      fb[y*W+x]=c; }
  }
}

/* ---------- the works: sails, cog, bell, brake ---------- */

/** @param {any} V */
function drawWorks(V){
  const fb=rendererState.fb, S=state, a0=V.pos*Math.PI/2+Math.PI/4, sail=rgb('#3c3e40');
  for(let k=0;k<4;k++){ const a=a0+k*Math.PI/2; for(let r=1;r<=5;r+=0.5){ const x=Math.round(HUB.x+Math.cos(a)*r), y=Math.round(HUB.y+Math.sin(a)*r); if(y<0||y>=WIN.y1||x<WIN.x0||x>=WIN.x1) continue; if((x-WIN.x0)%4!==2&&y!==4) fb[y*W+x]=sail; } }
  for(let y=0;y<BEAM_Y0;y++) for(let x=COG.x-COG.r-1;x<=COG.x+COG.r+1;x++){ const d=Math.hypot(x+0.5-COG.x,y+0.5-COG.y), an=Math.atan2(y+0.5-COG.y,x+0.5-COG.x)-V.pos*Math.PI/8;
    const tooth=d<COG.r+1&&d>=COG.r&&Math.cos(an*12)>0.2, rim=d<COG.r&&d>=COG.r-1.4, spoke=d<COG.r-1.4&&d>1.6&&Math.abs(Math.sin(an*3))<0.18, hub=d<=1.6;
    if(tooth||rim||spoke||hub) fb[y*W+x]=mixc(rgb('#1e1c1a'),rgb('#5a5650'),(x+0.5-COG.x<0?0.55:0.15)+(rim?0.15:0)); }
  const E=V.ev;
  if(E&&E.id==='jam'&&E.phase==='tell'&&S.t%4<2) for(let k=0;k<3;k++){ const x=COG.x-4+Math.round(Math.random()*8), y=Math.round(Math.random()*9); fb[y*W+x]=rgb('#ffd890'); }
  const sw=V.bell>0?Math.sin(V.bell*14)*V.bell:0;                                               /* the bell, swinging after the stroke */
  for(let y=0;y<5;y++) for(let x=-1-(y>>1);x<=1+(y>>1);x++){ const px=Math.round(BELL.x+x+sw*y*0.5); fb[(BELL.y+y)*W+px]=y===4?rgb('#5a4618'):mixc(rgb('#7a5e24'),rgb('#c8a050'),x<0?0.6:0.2); }
  for(let y=BELL.y+5;y<BELL.y+18;y++) fb[y*W+Math.round(BELL.x+sw*(y-BELL.y)*0.4)]=rgb('#6a5a44');
  if(E&&E.id==='brake'){ const pull=E.phase==='tell'?smooth(0,1,E.t/E.dur):1, ang=-0.12+pull*0.3;   /* the brake pole hauled towards him */
    for(let r=0;r<40;r++){ const x=Math.round(106+Math.sin(ang)*r), y=Math.round(74-Math.cos(ang)*r); if(y>=0) fb[y*W+x]=r>37?rgb('#5a5650'):rgb('#6a5038'); } }
}

/* ---------- life ---------- */

/** One step of the shed: dust, breath, the flame, the two on the bench. @param {any} V */
export function wheelSceneTick(V){
  const S=state; S.t++;
  S.flick=0.92+0.08*vnoise(S.t*0.11,3.3);
  const wind=V.ev&&V.ev.id==='wind';
  if((wind||Math.random()<0.02)&&S.dust.length<50) for(let k=0;k<(wind?2:1);k++) S.dust.push({x:10+Math.random()*95,y:BEAM_Y1,vx:(Math.random()-0.5)*0.05,vy:0.05+Math.random()*0.07,age:0,life:300+Math.random()*300});
  for(const d of S.dust){ d.age++; d.x+=d.vx+(wind?0.1:0)+Math.sin((S.t+d.life)*0.03)*0.02; d.y+=d.vy; }
  S.dust=S.dust.filter(d=>d.age<d.life&&d.y<H);
  const men=[{stall:V.heroStall,m:V.hero},...V.rivals.map((/** @type {any} */ r)=>({stall:r.stall,m:r}))];
  for(const {stall,m} of men){ if(m.out) continue; const f=m.O/m.body.breath;
    if(--S.breathT[stall]<=0){ S.breathT[stall]=Math.round(30+70*f+Math.random()*14); S.puffs.push({x:MAN_X[stall]+(Math.random()-0.5)*1.5,y:headY(m)-3,age:0,life:80,dx:0.012}); } }
  if(++S.benchT>=S.benchDur){ const was=S.benchMode; if(was!=='still') S.benchPrev=was;
    S.benchMode=was==='still'?(Math.random()<0.5?'lawka-szept':'lawka-zimno'):'still'; S.benchT=0;
    S.benchDur=S.benchMode==='still'?300+Math.random()*360:S.benchMode==='lawka-szept'?150+Math.random()*90:200+Math.random()*140; }
  S.benchK=S.benchMode==='still'?Math.max(0,S.benchK-1/20):Math.min(1,S.benchK+1/20);
  if(Math.random()<(S.benchMode==='lawka-szept'?0.04:0.01)){ const left=Math.random()<(S.benchMode==='lawka-szept'?0.8:0.5);
    S.puffs.push({x:left?13:33,y:58,age:0,life:90,dx:S.benchMode==='lawka-szept'&&left?0.12:0.01}); }
  for(const p of S.puffs) p.age++;
  S.puffs=S.puffs.filter(p=>p.age<p.life);
}

/* ---------- the whole picture ---------- */

/** Draw the shed into the renderer's buffer. @param {any} V */
export function renderWheelScene(V){
  const S=state, fb=rendererState.fb; if(!S.bg.length) return;
  fb.set(S.bg);
  drawWorks(V);
  for(let k=0;k<4;k++) drawStall(V,k);
  const G=V.guard, a=turned(G), shut=smooth(0.15,0.6,a), lit=(G.phase==='watch'||G.phase==='back')?1-shut:0;
  const beamStall=(/** @type {number} */ k)=>lit*clamp01(1-Math.abs(G.beam-k)/0.9);
  for(const r of V.rivals) drawMan(V,r.stall,r,false,beamStall(r.stall));
  drawMan(V,V.heroStall,V.hero,true,beamStall(V.heroStall));
  for(const [p0,p1] of POSTS) for(let x=p0;x<p1;x++) fb[Y_LINE*W+x]=mixc(fb[Y_LINE*W+x],rgb('#d8d2c0'),0.75);   /* chalk at the line */
  for(let k=0;k<4;k++){ const out=k===V.heroStall?V.hero.out:V.rivals.some((/** @type {any} */ r)=>r.stall===k&&r.out);   /* the numbers; dark when the man is off */
    drawText(String(NUMBERS[k]),Math.round(stallX(k)),16,rgb(out?'#2a2620':k===V.heroStall?'#e8dfc4':'#a89c80'),1); }
  benchMen();
  const sk=G.strike>0?Math.sin(G.strike*18):0;                                                    /* his stick, the lantern, his head */
  if(G.shout>0||G.strike>0) line(113,55,100+sk*2,44+sk*3,rgb('#4a3622')); else line(STICK[0][0],STICK[0][1]+(G.knock>0?Math.sin(G.knock*25)*1.5:0),STICK[1][0],STICK[1][1],rgb('#4a3622'));
  lantern(1-shut);
  warderHead(a,G.phase==='warn'&&G.t>G.sec*0.25,G.shout>0);
  for(const d of S.dust){ const i=Math.round(d.y)*W+Math.round(d.x); if(i>=0&&i<W*H) fb[i]=mixc(fb[i],rgb('#b9a98a'),0.3*(1-d.age/d.life)); }
  light(V,lit,G);
  puffs();
  hud(V);
}

/** A thin dark line (the stick). @param {number} ax @param {number} ay @param {number} bx @param {number} by @param {number} c */
function line(ax,ay,bx,by,c){ const n=Math.ceil(Math.hypot(bx-ax,by-ay)); for(let k=0;k<=n;k++){ const x=Math.round(ax+(bx-ax)*k/n), y=Math.round(ay+(by-ay)*k/n); if(x>=0&&y>=0&&x<W&&y<H) rendererState.fb[y*W+x]=c; } }

/** The bull's-eye lantern in his hand: brass, the lens bright while its shutter is open. @param {number} open */
function lantern(open){
  const fb=rendererState.fb, x=LANTERN.x|0, y=LANTERN.y|0;
  for(let yy=-2;yy<=2;yy++) for(let xx=-2;xx<=1;xx++) fb[(y+yy)*W+x+xx]=mixc(rgb('#3a2c12'),rgb('#a88638'),xx<0?0.6:0.25);
  fb[(y-3)*W+x]=rgb('#2a2622');
  const lens=mixc(rgb('#2a2016'),rgb('#fff2c8'),open); fb[y*W+x-2]=lens; fb[(y+1)*W+x-2]=mixc(lens,rgb('#ffb060'),0.3);
}

/**
 * Light the frame: the lantern's beam to the stall it watches, the window's cold shaft onto stall 17 blinking with the
 * sails, the stove's grate and glow, smog under the roof, the vignette, the trance and the pulse of a spent man.
 * @param {any} V @param {number} lit the beam's strength @param {any} G
 */
function light(V,lit,G){
  const S=state, fb=rendererState.fb, lx=LANTERN.x-2.5, ly=LANTERN.y, tx=MAN_X[Math.max(0,Math.min(3,Math.round(G.beam)))]+(G.beam-Math.round(G.beam))*23, ty=40;
  const dx0=tx-lx, dy0=ty-ly, bl=Math.hypot(dx0,dy0), sail=Math.abs(Math.cos(2*(V.pos*Math.PI/2+Math.PI/4)))*0.3+0.7;
  const wx=30, wy=WIN.y1, hx=MAN_X[1], low=V.hero.out?0:clamp01(1-V.hero.O/V.hero.body.breath/0.3), pulse=0.5+0.5*Math.sin(S.t*0.25);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){
    const i=y*W+x; let c=fb[i], ar=0, ag=0, ab=0;
    if(lit>0){ const dx=x+0.5-lx, dy=y+0.5-ly, along=(dx*dx0+dy*dy0)/bl;
      if(along>0){ const off=Math.abs(dx*dy0-dy*dx0)/bl, half=1.2+along*0.36, k=clamp01(1-off/half)*clamp01(1.5-along/(bl*1.05));
        const kk=Math.pow(k,0.7)*(0.55+0.45*fbm(x*0.2+S.t*0.008,y*0.2))*lit; ar+=110*kk; ag+=76*kk; ab+=36*kk; }
      const halo=clamp01(1-Math.hypot(x+0.5-lx,y+0.5-ly)/7)*lit; ar+=120*halo*halo; ag+=80*halo*halo; ab+=30*halo*halo; }
    const sx=wx+(y-wy)*((hx-wx)/45), d=Math.abs(x+0.5-sx);
    if(y>wy&&y<STALL_Y1&&d<6){ const k=(1-d/6)**2*smooth(wy,wy+8,y)*smooth(STALL_Y1,STALL_Y1-30,y)*0.3*sail; ar+=110*k; ag+=118*k; ab+=125*k; }
    if(x>=GRATE.x0&&x<GRATE.x1&&y>=GRATE.y0&&y<GRATE.y1&&(x-GRATE.x0)%2===0){ c=mixc(rgb('#3a1406'),FIRE,(0.6+0.4*vnoise(x*0.6+S.t*0.09,y*0.4))*S.flick); }
    else if(x>110&&y>34&&y<80){ const st=clamp01(1-Math.hypot(x-139,y-58)/26)*S.flick; ar+=60*st*st; ag+=24*st*st; }
    if(ar||ag||ab) c=addc(c,ar,ag,ab);
    const fog=(0.05+0.07*fbm(x*0.05+S.t*0.0012,y*0.08-S.t*0.0005))*smooth(24,2,y)*(y<WIN.y1&&x>=WIN.x0&&x<WIN.x1?0.3:1);   /* smog only under the roof */
    if(fog>0) c=mixc(c,rgb('#3a403a'),fog);
    let v=S.vign[i]; if(V.hero.trance) v*=1-0.35*clamp01(Math.hypot((x-hx)/36,(y-40)/30)-0.45);
    if(low>0) c=mixc(c,rgb('#4a0a06'),(1-v+0.1)*low*pulse*0.6);
    fb[i]=mulc(c,v);
  }
}

/** Breath over the heads, drawn after the light: it catches it. */
function puffs(){
  const fb=rendererState.fb;
  for(const p of state.puffs){ const k=p.age/p.life, a=0.2*(1-k)*Math.min(1,p.age/10), rr=1+k*3, cx=p.x+k*3+p.dx*p.age, cy=p.y-k*6;
    for(let y=Math.floor(cy-rr);y<=cy+rr;y++) for(let x=Math.floor(cx-rr);x<=cx+rr;x++){ const d=Math.hypot(x+0.5-cx,y+0.5-cy)/rr; if(d>=1||x<0||y<0||x>=W||y>=H) continue;
      fb[y*W+x]=mixc(fb[y*W+x],rgb('#c8ccc4'),a*(1-d)); } }
}

/** His breath and grip as chalk tallies on the posts of his stall; the choice after a win. @param {any} V */
function hud(V){
  const H0=V.hero, fb=rendererState.fb, low=clamp01(1-H0.O/H0.body.breath/0.3);
  const bar=(/** @type {number} */ x,/** @type {number} */ k,/** @type {string} */ hex)=>{ const c=rgb(hex), d=rgb('#1a1612'), len=15;
    for(let j=0;j<len;j++){ const i=(RAIL_Y+1-j)*W+x; if(j<Math.round(k*len)) fb[i]=c; else if(j%3===0) fb[i]=d; } };
  bar(POSTS[V.heroStall][0]+1,clamp01(H0.O/H0.body.breath),low>0&&state.t%30<15?'#e07050':'#e4dfcf');
  bar(POSTS[V.heroStall+1][0]+2,clamp01(H0.C/H0.body.grip),'#c8925e');
  if(V.phase==='choice'){ const c=rgb('#e8e2cc'); drawText('<ZEJDZ',36,80,c,1); drawText('ZOSTAN>',84,80,c,1); }
}
