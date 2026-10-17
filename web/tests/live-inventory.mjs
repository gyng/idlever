// Cut261 (owner 2026-10-18: "live view: show inventory list with $ value as well in details"): the carried purse's detail lists
// the live pack — each find at the coins it added on pickup, kit/supplies without $, the rest one line — and its lines sum to Carried.
// Real engine; the run is stepped until the pack holds finds, then held still. Usage: node web/tests/live-inventory.mjs [--shots DIR]
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
const seed = +(process.env.SEED ?? 7);
const b = await launchBrowser();
const out = [];
try {
  for (const [id, vp] of [
    ["phone-402x681", phoneReviewViewport()],
    ["desktop-1440x900", { width: 1440, height: 900 }],
  ]) {
    const p = await b.newPage({ viewport: vp, hasTouch: id.startsWith("phone") });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}?dev=1&fresh=1&seed=${seed}`);
    await p.waitForFunction(() => window.__idlever?.booted, null, { timeout: 60000 });
    // New towns follow the owner's manual house → resident → Send opening.
    if (await p.evaluate(() => window.__idlever.lineage.town?.home === false)) {
      await p.locator('.town-tag[data-next="house"]').click();
      await p.waitForFunction(() => window.__idlever.lineage.town.home === true);
    }
    const info = await p.evaluate(async () => {
      const a = window.__idlever;

      let s = await a.engine.send();
      for (let i = 0; i < 400; i++) {
        const finds = s.hero.inv.filter((x) => x.worth).length;
        if (finds >= 2 && s.stake && s.stake.loot > 0) break;
        const r = await a.engine.step(20);
        s = r.snapshot;
        if (r.run_over) s = await a.engine.send();
      }
      const held = s;
      a.engine.step = async () => ({ events: [], snapshot: held, run_over: false });
      a.watchMode = "fast";
      a.slowdowns = false;
      a.go({ kind: "watch" });
      return {
        inv: held.hero.inv.map((x) => ({ label: x.label, worth: x.worth ?? 0, fate: x.fate })),
        loot: held.stake?.loot,
        secured: held.stake?.death_keep ?? 0,
        depth: held.depth,
        turn: held.turn,
      };
    });
    await p.waitForSelector(".watch .purse.carried", { state: "visible", timeout: 30000 });
    await p.waitForTimeout(800);
    const purse = p.locator(".watch .purse.carried");
    if (id.startsWith("phone")) await purse.tap();
    else await purse.click();
    await p.waitForSelector("#kw-tip:not([hidden]) .pack-worth", { timeout: 5000 });
    const tip = await p.evaluate(() => {
      const ul = document.querySelector("#kw-tip .pack-worth");
      const rows = [...ul.querySelectorAll("li")].map((li) => ({
        k: li.querySelector(".pw-k").textContent.trim(),
        v: li.querySelector(".pw-v").textContent.trim(),
        total: li.classList.contains("pw-total"),
      }));
      const tipRect = document.querySelector("#kw-tip").getBoundingClientRect();
      return {
        rows,
        sum: +ul.dataset.sum,
        carried: +document.querySelector(".watch .purse.carried").dataset.v,
        rect: { l: tipRect.left, r: tipRect.right, t: tipRect.top, b: tipRect.bottom },
        vw: innerWidth,
        vh: innerHeight,
      };
    });
    const money = (v) =>
      v.startsWith("−$") ? -+v.slice(2) : /^\+?\$/.test(v) ? +v.replace(/^\+?\$/, "") : 0;
    const parts = tip.rows.filter((r) => !r.total).reduce((n, r) => n + money(r.v), 0);
    const total = tip.rows.find((r) => r.total);
    const ok =
      total &&
      money(total.v) === tip.carried &&
      parts === tip.carried &&
      tip.rows.some((r) => !r.total && /^\+\$\d+$/.test(r.v)) &&
      tip.rect.l >= 0 &&
      tip.rect.r <= tip.vw &&
      errors.length === 0;
    if (shots) await p.screenshot({ path: `${shots}/${id}.png` });
    out.push({ id, vp, seed, ok: !!ok, parts, info, tip, errors });
    await p.close();
  }
} finally {
  await b.close();
}
console.log(JSON.stringify(out, null, 1));
if (!out.every((o) => o.ok)) process.exit(1);
