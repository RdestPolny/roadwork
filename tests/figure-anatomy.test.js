import test from 'node:test';
import assert from 'node:assert/strict';
import {HEAD_SCALE,FIGURE_PART_CAPACITY,figureProportions,headDetailPoint} from '../src/figure-anatomy.js';

test('HD figure has adequate geometry budget for detailed hairstyles, faces, clothes and joints',()=>{
  assert.ok(FIGURE_PART_CAPACITY>=56);
  assert.ok(FIGURE_PART_CAPACITY<128); // used by indexed sort buffers
});

test('normal fighter has a narrower head, tapered limbs and a defined waist, without moving any joint',()=>{
  const p=figureProportions({style:'crop'});
  assert.equal(p.heavy,false);
  assert.ok(HEAD_SCALE>=0.8&&HEAD_SCALE<1);
  assert.ok(p.headRadius<1.75);
  assert.ok(p.chest>p.ribs&&p.ribs>p.waist);
  assert.ok(p.pelvis>p.waist);
  assert.ok(p.upperArm>p.elbow);
  assert.ok(p.forearm>p.wrist);
  assert.ok(p.thigh>p.knee);
  assert.ok(p.calf>p.ankle);
  assert.ok(p.fist>p.wrist);
  // 3D silhouettes are in legacy units; the upper end of the head is near z=16.6.
  const visibleHeight=15.6-0.6+p.headRadius;
  assert.ok(visibleHeight/(2*p.headRadius)>5);
});

test('Bull remains a heavy, large-headed character with broad arms and a larger abdomen',()=>{
  const slender=figureProportions({style:'crop'});
  const bull=figureProportions({bodyType:'heavy'});
  for(const prop of ['headRadius','neckLower','upperArm','forearm','thigh','calf','belly','chest']){
    assert.ok(bull[prop]>slender[prop],`expected larger ${prop}`);
  }
  const custom=figureProportions({bodyType:'heavy',bulk:{belly:1.9,head:1.1}});
  assert.ok(custom.belly>bull.belly);
  assert.ok(custom.headRadius<bull.headRadius);
});

test('bad custom body proportions fall back to finite, bounded values',()=>{
  const p=figureProportions({bodyType:'heavy',bulk:{belly:Infinity,arms:-10,chest:NaN,head:100}});
  for(const [k,v] of Object.entries(p)){
    if(typeof v==='number')assert.ok(Number.isFinite(v)&&v>0,`bad ${k}: ${v}`);
  }
});

test('head detail offsets contract with the skull in all directions, preserving the head pivot',()=>{
  const center=[2,-1,15.6],point=[1.8,0.65,-0.8],out=headDetailPoint(center,...point);
  for(let i=0;i<3;i++)assert.ok(Math.abs((out[i]-center[i])-point[i]*HEAD_SCALE)<1e-9);
  assert.deepEqual(headDetailPoint(center,0,0,0),center);
});
