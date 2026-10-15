#!/usr/bin/env python3
"""Read-only numeric proof for the isolated Cut242 candidate. No production writes.

python3 docs/evidence/cut242/pipeline/verify_candidate.py /tmp/idlever-cut242-candidate
The temporary root must already contain art/tiles and web/public/art from the
copied art/make_env.py → art/pack.py → art/art-qc.py pipeline.
"""
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
TMP = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/idlever-cut242-candidate")
sys.path.insert(0, str(ROOT / "art"))
from painted import convert
from pack import key_source

sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
before = json.loads((OUT / "before.json").read_text())
manifest = json.loads((ROOT / "art/manifest.json").read_text())
targets = {f"{a['biome']}_env_{a['name']}.png": a for a in manifest["assets"] if a.get("refine_source") == "painted"}
assert len(targets) == 6
assert all(sha(ROOT / p) == h for p, h in before["production_atlas"].items()), "Production atlas changed before integration"
changed = []
for name, value in before["tiles_before"].items():
    if not name.startswith("_") and sha(TMP / "art/tiles" / name) != value:
        changed.append(name)
assert set(changed) == set(targets), changed

rows = []
sheet = Image.new("RGB", (960, 600), "#eee6d7")
draw = ImageDraw.Draw(sheet)
for i, (name, asset) in enumerate(targets.items()):
    src = ROOT / "art" / asset["source"]
    master = np.array(Image.open(src).convert("RGBA"))
    source_edge = np.concatenate([master[0, :, 3], master[-1, :, 3], master[:, 0, 3], master[:, -1, 3]])
    native = Image.open(TMP / "art/tiles" / name).convert("RGBA")
    array = np.array(native)
    alpha = array[:, :, 3]
    edge = np.concatenate([alpha[0], alpha[-1], alpha[:, 0], alpha[:, -1]])
    converted = np.array(convert(src, asset["bg"], (16, 16), key_source, asset["margin"]))
    row = {"tile": name, "source": asset["source"], "source_sha256": sha(src), "size": native.size,
           "opaque_pixels": int((alpha > 0).sum()), "opaque_colors": len(set(map(tuple, array[alpha > 0, :3]))),
           "alpha": np.unique(alpha).tolist(), "nontransparent_edge_pixels": int((edge > 0).sum()),
           "source_edge_alpha_gt16": int((source_edge > 16).sum()), "source_edge_alpha_max": int(source_edge.max()),
           "refine_alpha_xor_pixels": int(((converted[:, :, 3] > 0) != (alpha > 0)).sum()),
           "tile_sha256": sha(TMP / "art/tiles" / name)}
    assert row["alpha"] == [0, 255] and row["opaque_pixels"] > 0
    assert row["opaque_colors"] <= 24
    assert row["nontransparent_edge_pixels"] == row["source_edge_alpha_gt16"] == row["refine_alpha_xor_pixels"] == 0
    rows.append(row)
    x, y = (i % 3) * 320, (i // 3) * 300
    draw.text((x + 4, y + 3), name, fill="#111")
    for j, tile in enumerate([Image.open(ROOT / "art/tiles" / name).convert("RGBA"), native]):
        big = tile.resize((128, 128), Image.Resampling.NEAREST)
        sheet.paste(big, (x + j * 150, y + 24), big)
        floor = Image.open(ROOT / "art/tiles" / (asset["biome"] + "_env_floor_0.png")).convert("RGBA")
        floor.alpha_composite(tile)
        floor = floor.resize((96, 96), Image.Resampling.NEAREST)
        sheet.paste(floor, (x + j * 150, y + 180), floor)
sheet.save(OUT / "candidate-review.png")

old_atlas = np.array(Image.open(ROOT / "web/public/art/atlas.png").convert("RGBA"))
new_atlas = np.array(Image.open(TMP / "web/public/art/atlas.png").convert("RGBA"))
old_frames = json.loads((ROOT / "web/public/art/atlas.json").read_text())["frames"]
new_frames = json.loads((TMP / "web/public/art/atlas.json").read_text())["frames"]
assert old_frames == new_frames and old_atlas.shape == new_atlas.shape
allowed = np.zeros(old_atlas.shape[:2], bool)
for name in targets:
    frame = new_frames[Path(name).stem]
    x, y, w, h = (frame[k] for k in ["x", "y", "w", "h"])
    allowed[y:y + h, x:x + w] = True
    assert np.array_equal(new_atlas[y:y+h, x:x+w], np.array(Image.open(TMP / "art/tiles" / name).convert("RGBA")))
outside = int((np.any(old_atlas != new_atlas, axis=2) & ~allowed).sum())
assert outside == 0, outside
for master in before["masters"]:
    assert sha(ROOT / master["original_source"]) == master["original_sha256"]
    assert sha(ROOT / "art" / master["source"]) == master["sha256"]
report = {"scope": "Temporary complete pipeline only; production atlas unchanged; runtime replay review pending",
          "candidate_root": str(TMP), "changed_tiles": sorted(changed), "non_target_changes": [],
          "non_target_pngs_byte_identical": sum(not n.startswith("_") and n not in targets for n in before["tiles_before"]),
          "atlas_frame_rectangles_identical": True, "atlas_changed_pixels_outside_six_frames": outside,
          "original_masters_unchanged": True, "selected_masters_unchanged": True, "rows": rows,
          "pipeline_sources": {str(p.relative_to(ROOT)): sha(p) for p in [ROOT / "art" / n for n in ["manifest.json", "painted.py", "refine.py", "art-qc.py"]]}}
(OUT / "candidate-tile-qc.json").write_text(json.dumps(report, indent=2) + "\n")
print(f"6 selected tiles; {report['non_target_pngs_byte_identical']} other PNGs byte-identical; atlas changes outside6 frames={outside}; all source/mask/margin assertions pass.")
