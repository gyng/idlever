// Frozen before new outcomes. Descriptions are not additional inference claims.
import { readFileSync, writeFileSync } from "node:fs";
import { evaluateClaim } from "../../../tools/stat-bounds.mjs";
const spec = JSON.parse(readFileSync("docs/evidence/cut305/spec.json", "utf8"));
const rows = JSON.parse(readFileSync("target/cut305/capture/rows.json", "utf8"));
if (rows.length !== 256 || rows.some((r) => r.censored))
  throw new Error("missing/censored observations: no inference permitted");
const results = spec.claims.map(({ context, ...claim }) => {
  const role = (name) => rows.filter((r) => r.label === `${context}-${name}`);
  const on = role("worker-on");
  const off = role("paused");
  if (on.length !== 64 || off.length !== 64) throw new Error("wrong role count");
  const pairs = spec.seeds.map((state, i) => {
    if (on[i].state !== state || off[i].state !== state || on[i].index !== i || off[i].index !== i)
      throw new Error("pair identity mismatch");
    return on[i].max_depth - off[i].max_depth;
  });
  const describe = (items) => ({
    mean_max_depth: items.reduce((s, r) => s + r.max_depth, 0) / items.length,
    mean_turns: items.reduce((s, r) => s + r.turns, 0) / items.length,
    mean_carry: items.reduce((s, r) => s + r.carry, 0) / items.length,
    exits: Object.fromEntries(["bank", "return", "death"].map((t) => [t, items.filter((r) => r.tier === t).length])),
  });
  return {
    context, pairs, inference: evaluateClaim(pairs, claim, spec.alpha_each),
    descriptive: {
      wins: pairs.filter((v) => v > 0).length,
      ties: pairs.filter((v) => v === 0).length,
      losses: pairs.filter((v) => v < 0).length,
      mean_difference: pairs.reduce((s, v) => s + v, 0) / pairs.length,
      worker_on: describe(on), paused: describe(off),
    },
  };
});
const summary = { scope: spec.scope, sample_units_per_context: 64, controlled_expeditions: rows.length,
  original_controls: 4, repeats: 4, censored: 0, family_alpha: spec.family_alpha,
  coupling_reserve: spec.coupling_reserve, results, adoption_authorized: false };
writeFileSync("docs/evidence/cut305/summary.json", JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
