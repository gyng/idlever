#!/usr/bin/env node
// Cut235: per bot × seed, each feat worker's hire (player hours, timeline `hire:<w>`) before (counts) and after (feats);
// the bar: the feat hire no later than the count hire on ≥ 14/16 seeds (PICKED), and the base median for reference.
//   node docs/evidence/cut235/hire-compare.mjs BASE.json NEW.json [--bots PICKED,DAILY,AWAY]
import { readFileSync } from "node:fs";
const [baseFile, newFile] = process.argv.slice(2);
const bi = process.argv.indexOf("--bots");
const bots = bi > 0 ? process.argv[bi + 1].split(",") : ["PICKED", "DAILY", "AWAY"];
const W = ["apprentice", "clerk", "drillmaster", "kennel_hand", "herald", "guide", "kennel_keeper"];
const load = (f) => JSON.parse(readFileSync(f, "utf8")).runs;
const base = load(baseFile),
  next = load(newFile);
const hire = (r, w) => {
  const b = r.timeline.find((x) => x.k === `hire:${w}`);
  return b ? (b.m < 0 ? 0 : b.m / 60) : Infinity;
};
const med = (v) => {
  const s = v.slice().sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN;
};
const fmt = (h) => (Number.isFinite(h) ? (h < 1 ? `${(h * 60).toFixed(0)}m` : `${h.toFixed(0)}h`) : "—");
for (const bot of bots) {
  const B = base.filter((r) => r.bot === bot).sort((a, b) => a.seed - b.seed);
  const N = next.filter((r) => r.bot === bot).sort((a, b) => a.seed - b.seed);
  if (!B.length || !N.length) continue;
  console.log(`\n### ${bot} (${N.length} seeds)\n`);
  console.log("| worker | count median | feat median | feat ≤ count (seeds) | feat ≤ count median (seeds) | earlier by (median h) |");
  console.log("|---|---|---|---|---|---|");
  for (const w of W) {
    const pairs = N.map((n) => [hire(B.find((b) => b.seed === n.seed), w), hire(n, w)]);
    const bm = med(pairs.map((p) => p[0])),
      nm = med(pairs.map((p) => p[1]));
    const le = pairs.filter(([b, n]) => n <= b + 1e-9).length;
    const leMed = pairs.filter(([, n]) => n <= bm + 1e-9).length;
    const gain = med(pairs.filter(([b, n]) => Number.isFinite(b) && Number.isFinite(n)).map(([b, n]) => b - n));
    console.log(`| ${w} | ${fmt(bm)} | ${fmt(nm)} | ${le}/${pairs.length} | ${leMed}/${pairs.length} | ${Number.isFinite(gain) ? gain.toFixed(0) : "—"} |`);
  }
}
