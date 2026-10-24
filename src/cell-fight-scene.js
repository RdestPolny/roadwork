/* The Ward behind a cell fight (venue 'cell'), painted: a plate and the convicts' layers baked from an AI painting and its
   Codex edits (art/cela/, scripts/cell-plate.py → cell-plate.js). The convicts stand still and breathe, mutter to each
   other now and then, and shout and pump their fists while the fight is hot (two cheering frames). Code draws only what
   moves on its own: the tallow's flicker and flame, its smoke, the dust in the window's shaft and the reek on the floor. */

import { CELL_PLATE } from './cell-plate.js';
import { state as appearanceState } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';
import { vnoise, fbm } from './newgate-fight.js';
import { mix } from './cast.js';

/** @typedef {{x:number,y:number,w:number,h:number,c:Uint32Array,a:Uint8Array}} Layer */
/** The decoded plate and layers, the per-convict excitement and the light map (built on the first fight). */
export const state = {
  /** @type {Uint32Array|null} */ plate:null, /** @type {Record<string,Layer>} */ layers:{},
  /** @type {Float32Array|null} */ lamp:null, /** @type {Float32Array} */ ex:new Float32Array(2), t:-1,
};

/** Measured on the painting (144×96): the tallow flame, the window, how far the shaft leans left per row, the convicts. */
const LAMP=[18,29], WIN={x0:95,x1:109,y0:10,y1:21}, LEAN=0.2, N=2;
const COL={beam:abgr(0xbcc4b4),beamL:abgr(0xe2e6d4),smoke:abgr(0x3a3632),mist:abgr(0x4a4a40),flame:abgr(0xffa040),flameL:abgr(0xfff0b8),glow:abgr(0xffb060)};

/** @param {number} rgb 0xRRGGBB @returns {number} the frame buffer's 0xAABBGGRR */
function abgr(rgb){ return (0xff000000|((rgb&255)<<16)|(rgb&0xff00)|((rgb>>16)&255))>>>0; }
/** @param {string} s @returns {Uint8Array} */
function unb64(s){ const b=atob(s), o=new Uint8Array(b.length); for(let i=0;i<b.length;i++) o[i]=b.charCodeAt(i); return o; }

/** Decode the baked module once; the light map of the tallow: how much each pixel follows its flicker. */
function decode(){
  if(state.plate) return;
  const P=CELL_PLATE, pal=P.pal.map(h=>abgr(parseInt(h,16)));
  const idx=unb64(P.plate); state.plate=Uint32Array.from(idx,i=>pal[i]);
  for(const [name,L] of Object.entries(P.layers)){ const i=unb64(L.i); state.layers[name]={x:L.x,y:L.y,w:L.w,h:L.h,c:Uint32Array.from(i,k=>pal[k]),a:unb64(L.a)}; }
  const W=appearanceState.W, H=appearanceState.H, m=new Float32Array(W*H);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const dx=x-LAMP[0], dy=(y-LAMP[1])*1.15; m[y*W+x]=1/(1+(dx*dx+dy*dy)/(30*30)); }
  state.lamp=m;
}

/** The static backdrop into the current frame buffer (sparring caches it as the fight's background). */
export function cellFightBg(){ decode(); rendererState.fb.set(/** @type {Uint32Array} */ (state.plate)); }

/** Paste a layer with its soft alpha, faded by `k`. The feet never move: `lift` (0–1) eases the head and shoulders up by
 * part of a pixel — a copy one pixel higher laid over them at that strength, the shoulder row repeated in the gap — so the
 * man breathes in and still stands on the flags. @param {Layer|undefined} L @param {number} lift @param {number} k */
function paste(L,lift,k){
  if(!L||k<=0) return;
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H, neck=Math.round(L.h*0.3);
  const row=(/** @type {number} */ y,/** @type {number} */ Y,/** @type {number} */ s)=>{ if(Y<0||Y>=H) return;
    for(let x=0;x<L.w;x++){ const a=L.a[y*L.w+x]; if(!a) continue; const X=L.x+x; if(X>=W) continue;
      const p=Y*W+X, f=a*s/255; M[p]=f>=0.99?L.c[y*L.w+x]:mix(M[p],L.c[y*L.w+x],f); } };
  for(let y=0;y<L.h;y++) row(y,L.y+y,k);
  if(lift>0) for(let y=0;y<=neck;y++) row(y,L.y+y-1,k*lift);
}

/** How worked up each group is: rises while the fight is hot, each at his own pace, settles slowly. @param {boolean} hot @param {number} t */
function stir(hot,t){
  const E=state.ex, dt=Math.max(0,Math.min(12,t-(state.t<0?t:state.t))); state.t=t;
  for(let i=0;i<N;i++) E[i]=Math.max(0,Math.min(1,E[i]+(hot?dt*0.06*(0.4+h2(i,9)/255):-dt*0.004)));
  return E;
}

/** The convicts by group: the three on the left of the picture, the two on the right (the cheering and muttering poses were
 * cut per group, their arms reach into the neighbours' room). @type {[string,number[]][]} */
const GROUPS=[['L',[0,1,2]],['R',[3,4]]];

/** One group: cheering (two frames switched on its own beat) when worked up; otherwise each man standing, his head and
 * shoulders rising half a pixel on a slow breath (the feet stay put), and now and then the group muttering for a few seconds (crossfaded).
 * @param {number} g @param {number} t @param {number} e */
function drawGroup(g,t,e){
  const L=state.layers, [id,men]=GROUPS[g];
  if(e>0.3){ const beat=15+g*4, up=Math.floor((t+g*7)/beat)&1; paste(L[(up?'doping':'doping2')+id],0,1); return; }
  const slot=Math.floor((t+g*170)/360), s=(t+g*170)%360, talk=h2(g,slot&255)%3===0;   // six-second slots, muttering in a third of them
  const k=talk?Math.min(1,s/10,Math.max(0,(200-s)/10)):0;
  for(const i of men) paste(L['stoi'+i],0.5*Math.max(0,Math.sin(t*2*Math.PI/(170+i*23)+i)),1-k);   // at most half a pixel
  paste(L['szept'+id],0,k);
}

/** Behind the fighters, per frame: the flicker of the tallow over the painted light, the convicts, the shaft's dust, the
 * lamp's smoke and the reek low over the flags. @param {boolean} hot */
export function cellFightBack(hot){
  decode();
  const M=rendererState.FB_MAIN, W=appearanceState.W, H=appearanceState.H, t=boxingState.tick, lm=/** @type {Float32Array} */ (state.lamp);
  const fl=0.1*(vnoise(t*0.09,3.3)-0.5)+0.06*(vnoise(t*0.37,7.1)-0.5), cl=0.85+0.15*vnoise(t*0.004,1.7);
  for(let p=0;p<W*H;p++){ const k=1+fl*1.6*lm[p]; if(k===1) continue; const o=M[p];
    M[p]=(0xff000000|(Math.min(255,((o>>16)&255)*k)<<16)|(Math.min(255,((o>>8)&255)*k)<<8)|Math.min(255,(o&255)*k))>>>0; }
  const E=stir(hot,t);
  for(let g=0;g<GROUPS.length;g++) drawGroup(g,t,E[g]);
  for(let y=WIN.y1+1;y<80;y++){ const fade=Math.exp(-(y-WIN.y1)/50)*cl;                         // the shaft breathes a little with the smog outside
    for(let x=Math.floor(WIN.x0-2-(y-WIN.y1)*LEAN);x<=Math.ceil(WIN.x1+2-(y-WIN.y1)*LEAN);x++){ if(x<0||x>=W) continue;
      const x0=x+(y-WIN.y1)*LEAN, edge=Math.max(0,Math.min(1,(x0-WIN.x0+2)/3,(WIN.x1+2-x0)/3)); if(!edge) continue;
      const a=0.07*edge*fade*fbm(x0*0.11+t*0.0013,y*0.05-t*0.0021), p=y*W+x; M[p]=mix(M[p],COL.beam,a); } }
  for(let i=0;i<10;i++){ const s=((h2(i,1)/255)+t*0.00025*(1+(i%3)*0.5))%1, u=h2(i,2)/255+0.12*Math.sin(t*0.0031+i*1.9);   // motes catching the light
    const y=WIN.y1+1+s*56, x=WIN.x0+u*(WIN.x1-WIN.x0)-(y-WIN.y1)*LEAN, a=0.4*(0.5+0.5*Math.sin(t*0.05+i*2.3))*Math.sin(Math.PI*s);
    const ix=Math.floor(x), iy=Math.floor(y), fx=x-ix, fy=y-iy;
    for(const [ox,oy,wt] of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){ const X=ix+ox, Y=iy+oy; if(X>=0&&X<W&&Y>=0&&Y<H) M[Y*W+X]=mix(M[Y*W+X],COL.beamL,a*wt); } }
  for(let y=2;y<LAMP[1]-3;y++){ const r=1.1+(LAMP[1]-y)*0.2, cx=LAMP[0]+0.5+Math.sin(y*0.3-t*0.035)*(LAMP[1]-y)*0.08;   // the tallow smoke curling up
    for(let x=Math.max(0,Math.floor(cx-r*2));x<=Math.ceil(cx+r*2);x++){ const a=0.22*Math.exp(-(((x-cx)/r)**2))*fbm(x*0.25,y*0.18+t*0.025)*Math.min(1,(LAMP[1]-3-y)/4); if(a>0.01){ const p=y*W+x; M[p]=mix(M[p],COL.smoke,a); } } }
  for(let y=70;y<H;y++){ const g=Math.min(1,(y-70)/10)*0.35;                                       // the reek low over the flags
    for(let x=0;x<W;x++){ const n=fbm(x*0.045+t*0.0016,y*0.12+t*0.0004), a=g*Math.max(0,n*1.5-0.55), p=y*W+x; if(a>0.01) M[p]=mix(M[p],COL.mist,Math.min(0.3,a)); } }
}

/** Over the finished frame: the tallow flame flickering in its glass and a faint warm glow round it. */
export function cellFightFront(){
  const M=rendererState.FB_MAIN, W=appearanceState.W, t=boxingState.tick, fl=0.84+0.1*vnoise(t*0.09,3.3)+0.06*vnoise(t*0.37,7.1), sw=Math.sin(t*0.11)*0.6+(vnoise(t*0.2,5)-0.5);
  for(let y=LAMP[1]-4;y<=LAMP[1]+4;y++) for(let x=LAMP[0]-4;x<=LAMP[0]+4;x++){ const q=((x-LAMP[0])**2+((y-LAMP[1])*1.1)**2)/20; if(q>=1) continue;
    const p=y*W+x; M[p]=mix(M[p],COL.glow,0.14*fl*(1-q)*(1-q)); }
  const put=(/** @type {number} */ x,/** @type {number} */ y,/** @type {number} */ c)=>{ M[y*W+x]=c; };
  put(LAMP[0],LAMP[1],COL.flame); put(LAMP[0]+(sw>0.35?1:sw<-0.35?-1:0),LAMP[1]-1,fl>0.86?COL.flameL:COL.flame);
}
