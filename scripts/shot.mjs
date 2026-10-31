// One review picture of any scene: native frames on a sheet, a GIF, or a before/after diff. Output in artifacts/tmp/.
//   node scripts/shot.mjs --scene=port --at=21.5:9 --frames=4 --gap=30 --out=quay
//   node scripts/shot.mjs --scene=fight --venue=yard --opp=2 --eval='b.step(40)' --crop=150:90:140:110 --zoom=4
//   node scripts/shot.mjs --scene=pullups --frames=24 --gap=3 --gif=20 --out=pullup
//   node scripts/shot.mjs --scene=cell --time=1230 --out=after --diff=before     (same arguments as the "before" run)
// --scene   cell | yard | laznia | port | sandy | fight | spar | shadow | pushups | pullups | roaches | crank | work | arm
//           (fight = the isometric brawl, --venue=cell|yard|laznia|canteen|sandy|port, --opp=<rival index>)
// --at      i:j  port camera spot (debugPortView); --time  minutes of the prison day (rooms: hour and light)
// --warm    ticks stepped after the scene starts (default 60)
// --eval    JS run once the scene has started; b = window.__boxer, await import('/src/…') works
// --each    JS run before each frame; k = frame index
// --frames  n frames, --gap ticks stepped between them (default 1 and 20)
// --crop    x:y:w:h of the native frame, --zoom whole-pixel scale (default 2, or to ~1200 px with --crop), --cols per row
// --gif     fps: an animated GIF of the frames instead of a sheet (needs ffmpeg)
// --diff    an earlier PNG from this script (name in artifacts/tmp or a path): writes <out>-diff.png and counts changed pixels
// --logs    echo the page's console.log; --no-seed  real Math.random
import { readFile } from 'node:fs/promises';
import { arg, flag, openGame, outPath, saveDataUrl, saveGif } from './lib/harness.mjs';

const scene = arg('scene', 'cell'), out = arg('out', scene), n = Number(arg('frames', '1')), gap = Number(arg('gap', '20')), gif = arg('gif', '');
const crop = arg('crop', '') ? arg('crop').split(':').map(Number) : null;
const opts = { scene, venue: arg('venue', 'cell'), opp: Number(arg('opp', '0')), at: arg('at', ''), time: arg('time', ''), warm: Number(arg('warm', '60')),
  setup: arg('eval', ''), each: arg('each', ''), n, gap, crop, zoom: Number(arg('zoom', crop ? String(Math.max(2, Math.floor(1200 / (crop[2] * Math.min(n, 4))))) : '2')),
  cols: Number(arg('cols', String(Math.min(n, 4)))), gif: !!gif };
const diff = arg('diff', '') ? `data:image/png;base64,${(await readFile(outPath(arg('diff')))).toString('base64')}` : '';

const game = await openGame({ seed: !flag('no-seed'), logs: flag('logs') });
try {
  const res = await game.page.evaluate(async ({ o, diff }) => {
    const b = window.__boxer, S = window.__shot, run = (code, k) => new Function('b', 'k', `return (async()=>{ ${code} })()`)(b, k);
    await S.prison();
    if (o.time) { b.simSet({ min: Number(o.time) }); (await import('/src/gym.js')).hubRebake(); }
    if (o.scene === 'fight') { b.goRoom(['yard', 'laznia'].includes(o.venue) ? o.venue : 'cell'); b.step(1); b.startSpar(o.opp, o.venue); }
    else (await import('/src/devtools.js')).devSwitchScene(o.scene);
    b.pause();
    if (o.at) { const [i, j] = o.at.split(':').map(Number); if (!(await import('/src/thames-port.js')).debugPortView(i, j)) throw new Error(`no port view at ${o.at}`); }
    b.step(o.warm);
    if (o.setup) await run(o.setup, 0);
    const frames = [], labels = [];
    for (let k = 0; k < o.n; k++) { if (k) b.step(o.gap); if (o.each) await run(o.each, k); frames.push(await S.grab()); labels.push(o.n > 1 ? `${o.scene} +${k * o.gap}` : ''); }
    const native = `${frames[0].width}×${frames[0].height}`;
    if (o.gif) return { gif: frames.map(f => S.sheet([f], { cols: 1, zoom: o.zoom, crop: o.crop }).toDataURL('image/png')), native };
    const sheet = S.sheet(frames, { cols: o.cols, zoom: o.zoom, crop: o.crop, labels: labels.some(Boolean) ? labels : [] }), png = sheet.toDataURL('image/png');
    if (!diff) return { png, native };
    const ref = new Image(); ref.src = diff; await ref.decode();
    if (ref.width !== sheet.width || ref.height !== sheet.height) return { png, native, diffErr: `size ${ref.width}×${ref.height} vs ${sheet.width}×${sheet.height}: use the same arguments as the earlier run` };
    const W = sheet.width, H = sheet.height, rc = document.createElement('canvas'); rc.width = W; rc.height = H; rc.getContext('2d').drawImage(ref, 0, 0);
    const A = rc.getContext('2d').getImageData(0, 0, W, H).data, B = sheet.getContext('2d').getImageData(0, 0, W, H).data;
    const d = document.createElement('canvas'); d.width = W * 3; d.height = H; const g = d.getContext('2d');
    g.drawImage(rc, 0, 0); g.drawImage(sheet, W, 0); const m = g.createImageData(W, H); let changed = 0;
    for (let p = 0; p < A.length; p += 4) { const hit = A[p] !== B[p] || A[p + 1] !== B[p + 1] || A[p + 2] !== B[p + 2], v = (B[p] + B[p + 1] + B[p + 2]) / 12;
      if (hit) changed++; m.data[p] = hit ? 255 : v; m.data[p + 1] = hit ? 40 : v; m.data[p + 2] = hit ? 40 : v; m.data[p + 3] = 255; }
    g.putImageData(m, W * 2, 0);
    return { png, native, diffPng: d.toDataURL('image/png'), changed, total: W * H };
  }, { o: opts, diff });
  const err = game.errors.length ? `  ERRORS: ${game.errors.slice(0, 3).join(' | ')}` : '';
  if (res.gif) { console.log(`${await saveGif(res.gif, out, Number(gif))}  ${res.gif.length} frames, native ${res.native}${err}`); }
  else {
    console.log(`${await saveDataUrl(res.png, out)}  native ${res.native}${err}`);
    if (res.diffErr) console.log(`diff skipped: ${res.diffErr}`);
    else if (res.diffPng) console.log(`${await saveDataUrl(res.diffPng, `${out}-diff`)}  before | after | changes in red: ${res.changed} of ${res.total} px (${(100 * res.changed / res.total).toFixed(2)}%)`);
  }
} finally { await game.close(); }
