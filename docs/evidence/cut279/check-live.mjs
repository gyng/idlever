import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const [commit, wasmSha] = process.argv.slice(2);
assert.match(commit ?? "", /^[a-f0-9]{40}$/);
assert.match(wasmSha ?? "", /^[a-f0-9]{64}$/);
const base = "https://dev.idlever.awoo.party/";
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function get(path) {
  const response = await fetch(new URL(path, base), { cache: "no-cache" });
  assert.equal(response.status, 200, `${path} HTTP status`);
  return response;
}
const metaResponse = await get("meta.json");
assert.match(metaResponse.headers.get("content-type"), /^application\/json/);
assert.equal(metaResponse.headers.get("access-control-allow-origin"), "*");
assert.match(metaResponse.headers.get("cache-control"), /no-cache/);
const metadata = await metaResponse.json();
assert.equal(metadata.schemaVersion, 1);
assert.equal(metadata.commit, commit);
assert.match(metadata.updatedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
assert.equal((await (await get("meta.json")).json()).updatedAt, metadata.updatedAt);
assert.equal(metadata.changelogUrl, "https://github.com/gyng/idlever/releases");
assert.match(metadata.previewImage.alt, /\S/);
assert.match(metadata.previewImage.url, /^preview-[a-f0-9]{16}\.webp$/);
const previewResponse = await get(metadata.previewImage.url);
assert.match(previewResponse.headers.get("content-type"), /^image\/webp/);
const preview = Buffer.from(await previewResponse.arrayBuffer());
assert.ok(metadata.previewImage.url.includes(sha(preview).slice(0, 16)));
const sw = await (await get("sw.js")).text();
assert.ok(sw.includes('new URL("meta.json", self.registration.scope)'));
assert.ok(sw.includes("event.stopImmediatePropagation()"));
const html = await (await get("")).text();
const mainURL = /src="([^"]+\/assets\/[^\"]+\.js)"/.exec(html)?.[1]
  ?? /src="(\/assets\/[^\"]+\.js)"/.exec(html)?.[1];
assert.ok(mainURL, "production JS entry");
const main = await (await get(mainURL)).text();
assert.ok(main.includes(commit.slice(0, 12)), "clean build commit in bundle");
const workerURL = /["'`](\/assets\/worker-[^"'`]+\.js)["'`]/.exec(main)?.[1];
assert.ok(workerURL, "real engine worker");
const worker = await (await get(workerURL)).text();
const wasmURL = /["'`](\/assets\/[^"'`]+\.wasm)["'`]/.exec(worker)?.[1];
assert.ok(wasmURL, "real WASM URL");
const wasmResponse = await get(wasmURL);
assert.match(wasmResponse.headers.get("content-type"), /^application\/wasm/);
const wasm = Buffer.from(await wasmResponse.arrayBuffer());
assert.equal(sha(wasm), wasmSha);
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), base, metadata,
  metadataHeaders: Object.fromEntries(metaResponse.headers), previewBytes: preview.length,
  previewSha256: sha(preview), wasmURL, wasmBytes: wasm.length, wasmSha256: sha(wasm),
  checks: "PASS: live metadata, stable timestamp, preview hash, SW bypass, clean commit and shipping WASM" }, null, 2));
