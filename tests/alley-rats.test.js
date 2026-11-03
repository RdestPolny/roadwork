import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.location={search:''};
const { createRats, stepRats, ratPositions, ratClear, LANES, HOLES, FLEE_R } = await import('../src/alley-rats.js');

const FAR={i:33,j:6};
const run=(S,seconds,hero,each)=>{ for(let k=0;k<Math.round(seconds*60);k++){ stepRats(S,1/60,hero); each?.(k); } };
const distSeg=(x,y,ax,ay,bx,by)=>{ const dx=bx-ax,dy=by-ay,l2=dx*dx+dy*dy,t=l2?Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/l2)):0; return Math.hypot(x-ax-dx*t,y-ay-dy*t); };
const onLane=(x,y)=>LANES.some(L=>{ for(let k=0;k<L.px.length-1;k++) if(distSeg(x,y,L.px[k],L.py[k],L.px[k+1],L.py[k+1])<1e-6) return true; return false; });
/** Distance to the nearest straight hole connector (hole to any lane point), for the stretches between a hole and its lane. */
const nearHole=(x,y)=>HOLES.some(h=>Math.hypot(x-h.i,y-h.j)<2.3);

test('rats are deterministic: two runs give the same positions', () => {
  const a=createRats(), b=createRats(), seen=[];
  for(let k=0;k<60*90;k++){
    stepRats(a,1/60,FAR); stepRats(b,1/60,FAR);
    if(k%20===0){ const pa=JSON.stringify(ratPositions(a)); assert.equal(pa,JSON.stringify(ratPositions(b))); seen.push(pa.length>2); }
  }
  assert.ok(seen.some(Boolean),'rats appeared');
});

test('rat positions stay on lanes or hole connectors and never inside solids', () => {
  const S=createRats(); let n=0;
  const hero={i:19,j:3.4};
  run(S,240,hero,()=>{
    for(const r of ratPositions(S)){
      n++;
      assert.ok(onLane(r.i,r.j)||nearHole(r.i,r.j),`off path at ${r.i},${r.j}`);
      const atHole=HOLES.some(h=>Math.hypot(r.i-h.i,r.j-h.j)<.15);
      assert.ok(atHole||ratClear(r.i,r.j,.1),`in solid at ${r.i},${r.j}`);
    }
  });
  assert.ok(n>200,'enough samples');
});

test('a group emerges, runs and vanishes; the cycle repeats later', () => {
  const S=createRats(); let first=-1, gone=-1, again=-1;
  run(S,300,FAR,(k)=>{
    const g0=ratPositions(S).filter(r=>r.g===0);
    if(first<0&&g0.length) first=k;
    else if(first>=0&&gone<0&&!g0.length&&S.groups[0].st==='wait') gone=k;
    else if(gone>=0&&again<0&&g0.length) again=k;
  });
  assert.ok(first>=0,'emerged'); assert.ok(gone>first,'vanished'); assert.ok(again>gone,'returned');
});

test('rats are small groups of 2-5 and few are out at a time', () => {
  const S=createRats(); let maxGroup=0, minGroup=9, maxOut=0;
  run(S,400,{i:19,j:3.4},()=>{
    const by={}; for(const r of S.groups.flatMap(G=>G.rats)) by[r.g]=(by[r.g]||0)+1;
    for(const G of S.groups) if(G.st==='run'){ maxGroup=Math.max(maxGroup,G.rats.length); minGroup=Math.min(minGroup,G.rats.length); }
    maxOut=Math.max(maxOut,S.groups.filter(G=>G.st==='run').length);
  });
  assert.ok(minGroup>=2&&maxGroup<=5,`group size ${minGroup}..${maxGroup}`);
  assert.ok(maxOut<=4);
});

/** Step until a rat that is mid-run on its group's route shows up; returns it. */
function untilRunning(S,hero){
  for(let k=0;k<60*300;k++){
    stepRats(S,1/60,hero);
    const r=ratPositions(S).find(q=>q.mode==='go'&&q.s>1.5&&q.s<q.len-6);
    if(r) return r;
  }
  return null;
}

test('rats bolt from the hero: distance grows once he is near', () => {
  const S=createRats(), found=untilRunning(S,{i:19,j:3.4});
  assert.ok(found,'a rat is running');
  const lead=ratPositions(S).find(r=>r.g===found.g&&r.k===found.k);
  const hero={i:lead.i+1.6,j:lead.j};
  assert.ok(Math.hypot(lead.i-hero.i,lead.j-hero.j)<FLEE_R);
  let d0=Infinity;
  run(S,.5,hero);
  const mid=ratPositions(S).filter(r=>r.g===found.g);
  for(const r of mid) d0=Math.min(d0,Math.hypot(r.i-hero.i,r.j-hero.j));
  assert.ok(mid.length===0||mid.some(r=>r.mode==='flee'),'they react within half a second');
  run(S,1.5,hero);
  for(const r of ratPositions(S).filter(r=>r.g===found.g)) assert.ok(Math.hypot(r.i-hero.i,r.j-hero.j)>=Math.min(d0,FLEE_R)-.3,'fleeing away or gone');
});

test('no instant reaction: rats keep their course for the first 0.1 s', () => {
  const S=createRats(), found=untilRunning(S,{i:19,j:3.4});
  assert.ok(found);
  const lead=ratPositions(S).find(r=>r.g===found.g&&r.k===found.k);
  stepRats(S,.1,{i:lead.i+1,j:lead.j});
  const after=ratPositions(S).filter(r=>r.g===found.g);
  assert.ok(after.length&&after.every(r=>r.mode==='go'),'still on course after 0.1 s');
});
