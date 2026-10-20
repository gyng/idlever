// Controlled public-WASM send fixtures; not earned progression or browser UI acceptance.
import init, { Game } from "../../../web/src/engine/pkg/idlever_wasm.js";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const wasm = readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm");
const bridge = readFileSync("web/src/engine/pkg/idlever_wasm.js");
await init({ module_or_path: wasm });
const root = "docs/evidence/cut284/wasm-bridge";
mkdirSync(root, { recursive: true });
const rows = [];
for (const [route, boss, item, start] of [
  [0, "bloat_mother", "fire", 9],
  [0, "lurker_queen", "silence", 24],
  [1, "bloat_mother", "fire", 5],
  [2, "bloat_mother", "fire", 14],
  [8, "lurker_queen", "silence", 19],
  [16, "lurker_queen", "silence", 29],
]) {
  const game = new Game(284);
  game.buildTown("house");
  const fixture = JSON.parse(game.save());
  const l = fixture.lineage;
  l.best_depth = 33;
  l.gold = 100000;
  l.town.bank = 0;
  l.tree.ledger = 100000;
  l.tree.chest = 0;
  l.rest_left = 0;
  l.start = start;
  l.supplies = [];
  l.last_supplies = [];
  l.last_supply_origins = [];
  l.kit ??= {};
  l.kit.pack = 2;
  l.pkg.runs ??= {};
  l.forge ??= {};
  l.facts ??= [];
  l.pkg.runs.steady = 220;
  l.pkg.stance = "steady";
  l.pkg.tactics = [];
  l.pkg.pen = [];
  l.pkg.custom = [];
  l.pkg.drills = [
    {
      boss,
      rows: [
        {
          conds: [{ k: "foe_tag", t: "boss" }],
          verb: {
            v: item === "fire" ? "throw" : "read",
            a: item === "fire" ? "fire,tag:boss" : "silence",
          },
        },
      ],
      revoked: false,
      announced: false,
    },
  ];
  const forks = [5, 9, 14, 19, 24];
  l.sets[l.active_set].route = forks.filter((_, i) => route & (1 << i));
  l.waystones = [5, 9, 14, 19, 24, 29];
  l.lane_stones = l.waystones
    .map((depth) => [
      depth,
      forks.reduce((bits, f, i) => (f <= depth ? bits | (route & (1 << i)) : bits), 0),
    ])
    .filter(([, bits]) => bits !== 0);
  l.kills = [
    "goblin_warlord",
    "bloat_mother",
    "lich",
    "foundry_master",
    "lurker_queen",
    "mirror_king",
  ];
  for (const kind of [item, "heal"]) {
    const flavour = l.flavours.potion[kind] ?? l.flavours.scroll[kind];
    assert.ok(flavour, `${kind} has an actual seeded flavour`);
    const fact = `item:${flavour}=${kind}`;
    if (!l.facts.includes(fact)) l.facts.push(fact);
    l.forge[kind] = { salvaged: 5, craftable: true, tier: 0 };
  }
  const input = JSON.stringify(fixture);
  game.load(input);
  game.setStart(start); // public validation of the route-specific lit waystone
  const began = performance.now();
  game.send();
  const after = game.save();
  const saved = JSON.parse(after);
  assert.equal(saved.run.start, start);
  assert.equal(saved.run.route ?? 0, route);
  const kinds = saved.run.hero.inv.map((i) => i.kind);
  assert.ok(kinds.includes(item), `route${route} actual ${boss} counter inventory`);
  assert.ok(kinds.filter((k) => k === "heal").length >= 2, `route${route} sustain preserved`);
  assert.equal(saved.lineage.gold + saved.lineage.town.bank, saved.lineage.tree.ledger);
  const loaded = Game.fromSave(after);
  assert.equal(loaded.save(), after, `route${route} complete in-flight save reload`);
  loaded.free();
  const id = `route${route}-${boss}`;
  writeFileSync(`${root}/${id}.input.json.gz`, gzipSync(input));
  writeFileSync(`${root}/${id}.after.json.gz`, gzipSync(after));
  rows.push({
    id,
    route,
    boss,
    item,
    start,
    inventory: kinds,
    inputSha256: sha(input),
    afterSha256: sha(after),
    seconds: (performance.now() - began) / 1000,
  });
  game.free();
  console.log(`PASS ${id}: actual send carries ${item}, two heals and exact in-flight reload`);
}
writeFileSync(
  `${root}/report.json`,
  JSON.stringify(
    {
      scope: "six controlled public-WASM sends; not earned play or UI acceptance",
      wasm: { bytes: wasm.length, sha256: sha(wasm) },
      bridgeSha256: sha(bridge),
      scriptSha256: sha(readFileSync(new URL(import.meta.url))),
      rows,
    },
    null,
    2,
  ) + "\n",
);
