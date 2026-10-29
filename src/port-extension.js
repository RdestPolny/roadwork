/* Extended Thames dock — modular environment art and decorative ambient life.
 * Called by thames-port after its original projection has been installed.
 * No new interactions or gameplay states are introduced here.
 */
import { rgb, state as appearanceState } from './appearance.js';
import { state as boxingState } from './boxing.js';
import { quad, isoBox, isoX, isoY, shadeC } from './gym.js';
import { h2 } from './boxing.js';
import { DISTRICT, PORT_LIFE, portRoutine } from './port-district.js';
import { pubCraftDetails, tradeCraftDetails, pierCraftDetails, yardCraftProps } from './port-details.js';
import { C, floor, stroke, thin, rope, vn, frac, barrel, crate, chimney,
  onI, onJ, ground, brickAt, windowAt, lettering, fq, fl, contact, cyl, roundLit,
  smoke, spot, docker, dockPerson, walkJoints, hull, gasLamp, bollard } from './thames-port.js';

const WOOD=rgb('#4b3527'), WOOD_HI=rgb('#75604a'), WOOD_DARK=rgb('#211b17');
const BRICK_PUB=[rgb('#493126'),rgb('#53382c'),rgb('#392b27'),rgb('#604135')];
const BRICK_YARD=[rgb('#504838'),rgb('#5c513f'),rgb('#393b34'),rgb('#6b5844')];
const GLAZE=rgb('#db9d54');
const DECK_Z=.25;
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
  // Explicit plank seams, frame edges, exposed beam ends.
  for(let j=j0+.32;j<j1;j+=.33) thin(i0,j,DECK_Z+.03,i1,j,DECK_Z+.03,shadeC(WOOD_DARK,.85));
  for(const j of [j0,j1]) stroke(i0,j,.4,i1,j,.4,C.woodLight);
  for(let i=i0;i<=i1;i+=2.3) thin(i,j1,-.5,i,j1,DECK_Z+.7,C.iron);
  pierCraftDetails(rect);
}
function rail(i0,j0,i1,j1){
  const length=Math.hypot(i1-i0,j1-j0),n=Math.ceil(length/1.4);
  for(let k=0;k<=n;k++){
    const u=k/n,i=i0+(i1-i0)*u,j=j0+(j1-j0)*u;
    stroke(i,j,DECK_Z,i,j,6.4,WOOD_DARK);
    thin(i,j,6.4,i,j,7,WOOD_HI);
  }
  stroke(i0,j0,6.5,i1,j1,6.5,C.woodLight);
  thin(i0,j0,3.4,i1,j1,3.4,WOOD_HI);
}
/** Both raised timber surfaces are walkable and connected to the old quay. */
export function portDecks(){
  renderDeck(DISTRICT.terrace,41);
  renderDeck(DISTRICT.pier,86);
  // Open at the quay entrances; low rails only at the waterward edges.
  rail(33.1,16.2,39.3,16.2);
  rail(33.1,13,33.1,16.2);rail(39.3,13,39.3,16.2);
  rail(42.2,25,51.8,25);
  rail(42.2,13,42.2,25);rail(51.8,13,51.8,25);
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
/** Pub with public-house sash windows and low wooden riverside terrace. */
function pub(t){
  const F={j:5.9}, side={i:39.5},j=5.9;
  wallJ(30.9,39.5,j,48,BRICK_PUB,91);
  wallI(39.5,-1,5.9,48,BRICK_PUB,111);
  roofPlane(30.65,39.7,-1.3,6.2,48,59,14);
  // Stone coping and irregular string course.
  fq(F,30.9,22.2,39.5,23.4,()=>C.lintel);
  fq(F,30.9,46.4,39.5,48,()=>C.woodDark);
  for(const [i,k] of [[31.7,'lit'],[37.6,'lit']]) windowAt(F,i,3.4,1.25,12,k,t);
  for(const [i,k] of [[31.5,'dark'],[34.3,'lit'],[37.6,'lit']]) windowAt(F,i,27.6,1.4,13,k,t);
  windowAt(side,1.2,25,1.3,11,'dark',t);
  // Panelled, inward-opening pub door and worn threshold.
  fq(F,34.95,0,36.65,18.2,()=>C.black);
  fq(F,35.06,0,36.52,17.5,(x,y)=>shadeC(C.wood,.72+vn(x*.2,y*.3)*.23));
  for(const i of [35.2,35.85,36.4]) fl(F,i,1,i,16,C.woodDark);
  for(const z of [5.5,14]) fl(F,35.05,z,36.52,z,C.ironHi);
  thin(36.32,j+.06,8,36.38,j+.08,8.5,C.lamp);
  isoBox(34.8,5.9,36.75,6.55,0,.65,C.lintel,C.stone[2],C.stone[0]);
  // Hand-painted long frontage and projecting iron pub sign.
  fq(F,31.4,17.0,39.15,22.75,()=>shadeC(C.woodDark,.76));
  fl(F,31.4,17.05,39.15,17.05,C.wale);
  fl(F,31.4,22.76,39.15,22.76,C.wale);
  lettering(F,31.78,21.9,'THE ROPE & ANCHOR',rgb('#c9b083'),.72,.62);
  stroke(38.6,6,28,39.5,7.55,28,C.iron);
  stroke(39.5,7.55,28,39.5,7.55,21.7,C.iron);
  quad(38.75,7.52,21.3,39.95,7.52,21.3,39.95,7.52,27.6,38.75,7.52,27.6,()=>C.woodDark);
  thin(39.35,7.56,26,39.35,7.56,23.3,C.wale);
  thin(39.07,7.56,24.1,39.65,7.56,24.1,C.wale);
  thin(39.35,7.56,23.1,39.07,7.56,24.2,C.wale);
  thin(39.35,7.56,23.1,39.65,7.56,24.2,C.wale);
  for(const i of [31.1,39.25]) thin(i,5.94,0,i,5.94,47,C.iron);
  chimney(33.7,-.8,59,1.15);
  // Rainwater pipe and old nail marks at the rear corner.
  thin(39.28,5.96,46,39.28,5.96,0,C.iron);
  for(let z=5;z<45;z+=8) thin(39.15,5.97,z,39.42,5.97,z,C.ironHi);
  pubCraftDetails();
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
  fq(F2,47.3,0,49.1,19,()=>shadeC(C.wood,.69));
  for(const x of [47.4,48.25,49]) fl(F2,x,0,x,19,C.iron);
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
    [59,()=>yardCraftProps(t)],
    [36.9,()=>{barrel(31.45,6.75);barrel(31.9,6.85);}],
    [47.8,()=>{barrel(39.4,8.4);barrel(39.5,9.2);}],
    [57.2,()=>{crate(43.1,5.2,1.3,1.15,7,0,0,1);crate(43.2,5.25,1.15,1,5,7,2);}],
    [55.5,()=>{barrel(48.55,5.4);barrel(49.3,5.4);barrel(49,6.1);}],
    [61,()=>{crate(49.25,10.7,1,1.1,5,0,1);crate(50.4,10.6,1,1.2,6,0,0);}],
    [59.2,()=>{for(let k=0;k<6;k++)isoBox(48.5,11.4+k*.22,51.1,11.55+k*.22,k*.75,k*.75+.44,C.woodLight,WOOD,WOOD_DARK);}],
    [57,()=>{for(let k=0;k<3;k++)barrel(41.2+k*.4,12.1-k*.4);}],
    [60.6,()=>{crate(43.4,15.1,1.2,1.3,7,DECK_Z,2,0);crate(44.8,15.4,1.1,1.1,6,DECK_Z,1,1);}],
    [70.4,()=>{for(let k=0;k<4;k++)isoBox(48.4,18+k*.55,50.7,18.24+k*.55,DECK_Z,DECK_Z+1.2+k*.05,WOOD_HI,WOOD,WOOD_DARK);}],
    [49.9,()=>{contact(40,10.5,41,11.4);barrel(40.25,11.2);crate(40.3,11.7,.85,.7,5);}],
  ];
  // Dock props and living routines share the native skeletal figure renderer.
  for(let k=0;k<PORT_LIFE.length;k++){
    const npc=PORT_LIFE[k],p=portRoutine(t,npc);
    result.push([p.i+p.j,()=>portLifeFigure(npc,p,t)]);
  }
  // Barrel borne between two porters on their return journey.
  const carrier=portRoutine(t,PORT_LIFE[0]);
  if(carrier.stage==='return') result.push([carrier.i+carrier.j+.4,()=>barrel(carrier.i+.45,carrier.j+.45,5.5)]);
  return result;
}
const CLOTH=[
  ['#2e2a24','#4d4438','#6c6050'],
  ['#292b2b','#454e4c','#66706b'],
  ['#282d32','#3d4a51','#677681'],
  ['#403127','#634537','#806146'],
];
/** Body-weight and hand poses for the existing skeletal figure renderer.
 * The gestures are decorative: no new animations, movement AI or gameplay hitboxes.
 */
function portLifeFigure(npc,p,t){
  const x=isoX(p.i,p.j),y=isoY(p.i,p.j,0);
  if(x<-65||x>appearanceState.W+65||y<-85||y>appearanceState.H+65) return;
  const moving=p.walking,phase=(t+npc.shift)*.012;
  const work=p.stage==='work',rest=p.stage==='rest';
  const crouch=(npc.act==='rope'||npc.act==='inspect')&&work;
  const seated=(npc.act==='rest'&&rest)||(npc.act==='rope'&&work);
  const lift=(npc.act==='barrel'&&work)||(npc.act==='boathook'&&work);
  const bob=Math.sin(phase)*.16,base=walkJoints(moving?phase:.25,false,1);
  const J=side=>{
    const limb=base(side),s=side;
    if(seated){
      limb.hip=[-.15,s*1.2,4.3+bob*.4];
      limb.knee=[2.6,s*1.3,3.65];
      limb.foot=[3.1,s*1.44,.9];
      limb.sh=[.8,s*2.7,10.4+bob*.3];
      limb.el=[1.55,s*2.55,7.3];
      limb.hd=[2.6,s*2.6,5.4];
    } else if(crouch){
      limb.hip=[1,s*1.25,5.8];
      limb.knee=[2.5,s*1.3,3.15];
      limb.foot=[1.9,s*1.5,.9];
      limb.sh=[2.5,s*2.6,9.7+bob];
      limb.el=[3.6,s*2.1,7.5];
      limb.hd=[4.5,s*1.9,5.4+bob];
    } else if(!moving){
      limb.el=[.45+Math.sin(phase+s)*.2,s*3.15,9.7+bob];
      limb.hd=[.8+Math.sin(phase+s)*.2,s*3.2,7.9+bob];
    }
    if(lift&&!moving){
      // Barrel movers put their shoulders under the shared cask.
      limb.hip=[.4,s*1.2,6.5];
      limb.knee=[1.5,s*1.2,3.7];
      limb.sh=[1.2,s*2.75,11.8+bob];
      limb.el=[2.5,s*3.05,12.1+bob];
      limb.hd=[3.5,s*3.05,14.1+bob];
    }
    if(npc.act==='pipe'&&s>0&&work){
      limb.el=[1.2,s*2.3,11.3];limb.hd=[1.8,s*2.5,13.9+bob];
    }
    if(npc.act==='talk'&&work&&s>0){
      limb.el=[1.6+Math.sin(phase)*.8,s*2.9,10.2];
      limb.hd=[3.3+Math.sin(phase)*1.2,s*3.4,11.2+Math.sin(phase*.67)*1.3];
    }
    if(npc.act==='wiping'&&work){
      limb.el=[1.5,s*2.5,10.5];
      limb.hd=[2.2,s*2.4,12+Math.sin(phase*1.7)*1.1];
    }
    if(npc.act==='ledger'&&work){
      limb.el=[2.2,s*2.2,10.1];limb.hd=[2.6,s*2.05,10.6+Math.sin(phase)*.4];
    }
    if(npc.act==='boathook'&&work){
      limb.el=[1.8,s*2.7,11.5];limb.hd=[3,s*3.1,13.5];
    }
    if(npc.act==='rest'&&work&&s>0){
      limb.el=[1.15,s*2.2,10.7];limb.hd=[1.5,s*2.15,14.4+bob];
    }
    if(npc.act==='vendor'&&work){
      limb.el=[1.7,s*2.6,10.2];limb.hd=[2.5,s*2.7,8.8+Math.sin(phase)*.4];
    }
    return limb;
  };
  J.pel=seated?[0,0,3.8+bob*.3]:crouch?[1.4,0,5.3]:lift&&work?[.4,0,6.4]:base.pel;
  J.chest=seated?[1.35,0,8.9]:crouch?[2.8,0,9.1]:[.5+(work?.55:0),0,12+bob];
  J.head=seated?[1.65,0,12]:crouch?[3.2,0,12]:[.65+(work?.55:0),0,15.3+bob];
  const floorZ=npc.id==='sailor'||npc.id==='boatman'||npc.id==='pierhand'?DECK_Z:0;
  const face=(()=>{
    if(npc.act==='pipe')return [0,1];
    if(npc.id==='talk-a')return [.8,.6];
    if(npc.id==='talk-b')return [-.8,.6];
    return [p.fi,p.fj];
  })();
  const figure={i:p.i,j:p.j,fi:face[0],fj:face[1],z0:floorZ};
  contact(p.i-.2,p.j-.2,p.i+.2,p.j+.2,floorZ,.43);
  if(seated){
    // Packing crate doubles as a makeshift seat for tired labourers.
    isoBox(p.i-.34,p.j-.25,p.i+.4,p.j+.3,floorZ,4.25+floorZ,C.woodLight,C.wood,C.woodDark);
  }
  docker(figure,J,CLOTH[npc.tone]);
  if(npc.act==='cart'&&p.stage!=='rest'){
    // Flat handbarrow with two iron-tyred wheels, cargo tied with a rope.
    const i=p.i-.95,j=p.j+.6;
    isoBox(i,j,i+1.2,j+.65,1.5,2.2,WOOD_HI,WOOD,WOOD_DARK);
    isoBox(i+.12,j+.12,i+.85,j+.48,2.2,4.2,C.crate[1],C.wood,C.woodDark);
    for(const xx of [i+.2,i+1]) cyl(xx,j+.35,.23,0,1.5,()=>C.iron,()=>C.ironHi);
    stroke(i+1.1,j+.3,2.1,p.i,p.j,7,C.woodLight);
    rope([i+.2,j+.16,4],[i+.95,j+.5,4],.14,C.ropeD);
  }
  if(npc.act==='boathook'&&work)
    stroke(p.i+.1,p.j+.2,.8,p.i+1.3,p.j+2.1,13,C.wale);
  if(npc.act==='pipe'&&work){
    thin(p.i+.2,p.j+.3,14,p.i+.42,p.j+.32,14.2,C.ironHi);
    smoke(p.i+.15,p.j,15.2,t,3,3,300,C.fog,.24);
  }
  if(npc.act==='ledger'&&work){
    isoBox(p.i-.2,p.j+.1,p.i+.55,p.j+.45,8,8.35,C.paper[0],C.paper[1],C.paper[0]);
    for(let k=0;k<3;k++) thin(p.i-.12,p.j+.12+k*.08,8.4,p.i+.43,p.j+.12+k*.08,8.4,C.iron);
  }
  if(npc.act==='wiping'&&work){
    quad(p.i+.12,p.j+.1,9.5,p.i+.65,p.j+.1,9.6,p.i+.8,p.j+.1,7.1,p.i+.16,p.j+.1,7,()=>C.paper[0]);
  }
  if(npc.act==='rope'&&work){
    for(let k=0;k<5;k++) rope([p.i+.35,p.j+.2+k*.1,2],[p.i+.9,p.j+.3+k*.1,1.8],.14,C.rope);
  }
  if(npc.act==='vendor'&&work){
    const i=p.i+.45,j=p.j+.25;
    isoBox(i,j,i+.7,j+.62,0,3.8,C.woodLight,C.wood,C.woodDark);
    cyl(i+.4,j+.3,.33,3.8,5.5,()=>C.iron,()=>C.ironHi);
    smoke(i+.4,j+.3,6,t,17,4,360,C.fog,.3);
  }
  if(npc.act==='rest'&&work&&Math.sin(phase)>.2)
    smoke(p.i,p.j+.15,15.2,t,35,2,250,C.fog,.16);
}
/** Flickering, localized atmospheric accents, added before final port fog. */
export function portDistrictFX(t){
  for(const [i,j,z] of [[34.2,5.92,13],[38.1,5.92,14],[35,5.92,34.5]])
    spot(isoX(i,j),isoY(i,j,z),11,12,.095+.025*Math.sin(t*.036+i),GLAZE);
  smoke(34.2,-.4,72,t,24,7,520,C.smoke,1);
  smoke(49.4,-1.35,77,t,36,5,560,C.smoke,1);
}
