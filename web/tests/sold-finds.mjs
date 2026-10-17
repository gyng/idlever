// Cut261 (owner 2026-10-18: "convert to gold report confusing, players thought items were persistent. for kept items split them
// separately. have converted into gold be like a fade/transition between item and gold amount"): the report keeps a shape's pattern
// apart (`Kept patterns`) from the finds sold for gold (`Became gold`: each `+$N`, the item small behind it) and a death's bones
// (`In bones`); the run-clear card's finds read as coins. The item → $ fade plays once with juice on, never under reduced motion.
// Usage: node web/tests/sold-finds.mjs [--shots DIR]
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";

const shots = process.argv.includes("--shots")
  ? process.argv[process.argv.indexOf("--shots") + 1]
  : null;
if (shots) mkdirSync(shots, { recursive: true });
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const fails = [];
const check = (ok, what) => {
  if (!ok) fails.push(what);
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
};
const b = await launchBrowser();
const report = (end) => {
  const find = (id, kind, worth, rarity, extra = {}) => ({
    id,
    kind,
    label: kind,
    known: true,
    worth,
    ...(rarity ? { rarity } : {}),
    ...extra,
  });
  const bones = end === "death" ? { fate: "bones" } : {};
  return {
    elapsed_s: 0,
    runs: 1,
    sampled: false,
    learned: [],
    bests: [],
    found: [],
    deaths: [],
    pending: [],
    marks_earned: 0,
    tamed: [],
    hatched: [],
    lost: [],
    reel: [],
    discoveries: [
      {
        rarity: "masterwork",
        kind: "axe",
        label: "axe",
        effect: "Unlock this base shape for starting gear.",
        tradeoff: "Found enchantment remains temporary.",
        source: "Dungeon find",
        depth: 6,
        run_id: 1,
        hero_name: "Ulf",
        first: true,
        target: "loadouts",
      },
    ],
    exits: [
      {
        tier: end,
        end,
        text: end,
        carried: 47,
        keep_pct: end === "death" ? 0 : 100,
        kept: end === "death" ? 0 : 47,
        reached: 6,
        finds: [
          find(1, "axe", 22, "masterwork", bones),
          find(2, "mail", 12, "uncommon", bones),
          find(3, "heal", 3, undefined, bones),
          find(4, "heal", 3, undefined, bones),
        ],
      },
    ],
  };
};
try {
  for (const [id, vp] of [
    ["phone-402x681", phoneReviewViewport()],
    ["desktop-1440x900", { width: 1440, height: 900 }],
  ]) {
    for (const motion of ["juice", "reduce"]) {
      const ctx = await b.newContext({
        viewport: vp,
        reducedMotion: motion === "reduce" ? "reduce" : "no-preference",
      });
      const p = await ctx.newPage();
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(
        `${url}?engine=fake&fresh=1&runs=0&runclear=1&juice=${motion === "juice" ? 1 : 0}`,
      );
      await p.waitForFunction(() => window.__idlever?.booted);
      // the card (a bank): every find sold, each a `+$N` with its silhouette behind it
      await p.evaluate(
        (r) => window.__idlever.go({ kind: "report", report: r, absence: true }),
        report("bank"),
      );
      await p.waitForSelector(".run-clear .rc-sold");
      const card = await p.evaluate(() => {
        const c = document.querySelector(".run-clear");
        const rows = [...c.querySelectorAll(".rc-sold .gold-find")];
        return {
          golds: rows.map((r) => r.querySelector(".gf-gold").textContent),
          icons: c.querySelectorAll(".rc-sold .item-ico").length,
          anims: rows.flatMap((r) => r.querySelector(".gf-gold").getAnimations()).length,
        };
      });
      check(
        card.golds.join(",") === "+$22,+$12,+$3,+$3" && card.icons === 4,
        `${id} ${motion}: card finds read as coins (${card.golds})`,
      );
      check(
        motion === "juice" ? card.anims === 4 : card.anims === 0,
        `${id} ${motion}: card fade ${motion === "juice" ? "plays" : "is instant"} (${card.anims})`,
      );
      if (shots && motion === "juice") {
        await p.waitForTimeout(2600);
        await p.screenshot({ path: `${shots}/card-${id}.png` });
      }
      // lift the card, open details: Kept patterns, then Became gold (heal ×2 summed), no bones on a bank
      await p.evaluate(() => document.querySelector(".run-clear")?.click());
      await p.waitForFunction(() => !document.querySelector(".run-clear"));
      await p.click(".details-fold");
      const sec = await p.evaluate(() => {
        const labels = [...document.querySelectorAll(".report-details .rsec > .label")].map(
          (l) => l.textContent,
        );
        const sold = [...document.querySelectorAll(".report-details .gold-finds .gold-find")];
        return {
          labels,
          sold: sold.map((s) => s.innerText.replace(/\s+/g, " ").trim()),
          vw: innerWidth,
          over: document.documentElement.scrollWidth > innerWidth,
        };
      });
      const kept = sec.labels.indexOf("Kept patterns"),
        gold = sec.labels.indexOf("Became gold");
      check(
        kept >= 0 &&
          gold > kept &&
          !sec.labels.includes("In bones") &&
          !sec.labels.includes("found"),
        `${id} ${motion}: kept apart from sold (${sec.labels.join(" | ")})`,
      );
      check(
        sec.sold.join(" | ") === "+$22 axe | +$12 mail | +$6 heal ×2",
        `${id} ${motion}: sold rows (${sec.sold.join(" | ")})`,
      );
      check(!sec.over, `${id} ${motion}: no horizontal page scroll`);
      if (shots && motion === "juice") {
        await p.locator(".report-details .gold-finds").scrollIntoViewIfNeeded();
        await p.waitForTimeout(2200);
        await p.screenshot({ path: `${shots}/report-${id}.png` });
      }
      // a death: its finds lie in the bones, never `Became gold`
      await p.evaluate(
        (r) => window.__idlever.go({ kind: "report", report: r, absence: true }),
        report("death"),
      );
      await p.waitForFunction(() => document.querySelector("main.report"));
      await p.waitForTimeout(300);
      if (await p.locator(".run-clear").count()) {
        await p.evaluate(() => document.querySelector(".run-clear")?.click());
        await p.waitForFunction(() => !document.querySelector(".run-clear"));
      }
      if (!(await p.locator(".report-details").isVisible())) await p.click(".details-fold");
      const dead = await p.evaluate(() =>
        [...document.querySelectorAll(".report-details .rsec > .label")].map((l) => l.textContent),
      );
      check(
        dead.includes("In bones") && !dead.includes("Became gold"),
        `${id} ${motion}: a death's finds are in bones (${dead.join(" | ")})`,
      );
      check(errors.length === 0, `${id} ${motion}: no page errors ${errors.join("; ")}`);
      await ctx.close();
    }
  }
} finally {
  await b.close();
}
if (fails.length) {
  console.log(`${fails.length} FAIL`);
  process.exit(1);
}
console.log("sold-finds PASS");
