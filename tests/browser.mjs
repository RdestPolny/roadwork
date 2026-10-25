import { checkIsoFight, checkIsoFightRooms } from './isofight.mjs';
import { checkCrank } from './crank.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { checkPrisonDay, checkCanteenArm, checkSupervision, checkProfesor, checkProfesorList, checkSpacerniak, checkSundayAndEvents, checkBath, checkCharSheet , checkDevMode, checkDevSceneSwitcher, checkWardRats } from './prison.mjs';
import { checkShadowboxing } from './shadowboxing.mjs';
import { checkHealers } from './healers.mjs';


const port = 5189;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
let context;
let page;
const errors = [];
const results = [];
const path = '/?debug=1';
async function fresh() {
  if (context) await context.close();
  context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(() => {
    let seed = 123456789;
    Math.random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  });
  page = await context.newPage();
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  await page.goto(`http://127.0.0.1:${port}${path}`);
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
  await page.evaluate(() => {
    document.querySelector('[data-a="new"]').click();
    window.__boxer.newGame();
    document.querySelector('#storyChoices button')?.click();
    window.__boxer.pause();
    window.__boxer.step(0);
  });
}
/** The pull-up meter as drawn: rows of the OK zone (yellow) and of its perfect core (green), column x 134. */
async function meterRows(){
  return page.evaluate(async () => {
    const {state:r}=await import('/src/renderer.js');const {state:a}=await import('/src/appearance.js');const {pullupZone}=await import('/src/pullups.js');
    const z=pullupZone(),rows=Array.from({length:50},(_,i)=>25+i),core=r.fb[z.coreTop*a.W+134];
    return {ok:rows.filter(y=>r.fb[y*a.W+134]===a.C_SPARK),core:rows.filter(y=>r.fb[y*a.W+134]===core&&core!==a.C_SPARK),zone:z};
  });
}
/** Hold until the meter reaches a row, release, step once; returns the exercise state. @param {number} row */
async function pullTo(row){
  return page.evaluate(async row => {
    const b=window.__boxer;const {state,holdPullup}=await import('/src/pullups.js');
    b.resume();holdPullup(true);b.pause();
    let ticks=0;while(Math.round(74-49*state.height)>row&&ticks++<200)b.step(1);
    holdPullup(false);b.step(1);
    return {reps:state.reps,perfects:state.perfects,phase:state.phase,lock:state.lock,zoneSize:state.zoneSize,target:state.target,streak:state.streak};
  },row);
}
/** Step until the bar can be pulled again. */
/** One push-up: hold to lower until the chest reaches a row of the depth meter (or, for 'lie', until he goes down on the
 * paper), release, step once. kinds: perfect (bottom of the green core), ok (top of the zone), shallow (above it), mid (middle of the zone), lie. */
async function pushRep(kind){
  return page.evaluate(async kind => {
    const b=window.__boxer, U=await import('/src/pushups.js'), S=U.state, z=U.pushupZone();
    const row={perfect:z.coreEnd-1,ok:z.top,shallow:z.top-2,mid:Math.floor((z.top+z.end-1)/2)}[kind];
    b.resume();U.holdPushup(true);b.pause();
    let n=0;
    if(kind==='lie') while(S.puPhase!=='fail'&&n++<300) b.step(1);
    else { b.step(1); while(S.puPhase==='lower'&&Math.round(82-36*S.puH)<row&&n++<300) b.step(1); }
    U.holdPushup(false);b.step(1);
    return {reps:S.puReps,perfects:S.puPerfects,streak:S.puStreak,phase:S.puPhase,lock:S.puLock,zone:S.puZone,burn:S.puBurn,explosive:S.puExplosive,flash:S.puFlash};
  },kind);
}
/** Step until he is up in the plank again, then stand there some ticks. @param {number} [rest] */
async function pushTop(rest=0){ await page.evaluate(async rest => {const U=await import('/src/pushups.js');let n=0;while(U.state.puPhase!=='top'&&n++<600)window.__boxer.step(1);window.__boxer.step(rest);},rest); }
async function untilHang(){ await page.evaluate(async () => {const {state}=await import('/src/pullups.js');let n=0;while(state.phase!=='hang'&&n++<400)window.__boxer.step(1);}); }
const only = process.argv.find(a => a.startsWith('--only='))?.slice(7).toLowerCase();   // npm run test:browser -- --only=cell
async function check(name, run) {
  if (only && !name.toLowerCase().includes(only)) return;
  await fresh();
  await run();
  results.push({ name, passed: true });
  console.log(`PASS ${name}`);
}
try {
  await check('isometric fight: keys, stamina, body blows, block, slip, steps, AI, knockdown, pause and result',()=>checkIsoFight(page));
  await check('isometric fight in the yard and the bath rooms',()=>checkIsoFightRooms(page));
  await check('Newgate start and pause clock', async () => {
    await mkdir('artifacts', { recursive: true });
    assert.deepEqual(await page.evaluate(() => [window.__boxer.gstate, window.__boxer.room, window.__boxer.phase]), ['hub','cell','prison']);
    await page.screenshot({path:'artifacts/current-cell.png'});
    const before=await page.evaluate(() => window.__boxer.now);
    await page.locator('#sysBtn').click();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__boxer.now),before);
    // Resume and pause in the same browser task; automation latency may otherwise advance real time.
    await page.locator('[data-a="resume"]').evaluate(el=>{el.click();window.__boxer.pause();});
    assert.equal(await page.evaluate(() => window.__boxer.now),before);
  });
  await check('pocket watch follows spent actions, phases and loaded saves', async () => {
    const read=()=>page.locator('#simCard').evaluate(el=>({time:el.querySelector('.watch-time').textContent,phase:el.querySelector('.when').textContent,left:el.querySelectorAll('.action-token.available').length,pixels:el.querySelector('canvas').toDataURL()}));
    await page.evaluate(()=>{ document.getElementById('storyCard').hidden=true; window.__boxer.simSet({faza:0,akcje:0,min:480}); });
    const morning=await read();
    assert.deepEqual([morning.time,morning.phase,morning.left],['08:00','rano',2]);
    await page.evaluate(async()=>{ (await import('/src/simulation.js')).spendAction('trening'); });
    const spent=await read();
    assert.deepEqual([spent.time,spent.left],['11:00',1]);
    assert.notEqual(spent.pixels,morning.pixels,'the watch hands move when an action is spent');
    await page.screenshot({path:'artifacts/pocket-watch.png'});
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.spendAction('mycie'); });
    assert.deepEqual(await page.locator('.watch-actions').getAttribute('aria-label'),'Pozostałe punkty akcji: 0 z 2');
    await page.evaluate(async()=>{ (await import('/src/simulation.js')).nextPhase(); });
    assert.deepEqual(await read().then(s=>[s.time,s.phase,s.left]),['14:00','południe',2]);
    await page.evaluate(async()=>{ (await import('/src/simulation.js')).spendAction('mycie'); (await import('/src/progression.js')).persist(); });
    await page.reload(); await page.waitForFunction(()=>!!window.__boxer);
    await page.evaluate(()=>{ window.__boxer.pause(); });
    assert.deepEqual(await read().then(s=>[s.time,s.left]),['16:30',1],'a reload restores the watch from saved actions');
    await page.locator('[data-a="cont"]').click();
    await page.evaluate(()=>{ window.__boxer.pause(); document.getElementById('storyCard').hidden=true; });
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.nextPhase(); s.spendAction('mycie'); });
    assert.deepEqual(await read().then(s=>[s.time,s.phase,s.left]),['21:30','wieczór',1]);
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.nextPhase(); });
    assert.deepEqual(await read().then(s=>[s.time,s.phase,s.left]),['08:00','rano',2],'sleep resets the watch and actions');
  });
  await check('pocket watch quests, meals and available prison work', async () => {
    await page.evaluate(async()=>{
      const b=window.__boxer;b.simSet({day:2,faza:0,min:480,akcje:0});
      (await import('/src/prison.js')).prisonClockSync();
    });
    assert.match(await page.locator('.watch-quest').textContent(),/Harry.*Obowiązek: żelazna korba/);
    assert.match(await page.locator('.watch-meal.available').textContent(),/Śniadanie.*odbierz/);
    const options=await page.evaluate(async()=> (await import('/src/prison.js')).cellDoorOptions(()=>{}).map(o=>o[0]));
    assert.equal(options.filter(t=>/korba/.test(t)).length,1);
    assert.equal(options.some(t=>/rzeźnia|Kierat/.test(t)),false);
    await page.evaluate(async()=>{
      const G=await import('/src/gym.js');
      const door=G.stationOf(G.state.gymItems.find(x=>x.t==='cdoor'));
      G.stationOptions(door).find(o=>o[0].startsWith('Odbierz miskę'))[1]();
      (await import('/src/simulation.js')).simUI();
    });
    assert.match(await page.locator('.watch-meal.available').textContent(),/zjedz na pryczy/);
    await page.evaluate(async()=>{
      const P=(await import('/src/progression.js')).state.save.prison;
      P.profesor.spotkany=true;P.lista.rozdzial=2;
      window.__boxer.simSet({faza:1,akcje:0,min:840});
    });
    assert.match(await page.locator('.watch-quest').textContent(),/Lista Profesora.*Walter/);
    assert.equal(await page.locator('.watch-quest strong').count(),0);
    assert.equal(await page.locator('.watch-meal.available').count(),0);
    await page.evaluate(()=>window.__boxer.simSet({faza:2,akcje:0,min:1140}));
    assert.match(await page.locator('.watch-meal.available').textContent(),/Kolacja/);
    await page.evaluate(async()=>{
      const M=(await import('/src/ward-meal.js')).currentMeal();M.eaten=true;
      (await import('/src/simulation.js')).simUI();
    });
    assert.match(await page.locator('.watch-meal').textContent(),/Posiłek zjedzony/);
    assert.equal(await page.locator('.watch-meal.available').count(),0);
    await page.evaluate(async()=>{
      const P=(await import('/src/progression.js')).state.save.prison;
      P.lista.rozdzial=3;
      (await import('/src/ward-meal.js')).currentMeal().eaten=false;
      (await import('/src/simulation.js')).simUI();
    });
    assert.match(await page.locator('.watch-quest').textContent(),/Zeke/);
    await page.evaluate(async()=>{
      window.__boxer.simSet({faza:0,akcje:0,min:480});
    });
    await page.screenshot({path:'artifacts/watch-quest-meal.png'});
  });
  await check('needs HUD follows meals, training, washing and saved needs', async () => {
    await page.evaluate(()=>{ document.getElementById('storyCard').hidden=true; window.__boxer.simSet({glod:0,zm:0,h:100}); });
    const values=()=>page.locator('#needsHud [role="meter"]').evaluateAll(els=>els.map(el=>[+el.getAttribute('aria-valuenow'),el.getAttribute('aria-valuetext')]));
    assert.deepEqual(await values(),[[0,'Po posiłku'],[0,'Wypoczęty'],[100,'Czysty']]);
    for(const [raw,display,segments] of [[40.11338888887926,40,4],[99.9,100,10],[0.1,0,0]]){
      await page.evaluate(h=>window.__boxer.simSet({h}),raw);
      assert.equal(await page.locator('[data-need="hygiene"] [role="meter"]').getAttribute('aria-valuenow'),String(display),'accessible values remain rounded');
      assert.equal(await page.locator('[data-need="hygiene"] [role="meter"]').getAttribute('data-filled'),String(segments));
      assert.equal(await page.evaluate(()=>window.__boxer.sim.h),raw,'display rounding preserves actual hygiene');
    }
    await page.evaluate(()=>window.__boxer.simSet({h:100}));
    assert.equal(await page.locator('.need-meter .need-ring').count(),3,'all gauges surround the icons');
    assert.equal(await page.locator('.need-heading span').count(),0,'numeric counters are replaced by the segmented rings');
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.simNudge('glod',3); s.simNudge('zm',4); s.simNudge('h',-80); });
    assert.deepEqual(await values(),[[3,'Wygłodzony · ciosy −2'],[4,'Kondycja −4'],[20,'Bardzo brudny']]);
    assert.equal(await page.locator('#needsHud .bad').count(),3);
    assert.equal(await page.locator('#simCard').textContent().then(t=>/WYGŁODZONY|ZMĘCZONY|BRUDNY/.test(t)),false,'need warnings are grouped on the right');
    await page.evaluate(async()=>{ const s=await import('/src/simulation.js'); s.spendAction('posilek'); s.spendAction('drzemka'); s.spendAction('mycie',65); });
    assert.deepEqual(await values(),[[0,'Po posiłku'],[2,'Kondycja −2'],[85,'Czysty']]);
    await page.evaluate(()=>window.__boxer.simSet({akcje:0,glod:2,zm:3,h:65}));
    assert.deepEqual(await page.locator('.need-meter').evaluateAll(els=>els.map(el=>+el.dataset.filled)),[2,3,7]);
    await page.screenshot({path:'artifacts/needs-hud.png'});
    await page.locator('#needsHud').screenshot({path:'artifacts/needs-hud-detail.png'});
    await page.evaluate(async()=>{ (await import('/src/progression.js')).persist(); });
    await page.reload(); await page.waitForFunction(()=>!!window.__boxer);
    await page.evaluate(()=>window.__boxer.pause());
    assert.deepEqual(await values(),[[2,'Głodny · ciosy −1'],[3,'Kondycja −3'],[65,'Do odświeżenia']]);
    await page.locator('[data-a="cont"]').click();
    await page.evaluate(()=>{ window.__boxer.pause(); document.getElementById('storyCard').hidden=true; });
    await page.evaluate(()=>document.body.classList.add('dlgopen'));
    assert.equal(await page.locator('#needsHud').isVisible(),false,'dialogue keeps the view clear');
    await page.evaluate(()=>{ document.body.classList.remove('dlgopen','hub'); });
    assert.equal(await page.locator('#needsHud').isVisible(),false,'the exploration gauges stay off the fight HUD');
  });
  await check('legacy free save loads into Newgate and keeps progression', async () => {
    await page.evaluate(async () => {
      const p=await import('/src/progression.js');
      const data=JSON.parse(JSON.stringify(p.state.save));
      data.phase='free'; data.room='home'; data.coins=923; data.gym=[]; data.stats.str.lvl=7;
      localStorage.setItem('heavybag.slot.3',JSON.stringify({ts:Date.now(),data}));
      document.getElementById('sysBtn').click();
      document.querySelector('[data-a="load"]').click();
      document.querySelector('[data-a="pick-load"][data-n="3"]').click();
      document.querySelector('[data-a="ask-yes"]').click(); window.__boxer.pause();
    });
    assert.deepEqual(await page.evaluate(async () => {const p=await import('/src/progression.js');return [window.__boxer.phase,window.__boxer.room,p.state.save.stats.str.lvl,p.state.save.gym];}),['prison','cell',7,[]]);
    await page.reload();
    assert.deepEqual(await page.evaluate(async () => { const g=await import('/src/gym.js'); return [window.__boxer.phase,window.__boxer.room,g.state.gymItems.length]; }),['prison','cell',11]);   // the Ward's items, the roach wall included
  });
  await check('retired confinement save loads into the Ward and stays there after reports', async () => {
    await page.evaluate(async () => {
      const p=await import('/src/progression.js'), data=JSON.parse(JSON.stringify(p.state.save));
      data.room='izolatka'; data.stats.str.lvl=7;
      data.prison.izolatkaDo=99999; data.prison.flagi['do-izolatki']=true;
      localStorage.setItem('heavybag.slot.3',JSON.stringify({ts:Date.now(),data}));
      document.getElementById('sysBtn').click();
      document.querySelector('[data-a="load"]').click();
      document.querySelector('[data-a="pick-load"][data-n="3"]').click();
      document.querySelector('[data-a="ask-yes"]').click(); window.__boxer.pause();
      window.__boxer.step(5);
    });
    assert.deepEqual(await page.evaluate(async () => {
      const p=await import('/src/progression.js'), x=await import('/src/prison.js');
      return [window.__boxer.room,p.state.save.stats.str.lvl,p.state.save.prison.izolatkaDo,
        !!p.state.save.prison.flagi['do-izolatki'],x.cardOpen()];
    }),['cell',7,0,false,false]);
    await page.screenshot({path:'artifacts/retired-confinement-ward.png'});
  });
  await check('options and controls preserve paused state', async () => {
    await page.evaluate(() => {
      localStorage.setItem('heavybag.crt','1');
      localStorage.setItem('heavybag.crtcfg',JSON.stringify({scan:1,mask:2,bright:0.7}));
    });
    await page.reload();
    await page.waitForFunction(() => !!window.__boxer);
    await page.evaluate(() => { window.__boxer.newGame(); window.__boxer.pause(); document.getElementById('storyCard').hidden=true; window.__boxer.step(1); });
    await page.locator('#sysBtn').click();
    await page.locator('[data-a="keys"]').click();
    assert.match(await page.locator('#sys').textContent(), /F10|Esc/);
    await page.locator('[data-a="back"]').click();
    await page.locator('[data-a="opts"]').click();
    assert.equal(await page.locator('#opts').isVisible(),true);
    assert.equal(await page.locator('#crt, #optCrt, #optRows, #optPre, #optReset').count(),0,'legacy display settings cannot restore the removed filter');
    assert.doesNotMatch(await page.locator('#opts').textContent(),/CRT|Scanlines|Maska RGB/);
    await page.keyboard.press('c');
    assert.equal(await page.locator('#opts').isVisible(),true,'C has no filter action');
    await page.screenshot({path:'artifacts/options.png'});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#opts').isVisible(),false);
    await page.locator('[data-a="opts"]').click();
    await page.locator('#optClose').click();
    assert.equal(await page.locator('#opts').isVisible(),false,'the close button still works');
    await page.evaluate(() => window.__boxer.pause());
  });
    await check('prison day in phases: meals, work, the yard, the bath, sleep, a report for a missed shift', () => checkPrisonDay(page));
    await check('the Ward at a meal: the bowl, arm wrestling a cellmate, eating on the guard-bed', () => checkCanteenArm(page));
    await check('crank labour: hold/release rhythm, keyboard, pause and prison shift', () => checkCrank(page));
    await check('the evening bath: towels, showers, a fight in the steam and the way back', () => checkBath(page));
    await check('developer mode: any door to any room at any hour, no schedule, no autosave', () => checkDevMode(page));
    await check('developer scene switcher in options: switches locations and activities', () => checkDevSceneSwitcher(page));
    await check('cell vermin: rats scurry around the cell and react to the boxer', () => checkWardRats(page));
    await check('the character sheet and the one hero: fixed look, needs, trees, perks, fight record', () => checkCharSheet(page));
    await check('supervision: fight respect and guard risk, reports stay in the Ward', () => checkSupervision(page));
    await check('Profesor: talk, notes, daily task, prison cap and the level-10 trial', () => checkProfesor(page));
    await check('Profesor\'s list: meal and yard boss fights, memories, the rigged fight and the infirmary', () => checkProfesorList(page));
    await check('Spacerniak: respect points, the tree tab, T tricks, jaw, stomach and yard memory', () => checkSpacerniak(page));
    await check('daily events, the Sunday brawl, bets and favours', () => checkSundayAndEvents(page));
    await check('cell shadowboxing combos, input cadence, queued pivots and XP', () => checkShadowboxing(page));
    await check('healers: Śmierdziel\'s ointment by the tub, the turnkey\'s surgeon on the yard', () => checkHealers(page, port));
    await check('Victorian slaughterhouse lifts, carries, hangs and returns with its previous palette', async () => {
      const outfitBefore=await page.evaluate(async()=>{const {state:a}=await import('/src/appearance.js');return Array.from(a.PAL.slice(a.R_SHIRT*3,(a.R_PANTF+1)*3));});
      await page.evaluate(()=>{window.__boxer.startWork();window.__boxer.step(90);window.__boxer.workTap();window.__boxer.step(15);});
      assert.equal(await page.evaluate(()=>window.__boxer.gstate),'work');
      await page.screenshot({path:'artifacts/slaughterhouse-prototype.png'});
      const light=await page.evaluate(async()=>{
        const b=window.__boxer,{state:w}=await import('/src/work.js'),{state:r}=await import('/src/renderer.js'),{state:a}=await import('/src/appearance.js');
        const luma=c=>0.2126*(c&255)+0.7152*((c>>8)&255)+0.0722*((c>>16)&255);
        const exposure=(x,y)=>luma(r.FB_MAIN[y*a.W+x])/luma(w.bgWork[y*a.W+x]);
        const near=exposure(40,52),far=exposure(108,57),before=r.FB_MAIN[52*a.W+10];
        b.step(12);
        return {near,far,flickers:before!==r.FB_MAIN[52*a.W+10]};
      });
      assert.ok(light.near>light.far*1.7,'the hook end is substantially darker than the loading area');
      assert.ok(light.far<0.4,'only a faint trace of lantern light reaches the hook end');
      assert.equal(light.flickers,true,'flame flutter changes the light on the wagon');

      const phases=await page.evaluate(async()=>{
        const b=window.__boxer, {state:w}=await import('/src/work.js');
        for(let k=0;k<100&&w.WK.phase!=='carry';k++){ if(w.WK.phase==='lift') b.workTap(); b.step(4); }
        const lifted=w.WK.phase;
        // Alternate feet at each pendulum extreme through the public input operations.
        for(let k=0;k<500&&w.WK.phase==='carry';k++){
          const side=Math.sin(w.WK.ph)>0?1:-1;
          if(w.WK.stepT===0&&side!==w.WK.lastKey&&Math.abs(Math.sin(w.WK.ph))>0.85) b.workStepKey(side);
          b.step(1);
        }
        const carried=w.WK.phase;
        for(let k=0;k<100&&w.WK.phase==='hang';k++){
          if(w.WK.sqT>=0&&Math.abs(w.WK.sqM-w.WK.sqZ)<=w.WK.sqPerf) b.workTap(); else b.step(1);
        }
        const thrown=w.WK.phase; b.step(20);
        return {lifted,carried,thrown,hung:w.WK.n,drops:w.WK.drops};
      });
      assert.deepEqual(phases,{lifted:'carry',carried:'hang',thrown:'hoist',hung:1,drops:0});
      await page.screenshot({path:'artifacts/slaughterhouse-victorian-hung.png'});

      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#workEnd').isVisible(),true);
      assert.doesNotMatch(await page.locator('#workStats').textContent(),/monet|zarobek/i);
      await page.keyboard.press('Enter');
      assert.deepEqual(await page.evaluate(async()=>{const p=await import('/src/progression.js');return [window.__boxer.gstate,window.__boxer.room,p.state.save.coins];}),['hub','cell',0]);
      assert.deepEqual(await page.evaluate(async()=>{const {state:a}=await import('/src/appearance.js');return Array.from(a.PAL.slice(a.R_SHIRT*3,(a.R_PANTF+1)*3));}),outfitBefore);
    });
    await check('Cechy: an open slot is free, a change costs tobacco after the first, nothing moves the clock, it survives reload', async () => {
      const r=await page.evaluate(async () => {
        const p=await import('/src/progression.js'),x=await import('/src/prison.js');
        const S=p.state.save;
        S.sim.min=14*60+40; x.prisonClockSync(); S.stats.str={lvl:12,xp:0,banked:0}; S.trials.str={10:true,20:false}; S.prison.fajki=0; S.skills.str.respecs=0; S.traits.str=['','',''];
        const early=p.pickTrait('str',2,'a'), pick=p.pickTrait('str',0,'b'), first=p.pickTrait('str',0,'a'), failed=p.pickTrait('str',0,'b'), intact=S.traits.str[0];
        S.prison.fajki=7; const minute=S.sim.min, paid=p.pickTrait('str',0,'b');
        return {early,pick,first,failed,intact,paid,fajki:S.prison.fajki,moved:S.sim.min-minute,traits:S.traits.str.slice(),respecs:S.skills.str.respecs,cutter:p.playerFightPerks().includes('cutter')};
      });
      assert.deepEqual(r,{early:'level',pick:'',first:'',failed:'fajki',intact:'a',paid:'',fajki:2,moved:0,traits:['b','',''],respecs:2,cutter:true},'a free pick, a free first change, then 5 twists; the day does not move');
      await page.reload();
      assert.deepEqual(await page.evaluate(async()=>{const p=await import('/src/progression.js');return [p.state.save.prison.fajki,p.state.save.traits.str,p.state.save.skills.str.respecs];}),[2,['b','',''],2]);
    });
    await check('Profesor\'s Cechy: tabs, keyboard, level gates, picks and changes, icons, layout and save reload into a fight', async () => {
      await page.evaluate(async () => { const p=await import('/src/progression.js'); for(const k of ['str','spd','end']){ p.state.save.traits[k]=['','','']; p.state.save.stats[k]={lvl:1,xp:0,banked:0}; p.state.save.skills[k].respecs=0; } (await import('/src/skill-tree.js')).openSkillTree(); });
      assert.equal(await page.locator('#skillTree').isVisible(), true);
      assert.equal(await page.locator('[data-trait]').count(), 18, 'two traits at three levels of three attributes');
      const before=await page.evaluate(() => ({now:window.__boxer.now,hub:window.__boxer.hub}));
      await page.keyboard.down('KeyW');
      for(const key of ['Digit1','KeyB','F10','KeyO']) await page.keyboard.press(key);
      await page.keyboard.up('KeyW');
      await page.waitForTimeout(100);
      assert.deepEqual(await page.evaluate(() => ({now:window.__boxer.now,hub:window.__boxer.hub})), before);
      for(let i=0;i<24;i++){
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.getElementById('skillTree').contains(document.activeElement)),true);
      }
      assert.equal(await page.locator('[data-skill-grant]').count(),3,'debug adds test points per attribute');
      assert.equal(await page.locator('.skill-branch:visible').count(),1);
      await page.locator('[data-skill-tab=str]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-skill-tab=spd]').getAttribute('aria-selected'),'true');
      await page.keyboard.press('End');
      assert.equal(await page.locator('[data-skill-tab=bare]').getAttribute('aria-selected'),'true');
      await page.keyboard.press('Home');
      assert.equal(await page.locator('[data-skill-tab=str]').getAttribute('aria-selected'),'true');
      const state=t=>page.locator('[data-trait="'+t+'"]').getAttribute('data-state');
      assert.equal(await state('str:0:a'),'locked','level 1: no Cecha yet');
      await page.locator('[data-trait="str:0:a"]').click({force:true});
      assert.equal(await state('str:0:a'),'locked');
      await page.evaluate(async () => { const p=await import('/src/progression.js'); p.state.save.trials.str={10:true,20:false}; p.state.save.stats.str={lvl:10,xp:0,banked:0}; });
      await page.keyboard.press('Escape'); await page.evaluate(async()=>(await import('/src/skill-tree.js')).openSkillTree());
      assert.deepEqual([await state('str:0:a'),await state('str:1:b'),await state('str:2:a')],['buy','buy','locked']);
      await page.locator('[data-trait="str:0:a"]').click();
      await page.locator('[data-trait="str:1:b"]').click();
      assert.deepEqual([await state('str:0:a'),await state('str:0:b'),await state('str:1:b')],['always','change','always']);
      assert.match(await page.locator('[data-trait="str:0:b"] .skill-state').textContent(),/pierwsza zmiana za darmo/);
      assert.match(await page.locator('#skillNotice').textContent(),/Nowa Cecha: Nokauter/);
      const saved=await page.evaluate(() => JSON.parse(localStorage.getItem('heavybag.save')));
      assert.equal(saved.version,10);
      assert.deepEqual(saved.traits.str,['a','b','']);
      const icons=await page.locator('#skill-panel-str [data-trait] svg, #skill-panel-spd [data-trait] svg, #skill-panel-end [data-trait] svg').evaluateAll(nodes=>nodes.map(node=>node.innerHTML));
      assert.equal(icons.length,18); assert.equal(new Set(icons).size,18);
      await page.evaluate(() => document.getElementById('skillTree').scrollTop=0);
      await page.screenshot({path:'artifacts/skill-tree-desktop.png'});
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => document.activeElement.id==='hubUse'||(!document.body.classList.contains('touch')&&document.activeElement===document.body));   // screen buttons exist on touch screens only
      assert.equal(await page.evaluate(() => Object.values(window.__boxer.hubKeys).some(Boolean)), false);
      await page.reload();
      const reloaded=await page.evaluate(async () => {
        const p=await import('/src/progression.js');
        return {traits:p.state.save.traits};
      });
      assert.deepEqual(reloaded.traits,saved.traits);
    });
    await check('pull-up from behind: fists stay on the cross bar, arms keep their length, the body blocks more light at the top', async () => {
      const result=await page.evaluate(async () => {
        window.__boxer.goRoom('cell');
        const {startPullups,solvePullup}=await import('/src/pullups.js');
        const S=await import('/src/pullup-scene.js');
        const {state:a}=await import('/src/appearance.js');
        const {state:r}=await import('/src/renderer.js');
        startPullups();
        const frames=[];
        try {
          for(let step=0;step<=100;step+=5){
            S.posePullup(step/100);const P=S.state.pose;
            frames.push({step,light:S.state.light,headY:P.hy,arms:[P.l,P.r].map((A,k)=>({
              grip:Math.hypot(A.gx-(72+(k?1:-1)*S.GRIP.x),A.gy-S.GRIP.y),
              upper:Math.hypot(A.ex-A.sx,A.ey-A.sy),fore:Math.hypot(A.gx-A.ex,A.gy-A.ey),
              elbowDown:A.ey>S.BAR_Y,elbowOut:(k?1:-1)*(A.ex-A.sx)>-1}))});
          }
          S.state.ps=1;S.state.pv=0;S.renderPullupScene();
          const fist=[-1,1].map(s=>Math.round(S.GRIP.y-1)*a.W+Math.round(72+s*S.GRIP.x));
          return {frames,fistSkin:fist.every(i=>S.state.z[i]>-1e8&&S.state.mat[i]===5&&r.fb[i]!==S.state.bg[i]),ARM:S.ARM,BAR:S.BAR_Y};
        } finally {solvePullup();window.__boxer.step(0);}
      });
      for(const f of result.frames) for(const arm of f.arms){
        assert.ok(arm.grip<0.01,`fist on the bar at ${f.step}%`);
        assert.ok(Math.abs(arm.upper-result.ARM.upper)<0.6&&Math.abs(arm.fore-result.ARM.fore)<0.6,`arm lengths at ${f.step}%: ${JSON.stringify(arm)}`);
        assert.ok(arm.elbowDown&&arm.elbowOut,`elbow below the bar and outward at ${f.step}%`);
      }
      const hang=result.frames[0],top=result.frames.at(-1);
      assert.ok(hang.headY-8>result.BAR,'at the dead hang the head hangs below the bar');
      assert.ok(top.headY+4<result.BAR,'at the top the chin is over the bar');
      assert.ok(top.light<hang.light-0.25,`the body blocks the window: ${hang.light} → ${top.light}`);
      for(let k=1;k<result.frames.length;k++) assert.ok(result.frames[k].light<=result.frames[k-1].light+0.02,'the room darkens as he rises');
      assert.equal(result.fistSkin,true,'the fists are drawn over the bar (material 5 = hand)');
    });
    await check('pull-up minute: entered at the window, a perfect release scores at once, the target moves and shrinks, Esc aborts', async () => {
      await page.evaluate(() => {const b=window.__boxer;b.goRoom('cell');b.hubSet(6.0,3.25);b.step(120);   /* under the window slot */});
      assert.equal(await page.evaluate(() => window.__boxer.hub.near),'cpull');
      await page.keyboard.press('KeyE');
      await page.getByRole('button',{name:/^Podciąganie na kracie okna · stopień I · minuta/}).click();
      await page.evaluate(() => window.__boxer.step(45));
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'pullup');
      assert.equal(await page.locator('#pullupAction').isVisible(),false,'screen buttons stay off without touch');
      await page.evaluate(() => document.body.classList.add('touch'));
      assert.equal(await page.locator('#pullupAction').isVisible(),true);
      const before=await page.evaluate(async () => {
        const {state:r}=await import('/src/renderer.js');const {state:g}=await import('/src/gym.js');
        const {buildPullupBackground}=await import('/src/pullup-scene.js');const {state:T}=await import('/src/training-session.js');
        const fb=r.fb,camera=g.propCamera;buildPullupBackground();
        return {snap:window.__boxer.snap,stats:window.__boxer.stats,restored:fb===r.fb&&camera===g.propCamera,clock:T.S.t,rounds:T.S.def.rounds};
      });
      assert.equal(before.restored,true);assert.equal(before.rounds,1,'no sets');
      assert.ok(Math.abs(before.clock-60*60)<=60,`one minute on the clock: ${before.clock}`);
      await page.screenshot({path:'artifacts/pullup-hang.png'});
      const meter=await meterRows();
      assert.equal(meter.ok.length+meter.core.length,13,'stage I starts with a 13-row target');
      assert.deepEqual(meter.core,Array.from({length:meter.zone.coreEnd-meter.zone.coreTop},(_,i)=>meter.zone.coreTop+i),'the drawn green core is the judged one');
      assert.ok(meter.core[0]>meter.ok[0]&&meter.core.at(-1)<meter.ok.at(-1),'the core sits inside the OK zone');
      await page.evaluate(() => {window.__boxer.resume();window.__boxer.pause();});
      const center=Math.floor((meter.zone.coreTop+meter.zone.coreEnd-1)/2);
      await page.evaluate(async center => {const b=window.__boxer;const {state,holdPullup}=await import('/src/pullups.js');b.resume();holdPullup(true);b.pause();while(Math.round(74-49*state.height)>center+8)b.step(1);},center);
      await page.screenshot({path:'artifacts/pullup-middle.png'});
      const scored=await pullTo(center);
      await page.screenshot({path:'artifacts/pullup-top.png'});
      assert.equal(scored.reps,1);assert.equal(scored.perfects,1);assert.equal(scored.phase,'down');
      assert.equal(scored.zoneSize,12,'each rep shrinks the target');
      assert.ok(Math.abs(scored.target-(meter.zone.top+6))>=5,'the target moves');
      assert.deepEqual(await page.evaluate(() => window.__boxer.stats),before.stats,'XP waits for the end of the session');
      assert.equal(await page.evaluate(async()=>(await import('/src/training-session.js')).sessionValue('perfect')),1);
      await page.evaluate(() => window.__boxer.step(8));
      await page.screenshot({path:'artifacts/pullup-descent.png'});
      await untilHang();
      await page.screenshot({path:'artifacts/pullup-next-target.png'});
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      assert.equal(await page.locator('#over').isVisible(),true);
      assert.ok((await page.evaluate(() => window.__boxer.stats)).str.xp>before.stats.str.xp,'the aborted session still pays for its part');
      await page.keyboard.press('Escape');await page.evaluate(() => window.__boxer.step(30));
      assert.equal(await page.evaluate(() => window.__boxer.room),'cell');
      assert.equal(await page.evaluate(() => window.__boxer.hub.near),'cpull');
      assert.equal(await page.locator('#pullupAction').isVisible(),false);
      assert.equal(await page.evaluate(() => window.__boxer.snap.lk),before.snap.lk);
    });
    await check('pull-up OK zone, a miss locks the bar for three seconds and widens the target, overholding misses, touch pulls', async () => {
      await page.evaluate(async () => {document.body.classList.add('touch');window.__boxer.goRoom('cell');(await import('/src/pullups.js')).startPullups();window.__boxer.step(45);});
      let z=(await meterRows()).zone;
      const ok=await pullTo(z.top);
      assert.equal(ok.reps,1);assert.equal(ok.perfects,0,'the edge of the zone is only OK');
      assert.equal(await page.evaluate(async()=>(await import('/src/training-session.js')).sessionValue('points')),0.7);
      await untilHang();z=(await meterRows()).zone;
      const size=ok.zoneSize, low=await pullTo(z.end);
      assert.equal(low.reps,1,'released under the zone: no rep');assert.equal(low.lock,180,'three seconds of lock');assert.equal(low.zoneSize,Math.min(13,size+2),'a miss widens the target');
      const locked=await page.evaluate(async () => {
        const b=window.__boxer;const {state,holdPullup}=await import('/src/pullups.js');
        b.resume();holdPullup(true);b.pause();let rose=0;
        for(let i=0;i<170;i++){b.step(1);if(state.phase==='up')rose++;}
        const during={phase:state.phase,reps:state.reps,rose};holdPullup(false);b.step(20);
        return {during,after:state.phase};
      });
      assert.equal(locked.during.rose,0,'the bar stays locked for three seconds');assert.equal(locked.after,'hang');
      const overheld=await page.evaluate(async () => {
        const b=window.__boxer;const {state,holdPullup}=await import('/src/pullups.js');
        const before=state.reps;b.resume();holdPullup(true);b.pause();b.step(160);holdPullup(false);b.step(1);
        return {before,reps:state.reps,lock:state.lock};
      });
      assert.equal(overheld.reps,overheld.before);assert.ok(overheld.lock>100,'holding over the top is a miss');
      await untilHang();z=(await meterRows()).zone;
      const box=await page.locator('#pullupAction').boundingBox();
      await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
      await page.evaluate(() => window.__boxer.resume());await page.mouse.down();
      await page.evaluate(async row => {const b=window.__boxer;b.pause();const {state}=await import('/src/pullups.js');while(Math.round(74-49*state.height)>row)b.step(1);},Math.floor((z.coreTop+z.coreEnd-1)/2));
      await page.mouse.up();await page.evaluate(() => window.__boxer.step(1));
      assert.equal(await page.evaluate(async () => (await import('/src/pullups.js')).state.perfects),1,'touch pulls and releases');
      await page.locator('#menuBtn').click();
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'hub');
      assert.equal(await page.evaluate(() => window.__boxer.room),'cell');
    });
    await check('roach wall: entered at the scratched wall, the mouse leads the fist shadow, a punch squashes a roach, a miss hurts and stops the hand, Esc returns', async () => {
      await page.evaluate(() => {const b=window.__boxer;b.goRoom('cell');b.hubSet(7.7,3.05);b.step(120);});
      assert.equal(await page.evaluate(() => window.__boxer.hub.near),'croach');
      await page.keyboard.press('KeyE');
      await page.getByRole('button',{name:/^Karaluchy na ścianie · stopień I · ogarek łoju/}).click();
      await page.evaluate(() => window.__boxer.step(45));
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'roach');
      const stats=await page.evaluate(() => window.__boxer.stats);
      assert.ok(Math.abs(await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t)-80*60)<=60,'stage I burns 80 s of tallow');
      // The mouse leads the hand: a native point of the wall under the cursor, reached with a little lag.
      const at=await page.evaluate(async () => {const {viewToScreen}=await import('/src/renderer.js');const cv=document.getElementById('screen'),r=cv.getBoundingClientRect(),k=cv.clientWidth/cv.width;const [x,y]=viewToScreen(40,58);return [r.left+x*k,r.top+y*k];});
      await page.mouse.move(at[0],at[1]);
      const lag=await page.evaluate(async () => {const {state}=await import('/src/roaches.js');window.__boxer.step(1);const one=state.hand.x;window.__boxer.step(40);return {aim:[state.aim.x,state.aim.y],one,hand:[state.hand.x,state.hand.y]};});
      assert.ok(Math.abs(lag.aim[0]-40)<1&&Math.abs(lag.aim[1]-58)<1,`the cursor maps to the wall: ${lag.aim}`);
      assert.ok(Math.abs(lag.one-40)>3,'the hand has weight: it does not jump to the cursor');
      assert.ok(Math.hypot(lag.hand[0]-40,lag.hand[1]-58)<0.5,'and settles on it');
      await page.screenshot({path:'artifacts/roach-wall.png'});
      // A roach standing under the shadow: a click squashes it after the punch has flown.
      await page.evaluate(async () => {const {state}=await import('/src/roaches.js');const {KINDS}=await import('/src/roach-rules.js');
        state.roaches=[{id:99,kind:KINDS.black,x:40,y:58,a:0,v:0,leg:0,route:[{x:200,y:58,crack:false}],ri:0,mode:'stop',timer:9999,fade:1,leaving:false,flee:false,maim:false,pace:1}];state.spawnT=1e9;window.__boxer.resume();});
      await page.mouse.down();await page.mouse.up();
      const hit=await page.evaluate(async () => {const b=window.__boxer;b.pause();const {state}=await import('/src/roaches.js');const out=state.phase;b.step(7);return {out,phase:state.phase,kills:state.kills,splats:state.splats.length,pain:state.pain};});
      assert.equal(hit.out,'out');assert.equal(hit.phase,'stop','the fist holds at the wall');
      assert.equal(hit.kills,1);assert.equal(hit.splats,1,'the roach stays as a stain');assert.ok(hit.pain<=1,'a hit barely hurts');
      await page.evaluate(() => window.__boxer.step(4));
      await page.screenshot({path:'artifacts/roach-wall-fist.png'});
      assert.deepEqual(await page.evaluate(() => window.__boxer.stats),stats,'XP waits for the end of the session');
      // Nothing under the knuckles: pain, a pause, and the next click does nothing until the hand obeys again.
      const miss=await page.evaluate(async () => {const b=window.__boxer;const {state,roachStrike}=await import('/src/roaches.js');b.step(20);state.roaches=[];
        b.resume();roachStrike();b.pause();b.step(7+6+10);const cool=state.phase,pain=state.pain;b.resume();roachStrike();b.pause();const blocked=state.phase;b.step(160);return {cool,pain,blocked,after:state.phase,misses:state.misses};});
      assert.equal(miss.cool,'cool');assert.ok(miss.pain>=10,`knuckles on stone hurt: ${miss.pain}`);assert.equal(miss.blocked,'cool','no punch while the hand shakes');
      assert.equal(miss.after,'aim');assert.equal(miss.misses,1);
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      assert.equal(await page.locator('#over').isVisible(),true);
      assert.ok((await page.evaluate(() => window.__boxer.stats)).spd.xp>stats.spd.xp,'the aborted session pays speed for its part');
      await page.keyboard.press('Escape');await page.evaluate(() => window.__boxer.step(30));
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'hub');
      assert.equal(await page.evaluate(() => window.__boxer.hub.near),'croach');
      assert.equal(await page.evaluate(() => document.body.classList.contains('roach')),false);
    });
    await check('pull-up perfect streak buys time, the target shrinks to the stage minimum, sweat runs and the minute ends', async () => {
      // Stage V: the target starts at 9 rows and shrinks to 5.
      await page.evaluate(async () => {window.__boxer.goRoom('cell');const p=await import('/src/progression.js');p.state.save.train.stage.pullup=5;(await import('/src/training-session.js')).chooseStage('pullup',5);(await import('/src/pullups.js')).startPullups();window.__boxer.step(45);});
      for(let rep=1;rep<=10;rep++){
        const z=(await meterRows()).zone, t0=await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t);
        const r=await pullTo(Math.floor((z.coreTop+z.coreEnd-1)/2));
        const t1=await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t);
        assert.equal(r.reps,rep);assert.equal(r.perfects,rep);assert.equal(r.zoneSize,Math.max(5,9-rep));
        if(rep%5===0) assert.ok(t1>t0,`five perfects in a row buy two seconds: ${t0} → ${t1}`); else assert.ok(t1<t0);
        const sweat=await page.evaluate(async()=>(await import('/src/pullup-scene.js')).state.drips.length);
        assert.ok(rep<3?sweat===0:sweat>=1&&sweat<=6,`sweat drops after ${rep}: ${sweat}`);
        if(rep===8){
          const snapshot=() => page.evaluate(async () => (await import('/src/pullup-scene.js')).state.drips.map(d=>[d.x,d.y]));
          const drops=await snapshot();await page.waitForTimeout(120);
          assert.deepEqual(await snapshot(),drops);
          await page.evaluate(() => window.__boxer.step(90));
          assert.notDeepEqual(await snapshot(),drops);
          await page.screenshot({path:'artifacts/pullup-sweat.png'});
        }
        await untilHang();
      }
      const end=await page.evaluate(async () => {const b=window.__boxer;const T=await import('/src/training-session.js');let n=0;while(T.state.S.phase==='run'&&n++<4000)b.step(1);return {phase:T.state.S.phase,grade:T.state.last?.grade,reps:T.state.last?.metrics.reps};});
      assert.equal(end.phase,'summary','the minute runs out');assert.equal(end.reps,10);
      assert.equal(await page.locator('#over').isVisible(),true);
      assert.equal(await page.evaluate(async () => {window.__boxer.step(2400);return (await import('/src/pullup-scene.js')).state.drips.length;}),0,'the drops run off');
      await page.keyboard.press('Escape');
      await page.evaluate(async () => {(await import('/src/pullups.js')).startPullups();window.__boxer.step(0);});
      assert.equal((await meterRows()).zone.end-(await meterRows()).zone.top,9);
    });
    await check('cell push-ups use three printed newspapers and leave tiles uncovered', async () => {
      await page.evaluate(async () => { const b = window.__boxer; b.goRoom('cell'); b.step(120);
        const it = (await import('/src/gym.js')).state.gymItems.find(x => x.t === 'cfloor'); b.hubSet(it.i + 1.3, it.j + 1.4); b.step(30); });   // the free floor for push-ups
      await page.keyboard.press('KeyE');
      await page.keyboard.press('KeyE');
      const result = await page.evaluate(async () => {
        window.__boxer.step(60);
        const { state } = await import('/src/pushups.js');
        const { NEWSPAPER_COLORS } = await import('/src/rooms.js');
        const { state: dimensions } = await import('/src/appearance.js');
        return {
          mode: window.__boxer.gstate, venue: state.puVenue,
          editions: NEWSPAPER_COLORS.paper.map(color => state.bgPU.includes(color)),
          uncovered: !Object.values(NEWSPAPER_COLORS).flat().includes(state.bgPU[85*dimensions.W+110])
        };
      });
      assert.equal(result.mode, 'pushup'); assert.equal(result.venue, 'cell');
      assert.deepEqual(result.editions, [true,true,true]); assert.equal(result.uncovered, true);
      await page.screenshot({ path: 'artifacts/newspapers-pushups.png' });
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(() => window.__boxer.room), 'cell');
    });
    await check('push-up minute: release over the paper, burn builds and rests off, half reps, lying flat and full burn lock for 3 s', async () => {
      await page.evaluate(async () => {document.body.classList.add('touch');window.__boxer.goRoom('cell');const U=await import('/src/pushups.js');U.state.puVenue='cell';U.startPushup();window.__boxer.step(10);});
      const start=await page.evaluate(async () => {const {state:T}=await import('/src/training-session.js');return {rounds:T.S.def.rounds,clock:T.S.t,stats:window.__boxer.stats};});
      assert.equal(start.rounds,1,'no sets');assert.ok(Math.abs(start.clock-3600)<=60,'one minute');
      assert.equal(await page.locator('#pushupAction').isVisible(),true);
      assert.equal(await page.locator('#panel button[data-m="0"]').isVisible(),false,'no punch buttons over the push-ups');
      const p1=await pushRep('perfect');
      assert.equal(p1.reps,1);assert.equal(p1.perfects,1);assert.equal(p1.streak,1);assert.equal(p1.zone,9,'each rep narrows the target');assert.ok(p1.burn>0.05,'a rep burns');
      assert.deepEqual(await page.evaluate(() => window.__boxer.stats),start.stats,'XP waits for the end of the session');
      await pushTop(0);const tired=await page.evaluate(async()=>(await import('/src/pushups.js')).state.puBurn);
      await pushTop(120);const rested=await page.evaluate(async()=>(await import('/src/pushups.js')).state.puBurn);
      assert.ok(tired>0.05&&rested<tired,`resting in the plank drains the burn: ${tired} → ${rested}`);
      const ok=await pushRep('ok');
      assert.equal(ok.reps,2);assert.equal(ok.perfects,1);assert.equal(ok.streak,0,'an OK rep breaks the perfect streak');
      assert.equal(await page.evaluate(async()=>(await import('/src/training-session.js')).sessionValue('points')),1.7);
      await pushTop(120);
      const half=await pushRep('shallow');
      assert.equal(half.reps,2,'a half rep does not count');assert.equal(half.phase,'press');assert.equal(half.lock,0);
      await pushTop(120);
      const zone=half.zone, flat=await pushRep('lie');
      assert.equal(flat.reps,2);assert.equal(flat.phase,'fail');assert.ok(flat.lock>=170,'lying on the paper locks three seconds');assert.equal(flat.zone,Math.min(10,zone+2));
      const locked=await page.evaluate(async () => {const b=window.__boxer,U=await import('/src/pushups.js');b.resume();U.holdPushup(true);b.pause();let lowered=0;
        for(let i=0;i<165;i++){b.step(1);if(U.state.puPhase==='lower')lowered++;}U.holdPushup(false);b.step(1);return lowered;});
      assert.equal(locked,0,'the lock holds');
      await page.screenshot({path:'artifacts/pushup-lock.png'});
      await pushTop(200);
      let gaveOut=null;
      for(let i=0;i<25&&!gaveOut;i++){ const r=await pushRep('mid'); if(r.phase==='fail') gaveOut=r; else await pushTop(0); }
      assert.ok(gaveOut,'rushing without rest burns the arms out');
      assert.ok(Math.abs(gaveOut.burn-0.8)<0.01&&gaveOut.lock>=170,`full burn drops him and locks: ${JSON.stringify(gaveOut)}`);
      await page.locator('#menuBtn').click();
      assert.equal(await page.evaluate(() => window.__boxer.gstate),'hub');
    });
    await check('push-up streak: five perfects come up explosive and count twice, ten clap for two seconds, the minute ends', async () => {
      await page.evaluate(async () => {window.__boxer.goRoom('cell');const U=await import('/src/pushups.js');U.state.puVenue='cell';U.startPushup();window.__boxer.step(10);});
      for(let rep=1;rep<=10;rep++){
        const t0=await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t);
        const r=await pushRep('perfect');
        const t1=await page.evaluate(async()=>(await import('/src/training-session.js')).state.S.t);
        assert.equal(r.streak,rep);assert.equal(r.reps,rep+(rep>=5?1:0)+(rep>=10?1:0),`reps after ${rep}`);
        if(rep===5){ assert.equal(r.explosive,1);assert.equal(r.flash,'WYRZUT X2'); }
        if(rep===10){ assert.equal(r.explosive,2);assert.ok(t1>t0,'the clap buys two seconds'); }
        if(rep===5||rep===10){
          const launched=await page.evaluate(async () => {const U=await import('/src/pushups.js');let seen=0,n=0;while(U.state.puPhase!=='top'&&n++<200){window.__boxer.step(1);if(U.state.puPhase==='launch')seen++;}return seen;});
          assert.ok(launched>0,'the explosive rep leaves the floor');
          if(rep===10) await page.screenshot({path:'artifacts/pushup-clap.png'});
        }
        await pushTop(60);
      }
      const end=await page.evaluate(async () => {const T=await import('/src/training-session.js');let n=0;while(T.state.S.phase==='run'&&n++<4000)window.__boxer.step(1);return {phase:T.state.S.phase,reps:T.state.last?.metrics.reps};});
      assert.equal(end.phase,'summary');assert.equal(end.reps,12);
      assert.equal(await page.locator('#over').isVisible(),true);
      await page.keyboard.press('Escape');
    });
    await check('the Ward: guard-bed, tub, water butt, and tallow light that follows the clock', async () => {
      const r = await page.evaluate(async () => {
        const b = window.__boxer; b.goRoom('cell'); b.step(120);
        const G = await import('/src/gym.js'), L = await import('/src/cell-light.js'), P = await import('/src/progression.js');
        const B = await import('/src/boxing.js'), R = await import('/src/renderer.js');
        const types = G.state.gymItems.map(it => it.t), sink = G.state.gymItems.find(it => it.t === 'csink');
        const wash = G.stationOptions(G.stationOf(sink)).map(o => typeof o[0] === 'function' ? o[0]() : o[0]).join(' | ');
        const frame = min => {   // render only: stepping would let the schedule move the player
          P.state.save.sim.min = min; G.hubRebake(); G.renderHub(); B.state.tick += 40; G.renderHub();
          const fb = R.state.hd.fb;   // the cell is drawn into the 2× frame
          let sum = 0; for (const c of fb) sum += (c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255);
          return { bulb: L.state.bulb, sun: L.state.sun, light: sum / fb.length };
        };
        const hd = { size: [R.state.hd.W, R.state.hd.H], native: [(await import('/src/appearance.js')).state.W, (await import('/src/appearance.js')).state.H], k: G.state.ISO_K };
        return { types, wash, hd, noon: frame(12 * 60), evening: frame(20 * 60), night: frame(23 * 60) };
      });
      for (const t of ['cwash', 'cnews', 'cradio', 'ctable', 'cstool', 'crad', 'ccurt']) assert.equal(r.types.includes(t), false, t + ' is gone (Newgate)');
      for (const t of ['cfloor', 'cshadow', 'ccom', 'csink', 'cwc', 'bunk', 'bunk2', 'cwheel', 'cdoor']) assert.equal(r.types.includes(t), true, t);
      assert.match(r.wash, /Umyj się przy beczce z wodą/);
      assert.deepEqual(r.hd, { size: [288, 192], native: [144, 96], k: 1 }, 'the cell has a 2× frame; outside a frame the game stays native');
      assert.equal(r.noon.bulb, 0, 'no tallow by day');
      assert.ok(r.evening.bulb > 0.5, 'the tallow lamp burns in the evening'); assert.equal(r.evening.sun, 0);
      assert.equal(r.night.bulb, 0, 'the lamp is out after 22:00');
      assert.ok(r.noon.light > r.night.light && r.evening.light > r.night.light, 'smog by day and tallow in the evening are both lighter than the night');
    });
    await check('the exercise yard: hooded men walk the ring in step and halt as one when the hero blocks it', async () => {
      const r = await page.evaluate(async () => {
        const b = window.__boxer, N = await import('/src/npcs.js'), P = await import('/src/progression.js'), Y = await import('/src/exercise-yard.js'), G = await import('/src/gym.js');
        b.newGame('prison'); b.pause(); document.querySelector('#storyChoices button')?.click(); b.pause();   /* the Newgate exercise yard */
        b.goRoom('yard'); P.state.save.sim.min = 600; b.step(1);
        const W = [...N.state.YN, ...N.state.YARD_EXTRA], s0 = W.map(C => C.s);
        for (let k = 0; k < 120; k++) { P.state.save.sim.min = 600; b.step(1); }
        const onRing = W.every(C => Math.abs(Math.hypot(C.i - Y.RING_C[0], C.j - Y.RING_C[1]) - Y.WALK_R) < 0.05);
        const moved = W.every((C, k) => C.s > s0[k] + 0.5), inStep = W.every(C => C.ph === W[0].ph), hooded = W.every(C => C.hood);
        const items = G.state.gymItems.map(it => it.t);
        const p = Y.ringPos(W[0].s + 0.3); G.state.hubP.i = p[0]; G.state.hubP.j = p[1];
        const s1 = W.map(C => C.s); for (let k = 0; k < 30; k++) { P.state.save.sim.min = 600; b.step(1); }
        const halted = W.every((C, k) => C.s === s1[k]);
        const out = { onRing, moved, inStep, hooded, halted, items, guards: N.state.YND.filter(C => C.hd && C.hd.style === 'cap').length };
        b.newGame(); b.pause(); return out;
      });
      assert.deepEqual([r.onRing, r.moved, r.inStep, r.hooded], [true, true, true, true], 'on the ring, walking, in step, hooded');
      assert.equal(r.halted, true, 'the whole column stops for the hero');
      assert.equal(r.guards, 2, 'two turnkeys watch');
      for (const t of ['ybench', 'yhoop', 'ybar']) assert.equal(r.items.includes(t), false, t + ' is gone (Newgate)');
    });
    await check('corrupt autosave remains intact until explicit new game', async () => {
      await page.evaluate(() => { window.__boxer.pause(); });
      // Prevent pagehide from overwriting the intentionally corrupt fixture.
      await page.addInitScript(() => localStorage.setItem('heavybag.save', '{broken'));
      await page.reload();
      assert.equal(await page.evaluate(() => localStorage.getItem('heavybag.save')), '{broken');
      assert.equal(await page.locator('#saveWarning').isVisible(), true);
      await page.evaluate(() => {
        document.querySelector('[data-a="new"]').click();
        document.querySelector('[data-a="ask-yes"]').click(); window.__boxer.pause();
      });
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('heavybag.save')).version), 10);
    });
    await check('denied storage still opens the game and reports failure', async () => {
      await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } }));
      await page.reload();
      await page.waitForFunction(() => !!window.__boxer);
      assert.equal(await page.locator('#saveWarning').isVisible(), true);
      assert.equal(await page.evaluate(() => window.__boxer.gstate), 'hub');
    });
    await check('debug cheats and test hooks are hidden in normal play', async () => {
      await page.goto(`http://127.0.0.1:${port}/`);
      assert.equal(await page.evaluate(() => typeof window.__boxer), 'undefined');
      assert.equal(await page.locator('#shopCheat').count(), 0);
      assert.equal(await page.locator('[data-xp]').count(), 0);
      const skillDebug=await page.evaluate(async () => {
        const p=await import('/src/progression.js');
        const {openSkillTree}=await import('/src/skill-tree.js');
        openSkillTree();
        return {buttons:document.querySelectorAll('[data-skill-grant]').length,tabs:document.querySelectorAll('[data-skill-tab]:not([hidden])').length};
      });
      assert.deepEqual(skillDebug,{buttons:0,tabs:4});
      // Normal play has no free toggles: a fresh fighter cannot take a level-15 Cecha.
      await page.locator('[data-trait="str:2:b"]').click({force:true});
      assert.equal(await page.locator('[data-trait="str:2:b"]').getAttribute('aria-pressed'),'false');
      assert.equal(await page.locator('[data-trait="str:2:b"]').getAttribute('data-state'),'locked');
      await page.keyboard.press('Escape');
      await page.evaluate(() => document.querySelector('[data-a="new"]').click());
      if (await page.locator('[data-a="ask-yes"]').count()) await page.locator('[data-a="ask-yes"]').click();
      assert.equal(await page.locator('#storyCard').isVisible(), true, 'a new game starts with the prison intake');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#storyCard').isVisible(), false);
    });
  assert.deepEqual(errors, []);
} catch (error) {
  results.push({ name: 'failure', passed: false, error: String(error) });
  process.exitCode = 1;
  console.error(error);
} finally {
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/browser-results.json', JSON.stringify({ results, errors }, null, 2));
  await browser.close(); server.kill();
}
