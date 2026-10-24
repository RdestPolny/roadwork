/* Roaches on the Ward's wall: pure rules of the drill (unit-tested). The kinds that run across the wall, where the
   knuckles land, and what a miss on each surface costs the hand. Drawing and state live in roaches.js / roach-scene.js. */

/**
 * @typedef {object} RoachKind
 * @property {string} id
 * @property {number} len     Body length in native pixels.
 * @property {number} wid     Body width.
 * @property {number} speed   Running speed, px per tick at stage speed ×1.
 * @property {number} stop    Chance to stop for a moment at each turn of its run.
 * @property {number} wiggle  How much the heading wanders while it runs.
 * @property {number} pts     Points for a kill.
 */
/** @type {Record<string,RoachKind>} */
export const KINDS = {
  black:{id:'black',len:7.8,wid:3.7,speed:0.42,stop:0.55,wiggle:0.1,pts:1},    // the black beetle: slow, stops often
  prusak:{id:'prusak',len:5.6,wid:2.6,speed:0.78,stop:0.14,wiggle:0.16,pts:1}, // small, pale, quick
  nymph:{id:'nymph',len:4.2,wid:2.3,speed:0.58,stop:0.25,wiggle:0.55,pts:1},   // half-transparent, zigzags
  big:{id:'big',len:9.8,wid:4.5,speed:1.02,stop:0.04,wiggle:0.05,pts:3},       // the big red one, straight across
};

/** Half-size of the knuckles' footprint on the wall (an ellipse round the aim point). */
export const KNUCKLES = {rx:5,ry:3.2};
/** A roach faster than this at the moment of contact is a kill on the run (+50% points). */
export const MOVING_V = 0.6;

/** Surfaces a fist can meet on the wall. */
export const SURFACE = /** @type {const} */ ({lime:0,brick:1,mortar:2,iron:3});
/** Pain and cooldown ticks (60 Hz) of a miss per surface. */
const MISS = [{pain:12,cool:70},{pain:18,cool:100},{pain:12,cool:70},{pain:30,cool:150}];
/** Pain of a hit: the roach's body takes the stone off the knuckles. */
export const HIT_PAIN = {clean:1,graze:3};
/** Pain falls this much per tick, faster once the hand has rested a second. */
export const PAIN_FADE = 2/60, PAIN_REST = 5/60;

/**
 * Where the knuckles meet a roach: 'clean' when most of the body lies under them, 'graze' when only an edge, a leg
 * or a feeler does, '' for a miss.
 * @param {number} ax @param {number} ay  Aim point.
 * @param {{x:number,y:number,a:number,kind:RoachKind}} r
 * @returns {''|'graze'|'clean'}
 */
export function roachContact(ax,ay,r){
  const K=r.kind, ca=Math.cos(r.a), sa=Math.sin(r.a);
  const inside=(/** @type {number} */ x,/** @type {number} */ y)=>((x-ax)/KNUCKLES.rx)**2+((y-ay)/KNUCKLES.ry)**2<=1;
  let cover=0;
  for(const f of [-0.45,-0.2,0,0.2,0.45]) if(inside(r.x+ca*f*K.len,r.y+sa*f*K.len)) cover++;
  if(cover>=3) return 'clean';
  if(cover>0) return 'graze';
  const side=K.wid*0.95, tip=K.len*0.5+1.8;
  for(const [u,v] of [[0,side],[0,-side],[tip,0.8],[tip,-0.8]]) if(inside(r.x+ca*u-sa*v,r.y+sa*u+ca*v)) return 'graze';
  return '';
}

/**
 * Pain and cooldown of a miss on a surface; a hand already at 90 recovers half as slowly again.
 * @param {number} surface One of SURFACE. @param {number} pain Pain before the blow (0–100).
 * @returns {{pain:number,cool:number}} The new pain and the cooldown in ticks.
 */
export function missCost(surface,pain){
  const m=MISS[surface]??MISS[0];
  return {pain:Math.min(100,pain+m.pain),cool:Math.round(m.cool*(pain>=90?1.5:1))};
}

/** Points of a kill. @param {RoachKind} kind @param {number} v Speed at contact. */
export function killPoints(kind,v){ return kind.pts*(v>MOVING_V?1.5:1); }
