// Cut263 (docs/CUT263_ACHIEVEMENTS.md G7): the honours toast and gallery on the real engine. A mature save (Menu present)
// is loaded with two honours earned and unseen: the camp toasts once (`✦ 2 honours`, ≤ 3 words), the Menu opens the
// gallery (count, lit rows, a secret's `?`, a counted honour's n/N), the next send spends them (`seenHonours`); a single
// new honour toasts its own name. Screenshots at 1440×900 and the primary phone geometry when IDLEVER_HONOURS_SHOTS is set.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";
const url = (process.env.IDLEVER_TEST_URL ?? "http://127.0.0.1:5382").replace(/\/+$/, "");
const shots = process.env.IDLEVER_HONOURS_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const raw = gunzipSync(
  readFileSync(new URL("../../docs/evidence/handoff-menus/input.game.json.gz", import.meta.url)),
).toString();
// The fixture predates honours: its load earns them retroactively and silently (G6). `unseen(ids)` takes that migrated
// save and marks `ids` new again (as a run that just earned them would).
const unseen = (migrated, ids) => {
  const v = JSON.parse(migrated);
  v.lineage.honours.seen = v.lineage.honours.seen.filter((id) => !ids.includes(id));
  return JSON.stringify(v);
};
const b = await launchBrowser();
const errors = [];
let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks++;
  console.log(`ok   ${message}`);
};
const words = (s) => s.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
const phone = phoneReviewViewport();
try {
  for (const [label, viewport] of [
    ["1440", { width: 1440, height: 900 }],
    ["402", { width: phone.width, height: phone.height }],
  ]) {
    const p = await b.newPage({ viewport, reducedMotion: "reduce" });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(`${url}/?fresh=1&seed=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    const load = (save) =>
      p.evaluate(async (save) => {
        const a = window.__idlever;
        a.runnerOn = false;
        document.body.dataset.toast = "";
        a.lineage = await a.engine.load(save);
        await a.refresh();
        a.go({ kind: "camp" });
      }, save);
    await load(raw);
    const migrated = await p.evaluate(() => window.__idlever.engine.save());
    const base = await p.evaluate(() => window.__idlever.lineage.honours);
    check(
      base.earned > 0 && base.rows.every((r) => !r.new),
      `${label}: an old save earns ${base.earned} honours retroactively, none toasted`,
    );
    const count = `${base.earned}/${base.total}`;
    await load(unseen(migrated, ["boss_warlord", "depth_20"]));
    await p.waitForFunction(() => (document.body.dataset.toast ?? "").includes("honours"), null, {
      timeout: 8000,
    });
    const said = await p.evaluate(() => document.body.dataset.toast);
    check(
      said === "✦ 2 honours" && words(said) <= 3,
      `${label}: two new honours toast once as a count ("${said}")`,
    );
    if (shots) await p.screenshot({ path: `${shots}/toast-${label}.png` });
    // a repaint never repeats the toast
    await p.evaluate(() => {
      document.body.dataset.toast = "";
      window.__idlever.go({ kind: "camp" });
    });
    await p.waitForTimeout(400);
    check(
      (await p.evaluate(() => document.body.dataset.toast)) === "",
      `${label}: a repaint does not toast again`,
    );
    // Menu → Honours (≤ 2 activations)
    await p.locator("button.gear:visible").click();
    const entry = p.locator(".home-menu-honours:visible");
    check((await entry.count()) === 1, `${label}: the Menu holds Honours`);
    check((await entry.innerText()).includes(count), `${label}: the Menu entry counts ${count}`);
    await entry.click();
    const panel = p.locator(".honours-panel:visible");
    await panel.waitFor();
    check(
      (await panel.locator(".honours-count").innerText()) === count,
      `${label}: the gallery counts ${count}`,
    );
    const warlord = panel.locator('[data-honour="boss_warlord"]');
    check(
      (await warlord.getAttribute("class")).includes("earned") &&
        (await warlord.getAttribute("class")).includes("fresh") &&
        /day \d+/.test(await warlord.innerText()),
      `${label}: an earned honour is lit, marked new, with its day`,
    );
    const secret = panel.locator('[data-honour="old_enemy"]');
    check(
      (await secret.locator(".honour-name").innerText()) === "?" &&
        (await secret.locator(".honour-goal").count()) === 0,
      `${label}: an unearned secret reads ? with no goal`,
    );
    const twenty = await panel.locator('[data-honour="depth_30"] .honour-n').innerText();
    check(/^\d+\/30$/.test(twenty), `${label}: a counted honour shows its progress (${twenty})`);
    const groups = await panel.locator(".honours-group h3").allInnerTexts();
    check(groups.length === 10, `${label}: ten groups in order (${groups.join(" · ")})`);
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    check(overflow <= 0, `${label}: no horizontal overflow (${overflow})`);
    if (shots) {
      await p.screenshot({ path: `${shots}/gallery-${label}.png` });
      await panel.locator('[data-group="lore"]').scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${shots}/gallery-${label}-lore.png` });
    }
    await p.keyboard.press("Escape");
    // the core spends the new marks once told (the next send asks `seenHonours`)
    const after = await p.evaluate(async () => {
      const a = window.__idlever;
      a.lineage = await a.engine.seenHonours();
      return a.lineage.honours.rows.filter((r) => r.new).length;
    });
    check(after === 0, `${label}: seenHonours spends the new marks`);
    // one new honour toasts its own name (a fresh page: an App never toasts the same honour twice)
    await p.goto(`${url}/?fresh=1&seed=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await load(unseen(migrated, ["boss_warlord"]));
    await p.waitForFunction(() => (document.body.dataset.toast ?? "").includes("✦"), null, {
      timeout: 8000,
    });
    const one = await p.evaluate(() => document.body.dataset.toast);
    check(one === "✦ Warlord Felled", `${label}: a single new honour toasts its name ("${one}")`);
    await p.close();
  }
  check(errors.length === 0, `no page errors (${errors.join(" | ")})`);
} finally {
  await b.close();
}
console.log(`honours: ok (${checks} checks)`);
