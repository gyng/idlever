#!/usr/bin/env python3
"""Export existing earned checkpoints only. No engine load, tick, replay or mutation.

Run from repository root: python3 docs/evidence/handoff-content/catalogue.py
SVGs are schematic diagnostics, NOT production renderer/replay screenshots.
"""
import collections
import gzip
import hashlib
import html
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[3]
OUT = pathlib.Path(__file__).resolve().parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2) + "\n")


definitions = (ROOT / "crates/idlever-core/src/defs.rs").read_text()
tags = {k: re.findall(r'"([^"]+)"', t) for k, t in re.findall(
    r'MonsterDef \{ kind: "([^"]+)".*?tags: &\[(.*?)\]', definitions)}

# Selected actual stored windows. Selection does not imply a successful counter.
selected = [
    ("F1-gas", "AWAY-nodes-s1-d3-c0", 79, "fens", "gas_step"),
    ("F2-water-pack", "AWAY-nodes-s2-d3-c0", 84, "fens", "pack_break / positioning"),
    ("C1-drain", "AWAY-nodes-s2-d5-c0", 167, "crypt", "light/shrine versus drain: legal choice unverified"),
    ("C2-summoned-pack", "AWAY-nodes-s1-d3-c0", 92, "crypt", "summoner targeting / corridor retreat"),
    ("W1-reflector", "AWAY-nodes-s1-d4-c0", 102, "foundry", "reflect_read"),
    ("W2-support-candidate", "AWAY-nodes-s1-d4-c0", 118, "foundry", "support targeting: actual buff/alarm event missing"),
]
scenes = []
for case, camp, run_id, biome, candidate in selected:
    path = ROOT / f"docs/evidence/cut162/camps/{camp}.json.gz"
    game = json.loads(gzip.decompress(path.read_bytes()))
    record = game["deaths"][str(run_id)]
    run, death = record["t10"], record["death"]
    packed = json.dumps(record, separators=(",", ":")).encode()
    raw = OUT / f"{case}.record.json.gz"
    raw.write_bytes(gzip.compress(packed, mtime=0))
    monsters = [{k: m.get(k) for k in ("id", "kind", "pos", "hp", "awake", "ally", "summoned", "telegraph", "extra_tags", "buff_def", "cooldown")}
                | {"current_source_tags": tags.get(m["kind"], [])}
                for m in run["monsters"] if m["hp"] > 0]
    turns = death["trace"]["turns"]
    blows = collections.Counter(b["by"] for t in turns for b in t.get("blows", []))
    quotes = [{"t": t["t"], "verb": t["verb"], "hp": t["hp"], "max_hp": t.get("max_hp"),
               "foes": t["foes"], "telegraphs": t.get("telegraphs", []),
               "blows": t.get("blows", [])} for t in turns]
    biome_notes = [n for n in run["notes"] if re.search(rf'D{run["depth"]}: the {biome.title()}\.', n[1])]
    # A source-era entrance note establishes biome without assuming fixed depths.
    assert biome_notes, (case, "missing actual biome entrance note")
    scene = {"id": case, "source": str(path.relative_to(ROOT)), "source_gzip_sha256": sha(path),
             "record": raw.name, "record_gzip_sha256": sha(raw), "run_id": run_id,
             "biome": biome, "biome_evidence": biome_notes, "depth": run["depth"],
             "route": "not serialized in this historical Run; actual entrance note used",
             "checkpoint_turn": run["turn"], "death_turn": turns[-1]["t"],
             "checkpoint_hp": run["hero"]["hp"], "checkpoint_max_hp": run["hero"]["max_hp"],
             "class": run["hero"]["class"], "kit": run["hero"]["inv"],
             "floor_twist": run.get("floor_twist"), "floor_situations": run["situations"],
             "room_count": len(run["floor"]["rooms"]),
             "terrain_counts": dict(collections.Counter(run["floor"]["map"]["tiles"])),
             "living_monsters_at_checkpoint": monsters,
             "compiled_rows_at_record": record["rules"],
             "vocabulary_at_record": record.get("vocab"),
             "package_levels_at_send": None, "unlock_state_at_send": None,
             "package_limit": "Final-camp pkg is later state; do not retrofit its ownership/levels into this send.",
             "death_cause": death["cause"], "actual_trace_blows": dict(blows), "actual_trace": quotes,
             "candidate_counter_not_measured": candidate,
             "causal_matched_comparisons": 0, "current_balance_claim": False}
    scenes.append(scene)
    # Exact checkpoint geometry and positions; fog retained. Full record retains raw map.
    mp = run["floor"]["map"]
    size = 14
    colors = {"wall": "#373531", "floor": "#b2a086", "water": "#587e83", "chasm": "#15151b",
              "door": "#78563a", "stairs_up": "#dde5ba", "stairs_down": "#d9b951"}
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{mp["w"]*size}" height="{mp["h"]*size+42}" viewBox="0 0 {mp["w"]*size} {mp["h"]*size+42}">',
           '<rect width="100%" height="100%" fill="#242326"/>',
           f'<text x="5" y="14" fill="white" font-size="11">{case} · D{run["depth"]} · checkpoint t{run["turn"]}</text>',
           '<text x="5" y="29" fill="white" font-size="10">Schematic saved state; H hero, enemy initials. Not game render.</text>']
    for i, tile in enumerate(mp["tiles"]):
        seen = mp.get("seen", [True]*len(mp["tiles"]))[i]
        svg.append(f'<rect x="{i%mp["w"]*size}" y="{i//mp["w"]*size+42}" width="14" height="14" fill="{colors.get(tile,"#a08880") if seen else "#18181b"}"/>')
    for m in monsters:
        pos = m["pos"]
        i = pos["y"]*mp["w"]+pos["x"]
        if not mp.get("visible", [True]*len(mp["tiles"]))[i]:
            continue
        svg.append(f'<text x="{pos["x"]*size+2}" y="{pos["y"]*size+53}" fill="#a22020" font-size="10"><title>{html.escape(m["kind"])}, hp{m["hp"]}</title>{html.escape(m["kind"][:2])}</text>')
    pos = run["hero"]["pos"]
    svg.append(f'<text x="{pos["x"]*size+2}" y="{pos["y"]*size+53}" fill="#fff" stroke="#111" stroke-width="0.3" font-size="13">H</text></svg>')
    (OUT / f"{case}.svg").write_text("\n".join(svg))

write_json(OUT / "six-scenes.json", {"scope": "Six historical earned stored checkpoints; no simulation or counter certification", "scenes": scenes})

# The current prepared camp contains old deep deaths and a fresh current-WASM absence.
# Do not misattribute every retained death to the current runtime.
menu = ROOT / "docs/evidence/handoff-menus/input.game.json.gz"
g = json.loads(gzip.decompress(menu.read_bytes()))
write_json(OUT / "current-camp-replay-availability.json", {
    "source": str(menu.relative_to(ROOT)), "source_gzip_sha256": sha(menu),
    "provenance": "docs/evidence/handoff-menus/input-provenance.json",
    "source_earned_fixture": "docs/evidence/cut220/core/fixtures/earned-hybrid-saved-kit.game.json.gz",
    "preparation": "Existing menu evidence loaded earned fixture and ran actual87de runOfflineQuick(3600); audit does not advance it.",
    "deep_retained_deaths": [{"run_id": int(k), "depth": v["death"]["depth"], "cause": v["death"]["cause"]} for k,v in g["deaths"].items()],
    "capsule_wire_key": "live_capsule", "capsules_serialized": "live_capsule" in g,
    "saved_kill_capsule_ids": [c["id"] for c in g.get("live_capsule", {}).get("kills", [])],
    "history_entries": len(g.get("history", [])),
    "limit": "Deep death checkpoints are historical records. Saved genuine departure capsules131/132 permit read-only current-runtime reconstruction; replay.mjs exports131, whose ticks differ from historical runlog. Neither current replay nor later camp choices rewrite a historical fight."})

sources = ["crates/idlever-core/src/"+p for p in ["defs.rs","gen.rs","descent.rs","situations.rs","packages.rs","ai.rs","meta.rs","engine.rs","trace.rs"]]
sources += ["web/src/render/index.ts", "web/src/render/view2d.ts", "web/src/ui/replay.ts", "web/src/ui/runlog.ts", "art/ART.md", "art/manifest.json"]
sources += ["crates/idlever-core/src/hero.rs"]
sources += ["web/src/render/atlas.ts", "web/src/render/fallback.ts", "web/public/art/atlas.json", "web/public/art/atlas.png"]
assets = sorted(p for b in ["fens", "crypt", "foundry"] for p in ROOT.glob(f"art/tiles/{b}_env_*"))
write_json(OUT / "source-assets.json", {
    "source": [{"path": p, "sha256": sha(ROOT/p)} for p in sources],
    "existing_biome_material_assets": [{"path": str(p.relative_to(ROOT)), "sha256": sha(p)} for p in assets],
    "note": "Asset existence and current source identity only; no visual-readability or performance claim."})

# Existing painted asset inventory, not a composed gameplay/landmark screenshot.
from PIL import Image, ImageDraw, ImageFont
sheet = Image.new("RGB", (980, 560), "#eee6d7")
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default()
draw.text((12, 9), "EXISTING ASSETS ONLY - diagnostic sheet; no game scene or new art", fill="#211f1b", font=font)
for row, biome in enumerate(["fens", "crypt", "foundry"]):
    draw.text((12, 47+row*166), biome.upper(), fill="#211f1b", font=font)
    picks = ["floor_0", "wall_face_0", "barrel", "pot", "rack", "shrine_0", "water" if biome != "crypt" else "chasm", "reeds" if biome == "fens" else "vault"]
    for col, name in enumerate(picks):
        path = ROOT / f"art/tiles/{biome}_env_{name}.png"
        x, y = 12+col*120, 66+row*166
        if not path.exists():
            draw.text((x,y+30), "absent", fill="#8a2727", font=font)
        else:
            tile = Image.open(path).convert("RGBA")
            tile.thumbnail((108,108), Image.Resampling.NEAREST)
            # 2x inspection of small native painted props.
            if max(tile.size) <= 54:
                tile = tile.resize((tile.width*2,tile.height*2), Image.Resampling.NEAREST)
            sheet.paste(tile, (x+(108-tile.width)//2,y+(108-tile.height)//2), tile)
        draw.text((x,y+111), name, fill="#211f1b", font=font)
sheet.save(OUT / "existing-materials.png")

atlas_path = ROOT / "web/public/art/atlas.png"
atlas = Image.open(atlas_path).convert("RGBA")
frames = json.loads((ROOT / "web/public/art/atlas.json").read_text())["frames"]
props = Image.new("RGB", (840, 530), "#eee6d7")
pd = ImageDraw.Draw(props)
pd.text((10,8), "ACTUAL PACKED ATLAS CROPS - 8x nearest; existing slots, no new art", fill="#211f1b", font=font)
mapping = []
promised = {"fens": ["stump", "fish trap", "mossy jar"], "crypt": ["sarcophagus", "coffin", "urn"], "foundry": ["anvil", "coal bin", "crucible"]}
for row, biome in enumerate(["fens", "crypt", "foundry"]):
    for col, name in enumerate(["barrel", "crate", "pot"]):
        key = f"{biome}_env_{name}"
        rect = frames[key]
        crop = atlas.crop((rect["x"], rect["y"], rect["x"]+rect["w"], rect["y"]+rect["h"]))
        tile_path = ROOT / f"art/tiles/{key}.png"
        tile = Image.open(tile_path).convert("RGBA")
        assert crop.size == tile.size and crop.tobytes() == tile.tobytes()
        pos = (20+col*275, 32+row*165)
        props.paste(crop.resize((128,128),Image.Resampling.NEAREST),pos,crop.resize((128,128),Image.Resampling.NEAREST))
        pd.text((pos[0]+133,pos[1]+25), biome, fill="#211f1b",font=font)
        pd.text((pos[0]+133,pos[1]+42), name,fill="#211f1b",font=font)
        pd.text((pos[0]+133,pos[1]+63), "promised:",fill="#211f1b",font=font)
        pd.text((pos[0]+133,pos[1]+80), promised[biome][col],fill="#211f1b",font=font)
        mapping.append({"manifest_id":f"env_{biome}_{name}","renderer_key":f"tile:{key}","source_tile":str(tile_path.relative_to(ROOT)),"source_sha256":sha(tile_path),"atlas_rect":rect,"atlas_crop_rgba_sha256":hashlib.sha256(crop.tobytes()).hexdigest(),"pixel_exact_to_source_tile":True,"ART_md_promised_identity":promised[biome][col]})
props.save(OUT / "packed-prop-crops.png")
write_json(OUT / "packed-prop-mapping.json", {"atlas_sha256":sha(atlas_path),"mapping":mapping,"missing_manifest_ids":[],"classification":"Existing paintings map correctly; visual thematic identity versus approved direction needs review. No missing file claim."})
print(f"Exported {len(scenes)} actual checkpoint records and schematic maps; indexed {len(assets)} existing biome materials. No engine execution.")
