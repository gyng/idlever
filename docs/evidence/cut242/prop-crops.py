#!/usr/bin/env python3
"""Actual naturally placed prop crops from matched saved replay screenshots."""
import json
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
result = json.loads((OUT / "replay-after/capture.json").read_text())
keys = ["fens_env_barrel", "fens_env_crate", "crypt_env_barrel", "crypt_env_crate", "foundry_env_barrel", "foundry_env_crate"]
sheet = Image.new("RGB", (1440, 550), "#eee6d7")
draw = ImageDraw.Draw(sheet)
records = []
for i, key in enumerate(keys):
    candidates = [(p["dim"], r, p) for r in result["rows"] if r["backend"] == "gl" and r["width"] == 400
                  for p in r["naturalProps"] if p["key"] == key and p.get("fullyVisible")]
    # Avoid the reflected-fight fire covering an anvil and a combat nameplate
    # covering a coffin; use the other existing natural view, never move props.
    preferred = {"foundry_env_barrel":"foundry-support", "crypt_env_crate":"crypt-drain"}.get(key)
    if preferred:
        candidates = [v for v in candidates if v[1]["id"] == preferred]
    if key == "crypt_env_crate":
        candidates = [v for v in candidates if v[2]["x"] == 60]
    _, row, prop = max(candidates, key=lambda v:v[0])
    after = Image.open(OUT / "replay-after" / row["file"]).convert("RGB")
    before_path = OUT / "replay-before" / row["file"]
    before = Image.open(before_path).convert("RGB")
    c = prop["camera"]
    x = (prop["x"]-c["left"]) / (c["right"]-c["left"]) * after.width
    y = (c["top"]-prop["y"]-prop["h"]/2) / (c["top"]-c["bottom"]) * after.height
    rect = (round(x)-28, round(y)-28, round(x)+28, round(y)+28)
    for j, image in enumerate([before,after]):
        crop = image.crop(rect).resize((224,224),Image.Resampling.NEAREST)
        sheet.paste(crop,(i*240+8,j*260+24))
        draw.text((i*240+8,j*260+8), key+(" before" if j==0 else " after"), fill="#111")
    records.append({"key":key,"frame":row["file"],"worldQuad":prop,"cropRect":rect,
                    "before":str(before_path.relative_to(ROOT)),"after":str((OUT/"replay-after"/row["file"]).relative_to(ROOT))})
sheet.save(OUT/"natural-prop-crops.png")
(OUT/"natural-prop-crops.json").write_text(json.dumps({"scope":"Unedited screenshot crops enlarged4x nearest; natural quads. Camera overscan may offset crop centre slightly; raw full frames authoritative.","records":records},indent=2)+"\n")
