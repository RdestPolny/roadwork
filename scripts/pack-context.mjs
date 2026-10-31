// Pack the current code of one topic into a single Markdown file for another AI, with an optional task at the top.
//   node scripts/pack-context.mjs --list
//   node scripts/pack-context.mjs walka-izo [--add=src/x.js,tests/y.test.js] [--task='Zaprojektuj…' | --task-file=brief.md] [--out=plik.md]
// Topics live in scripts/context-packs.json (title, intro, files, out). Missing files are skipped with a warning;
// encoded pictures (src/*-plate.js) are never packed.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { arg, root } from './lib/harness.mjs';

const packs = JSON.parse(await readFile(`${root}scripts/context-packs.json`, 'utf8'));
const topic = process.argv.slice(2).find(a => !a.startsWith('--'));
if (!topic || process.argv.includes('--list')) {
  for (const [k, p] of Object.entries(packs)) console.log(`${k.padEnd(22)} ${p.files.length} plików -> ${p.out}`);
  process.exit(topic || process.argv.includes('--list') ? 0 : 1);
}
const pack = packs[topic];
if (!pack) { console.error(`Nieznany temat "${topic}". Dostępne: ${Object.keys(packs).join(', ')}`); process.exit(1); }

const lang = { js: 'js', mjs: 'js', md: 'md', py: 'python', json: 'json', css: 'css', html: 'html' };
const files = [...new Set([...pack.files, ...arg('add', '').split(',').filter(Boolean)])].filter(f => {
  if (/-plate\.js$/.test(f)) { console.warn(`pomijam obraz zakodowany w JS: ${f}`); return false; }
  if (!existsSync(root + f)) { console.warn(`brak pliku, pomijam: ${f}`); return false; }
  return true;
});
const task = arg('task-file', '') ? await readFile(arg('task-file'), 'utf8') : arg('task', '');
const git = a => { try { return execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim(); } catch { return '?'; } };
const dirty = git(['status', '--porcelain', '--', ...files]).split('\n').filter(Boolean).length;

let md = `# ${pack.title}\n\nStan kodu: commit \`${git(['rev-parse', '--short', 'HEAD'])}\` (gałąź \`${git(['branch', '--show-current'])}\`)${dirty ? ` + ${dirty} plików z niezatwierdzonymi zmianami` : ''}, ${new Date().toISOString().slice(0, 10)}.\n\n${pack.intro}\n\n`;
if (task) md += `## Zadanie\n\n${task.trim()}\n\n`;
md += `Pliki: ${files.join(', ')}\n\n---\n\n`;
for (const f of files) {
  const src = await readFile(root + f, 'utf8'), fence = src.includes('````') ? '`````' : '````';
  md += `## \`${f}\`\n\n${fence}${lang[f.split('.').pop()] ?? ''}\n${src}${src.endsWith('\n') ? '' : '\n'}${fence}\n\n`;
}
const out = arg('out', pack.out);
await writeFile(out.startsWith('/') ? out : root + out, md);
console.log(`${out}: ${files.length} plików, ${(md.length / 1024).toFixed(0)} KB, ~${Math.round(md.length / 3.5 / 1000)}k tokenów`);
