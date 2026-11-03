import assert from 'node:assert/strict';

/** Enter the alley through the debug scene, walk its whole length to the blind end, check collisions, and walk out of the mouth. */
export async function checkAlley(page){
  const r=await page.evaluate(async()=>{
    document.querySelector('[data-dev-scene="alley"]').click();
    const T=await import('/src/thames-port.js'), A=await import('/src/alley.js'), R=await import('/src/renderer.js');
    const hold=(keys,n,until=()=>false)=>{ keys.forEach(k=>T.thamesKey(k,true)); for(let k=0;k<n&&!until();k++) window.__boxer.step(1); keys.forEach(k=>T.thamesKey(k,false)); };
    const L=A.ALLEY, out={inside:A.alleyInside(),start:[A.state.i,A.state.j],info:document.getElementById('info')?.textContent||''};
    // ArrowLeft+ArrowUp walks along -i; ArrowLeft+ArrowDown along +j.
    // The layout is edited by others, so the route is searched on a 0.2 grid over alleyBlocked, then walked tick by tick with held screen keys.
    const S=A.state, G=.2, key=(a,b)=>a+','+b, prev=new Map([[key(Math.round(L.hero.i/G),Math.round(L.hero.j/G)),null]]), q=[[Math.round(L.hero.i/G),Math.round(L.hero.j/G)]];
    let goal=null;
    for(let n=0;n<q.length&&!goal;n++){
      const [a,b]=q[n]; if(a*G<2) goal=[a,b];
      for(const [da,db] of [[-1,0],[0,1],[0,-1],[1,0]]){ const c=[a+da,b+db], k=key(...c); if(!prev.has(k)&&!A.alleyBlocked(c[0]*G,c[1]*G)){ prev.set(k,[a,b]); q.push(c); } }
    }
    const path=[]; for(let c=goal;c;c=prev.get(key(...c))) path.unshift(c); out.path=path.length;
    for(const [a,b] of path){
      const di=Math.sign(a*G-S.i)*(Math.abs(a*G-S.i)>Math.abs(b*G-S.j)), dj=Math.sign(b*G-S.j)*(Math.abs(b*G-S.j)>=Math.abs(a*G-S.i));
      // screen keys for a pure i or j step: -i = left+up, +i = right+down, +j = left+down, -j = right+up
      const keys=di<0?['ArrowLeft','ArrowUp']:di>0?['ArrowRight','ArrowDown']:dj>0?['ArrowLeft','ArrowDown']:dj<0?['ArrowRight','ArrowUp']:[];
      const reached=()=>Math.hypot(a*G-S.i,b*G-S.j)<.07; let guard=0, last=-1;
      while(keys.length&&!reached()&&guard++<60){ hold(keys,1); if(S.i+S.j===last) break; last=S.i+S.j; }
    }
    out.end=A.state.i;
    const mid=b=>[(b.box[0]+b.box[2])/2,(b.box[1]+b.box[3])/2], arch=L.arches[0], at=b=>A.alleyBlocked(...mid(b));
    out.blocked={wall:A.alleyBlocked(10,.1),solids:L.boxes.filter(b=>b.solid!==false).every(at),walkable:L.boxes.filter(b=>b.solid===false).some(b=>!at(b)),arch:A.alleyBlocked((arch.i0+arch.i1)/2,3.4),behindMouth:A.alleyBlocked(L.I+.5,.5)};
    A.alleyPlace(10,3.4); R.render(); const fb=R.state.hd3.fb; let lit=0; for(let k=0;k<fb.length;k+=97) if((fb[k]&0xffffff)>0x101010) lit++; out.drawn=lit>fb.length/97*.3;
    A.alleyPlace(L.I-1,3.4); hold(['ArrowRight','ArrowDown'],200,()=>!A.alleyInside()); out.left=!A.alleyInside(); out.mode=document.getElementById('info')?.textContent||'';
    out.tick=(()=>{ A.enterAlley(); A.alleyPlace(L.I-.1,3.4); return A.alleyTick(1,1); })(); A.leaveAlley();
    return out;
  });
  assert.equal(r.inside,true,'the alley debug scene enters the alley');
  assert.match(r.info,/ALEJKA/);
  assert.ok(r.end<2,'the hero walks from the mouth to the blind end (round the pump) without getting stuck');
  assert.equal(r.blocked.wall,true,'the tenement wall blocks'); assert.equal(r.blocked.solids,true,'every solid box blocks at its centre');
  assert.equal(r.blocked.walkable,true,'mats and grates (solid:false) do not block'); assert.equal(r.blocked.arch,false,'the arch does not block');
  assert.equal(r.blocked.behindMouth,true,'beside the mouth the wall is closed');
  assert.ok(r.drawn,'the alley frame is painted');
  assert.ok(r.left,'walking out of the mouth leaves the alley');
  assert.equal(r.tick,'exit');
}
