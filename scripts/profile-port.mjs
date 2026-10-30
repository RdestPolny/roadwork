// Frame-time profile of the Thames port: idle frames vs. a walk across the quay (camera moving).
//   node scripts/profile-port.mjs [--frames=300]
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';

const frames = Number(process.argv.find(a => a.startsWith('--frames='))?.slice(9) ?? 300);
const port = 5196, root = new URL('..', import.meta.url).pathname;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
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
} finally { await browser.close(); server.kill(); }
