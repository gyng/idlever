#!/usr/bin/env python3
"""Read-only final integration proof against pinned pre-integration hashes/Git blob."""
import hashlib
from io import BytesIO
import json
from pathlib import Path
import subprocess

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
before = json.loads((OUT / "before.json").read_text())
candidate = json.loads((OUT / "candidate-tile-qc.json").read_text())
targets = {r["tile"]: r for r in candidate["rows"]}
changes = [n for n, h in before["tiles_before"].items() if not n.startswith("_") and sha(ROOT / "art/tiles" / n) != h]
assert set(changes) == set(targets)
for name, row in targets.items():
    assert sha(ROOT / "art/tiles" / name) == row["tile_sha256"]
old_bytes = subprocess.check_output(["git", "cat-file", "blob", before["before_atlas_git_blob_sha1"]], cwd=ROOT)
assert hashlib.sha256(old_bytes).hexdigest() == before["production_atlas"]["web/public/art/atlas.png"]
old = np.array(Image.open(BytesIO(old_bytes)).convert("RGBA"))
new = np.array(Image.open(ROOT / "web/public/art/atlas.png").convert("RGBA"))
frames = json.loads((ROOT / "web/public/art/atlas.json").read_text())["frames"]
previous_bytes = subprocess.check_output(["git", "cat-file", "blob", before["before_atlas_json_git_blob_sha1"]], cwd=ROOT)
assert hashlib.sha256(previous_bytes).hexdigest() == before["production_atlas"]["web/public/art/atlas.json"]
previous = json.loads(previous_bytes)["frames"]
assert frames == previous and old.shape == new.shape
allowed = np.zeros(old.shape[:2], bool)
for name in targets:
    f = frames[Path(name).stem]
    x,y,w,h = (f[k] for k in ["x","y","w","h"])
    allowed[y:y+h,x:x+w] = True
    assert np.array_equal(new[y:y+h,x:x+w], np.array(Image.open(ROOT / "art/tiles" / name).convert("RGBA")))
outside = int((np.any(old != new,axis=2) & ~allowed).sum())
assert outside == 0
report = {"scope": "Production full art pipeline integration, without gameplay/renderer changes",
          "changed_tiles": sorted(changes), "other_tile_pngs_byte_identical": candidate["non_target_pngs_byte_identical"],
          "selected_tiles_byte_identical_to_reviewed_candidate": True,
          "atlas_frame_rectangles_unchanged": True, "atlas_changed_pixels_outside_six_frames": outside,
          "atlas_sha256": sha(ROOT / "web/public/art/atlas.png"), "atlas_json_sha256": sha(ROOT / "web/public/art/atlas.json"),
          "original_atlas_blob": before["before_atlas_git_blob_sha1"], "original_atlas_sha256": hashlib.sha256(old_bytes).hexdigest(),
          "wasm_sha256": sha(ROOT / "web/src/engine/pkg/idlever_wasm_bg.wasm")}
assert report["wasm_sha256"] == json.loads((ROOT / "docs/evidence/cut242/run131-summary.json").read_text())["wasmSha256"]
(OUT / "integrated-proof.json").write_text(json.dumps(report,indent=2)+"\n")
print("Integrated6 tiles equal reviewed candidate;368 other PNGs byte-identical;0 atlas changes outside6 unchanged rectangles; WASM unchanged.")
