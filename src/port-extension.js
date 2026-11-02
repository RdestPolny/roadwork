/* Extended Thames dock — modular environment art and decorative ambient life.
 * Called by thames-port after its original projection has been installed.
 * No new interactions or gameplay states are introduced here.
 */
import { rgb, state as appearanceState } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { mix } from './cast.js';
import { quad, isoBox, isoX, isoY, shadeC } from './gym.js';
import { h2 } from './boxing.js';
import { DISTRICT, DECK_Z, ANCHORS } from './port-district.js';
import { pubCraftDetails, tradeCraftDetails, pierCraftDetails, yardCraftProps } from './port-details.js';
import { portLifeProps } from './port-scenes.js';
import { C, floor, stroke, thin, rope, vn, frac, barrel, crate, chimney,
  onI, onJ, ground, brickAt, windowAt, lettering, fq, fl, contact, cyl, roundLit,
  smoke, spot, hull, RIVER } from './thames-port.js';

const WOOD=rgb('#4b3527'), WOOD_HI=rgb('#75604a'), WOOD_DARK=rgb('#211b17');
const BRICK_PUB=[rgb('#493126'),rgb('#53382c'),rgb('#392b27'),rgb('#604135')];
const BRICK_YARD=[rgb('#504838'),rgb('#5c513f'),rgb('#393b34'),rgb('#6b5844')];
const GLAZE=rgb('#db9d54');
/** Weathered transverse deck boards: seams and grain have fixed world positions. */
function plankAt(i,j,seed=0){
  const row=Math.floor(j*3.1), n=h2(row+seed,Math.floor(i*.65));
  const seam=frac(j*3.1), end=frac(i*.54+(row&1)*.5);
  if(seam<.13||end<.035) return WOOD_DARK;
  const k=(.78+(n-128)/1100+vn(i*1.7,j*.55+seed)*.3)*(seam>.82?.9:1);
  return shadeC(WOOD_HI,k);
}
function renderDeck(rect,seed){
  const [i0,j0,i1,j1]=rect;
  // Tidal supports and joists: all posts reach below WL=-7.
  for(let i=i0+.35;i<i1;i+=2.3) for(let j of [j0+.7,j1-.5]){
    isoBox(i,j,i+.55,j+.6,-11.5,-.15,WOOD_HI,WOOD,WOOD_DARK);
    thin(i,j,-7.4,i+.55,j+.6,-7.4,C.slime);
  }
  for(let i=i0;i<i1;i+=2.3){
    isoBox(i,j0-.08,i+.35,j1+.06,-.4,.08,WOOD,WOOD_HI,WOOD_DARK);
  }
  floor(i0,j0,i1,j1,DECK_Z,(x,y)=>{
    const [a,b]=ground(x,y,DECK_Z);
    return plankAt(a,b,seed);
  });
  // Frame edges and exposed beam ends.
  for(const j of [j0,j1]) stroke(i0,j,.4,i1,j,.4,C.woodLight);
  for(let i=i0;i<=i1;i+=2.3) thin(i,j1,-.5,i,j1,DECK_Z+.7,C.iron);
  pierCraftDetails(rect);
  if(rect===DISTRICT.pier){
    // Broken plank ends expose dark water between the remaining joists.
    const rows=[[47.95,49.35],[47.65,49.65],[47.45,49.8],[47.6,49.9],[47.4,49.75],[47.7,49.6],[47.85,49.3]];
    rows.forEach(([a,b],k)=>{
      const j=17.7+k*.32, end=j+.32;
      floor(a,j,b,end,DECK_Z+.08,()=>RIVER);
      thin(a,j,DECK_Z+.1,a+.18,j+.12,DECK_Z-.5,WOOD_HI);
      thin(b,j,DECK_Z+.1,b-.16,j+.18,DECK_Z-.45,WOOD_HI);
    });
    thin(48.5,17.95,DECK_Z-.35,48.5,19.75,DECK_Z-.35,WOOD_DARK);
    thin(47.9,18.62,DECK_Z-.4,49.15,18.84,DECK_Z-.8,WOOD);
  }
}
/** A low timber rail with posts; from..to (shares of its length) redraws one stretch of it over people standing behind it. */
export function rail(i0,j0,i1,j1,from=0,to=1,wooden=false){
  const length=Math.hypot(i1-i0,j1-j0),n=Math.ceil(length/1.4), at=u=>[i0+(i1-i0)*u,j0+(j1-j0)*u];
  for(let k=0;k<=n;k++){
    const u=k/n,[i,j]=at(u); if(u<from-1e-6||u>to+1e-6) continue;
    if(wooden) isoBox(i-.12,j-.12,i+.12,j+.12,DECK_Z,7,WOOD_HI,WOOD,WOOD_DARK);
    else { stroke(i,j,DECK_Z,i,j,6.4,WOOD_DARK); thin(i,j,6.4,i,j,7,WOOD_HI); }
  }
  const [a0,b0]=at(from),[a1,b1]=at(to);
  if(wooden){
    for(const z of [3.2,6.1]) isoBox(Math.min(a0,a1)-.1,Math.min(b0,b1)-.1,Math.max(a0,a1)+.1,Math.max(b0,b1)+.1,z,z+.65,WOOD_HI,WOOD,WOOD_DARK);
  } else { stroke(a0,b0,6.5,a1,b1,6.5,C.woodLight); thin(a0,b0,3.4,a1,b1,3.4,WOOD_HI); }
}
const shore=[[31.5,13,0],[31.7,13.85,-1.4],[32,15,-3.1],[32.6,16.15,-4.8],[33.4,16.9,-6.3],[34.5,17.3,-6.95],[35.5,17.6,-6.95],[36.5,18,-6.95],[37.4,17.45,-6.95],[38.4,16.35,-6.95],[39.3,13.2,-6.95]];
/** The sandy bank and the timber pier along the quay. */
export function portDecks(){
  floor(31.5,11.65,39.3,13.06,.04,(x,y)=>{
    const [i,j]=ground(x,y,.04), boundary=11.85+.35*vn(i*1.8,3.7)+.12*vn(i*6,1.2);
    const edge=Math.min(1,Math.max(0,(j-boundary)*5));
    const fade=edge*Math.min(1,(i-31.5)*3,(39.3-i)*2);
    const sand=shadeC(rgb('#817253'),.72+.24*vn(x*.13,y*.14)+(h2(x|0,y|0)-128)/850);
    return mix(under(x,y),sand,fade);
  });
  for(let k=0;k<shore.length-1;k++){
    const [a,ja,za]=shore[k], [b,jb,zb]=shore[k+1];
    quad(a,13,0,b,13,0,b,jb,zb,a,ja,za,(x,y)=>shadeC(rgb('#817253'),.72+.24*vn(x*.13,y*.14)+(h2(x|0,y|0)-128)/850));
    if(za<-6&&zb<-6) thin(a,ja,za+.05,b,jb,zb+.05,shadeC(C.waterHi,.8));
  }
  for(const [i,j,z] of [[34.3,13.8,-1.6],[35.2,14.3,-2],[36.4,14.6,-2.3],[37.8,14.2,-2],[38.5,13.7,-1.6]]){
    thin(i,j,z,i+.12,j+.05,z+.08,shadeC(WOOD_DARK,1.3));
    thin(i+.14,j-.13,z+.2,i+.22,j-.1,z+.25,shadeC(WOOD_HI,.8));
  }
  thin(35.1,13.6,-.95,35.65,13.9,-1.4,WOOD_DARK);
  // A crumpled, weathered net on the sloping sand.
  const netZ=j=>-1.45*(j-13)+.08, net=rgb('#2c2b20'), ni=33.3, nj=15.85;
  for(let n=-3;n<=3;n++){
    const u=n/4, span=Math.sqrt(1-u*u), i=ni+u*.9, j=nj+u*.7;
    const j0=nj-span*.67, j1=nj+span*(.67+.1*Math.sin(n*3));
    const i0=ni-span*.87, i1=ni+span*(.87+.06*Math.cos(n*2));
    stroke(i,j0,netZ(j0),i+.06*Math.sin(n*2),j1,netZ(j1),net);
    if(n!==2) thin(i0,j,netZ(j),i1,j+.07*Math.cos(n),netZ(j+.07*Math.cos(n)),shadeC(net,1.4));
    if(n%2===0){ const end=j1+.1+(n+3)*.015; thin(i+.06*Math.sin(n*2),j1,netZ(j1),i+.13,end,netZ(end),net); }
  }
  for(let n=0;n<16;n++){
    if(n>=1&&n<=7) continue;
    const a=n*Math.PI/8,b=(n+1)*Math.PI/8, j0=nj+Math.sin(a)*.67,j1=nj+Math.sin(b)*.67;
    thin(ni+Math.cos(a)*.87,j0,netZ(j0),ni+Math.cos(b)*.87,j1,netZ(j1),net);
  }
  // A small headless fish, with flesh exposed at the torn end.
  const fishI=33.35, fishJ=15.82, fishZ=netZ(fishJ)+.24;
  quad(fishI-.3,fishJ,fishZ,fishI-.15,fishJ-.12,fishZ+.17,
    fishI+.17,fishJ-.1,fishZ+.14,fishI+.2,fishJ+.1,fishZ-.14,(x,y)=>shadeC(rgb('#4a5d52'),h2(x|0,y|0)%4===0?1.3:1));
  quad(fishI-.3,fishJ,fishZ,fishI+.2,fishJ+.1,fishZ-.14,
    fishI+.08,fishJ+.13,fishZ-.19,fishI-.16,fishJ+.1,fishZ-.14,()=>rgb('#36473f'));
  thin(fishI-.3,fishJ,fishZ,fishI-.45,fishJ-.12,fishZ+.17,rgb('#46594d'));
  thin(fishI-.3,fishJ,fishZ,fishI-.45,fishJ+.12,fishZ-.17,rgb('#46594d'));
  stroke(fishI+.17,fishJ-.1,fishZ+.14,fishI+.2,fishJ+.1,fishZ-.14,rgb('#a45c50'));
  thin(fishI+.17,fishJ-.06,fishZ+.1,fishI+.19,fishJ+.05,fishZ-.07,rgb('#d2977e'));
  renderDeck(DISTRICT.pier,86);
  // Open at the quay entrances; low rails only at the waterward edges.
  rail(42.2,25,51.8,25,0,1,true);
  rail(42.2,13,42.2,25,0,1,true);rail(51.8,13,51.8,25,0,1,true);
  // Shore-to-pier apron: it should read as beams extending over the river wall.
  for(const i of [43.2,46.2,49.2]) stroke(i,12.75,DECK_Z+.15,i,14.5,DECK_Z+.15,C.woodLight);
}
/** A small moored utility boat, sunk correctly to the existing low-tide WL. */
function pierBoat(t){
  const o={s0:44.1,s1:48.2,jc:28.1,bow:1.1,w:.78,fb:2.25,sheer:.5,well:.7,light:.83};
  const S=hull(o,.03*Math.sin(t*.019),t,()=>{
    isoBox(45.2,27.8,46.6,28.4,-5.1,-4.7,WOOD_HI,WOOD,WOOD_DARK);
    thin(46,27.1,-4.8,46.7,28.9,-4.7,C.ropeD);
  });
  rope([46.6,24.85,2.2],[46.7,S.jf(46.7),S.top(46.7)],.55,C.rope);
  for(let k=0;k<3;k++) thin(46+k*.5,26.5,-6.9,46+k*.5,26.8,-6.8,C.waterHi);
}
/** Dark ship silhouettes and a slow steam tug across the open Thames. */
export function portRiverDistance(t){
  const wash=.1+.06*(1+Math.sin(t*.025)), low=.015;
  for(let k=5;k<shore.length-2;k++){
    const [a,ja]=shore[k], [b,jb]=shore[k+1], at=(j,u)=>j+(13-j)*u;
    quad(a,at(ja,low),-6.95*(1-low),b,at(jb,low),-6.95*(1-low),
      b,at(jb,wash),-6.95*(1-wash),a,at(ja,wash),-6.95*(1-wash),
      (x,y)=>mix(under(x,y),C.waterHi,.18));
    thin(a,at(ja,wash),-6.95*(1-wash)+.05,b,at(jb,wash),-6.95*(1-wash)+.05,mix(C.waterHi,rgb('#aa9f7d'),.55));
  }
  const vessels=[[32.5,41,12],[51,46,16],[19.5,53,11]];
  for(const [i,j,h] of vessels){
    const haze=.55+vn(i,j)*.18,ink=shadeC(C.smoke,haze);
    isoBox(i-3,j-.4,i+3,j+.45,-6.9,-5.2,ink,ink,shadeC(ink,.75));
    thin(i,j,-5.1,i,j,h,ink);
    thin(i-1.4,j,-3,i,j,h-1,ink);
    thin(i,j,h-2,i+2.3,j,h-3,ink);
    rope([i-2,j,-3],[i,j,h-2],.4,ink);
  }
  const drift=(t%680)*.012, i=61-drift,j=35;
  isoBox(i,j,i+5,j+1.8,-6.8,-3.9,C.tar,shadeC(C.tar,.8),C.bulwark);
  isoBox(i+1.7,j+.2,i+3,j+1.4,-3.9,2.7,C.wood,C.woodDark,C.wood);
  cyl(i+2.5,j+.8,.28,2.7,8.5,(z,s)=>shadeC(C.iron,roundLit(s)),()=>C.black);
  smoke(i+2.5,j+.8,8.7,t,47,5,400,C.smoke,.7);
  pierBoat(t);
}
function roofPlane(i0,i1,j0,j1,z0,ridge,seed){
  quad(i0,j1,z0,i1,j1,z0,i1,j0,ridge,i0,j0,ridge,(x,y)=>{
    const v=vn(x*.11+seed,y*.15),grain=h2(Math.floor(x*1.2),Math.floor(y*.8));
    return shadeC(C.slate,.65+v*.35+(grain-128)/1200);
  });
  for(let i=i0+.5;i<i1;i+=.8) thin(i,j1,z0,i,j0,ridge,shadeC(C.slate,.63));
  thin(i0,j1,z0,i1,j1,z0,C.ironHi);
}
function wallJ(i0,i1,j,z,pal,seed){
  quad(i0,j,0,i1,j,0,i1,j,z,i0,j,z,(x,y)=>{
    const [a,h]=onJ(j,x,y);return brickAt(a,h,pal,seed);
  });
}
function wallI(i,j0,j1,z,pal,seed){
  quad(i,j0,0,i,j1,0,i,j1,z,i,j0,z,(x,y)=>{
    const [a,h]=onI(i,x,y);return shadeC(brickAt(a,h,pal,seed),.78);
  });
}
/** Colour already in the picture at a pixel, for glazes over earlier layers. */
const under=(x,y)=>rendererState.fb[y*appearanceState.W+x];
const clamp01=v=>v<0?0:v>1?1:v;
/** World size of one screen pixel on the wall plane j=J: [along i, along z]. */
function pxOn(J){ const [i0,z0]=onJ(J,0,0); return [onJ(J,1,0)[0]-i0,z0-onJ(J,0,1)[1]]; }
/** 3×5 painted-sign capitals (rows of three cells). */
const GLYPH={A:'010101111101101',L:'100100100100111',E:'111100110100111',S:'011100010001110','&':'010101010101011',P:'110101110100100',O:'111101101101111',R:'110101110101101',T:'111010010010010',H:'101101111101101',N:'110101101101101',C:'011100100100011',I:'111010010010111',G:'011100101101011',U:'101101101101111',M:'101111111101101',' ':'000000000000000'};
/** Hand-painted capitals on a wall face, sampled per screen pixel so every stroke is a whole `cell` pixels wide (the old quad-per-cell text came out ragged).
 * (a,z) is the top-left of the text, or its top-centre with `mid`; letters have a 1 px drop shadow and a lighter top row. */
function paintText(f,a,z,text,{col,cell=2,adv=4*cell,seed=0,mid=false,shadow=rgb('#1c1209')}){
  const J=f.j+.03, [ci,cz]=pxOn(J), W=text.length*adv-(adv-3*cell), H=5*cell;
  if(mid) a-=W*ci/2;
  const hit=(x,y)=>{
    const [i,zz]=onJ(J,x+.5,y+.5), u=(i-a)/ci, v=(z-zz)/cz; if(u<0||v<0||u>=W||v>=H) return 0;
    const n=Math.floor(u/adv), gx=Math.floor((u-n*adv)/cell); if(gx>2) return 0;
    const g=GLYPH[text[n]]; return g&&g[Math.floor(v/cell)*3+gx]==='1'?(v<cell?2:1):0;
  };
  fq(f,a-ci*2,z-(H+2)*cz,a+(W+2)*ci,z+2*cz,(x,y)=>{
    const k=hit(x,y);
    if(k){ const n=h2(x*7+seed,y*3), age=.84+.2*vn(x*.31+seed,y*.43); return n<12?mix(under(x,y),col,.55):shadeC(col,age*(k>1?1.1:1)); }
    return hit(x-1,y-1)?mix(under(x,y),shadow,.75):0;
  });
}
/** The warm room behind the open door: p across the visible opening, q up it (both 0..1). Lamp glow, wainscot, two bottle shelves, a bar counter and a cask, all soft gradients with dark silhouettes. */
function roomAt(p,q){
  const lamp=clamp01(1-Math.hypot((p-.5)*1.5,q-.8)/.9);
  let c=mix(shadeC(C.litD,.5),C.lit,clamp01(.42+.95*lamp));
  if(q<.42) c=shadeC(c,.76);
  const bn=Math.floor(p*6), bf=frac(p*6), dark=shadeC(C.woodDark,.62);
  if(q>.5&&q<.535) c=shadeC(C.woodDark,.8);
  else if(q>=.535){
    const hb=.08+.09*h2(bn,3)/255;
    if(q<.535+hb&&bf>.14&&bf<.86&&(q<.535+hb*.6||(bf>.34&&bf<.66))) c=mix(dark,C.lit,bf<.4?.3:.06);
  }
  if(q>.78&&q<.805) c=shadeC(C.woodDark,.85);
  else if(q>=.805&&q<.865&&bn%2===0&&bf>.2&&bf<.8) c=mix(dark,C.flame,bf<.42?.35:.08);
  if(p>.2&&q<.4){
    if(q>.35) c=shadeC(mix(C.lit,C.flame,.3),.95-.2*(q-.35)/.05*.0+.0-(q>.38?.15:0));
    else c=frac(p*5.5)<.035?shadeC(C.black,1.2):shadeC(C.woodDark,.5+.2*vn(p*40,q*9));
  } else if(p>.2&&q<.5&&q>.4&&(Math.abs(p-.58)<.018||Math.abs(p-.72)<.018||Math.abs(p-.86)<.018)) c=mix(dark,C.lit,.12);
  const cx=(p-.12)/.2, cy=(q-.2)/.23;
  if(cx*cx+cy*cy<1){ const rim=clamp01(.5+.6*cx); c=shadeC(C.wood,.34+.35*rim); if(Math.abs(Math.abs(cy)-.5)<.07) c=shadeC(C.iron,1+.5*rim); }
  if(q<.06) c=shadeC(mix(c,C.woodDark,.5),.9+.2*vn(p*30,q*4));
  const e=Math.abs(p-.5)*2;
  return shadeC(c,1.12*(.62+.38*(1-e*e*e))*(q>.88?.82:1));
}
/** Sign board colour at plane pixel (u,v) from its top-left: moulded gilt frame, sea-green panel gone patchy, and a painted anchor on a coil of rope. */
const ANCHOR=['....xxx....','....x.x....','....xxx....','..xxxxxxx..','....xrx....','....rxr....','....xrx....','....rxr....','x...xrx...x','xx..xxx..xx','.xx.xxx.xx.','.xxxxxxxxx.','..xxxxxxx..','...xxxxx...'];
function signAt(u,v,w,h,x,y){
  const d=Math.min(u,w-1-u,v,h-1-v);
  if(d<1) return shadeC(C.woodDark,.5);
  if(d<2) return shadeC(C.wale,.95-.35*(v/h)+(u<w/2&&v<h/2?.15:0));
  if(d<3) return shadeC(C.woodDark,.6);
  const ax=u-Math.floor((w-11)/2), ay=v-Math.floor((h-14)/2), aa=ay>=0&&ay<14&&ax>=0&&ax<11?ANCHOR[ay][ax]:'.', sh=ay>=1&&ay<15&&ax>=1&&ax<12?ANCHOR[ay-1][ax-1]!=='.':false;
  const chip=h2(x*5,y*3)<22;
  if(aa==='x'&&!chip) return shadeC(rgb('#dec78d'),.8+.3*vn(x*.4,y*.5)-.12*(ay>8?1:0));
  if(aa==='r'&&!chip) return shadeC(rgb('#b49a62'),.9);
  const streak=vn(x*.5,y*.07), base=mix(rgb('#122325'),rgb('#2a4440'),.4*vn(x*.2+3,y*.25)+.35*streak*(1-v/h));
  return sh?shadeC(rgb('#0a1010'),1):base;
}
/** Where each lit pub window sits: [a, z, w, h] on the front wall (j=5.9), as given to windowAt. */
const PUB_LIT=[[31.7,3.4,1.25,12],[37.6,3.4,1.25,12],[34.3,27.6,1.4,13],[37.6,27.6,1.4,13]];
const PUB_DOOR={a:35.08,b:36.52,z0:2.3,z1:16.9,wt:.35};
/** One worn stone step: +i end, riser (shadowed under a lighter, hollowed nose) and a top that polishes in the middle; moss in the damp corners, a crack and a broken corner. */
function stoneStep(i0,j0,i1,j1,z0,z1,s,crackAt,chip){
  quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,(x,y)=>{ const [j,z]=onI(i1,x,y); return shadeC(C.stone[h2(Math.floor(j*6)+s,2)&3],.46+.2*vn(j*3+s,z*.6)); });
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,(x,y)=>{
    const [a,z]=onJ(j1,x,y), h=(z-z0)/(z1-z0), n=h2(Math.floor(a*5)+s,1);
    let c=shadeC(C.stone[n&3],.74+.2*vn(a*2.2+s,z*.7));
    if(h>.82) c=shadeC(c,h>.93?1.4:.62);
    if(Math.abs(a-(crackAt+.05*Math.sin(z*4+s)))<.02&&h>.1) c=shadeC(c,.4);
    if(h<.4&&vn(a*6+s,z*.8)>.56) c=mix(c,rgb('#4f5e2b'),.55);
    else if(h<.25) c=shadeC(c,.8);
    return c;
  });
  floor(i0,j0,i1,j1,z1,(x,y)=>{
    const [i,j]=ground(x,y,z1), k=(j-j0)/(j1-j0), n=h2(Math.floor(i*3)+s,Math.floor(j*4));
    let c=shadeC(C.stone[n&3],1.02+.2*vn(i*2.5+s,j*3));
    c=shadeC(c,1+.18*Math.exp(-Math.pow((i-(i0+i1)/2)/.5,2))*(k>.2?1:.5));
    if(k>.84) c=shadeC(c,1.3);
    c=mix(c,GLAZE,.14*(1-k));
    if(i>i1-.14&&k<.2&&vn(i*9,j*9+s)>.45) c=mix(c,rgb('#4f5e2b'),.5);
    if(chip&&i<i0+.17&&k>.62) return shadeC(C.black,1.6);
    return c;
  });
  thin(i0,j1,z1,i1,j1,z1,shadeC(C.lintel,1.55));
  thin(i1,j0,z1,i1,j1,z1,shadeC(C.lintel,1.25));
  thin(i0,j1,z0,i1,j1,z0,shadeC(C.black,1.4));
}
/** Pub with public-house sash windows and low wooden riverside terrace. */
function pub(t){
  const F={j:5.9}, side={i:39.5},j=5.9, D=PUB_DOOR;
  wallJ(30.9,39.5,j,48,BRICK_PUB,91);
  wallI(39.5,-1,5.9,48,BRICK_PUB,111);
  roofPlane(30.65,39.7,-1.3,6.2,48,59,14);
  // Stone coping and irregular string course.
  fq(F,30.9,22.2,39.5,23.4,()=>C.lintel);
  fq(F,30.9,46.4,39.5,48,()=>C.woodDark);
  for(const [i,z,w,h] of PUB_LIT.slice(0,2)) windowAt(F,i,z,w,h,'lit',t);
  for(const [i,k] of [[31.5,'dark'],[34.3,'lit'],[37.6,'lit']]) windowAt(F,i,27.6,1.4,13,k,t);
  windowAt(side,1.2,25,1.3,11,'dark',t);
  // Gilt lettering painted on the glass of the two bar windows (their light flickers in portDistrictProps).
  for(const [a,l1,l2] of [[31.7,'GIN','ALE'],[37.6,'RUM','PIE']]){
    const mid=a+.625, o={col:rgb('#f0dca4'),cell:2,adv:7,mid:true,seed:a|0};
    paintText(F,mid,12.6,l1,o); paintText(F,mid,8.3,l2,o);
    fl(F,a+.28,13.9,a+.97,13.9,rgb('#c9a763')); fl(F,a+.28,4.4,a+.97,4.4,rgb('#c9a763'));
  }
  // Open pub door, lit room behind it, and the warm light spilling over the setts.
  floor(34.4,5.94,37.4,9.1,.01,(x,y)=>{
    const [i,jj]=ground(x,y,.01), d=jj-5.94, w=.78+.36*d, e=Math.abs(i-35.8-.1*d)/w;
    if(d<0||e>=1) return 0;
    const k=Math.pow(clamp01(1-d/3.1),1.6)*(1-e*e)*(1-e*e)*.62;
    return mix(under(x,y),C.lamp,k);
  });
  contact(34.86,6,36.74,6.9,0,.64);
  fq(F,34.95,0,36.65,18.2,(x,y)=>shadeC(C.woodDark,.5+.2*vn(x*.2,y*.3)));
  fq(F,D.a,D.z0,D.b,D.z1,(x,y)=>{
    const [a,z]=onJ(j+.03,x,y), p=(a-(D.a+D.wt))/(D.b-D.a-D.wt), q=(z-D.z0)/(D.z1-D.z0);
    if(p<0) return shadeC(mix(C.woodDark,C.litD,.4*(1-q)),.55+.25*(1-q));
    return roomAt(p,q);
  });
  // The leaf, swung out on its left hinge (the inner face shows): iron straps, two panels, a brass push plate.
  const H=[34.97,5.98], E=[34.97+1.44*Math.cos(1.22),5.98+1.44*Math.sin(1.22)], zb=D.z0+.15, zt=D.z1;
  const leaf=(x,y)=>{
    const x0=isoX(H[0],H[1]), u=(x-x0)/(isoX(E[0],E[1])-x0), pi=H[0]+(E[0]-H[0])*u, pj=H[1]+(E[1]-H[1])*u, y0=isoY(pi,pj,zb);
    return [u,(y0-y)/(y0-isoY(pi,pj,zb+1))/(zt-zb)];
  };
  quad(H[0],H[1],zb,E[0],E[1],zb,E[0],E[1],zt,H[0],H[1],zt,(x,y)=>{
    const [u,v]=leaf(x,y), g=.7+.25*vn(x*.3,y*.12);
    if(u>.93) return shadeC(C.woodLight,.8);
    if((u<.3&&(Math.abs(v-.12)<.03||Math.abs(v-.86)<.03))) return shadeC(C.iron,1.2);
    if(Math.abs(u-.78)<.035&&Math.abs(v-.5)<.05) return shadeC(C.wale,1.1);
    const inPanel=u>.12&&u<.88&&((v>.1&&v<.44)||(v>.56&&v<.9));
    const edge=inPanel&&(u<.17||v<.15&&v>.1||v>.56&&v<.61);
    let c=shadeC(C.wood,inPanel?(edge?.42:.52)*g:.8*g);
    return mix(c,GLAZE,.14*(1-v));
  });
  // Hand-painted long frontage and projecting iron pub sign.
  fq(F,31.4,17.0,39.15,22.75,()=>shadeC(C.woodDark,.76));
  fl(F,31.4,17.05,39.15,17.05,C.wale);
  fl(F,31.4,22.76,39.15,22.76,C.wale);
  paintText(F,31.54,21.7,'THE ROPE & ANCHOR',{col:rgb('#e6cd90'),cell:2,adv:7,seed:5});
  // Three uneven stone steps, the lowest sunk into the setts.
  stoneStep(34.86,5.94,36.74,6.42,0,2.3,3,35.9,true);
  stoneStep(34.8,6.42,36.78,6.78,0,1.35,11,36.2,false);
  stoneStep(34.9,6.78,36.66,7.02,-.08,.5,23,35.4,false);
  floor(34.6,7.0,36.9,7.35,0,(x,y)=>{ const [,jj]=ground(x,y,0), k=Math.max(0,1-(jj-7)/.35); return k>0&&h2(x*3,y*5)<190*k?shadeC(under(x,y),.72):0; });
  // Wrought-iron hanging sign: scrolled bracket on the wall, cross-bar, two chains and a framed board.
  const SJ=7.52, arm=(s,z)=>[38.55+.95*s,5.98+1.57*s,z];
  for(const dz of [0,.34]) stroke(...arm(0,27.2+dz),...arm(1,27.2+dz),dz?IRON_L:C.iron);
  let pr=arm(0,21.8);
  for(let n=1;n<=10;n++){ const q=n/10*Math.PI/2, c=arm(.62*(1-Math.cos(q)),21.8+5.4*Math.sin(q)); thin(...pr,...c,n&1?IRON_L:C.iron); pr=c; }
  pr=null;
  for(let n=0;n<=14;n++){ const q=n/14*Math.PI*2.4, c=arm(.18+.06*Math.cos(q),24.6+.75*Math.sin(q)); if(pr) thin(...pr,...c,C.iron); pr=c; }
  quad(38.45,5.95,26.4,38.75,5.95,26.4,38.75,5.95,28.4,38.45,5.95,28.4,()=>C.iron);
  stroke(38.62,7.55,27.0,40.08,7.55,27.0,C.iron); thin(38.62,7.55,27.35,40.08,7.55,27.35,IRON_L);
  for(const i of [38.82,39.88]) for(let k=0;k<3;k++){ const z=26.9-k*.42; thin(i-.04,7.54,z,i+.04,7.54,z-.3,k&1?IRON_L:C.iron); }
  { const J=SJ, [ci,cz]=pxOn(J), i0=38.65, i1=40.1, z0=20.3, z1=26.1, w=Math.round((i1-i0)/ci), h=Math.round((z1-z0)/cz);
    quad(i0,J,z0,i1,J,z0,i1,J,z1,i0,J,z1,(x,y)=>{ const [i,z]=onJ(J,x+.5,y+.5); return signAt(Math.floor((i-i0)/ci),Math.floor((z1-z)/cz),w,h,x,y); }); }
  thin(38.85,7.55,26.1,38.8,7.55,25.2,RUSTY); thin(39.86,7.55,26.1,39.9,7.55,24.6,RUSTY);
  for(const i of [31.1,39.25]) thin(i,5.94,0,i,5.94,47,C.iron);
  chimney(33.7,-.8,59,1.15);
  // Rainwater pipe and old nail marks at the rear corner.
  thin(39.28,5.96,46,39.28,5.96,0,C.iron);
  for(let z=5;z<45;z+=8) thin(39.15,5.97,z,39.42,5.97,z,C.ironHi);
  pubCraftDetails();
}
const RUSTY=rgb('#5e3b27'), IRON_L=rgb('#5b6460');
/** Lit pub windows, the bay, and the doorway are baked once, so they are glazed here every frame: a slow irregular candle-and-gas flicker, and now and then a figure crossing behind the glass. Cheap (a few thousand pixels): it never rebuilds the cache. */
function glowGlass(J,a0,a1,z0,z1,id,t,amp=1){
  const P=980+id*173, n=Math.floor((t+id*311)/P), ph=((t+id*311)%P)/340, pass=ph<1&&h2(n*7+id,41)<150, dir=h2(n,id)&1?-1:1;
  const f=1+amp*(.075*(vn(t*.014+id*9.1,id*3.7)*2-1)+.03*(vn(t*.052+id*3.3,7.5)*2-1));
  const fc=pass?(dir<0?1.2-1.4*ph:-.2+1.4*ph):0, bob=Math.sin(ph*38)*.012, edge=Math.min(1,ph*8,(1-ph)*8);
  quad(a0,J,z0,a1,J,z0,a1,J,z1,a0,J,z1,(x,y)=>{
    let c=shadeC(under(x,y),f);
    if(pass){
      const [i,z]=onJ(J,x+.5,y+.5), fx=(i-a0)/(a1-a0), fz=(z-z0)/(z1-z0);
      const hx=(fx-fc)/.15, hz=(fz-.66-bob)/.1, bx=(fx-fc)/.3, bz=(fz-.36)/.27;
      const q=Math.max(0,1-hx*hx-hz*hz,1-bx*bx-bz*bz);
      if(q>0) c=mix(c,rgb('#1a0f08'),Math.min(.5,q*1.6)*.55*edge);
    }
    return c;
  });
}
/** The dynamic half of the pub's lit glass (see glowGlass), sorted behind every person who stands in front of the wall. */
export function pubWindowsFX(t){
  PUB_LIT.forEach(([a,z,w,h],k)=>glowGlass(5.93,a+.08,a+w-.08,z+.4,z+h-.3,k+1,t));
  glowGlass(5.97,PUB_DOOR.a,PUB_DOOR.b,PUB_DOOR.z0,PUB_DOOR.z1,5,t,1.5);
  glowGlass(6.97,37.57,38.96,31.2,41.3,6,t,.8);
}
/** Two lower warehouses separated by a dark, recessed service lane. */
function tradeBuildings(t){
  const F1={j:3.9},F2={j:4.5};
  // The lane recedes behind the accessible quay; no transition to a new map.
  floor(39.55,-6.2,42.4,0,0,(x,y)=>shadeC(C.stone[h2(x|0,y|0)&3],.43+.13*vn(x*.3,y*.3)));
  wallI(39.55,-6.3,0,50,BRICK_PUB,99);
  wallI(42.4,-6.3,0,58,BRICK_YARD,125);
  wallJ(39.55,42.4,-6.3,45,BRICK_YARD,62);
  for(let k=0;k<4;k++) thin(39.6+k*.65,-5.9,1,39.6+k*.65,-5.9,22,C.iron);
  wallJ(42.4,46.2,3.9,51,BRICK_YARD,135);
  wallI(46.2,-1.2,3.9,51,BRICK_YARD,147);
  roofPlane(42.25,46.4,-1.3,4,51,59,15);
  windowAt(F1,43.2,27,1.5,14,'shut',t);
  fq(F1,43.2,0,45.25,20,(x,y)=>shadeC(C.wood,.65+vn(x*.25,y*.3)*.18));
  fl(F1,44.2,0,44.2,20,C.iron);
  lettering(F1,42.8,49,'RIGGING',rgb('#aaa38e'),.3);
  wallJ(46.65,52,4.5,57,BRICK_PUB,166);
  wallI(52,-1.8,4.5,57,BRICK_PUB,173);
  roofPlane(46.5,52.1,-1.9,4.7,57,65,22);
  for(const x of [47.2,50.1]) windowAt(F2,x,27,1.3,14,x>50?'lit':'shut',t);
  // The timber store's door stands open: boards go in and out through it.
  fq(F2,47.3,0,49.1,19,(x,y)=>{ const [a,z]=onJ(4.5,x,y); return shadeC(C.black,1+.5*Math.max(0,1-z/10)+.25*vn(a*2,z*.3)); });
  for(const [a,z] of [[47.7,1.2],[47.95,1.9],[48.2,1.2],[48.5,1.6]]) fq(F2,a,0,a+.14,z+8,()=>shadeC(C.woodDark,.55));
  for(const x of [47.3,49.1]) fl(F2,x,0,x,19,C.iron);
  windowAt(F2,50.2,4,1.1,12,'dark',t);
  lettering(F2,47.2,53,'TIMBER',rgb('#aea187'),.45);
  for(const [x,z] of [[44.2,59],[49.1,65]]) chimney(x,-1.9,z,.8);
  for(const [i,j,z] of [[42.45,3.9,51],[46.7,4.5,57]]) thin(i,j,z-46,i,j,z,C.iron);
  tradeCraftDetails();
}
/** Static architecture is cached by the parent port background bake. */
export function portDistrictStatic(t){ tradeBuildings(t);pub(t); }
/** Stacks, ropes and people are sorted in the parent dock rendering queue. */
export function portDistrictProps(t){
  const result=[
    [30.5,()=>pubWindowsFX(t)],
    [59,()=>yardCraftProps(t)],
    [36.9,()=>{barrel(31.45,6.75);barrel(31.9,6.85);}],
    [47.8,()=>{ for(const [i,j] of ANCHORS.pub_street_barrels) barrel(i,j); }],
    [57.2,()=>{crate(43.1,5.2,1.3,1.15,7,0,0,1);crate(43.2,5.25,1.15,1,5,7,2);}],
    [61,()=>{crate(49.25,10.7,1,1.1,5,0,1);crate(50.4,10.6,1,1.2,6,0,0);}],
    [59.2,()=>{for(let k=0;k<6;k++)isoBox(48.5,11.4+k*.22,51.1,11.55+k*.22,k*.75,k*.75+.44,C.woodLight,WOOD,WOOD_DARK);}],
    [52.1,()=>{
      const dark=rgb('#405035'), light=rgb('#6b7645');
      for(const [i,j] of [[39.8,11.75],[40.5,11.7],[40.7,12.05],[40.45,12.45],[39.85,12.4]]){
        thin(i,j,.04,i-.08,j-.03,.85,dark);
        thin(i,j,.04,i+.06,j+.03,1.2,light);
        thin(i,j,.04,i+.12,j-.05,.65,dark);
      }
    }],
  ];
  // The people of the new quay and what they work with, sorted with the dock props.
  result.push(...portLifeProps(t));
  return result;
}
/** Flickering, localized atmospheric accents, added before final port fog. */
export function portDistrictFX(t){
  for(const [i,j,z] of [[34.2,5.92,13],[38.1,5.92,14],[35,5.92,34.5]])
    spot(isoX(i,j),isoY(i,j,z),11,12,.095+.025*Math.sin(t*.036+i),GLAZE);
  smoke(34.2,-.4,72,t,24,7,520,C.smoke,1);
  smoke(49.4,-1.35,77,t,36,5,560,C.smoke,1);
}
