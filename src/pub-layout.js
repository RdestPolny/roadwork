// Floor plan of the Rope & Anchor's interior: the one source of truth for footprints (collisions in pub.js, art in pub-*.js).
// No imports, so every pub module can read it at load time.

/**
 * Room plan in ground units (1 unit ≈ 0.8 m; a person is ~17 height units, bar top 10, dining table 7.5).
 * i runs from the back-left wall (i=0: fireplace, piano, kitchen door) to the street front (i=I, cut away, street door).
 * j runs from the back-right wall (j=0: stairs, back bar) to the front-left (j=J, cut away).
 * On screen: the corner i=0,j=0 is at the top; +i goes down-right, +j goes down-left.
 * Boxes are [i0,j0,i1,j1] footprints on the floor; the art must stay inside them.
 */
export const PUB={
  I:12.5, J:11.5, H:38,
  door:{j0:4.9,j1:6.6},                                   // street door in the front wall i=I
  kitchen:{j0:4.3,j1:5.7},                                // door to the kitchen in wall i=0
  piano:{box:[0,5.85,.8,7.15]},                           // cottage piano against wall i=0
  fire:{j0:7.3,j1:9.5,hearth:1.15},                       // chimney breast in wall i=0, hearth stone out to i=hearth
  stairs:{box:[.2,0,3.6,1.3],top:18},                     // straight flight along wall j=0, foot at i=3.6, landing at the back, z=top
  landingDoor:{j0:.15,j1:1.15},                           // door to the upstairs rooms in wall i=0 at the stair landing
  counter:{box:[4.0,2.4,10.6,3.2]},                       // long arm of the bar, its customer face looks to +j
  ret:{box:[4.0,.75,4.8,2.4]},                            // return arm of the bar, closing the back end of the servery
  backbar:{box:[4.8,0,10.6,.75]},                         // mirrored back fitting against wall j=0
  servery:[4.8,.75,10.6,2.4],                             // where the barman works (no player access)
  stools:[[4.9,4.0],[6.2,4.0],[7.5,4.0],[8.8,4.0],[10.1,4.0]], stoolR:.28,
  standing:[{i:4.4,j:7.4,r:.45},{i:6.1,j:7.4,r:.6},{i:8.0,j:7.4,r:.6},{i:9.9,j:7.4,r:.5}],
  dining:[{box:[2.0,8.4,3.1,10.9],axis:'j'},{box:[4.4,9.6,7.0,10.6],axis:'i'},{box:[8.1,9.6,10.7,10.6],axis:'i'}],
  coatStand:{i:11.95,j:8.1,r:.3},
  clock:{box:[11.6,0,12.3,.55]},                          // longcase clock against wall j=0 beyond the bar end
};
