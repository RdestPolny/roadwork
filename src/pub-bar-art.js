/* Fixed wooden bar and its fittings, drawn in the pub's world coordinates. */

/**
 * Draw the counter, shelves and their fittings.
 * @param {{box: Function, ln: Function, panel: Function, c: Object}} api
 * Drawing primitives and palette supplied by pub.js; all heights are world heights.
 */
export function drawPubBar({box, ln, panel, c}) {
 // A dark backing makes the glass and the shelf edges legible against the plaster.
 panel(.24,.035,8.4,2.83,.035,8.4,2.83,.035,18.4,.24,.035,18.4,c.bar);
 for (const i of [.24,1.08,1.94,2.83]) ln(i,.04,8.4,i,.04,18.4,c.wood);

 // Shelves have a deep top, a front rail and small brackets below.
 for (const z of [10,15]) {
  box(.25,.07,2.8,.49,z,z+.4,c.trim,c.wood,c.bar);
  ln(.25,.495,z+.16,2.8,.495,z+.16,c.dark);
  for (const i of [.42,1.48,2.55]) {
   box(i,.12,i+.12,.4,z-.7,z,c.wood,c.bar,c.dark);
  }
 }

 // Each bottle is built from a body, shoulder, neck, and a small stopper.
 const bottle=(i,j,z,w,h,color,label=false)=>{
  const d=w*.7, shoulder=h*.68, neck=w*.28;
  box(i,j,i+w,j+d,z,z+shoulder,color,color,c.dark);
  box(i+w*.12,j+d*.12,i+w*.88,j+d*.88,z+shoulder,z+h*.8,color,color,c.dark);
  box(i+(w-neck)/2,j+d*.32,i+(w+neck)/2,j+d*.68,z+h*.8,z+h,c.trim,color,c.dark);
  box(i+(w-neck)/2,j+d*.32,i+(w+neck)/2,j+d*.68,z+h,z+h+.16,c.gold,c.wood,c.dark);
  if(label) ln(i+w*.18,j+d+.005,z+shoulder*.48,i+w*.82,j+d+.005,z+shoulder*.48,c.paper);
 };
 const bottles=[
  [.34,.16,10.4,.22,2.35,c.glass,true], [.64,.15,10.4,.16,1.7,c.wood,false],
  [.88,.16,10.4,.25,2.05,c.dark,true], [1.24,.15,10.4,.18,2.6,c.glass,false],
  [1.51,.16,10.4,.27,1.8,c.wood,true], [1.9,.15,10.4,.19,2.3,c.glass,false],
  [2.2,.16,10.4,.26,1.65,c.dark,true], [2.53,.16,10.4,.14,2.15,c.wood,false],
  [.37,.15,15.4,.17,2.15,c.wood,false], [.62,.16,15.4,.25,1.7,c.glass,true],
  [.98,.15,15.4,.18,2.35,c.dark,false], [1.27,.16,15.4,.23,1.85,c.wood,true],
  [1.61,.15,15.4,.15,2.3,c.glass,false], [1.87,.16,15.4,.26,1.7,c.dark,true],
  [2.26,.15,15.4,.19,2.2,c.wood,false], [2.53,.16,15.4,.16,1.8,c.glass,false]
 ];
 for (const args of bottles) bottle(...args);

 // The carcass and overhanging worktop retain the original counter footprint.
 box(.1,.7,2.9,1.32,0,7.2,c.wood,c.bar,c.dark);
 box(.1,1.315,2.9,1.34,.45,1.05,c.trim,c.wood,c.dark);
 box(.1,1.315,2.9,1.34,6.3,6.85,c.trim,c.wood,c.dark);
 for (const [a,b] of [[.22,.78],[.91,1.47],[1.6,2.16],[2.29,2.78]]) {
  panel(a,1.345,1.25,b,1.345,1.25,b,1.345,6.05,a,1.345,6.05,c.wood);
  ln(a+.07,1.35,1.6,b-.07,1.35,1.6,c.trim);
  ln(a+.07,1.35,5.7,b-.07,1.35,5.7,c.trim);
  ln(a+.07,1.35,1.6,a+.07,1.35,5.7,c.trim);
  ln(b-.07,1.35,1.6,b-.07,1.35,5.7,c.trim);
 }
 box(.02,.62,3,1.4,7.2,8,c.top,c.wood,c.bar);
 ln(.08,1.35,7.8,2.94,1.35,7.8,c.trim);
 ln(.2,.7,8.01,2.8,.7,8.01,c.trim);
 // Closed lifting flap, outlined by joints and two brass hinge plates.
 ln(2.4,.63,8.02,2.4,1.39,8.02,c.dark);
 ln(2.94,.63,8.02,2.94,1.39,8.02,c.dark);
 ln(2.4,.64,8.02,2.94,.64,8.02,c.dark);
 ln(2.4,1.38,8.02,2.94,1.38,8.02,c.dark);
 for (const j of [.76,1.17]) {
  box(2.34,j,2.47,j+.12,8.02,8.09,c.gold,c.wood,c.dark);
  ln(2.4,j,8.1,2.4,j+.12,8.1,c.dark);
 }

 // Brass hand pump with a curved spout, handle, and a drip tray.
 box(1.75,.91,2.05,1.18,8,8.3,c.gold,c.wood,c.dark);
 box(1.84,.99,1.98,1.1,8.3,10.65,c.gold,c.wood,c.dark);
 box(1.8,.96,2.02,1.13,10.65,11,c.gold,c.wood,c.dark);
 ln(1.91,1.04,11,1.91,1.04,12.1,c.gold);
 ln(1.91,1.04,12.1,2.2,1.04,11.75,c.gold);
 ln(2.2,1.04,11.75,2.27,1.04,11.25,c.gold);
 ln(1.91,1.04,11.4,1.65,1.04,12.65,c.dark);
 box(1.57,.99,1.73,1.09,12.55,12.9,c.wood,c.dark,c.dark);
 box(2.08,1.06,2.46,1.25,8,8.12,c.cool,c.dark,c.dark);
 for (const i of [2.14,2.23,2.32,2.41]) ln(i,1.07,8.13,i,1.24,8.13,c.dark);

 // A squat jug and two mugs make the work surface feel used.
 box(.52,.95,.82,1.2,8,9.05,c.stone,c.wood,c.dark);
 box(.56,.98,.78,1.17,9.05,9.3,c.paper,c.stone,c.dark);
 ln(.5,1.01,8.25,.43,1.01,8.65,c.trim);
 ln(.43,1.01,8.65,.52,1.01,8.9,c.trim);
 for (const i of [1.03,1.31]) {
  box(i,1.02,i+.16,1.17,8,8.65,c.gold,c.wood,c.dark);
  ln(i+.16,1.08,8.18,i+.22,1.08,8.48,c.gold);
 }
}
