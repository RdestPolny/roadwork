// Frame-time profile of the Thames port: idle frames vs. a walk across the quay (camera moving).
//   node scripts/profile-port.mjs [--frames=300]

import { openGame } from './lib/harness.mjs';

const frames = Number(process.argv.find(a => a.startsWith('--frames='))?.slice(9) ?? 300);
const game = await openGame({ seed: false }), page = game.page, errors = game.errors;
try {
  await page.evaluate(() => document.querySelector('[data-dev-scene="port"]').click());
  const r = await page.evaluate(async frames => {
    const T = await import('/src/thames-port.js'), R = await import('/src/renderer.js'), B = await import('/src/boxing.js');
    window.__boxer.pause();
    const stat = a => { const s = [...a].sort((x, y) => x - y), q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))]; return { mean: +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2), p50: +q(.5).toFixed(2), p95: +q(.95).toFixed(2), max: +s[s.length - 1].toFixed(2), over16: a.filter(v => v > 16.7).length }; };
    const run = (walk) => {
      T.debugPortView(21.5, 9); const out = [];
      for (let k = 0; k < frames; k++) {
        if (walk) { T.thamesKey(k < frames / 2 ? 'KeyA' : 'KeyD', true); T.tickThamesPort(); }
        B.state.tick++; const t0 = performance.now(); R.render(); out.push(performance.now() - t0);
      }
      T.thamesKey('KeyA', false); T.thamesKey('KeyD', false); return stat(out);
    };
    run(false); // warm-up
    return { idle: run(false), walk: run(true) };
  }, frames);
  console.log(JSON.stringify(r), errors.length ? 'ERRORS ' + errors.slice(0, 3).join('|') : '');
} finally { await game.close(); }
