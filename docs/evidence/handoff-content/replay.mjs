// Bounded read-only reconstruction of one existing earned capsule, no sends/ticks on its parent.
// Run: node docs/evidence/handoff-content/replay.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync, gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { Game, initSync } from "../../../web/src/engine/pkg/idlever_wasm.js";
const out = new URL("./", import.meta.url);
const sha = (x) => createHash("sha256").update(x).digest("hex");
const inputPath = new URL("../handoff-menus/input.game.json.gz", import.meta.url);
const compressed = readFileSync(inputPath), input = gunzipSync(compressed).toString();
const wasm = readFileSync(new URL("../../../web/src/engine/pkg/idlever_wasm_bg.wasm", import.meta.url));
initSync({ module: wasm });
const game = new Game(1);
game.load(input);
const before = game.save();
const replay = JSON.parse(game.replay(131));
if (!replay) throw new Error("No saved capsule131");
const after = game.save();
if (before !== after) throw new Error("Read-only replay changed parent save");
writeFileSync(new URL("run131.replay.json.gz", out), gzipSync(JSON.stringify(replay)));
const rows = replay.floors.map((f) => ({
  depth: f.snapshot.depth, biome: f.snapshot.biome,
  entities: f.snapshot.entities.map((e) => ({id:e.id,kind:e.kind,x:e.x,y:e.y,hp:e.hp,tags:e.tags})),
  events: f.events.length,
  eventKinds: [...new Set(f.events.map((e) => e.k))],
  namedThreatEvents: f.events.filter((e) => /gas|drain|armour|bell!|reflect|summon/.test(JSON.stringify(e))),
}));
const expected = JSON.parse(input).lineage.run_log.find((r) => r.id === 131);
writeFileSync(new URL("run131-summary.json", out), JSON.stringify({
  input: "docs/evidence/handoff-menus/input.game.json.gz", inputGzipSha256: sha(compressed),
  inputTextSha256: sha(input), wasmSha256:sha(wasm), wasmBytes:wasm.length,
  operation:"Game.load(existing earned save); Game.replay(131); no new send, choice, tick or offline advance",
  scope:"Current-runtime reconstruction from actual saved departure capsule; historical per-event identity unavailable",
  parentSaveBeforeSha256:sha(before),parentSaveAfterSha256:sha(after),exactSaveUnchanged:before===after,
  expectedHistoricalRunLog:expected,reconstructedTicks:replay.ticks,reconstructedHash:replay.hash,
  ticksMatchRecorded:replay.ticks===expected.turns,floors:rows,
},null,2)+"\n");
console.log(JSON.stringify({floors:rows.length,ticks:replay.ticks,expectedTicks:expected.turns,unchanged:before===after}));
game.free();
