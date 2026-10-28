import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location={search:''};
const {punchSnap}=await import('../src/iso-fight.js');

test('punch accelerates toward contact',()=>{
  assert.equal(punchSnap(0),0);
  assert.equal(punchSnap(1),1);
  assert.ok(punchSnap(.25)<.25);
  assert.ok(1-punchSnap(.75)>.25);
});
