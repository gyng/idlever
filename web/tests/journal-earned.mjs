// Actual archived earned seed1/13 saves; no grants or fabricated Journal wire.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { launchBrowser } from "../../tools/browser.mjs";
const url =
  process.env.IDLEVER_TEST_URL ??
  execFileSync("bash", ["tools/dev.sh"], { encoding: "utf8" }).trim();
const evidence = process.env.IDLEVER_JOURNAL_EARNED_SHOTS;
if (evidence) mkdirSync(evidence, { recursive: true });
const input = (seed, stage) =>
  gunzipSync(
    readFileSync(
      new URL(
        `../../docs/evidence/cut208/earned-final/seed-${seed}-${stage}.game.json.gz`,
        import.meta.url,
      ),
    ),
  ).toString();
const browser = await launchBrowser();
const results = [];
let checks = 0;
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${url}?fresh=1&seed=1&runs=0`);
  await page.waitForFunction(() => window.__idlever?.booted);
  await page.evaluate(() => {
    window.__idlever.runnerOn = false;
    if (window.__idlever.kind !== "wasm") throw Error("real WASM required");
  });
  const load = async (seed, stage) => {
    await page.evaluate(
      async (raw) => {
        const a = window.__idlever;
        a.go({ kind: "camp" });
        await a.engine.load(raw);
        await a.refresh();
        a.go({ kind: "camp" });
        window.__journalRoutes = [];
      },
      input(seed, stage),
    );
    // Real close-animation clones are inert; wait for their actual disposal.
    await page.waitForFunction(() => !document.querySelector(".sheet-ghost"));
  };
  const settled = async () =>
    page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
      const wrap = document.querySelector(".journal-panel")?.closest(".sheet-wrap");
      if (wrap)
        await Promise.all(
          wrap
            .getAnimations({ subtree: true })
            .filter((a) => Number.isFinite(a.effect.getComputedTiming().endTime))
            .map((a) => a.finished.catch(() => {})),
        );
    });
  const open = async () => {
    const before = await page.evaluate(async () => {
      const a = window.__idlever;
      const saved = await a.engine.save();
      (await import("/src/ui/journal-window.ts")).openJournal(a, (target) => {
        window.__journalRoutes.push({
          target,
          owner: a.lineage.journal.bloodline_id,
          seed: a.lineage.journal.seed,
        });
        return true;
      });
      return saved;
    });
    await page.locator(".journal-panel").waitFor();
    await settled();
    assert.equal(
      await page.evaluate(() => window.__idlever.engine.save()),
      before,
      "opening/reading Journal leaves exact save unchanged",
    );
    checks++;
    await page.evaluate(() => {
      for (const chapter of document.querySelectorAll(".journal-panel details"))
        chapter.open = true;
    });
  };
  const state = () => page.evaluate(() => window.__idlever.lineage);
  for (const seed of [1, 13]) {
    await load(seed, "manual2");
    await open();
    let l = await state();
    const scout = l.journal.chapters.flatMap((c) => c.entries).find((e) => e.id === "scout");
    assert.equal(scout.progress.current, 2);
    assert.equal(scout.progress.required, 3);
    assert.equal(scout.action.enabled, false);
    assert.ok(scout.requirements.some((r) => /3 manual delves/.test(r)));
    assert.equal(await page.locator('[data-journal-focus="action:scout"]').isDisabled(), true);
    checks += 5;
    await load(seed, "manual3");
    await open();
    l = await state();
    assert.equal(l.journal.recommended, "porter");
    const beforePorter = l.gold;
    await page.locator('[data-journal-focus="action:porter"]').click();
    await page.waitForFunction(() => window.__idlever.lineage.journal.recommended === "scout");
    l = await state();
    assert.equal(l.gold, beforePorter);
    const price = l.tree.nodes.find((n) => n.id === "scout").price;
    assert.ok(price > 0);
    assert.ok(l.gold >= price);
    await page.locator('[data-journal-focus="action:scout"]').click();
    await page.waitForFunction(
      () =>
        window.__idlever.lineage.journal.chapters
          .flatMap((c) => c.entries)
          .find((e) => e.id === "scout").state === "complete",
    );
    l = await state();
    assert.equal(l.gold, beforePorter - price);
    assert.equal(
      await page.locator('[data-journal-focus="action:porter"]').count(),
      0,
      "completed hire cannot be repeated",
    );
    assert.equal(
      await page.locator('[data-journal-focus="action:scout"]').textContent(),
      "Workers",
      "earned Scout remains accessible as a system route",
    );
    checks += 7;
    results.push({ seed, worker: { beforePorter, scoutPrice: price, afterScout: l.gold } });

    await load(seed, "3x8h");
    await open();
    l = await state();
    assert.equal(l.journal.quest.done, false);
    assert.equal(l.journal.quest.reward, "row");
    assert.match(await page.locator(".quest-card").textContent(), /rule slot|policy row/i);
    assert.equal(await page.getByRole("button", { name: /^Claim$/i }).count(), 0);
    const preSwapGold = l.gold;
    await page.locator('[data-journal-focus="quest:swap"]').click();
    await page.waitForFunction(() => !window.__idlever.lineage.journal.quest.swap);
    l = await state();
    assert.equal(await page.locator(".quest-goal").textContent(), l.journal.quest.goal);
    assert.equal(l.gold, preSwapGold);
    const refused = await page.evaluate(async () => {
      const a = window.__idlever,
        before = await a.engine.save();
      let reason = "";
      try {
        await a.engine.swapQuest();
      } catch (error) {
        reason = String(error);
      }
      return { refused: !!reason, unchanged: before === (await a.engine.save()) };
    });
    assert.deepEqual(refused, { refused: true, unchanged: true });
    checks += 7;

    // Restore the original earned active quest, then let real runs settle its reward.
    await load(seed, "3x8h");
    await open();
    const completion = await page.evaluate(async () => {
      const a = window.__idlever,
        before = await a.engine.lineage();
      const missingRow = ["row5", "row6", "row7", "row8", "row9", "row10"].find(
        (id) => !before.unlocks.includes(id),
      );
      await a.engine.runOfflineQuick(8 * 3600);
      await a.refresh();
      return {
        done: a.lineage.journal.quest.done,
        countBefore: before.town.quests_done,
        countAfter: a.lineage.town.quests_done,
        missingRow,
        rewardOwned: a.lineage.unlocks.includes(missingRow),
        body: a.lineage.journal.quest.body,
      };
    });
    assert.equal(completion.done, true);
    assert.equal(completion.countAfter, completion.countBefore + 1);
    assert.equal(completion.rewardOwned, true);
    assert.match(completion.body, /applied automatically/);
    await page.waitForFunction(() =>
      document.querySelector(".quest-card")?.classList.contains("done"),
    );
    assert.equal(await page.locator('[data-journal-focus="quest:swap"]').count(), 0);
    const afterReward = await page.evaluate(() => window.__idlever.engine.save());
    await page.evaluate(async () => {
      for (let i = 0; i < 3; i++) await window.__idlever.refresh();
    });
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), afterReward);
    checks += 6;
    results.push({ seed, completion });
    console.log(JSON.stringify({ checkpoint: "earned-workers-and-quest", seed, completion }));
  }

  // Geometry and actual gate truth: real earned active/done/late states, no wire fabrication.
  for (const width of [320, 400, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const stage of ["manual3", "3x8h", "4x8h", "6x8h"]) {
      await load(13, stage);
      await open();
      const l = await state();
      for (const id of ["tactics", "reorder", "class", "loadout"]) {
        const item = l.journal.chapters.flatMap((c) => c.entries).find((e) => e.id === id);
        const button = page.locator(`[data-journal-focus="action:${id}"]`);
        assert.equal(
          await button.count(),
          1,
          `${stage}/${id} renders actual route including completed systems`,
        );
        assert.equal(
          await button.isDisabled(),
          !item.action.enabled,
          `${stage}/${id} truthful gate`,
        );
        checks += 2;
      }
      for (const scale of [1, 2]) {
        await page.evaluate((scale) => {
          document.documentElement.style.fontSize = `${16 * scale}px`;
        }, scale);
        await settled();
        const geometry = await page.evaluate(() => {
          const panel = document.querySelector(".journal-panel");
          const sheet = panel.closest(".game-window");
          const controls = [...panel.querySelectorAll("button,summary")]
            .filter((n) => n.getClientRects().length)
            .map((n) => {
              const r = n.getBoundingClientRect();
              return {
                label: n.textContent,
                width: r.width,
                height: r.height,
                left: r.left,
                right: r.right,
              };
            });
          return {
            documentOverflow: document.documentElement.scrollWidth - innerWidth,
            innerOverflow: sheet.scrollWidth - sheet.clientWidth,
            panelOverflow: panel.scrollWidth - panel.clientWidth,
            recommended: panel.querySelectorAll('[data-recommended="true"]').length,
            controls,
            claims: [...panel.querySelectorAll("button")].some((n) => /claim/i.test(n.textContent)),
          };
        });
        assert.ok(geometry.documentOverflow <= 1);
        assert.ok(geometry.innerOverflow <= 1);
        assert.ok(geometry.panelOverflow <= 1);
        assert.equal(geometry.recommended, 1);
        assert.equal(geometry.claims, false);
        assert.ok(
          geometry.controls.every(
            (r) => r.width >= 44 && r.height >= 44 && r.left >= -1 && r.right <= width + 1,
          ),
          JSON.stringify({ width, stage, scale, geometry }),
        );
        checks += 6;
        results.push({ width, stage, scale, geometry });
        if (evidence && width === 400 && stage === "3x8h" && scale === 1) {
          await page.screenshot({ path: `${evidence}/earned-journal-active-400.png` });
        }
      }
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "16px";
      });
    }
  }

  console.log(JSON.stringify({ checkpoint: "earned-geometry-gates", checks }));
  await page.setViewportSize({ width: 400, height: 900 });
  await load(13, "6x8h");
  await open();
  // Completed systems still route; the callback observes the current real selected owner.
  for (const id of ["tactics", "reorder", "scout", "loadout"])
    await page.locator(`[data-journal-focus="action:${id}"]`).click();
  assert.deepEqual(await page.evaluate(() => window.__journalRoutes.map((r) => r.target)), [
    "tactics",
    "orders",
    "workers",
    "loadouts",
  ]);
  checks++;
  const reading = await page.evaluate(async () => {
    const a = window.__idlever,
      panel = document.querySelector(".journal-panel"),
      root = panel.closest(".game-window");
    const summary = panel.querySelector('[data-journal-focus="chapter:town"]');
    summary.focus();
    root.scrollTop = 120;
    const before = root.scrollTop;
    await a.engine.setWorker("scout", false);
    await a.refresh();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      before,
      after: root.scrollTop,
      focus: document.activeElement.dataset.journalFocus,
      townOpen: document.querySelector('details[data-chapter="town"]').open,
    };
  });
  assert.ok(reading.before > 0);
  assert.equal(reading.after, reading.before);
  assert.equal(reading.focus, "chapter:town");
  assert.equal(reading.townOpen, true);
  checks += 4;

  // Add a second resident with earned Gold, then refuse the previous resident's detached action.
  const ownership = await page.evaluate(async () => {
    const a = window.__idlever,
      original = a.lineage.journal.bloodline_id,
      gold = a.lineage.gold,
      price = a.lineage.bloodline_price;
    await a.engine.addBloodline();
    await a.refresh();
    const second = a.lineage.hero_slots.find((slot) => slot.id !== original).id;
    const old = document.querySelector('[data-journal-focus="action:loadout"]');
    await a.engine.selectBloodline(second);
    await a.refresh();
    const before = await a.engine.save(),
      calls = window.__journalRoutes.length;
    old.click();
    await new Promise((r) => setTimeout(r, 30));
    const staleRefused =
      calls === window.__journalRoutes.length && before === (await a.engine.save());
    return {
      original,
      second,
      price,
      goldBefore: gold,
      goldAfterFirst: (await a.engine.selectBloodline(original)).gold,
      staleRefused,
    };
  });
  assert.equal(ownership.goldAfterFirst, ownership.goldBefore - ownership.price);
  assert.equal(ownership.staleRefused, true);
  checks += 2;
  await page.evaluate(async (second) => {
    const a = window.__idlever;
    await a.engine.selectBloodline(second);
    await a.refresh();
  }, ownership.second);
  await page.locator('[data-journal-focus="chapter:builds"]').click();
  await page.locator('[data-journal-focus="action:loadout"]').click();
  assert.equal(await page.evaluate(() => window.__journalRoutes.at(-1).owner), ownership.second);
  checks++;
  results.push({ reading, ownership });

  // Actual away boundary: start a real run, show Watch, and reject changing its active specialization.
  await load(1, "house");
  const away = await page.evaluate(async () => {
    const a = window.__idlever;
    await a.engine.send();
    await a.engine.step(1);
    await a.refresh();
    const before = await a.engine.save();
    let reason = "";
    try {
      await a.engine.setSpecialization("none");
    } catch (error) {
      reason = String(error);
    }
    return {
      recommended: a.lineage.journal.recommended,
      action: a.lineage.journal.chapters.flatMap((c) => c.entries).find((e) => e.id === "delve")
        .action,
      reason,
      unchanged: before === (await a.engine.save()),
    };
  });
  assert.equal(away.recommended, "delve");
  assert.equal(away.action.target, "watch");
  assert.match(away.reason, /away|delving|run/i);
  assert.equal(away.unchanged, true);
  checks += 4;
  await open();
  await page.locator('[data-journal-focus="action:delve"]').click();
  assert.equal(await page.evaluate(() => window.__journalRoutes.at(-1).target), "watch");
  checks++;
  results.push({ away });
  assert.deepEqual(errors, []);
  checks++;
  if (evidence) {
    const wasm = readFileSync("web/src/engine/pkg/idlever_wasm_bg.wasm");
    writeFileSync(
      `${evidence}/earned-client-results.json`,
      JSON.stringify(
        {
          checks,
          fixture:
            "actual archived earned seeds1/13; actual paid actions/save boundaries, no grants",
          wasmBytes: wasm.length,
          wasmSha256: createHash("sha256").update(wasm).digest("hex"),
          results,
        },
        null,
        2,
      ) + "\n",
    );
  }
  console.log(
    `journal-earned: ${checks} checks passed, earned seed1/13 and actual boundary actions; no grants`,
  );
} finally {
  await browser.close();
}
