import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import init, { Game } from "../../../web/src/engine/pkg/idlever_wasm.js";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const wasm = readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm");
await init({ module_or_path: wasm });
const original = JSON.parse(readFileSync("docs/evidence/cut295/selection-absence.json"));
const receipts = [];
for (const c of original.cases) {
  if (!c.id.startsWith("caster-") || !c.id.endsWith("authored")) continue;
  const absent = Game.fromSave(readFileSync(c.inputPath, "utf8"));
  const available = JSON.parse(absent.lineage()).replays ?? [];
  assert.ok(!available.includes(c.runId));
  assert.equal(absent.replay(c.runId), "null");
  absent.free();
  const source = c.inputPath.replace("absence-after.json", "after-fine.json"),
    raw = readFileSync(source, "utf8"),
    game = Game.fromSave(raw),
    before = JSON.parse(game.save());
  const wire = JSON.parse(game.lineage());
  const ticks = Math.max(
    0,
    (before.lineage.persistent?.recovery_until_tick ?? 0) - before.lineage.total_turns,
  );
  const seconds = Math.max(wire.rest_left_s ?? 0, Math.ceil(ticks / 10));
  assert.ok(seconds > 0);
  const report = JSON.parse(game.runOfflineQuick(seconds));
  const after = game.save(),
    state = JSON.parse(after),
    ready = JSON.parse(game.lineage());
  assert.equal(report.runs, 0);
  assert.equal(state.lineage.clock_s - before.lineage.clock_s, seconds);
  assert.equal(state.lineage.gold, before.lineage.gold);
  assert.equal(state.lineage.marks, before.lineage.marks);
  assert.equal(ready.rest_left_s, 0);
  assert.ok(ready.replays.includes(c.runId));
  assert.deepEqual(
    JSON.parse(game.replay(c.runId)),
    JSON.parse(readFileSync(c.replayPath, "utf8")),
  );
  const inputPath = `target/cut295/${c.id}-recovery-paid.json`;
  writeFileSync(inputPath, after);
  receipts.push({
    id: c.id,
    absenceInputSha256: c.inputSha256,
    absenceReplayAvailable: false,
    watchedSource: source,
    watchedSourceSha256: sha(raw),
    command: { method: "runOfflineQuick", seconds },
    report,
    afterSha256: sha(after),
    goldBefore: before.lineage.gold,
    goldAfter: state.lineage.gold,
    marksBefore: before.lineage.marks,
    marksAfter: state.lineage.marks,
    clockBefore: before.lineage.clock_s,
    clockAfter: state.lineage.clock_s,
  });
  c.inputPath = inputPath;
  c.inputSha256 = sha(after);
  c.sourceKind = "watched after-fine + public recovery";
  game.free();
}
writeFileSync(
  "docs/evidence/cut295/recovery-receipts.json",
  JSON.stringify({ wasmSha256: sha(wasm), receipts }, null, 2) + "\n",
);
writeFileSync("docs/evidence/cut295/selection.json", JSON.stringify(original) + "\n");
console.log(receipts.map((r) => ({ id: r.id, seconds: r.command.seconds, runs: r.report.runs })));
