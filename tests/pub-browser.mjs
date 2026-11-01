import assert from 'node:assert/strict';

/** Walk from the quay into the pub's street door, round the room, and back out onto the quay. */
export async function checkPub(page){
  const r=await page.evaluate(async()=>{
    document.querySelector('[data-dev-scene="port"]').click();
    const T=await import('/src/thames-port.js'), P=await import('/src/pub.js'), R=await import('/src/renderer.js');
    const hold=(keys,n,until=()=>false)=>{ keys.forEach(k=>T.thamesKey(k,true)); for(let k=0;k<n&&!until();k++) window.__boxer.step(1); keys.forEach(k=>T.thamesKey(k,false)); };
    const out={view:T.debugPortView(35.8,6.6)};
    hold(['ArrowUp'],40,P.pubInside); out.inside=P.pubInside(); out.info=document.getElementById('info')?.textContent||'';
    hold(['ArrowLeft','ArrowUp'],60); out.walked=P.state.i<11.5;
    R.render(); const fb=R.state.hd3.fb; let lit=0; for(let k=0;k<fb.length;k+=97) if((fb[k]&0xffffff)>0x101010) lit++; out.drawn=lit>fb.length/97*.5;
    out.blocked=[P.pubBlocked(7,2.8),P.pubBlocked(7,1.5),P.pubBlocked(6,5.5)];
    hold(['ArrowRight','ArrowDown'],140,()=>!P.pubInside()); out.left=!P.pubInside(); const p=T.thamesPlayer(); out.quay=Math.abs(p.i-35.8)<.6&&p.j>6.2;
    return out;
  });
  assert.equal(r.view,true);
  assert.equal(r.inside,true,'walking up into the street door enters the pub');
  assert.match(r.info,/PUB/);
  assert.ok(r.walked&&r.drawn,'the player walks in and the room is painted');
  assert.deepEqual(r.blocked,[true,true,false],'counter and servery block, the floor in front of the bar is free');
  assert.ok(r.left&&r.quay,'walking out of the door returns to the quay in front of the pub');
}
