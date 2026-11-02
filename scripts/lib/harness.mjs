// Shared start for the headless review scripts: the game server on a free port, Chrome, a seeded page under ?debug=1
// and in-page helpers on window.__shot (grab the native frame, lay frames out on a sheet, start a fresh prison game).
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';

export const root = new URL('../..', import.meta.url).pathname;

/** `--key=value` from the command line. @param {string} k @param {string} [d] @returns {string} */
export const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
/** Is the bare `--flag` (or `--flag=1`) on the command line? @param {string} k */
export const flag = k => process.argv.includes(`--${k}`) || arg(k) === '1';

/** In-page helpers, installed before the game's modules load. */
function pageHelpers() {
  const W = /** @type {any} */ (window);
  W.__shot = {
    /** Render now and copy the frame the game just drew, at its native size (port, rooms, fights, minigames). */
    async grab() {
      const B = await import('/src/boxing.js'), R = await import('/src/renderer.js');
      R.render();
      const g = B.state.gstate; let f = null;
      if (g === 'port') f = R.state.hd3;
      else if (g === 'isofight') f = R.isometricFrame((await import('/src/iso-fight.js')).state.venue);
      else if (g === 'hub' || g === 'menu') f = R.hubHD() ? R.roomFrame() : null;
      else if (g === 'crank' || g === 'arm') f = R.state.hd;
      const img = f ? f.img : R.state.img, c = document.createElement('canvas');
      c.width = img.width; c.height = img.height; c.getContext('2d').putImageData(img, 0, 0); return c;
    },
    /** Frames on one sheet: optional crop x,y,w,h, whole-pixel zoom, columns, a label under each frame.
     * @param {HTMLCanvasElement[]} frames @param {{cols?:number,zoom?:number,crop?:number[]|null,labels?:string[]}} [o] */
    sheet(frames, { cols = Math.min(frames.length, 4), zoom = 2, crop = null, labels = [] } = {}) {
      const [cx, cy, cw, ch] = crop || [0, 0, frames[0].width, frames[0].height], lab = labels.length ? 20 : 0, fw = cw * zoom, fh = ch * zoom;
      const s = document.createElement('canvas'); s.width = cols * fw; s.height = Math.ceil(frames.length / cols) * (fh + lab);
      const g = s.getContext('2d'); g.fillStyle = '#0a0a08'; g.fillRect(0, 0, s.width, s.height); g.imageSmoothingEnabled = false; g.font = '13px Courier New'; g.fillStyle = '#d9cfb2';
      frames.forEach((f, k) => { const x = (k % cols) * fw, y = Math.floor(k / cols) * (fh + lab); g.drawImage(f, cx, cy, cw, ch, x, y, fw, fh); if (labels[k]) g.fillText(labels[k], x + 6, y + fh + 14); });
      return s;
    },
    /** A new prison game, paused, with the opening story cards clicked away. */
    async prison() {
      const b = W.__boxer; b.newGame('prison'); b.pause();
      const X = await import('/src/prison.js'); for (let k = 0; k < 6 && X.cardOpen(); k++) /** @type {HTMLElement|null} */ (document.querySelector('#storyChoices button'))?.click();
    },
    /** A fresh prison game switched to a scene, paused and stepped `warm` ticks (the options of scripts/shot.mjs).
     * @param {{scene:string, venue?:string, opp?:number, at?:string, time?:string, warm?:number}} o */
    async scene(o) {
      const b = W.__boxer; await W.__shot.prison();
      if (o.time) { b.simSet({ min: Number(o.time) }); (await import('/src/gym.js')).hubRebake(); }
      if (o.scene === 'fight') { const v = o.venue || 'cell'; b.goRoom(['yard', 'laznia'].includes(v) ? v : 'cell'); b.step(1); b.startSpar(o.opp || 0, v); }
      else (await import('/src/devtools.js')).devSwitchScene(o.scene);
      b.pause();
      if (o.at) { const [i, j] = o.at.split(':').map(Number); if (!(await import('/src/thames-port.js')).debugPortView(i, j)) throw new Error(`no port view at ${o.at}`); }
      b.step(o.warm ?? 60);
    },
    /** Compare a canvas with an earlier PNG (data: URL): changed pixel count and a before | after | changes-in-red picture.
     * @param {string} src @param {HTMLCanvasElement} sheet */
    async diff(src, sheet) {
      const ref = new Image(); ref.src = src; await ref.decode();
      if (ref.width !== sheet.width || ref.height !== sheet.height) return { err: `size ${ref.width}×${ref.height} vs ${sheet.width}×${sheet.height}` };
      const W = sheet.width, H = sheet.height, rc = document.createElement('canvas'); rc.width = W; rc.height = H; rc.getContext('2d').drawImage(ref, 0, 0);
      const A = rc.getContext('2d').getImageData(0, 0, W, H).data, B = sheet.getContext('2d').getImageData(0, 0, W, H).data;
      const d = document.createElement('canvas'); d.width = W * 3; d.height = H; const g = d.getContext('2d');
      g.drawImage(rc, 0, 0); g.drawImage(sheet, W, 0); const m = g.createImageData(W, H); let changed = 0;
      for (let p = 0; p < A.length; p += 4) { const hit = A[p] !== B[p] || A[p + 1] !== B[p + 1] || A[p + 2] !== B[p + 2], v = (B[p] + B[p + 1] + B[p + 2]) / 12;
        if (hit) changed++; m.data[p] = hit ? 255 : v; m.data[p + 1] = hit ? 40 : v; m.data[p + 2] = hit ? 40 : v; m.data[p + 3] = 255; }
      g.putImageData(m, W * 2, 0);
      return { changed, total: W * H, png: d.toDataURL('image/png') };
    },
  };
}

/** Start the server and a headless page on the game. Math.random is seeded unless seed is false, so a call repeats its picture.
 * @param {{seed?:boolean, logs?:boolean, debug?:boolean}} [o] logs echoes the page's console.log lines */
export async function openGame({ seed = true, logs = false, debug = true } = {}) {
  const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit'] });
  const [line] = await once(server.stdout, 'data'), url = String(line).match(/http:\/\/\S+/)[0];
  const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
  const close = async () => { await browser.close(); server.kill(); };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') { if (!m.text().includes('404')) errors.push(m.text()); } else if (logs && m.type() === 'log') console.log('>', m.text()); });
    if (seed) await page.addInitScript(() => { let s = 123456789; Math.random = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; });
    await page.addInitScript(pageHelpers);
    await page.goto(`${url}/${debug ? '?debug=1' : ''}`);
    if (debug) await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
    return { page, errors, url, close };
  } catch (e) { await close(); throw e; }
}

/** Where a review picture goes: a bare name lands in artifacts/tmp/<name>.<ext> (ignored by git). @param {string} out @param {string} ext */
export function outPath(out, ext = 'png') {
  return out.includes('/') ? out : `${root}artifacts/tmp/${out}${out.endsWith('.' + ext) ? '' : '.' + ext}`;
}

/** Write a data: URL (from canvas.toDataURL) to a file; returns the path relative to the repo when it is inside it.
 * @param {string} dataUrl @param {string} out @param {string} [ext] */
export async function saveDataUrl(dataUrl, out, ext = 'png') {
  const path = outPath(out, ext);
  await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
  await writeFile(path, Buffer.from(dataUrl.split(',')[1], 'base64'));
  return path.startsWith(root) ? path.slice(root.length) : path;
}

/** Encode PNG data: URLs as an animated GIF with ffmpeg (palette per clip, no smoothing).
 * @param {string[]} frames @param {string} out @param {number} [fps] @param {string} [dither] ffmpeg paletteuse dither */
export async function saveGif(frames, out, fps = 15, dither = 'none') {
  const dir = await mkdtemp(`${tmpdir()}/roadwork-gif-`), path = outPath(out, 'gif');
  try {
    await Promise.all(frames.map((f, k) => writeFile(`${dir}/f${String(k).padStart(4, '0')}.png`, Buffer.from(f.split(',')[1], 'base64'))));
    await mkdir(path.slice(0, path.lastIndexOf('/')), { recursive: true });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${dir}/f%04d.png`, '-filter_complex',
      `[0:v]split[a][b];[a]palettegen=max_colors=128:reserve_transparent=0[p];[b][p]paletteuse=dither=${dither}`, path]);
  } finally { await rm(dir, { recursive: true, force: true }); }
  return path.startsWith(root) ? path.slice(root.length) : path;
}
