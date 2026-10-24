"""Cut frames out of a render-room.mjs contact sheet: zoom one frame, strip one region over time, measure motion.

  frames.py zoom   SHEET --frame=1 [--box=x,y,w,h] [--scale=8]      -> SHEET_zoom.png
  frames.py strip  SHEET --frames=0-5 --box=x,y,w,h [--scale=4]     -> SHEET_strip.png (frames side by side)
  frames.py motion SHEET [--box=x,y,w,h]                            -> changed pixels between consecutive frames
  --layout=fight (default: --fight sheets, 3 columns, 144x96 at 3x) | arm (--arm, 2 columns, 288x192 at 2x)
           | room (--times sheets, one row of 288x192 at 2x)
Boxes are in picture pixels (144x96 or 288x192), w/h are sizes. Needs Pillow."""
import sys
from PIL import Image, ImageChops

LAYOUT = {'fight': (3, 144, 96, 3, 20), 'arm': (2, 288, 192, 2, 20), 'room': (99, 288, 192, 2, 26)}

def opts(argv):
    o = {}
    for a in argv:
        if a.startswith('--') and '=' in a:
            k, v = a[2:].split('=', 1); o[k] = v
    return o

def frames(sheet, layout):
    cols, W, H, zs, lab = LAYOUT[layout]
    fw, fh = W * zs, H * zs
    n_cols = min(cols, sheet.width // fw)
    rows = 1 if layout == 'room' else sheet.height // (fh + lab)
    out = []
    for r in range(rows):
        for c in range(n_cols):
            x, y = c * fw, r * (fh + lab)
            f = sheet.crop((x, y, x + fw, y + fh)).resize((W, H), Image.NEAREST)   # back to picture pixels
            if f.getbbox(): out.append(f)
    return out, W, H

def box(o, W, H):
    if 'box' not in o: return (0, 0, W, H)
    x, y, w, h = map(int, o['box'].split(','))
    return (x, y, x + w, y + h)

def main():
    if len(sys.argv) < 3: print(__doc__); sys.exit(1)
    cmd, path, o = sys.argv[1], sys.argv[2], opts(sys.argv[3:])
    sheet = Image.open(path).convert('RGB')
    fr, W, H = frames(sheet, o.get('layout', 'fight'))
    b = box(o, W, H); bw, bh = b[2] - b[0], b[3] - b[1]
    stem = path[:-4] if path.endswith('.png') else path
    if cmd == 'zoom':
        s = int(o.get('scale', 8)); k = int(o.get('frame', 0))
        img = fr[k].crop(b).resize((bw * s, bh * s), Image.NEAREST); img.save(stem + '_zoom.png'); print(stem + '_zoom.png', img.size)
    elif cmd == 'strip':
        s = int(o.get('scale', 4)); a, z = map(int, o.get('frames', f'0-{len(fr) - 1}').split('-')); sel = fr[a:z + 1]
        img = Image.new('RGB', (len(sel) * (bw * s + 4), bh * s), (10, 10, 8))
        for i, f in enumerate(sel): img.paste(f.crop(b).resize((bw * s, bh * s), Image.NEAREST), (i * (bw * s + 4), 0))
        img.save(stem + '_strip.png'); print(stem + '_strip.png', img.size)
    elif cmd == 'motion':
        for k in range(1, len(fr)):
            d = ImageChops.difference(fr[k], fr[k - 1]).crop(b).convert('L')
            changed = sum(1 for v in d.get_flattened_data() if v) if hasattr(d, 'get_flattened_data') else sum(1 for v in d.getdata() if v)
            print(f'{k - 1}->{k}: {changed} px changed of {bw * bh}')
    else: print(__doc__); sys.exit(1)

main()
