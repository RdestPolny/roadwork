import { test } from 'node:test';
import assert from 'node:assert/strict';

// Imports only define modules; config reads the browser's query string.
globalThis.location = { search: '' };
const { state: sparring, sparOnAttack, sparMoveSpeed, sparRaiseGuard, sparDashCost, fighterView, bareTorsoOut } = await import('../src/sparring.js');
const { state: boxing } = await import('../src/boxing.js');

test('throwing pays only the miss cost and punch speed follows stamina percentage', async () => {
  sparring.shadow=true;sparring.shadowRate=1;
  sparring.STA_COST = [1.8,3.5,4.2,4.5];
  const {state:animation} = await import('../src/animation.js');
  animation.MOVES = [{},{},{},{}];
  const F = {sta:100,staMax:100,staCap:100,fat:0.1,spd:1,stun:0,thrown:0,opp:{manual:true}};
  sparring.ctxF = F;
  for(let id=0;id<4;id++){
    const before=F.sta;
    sparOnAttack(id);
    assert.ok(Math.abs(before-F.sta-sparring.STA_COST[id]*0.6)<1e-8);
  }
  assert.equal(F.thrown,4);
  for(const [percent,speed] of [[1,1],[0.5,0.725],[0,0.45]]){
    F.sta=F.staCap*percent;
    for(let id=0;id<4;id++)assert.ok(Math.abs(sparMoveSpeed(F,id)-speed)<1e-8);
  }
  F.sta=50;F.staMax=50;
  assert.ok(Math.abs(sparMoveSpeed(F,0)-0.725)<1e-8); // Percentage uses capacity, not the worn ceiling.
  assert.equal(sparMoveSpeed(F,7),0.9);
  F.stun=60;
  assert.ok(Math.abs(sparMoveSpeed(F,0)-0.725*0.85)<1e-8);
});


test('in Cień guard and dash cost effort, and bare fists are quicker', () => {
  const F={sta:100,staMax:100,staCap:100,fat:0};
  try{
    sparring.shadow=true;
    sparRaiseGuard(F); assert.equal(F.sta,99);
    sparDashCost(F); assert.equal(F.sta,96.5);
    sparring.bareknuckle=true; F.sta=100;
    assert.ok(Math.abs(sparMoveSpeed({...F,spd:1,stun:0},0)-1.15)<1e-8); // bare fists are quicker
  }finally{ sparring.shadow=false; sparring.bareknuckle=false; }
});

test('the player trains bare-chested: skin follows identity, the bath and the work keep their outfits', () => {
  const previous={a:sparring.FA,ctx:sparring.ctxF,bare:sparring.bareknuckle,venue:sparring.sparVenue,mode:boxing.gstate};
  const A={mirror:false,bt:'low',blood:[],S:{torsoX:30,hipY:65,sx:32,sy:45}};
  try{
    sparring.FA=A;sparring.ctxF=null;sparring.bareknuckle=true;sparring.sparVenue='cell';boxing.gstate='spar';
    assert.equal(bareTorsoOut(A),true);
    assert.equal(bareTorsoOut({mirror:false}),false,'skin follows identity, not which side the fighter faces');
    sparring.sparVenue='laznia';assert.equal(bareTorsoOut(A),false,'bath keeps its own outfit');
    sparring.sparVenue='cell';boxing.gstate='work';assert.equal(bareTorsoOut(A),false,'work keeps its own outfit');
  }finally{
    sparring.FA=previous.a;sparring.ctxF=previous.ctx;sparring.bareknuckle=previous.bare;sparring.sparVenue=previous.venue;boxing.gstate=previous.mode;
  }
});

test('pivot dashes before the player turns and the opponent follows with a delayed turn on either side', async () => {
  const {state:appearance}=await import('../src/appearance.js');
  const previous={sp:sparring.SP,a:sparring.FA,width:appearance.W};
  try{
    appearance.W=144;
    for(const mirror of [false,true]){
      const A={mirror:!mirror,hipL:62},B={mirror,hipL:81};sparring.FA=A;
      const from=mirror?[81,62]:[62,81],to=[from[1],from[0]];
      sparring.SP={pivot:{t:0,dur:30,from,to}};
      const at=t=>{sparring.SP.pivot.t=t;return [fighterView(A),fighterView(B)];};
      assert.deepEqual(at(0).map(F=>F.x),from);
      assert.deepEqual(at(3).map(F=>F.x),from,'duck before travelling');
      assert.equal(at(15)[0].x,to[0],'dash reaches the other side before turning');
      assert.deepEqual(at(15).map(F=>F.mirror),[mirror,!mirror]);
      assert.deepEqual(at(21).map(F=>F.mirror),[!mirror,!mirror],'opponent still faces the old direction');
      assert.ok(at(25)[1].scaleX<0.6,'opponent narrows while turning');
      assert.deepEqual(at(30).map(F=>F.mirror),[!mirror,mirror]);
      assert.deepEqual(at(30).map(F=>F.x),to);
      sparring.SP.pivot=null;
      assert.deepEqual([fighterView(A),fighterView(B)].map(F=>[F.dx,F.dy,F.scaleX]),[[0,0,1],[0,0,1]]);
    }
  }finally{sparring.SP=previous.sp;sparring.FA=previous.a;appearance.W=previous.width;}
});
