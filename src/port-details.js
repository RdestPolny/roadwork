/* Tiny, readable architectural details of Wapping; all static and drawn in
 * port camera coordinates. Keep these in the parent's baked background pass.
 * No sprite sheets or new renderer primitives.
 */
import { rgb } from './appearance.js';
import { quad, isoBox, isoX, isoY, shadeC } from './gym.js';
import { h2 } from './boxing.js';
import { C, contact, floor, thin, stroke, rope, cyl, roundLit,
  fq, fl, onJ, onI, vn, frac, ground } from './thames-port.js';

const IRON=rgb('#1c1e1b'), RUST=rgb('#664936');
const HONEY=rgb('#ab804e'), LIGHT=rgb('#dcaa65');
const OAK=rgb('#574331'), CUT=rgb('#816347'), END=rgb('#30261f');
const PITCH=rgb('#1a1c1d');
const soft=(x,y)=>.72+vn(x*.09,y*.13)*.25;
/** Cast-iron bracket, riveted joinery and a readable lantern at pub entry. */
export function pubCraftDetails(){
  const F={j:5.94};
  // Eaves and corbels: the pub should not be a featureless brick cuboid.
  for(let i=31.1;i<39.4;i+=1.08){
    isoBox(i,5.8,i+.18,6.32,45.5,47.4,C.woodLight,OAK,END);
    thin(i+.12,6.33,46.4,i+.65,5.9,44,C.ironHi);
  }
  // Two irregular lines of blackened mortar below the cornice.
  for(const z of [45,46.3]) thin(31,5.975,z,39.4,5.975,z,shadeC(C.mortar,1.05));
  // Knocked-around slate gutter, elbows, brackets and roof outlet.
  stroke(30.7,6.15,47.7,39.6,6.15,47.7,IRON);
  thin(30.7,6.18,48.1,39.6,6.18,48.1,C.ironHi);
  for(const i of [31.2,33.8,36.6,39.05]){
    thin(i,6.14,47.3,i,6.55,47.3,IRON);
    thin(i,6.55,47.3,i,6.55,46.7,IRON);
  }
  stroke(39.22,6.12,47.7,39.22,6.32,46.8,IRON);
  stroke(39.22,6.32,46.8,39.22,6.32,.4,IRON);
  for(let z=4;z<46;z+=7.5){
    thin(39.11,6.34,z,39.35,6.34,z,RUST);
  }
  // Small projecting sash bay, built as timber-supported glazed structure.
  const a=37.45,b=39.08,front=6.95;
  isoBox(a,5.96,b,front,24,25.2,C.woodLight,OAK,END);
  isoBox(a-.15,5.85,b+.2,front+.19,42.2,43.8,C.woodLight,OAK,END);
  // Glass face (warm late-evening silhouettes behind sash).
  quad(a+.12,front+.02,26.2,b-.12,front+.02,26.2,b-.12,front+.02,41.3,a+.12,front+.02,41.3,
    (x,y)=>shadeC(C.lit,soft(x,y)*(.7+.15*vn(x*.32,y*.14))));
  for(const i of [a+.06,(a+b)/2,b-.06])
    stroke(i,front+.06,26.2,i,front+.06,41.6,END);
  for(const z of [26.1,34.5,41.6])
    thin(a,front+.07,z,b,front+.07,z,C.woodLight);
  // Timbers at diagonal corners; iron pins in the beam.
  thin(a,front+.04,26.2,a-.28,5.97,24,C.woodLight);
  thin(b,front+.04,26.2,b+.26,5.97,24,C.woodLight);
  for(let i=a+.25;i<b;i+=.36)
    thin(i,front+.16,43.9,i+.02,front+.16,44.1,IRON);
  // Worn threshold and protective iron boot scraper beside the door.
  isoBox(34.9,6.5,36.75,7.02,0,.48,C.lintel,C.stone[1],C.stone[2]);
  stroke(36.82,6.25,.25,37.16,6.25,2,IRON);
  stroke(37.16,6.25,2,37.05,6.7,.25,IRON);
  // Openwork entry lantern (not electric lighting) and gas supply bracket.
  thin(34.55,5.95,24.2,34.55,6.8,24.2,IRON);
  thin(34.55,6.8,24.2,34.55,6.8,22.2,IRON);
  quad(34.26,6.6,22.1,34.78,6.6,22.1,34.78,6.6,25.1,34.26,6.6,25.1,
    (x,y)=>shadeC(LIGHT,soft(x,y)));
  for(const i of [34.25,34.79]) thin(i,6.64,22,i,6.64,25.3,IRON);
  stroke(34.2,6.64,25.4,34.83,6.64,25.4,IRON);
  // Decorative iron sign screws and faded beer advertisement.
  fq(F,32.25,6.5,33.15,13.1,(x,y)=>shadeC(C.paper[0],soft(x,y)*.75));
  for(const z of [9.5,11.2,12]) fl(F,32.37,z,33.02,z,END);
  for(const z of [18,21]) thin(38.7,6, z,38.9,6,z,RUST);
  // Small coal-dark stone pads under external beer barrels.
  floor(31.05,6.2,32.7,7.25,.025,(x,y)=>shadeC(C.stone[h2(x|0,y|0)&3],.57+vn(x*.31,y*.29)*.17));
}
/** Warehouse joinery, hand gear and signs: clearly a working dock, not a row of generic houses. */
export function tradeCraftDetails(){
  const A={j:3.93},B={j:4.53};
  // A: timber warehouse gate with protruding hand-operated block and tackle.
  isoBox(43.05,3.94,45.38,4.1,20.6,22.3,C.lintel,C.woodDark,C.stone[0]);
  for(const [x,z] of [[43.3,6],[43.4,16],[45.05,6],[45,16]])
    thin(x,3.98,z,x+.13,4,z+.2,IRON);
  isoBox(44.13,3.9,44.36,6.4,29.2,30.6,C.woodLight,OAK,END);
  stroke(44.25,6.16,30,44.25,6.16,17,IRON);
  cyl(44.25,6.15,.35,16.3,17.8,()=>shadeC(IRON,1.3),()=>C.ironHi);
  thin(44.25,6.2,16.4,44.25,6.2,14.7,C.wale);
  // Worn wooden planks on the lower store gate.
  for(let i=43.35;i<45.3;i+=.29)
    fl(A,i,1,i,19,shadeC(OAK,.77+vn(i*6,1)*.3));
  for(const z of [3.1,14.5]) fl(A,43.23,z,45.27,z,IRON);
  // B: sliding workshop door, rope hung on pegs, and hand-painted name board.
  isoBox(47.2,4.51,49.25,4.7,19.4,21,C.woodLight,OAK,END);
  for(let i=47.3;i<49.2;i+=.34)
    fl(B,i,.25,i,19,shadeC(OAK,.65+vn(i*5,3)*.2));
  thin(47.3,4.55,4.7,49.15,4.55,17,IRON);
  thin(49.15,4.55,4.7,47.3,4.55,17,IRON);
  isoBox(46.95,4.62,50.5,4.9,23.8,28.5,C.woodLight,OAK,END);
  // Individual readable stencil strokes at this resolution, no neon/printed logo.
  for(let k=0;k<10;k++){
    const x=47.2+k*.29;
    thin(x,4.93,26.8,x+.15,4.93,26.4,shadeC(C.paper[0],.62+(k%3)*.12));
  }
  // Loose rope loops on pegs outside the rigging store.
  for(const [i,j] of [[45.6,4.62],[46,4.64],[50.7,4.65]]){
    thin(i,j,12,i,j+.38,12,IRON);
    for(const r of [.42,.68,.89]){
      const top=[i,j+.13,10.9],bot=[i,j+.19,6.2+r];
      rope(top,bot,1.7,C.ropeD);
    }
  }
  // Rusted chain descending to a ring on the yard wall.
  for(let z=4;z<20;z+=1.8){
    thin(51.1,4.58,z,51.3,4.58,z+.6,IRON);
    thin(51.3,4.58,z+.6,51.1,4.58,z+1.3,RUST);
  }
  // Drainage channel, packed mud and coach tracks alongside the new frontage.
  for(const j of [4.9,11.15]){
    thin(30.6,j,.055,51.6,j,.055,shadeC(C.iron,.9));
    thin(30.6,j+.13,.055,51.6,j+.13,.055,shadeC(C.wet,.46));
  }
  for(let i=32.5;i<51.5;i+=2.3){
    thin(i,10.1,.035,i+1.4,10.3,.035,shadeC(C.ironHi,.49));
    thin(i,10.73,.035,i+1.4,10.91,.035,shadeC(C.ironHi,.4));
  }
}
/** Supported decking really has bolted beams, diagonal braces, algae and mooring points. */
export function pierCraftDetails(rect){
  const [i0,j0,i1,j1]=rect;
  // Braces are below deck and meet the actual piling. Drawn in the cached static pass.
  for(let i=i0+.35;i<i1-.7;i+=2.3){
    for(const j of [j0+.73,j1-.5]){
      stroke(i,j,-7.1,i+.65,j+(.45*(j===j0+.73?1:-1)),-.55,C.woodDark);
      thin(i+.05,j,-6.6,i+.72,j+(.45*(j===j0+.73?1:-1)),-.65,C.woodLight);
      // Hand-forged iron clamp plates and bolt heads.
      for(const z of [-4.6,-.7]){
        thin(i,j,z,i+.54,j,z,C.ironHi);
        thin(i+.22,j,z-.4,i+.22,j,z+.4,PITCH);
      }
      // Green tide mark well below deck, no false waterline at quay height.
      thin(i,j,-6.95,i+.5,j,-6.95,C.slime);
      thin(i,j,-6.2,i+.5,j,-6.2,shadeC(C.slime,.75));
    }
  }
  // Iron nail rows and longitudinal seams: deterministic and crisp at 432×288.
  for(let i=i0+.8;i<i1-.35;i+=1.1){
    for(let j=j0+.65;j<j1;j+=1.33){
      thin(i,j,.34,i+.07,j,.34,IRON);
      thin(i+.33,j,.34,i+.38,j,.34,shadeC(IRON,.65));
    }
  }
  // Cast-iron mooring rings at extremities, with a short slack line.
  for(const i of [i0+.72,i1-.72]){
    const j=j1-.5;
    stroke(i,j,.4,i,j,1.7,PITCH);
    for(let n=0;n<8;n++){
      const a=n*Math.PI/4,b=(n+1)*Math.PI/4;
      thin(i+Math.cos(a)*.27,j+Math.sin(a)*.27,1.85,
           i+Math.cos(b)*.27,j+Math.sin(b)*.27,1.85,C.ironHi);
    }
    rope([i,j,1.85],[i+.42,j-1.4,.3],.3,C.ropeD);
  }
}
/** Workshop hand tools, a rope coil and a wooden trestle, only small silhouettes. */
export function yardCraftProps(t){
  // Cooperage trestle, saw and uneven planks near the timber goods.
  const i=45.35,j=10.15;
  isoBox(i,j,i+1.8,j+.32,4.4,5.2,C.woodLight,OAK,END);
  for(const x of [i+.15,i+1.6]){
    stroke(x,j,4.4,x-.27,j+.3,.4,END);
    stroke(x,j+.28,4.4,x+.24,j+.4,.4,END);
  }
  thin(i+.3,j+.1,5.4,i+1.2,j+.1,5.4,C.ironHi);
  stroke(i+.25,j+.05,5.35,i+.1,j+.12,7.6,END);
  // Heavy net on a low rack instead of a row of identical crates.
  for(let k=0;k<5;k++){
    const x=41.1+k*.27;
    rope([x,7.4,2.6],[x+1.1,8.7,2.45],.3,shadeC(C.ropeD,.92));
  }
  for(let j=7.4;j<8.6;j+=.24){
    rope([41.1,j,2.65],[42.95,j+.13,2.5],.23,shadeC(C.rope,.7));
  }
  // Coiled mooring line over the pier planks.
  const bi=49.9,bj=22.8;
  for(let k=0;k<22;k++){
    const a=k*Math.PI*2/22,b=(k+1)*Math.PI*2/22;
    const ri=.75-.25*k/22,rj=.48-.13*k/22;
    thin(bi+Math.cos(a)*ri,bj+Math.sin(a)*rj,.4,
         bi+Math.cos(b)*ri,bj+Math.sin(b)*rj,.4,C.rope);
  }
  // A hanging tackle hook on the front workshop wall.
  stroke(50.4,5.12,18,50.4,5.12,10.4,PITCH);
  thin(50.4,5.12,10.4,50.68,5.12,9.7,C.ironHi);
  thin(50.68,5.12,9.7,50.88,5.12,10.4,C.ironHi);
  // Slowly shifting thin smoke/steam from a vendor's pot: a micro-animation.
  void t;
}
