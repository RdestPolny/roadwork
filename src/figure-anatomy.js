/**
 * Shared silhouette ratios for the 432x288 isometric figures.
 *
 * Joint positions, collision, reach and animation timings do not depend on
 * these render-only dimensions. Values are radii in legacy shape units, before
 * ISO_K scaling. Keep all characters on the same surface anatomy model.
 */
export const HEAD_SCALE = 0.76; // a head of about 1/6 of the height: mocap anatomy, a touch larger to read at pixel scale
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
    /* the head's whole frame: skull, face, hair and headgear grow together, so a larger skull never swallows its cap */
    headScale: HEAD_SCALE * b.head,
    headRadius: 1.75 * HEAD_SCALE * b.head,
    /* Cross-sections of a clothed mocap-proportioned man (chest about 0.21 of the height across, the coat included),
     * kept a little fuller than bare anatomy so a limb stays at least three pixels wide. */
    neckLower: .70 * b.neck,
    neckUpper: .60 * b.neck,
    clavicle: .80 * b.shoulders,
    shoulderCap: .90 * b.arms,
    upperArm: .85 * b.arms,
    elbow: .68 * b.arms,
    forearm: .72 * b.forearms,
    wrist: .50 * b.forearms,
    fist: .60 * b.forearms,
    pelvis: 1.65 * b.chest,
    waist: 1.42 * b.chest,
    ribs: 1.62 * b.chest,
    chest: 1.80 * b.chest,
    thigh: 1.08 * b.thighs,
    knee: .78 * b.thighs,
    calf: .82 * b.calves,
    ankle: .56 * b.calves,
    heel: .78,
    toe: .60,
    belly: 2.35 * b.belly,
    /** Fixtures on the torso (collar, buttons, pocket, belt) were placed on the former 2.2 chest: their forward and side offsets scale by this. */
    surface: 1.80 / 2.20,
  };
}

/** Accessory/face coordinates in the same reduced head frame as the skull. */
export function headDetailPoint(head, x, y, z) {
  return [head[0] + x * HEAD_SCALE, head[1] + y * HEAD_SCALE, head[2] + z * HEAD_SCALE];
}
