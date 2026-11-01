// Pub interior furniture on the floor: standing drinking tables, dining tables with seating, piano, coat stand, tableware.
// Layout: src/pub-layout.js. Everything is drawn from world coordinates (textures from ground()/onI()/onJ(), or screen
// coordinates relative to isoX(0,0)), so nothing swims while the camera pans.
import { quad, isoX, isoY, shadeC } from './gym.js';
import { state as rendererState } from './renderer.js';
import { state as appearanceState, rgb } from './appearance.js';
import { PUB } from './pub-layout.js';
import { mix } from './cast.js';
import { cyl, roundLit, vn, ground, onI, onJ, thin, contact } from './thames-port.js';

const K={
  oak:rgb('#7a5632'), oakD:rgb('#3f2a17'), mah:rgb('#6a2a1c'), rose:rgb('#4a221a'), brass:rgb('#cfa44a'), brassD:rgb('#7b5a22'), brassL:rgb('#f4dd8e'),
  pewter:rgb('#a3a9a7'), pewterD:rgb('#5b6261'), iron:rgb('#1d1f1e'), ironHi:rgb('#5b605d'), cream:rgb('#efe3c0'), ivory:rgb('#e8dcb8'), porter:rgb('#2a1409'),
  flame:rgb('#fff0b0'), flameO:rgb('#f0a23c'), crust:rgb('#c48a3c'), crustD:rgb('#7d4a1f'), cloth:rgb('#ddd5c0'), silk:rgb('#7c2733'), paper:rgb('#e6dfc6'),
};
let OX=0, OY=0;
/** Remember the screen origin of world (0,0): the anchor for screen-space textures. */
function begin(){ OX=isoX(0,0); OY=isoY(0,0,0); }
/** Value noise in screen space relative to the world origin. */
const N=(/** @type {number} */x,/** @type {number} */y,/** @type {number} */s,o=0)=>vn((x-OX)*s+o,(y-OY)*s+o*.7);
const hs=(/** @type {number} */n)=>{ const s=Math.sin(n*127.1+311.7)*43758.5; return s-Math.floor(s); };
const frac=(/** @type {number} */v)=>v-Math.floor(v);
/** One pixel. */
function px(/** @type {number} */x,/** @type {number} */y,/** @type {number} */c){
  const W=appearanceState.W, H=appearanceState.H; x=Math.round(x); y=Math.round(y);
  if(x>=0&&y>=0&&x<W&&y<H) rendererState.fb[y*W+x]=c;
}
function rect(/** @type {number} */x,/** @type {number} */y,/** @type {number} */w,/** @type {number} */h,/** @type {number} */c){
  for(let yy=0;yy<h;yy++) for(let xx=0;xx<w;xx++) px(x+xx,y+yy,c);
}
/** Lit ellipsoid in screen pixels (loaves, hats, chops, flowers). */
function blob(/** @type {number} */cx,/** @type {number} */cy,/** @type {number} */rx,/** @type {number} */ry,/** @type {number} */col,tex=0){
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    const u=(x+.5-cx)/rx, v=(y+.5-cy)/ry, q=u*u+v*v; if(q>1) continue;
    const nz=Math.sqrt(1-q); let k=.5+.75*Math.max(0,.55*nz-.45*u-.55*v); if(q>.7) k*=1-.35*(q-.7)/.3;
    px(x,y,shadeC(col,k*(1+tex*(N(x,y,.9)-.5))));
  }
}
/** Flat ellipse in screen pixels. */
function disc(/** @type {number} */cx,/** @type {number} */cy,/** @type {number} */rx,/** @type {number} */ry,/** @type {(u:number,v:number)=>number} */fn){
  for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){
    const u=(x+.5-cx)/rx, v=(y+.5-cy)/ry; if(u*u+v*v<=1) px(x,y,fn(u,v));
  }
}
/** Screen point of a world point. */
const bz=(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z)=>[isoX(i,j),isoY(i,j,z)];
/** Plane lookup: [along, z] of the pixel on the vertical plane i=val or j=val. */
const fz=(/** @type {string} */plane,/** @type {number} */val,/** @type {number} */x,/** @type {number} */y)=>plane==='i'?onI(val,x,y):onJ(val,x,y);
/** Two-pixel-wide world line. */
function rod(/** @type {number[]} */a,/** @type {number[]} */b,/** @type {number} */c,/** @type {number} */hi=0){
  thin(a[0],a[1],a[2],b[0],b[1],b[2],c); thin(a[0]+.035,a[1]-.035,a[2],b[0]+.035,b[1]-.035,b[2],hi||shadeC(c,1.5));
}

/** Plank wood texture for a horizontal surface at height z: planks run along the world axis `axis`. */
function plankTop(/** @type {number} */z,/** @type {string} */axis,/** @type {number} */base,/** @type {number} */seed,pl=5.4){
  return (/** @type {number} */x,/** @type {number} */y)=>{
    const [i,j]=ground(x,y,z), a=axis==='i'?j:i, b=axis==='i'?i:j, p=Math.floor(a*pl), e=frac(a*pl);
    if(e<.06) return shadeC(base,.62);
    const tone=.8+.2*hs(p+seed)+.2*(vn(b*1.1+p*7.1,a*2.5)-.5)+.07*Math.sin(b*7+hs(p)*6);
    return shadeC(base,tone*(e>.88?1.12:1));
  };
}
/** Wood on a vertical face: u runs along it, z up; the face leans away from the light by k. */
function woodFace(/** @type {string} */plane,/** @type {number} */val,/** @type {number} */base,/** @type {number} */k,seed=0){
  return (/** @type {number} */x,/** @type {number} */y)=>{
    const [u,z]=fz(plane,val,x,y);
    return shadeC(base,k*(.82+.3*vn(u*2.2+seed,z*.22)+.08*Math.sin(z*1.7+u*.8)));
  };
}
/** Generic shaded block in (a along the long axis, b across) coordinates: end face at a1, across face at b1, top. */
function slab(/** @type {string} */axis,/** @type {number} */a0,/** @type {number} */b0,/** @type {number} */a1,/** @type {number} */b1,/** @type {number} */z0,/** @type {number} */z1,/** @type {number} */base,/** @type {{top?:Function,side?:Function}} */o={}){
  const m=axis==='i'?(/** @type {number} */a,/** @type {number} */b)=>[a,b]:(/** @type {number} */a,/** @type {number} */b)=>[b,a];
  const pe=axis==='i'?'i':'j', pa=axis==='i'?'j':'i';
  const f=(/** @type {string} */pl,/** @type {number} */v,/** @type {number} */k)=>o.side?o.side(pl,v,k):woodFace(pl,v,base,k);
  const P=(/** @type {number} */a,/** @type {number} */b,/** @type {number} */z)=>[...m(a,b),z];
  // @ts-ignore
  quad(...P(a1,b0,z0),...P(a1,b1,z0),...P(a1,b1,z1),...P(a1,b0,z1),f(pe,a1,pe==='i'?1:.78));
  // @ts-ignore
  quad(...P(a0,b1,z0),...P(a1,b1,z0),...P(a1,b1,z1),...P(a0,b1,z1),f(pa,b1,pa==='i'?1:.78));
  // @ts-ignore
  quad(...P(a0,b0,z1),...P(a1,b0,z1),...P(a1,b1,z1),...P(a0,b1,z1),o.top||plankTop(z1,axis,base,3));
  const e=(/** @type {number[]} */p,/** @type {number[]} */q)=>thin(p[0],p[1],p[2],q[0],q[1],q[2],shadeC(base,1.55));
  e(P(a0,b1,z1),P(a1,b1,z1)); e(P(a1,b0,z1),P(a1,b1,z1));
  const d=(/** @type {number[]} */p,/** @type {number[]} */q)=>thin(p[0],p[1],p[2],q[0],q[1],q[2],shadeC(base,.45));
  d(P(a0,b1,z0),P(a1,b1,z0)); d(P(a1,b0,z0),P(a1,b1,z0)); d(P(a1,b1,z0),P(a1,b1,z1));
}

/* ---------- tableware ---------- */
/** Drinking vessels. kind: pewter tankard, porter pint (cream head), gin glass, ale mug. */
function vessel(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {string} */kind,/** @type {number} */t=0){
  if(kind==='gin'){
    cyl(i,j,.05,z,z+.9,(zz,s)=>shadeC(K.pewterD,roundLit(s)),null);
    cyl(i,j,.09,z+.9,z+1.8,(zz,s)=>zz>z+1.5?mix(rgb('#9db1ab'),rgb('#d8e4de'),.5+.5*s*-1):mix(rgb('#7f9a98'),rgb('#dfeeea'),.4+.3*-s),(s,v)=>mix(rgb('#a8bfba'),rgb('#eaf4ee'),.3+.3*v),.12);
    return;
  }
  const x=isoX(i,j), y=isoY(i,j,z+2.2);
  if(kind==='porter'){
    cyl(i,j,.125,z,z+2.5,(zz,s)=>zz>z+2.0?shadeC(K.cream,roundLit(s)):shadeC(K.porter,.65+roundLit(s)*.8+(s>-.55&&s<-.3?.5:0)),(s,v)=>shadeC(K.cream,.95+.1*-v-.05*Math.abs(s)),.14);
  }else{
    const col=kind==='ale'?rgb('#9a6f2e'):K.pewter;
    cyl(i,j,.13,z,z+2.5,(zz,s)=>(kind==='ale'&&zz>z+.3&&zz<z+2.1)?mix(rgb('#7a4d1a'),rgb('#d79a3a'),.4+.5*roundLit(s)*.7):shadeC(col,roundLit(s)*(zz>z+2.2||zz<z+.4?1.15:1)),
      (s,v)=>kind==='ale'?mix(rgb('#a8742a'),K.cream,.35+.25*-v):shadeC(K.pewterD,.8+.3*-v),.05);
    const hx=Math.round(x+2.6);
    for(let k=0;k<4;k++) px(hx+(k===0||k===3?0:1),Math.round(y+k+.5),kind==='ale'?shadeC(col,.7):K.pewterD);
  }
}
/** Pewter plate with a chop, a bone and a potato. */
function chopPlate(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z){
  const [x,y]=bz(i,j,z);
  disc(x,y,5,2.6,(u,v)=>(u*u+v*v>.62)?shadeC(K.pewter,1.1+.25*-v):shadeC(K.pewter,.78+.1*-u));
  blob(x-1,y-.4,2.6,1.4,rgb('#8b4a22'),.4); px(x+1.5,y-1,rgb('#e8dcc0')); px(x+2.5,y-.6,rgb('#e8dcc0'));
  blob(x+2.2,y+.4,1.5,.9,rgb('#d6bc6a'),.3); px(x-3,y+.3,rgb('#4d7a35')); px(x-2.2,y+.8,rgb('#5d8a40'));
}
/** Pie with golden crimped crust and a pastry leaf. */
function pie(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,r=.3){
  cyl(i,j,r,z,z+1.5,(zz,s)=>shadeC(K.crust,roundLit(s)*(.9+.2*N(isoX(i,j)+s*9,isoY(i,j,zz),.9))*(frac(s*5+zz*.3)<.25?.88:1)),
    (s,v)=>{ const rr=Math.hypot(s,v); return rr>.82?shadeC(K.crustD,.9+.3*(frac(Math.atan2(v,s)*3.2)<.5?1:0)):shadeC(K.crust,.95+.25*N(s*20,v*20,.8)+.1*-v); },.04);
  const [x,y]=bz(i,j,z+1.5); px(x,y-.5,K.crustD); px(x-1,y,K.crustD); px(x+1,y,K.crustD); px(x+2,y-1,rgb('#e8b45a')); px(x-2,y+.5,rgb('#e8b45a')); px(x,y+1,rgb('#7d4a1f'));
}
/** Round loaf on a wooden board. */
function loaf(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z){
  const [x,y]=bz(i,j,z);
  disc(x,y+.5,6,3,(u,v)=>shadeC(K.oak,.9+.2*-v+.12*N(x+u*9,y+v*9,.5)));
  blob(x-.5,y-1.6,3.8,2.5,rgb('#c58b45'),.35); thin(i-.08,j+.05,z+2.5,i+.1,j-.06,z+2.4,rgb('#e8b868')); px(x-1,y-2.5,rgb('#f0c880')); px(x+1,y-1,rgb('#8a5320'));
  px(x+4,y+1,K.pewter); px(x+5,y+1,K.pewterD); px(x+6,y+.5,K.pewter);   // bread knife
}
/** Cheese wedge on a board. */
function cheese(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z){
  const [x,y]=bz(i,j,z);
  disc(x,y+.5,5,2.5,(u,v)=>shadeC(K.oak,.95+.2*-v));
  quad(i-.2,j-.1,z,i+.2,j-.1,z,i+.2,j-.1,z+1.1,i-.2,j-.1,z+1.1,()=>rgb('#c2902e'));
  quad(i+.2,j-.1,z,i+.2,j+.2,z,i+.2,j+.2,z+1,i+.2,j-.1,z+1.1,()=>rgb('#e4b94a'));
  quad(i-.2,j-.1,z+1.1,i+.2,j-.1,z+1.1,i+.2,j+.2,z+1,i-.2,j-.1,z+1.1,()=>rgb('#f2d070'));
  px(x+1,y-1,rgb('#c2902e')); px(x+2,y-1.6,rgb('#c2902e'));
}
/** Salt cellar / mustard pot. */
function pot(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {number} */col){
  cyl(i,j,.09,z,z+.9,(zz,s)=>shadeC(col,roundLit(s)),(s,v)=>shadeC(col,1+.1*-v),.1);
}
/** Brass candlestick with a lit candle. */
function candle(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {number} */t,h=1.7){
  cyl(i,j,.13,z,z+.4,(zz,s)=>shadeC(K.brass,roundLit(s)),(s,v)=>shadeC(K.brassL,.9+.1*-v),.12);
  cyl(i,j,.04,z+.4,z+1.5,(zz,s)=>shadeC(K.brass,roundLit(s)*(zz>z+.8&&zz<z+1?1.3:1)),null);
  cyl(i,j,.05,z+1.5,z+1.5+h,(zz,s)=>shadeC(K.cream,.7+.4*roundLit(s)),(s,v)=>shadeC(K.cream,1));
  const [x,y]=bz(i,j,z+1.6+h), f=Math.floor(t/5+i*9)%3;
  px(x,y,K.flame); px(x,y-1,K.flame); px(x+(f-1)*(f!==1?1:0)*.0+(f===2?1:0),y-2,K.flameO); px(x,y+1,rgb('#fff6d0'));
}
/** Jug with a handle. */
function jug(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {number} */col){
  cyl(i,j,.15,z,z+2.7,(zz,s)=>shadeC(col,roundLit(s)*(zz>z+2.1?.95:1.02)+(s>-.6&&s<-.35?.18:0)),(s,v)=>shadeC(K.porter,.9+.2*-v),.28);
  const [x,y]=bz(i,j,z+1.8); for(let k=0;k<5;k++) px(x+4+(k===0||k===4?0:1),y+k-2,shadeC(col,.75));
}
/** Knife and fork laid beside a place. */
function cutlery(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {string} */axis){
  const d=axis==='i'?[0,.42]:[.42,0];
  thin(i,j,z,i+d[0],j+d[1],z,K.pewter); thin(i+.12*(axis==='i'?1:0),j+.12*(axis==='i'?0:1),z,i+.12*(axis==='i'?1:0)+d[0],j+.12*(axis==='i'?0:1)+d[1],z,rgb('#6c716f'));
}
/** Folded newspaper. */
function paper(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {number} */ang){
  const c=Math.cos(ang), s=Math.sin(ang), P=(/** @type {number} */a,/** @type {number} */b)=>[i+a*c-b*s,j+a*s+b*c,z];
  const A=P(-.32,-.2), B=P(.32,-.2), C=P(.32,.2), D=P(-.32,.2);
  // @ts-ignore
  quad(...A,...B,...C,...D,(x,y)=>{ const [u,v]=ground(x,y,z), a=(u-i)*c+(v-j)*s, l=frac((-(u-i)*s+(v-j)*c)*7.5); return (l<.28||Math.abs(a)>.28||(Math.abs(a)<.03))?shadeC(K.paper,.78):shadeC(K.paper,.95+.1*vn(a*9,l*4)); });
  thin(...A,...B,shadeC(K.paper,.6)); thin(...B,...C,shadeC(K.paper,.6));
}
/** A few dominoes. */
function dominoes(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z){
  for(const [a,b,g] of [[0,0,.3],[.3,.08,1.2],[.12,-.26,.7],[-.25,.2,2.1]]){
    const c=Math.cos(g)*.13, s=Math.sin(g)*.13, d=Math.cos(g+1.57)*.07, e=Math.sin(g+1.57)*.07, x=i+a, y=j+b;
    quad(x-c-d,y-s-e,z,x+c-d,y+s-e,z,x+c+d,y+s+e,z,x-c+d,y-s+e,z,(px_,py_)=>{ const [u,v]=ground(px_,py_,z); return (Math.abs((u-x)*Math.cos(g)+(v-y)*Math.sin(g))<.025)?K.ivory:(hs(Math.floor(u*40)+Math.floor(v*40))>.8?shadeC(K.ivory,.9):rgb('#181514')); });
  }
}
/** Clay pipe on a dish. */
function pipeDish(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z){
  const [x,y]=bz(i,j,z);
  disc(x,y,4,2,(u,v)=>(u*u+v*v>.55)?shadeC(rgb('#cbd2cc'),1.1+.2*-v):shadeC(rgb('#8fa0a0'),.9));
  const bx=x+2, by=y-2; px(bx-1,by,K.cream); px(bx,by,rgb('#f6efd8')); px(bx,by-1,rgb('#d7cfb6')); px(bx+1,by,rgb('#9b9078'));
  for(let k=1;k<7;k++) px(bx-1-k,by+.4*k,k%2?K.cream:rgb('#d9d1b8'));
}

/* ---------- standing drinking tables ---------- */
/** Tall standing drinking table: iron tripod, plain column with one brass collar, marble or mahogany top with a brass rim; bare top. */
function standing(/** @type {{i:number,j:number,r:number}} */s,/** @type {number} */k,/** @type {number} */t){ void t;
  const {i,j,r}=s, marble=k%2===0, a0=k*.8;
  contact(i-r*.8,j-r*.8,i+r*.8,j+r*.8,0,.58);
  const feet=[0,2.094,4.189].map(a=>a+a0).sort((a,b)=>(Math.cos(a)+Math.sin(a))-(Math.cos(b)+Math.sin(b)));
  const leg=(/** @type {number} */a)=>{
    const di=Math.cos(a), dj=Math.sin(a), R=r*.95;
    const p0=[i+di*.06,j+dj*.06,2.4], p1=[i+di*R*.55,j+dj*R*.55,1.5], p2=[i+di*R,j+dj*R,.2], p3=[i+di*R*1.06+dj*.05,j+dj*R*1.06-di*.05,.05];
    rod(p0,p1,K.iron,K.ironHi); rod(p1,p2,K.iron,K.ironHi); rod(p2,p3,K.iron,K.ironHi);
    const [x,y]=bz(p3[0],p3[1],.6); px(x,y,K.ironHi); px(x+1,y,K.iron);
  };
  const front=feet.filter(a=>Math.cos(a)+Math.sin(a)>=0), back=feet.filter(a=>Math.cos(a)+Math.sin(a)<0);
  back.forEach(leg);
  const iron=(/** @type {number} */zz,/** @type {number} */sv)=>shadeC(K.iron,.9+roundLit(sv)*1.1);
  cyl(i,j,.07,.6,9,iron,null);
  cyl(i,j,.1,7.4,8.4,(zz,sv)=>shadeC(K.brass,roundLit(sv)),null,.4);
  front.forEach(leg);
  // top
  cyl(i,j,r,9.2,10.05,(zz,sv)=>zz<9.55?shadeC(K.brass,.55+roundLit(sv)):shadeC(marble?rgb('#cfd0c6'):K.mah,roundLit(sv)*(marble?1:.95)),
    (sv,v)=>{ const rr=Math.hypot(sv,v), x=isoX(i,j)+sv*r*17, y=isoY(i,j,10.05)+v*r*8.5;
      if(rr>.9) return shadeC(K.brass,rr>.96?.85:1.2+.3*-v);
      if(marble){ const n=N(x,y,.16,k*5), vein=Math.abs(N(x,y,.24,7+k)-.5)<.035?1:0; return shadeC(rgb('#dcdcd2'),.88+.2*n+.08*-v-(vein?.28:0)); }
      return shadeC(K.mah,.85+.35*N(x,y,.14,k)+.13*Math.sin(rr*26+N(x,y,.2)*6)*.5+.12*-v); });
}

/* ---------- chairs and benches ---------- */
/** Dark oak captain's (smoker's-bow) chair at (ci,cj): spindle bow and top hoop behind, facing +j toward the table. */
function chair(/** @type {number} */ci,/** @type {number} */cj,/** @type {number} */k){
  contact(ci-.22,cj-.22,ci+.22,cj+.22,0,.62);
  const wood=rgb('#3f2616'), hi=shadeC(wood,1.9), seatZ=4.5, ang=-Math.PI/2, R=.24;
  const arc=(/** @type {number} */f,/** @type {number} */z,r=R)=>{ const a=ang+f*1.5; return [ci+Math.cos(a)*r,cj+Math.sin(a)*r,z]; };
  const legs=[[.17,.17],[.17,-.17],[-.17,.17],[-.17,-.17]].sort((p,q)=>(p[0]+p[1])-(q[0]+q[1]));
  for(const [a,b] of legs){ rod([ci+a,cj+b,seatZ-.2],[ci+a*1.3,cj+b*1.3,0],wood,hi); const m=[ci+a*1.12,cj+b*1.12,2.3]; const [x,y]=bz(m[0],m[1],m[2]); px(x,y,hi); px(x+1,y,wood); }
  // bow arm-rail on spindles, top hoop on a fan of spindles
  const rz=7.4, hz=9.6;
  for(let n=0;n<=8;n++){ const f=n/4-1, p=arc(f,seatZ+.4,R-.02); thin(p[0],p[1],p[2],p[0],p[1],rz,shadeC(wood,1.35)); }
  for(let n=0;n<=5;n++){ const f=(n/5-.5)*1.1, p=arc(f,rz); thin(p[0],p[1],p[2],p[0],p[1],hz-.5*f*f,shadeC(wood,1.35)); }
  for(let n=0;n<8;n++){ const a=arc(n/4-1,rz), b=arc((n+1)/4-1,rz); rod(a,b,wood,hi); }
  for(let n=0;n<5;n++){ const a=arc((n/5-.5)*1.1,hz-.5*Math.pow((n/5-.5)*1.1,2)), b=arc(((n+1)/5-.5)*1.1,hz-.5*Math.pow(((n+1)/5-.5)*1.1,2)); rod(a,b,wood,hi); }
  for(const f of [-1,1]){ const p=arc(f,rz), [x,y]=bz(p[0],p[1],rz); blob(x,y,1.6,1.3,rgb('#5a3a22')); }
  cyl(ci,cj,.26,seatZ,seatZ+.55,(zz,s)=>shadeC(wood,roundLit(s)),(s,v)=>{ const x=isoX(ci,cj)+s*4.4, y=isoY(ci,cj,seatZ+.55)+v*2.2; return shadeC(rgb('#5a3a21'),.85+.35*N(x,y,.5,k)+.14*-v+(Math.hypot(s,v)>.84?.2:0)); },.02);
}
/** Captain's chairs pulled up on the room side of a table (axis i). */
function chairRow(/** @type {number[]} */box,/** @type {number[]} */us,/** @type {number} */k){
  const [i0,j0,i1]=box;
  us.forEach((u,n)=>chair(i0+(i1-i0)*u,j0-.29,k+n));
}
/** Bottle-green leather colour of the banquette, tufted: diamond buttons, puffs, rolled lip near the top edge. */
function tuft(/** @type {string} */plane,/** @type {number} */val,/** @type {number} */u0,/** @type {number} */top){
  const green=rgb('#1f4a34'), oak=rgb('#3f2616');
  return (/** @type {number} */x,/** @type {number} */y)=>{
    const [u,z]=fz(plane,val,x,y);
    if(z<1.2) return oak;
    if(z<3.3) return shadeC(green,.7+.12*vn(u*3,z)+(z<1.5?-.15:0)+(z>3.0?.12:0));
    const gx=(u-u0)/.5, gz=(z-3.3)/1.3, fp=frac((gx+gz)/2), fq=frac((gx-gz)/2), dp=Math.min(fp,1-fp), dq=Math.min(fq,1-fq);
    if(Math.hypot(dp,dq)<.1) return shadeC(rgb('#0c1f16'),1+.6*(z>5.5));
    const crease=Math.min(dp,dq), puff=.52+1.15*Math.min(1,crease*3.4), lit=.88+.35*(.5-Math.abs(fp-.5))*(fq<.5?1:.6);
    let k=puff*lit*(.94+.14*vn(u*4,z*2));
    if(z>top-.8) k*=1.12+.2*Math.sin((top-z)/.8*1.57);
    return shadeC(green,k*1.12*(plane==='i'?1.12:1));
  };
}
const OAK=rgb('#3f2616'), GREEN=rgb('#1f4a34'), SEAT=rgb('#5e3c21');   /* polished oak seat board: only the backrest is upholstered */
const oakTop=(/** @type {number} */z)=>plankTop(z,'j',OAK,5,6);
/** Carved oak scroll end / arm: block with a volute and studs. */
function scrollEnd(/** @type {number} */i0,/** @type {number} */j0,/** @type {number} */i1,/** @type {number} */j1,/** @type {number} */top,/** @type {number} */faceI,/** @type {number} */faceJ){
  slab('i',i0,j0,i1,j1,0,6.4,OAK,{top:oakTop(6.4)});
  slab('i',i0,j0+(faceJ?0:.25),i1,j1-(faceJ?.25:0),6.4,top+.4,OAK,{top:oakTop(top+.4)});
  const [sx,sy]=bz(faceI?i1:(i0+i1)/2,faceJ?j1:j0+.06,6.6); blob(sx,sy,2.5,2,rgb('#6a4328')); px(sx,sy,shadeC(OAK,.5)); px(sx+1,sy-1,shadeC(OAK,1.9));
  const [bx,by]=bz(faceI?i1:i0+.1,faceJ?j1:j0+.45,3.3); px(bx,by,K.brass); px(bx,by+3,K.brass);
}
/** The long run of the banquette along the wall j=J: rear (tufted back), rolled top, bay dividers, scroll end at the street. */
function banquette(){
  const [i0,j0,i1,j1]=PUB.banquette.box, top=PUB.banquette.back, ei=.24, bx1=i1-ei, bj=j1-.36;
  contact(i0,j0,i1,j1,0,.5);
  slab('i',i0,j0+.03,bx1,j1,0,1.2,OAK,{});
  slab('i',i0,j0,bx1,j1-.34,1.2,4.5,SEAT,{top:plankTop(4.5,'i',SEAT,7,4)}); thin(i0,j0,4.45,bx1,j0,4.45,shadeC(SEAT,1.5));
  /* the backrest starts clear of the corner: from the camera it would stand in front of the L leg's seat; the seat runs on round the corner */
  const ib=Math.max(i0,PUB.banquette.backFrom);
  quad(i0,j1,1.2,ib,j1,1.2,ib,j1,4.5,i0,j1,4.5,woodFace('j',j1,SEAT,.78));
  quad(ib,j1,1.2,bx1,j1,1.2,bx1,j1,top,ib,j1,top,tuft('j',j1,.17,top));
  quad(ib,bj,top,bx1,bj,top,bx1,j1,top,ib,j1,top,(x,y)=>{ const [i,j]=ground(x,y,top), c=(j-bj)/(j1-bj); return shadeC(GREEN,.65+1.05*Math.sin(Math.max(0,Math.min(1,c))*3.14)+.12*vn(i*2,j*3)); });
  thin(ib,j1,top-.1,bx1,j1,top-.1,shadeC(GREEN,1.9));
  scrollEnd(ib-.12,j0+.3,ib+.12,j1,top,0,0);
  const bays=PUB.dining.map(d=>d.box).sort((a,b)=>a[0]-b[0]);
  for(const c of [(bays[0][2]+bays[1][0])/2,(bays[1][2]+bays[2][0])/2]){
    slab('i',c-.07,j0,c+.07,j1,5.6,6.5,OAK,{top:oakTop(6.5)}); slab('i',c-.06,j0+.02,c+.06,j0+.16,0,5.6,OAK,{});
  }
  scrollEnd(bx1,j0,i1,j1,top,1,0);
}
/** The L leg along the wall i=0 from the chimney breast to the corner: buttoned back and piped seat face the camera. */
function banquetteLeg(){
  const [i0,j0,i1,j1]=PUB.banquette.leg, top=PUB.banquette.legBack, bk=.28, ec=.15, bj=j1-.36;
  contact(i0,j0,i1,j1,0,.5);
  slab('i',i0,j0,i1-.03,j1,0,1.2,OAK,{});
  slab('i',i0+bk,j0+ec,i1,j1-.34,1.2,4.5,SEAT,{top:plankTop(4.5,'j',SEAT,9,4)});
  thin(i1,j0+ec,4.45,i1,j1-.34,4.45,shadeC(SEAT,1.6)); thin(i1,j0+ec,3.9,i1,j1-.34,3.9,shadeC(SEAT,.6));
  // buttoned back, facing +i
  quad(i0+bk,j0+ec,1.2,i0+bk,bj,1.2,i0+bk,bj,top,i0+bk,j0+ec,top,tuft('i',i0+bk,j0+ec+.12,top));
  quad(i0,j0+ec,top,i0+bk,j0+ec,top,i0+bk,bj,top,i0,bj,top,(x,y)=>{ const [i,j]=ground(x,y,top), c=(i-i0)/bk; return shadeC(GREEN,.65+1.05*Math.sin(Math.max(0,Math.min(1,c))*3.14)+.12*vn(i*3,j*2)); });
  thin(i0+bk,j0+ec,top-.1,i0+bk,bj,top-.1,shadeC(GREEN,1.9));
  // corner block: rear face continues the long run's tufting and its rolled top
  /* corner block at the long run's height: a tall corner would stand between the camera and this seat */
  /* corner: oak seat only, continuing into the long run's seat (its backrest starts further along) */
  slab('i',i0+bk,j1-.34,i1,j1,1.2,4.5,SEAT,{top:plankTop(4.5,'j',SEAT,9,4)});
  // slim carved arm at the chimney end
  slab('i',i0,j0,i1,j0+ec,0,6.4,OAK,{top:oakTop(6.4)});
  slab('i',i0,j0,i0+bk,j0+ec,6.4,top+.6,OAK,{top:oakTop(top+.6)});
  const [sx,sy]=bz(i1,j0+ec,6.5); blob(sx,sy,2.4,1.8,rgb('#6a4328')); px(sx,sy,shadeC(OAK,.5)); px(sx+1,sy-1,shadeC(OAK,1.9));
}

/* ---------- dining tables ---------- */
const DINE=[
  {cloth:true,seed:2,col:rgb('#4a2f1a'),chairs:[.25,.75]},
  {cloth:false,seed:11,col:rgb('#523520'),chairs:[.17,.5,.83]},
  {cloth:false,seed:23,col:rgb('#4a301b'),chairs:[.2,.5,.8]},
];
function diningTable(/** @type {{box:number[],axis:string}} */d,/** @type {number} */k,/** @type {number} */t){
  const [i0,j0,i1,j1]=d.box, ax=d.axis, cfg=DINE[k];
  const a0=ax==='i'?i0:j0, a1=ax==='i'?i1:j1, b0=ax==='i'?j0:i0, b1=ax==='i'?j1:i1, L=a1-a0, W=b1-b0;
  const m=(/** @type {number} */a,/** @type {number} */b)=>ax==='i'?[a,b]:[b,a];
  const at=(/** @type {number} */u,/** @type {number} */v)=>m(a0+L*u,b0+W*v);
  contact(i0+.05,j0+.05,i1-.05,j1-.05,0,.5);
  const wood=cfg.col;
  const corners=[[a0+.17,b0+.17],[a1-.17,b0+.17],[a0+.17,b1-.17],[a1-.17,b1-.17]];
  const ordered=corners.map(c=>m(c[0],c[1])).sort((p,q)=>(p[0]+p[1])-(q[0]+q[1]));
  for(const [ci,cj] of ordered) cyl(ci,cj,.095,0,6.1,(zz,s)=>{ const b=(zz>1.1&&zz<1.6)||(zz>3.4&&zz<3.9)||zz<.5; return shadeC(wood,roundLit(s)*(b?.7:1.05)*(zz>5.4?1.1:1)); },null,.5);
  // apron and top
  slab(ax,a0+.06,b0+.06,a1-.06,b1-.06,5.7,6.9,wood,{side:(pl,v,kk)=>woodFace(pl,v,shadeC(wood,.8),kk,k*3)});
  slab(ax,a0,b0,a1,b1,6.9,7.5,wood,{top:plankTop(7.5,ax,wood,cfg.seed,4)});
  if(cfg.cloth){
    const ov=.1, c0=a0-ov, c1=a1+ov, d0=b0-ov, d1=b1+ov, zt=7.62, zh=4.7;
    const drape=(/** @type {string} */pl,/** @type {number} */v)=>(/** @type {number} */x,/** @type {number} */y)=>{ const [u,z]=fz(pl,v,x,y); const f=Math.sin(u*34+hs(k)*4)*.5+Math.sin(u*13)*.5; if(z<zh+.55&&z>zh+.05) return shadeC(rgb('#6a7a96'),.9+.2*f);
      return shadeC(K.cloth,(pl==='i'?1:.8)*(.88+.1*f+.06*(z-zh)/3)*(z<zh+.1?.8:1)); };
    // @ts-ignore
    quad(...[...m(c1,d0),zt],...[...m(c1,d1),zt],...[...m(c1,d1),zh],...[...m(c1,d0),zh],drape(ax==='i'?'i':'j',c1));
    // @ts-ignore
    quad(...[...m(c0,d1),zt],...[...m(c1,d1),zt],...[...m(c1,d1),zh],...[...m(c0,d1),zh],drape(ax==='i'?'j':'i',d1));
    // @ts-ignore
    quad(...[...m(c0,d0),zt],...[...m(c1,d0),zt],...[...m(c1,d1),zt],...[...m(c0,d1),zt],(x,y)=>{ const [u,v]=ground(x,y,zt), a=ax==='i'?u:v, b=ax==='i'?v:u, ed=Math.min(b-d0,d1-b,a-c0,c1-a);
      return ed<.1&&ed>.06?shadeC(rgb('#6a7a96'),1.1):shadeC(K.cloth,.97+.07*vn(u*3,v*3)-(Math.abs(frac(a*2.2)-.5)<.02?.07:0)); });
    thin(...m(c1,d1),zt,...m(c1,d0),zt,shadeC(K.cloth,1.15)); thin(...m(c1,d1),zt,...m(c0,d1),zt,shadeC(K.cloth,1.15));
  }
  const z=cfg.cloth?7.62:7.5;
  const items=[
    ()=>{ candle(...at(.5,.5),z,t,2.4); pie(...at(.2,.45),z); chopPlate(...at(.76,.78),z); chopPlate(...at(.76,.22),z); jug(...at(.93,.5),z,rgb('#9fb3a6')); pot(...at(.42,.8),z,rgb('#e8e2d0')); cutlery(...at(.67,.9),z,ax); cutlery(...at(.67,.1),z,ax); },
    ()=>{ loaf(...at(.14,.55),z); cheese(...at(.4,.38),z); jug(...at(.64,.7),z,rgb('#a8794a')); vessel(...at(.7,.3),z,'pewter'); vessel(...at(.82,.65),z,'ale'); candle(...at(.54,.5),z,t,1.2); pot(...at(.92,.4),z,rgb('#e8e2d0')); chopPlate(...at(.32,.86),z); cutlery(...at(.9,.8),z,ax); },
    ()=>{ pie(...at(.3,.5),z,.34); chopPlate(...at(.62,.3),z); chopPlate(...at(.62,.74),z); candle(...at(.88,.45),z,t,2.1); pot(...at(.47,.2),z,rgb('#caa84a')); pot(...at(.47,.85),z,rgb('#e8e2d0')); vessel(...at(.12,.18),z,'porter'); vessel(...at(.14,.8),z,'pewter'); cutlery(...at(.72,.9),z,ax); jug(...at(.95,.82),z,rgb('#7f9aa0')); },
  ][k];
  items();
}

/* ---------- piano ---------- */
const rosewood=(/** @type {string} */pl,/** @type {number} */v,/** @type {number} */kk)=>(/** @type {number} */x,/** @type {number} */y)=>{
  const [u,z]=fz(pl,v,x,y); return shadeC(K.rose,kk*(.8+.35*vn(u*1.1,z*3.4)+.12*Math.sin(z*2.6+vn(u,z)*4)));
};
function pianoDraw(){
  const [bi0,bj0,bi1,bj1]=PUB.piano.box, J0=bj0+.05, J1=bj1-.05, wall=bi0;
  contact(bi0,bj0,bi1,bj1,0,.55);
  const face=(/** @type {number} */I,/** @type {number} */j0,/** @type {number} */j1,/** @type {number} */z0,/** @type {number} */z1,/** @type {Function} */f)=>quad(I,j0,z0,I,j1,z0,I,j1,z1,I,j0,z1,f);
  const sideJ=(/** @type {number} */J,/** @type {number} */i0,/** @type {number} */i1,/** @type {number} */z0,/** @type {number} */z1,/** @type {Function} */f)=>quad(i0,J,z0,i1,J,z0,i1,J,z1,i0,J,z1,f);
  const top=(/** @type {number} */i0,/** @type {number} */i1,/** @type {number} */j0,/** @type {number} */j1,/** @type {number} */z,/** @type {Function} */f)=>quad(i0,j0,z,i1,j0,z,i1,j1,z,i0,j1,z,f);
  // lower cabinet
  const cabI=.66;
  face(cabI,bj0,bj1,0,7.6,(x,y)=>{ const [j,z]=onI(cabI,x,y), p=(j-bj0)/(bj1-bj0), inset=p>.08&&p<.92&&z>1.8&&z<7;
    const edge=inset&&(p<.14||p>.86||z<2.4||z>6.4); return shadeC(K.rose,(inset?(edge?1.25:.82):1)*(.8+.35*vn(j*1.4,z*3)+.1*Math.sin(z*2.5))); });
  sideJ(bj1,0,cabI,0,7.6,rosewood('j',bj1,.7));
  // pedals
  for(const j of [bj0+.5,bj1-.5]){ const [x,y]=bz(cabI+.02,j,1.2); px(x,y,K.brassL); px(x,y+1,K.brass); px(x+1,y+1,K.brassD); px(x-1,y+1,K.brass); }
  // keybed
  face(.8,bj0,bj1,7.1,8.1,rosewood('i',.8,1.05)); sideJ(bj1,0,.8,7.1,8.1,rosewood('j',bj1,.7));
  top(0,.8,bj0,bj1,7.1,rosewood('i',0,.5));
  // upper case
  const upI=.56;
  sideJ(bj1,0,upI,8.1,15.3,rosewood('j',bj1,.72));
  top(0,upI+.06,bj0-.05,bj1+.05,15.3,(x,y)=>{ const [i,j]=ground(x,y,15.3); return shadeC(K.rose,1.15+.25*vn(j*1.2,i*5)+(i>upI-.04?.2:0)); });
  face(upI+.06,bj0-.05,bj1+.05,15.3,15.7,rosewood('i',upI+.06,1.25));
  sideJ(bj1+.05,0,upI+.06,15.3,15.7,rosewood('j',bj1+.05,.8));
  top(0,upI+.06,bj0-.05,bj1+.05,15.7,()=>shadeC(K.rose,1.5));
  // front of the upper case: rosewood frame, fretwork on pleated silk
  face(upI,bj0,bj1,8.1,15.3,(x,y)=>{
    const [j,z]=onI(upI,x,y), u=(j-bj0)/(bj1-bj0), zz=z-8.1, inFrame=u<.08||u>.92||zz<1.1||zz>6.7;
    if(inFrame) return shadeC(K.rose,(u<.05||u>.95||zz<.4||zz>6.9?1.35:1)*(.82+.3*vn(j*1.2,z*3)));
    const pleat=.72+.35*Math.abs(Math.sin(j*28)), hi=zz>1.1&&zz<2.2?.6:1;
    const cx=(u-.5)*(bj1-bj0), cz=(zz-3.9);
    const lyre=Math.abs(Math.hypot(cx*3.4,cz*.52)-.9)<.14||(Math.abs(cx)<.035&&cz>-1.4&&cz<1.7)||(Math.hypot(cx*3,cz*.5)<.25);
    const lat=Math.abs(frac(u*7)-.5)<.07&&(zz>4.9||zz<2.8), lat2=Math.abs(frac(zz*.9)-.5)<.07&&(zz>4.9||zz<2.8);
    const scroll=Math.hypot(frac(u*4)-.5,(frac(zz*.55)-.5)*1.3)<.16&&(zz>5||zz<2.6);
    if(lyre||lat||lat2||scroll) return shadeC(K.rose,1.1+.25*vn(j*5,z*3));
    return shadeC(K.silk,pleat*hi);
  });
  // key cheeks
  for(const j of [bj0-.02,bj1-.14]){
    face(.8,j,j+.16,8.1,10.3,rosewood('i',.8,1.1)); sideJ(j+.16,upI,.8,8.1,10.3,rosewood('j',j,.7)); top(upI,.8,j,j+.16,10.3,()=>shadeC(K.rose,1.45));
    const [x,y]=bz(.8,j+.08,9.9); px(x,y,K.brass);
  }
  // keys
  const kj0=bj0+.14, kj1=bj1-.14, kz=8.1;
  top(upI,.8,kj0,kj1,kz,(x,y)=>{
    const [i,j]=ground(x,y,kz), n=(j-kj0)/(kj1-kj0)*12, w=Math.floor(n), f=frac(n);
    const blackAt=(/** @type {number} */b)=>[0,1,3,4,5,7,8,10].includes(b)&&Math.abs(n-(b+1))<.3&&i<upI+.13;
    for(let b=0;b<11;b++) if(blackAt(b)) return shadeC(rgb('#16120f'),1+.25*(i<upI+.04?1:0));
    if(f<.1) return rgb('#6a604c');
    return shadeC(K.ivory,.94+.12*hs(w*3+1)+(i>upI+.2?.08:0));
  });
  face(.8,kj0,kj1,7.6,8.1,(x,y)=>{ const [j]=onI(.8,x,y), f=frac((j-kj0)/(kj1-kj0)*12); return f<.1?rgb('#6a604c'):shadeC(K.ivory,.78); });
  // sheet music on the desk
  const [mj0,mj1,mz0,mz1]=[bj0+.34,bj1-.34,9.1,12.8];
  face(upI+.012,mj0,mj1,mz0,mz1,(x,y)=>{ const [j,z]=onI(upI+.012,x,y), l=frac(z*1.0), c=(z>12.1||z<9.5||j<mj0+.04||j>mj1-.04);
    if(c) return shadeC(K.paper,.95); return (z>10.1||z<11.4)&&l>.55&&l<.8?shadeC(rgb('#4a4238'),1):shadeC(K.paper,.92+.1*hs(Math.floor(j*14)+Math.floor(z))); });
  // brass candle sconces
  for(const j of [bj0+.2,bj1-.2]){
    thin(upI+.01,j,11.2,upI+.2,j,11.9,K.brassL); thin(upI+.2,j,11.9,upI+.24,j,11,K.brass); thin(upI+.01,j,11.2,upI+.24,j,11,K.brassD);
    const [dx,dy]=bz(upI+.24,j,10.9); rect(Math.round(dx)-2,Math.round(dy),4,1,K.brass); px(dx-1,dy+1,K.brassD); px(dx,dy+1,K.brassD);
    const [cx,cy]=bz(upI+.24,j,10.9); rect(Math.round(cx)-1,Math.round(cy)-5,2,5,K.cream); px(cx-.5,cy-6,K.flame); px(cx-.5,cy-7,K.flameO);
  }
  // ornaments on top: a vase of paper flowers and a framed print
  const [vx,vy]=bz(.22,bj0+.35,15.7); blob(vx,vy-3,2.6,3.2,rgb('#4b6f8c'),.2); rect(Math.round(vx)-1,Math.round(vy)-8,2,3,rgb('#4b6f8c'));
  for(const [dx,dy,c] of [[-2,-11,'#c4485a'],[0,-12,'#e8c25a'],[2,-10,'#c4485a'],[-1,-9,'#eaeadf']]) rect(Math.round(vx)+dx,Math.round(vy)+dy,2,2,rgb(c));
  const [fx,fy]=bz(.3,bj1-.45,15.7); rect(Math.round(fx)-3,Math.round(fy)-8,7,8,K.brass); rect(Math.round(fx)-2,Math.round(fy)-7,5,6,rgb('#3a3c35')); rect(Math.round(fx)-1,Math.round(fy)-6,3,3,rgb('#b8ab90'));
  void wall;
}
function pianoStool(){
  const {i,j,r}=PUB.pianoStool, z=4.3;
  contact(i-r,j-r,i+r,j+r,0,.6);
  const feet=[.4,2.5,4.6].sort((a,b)=>(Math.cos(a)+Math.sin(a))-(Math.cos(b)+Math.sin(b)));
  const wood=rgb('#3d2015');
  for(const a of feet) rod([i,j,1.8],[i+Math.cos(a)*r*1.35,j+Math.sin(a)*r*1.35,0],wood,shadeC(wood,1.6));
  cyl(i,j,.05,1.6,z-.8,(zz,s)=>shadeC(wood,roundLit(s)),null,.4);
  cyl(i,j,.07,2.4,3.3,(zz,s)=>shadeC(K.brass,roundLit(s)),null,.3);
  cyl(i,j,r,z-.8,z,(zz,s)=>shadeC(K.brass,.7+roundLit(s)*.6),null);
  cyl(i,j,r,z-.8,z+.3,(zz,s)=>zz<z-.4?shadeC(K.brass,.6+roundLit(s)*.6):shadeC(rgb('#6a1f2a'),roundLit(s)),(s,v)=>{ const x=isoX(i,j)+s*r*17, y=isoY(i,j,z+.3)+v*r*8.5, rr=Math.hypot(s,v);
    return shadeC(rgb('#7c2733'),.85+.35*N(x,y,.6)+.18*-v-(rr>.78&&rr<.86?.25:0)+(Math.abs(s)<.05&&Math.abs(v)<.05?.4:0)); },.04);
}

/* ---------- coat stand ---------- */
function coatStand(/** @type {number} */t){
  const {i,j}=PUB.coatStand, wood=rgb('#3a2214');
  contact(i-.25,j-.25,i+.25,j+.25,0,.62);
  const fi=[0.7,2.8,4.9];
  const feet=(/** @type {boolean} */frontSide)=>fi.filter(a=>(Math.cos(a)+Math.sin(a)>=0)===frontSide).forEach(a=>{
    const di=Math.cos(a), dj=Math.sin(a);
    rod([i+di*.04,j+dj*.04,2.1],[i+di*.18,j+dj*.18,.9],wood); rod([i+di*.18,j+dj*.18,.9],[i+di*.32,j+dj*.32,.05],wood);
  });
  feet(false);
  cyl(i,j,.06,.4,18,(zz,s)=>shadeC(wood,roundLit(s)*1.15+(s<-.2&&s>-.6?.15:0)),null);
  cyl(i,j,.13,1.6,3,(zz,s)=>shadeC(wood,roundLit(s)*1.1),(s,v)=>shadeC(wood,1.2+.2*-v),.3);
  cyl(i,j,.1,5.5,6.4,(zz,s)=>shadeC(wood,roundLit(s)),null,.5);
  cyl(i,j,.09,13,14,(zz,s)=>shadeC(wood,roundLit(s)),null,.5);
  cyl(i,j,.11,17.4,18.4,(zz,s)=>shadeC(K.brass,roundLit(s)),(s,v)=>shadeC(K.brassL,.9+.1*-v),.4);
  feet(true);
  // peg arms: two tiers, hooks curling up
  const arms=[[15.8,[.4,2.0,3.6,5.2]],[13,[1.2,2.8,4.4,6]]];
  const hook=(/** @type {number} */a,/** @type {number} */z)=>{ const di=Math.cos(a), dj=Math.sin(a);
    rod([i,j,z-.5],[i+di*.12,j+dj*.12,z-.7],wood); rod([i+di*.12,j+dj*.12,z-.7],[i+di*.27,j+dj*.27,z+.1],wood); rod([i+di*.27,j+dj*.27,z+.1],[i+di*.29,j+dj*.29,z+1.1],wood,K.brass); };
  const all=[];
  for(const [z,as] of arms) for(const a of as) all.push([a,z]);
  all.sort((p,q)=>(Math.cos(p[0])+Math.sin(p[0]))-(Math.cos(q[0])+Math.sin(q[0])));
  const behind=all.filter(h=>Math.cos(h[0])+Math.sin(h[0])<0), fronts=all.filter(h=>Math.cos(h[0])+Math.sin(h[0])>=0);
  behind.forEach(h=>hook(h[0],h[1]));
  // top hat on the back top hook (drawn behind the pole)
  { const [x,y]=bz(i-.2,j-.1,16.8);
    rect(Math.round(x)-4,Math.round(y)-2,9,1,rgb('#16171a')); rect(Math.round(x)-3,Math.round(y)-2,2,1,rgb('#3a3c40'));
    for(let yy=0;yy<8;yy++){ for(let xx=-2;xx<=2;xx++) px(x+xx,y-3-yy,shadeC(rgb('#18191c'),xx<=-1?1.9:xx<2?1:.8)); }
    px(x-1,y-6,rgb('#6a6e72')); px(x-1,y-8,rgb('#555a5e')); rect(Math.round(x)-2,Math.round(y)-4,5,1,rgb('#5a1d22')); }
  fronts.forEach(h=>hook(h[0],h[1]));
  // bowler on a front-right hook
  { const [x,y]=bz(i+.26,j-.1,16.8);
    disc(x,y-1,4.2,1.6,(u,v)=>shadeC(rgb('#26231f'),.9+.4*-v-.2*u)); blob(x,y-3.2,3,2.8,rgb('#2c2924'),.3); rect(Math.round(x)-3,Math.round(y)-3,6,1,rgb('#111110')); px(x-1,y-5,rgb('#6a655c')); }
  // heavy overcoat on a front-left hook
  { const [x,y]=bz(i-.02,j+.27,15.2), sway=Math.sin(t*.011)*.4;
    for(let r=0;r<26;r++){ const w=Math.round(r<3?3+r*1.2:r<18?7+Math.sin(r*.12)*.8:7.5-(r-18)*.1), yy=Math.round(y+r), cx=x+sway*r/26;
      for(let xx=-w;xx<=w;xx++){ const fold=Math.abs(Math.sin((xx+r*.08)*.9)), lit=xx<-w*.4?1.25:xx>w*.5?.7:1;
        px(cx+xx,yy,shadeC(rgb('#4c4a42'),lit*(.78+.2*fold+.22*N(cx+xx,yy,.6,3)))); }
      px(cx-w,yy,shadeC(rgb('#4c4a42'),.55)); px(cx+w,yy,shadeC(rgb('#4c4a42'),.5)); }
    rect(Math.round(x)-3,Math.round(y)+2,6,2,rgb('#2c2a24')); px(x-.5,y+6,K.brass); px(x-.5,y+10,K.brass); px(x-.5,y+14,K.brass);
    for(let xx=-6;xx<=6;xx++) px(x+xx+sway,y+26,rgb('#2a2822')); }
  // striped muffler on a front-right lower hook
  { const [x,y]=bz(i+.24,j+.05,12.9), sway=Math.sin(t*.013+2)*.5;
    for(let r=0;r<14;r++) for(let xx=0;xx<3;xx++){ const stripe=Math.floor(r/2)%2, c=stripe?rgb('#c9bf9a'):rgb('#9a2a30'); px(x+xx-1+sway*r/14,y+r,shadeC(c,xx===0?1.2:xx===2?.75:1)); }
    for(let xx=0;xx<3;xx++) px(x+xx-1+sway,y+14+(xx%2),rgb('#c9bf9a')); }
  // umbrella stand with umbrellas
  { const ui=i-.02, uj=j+.2, h=0;
    cyl(ui,uj,.15,0,5.2,(zz,s)=>shadeC(rgb('#2f4a3a'),roundLit(s)*(zz>4.4||zz<.7?1.25:1)+(s>-.6&&s<-.35?.2:0)),(s,v)=>Math.hypot(s,v)>.8?shadeC(K.brass,1.1):shadeC(rgb('#0f1110'),1),.06);
    const [x,y]=bz(ui,uj,5.2);
    for(let k=0;k<9;k++) px(x+1+k*.28,y-k*1.7,rgb('#16171a')),px(x+2+k*.28,y-k*1.7,rgb('#3a3c40'));
    for(let k=0;k<7;k++) px(x-2-k*.15,y-k*1.5-1,rgb('#2a2018')),px(x-1-k*.15,y-k*1.5-1,rgb('#5a4630'));
    px(x+3.5,y-15,K.brass); px(x+4,y-16,K.brass); px(x+5,y-16,K.brassD); px(x-3,y-11,rgb('#7a5630')); px(x-4,y-12,rgb('#7a5630')); px(x-5,y-12,rgb('#4a3a28'));
    void h; }
}

/* ---------- exports ---------- */
/** Static wall-bound furniture baked once (the piano). */
export function pubTablesStatic(){ begin(); pianoDraw(); }
/** Free-standing furniture in depth order. @returns {{box:number[],draw:()=>void}[]} */
export function pubTablesProps(/** @type {number} */t){
  /** @type {{box:number[],draw:()=>void}[]} */
  const L=[], run=(/** @type {()=>void} */f)=>()=>{ begin(); f(); };
  PUB.standing.forEach((s,k)=>{ L.push({box:[s.i-s.r,s.j-s.r,s.i+s.r,s.j+s.r],draw:run(()=>standing(s,k,t))}); });
  L.push({box:PUB.banquette.leg,draw:run(banquetteLeg)});
  L.push({box:PUB.banquette.box,draw:run(banquette)});
  PUB.dining.forEach((d,k)=>{
    const [i0,j0,i1,j1]=d.box, ax=d.axis, cfg=DINE[k];
    L.push({box:d.box,draw:run(()=>diningTable(d,k,t))});
    L.push({box:[i0,j0-.55,i1,j0],draw:run(()=>chairRow(d.box,cfg.chairs,k*2))});
  });
  L.push({box:[PUB.pianoStool.i-PUB.pianoStool.r,PUB.pianoStool.j-PUB.pianoStool.r,PUB.pianoStool.i+PUB.pianoStool.r,PUB.pianoStool.j+PUB.pianoStool.r],draw:run(pianoStool)});
  const c=PUB.coatStand; L.push({box:[c.i-.12,c.j-.12,c.i+.12,c.j+.12],draw:run(()=>coatStand(t))});
  return L;
}
