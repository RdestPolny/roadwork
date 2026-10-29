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
  const cargo=[[43.1,5.2,44.4,6.4],[48.5,5.2,50.3,6.5],
    [49,10.5,51.4,12.5],[40,11.5,41.25,12.5],
    [44.25,22.35,46.95,23.5]];
  if(cargo.some(r=>within(i,j,r))) return true;
  // A small margin stops the player walking off the end of the timber decking.
  if((i>42&&j>12.6)&&(!within(i,j,[42.55,12.6,51.45,24.5]))) return true;
  if((i>32.9&&i<39.5&&j>12.6)&&(!within(i,j,[33.45,12.6,38.95,15.75]))) return true;
  return false;
}
/** Static, non-interactive dock workers: every route returns to its origin. */
export const PORT_LIFE=[
  {id:'cooper-a',name:'Cooper / carrier A',at:[44.6,7.8],to:[47.6,8.6],cycle:420,shift:5,act:'barrel',tone:0},
  {id:'cooper-b',name:'Cooper / carrier B',at:[45.5,7.9],to:[48.5,8.7],cycle:420,shift:5,act:'barrel',tone:1},
  {id:'sailor',name:'Old sailor at pub terrace',at:[36,14.2],to:[36.25,14.3],cycle:520,shift:120,act:'pipe',tone:2},
  {id:'talk-a',name:'Dockworker outside pub',at:[32.5,8.3],to:[33.1,8.2],cycle:390,shift:75,act:'talk',tone:0},
  {id:'talk-b',name:'Second dockworker outside pub',at:[34.4,8.6],to:[35.2,8.5],cycle:460,shift:135,act:'talk',tone:1},
  {id:'landlord',name:'Pub keeper',at:[36.1,6.7],to:[36.4,7.55],cycle:610,shift:45,act:'wiping',tone:3},
  {id:'porter',name:'Handcart porter',at:[40.7,9.2],to:[45.6,9.7],cycle:640,shift:170,act:'cart',tone:0},
  {id:'clerk',name:'Warehouse tally clerk',at:[47.5,6.9],to:[48,7.3],cycle:480,shift:20,act:'ledger',tone:3},
  {id:'ropemaker',name:'Rigging mender',at:[49,9.7],to:[48.7,10.1],cycle:510,shift:240,act:'rope',tone:2},
  {id:'boatman',name:'Boat hook worker',at:[46.6,20.1],to:[46.8,21.3],cycle:445,shift:55,act:'boathook',tone:1},
  {id:'vendor',name:'Food seller',at:[40.2,10.7],to:[40.6,10.5],cycle:580,shift:180,act:'vendor',tone:3},
  {id:'resting',name:'Tired dock labourer',at:[51,8.45],to:[50.7,8.6],cycle:720,shift:300,act:'rest',tone:0},
  {id:'pierhand',name:'Timber tallyman',at:[50,16.6],to:[48.5,18.4],cycle:560,shift:390,act:'inspect',tone:2},
];
const blend=u=>{const v=Math.max(0,Math.min(1,u));return v*v*(3-2*v);};
/**
 * Loop with distinct travel / work / pause / return phases; no end-of-cycle
 * jump. Shifts stagger background behaviour independently of the player.
 */
export function portRoutine(t,npc){
  const u=(((t+npc.shift)%npc.cycle)+npc.cycle)%npc.cycle/npc.cycle;
  let along=0,stage='return';
  if(u<.25){along=blend(u/.25);stage='approach';}
  else if(u<.55){along=1;stage='work';}
  else if(u<.78){along=1;stage='rest';}
  else {along=1-blend((u-.78)/.22);stage='return';}
  const i=npc.at[0]+(npc.to[0]-npc.at[0])*along,j=npc.at[1]+(npc.to[1]-npc.at[1])*along;
  const dir=stage==='return'?-1:1, dx=(npc.to[0]-npc.at[0])*dir,dy=(npc.to[1]-npc.at[1])*dir;
  const length=Math.hypot(dx,dy)||1;
  return {i,j,stage,fi:dx/length,fj:dy/length,phase:u,walking:stage==='approach'||stage==='return'};
}
/** Geometric plan area, including only constructed surfaces (square tiles). */
export const PLAN_AREA=52*13+(51.8-42.2)*(25-13)+(39.3-33.1)*(16.2-13);
