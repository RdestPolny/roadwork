import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

/** Capture specific routine phases at the native resolution. */
export async function checkPortLife(page){
  await mkdir('artifacts/port-life',{recursive:true});
  await page.evaluate(()=>document.querySelector('[data-dev-scene="port"]').click());
  const scenes=[
    ['fisher-wait','fisher','WAIT',.5,49.4,23.5],
    ['fisher-reel','fisher','REEL',.8,49.4,23.5],
    ['fisher-drop','fisher','DROP_FISH',.6,49.4,23.5],
    ['fisher-walk','fisher','WALK_TO_PEE',.5,50.0,23.0],
    ['fisher-pee','fisher','PEE',.5,50.8,22.0],
    ['cat-watch','cat','WATCH',.3,47.4,22.6],
    ['cat-stalk','cat','STALK',.6,48.0,23.0],
    ['cat-steal','cat','STEAL',.5,49.4,23.5],
    ['cat-sprint','cat','SPRINT',.5,47.4,21.6],
    ['cat-return','cat','RETURN',.65,46.5,21.4],
    ['cat-eat','cat','EAT',.5,46.0,21.2],
    ['pub-sip','pub','A',.5,34.2,8.8],
    ['wood-pick','wood','PICK_UP_PLANK',.7,46.7,8.3],
    ['wood-carry','wood','WALK_TO_BENCH',.5,46.7,8.3],
    ['wood-saw','wood','SAW',.5,46.7,8.3],
    ['wood-place','wood','PLACE_ON_STACK',.7,46.7,8.3]
  ];
  for(const [name,who,state,u,i,j] of scenes){
    const result=await page.evaluate(async({who,state,u,i,j})=>{
      const L=await import('/src/port-life.js'), T=await import('/src/thames-port.js'), B=await import('/src/boxing.js'), R=await import('/src/renderer.js');
      window.__boxer.pause(); const valid=T.debugPortView(i,j);
      const target=L.phaseTime(who,state,u); L.setLifeOffset(target-B.state.tick); R.render();
      const life=L.portLife(L.lifeTime(B.state.tick));
      return {
        valid,
        target,
        png:R.state.hd3.off.toDataURL('image/png'),
        fisherState: life.fisher.state,
        fi: life.fisher.P.fi,
        fj: life.fisher.P.fj,
        handR: life.fisher.handR,
        hasPee: !!life.fisher.pee,
        catState: life.cat.state,
        catZ: life.cat.P.z,
        bucketCount: life.bucket.count
      };
    },{who,state,u,i,j});
    assert.ok(result.valid,`${name} camera point`);
    assert.ok(result.target>=0,`${who} ${state}`);
    assert.ok(Number.isFinite(result.fi) && Number.isFinite(result.fj), `${name} fisherman frame orientation finite`);
    assert.ok(Number.isFinite(result.handR[0]) && Number.isFinite(result.handR[1]), `${name} fisherman handR finite`);
    if(state==='WAIT'){
      assert.equal(result.bucketCount, 2, 'Bucket count is 2 during WAIT');
    }
    if(state==='WALK_TO_PEE'){
      assert.equal(result.fisherState,'WALK_TO_PEE','Fisherman in WALK_TO_PEE state');
      assert.equal(result.bucketCount, 3, 'Bucket count is 3 during WALK_TO_PEE');
    }
    if(state==='PEE'){
      assert.equal(result.fisherState,'PEE','Fisherman in PEE state');
      assert.ok(result.hasPee,'Fisherman urine stream active');
    }
    if(state==='STEAL'){
      assert.equal(result.catState,'STEAL','Cat in STEAL state');
    }
    if(state==='EAT'){
      assert.equal(result.catState,'EAT','Cat in EAT state');
      assert.ok(result.catZ>4.0,'Cat on top of crate');
      assert.equal(result.bucketCount, 2, 'Bucket count is 2 during EAT');
    }
    await writeFile(`artifacts/port-life/${name}.png`,Buffer.from(result.png.split(',')[1],'base64'));
  }
  await page.evaluate(async()=>{(await import('/src/port-life.js')).setLifeOffset(0);});
}
