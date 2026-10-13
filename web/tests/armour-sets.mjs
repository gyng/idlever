// Real-WASM acceptance. Fixture manifest distinguishes earned progress from controlled placement/class cases.
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
const manifestPath = resolve(
  root,
  process.env.IDLEVER_SET_INPUTS ?? "docs/evidence/cut216/ui-inputs.json",
);
const manifest = JSON.parse(readFileSync(manifestPath));
const packageDir = resolve(root, "web/src/engine/pkg");
assert.ok(
  lstatSync(packageDir).isDirectory(),
  "the actual engine package must be a real directory",
);
const localWasm = readFileSync(resolve(packageDir, "idlever_wasm_bg.wasm"));
const currentWasm = {
  bytes: localWasm.length,
  sha256: createHash("sha256").update(localWasm).digest("hex"),
};
const wasmScope = {
  mode: process.env.IDLEVER_SET_INPUTS ? "frozen-acceptance-manifest" : "current-local-package",
  fixtureManifest: manifest.wasm,
  currentLocalPackage: currentWasm,
  expected: process.env.IDLEVER_SET_INPUTS ? manifest.wasm : currentWasm,
};
let entries = manifest.entries;
if (process.env.IDLEVER_SET_CASES) {
  const ids = process.env.IDLEVER_SET_CASES.split(",");
  assert.ok(
    ids.every((id) => entries.some((entry) => entry.id === id)),
    "unknown fixture case",
  );
  entries = entries.filter((entry) => ids.includes(entry.id));
}
const out = process.env.IDLEVER_SET_SHOTS
  ? resolve(root, process.env.IDLEVER_SET_SHOTS)
  : undefined;
if (out) mkdirSync(out, { recursive: true });
const dimension = (name, defaults) => {
  if (!process.env[name]) return defaults;
  const values = process.env[name].split(",").map(Number);
  assert.ok(values.length && values.every((n) => Number.isFinite(n) && n > 0), name);
  return [...new Set(values)];
};
const widths = dimension("IDLEVER_SET_WIDTHS", [320, 400, 1440]);
const scales = dimension("IDLEVER_SET_SCALES", [1, 2]);
const scope = {
  diagnostic: Boolean(
    process.env.IDLEVER_SET_WIDTHS ||
    process.env.IDLEVER_SET_SCALES ||
    process.env.IDLEVER_SET_CASES,
  ),
  cases: entries.map((entry) => entry.id),
  widths,
  scales,
  views: ["forge", "loadouts"],
  layouts: entries.length * widths.length * scales.length * 2,
};
const browser = await launchBrowser();
let checks = 0;
const records = [],
  inputs = {};
try {
  const page = await browser.newPage();
  const delivered = [];
  const deliveryJobs = [];
  page.on("response", (response) => {
    if (response.url().includes("idlever_wasm_bg.wasm"))
      deliveryJobs.push(
        (async () => {
          const bytes = await response.body();
          delivered.push({
            url: response.url(),
            bytes: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          });
        })(),
      );
  });
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.kind !== "wasm") throw Error("actual package required");
  });
  await Promise.all(deliveryJobs);
  assert.ok(delivered.length, "actual browser-delivered WASM required before fixture checks");
  for (const binary of delivered) {
    assert.equal(binary.sha256, wasmScope.expected.sha256);
    assert.equal(binary.bytes, wasmScope.expected.bytes);
    checks += 2;
  }
  const state = () => page.evaluate(() => window.__idlever.lineage);
  const save = () => page.evaluate(() => window.__idlever.engine.save());
  const active = () => page.locator(".sheet-wrap:not(.under)");
  async function load(path) {
    const bytes = readFileSync(resolve(root, path));
    inputs[path] = {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    const raw = path.endsWith(".gz") ? gunzipSync(bytes).toString() : bytes.toString();
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      await a.engine.load(raw);
      await a.refresh();
      a.go({ kind: "camp" });
    }, raw);
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
  }
  async function settle() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      const w = document.querySelector(".sheet-wrap:not(.under)");
      if (w)
        await Promise.all(
          w
            .getAnimations({ subtree: true })
            .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
            .map((a) => a.finished.catch(() => {})),
        );
    });
  }
  async function open(view) {
    const before = await save();
    await page.evaluate(async (view) => {
      const a = window.__idlever;
      if (view === "forge") (await import("/src/ui/forge.ts")).openForge(a);
      else (await import("/src/ui/town.ts")).openHero(a, null, "loadouts");
    }, view);
    await settle();
    assert.equal(await save(), before);
    checks++;
  }
  async function inspect() {
    const l = await state();
    for (const set of l.starting_kits.armour_sets) {
      const card = active().locator(`[data-set-family="${set.id}"]`);
      assert.equal(await card.count(), 1);
      checks++;
      assert.match(
        await card.locator('[data-set-count="current"]').innerText(),
        new RegExp(`${set.actual_count}/3`),
      );
      assert.match(
        await card.locator('[data-set-count="next"]').innerText(),
        new RegExp(`${set.next_count}/3`),
      );
      checks += 2;
      for (const phase of ["current", "next"]) {
        const rows = phase === "current" ? set.actual : set.next;
        for (const row of rows) {
          const line = card.locator(
            `[data-set-equipment="${phase}"] [data-set-slot="${row.slot}"]`,
          );
          assert.ok((await line.textContent()).includes(row.label));
          assert.equal(await line.getAttribute("data-origin"), row.origin);
          checks += 2;
        }
        for (const bonus of phase === "current" ? set.actual_bonuses : set.next_bonuses) {
          const b = card.locator(
            `[data-set-bonuses="${phase}"] [data-required="${bonus.required}"]`,
          );
          assert.equal(await b.getAttribute("data-active"), String(bonus.active));
          assert.ok((await b.textContent()).includes(bonus.effect));
          checks += 2;
        }
      }
      for (const piece of set.pieces) {
        assert.equal(
          await card.locator(`[data-set-piece="${piece.kind}"]`).getAttribute("data-owned"),
          String(piece.owned),
        );
        checks++;
      }
      const focus = card.locator(`[data-set-focus="${set.id}"]`);
      if (await focus.count()) {
        assert.equal(await focus.locator("b").innerText(), set.focus.label);
        assert.equal(await focus.locator('[role="status"]').innerText(), set.focus.status);
        const text = await focus.innerText();
        if (set.focus.source) assert.ok(text.includes(set.focus.source));
        if (set.focus.blocked) assert.ok(text.includes(set.focus.blocked));
        assert.equal(
          await focus.locator("button").getAttribute("aria-pressed"),
          String(set.focus.active),
        );
        checks += 3 + Number(Boolean(set.focus.source)) + Number(Boolean(set.focus.blocked));
      }
    }
  }
  await open("forge");
  assert.equal(await active().locator("[data-set-family]").count(), 0);
  assert.equal(await active().locator("[data-legendary-kind]").count(), 0);
  checks += 2;
  for (const entry of entries) {
    if (entry.before) {
      await load(entry.before);
      const find = await page.evaluate(async (n) => {
        const a = window.__idlever,
          result = await a.engine.step(n);
        await a.refresh();
        return result.events
          .filter((e) => e.k === "discovery" && e.find.first)
          .map((e) => e.find.kind);
      }, entry.findSteps);
      assert.ok(find.includes(entry.piece));
      checks++;
      records.push({ id: entry.id, earned: entry.earned, sourceFind: find });
    }
    await load(entry.home);
    await open("forge");
    await inspect();
    let l = await state();
    assert.ok(l.starting_kits.armour_sets.length, "actual owned family required");
    checks++;
    const family = l.starting_kits.armour_sets[0];
    const beforeLink = await save();
    await active().locator(`[data-set-link="${family.id}"]`).click();
    await active().locator("[data-starting-kits]").waitFor();
    await settle();
    assert.equal(await save(), beforeLink);
    checks++;
    for (const slot of ["helm", "armour", "boots"])
      assert.equal(await active().locator(`[data-starting-gear="${slot}"]`).count(), 1);
    checks += 3;
    if (entry.focusStopped) {
      assert.equal(family.focus.active, false);
      assert.match(family.focus.status, /3 delves/);
      checks += 2;
      assert.ok(
        (await active().locator(`[data-set-focus="${family.id}"]`).textContent()).includes(
          family.focus.status,
        ),
      );
      checks++;
    }
    if (entry.expectedFocusStatus) {
      assert.equal(family.focus.status, entry.expectedFocusStatus);
      assert.equal(
        await active().locator(`[data-set-focus="${family.id}"] [role="status"]`).innerText(),
        entry.expectedFocusStatus,
      );
      assert.equal(family.focus.active, false);
      assert.equal(await save(), beforeLink);
      assert.equal((await state()).gold, l.gold);
      checks += 5;
      records.push({ id: entry.id, readOnly: true, gold: l.gold, focus: family.focus });
    }
    if (!entry.statusOnly) {
      if (entry.classRefusal) {
        const owned = JSON.parse(await save()).lineage.town.owned_shapes;
        const incompatible = l.starting_kits.weapons.find(
          (row) => owned.includes(row.kind) && !row.compatible,
        );
        assert.ok(incompatible, "actual owned incompatible weapon required");
        assert.equal(incompatible.available, false);
        assert.ok(incompatible.needs, "Rust names the class refusal");
        checks += 3;
        assert.equal(
          await active().locator(`[data-kit-choice="${incompatible.kind}"]`).isDisabled(),
          true,
        );
        checks++;
        const refused = await page.evaluate(
          async (config) => {
            const a = window.__idlever,
              before = await a.engine.save();
            let error = "";
            try {
              await a.engine.setStartingKit(JSON.stringify(config));
            } catch (e) {
              error = String(e);
            }
            return { error, unchanged: before === (await a.engine.save()) };
          },
          {
            ...(l.starting_kits.current ?? { weapon: null, armour: null, supplies: [] }),
            weapon: incompatible.kind,
          },
        );
        assert.ok(refused.error);
        assert.equal(refused.unchanged, true);
        checks += 2;
      }
      const gold = l.gold;
      const follow = active().locator(`[data-follow-set="${family.id}"]`);
      if ((await follow.getAttribute("aria-pressed")) === "true") {
        await follow.click();
        await page.waitForFunction(
          () => !window.__idlever.lineage.starting_kits.current?.follow_set,
        );
      }
      await follow.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        (id) => window.__idlever.lineage.starting_kits.current?.follow_set === id,
        family.id,
      );
      assert.equal(
        await page.evaluate(() => document.activeElement.dataset.action),
        `follow:${family.id}`,
      );
      checks++;
      assert.equal((await state()).gold, gold);
      checks++;
      if (entry.expectedFollowCount !== undefined) {
        assert.equal(
          (await state()).starting_kits.armour_sets[0].next_count,
          entry.expectedFollowCount,
        );
        checks++;
      }
      const followedGear = (await state()).starting_kits.armour_sets[0].next.map((row) => ({
        slot: row.slot,
        kind: row.kind,
      }));
      await follow.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => !window.__idlever.lineage.starting_kits.current?.follow_set);
      const frozen = (await state()).starting_kits;
      assert.deepEqual(
        frozen.armour_sets[0].next.map((row) => ({ slot: row.slot, kind: row.kind })),
        followedGear,
        "Stopping Follow freezes the canonical resolved equipment",
      );
      assert.equal((await state()).gold, gold);
      assert.equal(
        await page.evaluate(() => document.activeElement.dataset.action),
        `follow:${family.id}`,
      );
      checks += 3;
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        (id) => window.__idlever.lineage.starting_kits.current?.follow_set === id,
        family.id,
      );
      const boots = active().locator('[data-starting-gear="boots"]');
      await boots.evaluate((n) => {
        n.open = true;
      });
      const empty = active().locator('[data-pin-slot="boots"][data-pin-choice="none"]');
      await empty.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        () => window.__idlever.lineage.starting_kits.current?.pins?.boots === "none",
      );
      assert.equal(
        await page.evaluate(() => document.activeElement.dataset.action),
        "pin:boots:none",
      );
      checks++;
      const nextBoot = (await state()).starting_kits.armour_sets[0].next.find(
        (r) => r.slot === "boots",
      );
      assert.equal(nextBoot.kind, null);
      assert.equal(nextBoot.origin, "pin");
      assert.equal((await state()).gold, gold);
      checks += 3;
      const authored = (await state()).starting_kits.current;
      await active().locator('[aria-label="Kit name"]').fill(`Set ${entry.id}`);
      await active().locator(".kit-save button").click();
      await page.waitForFunction(
        (name) => window.__idlever.lineage.starting_kits.saved.some((k) => k.name === name),
        `Set ${entry.id}`,
      );
      const saved = (await state()).starting_kits.saved.find((k) => k.name === `Set ${entry.id}`);
      assert.deepEqual(saved.config, authored);
      assert.equal((await state()).gold, gold);
      checks += 2;
      await active().locator('[data-kit-reset="1"]').click();
      await page.waitForFunction(() => window.__idlever.lineage.starting_kits.current === null);
      await active()
        .locator(`[data-saved-kit="${saved.id}"] button`)
        .filter({ hasText: /^Use$/ })
        .click();
      await page.waitForFunction(
        (id) => window.__idlever.lineage.starting_kits.selected === id,
        saved.id,
      );
      assert.deepEqual((await state()).starting_kits.current, authored);
      assert.equal((await state()).gold, gold);
      checks += 2;
      await page.evaluate(async () => {
        const a = window.__idlever,
          raw = await a.engine.save();
        await a.engine.load(raw);
        await a.refresh();
      });
      assert.deepEqual((await state()).starting_kits.current, authored);
      assert.equal((await state()).gold, gold);
      checks += 2;
      await active()
        .locator(`[data-saved-kit="${saved.id}"] button`)
        .filter({ hasText: /^Delete$/ })
        .click();
      await page.waitForFunction(
        (id) => !window.__idlever.lineage.starting_kits.saved.some((k) => k.id === id),
        saved.id,
      );
      assert.equal((await state()).gold, gold);
      checks++;
      const refusal = await page.evaluate(async () => {
        const a = window.__idlever,
          before = await a.engine.save();
        let error = "";
        try {
          await a.engine.setStartingKit(
            JSON.stringify({
              weapon: null,
              armour: null,
              helm: "unknown-set-piece",
              boots: null,
              supplies: [],
            }),
          );
        } catch (e) {
          error = String(e);
        }
        return { error, unchanged: before === (await a.engine.save()) };
      });
      assert.ok(refusal.error);
      assert.equal(refusal.unchanged, true);
      checks += 2;
      if (entry.prepare) {
        await load(entry.home);
        await open("loadouts");
        await page.evaluate(async () => {
          const a = window.__idlever;
          await a.engine.send();
          await a.refresh();
        });
        const before = JSON.parse(await save()),
          refitGold = (await state()).gold;
        assert.equal(before.run.turn, 0);
        checks++;
        const f = (await state()).starting_kits.armour_sets[0];
        if (!(await state()).starting_kits.current?.follow_set) {
          await active().locator(`[data-follow-set="${f.id}"]`).click();
          await page.waitForFunction(
            (id) => window.__idlever.lineage.starting_kits.current?.follow_set === id,
            f.id,
          );
        }
        const after = JSON.parse(await save());
        for (const field of ["id", "rng", "toll", "passage", "pets"]) {
          assert.deepEqual(after.run[field], before.run[field]);
          checks++;
        }
        for (const field of ["pos", "hp", "max_hp", "energy", "class"]) {
          assert.deepEqual(after.run.hero[field], before.run.hero[field]);
          checks++;
        }
        assert.deepEqual(after.lineage.rng, before.lineage.rng);
        assert.equal((await state()).gold, refitGold);
        checks += 2;
        records.push({ id: entry.id, prepared: true, free: true });
      }
      if (entry.paidResident) {
        await load(entry.home);
        await open("loadouts");
        const owner = await page.evaluate(async () => {
          const a = window.__idlever,
            first = a.lineage.selected_bloodline,
            old = document.querySelector("[data-follow-set]"),
            gold = a.lineage.gold,
            price = a.lineage.bloodline_price;
          const original = a.lineage.starting_kits.current,
            owned = a.lineage.starting_kits.armour_sets.flatMap((s) =>
              s.pieces.filter((p) => p.owned).map((p) => p.kind),
            );
          await a.engine.addBloodline();
          await a.refresh();
          const second = a.lineage.hero_slots.find((s) => s.id !== first).id;
          await a.engine.selectBloodline(second);
          await a.refresh();
          const before = await a.engine.save(),
            actual = a.engine.setStartingKit;
          let attempts = 0;
          a.engine.setStartingKit = (...args) => {
            attempts++;
            return actual.apply(a.engine, args);
          };
          old.click();
          await new Promise((r) => setTimeout(r, 30));
          a.engine.setStartingKit = actual;
          const result = {
            gold,
            price,
            after: a.lineage.gold,
            attempts,
            unchanged: before === (await a.engine.save()),
            owned,
            otherOwned: a.lineage.starting_kits.armour_sets.flatMap((s) =>
              s.pieces.filter((p) => p.owned).map((p) => p.kind),
            ),
            secondConfig: a.lineage.starting_kits.current,
          };
          await a.engine.selectBloodline(first);
          await a.refresh();
          result.originalRetained =
            JSON.stringify(a.lineage.starting_kits.current) === JSON.stringify(original);
          return result;
        });
        assert.equal(owner.after, owner.gold - owner.price);
        assert.equal(owner.attempts, 0);
        assert.equal(owner.unchanged, true);
        assert.deepEqual(owner.otherOwned, owner.owned);
        assert.equal(owner.originalRetained, true);
        checks += 5;
        records.push({ id: entry.id, paidResident: owner });
      }
      if (entry.away) {
        await load(entry.away);
        await open("loadouts");
        await inspect();
        assert.equal(await active().locator("[data-follow-set]").first().isDisabled(), true);
        checks++;
        const f = (await state()).starting_kits.armour_sets[0],
          control = active().locator(`[data-source-focus="${f.id}"]`);
        assert.equal(await control.isDisabled(), !f.focus.active && !f.focus.available);
        checks++;
        if (f.focus.active || f.focus.available) {
          const run = JSON.parse(await save()).run,
            gold = (await state()).gold;
          await control.click();
          await page.waitForFunction(
            ({ id, previous }) =>
              window.__idlever.lineage.starting_kits.armour_sets.find((s) => s.id === id).focus
                .active !== previous,
            { id: f.id, previous: f.focus.active },
          );
          assert.deepEqual(JSON.parse(await save()).run, run);
          assert.equal((await state()).gold, gold);
          checks += 2;
        }
        records.push({ id: entry.id, away: true, focus: f.focus });
      }
    }
    for (const width of widths)
      for (const scale of scales)
        for (const view of ["forge", "loadouts"]) {
          await page.setViewportSize({ width, height: 900 });
          await load(entry.home);
          await page.evaluate((s) => {
            document.documentElement.style.fontSize = `${16 * s}px`;
          }, scale);
          await open(view);
          await active()
            .locator("details")
            .evaluateAll((ns) =>
              ns.forEach((n) => {
                n.open = true;
              }),
            );
          await settle();
          await inspect();
          const geometry = await active().evaluate((el) => {
            const w = el.querySelector(".game-window");
            return {
              overflow: w.scrollWidth - w.clientWidth,
              bad: [...w.querySelectorAll("button,input,summary")]
                .filter((n) => n.getClientRects().length)
                .map((n) => ({
                  text: n.textContent,
                  width: n.getBoundingClientRect().width,
                  height: n.getBoundingClientRect().height,
                }))
                .filter((n) => n.width < 43.9 || n.height < 43.9),
            };
          });
          assert.ok(
            geometry.overflow <= 1,
            JSON.stringify({ id: entry.id, width, scale, view, geometry }),
          );
          assert.deepEqual(geometry.bad, []);
          checks += 2;
          const contrast = await active()
            .locator(".set-family")
            .first()
            .evaluate((el) => {
              const c = getComputedStyle(el),
                probe = document.createElement("span");
              el.append(probe);
              probe.style.color = "var(--ui-focus)";
              const focus = getComputedStyle(probe).color;
              probe.remove();
              const luminance = (color) => {
                const values = color
                  .match(/[\d.]+/g)
                  .slice(0, 3)
                  .map(Number)
                  .map((v) => {
                    const n = v / 255;
                    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
                  });
                return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
              };
              const ratio = (a, b) => {
                const x = luminance(a),
                  y = luminance(b);
                return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
              };
              return {
                surface: c.backgroundColor,
                text: c.color,
                edge: c.borderTopColor,
                focus,
                textRatio: ratio(c.color, c.backgroundColor),
                edgeRatio: ratio(c.borderTopColor, c.backgroundColor),
                focusRatio: ratio(focus, c.backgroundColor),
                scope: "computed solid set-card material",
              };
            });
          assert.ok(contrast.textRatio >= 4.5, JSON.stringify(contrast));
          assert.ok(contrast.edgeRatio >= 3, JSON.stringify(contrast));
          assert.ok(contrast.focusRatio >= 3, JSON.stringify(contrast));
          checks += 3;
          records.push({
            id: entry.id,
            earned: entry.earned,
            width,
            scale,
            view,
            geometry,
            contrast,
          });
          if (out && width === 400 && scale === 1)
            await page.screenshot({ path: `${out}/${entry.id}-${view}-${width}.png` });
        }
  }
  const source = {};
  for (const path of [
    "src/ui/set-equipment.ts",
    "src/set-equipment.css",
    "src/ui/starting-kits.ts",
    "src/ui/forge.ts",
    "src/ui/bloodline-tabs.ts",
    "src/engine/pkg/idlever_wasm_bg.wasm",
  ]) {
    const r = await page.request.get(`${url}${path}`),
      bytes = await r.body();
    source[path] = {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    if (out && !path.endsWith(".wasm"))
      writeFileSync(`${out}/${path.replaceAll("/", "_")}.served`, bytes);
  }
  assert.equal(source["src/engine/pkg/idlever_wasm_bg.wasm"].sha256, wasmScope.expected.sha256);
  checks++;
  await Promise.all(deliveryJobs);
  assert.ok(delivered.length, "actual browser-delivered WASM required");
  checks++;
  for (const binary of delivered) {
    assert.equal(binary.sha256, wasmScope.expected.sha256);
    assert.equal(binary.bytes, wasmScope.expected.bytes);
    checks += 2;
  }
  if (out)
    writeFileSync(
      `${out}/results.json`,
      JSON.stringify(
        { checks, scope, wasmScope, inputs, records, source, delivered, result: "PASS" },
        null,
        2,
      ),
    );
  console.log(JSON.stringify({ checks, scope, layouts: scope.layouts, result: "PASS" }));
} catch (error) {
  if (out)
    writeFileSync(
      `${out}/failure.json`,
      JSON.stringify({ error: String(error), checks, scope, wasmScope, inputs, records }, null, 2),
    );
  throw error;
} finally {
  await browser.close();
}
