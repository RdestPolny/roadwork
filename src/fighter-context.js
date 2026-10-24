// @ts-check

/** @typedef {Record<string, number>} FighterContext */
/** @typedef {{boxing:Record<string,number>,animation:Record<string,number>,sparring:Record<string,number>}} FighterSources */

// One named-field map is shared by capture and restore. Pose arrays remain preallocated on each fighter.
export const CONTEXT_FIELDS = {
  "boxing": [
    "state",
    "stateT",
    "frameIdx",
    "fired",
    "idleT",
    "curGrade",
    "buffered",
    "bufferTick",
    "bufferedGrade",
    "moveStep",
    "pgx",
    "pgy",
    "phx",
    "phy",
    "flashL",
    "flashR",
    "hipX",
    "hipY",
    "sx",
    "sy",
    "lsx",
    "lsy",
    "rsx",
    "rsy",
    "lex",
    "ley",
    "rex",
    "rey",
    "lgx",
    "lgy",
    "rgx",
    "rgy",
    "lgr",
    "rgr",
    "headX",
    "headY",
    "lhx",
    "lhy",
    "rhx",
    "rhy",
    "lkx",
    "lky",
    "rkx",
    "rky",
    "lax",
    "lay",
    "rax",
    "ray",
    "lhex",
    "lhey",
    "ltx",
    "lty",
    "rhex",
    "rhey",
    "rtx",
    "rty",
    "lTipRaw",
    "rTipRaw",
    "lSurf",
    "rSurf",
    "torsoX",
    "shDirX",
    "shDirY",
    "trX",
    "trY",
    "trVX",
    "trVY",
    "prevHX",
    "prevHY"
  ],
  "animation": [
    "moveRate",
    "posX"
  ],
  "sparring": [
    "aimLow",
    "nextLow",
    "idleOff"
  ]
};
const GROUPS = /** @type {const} */ (['boxing', 'animation', 'sparring']);

/** @param {FighterContext} context @param {FighterSources} sources */
export function saveFighterContext(context, sources) {
  for (const group of GROUPS) for (const key of CONTEXT_FIELDS[group]) context[key] = sources[group][key];
}

/** @param {FighterContext} context @param {FighterSources} sources */
export function loadFighterContext(context, sources) {
  for (const group of GROUPS) for (const key of CONTEXT_FIELDS[group]) sources[group][key] = context[key];
}
