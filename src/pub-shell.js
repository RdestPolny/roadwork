// Pub interior shell: floor, the two back walls with everything fixed on them, fireplace, and the room's light and haze.
// Layout: src/pub-layout.js. Static layers are baked once; the fire, gasoliers, glow, haze and vignette run per frame.
import { quad, isoX, isoY, isoLineThin, shadeC, psetK } from './gym.js';
import { state as rendererState } from './renderer.js';
import { state as appearanceState, rgb } from './appearance.js';
import { mix } from './cast.js';
import { PUB } from './pub-layout.js';
import { spot, vn, cyl, roundLit } from './thames-port.js';

/* ---------- palette ---------- */
const K={
  oakD:rgb('#4e341e'), oakL:rgb('#8a6439'), oakPale:rgb('#b18d5c'), saw:rgb('#c2a46e'), sawD:rgb('#7a5c35'),
  mahog:rgb('#5e2c1b'), mahogD:rgb('#2a120b'), mahogL:rgb('#8f4c2c'), brass:rgb('#c9a24a'), brassD:rgb('#6e4f1e'), brassL:rgb('#f4dc8e'),
  gold:rgb('#c9a04a'), ox:rgb('#56121a'), oxF:rgb('#72202a'), green:rgb('#12372a'), greenF:rgb('#1d5240'),
  plaster:rgb('#a89678'), nic:rgb('#6a4818'), coal:rgb('#120f0e'), iron:rgb('#18191a'), ironL:rgb('#4a4d4f'), slate:rgb('#25262a'),
  glassW:rgb('#ffe9a8'), flame:rgb('#ffd27a'), moon:rgb('#86a6d6'), paper:rgb('#cdbb92'), ink:rgb('#2a1b13'), stone:rgb('#8c8678'), black:rgb('#0b0a0a'),
};
const FONT={V:'101101101101010',A:'010101111101101',P:'110101110100100',I:'111010010010111',N:'101111111101101',H:'101101111101101',R:'110101110101101',F:'111100110100100',C:'011100100100011',D:'110101101101110',E:'111100110100111',K:'101101110101101',L:'100100100100111',M:'101111111101101',O:'010101101101010',S:'011100010001110',T:'111010010010010',U:'101101101101111',Y:'101101010010010','&':'010101010101011',' ':'000000000000000','1':'010110010010111','4':'101101111001001','6':'011100110101010'};
const hh=(/** @type {number} */n)=>{ const s=Math.sin(n*12.9898)*43758.5453; return s-Math.floor(s); };
const sm=(/** @type {number} */a,/** @type {number} */b,/** @type {number} */x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
const lit=(/** @type {number} */c,/** @type {number} */k)=>shadeC(c,k);
const fbm=(/** @type {number} */u,/** @type {number} */v)=>vn(u,v)*.65+vn(u*2.1+5.3,v*2.1+1.7)*.35;

/* ---------- camera-relative helpers (textures come from world coordinates, the camera pans) ---------- */
/** @type {{ox:number,oy:number,ix:number,jx:number,iy:number,jy:number,cz:number}} */
let G={ox:0,oy:0,ix:18,jx:-18,iy:9,jy:9,cz:3};
function cam(){ const ox=isoX(0,0), oy=isoY(0,0,0); G={ox,oy,ix:isoX(1,0)-ox,jx:isoX(0,1)-ox,iy:isoY(1,0,0)-oy,jy:isoY(0,1,0)-oy,cz:oy-isoY(0,0,1)}; }
/** Ground point under a pixel at height z. */
function gnd(/** @type {number} */x,/** @type {number} */y,z=0){ const a=(x+.5-G.ox)/G.ix, b=(y+.5-G.oy+z*G.cz)/G.iy; return [(a+b)/2,(b-a)/2]; }
/** Textured horizontal rectangle; fn(i,j,x,y). */
function flo(i0,j0,i1,j1,z,fn){ quad(i0,j0,z,i1,j0,z,i1,j1,z,i0,j1,z,(x,y)=>{ const [i,j]=gnd(x,y,z); return fn(i,j,x,y); }); }
/** A wall face: kind 'I' = plane i=c running along j, 'J' = plane j=c running along i. @typedef {{k:string,c:number}} Face */
const pp=(/** @type {Face} */f,/** @type {number} */a)=>f.k==='I'?[f.c,a]:[a,f.c];
/** Rectangle on a wall face; fn(a,z,x,y) or a flat colour. @param {Face} f */
function fq(f,a0,z0,a1,z1,fn){
  const [i0,j0]=pp(f,a0),[i1,j1]=pp(f,a1);
  quad(i0,j0,z0,i1,j1,z0,i1,j1,z1,i0,j0,z1,typeof fn==='function'?(x,y)=>{
    const a=f.k==='I'?(x+.5-G.ox-f.c*G.ix)/G.jx:(x+.5-G.ox-f.c*G.jx)/G.ix, [i,j]=pp(f,a);
    return fn(a,(G.oy+i*G.iy+j*G.jy-y-.5)/G.cz,x,y);
  }:()=>fn);
}
/** One-pixel line on a wall face. @param {Face} f */
function fl(f,a0,z0,a1,z1,c){ const [i0,j0]=pp(f,a0),[i1,j1]=pp(f,a1); isoLineThin(i0,j0,z0,i1,j1,z1,c); }
/** Screen position of a point on a face. @param {Face} f */
function fpt(f,a,z){ const [i,j]=pp(f,a); return [isoX(i,j),isoY(i,j,z)]; }
/** A pixel-lettered caption (font pixel = s×s screen pixels) running along a face. @param {Face} f */
function glyphs(f,a,z,text,col,s=1){
  const [x0,y0]=fpt(f,a,z), dir=1, slope=f.k==='I'?-G.iy/G.ix:G.iy/G.ix;
  for(let n=0;n<text.length;n++){ const g=FONT[text[n]]; if(!g) continue; for(let p=0;p<15;p++) if(g[p]==='1')
    for(let dx=0;dx<s;dx++) for(let dy=0;dy<s;dy++){ const px=(n*4+p%3)*s+dx; psetK(Math.round(x0+dir*px),Math.round(y0+px*slope+Math.floor(p/3)*s+dy),col); } }
}
/** Distance-based coverage of a thick segment (picture drawing). */
const cap=(/** @type {number} */x,/** @type {number} */y,/** @type {number} */x0,/** @type {number} */y0,/** @type {number} */x1,/** @type {number} */y1,/** @type {number} */r)=>{
  const dx=x1-x0, dy=y1-y0, t=Math.max(0,Math.min(1,((x-x0)*dx+(y-y0)*dy)/(dx*dx+dy*dy||1))); return Math.hypot(x-x0-dx*t,y-y0-dy*t)<=r;
};
const disc=(/** @type {number} */x,/** @type {number} */y,/** @type {number} */cx,/** @type {number} */cy,/** @type {number} */r)=>(x-cx)*(x-cx)+(y-cy)*(y-cy)<=r*r;

/* ---------- floor ---------- */
const DOORJ=[PUB.door.j0-.05,PUB.door.j1+.05];
/** Worn oak boards, grime, the pale path from the door to the kitchen, sawdust, a coir mat, a stone threshold, moonlight. @param {number} i @param {number} j */
function floorAt(i,j){
  if(i>12.12&&j>DOORJ[0]&&j<DOORJ[1]) return thresholdAt(i,j);
  const BWd=.56, bj=Math.floor(j/BWd), fj=j/BWd-bj, seg=3+hh(bj*3.3)*1.7, u=(i+hh(bj*7.7)*seg)/seg, bi=Math.floor(u), fi=(u-bi)*seg, id=bj*31+bi*7;
  const tone=hh(id), gr=vn(i*.8+bj*5.3,j*26)*.55+vn(i*3.2+bj*2,j*70)*.25;
  let c=mix(K.oakD,K.oakL,.18+tone*.62);
  let k=.84+.3*gr;
  const grime=.78+.4*vn(i*.3+9,j*.3+4);
  const jc=5.75-.7*Math.max(0,Math.min(1,(5-i)/5)), edge=.78+.4*(vn(i*.5,3.3)-.5), pm=(1-sm(edge-.4,edge+.1,Math.abs(j-jc)))*sm(.1,1.3,i)*(.65+.35*vn(i*.9,j*.9));
  const wall=.46+.54*sm(0,2.4,Math.min(i,j)), front=.8+.2*sm(0,.8,Math.min(PUB.J-j,PUB.I-i)+.3);
  c=mix(c,K.oakPale,pm*.6);
  k*=grime*(1-pm*.25)*(1-(1-wall)*(1-pm*.5))*front;
  // sawdust and beery damp along the bar front
  const sd=(1-sm(0,.55,Math.abs(j-3.95)-.62+(vn(i*.6,j*.8+2)-.5)*.6))*sm(3.7,4.4,i)*(1-sm(10.2,10.8,i));
  if(sd>0){
    c=mix(c,K.sawD,sd*.3);
    const n=vn(i*3.3+2,j*3.3)*.55+vn(i*7.1,j*7.1+3)*.45, n2=vn(i*3.3+1.8,j*3.3-.2)*.55+vn(i*7.1-.2,j*7.1+2.8)*.45;
    const s=sd*sm(.48,.62,n); c=mix(c,K.saw,s*.85); k*=1+(n-n2)*s*3;
  }
  if(fj<.07||fi<.045) return lit(c,.34);
  if(fj<.15) k*=1.12; else if(fj>.93) k*=.9;
  if(fi<.12) k*=1.08;
  // beer and boot stains
  k*=1-.22*sm(.64,.78,vn(i*.55+3,j*.5+17));
  const m=matAt(i,j); if(m) return m;
  return lit(c,k);
}
/** Coir doormat inside the door. */
function matAt(/** @type {number} */i,/** @type {number} */j){
  const i0=11.05,i1=12.2,j0=5.0,j1=6.5;
  if(i<i0-.06||i>i1+.06||j<j0-.06||j>j1+.06) return 0;
  if(i<i0||i>i1||j<j0||j>j1) return lit(rgb('#2a1c10'),.7);
  const d=Math.min(i-i0,i1-i,j-j0,j1-j), stripe=Math.floor(j*11)&1, fibre=.9+.2*vn(i*2,j*30);
  let k=(stripe?.9:1.05)*fibre*(.88+.2*vn(i*1.1+4,j*1.1));
  if(d<.1) return lit(rgb('#2d2014'),k*(d<.03?1.4:1));
  if(d<.2) return lit(rgb('#6d4d2a'),k);
  return lit(rgb('#563b21'),k*(d>.3&&d<.38?1.12:1));
}
/** Worn stone threshold in the doorway. */
function thresholdAt(/** @type {number} */i,/** @type {number} */j){
  const wear=sm(.2,.8,vn(i*1.1,j*1.3)), c=mix(rgb('#6f6a5f'),rgb('#9a9486'),.35+.5*wear);
  const edge=Math.min(j-DOORJ[0],DOORJ[1]-j,i-12.12);
  return lit(c,(.86+.2*vn(i*3,j*3)-(edge<.05?.2:0))*(1-.18*sm(.6,.8,vn(i*.7+8,j*.6))));
}
/** Moonlight through the cut-away front windows, projected on the floor: panes with mullions and a transom. */
function moonAt(/** @type {number} */i,/** @type {number} */j){
  const t=PUB.I-i; if(t<.5||t>3.4) return 0;
  let m=0;
  for(const [ja,jb,n] of [[1.5,4.2,2],[7.4,10.8,3]]){
    const jj=j-.3*t, w=jb-ja, u=(jj-ja)/w;
    if(u<0||u>1) continue;
    const edge=Math.min(sm(0,.05,u),sm(0,.05,1-u)), zw=t*6, ze=Math.min(sm(5.5,6.5,zw),sm(0,1,17-zw));
    const mull=Math.min(...Array.from({length:n-1},(_,q)=>Math.abs(u-(q+1)/n)*w)), bars=sm(.04,.12,mull)*sm(.03,.12,Math.abs(zw-11.2)/6);
    m=Math.max(m,edge*ze*bars);
  }
  return m;
}

/* ---------- walls ---------- */
const PAL={ I:{g:rgb('#4d1017'),f:rgb('#6f1f27'),n:rgb('#b48a3c')}, J:{g:rgb('#10321f'),f:rgb('#1b4d38'),n:rgb('#b48a3c')} };
/** Damask on a half-drop lattice: lozenge medallions outlined in gold, with a gold bud in each, nodes and leaves between. a runs along the wall. */
function paperAt(/** @type {number} */a,/** @type {number} */z,/** @type {{g:number,f:number,n:number}} */pal,/** @type {number} */seed){
  const W=1.2, Hc=8, row=Math.floor(z/Hc), un=a/W+((row&1)?.5:0)+seed, n=Math.floor(un), x=(un-n-.5)*2, y=((z/Hc-row)-.5)*2;
  const q=Math.pow(Math.abs(x)/.84,1.45)+Math.abs(y)/.92;
  let c=pal.g;
  const body=1-sm(.92,1.02,q);
  c=mix(c,pal.f,body*.9);
  const ring=sm(.74,.8,q)*(1-sm(.9,.96,q));
  const bud=1-sm(.9,1.1,Math.abs(x)/.36+Math.abs(y)/.5), core=1-sm(.5,.7,Math.abs(x)/.14+Math.abs(y)/.2);
  const node=1-sm(.9,1.1,(1-Math.abs(x))/.17+Math.abs(y)/.3), leaf=1-sm(.9,1.1,Math.abs(x)/.26+(1-Math.abs(y))/.14);
  const sprig=(1-sm(.55,.9,Math.abs(Math.abs(x)-.42)/.07+Math.abs(Math.abs(y)-.78)/.2))*.7;
  c=mix(c,pal.n,Math.max(ring*.8,bud*.9,node*.85,leaf*.75,sprig));
  c=mix(c,pal.g,core*.8);
  // faint embossed pinstripe and large damp stains
  return lit(c,(.93+.08*Math.sin(a*Math.PI*2/W*1)*.0+.07*vn(a*.7+seed,z*.12))*(1-.0));
}
/** Mahogany dado: moulded panels between stiles, raised fields with a bevel, varnish sheen. */
function dadoAt(/** @type {number} */a,/** @type {number} */z,/** @type {number} */seed){
  const M=1.3, f=((a/M+seed)%1+1)%1, du0=(f-.14)*M*18, du1=(.86-f)*M*18, dz0=(z-2.6)*3, dz1=(7.6-z)*3;
  const grain=.82+.3*vn(a*5+seed*3,z*.4)+.05*Math.sin(a*80+vn(a*2,z)*9);
  let c=K.mahog, k=grain;
  if(z<1.9){
    c=K.mahogD; k=.9+.2*vn(a*3,z*2);
    if(z>1.55) k*=1.5; if(z<.2) k*=.55;
    return lit(c,k);
  }
  const inner=f>.14&&f<.86&&z>2.6&&z<7.6;
  if(!inner){
    // stiles and rails sit proud of the panels
    k*=.95; if(z<2.15||z>8.1) k*=1.0;
    if(f<.04||f>.96||Math.abs(z-2.5)<.12) k*=.78;
    if(z>7.5&&z<7.75) k*=1.0;
    return lit(c,k*(f<.2&&f>.14?1.05:1));
  }
  if(dz1<1.6) k*=1.5; else if(du0<1.6) k*=1.28; else if(dz0<1.6) k*=.5; else if(du1<1.6) k*=.62;
  else k*=1.04+.22*sm(5,7.6,z)*(.4+.6*vn(a*.8,z*.1)) + .1*sm(.2,.0,f-.4);
  return lit(c,k);
}
/** Dado rail, picture rail and plaster cornice profile heights; returns a colour for the wall at (a,z), the whole wall painted in one pass. */
function wallAt(/** @type {number} */a,/** @type {number} */z,/** @type {'I'|'J'} */kind,/** @type {number} */x,/** @type {number} */y){
  const pal=PAL[kind], seed=kind==='I'?.13:.31;
  const nic=sm(14,38,z), nicN=.55+.45*vn(a*.4+seed*9,z*.08);
  let c;
  if(z<10.4){
    if(z>9.9) c=lit(K.mahogL,1.5);                                    // rail top lip
    else if(z>8.7) c=lit(K.mahog,(z>9.6?1.7:1.15)*(.9+.2*vn(a*4,z)));
    else if(z>8.3) c=lit(K.mahogD,.9);                                // under-rail moulding
    else c=dadoAt(a,z,seed);
    if(z<8.3&&z>7.8) c=lit(c,.9);
    // lamp-smoke stains and wall-foot grime
    c=lit(c,(.84+.2*sm(0,10,z)*0+.0)*(.95+.1*vn(a*.5,z*.3)));
    return c;
  }
  if(z<30){
    c=paperAt(a,z,pal,seed);
    c=lit(c,.78+.22*sm(10.4,12.8,z));
    c=mix(c,K.nic,Math.min(.5,nic*.55*nicN));
    c=lit(c,1-.3*nic*nicN);
    if(z>29) c=lit(c,.85+.15*sm(29.9,29,z)*0+.15*(1-sm(29,29.9,z)));
    return c;
  }
  if(z<30.9){ c=lit(K.mahog,z<30.15?.45:z>30.6?1.55:1.0); return lit(mix(c,K.nic,.2),.9); }
  if(z<35){
    // frieze: dark band with gilt swags
    const fz=z-33, sw=Math.sin(Math.PI*(((a/1.5)%1+1)%1)), line=Math.abs(z-(34.2-1.7*sw)), joint=Math.abs((((a/1.5)%1+1)%1)-.0);
    let fc=mix(kind==='I'?K.ox:K.green,K.black,.45);
    fc=mix(fc,K.gold,(1-sm(.12,.4,line))*.75);
    const dotd=Math.min(joint,1-joint)*1.5*18;
    if(Math.hypot(dotd,(z-34.4)*3)<2.2) fc=mix(fc,K.brassL,.85);
    fc=mix(fc,K.nic,.35); fc=lit(fc,.85+.1*vn(a*.5,z*.2));
    if(z<31.3) fc=lit(fc,.55);
    if(z>34.7) fc=lit(fc,.7);
    return fc;
  }
  // cornice: undercut, cove, dentils, top lip
  const pl=mix(K.plaster,K.nic,.4);
  if(z<35.5) return lit(pl,.42);
  if(z<37.2){ const t=(z-35.5)/1.7; return lit(pl,.62+.55*Math.sin(Math.PI*Math.min(1,t*.9+.05))); }
  if(z<37.65){ const d=((a*5)%1+1)%1; return lit(pl,d<.55?.95:.5); }
  return lit(pl,1.15);
}

/** Cut wall thickness: top plaster and a brick end face. */
function wallThickness(){
  const P=PUB, T=.42, top=(/** @type {number} */x,/** @type {number} */y)=>{ const [i,j]=gnd(x,y,P.H); return lit(mix(K.plaster,K.nic,.35),.9+.2*vn(i*2,j*2)); };
  quad(-T,0,P.H,-T,P.J,P.H,0,P.J,P.H,0,0,P.H,top);
  quad(0,-T,P.H,P.I,-T,P.H,P.I,0,P.H,0,0,P.H,top);
  quad(-T,-T,P.H,-T,0,P.H,0,0,P.H,0,-T,P.H,top);
  /** brick course pattern on a cut end */
  const cut=(/** @type {number} */a,/** @type {number} */z)=>{
    const row=Math.floor(z/1.15), u=a*4+(row&1)*.5, fu=u-Math.floor(u), fz=z/1.15-row, e=Math.min(a,T-a);
    if(e<.07) return lit(K.plaster,.8);
    if(fz<.14||fu<.07) return lit(rgb('#2a2622'),1);
    return lit([rgb('#5a3a2c'),rgb('#6a4533'),rgb('#4a3226'),rgb('#704b36')][Math.floor(hh(Math.floor(u)+row*5)*4)],.85+.25*vn(a*3,z*.4));
  };
  // end of wall i=0 at j=J (faces +j), end of wall j=0 at i=I (faces +i)
  quad(-T,P.J,0,0,P.J,0,0,P.J,P.H,-T,P.J,P.H,(x,y)=>{ const i=(x+.5-G.ox-P.J*G.jx)/G.ix, z=(G.oy+i*G.iy+P.J*G.jy-y-.5)/G.cz; return cut(i+T,z); });
  quad(P.I,-T,0,P.I,0,0,P.I,0,P.H,P.I,-T,P.H,(x,y)=>{ const j=(x+.5-G.ox-P.I*G.ix)/G.jx, z=(G.oy+P.I*G.iy+j*G.jy-y-.5)/G.cz; return cut(j+T,z); });
}

/** The cut floor edge with its thickness, the low dark stub of the cut front walls, the street-door gap with its stone step. */
function frontCut(){
  const P=PUB, E=.32, I2=P.I+E, J2=P.J+E, SZ=2.7, D0=P.door.j0-.12, D1=P.door.j1+.12;
  // slab top beyond the boards
  flo(P.I,0,I2,J2,0,(i,j)=>(j>D0&&j<D1)?thresholdAt(i,j):K.mahogD);
  flo(0,P.J,I2,J2,0,()=>K.mahogD);
  // slab edge: oak boards over joists, stone under the door
  const edge=(/** @type {number} */a,/** @type {number} */z,/** @type {boolean} */stone)=>{
    if(stone) return lit(rgb('#7b766a'),(z>-.35?1.15:.8)*(.85+.25*vn(a*3,z*2)));
    if(z>-.55) return lit(mix(K.oakD,K.oakL,.3+.4*hh(Math.floor(a*1.8))),z>-.12?1.3:.85);
    const joist=((a/1.6)%1+1)%1<.14; return lit(K.mahogD,joist?.55:1.0+.3*vn(a*2,z*3));
  };
  quad(I2,0,-1.45,I2,J2,-1.45,I2,J2,0,I2,0,0,(x,y)=>{ const j=(x+.5-G.ox-I2*G.ix)/G.jx, z=(G.oy+I2*G.iy+j*G.jy-y-.5)/G.cz; return edge(j,z,j>D0&&j<D1); });
  quad(0,J2,-1.45,I2,J2,-1.45,I2,J2,0,0,J2,0,(x,y)=>{ const i=(x+.5-G.ox-J2*G.jx)/G.ix, z=(G.oy+i*G.iy+J2*G.jy-y-.5)/G.cz; return edge(i,z,false); });
  // dark wainscot stubs: top and outer face (the cut wall)
  const face=(/** @type {number} */a,/** @type {number} */z)=>{
    const f=(((a/1.3)%1)+1)%1, inner=f>.14&&f<.86&&z>.55&&z<SZ-.5;
    let k=.7+.25*vn(a*5,z*.4); if(z>SZ-.35) k*=1.5; if(z<.4) k*=.6;
    if(inner){ const dz1=SZ-.5-z; if(dz1<.3) k*=1.3; else if(z<.85) k*=.6; }
    return lit(K.mahog,k*.8);
  };
  const top=(/** @type {number} */x,/** @type {number} */y)=>{ const [i,j]=gnd(x,y,SZ); return lit(mix(K.mahogL,K.mahog,.4),.9+.25*vn(i*4,j*4)); };
  // front wall i=I, left of the door and right of it
  for(const [a0,a1] of [[0,D0],[D1,J2]]){
    quad(P.I,a0,SZ,I2,a0,SZ,I2,a1,SZ,P.I,a1,SZ,top);
    quad(I2,a0,0,I2,a1,0,I2,a1,SZ,I2,a0,SZ,(x,y)=>{ const j=(x+.5-G.ox-I2*G.ix)/G.jx, z=(G.oy+I2*G.iy+j*G.jy-y-.5)/G.cz; return face(j,z); });
  }
  // inside end faces of the stub at the door posts (face -j / +j)
  quad(P.I,D1,0,I2,D1,0,I2,D1,SZ,P.I,D1,SZ,(x,y)=>lit(K.mahog,.55));
  // front-left wall j=J
  quad(0,P.J,SZ,I2,P.J,SZ,I2,J2,SZ,0,J2,SZ,top);
  quad(0,J2,0,I2,J2,0,I2,J2,SZ,0,J2,SZ,(x,y)=>{ const i=(x+.5-G.ox-J2*G.jx)/G.ix, z=(G.oy+i*G.iy+J2*G.jy-y-.5)/G.cz; return face(i,z); });
  // stone door posts
  for(const j0 of [D0-.22,D1]) {
    quad(P.I-.05,j0,3.4,I2+.05,j0,3.4,I2+.05,j0+.22,3.4,P.I-.05,j0+.22,3.4,()=>lit(K.stone,1.1));
    quad(I2+.05,j0,0,I2+.05,j0+.22,0,I2+.05,j0+.22,3.4,I2+.05,j0,3.4,(x,y)=>lit(K.stone,.85+.2*vn(x*.3,y*.3)));
  }
}


/* ---------- framed pictures ---------- */
/** Gilt (or black) frame, cream mount, and art(x,y,W,H) in picture pixels; a cord up to a hook. @param {Face} f */
function framed(f,a0,z0,w,h,art,gilt=true){
  const U=Math.abs(f.k==='I'?G.jx:G.ix), W=w*U, H=h*G.cz, fc=gilt?K.gold:K.ink;
  const [hx,hy]=[a0+w/2,z0+h+1.3];
  fl(f,a0+w*.18,z0+h,hx,hy,K.brassD); fl(f,a0+w*.82,z0+h,hx,hy,K.brassD);
  fq(f,a0,z0,a0+w,z0+h,(a,z)=>{
    const lx=(a-a0)*U, ly=(z0+h-z)*G.cz, d=Math.min(lx,ly,W-lx,H-ly);
    if(d<1) return lit(fc,.5);
    if(d<2.7) return gilt?lit(fc,d<1.9?1.3:.85):lit(fc,d<1.9?2.2:1.2);
    if(d<4.3) return d<3.5?lit(K.paper,.85+.1*Math.min(1,ly/H*3)):lit(K.ink,.8);
    return art(lx-4.3,ly-4.3,W-8.6,H-8.6);
  });
}
/** Outlines a union-of-capsules figure: pale body with dark edge. */
function inkFigure(/** @type {number} */x,/** @type {number} */y,/** @type {(x:number,y:number)=>boolean} */body,/** @type {(x:number,y:number)=>boolean} */dark,/** @type {number} */flesh){
  if(!body(x,y)) return 0;
  const edge=!(body(x-1,y)&&body(x+1,y)&&body(x,y-1)&&body(x,y+1));
  return edge||dark(x,y)?K.ink:flesh;
}
/** Prize-fight engraving: two bare-knuckle boxers squared up inside the ropes before a crowd. */
function fightArt(/** @type {number} */x,/** @type {number} */y,/** @type {number} */W,/** @type {number} */H){
  let c=lit(K.paper,.92-.05*sm(0,H,y)); const hatch=(Math.floor(y)&1)&&y<H*.45;
  if(hatch) c=lit(c,.88);
  // crowd heads
  if(y<H*.2&&[2,5.5,9,12.5,16,19].some((cx,k)=>disc(x,y,cx+(k&1),3.8+(k%3),1.6))) c=K.ink;
  // ropes and corner posts
  if((Math.abs(y-H*.4)<.6||Math.abs(y-H*.52)<.6)&&x>1) c=lit(K.ink,1.4);
  if(Math.abs(x-1)<.8&&y>H*.32&&y<H*.9) c=K.ink;
  // ring floor
  if(y>H*.84) c=lit(K.paper,.68+.12*((Math.floor(y)&1)?1:0));
  const mid=W/2;
  const fig=(/** @type {number} */xx,/** @type {number} */yy,/** @type {number} */lead)=>{
    const body=(/** @type {number} */a,/** @type {number} */b)=>disc(a,b,8,6.4,2.4)||cap(a,b,8,10,8.2,17.5,2.5)||cap(a,b,8.2,17,6.2,23,1.6)||cap(a,b,6.2,23,4.2,28.5,1.3)||cap(a,b,8.4,17,10.6,23,1.6)||cap(a,b,10.6,23,12.4,28.5,1.3)||
      cap(a,b,8.6,10.5,12.2,11.5+lead,1.2)||cap(a,b,12.2,11.5+lead,14.8,9+lead,1.1)||disc(a,b,15.4,8.6+lead,1.5)||cap(a,b,8,11,10.4,14.5,1.2)||cap(a,b,10.4,14.5,11.2,10.5,1.1)||disc(a,b,11.4,9.8,1.4);
    const dark=(/** @type {number} */a,/** @type {number} */b)=>b>17&&b<21.4&&a>5.5&&a<11||(b<4.3);
    return inkFigure(xx,yy,body,dark,lit(K.paper,1.12));
  };
  const ox=2.5, f1=fig(x-ox,y-1,0); if(f1) return f1;
  const f2=fig(W-x-ox+.5,y-2,2.2); if(f2) return f2;
  return c;
}
/** A gentleman's racing print: two horses at full gallop, jockeys in colours, over a green rise. */
function raceArt(/** @type {number} */x,/** @type {number} */y,/** @type {number} */W,/** @type {number} */H){
  let c=mix(rgb('#a9b5b0'),rgb('#d8cfa8'),sm(0,H*.65,y));
  if(y>H*.66) c=lit(mix(rgb('#4d6a35'),rgb('#2f4a26'),sm(H*.66,H,y)),.9+.15*vn(x*.4,y*.5));
  if(Math.abs(y-H*.66)<.5) c=lit(K.paper,1.2);
  const horse=(/** @type {number} */cx,/** @type {number} */cy,/** @type {number} */col,/** @type {number} */silk)=>{
    const hx=x-cx, hy=y-cy;
    if(disc(hx,hy,1.6,-4.7,1.1)) return silk;   // cap
    if(cap(hx,hy,.6,-1.8,1.6,-4,1.3)) return silk;
    if(cap(hx,hy,-3.2,0,3.2,.2,2.1)||cap(hx,hy,3,-.6,6,-3.6,1.1)||cap(hx,hy,5.8,-3.6,8.4,-2.4,.9)||cap(hx,hy,-3,-.6,-6.2,.8,.5)||
       cap(hx,hy,2.8,1,6.8,3.4,.6)||cap(hx,hy,2.4,1.2,5.2,4.8,.6)||cap(hx,hy,-2.8,1,-7,3.2,.6)||cap(hx,hy,-2.4,1.2,-5.4,4.6,.6)) return col;
    return 0;
  };
  return horse(11,H*.52,rgb('#3a2418'),rgb('#a22b2b'))||horse(5.6,H*.4,rgb('#8a4a22'),rgb('#2c4f93'))||c;
}
/** A tall ship in full sail on a swell, black-and-cream like a chandler's engraving. */
function shipArt(/** @type {number} */x,/** @type {number} */y,/** @type {number} */W,/** @type {number} */H){
  let c=mix(rgb('#b9b9a0'),rgb('#dbd0aa'),sm(0,H*.7,y));
  const sea=H*.8; if(y>sea) c=lit(rgb('#3f5a5c'),.85+.3*Math.sin(x*1.3+y*2.4)*.5+.15);
  const mx=W/2;
  if(y>sea-3.2&&y<sea+.8&&Math.abs(x-mx)<W*.42-(sea+.8-y)*-.0&&y>sea-3.2+Math.abs(x-mx)*.28) c=y<sea-2.2?lit(rgb('#6b4a2a'),.9):K.ink;       // hull
  const masts=[mx-.3];
  for(const m of masts) if(Math.abs(x-m)<.45&&y>2&&y<sea-2.5) c=K.ink;
  const sails=[[3.5,7.5,3],[8,13.5,4.4],[14.2,19.4,5.4]];
  for(const [y0,y1,hw] of sails) if(y>y0&&y<y1&&Math.abs(x-(mx-.3))<hw*(1+(y-y0)/(y1-y0)*.15)){ const ed=Math.min(y-y0,y1-y,hw-Math.abs(x-mx+.3)); c=ed<.8?K.ink:lit(rgb('#eadfb8'),.85+.18*Math.cos((x-mx)*.6)+.0); if(Math.abs(y-(y0+y1)/2)<.4) c=lit(c,.78); }
  if(disc(x,y,mx-.3+1,2.2,.9)||(y>1.4&&y<2.8&&x>mx&&x<mx+3.3&&y<2+(x-mx)*.05+1)) c=rgb('#9a2a2a');
  if(cap(x,y,mx+2,sea-2.8,mx+6.5,sea-5,.35)) c=K.ink;     // bowsprit
  return c;
}
/** A gilt-framed oil: river at dusk. */
function landscapeArt(/** @type {number} */x,/** @type {number} */y,/** @type {number} */W,/** @type {number} */H){
  const hor=H*.52;
  if(y<hor) return mix(rgb('#d89a54'),rgb('#5f6a78'),sm(0,hor,y)*.9+.1*vn(x*.2,y*.3));
  if(y<hor+.4) return rgb('#e8b774');
  const hill=hor-2.4-3.4*vn(x*.12+4,2); if(y<hor+1&&y>hill) return rgb('#2a3128');
  const ref=mix(rgb('#b27b45'),rgb('#2a3438'),sm(hor,H,y)); return lit(ref,.85+.3*vn(x*.7,y*.2));
}
/** A paper notice pinned in a frame: ruled text lines and a heavy heading. */
function noticeArt(/** @type {number} */x,/** @type {number} */y,/** @type {number} */W,/** @type {number} */H){
  const line=Math.floor(y/2.2); if(y<3.5) return (y>1&&y<3&&x>1&&x<W-1)?K.ink:K.paper;
  return (y-line*2.2<1&&(Math.sin(line*3.7)*.3+.7)*W>x&&x>1)?lit(K.ink,1.8):K.paper;
}

/* ---------- gas light ---------- */
/** Lit gas globes: brass bracket arm plus a glass shade, returned positions are used by the glow pass. */
const LAMPS=/** @type {{f:Face,a:number,z:number}[]} */([
  {f:{k:'I',c:0},a:3.1,z:23},{f:{k:'I',c:0},a:9.9,z:23},{f:{k:'J',c:0},a:3.15,z:22.5},{f:{k:'J',c:0},a:7.7,z:27.6},
]);
/** World position of a bracket's shade centre. @param {{f:Face,a:number,z:number}} l */
function lampPos(l){ const [i,j]=pp(l.f,l.a); return l.f.k==='I'?[i+.55,j,l.z+1.3]:[i,j+.55,l.z+1.3]; }
/** A glass shade on a brass cup. */
function shade(/** @type {number} */i,/** @type {number} */j,/** @type {number} */z,r=.17){
  cyl(i,j,r*.55,z,z+.7,(zz,s)=>lit(K.brass,roundLit(s)*1.15),(s,v)=>lit(K.brassL,1));
  cyl(i,j,r,z+.7,z+3,(zz,s)=>{ const e=1-s*s; return mix(rgb('#e9b560'),rgb('#fff1c0'),Math.min(1,e*.85+.1)); },(s,v)=>mix(K.glassW,K.flame,Math.min(1,v*v)),.28);
}
function wallBracket(/** @type {{f:Face,a:number,z:number}} */l){
  const f=l.f, [pi,pj]=lampPos(l), [wi,wj]=pp(f,l.a), out=f.k==='I'?[1,0]:[0,1];
  isoLineThin(wi,wj,l.z+.2,wi+out[0]*.28,wj+out[1]*.28,l.z-.3,K.brassD);
  isoLineThin(wi+out[0]*.28,wj+out[1]*.28,l.z-.3,pi,pj,l.z+.2,K.brass);
  isoLineThin(wi,wj,l.z-.5,pi,pj,l.z+.15,lit(K.brass,1.3));
  fq(f,l.a-.12,l.z-.5,l.a+.12,l.z+.7,(a,z)=>lit(K.brass,.7+.6*sm(l.a-.12,l.a+.12,a)));
  shade(pi,pj,l.z+.1);
}


/* ---------- doors and boards on wall i=0 ---------- */
/** Panelled door in architrave; tall = z top of the leaf. @param {Face} f */
function panelDoor(f,a0,a1,z0,z1,body,knobAt,glassTop=false){
  const FI={k:f.k,c:f.c+.05}, aw=.11;
  // architrave with a little cornice head
  fq(FI,a0-aw,z0,a1+aw,z1+aw+.5,(a,z)=>{ const d=Math.min(a-(a0-aw),a1+aw-a); return lit(K.mahogL,(d<.03?1.1:.55)*(.95+.1*vn(a*8,z*.5))*(z>z1+aw?.9:1)); });
  fl(FI,a0-aw-.04,z1+aw+.5,a1+aw+.04,z1+aw+.5,lit(K.mahogL,1.6));
  fq(f,a0,z0,a1,z1,(a,z,x,y)=>{
    const u=(a-a0)/(a1-a0), pz=(z-z0)/(z1-z0), grain=.85+.25*vn(a*9,z*.35)+.04*Math.sin(a*90+z*.4);
    const st=.14, inU=u>st&&u<1-st, rails=[[.06,.36],[.42,.62],[.68,.94]];
    let k=grain;
    const pan=(inU&&rails.some(([r0,r1])=>pz>r0&&pz<r1));
    if(pan){ const r=rails.find(([r0,r1])=>pz>r0&&pz<r1)||rails[0]; const du0=(u-st)*(a1-a0)*18, du1=(1-st-u)*(a1-a0)*18, dz0=(pz-r[0])*(z1-z0)*3, dz1=(r[1]-pz)*(z1-z0)*3; k*=dz1<1.4?1.55:du0<1.4?1.3:dz0<1.4?.5:du1<1.4?.6:1.05; }
    else if(inU) k*=.82;
    if(pz<.03) k*=.4;
    return lit(body,k);
  });
  // knob and keyhole plate
  const kz=z0+(z1-z0)*.46, [ki,kj]=pp({k:f.k,c:f.c+.12},knobAt);
  fq(FI,knobAt-.07,kz-1.25,knobAt+.07,kz+.2,(a,z)=>lit(K.brass,.7+.5*sm(knobAt-.07,knobAt+.07,a)));
  cyl(ki+(f.k==='I'?.08:0),kj+(f.k==='J'?.08:0),.09,kz-.6,kz-.1,(zz,s)=>lit(K.brass,roundLit(s)*1.5),(s,v)=>lit(K.brassL,1));
}
function kitchenDoor(){
  const F={k:'I',c:0}, k=PUB.kitchen;
  // dark gap above the leaf's threshold and a lintel shadow
  panelDoor(F,k.j0,k.j1,0,20.6,rgb('#33503f'),k.j1-.2);
  // brass plaque
  const c=(k.j0+k.j1)/2, pa=c-.5, pb=c+.5, pz0=14.4, pz1=16.8, FP={k:'I',c:.08};
  fq(FP,pa,pz0,pb,pz1,(a,z)=>{ const d=Math.min(a-pa,pb-a)*18, e=Math.min(d,(z-pz0)*3,(pz1-z)*3); return lit(K.brass,e<1?1.4:.95); });
  glyphs(FP,c+.5-.04-.0,pz1-.45,'STAFF',K.ink,1);
}
function landingDoor(){
  const F={k:'I',c:0}, L=PUB.landingDoor;
  panelDoor(F,L.j0+.05,L.j1-.05,18,31.3,rgb('#2c3a2e'),L.j1-.2);
}
function chalkboard(){
  const F={k:'I',c:.05}, a0=3.38, a1=4.22, z0=12.2, z1=25.6;
  fq(F,a0,z0,a1,z1,(a,z)=>{ const e=Math.min((a-a0)*18,(a1-a)*18,(z-z0)*3,(z1-z)*3); if(e<1.6) return lit(K.mahog,e<.9?1.35:.8); const sm_=vn(a*6,z*.5); return lit(rgb('#202b27'),.85+.25*sm_*sm_); });
  const chalk=rgb('#d9d5c4');
  glyphs(F,a1-.1,z1-1.0,'FARE',chalk,1);
  fl(F,a1-.1,z1-3.1,a0+.1,z1-3.1,lit(chalk,.8));
  [['PIE',.8],['ALE',.7],['RUM',.75],['GIN',.6]].forEach(([w,k],n)=>{ glyphs(F,a1-.13,z1-4.3-n*2.35,/** @type {string} */(w),lit(chalk,/** @type {number} */(k)),1); });
  fq(F,a0+.2,z0+.5,a0+.62,z0+.7,()=>lit(chalk,.7));         // chalk ledge dust
  fq({k:'I',c:.12},a0-.03,z0-.7,a1+.03,z0,(a,z)=>lit(K.mahog,.8+.5*sm(a0,a1,a)*0));
}

/* ---------- chimney breast, grate, mantel ---------- */
const FIRE={a0:PUB.fire.j0, a1:PUB.fire.j1, c:.55, o0:7.62, o1:9.18, zO:.55, zT:8.7};
const FFIRE={x0:7.95,x1:8.85,z0:.55,z1:8.6};
function tileAt(/** @type {number} */a,/** @type {number} */z){
  const col=Math.floor(a*3.6), row=Math.floor(z/1.7), id=(col+row)&1, fa=(a*3.6-col), fz=z/1.7-row;
  const e=Math.min(fa,1-fa,fz,1-fz); let c=id?rgb('#d0c8a8'):rgb('#305d62');
  if(Math.hypot(fa-.5,fz-.5)<.28) c=id?rgb('#2f5d62'):rgb('#d0c8a8');
  return lit(c,(e<.1?.55:.95)*(.88+.12*sm(.1,.3,1-fz)));
}
function fireplace(){
  const P=PUB.fire, B={k:'I',c:FIRE.c}, S={k:'J',c:P.j1};
  // side of the breast (faces +j), darker
  fq(S,0,0,FIRE.c,38,(a,z,x,y)=>lit(wallAt(a*3,z,'I',x,y),.62));
  // the front: paper above, black slate chimney-piece below the mantel
  fq(B,P.j0,0,P.j1,38,(a,z,x,y)=>z>=11.4?lit(wallAt(a,z,'I',x,y),1.0+.05*sm(P.j0,P.j0+.15,a)):0);
  fq(B,P.j0,0,P.j1,11.5,(a,z)=>{
    const vein=Math.abs(vn(a*2.6+3,z*.24)-.5), edge=Math.min(a-P.j0,P.j1-a)*18, k=.8+.3*vn(a*3,z*.5);
    let c=mix(K.slate,rgb('#6d6e72'),Math.max(0,1-vein*14)*.6);
    if(edge<1.4) c=lit(c,1.5); else if(edge>2&&edge<2.9) c=mix(c,K.gold,.35);
    if(z<.6) c=lit(c,.5);
    return lit(c,k);
  });
  // frieze tablet under the shelf
  fq(B,P.j0+.35,9.7,P.j1-.35,11.0,(a,z)=>{ const e=Math.min(a-(P.j0+.35),(P.j1-.35)-a)*18, d=Math.min(e,(z-9.7)*3,(11-z)*3); return d<1.1?lit(K.brass,1.1):lit(rgb('#34353a'),.9+.2*vn(a*5,z)); });
  for(const a of [P.j0+.75,(P.j0+P.j1)/2,P.j1-.75]) fq(B,a-.1,10.0,a+.1,10.75,(x_,z)=>lit(K.brass,.8+.4*sm(10,10.8,z)));
  // opening: soot-black fireback with iron relief
  fq(B,FIRE.o0,FIRE.zO,FIRE.o1,FIRE.zT,(a,z)=>{
    const f=Math.min(1,Math.max(0,(a-FIRE.o0)/(FIRE.o1-FIRE.o0)));
    const cheek=a<FFIRE.x0-.02||a>FFIRE.x1+.02;
    if(cheek) return tileAt(a-FIRE.o0,z-FIRE.zO);
    const relief=Math.abs(Math.sin((a-FFIRE.x0)*17))*.0+vn(a*7,z*.8)*.5;
    return lit(rgb('#1b1311'),.5+.9*relief+.5*sm(.4,.9,Math.abs(f-.5)*2));
  });
  // iron register hood and opening edge
  fq(B,FIRE.o0-.06,FIRE.zT,FIRE.o1+.06,FIRE.zT+.95,(a,z)=>{ const d=(z-FIRE.zT)*3; return lit(K.iron,d<1?2.4:d>2.1?.8:1.2+.4*vn(a*9,z)); });
  fl(B,FIRE.o0,FIRE.zO,FIRE.o0,FIRE.zT,lit(K.iron,2)); fl(B,FIRE.o1,FIRE.zO,FIRE.o1,FIRE.zT,lit(K.iron,.8));
  // mantel shelf: top face, front edge, underside shadow
  const my=11.45, mt=12.55, mi=.98;
  quad(.0,P.j0-.4,mt,.0,P.j1+.5,mt,mi,P.j1+.5,mt,mi,P.j0-.4,mt,(x,y)=>{ const [i,j]=gnd(x,y,mt); return lit(rgb('#4a2a1a'),1.0+.35*sm(.2,.9,i)+.1*vn(j*3,i*4)); });
  quad(mi,P.j0-.4,my,mi,P.j1+.5,my,mi,P.j1+.5,mt,mi,P.j0-.4,mt,(x,y)=>{ const j=(x+.5-G.ox-mi*G.ix)/G.jx, z=(G.oy+mi*G.iy+j*G.jy-y-.5)/G.cz; return lit(K.mahogL,.8+.7*sm(my,mt,z)*sm(mt,my+.5,z+.0)+.2*sm(my+.7,mt,z)); });
  quad(mi,P.j1+.5,my,mi,P.j1+.5,mt,.0,P.j1+.5,mt,.0,P.j1+.5,my,(x,y)=>lit(K.mahog,.55));
  // shadow under the shelf on the breast
  fq(B,P.j0,10.6,P.j1,11.45,(a,z)=>0);
  // corbels
  for(const a of [P.j0-.15,P.j1+.15]) fq({k:'I',c:FIRE.c+.2},a-.12,8.6,a+.12,11.45,(x_,z)=>lit(K.mahog,.7+.6*sm(8.6,11.45,z)));
}
/** Hearth stone, brass fender, coal scuttle and fire irons. */
function hearth(){
  const P=PUB.fire, h=P.hearth, hz=.5, j0=P.j0-.25, j1=P.j1+.25;
  flo(0,j0,h,j1,hz,(i,j)=>{ const slab=Math.floor(i*1.2+Math.floor(j*.8)*.3), seam=Math.min(((i*1.2)%1+1)%1,((j*.8)%1+1)%1); return lit(rgb('#5a574f'),(seam<.05?.55:1)*(.85+.3*vn(i*3+slab,j*3))*(.75+.4*sm(0,h,i))); });
  quad(h,j0,0,h,j1,0,h,j1,hz,h,j0,hz,(x,y)=>{ const j=(x+.5-G.ox-h*G.ix)/G.jx; return lit(rgb('#6b675d'),.8+.3*vn(j*5,3)); });
  quad(0,j1,0,h,j1,0,h,j1,hz,0,j1,hz,()=>lit(rgb('#4a4741'),.8));
  // brass fender
  const fi=.96, B=K.brass, top=2.1;
  for(let k=0;k<=9;k++){ const j=P.j0-.05+(P.j1-P.j0+.1)*k/9; isoLineThin(fi,j,hz,fi,j,top,k%3===0?lit(B,1.3):B); }
  isoLineThin(fi,P.j0-.05,top,fi,P.j1+.05,top,K.brassL); isoLineThin(fi,P.j0-.05,top-.35,fi,P.j1+.05,top-.35,lit(B,1.1));
  isoLineThin(fi,P.j0-.05,1.1,fi,P.j1+.05,1.1,B); isoLineThin(fi,P.j0-.05,hz+.5,fi,P.j1+.05,hz+.5,lit(B,.8));
  for(const j of [P.j0-.05,P.j1+.05]){ isoLineThin(fi,j,top,.55,j,top,B); isoLineThin(fi,j,top-.35,.55,j,top-.35,lit(B,.8)); isoLineThin(fi,j,hz,fi,j,top+.1,K.brassL); }
  // fire irons in a stand
  for(const [dj,len,c] of [[-.08,6.2,K.iron],[0,5.7,lit(K.iron,1.5)],[.08,5.9,K.iron]]) { isoLineThin(.62,7.45+dj,hz,.62,7.45+dj,hz+len,c); isoLineThin(.62,7.45+dj,hz+len,.62,7.45+dj,hz+len+.4,K.brassL); }
  cyl(.62,7.45,.17,hz,hz+.7,(z,s)=>lit(K.brass,roundLit(s)*1.2),(s,v)=>lit(K.brassL,.9));
  // coal scuttle: japanned bucket with a brass rim, heaped with coal
  cyl(.68,9.42,.26,hz,hz+3.5,(z,s)=>lit(z>hz+3.1?K.brass:rgb('#1d1d20'),roundLit(s)*(z>hz+3.1?1.1:1.6)*(.9+.1*Math.sin(z*5))),(s,v)=>lit(rgb('#26252a'),1+.5*(vn(s*5+9,v*5))),.12);
  isoLineThin(.68,9.14,hz+3.2,.68,9.7,hz+3.2,lit(K.brass,1.1));
}
/** Overmantel mirror, mantel clock, candlesticks and Staffordshire spaniels. */
function mantelDecor(){
  const P=PUB.fire, mid=(P.j0+P.j1)/2, M={k:'I',c:FIRE.c+.04};
  // overmantel: gilt frame, crest, glass reflecting the warm room
  const a0=mid-.82,a1=mid+.82,z0=14.2,z1=29.2, W=(a1-a0)*18, H=(z1-z0)*3;
  fq(M,a0,z0,a1,z1,(a,z)=>{
    const lx=(a-a0)*18, ly=(z1-z)*3, d=Math.min(lx,ly,W-lx,H-ly), pat=((lx+ly*.7)%5);
    if(d<1) return lit(K.gold,.45);
    if(d<4) return lit(K.gold,d<1.9?1.45:d>3.1?.7:(pat<2?1.1:.85));
    const g=ly/H, v=Math.abs(Math.sin((lx*.6+ly*.5)*.28)), glint=sm(.88,.98,Math.sin((lx*1.0-ly*.35)*.22+.4));
    const c=mix(rgb('#8da2a8'),rgb('#3a2a24'),sm(.25,1,g)*.85);
    return lit(mix(c,rgb('#e4dcc0'),glint*.55),.9+.15*vn(lx*.25,ly*.25)-.12*v*.5);
  });
  // crest: scrolled gilt top
  fq(M,mid-.5,z1,mid+.5,z1+1.0,(a,z)=>{ const u=Math.abs(a-mid)/.5; return z<z1+1.0*(1-u*u)?lit(K.gold,.8+.5*(1-u)):0; });
  fq(M,mid-.14,z1+.95,mid+.14,z1+1.7,(a,z)=>lit(K.brassL,.85+.3*Math.cos((a-mid)*14)));
  // items on the shelf (plane in front of the mirror)
  const I2={k:'I',c:.74}, z0m=12.6;
  // clock: black marble case, white dial
  { const ca=mid-.3, cb=mid+.3, zt=z0m+4.1;
    fq(I2,ca,z0m,cb,zt,(a,z)=>{ const lx=(a-ca)*18, ly=(zt-z)*3, W2=(cb-ca)*18, d=Math.min(lx,ly,W2-lx,(z-z0m)*3);
      if(ly<2) return lit(rgb('#2c2c30'),1.6-ly*.2);
      const dx=lx-W2/2, dy=ly-6.3, r=Math.hypot(dx,dy);
      if(r<3.6){ const ang=Math.atan2(dy,dx), tick=Math.abs(((ang/(Math.PI/6))%1+1)%1-.5)>.42&&r>2.6;
        if(tick||(Math.abs(dx*.9+dy*.8)<.6&&dy<=.6&&dy>-2.6&&dx>-.2)||(Math.abs(dy)<.55&&dx>-.3&&dx<2)) return K.ink; return rgb('#ece4cc'); }
      if(r<4.3) return K.brassL;
      return d<1?lit(K.brass,.8):lit(rgb('#1f1f23'),1.0+.3*sm(0,W2,lx)); }); }
  // candlesticks
  for(const a of [mid-.78,mid+.78]){
    fq(I2,a-.07,z0m,a+.07,z0m+2.7,(x_,z)=>lit(K.brass,.8+.5*sm(z0m,z0m+2.7,z)*.5+.4*Math.sin((z-z0m)*3.2)*.4));
    fq(I2,a-.11,z0m,a+.11,z0m+.45,()=>lit(K.brass,1.1));
    fq(I2,a-.05,z0m+2.7,a+.05,z0m+4.2,()=>lit(rgb('#ece0bd'),1));
    fq(I2,a-.03,z0m+4.2,a+.03,z0m+4.9,()=>K.flame);
  }
  // Staffordshire spaniels, facing each other
  for(const [a,dir] of [[P.j0+.12,1],[P.j1-.12,-1]]){
    const w=.5, zt=z0m+3.6;
    fq(I2,a-w/2,z0m,a+w/2,zt,(aa,z)=>{ const x=((aa-(a-w/2))*18)*(dir>0?1:-1)+(dir>0?0:0), lx=dir>0?(aa-(a-w/2))*18:(a+w/2-aa)*18, ly=(zt-z)*3;
      if(ly>9.2) return lit(rgb('#d8d0b8'),.8);                                  // plinth
      if(disc(lx,ly,5.6,1.8,1.3)) return rgb('#111');                              // nose
      if(cap(lx,ly,6,2.8,6.8,5.6,1.1)) return rgb('#b66a36');                        // ear
      if(disc(lx,ly,5,3.2,2)) return lit(rgb('#ece4cc'),1);
      if(cap(lx,ly,2.6,7.5,5.2,6,2.7)||disc(lx,ly,3.4,6.4,2.8)||cap(lx,ly,5,6,5.3,9,1)) return (lx<3.4&&ly>5&&ly<6.8)?rgb('#b66a36'):lit(rgb('#ece4cc'),.92);
      return 0; });
    fl(I2,a-dir*.06,z0m+2.6,a+dir*.15,z0m+2.0,K.brassL);
  }
}


/* ---------- wall j=0: clock, bell, sign, plate rail ---------- */
/** The longcase clock: plinth, trunk with a pendulum window, hood with a painted dial and brass finial. */
function longcase(){
  const [i0,j0,i1,j1]=PUB.clock.box, ma=(i0+i1)/2, wood=rgb('#4a2a17'), D=j1;
  const F=(/** @type {number} */c)=>({k:'J',c}), S=(/** @type {number} */c)=>({k:'I',c});
  const gr=(/** @type {number} */a,/** @type {number} */z)=>.85+.3*vn(a*14,z*.25)+.05*Math.sin(a*120);
  // side faces (+i), darker
  const side=(/** @type {number} */c,/** @type {number} */za,/** @type {number} */zb,/** @type {number} */d,/** @type {number} */k)=>fq(S(c),0,za,d,zb,(a,z)=>lit(wood,k*gr(a*2,z)*(.8+.3*sm(0,d,a))));
  side(i1+.03,0,4,D+.05,.8); side(i1-.07,4,20,D,.7); side(i1+.05,20,26.6,D+.05,.8);
  // plinth
  fq(F(D+.05),i0-.05,0,i1+.05,4,(a,z)=>{ const e=Math.min((a-i0+.05)*18,(i1+.05-a)*18); const k=gr(a,z)*(z>3.4?1.45:(z<.5?.55:1))*(e<1?1.3:1); const panel=z>.9&&z<2.8&&a>i0+.08&&a<i1-.08; return lit(wood,k*(panel?1.12:.92)); });
  // trunk and door
  fq(F(D),i0+.06,4,i1-.06,20,(a,z)=>{ const e=Math.min((a-i0-.06)*18,(i1-.06-a)*18); return lit(wood,gr(a,z)*(e<1?1.4:.95)); });
  const dz0=5.2, dz1=19.2, da0=i0+.14, da1=i1-.14;
  fq(F(D+.03),da0,dz0,da1,dz1,(a,z)=>{ const lx=(a-da0)*18, ly=(dz1-z)*3, W=(da1-da0)*18, H=(dz1-dz0)*3, d=Math.min(lx,ly,W-lx,H-ly);
    if(d<1.2) return lit(wood,.5);
    const wy=ly-H*.45, wx=lx-W/2, inside=(wx*wx)/(((W/2-2.2))**2)+(wy*wy)/(((H*.33))**2)<1;
    if(inside){ const bob=Math.hypot(wx+.0,ly-(H*.45+H*.22))<2.6, rod=Math.abs(wx)<.5&&ly<H*.45+H*.22&&ly>H*.1;
      if(bob) return lit(K.brassL,1.05-.35*sm(-2.6,2.6,wx)); if(rod) return K.brass; return mix(rgb('#10100f'),rgb('#3a4a50'),sm(.2,.8,Math.sin(wx*.35+wy*.12)*.5+.5)*.4); }
    if(Math.hypot(wx,wy)<(W/2-1.2)&&inside===false&&(wx*wx)/(((W/2-1.2))**2)+(wy*wy)/(((H*.35))**2)<1) return lit(K.brass,.9);
    return lit(wood,gr(a,z)*(d<2.2?1.25:1.08)); });
  cyl(i1-.2,D+.05,.05,10.5,11.1,(z,s)=>lit(K.brass,roundLit(s)*1.6),(s,v)=>K.brassL);
  // hood: dial, columns, cornice, finial
  fq(F(D+.06),i0-.05,20,i1+.05,26.6,(a,z)=>{ const lx=(a-i0+.05)*18, W=(i1-i0+.1)*18, ly=(26.6-z)*3, d=Math.min(lx,W-lx);
    const cx=W/2, cy=ly-9.6, r=Math.hypot(lx-cx,cy);
    if(r<6.6){ const ang=Math.atan2(cy,lx-cx);
      if(r>5.1) return lit(K.brass,1.2-.5*sm(-6,6,lx-cx));
      const tick=r>3.6&&Math.abs(((ang/(Math.PI/6))%1+1)%1-.5)>.4;
      const hr=Math.abs((lx-cx)*Math.cos(-2)+cy*Math.sin(-2))<.65&&((lx-cx)*Math.sin(-2)*-1+cy*Math.cos(-2)*0)<=0&&r<3.4&&((lx-cx)*-.416+cy*-.909)>0;
      const mn=Math.abs((lx-cx)*.9-cy*.43)<.5&&r<4.9&&((lx-cx)*.43+cy*.9)>0&&false;
      const minute=Math.abs((lx-cx)*.97+cy*.25)<.55&&r<5&&(-(lx-cx)*.25+cy*.97)>0&&false;
      const hand1=Math.abs((lx-cx)*.6+cy*.8)<.6&&r<3.4&&(-(lx-cx)*.8+cy*.6)<0, hand2=Math.abs(-(lx-cx)*.55*-1*0+((lx-cx)*.96-cy*.28))<.55&&r<4.7&&((lx-cx)*.28+cy*.96)>-0&&false;
      const m1=Math.abs((lx-cx)*.95-cy*.3)<.55&&r<4.8&&((lx-cx)*.3+cy*.95)<0;
      if(tick||hand1||m1||r<.9) return K.ink; return lit(rgb('#e9e1c5'),.95+.1*vn(lx*.3,ly*.3)); }
    if(d<2.2) return lit(K.brass,1.1-d*.12);
    if(ly<1.2) return lit(K.brassL,1);
    return lit(wood,gr(a,z)*(1.05)*(ly<2.4?1.25:1)); });
  fq(F(D+.1),i0-.1,26.6,i1+.1,27.7,(a,z)=>lit(wood,(z>27.3?1.5:(z<26.9?.5:1.1))*gr(a,z)));
  quad(i0-.1,0,27.7,i1+.1,0,27.7,i1+.1,D+.1,27.7,i0-.1,D+.1,27.7,()=>lit(wood,1.35));
  cyl(ma,D*.6,.09,27.7,29,(z,s)=>lit(K.brass,roundLit(s)*1.4),(s,v)=>K.brassL,.5);
  side(i1+.1,26.6,27.7,D+.1,1.0);
}
/** A ship's bell, brass on an iron bracket with a plaited lanyard. */
function shipsBell(){
  const F={k:'J',c:.1}, a=10.95, z0=15.2, hgt=4, top=z0+hgt;
  fq(F,a-.06,top+.1,a+.06,top+1.6,()=>K.iron);
  fq(F,a-.35,top+1.5,a+.35,top+1.75,()=>lit(K.iron,1.2));
  fq(F,a-.35,top+1.45,a-.28,top+.2,()=>K.iron);
  fq(F,a-.34,z0,a+.34,top,(x,z)=>{ const t=(top-z)/hgt, hw=.12+.22*Math.pow(t,1.5), d=Math.abs(x-a); if(d>hw) return 0;
    const sh=1.15-.75*sm(-hw,hw,(x-a))*1.0+.15*Math.sin(t*9); return lit(K.brass,Math.max(.5,sh)*(t>.93?.5:1)*(t<.06?1.4:1)); });
  fq(F,a-.22,z0-.15,a+.22,z0+.05,()=>lit(rgb('#1b1208'),1));
  fl(F,a,z0-.2,a,z0-2.4,rgb('#b09566')); fl(F,a+.04,z0-.4,a+.04,z0-2.4,rgb('#8a7048'));
  fq(F,a-.06,z0-3.1,a+.1,z0-2.2,()=>rgb('#c4a874'));
}
/** The gilt-on-green fascia over the back bar. */
function fascia(){
  const F={k:'J',c:.03}, a0=4.65, a1=10.75, z0=30.95, z1=35;
  fq(F,a0,z0,a1,z1,(a,z)=>{ const e=Math.min((a-a0)*18,(a1-a)*18,(z-z0)*3,(z1-z)*3); if(e<1) return lit(K.gold,.6); if(e<2.2) return e<1.6?lit(K.brassL,.9):lit(K.gold,.55);
    return lit(K.green,.55+.15*vn(a*3,z*.4)); });
  glyphs(F,(a0+a1)/2-2.83,z1-1.35,'ROPE & ANCHOR',lit(K.gold,1.15),2);
  for(const a of [a0+.12,a1-.12]) { const [x,y]=fpt(F,a,(z0+z1)/2); psetK(Math.round(x),Math.round(y),K.brassL); }
}
/** A plate rail over the back bar, hung with plates and stood with tankards and jugs. */
function plateRail(){
  const F={k:'J',c:.28}, z=27.2, top=(/** @type {number} */a0,/** @type {number} */a1)=>quad(a0,0,z,a1,0,z,a1,.34,z,a0,.34,z,()=>lit(K.mahogL,1.0));
  top(4.85,10.6);
  fq(F,4.85,z-.55,10.6,z,(a,zz)=>lit(K.mahog,(zz>z-.15?1.5:.9)*(.9+.2*vn(a*5,zz))));
  for(let n=0;n<11;n++){
    const a=5.1+n*.5; if(a>7.2&&a<8.25) continue; if(a>10.4) break;
    const kind=n%3, G2={k:'J',c:.2}, zt=z+2.9;
    fq(G2,a-.22,z,a+.22,zt,(aa,zz)=>{ const lx=(aa-(a-.22))*18, ly=(zt-zz)*3;
      if(kind===0){ const d=Math.hypot(lx-4,ly-4.4); if(d>4.3) return 0; return d>3?rgb('#e6e0cc'):d>2.2?rgb('#2e4f8f'):d>1.3?rgb('#e6e0cc'):rgb('#7a8fbf'); }
      if(kind===1){ if(lx>=1&&lx<6.4&&ly>1.5&&ly<8.6) return lit(rgb('#9ea3a6'),1.35-lx*.12+(ly<2.4?.25:0)); if(lx>=6.4&&lx<8&&ly>2.8&&ly<6.8&&!(lx<7.2&&ly>3.8&&ly<5.6)) return lit(rgb('#8a8f92'),1); return 0; }
      const hw=2.2+1.4*Math.sin(Math.min(1,Math.max(0,(ly-1)/7))*Math.PI*.9); if(Math.abs(lx-3.8)<hw&&ly>1&&ly<8.4) return lit(rgb('#8a5a32'),1.3-sm(0,7,lx)*.6); if(lx>=7&&lx<8.2&&ly>2.5&&ly<6.5&&!(lx<7.6&&ly>3.6)) return rgb('#7a4d2a'); return 0; });
  }
}
function pictures(){
  const I0={k:'I',c:.04}, J0={k:'J',c:.04};
  framed(I0,1.42,14,1.42,14,fightArt,false);
  framed(J0,.55,19.5,2.1,8.4,raceArt);
  framed(I0,5.98,19.4,1.3,8,landscapeArt);
  framed(I0,10.05,13.2,1.3,13.6,shipArt,false);
  framed(J0,3.78,16.6,.8,8.8,noticeArt,false);
}

/** Baked layers: floor, walls, doors, fireplace, framed pictures, brackets. */
export function pubShellStatic(){
  cam();
  const P=PUB;
  flo(0,0,P.I,P.J,0,(i,j)=>{ const c=floorAt(i,j), m=moonAt(i,j); return m>0?mix(lit(c,1.18),K.moon,.2*m):c; });
  quad(0,0,0,0,P.J,0,0,P.J,P.H,0,0,P.H,(x,y)=>{ const j=(x+.5-G.ox)/G.jx, z=(G.oy+j*G.jy-y-.5)/G.cz; return wallAt(j,z,'I',x,y); });
  quad(0,0,0,P.I,0,0,P.I,0,P.H,0,0,P.H,(x,y)=>{ const i=(x+.5-G.ox)/G.ix, z=(G.oy+i*G.iy-y-.5)/G.cz; return wallAt(i,z,'J',x,y); });
  wallThickness();
  kitchenDoor(); landingDoor(); chalkboard();
  fireplace(); hearth(); mantelDecor();
  longcase(); shipsBell(); fascia(); plateRail(); pictures();
  for(const l of LAMPS) wallBracket(l);
  frontCut();
}
/** Free-standing shell props drawn in depth order (e.g. hanging lamps): {box,draw}. */
export function pubShellProps(/** @type {number} */t){ return []; }
/** Per-frame effects after all props: fire, lamp glow, tobacco haze, vignette. */
export function pubShellFX(/** @type {number} */t){}
