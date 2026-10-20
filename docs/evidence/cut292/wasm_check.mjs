import init, { Game } from "../../../web/src/engine/pkg/idlever_wasm.js";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const sha = (b) => createHash("sha256").update(b).digest("hex");
const wasm = readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm");
await init({ module_or_path: wasm });
const cases = [];
for (const scene of ["gas", "pack"])
  for (const permission of ["locked", "learned"]) {
    const label = scene + "-" + permission;
    const raw = gunzipSync(
      readFileSync(`docs/evidence/cut291/wasm/${label}-input.json.gz`),
    ).toString();
    const game = Game.fromSave(raw),
      before = game.save();
    const packages = JSON.parse(game.lineage()).packages;
    const hint = packages.all.find((p) => p.id === "gas_step").variant_needs ?? [];
    assert.deepEqual(hint, permission === "locked" ? ["", "Learn Throw"] : []);
    assert.equal(game.save(), before);
    const native = readFileSync(`target/cut292/${label}/after.json`, "utf8");
    assert.equal(native, before);
    const nativePackages = JSON.parse(readFileSync(`target/cut292/${label}/packages.json`, "utf8"));
    assert.deepEqual(nativePackages, packages);
    writeFileSync(
      `docs/evidence/cut292/${label}-packages.json`,
      JSON.stringify(packages, null, 2) + "\n",
    );
    cases.push({
      label,
      inputSha256: sha(raw),
      saveSha256: sha(before),
      wireReadSaveUnchanged: true,
      nativeWasmSaveBytesExact: true,
      variantNeeds: hint,
    });
    game.free();
  }
writeFileSync(
  "docs/evidence/cut292/wasm-results.json",
  JSON.stringify(
    { status: "PASS", wasm: { bytes: wasm.length, sha256: sha(wasm) }, cases },
    null,
    2,
  ) + "\n",
);
process.stdout.write("PASS four earned native/WASM package hints and unchanged full saves\n");
