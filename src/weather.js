/* Weather: a sky for every day — sun, clouds or rain, the same for the same day, sometimes turning after midday —
   the light it leaves on the yard, the rain falling over it, and the colours of the sky the windows show. */

import { state as progressionState } from './progression.js';
import { state as appearanceState, rgb } from './appearance.js';
import { state as rendererState } from './renderer.js';
import { state as boxingState, h2 } from './boxing.js';

// Runtime values owned by weather; initialized explicitly by main.js.
export const state = {};

/** Polish words for the HUD. */
export const WEATHER_PL = {sun:'słonecznie',cloud:'pochmurno',rain:'deszcz'};

/** The weather on a day at a minute: about 45% sun, 33% clouds, 22% rain; on a third of the days it turns at 13:00.
 * @param {number} day @param {number} min @returns {'sun'|'cloud'|'rain'} */
export function weatherAt(day,min){
  const pick=(/** @type {number} */ n)=>n<115?'sun':n<200?'cloud':'rain';
  return min>=13*60&&h2(day,17)<85?pick(h2(day*7+5,13)):pick(h2(day*7+3,11));
}

/** The weather right now. */
export function weatherNow(){ const s=progressionState.save.sim; return weatherAt(s.day|0,s.min); }

/** Sky colours [top, horizon] for a sky bucket under this weather (clear skies come from the caller). @param {number} bucket @param {string[]} clear */
export function skyColors(bucket,clear){
  const w=weatherNow(); if(w==='sun') return clear;
  if(bucket===0) return w==='rain'?['#0a0c12','#12161e']:['#0e1018','#1a1e2a'];          // night under cloud: no stars, a little glow
  if(bucket===2) return w==='rain'?['#6c747c','#868e96']:['#a4aeb8','#c2cad2'];
  return w==='rain'?['#4e5058','#6a6c74']:['#8a8a98','#a8a4ac'];                          // dawn and dusk greyed out
}

/** Light of the open yard over the finished frame: the sun warms it, clouds flatten and cool it, rain darkens it. */
export function weatherLight(){
  const w=weatherNow(), fb=rendererState.FB_MAIN, N=appearanceState.W*appearanceState.H;
  const [kr,kg,kb,ds]=w==='sun'?[1.05,1.02,0.95,0]:w==='cloud'?[0.9,0.92,0.97,0.28]:[0.74,0.78,0.86,0.4];
  for(let p=0;p<N;p++){ const c=fb[p]; let r=c&255, g=(c>>8)&255, b=(c>>16)&255; const l=r*0.3+g*0.59+b*0.11;
    r=Math.min(255,(r+(l-r)*ds)*kr); g=Math.min(255,(g+(l-g)*ds)*kg); b=Math.min(255,(b+(l-b)*ds)*kb);
    fb[p]=(0xff000000|((b|0)<<16)|((g|0)<<8)|(r|0))>>>0; }
}

/** Blend a picture pixel towards a colour. @param {number} x @param {number} y @param {number} c @param {number} a */
function mix(x,y,c,a){
  const W=appearanceState.W; if(x<0||y<0||x>=W||y>=appearanceState.H) return; const p=y*W+x, o=rendererState.FB_MAIN[p];
  const r=(o&255)+((c&255)-(o&255))*a, g=((o>>8)&255)+(((c>>8)&255)-((o>>8)&255))*a, b=((o>>16)&255)+(((c>>16)&255)-((o>>16)&255))*a;
  rendererState.FB_MAIN[p]=(0xff000000|((b|0)<<16)|((g|0)<<8)|(r|0))>>>0;
}

/** Rain over the yard: slanting streaks falling through the picture and small splashes on the ground. */
export function drawRain(){
  if(weatherNow()!=='rain') return;
  const t=boxingState.tick, K=rendererState.uiK, W=appearanceState.W, H=appearanceState.H, len=3*K;
  for(let k=0;k<150;k++){ const sp=(2.2+h2(k,7)/255*1.2)*K, y=Math.floor((h2(k,5)/255*H+t*sp)%(H+len))-len, x=Math.floor(((h2(k,3)/255*W*1.3-y*0.28)%W+W)%W);
    for(let d=0;d<len;d++) mix(x-Math.round(d*0.28),y+d,state.DROP,0.38+0.12*(d/len)); }
  for(let k=0;k<26;k++){ const ph=(t+k*17)%28; if(ph>5) continue; const x=Math.floor(h2(k,t/28|0)/255*W), y=Math.floor(H*0.35+h2(k+40,t/28|0)/255*H*0.6);   // splashes
    mix(x,y,state.DROP,0.5); if(ph<3){ mix(x-K,y,state.DROP,0.35); mix(x+K,y,state.DROP,0.35); } }
}

/** Raindrops on window glass (the cell's barred window): streaks and beads, lighter than the sky behind. @param {number} u @param {number} z */
export function glassDrop(u,z){ return weatherNow()==='rain'&&(h2(Math.floor(u*2.5),Math.floor(z*0.9+h2(Math.floor(u*2.5),3)/40))<46); }

export function initialize(){
  state.DROP=rgb('#c6d0dc');
}
