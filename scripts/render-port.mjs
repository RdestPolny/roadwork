// Render the Thames port preview for art review: one sheet of frames at several camera positions and ticks.
//   node scripts/render-port.mjs --cams=0:0,3:-4   (pan key presses: +x = left, +y = up; 12 px each) --ticks=0,40 --out=port
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const cams = arg('cams', '150:-18').split(',').map(c => c.split(':').map(Number)), ticks = arg('ticks', '0').split(',').map(Number), out = arg('out', 'port'), zs = Number(arg('zoom', '3')), abs = arg('abs', '') === '1';
const port = 5195, root = new URL('..', import.meta.url).pathname;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
  const [png, ms] = await page.evaluate(async ({ cams, ticks, zs, abs }) => {
    const b = window.__boxer; b.pause();
    const T = await import('/src/thames-port.js'), R = await import('/src/renderer.js'), B = await import('/src/boxing.js');
    T.startThamesPort(); const t0 = B.state.tick, cols = ticks.length, frames = [];
    for (const [cx, cy] of cams) for (const dt of ticks) {
      T.startThamesPort(); for (let k = 0; k < Math.abs(cx); k++) T.panThamesPort(cx > 0 ? 'KeyA' : 'KeyD'); for (let k = 0; k < Math.abs(cy); k++) T.panThamesPort(cy > 0 ? 'KeyW' : 'KeyS'); B.state.tick = abs ? dt : t0 + dt; R.render();
      const W = R.state.hd.W, H = R.state.hd.H, c = document.createElement('canvas'); c.width = W; c.height = H;
      const id = new ImageData(W, H); new Uint32Array(id.data.buffer).set(R.state.hd.fb.subarray(0, W * H)); c.getContext('2d').putImageData(id, 0, 0); frames.push({ c, W, H, label: `cam ${cx}:${cy} +${dt}` });
    }
    const p0 = performance.now(); for (let k = 0; k < 30; k++) { B.state.tick++; R.render(); } frames.ms = ((performance.now() - p0) / 30).toFixed(2);
    const fw = frames[0].W * zs, fh = frames[0].H * zs, sheet = document.createElement('canvas'); sheet.width = cols * fw; sheet.height = Math.ceil(frames.length / cols) * (fh + 20);
    const g = sheet.getContext('2d'); g.fillStyle = '#0a0a08'; g.fillRect(0, 0, sheet.width, sheet.height); g.imageSmoothingEnabled = false; g.font = '13px Courier New'; g.fillStyle = '#d9cfb2';
    frames.forEach((f, k) => { const x = (k % cols) * fw, y = Math.floor(k / cols) * (fh + 20); g.drawImage(f.c, x, y, fw, fh); g.fillText(f.label, x + 6, y + fh + 14); });
    return [sheet.toDataURL('image/png'), frames.ms];
  }, { cams, ticks, zs, abs });
  await mkdir(`${root}artifacts/tmp`, { recursive: true });
  await writeFile(`${root}artifacts/tmp/${out}.png`, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`artifacts/tmp/${out}.png  ${ms} ms/frame${errors.length ? '  ERRORS: ' + errors.slice(0, 3).join(' | ') : ''}`);
} finally { await browser.close(); server.kill(); }
