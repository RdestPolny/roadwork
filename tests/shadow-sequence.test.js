import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSequence,enqueueAction,beginAction,finishAction,nextSequenceCombo,tickSequence } from '../src/shadow-sequence.js';
import { inputTime } from '../src/time.js';

test('ordered inputs queue without free progress; extra input and repeated finishes give nothing',()=>{
  const S=createSequence([['J','bC','SL'],['DF','P']]);
  assert.equal(enqueueAction(S,'J',0),'accepted');
  assert.equal(beginAction(S),'J');
  assert.equal(beginAction(S),null);
  assert.equal(enqueueAction(S,'bC',200),'accepted');
  assert.equal(enqueueAction(S,'SL',400),'accepted');
  assert.equal(S.completed,0);
  const before=structuredClone(S);
  assert.equal(enqueueAction(S,'U',420),'ignored');
  assert.deepEqual(S,before);
  assert.equal(nextSequenceCombo(S),false);
  assert.equal(finishAction(S),'J');
  assert.equal(finishAction(S),null);
  assert.equal(beginAction(S),'bC'); finishAction(S);
  assert.equal(beginAction(S),'SL'); finishAction(S);
  assert.equal(S.completed,3); assert.equal(S.between,true); assert.equal(S.comboIndex,0);
  assert.equal(enqueueAction(S,'DF',500),'ignored');
  assert.equal(nextSequenceCombo(S),true); assert.equal(S.comboIndex,1);
  for(const token of S.current){enqueueAction(S,token,1000);beginAction(S);finishAction(S);}
  assert.equal(nextSequenceCombo(S),false); assert.equal(S.finished,true);
  assert.equal(enqueueAction(S,'DF',2000),'ignored'); assert.equal(finishAction(S),null);
});

test('wrong queued action resets completed and active progress in the same combo',()=>{
  const S=createSequence([['J','C','H','U'],['D']]);
  enqueueAction(S,'J',0); beginAction(S); finishAction(S);
  enqueueAction(S,'C',200); beginAction(S);
  enqueueAction(S,'H',400); tickSequence(S,500);
  assert.ok(S.pace>1);
  assert.equal(enqueueAction(S,'J',550),'wrong');
  assert.equal(S.comboIndex,0); assert.equal(S.completed,0); assert.equal(S.failures,1);
  assert.equal(S.active,null); assert.deepEqual(S.queue,[]); assert.equal(S.between,false);
  assert.equal(S.pace,1); assert.equal(S.targetPace,1); assert.equal(S.lastInput,null);
  assert.equal(finishAction(S),null);
  assert.equal(enqueueAction(S,'J',560),'accepted'); assert.equal(S.targetPace,1);
});

test('manual cadence raises smooth bounded pace, while deliberate input and idle lower it',()=>{
  const S=createSequence([Array(12).fill('J')]);
  enqueueAction(S,'J',0); assert.equal(S.pace,1); assert.equal(S.targetPace,1);
  enqueueAction(S,'J',250); assert.equal(S.targetPace,1.8); assert.equal(S.pace,1);
  enqueueAction(S,'J',400); assert.equal(S.targetPace,2); assert.ok(S.pace>1&&S.pace<1.8);
  tickSequence(S,800); assert.ok(S.pace>1.8&&S.pace<2);
  enqueueAction(S,'J',1050); assert.equal(S.targetPace,1);
  tickSequence(S,1350); assert.ok(S.pace<S.bestPace);
  enqueueAction(S,'J',1400); enqueueAction(S,'J',1550);
  tickSequence(S,2650); assert.ok(S.pace>1.7);
  tickSequence(S,2750); assert.equal(S.targetPace,1);
  tickSequence(S,4250); assert.ok(S.pace<1.01); assert.ok(S.bestPace<=2);
  assert.equal(S.completed,0); assert.equal(S.failures,0);
});

test('pause uses a frozen shared clock and neither boosts nor decays cadence',()=>{
  const S=createSequence([Array(8).fill('J')]);
  enqueueAction(S,'J',0); enqueueAction(S,'J',200); tickSequence(S,300);
  const before=structuredClone(S);
  tickSequence(S,inputTime(300,0,300,60000,true));
  assert.deepEqual(S,before);
  const resumed=inputTime(300,0,60000,60050,false);
  enqueueAction(S,'J',resumed); assert.equal(S.targetPace,2);
  tickSequence(S,400); assert.ok(S.pace>before.pace);
});
