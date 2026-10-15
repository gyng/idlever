#!/usr/bin/env python3
"""Inspect current capture images; generate contact sheets and static integrity inventory."""
import hashlib
import json
import pathlib
from PIL import Image, ImageDraw

out = pathlib.Path(__file__).resolve().parent
result = json.loads((out / "capture.json").read_text())
metrics = []
for backend in ["gl", "canvas"]:
    rows = [r for r in result["rows"] if r["backend"] == backend]
    assert len(rows) == 12
    sheet = Image.new("RGB", (1200, 1200), "#eee6d7")
    draw = ImageDraw.Draw(sheet)
    for i, row in enumerate(rows):
        path = out / row["file"]
        original = Image.open(path).convert("RGB")
        thumb = original.copy()
        thumb.thumbnail((296, 362))
        x, y = (i % 4) * 300, (i // 4) * 400
        sheet.paste(thumb, (x + (296 - thumb.width) // 2, y + 28))
        draw.text((x + 3, y + 5), row["id"] + " " + str(row["width"]), fill="#111")
        pixels = list(original.get_flattened_data())
        metrics.append({"file": row["file"], "size": original.size,
                        "distinct_rgb": len(set(pixels)),
                        "nonblack_fraction": sum(max(p) > 12 for p in pixels) / len(pixels),
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()})
    sheet.save(out / f"review-{backend}.png")
assert all(m["distinct_rgb"] > 100 for m in metrics), "Blank/incomplete frame"
(out / "frame-inventory.json").write_text(json.dumps({
    "scope": "Static image integrity/identity only, no performance or readability certification",
    "frames": metrics}, indent=2) + "\n")
print(f"{len(metrics)} nonblank frames inventoried; GL/Canvas contact sheets generated.")
