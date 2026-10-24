// Milliseconds per frame of a side-on fight scene (sim step + render), headless Chrome, from the repo root:
//   node .claude/skills/roadwork-scene-art/scripts/perf.mjs --venue=yard [--frames=300]
// venue: cell | canteen | yard | laznia. Prints e.g. `yard: 1.29 ms/frame (300 frames)` and any page errors.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const venue = arg('venue', 'yard'), n = Number(arg('frames', 300)), port = 5197;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: process.cwd(), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage(), errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
  const ms = await page.evaluate(async ({ venue, n }) => {
    const b = window.__boxer; b.newGame('prison'); b.pause(); b.goRoom(venue === 'canteen' ? 'cell' : venue); b.step(60);
    const SP = await import('/src/sparring.js'), R = await import('/src/renderer.js'); SP.startSpar(0, venue, null); b.sparStep(60);
    for (let i = 0; i < 30; i++) { b.sparStep(1); R.render(); }   // warm-up
    const t0 = performance.now(); for (let i = 0; i < n; i++) { b.sparStep(1); R.render(); } return (performance.now() - t0) / n;
  }, { venue, n });
  console.log(`${venue}: ${ms.toFixed(2)} ms/frame (${n} frames)${errors.length ? '  ERRORS: ' + errors.slice(0, 3).join(' | ') : ''}`);
} finally { await browser.close(); server.kill(); }
