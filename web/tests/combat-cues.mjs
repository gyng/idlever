import assert from "node:assert/strict";
import ts from "../../web/node_modules/typescript/lib/typescript.js";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../src/render/combat-cues.ts", import.meta.url), "utf8");
const js = ts.transpileModule(src, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { CombatCues } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);
let assertions = 0;
const ok = (v) => {
    assert.ok(v);
    assertions++;
  },
  equal = (a, b) => {
    assert.deepEqual(a, b);
    assertions++;
  };
const body = (id) => (id === 99 ? null : { x: id * 20, y: 0, w: 12, h: 24 });
const rule = (id, t = 10) => ({
  k: "rule",
  t,
  row: 2,
  verb: { v: "attack" },
  text: "attack",
  skill: { id, name: id },
});
const outcomes = [];
for (const cls of [
  "fighter_warden",
  "rogue_stalker",
  "ranger_hunter",
  "caster_channeler",
  "gunner_marksman",
]) {
  const m = new CombatCues();
  m.onEvent(rule(cls), 1, "full");
  const p = m.draw(10, body, "full", true);
  ok(p.length > 0 && p.length <= 16);
  outcomes.push(JSON.stringify(p));
  equal(m.draw(10, body, "full", true), p);
  const held = JSON.stringify(m.draw(13, body, "full", false));
  equal(JSON.stringify(m.draw(13, body, "full", false)), held);
  equal(m.draw(16, body, "full", true).length, 0);
}
equal(new Set(outcomes).size, 5);
const shapes = [];
for (const [hit, dmg] of [
  [true, 3],
  [true, 0],
  [false, 0],
]) {
  const m = new CombatCues();
  m.onEvent({ k: "attack", t: 10, src: 1, dst: 2, hit, dmg }, 1, "full");
  const p = m.draw(10, body, "full", true);
  ok(p.length > 0);
  ok(p.every((x) => x.x >= 36 && x.x <= 44));
  shapes.push(JSON.stringify(p));
}
equal(new Set(shapes).size, 3);
for (const ev of [
  { k: "heal", id: 2, amount: 0, src: "skill" },
  { k: "heal", id: 2, amount: 4, src: "regen" },
  { k: "heal", id: 2, amount: 4, src: "rest" },
  { k: "rule", row: 2, verb: { v: "shield_bash" }, text: "bash" },
  { ...rule("fighter_warden"), row: -2 },
]) {
  const m = new CombatCues();
  m.onEvent({ ...ev, t: 10 }, 1, "full");
  equal(m.draw(10, body, "full", true).length, 0);
}
const heal = new CombatCues();
heal.onEvent({ k: "heal", t: 10, id: 2, amount: 3, src: "skill" }, 1, "full");
ok(heal.draw(10, body, "full", true).length > 0);
const missing = new CombatCues();
missing.onEvent({ k: "attack", t: 10, src: 1, dst: 99, hit: true, dmg: 2 }, 1, "full");
equal(missing.draw(10, body, "full", true).length, 0);
const cap = new CombatCues();
for (let id = 0; id < 100; id++) cap.onEvent(rule("gunner_marksman"), id, "full");
ok(cap.stats().active <= 8);
ok(cap.draw(10, body, "full", true).length <= 128);
ok(cap.draw(10, body, "low", true).length <= 64);
ok(cap.draw(10, body, "full", false).length <= 64);
equal(cap.draw(10, body, "off", true).length, 0);
equal(cap.draw(10, body, "full", true).length, 0);
cap.onEvent(rule("fighter_warden"), 1, "full");
cap.clear();
equal(cap.draw(10, body, "full", true).length, 0);
const moved = new CombatCues();
moved.onEvent({ k: "attack", t: 10, src: 1, dst: 2, hit: true, dmg: 2 }, 1, "full");
const a = moved.draw(10, body, "full", true).map((x) => x.x);
const b = moved
  .draw(10, (id) => ({ ...body(id), x: body(id).x + 100 }), "full", true)
  .map((x) => x.x);
equal(
  b,
  a.map((x) => x + 100),
);
console.log(`${assertions} replay cue semantics PASS`);
