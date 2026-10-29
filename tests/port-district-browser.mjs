import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const ROOT='artifacts/thames-district';
/** Capture the actual native framebuffer, not the 3x upscaled stage canvas. */
async function capture(page,name){
  const png=await page.evaluate(async()=>{
    const R=await import('/src/renderer.js'); R.render();
    return {png:R.state.hd3.off.toDataURL('image/png'),width:R.isometricFrame('port').W,height:R.isometricFrame('port').H};
  });
  assert.deepEqual([png.width,png.height],[432,288]);
  await writeFile(`${ROOT}/${name}.png`,Buffer.from(png.png.split(',')[1],'base64'));
}
export async function checkPortDistrict(page){
  await mkdir(ROOT,{recursive:true});
  // The developer scene picker can be inside a collapsed options panel.
  // The existing browser tests activate this control through DOM click.
  await page.evaluate(()=>document.querySelector('[data-dev-scene="port"]').click());
  let checks=0;
  const frames=[
    ['01-original-coal-wharf',21,9,140],
    ['02-old-new-continuation',30.5,7.2,30],
    ['03-pub-full-facade',34.5,9.9,45],
    ['04-pub-entrance-people',35.7,7.6,120],
    ['05-pub-water-terrace',36,14.25,160],
    ['06-dock-lane',41,6.2,120],
    ['07-trade-yard',46.7,8.3,180],
    ['08-timber-pier-and-boat',46.8,20.2,110],
    ['09-river-distance',46.8,23.2,180],
    ['10-ambient-routines',45.7,8.4,280],
  ];
  for(const [name,i,j,steps] of frames){
    const ok=await page.evaluate(async({i,j,steps})=>{
      const T=await import('/src/thames-port.js');
      const valid=T.debugPortView(i,j);
      window.__boxer.step(steps);
      return {valid,state:window.__boxer.gstate};
    },{i,j,steps});
    assert.equal(ok.valid,true,`debug viewpoint ${name} must be walkable`);
    assert.equal(ok.state,'port');
    await capture(page,name);checks++;
  }
  // Existing brawl and scripted narrative are deliberately unchanged.
  await page.evaluate(async()=>{
    const T=await import('/src/thames-port.js');
    T.startPortScene('before');window.__boxer.step(35);
  });
  await capture(page,'11-cutscene-before');
  await page.evaluate(async()=>{(await import('/src/iso-fight.js')).startIsoFight(0,'port');window.__boxer.step(60);});
  await capture(page,'12-original-brawl');
  await page.evaluate(async()=>{(await import('/src/thames-port.js')).startPortScene('after');window.__boxer.step(140);});
  await capture(page,'13-cutscene-after');
  checks+=3;
  assert.equal(checks,13);
  await page.evaluate(async()=>{(await import('/src/thames-port.js')).startThamesPort();});
}
