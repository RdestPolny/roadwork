/* Fight HUD portraits of the hero and Harry: a front-on bust, 42×48 pixels (the HUD frame at the HD scale), painted anew every frame.
   It lives: the eyes blink, the head breathes and sways a little, a blow jerks it and squeezes the eyes shut, a tired man pants.
   It keeps the fight's marks: bruises first, then a swollen eye and lip, cuts that run blood, a broken nose.
   Colours come from the fighter's own palette ramps, so the bust matches his figure in the ring. */

export const PW=42, PH=48;
/** The bust's zoom: face units to pixels, and where the face's centre sits. */
const Z=1.35, CY=22;

/** Packed colour (the framebuffer's ABGR) from '#rrggbb'. @param {string} h */
const hex=h=>{ const n=parseInt(h.slice(1),16); return (0xff000000|((n&255)<<16)|(n&0xff00)|(n>>>16))>>>0; };
/** Blend two packed colours. @param {number} a @param {number} b @param {number} t */
const mix=(a,b,t)=>{ const ch=(/** @type {number} */ s)=>Math.round(((a>>>s)&255)+(((b>>>s)&255)-((a>>>s)&255))*t)<<s; return (0xff000000|ch(16)|ch(8)|ch(0))>>>0; };

const OUT=hex('#1a100c'), BG=hex('#30241c'), BG_DARK=hex('#1e1612'), LID=hex('#2a1810'), PUPIL=hex('#120e0c'), MOUTH=hex('#3a1c16'), TEETH=hex('#cfc4ae');
const BRUISE=hex('#7a4660'), BRUISE_DEEP=hex('#4e2a48'), SWELL=hex('#a0606a'), CUT=hex('#6a1210'), BLOOD=hex('#a8241c'), BLOOD_DARK=hex('#701612');

/** @typedef {{kind:'hero'|'harry',skin:number[],hair:number[],top:number[],scarf:number}} Inks */
/** @typedef {{dx:number,dy:number,blink:number,squint:number,pant:number,gaze:number,fd:number,cuts:number,cutAge:number[],nose:boolean,bleed:boolean,eyeL:boolean,eyeR:boolean,scar:boolean,out:boolean}} Pose */

/** Whether a fighter gets a painted portrait: the hero bare-headed and Harry. @param {any} F @param {boolean} hero */
export function hasPainted(F,hero){ return hero?F.look.style!=='hood':F.look.style==='bald'&&!!F.look.chops; }

/** The portrait's colours, read from the fighter's ramps; call it inside his palette wrap.
 * @param {any} L the fighter's look @param {Uint32Array} PAL @param {boolean} hero @returns {Inks} */
export function portraitInks(L,PAL,hero){
  const ramp=(/** @type {number} */ r)=>[PAL[r*3],PAL[r*3+1],PAL[r*3+2]], sk=ramp(L.sk[0]), hr=ramp(L.hair), top=ramp(L.top[0]);
  const skin=[mix(sk[0],hex('#2a1410'),0.45),sk[0],sk[1],mix(sk[1],sk[2],0.5),sk[2]];   // deep shadow … highlight
  return {kind:hero?'hero':'harry',skin,hair:hr,top,scarf:L.scarf||top[1]};
}

/** The living pose of a fighter's bust this frame, from his state in the fight.
 * @param {any} F @param {number} t fight seconds @param {number} side -1 the left portrait, 1 the right @returns {Pose} */
export function portraitPose(F,t,side){
  const seed=F.seed||0, rt=F.rt, out=!!(F.ko||F.down);
  const tired=1-Math.max(0,Math.min(1,rt.sta/rt.staCapInitial));
  const breath=Math.sin(t*(1.9+tired*2.4)+seed)*(0.5+tired*0.6), sway=Math.sin(t*0.63+seed*2.1)*0.8+Math.sin(t*0.27+seed)*0.4;
  // A blink every three to five seconds, now and then a double one.
  const period=3+(seed*1.37%2), ph=(t+seed*5)%period, blink=ph<0.13?1-Math.abs(ph-0.065)/0.065*0.5:ph>0.32&&ph<0.42&&seed%1<0.35?0.8:0;
  const h=F.hurtT>0&&!F.hurtBlocked?Math.min(1,F.hurtT/(F.hurtDuration||0.3)):0, head=h&&!F.hurtLow?h:0;
  let dx=sway, dy=breath*0.8;
  if(head){ if(F.hurtDir===2) dx-=side*2.4*head; else if(F.hurtDir===3) dy-=2.2*head; else { dy-=1.2*head; dx-=side*0.8*head; } }
  if(out){ dy+=2; dx+=side*-1; }
  const cutAge=(F.cutAt||[]).map((/** @type {number} */ at)=>t-at);
  return {dx,dy,blink:out?1:Math.max(blink,h>0.35?1:0),squint:Math.max(h,F.stagger>0?0.6:0),pant:out?0:Math.max(tired>0.55?(tired-0.55)/0.45:0,F.hurtLow?h:0),gaze:F.stagger>0?0:-side,
    fd:F.faceDamage||0,cuts:F.wounds.cuts||0,cutAge,nose:!!F.wounds.nose,bleed:!!F.bleed,eyeL:!!F.wounds.eyeL,eyeR:!!F.wounds.eyeR,scar:!!F.wounds.scar,out};
}

/** Paint the bust into a PW×PH buffer. @param {Uint32Array} buf @param {Inks} ink @param {Pose} p */
export function paintPortrait(buf,ink,p){
  const harry=ink.kind==='harry', S=ink.skin, HR=ink.hair;
  const px=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ x=Math.round(x); y=Math.round(y); if(x>=0&&y>=0&&x<PW&&y<PH) buf[y*PW+x]=c; };
  const get=(/** @type {number} */ x,/** @type {number} */ y)=>{ x=Math.round(x); y=Math.round(y); return x>=0&&y>=0&&x<PW&&y<PH?buf[y*PW+x]:0; };
  /** An ellipse with its radii in face units (scaled by the zoom). */
  const ell=(/** @type {number} */ cx,/** @type {number} */ cy,/** @type {number} */ rx,/** @type {number} */ ry,/** @type {(dx:number,dy:number,x:number,y:number)=>number|0} */ fn)=>{ rx*=Z; ry*=Z;
    for(let y=Math.floor(cy-ry);y<=Math.ceil(cy+ry);y++) for(let x=Math.floor(cx-rx);x<=Math.ceil(cx+rx);x++){ const dx=(x-cx)/rx, dy=(y-cy)/ry; if(dx*dx+dy*dy<=1){ const c=fn(dx,dy,x,y); if(c) px(x,y,c); } } };
  const ln=(/** @type {number} */ x0,/** @type {number} */ y0,/** @type {number} */ x1,/** @type {number} */ y1,/** @type {number} */ c)=>{ const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1; for(let i=0;i<=n;i++) px(x0+(x1-x0)*i/n,y0+(y1-y0)*i/n,c); };
  const hash=(/** @type {number} */ x,/** @type {number} */ y)=>((x*73856093)^(y*19349663))>>>0;

  // ---- the backdrop: a dark wall, lighter where the light falls from the left
  for(let y=0;y<PH;y++) for(let x=0;x<PW;x++) buf[y*PW+x]=mix(BG,BG_DARK,Math.min(1,x/PW*0.8+y/PH*0.3));

  // The face is laid out in face units round its centre; X() and Y() place an offset on the zoomed bust.
  const cx=21+Math.round(p.dx), cy=CY+Math.round(p.dy), RYu=harry?14:14.5, W0u=harry?10.8:11.6, RY=RYu*Z, W0=W0u*Z;
  const X=(/** @type {number} */ n)=>cx+Math.round(n*Z), Y=(/** @type {number} */ n)=>cy+Math.round(n*Z);
  // Swelling pushes the outline out on its side: the right eye from 24 face damage, the left cheek from 34.
  const swR=Math.max(0,Math.min(1,(p.fd-24)/12)), swL=Math.max(0,Math.min(1,(p.fd-34)/12));
  const halfW=(/** @type {number} */ y,/** @type {number} */ s)=>{ const v=(y-cy)/RY; if(v<-1||v>1) return -1;
    let w=v<0?W0u*Math.pow(1-Math.pow(-v,2.3),1/2.3):v<0.42?W0u-v*(harry?2:1):v<0.88?W0u-(harry?0.8:0.4)-(v-0.42)/0.46*(harry?4.6:5.2):(harry?5.4:5.9)*Math.sqrt(1-((v-0.88)/0.12)**2);
    if(s>0&&v>-0.3&&v<0.1) w+=swR*1.2*Math.cos((v+0.1)/0.2*1.57); if(s<0&&v>0&&v<0.45) w+=swL*1.1*Math.sin(v/0.45*3.14);
    return w*Z; };
  const inHead=(/** @type {number} */ x,/** @type {number} */ y)=>{ const s=x>=cx?1:-1, w=halfW(y,s); return w>=0&&Math.abs(x-cx)<=w; };

  // ---- shoulders and the shirt, the neck (Harry's scarf knotted at the throat)
  const T=ink.top, sx=21+Math.round(p.dx*0.3);
  ell(sx,PH+9,19,10,(dx)=>dx<-0.5?T[2]:dx>0.45?T[0]:T[1]);
  ln(sx,PH-4,sx,PH,T[0]);
  const nx=21+Math.round(p.dx*0.6), nw=Math.round(6*Z);
  for(let y=Y(9);y<PH-3;y++) for(let x=nx-nw;x<=nx+nw;x++) px(x,y,x<nx-nw/2?S[3]:x>nx+nw/2-1?S[1]:S[2]);
  ln(nx-Math.round(3*Z),Y(11),nx-Math.round(2*Z),PH-4,S[1]); ln(nx+Math.round(4*Z),Y(10),nx+Math.round(3*Z),PH-4,S[0]);   // the cords of a fighter's neck
  if(harry){ const sc=ink.scarf, scD=mix(sc,OUT,0.4), scL=mix(sc,hex('#ffffff'),0.18);
    for(let y=Y(13);y<=Y(16);y++) for(let x=nx-nw-1;x<=nx+nw+1;x++) px(x,y,y===Y(13)?scL:(x+y)%4===0?scD:sc);
    ell(nx+3,Y(18),2.2,2,(dx)=>dx<0?scL:sc); }
  else { for(let x=nx-nw-1;x<=nx+nw+1;x++) px(x,PH-3,OUT); ln(nx-nw,PH-3,nx,PH,T[0]); ln(nx+nw,PH-3,nx,PH,T[0]); }   // the open collar

  // ---- ears, then the head, lit from the left
  for(const s of [-1,1]){ const ex=cx+s*(W0+0.8); ell(ex,Y(1),1.7,3.2,(dx)=>dx*s>0.2?S[0]:S[1]); px(ex,Y(1),S[0]); }
  for(let y=Math.floor(cy-RY);y<=cy+RY;y++) for(let x=Math.floor(cx-W0-3);x<=cx+W0+3;x++){ if(!inHead(x,y)) continue;
    const s=x>=cx?1:-1, d=(x-cx)/halfW(y,s), v=(y-cy)/RY;
    let c=S[2]; if(d<-0.5) c=S[4]; else if(d<-0.15) c=S[3]; else if(d>0.3) c=S[1]; if(d>0.72) c=S[0];
    if(v>0.62&&d>0) c=S[1]; if(v>0.82&&d>-0.2) c=S[0];                                                 // under the jaw
    px(x,y,c); }
  for(let y=Math.floor(cy-RY);y<=cy+RY;y++) for(let x=Math.floor(cx-W0-3);x<=cx+W0+3;x++){ if(inHead(x,y)&&(!inHead(x-1,y)||!inHead(x+1,y)||!inHead(x,y-1)||!inHead(x,y+1))) px(x,y,OUT); }

  // ---- cheekbones and their hollows, folds from the nose, an old man's lines
  ell(X(-6),Y(2),2.6,1,(dx,dy)=>dy<0?S[4]:0); ell(X(6),Y(2),2.2,1,(dx,dy)=>dy<0?S[2]:0);
  for(const s of [-1,1]) ell(X(s*6.5),Y(5),1.2,2,(dx)=>dx*s>0?S[1]:0);
  ln(X(-3),Y(4),X(-4),Y(8),S[1]); ln(X(3),Y(4),X(4),Y(8),S[0]);
  if(harry){
    for(const y of [Y(-9),Y(-7)]) for(let x=X(-5);x<=X(5);x++) if((x+y)%3) px(x,y,S[1]);                // the furrowed brow
    for(const s of [-1,1]){ px(X(s*8),Y(-2),S[1]); px(X(s*8),Y(0),S[1]); px(X(s*9),Y(-1),S[1]); px(X(s*8.6),Y(1),S[1]); }   // crow's feet
  } else { for(let x=X(-4);x<=X(4);x++) if(x%3) px(x,Y(-8),S[2]); }
  ln(X(-1),Y(-6),X(-1),Y(-4),S[1]); ln(X(1),Y(-6),X(1),Y(-4),S[1]);                                    // the frown between the brows

  // ---- stubble: an even grain over the jaw, chin and upper lip
  const stub=harry?[mix(HR[0],S[1],0.4),mix(HR[1],S[1],0.55)]:[mix(HR[0],S[1],0.45),mix(HR[1],S[1],0.5)];
  for(let y=Y(5);y<=cy+RY;y++) for(let x=Math.floor(cx-W0);x<=cx+W0;x++){ if(!inHead(x,y)||!inHead(x,y+1)||!inHead(x-1,y)||!inHead(x+1,y)) continue;
    const ax=Math.abs(x-cx)/Z, v=(y-cy)/Z, lip=v>=5.5&&v<=7.4&&ax<4, jaw=v>=10||ax>6; if(!lip&&!jaw) continue; if(v>=7.5&&v<=10&&ax<4) continue;
    const k=hash(x-cx,y-cy)%7; px(x,y,k===0?stub[0]:k===1&&harry?stub[1]:mix(get(x,y),stub[0],0.22)); }
  // ---- Harry: a bald crown with a shine, a grey fringe over the ears, thick mutton chops down to the jaw
  if(harry){
    ell(X(-4),Y(-10),3,1.6,(dx,dy)=>dx*dx+dy*dy<0.45?S[4]:S[3]);
    const chopC=[mix(HR[0],S[0],0.45),mix(HR[0],S[1],0.25),mix(HR[0],HR[1],0.35)];
    for(const s of [-1,1]) for(let y=Y(-4);y<=Y(-1);y++) for(let a=-1;a<1;a++) px(cx+s*(halfW(y,s)+a+0.5),y,hash(s*7,y)%3?chopC[1]:chopC[2]);   // a grey fringe above the ear
    for(const s of [-1,1]) for(let y=Y(1);y<=Y(8);y++){ const v=(y-cy)/Z, w=halfW(y,s), depth=(v<5?2.4+(v-1)*0.2:3-(v-5)*0.6)*Z;   // the chop widening down the cheek
      for(let a=0;a<depth;a++){ const x=Math.round(cx+s*(w-1-a)); if(!inHead(x,y)) continue; const k=hash(x,y)%5; px(x,y,a===0&&k<2?chopC[0]:k===4?chopC[2]:chopC[1]); } }
  }
  // ---- the hero: hair cropped short and wet, going back at the temples, the sides cut close
  else {
    const hl=(/** @type {number} */ ax)=>(ax<4?-8.5:ax<7?-8.5-(ax-4)*0.5:-10+(ax-7)*1.6)*Z+cy;
    for(let y=Math.floor(cy-RY-1);y<=Y(-2);y++) for(let x=Math.floor(cx-W0-1);x<=cx+W0+1;x++){
      const ax=Math.abs(x-cx), s=x>=cx?1:-1; if(y>=hl(ax/Z)) continue; const w=halfW(y,s);
      if(!(w>=0&&ax<=w+0.6)) continue; const k=hash(x,y)%5;
      px(x,y,ax>w-0.4||y<=cy-RY?OUT:k===0?HR[2]:x>X(4)?HR[0]:k<3?HR[1]:HR[0]); }
    for(let x=X(-6);x<=X(6);x+=2) px(x,Math.floor(hl(Math.abs(x-cx)/Z)),HR[0]);                         // points along the hairline
  }

  // ---- brows: the hero's thick and low in a scowl, Harry's grey and bushy, drooping at the ends
  const browC=harry?[HR[0],mix(HR[0],HR[1],0.6)]:[OUT,HR[0]];
  for(const s of [-1,1]) for(let o=Math.round(2*Z);o<=Math.round(8*Z);o++){ const k=o/Z-2, x=cx+s*o,
      y=harry?Y(-4)-(k>1&&k<5?1:0)+(k>5.5?1:0):Y(-4)-Math.round(k*0.3*Z)+(p.squint>0.4?1:0);
    px(x,y,browC[0]); px(x,y-1,o%2?browC[1]:browC[0]); if(!harry&&k<4) px(x,y+1,browC[0]); }
  // ---- eyes: deep sockets, a hooded lid on a grey stare that turns to the rival; closed in a blink or a flinch
  for(const s of [-1,1]){ const ex=X(s*5), ey=Y(-1), swollen=s>0?swR:0, black=s>0?p.eyeL:p.eyeR;
    ell(ex,ey-0.5,3.2,1.6,(dx,dy)=>dy<0.2?S[0]:S[1]);
    const shut=Math.max(p.blink,swollen>0.5?1:0,p.squint>0.55?1:0), open=shut>=0.75?0:shut>=0.4?1:2;
    if(open){ const wh=s<0?hex('#b0a094'):hex('#968880');
      for(let x=ex-2;x<=ex+2;x++) px(x,ey,wh); if(open===2&&!harry) px(ex-2,ey,S[1]);
      const pc=ex+(p.gaze>0?1:-1); px(pc,ey,PUPIL); if(open===2){ px(pc-1,ey,hex('#4a5860')); px(pc+1,ey,hex('#4a5860')); px(pc,ey-1,hex('#3a464e')); }
      ln(ex-3,ey-1,ex+3,ey-1,LID); if(open===2) px(pc,ey-1,LID); px(ex+s*3,ey,LID); }
    else { ln(ex-3,ey,ex+3,ey,LID); ln(ex-2,ey-1,ex+2,ey-1,S[1]); }
    ln(ex-2,ey+1,ex+1,ey+1,S[1]);
    if(harry){ ln(ex-2,ey+2,ex+2,ey+2,S[1]); px(ex-3,ey+1,S[3]); }                                        // bags under old eyes
    if(black) ell(ex-0.5,ey+0.5,3.4,2.2,(dx,dy,x,y)=>dx*dx+dy*dy>0.45&&get(x,y)!==LID?mix(get(x,y),BRUISE_DEEP,0.55):0);   // a lasting black eye
  }
  // ---- the nose: broad, the hero's flattened by old fights; Harry's red and bulbous
  for(let y=Y(-2);y<=Y(3);y++){ px(X(-1),y,S[4]); px(X(1),y,S[1]); }
  ell(cx,Y(4),harry?2.4:2.6,1.3,(dx,dy)=>dy>0.4?S[1]:dx<-0.3?S[4]:harry?mix(S[3],hex('#c0584a'),0.25):S[2]);
  px(X(-1),Y(5),OUT); px(X(1),Y(5),OUT); px(X(1)+1,Y(5),S[0]);
  // ---- the mouth: pressed thin with the corners down, or open and gulping air
  const my=Y(8), open=Math.round(p.pant*2);
  if(open){ ell(cx,my+0.5,2.6,0.6+open*0.7,(dx,dy)=>dy<-0.5&&Math.abs(dx)<0.7?TEETH:MOUTH); if(harry&&open>1) px(cx+1,my,MOUTH); ln(X(-2),my-1,X(2),my-1,S[1]); }
  else { ln(X(-3),my,X(3),my,MOUTH); ln(X(-2),my-1,X(2),my-1,mix(S[1],hex('#8a3c30'),0.4)); px(X(-3)-1,my+1,S[1]); px(X(3)+1,my+1,S[0]); ln(X(-2),my+1,X(2),my+1,S[3]); }
  if(!harry){ px(cx,Y(12),S[1]); px(cx,Y(12)+1,S[1]); }                                                  // the cleft chin

  // ---- the fight's marks. Bruises first (a cheekbone from 6, round the right eye from 14), then swelling, then cuts.
  const bruise=(/** @type {number} */ x0,/** @type {number} */ y0,/** @type {number} */ rx,/** @type {number} */ ry,/** @type {number} */ a)=>
    ell(x0,y0,rx,ry,(dx,dy,x,y)=>{ const r=dx*dx+dy*dy, c=get(x,y); if(c===OUT||c===LID||c===PUPIL) return 0; if(r>0.6&&hash(x,y)%3===0) return 0; return mix(c,r<0.35?BRUISE_DEEP:BRUISE,a*(r<0.35?0.7:0.5)); });
  const b1=Math.max(0,Math.min(1,(p.fd-6)/10)), b2=Math.max(0,Math.min(1,(p.fd-14)/10));
  if(b1>0) bruise(X(-6),Y(2.5),2.8,1.8,b1);
  if(b2>0) bruise(X(5),Y(-0.5),3.6,2.6,b2);
  if(swR>0){   // the right eye swells shut under a puffed, shining lid
    ell(X(5.5),Y(-1),3.2+swR,1.6+swR*0.9,(dx,dy,x,y)=>{ const c=get(x,y); if(c===OUT) return 0; return dy<-0.3&&dx<0.2?mix(SWELL,S[4],0.35):mix(SWELL,BRUISE_DEEP,dy>0.3?0.5:0.15); });
    ln(X(3),Y(-0.5+swR*0.5),X(7.5),Y(-0.5+swR*0.5),LID); }
  if(swL>0){   // the left cheek puffs up and the lower lip splits
    ell(X(-6.5),Y(3),2.6+swL,2+swL*0.6,(dx,dy,x,y)=>{ const c=get(x,y); if(c===OUT) return 0; return mix(c,SWELL,0.35+swL*0.3); });
    if(swL>0.4){ ln(X(-2),my+1,X(1),my+1,mix(SWELL,BLOOD,0.4)); px(X(-1),my+1,CUT); px(X(-1),my+2,BLOOD); } }
  // Cuts open over the right brow, the left brow, then the left cheekbone; each runs a trickle that lengthens over a few seconds.
  const CUTS=[[X(4),Y(-6),1],[X(-6),Y(-6),-1],[X(-7),Y(1),-1]];   // a short slanted split; the trickle runs from its middle, stepping outwards once
  for(let k=0;k<Math.min(3,p.cuts);k++){ const [x0,y0,s]=CUTS[k], age=p.cutAge[k]??9, run=Math.min(Math.round((k===2?3:5)*Z),Math.floor(age*3));
    px(x0,y0,CUT); px(x0+s,y0-1+(k===2?1:0),CUT); px(x0+2*s,y0-1,mix(CUT,BLOOD,0.5)); px(x0+s,y0+(k===2?1:0),BLOOD);
    for(let i=1;i<=run;i++) px(x0+s+(i>2?s:0),y0+i+(k===2?1:0),i===run?BLOOD_DARK:BLOOD); }
  if(p.scar){ ln(X(3),Y(-6),X(6),Y(-5),hex('#5a1a14')); }
  if(p.nose||p.bleed){ const n=p.nose?Math.round(3*Z):1; for(let i=0;i<n;i++){ px(X(-1),Y(6)+i,i===n-1?BLOOD_DARK:BLOOD); if(p.nose&&i<2) px(X(1),Y(6)+i,BLOOD); } }
}
