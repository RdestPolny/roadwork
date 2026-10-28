/* Horse-drawn vehicles of the Thames port, drawn in the port's isometric camera. The hooded cab with its passenger,
   driver and pair is kept as an asset for later scenes; the police van in the port reuses its horses and wheels. */
import { rgb, setRamp, state as appearanceState } from './appearance.js';
import { state as rendererState, taper } from './renderer.js';
import { h2 } from './boxing.js';
import { state as gymState, quad, isoX, isoY, isoBox, figureHD, withCellOutfit, shadeC } from './gym.js';
import { mix } from './cast.js';
import { C, withRamps, thin, stroke, floor, spot, vn, ease, lerp, toWorld } from './thames-port.js';

/** Spoked coach wheel in its vertical isometric plane. */
export function coachWheel(i,j,z,r){
  const P=(a,rr)=>[i+Math.cos(a)*rr/7.5,j,z+Math.sin(a)*rr], X=p=>isoX(p[0],p[1]), Y=p=>isoY(...p), n=Math.max(10,Math.round(r*2.2));
  withRamps(['#3e1d14','#7c3f2a','#ad6847'],['#0c0d0c','#2a2c2a','#565a56'],(wood,iron)=>{
    /* spokes, two-tone so each one reads, then the felloe ring, the iron tyre round it and the hub with its cap */
    for(let k=0;k<n;k++){ const a=k*2*Math.PI/n+.1, p=P(a,r-.55); thin(i,j,z,...p,k%2?rgb('#9a5a3d'):rgb('#6e3524')); thin(i+.02,j,z,p[0]+.02,j,p[2],rgb('#4a2418')); }
    const ring=(rr,rad,ramp,outline)=>{ const segs=[]; for(let k=0;k<24;k++) segs.push([P(k*Math.PI/12,rr),P((k+1)*Math.PI/12,rr)]);
      for(const pass of outline?[0,1]:[1]) for(const [p,q] of segs) taper(X(p),Y(p),rad,X(q),Y(q),rad,pass,ramp,0,-9,-9,0); };
    ring(r,.75,iron,true); ring(r-.5,.7,wood,false);
    const h=P(0,0); for(const pass of [0,1]) taper(X(h),Y(h),Math.max(1.4,r*.32),X(h),Y(h),Math.max(1.4,r*.32),pass,wood,0,-9,-9,0);
    taper(X(h),Y(h),.8,X(h),Y(h),.8,1,iron,0,-9,-9,0);
  });
}

/** One carriage horse standing in harness, at lateral offset `offset` (0 the far one, 1.35 the near one).
 * Proportions of a cab horse: withers a little under a man's head height, a long deep barrel, a long neck and head.
 * At rest it shifts its weight from one hind leg to the other, cocking the resting hoof, now and then lifts a fore hoof,
 * swishes its tail, flicks its ears, nods and breathes. reins is the world point where the driver holds them. */
export function horse(t,offset,ph,dark,trim,reins=[10.65,4.46,23]){
  withCellOutfit(()=>{
    const A=appearanceState, coat=A.R_HSH, far=A.R_HSHF, hair=A.R_HPT, jc=4.85;
    /* the far horse a dark bay, the near one a lighter bay with a blaze; both with black lower legs, mane and tail */
    const c=offset?['#33231a','#6e4a32','#a5784f']:['#221812','#46301f','#6b4a31'];
    setRamp(coat,c,false); setRamp(far,c.map(h=>'#'+[1,3,5].map(k=>Math.round(parseInt(h.slice(k,k+2),16)*.72).toString(16).padStart(2,'0')).join('')),false);
    setRamp(hair,['#121311','#221e1a','#3d3229'],false);
    /** Project and shade a tapered section of anatomy. */
    const limb=(a,b,r0,r1,pass,ramp=coat)=>taper(isoX(a[0],a[1]+offset),isoY(a[0],a[1]+offset,a[2]),r0*2,isoX(b[0],b[1]+offset),isoY(b[0],b[1]+offset,b[2]),r1*2,pass,ramp,0,-9,-9,0);
    const nod=Math.sin(t*.027+ph)*.5+Math.max(0,vn(t*.006+ph*9,ph)-.75)*4, turn=Math.sin(t*.019+ph)*.05, breath=1+.03*Math.sin(t*.05+ph);
    const shift=Math.sin(t*.0042+ph*2.3), rest=[Math.max(0,Math.min(1,shift*1.8)),Math.max(0,Math.min(1,-shift*1.8))];
    const paw=Math.max(0,Math.min(1,(vn(t*.005+ph*7,ph*3)-.74)*5)), swish=Math.sin(t*.034+ph)*(vn(t*.004,ph+2)>.55?.35:.1);
    const flick=vn(t*.02+ph*5,ph)>.7?.35:0;
    const poll=[13.9+turn,jc,18.3+nod], muzzle=[14.42+turn,jc,14.9+nod*1.2];
    /** Blend three ramp colours smoothly by u in 0..1 (dark, mid, light). */
    const grade=(cols,u)=>{ u=Math.max(0,Math.min(1,u)); return u<.5?mix(cols[0],cols[1],u*2):mix(cols[1],cols[2],(u-.5)*2); };
    const coatC=c.map(h=>rgb(h)), rugC=(offset?['#18221a','#34463a','#5a7058']:['#261512','#4e2a22','#7a4636']).map(h=>rgb(h)), stripe=rgb('#9a7a3e');
    /** The trunk from rump to chest as one smoothly shaded body, swelling at the belly, under a wool rug thrown over the back
     * from withers to croup, its hem waving a little and trimmed with a stripe. pass 0 draws the outline, pass 1 the fill. */
    const trunk=pass=>{
      const fb=rendererState.fb, W=appearanceState.W, H=appearanceState.H, x0=isoX(11.42,jc+offset), y0=isoY(11.42,jc+offset,11.55-.2*Math.max(...rest)), x1=isoX(13.33,jc+offset), y1=isoY(13.33,jc+offset,11.25);
      const r0=5.9*breath, r1=4.8, bl=.9, dx=x1-x0, dy=y1-y0, l2=dx*dx+dy*dy, L=Math.sqrt(l2); let nx=-dy/L, ny=dx/L; if(ny>0){ nx=-nx; ny=-ny; }
      const R=r0+bl+2, xa=isoX(11.6,jc+offset), xb=isoX(13,jc+offset);
      for(let y=Math.max(0,Math.floor(Math.min(y0,y1)-R));y<=Math.min(H-1,Math.ceil(Math.max(y0,y1)+R));y++) for(let x=Math.max(0,Math.floor(Math.min(x0,x1)-R));x<=Math.min(W-1,Math.ceil(Math.max(x0,x1)+R));x++){
        const tr=((x-x0)*dx+(y-y0)*dy)/l2, tt=tr<0?0:tr>1?1:tr, ex=x-(x0+dx*tt), ey=y-(y0+dy*tt), r=r0+(r1-r0)*tt+bl*4*tt*(1-tt), d=Math.hypot(ex,ey);
        if(pass===0){ if(d<=r+1) fb[y*W+x]=appearanceState.C_OUT; continue; } if(d>r) continue;
        const up=(ex*nx+ey*ny)/r, shade=.5+.42*up-.18*(d/r)**2+.08*(vn((x-x0)*.35+offset*9,(y-y0)*.35)-.5);
        const ru=(x-xa+.6*Math.sin((y-y0)*.7+ph))/(xb-xa), hem=-.5+.06*Math.sin(ru*11+ph)+.03*Math.sin(ru*29);
        if(ru>=0&&ru<=1&&up>hem){ const edge=Math.min(ru,1-ru)*(xb-xa)<1.2; fb[y*W+x]=up-hem<.12&&up-hem>.05?mix(stripe,rugC[0],.3-.3*up):shadeC(grade(rugC,shade+.1),edge?.72:1); }
        else fb[y*W+x]=grade(coatC,shade);
      }
    };
    /** One leg from its top inside the body to the hoof; fore legs bend at the knee, hind legs at the hock. */
    /** part 'upper' is the forearm or thigh, drawn under the body so it blends into it; 'lower' the rest of the leg. */
    const leg=(i,j,fore,cock,lift,pass,part='all')=>{
      const col=j>jc?coat:far, up=part!=='lower', low=part!=='upper';
      if(fore){ const knee=[i+.06+.32*lift,j,5.6+1.5*lift], fet=[i+.02-.12*lift,j,1.6+2*lift], hoof=[i+.08-.2*lift,j,.35+1.5*lift];
        if(up) limb([i-.05,j,10.4],knee,1.2,.62,pass,col); if(low){ limb([i+.03+.2*lift,j,7.2+.9*lift],knee,.85,.62,pass,col); limb(knee,fet,.55,.45,pass,hair); limb(fet,hoof,.5,.58,pass,hair); } }
      else { const hock=[i-.34+.1*cock,j,5.9-.3*cock], fet=[i-.15+.25*cock,j,1.5+.55*cock], hoof=[i-.05+.42*cock,j,.35+.15*cock];
        if(up) limb([i+.05,j,10.8],[i-.12,j,8],1.6,1,pass,col); if(low){ limb([i-.12,j,8],hock,1,.58,pass,col); limb(hock,fet,.55,.45,pass,hair); limb(fet,hoof,.5,.58,pass,hair); } }
    };
    for(let pass=0;pass<2;pass++){
      leg(11.85,jc-.34,false,rest[0],0,pass); leg(13.2,jc-.34,true,0,ph?paw:0,pass);
      limb([11.2,jc,12.5],[11.05,jc+.04,9.6],.75,.6,pass,hair);
      limb([11.05,jc+.04,9.6],[11.1+swish*.4,jc+.08+swish*.3,6.2],.6,.42,pass,hair);
      leg(11.75,jc+.34,false,rest[1],0,pass,'upper'); leg(13.3,jc+.34,true,0,ph?0:paw,pass,'upper');
      trunk(pass);
      limb([13.05,jc,12.6],[13.5,jc,15.6+nod*.4],2.5,1.8,pass);
      limb([13.5,jc,15.6+nod*.4],poll,1.8,1.25,pass);
      limb([poll[0]+.04,jc,poll[2]-.5],[poll[0]+.22,jc,poll[2]-1.9],1.25,1,pass);
      limb(poll,muzzle,1.15,.78,pass);
      limb([poll[0]-.06,jc-.12,poll[2]+.6],[poll[0]-.02-flick*.3,jc-.14,poll[2]+1.9],.42,.15,pass,hair);
      limb([poll[0]+.05,jc+.12,poll[2]+.6],[poll[0]+.12,jc+.14,poll[2]+1.85],.42,.15,pass,hair);
      leg(11.75,jc+.34,false,rest[1],0,pass,'lower'); leg(13.3,jc+.34,true,0,ph?0:paw,pass,'lower');
    }
    /* mane along the crest of the neck, following the nod */
    for(let k=0;k<7;k++){ const u=k/6, i=13.0+.85*u+turn*u, z=14.2+4.2*u+nod*u;
      for(const pass of [0,1]) limb([i,jc-.05,z],[i-.14,jc-.05,z-.8],.22,.12,pass,hair); }
    /* harness: collar with brass hames, saddle pad and girth, breeching round the quarters, traces back to the splinter bar */
    for(const pass of [0,1]) limb([13.28,jc,15.4+nod*.3],[13.55,jc,12.2],1.1,1.05,pass,hair);
    const hs=(i,j,z,I,J,Z,c)=>stroke(i,j+offset,z,I,J+offset,Z,c), ht=(i,j,z,I,J,Z,c)=>thin(i,j+offset,z,I,J+offset,Z,c);
    ht(13.25,jc+.2,15.3+nod*.3,13.36,jc+.2,16.2+nod*.3,trim); ht(13.53,jc+.2,12.4,13.6,jc+.2,13.1,trim);
    if(offset) ht(poll[0]+.12,jc+.02,poll[2]-.6,muzzle[0]+.02,jc+.02,muzzle[2]+.3,rgb('#c9bfa8'));
    for(const pass of [0,1]) limb([12.55,jc,14.15],[12.85,jc,14.1],.75,.7,pass,hair);
    hs(12.72,jc+.38,13.7,12.75,jc+.38,8.7,dark);
    ht(11.45,jc+.4,12,11.85,jc+.4,10.1,dark); ht(11.85,jc+.4,10.1,12.5,jc+.4,10.6,dark);
    hs(13.45,jc+.4,11.8,10.6,jc+.4,7,dark);
    /* bridle: headstall, noseband and the blinker by the eye; reins up to the driver's hands */
    const bx=poll[0]+.08, bz=poll[2]-1.6, cheek=jc+.2+offset;
    quad(bx,cheek,bz,bx+.28,cheek,bz,bx+.28,cheek,bz+1.6,bx,cheek,bz+1.6,()=>rgb('#161714'));
    thin(bx,cheek+.01,bz+1.6,bx+.28,cheek+.01,bz+1.6,rgb('#65513a'));
    ht(poll[0],jc+.18,poll[2]+.3,muzzle[0]-.12,jc+.18,muzzle[2]+.5,dark);
    ht(muzzle[0]-.22,jc+.18,muzzle[2]+.9,muzzle[0]+.05,jc+.18,muzzle[2]+.5,dark);
    ht(muzzle[0]-.05,jc+.2,muzzle[2]+.3,muzzle[0]+.04,jc+.2,muzzle[2]+.3,trim);
    thin(muzzle[0]-.08,jc+.15+offset,muzzle[2]+.5,...reins,C.woodLight);
  });
}

/** The hooded cab with a passenger, a driver with his pipe and a pair of bays, standing with its tail at i = 7 and the horses' heads at i = 14.4 (j 3.7–7).
 * Not used in the port now: kept for later scenes. Draw it elsewhere by shifting the camera passed to setPropCamera. */
export function carriage(t){
  const camera=gymState.propCamera;
  const dark=rgb('#171816'), trim=rgb('#a78a60'), panel=rgb('#56352f'), light=rgb('#bfaa80');
  // Chassis, springs, footboard and the far wheels sit behind the passenger compartment.
  coachWheel(6.95,3.72,5.8,5.7);coachWheel(10.35,3.72,3.0,2.9);
  stroke(7.25,5.8,3,10.35,5.8,3,dark);stroke(7.25,3.8,3,10.35,3.8,3,dark);
  stroke(8,5.88,2.7,9.15,5.88,2.7,trim);stroke(8.15,5.88,3.25,9.0,5.88,3.25,dark);
  // Varnished wooden tub: the side above the rail remains open.
  isoBox(7,3.8,10.2,5.8,4.5,8.8,rgb('#342a25'),rgb('#4c302b'),rgb('#342620'));
  quad(7.5,5.81,5.2,9.45,5.81,5.2,9.45,5.81,8.4,7.5,5.81,8.4,()=>panel);
  for(const z of [5.3,8.4])stroke(7.5,5.83,z,9.45,5.83,z,trim);
  for(const i of [7.55,9.4])stroke(i,5.83,5.3,i,5.83,8.4,trim);
  stroke(7.1,5.83,8.85,10.2,5.83,8.85,rgb('#aa8060'));
  // Black folding hood: a roof and rear curtain, with an open side.
  const fabric=rgb('#262624'), fold=rgb('#383734');
  quad(6.98,3.75,8.8,6.98,5.85,8.8,6.98,5.85,16.5,6.98,3.75,16.5,(x,y)=>shadeC(fabric,.78+h2((x-camera.x)>>1,(y-camera.y)>>2)/1800));
  quad(6.98,5.86,8.8,7.95,5.86,8.8,8.65,5.86,18.3,7.6,5.86,18.3,(x,y)=>shadeC(fabric,.83+h2((x-camera.x)>>2,(y-camera.y)>>1)/1800));
  quad(6.98,5.86,8.8,7.6,5.86,18.3,7.15,5.86,17.7,6.98,5.86,16.5,()=>shadeC(fabric,.9));
  // Shadowed interior and a transverse upholstered bench, seen through the open side.
  floor(7.12,3.85,10.05,5.72,8.82,()=>rgb('#211d1b'));
  quad(7.18,3.86,9,7.18,5.68,9,7.18,5.68,14.2,7.18,3.86,14.2,(x,y)=>shadeC(rgb('#49342e'),.75+h2((x-camera.x)>>2,(y-camera.y)>>2)/2200));
  stroke(7.2,3.95,13.8,7.2,5.58,13.8,rgb('#665047'));
  for(const j of [4.25,4.75,5.25]) stroke(7.21,j,10,7.21,j,13.6,rgb('#362823'));
  isoBox(7.2,3.92,8.35,5.6,8.85,9.8,rgb('#65483d'),rgb('#3e2b27'),rgb('#30231f'));
  stroke(8.36,3.98,9.75,8.36,5.55,9.75,rgb('#886550'));
  // A well-dressed passenger sits on the upholstered bench, beneath the hood.
  withCellOutfit(()=>{
    const A=appearanceState, P={i:8.45,j:5.25,fi:1,fj:0,z0:5.4};
    setRamp(A.R_HSH,['#25202d','#49384d','#786078'],false);
    setRamp(A.R_HSHF,['#25202d','#49384d','#786078'],true);
    setRamp(A.R_HPT,['#171a20','#292c35','#42414a'],false);
    setRamp(A.R_HPTF,['#171a20','#292c35','#42414a'],true);
    const J=s=>({hip:[0,s*1.2,4.2],knee:[2.2,s*1.3,4],foot:[3.5,s*1.4,1.5],sh:[.1,s*2.7,9.4],el:[1.1,s*2.5,7],hd:[2,s*1.5,6.1]});
    J.pel=[0,0,3.8]; J.chest=[.3,0,9]; J.head=[.25,0,12.3];
    figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'short',mustache:true},{noShadow:true});
    const collar=toWorld(P,.7,0,8.9); stroke(collar[0],collar[1]-.09,collar[2]+.3,collar[0]+.12,collar[1]-.09,collar[2]-.8,rgb('#d2c0a2'));
  });
  floor(7.6,3.75,10.1,5.85,18.3,(x,y)=>shadeC(fabric,.88+h2((x-camera.x)>>2,(y-camera.y)>>2)/1800));
  quad(7.15,3.75,17.7,7.6,3.75,18.3,7.6,5.85,18.3,7.15,5.85,17.7,()=>shadeC(fabric,1.03));
  quad(6.98,3.75,16.5,7.15,3.75,17.7,7.15,5.85,17.7,6.98,5.85,16.5,()=>shadeC(fabric,.92));
  const billow=.07*Math.sin(t*.025);
  quad(9.15,5.86+billow,8.8,10.1,5.86+billow,8.8,10.1,5.86,18.3,9.15,5.86,18.3,(x,y)=>shadeC(rgb('#5c2528'),.85+h2((x-camera.x)>>2,(y-camera.y)>>2)/1800));
  for(const i of [9.34,9.66,9.98]) stroke(i,5.87+billow,9,i,5.87,18.1,rgb('#762f30'));
  // Curving ribs and uneven highlights suggest folded fabric stacked at the back.
  for(const [a,b,c] of [[7.03,7.18,7.53],[7.25,7.42,7.79],[7.48,7.68,8.05]]){
    stroke(a,5.88,9,a,5.88,13.8,dark);
    stroke(a,5.88,13.8,b,5.88,16.9,fold);
    stroke(b,5.88,16.9,c,5.88,18.15,fold);
  }
  stroke(7.95,5.87,8.8,8.65,5.87,18.3,dark);
  stroke(8.65,5.87,18.3,10.1,5.87,18.3,dark);
  stroke(10.1,5.87,8.8,10.1,5.87,18.3,dark);
  stroke(10.1,3.75,8.8,10.1,3.75,18.3,dark);
  stroke(7.6,5.86,18.3,10.1,5.86,18.3,fold);
  // Near wheels, step and small lamp on the coach's front corner.
  coachWheel(6.95,5.95,5.8,5.7);coachWheel(10.35,5.95,3.0,2.9);
  stroke(8,6,2,9,6,2,trim);stroke(8.1,5.9,2,8.1,6.1,2,dark);stroke(9,5.9,2,9,6.1,2,dark);
  isoBox(10.12,5.8,10.35,6.03,10.2,12.2,dark,C.lamp,rgb('#6f5533'));
  stroke(10.1,5.9,12.3,10.37,5.9,12.3,trim);
  // Raised upholstered box, curved wooden pedestal and a forward footboard.
  isoBox(9.9,4.05,10.55,5.55,13,17.2,rgb('#67443a'),rgb('#563732'),rgb('#392923'));
  quad(10.4,5.57,13.2,11.15,5.57,14.8,11.08,5.57,15.3,10.4,5.57,14.3,()=>rgb('#68443a'));
  stroke(10.38,5.59,13.1,10.57,5.59,13.6,dark);
  stroke(10.57,5.59,13.6,10.67,5.59,14.5,dark);
  stroke(10.67,5.59,14.5,10.58,5.59,15.6,dark);
  isoBox(10.42,3.92,11.35,5.6,15.1,15.65,rgb('#987855'),rgb('#6a4d36'),rgb('#4a3829'));
  for(const j of [4.3,4.75,5.2])stroke(10.48,j,15.68,11.28,j,15.68,C.woodDark);
  stroke(10.38,5.7,4,10.65,5.7,5.1,dark);
  stroke(10.65,5.7,5.1,11.15,5.7,9.2,dark);
  stroke(11.15,5.7,9.2,11.05,5.7,11.4,dark);
  stroke(11.05,5.7,11.4,10.68,5.7,13.8,dark);
  isoBox(9.92,3.95,10.62,5.6,17.2,18.55,rgb('#765147'),rgb('#3c2926'),rgb('#2b211e'));
  isoBox(9.8,3.95,10.02,5.6,18.45,21.1,rgb('#67483d'),rgb('#4a302a'),rgb('#30231f'));
  stroke(9.84,5.62,20.5,10,5.62,20.5,trim);
  withCellOutfit(()=>{
    const A=appearanceState, P={i:10.25,j:4.75,fi:1,fj:0,z0:14.8};
    setRamp(A.R_HSH,['#1d2922','#303e2e','#4d5741'],false);
    setRamp(A.R_HSHF,['#1d2922','#303e2e','#4d5741'],true);
    const phase=t%360, away=phase<80?0:phase<140?ease((phase-80)/60):phase<270?1:ease((360-phase)/90);
    const hand=[lerp(1.8,3.1,away),2.1,lerp(10.75,8.7,away)];
    /** The driver holds the reins in one hand and raises his pipe with the other. */
    const J=s=>({hip:[0,s*1.2,4.2],knee:[2.2,s*1.3,4],foot:[3.9,s*1.4,1.4],sh:[.1,s*2.7,9.4],el:s>0?[1.4,3,9]:[1.4,s*2.6,7.8],hd:s>0?hand:[3,s*2.2,8.2]});
    J.pel=[0,0,3.8];J.chest=[.4,0,9];J.head=[.35,0,12.4];
    figureHD(P,J,{sk:[A.R_SKIN,A.R_SKINF],top:[A.R_HSH,A.R_HSHF],pt:[A.R_HPT,A.R_HPTF],shoe:A.R_HSLIP,hair:A.R_HAIR,style:'short'},{noShadow:true});
    thin(...toWorld(P,...hand),...toWorld(P,hand[0]-.65,.4,hand[2]+.65),rgb('#735038'));
    stroke(...toWorld(P,hand[0]+.3,2.2,hand[2]),...toWorld(P,hand[0]+.3,2.2,hand[2]+.5),rgb('#38241a'));
    if(phase>=140&&phase<260){ const age=phase-140, mouth=toWorld(P,1.35,0,11.5), x=isoX(mouth[0],mouth[1])+age*.035, y=isoY(...mouth)-age*.05;
      spot(x,y,2+age*.015,1.5+age*.01,.3*Math.min(1,age/15)*(1-age/120),C.fog); }
  });
  isoBox(10.15,4.57,10.48,4.93,27,30,rgb('#30302b'),dark,dark);
  stroke(10.04,4.75,27,10.59,4.75,27,trim);
  // The far horse, then the pole between the pair and the splinter bar at the coach's front, then the near horse.
  horse(t,0,0,dark,trim);
  stroke(10.55,4.15,6.6,10.55,6.95,6.6,C.woodDark); thin(10.55,4.15,7.1,10.55,6.95,7.1,C.woodLight);
  quad(10.35,5.52,3.2,13.95,5.52,9.6,13.95,5.52,10.2,10.35,5.52,3.8,()=>C.wood);
  stroke(10.35,5.52,3.8,13.95,5.52,10.2,C.woodLight); stroke(10.35,5.52,3.1,13.95,5.52,9.5,dark);
  isoBox(13.85,5.42,14.05,5.62,9.5,10.4,C.ironHi,C.iron,C.iron);
  for(const j of [5.05,6.0]) thin(13.95,5.52,10,13.55,j,11.6,dark);
  horse(t,1.35,1.1,dark,trim);
}
