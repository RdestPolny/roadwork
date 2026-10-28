/* The shed baked from code, a wooden resistance box on an iron pedestal, and the original boxer skeleton. */
import { state as A, rgb } from './appearance.js';
import { state as B, h2, setVenueLight, clearVenueLight, setupFighterLight } from './boxing.js';
import { state as R, setFramebuffer, pset, line } from './renderer.js';
import { makeFig, flushed, pose, drawFig, saveJoints, restoreJoints } from './cast.js';
import { state as progression } from './progression.js';
import { isRising, crankOffset, TAU } from './crank-rules.js';
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
/** Secondary motion of the body, the sweat, the breath and the dust of the shed (visual only: the rules never read it). */
const anim={lean:4,leanV:0,squat:0.15,squatV:0,headLag:0,headV:0,jolt:0,prevSpeed:0,tick:0,
  /** @type {{dx:number,dy:number,vx:number,vy:number,creep:number,age:number,x:number,y:number}[]} */ drops:[],
  /** @type {{x:number,y:number,vx:number,vy:number,age:number,life:number}[]} */ puffs:[],
  /** @type {{x:number,y:number,ph:number}[]} */ motes:[]};
const RIM=rgb('#d8d4c2'), DROP=rgb('#8a9aa2'), DROP_TAIL=rgb('#526068'), BREATH=rgb('#b8beb6'), DUST=rgb('#b8b6a2'), FLAME=rgb('#fff6c8'), FLAME_LOW=rgb('#ffae42');

/** Snapshot the player's appearance with the existing prison outfit. */
export function prepareCrankScene(){
  figure=makeFig(progression.save.look); sprite=new Uint32Array(A.W*A.H);
  Object.assign(anim,{lean:4,leanV:0,squat:0.15,squatV:0,headLag:0,headV:0,jolt:0,prevSpeed:0,tick:0,drops:[],puffs:[]});
  anim.motes=Array.from({length:16},(_,k)=>({x:138+h2(k,3)/255*64,y:16+h2(k,7)/255*152,ph:k*1.3}));
}
/** One physical grip target drives the iron handle and both hands, around the bearing. @param {any} c */
function grip(c){
  const offset=crankOffset(c.angle,RADIUS);
  return {x:HUB.x+offset.x,y:HUB.y+offset.y};
}
/** Pose hands through the shared IK and keep the main fighter's joints intact; the body leans, sags and trails the pull on springs, the heel
 * drives on the way up, the skin flushes with the work and the window lights him from the side. @param {any} c */
export function prepareCrankFrame(c){
  const keep=saveJoints(), g=grip(c), rising=isRising(c), stalled=c.elapsed>0&&c.speed===0&&c.held!==rising;
  anim.tick++;
  if(stalled&&anim.prevSpeed>0.2) anim.jolt=1.4;   // the shoulders jerk when the crank suddenly stops
  else if(stalled) anim.jolt=Math.max(anim.jolt,0.35*Math.sin(anim.tick*0.7));
  else anim.jolt*=0.82;
  anim.prevSpeed=c.speed;
  const tired=Math.min(1,c.elapsed/24), pullPhase=rising?Math.sin(c.angle%Math.PI):0, dropPhase=!rising?Math.sin(c.angle%Math.PI):0;
  const breath=Math.sin(anim.tick*(0.08+tired*0.07))*(0.35+0.65*tired);
  const targetLean=3.6+Math.max(0,(140-g.x)*0.17)+pullPhase*1.6-dropPhase*0.6+anim.jolt*1.4;
  const targetSquat=0.13+(c.held?0.11:0.02)+dropPhase*0.09-pullPhase*0.05+Math.abs(anim.jolt)*0.06;
  anim.leanV+=(targetLean-anim.lean)*0.26; anim.leanV*=0.64; anim.lean+=anim.leanV;
  anim.squatV+=(targetSquat-anim.squat)*0.28; anim.squatV*=0.65; anim.squat+=anim.squatV;
  const targetHead=-anim.leanV*2.4+pullPhase*1.8+tired*1.4+anim.jolt*2.2+breath*0.6;
  anim.headV+=(targetHead-anim.headLag)*0.22; anim.headV*=0.68; anim.headLag+=anim.headV;
  try{
    personX=Math.round(PERSON-Math.max(0,HUB.x-g.x)*0.52-pullPhase*1.5+Math.round(anim.jolt));
    const hx=50+(personX-g.x)/2, hy=86+(g.y-FLOOR)/2;
    const liftNear=rising&&c.held?Math.round(pullPhase*2.2):0, liftFar=!rising&&c.speed>0.5?Math.round(dropPhase*1.1):0;   // the heel comes off the flags as he pulls
    pose({x:50,lean:anim.lean,squat:anim.squat,bob:Math.sin(c.angle)*0.45+breath*0.25,near:[hx,hy],far:[hx+0.6,hy-0.4],feet:[58,44],lift:[liftNear,liftFar],
      headDx:-5+Math.round(anim.headLag*0.35),headDy:Math.round(anim.headLag*0.65)});
    head=[personX+(50-B.headX)*2,FLOOR+(B.headY-86)*2];
    sprite.fill(0);
    setVenueLight(80,26,0.48); setupFighterLight(50,true);   // the window beyond his shoulder; the picture is flipped when he is blitted
    drawFig(tired>0.15?flushed(figure,tired*0.55):figure,{into:sprite});
  }finally{ clearVenueLight(); restoreJoints(keep); }
}
/** Fill a small solid rectangle in the current pixel buffer. @param {number} x @param {number} y @param {number} w @param {number} h @param {number} colour */
function rect(x,y,w,h,colour){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pset(xx,yy,colour);}
/** Shaded rivet or shaft cap. @param {number} x @param {number} y */
function rivet(x,y){rect(x-1,y-1,3,3,C.dark);pset(x,y,C.light);pset(x-1,y-1,C.shine);}
/** The wooden resistance box on its iron pedestal: oak staves with grain, forged straps and rivets, a brass revolution counter, the set screw,
 * a greased bearing, and a slight shiver of the box when the crank is jammed. @param {any} c */
function machine(c){
  const jx=anim.jolt>0.2?((anim.tick&1)?1:0):0;
  rect(84,171,65,7,C.dark); line(85,171,147,171,C.light,C.iron); line(84,178,149,178,C.dark,C.dark);
  rect(105,117,23,54,C.dark); rect(109,119,14,51,C.iron);
  line(109,120,109,169,C.shine,C.light); line(122,120,122,169,C.dark,C.edge);
  for(let y=126;y<169;y+=7){ line(110,y,121,y,C.light,C.iron); line(110,y+1,121,y+1,C.dark,C.dark); }
  rivet(91,174); rivet(116,174); rivet(141,174);
  const bx=103+jx, by=90;
  rect(bx-1,by+2,39,38,C.dark);
  rect(bx,by,38,38,C.dark); rect(bx+2,by+2,34,34,C.wood);
  for(let y=by+3;y<by+35;y++){
    const plank=((y-by)/5)|0, seam=(y-by)%5===0;
    for(let x=bx+2;x<bx+36;x++){
      if(seam){ pset(x,y,C.dark); continue; }
      const g=vnoise(x*0.18+plank*3,y*0.6), col=g>0.62?C.wood:g<0.35?C.edge:C.grain;
      pset(x,y,x<bx+7?mixc(col,C.shine,0.14):x>bx+31?mulc(col,0.78):col);
    }
  }
  line(bx,by,bx+37,by,C.shine,C.light);
  rect(bx+1,by+6,36,3,C.iron); line(bx+1,by+6,bx+36,by+6,C.light,C.iron);
  rect(bx+1,by+30,36,3,C.iron); line(bx+1,by+30,bx+36,by+30,C.light,C.iron);
  for(const x of [bx+5,bx+33]) for(const y of [by+7,by+31]) rivet(x,y);
  for(let y=HUB.y+6;y<by+35;y++) pset(HUB.x+(y&1),y,C.dark);   // grease running from the bearing
  const dx0=bx+9, dy0=by+14;   // the brass counter
  for(let dy=-3;dy<=3;dy++) for(let dx=-3;dx<=3;dx++){ const d2=dx*dx+dy*dy; if(d2<=10) pset(dx0+dx,dy0+dy,d2>6?C.dark:C.gold); }
  const dial=((c?.turns||0)+(c?.angle||0)/TAU)*0.6;
  pset(dx0+Math.round(Math.sin(dial)*2),dy0-Math.round(Math.cos(dial)*2),C.dark);
  rect(bx+13,85,14,5,C.dark); rect(bx+18,80,4,6,C.iron);   // the set screw
  for(let y=81;y<=85;y+=2) line(bx+18,y,bx+21,y,C.shine,C.dark);
  line(bx+13,80,bx+27,80,C.shine,C.iron);
  for(let y=-8;y<=8;y++) for(let x=-8;x<=8;x++){
    const d=x*x+y*y; if(d>64) continue;
    pset(HUB.x+x,HUB.y+y,d>46?C.dark:d>30?(x+y<-2?C.shine:x+y>4?C.dark:C.light):C.iron);
  }
  rivet(HUB.x,HUB.y);
}
/** Blit the original figure at 2× with a soft corner and a cold rim from the window; the back side is a little deeper in shadow. */
function person(){
  for(let sy=20;sy<96;sy++)for(let sx=15;sx<100;sx++){
    const c=sprite[sy*144+sx]; if(!c) continue;
    const x=personX+(50-sx)*2, y=FLOOR+(sy-86)*2, u=sprite[(sy-1)*144+sx], d=sprite[(sy+1)*144+sx], l=sprite[sy*144+sx+1], r=sprite[sy*144+sx-1];
    rect(x,y,2,2,c);
    if(c!==A.C_OUT){
      if(!r&&!d) pset(x+1,y+1,mulc(c,0.78));
      if(!l&&!u&&sx>48) pset(x,y,mixc(c,RIM,0.16));
    }
  }
}
/** Sweat and breath in the cold shed: drops first creep down the temple and chin, then fall (no white fringe); a puff of breath now and then. @param {any} c */
function sweat(c){
  const tired=Math.min(1,c.elapsed/20);
  if(c.elapsed>1.5&&c.speed>0.4&&anim.drops.length<10&&Math.random()<(0.04+0.08*tired))
    anim.drops.push({dx:-3+Math.random()*6,dy:2,vx:(-0.18-Math.random()*0.22)*(isRising(c)?1.2:0.5),vy:0.08,creep:10+(Math.random()*8|0),age:0,x:0,y:0});
  if(c.elapsed>0.5&&(anim.tick%Math.max(38,Math.round(95-tired*48)))===0&&anim.puffs.length<4) anim.puffs.push({x:head[0]-8,y:head[1]+4,vx:-0.28-Math.random()*0.12,vy:-0.18,age:0,life:44});
  for(const d of anim.drops){
    d.age++;
    if(d.creep>0){ d.creep--; d.dy+=0.18; d.x=head[0]+d.dx; d.y=head[1]+d.dy; }
    else{ d.vy+=0.09; d.vx*=0.96; d.x+=d.vx; d.y+=d.vy; }
    const x=Math.round(d.x), y=Math.round(d.y);
    if(y<FLOOR-1){ pset(x,y,DROP); if(d.creep===0&&d.vy>0.45) pset(x,y-1,DROP_TAIL); }
  }
  anim.drops=anim.drops.filter(d=>d.y<FLOOR-1&&d.age<90);
  for(const p of anim.puffs){
    p.age++; p.x+=p.vx; p.y+=p.vy;
    const k=p.age/p.life, r=2+k*5, a=0.28*(1-k);
    for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){
      if(dx*dx+dy*dy>r*r||((dx+dy+anim.tick)&1)) continue;
      const px=Math.round(p.x+dx), py=Math.round(p.y+dy);
      if(px>=0&&px<W&&py>=0&&py<H) R.fb[py*W+px]=mixc(R.fb[py*W+px],BREATH,a);
    }
  }
  anim.puffs=anim.puffs.filter(p=>p.age<p.life);
}
/** The living layer of the shed: the norm chalked on the wall, the lantern's flame, dust turning in the window's shaft. @param {any} c */
function shedLive(c){
  const t=anim.tick, marks=Math.min(15,c.turns||0);
  for(let m=0;m<marks;m++){ const gx=104+Math.floor(m/5)*11+(m%5)*2; if(m%5<4) line(gx,72,gx,77,C.chalk,C.light); else line(gx-7,76,gx+1,72,C.chalk,C.light); }   // tallies in fives
  const fl=(h2(t>>2,11)%3)-1;
  pset(LAMP.x+fl,LAMP.y-2,FLAME); pset(LAMP.x,LAMP.y-1,FLAME_LOW);
  for(const m of anim.motes){
    m.x+=Math.sin(t*0.015+m.ph)*0.08-0.02; m.y+=0.06+Math.cos(t*0.012+m.ph)*0.03;
    if(m.y>168){ m.y=WIN.y1+2; m.x=WIN.x0+2+(h2(m.ph*7|0,t)&31); }
    const x=m.x|0, y=m.y|0;
    if(x>=130&&x<205&&y>=WIN.y1&&y<168&&((x+y+t)&1)===0){ const beam=Math.exp(-((x-172+(y-WIN.y1)*0.08)**2)/210)*(1-(y-WIN.y1)/140); if(beam>0.12) R.fb[y*W+x]=mixc(R.fb[y*W+x],DUST,beam*0.38); }
  }
}
/** Draw the machine and worker with a full revolution around the box bearing. @param {any} c */
export function renderCrankScene(c){
  const previous=setFramebuffer(R.FB_MAIN),g=grip(c);
  try{
    R.FB_MAIN.set(plate);
    shedLive(c);
    for(let x=78;x<214;x++)for(let y=174;y<182;y++){ const q=((x-146)/68)**2+((y-178)/3.8)**2; if(q<1&&(q<0.65||((x+y)&1))) R.fb[y*W+x]=mulc(R.fb[y*W+x],q<0.55?0.45:0.68); }   // the machine's and the man's shadow on the flags
    machine(c);
    person();
    const gx=Math.round(g.x), gy=Math.round(g.y);
    line(HUB.x+2,HUB.y+3,gx+2,gy+3,C.dark,C.dark);   // the crank's shadow on the box
    line(HUB.x,HUB.y+1,gx,gy+1,C.dark,C.dark);
    line(HUB.x,HUB.y,gx,gy,C.iron,C.dark);
    line(HUB.x,HUB.y-1,gx,gy-1,C.shine,C.light);
    rivet(HUB.x,HUB.y);
    line(gx-2,gy-1,gx+4,gy+1,C.dark,C.wood);
    line(gx-1,gy-2,gx+4,gy,C.light,C.shine);
    pset(gx+4,gy,C.shine);
    sweat(c);
    if(c.held!==isRising(c)&&c.elapsed>0){pset(HUB.x,HUB.y,C.rust);}
  }finally{setFramebuffer(previous);}
}
