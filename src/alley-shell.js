// Alley shell: everything that is surface and architecture of Brewer's Court, baked once into the alley buffer.
// Cobbles, gutter, ruts, the tenement wall j=0 (brick, soot, plaster, cornices, pipes, doors, windows, signs, chalk), the bay and the bridge,
// the blind end i=0 with the gate opening, the cut edges, the roofs, chimneys and the narrow smoggy sky. Layout: alley-layout.js; palette and recipes: concept.md.
// Textures are computed from WORLD coordinates (wall pixel U/V, ground i/j), so the single baked picture has no seams.
// Parts that must sort with the hero (bay, bridge, pilaster) are also kept as small masked sprites and drawn by alleyShellProps.
import { quad, isoX, isoY, shadeC } from './gym.js';
import { state as rendererState, setFramebuffer } from './renderer.js';
import { state as A, rgb } from './appearance.js';
import { mix } from './cast.js';
import { ALLEY } from './alley-layout.js';

/* ---------- noise ---------- */
/** Integer hash of up to three lattice coordinates, 0..1. */
const hs=(/** @type {number} */a,/** @type {number} */b,c=0)=>{ let h=Math.imul(a|0,0x27d4eb2d)^Math.imul(b|0,0x165667b1)^Math.imul(c|0,0x9e3779b1); h=Math.imul(h^(h>>>15),0x85ebca6b); h=Math.imul(h^(h>>>13),0xc2b2ae35); return ((h^(h>>>16))>>>0)/4294967296; };
/** Smooth value noise 0..1. */
function vnz(/** @type {number} */u,/** @type {number} */v,s=0){
  const a=Math.floor(u), b=Math.floor(v), f=u-a, g=v-b, p=f*f*(3-2*f), q=g*g*(3-2*g), n00=hs(a,b,s), n10=hs(a+1,b,s), n01=hs(a,b+1,s), n11=hs(a+1,b+1,s), n0=n00+(n10-n00)*p, n1=n01+(n11-n01)*p;
  return n0+(n1-n0)*q;
}
/** Two octaves of value noise. */
const fb2=(/** @type {number} */u,/** @type {number} */v,s=0)=>vnz(u,v,s)*.62+vnz(u*2.07+11.3,v*2.07+5.7,s+1)*.38;
const sm=(/** @type {number} */a,/** @type {number} */b,/** @type {number} */x)=>{ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); };
const sh=shadeC;

/* ---------- palette (concept.md, section 2) ---------- */
const P=(/** @type {string[]} */a)=>a.map(h=>rgb(h));
const SOOT=P(['#2c2622','#383029','#463b30','#574a3b']), FRESH=P(['#4a3126','#5c3b2d','#6f4733','#85563c']), WETB=P(['#232a2a','#2e3633','#3b4440','#4a5450']);
const PLAS=P(['#4c453b','#5d5547','#716756','#857a66']), GRAN=P(['#3a3a36','#4a4a44','#5e5d54','#77745f']);
const COBD=P(['#26241f','#302d26','#3c382f','#4a453a']), COBW=P(['#1a1e1f','#232a2b','#2e3738','#3f4b49']), MUD=P(['#1f1a15','#2a221a','#372c20']), GUT=P(['#141a1a','#1c2625','#2a3836']);
const IRON=P(['#17171a','#232326','#33343a','#4a4c52']), RUST=P(['#3b2418','#55321d','#74442a','#8f5a35']), WOOD=P(['#2a221b','#3a2f24','#4d3f30','#65543e']), WOODG=P(['#272c23','#343c2c','#454d38']);
const GLS=P(['#0e1214','#161d20','#22302f']), LIT=P(['#7a5a28','#c8964a','#e8c375']);
const MORT=rgb('#1d1b19'), JOINT=rgb('#16140f'), BLACK=rgb('#0a0c0d'), CHALK=rgb('#a8a28f'), CHALKW=rgb('#6a665a'), LEAF=P(['#3a4023','#4d5230','#5c5a3a']), TRASH=P(['#6e6652','#4a4538','#2f2b26']);
const SKY=P(['#2b3032','#1b2024','#0f1215']), SMOG=rgb('#3f4a4a'), ROOF=rgb('#101215'), ROOFE=rgb('#25282b'), VOID=rgb('#07090a'), YARD=rgb('#0f1620'), SLATE=P(['#14171a','#191d20','#1f2326']);

/* ---------- camera-relative helpers (the bake camera never moves: textures stay in world coordinates) ---------- */
/** @type {{ox:number,oy:number,ix:number,jx:number,iy:number,jy:number,cz:number}} */
let G={ox:0,oy:0,ix:18,jx:-18,iy:9,jy:9,cz:3};
/** Origin of the bake picture, kept to place the hero-sorted sprites in any frame. */
let BG={ox:0,oy:0};
function cam(){ const ox=isoX(0,0), oy=isoY(0,0,0); G={ox,oy,ix:isoX(1,0)-ox,jx:isoX(0,1)-ox,iy:isoY(1,0,0)-oy,jy:isoY(0,1,0)-oy,cz:oy-isoY(0,0,1)}; BG={ox,oy}; }
/** Face plane j=c (runs along i). fn(U,V): U = px along i (18 per unit), V = px up the wall (3 per unit); courses slope as in the iso view. Returns a colour or 0. */
function wJ(/** @type {number} */c,/** @type {number} */a0,/** @type {number} */z0,/** @type {number} */a1,/** @type {number} */z1,/** @type {(U:number,V:number,x:number,y:number)=>number} */fn){
  const e=.07, ez=.4;
  quad(a0-e,c,z0-ez,a1+e,c,z0-ez,a1+e,c,z1+ez,a0-e,c,z1+ez,(x,y)=>{ const u=x+.5-G.ox-c*G.jx; return fn(Math.floor(u),Math.floor(G.oy+c*G.jy+u*.5-y-.5),x,y); });
}
/** Face plane i=c (runs along j, faces +i). U = px along j (18 per unit). */
function wI(/** @type {number} */c,/** @type {number} */a0,/** @type {number} */z0,/** @type {number} */a1,/** @type {number} */z1,/** @type {(U:number,V:number,x:number,y:number)=>number} */fn){
  const e=.07, ez=.4;
  quad(c,a0-e,z0-ez,c,a1+e,z0-ez,c,a1+e,z1+ez,c,a0-e,z1+ez,(x,y)=>{ const u=G.ox+c*G.ix-(x+.5); return fn(Math.floor(u),Math.floor(G.oy+c*G.iy+u*.5-y-.5),x,y); });
}
/** An element on a wall face with local pixel coordinates: fn(lu,lv,W,H,U,V) gives a colour or 0. @param {'J'|'I'} k */
function elem(k,/** @type {number} */c,/** @type {number} */a0,/** @type {number} */z0,/** @type {number} */a1,/** @type {number} */z1,/** @type {(lu:number,lv:number,W:number,H:number,U:number,V:number,x:number,y:number)=>number} */fn,pad=0){
  const W=Math.round((a1-a0)*18), H=Math.round((z1-z0)*3), U0=Math.round(a0*18), V0=Math.round(z0*3), g=k==='J'?wJ:wI, pu=pad/18, pz=pad/3;
  g(c,a0-pu,z0-pz,a1+pu,z1+pz,(U,V,x,y)=>{ const lu=U-U0, lv=V-V0; return lu<-pad||lv<-pad||lu>=W+pad||lv>=H+pad?0:fn(lu,lv,W,H,U,V,x,y); });
}

/** Darken what is already painted on a wall face: fn(lu,lv,W,H,U,V) gives a brightness factor (0 = leave alone). */
function dark(/** @type {number} */c,/** @type {number} */a0,/** @type {number} */z0,/** @type {number} */a1,/** @type {number} */z1,/** @type {(lu:number,lv:number,W:number,H:number,U:number,V:number)=>number} */fn){
  elem('J',c,a0,z0,a1,z1,(lu,lv,W,H,U,V,x,y)=>{ const k=fn(lu,lv,W,H,U,V); return k?sh(rendererState.fb[y*A.W+x],k):0; });
}

/* ---------- 3x5 pixel font ---------- */
const FONT={A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',O:'010101101101010',P:'110101110100100',Q:'010101101111011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',0:'111101101101111',1:'010110010010111',2:'110001010100111',3:'110001010001110',4:'101101111001001',5:'111100110001110',6:'011100111101111',7:'111001010010010',8:'111101111101111',9:'111101111001110','&':'010101010101011','.':'000000000000010',',':'000000000010100','£':'011010111010111','-':'000000111000000',d:'001001111101111'};
/** Glyph bit at (gx,gy) of a string drawn from the top-left with 1 px between letters. */
function glyph(/** @type {string} */t,/** @type {number} */gx,/** @type {number} */gy){
  if(gy<0||gy>=5||gx<0) return 0; const n=Math.floor(gx/4), f=gx-n*4; if(f>=3||n>=t.length) return 0;
  const g=FONT[/** @type {keyof typeof FONT} */(t[n]==='d'?'d':t[n].toUpperCase())]; return g&&g.charCodeAt(gy*3+f)===49?1:0;
}
const textW=(/** @type {string} */t)=>t.length*4-1;

/* ---------- bricks and the wall ---------- */
/** One brick course texture: 7x3 bricks with a 1 px joint (running bond, a header course every fifth row), a tone per brick, lit top and shaded bottom row. */
function brickAt(/** @type {number} */U,/** @type {number} */V,/** @type {number} */fs){
  const r=Math.floor(V/4), vr=V-r*4, hdr=(((r%5)+5)%5)===4, len=hdr?4:8, off=(hdr?(r&1)*2:(r&1)*4)+Math.floor(hs(Math.floor(r/7),fs,2)*8), p=U+off, c=Math.floor(p/len), pu=p-c*len;
  if(vr===0||pu===0) return MORT;
  const h=hs(c,r,fs), h2=hs(c,r,fs+31), ti=h<.3?0:h<.6?1:h<.9?2:3;
  let col=h2<.055?FRESH[Math.min(2,ti)]:SOOT[ti];
  if(h2>.95){ col=SOOT[0]; if(pu===3&&vr!==2) col=sh(SOOT[2],1.25); }
  col=sh(col,.93+.14*hs(c,r,fs+5));
  return vr===3?sh(col,1.22):vr===1?sh(col,.8):pu===len-1?sh(col,.9):col;
}
/** Ledge underside rows (V of the underside, ledge height) of the three string courses. */
const LEDGES=[[72,6],[132,6],[184,8]];
/** Plaster presence 0/1 (threshold noise; patches cluster in a few regions of the wall). */
const plasterAt=(/** @type {number} */U,/** @type {number} */V,/** @type {number} */fs)=>vnz(U/120,V/90,fs+9)>.5&&vnz(U/17,V/13,fs+3)*.55+vnz(U/6.3+3,V/5.1,fs+5)*.45>.62?1:0;
/** Surface of a brick wall at wall pixel (U,V): bricks, soot streaks, rising damp, plaster patches, string courses and eaves. */
function wallColor(/** @type {number} */U,/** @type {number} */V,/** @type {number} */fs,kind=0){
  for(const [vb,hh] of LEDGES){
    const d=V-vb;
    if(d>=0&&d<hh){
      const top=d===hh-1, den=hh>6&&d<3&&((U+Math.floor(d/1))%12<6);
      let c=top?GRAN[3]:d===hh-2?GRAN[2]:d===0?GRAN[0]:den?GRAN[0]:GRAN[1];
      c=mix(c,SOOT[0],.25+.4*fb2(U/17,V/3,fs+14)); if(hh>6&&d===hh-3) c=sh(c,.8);
      return top?sh(c,.95):c;
    }
  }
  let c=brickAt(U,V,fs);
  let k=.6+.5*fb2(U/52,V/70,fs);
  // soot and rain streaks below each string course / the eaves
  for(const [vb] of LEDGES){ const d=vb-V; if(d>=0&&d<84){ const s=vnz(U/2.7,vb,fs+21); if(s>.52) k*=1-(s-.52)*1.1*Math.exp(-d/34); } }
  for(const [vb,hh] of LEDGES){ const d=V-vb; if(d<0&&d>=-4) k*=.55+.11*(d+4); if(hh===8&&V<vb&&V>=vb-1) k*=.8; }
  // rising damp from the pavement
  const wl=26+16*vnz(U/9,3,fs+4)+10*vnz(U/40,9,fs); if(V<wl+12){ const w=1-sm(wl-12,wl,V); if(w>0){ const wc=c===MORT?MORT:WETB[Math.min(3,Math.floor((c&255)/70))]; c=mix(c,wc,.15+.4*w); k*=1-.2*w; } }
  // plaster (flaking, with a pale rim above and a shadow line below)
  const pm=plasterAt(U,V,fs);
  if(pm){
    const up=plasterAt(U,V+1,fs), t=fb2(U/7,V/6,fs+8);
    c=PLAS[Math.min(2,Math.floor(t*3))]; k*=.62; if(!up) k*=1.25; else if(Math.abs(vnz(U/5,V/4,fs+12)-.5)<.03) k*=.6;
  } else if(plasterAt(U,V+1,fs)) k*=.55;
  return sh(c,k*(kind===1?.8:1));
}

/* ---------- background, roofs ---------- */
/** Sky ramp by distance d (px) above the roofline. */
function skyAt(/** @type {number} */d,/** @type {number} */x){
  if(d<0) return mix(rgb('#222829'),VOID,sm(0,110,-d));            // beyond the end of the wall: the foggy street, sinking into dark
  const g=d<26?mix(SKY[0],SKY[1],d/26):mix(SKY[1],SKY[2],Math.min(1,(d-26)/44)), sm1=Math.abs(d-(15+4*vnz(x/45,2)))<1.6?.55*vnz(x/22,5):0;
  return mix(g,SMOG,sm1*.5+.0);
}
/** Fill the picture: sky above the roofs with a far skyline, a foggy street beyond the mouth, void under the cut slab. */
function background(){
  const {I,J}=ALLEY, W=A.W, H=A.H, fb=rendererState.fb, {ox,oy}=G;
  for(let y=0;y<H;y++){
    const b=(y+.5-oy)/9;
    for(let x=0;x<W;x++){
      const a=(x+.5-ox)/18, i=(a+b)/2, j=(b-a)/2, top=x>=ox?oy+(x-ox)/2-192:oy-(x-ox)/2-192, d=top-y;
      if(j>J+.01||(i>I&&j>=0)){ fb[y*W+x]=VOID; continue; }
      // far skyline: hazy blocks and chimneys beyond the near roofs
      let c=skyAt(d,x), fh=10+16*hs(Math.floor((x+31)/13),71)+(hs(Math.floor(x/6),5)>.9&&x%6<3?9:0)+8*vnz(x/90,1);
      if(d>40&&d<40+fh) c=mix(c,rgb('#171c1f'),.8-.4*sm(0,fh,d-40));
      fb[y*W+x]=c;
    }
  }
}
/** Chimney stacks on the roof slopes: [i along the slope, width, height]. */
const STACKS_J=[[1.2,1.1,13],[4.3,.9,9],[9.4,1.2,15],[13.6,1,8],[18.2,1.3,12],[23.9,.9,16],[27.6,1.1,10],[31.8,1,14],[6.6,1.5,10],[15.6,.8,11],[21.5,1,9],[29.6,1.3,7]], STACKS_I=[[1.1,1,12],[4.4,.9,8]];
/** Near roof slopes above the two walls with chimneys, pots and a thin rim of smog light along their edges. */
function roofs(){
  const {I,J}=ALLEY, RZ=(/** @type {number} */j)=>64+(-j)*2.2;
  // slope behind wall j=0
  quad(0,0,64,I,0,64,I,-3.2,71,0,-3.2,71,(x,y)=>{
    const u=x+.5-G.ox, e=G.oy+u/2-192, v=e-y, row=Math.floor(v/3), c=Math.floor((u+(row&1)*3)/6), h=hs(c,row,2), sheen=sm(0,22,v)*.7, cc=mix(SLATE[Math.floor(h*3)],rgb('#2b3032'),sheen*.5);
    return (v>18.6&&v<21)||(vnz(u/9,v/3,6)>.97)?ROOFE:cc;
  });
  quad(0,0,64,0,J,64,-3.2,J,71,-3.2,0,71,(x,y)=>{
    const u=G.ox-(x+.5), e=G.oy+u/2-192, v=e-y, row=Math.floor(v/3), c=Math.floor((u+(row&1)*3)/6), h=hs(c,row,3);
    return mix(SLATE[Math.floor(h*3)],rgb('#2b3032'),sm(0,22,v)*.35);
  });
  const stack=(/** @type {number} */a,/** @type {number} */w,/** @type {number} */h,/** @type {boolean} */alongI)=>{
    const j1=-1.3, j0=j1-.8, z0=RZ(j1), z1=z0+h;
    if(alongI){ const i1=-1.3, i0=i1-.8, jj=a; // stack behind the end wall: plane i=i1 faces +i
      quad(i1,jj,z0,i1,jj+w,z0,i1,jj+w,z1,i1,jj,z1,(x,y)=>ROOF); quad(jj,i1,z0,jj+w,i1,z0,jj+w,i1,z1,jj,i1,z1,()=>ROOF);
      quad(i0,jj,z1,i1,jj,z1,i1,jj+w,z1,i0,jj+w,z1,()=>ROOFE); return; }
    // +j face (facing the camera), +i face, cap and pots
    quad(a,j1,z0,a+w,j1,z0,a+w,j1,z1,a,j1,z1,(x,y)=>{ const v=Math.floor(G.oy+j1*G.jy+(x+.5-G.ox-j1*G.jx)*.5-y-.5), top=Math.round(z1*3)-v; return top<3?sh(ROOFE,.85):v%4===0?rgb('#171a1e'):ROOF; });
    quad(a+w,j0,z0,a+w,j1,z0,a+w,j1,z1,a+w,j0,z1,()=>sh(ROOF,.8));
    quad(a,j0,z1,a+w,j0,z1,a+w,j1,z1,a,j1,z1,()=>ROOFE);
    for(let p=0;p<2;p++){ const pi=a+.12+p*w*.45; quad(pi,j0+.2,z1,pi+.3,j0+.2,z1,pi+.3,j0+.2,z1+2.2,pi,j0+.2,z1+2.2,()=>ROOF); quad(pi,j1-.15,z1,pi+.3,j1-.15,z1,pi+.3,j1-.15,z1+2,pi,j1-.15,z1+2,()=>ROOF); }
    // rim light on the left edge of the stack
    quad(a,j0,z0,a,j1,z0,a,j1,z1,a,j0,z1,()=>ROOFE);
  };
  for(const s of STACKS_J) stack(s[0],s[1],s[2],false);
  for(const s of STACKS_I) stack(s[0],s[1],s[2],true);
}

/* ---------- floor ---------- */
const DI=.27, DJ=.215;
/** Wetness 0..1 of the cobbles at (i,j): zone kinds, noise, the gutter and the puddles. */
function wetAt(/** @type {number} */i,/** @type {number} */j){
  let w=0; for(const z of ALLEY.cobbles) if(i>=z.i0&&i<z.i1) w=z.kind==='wet'?.55:z.kind==='broken'?.3:.12;
  w=Math.max(w*.8,sm(.5,.66,fb2(i*.35,j*.45,31))*.85);
  return Math.min(1,w+.5*sm(.9,.3,Math.abs(j-3.4)));
}
/** Cobbled pavement colour at ground point (i,j). */
function cobbleAt(/** @type {number} */i,/** @type {number} */j){
  const {I,J}=ALLEY, r=Math.floor(j/DJ), jj=j/DJ-r, q=i/DI+((r&1)?.5:0)+(hs(r,9)-.5)*.35, c=Math.floor(q), fi=q-c;
  const u=(fi-.5)*2, v=(jj-.5)*2, ax=Math.abs(u), ay=Math.abs(v), thr=.9+.1*hs(c,r,5), m=Math.max(ax,ay)+.4*Math.min(ax,ay), wet=wetAt(i,j);
  const zone=ALLEY.cobbles.find(z=>i>=z.i0&&i<z.i1), broken=zone&&zone.kind==='broken';
  // darkness at the foot of the walls (ambient occlusion)
  const ao=(.55+.45*sm(0,1.1,j))*(.6+.4*sm(0,1,i))*(.9+.1*sm(0,.5,J-j));
  if(m>thr||(broken&&hs(c,r,8)<.17)){
    let col=m>thr?JOINT:MUD[1];
    if(broken&&m<=thr) col=MUD[Math.floor(hs(c,r,4)*3)];
    return sh(wet>.5?mix(col,GUT[0],.4):col,ao);
  }
  const h=hs(c,r,1), t=Math.min(3,Math.floor(Math.pow(h,1.25)*4)), dry=COBD[t], wc=COBW[t];
  let col=mix(dry,wc,wet*.85);
  let k=.88+.24*fb2(i*1.1,j*1.5,6)+.12*(-(u+v)/2)+(m>thr-.28?-.12:0);
  if(wet>.5&&u+v<-.7) col=mix(col,COBW[3],.45);
  return sh(col,k*ao);
}
/** Debris, mud and leaves scattered in cells (blobs, never single pixels). Returns 0 or a colour mixed over c. */
function debrisAt(/** @type {number} */i,/** @type {number} */j,/** @type {number} */c){
  const ci=Math.floor(i/2.2), cj=Math.floor(j/2.2), h=hs(ci,cj,40); if(h<.42) return c;
  const cx=(ci+.2+.6*hs(ci,cj,41))*2.2, cy=(cj+.2+.6*hs(ci,cj,42))*2.2, rx=.2+.45*hs(ci,cj,43), ry=rx*.5, d=Math.hypot((i-cx)/rx,(j-cy)/ry)+.35*(vnz(i*5,j*5,44)-.5);
  if(d>1) return c;
  const kind=hs(ci,cj,45), col=kind<.45?LEAF[Math.floor(hs(ci,cj,46)*3)]:kind<.75?TRASH[Math.floor(hs(ci,cj,46)*3)]:MUD[0];
  return mix(c,col,(kind<.75?.5:.6)*(1-sm(.6,1,d))+.1);
}
/** Paint the whole pavement, the gutter, ruts, drains, puddle beds, mud and boot prints. */
function floor(){
  const {I,J}=ALLEY, {ox,oy}=G, ruts=ALLEY.ruts, puds=ALLEY.puddles, drains=ALLEY.drains;
  quad(0,0,0,I,0,0,I,J,0,0,J,0,(x,y)=>{
    const a=(x+.5-ox)/18, b=(y+.5-oy)/9, i=(a+b)/2, j=(b-a)/2;
    let c=cobbleAt(i,j);
    c=debrisAt(i,j,c);
    // cart ruts: two mud bands that end at the boarded stable doors
    for(const R of ruts){ if(i>R.i0-.3&&i<R.i1+.3){ const e=(.05+.06*vnz(i*3,j*2,50)), dj=Math.max(R.j0-j,j-R.j1), de=Math.max(R.i0-i,i-R.i1,0)*3; const w=1-sm(-.02,e,dj+de*.3); if(w>0){ c=mix(c,sh(MUD[1],.85),.62*w); if(dj>-.04&&dj<.05) c=sh(c,1.2); } } }
    // gutter: a shallow V channel along j=3.4 from the mouth to the drain at i=6
    const gj=Math.abs(j-3.4-.05*Math.sin(i*.9)); if(i>6.1&&gj<.46){ const bank=gj>.34, water=GUT[0+(gj<.2?0:1)], str=vnz(i*5.5+j*11,j*60,52)>.62&&gj<.26?1:0; c=bank?mix(c,GUT[1],.6):mix(water,GUT[2],str*.7+.12*vnz(i*4,j*8,53)); if(gj>.44) c=sh(c,.8); }
    // puddle beds: dark water under the FX reflections, with a dark rim
    for(const p of puds){ const d=Math.hypot((i-p.i)/(p.rx*1.05),(j-p.j)/(p.ry*1.05))+.18*(vnz(i*4,j*4,54)-.5); if(d<1){ const w=1-sm(.78,1,d); c=mix(c,rgb('#10181a'),.8*w+.1); if(d>.9) c=sh(c,.8); else c=mix(c,rgb('#2a3638'),.25*(1-sm(.0,.7,d))); } }
    // spill by the overturned barrel and a mud patch at the gate with two boot prints
    const sp=Math.hypot((i-6.1)/.9,(j-5.6)/.45); if(sp<1) c=mix(c,rgb('#1c1f1c'),.55*(1-sm(.4,1,sp)));
    const mp=Math.hypot((i-1.1)/1.1,(j-3.5)/1.4)+.2*(vnz(i*5,j*4,55)-.5); if(mp<1){ c=mix(c,MUD[0],.6*(1-sm(.5,1,mp))); }
    for(const [bi,bj] of [[.95,3.0],[1.5,3.85]]){ const bd=Math.hypot((i-bi)/.2,(j-bj)/.11); if(bd<1) c=sh(c,.6+.3*bd); }
    // drain covers (sunk iron plates in a granite frame)
    for(const dr of drains){ const di=Math.abs(i-dr.i), dj=Math.abs(j-dr.j), w=dr.kind==='grate'?.55:.38, h2=dr.kind==='grate'?.32:.38;
      if(di<w&&dj<h2){ c=(di>w-.07||dj>h2-.06)?GRAN[1]:(Math.floor((i-dr.i)*15)&1?IRON[2]:BLACK); } }
    return c;
  });
}

/* ---------- wall fixtures ---------- */
const BAYJ=2.3;
/** Soot fans above lit wall lamps and the smashed bracket. */
function lampSoot(){
  for(const L of ALLEY.lamps.filter(l=>l.side==='wall'&&l.lit||l.id==='lamp-broken')){
    const U0=Math.round(L.i*18), V0=Math.round(L.z*3), face=L.id==='lamp-arch'?BAYJ:0;
    elem('J',face,L.i-.8,L.z,L.i+.8,L.z+16,(lu,lv,W,H,U,V)=>{
      const dx=Math.abs(U-U0), dy=V-V0; if(dy<2||dy>46) return 0; const wd=3+dy*.28, k=(1-dy/46)*(1-dx/wd); if(k<=0) return 0;
      const hh=.55+.45*vnz(U/3,V/4,60); return k*hh>.25?rgb('#12100e'):0;
    },1);
  }
}
/** Wall incidents that break the regularity: iron tie plates, a settlement crack, the loading door of a warehouse floor above the bay. */
function extras(){
  for(const [i,z] of [[5.2,44.6],[14.4,44.6],[25.2,44.6],[31.0,24.7],[9.0,24.7],[20.4,62.4]]) elem('J',0,i,z-1.1,i+.45,z+1.1,(lu,lv,W,H)=>{ const k=Math.abs(lu-(W-1)/2)+Math.abs((lv-(H-1)/2)*1.5); return k<4?(lv>=H/2?IRON[3]:k<2?IRON[2]:IRON[1]):0; });
  const u0=Math.round(8.25*18);
  wJ(0,8.2,3,9.4,44,(U,V)=>{ const cu=u0+Math.floor((V-9)*.28)+Math.floor(5*vnz(V/11,3,2)), d=U-cu; return V>9&&V<125&&(d===0||(d===1&&((V>>2)&1)))?MORT:V>9&&V<125&&d===-1&&(V&1)?sh(SOOT[2],1.2):0; });
  // loading door with a hoist arm
  elem('J',0,18.9,46.5,20.4,60.7,(lu,lv,W,H,U,V)=>{
    if(lv>=H) return lv<H+3?GRAN[lv===H+2?2:1]:0; if(lu<0||lu>=W) return lu>=-2&&lu<W+2?GRAN[lu<0?0:1]:0; if(lv<0) return lv>=-2?GRAN[2]:0;
    const mid=Math.floor(W/2); if(lu===mid) return BLACK; if(lu>mid&&lu<mid+3&&lv>2) return BLACK;
    const pi=Math.floor((lu+1)/4), pu=(lu+1)-pi*4; let c=WOOD[1+(hs(pi,7,3)>.6?1:0)]; c=sh(mix(c,WOODG[1],.3*vnz(U/10,V/8,90)),pu===0?.65:1);
    if(lv%22>=9&&lv%22<=11) return IRON[1]; return c; },3);
  elem('J',0,19.2,61.3,20.1,63.1,(lu,lv,W,H)=>{ const r=Math.hypot(lu-W+4,lv-H/2+.5); return r<3?(r<1.5?IRON[0]:IRON[3]):(lv===1&&lu<W-3?IRON[3]:0); });
}
/** Drain pipes, soil pipe and the roof gutter. */
function pipes(){
  const pipe=(/** @type {number} */i0,/** @type {number} */z0,/** @type {number} */z1,/** @type {number} */w,/** @type {boolean} */broken)=>{
    const U0=Math.round(i0*18), ztop=z1;
    elem('J',0,i0-.2,z0-1,i0+.6,z1+1,(lu,lv,W,H,U,V)=>{
      const pu=U-U0; if(pu<-3||pu>w+2) return 0; const v=V;
      // shadow on the wall beside the pipe
      if(pu<0||pu>=w){ const sd=(pu>=w&&pu<w+2)||(pu===-1)?1:0; return sd&&v>z0*3&&v<z1*3-(broken?2:0)?rgb('#14131a'):0; }
      if(v<z0*3||v>=z1*3) return 0;
      if(broken&&v>=z1*3-(pu===1?3:pu===0?1:5)) return 0;
      const collar=((v-Math.round(z0*3))%61)<3;
      let c=pu===0?IRON[3]:pu===w-1?IRON[0]:IRON[1]; if(collar) c=IRON[3];
      // rust runs from the collars
      if(!collar&&((v-Math.round(z0*3))%61)>3&&((v-Math.round(z0*3))%61)<14&&pu===1) c=RUST[1];
      return c;
    },3);
  };
  pipe(12.72,40.5,62,4,true);       // downpipe, broken off above the lodging window: it drips into the big puddle
  pipe(16.97,0,60,4,false);         // sooty soil pipe
  // wet dark streak below the broken downpipe end
  elem('J',0,12.5,0,13.3,40.5,(lu,lv,W,H,U,V)=>{ const d=122-V; if(d<0) return 0; const w=Math.abs(U-Math.round(12.85*18)+2); return w<4+2*vnz(U,V/12,61)&&vnz(U/2,V/9,62)>.4?rgb('#12171a'):0; });
  // eaves gutter along the top of the wall with brackets
  wJ(0,0,60.3,ALLEY.I,64.3,(U,V)=>{ if(V<181||V>=192) return 0; const d=V-181; const br=(U%26)<2; if(d<2) return br?IRON[3]:0; return d<9?(d===8?IRON[3]:d===7?IRON[2]:IRON[1]):0; });
}
/** Stone sill + lintel window with reveal, frame, glass by state. */
function drawWindow(/** @type {any} */w){
  const c=w.face==='bay-bridge'?BAYJ:0, sid=Math.floor(w.i0*100)+w.floor*7, st=w.state;
  const lit=st==='lit', vr=Math.floor(hs(sid,1)*5);
  // drop shadow under the sill, rain streaks from its ends and a soot smear above the lintel
  dark(c,w.i0-.25,w.z0-12,w.i1+.25,w.z0-1,(lu,lv,W,H,U,V)=>{ const top=H-1-lv; if(top<0) return 0; const dw=top<4?.6+.1*top:1; const sx=(lu<5||lu>=W-5)&&vnz(U/2.2,V/9,sid)>.45?.62+.2*sm(0,40,top*3):1; const k=dw*sx; return k<.99?k:0; });
  elem('J',c,w.i0,w.z0,w.i1,w.z1,(lu,lv,W,H,U,V)=>{
    // lintel / sill / jambs
    if(lv>=H) return lv<H+3?(lv===H+2?GRAN[2]:GRAN[1]):0;
    if(lv<0) return lv>=-3?(lv===-1?GRAN[3]:lv===-2?GRAN[2]:sh(GRAN[1],.8)):0;
    if(lu<0) return lu>=-2?(lu===-1?BLACK:GRAN[0]):0; if(lu>=W) return lu<W+2?(lu===W?GRAN[2]:GRAN[1]):0;
    if(lu===0||lu===W-1||lv===0||lv===H-1) return WOOD[0];
    const barV=Math.abs(lu-Math.floor(W/2))===0, barH=lv===Math.floor(H/3)||lv===Math.floor(2*H/3);
    if(barV||barH) return WOOD[1];
    if(st==='boarded'){ // three planks of uneven length with nails
      const rows=Math.floor((lv-1)/(H/3.2)), pl=lv-1-Math.floor(rows*(H/3.2)); if(rows>2) return BLACK; const x0=Math.floor(hs(sid,rows,9)*5)-2, x1=W+1-Math.floor(hs(sid,rows,10)*5);
      if(pl<H/3.2-3&&lu>=x0&&lu<x1){ const g=vnz(U/6,V/2,70+rows); const nail=(lu===x0+2||lu===x1-3)&&pl===2; return nail?RUST[3]:sh(WOOD[1+(g>.5?1:0)],pl===H/3.2-4?.8:pl===0?1.25:1); }
      return BLACK;
    }
    if(lit){
      const px=lu/W, cyd=1-Math.abs(px-.5)*2;
      let col=mix(LIT[0],LIT[1],Math.min(1,cyd*1.3)); if(lv>H*.6) col=mix(col,LIT[2],.45*sm(.5,1,lv/H)*cyd);
      // curtain: folds hang over the lower two thirds
      if(lv<H*.7-(lu%7===0?2:0)){ col=mix(rgb('#a88a58'),rgb('#8c6f42'),(Math.floor(U/3)%2)*.8); col=sh(col,.75+.3*cyd); }
      // a dark figure-less shadow band: the window frame reflection
      return col;
    }
    // dead glass: black, greasy, with a diagonal reflection of the sky
    const gl=GLS[0], ref=Math.abs((lu*1.6+lv)%22-6)<1.6&&lu>1&&lv>H*.3, top=GLS[1];
    let col=mix(gl,top,sm(0,H,lv)*.7+.1*vnz(U/4,V/5,71));
    if(ref) col=mix(col,GLS[2],.9);
    if(st==='broken'){ if(((lv-H*.62)>-(lu-W*.45)*(H/W)*.9)&&lu>W*.35){ col=BLACK; if(Math.abs((lv-H*.62)+(lu-W*.45)*(H/W)*.9)<1.5) col=rgb('#4b5a5c'); } }
    else if(w.floor>=1){
      if(vr===0||vr===1){ const dr=lu<W*.28+(lv%5===0?1:0), dr2=vr===1&&lu>W*.78; if(dr||dr2) col=mix(rgb('#1b1a1a'),rgb('#2a2824'),(Math.floor(U/2)%2)*.5); }
      else if(vr===2&&lv>H*.55){ col=mix(rgb('#3d3a31'),rgb('#524d3f'),.5*vnz(U/4,V/3,sid)); if(lv%4===0) col=sh(col,.75); if(lv===Math.floor(H*.55)+1) col=sh(col,1.35); }
      else if(vr===3&&lv<H*.62){ if(((lu>>1)+(lv>>1))%2===0) col=mix(col,rgb('#3b3a35'),.45); }
    }
    return col;
  },3);
}
/** Doors by kind. */
function drawDoor(/** @type {any} */d){
  const face=d.face==='bay-bridge'?BAYJ:0, sid=Math.floor(d.i0*100), kind=d.kind;
  if(kind==='cellar'){ // low dark opening at the foot of the cellar stairs
    elem('J',0,d.i0,0,d.i1,13,(lu,lv,W,H)=>{ if(lv>=H) return lv<H+3?GRAN[lv===H+2?2:1]:0; if(lu<0||lu>=W) return GRAN[0]; return lv<2?GRAN[0]:BLACK; },3); return;
  }
  const z1=kind==='shuttered'?21:d.z, top=d.z;
  elem('J',face,d.i0,0,d.i1,z1,(lu,lv,W,H,U,V)=>{
    if(lv>=H) return lv<H+3?(lv===H+2?GRAN[2]:GRAN[1]):0;
    if(lu<0) return lu>=-2?(lu===-1?BLACK:GRAN[0]):0; if(lu>=W) return lu<W+2?(lu===W?GRAN[2]:GRAN[1]):0;
    if(lv<2) return lv===1?GRAN[3]:GRAN[2];                       // granite threshold
    const shut=kind==='shuttered', rail=lv>=H-15&&lv<H-1;
    if(kind==='lodging'||kind==='numbered'||kind==='narrow'){
      if(rail){ // fanlight above the door
        if(lv===H-15||lu===0||lu===W-1) return WOOD[0]; if(Math.abs(Math.atan2(lv-(H-15),lu-W/2)*(W/2))%5<.8) return WOOD[1];
        if(kind==='numbered'){ const gx=lu-Math.floor((W-7)/2), gy=H-3-lv-1; if(glyph('14',gx,gy)) return CHALK; }
        return mix(GLS[1],LIT[0],kind==='lodging'?.35:.05);
      }
    }
    if(shut&&lv<14){ // iron roller shutter, half down, ribbed, with a padlock
      const rib=lv%3===0; let c=rib?IRON[3]:IRON[1]; if(lv===13) c=IRON[3]; if((lu-W/2|0)===2&&lv>2&&lv<6) c=RUST[2];
      return sh(mix(c,RUST[0],.2*vnz(U/6,V/5,80)),.85);
    }
    if(shut) return lv<19?BLACK:WOOD[1];
    // planked leaf
    const pw=4, pi=Math.floor((lu+Math.floor(hs(sid,2)*3))/pw), pu=(lu+Math.floor(hs(sid,2)*3))-pi*pw;
    let col=d.boarded?WOOD[Math.min(3,Math.floor(hs(pi,sid,3)*3.4))]:(kind==='double-gate'?WOOD[1+(hs(pi,sid,3)>.6?1:0)]:WOOD[1+(hs(pi,sid,3)>.7?1:0)]);
    col=mix(col,WOODG[1],.3*vnz(U/12,V/9,81)); col=sh(col,pu===0?.65:pu===pw-1?.9:1+.12*(vnz(U/3,V/14,82)-.5));
    if(kind==='double-gate'){ if(lu===Math.floor(W/2)) return BLACK; const nh=(lv%27)>=22&&(lv%27)<=24&&(lu<W/2-3||lu>W/2+3); if(nh) return IRON[1]; if(lv<H-4&&Math.abs(lu-Math.floor(W/2))<3&&lv>H*.45&&lv<H*.45+2) return IRON[2]; }
    if(d.boarded){
      const dg=Math.abs(lv-(lu*H/W*.7+H*.12)), dg2=Math.abs(lv-(H*.82-lu*H/W*.7)), br=dg<2.6||dg2<2.6||(lv>H*.5-2&&lv<H*.5+1);
      if(br){ const nail=((lu+lv)%13===0)&&dg<1.4; return nail?RUST[3]:sh(WOOD[2],.8+.3*vnz(U/3,V/3,83)); }
    }
    else { // handle and keyhole plate
      if(kind!=='double-gate'&&lu===W-4&&(lv===Math.floor(H*.42)||lv===Math.floor(H*.42)+1)) return RUST[3];
      if(kind==='lodging'){ const pan=(lu>3&&lu<W-4&&((lv>6&&lv<H*.42-2)||(lv>H*.42+3&&lv<H-17))); if(pan&&((lu===4||lv===7)||(lu===W-5)))return sh(col,.7); }
    }
    return col;
  },3);
}
/** Stone pilaster of the shopfront at the mouth, ground floor only. */
function drawPilaster(){
  const b=ALLEY.boxes.find(q=>q.id==='pilaster-mouth')?.box||[31.2,0,32.6,.8], [i0,j0,i1,j1]=b, hz=24;
  const stone=(/** @type {number} */a,/** @type {number} */z,/** @type {number} */s,/** @type {number} */lit)=>{ const row=Math.floor(z/7), pu=a+((row&1)?5:0), col=Math.floor(pu/13), h=hs(col,row,s), edge=(z%7)<1||(pu%13)<1; let c=GRAN[1+(h>.65?1:0)]; c=mix(c,SOOT[0],.35*fb2(a/20,z/30,s)); return sh(edge?sh(c,.6):c,lit*.62); };
  wJ(j1,i0,0,i1,hz,(U,V)=>V>=hz*3-6?0:stone(U,V,3,V%7===6?1.2:1.0));
  wI(i1,j0,0,j1,hz,(U,V)=>stone(U,V,4,.78));
  // capital and base
  wJ(j1,i0-.05,hz-2.2,i1+.05,hz,(U,V)=>{ const d=V-(hz-2.2)*3; return d<0?0:d<2?GRAN[0]:d<4?GRAN[1]:d<6?GRAN[3]:GRAN[2]; });
  quad(i0,j0,hz,i1,j0,hz,i1,j1,hz,i0,j1,hz,()=>sh(GRAN[2],.9));
  wI(i1,j0,hz-2.2,j1+.05,hz,(U,V)=>{ const d=V-(hz-2.2)*3; return d<0?0:d<4?GRAN[0]:GRAN[1]; });
}
/** The projecting bay on the wall side (shopfront below, oriel above): faces +j and +i, flat lead roof. */
function drawBay(){
  const [i0,j0,i1,j1]=ALLEY.boxes.find(q=>q.id==='bay-bridge')?.box||[17.6,0,22,2.3], hz=44;
  wJ(j1,i0,0,i1,hz,(U,V)=>{
    let c=wallColor(U,V,2);
    // pilasters at both corners and a stone fascia under the oriel
    const a=U/18; if((a-i0<.35||i1-a<.3)&&V<75) return sh(GRAN[1+(Math.floor(V/9)&1?1:0)],V%9===0?.7:1);
    if(V>=66&&V<75) return sh(GRAN[1],V===66?.6:V===74?1.3:1);
    if(V>=75&&V<82){ return V===75?BLACK:rgb('#171512'); }       // shadow under the oriel corbels
    return c;
  });
  wI(i1,j0,0,j1,hz,(U,V)=>wallColor(U,V,12,1));
  // bricked-up window on the side face: stone surround, new brick infill that never matched
  elem('I',i1,.55,9,1.5,22,(lu,lv,W,H,U,V)=>{ if(lv>=H) return lv<H+3?GRAN[lv===H+2?2:1]:0; if(lv<0) return lv>=-3?GRAN[lv===-1?3:1]:0; if(lu<0||lu>=W) return lu>=-2&&lu<W+2?GRAN[lu<0?2:0]:0; const c=brickAt(U+3,V+1,40); return sh(c===MORT?c:mix(c,FRESH[0],.35),.75); },3);
  // lead roof with a stone coping
  leadRoof(i0,j0,i1,j1,hz,3);
  wJ(j1,i0-.04,hz-.5,i1+.04,hz+.3,(U,V)=>{ const d=V-Math.round((hz-.5)*3); return d<0?0:d<2?GRAN[0]:d<3?GRAN[1]:GRAN[3]; });
  // blind arched recess on the oriel
  const wi0=i0+.8, wi1=i1-.8, bz0=29.5, bz1=41.5;
  elem('J',j1,wi0,bz0,wi1,bz1,(lu,lv,W,H)=>{ if(lv>=H) return lv<H+2?GRAN[2]:0; if(lu<0||lu>=W) return lu>=-2&&lu<W+2?GRAN[1]:0; if(lv<0) return 0; const dark=lu<2||lv<2||lu>=W-1; return sh(mix(SOOT[1],MORT,.5),dark?.6:.85); },3);
}
/** Lead roof: sheets with standing seams in ground coordinates (z = roof height), stained and mossy. */
function leadRoof(/** @type {number} */i0,/** @type {number} */j0,/** @type {number} */i1,/** @type {number} */j1,/** @type {number} */z,/** @type {number} */s){
  quad(i0,j0,z,i1,j0,z,i1,j1,z,i0,j1,z,(x,y)=>{
    const a=(x+.5-G.ox)/18, b=(y+.5-G.oy+z*3)/9, i=(a+b)/2, j=(b-a)/2, si=((i*1.35)%1+1)%1, sj=((j*1.9+hs(Math.floor(i*1.35),s)*.3)%1+1)%1;
    let c=mix(rgb('#232a2c'),rgb('#343b3d'),.35+.45*fb2(i*.7,j*.7,s)); c=sh(c,.85+.3*vnz(i*3,j*5,s+1));
    if(si<.05||sj<.04) c=sh(c,si<.05?1.25:.7);                 // standing seam / sheet joint
    const mo=sm(.62,.8,fb2(i*.5+4,j*.5,s+2)); c=mix(c,rgb('#2c3220'),mo*.5);
    // skylight: a low glazed frame near the middle of the roof
    return c;
  });
}
/** Enclosed bridge between the tenements: brick sides, a painted fascia board, small windows, corbels, lead roof; its near end is a cut section. */
function drawBridge(){
  const {J}=ALLEY, a=ALLEY.arches[0], i0=a.i0, i1=a.i1, z0=a.z, z1=44;
  const under=(/** @type {number} */V)=>V<z0*3+3?(V<z0*3+1?BLACK:sh(GRAN[V===z0*3+2?2:0],1)):0, coping=(/** @type {number} */V)=>V>=z1*3-4?sh(GRAN[1+(V%3===2?1:0)],.9):0;
  // +i face (the long side seen from the court)
  wI(i1,BAYJ,z0,J,z1,(U,V)=>under(V)||coping(V)||wallColor(U,V,22,1));
  // +j face (the cut section at the near end)
  wJ(J,i0,z0,i1,z1,(U,V)=>under(V)||coping(V)||wallColor(U,V,23));
  leadRoof(i0,BAYJ,i1,J,z1,5);
  // the pawnbroker's long fascia board on the court side, gold on black, and a window on each end
  elem('I',i1,2.75,z0+4.2,5.1,z1-3,(lu,lv,W,H,U,V)=>{
    if(lu<0||lv<0||lu>=W||lv>=H) return 0; if(lu<2||lv<2||lu>=W-2||lv>=H-2) return lu===0||lv===0||lu===W-1||lv===H-1?sh(GRAN[1],.8):(lu===1||lv===1||lu===W-2||lv===H-2?rgb('#7a5a28'):0)||rgb('#7a5a28');
    const gy=H-1-lv-3; let hit=0; const t1='PAWNBROKER', t2='MONEY LENT';
    const mu=W-1-lu; hit=glyph(t1,mu-Math.floor((W-textW(t1))/2),gy)||glyph(t2,mu-Math.floor((W-textW(t2))/2),gy-7);
    return hit?mix(rgb('#c8964a'),rgb('#e8c375'),(lu%4)/6):mix(rgb('#15130f'),rgb('#1c1913'),vnz(U/6,V/4,7));
  });
  elem('I',i1,5.45,z0+4,6.25,z1-3.5,(lu,lv,W,H)=>{ if(lu<0||lu>=W) return lu>=-1&&lu<W+1?GRAN[1]:0; if(lv<0) return lv>=-2?GRAN[2]:0; if(lv>=H) return GRAN[1]; return (lu===0||lv===0||lu===W-1||lu===Math.floor(W/2))?WOOD[0]:mix(GLS[0],GLS[1],lv/H*.8+(Math.abs((lu+lv*1.3)%14-4)<1.2?.9:0)); },2);
  elem('J',J,i0+.7,z0+4,i0+1.6,z1-3.5,(lu,lv,W,H)=>{ if(lu<0||lu>=W) return lu>=-1&&lu<W+1?GRAN[1]:0; if(lv<0) return GRAN[2]; if(lv>=H) return GRAN[1]; return (lu===0||lv===0||lu===W-1)?WOOD[0]:mix(GLS[0],GLS[1],lv/H*.8); },2);
  elem('J',J,i0+2.1,z0+4,i0+3,z1-3.5,(lu,lv,W,H)=>{ if(lu<0||lu>=W) return lu>=-1&&lu<W+1?GRAN[1]:0; if(lv<0) return GRAN[2]; if(lv>=H) return GRAN[1]; return (lu===0||lv===0||lu===W-1)?WOOD[0]:BLACK; },2);
  // two iron stanchions at the near corners
  for(const ci of [i0+.12,i1-.1]) elem('J',J-.04,ci,0,ci+.2,z0,(lu,lv,W,H)=>lu<0||lu>=W||lv>=H?0:lu===0?IRON[3]:lu===W-1?IRON[0]:IRON[1],1);
}
/** Signs and chalk marks from ALLEY.signs. */
function signs(){
  const doors=Object.fromEntries(ALLEY.doors.map(d=>[d.id,d])), wins=Object.fromEntries(ALLEY.windows.map(w=>[w.id,w]));
  const SKIP=new Set(['sign-forge','sign-parish','sign-tea','sign-pawn']);
  for(const s of ALLEY.signs){
    if(SKIP.has(s.id)) continue;
    let k=/** @type {'J'|'I'} */('J'), face=0, a0=s.i0, a1=s.i1, z0=s.z, z1=s.z+s.h;
    if(s.side==='bay-bridge') face=BAYJ; else if(s.side==='pilaster-mouth') face=.8;
    else if(s.side.startsWith('door:')){ const d=doors[s.side.slice(5)]; if(d&&d.face==='bay-bridge') face=BAYJ; }
    else if(s.side.startsWith('window:')){ const w=wins[s.side.slice(7)]; if(w&&w.face==='bay-bridge') face=BAYJ; }
    else if(s.side==='end-wall'){ k='I'; }
    const lines=s.text.split('\n'), tw=Math.max(...lines.map(textW)), seed=s.id.length*13+Math.floor(s.i0*10);
    const chalk=s.id.startsWith('chalk')||s.id==='sign-nocredit', col=rgb(s.color);
    // widen a notice so its text fits; keep it centred on the given spot
    const wpx=Math.round((a1-a0)*18), need=chalk?tw:tw+4; if(need>wpx){ const ca=(a0+a1)/2, nh=need/36; a0=ca-nh; a1=ca+nh; }
    const lh=lines.length*7-2;
    if(s.id==='sign-harker'){ k='I'; face=0; a0=2.2; a1=4.6; z0=40; z1=46; }
    const W=Math.round((a1-a0)*18), H=Math.round((z1-z0)*3), ox=Math.floor((W-tw)/2), oyy=Math.floor((H-lh)/2);
    elem(k,face,a0,z0,a1,z1,(lu,lv,w,h,U,V)=>{
      const gy=h-1-lv-oyy;
      const board=s.id==='sign-pawn'||s.id==='sign-beds'||s.id==='sign-harker', paper=!chalk&&!board&&s.id!=='sign-anchor';
      let hit=0;
      const mu=k==='I'?w-1-lu:lu; for(let li=0;li<lines.length;li++){ const t=lines[li], tx=Math.floor((w-textW(t))/2); hit=hit||glyph(t,mu-tx,gy-li*7); }
      if(s.id==='chalk-x'||s.id==='chalk-k'){ // chalk cross, hand-drawn
        const cx=lu-w/2, cy=lv-h/2, dd=Math.min(Math.abs(cy*w/h*.9-cx),Math.abs(cy*w/h*.9+cx)); const cross=dd<.9&&Math.abs(cy)<h/2-.5; const ok=vnz(U/2,V/2,seed)>.3;
        if(s.id==='chalk-x') return cross&&ok?col:0; return (hit&&ok)||(Math.abs(cx)<.6&&Math.abs(cy)<h/2&&ok)||(Math.abs(cy)<.6&&ok&&Math.abs(cx)<w/2)?col:0;
      }
      if(chalk) return hit&&vnz(U/2.4,V/2.4,seed)>.28?mix(col,sh(col,.7),.4*vnz(U,V,4)):0;
      if(board){
        const edge=lu<1||lv<1||lu>=w-1||lv>=h-1; const bg=s.id==='sign-harker'?sh(RUST[1],.9+.3*vnz(U/5,V/4,seed)):rgb('#15130f');
        if(edge) return s.id==='sign-harker'?RUST[2]:sh(rgb(s.color),.6); if(hit) return s.id==='sign-harker'?sh(RUST[3],1.2):mix(col,sh(col,1.2),(lu%3)/3);
        return bg;
      }
      if(s.id==='sign-anchor'){ // faded painted fascia with a plank nailed across the lettering
        const dg=Math.abs(lv-(lu*h/w*.9+1)), plank=dg<2.5; if(plank) return sh(WOOD[2],.8+.3*vnz(U/3,V/3,seed));
        const bg=sh(WOOD[0],.9+.2*vnz(U/9,V/4,seed)); return hit&&vnz(U/2.4,V/2,seed)>.3?mix(col,CHALK,.25):bg;
      }
      if(s.id==='sign-reward'){ // torn bill: heading, price, torn line and unreadable bars below
        const tear=h*.46+4*vnz(U/3,5,seed)+(lu%3===1?1:0); if(lv<tear-4&&vnz(U/6,V/6,3)>.5&&lv>tear-9) return 0;
        if(lv<tear+vnz(U/2,3,seed)*3-4) return 0; const bar=gy>20&&gy<27&&hit===0&&((gy&1)===0)&&vnz(U/3,2,seed)>.3;
        const paperC=sh(CHALK,.55+.2*vnz(U/8,V/6,seed)); return hit?sh(rgb('#2a1b13'),1):bar?sh(rgb('#2a2622'),1):(lu<1||lv>=h-1?sh(paperC,.7):paperC);
      }
      if(paper){
        const edge=lu<1||lv<1||lu>=w-1||lv>=h-1; const pc=sh(s.id==='sign-cleanbeds'?rgb('#b8ab8a'):CHALK,.6+.15*vnz(U/6,V/5,seed));
        if(s.id==='sign-tolet'&&lu>w*.65&&lv>h*.7&&lu-w*.65>(lv-h*.7)*1.2) return 0;
        return hit?rgb('#1b1612'):edge?sh(pc,.6):pc;
      }
      return 0;
    },2);
  }
}
/** A narrow side passage behind a grille, a recess in the wall. */
function sideNiche(){
  const b=ALLEY.boxes.find(q=>q.id==='grate-side')?.box||[6.6,0,8,.6];
  elem('J',0,b[0],0,b[2],22,(lu,lv,W,H)=>{ if(lv>=H) return lv<H+3?GRAN[lv===H+2?2:1]:0; if(lu<0||lu>=W) return lu>=-2&&lu<W+2?GRAN[lu<0?0:1]:0;
    const arch=lv>H-7&&((lu-W/2)*(lu-W/2)/(W*W/4)+((lv-(H-7))/7)*((lv-(H-7))/7))>1; if(arch) return 0; return lv<2?GRAN[0]:mix(BLACK,rgb('#101416'),sm(0,H,lv)*.4); },3);
}
/** Faded painted ghost writing and pasted bill on the end wall, put there by decades of passers-by. */
function wallBills(){
  // BILL STICKERS BEWARE, half torn off, on the end wall left of the gate
  const t=['BILL STICKERS','BEWARE'];
  elem('I',0,.1,9,1.3,22,(lu,lv,W,H,U,V)=>{
    if(lu<1) return 0; const tear=H*.55+5*vnz(V/4,2,5); if(lv<tear-lu*.12-4) return 0; const gy=H-3-lv; let hit=0; for(let n=0;n<2;n++) hit=hit||glyph(t[n].slice(0,5),W-1-lu-1-(n?2:0),gy-n*7);
    const pc=sh(CHALK,.5+.15*vnz(U/5,V/4,17)); return hit?rgb('#1b1612'):(lu<2||lv>=H-1?sh(pc,.7):pc);
  },2);
}

/* ---------- the blind end wall i=0 ---------- */
function endWall(){
  const {J}=ALLEY, g=ALLEY.deadEnd, jA=g.j0, jB=g.j1, spring=28, top=g.gate.z;
  const open=(/** @type {number} */U,/** @type {number} */V)=>{ const j=U/18, z=V/3; if(j<=jA||j>=jB) return 0; if(z<spring) return 1; const e=((j-(jA+jB)/2)/((jB-jA)/2))**2+((z-spring)/(top-spring))**2; return e<1?1:0; };
  wI(0,0,0,J,ALLEY.H,(U,V)=>{
    if(open(U,V)) return 0;
    // voussoir ring around the arch and a stone sill
    const j=U/18, z=V/3; if(j>jA-.28&&j<jB+.28){ const e=((j-(jA+jB)/2)/((jB-jA)/2+.28))**2+((z-spring)/(top-spring+.28*3))**2; if(z>spring-2&&e<1.18&&e>=0&&j>jA-.3&&j<jB+.3&&(e<1)) { const ang=Math.atan2(z-spring,(j-(jA+jB)/2)*2); return sh(GRAN[1+(Math.floor(ang*9)&1?1:0)],V%2?.9:1); } }
    return wallColor(U,V,5,1);
  });
  // through the opening: the yard in cold darkness, a floor and a far wall
  wI(0,jA,0,jB,top,(U,V)=>{ if(!open(U,V)) return 0; const z=V/3; let c=mix(rgb('#141b24'),YARD,sm(0,36,z)); c=mix(c,BLACK,.35*sm(10,30,z)); if(z<7) c=mix(c,rgb('#1d2733'),.5*(1-z/7)); const st=Math.floor(U/9); if(z>.7&&z<9+7*hs(st,3)&&hs(st,4)>.55) c=mix(c,rgb('#0a0d11'),.8); return c; });
  // the reveal of the opening (wall thickness) on the +j-facing jamb
  quad(-.5,jA,0,0,jA,0,0,jA,top-8,-.5,jA,top-8,(x,y)=>{ const u=x-G.ox; return sh(SOOT[1],.6+.2*hs(Math.floor(u/8),Math.floor(y/4),9)); });
  wallBills();
}

/* ---------- cut edges ---------- */
function cuts(){
  const {I,J,H}=ALLEY, T=.45;
  // wall j=0 ends at the mouth: cut brick face and coping
  wI(I,-T,0,0,H,(U,V)=>{ const jj=U+T*18, e=Math.min(jj,T*18-jj); if(e<1.5) return sh(PLAS[0],.9); return sh(wallColor(U+999,V,31),.85); });
  quad(0,-T,H,I,-T,H,I,0,H,0,0,H,(x,y)=>GRAN[1]);
  quad(-T,0,H,0,0,H,0,J,H,-T,J,H,()=>GRAN[1]);
  wJ(J,-T,0,0,H,(U,V)=>wallColor(U+777,V,32,1));
  // coping rim
  // floor slab edges: dark masonry section, fading to black
  const slab=(/** @type {number} */U,/** @type {number} */z,/** @type {number} */s)=>{ const row=Math.floor(-z/2.4), pu=U+(row&1)*9, col=Math.floor(pu/18), h=hs(col,row,s), fade=sm(0,7,-z); let c=(-z%2.4)<.45||(pu%18)<2?rgb('#0d0b09'):mix(rgb('#241f1a'),rgb('#17130f'),h);
    // vaulted cellar light, black, at irregular intervals
    return mix(c,VOID,Math.min(1,fade)); };
  quad(0,J,-9,I,J,-9,I,J,0,0,J,0,(x,y)=>{ const u=x+.5-G.ox-J*G.jx, z=(G.oy+J*G.jy+u*.5-y-.5)/3, i=u/18; let c=slab(u,z,2); if(z>-5&&z<-.3){ for(const cx of [4.8,12.6,17.4,27.2]) { const d=Math.abs(i-cx), ah=2.2; if(d<.55&&z<-.4-(d>.4?(d-.4)*14:0)&&z>-3.6+((d)*d*5)) c=BLACK; } } return c; });
  quad(I,0,-9,I,J,-9,I,J,0,I,0,0,(x,y)=>{ const u=G.ox+I*G.ix-(x+.5), z=(G.oy+I*G.iy+u*.5-y-.5)/3; return slab(u,z,3); });
  // near-side kerb, a continuous granite strip with a worn top
  quad(0,J-.3,2.2,I,J-.3,2.2,I,J,2.2,0,J,2.2,(x,y)=>{ const u=x-G.ox, h=hs(Math.floor(u/26),3); return sh(mix(GRAN[2],GRAN[1],h*.8),.95); });
  wJ(J,0,0,I,2.2,(U,V)=>{ const col=Math.floor(U/26), h=hs(col,4), top=V>=6; if(V>=6) return GRAN[3]; if(V===5) return GRAN[2]; const j=(U%26)<1; return sh(mix(GRAN[1],GRAN[0],h),j?.6:.9+.1*vnz(U/4,V,5)); });
  // mouth lip
  wI(I,0,0,J,2.2,(U,V)=>{ if(V>=6) return GRAN[3]; if(V===5) return GRAN[2]; return sh(GRAN[1],.85); });
}

/* ---------- sprites for hero sorting ---------- */
/** @typedef {{x0:number,y0:number,w:number,h:number,px:Uint32Array}} Sprite */
/** @type {Sprite[]} */
let sprites=[];
/** Draw fn into a scratch picture of the same size and cut out its non-empty rectangle as a masked sprite. */
function capture(/** @type {()=>void} */fn){
  const W=A.W, H=A.H, buf=new Uint32Array(W*H), prev=setFramebuffer(buf);
  try{ fn(); } finally{ setFramebuffer(prev); }
  let x0=W, y0=H, x1=-1, y1=-1;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++) if(buf[y*W+x]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  const w=x1-x0+1, h=y1-y0+1, px=new Uint32Array(Math.max(0,w*h));
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) px[y*w+x]=buf[(y0+y)*W+x0+x];
  return {x0,y0,w,h,px};
}
function blit(/** @type {Sprite} */s){
  const fb=rendererState.fb, W=A.W, H=A.H, dx=isoX(0,0)-BG.ox, dy=isoY(0,0,0)-BG.oy;
  for(let y=0;y<s.h;y++){ const yy=s.y0+y+dy; if(yy<0||yy>=H) continue; for(let x=0;x<s.w;x++){ const xx=s.x0+x+dx, p=s.px[y*s.w+x]; if(p&&xx>=0&&xx<W) fb[yy*W+xx]=p; } }
}

/* ---------- public ---------- */
/** Static layers of the shell, drawn inside withPortView (2× units) into the bake buffer. */
export function alleyShellStatic(){
  cam();
  background();
  roofs();
  floor();
  // wall j=0: bricks, stains, plaster, string courses, then fixtures from the plan
  wJ(0,0,0,ALLEY.I,ALLEY.H,(U,V)=>wallColor(U,V,1));
  sideNiche();
  for(const w of ALLEY.windows) if(w.face!=='bay-bridge') drawWindow(w);
  for(const d of ALLEY.doors) if(d.face!=='bay-bridge') drawDoor(d);
  extras();
  pipes();
  lampSoot();
  drawPilaster();
  drawBay();
  for(const w of ALLEY.windows) if(w.face==='bay-bridge') drawWindow(w);
  for(const d of ALLEY.doors) if(d.face==='bay-bridge') drawDoor(d);
  drawBridge();
  endWall();
  signs();
  cuts();
  sprites=[capture(drawPilaster),capture(()=>{ drawBay(); for(const w of ALLEY.windows) if(w.face==='bay-bridge') drawWindow(w); for(const d of ALLEY.doors) if(d.face==='bay-bridge') drawDoor(d); }),capture(drawBridge)];
}
/** Shell parts that must sort with the player: the pilaster, the bay and the bridge as masked sprites. @returns {{box:number[],draw:()=>void}[]} */
export function alleyShellProps(/** @type {number} */t){
  if(sprites.length<3) return [];
  const bx=(/** @type {string} */id)=>/** @type {number[]} */(ALLEY.boxes.find(q=>q.id===id)?.box), a=ALLEY.arches[0];
  return [{box:bx('pilaster-mouth'),draw:()=>blit(sprites[0])},{box:bx('bay-bridge'),draw:()=>blit(sprites[1])},{box:[a.i0,BAYJ,a.i1,ALLEY.J],draw:()=>blit(sprites[2])}];
}
