#!/usr/bin/env node
// Quantify the each-system bar's `pets` clause from the gate's own cached legs.
// The bar compares unpaired means of (deaths/sends) over the first n seeds of TUNED vs
// TUNED-pets (dayplayer.rs, `_ =>`/`"pets"` arm). This reads the same legs the audit used.
import { readdirSync, readFileSync } from "node:fs";

const dir = "target/gates/dp";
const legs = new Map(); // key -> config -> seed -> {deaths, sends}
const re = /^src([0-9a-f]{16})-(.+)-s(\d+)-d(\d+)-c(\d+)\.json$/;
for (const f of readdirSync(dir)) {
  const m = re.exec(f);
  if (!m) continue;
  const [, key, config, seed, day] = m;
  const j = JSON.parse(readFileSync(`${dir}/${f}`, "utf8"));
  const v = j.v ?? j;
  if (typeof v.deaths !== "number" || typeof v.sends !== "number") continue;
  const byKey = legs.get(key) ?? new Map();
  legs.set(key, byKey);
  const byCfg = byKey.get(config) ?? new Map();
  byKey.set(config, byCfg);
  const cur = byCfg.get(+seed) ?? { deaths: 0, sends: 0, day: 0 };
  if (+day > cur.day) byCfg.set(+seed, { deaths: v.deaths, sends: v.sends, day: +day });
}

const med = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const report = [];
for (const [key, byCfg] of legs) {
  const with_ = byCfg.get("TUNED"),
    without = byCfg.get("TUNED-pets");
  if (!with_ || !without) continue;
  const seeds = [...with_.keys()].filter((s) => without.has(s)).sort((a, b) => a - b);
  if (seeds.length < 4) continue;
  const rate = (cfg, s) => cfg.get(s).deaths / Math.max(1, cfg.get(s).sends);
  const a = seeds.map((s) => rate(with_, s)),
    b = seeds.map((s) => rate(without, s));
  const diffs = seeds.map((_, i) => a[i] - b[i]);
  const nWorse = diffs.filter((d) => d > 0).length,
    nBetter = diffs.filter((d) => d < 0).length;
  // paired sign test, two-sided, exact binomial
  const n = nWorse + nBetter;
  let p = 0;
  const choose = (n, k) => {
    let r = 1;
    for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
    return r;
  };
  for (let k = 0; k <= n; k++) if (Math.abs(k - n / 2) >= Math.abs(nWorse - n / 2)) p += choose(n, k);
  p /= 2 ** n;
  report.push({
    key,
    seeds: seeds.length,
    meanWith: a.reduce((x, y) => x + y, 0) / a.length,
    meanWithout: b.reduce((x, y) => x + y, 0) / b.length,
    medianWith: med(a),
    medianWithout: med(b),
    meanDiff: diffs.reduce((x, y) => x + y, 0) / diffs.length,
    seedsPetsWorse: nWorse,
    seedsPetsBetter: nBetter,
    signTestP: p,
    clausePasses: a.reduce((x, y) => x + y, 0) / a.length < b.reduce((x, y) => x + y, 0) / b.length,
  });
}
report.sort((x, y) => y.seeds - x.seeds);
console.log(JSON.stringify({ source: "target/gates/dp cached dayplayer legs (per-seed deaths/sends at the deepest cached day)", report }, null, 2));
