// Screenshot of the isometric fight experiment: node scripts/iso-fight-shot.mjs --out=iso1 --script='...js run after start, may await b.step(n)'
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const venue = arg('venue', 'cell'), opp = Number(arg('opp', '0')), crop = arg('crop', ''), out = arg('out', 'iso'), script = arg('script', ''), port = 5195, root = new URL('..', import.meta.url).pathname;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') { if (!m.text().includes('404')) errors.push(m.text()); } else if (m.type() === 'log') console.log('>', m.text()); });
  await page.addInitScript(() => { let seed = 123456789; Math.random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }; });
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
  await page.evaluate(async ({ venue, opp }) => { const b = window.__boxer; b.newGame('prison'); b.pause(); const X = await import('/src/prison.js'); for (let k = 0; k < 6 && X.cardOpen(); k++) document.querySelector('#storyChoices button')?.click(); b.goRoom(venue === 'canteen' ? 'cell' : venue); b.step(60); b.startSpar(opp, venue); b.step(1); }, { venue, opp });
  const png = await page.evaluate(async ({ script, crop }) => {
    const b = window.__boxer, R = await import('/src/renderer.js'), I = await import('/src/iso-fight.js'); globalThis.I = I;
    const frames = []; const snap = () => { R.render(); const hd = R.state.hd, c = document.createElement('canvas'); c.width = hd.W; c.height = hd.H; const id = new ImageData(hd.W, hd.H); new Uint32Array(id.data.buffer).set(hd.fb); c.getContext('2d').putImageData(id, 0, 0); frames.push(c); };
    globalThis.snap = snap; globalThis.b = b;
    await (new Function('b', 'snap', 'I', `return (async()=>{ ${script} })()`))(b, snap, I);
    if (!frames.length) snap();
    if (crop) { const [cx, cy, cw, ch] = crop.split(':').map(Number), z = Math.floor(1100 / cw / Math.min(frames.length, 2)), s = document.createElement('canvas'); s.width = Math.min(frames.length, 2) * cw * z; s.height = Math.ceil(frames.length / 2) * ch * z; const g = s.getContext('2d'); g.imageSmoothingEnabled = false; frames.forEach((f, k) => g.drawImage(f, cx, cy, cw, ch, (k % 2) * cw * z, Math.floor(k / 2) * ch * z, cw * z, ch * z)); return s.toDataURL('image/png'); }
    const cols = Math.min(frames.length, 2), rows = Math.ceil(frames.length / cols), W = frames[0].width, H = frames[0].height, s = document.createElement('canvas'); s.width = cols * W * 2; s.height = rows * H * 2;
    const g = s.getContext('2d'); g.imageSmoothingEnabled = false; frames.forEach((f, k) => g.drawImage(f, (k % cols) * W * 2, Math.floor(k / cols) * H * 2, W * 2, H * 2)); return s.toDataURL('image/png');
  }, { script, crop });
  await mkdir(`${root}artifacts/tmp`, { recursive: true }); await writeFile(`${root}artifacts/tmp/${out}.png`, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`artifacts/tmp/${out}.png`, errors.length ? 'ERRORS: ' + errors.join(' | ') : 'no errors');
} finally { await browser.close(); server.kill(); }
