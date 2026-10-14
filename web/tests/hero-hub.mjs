// Canonical equipment/attributes and owner-scoped folio, real WASM only.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../../tools/browser.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const manifestPath = process.env.IDLEVER_HUB_INPUTS ?? "docs/evidence/cut220/ui-inputs.json";
const manifest = JSON.parse(readFileSync(resolve(root, manifestPath)));
const out = process.env.IDLEVER_HUB_OUT;
if (out) mkdirSync(resolve(root, out), { recursive: true });
const digest = (b) => ({ bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") });
const pkg = resolve(root, "web/src/engine/pkg");
assert.ok(lstatSync(pkg).isDirectory());
const local = digest(readFileSync(resolve(pkg, "idlever_wasm_bg.wasm")));
const wasmScope = {
  mode: process.env.IDLEVER_HUB_INPUTS ? "frozen-acceptance-manifest" : "current-local-package",
  fixtureManifest: manifest.wasm,
  local,
  expected: process.env.IDLEVER_HUB_INPUTS ? manifest.wasm : local,
};
const sections = ["gear", "skills", "behaviour", "companions", "attributes"];
const widths = [320, 400, 1440],
  scales = [1, 2];
const exhaustive =
  process.env.IDLEVER_CLIENT_AUDIT_SCOPE === "exhaustive" ||
  process.env.IDLEVER_HUB_GEOMETRY === "exhaustive";
const critical =
  process.env.IDLEVER_CLIENT_AUDIT_SCOPE === "smoke" ||
  process.env.IDLEVER_HUB_GEOMETRY === "critical";
assert.ok(
  !process.env.IDLEVER_HUB_GEOMETRY ||
    ["compact", "exhaustive", "critical"].includes(process.env.IDLEVER_HUB_GEOMETRY),
);
const entries = manifest.entries.filter((entry) => !critical || entry.critical);
assert.ok(entries.length, "nonempty explicit Hub case scope required");
const deliveries = [],
  jobs = [],
  errors = [],
  inputs = {},
  records = [],
  omitted = [];
let checks = 0;
const browser = await launchBrowser();
let page, failure, result;
async function drain() {
  if (!page || page.isClosed()) return;
  await page.waitForLoadState("networkidle", { timeout: 15000 });
  let count;
  do {
    count = jobs.length;
    await Promise.all(jobs);
    await page.waitForTimeout(50);
  } while (count !== jobs.length);
}
try {
  page = await browser.newPage({ viewport: { width: 400, height: 1000 } });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().includes("idlever_wasm_bg.wasm"))
      jobs.push(r.body().then((b) => deliveries.push(digest(b))));
  });
  await page.goto(url + "?fresh=1&seed=1&runs=0");
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.kind !== "wasm") throw Error("real WASM required");
  });
  const save = () => page.evaluate(() => window.__idlever.engine.save());
  const state = () => page.evaluate(() => window.__idlever.lineage);
  const active = () => page.locator(".sheet-wrap:not(.under)");
  async function load(entry) {
    const bytes = readFileSync(resolve(root, entry.home));
    inputs[entry.home] = digest(bytes);
    const raw = entry.home.endsWith(".gz") ? gunzipSync(bytes).toString() : bytes.toString();
    assert.equal(inputs[entry.home].sha256, entry.sha256, "immutable fixture compressed hash");
    assert.equal(digest(Buffer.from(raw)).sha256, entry.rawSha256, "immutable fixture raw hash");
    checks += 2;
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      a.lineage = await a.engine.load(raw);
      a.resetGoldFeedback();
      await a.refresh();
      a.go({ kind: "camp" });
    }, raw);
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
    assert.equal(await page.locator("[data-gold-delta],.gold-drop").count(), 0);
    checks++;
  }
  async function settle() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      const sheet = document.querySelector(".sheet-wrap:not(.under)");
      if (sheet)
        await Promise.all(
          sheet
            .getAnimations({ subtree: true })
            .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
            .map((a) => a.finished.catch(() => {})),
        );
    });
  }
  async function open() {
    const before = await save();
    await page.evaluate(async () => {
      const a = window.__idlever;
      (await import("/src/ui/town.ts")).openHero(a);
    });
    await settle();
    assert.equal(await save(), before);
    assert.equal(await active().locator("[data-hub-tab]").count(), 5);
    checks += 2;
  }
  async function section(id) {
    const before = await save();
    await active().locator(`[data-hub-tab="${id}"]`).click();
    await settle();
    assert.equal(
      await active().locator(`[data-hub-tab="${id}"]`).getAttribute("aria-selected"),
      "true",
    );
    assert.equal(await save(), before, "section navigation is read-only");
    checks += 2;
  }
  async function parity(id) {
    const l = await state();
    if (id === "gear") {
      const equipment = l.starting_kits.equipment;
      assert.ok(equipment, "unified canonical equipment required");
      assert.equal(
        await active()
          .locator("[data-hub-build-readiness]")
          .getAttribute("data-hub-build-readiness"),
        "canonical",
      );
      checks += 2;
      for (const phase of ["actual", "next"]) {
        const view = equipment[phase];
        for (const row of view.slots) {
          await active()
            .locator("[data-hub-gear-effects]")
            .evaluate((node) => {
              node.open = true;
            });
          const text = await active()
            .locator(`[data-hub-slot-read="${row.slot}"] [data-hub-slot-detail-phase="${phase}"]`)
            .innerText();
          const anchor = await active()
            .locator(
              `[data-hub-slot="${row.slot}"] ${JSON.stringify(equipment.actual.slots.find((s) => s.slot === row.slot)) === JSON.stringify(equipment.next.slots.find((s) => s.slot === row.slot)) ? "[data-hub-slot-shared]" : `[data-hub-slot-phase="${phase}"]`}`,
            )
            .innerText();
          assert.ok(anchor.includes(row.label));
          checks++;
          if (
            await active().locator(`[data-hub-slot="${row.slot}"] [data-hub-slot-shared]`).count()
          ) {
            assert.ok(anchor.includes("Actual · next delve"));
            checks++;
          }
          for (const value of [row.label, row.origin, row.effect, row.tradeoff].filter(Boolean)) {
            assert.ok(text.includes(value), `${row.slot}/${phase}: ${value}`);
            checks++;
          }
        }
        const totals = active().locator(`[data-hub-build-phase="${phase}"]`);
        for (const [key, value] of Object.entries({
          hp: `${view.stats.hp} / ${view.stats.max_hp}`,
          damage: view.stats.damage.join("–"),
          defence: String(view.stats.defence),
          speed: String(view.stats.speed),
          class: `${view.stats.class} L${view.stats.level}`,
        })) {
          assert.equal(await totals.locator(`[data-hub-stat="${key}"]`).innerText(), value);
          checks++;
        }
        assert.ok((await totals.innerText()).includes(view.note));
        checks++;
      }
    } else if (id === "attributes") {
      const p = l.persistent_hero.progression;
      for (const phase of ["actual", "chosen"]) {
        const card = phase === "actual" ? p.actual_inherited : p.inherited_chosen;
        const node = active().locator(`[data-lasting-trait="${phase}"]`);
        if (card) {
          for (const [key, value] of [
            ["condition", card.condition_effect],
            ["gift", card.gift_effect],
            ["cost", card.cost_effect],
          ]) {
            assert.ok(value !== undefined, "canonical numeric descriptor required");
            if (value) {
              assert.equal(await node.locator(`[data-trait-${key}]`).innerText(), value);
              checks++;
            }
          }
        }
      }
      for (const context of p.family_contexts) {
        const node = active().locator(`[data-family-descriptors="${context.id}"]`);
        if (await node.count())
          for (const [key, value] of [
            ["condition", context.condition_effect],
            ["gift", context.gift_effect],
            ["cost", context.cost_effect],
          ]) {
            assert.equal(await node.locator(`[data-trait-${key}]`).innerText(), value);
            checks++;
          }
      }
    } else if (id === "behaviour") {
      assert.ok(l.actual_packages, "canonical actual packages required");
      checks++;
      const ids = [
        l.actual_packages.stance,
        ...(l.actual_packages.tactics ?? []),
        ...(l.actual_packages.temperament ? [l.actual_packages.temperament] : []),
      ];
      assert.deepEqual(
        await active()
          .locator("[data-hub-actual-package]")
          .evaluateAll((nodes) => nodes.map((node) => node.dataset.hubActualPackage)),
        ids,
      );
      checks++;
      for (const packageId of ids) {
        const choice = l.actual_packages.all.find((row) => row.id === packageId);
        const text = await active().locator(`[data-hub-actual-package="${packageId}"]`).innerText();
        assert.ok(text.includes(choice ? `${choice.name} L${choice.level}` : packageId));
        checks++;
        if (choice?.description) {
          assert.ok(text.includes(choice.description));
          checks++;
        }
      }
      assert.ok(l.actual_packages_note, "canonical live/queued behaviour explanation required");
      assert.equal(
        await active().locator("[data-hub-behaviour-note]").innerText(),
        l.actual_packages_note,
      );
      checks += 2;
    } else if (id === "companions") {
      assert.ok(l.actual_party, "canonical actual pets required");
      checks++;
      assert.deepEqual(
        await active()
          .locator("[data-hub-actual-pet]")
          .evaluateAll((nodes) => nodes.map((node) => Number(node.dataset.hubActualPet))),
        l.actual_party.map((pet) => pet.id),
      );
      checks++;
      for (const pet of l.actual_party) {
        const node = active().locator(`[data-hub-actual-pet="${pet.id}"]`);
        assert.ok((await node.innerText()).includes(pet.name));
        assert.equal(
          await node.locator("[data-hub-pet-hp]").innerText(),
          `${pet.hp} / ${pet.max_hp}`,
        );
        assert.equal(await node.locator("[data-hub-pet-rule]").count(), pet.rules.rows.length);
        checks += 3;
      }
      if (l.live || l.town?.home === false) {
        assert.equal(
          await active().locator('[data-hub-future="companions"]').innerText(),
          "Next delve",
        );
        checks++;
      }
    } else if (id === "skills" && l.town?.home === false) {
      for (const node of await active().locator(".class-tree button,.class-style-choose").all()) {
        assert.equal(await node.isDisabled(), true);
        checks++;
      }
    }
  }
  async function geometry(entry, width, scale, id) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(
      (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
      scale,
    );
    await section(id);
    await parity(id);
    const result = await active()
      .locator("[data-hero-hub]")
      .evaluate((el) => ({
        width: el.clientWidth,
        scrollWidth: el.scrollWidth,
        tabs: [...el.querySelectorAll("[data-hub-tab]")].map((node) => {
          const r = node.getBoundingClientRect();
          return { section: node.dataset.hubTab, x: r.x, y: r.y, w: r.width, h: r.height };
        }),
        targets: [
          ...el.querySelectorAll(
            'button,input,summary,[role="button"],[data-detail-tip],[data-kwh],.kw-on[tabindex="0"]',
          ),
        ]
          .filter((n) => n.getClientRects().length)
          .map((n) => ({
            text: n.textContent,
            w: n.getBoundingClientRect().width,
            h: n.getBoundingClientRect().height,
            disabled: n.disabled,
          })),
      }));
    assert.ok(
      result.scrollWidth <= result.width + 1,
      JSON.stringify({ entry: entry.id, width, scale, id, result }),
    );
    checks++;
    if (width === 400 && scale === 1) {
      assert.equal(
        new Set(result.tabs.map((tab) => Math.round(tab.x))).size,
        2,
        "normal400 uses two tab columns",
      );
      checks++;
    }
    for (const target of result.targets) {
      assert.ok(
        target.w >= 43.9 && target.h >= 43.9,
        JSON.stringify({ entry: entry.id, width, scale, id, target }),
      );
      checks++;
    }
    records.push({
      entry: entry.id,
      state: entry.state,
      width,
      scale,
      section: id,
      readOnly: true,
      geometry: result,
    });
  }
  let awayPartyDone = false;
  let navBoundariesDone = false;
  async function navBoundaries(entry) {
    if (navBoundariesDone) return;
    navBoundariesDone = true;
    await page.setViewportSize({ width: 1440, height: 1000 });
    await section("gear");
    const before = await save();
    const host = active().locator("[data-hero-hub]");
    for (const scale of [1, 2]) {
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      }, scale);
      for (const width of new Set([15 * 16 * scale - 1, 15 * 16 * scale + 1, 419, 421])) {
        await host.evaluate((node, width) => {
          node.style.width = `${width}px`;
        }, width);
        const result = await host.evaluate((node) => ({
          width: node.clientWidth,
          scrollWidth: node.scrollWidth,
          tabs: [...node.querySelectorAll("[data-hub-tab]")].map((tab) => {
            const r = tab.getBoundingClientRect();
            const range = document.createRange();
            range.selectNodeContents(tab);
            return {
              text: tab.textContent,
              x: r.x,
              w: r.width,
              h: r.height,
              lines: range.getClientRects().length,
            };
          }),
        }));
        const expected = width <= 15 * 16 * scale ? 1 : width <= 420 ? 2 : 3;
        assert.equal(new Set(result.tabs.map((tab) => Math.round(tab.x))).size, expected);
        assert.ok(result.scrollWidth <= result.width + 1);
        assert.ok(result.tabs.every((tab) => tab.w >= 43.9 && tab.h >= 43.9));
        if (scale === 1 && width === 421)
          assert.ok(
            result.tabs.every((tab) => tab.lines === 1),
            "normal desktop boundary retains whole-word labels",
          );
        checks += 3;
        records.push({
          entry: entry.id,
          diagnostic: "nav-width-boundary",
          scale,
          requestedWidth: width,
          expectedColumns: expected,
          ...result,
        });
      }
    }
    await host.evaluate((node) => {
      node.style.removeProperty("width");
    });
    assert.equal(await save(), before);
    checks++;
  }
  async function awayIntentBoundary(entry) {
    const before = await state();
    if (awayPartyDone || !before.live || !before.party.length) return;
    await section("companions");
    const raw = JSON.parse(await save()),
      gold = before.gold;
    await active().locator(".drop-pet").first().click();
    await page.waitForFunction(
      (count) => window.__idlever.lineage.party.length === count,
      before.party.length - 1,
    );
    await settle();
    const after = await state(),
      saved = JSON.parse(await save());
    assert.equal(after.gold, gold);
    assert.deepEqual(after.actual_party, before.actual_party);
    checks += 2;
    for (const key of ["run", "floor_start", "sent_state", "live_capsule"]) {
      assert.deepEqual(saved[key], raw[key], `queued pet choice retains ${key}`);
      checks++;
    }
    await parity("companions");
    records.push({
      entry: entry.id,
      functional: "actual-pets-vs-next-pet-choice",
      actual: after.actual_party,
      next: after.party,
      gold,
    });
    awayPartyDone = true;
    await load(entry);
    await open();
  }
  let rebirthDone = false;
  async function rebirthBoundary(entry) {
    const before = await state();
    if (critical || rebirthDone || !before.persistent_hero.rebirth.available) return;
    await section("gear");
    const stale = await active()
      .locator('[data-pin-slot="helm"][data-pin-choice="none"]')
      .elementHandle();
    await section("attributes");
    const stable = await save();
    await active().locator('[data-life-focus="review"]').click();
    await settle();
    assert.equal(await save(), stable);
    checks++;
    const confirm = await active().locator('[data-life-focus="confirm"]').elementHandle();
    await active().locator('[data-life-focus="confirm"]').click();
    await page.waitForFunction(
      (inc) => window.__idlever.lineage.persistent_hero.incarnation !== inc,
      before.persistent_hero.incarnation,
    );
    await settle();
    const after = await state();
    assert.equal(after.gold, before.gold);
    assert.equal(after.persistent_hero.progression.inherited_chosen, null);
    assert.equal(after.persistent_hero.progression.family_chosen, null);
    checks += 3;
    const saved = await save();
    await page.evaluate(() => {
      const e = window.__idlever.engine;
      window.__hubProbe = { engine: e, original: {}, calls: 0 };
      for (const key of ["setStartingKit", "setArmourPin", "rebirthHero"])
        if (e[key]) {
          window.__hubProbe.original[key] = e[key];
          e[key] = (...args) => {
            window.__hubProbe.calls++;
            return window.__hubProbe.original[key].apply(e, args);
          };
        }
    });
    if (stale) await stale.evaluate((node) => node.onclick?.call(node, new MouseEvent("click")));
    await confirm.evaluate((node) => node.onclick?.call(node, new MouseEvent("click")));
    const calls = await page.evaluate(() => {
      const p = window.__hubProbe;
      for (const [key, fn] of Object.entries(p.original)) p.engine[key] = fn;
      delete window.__hubProbe;
      return p.calls;
    });
    assert.equal(calls, 0, "old incarnation controls call no mutator");
    assert.equal(await save(), saved, "stale controls after actual rebirth preserve current save");
    checks += 2;
    records.push({
      entry: entry.id,
      functional: "actual-rebirth-and-stale-incarnation",
      before: before.persistent_hero,
      after: after.persistent_hero,
      gold: before.gold,
    });
    rebirthDone = true;
    await load(entry);
    await open();
  }
  async function interactionStates() {
    const before = await save(),
      button = active().locator('[data-hub-tab="gear"]');
    const frames = () =>
      page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
    await page.mouse.move(0, 0);
    await frames();
    await settle();
    const visibleStyle = (node) => {
      const s = getComputedStyle(node);
      return {
        background: s.backgroundColor,
        border: s.borderTopColor,
        shadow: s.boxShadow,
        filter: s.filter,
        transform: s.transform,
      };
    };
    const normal = await button.evaluate(visibleStyle);
    await button.hover();
    await frames();
    await settle();
    const hovered = await button.evaluate((node) => node.matches(":hover"));
    const hover = await button.evaluate(visibleStyle);
    await page.mouse.down();
    await frames();
    await settle();
    const activePress = await button.evaluate((node) => node.matches(":active"));
    const pressed = await button.evaluate(visibleStyle);
    await page.mouse.up();
    records.push({ functional: "control-states", normal, hover, pressed, hovered, activePress });
    assert.equal(hovered, true);
    assert.equal(activePress, true);
    assert.notDeepEqual(hover, normal, "hover changes visible control material");
    assert.notDeepEqual(pressed, hover, "press changes visible control material");
    checks += 2;
    await button.focus();
    await page.keyboard.press("ArrowRight");
    const focus = await active()
      .locator('[data-hub-tab="skills"]')
      .evaluate((node) => ({
        active: document.activeElement === node,
        style: getComputedStyle(node).outlineStyle,
        width: parseFloat(getComputedStyle(node).outlineWidth),
      }));
    assert.ok(focus.active && focus.style !== "none" && focus.width >= 2);
    assert.equal(await save(), before);
    checks += 2;
  }
  async function staleResidents(entry) {
    const initial = await state();
    if ((initial.hero_slots?.length ?? 0) < 3) return;
    await section("gear");
    const stale = await active().locator('[data-hub-slot="weapon"]').elementHandle();
    for (const resident of initial.hero_slots.slice(0, 3)) {
      await active().locator(`[data-hub-resident="${resident.id}"]`).click();
      await page.waitForFunction(
        (id) => window.__idlever.lineage.selected_bloodline === id,
        resident.id,
      );
      await settle();
      assert.equal((await state()).gold, initial.gold);
      checks++;
      for (const id of sections) {
        await section(id);
        await parity(id);
      }
    }
    const stable = await save();
    await stale.evaluate((node) => node.click());
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    assert.equal(await save(), stable, "detached prior resident anchor has no effect");
    checks++;
    records.push({
      entry: entry.id,
      functional: "three-resident-read-and-stale-anchor",
      gold: initial.gold,
    });
    await load(entry);
    await open();
  }
  async function freeGear(entry) {
    const before = await state();
    if (before.town?.home === false || before.live) return;
    await section("gear");
    for (const slot of ["weapon", "helm", "armour", "boots"]) {
      const raw = await save();
      await active().locator(`[data-hub-slot="${slot}"]`).click();
      const detail = active().locator(`[data-starting-gear="${slot}"]`);
      assert.equal(await detail.getAttribute("open"), "");
      assert.equal(await save(), raw, "slot anchor opens legal choices without writing");
      checks += 2;
    }
    const empty = active().locator('[data-pin-slot="helm"][data-pin-choice="none"]');
    if ((await empty.count()) && !(await empty.isDisabled())) {
      await empty.click();
      await settle();
      assert.equal((await state()).gold, before.gold);
      checks++;
      await parity("gear");
      records.push({
        entry: entry.id,
        functional: "free-pinned-empty-helm",
        equipment: (await state()).starting_kits.equipment,
      });
    }
    const name = active().locator('input[aria-label="Kit name"]');
    if ((await name.count()) && !(await name.isDisabled())) {
      await name.fill("Hub proof kit");
      await active().locator('form.kit-save button[type="submit"]').click();
      await page.waitForFunction(() =>
        window.__idlever.lineage.starting_kits.saved.some((kit) => kit.name === "Hub proof kit"),
      );
      assert.equal((await state()).gold, before.gold);
      checks++;
      records.push({
        entry: entry.id,
        functional: "free-saved-kit",
        saved: (await state()).starting_kits.saved,
      });
    }
    await load(entry);
    await open();
  }
  for (const entry of entries) {
    await load(entry);
    const l = await state();
    if (entry.state) assert.equal(l.persistent_hero.state, entry.state);
    checks++;
    const lit = l.town?.home !== false ? l.town?.workers?.find((worker) => worker.lit) : null;
    if (lit) {
      const target = page.locator(`[data-building="worker"][data-worker="${lit.id}"]`);
      const name = l.tree?.nodes.find((node) => node.id === lit.id)?.name ?? lit.id;
      assert.ok((await target.getAttribute("aria-label")).includes(name));
      assert.ok(
        (await target.innerText()).includes(lit.price ? `Hire $${lit.price}` : "Hire free"),
      );
      checks += 2;
    }

    const readCost = await page.evaluate(async () => {
      const e = window.__idlever.engine,
        before = await e.save();
      for (let i = 0; i < 5; i++) await e.lineage();
      const first = await e.lineage(),
        samples = [];
      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        await e.lineage();
        samples.push(performance.now() - start);
      }
      const after = await e.lineage(),
        saved = await e.save();
      if (before !== saved || first.gold !== after.gold)
        throw Error("readonly lineage cost diagnostic mutated Game/Gold");
      return {
        samples,
        reads: 50,
        warmup: 5,
        includes: "WASM bridge and JSON read",
        gold: first.gold,
        saveEqual: true,
        budget: null,
      };
    });
    records.push({ entry: entry.id, diagnostic: "lineage-read-cost", ...readCost });
    checks += 2;
    await open();
    await navBoundaries(entry);
    if (entry.geometry) {
      for (const width of widths)
        for (const scale of scales) {
          const preferred =
            sections[
              (widths.indexOf(width) +
                scales.indexOf(scale) +
                (entry.state === "away" ? 2 : entry.state === "recovering" ? 4 : 0)) %
                sections.length
            ];
          for (const id of sections) {
            const chosen =
              exhaustive ||
              (!critical && (id === preferred || (width === 400 && scale === 1))) ||
              (critical && width === 400 && scale === 1);
            if (chosen) await geometry(entry, width, scale, id);
            else omitted.push({ entry: entry.id, state: entry.state, width, scale, section: id });
          }
        }
    } else
      for (const id of sections) {
        await section(id);
        await parity(id);
      }
    await awayIntentBoundary(entry);
    await staleResidents(entry);
    await freeGear(entry);
    await rebirthBoundary(entry);
    await interactionStates();
    const before = await save();
    await active().locator('[data-hub-tab="gear"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await active().locator('[data-hub-tab="skills"]').getAttribute("aria-selected"),
      "true",
    );
    assert.equal(await save(), before);
    checks += 2;
    await page.evaluate(() => window.__idlever.refresh());
    await settle();
    assert.equal(
      await page.evaluate(() => document.activeElement?.dataset.hubTab),
      "skills",
      "live refresh retains tab focus",
    );
    checks++;
  }
  await drain();
  assert.ok(deliveries.length);
  for (const delivery of deliveries) assert.deepEqual(delivery, wasmScope.expected);
  checks += deliveries.length;
  const source = {};
  for (const p of [
    "src/app.ts",
    "src/ui/hero-hub.ts",
    "src/hero-hub.css",
    "src/ui/town.ts",
    "src/ui/camp.ts",
    "src/ui/hero-progression.ts",
    "src/ui/hero-life.ts",
    "src/ui/starting-kits.ts",
    "src/ui/party.ts",
    "src/ui/class-tree.ts",
    "src/ui/class-styles.ts",
    "src/engine/pkg/idlever_wasm_bg.wasm",
  ]) {
    const r = await page.request.get(url + p);
    assert.ok(r.ok(), p);
    const b = await r.body();
    source[p] = digest(b);
    if (out && !p.endsWith(".wasm"))
      writeFileSync(resolve(root, out, p.replaceAll("/", "_") + ".served"), b);
  }
  assert.deepEqual(source["src/engine/pkg/idlever_wasm_bg.wasm"], wasmScope.expected);
  assert.deepEqual(errors, []);
  checks += 2;
  result = {
    result: "PASS",
    checks,
    wasmScope,
    inputs,
    deliveries,
    source,
    records,
    geometryScope: {
      mode: exhaustive ? "exhaustive" : critical ? "critical" : "compact",
      actualViews: records.filter((record) => record.section).length,
      omitted,
    },
    errors,
  };
} catch (error) {
  failure = error;
} finally {
  try {
    await drain();
  } catch (error) {
    if (!failure) failure = error;
    else if (out)
      writeFileSync(resolve(root, out, "reader-close-failure.txt"), String(error.stack ?? error));
  }
  try {
    await browser.close();
  } catch (error) {
    if (!failure) failure = error;
    else if (out)
      writeFileSync(resolve(root, out, "browser-close-failure.txt"), String(error.stack ?? error));
  }
}
if (failure) {
  if (out)
    writeFileSync(
      resolve(root, out, "failure.json"),
      JSON.stringify(
        {
          result: "FAIL",
          error: String(failure.stack ?? failure),
          wasmScope,
          inputs,
          deliveries,
          records,
          omitted,
          errors,
        },
        null,
        2,
      ),
    );
  throw failure;
}
if (out) writeFileSync(resolve(root, out, "results.json"), JSON.stringify(result, null, 2));
console.log(
  JSON.stringify({
    result: "PASS",
    checks,
    views: records.filter((record) => record.section).length,
    cases: entries.length,
  }),
);
