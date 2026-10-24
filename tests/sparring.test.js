import { test } from 'node:test';
import assert from 'node:assert/strict';

// Imports only define modules; config reads the browser's query string.
globalThis.location = { search: '' };
const { state: sparring, sparOnAttack, sparMoveSpeed, sparRaiseGuard, sparDashCost, catchBloodOnClothes, fighterView, bareTorsoOut } = await import('../src/sparring.js');
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


test('in a card fight the engine owns stamina: guard and dash cost nothing there, in Cień they do', () => {
  const F={sta:100,staMax:100,staCap:100,fat:0};
  try{
    sparring.shadow=false;sparring.cards=true;
    sparRaiseGuard(F); sparDashCost(F); assert.equal(F.sta,100);
    sparring.cards=false;sparring.shadow=true;
    sparRaiseGuard(F); assert.equal(F.sta,99);
    sparDashCost(F); assert.equal(F.sta,96.5);
    sparring.bareknuckle=true; F.sta=100;
    assert.ok(Math.abs(sparMoveSpeed({...F,spd:1,stun:0},0)-1.15)<1e-8); // bare fists are quicker
  }finally{ sparring.cards=false; sparring.shadow=false; sparring.bareknuckle=false; }
});

test('falling blood catches fabric on either mirrored fighter only in bareknuckle', async () => {
  const {state:appearance}=await import('../src/appearance.js');
  const previous={bare:sparring.bareknuckle,fig:sparring.FIG,ctx:sparring.ctxF,mode:boxing.gstate,width:appearance.W};
  const fighter=mirror=>({mirror,bt:'mid',blood:[],S:{torsoX:30,hipY:65,sx:32,sy:45}});
  const A=fighter(false),B=fighter(true);
  try{
    appearance.W=144;boxing.gstate='spar';sparring.bareknuckle=true;sparring.FIG=[A,B];sparring.ctxF=null;
    assert.equal(catchBloodOnClothes(31,38,31,70,123),true); // Swept path cannot tunnel through a shirt.
    assert.equal(A.blood.length,1);assert.equal(B.blood.length,0);
    assert.equal(catchBloodOnClothes(112,38,112,70,123),true);
    assert.equal(B.blood.length,1);assert.equal(B.blood[0].part,A.blood[0].part);
    assert.equal(catchBloodOnClothes(72,38,72,70,123),false);
    assert.equal(catchBloodOnClothes(31,60,31,38,123),false); // Rising spray has not landed yet.
    sparring.bareknuckle=false;
    assert.equal(catchBloodOnClothes(31,38,31,70,123),false);
    assert.equal(A.blood.length,1);
  }finally{
    appearance.W=previous.width;boxing.gstate=previous.mode;sparring.bareknuckle=previous.bare;sparring.FIG=previous.fig;sparring.ctxF=previous.ctx;
  }
});

test('the player fights bare-chested: exposed skin lets blood fall, trousers still catch it', () => {
  const previous={a:sparring.FA,fig:sparring.FIG,ctx:sparring.ctxF,bare:sparring.bareknuckle,venue:sparring.sparVenue,mode:boxing.gstate};
  const A={mirror:false,bt:'low',blood:[],S:{torsoX:30,hipY:65,sx:32,sy:45}};
  try{
    sparring.FA=A;sparring.FIG=[A];sparring.ctxF=null;sparring.bareknuckle=true;sparring.sparVenue='cell';boxing.gstate='spar';
    assert.equal(bareTorsoOut(A),true);
    assert.equal(bareTorsoOut({mirror:false}),false,'skin follows identity, not which side the fighter faces');
    assert.equal(catchBloodOnClothes(32,45,32,54,123),false,'bare chest has no fabric');
    assert.equal(catchBloodOnClothes(32,54,32,60,123),false,'the bare belly above the waistband has no fabric');
    assert.equal(catchBloodOnClothes(30,60,30,66,123),true,'waistband is still fabric');
    assert.equal(A.blood[0].part,2,'section indices remain stable');
    sparring.sparVenue='yard';assert.equal(bareTorsoOut(A),true);
    sparring.sparVenue='laznia';assert.equal(bareTorsoOut(A),false,'bath keeps its own outfit');
    sparring.sparVenue='cell';boxing.gstate='work';assert.equal(bareTorsoOut(A),false,'work keeps its own outfit');
  }finally{
    sparring.FA=previous.a;sparring.FIG=previous.fig;sparring.ctxF=previous.ctx;sparring.bareknuckle=previous.bare;sparring.sparVenue=previous.venue;boxing.gstate=previous.mode;
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
