#!/usr/bin/env node
// Cut235 acceptance: 16 paired seeds; each PICKED feat hire <= the count median
// on at least 14 seeds; PICKED days 2–7 gap <=24h, DAILY <=48h.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
const WORKERS = ["apprentice", "clerk", "drillmaster", "kennel_hand", "herald", "guide", "kennel_keeper"];
export function median(values) {
  const s = values.slice().sort((a, b) => a - b);
  assert(s.length, "empty median");
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
export function paired(base, next, bot) {
  const select = rows => rows.filter(r => r.bot === bot).sort((a, b) => a.seed - b.seed);
  const before = select(base), after = select(next);
  for (const rows of [before, after]) assert.deepEqual(rows.map(r => r.seed), Array.from({ length: 16 }, (_, i) => i + 1), `${bot}: exactly seeds 1–16 required, without duplicates`);
  return after.map((row, i) => [before[i], row]);
}
export function hire(row, worker) {
  const beat = row.timeline.find(b => b.k === `hire:${worker}`);
  return beat ? Math.max(0, beat.m / 60) : Infinity;
}
export function laterGap(row) {
  const times = [...new Set(row.timeline.filter(b => !b.minor && b.m >= 24 * 60 && b.m <= 168 * 60).map(b => b.m / 60))].sort((a, b) => a - b);
  let last = 24, gap = 0;
  for (const time of [...times, 168]) { gap = Math.max(gap, time - last); last = time; }
  return gap;
}
export function compare(base, next, bots) {
  const failures = [], results = {};
  for (const bot of bots) {
    const pairs = paired(base, next, bot);
    const workers = WORKERS.map(worker => {
      const countMedian = median(pairs.map(([b]) => hire(b, worker)));
      const featMedian = median(pairs.map(([, n]) => hire(n, worker)));
      const belowMedian = pairs.filter(([, n]) => Number.isFinite(hire(n, worker)) && hire(n, worker) <= countMedian + 1e-9).length;
      const pairedEarlier = pairs.filter(([b, n]) => Number.isFinite(hire(n, worker)) && hire(n, worker) <= hire(b, worker) + 1e-9).length;
      if (!Number.isFinite(countMedian)) failures.push(`${bot}/${worker}: missing baseline hire median`);
      if (bot === "PICKED" && belowMedian < 14) failures.push(`${bot}/${worker}: ${belowMedian}/16 hires <= count median, requires >=14/16`);
      return { worker, countMedian, featMedian, belowMedian, pairedEarlier };
    });
    const gaps = pairs.map(([, n]) => ({ seed: n.seed, gap: laterGap(n) }));
    const bar = bot === "PICKED" ? 24 : bot === "DAILY" ? 48 : null;
    if (bar !== null) for (const { seed, gap } of gaps) if (gap > bar + 1e-9) failures.push(`${bot} seed ${seed}: days 2–7 gap ${gap}h > ${bar}h`);
    results[bot] = { workers, gaps, bar };
  }
  return { results, failures };
}
const fmt = h => Number.isFinite(h) ? h < 1 ? `${(h * 60).toFixed(2)}m` : `${h.toFixed(2)}h` : "—";
function main() {
  const args = process.argv.slice(2), bi = args.indexOf("--bots");
  const bots = bi >= 0 ? args[bi + 1].split(",") : ["PICKED", "DAILY", "AWAY"];
  assert(bots.includes("PICKED"), "PICKED acceptance cannot be omitted");
  const load = path => {
    const data = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(data.seeds, 16, `${path}: 16-seed capture required`);
    assert(data.days >= 14, `${path}: full14-day capture required`);
    return data.runs;
  };
  const result = compare(load(args[0]), load(args[1]), bots);
  for (const [bot, { workers, gaps, bar }] of Object.entries(result.results)) {
    console.log(`\n### ${bot} (16 seeds)\n\n| worker | count median | feat median | feat <= count median | feat <= paired count |\n|---|---|---|---|---|`);
    for (const w of workers) console.log(`| ${w.worker} | ${fmt(w.countMedian)} | ${fmt(w.featMedian)} | ${w.belowMedian}/16 | ${w.pairedEarlier}/16 |`);
    console.log(`days 2–7 max gap: ${Math.max(...gaps.map(g => g.gap)).toFixed(2)}h${bar === null ? " (diagnostic)" : ` (bar ${bar}h)`}`);
  }
  for (const failure of result.failures) console.error(`FAIL: ${failure}`);
  if (result.failures.length) process.exitCode = 1;
  else console.log("PASS: Cut235 hire and days 2–7 cadence acceptance");
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
