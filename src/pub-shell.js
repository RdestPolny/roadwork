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
  oakD:rgb('#4e341e'), oakL:rgb('#8a6439'), oakPale:rgb('#b18d5c'), saw:rgb('#b39663'), sawD:rgb('#7a5c35'),
  mahog:rgb('#5e2c1b'), mahogD:rgb('#2a120b'), mahogL:rgb('#8f4c2c'), brass:rgb('#c9a24a'), brassD:rgb('#6e4f1e'), brassL:rgb('#f4dc8e'),
  gold:rgb('#c9a04a'), ox:rgb('#56121a'), oxF:rgb('#72202a'), green:rgb('#12372a'), greenF:rgb('#1d5240'),
  plaster:rgb('#a89678'), nic:rgb('#6a4818'), coal:rgb('#120f0e'), iron:rgb('#18191a'), ironL:rgb('#4a4d4f'), slate:rgb('#25262a'),
  glassW:rgb('#ffe9a8'), flame:rgb('#ffd27a'), moon:rgb('#86a6d6'), paper:rgb('#cdbb92'), ink:rgb('#2a1b13'), stone:rgb('#8c8678'), black:rgb('#0b0a0a'),
};
const FONT={G:'011100101101011',B:'110101110101110',W:'101101111111101',V:'101101101101010',A:'010101111101101',P:'110101110100100',I:'111010010010111',N:'101111111101101',H:'101101111101101',R:'110101110101101',F:'111100110100100',C:'011100100100011',D:'110101101101110',E:'111100110100111',K:'101101110101101',L:'100100100100111',M:'101111111101101',O:'010101101101010',S:'011100010001110',T:'111010010010010',U:'101101101101111',Y:'101101010010010','&':'010101010101011',' ':'000000000000000','1':'010110010010111','2':'110001010100111','3':'110001010001110','4':'101101111001001','6':'011100110101010'};
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
    const s=sd*sm(.46,.7,n); c=mix(c,K.saw,s*.7); k*=1+(n-n2)*s*3;
  }
  const sp=(1-sm(0,2.8,i))*(1-sm(0,1.2,Math.abs(j-5.0)-.5+i*.18)); if(sp>0){ c=mix(c,rgb('#ffc068'),.45*sp); k*=1+.5*sp; }
  if(fj<.07||fi<.045) return lit(c,.34);
  if(fj<.15) k*=1.12; else if(fj>.93) k*=.9;
  if(fi<.12) k*=1.08;
  // beer and boot stains
  k*=1-.22*sm(.64,.78,vn(i*.55+3,j*.5+17));
  const rg=rugAt(i,j); if(rg) return lit(rg,k*.9);
  const m=matAt(i,j); if(m) return m;
  return lit(c,k);
}
/** Rag rug before the fire: concentric woven bands with a dark fringe edge. */
function rugAt(/** @type {number} */i,/** @type {number} */j){
  const u=(i-2.65)/.82, v=(j-8.4)/1.12, q=Math.pow(Math.pow(Math.abs(u),4)+Math.pow(Math.abs(v),4),.25);
  if(q>1.04) return 0;
  if(q>1) return rgb('#2a1a12');
  const bands=[rgb('#6e2a2a'),rgb('#d2c299'),rgb('#2f4a5c'),rgb('#9a6a2e'),rgb('#6e2a2a'),rgb('#d2c299')], b=Math.min(5,Math.floor((1-q)*9));
  const weave=.88+.2*vn(i*9,j*34)+(Math.floor(j*14)&1?.04:-.04);
  return lit(bands[b],weave*(q>.93?.7:1));
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
  return lit(c,(.93+.07*vn(a*.7+seed,z*.12)));
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
  const c=wallBase(a,z,kind,x,y);
  const G0=PUB.gallery;
  if(kind==='I'&&a<G0.box[3]+.4&&z<G0.z) return lit(c,(.55+.45*sm(21,8,z))*(1-.45*sm(G0.box[3]-.2,G0.box[3]+.4,a)));
  return c;
}
function wallBase(/** @type {number} */a,/** @type {number} */z,/** @type {'I'|'J'} */kind,/** @type {number} */x,/** @type {number} */y){
  const pal=PAL[kind], seed=kind==='I'?.13:.31, D=PUB.H-38;
  const nic=sm(14,PUB.H,z), nicN=.55+.45*vn(a*.4+seed*9,z*.08);
  let c;
  if(z<10.4){
    if(z>9.9) c=lit(K.mahogL,1.5);                                    // rail top lip
    else if(z>8.7) c=lit(K.mahog,(z>9.6?1.7:1.15)*(.9+.2*vn(a*4,z)));
    else if(z>8.3) c=lit(K.mahogD,.9);                                // under-rail moulding
    else c=dadoAt(a,z,seed);
    if(z<8.3&&z>7.8) c=lit(c,.9);
    // lamp-smoke stains and wall-foot grime
    c=lit(c,.84*(.95+.1*vn(a*.5,z*.3)));
    return c;
  }
  if(z<30+D){
    c=paperAt(a,z,pal,seed);
    c=lit(c,.78+.22*sm(10.4,12.8,z));
    c=mix(c,K.nic,Math.min(.5,nic*.55*nicN));
    c=lit(c,1-.3*nic*nicN);
    if(z>29+D) c=lit(c,.85+.15*(1-sm(29+D,29.9+D,z)));
    return c;
  }
  z-=D;
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
    return art(Math.floor(lx-4.3),Math.floor(ly-4.3),Math.floor(W-8.6),Math.floor(H-8.6));
  });
}
/** Outlines a union-of-capsules figure: pale body with dark edge. */
function inkFigure(/** @type {number} */x,/** @type {number} */y,/** @type {(x:number,y:number)=>boolean} */body,/** @type {(x:number,y:number)=>boolean} */dark,/** @type {number} */flesh){
  if(!body(x,y)) return 0;
  const edge=!(body(x-1,y)&&body(x+1,y)&&body(x,y-1)&&body(x,y+1));
  return edge||dark(x,y)?K.ink:flesh;
}
/** Prize-fight engraving: two bare-knuckle boxers squared up inside the ropes before a crowd, dark silhouettes on aged paper. */
function fightArt(/** @type {number} */x,/** @type {number} */y,/** @type {number} */W,/** @type {number} */H){
  const mid=W/2, ink=K.ink, c=mid-8.4;
  const man=(/** @type {number} */a,/** @type {number} */b,/** @type {number} */lead)=>
    disc(a,b,c+.6,5.4,1.9)||cap(a,b,c+.4,7,c,8.8,.9)||cap(a,b,c-2.2,9.9,c+2.2,9.9,1.4)||cap(a,b,c,10,c,14.4,1.9)||cap(a,b,c,14.4,c-3.2,17.8,1.3)||cap(a,b,c-3.2,17.8,c-4.8,H-.8,1.2)||
    cap(a,b,c,14.4,c+3,17.8,1.3)||cap(a,b,c+3,17.8,c+4.2,H-.8,1.2)||
    cap(a,b,c+2,10.2,c+3.8,12.4,.95)||cap(a,b,c+3.8,12.4,c+5.8,9.6+lead,.95)||disc(a,b,c+6,8.8+lead,1.6)||cap(a,b,c-1.8,10.4,c-.4,13.2,.95)||cap(a,b,c-.4,13.2,c+2.2,10.4,.95)||disc(a,b,c+2.6,9.6,1.3);
  const body=(/** @type {number} */xx,/** @type {number} */yy)=>man(xx,yy,0)||man(W-1-xx,yy,1.5);
  if(body(x,y)) return !body(x-1,y)&&y<16?lit(K.paper,.5):(y>13.6&&y<15.4&&body(x,y)&&Math.abs(x-c)<3.4)||(W-1-x>c-3.4&&W-1-x<c+3.4&&y>13.6&&y<15.4)?lit(K.paper,.9):ink;
  if(y<5&&[2,6,10,14,18,22,26,30,34,38].some((cx,k)=>disc(x,y,cx+.4*(k%3),2.2+(k%2)*.9,1.9))) return lit(ink,1.25);
  if(y>H-1.6) return lit(ink,1.5);
  if(y>H-3.4) return lit(K.paper,.7);
  if(Math.abs(y-8.5)<.5||Math.abs(y-12)<.5||Math.abs(y-15.2)<.5) return lit(ink,2.0);
  if(x<1.6||x>W-2.6) return lit(ink,1.5);
  return lit(K.paper,.97-.15*sm(0,H,y)+.05*vn(x*.3,y*.3));
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
/** A tall ship in full sail on a swell, in the manner of a chandler's engraving. */
function shipArt(/** @type {number} */x,/** @type {number} */y,/** @type {number} */W,/** @type {number} */H){
  const mx=W/2, sea=H*.74;
  let c=mix(rgb('#a9b0a0'),rgb('#e0d4ac'),sm(0,H*.7,y));
  if(y>sea) c=lit(mix(rgb('#2f4d52'),rgb('#47686a'),.5+.5*Math.sin(x*1.1+y*2.2)),.8+.3*sm(sea,H,y)*0+(((Math.floor(y)+Math.floor(x*.5))%3)?0:.2));
  // hull
  const deck=sea-1.6, keel=sea+1.2;
  if(y>deck&&y<keel){ const hw=W*.46-(y-deck)*1.3; if(Math.abs(x-mx)<hw) c=y<deck+1.1?lit(rgb('#d9c79a'),.9):(Math.floor(y)===Math.floor(deck+2.2)?lit(K.paper,1):K.ink); }
  // masts, yards, sails
  const sails=[[4.5,9.5,3.2],[10.4,15.8,4.7],[16.6,deck-.4,6]];
  for(const [y0,y1,hw] of sails){
    if(y>y0&&y<y1&&Math.abs(x-mx)<hw){
      const seam=Math.abs(((x-mx+hw)/2.4)%1)<.08, belly=.9+.14*Math.cos((x-mx)/hw*1.4)*(1-(y-y0)/(y1-y0)*.3);
      c=y>y1-.9?lit(rgb('#8a7e5e'),1):seam?lit(rgb('#c8bb92'),1):lit(rgb('#f1e8c6'),belly);
    }
    if(Math.abs(y-y0)<.5&&Math.abs(x-mx)<hw+1) c=K.ink;
  }
  if(Math.abs(x-mx)<.5&&y>2&&y<deck) c=K.ink;
  if(y>1.4&&y<3.4&&x>mx&&x<mx+(3.4-y)*1.6+.4) c=rgb('#a62d2d');           // pennant
  if(cap(x,y,mx,3,W*.9,deck+.4,.3)||cap(x,y,mx,3,W*.08,deck+.4,.3)) c=lit(K.ink,1.6);     // stays
  return c;
}
/** The big overmantel oil: a three-master standing out to sea at sunset. */
function oilShip(/** @type {number} */x,/** @type {number} */y,/** @type {number} */W,/** @type {number} */H){
  const hz=H*.64, u=x/W, v=y/H;
  if(y<hz){
    let c=mix(rgb('#3f4f66'),rgb('#e89a48'),sm(0,hz,y)**1.4);
    c=mix(c,rgb('#ffd9a0'),.5*Math.max(0,1-Math.hypot((x-W*.7)/(W*.35),(y-hz)/(H*.3))));
    if(((Math.floor(y/2)+Math.floor(x*.17))&3)===0&&y<hz*.5) c=lit(c,.93);     // cloud bands
    // the ship
    const hullY=hz-.6, hw=W*.17;
    for(const [mx,top,k] of [[.4,.1,1],[.5,.04,1.2],[.6,.12,1]]){
      const X=mx*W, base=hullY, mh=base-top*H;
      if(Math.abs(x-X)<.5&&y>top*H&&y<base) return K.ink;
      for(const [a,b,wd] of [[.0,.3,.1],[.34,.64,.14],[.68,.92,.17]]){
        const y0=top*H+a*mh+1, y1=top*H+b*mh;
        if(y>y0&&y<y1&&Math.abs(x-X)<W*wd*k*(.85+.25*(y-y0)/(y1-y0))){ const lit_=1-.3*sm(X,X+W*wd,x)+.2*sm(X,X-W*wd,x); return y>y1-1?lit(rgb('#6e5a42'),1):lit(mix(rgb('#f6e2b4'),rgb('#f0a85a'),.35+.4*(1-(y-y0)/(y1-y0))),lit_); }
        if(Math.abs(y-y0+1)<.5&&Math.abs(x-X)<W*wd*k+1) return K.ink;
      }
    }
    if(y>hullY-1&&y<hullY+1.4&&Math.abs(x-W*.5)<hw-(y-hullY+1)*1.2) return y<hullY-.2?lit(rgb('#c9a56a'),.9):K.ink;
    if(cap(x,y,W*.5-hw,hullY,W*.5-hw-W*.1,hullY-3,.4)) return K.ink;
    if(Math.abs(y-(hz-4.5))<.6&&Math.abs(x-W*.88)<3&&y>hz-8) return lit(rgb('#f0d6a0'),.9);
    return c;
  }
  const refl=sm(0,1,1-Math.abs(x-W*.7)/(W*.25))*(1-sm(hz,H,y));
  let c=mix(rgb('#2a4048'),rgb('#12232a'),sm(hz,H,y));
  c=mix(c,rgb('#e8a050'),refl*(.35+.35*Math.sin(y*1.7+x*.4)));
  if(Math.floor(y-hz)%3===1&&((x*.5+y)%7)<4) c=lit(c,1.2);
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
  {f:{k:'I',c:0},a:3.0,z:30},{f:{k:'I',c:0},a:4.8,z:30},{f:{k:'I',c:0},a:10.75,z:27.5},{f:{k:'J',c:0},a:4.35,z:30},{f:{k:'J',c:0},a:7.7,z:27.6},
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


/* ---------- passage, gallery doors and boards on wall i=0 ---------- */
const GAL=PUB.gallery, PAS=PUB.passage;
/** The open arched passage: moulded mahogany architrave with a keystone, a green portière tied back, and a lamplit corridor seen in true perspective. */
function passage(){
  const F={k:'I',c:0}, FA={k:'I',c:.07}, c=(PAS.j0+PAS.j1)/2, hw=(PAS.j1-PAS.j0)/2, zs=PAS.h-hw*18/3, zTop=PAS.h, aw=.3;
  /** inside the arch (opening) test, grown by g units */
  const inside=(/** @type {number} */a,/** @type {number} */z,g=0)=>{ if(z<0) return false; if(z<=zs) return Math.abs(a-c)<=hw+g; const dx=(a-c)*18, dz=(z-zs)*3, r=(hw+g)*18; return dx*dx+dz*dz<=r*r; };
  // architrave: a moulded band around the opening
  fq(FA,c-hw-aw,0,c+hw+aw,zTop+aw*6+.3,(a,z)=>{
    if(inside(a,z)) return 0; if(!inside(a,z,aw)) return 0;
    const d=(()=>{ if(z<=zs) return Math.min(Math.abs(a-c)-hw,aw)/aw; const r=Math.hypot((a-c)*18,(z-zs)*3)/18; return (r-hw)/aw; })();
    return d<.2?lit(rgb('#e6c58a'),.95+.15*vn(a*6,z)):lit(K.mahog,(d<.5?1.15:d<.72?.6:1.3)*(.9+.2*vn(a*8,z*.5)));
  });
  fq(FA,c-.18,zTop+aw*3.2,c+.18,zTop+aw*3.2+2.2,(a,z)=>{ const e=Math.min((a-c+.18)*18,(c+.18-a)*18,(z-(zTop+aw*3.2))*3); return e<1?lit(K.gold,.8):lit(K.mahogL,1.15); });
  // painted corridor behind the opening: rays run along -i, seen at the camera's slope
  const j0=PAS.j0, j1=PAS.j1, D=2.4;
  fq(F,c-hw-.01,0,c+hw+.01,zTop+.1,(a,z)=>{
    if(!inside(a,z)) return 0;
    if(a>c+hw-.17||(z>zs&&Math.hypot((a-c)*18,(z-zs)*3)>(hw-.14)*18)) return lit(K.mahogD,.55+.2*vn(a*5,z));
    const tf=z/6, tw=Math.max(0,a-j0), tb=D, t=Math.min(tf,tw,tb);
    let col;
    if(t===tf){ const ii=-tf, jj=a-tf, bd=Math.floor(jj/.5), fb=jj/.5-bd; col=lit(mix(K.oakD,K.oakL,.25+.5*hh(bd+Math.floor(ii/2.2)*9)),(fb<.1?.5:1)); }
    else if(t===tw){ const zz=z-6*tw, ii=-tw; col=zz<7?lit(K.mahog,.7):lit(mix(K.ox,K.nic,.35),.9+.2*vn(ii*3,zz*.3)); if(zz>6.7&&zz<7.3) col=lit(K.mahogL,1.2); }
    else { const jj=a-D, zz=z-6*D; col=lit(mix(K.ox,K.nic,.4),.8); col=lit(mix(rgb('#c89a5c'),K.ox,.35),1.2); if(Math.abs(jj-(j0+j1)/2+.1)<.42&&zz>.2&&zz<8.6){ const e=Math.min(Math.abs(jj-(j0+j1)/2+.1),.42)*18; col=e>6.4?lit(rgb('#f2d9a0'),1.0):lit(rgb('#7a4a24'),.9+.3*sm(.2,8,zz)); } if(Math.hypot(jj-(j0+j1)/2,zz-10.4)<.5) col=K.flame; }
    // a lamp somewhere down the corridor: warm light falling off with depth, darker near the arch top
    const lamp=Math.max(0,1-Math.hypot(t-1.6,z-8.5)/7);
    return lit(mix(col,rgb('#ffc060'),.4*lamp+.15),.85+1.3*lamp+.1*sm(0,D,t));
  });
  fq(F,c-hw+.04,zs-1,c+hw-.04,zs+1,(a,z)=>0);
  // portière: velvet curtain drawn back to the left jamb, tied with a gilt cord
  const tie=6.4, wdt=(/** @type {number} */z)=>z<tie?.24+.4*(tie-z)/tie:.24+.16*Math.min(1,(z-tie)/(zs-tie));
  fq(FA,c+hw-.7,0,c+hw+.12,zs+2.2,(a,z)=>{
    const edge=c+hw+.1, w=wdt(z)+(z>zs?.2:0), d=edge-a; if(d<0||d>w||z>zs+2.2-(d/w)*2.4) return 0;
    const fold=.5+.5*Math.sin(d*55+vn(z*.3,1)*3), sh=.55+.5*fold;
    return lit(rgb('#2a4f9c'),(sh*1.15+.1)*(z<1?.7:1));
  });
  fq(FA,c+hw-.38,tie-.5,c+hw+.14,tie+.2,(a,z)=>lit(K.gold,.9+.5*Math.sin(a*60)*.2));
  fl(FA,c+hw-.34,tie-.5,c+hw-.32,tie-2.4,K.brassL); fq(FA,c+hw-.4,tie-3.2,c+hw-.26,tie-2.2,()=>lit(K.gold,1.1));
  fq(FA,c-hw-.1,zs+2.1,c+hw+.14,zs+2.5,()=>lit(K.brass,1.0));    // brass pole
}
function galleryDoors(){
  const F={k:'I',c:0}, body=[rgb('#2f4638'),rgb('#2f4638'),rgb('#2f4638')];
  GAL.doors.forEach(([a0,a1],n)=>{
    panelDoor(F,a0,a1,GAL.z+.4,GAL.z+17,body[n],a1-.2);
    const m=(a0+a1)/2, FP={k:'I',c:.1};
    fq(FP,m-.22,GAL.z+13.4,m+.22,GAL.z+15.4,(a,z)=>{ const e=Math.min((a-m+.22)*18,(m+.22-a)*18,(z-GAL.z-13.4)*3,(GAL.z+15.4-z)*3); return lit(K.brass,e<1?1.4:.95); });
    glyphs(FP,m+.13,GAL.z+14.9,String(n+1),K.ink,1);
  });
}
function chalkboard(){
  const F={k:'I',c:.05}, a0=PUB.fire.j1+.6, a1=PUB.fire.j1+1.44, z0=13, z1=24.6;   /* hung above the banquette's L leg, clear of the chimney breast */
  fq(F,a0,z0,a1,z1,(a,z)=>{ const e=Math.min((a-a0)*18,(a1-a)*18,(z-z0)*3,(z1-z)*3); if(e<1.6) return lit(K.mahog,e<.9?1.35:.8); const sm_=vn(a*6,z*.5); return lit(rgb('#202b27'),.85+.25*sm_*sm_); });
  const chalk=rgb('#d9d5c4');
  glyphs(F,a1-.1,z1-1.0,'FARE',chalk,1);
  fl(F,a1-.1,z1-3.1,a0+.1,z1-3.1,lit(chalk,.8));
  [['PIE',.8],['ALE',.7],['RUM',.75],['GIN',.6]].forEach(([w,k],n)=>{ glyphs(F,a1-.13,z1-4.1-n*2.0,/** @type {string} */(w),lit(chalk,/** @type {number} */(k)),1); });
  fq({k:'I',c:.12},a0-.03,z0-.7,a1+.03,z0,()=>lit(K.mahog,.8));
}
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

/* ---------- chimney breast, grate, mantel ---------- */
const FIRE={j0:PUB.fire.j0, j1:PUB.fire.j1, c:PUB.fire.d, o0:7.4, o1:9.4, zO:.6, zT:11, mz:14.6};
const FFIRE={x0:7.62,x1:9.18,z0:.6,z1:10.8};
function tileAt(/** @type {number} */a,/** @type {number} */z){
  const col=Math.floor(a*3.6), row=Math.floor(z/1.7), id=(col+row)&1, fa=(a*3.6-col), fz=z/1.7-row;
  const e=Math.min(fa,1-fa,fz,1-fz); let c=id?rgb('#d0c8a8'):rgb('#305d62');
  if(Math.hypot(fa-.5,fz-.5)<.28) c=id?rgb('#2f5d62'):rgb('#d0c8a8');
  return lit(c,(e<.1?.55:.95)*(.88+.12*sm(.1,.3,1-fz)));
}
/** Pale veined marble, bevelled at the edges of the piece that contains (a,z). */
function marble(/** @type {number} */a,/** @type {number} */z,/** @type {number} */edgePx){
  const vein=Math.abs(vn(a*2.2+3,z*.22+a*.8)-.5), vein2=Math.abs(vn(a*5+9,z*.5)-.5);
  let c=mix(rgb('#b3ad9b'),rgb('#8c8678'),.35+.5*vn(a*.8,z*.12));
  c=mix(c,rgb('#4b4a4a'),Math.max(0,1-vein*18)*.55+Math.max(0,1-vein2*30)*.15);
  return lit(c,edgePx<1.3?1.3:edgePx<2.6?.82:1);
}
function fireplace(){
  const P=PUB.fire, B={k:'I',c:FIRE.c}, S={k:'J',c:P.j1}, mid=(P.j0+P.j1)/2, H=PUB.H;
  fq(S,0,0,FIRE.c,H,(a,z,x,y)=>lit(wallAt(a*3,z,'I',x,y),.6));
  fq(B,P.j0,0,P.j1,H,(a,z,x,y)=>{
    if(z>=FIRE.mz) return lit(wallAt(a,z,'I',x,y),a-P.j0<.1?.5:P.j1-a<.1?1.2:1.04);
    const ed=Math.min(a-P.j0,P.j1-a)*18;
    // pilasters carry a fluted inset; the lintel a tablet
    if(z<FIRE.zT+.3&&(a<FIRE.o0||a>FIRE.o1)){
      const lx=a<FIRE.o0?(a-P.j0)*18:(P.j1-a)*18, flute=Math.abs(Math.sin(lx*1.1))<.5;
      if(lx>2.4&&lx<(FIRE.o0-P.j0)*18-2.4&&z>1.2&&z<FIRE.zT-.5) return lit(marble(a,z,9),flute?.82:1.0);
      return marble(a,z,Math.min(ed,lx));
    }
    if(z>=FIRE.zT+.3){
      const ta=Math.abs(a-mid), tz=Math.min(z-(FIRE.zT+1.1),(FIRE.mz-.8)-z)*3;
      if(ta<1.0&&tz>-.3){ return tz<1.2?lit(K.gold,.95):lit(mix(rgb('#2c2c30'),rgb('#58555a'),vn(a*3,z*.4)),1); }
      if(Math.abs(Math.abs(a-mid)-1.25)<.1&&tz>1.5) return lit(K.gold,.8);
      return marble(a,z,Math.min(ed,(z-FIRE.zT-.3)*3,(FIRE.mz-z)*3));
    }
    return marble(a,z,ed);
  });
  // opening: tiled cheeks and a soot-black fireback, iron register hood
  fq(B,FIRE.o0,FIRE.zO,FIRE.o1,FIRE.zT,(a,z)=>{
    const f=(a-FIRE.o0)/(FIRE.o1-FIRE.o0);
    if(a<FFIRE.x0-.02||a>FFIRE.x1+.02) return tileAt(a-FIRE.o0,z-FIRE.zO);
    const relief=vn(a*7,z*.8)*.5, arch=Math.abs(Math.sin((a-FFIRE.x0)*8.5))<.18&&z>3&&z<9?.5:0;
    return lit(rgb('#1b1311'),.5+.9*relief+arch+.5*sm(.4,.9,Math.abs(f-.5)*2));
  });
  fq(B,FIRE.o0-.08,FIRE.zT,FIRE.o1+.08,FIRE.zT+.9,(a,z)=>{ const d=(z-FIRE.zT)*3; return lit(K.iron,d<1?2.4:d>1.9?.8:1.2+.4*vn(a*9,z)); });
  fl(B,FIRE.o0,FIRE.zO,FIRE.o0,FIRE.zT,lit(K.iron,2)); fl(B,FIRE.o1,FIRE.zO,FIRE.o1,FIRE.zT,lit(K.iron,.8));
  // heavy mantel shelf on corbels
  const my=FIRE.mz-.1, mt=FIRE.mz+.9, mi=FIRE.c+.6, ja=P.j0-.35, jb=P.j1+.35;
  quad(0,ja,mt,0,jb,mt,mi,jb,mt,mi,ja,mt,(x,y)=>{ const [i,j]=gnd(x,y,mt); return lit(rgb('#6a3a22'),1.0+.3*sm(.2,1.4,i)+.1*vn(j*3,i*4)); });
  quad(mi,ja,my,mi,jb,my,mi,jb,mt,mi,ja,mt,(x,y)=>{ const j=(x+.5-G.ox-mi*G.ix)/G.jx, z=(G.oy+mi*G.iy+j*G.jy-y-.5)/G.cz; return lit(K.mahogL,.8+.6*sm(my,mt,z)); });
  quad(mi,jb,my,mi,jb,mt,0,jb,mt,0,jb,my,()=>lit(K.mahog,.55));
  for(const a of [P.j0-.05,P.j1+.05,mid-.55,mid+.55]) fq({k:'I',c:FIRE.c+.3},a-.14,FIRE.mz-2.4,a+.14,my,(x_,z)=>lit(K.mahog,.7+.6*sm(FIRE.mz-2.4,my,z)));
}
/** Hearth stone, brass fender, copper kettle, fire irons, bellows, coal scuttle, rag rug furniture. */
function hearth(){
  const P=PUB.fire, h=P.hearth, hz=.5, j0=P.j0-.3, j1=P.j1+.3;
  flo(0,j0,h,j1,hz,(i,j)=>{ const sl=Math.floor(i*.9), seam=Math.min(((i*.9)%1+1)%1,((j*.7)%1+1)%1); return lit(rgb('#6a665c'),(seam<.04?.55:1)*(.85+.3*vn(i*3+sl,j*3))*(.75+.4*sm(0,h,i))); });
  quad(h,j0,0,h,j1,0,h,j1,hz,h,j0,hz,(x,y)=>{ const j=(x+.5-G.ox-h*G.ix)/G.jx; return lit(rgb('#7a766b'),.8+.3*vn(j*5,3)); });
  quad(0,j1,0,h,j1,0,h,j1,hz,0,j1,hz,()=>lit(rgb('#4a4741'),.8));
  // brass fender
  const fi=h-.12, B=K.brass, top=2.2, ja=P.j0-.2, jb=P.j1+.2, n=Math.round((jb-ja)/.2);
  for(let k=0;k<=n;k++){ const j=ja+(jb-ja)*k/n; isoLineThin(fi,j,hz,fi,j,top,k%3===0?lit(B,1.3):B); }
  isoLineThin(fi,ja,top,fi,jb,top,K.brassL); isoLineThin(fi,ja,top-.35,fi,jb,top-.35,lit(B,1.1));
  isoLineThin(fi,ja,1.1,fi,jb,1.1,B); isoLineThin(fi,ja,hz+.5,fi,jb,hz+.5,lit(B,.8));
  for(const j of [ja,jb]){ isoLineThin(fi,j,top,1.0,j,top,B); isoLineThin(fi,j,top-.35,1.0,j,top-.35,lit(B,.8)); isoLineThin(fi,j,hz,fi,j,top+.1,K.brassL); isoLineThin(1.0,j,hz,1.0,j,top,B); }
  // copper kettle on a trivet
  cyl(1.2,7.35,.3,hz,hz+.6,(z,s)=>lit(K.iron,roundLit(s)*1.4),(s,v)=>lit(K.ironL,1));
  cyl(1.2,7.35,.24,hz+.6,hz+2.7,(z,s)=>lit(rgb('#b8642a'),roundLit(s)*(1.1+.3*Math.sin(z*5)*.3)+.1),(s,v)=>lit(rgb('#d98b4a'),1),.12);
  cyl(1.2,7.35,.1,hz+2.7,hz+3.3,(z,s)=>lit(rgb('#c9733a'),roundLit(s)*1.2),(s,v)=>lit(K.brassL,.9));
  isoLineThin(1.45,7.35,hz+2.2,1.75,7.35,hz+3.2,rgb('#c9733a')); isoLineThin(1.2,7.05,hz+2.6,1.2,7.65,hz+2.6,K.iron); isoLineThin(1.2,7.05,hz+2.6,1.2,7.35,hz+4.3,K.iron); isoLineThin(1.2,7.65,hz+2.6,1.2,7.35,hz+4.3,K.iron);
  // fire irons in a stand
  for(const [dj,len,c] of [[-.08,6.2,K.iron],[0,5.7,lit(K.iron,1.5)],[.08,5.9,K.iron]]) { isoLineThin(1.1,9.0+dj,hz,1.1,9.0+dj,hz+len,c); isoLineThin(1.1,9.0+dj,hz+len,1.1,9.0+dj,hz+len+.4,K.brassL); }
  cyl(1.1,9.0,.17,hz,hz+.7,(z,s)=>lit(K.brass,roundLit(s)*1.2),(s,v)=>lit(K.brassL,.9));
  // coal scuttle
  cyl(1.15,9.65,.28,hz,hz+3.5,(z,s)=>lit(z>hz+3.1?K.brass:rgb('#1d1d20'),roundLit(s)*(z>hz+3.1?1.1:1.6)*(.9+.1*Math.sin(z*5))),(s,v)=>lit(rgb('#26252a'),1+.5*(vn(s*5+9,v*5))),.12);
  isoLineThin(1.15,9.37,hz+3.2,1.15,9.93,hz+3.2,lit(K.brass,1.1));
  // bellows hung on the right pilaster
  const BE={k:'I',c:FIRE.c+.05};
  fq(BE,9.5,5.2,9.7,9.2,(a,z)=>{ const lx=(a-9.5)*18, ly=(9.2-z)*3, w=Math.sin(Math.min(1,ly/9)*Math.PI)*1.6+.6; if(ly<3||ly>11) return lx>1.2&&lx<2.0&&ly<=3?lit(K.mahog,1.1):lx>1.2&&lx<2.0&&ly>11?K.iron:0; return Math.abs(lx-1.8)<w?lit(rgb('#6a4a2a'),1.1-.35*sm(0,1.6,lx)+(ly%3.2<.6?.25:0)):0; });
  // low things on the rag rug: a log basket and a three-legged stool
  cyl(2.9,9.4,.36,0,2.6,(z,s)=>lit(rgb('#8a6a3a'),roundLit(s)*(.8+.35*Math.sin(z*7+s*3)*.5+.15)),(s,v)=>lit(rgb('#4a3322'),.8+.6*vn(s*6,v*6)),.08);
}
/** Overmantel painting of a ship, mantel clock, candlesticks, Staffordshire spaniels and tankards. */
function mantelDecor(){
  const P=PUB.fire, mid=(P.j0+P.j1)/2, z0m=FIRE.mz+.9, I2={k:'I',c:FIRE.c+.4};
  framed({k:'I',c:FIRE.c+.04},mid-1.4,z0m+2.6,2.8,14,oilShip);
  fq({k:'I',c:FIRE.c+.06},mid-.5,z0m+16.5,mid+.5,z0m+17.5,(a,z)=>{ const u=Math.abs(a-mid)/.5; return z<z0m+16.5+1.0*(1-u*u)?lit(K.gold,.8+.5*(1-u)):0; });
  { const ca=mid-.3, cb=mid+.3, zt=z0m+4.1;
    fq(I2,ca,z0m,cb,zt,(a,z)=>{ const lx=(a-ca)*18, ly=(zt-z)*3, W2=(cb-ca)*18, d=Math.min(lx,ly,W2-lx,(z-z0m)*3);
      if(ly<2) return lit(rgb('#2c2c30'),1.6-ly*.2);
      const dx=lx-W2/2, dy=ly-6.3, r=Math.hypot(dx,dy);
      if(r<3.6){ const ang=Math.atan2(dy,dx), tick=Math.abs(((ang/(Math.PI/6))%1+1)%1-.5)>.42&&r>2.6;
        if(tick||(Math.abs(dx*.9+dy*.8)<.6&&dy<=.6&&dy>-2.6&&dx>-.2)||(Math.abs(dy)<.55&&dx>-.3&&dx<2)) return K.ink; return rgb('#ece4cc'); }
      if(r<4.3) return K.brassL;
      return d<1?lit(K.brass,.8):lit(rgb('#1f1f23'),1.0+.3*sm(0,W2,lx)); }); }
  for(const a of [mid-.95,mid+.95]){
    fq(I2,a-.07,z0m,a+.07,z0m+2.7,(x_,z)=>lit(K.brass,.8+.25*sm(z0m,z0m+2.7,z)+.15*Math.sin((z-z0m)*3.2)));
    fq(I2,a-.11,z0m,a+.11,z0m+.45,()=>lit(K.brass,1.1));
    fq(I2,a-.05,z0m+2.7,a+.05,z0m+4.2,()=>lit(rgb('#ece0bd'),1));
    fq(I2,a-.03,z0m+4.2,a+.03,z0m+4.9,()=>K.flame);
  }
  for(const a of [mid-.62,mid+.62]) fq(I2,a-.15,z0m,a+.15,z0m+1.8,(aa,z)=>{ const lx=(aa-(a-.15))*18, ly=(z0m+1.8-z)*3; if(lx>=.6&&lx<4.4&&ly>.5&&ly<5.4) return lit(rgb('#9ea3a6'),1.35-lx*.12+(ly<1.2?.25:0)); if(lx>=4.4&&lx<5.4&&ly>1.4&&ly<4.4&&!(lx<5&&ly>2&&ly<3.6)) return lit(rgb('#8a8f92'),1); return 0; });
  for(const [a,dir] of [[P.j0+.18,1],[P.j1-.18,-1]]){
    const w=.5, zt=z0m+3.6;
    fq(I2,a-w/2,z0m,a+w/2,zt,(aa,z)=>{ const lx=dir>0?(aa-(a-w/2))*18:(a+w/2-aa)*18, ly=(zt-z)*3;
      if(ly>9.2) return lit(rgb('#d8d0b8'),.8);
      if(disc(lx,ly,5.6,1.8,1.3)) return rgb('#111');
      if(cap(lx,ly,6,2.8,6.8,5.6,1.1)) return rgb('#b66a36');
      if(disc(lx,ly,5,3.2,2)) return lit(rgb('#ece4cc'),1);
      if(cap(lx,ly,2.6,7.5,5.2,6,2.7)||disc(lx,ly,3.4,6.4,2.8)||cap(lx,ly,5,6,5.3,9,1)) return (lx<3.4&&ly>5&&ly<6.8)?rgb('#b66a36'):lit(rgb('#ece4cc'),.92);
      return 0; });
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
  const F={k:'J',c:.03}, a0=5.6, a1=11.2, z0=PUB.H-7.05, z1=PUB.H-3;
  fq(F,a0,z0,a1,z1,(a,z)=>{ const e=Math.min((a-a0)*18,(a1-a)*18,(z-z0)*3,(z1-z)*3); if(e<1) return lit(K.gold,.6); if(e<2.2) return e<1.6?lit(K.brassL,.9):lit(K.gold,.55);
    return lit(K.green,.55+.15*vn(a*3,z*.4)); });
  glyphs(F,(a0+a1)/2-2.83,z1-1.35,'ALES & PORTER',lit(K.gold,1.15),2);
  for(const a of [a0+.12,a1-.12]) { const [x,y]=fpt(F,a,(z0+z1)/2); psetK(Math.round(x),Math.round(y),K.brassL); }
}
/** A plate rail over the back bar, hung with plates and stood with tankards and jugs. */
function plateRail(){
  const F={k:'J',c:.28}, z=27.2, top=(/** @type {number} */a0,/** @type {number} */a1)=>quad(a0,0,z,a1,0,z,a1,.34,z,a0,.34,z,()=>lit(K.mahogL,1.0));
  top(5.85,10.9);
  fq(F,5.85,z-.55,10.9,z,(a,zz)=>lit(K.mahog,(zz>z-.15?1.5:.9)*(.9+.2*vn(a*5,zz))));
  for(let n=0;n<11;n++){
    const a=6.1+n*.5; if(a>7.2&&a<8.25) continue; if(a>10.7) break;
    const kind=n%3, G2={k:'J',c:.2}, zt=z+2.9;
    fq(G2,a-.22,z,a+.22,zt,(aa,zz)=>{ const lx=(aa-(a-.22))*18, ly=(zt-zz)*3;
      if(kind===0){ const d=Math.hypot(lx-4,ly-4.4); if(d>4.3) return 0; return d>3?rgb('#e6e0cc'):d>2.2?rgb('#2e4f8f'):d>1.3?rgb('#e6e0cc'):rgb('#7a8fbf'); }
      if(kind===1){ if(lx>=1&&lx<6.4&&ly>1.5&&ly<8.6) return lit(rgb('#9ea3a6'),1.35-lx*.12+(ly<2.4?.25:0)); if(lx>=6.4&&lx<8&&ly>2.8&&ly<6.8&&!(lx<7.2&&ly>3.8&&ly<5.6)) return lit(rgb('#8a8f92'),1); return 0; }
      const hw=2.2+1.4*Math.sin(Math.min(1,Math.max(0,(ly-1)/7))*Math.PI*.9); if(Math.abs(lx-3.8)<hw&&ly>1&&ly<8.4) return lit(rgb('#8a5a32'),1.3-sm(0,7,lx)*.6); if(lx>=7&&lx<8.2&&ly>2.5&&ly<6.5&&!(lx<7.6&&ly>3.6)) return rgb('#7a4d2a'); return 0; });
  }
}
function pictures(){
  const I0={k:'I',c:.04}, J0={k:'J',c:.04};
  framed(J0,1.7,27.5,2.7,10.4,fightArt,false);
  framed(J0,4.95,25,.8,8.8,noticeArt,false);
  framed(I0,1.3,8.8,1.7,8,raceArt);
  framed(I0,5.9,14.4,.9,5.6,landscapeArt);
  framed(I0,10.1,19.4,1.3,13.6,shipArt,false);
  framed(I0,10.05,35,1.4,7,landscapeArt);
}

/** Baked layers: floor, walls, doors, fireplace, framed pictures, brackets. */
export function pubShellStatic(){
  cam();
  const P=PUB;
  flo(0,0,P.I,P.J,0,(i,j)=>{ const c=floorAt(i,j), m=moonAt(i,j); return m>0?mix(lit(c,1.25),K.moon,.3*m):c; });
  quad(0,0,0,0,P.J,0,0,P.J,P.H,0,0,P.H,(x,y)=>{ const j=(x+.5-G.ox)/G.jx, z=(G.oy+j*G.jy-y-.5)/G.cz; return wallAt(j,z,'I',x,y); });
  quad(0,0,0,P.I,0,0,P.I,0,P.H,0,0,P.H,(x,y)=>{ const i=(x+.5-G.ox)/G.ix, z=(G.oy+i*G.iy-y-.5)/G.cz; return wallAt(i,z,'J',x,y); });
  wallThickness();
  passage(); galleryDoors(); chalkboard();
  fireplace(); hearth(); mantelDecor();
  longcase(); fascia(); plateRail(); pictures();
  for(const l of LAMPS) wallBracket(l);
  frontCut();
}
/* ---------- animated parts ---------- */
const GASOLIERS=[{i:8.4,j:5.9,z:31},{i:9.2,j:10.0,z:30}];   /* clear of the passage and the fireplace on the screen */
/** Where the glass shades of a gasolier hang (world i,j,z). */
function gasolierShades(/** @type {{i:number,j:number,z:number}} */g,/** @type {number} */t){
  return Array.from({length:5},(_,k)=>{ const an=k*Math.PI*2/5+.3+Math.sin(t*.004)*.015; return [g.i+Math.cos(an)*.78,g.j+Math.sin(an)*.78,g.z+1.1]; });
}
/** A brass five-arm gasolier on a chain, glass tulips lit. */
function gasolier(/** @type {{i:number,j:number,z:number}} */g,/** @type {number} */t){
  const {i,j,z}=g, sh=gasolierShades(g,t).sort((a,b)=>(a[0]+a[1])-(b[0]+b[1])), back=sh.filter(s=>s[0]+s[1]<i+j), front=sh.filter(s=>s[0]+s[1]>=i+j);
  for(let zz=z+4;zz<z+12;zz+=.9) isoLineThin(i,j,zz,i,j,zz+.55,((zz/.9|0)&1)?K.brass:K.brassD);
  const arm=(/** @type {number[]} */s)=>{ isoLineThin(i,j,z+.3,(i+s[0])/2,(j+s[1])/2,z-.2,K.brass); isoLineThin((i+s[0])/2,(j+s[1])/2,z-.2,s[0],s[1],s[2]-.6,lit(K.brass,1.2)); isoLineThin(i,j,z+.5,(i+s[0])/2,(j+s[1])/2,z+.1,K.brassD); };
  const bulb=(/** @type {number[]} */s)=>{ arm(s); shade(s[0],s[1],s[2]-.6,.16); };
  back.forEach(bulb);
  cyl(i,j,.07,z+.5,z+4.1,(zz,s)=>lit(K.brass,roundLit(s)*1.4),(s,v)=>K.brassL);
  cyl(i,j,.3,z-.5,z+1.1,(zz,s)=>lit(K.brass,roundLit(s)*1.35*(.85+.15*Math.sin(zz*7))),(s,v)=>lit(K.brassL,1),.35);
  cyl(i,j,.1,z-1.4,z-.5,(zz,s)=>lit(K.brass,roundLit(s)*1.3),(s,v)=>K.brassL,.5);
  front.forEach(bulb);
}
/** Per-pixel fire in the opening: a coal bed and licking flames; returns a colour or 0 to leave the soot. */
function fireAt(/** @type {number} */a,/** @type {number} */z,/** @type {number} */t,/** @type {number} */x,/** @type {number} */y){
  const W=appearanceState.W, F=FFIRE, hz=z-F.z0, u=(a-(F.x0+F.x1)/2)/((F.x1-F.x0)/2), tt=t*.055;
  if(Math.abs(u)>1||hz<-.05||z>F.z1) return 0;
  const under=rendererState.fb[y*W+x];
  let c=0;
  const ln=vn(a*5+3,hz*2.2)*.7+vn(a*10,hz*4+9)*.3, heap=2+ln*2.3*(1-u*u*.6);
  if(hz<heap){
    const g=sm(.3,.9,vn(a*6+tt*.3,hz*3+tt*.15)*.7+vn(a*13+tt*.5,hz*6)*.3)*(.8+.2*Math.sin(t*.08+a*9));
    c=g<.4?mix(rgb('#241008'),rgb('#8a260e'),g/.4):mix(rgb('#c23a12'),rgb('#ff9a34'),(g-.4)/.6);
    c=lit(c,(hz<.4?.6:1)*(.85+.3*ln));
  }
  // flames: three tongues that sway, flicker and merge
  const warp=(vn(hz*.4-tt*2.6,a*2.4+7)-.5)*.7*Math.min(1,hz/3), uu=u+warp;
  const tongues=.5+.5*Math.abs(Math.sin(u*3.3+1.2+tt*.55)), H=(8+6*vn(u*1.8+tt*.8,tt*.6+3))*(.5+.5*tongues)*(1-.3*u*u)*(.88+.12*Math.sin(t*.31+u*6)), r=1-hz/H;
  if(r>0){
    const wd=.3+.75*Math.pow(r,.6), I=Math.min(1,sm(0,.4,r)*(1-sm(.35,1.0,Math.abs(uu)/wd))*1.15);
    if(I>.02){
      const col=I>.82?mix(rgb('#ffcf5a'),rgb('#fff0b8'),(I-.82)/.18):I>.45?mix(rgb('#f2761a'),rgb('#ffcf5a'),(I-.45)/.37):mix(rgb('#a8260a'),rgb('#f2761a'),I/.45);
      c=mix(c||under,col,Math.min(1,sm(0,.3,I)));
    }
  }
  return c;
}
function fireProp(/** @type {number} */t){
  const B={k:'I',c:FIRE.c}, F=FFIRE;
  fq(B,F.x0,F.z0,F.x1,F.z1,(a,z,x,y)=>fireAt(a,z,t,x,y));
  // register bars in front of the coals
  const BR={k:'I',c:FIRE.c+.03};
  for(let a=F.x0+.06;a<F.x1;a+=.16) fl(BR,a,F.z0,a,2.9,lit(K.iron,.9));
  fl(BR,F.x0,3.0,F.x1,3.0,lit(K.ironL,.9)); fl(BR,F.x0,F.z0+.2,F.x1,F.z0+.2,lit(K.ironL,.9));
  // embers flung up the chimney
  for(let k=0;k<4;k++){ const age=((t*.011+k*.27)%1), x=isoX(.6,8.4+Math.sin(k*5.1+t*.003)*.5+age*.2)+Math.sin(age*9+k)*2, y=isoY(.6,8.4,3+age*11);
    if(age<.9) spot(x,y,1.3,1.3,.9*(1-age),rgb('#ffb04a')); }
}
/** Free-standing shell props drawn in depth order (e.g. hanging lamps): {box,draw}. */
export function pubShellProps(/** @type {number} */t){
  cam();
  const P=PUB.fire;
  return [{box:[0,P.j0,P.d,P.j1],draw:()=>{ cam(); fireProp(t); }},
    ...GASOLIERS.map(g=>({box:[g.i-.3,g.j-.3,g.i+.3,g.j+.3],draw:()=>{ cam(); gasolier(g,t); }}))];
}

/* ---------- light and air ---------- */
const flick=(/** @type {number} */t,/** @type {number} */k)=>.86+.14*vn(t*.045+k*13,k*5)+.05*Math.sin(t*.37+k*2);
const WARM=rgb('#ffb05a'), HAZE=rgb('#7d6a50');
/** Per-frame effects after all props: fire, lamp glow, tobacco haze, vignette. */
export function pubShellFX(/** @type {number} */t){
  cam();
  const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, hr=HAZE&255, hg=(HAZE>>8)&255, hb=(HAZE>>16)&255;
  // tobacco haze in two drifting layers + vignette, 2×2 blocks, camera-relative so it does not swim when the room pans
  for(let y=0;y<H;y+=2){ const wy=y-G.oy; for(let x=0;x<W;x+=2){
    if(!fb[y*W+x]) continue;
    const wx=x-G.ox, n1=fbm(wx*.014-t*.0009,wy*.03+Math.sin(t*.0007)*.4), n2=fbm(wx*.03+t*.0021+9,wy*.06-t*.0005);
    const a=Math.min(.26,.03+.16*n1*n1+.12*Math.max(0,n2-.4))*(.6+.55*Math.max(0,Math.min(1,(.62-y/H)*1.6+.5)));
    for(let yy=y;yy<y+2&&yy<H;yy++) for(let xx=x;xx<x+2;xx++){
      const k=yy*W+xx, c=fb[k]; if(!c) continue;
      const dx=xx/W-.5, dy=yy/H-.5, v=1-.5*(dx*dx+dy*dy)*1.7;
      fb[k]=(0xff000000|((((c>>16)&255)*(1-a)+hb*a)*v<<16)|((((c>>8)&255)*(1-a)+hg*a)*v<<8)|(((c&255)*(1-a)+hr*a)*v))>>>0;
    }
  } }
  // gasolier halos and light pools on the floor
  GASOLIERS.forEach((g,n)=>{
    const f=flick(t,n+1), px=isoX(g.i,g.j), py=isoY(g.i,g.j,0);
    spot(px,py,95,48,.11*f,WARM); spot(px,py,55,28,.08*f,WARM);
    for(const s of gasolierShades(g,t)){ const x=isoX(s[0],s[1]), y=isoY(s[0],s[1],s[2]+.8); spot(x,y,13,11,.16*f,WARM); spot(x,y,5,4,.3*f,rgb('#fff1c4')); }
  });
  // wall brackets
  LAMPS.forEach((l,n)=>{ const [i,j,z]=lampPos(l), f=flick(t,n+5), x=isoX(i,j), y=isoY(i,j,z+.9);
    spot(x,y,26,22,.2*f,WARM); spot(x,y,8,7,.4*f,rgb('#fff1c4'));
    const [wx,wy]=l.f.k==='I'?[i+.5,j]:[i,j+.5]; spot(isoX(wx,wy),isoY(wx,wy,z-8),42,30,.06*f,WARM); });
  // the fire: flickering glow on the wall, the hearth and the floor in front, brass fender glints
  const ff=.78+.22*vn(t*.09,1.3)+.1*Math.sin(t*.43)+.06*Math.sin(t*.91+2);
  const mj=(PUB.fire.j0+PUB.fire.j1)/2;
  spot(isoX(1.2,mj),isoY(1.2,mj,.5),95,40,.24*ff,rgb('#ff7a22'));
  spot(isoX(2.7,mj),isoY(2.7,mj,0),170,82,.15*ff,rgb('#ff7a22'));
  spot(isoX(2.7,mj),isoY(2.7,mj,0),80,38,.1*ff,rgb('#ffa040'));
  spot(isoX(PUB.fire.d,mj),isoY(PUB.fire.d,mj,5),44,34,.16*ff,rgb('#ffb04a'));
  for(let k=0;k<10;k++){ const j=6.95+k*.33; spot(isoX((PUB.fire.hearth-.12),j),isoY((PUB.fire.hearth-.12),j,2.2),3.4,2.4,.5*ff*(.6+.4*Math.sin(t*.2+k*2)),rgb('#ffd890')); }
  // mantel candles
  for(const j of [7.45,9.35]) { const f=flick(t,j|0); spot(isoX(PUB.fire.d+.4,j),isoY(PUB.fire.d+.4,j,19.3),9,9,.28*f,WARM); }
}
