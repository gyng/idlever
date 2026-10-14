// Actual Rust survivor stages. Controlled boundary inputs remain explicitly labeled.
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
const manifest = JSON.parse(
  readFileSync(
    resolve(root, process.env.IDLEVER_PROGRESS_INPUTS ?? "docs/evidence/cut219/ui-inputs.json"),
  ),
);
const out = process.env.IDLEVER_PROGRESS_OUT
  ? resolve(root, process.env.IDLEVER_PROGRESS_OUT)
  : null;
if (out) mkdirSync(out, { recursive: true });
const pkg = resolve(root, "web/src/engine/pkg");
assert.ok(lstatSync(pkg).isDirectory(), "real package directory required");
const binary = readFileSync(resolve(pkg, "idlever_wasm_bg.wasm"));
const localWasm = {
  bytes: binary.length,
  sha256: createHash("sha256").update(binary).digest("hex"),
};
const wasmScope = {
  mode: process.env.IDLEVER_PROGRESS_INPUTS
    ? "frozen-acceptance-manifest"
    : "current-local-package",
  fixtureManifest: manifest.wasm,
  localWasm,
  expected: process.env.IDLEVER_PROGRESS_INPUTS ? manifest.wasm : localWasm,
};
const numbers = (value, fallback) => (value ? value.split(",").map(Number) : fallback);
const widths = numbers(process.env.IDLEVER_PROGRESS_WIDTHS, [320, 400, 1440]),
  scales = numbers(process.env.IDLEVER_PROGRESS_SCALES, [1, 2]),
  views = ["loadouts", "hero", "journal"];
assert.ok(widths.every((n) => Number.isFinite(n) && n >= 320));
assert.ok(scales.every((n) => n === 1 || n === 2));
const requestedCases = process.env.IDLEVER_PROGRESS_CASES?.split(",");
const diagnostic = Boolean(
  requestedCases || process.env.IDLEVER_PROGRESS_WIDTHS || process.env.IDLEVER_PROGRESS_SCALES,
);
assert.ok(
  !process.env.IDLEVER_PROGRESS_GEOMETRY ||
    ["compact", "critical", "exhaustive"].includes(process.env.IDLEVER_PROGRESS_GEOMETRY),
  "unknown progression geometry mode",
);
const exhaustive =
  process.env.IDLEVER_PROGRESS_GEOMETRY === "exhaustive" ||
  process.env.IDLEVER_CLIENT_AUDIT_SCOPE === "exhaustive";
const smoke =
  (process.env.IDLEVER_PROGRESS_GEOMETRY === "critical" ||
    process.env.IDLEVER_CLIENT_AUDIT_SCOPE === "smoke") &&
  !diagnostic;
const smokeCases = ["fresh-home", "survivor-temperament-home", "earned-queued-away"];
const entries = manifest.entries.filter((entry) =>
  requestedCases ? requestedCases.includes(entry.id) : !smoke || smokeCases.includes(entry.id),
);
assert.ok(entries.length, "nonempty case scope required");
if (requestedCases)
  assert.deepEqual(entries.map((entry) => entry.id).sort(), [...requestedCases].sort());
const records = [],
  inputs = {},
  deliveries = [],
  deliveryJobs = [],
  errors = [];
const compact = !diagnostic && !exhaustive;
const awayFirst = process.env.IDLEVER_PROGRESS_AWAY_FIRST
  ? process.env.IDLEVER_PROGRESS_AWAY_FIRST === "1"
  : !smoke;
const sharedChoice = process.env.IDLEVER_PROGRESS_SHARED
  ? process.env.IDLEVER_PROGRESS_SHARED === "1"
  : !smoke;
const baseline = (entry, view) => {
  const n = manifest.entries.findIndex((e) => e.id === entry.id) + views.indexOf(view);
  return { width: widths[n % widths.length], scale: scales[n % scales.length], view };
};
const extraPairs = [
  ["fresh-home", "loadouts", 400, 2],
  ["fresh-home", "loadouts", 1440, 2],
  ["survivor-family-home", "hero", 320, 2],
  ["survivor-family-home", "hero", 1440, 2],
  ["earned-queued-away", "loadouts", 400, 2],
  ["earned-family-committed-home", "hero", 400, 2],
];
let checks = 0;
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("idlever_wasm_bg.wasm"))
      deliveryJobs.push(
        response.body().then((b) =>
          deliveries.push({
            bytes: b.length,
            sha256: createHash("sha256").update(b).digest("hex"),
          }),
        ),
      );
  });
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    const a = window.__idlever;
    a.runnerOn = false;
    if (a.kind !== "wasm") throw Error("real WASM required");
  });
  await Promise.all(deliveryJobs);
  assert.ok(deliveries.length);
  for (const delivered of deliveries) assert.deepEqual(delivered, wasmScope.expected);
  checks += deliveries.length + 1;
  const state = () => page.evaluate(() => window.__idlever.lineage);
  const save = () => page.evaluate(() => window.__idlever.engine.save());
  const active = () => page.locator(".sheet-wrap:not(.under)");
  async function load(entry) {
    const bytes = readFileSync(resolve(root, entry.home));
    inputs[entry.home] = {
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    const raw = entry.home.endsWith(".gz") ? gunzipSync(bytes).toString() : bytes.toString();
    await page.evaluate(async (raw) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      a.lineage = await a.engine.load(raw);
      a.resetGoldFeedback();
      await a.refresh();
      a.go({ kind: "camp" });
    }, raw);
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
    assert.equal(
      await page.locator("[data-gold-delta]").count(),
      0,
      "fixture import creates no Gold flight",
    );
    assert.equal(
      await page.locator(".gold-drop").count(),
      0,
      "fixture import creates no purse fall hint",
    );
    assert.deepEqual(
      await page.evaluate(() => window.__idlever.takeGoldFeedback()),
      [],
      "fixture import queues no currency feedback",
    );
    checks += 3;
    const l = await state();
    assert.ok(l.persistent_hero?.progression, "current canonical progression required");
    checks++;
    if (entry.noDefeats) {
      assert.equal(JSON.parse(await save()).lineage.persistent.defeats, 0);
      checks++;
    }
    for (const [gate, expected] of Object.entries(entry.gates ?? {})) {
      assert.equal(l.persistent_hero.progression[gate].available, expected);
      checks++;
    }
  }
  async function settle() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      const el = document.querySelector(".sheet-wrap:not(.under)");
      if (el)
        await Promise.all(
          el
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
      if (view === "loadouts") (await import("/src/ui/town.ts")).openHero(a, null, "loadouts");
      else if (view === "hero") (await import("/src/ui/hero-life.ts")).openHeroLife(a);
      else (await import("/src/ui/journal-window.ts")).openJournal(a, () => false);
    }, view);
    await settle();
    if (view === "loadouts" && (await active().locator("[data-hero-hub]").count())) {
      await active().locator('[data-hub-tab="behaviour"]').click();
      await settle();
    }
    assert.equal(await save(), before, "reading progression changes no saved state");
    checks++;
  }
  async function inspect(view) {
    const l = await state(),
      p = l.persistent_hero.progression;
    if (view === "loadouts") {
      for (const [phase, id] of [
        ["actual", p.actual_temperament],
        ["next", p.next_temperament],
      ]) {
        const name = id ? (l.packages.all.find((r) => r.id === id)?.name ?? id) : "None";
        assert.ok(
          (await active().locator(`[data-temperament-phase="${phase}"]`).innerText()).includes(
            name,
          ),
        );
        checks++;
      }
      assert.equal(
        await active().locator('[data-progression-gate="temperament"]').innerText(),
        p.temperament.blocked ?? p.temperament.label,
      );
      checks++;
      assert.equal(
        await active().locator("[data-temperament-choice]").count(),
        p.temperament.available ? p.temperament_choices.length + 1 : 0,
      );
      checks++;
      if (!p.leash_available) {
        const hub = await active().locator("[data-hero-hub]").count();
        if (hub) {
          await active().locator('[data-hub-tab="gear"]').click();
          await settle();
        }
        const leash = active().locator("[data-leash-lock]");
        await leash.waitFor();
        assert.ok((await leash.textContent()).includes(p.leash_blocked));
        assert.equal(await active().locator('[data-prepare-kind="leash"]').count(), 0);
        checks += 2;
        if (hub) {
          await active().locator('[data-hub-tab="behaviour"]').click();
          await settle();
        }
      }
      if (p.temperament.available) {
        assert.equal(
          await active()
            .locator("[data-temperament-order-current]")
            .getAttribute("data-temperament-order-current"),
          l.orders.temperament,
        );
        assert.ok(
          (await active().locator("[data-temperament-manual-hint]").innerText()).includes(
            "Keep selected",
          ),
        );
        checks += 2;
      }
    }
    if (view === "hero") {
      for (const gate of ["inherited", "family"]) {
        assert.equal(
          await active().locator(`[data-progression-gate="${gate}"]`).innerText(),
          p[gate].blocked ?? p[gate].label,
        );
        checks++;
      }
      for (const [phase, card] of [
        ["actual", p.actual_inherited],
        ["chosen", p.inherited_chosen],
      ]) {
        const el = active().locator(`[data-lasting-trait="${phase}"]`);
        assert.equal(await el.count(), card ? 1 : 0);
        if (card) assert.ok((await el.innerText()).includes(card.formula));
        checks += 1 + Number(Boolean(card));
      }
      assert.equal(
        await active().locator('[data-lasting-trait="actual-none"]').count(),
        p.actual_inherited ? 0 : 1,
      );
      if (p.inherited_chosen)
        assert.equal(await active().locator("[data-lasting-next-label]").innerText(), "Next delve");
      checks += 1 + Number(Boolean(p.inherited_chosen));
      assert.equal(
        await active().locator("[data-inherited-choice]").count(),
        p.inherited.available && !p.inherited_chosen ? p.inherited_offer.length : 0,
      );
      checks++;
      for (const context of p.family_contexts) {
        const button = active().locator(`[data-family-choice="${context.id}"]`);
        if (await button.count()) {
          assert.equal(await button.isDisabled(), !context.available);
          checks++;
        }
      }
    }
    const text = await active().innerText();
    assert.doesNotMatch(
      text,
      /other heirs|next heir|die to unlock|death required|from heir [358]/i,
    );
    checks++;
  }
  async function refused(method, arg) {
    const r = await page.evaluate(
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
    assert.ok(r.error);
    assert.equal(r.unchanged, true);
    checks += 2;
  }
  async function dimensions(width, scale) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate((scale) => {
      document.documentElement.style.fontSize = `${16 * scale}px`;
    }, scale);
  }
  async function measure(entry, width, scale, view) {
    const geometry = await active().evaluate((el) => ({
      overflow: Math.max(
        document.documentElement.scrollWidth - innerWidth,
        el.scrollWidth - el.clientWidth,
      ),
      bad: [...el.querySelectorAll("button,input,summary,[role='tab']")]
        .filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== "hidden")
        .map((n) => ({
          text: n.textContent?.trim(),
          w: n.getBoundingClientRect().width,
          h: n.getBoundingClientRect().height,
        }))
        .filter((r) => r.w < 43.5 || r.h < 43.5),
    }));
    assert.ok(
      geometry.overflow <= 1,
      JSON.stringify({ entry: entry.id, width, scale, view, geometry }),
    );
    assert.deepEqual(geometry.bad, []);
    checks += 2;
    records.push({
      id: entry.id,
      earned: entry.earned,
      noDefeats: entry.noDefeats ?? false,
      width,
      scale,
      view,
      geometry,
    });
    if (out && width === 400 && scale === 1)
      await page.screenshot({ path: `${out}/${entry.id}-${view}.png` });
  }
  async function read(entry, view) {
    const pair = baseline(entry, view);
    if (compact) await dimensions(pair.width, pair.scale);
    await open(view);
    await inspect(view);
    if (compact) await measure(entry, pair.width, pair.scale, view);
  }
  for (const entry of entries) {
    await load(entry);
    await read(entry, "loadouts");
    let l = await state(),
      p = l.persistent_hero.progression;
    if (!p.leash_available) await refused("buySupply", "leash");
    if (p.temperament.available) {
      const gold = l.gold,
        first =
          p.temperament_choices.find(
            (id) => id !== p.next_temperament && id !== p.actual_temperament,
          ) ?? p.temperament_choices[0];
      const beforeRun = JSON.parse(await save()).run;
      await active().locator(`[data-temperament-choice="${first}"]`).focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(
        (id) => window.__idlever.lineage.persistent_hero.progression.next_temperament === id,
        first,
      );
      assert.equal((await state()).gold, gold);
      assert.equal((await state()).orders.temperament, "keep");
      assert.ok(!(await state()).orders.shared?.includes("temperament"));
      checks += 3;
      assert.equal(
        await page.evaluate(() => document.activeElement?.dataset.action),
        `temperament:${first}`,
      );
      checks++;
      if (entry.away) {
        assert.deepEqual(JSON.parse(await save()).run, beforeRun);
        assert.equal(
          (await state()).persistent_hero.progression.actual_temperament,
          p.actual_temperament,
        );
        checks += 2;
      }
      await active().locator('[data-temperament-choice="none"]').click();
      await page.waitForFunction(
        () => window.__idlever.lineage.persistent_hero.progression.next_temperament === null,
      );
      assert.equal((await state()).gold, gold);
      checks++;
      if (entry.away) {
        assert.deepEqual(JSON.parse(await save()).run, beforeRun);
        assert.equal(
          (await state()).persistent_hero.progression.actual_temperament,
          p.actual_temperament,
        );
        checks += 2;
      }
      await refused("pickTemperament", "unknown-temperament");
      await load(entry);
      await open("loadouts");
    }
    await read(entry, "hero");
    l = await state();
    p = l.persistent_hero.progression;
    if (p.inherited.available && !p.inherited_chosen) {
      const card = p.inherited_offer[0],
        gold = l.gold,
        beforeRun = JSON.parse(await save()).run;
      await active().locator(`[data-inherited-choice="${card.chip}"]`).click();
      await page.waitForFunction(
        (chip) =>
          window.__idlever.lineage.persistent_hero.progression.inherited_chosen?.chip === chip,
        card.chip,
      );
      assert.equal((await state()).gold, gold);
      checks++;
      if (entry.away) {
        assert.deepEqual(JSON.parse(await save()).run, beforeRun);
        checks++;
      }
      await refused("setInheritedTrait", p.inherited_offer[1].chip);
      await page.evaluate(async () => {
        const a = window.__idlever,
          raw = await a.engine.save();
        a.lineage = await a.engine.load(raw);
        a.resetGoldFeedback();
        await a.refresh();
      });
      assert.equal((await state()).persistent_hero.progression.inherited_chosen.chip, card.chip);
      checks++;
      await load(entry);
      await open("hero");
    }
    p = (await state()).persistent_hero.progression;
    const context = p.family_contexts.find((c) => c.available);
    if (context) {
      const gold = (await state()).gold,
        beforeRun = JSON.parse(await save()).run;
      await active().locator(`[data-family-choice="${context.id}"]`).click();
      await page.waitForFunction(
        (id) => window.__idlever.lineage.persistent_hero.progression.family_chosen === id,
        context.id,
      );
      assert.equal((await state()).gold, gold);
      checks++;
      if (entry.away) {
        assert.deepEqual(JSON.parse(await save()).run, beforeRun);
        checks++;
      }
      await refused("setFamilyLean", "unknown-context");
      await load(entry);
    }
    if (awayFirst && entry.id === "earned-inherited-offer-home") {
      await load(entry);
      await page.evaluate(async () => {
        const a = window.__idlever;
        await a.engine.setOrders({ ...a.lineage.orders, start: 1 });
        await a.engine.send();
        await a.engine.step(1);
        await a.refresh();
      });
      const frozen = JSON.parse(await save()),
        initial = (await state()).persistent_hero.progression;
      assert.ok(frozen.run?.turn > 0);
      assert.equal(initial.actual_inherited, null);
      assert.equal(initial.actual_family, null);
      checks += 3;
      await open("hero");
      const card = initial.inherited_offer[0],
        gold = (await state()).gold;
      await active().locator(`[data-inherited-choice="${card.chip}"]`).click();
      await page.waitForFunction(
        (chip) =>
          window.__idlever.lineage.persistent_hero.progression.inherited_chosen?.chip === chip,
        card.chip,
      );
      const context = (await state()).persistent_hero.progression.family_contexts.find(
        (c) => c.available,
      );
      assert.ok(context, "genuine earned compatible family context required");
      checks++;
      await active().locator(`[data-family-choice="${context.id}"]`).click();
      await page.waitForFunction(
        (id) => window.__idlever.lineage.persistent_hero.progression.family_chosen === id,
        context.id,
      );
      const queued = JSON.parse(await save()),
        next = (await state()).persistent_hero.progression;
      for (const key of ["run", "floor_start", "sent_state", "live_capsule"]) {
        assert.deepEqual(queued[key], frozen[key], `first away commitment preserves ${key}`);
        checks++;
      }
      assert.equal((await state()).gold, gold);
      assert.equal(next.actual_inherited, null);
      assert.equal(next.actual_family, null);
      assert.equal(
        await active().locator('[data-lasting-trait="actual-none"]').innerText(),
        "None",
      );
      assert.equal(await active().locator("[data-lasting-next-label]").innerText(), "Next delve");
      checks += 5;
      if (out) {
        await active()
          .locator("[data-build-inherited]")
          .evaluate((n) => n.scrollIntoView({ block: "center" }));
        await settle();
        await page.screenshot({ path: `${out}/first-lasting-queued-away.png` });
      }
      await page.evaluate(async () => {
        const a = window.__idlever,
          raw = await a.engine.save();
        a.lineage = await a.engine.load(raw);
        a.resetGoldFeedback();
        await a.refresh();
      });
      assert.deepEqual((await state()).persistent_hero.progression, next);
      checks++;
      const departure = await page.evaluate(async () => {
        const a = window.__idlever;
        let elapsed = 0;
        do {
          await a.engine.runOfflineQuick(3600);
          elapsed += 3600;
          await a.refresh();
        } while (
          (a.lineage.live ||
            a.lineage.rest_left_s > 0 ||
            a.lineage.persistent_hero.recovery_s > 0) &&
          elapsed < 28800
        );
        if (a.lineage.live || a.lineage.rest_left_s > 0 || a.lineage.persistent_hero.recovery_s > 0)
          throw Error(
            "actual paused-Scout delve/recovery did not finish within the diagnostic8h bound",
          );
        const ended = JSON.parse(await a.engine.save()),
          before = a.lineage.gold;
        await a.engine.send();
        await a.engine.step(1);
        await a.refresh();
        return {
          elapsed,
          ended: { run: ended.run, last_exit: ended.last_exit },
          before,
          after: a.lineage.gold,
          hero: a.lineage.persistent_hero,
          run: JSON.parse(await a.engine.save()).run,
        };
      });
      assert.ok(departure.run?.turn > 0);
      assert.equal(departure.hero.progression.actual_inherited.chip, card.chip);
      assert.equal(departure.hero.progression.actual_family, context.id);
      assert.equal(departure.run.worn.blood.when, context.id);
      checks += 4;
      records.push({ id: entry.id, firstAwayCommitment: { frozen, queued, next, departure } });
      await load(entry);
    }
    if (entry.paidResident) {
      await load(entry);
      await open("loadouts");
      const ownership = await page.evaluate(async () => {
        const a = window.__idlever,
          first = a.lineage.selected_bloodline,
          old = document.querySelector("[data-temperament-choice]:not([disabled])"),
          original = structuredClone(a.lineage.persistent_hero.progression),
          gold = a.lineage.gold,
          price = a.lineage.bloodline_price;
        if (!old) throw Error("actual first-resident choice required");
        await a.engine.addBloodline();
        await a.refresh();
        const second = a.lineage.hero_slots.find((slot) => slot.id !== first).id;
        await a.engine.selectBloodline(second);
        await a.refresh();
        const before = await a.engine.save(),
          real = a.engine.pickTemperament;
        let calls = 0;
        a.engine.pickTemperament = (...args) => {
          calls++;
          return real.apply(a.engine, args);
        };
        old.click();
        await new Promise((resolve) => setTimeout(resolve, 30));
        a.engine.pickTemperament = real;
        const result = {
          calls,
          unchanged: before === (await a.engine.save()),
          gold,
          price,
          after: a.lineage.gold,
          second: structuredClone(a.lineage.persistent_hero.progression),
        };
        await a.engine.selectBloodline(first);
        await a.refresh();
        result.firstRetained =
          JSON.stringify(a.lineage.persistent_hero.progression) === JSON.stringify(original);
        return result;
      });
      assert.equal(ownership.calls, 0);
      assert.equal(ownership.unchanged, true);
      assert.equal(ownership.after, ownership.gold - ownership.price);
      assert.equal(ownership.second.temperament.available, false);
      assert.equal(ownership.second.inherited_chosen, null);
      assert.equal(ownership.second.family_chosen, null);
      assert.equal(ownership.firstRetained, true);
      checks += 7;
      records.push({ id: entry.id, paidResident: ownership });
    }
    if (entry.residentFixture) {
      await load(entry);
      await open("loadouts");
      const residents = await page.evaluate(async () => {
        const a = window.__idlever,
          first = a.lineage.selected_bloodline,
          old = document.querySelector("[data-temperament-choice]:not([disabled])"),
          ids = a.lineage.hero_slots.map((slot) => slot.id),
          gold = a.lineage.gold,
          original = structuredClone(a.lineage.persistent_hero.progression),
          results = [];
        if (ids.length !== 3 || !old) throw Error("genuine three-resident fixture required");
        for (const id of ids.filter((id) => id !== first)) {
          await a.engine.selectBloodline(id);
          await a.refresh();
          const before = await a.engine.save(),
            method = a.engine.pickTemperament;
          let calls = 0;
          a.engine.pickTemperament = (...args) => {
            calls++;
            return method.apply(a.engine, args);
          };
          old.click();
          await new Promise((resolve) => setTimeout(resolve, 30));
          a.engine.pickTemperament = method;
          results.push({
            id,
            actor: a.lineage.persistent_hero.id,
            progression: structuredClone(a.lineage.persistent_hero.progression),
            calls,
            unchanged: before === (await a.engine.save()),
          });
        }
        await a.engine.selectBloodline(first);
        await a.refresh();
        return {
          results,
          gold,
          after: a.lineage.gold,
          retained:
            JSON.stringify(original) === JSON.stringify(a.lineage.persistent_hero.progression),
        };
      });
      assert.equal(residents.retained, true);
      assert.equal(residents.after, residents.gold);
      assert.equal(new Set(residents.results.map((resident) => resident.actor)).size, 2);
      checks += 3;
      for (const resident of residents.results) {
        assert.equal(resident.calls, 0);
        assert.equal(resident.unchanged, true);
        assert.equal(resident.progression.temperament.completed, 0);
        assert.equal(resident.progression.inherited_chosen, null);
        assert.equal(resident.progression.family_chosen, null);
        checks += 5;
      }
      records.push({ id: entry.id, threePaidResidents: residents });
      if (sharedChoice) {
        await load(entry);
        const sharedBefore = await page.evaluate(async () => {
          const a = window.__idlever;
          await a.engine.setOrders({
            ...a.lineage.orders,
            temperament: "variety",
            shared: [...new Set([...(a.lineage.orders.shared ?? []), "temperament"])],
          });
          await a.refresh();
          return JSON.parse(await a.engine.save());
        });
        await open("loadouts");
        assert.ok(
          (await active().locator("[data-temperament-shared-hint]").innerText()).includes(
            "Sharing stops",
          ),
        );
        checks++;
        const selected = (await state()).persistent_hero.progression.temperament_choices[0];
        await active().locator(`[data-temperament-choice="${selected}"]`).click();
        await page.waitForFunction(() => window.__idlever.lineage.orders.temperament === "keep");
        const sharedAfter = JSON.parse(await save());
        assert.equal((await state()).orders.temperament, "keep");
        assert.ok(!(await state()).orders.shared?.includes("temperament"));
        assert.equal((await state()).gold, residents.gold);
        checks += 3;
        const isolation = await page.evaluate(async () => {
          const a = window.__idlever,
            first = a.lineage.selected_bloodline,
            result = [];
          for (const slot of a.lineage.hero_slots.filter((slot) => slot.id !== first)) {
            await a.engine.selectBloodline(slot.id);
            await a.refresh();
            result.push({
              id: slot.id,
              orders: structuredClone(a.lineage.orders),
              progression: structuredClone(a.lineage.persistent_hero.progression),
            });
          }
          await a.engine.selectBloodline(first);
          await a.refresh();
          return result;
        });
        for (const other of isolation) {
          assert.equal(other.orders.temperament, "variety");
          assert.ok(!other.orders.shared?.includes("temperament"));
          assert.equal(other.progression.temperament.completed, 0);
          assert.equal(other.progression.inherited_chosen, null);
          assert.equal(other.progression.family_chosen, null);
          checks += 5;
        }
        records.push({
          id: entry.id,
          manualSharedUnlink: { sharedBefore, sharedAfter, isolation },
        });
        await load(entry);
      }
    }
    if (entry.departure) {
      await load(entry);
      await open("loadouts");
      const before = (await state()).persistent_hero.progression;
      const selected = before.temperament_choices[0];
      await active().locator(`[data-temperament-choice="${selected}"]`).click();
      await page.waitForFunction(
        (id) => window.__idlever.lineage.persistent_hero.progression.next_temperament === id,
        selected,
      );
      const departure = await page.evaluate(async () => {
        const a = window.__idlever,
          before = a.lineage.gold;
        if (!a.lineage.live) await a.engine.send();
        await a.engine.step(1);
        await a.refresh();
        return {
          before,
          after: a.lineage.gold,
          hero: a.lineage.persistent_hero,
          run: JSON.parse(await a.engine.save()).run,
        };
      });
      assert.ok(departure.run.turn > 0);
      assert.equal(departure.hero.progression.actual_temperament, selected);
      assert.equal(departure.hero.progression.next_temperament, selected);
      checks += 3;
      if (entry.zeroGold) {
        assert.equal(departure.before, 0);
        assert.equal(departure.after, 0);
        checks += 2;
      }
      records.push({ id: entry.id, departure });
    }
    if (entry.rebirth) {
      await load(entry);
      const before = await state();
      assert.equal(before.persistent_hero.rebirth.available, true);
      checks++;
      const raw = await save();
      await page.evaluate(async () => {
        (await import("/src/ui/hero-life.ts")).openHeroLife(window.__idlever, null, "rebirth");
      });
      await settle();
      assert.equal(await save(), raw);
      for (const text of before.persistent_hero.rebirth.resets)
        assert.ok((await active().innerText()).includes(text));
      checks += 1 + before.persistent_hero.rebirth.resets.length;
      await refused("rebirthHero", "stale-preview-token");
      await active().locator('[data-life-focus="confirm"]').click();
      await page.waitForFunction(
        (incarnation) => window.__idlever.lineage.persistent_hero.incarnation !== incarnation,
        before.persistent_hero.incarnation,
      );
      const after = await state();
      assert.equal(after.gold, before.gold);
      assert.equal(after.persistent_hero.progression.inherited_chosen, null);
      assert.equal(after.persistent_hero.progression.family_chosen, null);
      assert.equal(
        after.persistent_hero.progression.next_temperament,
        before.persistent_hero.progression.next_temperament,
      );
      assert.ok(after.persistent_hero.recovery_s > 0);
      checks += 5;
      records.push({
        id: entry.id,
        confirmedRebirth: {
          before: before.persistent_hero,
          after: after.persistent_hero,
          gold: after.gold,
        },
      });
    }
    await refused("setInheritedTrait", "unknown-trait");
    if (compact) {
      await load(entry);
      await read(entry, "journal");
      if (!smoke)
        for (const [, view, width, scale] of extraPairs.filter(([id]) => id === entry.id)) {
          await load(entry);
          await dimensions(width, scale);
          await open(view);
          await inspect(view);
          await measure(entry, width, scale, view);
        }
    } else
      for (const width of widths)
        for (const scale of scales)
          for (const view of views) {
            await load(entry);
            await dimensions(width, scale);
            await open(view);
            await inspect(view);
            await measure(entry, width, scale, view);
          }
  }
  assert.deepEqual(errors, []);
  checks++;
  const source = {};
  for (const path of [
    "src/ui/hero-progression.ts",
    "src/hero-progression.css",
    "src/ui/hero-life.ts",
    "src/ui/bloodline-loadouts.ts",
    "src/ui/packages.ts",
    "src/ui/orders.ts",
    "src/ui/camp.ts",
    "src/ui/ladder.ts",
    "src/engine/pkg/idlever_wasm_bg.wasm",
  ]) {
    const r = await page.request.get(`${url}${path}`),
      b = await r.body();
    source[path] = { bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") };
    if (out && !path.endsWith(".wasm"))
      writeFileSync(`${out}/${path.replaceAll("/", "_")}.served`, b);
  }
  assert.deepEqual(source["src/engine/pkg/idlever_wasm_bg.wasm"], wasmScope.expected);
  checks++;
  const scope = {
    mode: diagnostic
      ? "focused-diagnostic"
      : exhaustive
        ? "exhaustive-cartesian"
        : smoke
          ? "critical-stages"
          : "compact-full",
    cases: entries.map((entry) => entry.id),
    firstAwayCommitment:
      awayFirst && entries.some((entry) => entry.id === "earned-inherited-offer-home"),
    sharedManualChoice: sharedChoice && entries.some((entry) => entry.residentFixture),
    widths,
    scales,
    views,
    layouts: records.filter((record) => record.geometry).length,
    omittedGeometry: entries.flatMap((entry) =>
      widths.flatMap((width) =>
        scales.flatMap((scale) =>
          views
            .filter(
              (view) =>
                !records.some(
                  (record) =>
                    record.geometry &&
                    record.id === entry.id &&
                    record.width === width &&
                    record.scale === scale &&
                    record.view === view,
                ),
            )
            .map((view) => ({ id: entry.id, width, scale, view })),
        ),
      ),
    ),
  };
  if (out)
    writeFileSync(
      `${out}/results.json`,
      JSON.stringify(
        { checks, scope, wasmScope, inputs, records, source, deliveries, result: "PASS" },
        null,
        2,
      ),
    );
  console.log(JSON.stringify({ checks, layouts: scope.layouts, result: "PASS" }));
} catch (error) {
  if (out)
    writeFileSync(
      `${out}/failure.json`,
      JSON.stringify({ checks, error: String(error), inputs, records }, null, 2),
    );
  throw error;
} finally {
  await browser.close();
}
