/* Spectators of the side-on prison fights, seen from the front (the fighting skeleton only knows the profile): men
   standing on the floor behind the fight and egging it on, each in his own way (a fist, shouting through his hands and
   pointing, both arms up and clapping). Outfits: 'towel' (the bath), 'clothes' (the Ward), 'hood' (the exercise yard),
   'turnkey' (a peaked cap). Built once into four layers per man (calm + three cheering frames) at the native size;
   a grade function tints them for the room (steam, gloom). */

import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, taper, pset } from './renderer.js';
import { makeFig, inmateLook } from './cast.js';

/** Elbow and hand of each arm (s = −1 his right, on our left; +1 his left) for a pose, relative to the feet; d points to
 * the fighters (+1 to our right). Frame 0 calm, 1–3 cheering. @param {number} how @param {number} f @param {number} s @param {number} d @returns {number[][]} */
function fanArm(how,f,s,d){
  const up=[[s*7,-34],[s*8,-41]], mid=[[s*8,-30],[s*6,-36]], down=[[s*6,-23],[s*6,-17]];
  if(f===0) return how===0?[[s*5,-23],[-s*2,-25]]:how===1?[[s*8,-24],[s*4.5,-20]]:down;                      // arms folded, hands on the hips, arms down
  if(how===0) return f===3||s===d?(f===2?mid:up):[[s*5,-23],[-s*2,-25]];                                    // a fist pumping towards the fight, the other arm folded
  if(how===1) return f===1?[[s*6,-28],[s*1.5,-33]]:f===2?(s===d?[[s*7,-30],[s*11,-32]]:down):up;             // hands cupped at the mouth, pointing at the fight
  return f===1?up:f===2?mid:[[s*6,-25],[s*0.8,-28]];                                                         // both arms up, half way, clapping
}

/** One spectator from the front into the current frame buffer. @param {any} fig palette snapshot @param {Record<string,string>} look
 * @param {number} cx @param {number} fy feet @param {number} how @param {number} f @param {number} d @param {string} outfit */
function frontFan(fig,look,cx,fy,how,f,d,outfit){
  const A=appearanceState, keep=A.PAL.slice(); A.PAL.set(fig.pal);
  const SK=A.R_SKIN, SF=A.R_SKINF, P=(/** @type {number} */ x,/** @type {number} */ y)=>[Math.round(cx+x),Math.round(fy+y)];
  const towel=outfit==='towel', dressed=!towel, TOP=dressed?A.R_SHIRT:SK, TOPF=dressed?A.R_SHIRTF:SF, LEG=dressed?A.R_PANT:SK, LEGF=dressed?A.R_PANTF:SF;
  const seg=(/** @type {number[]} */ a,/** @type {number} */ r0,/** @type {number[]} */ b,/** @type {number} */ r1,/** @type {number} */ rp,/** @type {number} */ p)=>{ const [x0,y0]=P(a[0],a[1]), [x1,y1]=P(b[0],b[1]); taper(x0,y0,r0,x1,y1,r1,p,rp,0,-9,-9,0); };
  const shout=f>0, hy=-35+(shout&&how===1?-1:0), hood=outfit==='hood';
  try{
    for(let p=0;p<2;p++){                                                                                  // legs, hips, chest, head
      for(const s of [-1,1]){ seg([s*3.2,-1],1.5,[s*3.6,-1],1.5,A.R_BOOT,p); seg([s*3,-3],1.5,[s*2.8,-11],1.8,s<0?LEG:LEGF,p); seg([s*2.8,-11],1.9,[s*2.4,-18],2.4,s<0?LEG:LEGF,p); }
      seg([0,-30],1.6,[0,-31.5],1.6,hood?A.R_TRUNK:SK,p);
      seg([0,-20],dressed?4.0:3.7,[0,-29],5,TOP,p); for(const s of [-1,1]) seg([s*4.8,-28.5],2,[s*4.8,-28.5],2,TOP,p);
      if(towel) seg([0,-20.5],4.2,[0,-14.5],4.9,A.R_TRUNK,p); else seg([0,-20.5],4.0,[0,-17],4.2,LEG,p);
      seg([0,hy],hood?3.7:3.4,[0,hy],hood?3.7:3.4,hood?A.R_TRUNK:SK,p); }
    for(const s of [-1,1]){ const [e,h]=fanArm(how,f,s,d); for(let p=0;p<2;p++){ seg([s*5,-28.5],1.6,e,1.4,TOP,p); seg(e,1.4,h,1.2,TOP,p); seg(h,1.3,h,1.3,SK,p); } }   // arms over the body
    const [hx,hyy]=P(0,hy), st=look.style, dark=A.PAL[A.R_HAIR*3], out=A.C_OUT;
    if(hood){ for(const x of [-2,-1,1,2]) pset(hx+x,hyy,out); }                                             // two slits in the canvas
    else if(outfit==='turnkey'){ for(let y=-4;y<=-2;y++) for(let x=-4;x<=4;x++) if(x*x+(y+2)*(y+2)*3<=18) pset(hx+x,hyy+y,dark); for(let x=-4;x<=4;x++) pset(hx+x,hyy-1,out); }   // a peaked cap pulled down
    else { if(st!=='bald') for(let y=-4;y<=(st==='buzz'?-3:-2);y++) for(let x=-3;x<=3;x++) if(x*x+y*y<=13&&!(y===-2&&Math.abs(x)<2)) pset(hx+x,hyy+y,dark);
      if(!towel){ pset(hx-1+(d>0?1:0),hyy,out); pset(hx+1+(d>0?1:0),hyy,out); if(look.facial==='beard'||look.facial==='mustache') for(let x=-1;x<=1;x++) pset(hx+x,hyy+2,dark); } }
  } finally { A.PAL.set(keep); }
}

/**
 * Build a crowd. @param {{fans:{x:number,dy:number,how:number,outfit?:string}[],seed:number,outfit:string,top?:string[],pant?:string[],shoe?:string[],trunk?:string[],hair?:string[],
 *   turnkey?:{top:string[],pant:string[],cap:string[]},grade?:(c:number,x:number,y:number,outline:boolean)=>number}} o
 * @returns {{L:Uint32Array[],ph:number}[]}
 */
export function buildFrontCrowd(o){
  const A=appearanceState, w=A.W, h=A.H, F=A.FLOOR_Y, keepFb=rendererState.fb;
  const out=o.fans.map((p,k)=>{ const kind=p.outfit||o.outfit, look=inmateLook(o.seed+k*13), tk=kind==='turnkey'&&o.turnkey;
    const fig=makeFig(look,tk?o.turnkey.top:o.top,tk?o.turnkey.pant:o.pant,o.shoe,o.trunk);
    if(tk&&o.turnkey.cap) for(let q=0;q<3;q++) fig.pal[A.R_HAIR*3+q]=rgb(o.turnkey.cap[q]);   /* the cap takes the hair ramp */
    if(kind==='towel') for(let q=0;q<3;q++){ fig.pal[A.R_PANT*3+q]=fig.pal[A.R_SKIN*3+q]; fig.pal[A.R_PANTF*3+q]=fig.pal[A.R_SKINF*3+q]; }
    const d=p.x<w/2?1:-1, L=[];
    for(let f=0;f<4;f++){ const lay=new Uint32Array(w*h); rendererState.fb=lay; frontFan(fig,look,p.x,F+p.dy,p.how,f,d,kind);
      if(o.grade) for(let i=0;i<lay.length;i++){ const c=lay[i]; if(c) lay[i]=o.grade(c,i%w,(i/w)|0,c===A.C_OUT); }
      L.push(lay); }
    return {L,ph:k*11}; });
  rendererState.fb=keepFb;
  return out;
}

/** Which frame a spectator shows: egging the fighters on most of the time with short breaths between, all of them
 * shouting faster when a punch lands. @param {any} p @param {number} k @param {number} t @param {boolean} hot */
function fanFrame(p,k,t,hot){
  const beat=Math.floor((t+p.ph)/(hot?6:10));
  if(hot) return [1,2,1,2,3,2][(beat+k)%6];
  const on=((Math.floor((t+p.ph*7)/70))*7+k*3)%5<3;
  return on?[1,2,1,3][beat%4]:0;
}
/** Draw a crowd into the frame (hopping when a punch lands). @param {{L:Uint32Array[],ph:number}[]} crowd @param {number} t @param {boolean} hot */
export function drawFrontCrowd(crowd,t,hot){
  const M=rendererState.FB_MAIN, w=appearanceState.W;
  crowd.forEach((p,k)=>{ const f=fanFrame(p,k,t,hot), L=p.L[f], up=hot&&f&&((t+p.ph)>>2)&1?w:0;
    for(let i=up;i<L.length;i++){ const c=L[i]; if(c) M[i-up]=c; } });
}
