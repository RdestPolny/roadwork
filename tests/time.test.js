import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceFixed, inputTime } from '../src/time.js';

test('fixed time advances only in whole steps and caps long background gaps', () => {
  let ticks = 0;
  const update = () => ticks++;
  let acc = advanceFixed(0, 25, 10, update);
  assert.equal(ticks, 2); assert.equal(acc, 5);
  acc = advanceFixed(acc, 5, 10, update);
  assert.equal(ticks, 3); assert.equal(acc, 0);
  advanceFixed(acc, 10000, 10, update);
  assert.equal(ticks, 28);
  assert.throws(() => advanceFixed(0, 10, 0, update), RangeError);
  assert.throws(() => advanceFixed(0, NaN, 10, update), RangeError);
});

test('input time freezes during pause and retains sub-frame precision', () => {
  assert.equal(inputTime(1000, 5, 2000, 2008, false), 1013);
  assert.equal(inputTime(1000, 5, 2000, 9000, true), 1000);
});
