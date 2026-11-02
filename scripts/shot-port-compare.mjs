// Dump the port's native framebuffer at fixed camera spots to a JSON file (for before/after pixel diffs).
//   node scripts/shot-port-compare.mjs out.json
import { writeFile } from 'node:fs/promises';
import { openGame } from './lib/harness.mjs';
const game = await openGame({ seed: false }), page = game.page, errors = game.errors;
try {
  await page.evaluate(() => document.querySelector('[data-dev-scene="port"]').click());
  const shots = await page.evaluate(async () => {
    const T = await import('/src/thames-port.js'), R = await import('/src/renderer.js'), B = await import('/src/boxing.js');
    window.__boxer.pause(); const out = {};
    for (const [i, j] of [[21.5, 9], [8, 6], [26, 3], [30, 11], [40, 8], [46, 20]]) {
      if (!T.debugPortView(i, j)) { out[i + ',' + j] = null; continue; }
      B.state.tick = 500; R.render(); R.render();
      const h = R.state.hd3; out[i + "," + j] = Array.from(h.fb.subarray(0, h.W * h.H));
    }
    return out;
  });
  await writeFile(process.argv[2], JSON.stringify(shots));
  console.log(Object.entries(shots).map(([k, v]) => k + ':' + (v ? v.length : 'invalid')).join(' '));
} finally { await game.close(); }
