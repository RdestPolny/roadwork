// Dump the port's native framebuffer at fixed camera spots to a JSON file (for before/after pixel diffs).
//   node scripts/shot-port-compare.mjs out.json
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
const port = 5197, root = new URL('..', import.meta.url).pathname;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
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
} finally { await browser.close(); server.kill(); }
