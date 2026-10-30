/**
 * Presentation-only reaction to a punch in the abdomen. All values are continuous
 * between 0 and 1 before intensity is applied, so landing a blow never teleports
 * a joint. The stomach compresses first; the knees and protective elbows follow.
 *
 * No game rules, HP, stamina or animation clocks live here.
 */
export const BODY_HIT_SECONDS = 0.44;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (v) => { const t = clamp01(v); return t * t * (3 - 2 * t); };

/**
 * @param {number} remaining Seconds left in the visual reaction
 * @param {number} duration Duration assigned at contact
 * @param {number} [intensity] Strength of the visual response
 * @param {boolean} [blocked] Whether the blow landed on the guard
 * @returns {{fold:number,knees:number,cover:number}}
 */
export function bodyHitMotion(remaining, duration = BODY_HIT_SECONDS, intensity = 1, blocked = false) {
  if (!Number.isFinite(remaining) || remaining <= 0 || !Number.isFinite(duration) || duration <= 0) {
    return {fold:0, knees:0, cover:0};
  }
  const t = clamp01(1 - remaining / duration);
  const strength = clamp01(intensity / 1.55) * 1.55 * (blocked ? 0.55 : 1);
  return {
    // Tighten around the solar plexus quickly, then unroll without a snap.
    fold: strength * ease(t / 0.14) * (1 - ease((t - 0.34) / 0.66)),
    // The planted legs absorb the force slightly later than the abdomen.
    knees: strength * ease(t / 0.23) * (1 - ease((t - 0.46) / 0.54)),
    // Elbows instinctively shield the ribs and return after the chest opens.
    cover: strength * ease((t - 0.08) / 0.20) * (1 - ease((t - 0.56) / 0.44))
  };
}
