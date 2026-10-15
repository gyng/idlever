// Exact repeated public-path evidence: metadata and output paths differ by attempt;
// immutable inputs, complete raw output hashes and actual/replayed outcomes must match.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
const [left, right, output] = process.argv.slice(2);
assert(left && right && output, 'Usage: compare-revalidations.mjs LEFT_DIR RIGHT_DIR OUTPUT.json');
assert(!existsSync(output), 'Preserve every earlier comparison');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const bytes = [left, right].map((p) => readFileSync(`${p}/results.json`));
const [a, b] = bytes.map((r) => JSON.parse(r));
assert.equal(a.status, 'PASS');
assert.equal(b.status, 'PASS');
for (const k of ['wasmSha256', 'preparedSha256', 'scriptSha256']) assert.equal(a[k], b[k], k);
assert.equal(a.cases.length, 10);
assert.equal(b.cases.length, 10);
const rows = a.cases.map((x, i) => {
  const y = b.cases[i];
  for (const key of ['id', 'weapon', 'input', 'inputRawSha256', 'runId']) assert.equal(x[key], y[key], key);
  for (const key of ['checks', 'actual', 'replay', 'watched', 'watchedCalls', 'firstSentHero', 'firstSentWeapon']) assert.deepEqual(x[key], y[key], key);
  assert.equal(x.status, 'PASS');
  assert.equal(y.status, 'PASS');
  assert.deepEqual(Object.keys(x.artifacts), Object.keys(y.artifacts));
  for (const k of Object.keys(x.artifacts)) {
    for (const entry of [x.artifacts[k], y.artifacts[k]]) assert.equal(sha(gunzipSync(readFileSync(entry.path))), entry.rawSha256, `${k}: actual artifact bytes`);
    assert.equal(x.artifacts[k].rawSha256, y.artifacts[k].rawSha256, `${x.id}/${x.weapon}: ${k}`);
  }
  return { id: x.id, weapon: x.weapon, exactArtifacts: Object.keys(x.artifacts).length, actual: x.actual, replay: x.replay };
});
writeFileSync(output, JSON.stringify({ recordedAtUtc: new Date().toISOString(), scope: 'Exact repeatability of all ten corrected earned within-class experiments; no broader class recommendation or complete R4/fun verdict', wasmSha256: a.wasmSha256, attempts: [left, right], resultSha256: bytes.map(sha), scriptSha256: sha(readFileSync(new URL(import.meta.url))), status: 'PASS', rows }, null, 2) + '\n');
console.log(`PASS: ${rows.length} earned cases repeat exactly across ${rows.reduce((n, r) => n + r.exactArtifacts, 0)} complete artifacts`);
