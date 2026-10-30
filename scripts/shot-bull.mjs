// Native frames of Briggs in the cell: seated NPC and at the start of the sparring bout. node scripts/shot-bull.mjs outdir
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const out = process.argv[2], port = 5198, root = new URL('..', import.meta.url).pathname;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
  await mkdir(out, { recursive: true });
  const shot = async name => { const png = await page.evaluate(async () => { const R = await import('/src/renderer.js'); R.render(); const h = R.state.inHD ? R.state.hd3 : (R.state.hd3.W ? R.state.hd3 : R.state.hd); return h.off.toDataURL('image/png'); }); await writeFile(`${out}/${name}.png`, Buffer.from(png.split(',')[1], 'base64')); };
  await page.evaluate(() => { const b = window.__boxer; b.goRoom('cell'); b.pause(); b.step(3); }); await shot('cell');
  await page.evaluate(() => { const b = window.__boxer; b.startSpar(5, 'cell'); b.step(65); }); await shot('fight');
  console.log('saved', out, errors.join('|'));
} finally { await browser.close(); server.kill(); }
