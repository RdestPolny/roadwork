import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';

const port = 5199;
const root = new URL('..', import.meta.url).pathname;
const framesDir = `${root}artifacts/tmp/timber_frames`;
const outGif = `${root}artifacts/timber-yard-routine.gif`;

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
await mkdir(`${root}artifacts`, { recursive: true });

const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'inherit']
});
await once(server.stdout, 'data');

const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = await chromium.launch({
  headless: true,
  ...(existsSync(chrome) ? { executablePath: chrome } : {})
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`http://127.0.0.1:${port}/?debug=1`);
  await page.waitForFunction(() => !!window.__boxer, null, { timeout: 15000 });

  const yardPeriod = await page.evaluate(async () => {
    window.__boxer.pause();
    const T = await import('/src/thames-port.js');
    const L = await import('/src/port-life.js');
    T.startThamesPort();
    // Center the camera squarely on the Thames timber yard
    T.debugPortView(44.0, 7.5);
    return L.YARD_T || 2072;
  });

  console.log(`Timber yard routine period: ${yardPeriod} ticks`);

  // Step simulation through the complete routine cycle
  const stepTicks = 14;
  const totalFrames = Math.ceil(yardPeriod / stepTicks);

  console.log(`Capturing ${totalFrames} frames of native 432x288 framebuffer (dt=${stepTicks} ticks)...`);
  for (let k = 0; k < totalFrames; k++) {
    const png = await page.evaluate(async (step) => {
      window.__boxer.step(step);
      const R = await import('/src/renderer.js');
      return R.state.hd3.off.toDataURL('image/png');
    }, stepTicks);

    const base64Data = png.split(',')[1];
    const framePath = `${framesDir}/frame_${String(k).padStart(4, '0')}.png`;
    await writeFile(framePath, Buffer.from(base64Data, 'base64'));
  }

  console.log(`Encoding animated GIF to ${outGif}...`);
  const ffmpegCmd = `ffmpeg -y -framerate 15 -i "${framesDir}/frame_%04d.png" ` +
    `-filter_complex "[0:v]split[a][b];[a]palettegen=max_colors=128:reserve_transparent=0[p];[b][p]paletteuse=dither=bayer:bayer_scale=3" ` +
    `"${outGif}"`;
  execSync(ffmpegCmd, { stdio: 'inherit' });
  console.log(`Successfully generated timber yard routine GIF: ${outGif}`);
} finally {
  await browser.close();
  server.kill();
  await rm(framesDir, { recursive: true, force: true });
}
