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
  await check('HD sandy fight: 432x288, Harry AI, shared joints, clean save and room return',async()=>{
    const snapshot=await page.evaluate(async()=>{
      const b=window.__boxer, I=await import('/src/iso-fight.js');
      const G=await import('/src/gym.js'), R=await import('/src/renderer.js'), P=await import('/src/progression.js');
      b.goRoom('yard');
      const before=JSON.stringify({stats:P.state.save.stats,injuries:P.state.save.injuries,train:P.state.save.train});
      document.querySelector('[data-dev-scene="sandy"]').click(); b.pause(); b.step(60);
      const atStart={mode:b.gstate,venue:I.state.venue,name:I.state.opp.name,
        buffer:[R.state.hd3.W,R.state.hd3.H,R.state.hd3.fb.length],scale:G.state.ISO_K,
        hero:I.state.P.look.style,harry:I.state.O.look.style,room:G.state.hubRoom};
      I.state.O.aiAt=Infinity; // keep the end of the smoke test deterministic
      I.isoFightFinish(0,'KO'); b.step(300);
      const finished=I.state.phase==='end';
      const unchanged=before===JSON.stringify({stats:P.state.save.stats,injuries:P.state.save.injuries,train:P.state.save.train});
      (await import('/src/navigation.js')).exitToHub();
      return {atStart,finished,unchanged,returned:G.state.hubRoom};
    });
    assert.equal(snapshot.atStart.mode,'isofight');
    assert.equal(snapshot.atStart.venue,'sandy');
    assert.equal(snapshot.atStart.name,'HARRY');
    assert.deepEqual(snapshot.atStart.buffer,[432,288,432*288]);
    assert.equal(snapshot.atStart.hero,'fringe');
    assert.equal(snapshot.atStart.harry,'bald');
    assert.equal(snapshot.atStart.room,'cell');
    assert.equal(snapshot.finished,true);
    assert.equal(snapshot.unchanged,true);
    assert.equal(snapshot.returned,'yard');
  });
  await check('Newgate 432x288: Ward, yard and bath exploration and Harry fight',async()=>{
    const room=await page.evaluate(async()=>{
      const b=window.__boxer, R=await import('/src/renderer.js'), G=await import('/src/gym.js');
      const I=await import('/src/iso-fight.js');
      const frame=(f)=>[f.W,f.H,f.fb.length];
      b.goRoom('cell'); b.pause(); b.step(1);
      const ward={frame:frame(R.roomFrame()), background:R.state.hd3.bg.filter(c=>c!==0).length,
        unique:new Set(R.state.hd3.fb).size, sprites:G.state.cellList.filter(it=>it.spr?.length===432*288).length};
      b.startSpar(0,'cell'); b.step(65);
      I.state.O.aiAt=Infinity;
      const startI=I.state.P.i, startJ=I.state.P.j;
      I.state.pointer={x:136,y:68}; b.step(18);
      const fight={venue:I.state.venue,opp:I.state.opp.name,frame:frame(R.state.hd3),
        unique:new Set(R.state.hd3.fb).size,moved:Math.hypot(I.state.P.i-startI,I.state.P.j-startJ)};
      I.state.pointer=null;
      (await import('/src/navigation.js')).exitToHub();
      b.goRoom('yard'); b.step(1);
      const yard={frame:frame(R.roomFrame()),unique:new Set(R.state.hd3.fb).size,background:R.state.hd3.bg.filter(Boolean).length};
      b.goRoom('laznia'); b.step(1);
      const bath={frame:frame(R.roomFrame()),unique:new Set(R.state.hd3.fb).size,background:R.state.hd3.bg.filter(Boolean).length};
      b.goRoom('cell'); b.step(1); // the following screenshot must show the upgraded Ward, not the bath
      return {ward,fight,yard,bath};
    });
    assert.deepEqual(room.ward.frame,[432,288,432*288]);
    assert.ok(room.ward.background>5000,'the full Ward background is baked at 3x');
    assert.ok(room.ward.unique>20,'the 3x Ward renders actual colour detail');
    assert.ok(room.ward.sprites>=3,'cell furniture sprite buffers use 3x resolution');
    assert.equal(room.fight.venue,'cell');
    assert.equal(room.fight.opp,'HARRY');
    assert.deepEqual(room.fight.frame,[432,288,432*288]);
    assert.ok(room.fight.unique>20,'Ward brawl uses the full 3x framebuffer');
    assert.ok(room.fight.moved>0.001,'the pointer moves a fighter with the 3x camera');
    assert.deepEqual(room.yard.frame,[432,288,432*288]);
    assert.deepEqual(room.bath.frame,[432,288,432*288]);
    assert.ok(room.yard.unique>10&&room.bath.unique>10,'other rooms still render');
    assert.ok(room.yard.background>5000&&room.bath.background>5000,'room backgrounds must bake in native 3×');
    await page.screenshot({path:'artifacts/ward-432-288-regression.png'});
  });
  await check('432x288: six native scene captures and Thames camera regression', async()=>{
    const capture=async(file)=>{
      const image=await page.evaluate(async()=>{
        const R=await import('/src/renderer.js'); R.render();
        return R.state.hd3.off.toDataURL('image/png');
      });
      await writeFile('artifacts/'+file,Buffer.from(image.split(',')[1],'base64'));
    };
    for(const venue of ['yard','laznia']){
      await page.evaluate(v=>{const b=window.__boxer;b.goRoom(v);b.pause();b.step(2);},venue);
      await capture(venue+'-432-exploration.png');
      await page.evaluate(async v=>{(await import('/src/iso-fight.js')).startIsoFight(0,v);window.__boxer.step(80);},venue);
      await capture(venue+'-432-fight.png');
      await page.evaluate(async()=>{(await import('/src/navigation.js')).exitToHub();});
    }
    await page.evaluate(()=>{document.querySelector('[data-dev-scene="port"]').click();window.__boxer.step(60);});
    const portFrame=await page.evaluate(async()=>{
      const R=await import('/src/renderer.js'); R.render();
      const G=await import('/src/gym.js');
      return {frame:[R.isometricFrame('port').W,R.isometricFrame('port').H],camera:G.state.propCamera};
    });
    assert.deepEqual(portFrame.frame,[432,288]);
    assert.ok(!portFrame.camera,'port camera context must be restored');
    await capture('port-432-exploration.png');
    await page.evaluate(async()=>{(await import('/src/iso-fight.js')).startIsoFight(0,'port');window.__boxer.step(80);});
    await capture('port-432-fight.png');
    await page.evaluate(async()=>{(await import('/src/navigation.js')).exitToHub();});
  });
  await check('isometric fight: keys, stamina, body blows, block, slip, steps, AI, knockdown, pause and result',()=>checkIsoFight(page));
  await check('isometric fight in the yard and the bath rooms',()=>checkIsoFightRooms(page));
  await check('the unlit Ward lamp has no blinking ember', async () => {
    const colors=await page.evaluate(async()=>{
      const R=await import('/src/renderer.js'), L=await import('/src/cell-light.js'), G=await import('/src/gym.js'), W=await import('/src/ward.js'), B=await import('/src/boxing.js'), A=await import('/src/appearance.js');
      return R.withHD(()=>{
        const buf=new Uint32Array(A.state.W*A.state.H), old=R.setFramebuffer(buf), tick=B.state.tick, bulb=L.state.bulb;
        try{
          const x=Math.round(G.isoX(W.LAMP.i,W.LAMP.j)), y=Math.round(G.isoY(W.LAMP.i,W.LAMP.j,W.LAMP.z))-1, samples=[];
          L.state.bulb=0;
          for(const t of [0,16,32]){ buf.fill(0); B.state.tick=t; L.drawCellLights(); samples.push(buf[y*A.state.W+x]); }
          L.state.bulb=1; buf.fill(0); L.drawCellLights();
          return {samples,socket:L.state.C_SOCKET,lit:buf[y*A.state.W+x],flame:L.state.C_FLAME3};
        } finally { R.setFramebuffer(old); B.state.tick=tick; L.state.bulb=bulb; }
      });
    });
    assert.deepEqual(colors.samples,[colors.socket,colors.socket,colors.socket]);
    assert.equal(colors.lit,colors.flame);
  });
  await check('cell Profesor rolls to Harry and keeps his chair and station together', async () => {
    const result=await page.evaluate(async () => {
      const b=window.__boxer, N=await import('/src/npcs.js'), G=await import('/src/gym.js');
      b.pause(); const p=N.state.PROF, h=N.state.CN.find(c=>c.name==='Harry'), chair=G.state.cellList.find(x=>x.t==='cwheel');
      h.step={k:'sit',s:{c:[4.6,2.15],a:[4.6,2.95],f:[0,1]},d:99999}; h.t=0;
      p.visit={kind:'harry',i:4.6,j:3.8,target:h}; p.path=null; p.t=0;
      b.step(900);
      return {arrived:p.visit?.arrived,distance:Math.hypot(p.i-4.6,p.j-3.8),chair:Math.hypot(p.i-(chair.i+chair.w/2),p.j-(chair.j+chair.h/2-0.05)),station:G.stationOf(chair).look};
    });
    assert.ok(result.arrived); assert.ok(result.distance<0.03); assert.ok(result.chair<0.001); assert.ok(Math.abs(result.station[0]-4.6)<0.03);
  });
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
    assert.equal(await page.locator('[data-a="keys"]').count(),0);
    await page.locator('[data-a="opts"]').click();
    assert.equal(await page.locator('#opts').isVisible(),true);
    assert.equal(await page.locator('#optCardAuto').count(),0);
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
    await check('prison day in phases: meals, work, the yard, the bath, sleep', () => checkPrisonDay(page));
    await check('the Ward at a meal: the bowl, arm wrestling a cellmate, eating on the guard-bed', () => checkCanteenArm(page));
    await check('crank labour: hold/release rhythm, keyboard, pause and prison shift', () => checkCrank(page));
    await check('the evening bath: towels, showers, a fight in the steam and the way back', () => checkBath(page));
    await check('developer mode: any door to any room at any hour, no schedule, no autosave', () => checkDevMode(page));
    await check('developer scene switcher in options: switches locations and activities', () => checkDevSceneSwitcher(page));

    await check('Thames port developer preview, animation and return', async () => {
      const result=await page.evaluate(() => {
        document.querySelector('[data-dev-scene="port"]').click();
        const b=window.__boxer;
        b.step(1);
        const before=document.querySelector('#stage canvas')?.toDataURL() || document.querySelector('canvas').toDataURL();
        b.step(60);
        const after=document.querySelector('#stage canvas')?.toDataURL() || document.querySelector('canvas').toDataURL();
        return {state:b.gstate, changed:before!==after};
      });
      assert.equal(result.state,'port');
      assert.equal(result.changed,true,'barge and water animate as the simulation advances');
      const player=()=>page.evaluate(async()=>(await import('/src/thames-port.js')).thamesPlayer());
      const initial=await player();
      assert.ok(Math.hypot(initial.i-initial.sack.i,initial.j-initial.sack.j)<1.4,'player starts near the sack');
      assert.equal(await page.locator('#prompt').isVisible(),true,'pickup hint appears near the sack');
      const promptPosition=await page.locator('#prompt').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.parentElement.getBoundingClientRect().bottom}));
      assert.ok(promptPosition.top<promptPosition.bottom-150,'pickup hint is placed in the scene rather than below it');
      const obstacles=await page.evaluate(async()=>{ const {thamesBlocked}=await import('/src/thames-port.js'); return [[20.9,8.5],[19.8,7.6],[18,2.7],[21,12.1],[21.6,4.4],[8,4.5],[26.8,11.25],[15,8]].map(([i,j])=>thamesBlocked(i,j)); });
      assert.deepEqual(obstacles,[true,true,true,true,true,true,true,false],'sacks, crates, lamps, barrels, carriage and crane block movement, open ground does not');
      await page.keyboard.down('ArrowUp');
      await page.evaluate(()=>window.__boxer.step(50));
      await page.keyboard.up('ArrowUp');
      const stopped=await player();
      assert.ok(Math.hypot(stopped.i-stopped.sack.i,stopped.j-stopped.sack.j)>=.48,'player cannot walk into the sack');
      await page.evaluate(async()=>(await import('/src/thames-port.js')).startThamesPort());
      await page.keyboard.press('e');
      await page.evaluate(()=>window.__boxer.step(1));
      assert.equal(await page.locator('#prompt').isVisible(),false,'pickup hint disappears while lifting');
      assert.ok((await player()).lift>=0,'E starts the lifting animation');
      await page.keyboard.down('ArrowRight');
      await page.evaluate(()=>window.__boxer.step(60));
      const lifting=await player();
      assert.ok(lifting.lift>=0&&lifting.lift<120&&!lifting.carrying,'the sack is lifted before it is carried');
      assert.equal(lifting.i,initial.i,'player stays in place while lifting');
      await page.evaluate(()=>window.__boxer.step(60));
      await page.keyboard.up('ArrowRight');
      assert.equal((await player()).carrying,true,'E picks up the nearby sack');
      await page.keyboard.down('ArrowRight');
      await page.evaluate(()=>window.__boxer.step(100));
      await page.keyboard.up('ArrowRight');
      const carried=await player();
      assert.equal(carried.carrying,true);
      assert.ok(Math.abs(Math.hypot(carried.i-initial.i,carried.j-initial.j)-1.56)<.15,'carrying speed is 20% faster than the docker’s pace: '+JSON.stringify([carried.i,carried.j,initial.i,initial.j]));
      await page.keyboard.press('e');
      const dropped=await player();
      assert.equal(dropped.carrying,false,'E puts the sack down');
      assert.ok(Math.hypot(dropped.sack.i-initial.sack.i,dropped.sack.j-initial.sack.j)>1,'sack stays at the new location');
      await page.keyboard.press('e');
      await page.evaluate(()=>window.__boxer.step(120));
      assert.equal((await player()).carrying,true,'the dropped sack can be picked up again');
      const horseAnimated=await page.evaluate(async()=>{
        const b=window.__boxer, {state}=await import('/src/renderer.js');
        const head=()=>{const pixels=[];for(let y=48;y<88;y++) for(let x=242;x<285;x++) pixels.push(state.hd.fb[y*288+x]);return pixels.join(',');};
        const before=head();b.step(45);return before!==head();
      });
      assert.equal(horseAnimated,true,'the horse moves its head independently of the water');
      const beforePan=await page.locator('#stage canvas').first().evaluate(c=>c.toDataURL());
      await page.keyboard.down('ArrowRight');
      await page.evaluate(()=>window.__boxer.step(20));
      await page.keyboard.up('ArrowRight');
      const afterPan=await page.locator('#stage canvas').first().evaluate(c=>c.toDataURL());
      assert.notEqual(afterPan,beforePan,'arrow keys move the player and the view across the port');
      await page.evaluate(async()=>(await import('/src/thames-port.js')).startThamesPort());
      assert.match(await page.locator('#portStory').innerText(),/Jeszcze kilka worków/);
      await page.evaluate(()=>window.__boxer.step(240));
      assert.match(await page.locator('#portStory').innerText(),/Przenieś worki do magazynu.*0\/3/);
      for(let n=1;n<=2;n++){
        await page.keyboard.press('e');
        await page.evaluate(()=>window.__boxer.step(120));
        assert.equal((await player()).carrying,true);
        await page.keyboard.down('ArrowUp');
        for(let steps=0;steps<1000&&!(await player()).job.entry;steps+=20) await page.evaluate(()=>window.__boxer.step(20));
        await page.keyboard.up('ArrowUp');
        const entering=await player();
        assert.ok(entering.job.entry&&entering.carrying,'player enters the gate with the sack before delivery');
        await page.evaluate(()=>window.__boxer.step(170));
        assert.equal((await player()).job.delivered,n,'one delivery is counted at the warehouse gate');
        assert.equal((await player()).carrying,false);
        assert.equal((await player()).job.entry,null,'player returns from the warehouse');
        if(n===1) assert.ok(Math.abs((await player()).j-1.15)<.01,'player reappears outside the gate');
        if(n<2){
          await page.keyboard.down('ArrowDown');
          await page.evaluate(()=>window.__boxer.step(180));
          await page.keyboard.up('ArrowDown');
        }
      }
      assert.ok((await player()).story,'story begins after the second delivery');
      /* scenes: advance the simulation to scene tick n without drawing every step, then draw once */
      const sceneAt=n=>page.evaluate(async n=>{ const T=await import('/src/thames-port.js'), b=window.__boxer; for(let k=0;k<3000&&T.thamesPlayer().story&&T.thamesPlayer().story.tick<n;k++) b.sparStep(1); b.step(0); return T.thamesPlayer(); },n);
      const bubble=()=>page.evaluate(()=>{ const el=document.getElementById('npcSay'), r=el.getBoundingClientRect(), c=document.getElementById('screen').getBoundingClientRect(); return {text:el.hidden?'':el.textContent,inside:r.top>c.top&&r.bottom<c.bottom&&r.left>=c.left&&r.right<=c.right}; });
      const lines=[[640,null],[830,/Nie rzygaj przy workach/],[960,/wypierdolę/],[1100,/Policjancie! Pomocy/],[1230,/zajęty/]];
      for(const [n,text] of lines){ const p=await sceneAt(n), say=await bubble();
        if(text){ assert.match(say.text,text,`line at scene tick ${n}`); assert.ok(say.inside,'the line is spoken in a bubble over the picture, not outside it'); }
        else { assert.equal(say.text,'','no bubble between lines'); assert.ok(p.zoom>1.7,'the camera closes in on the drunk being sick: '+p.zoom); } }
      assert.equal(await page.locator('#portStory').isVisible(),false,'the task line gives way to the scene');
      await sceneAt(1340);
      assert.equal(await page.evaluate(()=>window.__boxer.gstate),'isofight');
      assert.equal(await page.evaluate(()=>document.getElementById('npcSay').hidden),true,'the bubble goes when the brawl starts');
      const brawl=await page.evaluate(async()=>{ const I=await import('/src/iso-fight.js'), S=await import('/src/port-story.js'); return {venue:I.state.venue,P:[I.state.P.i,I.state.P.j],O:[I.state.O.i,I.state.O.j],at:S.PORT_BRAWL}; });
      assert.equal(brawl.venue,'port');
      assert.deepEqual([brawl.P,brawl.O],[brawl.at.hero,brawl.at.drunk],'the brawl starts where the scene left the two');
      const portPointer=await page.evaluate(async()=>{
        const I=await import('/src/iso-fight.js'), T=await import('/src/thames-port.js'), G=await import('/src/gym.js'), R=await import('/src/renderer.js'), S=I.state;
        S.O.aiAt=Infinity; window.__boxer.step(60); const C=S.cam, W=R.state.hd.W, H=R.state.hd.H, z=C.z;
        const cx=Math.round(Math.max(W/(2*z),Math.min(W-W/(2*z),C.x))), cy=Math.round(Math.max(H/(2*z),Math.min(H-H/(2*z),C.y)));
        const [x,y]=T.withThamesCamera(()=>[(W/2+(G.isoX(S.P.i,S.P.j)-cx)*z)/2,(H/2+(G.isoY(S.P.i,S.P.j,0)-cy)*z)/2]);
        const start=[S.P.i,S.P.j]; S.pointer={x,y}; window.__boxer.step(12);
        const idle=Math.hypot(S.P.i-start[0],S.P.j-start[1]); S.pointer={x:x+20,y}; window.__boxer.step(12);
        return {idle,di:S.P.i-start[0],dj:S.P.j-start[1]};
      });
      assert.ok(portPointer.idle<.01,'pointer at player does not cause movement in the port: '+JSON.stringify(portPointer));
      assert.ok(portPointer.di>0&&portPointer.dj<0,'player follows pointer in the correct screen direction');
      const drunk=await page.evaluate(async()=>{
        const I=await import('/src/iso-fight.js'), S=I.state, b=window.__boxer;
        I.startIsoFight(0,'port'); b.step(45); S.O.aiAt=0;
        const start=[S.O.i,S.O.j]; b.step(8); const distance=Math.hypot(S.O.i-start[0],S.O.j-start[1]);
        let pids=[], first=null;
        for(let n=0;n<250;n++){ b.step(1); if(S.O.pk){ pids.push(S.O.pk.pid); if(first===null&&S.O.pk.t>0) first=S.O.pk.t; } }
        return {distance,pids,first};
      });
      assert.ok(drunk.distance>0&&drunk.distance<.14,'drunk opponent walks at half speed');
      assert.ok(drunk.pids.length>0&&drunk.pids.every(pid=>pid===0),'drunk opponent throws only jabs');
      assert.ok(Math.abs(drunk.first-1/120)<.002,'drunk jab animation runs at half speed');
      await page.evaluate(async()=>{ const I=await import('/src/iso-fight.js'); I.isoFightFinish(0); window.__boxer.step(400); });
      assert.equal(await page.evaluate(()=>window.__boxer.gstate),'port','victory starts the port aftermath');
      assert.equal((await player()).story.kind,'after');
      const van=await page.evaluate(async()=>{ const T=await import('/src/thames-port.js'), S=await import('/src/port-story.js'), b=window.__boxer, at=n=>{ while(T.thamesPlayer().story.tick<n) b.sparStep(1); };
        at(700); const open=S.storyVanDoor(); at(830); return {open,shut:S.storyVanDoor()}; });
      assert.ok(van.open>.9&&van.shut===0,'the constable opens the van door, puts the drunk in and shuts it: '+JSON.stringify(van));
      for(const [n,text] of [[850,/Pomocy/],[930,/Trzymaj się/],[1180,/aresztowany/]]){ await sceneAt(n); assert.match((await bubble()).text,text,`line at scene tick ${n}`); }
      await sceneAt(1320);
      assert.match(await page.locator('#portStory').innerText(),/Kilka godzin później/);
      await page.evaluate(()=>window.__boxer.step(200));
      assert.equal(await page.evaluate(()=>window.__boxer.gstate),'hub','aftermath transfers the hero to prison');
      assert.equal(await page.evaluate(async()=>(await import('/src/gym.js')).state.hubRoom),'cell');
      await page.evaluate(async()=>(await import('/src/iso-fight.js')).startIsoFight(0,'port'));
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(()=>window.__boxer.gstate),'port','fight returns to the port');
      await page.keyboard.press('Escape');
      assert.equal(await page.evaluate(()=>window.__boxer.gstate),'hub','Escape returns to the previous room');
      const normal=await context.newPage();
      await normal.goto(`http://127.0.0.1:${port}/`);
      const restricted=await normal.evaluate(async()=>{
        const {devSwitchScene}=await import('/src/devtools.js');
        const {state}=await import('/src/boxing.js');
        devSwitchScene('port');
        return {state:state.gstate, visible:getComputedStyle(document.querySelector('[data-dev-scene="port"]')).display!=='none', debug:!!window.__boxer};
      });
      assert.notEqual(restricted.state,'port');
      assert.equal(restricted.visible,false);
      assert.equal(restricted.debug,false);
      await normal.close();
    });
    await check('cell vermin: rats scurry around the cell and react to the boxer', () => checkWardRats(page));
    await check('the character sheet and the one hero: fixed look, needs, trees, perks, fight record', () => checkCharSheet(page));
    await check('fight and yard access without respect or reports', () => checkSupervision(page));
    await check('Profesor: talk, notes, daily task, prison cap and the level-10 trial', () => checkProfesor(page));
    await check('Profesor\'s list: meal and yard boss fights, memories, the rigged fight and the infirmary', () => checkProfesorList(page));
    await check('Spacerniak: list points, the tree tab, tricks and yard memory', () => checkSpacerniak(page));
    await check('daily events, the Sunday brawl, bets and favours', () => checkSundayAndEvents(page));
    await check('cell shadowboxing combos, input cadence, queued pivots and XP', () => checkShadowboxing(page));
    await check('healers: Śmierdziel and the surgeon in the Ward', () => checkHealers(page, port));
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
    await check('pull-up from behind: fists stay on the cross bar, elbows stay under the grips, the body blocks more light at the top', async () => {
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
            const shoulderJoined=Array.from({length:Math.ceil(P.r.sx-P.l.sx)},(_,k)=>{
              const x=Math.floor(P.l.sx)+k, t=(x+0.5-P.l.sx)/(P.r.sx-P.l.sx);
              const shoulderY=P.l.sy+(P.r.sy-P.l.sy)*t;
              const y=Math.floor(shoulderY+(P.ty+3-shoulderY)*(1-Math.abs(2*t-1)));
              return S.state.z[y*a.W+x]>-1e8;
            }).every(Boolean);
            const headRow=Math.floor(P.hy-3), headWidth=Array.from({length:a.W},(_,x)=>S.state.mat[headRow*a.W+x]===2&&S.state.z[headRow*a.W+x]>-1e8).filter(Boolean).length;
            frames.push({step,shoulderJoined,headWidth,light:S.state.light,headY:P.hy,nape:P.ty-P.hy,shoulderY:(P.l.sy+P.r.sy)/2,arms:[P.l,P.r].map((A,k)=>({
              grip:Math.hypot(A.gx-(72+(k?1:-1)*S.GRIP.x),A.gy-S.GRIP.y),
              upper:Math.hypot(A.ex-A.sx,A.ey-A.sy),fore:Math.hypot(A.gx-A.ex,A.gy-A.ey),
              elbowOffset:(k?1:-1)*(A.ex-A.gx),elbowY:A.ey-A.gy}))});
          }
          S.state.ps=1;S.state.pv=0;S.renderPullupScene();
          const fist=[-1,1].map(s=>Math.round(S.GRIP.y-1)*a.W+Math.round(72+s*S.GRIP.x));
          return {frames,GRIP:S.GRIP,fistSkin:fist.every(i=>S.state.z[i]>-1e8&&S.state.mat[i]===5&&r.fb[i]!==S.state.bg[i]),ARM:S.ARM,BAR:S.BAR_Y};
        } finally {solvePullup();window.__boxer.step(0);}
      });
      for(const f of result.frames) for(const arm of f.arms){
        assert.ok(arm.grip<0.01,`fist on the bar at ${f.step}%`);
        assert.ok(Math.abs(arm.elbowY-result.ARM.fore)<0.01&&arm.elbowOffset>=0&&arm.elbowOffset<=1.21,`elbow stays at the same height and moves only slightly outward at ${f.step}%`);
      }
      const hang=result.frames[0],top=result.frames.at(-1);
      for(let k=0;k<2;k++) assert.ok(hang.arms[k].elbowOffset<0.01&&top.arms[k].elbowOffset>1,'elbows move outward as the body rises');
      for(const f of result.frames){
        assert.ok(f.nape<12,`the head stays close to the shoulder girdle at ${f.step}%`);
        assert.ok(f.shoulderJoined,`no background slit between the neck and shoulders at ${f.step}%`);
        assert.ok(f.headWidth>=11,`the head keeps its reference width at ${f.step}%: ${f.headWidth}`);
      }
      assert.ok(Math.abs(top.shoulderY-result.BAR)<5,'at the top the shoulders reach the bar');
      assert.ok(Math.abs((hang.shoulderY-result.BAR)/(2*result.GRIP.x)-0.89)<0.04,'hang shoulder height follows the reference grip span');
      assert.ok(hang.headWidth/(2*result.GRIP.x)>0.26&&hang.headWidth/(2*result.GRIP.x)<0.35,'head width follows the reference grip span');
      assert.ok(hang.headY-8>result.BAR,'at the dead hang the head hangs below the bar');
      assert.ok(top.headY+4<result.BAR,'at the top the chin is over the bar');
      assert.ok(top.light<hang.light-0.19,`the body blocks the window: ${hang.light} → ${top.light}`);
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
        const wall=(await import('/src/roach-scene.js')).state,before=wall.wet.slice();b.resume();roachStrike();b.pause();b.step(7);const blood=wall.wet.some((v,i)=>v>0.69&&v>before[i]);b.step(6+10);const cool=state.phase,pain=state.pain;b.resume();roachStrike();b.pause();const blocked=state.phase;b.step(160);return {cool,pain,blocked,after:state.phase,misses:state.misses,blood};});
      assert.equal(miss.cool,'cool');assert.ok(miss.pain>=10,`knuckles on stone hurt: ${miss.pain}`);assert.equal(miss.blocked,'cool','no punch while the hand shakes');
      assert.equal(miss.after,'aim');assert.equal(miss.misses,1);assert.equal(miss.blood,true,'a miss leaves blood on the wall');
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
    await check('cell push-ups use the bare floor', async () => {
      await page.evaluate(async () => { const b = window.__boxer; b.goRoom('cell'); b.step(120);
        const it = (await import('/src/gym.js')).state.gymItems.find(x => x.t === 'cfloor'); b.hubSet(it.i + 1.3, it.j + 1.4); b.step(30); });   // the free floor for push-ups
      await page.keyboard.press('KeyE');
      await page.keyboard.press('KeyE');
      const result = await page.evaluate(async () => {
        window.__boxer.step(60);
        const { state } = await import('/src/pushups.js');
        const R = await import('/src/renderer.js'), W = await import('/src/ward-wall.js');
        const original = R.state.fb, wall = new Uint32Array(state.bgPU.length);
        R.state.fb = wall; W.wardWallBg(); R.state.fb = original;
        return {
          mode: window.__boxer.gstate, venue: state.puVenue, bare: wall.slice(78*144).every((pixel, i) => pixel === state.bgPU[78*144+i]), breath: state.bgPU.reduce((n, pixel, i) => n + (pixel !== state.bgPUBreath[i]), 0)
        };
      });
      assert.equal(result.mode, 'pushup'); assert.equal(result.venue, 'cell'); assert.equal(result.bare, true); assert.ok(result.breath > 0 && result.breath < 100, 'only the seated figure moves with each breath');
      await page.screenshot({ path: 'artifacts/pushups-floor.png' });
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
        const B = await import('/src/boxing.js'), R = await import('/src/renderer.js'), W = await import('/src/ward.js');
        const types = G.state.gymItems.map(it => it.t), sink = G.state.gymItems.find(it => it.t === 'csink');
        const wash = G.stationOptions(G.stationOf(sink)).map(o => typeof o[0] === 'function' ? o[0]() : o[0]).join(' | ');
        const N = await import('/src/npcs.js'), savedRandom = Math.random, savedMin = P.state.save.sim.min;
        P.state.save.sim.min = 720; let randomIndex=0; Math.random = () => [0.1,0.4,0.7,0.9][randomIndex++%4]; N.cnEnter();
        const pair = N.state.CN.filter(c => c.name === 'Reuben' || c.name === 'Walter');
        const sparring = pair.map(c => [c.name,c.step.k,c.act,G.hubBlocked(c.i,c.j)]);
        const punches = [], steps = [], reactions=[]; for(let k=0;k<1200;k++){ b.step(1); punches.push(pair.map(c => c.pk)); steps.push(pair.map(c => c.i)); reactions.push(pair.map(c=>[c.sparDodge,c.step.fighter?.hurtT||0])); }
        const bothPunch = pair.map((c,i) => punches.some(p => p[i]));
        const dodged=pair.map((c,i)=>reactions.some(r=>r[i][0])), hurt=pair.map((c,i)=>reactions.some(r=>r[i][1]>0));
        const punchKinds=[...new Set(punches.flat().filter(Boolean))].sort(), stepped=pair.every((c,i)=>Math.max(...steps.map(p=>p[i]))-Math.min(...steps.map(p=>p[i]))>0.1);
        const combinations=[];
        for(const random of [0.6,0.8]){
          Math.random=()=>random; const owner=pair.find(c=>c.name==='Reuben'); delete owner.step.exchange;
          const groups=[]; let lastTurn=-1;
          for(let k=0;k<500&&groups.length<3;k++){ b.step(1); const e=owner.step.exchange; if(!e||e.turn===lastTurn) continue; lastTurn=e.turn;
            let group=groups.at(-1); if(!group||group.attacker!==e.attacker) groups.push(group={attacker:e.attacker,kinds:[]}); group.kinds.push(e.kind);
          }
          combinations.push(groups.slice(0,2).map(g=>g.kinds));
        }
        Math.random=()=>0.1;
        const interrupted=pair[1].step; pair[1].step={k:'idle',d:999}; b.step(1); const waiting=[pair[0].act,pair[0].pk]; pair[1].step=interrupted;
        Math.random=()=>0.049; let koSeen=false, helped=false, resumed=false, ragdollMoved=false, blended=false, initialHead;
        for(let k=0;k<2000;k++){ b.step(1); if(pair.some(c=>c.act==='sparDown')){ const down=pair.find(c=>c.act==='sparDown'), F=down.step.fighter; koSeen=true; helped=pair.some(c=>c.act==='sparHelp'); const head=F.rd.nodes[2].z; if(initialHead===undefined) initialHead=head; if(Math.abs(head-initialHead)>1) ragdollMoved=true; if(F.sparDownJoints) blended=true; Math.random=()=>0.1; } if(koSeen&&pair.every(c=>c.act==='guard')){ resumed=true; break; } }
        Math.random=()=>0.1;
        P.state.save.sim.min = 1380; N.cnEnter(); const nightRest = pair.map(c => c.step.k);
        const bed=G.state.gymItems.find(it=>it.t==='bunk'), Z=P.state.save.prison.zapasy, previous=Z.kawa;
        Z.kawa=1; const supplies=G.stationOptions(G.stationOf(bed)).some(o=>typeof o[0]==='string'&&o[0].includes('Zaparz herbatę')); Z.kawa=previous;
        P.state.save.sim.min = 720; Math.random = () => 0.95; N.state.CN.find(c => c.name === 'Jack').routine = 4; N.cnEnter();
        const jack = N.state.CN.find(c => c.name === 'Jack'), toilet = [jack.step.k,jack.act,jack.res,G.hubBlocked(jack.i,jack.j),jack.i,jack.j,jack.fi,jack.fj];
        const routine = [jack.step.k];
        for(let n=0;n<30000 && routine.length<8;n++){ b.step(1); const k=jack.step?.k; if(k && k!=='go' && k!=='idle' && k!==routine.at(-1)) routine.push(k); }
        jack.routine=4; N.cnEnter();
        const A = await import('/src/appearance.js');
        R.withHD(() => { R.state.fb.fill(0); N.cnToiletStream(); }, R.roomFrame());
        const firstStream = R.state.hd3.fb.slice(), streamPixels = firstStream.filter(c => c === A.rgb('#cec4a1') || c === A.rgb('#afa383')).length;
        jack.t += 19; R.withHD(() => { R.state.fb.fill(0); N.cnToiletStream(); }, R.roomFrame());
        const animatedStream = firstStream.some((c,i) => c !== R.state.hd3.fb[i]);
        Math.random = savedRandom; P.state.save.sim.min = savedMin; N.cnEnter();
        const frame = min => {   // render only: stepping would let the schedule move the player
          P.state.save.sim.min = min; G.hubRebake(); G.renderHub(); B.state.tick += 40; G.renderHub();
          const fb = R.state.hd3.fb;   // the Ward is rendered at 3×
          let sum = 0; for (const c of fb) sum += (c & 255) + ((c >> 8) & 255) + ((c >> 16) & 255);
          return { bulb: L.state.bulb, sun: L.state.sun, light: sum / fb.length };
        };
        const hd = { size: [R.roomFrame().W, R.roomFrame().H], native: [(await import('/src/appearance.js')).state.W, (await import('/src/appearance.js')).state.H], k: G.state.ISO_K };
        return { types, wash, toilet, routine, combinations, waiting, koSeen, helped, resumed, ragdollMoved, blended, streamPixels, animatedStream, sparring, bothPunch, punchKinds, stepped, dodged, hurt, nightRest, supplies, sinkPosition:[sink.i,sink.j], washSpot:W.WARD_WASH, washBlocked:G.hubBlocked(...W.WARD_WASH.p), hd, noon: frame(12 * 60), evening: frame(20 * 60), night: frame(23 * 60) };
      });
      for (const t of ['cwash', 'cnews', 'cradio', 'ctable', 'cstool', 'crad', 'ccurt', 'ccom']) assert.equal(r.types.includes(t), false, t + ' is gone (Newgate)');
      for (const t of ['cfloor', 'cshadow', 'csink', 'cwc', 'bunk', 'bunk2', 'cwheel', 'cdoor']) assert.equal(r.types.includes(t), true, t);
      assert.match(r.wash, /Umyj się przy beczce z wodą/);
      assert.deepEqual(r.sparring,[['Reuben','spar','guard',false],['Walter','spar','guard',false]]);
      assert.deepEqual(r.bothPunch,[true,true]);
      assert.deepEqual(r.punchKinds,['cross','hook','jab','upper']);
      assert.equal(r.stepped,true);
      assert.deepEqual(r.dodged,[true,true]);
      assert.deepEqual(r.hurt,[true,true]);
      assert.deepEqual(r.combinations.map(groups=>groups.map(kinds=>kinds.length)),[[2,2],[3,3]]);
      assert.ok(r.combinations.flat().every(kinds=>new Set(kinds).size===kinds.length));
      assert.deepEqual(r.waiting,['rest',null]);
      assert.equal(r.koSeen,true); assert.equal(r.helped,true); assert.equal(r.resumed,true); assert.equal(r.ragdollMoved,true); assert.equal(r.blended,true);
      assert.deepEqual(r.nightRest,['sleep','sleep']);
      assert.equal(r.supplies,true,'supplies remain available at the bunk');
      assert.deepEqual(r.toilet,['toilet','toilet','toilet',false,1.9,4.95,-0.68,0.73]);
      assert.deepEqual(r.routine,['toilet','wash','sleep','pushup','squat','pushup','squat','toilet']);
      assert.ok(r.streamPixels >= 8, 'the stream is drawn visibly above the tub');
      assert.equal(r.animatedStream,true,'the stream changes over time');
      assert.deepEqual(r.sinkPosition,[11.05,4.15]);
      assert.deepEqual(r.washSpot,{p:[10.55,4.45],f:[1,0]});
      assert.equal(r.washBlocked,false,'the washing place is accessible');
      assert.deepEqual(r.hd, { size: [432, 288], native: [144, 96], k: 1 }, 'the Ward has a 3× frame; outside a frame the game stays native');
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
      assert.equal(r.guards, 0, 'the yard has no turnkeys');
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
