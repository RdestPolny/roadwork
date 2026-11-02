// GIF of one full timber-yard routine in the Thames port, native 432x288: node scripts/record-timber-gif.mjs
import { openGame, root, saveGif } from './lib/harness.mjs';

const outGif = `${root}artifacts/timber-yard-routine.gif`;
const game = await openGame({ seed: false }), page = game.page;

try {
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
  const frames = [];
  for (let k = 0; k < totalFrames; k++) {
    frames.push(await page.evaluate(async (step) => {
      window.__boxer.step(step);
      const R = await import('/src/renderer.js');
      return R.state.hd3.off.toDataURL('image/png');
    }, stepTicks));
  }

  console.log(`Encoding animated GIF to ${outGif}...`);
  await saveGif(frames, outGif, 15, 'bayer:bayer_scale=3');
  console.log(`Successfully generated timber yard routine GIF: ${outGif}`);
} finally {
  await game.close();
}
