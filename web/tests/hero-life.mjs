// Real earned Legacy wallets; controlled damage fixtures cover recovery boundaries only.
import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { launchBrowser } from "../../tools/browser.mjs";
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { encoding: "utf8" }).trim();
const evidence = process.env.IDLEVER_HERO_SHOTS;
if (evidence) mkdirSync(evidence, { recursive: true });
const fixtures = new URL("../../docs/evidence/cut211/fixtures/", import.meta.url);
// Owner amendment 2026-10-14: the controlled recovery fixtures at the 12000-tick recovery.
const controlled = new URL("../../docs/evidence/cut227/recovery/fixtures/", import.meta.url);
const inputs = {};
function input(name) {
  const bytes = readFileSync(
    new URL(`${name}.game.json.gz`, name.startsWith("controlled-") ? controlled : fixtures),
  );
  inputs[name] = { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
  return gunzipSync(bytes).toString();
}
const browser = await launchBrowser();
const records = [];
let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
  const errors = [],
    deliveries = [];
  page.on("response", (response) => {
    if (response.url().includes("idlever_wasm_bg.wasm"))
      deliveries.push(
        response.body().then((bytes) => ({
          url: response.url(),
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        })),
      );
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.kind !== "wasm" || !a.engine.renameHero || !a.engine.rebirthHero)
      throw Error("current real persistent-hero WASM required");
  });
  const state = () => page.evaluate(() => window.__idlever.lineage);
  const save = () => page.evaluate(() => window.__idlever.engine.save());
  async function load(name) {
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
    }, input(name));
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
  }
  async function settled() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));
      const wrap = document.querySelector(".hero-life-panel")?.closest(".sheet-wrap");
      if (wrap)
        await Promise.all(
          wrap
            .getAnimations({ subtree: true })
            .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
            .map((a) => a.finished.catch(() => {})),
        );
    });
  }
  async function open(mode = "hero") {
    const before = await save();
    await page.evaluate(async (m) => {
      (await import("/src/ui/hero-life.ts")).openHeroLife(window.__idlever, null, m);
    }, mode);
    await page.locator(".hero-life-panel").waitFor();
    await settled();
    assert.equal(await save(), before, "reading Hero/preview changes no saved state");
    checks++;
  }
  const button = (key) => page.locator(`[data-life-focus="${key}"]`);
  async function refused(method, arg) {
    const result = await page.evaluate(
      async ({ method, arg }) => {
        const a = window.__idlever,
          before = await a.engine.save();
        let error = "";
        try {
          await a.engine[method](arg);
        } catch (e) {
          error = String(e);
        }
        return { error, unchanged: before === (await a.engine.save()) };
      },
      { method, arg },
    );
    assert.ok(result.error, `${method} must refuse`);
    assert.equal(result.unchanged, true, `${method} refusal is atomic`);
    checks += 2;
    return result.error;
  }
  for (const seed of [1, 13]) {
    await load(`earned-seed-${seed}-budget`);
    await open();
    let before = await state();
    assert.equal(before.bloodline.spent, 0);
    assert.deepEqual(
      before.persistent_hero.attributes.map((a) => a.name),
      ["Vitality", "Strength", "Guard"],
    );
    checks += 2;
    const gold = before.gold,
      wallet = before.bloodline.points;
    const history = JSON.parse(await save()).lineage.run_log;
    await button("name").fill(`  Mara ${seed}  `);
    await button("rename").click();
    await page.waitForFunction(
      (name) => window.__idlever.lineage.persistent_hero.name === name,
      `Mara ${seed}`,
    );
    assert.equal((await state()).gold, gold);
    assert.deepEqual(
      JSON.parse(await save()).lineage.run_log,
      history,
      "rename leaves completed records unchanged",
    );
    checks += 2;
    await refused("renameHero", " ");
    await refused("renameHero", "a".repeat(33));
    await button("name").fill("Unsaved draft");
    const price = (await state()).persistent_hero.attributes.find(
      (a) => a.id === "damage",
    ).next_price;
    await button("attribute:damage").click();
    await page.waitForFunction(
      () =>
        window.__idlever.lineage.persistent_hero.attributes.find((a) => a.id === "damage").rank ===
        1,
    );
    let after = await state();
    assert.equal(after.bloodline.points, wallet - price);
    assert.equal(after.bloodline.spent, price);
    assert.equal(after.gold, gold);
    assert.equal(await button("name").inputValue(), "Unsaved draft");
    checks += 4;
    const reading = await page.evaluate(async () => {
      const a = window.__idlever,
        input = document.querySelector('[data-life-focus="name"]'),
        root = input.closest(".game-window");
      input.focus();
      input.setSelectionRange(2, 6);
      root.scrollTop = 80;
      const scroll = root.scrollTop;
      await a.engine.setWorker("scout", false);
      await a.refresh();
      const current = document.querySelector('[data-life-focus="name"]');
      return {
        scroll,
        after: root.scrollTop,
        value: current.value,
        start: current.selectionStart,
        end: current.selectionEnd,
        focus: document.activeElement.dataset.lifeFocus,
      };
    });
    assert.equal(reading.after, reading.scroll);
    assert.equal(reading.value, "Unsaved draft");
    assert.equal(reading.focus, "name");
    assert.equal(reading.start, 2);
    assert.equal(reading.end, 6);
    checks += 5;
    const stable = await save();
    await button("review").click();
    const offer = after.persistent_hero.rebirth;
    assert.equal(offer.available, true);
    assert.deepEqual(
      await page.locator(".hero-life-preview-list").first().locator("li").allTextContents(),
      offer.resets,
    );
    assert.deepEqual(
      await page.locator(".hero-life-preview-list").last().locator("li").allTextContents(),
      offer.retains,
    );
    assert.ok(
      (await page.locator(".hero-rebirth").innerText()).includes(`${offer.refund} Legacy refunded`),
    );
    await button("cancel").click();
    assert.equal(await save(), stable);
    checks += 5;
    await button("review").click();
    // A real further purchase changes the exact reviewed token, without arbitrary state editing.
    const healthPrice = (await state()).persistent_hero.attributes.find(
      (a) => a.id === "health",
    ).next_price;
    await page.evaluate(async () => {
      const a = window.__idlever;
      await a.engine.upgradeHero("health");
      await a.refresh();
    });
    assert.equal(await button("confirm").isDisabled(), true);
    assert.match(await page.locator(".hero-rebirth").innerText(), /Preview changed/);
    checks += 2;
    await refused("rebirthHero", offer.token);
    await button("review").click();
    before = await state();
    const refund = before.persistent_hero.rebirth.refund;
    assert.equal(refund, price + healthPrice);
    // Root prices are read above; conserve actual total allocation rather than assume a refund fee.
    assert.equal(refund, before.bloodline.spent);
    checks += 2;
    const retained = JSON.parse(await save()).lineage;
    await button("confirm").click();
    await page.waitForFunction(
      (n) => window.__idlever.lineage.persistent_hero.rebirths === n + 1,
      before.persistent_hero.rebirths,
    );
    after = await state();
    assert.equal(after.persistent_hero.name, `Mara ${seed}`);
    assert.equal(after.persistent_hero.id, before.persistent_hero.id);
    assert.equal(after.persistent_hero.incarnation, before.persistent_hero.incarnation + 1);
    assert.equal(after.bloodline.points, before.bloodline.points + refund);
    assert.equal(after.bloodline.spent, 0);
    assert.deepEqual(after.bloodline.upgrades, {});
    assert.equal(after.gold, before.gold);
    assert.equal(after.persistent_hero.recovery_s, 1200);
    assert.equal(after.persistent_hero.rebirth.available, false);
    assert.equal(await page.locator('[data-recovery-seconds="1200"]').count(), 1);
    checks += 10;
    const reborn = JSON.parse(await save()).lineage;
    for (const field of [
      "seed",
      "class",
      "classes",
      "trait_",
      "pkg",
      "sets",
      "active_set",
      "kit",
      "forge",
      "unlocks",
      "found_kinds",
      "pets",
      "kennel",
      "town",
      "best_depth",
      "gold",
      "rng",
    ]) {
      assert.deepEqual(reborn[field], retained[field], `Rebirth retains actual ${field}`);
      checks++;
    }
    await refused("rebirthHero", before.persistent_hero.rebirth.token);
    await page.evaluate(async () => {
      const a = window.__idlever,
        saved = await a.engine.save();
      await a.engine.load(saved);
      await a.refresh();
    });
    assert.equal((await state()).persistent_hero.name, `Mara ${seed}`);
    checks++;
    records.push({ seed, wallet, gold, price, refund, reborn: after.persistent_hero });
  }
  // Actual second resident paid from the earned wallet; detached controls cannot mutate its owner.
  await load("earned-seed-1-balanced");
  await open();
  const owners = await page.evaluate(async () => {
    const a = window.__idlever,
      original = a.lineage.selected_bloodline;
    const gold = a.lineage.gold,
      price = a.lineage.bloodline_price;
    document.querySelector('[data-life-focus="name"]').value = "Wrong owner";
    const form = document.querySelector(".hero-name-form");
    const train = document.querySelector('[data-life-focus="attribute:damage"]');
    document.querySelector('[data-life-focus="review"]').click();
    const confirm = document.querySelector('[data-life-focus="confirm"]');
    await a.engine.addBloodline();
    await a.refresh();
    const second = a.lineage.hero_slots.find((s) => s.id !== original).id;
    await a.engine.selectBloodline(second);
    await a.refresh();
    const before = await a.engine.save();
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    train.click();
    confirm.click();
    await new Promise((r) => setTimeout(r, 40));
    return {
      unchanged: before === (await a.engine.save()),
      second,
      gold,
      price,
      afterGold: a.lineage.gold,
      confirm: !!document.querySelector('[data-life-focus="confirm"]'),
    };
  });
  assert.equal(owners.unchanged, true);
  assert.equal(owners.confirm, false);
  assert.equal(owners.afterGold, owners.gold - owners.price);
  checks += 3;
  // Existing build menus remain free read-only routes, using the actual selected resident.
  // The Hero Hub (Cut220) replaced the bloodline tabs: Loadouts → Gear, Class → Skills, Legacy → Attributes.
  const hubSection = { loadouts: "gear", class: "skills", legacy: "attributes" };
  for (const tab of ["loadouts", "class", "legacy"]) {
    await load("earned-seed-1-balanced");
    await open();
    const before = await save();
    await button(`route:${tab}`).click();
    await page
      .locator(
        `.sheet-wrap:not([hidden]) [data-hub-tab="${hubSection[tab]}"][aria-selected="true"]`,
      )
      .waitFor();
    await settled();
    assert.equal(await save(), before, `${tab} route is free/read-only`);
    checks++;
  }
  // Damage was controlled only to reach death; these are real saved state/recovery API boundaries.
  const states = ["reincarnating-12000", "recovering-11990", "recovering-1", "ready-0", "away"];
  for (const name of states) {
    for (const width of [320, 400, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const scale of [1, 2]) {
        await load(`controlled-${name}`);
        await page.evaluate((scale) => {
          document.documentElement.style.fontSize = `${16 * scale}px`;
        }, scale);
        await open();
        const l = await state(),
          hero = l.persistent_hero;
        assert.equal(await page.locator(`[data-hero-state="${hero.state}"]`).count(), 1);
        if (hero.recovery_s)
          assert.equal(
            await page.locator(`[data-recovery-seconds="${hero.recovery_s}"]`).count(),
            1,
          );
        if (hero.need === "rest")
          assert.equal(await page.locator(`[data-rest-seconds="${hero.rest_s}"]`).count(), 1);
        const geometry = await page.evaluate(() => {
          const panel = document.querySelector(".hero-life-panel"),
            root = panel.closest(".game-window");
          return {
            overflow: root.scrollWidth - root.clientWidth,
            bad: [...panel.querySelectorAll("button,input")]
              .filter((n) => n.getClientRects().length)
              .map((n) => ({
                key: n.dataset.lifeFocus,
                width: n.getBoundingClientRect().width,
                height: n.getBoundingClientRect().height,
              }))
              .filter((r) => r.width < 43.9 || r.height < 43.9),
            claim: [...panel.querySelectorAll("button")].some((n) => /claim/i.test(n.textContent)),
          };
        });
        assert.ok(geometry.overflow <= 1, JSON.stringify({ name, width, scale, geometry }));
        assert.deepEqual(geometry.bad, [], JSON.stringify({ name, width, scale, geometry }));
        assert.equal(geometry.claim, false);
        checks += 4;
        records.push({
          controlled: name,
          width,
          scale,
          state: hero.state,
          seconds: hero.recovery_s,
          geometry,
        });
        if (evidence && width === 400 && scale === 1 && name === "recovering-11990")
          await page.screenshot({ path: `${evidence}/hero-recovery-400.png` });
      }
    }
  }
  await load("controlled-away");
  await open();
  assert.equal(await button("name").isDisabled(), true);
  checks++;
  await refused("renameHero", "Away rename");
  await refused("rebirthHero", (await state()).persistent_hero.rebirth.token);
  await load("controlled-recovering-1");
  await refused("send");
  await page.evaluate(async () => {
    const a = window.__idlever;
    await a.engine.advance(100);
    await a.refresh();
  });
  assert.equal((await state()).persistent_hero.recovery_s, 0);
  checks++;
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px";
  });
  for (const width of [320, 400, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const scale of [1, 2]) {
      await load("earned-seed-1-balanced");
      await page.evaluate((s) => {
        document.documentElement.style.fontSize = `${16 * s}px`;
      }, scale);
      await open("rebirth");
      const geometry = await page.evaluate(() => {
        const p = document.querySelector(".hero-life-panel"),
          r = p.closest(".game-window");
        return {
          overflow: r.scrollWidth - r.clientWidth,
          bad: [...p.querySelectorAll("button")]
            .map((n) => ({
              width: n.getBoundingClientRect().width,
              height: n.getBoundingClientRect().height,
            }))
            .filter((b) => b.width < 43.9 || b.height < 43.9),
        };
      });
      assert.ok(geometry.overflow <= 1, JSON.stringify({ width, scale, geometry }));
      assert.deepEqual(geometry.bad, []);
      checks += 2;
      records.push({ earnedPreview: true, width, scale, geometry });
    }
  }
  await page.setViewportSize({ width: 400, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px";
  });
  await load("earned-seed-1-balanced");
  await open("rebirth");
  if (evidence) await page.screenshot({ path: `${evidence}/hero-earned-rebirth-400.png` });
  assert.deepEqual(errors, []);
  checks++;
  const wasm = readFileSync(new URL("../src/engine/pkg/idlever_wasm_bg.wasm", import.meta.url));
  const proof = {
    checks,
    records,
    inputs,
    source: {},
    package: { bytes: wasm.length, sha256: createHash("sha256").update(wasm).digest("hex") },
    deliveredWasm: await Promise.all(deliveries),
  };
  for (const path of [
    "src/ui/hero-life.ts",
    "src/hero-life.css",
    "src/ui/legacy.ts",
    "src/engine/types.ts",
    "src/engine/wasm.ts",
  ]) {
    const response = await page.request.get(`${url}${path}`);
    const bytes = await response.body();
    assert.equal(response.ok(), true);
    proof.source[path] = {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      bytes: bytes.length,
    };
    if (evidence) writeFileSync(`${evidence}/${path.replaceAll("/", "_")}.served`, bytes);
  }
  if (evidence) writeFileSync(`${evidence}/results.json`, JSON.stringify(proof, null, 2));
  console.log(
    JSON.stringify({
      checks,
      earnedSeeds: [1, 13],
      controlledStates: states,
      layoutCases: 36,
      result: "PASS",
    }),
  );
} catch (error) {
  if (evidence)
    writeFileSync(
      `${evidence}/failure.json`,
      JSON.stringify({ error: String(error), checks, records, inputs }, null, 2),
    );
  throw error;
} finally {
  await browser.close();
}
