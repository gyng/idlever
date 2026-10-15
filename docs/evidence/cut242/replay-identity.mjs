// Exact read-only replay/state identity after art integration. No new gameplay.
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { Game, initSync } from "../../../web/src/engine/pkg/idlever_wasm.js";
const sha=x=>createHash("sha256").update(x).digest("hex");
const input=gunzipSync(readFileSync("docs/evidence/handoff-menus/input.game.json.gz")).toString();
const wasm=readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm");
const expected=gunzipSync(readFileSync("docs/evidence/cut242/run131.replay.json.gz")).toString();
initSync({module:wasm});const game=new Game(1);game.load(input);
const before=game.save();const replay=JSON.stringify(JSON.parse(game.replay(131)));const after=game.save();
assert.equal(before,after);assert.equal(replay,expected);
const base=JSON.parse(readFileSync("docs/evidence/cut242/run131-summary.json"));
assert.equal(sha(wasm),base.wasmSha256);assert.equal(sha(before),base.parentSaveBeforeSha256);
writeFileSync("docs/evidence/cut242/replay-identity.json",JSON.stringify({
 scope:"Read-only existing earned capsule131 reconstruction; no sends/choices/advance, original historical tick mismatch remains",
 node:process.version,wasmSha256:sha(wasm),inputTextSha256:sha(input),
 exactParentSaveUnchanged:true,parentSaveBeforeSha256:sha(before),parentSaveAfterSha256:sha(after),
 replayByteIdenticalToBeforeArt:true,replayJsonSha256:sha(replay),replayHash:JSON.parse(replay).hash,
},null,2)+"\n");game.free();console.log("Exact save unchanged; replay JSON byte-identical before/after art; WASM unchanged.");
