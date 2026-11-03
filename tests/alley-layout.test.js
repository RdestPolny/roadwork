import test from 'node:test';
import assert from 'node:assert/strict';
import { ALLEY } from '../src/alley-layout.js';

const R=.24, MIN_LANE=1.2;
const solids=ALLEY.boxes.filter(b=>b.solid);
const ids=(L)=>L.map(x=>x.id);

test('alley footprints fit the rectangle and ids are unique', () => {
  const {I,J}=ALLEY;
  for(const b of ALLEY.boxes){ const [a,c,d,e]=b.box; assert.ok(a>=0&&c>=0&&d<=I&&e<=J&&a<d&&c<e,b.id); }
  for(const L of [ALLEY.boxes,ALLEY.lamps,ALLEY.doors,ALLEY.windows,ALLEY.zones]) assert.equal(new Set(ids(L)).size,L.length);
});

test('solid boxes do not overlap', () => {
  for(let a=0;a<solids.length;a++) for(let b=a+1;b<solids.length;b++){
    const p=solids[a].box,q=solids[b].box;
    assert.ok(p[2]<=q[0]||q[2]<=p[0]||p[3]<=q[1]||q[3]<=p[1],`${solids[a].id} x ${solids[b].id}`);
  }
});

test('lamps, doors, windows, arches stay in bounds', () => {
  const {I,J,H}=ALLEY;
  for(const l of ALLEY.lamps) assert.ok(l.i>=0&&l.i<=I&&l.j>=0&&l.j<=J&&l.z>0&&l.z<=H&&l.flicker>=0&&l.flicker<=1,l.id);
  for(const d of ALLEY.doors) assert.ok(d.i0>=0&&d.i1<=I&&d.i0<d.i1,d.id);
  for(const w of ALLEY.windows) assert.ok(w.i0>=0&&w.i1<=I&&w.i0<w.i1&&w.z0<w.z1&&w.z1<=H,w.id);
  for(const a of ALLEY.arches) assert.ok(a.i0>=0&&a.i1<=I&&a.i0<a.i1&&a.z>=26);
  assert.ok(Array.isArray(ALLEY.npcSpots));
});

test('the walk from the mouth to the gate has a lane of at least 1.2 everywhere', () => {
  const {I,J,hero}=ALLEY, S=.1;
  const hit=(i,j)=>solids.some(({box:b})=>i>b[0]-R&&i<b[2]+R&&j>b[1]-R&&j<b[3]+R);
  const free=(i,j)=>i>=R&&i<=I&&j>=R&&j<=J-R&&!hit(i,j);
  assert.ok(free(hero.i,hero.j),'hero start is free');
  // widest free strip of every cross-section
  for(let i=0;i<I;i+=S){
    const cov=solids.filter(b=>i>=b.box[0]&&i<b.box[2]).map(b=>[b.box[1],b.box[3]]).sort((x,y)=>x[0]-y[0]);
    let best=0,cur=0; for(const [a,b] of cov){ best=Math.max(best,a-cur); cur=Math.max(cur,b); } best=Math.max(best,J-cur);
    assert.ok(best>=MIN_LANE,`lane ${best.toFixed(2)} at i=${i.toFixed(1)}`);
  }
  // flood fill with the body radius
  const nx=Math.round(I/S), ny=Math.round(J/S), seen=new Uint8Array((nx+1)*(ny+1)), q=[[Math.round(hero.i/S),Math.round(hero.j/S)]];
  const key=(x,y)=>y*(nx+1)+x; seen[key(...q[0])]=1;
  while(q.length){ const [x,y]=q.pop(); for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){ const X=x+dx,Y=y+dy;
    if(X<0||Y<0||X>nx||Y>ny||seen[key(X,Y)]||!free(X*S,Y*S)) continue; seen[key(X,Y)]=1; q.push([X,Y]); } }
  const g=ALLEY.deadEnd, gj=(g.j0+g.j1)/2;
  assert.ok(seen[key(Math.round(1/S),Math.round(gj/S))],'the gate is reachable');
});

test('lamps, glows, signs: unique ids, valid modes and window references', () => {
  for(const L of [ALLEY.glows,ALLEY.signs,ALLEY.drips,ALLEY.ruts]) assert.equal(new Set(ids(L)).size,L.length);
  for(const l of ALLEY.lamps) assert.ok(['steady','gutter','dead'].includes(l.mode),l.id);
  const win=new Set(ALLEY.windows.map(w=>w.id));
  for(const g of ALLEY.glows){ assert.ok(g.i>=0&&g.i<=ALLEY.I&&g.j>=0&&g.j<=ALLEY.J,g.id); if(g.window) assert.ok(win.has(g.window),g.id); }
  const a=ALLEY.ambient; for(let k=1;k<a.length;k++) assert.ok(a[k].i>a[k-1].i);
  assert.ok(a.every(p=>p.k>=0&&p.k<=1)&&a[0].i===0&&a.at(-1).i===ALLEY.I);
  assert.ok(Array.isArray(ALLEY.stories));
});

test('signs lie on the wall range and never overlap windows or doors of their face', () => {
  const face=(o)=>o.face||'wall', overlap=(a0,a1,b0,b1)=>a0<b1&&b0<a1;
  for(const s of ALLEY.signs){
    assert.ok(s.text&&s.h>0&&s.i0<s.i1,s.id);
    if(s.side==='end-wall'){ assert.ok(s.i0>=0&&s.i1<=ALLEY.J,s.id); continue; }
    if(s.side==='wall'||s.side==='bay-bridge'||s.side==='pilaster-mouth') assert.ok(s.i0>=0&&s.i1<=ALLEY.I,s.id);
    if(s.side==='wall'||s.side==='bay-bridge'){
      for(const w of ALLEY.windows) if(face(w)===s.side) assert.ok(!(overlap(s.i0,s.i1,w.i0,w.i1)&&overlap(s.z,s.z+s.h,w.z0,w.z1)),`${s.id} x ${w.id}`);
      for(const d of ALLEY.doors) if(face(d)===s.side) assert.ok(!(overlap(s.i0,s.i1,d.i0,d.i1)&&overlap(s.z,s.z+s.h,0,d.z)),`${s.id} x ${d.id}`);
    }
  }
  for(const w of ALLEY.windows){ if(face(w)!=='wall') continue; for(const d of ALLEY.doors) if(face(d)==='wall'&&w.floor===0) assert.ok(!overlap(w.i0,w.i1,d.i0,d.i1),`${w.id} x ${d.id}`); }
});
