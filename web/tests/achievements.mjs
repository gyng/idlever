// Cut263/Cut269 (docs/CUT269_ACHIEVEMENTS_V2.md G7): the achievements toast and gallery on the real engine. A mature save
// (Menu present) is loaded with two entries earned and unseen: the camp toasts once (`✦ 2 achievements`, ≤ 3 words), the
// Menu opens the gallery (count over the visible list, lit rows with their tier badge, a counted entry's n/N, no unearned
// secret anywhere), an earned secret shows in Oddities with a separate `+1`, and the next send spends the new marks
// (`seenHonours`); a single new entry toasts its own name. Screenshots at 1440×900 and the primary phone geometry when
// IDLEVER_ACHIEVEMENTS_SHOTS is set.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { launchBrowser } from "../../tools/browser.mjs";
import { phoneReviewViewport } from "./lib/viewport-cases.mjs";
const url = (process.env.IDLEVER_TEST_URL ?? "http://127.0.0.1:5382").replace(/\/+$/, "");
const shots = process.env.IDLEVER_ACHIEVEMENTS_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const raw = gunzipSync(
  readFileSync(new URL("../../docs/evidence/handoff-menus/input.game.json.gz", import.meta.url)),
).toString();
// The fixture predates achievements: its load earns them retroactively and silently (G6). `edit(migrated, ids, secret)`
// takes that migrated save and marks `ids` new again (as a run that just earned them would), and may earn a secret.
const SECRETS = ["o_gas", "o_turncoat", "o_pratfall", "old_enemy"];
const edit = (migrated, ids, secret) => {
  const v = JSON.parse(migrated);
  const h = v.lineage.honours;
  h.seen = h.seen.filter((id) => !ids.includes(id));
  if (secret) {
    h.earned[secret] = 2;
    h.seen.push(secret);
  }
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
      base.earned >= 2 && base.rows.every((r) => !r.new),
      `${label}: an old save earns ${base.earned} achievements retroactively, none toasted`,
    );
    check(
      base.rows.every((r) => !SECRETS.includes(r.id)) && !base.secrets,
      `${label}: no unearned secret is on the wire`,
    );
    const pair = base.rows.filter((r) => r.day !== undefined).slice(0, 2);
    const count = `${base.earned}/${base.total}`;
    await load(
      edit(
        migrated,
        pair.map((r) => r.id),
      ),
    );
    await p.waitForFunction(
      () => (document.body.dataset.toast ?? "").includes("achievements"),
      null,
      {
        timeout: 8000,
      },
    );
    const said = await p.evaluate(() => document.body.dataset.toast);
    check(
      said === "✦ 2 achievements" && words(said) <= 3,
      `${label}: two new achievements toast once as a count ("${said}")`,
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
    // Menu → Achievements (≤ 2 activations)
    await p.locator("button.gear:visible").click();
    const entry = p.locator(".home-menu-honours:visible");
    check((await entry.count()) === 1, `${label}: the Menu holds Achievements`);
    const entryText = await entry.innerText();
    check(
      entryText.includes("Achievements") && entryText.includes(count) && !/honour/i.test(entryText),
      `${label}: the Menu entry reads Achievements ${count}`,
    );
    await entry.click();
    const panel = p.locator(".honours-panel:visible");
    await panel.waitFor();
    check(
      (await panel.locator(".honours-head").innerText()).startsWith("Achievements"),
      `${label}: the gallery is titled Achievements`,
    );
    check(
      (await panel.locator(".honours-count").innerText()) === count,
      `${label}: the gallery counts ${count} over the visible list`,
    );
    const first = panel.locator(`[data-honour="${pair[0].id}"]`);
    const firstClass = await first.getAttribute("class");
    check(
      firstClass.includes("earned") &&
        firstClass.includes("fresh") &&
        /day \d+/.test(await first.innerText()),
      `${label}: an earned entry is lit, marked new, with its day`,
    );
    const tier = await first.getAttribute("data-tier");
    check(
      (await first.locator(`.honour-mark .ico-badge_${tier}`).count()) === 1,
      `${label}: an earned entry wears its ${tier} badge`,
    );
    const locked = panel.locator('[data-honour="m_every"]');
    check(
      (await locked.locator(".ico-badge_locked").count()) === 1 &&
        /^\d+\/7$/.test(await locked.locator(".honour-n").innerText()),
      `${label}: an unearned counted entry is locked and shows n/7`,
    );
    const text = await panel.innerText();
    check(
      !text.includes("?") && (await panel.locator(".honour.secret").count()) === 0,
      `${label}: no ? and no secret row`,
    );
    const groups = await panel.locator(".honours-group h3").allInnerTexts();
    check(
      groups.join(",") === "Journey,Mastery,Challenges,Builds,Moments",
      `${label}: five groups in order, Oddities absent (${groups.join(" · ")})`,
    );
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    check(overflow <= 0, `${label}: no horizontal overflow (${overflow})`);
    if (shots) {
      await p.screenshot({ path: `${shots}/gallery-${label}.png` });
      await panel.locator('[data-group="challenges"]').scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${shots}/gallery-${label}-challenges.png` });
    }
    await p.keyboard.press("Escape");
    // the core spends the new marks once told (the next send asks `seenHonours`)
    const after = await p.evaluate(async () => {
      const a = window.__idlever;
      a.lineage = await a.engine.seenHonours();
      return a.lineage.honours.rows.filter((r) => r.new).length;
    });
    check(after === 0, `${label}: seenHonours spends the new marks`);
    // an earned secret: its own group, its secret badge, counted apart (+1), the visible count unchanged
    await load(edit(migrated, [], "o_gas"));
    await p.locator("button.gear:visible").click();
    await p.locator(".home-menu-honours:visible").click();
    const panel2 = p.locator(".honours-panel:visible");
    await panel2.waitFor();
    check(
      (await panel2.locator(".honours-count").innerText()) === `${count} +1`,
      `${label}: an earned secret counts apart (${await panel2.locator(".honours-count").innerText()})`,
    );
    const gas = panel2.locator('[data-group="oddities"] [data-honour="o_gas"]');
    check(
      (await gas.locator(".ico-badge_secret").count()) === 1 &&
        (await gas.locator(".honour-name").innerText()) === "Bad Air",
      `${label}: an earned secret shows in Oddities with the secret badge`,
    );
    check(
      (await panel2.locator('[data-honour="o_turncoat"]').count()) === 0,
      `${label}: the other secrets stay absent`,
    );
    if (shots) {
      await panel2.locator('[data-group="oddities"]').scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${shots}/gallery-${label}-oddities.png` });
    }
    await p.keyboard.press("Escape");
    // one new entry toasts its own name (a fresh page: an App never toasts the same entry twice)
    await p.goto(`${url}/?fresh=1&seed=1&runs=0`);
    await p.waitForFunction(() => window.__idlever?.booted);
    await load(edit(migrated, [pair[0].id]));
    await p.waitForFunction(() => (document.body.dataset.toast ?? "").includes("✦"), null, {
      timeout: 8000,
    });
    const one = await p.evaluate(() => document.body.dataset.toast);
    check(one === `✦ ${pair[0].name}`, `${label}: a single new entry toasts its name ("${one}")`);
    await p.close();
  }
  check(errors.length === 0, `no page errors (${errors.join(" | ")})`);
} finally {
  await b.close();
}
console.log(`achievements: ok (${checks} checks)`);
