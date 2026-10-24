"""Look at painted assets: shrink a reference, grid a crop, compare edits, test a Vision cut, show baked layers on
magenta, compare a render with the reference, map what changes between rendered frames.

  check.py shrink  <image> --size=288x192 --out=artifacts/tmp/ref             # game-size picture (200 colours) + 3x preview
  check.py grid    <image> --box=x0,y0,x1,y1 [--size=288x192] [--bright] --out=artifacts/tmp/g.png
  check.py sheet   <image> <image>... --box=x0,y0,x1,y1 [--size=288x192] --out=artifacts/tmp/s.png   # same crop of each
  check.py cut     <image> --box=x0,y0,x1,y1 [--size=288x192] --out=artifacts/tmp/c.png  # Apple Vision cut on magenta
  check.py layers  <manifest.json | plate.js> --out=artifacts/tmp/layers.png  # every layer on magenta (cut.py output or a JS plate)
  check.py compare <frames> --frame=0 --ref=<image> [--box=0,0,288,192] --out=artifacts/tmp/cmp.png   # render vs reference
  check.py motion  <frames> --out=artifacts/tmp/motion.png                     # red = changed since the previous frame

Boxes are in game-grid pixels (--size, default 288x192). <frames> is either several frame PNGs (any size, brought to
--size) or one contact sheet: --cols (default 2), --frame-size (default 576x384), --gap (label row under each frame,
default 20) describe its layout.
"""
import base64, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
MAGENTA = np.array([255, 0, 255])


def opt(name, default=None):
  for a in sys.argv:
    if a.startswith('--%s=' % name): return a.split('=', 1)[1]
    if a == '--' + name: return True
  return default


def size():
  w, h = (opt('size', '288x192')).split('x'); return int(w), int(h)


def box():
  return tuple(int(v) for v in opt('box').split(','))


def game(path):
  return Image.open(path).convert('RGB').resize(size(), Image.LANCZOS)


def zoom(im, k):
  return im.resize((im.width * k, im.height * k), Image.NEAREST)


def save(im):
  out = opt('out'); os.makedirs(os.path.dirname(out) or '.', exist_ok=True); im.save(out); print(out, im.size)


def frames(_=None):
  """Frames given as several PNGs or as one contact sheet, brought back to the game grid."""
  paths = [a for a in sys.argv[2:] if not a.startswith('--')]
  if len(paths) > 1: return [Image.open(p).convert('RGB').resize(size(), Image.NEAREST) for p in paths]
  im = Image.open(paths[0]).convert('RGB'); cols = int(opt('cols', 2)); fw, fh = (int(v) for v in opt('frame-size', '576x384').split('x'))
  n = int(opt('frames', 99)); gap = int(opt('gap', 20)); out = []
  for k in range(n):
    x, y = (k % cols) * fw, (k // cols) * (fh + gap)
    if y + fh > im.height: break
    out.append(im.crop((x, y, x + fw, y + fh)).resize(size(), Image.NEAREST))
  return out


def vmask(crop):
  tmp = os.path.join('scratch', 'painted-assets', 'vmask'); os.makedirs(tmp, exist_ok=True)
  tool = os.path.join(tmp, 'vmask'); src = os.path.join(HERE, 'vmask.swift')
  if not os.path.exists(tool) or os.path.getmtime(tool) < os.path.getmtime(src): subprocess.run(['swiftc', '-O', src, '-o', tool], check=True)
  cin, cout = os.path.join(tmp, 'in.png'), os.path.join(tmp, 'out.png'); crop.save(cin)
  r = subprocess.run([tool, cin, cout], capture_output=True, text=True)
  if r.returncode: sys.exit('Vision found no subject: ' + r.stderr.strip())
  return Image.open(cout).convert('L')


def cmd_shrink():
  im = game(sys.argv[2]); q = im.quantize(200, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
  base = opt('out'); q.save(base + '.png'); zoom(q, 3).save(base + '_x3.png'); print(base + '.png', base + '_x3.png')


def cmd_grid():
  im = game(sys.argv[2])
  if opt('bright'): im = im.point([min(255, int(255 * (i / 255) ** 0.5)) for i in range(256)] * 3)
  x0, y0, x1, y1 = box(); k = int(opt('scale', 8)); c = zoom(im.crop((x0, y0, x1, y1)), k); g = ImageDraw.Draw(c)
  for x in range(x0, x1):
    if x % 4 == 0: g.line([((x - x0) * k, 0), ((x - x0) * k, c.height)], fill=(255, 60, 60) if x % 8 == 0 else (110, 30, 30))
    if x % 8 == 0: g.text(((x - x0) * k + 2, 2), str(x), fill=(255, 255, 0))
  for y in range(y0, y1):
    if y % 4 == 0: g.line([(0, (y - y0) * k), (c.width, (y - y0) * k)], fill=(60, 255, 60) if y % 8 == 0 else (30, 110, 30))
    if y % 8 == 0: g.text((2, (y - y0) * k + 2), str(y), fill=(0, 255, 255))
  save(c)


def full_crop(path):
  im = Image.open(path).convert('RGB'); w, h = size(); x0, y0, x1, y1 = box(); kx, ky = im.width / w, im.height / h
  return im.crop((round(x0 * kx), round(y0 * ky), round(x1 * kx), round(y1 * ky)))


def cmd_sheet():
  paths = [a for a in sys.argv[2:] if not a.startswith('--')]; crops = [full_crop(p) for p in paths]
  th = 260; tiles = [c.resize((max(1, round(c.width * th / c.height)), th)) for c in crops]
  out = Image.new('RGB', (sum(t.width + 6 for t in tiles), th + 16), (20, 20, 20)); x = 0; g = ImageDraw.Draw(out)
  for p, t in zip(paths, tiles): out.paste(t, (x, 16)); g.text((x + 2, 2), os.path.basename(p)[:40], fill=(230, 220, 190)); x += t.width + 6
  save(out)


def cmd_cut():
  crop = full_crop(sys.argv[2]); m = np.asarray(vmask(crop).resize(crop.size)) / 255
  rgb = (np.asarray(crop) * m[..., None] + MAGENTA * (1 - m[..., None])).astype(np.uint8)
  x0, y0, x1, y1 = box(); small = Image.fromarray(rgb).resize((x1 - x0, y1 - y0), Image.BOX)
  out = Image.new('RGB', (crop.width + small.width * 4 + 10, max(crop.height, small.height * 4)), (20, 20, 20))
  out.paste(Image.fromarray(rgb), (0, 0)); out.paste(zoom(small, 4), (crop.width + 10, 0)); save(out)


def cmd_layers():
  if sys.argv[2].endswith('.json'):   # cut.py's manifest: RGBA PNGs beside it
    man = json.load(open(sys.argv[2])); base = os.path.dirname(sys.argv[2]); tiles = []
    for name, L in man['layers'].items():
      im = Image.open(os.path.join(base, L['file'])).convert('RGBA'); bg = Image.new('RGBA', im.size, (255, 0, 255, 255)); bg.alpha_composite(im)
      tiles.append((name, zoom(bg.convert('RGB'), 3)))
    return grid_out(tiles)
  s = open(sys.argv[2]).read(); d = json.loads(s[s.index('{'):s.rindex('}') + 1])
  pal = np.array([[int(d['pal'][i + o:i + o + 2], 16) for o in (0, 2, 4)] for i in range(0, len(d['pal']), 6)])
  tiles = []
  for group, layers in d.items():
    if not isinstance(layers, dict) or not layers or not all(isinstance(v, dict) and 'data' in v for v in layers.values()): continue
    for name, L in layers.items():
      a = np.frombuffer(base64.b64decode(L['data']), np.uint8).reshape(L['h'], L['w'])
      al = np.frombuffer(base64.b64decode(L['alpha']), np.uint8).reshape(L['h'], L['w']) / 255 if 'alpha' in L else (a != 255) * 1.0
      rgb = (pal[np.minimum(a, len(pal) - 1)] * al[..., None] + MAGENTA * (1 - al[..., None])).astype(np.uint8)
      tiles.append(('%s/%s' % (group, name), zoom(Image.fromarray(rgb), 3)))
  grid_out(tiles)


def grid_out(tiles):
  cols = 3; cw = max(t.width for _, t in tiles); rows = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
  out = Image.new('RGB', (cols * (cw + 8), sum(max(t.height for _, t in r) + 16 for r in rows)), (25, 25, 25)); g = ImageDraw.Draw(out); y = 0
  for r in rows:
    for c, (label, t) in enumerate(r): out.paste(t, (c * (cw + 8), y + 14)); g.text((c * (cw + 8) + 2, y + 1), label, fill=(230, 220, 190))
    y += max(t.height for _, t in r) + 16
  save(out)


def cmd_compare():
  f = frames()[int(opt('frame', 0))]; ref = game(opt('ref')); x0, y0, x1, y1 = (box() if opt('box') else (0, 0) + size())
  k = max(1, 860 // (x1 - x0)); a, b = zoom(ref.crop((x0, y0, x1, y1)), k), zoom(f.crop((x0, y0, x1, y1)), k)
  out = Image.new('RGB', (a.width, a.height * 2 + 6)); out.paste(a, (0, 0)); out.paste(b, (0, a.height + 6)); save(out)


def cmd_motion():
  fr = [np.asarray(f).astype(int) for f in frames()]
  tiles = []
  for i in range(1, len(fr)):
    d = np.abs(fr[i] - fr[i - 1]).sum(2) > int(opt('threshold', 30)); v = (fr[i] * 0.35).astype(np.uint8); v[d] = [255, 40, 40]
    tiles.append(zoom(Image.fromarray(v), 2))
  cols = 3; w, h = tiles[0].size; out = Image.new('RGB', (cols * w, -(-len(tiles) // cols) * h))
  for i, t in enumerate(tiles): out.paste(t, ((i % cols) * w, (i // cols) * h))
  save(out)


if __name__ == '__main__':
  cmds = {n[4:]: f for n, f in globals().items() if n.startswith('cmd_')}
  if len(sys.argv) < 3 or sys.argv[1] not in cmds: sys.exit(__doc__)
  cmds[sys.argv[1]]()
