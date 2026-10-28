import assert from 'node:assert/strict';

/** The real work door, keyboard rhythm, pause and once-only prison settlement. */
export async function checkCrank(page){
  await page.evaluate(async()=>{
    const b=window.__boxer;b.simSet({day:2,faza:0,min:480,akcje:0,glod:0,zm:0});
    (await import('/src/prison.js')).prisonClockSync();
    const G=await import('/src/gym.js'),N=await import('/src/navigation.js');
    N.stMenuOpen(G.stationOf(G.state.gymItems.find(it=>it.t==='cdoor')));
  });
  assert.equal(await page.locator('#stMenu button').filter({hasText:'Kule armatnie'}).count(),0);
  assert.equal(await page.locator('.watch-quest strong').count(),1);
  await page.locator('#stMenu button').filter({hasText:'Żelazna korba'}).click();
  await page.waitForFunction(async()=>(await import('/src/crank.js')).state.phase==='intro');
  await page.evaluate(()=>window.__boxer.step(120));
  assert.equal(await page.locator('#crClock').textContent(),'30');
  assert.equal(await page.locator('#simCard').isVisible(),false);
  await page.screenshot({path:'artifacts/crank-brief.png'});
  await page.locator('#crGo').click();await page.evaluate(()=>window.__boxer.resume());
  await page.keyboard.down('Space');
  await page.evaluate(()=>window.__boxer.step(30));
  assert.equal(await page.evaluate(async()=>(await import('/src/crank.js')).state.crank.held),true);
  await page.keyboard.press('F10');
  const paused=await page.evaluate(async()=>(await import('/src/crank.js')).state.crank);
  assert.equal(paused.held,false);
  await page.keyboard.up('Space');await page.waitForTimeout(80);
  assert.deepEqual(await page.evaluate(async()=>(await import('/src/crank.js')).state.crank),paused);
  await page.locator('[data-a="resume"]').evaluate(el=>{el.click();window.__boxer.pause();});
  await page.evaluate(()=>window.__boxer.step(0));
  await page.screenshot({path:'artifacts/crank-working.png'});
  // Inspect all four quadrants through the public input and normal simulation clock.
  for(const [name,angle] of [['bottom',0],['right',Math.PI/2],['top',Math.PI],['left',Math.PI*1.5]]){
    await page.evaluate(async target=>{
      const C=await import('/src/crank.js'),b=window.__boxer;
      b.resume();C.crankKey(new KeyboardEvent(target>Math.PI?'keyup':'keydown',{code:'Space'}),target<=Math.PI);
      for(let i=0;i<600&&C.state.crank.angle<target;i++)b.step(1);
      b.pause();b.step(0);
    },angle);
    await page.screenshot({path:`artifacts/crank-${name}.png`});
  }
  const result=await page.evaluate(async()=>{
    const b=window.__boxer,C=await import('/src/crank.js'),R=await import('/src/crank-rules.js'),P=await import('/src/progression.js');
    const before={actions:P.state.save.sim.akcje,respect:P.state.save.prison.respekt};
    b.pause();
    while(C.state.phase==='run'){
      const c=C.state.crank,down=R.isRising(c);
      // Public mode input is exercised with the same deterministic clock as the normal game.
      b.resume();C.crankKey(new KeyboardEvent(down?'keydown':'keyup',{code:'Space'}),down);b.step(1);b.pause();
    }
    b.step(0);return {before,c:C.state.crank,actions:P.state.save.sim.akcje,respect:P.state.save.prison.respekt,flag:P.state.save.prison.flagi['praca-2']};
  });
  assert.equal(result.c.elapsed,30);assert.ok(result.c.turns>=10,JSON.stringify(result));
  assert.equal(result.actions,result.before.actions+1);assert.equal(result.respect,result.before.respect);assert.equal(result.flag,true);
  await page.screenshot({path:'artifacts/crank-result.png'});
  await page.evaluate(()=>window.__boxer.step(120));assert.equal(await page.evaluate(()=>window.__boxer.sim.akcje),result.actions);
  await page.locator('#crBack').click();assert.equal(await page.evaluate(()=>window.__boxer.gstate),'hub');assert.equal(await page.locator('#simCard').isVisible(),true);
  assert.equal(await page.locator('.watch-quest strong').count(),0,'work reminder clears after settlement');
  await page.evaluate(async()=>{const G=await import('/src/gym.js'),N=await import('/src/navigation.js');N.stMenuOpen(G.stationOf(G.state.gymItems.find(it=>it.t==='cdoor')));});
  assert.equal(await page.locator('#stMenu button').filter({hasText:'Żelazna korba'}).count(),0);
  // Starting over never transfers a previous run's result to the new save.
  await page.evaluate(async()=>{const C=await import('/src/crank.js');C.startCrank();});
  await page.waitForFunction(async()=>(await import('/src/crank.js')).state.phase==='intro');await page.locator('#crGo').click();
  await page.evaluate(()=>{window.__boxer.step(40);window.__boxer.newGame();window.__boxer.pause();});
  assert.equal(await page.locator('#crankHud').isVisible(),false);assert.equal(await page.evaluate(()=>window.__boxer.sim.akcje),0);
}
