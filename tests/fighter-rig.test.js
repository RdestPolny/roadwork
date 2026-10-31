import test from 'node:test';
import assert from 'node:assert/strict';
import {RIG,hipSocket,shoulderSocket,buildSpine,headSocket,supportPelvis,legAnchors,kneePole,fitPlantedFoot,fixBoneLength} from '../src/fighter-rig.js';
import {solveLimb,ARM_UPPER,ARM_FORE,strikeArmTargets,elbowAngle} from '../src/combat-anatomy.js';

const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const near=(a,b,eps=1e-5)=>assert.ok(Math.abs(a-b)<eps,`expected ${a} ≈ ${b}`);
const feet=()=>({1:[1.5,1.7,.9],'-1':[-1.3,-1.7,.9]});

test('anatomical sockets keep a mirrored, constant-width pelvis and shoulder girdle at every yaw',()=>{
  const pelvis=[0,0,5.6],chest=[.4,0,11.15];
  for(const yaw of [-1.35,-1,-.6,0,.6,1,1.35]){
    const hipL=hipSocket(pelvis,-1,yaw),hipR=hipSocket(pelvis,1,yaw);
    const shL=shoulderSocket(chest,-1,yaw),shR=shoulderSocket(chest,1,yaw);
    near(dist(hipL,hipR),RIG.hipHalf*2);
    near(dist(shL,shR),RIG.shoulderHalf*2);
    near(hipL[2],hipR[2]);
    near(shL[2],shR[2]);
    near((hipL[0]+hipR[0])/2,pelvis[0]+.27);
    near((shL[0]+shR[0])/2,chest[0]-.2);
  }
});

test('abdomen and thoracic spine do not stretch through punches, slips or gut impact',()=>{
  const pel=[.25,-.2,5.6];
  for(const lean of [-3.5,-2,-1,0,1,2.5,4])
    for(const sideLean of [-3,0,3])
      for(const fold of [0,.3,.65,1,1.15])
        for(const lunge of [0,1,1.8]){
          const S=buildSpine(pel,{lean,sideLean,fold,lunge});
          near(dist(S.pelvis,S.abdomen),RIG.lowerSpine);
          near(dist(S.abdomen,S.chest),RIG.upperSpine);
          for(const p of [S.pelvis,S.abdomen,S.chest])
            assert.ok(p.every(Number.isFinite));
          assert.ok(S.chest[2]>S.abdomen[2] && S.abdomen[2]>pel[2]);
        }
});

test('an abdominal strike folds at the waist instead of pushing a rigid torso around',()=>{
  const pelvis=[0,0,5.5];
  const rest=buildSpine(pelvis,{lean:.35,fold:0});
  const hit=buildSpine(pelvis,{lean:.35,fold:1.1});
  assert.ok(hit.abdomen[0]<rest.abdomen[0],'abdomen withdraws from incoming punch');
  assert.ok(hit.chest[0]>rest.chest[0],'ribcage folds forward');
  near(dist(hit.abdomen,hit.chest),dist(rest.abdomen,rest.chest));
});

test('chin tuck, shock and slips keep head at its neck attachment',()=>{
  const chest=[0.2,0.8,11.3];
  for(const hint of [[0,0,14.7],[8,5,11.3],[-10,-4,-12],[.7,1.4,17]]){
    const head=headSocket(chest,hint);
    near(dist(chest,head),RIG.neckToHead);
    assert.ok(head[2]>chest[2]);
    assert.ok(Math.abs(head[0]-chest[0])<1.15);
    assert.ok(Math.abs(head[1]-chest[1])<1);
  }
});

test('planted feet constrain leg reach and preserve exactly the original floor z',()=>{
  for(const yaw of [-1,-.5,0,.5,1]){
    for(const x of [-2,0,1.5,3.5]){
      const set=feet(),pelvis=supportPelvis([x,0,6.6],set,yaw);
      const legs=legAnchors(pelvis,set,yaw);
      for(const side of [-1,1]){
        const leg=legs[side];
        near(leg.foot[2],set[side][2]);
        assert.ok(dist(leg.hip,leg.foot)<RIG.legUpper+RIG.legLower);
        const [knee,ankle]=solveLimb(leg.hip,leg.foot,RIG.legUpper,RIG.legLower,leg.pole);
        near(dist(leg.hip,knee),RIG.legUpper);
        near(dist(knee,ankle),RIG.legLower);
        near(ankle[2],set[side][2],0.01);
      }
    }
  }
});

test('the airborne swing shoe does not lower the pelvis as a false support foot',()=>{
  const p=[0,0,6.6],ground=feet(),air=feet();
  air[-1][2]=3.0;
  const single={1:ground[1]};
  const withAir=supportPelvis(p,air,0);
  const fromSingle=supportPelvis(p,single,0);
  near(withAir[2],fromSingle[2]);
});

test('large dash strides drag a shoe horizontally if required but never float or stretch the shin',()=>{
  const hip=[2.1,1.2,5.85],shoe=[-9,1.7,.9];
  const target=fitPlantedFoot(hip,shoe);
  near(target[2],shoe[2]);
  assert.ok(target[0]>shoe[0]);
  const [knee,ankle]=solveLimb(hip,target,RIG.legUpper,RIG.legLower,kneePole(hip,target,1));
  near(dist(hip,knee),RIG.legUpper);
  near(dist(knee,ankle),RIG.legLower);
  near(ankle[2],shoe[2],0.01);
});

test('a striking hook preserves its elbow plane after mirrored shoulder and hip twists',()=>{
  const basePel=[0,0,5.55];
  const S=buildSpine(basePel,{lean:1.1,lunge:1.8});
  for(const yaw of [-.9,-.5,.5,.9]){
    for(const side of [-1,1]){
      const sh=shoulderSocket(S.chest,side,yaw,.9);
      const start=[sh[0]+2.1,sh[1]-side*1.2,sh[2]+1.3];
      const pole=[sh[0]+.6,sh[1]+side*.2,sh[2]-1.7];
      const end=strikeArmTargets(2,side,sh,start,pole,1,0,false);
      const [el,hand]=solveLimb(sh,end.hand,ARM_UPPER,ARM_FORE,end.pole);
      const a=elbowAngle(sh,el,hand);
      assert.ok(a>=85&&a<=100,`hook elbow = ${a}`);
      near(sh[2],el[2]);
      near(el[2],hand[2]);
      near(dist(sh,el),ARM_UPPER);
      near(dist(el,hand),ARM_FORE);
    }
  }
});

test('getting up never shrinks a spine or neck segment during interpolation',()=>{
  const pel=[0,0,3.5],abd=[-1,0,6],chest=[-3,0,7],head=[-4,.4,8];
  const ab=fixBoneLength(pel,abd,RIG.lowerSpine);
  const ch=fixBoneLength(ab,chest,RIG.upperSpine);
  const hd=fixBoneLength(ch,head,RIG.neckToHead);
  near(dist(pel,ab),RIG.lowerSpine);
  near(dist(ab,ch),RIG.upperSpine);
  near(dist(ch,hd),RIG.neckToHead);
});
