import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONTEXT_FIELDS, saveFighterContext, loadFighterContext } from '../src/fighter-context.js';

test('all 77 named fighter fields roundtrip without sharing fighter state', () => {
  const sources = Object.fromEntries(Object.entries(CONTEXT_FIELDS).map(([group, keys]) => [group, Object.fromEntries(keys.map((key, index) => [key, index + 1]))]));
  const expected = structuredClone(sources);
  const first = {}, second = {};
  saveFighterContext(first, sources);
  assert.equal(Object.keys(first).length, 77);
  assert.equal(Object.hasOwn(first, '0'), false);
  for (const owner of Object.values(sources)) for (const key of Object.keys(owner)) owner[key] = 999;
  saveFighterContext(second, sources);
  loadFighterContext(first, sources);
  assert.deepEqual(sources, expected);
  assert.equal(second.headX, 999);
  assert.notEqual(first.headX, second.headX);
});
