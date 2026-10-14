#!/usr/bin/env node
// Cut231 §4: summarize a dayplayer unlock timeline (`dayplayer --timeline FILE`) into markdown tables: per bot, each
// milestone's player time (median, p10, p90, worst, seeds reached) and the first-30-min cadence. Diagnostic only.
//   node tools/timeline-summary.mjs FILE [--bots IDLE,PICKED] [--json OUT]
// Times are player time: the first session's own clock, then each check-in's return (3 a day by default: an
// unlock that happens during an absence is stamped at the return that shows it, as the player finds it).
import { readFileSync, writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const file = argv[0]?.startsWith("--") ? null : argv[0];
if (!file) {
  console.error("usage: node tools/timeline-summary.mjs FILE [--bots IDLE,PICKED] [--json OUT]");
  process.exit(2);
}
const opt = (k) => (argv.indexOf(k) >= 0 ? argv[argv.indexOf(k) + 1] : null);
const data = JSON.parse(readFileSync(file, "utf8"));
const want = opt("--bots")?.split(",");
const WORKERS = [
  "porter",
  "scout",
  "apprentice",
  "clerk",
  "drillmaster",
  "kennel_hand",
  "herald",
  "guide",
  "kennel_keeper",
];
const CORE = ["porter", "scout", "apprentice"];

const first = (r, pred) => {
  let best = Infinity;
  for (const b of r.timeline) if (b.m >= 0 && pred(b.k) && b.m < best) best = b.m;
  return best;
};
const at = (r, key) => first(r, (k) => k === key);
const baseline = (r, key) => r.timeline.some((b) => b.m < 0 && b.k === key);
const hire = (r, w) => (baseline(r, `hire:${w}`) ? 0 : at(r, `hire:${w}`));

/** Each milestone: [label, minutes of one seed's run]. */
const MILESTONES = [
  [
    "First automation (first hire)",
    (r) => first(r, (k) => k.startsWith("hire:") && k !== "hire:quartermaster"),
  ],
  ["Porter hired (auto haul)", (r) => hire(r, "porter")],
  ["Scout hired (auto send · offline uncapped)", (r) => hire(r, "scout")],
  [
    "Core loop automated (porter + scout + apprentice)",
    (r) => Math.max(...CORE.map((w) => hire(r, w))),
  ],
  ...WORKERS.slice(2).map((w) => [`Hire: ${w}`, (r) => hire(r, w)]),
  ["All workers hired", (r) => Math.max(...WORKERS.map((w) => hire(r, w)))],
  ["First worker rank offered", (r) => first(r, (k) => k.startsWith("rankable:"))],
  ["First worker rank bought", (r) => first(r, (k) => k.startsWith("rank:"))],
  ["First death", (r) => at(r, "death:first")],
  [
    "First new package (beyond the start)",
    (r) => first(r, (k) => k.startsWith("pkg:") && !baseline(r, k)),
  ],
  ["Forge plot offered", (r) => at(r, "plot:blacksmith")],
  ["Forge built", (r) => at(r, "built:blacksmith")],
  ["Kennel built", (r) => at(r, "built:kennel")],
  ["Bank built", (r) => at(r, "built:bank")],
  ["Temperament (six delves)", (r) => at(r, "system:six delves")],
  ["Stances system (meet Captain)", (r) => at(r, "system:meet Captain")],
  ["Tactics/quests/start (slay Warlord)", (r) => at(r, "system:slay Warlord")],
  ["Second class", (r) => at(r, "system:second class")],
  ["Pen (meet Mother)", (r) => at(r, "system:meet Mother")],
  ["Orders/automations · tactic 2 (meet Lich)", (r) => at(r, "system:meet Lich")],
  ["Oath (route2/heir pick)", (r) => at(r, "system:an oath kept")],
  ["Bloodline 2 affordable (house + $250)", (r) => at(r, "bloodline2:affordable")],
  ["First Legacy offer affordable", (r) => at(r, "legacy:offer")],
  ["First Legacy spend (reset-like beat)", (r) => at(r, "legacy:spent")],
  ["Reclone", (r) => at(r, "reclone")],
  ["First boss slain", (r) => first(r, (k) => k.startsWith("boss:"))],
  ...[8, 13, 18, 23, 28, 33].map((d) => [`Record D${d}`, (r) => at(r, `record:D${d}`)]),
  ["King attempted", (r) => at(r, "king:try")],
  ["King slain", (r) => at(r, "king:slain")],
];

const fmt = (m) => {
  if (!Number.isFinite(m)) return "—";
  if (m < 90) return `${m.toFixed(1)}m`;
  if (m < 48 * 60) return `${(m / 60).toFixed(1)}h`;
  return `${(m / 1440).toFixed(1)}d`;
};
const pct = (sorted, p) =>
  sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))];
const median = (sorted) => {
  const n = sorted.length;
  return n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
};

const UNIT_EACH = new Set(["lit", "plot", "system"]);
const unit = (k) => (UNIT_EACH.has(k.split(":")[0]) ? k : k.split(":")[0]);
/** A reveal's own offer, merged into the reveal (the `coupled` count): the forge's plot with "four delves", the
 * temperaments with "six delves", the kennel's plot with "first tame", the bank's with "a night's purse", the first chest
 * with "first gold home". */
const COUPLED = [
  ["system:four delves", (k) => k === "plot:blacksmith"],
  ["system:six delves", (k) => k === "pkg"],
  ["system:first tame", (k) => k === "plot:kennel"],
  ["system:a night's purse", (k) => k === "plot:bank"],
  ["system:first gold home", (k) => k === "chest"],
];
const coupledCount = (units) => {
  const u = new Set(units);
  for (const [sys, own] of COUPLED) if (u.has(sys)) for (const x of u) if (own(x)) u.delete(x);
  return u.size;
};
/** The first-30-min cadence (as the dayplayer's `cadence`): gap over major beats; `loose` counts minor beats too. */
function cadence(r, win = 30, loose = false) {
  const end = Math.min(win, Math.max(0, r.session_m));
  const ts = [
    ...new Set(
      r.timeline.filter((b) => (loose || !b.minor) && b.m >= 0 && b.m <= end).map((b) => b.m),
    ),
  ].sort((a, b) => a - b);
  let gap = 0;
  let last = 0;
  for (const t of [...ts, end]) {
    gap = Math.max(gap, t - last);
    last = t;
  }
  let most = 0;
  let mostAt = null;
  let coupled = 0;
  for (const t of ts) {
    const u = new Set(r.timeline.filter((b) => b.d && !b.minor && b.m === t).map((b) => unit(b.k)));
    coupled = Math.max(coupled, coupledCount(u));
    if (u.size > most) {
      most = u.size;
      mostAt = [t, [...u]];
    }
  }
  return { gap, most, mostAt, coupled, beats: ts.length, end };
}
/** The longest gap (hours) between major beats seen over days [from, to] (check-in granularity). */
function laterGap(r, fromH, toH) {
  const ts = [
    ...new Set(
      r.timeline
        .filter((b) => !b.minor && b.m >= fromH * 60 && b.m <= toH * 60)
        .map((b) => b.m / 60),
    ),
  ].sort((a, b) => a - b);
  let gap = 0;
  let last = fromH;
  for (const t of [...ts, toH]) {
    gap = Math.max(gap, t - last);
    last = t;
  }
  return gap;
}

const bots = [...new Set(data.runs.map((r) => r.bot))].filter((b) => !want || want.includes(b));
const json = {};
for (const bot of bots) {
  const runs = data.runs.filter((r) => r.bot === bot).sort((a, b) => a.seed - b.seed);
  const n = runs.length;
  console.log(`\n### ${bot} (${n} seeds × ${data.days} days, ${data.checkins} check-ins/day)\n`);
  console.log("| Milestone | median | p10 | p90 | worst | reached |");
  console.log("|---|---|---|---|---|---|");
  json[bot] = { milestones: {}, cadence: {} };
  for (const [label, f] of MILESTONES) {
    const v = runs.map(f).sort((a, b) => a - b);
    const reached = v.filter(Number.isFinite).length;
    if (!reached) {
      console.log(`| ${label} | — | — | — | — | 0/${n} |`);
      json[bot].milestones[label] = { reached: 0, n };
      continue;
    }
    const row = {
      median: median(v),
      p10: pct(v, 0.1),
      p90: pct(v, 0.9),
      worst: v[n - 1],
      reached,
      n,
    };
    json[bot].milestones[label] = row;
    console.log(
      `| ${label} | ${fmt(row.median)} | ${fmt(row.p10)} | ${fmt(row.p90)} | ${fmt(row.worst)} | ${reached}/${n} |`,
    );
  }
  const c = runs.map((r) => cadence(r));
  const cl = runs.map((r) => cadence(r, 30, true));
  const s = (xs) => xs.slice().sort((a, b) => a - b);
  const gaps = s(c.map((x) => x.gap));
  const loose = s(cl.map((x) => x.gap));
  const decs = s(c.map((x) => x.most));
  const later = s(runs.map((r) => laterGap(r, 24, 168)));
  const session = s(runs.map((r) => r.session_m));
  json[bot].cadence = { gap: gaps, loose, decisions: decs, later_gap_h: later, session_m: session };
  console.log(
    `\nfirst-session length ${fmt(median(session))} (worst ${fmt(session[n - 1])}); cadence window = min(30 min, session)`,
  );
  console.log(
    `first-30 beat gap (major): median ${gaps.length ? median(gaps).toFixed(1) : "-"} · p90 ${pct(gaps, 0.9).toFixed(1)} · worst ${gaps[n - 1].toFixed(1)} min; ≤ 6 min on ${c.filter((x) => x.gap <= 6).length}/${n}`,
  );
  console.log(
    `first-30 beat gap (with record floors/class levels): median ${median(loose).toFixed(1)} · worst ${loose[n - 1].toFixed(1)} min`,
  );
  console.log(
    `most new decisions in one look (first 30): median ${median(decs)} · worst ${decs[n - 1]}; ≤ 1 on ${c.filter((x) => x.most <= 1).length}/${n}`,
  );
  const coupled = s(c.map((x) => x.coupled));
  json[bot].cadence.coupled = coupled;
  console.log(
    `most new decisions in one look, a reveal's own offer merged into it: median ${median(coupled)} · worst ${coupled[n - 1]}; ≤ 1 on ${c.filter((x) => x.coupled <= 1).length}/${n}`,
  );
  console.log(
    `longest major-beat gap, days 2–7 (check-in granularity): median ${median(later).toFixed(0)} h · worst ${later[n - 1].toFixed(0)} h`,
  );
  const worst = runs.map((r, i) => [r.seed, c[i]]).sort((a, b) => b[1].gap - a[1].gap)[0];
  if (worst)
    console.log(
      `worst-gap seed ${worst[0]}: ${worst[1].gap.toFixed(1)} min; busiest look ${worst[1].mostAt ? `${worst[1].mostAt[0].toFixed(1)}m: ${worst[1].mostAt[1].join(", ")}` : "-"}`,
    );
}
if (opt("--json")) writeFileSync(opt("--json"), JSON.stringify(json, null, 1));
