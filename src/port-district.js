/**
 * Geography and deterministic background-life routes for the extended Wapping
 * district. No renderer imports: collision checks and cycles can be unit tested.
 * Coordinates deliberately preserve the old 0..30 by 0..13 port and its story.
 */
export const DISTRICT={
  quay:[0,0,52,13],
  pier:[42.2,13,51.8,25],
  terrace:[33.1,13,39.3,16.2],
  pub:[30.9,0,39.5,5.9],
  store:[42.4,0,46.2,3.9],
  workshop:[46.65,0,52,4.5],
};
const within=(i,j,r)=>i>=r[0]&&j>=r[1]&&i<=r[2]&&j<=r[3];
/** Which ground surface exists at i,j? Null means river or off-map. */
export function portSurface(i,j){
  if(within(i,j,DISTRICT.quay)) return 'stone';
  if(within(i,j,DISTRICT.pier)) return 'pier';
  if(within(i,j,DISTRICT.terrace)) return 'terrace';
  return null;
}
/** Extra collision only: the old port blockers are kept by thamesBlocked(). */
export function districtBlocked(i,j){
  if(!portSurface(i,j)) return true;
  if(i<30) return false;
  if([DISTRICT.pub,DISTRICT.store,DISTRICT.workshop].some(r=>within(i,j,r))) return true;
  // Stored freight, cooperage, wagon bay and the small hoist footprint.
  const cargo=[[43.1,5.2,44.4,6.4],
    [49,10.5,51.4,12.5],[40,11.5,41.25,12.5],
    [44.25,22.35,46.95,23.5]];
  if(cargo.some(r=>within(i,j,r))||LIFE_BLOCKS.some(r=>within(i,j,r))) return true;
  // A small margin stops the player walking off the end of the timber decking.
  if((i>42&&j>12.6)&&(!within(i,j,[42.55,12.6,51.45,24.5]))) return true;
  if((i>32.9&&i<39.5&&j>12.6)&&(!within(i,j,[33.45,12.6,38.95,15.75]))) return true;
  return false;
}
/** Raised timber decks stand this far above the quay setts (height units). */
export const DECK_Z=.25;
/** Fixed places of the background life (see port-life.js): where people stand and what they work with.
 * Fitted to the real geometry: walkable ground, clear of the pub door, the pier rails and the main quay passage. */
export const ANCHORS={
  pier_fishing_spot:{i:49.6,j:24.05,a:1.37},
  fisher_bucket:{i:49.16,j:24.3},
  fisher_box:{i:50.15,j:23.73,w:.55,d:.36,h:1.7},
  pier_peeing_spot:{i:51.20,j:21.80,a:0.0},
  cat_spot:{i:47.20,j:22.70,a:0.62},
  cat_crate:{i:45.40,j:20.60,w:.8,d:.8,h:4.5},
  pub_barrel_table_1:[32.65,8.75],
  pub_barrel_table_2:[37.95,7.8],
  pub_keeper_angle:2.25,
  pub_wall_lean:{i:33.95,j:6.42,a:0},
  timber_workbench:{i0:47.3,j:7.9},
  timber_raw_stack:{i0:50.59,i1:51.13,j0:5.0,j1:7.4,along:'j',near:'i0'},
  timber_finished_stack:{i0:49.75,i1:51.8,j0:9.58,j1:10.14,along:'i',near:'j0'},
  timber_loading_spot:[48.1,4.85],
  timber_foreman:{i:46.95,j:8.25,a:-.74},
};
/** Ground footprints of the new furniture: barrel tables, the fisherman's bucket and box, bench, bin, timber stacks and cat crate. */
const LIFE_BLOCKS=[
  [32.2,8.3,33.1,9.2],[37.5,7.35,38.4,8.25],
  [48.93,24.07,49.39,24.53],[49.87,23.55,50.43,23.91],
  [45.0,20.2,45.8,21.0],
  [47.2,7.6,49.8,8.2],[50.5,4.9,51.25,7.5],[49.65,9.5,51.9,10.25],
];
/** Geometric plan area, including only constructed surfaces (square tiles). */
export const PLAN_AREA=52*13+(51.8-42.2)*(25-13)+(39.3-33.1)*(16.2-13);
