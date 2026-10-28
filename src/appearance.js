import { LOOK_DEFAULT, LOOK, GEAR_BY_ID, GEAR } from './data.js';

// Runtime values owned by appearance; initialized explicitly by main.js.
export const state = {};

export /* =====================================================================
   PALETTE (3-tone ramps: shadow, mid, highlight) + singles
   ===================================================================== */
function rgb(h){const n=parseInt(h.slice(1),16);return (0xff000000|((n&255)<<16)|(n&0xff00)|(n>>>16))>>>0;}

export function applyLook(look){
  for(const k in LOOK_DEFAULT) state.lk[k]=(LOOK[k].some(o=>o.id===look[k]))?look[k]:LOOK_DEFAULT[k];
  const sk=LOOK.skin.find(o=>o.id===state.lk.skin), hr=LOOK.hair.find(o=>o.id===state.lk.hair);
  setRamp(state.R_SKIN,sk.ramp,false); setRamp(state.R_SKINF,sk.ramp,true); setRamp(state.R_HAIR,hr.ramp,false);
  const sx6=skinExtra(sk.ramp); setRamp(state.R_SKX,sx6,false); setRamp(state.R_SKXF,sx6,true);
} // extra skin tones for the sculpted body: [deep shadow, shadow-mid, mid-light] derived from the 3-tone skin ramp,
// so every skin option keeps working. Deep shadow is cooler/redder (hue-shifted), mid-light a plain blend.
function skinExtra(r){
  const c=r.map(h=>{const n=parseInt(h.slice(1),16);return [n>>16,(n>>8)&255,n&255];}), hx=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  return [hx([c[0][0]*0.66,c[0][1]*0.52,c[0][2]*0.58+4]), hx(mix(c[0],c[1],0.5)), hx(mix(c[1],c[2],0.5))];
}

export function setRamp(slot,hex,far){
  for(let j=0;j<3;j++){ let c=rgb(hex[j]); if(far){ const r=c&255,g=(c>>8)&255,b=(c>>16)&255; c=(0xff000000|((b*0.72+6)<<16)|((g*0.66)<<8)|(r*0.64))>>>0; } state.PAL[slot*3+j]=c; }
}

export function applyGear(eq){   // eq = {trunks:id, gloves:id, boots:id}
  const t=GEAR_BY_ID[eq.trunks]||GEAR.trunks[0], g=GEAR_BY_ID[eq.gloves]||GEAR.gloves[0], b=GEAR_BY_ID[eq.boots]||GEAR.boots[0];
  setRamp(state.R_TRUNK,t.base,false); setRamp(state.R_TRUNKF,t.base,true); setRamp(state.R_TT,t.trim,false); setRamp(state.R_TTF,t.trim,true); setRamp(state.R_TA,t.acc,false); setRamp(state.R_TAF,t.acc,true);
  setRamp(state.R_GLOVE,g.base,false); setRamp(state.R_GLOVEF,g.base,true); setRamp(state.R_CUFF,g.cuff,false); setRamp(state.R_CUFFF,g.cuff,true); setRamp(state.R_GA,g.acc,false); setRamp(state.R_GAF,g.acc,true);
  setRamp(state.R_BOOT,b.base,false); setRamp(state.R_BOOTF,b.base,true); setRamp(state.R_BTR,b.trim,false); setRamp(state.R_BTRF,b.trim,true);
  state.trStyle=t.style; state.glStyle=g.style; state.btStyle=b.style;

}

export // recolor pixels of ramp `from` (any shade) inside a box to the same shade of ramp `to`, where test(x,y) is true
function rampIndex(c,rp){ return c===state.PAL[rp*3]?0:(c===state.PAL[rp*3+1]?1:(c===state.PAL[rp*3+2]?2:-1)); }

export function initialize(){

/* =====================================================================
   CONSTANTS
   ===================================================================== */
state.W = 144;
state.H = 96;
state.STEP_MS = 1000/60;

state.FLOOR_Y = 86;
state.BASE_X = 56;
state.HIP_Y0 = 66;

state.UPPER = 8.5;
state.FORE = 9.0;
state.THIGH = 11.0;
state.SHIN = 10.5;
state.TORSO = 12.5;
   // body proportions: long legs (wide crouch), longer torso, compact head
state.PIVX = 86;
state.PIVY = -2;

state.RAMPS = [
 ['#7a3f2b','#b86b45','#e59c6b'], // 0 skin (near)
 ['#4f271b','#83482f','#aa6a45'], // 1 skin (far)
 ['#162a7a','#2b4fd6','#6a8cff'], // 2 trunks
 ['#0f1c52','#1f3a9c','#3c5ccc'], // 3 trunks far
 ['#8a93b0','#e2e6f0','#ffffff'], // 4 trim / boots
 ['#5c6480','#a3abc4','#c9cfe0'], // 5 trim / boots far
 ['#6e0f1e','#c8182f','#ff4d5e'], // 6 glove
 ['#470a14','#8e1226','#c22f3e'], // 7 glove far
 ['#2b1810','#5c361e','#8c5830'], // 8 bag leather
 ['#110b0b','#1e1414','#3b2b2b'], // 9 hair
 ['#ffd23f','#ffffff','#ffffff'], // 10 hit flash
];

state.R_SKIN = 0;
state.R_SKINF = 1;
state.R_TRUNK = 2;
state.R_TRUNKF = 3;
state.R_TRIM = 4;
state.R_TRIMF = 5;
state.R_GLOVE = 6;
state.R_GLOVEF = 7;
state.R_BAG = 8;
state.R_HAIR = 9;
state.R_FLASH = 10;

// Gear ramp slots (written at runtime from the equipped items; *F = far/depth variant, auto-darkened)
state.R_TT = 11;
state.R_TTF = 12;
state.R_TA = 13;
state.R_TAF = 14;
state.R_BOOT = 15;
state.R_BOOTF = 16;
state.R_BTR = 17;
state.R_BTRF = 18;
state.R_CUFF = 19;
state.R_CUFFF = 20;
state.R_GA = 21;
state.R_GAF = 22;
state.R_SB = 23;
state.R_SBF = 24;
state.R_SHIRT = 25;
state.R_SHIRTF = 26;
state.R_APRON = 27;
state.R_PANT = 28;
state.R_PANTF = 29;
state.R_NPCS = 30;
state.R_NPCSF = 31;
state.R_NPCC = 32;
state.R_NPCCF = 33;
state.R_NPCK = 34;
state.R_NPCB = 35;
state.R_NPCP = 36;
state.R_NPCPF = 37;
state.R_HSH = 58;
state.R_HSHF = 59;
state.R_HPT = 60;
state.R_HPTF = 61;
state.R_HBELT = 62;
state.R_HSLIP = 63;
state.R_SKX = 64;
state.R_SKXF = 65;
state.N_RAMPS = 246;   // Keep shared palette offsets; 66–95: Ward inmates, 176–195: hooded walkers, 216: Śmierdziel.
state.PAL = new Uint32Array(state.N_RAMPS*3);

for(let i=0;i<state.RAMPS.length;i++)for(let j=0;j<3;j++)state.PAL[i*3+j]=rgb(state.RAMPS[i][j]);

state.lk = Object.assign({},LOOK_DEFAULT);

state.trStyle = 'stripe';
state.glStyle = 'classic';
state.btStyle = 'mid';

state.C_RED = rgb('#ff4d5e');
state.C_OUT = rgb('#0a0a12');
state.C_WALL = rgb('#151a2c');
state.C_WALL_LIT = rgb('#1f2640');
state.C_MORTAR = rgb('#0e1222');
state.C_MORTAR_LIT = rgb('#161c33');
state.C_FLOOR = rgb('#232842');
state.C_FLOOR2 = rgb('#1a1e34');
state.C_FLOOR_EDGE = rgb('#3a4163');
state.C_SHADOW = rgb('#0c0e1c');
state.C_CHAIN = rgb('#9aa0bb');
state.C_CHAIN2 = rgb('#4d536d');
state.C_STRAP = rgb('#1c100a');
state.C_PATCH = rgb('#d8c79e');
state.C_PATCH2 = rgb('#8a7a58');
state.C_BAGSPEC = rgb('#b27442');
state.C_WHITE = rgb('#ffffff');
state.C_SPARK = rgb('#ffd23f');
state.C_SWEAT = rgb('#7fe3ff');
state.C_DUST = rgb('#5a607f');
// shared props: steel (bars, rails, hooks), wood (bars, stools) and the dark meter lanes
state.C_STEEL = rgb('#8a90a8');
state.C_STEEL2 = rgb('#4d536d');
state.C_WOOD0 = rgb('#4a2c16');
state.C_WOOD1 = rgb('#7a4c28');
state.C_WOOD2 = rgb('#a8703e');
state.C_LANE = rgb('#0a0c17');
state.C_LANE2 = rgb('#141830');
state.C_GRAY = rgb('#8a93b0');
state.C_LAMP = rgb('#2b3150');
state.C_BULB = rgb('#fff3b0');
state.C_WIN = rgb('#15234a');
state.C_WIN2 = rgb('#2b4380');
state.C_DEBUG = rgb('#39ff7a');
}
