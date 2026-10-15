#!/usr/bin/env python3
"""Export equipment layers without cropping or changing their registration.

Masters remain untouched. UI mounting transforms belong to the figure renderer.
Run from any directory; the manifest records exact source and output identities.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ASSETS = {
    "base-male": "base_male_v2",
    "base-female": "base_female_v1",
    "base-cat": "base_cat_v1",
    **{kind: f"{kind}_v1" for kind in (
        "crownsplitter", "hearthglass", "frostmantle", "ironcap",
        "hearthglass_hood", "trailboots", "hearthglass_boots",
    )},
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    rows = []
    output = ROOT / "web/public/ui/equipment"
    output.mkdir(parents=True, exist_ok=True)
    for name, master in ASSETS.items():
        source = ROOT / f"art/generated/hero_equipment_{master}.png"
        target = output / f"{name}.webp"
        with Image.open(source) as original:
            assert original.mode == "RGBA", source
            assert original.size == (1024, 1536), source
            assert original.getchannel("A").getextrema()[0] == 0, source
            original.resize((384, 576), Image.Resampling.LANCZOS).save(
                target, "WEBP", lossless=True, exact=True, method=6
            )
            bounds = original.getchannel("A").point(
                lambda value: 255 if value > 32 else 0
            ).getbbox()
        with Image.open(target) as exported:
            assert exported.mode == "RGBA" and exported.size == (384, 576)
            assert exported.getchannel("A").getextrema()[0] == 0
        rows.append({
            "id": name, "source": str(source.relative_to(ROOT)),
            "source_sha256": sha(source), "output": str(target.relative_to(ROOT)),
            "output_sha256": sha(target), "bytes": target.stat().st_size,
            "source_alpha_bounds_gt32": bounds,
        })
    manifest = {
        "schema": 1, "source_size": [1024, 1536], "output_size": [384, 576],
        "processing": "full canvas Lanczos resize; lossless RGBA WebP; no crop",
        "generation": "built-in image_gen; exact prompts in art/prompts/hero_equipment_*.txt",
        "mounting": "UI supplies explicit uniform scale and position per wearable; generator registration varies",
        "assets": rows,
    }
    (ROOT / "art/equipment.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Exported {len(rows)} layers, {sum(row['bytes'] for row in rows)} bytes")


if __name__ == "__main__":
    main()
