// Floor plan of the Rope & Anchor's interior: the one source of truth for footprints (collisions in pub.js, art in pub-*.js).
// No imports, so every pub module can read it at load time.

/**
 * Room plan in ground units (1 unit ≈ 0.8 m; a person is ~17 height units, bar top 10, dining table 7.5).
 * i runs from the back-left wall (i=0: passage, piano, fireplace; the gallery above) to the street front (i=I, cut away, street door).
 * j runs from the back-right wall (j=0: stairs, back bar) to the front-left (j=J, cut away).
 * On screen: the corner i=0,j=0 is at the top; +i goes down-right, +j goes down-left.
 * Heights: wall H=46, the gallery floor and stair head at z=22 (a person walks under it), room doors up there ~z 22-39.
 * Boxes are [i0,j0,i1,j1] footprints on the floor; the art must stay inside them.
 */
export const PUB={
  I:12.5, J:11.5, H:46,
  door:{j0:4.9,j1:6.6},                                   // street door in the front wall i=I
  passage:{j0:3.9,j1:5.3,h:14},                           // open arched passage in wall i=0 to the next room (built later; not walkable yet)
  piano:{box:[0,5.75,.8,6.95]},                           // cottage piano against wall i=0, right beside the passage
  pianoStool:{i:1.2,j:6.35,r:.22},                        // round piano stool in front of it
  fire:{j0:7.0,j1:9.8,d:.9,hearth:1.75},                  // wide chimney breast in wall i=0 (projects to i=d), hearth stone out to i=hearth
  fireside:{box:[1.75,7.0,3.6,9.8]},                      // open floor before the fire: rug and low things only (z<=5), so the fire reads from the camera
  gallery:{box:[0,0,1.4,7.0],z:22,doors:[[1.6,2.6],[3.4,4.4],[5.2,6.2]]}, // hanging gallery along wall i=0 from the stair head to the chimney breast; floor top at z, room doors [j0,j1] in wall i=0
  stairs:{box:[1.4,0,4.8,1.3],top:22},                    // straight flight along wall j=0, foot at i=4.8 (z 0), head at i=1.4 onto the gallery (z=top)
  counter:{box:[5.0,2.4,11.0,3.2]},                       // long arm of the bar, its customer face looks to +j
  ret:{box:[5.0,.75,5.8,2.4]},                            // return arm of the bar, closing the back end of the servery
  backbar:{box:[5.8,0,11.0,.75]},                         // mirrored back fitting against wall j=0
  servery:[5.8,.75,11.0,2.4],                             // where the barman works (no player access)
  stools:[[5.6,4.0],[6.9,4.0],[8.2,4.0],[9.5,4.0],[10.8,4.0]], stoolR:.28,
  standing:[{i:4.4,j:7.4,r:.45},{i:6.1,j:7.4,r:.6},{i:8.0,j:7.4,r:.6},{i:9.9,j:7.4,r:.5}],
  dining:[{box:[10.2,9.75,12.2,10.75],axis:'i'},{box:[3.9,9.75,6.4,10.75],axis:'i'},{box:[7.1,9.75,9.6,10.75],axis:'i'}], // chairs only on the room side (j0-.55..j0)
  banquette:{box:[0,10.85,12.45,11.5],leg:[0,9.95,.65,10.85],back:8}, // one continuous buttoned leather banquette: the long run along the front-left wall j=J from wall i=0 to the front, and an L leg along wall i=0 (beside the fireplace) whose padded front faces the camera; back top z kept low so table tops stay visible
  coatStand:{i:11.95,j:8.1,r:.3},
  clock:{box:[11.6,0,12.3,.55]},                          // longcase clock against wall j=0 beyond the bar end
};
