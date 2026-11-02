// Mocap (.bvh, e.g. CMU or Mixamo via Blender) -> baked punches for the isometric fight rig (src/fighter-rig.js).
//   node scripts/bvh-to-rig.mjs --list <file.bvh>...        every punch found: kind, hand, frames and how it is held
//   node scripts/bvh-to-rig.mjs --trace <file.bvh>              both fists every 3 frames (forward, up from the shoulder)
//   node scripts/bvh-to-rig.mjs --take=jab:<file.bvh>:<contact frame> --take=cross:… … > src/mocap-punches.js
//   --take=hook:<file.bvh>:<start>-<contact>-<end>:<lead|rear>    a window chosen by hand (from --trace) for named clips
//   node scripts/bvh-to-rig.mjs --walk <in-place walk cycle.bvh> > src/mocap-walk.js   a looping walk for exploration
// A punch runs from the fist's last stop before its fastest stretch to contact (the fist furthest from the chest) and on
// until the fist is back near where it started. It is seen along the line from the chest to the fist at contact (the target), mirrored to an orthodox stance,
// and baked as the upper body's joints (pelvis at the origin; +x forward, +y the lead side, +z up) at fixed steps of the
// punch's progress: 0..1 to contact, 1..2 back. The game puts the pose on the rig's own bones with refitFigure(), so only
// the directions of the bones matter.
import { readFile } from 'node:fs/promises';
import { RIG, MOCAP_JOINTS as MJ } from '../src/fighter-rig.js';

const args = process.argv.slice(2), files = args.filter(a => !a.startsWith('--'));
const takes = args.filter(a => a.startsWith('--take=')).map(a => a.slice(7).split(':'));
const STEPS = 8, KINDS = ['jab', 'cross', 'hook', 'uppercut'];
if (!files.length && !takes.length) { console.error('usage: node scripts/bvh-to-rig.mjs --list <file.bvh>… | --take=<kind>:<file.bvh>:<frame>…'); process.exit(1); }

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

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], len = v => Math.hypot(...v), mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const flat = v => { const n = Math.hypot(v[0], v[2]) || 1; return [v[0] / n, 0, v[2] / n]; };
/** The lead side across F (Y-up: the left of a body facing F), flipped for a mirrored southpaw. @param {number[]} F @param {boolean} mirrored */
const side = (F, mirrored) => (mirrored ? [-F[2], 0, F[0]] : [F[2], 0, -F[0]]);
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b) || 1)))) * 180 / Math.PI;

/**
 * One clip: its frames' joint positions, the joint roles (MOCAP_JOINTS) and every punch found in it.
 * @param {string} file
 */
async function clip(file) {
  const { joints, data, dt } = parseBvh(await readFile(file, 'utf8'));
  const find = (...names) => {
    const k = joints.findIndex(j => names.some(n => j.name.toLowerCase().replace(/^mixamorig:/, '') === n.toLowerCase()));
    if (k < 0) throw new Error(`no joint ${names.join('/')} in ${file}`);
    return k;
  };
  // Mixamo splits the trunk in three (Spine, Spine1, Spine2): its ribcage is Spine2 and the abdomen Spine1.
  const spine = () => (joints.some(j => /(^|:)Spine2$/.test(j.name)) ? { abd: find('Spine1'), chest: find('Spine2') } : { abd: find(MJ.abd), chest: find(MJ.chest) });
  const J = {
    hips: find(MJ.pel), ...spine(), head: find(MJ.head),
    ls: find(`Left${MJ.sh}`), rs: find(`Right${MJ.sh}`), le: find(`Left${MJ.el}`), re: find(`Right${MJ.el}`), lh: find(`Left${MJ.hd}`), rh: find(`Right${MJ.hd}`),
    lu: find(`Left${MJ.hip}`), ru: find(`Right${MJ.hip}`), lf: find(`Left${MJ.foot}`), rf: find(`Right${MJ.foot}`),
    lk: find(`Left${MJ.knee}`), rk: find(`Right${MJ.knee}`),
  };
  const MIRROR = { ...J, ls: J.rs, rs: J.ls, le: J.re, re: J.le, lh: J.rh, rh: J.lh, lu: J.ru, ru: J.lu, lf: J.rf, rf: J.lf, lk: J.rk, rk: J.lk };
  const P = data.map(row => pose(joints, row));
  // BVH is Y-up. A boxer circles and switches stance: a frame whose right foot leads is read with left and right swapped.
  const front = p => { const l = sub(p[J.lu], p[J.ru]); return flat([-l[2], 0, l[0]]); };
  const roles = p => { const F = front(p), d = sub(p[J.rf], p[J.lf]); return d[0] * F[0] + d[2] * F[2] > 0 ? MIRROR : J; };
  const arm = len(sub(P[0][J.le], P[0][J.ls])) + len(sub(P[0][J.lh], P[0][J.le]));
  const punches = [];
  for (const left of [true, false]) {
    // The fist's speed relative to the chest, lightly smoothed; a punch is a burst between two near-stops.
    const rel = P.map(p => sub(p[left ? J.lh : J.rh], p[J.chest]));   // the anatomical hand; describe() decides lead or rear
    const v = rel.map((r, f) => (f ? len(sub(r, rel[f - 1])) / dt : 0)), sp = v.map((_, f) => (v[Math.max(0, f - 1)] + v[f] + v[Math.min(v.length - 1, f + 1)]) / 3);
    for (let f = 1; f < sp.length - 1; f++) {
      if (sp[f] < sp[f - 1] || sp[f] < sp[f + 1] || sp[f] < arm * 4) continue;
      let a = f, hit = f;
      while (a > 0 && sp[a - 1] < sp[a]) a--;
      while (hit < sp.length - 1 && sp[hit + 1] < sp[hit]) hit++;
      // Contact: the fist furthest from the chest between the burst and a little after the fist slows down.
      for (let g = f; g <= Math.min(sp.length - 1, hit + Math.round(0.1 / dt)); g++) if (len(rel[g]) > len(rel[hit])) hit = g;
      if (punches.some(q => q.left === left && q.hit === hit)) continue;
      const pk = describe(P, J, roles, left, a, hit, arm, dt);
      if (pk) punches.push({ file, left, ...pk });
    }
  }
  return { file, P, J, roles, arm, dt, punches: punches.sort((x, y) => x.hit - y.hit) };
}

/**
 * The punch from frame a to contact at frame hit, classified by the fist's path in the punch's own frame: forward with
 * a straight arm (jab with the lead hand, cross with the rear), across with the elbow up (hook), or up (uppercut).
 * Motions that are none of them (guard shifts, feints, or a punch the rules misread) are 'other'.
 */
function describe(P, J, roles, left, a, hit, arm, dt) {
  const j = roles(P[hit]), lead = j === J ? left : !left, hd = lead ? j.lh : j.rh, sh = lead ? j.ls : j.rs, el = lead ? j.le : j.re;   // stance at contact: the feet are set
  const F = flat(sub(P[hit][hd], P[a][j.chest])), L = side(F, j !== J);
  const loc = (p, q) => { const r = sub(q, p[j.chest]); return [r[0] * F[0] + r[2] * F[2], r[0] * L[0] + r[2] * L[2], r[1]]; };
  const s0 = loc(P[a], P[a][hd]), s1 = loc(P[hit], P[hit][hd]), d = sub(s1, s0), n = len(d);
  if (n < arm * 0.3) return null;
  const bend = angle(sub(P[hit][el], P[hit][sh]), sub(P[hit][hd], P[hit][el]));
  const elbowUp = (P[hit][el][1] - P[hit][sh][1]) / arm, shZ = loc(P[hit], P[hit][sh])[2];
  const across = (lead ? -d[1] : d[1]) / n;
  let kind = null;
  if (d[0] / n > 0.6 && bend < 45) kind = lead ? 'jab' : 'cross';
  else if (across > 0.45 && bend > 45 && bend < 130 && elbowUp > -0.2) kind = 'hook';
  else if (d[2] / n > 0.5 && bend > 45) kind = 'uppercut';
  // Back: the first frame after contact with the fist within a quarter of the punch's path of where it started.
  let b = hit;
  while (b < P.length - 1 && b - hit < 0.8 / dt && len(sub(loc(P[b], P[b][hd]), s0)) > n * 0.25) b++;
  return { kind: kind ?? 'other', lead, a, hit, b, guard: (s0[2] - shZ) / arm, contact: (s1[2] - shZ) / arm, reach: s1[0] / arm, bend };
}

if (args.includes('--walk')) {
  // One loop of an in-place walk, the whole body, at WALK_STEPS even steps of the cycle. The frame faces the body's mean front,
  // +y is the left side, z is up from the floor with the lowest ankle at the rig's foot height.
  const { P, J, dt } = await clip(files[0]), n = P.length - 1, WALK_STEPS = 24;   // the last frame repeats the first
  let fx = 0, fz = 0;
  for (const p of P) { const l = sub(p[J.lu], p[J.ru]); fx -= l[2]; fz += l[0]; }
  const F = flat([fx, 0, fz]), L = side(F, false);
  // Scaled by the legs: a walk is read from the legs, and Mixamo's short spine joints would make the body twice too big.
  const scale = (RIG.legUpper + RIG.legLower) / (len(sub(P[0][J.lk], P[0][J.lu])) + len(sub(P[0][J.lf], P[0][J.lk])));
  let cx = 0, cy = 0;
  for (const p of P) { cx += p[J.hips][0]; cy += p[J.hips][2]; }
  cx /= P.length; cy /= P.length;
  const loc = q => { const v = [q[0] - cx, q[1], q[2] - cy]; return [v[0] * F[0] + v[2] * F[2], v[0] * L[0] + v[2] * L[2], v[1]].map(x => x * scale); };
  const order = ['hips', 'abd', 'chest', 'head', 'lu', 'lk', 'lf', 'ls', 'le', 'lh', 'ru', 'rk', 'rf', 'rs', 're', 'rh'];
  const frames = P.slice(0, n).map(p => order.flatMap(k => loc(p[J[k]])));
  const floor = Math.min(...frames.flatMap(r => [r[6 * 3 + 2], r[12 * 3 + 2]])), lift = RIG.footHeight - floor;
  frames.forEach(r => { for (let i = 2; i < r.length; i += 3) r[i] += lift; });
  // Stride: while a foot carries the body it moves back under the hips at walking speed; its backward travel per cycle is
  // half a stride (one step), so the cycle covers twice the foot's stance sweep.
  const stance = (k) => { const ys = frames.map(r => r[k * 3 + 2]), xs = frames.map(r => r[k * 3]), low = Math.min(...ys);
    const on = xs.filter((_, i) => ys[i] < low + 0.25); return Math.max(...on) - Math.min(...on); };
  const STRIDE = +(stance(6) + stance(12)).toFixed(2);
  const rows = [];
  for (let i = 0; i < WALK_STEPS; i++) { const x = i / WALK_STEPS * n, a = Math.floor(x) % n, b = (a + 1) % n, w = x - Math.floor(x);
    rows.push(frames[a].map((v, c) => +(v + (frames[b][c] - v) * w).toFixed(2))); }
  console.log(`// Generated by scripts/bvh-to-rig.mjs --walk from ${files[0].split('/').slice(-2).join('/')} (${n} frames, ${(n * dt).toFixed(2)} s a cycle). Do not edit by hand.
// Adobe Mixamo (royalty-free in projects), exported in place as FBX and converted to BVH in Blender.

/** Distance the body travels in one walk cycle (two steps), in rig units: advance the phase by distance / WALK_STRIDE. */
export const WALK_STRIDE=${STRIDE};
/** ${WALK_STEPS} steps of one cycle: pelvis, abdomen, chest, head, then [hip, knee, ankle, shoulder, elbow, fist] of the left
 *  (+y) and the right side; x forward, z up from the floor. */
const STEPS=${WALK_STEPS}, ROWS=[
${rows.map(r => `  [${r.join(',')}]`).join(',\n')}];

/**
 * The walking body at phase g (cycles; any real number, it loops) as a figure pose: J(s) for side s (+1 left, -1 right) with
 * hip, knee, foot, sh, el, hd, plus J.pel, J.abd, J.chest, J.head. Bones have the mocap's lengths; figureHD() refits them.
 * @param {number} g
 */
export function mocapWalk(g){
  const x=(g-Math.floor(g))*STEPS, i=Math.floor(x)%STEPS, w=x-Math.floor(x), A=ROWS[i], B=ROWS[(i+1)%STEPS];
  const p=(/** @type {number} */ k)=>[0,1,2].map(c=>A[k*3+c]+(B[k*3+c]-A[k*3+c])*w);
  const side=(/** @type {number} */ o)=>({hip:p(o),knee:p(o+1),foot:p(o+2),sh:p(o+3),el:p(o+4),hd:p(o+5)}), L=side(4), R=side(10);
  return Object.assign((/** @type {number} */ s)=>s>0?L:R,{pel:p(0),abd:p(1),chest:p(2),head:p(3)});
}`);
  process.exit(0);
}

if (args.includes('--trace')) {
  for (const file of files) {
    const { P, J, roles, arm } = await clip(file);
    P.forEach((p, f) => {
      if (f % 3) return;
      const j = roles(p), l = sub(p[J.lu], p[J.ru]), F = flat([-l[2], 0, l[0]]);
      const fist = (h, s) => { const v = sub(p[h], p[s]); return `${((v[0] * F[0] + v[2] * F[2]) / arm).toFixed(2)},${(v[1] / arm).toFixed(2)}`; };
      console.log(`${f}\tlead ${fist(j.lh, j.ls)}\trear ${fist(j.rh, j.rs)}${j === J ? '' : '\t(southpaw)'}`);
    });
  }
  process.exit(0);
}

if (args.includes('--list')) {
  for (const file of files) {
    const c = await clip(file);
    for (const p of c.punches) console.log(`${file.split('/').pop()}:${p.hit}\t${p.kind.padEnd(8)} ${p.lead ? 'lead' : 'rear'}  ${p.a}-${p.hit}-${p.b}  fist at start ${p.guard.toFixed(2)}, at contact ${p.contact.toFixed(2)} arms above the shoulder, reach ${p.reach.toFixed(2)}, elbow ${p.bend.toFixed(0)}°`);
  }
  process.exit(0);
}

const clips = {}, baked = {};
for (const [kind, file, at, hand] of takes) {
  if (!KINDS.includes(kind)) throw new Error(`unknown punch ${kind}`);
  const c = clips[file] ??= await clip(file), p = at.includes('-')
    ? (([a, hit, b]) => ({ a, hit, b, lead: hand === 'lead' }))(at.split('-').map(Number))
    : c.punches.find(q => q.hit === +at);   // a named clip (Mixamo) may be 'other' by the rules: the take decides
  if (!p) throw new Error(`no punch with contact at frame ${at} in ${file} (see --list)`);
  const { P, roles } = c, j = roles(P[p.hit]), hd = p.lead ? j.lh : j.rh;
  // One frame for the whole punch: forward is the line from the chest to the fist at contact, so the body's turn shows.
  const F = flat(sub(P[p.hit][hd], P[p.a][j.chest])), L = side(F, j !== c.J);
  const scale = (RIG.lowerSpine + RIG.upperSpine) / (len(sub(P[p.a][j.abd], P[p.a][j.hips])) + len(sub(P[p.a][j.chest], P[p.a][j.abd])));
  const at3 = (q, o) => { const v = sub(q, o); return [v[0] * F[0] + v[2] * F[2], v[0] * L[0] + v[2] * L[2], v[1]].map(x => x * scale); };
  // Each rig joint reads its mocap bone (MOCAP_JOINTS in src/fighter-rig.js).
  const frame = q => [q[j.abd], q[j.chest], q[j.head], q[j.ls], q[j.le], q[j.lh], q[j.rs], q[j.re], q[j.rh]].flatMap(x => at3(x, q[j.hips]));
  const rows = [];
  for (let n = 0; n <= STEPS * 2; n++) {
    const u = n / STEPS, f = u <= 1 ? p.a + (p.hit - p.a) * u : p.hit + (p.b - p.hit) * (u - 1);
    const f0 = Math.floor(f), f1 = Math.min(p.b, f0 + 1), w = f - f0, A = frame(P[f0]), B = frame(P[f1]);
    rows.push(A.map((x, i) => +(x + (B[i] - x) * w).toFixed(2)));
  }
  (baked[kind] ??= {})[p.lead ? 'lead' : 'rear'] = { rows, src: `${file.split('/').slice(-2).join('/')} frames ${p.a}-${p.hit}-${p.b} (${p.lead ? 'lead' : 'rear'} hand)` };
}

console.log(`// Generated by scripts/bvh-to-rig.mjs. Do not edit by hand: regenerate.
// Clips: Adobe Mixamo (royalty-free in projects, exported as FBX and converted to BVH in Blender) or the CMU Graphics
// Lab Motion Capture Database (mocap.cs.cmu.edu, free to use).
${KINDS.flatMap(k => ['lead', 'rear'].filter(h => baked[k]?.[h]).map(h => `//   ${k}: ${baked[k][h].src}`)).join('\n')}

/** Per punch (jab, cross, hook, uppercut) and punching hand [lead, rear] (null = none baked): ${STEPS * 2 + 1} steps of the
 *  joints abdomen, chest, head, then [shoulder, elbow, fist] of the lead and the rear arm; pelvis at the origin. */
const STEPS=${STEPS}, PUNCHES=[
${KINDS.map(k => `  [ // ${k}\n${['lead', 'rear'].map(h => (baked[k]?.[h] ? `   [ // ${h}\n${baked[k][h].rows.map(r => `    [${r.join(',')}]`).join(',\n')}]` : `   null /* ${h} */`)).join(',\n')}]`).join(',\n')}];

/**
 * A baked punch at progress u (0 = start, 1 = contact, 2 = back), in the rig's frame relative to the pelvis: +x towards
 * the target, +y the lead side, +z up. Bones have the mocap's lengths; refitFigure() puts them on the rig's.
 * @param {number} pid 0 jab, 1 cross, 2 hook, 3 uppercut @param {boolean} lead thrown with the lead hand @param {number} u
 * @returns {{abd:number[],chest:number[],head:number[],lead:{sh:number[],el:number[],hd:number[]},rear:{sh:number[],el:number[],hd:number[]}}|null}
 */
export function mocapPunch(pid,lead,u){
  const R=PUNCHES[pid]?.[lead?0:1]; if(!R)return null;
  const x=Math.max(0,Math.min(2,u))*STEPS, i=Math.min(R.length-2,Math.floor(x)), w=x-i, A=R[i], B=R[i+1];
  const p=(/** @type {number} */ k)=>[0,1,2].map(c=>A[k*3+c]+(B[k*3+c]-A[k*3+c])*w);
  return {abd:p(0),chest:p(1),head:p(2),lead:{sh:p(3),el:p(4),hd:p(5)},rear:{sh:p(6),el:p(7),hd:p(8)}};
}`);
