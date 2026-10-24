import assert from 'node:assert/strict';

/** A skill brawl with Harry in the Ward (explicit diagnostic mode): no menu over the intro, real keys queue the skills on the
 * brush-stroke bars, the fixed-step simulation plays the exchange with the fight animations, and the brawl ends on
 * the ordinary result card. */
export async function checkCardFight(page, port){
  await page.goto(`http://127.0.0.1:${port}/?debug=1`);
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
  const intro = await page.evaluate(async () => {
    document.querySelector('[data-a="new"]').click();
    window.__boxer.newGame(); window.__boxer.pause();
    document.getElementById('storyCard').hidden = true;
    (await import('/src/progression.js')).state.save.injuries = [{ id: 'nose', day: 1 }];   // a lasting injury from an earlier brawl
    (await import('/src/sparring.js')).startCardSpar(0, 'cell');
    const m = document.getElementById('khMenu'), shown = !m.hidden && getComputedStyle(m).display !== 'none';
    window.__boxer.step(60);
    return shown;
  });
  assert.equal(intro, false, 'the menu never shows over the room before the brawl is on');
  const skin = await page.evaluate(async () => {
    const R=await import('/src/renderer.js'), {state:A}=await import('/src/appearance.js'), {state:B,torsoEdge,solve,drawBoxer}=await import('/src/boxing.js'), {state:S,renderSpar}=await import('/src/sparring.js');
    renderSpar(true); // The pixel picture (the poster look skips it): in the planning guard the player is drawn last into FB_ALT.
    const colors=ramps=>ramps.flatMap(r=>Array.from(A.PAL.slice(r*3,r*3+3)));
    const shirt=colors([A.R_SHIRT,A.R_SHIRTF]),pants=colors([A.R_PANT,A.R_PANTF]);
    // The low guard naturally covers the chest: inspect its detail with the rear arm extended into a spare frame.
    const {state:P}=await import('/src/animation.js'),keep=P.cur.slice(),probe=new Uint32Array(A.W*A.H),previous=R.setFramebuffer(probe);
    let hair=0;
    try{
      P.cur[P.RGX]=19;P.cur[P.RGY]=-2;solve();drawBoxer();
      for(let y=B.sy+4;y<Math.min(B.sy+10,B.hipY-3);y++)for(let x=torsoEdge(y,false)+2;x<=torsoEdge(y,true)-2;x++)if(probe[y*A.W+x]===A.PAL[A.R_HAIR*3+1])hair++;
    }finally{P.cur.set(keep);solve();R.setFramebuffer(previous);}
    const thigh=(hx,hy,kx,ky)=>S.FB_ALT[Math.round((hy+ky)/2)*A.W+Math.round((hx+kx)/2)];
    const brightness=c=>(c&255)+((c>>>8)&255)+((c>>>16)&255);
    return {shirt:S.FB_ALT.filter(c=>shirt.includes(c)).length,pants:S.FB_ALT.filter(c=>pants.includes(c)).length,hair,
      front:colors([A.R_PANTF]).includes(thigh(B.lhx,B.lhy,B.lkx,B.lky)),
      rear:colors([A.R_PANT]).includes(thigh(B.rhx,B.rhy,B.rkx,B.rky)),
      depth:brightness(A.PAL[A.R_PANTF*3+1])/brightness(A.PAL[A.R_PANT*3+1])};
  });
  assert.equal(skin.shirt,0,'the player has no shirt or sleeves');
  assert.ok(skin.pants>0&&skin.hair>0,'trousers and chest hair are drawn on the animated skeleton');
  assert.ok(skin.front&&skin.rear,'the lead leg shares the far side with the jab arm and the rear leg is nearer and lighter');
  assert.ok(skin.depth>0.8&&skin.depth<0.95,'depth is a subtle shade of the same fabric');
  const carried = await page.evaluate(async () => { const { state: c } = await import('/src/card-fight.js'); return { staMax: c.duel.f[0].staMax, nose: c.duel.f[0].inj.nose, hud: document.getElementById('khStats').textContent }; });
  assert.deepEqual([carried.staMax, carried.nose], [4, true], 'a broken nose from the save enters the brawl: the bar is a point shorter');
  assert.match(carried.hud, /nos/);
  const snap = () => page.evaluate(async () => {
    const { state: c } = await import('/src/card-fight.js');
    const { state: s, isCardFight } = await import('/src/sparring.js');
    const d = c.duel;
    return { cards: isCardFight(), sp: s.SP.phase, phase: c.phase, turn: d?.turn, skills: d?.f[0].skills.slice(), queue: d?.f[0].queue.map(q => q.card),
      sta: d && d.f[0].sta - d.f[0].spent, hud: !document.getElementById('cardHud').hidden, bars: document.querySelectorAll('#khMenu .kh-bar').length,
      menu: !document.getElementById('khMenu').hidden, blocks: document.querySelectorAll('.kh-lane-me .kh-blow').length,
      rival: document.getElementById('khTimeline').textContent, thrown: s.FIG.map(F => F.thrown), landed: s.FIG.map(F => F.landed), hp: s.FIG.map(F => F.hp),
      over: !document.getElementById('over').hidden, title: document.getElementById('overTitle').textContent };
  });
  let v = await snap();
  assert.ok(v.cards && v.hud && v.sp === 'fight' && v.phase === 'plan' && v.menu, 'the cell brawl is fought with skills');
  assert.deepEqual(v.skills, ['jab', 'cross', 'hook', 'jab-k', 'watroba'], 'the starting set from the character sheet');
  assert.equal(v.bars, 6, 'a bar for each skill and „Walcz” after them');
  assert.match(v.rival, /rywal ukrywa plan/, 'the rival has queued, but without reading nothing shows of it');
  const ui = await page.evaluate(() => { const b = [...document.querySelectorAll('#khMenu .kh-bar')].map(e => e.getBoundingClientRect()), m = document.getElementById('khMenu').getBoundingClientRect();
    return { x0: b[0].left, x1: b[1].left, y0: b[0].top, y1: b[1].top, left: m.left, w: innerWidth, t: getComputedStyle(document.querySelector('.kh-bar')).transform }; });
  assert.ok(ui.t !== 'none' && ui.y1 > ui.y0 && ui.x0 !== ui.x1, 'the bars step down past the fighter, tilted like brush strokes: ' + JSON.stringify(ui));
  assert.ok(ui.left >= 0 && ui.left < ui.w / 2, 'the menu hangs beside the player on the left of the screen: ' + JSON.stringify(ui));
  await page.screenshot({ path: 'artifacts/card-fight-plan.png' });
  const key = code => page.evaluate(code => dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })), code);
  await key('Digit1'); await key('Digit2');
  v = await snap();
  assert.deepEqual([v.queue, v.sta, v.blocks], [['jab', 'cross'], 1, 2], 'digits queue skills for stamina; the timeline shows them');
  await key('Digit2');
  assert.deepEqual((await snap()).queue, ['jab', 'cross'], 'no stamina left for another cross');
  await key('Backspace');
  assert.deepEqual((await snap()).queue, ['jab'], 'Backspace takes the last one back');
  await key('ArrowDown'); await key('Space');
  assert.deepEqual((await snap()).queue, ['jab', 'cross'], 'arrows and Spacja pick a bar too');
  // play the brawl: the player's side is laid by the same AI so the fight runs to the end; reactions are left to the impact
  let turns = 0;
  for (let n = 0; n < 500 && !(await snap()).over; n++) {
    const s = await snap();
    if (s.phase === 'plan' && s.sp === 'fight') {
      turns++;
      if (turns > 1) await page.evaluate(async () => { const R = await import('/src/card-rules.js'); const { state: c } = await import('/src/card-fight.js'); R.aiPlan(c.duel, 0, Math.random); });
      await key('Enter');
      const r = await snap();
      assert.equal(r.phase, 'reveal', 'Enter starts the exchange');
      assert.ok(!r.menu, 'the menu leaves the exchange to the fighters');
      if (turns === 1) {
        const cam = await page.evaluate(async () => { const { state: r } = await import('/src/renderer.js'); window.__boxer.step(60); await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); return { vx: r.vx, vs: r.vs, scale: r.scale, sw: r.screen.width }; });
        assert.ok(cam.vs > cam.scale && cam.vx <= 0 && cam.vx + 144 * cam.vs >= cam.sw, 'the exchange moves the camera in, with no bars beside the picture: ' + JSON.stringify(cam));
      }
    }
    await page.evaluate(() => window.__boxer.step(120));
  }
  v = await snap();
  const diag = await page.evaluate(async () => { const { state: c } = await import('/src/card-fight.js'); const { state: s } = await import('/src/sparring.js');
    return [c.phase, c.duel?.turn, c.duel?.step, c.duel?.phase, s.SP.phase, c.qte && JSON.stringify({ ...c.qte, press: 0 }), c.script.length, c.script[0]?.t, c.t, c.wait, c.gather, s.FIG.map(F => F.st + ':' + F.pendHit + ':' + F.down + ':' + F.effPos).join('/')].join(' '); });
  assert.ok(v.over, 'the brawl ends on the result card: ' + diag);
  assert.match(v.title, /bareknuckle/);
  assert.ok(turns >= 2 && turns <= 30, `a brawl lasts a few turns (${turns})`);
  assert.ok(v.thrown[0] > 0 && v.landed[0] + v.landed[1] > 0, 'punches were thrown and landed through the animations');
  const kept = await page.evaluate(async () => ({ save: (await import('/src/progression.js')).state.save.injuries.map(e => e.id),
    stored: JSON.parse(localStorage.getItem('heavybag.save') || '{}').injuries?.map(e => e.id), version: JSON.parse(localStorage.getItem('heavybag.save') || '{}').version,
    rows: document.getElementById('overStats').textContent }));
  assert.ok(kept.save.includes('nose') && kept.stored?.includes('nose') && kept.version === 10, 'lasting injuries stay in the v10 save: ' + JSON.stringify(kept));
  assert.match(kept.rows, /Nosisz rany.*Złamany nos/);
  await page.screenshot({ path: 'artifacts/card-fight-result.png' });
}

/** Skill moments: a clean parry on the closing ring, a dodge, a punch on time, getting up from the boards. */
export async function checkCardMoments(page, port){
  await page.goto(`http://127.0.0.1:${port}/?debug=1`);
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
  await page.evaluate(async () => {
    localStorage.removeItem('heavybag.cardauto');
    document.querySelector('[data-a="new"]').click();
    window.__boxer.newGame(); window.__boxer.pause();
    document.getElementById('storyCard').hidden = true;
    (await import('/src/sparring.js')).startCardSpar(0, 'cell');
    window.__boxer.step(60);
    document.getElementById('fightPlate').hidden = true;   // the opening plate fades on wall time, which stands still here
  });
  const step = n => page.evaluate(n => window.__boxer.step(n), n);
  const press = code => page.evaluate(code => dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true })), code);
  /** Lay both queues by hand. */
  const lay = (me, rival) => page.evaluate(async ([me, rival]) => {
    const R = await import('/src/card-rules.js'); const { state: c } = await import('/src/card-fight.js'); const d = c.duel;
    for (const [side, plan] of [[0, me], [1, rival]]) { const f = d.f[side]; f.queue = []; f.spent = 0; f.sta = 8; f.block = 0;
      for (const id of plan) { if (!f.skills.includes(id)) f.skills.push(id); R.queueSkill(d, side, id); } }
  }, [me, rival]);
  const q = () => page.evaluate(async () => { const { state: c } = await import('/src/card-fight.js'); return { qte: c.qte && { ...c.qte, press: undefined }, t: c.t, phase: c.phase, label: document.getElementById('khQte').textContent,
    visible: !document.getElementById('khQte').hidden, react: !document.getElementById('khReact').hidden, open: c.duel.f[0].open, debt: c.duel.f[0].debt, sta: c.duel.f[0].sta, perfects: c.duel.f[0].perfects, down: c.duel.down, kd: c.duel.f[0].knockdowns, over: c.duel.phase === 'over' }; });
  /** Step until a moment of `kind` is on screen, then until its target (plus `off` ticks), then press `code`. */
  const hit = async (kind, code, off = 0) => {
    let s;
    for (let n = 0; n < 600; n++) { s = await q(); if (s.qte?.kind === kind && !s.qte.done) break; await step(1); }
    assert.equal(s.qte?.kind, kind, `a ${kind} moment appears`);
    await step(Math.max(0, s.qte.target - s.t + off));
    if (kind === 'obrona'){ const r = await q(); assert.ok(r.react && /Q unik · E parowanie/.test(r.label), 'the ring names both reactions: ' + r.label); }
    await press(code);
    return q();
  };
  assert.equal((await q()).phase, 'plan');
  await lay(['jab'], ['cross', 'jab']);
  await press('Enter');
  let s = await hit('atak', 'Space');
  assert.match(s.label, /CZYSTO/, 'a press on the closing ring is clean');
  s = await hit('obrona', 'KeyE');
  assert.match(s.label, /parowanie — CZYSTO/, 'E on the ring: a clean parry');
  assert.deepEqual([s.open, s.debt], [2, 1], 'a parried cross: Otwarcie II, a point off the next turn');
  await page.screenshot({ path: 'artifacts/card-fight-moment.png' });
  s = await hit('obrona', 'KeyQ', -8);
  assert.match(s.label, /unik — dobrze/, 'Q eight ticks early still dodges: the dodge window is wide');
  for (let n = 0; n < 600 && (await q()).phase !== 'plan'; n++) await step(5);
  s = await q();
  assert.equal(s.perfects, 2, 'the clean punch and the clean parry count for XP');
  assert.equal(s.sta, (await page.evaluate(async () => (await import('/src/card-fight.js')).state.duel.f[0].staMax)) - 1, 'two defences, but dodging the jab is free: one point less this turn');
  // a knockdown: the count and three presses inside the swaying zone
  await page.evaluate(async () => { const { state: c } = await import('/src/card-fight.js'); c.duel.f[0].stun = 6; });
  await lay([], ['cross']);
  await press('Enter');
  for (let n = 0; n < 900; n++) { s = await q(); if (s.qte?.kind === 'wstan') break; await step(1); }
  assert.equal(s.qte?.kind, 'wstan', 'a knockdown starts the count');
  await page.screenshot({ path: 'artifacts/card-fight-count.png' });
  for (let n = 0; n < 500 && (await q()).qte?.kind === 'wstan'; n++) {
    s = await q();
    if (Math.abs(s.qte.pos - 0.5) <= s.qte.zone / 2 - 0.02 && !(s.qte.flash > 0)) await press('Space');
    await step(1);
  }
  s = await q();
  assert.equal(s.kd, 1); assert.ok(!s.over, 'three presses in the zone: back on the feet');
  assert.equal(s.qte,null,'getting up completes the minigame');
  assert.equal(s.visible,false,'the count popup disappears immediately after getting up');
  for(let n=0;n<600&&(await q()).phase!=='plan';n++)await step(5);
  assert.equal((await q()).visible,false,'the next planning turn has no stale count popup');
}

/** The rigged fight #6 with cards: Profesor's hint, Silas pulls the spoon, the knuckle-duster result and the infirmary. */
export async function checkCardRigged(page, port){
  await page.goto(`http://127.0.0.1:${port}/?debug=1`);
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
  await page.evaluate(async () => {
    document.querySelector('[data-a="new"]').click();
    window.__boxer.newGame(); window.__boxer.pause();
    document.getElementById('storyCard').hidden = true;
    const { prisonSave } = await import('/src/prison.js'); prisonSave().profesor.spotkany = true;
    const s = await import('/src/sparring.js'); s.setRigged(true); s.startCardSpar(4, 'yard');
    window.__boxer.step(60);
    const { state: c } = await import('/src/card-fight.js'); c.auto = true; c.duel.f[0].hp = c.duel.f[0].hpMax = 90; c.duel.f[1].hp = Math.round(c.duel.f[1].hpMax * 0.6);   // the hero leads by 15%+ and lasts: the spoon comes next turn (Auto gets him up from the boards meanwhile)
  });
  const log = await page.evaluate(() => document.getElementById('khLog').textContent);
  assert.match(log, /Profesor: „Cichy/, 'Profesor whispers about the rival before the brawl');
  let spoon = false;
  for (let n = 0; n < 400; n++) {
    const s = await page.evaluate(async () => {
      const { state: c } = await import('/src/card-fight.js'); const { state: sp } = await import('/src/sparring.js'); const R = await import('/src/card-rules.js');
      if (c.phase === 'plan' && sp.SP.phase === 'fight' && c.duel) { R.aiPlan(c.duel, 0, Math.random); dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', bubbles: true, cancelable: true })); }
      return { over: !document.getElementById('over').hidden, spoon: !!c.duel?.f[1].queue.some(q => q.card === 'cyna') || c.rigFired };
    });
    spoon ||= s.spoon;
    if (s.over) break;
    await page.evaluate(() => window.__boxer.step(120));
  }
  const end = await page.evaluate(async () => ({ title: document.getElementById('overTitle').textContent, stats: document.getElementById('overStats').textContent,
    infirmary: (await import('/src/prison.js')).prisonSave().ambulatorium.zdarzenie }));
  assert.ok(spoon, 'Silas pulled the spoon');
  assert.match(end.title, /KASTET/); assert.ok(end.infirmary, 'the knuckle-duster sends the hero to the infirmary');
}

/** Healing in Newgate: Śmierdziel's ointment by the Ward's tub, the turnkey's way to the surgeon on the yard. */
export async function checkHealers(page, port){
  await page.goto(`http://127.0.0.1:${port}/?debug=1`);
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
  const near = id => page.evaluate(async id => {
    const { state: g } = await import('/src/gym.js'); const { state: n } = await import('/src/npcs.js');
    const C = id === 'smierdziel' ? n.STINK : n.GUARD; g.hubP.i = C.i + 0.45; g.hubP.j = C.j + 0.1; window.__boxer.step(2);
    if (g.hubNear?.id !== id) return null;
    (await import('/src/navigation.js')).stMenuOpen(g.hubNear);
    return [...document.querySelectorAll('#storyChoices button')].map(b => b.textContent);
  }, id);
  const pick = text => page.evaluate(text => { Math.random = () => 0.99; [...document.querySelectorAll('#storyChoices button')].find(b => b.textContent.includes(text)).click(); }, text);
  const state = () => page.evaluate(async () => { const { state: p } = await import('/src/progression.js'); const P = p.save.prison; return { inj: p.save.injuries.map(e => e.id), fajki: P.fajki, konto: P.wypiska }; });
  await page.evaluate(async () => {
    document.querySelector('[data-a="new"]').click(); window.__boxer.newGame(); window.__boxer.pause();
    document.getElementById('storyCard').hidden = true; window.__boxer.step(5);
    const { state: p } = await import('/src/progression.js');
    p.save.injuries = [{ id: 'nose', day: 1 }, { id: 'rib', day: 1 }]; p.save.prison.fajki = 5; p.save.prison.wypiska = 10;
  });
  const stink = await near('smierdziel');
  assert.ok(stink, 'Śmierdziel sits by the tub and can be talked to');
  assert.ok(stink.some(t => /złamany nos/.test(t)) && !stink.some(t => /żebro/.test(t)), 'the ointment is for the face, not for bones: ' + stink);
  await pick('złamany nos');
  assert.deepEqual(await state(), { inj: ['rib'], fajki: 3, konto: 10 });
  await page.evaluate(() => window.__boxer.goRoom('yard'));
  await page.evaluate(() => window.__boxer.step(60));
  const guard = await near('klucznik');
  assert.ok(guard?.some(t => /żebro/.test(t)), 'the turnkey takes you to the surgeon for any injury: ' + guard);
  await pick('żebro');
  assert.deepEqual(await state(), { inj: [], fajki: 3, konto: 7 });
  await page.screenshot({ path: 'artifacts/healers.png' });
}
