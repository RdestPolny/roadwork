/**
 * Geography and deterministic background-life routes for the extended Wapping
 * district. No renderer imports: collision checks and cycles can be unit tested.
 * Coordinates deliberately preserve the old 0..30 by 0..13 port and its story.
 */
export const DISTRICT={
  quay:[0,0,52,13],
  pier:[42.2,13,51.8,25],
  shore:[31.5,13,39.3,18],
  pub:[30.9,0,39.5,5.9],
  store:[42.4,0,46.2,3.9],
  workshop:[46.65,0,52,4.5],
};
/** @param {number} i @param {number} j @param {number[]} r */
const within=(i,j,r)=>i>=r[0]&&j>=r[1]&&i<=r[2]&&j<=r[3];
/** Which ground surface exists at i,j? Null means river or off-map. @param {number} i @param {number} j */
export function portSurface(i,j){
  if(within(i,j,DISTRICT.quay)) return 'stone';
  if(within(i,j,DISTRICT.pier)) return 'pier';
  return null;
}
/** Extra collision only: the old port blockers are kept by thamesBlocked(). @param {number} i @param {number} j */
export function districtBlocked(i,j){
  if(!portSurface(i,j)) return true;
  if(i<30) return false;
  if(within(i,j,[47.25,17.45,50.05,20.05])) return true;
  if([DISTRICT.pub,DISTRICT.store,DISTRICT.workshop].some(r=>within(i,j,r))) return true;
  if(propBlocked(i,j)) return true;
  // A small margin stops the player walking off the end of the timber decking.
  if((i>42&&j>12.6)&&(!within(i,j,[42.55,12.6,51.45,24.5]))) return true;
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
  cat_crate:{i:45.40,j:20.60,w:1.3,d:1.3,h:4.5},
  pub_barrel_table_1:[32.65,8.75],
  pub_barrel_table_2:[37.95,7.8],
  pub_keeper_angle:2.25,
  pub_wall_lean:{i:33.95,j:6.42,a:0},
  pub_street_barrels:[[39.4,8.4],[39.5,9.2]],
  pub_musician:{i:40.2,j:6.7,a:.85},
  pub_musician_hat:[41.0,7.0],
  timber_workbench:{i0:47.3,j:7.9},
  timber_raw_stack:{i0:50.59,i1:51.13,j0:5.0,j1:7.4,along:'j',near:'i0'},
  timber_finished_stack:{i0:49.75,i1:51.8,j0:9.58,j1:10.14,along:'i',near:'j0'},
  timber_loading_spot:[48.1,4.85],
  timber_foreman:{i:46.95,j:8.25,a:-.74},
};
const CAT=ANCHORS.cat_crate;
/**
 * @typedef {{id:string, box?:number[], circle?:number[], pad?:number, block?:boolean, key?:number, art?:string}} PortProp
 * Fixed props of the port, the one list of where each stands. box [i0,j0,i1,j1] is the ground footprint the art stays inside,
 * circle [i,j,r] a round one; it blocks walking (pad widens the clearance) unless block is false. key is the prop's place in
 * the back-to-front order (an i+j); without it the footprint centre is used. Art: the draw function registered under the id
 * by thames-port.js or port-extension.js (see propDraws), or the module named in `art` when the prop is drawn with something else.
 */
/** @type {PortProp[]} */
export const PORT_PROPS=[
  // The old quay (0..30): clearance .2 round each footprint. Hand-tuned keys keep the draw order the scene was composed with.
  {id:'gate_barrels',box:[.5,.5,2.3,2.2],pad:.2,key:2},
  {id:'hoist',box:[4.55,1.65,5.65,2.75],pad:.2,key:7.3},
  {id:'smoker_crate',box:[2.1,9.9,3,10.8],pad:.2,key:12.9},
  {id:'police_van',box:[6.7,3.6,10.6,6.1],pad:.2,key:13},
  {id:'van_horses',box:[11,3.5,14,6.3],pad:.2,art:'police_van'},
  {id:'quay_crates',box:[5.6,9.7,9.55,10.85],pad:.2,key:16.3},
  {id:'warehouse_crates',box:[17.6,2.2,21.55,3.6],pad:.2,key:21.2},
  {id:'tarp_cargo',box:[21.6,1,24.6,3.6],pad:.2,key:25},
  {id:'crane_barrels',box:[20.85,3.95,22.5,5.6],pad:.2,key:25.6},
  {id:'sack_stack',box:[19.4,6.25,20.8,8.05],pad:.2,key:26.8},
  {id:'coal_sacks',box:[28.3,7.9,29.9,9.8],pad:.2,key:31.4},
  {id:'crane',box:[25.85,10.3,27.75,12.2],pad:.2,key:38.05},
  {id:'autumn_tree',circle:[27.65,1.7,.55],key:29.35},
  ...[2.2,8.5,16.5,21.8,28.2].map(i=>({id:'bollard',circle:[i,12.6,.36]})),
  // The Wapping extension (30..52).
  {id:'pub_side_barrels',box:[31.09,6.39,32.26,7.21],key:36.9},
  {id:'pub_street_barrels',box:[39.04,8.04,39.86,9.56],key:47.8},
  {id:'store_crates',box:[43.1,5.2,44.4,6.4],key:57.2},
  {id:'yard_crates',box:[49,10.5,51.4,12.5],key:61},
  {id:'yard_plank_stack',box:[48.5,11.4,51.1,12.65],key:59.2},
  {id:'pier_wagon',box:[44.25,22.35,46.95,23.5],art:'port-details.js'},
  // Furniture of the background life (drawn by port-scenes.js with the people who use it).
  {id:'pub_barrel_table_1',box:[32.2,8.3,33.1,9.2],art:'port-scenes.js'},
  {id:'pub_barrel_table_2',box:[37.5,7.35,38.4,8.25],art:'port-scenes.js'},
  {id:'fisher_bucket',box:[48.78,23.91,49.54,24.69],art:'port-scenes.js'},
  {id:'fisher_box',box:[49.87,23.55,50.43,23.91],art:'port-scenes.js'},
  {id:'cat_crate',box:[CAT.i-CAT.w/2,CAT.j-CAT.d/2,CAT.i+CAT.w/2,CAT.j+CAT.d/2],art:'port-scenes.js'},
  {id:'timber_workbench',box:[47.2,7.6,49.8,8.2],art:'port-scenes.js'},
  {id:'timber_raw_stack',box:[50.5,4.9,51.25,7.5],art:'port-scenes.js'},
  {id:'timber_finished_stack',box:[49.65,9.5,51.9,10.25],art:'port-scenes.js'},
];
/** Place of a prop in the back-to-front order: its hand-tuned key, else the i+j of its footprint centre. @param {PortProp} p */
export function propKey(p){
  if(p.key!==undefined) return p.key;
  if(p.circle) return p.circle[0]+p.circle[1];
  const b=/** @type {number[]} */ (p.box); return (b[0]+b[2]+b[1]+b[3])/2;
}
/** Does a fixed prop stand at i,j? @param {number} i @param {number} j */
export function propBlocked(i,j){
  return PORT_PROPS.some(p=>{
    if(p.block===false) return false;
    if(p.circle) return Math.hypot(i-p.circle[0],j-p.circle[1])<p.circle[2];
    const b=/** @type {number[]} */ (p.box), d=p.pad||0;
    return d?i>b[0]-d&&i<b[2]+d&&j>b[1]-d&&j<b[3]+d:within(i,j,b);
  });
}
/** [key, draw] pairs for the props whose art is in `art` (id -> draw(prop)), ready to sort with the moving people.
 * @param {Record<string,(p:PortProp)=>void>} art @returns {[number,()=>void][]} */
export function propDraws(art){
  for(const id in art) if(!PORT_PROPS.some(p=>p.id===id)) throw new Error(`port prop art without a footprint: ${id}`);
  return PORT_PROPS.filter(p=>art[p.id]).map(p=>[propKey(p),()=>art[p.id](p)]);
}
/** Geometric plan area, including only constructed surfaces (square tiles). */
export const PLAN_AREA=52*13+(51.8-42.2)*(25-13);
