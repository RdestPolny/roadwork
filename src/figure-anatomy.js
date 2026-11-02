/**
 * Shared silhouette ratios for the 432x288 isometric figures.
 *
 * Joint positions, collision, reach and animation timings do not depend on
 * these render-only dimensions. Values are radii in legacy shape units, before
 * ISO_K scaling. Keep all characters on the same surface anatomy model.
 */
export const HEAD_SCALE = 0.90;
export const FIGURE_PART_CAPACITY = 64;

const bounded = (v, fallback) => Number.isFinite(v) && v > 0 ? Math.max(0.5, Math.min(2.5, v)) : fallback;

/**
 * Body geometry rather than motion: every radius controls an actual rendered
 * cross-section, so a thinner wrist cannot change reach or hand positions.
 * @param {{bodyType?:string,bulk?:Record<string,number>,bare?:boolean,waist?:number}} look
 */
export function figureProportions(look = {}) {
  const heavy = look.bodyType === 'heavy';
  const base = heavy
    ? {shoulders:1.26,arms:1.5,forearms:1.6,chest:1.3,belly:1.6,thighs:1.5,calves:1.4,neck:1.6,head:1.17}
    : {shoulders:1,arms:1,forearms:1,chest:1,belly:1,thighs:1,calves:1,neck:1,head:1};
  const b = {...base, ...(heavy ? look.bulk : {})};
  for (const key of Object.keys(base)) b[key] = bounded(b[key], base[key]);
  return {
    heavy,
    headScale: HEAD_SCALE,
    headRadius: 1.75 * HEAD_SCALE * b.head,
    neckLower: .82 * b.neck,
    neckUpper: .69 * b.neck,
    clavicle: .92 * b.shoulders,
    shoulderCap: 1.10 * b.arms,
    upperArm: 1.13 * b.arms,
    elbow: .87 * b.arms,
    forearm: .91 * b.forearms,
    wrist: .65 * b.forearms,
    fist: .74 * b.forearms,
    pelvis: 1.91 * b.chest,
    waist: 1.73 * b.chest,
    ribs: 1.96 * b.chest,
    chest: 2.20 * b.chest,
    thigh: 1.32 * b.thighs,
    knee: .98 * b.thighs,
    calf: 1.02 * b.calves,
    ankle: .72 * b.calves,
    heel: .91,
    toe: .72,
    belly: 2.35 * b.belly,
  };
}

/** Accessory/face coordinates in the same reduced head frame as the skull. */
export function headDetailPoint(head, x, y, z) {
  return [head[0] + x * HEAD_SCALE, head[1] + y * HEAD_SCALE, head[2] + z * HEAD_SCALE];
}
