import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location={search:''};
const {poseSampleTime}=await import('../src/animation.js');

test('every move samples its pose continuously on the 60 Hz tick, clamped to the move, whatever the events', () => {
  for(const move of [{id:0,dur:13},{id:1,dur:30},{id:4,dur:25},{id:12,dur:24,fr:3}]){
    for(const t of [-1,0,1,2.9,5,10.7,23.9,40]) for(const events of [0,1<<3,1<<6]){
      assert.equal(poseSampleTime(move,t,events),Math.max(0,Math.min(move.dur,t)));
    }
  }
});

test('bareknuckle guard extends the lead fist, idles with planted feet and sags when tired',async()=>{
  const A=await import('../src/animation.js'),{state:B}=await import('../src/boxing.js'),{state:S}=await import('../src/sparring.js');
  A.initialize();const P=A.state,G=P.GUARD,out=new Float32Array(P.NP);
  assert.ok(G[P.LGX]>G[P.RGX]+6,'the lead fist reaches forward while the rear stays close');
  assert.ok(G[P.LGY]>=0&&G[P.RGY]>G[P.LGY],'both fists sit below the shoulders');
  assert.ok(G[P.LEAN]<=0,'the torso stays upright over the hips');
  // boxing.initialize() sets the idle step length but needs the DOM; the idle shape does not depend on the length.
  Object.assign(B,{flow:false,idleEpoch:0,IDLE_STEP_MS:600});S.idleOff=0;
  let min=Infinity,max=-Infinity,breath=0;
  for(let beat=0;beat<8;beat++)for(let frame=0;frame<8;frame++){
    B.simNow=(beat+frame/8)*B.IDLE_STEP_MS;A.computeIdle(out);
    for(const k of [P.GX,P.GY,P.STEP,P.RSTEP,P.LLIFT,P.RLIFT,P.HEEL,P.LHEEL])assert.equal(out[k],G[k],'idle has no hop or foot shuffle');
    assert.ok(out[P.LGY]>=0&&out[P.RGY]>=0,'the idle milling does not lift the fists to the face');
    assert.ok(Array.from(out).every(Number.isFinite));min=Math.min(min,out[P.BX]);max=Math.max(max,out[P.BX]);breath=Math.max(breath,out[P.SQ]);
  }
  assert.ok(max-min>0.5&&max-min<1.5,'subtle weight transfer remains visible');
  assert.ok(breath>0.5&&breath<1,'breathing crosses a pixel boundary without a full-body bounce');
  P.idleTired=1;P.idleHurt=.5;P.idleClose=1;A.computeIdle(out);assert.ok(out[P.LGY]>G[P.LGY],'tired and hurt hands sag');
  P.idleTired=0;P.idleHurt=0;P.idleClose=0;
  assert.deepEqual(Array.from(P.MOVES[0].keys.at(-1)),Array.from(G),'jab returns to the guard');
  assert.equal(P.MOVES[0].dur,13);assert.equal(P.MOVES[0].times[P.MOVES[0].apex],6);
});

test('jab snaps out while the rear fist covers the jaw, then returns to guard',async()=>{
  const A=await import('../src/animation.js'),{state:B}=await import('../src/boxing.js'),{state:S}=await import('../src/sparring.js');
  A.initialize();const P=A.state,m=P.MOVES[0],out=new Float32Array(P.NP);P.fromPose.set(P.GUARD);
  Object.assign(B,{gstate:'none',flow:false,moveStep:0});S.aimLow=0;
  for(let t=0;t<=m.dur;t+=.25){
    A.samplePose(m,t,out);
    assert.ok(out[P.RGY]<=P.GUARD[P.RGY],'the rear fist never drops below its guard height');
    assert.ok(out[P.RGX]<=P.GUARD[P.RGX],'the rear elbow remains tucked rather than reaching forward');
  }
  A.samplePose(m,m.times[m.apex],out);
  assert.ok(out[P.LEAN]>P.GUARD[P.LEAN]);assert.ok(out[P.LGY]<0,'the striking fist rises toward the head');
  assert.ok(out[P.RGY]<0,'the rear fist guards the jaw at impact');
  assert.ok(out[P.LGX]>P.GUARD[P.LGX]+4,'the lead arm extends at impact');
  A.samplePose(m,m.dur,out);assert.deepEqual(Array.from(out),Array.from(P.GUARD));
  assert.deepEqual(Array.from(m.times),[0,2,5,6,9,13]);assert.equal(m.glove,0);assert.equal(m.apex,3);assert.equal(m.cancel,9);
});

test('cross leans through impact with the rear heel and hips turning and the free hand up at the cheek',async()=>{
  const A=await import('../src/animation.js'),{state:B}=await import('../src/boxing.js'),{state:S}=await import('../src/sparring.js');
  A.initialize();const P=A.state,m=P.MOVES[1],out=new Float32Array(P.NP);P.fromPose.set(P.GUARD);
  Object.assign(B,{gstate:'none',flow:false,moveStep:0});S.aimLow=0;
  const impact=m.times[m.apex];let previousLean=-Infinity;
  for(let t=0;t<=m.dur;t+=.25){
    A.samplePose(m,t,out);
    if(t>=m.times[1]&&t<=impact){assert.ok(out[P.LEAN]>=previousLean,'the torso inclines from the load into impact');previousLean=out[P.LEAN];}
    assert.ok(Array.from(out).every(Number.isFinite));
  }
  A.samplePose(m,impact,out);
  assert.ok(Math.abs(out[P.HX])<=1,'the head follows the torso instead of stretching forward independently');
  assert.ok(out[P.ROT]>0&&out[P.HROT]>0&&out[P.HEEL]>2,'shoulders, hips and rear heel turn through the strike');
  assert.ok(out[P.RGX]>out[P.LGX]+10&&out[P.RGY]<0,'the rear fist extends toward the head');
  assert.ok(out[P.LGY]<0&&out[P.LGX]<P.GUARD[P.LGX],'the free hand comes back high to the cheek');
  A.samplePose(m,m.dur,out);assert.deepEqual(Array.from(out),Array.from(P.GUARD));
  assert.deepEqual(Array.from(m.times),[0,4,7,10,12,17,24,30]);assert.equal(m.glove,1);assert.equal(m.apex,3);assert.equal(m.cancel,19);
});
