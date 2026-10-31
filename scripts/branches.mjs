// What is NOT in the version you are running here? Lists branches (local and origin/*) with commits missing from HEAD,
// worktrees with uncommitted work, and files those branches change that you also have uncommitted here.
//   node scripts/branches.mjs [--fetch] [--files]     --fetch updates origin/* first, --files lists each branch's files
import { execFileSync } from 'node:child_process';
import { flag, root } from './lib/harness.mjs';

const git = (...a) => execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const lines = s => s.split('\n').filter(Boolean);
if (flag('fetch')) git('fetch', '--prune', '--quiet');

const head = git('branch', '--show-current') || git('rev-parse', '--short', 'HEAD');
const dirty = new Set(lines(git('status', '--porcelain')).map(l => l.slice(3)));
const base = git('rev-parse', '--verify', '--quiet', 'origin/main') ? 'origin/main' : 'main';
const [behindBase, aheadBase] = git('rev-list', '--left-right', '--count', `${base}...HEAD`).split(/\s+/).map(Number);
console.log(`Tutaj: ${head}  (${aheadBase} commitów ponad ${base}, ${behindBase} commitów z ${base} brakuje)  niezatwierdzone pliki: ${dirty.size}`);
const localMain = git('rev-list', '--left-right', '--count', `main...${base}`).split(/\s+/).map(Number);
if (base !== 'main' && localMain[1]) console.log(`  uwaga: lokalny main jest ${localMain[1]} commitów za ${base}`);

const refs = lines(git('for-each-ref', '--format=%(refname:short)', 'refs/heads', 'refs/remotes/origin'))
  .filter(r => r !== head && r !== 'origin/HEAD' && r !== 'origin');
const rows = [];
for (const r of refs) {
  const missing = Number(git('rev-list', '--count', `HEAD..${r}`));
  if (!missing) continue;
  const files = lines(git('diff', '--name-only', `HEAD...${r}`)), clash = files.filter(f => dirty.has(f));
  const inBase = Number(git('rev-list', '--count', `${base}..${r}`)) === 0;
  rows.push({ r, missing, files, clash, inBase, when: git('log', '-1', '--format=%cs', r), subj: git('log', '-1', '--format=%s', r) });
}
rows.sort((a, b) => b.when.localeCompare(a.when));
console.log(rows.length ? `\nGałęzie z commitami, których tu NIE ma (${rows.length}):` : '\nNie brakuje tu commitów z żadnej gałęzi.');
for (const x of rows) {
  console.log(`  ${x.r.padEnd(52)} ${String(x.missing).padStart(3)} brakujących  ${x.when}  ${x.inBase && x.r !== base ? '[już w ' + base + ']' : ''}${x.clash.length ? ` [te pliki masz też zmienione lokalnie: ${x.clash.join(', ')}]` : ''}`);
  console.log(`  ${''.padEnd(52)} ${x.files.length} plików · ostatni: ${x.subj.slice(0, 70)}`);
  if (flag('files')) for (const f of x.files) console.log(`      ${f}`);
}

const trees = git('worktree', 'list', '--porcelain').split('\n\n').filter(Boolean).map(b => Object.fromEntries(lines(b).map(l => [l.split(' ')[0], l.slice(l.indexOf(' ') + 1)])));
const other = trees.filter(t => t.worktree !== root.replace(/\/$/, ''));
if (other.length) console.log(`\nInne worktree (${other.length}):`);
for (const t of other) {
  let n = '?'; try { n = lines(execFileSync('git', ['status', '--porcelain'], { cwd: t.worktree, encoding: 'utf8' })).length; } catch { n = 'niedostępny'; }
  console.log(`  ${t.worktree}  [${(t.branch || '').replace('refs/heads/', '') || 'detached'}]  niezatwierdzone: ${n}`);
}
