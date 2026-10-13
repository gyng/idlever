// Real WASM state, with controlled town fixtures for complete presentation coverage.
// These fixtures prove interaction; they are not earned progression evidence.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { launchBrowser } from "../../tools/browser.mjs";
const url = execFileSync("bash", ["tools/dev.sh"], {
  cwd: new URL("../../", import.meta.url),
  encoding: "utf8",
}).trim();
const shots = process.env.IDLEVER_HOME_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
const browser = await launchBrowser({ gpu: process.env.IDLEVER_HOME_GPU === "1" });
try {
  for (const width of [400, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${url}?fresh=1&seed=192&runs=0`);
    await page.waitForFunction(() => window.__idlever?.booted);
    assert.equal(await page.evaluate(() => window.__idlever.kind), "wasm");
    await page.evaluate(() => {
      const a = window.__idlever;
      a.runnerOn = false;
      const build = a.engine.buildTown;
      window.homeBuildCalls = 0;
      a.engine.buildTown = (...args) => {
        window.homeBuildCalls++;
        return build(...args);
      };
    });
    const saved = await page.evaluate(() => window.__idlever.engine.save());
    const ready = page.locator('[data-building-info="staked"]');
    await ready.click();
    await page.locator("#kw-tip:not([hidden])").waitFor();
    assert.match(await page.locator("#kw-tip").textContent(), /House.*Ready to build.*Free/s);
    assert.equal(await page.evaluate(() => window.homeBuildCalls), 0);
    assert.equal(await page.evaluate(() => window.__idlever.engine.save()), saved);
    const tipBox = await page.locator("#kw-tip").boundingBox();
    assert.ok(tipBox.x >= 0 && tipBox.x + tipBox.width <= width);
    if (shots) await page.screenshot({ path: `${shots}/${width}-ready-house.png` });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#kw-tip").isVisible(), false);
    await ready.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#kw-tip").isVisible(), true);
    assert.equal(await page.evaluate(() => window.homeBuildCalls), 0);
    await page.keyboard.press("Escape");
    await page.locator(".town-tag").click();
    await page.waitForFunction(() => window.__idlever.lineage.town.home);
    assert.equal(await page.evaluate(() => window.homeBuildCalls), 1);
    const locked = page.locator('[data-building-info="staked"]');
    await locked.click();
    assert.match(await page.locator("#kw-tip").textContent(), /Forge.*Locked.*Requires:/s);
    assert.equal(await page.evaluate(() => window.homeBuildCalls), 1);
    await page.keyboard.press("Escape");
    // Install all supported buildings through the real worker load boundary.
    await page.evaluate(async () => {
      const a = window.__idlever,
        save = JSON.parse(await a.engine.save());
      save.lineage.town.built = ["blacksmith", "kennel", "bank"].map((id) => [id, 0]);
      a.lineage = await a.engine.load(JSON.stringify(save));
      a.go({ kind: "camp" });
    });
    await page.waitForSelector('[data-building-info="bank"]');
    assert.equal(await page.locator('[data-building-info="storehouse"]').count(), 0);
    assert.equal(await page.locator('.town-hit[data-building="storehouse"]').count(), 0);
    assert.equal(await page.locator('[data-panel="vault"]').count(), 0);
    assert.equal(await page.locator(".vault-sell").count(), 0);
    const retired = await page.evaluate(async () => {
      const a = window.__idlever;
      return {
        workers: a.lineage.tree.nodes
          .filter((n) => n.id === "keeper" || n.id === "armourer")
          .map((n) => n.id),
        storage: (await a.engine.unlocks()).filter((u) => /^vault\d+$/.test(u.id)).map((u) => u.id),
      };
    });
    assert.deepEqual(retired, { workers: [], storage: [] });
    for (const [id, name] of [
      ["tent", "House"],
      ["blacksmith", "Forge"],
      ["kennel", "Kennel"],
      ["bank", "Bank"],
    ]) {
      const info = page.locator(`[data-building-info="${id}"]`);
      await info.click();
      assert.match(await page.locator("#kw-tip").textContent(), new RegExp(`${name}.*Built`, "s"));
      assert.equal(await page.evaluate(() => window.homeBuildCalls), 1);
      const box = await info.boundingBox();
      assert.ok(box.height >= 44 && box.x >= 0 && box.x + box.width <= width);
      await page.keyboard.press("Escape");
      await page.locator(`.town-hit[data-building="${id}"]`).hover();
      await page.locator("#kw-tip:not([hidden])").waitFor();
      assert.match(await page.locator("#kw-tip").textContent(), new RegExp(name));
      await page.keyboard.press("Escape");
    }
    if (shots) {
      await page.locator('[data-building-info="blacksmith"]').click();
      await page.screenshot({ path: `${shots}/${width}-forge-info.png` });
    }
    await page.keyboard.press("Escape");
    await page.locator('.town-hit[data-building="tent"]').click();
    assert.equal(await page.locator(".sheet-wrap:not([hidden]) .hero-window-face").count(), 1);
    // Current earned core snapshots prove reachable menus without granting money or workers.
    const earnedPath = process.env.IDLEVER_RETIREMENT_SAVE;
    if (earnedPath) {
      const raw = readFileSync(earnedPath, "utf8");
      await page.evaluate(async (raw) => {
        const a = window.__idlever;
        a.lineage = await a.engine.load(raw);
        a.go({ kind: "camp" });
      }, raw);
      assert.equal(await page.locator('[data-building-info="storehouse"]').count(), 0);
      assert.equal(await page.locator('[data-panel="vault"]').count(), 0);
      await page.evaluate(async () => {
        const a = window.__idlever;
        const { openWorks, TRUNK } = await import("/src/ui/works.ts");
        if (TRUNK.includes("armourer")) throw Error("retired trunk worker");
        if (a.lineage.tree.nodes.some((n) => ["keeper", "armourer"].includes(n.id)))
          throw Error("retired worker offer");
        openWorks(a);
      });
      await page.locator(".works-trunk").waitFor();
      assert.equal(
        await page.locator('.wnode[data-node="keeper"], .wnode[data-node="armourer"]').count(),
        0,
      );
      assert.ok((await page.locator(".wnode").count()) > 0);
      await page.keyboard.press("Escape");
      const orders = page.locator(".orders-tab");
      if (await orders.isVisible()) {
        await orders.click();
        await page.locator(".orders-sheet").waitFor();
        assert.doesNotMatch(
          await page.locator(".orders-sheet").textContent(),
          /keep for heirs|insure kit/i,
        );
        assert.ok((await page.locator(".orders-sheet .order-row").count()) > 0);
        await page.keyboard.press("Escape");
      } else {
        assert.doesNotMatch(
          await page.locator(".camp").textContent(),
          /keep for heirs|insure kit/i,
        );
      }
      await page.locator(".sheet-wrap").waitFor({ state: "detached" });
      await page.locator('.town-hit[data-building="tent"]').scrollIntoViewIfNeeded();
      const hitProof = await page.evaluate(() => {
        const hero = document.querySelector('.town-hit[data-building="tent"]');
        const tag = document.querySelector('.town-tag[role="button"]');
        const centreHits = (el) => {
          const r = el.getBoundingClientRect();
          const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
          return {
            ok: el === hit || el.contains(hit),
            hit: hit?.outerHTML.slice(0, 200),
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          };
        };
        return { hero: centreHits(hero), ready: !tag || tag.hidden || centreHits(tag) };
      });
      assert.equal(hitProof.hero.ok, true, JSON.stringify(hitProof));
      assert.equal(hitProof.ready.ok ?? hitProof.ready, true, JSON.stringify(hitProof));
      await page.locator('.town-hit[data-building="tent"]').click();
      assert.deepEqual(await page.locator("[role=tab]").allTextContents(), [
        "Loadouts",
        "Class",
        "Legacy",
      ]);
    }
    assert.deepEqual(errors, []);
    console.log(
      `${width}: real WASM ready/locked/built four-building help, no accidental build, viewport, hover and hero details PASS`,
    );
    await page.close();
  }
} finally {
  await browser.close();
}
