import { setRamp, state as appearanceState, rgb, rampIndex } from './appearance.js';
import { state as sparringState } from './sparring.js';
import { state as boxingState, h2, drawText, solve, ik, torsoEdge, drawLeg, drawBoxer, drawParticles, drawPopups, popup, spawn, resetClock, predictApex, startMove, commitWalk, handleEvents, spawnSweat, setFlow } from './boxing.js';
import { state as rendererState, line, pset, taper } from './renderer.js';
import { skyBucket, goRoom } from './rooms.js';
import { state as audioState, tone, sfxWhoosh, sfxBreath, sfxLand, sfxBell, sfxSlowmo, sfxPunch, sfxKO, sfxMiss, initAudio } from './audio.js';
import { state as gymState } from './gym.js';
import { setInfo, inputNow, state as inputState } from './input.js';
import { state as animationState, samplePose, poseSampleTime, computeIdle } from './animation.js';
import { state as progressionState, persist } from './progression.js';
import { beginSession, sessionMetric, finishSession } from './training-session.js';
import { passiveFraction } from './stats.js';
import { simUI, simTime, simFormText } from './simulation.js';
import { leaveMode, setPanelMode, enterHub } from './navigation.js';
import { workNorma } from './prison-data.js';

// Runtime values owned by work; initialized explicitly by main.js.
export const state = {}; // belly side (v < 0): thin flank, then the belly and ribs sag out
function carcSide(A,u){ const f=Math.max(0,Math.min(0.9999,u))*11, i=f|0, t=f-i; return A[i]+(A[i+1]-A[i])*t; } function dimCol(c,k){ const r=c&255,g=(c>>8)&255,b=(c>>16)&255; return (0xff000000|(Math.min(255,b*k*0.8+3)<<16)|((g*k*0.87)<<8)|(r*k*0.9))>>>0; } function drawCarcassAt(px,py,a,dim,sc,dmg){
  sc=sc||1; const L=state.WK_L*sc, dx=Math.cos(a), dy=Math.sin(a), nx=-dy, ny=dx, ex=px+dx*L, ey=py+dy*L, m=7*sc;
  const x0=Math.max(0,Math.floor(Math.min(px,ex)-m)), x1=Math.min(appearanceState.W-1,Math.ceil(Math.max(px,ex)+m)), y0=Math.max(0,Math.floor(Math.min(py,ey)-m)), y1=Math.min(appearanceState.H-1,Math.ceil(Math.max(py,ey)+m));
  for(let pass=0;pass<2;pass++) for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
    if(state.carcClip&&state.carcClip(x,y)) continue;
    const rx=x-px, ry=y-py, u=(rx*dx+ry*dy)/L, v=(rx*nx+ry*ny)/sc, bw=carcSide(state.CARC_B,u), fw=carcSide(state.CARC_F,u), lw=2.1-Math.max(0,u-0.84)*3.4;
    if(pass===0){ if((u>=-1.2/L&&u<=1+1.2/L&&v<=bw+1&&v>=-fw-1)||(u>0.84&&u<=1.13+1.2/L&&Math.abs(v-state.CARC_LEG)<=lw+1)) rendererState.fb[y*appearanceState.W+x]=appearanceState.C_OUT; continue; }
    if(!(u>=0&&u<=1&&v<=bw&&v>=-fw)){
      if(u>0.84&&u<=1.13&&Math.abs(v-state.CARC_LEG)<=lw){                                              // the foreleg: shank + split trotter
        let c=Math.abs(v-state.CARC_LEG)>lw-0.9?state.CC.rindD:state.CC.rind; if(u>1.09&&Math.abs(v-state.CARC_LEG)<0.5) c=appearanceState.C_OUT;
        rendererState.fb[y*appearanceState.W+x]=dim?dimCol(c,dim):c; }
      continue; }
    const vn=v>=0?v/bw:v/fw; let c;
    if(u<0.1) c=(Math.abs(vn)<0.4&&u>0.025&&u<0.075)?appearanceState.C_OUT:(vn<-0.5?state.CC.rindD:state.CC.rind);        // trotter + the hole for the hook
    else if(vn<-0.7) c=vn<-0.88?state.CC.rindD:state.CC.rind;                                                   // rind
    else if(vn>0.62) c=vn>0.86?state.CC.fatD:state.CC.fat;                                                      // back fat
    else if(vn>0.42&&u>0.18&&u<0.96) c=state.CC.bone;                                                     // split spine
    else if(Math.hypot((u-0.26)*L,v+0.3)<1.25) c=state.CC.bone;                                            // the cut femur in the ham
    else if(vn<-0.2&&u>0.42&&u<0.92&&(((u*L)|0)%4===1)) c=state.CC.fat;                                    // streaky belly
    else if(u>0.95) c=state.CC.meatD;                                                                     // neck cut
    else if(u>0.45&&u<0.9&&(((u*L)|0)%3===0)&&vn>-0.45) c=state.CC.rib;                                   // ribs
    else { c=vn<-0.35?state.CC.meatD:(vn>0.2?state.CC.meatL:state.CC.meat); if(u<0.42&&((x*7+y*13)%11===0)) c=state.CC.meatL; }
    if(dmg>0&&u>0.12){ const hh=h2((u*L)|0,Math.round(v)+8), hc=h2(((u*L)|0)>>1,(Math.round(v)+8)>>1);
      if(dmg>0.55&&Math.abs(vn)>0.72&&hh<(dmg-0.55)*260) continue;              // chunks torn off the edges
      if(hc<dmg*60) c=hh<dmg*110?appearanceState.C_OUT:state.CC.meatD;                               // splits spreading through the meat
      else if(hh<dmg*50) c=sparringState.C_BLOOD; }
    rendererState.fb[y*appearanceState.W+x]=dim?dimCol(c,dim):c;
  }
} function cfgLocal(c,face){ return face>0?c:{x:appearanceState.W-1-c.x,y:c.y,a:Math.PI-c.a}; } function cfgPt(c,u,v){ const dx=Math.cos(c.a), dy=Math.sin(c.a); return [c.x+dx*u*state.WK_L-dy*v, c.y+dy*u*state.WK_L+dx*v]; } function cfgLerp(a,b,q,arc){ let d=b.a-a.a; while(d>Math.PI)d-=6.2832; while(d<-Math.PI)d+=6.2832; return {x:a.x+(b.x-a.x)*q, y:a.y+(b.y-a.y)*q-arc*Math.sin(Math.PI*q), a:a.a+d*q}; } // carried like a log over the near shoulder: the hock end sticks up in front (the right hand holds it there),
// the half lies across the top of the shoulder and down the back, behind the head; the sway only rocks it a little
function carryCfg(face){ const hl=face>0?state.WK.hip:appearanceState.W-1-state.WK.hip, th=face>0?state.WK.theta:0, la=Math.PI-0.36+th*0.1, lx=hl+13+th*0.8, ly=41.5-state.WK.bob;
  return face>0?{x:lx,y:ly,a:la}:{x:appearanceState.W-1-lx,y:ly,a:Math.PI-la}; } function floorCfg(side){ return side>0?{x:state.WK.hip+7,y:81,a:0}:{x:state.WK.hip-7,y:81,a:Math.PI}; } // hock end towards the boxer   // neck end towards the boxer
function eIO(x){ return 0.5-0.5*Math.cos(Math.PI*Math.max(0,Math.min(1,x))); }

/** Bake the cutaway Smithfield shambles and its cobbled loading yard. */
export function buildWorkBg(){
  rendererState.fb=state.bgWork;
  const brick=rgb('#362520'), mortar=rgb('#181e19'), lime=rgb('#4e5443'), flake=rgb('#30392d'), stone=rgb('#292e28'), joint=rgb('#151c18');
  for(let y=0;y<appearanceState.H;y++) for(let x=0;x<appearanceState.W;x++){
    let c;
    if(y<79){
      const row=(y/5)|0, seam=(x+(row&1)*6)%12===0||y%5===0;
      c=seam?mortar:((h2(x,y)%7===0)?rgb('#493128'):brick);
      if(y>=49){ const peeled=h2(x>>2,y>>2)<38||y>73; if(!peeled) c=seam?flake:((x*7+y*3)%19===0?rgb('#61644e'):lime); }
      // Damp trails bleed down the old limewash; soot gathers below the ceiling.
      if(y>43&&h2(x>>1,7)<45&&y>47+h2(x>>1,9)%18) c=h2(x,y)<120?rgb('#222b22'):flake;
      if(y<25&&h2(x>>2,y>>1)<95) c=rgb('#161b16');
      // Low brick vaults, darkened by soot; the ribs follow the ceiling curve.
      const u=(x-35)%52, arch=9+Math.round(9*(1-Math.sqrt(Math.max(0,1-((u-26)/26)**2))));
      if(y<arch) c=rgb('#0e1411');
      else if(y<arch+3) c=y===arch?mortar:rgb('#443129');
    } else {
      const row=((y-79)/5)|0, seam=y===79||(y-79)%5===0||(x+(row&1)*8)%17===0;
      c=seam?joint:(h2(x,y)<40?rgb('#393f32'):stone);
      if(y>81&&!seam&&h2(x,y)<22) c=rgb('#4d4733'); // sawdust on wet flagstones
    }
    pset(x,y,c);
  }
  // Old spray and long coagulated runs beneath the hanging carcasses.
  for(const [x,y,rx,ry] of [[54,62,7,9],[69,70,8,7],[106,64,10,9],[134,65,10,8]]){
    drawWorkBlood(x,y,rx,ry,false);
    for(let k=0;k<4;k++){ const dx=x-5+k*3,top=y-5+h2(k,x)%8; line(dx,top,dx,Math.min(78,top+5+h2(k,y)%12),rgb('#44151a'),rgb('#35191a')); }
  }
  for(let k=0;k<95;k++){
    const x=42+k*31%101,y=52+k*17%26;
    if(h2(x,y)<100){ pset(x,y,rgb('#542027')); if(k%4===0) pset(x,y+1,rgb('#37191c')); }
  }
  // Timber ceiling beams and wrought-iron rails, with darker meat behind the worker.
  for(let x=39;x<appearanceState.W;x++){ pset(x,12,rgb('#443224')); pset(x,13,rgb('#241d17')); pset(x,14,appearanceState.C_OUT); }
  for(const cx of [54,69,128,141]){ line(cx,15,cx,19,rgb('#65594a'),rgb('#37372f')); drawCarcassAt(cx,19,Math.PI/2+((cx*7)%5-2)*0.02,0.52,0.82); }
  // A painted wooden trade sign; there is no refrigerated room or electric fixture.
  for(let y=29;y<=39;y++) for(let x=77;x<=121;x++) pset(x,y,(y===29||y===39||x===77||x===121)?rgb('#141a16'):rgb('#302a20'));
  drawText('SMITHFIELD',99,32,rgb('#958268'),1);
  line(80,40,118,40,rgb('#27251f'),rgb('#27251f'));
  for(let x=92;x<appearanceState.W;x++){ pset(x,19,rgb('#82725b')); pset(x,20,rgb('#433e32')); pset(x,21,appearanceState.C_OUT); }
  for(const bx of [100,132]) line(bx,8,bx,18,rgb('#504c3f'),rgb('#2c2d26'));
  // An oak brine vat, recessed against the back wall.
  for(let y=66;y<=78;y++) for(let x=76;x<=89;x++){
    if((y===66||y===78)&&(x===76||x===89)) continue;
    const hoop=y===69||y===75;
    pset(x,y,(x===76||x===89||y===78)?appearanceState.C_OUT:hoop?rgb('#555348'):(x%3===0?rgb('#453425'):rgb('#705437')));
  }
  line(77,66,88,66,rgb('#9a8158'),rgb('#9a8158')); line(78,67,87,67,rgb('#393c31'),rgb('#393c31'));
  // Cleaver and wooden-handled bone saw, above a scarred chopping stump.
  line(135,53,135,58,rgb('#a18052'),rgb('#705334'));
  for(let y=59;y<=63;y++) for(let x=132;x<=137;x++) pset(x,y,x===132||y===63?rgb('#3c3d34'):rgb('#8e9080'));
  line(124,56,129,56,rgb('#8c826a'),rgb('#8c826a')); line(124,56,124,63,rgb('#655b48'),rgb('#655b48'));
  line(129,56,129,63,rgb('#785637'),rgb('#785637')); line(124,63,129,63,rgb('#b1aa91'),rgb('#55564a'));
  for(let y=75;y<=85;y++) for(let x=131;x<=142;x++) pset(x,y,(x===131||x===142||y===85)?appearanceState.C_OUT:(x%3===0?rgb('#463627'):rgb('#76593b')));
  for(let y=73;y<=76;y++) for(let x=130;x<=143;x++) pset(x,y,y===73?rgb('#a18a60'):((x+y)%4===0?rgb('#4c3025'):rgb('#785b3c')));
  drawWorkBlood(136,75,7,2,true); pset(134,61,rgb('#762026')); pset(135,62,rgb('#54181e'));
  // Broad dark pools, fresher smears and clots beneath the cast-iron gutter.
  for(const [x,y,rx,ry] of [[48,84,13,3],[67,87,14,3],[104,85,20,4],[130,86,12,3],[92,94,25,2]]) drawWorkBlood(x,y,rx,ry,true);
  for(let k=0;k<130;k++){ const x=40+(k*37)%104,y=79+(k*13)%17; if(h2(x,y)<135) pset(x,y,k%3===0?rgb('#7c1f27'):rgb('#49131b')); }
  for(let y=89;y<=92;y++) for(let x=49;x<appearanceState.W;x++) pset(x,y,y===89||y===92?rgb('#44352c'):(x%4===0?rgb('#61513c'):(h2(x,y)<105?rgb('#52131c'):rgb('#141c17'))));
  for(let x=52;x<appearanceState.W;x+=9){ pset(x,89,rgb('#85262e')); pset(x+1,90,rgb('#5a161f')); }
  const sky=rgb(['#101919','#343c33','#3e493f','#443c2e','#242f29'][skyBucket()]);
  for(let y=0;y<appearanceState.H;y++) for(let x=0;x<state.CUT_X;x++){
    let c=y<80?sky:rgb('#353832');
    // A smoky street bounded by brick warehouses and a barred yard gate.
    if(y>=18&&y<80){ const seam=y%5===0||(x+((y/5|0)&1)*5)%10===0; c=seam?rgb('#141d18'):rgb('#272f25'); }
    if(y>=26&&y<=37&&x>=20&&x<=29) c=x%3===0||y===26||y===37?rgb('#181e1d'):rgb('#354038');
    if(y>=43&&y<79&&x>=24) c=x%4===0||y===48?rgb('#242a25'):rgb('#353932');
    if(y>=80){ const seam=(y-80)%5===0||(x+((y/5|0)&1)*5)%10===0; c=seam?rgb('#212722'):(h2(x,y)<35?rgb('#3d4030'):rgb('#293329')); if(h2(x,y)<18) c=rgb('#685434'); }
    pset(x,y,c);
  }
  // Exposed masonry around the warehouse opening; the load path stays clear.
  for(let y=0;y<=20;y++) for(let x=state.CUT_X;x<=state.CUT_X+3;x++) pset(x,y,y%5===0?mortar:rgb('#4c3b2e'));
  for(let y=80;y<appearanceState.H;y++) for(let x=state.CUT_X;x<=state.CUT_X+3;x++) pset(x,y,y%5===0?joint:rgb('#484a3a'));
  line(state.CUT_X-1,0,state.CUT_X-1,20,appearanceState.C_OUT,appearanceState.C_OUT);
  line(state.CUT_X-1,80,state.CUT_X-1,95,appearanceState.C_OUT,appearanceState.C_OUT);
  // A short plank ramp from the wagon bed to the stone threshold (scenery only).
  for(let x=state.WAGON_REAR;x<=49;x++){ const y=Math.round(66+(x-state.WAGON_REAR)*13/18); line(x,y,x,y+2,rgb('#736041'),rgb('#43372a')); if(x%4===0) pset(x,y,rgb('#292b24')); }
  for(let y=0;y<appearanceState.H;y++) for(let x=state.CUT_X+4;x<appearanceState.W;x++){
    const shade=Math.max(0.48,1-Math.max(0,26-y)*0.016-Math.max(0,y-80)*0.017-Math.max(0,x-123)*0.008);
    const i=y*appearanceState.W+x,c=rendererState.fb[i];
    rendererState.fb[i]=(0xff000000|((((c>>16)&255)*shade|0)<<16)|((((c>>8)&255)*shade|0)<<8)|((c&255)*shade|0))>>>0;
  }
  buildWagon();
  rendererState.fb=rendererState.FB_MAIN;
}

/** Paint a ragged blood stain; wet floor pools catch a few dull red reflections. */
function drawWorkBlood(cx,cy,rx,ry,wet){
  for(let y=Math.max(0,cy-ry);y<=Math.min(appearanceState.H-1,cy+ry);y++) for(let x=Math.max(0,cx-rx);x<=Math.min(appearanceState.W-1,cx+rx);x++){
    const d=((x-cx)/rx)**2+((y-cy)/ry)**2,noise=h2(x,y),patch=h2((x-cx+32)>>1,(y-cy+32)>>1);
    if(d>0.45+patch/400||d>0.55&&noise<60||!wet&&patch>155) continue;
    pset(x,y,wet?(d>0.65?rgb('#35181a'):(noise<45?rgb('#45131b'):rgb('#591822'))):(noise<95?rgb('#321a1b'):rgb('#481b20')));
    if(wet&&y===cy-1&&noise>165&&noise<220) pset(x,y,rgb('#853239'));
    if(!wet&&noise>237) pset(x,y,rgb('#70252b'));
  }
}

/** Bake only the long rear of the dray, with its front and horses beyond the left edge. */
function buildWagon(){
  const previous=rendererState.fb; rendererState.fb=state.wagonSpr; state.wagonSpr.fill(0);
  const wood=rgb('#5c3e2b'),grain=rgb('#332a21'),edge=rgb('#7e5d3c'),iron=rgb('#454b3e'),dark=appearanceState.C_OUT;
  // The bed continues out of shot: broad horizontal planks, iron straps and filthy canvas.
  for(let y=state.WAGON_TOP;y<=65;y++) for(let x=0;x<=state.WAGON_REAR;x++){
    const canvasHem=45+h2(x>>2,3)%4;
    let c;
    if(y===state.WAGON_TOP||x===state.WAGON_REAR) c=dark;
    else if(y<=canvasHem){
      c=y<state.WAGON_TOP+3?rgb('#827d65'):rgb('#555e4b');
      if((x*3+y)%13===0||x%7===0) c=rgb('#3a4537');
      if(y>37&&h2(x>>1,y>>1)<75) c=h2(x,y)<100?rgb('#51232a'):rgb('#743037');
      if(y===canvasHem) c=rgb('#293226');
    } else {
      c=y===64?edge:(y%5===0?grain:wood);
      if(h2(x,y)%7===0) c=rgb('#745334');
      if(h2(x>>1,y>>1)<40) c=rgb('#3a2923');
      if(y>53&&h2(x>>1,y>>1)<70) c=rgb('#4b1f24');
    }
    if(y>47&&(x===8||x===28||x===29)) c=y%6===2?rgb('#7b7257'):iron;
    if(y===65) c=dark;
    pset(x,y,c);
  }
  // Rear axle, wooden spokes and iron tyre; all continue from a wagon outside the frame.
  line(0,67,32,67,grain,grain); line(0,68,32,68,dark,dark); line(0,70,28,70,rgb('#24251e'),rgb('#24251e'));
  const cx=15,cy=77;
  for(let y=67;y<=87;y++) for(let x=5;x<=25;x++){ const d=Math.hypot(x-cx,y-cy); if(d<8.2||d>10.2) continue; pset(x,y,d>9.2?dark:(d>8.8?iron:wood)); }
  for(let k=0;k<8;k++){ const a=k*Math.PI/4; line(cx,cy,Math.round(cx+Math.cos(a)*8),Math.round(cy+Math.sin(a)*8),edge,grain); }
  for(let y=75;y<=79;y++) for(let x=13;x<=17;x++) if(Math.hypot(x-cx,y-cy)<2.3) pset(x,y,x===15&&y===77?rgb('#8d734e'):iron);
  for(let k=0;k<12;k++) pset(6+k,85+k%3,rgb('#423529')); // mud on the iron tyre
  rendererState.fb=previous;
}

/** Composite the wagon boards over the half still on its bed. */
function blitWagon(){ for(let i=0;i<appearanceState.W*appearanceState.H;i++){ const c=state.wagonSpr[i]; if(c) rendererState.FB_MAIN[i]=c; } }

/** Draw the oil lantern suspended from an iron bracket on the wagon's side. */
function drawWagonLantern(){
  const L=state.WK_LANTERN,x=L.x,y=L.y,iron=rgb('#4a4130'),edge=rgb('#9a7545');
  line(x-4,y-12,x+2,y-12,iron,iron); line(x-4,y-12,x-4,y-10,iron,iron);
  line(x,y-11,x,y-8,edge,iron); // short chain below the side bracket
  line(x-2,y-6,x-2,y-7,iron,iron); line(x-2,y-7,x+2,y-7,iron,iron); line(x+2,y-7,x+2,y-6,iron,iron);
  line(x-2,y-5,x+2,y-5,edge,iron); line(x-4,y-4,x+4,y-4,iron,iron); // pitched metal hood
  for(let yy=y-3;yy<=y+3;yy++) for(let xx=x-3;xx<=x+3;xx++){
    const frame=Math.abs(xx-x)===3||yy===y+3;
    pset(xx,yy,frame?iron:(Math.abs(xx-x)<=1?rgb('#d9a452'):rgb('#73502b')));
  }
  line(x-4,y+4,x+4,y+4,iron,edge);
  pset(x,y+1,rgb('#fff0b3')); pset(x,y,rgb('#ffe398'));
  pset(x+(L.lv<0.9?1:0),y-1,L.lv>0.9?rgb('#fff0b3'):rgb('#efb459'));
}

/** Bake the single lantern's distance falloff over both wagon and slaughterhouse. */
export function buildWorkLight(){
  const L=state.WK_LANTERN,m=state.wkLight;
  for(let y=0;y<appearanceState.H;y++) for(let x=0;x<appearanceState.W;x++){
    const distance=Math.hypot((x-L.x)*1.03,(y-L.y)*1.13),fall=Math.max(0,1-distance/110);
    m[y*appearanceState.W+x]=Math.round(255*fall*fall);
  }
}

/** Flutter the flame on simulation time, so pausing also freezes its light. */
function wkLanternTick(){ state.WK_LANTERN.lv=0.9+0.06*Math.sin(boxingState.tick*0.17)+0.04*Math.sin(boxingState.tick*0.43); }

/** Light the complete scene from the wagon, then leave the timing gauges untouched. */
function applyWorkLight(){
  const L=state.WK_LANTERN,m=state.wkLight;
  for(let y=0;y<appearanceState.H;y++) for(let x=0;x<appearanceState.W;x++){
    const i=y*appearanceState.W+x,light=m[i]/255*L.lv,shade=0.2+0.8*light,c=rendererState.FB_MAIN[i];
    const dither=gymState.BAYER[(y&3)*4+(x&3)]/16;
    const r=Math.min(255,Math.floor((c&255)*shade+30*light+dither)),g=Math.min(255,Math.floor(((c>>8)&255)*shade+12*light+dither)),b=Math.min(255,Math.floor(((c>>16)&255)*shade+2*light+dither));
    rendererState.FB_MAIN[i]=(0xff000000|(b<<16)|(g<<8)|r)>>>0;
  }
  drawWagonLantern();
}

/** Draw the moving forged butcher's hook, with a heavy curved shank and sharp inward point. */
function drawHookAt(x,withMeat,swing,dmg){
  const xi=Math.round(x); if(xi<-12||xi>appearanceState.W+12) return;
  const iron=rgb('#958e79'),shade=rgb('#4e564a'),highlight=rgb('#c1bca2'),hy=state.WK_HOOKY;
  // Small iron runner above the eye; the hook below it has a rounded J profile.
  for(let y=17;y<=21;y++) for(let k=-2;k<=2;k++) pset(xi+k,y,(y===17||y===21||Math.abs(k)===2)?appearanceState.C_OUT:shade);
  const bend=[[-2,hy-5],[-2,hy],[-1,hy+2],[1,hy+3],[3,hy+2],[4,hy],[4,hy-2],[3,hy-3],[2,hy-2]];
  for(let k=1;k<bend.length;k++){
    const [ax,ay]=bend[k-1],[bx,by]=bend[k];
    for(let ox=-1;ox<=1;ox++) for(let oy=-1;oy<=1;oy++) line(xi+ax+ox,ay+oy,xi+bx+ox,by+oy,appearanceState.C_OUT,appearanceState.C_OUT);
  }
  for(let k=1;k<bend.length;k++){ const [ax,ay]=bend[k-1],[bx,by]=bend[k]; line(xi+ax,ay,xi+bx,by,iron,shade); }
  line(xi-3,hy-4,xi-3,hy-1,highlight,iron); pset(xi,hy+2,highlight); pset(xi+2,hy-2,highlight);
  if(withMeat) drawCarcassAt(xi+0.5,hy-1,Math.PI/2+(swing||0),0,1,dmg||0);
}
 /* ---------- the worker's pose (solved directly, like the push-ups) ---------- */
function wkHeld(){ const p=state.WK.phase; return p==='lift'||p==='heave'||p==='turn'||p==='carry'||p==='hang'||p==='hoist'||p==='drop'; } function wkSqSquat(){ return 0.12+0.85*state.WK.sqM; } function wkSqLean(){ return 0.2+1.6*state.WK.sqM; } function wkBoxing(){ const p=state.WK.phase; return p==='finale'||p==='finReady'||p==='finBlow'||p==='launch'; } function solveWork(){
  if(wkBoxing()){ solve(); return; }   // boxing the half: the heavy-bag punch animations drive the whole body
  const f=state.WK.face, Lx=x=>f>0?x:appearanceState.W-1-x, hl=Lx(state.WK.hip);
  const C=cfgLocal(state.WK.cfg,f);
  let squat=0.12, lean=0, rise=0, nT, fT;
  const shake=(boxingState.tick&1)?1:-1;
  switch(state.WK.phase){
    case 'ready': squat=0.9; lean=3.2; nT=cfgPt(C,0.07,-1.5); fT=cfgPt(C,0.18,1.5); break;
    case 'lift': {                                   // straining: deep squat, the whole body trembles harder the closer it gets
      squat=0.95-0.22*state.WK.p; lean=3.4-0.8*state.WK.p; nT=cfgPt(C,0.07,-1.5); fT=cfgPt(C,0.18,1.5);
      if(state.WK.p>0.02) lean+=shake*(0.25+0.45*state.WK.p); break; }
    case 'heave': squat=state.WK.hvS; lean=state.WK.hvL; rise=state.WK.hvR; nT=cfgPt(C,state.WK.hvNU,-2.5); fT=state.WK.hvFU>=0?cfgPt(C,state.WK.hvFU,1.5):[hl+3,appearanceState.HIP_Y0-1]; break;
    case 'turn': case 'carry': squat=0.2; lean=0.8+(f>0?state.WK.theta*0.5:0); nT=cfgPt(C,0.1,-3.4); fT=[hl+3-state.WK.armN*1.5,appearanceState.HIP_Y0-1]; break;   // right hand holds the hock end, the other hangs
    case 'hang': { squat=wkSqSquat(); lean=wkSqLean(); nT=cfgPt(C,0.13,-3); fT=cfgPt(C,0.34,-3); break; }   // the squat follows the flying marker: deepest at the bottom
    case 'hoist': { const q=eIO(Math.min(1,state.WK.t/7)); squat=state.WK.sqS0+(-0.15-state.WK.sqS0)*q; rise=2.4*q; lean=wkSqLean()*(1-q)-0.9*q; nT=cfgPt(C,0.13,-3); fT=cfgPt(C,0.34,-3); break; }   // drive up out of the squat and throw
    case 'drop': squat=0.3; lean=-state.WK.dropSide*f*1.5; nT=[hl+6,appearanceState.HIP_Y0-4]; fT=[hl+7,appearanceState.HIP_Y0-6]; break;
    case 'finale': case 'finReady': case 'finBlow': case 'launch': {
      squat=0.3; const shY=Math.round(appearanceState.HIP_Y0+1+squat*9-4)-appearanceState.TORSO+1, gN=[hl+6,shY+1], gF=[hl+9,shY-1];
      const ext=h=>{ const p=state.WK.pT[h]; return p<=0?0:(p<0.34?p/0.34:1-(p-0.34)/0.66); };
      let eN=ext(0), eF=ext(1);
      if(state.WK.phase==='finBlow'){ const t=state.WK.t; if(t<14){ eN=0; lean=-1.5*(t/14); gN[0]-=4*(t/14); } else { eN=t<40?1:Math.max(0,1-(t-40)/20); lean=2.5*eN; } }
      else lean=0.6+0.8*Math.max(eN,eF);
      const tN=[wkMeatX(47)-1,47], tF=[wkMeatX(42)-1,42];
      nT=[gN[0]+(tN[0]-gN[0])*eN,gN[1]+(tN[1]-gN[1])*eN]; fT=[gF[0]+(tF[0]-gF[0])*eF,gF[1]+(tF[1]-gF[1])*eF]; break; }
    default: {                                        // empty hands: arms swing against the legs
      const a=state.WK.armN; nT=[hl+2+a*3.5,appearanceState.HIP_Y0-Math.abs(a)*1.2]; fT=[hl+3-a*3.5,appearanceState.HIP_Y0-1-Math.abs(a)*1.2]; lean=state.WK.stepT>0?0.8:0; }
  }
  const fy=appearanceState.FLOOR_Y;
  boxingState.hipX=Math.round(hl); boxingState.hipY=Math.round(appearanceState.HIP_Y0+1+squat*9-rise-4-state.WK.bob);   // -4: standing tall on the long legs · bob: the pelvis rises over the stance leg
  boxingState.sx=Math.round(hl+lean); boxingState.sy=boxingState.hipY-appearanceState.TORSO; boxingState.torsoX=boxingState.hipX;
  boxingState.lsx=boxingState.sx+1; boxingState.lsy=boxingState.sy+1; boxingState.rsx=boxingState.sx-1; boxingState.rsy=boxingState.sy+1;
  boxingState.headX=boxingState.sx+2+Math.round(lean*0.3); boxingState.headY=boxingState.sy-6;
  ik(boxingState.rsx,boxingState.rsy,nT[0],nT[1],appearanceState.UPPER,appearanceState.FORE,1); boxingState.rex=Math.round(boxingState.IKx); boxingState.rey=Math.round(boxingState.IKy); boxingState.rgx=Math.round(boxingState.IKtx); boxingState.rgy=Math.round(boxingState.IKty);
  ik(boxingState.lsx,boxingState.lsy,fT[0],fT[1],appearanceState.UPPER,appearanceState.FORE,1); boxingState.lex=Math.round(boxingState.IKx); boxingState.ley=Math.round(boxingState.IKy); boxingState.lgx=Math.round(boxingState.IKtx); boxingState.lgy=Math.round(boxingState.IKty);
  // feet: the swing foot arcs through (higher mid-swing, toe dropping), the stance foot peels off its heel before it leaves
  const t=state.WK.stepT;
  const lift=k=>(t>0&&state.WK.stepFoot===k)?Math.sin(Math.PI*Math.min(1,t*1.15))*3.8:0;
  const heel=k=>{ if(t<=0.4||state.WK.stepFoot===k) return 0; const fx=k?state.WK.fF:state.WK.fN; return ((fx-state.WK.hip)*f<0)?(t-0.4)/0.6*2.4:0; };
  const lN=lift(0), lF=lift(1), hN=heel(0), hF=heel(1), tipN=lN>1.5?1:0, tipF=lF>1.5?1:0;
  boxingState.lax=Math.round(Lx(state.WK.fF)); boxingState.lay=Math.round(fy-3-lF-hF*0.7); boxingState.rax=Math.round(Lx(state.WK.fN)); boxingState.ray=Math.round(fy-3-lN-hN*0.7);
  boxingState.lhx=boxingState.hipX+1; boxingState.lhy=boxingState.hipY; boxingState.rhx=boxingState.hipX-1; boxingState.rhy=boxingState.hipY;
  ik(boxingState.lhx,boxingState.lhy,boxingState.lax,boxingState.lay,appearanceState.THIGH,appearanceState.SHIN,-1); boxingState.lkx=Math.round(boxingState.IKx); boxingState.lky=Math.round(boxingState.IKy);
  ik(boxingState.rhx,boxingState.rhy,boxingState.rax,boxingState.ray,appearanceState.THIGH,appearanceState.SHIN,-1); boxingState.rkx=Math.round(boxingState.IKx); boxingState.rky=Math.round(boxingState.IKy);
  boxingState.ltx=boxingState.lax+4; boxingState.lty=Math.round(fy-1-lF+tipF); boxingState.lhex=boxingState.lax-1; boxingState.lhey=Math.round(fy-1-lF-hF-tipF);
  boxingState.rtx=boxingState.rax+4; boxingState.rty=Math.round(fy-1-lN+tipN); boxingState.rhex=boxingState.rax-1; boxingState.rhey=Math.round(fy-1-lN-hN-tipN);
  boxingState.shDirX=0; boxingState.shDirY=1;
}

export // apron + cap (called from drawBoxer while workOutfit is on)
function drawApron(){
  const ax=torsoEdge(boxingState.sy+4,true)-1, ay=boxingState.sy+4; let bx=Math.max(torsoEdge(boxingState.hipY-2,true),boxingState.hipX+3), by=boxingState.hipY+10;
  const mkx=Math.round((boxingState.lkx+boxingState.rkx)/2); if(mkx>bx) bx=mkx;                       // wide stance: the apron hangs between the knees
  by=boxingState.hipY+3;                                                                 // ends high, above the knees, so it doesn't clip the lead leg
  for(let p=0;p<2;p++) taper(ax,ay,2.3,bx,by,3.3,p,appearanceState.R_APRON,0,-9,-9,0);
  const x0=Math.max(0,Math.min(ax,bx)-5), x1=Math.min(appearanceState.W-1,Math.max(ax,bx)+5), y0=Math.max(0,ay-3), y1=Math.min(appearanceState.H-1,by+4), thr=52+Math.round(95*state.WK.blood);
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){ const i=y*appearanceState.W+x; if(rampIndex(rendererState.fb[i],appearanceState.R_APRON)<0) continue;
    const h=h2((x-boxingState.hipX+40)>>1,(y-boxingState.hipY+40)>>1), h1=h2(x-boxingState.hipX+90,y-boxingState.hipY+90);
    if(h<thr) rendererState.fb[i]=h1<100?sparringState.C_BLOOD2:sparringState.C_BLOOD; }
  const hc=appearanceState.PAL[appearanceState.R_APRON*3+1]; line(ax,ay-1,boxingState.headX-1,boxingState.headY+5,hc,hc);                                   // neck strap
  if(wkHeld()){
    const jute=rgb('#90734a'), weave=rgb('#b79a65');
    for(let y=boxingState.sy;y<=boxingState.sy+7;y++){ const x=torsoEdge(y,false)+1; for(let k=0;k<3;k++) pset(x+k,y,(k+y)%3===0?weave:jute); }
  }
  const bk=torsoEdge(boxingState.hipY-3,false); pset(bk-1,boxingState.hipY-3,hc); pset(bk-2,boxingState.hipY-2,hc); pset(bk-2,boxingState.hipY-4,hc);  // bow at the back
}

export function redrawLeadLeg(){
  const sv=rendererState.fb; state.FB_LEG.fill(0); rendererState.fb=state.FB_LEG;
  drawLeg(boxingState.lhx,boxingState.lhy,boxingState.lkx,boxingState.lky,boxingState.lax,boxingState.lay,boxingState.lhex,boxingState.lhey,boxingState.ltx,boxingState.lty,true);
  rendererState.fb=sv;
  for(let y=Math.max(0,boxingState.hipY+1);y<appearanceState.H;y++){ const r=y*appearanceState.W; for(let x=0;x<appearanceState.W;x++){ const c=state.FB_LEG[r+x]; if(c) rendererState.fb[r+x]=c; } }
}

/** Draw a worn cloth flat cap in place of the paper butcher cap. */
export function drawCap(hx,hy){
  const felt=rgb('#514837'), highlight=rgb('#77684e'), seam=rgb('#302d25');
  for(let dx=-4;dx<=3;dx++){ pset(hx+dx,hy-6,appearanceState.C_OUT); pset(hx+dx,hy-5,dx<-2?felt:highlight); pset(hx+dx,hy-4,felt); pset(hx+dx,hy-3,seam); }
  pset(hx-3,hy-7,appearanceState.C_OUT); line(hx-2,hy-7,hx+1,hy-7,appearanceState.C_OUT,appearanceState.C_OUT);
  line(hx-2,hy-6,hx+2,hy-6,highlight,felt); line(hx+2,hy-3,hx+5,hy-3,seam,seam); // cloth flat cap and short peak
} function drawHeldCarcass(){ const C=cfgLocal(state.WK.cfg,state.WK.face), f=state.WK.face; state.carcClip=(x,y)=>(f>0?x:appearanceState.W-1-x)<=state.WAGON_REAR&&y>=state.WAGON_TOP&&y<=66; drawCarcassAt(C.x,C.y,C.a,0,1); state.carcClip=null; } function drawWorker(){
  const mir=state.WK.face<0;
  solveWork();
  if(mir){ state.FB_WK.fill(0); rendererState.fb=state.FB_WK; }
  boxingState.workMidHook=wkHeld()?drawHeldCarcass:null;
  drawBoxer();
  boxingState.workMidHook=null; rendererState.fb=rendererState.FB_MAIN;
  if(mir) for(let y=0;y<appearanceState.H;y++){ const r=y*appearanceState.W; for(let x=0;x<appearanceState.W;x++){ const c=state.FB_WK[r+x]; if(c) rendererState.FB_MAIN[r+appearanceState.W-1-x]=c; } }
} function wkFrame(cx,y,hw){ for(let x=cx-hw-1;x<=cx+hw+1;x++) for(let yy=y-1;yy<=y+2;yy++) pset(x,yy,(x===cx-hw-1||x===cx+hw+1||yy===y-1||yy===y+2)?appearanceState.C_OUT:state.WK_BG); } function wkTri(x,y,dir,c){ for(let k=0;k<3;k++) for(let d=-k;d<=k;d++) pset(x-dir*k,y+d,c); } // the throw gauge: a marker flies up and down beside the hook; the worker squats with it. Hit the zone at the bottom.
function drawSquatGauge(){
  const gx=126, y0=30, y1=78, hh=y1-y0;
  for(let y=y0-2;y<=y1+2;y++) for(let x=gx-3;x<=gx+3;x++) pset(x,y,(x===gx-3||x===gx+3||y===y0-2||y===y1+2)?appearanceState.C_OUT:state.WK_BG);
  const zc=y0+state.WK.sqZ*hh, zg=state.WK.sqGood*hh, zp=state.WK.sqPerf*hh;
  for(let y=Math.round(zc-zg);y<=Math.round(zc+zg);y++) for(let x=gx-2;x<=gx+2;x++) pset(x,y,Math.abs(y-zc)<=zp?state.WK_G:state.WK_Y);
  const d=Math.abs(state.WK.sqM-state.WK.sqZ), inZ=d<=state.WK.sqGood, my=Math.round(y0+state.WK.sqM*hh), mc=inZ?appearanceState.C_SPARK:appearanceState.C_WHITE;
  for(let x=gx-2;x<=gx+2;x++){ pset(x,my,mc); pset(x,my+1,appearanceState.C_OUT); }
  wkTri(gx-5,my,1,mc); wkTri(gx+5,my,-1,mc);
  if(state.WK.sqT>=0&&((boxingState.tick>>3)&1)) drawText('RZUT',gx,y0-10,appearanceState.C_SPARK,1);
} function drawWorkHud(){
  drawText(Math.min(state.WK.n+(state.WK.phase==='end'?0:1),state.WK_N)+'/'+state.WK_N,14,2,appearanceState.C_WHITE,1);

  const cx=72, y=8, hw=20;
  if(state.WK.phase==='carry'||state.WK.phase==='turn'){
    wkFrame(cx,y,hw);
    for(let x=cx-hw;x<=cx+hw;x++){ const n=Math.abs(x-cx)/hw; if(n>0.8){ pset(x,y,state.WK_G); pset(x,y+1,state.WK_G); } else if(n>0.45&&((x+y)&1)){ pset(x,y,state.WK_Y); } }
    const dw=Math.round(Math.min(1,state.WK.A)*hw), dc=state.WK.A>0.7?appearanceState.C_RED:appearanceState.C_GRAY;
    for(let x=cx-dw;x<=cx+dw;x++) pset(x,y+4,dc);
    const nx=cx+Math.round(Math.sin(state.WK.ph)*hw); for(let yy=y-2;yy<=y+3;yy++) pset(nx,yy,appearanceState.C_WHITE);
    const nextK=state.WK.lastKey===0?0:-state.WK.lastKey, blink=(boxingState.tick>>3)&1;
    wkTri(cx-hw-4,y,1,(nextK<=0&&(blink||nextK<0))?appearanceState.C_SPARK:appearanceState.C_GRAY); wkTri(cx+hw+4,y,-1,(nextK>=0&&(blink||nextK>0))?appearanceState.C_SPARK:appearanceState.C_GRAY);
  } else if(state.WK.phase==='hang'){
    drawSquatGauge();
  } else if(state.WK.phase==='ready'||state.WK.phase==='lift'){
    wkFrame(cx,y,hw);
    const w=Math.round(state.WK.p*hw*2); for(let x=cx-hw;x<cx-hw+w;x++){ pset(x,y,state.WK_Y); pset(x,y+1,state.WK.strain?appearanceState.C_RED:state.WK_Y); }
    if(state.WK.rate<5&&((boxingState.tick>>3)&1)) drawText('MASH',cx,y+5,appearanceState.C_SPARK,1);
  }
  if(state.WK.phase==='finale'||state.WK.phase==='finReady'){
    wkFrame(cx,y,hw);                                    // how broken the meat is
    const w=Math.round(state.WK.dmg*hw*2); for(let x=cx-hw;x<cx-hw+w;x++){ pset(x,y,appearanceState.C_RED); pset(x,y+1,sparringState.C_BLOOD); }
    const tw=Math.round(Math.max(0,state.WK.finT)/state.WK.finMax*hw*2); for(let x=cx-hw;x<cx-hw+tw;x++) pset(x,y+4,appearanceState.C_GRAY);
    drawText('x'+state.WK.punches,cx+hw+12,y-1,appearanceState.C_WHITE,1);
    if(((boxingState.tick>>3)&1)&&(state.WK.phase!=='finale'||state.WK.boxStage)) drawText(state.WK.phase==='finReady'?'FINISZ!':'BIJ!',cx,y+7,state.WK.phase==='finReady'?appearanceState.C_SPARK:appearanceState.C_WHITE,1);
  }
  if(state.WK.slowT>0){ for(let x=0;x<appearanceState.W;x++){ pset(x,0,appearanceState.C_OUT); pset(x,1,appearanceState.C_OUT); pset(x,appearanceState.H-1,appearanceState.C_OUT); pset(x,appearanceState.H-2,appearanceState.C_OUT); } }   // slow-mo letterbox

}

export function renderWork(){
  rendererState.fb=rendererState.FB_MAIN; rendererState.fb.set(state.bgWork);
  if(state.WK.phase==='ready'||state.WK.phase==='next') drawCarcassAt(state.WK.cfg.x,state.WK.cfg.y,state.WK.cfg.a,0,1);
  blitWagon();
  const fin=state.WK.phase==='finale'||state.WK.phase==='finReady'||state.WK.phase==='finBlow'||state.WK.phase==='launch'||(state.WK.phase==='end'&&state.WK.flyX>0);
  if(state.WK.slideX>=0) drawHookAt(state.WK.slideX,true,Math.sin(boxingState.tick*0.08)*0.05);
  if(fin) drawHookAt(state.WK_HOOKX+state.WK.flyX,state.WK.phase!=='end'||state.WK.flyX<appearanceState.W,state.WK.swing,state.WK.dmg); else drawHookAt(state.WK.hookX,false);
  if(state.WK.phase!=='off') drawWorker();
  drawParticles(true); drawParticles(false);
  applyWorkLight();
  drawWorkHud();
  drawPopups();
} /* ---------- simulation ---------- */
function wkSetFoot(k,x){ if(k===0) state.WK.fN=x; else state.WK.fF=x; } function wkBeginStep(k,from,to){
  const stance=k?state.WK.fN:state.WK.fF;
  state.WK.stepFoot=k; state.WK.stepFrom=from; state.WK.stepTo=to; state.WK.stepT=0.0001; state.WK.hipFrom=state.WK.hip; state.WK.hipTo=(stance+to)/2; state.WK.armFrom=state.WK.armN;
} function wkStartStep(dir,limit){
  const rearIsN=(state.WK.fN-state.WK.fF)*dir<0, k=rearIsN?0:1, front=rearIsN?state.WK.fF:state.WK.fN;
  let to=front+dir*state.WK_STRIDE; if(limit!==undefined&&(to-limit)*dir>0) to=limit;
  wkBeginStep(k,rearIsN?state.WK.fN:state.WK.fF,to);
} // the heave: drive up out of the squat, the half flies over in an arc past the shoulder, drops onto it, the knees absorb it
function wkStartHeave(){
  state.WK.phase='heave'; state.WK.t=0; state.WK.hvA=state.WK.cfg; state.WK.lastKey=0; state.WK.theta=0;
  const D=carryCfg(state.WK.face), Dl=cfgLocal(D,state.WK.face);
  state.WK.hvB=cfgLocal({x:Dl.x-1,y:Dl.y-8,a:-1.9},state.WK.face); state.WK.hvC=cfgLocal({x:Dl.x,y:Dl.y+2.2,a:Dl.a-0.07},state.WK.face); state.WK.hvD=D;
  state.WK.hvS=0.73; state.WK.hvL=2.6; state.WK.hvR=0; state.WK.hvNU=0.08; state.WK.hvFU=0.2;
  sfxWhoosh(0.9); sfxBreath();
} function wkHeaveTick(){
  const t=state.WK.t, k=(a,b,x)=>a+(b-a)*x, eo=x=>1-(1-x)*(1-x)*(1-x);
  if(t<=6){ const x=eo(t/6); state.WK.cfg=cfgLerp(state.WK.hvA,state.WK.hvB,x,6); state.WK.hvS=k(0.73,-0.1,x); state.WK.hvR=k(0,1.6,x); state.WK.hvL=k(2.6,-1.6,x); state.WK.hvNU=k(0.08,0.13,x); }
  else if(t<=10){ const x=(t-6)/4, xi=x*x; state.WK.cfg=cfgLerp(state.WK.hvB,state.WK.hvC,xi,0); state.WK.hvS=k(-0.1,0.5,xi); state.WK.hvR=k(1.6,0,xi); state.WK.hvL=k(-1.6,1.4,xi); }
  else { const x=eIO((t-10)/8); state.WK.cfg=cfgLerp(state.WK.hvC,state.WK.hvD,x,0); state.WK.hvS=k(0.5,0.2,x); state.WK.hvL=k(1.4,0.8,x); state.WK.hvFU=-1; }
  if(t===10){                                                    // it lands on the shoulder
    sfxLand(1); tone('sine',70,45,0.12,0.25); popup(state.T_HOP,state.WK.hip,26,appearanceState.C_SPARK,1,30); if(!boxingState.shakeT){ boxingState.shakeAmp=1; boxingState.shakeAxis=1; boxingState.shakeT=boxingState.shakeDur=5; }
    for(let j=0;j<4;j++) spawn(boxingState.P_DUST,(state.WK.fN+state.WK.fF)/2-4+j*2.5,appearanceState.FLOOR_Y-1,(j-1.5)*0.35,-0.2,14,appearanceState.C_DUST);
    spawnWkSweat();
  }
  if(t>=18){ state.WK.cfg=state.WK.hvD; if(state.WK.face<0){ state.WK.phase='turn'; state.WK.t=0; } else { state.WK.phase='carry'; state.WK.t=0; state.WK.A=0.3; state.WK.ph=0; state.WK.theta=0; } setInfo(); }
} // blood drips off the meat while it is carried (from the low, cut end) and stays on the floor
function wkDrip(u){ const C=state.WK.cfg, e=cfgPt(C,u,(Math.random()-0.5)*3); spawn(boxingState.P_BIT,e[0],e[1],(Math.random()-0.5)*0.3,0.3+Math.random()*0.3,90,Math.random()<0.6?sparringState.C_BLOOD:sparringState.C_BLOOD2); }

export function wkStain(x,y){ const xi=Math.round(x), yi=Math.max(81,Math.min(94,Math.round(y)+((xi*7)%3)-1)); if(xi<state.CUT_X+3||xi>=appearanceState.W) return;
  const c=state.C_WKST[(xi+yi)&3]; state.bgWork[yi*appearanceState.W+xi]=c; if(Math.random()<0.5&&xi+1<appearanceState.W) state.bgWork[yi*appearanceState.W+xi+1]=state.C_WKST[(xi+yi+1)&3]; if(Math.random()<0.25) state.bgWork[(yi-1)*appearanceState.W+xi]=state.C_WKST[3]; } function spawnWkSweat(){ const hx=state.WK.face>0?state.WK.hip+2:state.WK.hip-2, hy=appearanceState.HIP_Y0-24; for(let j=0;j<3;j++) spawn(boxingState.P_SWEAT,hx+(Math.random()-0.5)*4,hy+Math.random()*2,(Math.random()-0.5)*1.2,-0.8-Math.random()*0.6,30,0); } // last half: long fight; earlier halves: a shorter round on the hook (hits grow with the round)
function wkStartFinale(){
  const last=state.WK.n>=state.WK_N; Object.assign(state.WK,{finLast:last,finHits:last?state.FIN_HITS:6+state.WK.n,finMax:last?state.FIN_T:330,phase:'finale',t:0,finT:last?state.FIN_T:330,dmg:0,hs:0,boxStage:0,blown:0,altH:0,punches:0,swing:0,swV:0,flyX:0,flyV:0,slowT:0,pH:0,pT:[0,0],finBonus:0,finalWind:0});
  wkBoxStart();
} function wkMeatX(y){ return state.WK_HOOKX+state.WK.flyX-Math.sin(state.WK.swing)*(y-state.WK_HOOKY)-4.5; }

export // left surface of the hanging half at height y
/* Boxing the half uses the very same punch animations as the heavy bag (jab / cross / hook / uppercut): the shared
   state machine (startMove / samplePose / solve) runs the body, the apex event of a punch lands the hit on the meat. */
function wkSurf(gy){ if(!wkBoxing()||gy<state.WK_HOOKY||gy>state.WK_HOOKY+28) return 999; return wkMeatX(gy); } function wkBoxStart(){
  boxingState.state=animationState.IDLE; boxingState.stateT=0; boxingState.frameIdx=-1; boxingState.fired=0; boxingState.buffered=-1; boxingState.bufferedGrade=1; animationState.walkHeld=-1; boxingState.moveStep=0; sparringState.aimLow=0; sparringState.blockHeld=false; boxingState.flow=false; boxingState.curGrade=1;
  animationState.cur.set(animationState.GUARD); animationState.lastPose.set(animationState.cur); animationState.fromPose.set(animationState.cur); boxingState.idleT=0; resetClock(600,boxingState.simNow);
  animationState.posX=state.WK.hip-appearanceState.BASE_X;                                    // starts where he threw the half onto the hook...
  const sp=animationState.posX; animationState.posX=0; predictApex(animationState.MOVES[0]); animationState.posX=sp;   // ...and steps back to the spot where a jab's apex just sinks into the meat
  state.WK.boxPX=wkMeatX(boxingState.predY)+2-boxingState.predTip;
} function wkBoxRetreat(){
  const d=animationState.posX-state.WK.boxPX;
  if(boxingState.state!==animationState.IDLE) return;
  if(d>3.5){ startMove(animationState.M_WALKB,0); return; }
  animationState.posX-=d*0.35;
  if(Math.abs(d)<0.4){ animationState.posX=state.WK.boxPX; state.WK.boxStage=1; popup(state.T_BIJ,72,30,appearanceState.C_SPARK,2,50); sfxBell(1); }
} // pose update (a copy of the bag's update loop, without the bag)
function wkBoxStep(){
  if(state.WK.hs>0){ state.WK.hs--; return; }
  if(boxingState.buffered>=0){
    if(boxingState.tick-boxingState.bufferTick>24) boxingState.buffered=-1;
    else if(boxingState.state===animationState.IDLE||boxingState.stateT>=animationState.MOVES[boxingState.state].cancel) startMove(boxingState.buffered,0);
  }
  let ev=0, frameChanged=false, m=null;
  if(boxingState.state!==animationState.IDLE){
    m=animationState.MOVES[boxingState.state];
    if(boxingState.stateT>=m.dur){ if(m.walk) commitWalk(); animationState.lastPose.set(animationState.cur); boxingState.state=animationState.IDLE; boxingState.idleT=0; m=null; }
    else{
      const fr=m.fr||5, f=Math.floor(boxingState.stateT/fr);
      if(f!==boxingState.frameIdx){
        boxingState.frameIdx=f; frameChanged=true;
        let sT=(f+1)*fr; if(sT>m.dur) sT=m.dur;
        for(let k=1;k<m.n;k++) if(!(boxingState.fired&(1<<k))&&sT>=m.times[k]){ boxingState.fired|=1<<k; ev|=1<<k; }
      }
      if(frameChanged||(m.id>=0&&m.id<=3)) samplePose(m,poseSampleTime(m,boxingState.stateT,ev),animationState.cur);
      boxingState.stateT+=boxingState.STATS.speed;
    }
  }
  if(boxingState.state===animationState.IDLE){
    computeIdle(animationState.idleP); boxingState.idleT++;
    if(boxingState.idleT<=5){ for(let k=0;k<animationState.NP;k++) animationState.cur[k]=animationState.lastPose[k]+(animationState.idleP[k]-animationState.lastPose[k])*0.5; } else animationState.cur.set(animationState.idleP);
  }
  solve();
  if(m&&ev) handleEvents(m,ev);
} function wkBeginBlow(){ state.WK.phase='finBlow'; state.WK.t=0; state.WK.slowT=0; state.WK.finalWind=1; state.WK.blown=0; sfxSlowmo(); } // kind 0: jab / cross alternately · 1: hook · 2: uppercut · 10+id: that exact punch
function workPunch(kind){
  if(state.WK.phase==='finReady'){ wkBeginBlow(); return; }
  if(state.WK.phase!=='finale'||state.WK.boxStage!==1) return;
  let id; if(kind>=10) id=kind-10; else if(kind===0){ id=state.WK.altH; state.WK.altH^=1; } else id=kind===1?2:3;
  boxingState.buffered=id; boxingState.bufferTick=boxingState.tick; boxingState.bufferedGrade=1;
}

export // the apex of a punch: it lands on the meat (or misses it)
function wkImpact(m){
  const blow=state.WK.phase==='finBlow';
  if(!blow&&state.WK.phase!=='finale'&&state.WK.phase!=='finReady') return;
  const L=m.glove===0, gy=L?boxingState.lgy:boxingState.rgy, tip=L?boxingState.lTipRaw:boxingState.rTipRaw, surf=L?boxingState.lSurf:boxingState.rSurf;
  const x=(surf>900?tip:Math.min(surf,tip))-1, y=gy;
  if(blow){ if(!state.WK.blown&&m===animationState.MOVES[1]) wkBlowFx(x,y); return; }
  if(surf>900||tip<surf-3) return;                       // whiffed: the half swung away / wrong height
  state.WK.punches++;
  state.WK.dmg=Math.min(1,state.WK.dmg+(0.55+0.55*m.weight)/state.WK.finHits); state.WK.swV-=0.006+m.imp*3.5+Math.random()*0.004;
  spawn(boxingState.P_BURST,x,y,0,0,6,boxingState.tick&1);
  const nb=4+Math.round(state.WK.dmg*6)+Math.round(m.weight*2);
  for(let j=0;j<nb;j++){ const a=Math.PI+(Math.random()-0.5)*1.8, sp=0.8+Math.random()*1.8; spawn(boxingState.P_BIT,x,y+(Math.random()-0.5)*4,Math.cos(a)*sp,Math.sin(a)*sp-0.6,80,Math.random()<0.55?sparringState.C_BLOOD:sparringState.C_BLOOD2); }
  if(state.WK.dmg>0.5&&Math.random()<0.5) spawn(boxingState.P_BIT,x,y,-0.5-Math.random(),-1-Math.random(),70,state.CC.meatL);
  if(m.sweatHit) spawnSweat(m.sweatHit);
  state.WK.hs=Math.round(m.stop*0.5);
  const amp=Math.min(3,m.shake+1); boxingState.shakeAmp=amp; boxingState.shakeAxis=m.axis; boxingState.shakeT=boxingState.shakeDur=6;
  sfxPunch(Math.min(1.3,0.45+0.4*m.weight),m.weight); tone('sine',95,50,0.06,0.15);
  if(state.WK.dmg>=1&&state.WK.phase==='finale'){ state.WK.phase='finReady'; state.WK.t=0; popup(state.T_FINISZ,72,26,appearanceState.C_SPARK,2,80); }
  setInfo();
} // the finishing cross (slow motion): everything the half is worth goes into it and it flies off down the rail
function wkBlowFx(x,y){
  state.WK.blown=1;
  spawn(boxingState.P_BURST,x,y,0,0,12,1); spawn(boxingState.P_RING,x,y,0,0,12,0);
  for(let j=0;j<22;j++){ const a=Math.PI+(Math.random()-0.5)*2.4, sp=1+Math.random()*2.6; spawn(boxingState.P_BIT,x,y+(Math.random()-0.5)*8,Math.cos(a)*sp,Math.sin(a)*sp-0.8,90,Math.random()<0.5?sparringState.C_BLOOD:(Math.random()<0.5?sparringState.C_BLOOD2:state.CC.meatL)); }
  sfxKO(); boxingState.shakeAmp=3; boxingState.shakeAxis=0; boxingState.shakeT=boxingState.shakeDur=14; boxingState.hitstop=0;
  state.WK.flyV=3+1.5*state.WK.dmg; state.WK.swV=-0.09; popup(state.T_BUM,72,24,appearanceState.C_WHITE,3,90);
  state.WK.finBonus=state.WK.finLast?Math.min(30,10+Math.round(state.WK.punches*0.5)+(state.WK.dmg>=1?6:0)):Math.min(8,2+Math.round(state.WK.punches*0.4)+(state.WK.dmg>=1?2:0));
  state.WK.totPunches+=state.WK.punches;
} function wkFinaleTick(){
  // the half swings on its hook (pendulum)
  state.WK.swV+=-state.WK.swing*0.012; state.WK.swV*=0.965; state.WK.swing+=state.WK.swV;
  const ph=state.WK.phase;
  if(ph==='finale'){
    if(state.WK.boxStage===0) wkBoxRetreat();
    else { state.WK.finT--; if(state.WK.t%12===0) wkDripFin(); if(state.WK.finT<=0) wkBeginBlow(); }
  }
  else if(ph==='finReady'){ if(state.WK.t>150) wkBeginBlow(); }
  else if(ph==='finBlow'){
    if(state.WK.t===1){ state.WK.slowT=150; boxingState.buffered=-1; startMove(1,0); }          // one big cross, all in slow motion
    if(!state.WK.blown&&state.WK.t>90){ const y=45; wkBlowFx(wkMeatX(y),y); }        // (safety net)
    if(state.WK.blown){
      state.WK.flyX+=state.WK.flyV; state.WK.flyV*=0.995; if(state.WK.t%3===0) spawn(boxingState.P_BIT,state.WK_HOOKX+state.WK.flyX-2,54,-0.4,0.4,80,sparringState.C_BLOOD);
      if(state.WK_HOOKX+state.WK.flyX>appearanceState.W+40){ state.WK.phase='launch'; state.WK.t=0; state.WK.slowT=0; }
    }
  }
  else if(ph==='launch'){ if(state.WK.t>44){
    if(state.WK.n>=state.WK_N){ workEnd(); }
    else {                                                 // the half is gone down the rail: a new empty hook rolls in, back to the wagon for the next one
      state.WK.flyX=0; state.WK.flyV=0; state.WK.dmg=0; state.WK.swing=0; state.WK.swV=0; state.WK.hookX=93; state.WK.phase='back'; state.WK.t=0; state.WK.face=-1;
      state.WK.hip=appearanceState.BASE_X+animationState.posX; state.WK.fN=state.WK.hip+3; state.WK.fF=state.WK.hip-3; state.WK.stepT=0; state.WK.armN=0; state.WK.bob=0; boxingState.state=animationState.IDLE; boxingState.buffered=-1; setInfo(); return;
    } } }
  wkBoxStep();
} function wkDripFin(){ const e=[state.WK_HOOKX+state.WK.flyX-Math.sin(state.WK.swing)*27,state.WK_HOOKY+27]; spawn(boxingState.P_BIT,e[0],e[1],0,0.3,80,sparringState.C_BLOOD); } function wkTired(){ return Math.min(1,(progressionState.save.sim.zm||0)/6); }   /* zmęczenie makes the meat heavier */

export function workTap(){
  if(state.WK.phase==='finale'||state.WK.phase==='finReady'){ workPunch(0); return; }
  if(state.WK.phase==='hang'){ wkSquatPress(); return; }
  if(state.WK.phase==='ready'){ state.WK.phase='lift'; state.WK.p=0; state.WK.t=0; state.WK.from=state.WK_BED; state.WK.fromFloor=false; setInfo(); }
  if(state.WK.phase!=='lift') return;
  const t=inputNow(), gap=t-state.WK.lastTap; state.WK.lastTap=t;
  if(gap<600){ state.WK.rate=state.WK.rate*0.55+(1000/Math.max(40,gap))*0.45; state.WK.avgGap=state.WK.avgGap*0.7+gap*0.3; } else state.WK.rate=Math.max(state.WK.rate,3);
  sfxBreath();
}

export function workStepKey(k){
  if(state.WK.phase==='finale'||state.WK.phase==='finReady'){ workPunch(k<0?1:2); return; }
  if(state.WK.phase!=='carry') return;
  if(state.WK.stepT>0&&state.WK.stepT<0.6){ state.WK.A+=0.06; sfxMiss(); return; }                    // too fast: stumble
  if(k===state.WK.lastKey){ state.WK.A+=0.1; sfxMiss(); popup(boxingState.T_MISS,state.WK.hip,24,appearanceState.C_RED,1,18); return; }  // the same foot twice
  const s=Math.sin(state.WK.ph)*k;                                                          // 1 = the meat is at the extreme on that side
  let g; if(s>0.8){ g=0; state.WK.A*=0.7; state.WK.pPerf++; } else if(s>0.45){ g=1; state.WK.A*=0.86; state.WK.pGood++; } else { g=2; state.WK.A+=0.12; }
  sessionMetric('squats'); if(g===0) sessionMetric('perfect'); else if(g===1) sessionMetric('good');
  state.WK.A=Math.max(0.14,state.WK.A); state.WK.lastKey=k;
  popup(g===2?boxingState.T_MISS:g,state.WK.hip,24,g===0?appearanceState.C_SPARK:(g===1?appearanceState.C_SWEAT:appearanceState.C_RED),1,18);
  wkStartStep(1,state.WK_STOPX+3); tone('sine',95,70,0.05,0.08);
} // the throw: press when the marker is in the zone at the bottom of the squat -> the half is thrown onto the hook; miss -> it falls
function wkSquatPress(){
  if(state.WK.sqT<0) return;                                   // (short grace at the start, so a leftover press can't drop it)
  const d=Math.abs(state.WK.sqM-state.WK.sqZ);
  if(d>state.WK.sqGood){ wkDrop(); return; }
  const g=d<=state.WK.sqPerf?0:1; if(g===0) state.WK.pPerf++; else state.WK.pGood++;
  sessionMetric('squats'); sessionMetric(g===0?'perfect':'good');
  popup(g,state.WK.hip,24,g===0?appearanceState.C_SPARK:appearanceState.C_SWEAT,1,18);
  state.WK.sqS0=wkSqSquat(); state.WK.phase='hoist'; state.WK.t=0; state.WK.hvA=state.WK.cfg; sfxWhoosh(0.8); sfxBreath(); setInfo();
} function wkDrop(){
  const side=(state.WK.theta<0&&state.WK.hip-35>=38)?-1:1;   // never onto the wagon: near it the meat slips forward
  state.WK.phase='drop'; state.WK.t=0; state.WK.dropSide=side; state.WK.dropFrom=state.WK.cfg; state.WK.dropTo=floorCfg(side);
  state.WK.drops++; state.WK.pDrops++; sessionMetric('drops'); popup(state.T_UPS,state.WK.hip,24,appearanceState.C_RED,1,40); sfxWhoosh(0.5); setInfo();
} function wkSquatInit(){
  const tired=wkTired();
  state.WK.sqT=-22; state.WK.sqM=0;                                  // a moment to set up, then the marker starts down
  state.WK.sqP=Math.round(Math.max(34,64-state.WK.n*3-tired*10));    // period of one squat (ticks): faster every half, slower when you're spent
  state.WK.sqZ=0.86; state.WK.sqPerf=0.06; state.WK.sqGood=Math.max(0.09,0.15-tired*0.04-state.WK.n*0.004);
} function wkHooked(){
  simUI();
  state.WK.n++; sessionMetric('halves'); state.WK.blood=Math.min(1,state.WK.blood+0.11);
  popup(state.T_NAHAKU,state.WK_HOOKX-18,34,appearanceState.C_SPARK,1,50); tone('square',900,600,0.05,0.06); sfxLand(0.5);
  wkStartFinale(); setInfo();                            // every half gets boxed on the hook (the last one is the long fight)
}

export function workTick(){
  if(state.WK.slowT>0){ state.WK.slowT--; if(boxingState.tick%4) return; }            // finale slow motion: the world runs at 1/4
  const now=inputNow();
  if(now-state.WK.lastTap>Math.max(110,Math.min(280,state.WK.avgGap*1.7))) state.WK.rate*=0.86;
  state.WK.t++;
  if(state.WK.stepT>0){                                  // gait: swing foot eases through, the pelvis glides forward the whole step and rises mid-swing
    state.WK.stepT=Math.min(1,state.WK.stepT+1/15); const t=state.WK.stepT, e=eIO(t);
    wkSetFoot(state.WK.stepFoot,state.WK.stepFrom+(state.WK.stepTo-state.WK.stepFrom)*e);
    state.WK.hip=state.WK.hipFrom+(state.WK.hipTo-state.WK.hipFrom)*(0.45*t+0.55*e);
    state.WK.bob=Math.sin(Math.PI*t)*1.1;
    const tgt=state.WK.stepFoot===0?-1:1; state.WK.armN=state.WK.armFrom+(tgt-state.WK.armFrom)*e;   // near arm swings back as the near leg swings forward
    if(t>=1){ state.WK.stepT=0; state.WK.bob=0; wkSetFoot(state.WK.stepFoot,state.WK.stepTo); tone('sine',80,60,0.04,0.05); }
  } else { state.WK.hip+=((state.WK.fN+state.WK.fF)/2-state.WK.hip)*0.12; state.WK.bob*=0.7; if(state.WK.phase!=='back') state.WK.armN*=0.9; }
  const tired=wkTired();
  switch(state.WK.phase){
    case 'next': { const x=eIO(state.WK.t/30); state.WK.cfg={x:state.WK_BED.x-26+26*x,y:61,a:Math.PI}; if(state.WK.t>=30){ state.WK.phase='ready'; state.WK.t=0; state.WK.cfg=state.WK_BED; state.WK.p=0; state.WK.pDrops=0; state.WK.pGood=0; state.WK.pPerf=0; popup(state.T_DZW,40,30,appearanceState.C_SPARK,1,40); setInfo(); } break; }
    case 'lift': {
      const R0=4.3-1.98*passiveFraction(progressionState.save.stats.str.lvl)+tired*1.6+(state.WK.fromFloor&&state.WK.phase==='lift'?0.5:0);
      const d=Math.max(-0.004,Math.min(0.02,(state.WK.rate-R0)*0.0026)); state.WK.p=Math.max(0,Math.min(1,state.WK.p+d)); state.WK.strain=d<0?1:0;
      const jit=state.WK.p>0.02?0.35+0.55*state.WK.p:0, jx=Math.sin(boxingState.tick*2.7)*jit, jy=Math.cos(boxingState.tick*3.9)*jit;   // the meat trembles in the hands
      if(state.WK.phase==='lift'){
        // it barely comes up while you fight it: the near end peels off a little, everything shakes
        const F=state.WK.from, ex=F.x+Math.cos(F.a)*state.WK_L, ey=F.y+Math.sin(F.a)*state.WK_L, d=0.11*state.WK.p+jy*0.01;
        let a=F.a+d; if(ey-Math.sin(a)*state.WK_L>ey-Math.sin(F.a-d)*state.WK_L) a=F.a-d;          // pick the turn that lifts the near end
        state.WK.cfg={x:ex-Math.cos(a)*state.WK_L+jx*0.4,y:ey-Math.sin(a)*state.WK_L+jy*0.4,a};
        if(state.WK.p>0.5&&state.WK.t%18===0) spawnWkSweat();
        if(state.WK.p>=1) wkStartHeave();
      }
      break; }
    case 'hang': {                                   // the marker flies down and up, the worker squats with it
      state.WK.sqT++;
      state.WK.sqM=state.WK.sqT<0?0:0.5-0.5*Math.cos(6.2832*state.WK.sqT/state.WK.sqP);
      const b=carryCfg(1), sq=wkSqSquat(); state.WK.cfg={x:b.x+(wkSqLean()-0.8),y:b.y+(sq-0.2)*9,a:b.a};
      if(state.WK.sqT>0&&state.WK.sqT%state.WK.sqP===Math.round(state.WK.sqP*0.5)&&state.WK.sqM>0.98){ spawnWkSweat(); sfxBreath(); }
      break; }
    case 'finale': case 'finReady': case 'finBlow': case 'launch': wkFinaleTick(); break;
    case 'heave': wkHeaveTick(); if(state.WK.t>10&&state.WK.t%5===0) wkDrip(0.9); break;
    case 'hoist': { const T=14, x=Math.min(1,state.WK.t/T), up=x<0.7?eIO(x/0.7):1, ov=x<0.7?0:Math.sin(Math.PI*(x-0.7)/0.3)*2;
      const c=cfgLerp(state.WK.hvA,state.WK_HOOK,up,8); state.WK.cfg={x:c.x,y:c.y-ov,a:c.a};
      if(state.WK.t%4===0) wkDrip(1);
      if(state.WK.t>=T){ state.WK.cfg=state.WK_HOOK; wkHooked(); } break; }
    case 'turn': if(state.WK.t===5){ state.WK.face=1; state.WK.theta=0; } state.WK.cfg=carryCfg(state.WK.face); if(state.WK.t>=9){ state.WK.phase='carry'; state.WK.t=0; state.WK.A=0.3; state.WK.ph=0; state.WK.theta=0; setInfo(); } break;
    case 'carry': {
      state.WK.ph+=6.2832/state.WK_T; state.WK.A+=0.0021*(1+tired*0.8); state.WK.theta=state.WK.A*Math.sin(state.WK.ph); state.WK.cfg=carryCfg(1);
      if(state.WK.A>=1) wkDrop();
      else if(state.WK.hip>=state.WK_STOPX-0.8&&state.WK.stepT===0){ state.WK.phase='hang'; state.WK.p=0; state.WK.t=0; state.WK.theta=0; state.WK.rate=0; wkSquatInit(); popup(state.T_NAHAK,state.WK.hip,26,appearanceState.C_SPARK,1,40); setInfo(); }
      if(state.WK.t%13===0) wkDrip(1);
      break; }
    case 'drop': { const x=Math.min(1,state.WK.t/34); state.WK.cfg=cfgLerp(state.WK.dropFrom,state.WK.dropTo,x*x,0);
      if(x>=1){ sfxLand(1); if(!boxingState.shakeT){ boxingState.shakeAmp=1; boxingState.shakeAxis=1; boxingState.shakeT=boxingState.shakeDur=6; }
        state.WK.phase='lift'; state.WK.from=state.WK.dropTo; state.WK.fromFloor=true; state.WK.p=0; state.WK.t=0; state.WK.rate=0; state.WK.face=state.WK.dropSide; setInfo(); }
      break; }
    case 'hooked': if(state.WK.t>=18){ state.WK.phase='back'; state.WK.t=0; state.WK.face=-1; setInfo(); } break;
    case 'back': {
      if(state.WK.stepT===0){                                            // walk back to the wagon: lead foot to LOADX-3, trailing foot to LOADX+3
        const lead=state.WK_LOADX-3, trail=state.WK_LOADX+3, nFront=state.WK.fN<state.WK.fF, front=nFront?state.WK.fN:state.WK.fF, rear=nFront?state.WK.fF:state.WK.fN, rk=nFront?1:0;
        if(front>lead+0.5) wkBeginStep(rk,rear,Math.max(lead,front-state.WK_STRIDE));
        else if(rear>trail+0.5) wkBeginStep(rk,rear,trail);
        else if(state.WK.t>8){ if(state.WK.n>=state.WK_N) workEnd(); else { state.WK.phase='next'; state.WK.t=0; setInfo(); } } }
      break; }
  }
  wkLanternTick();
  if(state.WK.slideX>=0){ state.WK.slideX+=1.1; if(state.WK.slideX>appearanceState.W+20) state.WK.slideX=-1; }
  if(state.WK.hookX<state.WK_HOOKX) state.WK.hookX=Math.min(state.WK_HOOKX,state.WK.hookX+0.5);
  if(state.WK.phase!=='end'&&state.WK.phase!=='off'&&state.WK.t%110===40){       // breath fogs in the cold
    const mx=state.WK.face>0?state.WK.hip+8:state.WK.hip-8, my=appearanceState.HIP_Y0-22;
    for(let k=0;k<4;k++) spawn(boxingState.P_DUST,mx+state.WK.face*k*0.6,my-k*0.3,state.WK.face*(0.25+k*0.05),-0.08,28+k*4,k&1?rgb('#dfe8ee'):rgb('#b8c4cc'));
  }
}

/** Start a shift of hauling half carcasses. In prison (the schedule's work block) the target follows the assignment
 * stage, the block's minutes pass at the end and `onEnd` gets the quota; without it this is the debug prototype.
 * @param {{target?:number,minutes?:number,returnSt?:any,onEnd?:(r:{norma:number,hung:number,target:number,drops:number,punches:number,grade:string,gained:string})=>void}} [o] */
export function startWork(o={}){
  state.shift=o.onEnd?o:null; state.WK_N=o.target||8; state.result=null;
  leaveMode(); initAudio();
  boxingState.gstate='work'; boxingState.mode=boxingState.M_FREE; buildWorkBg(); beginSession('work',{silent:true,ownEsc:true}); setFlow(false); boxingState.hitstop=0; boxingState.shakeT=0;
  const outfitSlots=[appearanceState.R_SHIRT,appearanceState.R_SHIRTF,appearanceState.R_APRON,appearanceState.R_PANT,appearanceState.R_PANTF];
  state.outfitBefore=outfitSlots.map(slot=>[slot,Array.from(appearanceState.PAL.slice(slot*3,slot*3+3),c=>
    '#'+[c&255,(c>>8)&255,(c>>16)&255].map(v=>v.toString(16).padStart(2,'0')).join(''))]);
  boxingState.workOutfit=true; appearanceState.btStyle='mid';
  setRamp(appearanceState.R_SHIRT,['#514b3c','#87816a','#b3ab90'],false); setRamp(appearanceState.R_SHIRTF,['#514b3c','#87816a','#b3ab90'],true);
  setRamp(appearanceState.R_APRON,['#736249','#b5a17b','#d5c29a'],false);
  setRamp(appearanceState.R_PANT,['#2c2923','#464337','#69614e'],false); setRamp(appearanceState.R_PANTF,['#2c2923','#464337','#69614e'],true);
  setRamp(appearanceState.R_BOOT,['#1c140e','#3a2a1e','#5a4430'],false); setRamp(appearanceState.R_BOOTF,['#1c140e','#3a2a1e','#5a4430'],true); setRamp(appearanceState.R_BTR,['#0a0806','#1a1410','#2a2018'],false); setRamp(appearanceState.R_BTRF,['#0a0806','#1a1410','#2a2018'],true);
  Object.assign(state.WK,{phase:'next',t:0,n:0,drops:0,pDrops:0,pGood:0,pPerf:0,face:-1,hip:state.WK_LOADX,fF:state.WK_LOADX-3,fN:state.WK_LOADX+3,stepT:0,p:0,rate:0,lastTap:-1e9,A:0.3,ph:0,lastKey:0,theta:0,strain:0,bob:0,armN:0,armFrom:0,hipFrom:state.WK_LOADX,hipTo:state.WK_LOADX,
    cfg:{x:state.WK_BED.x-26,y:61,a:Math.PI},finBonus:0,totPunches:0,sqT:0,sqM:0,flyX:0,slowT:0,dmg:0,punches:0,swing:0,swV:0,pT:[0,0],slideX:-1,hookX:state.WK_HOOKX,blood:0.1});
  boxingState.pL.fill(0); boxingState.puL.fill(0);
  if(!state.workEndEl) state.workEndEl=document.getElementById('workEnd'); state.workEndEl.hidden=true;
  document.body.classList.add('work'); setPanelMode(); setInfo(); simUI();
}

/** Leave the work outfit through the palette owner, retaining the prior shared colours. */
export function workReset(){
  if(state.outfitBefore) for(const [slot,hex] of state.outfitBefore) setRamp(slot,hex,false);
  state.outfitBefore=null; boxingState.workOutfit=false; state.WK.phase='off'; document.body.classList.remove('work'); if(state.workEndEl) state.workEndEl.hidden=true; rendererState.fb=rendererState.FB_MAIN; }

export function workEnd(){
  if(state.WK.phase==='end'||boxingState.gstate!=='work') return;
  state.WK.phase='end'; state.WK.stepT=0;
  const norma=workNorma(state.WK.n,state.WK_N,state.WK.drops,state.WK.totPunches); sessionMetric('norma',norma);   // Profesor's daily task reads it
  const s=progressionState.save.sim, r=finishSession(false);
  state.result={norma,hung:state.WK.n,target:state.WK_N,drops:state.WK.drops,punches:state.WK.totPunches,grade:r?.grade||'D',gained:r?.gained||''};
  document.getElementById('workStats').innerHTML=(state.shift?'<span>Norma</span><span>'+norma+'%</span>':'')+'<span>Półtusze na haku</span><span>'+state.WK.n+' / '+state.WK_N+'</span><span>Upuszczone</span><span>'+state.WK.drops+'</span>'+(state.WK.totPunches?'<span>Boksowanie mięsa</span><span>'+state.WK.totPunches+' ciosów'+'</span>':'')+'<span>Trening</span><span>ocena '+r.grade+' ('+r.score+'%) · '+(r.gained||'bez XP')+'</span><span>Czas</span><span>dzień '+s.day+' · '+simTime()+'</span><span>Forma</span><span>'+simFormText()+'</span>';
  state.workEndEl.hidden=false; persist(); setInfo();
}

/** After the shift: in prison the hours of the block pass and the schedule pays the quota; the prototype goes back to the Ward. */
export function workGo(){
  if(state.workEndEl) state.workEndEl.hidden=true;
  const o=state.shift, res=state.result;
  if(!o||!res){ goRoom('cell',0); return; }
  state.shift=null;
  simUI(); persist();   /* the schedule charges the action: tired and filthy */
  enterHub(o.returnSt&&o.returnSt.spot?o.returnSt:null);
  o.onEnd?.(res);
}

export function workKey(e){
  const c=e.code;
  if(state.WK.phase==='end'){ if(c==='Enter'||c==='Escape'){ e.preventDefault(); workGo(); } return; }
  if(c==='Escape'){ workEnd(); return; }
  if(c==='Space'||c==='KeyF'||c==='KeyJ'||c==='Enter'){ e.preventDefault(); workTap(); return; }
  if(c==='ArrowLeft'||c==='KeyA'){ e.preventDefault(); workStepKey(-1); return; }
  if(c==='ArrowRight'||c==='KeyD'){ e.preventDefault(); workStepKey(1); return; }
  if((state.WK.phase==='finale'||state.WK.phase==='finReady')&&c.length===6&&c.startsWith('Digit')&&c[5]>='1'&&c[5]<='4'){ e.preventDefault(); workPunch(10+(+c[5]-1)); return; }
  if(c==='KeyM'){ audioState.soundOn=!audioState.soundOn; inputState.sndEl.checked=audioState.soundOn; }
}

export function workHint(){
  switch(state.WK.phase){
    case 'ready': case 'lift': return 'mashuj Spację — gdy pasek się zapełni, zarzucisz półtuszę na ramię';
    case 'heave': return 'hop!';
    case 'turn': case 'carry': return '← / → na zmianę: krok, gdy mięso przechyla się w tę stronę (wskazówka na zielonym)';
    case 'hang': return 'Spacja w zielonej strefie na dole przysiadu — wyrzucisz mięso na hak (pudło = upadnie)';
    case 'hoist': return 'hop!';
    case 'finale': return state.WK.boxStage?((state.WK.finLast?'ostatnia półtusza! ':'')+'Spacja — prosty (lewy/prawy) · ◀ A — hak · D ▶ — podbródek · ostatni cios pośle mięso dalej'):'cofasz się na dystans…';
    case 'finReady': return 'FINISZ — jeszcze jeden cios!';
    case 'finBlow': case 'launch': return 'BUM!';
    case 'drop': return 'upadło! podnieś jeszcze raz';
    case 'end': return 'Enter — wróć do Wardu';
  }
  return 'następna półtusza…';
}

export function initialize(){


/* =====================================================================
   PRACA — RZEŹNIA (Smithfield, London 1868, side view like the trainings).
   A shift = 8 pig halves from the horse-drawn wagon (left) to the hook rail (right):
   1) DŹWIGNIJ  mash Space to heave the half off the wagon bed onto the shoulder
   2) NIEŚ      the meat sways like a pendulum; step with ← / → alternately, each step when the
                sway reaches that side (good timing damps the sway, bad timing / the same foot twice
                pumps it). Past the limit the half slips off and has to be lifted from the floor.
   3) NA HAK    mash Space to push it up onto the hook, it rides away along the rail.
   The session score uses clean steps and throws; its result grants Siła / Wytrzymałość XP.
   Every half = 30 min of game time and heavy work for the needs. The boxer wears a stained linen
   apron, a cloth cap, rolled sleeves and work trousers; jute cushions the shoulder.
   ===================================================================== */
state.WK_N = 8;
state.WK_LOADX = 56;
state.WK_HOOKX = 110;
state.WK_HOOKY = 27;
state.WK_STOPX = 99;
state.WK_L = 28;
state.WK_T = 64;
state.WK_STRIDE = 10;

setRamp(appearanceState.R_SHIRT,['#8e949e','#c9cdd6','#eef0f4'],false);
 setRamp(appearanceState.R_SHIRTF,['#8e949e','#c9cdd6','#eef0f4'],true);

setRamp(appearanceState.R_APRON,['#b4b8c2','#e6e8ee','#ffffff'],false);

setRamp(appearanceState.R_PANT,['#262a34','#3a404e','#565e70'],false);
 setRamp(appearanceState.R_PANTF,['#262a34','#3a404e','#565e70'],true);

sparringState.WORK_RAMPS=appearanceState.PAL.slice(appearanceState.R_SHIRT*3,(appearanceState.R_PANTF+1)*3);

boxingState.FONT['/'.charCodeAt(0)]=parseInt('001001010100100',2);

state.T_HOP = boxingState.TXT.length;
 boxingState.TXT.push('HOP!','NA HAKU!','UPS!','DZWIGNIJ!','NA HAK!','BIJ!','FINISZ!','BUM!');
 state.T_BIJ = state.T_HOP+5;
state.T_FINISZ = state.T_HOP+6;
state.T_BUM = state.T_HOP+7;
 state.T_NAHAKU = state.T_HOP+1;
state.T_UPS = state.T_HOP+2;
state.T_DZW = state.T_HOP+3;
state.T_NAHAK = state.T_HOP+4;

state.WK = {phase:'off',t:0,n:0,drops:0,pDrops:0,pGood:0,pPerf:0,face:-1,hip:state.WK_LOADX,fN:state.WK_LOADX+3,fF:state.WK_LOADX-3,
  stepT:0,stepFoot:0,stepFrom:0,stepTo:0,bob:0,armN:0,armFrom:0,hipFrom:0,hipTo:0,p:0,rate:0,lastTap:-1e9,avgGap:160,A:0.3,ph:0,lastKey:0,theta:0,strain:0,
  cfg:{x:4,y:61,a:0},from:null,dropFrom:null,dropTo:null,dropSide:1,fromFloor:false,slideX:-1,hookX:state.WK_HOOKX,blood:0.1,
  sqT:0,sqM:0,sqP:60,sqZ:0.86,sqPerf:0.06,sqGood:0.14,sqS0:0.2,finHits:34,finMax:420,finLast:false,totPunches:0};

state.bgWork = new Uint32Array(appearanceState.W*appearanceState.H);
state.FB_WK = new Uint32Array(appearanceState.W*appearanceState.H);

state.WK_BED = {x:44,y:61,a:Math.PI};
state.WK_HOOK = {x:state.WK_HOOKX,y:state.WK_HOOKY,a:Math.PI/2};

/* ---------- the pig half: drawn procedurally along its axis (u 0 = hind trotter, 1 = neck cut) ---------- */
// pig half hanging by the hind trotter: ham at the top, sagging belly + shoulder lower down, a foreleg dangling past the neck cut
state.CARC_B = [1.3,1.9,3.5,4.7,4.5,4.1,4.1,4.4,4.8,4.8,4.4,3.8];
    // back side (v > 0): thick fat, straight spine line
state.CARC_F = [1.3,1.9,3.1,3.9,3.5,3.2,3.6,4.3,5.0,5.2,4.9,4.3];

state.CARC_LEG = -4.6;
   // foreleg axis (belly side)
state.CC = {rind:rgb('#c98d78'),rindD:rgb('#925543'),meat:rgb('#a32630'),meatD:rgb('#65131f'),meatL:rgb('#cb4545'),fat:rgb('#cfbea2'),fatD:rgb('#9f9277'),bone:rgb('#e2d0af'),rib:rgb('#bb8776')};

state.carcClip = null;

/* The timber wagon has its own foreground layer: the covered load remains behind the tailboard. */
state.CUT_X = 35;
state.WAGON_REAR = 31;
state.WAGON_TOP = 28;
state.wagonSpr = new Uint32Array(appearanceState.W*appearanceState.H);

/* ---------- one oil lantern on the wagon: the hook end lies in deep shadow ---------- */
state.WK_LANTERN = {x:28,y:50,lv:1};
state.wkLight = new Uint8Array(appearanceState.W*appearanceState.H);

// the lead (front) leg is repainted over the apron below the hip, so the apron never covers it and hangs between the legs
state.FB_LEG = new Uint32Array(appearanceState.W*appearanceState.H);

/* ---------- HUD ---------- */
state.WK_G = rgb('#5ee07a');
state.WK_Y = rgb('#ffd23f');
state.WK_BG = rgb('#27251e');

state.C_WKST = [rgb('#5a0e16'),rgb('#6e121c'),rgb('#861622'),rgb('#4a0c12')];

/* ---------- FINALE (the last half): hit it like Rocky. Spam punches for a few seconds, blood flies,
   the meat splits more with every hit; when it's broken the last punch goes off in slow motion and sends
   the half, hook and trolley, flying down the rail off the screen. ---------- */
state.FIN_T = 450;
state.FIN_HITS = 24;

/* ---------- start / end ---------- */
state.workEndEl = null;
}
