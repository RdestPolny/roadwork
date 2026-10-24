import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location={search:''};
const {state:input,directionDoubleTap,resetDirectionTap,screenMove}=await import('../src/input.js');
const {state:boxing}=await import('../src/boxing.js');
const {state:sparring}=await import('../src/sparring.js');
const {state:animation}=await import('../src/animation.js');
const {state:shadow}=await import('../src/shadowboxing.js');
const {createSequence}=await import('../src/shadow-sequence.js');

test('direction pairs use the shared dash window and cannot cross directions, modes, fight phases or focus resets', () => {
  boxing.gstate='hub';resetDirectionTap();
  assert.equal(directionDoubleTap(5,0),false);
  assert.equal(directionDoubleTap(5,279),true);
  assert.equal(input.tapMv,-1);
  assert.equal(directionDoubleTap(5,280),false); // A third press starts a new pair.
  assert.equal(directionDoubleTap(5,560),false); // Exactly 280 ms is outside the window.
  assert.equal(directionDoubleTap(6,570),false);
  assert.equal(directionDoubleTap(5,580),false);
  assert.equal(directionDoubleTap(5,579),false); // A reset clock cannot complete an old pair.
  boxing.gstate='spar';sparring.SP={phase:'fight'};
  assert.equal(directionDoubleTap(5,580),false);
  sparring.SP.phase='intro';
  assert.equal(directionDoubleTap(5,600),false);
  resetDirectionTap();
  assert.equal(directionDoubleTap(5,610),false);
  assert.equal(directionDoubleTap(5,620),true);
  assert.equal(directionDoubleTap(7,630),false);
  assert.equal(directionDoubleTap(7,640),true); // Existing horizontal dash pairing still works.
});

test('horizontal controls follow facing and a tap pair cannot span a side change', () => {
  animation.M_WALKF=7;animation.M_WALKB=8;
  boxing.gstate='spar';sparring.SP={phase:'fight'};sparring.FA={mirror:false};resetDirectionTap();
  assert.equal(screenMove(7),7);assert.equal(screenMove(8),8);
  assert.equal(directionDoubleTap(7,0),false);
  sparring.FA.mirror=true;
  assert.equal(directionDoubleTap(7,100),false);
  assert.equal(screenMove(7),8);assert.equal(screenMove(8),7);assert.equal(screenMove(2),2);
  boxing.gstate='hub';assert.equal(screenMove(7),7);assert.equal(screenMove(8),8);
});

test('a shadowboxing direction pair follows queued facing while its pivot starts animating', () => {
  boxing.gstate='spar';sparring.SP={phase:'fight'};sparring.FA={mirror:false};sparring.shadow=true;
  shadow.active=true;shadow.startMirror=false;shadow.sequence=createSequence([['P','DB']]);shadow.sequence.queue=['P'];
  resetDirectionTap();
  assert.equal(screenMove(7),8);assert.equal(directionDoubleTap(8,0),false);
  sparring.FA.mirror=true; // Executing an already accepted pivot does not change future controls.
  assert.equal(directionDoubleTap(8,100),true);assert.equal(screenMove(7),8);
  sparring.shadow=false;shadow.active=false;
});
