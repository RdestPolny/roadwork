// Render a hub room for art review: one contact sheet with the room at several hours and an optional close-up.
//   node scripts/render-room.mjs --room=yard --times=600,1230 --crop=40:60:120:80 --people=none --out=yard
// --room     cell | yard | laznia (default cell)
// --times    minutes of the day, comma separated (default 600,1230 = 10:00 and 20:30)
// --crop     x:y:w:h in picture pixels (the 2× rooms are 288×192) for a close-up of the first hour
// --people   live (as the game has them) | none (empty room, for the furniture) (default live)
// --eval     JavaScript run in the page after entering the room, to set a scene up (await import('/src/…') works);
//            with --fight it may set globalThis.__after = async b => {…} to run once the scene has started and
//            globalThis.__frame = async (b, k) => {…} to run before frame k is drawn
// --anim     n:gap — instead of the hours, n close-ups (needs --crop) of the first hour, the game stepped gap ticks between them
// --fight    n:gap — the fight scene of the room's venue (cell, yard, canteen, laznia) against opponent 0, the card planning pose:
//            n frames of the whole 144×96 picture, the fight stepped gap ticks between them (ignores --times/--crop/--anim)
// --mini     pullup|pushup|roach|kierat — with --fight=n:gap: the cell's pull-up, push-up or roach-wall scene instead of a fight
// --arm      n:gap — the arm wrestling close-up (the canteen), like --fight; the rival pulls, nobody presses
// Writes artifacts/tmp/<out>.png (ignored by git). Math.random is seeded, so the same call gives the same picture.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';

const arg = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
const setup = arg('eval', ''), mini = arg('mini', ''), arm = arg('arm', ''), fight = arg('fight', '') || arm, anim = arg('anim', ''), room = arg('room', 'cell'), times = arg('times', '600,1230').split(',').map(Number), crop = arg('crop', ''), people = arg('people', 'live'), out = arg('out', room);
const port = 5194, root = new URL('..', import.meta.url).pathname;
const server = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
await once(server.stdout, 'data');
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({ headless: true, ...(existsSync(chrome) ? { executablePath: chrome } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { let seed = 123456789; Math.random = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }; });
  await page.goto(`http://127.0.0.1:${port}/?debug=1`); await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });
  const png = await page.evaluate(async ({ room, times, crop, people, anim, setup, fight, arm, mini }) => {
    const b = window.__boxer; b.newGame('prison'); b.pause();
    const X = await import('/src/prison.js'); for (let k = 0; k < 6 && X.cardOpen(); k++) document.querySelector('#storyChoices button')?.click();
    const {setDevMode}=await import('/src/progression.js'); setDevMode(true);
    b.goRoom(room); b.step(120);
    const P = await import('/src/progression.js'), G = await import('/src/gym.js'), R = await import('/src/renderer.js'), B = await import('/src/boxing.js'), N = await import('/src/npcs.js'), L = await import('/src/cell-light.js'), A = await import('/src/appearance.js');
    if (setup) await (new Function('b', `return (async()=>{ ${setup} })()`))(b);
    if (people === 'none') { for (const C of [...N.state.CNL, ...N.state.YN]) { C.step = null; C.after = null; } G.state.hubP.i = -40; G.state.hubP.j = -40; }
    const frames = [], toCanvas = () => { const hd = R.hdRoom(), W = hd ? R.state.hd.W : A.state.W, H = hd ? R.state.hd.H : A.state.H, src = hd ? R.state.hd.fb : R.state.FB_MAIN;
      const c = document.createElement('canvas'); c.width = W; c.height = H; const id = new ImageData(W, H); new Uint32Array(id.data.buffer).set(src); c.getContext('2d').putImageData(id, 0, 0); return c; };
    if (fight) {   // the side-on fight scene of the venue
      const hd = arm, [n, gap] = fight.split(':').map(Number), SP = await import('/src/sparring.js'), cols = hd ? 2 : 3, FW = hd ? R.state.hd.W : A.state.W, FH = hd ? R.state.hd.H : A.state.H, zs = hd ? 2 : 3, fw = FW * zs, fh = FH * zs;
      P.state.save.sim.min = times[0];
      if (arm) (await import('/src/armwrestle.js')).startArm({ name: 'Wielki Wacek', fight: 3, oppRank: 1, stake: 'porcja', onEnd() {} });
      else if (mini === 'pullup') (await import('/src/pullups.js')).startPullups();
      else if (mini === 'pushup') { const PU = await import('/src/pushups.js'); PU.state.puVenue = 'cell'; PU.startPushup(); }
      else if (mini === 'roach') (await import('/src/roaches.js')).startRoaches();
      else if (mini === 'kierat') (await import('/src/treadwheel.js')).startTreadwheel();
      else { SP.startSpar(0, room, null); } if (globalThis.__after) await globalThis.__after(b); b.sparStep(60);
      const sheet = document.createElement('canvas'); sheet.width = cols * fw; sheet.height = Math.ceil(n / cols) * (fh + 20); const g = sheet.getContext('2d');
      g.fillStyle = '#0a0a08'; g.fillRect(0, 0, sheet.width, sheet.height); g.imageSmoothingEnabled = false; g.font = '13px Courier New'; g.fillStyle = '#d9cfb2';
      for (let k = 0; k < n; k++) { if (k) b.sparStep(gap); if (globalThis.__frame) await globalThis.__frame(b, k); R.render(); const W = FW, H = FH, c = document.createElement('canvas'); c.width = W; c.height = H;
        const id = new ImageData(W, H); new Uint32Array(id.data.buffer).set((hd ? R.state.hd.fb : R.state.FB_MAIN).subarray(0, W * H)); c.getContext('2d').putImageData(id, 0, 0);
        const x = (k % cols) * fw, y = Math.floor(k / cols) * (fh + 20); g.drawImage(c, x, y, fw, fh); g.fillText(`${room} ${arm ? 'ręka' : 'walka'} +${k * gap}`, x + 6, y + fh + 14); }
      return sheet.toDataURL('image/png');
    }
    if (anim && crop) {   // a strip of close-ups over time
      const [n, gap] = anim.split(':').map(Number), [cx, cy, cw, ch] = crop.split(':').map(Number), zs = Math.max(2, Math.floor(1152 / (cw * 4))), cols = 4, rows = Math.ceil(n / cols);
      P.state.save.sim.min = times[0]; G.hubRebake();
      const sheet = document.createElement('canvas'); sheet.width = cols * cw * zs; sheet.height = rows * (ch * zs + 20); const g = sheet.getContext('2d');
      g.fillStyle = '#0a0a08'; g.fillRect(0, 0, sheet.width, sheet.height); g.imageSmoothingEnabled = false; g.font = '13px Courier New'; g.fillStyle = '#d9cfb2';
      for (let k = 0; k < n; k++) { if (k) b.step(gap); P.state.save.sim.min = times[0]; R.render(); const c = toCanvas(), x = (k % cols) * cw * zs, y = Math.floor(k / cols) * (ch * zs + 20);
        g.drawImage(c, cx, cy, cw, ch, x, y, cw * zs, ch * zs); g.fillText(`+${k * gap} klatek`, x + 6, y + ch * zs + 14); }
      return sheet.toDataURL('image/png');
    }
    for (const m of times) {
      P.state.save.sim.min = m; G.hubRebake(); B.state.tick += 60; L.state.onAt = B.state.tick - 100; R.render();
      const hd = R.hdRoom(), W = hd ? R.state.hd.W : A.state.W, H = hd ? R.state.hd.H : A.state.H, src = hd ? R.state.hd.fb : R.state.FB_MAIN;
      const c = document.createElement('canvas'); c.width = W; c.height = H; const id = new ImageData(W, H); new Uint32Array(id.data.buffer).set(src); c.getContext('2d').putImageData(id, 0, 0);
      frames.push({ c, W, H, label: String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0') });
    }
    const S = 576 / frames[0].W, fw = 576, fh = Math.round(frames[0].H * S), lab = 26;
    const [cx, cy, cw, ch] = crop ? crop.split(':').map(Number) : [0, 0, 0, 0], zs = crop ? Math.min(8, Math.floor(1152 / cw)) : 0;
    const sheet = document.createElement('canvas'); sheet.width = Math.max(fw * frames.length, crop ? cw * zs : 0); sheet.height = fh + lab + (crop ? ch * zs + lab : 0);
    const g = sheet.getContext('2d'); g.fillStyle = '#0a0a08'; g.fillRect(0, 0, sheet.width, sheet.height); g.imageSmoothingEnabled = false; g.font = '15px Courier New'; g.fillStyle = '#d9cfb2';
    frames.forEach((f, k) => { g.drawImage(f.c, k * fw, 0, fw, fh); g.fillText(`${room} · ${f.label} · ${f.W}×${f.H}`, k * fw + 10, fh + 18); });
    if (crop) { g.drawImage(frames[0].c, cx, cy, cw, ch, 0, fh + lab, cw * zs, ch * zs); g.fillText(`zbliżenie ${crop} · ${frames[0].label}`, 10, fh + lab + ch * zs + 18); }
    return sheet.toDataURL('image/png');
  }, { room, times, crop, people, anim, setup, fight, arm, mini });
  await mkdir(`${root}artifacts/tmp`, { recursive: true });
  await writeFile(`${root}artifacts/tmp/${out}.png`, Buffer.from(png.split(',')[1], 'base64'));
  console.log(`artifacts/tmp/${out}.png${errors.length ? '  ERRORS: ' + errors.slice(0, 3).join(' | ') : ''}`);
} finally { await browser.close(); server.kill(); }
