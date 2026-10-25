/* The shed baked from code, a wooden resistance box on an iron pedestal, and the original boxer skeleton. */
import { state as A, rgb } from './appearance.js';
import { state as B, h2 } from './boxing.js';
import { state as R, setFramebuffer, pset, line } from './renderer.js';
import { makeFig, pose, drawFig, saveJoints, restoreJoints } from './cast.js';
import { state as progression } from './progression.js';
import { isRising, crankOffset } from './crank-rules.js';
import { vnoise, fbm } from './noise.js';

const cl = (/** @type {number} */ v)=>v<0?0:v>255?255:Math.round(v);
const pack = (/** @type {number} */ r,/** @type {number} */ g,/** @type {number} */ b)=>(0xff000000|(cl(b)<<16)|(cl(g)<<8)|cl(r))>>>0;
/** @param {number} a @param {number} b @param {number} k */
export function mixc(a,b,k){ return pack((a&255)+((b&255)-(a&255))*k,((a>>8)&255)+(((b>>8)&255)-((a>>8)&255))*k,((a>>16)&255)+(((b>>16)&255)-((a>>16)&255))*k); }
/** @param {number} a @param {number} k */
export function mulc(a,k){ return pack((a&255)*k,((a>>8)&255)*k,((a>>16)&255)*k); }
/** @param {number} a @param {number} b @param {number} x */
export function smooth(a,b,x){ const t=Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }

let plate=null,figure,sprite,head=[180,78],personX=158;
const W=288,H=192,FLOOR=178,PERSON=158,HUB={x:122,y:110},RADIUS=18;
const C={iron:0xff333332,dark:0xff161718,light:0xff77766d,shine:0xffa8a292,wood:0xff35475a,grain:0xff2a3847,edge:0xff252c34,chalk:0xff8d968f,gold:0xff6d9db9,sweat:0xffbec3a7,rust:0xff35415e};
const POSTS=[[57,68],[245,256]],WIN={x0:155,x1:190,y0:12,y1:42},WALL_Y1=107,LAMP={x:20,y:38};
/** Dark oak with its grain, lit by `light`. @param {number} x @param {number} y @param {number} light @param {boolean} vertical */
function oak(x,y,light,vertical){ return mulc(mixc(rgb('#24190f'),rgb('#4e3a26'),fbm(vertical?x*0.9:x*0.08,vertical?y*0.08:y*0.9)),light); }
/** Sooty rubble stone in uneven courses, blotched with damp. @param {number} x @param {number} y */
function stone(x,y){
  const course=(y/6)|0, off=h2(course,7)%9, bx=Math.floor((x+off)/(9+(h2(course,3)&3))), id=h2(bx+11,course*5+1);
  const mort=y%6===0||(x+off)%(9+(h2(course,3)&3))===0;
  let c=mort?rgb('#15130f'):mulc([rgb('#3b342c'),rgb('#443b31'),rgb('#332d27'),rgb('#4a4036')][id&3],0.8+((id>>2)&15)/15*0.3);
  const damp=fbm(x*0.06+5,y*0.07); if(damp>0.6) c=mixc(c,rgb('#5e5446'),0.5); else if(damp<0.3) c=mixc(c,rgb('#14110e'),0.45);
  return c;
}
/** Flagstones in rows that widen toward the camera, cracked and worn. @param {number} x @param {number} y */
function flag(x,y){
  const rows=[WALL_Y1,113,122,133,148,165,185,H], r=rows.findIndex(v=>y<v)-1, h=rows[r+1]-rows[r], w=26+r*9, off=h2(r,9)%w;
  const id=h2(Math.floor((x+off)/w),r+4), joint=y===rows[r]||(x+off)%w===0;
  let c=joint?rgb('#16130f'):mulc(rgb('#4a4236'),0.7+(id&15)/40+0.12*(y-rows[r])/h);
  const wear=fbm(x*0.07,y*0.15); if(!joint&&wear>0.6) c=mixc(c,rgb('#6a604e'),(wear-0.6)*1.4);
  if(!joint&&(id&7)===0&&Math.abs((x+off)%w-w/2-(y-rows[r])*0.8)<0.6) c=rgb('#1c1813');   // a crack
  return c;
}
/** The shed's colour at a pixel, before light. @param {number} x @param {number} y */
function shedAt(x,y){
  const px=x+0.5, py=y+0.5;
  if(py<WIN.y1+3&&px>=WIN.x0-3&&px<WIN.x1+3&&py>=WIN.y0-3){   // the barred window in its dressed stone frame, sky beyond
    const inner=px>=WIN.x0&&px<WIN.x1&&py>=WIN.y0&&py<WIN.y1, ax=(px-(WIN.x0+WIN.x1)/2)/((WIN.x1-WIN.x0)/2+3), arch=py<WIN.y0+5&&ax*ax+((WIN.y0+5-py)/8)**2>1;
    if(arch) return py<18?oak(x,y,0.6,false):stone(x,y);
    if(!inner) return mulc(rgb('#7a7060'),0.8+0.2*vnoise(x*0.5,y*0.5));
    if((x-WIN.x0)%6===3||(x-WIN.x0)%6===4||y===WIN.y0+15) return rgb('#16130f');
    return mixc(rgb('#c9c8b8'),rgb('#8e9286'),(py-WIN.y0)/(WIN.y1-WIN.y0));
  }
  if(py<WALL_Y1) for(const [a,b] of POSTS) if(px>=a&&px<b&&py>=16){ const u=(px-a)/(b-a); return oak(x,y,u<0.3?1.1:u>0.75?0.55:0.85,true); }
  if(py>=16&&py<22) return oak(x,y,y===16?1.1:y===21?0.5:0.85,false);   // the wall plate under the rafters
  if(py<16){ const joist=[27,115,203,253].some(j=>Math.abs(px-j)<4+py*0.15); return joist?oak(x,y,0.75,true):mulc(oak(x,y,0.45,false),0.6); }
  for(const [a,b] of POSTS) for(const s of [-1,1]){   // knee braces from the posts up to the plate
    const root=s<0?a:b, d=s*(px-root); if(d>0&&d<18&&Math.abs(22+d-py)<2.2&&py<40) return oak(x,y,0.7,false); }
  if(py<WALL_Y1){
    for(const [a,b] of [[3,23],[265,285]]) if(px>=a&&px<b&&py>=95){   // two low benches against the wall
      if(py<98) return oak(x,y,py<96?1:0.7,false);
      if((px-a<3||b-px<3)) return oak(x,y,0.6,true);
      return mulc(stone(x,y),0.6); }
    if(Math.abs(px-LAMP.x)<3&&py>=LAMP.y-8&&py<LAMP.y+6){   // the lantern on its bracket
      if(py<LAMP.y-5) return rgb('#1a1714');
      if(Math.abs(px-LAMP.x)<2&&py<LAMP.y+4) return mixc(rgb('#ffe0a0'),rgb('#c47a2c'),Math.abs(px-LAMP.x)/2+(py-LAMP.y+5)/12);
      return rgb('#24201a'); }
    if(py>=LAMP.y-9&&py<LAMP.y-7&&px>=LAMP.x-3&&px<LAMP.x+8) return rgb('#1a1714');
    return mixc(stone(x,y),rgb('#0c0a08'),Math.min(1,(WALL_Y1-py)/120+(py>WALL_Y1-4?0.3:0)));
  }
  return flag(x,y);
}
/** Bake the shed once: stone, oak and flags, lit by the lantern, the window and its shaft of daylight. */
export async function loadCrankScene(){
  if(plate)return;
  const out=new Uint32Array(W*H);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    let c=shedAt(x,y);
    const lamp=Math.exp(-((x-LAMP.x)**2+(y-LAMP.y)**2)/900), shaft=Math.exp(-((x-172+(y-WIN.y1)*0.08)**2)/180)*smooth(WIN.y1,WIN.y1+12,y)*(1-smooth(110,170,y));
    const dark=0.55+0.35*Math.exp(-((x-150)**2/12000+(y-120)**2/6000));
    c=mulc(c,dark+0.6*lamp); c=mixc(c,rgb('#e8b060'),0.18*lamp); c=mixc(c,rgb('#b8b8a8'),0.16*shaft);
    out[y*W+x]=c;
  }
  plate=out;
}
/** Snapshot the player's appearance with the existing prison outfit. */
export function prepareCrankScene(){figure=makeFig(progression.save.look);sprite=new Uint32Array(A.W*A.H);}
/** One physical grip target drives the iron handle and both hands, around the bearing. @param {any} c */
function grip(c){
  const offset=crankOffset(c.angle,RADIUS);
  return {x:HUB.x+offset.x,y:HUB.y+offset.y};
}
/** Pose hands through the shared IK and keep the main fighter's joints intact. @param {any} c */
export function prepareCrankFrame(c){
  const keep=saveJoints(),g=grip(c),strain=Math.sin(c.angle)*.13;
  try{
    personX=Math.round(PERSON-Math.max(0,HUB.x-g.x)*.5);
    const hx=50+(personX-g.x)/2,hy=86+(g.y-FLOOR)/2;
    // Lean into the far half of the circle so the hands remain within arm reach.
    pose({x:50,lean:4+Math.max(0,(140-g.x)*.16)+strain,squat:.15+(c.held?.12:0),bob:Math.sin(c.angle)*.35,
      near:[hx,hy],far:[hx,hy],feet:[58,44],headDx:-5});
    head=[personX+(50-B.headX)*2,FLOOR+(B.headY-86)*2];
    sprite.fill(0);drawFig(figure,{into:sprite});
  }finally{restoreJoints(keep);}
}
/** Fill a small solid rectangle in the current pixel buffer. @param {number} x @param {number} y @param {number} w @param {number} h @param {number} colour */
function rect(x,y,w,h,colour){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pset(xx,yy,colour);}
/** Shaded rivet or shaft cap. @param {number} x @param {number} y */
function rivet(x,y){rect(x-1,y-1,3,3,C.dark);pset(x,y,C.light);pset(x-1,y-1,C.shine);}
/** Reference-shaped wooden box with straps, access panel, resistance screw and a heavy bolted pedestal. */
function machine(){
  // Static wood and metal stay at whole pixels; the crank is the only moving machine part.
  rect(85,171,63,7,C.dark);line(85,171,143,171,C.light,C.iron);line(88,178,148,178,C.iron,C.dark);
  rect(106,117,21,54,C.dark);rect(110,119,12,51,C.iron);line(110,122,110,168,C.light,C.iron);
  for(let y=128;y<169;y+=8)line(111,y,121,y,C.iron,C.dark);
  rivet(91,174);rivet(139,174);
  // Broad side wall faces the camera; the axle starts in its centre, as in the sketch.
  rect(103,90,38,38,C.dark);rect(105,92,34,34,C.wood);
  for(let y=94;y<125;y+=4){
    line(106,y,138,y,C.grain,C.wood);
    line(108,y+1,119,y+2,C.wood,C.edge);
  }
  line(103,90,140,90,C.light,C.wood);
  rect(105,96,34,2,C.iron);rect(105,120,34,3,C.iron);
  for(const x of [108,136])for(const y of [97,121])rivet(x,y);
  rect(116,85,14,4,C.dark);rect(121,82,4,4,C.iron);line(116,82,130,82,C.light,C.iron);
  // Circular bearing seen from the side, with the long crank projecting toward the hands.
  for(let y=-8;y<=8;y++)for(let x=-8;x<=8;x++){
    const d=x*x+y*y;if(d>64)continue;
    pset(HUB.x+x,HUB.y+y,d>42?C.dark:d>30?(x+y<0?C.shine:C.iron):C.iron);
  }
  rivet(HUB.x,HUB.y);
}
/** Blit the original figure at 2× so hands and the iron grip remain readable. */
function person(){
  for(let sy=20;sy<96;sy++)for(let sx=15;sx<100;sx++){
    const c=sprite[sy*144+sx];if(!c)continue;
    const x=personX+(50-sx)*2,y=FLOOR+(sy-86)*2;
    rect(x,y,2,2,c);
  }
}
/** Animate sweat from the head, as the worker keeps turning the crank. @param {any} c */
function sweat(c){
  if(c.elapsed<1)return;
  for(let i=0;i<3;i++){
    const t=(c.elapsed*.9+i*.41)%1;
    if(t>.8)continue;
    const x=Math.round(head[0]-5+(i%3)*5+(i%2?-1:1)*t*8),y=Math.round(head[1]+3+t*25);
    pset(x,y,C.sweat);pset(x,y+1,C.light);
  }
}
/** Draw the machine and worker with a full revolution around the box bearing. @param {any} c */
export function renderCrankScene(c){
  const previous=setFramebuffer(R.FB_MAIN),g=grip(c);
  try{
    R.FB_MAIN.set(plate);
    for(let x=81;x<211;x++)for(let y=176;y<181;y++)if(((x-146)/66)**2+((y-178)/3)**2<1)pset(x,y,C.dark);
    machine();
    person();
    // A rigid crank turns a full circle around the bearing in the box wall.
    line(HUB.x,HUB.y,Math.round(g.x),Math.round(g.y),C.dark,C.dark);
    line(HUB.x,HUB.y-1,Math.round(g.x),Math.round(g.y)-1,C.shine,C.iron);
    rivet(HUB.x,HUB.y);
    line(Math.round(g.x)-1,Math.round(g.y)-1,Math.round(g.x)+4,Math.round(g.y)+1,C.dark,C.iron);
    pset(Math.round(g.x)+3,Math.round(g.y),C.shine);
    sweat(c);
    if(c.held!==isRising(c)&&c.elapsed>0){pset(HUB.x,HUB.y,C.rust);}
  }finally{setFramebuffer(previous);}
}
