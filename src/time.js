// @ts-check

/** @param {number} accumulator @param {number} elapsed @param {number} step @param {() => void} update */
export function advanceFixed(accumulator, elapsed, step, update) {
  if (!Number.isFinite(elapsed) || !Number.isFinite(accumulator) || !Number.isFinite(step) || step <= 0) throw new RangeError('Invalid clock interval');
  accumulator += Math.max(0, Math.min(250, elapsed));
  while (accumulator >= step) {
    accumulator -= step;
    update();
  }
  return accumulator;
}

/** @param {number} simulation @param {number} accumulator @param {number} lastWall @param {number} wall @param {boolean} paused */
export function inputTime(simulation, accumulator, lastWall, wall, paused) {
  return simulation + (paused ? 0 : accumulator + Math.max(0, Math.min(250, wall - lastWall)));
}
