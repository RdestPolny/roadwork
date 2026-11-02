// Mocap (.bvh, e.g. CMU or Mixamo via Blender) -> a baked punch for the isometric fight rig (src/fighter-rig.js).
//   node scripts/bvh-to-rig.mjs <file.bvh> --list                     punches found (rear hand = cross, --punch=jab: lead hand)
//   node scripts/bvh-to-rig.mjs <file.bvh> [--n=<index>] > src/mocap-cross.js
// Takes the strongest punch (or --n), seen along the direction the fist travels, mirrored to an orthodox stance, and writes
// the joints of the upper body (pelvis at the origin; +x forward, +y the lead side, +z up) at fixed steps of the punch's
// progress: 0..1 from the start to contact, 1..2 from contact to the end of the recovery. The game puts the pose on the
// rig's own bone lengths with refitFigure(), so only the directions of the bones matter.
import { readFile } from 'node:fs/promises';
import { RIG, MOCAP_JOINTS as MJ } from '../src/fighter-rig.js';

const args = process.argv.slice(2), file = args.find(a => !a.startsWith('--'));
const arg = (k, d) => (args.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] ?? d;
const flag = k => args.includes(`--${k}`);
if (!file) { console.error('usage: node scripts/bvh-to-rig.mjs <file.bvh> [--punch=cross|jab] [--n=index] [--steps=8] [--list]'); process.exit(1); }

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
  hips: find(MJ.pel), abd: find(MJ.abd), chest: find(MJ.chest, 'Spine2'), head: find(MJ.head),
  ls: find(`Left${MJ.sh}`), rs: find(`Right${MJ.sh}`), le: find(`Left${MJ.el}`), re: find(`Right${MJ.el}`), lh: find(`Left${MJ.hd}`), rh: find(`Right${MJ.hd}`),
  lu: find(`Left${MJ.hip}`), ru: find(`Right${MJ.hip}`), lf: find(`Left${MJ.foot}`), rf: find(`Right${MJ.foot}`),
};
const MIRROR = { ...J, ls: J.rs, rs: J.ls, le: J.re, re: J.le, lh: J.rh, rh: J.lh, lu: J.ru, ru: J.lu, lf: J.rf, rf: J.lf };
const P = data.map(row => pose(joints, row));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = v => Math.hypot(...v), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];

// BVH is Y-up. A frame's front is perpendicular to its hip line (a mocap boxer circles and switches stance);
// southpaw frames are read with left and right swapped, so every punch comes out orthodox.
const flat = v => { const n = Math.hypot(v[0], v[2]) || 1; return [v[0] / n, 0, v[2] / n]; };
const front = p => { const l = sub(p[J.lu], p[J.ru]); return flat([-l[2], 0, l[0]]); };
const fwd = (v, F) => v[0] * F[0] + v[2] * F[2];
const southpaw = p => fwd(sub(p[J.rf], p[J.lf]), front(p)) > 0;
const roles = p => (southpaw(p) ? MIRROR : J);

// Punches: frames where the rear (cross) or lead (jab) fist is furthest in front of its shoulder, at least 0.4 s apart.
const kind = arg('punch', 'cross');
const reach = P.map(p => { const j = roles(p), F = front(p); return kind === 'jab' ? fwd(sub(p[j.lh], p[j.ls]), F) : fwd(sub(p[j.rh], p[j.rs]), F); });
const arm = len(sub(P[0][J.le], P[0][J.ls])) + len(sub(P[0][J.lh], P[0][J.le]));
const peaks = [];
for (let f = 1; f < reach.length - 1; f++) {
  if (reach[f] < reach[f - 1] || reach[f] < reach[f + 1]) continue;
  if (reach[f] - Math.min(...reach.slice(Math.max(0, f - 60), f)) < arm * 0.25) continue;
  const near = peaks.findIndex(k => Math.abs(k - f) < 0.4 / dt);
  if (near < 0) peaks.push(f); else if (reach[f] > reach[peaks[near]]) peaks[near] = f;
}
if (!peaks.length) { console.error(`no ${kind} found`); process.exit(1); }
if (flag('list')) {
  peaks.forEach((f, n) => console.log(`${n}: frame ${f} (${(f * dt).toFixed(2)} s) reach ${(reach[f] / arm).toFixed(2)} of the arm${southpaw(P[f]) ? ' (southpaw, mirrored)' : ''}`));
  process.exit(0);
}
const hit = arg('n', '') === '' ? peaks.reduce((a, b) => (reach[b] > reach[a] ? b : a)) : peaks[+arg('n')];

// The punch runs from the last still moment before contact until the fist is back where it started.
const still = f => Math.abs(reach[Math.min(f + 1, reach.length - 1)] - reach[f]) < arm * 0.002;
let a = hit, b = hit;
while (a > 0 && hit - a < 0.6 / dt && !(still(a) && reach[a] < reach[hit] - arm * 0.25)) a--;
while (b < reach.length - 1 && b - hit < 0.8 / dt && reach[b] > reach[a] + arm * 0.05) b++;

// One frame for the whole punch: forward is the way the fist travels to contact, so the turn of the body shows.
const j = roles(P[a]), F = flat(sub(P[hit][kind === 'jab' ? j.lh : j.rh], P[a][kind === 'jab' ? j.lh : j.rh])), L = [F[2], 0, -F[0]];
const scale = (RIG.lowerSpine + RIG.upperSpine) / (len(sub(P[a][j.abd], P[a][j.hips])) + len(sub(P[a][j.chest], P[a][j.abd])));
/** A mocap point in the rig's frame, relative to the pelvis. @param {number[][]} p frame @param {number[]} q point */
const at = (p, q) => { const v = sub(q, p[j.hips]); return [fwd(v, F), v[0] * L[0] + v[2] * L[2], v[1]].map(x => +(x * scale).toFixed(2)); };
// Each rig joint reads its mocap bone (MOCAP_JOINTS in src/fighter-rig.js).
const frame = p => [
  p[j.abd], p[j.chest], p[j.head], p[j.ls], p[j.le], p[j.lh], p[j.rs], p[j.re], p[j.rh]].flatMap(q => at(p, q));
const steps = +arg('steps', '8'), rows = [];
for (let n = 0; n <= steps * 2; n++) {
  const u = n / steps, f = u <= 1 ? a + (hit - a) * u : hit + (b - hit) * (u - 1);
  const f0 = Math.floor(f), f1 = Math.min(b, f0 + 1), w = f - f0, A = frame(P[f0]), B = frame(P[f1]);
  rows.push(A.map((v, i) => +(v + (B[i] - v) * w).toFixed(2)));
}

console.log(`// Generated by scripts/bvh-to-rig.mjs from ${file.split('/').pop()}, frames ${a}-${hit}-${b} (${(a * dt).toFixed(2)}-${(hit * dt).toFixed(2)}-${(b * dt).toFixed(2)} s).
// CMU Graphics Lab Motion Capture Database (mocap.cs.cmu.edu), free to use. Do not edit by hand: regenerate.

/** Joints per step: abdomen, chest, head, then [shoulder, elbow, fist] of the lead and the rear arm; pelvis at the origin. */
const STEPS=${steps}, ROWS=[
${rows.map(r => `  [${r.join(',')}]`).join(',\n')}];

/**
 * The baked ${kind} at progress u (0 = start, 1 = contact, 2 = end of the recovery), in the rig's frame relative to the pelvis:
 * +x forward, +y the lead side, +z up. Bones have the mocap's lengths; refitFigure() puts them on the rig's.
 * @param {number} u
 * @returns {{abd:number[],chest:number[],head:number[],lead:{sh:number[],el:number[],hd:number[]},rear:{sh:number[],el:number[],hd:number[]}}}
 */
export function mocap${kind[0].toUpperCase() + kind.slice(1)}(u){
  const x=Math.max(0,Math.min(2,u))*STEPS, i=Math.min(ROWS.length-2,Math.floor(x)), w=x-i, A=ROWS[i], B=ROWS[i+1];
  const p=(/** @type {number} */ k)=>[0,1,2].map(c=>A[k*3+c]+(B[k*3+c]-A[k*3+c])*w);
  return {abd:p(0),chest:p(1),head:p(2),lead:{sh:p(3),el:p(4),hd:p(5)},rear:{sh:p(6),el:p(7),hd:p(8)}};
}`);
