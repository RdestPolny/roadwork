// Alley rats: small groups that slip out of ALLEY.ratHoles, scurry nose to tail along ALLEY.ratLanes (wall foot, gutter, round
// the bay and the corner), stop to sniff (rarely rear up), dash and vanish into another hole; they bolt from the hero.
// Pure simulation (createRats/stepRats/ratPositions) is split from drawing so it can be tested without a canvas.
// Everything is a function of the tick clock and a hash PRNG: no Math.random, no wall-clock time.
import { rgb, state as appearanceState } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { isoX, isoY, shadeC } from './gym.js';
import { ALLEY } from './alley-layout.js';

/** @typedef {{id:string,px:number[],py:number[],cum:number[],len:number}} Lane */
/** @typedef {{px:number[],py:number[],cum:number[],len:number,lane:number,la:number,lb:number,fromHole:boolean}} Route */
/** @typedef {{k:number,route:Route,s:number,delay:number,mode:'wait'|'go'|'flee'|'done',mv:number,phase:number,react:number,fled:boolean,idle:number,stopN:number,kind:number,gap:number,jit:number}} Rat */
/** @typedef {{g:number,epoch:number,st:'wait'|'run',timer:number,rats:Rat[],mode:string,mt:number,mv:number,fv:number,beat:number,age:number,startHole:number}} Group */
/** @typedef {{t:number,groups:Group[]}} RatState */

/** Groups that cycle in parallel (most of the time only one or two are out). */
const NG=4;
/** Hero distance (ground units) that makes a group bolt, and the reaction delay range (seconds). */
export const FLEE_R=2.2;
const REACT_MIN=.15, REACT_SPAN=.15;
/** Longest hole-to-lane connector and the margin kept from solids. */
const CONN_MAX=2.2, MARGIN=.1;
/** Groups are only started this close to the hero and are dropped when he is far away. */
const SPAWN_MIN=3.5, SPAWN_MAX=19, KEEP_MAX=30;

/** Deterministic 0..1 number from three integers (no Math.random anywhere). */
function rnd(/** @type {number} */a,/** @type {number} */b,/** @type {number} */c){
  let h=Math.imul(a+1,0x9E3779B1)^Math.imul(b+7,0x85EBCA6B)^Math.imul(c+13,0xC2B2AE35);
  h=Math.imul(h^(h>>>15),0x2C1B3C6D); h=Math.imul(h^(h>>>12),0x297A2D39); h^=h>>>15;
  return (h>>>0)/4294967296;
}

// ---------- geometry ----------

const SOLIDS=ALLEY.boxes.filter(b=>b.solid!==false).map(b=>b.box);
/** Whether (i,j) keeps the margin m from every solid footprint. */
export function ratClear(/** @type {number} */i,/** @type {number} */j,m=MARGIN){
  for(const b of SOLIDS) if(i>b[0]-m&&i<b[2]+m&&j>b[1]-m&&j<b[3]+m) return false;
  return true;
}
/** @type {Lane[]} */
export const LANES=ALLEY.ratLanes.map(l=>{
  const px=l.pts.map(p=>p[0]), py=l.pts.map(p=>p[1]), cum=[0];
  for(let k=1;k<px.length;k++) cum.push(cum[k-1]+Math.hypot(px[k]-px[k-1],py[k]-py[k-1]));
  return {id:l.id,px,py,cum,len:cum[cum.length-1]};
});
export const HOLES=ALLEY.ratHoles;

/** Scratch result of the lane helpers (no allocation in the frame loop). */
const Q={x:0,y:0,u:0,d:0};
/** Nearest point of a lane to (x,y): fills Q. */
function projLane(/** @type {Lane} */L,/** @type {number} */x,/** @type {number} */y){
  Q.d=1e9;
  for(let k=0;k<L.px.length-1;k++){
    const ax=L.px[k], ay=L.py[k], dx=L.px[k+1]-ax, dy=L.py[k+1]-ay, l2=dx*dx+dy*dy;
    const t=l2?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l2)):0, qx=ax+dx*t, qy=ay+dy*t, d=Math.hypot(x-qx,y-qy);
    if(d<Q.d){ Q.d=d; Q.x=qx; Q.y=qy; Q.u=L.cum[k]+Math.sqrt(l2)*t; }
  }
}
/** Point of a lane at arc length u: fills Q. */
function lanePoint(/** @type {Lane} */L,/** @type {number} */u){
  u=Math.max(0,Math.min(L.len,u));
  let k=0; while(k<L.px.length-2&&L.cum[k+1]<u) k++;
  const l=L.cum[k+1]-L.cum[k], t=l?(u-L.cum[k])/l:0;
  Q.x=L.px[k]+(L.px[k+1]-L.px[k])*t; Q.y=L.py[k]+(L.py[k+1]-L.py[k])*t; Q.u=u;
}

/** Hole-to-lane connectors that keep clear of solids: CONN[hole][lane] = {u,x,y,d} or null. */
export const CONN=HOLES.map(h=>LANES.map(L=>{
  projLane(L,h.i,h.j);
  if(Q.d>CONN_MAX) return null;
  const c={u:Q.u,x:Q.x,y:Q.y,d:Q.d}, n=Math.ceil(c.d/.05);
  for(let q=1;q<=n;q++){ const f=q/n; if(q*.05>.12&&!ratClear(h.i+(c.x-h.i)*f,h.j+(c.y-h.j)*f)) return null; }
  return c;
}));

/** Route through point lists: hole, lane entry, lane corners, lane exit, hole (or a flee path from the current spot). */
function makeRoute(/** @type {number[]} */xs,/** @type {number[]} */ys,/** @type {number} */lane,/** @type {number} */ia,/** @type {number} */ib,/** @type {boolean} */fromHole){
  const cum=[0]; for(let k=1;k<xs.length;k++) cum.push(cum[k-1]+Math.hypot(xs[k]-xs[k-1],ys[k]-ys[k-1]));
  return {px:xs,py:ys,cum,len:cum[cum.length-1],lane,la:cum[ia],lb:cum[ib],fromHole};
}
/** Append lane corners strictly between arc lengths u0 and u1 (either order of travel). */
function laneCorners(/** @type {Lane} */L,/** @type {number} */u0,/** @type {number} */u1,/** @type {number[]} */xs,/** @type {number[]} */ys){
  if(u1>=u0){ for(let k=0;k<L.px.length;k++) if(L.cum[k]>u0+1e-6&&L.cum[k]<u1-1e-6){ xs.push(L.px[k]); ys.push(L.py[k]); } }
  else for(let k=L.px.length-1;k>=0;k--) if(L.cum[k]<u0-1e-6&&L.cum[k]>u1+1e-6){ xs.push(L.px[k]); ys.push(L.py[k]); }
}
/** A full route from hole ha along lane li to hole hb. */
function holeRoute(/** @type {number} */ha,/** @type {number} */hb,/** @type {number} */li){
  const L=LANES[li], A=/** @type {any} */(CONN[ha][li]), B=/** @type {any} */(CONN[hb][li]);
  const xs=[HOLES[ha].i,A.x], ys=[HOLES[ha].j,A.y];
  laneCorners(L,A.u,B.u,xs,ys);
  xs.push(B.x,HOLES[hb].i); ys.push(B.y,HOLES[hb].j);
  return makeRoute(xs,ys,li,1,xs.length-2,true);
}

/** Scratch pose along a route: ground position and unit heading. */
const P={x:0,y:0,di:1,dj:0,seg:0};
function posAt(/** @type {Route} */R,/** @type {number} */s){
  s=Math.max(0,Math.min(R.len,s));
  let k=0; while(k<R.px.length-2&&R.cum[k+1]<s) k++;
  const l=R.cum[k+1]-R.cum[k], t=l>1e-9?(s-R.cum[k])/l:0, dx=R.px[k+1]-R.px[k], dy=R.py[k+1]-R.py[k], n=Math.hypot(dx,dy)||1;
  P.x=R.px[k]+dx*t; P.y=R.py[k]+dy*t; P.di=dx/n; P.dj=dy/n; P.seg=k;
}

// ---------- simulation ----------

/** Fresh state: all groups wait out a staggered first delay. */
export function createRats(){
  /** @type {RatState} */
  const S={t:0,groups:[]};
  for(let g=0;g<NG;g++) S.groups.push({g,epoch:0,st:'wait',timer:2+rnd(g,0,1)*9+g*2,rats:[],mode:'run',mt:0,mv:3,fv:3,beat:0,age:0,startHole:-1});
  return S;
}

/** Start a group if a hole at a good distance from the hero exists; otherwise try again soon. */
function spawn(/** @type {Group} */G,/** @type {RatState} */S,/** @type {{i:number,j:number}|undefined} */hero){
  const e=G.epoch, cands=[];
  for(let h=0;h<HOLES.length;h++){
    if(S.groups.some(o=>o!==G&&o.st==='run'&&o.startHole===h)) continue;
    const d=hero?Math.hypot(HOLES[h].i-hero.i,HOLES[h].j-hero.j):10;
    if(d<SPAWN_MIN||d>SPAWN_MAX) continue;
    cands.push(h);
  }
  const fail=()=>{ G.epoch++; G.timer=1.5+rnd(G.g,e,2)*2; };
  if(!cands.length) return fail();
  const ha=cands[Math.floor(rnd(G.g,e,3)*cands.length)], opts=[];
  for(let li=0;li<LANES.length;li++){
    if(!CONN[ha][li]) continue;
    for(let hb=0;hb<HOLES.length;hb++){
      const B=CONN[hb][li], A=/** @type {any} */(CONN[ha][li]);
      if(hb!==ha&&B&&Math.abs(B.u-A.u)>=3.5&&Math.abs(B.u-A.u)<=17) opts.push([li,hb]);
    }
  }
  if(!opts.length) return fail();
  const [li,hb]=opts[Math.floor(rnd(G.g,e,4)*opts.length)], route=holeRoute(ha,hb,li), n=2+Math.floor(rnd(G.g,e,5)*3.99);
  G.rats=[];
  for(let k=0;k<n;k++) G.rats.push({k,route,s:0,delay:k*(.1+rnd(G.g,e,10+k)*.12),mode:'wait',mv:0,phase:rnd(G.g,e,20+k)*4,react:-1,fled:false,idle:0,stopN:0,kind:0,gap:.34+rnd(G.g,e,30+k)*.2,jit:.9+rnd(G.g,e,40+k)*.2});
  Object.assign(G,{st:'run',startHole:ha,mode:'run',mt:.6,mv:3,fv:3,beat:0,age:0});
}

/** Pick the leader's next gait beat (run, trot, pause or a burst) from the hash PRNG. */
function nextBeat(/** @type {Group} */G,/** @type {number} */remain){
  const r=rnd(G.g,G.epoch,100+G.beat++), r2=rnd(G.g,G.epoch,300+G.beat);
  if(remain<2.2||G.age<.8){ G.mode='run'; G.mv=3.2+r2*.8; G.mt=.8+r*.8; }
  else if(r<.3){ G.mode='pause'; G.mt=.6+r2*1.3; }
  else if(r<.55){ G.mode='trot'; G.mv=1.6+r2*.7; G.mt=1+r*2; }
  else if(r<.75){ G.mode='burst'; G.mv=4.2+r2*.5; G.mt=.5+r2*.4; }
  else { G.mode='run'; G.mv=2.5+r2*1.5; G.mt=.8+r*1.4; }
  if(G.mode!=='pause') G.fv=G.mv;
}

/** Send a rat to the best hole of its lane: nearest, but not past the hero. */
function startFlee(/** @type {Rat} */r,/** @type {Group} */G,/** @type {{i:number,j:number}} */hero){
  r.fled=true; r.mode='flee';
  const R=r.route;
  if(r.s>R.lb) return;                                           // already on the way into the hole
  posAt(R,r.s); const x=P.x, y=P.y;
  if(r.s<R.la){                                                  // still on the way out: back into the hole it came from
    r.route=makeRoute([x,R.px[0]],[y,R.py[0]],R.lane,1,1,false); r.s=0; return;
  }
  const L=LANES[R.lane];
  projLane(L,x,y); const u=Q.u;
  projLane(L,hero.i,hero.j); const hu=Q.d<2.8?Q.u:-1e9;
  let best=-1, bc=1e9;
  for(let h=0;h<HOLES.length;h++){
    const c=CONN[h][R.lane]; if(!c) continue;
    let cost=Math.abs(c.u-u)+c.d*.5+rnd(G.g,G.epoch,500+r.k*17+h)*1.6;
    if(hu>-1e8&&((hu>Math.min(u,c.u)&&hu<Math.max(u,c.u))||Math.hypot(HOLES[h].i-hero.i,HOLES[h].j-hero.j)<1.4)) cost+=12;
    if(cost<bc){ bc=cost; best=h; }
  }
  if(best<0) return;
  const c=/** @type {any} */(CONN[best][R.lane]), xs=[x], ys=[y];
  laneCorners(L,u,c.u,xs,ys); xs.push(c.x,HOLES[best].i); ys.push(c.y,HOLES[best].j);
  r.route=makeRoute(xs,ys,R.lane,0,xs.length-2,false); r.s=0;
}

/** Advance the rats by dt seconds (hero = {i,j} or undefined). Internally sub-stepped, so any dt is safe. */
export function stepRats(/** @type {RatState} */S,/** @type {number} */dt,/** @type {{i:number,j:number}|undefined} */hero){
  while(dt>1e-9){ const h=Math.min(dt,1/30); step1(S,h,hero); dt-=h; }
}
function step1(/** @type {RatState} */S,/** @type {number} */dt,/** @type {{i:number,j:number}|undefined} */hero){
  S.t+=dt;
  for(const G of S.groups){
    if(G.st==='wait'){ G.timer-=dt; if(G.timer<=0) spawn(G,S,hero); continue; }
    G.age+=dt; G.mt-=dt;
    const lead=G.rats[0], remain=lead&&lead.mode!=='done'?lead.route.len-lead.s:0;
    if(G.mt<=0) nextBeat(G,remain);
    let alive=false, near=false, far=!hero;
    if(hero){
      far=true;
      for(const r of G.rats){
        if(r.mode==='done'||r.mode==='wait') continue;
        posAt(r.route,r.s); const d=Math.hypot(P.x-hero.i,P.y-hero.j);
        if(d<FLEE_R) near=true;
        if(d<KEEP_MAX) far=false;
      }
    }
    if(far&&G.age>1){ for(const r of G.rats) r.mode='done'; }
    for(let k=0;k<G.rats.length;k++){
      const r=G.rats[k], ahead=k?G.rats[k-1]:null;
      if(r.mode==='done') continue;
      alive=true;
      if(r.mode==='wait'){
        if(near&&hero){ r.mode='done'; continue; }               // startled before it left the hole
        if(ahead&&ahead.mode==='wait') continue;
        r.delay-=dt; if(r.delay<=0){ r.mode='go'; r.s=0; }
        continue;
      }
      if(near&&!r.fled&&r.react<0) r.react=REACT_MIN+rnd(G.g,G.epoch,600+k)*REACT_SPAN;
      if(r.react>=0&&!r.fled){ r.react-=dt; if(r.react<=0&&hero) startFlee(r,G,/** @type {any} */(hero)); }
      let want;
      if(r.mode==='flee') want=4.6+rnd(G.g,G.epoch,700+k)*1.1;
      else if(k===0) want=G.mode==='pause'?0:G.mv*r.jit;
      else want=G.fv*r.jit*(ahead&&ahead.mode==='go'?1+Math.max(0,Math.min(.5,(ahead.s-r.s-r.gap)*.8)):1);
      const old=r.s;
      r.s+=want*dt;
      if(r.mode==='go'&&ahead&&ahead.mode==='go') r.s=Math.min(r.s,ahead.s-r.gap);
      if(r.s<old) r.s=old;
      const v=(r.s-old)/dt;
      r.mv+=(v-r.mv)*Math.min(1,dt*12); r.phase+=r.s-old;
      if(r.mv<.3){ if(!r.idle){ r.stopN++; r.kind=rnd(G.g,G.epoch,800+k*31+r.stopN)<.17?1:0; } r.idle+=dt; } else r.idle=0;
      if(r.s>=r.route.len+.5) r.mode='done';
    }
    if(!alive||G.rats.every(r=>r.mode==='done')){ G.st='wait'; G.epoch++; G.timer=14+rnd(G.g,G.epoch,7)*22; G.rats=[]; G.startHole=-1; }
  }
}

/** Visible rats as plain positions (for tests and the debug view). */
export function ratPositions(/** @type {RatState} */S){
  const out=[];
  for(const G of S.groups) for(const r of G.rats){
    if(r.mode==='wait'||r.mode==='done') continue;
    posAt(r.route,r.s); out.push({g:G.g,k:r.k,i:P.x,j:P.y,mode:r.mode,s:r.s,len:r.route.len});
  }
  return out;
}

// ---------- drawing ----------

const C={o:rgb('#2b2723'),b:rgb('#54493e'),l:rgb('#7a6d5c'),h:rgb('#2a2520'),e:rgb('#9a6f66'),r:rgb('#b0501f'),n:rgb('#8c6a62'),f:rgb('#7a5a52'),w:rgb('#7d7262')};
const TAIL=rgb('#8a6e64'), TAIL2=rgb('#6f5750');
/** Heading of each drawn orientation on screen: E, SE, S, SW, W, NW, N, NE. */
const DX=[1,.894,0,-.894,-1,-.894,0,.894], DY=[0,.447,1,.447,0,-.447,-1,-.447];

/** Hand-drawn sprites (feet row last). Facing right/down variants only; the left ones are drawn mirrors. Frames: 0 spread, 1 gathered, 2 stretched. */
const ART={
  E:[["..llle..",".lbbbbrn","obbbbbbb",".f.hh.f."],[".lllle..","lbbbbbrn","obbbbbbb","..fhhf.."],["..llle..",".lbbbbrn","obbbbbbb","f..hh..f"]],
  SE:[[".llll....","obbbbble.",".hbbbbbrn","..f.h.f.."],["lllll....","obbbbble.",".hbbbbbrn","...fhf..."],[".llll....","obbbbble.",".hbbbbbrn",".f..h..f."]],
  S:[["..l..",".lbl.","lbbbl","fbhb.",".ebe.",".rnr."],["..l..",".lbl.","lbbbl","lbhbl",".ebe.",".rnr."],["..l..",".lbl.","lbbbl",".bhbf",".ebe.",".rnr."]],
  N:[[".e.e.",".bbb.","lbbbl","obbbo","fbbb.","..hf."],[".e.e.",".bbb.","lbbbl","obbbo","obbbo",".fhf."],[".e.e.",".bbb.","lbbbl","obbbo",".bbbf",".fh.."]],
  NE:[["..llll.e.","..lbbbbrn","lbbbbbbb.","obbbbh...",".f.h.f..."],["..llll.e.","..lbbbbrn","lbbbbbbb.","obbbbh...","..fhf...."],["..llll.e.","..lbbbbrn","lbbbbbbb.","obbbbh...","f..h..f.."]],
  REAR:[["..e.",".brn",".bb.","lbbf","obb.","f.hf"]],
};
/** @typedef {{n:number,dx:Int8Array,dy:Int8Array,col:Uint32Array,a:Float32Array,wx:number,wy:number}} Sprite */
/** Parse rows into a pixel list anchored at the bottom row's centre column; mirror draws the left-facing twin. */
function parse(/** @type {string[]} */rows,/** @type {boolean} */mirror,/** @type {number} */hx,/** @type {number} */hy){
  const w=rows[0].length, ax=(w-1)>>1, ay=rows.length-1, px=[], py=[], cl=[], av=[];
  let wx=0, wy=0, hasNose=false;
  for(let y=0;y<rows.length;y++) for(let x=0;x<w;x++){
    const ch=rows[y][x]; if(ch==='.') continue;
    const dx=(mirror?w-1-x:x)-ax, dy=y-ay;
    px.push(dx); py.push(dy); cl.push(/** @type {any} */(C)[ch]); av.push(dx*hx+dy*hy);
    if(ch==='n'){ wx=dx+Math.round(hx); wy=dy+Math.round(hy*.5); hasNose=true; }
  }
  return {n:px.length,dx:Int8Array.from(px),dy:Int8Array.from(py),col:Uint32Array.from(cl),a:Float32Array.from(av),wx:hasNose?wx:99,wy};
}
/** SPR[dir][frame] and REAR[side]. */
const SPR=/** @type {Sprite[][]} */([]);
{
  const names=['E','SE','S','SE','E','NE','N','NE'], mir=[false,false,false,true,true,true,false,false];
  // NE art faces up-right; NW is its mirror; N/S are symmetric.
  for(let d=0;d<8;d++) SPR.push(/** @type {any} */(ART)[names[d]].map((/** @type {string[]} */rows)=>parse(rows,mir[d],DX[d],DY[d])));
}
const REAR=[parse(ART.REAR[0],false,1,0),parse(ART.REAR[0],true,-1,0)];

/** Darken the framebuffer pixel under the rat (soft contact shadow). */
function shadowRow(/** @type {number} */x0,/** @type {number} */x1,/** @type {number} */y){
  const W=appearanceState.W, H=appearanceState.H, fb=rendererState.fb;
  if(y<0||y>=H) return;
  for(let x=Math.max(0,x0);x<=Math.min(W-1,x1);x++) fb[y*W+x]=shadeC(fb[y*W+x],.6);
}
function put(/** @type {number} */x,/** @type {number} */y,/** @type {number} */c){
  if(x>=0&&y>=0&&x<appearanceState.W&&y<appearanceState.H) rendererState.fb[y*appearanceState.W+x]=c;
}
/** Plot a 4-connected-ish line between two whole pixels. */
function line(/** @type {number} */x0,/** @type {number} */y0,/** @type {number} */x1,/** @type {number} */y1,/** @type {number} */c){
  const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))||1;
  for(let q=0;q<=n;q++) put(Math.round(x0+(x1-x0)*q/n),Math.round(y0+(y1-y0)*q/n),c);
}

const FRAMES=[0,1,2,1];
/** Draw one rat at its route position (inside the alley camera). */
function drawRat(/** @type {Rat} */r,/** @type {number} */t){
  const R=r.route;
  posAt(R,r.s);
  const x=P.x, y=P.y, di=P.di, dj=P.dj, ph=r.phase;
  const hxs=di-dj, hys=(di+dj)*.5, hl=Math.hypot(hxs,hys)||1;
  let d=0, bd=-2;
  for(let q=0;q<8;q++){ const dd=(hxs*DX[q]+hys*DY[q])/hl; if(dd>bd){ bd=dd; d=q; } }
  const ux=Math.round(isoX(x,y)), uy=Math.round(isoY(x,y,0));
  const K=Math.hypot(18*(di-dj),9*(di+dj)), idle=r.mv<.3&&r.idle>.05;
  const rear=idle&&r.kind===1&&r.idle>.15&&r.idle<1.7;
  const spr=rear?REAR[DX[d]<0?1:0]:SPR[d][idle?(((t/14)|0)&1?1:0):FRAMES[((ph/.12)|0)&3]];
  const lo=R.fromHole?-r.s*K:-1e9, hi=(R.len-r.s)*K;
  // contact shadow
  const wide=d===2||d===6?1:3;
  shadowRow(ux-wide,ux+wide,uy+1);
  // tail trails the body along the path (delayed, with a small wave)
  const wv=Math.round(Math.sin(ph*9+r.k)*(r.mv>.3?1:0.6));
  let tx=ux, ty=uy-1, any=false;
  for(let q=0;q<3;q++){
    const s2=r.s-.22-q*.12;
    if(s2<0||s2>R.len) break;
    posAt(R,s2);
    const nx=Math.round(isoX(P.x,P.y)), ny=Math.round(isoY(P.x,P.y,0))-(q===2?wv:0);
    // tail root hides behind the rump: start the line at the second pixel
    if(any||q>0) line(tx,ty,nx,ny-1,q===2?TAIL2:TAIL);
    tx=nx; ty=ny-1; any=true;
  }
  const ahx=rear?(DX[d]<0?-1:1):DX[d], ahy=rear?0:DY[d];
  for(let q=0;q<spr.n;q++){
    const a=(spr.dx[q]*ahx+spr.dy[q]*ahy);
    if(a<lo||a>hi) continue;
    put(ux+spr.dx[q],uy+spr.dy[q],spr.col[q]);
  }
  if(idle&&spr.wx!==99&&((t/9)|0)%3===0) put(ux+spr.wx,uy+spr.wy,C.w);
}

// ---------- scene hook ----------

/** @type {RatState|null} */
let S=null;
let last=-1;
/** Forget the rats (call when the alley is entered). */
export function resetAlleyRats(){ S=null; last=-1; }

/** @typedef {{box:number[],draw:()=>void}} AlleyProp */
/**
 * Rats as depth-sorted props. t = ticks (60/s), hero = {i,j}. The simulation catches up from the previous call's tick.
 * @returns {AlleyProp[]}
 */
export function alleyRats(/** @type {number} */t,/** @type {{i:number,j:number}} */hero){
  if(!S||t<last||t-last>900){ S=createRats(); last=t; }
  if(t>last){ stepRats(S,(t-last)/60,hero); last=t; }
  /** @type {AlleyProp[]} */
  const out=[];
  for(const G of S.groups) for(const r of G.rats){
    if(r.mode==='wait'||r.mode==='done') continue;
    posAt(r.route,r.s);
    if(Math.abs((P.x-P.y)-(hero.i-hero.j))>13.5||Math.abs((P.x+P.y)-(hero.i+hero.j))>17) continue;
    const i=P.x, j=P.y;
    out.push({box:[i-.15,j-.15,i+.15,j+.15],draw:()=>drawRat(r,t)});
  }
  return out;
}
