/**
 * Isolated 432×288 sandy-pit art. This is intentionally presentation-only:
 * the active brawl still supplies every joint, hit, AI decision and timing.
 */
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState, line, pset } from './renderer.js';
import { state as gymState, bodyPt, isoX, isoY } from './gym.js';
import { state as boxingState } from './boxing.js';
import {headDetailPoint, figureProportions} from './figure-anatomy.js';

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

/** Outfit-aware 3× accents anchored to the existing moving skeleton. hp maps head offsets into figureHD's head frame (turned with
 * the look, sized with the skull) from its origin 0.1 forward and 0.6 below J.head; hd0 is the depth of the head's centre, and a face
 * detail only shows while it lies in front of it, so a head turned away keeps its hair clean.
 * @param {any} F @param {any} J @param {any} L @param {(x:number,y:number,z:number)=>number[]} [hp] @param {number} [hd0] */
export function drawHDCharacterDetails(F,J,L,hp,hd0){
  if(gymState.ISO_K!==3) return;
  const A=appearanceState, oldC=gymState.ipC, oldPose=gymState.ipPose, oldBase=gymState.ipBase;
  gymState.ipC=F; gymState.ipPose=0; gymState.ipBase=0;
  const shade=(slot,k)=>A.PAL[slot*3+k];
  const clothD=shade(L.top[0],0), clothH=shade(L.top[0],2), pantD=shade(L.pt[0],0), pantH=shade(L.pt[0],2);
  const hairD=shade(L.hair,0), hairH=shade(L.hair,2), skinD=shade(L.sk[0],0), skinH=shade(L.sk[0],2);
  const point=(p)=>{ bodyPt(p[0],p[1],p[2]); return [Math.round(gymState.bpX),Math.round(gymState.bpY)]; };
  const dot=(p,c)=>{ const a=point(p); pset(a[0],a[1],c); };
  const seam=(p,q,c)=>{ const a=point(p),b=point(q); line(a[0],a[1],b[0],b[1],c,c); };
  /** Depth (i+j) of a body point; a seam or button on the front of a part belongs to it only while that front faces the camera. */
  const depth=(p)=>{ bodyPt(p[0],p[1],p[2]); return gymState.bpD; };
  const front=(p,fwd)=>depth([p[0]+fwd,p[1],p[2]])>depth(p)+0.02;
  const k=figureProportions(L).surface, on=(p,x,y,z)=>[p[0]+x*k,p[1]+y*k,p[2]+z];   // a seam or button on the body's surface
  try{
    const chest=J.chest, pel=J.pel, head=J.head, h0=hp?.(0,0,0), h1=hp?.(1,0,0), hs=h0&&h1?Math.hypot(h1[0]-h0[0],h1[1]-h0[1],h1[2]-h0[2]):1;
    const hpt=(x,y,z)=>hp?hp(x-0.1/hs,y,z+0.6/hs):headDetailPoint(head,x,y,z);
    const faces=(...pts)=>hd0===undefined||pts.every(p=>depth(p)>hd0+0.02);
    const fdot=(p,c)=>{ if(faces(p)) dot(p,c); }, fseam=(p,q,c)=>{ if(faces(p,q)) seam(p,q,c); };
    if(!L.bare){ // Bathers have no jacket, trousers or shirt seams.
    // Separate collar, crumpled lapels and the moving button placket.
    if(front(chest,2*k)){
    seam(on(chest,1.4,-0.9,0.2),on(chest,2,-0.3,-1.5),clothH);
    seam(on(chest,1.3,0.8,0.2),on(chest,2,0.2,-1.5),clothD);
    seam(on(chest,2,0,-1.5),on(pel,1.7,0,0.8),clothD);
    for(let dz=-2;dz<2;dz+=1.3) dot(on(chest,2.1,0.12,dz),clothH);
    }
    // Wrinkles track the skeleton rather than sliding on the framebuffer.
    /* A leg shows its own marks only while no other leg covers it: it is the nearer shin, or the shins are apart on the screen. */
    const legR=figureProportions(L).calf*(gymState.propCamera?.figureScale??gymState.ISO_K), shinAt=(s)=>{ const a=point(J(s).knee), b=point(J(s).foot); return [(a[0]+b[0])/2,(a[1]+b[1])/2,(depth(J(s).knee)+depth(J(s).foot))/2]; };
    const clear=(s)=>{ const m=shinAt(s), o=shinAt(-s); return m[2]>=o[2]-0.02||Math.hypot(m[0]-o[0],m[1]-o[1])>legR*2.4; };
    for(const s of [-1,1]){
      const arm=J(s), knee=arm.knee;
      /* an arm or leg behind the body, or with its front turned from the camera, shows no seam through the body */
      if(front(arm.sh,0.55*k)&&(depth(arm.sh)+depth(arm.el))/2>depth(chest)-0.03){
        seam(on(arm.sh,0.25,0,-0.8),on(arm.el,0.55,0,0.7),clothD);
        seam(on(arm.el,0.5,0,0.35),on(arm.el,0.7,0,-0.35),clothH); }
      if(L.yorks!==undefined&&clear(s)){   /* yorks: string tied round the trouser leg under the knee, across the shin on the screen */
        const a=point(knee), b=point(arm.foot), l=Math.hypot(b[0]-a[0],b[1]-a[1])||1, ux=(b[0]-a[0])/l, uy=(b[1]-a[1])/l, cx=a[0]+ux*l*0.24, cy=a[1]+uy*l*0.24, r=legR*0.85;
        line(Math.round(cx-uy*r),Math.round(cy+ux*r),Math.round(cx+uy*r),Math.round(cy-ux*r),L.yorks,L.yorks); }
      if(front(knee,0.9*k)&&depth(arm.hip)>depth(pel)-0.03&&clear(s)){
        seam(on(arm.hip,0.7,0,-0.75),on(knee,0.65,0,0.45),pantD);
        seam(on(knee,0.4,-0.45,0.2),on(knee,0.9,0.35,-0.3),pantH); }
      dot([arm.foot[0]+0.8,arm.foot[1],arm.foot[2]+0.12],shade(L.shoe,2));   // the shoe keeps its length
    }
    }
    // Readable nose ridge, cheekbone, eyebrow, temple and jaw from the same head joint.
    if(L.style!=='hood'){
    fdot(hpt(+1.95,-0.25,-0.8),skinH);
    fdot(hpt(+1.75,+0.65,-0.95),skinH);
    fseam(hpt(+1.55,+0.28,-1.6),hpt(+1.25,+0.6,-2.1),skinD);
    fseam(hpt(+1.45,+0.35,-0.1),hpt(+1.65,+0.95,-0.05),hairD);
    if(L.style==='fringe'){
      for(let s=-1;s<=1;s++) fseam(hpt(+0.25,+s*0.65,+1.1),hpt(+1.35,+s*0.75,+0.55),s===0?hairD:hairH);
    } else if(L.style==='bald'){
      fdot(hpt(-1.05,+0.65,+0.7),hairH);
      fdot(hpt(+0.7,+1.35,-0.45),skinD);
      if(L.chops) fseam(hpt(+0.85,+1.36,-0.5),hpt(+0.95,+1.21,-1.65),hairD);
    }
    if(L.stubble) for(let i=0;i<3;i++) fdot(hpt(+1.25-i*0.17,+0.72,-1.38-i*0.22),hairD);
    }
    if(!L.bare&&L.scarf!==undefined){
      seam(on(chest,1.85,-0.45,0.35),on(chest,2.1,0.4,0.2),L.scarf);
      dot(on(chest,2.2,0.1,-0.45),L.scarf);
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
