import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchBrowser, launchGpu } from "../../tools/browser.mjs";

const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], {
    cwd: fileURLToPath(new URL("../../", import.meta.url)),
    encoding: "utf8",
  }).trim();
const out = process.env.IDLEVER_GOLD_OUT;
if (out) mkdirSync(out, { recursive: true });
const fixture = "docs/evidence/cut219/ui-inputs-final/earned-inherited-offer-home.game.json.gz";
const raw = gunzipSync(readFileSync(new URL(`../../${fixture}`, import.meta.url))).toString();
const binary = readFileSync(new URL("../src/engine/pkg/idlever_wasm_bg.wasm", import.meta.url));
const hash = (b) => createHash("sha256").update(b).digest("hex");
const result = { fixture, fixtureSha256: hash(raw), layouts: [], errors: [], packages: [] };
let checks = 0;
const gpu = process.env.IDLEVER_GOLD_GPU === "1";
const video = process.env.IDLEVER_GOLD_VIDEO === "1";
assert.ok(!gpu || out, "GPU captures need an evidence directory");
assert.ok(!video || (gpu && out), "motion recording needs the isolated GPU and evidence directory");
const browser = await (gpu ? launchGpu() : launchBrowser());
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    recordVideo: video ? { dir: `${out}/video`, size: { width: 1440, height: 900 } } : undefined,
  });
  if (video) result.video = await page.video().path();
  const packets = [];
  page.on("response", (r) => {
    if (r.url().includes("idlever_wasm_bg.wasm"))
      packets.push(
        r
          .body()
          .then((b) => ({ bytes: b.length, sha256: hash(b) }))
          .catch((error) => ({ packetError: String(error) })),
      );
  });
  page.on("pageerror", (e) => result.errors.push(e.message));
  await page.goto(`${url}?fresh=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  assert.equal(await page.evaluate(() => window.__idlever.kind), "wasm");
  if (gpu) {
    result.gpu = await page.evaluate(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const debug = gl?.getExtension("WEBGL_debug_renderer_info");
      const renderer = debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null;
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      return renderer;
    });
    assert.match(result.gpu, /D3D12.*NVIDIA/i);
  }
  await page.evaluate(() => {
    window.__idleverGoldProof = [];
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.classList.contains("coin-flight")) continue;
          window.__idleverGoldProof.push({
            delta: Number(node.dataset.goldDelta),
            why: node.dataset.goldReason,
            bloodlineId: Number(node.dataset.goldBloodline),
            width: parseFloat(node.style.width),
            left: parseFloat(node.style.left),
            top: parseFloat(node.style.top),
            frames: node.getAnimations()[0]?.effect?.getKeyframes(),
          });
        }
    }).observe(document.body, { childList: true });
  });
  const clear = () =>
    page.evaluate(() => {
      window.__idleverGoldProof = [];
    });
  const particles = () => page.evaluate(() => window.__idleverGoldProof);
  const painted = () =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  const capture = async (name) => {
    if (!gpu) return;
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${out}/${name}.png` });
  };
  const load = async () => {
    await clear();
    assert.equal(
      await page.evaluate(
        (raw) =>
          window.__idlever.importSave(
            JSON.stringify({ engine: raw, loadout: [], runs: 0, last_seen: Date.now() }),
          ),
        raw,
      ),
      true,
    );
    await page.waitForTimeout(60);
    assert.deepEqual(await particles(), []);
    checks++;
    await page.evaluate(async () => {
      document.documentElement.dataset.juice = "on";
      const { setEffectsLevel } = await import("/src/render/fxpref.ts");
      setEffectsLevel("full");
    });
  };
  for (const width of [320, 400, 1440])
    for (const scale of [1, 2]) {
      await page.setViewportSize({ width, height: 900 });
      await load();
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = `${16 * scale}px`;
      }, scale);
      await page.locator('[data-tile="forge"]').first().click();
      await page.waitForSelector(".forge");
      const before = await page.evaluate(() => ({
        gold: window.__idlever.lineage.gold,
        kit: window.__idlever.lineage.kit,
      }));
      const slot = before.kit.find((k) => k.next?.affordable)?.slot;
      assert.ok(slot, "actual affordable permanent upgrade required");
      await clear();
      const purchase = await page.evaluate(async (slot) => {
        const a = window.__idlever,
          before = a.lineage.gold;
        const ok = await a.mutate(() => a.engine.buyKit(slot));
        return { ok, debit: before - a.lineage.gold, ledger: a.lineage.gold_ledger?.at(-1) };
      }, slot);
      const paintWait = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const start = performance.now();
            requestAnimationFrame(() =>
              requestAnimationFrame(() => resolve(performance.now() - start)),
            );
          }),
      );
      await page.waitForTimeout(60);
      const records = await particles();
      result.lastPurchase = {
        width,
        scale,
        purchase,
        records,
        paintWait,
        flags: await page.evaluate(async () => ({
          hidden: document.hidden,
          reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
          juice: document.documentElement.dataset.juice,
          effects: (await import("/src/render/fxpref.ts")).effectsLevel(),
          activeParticles: document.querySelectorAll(".coin-flight").length,
          counter: document.querySelector(".stat.gold")?.getBoundingClientRect().toJSON(),
        })),
      };
      assert.equal(purchase.ok, true);
      assert.ok(purchase.debit > 0);
      assert.ok(records.length >= 2 && records.length <= 12);
      assert.ok(
        records.every(
          (r) =>
            r.delta === -purchase.debit &&
            r.why === purchase.ledger.why &&
            r.bloodlineId === (purchase.ledger.bloodline_id ?? 1) &&
            r.width >= 4 &&
            r.width <= 12 &&
            r.frames.length === 3,
        ),
      );
      checks += 4;
      await capture(`forge-${width}-${scale}-moving`);
      const after = await page.evaluate(() => window.__idlever.engine.save());
      await clear();
      await page.evaluate(async () => {
        await window.__idlever.refresh();
        await window.__idlever.refresh();
      });
      await page.waitForTimeout(60);
      assert.deepEqual(await particles(), []);
      assert.equal(await page.evaluate(() => window.__idlever.engine.save()), after);
      checks += 2;
      result.layouts.push({ width, scale, purchase, particles: records });
    }
  await load();
  const model = await page.evaluate(async () => {
    const { goldTransfers, goldParticleScale } = await import("/src/ui/gold-transfers.ts");
    const old = Array.from({ length: 80 }, (_, t) => ({ t, delta: 1, why: "returned D1" }));
    const spend = { t: 80, delta: -120, why: "forge sword" };
    const same = { t: 80, delta: 30, why: "returned D2", lost: 200 };
    return {
      unchanged: goldTransfers({ gold: 80, gold_ledger: old }, { gold: 80, gold_ledger: old }),
      evicted: goldTransfers(
        { gold: 200, gold_ledger: old },
        { gold: 80, gold_ledger: [...old.slice(1), spend] },
      ),
      repeated: goldTransfers(
        { gold: 100, gold_ledger: [same] },
        { gold: 130, gold_ledger: [same, same] },
      ),
      zeroNet: goldTransfers(
        { gold: 100, gold_ledger: old },
        {
          gold: 100,
          gold_ledger: [
            ...old.slice(2),
            { t: 80, delta: 50, why: "returned D3" },
            { t: 80, delta: -50, why: "forge sword" },
          ],
        },
      ),
      truncated: goldTransfers(
        { gold: 100, gold_ledger: old },
        { gold: 105, gold_ledger: [{ t: 200, delta: 2, why: "returned D8" }] },
      ),
      owners: goldTransfers(
        { gold: 100, gold_ledger: old },
        {
          gold: 160,
          gold_ledger: [
            ...old.slice(2),
            { t: 80, delta: 30, why: "returned D2", bloodline_id: 1 },
            { t: 80, delta: 30, why: "returned D2", bloodline_id: 2 },
          ],
        },
      ),
      scales: [1, 100, 10000].map((n) => goldParticleScale(n)),
    };
  });
  assert.deepEqual(model.unchanged, []);
  assert.deepEqual(model.evicted, [{ delta: -120, why: "forge sword", bloodlineId: 1 }]);
  assert.deepEqual(model.repeated, [{ delta: 30, why: "returned D2", bloodlineId: 1 }]);
  assert.deepEqual(
    model.zeroNet.map((r) => r.delta),
    [50, -50],
  );
  assert.deepEqual(model.truncated, [{ delta: 5, why: null }]);
  assert.deepEqual(model.owners, [
    { delta: 30, why: "returned D2", bloodlineId: 1 },
    { delta: 30, why: "returned D2", bloodlineId: 2 },
  ]);
  assert.ok(
    model.scales[0].diameter < model.scales[1].diameter &&
      model.scales[1].diameter < model.scales[2].diameter,
  );
  checks += 7;
  for (const pref of ["off", "low", "full", "reduced"]) {
    await load();
    await page.emulateMedia({ reducedMotion: pref === "reduced" ? "reduce" : "no-preference" });
    await page.evaluate(
      async (pref) =>
        (await import("/src/render/fxpref.ts")).setEffectsLevel(pref === "reduced" ? "full" : pref),
      pref,
    );
    await clear();
    const debit = await page.evaluate(async () => {
      const a = window.__idlever,
        before = a.lineage.gold,
        slot = a.lineage.kit.find((k) => k.next?.affordable).slot;
      await a.mutate(() => a.engine.buyKit(slot));
      return before - a.lineage.gold;
    });
    assert.ok(debit > 0);
    await painted();
    await page.waitForTimeout(60);
    const records = await particles();
    if (pref === "off" || pref === "reduced") assert.deepEqual(records, []);
    else assert.ok(records.length > 0 && records.length <= (pref === "low" ? 5 : 12));
    checks += 2;
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await load();
  result.savings = [];
  for (const direction of ["deposit", "withdraw"]) {
    await clear();
    const transfer = await page.evaluate(async (direction) => {
      const a = window.__idlever;
      const before = { gold: a.lineage.gold, bank: a.lineage.town.bank };
      const ok = await a.mutate(() =>
        direction === "deposit" ? a.engine.bankDeposit(20) : a.engine.bankWithdraw(20),
      );
      return {
        ok,
        before,
        after: { gold: a.lineage.gold, bank: a.lineage.town.bank },
        ledger: a.lineage.gold_ledger.at(-1),
        save: await a.engine.save(),
      };
    }, direction);
    await painted();
    await page.waitForTimeout(60);
    const records = await particles();
    const delta = transfer.after.gold - transfer.before.gold;
    assert.equal(transfer.ok, true);
    assert.equal(delta, direction === "deposit" ? -20 : 20);
    assert.equal(transfer.after.bank - transfer.before.bank, -delta);
    assert.ok(records.length >= 2 && records.length <= 12);
    assert.ok(records.every((p) => p.delta === delta && p.why === `bank ${direction}`));
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), transfer.save);
    checks += 6;
    await capture(`savings-${direction}-moving`);
    result.savings.push({ direction, ...transfer, save: undefined, particles: records });
  }
  result.services = [];
  for (const service of ["worker", "resident"]) {
    await load();
    await clear();
    const transfer = await page.evaluate(async (service) => {
      const a = window.__idlever;
      const before = a.lineage.gold;
      const residentsBefore = a.lineage.hero_slots.length;
      const worker = a.lineage.tree.nodes.find(
        (n) => n.id === a.lineage.tree.lit && n.kind === "worker" && n.affordable,
      );
      if (service === "worker" && !worker)
        throw Error("earned fixture has no affordable lit worker");
      const ok = await a.mutate(() =>
        service === "worker" ? a.engine.hire(worker.id) : a.engine.addBloodline(),
      );
      return {
        ok,
        before,
        after: a.lineage.gold,
        ledger: a.lineage.gold_ledger.at(-1),
        worker: service === "worker" ? worker.id : undefined,
        residents: a.lineage.hero_slots.length,
        residentsBefore,
        workerState:
          service === "worker"
            ? a.lineage.tree.nodes.find((n) => n.id === worker.id).state
            : undefined,
        save: await a.engine.save(),
      };
    }, service);
    await painted();
    await page.waitForTimeout(60);
    const records = await particles();
    result.services.push({ service, ...transfer, save: undefined, particles: records });
    assert.equal(transfer.ok, true);
    if (service === "worker") assert.equal(transfer.workerState, "done");
    else assert.equal(transfer.residents, transfer.residentsBefore + 1);
    const delta = transfer.after - transfer.before;
    assert.ok(delta < 0);
    assert.equal(transfer.ledger.delta, delta);
    assert.match(transfer.ledger.why, service === "worker" ? /^hire / : /^bloodline /);
    assert.ok(records.length >= 2 && records.length <= 12);
    assert.ok(
      records.every(
        (p) =>
          p.delta === delta &&
          p.why === transfer.ledger.why &&
          p.bloodlineId === (transfer.ledger.bloodline_id ?? 1),
      ),
    );
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), transfer.save);
    checks += 8;
  }
  result.cleanup = [];
  for (const action of ["low", "off", "reduced", "navigate"]) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await load();
    await clear();
    const paid = await page.evaluate(async () => {
      const a = window.__idlever;
      const slot = a.lineage.kit.find((k) => k.next?.affordable).slot;
      const before = a.lineage.gold;
      const ok = await a.mutate(() => a.engine.buyKit(slot));
      return { ok, delta: a.lineage.gold - before, save: await a.engine.save() };
    });
    await painted();
    const activeBefore = await page.locator(".coin-flight").count();
    assert.equal(paid.ok, true);
    assert.ok(paid.delta < 0 && activeBefore > 0);
    if (action === "reduced") await page.emulateMedia({ reducedMotion: "reduce" });
    else
      await page.evaluate(async (action) => {
        if (action === "navigate") window.__idlever.go({ kind: "camp" });
        else (await import("/src/render/fxpref.ts")).setEffectsLevel(action);
      }, action);
    await painted();
    assert.equal(await page.locator(".coin-flight").count(), 0);
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), paid.save);
    const count = (await particles()).length;
    await page.evaluate(() => window.__idlever.refresh());
    await painted();
    assert.equal((await particles()).length, count);
    checks += 5;
    result.cleanup.push({ action, delta: paid.delta, activeBefore, recordedParticles: count });
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await load();
  await clear();
  const free = await page.evaluate(async () => {
    const a = window.__idlever;
    await a.mutate(() => a.engine.clearSupplies());
    const gold = a.lineage.gold;
    const ok = await a.mutate(() => a.engine.buySupply("leash"));
    return { ok, before: gold, after: a.lineage.gold, supplies: a.lineage.supplies };
  });
  assert.equal(free.ok, true);
  assert.equal(free.before, free.after);
  assert.ok(free.supplies.some((s) => s.kind === "leash"));
  await page.waitForTimeout(60);
  assert.deepEqual(await particles(), []);
  checks += 4;
  const refusalSave = await page.evaluate(() => window.__idlever.engine.save());
  assert.equal(
    await page.evaluate(() =>
      window.__idlever.mutate(() => window.__idlever.engine.buyKit("unknown-slot")),
    ),
    false,
  );
  await page.waitForTimeout(60);
  assert.equal(await page.evaluate(() => window.__idlever.engine.save()), refusalSave);
  assert.deepEqual(await particles(), []);
  checks += 3;

  await load();
  await clear();
  const settlement = await page.evaluate(async () => {
    const a = window.__idlever,
      before = a.lineage.gold;
    // Automatic sending is paused in this earned offer save; send the real run first.
    let snapshot = await a.engine.send();
    let steps = 0;
    while (snapshot.loot <= 0 && steps < 500) {
      const step = await a.engine.step(1);
      snapshot = step.snapshot;
      steps++;
      if (step.run_over) throw Error("fixture exited before finding carried Gold");
    }
    if (snapshot.loot <= 0) throw Error("no actual carried Gold after 500 actions");
    await a.engine.bail(); // Real voluntary Return; no currency or outcome grants.
    const report = await a.engine.runOfflineQuick(8 * 3600);
    await a.refresh(true);
    return {
      before,
      after: a.lineage.gold,
      runs: report.runs,
      ledger: a.lineage.gold_ledger,
      steps,
      carried: snapshot.loot,
    };
  });
  result.settlement = settlement;
  assert.ok(settlement.runs > 0);
  assert.ok(settlement.after > settlement.before);
  await painted();
  await page.waitForTimeout(60);
  const credits = await particles();
  assert.ok(credits.length > 0 && credits.length <= 48);
  const distinct = [...new Map(credits.map((p) => [JSON.stringify([p.delta, p.why]), p])).values()];
  assert.equal(
    distinct.reduce((sum, p) => sum + p.delta, 0),
    settlement.after - settlement.before,
  );
  const settledSave = await page.evaluate(() => window.__idlever.engine.save());
  await clear();
  await page.evaluate(() => window.__idlever.refresh(true));
  await page.waitForTimeout(60);
  assert.deepEqual(await particles(), []);
  assert.equal(await page.evaluate(() => window.__idlever.engine.save()), settledSave);
  checks += 6;
  result.settlement = { ...settlement, particles: credits };

  await load();
  await clear();
  const reset = await page.evaluate(async () => {
    const a = window.__idlever,
      slot = a.lineage.kit.find((k) => k.next?.affordable).slot;
    a.lineage = await a.engine.buyKit(slot);
    const save = await a.engine.save();
    const painted = a.afterLineage();
    a.resetGoldFeedback(); // Same reset used by import; cancel the already queued paint.
    await painted;
    return { save, after: await a.engine.save() };
  });
  await page.waitForTimeout(60);
  assert.equal(reset.after, reset.save);
  assert.deepEqual(await particles(), []);
  checks += 2;

  result.packages = await Promise.all(packets);
  assert.ok(result.packages.length);
  for (const pkg of result.packages)
    assert.deepEqual(pkg, { bytes: binary.length, sha256: hash(binary) });
  assert.deepEqual(result.errors, []);
  checks += 2;
  result.checks = checks;
  result.result = "PASS";
  if (out) writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      checks,
      layouts: result.layouts.length,
      packages: result.packages,
      result: result.result,
    }),
  );
} catch (error) {
  result.failure = String(error);
  if (out) writeFileSync(`${out}/failure.json`, JSON.stringify(result, null, 2));
  throw error;
} finally {
  await browser.close();
}
