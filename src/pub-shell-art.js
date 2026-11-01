/* The fixed, cutaway shell of the Rope & Anchor. Coordinates use pub ground units. */

/**
 * Paint the room shell before its furnishings.
 * @param {{fb: {fill: Function}, c: Object, panel: Function, ln: Function, box: Function}} api
 * World-space panel, line and box helpers share the signatures used by pub.js.
 */
export function drawPubShell({fb, c, panel, ln, box}){
 fb.fill(c.void);
 panel(0,0,0,8.6,0,0,8.6,6.9,0,0,6.9,0,c.floor);
 // Uneven boards catch warm light differently across the worn floor.
 for(const [a,b,d,e,col] of [
  [.05,.37,2.0,.81,c.floor2],[4.05,.85,6.4,1.29,c.floor2],
  [1.3,1.81,3.7,2.25,c.floor2],[5.6,2.77,8.55,3.21,c.floor2],
  [.05,3.73,2.6,4.17,c.floor2],[3.9,4.69,6.2,5.13,c.floor2],
  [.85,5.65,3.2,6.09,c.floor2],[6.0,6.13,8.55,6.57,c.floor2],
  [2.5,.85,3.9,1.29,c.wood],[6.8,3.73,8.55,4.17,c.wood],
  [.05,5.17,1.35,5.61,c.wood]
 ]) panel(a,b,.01,d,b,.01,d,e,.01,a,e,.01,col);
 // Long planks, staggered end joints and a few narrow highlights in the grain.
 for(let j=.35;j<6.9;j+=.48){
  ln(0,j,.02,8.6,j,.02,c.seam);
  const offset=(Math.floor(j*10)%3)*1.17;
  for(let i=offset+.8;i<8.6;i+=2.5)ln(i,j,.03,i,Math.min(j+.46,6.9),.03,c.floor2);
 }
 for(const [i,j,len] of [[.35,.58,.7],[2.1,4.4,.6],[3.3,5.35,.6],[5.7,3.9,.6],[7.2,5.8,.6],[6.9,1.65,.5],[1.4,5.85,.65]])
  ln(i,j,.04,i+len,j,.04,c.trim);
 // Rear walls rise to full height. The two street-facing walls remain cut away.
 panel(0,0,0,8.6,0,0,8.6,0,22,0,0,22,c.wall);
 panel(0,0,0,0,6.9,0,0,6.9,22,0,0,22,c.wall2);
 panel(0,0,0,8.6,0,0,8.6,0,5.5,0,0,5.5,c.wood);
 panel(0,0,0,0,6.9,0,0,6.9,5.5,0,0,5.5,c.bar);
 // Irregular plaster repairs and soot-softened edges break up the flat walls.
 panel(2.95,.006,15.5,3.42,.006,15.5,3.53,.006,19.6,3.08,.006,19.2,c.wall2);
 panel(5.65,.006,7.2,6.32,.006,7.2,6.25,.006,10.1,5.72,.006,10.4,c.wall2);
 panel(8.08,.006,16.5,8.58,.006,16.5,8.58,.006,20.3,8.2,.006,19.8,c.wall2);
 panel(.006,2.65,7,.006,3.5,7,.006,3.45,10.5,.006,2.72,10.2,c.wall);
 panel(.006,4.95,15,.006,5.8,15,.006,5.72,18.1,.006,5.02,18.5,c.wall);
 // Raised rails and individual wainscot panels give the timber a worked edge.
 for(let i=.5;i<8.6;i+=.85){
  ln(i,.01,.5,i,.01,5.4,c.trim);
  ln(i+.08,.01,1.1,Math.min(i+.68,8.55),.01,1.1,c.bar);
 }
 for(let j=.5;j<6.9;j+=.9){
  ln(.01,j,.5,.01,j,5.4,c.trim);
  ln(.01,j+.08,1.1,.01,Math.min(j+.72,6.85),1.1,c.wood);
 }
 ln(0,0,.45,8.6,0,.45,c.dark);ln(0,0,.45,0,6.9,.45,c.dark);
 ln(0,0,5.5,8.6,0,5.5,c.trim);ln(0,0,5.5,0,6.9,5.5,c.trim);
 ln(0,.01,5.15,8.6,.01,5.15,c.bar);ln(.01,0,5.15,.01,6.9,5.15,c.wood);
 // Fine marks in the plaster and a heavy beam along the side wall.
 for(const [i,z] of [[3.6,17],[5.2,9],[6.4,18],[8.2,11]])ln(i,.01,z,i+.25,.01,z+.15,c.wall2);
 for(const [j,z] of [[2.1,14],[4.3,18],[5.8,10]])ln(.01,j,z,.01,j+.22,z+.12,c.wall);
 box(0,0,.18,6.9,21.3,22,c.wood,c.bar,c.dark);
 ln(.19,.1,21.35,.19,6.8,21.35,c.trim);
 // The low front wall and threshold preserve the entrance opening.
 box(0,6.76,4.1,6.9,0,.55,c.stone,c.dark,c.dark);
 box(5.7,6.76,8.6,6.9,0,.55,c.stone,c.dark,c.dark);
 box(4.1,6.75,5.7,6.9,0,.25,c.cool,c.stone,c.stone);
 ln(4.2,6.78,.26,5.6,6.78,.26,c.paper);
 ln(4.1,6.8,.3,4.1,6.8,5,c.trim);ln(5.7,6.8,.3,5.7,6.8,5,c.trim);
 // A partly open door leaf turns back along the inside of the right jamb.
 // Its low cutaway retains the silhouette of the doorway without covering a figure.
 panel(5.65,6.72,.3,5.13,6.18,.3,5.13,6.18,4.5,5.65,6.72,4.5,c.wood);
 ln(5.65,6.72,.3,5.65,6.72,4.7,c.trim);
 ln(5.13,6.18,.3,5.13,6.18,4.5,c.trim);
 ln(5.13,6.18,4.5,5.65,6.72,4.5,c.trim);
 ln(5.22,6.27,1,5.53,6.6,1,c.bar);
 ln(5.22,6.27,3.8,5.53,6.6,3.8,c.bar);
 ln(5.24,6.29,1,5.24,6.29,3.8,c.bar);
 ln(5.2,6.25,2.65,5.27,6.32,2.65,c.gold);
 // Window sills and short jambs indicate the facade without hiding movement.
 for(const [a,b] of [[.8,2.05],[6.65,7.9]]){
  box(a,6.72,b,6.9,.55,1.05,c.trim,c.wood,c.dark);
  ln(a,6.76,1.05,a,6.76,3.1,c.trim);ln(b,6.76,1.05,b,6.76,3.1,c.trim);
  ln(a+.08,6.73,1.08,b-.08,6.73,1.08,c.paper);
 }
 // Service-room door, print and wall lamp.
 panel(6.9,.01,1,8.05,.01,1,8.05,.01,16,6.9,.01,16,c.dark);
 panel(7.05,.02,1,7.9,.02,1,7.9,.02,15,7.05,.02,15,c.wood);
 ln(7.18,.03,3,7.18,.03,13,c.trim);ln(7.75,.03,3,7.75,.03,13,c.trim);
 ln(7.18,.03,13,7.75,.03,13,c.trim);ln(7.18,.03,3,7.75,.03,3,c.bar);
 ln(7.72,.04,7,7.78,.04,7,c.gold);
 panel(3.3,.01,11.8,4.15,.01,11.8,4.15,.01,16.2,3.3,.01,16.2,c.dark);
 panel(3.35,.02,12,4.1,.02,12,4.1,.02,16,3.35,.02,16,c.paper);
 ln(3.45,.03,15,3.99,.03,15,c.wall2);ln(3.45,.03,14.4,3.9,.03,14.4,c.wall2);
 box(4.15,.05,4.35,.27,16,17,c.gold,c.wood,c.dark);
 ln(4.25,.16,17,4.25,.16,20,c.gold);
}
