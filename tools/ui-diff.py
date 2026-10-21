#!/usr/bin/env python3
"""Cut316: compare two tools/ui-capture.mjs runs.

  python3 tools/ui-diff.py BEFORE AFTER [--sheet OUT.png] [--threshold 24]

Prints, per image present in both, the share of pixels whose max channel
difference exceeds the threshold. With --sheet it writes a before|after contact
sheet of the changed images (or all images with --all).
"""
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

args = sys.argv[1:]
def opt(k, d=None):
    if k in args:
        i = args.index(k); v = args[i + 1]; del args[i:i + 2]; return v
    return d
sheet = opt("--sheet"); threshold = int(opt("--threshold", "24"))
all_ = "--all" in args
if all_: args.remove("--all")
before, after = map(Path, args[:2])
rows = []
for b in sorted(before.rglob("*.png")):
    rel = b.relative_to(before); a = after / rel
    if not a.exists():
        print(f"{rel}: missing after"); continue
    ib, ia = Image.open(b).convert("RGB"), Image.open(a).convert("RGB")
    if ib.size != ia.size:
        print(f"{rel}: size {ib.size} -> {ia.size}"); rows.append((rel, ib, ia, 100.0)); continue
    d = ImageChops.difference(ib, ia).convert("L").point(lambda v: 255 if v > threshold else 0)
    share = 100.0 * sum(d.histogram()[255:]) / (ib.width * ib.height)
    print(f"{share:6.2f}%  {rel}")
    rows.append((rel, ib, ia, share))
if sheet:
    pick = [r for r in rows if all_ or r[3] > 0.5]
    if pick:
        w = 640
        scaled = [(r[0], r[1].resize((w, int(r[1].height * w / r[1].width))),
                   r[2].resize((w, int(r[2].height * w / r[2].width))), r[3]) for r in pick]
        H = sum(max(b.height, a.height) + 18 for _, b, a, _ in scaled)
        out = Image.new("RGB", (2 * w + 10, H), (255, 255, 255)); y = 0
        dr = ImageDraw.Draw(out)
        for rel, b, a, s in scaled:
            dr.text((0, y), f"{rel}  {s:.1f}%", fill=(0, 0, 0)); y += 16
            out.paste(b, (0, y)); out.paste(a, (w + 10, y)); y += max(b.height, a.height) + 2
        out.save(sheet); print("sheet", sheet)
