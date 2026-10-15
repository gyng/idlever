#!/usr/bin/env python3
"""Mechanical export of original painted ability-icon masters.

No crop or semantic edits. --partial is only for work-in-progress art review;
normal invocation requires all30 masters before claiming a complete library.
"""
from pathlib import Path
import argparse
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
NODES = {
    "fighter": "rally oathguard opening_cut siege_rhythm holdfast execution_arc",
    "rogue": "afterimage tell_thief veiled_route patient_ambush ghostwalk silent_finish",
    "ranger": "spotter quiver_thread corridor_volley split_mark patient_snare moving_line",
    "caster": "chilling_charge storm_cell ice_lock shatter_ward conduct last_wall",
    "gunner": "rangefinder chamber_chain smoke_walk cycling_breach long_watch breach_route",
}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--partial", action="store_true")
    args = parser.parse_args()
    ids = [f"{cls}_{slug}" for cls, slugs in NODES.items() for slug in slugs.split()]
    # Explicit selected revision; keep all original masters and prompts intact.
    versions = {
        "rogue_patient_ambush": 2,
        "ranger_spotter": 2,
        "ranger_quiver_thread": 2,
        "ranger_corridor_volley": 2,
        "ranger_patient_snare": 2,
    }
    sources = {
        key: ROOT / f"art/generated/skill_{key}_v{versions.get(key, 1)}.png"
        for key in ids
    }
    missing = [key for key in ids if not sources[key].is_file()]
    invalid = []
    for key in ids:
        if key in missing:
            continue
        with Image.open(sources[key]) as master:
            if master.width != master.height:
                invalid.append({"id": key, "reason": "non-square master; reframe before adoption", "size": master.size})
    if (missing or invalid) and not args.partial:
        parser.error(f"Missing {len(missing)} masters; {len(invalid)} invalid shapes; --partial is review-only")
    output = ROOT / "web/public/ui/skills"
    output.mkdir(parents=True, exist_ok=True)
    assets = []
    for key in ids:
        if key in missing or any(issue["id"] == key for issue in invalid):
            continue
        version = versions.get(key, 1)
        source = sources[key]
        prompt = ROOT / f"art/prompts/skill_{key}_v{version}.txt"
        assert prompt.is_file(), prompt
        target = output / f"{key}-v{version}.webp"
        with Image.open(source) as master:
            assert master.width == master.height, source
            if master.mode == "RGBA":
                assert master.getchannel("A").getextrema() == (255, 255), source
            size = master.size
            master.convert("RGB").resize((192, 192), Image.Resampling.LANCZOS).save(
                target, "WEBP", lossless=True, method=6
            )
        assets.append({
            "id": key, "source": str(source.relative_to(ROOT)),
            "source_sha256": sha(source), "source_size": size,
            "prompt": str(prompt.relative_to(ROOT)), "prompt_sha256": sha(prompt),
            "output": str(target.relative_to(ROOT)), "output_sha256": sha(target),
            "bytes": target.stat().st_size,
        })
    manifest = {
        "schema": 1, "generation": "built-in image_gen",
        "direction": "Owner2026-10-16: painted ability icons with classic strategy-game personality; flat SVG drafts rejected as final art",
        "status": "partial art review" if missing or invalid else "export complete; integration and review separate",
        "required": ids, "missing": missing, "invalid": invalid, "selected_versions": versions,
        "output_size": [192, 192],
        "processing": "full square preserved; Lanczos resize; lossless RGB WebP; no semantic edits",
        "assets": assets,
    }
    (ROOT / "art/advanced-skills.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Exported {len(assets)}/30 painted icons; {len(missing)} missing; {len(invalid)} invalid shapes; {sum(a['bytes'] for a in assets)} bytes")


if __name__ == "__main__":
    main()
