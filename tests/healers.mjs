import assert from 'node:assert/strict';

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
