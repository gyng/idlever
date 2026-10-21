#!/usr/bin/env python3
"""Cut316: contact sheets of a tools/ui-capture.mjs run — N images per sheet, labelled.

  python3 tools/ui-sheet.py DIR/1440x900 OUT_PREFIX [--per 6] [--cols 3] [--width 600] [--only a,b]
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw
a = sys.argv[1:]
def opt(k, d):
    if k in a: i = a.index(k); v = a[i + 1]; del a[i:i + 2]; return v
    return d
per, cols, width = int(opt("--per", "6")), int(opt("--cols", "3")), int(opt("--width", "600"))
only = opt("--only", None)
src, prefix = Path(a[0]), a[1]
files = sorted(p for p in src.glob("*.png") if not only or any(p.stem.startswith(o) for o in only.split(",")))
for n in range(0, len(files), per):
    chunk = files[n:n + per]
    ims = [Image.open(f).convert("RGB") for f in chunk]
    ims = [im.resize((width, int(im.height * width / im.width))) for im in ims]
    rows = (len(ims) + cols - 1) // cols
    rh = max(im.height for im in ims) + 18
    out = Image.new("RGB", (cols * (width + 8), rows * rh), (255, 255, 255))
    d = ImageDraw.Draw(out)
    for i, (f, im) in enumerate(zip(chunk, ims)):
        x, y = (i % cols) * (width + 8), (i // cols) * rh
        d.text((x, y), f.name, fill=(0, 0, 0)); out.paste(im, (x, y + 16))
    path = f"{prefix}-{n // per}.png"; out.save(path); print(path)
