"""Bake an empty painted room into a game module (a palette and the picture as palette indices, base64).

  python3 -I scripts/room-plate.py art/yard src/yard-plate.js YARD_PLATE

(The Ward has its own bake with furniture and occluder masks: scripts/ward-plate.py.)

<dir>/pusto.png is the painting with every person and piece of furniture removed (the setts or the floor continue where
they stood); it is resized to the game's 288×192 frame and quantized to one palette. The room's walkers, inmates and
the player are drawn over it by code.
"""
import base64, json, os, sys
import numpy as np
from PIL import Image

W, H = 288, 192
COLOURS = 192


def main(art, out, name):
  img = Image.open(f'{art}/pusto.png').convert('RGB').resize((W, H), Image.LANCZOS)
  q = img.quantize(COLOURS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
  pal = np.asarray(q.getpalette()[:COLOURS * 3]).reshape(-1, 3)
  idx = np.asarray(q).astype(np.uint8)
  b64 = base64.b64encode(np.ascontiguousarray(idx).tobytes()).decode()
  data = {'w': W, 'h': H, 'pal': ['%02x%02x%02x' % tuple(c) for c in pal], 'plate': b64}
  with open(out, 'w') as f:
    f.write(f'/* The painted room, baked by scripts/room-plate.py from {art}/ (do not edit by hand):\n'
            '   a palette (hex) and the empty room as palette indices, base64. */\n')
    f.write(f'export const {name} = ' + json.dumps(data, separators=(',', ':')) + ';\n')
  print(out, os.path.getsize(out), 'bytes')


main(*sys.argv[1:4])
