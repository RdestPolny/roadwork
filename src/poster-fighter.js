// A fighter in the poster look, drawn on the joints the game has already solved (see poster-fight.js).
// Figure units: x forward, y down; the torso stands on the hip centre, the shoulders at y≈-104, the head on its own frame.
import { C, REG, ink, rng, lerp, rad, part, blob, limb, axis, PROF, inLocal, box, line, curve, musc, castShadow, toWorld, P, hatch } from './poster-ink.js';

const TORSO={
  lean:[[-22,-6],[-26,-36],[-26,-70],[-24,-98],[-15,-113],[-4,-121],[9,-120],[19,-112],[30,-100],[34,-84],[29,-68],[26,-46],[23,-20],[20,-4],[0,0]],
  heavy:[[-24,-6],[-28,-36],[-28,-70],[-26,-98],[-16,-114],[-4,-122],[10,-121],[21,-112],[32,-100],[35,-84],[33,-66],[34,-44],[28,-18],[22,-4],[0,0]],
};
const HEAD={
  straight:[[-9,26],[-21,14],[-26,-2],[-21,-19],[-7,-28],[9,-27],[19,-18],[23,-9],[22,-4],[25,1],[32,10,1],[25,12],[26,16],[23,19],[26,24],[21,30],[8,29],[0,23]],
  broken:[[-9,26],[-22,14],[-27,-2],[-22,-20],[-8,-29],[9,-28],[20,-19],[25,-10],[23,-4],[27,1],[29,4],[34,11,1],[26,13],[27,17],[24,20],[27,26],[22,32],[8,31],[0,24]],
};
const HAIR={
  slick:[[19,-20],[10,-29],[-6,-32],[-21,-24],[-28,-6],[-25,9],[-17,17],[-13,7],[-11,-5],[-4,-13],[6,-16],[15,-15]],
  fringe:[[20,-12],[15,-23],[2,-31],[-12,-30],[-24,-19],[-28,-2],[-25,10],[-17,16],[-13,6],[-11,-6],[-2,-9],[8,-8],[16,-7]],
  long:[[19,-20],[10,-29],[-6,-32],[-22,-24],[-30,-6],[-31,14],[-28,34],[-18,38],[-15,20],[-12,4],[-6,-12],[6,-16],[15,-15]],
  big:[[19,-22],[8,-40],[-12,-43],[-30,-30],[-35,-8],[-29,10],[-17,15],[-12,1],[-4,-13],[8,-17]],
  fringeBack:[[-23,-9],[-28,3],[-24,15],[-17,18],[-19,5],[-20,-6]],
  crop:[[18,-17],[8,-28],[-8,-30],[-22,-21],[-27,-4],[-23,8],[-14,10],[-10,-4],[0,-12],[12,-14]],
};
const BURN=[[-3,-11],[2,-11],[3,9],[-2,10]];
const EAR={plain:[[-11,-6],[-4,-8],[-1,-1],[-3,8],[-9,9],[-12,2]], cauli:[[-12,-7],[-3,-9],[1,-2],[-1,4],[-4,10],[-11,10],[-15,1]]};
const FACIAL={
  mustache:[[[19,12],[27,12],[33,13],[37,9],[38,3,1],[40,9],[35,16],[27,17],[20,16]]],
  goatee:[[[19,13],[28,12],[31,17],[23,18]],[[18,22],[27,24],[28,32],[21,37],[15,30]]],
  beard:[[[19,13],[29,12],[33,18],[24,19]],[[-4,6],[2,16],[10,22],[22,22],[28,22],[30,30],[24,37],[10,35],[-2,27],[-8,14]]],
  fullbeard:[[[19,13],[29,12],[34,18],[31,23],[22,19]],[[-6,1],[0,12],[8,18],[20,19],[29,20],[32,29],[28,41],[16,49],[2,45],[-8,33],[-11,16]]],
};
const PELVIS=[[-25,-18],[23,-18],[27,6],[20,24],[-6,26],[-27,12]];
const TOWEL=[[-28,-24],[26,-26],[31,6],[28,32],[6,38],[-12,36],[-30,24]];
const FIST=[[-4,-8],[4,-10],[13,-11.5],[19,-10.5],[23.5,-7],[24.5,-1],[23.5,5],[20,10],[12,11.5],[3,10.5],[-4,7.5]];
const THUMB=[[2,-9],[10,-8.6],[16,-6.6],[18.6,-3.4],[16.4,-1.4],[10,-3],[3.5,-4]];
const BOOT=[[-9,-10],[8,-11],[11,-3],[26,0],[33,5],[33,11,1],[-10,12,1],[-12,2]];
const SLIPPER=[[-10,4],[6,2],[24,4],[33,8],[33,12,1],[-11,12,1]];
const FOOT=[[-8,-9],[6,-9],[10,-2],[22,2],[31,6],[32,10],[-9,11],[-11,2]];

/** Map the game's look and outfit to the poster's: hair, beard, nose, ear, build, clothes.
 * @param {any} lk game look (style, facial, nose, extra) @param {boolean} hero @param {boolean} bath */
export function posterLook(lk,hero,bath){
  const st=lk?.style||'short', fac=lk?.facial||'none';
  const hair=st==='bald'?'bald':st==='buzz'?'crop':st==='fringe'?'fringe':st==='long'?'long':(st==='afro'||st==='hightop')?'big':'slick';
  const broken=(lk?.nose&&lk.nose!=='straight')||lk?.extra==='scar';
  return {hair, facial:fac, nose:broken?'broken':'straight', ear:broken?'cauli':'plain', extra:lk?.extra||'none', build:hero?'lean':'heavy',
    skin:hero?C.flesh:broken?C.ruddy:C.pale, hi:hero?'#f5dcb9':broken?'#eec39d':'#f6e2c6',
    torso:bath||hero?'bare':'shirt', legs:bath?'towel':'trousers', feet:bath?'slipper':'boot',
    cloth:hero?C.drab:C.dark, clothDark:!hero, belt:hero?'rope':'strap', towel:hero?C.red:C.drabD, shirt:C.cream, hood:false};
}

/** Draw one fighter. F: {J joints, f facing, look, id, eye, mouth, claret, box screen bounds}. @param {any} F */
export function drawFigure(F){
  const J=F.J, L=F.look, f=F.f, k=ink.px, S=ink.S, R=rng(ink.boil*131+F.id*977+1);
  const jit=(/** @type {number[][]} */ pts,a=.55)=>pts.map(q=>[q[0]+(R()-.5)*2*a,q[1]+(R()-.5)*2*a,q[2]]);
  const jp=(/** @type {{x:number,y:number}} */ Q,a=.7)=>({x:Q.x+(R()-.5)*2*a*k,y:Q.y+(R()-.5)*2*a*k});
  const loc=(/** @type {number[][]} */ pts,/** @type {DOMMatrix} */ M,/** @type {number} */ a)=>toWorld(blob(jit(pts,a)),M);
  const skin=L.skin, hi=L.hi, cast=(/** @type {Path2D[]} */ ps,/** @type {number} */ d,/** @type {(Path2D|null|undefined)[]} */ on)=>{ if(!F.noCast) castShadow(ps,d,on); };
  /** Pieces already drawn that later ones throw shadows on. @type {Record<string,(Path2D|null|undefined)[]>} */ const got={arm:[],leg:[],near:[],body:[]};
  const blots=(/** @type {string} */ key,/** @type {Path2D} */ clip)=>{ const L2=F.marks?.[key]; if(!L2?.length) return; const ctx=ink.ctx, r=rng(key.length*7+F.id); ctx.save(); ctx.clip(clip);
    for(const m of L2){ const rr=(7+r()*5)*S; ctx.save(); ctx.translate(REG.x*k,REG.y*k); ctx.fillStyle=m.dark?'#6e1a12':C.red; ctx.beginPath(); ctx.ellipse(m.x,m.y,rr,rr*.75,r()*3,0,7); ctx.fill(); ctx.restore();
      ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(m.x+(r()-.5)*rr,m.y+(r()-.5)*rr,rr*.18,0,7); ctx.fill(); }
    ctx.restore(); };
  const bendOf=(/** @type {any} */ a1,/** @type {any} */ a2)=>Math.acos(Math.max(-1,Math.min(1,a1.ux*a2.ux+a1.uy*a2.uy)));
  const crease=(/** @type {{x:number,y:number}} */ E,/** @type {any} */ a1,/** @type {any} */ a2,/** @type {number} */ r,/** @type {string} */ c,/** @type {boolean} */ bone)=>{   // folds in the crook of a joint, the bone point outside
    const bx=a2.ux-a1.ux, by=a2.uy-a1.uy, bl=Math.hypot(bx,by)||1, ix=bx/bl, iy=by/bl;
    line([[E.x+ix*r*.25,E.y+iy*r*.25],[E.x+ix*r*.65+iy*2*k,E.y+iy*r*.65-ix*2*k],[E.x+ix*r*1.05,E.y+iy*r*1.05]],1.1*k,c);
    line([[E.x+ix*r*.5-iy*3*k,E.y+iy*r*.5+ix*3*k],[E.x+ix*r*.85-iy*4*k,E.y+iy*r*.85+ix*4*k]],.7*k,c);
    if(bone){ const oa=Math.atan2(-iy,-ix), ctx=ink.ctx; ctx.beginPath(); ctx.arc(E.x-ix*r*.35,E.y-iy*r*.35,r*.5,oa-.7,oa+.7); ctx.lineWidth=.9*k; ctx.strokeStyle=c; ctx.stroke(); }
  };

  const arm=(/** @type {any} */ sh,/** @type {any} */ el,/** @type {any} */ wr,/** @type {any} */ fi,/** @type {boolean} */ far,/** @type {Path2D|null} */ torso)=>{
    const side=far?'F':'N';
    const o=far?{d1:19,d2:9,rl:2}:{d1:14,d2:6}, h=far?null:hi;
    const S0=jp(sh), E0=jp(el), W0=jp(wr), a1=axis(S0,E0,0), a2=axis(E0,W0,0), bend=bendOf(a1,a2);
    const u=limb(S0,E0,PROF.upper,f,1+.22*bend/Math.PI), fo=limb(E0,W0,PROF.fore,f), fp=loc(FIST,fi.M,.4);
    const shirt=L.torso==='shirt', sl=shirt?limb(S0,{x:lerp(S0.x,E0.x,.86),y:lerp(S0.y,E0.y,.86)},PROF.sleeve,f):null;
    if(!far) cast([(sl||u).path,fo.path,fp],9,got.body); else got.arm=[(sl||u).path,fo.path];
    const ball=new Path2D(); ball.arc(S0.x,S0.y,20*S,0,7);
    if(sl){   // the convict's shirt sleeve, rolled up above the elbow
      part(sl.path,sl.b,L.shirt,{...o,lm:sl,cut:torso?[[torso,ball]]:[],inside:()=>{
        curve(sl,[[.84,-1.05],[.87,0],[.84,1.05]],2.2); curve(sl,[[.74,-1.05],[.76,0],[.74,1.05]],1);
        curve(sl,[[.15,-.6],[.35,-.1],[.55,-.4]],.8); curve(sl,[[.3,.7],[.5,.3],[.62,.6]],.8); blots('sleeve'+side,sl.path);
      }});
    } else part(u.path,u.b,skin,{...o,hi:h,lm:u,cut:torso?[[torso,ball]]:[],inside:()=>{
      musc(u,[[.17,-1.1],[.33,-.55],[.44,-.04],[.36,.48],[.19,1.1],[.27,1.1],[.43,.48],[.51,-.04],[.4,-.55],[.24,-1.1]],3);   // under the deltoid
      musc(u,[[.6,-1.1],[.7,-.58],[.84,-.34],[.97,-.48],[.99,-1.1]]);                                  // biceps into its tendon
      musc(u,[[.47,1.1],[.56,.58],[.7,.4],[.85,.5],[.92,1.1],[.84,.78],[.7,.66],[.58,.8]],3.4);        // triceps horseshoe
      musc(u,[[.36,.02],[.6,.12],[.86,.1],[.86,.26],[.6,.3],[.38,.16]],3.6,.7);                        // biceps / triceps groove
      curve(u,[[.17,-1],[.33,-.55],[.44,-.04]],1.3); curve(u,[[.44,-.04],[.36,.48],[.19,1]],1.3);
      curve(u,[[.3,-.78],[.52,-.5],[.78,-.62]],1.1); curve(u,[[.56,.58],[.7,.4],[.85,.5]],1.1);
      curve(u,[[.4,.72],[.55,.62],[.62,.8]],.8); curve(u,[[.38,.06],[.62,.16],[.86,.12]],.9);
    }});
    part(fo.path,fo.b,skin,{...o,hi:h,lm:fo,cut:[(sl||u).path],inside:()=>{
      musc(fo,[[.06,-.42],[.3,-.18],[.58,-.04],[.58,.1],[.3,-.02],[.08,-.22]],3.2);
      musc(fo,[[.14,1.1],[.28,.58],[.5,.52],[.66,1.1]],3.6,.8);
      curve(fo,[[.06,-.42],[.3,-.18],[.58,-.04]],.9); curve(fo,[[.78,-.35],[.88,-.32],[.97,-.3]],.6); curve(fo,[[.8,.2],[.9,.22],[.97,.2]],.6);
      if(bend>.45) crease(E0,a1,a2,10*S,C.ink,true);
    }});
    part(fp,box(fi.c,36*S),skin,{...o,hi:h,lw:4.2,cut:[fo.path],inside:()=>inLocal(fi.M,()=>{
      P.h2.setTransform(new DOMMatrix().rotateSelf(70)); ink.ctx.fillStyle=P.h2; ink.ctx.fill(blob([[1,6],[21,5],[21,9.5],[12,11.5],[2,10.5]]));
      for(const y of [-5.5,-.5,4.5]) line([[12.5,y],[18,y+.6],[23.6,y]],1.1);
      line([[18,-10],[17.4,0],[18.6,9.5]],.7);
      for(const x of [9,14,19]) line([[x-2.5,-10.6],[x,-12.2],[x+2.5,-10.8]],.9);
      line([[-2,4],[6,7],[14,8]],.7);
      if(F['knuckle'+side]){ ink.ctx.save(); ink.ctx.translate(REG.x/S,REG.y/S); line([[12,-11],[17,-11.5],[22,-8.5]],3,'#8a4a5a'); ink.ctx.restore(); line([[13,-11],[18,-10.5],[22,-8]],1.6,C.red); }
    })});
    part(loc(THUMB,fi.M,.3),box(fi.c,36*S),skin,{...o,hi:h,lw:2.6,d1:5,d2:2,inside:()=>inLocal(fi.M,()=>{ line([[14.2,-6.4],[17.4,-4.6]],.9); line([[8,-8],[9,-3.5]],.6); })});
  };

  const leg=(/** @type {any} */ hip,/** @type {any} */ kn,/** @type {any} */ an,/** @type {DOMMatrix} */ BM,/** @type {boolean} */ far,/** @type {Path2D|null} */ seat)=>{
    const side=far?'F':'N';
    const o=far?{d1:19,d2:9,rl:2}:{d1:15,d2:6}, H0=jp(hip), K0=jp(kn), A0=jp(an), a1=axis(H0,K0,0), a2=axis(K0,A0,0), bend=bendOf(a1,a2);
    const cloth=L.legs==='trousers';
    const th=limb(H0,K0,cloth?PROF.trouser:PROF.thigh,f), sh=limb(K0,A0,cloth?PROF.trouserLow:PROF.shin,f);
    const fp=loc(L.feet==='slipper'?SLIPPER:BOOT,BM,.4);
    if(!far){ cast([th.path,sh.path,fp],7,got.leg); got.near=[th.path,sh.path]; } else got.leg=[th.path,sh.path];
    const foot=()=>part(fp,box(an,46*S),C.ink,{shade:false,lw:3.6,inside:()=>inLocal(BM,()=>{
      line([[-9,10],[33,9.5]],1.4,C.cream);
      if(L.feet==='boot'){ line([[0,-8],[7,-7],[10,-2]],1.1,C.cream); for(const x of [12,17,22]) line([[x,0],[x+1.5,3]],1,C.cream); }
      else line([[4,4],[18,5],[28,8]],1,C.cream);
    })});
    if(cloth){
      foot();
      const cc=L.clothDark?C.cream:C.ink;
      part(th.path,th.b,L.cloth,{...o,dark:L.clothDark,d1:L.clothDark?(far?6:10):o.d1,lm:th,cut:seat?[seat]:[],inside:()=>{
        curve(th,[[.08,.55],[.24,.1],[.42,.3]],.8,cc); curve(th,[[.5,-.7],[.66,-.25],[.78,-.45]],.8,cc); curve(th,[[.3,.9],[.48,.35],[.62,-.3]],.7,cc); curve(th,[[.05,-.3],[.5,-.1],[.95,-.2]],.6,cc); blots('thigh'+side,th.path);
      }});
      part(sh.path,sh.b,L.cloth,{...o,dark:L.clothDark,d1:L.clothDark?(far?6:9):o.d1*.8,lm:sh,cut:[th.path],inside:()=>{
        curve(sh,[[.15,.6],[.35,.2],[.5,.5]],.8,cc); curve(sh,[[.6,-.5],[.75,-.1],[.85,-.4]],.7,cc); curve(sh,[[.9,-1.05],[.92,0],[.9,1.05]],1.4,cc);
        if(bend>.25) crease(K0,a1,a2,14*S,cc,false); blots('shin'+side,sh.path);
      }});
    } else {
      part(sh.path,sh.b,skin,{...o,hi:far?null:hi,lm:sh,inside:()=>{   // kneecap, calf heads, shin bone
        musc(sh,[[.1,1.1],[.24,.45],[.42,.38],[.58,.6],[.62,1.1],[.5,.82],[.3,.7]],3.4); curve(sh,[[.1,.85],[.26,.42],[.44,.4]],.8);
        curve(sh,[[0,-.95],[.09,-1.05],[.16,-.7]],1); curve(sh,[[.25,-.5],[.5,-.55],[.8,-.45]],.6);
        const ctx=ink.ctx, q=sh.pt(.96,.05); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(q[0],q[1],1.3*k,0,7); ctx.fill(); }});
      part(th.path,th.b,skin,{...o,hi:far?null:hi,lm:th,cut:[sh.path],inside:()=>{   // quads: the teardrop over the knee, the long groove
        musc(th,[[.6,-1.1],[.74,-.62],[.88,-.5],[.96,-.85],[.96,-1.1]],3.2); curve(th,[[.3,-.3],[.6,-.45],[.86,-.55]],.8); curve(th,[[.5,.6],[.7,.45],[.9,.55]],.7);
        if(bend>.3) crease(K0,a1,a2,12*S,C.ink,false);
      }});
      foot();
    }
  };

  // ground shadow
  { const cx=(J.anF.x+J.anN.x)/2, rx=Math.abs(J.anF.x-J.anN.x)/2+50*S, gy=F.floorY;
    const sp=new Path2D(); sp.ellipse(cx-f*6*S,gy,rx,11*S,0,0,Math.PI*2);
    ink.ctx.save(); ink.ctx.clip(sp); hatch(P.h,8,{x:cx-rx-10,y:gy-20*S,w:rx*2+20,h:40*S}); ink.ctx.restore(); }

  arm(J.shF,J.elF,J.wrF,J.fF,true,null);
  leg(J.hipF,J.knF,J.anF,J.bootF,true,null);

  // torso: contour lines wrap round the ribcage; pecs and abs throw small shadows of their own
  const tp=loc(TORSO[L.build],J.MT,.5), tax={...axis(J.T(0,6),J.T(0,-124),40*S),curv:-4};
  cast([tp],7,[...got.arm,...got.leg]); got.body=[tp];
  if(L.torso==='shirt'){
    part(tp,box(J.T(0,-60),110*S),L.shirt,{d1:26,d2:9,lm:tax,inside:()=>{ inLocal(J.MT,()=>{
      ink.ctx.save(); const v=blob([[3,-121],[15,-118],[13,-106],[9,-94,1],[5,-106]]); ink.ctx.fillStyle=skin; ink.ctx.fill(v); ink.ctx.lineWidth=1.1; ink.ctx.strokeStyle=C.ink; ink.ctx.stroke(v); ink.ctx.restore();
      line([[9,-94],[11,-60],[13,-30]],.9); for(const y of [-84,-70,-56,-42]){ ink.ctx.beginPath(); ink.ctx.arc(12,y,1.4,0,7); ink.ctx.stroke(); }
      line([[-18,-104],[-6,-80],[-10,-50]],.8); line([[26,-96],[18,-72],[22,-44]],.8); line([[-20,-40],[-4,-30],[14,-26]],.7); line([[-12,-70],[4,-58],[20,-60]],.6);
    }); blots('torso',tp); }});
  } else part(tp,box(J.T(0,-60),110*S),skin,{d1:30,d2:10,hi,hiD:8,lm:tax,inside:()=>inLocal(J.MT,()=>{
    const ctx=ink.ctx; P.h2.setTransform(new DOMMatrix().rotateSelf(-40)); ctx.fillStyle=P.h2;
    ctx.fill(blob([[9,-77],[22,-67],[31,-70],[32,-63],[22,-60],[11,-70]]));
    for(const y of [-56,-44,-32]) ctx.fill(blob([[12,y],[18,y-2.5],[23,y-1],[22,y+3],[17,y+1.5],[13,y+3]]));
    ctx.fill(blob([[-22,-96],[-13,-86],[-18,-70],[-24,-80]]));
    line([[2,-110],[15,-107.5],[27,-102]],1); line([[4,-106],[6,-103],[9,-106]],.8);
    line([[2,-104],[16,-80],[31,-72]],1.1); line([[11,-76],[22,-66],[31,-69]],1.1);
    for(const y of [-56,-44,-32]) line([[12,y],[18,y-2.5],[23,y-1]],1);
    line([[18,-62],[16,-42],[17,-24]],.7); line([[15,-16],[18,-13],[21,-16]],.9);
    line([[-20,-100],[-12,-86],[-18,-72]],.8); ctx.fillStyle=C.ink; ctx.beginPath(); ctx.arc(27,-80,1.2,0,7); ctx.fill();
    for(const y of [-64,-58,-52]) line([[24,y],[28,y+3]],.8);
    if(F.claretChest) line([[24,-100],[25,-86],[24,-70]],2,C.red);
  })});

  // trousers' seat and belt, or the towel
  let seat=null;
  if(L.legs==='trousers'){
    seat=loc(PELVIS,J.MT,.5);
    const sp=seat; part(seat,box(J.T(0,4),70*S),L.cloth,{dark:L.clothDark,d1:L.clothDark?8:10,lm:{...axis(J.T(0,30),J.T(0,-20),30*S),curv:3},inside:()=>{ if(L.torso!=='shirt') blots('torso',sp); }});
    const bp=loc([[-26,-24],[24,-26],[25,-15],[-26,-13]],J.MT,.3); cast([bp],3,[tp,seat]); got.body=[tp,seat];
    if(L.belt==='rope'){ part(bp,box(J.T(0,-20),60*S),C.ochre,{spot:true,d1:5,d2:2,lw:3,inside:()=>inLocal(J.MT,()=>{ for(let x=-24;x<24;x+=4) line([[x,-24],[x+3,-14]],.8); })});
      const knot=J.T(20,-18); for(const e of [J.T(24,8),J.T(17,12)]){ const tl=limb(knot,e,{front:[[0,2.6],[1,2]],back:[[0,2.6],[1,2]]},f); part(tl.path,tl.b,C.ochre,{spot:true,d1:3,d2:0,lw:2.4}); } }
    else part(bp,box(J.T(0,-20),60*S),C.ink,{shade:false,lw:3,inside:()=>inLocal(J.MT,()=>{ ink.ctx.strokeStyle=C.cream; ink.ctx.lineWidth=1.4; ink.ctx.strokeRect(14,-24,7,9); line([[-22,-21],[12,-22]],.6,C.cream); })});
  }

  if(L.legs==='towel'){
    leg(J.hipN,J.knN,J.anN,J.bootN,false,null);
    const tw=loc(TOWEL,J.MT,.5); cast([tw],5,[tp,...got.leg,...got.near]); got.body=[tp,tw];
    part(tw,box(J.T(0,4),80*S),C.cream,{d1:12,d2:5,lm:{...axis(J.T(0,36),J.T(0,-26),34*S),curv:3},inside:()=>inLocal(J.MT,()=>{
      ink.ctx.save(); ink.ctx.translate(REG.x/S,REG.y/S); for(const y of [26,30]) line([[-28,y-2],[-4,y+5],[27,y]],y===26?2.6:1.2,L.towel); ink.ctx.restore();
      line([[14,-24],[16,0],[12,30]],.9); line([[18,-20],[22,4],[24,28]],.7); line([[-20,-18],[-14,6],[-18,26]],.7);
    })});
  } else leg(J.hipN,J.knN,J.anN,J.bootN,false,seat);

  // neck and head
  const nt=J.MH.transformPoint({x:-3,y:22});
  const nk=limb(jp(J.neckB),{x:nt.x,y:nt.y},PROF.neck,f);
  part(nk.path,nk.b,skin,{d1:9,d2:5,hi,lm:nk,cut:[tp],inside:()=>{
    musc(nk,[[.1,-.62],[.5,-.12],[.95,.32],[.95,.5],[.5,.04],[.1,-.4]],2.8,.9);
    curve(nk,[[.08,-.62],[.5,-.12],[.95,.32]],1); curve(nk,[[.42,-1.02],[.5,-1.14],[.6,-1.01]],.9); curve(nk,[[.05,.75],[.3,.72],[.62,.9]],.8);
  }});
  if(L.scarf) part(loc([[-14,-120],[16,-118],[18,-108],[10,-98],[14,-66],[5,-66],[2,-100],[-12,-110]],J.MT,.4),box(J.T(0,-100),50*S),C.red,{spot:true,d1:6,d2:3,lw:3});
  if(L.torso==='shirt'){ const col=loc([[-14,-118],[-2,-124],[12,-122],[18,-116],[8,-112],[-6,-112]],J.MT,.3); part(col,box(J.T(0,-118),40*S),L.shirt,{d1:4,d2:0,lw:3}); }
  const MH=J.MH, beard=L.facial==='beard'||L.facial==='fullbeard', fac=FACIAL[/** @type {keyof typeof FACIAL} */(L.facial)];
  cast([loc(HEAD[/** @type {'straight'|'broken'} */(L.nose)],MH,0)],8,[nk.path,tp]);
  if(L.hair==='bald') part(loc(HAIR.fringeBack,MH,.4),box(J.hc,50*S),C.ink,{shade:false,lw:3});
  if(L.hair==='long') part(loc(HAIR.long,MH,.4),box(J.hc,70*S),C.ink,{shade:false,lw:3.4});
  part(loc(HEAD[/** @type {'straight'|'broken'} */(L.nose)],MH,.45),box(J.hc,60*S),skin,{d1:9,d2:5,hi,hiD:3.5,inside:()=>inLocal(MH,()=>{
    line([[8,6],[14,11],[13,18]],.8);
    if(L.facial==='stubble'){ const r=rng(F.id*31+5); ink.ctx.fillStyle=C.ink; for(let i=0;i<70;i++){ const x=-4+r()*30, y=8+r()*22; if(y>x*.6+2-(x>20?20:0)) { ink.ctx.beginPath(); ink.ctx.arc(x,y,.45,0,7); ink.ctx.fill(); } } }
    if(L.extra==='scar') { line([[4,4],[10,9],[15,15]],1.6,C.cream); line([[4,5],[15,16]],.6); }
    if(L.extra==='cut') { ink.ctx.save(); ink.ctx.translate(REG.x/S,REG.y/S); line([[12,-13],[19,-11]],1.8,C.red); ink.ctx.restore(); }
    const W2=F.wounds; if(W2){ ink.ctx.save(); ink.ctx.translate(REG.x/S,REG.y/S);
      for(let i=0;i<Math.min(3,W2.cuts||0);i++) line([[11+i*3.4,-15+i*.6],[15+i*3.4,-11+i*.6]],2.4,C.red);
      if((W2.cuts||0)>=2) line([[19,-10],[19.5,-6],[19,-3]],1.4,C.red);
      if(W2.scars&&!W2.cuts) line([[14,-13],[18,-12]],1.2,'#6e1a12'); ink.ctx.restore(); }
    if(F.claret){ ink.ctx.save(); ink.ctx.translate(REG.x/S,REG.y/S); line([[25,13],[24,19],[25,24+Math.min(3,F.claret)*3]],2.2,C.red); ink.ctx.restore(); }
  })});
  if(L.hair!=='bald'&&L.hair!=='long'){
    if(L.hair==='crop'){ const hp=loc(HAIR.crop,MH,.3); ink.ctx.save(); ink.ctx.clip(hp); hatch(P.fine,55,box(J.hc,60*S)); ink.ctx.restore(); }
    else part(loc(HAIR[/** @type {'slick'|'fringe'|'big'} */(L.hair)],MH,.4),box(J.hc,70*S),C.ink,{shade:false,lw:3.4,inside:()=>inLocal(MH,()=>{
      line([[13,-22],[-2,-28],[-18,-18]],1,C.cream); line([[8,-19],[-6,-23],[-20,-10]],.8,C.cream); line([[-10,-18],[-22,-4],[-20,8]],.8,C.cream);
    })});
    if(L.hair==='slick'||L.hair==='fringe') part(loc(BURN,MH,.3),box(J.hc,60*S),C.ink,{shade:false,lw:2.4});
  } else if(L.hair==='bald') inLocal(MH,()=>line([[-12,-22],[-2,-27],[8,-25]],1.8,C.cream));
  part(loc(EAR[/** @type {'plain'|'cauli'} */(L.ear)],MH,.3),box(J.hc,60*S),skin,{d1:4,d2:2,lw:3,inside:()=>inLocal(MH,()=>line([[-8,-3],[-4,1],[-7,6]],.9))});
  if(fac){
    if(fac[1]) part(loc(fac[1],MH,.5),box(J.hc,70*S),C.ink,{shade:false,lw:3.4,inside:()=>inLocal(MH,()=>{
      for(const [x,y] of [[6,24],[16,30],[22,38],[10,38],[2,32],[-4,22]]) if(beard||y<34) line([[x,y],[x+3,y+4],[x+1,y+8]],.9,C.cream);
    })});
    part(loc(fac[0],MH,.3),box(J.hc,60*S),C.ink,{shade:false,lw:2.4});
  }
  if(L.hood) part(loc([[-27,28],[-31,-2],[-23,-27],[-4,-37],[16,-33],[30,-22,1],[29,-12],[33,6],[31,28]],MH,.4),box(J.hc,70*S),C.drab,{d1:8,d2:4,lw:3,inside:()=>inLocal(MH,()=>{
    ink.ctx.fillStyle=C.ink; ink.ctx.fillRect(13,-6,10,2.6); line([[-20,-10],[-6,-30],[14,-30]],.8); line([[-18,10],[-2,14],[20,12]],.8); })});
  if(L.extra==='tape') part(loc([[10,-15],[20,-14],[20,-9],[10,-10]],MH,.2),box(J.hc,60*S),C.cream,{shade:false,lw:2,inside:()=>inLocal(MH,()=>{ line([[12,-14],[18,-10]],.6); line([[12,-10],[18,-14]],.6); })});
  if(!L.hood) inLocal(MH,()=>{
    line([[11,-9],[17,-12],[24,-9]],beard?3.2:2.4);
    if(F.eye===2) line([[13,-2],[17,1],[21,-2]],1.8);
    else if(F.eye===1) line([[13,-2],[21,-3]],2);
    else { const ctx=ink.ctx; ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(18,-2.5,2.4,1.9,0,0,7); ctx.fill(); line([[13,-4],[18,-5],[22,-3]],1); }
    if(F.swollen){ ink.ctx.save(); ink.ctx.globalAlpha=.85; ink.ctx.fillStyle='#7a4a5a'; ink.ctx.beginPath(); ink.ctx.ellipse(18,-1,5,3.5,0,0,7); ink.ctx.fill(); ink.ctx.restore(); line([[13,-2],[21,-2]],1.6); }
    if(F.mouth){ const ctx=ink.ctx; ctx.fillStyle=C.ink; ctx.beginPath(); ctx.ellipse(23,21,2.6,2.2,0,0,7); ctx.fill(); }
  });

  arm(J.shN,J.elN,J.wrN,J.fN,false,tp);
}

/** Joints for a figure in a plain pose (a background man): forward kinematics from joint angles, feet on the floor.
 * Angles in degrees from straight down, positive toward where he faces; *1 upper, *2 lower segment.
 * @param {{x:number,fy:number,S:number,f:number,lean?:number,head?:number,fa1:number,fa2:number,na1:number,na2:number,fl1:number,fl2:number,nl1:number,nl2:number}} o */
export function poseJoints(o){
  const f=o.f, S=o.S, lean=o.lean||0, Pt=(/** @type {{x:number,y:number}} */ p,/** @type {number} */ ang,/** @type {number} */ len)=>({x:p.x+f*Math.sin(rad(ang))*len*S,y:p.y+Math.cos(rad(ang))*len*S});
  const build=(/** @type {number} */ hy)=>{ const H={x:o.x,y:hy}, MT=new DOMMatrix().translateSelf(H.x,H.y).rotateSelf(f*lean).scaleSelf(f*S,S);
    const T=(/** @type {number} */ x,/** @type {number} */ y)=>{ const q=MT.transformPoint({x,y}); return {x:q.x,y:q.y}; };
    const hipF=T(6,4), hipN=T(-6,6), knF=Pt(hipF,o.fl1,84), anF=Pt(knF,o.fl2,82), knN=Pt(hipN,o.nl1,84), anN=Pt(knN,o.nl2,82);
    return {H,MT,T,hipF,hipN,knF,anF,knN,anN}; };
  let b=build(0); b=build(o.fy-24*S-Math.max(b.anF.y,b.anN.y));
  const T=b.T, shF=T(8,-104), shN=T(-6,-102), elF=Pt(shF,o.fa1,60), wrF=Pt(elF,o.fa2,54), elN=Pt(shN,o.na1,60), wrN=Pt(elN,o.na2,54);
  const fist=(/** @type {{x:number,y:number}} */ el,/** @type {{x:number,y:number}} */ wr)=>{ const a=Math.atan2(wr.y-el.y,wr.x-el.x); return {wr,M:new DOMMatrix().translateSelf(wr.x,wr.y).rotateSelf(a*180/Math.PI).scaleSelf(S*1.1,f*S*1.1),c:{x:wr.x+Math.cos(a)*13.5*S,y:wr.y+Math.sin(a)*13.5*S}}; };
  const neckB=T(3,-110), ha=lean+(o.head||0), hc={x:neckB.x+(f*Math.sin(rad(ha))*40+f*Math.cos(rad(ha))*5)*S,y:neckB.y+(-Math.cos(rad(ha))*40+Math.sin(rad(ha))*5)*S};
  const boot=(/** @type {{x:number,y:number}} */ an)=>new DOMMatrix().translateSelf(an.x,an.y).scaleSelf(f*S,S).translateSelf(-2,13);
  const fF=fist(elF,wrF), fN=fist(elN,wrN);
  return {f,floorY:o.fy,J:{...b,shF,elF,wrF,fF,shN,elN,wrN,fN,bootF:boot(b.anF),bootN:boot(b.anN),neckB,hc,MH:new DOMMatrix().translateSelf(hc.x,hc.y).rotateSelf(f*ha).scaleSelf(f*S*1.08,S*1.08)}};
}
