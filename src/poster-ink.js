// Ink of the Victorian poster look: engraved contours, cross-contour hatching, spot colours off register.
// `ink.px` is the stroke unit in the current user units (a tenth of a native pixel: vs/10 on the screen) and `ink.S`
// is the figure scale (figure units per user unit).

/** Poster palette: black ink, two spot colours, flesh and the paper. */
export const C={paper:'#eadcbc',ink:'#1c1611',red:'#a8261a',ochre:'#cf983c',ochreD:'#a8772a',flesh:'#e5bf95',ruddy:'#dba57c',pale:'#e9cba6',
  cream:'#f2e9d3',dark:'#2b231c',drab:'#9c917a',drabD:'#6f6655',iron:'#3a332c',stone:'#cbbd9c',stoneD:'#a99a7a',wood:'#b48a55'};
/** Misregistration of the spot colours, in device pixels. */
export const REG={x:2.6,y:1.6};
/** Light from the upper left (unit vector, screen space). */
export const LIGHT={x:-0.62,y:-0.78};
export const ink={ctx:/** @type {CanvasRenderingContext2D} */(/** @type {unknown} */(null)),px:1,S:1,boil:0,hjx:0,hjy:0,W:1,H:1};

export const rad=(/** @type {number} */ d)=>d*Math.PI/180, lerp=(/** @type {number} */ a,/** @type {number} */ b,/** @type {number} */ t)=>a+(b-a)*t;
/** Small deterministic PRNG (mulberry32). @param {number} seed @returns {()=>number} */
export function rng(seed){ let s=seed>>>0; return ()=>{ s=(s+0x6D2B79F5)>>>0; let t=s; t=Math.imul(t^t>>>15,t|1); t^=t+Math.imul(t^t>>>7,t|61); return ((t^t>>>14)>>>0)/4294967296; }; }

/** A horizontal hatching tile (two slightly wavy lines), used rotated as a pattern. @param {number} sp @param {number} lw @param {string} color */
function hatchTile(sp,lw,color){
  const c=document.createElement('canvas'); c.width=96; c.height=Math.round(sp*2); const g=/** @type {CanvasRenderingContext2D} */(c.getContext('2d'));
  g.strokeStyle=color; g.lineWidth=lw;
  for(const y0 of [sp/2,sp*1.5]){ g.beginPath(); for(let x=0;x<=96;x+=4){ const y=y0+Math.sin(x/96*Math.PI*4+y0)*0.45; x?g.lineTo(x,y):g.moveTo(x,y); } g.stroke(); }
  return c;
}
/** Hatching tiles, made on first use (imports stay free of DOM work). @type {Record<string,HTMLCanvasElement>} */ const TILES={};
function tiles(){ if(!TILES.h) Object.assign(TILES,{h:hatchTile(4.6,1.25,C.ink),h2:hatchTile(4,1.05,C.ink),hl:hatchTile(4.2,1.1,C.cream),cast:hatchTile(3.5,1.5,C.ink),fine:hatchTile(3.2,.8,C.ink)}); return TILES; }
/** @type {Record<string,CanvasPattern>} */ export const P={};
/** @type {Map<CanvasRenderingContext2D,Record<string,CanvasPattern>>} */ const PATS=new Map();

/** Draw into this context from now on (patterns are made per context). @param {CanvasRenderingContext2D} c */
export function useContext(c){
  ink.ctx=c; ink.W=c.canvas.width; ink.H=c.canvas.height;
  let p=PATS.get(c); if(!p){ p={}; const T=tiles(); for(const k in T) p[k]=/** @type {CanvasPattern} */(c.createPattern(T[k],'repeat')); PATS.set(c,p); }
  Object.assign(P,p);
}
/** Set the boil frame: hatching and contours jitter a little whenever it changes. @param {number} b */
export function setBoil(b){ ink.boil=b; const R=rng(b*7+3); ink.hjx=R()*1.6; ink.hjy=R()*1.6; }

/** @param {CanvasPattern} pat @param {number} ang @param {{x:number,y:number,w:number,h:number}} b */
export function hatch(pat,ang,b){ const k=ink.px; pat.setTransform(new DOMMatrix().scaleSelf(k).translateSelf(ink.hjx,ink.hjy).rotateSelf(ang)); ink.ctx.fillStyle=pat; ink.ctx.fillRect(b.x,b.y,b.w,b.h); }
export const toWorld=(/** @type {Path2D} */ lp,/** @type {DOMMatrix} */ M)=>{ const w=new Path2D(); w.addPath(lp,M); return w; };
const shiftM=(/** @type {number} */ d)=>new DOMMatrix().translateSelf(LIGHT.x*d*ink.px,LIGHT.y*d*ink.px);

/** Shape minus itself shifted by d (stroke units) along the light = a crescent (d>0: shadow side, d<0: lit side);
 * rl>0 cuts the outermost rim off, leaving reflected light between shadow and contour.
 * @param {Path2D} path @param {{x:number,y:number,w:number,h:number}} b @param {number} d @param {()=>void} fill @param {number} [rl] */
export function band(path,b,d,fill,rl=0){
  const ctx=ink.ctx; ctx.save(); const p=new Path2D(); p.rect(b.x-60,b.y-60,b.w+120,b.h+120);
  p.addPath(path,shiftM(d)); ctx.clip(p,'evenodd'); if(rl) ctx.clip(toWorld(path,shiftM(rl))); fill(); ctx.restore();
}
/** Engraving lines that wrap round a limb (cross-contour). @param {any} lm @param {number} sp @param {number} lw @param {string} [col] */
export function contour(lm,sp,lw,col=C.ink){
  const ctx=ink.ctx, k=ink.px, R=lm.R*1.6, c=(lm.curv??3)*k; sp*=k; ctx.beginPath();
  for(let d=-R+(ink.hjx*k)%sp; d<lm.L+R; d+=sp){ const cx=lm.A.x+lm.ux*d, cy=lm.A.y+lm.uy*d;
    ctx.moveTo(cx-lm.nx*R,cy-lm.ny*R); ctx.quadraticCurveTo(cx+lm.ux*c*2,cy+lm.uy*c*2,cx+lm.nx*R,cy+lm.ny*R); }
  ctx.lineWidth=lw*k; ctx.strokeStyle=col; ctx.stroke();
}
/** Engraving lines running along a limb (its core shadow). @param {any} lm @param {number} sp @param {number} lw @param {string} [col] */
export function along(lm,sp,lw,col=C.ink){
  const ctx=ink.ctx, k=ink.px, R=lm.R*1.6; sp*=k; ctx.beginPath();
  for(let o=-R+(ink.hjy*k)%sp; o<R; o+=sp){ ctx.moveTo(lm.A.x+lm.nx*o-lm.ux*R,lm.A.y+lm.ny*o-lm.uy*R); ctx.lineTo(lm.B.x+lm.nx*o+lm.ux*R,lm.B.y+lm.ny*o+lm.uy*R); }
  ctx.lineWidth=lw*k; ctx.strokeStyle=col; ctx.stroke();
}
/** Three tones: lit crescent (o.hi), hatched shadow with a reflected-light rim, cross-hatched core.
 * @param {Path2D} path @param {{x:number,y:number,w:number,h:number}} b @param {any} o */
export function shade(path,b,o){
  const ctx=ink.ctx; ctx.save(); ctx.clip(path);
  const lm=o.lm, rl=o.rl??2.6, ang=o.ang??32;
  if(o.dark) band(path,b,-(o.d1??9),lm?()=>contour(lm,4.2,1.1,C.cream):()=>hatch(P.hl,-28,b));
  else {
    if(o.hi) band(path,b,-(o.hiD??4),()=>{ ctx.fillStyle=o.hi; ctx.fillRect(b.x,b.y,b.w,b.h); });
    const d1=o.d1??11;
    if(lm){ band(path,b,d1,()=>contour(lm,4.2,.8),rl); band(path,b,d1*.55,()=>contour(lm,4.2,1.5),rl); }   // lines swell toward the dark
    else band(path,b,d1,()=>hatch(P.h,ang,b),rl);
    if((o.d2??5)>0) band(path,b,o.d2??5,lm?()=>along(lm,3.6,.8):()=>hatch(P.h2,ang-86,b),rl*.7);
  }
  ctx.restore();
}
/** Run fn (which strokes) outside the regions in o.cut: a path, or [a,b] for the overlap of a and b. @param {any} o @param {()=>void} fn */
export function cutStroke(o,fn){
  const ctx=ink.ctx, combos=(o.cut||[]).reduce((/** @type {Path2D[][]} */ acc,/** @type {any} */ c)=>acc.flatMap(a=>(Array.isArray(c)?c:[c]).map(p=>[...a,p])),[[]]);
  for(const cb of combos){ ctx.save(); for(const p of cb){ const r=new Path2D(); r.rect(-1e5,-1e5,2e5,2e5); r.addPath(p); ctx.clip(r,'evenodd'); } fn(); ctx.restore(); }
}
/** One inked piece: heavy contour on the shadow side, fill (spot colours off register), engraving shade, fine contour.
 * @param {Path2D} path @param {{x:number,y:number,w:number,h:number}} b @param {string} fill @param {any} [o] */
export function part(path,b,fill,o={}){
  const ctx=ink.ctx, k=ink.px; ctx.lineJoin='round'; ctx.lineCap='round';
  if(o.lw!==0) cutStroke(o,()=>{ ctx.translate(-LIGHT.x*1.8*k,-LIGHT.y*1.8*k); ctx.lineWidth=(o.lw??4.6)*k; ctx.strokeStyle=C.ink; ctx.stroke(path); });
  if(o.spot){ ctx.fillStyle=C.paper; ctx.fill(path); ctx.save(); ctx.translate(REG.x*k,REG.y*k); ctx.fillStyle=fill; ctx.fill(path); ctx.restore(); }
  else { ctx.fillStyle=fill; ctx.fill(path); }
  if(o.shade!==false) shade(path,b,o);
  if(o.inside) o.inside();
  if(o.lw!==0) cutStroke(o,()=>{ ctx.lineWidth=(o.thin??1.2)*k; ctx.strokeStyle=C.ink; ctx.stroke(path); });
}

/** Closed smooth path through points; a point with a third truthy value is a sharp corner. @param {number[][]} pts */
export function blob(pts){
  const p=new Path2D(), n=pts.length, mid=(/** @type {number} */ i)=>[(pts[i%n][0]+pts[(i+1)%n][0])/2,(pts[i%n][1]+pts[(i+1)%n][1])/2];
  const m0=mid(n-1); p.moveTo(m0[0],m0[1]);
  for(let i=0;i<n;i++){ const q=mid(i); if(pts[i][2]){ p.lineTo(pts[i][0],pts[i][1]); p.lineTo(q[0],q[1]); } else p.quadraticCurveTo(pts[i][0],pts[i][1],q[0],q[1]); }
  p.closePath(); return p;
}
/** @param {Path2D} p @param {number[][]} pts */
function through(p,pts){ for(let i=1;i<pts.length-1;i++) p.quadraticCurveTo(pts[i][0],pts[i][1],(pts[i][0]+pts[i+1][0])/2,(pts[i][1]+pts[i+1][1])/2); const e=pts[pts.length-1]; p.lineTo(e[0],e[1]); }

/** Limb outlines from two muscle profiles along the bone, [t, radius in figure units]; the back is +n when facing right. */
export const PROF={
  upper:{front:[[0,14],[.15,13.4],[.44,15.8],[.62,14.6],[.84,10.4],[1,9.6]], back:[[0,17.2],[.17,16.2],[.31,13.4],[.46,14.8],[.7,12.6],[.88,10.2],[1,9.6]]},
  fore:{front:[[0,10.6],[.12,12.8],[.3,12.2],[.6,8.8],[.86,7.1],[1,7]], back:[[0,11],[.08,10.2],[.28,11.2],[.6,8.6],[1,6.9]]},
  thigh:{front:[[0,20],[.35,20.5],[.72,16],[.92,12.5],[1,12]], back:[[0,21],[.3,19.5],[.75,14],[1,12]]},
  shin:{front:[[0,11.5],[.2,10],[.7,7.5],[1,7]], back:[[0,11.5],[.22,14.5],[.48,12.5],[.78,8],[1,7]]},
  neck:{front:[[0,14.5],[.35,12],[1,11.2]], back:[[0,17],[.4,13],[1,11.8]]},
  sleeve:{front:[[0,16],[.5,17],[1,14]], back:[[0,18.5],[.5,17.5],[1,14]]},
  trouser:{front:[[0,21.5],[.5,20],[1,15.5]], back:[[0,22.5],[.5,20.5],[1,15.5]]},
  trouserLow:{front:[[0,15.5],[.5,13.5],[1,12.5]], back:[[0,15.5],[.4,15],[1,12.5]]},
};
/** @param {number[][]} pts @param {number} t */
export function prof(pts,t){ for(let i=1;i<pts.length;i++) if(t<=pts[i][0]){ const [t0,r0]=pts[i-1],[t1,r1]=pts[i], u=(t-t0)/(t1-t0), e=u*u*(3-2*u); return lerp(r0,r1,e); } return pts[pts.length-1][1]; }
/** Bone axis A→B. @param {{x:number,y:number}} A @param {{x:number,y:number}} B @param {number} R */
export function axis(A,B,R){ const dx=B.x-A.x, dy=B.y-A.y, L=Math.hypot(dx,dy)||1, ux=dx/L, uy=dy/L; return {A,B,L,ux,uy,nx:-uy,ny:ux,R,curv:3,path:/** @type {Path2D|null} */(null),pt:(/** @type {number} */ t,/** @type {number} */ s)=>[0,0]}; }
/** A limb between two joints with muscle profiles; flex swells the front (the biceps with the elbow bend).
 * @param {{x:number,y:number}} A @param {{x:number,y:number}} B @param {{front:number[][],back:number[][]}} pr @param {number} [f] @param {number} [flex] */
export function limb(A,B,pr,f=1,flex=1){
  const S=ink.S, ax=axis(A,B,0), {L,ux,uy,nx,ny}=ax, back=(/** @type {number} */ t)=>prof(pr.back,t)*S, front=(/** @type {number} */ t)=>prof(pr.front,t)*S*(1+(flex-1)*Math.sin(Math.PI*t));
  const ra=f>0?back:front, rb=f>0?front:back, N=12, s1=[], s2=[];
  for(let i=0;i<=N;i++){ const t=i/N, cx=A.x+ux*L*t, cy=A.y+uy*L*t; s1.push([cx+nx*ra(t),cy+ny*ra(t)]); s2.push([cx-nx*rb(t),cy-ny*rb(t)]); }
  const a=Math.atan2(ny,nx), cap=(/** @type {{x:number,y:number}} */ Q,/** @type {number} */ t)=>{ const o=(ra(t)-rb(t))/2; return [Q.x+nx*o,Q.y+ny*o,(ra(t)+rb(t))/2]; };
  const [bx,by,br]=cap(B,1), [qx,qy,qr]=cap(A,0), p=new Path2D();
  p.moveTo(s1[0][0],s1[0][1]); through(p,s1); p.arc(bx,by,br,a,a-Math.PI,true);
  s2.reverse(); p.lineTo(s2[0][0],s2[0][1]); through(p,s2); p.arc(qx,qy,qr,a-Math.PI,a-2*Math.PI,true); p.closePath();
  ax.R=Math.max(...[0,.25,.5,.75,1].map(t=>Math.max(ra(t),rb(t)))); const m=ax.R*1.3;
  // point on the surface: t along the bone, s in [-1,1] from the front (-) to the back (+) contour
  ax.pt=(t,s)=>{ const bk=s>=0, sg=(bk?1:-1)*(f>0?1:-1), r=(bk?back(t):front(t))*Math.abs(s); return [A.x+ux*L*t+nx*sg*r, A.y+uy*L*t+ny*sg*r]; };
  ax.path=p;
  return {...ax, path:p, b:{x:Math.min(A.x,B.x)-m,y:Math.min(A.y,B.y)-m,w:Math.abs(B.x-A.x)+2*m,h:Math.abs(B.y-A.y)+2*m}};
}
/** Run fn in a local frame. @param {DOMMatrix} M @param {()=>void} fn */
export function inLocal(M,fn){ const ctx=ink.ctx; ctx.save(); ctx.transform(M.a,M.b,M.c,M.d,M.e,M.f); fn(); ctx.restore(); }
export const box=(/** @type {{x:number,y:number}} */ c,/** @type {number} */ r)=>({x:c.x-r,y:c.y-r,w:2*r,h:2*r});
/** Polyline, or a quadratic curve through three points. @param {number[][]} pts @param {number} lw @param {string} [col] */
export function line(pts,lw,col=C.ink){
  const ctx=ink.ctx; ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
  if(pts.length===3) ctx.quadraticCurveTo(pts[1][0],pts[1][1],pts[2][0],pts[2][1]); else for(const q of pts.slice(1)) ctx.lineTo(q[0],q[1]);
  ctx.lineWidth=lw; ctx.strokeStyle=col; ctx.stroke();
}
/** A line in a limb's surface coordinates. @param {any} lm @param {number[][]} ts @param {number} lw @param {string} [col] */
export const curve=(lm,ts,lw,col)=>line(ts.map(([t,s])=>lm.pt(t,s)),lw*ink.px,col);
/** A muscle separation: crescent in (t,s) surface coords, filled with wrapping lines. @param {any} lm @param {number[][]} ts @param {number} [sp] @param {number} [lw] */
export function musc(lm,ts,sp=2.8,lw=1.1){ const ctx=ink.ctx; ctx.save(); ctx.clip(lm.path); ctx.clip(blob(ts.map(([t,s])=>lm.pt(t,s)))); contour(lm,sp,lw); ctx.restore(); }

/** Hatch the silhouettes of paths, pushed away from the light by d stroke units, onto the pieces they fall on.
 * Each receiver clips its own fill: no mask, no full-frame compositing. @param {Path2D[]} paths @param {number} d @param {(Path2D|null|undefined)[]} receivers */
export function castShadow(paths,d,receivers){
  const ctx=ink.ctx, m=new DOMMatrix().translateSelf(-LIGHT.x*d*ink.px,-LIGHT.y*d*ink.px), shifted=paths.map(p=>toWorld(p,m));
  P.cast.setTransform(new DOMMatrix().scaleSelf(ink.px).translateSelf(ink.hjx,ink.hjy).rotateSelf(-38));
  for(const r of receivers){ if(!r) continue; ctx.save(); ctx.clip(r); ctx.fillStyle=P.cast; for(const p of shifted) ctx.fill(p); ctx.restore(); }
}

/** Woodcut starburst with a caption (an impact). @param {number} x @param {number} y @param {number} s scale @param {number} rot @param {string} text @param {boolean} small @param {number} seed */
export function starburst(x,y,s,rot,text,small,seed){
  const ctx=ink.ctx, R=rng(seed), st=(/** @type {number} */ R1,/** @type {number} */ R2)=>{ const p=new Path2D(); for(let i=0;i<24;i++){ const a=i/24*Math.PI*2, rr=(i%2?R2:R1)*(0.86+R()*.28); i?p.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):p.moveTo(Math.cos(a)*rr,Math.sin(a)*rr); } p.closePath(); return p; };
  ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(s,s);
  const outer=st(72,34), inner=st(44,22);
  ctx.lineJoin='miter'; ctx.lineWidth=7; ctx.strokeStyle=C.ink; ctx.stroke(outer);
  ctx.fillStyle=C.paper; ctx.fill(outer);
  ctx.save(); ctx.translate(REG.x,REG.y); ctx.fillStyle=small?C.ochre:C.red; ctx.fill(outer); ctx.restore();
  ctx.lineWidth=1.5; ctx.stroke(outer); ctx.fillStyle=C.paper; ctx.fill(inner); ctx.lineWidth=1.2; ctx.stroke(inner);
  ctx.rotate(-.12); ctx.font=`${text.length>9?22:28}px Ultra, 'Rye', Georgia, serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineWidth=5; ctx.strokeStyle=C.paper; ctx.strokeText(text,0,2); ctx.fillStyle=C.ink; ctx.fillText(text,0,2);
  ctx.restore();
}
