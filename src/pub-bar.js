// Pub interior bar: the L-shaped counter, beer engines, mirrored back bar, bar stools, spittoons and the staircase.
// Layout: src/pub-layout.js. Static parts are baked once (screen coordinates are stable there); props are drawn every frame,
// so every texture below is taken from world coordinates (i, j, z), never from raw screen x, y.
import { quad, isoX, isoY, shadeC } from './gym.js';
import { rgb, state as appearanceState } from './appearance.js';
import { state as rendererState, line } from './renderer.js';
import { mix } from './cast.js';
import { PUB } from './pub-layout.js';
import { contact, vn } from './thames-port.js';

/* ---------------------------------------------------------------- camera-aware drawing helpers */
const K={x0:0,y0:0,ix:18,jx:-18,iy:9,jy:9,z:3,det:1};
/** Read the active camera: screen origin of the world and the pixel size of one i, j and z step. */
function cam(){
  K.x0=isoX(0,0); K.y0=isoY(0,0,0); K.ix=isoX(1,0)-K.x0; K.jx=isoX(0,1)-K.x0; K.iy=isoY(1,0,0)-K.y0; K.jy=isoY(0,1,0)-K.y0; K.z=K.y0-isoY(0,0,1);
  K.det=K.ix*K.jy-K.jx*K.iy;
}
/** Fill a rectangle on the vertical plane j=J (faces +j); fn(i,z) gives the colour or 0. */
function faceJ(/** @type {number} */J,/** @type {number} */i0,/** @type {number} */z0,/** @type {number} */i1,/** @type {number} */z1,/** @type {(i:number,z:number)=>number} */fn){
  quad(i0,J,z0,i1,J,z0,i1,J,z1,i0,J,z1,(x,y)=>{ const i=(x+.5-K.x0-J*K.jx)/K.ix; return fn(i,(K.y0+i*K.iy+J*K.jy-y-.5)/K.z); });
}
/** Fill a rectangle on the vertical plane i=I (faces +i); fn(j,z). */
function faceI(/** @type {number} */I,/** @type {number} */j0,/** @type {number} */z0,/** @type {number} */j1,/** @type {number} */z1,/** @type {(j:number,z:number)=>number} */fn){
  quad(I,j0,z0,I,j1,z0,I,j1,z1,I,j0,z1,(x,y)=>{ const j=(x+.5-K.x0-I*K.ix)/K.jx; return fn(j,(K.y0+I*K.iy+j*K.jy-y-.5)/K.z); });
}
/** Fill a rectangle on the horizontal plane z; fn(i,j). */
function topZ(/** @type {number} */z,/** @type {number} */i0,/** @type {number} */j0,/** @type {number} */i1,/** @type {number} */j1,/** @type {(i:number,j:number,x:number)=>number} */fn){
  quad(i0,j0,z,i1,j0,z,i1,j1,z,i0,j1,z,(x,y)=>{
    const dx=x+.5-K.x0, dy=y+.5-K.y0+z*K.z;
    return fn((dx*K.jy-K.jx*dy)/K.det,(K.ix*dy-K.iy*dx)/K.det,x);
  });
}
function px(/** @type {number} */x,/** @type {number} */y,/** @type {number} */c){
  const W=appearanceState.W, H=appearanceState.H; x=Math.floor(x); y=Math.floor(y);
  if(x>=0&&y>=0&&x<W&&y<H) rendererState.fb[y*W+x]=c;
}
/** A few-pixel-thick rod; cols run from the lit left edge to the shadowed right edge. */
function rod(/** @type {number} */i0,/** @type {number} */j0,/** @type {number} */z0,/** @type {number} */i1,/** @type {number} */j1,/** @type {number} */z1,/** @type {number[]} */cols){
  const x0=isoX(i0,j0), y0=isoY(i0,j0,z0), x1=isoX(i1,j1), y1=isoY(i1,j1,z1), steep=Math.abs(y1-y0)>Math.abs(x1-x0);
  cols.forEach((c,k)=>{ const o=k-(cols.length-1)/2; steep?line(x0+o,y0,x1+o,y1,c,c):line(x0,y0+o,x1,y1+o,c,c); });
}
/** Turned upright piece of radius rf(h) (ground units) at height h above z0; cf(h,s) colours it, s=-1..1 across. */
function lathe(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z0,/** @type {number} */z1,/** @type {(h:number)=>number} */rf,/** @type {(h:number,s:number)=>number} */cf){
  const cx=isoX(i,j), yb=isoY(i,j,z0), yt=isoY(i,j,z1), R=Math.hypot(K.ix,K.jx), W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb;
  for(let y=Math.max(0,Math.floor(yt));y<=Math.min(H-1,Math.ceil(yb));y++){
    const h=(yb-y-.5)/K.z; if(h<0||h>z1-z0) continue;
    const rx=Math.max(rf(h)*R,.6);
    for(let x=Math.max(0,Math.ceil(cx-rx-.5));x<=Math.min(W-1,Math.floor(cx+rx-.5));x++){ const c=cf(h,Math.max(-1,Math.min(1,(x+.5-cx)/rx))); if(c) fb[y*W+x]=c; }
  }
}
/** Flat elliptical disc on the horizontal plane z (tops of pots and glasses). */
function disc(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,/** @type {number} */r,/** @type {(a:number,b:number)=>number} */fn){
  topZ(z,i-r,j-r,i+r,j+r,(a,b)=>{ const d=((a-i)*(a-i)+(b-j)*(b-j))/(r*r); return d<=1?fn((a-i)/r,(b-j)/r):0; });
}
const lit=(/** @type {number} */s)=>.68+.5*Math.max(0,1-(s+.3)*(s+.3))-.18*Math.max(0,s);

/* ---------------------------------------------------------------- materials */
const MAH=[rgb('#2f150c'),rgb('#4a2113'),rgb('#69321a'),rgb('#8a4a26')];
/** Polished mahogany: grain runs along u, with per-board tone and long soft streaks. */
function mahog(/** @type {number} */u,/** @type {number} */v,k=1){
  const g=.55*vn(u*.45,v*3.2)+.45*vn(u*1.1+9,v*10)+.25*(vn(u*.1+3,v*.7)-.5), t=Math.max(0,Math.min(1,g*1.1-.1));
  const c=t<.5?mix(MAH[0],MAH[1],t*2):t<.8?mix(MAH[1],MAH[2],(t-.5)/.3):mix(MAH[2],MAH[3],(t-.8)/.2);
  return shadeC(c,k);
}
const BR={d:rgb('#5e4416'),m:rgb('#a6812e'),l:rgb('#d9b954'),h:rgb('#f6e59a')};
/** Brass across a round section. */
function brass(/** @type {number} */s,k=1){ const c=Math.abs(s+.38)<.14?BR.h:Math.abs(s+.2)<.4?BR.l:s>.55?BR.d:BR.m; return shadeC(c,k*(.82+.2*lit(s))); }
const GILT=rgb('#d3ae55'), GILTD=rgb('#7e6228'), PEWT=rgb('#8e9694'), CREAM=rgb('#e3d8bb');

/** A raised-and-fielded panel: frame, bevelled mould and a recessed field. Coordinates a (along), b (up), u/v grain coords. */
function fielded(a,b,a0,b0,a1,b1,fa,fb,u,v,k=1){
  const dl=(a-a0)/fa, dr=(a1-a)/fa, dd=(b-b0)/fb, dt=(b1-b)/fb, e=Math.min(dl,dr,dd,dt);
  const litSide=e===dl||e===dt;
  if(e<.3) return mahog(u,v,k*(litSide?1.45:.55));
  if(e<1) return mahog(u,v,k);
  if(e<1.3) return mahog(u,v,k*(litSide?.5:1.35));
  return mahog(u+3,v,k*.8);
}
const FONT={V:'101101101101010',W:'101101111111101',A:'010101111101101',P:'110101110100100',I:'111010010010111',N:'101111111101101',G:'011100101101011',H:'101101111101101',R:'110101110101101',F:'111100110100100',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',K:'101101110101101',L:'100100100100111',M:'101111111101101',O:'010101101101010',S:'011100010001110',T:'111010010010010',U:'101101101101111',Y:'101101010010010','&':'010101010101011',' ':'000000000000000'};
/** Lettering on a +j face, running along i (down-right on screen); s = pixel size, returns the width in px. */
function textJ(J,i,z,str,col,s=1){
  const x=isoX(i,J), y=isoY(i,J,z);
  for(let n=0;n<str.length;n++){ const g=FONT[str[n]]; if(!g) continue;
    for(let p=0;p<15;p++) if(g[p]==='1'){
      const fx=(n*4+p%3)*s, fy=Math.floor(p/3)*s+fx*.5;
      for(let a=Math.floor(fx);a<Math.floor(fx+s);a++) for(let b=Math.floor(fy);b<Math.floor(fy+s);b++) px(x+a,y+b,col);
    } }
}

/* ---------------------------------------------------------------- bottles and glass */
const BOTTLES={
  wine:{c:rgb('#1d4a2b'),H:4.2,r:h=>h<2.2?.074:h<2.9?.074-.044*((h-2.2)/.7):.03,cap:rgb('#5a1a18'),lab:null},
  stout:{c:rgb('#3a2210'),H:3.5,r:h=>h<2.0?.078:h<2.6?.078-.046*((h-2.0)/.6):.032,cap:rgb('#c9b27a'),lab:CREAM},
  gin:{c:rgb('#a9c4bd'),H:3.9,r:h=>h<2.5?.082:h<3.0?.082-.048*((h-2.5)/.5):.034,cap:rgb('#bca169'),lab:rgb('#cdbf93')},
  brandy:{c:rgb('#a6621a'),H:3.7,r:h=>h<2.1?.09:h<2.7?.09-.058*((h-2.1)/.6):.032,cap:rgb('#2a1a10'),lab:rgb('#d8c79a')},
  stone:{c:rgb('#a98f62'),H:3.1,r:h=>h<1.8?.085:h<2.4?.085-.045*((h-1.8)/.6):.04,cap:rgb('#6a5236'),lab:null},
  decanter:{c:rgb('#b7d2cb'),H:4.4,r:h=>h<2.3?.1:h<2.9?.1-.07*((h-2.3)/.6):h<3.7?.03:.05,cap:rgb('#cfe4dd'),lab:null},
};
function bottle(i,j,z,kind){
  const B=BOTTLES[kind];
  lathe(i,j,z,z+B.H,B.r,(h,s)=>{
    if(h>B.H-.5) return shadeC(B.cap,lit(s));
    if(B.lab&&h>.9&&h<1.7) return shadeC(B.lab,lit(s)*.95);
    if(h<.12) return shadeC(B.c,.5);
    let c=shadeC(B.c,lit(s)*(.85+.15*Math.sin(h*.9)));
    if(s>-.55&&s<-.3&&h>.3&&h<B.H*.72&&B.r(h)>.05) c=mix(c,rgb('#f2f0e4'),.38);
    return c;
  });
}
/** A stemmed rummer glass with a little spirit in it. */
function rummer(i,j,z){
  const glass=rgb('#b9d1ca');
  lathe(i,j,z,z+2.6,h=>h<.18?.085:h<1.0?.022:.03+.075*Math.sin(Math.min(1,(h-1.0)/1.0)*1.35),(h,s)=>{
    if(h>1.0&&h<1.0+.8&&Math.abs(s)<.82) return shadeC(rgb('#b4741f'),lit(s)*1.05);
    return mix(shadeC(glass,lit(s)),rgb('#f4f4ea'),Math.abs(s+.45)<.18?.5:0);
  });
}
/** Pewter tankard with a loop handle. */
function tankard(i,j,z){
  lathe(i,j,z,z+2.1,h=>.125+.025*(1-h/2.1),(h,s)=>{
    if(h>1.75&&h<1.95||h<.18) return shadeC(PEWT,lit(s)*1.15);
    return shadeC(PEWT,lit(s)*(.9+.14*Math.sin(h*7)*0));
  });
  const hc=[shadeC(PEWT,1.2),shadeC(PEWT,.8)];
  rod(i+.14,j,z+1.75,i+.27,j,z+1.5,hc); rod(i+.27,j,z+1.5,i+.28,j,z+.7,hc); rod(i+.28,j,z+.7,i+.15,j,z+.35,hc);
  disc(i,j,z+2.1,.125,(a,b)=>mix(rgb('#34383a'),rgb('#d7c392'),Math.max(0,.4-Math.hypot(a,b)*.4)));
}
/** A pint of ale (full) or the dregs (half). */
function pint(i,j,z,full){
  const H=2.3, ale=rgb('#a95f17');
  lathe(i,j,z,z+H,h=>.1+.03*h/H,(h,s)=>{
    if(h<.14) return shadeC(rgb('#cfd8d2'),lit(s));
    const top=full?H-.02:1.0;
    if(h>top){ if(full) return 0; return Math.abs(s)>.72?mix(rgb('#aab9b3'),rgb('#f0f0e6'),.3):0; }
    if(full&&h>H-.4) return shadeC(rgb('#efe3c3'),lit(s)*.95);
    let c=shadeC(ale,lit(s)*(1.15-.25*h/H));
    if(Math.abs(s)>.8) c=mix(c,rgb('#c4d0ca'),.45);
    if(s>-.55&&s<-.32) c=mix(c,rgb('#fff1c8'),.35);
    return c;
  });
  if(full) disc(i,j,z+H,.13,(a,b)=>mix(rgb('#efe3c3'),rgb('#b99d63'),Math.min(1,Math.hypot(a,b)*.5)));
}

/* ---------------------------------------------------------------- counter */
const CB=PUB.counter.box, RB=PUB.ret.box;
const DX=CB[0]-4.0;   // the counter was first drawn at i=4.0; hand-placed items below move with it
const PIL=[0,1,2,3,4,5,6].map(m=>CB[0]+.1+(CB[2]-CB[0]-.2)/6*m);   // carved pilaster centres along the counter front

/** Polished top: grain along the long axis, a sheen band by the customer edge and lamp highlights. */
function counterTop(/** @type {number[]} */b,/** @type {boolean} */alongI){
  const [i0,j0,i1,j1]=b;
  topZ(10,i0,j0,i1,j1,(i,j)=>{
    const u=alongI?i:j, v=alongI?j:i;
    let k=1.15, c=mahog(u,v*1.3,k);
    if(alongI){
      const sheen=Math.exp(-Math.pow((j-(j1-.28))/.13,2))*.4;
      let lamp=0; for(const li of [5.5+DX,7.7+DX,9.9+DX]) lamp+=.55*Math.exp(-Math.pow((i-li)/.6,2)-Math.pow((j-(j1-.5))/.17,2));
      c=mix(c,rgb('#ffd8a0'),Math.min(.7,sheen+lamp));
      if(j>j1-.07) c=mix(c,rgb('#d89a62'),.55);             // bevelled front edge catching the light
      else if(j<j0+.07) c=shadeC(c,.7);
      if(i>i1-.06) c=mix(c,rgb('#d89a62'),.4);
    } else {
      c=mix(c,rgb('#ffd8a0'),Math.exp(-Math.pow((j-1.6)/.6,2)-Math.pow((i-(i0+.35))/.18,2))*.45);
      if(i>i1-.07) c=mix(c,rgb('#d89a62'),.5);
    }
    return c;
  });
}
/** Front of the long arm: plinth, fielded panels, carved pilasters, corbel brackets and the overhanging top's edge. */
function counterFront(){
  const [i0,j0,i1,j1]=CB, J=j1-.08;
  faceJ(J,i0,0,i1,9.3,(i,z)=>{
    const sh=(z>7?.8+.2*(9.3-z)/2.3:1)*1.18;
    let best=0,bd=9; for(const c of PIL){ const d=Math.abs(i-c); if(d<bd){ bd=d; best=c; } }
    if(z<1.05){ const c=mahog(i,z*.8,.7); return z>.88?shadeC(mahog(i,z,1.3),1):c; }
    if(z>6.6&&z<8.0){ const hw=.11+.1*Math.pow((z-6.6)/1.4,1.5);
      if(bd<hw){ const e=(hw-bd)/hw, side=(i-best)<0; if(e<.2||z<6.8) return mahog(i,z,.45); if(bd<.03&&z>7.1&&z<7.4) return mahog(i,z,1.6); return mahog(i+z,z,sh*(side?1.35:.9)); } }
    if(z>8.0){ // frieze: dentils under the top moulding
      if(z>8.75) return mahog(i,z,z>9.1?1.4:.8);
      return (Math.floor((i-i0)*10)%2===0)?mahog(i,z,1.2*sh):mahog(i,z,.45);
    }
    if(bd<.115&&z>1.05){ const u=(i-best)/.115;
      if(Math.abs(u)>.85) return mahog(i,z,u<0?1.4:.5);
      if(Math.abs(u+.38)<.07||Math.abs(u-.34)<.07) return mahog(i,z,.4);
      if(z<2.0) return mahog(i,z,1.2*sh);
      if(z>7.3&&z<7.9) return mahog(i,z,1.1*sh);
      return mahog(i*.2,z*.2+3,(1.05-.35*Math.max(0,u))*sh);
    }
    // bays between the pilasters
    const m=Math.max(0,Math.min(5,Math.floor((i-i0-.1)/((i1-i0-.2)/6))));
    const a0=PIL[m]+.15, a1=PIL[m+1]-.15;
    if(i>=a0&&i<=a1&&z>1.5&&z<7.4) return fielded(i,z,a0,1.5,a1,7.4,.14,.75,i,z,sh);
    return mahog(i,z,.45);
  });
  // the top's overhanging edge
  faceJ(j1,i0,9.3,i1,10,(i,z)=>{ if(z<9.42) return mahog(i,z,.4); if(z>9.86) return mix(mahog(i,z,1.3),rgb('#f0b57a'),.5); return mahog(i,z*1.5,1.25); });
}
function counterEnd(){
  const [i0,j0,i1,j1]=CB, I=i1;
  faceI(I,j0,0,j1,9.3,(j,z)=>{
    const k=.72;
    if(z<1.05) return mahog(j,z*.8,.42);
    if(z>8.0) return z>8.75?mahog(j,z,z>9.1?1.05:.6):mahog(j,z,.4);
    if(j>j1-.2||j<j0+.04) return mahog(j,z,k*(j>j1-.2?1.1:.5));
    return fielded(j,z,j0+.1,1.5,j1-.26,7.4,.12,.75,j,z,k);
  });
  faceI(I,j0,9.3,j1,10,(j,z)=>z<9.42?mahog(j,z,.35):z>9.86?mix(mahog(j,z,1),rgb('#d89a62'),.4):mahog(j,z*1.5,.95));
}
/** Brass foot rail on floor posts, along the customer face. */
function footRail(){
  const [i0,,i1,j1]=CB, jr=j1+.07, zr=1.55;
  const cols=[rgb('#f1dd8c'),BR.l,BR.m,BR.d];
  for(const c of PIL){
    rod(c,j1-.05,zr,c,jr,zr,[BR.m,BR.d]);                                   // bracket arm from the plinth
    rod(c,jr,.2,c,jr,zr,[BR.l,BR.m,BR.d]);                                  // post
    lathe(c,jr,0,.3,h=>.1-.04*h/.3,(h,s)=>brass(s,.9));                     // foot flange
  }
  rod(i0+.02,jr,zr,i1,jr,zr,cols);
  rod(i1,jr,zr,i1,j1-.05,zr,cols);                                          // the rail turns into the end
  lathe(i1,jr,zr-.35,zr+.35,h=>.07,(h,s)=>brass(s));
}
/** Beer engine: brass plate, five tall hand pulls with porcelain handles, drip tray. */
function beerEngine(){
  const clips=[rgb('#a82a24'),rgb('#2c4f86'),rgb('#2f6a3a'),rgb('#c49a2c'),rgb('#6a2a6a')];
  const pj=2.72, i0=5.3+DX, i1=8.1+DX;
  // plate
  topZ(10.75,i0,pj-.2,i1,pj+.2,(i,j)=>{ const e=Math.min(i-i0,i1-i,j-(pj-.2),pj+.2-j); return e<.03?BR.h:shadeC(BR.m,.95+.2*vn(i*2,j*9)+(j<pj?.1:0)); });
  faceJ(pj+.2,i0,10,i1,10.75,(i,z)=>z>10.6?BR.h:shadeC(BR.m,.85+.2*(z-10)/.75+.15*vn(i*3,z)));
  faceI(i1,pj-.2,10,pj+.2,10.75,()=>BR.d);
  for(let m=0;m<5;m++){
    const i=5.6+DX+.55*m;
    lathe(i,pj,10.75,11.4,h=>.115-.03*h/.65,(h,s)=>brass(s));
    lathe(i,pj,11.4,15.1,h=>.062,(h,s)=>brass(s));
    lathe(i,pj,12.9,13.3,h=>.095,(h,s)=>brass(s,1.05));
    lathe(i,pj,14.1,14.4,h=>.085,(h,s)=>brass(s,1.05));
    lathe(i,pj,15.1,15.8,h=>.06+.02*h/.7,(h,s)=>brass(s));
    // swan-neck nozzle
    rod(i,pj+.02,12.4,i,pj+.2,12.1,[BR.l,BR.m]); rod(i,pj+.2,12.1,i,pj+.26,10.9,[BR.l,BR.m]);
    const clip=clips[m];
    lathe(i,pj,15.8,21.6,h=>{ const t=h/5.8; return t<.42?.062+.04*Math.pow(t/.42,.7):t<.93?.102-.032*((t-.42)/.51):.07*Math.sqrt(Math.max(0,1-Math.pow((t-.93)/.07,2))); },(h,s)=>{
      const t=h/5.8, l=lit(s);
      if(t>.5&&t<.86){ if(t<.53||t>.83) return shadeC(GILT,l); return shadeC(clip,l*1.05); }
      return mix(shadeC(CREAM,l),rgb('#ffffff'),Math.abs(s+.4)<.12?.5:0);
    });
  }
}
function drainTray(){
  const i0=5.3+DX,i1=8.1+DX,j0=3.0,j1=3.16;
  topZ(10.03,i0,j0,i1,j1,(i,j)=>{ const e=Math.min(i-i0,i1-i,j-j0,j1-j);
    if(e<.035) return BR.l;
    return (Math.floor(i*14)%2===0)?shadeC(BR.d,.55):shadeC(BR.m,.9+.2*vn(i*3,j*5)); });
}
/** Folded bar cloth with blue stripes. */
function barCloth(i0,j0,i1,j1){
  topZ(10.04,i0,j0,i1,j1,(i,j)=>{
    const fold=Math.sin((i-i0)*13)*.06+vn(i*4,j*4)*.1;
    let c=shadeC(rgb('#d9d4c2'),.92+fold);
    const v=(j-j0)/(j1-j0); if(Math.abs(v-.22)<.05||Math.abs(v-.78)<.05) c=shadeC(rgb('#3c5a8a'),.9+fold);
    if(Math.abs((i-i0)-(i1-i0)*.5)<.012) c=shadeC(c,.7);
    return c;
  });
  topZ(10.04,i0,j1-.03,i1,j1,()=>rgb('#8d8878'));
}
function pickledEggs(i,j){
  lathe(i,j,10,13.1,h=>.15-.01*Math.pow(h/3.1,4),(h,s)=>{
    if(h>2.75) return mix(shadeC(BR.m,lit(s)),BR.h,Math.abs(s+.4)<.15?.5:0);
    const egg=vn(i*30+h*3.1,h*4+s*3);
    let c=egg>.5?shadeC(rgb('#e3cfa4'),lit(s)*(.8+.3*egg)):shadeC(rgb('#a56a50'),lit(s)*.85);
    if(s<-.7||s>.8) c=mix(c,rgb('#b5ccc4'),.5);
    return c;
  });
}
function flapAndHinges(){
  const fi=CB[2]-.65;
  topZ(10.05,fi-.02,CB[1],fi+.02,CB[3],()=>rgb('#1a0b06'));
  for(const j of [2.55,3.0]) topZ(10.06,fi-.1,j-.03,fi+.1,j+.03,(i,j2)=>(i-fi)>-.05?BR.l:BR.m);
  topZ(10.06,CB[2]-.32,3.0,CB[2]-.18,3.1,(i,j)=>Math.hypot((i-CB[2]+.25)*2,(j-3.05)*3)<.12?BR.h:BR.l);
  faceI(CB[2],2.4,9.3,3.2,10,(j,z)=>Math.abs(j-2.58)<.03?rgb('#1a0b06'):0);
}
function drawCounter(){
  cam();
  contact(CB[0],j1(CB)-.1,CB[2],CB[3]+.1,0,.5);
  counterFront(); counterEnd(); footRail(); counterTop(CB,true); flapAndHinges();
  drainTray(); beerEngine();
  // things on the counter, back to front
  pickledEggs(8.55+DX,2.58);
  tankard(8.85+DX,2.7,10); tankard(9.28+DX,2.86,10);
  pint(9.7+DX,3.0,10,true); pint(5.0+DX,2.95,10,false);
  barCloth(4.3+DX,2.5,4.85+DX,2.95);
  rummer(CB[2]-.4,2.6,10);
}
function j1(/** @type {number[]} */b){ return b[1]; }
function drawReturn(){
  cam();
  const [i0,j0,i1,j1]=RB;
  faceI(i1,j0,0,j1,9.3,(j,z)=>{
    const k=.7;
    if(z<1.05) return mahog(j,z*.8,.4);
    if(z>8.6) return mahog(j,z,z>9.1?1.0:.55);
    const n=2, w=(j1-j0)/n, m=Math.min(n-1,Math.floor((j-j0)/w)), a0=j0+m*w+.1, a1=j0+(m+1)*w-.1;
    if(j>=a0&&j<=a1&&z>1.5&&z<8.0) return fielded(j,z,a0,1.5,a1,8.0,.12,.7,j,z,k);
    return mahog(j,z,.4);
  });
  faceI(i1,j0,9.3,j1,10,(j,z)=>z<9.42?mahog(j,z,.35):z>9.86?mix(mahog(j,z,1),rgb('#d89a62'),.4):mahog(j,z*1.5,.95));
  topZ(10,i0,j0,i1,j1,(i,j)=>{
    let c=mahog(j,i*1.3,1.15);
    c=mix(c,rgb('#ffd8a0'),Math.exp(-Math.pow((i-RB[0]-.5)/.22,2)-Math.pow((j-1.5)/.55,2))*.5);
    if(i>i1-.07) c=mix(c,rgb('#d89a62'),.5); if(j<j0+.06) c=mix(c,rgb('#d89a62'),.4);
    return c;
  });
  // brass edging on the front of the end and a lamp-lit pewter jug
  topZ(10.02,i1-.05,j0+.03,i1,j1-.02,()=>BR.l);
  lathe(RB[0]+.4,1.2,10,12.2,h=>h<1.5?.13-.03*Math.pow(1-h/1.5,2)+.02*Math.sin(h*3):.1+.04*(h-1.5)/.7*0,(h,s)=>shadeC(PEWT,lit(s)*1.1));
  rod(RB[0]+.58,1.2,11.9,RB[0]+.66,1.2,11.2,[shadeC(PEWT,1.2),shadeC(PEWT,.7)]); rod(RB[0]+.66,1.2,11.2,RB[0]+.55,1.2,10.5,[shadeC(PEWT,1.2),shadeC(PEWT,.7)]);
  pint(RB[0]+.45,1.75,10,true);
}

/* ---------------------------------------------------------------- stools and spittoons */
function drawStool(/** @type {number} */i,/** @type {number} */j){
  cam();
  contact(i-.3,j-.25,i+.3,j+.25,0,.5);
  const legs=[225,315,135,45].map(a=>a*Math.PI/180);
  const leg=(/** @type {number} */a)=>{
    const ca=Math.cos(a), sa=Math.sin(a), top=[i+.16*ca,j+.16*sa,6.2], bot=[i+.34*ca,j+.34*sa,.05];
    const side=ca-sa<0?0:1;   // legs on the left of the screen catch the light
    const c=[shadeC(rgb('#8a4a26'),side?.8:1.15),shadeC(rgb('#4a2113'),side?.8:1.05)];
    rod(top[0],top[1],top[2],bot[0],bot[1],bot[2],c);
    // turned knop on the leg and a pad at the foot
    const f=.55, ki=top[0]+(bot[0]-top[0])*f, kj=top[1]+(bot[1]-top[1])*f, kz=6.2-6.15*f;
    lathe(ki,kj,kz-.4,kz+.4,h=>.07*Math.sin(h/.8*Math.PI)+.015,(h,s)=>shadeC(rgb('#6a361b'),lit(s)));
    lathe(bot[0],bot[1],0,.35,h=>.075,(h,s)=>shadeC(BR.m,lit(s)*.95));
  };
  leg(legs[0]); leg(legs[1]);
  // foot ring
  const ring=[BR.l,BR.m];
  for(let n=0;n<28;n++){ const a=n/28*Math.PI*2, b=(n+1)/28*Math.PI*2, r=.255;
    const s=Math.sin(a+.8);   // lit towards the upper left
    rod(i+r*Math.cos(a),j+r*Math.sin(a),2.35,i+r*Math.cos(b),j+r*Math.sin(b),2.35,[s>0?ring[1]:ring[0]]); }
  leg(legs[2]); leg(legs[3]);
  // seat: turned wooden rim under a buttoned leather cushion
  const bi=i,bj=j;
  lathe(bi,bj,6.1,6.65,h=>.235+.03*Math.sin(h/.55*Math.PI)*0+.02,(h,s)=>h>.35?shadeC(rgb('#8a4a26'),lit(s)*1.15):shadeC(rgb('#4a2113'),lit(s)));
  lathe(bi,bj,6.65,7.2,h=>.285*Math.sqrt(Math.max(0,1-Math.pow((h-.1)/.6,3)))+.0,(h,s)=>{
    if(h<.14) return shadeC(BR.m,lit(s));       // brass stud line round the edge
    return shadeC(rgb('#5b241c'),lit(s)*1.15);
  });
  disc(bi,bj,7.2,.26,(a,b)=>{
    const d=Math.hypot(a,b);
    let c=shadeC(rgb('#6d2c22'),1.05+.3*(-a*.5-b*.5)*(1-d)+.12*Math.cos(d*9));
    if(d>.86&&d<.95) c=shadeC(BR.m,.9);
    if(d<.09) c=shadeC(rgb('#2d100c'),1);
    return c;
  });
}
function drawSpittoon(/** @type {number} */i,/** @type {number} */j){
  cam();
  contact(i-.16,j-.14,i+.16,j+.14,0,.45);
  lathe(i,j,0,3.1,h=>h<.45?.17-.02*h/.45:h<1.2?.15-.03*((h-.45)/.75)+0:h<2.2?.12+.07*Math.sin((h-1.2)/1.0*Math.PI/2):h<2.8?.19-.0:.19+.03*((h-2.8)/.3),(h,s)=>{
    if(h>2.7) return brass(s,1.15);
    if(h<.12) return brass(s,.7);
    if(Math.abs(h-1.15)<.07) return brass(s,.7);
    return brass(s,1.0);
  });
  disc(i,j,3.1,.2,(a,b)=>{ const d=Math.hypot(a,b); return d>.78?BR.h:d>.62?BR.m:mix(rgb('#1a120a'),rgb('#6a5a3a'),Math.max(0,.3-d*.3)); });
}

/* ---------------------------------------------------------------- back bar (static) */
const BB=PUB.backbar.box;
function mirrorPanel(/** @type {number} */i0,/** @type {number} */z0,/** @type {number} */i1,/** @type {number} */z1,/** @type {string} */word,/** @type {number} */ws){
  const J=.34;
  faceJ(J,i0,z0,i1,z1,(i,z)=>{
    const e=Math.min(i-i0,i1-i,(z-z0)/3.5,(z1-z)/3.5);
    if(e<.035) return e<.018?mix(GILT,GILTD,.2):GILTD;
    if(e<.07) return z>(z0+z1)/2||i<(i0+i1)/2?rgb('#a9c4bb'):rgb('#35504b');   // bevelled glass edge
    // silvered glass: dark teal-bronze, a soft diagonal glare, warm reflections of the lamps
    const g=(i-i0)*.9+(z-z0)*.12, band=Math.exp(-Math.pow((g-1.0)/.25,2))*.35+Math.exp(-Math.pow((g-1.9)/.1,2))*.2;
    let c=mix(rgb('#1b2a2b'),rgb('#3c5a57'),.25+.55*vn(i*1.1,z*.35)+.1);
    c=mix(c,rgb('#b5cdc4'),band);
    c=mix(c,rgb('#d99a4a'),Math.max(0,vn(i*1.5+7,z*.5+2)-.62)*.9);
    return c;
  });
  if(word){ const w=word.length*4*ws-ws; textJ(J,(i0+i1)/2-w/36-.0,z1-.55,word,rgb('#e7d08a'),ws); }
}
/** Lying spirit cask: round painted head with brass hoops, a tap and its name. */
function cask(i,z,Ri,Rz,name,tint){
  const J=BB[3]-.05, L=.4;
  const head=(/** @type {number} */jj,/** @type {(a:number,b:number)=>number} */fn)=>faceJ(jj,i-Ri-.02,z-Rz-.1,i+Ri+.02,z+Rz+.1,(a,b)=>{ const u=(a-i)/Ri, v=(b-z)/Rz; return u*u+v*v<=1?fn(u,v):0; });
  // body swept back from the head, with hoops
  for(let n=14;n>=1;n--){ const jj=J-L*n/14;
    head(jj,(u,v)=>{ const ring=n===3||n===11; return ring?shadeC(BR.m,.8+.3*(1-Math.abs(v))):shadeC(tint,(.55+.5*(1-(v+.4)*(v+.4)))*(.85+.2*vn(u*3+n*.3,v*.5))); });
  }
  head(J,(u,v)=>{
    const d=Math.hypot(u,v);
    if(d>.9) return shadeC(BR.m,.9+.3*(1-v));
    if(d>.8) return shadeC(tint,.55);
    return shadeC(mix(tint,rgb('#d9c79a'),.28),.95+.2*vn(u*4,v*4));
  });
  const tw=name.length*4-1;
  textJ(J,i-tw/36,z+1.0,name,rgb('#1c0f08'),1);
  // brass tap at the foot of the head
  lathe(i,J+.02,z-Rz*.82,z-Rz*.45,h=>.04,(h,s)=>brass(s)); rod(i,J+.02,z-Rz*.5,i+.04,J+.2,z-Rz*.5,[BR.l,BR.m]); rod(i+.04,J+.2,z-Rz*.5,i+.04,J+.24,z-Rz*.9,[BR.l,BR.m]);
  rod(i-.1,J+.03,z-Rz*.55,i+.1,J+.03,z-Rz*.55,[BR.h]);
}
/** Mahogany back fitting along wall j=0: cupboards, mirrored gantry, casks, bottles, carved cornice. */
function backBar(){
  cam();
  const [i0,,i1,j1]=BB, W=i1-i0, JF=j1-.04, cast=rgb('#150a06');
  contact(i0,.4,i1,j1+.15,0,.55);
  // --- lower cupboards
  const PC=[0,1,2,3,4,5].map(m=>i0+.1+(W-.2)/5*m);
  faceJ(JF,i0,0,i1,8.9,(i,z)=>{
    let best=0,bd=9; for(const c of PC){ const d=Math.abs(i-c); if(d<bd){ bd=d; best=c; } }
    if(z<1.0) return z>.85?mahog(i,z,1.2):mahog(i,z*.8,.5);
    if(z>8.0){ return z>8.55?mahog(i,z,z>8.78?1.45:.8):(Math.floor((i-i0)*10)%2===0)?mahog(i,z,1.15):mahog(i,z,.4); }
    if(bd<.11){ const u=(i-best)/.11; if(Math.abs(u)>.85) return mahog(i,z,u<0?1.4:.5); if(Math.abs(u+.35)<.08||Math.abs(u-.3)<.08) return mahog(i,z,.4); return mahog(i*.2,z*.2,1.05-.3*Math.max(0,u)); }
    const m=Math.max(0,Math.min(4,Math.round((best-PC[0])/(PC[1]-PC[0])+(i>best?0:-1))));
    const a0=PC[m]+.14, a1=PC[m+1]-.14;
    if(i>=a0&&i<=a1&&z>1.3&&z<7.8) return fielded(i,z,a0,1.3,a1,7.8,.14,.8,i,z,1.0);
    return mahog(i,z,.4);
  });
  for(let m=0;m<5;m++){ const c=(PC[m]+PC[m+1])/2;   // knobs, keyhole plates
    lathe(c-.28,JF+.02,4.1,4.55,h=>.065*Math.sin(h/.45*Math.PI*.9)+.02,(h,s)=>brass(s));
    lathe(c+.28,JF+.02,4.1,4.55,h=>.065*Math.sin(h/.45*Math.PI*.9)+.02,(h,s)=>brass(s)); }
  faceI(i1,0,0,j1,8.9,(j,z)=>{ if(z<1.0) return mahog(j,z,.35); if(z>8.55) return mahog(j,z,.55); if(j>.12&&j<j1-.1&&z>1.3&&z<7.8) return fielded(j,z,.12,1.3,j1-.1,7.8,.1,.8,j,z,.62); return mahog(j,z,.35); });
  // --- working shelf
  topZ(8.9,i0,.28,i1,j1,(i,j)=>{ let c=mahog(i,j*1.5,1.1); c=mix(c,rgb('#ffd8a0'),Math.exp(-Math.pow((i-i0-.5)/.7,2)-Math.pow((j-.5)/.2,2))*.45+Math.exp(-Math.pow((i-i0-3.5)/.7,2)-Math.pow((j-.5)/.2,2))*.4); if(j>j1-.06) c=mix(c,rgb('#d89a62'),.5); return c; });
  faceJ(j1,i0,8.55,i1,8.9,(i,z)=>z>8.8?mix(mahog(i,z,1),rgb('#d89a62'),.5):mahog(i,z*2,1.1));
  const SJ=.34, ZB=8.9;
  // --- mirrored lower back panels and pilasters
  const LP=[0,1,2,3].map(m=>i0+.1+(W-.2)/3*m);
  for(let m=0;m<3;m++) mirrorPanel(LP[m]+.1,ZB,LP[m+1]-.1,18.5,'',1);
  for(const c of LP) faceJ(SJ+.08,c-.1,ZB,c+.1,25.3,(i,z)=>{ const u=(i-c)/.1; if(Math.abs(u)>.8) return mahog(i,z,u<0?1.45:.5); if(Math.abs(u)<.1) return mahog(i,z,.4); return mahog(i*.3,z*.2,1.1-.3*Math.max(0,u)); });
  // --- casks on the working shelf (left two thirds)
  cask(i0+.7,ZB+3.0,.34,2.7,'GIN',rgb('#6a4326'));
  cask(i0+1.42,ZB+3.0,.34,2.7,'RUM',rgb('#5b3820'));
  cask(i0+2.6,ZB+4.4,.68,4.3,'BRANDY',rgb('#744a28'));
  // --- bottles and glass: right panel, two shelves
  const right=LP[2]+.3, rEnd=LP[3]-.25;
  for(const zs of [13.6]) { topZ(zs,right-.1,SJ,rEnd+.1,.62,(i,j)=>mahog(i,j*2,1.0)); faceJ(.62,right-.1,zs-.55,rEnd+.1,zs,(i,z)=>z>zs-.12?mix(mahog(i,z,1),rgb('#d89a62'),.5):mahog(i,z*2,.85)); }
  const kinds=['stout','wine','gin','brandy','wine','stone'];
  for(let n=0;n<5;n++) bottle(right+n*.3,.52,ZB,kinds[n%6]);
  const kinds2=['gin','wine','decanter','stout','wine'];
  for(let n=0;n<5;n++) bottle(right+.1+n*.3,.5,13.6,kinds2[n]);
  for(let n=0;n<2;n++) rummer(right+.45+n*.55,.74,ZB);
  // --- cornice shelf at the top of the lower zone, with bottles and rummers
  topZ(18.9,i0+.05,SJ,i1-.02,.58,(i,j)=>mahog(i,j*2,1.0));
  faceJ(.58,i0+.05,18.4,i1-.02,18.9,(i,z)=>z>18.8?mix(mahog(i,z,1),rgb('#d89a62'),.55):z<18.55?mahog(i,z,.45):Math.floor((i-i0)*9)%2?mahog(i,z,1.2):mahog(i,z,.7));
  const row=['wine','stout','gin','brandy','decanter','wine','stone','gin','stout','wine','brandy','gin','decanter','wine','stout','gin'];
  for(let n=0;n<16;n++){ const bi=i0+.35+n*.34; if(bi<i1-.3){ if(n%4===2) rummer(bi,.46,18.9); else bottle(bi,.46,18.9,row[n]); } }
  // --- upper mirrors with gilt lettering
  const UP=[0,1,2,3].map(m=>i0+.1+(W-.2)/3*m);
  mirrorPanel(UP[0]+.1,18.95,UP[1]-.1,25.3,'',1);
  mirrorPanel(UP[1]+.1,18.95,UP[2]-.1,25.3,'',1);
  mirrorPanel(UP[2]+.1,18.95,UP[3]-.1,25.3,'',1);
  const lw=(/** @type {string} */s,/** @type {number} */sc)=>(s.length*4-1)*sc/18;
  for(const [m,w] of [[0,'ALES'],[1,'STOUT'],[2,'GIN']]){ const c=(UP[m]+UP[m+1])/2, sc=1.4; textJ(.34,c-lw(w,sc)/2,24.6,w,rgb('#f0dc9c'),sc); }
  // re-draw pilasters over the upper mirrors and bottles over lettering are avoided: bottles stop at z≈22.5
  // --- carved cornice, gilt frieze and the anchor crest
  faceJ(.5,i0,25.3,i1,25.9,(i,z)=>z<25.45?mahog(i,z,.4):Math.floor((i-i0)*10)%2?mahog(i,z,1.25):mahog(i,z,.55));
  faceJ(.46,i0,25.9,i1,29.0,(i,z)=>{ const e=Math.min(i-i0,i1-i,(z-25.9),(29-z)); if(e<.12) return mahog(i,z*2,e<.05?1.4:.8); return mix(rgb('#13241c'),rgb('#1e3a2c'),.5*vn(i*.7,z*.5)); });
  const fw=lw('ROPE & ANCHOR',1.5); textJ(.46,(i0+i1)/2-fw/2,28.55,'ROPE & ANCHOR',rgb('#e0c36a'),1.5);
  topZ(25.9,i0,SJ,i1,.58,(i,j)=>mahog(i,j,1.2));
  faceJ(.58,i0,29.0,i1,29.8,(i,z)=>z>29.65?mix(mahog(i,z,1),rgb('#d89a62'),.6):Math.floor((i-i0)*10)%2?mahog(i,z,1.2):mahog(i,z,.5));
  topZ(29.8,i0,SJ,i1,.58,(i,j)=>mahog(i,j,1.3));
  crest((i0+i1)/2);
  faceI(i1,0,8.9,.58,29.8,(j,z)=>mahog(j,z,.6));
}
/** Carved fan crest with a gilt anchor over the centre of the back bar. */
function crest(/** @type {number} */c){
  const J=.44;
  faceJ(J,c-1.2,29.8,c+1.2,32.8,(i,z)=>{
    const u=(i-c)/1.2, v=(z-29.8)/3.0, edge=Math.sqrt(Math.max(0,1-u*u))*1.0;
    if(v>edge) return 0;
    if(v>edge-.12) return mahog(i,z,v>edge-.05?1.5:.8);
    // anchor
    const ax=Math.abs(i-c), az=z-31.0;
    const shank=ax<.05&&az>-1.0&&az<1.0, stock=Math.abs(az-.55)<.06&&ax<.35, ring=Math.hypot(ax*8,(az-1.1)*1.2)<.5&&Math.hypot(ax*8,(az-1.1)*1.2)>.28;
    const arm=Math.abs(az+1.0+(.62-ax)*.0)<.12&&ax<.5, curve=ax>.2&&ax<.55&&az<-.1&&az>-1.1&&Math.abs(az+1.0-Math.pow((ax-.2)/.35,2)*.9)<.2;
    if(shank||stock||ring||arm||curve) return GILT;
    return mix(rgb('#13241c'),rgb('#254636'),.5*vn(i*1.3,z*.7));
  });
}

/* ---------------------------------------------------------------- staircase (static) */
const ST=PUB.stairs, FOOT=ST.box[2], HEAD=ST.box[0], TOP=ST.top, STEP_N=Math.round(TOP/2), RUN=(FOOT-HEAD)/STEP_N, RISE=TOP/STEP_N;
/** Stepped tread height over a given i, and the straight line through the nosings. */
const zStep=(/** @type {number} */i)=>i>=FOOT?0:Math.min(TOP,RISE*(Math.floor((FOOT-i)/RUN)+1));
const zLine=(/** @type {number} */i)=>i>=FOOT?RISE*0:Math.min(TOP,RISE+(FOOT-i)/RUN*RISE);
const RAIL_H=8.8;
function stairs(){
  cam();
  const [,j0,,j1]=ST.box, JO=j1, iEnd=HEAD;
  contact(HEAD,j1-.15,FOOT+.1,j1+.1,0,.5);
  // --- closed string on the wall: a raking board above the treads
  faceJ(.03,iEnd,0,FOOT,TOP+1.6,(i,z)=>{
    const zs=zStep(i), zl=zLine(i);
    if(z<zs||z>zl+1.0) return 0;
    if(z>zl+.75) return mahog(i,z,1.5);
    if(z>zl+.3) return mahog(i,z,.7);
    return mahog(i*.5,z*.6,.8);
  });
  // --- open side: tread ends, string board and panelled spandrel
  faceJ(JO,iEnd,0,FOOT,TOP,(i,z)=>{
    const zs=zStep(i), zl=zLine(i);
    if(z>zs) return 0;
    const edge=(FOOT-i)/RUN, fr=edge-Math.floor(edge), nearRiser=fr>.97||fr<.03&&edge>.2;
    if(z>zs-.5) return z>zs-.2?mix(mahog(i,z,1.5),rgb('#e8b98a'),.35):mahog(i,z,.5);        // nosing and its scotia
    const sb=zl-2.7, st=zl-5.4;                         // string board between sb and st
    if(z>sb) return nearRiser?mahog(i,z,.4):mahog(i*.3,z*.3,1.0);                                // tread end / bracketing
    if(z>sb-.35) return mahog(i,z,1.55);
    if(z>st){ if(z>sb-.7||z<st+.35) return mahog(i,z,z>sb-.7?.5:1.45); return mahog(i*.3,z*.3+2,.95); }
    if(z<1.0) return z>.85?mahog(i,z,1.3):mahog(i,z*.8,.5);
    // spandrel panels between stiles
    const pw=.7, m=Math.floor((i-HEAD-.1)/pw), a0=HEAD+.1+m*pw+.06, a1=HEAD+.1+(m+1)*pw-.06;
    const zt=st-.5;
    if(i>=a0&&i<=a1&&z>1.5&&z<zt-.8) return fielded(i,z,a0,1.5,a1,zt-.8,.12,.8,i,z,1.1);
    return mahog(i,z,.7);
  });
  // --- risers and treads, back (high) to front (low)
  const carpet=(/** @type {number} */j,/** @type {number} */i,/** @type {number} */z,/** @type {number} */k)=>{
    const a=.27, b=1.06;
    if(j<a||j>b) return 0;
    const e=Math.min(j-a,b-j);
    if(e<.02) return rgb('#14090a');
    if(e<.06) return shadeC(rgb('#c2a050'),k*.95);
    if(e<.09) return shadeC(rgb('#2a0f10'),k);
    if(e<.14) return shadeC(rgb('#8a2a24'),k*(.95+.1*vn(i*9,j*4)));
    if(Math.abs(j-(a+b)/2)<.025) return shadeC(rgb('#c2a050'),k*.9);
    const d=Math.abs(j-(a+b)/2);
    return shadeC(rgb('#7c2020'),k*(.95+.2*vn(i*6+z,j*5))*(d<.14&&Math.abs((i*7+z)%1-.5)<.14?1.2:1));
  };
  for(let k=STEP_N-1;k>=0;k--){
    const iF=FOOT-k*RUN, iB=FOOT-(k+1)*RUN, zt=RISE*(k+1), zb=RISE*k;
    faceI(iF,j0,zb,j1,zt,(j,z)=>{ const c=carpet(j,iF,z,.78); if(c) return c; if(z>zt-.45) return mahog(j,z,1.2); return mahog(j,z,.62); });
    topZ(zt,iB,j0,iF,j1,(i,j)=>{
      const c=carpet(j,i,zt,1.0); if(c) return iF-i<.05?shadeC(c,1.35):i-iB<.05?shadeC(c,.75):c;
      let t=mahog(i*2,j,1.0); if(iF-i<.05) t=mix(t,rgb('#e0a870'),.5); return t;
    });
  }
  // stair rods
  for(let k=0;k<STEP_N;k++){
    const i=FOOT-k*RUN-.01, z=RISE*k+.12;
    rod(i,.22,z,i,1.1,z,[BR.l,BR.d]);
    for(const j of [.2,1.12]) lathe(i,j,z-.3,z+.3,h=>.045*Math.sin(h/.6*Math.PI)+.02,(h,s)=>brass(s));
  }
  // --- balustrade on the open side
  const GI=PUB.gallery.box[2]-.08, rz=(/** @type {number} */i)=>zLine(i)+RAIL_H, jb=JO-.08;
  const bal=(/** @type {number} */i,/** @type {number} */zb,/** @type {number} */zt,jj=jb)=>{
    const H=zt-zb;
    lathe(i,jj,zb,zt,h=>{ const t=h/H; return t<.12?.034:t<.2?.026:t<.34?.026+.026*Math.sin((t-.2)/.14*Math.PI):t<.5?.024:t<.62?.024+.02*Math.sin((t-.5)/.12*Math.PI):.024; },
      (h,s)=>shadeC(mix(rgb('#6a361b'),rgb('#a45f30'),Math.max(0,-s)),lit(s)*1.05));
  };
  for(let k=0;k<STEP_N;k++){ for(const f of [.5]){ const i=FOOT-(k+f)*RUN; bal(i,RISE*(k+1),rz(i)-.7); } }
  // handrail: sloped, then level over the landing
  const rail=[shadeC(rgb('#c27a46'),1.15),rgb('#8a4a26'),rgb('#6a3418'),rgb('#2e1409')];
  rod(FOOT-.05,jb,rz(FOOT-.05),HEAD+.1,jb,rz(HEAD+.1),rail);
  
  // newels: big turned post at the foot, smaller ones at the head of the flight and the landing end
  const newel=(/** @type {number} */i,/** @type {number} */zb,/** @type {number} */H,/** @type {number} */sc,jj=jb)=>{
    lathe(i,jj,zb,zb+H,h=>{ const t=h/H;
      if(t<.14) return .15*sc; if(t<.2) return .1*sc; if(t<.5) return (.1+.1*Math.sin((t-.2)/.3*Math.PI))*sc;
      if(t<.54) return .09*sc; if(t<.72) return .1*sc; if(t<.76) return .14*sc; if(t<.8) return .09*sc;
      if(t<.97) return .125*sc*Math.sqrt(Math.max(0,1-Math.pow((t-.88)/.1,2)))+.0; return .04*sc; },
      (h,s)=>{ const t=h/H, l=lit(s)*1.1; const c=Math.abs(t-.15)<.015||Math.abs(t-.52)<.01||Math.abs(t-.75)<.01?rgb('#c0864f'):mix(rgb('#6a361b'),rgb('#a45f30'),Math.max(0,-s*.8)); return shadeC(c,l); });
  };
  newel(FOOT-.05,0,16.5,1.35);
  newel(GI,TOP,RAIL_H+3.4,1.0,jb);
}

/* ---------------------------------------------------------------- hanging gallery (static) */
const GA=PUB.gallery, GB=GA.box, GZ=GA.z, GT=1.8, GI_EDGE=GB[2];
/** Slab, moulded fascia, carved wall brackets and the planked, carpeted floor of the gallery. */
function gallerySlab(){
  cam();
  const [i0,j0,i1,j1]=GB, zb=GZ-GT, d=PUB.fire.d;
  // floor, clipped where the chimney breast stands in front of it
  const xcut=isoX(d,j1)-1;
  topZ(GZ,i0,j0,i1,j1,(i,j,x)=>{
    if(x<xcut) return 0;
    const run=(i>.33&&i<1.18&&j>.25&&j<j1-.12)||(i>.33&&j>.25&&j<1.08);
    if(run){ const a=Math.min(i-.33,Math.min(1.18,i1)-i), c=Math.min(j-.25,j1-.12-j);
      const e=(j<1.08&&i>1.18)?Math.min(j-.25,1.08-j):a;
      if(e<.02) return rgb('#14090a'); if(e<.06) return rgb('#c2a050'); if(e<.09) return rgb('#2a0f10'); if(e<.14) return shadeC(rgb('#8a2a24'),.95+.1*vn(i*9,j*4));
      if(c<.03&&i<1.18) return rgb('#c2a050');
      return shadeC(rgb('#7c2020'),.95+.22*vn(i*6,j*5)); }
    const plank=Math.floor(i*5); return mix(mahog(j*.8,i*1.5,1.05),rgb('#1a0b06'),Math.abs(i*5-plank-.02)<.05?.5:0)|0;
  });
  // skirting along both walls (the doors in wall i=0 stay open)
  faceI(.03,j0,GZ,j1,GZ+2.2,(j,z)=>{ for(const [a,b] of GA.doors) if(j>a-.05&&j<b+.05) return 0; return z>GZ+1.9?mahog(j,z,1.5):z>GZ+1.6?mahog(j,z,.5):mahog(j*.4,z*.4,.9); });
  faceJ(.03,i0,GZ,i1,GZ+2.2,(i,z)=>z>GZ+1.9?mahog(i,z,1.5):z>GZ+1.6?mahog(i,z,.5):mahog(i*.4,z*.4,.9));
  // end of the slab against the chimney breast
  faceJ(j1,d,zb,i1,GZ,(i,z)=>mahog(i,z,z>GZ-.3?1.3:.7));
  // brackets: big carved scrolls fixed to the wall, the slab hangs on them
  for(const jb of [.45,1.7,2.9,4.0,6.0,6.8]){
    const z0=15.6, zt=zb, w=(/** @type {number} */z)=>1.25*Math.pow(Math.max(0,(z-z0)/(zt-z0)),.55);
    const prof=(/** @type {number} */i,/** @type {number} */z,/** @type {number} */k)=>{
      const wz=w(z), back=i<.3&&z>z0-.9;
      if(!(back||(z>=z0&&i<wz))) return 0;
      if(z<z0&&Math.hypot((i-.15)*3,(z-z0+.9)*.45)>.45*1.0&&z<z0-.4) return 0;
      const edge=Math.min(wz-i,z-z0+.3);
      if(!back&&edge<.07) return mahog(i,z,k*1.5);
      if(!back&&((wz-i)*9)%1<.14) return mahog(i,z,k*.5);
      const vo=Math.hypot((i-.62*wz)*4,(z-z0-1.5)*.55);   // volute
      if(!back&&vo<.5) return mahog(i,z,k*(vo>.35||vo<.12?.5:1.35));
      return mahog(i*.6,z*.5+jb,k*(back?1.0:1.12));
    };
    faceJ(jb,0,z0-1,1.3,zt,(i,z)=>prof(i,z,.7));
    faceJ(jb+.24,0,z0-1,1.3,zt,(i,z)=>prof(i,z,1.4));
  }
  // moulded fascia on the open edge, from the stair head to the chimney breast
  const f0=PUB.stairs.box[3];
  faceI(i1,f0,zb,j1,GZ,(j,z)=>{
    if(z<zb+.3) return mahog(j,z,z<zb+.12?.35:1.5);
    if(z>GZ-.45) return z>GZ-.1?mix(mahog(j,z,1.4),rgb('#f0b57a'),.5):mahog(j,z,z>GZ-.3?1.3:.6);
    if(z>GZ-.95) return (Math.floor(j*9)%2===0)?mahog(j,z,1.25):mahog(j,z,.4);         // dentils
    const u=((j-f0)%.62)/.62, v=(z-zb-.3)/(GT-1.25), dd=Math.hypot((u-.5)*1.7,(v-.5)*1.1);  // carved rosettes
    if(dd<.25) return mahog(j,z,dd<.1?1.5:.6);
    return mahog(j*.3,z*.3,1.3);
  });
  faceI(i1+.0,f0,GZ-.45,j1,GZ,()=>0);
}
/** Turned balusters, handrail and end newel on the gallery's open edge (the stair rail flows into it). */
function galleryRail(){
  cam();
  const [,,,j1]=GB, GI2=GB[2]-.08, jb=PUB.stairs.box[3]-.08, jEnd=j1-.15, top=GZ+RAIL_H;
  const rail=[shadeC(rgb('#c27a46'),1.15),rgb('#8a4a26'),rgb('#6a3418'),rgb('#2e1409')];
  for(let j=jb+.3;j<jEnd-.05;j+=.2){
    lathe(GI2,j,GZ,top-.7,h=>{ const t=h/(top-.7-GZ); return t<.12?.034:t<.2?.026:t<.34?.026+.026*Math.sin((t-.2)/.14*Math.PI):t<.5?.024:t<.62?.024+.02*Math.sin((t-.5)/.12*Math.PI):.024; },
      (h,s)=>shadeC(mix(rgb('#6a361b'),rgb('#a45f30'),Math.max(0,-s)),lit(s)*1.05));
  }
  rod(GI2,jb,top,GI2,jEnd,top,rail);
  const jj=jEnd;
  lathe(GI2,jj,GZ,top+3.4,h=>{ const t=h/(top+3.4-GZ);
    if(t<.14) return .15; if(t<.2) return .1; if(t<.5) return .1+.1*Math.sin((t-.2)/.3*Math.PI);
    if(t<.54) return .09; if(t<.72) return .1; if(t<.76) return .14; if(t<.8) return .09;
    if(t<.97) return .125*Math.sqrt(Math.max(0,1-Math.pow((t-.88)/.1,2))); return .04; },
    (h,s)=>{ const t=h/(top+3.4-GZ), c=Math.abs(t-.15)<.015||Math.abs(t-.52)<.01||Math.abs(t-.75)<.01?rgb('#c0864f'):mix(rgb('#6a361b'),rgb('#a45f30'),Math.max(0,-s*.8)); return shadeC(c,lit(s)*1.1); });
}

/* ---------------------------------------------------------------- exports */
/** Static wall-bound parts baked once: back bar, staircase. */
export function pubBarStatic(){ backBar(); gallerySlab(); stairs(); galleryRail(); }
/** Counter, return arm, stools and spittoons, drawn in depth order. @returns {{box:number[],draw:()=>void}[]} */
export function pubBarProps(/** @type {number} */t){
  const r=PUB.stoolR;
  return [
    {box:PUB.counter.box,draw:drawCounter},
    {box:PUB.ret.box,draw:drawReturn},
    ...PUB.stools.map(([i,j])=>({box:[i-r,j-r,i+r,j+r],draw:()=>drawStool(i,j)})),
    ...[[CB[0]+2.5,3.34],[CB[2]-.6,3.34]].map(([i,j])=>({box:[i-.16,j-.14,i+.16,j+.14],draw:()=>drawSpittoon(i,j)})),
  ];
}
