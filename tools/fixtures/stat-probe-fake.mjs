#!/usr/bin/env node
// Synthetic native-protocol peer for stat-tune's black-box tests. Never simulates game rules.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
const args = process.argv.slice(2);
const get = (name, fallback) => {
  const i = args.indexOf(name);
  return i < 0 ? fallback : args[i + 1];
};
const seeds = get("--seeds", "").split(",").filter(Boolean);
const bots = get("--bots", "PICKED").split(",");
const days = Number(get("--days", 1));
const checkins = Number(get("--checkins", 3));
const until = get("--until-depth", null);
const untilDepth = until === null ? null : Number(until);
const profile = JSON.parse(process.env.IDLEVER_BALANCE_JSON);
const log = process.env.STAT_PROBE_LOG;
if (log) {
  mkdirSync(dirname(log), { recursive: true });
  appendFileSync(log, JSON.stringify({ args, seeds, bots, profile }) + "\n");
}
if (process.env.STAT_PROBE_DELAY_MS)
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.STAT_PROBE_DELAY_MS)));
if (process.env.STAT_PROBE_STOP_AFTER && log) {
  const calls = readFileSync(log, "utf8").trim().split("\n").length;
  if (calls > Number(process.env.STAT_PROBE_STOP_AFTER)) process.exit(88);
}
const x = Number(profile.x ?? 0);
const manifestFile = process.env.STAT_PROBE_MANIFEST;
const confirmationSeeds = new Set(
  manifestFile && existsSync(manifestFile)
    ? JSON.parse(readFileSync(manifestFile, "utf8")).seeds.confirmation
    : [],
);
const records = seeds.flatMap((seed) =>
  bots.map((bot) => {
    const effect = profile.mode === "confirmation-loss" && confirmationSeeds.has(seed) ? 0 : x;
    const noise = profile.mode === "seeded" ? Number(BigInt(seed) % 17n) / 17 : 0;
    const best =
      profile.mode === "bot-values" && bot === "IDLE"
        ? 5
        : Math.max(0, Math.floor(10 + effect + noise));
    const arrival = profile.mode === "missing-arrival" ? null : Math.max(0.25, 12 - effect + noise);
    const depthStop =
      untilDepth !== null && best >= untilDepth && arrival !== null && arrival <= days * 24;
    return {
      seed,
      bot,
      effective_checkins_per_day: ["DAILY", "AWAY"].includes(bot) ? 1 : checkins,
      campaign_complete: !depthStop,
      stop_reason: depthStop ? "depth" : "horizon",
      completed_days: depthStop ? Math.floor(arrival / 24) : days,
      observed_hours: depthStop ? arrival : days * 24,
      best_depth: depthStop ? best : best + days - 1,
      ...(depthStop ? { depth_reached_hours: arrival } : {}),
      elapsed_seconds: depthStop ? arrival * 3600 : days * 86400,
      seed_out: {
        seed: Number(seed),
        hours: [arrival, ...Array(6).fill(null)],
        best_day: Array.from(
          { length: depthStop ? Math.floor(arrival / 24) : days },
          (_, i) => best + i,
        ),
        gold_day: Array.from(
          { length: depthStop ? Math.floor(arrival / 24) : days },
          (_, i) => 100 + effect + i,
        ),
      },
    };
  }),
);
const result = {
  schema: 1,
  kind: "dayplayer-stat-probe",
  milestones: [8, 13, 18, 23, 28, 29, 33],
  request: { seeds, bots, days, until_depth: untilDepth, checkins_per_day: checkins },
  balance: profile,
  records,
};
switch (process.env.STAT_PROBE_FAULT) {
  case "missing":
    records.pop();
    break;
  case "duplicate":
    if (records.length) records.push(records[0]);
    break;
  case "wrong-seed":
    if (records.length) records[0].seed = (BigInt(seeds[0]) ^ 1n).toString();
    break;
  case "wrong-bot":
    if (records.length) records[0].bot = "IMPOSTOR";
    break;
  case "wrong-horizon":
    result.request.days = days + 1;
    break;
  case "short-horizon":
    if (records.length) records[0].completed_days = Math.max(0, days - 1);
    break;
  case "observed-negative":
    if (records.length) records[0].observed_hours = -1;
    break;
  case "observed-too-large":
    if (records.length) records[0].observed_hours = days * 24 + 1;
    break;
  case "observed-before-arrival":
    if (records.length) records[0].observed_hours = records[0].seed_out.hours[0] - 1;
    break;
  case "elapsed-negative":
    if (records.length) records[0].elapsed_seconds = -1;
    break;
  case "elapsed-null":
    if (records.length) records[0].elapsed_seconds = null;
    break;
  case "wrong-effective-cadence":
    if (records.length) records[0].effective_checkins_per_day += 1;
    break;
  case "gold-fractional":
    if (records.length) records[0].seed_out.gold_day[0] = 100.5;
    break;
  case "best-negative":
    if (records.length) records[0].seed_out.best_day[0] = -1;
    break;
  case "depth-fractional":
    if (records.length) records[0].best_depth = 10.5;
    break;
  case "wrong-profile":
    result.balance = { ...profile, x: x + 100 };
    break;
  case "wrong-request-seed":
    result.request.seeds = ["1"];
    break;
  case "nonfinite-metric":
    if (records.length) records[0].seed_out.best_day = [null];
    break;
}
const out = get("--out");
if (!out) throw Error("fake probe requires --out");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(
  out,
  process.env.STAT_PROBE_FAULT === "invalid-json" ? "{truncated" : JSON.stringify(result),
);
