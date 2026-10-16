import { stateWidths } from "./lib/viewport-cases.mjs";
// Earned read-only inspection plus controlled divergent hero/class progress.
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const engine = readFileSync(new URL("./fixtures/earned-gunner-home.json", import.meta.url), "utf8");
const shots = process.env.IDLEVER_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const b = await launchBrowser();
try {
  for (const width of stateWidths([400, 1440])) {
    const p = await b.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}?fresh=1&seed=49`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await p.evaluate(async (engine) => {
      if (
        !(await window.__idlever.importSave(
          JSON.stringify({ v: 2, engine, loadout: [], last_seen: Date.now(), runs: 0 }),
        ))
      )
        throw Error("real import");
    }, engine);
    const saved = await p.evaluate(() => window.__idlever.engine.save());
    await p.locator('.hero-details:visible, .camp [data-building="tent"]:visible').first().click();
    const actual = await p.evaluate(() => {
      const a = window.__idlever,
        s = a.lineage.hero_slots.find((s) => s.id === a.lineage.selected_bloodline);
      return {
        progress: document.querySelector("[data-hub-hero-progress]").textContent,
        level: s.level,
        xp: s.xp,
        next: s.next,
      };
    });
    assert.equal(
      actual.progress,
      `Hero L${actual.level}${actual.next === 0 ? " · MAX" : ` · XP ${actual.xp}/${actual.next ?? "—"}`}`,
    );
    if (shots) {
      await p.waitForTimeout(800);
      await p.screenshot({ path: `${shots}/earned-${width}.png` });
    }
    await p.keyboard.press("Escape");
    assert.equal(await p.evaluate(() => window.__idlever.engine.save()), saved);
    const count = await p.evaluate(async () => {
      const a = window.__idlever,
        { openHero } = await import("/src/ui/town.ts"),
        { closeAllSheets } = await import("/src/ui/sheet.ts");
      let n = 0;
      const check = (v, label) => {
        if (!v) throw Error(label);
        n++;
      };
      const before = a.liveListeners.size,
        s = a.lineage.hero_slots.find((s) => s.id === a.lineage.selected_bloodline);
      s.level = 3;
      s.xp = 144;
      s.next = 540;
      s.state = "waits";
      s.life_state = "ready";
      a.lineage.classes[a.lineage.class] = { level: 10, xp: 900, next: 1200 };
      openHero(a);
      check(
        document.querySelector("[data-hub-hero-progress]").textContent === "Hero L3 · XP 144/540",
        "hero progress distinct from class level",
      );
      const details = document.querySelector("[data-hub-training]");
      details.open = true;
      check(
        details.textContent.includes("Class L10 · Class XP 900 / 1200"),
        `class training explicitly labelled: ${details.textContent}`,
      );
      s.state = "live";
      s.life_state = "away";
      s.live = {
        run_id: 90,
        heir: s.heir,
        depth: 13,
        start: 1,
        hp: 25,
        max_hp: 40,
        turn: 2,
        activity: "combat",
      };
      s.xp = 180;
      a.emitLive();
      check(
        document.querySelector("[data-hub-hero-progress]").textContent === "Hero L3 · XP 180/540",
        "live XP refresh",
      );
      check(
        document.querySelector("[data-hub-life-state]").textContent === "D13 · In combat",
        "actual activity refresh",
      );
      check(
        document.querySelector("[data-hub-life-state]").title === "25/40 hp · run 90",
        "actual health detail",
      );
      check(document.querySelector("[data-hub-training]").open, "Training remains expanded");
      s.state = "rests";
      s.life_state = "ready";
      s.rest_s = 20;
      a.emitLive();
      check(
        document.querySelector("[data-hub-life-state]").textContent === "Departs 20s",
        "rest refresh",
      );
      check(document.documentElement.scrollWidth <= innerWidth, "no overflow");
      closeAllSheets();
      check(a.liveListeners.size === before, "live listener removed on close");
      return n;
    });
    assert.equal(await p.evaluate(() => window.__idlever.engine.save()), saved);
    assert.deepEqual(errors, []);
    console.log(width, count, "hero/class progress and read-only live summary PASS");
    await p.close();
  }
} finally {
  await b.close();
}
