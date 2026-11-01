/* Small fire and lamp details for the Rope & Anchor's fixed room projection. */
import {rgb} from './appearance.js';
import {quad, isoLineThin, isoBox} from './gym.js';

const ink={stone:rgb('#746452'),stoneLight:rgb('#927b5d'),stoneDark:rgb('#54463a'),
 soot:rgb('#221c18'),sootWarm:rgb('#38251b'),ash:rgb('#706054'),iron:rgb('#302923'),
 wood:rgb('#4b3021'),woodLight:rgb('#765039'),ember:rgb('#aa4f25'),
 flame:rgb('#dc8034'),flameLight:rgb('#f0b35d'),gold:rgb('#d2a666'),
 lampShade:rgb('#816342'),lampGlass:rgb('#e1b875'),lampGlow:rgb('#a1835a')};

/** Draw a flat panel in world coordinates using the current room camera. */
function panel(a,b,c,d,e,f,g,h,i,j,k,l,color){
 quad(a,b,c,d,e,f,g,h,i,j,k,l,()=>color);
}

/** Draw the chimney breast, hearth, fuel, and gently flickering flames. */
export function drawPubFireplace(tick=0){
 const p=ink, j=.56, flick=Math.sin(tick*.08)>0?.25:0;
 const shift=1.7, originalPanel=panel, originalBox=isoBox, originalLine=isoLineThin;
 const wallPanel=(a,b,c,d,e,f,g,h,i,j,k,l,color)=>originalPanel(a+shift,b,c,d+shift,e,f,g+shift,h,i,j+shift,k,l,color);
 const wallBox=(a,b,d,e,...rest)=>originalBox(a+shift,b,d+shift,e,...rest);
 const wallLine=(a,b,c,d,e,f,color)=>originalLine(a+shift,b,c,d+shift,e,f,color);
 // Preserve the original breast and mantel footprint against the rear wall.
 wallBox(3.12,.03,4.5,.55,0,15,p.stone,p.stone,p.stoneDark);
 wallPanel(3.35,j,1,4.27,j,1,4.27,j,7,3.35,j,7,p.soot);
 // Soot-dark fireback and a low bed of ash give the opening depth.
 wallPanel(3.43,j+.005,1.15,4.19,j+.005,1.15,4.19,j+.005,5.9,3.43,j+.005,5.9,p.sootWarm);
 wallPanel(3.43,j+.01,1.15,4.19,j+.01,1.15,4.19,j+.01,1.55,3.43,j+.01,1.55,p.ash);
 // Uneven flames sit behind the logs; the small inner tongue moves less.
 wallPanel(3.52,j+.015,1.45,3.83,j+.015,1.45,3.76,j+.015,3.8+flick,3.62,j+.015,2.8,p.flame);
 wallPanel(3.79,j+.02,1.45,4.08,j+.02,1.45,3.99,j+.02,3.25+flick,3.87,j+.02,2.55,p.ember);
 wallPanel(3.66,j+.025,1.48,3.9,j+.025,1.48,3.82,j+.025,2.95+flick*.5,3.73,j+.025,2.25,p.flameLight);
 // Charred split logs and glowing edges, kept inside the existing opening.
 wallPanel(3.47,j+.03,1.32,3.97,j+.03,1.32,4.06,j+.03,1.78,3.56,j+.03,1.78,p.wood);
 wallPanel(3.7,j+.035,1.45,4.13,j+.035,1.45,4.05,j+.035,1.92,3.63,j+.035,1.92,p.woodLight);
 wallLine(3.54,j+.04,1.5,3.91,j+.04,1.5,p.ember);
 wallLine(3.78,j+.04,1.76,4.03,j+.04,1.76,p.ember);
 wallLine(3.43,j+.045,1.05,4.19,j+.045,1.05,p.iron);
 // Narrow hearth lip and stone joints anchor the opening in the masonry.
 wallBox(3.2,.54,4.42,.72,0,.48,p.stoneLight,p.stoneDark,p.stoneDark);
 for(const [i,z] of [[3.16,4.1],[4.31,3.4],[3.2,10.6],[4.18,12.2]])
  wallLine(i,.555,z,i+.16,.555,z,p.stoneDark);
 wallBox(3,0,4.62,.69,8,8.8,p.stoneLight,p.stone,p.stoneDark);
 wallLine(3.18,.695,8.24,4.45,.695,8.24,p.stoneDark);
}

/** Add a restrained warm glint to the existing rear-wall lamp. */
export function drawPubLamp(tick=0){
 const shift=-1.7, p=ink, glow=Math.sin(tick*.055)>-.2?p.lampGlass:p.gold;
 const originalPanel=panel, originalLine=isoLineThin;
 const wallPanel=(a,b,c,d,e,f,g,h,i,j,k,l,color)=>originalPanel(a+shift,b,c,d+shift,e,f,g+shift,h,i,j+shift,k,l,color);
 const wallLine=(a,b,c,d,e,f,color)=>originalLine(a+shift,b,c,d+shift,e,f,color);
 // The backing glints sit on the wall; the lamp itself remains at 5.95, .16.
 wallLine(5.69,.035,18,5.78,.035,18.35,p.lampGlow);
 wallLine(6.13,.035,18.35,6.22,.035,18,p.lampGlow);
 wallPanel(5.87,.17,17.3,6.03,.17,17.3,6.01,.17,18.65,5.89,.17,18.65,p.lampShade);
 wallPanel(5.91,.18,17.55,5.99,.18,17.55,5.99,.18,18.4,5.91,.18,18.4,glow);
 wallLine(5.87,.185,18.7,6.03,.185,18.7,p.gold);
}
