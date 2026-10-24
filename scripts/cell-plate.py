"""Bake the painted Ward fight backdrop (venue 'cell') into src/cell-plate.js.

  python3 -I scripts/cell-plate.py

Sources (art/cela/): `wzor.png` — the painting (1536x1024, convicts turned toward the fight), and its Codex edits
`pusto` (no convicts), `doping` / `doping2` (two cheering moments), `szept` (muttering to each other). The plate is the
painting with the convicts' places filled from `pusto`; each standing convict and each group of every edit is cut with Apple Vision
(the skill painted-pixel-assets: ~/.claude/skills/painted-pixel-assets/scripts/cut.py) and everything shares one
palette. The module holds the palette, the plate as palette indices and each layer as indices + alpha (base64).
"""
import base64, json, os, subprocess, sys
import numpy as np
from PIL import Image

W, H = 144, 96
ART = 'art/cela'
CUT = os.path.expanduser('~/.claude/skills/painted-pixel-assets/scripts/cut.py')
OUT = 'scratch/cela/layers'
# Each standing convict's box on the 144x96 grid, measured on the painting; neighbours never share a box. The cheering
# and muttering poses reach into the neighbours' room, so they are cut per group: the three on the left, the two on the right.
FIGS = [[1, 40, 15, 82], [15, 37, 30, 82], [30, 40, 47, 82], [112, 37, 130, 82], [130, 42, 144, 82]]
GROUPS = {'L': [0, 28, 60, 82], 'R': [96, 28, 144, 82]}
POSES = ['doping', 'doping2', 'szept']
COLOURS = 192


def main():
  spec = {'size': [W, H], 'reference': f'{ART}/wzor.png', 'out': OUT, 'layers': [
    *[{'name': f'stoi{i}', 'image': f'{ART}/wzor.png', 'cut': 'vision', 'boxes': [box]} for i, box in enumerate(FIGS)],
    *[{'name': pose + g, 'image': f'{ART}/{pose}.png', 'cut': 'vision', 'boxes': [box]} for pose in POSES for g, box in GROUPS.items()]]}
  os.makedirs(OUT, exist_ok=True)
  json.dump(spec, open(f'{OUT}/spec.json', 'w'), indent=1)
  subprocess.run([sys.executable, '-I', CUT, f'{OUT}/spec.json'], check=True)
  man = json.load(open(f'{OUT}/manifest.json'))['layers']

  small = lambda name: np.asarray(Image.open(f'{ART}/{name}.png').convert('RGB').resize((W, H), Image.LANCZOS)).astype(np.float64)
  base, empty = small('wzor'), small('pusto')
  # where any pose of any convict may stand: the plate shows the empty Ward there, softened at the edge
  m = np.zeros((H, W))
  layers = {}
  for name, L in man.items():
    rgba = np.asarray(Image.open(f'{OUT}/{L["file"]}').convert('RGBA')).astype(np.float64)
    layers[name] = (L, rgba)
    m[L['y']:L['y'] + L['h'], L['x']:L['x'] + L['w']] = np.maximum(m[L['y']:L['y'] + L['h'], L['x']:L['x'] + L['w']], rgba[..., 3] / 255)
  hard = m > 0.04
  for _ in range(2): hard = hard | np.roll(hard, 1, 0) | np.roll(hard, -1, 0) | np.roll(hard, 1, 1) | np.roll(hard, -1, 1)
  soft = hard.astype(np.float64)
  soft = (soft + np.roll(soft, 1, 0) + np.roll(soft, -1, 0) + np.roll(soft, 1, 1) + np.roll(soft, -1, 1)) / 5
  plate = base * (1 - soft[..., None]) + empty * soft[..., None]

  # one palette over the plate and every layer
  strip = [plate] + [rgba[..., :3] for _, rgba in layers.values()]
  hmax = max(s.shape[0] for s in strip)
  canvas = np.concatenate([np.pad(s, ((0, hmax - s.shape[0]), (0, 0), (0, 0)), mode='edge') for s in strip], 1).clip(0, 255).astype(np.uint8)
  q = Image.fromarray(canvas).quantize(COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
  pal = np.asarray(q.getpalette()[:COLOURS * 3]).reshape(-1, 3)
  idx = np.asarray(q)
  b64 = lambda a: base64.b64encode(np.ascontiguousarray(a, dtype=np.uint8).tobytes()).decode()
  x = W; out = {'w': W, 'h': H, 'pal': ['%02x%02x%02x' % tuple(c) for c in pal], 'plate': b64(idx[:H, :W]), 'layers': {}}
  for name, (L, rgba) in layers.items():
    h, w = rgba.shape[:2]
    out['layers'][name] = {'x': L['x'], 'y': L['y'], 'w': w, 'h': h, 'i': b64(idx[:h, x:x + w]), 'a': b64(rgba[..., 3].round())}
    x += w
  with open('src/cell-plate.js', 'w') as f:
    f.write('/* The painted Ward behind a cell fight, baked by scripts/cell-plate.py from art/cela/ (do not edit by hand):\n'
            '   a shared palette (hex), the plate as palette indices and each convict layer as indices + alpha, base64. */\n')
    f.write('export const CELL_PLATE = ' + json.dumps(out, separators=(',', ':')) + ';\n')
  print('src/cell-plate.js', os.path.getsize('src/cell-plate.js'), 'bytes,', len(out['layers']), 'layers')


main()
