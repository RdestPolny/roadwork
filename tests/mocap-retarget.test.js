import test from 'node:test';
import assert from 'node:assert/strict';
import {RIG} from '../src/fighter-rig.js';
import {ARM_UPPER,ARM_FORE} from '../src/combat-anatomy.js';
import {clipScales,retargetFrame,sampleClip,clipDuration,mocapJoints} from '../src/mocap-retarget.js';

const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const near=(a,b,eps=1e-4)=>assert.ok(Math.abs(a-b)<eps,`expected ${a} ≈ ${b}`);

/** A 1.7-unit stance: x forward, y left, z up, ankles at z=0. `reach` extends the left fist. */
const pose=(reach=0.3)=>({
  pel:[0,0,0.95],abd:[0.02,0,1.15],head:[0.1,0,1.62],
  shL:[0,0.2,1.45],shR:[0,-0.2,1.45],elL:[0.1,0.3,1.2],elR:[0.1,-0.3,1.2],hdL:[0.1+reach,0.15,1.4],hdR:[0.3,-0.15,1.4],
  wrL:[0.1+reach*0.8,0.15,1.38],wrR:[0.28,-0.15,1.38],
  hipL:[0,0.1,0.9],hipR:[0,-0.1,0.9],knL:[0.1,0.12,0.5],knR:[0.1,-0.12,0.5],anL:[0.1,0.14,0],anR:[-0.2,-0.14,0]
});
const clip={format:'roadwork-mocap-1',fps:30,frames:[pose(0.1),pose(0.62)]};

test('retargeted bones keep the rig lengths whatever the clip does',()=>{
  const f=mocapJoints(clip,1/60);
  near(dist(f.pel,f.abd),RIG.lowerSpine);near(dist(f.abd,f.chest),RIG.upperSpine);near(dist(f.chest,f.head),RIG.neckToHead);
  for(const s of [-1,1]){
    const j=f(s);
    near(dist(j.sh,j.el),ARM_UPPER);near(dist(j.el,j.hd),ARM_FORE);
    near(dist(j.hip,j.knee),RIG.legUpper);near(dist(j.knee,j.foot),RIG.legLower);
  }
  near(dist(f(1).sh,f(-1).sh),RIG.shoulderHalf*2);near(dist(f(1).hip,f(-1).hip),RIG.hipHalf*2);
});

test('the punching hand extends with the clip and the other side stays in guard',()=>{
  const a=mocapJoints(clip,0),b=mocapJoints(clip,clipDuration(clip));
  const reach=(f,s)=>dist(f(s).sh,f(s).hd);
  assert.ok(reach(b,1)>reach(a,1)+1.5,'captured left fist extends from shoulder');
  near(reach(b,-1),reach(a,-1),0.05);
  assert.ok(b(1).hd[0]>b(1).sh[0]+3,'fist is in front of the shoulder');
});

test('ankles stay on the floor line and plus side picks the captured hand',()=>{
  const f=mocapJoints(clip,0);
  near(f(1).foot[2],RIG.footHeight);near(f(-1).foot[2],RIG.footHeight);
  const swapped=mocapJoints(clip,clipDuration(clip),{plus:'R'});
  assert.ok(swapped(-1).hd[0]>swapped(-1).sh[0]+3,'plus:R sends the left fist to rig side -1');
  assert.ok(f(1).sh[1]>f(-1).sh[1]);
});

test('sampleClip interpolates, clamps and loops',()=>{
  const half=sampleClip(clip,clipDuration(clip)/2);
  near(half.hdL[0],(0.2+0.72)/2);
  near(sampleClip(clip,99).hdL[0],0.72);
  near(sampleClip(clip,clipDuration(clip)*2,true).hdL[0],0.2);
  const sc=clipScales(clip.frames[0]);assert.ok(sc.arm>0&&sc.leg>0);
  assert.ok(retargetFrame(clip.frames[0],sc).pel.every(Number.isFinite));
});
