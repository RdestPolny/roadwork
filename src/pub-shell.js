// Pub interior shell: floor, the two back walls with everything fixed on them, fireplace, and the room's light and haze.
// PLACEHOLDER — to be painted. Layout: src/pub-layout.js.
import { quad } from './gym.js';
import { rgb } from './appearance.js';
import { PUB } from './pub-layout.js';

/** Static layers baked once: floor, walls, fireplace, doors, wall decorations. */
export function pubShellStatic(){
  const P=PUB, floor=rgb('#4a3826'), wallI=rgb('#3f2f2a'), wallJ=rgb('#35302a'), dado=rgb('#2c1f17');
  quad(0,0,0,P.I,0,0,P.I,P.J,0,0,P.J,0,()=>floor);
  quad(0,0,0,0,P.J,0,0,P.J,P.H,0,0,P.H,(x,y)=>wallI);
  quad(0,0,0,P.I,0,0,P.I,0,P.H,0,0,P.H,(x,y)=>wallJ);
  quad(.03,0,0,.03,P.J,0,.03,P.J,9,.03,0,9,()=>dado);
  quad(0,.03,0,P.I,.03,0,P.I,.03,9,0,.03,9,()=>dado);
  quad(.04,P.fire.j0,0,.04,P.fire.j1,0,.04,P.fire.j1,14,.04,P.fire.j0,14,()=>rgb('#5a5048'));
}
/** Free-standing shell props drawn in depth order (e.g. hanging lamps): {box,draw}. */
export function pubShellProps(/** @type {number} */t){ return []; }
/** Per-frame effects after all props: fire, lamp glow, tobacco haze, vignette. */
export function pubShellFX(/** @type {number} */t){}
