#!/usr/bin/env python3
"""Read the dayplayer's DP_SAVE_DIR saves: per bot × seed, the achievements earned and their first-earn day."""
import json, os, re, sys, collections

d = sys.argv[1]
JOURNEY = {"boss_warlord", "boss_lich", "boss_queen", "boss_king", "waystones", "legend_all", "seek", "descent", "second_hero", "pen_row"}
SECRET = {"o_gas", "o_turncoat", "o_pratfall", "old_enemy"}
latest = {}
for f in os.listdir(d):
    m = re.match(r"(.+)-s(\d+)-d(\d+)-c(\d+)\.json$", f)
    if not m:
        continue
    bot, seed, day, c = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4))
    k = (bot, seed)
    if k not in latest or (day, c) > latest[k][0]:
        latest[k] = ((day, c), f)
per_id = collections.defaultdict(dict)
for (bot, seed), ((day, c), f) in sorted(latest.items()):
    v = json.load(open(os.path.join(d, f)))
    e = v.get("lineage", {}).get("honours", {}).get("earned", {})
    d1 = sum(1 for x in e.values() if x <= 1)
    d3_non = sorted(i for i, x in e.items() if x <= 3 and i not in JOURNEY)
    non = sorted((i, x) for i, x in e.items() if i not in JOURNEY)
    vis = [i for i in e if i not in SECRET]
    print(f"{bot:8} s{seed} (save d{day}c{c}): total {len(e)} visible {len(vis)}/38 · day1 {d1} · non-journey by d3 {d3_non} · non-journey {non}")
    for i, x in e.items():
        per_id[i][(bot, seed)] = x
print()
print("first-earn day per entry (bot:seed=day)")
for i in sorted(per_id):
    print(f"  {i:14} " + " ".join(f"{b}:{s}={x}" for (b, s), x in sorted(per_id[i].items())))
