// Alley props: every ALLEY.boxes entry drawn in code (barrels, crates, carts, pump, gas lamps, gate, washing, signs ...).
// alleyPropsStatic() bakes what is flat or fixed to the wall; alleyProps(t) returns what must sort with the player or move.
// Every drawing stays inside the footprint of its box (collision and depth come from it). Texture noise uses world pixels (x-camera.x).
import { rgb, state as appearanceState } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { quad, shadeC, isoX, isoY } from './gym.js';
import { mix } from './cast.js';
import { h2 } from './boxing.js';
import { camera, contact, thin, floor, rope, cyl, roundLit, vn, frac, onI, onJ, ground, crate, lettering } from './thames-port.js';
import { ALLEY } from './alley-layout.js';
import { fireLevel } from './alley-light.js';

const ramp=(/** @type {string[]} */a)=>a.map(h=>rgb(h));
const WOOD=ramp(['#2a221b','#3a2f24','#4d3f30','#65543e']), MOSSW=ramp(['#272c23','#343c2c','#454d38']),
  IRON=ramp(['#17171a','#232326','#33343a','#4a4c52']), RUST=ramp(['#3b2418','#55321d','#74442a','#8f5a35']),
  STONE=ramp(['#3a3a36','#4a4a44','#5e5d54','#77745f']), JUNK=ramp(['#6e6652','#4a4538','#2f2b26']),
  LEAF=ramp(['#3a4023','#4d5230','#5c5a3a']), BRASS=ramp(['#7a5a28','#c8964a','#e8c375']), FLAME=ramp(['#fff1b8','#f0c060','#d98a2e']);
const RM=mix(RUST[1],IRON[1],.4), RM2=mix(RUST[2],IRON[2],.4);
const RUSTM=[RUST[0],RM,RM2,mix(RUST[3],IRON[3],.45)];
const SOOT=rgb('#14120f'), VOID=rgb('#0a0c0d'), CHALK=rgb('#a8a28f'), WATER=rgb('#10181a'), SKY=rgb('#2a3638'), GASGLINT=rgb('#b88c4a'),
  NAVY=rgb('#0f1620'), ROPE=rgb('#7d6847'), STRAW=rgb('#7d6847'), CLOTH=ramp(['#4a483f','#5d5a4e','#6e6a5c','#7c7766']);
/** Ground units per z unit (a person is 17 z = 1.36 ground units). */
const Z2G=1/8, OFF=.0417;
const TPS=60;

/** Deterministic 0..1 number for a prop id and slot. */
const rd=(/** @type {number} */sd,/** @type {number} */n)=>h2((sd+n*7919)|0,(sd>>>9)+n*31)/255;
/** String hash for ids. */
const hsh=(/** @type {string} */s)=>{ let h=2166136261; for(let k=0;k<s.length;k++) h=Math.imul(h^s.charCodeAt(k),16777619); return h>>>0; };
/** Smooth world-stable noise at a screen pixel. */
const wn=(/** @type {number} */x,/** @type {number} */y,/** @type {number} */sc,/** @type {number} */s=0)=>vn((x-camera.x)*sc+s,(y-camera.y)*sc*1.3+s*.7);

/** Put one pixel (screen coordinates) into the frame. */
function px(/** @type {number} */x,/** @type {number} */y,/** @type {number} */c){
  x=Math.round(x); y=Math.round(y);
  if(x>=0&&y>=0&&x<appearanceState.W&&y<appearanceState.H) rendererState.fb[y*appearanceState.W+x]=c;
}
/** A two-pixel-thick line: the thin line plus its copy one pixel to the right. */
function th2(i,j,z,I,J,Z,c,c2=c){ thin(i,j,z,I,J,Z,c); thin(i+OFF,j-OFF,z,I+OFF,J-OFF,Z,c2); }
/** Filled ellipse in screen pixels; fn(x,y,u,v) returns the colour (0 skips). */
function disc(cx,cy,rx,ry,fn){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H;
  for(let y=Math.max(0,Math.floor(cy-ry));y<=Math.min(H-1,Math.ceil(cy+ry));y++){ const v=(y+.5-cy)/ry;
    for(let x=Math.max(0,Math.floor(cx-rx));x<=Math.min(W-1,Math.ceil(cx+rx));x++){ const u=(x+.5-cx)/rx; if(u*u+v*v<=1){ const c=fn(x,y,u,v); if(c) fb[y*W+x]=c; } } }
}
/** Lumpy dome (heaps, sacks, rags) as stacked ellipses from the base up; fn(x,y,f,u,v) gives the colour, f = height share. */
function blob(/** @type {number} */cx,/** @type {number} */cy,/** @type {number} */rx,/** @type {number} */ry,/** @type {number} */hp,/** @type {(x:number,y:number,f:number,u:number,v:number)=>number} */fn,/** @type {number} */lump=.5,/** @type {number} */seed=0){
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H;
  for(let k=0;k<=hp;k++){
    const f=k/hp, rr=Math.sqrt(Math.max(0,1-f*f*.92)), ax=rx*rr, ay=ry*rr, c0=cy-k;
    for(let y=Math.max(0,Math.floor(c0-ay-1));y<=Math.min(H-1,Math.ceil(c0+ay+1));y++){ const v=(y+.5-c0)/ay;
      for(let x=Math.max(0,Math.floor(cx-ax-1));x<=Math.min(W-1,Math.ceil(cx+ax+1));x++){ const u=(x+.5-cx)/ax, d=u*u+v*v;
        if(d<1+(wn(x,y,.23,seed)-.5)*lump) fb[y*W+x]=fn(x,y,f,u,v);
      } }
  }
}
/** Screen centre of a ground point at height z. */
const sx=(/** @type {number} */i,/** @type {number} */j)=>isoX(i,j), sy=(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z)=>isoY(i,j,z);
/** Wall-plane texture helper: position (a along i, z) on plane j=J of the pixel. */
const light=(/** @type {number} */c,/** @type {number} */k)=>shadeC(c,k);

// ---------- barrels ----------

/** Standing cask: staves, hoops (one may be slipped), a crack, wet streaks; every barrel differs by its id. */
function cask(/** @type {any} */e,/** @type {{open?:boolean,water?:boolean,rusty?:boolean,tilt?:number}} */o={}){
  const b=e.box, sd=hsh(e.id), ci=(b[0]+b[2])/2, cj=(b[1]+b[3])/2, r=Math.min(b[2]-b[0],b[3]-b[1])/2-.03, h=e.z-rd(sd,1)*1.4;
  const tone=.8+rd(sd,2)*.4, mossy=rd(sd,3)<.35, hc=o.rusty?RUSTM:IRON, off=rd(sd,4)*7;
  const hoops=[1.1+rd(sd,5)*.5,3.3+rd(sd,6)*.4,h-3.9+rd(sd,7)*.4,h-1.3], slip=rd(sd,8)<.4?2:-1, miss=rd(sd,9)<.3?1:-1;
  const crack=rd(sd,10)*1.2-.6, ca=1.8+rd(sd,11)*2, cb=ca+3+rd(sd,12)*3, streak=rd(sd,13)*1.4-.7;
  const wood=(/** @type {number} */z,/** @type {number} */s)=>{
    const a=(Math.asin(s)+Math.PI/2)/Math.PI;
    for(let k=0;k<4;k++){ if(k===miss) continue; const hz=hoops[k]+(k===slip?.7:0); if(z>hz-.6&&z<hz+.6){
      const edge=z>hz+.25?1.35:z<hz-.3?.6:1; return light(mix(hc[2],hc[1],(1-roundLit(s))*.4),roundLit(s)*edge*(o.rusty?.85:1.15)); } }
    let k=roundLit(s)*tone; const st=a*7+off;
    if(frac(st)<.11) k*=.55; else if(frac(st)>.9) k*=1.12;
    if(Math.abs(s-crack)<.07&&z>ca&&z<cb) return light(WOOD[0],.8);
    if(Math.abs(s-crack)<.07&&z>ca-.3&&z<cb+.3) return light(WOOD[3],.9*tone);
    if(Math.abs(s-streak)<.1&&z<h-1.5&&z>h*.4+rd(sd,14)*3) k*=.62;
    let c=mossy&&z<4.2+rd(sd,15)*2?mix(WOOD[2],MOSSW[2],.55):WOOD[2];
    if(o.water) c=mix(c,MOSSW[1],.35);
    if(z<2.4) c=mix(c,rgb('#1d1a15'),.3*(2.4-z)/2.4);
    if(frac(st)>=.11&&((Math.floor(st)*3+Math.floor(z*.8))&3)===0) c=mix(c,WOOD[1],.4);
    return light(c,k);
  };
  contact(ci-r,cj-r,ci+r,cj+r,0,.5);
  cyl(ci,cj,r,0,h,wood,(s,v)=>{
    if(o.open||o.water){ if(Math.abs(v)>.78||Math.abs(s)>.84) return light(hc[3],1.1-v*.15); if(o.water) return mix(WATER,SKY,Math.max(0,.55-Math.abs(s+v*.5)*.6)); return light(VOID,1.4+v*.4); }
    if(Math.abs(v)>.8||Math.abs(s)>.88) return light(hc[3],1.2); const ps=frac(s*2.4+off*.3); if(ps<.09) return light(WOOD[0],1);
    if(Math.abs(s-.28)<.12&&Math.abs(v-.15)<.2) return light(WOOD[0],.8);
    return light(WOOD[2],.78+v*.12+(rd(sd,Math.floor(s*2.4+off*.3)+20)-.5)*.2);
  },.07);
}

/** Barrel lying on its side (axis along i), mouth towards +i, with a dark spill on the stones. */
function lying(/** @type {any} */e){
  const b=e.box, sd=hsh(e.id), r=.27, i0=b[0]+.1, i1=b[0]+.72, cj=b[1]+.5, zc=r+.12, N=12, tone=.85+rd(sd,1)*.3;
  // spill first: an irregular dark pool that runs out of the open end, flat on the stones
  floor(i1-.05,b[1]+.12,b[2]-.02,b[3]-.1,.04,(x,y)=>{ const [i,j]=ground(x,y,.04), u=(i-(i1+.12))/.3, v=(j-(cj+.12))/.38, d=u*u+v*v+(wn(x,y,.5,3)-.5)*.5;
    if(d>1) return 0; const g=Math.max(0,.55-(u*.7+v*.3+.55)); return mix(mix(rgb('#0c0e0d'),rgb('#2a221a'),d*.6),GASGLINT,g*.4*(1-d)); });
  contact(i0,cj-r,i1,cj+r,0,.5);
  const ring=(/** @type {number} */a,/** @type {number} */rr)=>[cj+Math.cos(a)*rr,zc+Math.sin(a)*rr];
  const rad=(/** @type {number} */i)=>r*(1+.1*Math.sin(Math.PI*(i-i0)/(i1-i0)));
  const segs=[[0,.1,1],[.1,.17,0],[.17,.46,1],[.46,.53,0],[.53,.82,1],[.82,.9,0],[.9,1,1]]; // [from,to,isStave]
  const facets=[]; for(let k=0;k<N;k++){ const a0=k/N*Math.PI*2, a1=(k+1)/N*Math.PI*2, am=(a0+a1)/2, nj=Math.cos(am), nz=Math.sin(am); if(nj+6*nz>-.2) facets.push({a0,a1,nj,nz,k,v:nj+6*nz}); }
  facets.sort((p,q)=>p.v-q.v);
  for(const f of facets) for(const [s0,s1,stave] of segs){
    const ia=i0+(i1-i0)*s0, ib=i0+(i1-i0)*s1, ra=rad(ia)*(stave?1:1.05), rb=rad(ib)*(stave?1:1.05), A=ring(f.a0,ra), B=ring(f.a1,ra), C=ring(f.a1,rb), D=ring(f.a0,rb);
    const lit=.5+.45*Math.max(0,f.nj)+.5*Math.max(0,f.nz), col=stave?light(f.k%3===1?WOOD[1]:WOOD[2],lit*tone*(f.k%4===0?.85:1)):light(RM2,lit*1.05);
    quad(ia,A[0],A[1],ia,B[0],B[1],ib,C[0],C[1],ib,D[0],D[1],()=>col);
  }
  // open mouth: dark inside with a pale rim and a drip of liquid on the lip
  const R=rad(i1), cen=ring(0,0);
  for(let k=0;k<N;k++){ const a0=k/N*Math.PI*2, a1=(k+1)/N*Math.PI*2, A=ring(a0,R), B=ring(a1,R), A2=ring(a0,R*.8), B2=ring(a1,R*.8);
    quad(i1,A[0],A[1],i1,B[0],B[1],i1,B2[0],B2[1],i1,A2[0],A2[1],()=>light(RM2,1.2));
    quad(i1,A2[0],A2[1],i1,B2[0],B2[1],i1,cen[0],cen[1],i1,cen[0],cen[1],()=>light(VOID,1.5)); }
  thin(i1,cj+R*.7,zc-R*.7,i1+.05,cj+R*.7,.1,GASGLINT); thin(i1+.05,cj+R*.7,.1,i1+.12,cj+R*.75,.05,GASGLINT);
}

/** Dust-bin of the court: iron tub with ribs, a dented rim and a lid (on, askew, or off with refuse heaped up). */
function bin(/** @type {any} */e){
  const b=e.box, sd=hsh(e.id), ci=(b[0]+b[2])/2, cj=(b[1]+b[3])/2, r=Math.min(b[2]-b[0],b[3]-b[1])/2-.03, h=e.z-1.2, mode=e.id==='bin-mouth'?'lid':e.id==='bin-doors'?'heap':e.id==='bin-end'?'askew':'lid';
  const rusty=rd(sd,1)>.4;
  contact(ci-r,cj-r,ci+r,cj+r,0,.5);
  cyl(ci,cj,r,0,h,(z,s)=>{
    const k=roundLit(s); if((z>h-1.2&&z<h-.3)||(z>h*.5-.35&&z<h*.5+.35)||(z<1&&z>.2)) return light(IRON[3],k*1.25);
    let c=mix(IRON[2],RM,rusty?.35+.4*wn(Math.floor(s*9),z*5,.6,sd%9):.1);
    if(wn(z*5+Math.floor(s*6)*4,Math.floor(z),.5,sd%5)>.7) c=mix(c,RUST[3],.3);
    if(z>h*.5&&Math.abs(s-.1)<.5&&Math.abs(s-.1)>.46) return light(IRON[1],1); // dent
    return light(c,k*1.15);
  },(s,v)=>mode==='heap'||mode==='askew'?(Math.abs(v)>.75||Math.abs(s)>.86?light(IRON[3],1.2):light(VOID,1.6+v*.3)):light(IRON[3],1-v*.15),.04);
  const cx=sx(ci,cj), cy=sy(ci,cj,h);
  if(mode==='lid'){ disc(cx,cy-1.5,r*17+1,r*8.5+1.5,(x,y,u,v)=>{ const k=.95+.3*(-u)*.5-v*.2; return light(v>.55?IRON[1]:mix(IRON[2],RM2,.25*(wn(x,y,.5,sd%7))),k); }); px(cx,cy-3.5,IRON[3]); px(cx-1,cy-3.5,IRON[3]); px(cx+1,cy-3.5,IRON[3]); px(cx,cy-4.5,IRON[3]); }
  else if(mode==='askew'){ disc(cx+5,cy+3,r*17*.8,r*8.5*.8,(x,y,u,v)=>light(IRON[2],.9-u*.15+(v<-.4?.3:0))); thin(ci+r*.5,cj+r*.7,h+.1,ci+r*.8,cj+r*.2,h-.6,IRON[3]); }
  if(mode==='heap'){ const fx=sx(ci,cj);
    blob(fx,cy,r*15,r*7,9,(x,y,f,u,v)=>{ const n=wn(x,y,.4,sd%11), l=.65+.5*f-.2*u; if(n>.7) return light(JUNK[0],l*1.1); if(n<.3) return light(JUNK[2],l*1.3); return light(n>.5?JUNK[1]:CLOTH[0],l*1.1); },.7,sd%13);
    thin(ci-.05,cj+.1,h+4,ci+.15,cj+.05,h+6,CHALK); }
}

/** Iron bollard marking the street edge: stem, mushroom cap and rust. */
function bollard(/** @type {any} */e){
  const b=e.box, ci=(b[0]+b[2])/2, cj=(b[1]+b[3])/2;
  contact(b[0],b[1],b[2],b[3],0,.5);
  cyl(ci,cj,.16,0,5.2,(z,s)=>{ const k=roundLit(s)*1.35; return light(mix(IRON[2],RM,Math.max(0,.5-z*.1)+wn(s*5,z*3,.8,2)*.2),k); },(s,v)=>light(IRON[3],1-v*.2),.05);
  cyl(ci,cj,.2,5.2,7,(z,s)=>light(mix(IRON[2],RM2,.25+.3*wn(s*6,z*5,.7,5)),roundLit(s)*1.5),(s,v)=>light(IRON[3],1.15-v*.15)); thin(ci-.12,cj+.14,5.3,ci+.1,cj+.14,5.3,SOOT);
}

// ---------- crates, chests, sacks, rubbish ----------

/** Dark empty inside of an open box seen from above, with the far walls lit and a bit of straw. */
function openTop(/** @type {number} */i,/** @type {number} */j,/** @type {number} */w,/** @type {number} */d,/** @type {number} */z1,/** @type {number} */seed){
  const m=.1, wood=WOOD[2];
  quad(i+m,j+m,z1+.05,i+w-m,j+m,z1+.05,i+w-m,j+d-m,z1+.05,i+m,j+d-m,z1+.05,(x,y)=>light(VOID,1.6+wn(x,y,.5,seed)*.8));
  quad(i+m,j+m,z1-2.4,i+w-m,j+m,z1-2.4,i+w-m,j+m,z1,i+m,j+m,z1,()=>light(wood,.48));
  quad(i+m,j+m,z1-2.4,i+m,j+d-m,z1-2.4,i+m,j+d-m,z1,i+m,j+m,z1,()=>light(wood,.38));
  thin(i+m,j+d-m,z1,i+w-m,j+d-m,z1,light(wood,1.3));
  for(let k=0;k<3;k++){ const a=i+.25+rd(seed,k)*(w-.5); thin(a,j+.3+rd(seed,k+4)*.3,z1-1.6,a+.18,j+.25,z1+.6+rd(seed,k+8),STRAW); }
}
/** Stencil band of an old tea shipper (no readable brand): two bars and a small circle. */
function stencil(/** @type {number} */i,/** @type {number} */j1,/** @type {number} */z,/** @type {number} */w,/** @type {number} */ink){
  const f={j:j1}; for(const dz of [0,-1.3]) quad(i+.12,j1+.02,z+dz,i+w-.12,j1+.02,z+dz,i+w-.12,j1+.02,z+dz-.5,i+.12,j1+.02,z+dz-.5,()=>ink);
}

/** A crate group placed inside its footprint. */
function crates(/** @type {any} */e){
  const b=e.box, sd=hsh(e.id), [i0,j0,i1,j1]=b, tone=sd%3;
  if(e.id==='crates-mouth'){
    crate(i0,j0,1.0,.98,4,0,tone,1); crate(i0+.22,j0+.06,1.05,.86,4,4,tone+1,0);
    thin(i0+.3,j0+.95,4.02,i0+.9,j0+.95,4.02,STONE[3]); // rope end
    stencil(i0+.05,j0+.98,2.7,.9,rgb('#2a2218'));
  } else if(e.id==='tea-chest'){
    const w=i1-i0, d=j1-j0; crate(i0,j0,w,d,4,0,1,-1); openTop(i0,j0,w,d,4,sd);
    // lid propped up at the back: we see its inner face
    quad(i0,j0+.04,4,i1,j0+.04,4,i1,j0+.1,8.4,i0,j0+.1,8.4,(x,y)=>light(WOOD[2],.62+wn(x,y,.5,1)*.3));
    thin(i0,j0+.1,8.4,i1,j0+.1,8.4,light(WOOD[3],1.2)); thin(i0,j0+.04,4,i0,j0+.1,8.4,WOOD[0]); thin(i1,j0+.04,4,i1,j0+.1,8.4,WOOD[0]);
    // paper label on the front
    const z=1.1; quad(i0+.2,j1+.02,z+2,i0+.62,j1+.02,z+2,i0+.62,j1+.02,z,i0+.2,j1+.02,z,()=>rgb('#8c8570'));
    thin(i0+.26,j1+.03,z+1.4,i0+.56,j1+.03,z+1.4,SOOT); thin(i0+.26,j1+.03,z+.7,i0+.5,j1+.03,z+.7,SOOT);
  } else if(e.id==='crates-court'){
    crate(i0,j0+.02,1.4,.9,5,0,0,-1); crate(i0+.15,j0+.08,1.0,.78,5,5,2,-1);
    lettering({j:j0+.92},i0+.3,3.6,'TEA',rgb('#cfc8aa'),.9,.5);
    stencil(i0+.3,j0+.92,1.3,.9,rgb('#2a2218'));
    thin(i0+.3,j0+.86,5.02,i0+.55,j0+.86,5.02,SOOT);
  } else if(e.id==='stack-end'){
    crate(i0,j0+.02,1.4,1.3,6,0,2,2); crate(i0+.12,j0+.15,1.1,1.0,6,6,0,-1); openTop(i0+.12,j0+.15,1.1,1.0,12,sd);
    thin(i0+.5,j0+.1,12,i0+.9,j0+.5,14,light(WOOD[3],1)); // loose slat
  } else if(e.id==='coop'){ coop(e); }
  else crate(i0,j0,i1-i0,j1-j0,e.z,0,tone,-1);
}

/** Empty poultry coop: tarred roof board, slatted front with a door hanging ajar, straw at the base. */
function coop(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), h=3.6, w=i1-i0, d=j1-j0;
  contact(i0,j0,i1,j1,0,.55);
  quad(i0,j1,0,i1,j1,0,i1,j1,h,i0,j1,h,(x,y)=>{ const [a,z]=onJ(j1,x,y), s=(a-i0)/w; if(s>.62&&s<.98&&z>.3&&z<h-.3) return light(VOID,1.3);
    if(z<.5||z>h-.5||s<.04||s>.96) return light(WOOD[3],.9); return frac(a*7)<.2?light(VOID,1.6):light(WOOD[2],.8+wn(x,y,.6,3)*.3); });
  quad(i1,j0,0,i1,j1,0,i1,j1,h,i1,j0,h,(x,y)=>{ const [a,z]=onI(i1,x,y); return z<.4||z>h-.4?light(WOOD[3],.65):frac((a-j0)*5)<.1?light(WOOD[0],1):light(WOOD[2],.58+wn(x,y,.5,2)*.2); });
  quad(i0,j0,h,i1,j0,h,i1,j1,h,i0,j1,h,(x,y)=>light(mix(WOOD[1],SOOT,.5),.85+wn(x,y,.5,sd%5)*.6));
  quad(i0-.02,j0,h,i1+.02,j0,h,i1+.02,j0+.05,h+.9,i0-.02,j0+.05,h+.9,()=>light(SOOT,2));
  // door ajar: a lath panel swung out on its right hinge
  quad(i0+w*.62,j1,.4,i0+w*.62,j1+.02,h-.4,i0+w*.9,j1+.12,h-.4,i0+w*.9,j1+.15,.4,(x,y)=>frac(x*.3)<.3?light(WOOD[1],1):light(WOOD[3],.9));
  thin(i0+w*.62,j1,.4,i0+w*.62,j1,h-.4,IRON[3]);
  for(let k=0;k<4;k++){ const a=i0+.1+rd(sd,k)*(w-.2); thin(a,j1+.02,.3,a+.2,j1+.14,.2+rd(sd,k+3),STRAW); }
  thin(i0,j1+.01,h,i1,j1+.01,h,light(WOOD[3],1.2));
}

/** Slumped coal sacks: lumpy dusty burlap with horizontal weave, a stitched seam, a tied neck and spilled coal. */
function sacks(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id);
  contact(i0,j0,i1,j1,0,.5);
  const sack=(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {number} */rx,/** @type {number} */hp,/** @type {number} */tn,/** @type {number} */k)=>{
    const cx=sx(i,j), cy=sy(i,j,z);
    blob(cx,cy,rx,rx*.5,hp,(x,y,f,u,v)=>{
      const band=Math.floor((y+k)/3)&1, dust=wn(x,y,.45,k+2), l=(.62+.55*f-.3*u+(v<-.5?.18:0)-(v>.55?.2:0))*(band?.86:1.06);
      let c=mix(CLOTH[1],ROPE,.25+.25*wn(x,y,.3,k)); if(f<.55&&dust>.55) c=mix(c,rgb('#16181b'),.55);
      if(Math.abs(u-.12)<.05&&f>.2) return light(JUNK[2],l);       // seam
      return light(c,l*1.05); },.3,k);
    // tied neck: a pinched knob with a tuft at the +i end
    const nx=cx+rx*.85, ny=cy-hp*.55; disc(nx,ny,3,2.2,(x,y,u,v)=>light(mix(CLOTH[1],ROPE,.3),.8+.35*(-u)-.2*v)); px(nx,ny,JUNK[2]); px(nx+1,ny,JUNK[2]); px(nx+3,ny-2,CLOTH[2]); px(nx+4,ny-1,CLOTH[1]);
  };
  sack(i0+.38,j0+.45,0,11,8,0,1); sack(i0+.88,j0+.62,0,10,7,1,2); sack(i0+.55,j0+.38,3.4,9,6,0,3);
  // spilled coal: small black lumps with a pale facet
  for(let k=0;k<7;k++){ const ci=i0+.15+rd(sd,k)*1.0, cj=j0+.66+rd(sd,k+7)*.2, x=Math.round(sx(ci,cj)), y=Math.round(sy(ci,cj,0)); px(x,y,rgb('#16181b')); px(x+1,y,rgb('#1b1d20')); px(x,y-1,rgb('#33363a')); if(k%2) px(x+1,y-1,rgb('#16181b')); }
}

/** Heap of rubbish, ash or broken boards: a lumpy dome of rags, paper and clinker with splintered planks and bones sticking out. */
function heap(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), ash=e.id==='ash-heap', hz=e.z, w=i1-i0, d=j1-j0;
  contact(i0,j0,i1,j1,0,.55);
  const lobe=(/** @type {number} */i,/** @type {number} */j,/** @type {number} */rx,/** @type {number} */hp,/** @type {number} */k)=>blob(sx(i,j),sy(i,j,0),rx,rx*.48,hp,(x,y,f,u,v)=>{
    const n=wn(x,y,.3,sd%17+k), m=wn(x,y,.7,k+3), q=wn(x,y,1.1,k+8), l=((.5+.6*f-.34*u)*(.66+.7*m)+(v<-.5?.28:0)+(u<-.75?.2:0)-(v>.5?.22:0))*1.3;
    if(ash){ if(n>.78&&q>.4) return light(rgb('#a89d86'),l*.8); if(n<.3) return light(rgb('#2f2d29'),l*1.2); return light(q>.55?rgb('#5a564c'):rgb('#47443d'),l*1.05); }
    if(n>.74) return light(CLOTH[1+(k&1)],l*1.05);          // rag
    if(n<.27) return light(JUNK[2],l*1.4);                    // soot and mud
    if(n>.6&&q>.5) return light(JUNK[0],l*.9);                // paper
    if(q>.7) return light(WOOD[2],l*1.1);                     // board
    return light(mix(JUNK[1],WOOD[1],m),l*1.1); },1,sd%9+k);
  lobe(i0+w*.35,j0+d*.5,w*8.2,hz*1.6,1); lobe(i0+w*.74,j0+d*.4,w*6.2,hz*1.2,4); lobe(i0+w*.52,j0+d*.72,w*5.6,hz*.9,7);
  const bit=(/** @type {number} */a,/** @type {number} */b,/** @type {number} */z,/** @type {number} */I,/** @type {number} */J,/** @type {number} */Z,/** @type {number} */c1,/** @type {number} */c2)=>{ thin(a,b,z,I,J,Z,c1); thin(a+OFF,b-OFF,z,I+OFF,J-OFF,Z,c2); };
  if(!ash){
    for(let k=0;k<4;k++){ const a=i0+.2+rd(sd,k)*(w-.4), b=j0+.12+rd(sd,k+4)*.7, z=hz*.8+rd(sd,k+8)*hz*.4, l=1.4+rd(sd,k+12)*2.2; bit(a,b,z,a+.3+l*.1,b+.05,z+l*1.6,WOOD[3],WOOD[2]); thin(a+2*OFF,b-2*OFF,z,a+.3+l*.1+2*OFF,b+.05-2*OFF,z+l*1.6,WOOD[1]); }
    // half-buried barrel hoop standing in the heap, a rag hanging from it, a pale scrap of newspaper
    const hi=i0+w*.52, hj=j0+d*.6, hzc=hz*1.1; for(let k=0;k<14;k++){ const a=k/14*Math.PI*2, c=(k+1)/14*Math.PI*2; thin(hi+Math.cos(a)*.22,hj,hzc+Math.sin(a)*3.4,hi+Math.cos(c)*.22,hj,hzc+Math.sin(c)*3.4,k<8?IRON[3]:IRON[2]); }
    for(let k=0;k<3;k++) thin(hi-.2+k*.06,hj+.02,hzc-3,hi-.2+k*.07,hj+.02,hzc-5.6+k*.4,CLOTH[2]);
    const sx0=sx(i0+w*.25,j0+d*.9), sy0=sy(i0+w*.25,j0+d*.9,hz*.7); for(let k=0;k<4;k++){ px(sx0+k,sy0,JUNK[0]); px(sx0+k,sy0+1,JUNK[0]); } px(sx0+1,sy0,JUNK[2]); px(sx0+3,sy0+1,JUNK[2]);
    thin(i0+w*.55,j0+d*.8,hz*.9,i0+w*.55+.3,j0+d*.8,hz*.9+1.4,rgb('#4a5a4a'));
  } else {
    for(let k=0;k<4;k++){ const a=i0+.35+rd(sd,k)*(w-.7), b=j0+.45+rd(sd,k+3)*.55, z=hz*.45+k*1.1; bit(a,b,z,a+.14,b,z+.55,rgb('#cfc7ae'),rgb('#a89d86')); }
    // a bent tin pail lying on the top and a long bone
    const pi=i0+w*.62, pj=j0+d*.38, pz=hz*1.35; cyl(pi,pj,.2,pz,pz+2.4,(z,s)=>light(mix(IRON[3],RM,.2),roundLit(s)*1.2),(s,v)=>light(VOID,1.5),.05);
    bit(i0+w*.2,j0+d*.55,hz*1.1,i0+w*.48,j0+d*.62,hz*1.55,JUNK[0],JUNK[1]); bit(i0+w*.55,j0+d*.3,hz*1.2,i0+w*.9,j0+d*.35,hz*1.0,rgb('#cfc7ae'),rgb('#a89d86'));
  }
}

// ---------- carts, furniture, ironwork ----------

/** Spoked wheel in the plane j=jc (circle of radius rz in z units, centre (ci,zc)); rim iron, ash spokes, hub. broken: spokes snapped. */
function wheel(/** @type {number} */ci,/** @type {number} */jc,/** @type {number} */zc,/** @type {number} */rz,/** @type {number} */seed,/** @type {boolean} */broken=false){
  const N=20, p=(/** @type {number} */a,/** @type {number} */r)=>[ci+Math.cos(a)*r*Z2G,zc+Math.sin(a)*r];
  const spokes=10; for(let k=0;k<spokes;k++){ const a=k/spokes*Math.PI*2+.2, len=broken&&k%3===1?rz*.55:rz*.9, A=p(a,1), B=p(a,len);
    th2(A[0],jc,A[1],B[0],jc,B[1],WOOD[2],WOOD[3]); }
  for(let k=0;k<N;k++){ const a0=k/N*Math.PI*2, a1=(k+1)/N*Math.PI*2, A=p(a0,rz), B=p(a1,rz), A2=p(a0,rz-1.1), B2=p(a1,rz-1.1), lit=.7+.6*Math.max(0,Math.cos(a0-2.2));
    if(broken&&k>=6&&k<=8){ th2(A2[0],jc,A2[1],B2[0],jc,B2[1],WOOD[1]); continue; }
    quad(A[0],jc+.02,A[1],B[0],jc+.02,B[1],B2[0],jc+.02,B2[1],A2[0],jc+.02,A2[1],()=>light(mix(IRON[2],RM,rd(seed,k)*.5),lit*1.3)); }
  const h=p(0,1.4); quad(ci-.12,jc+.03,zc+1.4,ci+.12,jc+.03,zc+1.4,ci+.12,jc+.03,zc-1.4,ci-.12,jc+.03,zc-1.4,()=>light(IRON[3],1));
  thin(ci,jc+.04,zc+.6,ci,jc+.04,zc-.6,RUST[3]);
}

/** Handcart parked on its shafts against the wall: sideboards, one wheel, shafts down to the stones. */
function cart(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), ja=j0+.2, jb=j1-.2;
  contact(i0+.1,j0+.1,i1,j1,0,.5);
  // far shaft and far wheel peeking above the bed
  th2(i1-.55,j0+.4,4.6,i1,j0+.4,.7,WOOD[1]);
  // bed: top plane sloping to the front, tailboard end up
  const zt=(/** @type {number} */i)=>7.4-(i-(i0+.1))*1.9;
  quad(i0+.1,ja,zt(i0+.1),i1-.55,ja,zt(i1-.55),i1-.55,jb,zt(i1-.55),i0+.1,jb,zt(i0+.1),(x,y)=>light(WOOD[1],.85+wn(x,y,.5,sd%7)*.4));
  // sideboards (+j face): planks, one split and one missing
  const sideH=2.6;
  quad(i0+.1,jb,zt(i0+.1),i1-.55,jb,zt(i1-.55),i1-.55,jb,zt(i1-.55)+sideH,i0+.1,jb,zt(i0+.1)+sideH,(x,y)=>{
    const [a,z]=onJ(jb,x,y), v=(z-(zt(a)))/sideH, plank=Math.floor(v*3); if(a>i0+1.1&&a<i0+1.55&&v>.35&&v<.7) return light(VOID,1.5);
    if(frac(v*3)<.12) return light(WOOD[0],1); if(Math.abs(a-(i0+.8))<.03&&plank===0) return light(WOOD[0],1);
    return light(mix(WOOD[2],RM,plank===1?.1:0),.78+v*.25+wn(x,y,.5,plank*3+sd%5)*.35); });
  thin(i0+.1,jb,zt(i0+.1)+sideH,i1-.55,jb,zt(i1-.55)+sideH,light(WOOD[3],1.3)); thin(i0+.1,jb,zt(i0+.1),i0+.1,jb,zt(i0+.1)+sideH,WOOD[0]);
  // front board (+i face) between the shaft roots
  quad(i1-.55,ja,zt(i1-.55),i1-.55,jb,zt(i1-.55),i1-.55,jb,zt(i1-.55)+sideH-.4,i1-.55,ja,zt(i1-.55)+sideH-.4,(x,y)=>{ const [a,z]=onI(i1-.55,x,y); return frac((a-ja)*5)<.1?light(WOOD[0],1):light(WOOD[2],.62+wn(x,y,.5,9)*.2); });
  // wheel in front of the bed, near wheel at the +j side
  wheel(i0+.9,jb+.08,4.3,4.3,sd%100);
  // axle stub and near shaft with its iron ferrule and a dropped rope
  th2(i1-.55,jb-.05,zt(i1-.55)-.2,i1+.02,jb-.05,.6,WOOD[2],WOOD[3]); thin(i1,jb-.05,.9,i1+.02,jb-.05,.4,IRON[3]);
  rope([i1-.35,jb-.05,3.4],[i0+1.2,jb+.04,.9],.8,rgb('#5a4d36'));
}

/** Handcart that lost a wheel: slumped on its axle stub, the wheel lying flat beside it with snapped spokes. */
function cartBroken(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id);
  contact(i0,j0,i1,j1,0,.5);
  // body tilts down to +j: far wall higher
  const zb=(/** @type {number} */j)=>1.2+(j0+.1-j)*-1.9+2.6, ja=j0+.1, jb=j1-.12;
  quad(i0+.1,ja,zb(ja),i1-.1,ja,zb(ja),i1-.1,jb,zb(jb),i0+.1,jb,zb(jb),(x,y)=>light(WOOD[1],.8+wn(x,y,.5,sd%7)*.5));
  // +i end board and +j side board
  quad(i1-.1,ja,zb(ja),i1-.1,jb,zb(jb),i1-.1,jb,zb(jb)+2.2,i1-.1,ja,zb(ja)+2.2,(x,y)=>{ const [a,z]=onI(i1-.1,x,y); return frac((a-ja)*4.5)<.12?light(WOOD[0],1):light(WOOD[2],.66+wn(x,y,.5,sd%5)*.3); });
  quad(i0+.1,jb,zb(jb),i1-.1,jb,zb(jb),i1-.1,jb,zb(jb)+2.2,i0+.1,jb,zb(jb)+2.2,(x,y)=>{ const [a,z]=onJ(jb,x,y), v=(z-zb(jb))/2.2; return frac(v*2.4)<.12?light(WOOD[0],1):light(WOOD[2],.8+v*.2+wn(x,y,.5,4)*.35); });
  thin(i0+.1,jb,zb(jb)+2.2,i1-.1,jb,zb(jb)+2.2,light(WOOD[3],1.3)); thin(i0+.1,ja,zb(ja)+2.2,i1-.1,ja,zb(ja)+2.2,light(WOOD[3],1.05));
  // the remaining wheel hidden behind, the broken axle: a stub resting on the stones, shafts splayed
  th2(i0+.45,jb-.02,zb(jb)-.3,i0+.45,jb+.12,.5,IRON[3],IRON[2]); th2(i1-.1,ja+.1,zb(ja),i1+.3>e.box[2]?i1:i1,ja+.1,.5,WOOD[1]);
  // wheel lying flat on the stones
  const wc=[i0+.52,j0+.55], wr=.42, N=14;
  for(let k=0;k<N;k++){ const a0=k/N*Math.PI*2, a1=(k+1)/N*Math.PI*2; if(k===3||k===4) continue;
    quad(wc[0]+Math.cos(a0)*wr,wc[1]+Math.sin(a0)*wr,.5,wc[0]+Math.cos(a1)*wr,wc[1]+Math.sin(a1)*wr,.5,wc[0]+Math.cos(a1)*(wr-.08),wc[1]+Math.sin(a1)*(wr-.08),.5,wc[0]+Math.cos(a0)*(wr-.08),wc[1]+Math.sin(a0)*(wr-.08),.5,()=>light(IRON[3],.9+.2*Math.cos(a0))); }
  for(let k=0;k<8;k++) if(k!==2&&k!==5) thin(wc[0],wc[1],.6,wc[0]+Math.cos(k*.785)*wr*.9,wc[1]+Math.sin(k*.785)*wr*.9,.6,WOOD[3]);
}

/** Bench with one broken leg: seat and back planks slanting to the broken end, a splintered stump on the stones. */
function bench(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), ja=j0+.1, jb=j1-.1, zl=e.z-.6;
  contact(i0,j0,i1,j1,0,.45);
  const dz=(/** @type {number} */i)=>zl-(i-i0)*1.7;     // the +i end sags
  const leg=(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z)=>{ th2(i,j,0,i,j,z-.4,IRON[2],IRON[3]); th2(i,j,z-.4,i+.06,j,z-.4,IRON[3]); };
  leg(i0+.12,ja+.05,dz(i0+.12)-.3); leg(i0+.12,jb-.05,dz(i0+.12)-.3); leg(i1-.12,ja+.05,dz(i1-.12)-.3);
  th2(i1-.1,jb-.05,0,i1-.1,jb-.05,1.5,WOOD[1]); th2(i1-.12,jb-.05,1.5,i1-.05,jb-.05,2.4,WOOD[3]); // snapped leg stump
  // back planks (far edge)
  for(const k of [0,1]) quad(i0,ja,dz(i0)+1.6+k*1.5,i1,ja,dz(i1)+1.6+k*1.5,i1,ja+.04,dz(i1)+2.7+k*1.5,i0,ja+.04,dz(i0)+2.7+k*1.5,(x,y)=>light(WOOD[2],.8+wn(x,y,.5,k)*.3));
  // seat planks, front one in shade
  for(let k=0;k<3;k++){ const a=ja+(jb-ja)*k/3, b=ja+(jb-ja)*(k+1)/3-.03;
    quad(i0,a,dz(i0),i1,a,dz(i1),i1,b,dz(i1),i0,b,dz(i0),(x,y)=>light(mix(WOOD[2],MOSSW[2],k===1?.25:0),.9+wn(x,y,.5,k+sd%5)*.45+k*.06)); }
  quad(i0,jb,dz(i0)-.5,i1,jb,dz(i1)-.5,i1,jb,dz(i1),i0,jb,dz(i0),()=>light(WOOD[2],.62));
  thin(i0,jb,dz(i0),i1,jb,dz(i1),light(WOOD[3],1.25)); thin(i1,jb,dz(i1)-.5,i1,jb,dz(i1),WOOD[0]);
}

/** Stone water trough beside the pump: lipped stone, green slime line, dark water with a skylight glint. */
function trough(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), h=e.z-.3, t=.16;
  contact(i0,j0,i1,j1,0,.5);
  quad(i0,j1,0,i1,j1,0,i1,j1,h,i0,j1,h,(x,y)=>{ const [a,z]=onJ(j1,x,y); let k=.7+wn(x,y,.4,sd%7)*.4; let c=STONE[1]; if(z<1.4) c=mix(c,MOSSW[2],.55); if(Math.abs(a-(i0+.55))<.015) k*=.6; return light(c,k*1.1); });
  quad(i1,j0,0,i1,j1,0,i1,j1,h,i1,j0,h,(x,y)=>light(mix(STONE[0],MOSSW[1],.2),.85+wn(x,y,.4,5)*.3));
  quad(i0,j0,h,i1,j0,h,i1,j1,h,i0,j1,h,()=>light(STONE[2],1));
  quad(i0+t,j0+t,h+.02,i1-t,j0+t,h+.02,i1-t,j1-t,h+.02,i0+t,j1-t,h+.02,(x,y)=>{ const [i,j]=ground(x,y,h), g=Math.max(0,.6-Math.abs((i-i0)*1.2-(j-j0)*2.6+.4)*1.2); return mix(mix(WATER,SKY,.15+.3*wn(x,y,.6,sd%3)),SKY,g*.7); });
  thin(i0,j1,h,i1,j1,h,light(STONE[3],1.1)); thin(i1,j0,h,i1,j1,h,light(STONE[3],.8));
  thin(i0+.1,j1+.01,h-1.1,i0+.1,j1+.01,.5,SOOT); // crack
}

/** Parish pump: fluted plinth, swelling body with a cast plate, spout and a long handle half raised. */
function pump(/** @type {any} */e){
  const b=e.box, ci=(b[0]+b[2])/2, cj=(b[1]+b[3])/2, sd=hsh(e.id);
  contact(b[0],b[1],b[2],b[3],0,.55);
  const rust=(/** @type {number} */z,/** @type {number} */s,/** @type {number} */k)=>light(mix(IRON[3],RM,Math.max(0,.3-z*.04)+.25*wn(s*4,z*4,.8,sd%9)),k);
  cyl(ci,cj,.34,0,3.2,(z,s)=>rust(z,s,roundLit(s)*(frac(s*3.1+.2)<.18?.7:1.3)),(s,v)=>light(IRON[3],1.05),.06);
  cyl(ci,cj,.2,3.2,8.6,(z,s)=>rust(z,s,roundLit(s)*(z>5.9&&z<6.6?1.7:1.35)),(s,v)=>light(IRON[3],1),.18);
  cyl(ci,cj,.26,8.6,9.4,(z,s)=>light(IRON[3],roundLit(s)*1.3),(s,v)=>light(IRON[3],1.1));
  cyl(ci,cj,.15,9.4,12.2,(z,s)=>rust(z,s,roundLit(s)*1.4),(s,v)=>light(IRON[3],1.1),.05);
  cyl(ci,cj,.19,12.2,13.4,(z,s)=>light(IRON[3],roundLit(s)*1.5),(s,v)=>light(IRON[3],1.2));
  // cast parish plate on the body: pale bar with stamped ticks
  const px0=sx(ci,cj), py0=sy(ci,cj,6.2); for(let k=-3;k<=2;k++){ px(px0+k,py0,rgb('#6a665a')); px(px0+k,py0+1,rgb('#4a4c52')); } for(const k of [-2,0,2]) px(px0+k,py0,rgb('#2a2824'));
  // spout towards +j and its dripping lip
  th2(ci,cj+.05,10,ci,cj+.42,9.2,IRON[3],IRON[2]); th2(ci,cj+.42,9.2,ci,cj+.44,8.2,IRON[3],IRON[1]);
  // handle: lever hinged at the head, raised
  th2(ci-.02,cj-.05,12.6,ci-.3,cj-.05,14,IRON[3],IRON[2]); th2(ci-.3,cj-.05,14,ci-.38,cj-.05,12.8,IRON[3],IRON[2]);
}

/** Ladder leaning on the wall: two rails, rungs and a missing rung, weathered. */
function ladder(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), ia=i0+.06, ib=i1-.06, top=e.z, ja=j1-.08, jt=j0+.1;
  const jz=(/** @type {number} */z)=>ja+(jt-ja)*z/top;
  for(const i of [ia,ib]){ th2(i,ja,0,i,jt,top,WOOD[3],WOOD[2]); }
  for(let k=1;k<8;k++){ if(k===5) continue; const z=k*top/8.3; thin(ia,jz(z),z,ib,jz(z),z,light(WOOD[3],.9+rd(sd,k)*.2)); thin(ia,jz(z)+.01,z-.5,ib,jz(z)+.01,z-.5,WOOD[0]); }
  thin(ia,jz(5*top/8.3),5*top/8.3,ia+.1,jz(4.5*top/8.3),4.5*top/8.3,WOOD[1]); // snapped rung stub
}

/** Wooden bucket with a rope handle, an iron hoop and rags slumped over the rim. */
function bucket(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, ci=(i0+i1)/2, cj=(j0+j1)/2, sd=hsh(e.id);
  contact(i0,j0,i1,j1,0,.5);
  cyl(ci,cj,.2,0,3,(z,s)=>{ if(z>1.7&&z<2.2) return light(IRON[3],roundLit(s)*1.3); return light(mix(WOOD[2],MOSSW[2],.2),roundLit(s)*(frac((Math.asin(s)+1.6)*2.3)<.12?.6:1)); },(s,v)=>Math.abs(v)>.78||Math.abs(s)>.85?light(WOOD[3],1):light(VOID,1.6),.1);
  const x=sx(ci,cj), y=sy(ci,cj,3);
  disc(x-1,y+1,8,3.3,(px_,py,u,v)=>{ const n=wn(px_,py,.5,sd%5); return v<-.1?light(JUNK[0],.75+n*.3):light(JUNK[1],.7+n*.3); });
  for(let k=0;k<5;k++) px(x+5+k,y+3+(k>2?k-2:0),JUNK[1]);
  th2(ci-.18,cj,2.6,ci,cj+.02,5.2,ROPE,ROPE);
}

/** Low broken picket fence on the near side: leaning pickets of different heights, one snapped, two rails. */
function fence(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), j=(j0+j1)/2;
  thin(i0,j,2,i1,j,2.4,WOOD[1]); thin(i0,j+.01,4,i1,j+.01,4.2,WOOD[1]);
  const hs=[6,3.4,6.2,4.6]; for(let k=0;k<4;k++){ const i=i0+.04+k*.14, h=hs[k], lean=(rd(sd,k)-.4)*.12;
    th2(i,j,0,i+lean,j,h,k===1?WOOD[0]:WOOD[3],WOOD[2]);
    if(k!==1) thin(i+lean,j,h,i+lean+.04,j,h+.5,WOOD[3]); }
  thin(i0+.1,j,3.4,i0+.2,j+.12,1.4,WOOD[1]); // snapped top lying down
}

/** Low granite kerb stone: lit top edge, chipped corner, moss in the joint. */
function kerb(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), h=e.z, w=i1-i0;
  contact(i0,j0,i1,j1,0,.55);
  quad(i0,j1,0,i1,j1,0,i1,j1,h,i0,j1,h,(x,y)=>{ const [a,z]=onJ(j1,x,y); let k=.85+wn(x,y,.5,sd%9)*.4; const c=z<1.2||(Math.abs(a-(i0+w*.5))<.02)?mix(STONE[1],MOSSW[2],.5):STONE[1]; return light(c,k); });
  quad(i1,j0,0,i1,j1,0,i1,j1,h,i1,j0,h,()=>light(STONE[0],.9));
  quad(i0,j0,h,i1,j0,h,i1,j1,h,i0,j1,h,(x,y)=>light(STONE[2],.9+wn(x,y,.4,sd%5)*.4));
  thin(i0,j1,h,i1,j1,h,STONE[3]); thin(i0,j1,h-.1,i0+w*.35,j1,h-.1,light(STONE[3],1.15));
}

/** Two worn granite steps up to door 14: dished treads, lit nosings, moss in the corners. */
function steps(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), w=i1-i0;
  contact(i0,j0,i1,j1,0,.55);
  for(let k=0;k<2;k++){ const ja=j0+.4*(1-k)*.0, jb=j1-.4*k*1, z=2*(2-k);
    const j2=j1-k*.4, z0=k?2:0, z1=2*(k+1);
    quad(i0,j2,z0,i1,j2,z0,i1,j2,z1,i0,j2,z1,(x,y)=>light(STONE[1],.78+wn(x,y,.5,k+sd%5)*.35-(z1-onJ(j2,x,y)[1]<.7?-.2:0)));
    quad(i1,j0,z0,i1,j2,z0,i1,j2,z1,i1,j0,z1,()=>light(STONE[0],.85));
    quad(i0,j0,z1,i1,j0,z1,i1,j2,z1,i0,j2,z1,(x,y)=>{ const [i,j]=ground(x,y,z1), dish=1-.35*Math.max(0,1-Math.abs((i-(i0+w*.5))/(w*.35))); return light(mix(STONE[2],MOSSW[2],(j-j0>.35&&k===0?.1:0)+(Math.abs(i-i0)<.1?.4:0)),dish*(.95+wn(x,y,.5,4+k)*.3)); });
    thin(i0,j2,z1,i1,j2,z1,STONE[3]); thin(i0,j2,z1-.5,i1,j2,z1-.5,light(STONE[0],.8)); }
}

/** Iron railing round the cellar well: posts, a top rail and a mid rail, one bent bar. */
function rail(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id), j=(j0+j1)/2, h=e.z, N=7;
  for(let k=0;k<N;k++){ const i=i0+.05+(i1-i0-.1)*k/(N-1), bent=k===4; th2(i,j,0,i+(bent?.07:0),j,h-.4,IRON[3],IRON[2]); thin(i-.02,j,h-.4,i,j,h+.5,IRON[3]); }
  th2(i0,j,h,i1,j,h,IRON[3],IRON[2]); thin(i0,j,3.4,i1,j,3.4,IRON[3]);
  for(let k=0;k<3;k++){ const i=i0+.4+rd(sd,k)*(i1-i0-.8); thin(i,j,h,i+.08,j,h-1.4,RM2); } // rust runs
}

// ---------- gas brackets, lanterns, fire ----------

/** Smooth 1D noise in -1..1. */
const n1=(/** @type {number} */x,/** @type {number} */s)=>vn(x,s*3.7)*2-1;
/** Flame strength of a lamp at time t (seconds): steady breathing, gutter chokes and, for the lodging lamp, a short blackout. */
export function lampLevel(/** @type {any} */l,/** @type {number} */t){
  if(l.mode==='dead'||!l.lit) return 0;
  const s=hsh(l.id)%97, steady=l.mode==='steady';
  let k=1+(steady?.04:.06)*n1(t*3.1,s)+(steady?0:.03*n1(t*7.3,s+1));
  if(!steady){
    const per=11+(s%7), cyc=Math.floor((t+s)/per), at=(cyc*per+2+(h2(cyc,s)/255)*(per-5)), u=t+s-at;
    if(u>=0&&u<.5) k*=u<.15?1-.55*u/.15:u<.25?.45+.75*(u-.15)/.1:1.2-.2*(u-.25)/.25;
    if(l.kind==='bracket'){ const p2=40+(s%30), c2=Math.floor((t+s*3)/p2), a2=c2*p2+5+(h2(c2,s+9)/255)*(p2-12), u2=t+s*3-a2; if(u2>=0&&u2<.4) k=.05; }
  }
  return k;
}

/** The flame inside a lantern centred on screen (x,y): teardrop of three tones, height follows the level k. */
function flame(/** @type {number} */x,/** @type {number} */y,/** @type {number} */k,/** @type {number} */lean){
  x=Math.round(x); y=Math.round(y);
  const hgt=Math.max(1,Math.round(2+3*k)), dx=Math.round(lean);
  for(let k2=0;k2<hgt;k2++){ const w=k2<hgt-1?1:0; px(x-w+Math.round(dx*k2/hgt),y-k2,FLAME[2]); px(x+w+Math.round(dx*k2/hgt),y-k2,FLAME[2]); if(k2<hgt-1) px(x+Math.round(dx*k2/hgt),y-k2,FLAME[1]); }
  px(x,y,FLAME[0]); if(hgt>2) px(x,y-1,FLAME[0]); if(k>1.04) px(x+1,y,FLAME[1]);
}

/** Lantern of glass panes in an iron cage, centred over (i,j) from z up to z+h; level k lights the glass (0 = cold). state: 'ok' | 'smashed'. */
function lantern(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {number} */h,/** @type {number} */w,/** @type {number} */k,/** @type {string} */state,/** @type {number} */seed){
  const tw=w*1.35, cx=sx(i,j), cyc=sy(i,j,z+h/2), hh=h*1;
  const glass=(/** @type {number} */x,/** @type {number} */y,/** @type {number} */side)=>{
    const u=Math.abs(x-cx)/(w*11), v=(y-cyc)/(h), g=Math.max(0,1-u*u*.9-v*v*3.2)*k;
    if(k<=0.02){ const dirt=wn(x,y,.7,seed)*.5; return light(mix(rgb('#4a4636'),rgb('#2a2a24'),.35+dirt*.5),(side?.75:1)*(1+.5*Math.max(0,.4-Math.abs(v+(x-cx)*.03)*3))); }
    return mix(mix(rgb('#5a4a24'),rgb('#8a7a50'),.4+.3*wn(x,y,.7,seed)),mix(FLAME[2],FLAME[0],Math.min(1,g*1.2)),Math.min(1,g*1.4+.15))*1; };
  if(state==='smashed'){
    // frame stumps and a few teeth of glass: no light
    for(const [a,b] of [[-1,-1],[1,-1],[-1,1],[1,1]]) th2(i+a*w*.9,j+b*w*.9,z,i+a*tw*.9,j+b*tw*.9,z+h*(.5+rd(seed,a+b+4)*.4),IRON[3],IRON[2]);
    quad(i-w,j+w,z,i+w,j+w,z,i+w*1.1,j+w*1.1,z+h*.4,i-w*1.1,j+w*1.1,z+h*.25,(x,y)=>light(rgb('#4b5a5c'),.7+wn(x,y,.8,seed)*.6));
    thin(i-w,j+w,z+h*.3,i-w*.3,j+w,z+h*.55,rgb('#8a9a9a')); thin(i+w*.2,j+w,z+h*.45,i+w,j+w,z+h*.2,rgb('#8a9a9a')); thin(i-w*.3,j+w,z+h*.55,i,j+w,z+h*.2,rgb('#8a9a9a'));
    thin(i,j,z+h*.6,i,j,z+h*.9,IRON[3]);
    return;
  }
  quad(i-w,j+w,z,i+w,j+w,z,i+tw,j+tw,z+h,i-tw,j+tw,z+h,(x,y)=>glass(x,y,0));
  quad(i+w,j-w,z,i+w,j+w,z,i+tw,j+tw,z+h,i+tw,j-tw,z+h,(x,y)=>glass(x,y,1));
  // cage: corner ribs and a mullion, bright edge on the lit side
  thin(i-w,j+w,z,i-tw,j+tw,z+h,IRON[3]); th2(i+w,j+w,z,i+tw,j+tw,z+h,IRON[2],IRON[1]); thin(i+w,j-w,z,i+tw,j-tw,z+h,IRON[1]);
  thin(i,j+(w+tw)/2,z,i,j+(w+tw)/2,z+h,light(IRON[2],1.1));
  thin(i-w,j+w,z,i+w,j+w,z,IRON[3]); thin(i+w,j+w,z,i+w,j-w,z,IRON[1]);
  // cap: a squat pyramid with a lit left slope, a chimney and a finial
  quad(i-tw*1.15,j+tw*1.15,z+h,i+tw*1.15,j+tw*1.15,z+h,i,j,z+h+2.6,i,j,z+h+2.6,()=>light(IRON[3],1.05));
  quad(i+tw*1.15,j-tw*1.15,z+h,i+tw*1.15,j+tw*1.15,z+h,i,j,z+h+2.6,i,j,z+h+2.6,()=>light(IRON[1],.9));
  thin(i-tw*1.15,j+tw*1.15,z+h,i+tw*1.15,j+tw*1.15,z+h,light(IRON[3],1.4)); thin(i,j,z+h+2.6,i,j,z+h+3.8,IRON[3]);
  if(k>0.02) flame(cx,sy(i,j,z+h*.2)+0,k,0);
}

/** Coke brazier: perforated iron basket on a tripod, glowing coke, faint flames, scorched ground, a few logs. Level follows fireLevel. */
function brazier(/** @type {any} */e,/** @type {number} */t){
  const [i0,j0,i1,j1]=e.box, ci=(i0+i1)/2, cj=(j0+j1)/2, sd=hsh(e.id), fire=ALLEY.fires.find(f=>Math.hypot(f.i-ci,f.j-cj)<.6)||{i:ci,j:cj,flicker:.6}, k=fireLevel(fire,t);
  const core=rgb('#e0762a'), halo=rgb('#a23c18'), zb=5, zt=8.4, r=.33;
  // scorched earth and scattered embers/coke lumps
  floor(i0+.02,j0+.05,i1-.02,j1-.02,.03,(x,y)=>{ const [i,j]=ground(x,y,.03), u=(i-ci)/.45, v=(j-cj)/.42, d=u*u+v*v+(wn(x,y,.5,sd%5)-.5)*.5; return d>1?0:mix(under(x,y),SOOT,.65*(1-d*.6)); });
  for(let q=0;q<7;q++){ const a=rd(sd,q)*6.28, rr=.3+rd(sd,q+9)*.12, x=Math.round(sx(ci+Math.cos(a)*rr,cj+Math.sin(a)*rr)), y=Math.round(sy(ci+Math.cos(a)*rr,cj+Math.sin(a)*rr,0)); px(x,y,rgb('#1b1d20')); px(x+1,y,rgb('#26282b')); if(q%3===0) px(x,y-1,mix(halo,SOOT,.4)); }
  // logs at the side
  for(let q=0;q<3;q++){ const jj=j1-.14-q*.1, z=.8+q*.7; th2(i0+.06,jj,z,i0+.06+.28,jj-.04,z,WOOD[3],WOOD[2]); }
  // tripod legs
  for(let q=0;q<3;q++){ const a=q*2.09+.4, gi=ci+Math.cos(a)*(r+.08), gj=cj+Math.sin(a)*(r+.08); th2(ci+Math.cos(a)*r*.75,cj+Math.sin(a)*r*.75,zb,gi,gj,0,IRON[3],IRON[2]); }
  contact(ci-.2,cj-.2,ci+.2,cj+.2,0,.5);
  // basket: sooty perforated wall that lets the glow through
  cyl(ci,cj,r,zb,zt,(z,s)=>{ const lit=roundLit(s);
    if(z>zt-.9||z<zb+.7) return light(IRON[3],lit*1.2);
    const hole=frac((Math.asin(s)+1.6)*2.4)<.5&&frac(z*.8)<.55;
    if(hole) return mix(VOID,core,Math.min(1,.55*k*(.4+.6*wn(Math.floor(s*8),Math.floor(z),.9,sd%7)))*(z<zt-1.8?1:.5));
    return light(mix(IRON[2],SOOT,.4+.4*(z-zb)/(zt-zb)),lit*1.15); },(s,v)=>{
      if(Math.abs(v)>.82||Math.abs(s)>.88) return light(IRON[3],1.1);
      const n=wn(Math.round(sx(ci,cj)+s*8),Math.round(v*5),.7,sd%9), g=Math.min(1,k*(.55+.7*n));
      return n<.25?mix(rgb('#2a2220'),halo,g*.6):mix(halo,core,Math.min(1,g*.9)); },.04);
  // short flame tongues over the bed (barely there) and a pulsing heat shimmer at the rim
  const fx=sx(ci,cj), fy=sy(ci,cj,zt);
  for(let q=0;q<4;q++){ const ph=Math.sin(t*(7+q*2.3)+q*1.7), h=Math.round((1+q%2+1.2*k)*(.6+.4*ph)), x=Math.round(fx-4+q*2.6+ph*.8); for(let y=0;y<h;y++) px(x,fy-2-y,y>h-2?mix(core,halo,.5):core); }
  // iron handle ring and sooty streak above the rim
  th2(ci-r,cj,zt-.5,ci-r-.12,cj,zt-1.6,IRON[3],IRON[2]);
}

/** Wall bracket lantern (kinkiet) on a scrolled arm; mounted on the wall or the pilaster face. smashed = no glass, no flame. */
function wallLamp(/** @type {any} */l,/** @type {number} */t,/** @type {boolean} */smashed){
  const sd=hsh(l.id), k=smashed?0:lampLevel(l,t), z=l.z, i=l.i, j=l.j, m=[i,l.face==='pilaster-mouth'?.8:0], n=(/** @type {number} */a)=>[i,m[1]+(j-m[1])*a];
  const a=n(0), b=n(.85), c=n(.5);
  th2(a[0],a[1],z-3.2,b[0],b[1],z-3.2,IRON[3],IRON[2]); thin(a[0],a[1],z-5.6,b[0],b[1],z-3.2,IRON[3]); thin(b[0],b[1],z-3.2,b[0],b[1],z-1.6,IRON[2]);
  lantern(i,j,z-1.6,5,.2,k,smashed?'smashed':'ok',sd);
}

/** Small tin stable lantern with a tallow candle, hanging from a hook; it sways a pixel or two (the whole lantern is shifted, never rotated). */
function stableLantern(/** @type {any} */l,/** @type {number} */t){
  const sd=hsh(l.id), k=fireLevel(l,t*.9)*.8, sw=.07*Math.sin(2*Math.PI*t/2.6+sd)*(.6+.4*Math.sin(2*Math.PI*t/17)), i=l.i, z=l.z;
  th2(i,0,z+1.6,i,.2,z+1.6,IRON[3],IRON[2]); thin(i,.2,z+1.6,i,.2+sw*.4,z+.2,IRON[3]);
  const j=.2+sw;
  quad(i-.13,j+.13,z-4,i+.13,j+.13,z-4,i+.17,j+.17,z,i-.17,j+.17,z,(x,y)=>{ const u=Math.abs(x-sx(i,j))/3, v=(y-sy(i,j,z-2))/6, g=Math.max(0,1-u*u*.8-v*v)*k; return mix(mix(rgb('#5a4a24'),rgb('#7a6a40'),.4+.3*wn(x,y,.8,sd%7)),mix(FLAME[2],FLAME[0],Math.min(1,g)),Math.min(1,g*1.3+.2)); });
  quad(i+.13,j-.13,z-4,i+.13,j+.13,z-4,i+.17,j+.17,z,i+.17,j-.17,z,()=>light(rgb('#6a5a30'),.8));
  thin(i-.13,j+.13,z-4,i-.17,j+.17,z,IRON[3]); th2(i+.13,j+.13,z-4,i+.17,j+.17,z,IRON[2],IRON[1]); thin(i-.13,j+.13,z-4,i+.13,j+.13,z-4,IRON[3]);
  quad(i-.2,j+.2,z,i+.2,j+.2,z,i,j,z+1.4,i,j,z+1.4,()=>light(IRON[3],1.1)); thin(i-.2,j+.2,z,i+.2,j+.2,z,light(IRON[3],1.4));
  flame(sx(i,j+.13),sy(i,j,z-3.2),k*.7,Math.sin(t*9+sd));
}

// ---------- wall and ground fixtures (baked) ----------

/** Colour already in the frame at a pixel (for glazes and soot over the wall). */
const under=(/** @type {number} */x,/** @type {number} */y)=>rendererState.fb[y*appearanceState.W+x];

/** Iron grating flush with the cobbles: frame and bars over a dark well (the cellar light has a faint warm glow below). */
function grating(/** @type {any} */e,/** @type {{warm?:boolean}} */o={}){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id);
  floor(i0-.05,j0-.05,i1+.05,j1+.05,.02,(x,y)=>{
    const [i,j]=ground(x,y,.02), u=(i-i0)/(i1-i0), v=(j-j0)/(j1-j0);
    if(u<-.01||u>1.01||v<-.01||v>1.01) return light(STONE[0],.8);               // stone kerb round the frame
    if(u<.06||u>.94||v<.09||v>.91) return light(IRON[3],u<.08?1.1:.8);
    if(frac(u*7.2)<.4) return light(mix(IRON[2],RM,.3+.3*wn(x,y,.6,sd%9)),1.1+(frac(u*7.2)<.12?.5:0));
    return o.warm?mix(VOID,BRASS[0],.22+.1*wn(x,y,.5,sd%7)):mix(VOID,rgb('#1c2625'),Math.max(0,1-v*1.6)*.4);
  });
}

/** Torn-out grating of a cellar light: a black hole, bent bars standing in one corner and a frame stub. */
function tornGrating(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id);
  floor(i0-.05,j0-.05,i1+.05,j1+.05,.02,(x,y)=>{
    const [i,j]=ground(x,y,.02), u=(i-i0)/(i1-i0), v=(j-j0)/(j1-j0);
    if(u<-.01||u>1.01||v<-.01||v>1.01) return light(STONE[0],.8);
    if(u<.07||v<.1||(u>.93&&v>.45)) return light(IRON[3],.85);
    return light(VOID,1.2+.9*Math.max(0,.4-v)+.4*wn(x,y,.6,sd%5));
  });
  for(let k=0;k<3;k++){ const a=i0+.1+k*.1; th2(a,j0+.15,0,a+.1+k*.04,j0+.22,2.2+k*.8,IRON[3],IRON[2]); }
  th2(i1-.1,j1-.05,0,i1+.05,j1+.12,1.1,IRON[3],IRON[2]);   // one bar kicked out onto the stones
}

/** Dirty cellar skylight glass in an iron frame, faintly lit from below. */
function skylight(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id);
  floor(i0,j0,i1,j1,.3,(x,y)=>{
    const [i,j]=ground(x,y,.3), u=(i-i0)/(i1-i0), v=(j-j0)/(j1-j0);
    if(u<.07||u>.93||v<.1||v>.9||Math.abs(u-.5)<.025||Math.abs(v-.5)<.04) return light(IRON[3],.9);
    const d=wn(x,y,.5,sd%7), g=Math.max(0,.5-Math.abs(u-v*.7-.1)*1.4);
    return mix(mix(rgb('#161d20'),BRASS[0],.14+.07*d),rgb('#3a4c4a'),g*.35);
  });
  thin(i0,j1,.3,i1,j1,.3,IRON[3]);
}

/** Worn coir doormat of door 14. */
function mat(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box;
  floor(i0,j0,i1,j1,.5,(x,y)=>{ const [i,j]=ground(x,y,.5), u=(i-i0)/(i1-i0), v=(j-j0)/(j1-j0), edge=u<.07||u>.93||v<.1||v>.9;
    const wear=Math.max(0,.6-Math.abs(u-.5)*1.4-Math.abs(v-.5)*1.2), weave=frac(v*8)<.35?.82:1;
    return light(mix(WOOD[1],WOOD[3],wear*.7+.1*wn(x,y,.6,3)),(edge?.7:1)*weave*(.9+wear*.3)); });
  quad(i0,j1,0,i1,j1,0,i1,j1,.5,i0,j1,.5,()=>light(WOOD[0],1.1));
}

/** Cellar well in front of the cellar door: granite coping round a black opening; the far walls fall away to a planked door. */
function cellarPit(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, D=10, sd=hsh(e.id);
  floor(i0,j0,i1,j1,.01,(x,y)=>{
    const [i,j]=ground(x,y,.01), dj=6*j, di=6*(i-i0);
    if(dj<=di&&dj<D){ // far wall j=0 seen at depth dj
      const ih=i-j, z=-dj, dk=1-dj/D;
      if(ih>9.6&&ih<12.2&&z<-1.2&&z>-9.6){ // the planked door at the foot
        const pl=frac((ih-9.6)*2.9);
        if(z>-2.6||ih<9.78||ih>12.02) return light(STONE[1],.35*dk+.12);
        if(pl<.08) return light(VOID,1.2); if(Math.abs(z+5.8)<.45) return light(IRON[3],.5*dk+.25);
        return light(mix(WOOD[1],MOSSW[1],.3),(.28+.55*dk)*(.85+wn(x,y,.5,sd%7)*.3)); }
      const course=frac((z+(Math.floor(ih*1.7)&1)*.6)/1.9)<.12||frac(ih*1.7)<.06;
      return light(course?SOOT:mix(rgb('#2c2622'),rgb('#232a2a'),.5),.08+.95*dk*dk*dk+.08*wn(x,y,.5,sd%5)); }
    if(di<D){ const dk=1-di/D; return light(mix(rgb('#232a2a'),STONE[0],.3),.08+.7*dk*dk*dk); }       // end wall i=i0 (faces +i)
    return VOID; });
  // granite coping round the opening and a worn edge on the street side
  floor(i0-.12,j1-.02,i1+.1,j1+.14,.05,(x,y)=>{ const [i,j]=ground(x,y,.05); return light(mix(STONE[1],MOSSW[2],.12*wn(x,y,.5,6)),.95+(j<j1+.03?.35:0)+(frac((i-i0)*1.3)<.05?-.3:0)); });
  floor(i1-.02,j0,i1+.14,j1+.14,.05,(x,y)=>light(STONE[1],.85+wn(x,y,.5,2)*.3));
  thin(i0-.12,j1+.14,.05,i1+.14,j1+.14,.05,STONE[3]);
}

/** Vertical iron pipe on the wall between z0 and z1 with sockets, wall clamps and rust or soot. */
function pipe(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, ci=(i0+i1)/2, cj=(j0+j1)/2, r=Math.min(i1-i0,j1-j0)/2-.02, sd=hsh(e.id), soil=e.id==='soil-pipe';
  const z0=soil?0:e.z-0, zt=soil?e.z:64;
  const zb=soil?0:e.z;
  cyl(ci,cj,r,zb,zt,(z,s)=>{ const k=roundLit(s)*1.35, soot=wn(s*4,z*.7,.5,sd%9);
    for(let q=zb+8;q<zt;q+=9) if(z>q-.5&&z<q+.7) return light(IRON[3],k*1.2);
    return light(mix(mix(IRON[2],RM,soil?.1:.35+.2*wn(s*5,z*2,.5,3)),SOOT,soil?.55*soot+.2:.2*soot),k); },(s,v)=>light(IRON[3],1));
  for(let q=zb+12;q<zt-2;q+=18){ thin(ci-.1,0,q,ci+.1,cj-r,q,IRON[2]); }
  cyl(ci,cj,r+.03,zb,zb+(soil?1.4:0),(z,s)=>light(IRON[3],roundLit(s)*1.4),(s,v)=>light(IRON[3],1));
  if(!soil){ // ragged broken end with a bent spout, rust running down the wall below
    th2(ci,cj+r,zb+.3,ci,cj+r+.12,zb-1.4,IRON[3],IRON[2]); thin(ci-r,cj,zb,ci-r+.05,cj,zb-.8,IRON[2]); thin(ci+r,cj,zb,ci+r+.04,cj,zb-1.2,IRON[2]);
    quad(ci-.28,.02,zb,ci+.28,.02,zb,ci+.2,.02,zb-13,ci-.18,.02,zb-13,(x,y)=>{ const [a,z]=onJ(.02,x,y), n=wn(x,y,.7,sd%7), f=(z-(zb-13))/13; return mix(under(x,y),rgb('#1a2422'),Math.min(.55,.5*f*(.55+n*.7))); });
  } else { th2(ci,cj+r,zt,ci,.02,zt+1.5,IRON[3],IRON[2]);
    quad(ci-.3,.02,zt,ci+.3,.02,zt,ci+.32,.02,zt-14,ci-.32,.02,zt-14,(x,y)=>{ const n=wn(x,y,.8,sd%9), f=1-(onJ(.02,x,y)[1]-(zt-14))/14; return mix(under(x,y),SOOT,Math.min(.6,(.2+.5*n)*(1-f*.5))); }); }
}

/** Smashed gas bracket of the broken lamp with the soot above it on the wall. */
function brokenBracket(/** @type {any} */e){
  const l=ALLEY.lamps.find(q=>q.mode==='dead');
  if(l) quad(l.i-.35,.02,l.z+4,l.i+.35,.02,l.z+4,l.i+.1,.02,l.z+19,l.i-.1,.02,l.z+19,(x,y)=>{ const [a,z]=onJ(.02,x,y), f=(z-l.z-4)/15, n=wn(x,y,.7,5); return mix(under(x,y),SOOT,Math.min(.7,(1-f)*(.35+.55*n))); });
  if(l) wallLamp(l,0,true);
}

/** Locked side passage grille: iron bars, crossbars and a rusted padlock chain over a black void. */
function grille(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, j=j1-.05, h=e.z, sd=hsh(e.id), a0=i0+.1, a1=i1-.1;
  quad(a0,j,0,a1,j,0,a1,j,h,a0,j,h,(x,y)=>{ const z=onJ(j,x,y)[1]; return light(VOID,1.1+.6*Math.max(0,z/h-.5)+wn(x,y,.5,3)*.5); });
  for(let k=0;k<9;k++){ const a=a0+(a1-a0)*k/8; th2(a,j,0,a,j,h,IRON[3],k%3===1?RM:IRON[2]); thin(a-.04,j,h,a,j,h+.7,IRON[3]); }
  for(const z of [3.2,h*.5,h-2]) { th2(a0,j,z,a1,j,z,IRON[3],IRON[2]); }
  thin(a0,j,0,a0,j,h,STONE[3]); thin(a1,j,0,a1,j,h,STONE[1]);
  // chain and old padlock at the middle
  const cm=(a0+a1)/2; for(let k=0;k<4;k++) thin(cm-.1+k*.05,j+.02,h*.5-k*.7,cm+.02+k*.05,j+.02,h*.5-k*.7-.4,RUST[3]);
  quad(cm-.07,j+.03,h*.5-3.4,cm+.09,j+.03,h*.5-3.4,cm+.09,j+.03,h*.5-5.8,cm-.07,j+.03,h*.5-5.8,()=>RM2);
}

/** The blind-end gate: stone arch ring, a cold navy yard behind, nine barred uprights with spear heads, scrolls and a new bright lock and chain. */
function gate(){
  const g=ALLEY.deadEnd.gate, [,j0,,j1]=g.box, I=.42, c=(j0+j1)/2, hw=(j1-j0)/2-.1, sp=26, ap=g.z-.4, N=g.bars;
  const arch=(/** @type {number} */j)=>{ const u=(j-c)/hw; return Math.abs(u)>=1?sp:sp+(ap-sp)*Math.sqrt(1-u*u); };
  // opening: cold yard behind the bars, brick of a far wall hinted by faint courses
  quad(I,j0+.1,0,I,j1-.1,0,I,j1-.1,ap+1,I,j0+.1,ap+1,(x,y)=>{ const [j,z]=onI(I,x,y), a=arch(j); if(z>a||j<j0+.1||j>j1-.1) return 0;
    const t=z/ap, wall=frac(z/4.1)<.1?.8:1, glow=Math.max(0,.6-Math.abs(j-c)*.35-Math.abs(z-sp*.7)*.03);
    return mix(mix(VOID,NAVY,.6+.4*t),rgb('#243448'),glow*.35*wall+.04*wn(x,y,.5,2)); });
  // stone ring and jambs inside the footprint
  quad(I,j0,0,I,j0+.11,0,I,j0+.11,sp,I,j0,sp,()=>light(STONE[1],.8)); quad(I,j1-.11,0,I,j1,0,I,j1,sp,I,j1-.11,sp,()=>light(STONE[0],.9));
  for(let k=0;k<22;k++){ const a0=Math.PI*k/22, a1=Math.PI*(k+1)/22, jj=(a)=>c+Math.cos(a)*(hw+.1), zz=(a,o)=>sp+(ap-sp)*Math.sin(a)*((hw+.1)/hw)+o;
    const col=light(mix(STONE[1],STONE[2],(k%3)/3),.75+.25*Math.sin(a0)+(k===10||k===11?.35:0));
    quad(I,jj(a0),zz(a0,0),I,jj(a1),zz(a1,0),I,jj(a1)+(c-jj(a1))*.12,zz(a1,1.5)-.4,I,jj(a0)+(c-jj(a0))*.12,zz(a0,1.5)-.4,()=>col);
    thin(I,jj(a0),zz(a0,0),I,jj(a0)+(c-jj(a0))*.12,zz(a0,1.5),SOOT); }
  // uprights, rails and spear heads
  const bars=[]; for(let k=0;k<N;k++) bars.push(j0+.28+(j1-j0-.56)*k/(N-1));
  const rail=(/** @type {number} */z)=>th2(I,j0+.12,z,I,j1-.12,z,IRON[3],IRON[2]);
  rail(2.6); rail(15); rail(23);
  let pj=bars[0], pz=arch(bars[0])-2.2; for(const jb of bars.slice(1)){ const z=arch(jb)-2.2; th2(I,pj,pz,I,jb,z,IRON[3],IRON[2]); pj=jb; pz=z; }
  bars.forEach((jb,k)=>{ const top=arch(jb)-2.2; th2(I,jb,.5,I,jb,top,IRON[3],k===4||k===3?RM:IRON[2]);
    const hd=th2; thin(I,jb,top,I,jb,top+2.4,IRON[3]); thin(I,jb-.04,top+.6,I,jb,top+2.4,IRON[2]); thin(I,jb+.04,top+.6,I,jb,top+2.4,IRON[2]); });
  // scroll rings between the middle rails
  for(const jc of [c-1.0,c+1.0]){ const R=.32; for(let k=0;k<12;k++){ const a=k/12*Math.PI*2, b=(k+1)/12*Math.PI*2; thin(I,jc+Math.cos(a)*R,19+Math.sin(a)*2.4,I,jc+Math.cos(b)*R,19+Math.sin(b)*2.4,IRON[3]); } }
  // the new lock: bright brass box, shackle, glint, and a bright steel chain looped across the leaves
  const lj=c, lz=12.4;
  quad(I+.01,lj-.17,lz+1.8,I+.01,lj+.17,lz+1.8,I+.01,lj+.17,lz-1.8,I+.01,lj-.17,lz-1.8,(x,y)=>{ const [j,z]=onI(I+.01,x,y); return z>lz+.8?BRASS[2]:j>lj?BRASS[1]:BRASS[2]; });
  thin(I+.02,lj-.11,lz+1.8,I+.02,lj-.11,lz+3.4,rgb('#c9ccc6')); thin(I+.02,lj+.11,lz+1.8,I+.02,lj+.11,lz+3.4,rgb('#9aa09c')); thin(I+.02,lj-.11,lz+3.4,I+.02,lj+.11,lz+3.4,rgb('#c9ccc6'));
  thin(I+.02,lj,lz+.2,I+.02,lj,lz-.8,SOOT);
  const x=sx(I,lj-.13), y=sy(I,lj,lz+1); px(x,y,rgb('#fff1b8')); px(x+1,y,rgb('#fff1b8')); px(x,y+1,rgb('#fff1b8'));
  for(let k=0;k<8;k++){ const a=c-.9+k*.26, z=lz+3.2-1.4*Math.sin(Math.PI*k/7)*1.0; thin(I+.02,a,z,I+.02,a+.2,z-.2,k%2?rgb('#c9ccc6'):rgb('#7d827f')); }
}

// ---------- washing, signs and gilt balls (they move) ----------

/** Value that rises to 1 and falls back inside a short window now and then: the gusts of wind, one every 8-14 s. */
function gust(/** @type {number} */t){ const per=11, c=Math.floor(t/per), at=c*per+(h2(c,5)/255)*8, u=(t-at)/2; return u>0&&u<1?Math.sin(Math.PI*u):0; }

/** One hung garment: a list of quads in the plane i=const, hanging from the line point (j0,zTop), blown towards -i. */
function cloth(/** @type {number} */i,/** @type {number} */j0,/** @type {number} */zTop,/** @type {number[][]} */parts,/** @type {number} */sw,/** @type {number} */seed,/** @type {number[]} */pal){
  for(const [ja,jb,hTop,hBot,jja,jjb] of parts){
    const zt=zTop-hTop, zb=zTop-hBot, swt=sw*hTop/9, swb=sw*hBot/9, jaB=j0+(jja??ja), jbB=j0+(jjb??jb);
    quad(i+swt,j0+ja,zt,i+swt,j0+jb,zt,i+swb,jbB,zb,i+swb,jaB,zb,(x,y)=>{
      const xx=x-camera.x, f=Math.abs(Math.sin(xx*.5+seed))*.9+Math.sin(xx*1.4+seed*2)*.25-.5, n=wn(x,y,.5,seed%7), v=(zt-onI(i+swt,x,y)[1])/(zt-zb||1), c=n>.8?pal[3]:n<.22?pal[0]:pal[1+(seed&1)];
      return light(c,(.78+f*.4)*(v>.88?.72:1)*(y<(sy(i,j0,zt)+2)?.8:1)); });
  }
}

/** Grey washing on the sagging line across the alley at i~22.5 (walkable under it): sways in two frequencies and in gusts. */
function washing(/** @type {any} */e,/** @type {number} */t){
  const i=(e.box[0]+e.box[2])/2, ja=e.box[1], jb=e.box[3], za=27.5, zb=25.6, g=gust(t), sg=.5*Math.sin(2*Math.PI*.45*t)+.2*Math.sin(2*Math.PI*1.3*t+1.7);
  const line=(/** @type {number} */u)=>[i,ja+(jb-ja)*u,za+(zb-za)*u-(2.8-g*1.1)*4*u*(1-u)];
  // wind: the hems are blown towards the blind end (-i) and swing
  const wind=(/** @type {number} */ph)=>-(.16+.2*g)+(sg*.14+Math.sin(2*Math.PI*.45*t+ph)*.06)*(1+g);
  // pole at the near end and the hook on the wall
  th2(i,jb-.05,0,i,jb-.05,zb+.8,IRON[3],IRON[2]); th2(i,.2,za-.3,i,.2,za+.5,IRON[3],IRON[2]);
  let p=line(0); for(let k=1;k<=16;k++){ const q=line(k/16); thin(p[0],p[1],p[2],q[0],q[1],q[2],rgb('#6a604a')); p=q; }
  const hang=(/** @type {number} */u,/** @type {number[][]} */parts,/** @type {number} */ph,/** @type {number[]} */pal)=>{ const q=line(u); cloth(i,q[1],q[2],parts,wind(ph),Math.round(u*40)+ph|0,pal); };
  // shirt (sleeves hanging), sheet, skirt, trousers, stockings; widths in j, heights in z
  hang(.13,[[-.36,.36,0,10],[-.64,-.36,0,7,-.74,-.42],[.36,.64,0,6.4,.42,.74]],0,[CLOTH[0],CLOTH[1],CLOTH[1],CLOTH[2]]);
  hang(.33,[[-.62,.62,0,12.4],[-.62,0,12,14,-.62,0],[0,.62,12,13.2,0,.62]],1.7,[CLOTH[1],CLOTH[2],CLOTH[2],CLOTH[3]]);
  hang(.56,[[-.24,.24,0,3.4],[-.38,.38,3.4,12.4,-.5,.5]],3.1,[CLOTH[0],CLOTH[1],CLOTH[1],CLOTH[2]]);
  hang(.73,[[-.3,-.02,0,11.4],[.02,.3,0,10.4]],4.4,[CLOTH[0],CLOTH[0],CLOTH[1],CLOTH[2]]);
  hang(.88,[[-.08,.08,0,7.6],[.22,.38,0,6]],5.2,[CLOTH[1],CLOTH[1],CLOTH[2],CLOTH[3]]);
}

/** The smith's hanging board: iron bracket with a scroll, two chains, an empty weathered board that swings (a sheared quad, never rotated). */
function forge(/** @type {any} */e,/** @type {number} */t){
  const i=(e.box[0]+e.box[2])/2, sd=hsh(e.id), z=e.z, ang=.2*Math.sin(2*Math.PI*t/3.4)*(.5+.5*Math.sin(2*Math.PI*t/21)), sw=ang*1.1;
  th2(i,.04,z,i,.9,z,IRON[3],IRON[2]); thin(i,.06,z-5.6,i,.62,z-.2,IRON[3]); thin(i,.06,z-5.6,i,.04,z-3.4,IRON[2]);
  for(let k=0;k<10;k++){ const a=k/10*Math.PI*2, b=(k+1)/10*Math.PI*2; thin(i,.28+Math.cos(a)*.14,z-3.2+Math.sin(a)*1.5,i,.28+Math.cos(b)*.14,z-3.2+Math.sin(b)*1.5,IRON[2]); }
  const jA=.26, jB=.86, zt=z-2.6, zb=zt-7.6;
  thin(i,jA,z,i,jA+sw*.3,zt,IRON[3]); thin(i,jB,z,i,jB+sw*.3,zt,IRON[3]);
  quad(i,jA+sw*.3,zt,i,jB+sw*.3,zt,i,jB+sw,zb,i,jA+sw,zb,(x,y)=>{ const [j,zz]=onI(i,x,y), n=wn(x,y,.5,sd%7), pl=frac(zz*.55);
    if(pl<.1) return light(WOOD[0],1); const ghost=Math.abs(zz-(zt+zb)/2)<1.1&&Math.floor((j-jA)*38)%3===0&&n>.35?.28:0;
    return mix(light(mix(WOOD[3],MOSSW[2],.2*n),.85+n*.4),CHALK,ghost); });
  quad(i,jA+sw*.3,zt,i+.12,jA+sw*.3,zt,i+.12,jA+sw,zb,i,jA+sw,zb,()=>light(WOOD[1],.7)); // +j edge of the thin board
  thin(i,jA+sw*.3,zt,i,jB+sw*.3,zt,light(WOOD[3],1.3)); thin(i,jA+sw,zb,i,jB+sw,zb,WOOD[0]); thin(i,jA+sw*.3,zt,i,jA+sw,zb,light(WOOD[3],1.2));
}

/** One gilt ball: a shaded disc with a bright upper-left glint. */
function ball(/** @type {number} */cx,/** @type {number} */cy,/** @type {number} */r){
  disc(cx,cy,r,r,(x,y,u,v)=>{ const d=Math.hypot(u+.38,v+.4), k=Math.max(0,1.15-d*.95), e=u*u+v*v>.72;
    if(d<.2) return BRASS[2]; return e?BRASS[0]:k>.7?BRASS[2]:k>.35?BRASS[1]:mix(BRASS[1],BRASS[0],.7); });
}
/** Street end face of the bay pier (i of its +i side). */
const BAY_FACE=(ALLEY.boxes.find(b=>b.id==='bay-bridge')||{box:[0,0,22,0]}).box[2];
/** Three gilt pawnbroker's balls on an iron bar. The layout puts them inside the bridge volume where nobody can see them, so they
 * hang on the street face of the bay pier next to the sign and sort with a box just outside it. */
function balls(/** @type {any} */e,/** @type {number} */t){
  const face=BAY_FACE+.04, zb=e.z-1, jc=1.25, ja=jc-.8, jb=jc+.8;
  th2(face,ja,zb,face+.4,ja,zb,IRON[3],IRON[2]); th2(face,jb,zb,face+.4,jb,zb,IRON[3],IRON[2]); th2(face+.4,ja,zb,face+.4,jb,zb,IRON[3],IRON[2]);
  const pts=[[face+.4,ja+.28,zb-5],[face+.4,jb-.28,zb-5],[face+.4,jc,zb-9.6]];
  pts.forEach(([i,j,z],k)=>{ const s=Math.round(Math.sin(2*Math.PI*t/4.1+k*1.3)*.9*1.5); thin(i,j,zb,i,j,z+2.4,IRON[2]); ball(sx(i,j)+s,sy(i,j,z)+2,4.5); });
}

// ---------- assembly ----------

/** Options per barrel id; the rest are plain. */
const CASK={'rain-barrel':{water:true,rusty:true},'barrels-b':{open:true},'barrel-end':{rusty:true},'barrels-court':{open:true,rusty:true},'barrel-bridge':{}};
/** Stack of crates with a coil of rope under the bridge. */
function stack(/** @type {any} */e){
  const [i0,j0,i1,j1]=e.box, sd=hsh(e.id);
  crate(i0,j0+.62,1.1,1.4,5,0,0,1); crate(i0+1.12,j0+.8,1.0,1.2,4.4,0,2,-1); crate(i0+.1,j0+.78,.95,1.1,4.4,5,1,-1);
  const ci=i0+1.6, cj=j0+1.45, zt=4.4, cx=sx(ci,cj);
  cyl(ci,cj,.4,zt,zt+1.4,(z,s)=>light(mix(ROPE,WOOD[1],.5),roundLit(s)*(frac(z*1.9)<.45?1.15:.7)),(s,v)=>Math.hypot(s,v)<.35?light(VOID,1.3):light(ROPE,.9+v*.2));
  cyl(ci,cj,.4,zt+1.4,zt+2.8,(z,s)=>light(mix(ROPE,WOOD[1],.45),roundLit(s)*(frac(z*1.9+.5)<.45?1.15:.7)),(s,v)=>Math.hypot(s,v)<.4?light(VOID,1.3):light(ROPE,.95+v*.2));
  thin(ci+.3,cj+.2,zt+.3,ci+.1,cj+.65,.2,ROPE);
  for(let k=0;k<3;k++) thin(i0+.1+k*.1,j0+.62,4,i0+.5+k*.2,j0+.1,6+k,light(WOOD[3],.8)); // laths leaning on the heap
}

/** @param {any} e @param {number} t seconds */
function drawProp(e,t){
  switch(e.kind){
    case 'barrel': return e.id==='barrel-over'?lying(e):cask(e,/** @type {any} */(CASK)[e.id]||{});
    case 'bin': return bin(e);
    case 'bollard': return bollard(e);
    case 'crate': return crates(e);
    case 'stack': return stack(e);
    case 'sacks': return sacks(e);
    case 'heap': return heap(e);
    case 'cart': return e.id==='cart-broken'?cartBroken(e):cart(e);
    case 'bench': return bench(e);
    case 'trough': return trough(e);
    case 'pump': return pump(e);
    case 'ladder': return ladder(e);
    case 'bucket': return bucket(e);
    case 'fence': return fence(e);
    case 'kerb': return kerb(e);
    case 'steps': return steps(e);
    case 'rail': return rail(e);
    case 'brazier': return brazier(e,t);
    case 'washing': return washing(e,t);
    case 'bracket': return forge(e,t);
    case 'balls': return balls(e,t);
  }
}
/** Kinds baked once: flat things and fixtures on the wall. */
const BAKED=new Set(['grate','skylight','mat','cellar','pipe','gate']);
/** @param {any} e */
const isBaked=e=>BAKED.has(e.kind)||e.id==='bracket-broken';
let NOW=0;
/** Dynamic entries are built once; their draw closures read NOW. */
const DYN=/** @type {{box:number[],draw:()=>void}[]} */([]);
for(const e of ALLEY.boxes) if(!isBaked(e)&&e.kind!=='bay') DYN.push({box:e.id==='balls-pawn'?[BAY_FACE,.3,BAY_FACE+.5,2.2]:e.box,draw:()=>drawProp(e,NOW)});
for(const l of ALLEY.lamps){ if(l.mode==='dead') continue; if(l.kind==='lantern') DYN.push({box:[l.i-.3,0,l.i+.3,l.j+.3],draw:()=>stableLantern(l,NOW)}); else if(l.kind==='bracket') DYN.push({box:[l.i-.2,l.face==='pilaster-mouth'?.8:0,l.i+.2,l.j+.2],draw:()=>wallLamp(l,NOW,false)}); }

/** Static props baked with the shell: gratings, the cellar well, the mat, skylight, pipes, the broken bracket and the gate. */
export function alleyPropsStatic(){
  for(const e of ALLEY.boxes){
    if(e.id==='torn-grating') tornGrating(e);
    else if(e.id==='grate-side') grille(e);
    else if(e.kind==='grate') grating(e,{warm:e.id==='grate-street'});
    else if(e.kind==='skylight') skylight(e);
    else if(e.kind==='mat') mat(e);
    else if(e.kind==='cellar') cellarPit(e);
    else if(e.kind==='pipe') pipe(e);
    else if(e.kind==='gate') gate();
    else if(e.id==='bracket-broken') brokenBracket(e);
  }
}
/** Props sorted with the player: freestanding things, gas brackets, braziers and lamps, washing and swinging signs. @returns {{box:number[],draw:()=>void}[]} */
export function alleyProps(/** @type {number} */t){ NOW=t/TPS; return DYN; }
