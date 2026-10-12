#!/usr/bin/env node
// `pnpm test`: critical journeys; `test:full` / no argument: current feature audit.
// `test:exhaustive`: every discovered historical regression, with unchanged gates.
// Each test uses its own headless browser against a suite-owned no-HMR Vite server.
// Output is printed as each finishes; exit 1 if any failed.
//   node tests/run.mjs [name…]        e.g. node tests/run.mjs fights cut12 clarity:paint
// A name `file:parts` runs `tests/<file>.mjs --part=<parts>` (clarity's four parts run side by side: the whole walk was one
// 4-minute test the suite waited on — docs/ITERATION_SPEED.md, round 3); bare `clarity` and `ui` run all their parts.
import { spawn } from "node:child_process";
import { failureOutput } from "./lib/failure-output.mjs";
import { expand, selectSuite, SMOKE_AREAS } from "./lib/suites.mjs";
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import net from "node:net";
import { availableParallelism } from "node:os";
// Every tests/*.mjs but this runner, screen-time.mjs and town-gpu.mjs (timing gates the coordinator runs on the GPU).
const ALL = readdirSync("tests").filter((f) => f.endsWith(".mjs") && !["run.mjs", "screen-time.mjs", "town-gpu.mjs"].includes(f)).map((f) => f.slice(0, -4)).sort().flatMap(expand);
const selected = selectSuite(process.argv.slice(2), ALL);
const { names } = selected;
if (selected.list) {
  console.log(JSON.stringify({ ...selected, areas: selected.suite === "smoke" ? SMOKE_AREAS : undefined }, null, 2));
  process.exit(0);
}
console.log(`client suite: ${selected.suite} (${names.length} selected; ${selected.fullCount} current full; ${ALL.length} exhaustive groups)${selected.suite === "smoke" ? "; critical journeys, not full acceptance" : ""}`);
if (selected.suite === "full") console.log("Historical extra cases require --exhaustive; see docs/evidence/cut181/final-scope/current-mapping.json");
const t0 = Date.now();
// The suite's own dev server (tests/vite.test.config.ts: no watcher, no HMR) on a free port, for this run only — the shared
// :5219 server reloads every page on any edit in web/src (other agents' work) and a stale one serves old transforms. The
// tests find it through RIDDLE_PORT (tools/dev.sh); a RIDDLE_PORT set by the caller is used as it is.
let vite = null;
if (!process.env.RIDDLE_PORT) {
  const port = await new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
  vite = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort", "--config", "tests/vite.test.config.ts"], { stdio: "ignore" });
  process.env.RIDDLE_PORT = String(port);
  const up = () => fetch(`http://localhost:${port}/`).then((r) => r.ok, () => false);
  for (let i = 0; i < 120 && !(await up()); i++) await new Promise((r) => setTimeout(r, 250));
  // (the first page pre-bundles the dependencies: once, before the tests race for it)
  await fetch(`http://localhost:${port}/src/main.ts`).catch(() => {});
}
// A bounded pool, longest first: fourteen headless browsers rendering on the CPU at once starved the
// timing gates (clarity's rates, fights' holds) into flakes; the timing gates start first, then the rest
// longest first (`OWN`: each test's own seconds in a quiet suite, 2026-09-26 — cut25's real-wasm watch
// started last and ended the suite alone), sharing the remaining slots (`TEST_JOBS` overrides the width).
const TIMING = ["fights:break", "fights", "cut13", "clarity:deep", "clarity:card", "clarity:core,watch", "cut12", "boss-beat-quiet", "enemy-tips", "enemy-surfaces"];
const OWN = { cut25: 180, fights: 128, qaj: 88, "ui:keep": 40, "ui:frame": 28, "ui:stall": 25, "ui:qa": 22, "ui:cut18": 19, "ui:cut19": 18, "clarity:hold": 81, "clarity:deep": 66, cut13: 61, "clarity:card": 55, qa9: 52, screens: 47, "clarity:core,watch": 42, cut27: 38, cut23: 36, "clarity:paint": 30 };
// Measured Cut181 headless costs order the complete current inventory longest
// first. These are scheduling estimates, never test limits; new groups use20s.
const CURRENT_OWN = {
  "ambient-motes": 25,
  "ascension-refusal": 19,
  "audio": 34,
  "bloodline-founding": 48,
  "bloodline-training": 13,
  "boss-beat-quiet": 20,
  "boss-counters": 17,
  "boss-kill-beat": 96,
  "captive-fact-copy": 6,
  "checkpoint-gold": 15,
  "chrome": 48,
  "chronicle-unit-labels": 7,
  "chunky-controls": 46,
  "clarity:core,watch": 48,
  "clarity:paint": 30,
  "class-locks": 17,
  "class-styles": 18,
  "class-switch": 23,
  "combat-identity": 21,
  "combat-rules": 26,
  "compact-depth": 30,
  "companion-chrome": 21,
  "control-visibility": 29,
  "counter-name": 7,
  "ctxloss": 66,
  "cut12": 18,
  "cut122": 31,
  "cut26": 34,
  "cut28": 40,
  "cut28d": 9,
  "cut29": 85,
  "cut305": 149,
  "death-actions": 20,
  "death-fix-discovery": 27,
  "death-forecast-said": 5,
  "death-hero": 16,
  "death-price-lanes": 5,
  "debug-export": 13,
  "editor-packages": 20,
  "encounter-modifiers": 19,
  "enemy-surfaces": 28,
  "enemy-tips": 26,
  "exit-keep-close": 71,
  "fights:break": 8,
  "first-plot": 19,
  "forecast-requests": 6,
  "forge-requests": 6,
  "game-menu": 16,
  "gpu-diagnostics": 5,
  "gunner-observer": 12,
  "hero-appearance": 14,
  "hero-grounding": 11,
  "hero-names": 6,
  "hero-presence": 5,
  "hero-slot-looks": 12,
  "hero-summary": 8,
  "hero-upgrade-feedback": 21,
  "history-pick-price": 24,
  "hunger-legible": 16,
  "item-icon-fallback": 5,
  "item-icons": 18,
  "king-advice-scope": 24,
  "leeching": 28,
  "legacy-earned": 51,
  "legacy-tree": 32,
  "legacy-wire": 5,
  "live-roster": 6,
  "locked-cond": 13,
  "mirror-rhythm": 14,
  "numbered-descents": 21,
  "numbers-agree": 10,
  "package-lanes": 5,
  "package-paired": 5,
  "package-requests": 6,
  "package-selection": 12,
  "patch-overflow": 19,
  "pen-edit": 25,
  "persistent-camp": 6,
  "portrait-fallback": 12,
  "post-clear-town": 37,
  "ready-plots": 24,
  "recent-progress": 6,
  "report-actions": 5,
  "report-bosses": 9,
  "report-choices": 5,
  "report-class-xp": 5,
  "report-exit-depth": 5,
  "report-hero-upgrade": 14,
  "report-juice": 10,
  "report-reading": 7,
  "report-supply-limit": 23,
  "report-time-scope": 7,
  "rest-callout": 7,
  "return-pick": 16,
  "routine-keep": 81,
  "rules-lock": 9,
  "run-card-gold": 12,
  "run-training": 16,
  "runsui": 114,
  "screens": 53,
  "shaft-wrap": 18,
  "tactic-change": 12,
  "tactic-observer": 18,
  "take-control": 116,
  "telegraph-names": 18,
  "town-clock": 24,
  "town-save": 32,
  "training-icons": 14,
  "ui:frame": 48,
  "unit-icons": 16,
  "unit-label": 12,
  "wall-preparation": 12,
  "watch-console": 32,
  "watch-end-caption": 5,
  "watch-keepout": 6,
  "watch-live-edge": 27,
  "watch-log": 25,
  "watch-message-spacing": 20,
  "watch-meters": 15,
  "watch-normal-news": 31,
  "watch-speed-rate": 37,
  "watch-status": 21,
  "worker-first-act": 6,
  "worker-purchases": 5
};
const own = (n) => CURRENT_OWN[n] ?? OWN[n] ?? 20;
const SOLO = ["clarity:paint", "watch-live-edge"]; // edit latency and wall-clock playback need an idle browser pool
const order = [...names].sort((a, b) => (SOLO.includes(a) ? 1 : 0) - (SOLO.includes(b) ? 1 : 0) || (TIMING.includes(b) ? 1 : 0) - (TIMING.includes(a) ? 1 : 0) || (TIMING.includes(a) ? TIMING.indexOf(a) - TIMING.indexOf(b) : own(b) - own(a)));
const width = Number(process.env.TEST_JOBS ?? (selected.suite === "smoke" ? 4 : selected.suite === "full" ? Math.min(12, availableParallelism()) : 7));
const run1 = (n) => new Promise((resolve) => {
  const start = Date.now();
  const [file, parts] = n.split(":");
  const p = spawn("node", [`tests/${file}.mjs`, ...(parts ? [`--part=${parts}`] : [])], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, RIDDLE_CLIENT_AUDIT_SCOPE: selected.suite } });
  let out = "";
  p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
  p.on("close", (code) => resolve({ n, code, out, ms: Date.now() - t0, own: Date.now() - start }));
});
const printResult = (r) => {
  const last = r.out.trim().split("\n").at(-1) ?? "";
  // (the time it ended at, and its own time from its start)
  console.log(`${r.code === 0 ? "ok  " : "FAIL"} ${r.n.padEnd(15)} ${(r.ms / 1000).toFixed(1)}s (${(r.own / 1000).toFixed(1)}s)  ${last}`);
  if (r.code !== 0) { console.log(failureOutput(r.out).map((l) => "     " + l).join("\n")); }
};
// The wall-clock gates get headroom: while one runs, at most HEAVY_WIDTH (3) browsers run in all (7 CPU-rendered
// browsers beside them flaked them; the old runner kept clarity's whole walk and fights alone — 2 browsers — for
// 4 minutes). Their readings retry once when they fail on a loaded machine (tests/lib/load.mjs).
// SOLO: the real engine's edit timings (wasm in a worker, bars of 1 s and 3 s) read the machine even with three
// beside and a retry (1.3 s at a load of 31) — they run last, with nothing beside, ~30 s, on a server the other tests
// have warmed (first on a cold one its refine read 3.4 s where it reads 1.9 s warm). (The deep fixture's timings are
// notes unless RIDDLE_DEEP_GATE=1, which wants a quiet headed machine: `clarity:deep` runs as a heavy.)
const HEAVY = ["fights:break", "clarity:card", "clarity:deep", "clarity:core,watch", "fights", "cut13", "cut12", "boss-beat-quiet", "enemy-tips", "enemy-surfaces"], HEAVY_WIDTH = Number(process.env.TEST_HEAVY_WIDTH ?? (selected.suite === "exhaustive" ? 3 : 1));
const queue = [...order], done = [];
let heavyLive = 0, othersLive = 0, soloLive = 0;
const nextJob = () => {
  if (soloLive) return null;
  const live = heavyLive + othersLive;
  const i = queue.findIndex((n) => SOLO.includes(n) ? live === 0 : (heavyLive === 0 && !HEAVY.includes(n)) || live < HEAVY_WIDTH);
  return i < 0 ? null : queue.splice(i, 1)[0];
};
await Promise.all(Array.from({ length: Math.min(width, queue.length) }, async () => {
  while (queue.length) {
    const n = nextJob();
    if (!n) { await new Promise((r) => setTimeout(r, 200)); continue; }
    const kind = SOLO.includes(n) ? "solo" : HEAVY.includes(n) ? "heavy" : "other";
    if (kind === "solo") soloLive++; else if (kind === "heavy") heavyLive++; else othersLive++;
    const result = await run1(n);
    done.push(result);
    printResult(result);
    if (kind === "solo") soloLive--; else if (kind === "heavy") heavyLive--; else othersLive--;
  }
}));
const results = names.map((n) => done.find((r) => r.n === n));
const failed = results.filter(r => r.code !== 0).length;
console.log(`${failed ? "FAIL" : "ok"}: ${results.length - failed}/${results.length} client gates in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (selected.report) {
  mkdirSync(dirname(selected.report), { recursive: true });
  writeFileSync(selected.report, JSON.stringify({ suite: selected.suite, fullCount: selected.fullCount, exhaustiveCount: ALL.length, selectedCount: names.length, omitted: selected.omitted,
    viewportPolicy: selected.suite === "full" ? "34 state groups at400px;33 responsive triples at320/1440px; other matrices unchanged. Exhaustive retains all original variants." : "All original viewport variants",
    execution: { browser: process.env.RIDDLE_BROWSER ?? "headless", jobs: width, heavyWidth: HEAVY_WIDTH, availableCores: availableParallelism() },
    elapsedSeconds: (Date.now() - t0) / 1000, failed, results }, null, 2) + "\n");
}
vite?.kill();
process.exit(failed ? 1 : 0);
