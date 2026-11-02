// Native frames of Briggs in the cell: seated NPC and at the start of the sparring bout. node scripts/shot-bull.mjs outdir
import { mkdir, writeFile } from 'node:fs/promises';
import { openGame } from './lib/harness.mjs';
const out = process.argv[2];
const game = await openGame({ seed: false }), page = game.page, errors = game.errors;
try {
  await mkdir(out, { recursive: true });
  const shot = async name => { const png = await page.evaluate(async () => { const R = await import('/src/renderer.js'); R.render(); const h = R.state.inHD ? R.state.hd3 : (R.state.hd3.W ? R.state.hd3 : R.state.hd); return h.off.toDataURL('image/png'); }); await writeFile(`${out}/${name}.png`, Buffer.from(png.split(',')[1], 'base64')); };
  await page.evaluate(() => { const b = window.__boxer; b.goRoom('cell'); b.pause(); b.step(3); }); await shot('cell');
  await page.evaluate(() => { const b = window.__boxer; b.startSpar(5, 'cell'); b.step(65); }); await shot('fight');
  console.log('saved', out, errors.join('|'));
} finally { await game.close(); }
