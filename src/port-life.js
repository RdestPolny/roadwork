/* Background life of the extended Wapping dock: a fisherman on the timber pier, drinkers outside The Rope & Anchor
 * and a small timber yard. Pure module (no renderer): every routine is a deterministic function of the life clock,
 * split into intent (a looping state machine), motion (joint poses built on the shared docker skeleton) and object
 * state (where each tankard, bottle, fish and plank is). A prop held in a hand is placed from that hand's solved joint,
 * so it can never drift away from the hand that carries it. Tests read all of it tick by tick.
 *
 * Figure frame: forward f, side s, up z in height units; 7.5 units are one ground tile, as in thames-port's toWorld.
 */
import { ANCHORS, DECK_Z } from './port-district.js';

const clamp01=(/** @type {number} */ u)=>Math.max(0,Math.min(1,u));
const ease=(/** @type {number} */ u)=>{ u=clamp01(u); return u*u*(3-2*u); };
const frac=(/** @type {number} */ v)=>v-Math.floor(v);
const lerp=(/** @type {number} */ a,/** @type {number} */ b,/** @type {number} */ u)=>a+(b-a)*u;
/** @param {number[]} a @param {number[]} b @param {number} u */
const lerp3=(a,b,u)=>[lerp(a[0],b[0],u),lerp(a[1],b[1],u),lerp(a[2],b[2],u)];
/** @param {number[]} a @param {number[]} b */
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
/** @param {number[]} a @param {number[]} b */
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
/** @param {number[]} a @param {number} k */
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
/** @param {number[]} a @param {number[]} b */
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
/** @param {number[]} a */
const len=a=>Math.hypot(a[0],a[1],a[2]);
/** A smooth 0→1→0 bump of half-width w around c. @param {number} u @param {number} c @param {number} w */
const bump=(u,c,w)=>{ const x=Math.abs(u-c)/w; return x>=1?0:.5+.5*Math.cos(Math.PI*x); };
/** Shortest turn from angle a to b by share u (eased). @param {number} a @param {number} b @param {number} u */
const turn=(a,b,u)=>{ let d=b-a; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return a+d*ease(u); };

/** Deterministic hash in [0,1): the same routine always varies the same way. @param {number} a @param {number} [b] */
export function rnd(a,b=0){
  let h=Math.imul((a|0)^0x5bd1e995,0x27d4eb2d)^Math.imul(((b|0)+0x9e3779b9)|0,0x165667b1);
  h^=h>>>15; h=Math.imul(h,0x85ebca6b); h^=h>>>13; h=Math.imul(h,0xc2b2ae35); h^=h>>>16;
  return (h>>>0)/4294967296;
}

/** Walking legs: q is the phase of one stride cycle (two steps); returns foot forward offset and lift. @param {number} q */
export const stride=q=>{ const D=.62; if(q<D) return [1.6-3.2*q/D,0]; const u=(q-D)/(1-D); return [-1.6+3.2*ease(u),Math.sin(Math.PI*u)]; };
/** Joints of a walking man at stride phase g; loaded = a sack held on the shoulder of side `side`.
 * @param {number} g @param {boolean} loaded @param {number} side */
export function walkJoints(g,loaded,side){
  const bob=-.22*Math.cos(4*Math.PI*g)-(loaded?.15:0), lean=loaded?.8:.5, swing=stride(frac(g+.5))[0], swing2=stride(frac(g))[0];
  /** @param {number} s */
  const J=s=>{ const [fx,lift]=stride(frac(g+(s>0?0:.5))), hip=[0,s*1.2,7.2+bob], sw=s>0?swing:swing2;
    return {hip,knee:[fx*.5+.55+lift*.35,s*1.3,(hip[2]+.9+lift)/2+.2],foot:[fx,s*1.4,.9+lift*.9],sh:[lean*.5,s*2.6,12.1+bob],
      el:loaded&&s===side?[.6,s*3.1,14.4+bob]:[.2-sw*.45,s*3.4,9.8+bob],hd:loaded&&s===side?[.9,s*2.3,16+bob]:[.5-sw*.8,s*3.5,7.7+bob]}; };
  J.pel=[0,0,6.6+bob];J.chest=[lean,0,12+bob];J.head=[lean+.2,0,15.3+bob];
  return J;
}

/* ------------------------------------------------------------------ frames and the pose kit */
export const UNIT=7.5;
/** @typedef {{i:number,j:number,fi:number,fj:number,z0:number}} Frame */
/** A figure standing at i,j facing angle a (radians in the i,j plane) on a floor at z0.
 * @param {number} i @param {number} j @param {number} a @param {number} [z0] @returns {Frame} */
export const frameAt=(i,j,a,z0=0)=>({i,j,fi:Math.cos(a),fj:Math.sin(a),z0});
/** A point in a figure's own frame placed in the world. @param {Frame} P @param {number[]} p */
export const toWorld=(P,p)=>[P.i+(p[0]*P.fi-p[1]*P.fj)/UNIT,P.j+(p[0]*P.fj+p[1]*P.fi)/UNIT,p[2]+P.z0];
/** A world point in a figure's own frame. @param {Frame} P @param {number[]} w */
export const toLocal=(P,w)=>{ const di=(w[0]-P.i)*UNIT, dj=(w[1]-P.j)*UNIT; return [di*P.fi+dj*P.fj,-di*P.fj+dj*P.fi,w[2]-P.z0]; };
/** A direction in a figure's frame turned into the world (still in height units). @param {Frame} P @param {number[]} d */
export const dirWorld=(P,d)=>[d[0]*P.fi-d[1]*P.fj,d[0]*P.fj+d[1]*P.fi,d[2]];
/** A world point moved by an offset given in a figure's frame. @param {Frame} P @param {number[]} w @param {number[]} d */
export const nudge=(P,w,d)=>{ const v=dirWorld(P,d); return [w[0]+v[0]/UNIT,w[1]+v[1]/UNIT,w[2]+v[2]]; };

/** Bone lengths of the docker skeleton (as walkJoints draws it at rest). */
const ARM=[2.45,2.2], LEG=[3.1,3.4];
/** Two-bone reach from root towards target, bending towards pole: [middle joint, end]; the end stops at full stretch.
 * @param {number[]} root @param {number[]} target @param {number[]} lens @param {number[]} pole */
function ik(root,target,lens,pole){
  const [a,b]=lens, d=sub(target,root), L=len(d)||1e-6, u=mul(d,1/L), D=Math.max(Math.abs(a-b)+.01,Math.min(L,a+b-.001));
  const along=(a*a-b*b+D*D)/(2*D), h=Math.sqrt(Math.max(0,a*a-along*along));
  let v=sub(pole,mul(u,dot(pole,u))); const vl=len(v); v=vl>1e-6?mul(v,1/vl):[0,0,-1];
  return [add(add(root,mul(u,along)),mul(v,h)),add(root,mul(u,D))];
}
/** @typedef {{hip:number[],knee:number[],foot:number[],sh:number[],el:number[],hd:number[]}} Limb */
/** @typedef {{pel:number[],chest:number[],head:number[],L:Limb,R:Limb,look:number[],miss?:number}} Pose */  // miss: how far a hand fell short of its target
/** @param {Pose} p @param {number} s */
export const limb=(p,s)=>s>0?p.R:p.L;
/** Hands at rest by the thighs. */
const REST_HANDS={[1]:[.5,3.2,7.6],[-1]:[.5,-3.2,7.6]};
/**
 * A standing, working body solved from intentions instead of one sine: lean (forward bend of the spine, rad), side (lean towards +s),
 * twist (shoulders about the spine, towards +s), crouch (0..1 knees), back (pelvis back), sway (weight towards +s), yaw/pitch/nod (head),
 * hands[s] and feet[s] (targets in the figure frame: hands reach them by IK, feet stay planted on them), elbow[s] (elbow pole).
 * @param {any} o
 * @returns {Pose}
 */
export function body(o={}){
  const c=o.crouch||0, lean=o.lean??.06, tw=o.twist||0, sw=o.sway||0, roll=o.side||0, bob=o.bob||0;
  const pel=[(o.back||0)-.9*c,sw,6.6-2.3*c+bob];
  const spine=(/** @type {number[]} */ v,/** @type {number} */ k)=>{ const a=lean*k, r=roll*k, x=v[0]*Math.cos(a)+v[2]*Math.sin(a), z=v[2]*Math.cos(a)-v[0]*Math.sin(a);
    return [x,v[1]+z*Math.sin(r),z*Math.cos(r)]; };
  const chest=add(pel,spine([.5,0,5.4],1)), head=add(chest,spine([.2+(o.nod||0)*.6,0,3.3],1.08));
  const cs=Math.cos(tw), sn=Math.sin(tw);
  /** @param {number} s @returns {Limb} */
  const side=s=>{
    const sh=add(chest,[-s*2.6*sn,s*2.6*cs,.1]), hip=add(pel,[-s*1.2*Math.sin(tw*.25),s*1.2*Math.cos(tw*.25),.6]);
    const [knee,foot]=ik(hip,o.feet?.[s]||[s>0?.3:-.2,s*1.45,.9],LEG,[1,s*.12,.15]);
    const target=o.hands?.[s]||[.45-lean*.6,s*3.25,7.6+bob], [el,hd]=ik(sh,target,ARM,o.elbow?.[s]||[-.35,s*.85,-1]);
    miss=Math.max(miss,len(sub(target,hd)));
    return {hip,knee,foot,sh,el,hd};
  };
  let miss=0; const L=side(-1), R=side(1);
  return {pel,chest,head,L,R,look:[tw*.75+(o.yaw||0),o.pitch||0],miss};
}
/** A walking pose from walkJoints, the hands taken to targets where given (carrying). calm (0..1) eases it into the standing
 * pose with the same hands, so a walk grows out of standing and settles back into it. @param {number} g @param {any} [o] @returns {Pose} */
export function walkBody(g,o={}){
  if(o.calm>0){ const W=walkBody(g,{...o,calm:0}), S=body({hands:o.hands,elbow:o.elbow,pitch:o.pitch,yaw:o.yaw}), k=ease(o.calm);
    const mixL=(/** @type {Limb} */ a,/** @type {Limb} */ b)=>/** @type {Limb} */(Object.fromEntries(Object.keys(a).map(key=>[key,lerp3(/** @type {any} */(a)[key],/** @type {any} */(b)[key],k)])));
    return {pel:lerp3(W.pel,S.pel,k),chest:lerp3(W.chest,S.chest,k),head:lerp3(W.head,S.head,k),L:mixL(W.L,S.L),R:mixL(W.R,S.R),look:S.look,miss:Math.max(W.miss||0,S.miss||0)}; }
  const W=walkJoints(g,false,1), out=/** @type {Pose} */({pel:W.pel,chest:W.chest,head:W.head,L:W(-1),R:W(1),look:[o.yaw||0,o.pitch||0]});
  let miss=0;
  for(const s of [-1,1]) if(o.hands?.[s]){ const L=limb(out,s), [el,hd]=ik(L.sh,o.hands[s],ARM,o.elbow?.[s]||[-.35,s*.85,-1]); miss=Math.max(miss,len(sub(o.hands[s],hd))); if(s>0) out.R={...L,el,hd}; else out.L={...L,el,hd}; }
  out.miss=miss;
  return out;
}
/** A hand's position in the world. @param {Frame} P @param {Pose} pose @param {number} s */
export const handWorld=(P,pose,s)=>toWorld(P,limb(pose,s).hd);

/* ------------------------------------------------------------------ loops of timed steps */
/** @typedef {{s:string,d:number,t0:number,[k:string]:any}} Step */
/** @typedef {{steps:Step[],T:number}} Loop */
/** A fixed loop of [state, ticks, data] steps. @param {any[]} list @returns {Loop} */
function loop(list){ let t0=0; const steps=list.map(([s,d,data])=>{ const o={...(data||{}),s,d,t0}; t0+=d; return o; }); return {steps,T:t0}; }
/** The step running at tick t, its progress u (0..1), elapsed ticks `local`, whole loops n and index k. @param {Loop} L @param {number} t */
function stepAt(L,t){
  const n=Math.floor(t/L.T), x=t-n*L.T; let lo=0, hi=L.steps.length-1;
  while(lo<hi){ const m=(lo+hi+1)>>1; if(L.steps[m].t0<=x) lo=m; else hi=m-1; }
  const S=L.steps[lo]; return {...S,u:(x-S.t0)/S.d,local:x-S.t0,n,k:lo,x};
}
/** Position, smoothed heading and distance walked at share u of a polyline. @param {number[][]} pts @param {number} u */
function walkAlong(pts,u){
  const seg=pts.slice(1).map((p,k)=>Math.hypot(p[0]-pts[k][0],p[1]-pts[k][1])), L=seg.reduce((a,b)=>a+b,0);
  const at=(/** @type {number} */ d)=>{ d=Math.max(0,Math.min(L,d)); for(let k=0;k<seg.length;k++){ if(d<=seg[k]||k===seg.length-1){ const v=seg[k]?Math.min(1,d/seg[k]):0; return [lerp(pts[k][0],pts[k+1][0],v),lerp(pts[k][1],pts[k+1][1],v)]; } d-=seg[k]; } return pts[0]; };
  const d=L*u, p=at(d), a0=at(Math.min(d,L-.3)-.3), a1=at(Math.max(d,.3)+.3);
  return {i:p[0],j:p[1],a:Math.atan2(a1[1]-a0[1],a1[0]-a0[0]),d};
}
const pathLen=(/** @type {number[][]} */ p)=>p.slice(1).reduce((s,q,k)=>s+Math.hypot(q[0]-p[k][0],q[1]-p[k][1]),0);
/** A walk along pts that turns from facing a0 into the path and, at the end, round to a1; the last `stop` ticks are the turn on the spot.
 * @param {any} S @param {number[][]} pts @param {number} a0 @param {number} a1 @param {number} stop */
function walkStep(S,pts,a0,a1,stop){
  const v=clamp01(S.local/(S.d-stop)), w=walkAlong(pts,v);
  const a=S.local<16?turn(a0,w.a,S.local/16):v>=1?turn(w.a,a1,(S.local-(S.d-stop))/stop):w.a;
  const calm=Math.max(1-clamp01(S.local/20),clamp01((S.local-(S.d-stop-20))/20));
  return {P:frameAt(w.i,w.j,a),walk:v<1,g:w.d/.69,calm};
}
/** Head yaw that turns a figure's face to a world point. @param {Frame} P @param {number[]} w */
const yawTo=(P,w)=>{ const l=toLocal(P,[w[0],w[1],0]); return Math.atan2(l[1],l[0]); };
/** A figure placed so that world point w lies at f,s in its frame when it faces angle a. @param {number[]} w @param {number} a @param {number} f @param {number} s */
const placeFor=(w,a,f,s)=>{ const d=toWorld(frameAt(0,0,a),[f,s,0]); return frameAt(w[0]-d[0],w[1]-d[1],a); };

/* ------------------------------------------------------------------ vessels held in a hand */
/** Tankard and bottle: radius (tiles), height (units), and where the hand holds them (offset from hand to the bottom centre,
 * in the holder's frame, for a hand on side +1; mirrored for side -1). */
export const VESSEL={mug:{r:.085,h:1.6,grip:[.15,-.55,-.75]},bottle:{r:.05,h:2.6,grip:[.05,0,-1.05]},cig:{r:.02,h:.75,grip:[.12,-.12,-.18]}};
/** A vessel in a hand: bottom centre and axis. tilt tips its top back towards the holder's face (rad).
 * @param {Frame} P @param {number[]} hand world @param {number} s side of the hand @param {'mug'|'bottle'|'cig'} kind @param {number} tilt */
export function heldVessel(P,hand,s,kind,tilt){
  const g=VESSEL[kind].grip, o=[g[0],g[1]*s,g[2]], c=Math.cos(tilt), n=Math.sin(tilt);
  return {bottom:nudge(P,hand,[o[0]*c-o[2]*n,o[1],o[0]*n+o[2]*c]),up:dirWorld(P,[-n,0,c])};
}
/** Where the hand must be (in the frame) so the vessel's lip touches the mouth at `lip` when tipped by tilt.
 * @param {number[]} lip @param {number} s @param {'mug'|'bottle'|'cig'} kind @param {number} tilt */
function handForLip(lip,s,kind,tilt){
  const V=VESSEL[kind], g=V.grip, o=[g[0],g[1]*s,g[2]], c=Math.cos(tilt), n=Math.sin(tilt), r=V.r*UNIT;
  const bottom=[o[0]*c-o[2]*n,o[1],o[0]*n+o[2]*c], up=[-n,0,c], rim=add(add(bottom,mul(up,V.h)),[-r*c,0,-r*n]);
  return sub(lip,rim);
}
/** The handle (or neck grip) of a vessel standing at world bottom `at`, seen from P: where a hand closes on it. @param {Frame} P @param {number[]} at @param {number} s @param {'mug'|'bottle'|'cig'} kind */
const gripOnTable=(P,at,s,kind)=>{ const g=VESSEL[kind].grip; return sub(toLocal(P,at),[g[0],g[1]*s,g[2]]); };

/* ------------------------------------------------------------------ the fisherman & dock cat */
const FA=ANCHORS.pier_fishing_spot;
/** He stands at the safe end of the pier facing the Thames, on the deck DECK_Z above the quay. */
export const FISHER=frameAt(FA.i,FA.j,FA.a,DECK_Z);
export const BUCKET={i:ANCHORS.fisher_bucket.i,j:ANCHORS.fisher_bucket.j,r:.35,h:3.5}, TACKLE=ANCHORS.fisher_box;
export const PEE_SPOT=ANCHORS.pier_peeing_spot;
export const CAT_SPOT=ANCHORS.cat_spot;
export const CAT_CRATE=ANCHORS.cat_crate;
export const CAT_STEAL_SPOT={i:48.79,j:23.77,a:1.01};

const PATH_TO_PEE=[[FA.i,FA.j],[49.40,23.50],[49.40,21.80],[PEE_SPOT.i,PEE_SPOT.j]];
const PATH_BACK=[[PEE_SPOT.i,PEE_SPOT.j],[49.40,21.80],[49.40,23.50],[FA.i,FA.j]];

/** River surface in his frame, where the float lands, and the water under the pier head where a hooked fish is drawn in. */
const WLL=-7-DECK_Z, LAND=[34,1.6,WLL], NEAR=[12.5,.7,WLL];
/** Rod: length, butt behind the reel hand, fore-hand grip and reel position along it (units). */
export const ROD={len:27,butt:1.5,grip:2.4,reel:.95};
/** At rest the rod lies across his front, reel hand by the right hip, his shoulders turned a little towards the rod. */
const REST={g:[1.2,-.6,8.6],el:.42,az:.1,twist:-.22};
/** Where the hooked fish hangs below the tip, and the float's dangling drop when the line is wound in. */
const LIFT=24, HANG=5.6;
/** Rod held up to bring the fish to the free hand, and held aside while he drops it in the bucket. */
const UNHOOK_G=[2.2,-.5,10.6], UNHOOK_EL=1.5, UNHOOK_AZ=.4, DROP_G=[1.5,-2.6,9.4], DROP_EL=1.05;

/** The fisherman's loop: casts and waits; lands a fish, stashes into bucket, takes a pee break at pier head, returns and resumes. */
export const FISH_STEPS=[
  ['PREPARE',90,{n:-1}],
  ['CAST',124,{n:-1}],
  ['WAIT',600,{n:0}],
  ['NIBBLE',130,{n:0,ok:true}],
  ['REEL',210,{n:0}],
  ['UNHOOK',190,{n:0}],
  ['DROP_FISH',120,{n:0}],
  ['PREPARE_BREAK',90,{n:0}],
  ['WALK_TO_PEE',240,{n:0}],
  ['PEE',360,{n:0}],
  ['WALK_BACK',240,{n:0}],
  ['RETRIEVE_ROD',90,{n:0}],
  ['RESUME',80,{n:0}]
];
export const FISH=loop(FISH_STEPS);
const FISH_PER_LOOP=FISH.steps.filter(s=>s.s==='DROP_FISH').length;
/** Share of DROP_FISH when the hand opens, and when the falling fish passes below the bucket's rim. */
const DROP_UP=3.2, FISH_FREE=.58, FALL_G=.045, FISH_IN=FISH_FREE+Math.sqrt((DROP_UP+.05)/FALL_G)/120;
/** Rod direction from elevation and azimuth in his frame. @param {number} el @param {number} az */
const rodDir=(el,az)=>[Math.cos(el)*Math.cos(az),Math.cos(el)*Math.sin(az),Math.sin(el)];
/** Down across the rod in its vertical plane: a loaded rod's tip drops this way. @param {number} el @param {number} az */
const rodDown=(el,az)=>[Math.sin(el)*Math.cos(az),Math.sin(el)*Math.sin(az),-Math.cos(el)];
/** The free hand turning the reel's crank in a small circle beside the reel; `into` eases it there from the fore grip.
 * @param {number[]} g @param {number} el @param {number} az @param {number} local @param {number} into */
function crank(g,el,az,local,into){
  const d=rodDir(el,az), dn=rodDown(el,az), reel=add(add(g,mul(d,ROD.reel)),mul(dn,.9)), q=local*2*Math.PI/24;
  const handle=add(add(reel,[0,1.0,0]),add(mul(d,.55*Math.cos(q)),mul(dn,.55*Math.sin(q))));
  return lerp3(add(g,mul(d,ROD.grip)),handle,into);
}

/** Intent and motion of the fisherman at tick t. @param {number} t */
function fisherRod(t){
  const S=stepAt(FISH,t), u=S.u, n=S.n*97+S.k;
  let g=REST.g, el=REST.el, az=REST.az, bend=0, grip=ROD.grip, fore=/** @type {number[]|null} */(null);
  let P=FISHER, walkPose=/** @type {any} */(null), propped=false, pee=/** @type {any} */(null);
  const relaxed={[-1]:[-.2,-1.45,.9],[1]:[.3,1.45,.9]}, cast={[-1]:[-.85,-1.55,.9],[1]:[.45,1.5,.9]}, toBucket=[.9,2.4,.9];
  /** @type {any} */ const b={lean:.07,pitch:.22,feet:cast,twist:REST.twist};
  const step=(/** @type {number[]} */ a,/** @type {number[]} */ c,/** @type {number} */ v)=>add(lerp3(a,c,ease(v)),[0,0,1.3*Math.sin(Math.PI*clamp01(v))]);
  const struck=add(REST.g,[-.4,0,1.3]);
  if(S.s==='PREPARE'){
    b.feet={[-1]:step(relaxed[-1],cast[-1],(u-.08)/.32),[1]:step(relaxed[1],cast[1],(u-.45)/.3)};
    b.sway=-.3*bump(u,.25,.2)+.2*bump(u,.6,.2); grip=ROD.grip+.5*bump(u,.75,.2); el=REST.el+.08*bump(u,.6,.35); b.pitch=.15;
  } else if(S.s==='CAST'){
    const top=[.5,-2.1,13.2], drive=[2.7,-1.4,10.6];
    if(u<.36){ g=lerp3(REST.g,top,ease(u/.3)); el=lerp(REST.el,1.78,ease((u-.05)/.31)); }
    else if(u<.43){ g=top; el=1.78; }
    else if(u<.66){ g=lerp3(top,drive,ease((u-.43)/.15)); el=lerp(1.78,.24,ease((u-.47)/.19)); }
    else { g=lerp3(drive,REST.g,ease((u-.66)/.3)); el=lerp(.24,REST.el,ease((u-.68)/.3)); }
    bend=-.22*bump(u,.52,.1)+.1*bump(u,.66,.06);
    const off=ease((u-.06)/.12)*(1-ease((u-.8)/.15)); if(off>0) fore=lerp3(add(g,mul(rodDir(el,az),grip)),[1.9,1.7,10.0],off);
    b.twist=REST.twist-.28*bump(u,.3,.3)+.08*bump(u,.6,.12); b.lean=.02+.18*bump(u,.62,.2); b.sway=-.35*bump(u,.32,.25)+.3*bump(u,.62,.2);
    b.pitch=u<.5?-.25*bump(u,.32,.3):.1+.15*ease((u-.6)/.3);
  } else if(S.s==='WAIT'){
    const L=S.local, D=S.d, e1=.18+.3*rnd(S.n,S.k+1), e2=.5+.3*rnd(S.n,S.k+2), e3=.12+.7*rnd(S.n,S.k+3);
    b.sway=.24*Math.sin(2*Math.PI*L/(460+90*rnd(n,5))+rnd(n,6)*6);
    el=REST.el+(rnd(n,7)<.5?.12:-.08)*bump(L,e2*D,80);
    const off=bump(L,e1*D,40); if(off>0) fore=add(add(REST.g,mul(rodDir(el,az),ROD.grip)),[-1.1*off,.6*off,-.5*off]);
    b.yaw=(rnd(n,8)<.5?.55:-.45)*bump(L,e3*D,85); b.pitch=.22-.2*bump(L,e3*D,85);
  } else if(S.s==='NIBBLE'){
    const strike=ease((u-.86)/.1);
    b.lean=.07+.1*ease(u/.15)-.12*strike; b.pitch=.3; el=REST.el+.5*strike; g=lerp3(REST.g,struck,strike);
  } else if(S.s==='MISS'){
    el=lerp(REST.el+.5,REST.el,ease(u/.6)); g=lerp3(struck,REST.g,ease(u/.6));
    b.lean=lerp(-.05,.1,ease(u/.4)); b.yaw=.2*Math.sin(u*Math.PI*3)*bump(u,.5,.4); b.pitch=.25;
  } else if(S.s==='REEL'){
    const c=[1.0,-1.9,9.7];
    g=lerp3(struck,c,ease(u/.3)); el=lerp(REST.el+.5,1.02,ease(u/.4)); bend=.32+.06*Math.sin(u*31)*(1-u)+.1*ease((u-.7)/.3);
    const k=ease(u/.15); b.lean=lerp(.05,-.12,k); b.back=-.5*k; b.crouch=.12*k; b.pitch=.3-.15*ease((u-.7)/.3); b.sway=-.15*k;
    fore=crank(g,el,az,S.local,ease(u/.12));
  } else if(S.s==='UNHOOK'){
    g=lerp3([1.0,-1.9,9.7],UNHOOK_G,ease(u/.4)); el=lerp(1.02,UNHOOK_EL,ease(u/.4)); az=lerp(REST.az,UNHOOK_AZ,ease(u/.4));
    bend=lerp(.42,.06,ease(u/.3)); b.lean=lerp(-.12,.1,ease(u/.5)); b.back=lerp(-.5,0,ease(u/.5)); b.crouch=lerp(.12,.06,ease(u/.5));
    b.pitch=lerp(.15,.5,ease(u/.5)); b.twist=lerp(REST.twist,.12,ease(u/.5)); b.sway=-.15*(1-ease(u/.5));
  } else if(S.s==='DROP_FISH'){
    g=lerp3(UNHOOK_G,DROP_G,ease(u/.4)); el=lerp(UNHOOK_EL,DROP_EL,ease(u/.4)); az=lerp(UNHOOK_AZ,0,ease(u/.4));
    Object.assign(b,dropBody(ease(u/.5)-ease((u-.75)/.25)*.35));
    b.feet={[-1]:cast[-1],[1]:step(cast[1],toBucket,(u-.05)/.3)};
  } else if(S.s==='PREPARE_BREAK'){
    g=lerp3(DROP_G,[1.0,1.2,7.5],ease(u/.6)); el=lerp(DROP_EL,.45,ease(u/.6)); az=lerp(0,.2,ease(u/.6));
    const release=ease(clamp01((u-.65)/.35));
    b.lean=lerp(.1,0,ease(u/.7)); b.twist=lerp(REST.twist,0,ease(u/.7)); b.pitch=lerp(.3,.1,ease(u/.7));
    fore=release>0?lerp3(add(g,mul(rodDir(el,az),grip)),[0,1.4,3],release):null;
    propped=u>=.65;
  } else if(S.s==='WALK_TO_PEE'){
    const w=walkStep(S,PATH_TO_PEE,FA.a,0.0,30);
    w.P.z0=DECK_Z; P=w.P;
    walkPose=w.walk?walkBody(w.g,{calm:w.calm}):body({pitch:.2,yaw:0});
    propped=true;
  } else if(S.s==='PEE'){
    P=frameAt(PEE_SPOT.i,PEE_SPOT.j,PEE_SPOT.a,DECK_Z);
    walkPose=body({feet:{[-1]:[-.3,-1.35,.9],[1]:[.3,1.35,.9]},hands:{[-1]:[1.1,-.45,6.2],[1]:[1.1,.45,6.2]},lean:-.04,back:.2,pitch:.35,yaw:0});
    propped=true;
    if(u>=.10&&u<=.90){
      const pulse=.02*Math.sin(t*.3);
      const p0=[51.373,21.80,6.45];
      const p1=[51.65,21.80+pulse,6.68];
      const p2=[51.95,21.80+pulse*1.5,6.10];
      const p3=[52.30,21.80+pulse*2.0,4.20];
      const p4=[52.65,21.80+pulse*2.5,0.50];
      const p5=[52.95,21.80+pulse*3.0,-7.00];
      pee={stream:[p0,p1,p2,p3,p4,p5],splash:true,impact:[52.95,21.80+pulse*3.0,-7.00]};
    }
  } else if(S.s==='WALK_BACK'){
    const w=walkStep(S,PATH_BACK,0.0,FA.a,30);
    w.P.z0=DECK_Z; P=w.P;
    walkPose=w.walk?walkBody(w.g,{calm:w.calm}):body({pitch:.2,yaw:0});
    propped=true;
  } else if(S.s==='RETRIEVE_ROD'){
    P=FISHER;
    if(u<.5){
      propped=true;
      b.lean=lerp(0,.25,ease(u/.5)); b.pitch=lerp(.1,.4,ease(u/.5));
      fore=lerp3([0,1.4,3],[1.0,1.2,7.5],ease(u/.5));
    } else {
      propped=false;
      const v=(u-.5)/.5;
      g=lerp3([1.0,1.2,7.5],REST.g,ease(v)); el=lerp(.45,REST.el,ease(v)); az=lerp(.2,REST.az,ease(v));
      b.lean=lerp(.25,.07,ease(v)); b.pitch=lerp(.4,.22,ease(v));
    }
  } else if(S.s==='RESUME'){
    P=FISHER; propped=false; g=REST.g; el=REST.el; az=REST.az;
    b.lean=.07; b.pitch=.22; b.feet=cast; b.twist=REST.twist;
  }
  return {S,g,el,az,bend,grip,fore,b,P,walkPose,propped,pee};
}
/** Turning and bending to the bucket at his left foot, by share v. @param {number} v */
const dropBody=v=>({twist:.12+.78*v,lean:.1+.6*v,crouch:.06+.29*v,yaw:.55*v,pitch:.5+.15*v});
/** Tip of the rod in his frame for a rod pose. @param {any} R */
const tipOf=R=>add(add(R.g,mul(rodDir(R.el,R.az),ROD.len-ROD.butt)),mul(rodDown(R.el,R.az),R.bend*ROD.len*.2));

/** Dock cat loop: watching, stalking during fisherman break, stealing fish, sprinting to crate, eating, returning. */
export const CAT_STEPS=[
  ['WATCH',1554],
  ['STALK',140],
  ['STEAL',90],
  ['SPRINT',100],
  ['EAT',280],
  ['RETURN',160],
  ['WATCH',240]
];
export const CAT=loop(CAT_STEPS);

/** Ticks within the routine loop when bucket inventory changes and splashes occur, derived from step timings. */
const DROP_STEP=FISH.steps.find(s=>s.s==='DROP_FISH');
const STEAL_STEP=CAT.steps.find(s=>s.s==='STEAL');
export const BUCKET_DROP_TICK=(DROP_STEP?.t0??1344)+97; // 1441: fish settles into bucket
export const BUCKET_STEAL_TICK=(STEAL_STEP?.t0??1694)+58; // 1752: cat extracts fish (u >= 0.65)
export const BUCKET_PAW_SPLASH_TICK=(STEAL_STEP?.t0??1694)+31; // 1725: cat paw enters bucket (u >= 0.35)
export const BUCKET_SPLASH_DURATION=25;

/**
 * Fish bucket state and procedural visual effects (pure canvas, zero audio).
 * Closed cycle determinism: starts at 2, increments to 3 on fisherman drop, decrements to 2 on cat theft.
 * @param {number} t
 */
export function bucketAt(t){
  const t_cycle=((t%FISH.T)+FISH.T)%FISH.T;
  const count=(t_cycle>=BUCKET_DROP_TICK&&t_cycle<BUCKET_STEAL_TICK)?3:2;
  const dropSplash=(t_cycle>=BUCKET_DROP_TICK&&t_cycle<BUCKET_DROP_TICK+BUCKET_SPLASH_DURATION)?(t_cycle-BUCKET_DROP_TICK):-1;
  const stealSplash=(t_cycle>=BUCKET_PAW_SPLASH_TICK&&t_cycle<BUCKET_PAW_SPLASH_TICK+BUCKET_SPLASH_DURATION)?(t_cycle-BUCKET_PAW_SPLASH_TICK):-1;
  const splash=Math.max(dropSplash,stealSplash);
  const flop=(t_cycle%80)<18?(t_cycle%80)/18:0;
  return {i:BUCKET.i,j:BUCKET.j,r:BUCKET.r,h:BUCKET.h,z:DECK_Z,count,splash,flop};
}

/** Dock cat state and kinematics at tick t. @param {number} t */
export function catAt(t){
  const S=stepAt(CAT,t), u=S.u;
  let pos=[CAT_SPOT.i,CAT_SPOT.j], z=DECK_Z, a=CAT_SPOT.a;
  let hasFish=false, chew=0, crouch=0, gait=0, rearUp=0, pawInBucket=false, reach=0;
  let eating=false, fishScale=0, washFace=0, tail={yaw:0,pitch:0,wag:0};
  let sit=0;

  if(S.s==='WATCH'){
    pos=[CAT_SPOT.i,CAT_SPOT.j]; z=DECK_Z; a=CAT_SPOT.a;
    sit=1;
    tail={yaw:.35*Math.sin(t*.07),pitch:-.6,wag:Math.sin(t*.07)};
  } else if(S.s==='STALK'){
    pos=[lerp(CAT_SPOT.i,CAT_STEAL_SPOT.i,ease(u)),lerp(CAT_SPOT.j,CAT_STEAL_SPOT.j,ease(u))];
    z=DECK_Z; a=Math.atan2(CAT_STEAL_SPOT.j-CAT_SPOT.j,CAT_STEAL_SPOT.i-CAT_SPOT.i);
    crouch=1; gait=u*14*Math.PI;
    tail={yaw:.12*Math.sin(t*.22),pitch:-.1,wag:Math.sin(t*.22)};
  } else if(S.s==='STEAL'){
    pos=[CAT_STEAL_SPOT.i,CAT_STEAL_SPOT.j]; z=DECK_Z; a=CAT_STEAL_SPOT.a;
    rearUp=u<.65?Math.sin(Math.PI*clamp01(u/.65)):0;
    pawInBucket=u>=.35&&u<.65; reach=ease(clamp01((u-.16)/.26))*(1-ease(clamp01((u-.61)/.17))); hasFish=u>=.65; crouch=.5*(1-rearUp);
    tail={yaw:.22*Math.sin(t*.28),pitch:.4*rearUp,wag:Math.sin(t*.28)};
  } else if(S.s==='SPRINT'){
    const TAKEOFF=[46.10,21.23];
    if(u<.70){
      const v=ease(u/.70);
      pos=[lerp(CAT_STEAL_SPOT.i,TAKEOFF[0],v),lerp(CAT_STEAL_SPOT.j,TAKEOFF[1],v)];
      z=DECK_Z;
    } else {
      const v=ease((u-.70)/.30);
      pos=[lerp(TAKEOFF[0],CAT_CRATE.i,v),lerp(TAKEOFF[1],CAT_CRATE.j,v)];
      z=lerp(DECK_Z,DECK_Z+CAT_CRATE.h,v)+.4*Math.sin(Math.PI*v);
    }
    a=Math.atan2(CAT_CRATE.j-CAT_STEAL_SPOT.j,CAT_CRATE.i-CAT_STEAL_SPOT.i);
    hasFish=true; crouch=.3; gait=u*22*Math.PI;
    tail={yaw:0,pitch:.25,wag:.2*Math.sin(t*.4)};
  } else if(S.s==='EAT'){
    pos=[CAT_CRATE.i,CAT_CRATE.j]; z=DECK_Z+CAT_CRATE.h; a=1.37;
    eating=u<.70; chew=eating?Math.sin(t*.45):0;
    fishScale=eating?Math.max(0,1-u/.70):0;
    washFace=!eating?Math.sin(t*.3):0;
    sit=!eating?1:0;
    crouch=eating?.85:0;
    tail=!eating?{yaw:.3*Math.cos(t*.07),pitch:-.6,wag:Math.cos(t*.07)}:{yaw:.35*Math.sin(t*.1),pitch:-.3,wag:Math.sin(t*.1)};
  } else if(S.s==='RETURN'){
    const LAND=[46.00,21.06];
    if(u<.20){
      const v=ease(u/.20);
      pos=[lerp(CAT_CRATE.i,LAND[0],v),lerp(CAT_CRATE.j,LAND[1],v)];
      z=lerp(DECK_Z+CAT_CRATE.h,DECK_Z,v)+.4*Math.sin(Math.PI*v);
    } else {
      const v=ease((u-.20)/.80);
      pos=[lerp(LAND[0],CAT_SPOT.i,v),lerp(LAND[1],CAT_SPOT.j,v)];
      z=DECK_Z;
    }
    const retA=Math.atan2(CAT_SPOT.j-CAT_CRATE.j,CAT_SPOT.i-CAT_CRATE.i);
    a=u>.9?lerp(retA,CAT_SPOT.a,(u-.9)/.1):retA;
    sit=u>.9?(u-.9)/.1:0;
    crouch=.1*(1-sit); gait=u*12*Math.PI;
    tail={yaw:.2*Math.sin(t*.15),pitch:.3*(1-sit)-.6*sit,wag:Math.sin(t*.15)};
  }
  const breath=Math.sin(t*.08)*.12;
  const earTwitch=(t%160<14)?Math.sin((t%160)/14*Math.PI):0;
  return {P:{i:pos[0],j:pos[1],a,z},s:S.s,state:S.s,u:S.u,hasFish,chew,tail,crouch,gait,rearUp,pawInBucket,reach,eating,fishScale,washFace,sit,breath,earTwitch};
}

/** Fish geometry from its middle and a body direction in his frame. @param {number[]} mid @param {number[]} dir */
const fishLocal=(mid,dir)=>{ const d=mul(dir,1.15/(len(dir)||1)); return {head:add(mid,d),tail:sub(mid,d)}; };

/**
 * Everything about the fisherman at tick t: his pose, the rod, the line with float and hook, and the fish.
 * Fish states: IN_WATER (unseen), ON_LINE, HELD_BY_NPC, FALLING, IN_BUCKET.
 * @param {number} t
 */
export function fisherAt(t){
  const R=fisherRod(t), S=R.S, u=S.u, P=R.P||FISHER, d=rodDir(R.el,R.az);
  const hands=/** @type {any} */({[-1]:R.g,[1]:R.fore||add(R.g,mul(d,R.grip))});
  const tipL=tipOf(R), lagTip=tipOf(fisherRod(t-7));
  /** A weight hanging `drop` below the tip, swinging behind it as the rod moves. @param {number} drop */
  const dangle=drop=>[lerp(tipL[0],lagTip[0],.55),lerp(tipL[1],lagTip[1],.55),tipL[2]-drop];
  const bob=.14*Math.sin(t*.047)+.06*Math.sin(t*.13+1), onWater=add(LAND,[0,0,bob]);
  let fishState='IN_WATER', hookL=dangle(HANG), floatL=add(hookL,[0,0,1.6]), line='dangle', fishL=/** @type {any} */(null);
  if(R.propped){
    hookL=add(onWater,[0,0,-2.2]); floatL=onWater; line='sag';
  } else if(S.s==='CAST'&&u>=.56){
    const rel=S.t0+.56*S.d+S.n*FISH.T, R0=fisherRod(rel), t0=tipOf(R0), l0=tipOf(fisherRod(rel-7));
    const start=[lerp(t0[0],l0[0],.55),lerp(t0[1],l0[1],.55),t0[2]-HANG+1.6], v=clamp01((u-.56)/.3);
    floatL=u<.86?add(lerp3(start,LAND,v),[0,0,10*4*v*(1-v)]):onWater; floatL[2]=Math.max(floatL[2],WLL);
    hookL=add(floatL,[0,0,-1.6]); line=u<.86?'flying':'sag';
  } else if(S.s==='WAIT'){ floatL=onWater; hookL=add(onWater,[0,0,-2.2]); line='sag'; }
  else if(S.s==='NIBBLE'){
    const dip=-.75*(bump(u,.14,.035)+bump(u,.4,.03)+.8*bump(u,.62,.04))-2.6*ease((u-.8)/.07);
    floatL=add(onWater,[0,0,dip]); hookL=add(floatL,[0,0,-2.2]); line=u>.86?'taut':'sag';
  } else if(S.s==='MISS'){ floatL=add(onWater,[0,0,-2.6*(1-ease(u/.25))]); hookL=add(floatL,[0,0,-2.2]); line=u<.4?'taut':'sag'; }
  else if(S.s==='REEL'){
    line='taut';
    const up=ease(u/.15);
    if(u<.7){ hookL=add(lerp3(LAND,NEAR,ease(u/.7)),[0,0,lerp(-4.8+bob,-1.3+.2*Math.sin(u*40),up)]); floatL=[hookL[0]-.6*up,hookL[1],lerp(WLL+bob-2.6,WLL+bob*.4,up)]; }
    else { const w=ease((u-.7)/.3); hookL=lerp3(add(NEAR,[0,0,-1.3]),sub(tipL,[0,0,LIFT]),w); hookL[1]+=.5*Math.sin(u*50)*(1-w);
      floatL=add(hookL,[0,0,1.6]); floatL[2]=Math.max(WLL+bob*.4,floatL[2]); }
    if(hookL[2]>WLL-.25){ fishState='ON_LINE'; fishL=fishLocal(sub(hookL,[0,0,1.15]),[.15*Math.sin(t*.4),.1,1]); }
  } else if(S.s==='UNHOOK'){
    const grab=.42, swingAt=(/** @type {number} */ x)=>{ const w=ease(x/.2), tp=lerp3(tipL,lagTip,w*.6); return add(sub(tp,[0,0,LIFT]),[1.4*Math.exp(-3.5*x)*Math.sin(12*x),0,0]); };
    if(u<grab){
      hookL=swingAt(u); fishState='ON_LINE'; fishL=fishLocal(sub(hookL,[0,0,1.15]),[.12*Math.sin(t*.4),.1,1]);
      const fishMid=sub(hookL,[0,0,1.15]), crankAt=crank(R.g,R.el,R.az,210,1);
      hands[1]=u<.1?crankAt:lerp3(crankAt,fishMid,ease((u-.1)/(grab-.1)));
    } else {
      const v=ease((u-grab)/.22), wig=mul([.15*Math.sin(t*.6),.12*Math.sin(t*.45),0],ease((u-.5)/.08)*(1-ease((u-.84)/.14)));
      const grabbed=sub(swingAt(grab),[0,0,1.15]); hands[1]=add(lerp3(grabbed,[3.1,.4,11.0],v),wig); fishState='HELD_BY_NPC';
    }
    floatL=add(hookL,[0,0,1.6]);
  } else if(S.s==='DROP_FISH'){
    const over=[BUCKET_L[0],BUCKET_L[1],BUCKET.h+DROP_UP];
    hands[1]=u<FISH_FREE?lerp3([3.1,.4,11.0],over,ease(u/.52)):add(over,mul([-.4,-.3,.8],ease((u-FISH_FREE)/.3)));
    fishState=u<FISH_FREE?'HELD_BY_NPC':u<FISH_IN?'FALLING':'IN_BUCKET';
    hookL=dangle(LIFT-2); floatL=add(hookL,[0,0,1.6]);
  }
  const pose=R.walkPose||body({...R.b,hands,elbow:{[-1]:[-.4,-1,-.8],[1]:[-.3,1,-.9]}});
  const free=pose.R.hd;
  if(fishState==='HELD_BY_NPC'){
    const rot=S.s==='UNHOOK'?ease((u-.42)/.12):1;
    fishL=fishLocal(add(free,mul([.2,-.2,.05],rot)),lerp3([0,.1,1],[.25,-1,.15],rot));
    const off=S.s==='UNHOOK'?ease((u-.82)/.16):1;
    hookL=lerp3(fishL.head,dangle(LIFT-2),off); floatL=add(hookL,[0,0,1.6]);
  } else if(fishState==='FALLING'){
    const rel=fisherAt(S.n*FISH.T+S.t0+Math.ceil(FISH_FREE*S.d)-1), h0=add(toLocal(P,rel.handR),[.2,-.2,.05]), tau=(u-FISH_FREE)*S.d, v=clamp01(tau/7);
    const mid=[lerp(h0[0],BUCKET_L[0],v),lerp(h0[1],BUCKET_L[1],v),h0[2]-FALL_G*tau*tau], a=tau*.12;
    fishL=fishLocal(mid,[.25,-Math.cos(a),-Math.sin(a)]);
  }
  const rearHand=pose.L.hd, dn=rodDown(R.el,R.az), tipW=toWorld(P,add(add(rearHand,mul(d,ROD.len-ROD.butt)),mul(dn,R.bend*ROD.len*.2)));
  const world=(/** @type {number[]} */ p)=>toWorld(P,p);
  const freeOnRod=!R.propped&&S.s!=='UNHOOK'&&S.s!=='DROP_FISH'&&!(S.s==='CAST'&&u>.1&&u<.9);
  const rod=R.propped?{
    butt:[49.80,23.90,DECK_Z],
    mid:[49.60,24.80,6.5],
    tip:[49.40,25.50,7.8],
    reel:[49.75,24.15,DECK_Z+1.2],
    fore:[49.70,24.40,DECK_Z+2.5],
    propped:true
  }:{
    butt:world(sub(rearHand,mul(d,ROD.butt))),
    mid:world(add(add(rearHand,mul(d,(ROD.len-ROD.butt)*.5)),mul(dn,R.bend*ROD.len*.075))),
    tip:tipW,
    reel:world(add(add(rearHand,mul(d,ROD.reel)),mul(dn,.9))),
    fore:world(add(rearHand,mul(d,R.grip))),
    propped:false
  };
  const b=bucketAt(t);
  return {state:S.s,s:S.s,u,n:S.n,k:S.k,P,pose,handR:world(free),freeOnRod,
    rod,line,float:R.propped?[49.40,26.50,WLL+bob]:world(floatL),
    hook:R.propped?[49.40,26.50,WLL+bob-2.2]:world(hookL),
    floatUnder:R.propped?false:floatL[2]<WLL-.3,
    fish:R.propped?null:(fishL&&fishState!=='IN_WATER'&&fishState!=='IN_BUCKET'?{state:fishState,head:world(fishL.head),tail:world(fishL.tail)}:null),
    fishState:R.propped?'IN_WATER':fishState,
    caught:b.count,splash:b.splash,pee:R.pee||null};
}
/** The bucket in his frame. */
const BUCKET_L=toLocal(FISHER,[BUCKET.i,BUCKET.j,DECK_Z]);

/* ------------------------------------------------------------------ the pub */
/** Standing barrel tables: top height (units) and radius (tiles). */
export const TABLE={h:7.15,r:.44};
const T1=ANCHORS.pub_barrel_table_1, T2=ANCHORS.pub_barrel_table_2;
/** Two labourers at the first barrel, at right angles to each other and turned a little to the street; their heads turn to the other man. */
export const DRINKER_A=placeFor(T1,-.6,5.0,1.4), DRINKER_B=placeFor(T1,2.6,5.0,-1.2);
/** A's tankard spot, the spot where B sets his tankard down, a standing bottle and the jug: fixed places on the table top. */
export const MUG_A_SPOT=[...toWorld(DRINKER_A,[3.55,2.15,0]).slice(0,2),TABLE.h];
export const BOTTLE_B_SPOT=[...toWorld(DRINKER_B,[3.5,-2.3,0]).slice(0,2),TABLE.h];
export const JUG_SPOT=[T1[0]+.12,T1[1]+.14,TABLE.h], BOTTLE_SPOT=[T1[0]-.1,T1[1]-.06,TABLE.h];
/** The conversation: alternating turns of talk; the listener drinks now and then, never both men at once. */
const TALK=(()=>{ const list=[]; let last='B', run=0;
  for(let k=0;k<12;k++){
    let sp=rnd(k,21)<.5?'A':'B'; if(sp===last&&run>=2) sp=sp==='A'?'B':'A'; run=sp===last?run+1:1; last=sp;
    const d=320+Math.round(rnd(k,22)*360);
    const drinkA=sp==='B'&&d>=380&&rnd(k,23)<.72?{at:30+Math.round(rnd(k,24)*(d-340)),sip:80+Math.round(rnd(k,25)*40)}:null;
    const sipB=sp==='A'&&rnd(k,26)<.6?{at:40+Math.round(rnd(k,27)*(d-250)),sip:55+Math.round(rnd(k,28)*30)}:null;
    list.push([sp,d,{drinkA,sipB,setDown:sp==='B'&&d>=440&&rnd(k,29)<.45}]);
  }
  return loop(list); })();
/** A's drink: reach, close the hand on the handle, raise, drink, lower, set it down on its own spot (SIP length varies). */
const DRINK_A=[['REACH_MUG',38],['GRAB',14],['RAISE',34],['SIP',0],['LOWER',34],['PLACE',42]];
/** Gesture beats of a speaking hand, chosen and timed per turn so no two turns move alike. */
const BEATS=[[3.3,1.3,11.4],[2.6,2.4,10.2],[3.7,.7,12.6],[2.2,2.9,9.4],[3.0,1.9,12.0],[3.5,1.0,10.6]];
/** @param {number} k @param {number} local @param {number} d @param {number} s @param {number} seed @param {number[]} rest */
function gesture(k,local,d,s,seed,rest){
  const n=Math.max(2,Math.floor(d/70)), pts=[]; let t0=0;
  for(let b=0;b<n;b++){ const l=.7+.6*rnd(k*13+b,seed); pts.push({t0,l,p:BEATS[Math.floor(rnd(k*7+b,seed+1)*BEATS.length)]}); t0+=l; }
  const sc=d/t0; let prev=rest;
  for(let b=0;b<n;b++){ const B=pts[b], a=B.t0*sc, e=a+B.l*sc, p=[B.p[0],s*B.p[1],B.p[2]];
    if(local<e){ const v=(local-a)/(e-a); return lerp3(lerp3(prev,p,ease(v/.45)),rest,b===n-1?ease((v-.6)/.4):0); }
    prev=p; }
  return rest;
}
/** Lips of a drinker in his frame. */
const LIP=[2.15,.25,13.75];
/**
 * The two men at the first barrel table. A's tankard: ON_TABLE or HELD_BY_NPC; B's bottle: HELD_BY_NPC or ON_TABLE.
 * @param {number} t
 */
export function drinkersAt(t){
  const S=stepAt(TALK,t), L=S.local, A=DRINKER_A, B=DRINKER_B;
  const yawAB=yawTo(A,[B.i,B.j]), yawBA=yawTo(B,[A.i,A.j]);
  // A: his tankard stands on the barrel; his near hand goes to it only to drink
  let aState=S.s==='A'?'TALK':'IDLE', aU=0, mug='ON_TABLE', tilt=0;
  const handle=gripOnTable(A,MUG_A_SPOT,1,'mug'), rest=[.7,3.15,7.7], onTable=add(toLocal(A,[T1[0],T1[1],TABLE.h]),[-2.7,-1.4,.55]);
  /** @type {any} */ const a={hands:{[1]:rest,[-1]:onTable},yaw:yawAB*.8,pitch:.1,lean:.1,sway:.15*Math.sin(t/430+1.3)};
  if(S.drinkA&&L>=S.drinkA.at){ let x=L-S.drinkA.at;
    for(const [s,d0] of DRINK_A){ const d=s==='SIP'?S.drinkA.sip:Number(d0); if(x<d){ aState=String(s); aU=x/d; break; } x-=d; } }
  const sipT=1.0, atLip=(/** @type {number} */ k)=>handForLip(add(LIP,[0,0,.1*k]),1,'mug',sipT*k);
  if(aState==='REACH_MUG'){ a.hands[1]=lerp3(rest,handle,ease(aU)); a.lean=.1+.08*ease(aU); a.pitch=.3; a.yaw=yawAB*.8*(1-ease(aU)); }
  else if(aState==='GRAB'){ a.hands[1]=handle; a.lean=.18; a.pitch=.3; a.yaw=0; mug='HELD_BY_NPC'; }
  else if(aState==='RAISE'){ const v=ease(aU); tilt=.35*v; a.hands[1]=lerp3(handle,handForLip(LIP,1,'mug',tilt),v); a.lean=lerp(.18,.03,v); a.pitch=lerp(.3,-.15,v); a.yaw=0; mug='HELD_BY_NPC'; }
  else if(aState==='SIP'){ const v=ease(aU/.25)*(1-.2*ease((aU-.8)/.2)); tilt=lerp(.35,sipT,v); a.hands[1]=handForLip(add(LIP,[0,0,.12*v]),1,'mug',tilt); a.lean=-.03; a.pitch=lerp(-.15,-.45,v); a.yaw=0; mug='HELD_BY_NPC'; }
  else if(aState==='LOWER'){ const v=ease(aU); tilt=lerp(sipT*.8+.35*.2,0,v); a.hands[1]=lerp3(atLip(.84),handle,v); a.lean=lerp(-.03,.18,v); a.pitch=lerp(-.38,.3,v); a.yaw=yawAB*.4*v; mug='HELD_BY_NPC'; }
  else if(aState==='PLACE'){ a.hands[1]=aU<.3?handle:lerp3(handle,rest,ease((aU-.3)/.7)); a.lean=lerp(.18,.1,ease(aU)); a.pitch=lerp(.3,.1,ease(aU)); a.yaw=yawAB*.8*ease(aU); mug=aU<.3?'HELD_BY_NPC':'ON_TABLE'; }
  else if(aState==='TALK'){ a.hands[1]=gesture(S.k,L,S.d,1,41,rest); a.lean=.13; a.pitch=.04+.06*Math.sin(L*.05); a.yaw=yawAB*(.75+.25*Math.sin(L*.011+S.k)); }
  else a.pitch=.1+.08*bump(frac(L/150),.5,.15);
  const aPose=body(a);
  const mugHeld=mug==='HELD_BY_NPC'?heldVessel(A,handWorld(A,aPose,1),1,'mug',tilt):null;
  // B: keeps his bottle in his near hand, takes short pulls, sometimes sets it down to talk with both hands
  let bState=S.s==='B'?'TALK':'IDLE', bU=0, bottle='HELD_BY_NPC', btilt=0;
  const bRest=[1.6,-2.95,8.6], bGrip=gripOnTable(B,BOTTLE_B_SPOT,-1,'mug'), bSip=1.0;
  /** @type {any} */ const b={hands:{[-1]:bRest,[1]:[.4,3.2,7.7]},yaw:yawBA*.8,pitch:.06,lean:.08,sway:.13*Math.sin(t/390+4.1)};
  if(S.sipB&&L>=S.sipB.at&&L<S.sipB.at+S.sipB.sip+60){ bState='SIP'; bU=(L-S.sipB.at)/(S.sipB.sip+60); }
  if(S.setDown&&L<50){ bState='PLACE_BOTTLE'; bU=L/50; } else if(S.setDown&&L>S.d-60){ bState='TAKE_BOTTLE'; bU=(L-(S.d-60))/60; }
  if(bState==='SIP'){ const up=ease(bU/.25)*(1-ease((bU-.78)/.22)); btilt=bSip*up; b.hands[-1]=lerp3(bRest,handForLip(LIP,-1,'mug',bSip),up); b.pitch=lerp(.06,-.5,up); b.yaw=yawBA*.8*(1-up); b.lean=.08-.1*up; }
  else if(bState==='TALK'){ b.hands[1]=gesture(S.k,L,S.d,1,57,[.4,3.2,7.7]); b.lean=.12; b.yaw=yawBA*(.8+.2*Math.sin(L*.013)); b.pitch=.03+.05*Math.sin(L*.06);
    if(S.setDown){ b.hands[-1]=gesture(S.k+5,L-50,S.d-110,-1,63,bRest); bottle='ON_TABLE'; } }
  else if(bState==='PLACE_BOTTLE'){ b.hands[-1]=bU<.5?lerp3(bRest,bGrip,ease(bU/.5)):lerp3(bGrip,bRest,ease((bU-.5)/.5)); bottle=bU<.5?'HELD_BY_NPC':'ON_TABLE'; b.lean=.08+.12*bump(bU,.5,.5); b.pitch=.3; }
  else if(bState==='TAKE_BOTTLE'){ b.hands[-1]=bU<.42?lerp3(bRest,bGrip,ease(bU/.42)):lerp3(bGrip,bRest,ease((bU-.42)/.58)); bottle=bU<.42?'ON_TABLE':'HELD_BY_NPC'; b.lean=.08+.12*bump(bU,.42,.42); b.pitch=.3; }
  const bPose=body(b);
  const bottleHeld=bottle==='HELD_BY_NPC'?heldVessel(B,handWorld(B,bPose,-1),-1,'mug',btilt):null;
  return {a:{P:A,pose:aPose,state:aState,u:aU,touching:'table'},
    b:{P:B,pose:bPose,state:bState,u:bU,touching:bState==='PLACE_BOTTLE'||bState==='TAKE_BOTTLE'?'table':''},
    mug:{state:mug,...(mugHeld||{bottom:MUG_A_SPOT,up:[0,0,1]})},
    bottle:{state:bottle,...(bottleHeld||{bottom:BOTTLE_B_SPOT,up:[0,0,1]})},speaker:S.s,turn:S.k};
}

/** The loner leans one shoulder on the pub wall, a cigarette in his street-side hand, and watches the quay; a drag lifts it to his lips. */
const LA=ANCHORS.pub_wall_lean;
export const LONER=frameAt(LA.i,LA.j,LA.a);
const LONE=(()=>{ const list=[]; for(let k=0;k<10;k++){ list.push(['LEAN',700+Math.round(rnd(k,51)*500)],['SIP',190+Math.round(rnd(k,52)*70)]);
  if(rnd(k,53)<.5) list.push(['WIPE',95]); } return loop(list); })();
/** Glances: up the quay, the pier, the drinkers, the street: a new one every few seconds, eased, held. [yaw, pitch] */
const GAZE=[[.75,.02],[1.1,.06],[.25,0],[-.5,.04],[.95,.1],[.5,.18]];
/** Mouth of a figure in its frame, from the head joint and the head's yaw/pitch: where figureHD draws the lips (hp(1.5,-.1,-1) from the neck, the face front a little further).
 * @param {number[]} head @param {number} yaw @param {number} pitch */
function mouthOf(head,yaw,pitch){
  const cy=Math.cos(yaw), sy=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch), f=1.75, s=-.1, z=-1.0;
  return [head[0]+.1+f*cy*cp-s*sy+z*cy*sp, head[1]+f*sy*cp+s*cy+z*sy*sp, head[2]-.6-f*sp+z*cp];
}
/** A cigarette between two fingers: its filter end lies this far from the hand (hand frame, side +1), and its axis towards the ember at rest and at the lips. */
const CIG_GRIP=[.2,-.6,.1], CIG_REST=[.5,.1,.86], CIG_LIPS=[.93,.28,.2];
/** @param {number} t */
export function lonerAt(t){
  const S=stepAt(LONE,t), u=S.u, P=LONER, k=Math.floor(t/260), v=ease(frac(t/260)/.35);
  const g0=GAZE[Math.floor(rnd(k,61)*GAZE.length)], g1=GAZE[Math.floor(rnd(k+1,61)*GAZE.length)];
  const rest=[1.9,2.85,8.7];
  /** @type {any} */ const o={side:-.16,sway:-.55+.12*Math.sin(t/520),lean:.02,yaw:lerp(g0[0],g1[0],v),pitch:lerp(g0[1],g1[1],v),
    feet:{[-1]:[-.4,-.7,.9],[1]:[1.2,2.5,.9]},hands:{[1]:rest,[-1]:[1.5,-1.4,7.8]}};
  // a drag: the head turns to the quay and tips a little, the hand brings the filter to the lips, holds, and lowers
  const up=S.s==='SIP'?ease(u/.28)*(1-ease((u-.75)/.25)):0;
  if(S.s==='SIP'){ o.pitch=lerp(o.pitch,-.1,up); o.yaw=lerp(o.yaw,.1,up); o.sway=lerp(o.sway,0,up); o.lean=lerp(o.lean,.1,up); }
  else if(S.s==='WIPE'){ const w=bump(u,.5,.45), x=lerp(-1.6,1.4,clamp01((u-.25)/.5)); o.hands[-1]=lerp3(o.hands[-1],[2.3,x,13.4],w); o.pitch=lerp(o.pitch,.1,w); o.yaw=lerp(o.yaw,.15,w); }
  const mouth=mouthOf(body(o).head,o.yaw,o.pitch);
  o.hands[1]=lerp3(rest,sub(mouth,CIG_GRIP),up);
  const pose=body(o), axis=lerp3(CIG_REST,CIG_LIPS,up), hand=handWorld(P,pose,1);
  const drag=ease(clamp01((up-.6)/.4));
  return {P,pose,state:S.s,u,drag,exhale:S.s==='SIP'&&u>.55&&u<.9,mouth:toWorld(P,mouth),
    cig:{state:'HELD_BY_NPC',bottom:nudge(P,hand,CIG_GRIP),up:dirWorld(P,mul(axis,1/len(axis)))}};
}

/** The street musician plays a concertina by the corner, tapping his foot to a tune; between tunes he lowers it, closed, and looks round. */
const MA=ANCHORS.pub_musician;
export const MUSICIAN=frameAt(MA.i,MA.j,MA.a);
const MUS=loop([['PLAY',860],['REST',170],['PLAY',690],['REST',230],['PLAY',1010],['REST',140]]);
/** @param {number} t */
export function musicianAt(t){
  const S=stepAt(MUS,t), P=MUSICIAN, edge=Math.min(S.local,S.d-S.local), play=S.s==='PLAY'?ease(edge/45):0, beat=2*Math.PI*t/42, phrase=2*Math.PI*t/(84+10*Math.sin(S.n+S.k));
  const air=play*clamp01(.5+.32*Math.sin(phrase)+.18*Math.sin(phrase*2+S.k)), pump=.06+.94*air, stamp=play*Math.pow(Math.max(0,Math.sin(beat)),3);
  const h=lerp3([1.5,0,7.9],[3.0,0,9.1+.25*play*Math.sin(beat)],play), hand=(/** @type {number} */ s)=>[h[0],s*(1.25+1.5*pump),h[2]];
  const look=S.s==='REST'?GAZE[(S.k+S.n)%GAZE.length]:[.35+.15*Math.sin(t/300),.12];
  /** @type {any} */ const o={sway:.22*play*Math.sin(phrase/2),lean:.04+.05*play,yaw:look[0],pitch:look[1]+.07*play*Math.sin(beat),
    feet:{[-1]:[-.2,-1.5,.9],[1]:[1.2,1.6,.9+1.4*stamp]},hands:{[-1]:hand(-1),[1]:hand(1)},elbow:{[-1]:[-.9,-.9,-.6],[1]:[-.9,.9,-.6]}};
  const pose=body(o);
  return {P,pose,state:S.s,u:S.u,gap:pump,box:[handWorld(P,pose,-1),handWorld(P,pose,1)]};
}

/** The landlord by his door: takes a tankard from his barrel, rubs it dry, holds it to the light and sets it down on the free spot.
 * Four spots, three tankards: each goes back to the empty one, so the set slowly moves round. */
export const KEEPER=placeFor(T2,ANCHORS.pub_keeper_angle,4.6,-1.0);
export const KEEPER_SPOTS=[[-.17,-.15],[.17,-.15],[.17,.15],[-.17,.15]].map(([di,dj])=>[T2[0]+di,T2[1]+dj,TABLE.h]);
const KEEP=(()=>{ const e0=3, list=[]; let e=e0, r=0;
  while(!(r>=6&&e===e0)){
    const from=r>=5&&e!==e0?e0:(e+1+Math.floor(rnd(r,31)*3))%4;
    for(const [s,d] of [['LOOK',360+Math.round(rnd(r,32)*300)],['TAKE',90],['WIPE',260+Math.round(rnd(r,33)*130)],['HOLD_UP',70],['PLACE',90]]) list.push([s,d,{empty:e,from}]);
    if(rnd(r,34)<.45) list.push(['WIPE_TABLE',210,{empty:from,from}]);
    e=from; r++; }
  return loop(list); })();
/** @param {number} t */
export function keeperAt(t){
  const S=stepAt(KEEP,t), u=S.u, P=KEEPER, guests=[(DRINKER_A.i+DRINKER_B.i)/2,(DRINKER_A.j+DRINKER_B.j)/2];
  const rest=[1.6,-2.7,8.5], cloth=[.9,3.1,8.0], chest=[2.9,-.9,10.6], eye=[2.7,-.7,14.4];
  /** @type {any} */ const o={hands:{[-1]:rest,[1]:cloth},lean:.08,yaw:yawTo(P,guests)*.85,pitch:.08,sway:.12*Math.sin(t/470+2)};
  const grip=(/** @type {number} */ n)=>gripOnTable(P,KEEPER_SPOTS[n],-1,'mug');
  let tilt=0, held=false, touching='';
  if(S.s==='TAKE'){ o.hands[-1]=u<.5?lerp3(rest,grip(S.from),ease(u/.5)):lerp3(grip(S.from),chest,ease((u-.5)/.5)); held=u>=.5;
    o.lean=.08+.2*bump(u,.5,.5); o.yaw=lerp(o.yaw,0,bump(u,.5,.5)); o.pitch=.35; touching=u<.6?'table':''; }
  else if(S.s==='WIPE'){ const q=S.local*2*Math.PI/38, top=add(chest,[.2,.6,1.35]), round=add(top,[.35*Math.cos(q),.35*Math.sin(q),.15*Math.sin(q*2)]);
    o.hands[-1]=chest; o.hands[1]=lerp3(cloth,round,ease(u/.1)*(1-ease((u-.9)/.1))); held=true; tilt=.45*ease(u/.1); o.pitch=.42; o.yaw=.1*Math.sin(S.local*.01); }
  else if(S.s==='HOLD_UP'){ const up=bump(u,.5,.5); o.hands[-1]=lerp3(chest,eye,up); o.pitch=lerp(.4,-.15,up); o.yaw=0; held=true; tilt=.45*(1-ease(u/.3))*(1-up)+.0; }
  else if(S.s==='PLACE'){ o.hands[-1]=u<.55?lerp3(chest,grip(S.empty),ease(u/.55)):lerp3(grip(S.empty),rest,ease((u-.55)/.45)); held=u<.55;
    o.lean=.08+.2*bump(u,.55,.45); o.pitch=.35; touching=u>.4?'table':''; }
  else if(S.s==='WIPE_TABLE'){ const top=add(toLocal(P,[T2[0],T2[1],TABLE.h]),[-.6,.4,.6]), q=S.local*2*Math.PI/46, w=ease(bump(u,.5,.48)*2);
    o.hands[1]=lerp3(cloth,add(top,[1.0*Math.cos(q),1.2*Math.sin(q),0]),w); o.lean=.08+.32*w; o.pitch=.5*w; o.yaw=lerp(o.yaw,0,w); touching=w>.2?'table':''; }
  else o.pitch=.08+.05*Math.sin(S.local*.02);
  const pose=body(o);
  // a tankard is on each spot but the empty one and the one in his hand
  const placed=S.s==='PLACE'&&u>=.55, taken=held||placed;
  const onTable=[0,1,2,3].filter(n=>S.s==='WIPE_TABLE'?n!==S.empty:!((n===S.empty&&!placed)||(n===S.from&&taken)));
  return {P,pose,state:S.s,u,touching,mugs:onTable.map(n=>KEEPER_SPOTS[n]),
    held:held?{state:'HELD_BY_NPC',...heldVessel(P,handWorld(P,pose,-1),-1,'mug',tilt)}:null,
    cloth:{at:handWorld(P,pose,1),wiping:S.s==='WIPE'||S.s==='WIPE_TABLE'}};
}

/* ------------------------------------------------------------------ the timber yard */
/** Boards: raw deals as they come out of the store, and the sawn lengths. Length and width in tiles, thickness in units. */
export const PLANK={raw:{len:2.4,w:.26,th:.7,cut:false},cut:{len:2.05,w:.26,th:.6,cut:true}};
const WB=ANCHORS.timber_workbench;
/** The bench: two trestles, the deal laid along i; it is cut to length just past the right trestle, over the offcut bin. */
export const BENCH={top:5.4,i0:WB.i0,j:WB.j,cut:WB.i0+PLANK.cut.len,trestles:[WB.i0+.45,WB.i0+1.75]};
export const BIN={i:BENCH.cut+.15,j:BENCH.j,w:.5,d:.56,h:2.6};
/** The saw rests against the right trestle, handle up. */
export const SAW_REST={i:BENCH.trestles[1]+.05,j:BENCH.j-.36,z:5.0,dir:[0,.18,-1]};
export const SAW={blade:6.2};
export const RAW_STACK=ANCHORS.timber_raw_stack, CUT_STACK=ANCHORS.timber_finished_stack;
/** Boards on the stacks at the start of a loop; the stack levels stay within one board of these. */
export const RAW0=7, CUT0=8;
/** Bearers lift the stacks off the wet setts. */
export const STACK_BASE=1.3;
/** A slot in a stack: two boards to a layer; slot `moving` (the one that comes and goes) is on the side the men reach from.
 * @param {any} st @param {any} kind @param {number} n */
export function slotOf(st,kind,n){
  const m=st===RAW_STACK?moving().raw:moving().cut, near=((m-n)%2+2)%2===0, along=st.along==='i';
  const c=near?.13:.41;
  return along?{i:(st.i0+st.i1)/2,j:st.j0+c,z:STACK_BASE+Math.floor(n/2)*kind.th,dir:[1,0,0],kind}
    :{i:st.i0+c,j:(st.j0+st.j1)/2,z:STACK_BASE+Math.floor(n/2)*kind.th,dir:[0,1,0],kind};
}
/** The slot of each stack that comes and goes (its lowest level over a loop); it is laid on the side the men reach from. */
let MOVING=/** @type {{raw:number,cut:number}|null} */(null);
const moving=()=>MOVING||(MOVING=(()=>{ let raw=99, cut=99; for(let t=0;t<YARD_T;t++){ const L=levels(t); raw=Math.min(raw,L.raw); cut=Math.min(cut,L.cut); } return {raw,cut}; })());
/** Where the men stand to work: the woodworker behind the bench facing +j, beside the raw stack facing +i, behind the sawn stack facing +j; the store door. */
export const SPOT={bench:[BENCH.cut-.35,BENCH.j-.62],raw:[RAW_STACK.i0-.47,(RAW_STACK.j0+RAW_STACK.j1)/2],cut:[(CUT_STACK.i0+CUT_STACK.i1)/2,CUT_STACK.j0-.5],
  door:ANCHORS.timber_loading_spot,inside:[ANCHORS.timber_loading_spot[0],ANCHORS.timber_loading_spot[1]-1.15]};
const CORNER=[SPOT.raw[0]+.08,BENCH.j-.38];
/** Walking pace (tiles a tick), unloaded and with a board. */
const PACE={empty:.0135,loaded:.0105};
const P_RAW=[SPOT.bench,SPOT.raw], P_FIN=[SPOT.bench,CORNER,SPOT.cut];
/** The woodworker: fetches a deal from the raw stack, saws it to length on the trestles, stacks the sawn board, comes back. */
const WOOD=loop([
  ['GO_TO_RAW_STACK',Math.round(pathLen(P_RAW)/PACE.empty)+40],['PICK_UP_PLANK',120],['WALK_TO_BENCH',Math.round(pathLen(P_RAW)/PACE.loaded)+50],['PLACE_ON_BENCH',90],
  ['SAW',500],['INSPECT',190],['PICK_UP_FINISHED',130],['WALK_TO_FINISHED_STACK',Math.round(pathLen(P_FIN)/PACE.loaded)+40],['PLACE_ON_STACK',100],
  ['RETURN',Math.round(pathLen(P_FIN)/PACE.empty)+60]]);
export const YARD_T=WOOD.T;
/** The handler takes sawn boards into the timber store and brings raw deals out to the raw stack, keeping step with the woodworker. */
const H_TO_RAW=[SPOT.door,SPOT.raw], H_TO_CUT=[SPOT.raw,CORNER,SPOT.cut], H_TO_DOOR=[SPOT.cut,CORNER,SPOT.door];
const HANDLER=(()=>{ const list=[['EMERGE',90],['CARRY_TO_RAW',Math.round(pathLen(H_TO_RAW)/PACE.loaded)+30],['PLACE_ON_RAW',110],['TIDY_RAW',60],
  ['WALK_TO_FINISHED',Math.round(pathLen(H_TO_CUT)/PACE.empty)+30],['TIDY_FINISHED',110],['PICK_FINISHED',130],
  ['CARRY_TO_STORE',Math.round(pathLen(H_TO_DOOR)/PACE.loaded)+30],['ENTER',80]];
  const used=list.reduce((a,s)=>a+Number(s[1]),0); list.push(['INSIDE',YARD_T-used]); return loop(list); })();
/** The handler runs this far ahead in his loop: he brings his deal to the raw stack just after the woodworker starts sawing. */
const HANDLER_LAG=(()=>{ const saw=WOOD.steps[4].t0, carry=HANDLER.steps[1].t0; return ((carry-saw+10)%YARD_T+YARD_T)%YARD_T; })();
/** Share of a pick-up when the hands close on the board, and of a laying-down when they let go. */
const PICK_GRAB=.45, LAY_FREE=.62;
/** Hand targets on a board lying at pose B as seen from P: points ±g units either side of the middle, just above the top face.
 * @param {Frame} P @param {any} B @param {number} g @param {number} [mid] shift of the grip pair along the board (tiles) */
function gripsOn(P,B,g,mid=0){
  const d=B.dir, top=B.z+B.kind.th+.35, ci=B.i+d[0]*mid, cj=B.j+d[1]*mid;
  const a=toLocal(P,[ci-d[0]*g/UNIT,cj-d[1]*g/UNIT,top]), b=toLocal(P,[ci+d[0]*g/UNIT,cj+d[1]*g/UNIT,top]);
  return a[1]>b[1]?{[1]:a,[-1]:b}:{[1]:b,[-1]:a};
}
/** A board in two hands: it runs through both palms, its middle `off` tiles along it from between the hands. Pose in world.
 * @param {Frame} P @param {Pose} pose @param {any} kind @param {number} off */
function boardFromHands(P,pose,kind,off){
  const a=handWorld(P,pose,1), b=handWorld(P,pose,-1);
  let d=[b[0]-a[0],b[1]-a[1],(b[2]-a[2])/UNIT]; d=mul(d,1/(len(d)||1));
  return {i:(a[0]+b[0])/2+d[0]*off,j:(a[1]+b[1])/2+d[1]*off,z:(a[2]+b[2])/2-.35-kind.th+d[2]*off*UNIT,dir:d,kind};
}
/** A board carried under the arm on side c: it lies along that forearm, just below it, the hand gripping it near the front end.
 * @param {Frame} P @param {Pose} pose @param {any} kind @param {number} c */
function boardUnderArm(P,pose,kind,c){
  const L=limb(pose,c), h=toWorld(P,L.hd), e=toWorld(P,L.el);
  let d=[h[0]-e[0],h[1]-e[1],(h[2]-e[2])/UNIT*.35]; d=mul(d,1/(len(d)||1));
  const back=kind.len/2-.42;
  return {i:h[0]-d[0]*back,j:h[1]-d[1]*back,z:h[2]-.55-kind.th-d[2]*back*UNIT,dir:d,kind};
}
/** A held board between the two-hand and under-arm grips (w: 0..1), as the hands move from one to the other.
 * @param {Frame} P @param {Pose} pose @param {any} kind @param {number} w @param {number} c @param {number} [off] */
function boardHeld(P,pose,kind,w,c,off=0){
  if(w<=0) return boardFromHands(P,pose,kind,off);
  const B=boardUnderArm(P,pose,kind,c); if(w>=1) return B;
  const A=boardFromHands(P,pose,kind,off), sg=dot(A.dir,B.dir)<0?-1:1;
  let d=lerp3(A.dir,mul(B.dir,sg),w); d=mul(d,1/(len(d)||1));
  return {i:lerp(A.i,B.i,w),j:lerp(A.j,B.j,w),z:lerp(A.z,B.z,w),dir:d,kind};
}
/** Board resting on the bench: the whole deal, then the sawn length after the cut. */
export const BENCH_RAW={i:BENCH.i0+PLANK.raw.len/2,j:BENCH.j,z:BENCH.top,dir:[1,0,0],kind:PLANK.raw};
export const BENCH_CUT={i:BENCH.i0+PLANK.cut.len/2,j:BENCH.j,z:BENCH.top,dir:[1,0,0],kind:PLANK.cut};
/** Knees and back bend together to reach a board at height z; lower boards need more of both. @param {number} z */
const stoop=z=>{ const k=clamp01((6.5-z)/4.5); return {crouch:.3+.45*k,lean:.5+.55*k}; };
/** Carrying in front with both hands (the board across the body), or under one arm along the side, the forearm along the board
 * and the hand gripping it ahead (the other arm free). */
const FRONT={[1]:[3.4,2.25,8.7],[-1]:[3.4,-2.25,8.7]};
const SIDE=(/** @type {number} */ c)=>({[c]:[3.3,c*3.05,9.3],[-c]:[.5,-c*3.2,7.6]});
const ARM_POLE=(/** @type {number} */ c)=>({[c]:[-1,c*.35,-.35]});
/** @param {any} a @param {any} b @param {number} u */
const mixHands=(a,b,u)=>({[1]:lerp3(a[1],b[1],u),[-1]:lerp3(a[-1],b[-1],u)});
/** Pick a board up (u<PICK_GRAB: bend and reach, then lift to `to`) or lay one down (reverse), from P. */
function lift(/** @type {Frame} */ P,/** @type {any} */ B,/** @type {number} */ u,/** @type {any} */ from,/** @type {any} */ to,/** @type {boolean} */ laying){
  const st=stoop(B.z+B.kind.th), grips=gripsOn(P,B,2.2);
  const down=laying?ease(u/LAY_FREE):ease(u/PICK_GRAB), up=laying?ease((u-LAY_FREE-.06)/(1-LAY_FREE-.06)):ease((u-PICK_GRAB-.08)/(1-PICK_GRAB-.08));
  const bend=down*(1-up);
  return body({crouch:st.crouch*bend,lean:.08+(st.lean-.08)*bend,pitch:.15+.5*bend,
    hands:(laying?u<LAY_FREE:u<PICK_GRAB)?mixHands(from,grips,down):mixHands(grips,to,up)});
}
/**
 * Woodworker, handler and foreman with the boards between them at tick t.
 * Board states: ON_STACK, HELD_BY_NPC, ON_BENCH, IN_STORE (out of sight inside the timber store).
 * @param {number} t
 */
export function yardAt(t){
  const L=levels(t), wood=woodworker(L.W,L.raw+(L.wPicked?1:0),L.cut-(L.wLaid?1:0)), hand=handler(L.H,L.raw-(L.hPlaced?1:0),L.cut+(L.hPicked?1:0));
  return {wood,hand,fore:foreman(L.W,t,wood),raw:L.raw,cut:L.cut,T:YARD_T};
}
/** Stack levels at tick t: every pick has its laying-down partner, so the levels follow the boards taken and laid so far. @param {number} t */
function levels(t){
  const W=stepAt(WOOD,t), H=stepAt(HANDLER,t+HANDLER_LAG);
  const wPicked=W.k>1||(W.k===1&&W.u>=PICK_GRAB), wLaid=W.k>8||(W.k===8&&W.u>=LAY_FREE);
  // the handler's PICK_FINISHED lifts the board at 72% of its own bending, see handler()
  const hPlaced=H.k>2||(H.k===2&&H.u>=LAY_FREE), hPicked=H.k>6||(H.k===6&&Math.min(1,H.u/.72)>=PICK_GRAB);
  const ahead=Math.floor((t+HANDLER_LAG)/YARD_T)-Math.floor(t/YARD_T);
  return {W,H,wPicked,wLaid,hPlaced,hPicked,raw:RAW0-(wPicked?1:0)+(hPlaced?1:0)+ahead,cut:CUT0+(wLaid?1:0)-(hPicked?1:0)-ahead};
}
/** The woodworker. rawBefore/cutBefore: stack levels before his own pick and laying in this loop. */
function woodworker(/** @type {any} */ S,/** @type {number} */ rawBefore,/** @type {number} */ cutBefore){
  const u=S.u, bench=Math.PI/2, rawTop=slotOf(RAW_STACK,PLANK.raw,rawBefore-1), cutSlot=slotOf(CUT_STACK,PLANK.cut,cutBefore);
  let P=frameAt(SPOT.bench[0],SPOT.bench[1],bench), pose=/** @type {Pose|null} */(null), board=/** @type {any} */(null), boardState='NONE', walk=false;
  let saw=/** @type {any} */({state:'ON_REST'}), kerf=0, offcut=/** @type {any} */({state:'NONE'}), touching='';
  const benchHands=BENCH_STANCE.hands;
  if(S.s==='GO_TO_RAW_STACK'||S.s==='RETURN'){
    const back=S.s==='RETURN', w=walkStep(S,back?[...P_FIN].reverse():P_RAW,bench,back?bench:0,35);
    P=w.P; walk=w.walk; pose=walk?walkBody(w.g,{calm:w.calm}):body({pitch:.2}); offcut={state:back?'IN_BIN':'NONE'};
  } else if(S.s==='PICK_UP_PLANK'){
    P=frameAt(SPOT.raw[0],SPOT.raw[1],0); pose=lift(P,rawTop,u,REST_HANDS,FRONT,false); touching=u<PICK_GRAB+.12?'raw':'';
    if(u>=PICK_GRAB){ board=boardFromHands(P,pose,PLANK.raw,0); boardState='HELD_BY_NPC'; }
  } else if(S.s==='WALK_TO_BENCH'){
    // turns with the deal across his body: lifted along j at the stack, it lies along i when he faces the bench
    const w=walkStep(S,P_RAW.slice().reverse(),0,bench,50); P=w.P; walk=w.walk;
    pose=walk?walkBody(w.g,{hands:FRONT,calm:w.calm}):body({hands:FRONT,pitch:.3});
    board=boardFromHands(P,pose,PLANK.raw,0); boardState='HELD_BY_NPC';
  } else if(S.s==='PLACE_ON_BENCH'){
    // lowers the deal onto the trestles and slides it left through his hands to its place
    const grips=gripsOn(P,BENCH_RAW,2.2,P.i-BENCH_RAW.i), down=ease(u/LAY_FREE), off=(BENCH_RAW.i-P.i)*down;
    const lay={lean:.08+.38*down,crouch:.14*down,pitch:.55,hands:u<LAY_FREE?mixHands(FRONT,grips,down):grips};
    pose=body(u<LAY_FREE?lay:blendBody(lay,BENCH_STANCE,(u-LAY_FREE)/(1-LAY_FREE)));
    touching='bench';
    if(u<LAY_FREE){ board=boardFromHands(P,pose,PLANK.raw,off); boardState='HELD_BY_NPC'; } else { board=BENCH_RAW; boardState='ON_BENCH'; }
  } else if(S.s==='SAW'||S.s==='INSPECT'){
    ({pose,saw,kerf,offcut}=sawing(S,P)); touching='bench'; boardState='ON_BENCH';
    board=S.s==='SAW'&&u<SAW_END?BENCH_RAW:BENCH_CUT;
  } else if(S.s==='PICK_UP_FINISHED'){
    // lifts the sawn length (sliding it back to centre), then turns to face the stacks, shifting it to his side
    const grips=gripsOn(P,BENCH_CUT,2.2,P.i-BENCH_CUT.i), down=ease(u/PICK_GRAB), up=ease((u-PICK_GRAB)/.25), round=ease((u-.72)/.28);
    P=frameAt(P.i,P.j,turn(bench,0,round));
    const hands=u<PICK_GRAB?mixHands(benchHands,grips,down):mixHands(mixHands(grips,FRONT,up),SIDE(1),round), bend=Math.max(down*(1-up),0);
    pose=body({lean:lerp(.3,.46,down)*(1-up)+.08*up,crouch:lerp(.1,.14,down)*(1-up),pitch:.45+.1*bend-.35*round,hands,elbow:round>.5?ARM_POLE(1):undefined}); touching=u<PICK_GRAB+.1?'bench':'';
    if(u>=PICK_GRAB){ board=boardHeld(P,pose,PLANK.cut,round,1,(BENCH_CUT.i-SPOT.bench[0])*(1-up)); boardState='HELD_BY_NPC'; } else { board=BENCH_CUT; boardState='ON_BENCH'; }
    offcut={state:'IN_BIN'};
  } else if(S.s==='WALK_TO_FINISHED_STACK'){
    const w=walkStep(S,P_FIN,0,bench,40); P=w.P; walk=w.walk;
    const front=ease((S.local-(S.d-40))/40);
    pose=walk?walkBody(w.g,{hands:{[1]:SIDE(1)[1]},elbow:ARM_POLE(1),calm:w.calm}):body({hands:mixHands(SIDE(1),FRONT,front),pitch:.3,elbow:front<.5?ARM_POLE(1):undefined});
    board=boardHeld(P,pose,PLANK.cut,1-front,1); boardState='HELD_BY_NPC'; offcut={state:'IN_BIN'};
  } else if(S.s==='PLACE_ON_STACK'){
    P=frameAt(SPOT.cut[0],SPOT.cut[1],bench); pose=lift(P,cutSlot,u,FRONT,REST_HANDS,true); touching=u<LAY_FREE+.1?'cut':'';
    if(u<LAY_FREE){ board=boardFromHands(P,pose,PLANK.cut,0); boardState='HELD_BY_NPC'; }
    offcut={state:'IN_BIN'};
  }
  if(!pose) pose=body({});
  return {P,pose,state:S.s,u,walk,board,boardState,saw,kerf,offcut,touching,id:'woodworker'};
}
/** Share of SAW spent taking the saw from its rest, and where the last stroke goes through. */
const SAW_TAKE=.09, SAW_END=.9, STROKES=12;
/** Saw stroke direction in the woodworker's frame: forward and down through the board, in the plane of the cut. */
const STROKE=[.82,0,-.57];
/** The cut line's front at kerf progress k (world): across the board's width at the cut, on its top face. @param {number} k */
const kerfPoint=k=>[BENCH.cut,lerp(BENCH.j-PLANK.raw.w/2,BENCH.j+PLANK.raw.w/2,.04+.92*k),BENCH.top+PLANK.raw.th];
/** Saw handle placed `reach` units back up the stroke line from the cut front. @param {Frame} P @param {number} k @param {number} reach */
const sawHandle=(P,k,reach)=>nudge(P,kerfPoint(k),mul(STROKE,-reach));
/** Sawing and inspecting at the trestles: one hand holds the deal down, the other drives the saw along the cut's own plane. */
function sawing(/** @type {any} */ S,/** @type {Frame} */ P){
  const u=S.u, inSaw=S.s==='SAW', v=inSaw?clamp01((u-SAW_TAKE)/(SAW_END-SAW_TAKE)):1;
  // a breather halfway: the stroke clock stops with the saw drawn back, then carries on from the same stroke
  const B0=.46, B1=.54, act=(v<B0?v:v<B1?B0:v-(B1-B0))/(1-(B1-B0));
  const n=Math.min(STROKES-1,Math.floor(act*STROKES)), st=act*STROKES-n;
  const kerf=inSaw?clamp01((n+(st<.55?st/.55:1))/STROKES):1, push=st<.55?ease(st/.55):1-ease((st-.55)/.45);
  const reach=lerp(6.2,3.0,push);
  const restL=toLocal(P,[SAW_REST.i,SAW_REST.j,SAW_REST.z+1.0]), press=toLocal(P,[BENCH.cut-.62,BENCH.j-.06,BENCH.top+PLANK.raw.th+.35]);
  const lifted=add(toLocal(P,sawHandle(P,1,6.6)),[0,0,1.4]);
  let sawHand=toLocal(P,sawHandle(P,kerf,reach)), blade=STROKE, held=true;
  if(inSaw&&u<SAW_TAKE){ const take=SAW_TAKE*.55; held=u>=take;
    sawHand=u<take?lerp3([1.4,-3.0,8.2],restL,ease(u/take)):lerp3(restL,toLocal(P,sawHandle(P,0,6.2)),ease((u-take)/(SAW_TAKE-take)));
    blade=u<take?SAW_REST_L(P):lerp3(SAW_REST_L(P),STROKE,ease((u-take)/(SAW_TAKE-take))); }
  else if(inSaw&&u>=SAW_END) sawHand=lerp3(toLocal(P,sawHandle(P,1,reach)),lifted,ease((u-SAW_END)/(1-SAW_END)));
  // the sawing stance: bent over the work, saw foot back, head over the cut; it grows out of and back into the bench stance
  /** @type {any} */ let o={lean:.5+.05*push,crouch:.16,twist:-.06*push,sway:-.15,pitch:.62,yaw:-.15,
    feet:SAW_FEET,hands:{[1]:press,[-1]:sawHand},elbow:{[-1]:[-.6,-1,-.3]}};
  const rest=inSaw?bump(v,(B0+B1)/2,(B1-B0)/2):0; o.lean+=.1*rest; o.pitch+=.13*rest; o.yaw-=.25*rest;
  if(inSaw&&u<SAW_TAKE) o=blendBody({...BENCH_STANCE,hands:{[1]:BENCH_STANCE.hands[1],[-1]:sawHand}},o,u/SAW_TAKE);
  if(!inSaw){
    // puts the saw back, runs a thumb over the cut end, sights along the board, brushes the sawdust off
    const sight=bump(u,.55,.2), brush=bump(u,.8,.08), feel=bump(u,.36,.09);
    held=u<.2; blade=u<.2?lerp3(STROKE,SAW_REST_L(P),ease(u/.2)):STROKE;
    sawHand=u<.2?lerp3(lifted,restL,ease(u/.2)):lerp3(restL,BENCH_STANCE.hands[-1],ease((u-.2)/.1));
    if(feel>0) sawHand=lerp3(sawHand,toLocal(P,[BENCH.cut-.04,BENCH.j+.04,BENCH.top+PLANK.cut.th+.25]),feel);
    o.hands[1]=lerp3(press,toLocal(P,[BENCH.cut-.15-.8*clamp01((u-.72)/.16),BENCH.j,BENCH.top+PLANK.cut.th+.3]),Math.max(sight*.3,brush));
    o.lean=.5+.12*sight; o.pitch=.55; o.yaw=-.15+1.0*sight; o.crouch=.16+.08*sight; o.twist=.15*sight;
    o.hands[-1]=sawHand;
    o=blendBody(o,BENCH_STANCE,(u-.86)/.14);
  }
  const pose=body(o), hand=handWorld(P,pose,-1);
  const saw=held?{state:'HELD_BY_NPC',handle:hand,dir:dirWorld(P,blade)}:{state:'ON_REST'};
  // the offcut tips about the cut and drops into the bin as the last stroke goes through
  let offcut={state:'ON_BENCH',ang:0,drop:0};
  if(!inSaw||u>=SAW_END){ const tf=inSaw?(u-SAW_END)*S.d:(1-SAW_END)*WOOD.steps[4].d+S.local, ang=Math.min(1.3,.005*tf*tf), drop=tf>16?.035*(tf-16)*(tf-16):0;
    offcut=BENCH.top+PLANK.raw.th-drop>BIN.h-.3?{state:'FALLING',ang,drop}:{state:'IN_BIN',ang:0,drop:0}; }
  return {pose,saw,kerf,offcut};
}
/** Standing at the bench between jobs, and the sawing foot position. */
const BENCH_STANCE={lean:.3,crouch:.1,pitch:.45,yaw:0,twist:0,sway:0,feet:{[-1]:[-.2,-1.45,.9],[1]:[.3,1.45,.9]},hands:{[1]:[2.4,3.0,8.3],[-1]:[1.4,-3.0,8.2]}};
const SAW_FEET={[-1]:[-.9,-1.6,.9],[1]:[.5,1.6,.9]};
/** Two sets of body intentions mixed by share k (eased); feet that move are lifted a little on the way.
 * @param {any} a @param {any} b @param {number} k */
function blendBody(a,b,k){
  k=ease(k); const o={...b};
  for(const key of ['lean','crouch','pitch','yaw','twist','sway','back','side']) o[key]=lerp(a[key]||0,b[key]||0,k);
  for(const key of ['hands','feet']) if(a[key]||b[key]){ const A=a[key]||{}, B=b[key]||{}; o[key]={};
    for(const s of [-1,1]){ const p=A[s]||B[s], q=B[s]||A[s]; if(p&&q) o[key][s]=add(lerp3(p,q,k),key==='feet'&&len(sub(p,q))>.05?[0,0,1.1*Math.sin(Math.PI*k)]:[0,0,0]); } }
  return o;
}
/** The saw's resting direction in a frame. @param {Frame} P */
const SAW_REST_L=P=>{ const d=SAW_REST.dir, l=len(d); return [(d[0]*P.fi+d[1]*P.fj)/l,(-d[0]*P.fj+d[1]*P.fi)/l,d[2]/l]; };
/** The handler. rawBefore/cutBefore: stack levels before his own laying and pick in this loop. */
function handler(/** @type {any} */ S,/** @type {number} */ rawBefore,/** @type {number} */ cutBefore){
  const u=S.u, rawSlot=slotOf(RAW_STACK,PLANK.raw,rawBefore), cutTop=slotOf(CUT_STACK,PLANK.cut,cutBefore-1);
  let P=frameAt(SPOT.door[0],SPOT.door[1],Math.PI/2), pose=/** @type {Pose|null} */(null), board=/** @type {any} */(null), boardState='NONE', walk=false, dark=0, touching='';
  if(S.s==='EMERGE'||S.s==='ENTER'||S.s==='INSIDE'){
    // through the store's open door: the dark inside swallows him and the board he carries
    const inward=S.s!=='EMERGE', v=S.s==='INSIDE'?1:clamp01(S.local/(S.d-15)), a=[...SPOT.inside,0], b=[...SPOT.door,0], p=inward?lerp3(b,a,v):lerp3(a,b,v);
    P=frameAt(p[0],p[1],inward?-Math.PI/2:Math.PI/2); walk=S.s!=='INSIDE'&&v<1;
    const calm=Math.max(1-clamp01(S.local/20),clamp01((S.local-(S.d-35))/20));
    pose=walk?walkBody(v*1.15/.69,{hands:{[1]:SIDE(1)[1]},elbow:ARM_POLE(1),calm}):body({hands:SIDE(1),elbow:ARM_POLE(1)}); dark=clamp01((SPOT.door[1]-.15-p[1])/.8);
    if(S.s==='INSIDE'){ boardState='IN_STORE'; dark=1; }
    else { board=boardUnderArm(P,pose,S.s==='EMERGE'?PLANK.raw:PLANK.cut,1); boardState='HELD_BY_NPC'; }
  } else if(S.s==='CARRY_TO_RAW'||S.s==='WALK_TO_FINISHED'||S.s==='CARRY_TO_STORE'){
    const pts=S.s==='CARRY_TO_RAW'?H_TO_RAW:S.s==='WALK_TO_FINISHED'?H_TO_CUT:H_TO_DOOR;
    const a0=S.s==='CARRY_TO_RAW'?Math.PI/2:S.s==='WALK_TO_FINISHED'?0:heading(SPOT.cut,CORNER), a1=S.s==='CARRY_TO_STORE'?-Math.PI/2:S.s==='WALK_TO_FINISHED'?Math.PI/2:0;
    const w=walkStep(S,pts,a0,a1,25), loaded=S.s!=='WALK_TO_FINISHED'; P=w.P; walk=w.walk;
    const end=S.s==='CARRY_TO_RAW'?ease((S.local-(S.d-25))/25):0, hands=mixHands(SIDE(1),FRONT,end);
    pose=loaded?(walk?walkBody(w.g,{hands:{[1]:SIDE(1)[1]},elbow:ARM_POLE(1),calm:w.calm}):body({hands,elbow:end<.5?ARM_POLE(1):undefined})):(walk?walkBody(w.g,{calm:w.calm}):body({}));
    if(loaded){ board=boardHeld(P,pose,S.s==='CARRY_TO_RAW'?PLANK.raw:PLANK.cut,1-end,1); boardState='HELD_BY_NPC'; }
  } else if(S.s==='PLACE_ON_RAW'){
    P=frameAt(SPOT.raw[0],SPOT.raw[1],0); pose=lift(P,rawSlot,u,FRONT,REST_HANDS,true); touching=u<LAY_FREE+.1?'raw':'';
    if(u<LAY_FREE){ board=boardFromHands(P,pose,PLANK.raw,0); boardState='HELD_BY_NPC'; }
  } else if(S.s==='TIDY_RAW'||S.s==='TIDY_FINISHED'){
    // squares the stack: both palms push the top board's edge true, once or twice
    const rawSide=S.s==='TIDY_RAW', spot=rawSide?SPOT.raw:SPOT.cut, top=rawSide?slotOf(RAW_STACK,PLANK.raw,rawBefore):cutTop;
    P=frameAt(spot[0],spot[1],rawSide?0:Math.PI/2);
    const grips=gripsOn(P,top,2.6), w=ease(bump(u,.5,.48)*1.6), push=Math.sin(Math.PI*clamp01(frac(u*(rawSide?1:2))))*.45, st=stoop(top.z+top.kind.th);
    pose=body({lean:.08+(st.lean-.08)*w,crouch:st.crouch*w,pitch:.1+.55*w,yaw:-.2*Math.sin(u*6)*w,
      hands:mixHands(REST_HANDS,{[1]:add(grips[1],[push,0,.15]),[-1]:add(grips[-1],[push*.6,0,.15])},w)});
    touching=w>.3?(rawSide?'raw':'cut'):'';
  } else if(S.s==='PICK_FINISHED'){
    // lifts the top sawn board, then turns for the store with it along his side
    const round=ease((u-.72)/.28);
    P=frameAt(SPOT.cut[0],SPOT.cut[1],turn(Math.PI/2,heading(SPOT.cut,CORNER),round));
    const v=Math.min(1,u/.72);
    pose=round>0?body({hands:mixHands(FRONT,SIDE(1),round),pitch:.15,elbow:round>.5?ARM_POLE(1):undefined}):lift(P,cutTop,v,REST_HANDS,FRONT,false); touching=v<PICK_GRAB+.1?'cut':'';
    if(v>=PICK_GRAB){ board=boardHeld(P,pose,PLANK.cut,round,1); boardState='HELD_BY_NPC'; }
  }
  if(!pose) pose=body({});
  return {P,pose,state:S.s,u,walk,board,boardState,dark,touching,id:'handler'};
}
/** Heading from a to b in the i,j plane. @param {number[]} a @param {number[]} b */
const heading=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0]);
/** The foreman stands off the end of the bench with his book: watches the work, writes, checks each sawn length with a rule. */
const FM=ANCHORS.timber_foreman;
export const FOREMAN=frameAt(FM.i,FM.j,FM.a);
function foreman(/** @type {any} */ W,/** @type {number} */ t,/** @type {any} */ wood){
  const P=FOREMAN, book=[2.6,1.0,10.3], idle=[1.0,-3.1,7.9], pocket=[1.6,-1.4,9.6];
  /** @type {any} */ const o={hands:{[1]:book,[-1]:idle},yaw:yawTo(P,[wood.P.i,wood.P.j])*.9,pitch:.12,lean:.05,sway:.1*Math.sin(t/510)};
  let state='WATCH', rule=/** @type {any} */(null), pencil='IN_BOOK';
  if(W.s==='INSPECT'&&W.u>.15){
    // the folding rule comes out of his waistcoat pocket, is laid along the sawn length and goes back
    state='MEASURE'; const v=(W.u-.15)/.85, lay=ease(bump(v,.5,.4)*1.7), end=toLocal(P,[BENCH.i0+.05,BENCH.j+.02,BENCH.top+PLANK.cut.th+.3]);
    o.hands[-1]=v<.1?lerp3(idle,pocket,ease(v/.1)):v>.9?lerp3(pocket,idle,ease((v-.9)/.1)):lerp3(pocket,end,lay);
    o.lean=.05+.55*lay; o.crouch=.18*lay; o.pitch=.12+.5*lay; o.yaw=lerp(o.yaw,yawTo(P,[BENCH.i0+1,BENCH.j]),lay);
    rule=v>=.1&&v<=.9?{open:lay}:null;
  } else if(W.s==='GO_TO_RAW_STACK'||W.s==='PICK_UP_PLANK'||(W.s==='RETURN'&&W.u>.3)){
    // writes up the last length while the next deal is fetched
    state='WRITE'; const v=W.s==='RETURN'?(W.u-.3)/.7*.3:W.s==='GO_TO_RAW_STACK'?.3+W.u*.3:.6+W.u*.4, wr=ease(bump(v,.5,.48)*1.8), q=t*.5;
    o.hands[-1]=lerp3(idle,add(book,[.3+.25*Math.sin(q),-.6+.35*Math.sin(q*.37),.35]),wr); o.pitch=lerp(.12,.62,wr); o.yaw=lerp(o.yaw,.05,wr);
    pencil=wr>.5?'HELD_BY_NPC':'IN_BOOK';
  }
  const pose=body(o);
  return {P,pose,state,book:{at:handWorld(P,pose,1)},pencil:{state:pencil,at:handWorld(P,pose,-1)},rule:rule?{...rule,at:handWorld(P,pose,-1)}:null,
    touching:state==='MEASURE'&&rule&&rule.open>.5?'bench':'',id:'foreman'};
}

/* ------------------------------------------------------------------ the life clock */
const clock={offset:0};
/** Life time at a game tick (plus a debug offset, used only to pin a routine's phase for review captures). @param {number} tick */
export const lifeTime=tick=>tick+clock.offset;
/** Debug only: shift the life clock. @param {number} v */
export function setLifeOffset(v){ clock.offset=v; }
/** The loops, for tests. */
export const LOOPS={FISH,CAT,TALK,LONE,KEEP,WOOD,HANDLER,HANDLER_LAG};
/** A life tick at which routine `who` is in `state` at progress u, or -1; nth picks a later occurrence in the loop.
 * @param {'fisher'|'cat'|'pub'|'loner'|'keeper'|'wood'|'handler'} who @param {string} state @param {number} [u] @param {number} [nth] */
export function phaseTime(who,state,u=.5,nth=0){
  const L=/** @type {any} */({fisher:FISH,cat:CAT,pub:TALK,loner:LONE,keeper:KEEP,wood:WOOD,handler:HANDLER})[who], hits=L?L.steps.filter(s=>s.s===state):[], S=hits[Math.min(nth,hits.length-1)];
  if(!S) return -1;
  const t=Math.round(S.t0+u*S.d);
  return who==='handler'?((t-HANDLER_LAG)%YARD_T+YARD_T)%YARD_T+YARD_T:t;
}
/** Everyone at life time t. @param {number} t */
export function portLife(t){ return {fisher:fisherAt(t),bucket:bucketAt(t),cat:catAt(t),catCrate:{i:CAT_CRATE.i,j:CAT_CRATE.j,w:CAT_CRATE.w,d:CAT_CRATE.d,h:CAT_CRATE.h,z:DECK_Z},pub:drinkersAt(t),loner:lonerAt(t),keeper:keeperAt(t),musician:musicianAt(t),yard:yardAt(t)}; }

