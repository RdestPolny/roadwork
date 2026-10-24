import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location={search:''};
const {poseSampleTime}=await import('../src/animation.js');

test('punch poses have intermediate frames while event poses and other moves retain their timing', () => {
  for(let id=0;id<4;id++){
    const move={id,dur:34};
    assert.deepEqual([0,1,2,3,4].map(t=>poseSampleTime(move,t,0)),[5,6,7,8,9]);
    assert.equal(poseSampleTime(move,10.7,1<<3),15); // Original impact pose, even with fractional speed.
    assert.equal(poseSampleTime(move,31.5,0),34);
    assert.equal(poseSampleTime(move,31.5,1<<6),34);
  }
  for(const move of [{id:4,dur:25},{id:12,dur:24,fr:3}]){
    const fr=move.fr||5;
    for(const t of [0,1,2.9,5,10.7,23.9]){
      assert.equal(poseSampleTime(move,t,0),Math.min(move.dur,(Math.floor(t/fr)+1)*fr));
    }
  }
});

test('Victorian guard extends the lead fist at chest height and keeps the idle feet planted',async()=>{
  const A=await import('../src/animation.js'),{state:B}=await import('../src/boxing.js'),{state:S}=await import('../src/sparring.js');
  A.initialize();const P=A.state,G=P.GUARD,out=new Float32Array(P.NP);
  assert.ok(G[P.LGX]>G[P.RGX]+6,'the lead fist reaches forward while the rear stays close');
  assert.ok(G[P.LGY]>=0&&G[P.RGY]>G[P.LGY],'both fists sit below the shoulders');
  assert.ok(G[P.LEAN]<=0,'the torso stays upright over the hips');
  Object.assign(B,{flow:false,beatMs:600,lastBeatMs:0});S.idleOff=0;
  let min=Infinity,max=-Infinity,breath=0;
  for(let beat=0;beat<8;beat++)for(let frame=0;frame<8;frame++){
    B.beatIdx=beat;B.simNow=frame/8*600;A.computeIdle(out);
    for(const k of [P.GX,P.GY,P.STEP,P.RSTEP,P.LLIFT,P.RLIFT,P.HEEL,P.LHEEL])assert.equal(out[k],G[k],'idle has no hop or foot shuffle');
    assert.ok(out[P.LGY]>=0&&out[P.RGY]>=0,'the guard does not return to the chin');
    assert.ok(Array.from(out).every(Number.isFinite));min=Math.min(min,out[P.BX]);max=Math.max(max,out[P.BX]);breath=Math.max(breath,out[P.SQ]);
  }
  assert.ok(max-min>0.5&&max-min<1.5,'subtle weight transfer remains visible');
  assert.ok(breath>0.5&&breath<1,'breathing crosses a pixel boundary without a full-body bounce');
  P.idleTired=1;P.idleHurt=.5;P.idleClose=1;A.computeIdle(out);assert.ok(out[P.LGY]>G[P.LGY],'tired and hurt hands sag');
  assert.deepEqual(Array.from(P.MOVES[0].keys.at(-1)),Array.from(G),'jab returns to the new guard');
  assert.equal(P.MOVES[0].dur,14);assert.equal(P.MOVES[0].times[P.MOVES[0].apex],6);
});

test('Victorian jab keeps the rear fist at the chest throughout extension and recovery',async()=>{
  const A=await import('../src/animation.js'),{state:B}=await import('../src/boxing.js'),{state:S}=await import('../src/sparring.js');
  A.initialize();const P=A.state,m=P.MOVES[0],out=new Float32Array(P.NP);P.fromPose.set(P.GUARD);
  Object.assign(B,{gstate:'none',flow:false,moveStep:0});S.aimLow=0;
  for(let t=0;t<=m.dur;t+=.25){
    A.samplePose(m,t,out);
    assert.ok(out[P.RGY]>=P.GUARD[P.RGY],'the rear fist never rises from the chest toward the chin');
    assert.ok(out[P.RGX]<=P.GUARD[P.RGX],'the rear elbow remains tucked rather than reaching forward');
    if(t<=5)assert.ok(out[P.LGX]>=P.GUARD[P.LGX],'the lead fist extends directly without an initial pullback');
  }
  A.samplePose(m,6,out);assert.ok(out[P.LEAN]>P.GUARD[P.LEAN]);assert.ok(out[P.LGY]<0,'the striking fist rises toward the head');
  A.samplePose(m,m.dur,out);assert.deepEqual(Array.from(out),Array.from(P.GUARD));
  assert.deepEqual(Array.from(m.times),[0,3,5,6,9,14]);assert.equal(m.glove,0);assert.equal(m.apex,3);assert.equal(m.cancel,9);
});

test('Victorian cross leans through impact with a low free hand and returns to guard',async()=>{
  const A=await import('../src/animation.js'),{state:B}=await import('../src/boxing.js'),{state:S}=await import('../src/sparring.js');
  A.initialize();const P=A.state,m=P.MOVES[1],out=new Float32Array(P.NP);P.fromPose.set(P.GUARD);
  Object.assign(B,{gstate:'none',flow:false,moveStep:0});S.aimLow=0;
  let previousLean=-Infinity;
  for(let t=5;t<=m.dur;t+=.25){
    A.samplePose(m,t,out);
    assert.ok(out[P.LGY]>=P.GUARD[P.LGY],'the free hand stays below the shoulder throughout the cross');
    if(t<=15){assert.ok(out[P.LEAN]>=previousLean,'the torso inclines as the rear arm drives');previousLean=out[P.LEAN];}
    assert.ok(Array.from(out).every(Number.isFinite));
  }
  A.samplePose(m,15,out);
  assert.ok(out[P.LEAN]-out[P.HROT]>=6,'the shoulders advance substantially farther than the hips');
  assert.ok(Math.abs(out[P.HX])<=1,'the head follows the torso instead of stretching forward independently');
  assert.ok(out[P.ROT]>0&&out[P.HROT]>0&&out[P.HEEL]>2,'shoulders, hips and rear heel turn through the strike');
  assert.ok(out[P.RGX]>out[P.LGX]+10&&out[P.RGY]<0,'the rear fist extends toward the head while the free hand tucks in');
  A.samplePose(m,m.dur,out);assert.deepEqual(Array.from(out),Array.from(P.GUARD));
  assert.deepEqual(Array.from(m.times),[0,5,10,15,22,28,34]);assert.equal(m.glove,1);assert.equal(m.apex,3);assert.equal(m.cancel,22);
});
