import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = path => readFileSync(join(root, path), 'utf8');

test('Smithfield is a debug-only dynamic module, not a normal-game static dependency', () => {
  const src = readdirSync(join(root, 'src')).filter(n => n.endsWith('.js') && n !== 'work.js');
  for (const name of src) {
    const content = read('src/' + name);
    assert.doesNotMatch(content, /\b(?:import|export)\s+[^\n]*?from\s*['"]\.\/work\.js['"]/, 'static dependency in ' + name);
  }
  assert.match(read('src/main.js'), /if \(DEBUG\)\s*\{\s*const work = await import\('\.\/work\.js'\)/);
  assert.match(read('src/devtools.js'), /if\(!DEBUG\) return/);
  assert.doesNotMatch(read('src/prison.js'), /function workShift\(|function workDone\(/);
});

test('archived artwork and legacy design files do not appear in active source paths', () => {
  for (const name of ['ward-plate.js', 'yard-plate.js', 'cell-plate.js', 'cell-fight-scene.js']) {
    assert.equal(existsSync(join(root, 'src', name)), false, 'unexpected runtime source ' + name);
    assert.ok(existsSync(join(root, 'docs/archive/unused-assets', name)), 'missing archive ' + name);
  }
  for (const name of ['minigry-kontekst.md', 'walka-izo-kontekst.md', 'podciaganie-anatomia-kontekst.md']) {
    assert.equal(existsSync(join(root, name)), false);
    assert.ok(existsSync(join(root, 'docs/archive/context', name)));
  }
});

test('navigation links in canonical Markdown docs resolve locally', () => {
  const names = ['README.md', 'PRISON.md', 'NEWGATE.md', 'PERKI.md', 'CODEMAP.md',
    '.claude/skills/roadwork-scene-art/SKILL.md',
    '.claude/skills/roadwork-scene-art/references/side-scene.md'];
  for (const name of names) {
    const content = read(name);
    for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
      const link = match[1].split('#')[0];
      if (!link || /^(?:[a-z]+:|\/)/i.test(link)) continue;
      const full = resolve(root, dirname(name), decodeURIComponent(link));
      assert.ok(existsSync(full), 'broken link from ' + name + ' to ' + link);
    }
  }
});
