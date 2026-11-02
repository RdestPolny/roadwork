/**
 * Isolated 432×288 sandy-pit art. This is intentionally presentation-only:
 * the active brawl still supplies every joint, hit, AI decision and timing.
 */
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, line, pset } from './renderer.js';
import { state as gymState, bodyPt, isoX, isoY } from './gym.js';
import { state as boxingState } from './boxing.js';
import {headDetailPoint} from './figure-anatomy.js';

const sand=[rgb('#a78a5e'),rgb('#b59a6c'),rgb('#c2a777'),rgb('#ccb484'),rgb('#d6be8d')];
const dark=rgb('#826c50'), rim=rgb('#927852'), sky=rgb('#5b5850'), skyLight=rgb('#817765');
let plate=null, cachedW=0, cachedH=0;
const hash=(x,y)=>{ let n=Math.imul(x+61,374761393)^Math.imul(y+17,668265263); n=Math.imul(n^(n>>>13),1274126177); return (n^(n>>>16))>>>0; };

/** Paint a cached dirt-and-sand stage directly into the active 3× framebuffer. */
export function renderSandyArena(){
  const W=appearanceState.W, H=appearanceState.H;
  if(!plate||cachedW!==W||cachedH!==H){
    cachedW=W; cachedH=H; plate=new Uint32Array(W*H);
    const cx=W*0.5, cy=H*0.73, rx=W*0.465, ry=H*0.35;
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const h=hash(x,y), d=Math.pow((x-cx)/rx,2)+Math.pow((y-cy)/ry,2);
      const horizon=H*0.36+(hash(x>>3,0)%6)-3;
      let c;
      if(y<horizon){
        const v=(y/H)*1.25+(h&15)/100;
        c=v>0.3?skyLight:sky;
      } else {
        const depth=(y-horizon)/(H-horizon);
        const b=Math.max(0,Math.min(4,Math.floor(depth*2.6)+(h%5===0?1:0)));
        c=sand[b];
        if(d>0.95&&d<1.035&&h%7!==0) c=rim;
        else if(d>1.06&&d<1.10&&h%5===0) c=dark;
        else if((h%1071)===0) c=dark; // compact stones
        else if((h%233)===0) c=sand[Math.max(0,b-1)]; // scattered grain
        if(d<0.8&&(h%97)<2) c=sand[Math.max(0,b-1)]; // churned central pit
      }
      plate[y*W+x]=c;
    }
  }
  rendererState.fb=rendererState.FB_MAIN;
  rendererState.fb.set(plate);
}

/** Outfit-aware 3× accents anchored to the existing moving skeleton. */
export function drawHDCharacterDetails(F,J,L){
  if(gymState.ISO_K!==3) return;
  const A=appearanceState, oldC=gymState.ipC, oldPose=gymState.ipPose, oldBase=gymState.ipBase;
  gymState.ipC=F; gymState.ipPose=0; gymState.ipBase=0;
  const shade=(slot,k)=>A.PAL[slot*3+k];
  const clothD=shade(L.top[0],0), clothH=shade(L.top[0],2), pantD=shade(L.pt[0],0), pantH=shade(L.pt[0],2);
  const hairD=shade(L.hair,0), hairH=shade(L.hair,2), skinD=shade(L.sk[0],0), skinH=shade(L.sk[0],2);
  const point=(p)=>{ bodyPt(p[0],p[1],p[2]); return [Math.round(gymState.bpX),Math.round(gymState.bpY)]; };
  const dot=(p,c)=>{ const a=point(p); pset(a[0],a[1],c); };
  const seam=(p,q,c)=>{ const a=point(p),b=point(q); line(a[0],a[1],b[0],b[1],c,c); };
  try{
    const chest=J.chest, pel=J.pel, head=J.head;
    if(!L.bare){ // Bathers have no jacket, trousers or shirt seams.
    // Separate collar, crumpled lapels and the moving button placket.
    seam([chest[0]+1.4,chest[1]-0.9,chest[2]+0.2],[chest[0]+2,chest[1]-0.3,chest[2]-1.5],clothH);
    seam([chest[0]+1.3,chest[1]+0.8,chest[2]+0.2],[chest[0]+2,chest[1]+0.2,chest[2]-1.5],clothD);
    seam([chest[0]+2,chest[1],chest[2]-1.5],[pel[0]+1.7,pel[1],pel[2]+0.8],clothD);
    for(let dz=-2;dz<2;dz+=1.3) dot([chest[0]+2.1,chest[1]+0.12,chest[2]+dz],clothH);
    // Wrinkles track the skeleton rather than sliding on the framebuffer.
    for(const s of [-1,1]){
      const arm=J(s), knee=arm.knee;
      seam([arm.sh[0]+0.25,arm.sh[1],arm.sh[2]-0.8],[arm.el[0]+0.55,arm.el[1],arm.el[2]+0.7],clothD);
      seam([arm.el[0]+0.5,arm.el[1],arm.el[2]+0.35],[arm.el[0]+0.7,arm.el[1],arm.el[2]-0.35],clothH);
      seam([arm.hip[0]+0.7,arm.hip[1],arm.hip[2]-0.75],[knee[0]+0.65,knee[1],knee[2]+0.45],pantD);
      seam([knee[0]+0.4,knee[1]-0.45,knee[2]+0.2],[knee[0]+0.9,knee[1]+0.35,knee[2]-0.3],pantH);
      dot([arm.foot[0]+0.8,arm.foot[1],arm.foot[2]+0.12],shade(L.shoe,2));
    }
    }
    // Readable nose ridge, cheekbone, eyebrow, temple and jaw from the same head joint.
    if(L.style!=='hood'){
    dot(headDetailPoint(head,+1.95,-0.25,-0.8),skinH);
    dot(headDetailPoint(head,+1.75,+0.65,-0.95),skinH);
    seam(headDetailPoint(head,+1.55,+0.28,-1.6),headDetailPoint(head,+1.25,+0.6,-2.1),skinD);
    seam(headDetailPoint(head,+1.45,+0.35,-0.1),headDetailPoint(head,+1.65,+0.95,-0.05),hairD);
    if(L.style==='fringe'){
      for(let s=-1;s<=1;s++) seam(headDetailPoint(head,+0.25,+s*0.65,+1.1),headDetailPoint(head,+1.35,+s*0.75,+0.55),s===0?hairD:hairH);
    } else if(L.style==='bald'){
      dot(headDetailPoint(head,-1.05,+0.65,+0.7),hairH);
      dot(headDetailPoint(head,+0.7,+1.35,-0.45),skinD);
      if(L.chops) seam(headDetailPoint(head,+0.85,+1.36,-0.5),headDetailPoint(head,+0.95,+1.21,-1.65),hairD);
    }
    if(L.stubble) for(let i=0;i<3;i++) dot(headDetailPoint(head,+1.25-i*0.17,+0.72,-1.38-i*0.22),hairD);
    }
    if(!L.bare&&L.scarf!==undefined){
      seam([chest[0]+1.85,chest[1]-0.45,chest[2]+0.35],[chest[0]+2.1,chest[1]+0.4,chest[2]+0.2],L.scarf);
      dot([chest[0]+2.2,chest[1]+0.1,chest[2]-0.45],L.scarf);
    }
  }finally{
    gymState.ipC=oldC; gymState.ipPose=oldPose; gymState.ipBase=oldBase;
  }
}

/** A few tiny sand puffs track actual foot motion, without altering collision or animation. */
export function drawSandyFootDust(fighter){
  if(!fighter.moving||fighter.down||fighter.ko) return;
  const x=Math.round(isoX(fighter.i,fighter.j)),y=Math.round(isoY(fighter.i,fighter.j,0));
  for(let k=0;k<6;k++){
    const t=boxingState.tick*3+k*43, dx=((hash(k,t)&15)-8),dy=((hash(t,k)&7)-4);
    pset(x+dx,y+dy,sand[(k+1)%sand.length]);
  }
}
