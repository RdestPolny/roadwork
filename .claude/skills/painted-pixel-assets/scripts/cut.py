"""Cut layers out of a reference painting and its edits, for any engine: RGBA PNGs cropped to their content plus a
manifest of where each one sits on the game grid.

  python3 -I cut.py spec.json            # writes <out>/<name>.png and <out>/manifest.json

spec.json:
{
  "size": [288, 192],                   # the game grid the pictures are brought down to
  "reference": "art/scene.webp",        # the painting; "reference" in "against" means this
  "out": "assets/scene",
  "palette": 200,                       # optional: one shared palette (median cut, no dither) over all layers
  "layers": [
    {"name": "bench-men", "image": "art/scene.webp", "cut": "vision", "boxes": [[0, 108, 112, 192]]},
    {"name": "legs-left", "image": "art/scene-step-left.png", "cut": "vision",
     "boxes": [[24, 38, 64, 158], [72, 38, 110, 158]], "fade_in_below": 80, "fade": 6, "minus": ["bench-men"]},
    {"name": "head-front", "image": "art/scene-head-front.png", "cut": "diff", "against": "reference",
     "threshold": 28, "boxes": [[234, 64, 266, 94]]},
    {"name": "plank", "image": "art/scene.webp", "cut": "vision", "boxes": [[0, 108, 112, 192]], "rows": [170, 179]}
  ]
}
cut: "vision" = Apple Vision subject mask of each box on the full-size picture (people, animals, organic things);
     "diff" = where the image differs from "against" by more than "threshold" (0-441), closed and opened (props, a
     turned head on an otherwise identical edit); "box" = the whole box.
Optional per layer: "rows" [y0, y1] keep only those rows; "fade_in_below" y + "fade" px soften the top edge (legs
under a separate upper body); "fade_out_above" y likewise for the bottom; "minus" [names] subtract earlier layers
(grown by 1 px); "against" may name an image path instead of "reference".
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))


def grow(m, n):
  for _ in range(abs(n)):
    shifted = [np.roll(np.roll(m, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
    m = np.logical_or.reduce(shifted) if n > 0 else np.logical_and.reduce(shifted)
  return m


def vmask_tool(tmp):
  tool, src = os.path.join(tmp, 'vmask'), os.path.join(HERE, 'vmask.swift')
  if not os.path.exists(tool) or os.path.getmtime(tool) < os.path.getmtime(src): subprocess.run(['swiftc', '-O', src, '-o', tool], check=True)
  return tool


def vision(full, boxes, W, H, tmp):
  """Soft subject alpha of each box (game-grid coordinates) of a full-size picture, on the game grid."""
  a = np.zeros((H, W)); kx, ky = full.width / W, full.height / H; tool = vmask_tool(tmp)
  for x0, y0, x1, y1 in boxes:
    crop = full.crop((round(x0 * kx), round(y0 * ky), round(x1 * kx), round(y1 * ky)))
    cin, cout = os.path.join(tmp, 'in.png'), os.path.join(tmp, 'out.png'); crop.save(cin)
    if subprocess.run([tool, cin, cout], capture_output=True).returncode: print('  no subject in', (x0, y0, x1, y1)); continue
    a[y0:y1, x0:x1] = np.asarray(Image.open(cout).convert('L').resize((x1 - x0, y1 - y0), Image.BOX)) / 255
  return a


def main():
  spec = json.load(open(sys.argv[1])); W, H = spec['size']; out = spec['out']; os.makedirs(out, exist_ok=True)
  tmp = os.path.join(out, '.vmask'); os.makedirs(tmp, exist_ok=True)
  load = lambda p: Image.open(spec['reference'] if p == 'reference' else p).convert('RGB')
  small = lambda im: np.asarray(im.resize((W, H), Image.LANCZOS)).astype(np.float64)
  yy = np.mgrid[0:H, 0:W][0]; alphas, pictures = {}, {}
  for L in spec['layers']:
    full = load(L['image']); pic = small(full); a = np.zeros((H, W)); boxmask = np.zeros((H, W), bool)
    for x0, y0, x1, y1 in L['boxes']: boxmask[y0:y1, x0:x1] = True
    if L['cut'] == 'vision': a = vision(full, L['boxes'], W, H, tmp)
    elif L['cut'] == 'diff':
      ref = small(load(L.get('against', 'reference'))); m = (np.sqrt(((pic - ref) ** 2).sum(2)) > L.get('threshold', 28)) & boxmask
      a = (grow(grow(grow(grow(m, 2), -2), -1), 1) & boxmask) * 1.0
    else: a = boxmask * 1.0
    if 'rows' in L: a = a * ((yy >= L['rows'][0]) & (yy < L['rows'][1]))
    if 'fade_in_below' in L: a = a * np.clip((yy - L['fade_in_below']) / L.get('fade', 4), 0, 1)
    if 'fade_out_above' in L: a = a * np.clip((L['fade_out_above'] - yy) / L.get('fade', 4), 0, 1)
    for other in L.get('minus', []): a = a * (1 - grow(alphas[other] > 0.05, 1))
    alphas[L['name']], pictures[L['name']] = a, pic
    print(L['name'], 'pixels', int((a > 0.06).sum()))
  if spec.get('palette'):   # one shared palette over every layer's pixels
    names = list(pictures); strip = np.concatenate([pictures[n] for n in names], 1).clip(0, 255).astype(np.uint8)
    q = Image.fromarray(strip).quantize(spec['palette'], method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    qa = np.asarray(q).astype(np.float64)
    for k, n in enumerate(names): pictures[n] = qa[:, k * W:(k + 1) * W]
  manifest = {'size': [W, H], 'layers': {}}
  for n, a in alphas.items():
    m = a > 0.06
    if not m.any(): continue
    ys, xs = np.where(m); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    rgba = np.dstack([pictures[n], a * 255])[y0:y1, x0:x1].clip(0, 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').save(os.path.join(out, n + '.png'))
    manifest['layers'][n] = {'file': n + '.png', 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0)}
  json.dump(manifest, open(os.path.join(out, 'manifest.json'), 'w'), indent=1)
  print(os.path.join(out, 'manifest.json'), len(manifest['layers']), 'layers')


main()
