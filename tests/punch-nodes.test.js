import test from 'node:test';
import assert from 'node:assert/strict';
import {NODE_READY,PUNCH_TREES} from '../src/card-data.js';

test('all five levels of the eight punch trees are ready', () => {
  assert.equal(NODE_READY.size,80);
  for(const id of Object.keys(PUNCH_TREES)) assert.ok(NODE_READY.has(id+':1a')&&NODE_READY.has(id+':5b'),id);
});
