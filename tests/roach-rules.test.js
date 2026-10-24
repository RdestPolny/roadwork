import test from 'node:test';
import assert from 'node:assert/strict';
import {KINDS, SURFACE, roachContact, missCost, killPoints} from '../src/roach-rules.js';
import {DRILLS, sessionScore} from '../src/training-data.js';

test('the knuckles squash a roach under them, graze one at their edge and miss one beside them', () => {
  const r={x:50,y:40,a:0,kind:KINDS.black};
  assert.equal(roachContact(50,40,r),'clean');
  assert.equal(roachContact(50+KINDS.black.len*0.45+4.5,40,r),'graze','only the tail end under the edge');
  assert.equal(roachContact(50,40+KINDS.black.wid*0.95+3,r),'graze','a leg under the knuckles');
  assert.equal(roachContact(50,52,r),'');
  assert.equal(roachContact(70,40,r),'');
  const up={...r,a:Math.PI/2};
  assert.equal(roachContact(50,44,up),'graze','heading turns the body: running up the wall it pokes out of the short side');
});

test('a miss hurts by surface, iron most; a hand at 90 cools down half as long again', () => {
  assert.deepEqual(missCost(SURFACE.lime,0),{pain:12,cool:70});
  assert.deepEqual(missCost(SURFACE.brick,20),{pain:38,cool:100});
  assert.deepEqual(missCost(SURFACE.iron,0),{pain:30,cool:150});
  assert.deepEqual(missCost(SURFACE.brick,92),{pain:100,cool:150});
});

test('kills on the run pay half again; the roach session scores hits, clean kills and pain', () => {
  assert.equal(killPoints(KINDS.prusak,0.9),1.5);
  assert.equal(killPoints(KINDS.big,0.2),3);
  const d=DRILLS.roach;
  const best=sessionScore(d,{strikes:12,kills:12,clean:12,points:12,painMax:0},1);
  assert.equal(best.grade,'S');
  const sloppy=sessionScore(d,{strikes:30,kills:12,clean:6,points:12,painMax:80},1);
  assert.ok(sloppy.score<best.score*0.6,`blind punching pays badly: ${sloppy.score}`);
  assert.equal(sessionScore(d,{},1).score,0,'no strikes, no score');
});
