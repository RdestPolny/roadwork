
// Runtime values owned by audio; initialized explicitly by main.js.
export const state = {};

export function initAudio(){
  if(state.actx){ if(state.actx.state==='suspended')state.actx.resume(); return; }
  try{
    state.actx=new (window.AudioContext||window.webkitAudioContext)();
    state.master=state.actx.createGain(); state.master.gain.value=0.6; state.master.connect(state.actx.destination);
    const len=(state.actx.sampleRate*0.3)|0; state.noiseBuf=state.actx.createBuffer(1,len,state.actx.sampleRate);
    const d=state.noiseBuf.getChannelData(0); for(let i=0;i<len;i++){const f=1-i/len; d[i]=(Math.random()*2-1)*f*f;}
  }catch(e){state.actx=null;}
}

export function tone(type,f0,f1,dur,vol){
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const o=state.actx.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1!==f0)o.frequency.exponentialRampToValueAtTime(f1,t+dur*0.8);
  const g=state.actx.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g).connect(state.master); o.start(t); o.stop(t+dur+0.02);
}

/** A short dry fist impact in prison, the existing padded thud elsewhere. */
export function sfxPunch(vol,weight,bare=false){
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type=bare?'bandpass':'lowpass'; f.frequency.value=bare?1900:(500+900*(1-weight*0.5));
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.7*vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+(bare?0.075:0.16));
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+(bare?0.1:0.2));
  tone('sine',bare?170:140-weight*40,bare?80:40,bare?0.07:0.18,(bare?0.7:0.9)*vol);
}

export function sfxWhoosh(vol){
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type='bandpass'; f.Q.value=1.2; f.frequency.setValueAtTime(900,t); f.frequency.exponentialRampToValueAtTime(2600,t+0.08);
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.12*vol,t+0.03); g.gain.exponentialRampToValueAtTime(0.001,t+0.1);
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.12);
}

export function sfxFlow(){ tone('triangle',330,990,0.25,0.12); }

export function sfxChime(f){ tone('triangle',f,f*1.5,0.18,0.08); }

/** Bone giving way (a rib, the nose, a knuckle): a dry crack over a dull thud. @param {number} v */
export function sfxCrack(v){ tone('square',2400,420,0.045,0.09*v); tone('sawtooth',900,120,0.07,0.06*v); tone('sine',150,55,0.16,0.32*v); }

export function sfxMiss(){ tone('square',160,90,0.14,0.05); }

export function sfxKO(){ tone('sine',120,35,0.7,0.5); tone('square',220,55,0.5,0.04); }

export function sfxSlap(v){   // hands strike the floor: short bright tick
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=2200;
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.35*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.035);
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.05);
}

export function sfxBreath(){ if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime; const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf; const f=state.actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=500; f.Q.value=0.8; const g=state.actx.createGain(); g.gain.setValueAtTime(0.06,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.06); src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.08); }

export function sfxClap(){ if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime; const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf; const f=state.actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1400; const g=state.actx.createGain(); g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.07); src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.09); }

/** A soft low pulse and a rush of air on a perfect evade. */
export function sfxPerfectEvade(){ tone('sine',135,68,0.14,0.11); sfxWhoosh(0.62); }

export function sfxLand(v){ tone('sine',120,55,0.09,0.22*v); }

export function sfxBlock(v,bare=false){   // leather on leather: muffled thump + a dry slap
  if(!state.actx||!state.soundOn)return; const t=state.actx.currentTime;
  const src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=bare?2100:1400; f.Q.value=0.9;
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.4*v,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.06);
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.08);
  tone('sine',110,60,0.08,0.35*v);
}

export function sfxSlowmo(){   // time stretching: a deep falling whoom + a muffled heartbeat
  if(!state.actx||!state.soundOn)return; tone('sine',240,55,0.9,0.35); tone('triangle',90,60,0.25,0.25);
  const t=state.actx.currentTime, src=state.actx.createBufferSource(); src.buffer=state.noiseBuf;
  const f=state.actx.createBiquadFilter(); f.type='lowpass'; f.frequency.setValueAtTime(1800,t); f.frequency.exponentialRampToValueAtTime(200,t+0.6);
  const g=state.actx.createGain(); g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.7);
  src.connect(f).connect(g).connect(state.master); src.start(t); src.stop(t+0.3);
}

export function sfxBell(n){   // ring bell: inharmonic partials, n strikes
  if(!state.actx||!state.soundOn)return;
  for(let i=0;i<n;i++){ const t=state.actx.currentTime+i*0.3;
    for(let k=0;k<3;k++){ const o=state.actx.createOscillator(); o.type='sine'; o.frequency.value=[1180,2360,3070][k];
      const g=state.actx.createGain(); g.gain.setValueAtTime(k?0.05:0.16,t); g.gain.exponentialRampToValueAtTime(0.0001,t+(k?0.6:1.3));
      o.connect(g).connect(state.master); o.start(t); o.stop(t+1.4); } }
}

/* ---------- the roach wall: filtered noise ---------- */

/** A burst of the shared noise through one filter, delayed by dt seconds; rate stretches it (lower = longer, darker).
 * @param {number} dt @param {BiquadFilterType} type @param {number} f0 @param {number} f1 @param {number} vol @param {number} dur
 * @param {number} [rate] @param {number} [pan] */
function noise(dt,type,f0,f1,vol,dur,rate=1,pan=0){
  const A=state.actx, t=A.currentTime+dt, src=A.createBufferSource(); src.buffer=state.noiseBuf; src.playbackRate.value=rate;
  const f=A.createBiquadFilter(); f.type=type; f.frequency.setValueAtTime(f0,t); if(f1!==f0) f.frequency.exponentialRampToValueAtTime(f1,t+dur*0.9);
  const g=A.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  let out=src.connect(f).connect(g); if(pan&&A.createStereoPanner){ const p=A.createStereoPanner(); p.pan.value=pan; out=out.connect(p); }
  out.connect(state.master); src.start(t); src.stop(t+dur+0.02);
}
/** A tone delayed by dt seconds. @param {number} dt @param {OscillatorType} type @param {number} f0 @param {number} f1 @param {number} dur @param {number} vol */
function toneAt(dt,type,f0,f1,dur,vol){
  const A=state.actx, t=A.currentTime+dt, o=A.createOscillator(); o.type=type; o.frequency.setValueAtTime(f0,t); if(f1!==f0) o.frequency.exponentialRampToValueAtTime(f1,t+dur*0.8);
  const g=A.createGain(); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g).connect(state.master); o.start(t); o.stop(t+dur+0.02);
}
/** A roach under the knuckles: the shell cracks, a wet tail, the soft knock of the fist behind it. @param {number} v */
export function sfxSquash(v){
  if(!state.actx||!state.soundOn)return;
  toneAt(0,'square',3200,1100,0.014,0.07*v); noise(0,'highpass',4200,4200,0.32*v,0.03);
  noise(0.012,'lowpass',900,300,0.28*v,0.07,0.7); toneAt(0,'sine',120,55,0.09,0.32*v);
}
/** Bare knuckles on the wall: a dead knock and crumbling lime; iron rings. @param {number} surface 0 lime, 1 brick, 2 mortar, 3 iron */
export function sfxKnuckle(surface){
  if(!state.actx||!state.soundOn)return;
  toneAt(0,'sine',surface===1?95:80,40,0.15,0.75); noise(0,'lowpass',surface===1?700:450,200,0.5,0.06,0.8);
  if(surface!==3) noise(0.02,'bandpass',1500,900,0.18,0.11,0.6);   // lime and grit trickling
  else { toneAt(0,'triangle',1830,1790,0.32,0.09); toneAt(0,'sine',2710,2690,0.22,0.05); }
}
/** Breath sucked in through the teeth, longer and sharper the worse it hurts. @param {number} pain 0–100 */
export function sfxHiss(pain){
  if(!state.actx||!state.soundOn)return;
  noise(0.06,'highpass',3600,2200,0.05+0.08*pain/100,0.25+0.25*pain/100,0.55+0.15*pain/100);
  if(pain>=90) toneAt(0.05,'sine',6200,6150,1.1,0.012);   // the ringing in the ears
}
/** Tiny legs on lime: a few quick ticks, placed left or right. @param {number} pan -1..1 @param {number} vol */
export function sfxSkitter(pan,vol){
  if(!state.actx||!state.soundOn)return;
  for(let k=0,dt=0;k<3+(Math.random()*3|0);k++){ noise(dt,'highpass',5200+Math.random()*1800,5000,vol*(0.6+Math.random()*0.4),0.012,1.2,pan); dt+=0.014+Math.random()*0.022; }
}
/** One heartbeat, lub-dub. @param {number} v */
export function sfxHeart(v){ if(!state.actx||!state.soundOn)return; toneAt(0,'sine',62,38,0.11,0.42*v); toneAt(0.16,'sine',56,36,0.1,0.3*v); }
/** The tallow wick spitting. */
export function sfxCrackle(){ if(!state.actx||!state.soundOn)return; noise(0,'bandpass',1300+Math.random()*900,900,0.035,0.025); }
/** Newgate beyond the wall: a drip, a cough or keys far off. @param {number} kind 0 drip, 1 cough, 2 keys, 3 knocks */
export function sfxGaol(kind){
  if(!state.actx||!state.soundOn)return;
  if(kind===0) toneAt(0,'sine',1500,880,0.06,0.04);
  else if(kind===1){ noise(0,'bandpass',420,300,0.08,0.12,0.5); noise(0.22,'bandpass',380,280,0.06,0.1,0.5); }
  else if(kind===2) for(let k=0;k<4;k++) toneAt(k*0.07+Math.random()*0.03,'triangle',2400+Math.random()*700,2300,0.05,0.012);
  else for(let k=0;k<3;k++){ toneAt(k*0.42,'sine',90,50,0.14,0.5); noise(k*0.42,'lowpass',380,200,0.25,0.06,0.7); }
}

export function initialize(){


/* =====================================================================
   AUDIO (synth; nodes created only on events, never per frame)
   ===================================================================== */
state.actx = null;
state.master = null;
state.noiseBuf = null;
state.soundOn = true;
}
