// Native-framebuffer capture of a dev scene for art review.
//   node scripts/shot-scene.mjs --scene=cell|yard|laznia|port|pub|alley --steps=60 [--port=34.5:9.9] [--hero=i:j] [--crop=x:y:w:h] [--scale=4] [--eval='...'] --out=name
// --hero places the pub or alley player (and its camera) at i:j; --crop cuts a native-pixel box and enlarges it --scale times (nearest neighbour).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const scene = arg('scene', 'cell'), steps = Number(arg('steps', '30')), out = arg('out', scene), at = arg('port', ''), ev = arg('eval', ''), hero = arg('hero', ''), crop = arg('crop', ''), scale = Number(arg('scale', '1'));
const port = 5197 + Math.floor(Math.random() * 300), root = new URL('..', import.meta.url).pathname;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', m => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
  const png = await page.evaluate(async ({ scene, steps, at, ev, hero, crop, scale }) => {
    document.querySelector(`[data-dev-scene="${scene}"]`)?.click();
    if (at) { const T = await import('/src/thames-port.js'); const [i, j] = at.split(':').map(Number); T.debugPortView(i, j); }
    if (hero) { const [i, j] = hero.split(':').map(Number); if (scene === 'alley') (await import('/src/alley.js')).alleyPlace(i, j); else (await import('/src/pub.js')).pubPlace(i, j); }
    if (ev) await (new Function(`return (async()=>{${ev}})()`))();
    window.__boxer.step(steps);
    const R = await import('/src/renderer.js'); R.render();
    const src = R.state.hd3.off; if (!crop && scale === 1) return src.toDataURL('image/png');
    const [x, y, w, h] = crop ? crop.split(':').map(Number) : [0, 0, src.width, src.height], c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, x, y, w, h, 0, 0, w * scale, h * scale); return c.toDataURL('image/png');
  }, { scene, steps, at, ev, hero, crop, scale });
  await mkdir(`${root}artifacts/tmp`, { recursive: true });
  await writeFile(`${root}artifacts/tmp/${out}.png`, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`artifacts/tmp/${out}.png${errors.length ? '  ERRORS: ' + errors.slice(0, 3).join(' | ') : ''}`);
} finally { await browser.close(); server.kill(); }
