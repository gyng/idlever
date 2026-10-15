// Revalidate the immutable lawful Cut246 preparations on an explicitly pinned runtime.
// Preserve every old failed attempt; this script never overwrites a result directory.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync, gzipSync } from 'node:zlib';
import { Game, initSync } from '../../../web/src/engine/pkg/idlever_wasm.js';

const sha = (s) => createHash('sha256').update(s).digest('hex');
const arg = (name) => {
  const i = process.argv.indexOf(name);
  assert(i >= 0 && process.argv[i + 1], `Required ${name}`);
  return process.argv[i + 1];
};
const out = arg('--out');
const expectedWasm = arg('--wasm-sha');
assert(out.startsWith('docs/evidence/cut246/'), 'Keep this experiment in its evidence directory');
assert(!existsSync(out), 'Preserve earlier attempts');
const wasm = readFileSync('web/src/engine/pkg/idlever_wasm_bg.wasm');
assert.equal(sha(wasm), expectedWasm, 'Runtime must be explicitly pinned');
const preparedBytes = readFileSync('docs/evidence/cut246/prepared/results.json');
const prepared = JSON.parse(preparedBytes);
assert.equal(prepared.status, 'PASS');
assert.equal(prepared.cases.length, 10);
initSync({ module: wasm });
mkdirSync(out, { recursive: true });
const result = {
  recordedAtUtc: new Date().toISOString(),
  scope: 'Ten immutable earned within-class weapon forks: public send, 8h absence, held replay, watched single-step continuation, and sliced/reloaded absence. Not five fresh class cohorts or a complete R4/fun verdict.',
  wasmSha256: expectedWasm,
  originalPreparationWasmSha256: prepared.wasmSha256,
  preparedSha256: sha(preparedBytes),
  scriptSha256: sha(readFileSync(new URL(import.meta.url))),
  cases: [],
  errors: [],
};
const write = () => writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2) + '\n');
const artifact = (name, raw) => {
  writeFileSync(`${out}/${name}.json.gz`, gzipSync(raw));
  return { path: `${out}/${name}.json.gz`, rawSha256: sha(raw) };
};
const recordOf = (g, id) => {
  const row = JSON.parse(g.lineage()).runs.find((r) => r.id === id);
  assert(row, `Run ${id} is in actual history`);
  return row;
};
// Different public paths legitimately annotate via/absence/clock differently.
// Compare the complete outcome, not those provenance fields; preserve originals.
const outcomeOf = ({ via, absence, clock_s, ...outcome }) => outcome;
for (const c of prepared.cases) {
  const games = [];
  const entry = { id: c.id, weapon: c.weapon, input: c.path, inputRawSha256: c.saveSha256, checks: {}, artifacts: {} };
  result.cases.push(entry);
  try {
    const input = gunzipSync(readFileSync(c.path)).toString();
    assert.equal(sha(input), c.saveSha256);
    const g = Game.fromSave(input); games.push(g);
    assert.equal(g.save(), input, 'Loading must not silently migrate or rewrite this earned preparation');
    const before = JSON.parse(g.lineage());
    assert.equal(before.class, c.id);
    assert.equal(before.tree.auto_send, false);
    const sent = JSON.parse(g.send());
    const sentRaw = g.save();
    const sentState = JSON.parse(sentRaw);
    const runId = sent.run.id;
    assert.equal(sent.depth, 1);
    assert.equal(sent.hero.class, c.id);
    assert.equal(sentState.run.hero.weapon.kind, c.weapon);
    entry.runId = runId;
    entry.firstSentHero = sent.hero;
    entry.firstSentWeapon = sentState.run.hero.weapon;
    entry.artifacts.sent = artifact(`${c.id}-${c.weapon}.sent-session`, sentRaw);
    const reportRaw = g.runOfflineQuick(28800);
    const report = JSON.parse(reportRaw);
    const afterRaw = g.save();
    const lineage = JSON.parse(g.lineage());
    assert.equal(lineage.tree.auto_send, false);
    assert.equal(report.runs, 1, 'Paused Scout permits only the manually sent run');
    const actual = recordOf(g, runId);
    assert.equal(report.deepest, actual.depth);
    const replayRaw = g.replay(runId);
    assert.equal(g.save(), afterRaw, 'Replay is read-only');
    const replay = JSON.parse(replayRaw);
    assert.equal(replay.run_id, runId);
    const depth = Math.max(...replay.floors.map((f) => f.snapshot.depth));
    entry.actual = actual;
    entry.replay = { ticks: replay.ticks, depth, hash: replay.hash };
    entry.checks.actualReplay = actual.turns === replay.ticks && actual.depth === depth;
    entry.artifacts.report = artifact(`${c.id}-${c.weapon}.report`, reportRaw);
    entry.artifacts.after = artifact(`${c.id}-${c.weapon}.after-session`, afterRaw);
    entry.artifacts.replay = artifact(`${c.id}-${c.weapon}.replay`, replayRaw);
    const watched = Game.fromSave(sentRaw); games.push(watched);
    let watchedCalls = 0;
    while (true) {
      const step = JSON.parse(watched.step(100));
      watchedCalls++;
      assert(watchedCalls <= 1201, 'Bounded by the existing 120000-tick run cap');
      if (step.run_over) break;
    }
    entry.watched = recordOf(watched, runId);
    entry.watchedCalls = watchedCalls;
    entry.artifacts.watched = artifact(`${c.id}-${c.weapon}.watched-session`, watched.save());
    try {
      assert.deepEqual(outcomeOf(entry.watched), outcomeOf(actual));
      entry.checks.actualWatched = true;
    } catch (e) { entry.checks.actualWatched = false; entry.watchedDifference = String(e); }
    for (const reload of [false, true]) {
      let sliced = Game.fromSave(sentRaw); games.push(sliced);
      let remaining = 28800, i = 0, sliceRaw;
      while (remaining > 0) {
        const seconds = Math.min(remaining, [1, 719, 3600][i++ % 3]);
        remaining -= seconds;
        sliceRaw = sliced.runOfflineSlice(seconds, remaining === 0);
        if (reload && remaining > 0) {
          const next = Game.fromSave(sliced.save()); games.push(next);
          sliced = next;
        }
      }
      const label = reload ? 'reloaded' : 'sliced';
      entry.checks[label] = sliced.save() === afterRaw && sliceRaw === reportRaw;
      entry.artifacts[label] = artifact(`${c.id}-${c.weapon}.${label}-session`, sliced.save());
      entry.artifacts[`${label}Report`] = artifact(`${c.id}-${c.weapon}.${label}-report`, sliceRaw);
    }
    assert.equal(sha(gunzipSync(readFileSync(c.path))), c.saveSha256, 'Immutable input');
    entry.status = Object.values(entry.checks).every(Boolean) ? 'PASS' : 'FAIL';
  } catch (e) { entry.status = 'FAIL'; entry.error = String(e.stack ?? e); result.errors.push({ id: c.id, weapon: c.weapon, error: entry.error }); }
  finally { for (const g of games) g.free(); }
  write();
  console.log(JSON.stringify({ id: entry.id, weapon: entry.weapon, status: entry.status, checks: entry.checks, actual: entry.actual, replay: entry.replay }));
}
result.status = result.cases.length === 10 && result.cases.every((c) => c.status === 'PASS') ? 'PASS' : 'FAIL';
result.finishedAtUtc = new Date().toISOString();
write();
if (result.status !== 'PASS') process.exitCode = 1;
