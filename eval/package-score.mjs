#!/usr/bin/env node
// package-score: the package layer of the Idlever eval (eval/PACKAGE_EVAL.md).
// Fun stays its own score: computed by ../eval-fun/tools/fun-score.mjs from the card's fun axes,
// or from package.fun.cards (fun cards whose totals are averaged), or package.fun.score (an estimate).
// The package score never enters the fun total and fun never enters the package total.
//
//   node eval/package-score.mjs eval/package/<card>.json [--json]
//   node eval/package-score.mjs --table eval/package/*.json [--md] [--json]
//   node eval/package-score.mjs --table eval/package/*.json --drop=audio   # like-for-like without audio
//   node eval/package-score.mjs --self-test
//
// Card: any fun card (eval/SCORECARD.template.json shape) plus an optional `package` block
// (eval/PACKAGE_SCORECARD.template.json). Cards without a package block report fun only.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const PRESETS = JSON.parse(readFileSync(resolve(here, "package-presets.json"), "utf8"));
const CONF = { high: 3, medium: 2, low: 1 };

function findEvalFun() {
  if (process.env.EVAL_FUN && existsSync(process.env.EVAL_FUN)) return process.env.EVAL_FUN;
  // the repo may be a worktree several levels below the main checkout: walk up for a sibling eval-fun
  let d = resolve(here, "..");
  for (let i = 0; i < 8; i++) {
    const c = resolve(d, "..", "eval-fun");
    if (existsSync(resolve(c, "tools/fun-score.mjs"))) return c;
    d = resolve(d, "..");
  }
  return null;
}

function funOfCardFile(path) {
  const card = JSON.parse(readFileSync(path, "utf8"));
  return funOfCard(card, path);
}

// Returns { score, verdict, source, confidence } or null.
function funOfCard(card, path) {
  const scored = Array.isArray(card.axes) && card.axes.some((a) => Number(a.human) > 0);
  if (scored && path) {
    const ef = findEvalFun();
    if (ef) {
      try {
        const out = execFileSync("node", [resolve(ef, "tools/fun-score.mjs"), resolve(path), "--json"], { encoding: "utf8" });
        const j = JSON.parse(out);
        return { score: j.total, verdict: j.verdict, source: `fun axes (${j.preset}) via eval-fun`, confidence: "high", gateFails: j.gateFails };
      } catch (e) {
        return { score: null, verdict: "error", source: `eval-fun failed: ${String(e.message).split("\n")[0]}`, confidence: "low" };
      }
    }
  }
  const f = card.package?.fun;
  if (f?.cards?.length && path) {
    const scores = f.cards.map((c) => funOfCardFile(resolve(dirname(path), c))).filter((x) => x && x.score != null);
    if (scores.length) {
      const mean = scores.reduce((s, x) => s + x.score, 0) / scores.length;
      return { score: +mean.toFixed(1), verdict: funVerdict(mean), source: `mean of ${scores.length} fun card(s): ${f.cards.join(", ")}`, confidence: f.confidence ?? "medium" };
    }
  }
  if (f && f.score != null) return { score: Number(f.score), verdict: funVerdict(f.score), source: f.source ?? "estimate", confidence: f.confidence ?? "low" };
  return null;
}

const funVerdict = (t) => (t >= 85 ? "super fun" : t >= 72 ? "fun" : t >= 55 ? "promising" : "not yet");

export function scorePackage(card, path = null, drop = []) {
  const pkg = card.package;
  const fun = funOfCard(card, path);
  if (!pkg) return { game: card.game, build: card.build, fun, package: null };
  const presetId = pkg.preset ?? "idle-package";
  const preset = PRESETS.presets[presetId];
  if (!preset) throw new Error(`no package preset '${presetId}' (have: ${Object.keys(PRESETS.presets).join(", ")})`);
  const rows = [];
  let wSum = 0,
    sSum = 0,
    confSum = 0,
    confW = 0,
    desk = 0;
  const gates = [],
    unassessed = [];
  for (const def of PRESETS.dims) {
    const w = preset.weights[def.id] ?? 0;
    const e = (pkg.dims ?? []).find((d) => d.id === def.id);
    const score = e && e.score != null && !drop.includes(def.id) ? Math.max(0, Math.min(100, Number(e.score))) : null;
    const row = { id: def.id, name: def.name, weight: w, score, mode: e?.mode ?? null, confidence: e?.confidence ?? null, evidence: (e?.evidence ?? []).length };
    rows.push(row);
    if (w === 0) continue;
    if (score == null) {
      unassessed.push(def.id);
      continue;
    }
    wSum += w;
    sSum += score * w;
    confSum += (CONF[row.confidence] ?? 1) * w;
    confW += w;
    if (row.mode === "desk") desk += w;
    if (w >= PRESETS.gate.minWeight && score < PRESETS.gate.minScore) gates.push(def.id);
  }
  const total = wSum ? sSum / wSum : null;
  for (const r of rows) r.normWeight = r.score != null && wSum ? (r.weight / wSum) * 100 : 0;
  const B = PRESETS.bands;
  const band = total == null ? "unscored" : total >= B.shipReady && !gates.length ? "ship-ready" : total >= B.shippable ? "shippable" : total >= B.rough ? "niche" : "below the field";
  const kill = Object.entries(pkg.killCriteria ?? {}).filter(([, v]) => v === true).map(([k]) => k);
  const S = PRESETS.ship;
  const f = fun?.score;
  let ship = "not yet";
  if (!kill.length && total != null && f != null) {
    if (f >= S.funShip && total >= S.packageShip && !gates.length) ship = "ship";
    else if (f >= S.funEarlyAccess && total >= S.packageEarlyAccess) ship = "early access";
  }
  const O = PRESETS.overall;
  const overall = total != null && f != null ? O.fun * f + O.package * total : null;
  const meanConf = confW ? confSum / confW : null;
  return {
    game: card.game,
    build: card.build,
    evaluator: card.evaluator,
    preset: presetId,
    basis: pkg.basis ?? "",
    fun,
    package: {
      total: total == null ? null : +total.toFixed(1),
      band,
      gates,
      unassessed,
      kill,
      deskShare: wSum ? +((desk / wSum) * 100).toFixed(0) : null,
      confidence: meanConf == null ? null : meanConf >= 2.5 ? "high" : meanConf >= 1.75 ? "medium" : "low",
      rows,
    },
    ship,
    overall: overall == null ? null : +overall.toFixed(1),
  };
}

function printOne(r) {
  console.log(`${r.game ?? "game"} · ${r.build ?? ""} · package preset ${r.preset ?? "-"}`);
  if (r.fun) console.log(`fun ${r.fun.score ?? "?"} (${r.fun.verdict}) — ${r.fun.source}${r.fun.gateFails?.length ? ` · fun gates: ${r.fun.gateFails.join(", ")}` : ""}`);
  else console.log("fun: not scored");
  if (!r.package) return console.log("no package block");
  console.log(`${"dimension".padEnd(34)} ${"w%".padStart(5)} ${"score".padStart(5)}  mode       conf    ev`);
  for (const d of r.package.rows) {
    if (!d.weight) continue;
    const gate = r.package.gates.includes(d.id) ? " GATE" : "";
    console.log(
      `${d.name.slice(0, 34).padEnd(34)} ${d.normWeight.toFixed(1).padStart(5)} ${(d.score == null ? "—" : String(d.score)).padStart(5)}  ${(d.mode ?? "-").padEnd(10)} ${(d.confidence ?? "-").padEnd(7)} ${d.evidence}${d.score == null ? " (unassessed)" : ""}${gate}`,
    );
  }
  const p = r.package;
  console.log(`package ${p.total} → ${p.band}${p.gates.length ? ` (gates: ${p.gates.join(", ")})` : ""}${p.kill.length ? ` KILL: ${p.kill.join(", ")}` : ""} · confidence ${p.confidence} · desk ${p.deskShare}%`);
  console.log(`ship verdict: ${r.ship} · overall (ranking only) ${r.overall ?? "—"}`);
}

function table(results, md) {
  const ids = PRESETS.dims.map((d) => d.id);
  results.sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));
  const head = ["game", ...ids, "package", "fun", "overall", "ship", "conf"];
  const lines = results.map((r) => {
    const cell = (id) => {
      const d = r.package?.rows.find((x) => x.id === id);
      if (!d || d.score == null) return "—";
      return `${d.score}${r.package.gates.includes(id) ? "!" : ""}`;
    };
    const ship = r.package?.kill?.length ? `${r.ship} (kill)` : r.ship;
    return [r.game.replace(/ \(.*\)$/, ""), ...ids.map(cell), r.package?.total ?? "—", r.fun?.score ?? "—", r.overall ?? "—", ship, r.package?.confidence ?? "—"];
  });
  if (md) {
    console.log(`| ${head.join(" | ")} |`);
    console.log(`|${head.map((h, i) => (i === 0 || h === "ship" || h === "conf" ? "---" : "---:")).join("|")}|`);
    for (const l of lines) console.log(`| ${l.join(" | ")} |`);
  } else {
    console.log(head.map((h, i) => (i === 0 ? h.padEnd(26) : h.slice(0, 7).padStart(7))).join(" "));
    for (const l of lines) console.log(l.map((c, i) => (i === 0 ? String(c).slice(0, 26).padEnd(26) : String(c).slice(0, 12).padStart(7))).join(" "));
  }
  console.log(md ? "\n`!` = gate (load-bearing dimension under 50); `—` = unassessed." : "! = gate; — = unassessed");
}

function selfTest() {
  const dims = PRESETS.dims.map((d) => ({ id: d.id, score: 62, mode: "desk", confidence: "medium", evidence: [{}] }));
  const base = { game: "T", package: { preset: "idle-package", fun: { score: 81 }, dims } };
  const a = scorePackage(base);
  const ok = [];
  ok.push(["uniform 62 → 62", Math.abs(a.package.total - 62) < 1e-9]);
  ok.push(["62 is shippable", a.package.band === "shippable"]);
  ok.push(["fun 81 + pkg 62 → early access", a.ship === "early access"]);
  const b = structuredClone(base);
  b.package.dims.forEach((d) => (d.score = 85));
  b.package.dims.find((d) => d.id === "audio").score = null;
  const rb = scorePackage(b);
  ok.push(["unassessed audio drops out", rb.package.unassessed.includes("audio") && Math.abs(rb.package.total - 85) < 1e-9]);
  ok.push(["85 + fun 81 → ship", rb.ship === "ship"]);
  b.package.dims.find((d) => d.id === "ui").score = 40;
  const rc = scorePackage(b);
  ok.push(["ui 40 gates", rc.package.gates.includes("ui") && rc.ship !== "ship"]);
  const d = structuredClone(base);
  d.package.killCriteria = { crashOrDataLoss: true };
  ok.push(["kill → not yet", scorePackage(d).ship === "not yet"]);
  ok.push(["fun-only card has no package", scorePackage({ game: "F", axes: [] }).package === null]);
  const e = structuredClone(base);
  e.package.fun.score = 75;
  ok.push(["fun 75 never ships", scorePackage(e).ship !== "ship"]);
  let fail = 0;
  for (const [n, v] of ok) {
    console.log(`${v ? "ok  " : "FAIL"} ${n}`);
    if (!v) fail++;
  }
  process.exit(fail ? 1 : 0);
}

const args = process.argv.slice(2);
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("package-score.mjs")) {
  if (args.includes("--self-test")) selfTest();
  const files = args.filter((a) => !a.startsWith("--"));
  if (!files.length) {
    console.error("usage: node eval/package-score.mjs <card.json> [--json] | --table <cards...> [--md] | --self-test");
    process.exit(2);
  }
  // --drop=audio,hook: treat those dimensions as unassessed for every card (compare like with like
  // when one card could not assess a dimension, e.g. audio for agent raters)
  const drop = (args.find((a) => a.startsWith("--drop="))?.slice(7) ?? "").split(",").filter(Boolean);
  const results = files.map((f) => scorePackage(JSON.parse(readFileSync(resolve(f), "utf8")), resolve(f), drop));
  if (args.includes("--json")) console.log(JSON.stringify(results.length === 1 && !args.includes("--table") ? results[0] : results, null, 2));
  else if (args.includes("--table")) table(results, args.includes("--md"));
  else results.forEach(printOne);
}
