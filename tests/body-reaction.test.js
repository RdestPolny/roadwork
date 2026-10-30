import test from 'node:test';
import assert from 'node:assert/strict';
import {BODY_HIT_SECONDS, bodyHitMotion} from '../src/body-reaction.js';

const magnitude = r => r.fold + r.knees + r.cover;

test('body impact begins without teleporting bones and settles completely', () => {
  const d = BODY_HIT_SECONDS;
  assert.deepEqual(bodyHitMotion(d, d), {fold:0, knees:0, cover:0});
  assert.deepEqual(bodyHitMotion(0, d), {fold:0, knees:0, cover:0});
  assert.deepEqual(bodyHitMotion(-1, d), {fold:0, knees:0, cover:0});
  assert.deepEqual(bodyHitMotion(NaN, d), {fold:0, knees:0, cover:0});
  assert.deepEqual(bodyHitMotion(d, 0), {fold:0, knees:0, cover:0});
});

test('abdomen reacts before the legs and elbow cover; all recover smoothly', () => {
  const d = BODY_HIT_SECONDS;
  const early = bodyHitMotion(d * 0.88, d);
  const mid = bodyHitMotion(d * 0.62, d);
  const late = bodyHitMotion(d * 0.12, d);
  assert.ok(early.fold > early.knees && early.knees > early.cover);
  assert.ok(mid.fold > 0.5 && mid.knees > 0.5 && mid.cover > 0);
  assert.ok(late.fold < mid.fold && late.knees < mid.knees && late.cover < mid.cover);
  for(let i=0; i<=120; i++) {
    const frame = bodyHitMotion(d*(1-i/120), d);
    for(const v of Object.values(frame)) assert.ok(Number.isFinite(v) && v>=0 && v<=1.55);
  }
});

test('guarded body shots react less than clean hits; power scales response', () => {
  const remaining = BODY_HIT_SECONDS * 0.62;
  const clean = bodyHitMotion(remaining, BODY_HIT_SECONDS, 1);
  const blocked = bodyHitMotion(remaining, BODY_HIT_SECONDS, 1, true);
  const powerful = bodyHitMotion(remaining, BODY_HIT_SECONDS, 1.4);
  assert.ok(magnitude(blocked) < magnitude(clean));
  assert.ok(magnitude(powerful) > magnitude(clean));
});
