import assert from 'node:assert/strict';

/** Exercise shadowboxing through the station, real controls and fixed-step simulation. */
export async function checkShadowboxing(page){
  const step=n=>page.evaluate(n=>window.__boxer.step(n),n);
  const snap=()=>page.evaluate(async()=>{
    const {state:sh}=await import('/src/shadowboxing.js');
    const {state:s}=await import('/src/sparring.js');
    const {state:b}=await import('/src/boxing.js');
    const {state:p}=await import('/src/progression.js');
    const {sessionValue}=await import('/src/training-session.js');
    return {combos:sessionValue('combos'),active:sh.active,sequence:JSON.parse(JSON.stringify(sh.sequence)),now:b.simNow,
      stats:window.__boxer.stats,coins:p.save.coins,phase:s.SP.phase,pivot:!!s.SP.pivot,
      shadow:s.shadow,rate:s.shadowRate,mirror:s.FA.mirror,
      fighters:s.FIG.map(F=>({hp:F.hp,sta:F.sta,thrown:F.thrown,landed:F.landed,
        manual:F.manual,st:F.st,stT:F.stT,pos:F.effPos,mirror:F.mirror})),boxState:b.state,boxTime:b.stateT};
  });
  const restart=()=>page.evaluate(async()=>{
    const {startShadowboxing}=await import('/src/shadowboxing.js');
    const {clearHeldInput}=await import('/src/input.js');
    clearHeldInput();startShadowboxing();window.__boxer.pause();window.__boxer.step(0);
  });
  const pair=async key=>{await page.keyboard.press(key);await page.keyboard.press(key);};
  // One synchronous burst inside the page (resume → input → pause): no animation frame can run in between,
  // so a quick move cannot finish while the keys are still travelling from the test runner.
  const send=async(token,touch=false)=>page.evaluate(async([token,touch])=>{
    const mirror=(await import('/src/shadowboxing.js')).shadowInputMirror();
    const body=token.startsWith('b'),punch='JCHU'.indexOf(body?token.slice(1):token);
    const key=(type,code)=>window.dispatchEvent(new KeyboardEvent(type,{code,key:code,bubbles:true,cancelable:true}));
    const press=code=>{key('keydown',code);key('keyup',code);};
    window.__boxer.resume();
    try{
      if(punch>=0){
        if(touch){
          const box=document.getElementById('bodyMode');box.checked=body;
          document.querySelector(`#panel button[data-m="${punch}"]`).dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
          box.checked=false;
        }else{
          if(body)key('keydown','ArrowDown');
          press(`Digit${punch+1}`);
          if(body)key('keyup','ArrowDown');
        }
      }else if(token==='DF'||token==='DB'||token==='P'){ const k=mirror===(token!=='DB')?'ArrowLeft':'ArrowRight'; press(k); press(k); }
      else press({S:'KeyQ',D:'Space'}[token]);
    }finally{window.__boxer.pause();}
  },[token,touch]);
  const until=async(predicate,label,limit=500)=>{
    for(let n=0;n<limit;n++){
      const current=await snap();if(predicate(current))return n;
      await step(1);
    }
    assert.fail(`shadowboxing did not ${label} within ${limit} ticks: ${JSON.stringify(await snap())}`);
  };
  const checkLayout=async()=>{
    const layout=await page.evaluate(()=>{
      const elements=['shadowHud','shadowSteps','shadowNotice','shadowTempo','shadowExit'].map(id=>document.getElementById(id));
      return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
        bounds:elements.map(e=>({id:e.id,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right,
          clipped:e.scrollWidth>e.clientWidth+1})),
        rows:[...document.querySelectorAll('#shadowSteps li')].map(e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})};
    });
    assert.equal(layout.overflow,false,'page has no horizontal overflow');
    for(const r of layout.bounds){assert.ok(r.left>=-1&&r.right<=layout.width+1,`${r.id} stays on screen`);assert.equal(r.clipped,false,`${r.id} text remains visible`);}
    for(let i=0;i<layout.rows.length;i++)for(let j=i+1;j<layout.rows.length;j++){
      const a=layout.rows[i],b=layout.rows[j];assert.ok(a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1,'combo instructions do not overlap');
    }
  };

  await page.evaluate(()=>{
    const b=window.__boxer;b.goRoom('cell');b.hubSet(8.0,4.9);b.step(90);   /* the worn patch of the Ward's floor */
  });
  const station=await page.evaluate(()=>window.__boxer.hub);
  assert.equal(station.near,'cshadow','empty cell floor exposes the shadowboxing station');
  const prisonBefore=await page.evaluate(async()=>{
    const {state:p}=await import('/src/progression.js');
    return {coins:p.save.coins};
  });
  await page.keyboard.press('KeyE');
  await page.getByRole('button',{name:/^Walka z cieniem · stopień I/}).click();
  await step(45);
  assert.equal(await page.evaluate(()=>window.__boxer.gstate),'spar');
  assert.equal(await page.locator('#shadowHud').isVisible(),true);
  assert.equal(await page.locator('#shadowNotice').getAttribute('role'),'status');
  let current=await snap();
  assert.equal(current.active,true);assert.equal(current.shadow,true);
  assert.equal(current.fighters[1].manual,true,'the reflection cannot attack by AI');
  assert.equal(current.sequence.combos.length,10);
  assert.equal(await page.locator('#shadowSteps li').count(),current.sequence.current.length);
  await checkLayout();
  await page.screenshot({path:'artifacts/shadowboxing-desktop.png'});

  // Head/body mismatches must clear queued and active moves without an XP award.
  await send(current.sequence.current[0].startsWith('b')?current.sequence.current[0].slice(1):'b'+current.sequence.current[0]);
  current=await snap();
  assert.equal(current.sequence.failures,1);assert.equal(current.sequence.completed,0);
  assert.deepEqual(current.sequence.queue,[]);assert.equal(current.sequence.active,null);
  assert.match(await page.locator('#shadowNotice').textContent(),/błąd|pomył|jeszcze|ponów|spróbuj/i);
  const missStats=current.stats;
  await step(100);assert.deepEqual((await snap()).stats,missStats,'a miss grants no XP');

  // Accepted keys alone cannot finish a combo or grant XP; all animations must finish.
  await restart();
  const queueBefore=await snap(),first=queueBefore.sequence.current;
  for(const token of first)await send(token);
  let queued=await snap();
  assert.equal(queued.sequence.completed,0);assert.equal(queued.sequence.between,false);
  assert.ok(queued.sequence.pace<1.5,'rapid input sets a target without jumping animation speed');
  assert.ok(queued.sequence.targetPace>1);
  assert.equal(queued.sequence.queue.length+(queued.sequence.active===null?0:1),first.length);
  assert.deepEqual(queued.stats,queueBefore.stats);
  await send('U');
  assert.equal((await snap()).sequence.failures,0,'extra keys after a full queue are ignored');
  await step(1);
  queued=await snap();assert.ok(queued.sequence.active,'a real animation consumes the first queued move');
  assert.equal(queued.sequence.completed,0);assert.deepEqual(queued.stats,queueBefore.stats);
  const frozen=await snap();await page.waitForTimeout(100);assert.deepEqual(await snap(),frozen,'debug pause freezes animation and pace');
  await page.keyboard.press('Digit4');assert.deepEqual(await snap(),frozen,'paused keyboard input cannot alter the sequence');
  await page.locator('#sysBtn').click();await page.waitForTimeout(100);
  assert.deepEqual(await snap(),frozen,'the pause menu preserves the queue and common clock');
  await page.locator('[data-a="resume"]').click();
  await page.evaluate(()=>window.__boxer.pause());
  const fastTicks=await until(S=>S.sequence.between,'finish queued combo');
  const fast=await snap();
  assert.ok(fast.sequence.bestPace>1.1,'rapid manual keys speed up the actual animations');
  assert.ok(fast.sequence.bestPace<=2);assert.equal(fast.combos,queueBefore.combos+1,'a finished combination is counted');
  assert.deepEqual(fast.stats,queueBefore.stats,'XP waits for the end of the closed session');
  const awarded=fast.combos;await step(1);assert.equal((await snap()).combos,awarded,'feedback cannot count twice');

  await restart();
  let slowTicks=0,slowAnimationTicks=0;
  for(const token of first){
    await send(token);const ticks=await until(S=>S.sequence.active===null&&S.sequence.queue.length===0,'finish slow action');
    slowTicks+=ticks;slowAnimationTicks+=ticks;
    if(!(await snap()).sequence.between){await step(50);slowTicks+=50;}
  }
  const slow=await snap();
  assert.equal(slow.sequence.bestPace,1,'deliberate slow input keeps normal animation speed');
  assert.ok(slowTicks>fastTicks+10,'rapid input finishes the same combo sooner');
  assert.ok(slowAnimationTicks>fastTicks+2,'actual animation duration falls with fast input, excluding idle gaps');

  await restart();
  for(const token of first)await send(token);
  await step(15);const brisk=await snap();
  assert.ok(brisk.sequence.pace>1);
  await step(210);const idle=await snap();
  assert.ok(idle.sequence.pace<brisk.sequence.pace,'idle time relaxes the pace');
  assert.ok(idle.sequence.pace>=1&&idle.sequence.pace<1.05);

  // Complete all ten combos with actual keyboard actions, including both screen facings.
  await restart();
  const fullBefore=await snap(),covered=new Set(),facings=new Set();let usedTouch=false,awards=0;
  for(let combo=0;combo<10;combo++){
    await until(S=>!S.sequence.between,'leave completion feedback');
    current=await snap();assert.equal(current.sequence.comboIndex,combo);
    const stats=current.stats,failures=current.sequence.failures;
    if(combo===7){
      // Queue the backward gesture before the accepted pivot has animated its turn.
      const face=current.mirror;
      for(const token of current.sequence.current){facings.add((await snap()).mirror);covered.add(token);await send(token);}
      const queue=await snap();
      assert.equal(queue.sequence.failures,failures,'queued P followed by DB maps the upcoming screen facing');
      assert.equal(queue.sequence.completed+(queue.sequence.active?1:0)+queue.sequence.queue.length,current.sequence.current.length);
      assert.equal(queue.mirror,face,'queued backward input arrives before the pivot turns');
      assert.deepEqual(queue.stats,stats,'a fully queued pivot combo has no premature reward');
      await until(S=>S.sequence.between,'finish fast queued pivot combo');
      assert.equal((await snap()).mirror,!face);
    }else for(const token of current.sequence.current){
      facings.add((await snap()).mirror);covered.add(token);
      const touch=token.startsWith('b')&&!usedTouch;if(touch)usedTouch=true;
      const beforeAction=await snap();await send(token,touch);await step(1);
      const moving=await snap();
      assert.equal(moving.sequence.failures,failures,`${combo+1}: correct ${token}`);
      assert.equal(moving.sequence.completed,beforeAction.sequence.completed,`${token} needs its full animation`);
      assert.equal(moving.sequence.active,token,`${token} enters the real animation`);
      if(token==='P')assert.equal(moving.pivot,true,'pivot animates rather than teleporting');
      await until(S=>S.sequence.active===null&&S.sequence.queue.length===0,`finish ${token}`);
      const done=await snap();
      assert.equal(done.sequence.completed,beforeAction.sequence.completed+1);
      if(token==='P')assert.equal(done.mirror,!beforeAction.mirror,'pivot changes screen facing');
      if(!done.sequence.between)assert.deepEqual(done.stats,stats,'individual moves grant no XP');
    }
    current=await snap();assert.equal(current.sequence.between,true);
    assert.equal(current.combos,combo+1,`combo ${combo+1} is counted for the session`);awards++;
    const after=current.stats;await step(1);assert.deepEqual((await snap()).stats,after);
  }
  await until(S=>S.sequence.finished,'finish all ten combinations');
  const finished=await snap();assert.equal(awards,10);assert.equal(finished.sequence.failures,0);
  assert.notDeepEqual(finished.stats,fullBefore.stats,'the finished session awards XP once');
  assert.match(await page.locator('#shadowSummary').textContent(),/Ocena [SABCD]/);
  assert.equal(finished.phase,'end','finished shadowboxing stops the combat simulation');
  for(const token of ['J','C','H','U','bC','bH','DF','DB','S','P'])assert.ok(covered.has(token),`repertoire contains ${token}`);
  assert.deepEqual([...facings].sort(),[false,true]);assert.equal(usedTouch,true);
  assert.equal(finished.fighters[0].hp,fullBefore.fighters[0].hp);
  assert.equal(finished.fighters[1].hp,fullBefore.fighters[1].hp);
  assert.equal(finished.fighters[1].thrown,0,'the ghost has no AI attacks');
  assert.equal(finished.fighters[0].landed,0,'reflection cannot grant hit rewards or automatic perks');
  await send('J');await step(300);
  assert.deepEqual((await snap()).stats,finished.stats,'finished training cannot award again');
  assert.deepEqual((await snap()).fighters.map(F=>[F.hp,F.thrown,F.landed]),finished.fighters.map(F=>[F.hp,F.thrown,F.landed]),'finished training causes no extra punches or damage');
  assert.equal(await page.locator('#shadowRestart').isVisible(),true);
  await page.screenshot({path:'artifacts/shadowboxing-finished.png'});

  await page.locator('#shadowRestart').click();await page.evaluate(()=>window.__boxer.pause());await step(0);
  current=await snap();assert.equal(current.sequence.comboIndex,0);assert.equal(current.sequence.finished,false);
  assert.equal(current.sequence.pace,1);assert.equal(current.sequence.failures,0);
  await checkLayout();
  await page.locator('#shadowExit').click();await step(60);
  assert.equal(await page.evaluate(()=>window.__boxer.gstate),'hub');
  assert.equal(await page.evaluate(()=>window.__boxer.room),'cell');
  assert.equal(await page.evaluate(()=>window.__boxer.hub.near),'cshadow');
  const returned=await page.evaluate(()=>window.__boxer.hub);
  assert.equal(returned.i,station.i);assert.equal(returned.j,station.j,'exit returns to the same cell floor station');
  assert.equal(await page.locator('#shadowHud').isVisible(),false);
  assert.equal((await snap()).active,false);assert.equal((await snap()).shadow,false);
  assert.equal((await snap()).coins,prisonBefore.coins,'shadowboxing gives no inmate money reward');
}
