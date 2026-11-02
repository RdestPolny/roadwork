// Mocap (.bvh, e.g. CMU or Mixamo via Blender) -> keyframes for the side-on boxer in src/animation.js.
//   node scripts/bvh-to-keys.mjs <file.bvh> [--punch=cross|jab] [--n=<index from --list>] [--step=3] [--ticks=30] [--list] [--json]
// Finds punches as peaks of the rear (cross) or lead (jab) hand's forward reach, takes the strongest one (or --n)
// and prints K(...) rows: GUARD plus the mocap change since the punch started, in the rig's pixels.
// Only the upper body, hips and rear heel are converted; footwork (STEP/ST/GX) stays as the move defines it.
import { readFile } from 'node:fs/promises';

const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--'));
const arg = (k, d) => (args.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] ?? d;
const flag = k => args.includes(`--${k}`);
if (!file) { console.error('usage: node scripts/bvh-to-keys.mjs <file.bvh> [--punch=cross|jab] [--n=index] [--step=ticks] [--list] [--json]'); process.exit(1); }

// Rig measures from src/appearance.js and the pose solve in src/boxing.js.
// A quarter turn of shoulders/hips is the hand-tuned CROSS peak (ROT 1.3, HROT 1.15).
const TORSO = 12.5, ARM = 8.5 + 9.0, QUARTER_ROT = 1.3, QUARTER_HROT = 1.15;
const GUARD = { BX: -1, BY: 0, LEAN: -0.5, ROT: 0, HROT: 0, HX: 0, HY: 0, LGX: 14, LGY: 2, RGX: 5, RGY: 4, HEEL: 0 };

/**
 * Parses a BVH file into joints (parent, offset, channels) and frames of channel values.
 * @param {string} text
 */
function parseBvh(text) {
  const tok = text.split(/\s+/).filter(Boolean), joints = [], stack = [];
  let i = 0, ch = 0;
  while (tok[i] !== 'MOTION') {
    const t = tok[i++];
    if (t === 'ROOT' || t === 'JOINT' || t === 'End') {
      const name = t === 'End' ? `${joints[stack.at(-1)].name}_end` : tok[i];
      i++;
      joints.push({ name, parent: stack.length ? stack.at(-1) : -1, offset: [0, 0, 0], channels: [], ch: 0 });
    } else if (t === '{') stack.push(joints.length - 1);
    else if (t === '}') stack.pop();
    else if (t === 'OFFSET') { joints[stack.at(-1)].offset = [+tok[i], +tok[i + 1], +tok[i + 2]]; i += 3; }
    else if (t === 'CHANNELS') {
      const j = joints[stack.at(-1)], n = +tok[i++];
      j.channels = tok.slice(i, i + n); j.ch = ch; ch += n; i += n;
    }
  }
  const frames = +tok[i + 2], dt = +tok[i + 5]; i += 6;
  const data = [];
  for (let f = 0; f < frames; f++, i += ch) data.push(tok.slice(i, i + ch).map(Number));
  return { joints, data, dt };
}

const mul = (a, b) => a.map((r, y) => [0, 1, 2].map(x => r[0] * b[0][x] + r[1] * b[1][x] + r[2] * b[2][x]));
const apply = (m, v) => m.map(r => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
/** @param {string} axis @param {number} deg */
function rot(axis, deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  return axis === 'X' ? [[1, 0, 0], [0, c, -s], [0, s, c]] : axis === 'Y' ? [[c, 0, s], [0, 1, 0], [-s, 0, c]] : [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

/**
 * World positions of every joint for one frame (rotations applied in the file's channel order).
 * @param {ReturnType<typeof parseBvh>['joints']} joints @param {number[]} row
 */
function pose(joints, row) {
  const pos = [], mat = [];
  joints.forEach((j, k) => {
    let p = [...j.offset], m = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    j.channels.forEach((c, n) => {
      const v = row[j.ch + n];
      if (c.endsWith('position')) p['XYZ'.indexOf(c[0])] += v; else m = mul(m, rot(c[0], v));
    });
    if (j.parent < 0) { pos[k] = p; mat[k] = m; return; }
    const o = apply(mat[j.parent], p);
    pos[k] = [pos[j.parent][0] + o[0], pos[j.parent][1] + o[1], pos[j.parent][2] + o[2]];
    mat[k] = mul(mat[j.parent], m);
  });
  return pos;
}

const { joints, data, dt } = parseBvh(await readFile(file, 'utf8'));
const find = (...names) => {
  const k = joints.findIndex(j => names.some(n => j.name.toLowerCase().replace(/^mixamorig:/, '') === n.toLowerCase()));
  if (k < 0) throw new Error(`no joint ${names.join('/')} in ${file}`);
  return k;
};
const J = {
  hips: find('Hips'), chest: find('Spine1', 'Spine2', 'Chest'), head: find('Head'),
  ls: find('LeftArm'), rs: find('RightArm'), lh: find('LeftHand'), rh: find('RightHand'),
  lu: find('LeftUpLeg'), ru: find('RightUpLeg'), lf: find('LeftFoot'), rf: find('RightFoot'), lfa: find('LeftForeArm'),
};
const P = data.map(row => pose(joints, row));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = v => Math.hypot(...v), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

// BVH is Y-up. The fighter faces away from his back: perpendicular to the hip line, measured per frame,
// because a mocap boxer circles and switches stance. Southpaw frames are mirrored to the game's orthodox stance.
const front = p => { const l = sub(p[J.lu], p[J.ru]), n = Math.hypot(l[0], l[2]) || 1; return [-l[2] / n, 0, l[0] / n]; };
const fwd = (v, F) => v[0] * F[0] + v[2] * F[2], side = (v, F) => v[0] * F[2] - v[2] * F[0];
const turn = (v, F) => Math.atan2(fwd(v, F), side(v, F)) / (Math.PI / 2);
const MIRROR = { ...J, ls: J.rs, rs: J.ls, lh: J.rh, rh: J.lh, lu: J.ru, ru: J.lu, lf: J.rf, rf: J.lf };
const shoulderMid = p => mid(p[J.ls], p[J.rs]);
const spine = P.reduce((s, p) => s + len(sub(shoulderMid(p), p[J.hips])), 0) / P.length;
const arm = len(sub(P[0][J.lfa], P[0][J.ls])) + len(sub(P[0][J.lh], P[0][J.lfa]));
const px = TORSO / spine, apx = ARM / arm;
const southpaw = p => fwd(sub(p[J.rf], p[J.lf]), front(p)) > 0;

/**
 * Rig parameters (absolute, before re-basing on GUARD) for one mocap frame seen along F.
 * @param {number[][]} p @param {number[]} F @param {typeof J} j joint roles (MIRROR for southpaw)
 */
function params(p, F, j) {
  const hip = p[j.hips], sm = mid(p[j.ls], p[j.rs]), sv = sub(sm, hip), shl = sub(p[j.ls], p[j.rs]), hpl = sub(p[j.lu], p[j.ru]);
  const handL = sub(p[j.lh], p[j.ls]), handR = sub(p[j.rh], p[j.rs]), head = sub(p[j.head], sm);
  return {
    BX: fwd(hip, F) * px, BY: -hip[1] * px,
    LEAN: 13 * Math.asin(Math.max(-1, Math.min(1, fwd(sv, F) / len(sv)))),
    ROT: -turn(shl, F) * QUARTER_ROT, HROT: -turn(hpl, F) * QUARTER_HROT,
    HX: fwd(head, F) * px, HY: -head[1] * px,
    LGX: fwd(handL, F) * apx, LGY: -handL[1] * apx, RGX: fwd(handR, F) * apx, RGY: -handR[1] * apx,
    HEEL: p[j.rf][1] * px,
  };
}

// Punches: frames where the rear (cross) or lead (jab) hand reaches furthest forward, at least 0.4 s apart.
const kind = arg('punch', 'cross'), hand = kind === 'jab' ? 'LGX' : 'RGX';
const reach = P.map(p => params(p, front(p), southpaw(p) ? MIRROR : J)[hand]);
const peaks = [];
for (let f = 1; f < reach.length - 1; f++) {
  if (reach[f] < reach[f - 1] || reach[f] < reach[f + 1]) continue;
  const lo = Math.min(...reach.slice(Math.max(0, f - 60), f));
  if (reach[f] - lo < 4) continue;
  const near = peaks.findIndex(k => Math.abs(k - f) < 0.4 / dt);
  if (near < 0) peaks.push(f); else if (reach[f] > reach[peaks[near]]) peaks[near] = f;
}
if (!peaks.length) { console.error(`no ${kind} found`); process.exit(1); }
if (flag('list')) {
  peaks.forEach((f, n) => console.log(`${n}: frame ${f} (${(f * dt).toFixed(2)} s) reach ${reach[f].toFixed(1)} px${southpaw(P[f]) ? ' (southpaw, mirrored)' : ''}`));
  process.exit(0);
}
const pick = arg('n', '') === '' ? peaks.reduce((a, b) => (reach[b] > reach[a] ? b : a)) : peaks[+arg('n')];

// The punch runs from the last still moment before the peak until the hand is back where it started.
const still = f => Math.abs(reach[Math.min(f + 1, reach.length - 1)] - reach[f]) < 0.02;
let a = pick, b = pick;
while (a > 0 && pick - a < 0.6 / dt && !(still(a) && reach[a] < reach[pick] - 4)) a--;
while (b < reach.length - 1 && b - pick < 0.8 / dt && reach[b] > reach[a] + 1) b++;

// One view and one stance for the whole punch, taken where it starts, so the body's turn shows as ROT/HROT.
const F = front(P[a]), roles = southpaw(P[a]) ? MIRROR : J, Q = P.map(p => params(p, F, roles));

// Keys every --step game ticks (60 Hz); the first and last are GUARD so the move blends in and out.
// --ticks squeezes the punch into the game's own duration (tempo is part of the balance).
const real = Math.round((b - a) * dt * 60), ticks = +arg('ticks', String(real)), step = +arg('step', '3'), keys = [];
for (let t = 0; t <= ticks; t += step) {
  const f = Math.min(b, a + Math.round(t / ticks * (b - a))), o = {};
  for (const k in GUARD) {
    let d = Q[f][k] - Q[a][k];
    if (k === 'ROT' || k === 'HROT') { const q = k === 'ROT' ? QUARTER_ROT : QUARTER_HROT; d = ((d / q + 6) % 4 - 2) * q; } // shortest way round
    const v = GUARD[k] + d;
    if (t && Math.abs(v - GUARD[k]) >= 0.05) o[k] = +v.toFixed(2);
  }
  keys.push({ t, o });
}
if (keys.at(-1).t !== ticks) keys.push({ t: ticks, o: {} });
keys.at(-1).o = {};
const apex = keys.reduce((m, k, n) => ((k.o[hand] ?? 0) > (keys[m].o[hand] ?? 0) ? n : m), 0);

if (flag('json')) { console.log(JSON.stringify({ keys, apex, ticks })); process.exit(0); }
console.log(`// ${file}: frames ${a}-${b} (${(a * dt).toFixed(2)}-${(b * dt).toFixed(2)} s, ${real} ticks) -> ${ticks} ticks, apex key ${apex}`);
console.log(`// scale: torso ${px.toFixed(3)} px/unit, arm ${apx.toFixed(3)} px/unit`);
keys.forEach(k => console.log(`   K(${k.t},state.E_LIN,${JSON.stringify(k.o).replace(/"/g, '')}),`));
