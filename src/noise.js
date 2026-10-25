/* Value noise shared by the painted scenes (the cell, the pull-up window, the roach wall, the crank shed, the push-up sheets). */

import { h2 } from './boxing.js';

// Runtime values owned by noise; initialized explicitly by main.js.
export const state = {};

const NG = 32;
/** Smooth value noise, 0..1, wrapping every 32 units (the grid is filled in initialize). @param {number} u @param {number} v */
export function vnoise(u,v){
  const G=state.noise, i=Math.floor(u), j=Math.floor(v), fu=u-i, fv=v-j, su=fu*fu*(3-2*fu), sv=fv*fv*(3-2*fv);
  const i0=i&31, i1=(i+1)&31, j0=(j&31)*NG, j1=((j+1)&31)*NG, a=G[j0+i0], b=G[j0+i1], c=G[j1+i0], d=G[j1+i1];
  return a+(b-a)*su+(c-a+(a-b-c+d)*su)*sv;
}
/** Two octaves of value noise, 0..1. @param {number} u @param {number} v */
export const fbm=(u,v)=>vnoise(u,v)*0.65+vnoise(u*2.03+11.3,v*2.03+5.7)*0.35;

export function initialize(){
  state.noise=new Float32Array(NG*NG).map((_,i)=>h2(i&31,(i>>5)+77)/255);
}
