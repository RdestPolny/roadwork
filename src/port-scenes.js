/* Background vignettes use the port's projection and the shared figure renderer. */
import { rgb } from './appearance.js';
import { mix } from './cast.js';
import { isoBox, quad, shadeC, isoX, isoY } from './gym.js';
import { C, barrel, crate, cyl, roundLit, thin, stroke, rope, docker, contact, smoke, toWorld } from './thames-port.js';
import { ANCHORS, DECK_Z } from './port-district.js';
import { portLife, lifeTime, TABLE, BUCKET, TACKLE, CAT_CRATE, BENCH, BIN, RAW_STACK, CUT_STACK, PLANK, STACK_BASE, slotOf, SAW_REST, JUG_SPOT, BOTTLE_SPOT } from './port-life.js';

/** Draw the quadruped dock cat using isometric primitives matching the Roadwork aesthetic. */
function drawCat(c, t){
  const P=c.P, cosA=Math.cos(P.a), sinA=Math.sin(P.a);
  const toW=(f,s,z)=>[P.i+(f*cosA-s*sinA)/7.5,P.j+(f*sinA+s*cosA)/7.5,P.z+z];
  contact(P.i-.30,P.j-.30,P.i+.30,P.j+.30,P.z,.55);

  // Warm ginger tabby dock cat with ivory chest bib, white socks, luminous eyes and salmon nose
  const C_COAT=rgb('#c86b28');        // rich warm ginger body
  const C_COAT_HI=rgb('#f09440');     // bright lit dorsal highlight
  const C_COAT_SHADE=rgb('#7e3812');  // underside shadow & flank depth
  const C_DARK=rgb('#3a1808');        // deep tabby stripes, ear rims, eye contours
  const C_BIB=rgb('#faf3e8');         // crisp cream/ivory breast, muzzle & cheek ruffs
  const C_PAW=rgb('#ffffff');         // clean white socks
  const C_EAR_IN=rgb('#e49a90');      // shell-pink inner ear
  const C_NOSE=rgb('#d46a6a');        // salmon pink nose
  const C_EYE_RIM=rgb('#2a1406');     // dark almond eye contour
  const C_EYE=rgb('#adc92b');         // reflective luminous amber-chartreuse eye
  const C_EYE_SPEC=rgb('#fffae6');    // bright catchlight glint
  const C_FISH=rgb('#8faea0');        // Thames river herring
  const C_FISH_DARK=rgb('#384c42');   // herring spine
  const C_FISH_SHINE=rgb('#d8ece3');  // silver belly glint

  const crouch=c.crouch||0, rear=c.rearUp||0, sit=c.sit||0;
  const chew=c.chew||0, wash=c.washFace||0;
  const breath=c.breath||0;

  // Sturdy, well-fed feline proportions (width, hips, head)
  const sW=1.35;        // chest half-width (~5.4 screen px across body)
  const sHips=1.65;     // haunch half-width (~6.6 screen px across haunches)
  const sHead=1.25;     // head half-width (~5.0 screen px across cheeks)

  // Altitudes in z-units
  const rumpZ=Math.max(0.7, 3.5-1.4*crouch-2.3*sit-1.0*rear);
  const midZ=Math.max(0.8, 3.7-1.6*crouch-1.3*sit+0.6*rear+breath*0.6);
  const chestZ=Math.max(1.0, 3.3-1.5*crouch+0.8*sit+2.5*rear+breath);
  const headZ=Math.max(1.4, 4.7-2.3*crouch+0.8*sit+2.6*rear+0.3*chew+breath*0.5);

  const sitF=0.6*sit;
  const fRump=-2.6+sitF;
  const fMid=-0.4+sitF*0.3;
  const fChest=1.6-sitF*0.4;
  const fHead=2.8-sitF*0.6;

  // Spine & torso anchor points
  const rTop=toW(fRump,0,rumpZ+0.7);
  const rL=toW(fRump,-sHips,rumpZ);
  const rR=toW(fRump,sHips,rumpZ);
  const rBellyL=toW(fRump,-sHips*0.75,Math.max(0.2,rumpZ-1.0));
  const rBellyR=toW(fRump,sHips*0.75,Math.max(0.2,rumpZ-1.0));
  const rRear=toW(fRump-0.45,0,rumpZ);

  const mTop=toW(fMid,0,midZ+0.75);
  const mL=toW(fMid,-sW*1.15,midZ);
  const mR=toW(fMid,sW*1.15,midZ);
  const mBellyL=toW(fMid,-sW*0.8,Math.max(0.2,midZ-1.1));
  const mBellyR=toW(fMid,sW*0.8,Math.max(0.2,midZ-1.1));

  const cTop=toW(fChest,0,chestZ+0.65);
  const cL=toW(fChest,-sW,chestZ);
  const cR=toW(fChest,sW,chestZ);
  const cBellyL=toW(fChest,-sW*0.7,Math.max(0.3,chestZ-1.1));
  const cBellyR=toW(fChest,sW*0.7,Math.max(0.3,chestZ-1.1));

  // 1. Dorsal lit back
  quad(rTop[0],rTop[1],rTop[2], mTop[0],mTop[1],mTop[2], mL[0],mL[1],mL[2], rL[0],rL[1],rL[2], ()=>C_COAT_HI);
  quad(rTop[0],rTop[1],rTop[2], rR[0],rR[1],rR[2], mR[0],mR[1],mR[2], mTop[0],mTop[1],mTop[2], ()=>C_COAT);
  quad(mTop[0],mTop[1],mTop[2], cTop[0],cTop[1],cTop[2], cL[0],cL[1],cL[2], mL[0],mL[1],mL[2], ()=>C_COAT_HI);
  quad(mTop[0],mTop[1],mTop[2], mR[0],mR[1],mR[2], cR[0],cR[1],cR[2], cTop[0],cTop[1],cTop[2], ()=>C_COAT);

  // 2. Flanks
  quad(rL[0],rL[1],rL[2], mL[0],mL[1],mL[2], mBellyL[0],mBellyL[1],mBellyL[2], rBellyL[0],rBellyL[1],rBellyL[2], ()=>C_COAT);
  quad(mL[0],mL[1],mL[2], cL[0],cL[1],cL[2], cBellyL[0],cBellyL[1],cBellyL[2], mBellyL[0],mBellyL[1],mBellyL[2], ()=>C_COAT);
  quad(rR[0],rR[1],rR[2], rBellyR[0],rBellyR[1],rBellyR[2], mBellyR[0],mBellyR[1],mBellyR[2], mR[0],mR[1],mR[2], ()=>C_COAT_SHADE);
  quad(mR[0],mR[1],mR[2], mBellyR[0],mBellyR[1],mBellyR[2], cBellyR[0],cBellyR[1],cBellyR[2], cR[0],cR[1],cR[2], ()=>C_COAT_SHADE);

  // 3. Rounded rump rear cap
  quad(rTop[0],rTop[1],rTop[2], rL[0],rL[1],rL[2], rBellyL[0],rBellyL[1],rBellyL[2], rRear[0],rRear[1],rRear[2], ()=>C_COAT_SHADE);
  quad(rTop[0],rTop[1],rTop[2], rRear[0],rRear[1],rRear[2], rBellyR[0],rBellyR[1],rBellyR[2], rR[0],rR[1],rR[2], ()=>C_COAT_SHADE);

  // 4. Tabby markings across lit flank
  stroke(...rTop, toW(fRump,-sHips*0.8,rumpZ+0.2)[0],toW(fRump,-sHips*0.8,rumpZ+0.2)[1],toW(fRump,-sHips*0.8,rumpZ+0.2)[2], C_DARK);
  stroke(...mTop, toW(fMid,-sW*0.9,midZ+0.2)[0],toW(fMid,-sW*0.9,midZ+0.2)[1],toW(fMid,-sW*0.9,midZ+0.2)[2], C_DARK);
  stroke(...cTop, toW(fChest,-sW*0.8,chestZ+0.2)[0],toW(fChest,-sW*0.8,chestZ+0.2)[1],toW(fChest,-sW*0.8,chestZ+0.2)[2], C_DARK);

  // 5. Front chest & crisp cream bib
  const throat=toW(fChest+0.6,0,chestZ+0.3);
  const bibMid=toW(fChest+0.5,0,Math.max(0.8,chestZ-0.65));
  const bibLow=toW(fChest+0.3,0,Math.max(0.6,chestZ-1.25));
  quad(cTop[0],cTop[1],cTop[2], throat[0],throat[1],throat[2], bibMid[0],bibMid[1],bibMid[2], cL[0],cL[1],cL[2], ()=>C_BIB);
  quad(cTop[0],cTop[1],cTop[2], cR[0],cR[1],cR[2], bibMid[0],bibMid[1],bibMid[2], throat[0],throat[1],throat[2], ()=>C_BIB);
  quad(cL[0],cL[1],cL[2], bibMid[0],bibMid[1],bibMid[2], bibLow[0],bibLow[1],bibLow[2], cBellyL[0],cBellyL[1],cBellyL[2], ()=>C_BIB);
  quad(cR[0],cR[1],cR[2], cBellyR[0],cBellyR[1],cBellyR[2], bibLow[0],bibLow[1],bibLow[2], bibMid[0],bibMid[1],bibMid[2], ()=>C_BIB);

  // 6. Legs, haunches and white sock paws
  if(sit>0.5){
    // Folded haunches on deck
    quad(rL[0],rL[1],0.2, rL[0],rL[1],Math.max(0.6,rumpZ), toW(fMid-0.2,-sHips*1.1,Math.max(0.6,rumpZ))[0],toW(fMid-0.2,-sHips*1.1,Math.max(0.6,rumpZ))[1],toW(fMid-0.2,-sHips*1.1,Math.max(0.6,rumpZ))[2], toW(fMid-0.2,-sHips*1.1,0.2)[0],toW(fMid-0.2,-sHips*1.1,0.2)[1],0.2, ()=>C_COAT);
    quad(rR[0],rR[1],0.2, toW(fMid-0.2,sHips*1.1,0.2)[0],toW(fMid-0.2,sHips*1.1,0.2)[1],0.2, toW(fMid-0.2,sHips*1.1,Math.max(0.6,rumpZ))[0],toW(fMid-0.2,sHips*1.1,Math.max(0.6,rumpZ))[1],toW(fMid-0.2,sHips*1.1,Math.max(0.6,rumpZ))[2], rR[0],rR[1],Math.max(0.6,rumpZ), ()=>C_COAT_SHADE);

    // Folded rear white paws
    stroke(...toW(fMid-0.2,-sHips*0.9,0.2), ...toW(fMid+0.3,-sHips*0.8,0.2), C_PAW);
    stroke(...toW(fMid-0.2,sHips*0.9,0.2), ...toW(fMid+0.3,sHips*0.8,0.2), C_PAW);

    // Front legs supporting upright chest
    const pFL_top=toW(fChest+0.1,-0.55,chestZ-0.5);
    const pFL_bot=toW(fChest+0.4,-0.55,0.2);
    const rPawZ=wash?(headZ+0.4*wash):0.2;
    const pFR_top=toW(fChest+0.1,0.55,chestZ-0.5);
    const pFR_bot=toW(fChest+0.4,0.55,rPawZ);

    stroke(...pFL_top,...pFL_bot,C_COAT);
    stroke(...pFR_top,...pFR_bot,C_COAT_SHADE);

    stroke(pFL_bot[0],pFL_bot[1],0.15,pFL_bot[0]+cosA*0.08,pFL_bot[1]+sinA*0.08,0.15,C_PAW);
    stroke(pFR_bot[0],pFR_bot[1],rPawZ,pFR_bot[0]+cosA*0.08,pFR_bot[1]+sinA*0.08,rPawZ,C_PAW);
  } else {
    // 4-beat gait cycle
    const gait=c.gait||0;
    const swingF1=Math.sin(gait)*0.55;
    const swingF2=-Math.sin(gait)*0.55;
    const swingR1=Math.sin(gait+Math.PI*0.5)*0.55;

    // Hind legs
    const pBL=toW(fRump-0.2,-sHips*0.85,Math.max(0,-swingR1));
    const pBR=toW(fRump-0.2,sHips*0.85,Math.max(0,swingR1));
    stroke(...rL,...pBL,C_COAT);
    stroke(...rR,...pBR,C_COAT_SHADE);
    stroke(pBL[0],pBL[1],pBL[2],pBL[0]+cosA*0.06,pBL[1]+sinA*0.06,pBL[2],C_PAW);
    stroke(pBR[0],pBR[1],pBR[2],pBR[0]+cosA*0.06,pBR[1]+sinA*0.06,pBR[2],C_PAW);

    // Forelegs
    const fPawRZ=c.pawInBucket?2.5:wash?(headZ+0.4*wash):rear?2.45:Math.max(0,-swingF2);
    const pFL=toW(fChest+0.2,-sW*0.8,Math.max(0,swingF1));
    const pFR=toW(fChest+0.2,sW*0.8,fPawRZ);

    stroke(...cL,...pFL,C_COAT);
    stroke(...cR,...pFR,C_COAT_SHADE);

    stroke(pFL[0],pFL[1],pFL[2],pFL[0]+cosA*0.06,pFL[1]+sinA*0.06,pFL[2],C_PAW);
    stroke(pFR[0],pFR[1],pFR[2],pFR[0]+cosA*0.06,pFR[1]+sinA*0.06,pFR[2],C_PAW);
  }

  // 7. Volumetric skull, cheeks and muzzle
  const crown=toW(fHead-0.35,0,headZ+0.95);
  const leftBrow=toW(fHead+0.1,-sHead*0.75,headZ+0.65);
  const rightBrow=toW(fHead+0.1,sHead*0.75,headZ+0.65);
  const leftCheek=toW(fHead+0.65,-sHead*1.15,headZ);
  const rightCheek=toW(fHead+0.65,sHead*1.15,headZ);
  const muzzleTop=toW(fHead+1.25,0,headZ+0.1);
  const muzzleTip=toW(fHead+1.45,0,headZ-0.25);
  const chin=toW(fHead+0.95,0,headZ-0.7);

  quad(crown[0],crown[1],crown[2], leftBrow[0],leftBrow[1],leftBrow[2], muzzleTop[0],muzzleTop[1],muzzleTop[2], rightBrow[0],rightBrow[1],rightBrow[2], ()=>C_COAT_HI);
  quad(leftBrow[0],leftBrow[1],leftBrow[2], leftCheek[0],leftCheek[1],leftCheek[2], muzzleTip[0],muzzleTip[1],muzzleTip[2], muzzleTop[0],muzzleTop[1],muzzleTop[2], ()=>C_COAT);
  quad(rightBrow[0],rightBrow[1],rightBrow[2], muzzleTop[0],muzzleTop[1],muzzleTop[2], muzzleTip[0],muzzleTip[1],muzzleTip[2], rightCheek[0],rightCheek[1],rightCheek[2], ()=>C_COAT_SHADE);

  // Cream muzzle & whisker pads
  quad(muzzleTop[0],muzzleTop[1],muzzleTop[2], muzzleTip[0],muzzleTip[1],muzzleTip[2], chin[0],chin[1],chin[2], toW(fHead+0.8,0,headZ-0.35)[0],toW(fHead+0.8,0,headZ-0.35)[1],toW(fHead+0.8,0,headZ-0.35)[2], ()=>C_BIB);
  stroke(...leftCheek,...chin,C_BIB);
  stroke(...rightCheek,...chin,C_BIB);
  stroke(...chin,...throat,C_BIB);

  // 8. Triangular ears with depth
  const earTilt=crouch?-0.22:(c.earTwitch||0)*0.25;
  const earL_inner=toW(fHead-0.35,-sHead*0.35,headZ+0.9);
  const earL_outer=toW(fHead-0.1,-sHead*0.95,headZ+0.65);
  const earL_tip=toW(fHead-0.3,-sHead*0.85,headZ+1.65+earTilt);

  const earR_inner=toW(fHead-0.35,sHead*0.35,headZ+0.9);
  const earR_outer=toW(fHead-0.1,sHead*0.95,headZ+0.65);
  const earR_tip=toW(fHead-0.3,sHead*0.85,headZ+1.65-earTilt);

  quad(earL_inner[0],earL_inner[1],earL_inner[2], earL_tip[0],earL_tip[1],earL_tip[2], earL_outer[0],earL_outer[1],earL_outer[2], toW(fHead-0.25,-sHead*0.65,headZ+0.8)[0],toW(fHead-0.25,-sHead*0.65,headZ+0.8)[1],toW(fHead-0.25,-sHead*0.65,headZ+0.8)[2], ()=>C_COAT_HI);
  thin(...earL_outer,...earL_tip,C_DARK);
  thin(...earL_inner,...earL_tip,C_COAT_HI);
  thin(...toW(fHead-0.25,-sHead*0.65,headZ+1.05), ...toW(fHead-0.3,-sHead*0.75,headZ+1.4+earTilt*0.5), C_EAR_IN);

  quad(earR_inner[0],earR_inner[1],earR_inner[2], toW(fHead-0.25,sHead*0.65,headZ+0.8)[0],toW(fHead-0.25,sHead*0.65,headZ+0.8)[1],toW(fHead-0.25,sHead*0.65,headZ+0.8)[2], earR_outer[0],earR_outer[1],earR_outer[2], earR_tip[0],earR_tip[1],earR_tip[2], ()=>C_COAT);
  thin(...earR_outer,...earR_tip,C_DARK);
  thin(...earR_inner,...earR_tip,C_COAT);
  thin(...toW(fHead-0.25,sHead*0.65,headZ+1.05), ...toW(fHead-0.3,sHead*0.75,headZ+1.4-earTilt*0.5), C_EAR_IN);

  // 9. Luminous almond eyes with specular catchlight
  const eyeL=toW(fHead+0.65,-sHead*0.45,headZ+0.35);
  const eyeR=toW(fHead+0.65,sHead*0.45,headZ+0.35);
  thin(eyeL[0],eyeL[1],eyeL[2]+0.08,eyeL[0]+cosA*0.06,eyeL[1]+sinA*0.06,eyeL[2]+0.08,C_EYE_RIM);
  thin(eyeR[0],eyeR[1],eyeR[2]+0.08,eyeR[0]+cosA*0.06,eyeR[1]+sinA*0.06,eyeR[2]+0.08,C_EYE_RIM);
  thin(eyeL[0],eyeL[1],eyeL[2],eyeL[0]+cosA*0.05,eyeL[1]+sinA*0.05,eyeL[2],C_EYE);
  thin(eyeR[0],eyeR[1],eyeR[2],eyeR[0]+cosA*0.05,eyeR[1]+sinA*0.05,eyeR[2],C_EYE);
  thin(eyeL[0],eyeL[1],eyeL[2]+0.04,eyeL[0],eyeL[1],eyeL[2]+0.04,C_EYE_SPEC);
  thin(eyeR[0],eyeR[1],eyeR[2]+0.04,eyeR[0],eyeR[1],eyeR[2]+0.04,C_EYE_SPEC);

  // 10. Pink nose leather and delicate whiskers
  thin(muzzleTip[0],muzzleTip[1],muzzleTip[2],muzzleTip[0]+cosA*0.04,muzzleTip[1]+sinA*0.04,muzzleTip[2],C_NOSE);
  thin(...toW(fHead+1.1,-sHead*0.5,headZ-0.25), ...toW(fHead+1.2,-sHead*0.9,headZ-0.4), C_BIB);
  thin(...toW(fHead+1.1,sHead*0.5,headZ-0.25), ...toW(fHead+1.2,sHead*0.9,headZ-0.4), C_BIB);

  // 11. Sinuous, expressive tail
  const tYaw=c.tail?c.tail.yaw:0;
  const tPitch=c.tail?c.tail.pitch:0;
  const tWag=c.tail?c.tail.wag:0;

  if(sit>0.5){
    const tBase=toW(fRump-0.4,0,0.45);
    const tMid=toW(-0.8,-sHips*1.15,0.22);
    const tWrap=toW(0.8,-sW*1.05,0.2);
    const tFront=toW(1.8,-0.2,0.2);
    const tTip=toW(1.7,0.5+0.25*tWag,0.22);
    stroke(...tBase,...tMid,C_COAT);
    stroke(...tMid,...tWrap,C_COAT);
    stroke(...tWrap,...tFront,C_COAT_HI);
    stroke(...tFront,...tTip,C_BIB);
  } else {
    const tailH=crouch?0.2:0.7;
    const tBase=toW(fRump-0.3,0,rumpZ+0.25);
    const tMid=toW(fRump-1.6,tYaw*0.7,rumpZ+0.25+tPitch*0.4);
    const tEnd=toW(fRump-2.9,tYaw*1.2,rumpZ+0.25+tailH*0.4+tPitch*0.8);
    const tTip=toW(fRump-4.1,tYaw*1.6+0.35*tWag,rumpZ+0.25+tailH*0.8+tPitch);
    stroke(...tBase,...tMid,C_COAT);
    stroke(...tMid,...tEnd,C_COAT);
    stroke(...tEnd,...tTip,C_BIB);
  }

  // 12. Silvery Thames fish
  if(c.hasFish){
    const fishL=toW(fHead+1.45,-1.35,headZ-0.35);
    const fishR=toW(fHead+1.45,1.35,headZ-0.35);
    stroke(...fishL,...fishR,C_FISH);
    stroke(fishL[0],fishL[1],fishL[2]+0.12,fishR[0],fishR[1],fishR[2]+0.12,C_FISH_DARK);
    stroke(fishL[0],fishL[1],fishL[2]-0.12,fishR[0],fishR[1],fishR[2]-0.12,C_FISH_SHINE);
    thin(fishR[0],fishR[1],fishR[2],fishR[0]+0.25,fishR[1]+0.15,fishR[2]+0.2,C_FISH_DARK);
    thin(fishR[0],fishR[1],fishR[2],fishR[0]+0.25,fishR[1]-0.15,fishR[2]-0.2,C_FISH_DARK);
  }

  // 13. Eating fish on crate
  if(c.eating&&c.fishScale>0){
    const fLen=1.3*c.fishScale;
    const fHead=toW(2.2+fLen,0,0.1);
    const fTail=toW(2.2-fLen,0,0.1);
    stroke(...fHead,...fTail,C_FISH);
    stroke(fHead[0],fHead[1],fHead[2]+0.1,fTail[0],fTail[1],fTail[2]+0.1,C_FISH_DARK);
    stroke(fHead[0],fHead[1],fHead[2]-0.1,fTail[0],fTail[1],fTail[2]-0.1,C_FISH_SHINE);
  }
}

/** Draw a person using the joint positions from a background routine. */
function person(a,top,look={style:'workcap'}){
  const p=a.P, pose=a.pose, J=s=>s>0?pose.R:pose.L;
  J.pel=pose.pel; J.chest=pose.chest; J.head=pose.head;
  contact(p.i-.15,p.j-.15,p.i+.15,p.j+.15,p.z0||0,.4);
  docker(p,J,top,{look:pose.look},look);
}
/** Draw a vessel from its bottom and axis, including its tipped drinking pose. */
function vessel(v,kind){
  if(!v) return;
  const p=v.bottom, h=kind==='mug'?1.6:2.6, u=v.up, q=[p[0]+u[0]*h/7.5,p[1]+u[1]*h/7.5,p[2]+u[2]*h];
  stroke(...p,...q,kind==='mug'?rgb('#a69b82'):rgb('#405e4d'));
  if(kind==='mug') thin(p[0]+.08,p[1],p[2]+.4,q[0]+.08,q[1],q[2]-.2,rgb('#d1c4a4'));
}
/** Tobacco smoke reads pale against the dark quay. */
const SMOKE_PALE=rgb('#9a978a');
/** A cigarette: white paper, a glowing ember at the tip (brighter on a drag). */
function cigarette(v,drag){
  if(!v) return;
  const p=v.bottom, u=v.up, h=1.4, q=[p[0]+u[0]*h/7.5,p[1]+u[1]*h/7.5,p[2]+u[2]*h];
  stroke(...p,...q,rgb('#d9d1bd'));
  thin(q[0],q[1],q[2]-.15,q[0],q[1],q[2]+.1,mix(rgb('#c4562a'),rgb('#ffcf7a'),drag));
}
/** A glass bottle standing on the table: body, shoulder, neck and cork. */
function standingBottle([i,j,z]){
  const glass=(zz,s)=>shadeC(rgb('#2d5a3f'),roundLit(s)*(zz-z>.35&&zz-z<1.1?1.5:1)), top=(s,v)=>shadeC(rgb('#1d3b2a'),1.15-v*.15);
  cyl(i,j,.058,z,z+1.8,glass,top,.04);
  cyl(i,j,.032,z+1.8,z+2.9,glass,top);
  cyl(i,j,.036,z+2.9,z+3.15,(zz,s)=>shadeC(rgb('#b79a63'),roundLit(s)),()=>rgb('#c9ad74'));
  thin(i+.06,j+.04,z+.5,i+.06,j+.04,z+1.2,rgb('#c9bf9e'));
}
/** The oak cask is split along one stave: a jagged dark crack with a raw splinter edge, a seeping wet streak and a damp stain on the setts. */
function crackedBarrel(i,j){
  const R=.37, P=(a,z)=>[i+R*Math.cos(a),j+R*Math.sin(a),z];
  const path=[[6.9,.84],[6.0,.76],[5.5,.86],[4.5,.78],[3.7,.88],[2.6,.8],[1.9,.84]];
  for(let k=0;k<path.length-1;k++){
    const [z0,a0]=path[k], [z1,a1]=path[k+1];
    thin(...P(a0,z0),...P(a1,z1),rgb('#130e0b'));
    thin(...P(a0+.06,z0),...P(a1+.06,z1),rgb('#7d5f3c'));
  }
  thin(...P(.8,6.7),...P(.74,6.9),rgb('#130e0b'));
  for(const [a,z] of [[.8,1.9],[.84,1.2]]) thin(...P(a,z),...P(a,Math.max(0,z-1.8)),shadeC(C.woodDark,.55));
  contact(i+.15,j+.2,i+.5,j+.52,0,.3);
}
/** A glazed plate with a cob loaf, a slice cut from it and a knife left across the rim. */
function breadPlate(i,j,z){
  const cream=rgb('#d3caae'), rim=rgb('#4c6d84');
  cyl(i,j,.22,z,z+.22,(zz,s)=>shadeC(cream,roundLit(s)),(s,v)=>Math.hypot(s,v)>.84?shadeC(rim,1.1):Math.hypot(s,v)>.74?shadeC(cream,.9):shadeC(cream,1.08-v*.06));
  const crust=rgb('#9b6531'), crumb=rgb('#e2cf9c');
  cyl(i-.04,j-.02,.115,z+.22,z+.95,(zz,s)=>shadeC(crust,roundLit(s)*(.9+.2*Math.sin((zz-z)*9+s*2))),(s,v)=>s>.05&&v>-.45?shadeC(crumb,.95+v*.1):shadeC(crust,1.15-v*.1),.22);
  isoBox(i+.1,j+.04,i+.2,j+.14,z+.22,z+.44,crumb,shadeC(crumb,.78),shadeC(crust,.9));
  stroke(i-.15,j+.13,z+.24,i+.12,j+.16,z+.24,rgb('#9aa0a0'));
  thin(i-.19,j+.13,z+.24,i-.15,j+.13,z+.24,rgb('#3a2b20'));
  thin(i+.04,j+.2,z+.22,i+.07,j+.21,z+.22,crumb); thin(i+.12,j-.1,z+.22,i+.13,j-.09,z+.22,crumb);
}
/** The concertina: a box at each hand, the hexagonal bellows between them folding as the hands move apart and together. */
function concertina(m){
  const [a,b]=m.box, N=7, wood=rgb('#5a4033'), side=rgb('#2c1e18'), lit=rgb('#7a573f');
  const pt=k=>[lerp(a[0],b[0],k/N),lerp(a[1],b[1],k/N),lerp(a[2],b[2],k/N)];
  for(let k=0;k<N;k++){
    const p=pt(k), q=pt(k+1), ridge=k%2?.55:-.1, dark=k%2?rgb('#7a3028'):rgb('#b4543f');
    thin(p[0],p[1],p[2]+1.0+ridge*.5,q[0],q[1],q[2]+1.0+(k%2?-.1:.55)*.5,dark); thin(p[0],p[1],p[2]-1.0-ridge*.5,q[0],q[1],q[2]-1.0-(k%2?-.1:.55)*.5,rgb('#33141a'));
    thin(q[0],q[1],q[2]-1.0,q[0],q[1],q[2]+1.0,k%2?dark:rgb('#d98a62'));
  }
  for(const h of [a,b]){ isoBox(h[0]-.1,h[1]-.1,h[0]+.1,h[1]+.1,h[2]-1.3,h[2]+1.3,lit,side,wood); thin(h[0]+.03,h[1]+.1,h[2]-.5,h[0]+.03,h[1]+.1,h[2]+.5,rgb('#c2a25a')); }
}
const lerp=(a,b,u)=>a+(b-a)*u;
/** Draw a timber board in world coordinates as a shaded isometric plank. */
function board(b){
  if(!b) return;
  const {i,j,z,dir,kind}=b;
  const d=dir||[1,0,0], len=kind.len/2, w=kind.w/2, th=kind.th;
  const dz=(d[2]||0)*len*7.5;
  const C_TOP=rgb('#d0a676'), C_FRONT=rgb('#8d6845'), C_SIDE=rgb('#6a4e33'), C_LINE=rgb('#dfb88c');

  // Fast path for axis-aligned deals on stacks or resting on bench
  if(Math.abs(d[0])>0.98&&Math.abs(d[1])<0.02&&Math.abs(dz)<0.02){
    isoBox(i-len,j-w,i+len,j+w,z,z+th,C_TOP,C_FRONT,C_SIDE);
    return;
  }
  if(Math.abs(d[1])>0.98&&Math.abs(d[0])<0.02&&Math.abs(dz)<0.02){
    isoBox(i-w,j-len,i+w,j+len,z,z+th,C_TOP,C_FRONT,C_SIDE);
    return;
  }

  // Generalized volumetric plank for carried / transitioning boards
  const n=[-d[1],d[0]];
  const c0=[i-d[0]*len-n[0]*w, j-d[1]*len-n[1]*w, z-dz];
  const c1=[i+d[0]*len-n[0]*w, j+d[1]*len-n[1]*w, z+dz];
  const c2=[i+d[0]*len+n[0]*w, j+d[1]*len+n[1]*w, z+dz];
  const c3=[i-d[0]*len+n[0]*w, j-d[1]*len-n[1]*w, z-dz];
  const t0=[c0[0],c0[1],c0[2]+th], t1=[c1[0],c1[1],c1[2]+th], t2=[c2[0],c2[1],c2[2]+th], t3=[c3[0],c3[1],c3[2]+th];

  // Top lit face
  quad(t0[0],t0[1],t0[2], t1[0],t1[1],t1[2], t2[0],t2[1],t2[2], t3[0],t3[1],t3[2], ()=>C_TOP);
  // Side long face
  quad(c3[0],c3[1],c3[2], c2[0],c2[1],c2[2], t2[0],t2[1],t2[2], t3[0],t3[1],t3[2], ()=>C_FRONT);
  // Butt end face
  quad(c2[0],c2[1],c2[2], c1[0],c1[1],c1[2], t1[0],t1[1],t1[2], t2[0],t2[1],t2[2], ()=>C_SIDE);
  // Opposite long face
  quad(c0[0],c0[1],c0[2], c1[0],c1[1],c1[2], t1[0],t1[1],t1[2], t0[0],t0[1],t0[2], ()=>C_FRONT);

  // Edge definition lines
  thin(t0[0],t0[1],t0[2], t1[0],t1[1],t1[2], C_LINE);
  thin(t3[0],t3[1],t3[2], t2[0],t2[1],t2[2], C_LINE);
  thin(t0[0],t0[1],t0[2], t3[0],t3[1],t3[2], C_LINE);
  thin(t1[0],t1[1],t1[2], t2[0],t2[1],t2[2], C_LINE);
}

/** Put stationary props and animated figures into the port's existing depth queue. */
export function portLifeProps(t){
  const L=portLife(lifeTime(t)), out=[], add=(i,j,fn)=>out.push([i+j,fn]);
  for(const [i,j] of [ANCHORS.pub_barrel_table_1,ANCHORS.pub_barrel_table_2,ANCHORS.pub_barrel_table_3]) add(i,j,()=>barrel(i,j,0));
  add(ANCHORS.pub_barrel_table_2[0]+.01,ANCHORS.pub_barrel_table_2[1]+.01,()=>crackedBarrel(...ANCHORS.pub_barrel_table_2));
  add(ANCHORS.pub_barrel_table_3[0]+.01,ANCHORS.pub_barrel_table_3[1]+.01,()=>breadPlate(ANCHORS.pub_barrel_table_3[0],ANCHORS.pub_barrel_table_3[1],TABLE.h));
  add(BOTTLE_SPOT[0],BOTTLE_SPOT[1],()=>standingBottle(BOTTLE_SPOT));
  const bk=L.bucket;
  add(bk.i,bk.j,()=>{
    cyl(bk.i,bk.j,bk.r,DECK_Z,DECK_Z+bk.h,(z,s)=>shadeC(C.woodDark,roundLit(s)),(s,v)=>{
      const r2=s*s+v*v;
      if(r2>.72) return shadeC(C.woodDark,1.15);
      if(bk.splash>=0){
        const rad1=(bk.splash/25)*.7;
        if(Math.abs(Math.sqrt(r2)-rad1)<.09) return shadeC(C.waterHi,1.5);
      }
      if(bk.flop>0){
        if(Math.abs(Math.sqrt(r2)-bk.flop*.6)<.08) return shadeC(C.waterHi,1.2);
      }
      if(bk.count>=1&&s>-.28&&s<.28&&Math.abs(v)<.18) return rgb('#788c83');
      if(bk.count>=2&&s>-.55&&s<-.1&&v>.08&&v<.38) return rgb('#6b7f76');
      if(bk.count>=3&&s>.1&&s<.55&&v>-.35&&v<-.05) return rgb('#889d94');
      if((Math.abs(s+.12)<.06&&Math.abs(v+.2)<.06)||(Math.abs(s-.22)<.06&&Math.abs(v-.18)<.06)) return rgb('#d8ece7');
      return shadeC(rgb('#1c2b28'),.85+.25*v);
    });
    if(bk.splash>=0&&bk.splash<=24){
      const tau=bk.splash;
      for(let k=0;k<5;k++){
        const ang=k*1.25+.3, spd=.012+(k%3)*.005;
        const dx=Math.cos(ang)*spd*tau, dy=Math.sin(ang)*spd*tau, dz=.35*tau-.018*tau*tau;
        if(dz>0) thin(bk.i+dx,bk.j+dy,DECK_Z+bk.h+dz,bk.i+dx*1.1,bk.j+dy*1.1,DECK_Z+bk.h+dz+.2,C.waterHi);
      }
    }
  });
  add(TACKLE.i,TACKLE.j,()=>crate(TACKLE.i,TACKLE.j,TACKLE.w,TACKLE.d,TACKLE.h,DECK_Z));
  const cc=L.catCrate||CAT_CRATE;
  add(cc.i,cc.j,()=>crate(cc.i,cc.j,cc.w,cc.d,cc.h,DECK_Z));
  const cat=L.cat;
  add(cat.P.i,cat.P.j,()=>drawCat(cat,t));

  // Raw timber stack with grounded dunnage bearers underneath
  add(RAW_STACK.i0,RAW_STACK.j0,()=>{
    contact(RAW_STACK.i0-.15,RAW_STACK.j0-.1,RAW_STACK.i1+.15,RAW_STACK.j1+.1);
    for(const bj of [RAW_STACK.j0+.25,(RAW_STACK.j0+RAW_STACK.j1)/2,RAW_STACK.j1-.25]){
      isoBox(RAW_STACK.i0-.08,bj-.09,RAW_STACK.i1+.08,bj+.09,0,STACK_BASE,rgb('#85684d'),rgb('#57422f'),rgb('#3d2e20'));
    }
    for(let n=0;n<L.yard.raw;n++) board(slotOf(RAW_STACK,PLANK.raw,n));
  });

  // Cut timber stack with grounded dunnage bearers underneath
  add(CUT_STACK.i0,CUT_STACK.j0,()=>{
    contact(CUT_STACK.i0-.1,CUT_STACK.j0-.15,CUT_STACK.i1+.1,CUT_STACK.j1+.15);
    for(const bi of [CUT_STACK.i0+.25,(CUT_STACK.i0+CUT_STACK.i1)/2,CUT_STACK.i1-.25]){
      isoBox(bi-.09,CUT_STACK.j0-.08,bi+.09,CUT_STACK.j1+.08,0,STACK_BASE,rgb('#85684d'),rgb('#57422f'),rgb('#3d2e20'));
    }
    for(let n=0;n<L.yard.cut;n++) board(slotOf(CUT_STACK,PLANK.cut,n));
  });

  // Carpenter's workbench with detailed trestles, cross-bracing and saw kerf
  add(BENCH.i0,BENCH.j,()=>{
    const [t1,t2]=BENCH.trestles;
    contact(BENCH.i0+.1,BENCH.j-.35,BENCH.i0+2.1,BENCH.j+.35);
    for(const i of BENCH.trestles){
      isoBox(i-.08,BENCH.j-.30,i+.08,BENCH.j+.30,0,BENCH.top-.4,rgb('#9e7c58'),rgb('#6b5239'),rgb('#4e3b28'));
      isoBox(i-.07,BENCH.j-.32,i+.07,BENCH.j+.32,2.0,2.5,rgb('#a8845e'),rgb('#6e553c'),rgb('#503d2a'));
    }
    isoBox(t1+.08,BENCH.j-.05,t2-.08,BENCH.j+.05,0.9,1.4,rgb('#9e7c58'),rgb('#6b5239'),rgb('#4e3b28'));
    stroke(t1+.08,BENCH.j,1.4,t2-.08,BENCH.j,BENCH.top-.5,rgb('#5a4430'));
    stroke(t1+.08,BENCH.j,BENCH.top-.5,t2-.08,BENCH.j,1.4,rgb('#5a4430'));
    isoBox(BENCH.i0+.2,BENCH.j-.33,BENCH.i0+2.0,BENCH.j+.33,BENCH.top-.45,BENCH.top,rgb('#cba275'),rgb('#886444'),rgb('#6e4e30'));
    thin(BENCH.i0+.25,BENCH.j-.15,BENCH.top,BENCH.i0+1.95,BENCH.j-.15,BENCH.top,rgb('#b38b5f'));
    thin(BENCH.i0+.25,BENCH.j+.15,BENCH.top,BENCH.i0+1.95,BENCH.j+.15,BENCH.top,rgb('#b38b5f'));
    stroke(BENCH.cut,BENCH.j-.33,BENCH.top,BENCH.cut,BENCH.j+.33,BENCH.top,rgb('#38281a'));
    thin(BENCH.cut-.25,BENCH.j-.18,BENCH.top,BENCH.cut+.1,BENCH.j+.12,BENCH.top,rgb('#e0be88'));
  });

  // Offcut bin with accumulated cut wood blocks and deck sawdust
  add(BIN.i,BIN.j,()=>{
    crate(BIN.i,BIN.j,BIN.w,BIN.d,BIN.h);
    isoBox(BIN.i+.06,BIN.j+.08,BIN.i+.38,BIN.j+.26,BIN.h,BIN.h+.45,rgb('#cba275'),rgb('#886444'),rgb('#5e432a'));
    isoBox(BIN.i+.16,BIN.j+.24,BIN.i+.44,BIN.j+.48,BIN.h,BIN.h+.55,rgb('#c29b6f'),rgb('#7f5f3e'),rgb('#523a23'));
    stroke(BIN.i+.1,BIN.j+.14,BIN.h+.45,BIN.i+.38,BIN.j+.42,BIN.h+.8,rgb('#d2a878'));
    thin(BIN.i+.1,BIN.j+.14,BIN.h+.65,BIN.i+.38,BIN.j+.42,BIN.h+1.0,rgb('#dfb88c'));
    thin(BIN.i-.1,BIN.j+.1,0.05,BIN.i+.2,BIN.j+.65,0.05,rgb('#dfb76c'));
    thin(BIN.i,BIN.j-.12,0.05,BIN.i+.35,BIN.j+.35,0.05,rgb('#e8c68a'));
  });

  const f=L.fisher;
  if(f.rod.propped){
    add(49.6,24.8,()=>{
      stroke(...f.rod.butt,...f.rod.mid,C.woodDark);
      thin(...f.rod.mid,...f.rod.tip,C.woodLight);
      rope(f.rod.tip,f.float,.1,C.rope);
      if(!f.floatUnder) cyl(f.float[0],f.float[1],.035,f.float[2],f.float[2]+.5,()=>rgb('#b74432'),()=>rgb('#eee2c0'));
    });
  }
  add(f.P.i,f.P.j,()=>{
    person(f,['#34302a','#544a3b','#766853']);
    if(!f.rod.propped){
      stroke(...f.rod.butt,...f.rod.mid,C.woodDark);
      thin(...f.rod.mid,...f.rod.tip,C.woodLight);
      rope(f.rod.tip,f.float,.1,C.rope);
      if(!f.floatUnder) cyl(f.float[0],f.float[1],.035,f.float[2],f.float[2]+.5,()=>rgb('#b74432'),()=>rgb('#eee2c0'));
      if(f.fish) stroke(...f.fish.head,...f.fish.tail,rgb('#a7b6ad'));
    }
    if(f.pee&&f.pee.stream){
      const stream=f.pee.stream, C_STREAM=rgb('#e5c158');
      for(let k=0;k<stream.length-1;k++) thin(stream[k][0],stream[k][1],stream[k][2],stream[k+1][0],stream[k+1][1],stream[k+1][2],C_STREAM);
      if(f.pee.impact){
        const [ix,iy,iz]=f.pee.impact, r=.15+.05*Math.sin(t*.4);
        thin(ix-r,iy,iz,ix+r,iy,iz,C.waterHi);
        thin(ix,iy-r,iz,ix,iy+r,iz,C.waterHi);
        thin(ix,iy,iz,ix+.04,iy+.02,iz+.4,C.waterHi);
        thin(ix,iy,iz,ix-.03,iy+.04,iz+.35,C.waterHi);
      }
    }
  });
  const pub=L.pub; add(pub.a.P.i,pub.a.P.j,()=>person(pub.a,['#34302a','#544a3b','#766853'])); add(pub.b.P.i,pub.b.P.j,()=>person(pub.b,['#292e2d','#45504a','#687264']));
  add(pub.mug.bottom[0],pub.mug.bottom[1],()=>vessel(pub.mug,'mug')); add(pub.bottle.bottom[0],pub.bottle.bottom[1],()=>vessel(pub.bottle,'mug'));
  add(JUG_SPOT[0],JUG_SPOT[1],()=>vessel({bottom:JUG_SPOT,up:[0,0,1]},'mug'));
  add(L.loner.P.i,L.loner.P.j,()=>{ const ln=L.loner, c=ln.cig, tip=[c.bottom[0]+c.up[0]*1.4/7.5,c.bottom[1]+c.up[1]*1.4/7.5,c.bottom[2]+c.up[2]*1.4];
    person(ln,['#262929','#41413a','#625d4c']); cigarette(c,ln.drag);
    smoke(tip[0],tip[1],tip[2],t,5,6,380,SMOKE_PALE,.55+.3*ln.drag);
    if(ln.exhale){ const m=ln.mouth; smoke(m[0],m[1],m[2],t,9,10,230,SMOKE_PALE,.9); } });
  const mu=L.musician; add(mu.P.i,mu.P.j,()=>{ person(mu,['#2a272b','#4b3f46','#6f6168']); concertina(mu); });
  add(L.keeper.P.i,L.keeper.P.j,()=>{person(L.keeper,['#322c23','#564637','#75634d']); for(const p of L.keeper.mugs) vessel({bottom:p,up:[0,0,1]},'mug'); vessel(L.keeper.held,'mug');});

  // Falling offcut severed from the timber deal on the 12th stroke
  const woodOff=L.yard.wood.offcut;
  if(woodOff&&woodOff.state==='FALLING'){
    const drop=woodOff.drop||0, ang=woodOff.ang||0, offLen=0.35;
    const ci=BENCH.cut+(Math.cos(ang)*offLen)/2, cj=BENCH.j;
    const cz=BENCH.top+PLANK.raw.th-drop-Math.sin(ang)*offLen*7.5;
    add(ci,cj,()=>isoBox(ci-.12,cj-.10,ci+.12,cj+.10,Math.max(BIN.h,cz-.55),Math.max(BIN.h+.55,cz),rgb('#cba275'),rgb('#886444'),rgb('#5e432a')));
  }

  // Timber yard characters
  for(const a of [L.yard.wood,L.yard.hand,L.yard.fore]){
    // Fix floating handler glitch when inside warehouse (behind wall j = 4.5)
    if(a.id==='handler'&&(a.state==='INSIDE'||(a.dark||0)>0.85)) continue;

    add(a.P.i,a.P.j,()=>{
      // Differentiated clothing palettes
      let outfit=['#302b24','#554737','#796448'];
      if(a.id==='woodworker') outfit=['#4a4539','#7d7463','#aba08c']; // light linen shirt / apron
      else if(a.id==='handler') outfit=['#1e2329','#2f3740','#4a5460']; // heavy docker navy/grey
      else if(a.id==='foreman') outfit=['#2e1f18','#52372a','#785340']; // tallyman waistcoat / vest
      person(a,outfit);

      // Carried or bench board
      board(a.board);

      // Woodworker hand saw with shaped handle, metallic blade, teeth and push-stroke sawdust
      if(a.saw){
        const q=a.saw.handle||[SAW_REST.i,SAW_REST.j,SAW_REST.z], d=a.saw.dir||SAW_REST.dir, bladeLen=6.2;
        const tip=[q[0]+d[0]*bladeLen/7.5,q[1]+d[1]*bladeLen/7.5,q[2]+d[2]*bladeLen];
        stroke(q[0],q[1],q[2]-.35,q[0],q[1],q[2]+.35,rgb('#543922'));
        thin(q[0],q[1],q[2],q[0]+d[0]*.4/7.5,q[1]+d[1]*.4/7.5,q[2],rgb('#c89e43'));
        stroke(q[0],q[1],q[2]+.12,tip[0],tip[1],tip[2]+.05,rgb('#d2d7da'));
        stroke(q[0],q[1],q[2]-.18,tip[0],tip[1],tip[2]-.08,rgb('#8e9599'));
        thin(q[0],q[1],q[2]-.32,tip[0],tip[1],tip[2]-.15,rgb('#4a5054'));
        thin(q[0]+d[0]*1.5/7.5,q[1]+d[1]*1.5/7.5,q[2]+d[2]*1.5,q[0]+d[0]*4.2/7.5,q[1]+d[1]*4.2/7.5,q[2]+d[2]*4.2,rgb('#f4f6f7'));

        // Fine sawdust particles during push saw strokes
        if(a.state==='SAW'&&a.u>=0.09&&a.u<0.90){
          const v=(a.u-0.09)/0.81;
          if(v<0.46||v>0.54){
            const act=(v<0.46?v:v-0.08)/0.92, st=(act*12)%1;
            if(st<0.55){
              const kx=BENCH.cut, ky=BENCH.j, kz=BENCH.top+PLANK.raw.th;
              const pushU=st/0.55, spread=Math.sin(pushU*Math.PI);
              thin(kx,ky-.08,kz-.1,kx+.05*spread,ky-.12,kz-.9*spread,rgb('#e8c68a'));
              thin(kx+.02,ky,kz,kx+.12*spread,ky+.04,kz-1.4*spread,rgb('#dfb76c'));
              thin(kx-.02,ky+.06,kz-.1,kx+.08*spread,ky+.14,kz-1.1*spread,rgb('#f0d199'));
            }
          }
        }
      }

      // Foreman props: leather-bound ledger, graphite pencil, boxwood folding rule
      if(a.id==='foreman'){
        if(a.book&&a.book.at){
          const [bx,by,bz]=a.book.at;
          isoBox(bx-.08,by-.06,bx+.08,by+.06,bz-.25,bz+.25,rgb('#dfd7c2'),rgb('#422818'),rgb('#2e1b10'));
          thin(bx-.08,by-.06,bz,bx-.08,by+.06,bz,rgb('#6b1d1d'));
          if(a.pencil&&a.pencil.state==='IN_BOOK') thin(bx-.02,by+.06,bz+.1,bx-.02,by+.13,bz+.15,rgb('#2c2d30'));
        }
        if(a.pencil&&a.pencil.state==='HELD_BY_NPC'&&a.pencil.at){
          const [px,py,pz]=a.pencil.at;
          thin(px,py,pz,px+.06,py-.04,pz-.38,rgb('#b5894b'));
          thin(px+.06,py-.04,pz-.38,px+.07,py-.05,pz-.45,rgb('#28292b'));
        }
        if(a.rule&&a.rule.at){
          const [rx,ry,rz]=a.rule.at, open=a.rule.open||0;
          const BOXWOOD=rgb('#dfb76c'), BRASS=rgb('#c89e43');
          if(open<0.25){
            stroke(rx,ry,rz,rx+.08,ry-.04,rz-.12,BOXWOOD);
            thin(rx,ry,rz,rx+.08,ry-.04,rz-.12,BRASS);
          } else {
            const seg=0.22*open;
            stroke(rx,ry,rz,rx+seg,ry,rz,BOXWOOD);
            thin(rx+seg,ry,rz-.05,rx+seg,ry,rz+.15,BRASS);
            stroke(rx+seg,ry,rz,rx+seg*2,ry,rz,BOXWOOD);
            thin(rx+seg*2,ry,rz-.05,rx+seg*2,ry,rz+.15,BRASS);
          }
        }
      }
    });
  }
  return out;
}
