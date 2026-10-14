#!/usr/bin/env python3
"""Cut222 engaging-impact: pair PICKED/PICKED+L fortnights with and without the max-wish policy."""
import glob, json, os, re, statistics as st, sys

base, wish, out = sys.argv[1], sys.argv[2], sys.argv[3]
MS = [8, 13, 18, 23, 28, 29, 33]


def dec(x):
    import struct
    if isinstance(x, str) and x.lstrip("\x01").startswith("f64:"):
        return struct.unpack(">d", bytes.fromhex(x.lstrip("\x01")[4:]))[0]
    if isinstance(x, list):
        return [dec(y) for y in x]
    if isinstance(x, dict):
        return {k: dec(v) for k, v in x.items()}
    return x


def load(d):
    r = {}
    for p in glob.glob(os.path.join(d, "*.json")):
        m = re.search(r"-(PICKED(?:\+L)?|TUNED)-s(\d+)-d14-c3\.json$", p)
        if not m:
            continue
        v = dec(json.load(open(p))["v"])
        r[(m.group(1), int(m.group(2)))] = v
    return r


A, B = load(base), load(wish)
summary = {}
for bot in sorted({k[0] for k in A}):
    seeds = sorted(s for (b, s) in A if b == bot and (b, s) in B)
    rows = []
    for s in seeds:
        a, b = A[(bot, s)], B[(bot, s)]
        rows.append({
            "seed": s,
            "hours_base": a["hours"], "hours_wish": b["hours"],
            "king_base": a.get("king_day"), "king_wish": b.get("king_day"),
            "area_base": a["depth_area"], "area_wish": b["depth_area"],
            "best14_base": a["best_day"][-1], "best14_wish": b["best_day"][-1],
            "wishes": b["wishes"], "wish_legacy": b["wish_legacy"], "wish_gold": b["wish_gold"], "wish_blocked": b["wish_blocked"],
            "legacy_points_end_base": a["legacy_points_day"][-1], "legacy_spent_end_base": a["legacy_spent_day"][-1],
            "legacy_points_end_wish": b["legacy_points_day"][-1], "legacy_spent_end_wish": b["legacy_spent_day"][-1],
            "legacy_buys_base": a.get("legacy_buys", 0), "legacy_buys_wish": b.get("legacy_buys", 0),
            "net_gold_base": sum(a["gold_day"]), "net_gold_wish": sum(b["gold_day"]),
            "identical": a == {**b, **{k: a.get(k) for k in b if k.startswith("wish") or k.startswith("legacy_")}},
        })
    ms = {}
    for i, m in enumerate(MS):
        pairs = [(r["hours_base"][i], r["hours_wish"][i]) for r in rows]
        both = [(x, y) for x, y in pairs if x is not None and y is not None]
        d = [y - x for x, y in both]
        ms[f"D{m}"] = {
            "reached_base": sum(x is not None for x, _ in pairs), "reached_wish": sum(y is not None for _, y in pairs),
            "median_h_base": st.median([x for x, _ in both]) if both else None,
            "median_h_wish": st.median([y for _, y in both]) if both else None,
            "median_delta_h": st.median(d) if d else None,
            "mean_delta_h": st.mean(d) if d else None,
            "wish_sooner": sum(x < 0 for x in d), "wish_later": sum(x > 0 for x in d), "same": sum(x == 0 for x in d),
            "max_sooner_h": -min(d) if d else None, "max_later_h": max(d) if d else None,
        }
    summary[bot] = {
        "seeds": len(rows),
        "milestones": ms,
        "wishes_median": st.median([r["wishes"] for r in rows]), "wishes_max": max(r["wishes"] for r in rows),
        "wish_legacy_median": st.median([r["wish_legacy"] for r in rows]), "wish_legacy_max": max(r["wish_legacy"] for r in rows),
        "wish_gold_median": st.median([r["wish_gold"] for r in rows]), "wish_gold_max": max(r["wish_gold"] for r in rows),
        "wish_blocked_total": sum(r["wish_blocked"] for r in rows),
        "legacy_earned_end_base_median": st.median([r["legacy_points_end_base"] + r["legacy_spent_end_base"] for r in rows]),
        "legacy_spent_end_base_median": st.median([r["legacy_spent_end_base"] for r in rows]),
        "legacy_spent_end_wish_median": st.median([r["legacy_spent_end_wish"] for r in rows]),
        "net_gold_base_median": st.median([r["net_gold_base"] for r in rows]),
        "net_gold_wish_median": st.median([r["net_gold_wish"] for r in rows]),
        "king_base": sorted(r["king_base"] or 99 for r in rows), "king_wish": sorted(r["king_wish"] or 99 for r in rows),
        "area_delta_median": st.median([r["area_wish"] - r["area_base"] for r in rows]),
        "best14_delta": [r["best14_wish"] - r["best14_base"] for r in rows],
        "rows": rows,
    }
json.dump(summary, open(out, "w"), indent=1)
for bot, s in summary.items():
    print(f"== {bot}: {s['seeds']} seeds; wishes med {s['wishes_median']} max {s['wishes_max']}; Legacy med {s['wish_legacy_median']} max {s['wish_legacy_max']}; Gold med {s['wish_gold_median']} max {s['wish_gold_max']}; blocked {s['wish_blocked_total']}")
    print(f"   base Legacy earned (end, med) {s['legacy_earned_end_base_median']} spent med base {s['legacy_spent_end_base_median']} / wish {s['legacy_spent_end_wish_median']}; net gold med {s['net_gold_base_median']} -> {s['net_gold_wish_median']}")
    print(f"   king base {s['king_base']}\n   king wish {s['king_wish']}\n   depth-area delta med {s['area_delta_median']}; best14 delta {s['best14_delta']}")
    for m, v in s["milestones"].items():
        print(f"   {m}: reached {v['reached_base']}/{v['reached_wish']} med h {v['median_h_base']} -> {v['median_h_wish']} dmed {v['median_delta_h']} dmean {v['mean_delta_h'] and round(v['mean_delta_h'],2)} sooner/later/same {v['wish_sooner']}/{v['wish_later']}/{v['same']} max sooner {v['max_sooner_h']} later {v['max_later_h']}")
