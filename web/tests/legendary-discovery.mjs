import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { launchBrowser } from "../../tools/browser.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { cwd: root, encoding: "utf8" }).trim();
const inputs = JSON.parse(
  readFileSync(resolve(root, "docs/evidence/cut215/ui-inputs.json"), "utf8"),
);
const output = process.env.IDLEVER_DISCOVERY_OUT
  ? resolve(root, process.env.IDLEVER_DISCOVERY_OUT)
  : undefined;
if (output) mkdirSync(output, { recursive: true });
const currentWasm = readFileSync(resolve(root, "web/src/engine/pkg/idlever_wasm_bg.wasm"));
const expectedPackage = {
  bytes: currentWasm.length,
  sha256: createHash("sha256").update(currentWasm).digest("hex"),
};
const hashes = {},
  records = [],
  errors = [],
  deliveries = [];
const fixture = (path) => {
  const bytes = readFileSync(resolve(root, path));
  hashes[path] = createHash("sha256").update(bytes).digest("hex");
  return gunzipSync(bytes).toString();
};
const part = process.argv.find((a) => a.startsWith("--part="))?.slice(7) ?? "all";
let checks = 0;
const eq = (a, b, why) => {
  assert.deepEqual(a, b, why);
  checks++;
};
const ok = (v, why) => {
  assert.ok(v, why);
  checks++;
};
const b = await launchBrowser();
try {
  const p = await b.newPage({ viewport: { width: 400, height: 900 }, reducedMotion: "reduce" });
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.url().includes("idlever_wasm_bg.wasm"))
      deliveries.push(
        r.body().then((bytes) => ({
          bytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        })),
      );
  });
  await p.goto(`${url}?dev=1&fresh=1&runs=0`);
  await p.waitForFunction(() => window.__idlever?.booted);
  const save = () => p.evaluate(() => window.__idlever.engine.save());
  const load = async (raw) => {
    await p.evaluate(async (raw) => {
      const a = window.__idlever;
      a.go({ kind: "camp" });
      a.runnerOn = false;
      await a.engine.load(raw);
      await a.refresh();
    }, raw);
  };
  const settle = () =>
    p.evaluate(async () => {
      await document.fonts.ready;
      const wrap = document.querySelector(".sheet-wrap:not(.under)");
      if (wrap)
        await Promise.all(
          wrap
            .getAnimations({ subtree: true })
            .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
            .map((a) => a.finished.catch(() => {})),
        );
    });
  const geometry = (selector = ".sheet-wrap:not(.under) .legendary-discovery") =>
    p.evaluate((selector) => {
      const card = document.querySelector(selector);
      const button = card.querySelector("button"),
        r = card.getBoundingClientRect(),
        q = button.getBoundingClientRect(),
        s = getComputedStyle(card);
      const lum = (c) => {
        const rgb = c
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            v /= 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      const f = lum(s.color),
        v = lum(s.backgroundColor);
      const hit = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2);
      return {
        x: r.x,
        right: r.right,
        width: r.width,
        button: {
          w: q.width,
          h: q.height,
          visible: q.y >= 0 && q.bottom <= innerHeight,
          hit: hit === button || button.contains(hit),
        },
        overflow: document.documentElement.scrollWidth - innerWidth,
        contrast: (Math.max(f, v) + 0.05) / (Math.min(f, v) + 0.05),
      };
    }, selector);
  for (const entry of part === "death" ? [] : inputs) {
    const raw = fixture(entry.before);
    await load(raw);
    const factual = await p.evaluate(async (count) => {
      const a = window.__idlever;
      const before = a.lineage;
      const s = await a.engine.step(count);
      await a.refresh();
      return {
        engine: a.kind,
        events: s.events,
        find: s.events.find((e) => e.k === "discovery")?.find,
        owned: a.lineage.legendaries,
        before: before.legendaries,
      };
    }, entry.findSteps);
    eq(factual.engine, "wasm");
    eq(factual.find?.kind, entry.firstKind);
    eq(factual.find?.first, true);
    ok(factual.owned.some((g) => g.kind === entry.firstKind));
    await load(raw);
    await p.evaluate(() => {
      const a = window.__idlever;
      a.watchMode = "one";
      a.go({ kind: "watch" });
    });
    const link = p.locator(`[data-discovery-link="${entry.firstKind}"]`);
    await link.waitFor({ state: "visible", timeout: 20000 });
    const pause = p.locator('[aria-label="Pause watch"]');
    if (await pause.count()) await pause.click();
    await p.waitForTimeout(200);
    const beforeInspect = await save();
    const guardBefore = await p.evaluate(() => {
      const a = window.__idlever;
      window.__discoveryCalls = [];
      window.__discoverySteps = [];
      for (const k of [
        "setStartingKit",
        "saveStartingKit",
        "selectStartingKit",
        "deleteStartingKit",
        "buy",
        "buyKit",
        "hire",
        "buySupply",
        "construct",
        "buildTown",
        "addBloodline",
        "selectBloodline",
        "rebirthHero",
      ]) {
        if (typeof a.engine[k] !== "function") continue;
        const original = a.engine[k].bind(a.engine);
        a.engine[k] = (...args) => {
          window.__discoveryCalls.push({ method: k, args });
          return original(...args);
        };
      }
      const step = a.engine.step.bind(a.engine);
      a.engine.step = async (n) => {
        const r = await step(n);
        window.__discoverySteps.push({ n, turn: r.snapshot.turn, events: r.events });
        return r;
      };
      return { gold: a.lineage.gold, config: a.lineage.starting_kits?.current };
    });
    const logText = await link.innerText();
    ok(logText.includes(factual.find.label));
    ok(logText.includes("Legendary found"));
    await link.click();
    await settle();
    const card = p.locator(`[data-discovery-kind="${entry.firstKind}"]`);
    await card.waitFor({ state: "visible" });
    const modalSave = await save();
    const modalSteps = await p.evaluate(() => window.__discoverySteps);
    if (!modalSteps.length) eq(modalSave, beforeInspect, "idle instant Watch modal is read-only");
    else
      ok(
        modalSteps.every((row) => row.n >= 0 && row.events.every((e) => e.t <= row.turn)),
        "actual live core steps explain progression during modal opening",
      );
    ok((await card.innerText()).includes(factual.find.hero_name));
    ok((await card.innerText()).includes("Free Forge choice"));
    eq(
      await card.locator("button").allTextContents(),
      ["View gear"],
      "inspection only, no Claim action",
    );
    for (const width of [320, 400, 1440])
      for (const scale of [1, 2]) {
        await p.setViewportSize({ width, height: 900 });
        await p.evaluate(
          (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
          scale,
        );
        await settle();
        await card.locator("button").scrollIntoViewIfNeeded();
        const g = await geometry();
        ok(g.x >= 0 && g.right <= width + 1, "modal card bounds");
        ok(
          g.button.w >= 44 && g.button.h >= 44 && g.button.visible && g.button.hit,
          "44px accessible View gear",
        );
        eq(g.overflow, 0);
        ok(g.contrast >= 4.5, "discovery text contrast");
        records.push({ seed: entry.seed, width, scale, geometry: g });
      }
    await card.locator(`[data-discovery-gear="${entry.firstKind}"]`).click();
    await p
      .locator(`.sheet-wrap:not(.under) [data-kit-choice="${entry.firstKind}"]`)
      .waitFor({ state: "attached" });
    await settle();
    const guardAfter = await p.evaluate(async () => ({
      gold: window.__idlever.lineage.gold,
      config: window.__idlever.lineage.starting_kits?.current,
      calls: window.__discoveryCalls,
      steps: window.__discoverySteps,
      saved: await window.__idlever.engine.save(),
    }));
    eq(guardAfter.calls, [], "live View gear calls no purchase/equip/claim mutation");
    eq(guardAfter.config, guardBefore.config, "selected starting config unchanged");
    ok(guardAfter.gold >= guardBefore.gold, "no currency deduction during live inspection");
    records.push({
      seed: entry.seed,
      liveInspection: {
        before: guardBefore,
        after: guardAfter,
        wholeSaveUnchanged: beforeInspect === guardAfter.saved,
        immediateModalSaveUnchanged: beforeInspect === modalSave,
        immediateModalSteps: modalSteps,
      },
    });
    delete guardAfter.saved;
    ok(
      (await p.locator(".sheet-wrap:not(.under) [data-starting-gear]").count()) ||
        (await p.locator(".sheet-wrap:not(.under) .starting-gear").count()),
      "actual owned Loadouts",
    );
    await load(raw);
    const report = await p.evaluate(async () => {
      const a = window.__idlever;
      const r = await a.engine.runOfflineQuick(60);
      await a.refresh();
      a.go({ kind: "report", report: r, absence: true });
      return r;
    });
    ok(
      report.discoveries?.some((f) => f.kind === entry.firstKind && f.first),
      "actual ReturnReport receipt",
    );
    const receipt = p.locator(`.report-discoveries [data-discovery-kind="${entry.firstKind}"]`);
    await receipt.waitFor({ state: "attached" });
    eq(await receipt.count(), 1, "one factual first-find card");
    ok(
      await receipt.evaluate((node) => !node.closest(".report-details")),
      "first Legendary receipt needs no Details expansion",
    );
    await receipt.waitFor({ state: "visible" });
    for (const width of [320, 400, 1440])
      for (const scale of [1, 2]) {
        await p.setViewportSize({ width, height: 900 });
        await p.evaluate(
          (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
          scale,
        );
        await receipt.locator("button").scrollIntoViewIfNeeded();
        const g = await geometry(`.report-discoveries [data-discovery-kind="${entry.firstKind}"]`);
        ok(g.x >= 0 && g.right <= width + 1, "report receipt bounds");
        ok(
          g.button.w >= 44 && g.button.h >= 44 && g.button.visible && g.button.hit,
          "report44px View gear",
        );
        eq(g.overflow, 0);
        ok(g.contrast >= 4.5);
        records.push({ seed: entry.seed, reportLayout: true, width, scale, geometry: g });
      }
    const beforeReport = await save();
    await receipt.locator("button").scrollIntoViewIfNeeded();
    await receipt.locator("button").click();
    await p
      .locator(`.sheet-wrap:not(.under) [data-kit-choice="${entry.firstKind}"]`)
      .waitFor({ state: "attached" });
    eq(await save(), beforeReport, "report receipt inspection is read-only");
    records.push({
      seed: entry.seed,
      factual,
      reportDiscoveries: report.discoveries,
      reportExits: report.exits,
    });
  }
  if (part !== "earned") {
    const controlledPath =
      "docs/evidence/cut215/core/fixtures-final/controlled/all3-actual-death-receipt.game.json.gz";
    await load(fixture(controlledPath));
    const controlled = await p.evaluate(async () => {
      const a = window.__idlever;
      const d = await a.engine.death(1);
      await a.refresh();
      a.go({ kind: "death", death: d, kept: true });
      return { death: d, owned: a.lineage.legendaries, config: a.lineage.starting_kits?.current };
    });
    const kinds = ["crownsplitter", "hearthglass", "frostmantle"];
    eq(controlled.death.line.tier, "death");
    eq(
      controlled.death.line.discoveries
        .filter((f) => f.first)
        .map((f) => f.kind)
        .sort(),
      [...kinds].sort(),
    );
    ok(
      kinds.every((kind) => controlled.owned.some((g) => g.kind === kind)),
      "controlled actual discoveries survive actual core death",
    );
    const beforeDeath = await save();
    for (const width of [320, 400, 1440])
      for (const scale of [1, 2]) {
        await p.setViewportSize({ width, height: 900 });
        await p.evaluate(
          (scale) => (document.documentElement.style.fontSize = `${16 * scale}px`),
          scale,
        );
        for (const kind of kinds) {
          const selector = `.death-discoveries [data-discovery-kind="${kind}"]`;
          const card = p.locator(selector);
          await card.waitFor({ state: "visible" });
          await card.locator("button").scrollIntoViewIfNeeded();
          const g = await geometry(selector);
          ok(g.x >= 0 && g.right <= width + 1, "death receipt bounds");
          ok(
            g.button.w >= 44 && g.button.h >= 44 && g.button.visible && g.button.hit,
            "44px death receipt",
          );
          eq(g.overflow, 0);
          ok(g.contrast >= 4.5);
          records.push({ controlled: true, deathLayout: true, width, scale, kind, geometry: g });
        }
      }
    eq(await save(), beforeDeath, "controlled death receipt layout is read-only");
    for (const kind of kinds) {
      const card = p.locator(`.death-discoveries [data-discovery-kind="${kind}"]`);
      await card.locator("button").scrollIntoViewIfNeeded();
      await card.locator("button").click();
      await p
        .locator(`.sheet-wrap:not(.under) [data-kit-choice="${kind}"]`)
        .waitFor({ state: "attached" });
      await settle();
      eq(
        await save(),
        beforeDeath,
        "controlled death retained gear navigation neither equips nor spends",
      );
      await p.keyboard.press("Escape");
      await p.locator(".sheet-wrap:not(.under)").waitFor({ state: "hidden" });
    }
    records.push({
      controlled: true,
      protocol:
        "Real controlled boss drops/pickups followed by999Gas/core death, not an earned death or authored events",
      death: controlled.death,
      owned: controlled.owned,
    });
  }
  eq(errors, []);
  const packageDeliveries = await Promise.all(deliveries);
  ok(packageDeliveries.length > 0);
  for (const item of packageDeliveries) {
    eq(item.bytes, expectedPackage.bytes);
    eq(item.sha256, expectedPackage.sha256);
  }
  if (output)
    writeFileSync(
      resolve(output, part === "death" ? "death-results.json" : "results.json"),
      JSON.stringify(
        {
          checks,
          hashes,
          records,
          errors,
          packageDeliveries,
          expectedPackage,
          limits: [
            "Earned seeds1/13 bank alive. Death receipts use explicitly controlled actual native drops/damage/death; not earned death progression.",
          ],
        },
        null,
        2,
      ),
    );
  console.log(
    `legendary-discovery[${part}]: ${checks} checks PASS; ${part === "death" ? "18 controlled actual core Death receipt layouts/retained gear, not earned progression" : "earned seeds1/13 Watch/report receipts,12 modal+12 report layouts, readonly gear navigation"}${part === "all" ? "; 18 controlled actual Death receipt layouts/retained gear" : ""}`,
  );
} finally {
  await b.close();
}
