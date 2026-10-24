import assert from 'node:assert/strict';

/** Exercise real keys, animation-apex damage, AI, pause and the ordinary prison result flow. */
export async function checkRealtime(page){
  const initial=await page.evaluate(async()=>{
    const b=window.__boxer,S=await import('/src/sparring.js');
    window.__testRng=Math.random;Math.random=()=>.99;
    b.startLiveSpar(0,'cell');b.pause();b.step(60);
    S.state.FB.rtAiAt=Infinity;
    return {live:S.isRealtimeFight(),cards:S.isCardFight(),phase:S.state.SP.phase};
  });
  assert.deepEqual(initial,{live:true,cards:false,phase:'fight'});
  assert.equal(await page.locator('#cardHud').isVisible(),false);
  assert.equal(await page.locator('#realtimeHud [role=meter]').count(),4);
  // Release the real input gate and refreeze within one browser task, retaining held keys for deterministic stepping.
  const key=(code,down=true)=>page.evaluate(({code,down})=>{
    window.__boxer.resume();dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));window.__boxer.pause();
  },{code,down});
  const read=()=>page.evaluate(async()=>{
    const S=(await import('/src/sparring.js')).state;
    return {a:{hp:S.FA.hp,sta:S.FA.rt.sta,thrown:S.FA.thrown,body:S.FA.body,guard:S.FA.rt.guarding},b:{hp:S.FB.hp,thrown:S.FB.thrown},time:S.SP.liveTime};
  });
  const before=await read();await key('Digit1');const jab=await read();
  assert.ok(Math.abs(before.a.sta-jab.a.sta-5)<.001);
  await page.evaluate(()=>window.__boxer.step(32));
  assert.ok((await read()).b.hp<before.b.hp,'real animation contact deals damage');
  const repeatBefore=await read();await key('Digit1');const repeat=await read();
  assert.ok(Math.abs(repeatBefore.a.sta-repeat.a.sta-6.75)<.001,'second jab pays escalating cost');
  await page.evaluate(()=>window.__boxer.step(35));
  await page.evaluate(async()=>{window.__boxer.startSpar(0,'cell');window.__boxer.pause();window.__boxer.step(50);(await import('/src/sparring.js')).state.FB.rtAiAt=Infinity;});
  await key('ArrowDown');await key('Digit2');
  const low=await page.evaluate(async()=>(await import('/src/sparring.js')).state.FA.S.aimLow);
  assert.equal(low,1,'down+cross latches the body target');await key('ArrowDown',false);
  await page.evaluate(()=>window.__boxer.step(65));
  assert.ok((await read()).a.body>=1,'body targeting survives release during the punch '+JSON.stringify(await page.evaluate(async()=>{const S=(await import('/src/sparring.js')).state;return {a:{st:S.FA.st,body:S.FA.body,landed:S.FA.landed,aim:S.FA.S.aimLow,sta:S.FA.sta},b:{hp:S.FB.hp,st:S.FB.st},dist:31-S.FA.effPos-S.FB.effPos,message:S.SP.notice}})));
  await page.evaluate(()=>window.__boxer.step(125));
  const resetBefore=await read();await key('Digit1');const reset=await read();
  assert.ok(Math.abs(resetBefore.a.sta-reset.a.sta-5)<.001,'two unused seconds reset that punch');
  await page.evaluate(()=>window.__boxer.step(40));
  await key('Space');const guardBefore=await read();
  await page.evaluate(()=>window.__boxer.step(60));const guardAfter=await read();
  assert.ok(guardAfter.a.sta<guardBefore.a.sta-8,'holding block drains stamina');
  assert.equal(guardAfter.a.guard,true);
  await page.keyboard.press('F10');
  assert.equal((await read()).a.guard,false,'pause releases the held block');
  const paused=await read();await page.waitForTimeout(100);assert.deepEqual(await read(),paused,'pause freezes combat and cooldowns');
  await page.locator('[data-a=resume]').evaluate(el=>{el.click();window.__boxer.pause();});
  await key('KeyQ');
  assert.ok(await page.evaluate(async()=>Number.isFinite((await import('/src/sparring.js')).state.FA.rt.slipSince)),'Q starts a costed slip');
  await page.evaluate(()=>window.__boxer.step(65));
  const position=()=>page.evaluate(async()=>(await import('/src/sparring.js')).state.FA.effPos);
  const start=await position();await key('ArrowLeft');await page.evaluate(()=>window.__boxer.step(45));await key('ArrowLeft',false);
  assert.ok((await position())<start-5,'holding direction completes walking steps');
  // Every basic attack and its body variant use a real animation and their increasing base costs.
  for(const pid of [0,1,2,3])for(const body of [false,true]){
    await page.evaluate(async()=>{const b=window.__boxer;b.startLiveSpar(0,'cell');b.pause();b.step(50);(await import('/src/sparring.js')).state.FB.rtAiAt=Infinity;});
    if(body)await key('ArrowDown');
    const a=await read();await key('Digit'+(pid+1));const z=await read();
    assert.equal(a.a.thrown+1,z.a.thrown);
    assert.ok(Math.abs(a.a.sta-z.a.sta-[5,9,12,16][pid])<.001);
    if(body)await key('ArrowDown',false);
    await page.evaluate(()=>window.__boxer.step(85));
    const hit=await read();assert.ok(hit.b.hp<a.b.hp,'pid '+pid+' body '+body+' lands');
    assert.equal(hit.a.body,body?1:0);
  }
  await page.evaluate(async()=>{const b=window.__boxer;Math.random=window.__testRng;b.startSpar(0,'yard');b.pause();b.step(240);});
  assert.ok((await read()).b.thrown>=2,'opponent fights without player commands');
  await page.screenshot({path:'artifacts/realtime-fight.png'});
  const result=await page.evaluate(async()=>{
    const b=window.__boxer,S=await import('/src/sparring.js'),P=await import('/src/progression.js');
    b.startLiveSpar(0,'cell');b.pause();b.step(50);S.state.FB.rtAiAt=Infinity;S.state.FB.rt.hp=1;Math.random=()=>.99;
    const before=P.state.save.record.bare.w;b.resume();dispatchEvent(new KeyboardEvent('keydown',{code:'Digit1',bubbles:true}));b.pause();b.step(180);Math.random=window.__testRng;
    return {won:P.state.save.record.bare.w-before,phase:S.state.SP.phase};
  });
  assert.deepEqual(result,{won:1,phase:'end'});
  assert.equal(await page.locator('#realtimeHud').isVisible(),false);
  assert.equal(await page.locator('#over').isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>window.__boxer.gstate),'hub');
}

/** Time real guard/slip keys against the rival's animated jab, including bad timing and an exhausted guard. */
export async function checkRealtimeDefence(page){
  const results=await page.evaluate(async()=>{
    const S=await import('/src/sparring.js'),B=await import('/src/boxing.js'),I=await import('/src/input.js'),R=await import('/src/realtime-rules.js');
    const b=window.__boxer,rng=Math.random,out={};
    const key=(code,down=true)=>{b.resume();dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,bubbles:true,cancelable:true}));b.pause();};
    const setup=()=>{
      Math.random=()=>0;b.startLiveSpar(0,'cell');b.pause();b.step(46);S.state.FB.rtAiAt=0;
      let n=0;while(S.state.FB.st!==0&&n++<120)b.step(1);
      S.state.FB.rtAiAt=Infinity;return {A:S.state.FA,D:S.state.FB};
    };
    const toLastMoment=()=>{let n=0;while(S.state.SP.liveTime<S.state.FB.rtTellUntil&&n++<60)b.step(1);};
    const contact=()=>{let n=0;while(S.state.FA.hp===S.state.FA.hpMax&&S.state.FA.blocks===0&&S.state.FA.evades===0&&n++<100)b.step(1);};
    try{
      let {A,D}=setup();toLastMoment();const rivalSta=D.rt.sta;key('Space');contact();
      out.parry={hp:A.hp,full:A.hpMax,perfect:A.perfects,loss:rivalSta-D.rt.sta,st:D.pendHit>=0?D.pendHit:D.st};key('Space',false);
      ({A,D}=setup());key('Space');contact();out.block={hp:A.hp,full:A.hpMax,perfect:A.perfects,sta:A.sta};key('Space',false);
      ({A,D}=setup());A.rt.sta=0;key('Space');contact();out.empty={damage:A.hpMax-A.hp,perfect:A.perfects};key('Space',false);
      ({A,D}=setup());key('KeyQ');contact();out.bad={damage:A.hpMax-A.hp,evades:A.evades};
      ({A,D}=setup());toLastMoment();key('KeyQ');contact();
      out.slip={hp:A.hp,full:A.hpMax,evades:A.evades,counter:A.rt.counterUntil>S.state.SP.liveTime};
      Math.random=()=>.99;
      let n=0;while(A.st!==-1&&n++<120)b.step(1);
      const hp=D.hp;key('Digit1');b.step(40);
      out.counter={damage:hp-D.hp,expected:R.PUNCH_DAMAGE[0]*A.pow*R.TUNING.counterPower,consumed:A.rt.counterUntil<S.state.SP.liveTime};
      key('Digit1',false);b.exitToHub();
    }finally{Math.random=rng;I.setPaused(true);}
    return out;
  });
  assert.equal(results.parry.hp,results.parry.full,JSON.stringify(results));
  assert.equal(results.parry.perfect,1,JSON.stringify(results));
  assert.ok(results.parry.loss>6,'ideal guard costs attacker extra stamina '+JSON.stringify(results));
  assert.equal(results.block.hp,results.block.full);assert.equal(results.block.perfect,0);
  assert.ok(results.empty.damage>0);assert.equal(results.empty.perfect,0);
  assert.equal(results.bad.evades,0);assert.ok(results.bad.damage>results.empty.damage*1.3);
  assert.deepEqual(results.slip,{hp:results.slip.full,full:results.slip.full,evades:1,counter:true});
  assert.ok(Math.abs(results.counter.damage-results.counter.expected)<.001,JSON.stringify(results));
  assert.equal(results.counter.consumed,true);
}
