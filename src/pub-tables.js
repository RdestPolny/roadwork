// Pub interior furniture on the floor: standing drinking tables, dining tables with seating, piano, coat stand, tableware.
// PLACEHOLDER — to be painted. Layout: src/pub-layout.js.
import { quad } from './gym.js';
import { rgb } from './appearance.js';
import { PUB } from './pub-layout.js';

function block(/** @type {number[]} */b,/** @type {number} */z0,/** @type {number} */z1,/** @type {number} */c){
  const [i0,j0,i1,j1]=b;
  quad(i1,j0,z0,i1,j1,z0,i1,j1,z1,i1,j0,z1,()=>c);
  quad(i0,j1,z0,i1,j1,z0,i1,j1,z1,i0,j1,z1,()=>c&0xffd8d8d8);
  quad(i0,j0,z1,i1,j0,z1,i1,j1,z1,i0,j1,z1,()=>c|0x00202020);
}
/** Static wall-bound furniture baked once (the piano). */
export function pubTablesStatic(){ block(PUB.piano.box,0,15,rgb('#2a1a12')); }
/** Free-standing furniture in depth order. @returns {{box:number[],draw:()=>void}[]} */
export function pubTablesProps(/** @type {number} */t){
  const L=[];
  for(const s of PUB.standing){ const b=[s.i-s.r,s.j-s.r,s.i+s.r,s.j+s.r]; L.push({box:b,draw:()=>block(b,0,10,rgb('#4b3020'))}); }
  for(const d of PUB.dining){ const b=d.box; L.push({box:b,draw:()=>block(b,0,7.5,rgb('#5e4128'))}); }
  const c=PUB.coatStand, cb=[c.i-.12,c.j-.12,c.i+.12,c.j+.12]; L.push({box:cb,draw:()=>block(cb,0,18,rgb('#2e2016'))});
  return L;
}
