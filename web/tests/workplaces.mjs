// Cut273 (docs/CUT273_WORKPLACES.md): every worker comes from building or levelling his workplace. On the real engine, a fresh
// town: the House, then the Guildhouse plot is the lit worker's target (no hall, no name, no `Hire`); a tap builds it and the
// Receptionist arrives (`ARINA ARRIVES`), her name only after; the hall then stands. The wire carries each worker's workplace
// and the level his arrival makes (Forge II brings the Apprentice). Primary phone review viewport and desktop.
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";
const url =
    process.env.IDLEVER_TEST_URL ??
    execFileSync("bash", ["tools/dev.sh"], {
      cwd: new URL("../../", import.meta.url),
      encoding: "utf8",
    }).trim(),
  shots = process.env.IDLEVER_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const phone = phoneReviewViewport();
// a Cut208 earned save after three hand sends: the Porter lit, the Receptionist next (loaded through the real migration)
const manual3 = gunzipSync(
  readFileSync(
    new URL("../../docs/evidence/cut208/earned-final/seed-1-manual3.game.json.gz", import.meta.url),
  ),
).toString();
const tapArrives = async (p, who) => {
  await p.locator(".hit-worker").click();
  await p.waitForFunction(
    (who) =>
      document.querySelector(".works-beat")?.textContent.replace(/\s+/g, " ").trim() ===
      `${who} ARRIVES`,
    who,
    { timeout: 5000 },
  );
};
const b = await launchBrowser();
try {
  for (const [name, viewport] of [
    ["402", { width: phone.width, height: phone.height }],
    ["1440", { width: 1440, height: 900 }],
  ]) {
    const p = await b.newPage({ viewport, deviceScaleFactor: 1 });
    await p.goto(`${url}?fresh=1&seed=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    assert.equal(await p.evaluate(() => window.__idlever.kind), "wasm");
    // the House by its plot (the first construction)
    await p.evaluate(() =>
      window.__idlever.mutate(() => window.__idlever.engine.buildTown("house")),
    );
    await p.waitForFunction(() => window.__idlever.lineage.town.home === true);
    await p.waitForSelector(".hit-worker");
    await p.waitForTimeout(500);
    const before = await p.evaluate(() => {
      const L = window.__idlever.lineage,
        scout = L.tree.nodes.find((n) => n.id === "scout"),
        guild = L.town.workplaces.find((w) => w.id === "guild"),
        hit = document.querySelector(".hit-worker");
      return {
        guild,
        crate: L.town.workplaces.find((w) => w.id === "crate")?.level,
        person: scout.person ?? "",
        workplace: [scout.workplace, scout.workplace_name, scout.level],
        label: hit?.getAttribute("aria-label") ?? "",
        hall: !!document.querySelector(".hit-guild"),
        hire: [...document.querySelectorAll("button,[role=button],.town-marker")].some((e) =>
          /\bHire\b/.test(e.getAttribute("aria-label") ?? e.textContent ?? ""),
        ),
        affordable: guild?.next?.affordable,
      };
    });
    assert.equal(before.crate, 1, "the Supply crate comes with the House");
    assert.deepEqual(before.workplace, ["guild", "Guildhouse", 1]);
    assert.equal(before.guild.level, 0, "the Guildhouse is a plot until built");
    assert.equal(before.guild.next.worker, "scout");
    assert.equal(before.person, "", "the Receptionist's name waits for her arrival");
    assert.ok(before.label.startsWith("Guildhouse · receptionist arrives · "), before.label);
    assert.equal(before.hall, false, "no hall stands on the unbuilt plot");
    assert.equal(before.hire, false, "no Hire surface anywhere");
    if (shots) await p.screenshot({ path: `${shots}/guildhouse-plot-${name}.png` });
    // an earned save: a tap on the Haul chest's plot brings the Porter, then one on the Guildhouse's the Receptionist
    await p.evaluate(async (raw) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
    }, manual3);
    await p.waitForFunction(() => window.__idlever.lineage.tree.lit === "porter");
    await p.waitForSelector(".hit-worker");
    await p.waitForTimeout(400);
    const chestLabel = await p.locator(".hit-worker").getAttribute("aria-label");
    assert.ok(/^Haul chest · porter arrives · free$/.test(chestLabel), chestLabel);
    if (shots) await p.screenshot({ path: `${shots}/haul-chest-plot-${name}.png` });
    await tapArrives(p, "LILI");
    await p.waitForFunction(() => window.__idlever.lineage.tree.lit === "scout");
    await p.waitForTimeout(400);
    if (shots) await p.screenshot({ path: `${shots}/guildhouse-plot-earned-${name}.png` });
    await tapArrives(p, "ARINA");
    if (shots) await p.screenshot({ path: `${shots}/guildhouse-arrives-${name}.png` });
    const after = await p.evaluate(() => {
      const L = window.__idlever.lineage;
      return {
        person: L.tree.nodes.find((n) => n.id === "scout").person,
        state: L.tree.nodes.find((n) => n.id === "scout").state,
        level: L.town.workplaces.find((w) => w.id === "guild").level,
        chest: L.town.workplaces.find((w) => w.id === "haul_chest").level,
        auto: L.tree.auto_send,
        ledger: L.gold_ledger?.at(-1)?.why,
      };
    });
    assert.deepEqual(
      [after.person, after.state, after.level, after.chest, after.auto],
      ["Arina", "done", 1, 1, true],
    );
    assert.equal(
      after.ledger,
      "hire scout",
      "the ledger line is the hire's (gold settlements unchanged)",
    );
    await p.waitForSelector(".hit-guild", { timeout: 5000 });
    // the levels on the wire: Forge II brings the Apprentice, Kennel III the Keeper, Guildhouse II the Guide
    const levels = await p.evaluate(() =>
      Object.fromEntries(
        window.__idlever.lineage.tree.nodes
          .filter((n) => n.kind === "worker")
          .map((n) => [n.id, `${n.workplace_name} ${n.level}`]),
      ),
    );
    assert.equal(levels.apprentice, "Forge 2");
    assert.equal(levels.kennel_keeper, "Kennel 3");
    assert.equal(levels.guide, "Guildhouse 2");
    assert.equal(levels.porter, "Haul chest 1");
    console.log(
      `workplaces ${name}: plot → ARINA ARRIVES → Guildhouse L1; levels ${JSON.stringify(levels)}`,
    );
    await p.close();
  }
} finally {
  await b.close();
}
console.log("workplaces: PASS");
