// Extract actual weapon actions from complete, current-runtime replay artifacts.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const [input, output] = process.argv.slice(2);
assert(input && output && !existsSync(output), 'Require input results and a fresh output');
const sha = b => createHash('sha256').update(b).digest('hex');
const raw = readFileSync(input);
const results = JSON.parse(raw);
assert.equal(results.status, 'PASS');
const readArtifact = a => {
  const bytes = gunzipSync(readFileSync(a.path));
  assert.equal(sha(bytes), a.rawSha256);
  return JSON.parse(bytes);
};
const rows = results.cases.map(c => {
  const sent = readArtifact(c.artifacts.sent);
  const after = readArtifact(c.artifacts.after);
  const replay = readArtifact(c.artifacts.replay);
  const report = readArtifact(c.artifacts.report);
  assert.equal(sent.run.hero.weapon.kind, c.weapon);
  const heroId = replay.floors[0].snapshot.hero.id;
  const events = replay.floors.flatMap(f => f.events.map((event, index) => ({
    depth: f.snapshot.depth, biome: f.snapshot.biome, index, event,
  })));
  const attacks = events.filter(x => x.event.k === 'attack' && x.event.src === heroId);
  assert(attacks.length > 0, `${c.id}/${c.weapon}: actual actor attack required`);
  const count = xs => Object.fromEntries([...new Set(xs)].map(k => [k, xs.filter(x => x === k).length]));
  const verbs = count(events.filter(x => x.event.k === 'rule').map(x => x.event.verb.v));
  const attackVerbs = count(attacks.map(x => x.event.verb));
  const first = attacks[0];
  const projectile = events.find(x => x.event.k === 'projectile' && x.event.src === heroId && x.event.t === first.event.t);
  const gun = events.filter(x => x.event.k === 'gun');
  const beforeLedger = sent.lineage.gold_ledger;
  const afterLedger = after.lineage.gold_ledger;
  return {
    id: c.id, weapon: c.weapon, heroId,
    heroLevel: sent.run.hero.level,
    classLevel: sent.lineage.classes[c.id]?.level ?? 1,
    selectedClassSkills: sent.run.hero.class_skills ?? 0,
    equipment: { weapon: sent.run.hero.weapon, worn: sent.run.worn },
    firstHeroAttack: first, firstProjectile: projectile ?? null,
    firstGunStates: gun.slice(0, 3), attackVerbs, ruleVerbs: verbs,
    gunStates: gun.length,
    reloadStarts: gun.filter(x => x.event.state.reload_left > 0).length,
    actual: c.actual,
    accounting: {
      beforeGold: sent.lineage.gold, afterGold: after.lineage.gold,
      goldChange: after.lineage.gold - sent.lineage.gold,
      reportGold: report.gold, exits: report.exits, workers: report.workers,
      preparedSupplies: sent.run.prepared_supplies,
      ledgerBefore: beforeLedger, ledgerAfter: afterLedger,
    },
    sources: c.artifacts,
  };
});
assert.equal(rows.length, 10);
writeFileSync(output, JSON.stringify({
  recordedAtUtc: new Date().toISOString(), wasmSha256: results.wasmSha256,
  input, inputSha256: sha(raw), scriptSha256: sha(readFileSync(new URL(import.meta.url))),
  scope: 'Ten actual first-actor attacks and complete native verb/accounting inventory. Observations of this earned build, not proof of class-specific skill adoption, counter superiority, broad balance or fun.',
  interpretation: [
    'Weapon choice affects actual attack mode: bow projectiles and firearm state/reload events are directly recorded.',
    'The preserved package choices produce no Fighter shield_bash/cleave/taunt/second_wind/bulwark or Caster bolt/ward/blink/slow/nova/drain rule firings. These cases cannot prove those class identities.',
    'Different turn/target IDs after branch divergence do not represent the same fight. Whole-run damage totals are exposure counts, not matched damage-per-second estimates.',
    'Only within-class weapon selection is matched. Fighter class level8 and newly selected class levels1 prohibit cross-class superiority conclusions.',
  ],
  freshness: 'Re-extract after engine/package, equipment, rule packages, class skills, encounter/event semantics or prepared inputs change. Visual recognition needs separate dated render review.',
  rows, status: 'PASS',
}, null, 2) + '\n');
console.log(`PASS: ${rows.length} actual hero action/accounting inventories`);
