import test from 'node:test';
import assert from 'node:assert/strict';
import {ARM_UPPER,ARM_FORE,solveLimb,strikeArmTargets,elbowAngle} from '../src/combat-anatomy.js';

const length=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]));

test('jab, cross, hook, uppercut preserve both bone lengths through windup, impact and recovery',()=>{
  const sh=[1.2,2.4,11.7];
  for(const side of [-1,1])for(const low of [false,true])for(const punch of [0,1,2,3]){
    for(const k of [0,0.15,0.35,0.6,0.85,1]){
      const restHand=[sh[0]+1.8,sh[1]-side*1.25,sh[2]+1.6];
      const restPole=[sh[0]+0.5,sh[1]+side*0.2,sh[2]-1.6];
      const {hand,pole}=strikeArmTargets(punch,side,sh,restHand,restPole,k,Math.sin(Math.PI*k),low);
      const [el,end]=solveLimb(sh,hand,ARM_UPPER,ARM_FORE,pole);
      assert.ok(Math.abs(length(sh,el)-ARM_UPPER)<1e-4);
      assert.ok(Math.abs(length(el,end)-ARM_FORE)<1e-4);
      assert.ok(length(sh,hand)<ARM_UPPER+ARM_FORE,`punch ${punch} low=${low} phase=${k}: target unreachable`);
      assert.ok(Number.isFinite(elbowAngle(sh,el,end)));
    }
  }
});

test('hook lands with shoulder-height elbow, a horizontal forearm and an almost right-angle joint',()=>{
  for(const side of [-1,1]){
    const sh=[3.5,side*1.2,11.0],restHand=[4.5,side*0.8,13],restPole=[3.7,side*2.4,9];
    const {hand,pole}=strikeArmTargets(2,side,sh,restHand,restPole,1,0,false);
    const [el,end]=solveLimb(sh,hand,ARM_UPPER,ARM_FORE,pole);
    assert.ok(Math.abs(el[2]-sh[2])<1e-7);
    assert.ok(Math.abs(end[2]-el[2])<1e-7);
    const angle=elbowAngle(sh,el,end);
    assert.ok(angle>=85&&angle<=100,`elbow angle ${angle.toFixed(1)} degrees`);
    assert.ok(side*(el[1]-sh[1])>1.7,'hook upper arm must open to punching side');
  }
});

test('uppercut chambers below its guard, then ascends without fully straightening the arm',()=>{
  for(const side of [-1,1]){
    const sh=[2,side,12],restHand=[3,0,13],restPole=[3,side*3,10];
    const mid=strikeArmTargets(3,side,sh,restHand,restPole,.35,1,false);
    const end=strikeArmTargets(3,side,sh,restHand,restPole,1,0,false);
    assert.ok(mid.hand[2]<restHand[2]);
    assert.ok(end.hand[2]>mid.hand[2]);
    const [el,tip]=solveLimb(sh,end.hand,ARM_UPPER,ARM_FORE,end.pole);
    assert.ok(elbowAngle(sh,el,tip)>75 && elbowAngle(sh,el,tip)<110);
  }
});

test('punch endpoints follow shoulder translation/rotation without changing bone lengths',()=>{
  for(const punch of [0,1,2,3])for(const side of [-1,1]){
    const s1=[1,side*2,11],s2=[4,side*0.5,12.5];
    const a=strikeArmTargets(punch,side,s1,[3,side,13],[2,side*3,10],1,0);
    const b=strikeArmTargets(punch,side,s2,[3,side,13],[2,side*3,10],1,0);
    for(let i=0;i<3;i++)assert.ok(Math.abs((b.hand[i]-a.hand[i])-(s2[i]-s1[i]))<1e-8);
    const [el,end]=solveLimb(s2,b.hand,ARM_UPPER,ARM_FORE,b.pole);
    assert.ok(Math.abs(length(s2,el)-ARM_UPPER)<1e-4);
    assert.ok(Math.abs(length(el,end)-ARM_FORE)<1e-4);
  }
});


test('straight punches extend close to full reach without hyperextension',()=>{
  for(const punch of [0,1])for(const side of [-1,1]){
    const sh=[.45,side*2.7,11.35],restHand=[2.65,side*1.25,12.95],restPole=[1,side*2.6,9.85];
    const {hand,pole}=strikeArmTargets(punch,side,sh,restHand,restPole,1,0,false);
    const [el,tip]=solveLimb(sh,hand,ARM_UPPER,ARM_FORE,pole);
    const a=elbowAngle(sh,el,tip);
    assert.ok(a>=145 && a<=165,`straight ${punch}, side ${side}: elbow ${a.toFixed(1)} degrees`);
  }
});
