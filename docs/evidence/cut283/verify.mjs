// Independent receipt and exact-binomial reconstruction; no production inference imports.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const root = "docs/evidence/cut283";
const load = (name) => JSON.parse(readFileSync(`${root}/${name}.json`, "utf8"));
const manifest = load("manifest"),
  report = load("report"),
  state = load("state");
const jobs = JSON.parse(gunzipSync(readFileSync(`${root}/jobs.json.gz`)));
const canonical = (x) =>
  JSON.stringify(x, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
const hash = (x) => createHash("sha256").update(x).digest("hex");
assert.equal(report.identity, manifest.identity);
assert.equal(state.identity, manifest.identity);
assert.equal(state.phase, "complete");
assert.equal(state.status, "INCONCLUSIVE");
assert.equal(report.status, "INCONCLUSIVE");
assert.equal(report.canonicalGateStatus, "NOT_RUN");
assert.equal(report.winner, "gap8");
const frozen = load("frozen-winner");
assert.equal(frozen.identity, manifest.identity);
assert.equal(frozen.phase, "confirmation");
assert.deepEqual(state.winner, frozen.winner);
const profiles = manifest.spec.candidates;
const winner = profiles.find((p) => p.name === "gap8");
assert.equal(hash(canonical(winner.profile)), frozen.winner.profileSha);
assert.equal(hash(canonical(manifest.spec.claims)), frozen.winner.claimsSha);
const allSeeds = [...manifest.seeds.discovery, ...manifest.seeds.confirmation];
assert.equal(new Set(allSeeds).size, allSeeds.length);
for (const seed of allSeeds) assert.ok(typeof seed === "string" && BigInt(seed) < 2n ** 64n);
const records = new Map();
for (const job of jobs) {
  const p = job.packet;
  assert.equal(job.payloadSha, hash(canonical(p)));
  assert.equal(p.schema, 1);
  assert.equal(p.kind, "dayplayer-stat-probe");
  assert.deepEqual(p.milestones, [8, 13, 18, 23, 28, 29, 33]);
  const [seed] = p.request.seeds;
  assert.deepEqual(p.request, {
    seeds: [seed],
    bots: ["PICKED", "TUNED"],
    days: 14,
    until_depth: 33,
    checkins_per_day: 3,
  });
  assert.equal(
    job.key,
    hash(
      canonical({
        binary: manifest.native.digest,
        profile: p.balance,
        probe: manifest.spec.probe,
        seed,
      }),
    ),
  );
  const gap = p.balance.tree.guide_gap;
  assert.ok([4, 6, 8].includes(gap));
  const expected = structuredClone(winner.profile);
  expected.tree.guide_gap = gap;
  assert.deepEqual(p.balance, expected);
  const key = `${gap}/${seed}`;
  assert.ok(!records.has(key));
  assert.deepEqual(p.records.map((r) => r.bot).sort(), ["PICKED", "TUNED"]);
  for (const r of p.records) {
    assert.equal(r.seed, seed); // Full-u64 string envelope, not rounded legacy seed_out.seed.
    assert.equal(r.effective_checkins_per_day, 3);
    assert.ok(r.observed_hours > 0 && r.observed_hours <= 344);
    assert.equal(r.seed_out.hours.length, 7);
    assert.ok(r.seed_out.hours.every((h) => h === null || (h >= 0 && h <= r.observed_hours)));
  }
  records.set(key, p.records);
}
assert.equal(jobs.length, 76);
const expectedKeys = new Set();
for (const seed of manifest.seeds.discovery.slice(0, 4))
  for (const gap of [4, 6, 8]) expectedKeys.add(`${gap}/${seed}`);
for (const seed of manifest.seeds.confirmation)
  for (const gap of [4, 8]) expectedKeys.add(`${gap}/${seed}`);
assert.deepEqual(new Set(records.keys()), expectedKeys);
const metric = (gap, seed, m) => {
  if (m.ratio) return metric(gap, seed, m.ratio[0]) / metric(gap, seed, m.ratio[1]);
  const r = records.get(`${gap}/${seed}`).find((r) => r.bot === m.bot);
  return r.seed_out.hours[[8, 13, 18, 23, 28, 29, 33].indexOf(m.depth)] ?? 344;
};
const values = (gap, seeds, c) =>
  seeds.map(
    (s) => metric(gap, s, c.metric) - (c.comparison === "difference" ? metric(4, s, c.metric) : 0),
  );
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b),
    a = s[s.length / 2 - 1],
    b = s[s.length / 2];
  return Math.sign(a) === Math.sign(b) ? a + (b - a) / 2 : a / 2 + b / 2;
};
const ranked = profiles
  .map((p) => {
    const claims = manifest.spec.claims.map((c) => {
      const estimate = median(
        values(p.profile.tree.guide_gap, manifest.seeds.discovery.slice(0, 4), c),
      );
      const margin =
        (c.direction === "at-most" ? c.threshold - estimate : estimate - c.threshold) /
        c.rankingScale;
      return { id: c.id, estimate, margin };
    });
    return { name: p.name, score: Math.min(...claims.map((c) => c.margin)), claims };
  })
  .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
assert.deepEqual(report.discovery, [
  { stage: 0, n: 4, ranked, promoted: ["gap8"], dropped: ["gap6"] },
]);
const alpha = (0.05 * (1 - 2 ** -38)) / 12;
assert.equal(report.alphaPerClaim, alpha);
assert.equal(report.familyAlpha, 0.05);
assert.equal(report.inferenceAlpha, 0.05 * (1 - 2 ** -38));
assert.equal(report.collisionReserve, 2 ** -38);
for (const [i, n] of [8, 16, 32].entries()) {
  const look = report.confirmation[i];
  assert.equal(look.n, n);
  assert.equal(look.alphaPerClaim, alpha);
  assert.equal(look.claims.length, 4);
  for (const c of manifest.spec.claims) {
    const xs = values(8, manifest.seeds.confirmation.slice(0, n), c).sort((a, b) => a - b);
    let count = 0n,
      choose = 1n,
      rank = 0;
    // alpha/2 = (2^38-1)/(480*2^38), exact rational comparison.
    for (let j = 0; j < Math.ceil(n / 2); j++) {
      count += choose;
      if (count * 480n * 2n ** 38n > (2n ** 38n - 1n) * 2n ** BigInt(n)) break;
      rank = j + 1;
      choose = (choose * BigInt(n - j)) / BigInt(j + 1);
    }
    const lower = rank ? xs[rank - 1] : "-Infinity",
      upper = rank ? xs[n - rank] : "+Infinity";
    const status =
      c.direction === "at-most"
        ? typeof upper === "number" && upper <= c.threshold
          ? "PASS"
          : typeof lower === "number" && lower > c.threshold
            ? "FAIL"
            : "INCONCLUSIVE"
        : typeof lower === "number" && lower >= c.threshold
          ? "PASS"
          : typeof upper === "number" && upper < c.threshold
            ? "FAIL"
            : "INCONCLUSIVE";
    const actual = look.claims.find((r) => r.id === c.id);
    for (const [key, value] of Object.entries({
      n,
      rank,
      estimate: median(xs),
      lower,
      upper,
      alpha,
      status,
      candidateCensored: 0,
      baselineCensored: 0,
    }))
      assert.equal(actual[key], value, `${n}/${c.id}/${key}`);
    // Independently check the zero censor claims against every metric component.
    const components = c.metric.ratio ?? [c.metric];
    for (const seed of manifest.seeds.confirmation.slice(0, n))
      for (const gap of c.comparison === "difference" ? [4, 8] : [8])
        for (const m of components) {
          const r = records.get(`${gap}/${seed}`).find((r) => r.bot === m.bot);
          assert.equal(
            typeof r.seed_out.hours[[8, 13, 18, 23, 28, 29, 33].indexOf(m.depth)],
            "number",
          );
        }
  }
}
assert.equal(report.confirmation.length, 3);
assert.equal(report.work.uniqueSeedProfiles, 76);
assert.equal(report.work.exhaustiveSeedProfiles, 88);
console.log(
  "PASS: 76 raw receipt hashes and runtime/profile/seed keys; frozen selection; all 12 confirmation intervals and zero censor counts independently reconstructed with exact rational binomial tails. INCONCLUSIVE; no adoption.",
);
