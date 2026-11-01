// Pub interior bar: the L-shaped counter, beer engines, mirrored back bar, bar stools, spittoons and the staircase.
// PLACEHOLDER — to be painted. Layout: src/pub-layout.js.
import { quad } from './gym.js';
import { rgb } from './appearance.js';
import { PUB } from './pub-layout.js';

/** A plain shaded block: top and the two faces seen by the camera (+i and +j). */
function block(/** @type {number[]} */b,/** @type {number} */z0,/** @type {number} */z1,/** @type {number} */c){
  const [i0,j0,i1,j1]=b;
  quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,()=>c);
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,()=>c&0xffd8d8d8);
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,()=>c|0x00202020);
}
/** Static wall-bound parts baked once: back bar, staircase. */
export function pubBarStatic(){
  block(PUB.backbar.box,0,26,rgb('#3a2418'));
  block(PUB.stairs.box,0,PUB.stairs.top,rgb('#4a3020'));
  block(PUB.clock.box,0,24,rgb('#3a2418'));
}
/** Counter and stools, drawn in depth order. @returns {{box:number[],draw:()=>void}[]} */
export function pubBarProps(/** @type {number} */t){
  const wood=rgb('#5a3420');
  return [
    {box:PUB.counter.box,draw:()=>block(PUB.counter.box,0,10,wood)},
    {box:PUB.ret.box,draw:()=>block(PUB.ret.box,0,10,wood)},
    ...PUB.stools.map(([i,j])=>{ const r=PUB.stoolR, b=[i-r,j-r,i+r,j+r]; return {box:b,draw:()=>block(b,0,6.5,rgb('#6a4a30'))}; }),
  ];
}
