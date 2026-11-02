// Reference frames of key scenes: each scene starts in a freshly loaded seeded page (scripts/lib/harness.mjs), is stepped
// a fixed number of ticks and its native frame must match tests/visual/<name>.png pixel for pixel.
//   npm run test:visual                    compare; a mismatch writes before | after | changes to artifacts/tmp/visual/<name>-diff.png
//   npm run test:visual -- --update        rewrite the references after an intended visual change (look at the diffs first)
//   npm run test:visual -- --only=port     scenes whose name contains the text; --list prints the names
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { arg, flag, openGame, root, saveDataUrl } from '../scripts/lib/harness.mjs';

/** Scene options as in scripts/shot.mjs; `each` steps between the frames laid side by side (motion, not just a still). */
const SCENES = [
  { name: 'port', scene: 'port' },
  { name: 'port-timber', scene: 'port', at: '47:8' },
  { name: 'port-pier', scene: 'port', at: '47:21' },
  { name: 'pub', scene: 'pub' },
  { name: 'cell', scene: 'cell' },
  { name: 'yard', scene: 'yard' },
  { name: 'laznia', scene: 'laznia' },
  { name: 'fight-yard', scene: 'fight', venue: 'yard', opp: 2, frames: 3, gap: 25 },
  { name: 'fight-sandy', scene: 'sandy', frames: 3, gap: 25 },
  { name: 'shadow', scene: 'shadow' },
  { name: 'crank', scene: 'crank' },
];

const only = arg('only', ''), update = flag('update'), dir = `${root}tests/visual`;
const scenes = SCENES.filter(s => s.name.includes(only));
if (flag('list')) { console.log(scenes.map(s => s.name).join('\n')); process.exit(0); }
if (!scenes.length) { console.error(`no scene matches --only=${only}`); process.exit(1); }
await mkdir(dir, { recursive: true });

const game = await openGame(), page = game.page;
let failed = 0;
try {
  for (const s of scenes) {
    const t0 = Date.now(), ref = `${dir}/${s.name}.png`;
    await page.reload(); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });   // init scripts run again: Math.random restarts from its seed
    game.errors.length = 0;
    const refUrl = !update && existsSync(ref) ? `data:image/png;base64,${(await readFile(ref)).toString('base64')}` : '';
    const r = await page.evaluate(async ({ s, refUrl }) => {
      const S = window.__shot, b = window.__boxer;
      await S.scene(s);
      const frames = [];
      for (let k = 0; k < (s.frames || 1); k++) { if (k) b.step(s.gap); frames.push(await S.grab()); }
      const sheet = S.sheet(frames, { cols: frames.length, zoom: 1 }), png = sheet.toDataURL('image/png');
      return { png, ...(refUrl ? await S.diff(refUrl, sheet) : {}) };
    }, { s, refUrl });
    const ms = `${Date.now() - t0} ms`, errs = game.errors.length ? `  page errors: ${game.errors.slice(0, 2).join(' | ')}` : '';
    if (!refUrl) {
      await writeFile(ref, Buffer.from(r.png.split(',')[1], 'base64'));
      console.log(`${update ? 'UPDATED' : 'NEW    '} ${s.name}  (${ms})${errs}`);
      if (errs) failed++;
    } else if (r.err || r.changed || errs) {
      failed++;
      const where = r.png && r.changed ? `  -> ${await saveDataUrl(r.png, `${root}artifacts/tmp/visual/${s.name}-diff.png`)}` : '';
      console.log(`FAIL    ${s.name}  ${r.err || `${r.changed} of ${r.total} px changed (${(100 * r.changed / r.total).toFixed(2)}%)`}${where}${errs}`);
    } else console.log(`PASS    ${s.name}  (${ms})`);
  }
} finally { await game.close(); }
console.log(failed ? `${failed} of ${scenes.length} scenes differ` : `${scenes.length} scenes match`);
process.exit(failed ? 1 : 0);
