import init, { Game } from "../../../web/src/engine/pkg/idlever_wasm.js";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const sha = (x) => createHash("sha256").update(x).digest("hex");
const wasm = readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm");
await init({ module_or_path: wasm });
const root = "docs/evidence/cut291/wasm";
mkdirSync(root, { recursive: true });
const cases = [];
for (const scene of ["gas", "pack"]) {
  for (const permission of ["locked", "learned"]) {
    const path =
      permission === "locked"
        ? `target/cut290/loadout-${scene}-sword-fire3/after.json`
        : `target/cut290/purchase-${scene}-throw/after.json`;
    const input = readFileSync(path, "utf8"); // Pass original u64-bearing JSON directly to Rust.
    const game = Game.fromSave(input);
    assert.equal(JSON.parse(game.vocabulary()).why_gloss["not learned"], "learn ability first");
    game.equipPackage("gas_step", 0);
    game.setTacticVariant("gas_step", 1);
    game.send();
    const events = [];
    for (let tick = 0; tick < 50; tick++) {
      const step = JSON.parse(game.step(1));
      assert.equal(step.run_over, false);
      events.push(...step.events);
    }
    const after = game.save();
    const saved = JSON.parse(after); // Inspect only; never round-trip a parsed seed into Rust.
    const reasons = saved.run.trace.flatMap((turn) => (turn.rows ?? []).map((row) => row.why));
    const count = reasons.filter((why) => why === "not learned").length;
    if (scene === "gas" && permission === "locked") {
      assert.equal(count, 5);
      assert.ok(events.some((e) => e.k === "callout" && e.why === "learn Throw first"));
    }
    if (permission === "learned") assert.equal(count, 0);
    const label = `${scene}-${permission}`;
    writeFileSync(`${root}/${label}-input.json.gz`, gzipSync(input));
    writeFileSync(`${root}/${label}-after.json.gz`, gzipSync(after));
    writeFileSync(`${root}/${label}-events.json`, JSON.stringify(events));
    cases.push({
      scene,
      permission,
      inputSha256: sha(input),
      afterSha256: sha(after),
      learningReasons: count,
    });
    game.free();
  }
}
writeFileSync(
  `${root}/report.json`,
  JSON.stringify(
    { wasmSha256: sha(wasm), wasmBytes: wasm.length, cases, status: "PASS" },
    null,
    2,
  ) + "\n",
);
process.stdout.write(
  "PASS real public-WASM vocabulary and four earned locked/learned throw prefixes\n",
);
