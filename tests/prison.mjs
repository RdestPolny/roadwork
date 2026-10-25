import assert from 'node:assert/strict';

/** Prison act: a new game starts in the cell; the day is three phases of two actions — meals, work, the yard, the bath, sleep. */
export async function checkPrisonDay(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer;
    b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), R = await import('/src/rooms.js'), X = await import('/src/prison.js'), W = await import('/src/crank.js');
    const S = P.state.save.sim, PR = P.state.save.prison, out = {};
    out.start = {phase: b.phase, room: G.state.hubRoom, card: X.cardOpen(), title: document.getElementById('storyTitle').textContent, coins: P.state.save.coins, faza: S.faza};
    document.querySelector('#storyChoices button').click(); b.pause();
    const st = t => G.stationOf(G.state.gymItems.find(x => x.t === t));
    const lab = o => (typeof o[0] === 'function' ? o[0]() : o[0]) + (o[2] ? ' [x]' : '');
    const opts = t => G.stationOptions(st(t));
    const door = () => opts({yard:'ydoor', laznia:'ldoor'}[G.state.hubRoom] || 'cdoor');
    const pick = (list, start) => { const o = list.find(x => lab(x).startsWith(start)); if (!o) throw new Error('no option ' + start + ' in ' + list.map(lab).join(' | ')); o[1](); };
    const cards = [];
    const run = (n) => { for (let i = 0; i < n; i++) { b.step(1); if (X.cardOpen()) { cards.push(document.getElementById('storyTitle').textContent); document.querySelector('#storyChoices button').click(); b.pause(); } } };
    const idle = () => { run(5); for (let i = 0; i < 4000 && (R.state.hubAct || X.cardOpen()); i++) run(1); run(5); };
    try {
    out.noon = {door: door().map(lab), bunk: opts('bunk').map(lab)};
    pick(door(), 'Wyjdź na spacerniak'); run(20); out.yard = G.state.hubRoom;
    pick(door(), 'Wróć do celi'); run(20);
    pick(door(), 'Zakończ'); idle();
    out.evening = {faza: S.faza, akcje: S.akcje, door: door().map(lab)};
    pick(door(), 'Odbierz miskę'); pick(opts('bunk'), 'Zjedz na pryczy'); idle();
    out.supper = {glod: S.glod, akcje: S.akcje};
    pick(door(), 'Idź do łaźni'); run(20); out.bath = G.state.hubRoom;
    const tub = G.state.gymItems.filter(x => x.t === 'lshower').map(x => G.stationOptions(G.stationOf(x))).find(o => o.some(x => lab(x).startsWith('Kąpiel'))); pick(tub, 'Kąpiel w wannie'); idle();
    out.morning = {day: S.day, faza: S.faza, akcje: S.akcje, h: S.h, room: G.state.hubRoom, door: door().map(lab)};
    pick(door(), 'Odbierz miskę'); pick(opts('bunk'), 'Zjedz na pryczy'); idle();
    pick(door(), 'Żelazna korba');
    for(let i=0;i<200&&W.state.phase==='loading';i++) await new Promise(resolve=>setTimeout(resolve,10));
    out.work = window.__boxer.gstate === 'crank';
    W.crankGo(); W.crankReturn(); W.crankReturn(); idle(); run(60);            // walk off the job at once: the second action of the morning (the zoom back in first)
    out.afterWork = {day: S.day, faza: S.faza, zm: S.zm, glod: S.glod, op: PR.opinia};
    pick(door(), 'Zakończ'); idle(); run(60); pick(opts('bunk'), 'Śpij'); idle(); run(60);
    out.day3 = {day: S.day, faza: S.faza, raporty: PR.raporty.length};
    pick(door(), 'Zakończ'); idle(); run(60);            // no work this morning: a report
    out.skipped = {faza: S.faza, raporty: PR.raporty.length, door: door().map(lab)};
    } catch (e) { out.error = String(e)+' at day '+S.day+' phase '+S.faza+' '+JSON.stringify(out); }
    out.cards = cards.slice();
    b.newGame();
    return out;
  });
  assert.equal(r.error, undefined);
  assert.deepEqual([r.start.phase, r.start.room, r.start.card, r.start.title, r.start.coins, r.start.faza], ['prison', 'cell', true, 'Przyjęcie', 0, 1], 'the intake on Monday at noon');
  assert.deepEqual(r.noon.door, ['Wyjdź na spacerniak', 'Zakończ: południe → wieczór · zostało akcji: 2']);
  assert.deepEqual(r.noon.bunk, ['Drzemka · 1 akcja · −2 zmęczenia — nie jesteś zmęczony [x]', 'Sen dopiero wieczorem [x]']);
  assert.equal(r.yard, 'yard', 'walking out to the yard costs no action');
  assert.equal(r.evening.faza, 2); assert.equal(r.evening.akcje, 0);
  assert.ok(r.evening.door.includes('Idź do łaźni') && r.evening.door.some(o => o.startsWith('Odbierz miskę')), 'supper and the bath in the evening');
  assert.deepEqual(r.supper, {glod: 0, akcje: 1}, 'eating is an action and ends hunger');
  assert.equal(r.bath, 'laznia');
  assert.deepEqual([r.morning.day, r.morning.faza, r.morning.akcje, r.morning.room], [2, 0, 0, 'cell'], 'the bath was the second evening action: the night passes, Tuesday morning in the cell');
  assert.ok(r.morning.h >= 85, 'washed: ' + r.morning.h);
  assert.ok(r.morning.door.some(o => o.startsWith('Żelazna korba')) && r.morning.door.some(o => o.includes('bez pracy to raport')), 'work in the morning');
  assert.equal(r.work, true, 'the shift is the crank minigame');
  assert.deepEqual([r.afterWork.day, r.afterWork.faza, r.afterWork.zm, r.afterWork.glod], [2, 1, 1, 1], 'breakfast and work: noon, tired by one, not hungry yet');
  assert.equal(r.morning.door.some(o=>/rzeźnia|Kierat/.test(o)),false,'only crank labour is available');
  assert.deepEqual([r.day3.day, r.day3.faza, r.day3.raporty], [3, 0, 0]);
  assert.deepEqual([r.skipped.faza, r.skipped.raporty], [1, 1], 'a morning without work is a report');
  assert.ok(r.skipped.door.includes('Zakaz spaceru — kara za raport [x]'), 'and the yard is lost');
}

/** The Ward at a meal: the bowl through the flap, arm wrestling a cellmate for his bread, eating on the guard-bed. */
export async function checkCanteenArm(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), A = await import('/src/armwrestle.js'), B = await import('/src/boxing.js');
    const K = await import('/src/ward-meal.js'), RD = await import('/src/renderer.js'), PD = await import('/src/prison-data.js');
    document.querySelector('#storyChoices button').click(); b.pause();
    const out = {};
    const st = t => G.stationOf(G.state.gymItems.find(x => x.t === t));
    G.stationOptions(st('cdoor')).find(o => o[0].startsWith('Zakończ'))[1]();   /* noon over: supper through the flap */
    const X = await import('/src/prison.js');
    for (let i = 0; i < 600 && !K.currentMeal(); i++) { b.step(1); if (X.cardOpen()) document.querySelector('#storyChoices button').click(); }
    const R = await import('/src/rooms.js'); for (let i = 0; i < 600 && R.state.hubAct; i++) b.step(1);
    out.room = G.state.hubRoom; out.rooms = PD.PRISON_ROOMS.slice();
    out.carryBefore = K.carryingTray();
    const N = await import('/src/navigation.js');
    const hudVisible = () => ['simCard','needsHud'].every(id => getComputedStyle(document.getElementById(id)).display !== 'none');
    N.stMenuOpen(st('cdoor'));
    Array.from(document.querySelectorAll('#stMenu button')).find(el => el.textContent.startsWith('Odbierz miskę')).click();
    b.step(30); // Complete the same station transition as a real click at the flap.
    out.carry = K.carryingTray();
    out.hudAfterFlap = hudVisible();
    const S = P.state.save.sim;
    S.akcje = 2;
    out.withoutActions = G.stationOptions({id:'cellfight', cn:0}).filter(o => o[0].startsWith('Siłowanie')).map(o => ({label:o[0], disabled:!!o[2]}));
    S.akcje = 0;
    out.beforePortion = [S.akcje, S.zm, S.h];
    const bout = (stake, smart) => {
      const mate = {id:'cellfight', cn:0, spot:[2, 4], look:[2, 3.6, 15]}; G.state.hubNear = mate;
      G.stationOptions(mate).find(o => o[0].includes(stake))[1]();
      for (let t = 0; t < 1400 && A.state.A && !A.state.A.result; t++) {
        const tell = A.state.A.tell > 0.5;
        if (smart) { if (tell !== A.state.A.brace) A.armButton(tell ? 'brace' : 'braceOff'); if (A.state.A.t % 34 === 0 && !tell) A.armButton('push'); }
        b.step(1);
        if (t === 200) { RD.render(); out.drawn = RD.state.hd.fb.some(c => (c & 255) > 60); }
      }
      const res = A.state.A?.result; A.armButton('push'); b.step(2); return res;
    };
    out.win = bout('o porcję', true); out.g = B.state.gstate; out.respekt = P.state.save.prison.respekt;
    out.afterPortion = [S.akcje, S.zm, S.h];
    out.eat = G.stationOptions(st('bunk'))[0][0]; out.carryAfterWin = K.carryingTray();
    G.stationOptions(st('bunk'))[0][1](); out.carryEating = K.carryingTray();
    for (let i = 0; i < 900 && (R.state.hubAct || X.cardOpen()); i++) { b.step(1); if (X.cardOpen()) document.querySelector('#storyChoices button').click(); }
    for (let i = 0; i < 60; i++) b.step(1);
    out.hudAfterEating = hudVisible();
    out.next = [S.day, S.faza, S.akcje];
    out.idle = bout('dla sportu', false); out.respekt2 = P.state.save.prison.respekt;
    for (let i = 0; i < 900 && !(S.faza === 0 && !R.state.hubAct && !X.cardOpen()); i++) { b.step(1); if (X.cardOpen()) document.querySelector('#storyChoices button').click(); }
    out.afterSport = [S.day, S.faza, S.akcje];
    b.newGame();
    return out;
  });
  assert.equal(r.room, 'cell', 'the meal is in the Ward');
  assert.equal(r.hudAfterFlap, true, 'taking the bowl through the flap keeps the exploration HUD visible');
  assert.equal(r.hudAfterEating, true, 'the watch and needs remain visible after eating');
  assert.equal(r.rooms.includes('canteen'), false, 'Newgate has no canteen');
  assert.deepEqual([r.win, r.g], ['win', 'hub'], 'rhythm and bracing beat Harry');
  assert.ok(r.respekt >= 1);
  assert.match(r.eat, /cudzym chlebem/, 'the won bread goes with the meal');
  assert.deepEqual([r.carryBefore, r.carry, r.carryAfterWin, r.carryEating], [false, true, true, false], 'he carries the bowl from the flap until he sits down to eat');
  assert.equal(r.drawn, true, 'the arm wrestling close-up is drawn in the 2× frame');
  assert.deepEqual(r.afterPortion, r.beforePortion, 'wrestling for food spends no action and does not tire or dirty the player');
  assert.match(r.withoutActions[0].label, /o porcję.*bez akcji/);
  assert.equal(r.withoutActions[0].disabled, false, 'wrestling for food remains available without actions');
  assert.equal(r.withoutActions[1].disabled, true, 'wrestling for sport still needs an action');
  assert.deepEqual(r.next, [1, 2, 1], 'wrestling for food is free: supper leaves one evening action');
  assert.deepEqual(r.afterSport, [2, 0, 0], 'wrestling for sport spends the second evening action');
  assert.equal(r.idle, 'loss', 'doing nothing loses');
  assert.ok(r.respekt2 < r.respekt);
}

/** Supervision: reports cost opinion and the next yard, repeated reports keep the prisoner in the Ward; fights pay respect and may be seen. */
export async function checkSupervision(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), X = await import('/src/prison.js'), R = await import('/src/rooms.js');
    document.querySelector('#storyChoices button').click(); b.pause();
    const S = P.state.save.sim, PR = P.state.save.prison, out = {}, cards = [];
    const run = n => { for (let i = 0; i < n; i++) { b.step(1); if (X.cardOpen()) { cards.push(document.getElementById('storyTitle').textContent); document.querySelector('#storyChoices button').click(); b.pause(); } } };
    const st = t => G.stationOf(G.state.gymItems.find(x => x.t === t));
    const rnd = Math.random;
    try {
      Math.random = () => 0.99;                                     // nobody sees the first fight
      out.fight1 = X.prisonFightEnd({win: true, draw: false, ko: false, stars: 2, sec: 30, venue: 'cell'});
      out.resp1 = PR.respekt;
      Math.random = () => 0.01;                                     // the second one is seen
      out.fight2 = X.prisonFightEnd({win: false, draw: false, ko: false, stars: 1, sec: 30, venue: 'yard'});
      Math.random = rnd;
      out.after2 = {resp: PR.respekt, op: PR.opinia, raporty: PR.raporty.length, zakaz: !!PR.flagi['zakaz-spaceru']};
      Object.assign(S, {faza: 1, akcje: 0}); PR.zegar = S.day*3 + 1; run(2);   // noon
      out.yardDoor = G.stationOptions(st('cdoor'))[0][0];
      X.addRaport('test'); X.addRaport('test'); run(30); b.step(30);   // the zoom-in at the door runs with rendering
      out.repeated = {room: G.state.hubRoom, op: PR.opinia, reports: PR.raporty.length, transfer: !!PR.flagi['do-izolatki']};
      out.pushOpt = !!G.stationOptions(st('cfloor')).find(o => o[3] === 'go' && !o[2]);
      R.setRoomRaw('izolatka');
      out.retiredRoom = G.state.hubRoom;
    } catch (e) { out.error = String(e) + ' ' + e.stack; }
    Math.random = rnd;
    out.cards = cards;
    b.newGame();
    return out;
  });
  assert.equal(r.error, undefined);
  assert.match(r.fight1, /\+8/); assert.match(r.fight1, /nic nie widział · ryzyko 13%/);
  assert.equal(r.resp1, 8);
  assert.match(r.fight2, /raport/);
  assert.deepEqual(r.after2, {resp: 2, op: 35, raporty: 1, zakaz: true}, 'a lost fight to a weaker inmate costs respect; a report costs opinion and the yard');
  assert.match(r.yardDoor, /^Zakaz spaceru/);
  assert.deepEqual(r.repeated, {room:'cell', op:5, reports:3, transfer:false});
  assert.equal(r.pushOpt, true, 'push-ups remain available in the Ward');
  assert.equal(r.retiredRoom, 'cell', 'retired room identifiers return to the Ward');
  assert.ok(!r.cards.includes('Karcer') && !r.cards.includes('Z powrotem w celi'));

}

/** Profesor in the cell: the wheelchair talk, notes and the daily task pay XP, the prison cap banks XP, the level-10 trial starts. */
export async function checkProfesor(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), N = await import('/src/navigation.js'), D = await import('/src/dialog.js'),
      X = await import('/src/prison.js'), TS = await import('/src/training-session.js'), NP = await import('/src/npcs.js'), B = await import('/src/boxing.js');
    document.querySelector('#storyChoices button').click(); b.pause();
    const S = P.state.save, PR = S.prison, out = {};
    try {
      out.zbychu = NP.state.CN.find(c => c.name === 'Zeke').away;
      const st = G.stationOf(G.state.gymItems.find(x => x.t === 'cwheel'));
      N.stMenuOpen(st); out.first = D.state.dlgOpt.map(o => o[0]);
      D.state.dlgOpt[0][2](); out.met = PR.profesor.spotkany; out.opts = D.state.dlgOpt.map(o => o[0]);
      S.stats.str.lvl = 4; S.stats.spd.lvl = 6; S.stats.end.lvl = 6;
      D.state.dlgOpt[1][2](); out.task = PR.profesor.zadanie.id;
      PR.profesor.zadanie.id='kierat-ostatni';
      D.state.dlgOpt[1][2](); out.replacedTask=PR.profesor.zadanie.id;
      const xp0 = S.stats.str.xp;
      TS.state.listeners.forEach(fn => fn({id: 'pullup', grade: 'B', xp: {str: 100, spd: 0, end: 40}}));
      out.taskDone = PR.profesor.zadanie.zaliczone; out.taskXP = Math.round(S.stats.str.xp - xp0);
      // a fight note, told in the next talk, pays on the matching drill
      X.prisonFightEnd({win: true, draw: false, ko: false, stars: 1, sec: 20, venue: 'cell', stats: {thrown: 40, landed: 8, taken: 3, minSta: 0.5, body: 2, evades: 1, counters: 0}});
      out.note = PR.profesor.uwaga;
      D.state.dlgOpt[0][2](); out.told = PR.profesor.uwaga;
      const sp0 = S.stats.spd.xp;
      TS.state.listeners.forEach(fn => fn({id: 'shadow', grade: 'C', xp: {str: 0, spd: 100, end: 50}}));
      out.noteXP = Math.round(S.stats.spd.xp - sp0); out.noteLeft = PR.profesor.uwaga;
      D.dlgClose();
      // the prison ceiling
      S.stats.end.lvl = 15; S.stats.end.xp = 0; P.addXP('end', 99999, true);
      out.cap = {lvl: S.stats.end.lvl, bank: PR.bank.end, need: P.xpNeed(15)};
      // the level-10 trial: Profesor starts the shadow drill at stage III
      S.stats.spd.lvl = 10; S.stats.spd.xp = 0;
      N.stMenuOpen(st); const tr = D.state.dlgOpt.find(o => o[0].startsWith('Jestem gotów'));
      out.trial = tr ? tr[0] + ' | ' + tr[1] : '';
      tr[2](); out.trialRun = [B.state.gstate, TS.sessionDrill(), TS.state.S?.stage, !!TS.state.S?.trial];
      D.dlgClose(); PR.lista.lekcje['6'] = true; N.stMenuOpen(st);
      D.state.dlgOpt.find(o => o[0].startsWith('Jestem gotów'))[2]();
      out.trialRun2 = [B.state.gstate, TS.sessionDrill(), TS.state.S?.stage, !!TS.state.S?.trial];
      (await import('/src/navigation.js')).exitToHub?.();
      // night: Profesor lies in his bunk
      b.newGame('prison'); b.pause(); document.querySelector('#storyChoices button').click(); b.pause();
      P.state.save.sim.min = 23*60; b.step(3);
      out.night = [NP.state.PROF.act, NP.state.PROF.after?.t];
    } catch (e) { out.error = String(e) + ' ' + e.stack; }
    b.newGame();
    return out;
  });
  assert.equal(r.error, undefined);
  assert.equal(r.zbychu, true, 'Zeke sleeps in another cell; his bunk is Profesor\'s');
  assert.deepEqual(r.first, ['Pogadajmy.', 'Na razie.'], 'the first talk comes before anything else');
  assert.equal(r.met, true);
  assert.ok(r.opts.includes('Co mam dziś robić?') && r.opts.includes('Pokaż, nad czym pracować.'));
  assert.equal(r.task, 'podciaganie-b', 'the task trains the weakest tree');
  assert.equal(r.replacedTask,'podciaganie-b','an old disabled-work task is replaced on the same day');
  assert.equal(r.taskDone, true); assert.equal(r.taskXP, 20, 'a done task adds 20% of the session XP');
  assert.equal(r.note, 'celnosc'); assert.equal(r.told, 'told:celnosc');
  assert.equal(r.noteXP, 10); assert.equal(r.noteLeft, '');
  assert.deepEqual([r.cap.lvl, r.cap.bank], [15, r.cap.need], 'XP above the prison cap is banked up to one level');
  assert.match(r.trial, /^Jestem gotów: próba szybkości\. \| Cień z Profesorem, stopień III, ocena A lub S — stopień III po lekcji z Silasem/);
  assert.deepEqual(r.trialRun, ['hub', '', undefined, false], 'stage III of Cień z Profesorem waits for the lesson with Silas');
  assert.deepEqual(r.trialRun2, ['spar', 'shadowp', 3, true], 'after it Profesor runs the trial');
  assert.deepEqual(r.night, ['lie', 'bunk2']);
}

/** Profesor's list: canteen and yard-boss fights, memories at night, the rigged fight #6 and the infirmary skip. */
export async function checkProfesorList(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), N = await import('/src/navigation.js'), D = await import('/src/dialog.js'),
      X = await import('/src/prison.js'), SP = await import('/src/sparring.js'), IFM = await import('/src/iso-fight.js'), IFS = IFM.state, B = await import('/src/boxing.js'), R = await import('/src/rooms.js'), I = await import('/src/input.js');
    document.querySelector('#storyChoices button').click(); b.pause();
    const S = P.state.save, PR = S.prison, out = {}, cards = [];
    const run = n => { for (let i = 0; i < n; i++) { b.step(1); if (X.cardOpen()) { cards.push(document.getElementById('storyTitle').textContent); document.querySelector('#storyChoices button').click(); b.pause(); } } };
    const st = t => G.stationOf(G.state.gymItems.find(x => x.t === t));
    try {
      PR.profesor.spotkany = true; PR.respekt = 40;
      // a memory waits in the evening for every won name
      PR.lista.wygrane['1'] = true; Object.assign(S.sim, {faza: 2, akcje: 0, min: 19*60}); PR.zegar = S.sim.day*3 + 2; PR.zdarzenia.ostatnie = S.sim.day;
      N.stMenuOpen(st('cwheel')); out.nightOpts = D.state.dlgOpt.map(o => o[0]);
      D.state.dlgOpt[0][2](); run(1); out.memory = cards.slice(); out.seen = PR.lista.wspomnienia.slice();
      Object.assign(S.sim, {faza: 1, akcje: 0, min: 14*60}); PR.zegar = S.sim.day*3 + 1;
      // Cień z Profesorem: stage II after the lesson with Janusz
      PR.lista.lekcje['4'] = true; N.stMenuOpen(st('cwheel'));
      out.cien = D.state.dlgOpt.find(o => o[0].startsWith('Pokaż mi'))[1]; D.dlgClose();
      // #3 waits at the flap when the meal is handed out
      PR.lista.rozdzial = 3; G.stationOptions(st('cdoor')).find(o => o[0].startsWith('Zakończ'))[1]();   // noon over: supper
      const M = await import('/src/ward-meal.js');
      for (let i = 0; i < 3000 && !M.currentMeal(); i++) run(1);
      out.canteen = G.stationOptions(st('cdoor')).map(o => o[0]);
      PR.lista.rozdzial = 6; X.prisonFightStart('yard', 4); out.armed = SP.state.rigged;
      // the yard boss at the end of the list
      PR.lista.rozdzial = 10; PR.respekt = 90; Object.assign(S.sim, {faza: 1, akcje: 0, min: 14*60}); X.prisonClockSync();
      R.goRoom('yard', 0); b.step(30);
      out.szef = G.stationOptions(st('ydoor')).map(o => o[0]).find(t => t.startsWith('Szef')) || '';
    } catch (e) { out.error = String(e) + ' ' + e.stack; }
    b.newGame();
    return out;
  });
  assert.equal(r.error, undefined);
  assert.equal(r.nightOpts[0], 'Co cię z nim łączy?');
  assert.deepEqual([r.memory[0], r.seen], ['Rycina z ringu', ['1']]);
  assert.match(r.cien, /stopień II/);
  assert.ok(r.canteen.some(t => t.startsWith('Zeke „Kosa” Price czeka przy klapie, kiedy wydają posiłek — walka z listy (#3) · 1 akcja')), r.canteen.join(' / '));
  assert.equal(r.armed, true);
  assert.match(r.szef, /^Szef spacerniaka czeka pod murem — walka z listy \(#10\)$/);
}

/** Spacerniak: points from respect, buying in the tree tab, cards for bought tricks and the yard encounter memory. */
export async function checkSpacerniak(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), X = await import('/src/prison.js'), SP = await import('/src/sparring.js'), IFM = await import('/src/iso-fight.js'), IFS = IFM.state, ST = await import('/src/skill-tree.js'), G = await import('/src/gym.js');
    document.querySelector('#storyChoices button').click(); b.pause();
    const S = P.state.save, PR = S.prison, out = {};
    try {
      out.p0 = X.bareInfo().points;
      X.addRespekt(65); out.p1 = X.bareInfo().points;               // Znany, Szanowany and Twardziel reached
      X.addRespekt(-30); out.p2 = X.bareInfo().points;              // the points stay once earned
      PR.respekt = 40;
      ST.openSkillTree();
      out.tab = !document.querySelector('[data-skill-tab="bare"]').hidden;
      out.cards = document.querySelectorAll('#skill-panel-bare [data-skill]').length;
      document.querySelector('#skill-panel-bare [data-skill="piach"]').click();
      out.buyKciuk = X.buyBare('kciuk'); out.buyNerki = X.buyBare('nerki');
      out.unlocked = S.bare.unlocked.slice();
      out.loadout = S.loadout.slice();
      document.getElementById('skillTree').close();
      X.countFight('yard:1'); X.countFight('yard:1');
      out.memory = X.fightsWith('yard:1');
    } catch (e) { out.error = String(e) + ' ' + e.stack; }
    b.newGame();
    return out;
  });
  assert.equal(r.error, undefined);
  assert.deepEqual([r.p0, r.p1, r.p2], [0, 3, 3], 'a point per rank reached, kept when respect falls');
  assert.deepEqual([r.tab, r.cards], [true, 10], 'nine perks and Brudna robota, moved from Siła');
  assert.deepEqual([r.buyKciuk, r.buyNerki], ['', 'rank']);
  assert.deepEqual(r.unlocked, ['piach', 'kciuk'], 'the card click buys, then three points are spent');
  assert.deepEqual([r.loadout.includes('piach'), r.loadout.includes('kciuk'), r.loadout.length], [true, false, 6], 'a bought yard trick goes into the set while it has room');
  assert.equal(r.memory, 2, 'repeat encounters are remembered');
}

/** Daily events, the Sunday brawl (three fights, 90 s, no guards), bets and Rysiek's favour. */
export async function checkSundayAndEvents(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), N = await import('/src/navigation.js'), X = await import('/src/prison.js'),
      SP = await import('/src/sparring.js'), IFM = await import('/src/iso-fight.js'), IFS = IFM.state, PD = await import('/src/prison-data.js'), R = await import('/src/rooms.js'), NP = await import('/src/npcs.js');
    document.querySelector('#storyChoices button').click(); b.pause();
    const S = P.state.save, PR = S.prison, out = {}, cards = [];
    const run = (n, pick = 0) => { for (let i = 0; i < n; i++) { b.step(1); if (X.cardOpen()) { cards.push(document.getElementById('storyTitle').textContent); const bs = document.querySelectorAll('#storyChoices button'); bs[Math.min(pick, bs.length - 1)].click(); b.pause(); } } };
    try {
      // a morning event
      let day = 2; for (; day < 80; day++) if (['list', 'uwaga', 'donos'].includes(PD.pickDailyEvent(day, 'apel', {fajki: 0, rank: 0, inCanteen: false}))) break;
      out.eventId = PD.pickDailyEvent(day, 'apel', {fajki: 0, rank: 0, inCanteen: false});
      b.step(30);                                                   // the zoom-in at the door finishes with rendering
      Object.assign(S.sim, {day, faza: 0, akcje: 0, min: 8*60}); PR.zegar = 0; run(3);   // a new morning: the roll call and its news
      out.eventCard = cards[cards.length - 1]; out.once = PR.zdarzenia.ostatnie === day;
      for (let i = 0; i < 3000 && R.state.hubAct; i++) run(1);
      // the Sunday brawl
      PR.respekt = 40; const sunday = 7*Math.ceil(day/7); Object.assign(S.sim, {day: sunday, faza: 1, akcje: 0, min: 14*60}); PR.zegar = sunday*3 + 1;
      R.goRoom('yard', 0); b.step(30); run(2, 0);   /* Sunday noon on the yard */
      out.bicieCard = cards[cards.length - 1]; out.limit = SP.state.timeLimit;
      const resp0 = PR.respekt;
      for (let f = 0; f < 3; f++) {
        for (let i = 0; i < 80 && IFS.phase !== 'fight'; i++) b.step(1);
        IFM.isoFightFinish(0, 'KO'); b.step(180);
        out['how' + f] = IFS.how;
        N.exitToHub(); b.step(30); run(3);
      }
      out.bicie = {wins: PR.bicie.wygrane, resp: PR.respekt - resp0, points: X.bareInfo().points, ranks: [1, 2, 3, 4].filter(k => PR.flagi['ranga-' + k]).length, gstate: (await import('/src/boxing.js')).state.gstate, limit: SP.state.timeLimit};
      // bets from Szanowany, Rysiek's favour in the cell
      PR.fajki = 12; Object.assign(S.sim, {day: sunday + 1, faza: 1, akcje: 0, min: 14*60}); PR.zegar = S.sim.day*3 + 1;
      const C = NP.state.YN[0]; G.state.hubNear = {id: 'yardfight', yn: 0, look: [C.i, C.j, 15], spot: [G.state.hubP.i, G.state.hubP.j], item: null};
      out.bets = G.stationOptions(G.state.hubNear).map(o => typeof o[0] === 'function' ? o[0]() : o[0]).filter(t => t.includes('zakładem'));
      R.goRoom('cell', 0); b.step(30);
      const K = NP.state.CN[2]; G.state.hubNear = {id: 'cellfight', cn: 2, look: [K.i, K.j, 15], spot: [G.state.hubP.i, G.state.hubP.j], item: null};
      out.favour = G.stationOptions(G.state.hubNear).map(o => typeof o[0] === 'function' ? o[0]() : o[0]).find(t => t.startsWith('Sparing z Reubenem')) || '';
    } catch (e) { out.error = String(e) + ' ' + e.stack; }
    out.cards = cards;
    b.newGame();
    return out;
  });
  assert.equal(r.error, undefined);
  assert.ok(['List z domu', 'Uwaga Profesora', 'Rozmowa z kapelanem'].includes(r.eventCard), r.eventId + ' → ' + r.eventCard);
  assert.equal(r.once, true);
  assert.equal(r.bicieCard, 'Niedzielne bicie'); assert.equal(r.limit, 90*60);
  assert.deepEqual([r.how0, r.how1, r.how2], ['KO', 'KO', 'KO']);
  assert.equal(r.bicie.wins, 1); assert.ok(r.bicie.resp >= 10, 'the brawl pays respect: ' + r.bicie.resp);
  assert.equal(r.bicie.points, r.bicie.ranks + 1, 'a point per rank reached and one for the first brawl'); assert.deepEqual([r.bicie.gstate, r.bicie.limit], ['hub', 0]);
  assert.deepEqual(r.bets, ['… z zakładem: 5 prymek (wygrana: 10)', '… z zakładem: 10 prymek (wygrana: 20)']);
  assert.match(r.favour, /^Sparing z Reubenem za 3 prymki/);
}

/** The evening bath: the door opens at 19:00, inmates in towels under the showers, a fight in the steam, back to the cell at 19:40. */
export async function checkBath(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), N = await import('/src/npcs.js'), SP = await import('/src/sparring.js'), IFM = await import('/src/iso-fight.js'), IFS = IFM.state,
      NV = await import('/src/navigation.js'), B = await import('/src/boxing.js'), R = await import('/src/rooms.js');
    document.querySelector('#storyChoices button').click(); b.pause();
    const S = P.state.save.sim, PR = P.state.save.prison, out = {};
    const st = t => G.stationOf(G.state.gymItems.find(x => x.t === t));
    try {
      out.early = G.stationOptions(st('cdoor')).map(o => o[0]).some(t => t.startsWith('Idź do łaźni'));   // noon
      Object.assign(S, {faza: 2, akcje: 0, min: 19*60}); PR.zegar = S.day*3+2; PR.zdarzenia.ostatnie = S.day;   // the evening
      G.stationOptions(st('cdoor')).find(o => o[0].startsWith('Idź do łaźni'))[1]();
      for (let i = 0; i < 40; i++) b.step(1);
      out.room = G.state.hubRoom; out.towels = N.state.YN.map(C => C.sleeves || C.pants).filter(Boolean).length;
      const busy = G.state.gymItems.filter(x => x.t === 'lshower').map(x => G.stationOptions(G.stationOf(x))[0]);
      out.free = busy.filter(o => !o[2]).length; out.taken = busy.filter(o => o[2]).length;
      const { SHOWERS } = await import('/src/bath.js'), Y = N.state.YN, wet = Y.filter(C => C.tub);
      out.perShower = Math.max(...SHOWERS.map(sx => wet.filter(C => Math.abs(C.i - sx) < 0.75).length));
      /* nobody else overlaps a showering man on screen (the iso picture: x ~ (i-j)*6, y ~ (i+j)*3) */
      out.overlap = wet.flatMap(W => Y.filter(C => C !== W && Math.abs((C.i - W.i - C.j + W.j) * 6) < 6 && Math.abs((C.i - W.i + C.j - W.j) * 3) < 16)).length;
      const C = N.state.YN[1];
      G.state.hubNear = {id:'bathfight', yn:1, name:'W', title:'W', look:[C.i, C.j, 15], spot:[G.state.hubP.i, G.state.hubP.j], item:null};
      const fo = G.stationOptions(G.state.hubNear); out.fight = fo[0][0];
      fo[0][1](); out.venue = [SP.state.sparVenue, SP.isBareknuckle(), G.state.hubRoom, B.state.gstate];
      b.step(5); b.step(1);
      IFM.isoFightFinish(0, 'KO'); b.step(180);
      out.won = IFS.winner === IFS.P;
      NV.exitToHub(); for (let i = 0; i < 40; i++) b.step(1);
      out.back = [G.state.hubRoom, B.state.gstate, N.state.YN.filter(C => C.sleeves).length];
      out.afterFight = S.akcje;
      const tub = G.state.gymItems.filter(x => x.t === 'lshower').map(x => G.stationOptions(G.stationOf(x))[0]).find(o => !o[2]);
      tub[1]();                                                     // a bath: the second evening action ends the evening
      const X = await import('/src/prison.js');
      for (let i = 0; i < 900 && G.state.hubRoom === 'laznia'; i++) { b.step(1); if (X.cardOpen()) document.querySelector('#storyChoices button').click(); }
      out.end = [G.state.hubRoom, N.state.YN.every(C => C.sleeves && C.pants)];
    } catch (e) { out.error = String(e) + ' ' + e.stack; }
    b.newGame();
    return out;
  });
  assert.equal(r.error, undefined);
  assert.equal(r.early, false, 'the bath opens in the evening');
  assert.equal(r.room, 'laznia');
  assert.equal(r.towels, 0, 'everybody in the bath wears a towel');
  assert.deepEqual([r.free, r.taken], [1, 4], 'four tubs taken by inmates, one free');
  assert.equal(r.perShower, 1, 'one man to a tub');
  assert.equal(r.overlap, 0, 'nobody stands in the picture of a man in a tub');
  assert.match(r.fight, /^Bójka w łaźni: .* para kryje \(klucznik 20%\)/);
  assert.deepEqual(r.venue, ['laznia', true, 'laznia', 'isofight'], 'a bareknuckle fight in the bath room, in towels');
  assert.equal(r.won, true);
  assert.deepEqual(r.back, ['laznia', 'hub', 0], 'back in the bath, still in towels');
  assert.equal(r.afterFight, 1, 'the fight took an action');
  assert.deepEqual(r.end, ['cell', true], 'the evening over, the guard sends everybody to the cells, dressed');
}

/** The character sheet (P) and the one hero: fixed look, needs, trees, perks, the fight record. */
export async function checkCharSheet(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), D = await import('/src/data.js'), SP = await import('/src/sparring.js'), IFM = await import('/src/iso-fight.js'), IFS = IFM.state, NV = await import('/src/navigation.js');
    document.querySelector('#storyChoices button').click(); b.pause();
    const out = {};
    out.look = JSON.stringify(P.state.save.look) === JSON.stringify(D.HERO_LOOK);
    out.lookTab = !!document.querySelector('#shop .tabs [data-slot="look"]');
    // a bare fight goes into the record
    SP.startSpar(0, 'cell', null); b.step(60); IFM.isoFightFinish(0, 'KO'); b.step(180);
    NV.exitToHub(); b.step(30);
    out.record = [P.state.save.record.bare.w + P.state.save.record.bare.l + P.state.save.record.bare.d, P.state.save.record.last.length, P.state.save.record.last[0]?.v];
    return out;
  });
  await page.keyboard.press('KeyP');
  const open = await page.evaluate(() => { const d = document.getElementById('charSheet');
    return {open:d.open, text:d.textContent, quest:d.querySelector('#cs-quest').textContent, portrait:(() => { const c = d.querySelector('#csPortrait'), g = c.getContext('2d'), px = g.getImageData(48, 60, 1, 1).data; return px[3] > 0; })()}; });
  const deck = await page.evaluate(async () => {   // the Skille tab: a skill out, back in, a move that needs points
    const P = await import('/src/progression.js'), d = document.getElementById('charSheet'), n = () => P.playerLoadout().length;
    d.querySelector('#cs-tab-deck').click(); const start = n();
    d.querySelector('#cs-deck [data-del="jab"]').click(); const removed = n();
    d.querySelector('#cs-deck [data-add="jab"]').click(); const added = n();
    P.state.save.stats.str.lvl = 3; const free = P.skillPoints('str').free;   // two points of Siła
    d.querySelector('#cs-tab-perks').click(); d.querySelector('#cs-tab-deck').click();
    (await import('/src/char-sheet.js')).renderCharSheet(); d.querySelector('#cs-tab-deck').click();
    d.querySelector('#cs-deck [data-learn="upper"]').click();
    return {start, removed, added, learnt: !!P.state.save.moves.upper && P.state.save.loadout.includes('upper') && !!d.querySelector('#cs-deck [data-del="upper"]'), paid: free - P.skillPoints('str').free, shown: !d.querySelector('#cs-panel-deck').hidden, head: d.querySelector('#cs-deck .cs-deckhead b').textContent};
  });
  const tabs = await page.evaluate(async () => {   // Cechy: an open slot takes a trait, a change is Profesor's; Ciosy: eight punch trees
    const P = await import('/src/progression.js'), d = document.getElementById('charSheet'), CS = await import('/src/char-sheet.js');
    P.state.save.stats.str.lvl = 5; CS.renderCharSheet(); d.querySelector('#cs-tab-perks').click();
    const st = (/** @type {string} */ t) => d.querySelector('#cs-perks [data-trait="' + t + '"]')?.getAttribute('data-state');
    const before = [st('str:0:b'), st('spd:0:a')];
    d.querySelector('#cs-perks [data-trait="str:0:b"]').click();
    const after = [P.state.save.traits.str[0], st('str:0:b'), st('str:0:a'), !d.querySelector('#cs-panel-perks').hidden];
    P.state.save.stats.spd.lvl = 1; P.state.save.skills.spd.bonus = 0; CS.renderCharSheet();
    d.querySelector('#cs-tab-punch').click();
    const trees = d.querySelectorAll('#cs-punch .cs-ptree').length;
    d.querySelector('#cs-punch [data-node="jab:a"]').click(); const poor = d.querySelector('#cs-punch .cs-deckhead em')?.textContent || '';
    P.state.save.stats.spd.lvl = 5; CS.renderCharSheet(); d.querySelector('#cs-tab-punch').click();
    for (const p of ['a', 'b', 'a']) d.querySelector('#cs-punch [data-node="jab:' + p + '"].next').click();
    const four = d.querySelector('#cs-punch [data-node="jab:a"].next small')?.textContent;
    d.querySelector('#cs-punch [data-node="jab:a"].next').click();
    return {before, after, trees, poor, msg: d.querySelector('#cs-punch .cs-deckhead em')?.textContent || '', picks: P.state.save.moves.jab.picks, four, free: P.skillPoints('spd').free, shown: !d.querySelector('#cs-panel-punch').hidden};
  });
  await page.screenshot({ path: 'artifacts/char-sheet-ciosy.png' });
  await page.evaluate(() => document.getElementById('cs-tab-perks').click());
  await page.screenshot({ path: 'artifacts/char-sheet-cechy.png' });
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => !document.getElementById('charSheet').open);
  assert.deepEqual(tabs, {before: ['buy', 'locked'], after: ['b', 'always', 'blocked', true], trees: 8, poor: tabs.poor, msg: tabs.msg, picks: 'aba', four: 'brakuje punktów', free: 1, shown: true}, 'Cechy: a free pick at level 5, changes at Profesor\'s; Ciosy: three jab levels for three of four Szybkość points, level IV costs two');
  assert.match(tabs.poor, /Za mało punktów/, 'level 1: no points for a node');
  assert.match(tabs.msg, /Za mało punktów/, 'level IV needs two points');
  await page.evaluate(() => window.__boxer.newGame());
  assert.equal(r.look, true, 'the hero has the fixed head');
  assert.equal(r.lookTab, false, 'no look editor in the locker');
  assert.deepEqual(r.record, [1, 1, 'cell'], 'the bare fight is counted');
  assert.equal(open.open, true, 'P opens the sheet in the hub');
  for (const s of ['Potrzeby i forma', 'Energia', 'Higiena', 'Siła', 'Szybkość', 'Wytrzymałość', 'brakuje', 'Cechy', 'Ciosy', 'Bójki na gołe pięści', 'Respekt', 'Lista Profesora']) assert.ok(open.text.includes(s), s);
  assert.equal(open.portrait, true, 'the portrait is painted');
  assert.match(open.quest, /Jack „Młody” Morley/, 'Harry beaten in the cell: the ladder points to Jack next');
  assert.deepEqual(deck, {start: 5, removed: 4, added: 5, learnt: true, paid: 1, shown: true, head: '6/6'}, 'the Skille tab takes a skill out and back; the uppercut is learnt for a point of Siła and goes into the set while it has room');
  assert.equal(closed, true, 'Esc closes it');
}

/** Developer mode (options, ?debug=1): any door leads to any room at any hour, no schedule, no autosave; a reload brings the last save back. */
export async function checkDevMode(page) {
  const r = await page.evaluate(async () => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const P = await import('/src/progression.js'), G = await import('/src/gym.js');
    document.querySelector('#storyChoices button')?.click(); b.pause();
    const out = {};
    try {
      P.persist(); const saved = localStorage.getItem('heavybag.save');
      out.before = [JSON.parse(saved).room, P.state.save.sim.faza];
      const door = () => G.stationOptions(G.stationOf(G.state.gymItems.find(x => x.t === 'cdoor')));
      out.off = door().filter(o => String(typeof o[0] === 'function' ? o[0]() : o[0]).startsWith('[dev]')).length;
      const cb = document.getElementById('optDev'); cb.checked = true; cb.dispatchEvent(new Event('change'));
      const dev = door().filter(o => typeof o[0] === 'function' && o[0]().startsWith('[dev]')), lab = k => dev[k][0]();
      out.on = dev.length;
      dev.find(o => o[0]().startsWith('[dev] Faza'))[1](); dev.find(o => o[0]().startsWith('[dev] Faza'))[1]();   // noon → evening → morning
      const go = dev.find(o => o[0]().startsWith('[dev] Przejdź: łaźnia'));
      out.label = go[0](); go[1]();
      for (let i = 0; i < 300; i++) b.step(1);
      out.after = [G.state.hubRoom, P.state.save.sim.faza];
      P.persist(); out.unchanged = localStorage.getItem('heavybag.save') === saved;
      out.warning = !document.getElementById('saveWarning').hidden;
    } catch (e) { out.error = String(e) + ' ' + e.stack; }
    return out;
  });
  assert.equal(r.error, undefined);
  assert.equal(r.off, 0, 'no travel entries without developer mode');
  assert.equal(r.on, 1+3, 'the phase, and a way to each prison room');
  assert.equal(r.label, '[dev] Przejdź: łaźnia · rano');
  assert.deepEqual(r.after, ['laznia', 0], 'in the bath in the morning, and the schedule does not send him back');
  assert.equal(r.unchanged, true, 'the autosave is not written in developer mode');
  assert.equal(r.warning, true, 'the screen says the autosave is off');
  await page.reload();
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
  const kept = await page.evaluate(async () => { window.__boxer.pause(); await new Promise(r => setTimeout(r, 50)); const P = await import('/src/progression.js');
    return [P.state.devMode, document.getElementById('optDev').checked, !document.getElementById('saveWarning').hidden, P.state.save.room ?? null, P.state.save.sim.faza]; });
  assert.deepEqual(kept, [true, true, true, r.before[0], r.before[1]], 'after a reload developer mode stays on, the box says so, the autosave is the one from before');
  page.once('dialog', d => d.accept());
  await page.evaluate(() => { const cb = document.getElementById('optDev'); cb.checked = false; cb.dispatchEvent(new Event('change')); });
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 10000 });
  const back = await page.evaluate(async () => { window.__boxer.pause(); const P = await import('/src/progression.js'); return [P.state.devMode, document.getElementById('optDev').checked, P.state.save.room ?? null, P.state.save.sim.faza]; });
  assert.deepEqual(back, [false, false, r.before[0], r.before[1]], 'switched off: the page reloads with the last autosave');
}

export async function checkDevSceneSwitcher(page) {
  const r = await page.evaluate(async () => {
    const out = {};
    try {
      const btn = document.getElementById('optDevScenesBtn');
      const box = document.getElementById('devScenesBox');
      out.hasBtn = !!btn && getComputedStyle(btn).display !== 'none';
      out.boxHiddenBefore = box?.hidden;
      btn?.click();
      out.boxHiddenAfter = box?.hidden;
      out.boxDisplayAfter = box?.style.display;

      const scenes = Array.from(document.querySelectorAll('[data-dev-scene]')).map(b => b.getAttribute('data-dev-scene'));
      out.scenes = scenes;

      const G = await import('/src/gym.js');
      const B = await import('/src/boxing.js');

      // Click yard button
      document.querySelector('[data-dev-scene="yard"]')?.click();
      out.yardRoom = G.state.hubRoom;

      // Click work button
      document.querySelector('[data-dev-scene="work"]')?.click();
      out.workState = B.state.gstate;

      // Click cell button
      document.querySelector('[data-dev-scene="cell"]')?.click();
      out.cellRoom = G.state.hubRoom;
      out.cellState = B.state.gstate;
    } catch (e) {
      out.error = String(e) + ' ' + e.stack;
    }
    return out;
  });
  assert.equal(r.error, undefined);
  assert.equal(r.hasBtn, true, 'developer scenes button is visible');
  assert.equal(r.boxHiddenBefore, true, 'scenes box starts hidden');
  assert.equal(r.boxHiddenAfter, false, 'scenes box shows on click');
  assert.equal(r.boxDisplayAfter, 'flex');
  assert.ok(r.scenes.includes('yard') && r.scenes.includes('work') && r.scenes.includes('laznia') && r.scenes.includes('cell'));
  assert.ok(!r.scenes.includes('izolatka'), 'retired room has no developer scene');
  assert.equal(r.yardRoom, 'yard', 'switched to yard');
  assert.equal(r.workState, 'work', 'switched to slaughterhouse work');
  assert.equal(r.cellRoom, 'cell', 'switched back to cell');
  assert.equal(r.cellState, 'hub', 'in hub state in cell');
}

export async function checkWardRats(page) {
  const r = await page.evaluate(async () => {
    const out = {};
    try {
      const b = window.__boxer;
      b.goRoom('cell');
      const W = await import('/src/ward.js');
      const G = await import('/src/gym.js');
      out.ratCount = W.state.rats?.length || 0;
      const r0 = W.state.rats[0];
      out.startPos = [r0.i, r0.j];

      // Step simulation for 60 frames
      for (let i = 0; i < 60; i++) b.step(1);
      out.movedPos = [r0.i, r0.j];
      out.moved = (r0.i !== out.startPos[0] || r0.j !== out.startPos[1]);

      // Move player close to rat to test startling
      G.state.hubP.i = r0.i;
      G.state.hubP.j = r0.j;
      b.step(1);
      out.fleeWait = r0.wait;
      out.fleeSpeed = Math.hypot(r0.fi, r0.fj) > 0;
    } catch (e) {
      out.error = String(e) + ' ' + e.stack;
    }
    return out;
  });
  await page.screenshot({ path: 'artifacts/cell-rat.png' });
  assert.equal(r.error, undefined);
  assert.equal(r.ratCount, 1, 'exactly one rat in the cell');
  assert.equal(r.moved, true, 'the rat runs and updates position');
  assert.equal(r.fleeWait, 0, 'the rat is startled when player approaches');
}



